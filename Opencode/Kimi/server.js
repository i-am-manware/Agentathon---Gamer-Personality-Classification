'use strict';

/**
 * HEXAXIS server — zero-dependency Node (>=18). One process, one file store.
 *
 * Layers:
 *   server.js      HTTP surface: routing, static assets, security headers, OG tags
 *   lib/quiz.js    the classification engine (scoring, titles, insight assembly)
 *   lib/auth.js    scrypt password hashing, token sessions, rate limiting
 *   lib/db.js      atomic JSON document store (swap for any real DB)
 *   data/          questions, archetype content, seeded population
 *
 * Run:  node server.js   (or: npm start)   → http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const { Store } = require('./lib/db');
const { AuthService, RateLimiter, hashPassword, verifyPassword } = require('./lib/auth');
const { QuizService, computePercentiles } = require('./lib/quiz');
const { POLES } = require('./data/content');
const { id, isEmail, isPassword, isDisplayName, esc, readBody, json, clientIp } = require('./lib/util');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_FILE = process.env.DATA_FILE || path.join(ROOT, 'data', 'store.json');

// ── services ────────────────────────────────────────────────────────────────
const store = new Store(DATA_FILE);
const auth = new AuthService(store);
const quiz = new QuizService();
const authLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
const quizLimiter = new RateLimiter({ windowMs: 10 * 60 * 1000, max: 20 });

const population = (() => {
  try {
    const p = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'population.json'), 'utf8'));
    return Array.isArray(p.souls) ? p.souls : [];
  } catch {
    console.warn('[boot] data/population.json missing — run `node scripts/seed.js`. Percentiles disabled.');
    return [];
  }
})();

// ── tiny router ─────────────────────────────────────────────────────────────
const routes = [];
function route(method, pattern, handler) {
  const keys = [];
  const rx = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:([a-zA-Z_]+)/g, (_, k) => {
    keys.push(k);
    return '([^/]+)';
  }) + '$');
  routes.push({ method, rx, keys, handler });
}

// ── API: quiz ───────────────────────────────────────────────────────────────
route('POST', '/api/quiz/start', async (req, res) => {
  if (!quizLimiter.allow('quiz:' + clientIp(req))) {
    return json(res, 429, { error: 'Slow down, traveler. The stars are patient.' });
  }
  json(res, 200, quiz.start());
});

route('POST', '/api/quiz/submit', async (req, res) => {
  const body = await readBody(req);
  const reading = quiz.submit(String(body.token || ''), body.answers);
  const user = auth.userFromRequest(req);
  const result = {
    id: id(14),
    createdAt: new Date().toISOString(),
    userId: user ? user.id : null,
    claimed: !!user,
    ...reading,
  };
  store.insert('results', result);
  json(res, 200, publicResult(result, req));
});

// ── API: results & population ───────────────────────────────────────────────
route('GET', '/api/results/:id', async (req, res, params) => {
  const result = store.findOne('results', (r) => r.id === params.id);
  if (!result) return json(res, 404, { error: 'No star by that name has been charted.' });
  json(res, 200, publicResult(result, req));
});

route('DELETE', '/api/results/:id', async (req, res, params) => {
  const user = requireUser(req, res);
  if (!user) return;
  const removed = store.remove('results', (r) => r.id === params.id && r.userId === user.id);
  if (!removed) return json(res, 404, { error: 'Not found in your atlas.' });
  json(res, 200, { ok: true });
});

route('POST', '/api/results/:id/claim', async (req, res, params) => {
  const user = requireUser(req, res);
  if (!user) return;
  const updated = store.update('results', (r) => r.id === params.id && !r.userId, { userId: user.id, claimed: true });
  if (!updated) return json(res, 404, { error: 'That star cannot be claimed (already owned or unknown).' });
  json(res, 200, { ok: true });
});

route('GET', '/api/population', async (req, res) => {
  // Faint starfield of past readers + live results (positions only, rounded).
  const souls = population.map((s) => [s.point.x, s.point.y, s.point.rDisplay]);
  for (const r of store.data.results) souls.push([r.point.x, r.point.y, r.point.rDisplay]);
  json(res, 200, { count: souls.length, souls });
});

// ── API: auth ───────────────────────────────────────────────────────────────
route('POST', '/api/auth/signup', async (req, res) => {
  if (!authLimiter.allow('auth:' + clientIp(req))) {
    return json(res, 429, { error: 'Too many attempts. Try again later.' });
  }
  const body = await readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const name = String(body.name || '').trim();

  if (!isEmail(email)) return json(res, 400, { error: 'That email does not look right.' });
  if (!isPassword(password)) return json(res, 400, { error: 'Passwords need 8–128 characters.' });
  if (name && !isDisplayName(name)) return json(res, 400, { error: 'Display names: 2–24 letters, numbers, spaces, . - \'' });
  if (store.findOne('users', (u) => u.email === email)) {
    return json(res, 409, { error: 'A traveler with that email already walks the atlas.' });
  }

  const user = {
    id: id(12),
    email,
    name: name || email.split('@')[0],
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  store.insert('users', user);
  const token = auth.createSession(user.id);

  // Claim a just-finished anonymous reading, if provided.
  if (body.claim && typeof body.claim === 'string') {
    store.update('results', (r) => r.id === body.claim && !r.userId, { userId: user.id, claimed: true });
  }
  json(res, 200, { user: publicUser(user) }, { 'Set-Cookie': auth.cookieHeader(token, isHttps(req)) });
});

route('POST', '/api/auth/login', async (req, res) => {
  if (!authLimiter.allow('auth:' + clientIp(req))) {
    return json(res, 429, { error: 'Too many attempts. Try again later.' });
  }
  const body = await readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const user = store.findOne('users', (u) => u.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return json(res, 401, { error: 'The atlas does not recognize that combination.' });
  }
  const token = auth.createSession(user.id);
  if (body.claim && typeof body.claim === 'string') {
    store.update('results', (r) => r.id === body.claim && !r.userId, { userId: user.id, claimed: true });
  }
  json(res, 200, { user: publicUser(user) }, { 'Set-Cookie': auth.cookieHeader(token, isHttps(req)) });
});

route('POST', '/api/auth/logout', async (req, res) => {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/hexaxis_session=([^;]+)/);
  if (match) auth.destroySession(match[1]);
  json(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookieHeader() });
});

route('GET', '/api/me', async (req, res) => {
  const user = auth.userFromRequest(req);
  json(res, 200, { user: user ? publicUser(user) : null });
});

route('GET', '/api/me/results', async (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const results = store
    .find('results', (r) => r.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => publicResult(r, req));
  json(res, 200, { results });
});

route('GET', '/api/content', async (req, res) => {
  // Public archetype metadata for the client (no answer keys — poles are
  // fine to display, question→pole mappings never leave the server).
  const { POLE_ORDER, AXES } = require('./data/content');
  const poles = {};
  for (const code of POLE_ORDER) {
    const p = POLES[code];
    poles[code] = {
      code, name: p.name, constellation: p.constellation, epithet: p.epithet,
      motto: p.motto, color: p.color, lore: p.lore, glyph: p.glyph,
      angle: { CMP: 0, EXP: 60, ARC: 120, SOC: 180, ACH: 240, DAR: 300 }[code],
    };
  }
  json(res, 200, {
    poles,
    poleOrder: POLE_ORDER,
    axes: AXES.map((a) => ({ id: a.id, name: a.name, a: a.a, b: a.b, angle: a.angle })),
  });
});

route('GET', '/api/health', async (req, res) => {
  json(res, 200, {
    ok: true,
    users: store.count('users'),
    results: store.count('results'),
    souls: population.length,
    uptimeSec: Math.round(process.uptime()),
  });
});

// ── presenters ──────────────────────────────────────────────────────────────
function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
}

function publicResult(r, req) {
  const viewer = auth.userFromRequest(req);
  const percentiles = computePercentiles(r, [
    ...population,
    ...store.data.results.filter((o) => o.id !== r.id),
  ]);
  return {
    id: r.id,
    createdAt: r.createdAt,
    title: r.title,
    epithet: r.epithet,
    primary: r.primary,
    secondary: r.secondary,
    hybrid: r.hybrid,
    balanced: r.balanced,
    point: r.point,
    axes: r.axes,
    poles: r.poles,
    percentiles,
    conviction: r.conviction,
    consistency: r.consistency,
    insight: r.insight,
    games: r.games,
    ownerName: r.userId ? (store.findOne('users', (u) => u.id === r.userId) || {}).name || null : null,
    claimed: !!r.userId,
    mine: !!(viewer && r.userId === viewer.id),
    sharePath: `/r/${r.id}`,
  };
}

function requireUser(req, res) {
  const user = auth.userFromRequest(req);
  if (!user) json(res, 401, { error: 'Sign in to do that.' });
  return user;
}

function isHttps(req) {
  return req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https';
}

// ── static assets ───────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const staticCache = new Map(); // path -> {body, gz, mime, etag}
function loadStatic(file) {
  if (staticCache.has(file)) return staticCache.get(file);
  const body = fs.readFileSync(file);
  const mime = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const compressible = /text|javascript|json|svg/.test(mime) && body.length > 1024;
  const entry = {
    body,
    gz: compressible ? zlib.gzipSync(body, { level: 9 }) : null,
    mime,
    etag: `"${body.length}-${fs.statSync(file).mtimeMs}"`,
  };
  staticCache.set(file, entry);
  return entry;
}

function serveStatic(req, res, relPath) {
  const safe = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(PUBLIC_DIR, safe);
  if (!file.startsWith(PUBLIC_DIR)) return notFound(res);
  let entry;
  try {
    entry = loadStatic(file);
  } catch {
    return notFound(res);
  }
  const headers = {
    'Content-Type': entry.mime,
    'ETag': entry.etag,
    'Cache-Control': entry.mime.includes('html') ? 'no-cache' : 'public, max-age=3600',
  };
  if (req.headers['if-none-match'] === entry.etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  if (entry.gz && (req.headers['accept-encoding'] || '').includes('gzip')) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    return res.end(entry.gz);
  }
  res.writeHead(200, headers);
  res.end(entry.body);
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 — this corner of the atlas is uncharted.');
}

// ── HTML shell (with OG injection for shared stars) ─────────────────────────
let INDEX_HTML = '';
function indexHtml() {
  if (!INDEX_HTML) INDEX_HTML = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  return INDEX_HTML;
}

function serveApp(req, res, resultId) {
  let html = indexHtml();
  if (resultId) {
    const r = store.findOne('results', (x) => x.id === resultId);
    if (r) {
      const prim = POLES[r.primary] || {};
      const desc = `${r.title} — ${r.epithet}. Primary pull: ${prim.name || '?'}. Chart your own gamer soul on HEXAXIS.`;
      const og = [
        `<meta property="og:title" content="${esc(r.title)} · HEXAXIS">`,
        `<meta property="og:description" content="${esc(desc)}">`,
        `<meta property="og:type" content="website">`,
        `<meta name="twitter:card" content="summary">`,
        `<meta name="twitter:title" content="${esc(r.title)} · HEXAXIS">`,
        `<meta name="twitter:description" content="${esc(desc)}">`,
      ].join('\n    ');
      html = html.replace('<!--__OG__-->', og);
    }
  }
  const body = Buffer.from(html, 'utf8');
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' };
  if ((req.headers['accept-encoding'] || '').includes('gzip')) {
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    return res.end(zlib.gzipSync(body));
  }
  res.writeHead(200, headers);
  res.end(body);
}

// ── server ──────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  try {
    // Security headers on everything
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'"
    );

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    // API routes
    if (pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'DELETE') {
        const ct = req.headers['content-type'] || '';
        if (!ct.includes('application/json')) return json(res, 415, { error: 'JSON only.' });
      }
      for (const r of routes) {
        const m = pathname.match(r.rx);
        if (m && r.method === req.method) {
          const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
          return await r.handler(req, res, params);
        }
      }
      return json(res, 404, { error: 'Unknown endpoint.' });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') return notFound(res);

    // App routes (SPA shell)
    if (pathname === '/' || pathname === '/quiz' || pathname === '/dashboard' || pathname === '/about') {
      return serveApp(req, res);
    }
    const shareMatch = pathname.match(/^\/(?:r|results)\/([A-Za-z0-9_-]{8,32})$/);
    if (shareMatch) return serveApp(req, res, shareMatch[1]);

    // Static files
    return serveStatic(req, res, pathname === '/' ? 'index.html' : pathname.slice(1));
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500) console.error('[error]', err);
    if (!res.headersSent) json(res, status, { error: status >= 500 ? 'The atlas flickered. Try again.' : err.message });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  ✦ HEXAXIS — a cartography of the gamer soul');
  console.log(`  ✦ charted at http://localhost:${PORT}`);
  console.log(`  ✦ souls seeded: ${population.length} · results stored: ${store.count('results')}`);
  console.log('');
});

function shutdown() {
  console.log('\n[shutdown] flushing the atlas…');
  try { store.flushSync(); } catch { /* best effort */ }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 500).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
