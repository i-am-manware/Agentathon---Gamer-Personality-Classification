import { h, toast } from './ui.js';
import { sfx } from './audio.js';
import { api } from './api.js';
import { loadSettings, saveSettings, state, setSession, onSessionChange, applySettings } from './state.js';
import { startRouter } from './router.js';
import { homeView } from './views/home.js';
import { mapView } from './views/map.js';
import { quizView } from './views/quiz.js';
import { computeView } from './views/compute.js';
import { resultView } from './views/result.js';
import { cardView } from './views/card.js';
import { profileView } from './views/profile.js';
import { diffView } from './views/diff.js';
import { signinView } from './views/signin.js';

const views = {
  home: homeView,
  map: mapView,
  quiz: quizView,
  compute: computeView,
  result: resultView,
  card: cardView,
  profile: profileView,
  diff: diffView,
  signin: signinView,
};

loadSettings();

// ---- session ------------------------------------------------------------------

const sessionSlot = () => document.getElementById('session-slot');
const navProfile = () => document.getElementById('nav-profile');

function renderSessionSlot() {
  const slot = sessionSlot();
  if (!slot) return;
  const nav = navProfile();
  if (state.user) {
    slot.replaceChildren(
      h('span', { class: 'session-user' }, '▲ ', h('b', null, state.user.username)),
      h('button', {
        class: 'btn btn--ghost btn--small', type: 'button',
        onclick: async () => {
          try { await api.logout(); } catch { /* server may be gone; clear locally */ }
          setSession(null);
          sfx.back();
          toast('signed out — the guest life treats you well');
          if (location.hash.startsWith('#/profile') || location.hash.startsWith('#/diff')) {
            location.hash = '#/';
          }
        },
      }, 'SIGN OUT')
    );
    if (nav) nav.textContent = 'Save Data';
  } else {
    slot.replaceChildren(
      h('a', { class: 'session-link', href: '#/signin' }, 'SIGN IN'),
      h('span', { class: 'session-tag' }, 'GUEST MODE OK')
    );
    if (nav) nav.textContent = 'Sign In';
  }
}

onSessionChange(renderSessionSlot);

(async () => {
  try {
    const { user } = await api.me();
    setSession(user);
  } catch {
    setSession(null);
  }
  renderSessionSlot();
})();

// ---- router -------------------------------------------------------------------

startRouter(views, {
  onNavigate(route) {
    if (route.view !== 'compute' && route.view !== 'result') sfx.nav();
    document.title = (views[route.view] && views[route.view].title) || 'SPAWNPOINT';
  },
});

// ---- footer toggles ------------------------------------------------------------

const toggleCrt = document.getElementById('toggle-crt');
const toggleSound = document.getElementById('toggle-sound');

function syncToggles() {
  toggleCrt.classList.toggle('is-on', state.settings.crt);
  toggleCrt.querySelector('b').textContent = state.settings.crt ? 'ON' : 'OFF';
  toggleCrt.setAttribute('aria-pressed', String(state.settings.crt));
  toggleSound.classList.toggle('is-on', state.settings.sound);
  toggleSound.querySelector('b').textContent = state.settings.sound ? 'ON' : 'OFF';
  toggleSound.setAttribute('aria-pressed', String(state.settings.sound));
  applySettings();
}

toggleCrt.addEventListener('click', () => {
  state.settings.crt = !state.settings.crt;
  saveSettings();
  syncToggles();
  sfx.tap();
});
toggleSound.addEventListener('click', () => {
  state.settings.sound = !state.settings.sound;
  saveSettings();
  syncToggles();
  if (state.settings.sound) sfx.select();
});
syncToggles();

// ---- konami (obviously) ---------------------------------------------------------

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiIdx = 0;
window.addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  konamiIdx = key === KONAMI[konamiIdx] ? konamiIdx + 1 : key === KONAMI[0] ? 1 : 0;
  if (konamiIdx === KONAMI.length) {
    konamiIdx = 0;
    document.documentElement.classList.add('godmode');
    sfx.reveal();
    toast('30 LIVES GRANTED — nothing changed, but you feel stronger');
  }
});
