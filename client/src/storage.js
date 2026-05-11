// localStorage keyed by groupId so the same browser can be a member of
// multiple groups, and a returning visitor doesn't have to re-enter their
// name. Server is the source of truth — we just remember which member this
// browser is for each group.

const KEY = 'brsp.identities.v1';
const ACTIVE_KEY = 'brsp.activeGroup.v1';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  localStorage.setItem(KEY, JSON.stringify(obj));
}

export function getIdentity(groupId) {
  return readAll()[groupId] || null;
}

export function setIdentity(groupId, identity) {
  const all = readAll();
  all[groupId] = identity;
  writeAll(all);
}

export function clearIdentity(groupId) {
  const all = readAll();
  delete all[groupId];
  writeAll(all);
}

export function getActiveGroup() {
  return localStorage.getItem(ACTIVE_KEY) || null;
}

export function setActiveGroup(groupId) {
  localStorage.setItem(ACTIVE_KEY, groupId);
}

export function clearActiveGroup() {
  localStorage.removeItem(ACTIVE_KEY);
}
