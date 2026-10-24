// Entry point: client-side router + masthead wiring.
import { $, h, clear, toast, store } from './dom.js';
import { api } from './api.js';
import { session, navigate, openAuth } from './state.js';
import './auth.js';
import { renderHome } from './views/home.js';
import { renderQuiz } from './views/quiz.js';
import { renderResults } from './views/results.js';
import { renderLog } from './views/log.js';
import { renderAtlas } from './views/atlas.js';
import { renderAbout } from './views/about.js';
import { renderNotFound } from './views/notfound.js';

const routes = [
  [/^\/$/, renderHome],
  [/^\/quiz\/?$/, renderQuiz],
  [/^\/r\/([0-9a-z]+)\/?$/, renderResults],
  [/^\/me\/?$/, renderLog],
  [/^\/atlas\/?$/, renderAtlas],
  [/^\/about\/?$/, renderAbout],
];

const view = $('#view');
let cleanup = null;
let lastPath = null;

async function render() {
  const path = location.pathname;
  const samePage = path === lastPath;
  lastPath = path;
  if (typeof cleanup === 'function') { try { cleanup(); } catch { /* ignore */ } }
  cleanup = null;
  let fn = renderNotFound, params = [];
  for (const [re, f] of routes) {
    const m = re.exec(path);
    if (m) { fn = f; params = m.slice(1); break; }
  }
  clear(view);
  document.querySelectorAll('.nav a').forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === path));
  if (!samePage) { window.scrollTo(0, 0); }
  try {
    cleanup = await fn(view, { params, query: new URLSearchParams(location.search) });
  } catch (err) {
    console.error(err);
    view.textContent = 'Something went wrong rendering this page.';
  }
  if (!samePage) view.focus({ preventScroll: true });
}

// Same-origin link interception
document.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target || a.hasAttribute('download')) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.preventDefault();
  if (url.pathname + url.search !== location.pathname + location.search) navigate(url.pathname + url.search + url.hash);
});
window.addEventListener('popstate', render);
window.addEventListener('pp:navigate', render);

// Masthead auth button
const authBtn = $('#auth-btn');
session.subscribe((u) => {
  authBtn.replaceChildren(...(u ? [h('span', { class: 'nav-long' }, `${u.username} · `), 'sign out'] : ['Sign in']));
  authBtn.title = u ? 'Sign out' : 'Sign in or create an account';
});
authBtn.addEventListener('click', async () => {
  if (session.user) {
    await api.logout().catch(() => {});
    session.set(null);
    toast('Signed out. Your runs are safe in your field log.');
    if (location.pathname === '/me') render();
  } else {
    await openAuth({ mode: 'login' });
  }
});

// Day / night print toggle (initial theme is applied pre-paint by theme.js)
const themeBtn = $('#theme-btn');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = () => document.documentElement.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
const syncThemeLabel = () => {
  const next = effectiveTheme() === 'dark' ? 'day' : 'night';
  themeBtn.setAttribute('aria-label', `Switch to ${next} print`);
  themeBtn.title = `Switch to ${next} print`;
};
themeBtn.addEventListener('click', () => {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  store.set('pp.theme', next);
  syncThemeLabel();
});
darkQuery.addEventListener?.('change', syncThemeLabel);
syncThemeLabel();

render();
