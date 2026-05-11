import { h, mount } from './dom.js';
import { api } from './api.js';
import { getIdentity, setIdentity } from './storage.js';
import { landingView } from './views/landing.js';
import { groupView } from './views/group.js';

const MEMBER_NAMES = [
  'Wild Vine', 'Lucky Barrel', 'Golden Stage', 'Breezy Grape',
  'Mellow Wave', 'Groovy Riff', 'Funky Chord', 'Jazzy Beat',
  'Sunny Note', 'Crispy Sound',
];
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomMemberName() {
  return `${pick(MEMBER_NAMES)} ${Math.floor(10 + Math.random() * 90)}`;
}

const root = document.getElementById('app');

function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  route();
}

window.addEventListener('popstate', () => route());

function loading(msg = 'Loading\u2026') {
  return h('div.app', [
    h('div.brand', [
      h('div.brand-logo', 'BottleRock'),
      h('div', [h('div.brand-title', 'Setlist Picks')]),
    ]),
    h('div.card.center', { style: { padding: '32px 20px', color: 'var(--ink-soft)', fontSize: '0.9rem' } }, msg),
  ]);
}

function errorCard(msg, { retry } = {}) {
  return h('div.app', [
    h('div.brand', [
      h('div.brand-logo', 'BottleRock'),
      h('div', [h('div.brand-title', 'Setlist Picks')]),
    ]),
    h('div.card.stack', [
      h('h3', { style: { margin: 0 } }, 'Something went wrong'),
      h('p', { style: { margin: 0, color: 'var(--ink-soft)' } }, msg),
      retry ? h('button.btn.secondary', { onClick: retry }, 'Try again') : null,
      h('a.btn.ghost', { href: '/', onClick: (e) => { e.preventDefault(); navigate('/'); } }, 'Back to home'),
    ]),
  ]);
}

async function route() {
  const path = location.pathname;

  // Root: auto-create group
  if (path === '/' || path === '') {
    mount(
      root,
      landingView({
        onReady: (group, member) => navigate(`/${group.id}`, { replace: true }),
      }),
    );
    return;
  }

  // Group page
  const m = path.match(/^\/([23456789abcdefghjkmnpqrstuvwxyz]{10})\/?$/);
  if (m) {
    const groupId = m[1];
    mount(root, loading());

    let groupMeta;
    try {
      groupMeta = await api.getGroup(groupId);
    } catch (e) {
      if (e.status === 404) {
        mount(root, errorCard('That group link looks expired or invalid.'));
      } else {
        mount(root, errorCard(e.message, { retry: route }));
      }
      return;
    }

    // Check for existing identity
    let identity = getIdentity(groupId);
    if (identity) {
      const stillMember = groupMeta.members?.some((mm) => mm.key === identity.key);
      if (!stillMember) identity = null;
    }

    // Auto-join with a fun random name if no identity yet
    if (!identity) {
      try {
        const { member } = await api.join(groupId, randomMemberName());
        setIdentity(groupId, member);
        identity = member;
        groupMeta = await api.getGroup(groupId);
      } catch (e) {
        mount(root, errorCard(e.message, { retry: route }));
        return;
      }
    }

    mount(root, groupView({ groupId, member: identity, groupMeta, onLeave: () => navigate('/') }));
    return;
  }

  mount(root, errorCard('Page not found.'));
}

// Intercept same-origin link clicks for SPA navigation.
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:')) return;
  if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  navigate(href);
});

route();
