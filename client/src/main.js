import { h, mount } from './dom.js';
import { api } from './api.js';
import { getIdentity, setIdentity } from './storage.js';
import { landingView } from './views/landing.js';
import { joinView } from './views/join.js';
import { groupView } from './views/group.js';

const root = document.getElementById('app');

function navigate(path, { replace = false } = {}) {
  if (replace) history.replaceState({}, '', path);
  else history.pushState({}, '', path);
  route();
}

window.addEventListener('popstate', () => route());

function loading(msg = 'Loading…') {
  return h('div.app', [h('div.card.center.muted', msg)]);
}

function errorCard(msg, { retry } = {}) {
  return h('div.app', [
    h('div.card.stack', [
      h('h3', { style: { margin: 0 } }, 'Something went wrong'),
      h('p.muted', { style: { margin: 0 } }, msg),
      retry ? h('button.btn.secondary', { onClick: retry }, 'Try again') : null,
      h('a.btn.ghost', { href: '/', onClick: (e) => { e.preventDefault(); navigate('/'); } }, 'Back to home'),
    ]),
  ]);
}

async function route() {
  const path = location.pathname;

  if (path === '/' || path === '') {
    mount(
      root,
      landingView({
        onCreated: (group) => navigate(`/g/${group.id}`),
      }),
    );
    return;
  }

  const m = path.match(/^\/g\/([^/]+)\/?$/);
  if (m) {
    const groupId = m[1];
    mount(root, loading());
    let groupMeta;
    try {
      groupMeta = await api.getGroup(groupId);
    } catch (e) {
      if (e.status === 404) {
        mount(
          root,
          errorCard(
            'That group link looks expired or invalid. Groups are kept for ~90 days from last activity.',
          ),
        );
      } else {
        mount(root, errorCard(e.message, { retry: route }));
      }
      return;
    }

    const identity = getIdentity(groupId);
    if (identity) {
      // Verify the member still exists on the server. If not (e.g. group
      // evicted and recreated), reset and re-prompt for name.
      const stillMember = groupMeta.members?.some((mm) => mm.key === identity.key);
      if (stillMember) {
        mount(root, groupView({ groupId, member: identity, groupMeta }));
        return;
      }
    }

    mount(
      root,
      joinView({
        groupId,
        groupMeta,
        onJoined: async (member) => {
          setIdentity(groupId, member);
          // Refresh meta so member list includes the new user.
          try {
            groupMeta = await api.getGroup(groupId);
          } catch {}
          mount(root, groupView({ groupId, member, groupMeta }));
        },
      }),
    );
    return;
  }

  mount(
    root,
    errorCard('Page not found.'),
  );
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
