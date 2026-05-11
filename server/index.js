import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import {
  createGroup,
  getGroupMeta,
  joinGroup,
  listMembers,
  setVote,
  getMyVotes,
  getAllVotes,
} from './groups.js';
import { SCHEDULE, STAGES, DAYS } from '../shared/schedule.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8080;

const app = express();
app.use(express.json({ limit: '32kb' }));

// Health for fly.
app.get('/healthz', (_req, res) => res.send('ok'));

// Static schedule (clients can prefetch this).
app.get('/api/schedule', (_req, res) => {
  res.json({ stages: STAGES, days: DAYS, schedule: SCHEDULE });
});

app.post('/api/groups', async (req, res) => {
  const meta = await createGroup({ groupName: req.body?.groupName });
  res.json(meta);
});

app.get('/api/groups/:groupId', async (req, res) => {
  const meta = await getGroupMeta(req.params.groupId);
  if (!meta) return res.status(404).json({ error: 'group_not_found' });
  const members = await listMembers(req.params.groupId);
  res.json({ ...meta, members });
});

app.post('/api/groups/:groupId/join', async (req, res) => {
  const result = await joinGroup(req.params.groupId, req.body?.displayName);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/groups/:groupId/votes', async (req, res) => {
  const meta = await getGroupMeta(req.params.groupId);
  if (!meta) return res.status(404).json({ error: 'group_not_found' });
  const result = await getAllVotes(req.params.groupId);
  res.json(result);
});

app.get('/api/groups/:groupId/votes/:memberKey', async (req, res) => {
  const meta = await getGroupMeta(req.params.groupId);
  if (!meta) return res.status(404).json({ error: 'group_not_found' });
  const votes = await getMyVotes(req.params.groupId, req.params.memberKey);
  res.json({ votes });
});

app.post('/api/groups/:groupId/votes/:memberKey', async (req, res) => {
  const { artistId, score } = req.body || {};
  const result = await setVote(req.params.groupId, req.params.memberKey, artistId, score);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// In production, serve the built Vite client from /dist and fall back to
// index.html for SPA routes. In dev, run Vite separately on :5173 with
// `npm run dev`.
const distDir = path.join(ROOT, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/|\/healthz).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else if (process.env.NODE_ENV === 'production') {
  console.warn('[server] dist/ not found; did you run `npm run build`?');
}

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
