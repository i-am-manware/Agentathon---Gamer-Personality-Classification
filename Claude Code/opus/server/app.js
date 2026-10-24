// HTTP application: API routes, security headers, SPA shell with per-result
// Open Graph tags. Everything is plain `node:http`.
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT } from './config.js';
import { HttpError, createRouter, sendJson, readJson, clientIp } from './http.js';
import { createSessionService, hashPassword, verifyPassword, burnHash, validateCredentials } from './auth.js';
import { createRateLimiter } from './ratelimit.js';
import { createStatic } from './static.js';
import { analyze, decodeCode, CODE_RE, QUESTIONS } from '../shared/engine.js';
import { describeShort } from '../shared/content.js';

const STATS_BINS = 20;
const STATS_TTL = 15_000;
const newPublicId = () => crypto.randomBytes(6).toString('base64url');

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

/** Summary for API responses — derived fields only, never other users' data. */
function toPublicResult(row) {
  return {
    publicId: row.publicId, code: row.code, titleKey: row.titleKey, primary: row.primary,
    x: row.x, y: row.y, scores: row.scores, label: row.label || null, createdAt: row.createdAt,
  };
}

export function createApp({ store, config }) {
  const sessions = createSessionService(store, config);
  const limiter = createRateLimiter({
    auth: { windowMs: 60_000, max: 12 },
    results: { windowMs: 60_000, max: 30 },
    write: { windowMs: 60_000, max: 60 },
  });
  const statics = createStatic([
    ['/shared/', path.join(ROOT, 'shared')],
    ['/', path.join(ROOT, 'public')],
  ]);
  let statsCache = null;

  const limit = (bucket, req) => {
    const wait = limiter.check(bucket, clientIp(req));
    if (wait) throw new HttpError(429, `Slow down — try again in ${wait}s`, 'rate_limited');
  };
  const requireUser = (req) => {
    const u = sessions.user(req);
    if (!u) throw new HttpError(401, 'Sign in required', 'unauthenticated');
    return u;
  };

  /* ------------------------------ API ------------------------------ */
  const api = createRouter();

  api.get('/api/health', () => ({ ok: true, store: store.kind, questions: QUESTIONS.length }));

  api.get('/api/me', (req) => {
    const u = sessions.user(req);
    return { user: u ? { id: u.id, username: u.username, createdAt: u.created_at } : null };
  });

  api.post('/api/auth/register', async (req, res) => {
    limit('auth', req);
    const { username, password } = validateCredentials(await readJson(req));
    if (store.findUserByName(username)) throw new HttpError(409, 'That username is taken', 'username_taken');
    let user;
    try { user = store.createUser(username, await hashPassword(password)); } catch (e) {
      if (/UNIQUE/.test(e.message)) throw new HttpError(409, 'That username is taken', 'username_taken');
      throw e;
    }
    sessions.issue(res, user.id);
    return [201, { user: { id: user.id, username: user.username } }];
  });

  api.post('/api/auth/login', async (req, res) => {
    limit('auth', req);
    const body = await readJson(req);
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const row = username ? store.findUserByName(username) : null;
    if (!row) { await burnHash(password); throw new HttpError(401, 'Wrong username or password', 'bad_credentials'); }
    if (!(await verifyPassword(password, row.pass_hash))) throw new HttpError(401, 'Wrong username or password', 'bad_credentials');
    sessions.issue(res, row.id);
    return { user: { id: row.id, username: row.username } };
  });

  api.post('/api/auth/logout', (req, res) => { sessions.revoke(req, res); return { ok: true }; });

  // Submit a finished run. Anyone may submit (feeds the anonymous atlas);
  // signed-in users also get it attached to their history.
  api.post('/api/results', async (req) => {
    limit('results', req);
    const body = await readJson(req);
    const answers = decodeCode(body.code);
    if (!answers) throw new HttpError(400, 'Invalid result code', 'bad_code');
    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 40) || null : null;
    const user = sessions.user(req);
    // Claim: a guest who finishes, then signs up and saves, adopts their own
    // anonymous row (proved by its unguessable publicId) instead of creating a
    // second one — so the population atlas never double-counts them.
    if (user && typeof body.claim === 'string' && body.claim.length <= 16
      && store.claimResult(body.claim, body.code, user.id, Date.now() - 24 * 3600_000)) {
      statsCache = null;
      return { result: toPublicResult(store.getResult(body.claim)), saved: true, claimed: true };
    }
    // Idempotency: the same code from the same owner within 10 minutes is one run
    // (refreshes, double clicks, …).
    const dup = store.findRecentDuplicate(body.code, user?.id ?? null, Date.now() - 10 * 60_000);
    if (dup) return { result: toPublicResult(store.getResult(dup)), saved: !!user, duplicate: true };
    const r = analyze(answers, { bootstrap: 0 });
    const row = store.insertResult({
      publicId: newPublicId(), userId: user?.id ?? null, code: body.code, version: r.version,
      titleKey: r.titleKey, primary: r.primary, x: +r.point.x.toFixed(5), y: +r.point.y.toFixed(5),
      scores: Object.fromEntries(Object.entries(r.scores).map(([k, v]) => [k, +v.toFixed(4)])),
      isSeed: false, createdAt: Date.now(), label,
    });
    statsCache = null;
    return [201, { result: toPublicResult(row), saved: !!user }];
  });

  api.get('/api/results', (req) => {
    const u = requireUser(req);
    return { results: store.listResultsByUser(u.id, 200).map(toPublicResult) };
  });

  api.patch('/api/results/:id', async (req, _res, { id }) => {
    limit('write', req);
    const u = requireUser(req);
    const body = await readJson(req);
    const label = typeof body.label === 'string' ? body.label.trim().slice(0, 40) : '';
    if (!store.labelResult(id, u.id, label || null)) throw new HttpError(404, 'Run not found', 'not_found');
    return { ok: true, label: label || null };
  });

  api.delete('/api/results/:id', (req, _res, { id }) => {
    limit('write', req);
    const u = requireUser(req);
    if (!store.deleteResult(id, u.id)) throw new HttpError(404, 'Run not found', 'not_found');
    statsCache = null;
    return { ok: true };
  });

  api.get('/api/stats', () => {
    if (!statsCache || statsCache.at < Date.now() - STATS_TTL) {
      statsCache = { at: Date.now(), body: { bins: STATS_BINS, ...store.stats(STATS_BINS) } };
    }
    return statsCache.body;
  });

  /* --------------------------- SPA shell --------------------------- */
  const SPA_ROUTES = /^\/(quiz|me|atlas|about|r\/[0-9a-z]+)?\/?$/;

  function renderShell(req, pathname) {
    const entry = statics.load(path.join(ROOT, 'public', 'index.html'));
    let html = entry.raw.toString('utf8');
    const base = config.publicUrl || `http://${req.headers.host || 'localhost'}`;
    let title = 'PLAYERPRINT — the gamer soul atlas';
    let desc = 'A 26-question field test that maps what kind of player you really are onto a six-pole atlas. No sign-up needed.';
    const m = /^\/r\/([0-9a-z]+)\/?$/.exec(pathname);
    if (m && CODE_RE.test(m[1])) {
      const answers = decodeCode(m[1]);
      if (answers) {
        const r = analyze(answers, { bootstrap: 0 });
        title = `${r.title} · PLAYERPRINT`;
        desc = describeShort(r);
      }
    }
    const meta = [
      `<meta name="description" content="${escapeHtml(desc)}">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:site_name" content="PLAYERPRINT">`,
      `<meta property="og:title" content="${escapeHtml(title)}">`,
      `<meta property="og:description" content="${escapeHtml(desc)}">`,
      `<meta property="og:url" content="${escapeHtml(base + pathname)}">`,
      `<meta name="twitter:card" content="summary">`,
    ].join('\n    ');
    return html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`).replace('<!--META-->', meta);
  }

  /* ---------------------------- handler ---------------------------- */
  async function handle(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', CSP);
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    const url = new URL(req.url, 'http://x');
    const { pathname } = url;

    if (pathname.startsWith('/api/')) {
      try {
        // CSRF defence in depth: SameSite=Lax cookie + JSON-only bodies + same-origin check.
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          const origin = req.headers.origin;
          let originHost = null;
          try { originHost = origin ? new URL(origin).host : null; } catch { originHost = 'invalid'; }
          if (origin && originHost !== req.headers.host) throw new HttpError(403, 'Cross-origin request blocked', 'bad_origin');
        }
        const hit = api.match(req.method, pathname);
        if (!hit) throw new HttpError(404, 'Not found', 'not_found');
        if (hit.methodNotAllowed) throw new HttpError(405, 'Method not allowed', 'method_not_allowed');
        const out = await hit.handler(req, res, hit.params);
        if (Array.isArray(out)) sendJson(res, out[0], out[1]); else sendJson(res, 200, out);
      } catch (err) {
        if (err instanceof HttpError) sendJson(res, err.status, { error: err.message, code: err.code });
        else { console.error('[api]', err); sendJson(res, 500, { error: 'Something broke on our side', code: 'internal' }); }
      }
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    if (SPA_ROUTES.test(pathname)) { statics.html(req, res, renderShell(req, pathname)); return; }
    if (pathname !== '/index.html' && statics.serve(req, res, pathname)) return;

    statics.html(req, res, renderShell(req, pathname), 404);
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
  return { server, handle };
}
