import express from 'express';
import { db } from './db.js';

const router = express.Router();
const parseForm = express.urlencoded({ extended: false });

// ─── Auth ─────────────────────────────────────────────────────────────────────

function requireSecret(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.params.secret !== secret) return res.redirect('/');
  next();
}

// ─── Prepared statements ──────────────────────────────────────────────────────

const stmts = {
  stats: db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM groups)  AS total_groups,
      (SELECT COUNT(*) FROM members) AS total_members,
      (SELECT COUNT(*) FROM votes)   AS total_votes
  `),

  hourlyTraffic: db.prepare(`
    SELECT strftime('%Y-%m-%dT%H:00', created_at / 1000, 'unixepoch') AS hour,
           COUNT(*) AS count
    FROM groups
    GROUP BY hour
    ORDER BY hour DESC
    LIMIT 48
  `),

  // Union groups + members by IP so each row is counted independently
  ipSummary: db.prepare(`
    SELECT
      ip,
      SUM(CASE WHEN kind = 'group'  THEN 1 ELSE 0 END) AS group_count,
      SUM(CASE WHEN kind = 'member' THEN 1 ELSE 0 END) AS member_count
    FROM (
      SELECT creator_ip AS ip, 'group'  AS kind FROM groups  WHERE creator_ip IS NOT NULL
      UNION ALL
      SELECT creator_ip AS ip, 'member' AS kind FROM members WHERE creator_ip IS NOT NULL
    )
    GROUP BY ip
    ORDER BY group_count DESC
  `),

  allGroups: db.prepare(`
    SELECT g.id, g.name, g.creator_ip, g.created_at, g.last_active,
           COUNT(m.member_key) AS member_count
    FROM groups g
    LEFT JOIN members m ON m.group_id = g.id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `),

  groupsByIp: db.prepare(`
    SELECT g.id, g.name, g.creator_ip, g.created_at, g.last_active,
           COUNT(m.member_key) AS member_count
    FROM groups g
    LEFT JOIN members m ON m.group_id = g.id
    WHERE g.creator_ip = ?
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `),

  membersByIp: db.prepare(`
    SELECT m.group_id, m.member_key, m.display_name, m.joined_at, m.last_seen,
           g.name AS group_name
    FROM members m
    JOIN groups g ON g.id = m.group_id
    WHERE m.creator_ip = ?
    ORDER BY m.joined_at DESC
  `),

  groupById: db.prepare(`
    SELECT g.id, g.name, g.creator_ip, g.created_at, g.last_active,
           COUNT(m.member_key) AS member_count
    FROM groups g
    LEFT JOIN members m ON m.group_id = g.id
    WHERE g.id = ?
    GROUP BY g.id
  `),

  membersByGroup: db.prepare(`
    SELECT
      m.member_key, m.display_name, m.joined_at, m.last_seen, m.creator_ip,
      (SELECT COUNT(*) FROM groups  WHERE creator_ip = m.creator_ip) AS ip_groups,
      (SELECT COUNT(*) FROM members WHERE creator_ip = m.creator_ip) AS ip_members,
      (SELECT COUNT(*) FROM votes WHERE group_id = m.group_id AND member_key = m.member_key) AS vote_count
    FROM members m
    WHERE m.group_id = ?
    ORDER BY m.joined_at
  `),

  deleteVotesByGroup:   db.prepare('DELETE FROM votes   WHERE group_id = ?'),
  deleteMembersByGroup: db.prepare('DELETE FROM members WHERE group_id = ?'),
  deleteGroup:          db.prepare('DELETE FROM groups  WHERE id = ?'),
  deleteVotesByMember:  db.prepare('DELETE FROM votes   WHERE group_id = ? AND member_key = ?'),
  deleteMember:         db.prepare('DELETE FROM members WHERE group_id = ? AND member_key = ?'),
};

const deleteGroupTx = db.transaction((groupId) => {
  stmts.deleteVotesByGroup.run(groupId);
  stmts.deleteMembersByGroup.run(groupId);
  stmts.deleteGroup.run(groupId);
});

const deleteMemberTx = db.transaction((groupId, memberKey) => {
  stmts.deleteVotesByMember.run(groupId, memberKey);
  stmts.deleteMember.run(groupId, memberKey);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(ms) {
  if (!ms) return '—';
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

async function fetchIpInfo(ip) {
  if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('::ffff:127.')) return null;
  try {
    const token = process.env.IPINFO_TOKEN;
    const url = `https://ipinfo.io/${encodeURIComponent(ip)}/json${token ? `?token=${token}` : ''}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 14px; background: #0f1117; color: #e2e8f0; line-height: 1.5; }
  a { color: #60a5fa; text-decoration: none; }
  a:hover { text-decoration: underline; }
  nav { background: #1a1f2e; border-bottom: 1px solid #2d3148; padding: 10px 24px; display: flex; align-items: center; gap: 12px; }
  nav strong { font-size: 15px; color: #f1f5f9; }
  nav .sep { color: #475569; }
  .container { max-width: 1280px; margin: 0 auto; padding: 24px; }
  h2 { font-size: 15px; font-weight: 600; color: #f1f5f9; margin-bottom: 12px; border-bottom: 1px solid #1e2130; padding-bottom: 8px; }
  h3 { font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
  .stats { display: flex; gap: 12px; margin-bottom: 32px; flex-wrap: wrap; }
  .stat { background: #1a1f2e; border: 1px solid #2d3148; border-radius: 8px; padding: 16px 24px; min-width: 150px; }
  .stat-value { font-size: 30px; font-weight: 700; color: #f1f5f9; }
  .stat-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }
  section { margin-bottom: 40px; }
  .table-wrap { overflow-x: auto; border: 1px solid #2d3148; border-radius: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; background: #1a1f2e; color: #64748b; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
  td { padding: 8px 12px; border-top: 1px solid #1e2130; vertical-align: middle; }
  tr:hover td { background: #1a1f2e; }
  .mono { font-family: ui-monospace, monospace; font-size: 12px; }
  .muted { color: #64748b; }
  .badge { display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 11px; font-weight: 600; margin-left: 4px; }
  .badge-red  { background: #450a0a; color: #fca5a5; }
  .badge-blue { background: #0c1a3a; color: #93c5fd; }
  form.inline { display: inline; }
  button.del { background: #1c0a0a; color: #f87171; border: 1px solid #7f1d1d; border-radius: 4px; padding: 2px 9px; font-size: 12px; cursor: pointer; }
  button.del:hover { background: #7f1d1d; color: #fff; }
  .info-grid { display: flex; flex-wrap: wrap; gap: 20px; background: #1a1f2e; border: 1px solid #2d3148; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
  .info-grid dt { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; margin-bottom: 2px; }
  .info-grid dd { font-size: 13px; font-weight: 500; color: #f1f5f9; }
  .back { display: inline-block; margin-bottom: 16px; font-size: 13px; color: #60a5fa; }
  .page-title { font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 20px; }
  .empty { padding: 20px 12px; color: #475569; font-style: italic; }
`;

function page(secret, title, breadcrumb, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${esc(title)} — Admin</title>
  <style>${CSS}</style>
</head>
<body>
  <nav>
    <strong>Admin</strong>
    ${breadcrumb}
  </nav>
  <div class="container">${body}</div>
</body>
</html>`;
}

function ipInfoGrid(info) {
  if (!info || info.error) return '';
  const fields = [
    ['IP',       info.ip],
    ['Org',      info.org],
    ['City',     info.city],
    ['Region',   info.region],
    ['Country',  info.country],
    ['Timezone', info.timezone],
    ['Hostname', info.hostname],
  ].filter(([, v]) => v);
  if (!fields.length) return '';
  return `<dl class="info-grid">${fields.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
}

function deleteGroupForm(secret, groupId, redirectTo) {
  return `<form class="inline" method="POST" action="/admin/${esc(secret)}/delete-group"
      onsubmit="return confirm('Delete group ${esc(groupId)} and ALL its members and votes?')">
    <input type="hidden" name="groupId"  value="${esc(groupId)}" />
    <input type="hidden" name="redirect" value="${esc(redirectTo)}" />
    <button class="del" type="submit">Delete</button>
  </form>`;
}

function deleteMemberForm(secret, groupId, memberKey, redirectTo) {
  return `<form class="inline" method="POST" action="/admin/${esc(secret)}/delete-member"
      onsubmit="return confirm('Delete member ${esc(memberKey)} and their votes?')">
    <input type="hidden" name="groupId"   value="${esc(groupId)}" />
    <input type="hidden" name="memberKey" value="${esc(memberKey)}" />
    <input type="hidden" name="redirect"  value="${esc(redirectTo)}" />
    <button class="del" type="submit">Delete</button>
  </form>`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Dashboard
router.get('/:secret', requireSecret, (req, res) => {
  const { secret } = req.params;
  const stats   = stmts.stats.get();
  const traffic = stmts.hourlyTraffic.all();
  const ipRows  = stmts.ipSummary.all();
  const groups  = stmts.allGroups.all();

  const breadcrumb = `<span class="sep">/</span> Dashboard`;

  const body = `
    <div class="stats">
      <div class="stat"><div class="stat-value">${stats.total_groups}</div><div class="stat-label">Groups</div></div>
      <div class="stat"><div class="stat-value">${stats.total_members}</div><div class="stat-label">Members</div></div>
      <div class="stat"><div class="stat-value">${stats.total_votes}</div><div class="stat-label">Votes</div></div>
    </div>

    <section>
      <h2>IPs</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>IP</th><th>Groups</th><th>Members</th><th></th></tr></thead>
          <tbody>
            ${ipRows.length
              ? ipRows.map(r => `
                <tr>
                  <td class="mono"><a href="/admin/${esc(secret)}/ip/${esc(r.ip)}">${esc(r.ip)}</a></td>
                  <td>${r.group_count}${r.group_count >= 8  ? '<span class="badge badge-red">near limit</span>' : ''}</td>
                  <td>${r.member_count}${r.member_count >= 20 ? '<span class="badge badge-red">near limit</span>' : ''}</td>
                  <td><a href="/admin/${esc(secret)}/ip/${esc(r.ip)}">Drill-down →</a></td>
                </tr>`).join('')
              : `<tr><td colspan="4" class="empty">No data yet</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>Traffic — Groups Created (last 48 h)</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Hour (UTC)</th><th>New Groups</th></tr></thead>
          <tbody>
            ${traffic.length
              ? traffic.map(r => `<tr><td class="mono">${esc(r.hour)}</td><td>${r.count}</td></tr>`).join('')
              : `<tr><td colspan="2" class="empty">No data yet</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>All Groups</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Name</th><th>Creator IP</th>
              <th>Created</th><th>Last Active</th><th>Members</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${groups.length
              ? groups.map(g => `
                <tr>
                  <td class="mono"><a href="/admin/${esc(secret)}/group/${esc(g.id)}">${esc(g.id)}</a></td>
                  <td>${g.name ? esc(g.name) : '<span class="muted">(unnamed)</span>'}</td>
                  <td class="mono">${g.creator_ip
                    ? `<a href="/admin/${esc(secret)}/ip/${esc(g.creator_ip)}">${esc(g.creator_ip)}</a>`
                    : '<span class="muted">—</span>'}</td>
                  <td class="mono muted">${fmt(g.created_at)}</td>
                  <td class="mono muted">${fmt(g.last_active)}</td>
                  <td>${g.member_count}</td>
                  <td>${deleteGroupForm(secret, g.id, `/admin/${secret}`)}</td>
                </tr>`).join('')
              : `<tr><td colspan="7" class="empty">No groups</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>`;

  res.send(page(secret, 'Dashboard', breadcrumb, body));
});

// IP drill-down
router.get('/:secret/ip/:ip', requireSecret, async (req, res) => {
  const { secret, ip } = req.params;
  const backUrl = `/admin/${secret}`;

  const [groups, members, ipInfo] = await Promise.all([
    Promise.resolve(stmts.groupsByIp.all(ip)),
    Promise.resolve(stmts.membersByIp.all(ip)),
    fetchIpInfo(ip),
  ]);

  const breadcrumb = `
    <span class="sep">/</span>
    <a href="${esc(backUrl)}">Dashboard</a>
    <span class="sep">/</span>
    <span class="mono">${esc(ip)}</span>`;

  const body = `
    <a class="back" href="${esc(backUrl)}">← Dashboard</a>
    <div class="page-title mono">${esc(ip)}</div>
    ${ipInfoGrid(ipInfo)}

    <section>
      <h2>Groups from this IP (${groups.length})</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Created</th><th>Last Active</th><th>Members</th><th></th></tr>
          </thead>
          <tbody>
            ${groups.length
              ? groups.map(g => `
                <tr>
                  <td class="mono"><a href="/admin/${esc(secret)}/group/${esc(g.id)}">${esc(g.id)}</a></td>
                  <td>${g.name ? esc(g.name) : '<span class="muted">(unnamed)</span>'}</td>
                  <td class="mono muted">${fmt(g.created_at)}</td>
                  <td class="mono muted">${fmt(g.last_active)}</td>
                  <td>${g.member_count}</td>
                  <td>${deleteGroupForm(secret, g.id, req.originalUrl)}</td>
                </tr>`).join('')
              : `<tr><td colspan="6" class="empty">None</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>

    <section>
      <h2>Members from this IP (${members.length})</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Display Name</th><th>Group</th><th>Joined</th><th>Last Seen</th><th></th></tr>
          </thead>
          <tbody>
            ${members.length
              ? members.map(m => `
                <tr>
                  <td>${esc(m.display_name)}</td>
                  <td class="mono">
                    <a href="/admin/${esc(secret)}/ip/${esc(ip)}">${m.group_name ? esc(m.group_name) : esc(m.group_id)}</a>
                    <span class="muted">(${esc(m.group_id)})</span>
                  </td>
                  <td class="mono muted">${fmt(m.joined_at)}</td>
                  <td class="mono muted">${fmt(m.last_seen)}</td>
                  <td>${deleteMemberForm(secret, m.group_id, m.member_key, req.originalUrl)}</td>
                </tr>`).join('')
              : `<tr><td colspan="5" class="empty">None</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>`;

  res.send(page(secret, `IP ${ip}`, breadcrumb, body));
});

// Group detail
router.get('/:secret/group/:groupId', requireSecret, (req, res) => {
  const { secret, groupId } = req.params;
  const group = stmts.groupById.get(groupId);
  if (!group) return res.status(404).send(page(secret, 'Not Found', '', '<p style="color:#94a3b8">Group not found.</p>'));

  const members = stmts.membersByGroup.all(groupId);
  const backUrl = `/admin/${secret}`;

  const breadcrumb = `
    <span class="sep">/</span>
    <a href="${esc(backUrl)}">Dashboard</a>
    <span class="sep">/</span>
    <span class="mono">${esc(groupId)}</span>`;

  const ipCell = (m) => {
    if (!m.creator_ip) return '<span class="muted">—</span>';
    const counts = `<span class="muted" style="font-size:11px;margin-left:5px">(${m.ip_groups}g / ${m.ip_members}m)</span>`;
    return `<a href="/admin/${esc(secret)}/ip/${esc(m.creator_ip)}" class="mono">${esc(m.creator_ip)}</a>${counts}`;
  };

  const body = `
    <a class="back" href="${esc(backUrl)}">← Dashboard</a>
    <div class="page-title">${group.name ? esc(group.name) : '<span class="muted">(unnamed)</span>'} <span class="mono" style="font-size:13px;color:#64748b">${esc(groupId)}</span></div>

    <dl class="info-grid" style="margin-bottom:24px">
      <div><dt>Created</dt><dd>${fmt(group.created_at)}</dd></div>
      <div><dt>Last Active</dt><dd>${fmt(group.last_active)}</dd></div>
      <div><dt>Members</dt><dd>${group.member_count}</dd></div>
      ${group.creator_ip ? `<div><dt>Creator IP</dt><dd><a href="/admin/${esc(secret)}/ip/${esc(group.creator_ip)}">${esc(group.creator_ip)}</a></dd></div>` : ''}
    </dl>

    <section>
      <h2>Members (${members.length})</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Name</th><th>Picks</th><th>Joined</th><th>Last Seen</th><th>IP</th><th></th></tr>
          </thead>
          <tbody>
            ${members.length
              ? members.map(m => `
                <tr>
                  <td style="font-weight:500">${esc(m.display_name)}</td>
                  <td>${m.vote_count > 0 ? m.vote_count : '<span class="muted">—</span>'}</td>
                  <td class="mono muted">${fmt(m.joined_at)}</td>
                  <td class="mono muted">${fmt(m.last_seen)}</td>
                  <td>${ipCell(m)}</td>
                  <td>${deleteMemberForm(secret, groupId, m.member_key, req.originalUrl)}</td>
                </tr>`).join('')
              : `<tr><td colspan="6" class="empty">No members</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>

    <section style="margin-top:8px">
      ${deleteGroupForm(secret, groupId, backUrl)}
      <span style="margin-left:8px;font-size:12px;color:#64748b">Delete entire group</span>
    </section>`;

  res.send(page(secret, `Group ${groupId}`, breadcrumb, body));
});

// Delete group
router.post('/:secret/delete-group', requireSecret, parseForm, (req, res) => {
  const { secret } = req.params;
  const { groupId, redirect } = req.body ?? {};
  if (groupId) {
    try { deleteGroupTx(groupId); } catch (e) { console.error('[admin] delete-group error', e); }
  }
  res.redirect(redirect || `/admin/${secret}`);
});

// Delete member
router.post('/:secret/delete-member', requireSecret, parseForm, (req, res) => {
  const { secret } = req.params;
  const { groupId, memberKey, redirect } = req.body ?? {};
  if (groupId && memberKey) {
    try { deleteMemberTx(groupId, memberKey); } catch (e) { console.error('[admin] delete-member error', e); }
  }
  res.redirect(redirect || `/admin/${secret}`);
});

export { router as adminRouter };
