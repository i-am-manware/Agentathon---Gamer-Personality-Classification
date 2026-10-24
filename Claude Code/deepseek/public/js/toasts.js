/**
 * SPAWNPOINT — toasts.
 */

import { el, mount } from './dom.js';

const root = () => document.getElementById('toasts');
const live = [];

function dismiss(node) {
  const i = live.indexOf(node);
  if (i >= 0) live.splice(i, 1);
  node.style.transition = 'opacity .18s, transform .18s';
  node.style.opacity = '0';
  node.style.transform = 'translateY(8px)';
  setTimeout(() => node.remove(), 200);
}

export function toast(message, { kind = 'info', ms = 3600, action } = {}) {
  const host = root();
  if (!host) return () => {};

  const node = el(`div.toast.toast--${kind}`, { role: 'status' }, [
    el('span', message),
    action
      ? el('button.btn.btn--ghost.btn--sm', {
          type: 'button',
          style: { marginLeft: '0.7rem' },
          onclick: () => {
            action.onClick?.();
            dismiss(node);
          },
        }, action.label)
      : null,
  ]);

  // Never let the stack grow unbounded.
  while (live.length >= 3) dismiss(live[0]);

  host.append(node);
  live.push(node);

  const timer = setTimeout(() => dismiss(node), ms);
  node.addEventListener('click', () => clearTimeout(timer));

  return () => {
    clearTimeout(timer);
    dismiss(node);
  };
}

export const toastOk = (m, o) => toast(m, { kind: 'ok', ...o });
export const toastErr = (m, o) => toast(m, { kind: 'err', ms: 5200, ...o });
export const toastInfo = (m, o) => toast(m, { kind: 'info', ...o });

/** Copy text, with the clipboard API and a textarea fallback for http origins. */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = el('textarea', { style: { position: 'fixed', opacity: '0', top: '-1000px' } });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function clearToasts() {
  mount(root() ?? document.createElement('div'));
  live.length = 0;
}
