# BottleRock Setlist Picks

Tiny web app for coordinating which acts a group of friends wants to see at
**BottleRock Napa Valley 2026** (May 22–24). One invite link per group,
everyone rates artists Skip / 👍 Want / 🔥 Must See, and you see exactly where
the crew is leaning at every conflicting time slot.

- **Stack**: Vite + vanilla JS frontend, Express + ioredis backend.
- **Storage**: Redis only. Groups live for ~90 days from last activity (the
  TTL refreshes on every read/write), and Redis is configured for
  `allkeys-lru` eviction in `fly.toml` so cold groups get evicted under
  memory pressure.
- **No accounts**: identity is just a name. The browser remembers which
  member it is per group via `localStorage`. Names are deduped
  case-insensitively (`Dan` and `dan` are the same person).
- **Schedule**: hardcoded in `shared/schedule.js`, sourced from the
  [official site](https://www.bottlerocknapavalley.com/schedule/) /
  [riffmagazine](https://riffmagazine.com/festivals/bottlerock-napa-2026-stage-times/).

## Local development

```bash
npm install
# Option A: run a local Redis (docker run -p 6379:6379 redis:7-alpine)
npm run dev
# Option B: skip Redis entirely with the in-memory fallback
REDIS_URL=memory:// npm run dev
```

That starts:

- Vite dev server on http://localhost:5173 (proxies `/api/*` to :8080)
- Express + Redis API on http://localhost:8080

Open http://localhost:5173 and create a group.

## Production build

```bash
npm run build  # writes dist/
npm start      # Express serves dist/ + /api on $PORT (default 8080)
```

## Deploying to Fly.io

```bash
fly launch --no-deploy        # accept the existing fly.toml
fly redis create              # creates an Upstash Redis on Fly; copy the URL
fly secrets set REDIS_URL=redis://default:...@fly-...upstash.io:6379
fly deploy
```

In the Fly/Upstash Redis dashboard, set the eviction policy to
**`allkeys-lru`**. Combined with the 90-day TTLs we set on every key, this
gives you: active groups stay forever, idle groups expire after 3 months,
and if memory ever fills up, the least-recently-used groups get evicted
first.

### Capacity sketch

A group with 8 members and votes on every set (~75 artists) is well under
10 KB in Redis. Even the smallest Upstash plan handles tens of thousands of
groups.

## Project layout

```
client/            Vite frontend (vanilla JS, single SPA)
  src/views/       landing / join / group screens
server/            Express API + static dist server
shared/schedule.js Authoritative 2026 schedule (imported by both sides)
Dockerfile         Two-stage build for fly.io
fly.toml           Fly app config (replace name/region before deploy)
```

## Updating the schedule

Edit `shared/schedule.js`. The set IDs are derived from
`{dayId}-{stageId}-{index}` so as long as you preserve the chronological
order of each stage's list, existing votes will keep mapping to the right
artists. If you insert or remove a set, downstream IDs shift — easiest fix
is to roll out before anyone has voted, or to keep a one-off remap.

## API

```
POST /api/groups                                 → { id, name, createdAt }
GET  /api/groups/:groupId                        → meta + members
POST /api/groups/:groupId/join { displayName }   → { member: { key, displayName } }
GET  /api/groups/:groupId/votes                  → { members, perArtist }
GET  /api/groups/:groupId/votes/:memberKey       → { votes: { artistId: score } }
POST /api/groups/:groupId/votes/:memberKey
     { artistId, score: 0|1|3 }                  → { ok: true }
GET  /api/schedule                               → { stages, days, schedule }
GET  /healthz                                    → "ok"
```

`memberKey` is the lowercased, trimmed name. It's returned by `/join` and
should be cached client-side.
