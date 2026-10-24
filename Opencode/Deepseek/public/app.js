import { h, mount } from './js/dom.js';
import { api } from './js/api.js';
import { loadState, state, setUser, setSfx, subscribe } from './js/state.js';
import { route, start, navigate } from './js/router.js';
import { toast } from './js/components/toast.js';
import { openAuthModal } from './js/components/modal.js';
import { sfx } from './js/sfx.js';
import { landingView } from './js/views/landing.js';
import { quizView } from './js/views/quiz.js';
import { resultView } from './js/views/result.js';
import { archiveView } from './js/views/archive.js';
import { methodView } from './js/views/method.js';

async function boot() {
  loadState();

  const ctx = {
    state,
    get quiz() {
      return state.quiz;
    },
    get field() {
      return state.field;
    },
    get stats() {
      return state.stats;
    },
    get user() {
      return state.user;
    },
    toast,
    sfx,
    navigate
  };

  setupHeader(ctx);

  const [quiz, field, stats, me] = await Promise.all([
    api.quiz().catch(() => null),
    api.field().catch(() => null),
    api.stats().catch(() => null),
    api
      .me()
      .then((res) => ({ ok: true, user: res.user }))
      .catch(() => ({ ok: false, user: null }))
  ]);

  state.quiz = quiz;
  state.field = field;
  state.stats = stats;
  if (me.ok) state.user = me.user;

  renderUserSlot();

  if (!quiz) {
    mount(
      document.getElementById('view'),
      h(
        'div',
        { class: 'shell', style: { paddingTop: '80px' } },
        h(
          'div',
          { class: 'panel panel-pad', style: { maxWidth: '640px', margin: '0 auto', textAlign: 'center' } },
          h('p', { class: 'kicker warm' }, 'CABINET NOT RESPONDING'),
          h('h1', { class: 'h2' }, 'The oracle is offline.'),
          h(
            'p',
            { class: 'muted' },
            'The quiz data could not be loaded. Make sure the Pixel Psyche server is running, then retry.'
          ),
          h(
            'div',
            { class: 'empty-actions' },
            h('button', { class: 'btn btn-primary', type: 'button', onclick: () => window.location.reload() }, 'RETRY BOOT')
          )
        )
      )
    );
    return;
  }

  route('/', () => landingView(ctx));
  route('/quiz', () => quizView(ctx));
  route('/result', () => resultView(ctx));
  route('/r/:code', (params) => resultView(ctx, { code: params.code }));
  route('/a/:id', (params) => resultView(ctx, { id: params.id }));
  route('/archive', () => archiveView(ctx));
  route('/method', () => methodView(ctx));

  start();
}

function setupHeader(ctx) {
  const sfxBtn = document.getElementById('sfx-toggle');
  if (sfxBtn) {
    sfxBtn.setAttribute('aria-pressed', String(!!state.sfx));
    sfxBtn.addEventListener('click', () => {
      setSfx(!state.sfx);
      sfxBtn.setAttribute('aria-pressed', String(!!state.sfx));
      if (state.sfx) sfx.select();
    });
  }

  subscribe((topic) => {
    if (topic === 'user') renderUserSlot();
  });
}

function renderUserSlot() {
  const slot = document.getElementById('user-slot');
  if (!slot) return;
  slot.innerHTML = '';
  if (state.user) {
    slot.append(
      h(
        'div',
        { class: 'user-chip' },
        h('span', { class: 'dot' }),
        h('a', { href: '#/archive', style: { color: 'inherit' } }, state.user.username),
        h(
          'button',
          {
            class: 'link-btn',
            type: 'button',
            style: { fontSize: '11px' },
            onclick: async () => {
              try {
                await api.logout();
              } catch {
                /* session may already be gone */
              }
              setUser(null);
              toast('Linked archive detached. Your scans stay on the server.');
              const path = window.location.hash.replace(/^#/, '') || '/';
              if (path.startsWith('/archive') || path.startsWith('/a/')) navigate('/');
            }
          },
          'SIGN OUT'
        )
      )
    );
  } else {
    slot.append(
      h(
        'button',
        { class: 'btn btn-small', type: 'button', onclick: () => openAuthModal({}) },
        'SIGN IN'
      )
    );
  }
}

boot().catch((err) => {
  console.error('[psyche] boot failed:', err);
  const view = document.getElementById('view');
  if (view) {
    mount(
      view,
      h(
        'div',
        { class: 'shell', style: { paddingTop: '80px', textAlign: 'center' } },
        h('p', { class: 'kicker warm' }, 'BOOT FAILURE'),
        h('h1', { class: 'h2' }, 'The cabinet failed to warm up.'),
        h('p', { class: 'muted' }, String(err?.message || err))
      )
    );
  }
});
