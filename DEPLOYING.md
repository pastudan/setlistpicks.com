# Deploying to Fly.io

The app is live at **https://setlistpicks.com** (also https://outsidelands-picks.fly.dev).
Every push to `outside-lands-2026` deploys automatically via GitHub Actions.

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

Accept the existing `fly.toml`. The app name (`outsidelands-picks`) and org (`bottlerock`)
are already set — update `fly.toml` if you're deploying to a different account.

### 3. Create the persistent volume

SQLite lives on a Fly volume that survives deploys and machine restarts. Create it once:

```bash
fly volumes create outsidelands_data --size 1 --region sjc --yes
```

- `--size 1` = 1 GB (each group is < 10 KB; this handles tens of thousands of groups)
- `--region sjc` = San Jose; match your `primary_region` in `fly.toml`
- The volume name **must** match `source = "outsidelands_data"` in `fly.toml`

> ⚠️ A Fly volume is pinned to one machine in one region. This app runs a
> **single instance** (`min_machines_running = 0`). For multi-region HA,
> see [Litestream](https://litestream.io/) or [Turso](https://turso.tech/).

### 4. Add the GitHub Actions deploy secret

```bash
fly tokens create deploy --app outsidelands-picks -x 999999h
```

Copy the token, then in GitHub → repo → **Settings → Secrets and variables →
Actions → New repository secret**:

| Secret | Value |
|---|---|
| `FLY_API_TOKEN` | token from above |

Every push to `outside-lands-2026` now triggers `.github/workflows/deploy.yml`.

### 5. Custom domain (optional)

```bash
fly certs add yourdomain.com --app outsidelands-picks
fly certs add www.yourdomain.com --app outsidelands-picks
```

Add DNS records in your registrar (gray cloud / DNS-only if using Cloudflare):

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `66.241.125.84` |
| `AAAA` | `@` | `2a09:8280:1::114:1aa1:0` |
| `A` | `www` | `66.241.125.84` |
| `AAAA` | `www` | `2a09:8280:1::114:1aa1:0` |

Check validation progress: `fly certs check yourdomain.com --app outsidelands-picks`

---

## Subsequent deploys

```bash
git push origin outside-lands-2026   # CI deploys automatically
# or manually:
fly deploy
```

## Rollback

```bash
fly releases list
fly deploy --image registry.fly.io/outsidelands-picks:<version>
```

## Backups

Fly automatically takes **daily snapshots** of all volumes and retains them for 5 days.
A GitHub Actions cron (`.github/workflows/snapshot.yml`) additionally creates **hourly snapshots**
using `fly volumes snapshots create`.

### One-time setup for hourly snapshots

1. Get the volume ID:
   ```bash
   fly volumes list --app outsidelands-picks
   ```
2. In GitHub → repo → **Settings → Variables → Actions**, add:
   - `FLY_VOLUME_ID` = `vol_xxxxxxxx` (the ID from step 1)

The `FLY_API_TOKEN` secret is already present from the deploy workflow. Once the variable is set,
the hourly snapshot workflow runs automatically.

### Restore from a snapshot

```bash
# List available snapshots (daily + hourly)
fly volumes snapshots list <volume-id> --app outsidelands-picks

# Create a new volume restored from a specific snapshot
fly volumes create outsidelands_data_restored \
  --snapshot-id <snap_id> --size 1 --region sjc --app outsidelands-picks

# Swap it in: edit fly.toml → change source to 'outsidelands_data_restored', then deploy
fly deploy
```

---

## Monitoring

```bash
fly logs --app outsidelands-picks        # live log tail
fly status --app outsidelands-picks      # machine + volume health
fly ssh console --app outsidelands-picks # shell into running machine
sqlite3 /data/outsidelands.db ".tables"  # inspect DB (inside console)
```

## Environment variables

Configured in `fly.toml`. Override secrets with `fly secrets set KEY=value`.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP + WebSocket listen port |
| `NODE_ENV` | `production` | Disables Vite dev mode |
| `DB_PATH` | `/data/outsidelands.db` | SQLite file on the persistent volume |
| `ADMIN_SECRET` | _(set via fly secrets)_ | Secret URL segment for `/admin/<secret>` |
| `IPINFO_TOKEN` | _(optional)_ | ipinfo.io token for higher rate limits |

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
                         └─ /data/outsidelands.db  ←── persistent volume
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

## Set times note

Outside Lands 2026 set times in `shared/schedule.js` are **estimated** based on the
announced daily lineups. Update them once official times are published in the Outside Lands app
(typically a week or two before the festival).
