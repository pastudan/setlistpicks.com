// Tiny DOM helper. `h('div.foo#bar', {onClick}, [children])`.
export function h(tag, attrs, children) {
  if (Array.isArray(attrs) || typeof attrs === 'string' || attrs instanceof Node) {
    children = attrs;
    attrs = {};
  }
  let tagName = 'div';
  const classes = [];
  let id;
  if (tag) {
    const m = tag.match(/^([a-zA-Z0-9]*)((?:[.#][^.#]+)*)$/);
    if (!m) throw new Error(`bad tag: ${tag}`);
    if (m[1]) tagName = m[1];
    for (const part of m[2].match(/[.#][^.#]+/g) || []) {
      if (part[0] === '.') classes.push(part.slice(1));
      else id = part.slice(1);
    }
  }
  const el = document.createElement(tagName);
  if (id) el.id = id;
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') {
      el.className = [el.className, v].filter(Boolean).join(' ');
    } else if (k === 'style' && typeof v === 'object') {
      Object.assign(el.style, v);
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'value' && (tagName === 'input' || tagName === 'textarea')) {
      el.value = v;
    } else if (typeof v === 'boolean') {
      if (v) el.setAttribute(k, '');
    } else {
      el.setAttribute(k, v);
    }
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(el, c) {
  if (c == null || c === false) return;
  if (Array.isArray(c)) {
    for (const child of c) appendChildren(el, child);
    return;
  }
  if (c instanceof Node) el.appendChild(c);
  else el.appendChild(document.createTextNode(String(c)));
}

export function mount(root, view) {
  root.replaceChildren(view);
}

let toastTimer;
export function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = h('div.toast');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}
