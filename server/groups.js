import { customAlphabet } from 'nanoid';
import { db } from './db.js';
import { SCHEDULE_BY_ID } from '../shared/schedule.js';

const newGroupId = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 10);

const MAX_DISPLAY_NAME_LEN = 50;   // per-member name
const MAX_GROUP_NAME_LEN   = 100;  // long enough for a funny name, not a novel

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().slice(0, MAX_DISPLAY_NAME_LEN);
}

function cleanDisplayName(name, maxLen = MAX_DISPLAY_NAME_LEN) {
  return String(name || '').trim().slice(0, maxLen);
}

function touch(groupId) {
  db.prepare('UPDATE groups SET last_active = ? WHERE id = ?').run(Date.now(), groupId);
}

// Prepared statements — created once, reused on every call (better-sqlite3 caches internally).
const MAX_GROUPS_PER_IP  = 10;
const MAX_MEMBERS_PER_IP = 25;

const stmts = {
  insertGroup:      db.prepare('INSERT INTO groups (id, name, created_at, last_active, creator_ip) VALUES (?, ?, ?, ?, ?)'),
  countGroupsByIp:  db.prepare('SELECT COUNT(*) AS cnt FROM groups WHERE creator_ip = ?'),
  getGroup:         db.prepare('SELECT * FROM groups WHERE id = ?'),
  touchGroup:       db.prepare('UPDATE groups SET last_active = ? WHERE id = ?'),
  updateGroupName:  db.prepare('UPDATE groups SET name = ?, last_active = ? WHERE id = ?'),

  getMember:        db.prepare('SELECT * FROM members WHERE group_id = ? AND member_key = ?'),
  countMembersByIp: db.prepare('SELECT COUNT(*) AS cnt FROM members WHERE creator_ip = ?'),
  insertMember:     db.prepare('INSERT INTO members (group_id, member_key, display_name, joined_at, last_seen, creator_ip) VALUES (?, ?, ?, ?, ?, ?)'),
  touchMember:  db.prepare('UPDATE members SET last_seen = ? WHERE group_id = ? AND member_key = ?'),
  updateMemberName: db.prepare('UPDATE members SET display_name = ?, last_seen = ? WHERE group_id = ? AND member_key = ?'),
  listMembers:  db.prepare('SELECT member_key, display_name FROM members WHERE group_id = ?'),

  clearVotes:   db.prepare('DELETE FROM votes WHERE group_id = ? AND member_key = ?'),
  deleteMember: db.prepare('DELETE FROM members WHERE group_id = ? AND member_key = ?'),

  upsertVote:   db.prepare(`
    INSERT INTO votes (group_id, member_key, artist_id, score) VALUES (?, ?, ?, ?)
    ON CONFLICT(group_id, member_key, artist_id) DO UPDATE SET score = excluded.score
  `),
  deleteVote:   db.prepare('DELETE FROM votes WHERE group_id = ? AND member_key = ? AND artist_id = ?'),
  getMyVotes:   db.prepare('SELECT artist_id, score FROM votes WHERE group_id = ? AND member_key = ?'),
  getAllVotes:   db.prepare('SELECT member_key, artist_id, score FROM votes WHERE group_id = ?'),
};

export function createGroup({ groupName, creatorIp } = {}) {
  if (creatorIp) {
    const { cnt } = stmts.countGroupsByIp.get(creatorIp);
    if (cnt >= MAX_GROUPS_PER_IP) return { error: 'rate_limited' };
  }
  const id = newGroupId();
  const now = Date.now();
  const name = cleanDisplayName(groupName, MAX_GROUP_NAME_LEN) || '';
  stmts.insertGroup.run(id, name, now, now, creatorIp ?? null);
  return { id, name, createdAt: now };
}

export function getGroupMeta(groupId) {
  const row = stmts.getGroup.get(groupId);
  if (!row) return null;
  stmts.touchGroup.run(Date.now(), groupId);
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export function joinGroup(groupId, displayName, creatorIp) {
  const group = stmts.getGroup.get(groupId);
  if (!group) return { error: 'group_not_found' };

  const display = cleanDisplayName(displayName);
  if (!display) return { error: 'invalid_name' };
  const key = normalizeName(display);
  if (!key) return { error: 'invalid_name' };

  const now = Date.now();
  const existing = stmts.getMember.get(groupId, key);
  if (existing) {
    stmts.touchMember.run(now, groupId, key);
    return { member: { key, displayName: existing.display_name } };
  }

  if (creatorIp) {
    const { cnt } = stmts.countMembersByIp.get(creatorIp);
    if (cnt >= MAX_MEMBERS_PER_IP) return { error: 'rate_limited' };
  }

  stmts.insertMember.run(groupId, key, display, now, now, creatorIp ?? null);
  return { member: { key, displayName: display } };
}

export function listMembers(groupId) {
  return stmts.listMembers.all(groupId).map((r) => ({
    key: r.member_key,
    displayName: r.display_name,
  }));
}

const VALID_SCORES = new Set([0, 1, 3]);

export function setVote(groupId, memberKey, artistId, score) {
  if (!SCHEDULE_BY_ID[artistId]) return { error: 'invalid_artist' };
  const numeric = Number(score);
  if (!VALID_SCORES.has(numeric)) return { error: 'invalid_score' };

  const mem = stmts.getMember.get(groupId, memberKey);
  if (!mem) return { error: 'not_a_member' };

  if (numeric === 0) {
    stmts.deleteVote.run(groupId, memberKey, artistId);
  } else {
    stmts.upsertVote.run(groupId, memberKey, artistId, numeric);
  }
  touch(groupId);
  return { ok: true };
}

export function getMyVotes(groupId, memberKey) {
  const rows = stmts.getMyVotes.all(groupId, memberKey);
  return Object.fromEntries(rows.map((r) => [r.artist_id, r.score]));
}

export function getAllVotes(groupId) {
  const members = listMembers(groupId);
  const memberMap = Object.fromEntries(members.map((m) => [m.key, m]));
  const rows = stmts.getAllVotes.all(groupId);
  const perArtist = {};
  for (const row of rows) {
    const m = memberMap[row.member_key];
    if (!m) continue;
    if (!perArtist[row.artist_id]) perArtist[row.artist_id] = [];
    perArtist[row.artist_id].push({ key: m.key, displayName: m.displayName, score: row.score });
  }
  return { members, perArtist };
}

export function updateGroupName(groupId, newName) {
  const name = cleanDisplayName(newName, MAX_GROUP_NAME_LEN);
  if (!name) return { error: 'invalid_name' };
  const info = stmts.updateGroupName.run(name, Date.now(), groupId);
  if (!info.changes) return { error: 'group_not_found' };
  return { name };
}

export function removeMember(groupId, memberKey, { keepVotes = false } = {}) {
  const mem = stmts.getMember.get(groupId, memberKey);
  if (!mem) return { error: 'not_a_member' };
  if (!keepVotes) stmts.clearVotes.run(groupId, memberKey);
  stmts.deleteMember.run(groupId, memberKey);
  touch(groupId);
  return { ok: true };
}

export function updateMemberDisplayName(groupId, memberKey, newDisplayName) {
  const display = cleanDisplayName(newDisplayName);
  if (!display) return { error: 'invalid_name' };
  const info = stmts.updateMemberName.run(display, Date.now(), groupId, memberKey);
  if (!info.changes) return { error: 'not_a_member' };
  return { member: { key: memberKey, displayName: display } };
}
