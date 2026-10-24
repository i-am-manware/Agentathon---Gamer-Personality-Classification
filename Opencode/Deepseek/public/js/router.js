const routes = [];
let current = null;
let renderToken = 0;

function compile(pattern) {
  const parts = pattern.split('/').filter(Boolean);
  return {
    pattern,
    parts,
    match(pathParts) {
      if (pathParts.length !== parts.length) return null;
      const params = {};
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].startsWith(':')) params[parts[i].slice(1)] = decodeURIComponent(pathParts[i]);
        else if (parts[i] !== pathParts[i]) return null;
      }
      return params;
    }
  };
}

export function route(pattern, handler) {
  routes.push({ ...compile(pattern), handler });
}

export function navigate(path) {
  const target = `#${path}`;
  if (window.location.hash === target) render();
  else window.location.hash = target;
}

export function currentPath() {
  return window.location.hash.replace(/^#/, '') || '/';
}

export function start() {
  window.addEventListener('hashchange', render);
  render();
}

async function render() {
  const token = ++renderToken;
  const path = currentPath();
  const pathParts = path.split('/').filter(Boolean);

  let matched = null;
  let params = {};
  for (const r of routes) {
    const m = r.match(pathParts);
    if (m) {
      matched = r;
      params = m;
      break;
    }
  }

  const root = document.getElementById('view');
  if (!root) return;

  if (typeof current?.dispose === 'function') {
    try {
      current.dispose();
    } catch {
      /* view cleanup is best-effort */
    }
  }
  current = null;

  let view = null;
  try {
    view = matched ? await matched.handler(params, { token }) : await notFoundView();
  } catch (err) {
    view = errorView(err);
  }

  if (token !== renderToken) {
    if (typeof view?.dispose === 'function') view.dispose();
    return;
  }

  root.innerHTML = '';
  if (view?.el) root.append(view.el);
  current = view;
  updateNav(path);
  window.scrollTo({ top: 0, behavior: 'auto' });
  root.focus({ preventScroll: true });
}

function updateNav(path) {
  const base = `/${path.split('/').filter(Boolean)[0] || ''}`;
  document.querySelectorAll('[data-nav]').forEach((link) => {
    const nav = link.getAttribute('data-nav');
    const active =
      (nav === 'quiz' && (base === '/quiz' || base === '/result' || base === '/r')) ||
      (nav === 'archive' && base === '/archive') ||
      (nav === 'method' && base === '/method');
    link.classList.toggle('active', active);
  });
}

async function notFoundView() {
  const { h } = await import('./dom.js');
  return {
    el: h(
      'div',
      { class: 'shell', style: { paddingTop: '80px', textAlign: 'center' } },
      h('p', { class: 'kicker warm' }, 'ERROR 404 // SECTOR EMPTY'),
      h('h1', { class: 'h2' }, 'This part of the map was never generated.'),
      h(
        'p',
        { class: 'muted' },
        'The scanner suggests you return to a charted area.'
      ),
      h(
        'div',
        { class: 'row', style: { justifyContent: 'center', marginTop: '24px' } },
        h('a', { class: 'btn btn-primary', href: '#/' }, 'RETURN TO BASE'),
        h('a', { class: 'btn', href: '#/quiz' }, 'START A SCAN')
      )
    )
  };
}

function errorView(err) {
  console.error('[psyche] view error:', err);
  const el = document.createElement('div');
  el.className = 'shell';
  el.style.paddingTop = '80px';
  el.innerHTML = `
    <p class="kicker warm">SYSTEM FAULT</p>
    <h1 class="h2">The machine jammed.</h1>
    <p class="muted">${escapeHtml(err?.message || 'Unknown error')}</p>
  `;
  const actions = document.createElement('div');
  actions.className = 'row';
  actions.style.marginTop = '24px';
  const retry = document.createElement('button');
  retry.className = 'btn btn-primary';
  retry.textContent = 'RETRY';
  retry.addEventListener('click', () => render());
  const home = document.createElement('a');
  home.className = 'btn';
  home.href = '#/';
  home.textContent = 'RETURN TO BASE';
  actions.append(retry, home);
  el.append(actions);
  return { el };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
