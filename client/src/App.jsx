import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api.js';
import { getIdentity, setIdentity, getActiveGroup, setActiveGroup, clearActiveGroup } from './storage.js';
import { ensureSvgDefs } from './svgDefs.js';
import GroupView from './views/GroupView.jsx';

const GROUP_NAMES = [
  'Napa Squad', 'The Rosé Riders', 'Vine & Dine Crew', 'Stage Hoppers',
  'The Barrel Roll', 'Crush Crew', 'Valley Vibes', 'Festival Fam',
  'The Lineup Committee', 'Wristband Warriors',
];
const MEMBER_ADJS = ['Wild', 'Lucky', 'Golden', 'Breezy', 'Mellow', 'Groovy', 'Funky', 'Jazzy', 'Sunny', 'Crispy'];
const MEMBER_NOUNS = ['Vine', 'Barrel', 'Stage', 'Grape', 'Wave', 'Riff', 'Chord', 'Beat', 'Note', 'Sound'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomMemberName() { return `${pick(MEMBER_ADJS)} ${pick(MEMBER_NOUNS)} ${Math.floor(10 + Math.random() * 90)}`; }
function randomGroupName() { return pick(GROUP_NAMES); }

const GROUP_ID_RE = /^\/([23456789abcdefghjkmnpqrstuvwxyz]{10})\/?$/;

function getPath() { return location.pathname; }

export default function App() {
  const [path, setPath] = useState(getPath);
  const [groupState, setGroupState] = useState(null); // { groupId, member, groupMeta, freshJoin }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigating = useRef(false);

  // Inject SVG defs once on mount
  useEffect(() => { ensureSvgDefs(); }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (replace) history.replaceState({}, '', to);
    else history.pushState({}, '', to);
    setPath(to);
  }, []);

  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Intercept same-origin link clicks
  useEffect(() => {
    const handler = (e) => {
      const a = e.target.closest?.('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:')) return;
      if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      navigate(href);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [navigate]);

  async function loadGroup(groupId) {
    if (navigating.current) return;
    navigating.current = true;
    setLoading(true);
    setError(null);
    setGroupState(null);

    try {
      let groupMeta = await api.getGroup(groupId);
      let identity = getIdentity(groupId);
      if (identity) {
        const stillMember = groupMeta.members?.some((m) => m.key === identity.key);
        if (!stillMember) identity = null;
      }

      let freshJoin = false;
      if (!identity) {
        const { member } = await api.join(groupId, randomMemberName());
        setIdentity(groupId, member);
        identity = member;
        groupMeta = await api.getGroup(groupId);
        freshJoin = true;
      }

      setActiveGroup(groupId);
      setGroupState({ groupId, member: identity, groupMeta, freshJoin });
    } catch (e) {
      if (e.status === 404) { clearActiveGroup(); setError({ msg: 'That group link looks expired or invalid.', canRetry: true }); }
      else if (e.status === 429) setError({ msg: 'Too many groups or users created from this network. Try again later.', canRetry: false });
      else setError({ msg: e.message, canRetry: true });
    } finally {
      setLoading(false);
      navigating.current = false;
    }
  }

  // Route: / → resume stored group or auto-create a new one
  useEffect(() => {
    if (path !== '/' && path !== '') return;
    if (navigating.current) return;
    navigating.current = true;

    const stored = getActiveGroup();
    if (stored) {
      navigating.current = false;
      navigate(`/${stored}`, { replace: true });
      return;
    }

    (async () => {
      try {
        const group = await api.createGroup(randomGroupName());
        navigating.current = false;
        navigate(`/${group.id}`, { replace: true });
      } catch (e) {
        navigating.current = false;
        if (e.status === 429) setError({ msg: 'Too many groups created from this network. Try again later.', canRetry: false });
        else setError({ msg: e.message, canRetry: true });
      }
    })();
  }, [path, navigate]);

  // Route: /:groupId → load group
  useEffect(() => {
    const m = path.match(GROUP_ID_RE);
    if (!m) return;
    const groupId = m[1];
    if (groupState?.groupId === groupId) return;
    loadGroup(groupId);
  }, [path]); // eslint-disable-line

  // Render
  const m = path.match(GROUP_ID_RE);

  const shell = (children) => (
    <div className="app">
      <div className="brand">
        <div className="brand-logo">BottleRock</div>
        <div><div className="brand-title">Setlist Picks</div></div>
      </div>
      {children}
    </div>
  );

  if (error) {
    return shell(
      <div className="card stack">
        <p style={{ margin: 0 }}>{error.msg}</p>
        {error.canRetry && (
          <button className="btn" onClick={() => { clearActiveGroup(); setError(null); navigate('/'); }}>Start over</button>
        )}
      </div>
    );
  }

  if (loading || (path === '/' || path === '')) {
    return shell(
      <div className="card center" style={{ padding: '40px 20px', color: 'var(--ink-soft)', fontSize: '0.9rem' }}>
        Setting up your crew…
      </div>
    );
  }

  if (m && groupState?.groupId === m[1]) {
    return (
      <GroupView
        key={groupState.groupId}
        groupId={groupState.groupId}
        member={groupState.member}
        groupMeta={groupState.groupMeta}
        freshJoin={groupState.freshJoin}
        onLeave={() => { clearActiveGroup(); navigate('/'); }}
      />
    );
  }

  return null;
}
