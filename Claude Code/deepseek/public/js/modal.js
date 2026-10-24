/**
 * SPAWNPOINT — modal dialog.
 *
 * One modal at a time, focus trapped, restored to the opener on close, Escape
 * to dismiss. `resolve` receives whatever the caller passes to close().
 */

import { el, mount } from './dom.js';

let current = null;

export function isOpen() {
  return current !== null;
}

export function closeModal(value) {
  if (!current) return;
  const { root, opener, onClose, resolve } = current;
  current = null;
  root.hidden = true;
  mount(root);
  document.removeEventListener('keydown', onKey, true);
  if (opener && document.contains(opener)) opener.focus();
  onClose?.(value);
  resolve?.(value);
}

function onKey(e) {
  if (!current) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeModal(undefined);
    return;
  }
  if (e.key !== 'Tab') return;

  const focusables = current.root.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/**
 * @param {(close: (v?: any) => void) => Node} render
 * @param {{ onClose?: Function, labelledBy?: string }} [opts]
 * @returns {Promise<any>}
 */
export function openModal(render, opts = {}) {
  closeModal(undefined);

  const root = document.getElementById('modal-root');
  if (!root) return Promise.resolve(undefined);

  return new Promise((resolve) => {
    const close = (v) => closeModal(v);
    const card = el('div.modal__card', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': opts.labelledBy,
    }, render(close));

    mount(root, card);
    root.hidden = false;
    root.onclick = (e) => {
      if (e.target === root) close(undefined);
    };

    current = { root, opener: document.activeElement, onClose: opts.onClose, resolve };
    document.addEventListener('keydown', onKey, true);

    const target = card.querySelector('[data-autofocus]') || card.querySelector('input') || card.querySelector('button');
    target?.focus();
  });
}

/** Convenience: a yes/no dialog. */
export function confirmModal({ title, body, confirmLabel = 'Confirm', danger = false }) {
  return openModal((close) =>
    el('div', [
      el('div.modal__head', [el('h3', { style: { margin: 0 } }, title)]),
      el('p.muted', { style: { fontSize: '0.9rem' } }, body),
      el('div', { style: { display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.2rem' } }, [
        el('button.btn.btn--ghost', { type: 'button', onclick: () => close(false) }, 'Cancel'),
        el(`button.btn.${danger ? 'btn--danger' : 'btn--primary'}`, { type: 'button', onclick: () => close(true) }, confirmLabel),
      ]),
    ]),
  );
}
