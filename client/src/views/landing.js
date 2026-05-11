import { h } from '../dom.js';
import { api } from '../api.js';
import { setIdentity } from '../storage.js';

const GROUP_NAMES = [
  'Napa Squad', 'The Rosé Riders', 'Vine & Dine Crew', 'Stage Hoppers',
  'The Barrel Roll', 'Crush Crew', 'Valley Vibes', 'Festival Fam',
  'The Lineup Committee', 'Wristband Warriors',
];

const MEMBER_NAMES = [
  'Wild Vine', 'Lucky Barrel', 'Golden Stage', 'Breezy Grape',
  'Mellow Wave', 'Groovy Riff', 'Funky Chord', 'Jazzy Beat',
  'Sunny Note', 'Crispy Sound',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomMemberName() {
  return `${pick(MEMBER_NAMES)} ${Math.floor(10 + Math.random() * 90)}`;
}

export function landingView({ onReady }) {
  const wrap = h('div.app', [
    h('div.brand', [
      h('div.brand-logo', 'BottleRock'),
      h('div', [
        h('div.brand-title', 'Setlist Picks'),
        h('div.brand-sub', 'Napa Valley \u00b7 May 22 \u2013 24, 2026'),
      ]),
    ]),
    h('div.card.center', { style: { padding: '40px 20px', color: 'var(--ink-soft)', fontSize: '0.9rem' } }, 'Setting up your crew\u2026'),
  ]);

  (async () => {
    try {
      const group = await api.createGroup(pick(GROUP_NAMES));
      const { member } = await api.join(group.id, randomMemberName());
      setIdentity(group.id, member);
      onReady(group, member);
    } catch (e) {
      wrap.replaceChildren(
        h('div.brand', [
          h('div.brand-logo', 'BottleRock'),
          h('div', [h('div.brand-title', 'Setlist Picks')]),
        ]),
        h('div.card.stack', [
          h('p', { style: { margin: 0 } }, `Couldn\u2019t get started: ${e.message}`),
          h('button.btn', { onClick: () => location.reload() }, 'Try again'),
        ]),
      );
    }
  })();

  return wrap;
}
