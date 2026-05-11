import { h, toast } from '../dom.js';
import { api } from '../api.js';
import { clearIdentity } from '../storage.js';
import { SCHEDULE, STAGES, DAYS, fmtTime } from '../../../shared/schedule.js';

const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s]));

function scoreLabel(score) {
  if (score >= 3) return '🔥 MUST';
  if (score >= 1) return '👍 WANT';
  return 'SKIP';
}
function nextScore(cur) {
  if (cur === 3) return 0;
  if (cur === 1) return 3;
  return 1;
}
function scoreClass(score) {
  if (score >= 3) return 'must';
  if (score >= 1) return 'want';
  return '';
}

function stageChip(stageId) {
  const s = STAGE_BY_ID[stageId];
  return h(`span.stage-chip.${stageId}`, s.name);
}

// "Conflicts": a set is conflicted if it overlaps another set that also has
// votes from the group. Used in the Group view to surface decision moments.
function findConflicts(daySets, votedSet) {
  const conflicts = new Set();
  for (let i = 0; i < daySets.length; i++) {
    const a = daySets[i];
    if (!votedSet.has(a.id)) continue;
    for (let j = i + 1; j < daySets.length; j++) {
      const b = daySets[j];
      if (a.stageId === b.stageId) continue;
      if (b.startMin >= a.endMin) continue;
      if (a.startMin >= b.endMin) continue;
      if (!votedSet.has(b.id)) continue;
      conflicts.add(a.id);
      conflicts.add(b.id);
    }
  }
  return conflicts;
}

export function groupView({ groupId, member, groupMeta }) {
  let activeDay = DAYS[0].id;
  let activeMode = 'mine'; // 'mine' | 'group'

  let myVotes = {}; // { artistId: score }
  let allVotes = { members: [], perArtist: {} };
  let mutedMembers = groupMeta?.members || [];

  const root = h('div.app');
  const toolbar = h('div.toolbar');
  const body = h('div');
  root.appendChild(toolbar);
  root.appendChild(body);

  function inviteUrl() {
    return `${location.origin}/g/${groupId}`;
  }

  async function refreshAllVotes() {
    try {
      allVotes = await api.allVotes(groupId);
      mutedMembers = allVotes.members;
    } catch (e) {
      console.error('refreshAllVotes', e);
    }
  }

  async function refreshMyVotes() {
    try {
      const { votes } = await api.myVotes(groupId, member.key);
      myVotes = votes || {};
    } catch (e) {
      console.error('refreshMyVotes', e);
    }
  }

  function renderHeader() {
    const headline = groupMeta?.name || 'Your crew';
    return h('div.brand', [
      h('div', { style: { fontSize: '1.6rem' } }, '🎸'),
      h('div', { style: { flex: 1, minWidth: 0 } }, [
        h('div.brand-title', headline),
        h('div.brand-sub', `You're signed in as ${member.displayName} · ${mutedMembers.length} ${mutedMembers.length === 1 ? 'member' : 'members'}`),
      ]),
      h(
        'button.btn.ghost.small',
        {
          onClick: () => {
            if (!confirm('Sign out of this group on this device? Your votes stay saved on the server.')) return;
            clearIdentity(groupId);
            location.reload();
          },
        },
        'Sign out',
      ),
    ]);
  }

  function renderShare() {
    const input = h('input', { type: 'text', readonly: true, value: inviteUrl() });
    const copy = h(
      'button.btn.secondary.small',
      {
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(inviteUrl());
            toast('Invite link copied');
          } catch {
            input.select();
            document.execCommand && document.execCommand('copy');
            toast('Invite link copied');
          }
        },
      },
      'Copy link',
    );
    return h('div.card.stack', [
      h('div', { style: { fontWeight: 600 } }, 'Invite your crew'),
      h('div.share-row', [input, copy]),
      mutedMembers.length
        ? h(
            'div.members',
            mutedMembers.map((m) =>
              h(`span.member-chip${m.key === member.key ? '.you' : ''}`, m.displayName),
            ),
          )
        : null,
    ]);
  }

  function renderTabs() {
    const dayTabs = h(
      'div.tabs',
      DAYS.map((d) =>
        h(
          `div.tab${activeDay === d.id ? '.active' : ''}`,
          {
            onClick: () => {
              activeDay = d.id;
              render();
            },
          },
          `${d.name.slice(0, 3)} · ${d.date.replace('May ', '')}`,
        ),
      ),
    );
    const modeTabs = h('div.tabs', [
      h(
        `div.tab${activeMode === 'mine' ? '.active' : ''}`,
        { onClick: () => { activeMode = 'mine'; render(); } },
        'My picks',
      ),
      h(
        `div.tab${activeMode === 'group' ? '.active' : ''}`,
        { onClick: () => { activeMode = 'group'; render(); } },
        `Group${mutedMembers.length ? ` · ${mutedMembers.length}` : ''}`,
      ),
    ]);
    return h('div.stack', [dayTabs, modeTabs]);
  }

  function renderMyList(daySets) {
    return h(
      'div.setlist',
      daySets.map((s) => {
        const cur = myVotes[s.id] || 0;
        const btn = h(
          `button.vote-btn${cur ? '.' + scoreClass(cur) : ''}`,
          {
            onClick: async () => {
              const next = nextScore(cur);
              const prev = cur;
              myVotes[s.id] = next;
              render();
              try {
                await api.setVote(groupId, member.key, s.id, next);
              } catch (e) {
                myVotes[s.id] = prev;
                toast(`Save failed: ${e.message}`);
                render();
              }
            },
          },
          scoreLabel(cur),
        );
        return h('div.set-row', [
          h('div.time', [
            h('div.start', fmtTime(s.start)),
            h('div', `→ ${fmtTime(s.end)}`),
          ]),
          h('div.info', [
            h('div.artist', s.artist),
            h('div.sub', [stageChip(s.stageId)]),
          ]),
          btn,
        ]);
      }),
    );
  }

  function renderGroupList(daySets) {
    const votedSet = new Set(Object.keys(allVotes.perArtist || {}));
    const conflicts = findConflicts(daySets, votedSet);
    const rows = daySets.map((s) => {
      const voters = (allVotes.perArtist[s.id] || []).slice().sort((a, b) => b.score - a.score);
      const total = voters.reduce((acc, v) => acc + v.score, 0);
      const cls = total >= 6 ? 'hot' : total >= 2 ? 'warm' : '';
      return h(`div.set-row${conflicts.has(s.id) ? '' : ''}`, [
        h('div.time', [
          h('div.start', fmtTime(s.start)),
          h('div', `→ ${fmtTime(s.end)}`),
        ]),
        h('div.info', [
          h('div.artist', s.artist),
          h('div.sub', [
            stageChip(s.stageId),
            conflicts.has(s.id)
              ? h('span.voter', { style: { borderColor: 'var(--accent)', color: 'var(--accent)' } }, '⏱ conflict')
              : null,
          ]),
          voters.length
            ? h(
                'div.voters',
                voters.map((v) =>
                  h(`span.voter.${scoreClass(v.score)}`, [
                    v.score >= 3 ? '🔥 ' : '👍 ',
                    v.displayName,
                  ]),
                ),
              )
            : null,
        ]),
        h(`div.score-badge${cls ? '.' + cls : ''}`, [
          h('div.n', total ? String(total) : '–'),
          h('div.label', total ? 'pts' : 'no votes'),
        ]),
      ]);
    });

    return h('div.stack', [
      conflicts.size
        ? h(
            'div.conflict-banner',
            `${conflicts.size} ${conflicts.size === 1 ? 'set has' : 'sets have'} an overlapping pick from the group — time to negotiate!`,
          )
        : null,
      h('div.setlist', rows),
    ]);
  }

  function renderLegend() {
    if (activeMode === 'mine') {
      return h('div.legend', [
        h('span.pill', 'Tap to cycle:'),
        h('span.pill', 'SKIP'),
        h('span.pill.want', '👍 WANT (1 pt)'),
        h('span.pill.must', '🔥 MUST SEE (3 pts)'),
      ]);
    }
    return h('div.legend', [
      h('span.pill', 'Group score = sum of everyone’s pts'),
      h('span.pill.want', '👍 1'),
      h('span.pill.must', '🔥 3'),
    ]);
  }

  function render() {
    const day = DAYS.find((d) => d.id === activeDay);
    const daySets = SCHEDULE
      .filter((s) => s.dayId === activeDay)
      .sort((a, b) => a.startMin - b.startMin || a.stageId.localeCompare(b.stageId));

    toolbar.replaceChildren(renderHeader(), renderShare(), renderTabs(), renderLegend());

    body.replaceChildren(
      h('div.day-header', [
        h('h2', `${day.name}`),
        h('span.date', day.date),
      ]),
      activeMode === 'mine' ? renderMyList(daySets) : renderGroupList(daySets),
    );
  }

  (async () => {
    render();
    await Promise.all([refreshMyVotes(), refreshAllVotes()]);
    render();
    // Poll for other folks' updates every 10s while the tab is visible.
    let timer;
    const tick = async () => {
      if (document.hidden) return;
      await refreshAllVotes();
      render();
    };
    timer = setInterval(tick, 10000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) tick();
    });
    window.addEventListener('beforeunload', () => clearInterval(timer));
  })();

  return root;
}
