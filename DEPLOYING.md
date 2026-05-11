# Deploying to Fly.io

The app is live at **https://setlistpicks.com** (also https://bottlerock-picks.fly.dev).
Every push to `main` deploys automatically via GitHub Actions.

## First-time setup (for a new fork/clone)

### 1. Install flyctl

```bash
brew install flyctl   # macOS
fly auth login
```

### 2. Create the app

```bash
fly launch --no-deploy --org <your-org>
```

Accept the existing `fly.toml`. The app name (`bottlerock-picks`) and org (`bottlerock`)
are already set — update `fly.toml` if you're deploying to a different account.

### 3. Create the persistent volume

SQLite lives on a Fly volume that survives deploys and machine restarts. Create it once:

```bash
fly volumes create bottlerock_data --size 1 --region sjc --yes
```

- `--size 1` = 1 GB (each group is < 10 KB; this handles tens of thousands of groups)
- `--region sjc` = San Jose; match your `primary_region` in `fly.toml`
- The volume name **must** match `source = "bottlerock_data"` in `fly.toml`

> ⚠️ A Fly volume is pinned to one machine in one region. This app runs a
> **single instance** (`min_machines_running = 0`). For multi-region HA,
> see [Litestream](https://litestream.io/) or [Turso](https://turso.tech/).

### 4. Add the GitHub Actions deploy secret

```bash
fly tokens create deploy --app bottlerock-picks -x 999999h
```

Copy the token, then in GitHub → repo → **Settings → Secrets and variables →
Actions → New repository secret**:

| Secret | Value |
|---|---|
| `FLY_API_TOKEN` | token from above |

Every push to `main` now triggers `.github/workflows/deploy.yml`.

### 5. Custom domain (optional)

```bash
fly certs add yourdomain.com --app bottlerock-picks
fly certs add www.yourdomain.com --app bottlerock-picks
```

Add DNS records in your registrar (gray cloud / DNS-only if using Cloudflare):

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `66.241.125.84` |
| `AAAA` | `@` | `2a09:8280:1::114:1aa1:0` |
| `A` | `www` | `66.241.125.84` |
| `AAAA` | `www` | `2a09:8280:1::114:1aa1:0` |

Check validation progress: `fly certs check yourdomain.com --app bottlerock-picks`

---

## Subsequent deploys

```bash
git push origin main   # CI deploys automatically
# or manually:
fly deploy
```

## Rollback

```bash
fly releases list
fly deploy --image registry.fly.io/bottlerock-picks:<version>
```

## Monitoring

```bash
fly logs --app bottlerock-picks        # live log tail
fly status --app bottlerock-picks      # machine + volume health
fly ssh console --app bottlerock-picks # shell into running machine
sqlite3 /data/bottlerock.db ".tables"  # inspect DB (inside console)
```

## Environment variables

Configured in `fly.toml`. Override secrets with `fly secrets set KEY=value`.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP + WebSocket listen port |
| `NODE_ENV` | `production` | Disables Vite dev mode |
| `DB_PATH` | `/data/bottlerock.db` | SQLite file on the persistent volume |

## Architecture

```
git push → GitHub Actions → flyctl deploy --remote-only
                                │
                                ▼
                         Fly remote builder (Docker multi-stage)
                         ├─ build: node:20-alpine
                         │   ├─ apk build-base python3   (better-sqlite3 native)
                         │   ├─ npm install
                         │   ├─ vite build  (→ dist/)
                         │   └─ npm prune --omit=dev
                         └─ runtime: node:20-alpine
                             ├─ node_modules (prod only)
                             ├─ server/
                             ├─ shared/
                             └─ dist/
                                │
                                ▼
                         Fly machine (256 MB shared CPU, sjc)
                         ├─ Express HTTP + WebSocket server (:8080)
                         ├─ better-sqlite3 (WAL mode, in-process)
                         └─ /data/bottlerock.db  ←── persistent volume
```

## Scaling notes

The single-instance + SQLite setup handles hundreds of concurrent users easily
(WAL mode allows many parallel readers; writes serialize in microseconds).

If traffic grows significantly:
1. `min_machines_running = 1` in `fly.toml` eliminates cold starts (~$5/mo)
2. Cloudflare orange cloud with "Full (strict)" SSL caches static assets globally
3. Upgrade VM: `memory_mb = 512` in `fly.toml`
4. True horizontal scale: migrate to [Turso](https://turso.tech/) (distributed SQLite)
   and replace in-process WS rooms with a pub/sub layer
