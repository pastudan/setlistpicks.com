async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e = new Error(err.error || `HTTP ${res.status}`);
    e.status = res.status;
    e.data = err;
    throw e;
  }
  return res.json();
}

export const api = {
  schedule: () => req('GET', '/api/schedule'),
  createGroup: (groupName) => req('POST', '/api/groups', { groupName }),
  getGroup: (id) => req('GET', `/api/groups/${id}`),
  join: (id, displayName) => req('POST', `/api/groups/${id}/join`, { displayName }),
  myVotes: (id, memberKey) => req('GET', `/api/groups/${id}/votes/${memberKey}`),
  setVote: (id, memberKey, artistId, score) =>
    req('POST', `/api/groups/${id}/votes/${memberKey}`, { artistId, score }),
  allVotes: (id) => req('GET', `/api/groups/${id}/votes`),
};
