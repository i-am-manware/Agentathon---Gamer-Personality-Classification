// Hash router: '#/r/CODE' → segments. Views own their cleanup; render errors
// land in a readable module instead of a blank screen.

import { h, toast } from './ui.js';

export function startRouter(views, { onNavigate } = {}) {
  const root = document.getElementById('view');

  let cleanup = null;
  let current = null;

  const PATTERNS = [
    { re: /^\/?$/, view: 'home' },
    { re: /^\/map\/?$/, view: 'map' },
    { re: /^\/quiz\/?$/, view: 'quiz' },
    { re: /^\/compute\/?$/, view: 'compute' },
    { re: /^\/r\/([^/]+)\/?$/, view: 'result', keys: ['code'] },
    { re: /^\/card\/([^/]+)\/?$/, view: 'card', keys: ['code'] },
    { re: /^\/profile\/?$/, view: 'profile' },
    { re: /^\/diff\/([^/]+)\/([^/]+)\/?$/, view: 'diff', keys: ['a', 'b'] },
    { re: /^\/signin\/?$/, view: 'signin' },
  ];

  function parse() {
    const raw = location.hash || '#/';
    const path = raw.startsWith('#') ? raw.slice(1) : raw;
    const clean = path.startsWith('/') ? path : '/' + path;
    for (const p of PATTERNS) {
      const m = p.re.exec(clean);
      if (m) {
        const params = {};
        (p.keys || []).forEach((k, i) => (params[k] = m[i + 1]));
        return { view: p.view, params, path: clean };
      }
    }
    return { view: 'notfound', params: {}, path: clean };
  }

  function updateNav(path) {
    document.querySelectorAll('.site-nav a').forEach((a) => {
      const target = a.getAttribute('href').slice(1);
      a.classList.toggle('is-active', target === path || (target === '/' && path === '/'));
    });
  }

  async function render() {
    const route = parse();
    if (cleanup) {
      try { cleanup(); } catch { /* ignore */ }
      cleanup = null;
    }
    current = route;
    updateNav(route.path);
    try {
      onNavigate?.(route);
      const view = views[route.view];
      if (!view) throw new Error(`view not found: ${route.view}`);
      root.replaceChildren();
      const out = await view(root, route.params);
      cleanup = typeof out === 'function' ? out : null;
    } catch (err) {
      console.error(err);
      root.replaceChildren(
        h(
          'section',
          { class: 'module module--error' },
          h('h2', { class: 'module__title' }, 'MODULE FAULT'),
          h('p', null, 'This screen failed to load. It was logged to the console.'),
          h('p', { class: 'dim' }, String(err && err.message ? err.message : err)),
          h('p', null, h('a', { class: 'btn', href: '#/' }, 'RETURN TO SPAWN'))
        )
      );
    }
    root.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  window.addEventListener('hashchange', render);
  render();

  return {
    go(hash) {
      if (location.hash === hash) render();
      else location.hash = hash;
    },
    current: () => current,
  };
}

export function link(hash) {
  return hash;
}

export function notifyInvalidCode() {
  toast('that share code is corrupted or from another dimension', { tone: 'error' });
}
