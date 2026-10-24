import { h } from '../dom.js';

export function toast(message, kind = 'info', ms = 3600) {
  const root = document.getElementById('toast-root');
  if (!root) return () => {};
  const el = h('div', { class: `toast ${kind === 'info' ? '' : kind}` }, message);
  root.append(el);
  const timer = setTimeout(() => dismiss(), ms);
  function dismiss() {
    clearTimeout(timer);
    el.style.transition = 'opacity .28s ease, transform .28s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => el.remove(), 300);
  }
  el.addEventListener('click', dismiss);
  return dismiss;
}
