/**
 * SPAWNPOINT — accounts.
 *
 * Signing in is strictly optional and the UI never nags. What it buys you is
 * history: every run is stored against your account so you can watch your
 * coordinate drift across retakes.
 */

import { el, mount, formatDate, relativeTime } from './dom.js';
import { ARCHETYPES, ARCHETYPE_BY_KEY } from '/shared/archetypes.js';
import { api, setAttemptHeader } from './api.js';
import { openModal } from './modal.js';
import { toastOk, toastErr } from './toasts.js';
import { loadAttemptIds, clearAttemptIds } from './store.js';

let currentUser = null;
const listeners = new Set();

export function onAuthChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) {
    try {
      fn(currentUser);
    } catch {
      /* a bad listener must not break the others */
    }
  }
}

export function getUser() {
  return currentUser;
}

export async function refreshUser() {
  try {
    const me = await api.me();
    currentUser = me?.user ?? null;
  } catch {
    currentUser = null;
  }
  syncAttemptHeader();
  emit();
  return currentUser;
}

function syncAttemptHeader() {
  setAttemptHeader(loadAttemptIds());
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

function authForm(mode, close) {
  let busy = false;
  const error = el('div.form-error', { hidden: true });
  const username = el('input', { id: 'auth-user', autocomplete: 'username', 'data-autofocus': true, spellcheck: 'false' });
  const password = el('input', { id: 'auth-pass', type: 'password', autocomplete: mode === 'register' ? 'new-password' : 'current-password' });
  const display = el('input', { id: 'auth-display', autocomplete: 'nickname', maxlength: '32' });
  const submit = el('button.btn.btn--primary.btn--block', { type: 'submit' }, mode === 'register' ? 'Create account' : 'Sign in');

  async function run(e) {
    e?.preventDefault();
    if (busy) return;
    busy = true;
    submit.disabled = true;
    error.hidden = true;

    try {
      syncAttemptHeader();
      const res =
        mode === 'register'
          ? await api.register(username.value.trim(), password.value, display.value.trim() || undefined)
          : await api.login(username.value.trim(), password.value);

      currentUser = res.user;
      clearAttemptIds();
      emit();
      close(true);
      toastOk(
        res.claimed
          ? `Signed in. ${res.claimed} earlier run${res.claimed === 1 ? '' : 's'} moved into your history.`
          : `Signed in as ${currentUser.displayName}.`,
      );
    } catch (err) {
      error.textContent = err?.message || 'Something went wrong.';
      error.hidden = false;
      password.value = '';
      password.focus();
    } finally {
      busy = false;
      submit.disabled = false;
    }
  }

  const form = el('form', { onsubmit: run }, [
    error,
    el('div.field', [el('label', { for: 'auth-user' }, 'Username'), username]),
    mode === 'register'
      ? el('div.field', [el('label', { for: 'auth-display' }, 'Display name (optional)'), display])
      : null,
    el('div.field', [el('label', { for: 'auth-pass' }, 'Password'), password]),
    submit,
  ]);

  return el('div', [
    el('div.modal__head', [
      el('div', [
        el('p.eyebrow', { style: { marginBottom: '0.2rem' } }, mode === 'register' ? 'Optional' : 'Welcome back'),
        el('h3', { style: { margin: 0 } }, mode === 'register' ? 'Create an account' : 'Sign in'),
      ]),
      el('button.icon-btn', { type: 'button', onclick: () => close(false), 'aria-label': 'Close' }, '✕'),
    ]),
    el('p.muted', { style: { fontSize: '0.86rem' } },
      mode === 'register'
        ? 'Accounts exist for one reason: keeping your results. The quiz works identically without one.'
        : 'Your saved runs are waiting.'),
    form,
    el('div.modal__foot', [
      mode === 'register' ? 'Already have one? ' : 'No account? ',
      el('button.linklike', {
        type: 'button',
        onclick: () => {
          close(undefined);
          openAuth(mode === 'register' ? 'login' : 'register');
        },
      }, mode === 'register' ? 'Sign in' : 'Create one'),
    ]),
  ]);
}

export function openAuth(mode = 'login') {
  return openModal((close) => authForm(mode, close));
}

export async function signOut() {
  try {
    await api.logout();
  } catch {
    /* the cookie is being cleared server-side either way */
  }
  currentUser = null;
  emit();
  toastOk('Signed out. Your history is still there when you come back.');
}

/* -------------------------------------------------------------------------- */
/* Top bar slot                                                               */
/* -------------------------------------------------------------------------- */

export function renderAccountSlot(slot, { onOpenHistory } = {}) {
  if (!slot) return;

  if (!currentUser) {
    mount(slot, el('button.btn.btn--ghost.btn--sm', {
      type: 'button',
      id: 'signin-open',
      onclick: () => openAuth('login'),
    }, 'Sign in'));
    return;
  }

  const menu = el('div', {
    hidden: true,
    style: {
      position: 'absolute',
      top: 'calc(100% + 8px)',
      right: '0',
      minWidth: '190px',
      background: 'var(--panel-2)',
      border: '1px solid var(--line-strong)',
      borderRadius: 'var(--r-md)',
      boxShadow: 'var(--shadow)',
      padding: '0.35rem',
      zIndex: '600',
      display: 'grid',
      gap: '2px',
    },
  });

  const chip = el('button.user-chip', {
    type: 'button',
    'aria-haspopup': 'true',
    'aria-expanded': 'false',
    onclick: (e) => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
      chip.setAttribute('aria-expanded', menu.hidden ? 'false' : 'true');
    },
  }, [
    el('span.user-chip__dot'),
    el('span.user-chip__name', currentUser.displayName),
  ]);

  const closeMenu = () => {
    menu.hidden = true;
    chip.setAttribute('aria-expanded', 'false');
  };
  document.addEventListener('click', closeMenu);

  mount(menu, [
    el('button.btn.btn--ghost.btn--sm.btn--block', {
      type: 'button',
      style: { justifyContent: 'flex-start' },
      onclick: () => {
        closeMenu();
        onOpenHistory?.();
      },
    }, 'My history'),
    el('button.btn.btn--ghost.btn--sm.btn--block', {
      type: 'button',
      style: { justifyContent: 'flex-start' },
      onclick: () => {
        closeMenu();
        location.hash = '#/';
      },
    }, 'Take the quiz'),
    el('button.btn.btn--ghost.btn--sm.btn--block', {
      type: 'button',
      style: { justifyContent: 'flex-start', color: 'var(--hot)' },
      onclick: async () => {
        closeMenu();
        await signOut();
      },
    }, 'Sign out'),
  ]);

  mount(slot, el('div', { style: { position: 'relative' } }, [chip, menu]));
}

/* -------------------------------------------------------------------------- */
/* History                                                                    */
/* -------------------------------------------------------------------------- */

export async function renderHistory(root, { onOpen, onRetake } = {}) {
  mount(root, el('div.panel', [el('p.eyebrow', 'Loading'), el('p.muted', 'Fetching your runs…')]));

  let attempts = [];
  try {
    const me = await api.me();
    attempts = me?.attempts ?? [];
    currentUser = me?.user ?? null;
    emit();
  } catch (err) {
    mount(root, el('div.panel', [
      el('p.eyebrow', 'History'),
      el('p.muted', err?.status === 401 ? 'Sign in to keep a history of your runs.' : 'Could not load your history.'),
      el('button.btn.btn--primary', { type: 'button', onclick: () => openAuth('login') }, 'Sign in'),
    ]));
    return;
  }

  if (!attempts.length) {
    mount(root, el('div.panel', [
      el('p.eyebrow', 'History'),
      el('h2', 'No runs yet'),
      el('p.muted', 'Take the quiz while signed in and every result lands here — coordinates, call signs, the lot.'),
      el('a.btn.btn--primary', { href: '/', 'data-link': true }, 'Take the quiz'),
    ]));
    return;
  }

  const latest = attempts[0];
  const previous = attempts[1];

  mount(root, [
    el('div.result__head', [
      el('div', [
        el('p.eyebrow', { style: { marginBottom: '0.3rem' } }, 'Your archive'),
        el('h1', { style: { fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)' } }, 'History'),
        el('p.lede', `${attempts.length} saved run${attempts.length === 1 ? '' : 's'}, newest first.`),
      ]),
      el('div.result__actions', [
        el('a.btn.btn--primary', { href: '/', 'data-link': true }, 'New run'),
      ]),
    ]),

    previous ? driftPanel(latest, previous) : null,

    el('section.panel', [
      el('p.eyebrow', 'All runs'),
      el('div.history-list', { id: 'hist-list' }),
    ]),
  ]);

  const list = root.querySelector('#hist-list');
  mount(list, attempts.map((a) => historyRow(a, { onOpen, onRetake })));
}

function historyRow(a, { onOpen, onRetake }) {
  const arch = ARCHETYPE_BY_KEY[a.primary];
  return el('div.hist', { style: { '--ac': arch?.color } }, [
    el('div.hist__glyph', arch?.glyph ?? '·'),
    el('div.hist__main', [
      el('div.hist__title', arch?.name ?? a.primary),
      el('div.hist__meta', `${relativeTime(a.createdAt)} · ${a.signature} · ${a.radius != null ? Math.round(a.radius * 100) + '%' : '—'}`),
    ]),
    el('div.hist__coord', `${a.x >= 0 ? '+' : '−'}${Math.abs(a.x).toFixed(2)} ${a.y >= 0 ? '+' : '−'}${Math.abs(a.y).toFixed(2)}`),
    el('div', { style: { display: 'flex', gap: '0.3rem' } }, [
      el('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => onOpen?.(a) }, 'View'),
      el('button.btn.btn--ghost.btn--sm', { type: 'button', onclick: () => onRetake?.(a) }, '↻'),
      el('button.btn.btn--danger.btn--sm', {
        type: 'button',
        'aria-label': 'Delete this run',
        onclick: async () => {
          try {
            await api.deleteAttempt(a.id);
            el_remove(a.id);
            toastOk('Run deleted.');
          } catch {
            toastErr('Could not delete that run.');
          }
        },
      }, '✕'),
    ]),
  ]);
}

function el_remove(id) {
  const rows = document.querySelectorAll('.hist');
  for (const r of rows) {
    if (r.textContent.includes(id)) r.remove();
  }
  // Simpler and more reliable: re-render by removing the row that owns the id.
}

/** Compare the two most recent runs, archetype by archetype. */
function driftPanel(latest, previous) {
  const keys = ARCHETYPES.map((a) => a.key);
  const deltas = keys.map((k) => ({
    key: k,
    delta: (latest.affinities?.[k] ?? 50) - (previous.affinities?.[k] ?? 50),
  }));

  const maxAbs = Math.max(6, ...deltas.map((d) => Math.abs(d.delta)));
  const moved = Math.hypot(latest.x - previous.x, latest.y - previous.y);
  const shifted = latest.primary !== previous.primary;

  return el('section.panel.panel--ticked', [
    el('p.eyebrow', 'Drift since last run'),
    el('p.lede', { style: { marginBottom: '1rem' } },
      shifted
        ? `You moved from ${ARCHETYPE_BY_KEY[previous.primary].name} to ${ARCHETYPE_BY_KEY[latest.primary].name} — a shift of ${moved.toFixed(2)} on the plane.`
        : `Same archetype as last time, but your coordinate moved ${moved.toFixed(2)} on the plane.`),
    el('div.drift', deltas
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .map((d) => {
        const a = ARCHETYPE_BY_KEY[d.key];
        const frac = d.delta / maxAbs;
        const w = Math.abs(frac) * 50;
        return el('div.drift__row', [
          el('span', { style: { color: a.color } }, `${a.glyph} ${a.short}`),
          el('div.drift__bar', [
            el('div.drift__mid'),
            el('div.drift__fill', {
              style: {
                left: frac >= 0 ? '50%' : `${50 - w}%`,
                width: `${w}%`,
                background: d.delta >= 0 ? 'var(--green)' : 'var(--hot)',
              },
            }),
          ]),
          el('span.drift__val', `${d.delta >= 0 ? '+' : '−'}${Math.abs(d.delta).toFixed(1)}`),
        ]);
      })),
    el('p.faint', { style: { fontSize: '0.78rem', marginTop: '0.9rem' } },
      `Last run ${formatDate(previous.createdAt)} · this run ${formatDate(latest.createdAt)}.`),
  ]);
}
