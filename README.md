# BottleRock Setlist Picks

Web app for coordinating which acts a group of friends wants to see at
**BottleRock Napa Valley 2026** (May 22–24). One invite link per group,
everyone rates shows Skip / 👍 Want / 🔥 Must See, and group picks update
live via WebSocket.

- **Stack**: React 18 + Vite frontend, Express + WebSocket backend, SQLite storage.
- **No accounts**: identity is just a name, saved in `localStorage` per group.
  Names are case-insensitive — `Dan` and `dan` are the same person. Typing
  your name on a new device recovers your picks automatically.
- **Storage**: SQLite via `better-sqlite3` (WAL mode). Groups auto-expire after
  90 days of inactivity. No Redis, no external database.
- **Schedule**: hardcoded in `shared/schedule.js`, sourced from the
  [official site](https://www.bottlerocknapavalley.com/schedule/) /
  [riffmagazine](https://riffmagazine.com/festivals/bottlerock-napa-2026-stage-times/).

## Local development

```bash
npm install
npm run dev
```

That starts:

- Vite dev server on http://localhost:5173 (proxies `/api/*` and `/ws` to :8080)
- Express + WebSocket API on http://localhost:8080

The SQLite database is created automatically at `data/bottlerock.db` on first run.
No external services needed.

## Production build

```bash
npm run build  # writes dist/
npm start      # Express serves dist/ + /api on $PORT (default 8080)
```

## Deploying

See [DEPLOYING.md](DEPLOYING.md) for full Fly.io setup, persistent volume
configuration, GitHub Actions auto-deploy, and custom domain instructions.

## Project layout

```
client/
  src/
    App.jsx              Router + auto-create/join logic
    views/GroupView.jsx  Main group view (all state)
    components/          Header, ScheduleGrid, ShowBlock, Legend, etc.
    svgDefs.js           SVG brushstroke highlight utilities
server/
  index.js               Express + WebSocket server
  groups.js              Group/member/vote data access
  db.js                  SQLite setup (WAL mode, schema, cleanup)
shared/schedule.js       Authoritative 2026 schedule (used by client + server)
Dockerfile               Two-stage build (Vite + better-sqlite3 native compile)
fly.toml                 Fly.io app config
.github/workflows/       GitHub Actions deploy pipeline
```

## Updating the schedule

Edit `shared/schedule.js`. Set IDs are derived from `{dayId}-{stageId}-{index}`.
Preserve the chronological order within each stage's list and existing votes will
continue mapping to the right artists. If you insert or remove a set, IDs shift —
easiest fix is to roll out before anyone has voted.

## API

```
POST   /api/groups                                   → { id, name, createdAt }
GET    /api/groups/:groupId                          → meta + members
PATCH  /api/groups/:groupId { name }                 → { name }
POST   /api/groups/:groupId/join { displayName }     → { member: { key, displayName } }
PATCH  /api/groups/:groupId/members/:key             → { member }
       { displayName }
DELETE /api/groups/:groupId/members/:key             → { ok: true }
       ?keepVotes=true|false
GET    /api/groups/:groupId/votes                    → { members, perArtist, groupName }
GET    /api/groups/:groupId/votes/:memberKey         → { votes: { artistId: score } }
POST   /api/groups/:groupId/votes/:memberKey         → { ok: true }
       { artistId, score: 0|1|3 }
GET    /api/schedule                                 → { stages, days, schedule }
GET    /healthz                                      → "ok"
WS     /ws?group=:groupId                            live vote sync
```

`memberKey` is the lowercased, trimmed display name. Scores: `0` = skip, `1` = want, `3` = must see.
