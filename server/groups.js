import { customAlphabet } from 'nanoid';
import { redis, touchTTL, GROUP_TTL_SECONDS } from './redis.js';
import { SCHEDULE_BY_ID } from '../shared/schedule.js';

// URL-friendly, unambiguous alphabet (no 0/O/1/l/I). 10 chars ~ 50 bits.
const newGroupId = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 10);

const keys = {
  meta: (g) => `group:${g}:meta`,
  members: (g) => `group:${g}:members`,
  votes: (g, member) => `group:${g}:votes:${member}`,
};

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().slice(0, 64);
}

function cleanDisplayName(name) {
  return String(name || '').trim().slice(0, 64);
}

export async function createGroup({ groupName } = {}) {
  const id = newGroupId();
  const meta = {
    id,
    name: cleanDisplayName(groupName) || '',
    createdAt: Date.now(),
  };
  await redis.set(keys.meta(id), JSON.stringify(meta));
  await touchTTL(keys.meta(id));
  return meta;
}

export async function getGroupMeta(groupId) {
  const raw = await redis.get(keys.meta(groupId));
  if (!raw) return null;
  // Refresh TTL on read so active groups stay alive.
  await touchTTL(keys.meta(groupId), keys.members(groupId));
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function joinGroup(groupId, displayName) {
  const meta = await getGroupMeta(groupId);
  if (!meta) return { error: 'group_not_found' };

  const display = cleanDisplayName(displayName);
  if (!display) return { error: 'invalid_name' };
  const key = normalizeName(display);
  if (!key) return { error: 'invalid_name' };

  const existing = await redis.hget(keys.members(groupId), key);
  if (existing) {
    const parsed = JSON.parse(existing);
    parsed.lastSeen = Date.now();
    await redis.hset(keys.members(groupId), key, JSON.stringify(parsed));
    await touchTTL(keys.members(groupId), keys.votes(groupId, key));
    return { member: { key, displayName: parsed.displayName } };
  }

  const member = { displayName: display, joinedAt: Date.now(), lastSeen: Date.now() };
  await redis.hset(keys.members(groupId), key, JSON.stringify(member));
  await touchTTL(keys.members(groupId));
  return { member: { key, displayName: member.displayName } };
}

export async function listMembers(groupId) {
  const raw = await redis.hgetall(keys.members(groupId));
  return Object.entries(raw)
    .map(([key, json]) => {
      try {
        const v = JSON.parse(json);
        return { key, displayName: v.displayName };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

const VALID_SCORES = new Set([0, 1, 3]); // 0 = clear, 1 = want, 3 = must-see

export async function setVote(groupId, memberKey, artistId, score) {
  if (!SCHEDULE_BY_ID[artistId]) return { error: 'invalid_artist' };
  const numeric = Number(score);
  if (!VALID_SCORES.has(numeric)) return { error: 'invalid_score' };

  // Ensure the member exists.
  const memJson = await redis.hget(keys.members(groupId), memberKey);
  if (!memJson) return { error: 'not_a_member' };

  const k = keys.votes(groupId, memberKey);
  if (numeric === 0) {
    await redis.hdel(k, artistId);
  } else {
    await redis.hset(k, artistId, String(numeric));
  }
  await touchTTL(k, keys.members(groupId), keys.meta(groupId));
  return { ok: true };
}

export async function getMyVotes(groupId, memberKey) {
  const raw = await redis.hgetall(keys.votes(groupId, memberKey));
  const out = {};
  for (const [artistId, v] of Object.entries(raw)) out[artistId] = Number(v);
  return out;
}

// Return everyone's votes keyed by artistId → array of {displayName, score}.
export async function getAllVotes(groupId) {
  const members = await listMembers(groupId);
  const perArtist = {};
  await Promise.all(
    members.map(async (m) => {
      const votes = await redis.hgetall(keys.votes(groupId, m.key));
      for (const [artistId, v] of Object.entries(votes)) {
        const score = Number(v);
        if (!score) continue;
        if (!perArtist[artistId]) perArtist[artistId] = [];
        perArtist[artistId].push({ displayName: m.displayName, score });
      }
    }),
  );
  return { members, perArtist };
}

export const _internal = { keys, normalizeName, GROUP_TTL_SECONDS };
