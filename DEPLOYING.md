# Deploying to Fly.io

## First-time setup

### 1. Install flyctl

```bash
brew install flyctl        # macOS
# or: curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Create the app

```bash
fly launch --no-deploy
```

Accept the existing `fly.toml` when prompted. The app name is `bottlerock-setlist-preferences` — change it in `fly.toml` if you want a different hostname.

### 3. Create the persistent volume

The SQLite database lives on a Fly volume that persists across deploys and machine restarts. Create it once:

```bash
fly volumes create bottlerock_data --size 1 --region sjc
```

- `--size 1` = 1 GB (plenty — each group is < 10 KB)
- `--region sjc` = San Jose; change to your preferred region
- The volume name **must** match `source = "bottlerock_data"` in `fly.toml`

> ⚠️ A Fly volume is pinned to one machine in one region. This app intentionally runs a **single instance** (`min_machines_running = 0`). If you need multi-region or HA, look at [Litestream](https://litestream.io/) for replication.

### 4. Deploy

```bash
fly deploy
```

Fly builds the Docker image remotely (`--remote-only` in CI), runs the two-stage build (Vite frontend + native `better-sqlite3`), and swaps the machine.

### 5. Set up GitHub Actions (automatic deploys)

Add your Fly API token as a GitHub secret:

```bash
fly tokens create deploy -x 999999h   # long-lived deploy token
```

Copy the output, then in GitHub → repo → **Settings → Secrets and variables → Actions**, add:

| Secret name | Value |
|---|---|
| `FLY_API_TOKEN` | the token from above |

Every push to `main` will now trigger `.github/workflows/deploy.yml` which runs `flyctl deploy --remote-only`.

---

## Subsequent deploys

```bash
git push origin main   # CI picks it up automatically
# or manually:
fly deploy
```

## Rollback

```bash
fly releases list                  # find the release number
fly deploy --image <image-ref>     # redeploy a previous image
```

## Monitoring

```bash
fly logs              # live log tail
fly status            # machine health
fly ssh console       # shell into the running machine
```

## Architecture

```
GitHub push → Actions → flyctl deploy --remote-only
                           │
                           ▼
                    Fly remote builder
                    (Docker multi-stage)
                    ├─ build: node:20-alpine
                    │   ├─ apk build-base python3  (for better-sqlite3)
                    │   ├─ npm install
                    │   ├─ npm run build  (Vite → dist/)
                    │   └─ npm prune --omit=dev
                    └─ runtime: node:20-alpine
                        ├─ node_modules (prod only)
                        ├─ server/
                        ├─ shared/
                        └─ dist/
                           │
                           ▼
                    Fly machine (256 MB shared CPU)
                    ├─ Express + WebSocket server (:8080)
                    ├─ better-sqlite3 (WAL mode)
                    └─ /data/bottlerock.db  ←── persistent volume
```

## Environment variables

Set automatically by `fly.toml`. Override with `fly secrets set KEY=value`.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP + WS listen port |
| `NODE_ENV` | `production` | Disables Vite dev mode |
| `DB_PATH` | `/data/bottlerock.db` | SQLite file location |

## Scaling

The app runs a **single machine** that scales to zero when idle and wakes on first request (cold start ~2s). The SQLite volume is bound to that one machine.

If you ever need horizontal scaling, migrate the DB layer to [Turso](https://turso.tech/) (distributed SQLite) and replace the in-process WebSocket rooms with a Redis pub/sub or Turso's real-time subscriptions.
