import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  DUMMY_HASH,
  cleanCallsign,
  cleanEmail,
  cleanName,
  clearSessionCookie,
  hashPassword,
  newSessionToken,
  readCookies,
  sessionCookie,
  sessionExpiry,
  sha256,
  validClaim,
  verifyPassword,
} from './auth.js';
import { AXES, DEMOS, publicQuiz } from './content.js';
import { all, get, openDatabase, run } from './db.js';
import { narrate } from './insights.js';
import { comparisonNarrative, markers } from './present.js';
import { projectAffinity, saveReading } from './readings.js';
import { assessAffinity } from './scoring.js';
import { present } from './present.js';
import { seed } from './seed.js';
import { QUESTIONS } from './content.js';
import { renderCard } from './svgcard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const buckets = new Map();

function limited(key, max, windowMs) {
  const now = Date.now();
  const fresh = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (fresh.length >= max) {
    buckets.set(key, fresh);
    return true;
  }
  fresh.push(now);
  buckets.set(key, fresh);
  if (buckets.size > 4000) {
    for (const [k, times] of buckets) {
      if (!times.some((t) => now - t < windowMs)) buckets.delete(k);
    }
  }
  return false;
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  return err;
}

function securityHeaders() {
  return {
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'x-frame-options': 'DENY',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'",
  };
}

function send(res, status, body, extra = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...securityHeaders(),
    ...extra,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 200_000) {
        reject(httpError(413, 'That request is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!size) return resolve({});
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(httpError(400, 'The desk could not read that JSON.'));
          return;
        }
        resolve(parsed);
      } catch {
        reject(httpError(400, 'The desk could not read that JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function assertOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    throw httpError(403, 'Bad origin.');
  }
  if (host !== req.headers.host) throw httpError(403, 'Bad origin.');
}

function currentUser(db, req) {
  const token = readCookies(req).rift_session;
  if (!token) return null;
  const row = get(
    db,
    `SELECT u.id, u.email, u.display_name AS displayName, u.created_at AS createdAt, s.expires_at AS expiresAt
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ?`,
    sha256(token),
  );
  if (!row || row.expiresAt < Date.now()) return null;
  return { id: row.id, email: row.email, displayName: row.displayName, createdAt: row.createdAt };
}

function issueSession(db, res, userId) {
  const token = newSessionToken();
  run(
    db,
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    sha256(token),
    userId,
    sessionExpiry(),
  );
  return { 'set-cookie': sessionCookie(token) };
}

function makeSlug(db) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const bytes = crypto.randomBytes(8);
    let slug = '';
    for (let i = 0; i < 8; i += 1) slug += alphabet[bytes[i] % alphabet.length];
    if (slug === 'sample') continue;
    if (!get(db, 'SELECT 1 AS ok FROM results WHERE share_slug = ?', slug)) return slug;
  }
  throw httpError(500, 'Could not issue a chart number.');
}

function claimHashFrom(req) {
  const token = validClaim(req.headers['x-claim-token']);
  return token ? sha256(token) : null;
}

function owns(row, user, claimHash) {
  if (user && row.user_id && row.user_id === user.id) return true;
  if (claimHash && row.claim_token_hash && row.claim_token_hash === claimHash) return true;
  return false;
}

function previousRow(db, row) {
  if (row.user_id) {
    return get(
      db,
      'SELECT * FROM results WHERE user_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT 1',
      row.user_id,
      row.created_at,
    );
  }
  if (row.claim_token_hash) {
    return get(
      db,
      'SELECT * FROM results WHERE user_id IS NULL AND claim_token_hash = ? AND created_at < ? ORDER BY created_at DESC LIMIT 1',
      row.claim_token_hash,
      row.created_at,
    );
  }
  return undefined;
}

function answersView(answersJson) {
  const map = JSON.parse(answersJson);
  return QUESTIONS.map((q) => {
    const chosen = q.options.find((o) => o.id === map[q.id]);
    return {
      id: q.id,
      kicker: q.kicker,
      prompt: q.prompt,
      choice: chosen ? chosen.text : '',
    };
  });
}

function readResult(db, req, slug, { forceOwned = false } = {}) {
  const row = get(db, 'SELECT * FROM results WHERE share_slug = ?', slug);
  if (!row) throw httpError(404, 'This chart is not on file.');
  const profile = JSON.parse(row.profile_json);
  const user = currentUser(db, req);
  const claimHash = claimHashFrom(req);
  const owned = forceOwned || owns(row, user, claimHash);
  let comparison = null;
  if (owned) {
    const prev = previousRow(db, row);
    if (prev) comparison = comparisonNarrative(JSON.parse(prev.profile_json), profile);
  }
  return {
    ...profile,
    owned,
    comparison,
    answers: owned ? answersView(row.answers_json) : null,
  };
}

function requireUser(user) {
  if (!user) throw httpError(401, 'Sign in to open your file.');
  return user;
}

function atlasPayload() {
  const demos = DEMOS.map((demo) => {
    const scored = assessAffinity(demo.affinity);
    return present(scored, narrate(scored), {
      callsign: 'Demonstration',
      slug: null,
      createdAt: null,
    });
  });
  return {
    archetypes: markers(),
    pairs: AXES.map((axis) => ({
      id: axis.id,
      label: axis.label,
      hint: axis.hint,
      pos: axis.pos,
      neg: axis.neg,
    })),
    demos,
  };
}

async function handleApi(req, res, db, url) {
  const method = req.method || 'GET';
  const pathname = url.pathname;
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE') assertOrigin(req);
  const body = method === 'GET' || method === 'HEAD' ? {} : await readBody(req);
  const user = currentUser(db, req);
  const ip = req.socket.remoteAddress || 'local';

  if (method === 'GET' && pathname === '/api/health') {
    return send(res, 200, { ok: true, algo: 1 });
  }
  if (method === 'GET' && pathname === '/api/quiz') {
    return send(res, 200, publicQuiz());
  }
  if (method === 'GET' && pathname === '/api/atlas') {
    return send(res, 200, atlasPayload());
  }
  if (method === 'GET' && pathname === '/api/auth/me') {
    return send(res, 200, { user: user || null });
  }
  if (method === 'POST' && pathname === '/api/auth/register') {
    if (limited(`register:${ip}`, 8, 60 * 60 * 1000)) {
      throw httpError(429, 'Too many new files from this desk. Try again later.');
    }
    const email = cleanEmail(body.email);
    const password = String(body.password ?? '');
    const displayName = cleanName(body.displayName);
    if (!email) throw httpError(400, 'Use a real email address.');
    if (password.length < 8 || password.length > 72) {
      throw httpError(400, 'Use a password between 8 and 72 characters.');
    }
    if (!displayName) throw httpError(400, 'Give the file a name, up to 24 characters.');
    if (get(db, 'SELECT 1 AS ok FROM users WHERE email = ?', email)) {
      throw httpError(409, 'That email already has a file.');
    }
    const id = crypto.randomUUID();
    run(
      db,
      'INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      id,
      email,
      displayName,
      hashPassword(password),
      Date.now(),
    );
    const headers = issueSession(db, res, id);
    return send(res, 201, { user: { id, email, displayName, createdAt: Date.now() } }, headers);
  }
  if (method === 'POST' && pathname === '/api/auth/login') {
    if (limited(`login:${ip}`, 10, 10 * 60 * 1000)) {
      throw httpError(429, 'Too many sign-in attempts. Give the desk a minute.');
    }
    const email = cleanEmail(body.email);
    const password = String(body.password ?? '');
    const row = email
      ? get(db, 'SELECT id, email, display_name AS displayName, created_at AS createdAt, password_hash AS passwordHash FROM users WHERE email = ?', email)
      : undefined;
    const ok = verifyPassword(password, row ? row.passwordHash : DUMMY_HASH);
    if (!row || !ok) throw httpError(401, 'That email and password do not match.');
    const headers = issueSession(db, res, row.id);
    return send(res, 200, {
      user: { id: row.id, email: row.email, displayName: row.displayName, createdAt: row.createdAt },
    }, headers);
  }
  if (method === 'POST' && pathname === '/api/auth/logout') {
    const token = readCookies(req).rift_session;
    if (token) run(db, 'DELETE FROM sessions WHERE token_hash = ?', sha256(token));
    return send(res, 200, { ok: true }, { 'set-cookie': clearSessionCookie() });
  }
  if (method === 'PATCH' && pathname === '/api/me') {
    const current = requireUser(user);
    const displayName = cleanName(body.displayName);
    if (!displayName) throw httpError(400, 'Give the file a name, up to 24 characters.');
    run(db, 'UPDATE users SET display_name = ? WHERE id = ?', displayName, current.id);
    return send(res, 200, { user: { ...current, displayName } });
  }
  if (method === 'DELETE' && pathname === '/api/me') {
    const current = requireUser(user);
    run(db, 'DELETE FROM users WHERE id = ?', current.id);
    return send(res, 200, { ok: true }, { 'set-cookie': clearSessionCookie() });
  }
  if (method === 'POST' && pathname === '/api/claim') {
    const current = requireUser(user);
    const token = validClaim(req.headers['x-claim-token']);
    if (!token) return send(res, 200, { claimed: 0 });
    const hash = sha256(token);
    const rows = all(
      db,
      'SELECT id FROM results WHERE claim_token_hash = ? AND user_id IS NULL',
      hash,
    );
    for (const row of rows) {
      run(db, 'UPDATE results SET user_id = ? WHERE id = ?', current.id, row.id);
    }
    return send(res, 200, { claimed: rows.length });
  }
  if (method === 'GET' && pathname === '/api/me/history') {
    const current = requireUser(user);
    const rows = all(
      db,
      'SELECT share_slug, callsign, profile_json, created_at FROM results WHERE user_id = ? ORDER BY created_at DESC',
      current.id,
    );
    const readings = rows.map((row) => {
      const profile = JSON.parse(row.profile_json);
      return {
        slug: row.share_slug,
        callsign: row.callsign,
        title: profile.title,
        epithet: profile.epithet,
        createdAt: row.created_at,
        point: profile.point,
        primary: profile.primary,
        secondary: profile.secondary,
        scores: profile.scores,
      };
    });
    return send(res, 200, { user: current, readings });
  }
  if (method === 'POST' && pathname === '/api/project') {
    if (limited(`project:${ip}`, 180, 60 * 1000)) {
      throw httpError(429, 'The playground needs a breath.');
    }
    const affinity = body.affinity;
    if (!affinity || typeof affinity !== 'object') throw httpError(400, 'Send six affinities between 0 and 1.');
    return send(res, 200, projectAffinity(affinity));
  }
  if (method === 'POST' && pathname === '/api/results') {
    if (limited(`results:${ip}`, 40, 60 * 60 * 1000)) {
      throw httpError(429, 'Too many readings. Give the desk a minute.');
    }
    const callsign = cleanCallsign(body.callsign, user?.displayName || 'Operator');
    const slug = makeSlug(db);
    const claimHash = user ? null : claimHashFrom(req);
    saveReading(db, {
      userId: user ? user.id : null,
      slug,
      callsign,
      answers: body.answers,
      claimHash,
      createdAt: Date.now(),
    });
    return send(res, 201, readResult(db, req, slug, { forceOwned: true }));
  }

  const card = pathname.match(/^\/api\/results\/([a-z0-9]+)\/card\.svg$/);
  if (method === 'GET' && card) {
    const row = get(db, 'SELECT profile_json FROM results WHERE share_slug = ?', card[1]);
    if (!row) throw httpError(404, 'This chart is not on file.');
    const svg = renderCard(JSON.parse(row.profile_json));
    res.writeHead(200, {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'private, max-age=300',
      ...securityHeaders(),
    });
    res.end(svg);
    return;
  }

  const detail = pathname.match(/^\/api\/results\/([a-z0-9]+)$/);
  if (detail && method === 'GET') {
    return send(res, 200, readResult(db, req, detail[1]));
  }
  if (detail && method === 'DELETE') {
    const current = requireUser(user);
    const row = get(db, 'SELECT id, user_id FROM results WHERE share_slug = ?', detail[1]);
    if (!row) throw httpError(404, 'This chart is not on file.');
    if (row.user_id !== current.id) throw httpError(403, 'That chart is filed under someone else.');
    run(db, 'DELETE FROM results WHERE id = ?', row.id);
    return send(res, 200, { ok: true });
  }

  throw httpError(404, 'No such route on the night desk.');
}

function resolvePublic(pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const target = path.resolve(publicDir, `.${decoded}`);
  const rel = path.relative(publicDir, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return target;
}

function escAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function spaHtml(profile) {
  let html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  if (!profile) return html;
  const title = `${profile.title} — Rift Index`;
  const desc = profile.pull || profile.epithet || 'A coordinate on the playfield.';
  const meta = `<meta property="og:title" content="${escAttr(title)}"><meta property="og:description" content="${escAttr(desc)}"><meta name="description" content="${escAttr(desc)}">`;
  html = html.replace('<title>Rift Index</title>', `<title>${escAttr(title)}</title>`);
  html = html.replace('</head>', `${meta}</head>`);
  return html;
}

async function handle(req, res, db) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `http://${host}`);
  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, db, url);
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, { error: 'That method is not on the desk.' });
    return;
  }
  const filePath = resolvePublic(url.pathname);
  if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const cache = ext === '.woff2' || ext === '.svg'
      ? 'public, max-age=86400'
      : 'no-cache';
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': cache,
      ...securityHeaders(),
    });
    res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(filePath));
    return;
  }
  if (path.extname(url.pathname)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', ...securityHeaders() });
    res.end('Not found');
    return;
  }
  const chart = url.pathname.match(/^\/r\/([a-z0-9]+)$/);
  let profile = null;
  if (chart) {
    const row = get(db, 'SELECT profile_json FROM results WHERE share_slug = ?', chart[1]);
    if (row) profile = JSON.parse(row.profile_json);
  }
  const html = spaHtml(profile);
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-cache',
    ...securityHeaders(),
  });
  res.end(req.method === 'HEAD' ? undefined : html);
}

export async function createApp({ dbFile, port = 0, host = '127.0.0.1' } = {}) {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 24) {
    throw Object.assign(new Error(`Rift Index needs Node.js 24 or newer. You have ${process.version}.`), { expose: true });
  }
  const db = openDatabase(dbFile);
  seed(db);
  const server = http.createServer((req, res) => {
    handle(req, res, db).catch((err) => {
      const status = err.status || 500;
      if (status >= 500) console.error(err);
      if (res.headersSent) {
        res.end();
        return;
      }
      send(res, status, { error: err.expose ? err.message : 'Something broke on the night desk.' });
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  return { server, db, dbFile, port: address.port, url: `http://127.0.0.1:${address.port}` };
}

function launchedDirectly() {
  const arg = process.argv[1];
  if (!arg) return false;
  try {
    return pathToFileURL(path.resolve(arg)).href.toLowerCase() === import.meta.url.toLowerCase();
  } catch {
    return false;
  }
}

function main() {
  const major = Number(process.versions.node.split('.')[0]);
  if (major < 24) {
    console.error(`Rift Index needs Node.js 24 or newer for built-in SQLite. You have ${process.version}.`);
    console.error('Install Node 24 from https://nodejs.org and run again.');
    process.exit(1);
  }
  const port = Number(process.env.PORT || 4321);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT must be an integer between 1 and 65535.');
    process.exit(1);
  }
  const dbFile = path.join(root, 'data', 'rift.sqlite');
  createApp({ dbFile, port, host: '0.0.0.0' }).then((app) => {
    console.log('');
    console.log('  Rift Index');
    console.log(`  local          http://localhost:${app.port}`);
    console.log(`  sample chart   http://localhost:${app.port}/r/sample`);
    console.log('  night desk     ada@riftindex.demo');
    console.log('  password       night-desk');
    console.log('');
    const shutdown = () => {
      app.server.close(() => {
        try { app.db.close(); } catch { /* already closed */ }
        process.exit(0);
      });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }).catch((err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Set PORT to a free port and run again.`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });
}

if (launchedDirectly()) main();
