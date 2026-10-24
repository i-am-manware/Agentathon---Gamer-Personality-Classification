// End-to-end API tests against a real server on an ephemeral port, run once per
// storage adapter (SQLite and the JSON fallback) to prove they are interchangeable.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openStore } from '../server/db/index.js';
import { sqliteAvailable } from '../server/db/sqlite.js';
import { createApp } from '../server/app.js';
import { seed } from '../server/seed.js';
import { QUESTIONS, encodeAnswers } from '../shared/engine.js';

const codeOf = (fill) => encodeAnswers(QUESTIONS.map((q, i) => fill(q, i)));
const CODE_A = codeOf((q, i) => i % (q.type === 'versus' ? 2 : 4));
const CODE_B = codeOf((q) => (q.type === 'spectrum' ? 4 : 1));

const HAS_SQLITE = await sqliteAvailable();

for (const kind of ['sqlite', 'json']) {
  const skip = kind === 'sqlite' && !HAS_SQLITE ? 'node:sqlite not available on this Node version' : false;
  describe(`API (${kind} store)`, { skip }, () => {
    let server, base, store, dir;
    const jar = { cookie: '' };

    async function call(method, url, { body, cookie = jar.cookie, headers = {}, raw = false } = {}) {
      const res = await fetch(base + url, {
        method,
        headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
        body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
        redirect: 'manual',
      });
      const setCookie = res.headers.get('set-cookie');
      if (setCookie && cookie === jar.cookie) jar.cookie = setCookie.split(';')[0];
      if (raw) return res;
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* html */ }
      return { status: res.status, json, text, headers: res.headers };
    }

    before(async () => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), `pp-${kind}-`));
      store = await openStore({ dataDir: dir, store: kind });
      await seed(store, { players: 40, log: () => {} });
      ({ server } = createApp({ store, config: { sessionDays: 1, secureCookies: false, publicUrl: '' } }));
      await new Promise((r) => server.listen(0, '127.0.0.1', r));
      base = `http://127.0.0.1:${server.address().port}`;
    });
    after(async () => {
      await new Promise((r) => server.close(r));
      store.close();
      fs.rmSync(dir, { recursive: true, force: true });
    });

    test('health + seeded stats', async () => {
      const h = await call('GET', '/api/health');
      assert.equal(h.status, 200);
      assert.equal(h.json.store, kind);
      const s = await call('GET', '/api/stats');
      assert.equal(s.json.total, 44); // 40 simulated + 4 demo runs
      assert.equal(s.json.bins, 20);
      assert.ok(s.json.grid.every(([bx, by, n]) => bx >= 0 && bx < 20 && by >= 0 && by < 20 && n > 0));
    });

    test('guest can submit a result; resubmits are idempotent', async () => {
      const a = await call('POST', '/api/results', { body: { code: CODE_A }, cookie: '' });
      assert.equal(a.status, 201);
      assert.equal(a.json.saved, false);
      assert.equal(a.json.result.code, CODE_A);
      const b = await call('POST', '/api/results', { body: { code: CODE_A }, cookie: '' });
      assert.equal(b.json.duplicate, true);
      assert.equal(b.json.result.publicId, a.json.result.publicId);
    });

    test('input validation', async () => {
      assert.equal((await call('POST', '/api/results', { body: { code: 'nope' } })).status, 400);
      assert.equal((await call('POST', '/api/results', { body: '{oops', cookie: '' })).status, 400);
      assert.equal((await call('POST', '/api/results', { body: 'code=1', headers: { 'Content-Type': 'text/plain' } })).status, 415);
      assert.equal((await call('POST', '/api/results', { body: { code: 'x'.repeat(20000) } })).status, 413);
      assert.equal((await call('POST', '/api/auth/register', { body: { username: 'a', password: 'longenough' }, cookie: '' })).status, 400);
      assert.equal((await call('POST', '/api/auth/register', { body: { username: 'valid_name', password: 'short' }, cookie: '' })).status, 400);
    });

    test('cross-origin writes are rejected', async () => {
      const r = await call('POST', '/api/auth/logout', { body: {}, headers: { Origin: 'https://evil.example' } });
      assert.equal(r.status, 403);
    });

    test('register → me → logout → login, with history and claim', async () => {
      // guest run that will later be claimed
      const guest = await call('POST', '/api/results', { body: { code: CODE_B }, cookie: '' });
      const before = (await call('GET', '/api/stats')).json.total;

      const reg = await call('POST', '/api/auth/register', { body: { username: 'Tester_1', password: 'correct horse' } });
      assert.equal(reg.status, 201);
      assert.match(jar.cookie, /^pp_session=/);
      assert.equal((await call('POST', '/api/auth/register', { body: { username: 'tester_1', password: 'correct horse' }, cookie: '' })).status, 409, 'usernames are case-insensitive');

      const me = await call('GET', '/api/me');
      assert.equal(me.json.user.username, 'Tester_1');

      const claimed = await call('POST', '/api/results', { body: { code: CODE_B, claim: guest.json.result.publicId } });
      assert.equal(claimed.json.claimed, true);
      assert.equal((await call('GET', '/api/stats')).json.total, before, 'claim does not double count');

      const saved = await call('POST', '/api/results', { body: { code: CODE_A, label: 'first try' } });
      assert.equal(saved.status, 201);
      assert.equal(saved.json.saved, true);

      const hist = await call('GET', '/api/results');
      assert.equal(hist.json.results.length, 2);
      const id = hist.json.results.find((r) => r.code === CODE_A).publicId;

      assert.equal((await call('PATCH', `/api/results/${id}`, { body: { label: 'renamed era' } })).json.label, 'renamed era');
      assert.equal((await call('GET', '/api/results')).json.results.find((r) => r.publicId === id).label, 'renamed era');

      await call('POST', '/api/auth/logout', { body: {} });
      assert.equal((await call('GET', '/api/me', { cookie: jar.cookie })).json.user, null);
      assert.equal((await call('GET', '/api/results')).status, 401);

      assert.equal((await call('POST', '/api/auth/login', { body: { username: 'tester_1', password: 'wrong pass' }, cookie: '' })).status, 401);
      const login = await call('POST', '/api/auth/login', { body: { username: 'TESTER_1', password: 'correct horse' }, cookie: '' });
      assert.equal(login.status, 200);
      jar.cookie = login.headers.get('set-cookie').split(';')[0];
      assert.equal((await call('GET', '/api/results')).json.results.length, 2);

      // other users cannot touch this run
      const other = await call('POST', '/api/auth/register', { body: { username: 'intruder', password: 'password123' }, cookie: '' });
      const otherCookie = other.headers.get('set-cookie').split(';')[0];
      assert.equal((await call('DELETE', `/api/results/${id}`, { cookie: otherCookie })).status, 404);
      assert.equal((await call('DELETE', `/api/results/${id}`)).status, 200);
      assert.equal((await call('GET', '/api/results')).json.results.length, 1);
    });

    test('demo account works', async () => {
      const r = await call('POST', '/api/auth/login', { body: { username: 'demo', password: 'playerprint' }, cookie: '' });
      assert.equal(r.status, 200);
      const c = r.headers.get('set-cookie').split(';')[0];
      const hist = await call('GET', '/api/results', { cookie: c });
      assert.equal(hist.json.results.length, 4);
      assert.ok(hist.json.results.some((x) => x.label === 'Animal Crossing era'));
    });

    test('session cookie is HttpOnly + SameSite', async () => {
      const r = await call('POST', '/api/auth/login', { body: { username: 'demo', password: 'playerprint' }, cookie: '', raw: true });
      const sc = r.headers.get('set-cookie');
      assert.match(sc, /HttpOnly/);
      assert.match(sc, /SameSite=Lax/);
    });

    test('SPA shell injects per-result Open Graph tags', async () => {
      const r = await call('GET', `/r/${CODE_A}`);
      assert.equal(r.status, 200);
      assert.match(r.text, /<title>The [A-Za-z ]+ · PLAYERPRINT<\/title>/);
      assert.match(r.text, /property="og:description" content="[^"]+"/);
      assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
    });

    test('static files: etag/304, traversal guard, 404s', async () => {
      const a = await call('GET', '/shared/engine.js', { raw: true });
      assert.equal(a.status, 200);
      const etag = a.headers.get('etag');
      assert.ok(etag);
      const b = await call('GET', '/shared/engine.js', { headers: { 'If-None-Match': etag }, raw: true });
      assert.equal(b.status, 304);
      assert.equal((await call('GET', '/shared/../server/auth.js', { raw: true })).status, 404);
      assert.equal((await call('GET', '/%2e%2e/package.json', { raw: true })).status, 404);
      assert.equal((await call('GET', '/definitely-not-here', { raw: true })).status, 404);
      assert.equal((await call('GET', '/api/nope')).status, 404);
      assert.equal((await call('PUT', '/api/results')).status, 405);
    });
  });
}
