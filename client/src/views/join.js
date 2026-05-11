import { h } from '../dom.js';
import { api } from '../api.js';

export function joinView({ groupId, groupMeta, onJoined }) {
  let input;
  let btn;
  let joining = false;

  const submit = async () => {
    const name = input.value.trim();
    if (!name || joining) return;
    joining = true;
    btn.setAttribute('disabled', '');
    btn.textContent = 'Joining…';
    try {
      const { member } = await api.join(groupId, name);
      onJoined(member);
    } catch (e) {
      alert(`Could not join: ${e.message}`);
      joining = false;
      btn.removeAttribute('disabled');
      btn.textContent = 'Join group';
    }
  };

  input = h('input', {
    type: 'text',
    placeholder: 'Your name (e.g. Dan)',
    maxlength: 64,
    autofocus: true,
    onKeydown: (e) => {
      if (e.key === 'Enter') submit();
    },
  });
  btn = h('button.btn', { onClick: submit }, 'Join group');

  const headline = groupMeta?.name
    ? `Join "${groupMeta.name}"`
    : 'Join the group';
  const memberCount = groupMeta?.members?.length || 0;
  const sub = memberCount
    ? `${memberCount} ${memberCount === 1 ? 'person has' : 'people have'} joined so far`
    : 'You’re the first one here — invite the crew!';

  return h('div.app', [
    h('div.brand', [
      h('div', { style: { fontSize: '1.8rem' } }, '🎸'),
      h('div', [
        h('div.brand-title', headline),
        h('div.brand-sub', sub),
      ]),
    ]),
    h('div.card.stack', [
      h(
        'p',
        { style: { margin: 0 } },
        'Set the name your friends know you by. Capitalization doesn’t matter — we’ll dedupe "Dan" and "dan" as the same person.',
      ),
      input,
      btn,
      h('div.hint', 'Your name is saved on this device only, per group.'),
    ]),
  ]);
}
