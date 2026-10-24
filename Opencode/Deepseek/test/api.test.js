import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { QUESTIONS } from '../shared/quiz.data.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let base;
let server;
let cookie = '';

const answers = QUESTIONS.map((q, i) => i % q.options.length);

before(async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'psyche-api-'));
  const config = {
    root,
    publicDir: path.join(root, 'public'),
    dataDir,
    port: 0,
    host: '127.0.0.1',
    sessionTtlMs: 3600_000,
    cookieSecure: false,
    trustProxy: false,
    demoUser: { username: 'PLAYER1', password: 'arcade123' }
  };
  const app = await createApp(config, { log: () => {} });
  server = app.server;
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

async function call(method, url, body) {
  const res = await fetch(`${base}${url}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie && !setCookie.startsWith('pp_session=;')) {
    cookie = setCookie.split(';')[0];
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, headers: res.headers, text, json };
}

test('quiz endpoint serves all 25 questions without leaking scoring weights', async () => {
  const res = await call('GET', '/api/quiz');
  assert.equal(res.status, 200);
  assert.equal(res.json.questions.length, 25);
  assert.equal(res.json.archetypes.length, 6);
  assert.equal(res.json.pairs.length, 3);
  assert.ok(!res.text.includes('"w"'), 'weights must never reach the client');
});

test('stats and field endpoints reflect the seeded ghost field', async () => {
  const stats = await call('GET', '/api/stats');
  assert.equal(stats.status, 200);
  assert.ok(stats.json.fieldPoints > 500);
  assert.equal(stats.json.players, 1);
  const field = await call('GET', '/api/field');
  assert.equal(field.status, 200);
  assert.ok(field.json.points.length > 0);
  assert.ok(field.json.points.length <= 1500);
  assert.equal(field.json.points[0].length, 3);
});

test('result endpoint scores answers, records a field point and builds insight', async () => {
  const res = await call('POST', '/api/result', { answers, record: true });
  assert.equal(res.status, 200);
  assert.equal(res.json.result.scores.length, 6);
  assert.ok(res.json.result.dominant);
  assert.ok(res.json.insight.title.length > 3);
  assert.ok(res.json.insight.paragraphs.length >= 3);
  assert.match(res.json.shareCode, /^[0-9a-z]+$/);
  assert.equal(res.json.fieldRecorded, true);
  assert.equal(res.json.saved, false);
});

test('share codes reproduce the identical scan', async () => {
  const first = await call('POST', '/api/result', { answers });
  const shared = await call('POST', '/api/result', { code: first.json.shareCode });
  assert.equal(shared.status, 200);
  assert.deepEqual(shared.json.result.scores, first.json.result.scores);
  assert.deepEqual(shared.json.result.coord, first.json.result.coord);
  assert.equal(shared.json.insight.title, first.json.insight.title);
});

test('invalid payloads are rejected with useful errors', async () => {
  const badCode = await call('POST', '/api/result', { code: 'not-a-real-code' });
  assert.equal(badCode.status, 400);
  assert.equal(badCode.json.error.code, 'bad_code');
  const badAnswers = await call('POST', '/api/result', { answers: [1, 2, 3] });
  assert.equal(badAnswers.status, 400);
  const missing = await call('POST', '/api/result', {});
  assert.equal(missing.status, 400);
  const wrongType = await fetch(`${base}/api/result`, { method: 'POST', body: 'plain' });
  assert.equal(wrongType.status, 400);
});

test('auth flow: register, me, archive, delete, logout, login', async () => {
  const registered = await call('POST', '/api/auth/register', { username: 'NEWBIE', password: 'longenough1' });
  assert.equal(registered.status, 201);
  assert.equal(registered.json.user.username, 'NEWBIE');

  const me = await call('GET', '/api/auth/me');
  assert.equal(me.json.user.username, 'NEWBIE');

  const saved = await call('POST', '/api/attempts', { answers });
  assert.equal(saved.status, 201);
  assert.ok(saved.json.attempt.title);

  const list = await call('GET', '/api/attempts');
  assert.equal(list.json.attempts.length, 1);
  assert.deepEqual(list.json.attempts[0].answers, answers);

  const removed = await call('DELETE', `/api/attempts/${saved.json.attempt.id}`);
  assert.equal(removed.status, 200);
  const empty = await call('GET', '/api/attempts');
  assert.equal(empty.json.attempts.length, 0);

  const logout = await call('POST', '/api/auth/logout', {});
  assert.equal(logout.status, 200);
  const afterLogout = await call('GET', '/api/auth/me');
  assert.equal(afterLogout.json.user, null);

  const login = await call('POST', '/api/auth/login', { username: 'newbie', password: 'longenough1' });
  assert.equal(login.status, 200);
  assert.equal(login.json.user.username, 'NEWBIE');
});

test('signed-in scans are archived automatically and demo account works', async () => {
  cookie = '';
  const login = await call('POST', '/api/auth/login', { username: 'PLAYER1', password: 'arcade123' });
  assert.equal(login.status, 200);
  const history = await call('GET', '/api/attempts');
  assert.equal(history.json.attempts.length, 3);
  const scan = await call('POST', '/api/result', { answers, record: true });
  assert.equal(scan.json.saved, true);
  assert.ok(scan.json.attemptId);
  const after = await call('GET', '/api/attempts');
  assert.equal(after.json.attempts.length, 4);
  assert.ok(after.json.attempts[0].title);
});

test('registration guards: duplicate handle and weak password', async () => {
  const dup = await call('POST', '/api/auth/register', { username: 'PLAYER1', password: 'somethinglong' });
  assert.equal(dup.status, 409);
  const weak = await call('POST', '/api/auth/register', { username: 'FRESH', password: 'short' });
  assert.equal(weak.status, 400);
  const badLogin = await call('POST', '/api/auth/login', { username: 'PLAYER1', password: 'wrongpassword' });
  assert.equal(badLogin.status, 401);
});

test('static shell and security headers are served', async () => {
  const res = await call('GET', '/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  const missing = await call('GET', '/api/nope');
  assert.equal(missing.status, 404);
});
