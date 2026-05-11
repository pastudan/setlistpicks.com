import { h, toast } from '../dom.js';
import { api } from '../api.js';
import { setIdentity, clearIdentity } from '../storage.js';
import { SCHEDULE, STAGES, DAYS, fmtTime } from '../../../shared/schedule.js';

// ─── Highlight style config ───────────────────────────────────────────────────
// true  = each block gets a unique stroke derived from its set ID (consistent
//         across renders — same show always looks the same).
// false = fully random on every render / every vote toggle (more lively).
const DETERMINISTIC_HIGHLIGHTS = false;

// Grid constants
const GRID_START_MIN = 12 * 60; // 12:00 PM
const GRID_END_MIN   = 22 * 60; // 10:00 PM
const SLOT_MINS      = 15;
const TOTAL_SLOTS    = (GRID_END_MIN - GRID_START_MIN) / SLOT_MINS; // 40

const STAGE_COL = { prudential: 2, tmobile: 3, hellofresh: 4, northbay: 5 };

function initials(name) {
  return name.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function chevronSvg() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 12 12');
  svg.setAttribute('fill', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'width:10px;height:10px;opacity:0.75;flex-shrink:0;';
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M2 4l4 4 4-4z');
  svg.appendChild(path);
  return svg;
}


function minToSlot(min) {
  return Math.round((min - GRID_START_MIN) / SLOT_MINS);
}

function scoreClass(score) {
  if (score >= 3) return 'vote-3';
  if (score >= 1) return 'vote-1';
  return 'vote-0';
}

function nextScore(cur) {
  if (cur === 3) return 0;
  if (cur === 1) return 3;
  return 1;
}

function fmtTimeShort(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}` : `${h12}:${String(m).padStart(2, '0')}`;
}

function timeAxisLabel(slotIndex) {
  // slotIndex 0 = 12:00 PM, 4 = 1 PM, 8 = 2 PM, ...
  const totalMin = GRID_START_MIN + slotIndex * SLOT_MINS;
  const hour = Math.floor(totalMin / 60);
  const isFirst = slotIndex === 0;
  const isLast = slotIndex === TOTAL_SLOTS;
  if (isFirst) return '12 PM';
  if (isLast) return '10 PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return String(h12);
}

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function dayDateFormatted(dateStr) {
  // dateStr like "May 22"
  const parts = dateStr.split(' ');
  const day = parseInt(parts[1], 10);
  return `${parts[1]}${ordinalSuffix(day)}`;
}

// ─── Seeded RNG ──────────────────────────────────────────────────────────────
// Deterministic pseudo-random floats from a string seed.
// Same set ID → same stroke every render; different sets → different shapes.
function seededRandom(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return () => {
    h ^= h >>> 13;
    h ^= h << 17;
    h ^= h >>> 5;
    return (h >>> 0) / 0xFFFFFFFF;
  };
}

// ─── Per-block inline wash SVG ────────────────────────────────────────────────
// Two filled wavy-edged paths (primary + return stroke) with control points and
// turbulence seed derived from the set ID so every block is uniquely shaped.
function makeWashSvg(setId) {
  const rng = DETERMINISTIC_HIGHLIGHTS ? seededRandom(setId) : Math.random;
  const j = (spread) => rng() * spread * 2 - spread;

  const filterIndex = Math.floor(rng() * 8) + 1;
  const filterRef = `url(#roughen-hi-${filterIndex})`;
  const rotation = -(0.5 + rng() * 1.0); // subtle overall rotation
  const returnOpacity = (0.30 + rng() * 0.28).toFixed(2);

  // Signed tilt: negative = right side higher (bottom-left→top-right sweep),
  // near zero = straight, positive = right side lower (top-left→bottom-right).
  // Range -15 to +15 gives a natural mix of all three across different blocks.
  const tilt = (rng() - 0.5) * 30;
  const a = (x) => -(x / 100) * tilt;

  // Primary stroke: fills nearly the full height, angled bottom-left→top-right.
  const p1 = [
    `M -3,${(-2 + j(4) + a(-3)).toFixed(1)}`,
    `C ${(15 + j(5)).toFixed(1)},${(-8 + j(7) + a(15)).toFixed(1)}`,
    `  ${(35 + j(5)).toFixed(1)},${(6  + j(7) + a(35)).toFixed(1)}`,
    `  50,${(-1 + j(7) + a(50)).toFixed(1)}`,
    `C ${(65 + j(5)).toFixed(1)},${(-8 + j(7) + a(65)).toFixed(1)}`,
    `  ${(85 + j(5)).toFixed(1)},${(6  + j(7) + a(85)).toFixed(1)}`,
    `  103,${(-2 + j(4) + a(103)).toFixed(1)}`,
    `L 103,${(102 + j(4) + a(103)).toFixed(1)}`,
    `C ${(85 + j(5)).toFixed(1)},${(108 + j(7) + a(85)).toFixed(1)}`,
    `  ${(65 + j(5)).toFixed(1)},${(95  + j(7) + a(65)).toFixed(1)}`,
    `  50,${(103 + j(7) + a(50)).toFixed(1)}`,
    `C ${(35 + j(5)).toFixed(1)},${(108 + j(7) + a(35)).toFixed(1)}`,
    `  ${(15 + j(5)).toFixed(1)},${(96  + j(7) + a(15)).toFixed(1)}`,
    `  -3,${(102 + j(4) + a(-3)).toFixed(1)}`,
    'Z',
  ].join(' ');

  // Return stroke: lighter second pass that bleeds above the top edge,
  // same diagonal angle as the primary.
  const yOff = j(4);
  const p2 = [
    `M -3,${(-14 + yOff + j(4) + a(-3)).toFixed(1)}`,
    `C ${(15 + j(5)).toFixed(1)},${(-20 + yOff + j(6) + a(15)).toFixed(1)}`,
    `  ${(35 + j(5)).toFixed(1)},${(-9  + yOff + j(6) + a(35)).toFixed(1)}`,
    `  50,${(-15 + yOff + j(6) + a(50)).toFixed(1)}`,
    `C ${(65 + j(5)).toFixed(1)},${(-20 + yOff + j(6) + a(65)).toFixed(1)}`,
    `  ${(85 + j(5)).toFixed(1)},${(-10 + yOff + j(6) + a(85)).toFixed(1)}`,
    `  103,${(-14 + yOff + j(4) + a(103)).toFixed(1)}`,
    `L 103,${(22 + yOff + j(4) + a(103)).toFixed(1)}`,
    `C ${(85 + j(5)).toFixed(1)},${(28 + yOff + j(6) + a(85)).toFixed(1)}`,
    `  ${(65 + j(5)).toFixed(1)},${(18 + yOff + j(6) + a(65)).toFixed(1)}`,
    `  50,${(24 + yOff + j(6) + a(50)).toFixed(1)}`,
    `C ${(35 + j(5)).toFixed(1)},${(28 + yOff + j(6) + a(35)).toFixed(1)}`,
    `  ${(15 + j(5)).toFixed(1)},${(19 + yOff + j(6) + a(15)).toFixed(1)}`,
    `  -3,${(22 + yOff + j(4) + a(-3)).toFixed(1)}`,
    'Z',
  ].join(' ');

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'wash');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.transform = `rotate(${rotation.toFixed(2)}deg)`;

  const path1 = document.createElementNS(ns, 'path');
  path1.setAttribute('d', p1);
  path1.setAttribute('fill', 'currentColor');
  path1.setAttribute('opacity', '0.85');
  path1.setAttribute('filter', filterRef);

  const path2 = document.createElementNS(ns, 'path');
  path2.setAttribute('d', p2);
  path2.setAttribute('fill', 'currentColor');
  path2.setAttribute('opacity', returnOpacity);
  path2.setAttribute('filter', filterRef);

  svg.appendChild(path1);
  svg.appendChild(path2);
  return svg;
}

// ─── Shared SVG defs (filters + mark symbols) ─────────────────────────────────
let svgDefsInjected = false;
function ensureSvgDefs() {
  if (svgDefsInjected) return;
  svgDefsInjected = true;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
  svg.setAttribute('aria-hidden', 'true');

  // 8 highlight displacement filters — low baseFrequency = large slow waves;
  // different seeds = 8 distinct warp patterns for per-block variety.
  const hiFilters = Array.from({ length: 8 }, (_, i) => `
      <filter id="roughen-hi-${i + 1}" x="-10%" y="-20%" width="120%" height="140%">
        <feTurbulence type="turbulence" baseFrequency="0.035 0.055"
          numOctaves="3" seed="${i + 1}" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise"
          scale="4" xChannelSelector="R" yChannelSelector="G"/>
      </filter>`).join('');

  svg.innerHTML = `
    <defs>
      ${hiFilters}

      <!-- Fine-grain roughen for check/star glyphs (kept separate — higher freq) -->
      <filter id="roughen">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" xChannelSelector="R" yChannelSelector="G"/>
      </filter>

      <!-- Hand-drawn check mark -->
      <symbol id="mark-check" viewBox="0 0 28 28" overflow="visible">
        <polyline
          points="3,15 10,22 25,5"
          fill="none"
          stroke="rgba(60,40,0,0.8)"
          stroke-width="3.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          filter="url(#roughen)"
        />
      </symbol>

    </defs>
  `;
  document.body.appendChild(svg);
}

function svgMark(symbolId, extraClass) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', `mark ${extraClass}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('viewBox', '0 0 28 28');
  svg.setAttribute('overflow', 'visible');
  const use = document.createElementNS(ns, 'use');
  use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', `#${symbolId}`);
  use.setAttribute('href', `#${symbolId}`);
  svg.appendChild(use);
  return svg;
}

export function groupView({ groupId, member, groupMeta, freshJoin = false, onLeave }) {
  ensureSvgDefs();

  let myVotes = {};
  let perArtistRaw = {}; // artistId -> [{ key, displayName, score }] all members
  let mutedMembers = groupMeta?.members || [];
  let groupName = groupMeta?.name || 'Napa Squad';
  let memberDisplayName = member.displayName;
  let editingHeader = false;
  let removingMember = null;
  let showNamePrompt = freshJoin;

  const root = h('div.app');
  const toolbar = h('div.toolbar');
  const body = h('div');
  root.appendChild(toolbar);
  root.appendChild(body);

  // Keep --toolbar-h in sync so the sticky legend can dock right below
  const toolbarResizeObs = new ResizeObserver(([entry]) => {
    const h = Math.ceil(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height);
    root.style.setProperty('--toolbar-h', `${h}px`);
  });
  toolbarResizeObs.observe(toolbar);

  function onScroll() {
    const floating = window.scrollY > 10;
    toolbar.classList.toggle('floating', floating);
    body.querySelector('.legend')?.classList.toggle('floating', floating);
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  async function refreshMyVotes() {
    try {
      const { votes } = await api.myVotes(groupId, member.key);
      myVotes = votes || {};
    } catch (e) {
      console.error('refreshMyVotes', e);
    }
  }

  function buildGroupVotesEl(artistId) {
    const serverOthers = (perArtistRaw[artistId] || []).filter(v => v.key !== member.key);
    const myScore = myVotes[artistId] || 0;
    const allVoters = [
      ...serverOthers,
      ...(myScore > 0 ? [{ key: member.key, displayName: memberDisplayName, score: myScore }] : []),
    ];
    const wantVoters = allVoters.filter(v => v.score === 1);
    const mustVoters = allVoters.filter(v => v.score === 3);
    const fName = (v) => v.displayName.split(' ')[0];

    if (!wantVoters.length && !mustVoters.length) return null;

    const gv = document.createElement('div');
    gv.className = 'group-votes';

    if (wantVoters.length === 1) {
      const c = document.createElement('span'); c.className = 'gv-check'; c.textContent = '✓'; gv.appendChild(c);
      const n = document.createElement('span'); n.className = 'gv-name'; n.textContent = fName(wantVoters[0]); gv.appendChild(n);
    } else {
      wantVoters.forEach(() => { const c = document.createElement('span'); c.className = 'gv-check'; c.textContent = '✓'; gv.appendChild(c); });
    }

    if (wantVoters.length && mustVoters.length) {
      const gap = document.createElement('span'); gap.className = 'gv-gap'; gv.appendChild(gap);
    }

    if (mustVoters.length === 1) {
      const f = document.createElement('span'); f.className = 'gv-fire'; f.textContent = '🔥'; gv.appendChild(f);
      const n = document.createElement('span'); n.className = 'gv-name'; n.textContent = fName(mustVoters[0]); gv.appendChild(n);
    } else {
      mustVoters.forEach(() => { const f = document.createElement('span'); f.className = 'gv-fire'; f.textContent = '🔥'; gv.appendChild(f); });
    }

    return gv;
  }

  async function refreshGroupVotes() {
    try {
      const { perArtist } = await api.allVotes(groupId);
      perArtistRaw = perArtist || {};
    } catch (e) {
      console.error('refreshGroupVotes', e);
    }
  }

  function showArtistPopup(artistId, artistName) {
    const votes = perArtistRaw[artistId] || [];
    const musts = votes.filter(v => v.score === 3);
    const wants = votes.filter(v => v.score === 1);

    const memberRow = (v) => h('div.picks-member', [
      h('span.chip-avatar', initials(v.displayName)),
      h('span', v.displayName),
      v.key === member.key ? h('span.chip-you', '(you)') : null,
    ]);

    const sections = [];
    if (musts.length) {
      sections.push(h('div.picks-section', [
        h('div.picks-section-head', '🔥 Must See'),
        ...musts.map(memberRow),
      ]));
    }
    if (wants.length) {
      const checkSvg = svgMark('mark-check', 'mark-check');
      checkSvg.style.cssText = 'width:12px;height:12px;opacity:1;position:static;transform:none;flex-shrink:0;vertical-align:middle;';
      sections.push(h('div.picks-section', [
        h('div.picks-section-head', { style: { display: 'flex', alignItems: 'center', gap: '4px' } }, [checkSvg, 'Want']),
        ...wants.map(memberRow),
      ]));
    }

    const popup = h('div.picks-popup', { onClick: (e) => e.stopPropagation() }, [
      h('div.picks-artist', artistName),
      ...(sections.length ? sections : [h('div.picks-empty', 'No group picks yet')]),
    ]);

    const backdrop = h('div.picks-backdrop', { onClick: () => backdrop.remove() }, [popup]);
    document.body.appendChild(backdrop);

    const onKey = (e) => { if (e.key === 'Escape') { backdrop.remove(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  }

  function renderHeader() {
    if (editingHeader) {
      const groupInput = h('input', {
        type: 'text',
        value: groupName,
        maxlength: 64,
        style: { fontSize: '0.88rem', padding: '6px 10px', width: '100%' },
        placeholder: 'Group name',
      });
      const nameInput = h('input', {
        type: 'text',
        value: memberDisplayName,
        maxlength: 64,
        style: { fontSize: '0.88rem', padding: '6px 10px', width: '100%' },
        placeholder: 'Your name',
      });
      const saveBtn = h('button.btn', {
        onClick: async () => {
          const newGroup = groupInput.value.trim() || groupName;
          const newName  = nameInput.value.trim()  || memberDisplayName;

          // Stash previous values for rollback
          const prevGroup = groupName;
          const prevName  = memberDisplayName;

          // Optimistic update — render immediately with new values
          groupName          = newGroup;
          memberDisplayName  = newName;
          editingHeader      = false;
          removingMember     = null;
          setIdentity(groupId, { ...member, displayName: newName });
          render();

          try {
            await Promise.all([
              newGroup !== prevGroup ? api.updateGroup(groupId, newGroup) : Promise.resolve(),
              newName  !== prevName  ? api.updateMember(groupId, member.key, newName) : Promise.resolve(),
            ]);
          } catch (e) {
            // Revert on failure
            groupName         = prevGroup;
            memberDisplayName = prevName;
            setIdentity(groupId, { ...member, displayName: prevName });
            toast(`Couldn\u2019t save: ${e.message}`);
            render();
          }
        },
      }, 'Save');
      const cancelBtn = h('button.btn.ghost', {
        onClick: () => { editingHeader = false; removingMember = null; render(); },
      }, 'Cancel');

      const badgeEdit = h('button.profile-badge', {
        onClick: () => { editingHeader = false; removingMember = null; render(); },
        title: 'Close',
      }, [
        h('span.profile-avatar', initials(memberDisplayName)),
        h('span.profile-name', memberDisplayName),
        chevronSvg(),
      ]);

      const brandRow = h('div.brand', [
        h('div.brand-logo', 'BottleRock'),
        h('div', { style: { flex: 1, minWidth: 0 } }, [
          h('div.brand-title', groupName),
          h('div.brand-sub', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
            `${mutedMembers.length} ${mutedMembers.length === 1 ? 'member' : 'members'}`,
            h('button', {
              style: {
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 'inherit', fontWeight: 600, color: 'var(--ink-soft)',
                textDecoration: 'underline', textDecorationStyle: 'solid',
                textUnderlineOffset: '2px', letterSpacing: '0.03em',
              },
              onClick: () => { editingHeader = false; confirmLeave = false; removingMember = null; render(); },
            }, 'cancel'),
          ]),
        ]),
        badgeEdit,
      ]);

      const labelStyle = { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-soft)' };
      const smallLinkStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.75rem', color: 'var(--ink-soft)', textDecoration: 'underline', textDecorationStyle: 'solid', textUnderlineOffset: '2px' };
      const dimLinkStyle = { ...smallLinkStyle, color: 'var(--ink-dim)' };

      const memberRows = mutedMembers.map(m => {
        const isYou = m.key === member.key;
        const avatarEl = h('span.chip-avatar', { style: isYou ? { background: 'var(--btn-primary)', color: '#fff' } : {} }, initials(m.displayName));
        const nameEl = h('span', {
          style: { flex: 1, fontSize: '0.82rem', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        }, [m.displayName, isYou ? h('span.chip-you', ' (you)') : null]);

        if (removingMember === m.key) {
          if (isYou) {
            const doLeave = async (keepVotes) => {
              try { await api.leaveGroup(groupId, member.key, { keepVotes }); } catch {}
              clearIdentity(groupId);
              onLeave?.();
            };
            return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(180,40,40,0.05)', border: '1px solid rgba(180,40,40,0.2)' } }, [
              h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [avatarEl, nameEl]),
              h('div', { style: { fontWeight: 700, fontSize: '0.85rem', color: '#b42828' } }, '\u26a0\ufe0f Caution\u2014you\u2019re removing yourself!'),
              h('p', { style: { margin: 0, fontSize: '0.8rem', color: 'var(--ink-soft)', lineHeight: 1.55 } },
                'Your picks will be deleted and you\u2019ll leave the group. Everyone else\u2019s choices and the group itself will remain.'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' } }, [
                h('button.btn.danger.small', { onClick: () => doLeave(false) }, 'Leave & delete my picks'),
                h('button', { style: smallLinkStyle, onClick: () => doLeave(true) }, 'Leave but keep my picks'),
                h('button', { style: dimLinkStyle, onClick: () => { removingMember = null; render(); } }, 'Never mind'),
              ]),
            ]);
          }

          return h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
            avatarEl,
            nameEl,
            h('button.btn.danger.small', {
              onClick: async () => {
                try {
                  await api.leaveGroup(groupId, m.key, { keepVotes: false });
                  mutedMembers = mutedMembers.filter(mm => mm.key !== m.key);
                } catch (e) {
                  toast(`Couldn\u2019t remove: ${e.message}`);
                }
                removingMember = null;
                render();
              },
            }, 'Remove'),
            h('button', { style: dimLinkStyle, onClick: () => { removingMember = null; render(); } }, 'cancel'),
          ]);
        }

        return h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
          avatarEl,
          nameEl,
          h('button', {
            style: { background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-soft)', flexShrink: 0, textDecoration: 'underline', textDecorationStyle: 'solid', textUnderlineOffset: '2px', letterSpacing: '0.03em' },
            onClick: () => { removingMember = m.key; render(); },
          }, 'remove'),
        ]);
      });

      const membersSection = mutedMembers.length ? h('div', {
        style: { display: 'grid', gap: '8px', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid var(--rule)' },
      }, [
        h('label', { style: labelStyle }, 'Members'),
        ...memberRows,
      ]) : null;

      return h('div', [
        brandRow,
        h('div', { style: { display: 'grid', gap: '6px', padding: '10px 0 4px' } }, [
          h('label', { style: labelStyle }, 'Group name'),
          groupInput,
          h('label', { style: { ...labelStyle, marginTop: '2px' } }, 'Your name'),
          nameInput,
          membersSection,
          h('div', { style: { display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--rule)' } }, [
            saveBtn,
            cancelBtn,
          ]),
        ]),
      ]);
    }

    const memberCount = mutedMembers.length;

    const profileBadge = h('button.profile-badge', {
      onClick: () => { editingHeader = true; render(); },
      title: 'Edit your name & crew',
    }, [
      h('span.profile-avatar', initials(memberDisplayName)),
      h('span.profile-name', memberDisplayName),
      chevronSvg(),
    ]);

    return h('div.brand', [
      h('div.brand-logo', 'BottleRock'),
      h('div', { style: { flex: 1, minWidth: 0 } }, [
        h('div.brand-title', groupName),
        h('div.brand-sub', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, [
          `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`,
          h('span', { style: { color: 'var(--ink-dim)', userSelect: 'none' } }, '\u00b7'),
          h('button', {
            style: {
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 'inherit', fontWeight: 600, color: 'var(--ink-soft)',
              textDecoration: 'underline', textDecorationStyle: 'solid',
              textUnderlineOffset: '2px', letterSpacing: '0.03em',
            },
            onClick: () => { editingHeader = true; render(); },
          }, 'edit'),
        ]),
      ]),
      profileBadge,
    ]);
  }

  function renderShare() {
    const url = `${location.origin}/${groupId}`;
    const input = h('input', { type: 'text', readonly: true, value: url });
    const copy = h('button.btn.secondary', {
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          input.select();
          document.execCommand && document.execCommand('copy');
        }
        copy.textContent = 'Copied!';
        copy.classList.remove('secondary');
        setTimeout(() => {
          copy.textContent = 'Copy invite link';
          copy.classList.add('secondary');
        }, 1800);
      },
    }, 'Copy invite link');
    return h('div.card.stack.share-card', [
      h('div', { style: { fontWeight: 700, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.06em' } }, 'Invite your crew'),
      h('div.share-row', [input, copy]),
      mutedMembers.length
        ? h(
            'div.members',
            mutedMembers.map((m) => {
              const isYou = m.key === member.key;
              return h(`span.member-chip${isYou ? '.you' : ''}`, [
                h('span.chip-avatar', initials(m.displayName)),
                m.displayName,
                isYou ? h('span.chip-you', '(you)') : null,
              ]);
            }),
          )
        : null,
    ]);
  }


  function renderLegend() {
    const legendCheck = svgMark('mark-check', 'mark-check');
    legendCheck.style.cssText = 'width:14px;height:14px;opacity:1;position:static;transform:none;flex-shrink:0;';

    // Want pill — yellow brushstroke. Use a fixed seed so the legend always
    // looks the same regardless of the DETERMINISTIC_HIGHLIGHTS setting.
    const wantWash = makeWashSvg('legend-want');
    const wantPill = h('span.pill.want.pill-highlighted', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px', position: 'relative', overflow: 'visible', marginLeft: '-8px' } }, [
      wantWash,
      legendCheck,
      'Want',
    ]);

    // Must See pill — red brushstroke.
    const mustWash = makeWashSvg('legend-must');
    const mustPill = h('span.pill.must.pill-highlighted', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px', position: 'relative', overflow: 'visible' } }, [
      mustWash,
      '🔥 Must See',
    ]);

    const ns = 'http://www.w3.org/2000/svg';
    const infoSvg = document.createElementNS(ns, 'svg');
    infoSvg.setAttribute('viewBox', '0 0 24 24');
    infoSvg.setAttribute('fill', 'none');
    infoSvg.setAttribute('stroke', 'currentColor');
    infoSvg.setAttribute('stroke-width', '2');
    infoSvg.setAttribute('stroke-linecap', 'round');
    infoSvg.setAttribute('stroke-linejoin', 'round');
    infoSvg.style.cssText = 'width:13px;height:13px;flex-shrink:0;vertical-align:middle;';
    infoSvg.innerHTML = '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>';

    const infoHint = h('span', {
      style: {
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        fontSize: '0.85rem', color: 'var(--ink-soft)',
        fontWeight: 600, marginLeft: 'auto', whiteSpace: 'nowrap',
      },
    }, ['Long press a show \u2192 see who\u2019s in']);
    infoHint.prepend(infoSvg);

    return h('div.legend', [
      h('span', { style: { marginRight: 4 } }, 'Tap to cycle:'),
      h('span.pill', 'Skip'),
      wantPill,
      mustPill,
      infoHint,
    ]);
  }

  function renderScheduleGrid(day) {
    const daySets = SCHEDULE.filter((s) => s.dayId === day.id);

    // Day heading
    const heading = h('div.day-heading', [
      h('span.day-name', day.name),
      h('span.day-date', `May ${dayDateFormatted(day.date)}`),
    ]);

    // Build the CSS grid element
    const grid = document.createElement('div');
    grid.className = 'schedule-grid';

    // Stage headers (row 1, cols 2-5)
    const stageHeaderLabels = {
      prudential: 'Prudential Stage',
      tmobile: 'T-Mobile Stage',
      hellofresh: 'HelloFresh Stage',
      northbay: 'NorthBay Health Stage',
    };
    STAGES.forEach((stage, i) => {
      const hdr = document.createElement('div');
      hdr.className = 'stage-header';
      hdr.setAttribute('data-stage', stage.id);
      hdr.style.gridColumn = String(i + 2);
      hdr.style.gridRow = '1';
      hdr.textContent = stageHeaderLabels[stage.id];
      grid.appendChild(hdr);
    });

    // Time axis labels — every 4 slots (hourly), plus final "10 PM"
    for (let slot = 0; slot <= TOTAL_SLOTS; slot += 4) {
      const label = document.createElement('div');
      label.className = 'time-label';
      label.style.gridColumn = '1';
      // row 1 is headers; grid rows start at 2 for slots
      label.style.gridRow = String(slot + 2);
      label.textContent = timeAxisLabel(slot);
      grid.appendChild(label);
    }

    // Show blocks
    for (const s of daySets) {
      const col = STAGE_COL[s.stageId];
      if (!col) continue;

      const startSlot = minToSlot(Math.max(s.startMin, GRID_START_MIN));
      const endSlot   = minToSlot(Math.min(s.endMin, GRID_END_MIN));
      if (startSlot >= TOTAL_SLOTS || endSlot <= 0) continue;

      const cur = myVotes[s.id] || 0;
      const block = document.createElement('button');
      block.className = `show-block ${scoreClass(cur)}`;
      block.setAttribute('data-stage', s.stageId);
      block.setAttribute('data-id', s.id);
      block.style.gridColumn = String(col);
      // +2 because row 1 = headers, row 2 = slot 0
      block.style.gridRow = `${startSlot + 2} / ${endSlot + 2}`;

      const artistName = document.createElement('span');
      artistName.className = 'artist-name';
      artistName.textContent = s.artist;

      const showTime = document.createElement('span');
      showTime.className = 'show-time';
      showTime.textContent = `${fmtTimeShort(s.start)}–${fmtTimeShort(s.end)}`;

      const wash = makeWashSvg(s.id);

      block.appendChild(artistName);
      block.appendChild(showTime);
      block.appendChild(wash);

      const gv = buildGroupVotesEl(s.id);
      if (gv) block.appendChild(gv);

      // Long-press to show crew picks
      let longPressTimer = null;
      let longPressFired = false;
      const cancelLongPress = () => { clearTimeout(longPressTimer); longPressTimer = null; };
      block.addEventListener('pointerdown', () => {
        longPressFired = false;
        longPressTimer = setTimeout(() => {
          longPressFired = true;
          showArtistPopup(s.id, s.artist);
        }, 500);
      });
      block.addEventListener('pointermove', cancelLongPress);
      block.addEventListener('pointerup', cancelLongPress);
      block.addEventListener('pointercancel', cancelLongPress);
      block.addEventListener('contextmenu', (e) => e.preventDefault());

      block.addEventListener('click', async () => {
        if (longPressFired) { longPressFired = false; return; }
        const prev = myVotes[s.id] || 0;
        const next = nextScore(prev);
        myVotes[s.id] = next;
        block.className = `show-block ${scoreClass(next)}`;
        const oldGv = block.querySelector('.group-votes');
        if (oldGv) oldGv.remove();
        const newGv = buildGroupVotesEl(s.id);
        if (newGv) block.appendChild(newGv);
        // In random mode, swap in a freshly generated wash on every toggle
        if (!DETERMINISTIC_HIGHLIGHTS) {
          const oldWash = block.querySelector('.wash');
          const newWash = makeWashSvg(s.id);
          if (oldWash) block.replaceChild(newWash, oldWash);
        }
        try {
          await api.setVote(groupId, member.key, s.id, next);
        } catch (e) {
          myVotes[s.id] = prev;
          block.className = `show-block ${scoreClass(prev)}`;
          const rbGv = block.querySelector('.group-votes');
          if (rbGv) rbGv.remove();
          const rbNewGv = buildGroupVotesEl(s.id);
          if (rbNewGv) block.appendChild(rbNewGv);
          toast(`Save failed: ${e.message}`);
        }
      });

      grid.appendChild(block);
    }

    return h('div', { 'data-day': day.id }, [heading, h('div.schedule-wrap', [grid])]);
  }

  const LAST_DAY_KEY = `brsp.lastDay.${groupId}`;
  let dayObserver = null;
  let scrolledToSavedDay = false;

  function setupDayObserver() {
    if (dayObserver) dayObserver.disconnect();
    dayObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          localStorage.setItem(LAST_DAY_KEY, entry.target.dataset.day);
        }
      }
    }, { rootMargin: '-20% 0px -70% 0px' });
    body.querySelectorAll('[data-day]').forEach((el) => dayObserver.observe(el));
  }

  function renderNamePrompt() {
    const autoName = memberDisplayName;
    let nameInput;

    const dismiss = async (chosenName) => {
      showNamePrompt = false;
      if (chosenName && chosenName !== autoName) {
        try {
          await api.updateMember(groupId, member.key, chosenName);
          memberDisplayName = chosenName;
          setIdentity(groupId, { ...member, displayName: chosenName });
        } catch { /* keep auto name on error */ }
      }
      render();
    };

    nameInput = h('input', {
      type: 'text',
      placeholder: autoName,
      maxlength: 64,
      autofocus: true,
      style: { fontSize: '1rem' },
      onKeydown: (e) => { if (e.key === 'Enter') dismiss(nameInput.value.trim() || autoName); },
    });

    const goBtn = h('button.btn', {
      onClick: () => dismiss(nameInput.value.trim() || autoName),
    }, "Let's go");

    const skipLink = h('span', {
      style: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--ink-soft)' },
    }, [
      h('button', {
        style: {
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit',
          textDecoration: 'underline', textDecorationStyle: 'solid',
          textUnderlineOffset: '2px',
        },
        onClick: () => dismiss(null),
      }, 'Skip'),
      ` \u2014 use a random name`,
    ]);

    const card = h('div.name-prompt-card', [
      h('div', { style: { fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.3rem', color: 'var(--ink-soft)', letterSpacing: '0.01em', lineHeight: 1.2 } }, 'Plan the BottleRock lineup with your crew \u2014 mark your must-sees, see where everyone lands.'),
      h('div', { style: { borderTop: '1px solid rgba(36,103,177,0.12)', margin: '4px 0' } }),
      h('div', { style: { fontWeight: 800, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, "What\u2019s your name?"),
      h('p', { style: { margin: 0, fontSize: '0.88rem', color: 'var(--ink-soft)' } }, 'Your crew will see this next to your picks.'),
      nameInput,
      goBtn,
      h('div', { style: { textAlign: 'center' } }, skipLink),
    ]);

    return h('div.name-prompt-backdrop', { onClick: (e) => { if (e.target === e.currentTarget) dismiss(null); } }, [card]);
  }

  function render() {
    toolbar.replaceChildren(renderHeader());
    body.replaceChildren(
      ...(editingHeader ? [] : [renderShare()]),
      renderLegend(),
      ...DAYS.map((day) => renderScheduleGrid(day)),
    );

    // Name prompt modal — rendered into root so it sits above toolbar + body
    const existing = root.querySelector('.name-prompt-backdrop');
    if (showNamePrompt && !existing) {
      root.appendChild(renderNamePrompt());
    } else if (!showNamePrompt && existing) {
      existing.remove();
    }

    // Populate group-vote indicators from cached data without a WS round-trip
    syncGroupVotesEls();

    if (!scrolledToSavedDay) {
      scrolledToSavedDay = true;
      const savedDay = localStorage.getItem(LAST_DAY_KEY);
      if (savedDay && savedDay !== DAYS[0].id) {
        requestAnimationFrame(() => {
          const el = body.querySelector(`[data-day="${savedDay}"]`);
          if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
        });
      }
    }
  }

  // ─── WebSocket: live group vote sync ───────────────────────────────────────
  let ws = null;
  let wsReconnectTimer = null;

  // Surgically update only the .group-votes child inside each visible show
  // block. The wash SVG and everything else in the block are untouched — so
  // a teammate's vote never triggers a brushstroke re-render on your screen.
  function syncGroupVotesEls() {
    for (const block of body.querySelectorAll('.show-block[data-id]')) {
      const artistId = block.dataset.id;
      const existing = block.querySelector('.group-votes');
      const fresh = buildGroupVotesEl(artistId);

      if (existing && fresh)  { existing.replaceWith(fresh); }
      else if (existing)      { existing.remove(); }
      else if (fresh) {
        // Insert before the wash SVG so it stays below the highlight overlay
        const wash = block.querySelector('.wash');
        wash ? block.insertBefore(fresh, wash) : block.appendChild(fresh);
      }
    }
  }

  function applyGroupUpdate() {
    // Update group-vote indicators on every visible block (surgical, no DOM rebuild)
    syncGroupVotesEls();

    // Toolbar: member count
    toolbar.replaceChildren(renderHeader());

    // Share card member chips (if visible)
    if (!editingHeader) {
      const existing = body.querySelector('.share-card');
      if (existing) existing.replaceWith(renderShare());
    }

    // Refresh any open long-press popup with the new vote data
    const backdrop = document.querySelector('.picks-backdrop');
    if (backdrop) {
      const artistEl = backdrop.querySelector('.picks-artist');
      if (artistEl) {
        const artistName = artistEl.textContent;
        const found = SCHEDULE.find(x => x.artist === artistName);
        if (found) { backdrop.remove(); showArtistPopup(found.id, found.artist); }
      }
    }
  }

  function connectWs() {
    clearTimeout(wsReconnectTimer);
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws?group=${groupId}`);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'votes') {
          if (msg.members) mutedMembers = msg.members;
          if (msg.perArtist) perArtistRaw = msg.perArtist;
          applyGroupUpdate(); // surgical update — never rebuilds the grid
        }
      } catch { /* ignore malformed messages */ }
    };

    ws.onclose = () => {
      // Reconnect with backoff — keeps working after Fly machine restarts
      wsReconnectTimer = setTimeout(connectWs, 3000);
    };

    ws.onerror = () => ws.close();
  }

  function disconnectWs() {
    clearTimeout(wsReconnectTimer);
    ws?.close();
    ws = null;
  }

  // Clean up when the user navigates away or the component is replaced.
  window.addEventListener('pagehide', disconnectWs, { once: true });

  (async () => {
    render();
    // Fetch my votes over HTTP (private — not in the WS broadcast).
    // Group votes arrive via WS immediately after connection.
    await refreshMyVotes();
    render();
    connectWs();
    setupDayObserver();
  })();

  return root;
}
