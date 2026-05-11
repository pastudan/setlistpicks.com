import { h } from '../dom.js';
import { api } from '../api.js';

export function landingView({ onCreated }) {
  let nameInput;
  let creating = false;
  const btn = h(
    'button.btn',
    {
      onClick: async () => {
        if (creating) return;
        creating = true;
        btn.setAttribute('disabled', '');
        btn.textContent = 'Creating…';
        try {
          const groupName = nameInput.value.trim();
          const group = await api.createGroup(groupName);
          onCreated(group);
        } catch (e) {
          alert(`Could not create group: ${e.message}`);
          creating = false;
          btn.removeAttribute('disabled');
          btn.textContent = 'Create group';
        }
      },
    },
    'Create group',
  );

  nameInput = h('input', { type: 'text', placeholder: 'Optional: name your crew (e.g. "Napa Squad")', maxlength: 64 });

  return h('div.app', [
    h('div.brand', [
      h('div', { style: { fontSize: '1.8rem' } }, '🎸'),
      h('div', [
        h('div.brand-title', 'BottleRock Setlist Picks'),
        h('div.brand-sub', 'Napa Valley · May 22–24, 2026'),
      ]),
    ]),
    h('div.card.stack', [
      h('h2', { style: { margin: 0 } }, 'Plan the festival with your crew'),
      h(
        'p.muted',
        { style: { margin: 0 } },
        'Create a group, share one link, everyone rates the artists they want to see, and you’ll see exactly where the crew is leaning at every conflicting time slot.',
      ),
      nameInput,
      btn,
      h('div.hint', 'Groups are kept for ~90 days. No accounts, no passwords.'),
    ]),
    h('div.card', [
      h('h3', { style: { marginTop: 0 } }, 'How it works'),
      h('ol.muted', { style: { margin: 0, paddingLeft: '20px', lineHeight: 1.6 } }, [
        h('li', 'Create a group and share the invite link with friends.'),
        h('li', 'Each person sets their name once (saved on their device).'),
        h('li', 'Tap each artist to cycle Skip → 👍 Want → 🔥 Must See.'),
        h('li', 'The Group tab shows everyone’s aggregated picks, so conflicts (Lorde vs Lil Wayne, anyone?) are obvious.'),
      ]),
    ]),
  ]);
}
