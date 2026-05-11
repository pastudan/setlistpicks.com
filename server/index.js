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
  updateGroupName,
  updateMemberDisplayName,
  removeMember,
} from './groups.js';
import { SCHEDULE, STAGES, DAYS } from '../shared/schedule.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 8080;

const app = express();
app.use(express.json({ limit: '32kb' }));

app.get('/healthz', (_req, res) => res.send('ok'));

app.get('/api/schedule', (_req, res) => {
  res.json({ stages: STAGES, days: DAYS, schedule: SCHEDULE });
});

app.post('/api/groups', (req, res) => {
  try {
    const meta = createGroup({ groupName: req.body?.groupName });
    res.json(meta);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/groups/:groupId', (req, res) => {
  const meta = getGroupMeta(req.params.groupId);
  if (!meta) return res.status(404).json({ error: 'group_not_found' });
  const members = listMembers(req.params.groupId);
  res.json({ ...meta, members });
});

app.patch('/api/groups/:groupId', (req, res) => {
  const result = updateGroupName(req.params.groupId, req.body?.name);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/groups/:groupId/join', (req, res) => {
  const result = joinGroup(req.params.groupId, req.body?.displayName);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.patch('/api/groups/:groupId/members/:memberKey', (req, res) => {
  const result = updateMemberDisplayName(req.params.groupId, req.params.memberKey, req.body?.displayName);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.delete('/api/groups/:groupId/members/:memberKey', (req, res) => {
  const keepVotes = req.query.keepVotes === '1';
  const result = removeMember(req.params.groupId, req.params.memberKey, { keepVotes });
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/groups/:groupId/votes', (req, res) => {
  const meta = getGroupMeta(req.params.groupId);
  if (!meta) return res.status(404).json({ error: 'group_not_found' });
  const result = getAllVotes(req.params.groupId);
  res.json(result);
});

app.get('/api/groups/:groupId/votes/:memberKey', (req, res) => {
  const meta = getGroupMeta(req.params.groupId);
  if (!meta) return res.status(404).json({ error: 'group_not_found' });
  const votes = getMyVotes(req.params.groupId, req.params.memberKey);
  res.json({ votes });
});

app.post('/api/groups/:groupId/votes/:memberKey', (req, res) => {
  const { artistId, score } = req.body || {};
  const result = setVote(req.params.groupId, req.params.memberKey, artistId, score);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

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
