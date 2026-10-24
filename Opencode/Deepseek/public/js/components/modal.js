import { h, mount } from '../dom.js';
import { api } from '../api.js';
import { setUser } from '../state.js';
import { toast } from './toast.js';
import { sfx } from '../sfx.js';

let escHandler = null;

export function closeModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = '';
  document.body.style.overflow = '';
  if (escHandler) {
    document.removeEventListener('keydown', escHandler);
    escHandler = null;
  }
}

export function openModal(contentEl, { onClose } = {}) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  const backdrop = h('div', { class: 'modal-backdrop' }, contentEl);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) {
      closeModal();
      onClose?.();
    }
  });
  escHandler = (event) => {
    if (event.key === 'Escape') {
      closeModal();
      onClose?.();
    }
  };
  document.addEventListener('keydown', escHandler);
  mount(root, backdrop);
  document.body.style.overflow = 'hidden';
  const focusable = contentEl.querySelector('input, button, [href]');
  focusable?.focus();
  return backdrop;
}

export function openConfirmModal({ title, body, confirmLabel = 'CONFIRM', onConfirm }) {
  const el = h(
    'div',
    { class: 'modal panel', role: 'dialog', 'aria-modal': 'true' },
    h('button', { class: 'modal-close', type: 'button', 'aria-label': 'Close', onclick: () => closeModal() }, '×'),
    h('p', { class: 'kicker warm' }, 'CONFIRM ACTION'),
    h('h2', { style: { fontSize: '20px', marginBottom: '10px' } }, title),
    h('p', { class: 'muted' }, body),
    h(
      'div',
      { class: 'modal-footer' },
      h('button', { class: 'btn btn-ghost btn-small', type: 'button', onclick: () => closeModal() }, 'CANCEL'),
      h(
        'button',
        {
          class: 'btn btn-danger btn-small',
          type: 'button',
          onclick: () => {
            closeModal();
            onConfirm?.();
          }
        },
        confirmLabel
      )
    )
  );
  openModal(el);
}

export function openAuthModal({ tab = 'login', message, onSuccess } = {}) {
  let mode = tab;

  const error = h('p', { class: 'form-error' });

  const usernameInput = h('input', {
    type: 'text',
    name: 'username',
    autocomplete: 'username',
    placeholder: 'PLAYER_NAME',
    maxlength: '16',
    required: true
  });
  const passwordInput = h('input', {
    type: 'password',
    name: 'password',
    autocomplete: 'current-password',
    placeholder: '••••••••',
    maxlength: '200',
    required: true
  });

  const submitBtn = h('button', { class: 'btn btn-primary', type: 'submit' }, 'ESTABLISH LINK');

  const loginTab = h('button', { class: 'auth-tab', type: 'button' }, 'SIGN IN');
  const registerTab = h('button', { class: 'auth-tab', type: 'button' }, 'CREATE ACCOUNT');

  function applyMode(next) {
    mode = next;
    loginTab.classList.toggle('active', mode === 'login');
    registerTab.classList.toggle('active', mode === 'register');
    submitBtn.textContent = mode === 'login' ? 'ESTABLISH LINK' : 'CREATE & LINK';
    passwordInput.setAttribute('autocomplete', mode === 'login' ? 'current-password' : 'new-password');
    error.textContent = '';
  }

  loginTab.addEventListener('click', () => applyMode('login'));
  registerTab.addEventListener('click', () => applyMode('register'));

  const form = h(
    'form',
    {
      novalidate: true,
      onsubmit: async (event) => {
        event.preventDefault();
        error.textContent = '';
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) {
          error.textContent = '> handle and password required';
          sfx.error();
          return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'LINKING...';
        try {
          const data =
            mode === 'login' ? await api.login(username, password) : await api.register(username, password);
          setUser(data.user);
          sfx.coin();
          toast(`Linked. Welcome, ${data.user.username}.`, 'info');
          closeModal();
          onSuccess?.(data.user);
        } catch (err) {
          error.textContent = `> ${err.message}`;
          sfx.error();
        } finally {
          submitBtn.disabled = false;
          applyMode(mode);
        }
      }
    },
    h('div', { class: 'field' }, h('label', { for: 'auth-username' }, 'HANDLE'), usernameInput),
    h('div', { class: 'field' }, h('label', { for: 'auth-password' }, 'PASSWORD'), passwordInput),
    error,
    h('div', { style: { display: 'grid' } }, submitBtn)
  );
  usernameInput.id = 'auth-username';
  passwordInput.id = 'auth-password';

  const el = h(
    'div',
    { class: 'modal panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Sign in or create account' },
    h('button', { class: 'modal-close', type: 'button', 'aria-label': 'Close', onclick: () => closeModal() }, '×'),
    h('p', { class: 'kicker' }, 'OPTIONAL LINK'),
    h('h2', { style: { fontSize: '21px', marginBottom: '6px' } }, 'Keep an archive of your scans.'),
    h(
      'p',
      { class: 'muted', style: { fontSize: '14px', marginBottom: '20px' } },
      message || 'Accounts are optional — the scan and full results stay free forever. Linking adds saved history, retake comparisons and a permanent archive.'
    ),
    h('div', { class: 'auth-tabs' }, loginTab, registerTab),
    form,
    h(
      'p',
      { class: 'modal-note' },
      'Demo archive available: ',
      h('code', {}, 'PLAYER1'),
      ' / ',
      h('code', {}, 'arcade123'),
      ' — try it to see history + comparisons.'
    ),
    h(
      'div',
      { class: 'modal-footer' },
      h(
        'button',
        {
          class: 'link-btn',
          type: 'button',
          onclick: () => {
            closeModal();
          }
        },
        'CONTINUE WITHOUT AN ACCOUNT →'
      )
    )
  );

  applyMode(mode);
  openModal(el);
  setTimeout(() => usernameInput.focus(), 60);
}
