import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { AXES, QUESTIONS } from './content.js';
import { BLENDS, PURE } from './insights.js';
import { createApp } from './index.js';
import { answersFor } from './readings.js';
import {
  ARCHETYPES,
  IDS,
  assessAffinity,
  assessAnswers,
  maxPossible,
  opposite,
} from './scoring.js';

const POLES = Object.fromEntries(AXES.map((axis) => [axis.id, [axis.pos, axis.neg]]));

function angleOf(x, y) {
  let deg = (Math.atan2(y, x) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

function nearAngle(actual, expected, slack = 8) {
  const delta = Math.abs(((actual - expected + 540) % 360) - 180);
  assert.ok(delta <= slack, `angle ${actual.toFixed(1)} expected near ${expected}`);
}

test('the instrument is balanced and on-axis', () => {
  assert.equal(QUESTIONS.length, 24);
  const counts = Object.fromEntries(AXES.map((axis) => [axis.id, 0]));
  const ceilings = maxPossible();
  for (const id of IDS) assert.equal(ceilings[id], 24, id);
  const ids = new Set();
  for (const q of QUESTIONS) {
    assert.ok(!ids.has(q.id));
    ids.add(q.id);
    counts[q.axis] += 1;
    assert.equal(q.options.length, 4);
    const [pos, neg] = POLES[q.axis];
    assert.ok(q.options.some((o) => o.weights[pos] === 3 && !o.weights[neg]));
    assert.ok(q.options.some((o) => o.weights[neg] === 3 && !o.weights[pos]));
    assert.ok(q.options.some((o) => o.weights[pos] === 2 && !o.weights[neg]));
    assert.ok(q.options.some((o) => o.weights[neg] === 2 && !o.weights[pos]));
    for (const option of q.options) {
      for (const key of Object.keys(option.weights)) {
        assert.ok(POLES[q.axis].includes(key), `${q.id} leaked ${key}`);
      }
    }
  }
  for (const axis of AXES) assert.equal(counts[axis.id], 8);
});

test('every blend has a written reading', () => {
  for (const a of IDS) {
    assert.ok(PURE[a]?.title);
    for (const b of IDS) {
      if (a === b) continue;
      assert.ok(BLENDS[a]?.[b]?.title, `missing blend ${a} × ${b}`);
      assert.ok(BLENDS[a][b].pull.length > 12);
    }
  }
});

test('placement respects poles, neighbors, and cancellations', () => {
  const blank = () => Object.fromEntries(IDS.map((id) => [id, 0]));

  const pure = blank();
  pure.architect = 1;
  const architect = assessAffinity(pure);
  nearAngle(angleOf(architect.point.x, architect.point.y), 90, 1);
  assert.ok(architect.reach > 0.85);
  assert.equal(architect.identity.mode, 'pure');
  assert.equal(architect.identity.primary, 'architect');

  const neighbors = blank();
  neighbors.architect = 1;
  neighbors.laureate = 1;
  const duo = assessAffinity(neighbors);
  nearAngle(angleOf(duo.point.x, duo.point.y), 60, 8);
  assert.ok(duo.reach > 0.75);
  assert.equal(duo.identity.mode, 'blend');
  assert.equal(duo.identity.primary, 'architect');
  assert.equal(duo.identity.secondary, 'laureate');

  const skip = blank();
  skip.architect = 1;
  skip.shade = 1;
  const wide = assessAffinity(skip);
  assert.ok(wide.reach > 0.45 && wide.reach < 0.8);
  assert.equal(wide.identity.primary, 'architect');
  assert.equal(wide.identity.secondary, 'shade');
  assert.ok(wide.highlight.includes('architect'));
  assert.ok(wide.highlight.includes('shade'));
  assert.ok(!wide.highlight.includes('laureate'));

  const paradox = blank();
  paradox.architect = 0.9;
  paradox.wildcard = 0.86;
  const burn = assessAffinity(paradox);
  assert.equal(burn.identity.mode, 'paradox');
  assert.equal(burn.identity.primary, 'architect');
  assert.equal(burn.identity.secondary, 'wildcard');
  assert.ok(burn.reach < 0.12);

  const cancel = blank();
  for (const id of IDS) cancel[id] = 0.8;
  const still = assessAffinity(cancel);
  assert.equal(still.identity.mode, 'still');
  assert.ok(still.reach < 0.08);

  const faint = blank();
  faint.nomad = 0.05;
  const sketch = assessAffinity(faint);
  assert.equal(sketch.identity.mode, 'faint');

  const mild = blank();
  mild.nomad = 0.3;
  assert.equal(assessAffinity(mild).identity.mode, 'pure');
});

test('a scripted answer key lands on the named readings', () => {
  const night = assessAnswers(answersFor({ composition: 'architect', company: 'shade' }));
  assert.equal(night.identity.primary, 'architect');
  assert.equal(night.identity.secondary, 'shade');
  assert.ok(night.echoes[0]);

  const squad = assessAnswers(answersFor({ destination: 'laureate', company: 'chorus' }));
  assert.equal(squad.identity.primary, 'laureate');
  assert.equal(squad.identity.secondary, 'chorus');

  let sx = 0;
  let sy = 0;
  let seed = 1;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const samples = 240;
  for (let n = 0; n < samples; n += 1) {
    const answers = {};
    for (const q of QUESTIONS) {
      answers[q.id] = q.options[Math.floor(rand() * q.options.length)].id;
    }
    const reading = assessAnswers(answers);
    sx += reading.point.x;
    sy += reading.point.y;
  }
  assert.ok(Math.abs(sx / samples) < 0.08, `east bias ${sx / samples}`);
  assert.ok(Math.abs(sy / samples) < 0.08, `north bias ${sy / samples}`);
});

test('opposites are three clean pairs', () => {
  for (const arch of ARCHETYPES) {
    assert.equal(opposite(opposite(arch.id)), arch.id);
    assert.notEqual(opposite(arch.id), arch.id);
  }
});

let app;
let base;

test.before(async () => {
  const dbFile = path.join(os.tmpdir(), `rift-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
  app = await createApp({ dbFile, port: 0, host: '127.0.0.1' });
  base = app.url;
});

test.after(async () => {
  await new Promise((resolve) => app.server.close(resolve));
  app.db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(app.dbFile + suffix, { force: true });
  }
});

async function call(urlPath, { method = 'GET', body, cookie } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`${base}${urlPath}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const setCookie = typeof res.headers.getSetCookie === 'function'
    ? (res.headers.getSetCookie()[0] || '')
    : (res.headers.get('set-cookie') || '');
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text, cookie: setCookie.split(';')[0] };
}

test('http: quiz, sample chart, auth, claim, and card', async () => {
  const health = await call('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.json.ok, true);

  const quiz = await call('/api/quiz');
  assert.equal(quiz.json.questions.length, 24);
  assert.equal(JSON.stringify(quiz.json).includes('weights'), false);
  assert.equal(JSON.stringify(quiz.json).includes('echo'), false);

  const anon = await call('/api/auth/me');
  assert.equal(anon.json.user, null);

  const sample = await call('/api/results/sample');
  assert.equal(sample.status, 200);
  assert.equal(sample.json.title, 'The Night Draftsman');
  assert.equal(sample.json.owned, false);
  assert.equal(sample.json.answers, null);
  assert.equal(sample.json.comparison, null);
  assert.ok(sample.json.point);

  const card = await call('/api/results/sample/card.svg');
  assert.equal(card.status, 200);
  assert.ok(card.text.includes('<svg'));
  assert.ok(card.text.includes('The Night Draftsman'));

  const bad = await call('/api/results', { method: 'POST', body: { answers: { q01: 'a' }, callsign: 'Test' } });
  assert.equal(bad.status, 400);

  const guestAnswers = answersFor({ composition: 'wildcard', destination: 'nomad' });
  const claim = 'ab'.repeat(24);
  const guest = await call('/api/results', {
    method: 'POST',
    body: { answers: guestAnswers, callsign: 'Guest Signal' },
    cookie: `rift_session=`,
  });
  assert.equal(guest.status, 201, guest.text);
  assert.equal(guest.json.owned, true);
  assert.equal(guest.json.answers.length, 24);

  const guestOwned = await call(`/api/results/${guest.json.slug}`, {
    cookie: '',
  });
  // no claim header yet
  assert.equal(guestOwned.json.owned, false);

  const withClaim = await fetch(`${base}/api/results/${guest.json.slug}`, {
    headers: { 'x-claim-token': claim },
  });
  // claim was not stored because the create call did not send it
  assert.equal(withClaim.status, 200);

  const claimedCreate = await fetch(`${base}/api/results`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-claim-token': claim },
    body: JSON.stringify({ answers: guestAnswers, callsign: 'Claimed' }),
  });
  const claimedBody = await claimedCreate.json();
  assert.equal(claimedCreate.status, 201);
  const claimedRead = await fetch(`${base}/api/results/${claimedBody.slug}`, {
    headers: { 'x-claim-token': claim },
  });
  const claimedReadBody = await claimedRead.json();
  assert.equal(claimedReadBody.owned, true);
  assert.equal(claimedReadBody.answers.length, 24);

  const login = await call('/api/auth/login', {
    method: 'POST',
    body: { email: 'ada@riftindex.demo', password: 'night-desk' },
  });
  assert.equal(login.status, 200, login.text);
  assert.equal(login.json.user.displayName, 'Ada Quill');
  assert.ok(login.cookie.startsWith('rift_session='));

  const history = await call('/api/me/history', { cookie: login.cookie });
  assert.equal(history.status, 200);
  const slugs = history.json.readings.map((r) => r.slug);
  assert.ok(slugs.includes('sample'));
  assert.ok(slugs.includes('firstwin'));
  assert.ok(slugs.includes('sidetrip'));

  const ownedSample = await call('/api/results/sample', { cookie: login.cookie });
  assert.equal(ownedSample.json.owned, true);
  assert.ok(ownedSample.json.comparison);
  assert.match(ownedSample.json.comparison.narrative, /Since /);
  assert.equal(ownedSample.json.answers.length, 24);

  const nope = await call('/api/auth/login', {
    method: 'POST',
    body: { email: 'ada@riftindex.demo', password: 'wrong-password' },
  });
  assert.equal(nope.status, 401);

  const project = await call('/api/project', {
    method: 'POST',
    body: { affinity: { architect: 1, wildcard: 0, laureate: 0, nomad: 0, chorus: 0, shade: 0 } },
  });
  assert.equal(project.status, 200);
  assert.equal(project.json.primary.id, 'architect');
  assert.ok(project.json.point.y > 0.8);

  const registered = await call('/api/auth/register', {
    method: 'POST',
    body: { email: 'new@riftindex.demo', password: 'long-enough', displayName: 'New File' },
  });
  assert.equal(registered.status, 201, registered.text);
  const claimRes = await fetch(`${base}/api/claim`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: registered.cookie, 'x-claim-token': claim },
    body: '{}',
  });
  const claimJson = await claimRes.json();
  assert.equal(claimRes.status, 200);
  assert.equal(claimJson.claimed, 1);
  const newHistory = await call('/api/me/history', { cookie: registered.cookie });
  assert.ok(newHistory.json.readings.some((r) => r.slug === claimedBody.slug));

  const home = await call('/');
  assert.equal(home.status, 200);
  assert.ok(home.text.includes('Rift Index'));

  const weights = await call('/api/results/nope');
  assert.equal(weights.status, 404);
});
