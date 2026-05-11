import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
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
// Trust one hop of X-Forwarded-For so req.ip reflects the real client behind a reverse proxy.
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));

// ─── WebSocket rooms ──────────────────────────────────────────────────────────
// groupId → Set<WebSocket>. Single-process so no pub/sub needed.
const rooms = new Map();

function joinRoom(groupId, ws) {
  if (!rooms.has(groupId)) rooms.set(groupId, new Set());
  rooms.get(groupId).add(ws);
}

function leaveRoom(groupId, ws) {
  const room = rooms.get(groupId);
  if (!room) return;
  room.delete(ws);
  if (room.size === 0) rooms.delete(groupId);
}

function broadcastVotes(groupId) {
  const room = rooms.get(groupId);
  if (!room || room.size === 0) return;
  const meta = getGroupMeta(groupId);
  const payload = JSON.stringify({
    type: 'votes',
    groupName: meta?.name,
    ...getAllVotes(groupId),
  });
  for (const ws of room) {
    if (ws.readyState === 1 /* OPEN */) ws.send(payload);
  }
}

// ─── HTTP + WS server ─────────────────────────────────────────────────────────
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost`);
  const groupId = url.searchParams.get('group');
  if (!groupId) return ws.close(1008, 'missing group');

  joinRoom(groupId, ws);

  // Send current votes immediately on connect so new joiners are in sync.
  try {
    const meta = getGroupMeta(groupId);
    if (meta) ws.send(JSON.stringify({ type: 'votes', ...getAllVotes(groupId) }));
  } catch { /* ignore */ }

  ws.on('close', () => leaveRoom(groupId, ws));
  ws.on('error', () => ws.close());
});

// ─── API routes ───────────────────────────────────────────────────────────────
app.get('/healthz', (_req, res) => res.send('ok'));

app.get('/api/schedule', (_req, res) => {
  res.json({ stages: STAGES, days: DAYS, schedule: SCHEDULE });
});

app.post('/api/groups', (req, res) => {
  try {
    const meta = createGroup({ groupName: req.body?.groupName, creatorIp: req.ip });
    if (meta.error === 'rate_limited') return res.status(429).json(meta);
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
  broadcastVotes(req.params.groupId);
  res.json(result);
});

app.post('/api/groups/:groupId/join', (req, res) => {
  const result = joinGroup(req.params.groupId, req.body?.displayName, req.ip);
  if (result.error === 'rate_limited') return res.status(429).json(result);
  if (result.error) return res.status(400).json(result);
  // Broadcast updated member list to group
  broadcastVotes(req.params.groupId);
  res.json(result);
});

app.patch('/api/groups/:groupId/members/:memberKey', (req, res) => {
  const result = updateMemberDisplayName(req.params.groupId, req.params.memberKey, req.body?.displayName);
  if (result.error) return res.status(400).json(result);
  broadcastVotes(req.params.groupId);
  res.json(result);
});

app.delete('/api/groups/:groupId/members/:memberKey', (req, res) => {
  const keepVotes = req.query.keepVotes === 'true';
  const result = removeMember(req.params.groupId, req.params.memberKey, { keepVotes });
  if (result.error) return res.status(400).json(result);
  broadcastVotes(req.params.groupId);
  res.json(result);
});

app.get('/api/groups/:groupId/votes', (req, res) => {
  const meta = getGroupMeta(req.params.groupId);
  if (!meta) return res.status(404).json({ error: 'group_not_found' });
  res.json(getAllVotes(req.params.groupId));
});

app.get('/api/groups/:groupId/votes/:memberKey', (req, res) => {
  const meta = getGroupMeta(req.params.groupId);
  if (!meta) return res.status(404).json({ error: 'group_not_found' });
  res.json({ votes: getMyVotes(req.params.groupId, req.params.memberKey) });
});

app.post('/api/groups/:groupId/votes/:memberKey', (req, res) => {
  const { artistId, score } = req.body || {};
  const result = setVote(req.params.groupId, req.params.memberKey, artistId, score);
  if (result.error) return res.status(400).json(result);
  // Push live vote update to everyone in the group
  broadcastVotes(req.params.groupId);
  res.json(result);
});

// ─── Static / SPA ─────────────────────────────────────────────────────────────
const distDir = path.join(ROOT, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/|\/healthz).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else if (process.env.NODE_ENV === 'production') {
  console.warn('[server] dist/ not found; did you run `npm run build`?');
}

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
