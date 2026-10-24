// Sign in / create account dialog (native <dialog>).
import { h, toast } from './dom.js';
import { api } from './api.js';
import { session, registerAuth } from './state.js';

const dlg = document.getElementById('auth-dialog');
let resolver = null;

function render(mode, reason) {
  const err = h('div', { class: 'form-err', role: 'alert' });
  const user = h('input', { id: 'au-user', name: 'username', autocomplete: 'username', required: true, minlength: 3, maxlength: 24, pattern: '[A-Za-z0-9_.\\-]+', spellcheck: 'false', autocapitalize: 'off' });
  const pass = h('input', { id: 'au-pass', name: 'password', type: 'password', autocomplete: mode === 'login' ? 'current-password' : 'new-password', required: true, minlength: 8 });
  const submit = h('button', { class: 'btn btn-hot', type: 'submit' }, mode === 'login' ? 'Sign in' : 'Create account', h('span', { class: 'arrow' }, '→'));

  const form = h('form', { class: 'dlg-body', novalidate: true },
    h('p', reason || (mode === 'login'
      ? 'Signing in is optional — it keeps a field log of every run so you can watch yourself drift.'
      : 'Just a username and password. No email, no tracking. Your runs get saved to a private field log.')),
    h('div', { class: 'field' }, h('label', { for: 'au-user' }, 'Username'), user),
    h('div', { class: 'field' }, h('label', { for: 'au-pass' }, 'Password'), pass,
      mode === 'register' ? h('small', { class: 'kicker', style: { textTransform: 'none', letterSpacing: '0' } }, 'At least 8 characters.') : null),
    err,
    h('div', { class: 'dlg-foot' },
      submit,
      mode === 'login'
        ? h('button', { type: 'button', class: 'linkish', onclick: () => { user.value = 'demo'; pass.value = 'playerprint'; form.requestSubmit(); } }, 'Use the demo account')
        : null));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (!user.value.trim() || !pass.value) { err.textContent = 'Fill in both fields.'; return; }
    submit.disabled = true;
    try {
      const r = mode === 'login' ? await api.login(user.value.trim(), pass.value) : await api.register(user.value.trim(), pass.value);
      session.set(r.user);
      toast(mode === 'login' ? `Welcome back, ${r.user.username}.` : `Account created. Hi, ${r.user.username}!`);
      close(r.user);
    } catch (ex) {
      err.textContent = ex.message;
      submit.disabled = false;
    }
  });

  const tab = (m, label) => h('button', { type: 'button', class: 'dlg-tab', role: 'tab', 'aria-selected': String(m === mode), onclick: () => render(m, reason) }, label);
  dlg.replaceChildren(
    h('div', { class: 'dlg-head', role: 'tablist' }, tab('login', 'Sign in'), tab('register', 'Create account'),
      h('button', { type: 'button', class: 'dlg-x', 'aria-label': 'Close', onclick: () => close(null) }, '✕')),
    form,
  );
  setTimeout(() => user.focus(), 30);
}

function close(user) {
  if (dlg.open) dlg.close();
  const r = resolver; resolver = null;
  r?.(user);
}
dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(null); });
dlg.addEventListener('click', (e) => { if (e.target === dlg) close(null); });

registerAuth(({ mode = 'login', reason } = {}) => {
  render(mode, reason);
  if (!dlg.open) dlg.showModal();
  return new Promise((res) => { resolver = res; });
});
