'use strict';

/**
 * HEXAXIS smoke test — exercises the whole product surface against a live
 * server. Spawns its own server on a scratch port with a scratch data file,
 * so it never touches real data.
 *
 *   node scripts/smoke.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3791;
const BASE = `http://localhost:${PORT}`;
const SCRATCH = path.join(__dirname, '..', 'data', 'smoke-store.json');

let passed = 0, failed = 0;
function ok(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name} ${extra}`); }
}

async function req(method, url, body, cookie) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

async function main() {
  try { fs.unlinkSync(SCRATCH); } catch { /* fresh */ }
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT: String(PORT), DATA_FILE: SCRATCH },
    stdio: 'ignore',
  });
  await new Promise((resolve) => {
    const t = setInterval(async () => {
      try { await fetch(BASE + '/api/health'); clearInterval(t); resolve(); } catch { /* wait */ }
    }, 150);
    setTimeout(() => { clearInterval(t); resolve(); }, 8000);
  });

  console.log('\n— static & shell —');
  {
    const r = await req('GET', '/');
    ok('GET / serves HTML', r.status === 200 && String(r.data).includes('HEXAXIS'));
    const c = await req('GET', '/css/main.css');
    ok('GET /css/main.css', c.status === 200);
    const j = await req('GET', '/js/app.js');
    ok('GET /js/app.js', j.status === 200);
    const f = await req('GET', '/fonts/cinzel.woff2');
    ok('GET font woff2', f.status === 200);
    const nf = await req('GET', '/../server.js');
    ok('path traversal blocked', nf.status === 404);
    const sec = await fetch(BASE + '/');
    ok('security headers present', !!sec.headers.get('content-security-policy') && sec.headers.get('x-content-type-options') === 'nosniff');
  }

  console.log('\n— content —');
  {
    const r = await req('GET', '/api/content');
    ok('content has 6 poles', r.status === 200 && Object.keys(r.data.poles).length === 6);
    ok('content has 3 axes', r.data.axes.length === 3);
    ok('no answer keys leak (no "games"/"insight")', !('games' in r.data.poles.CMP) && !('insight' in r.data.poles.CMP));
  }

  console.log('\n— full quiz journey (anonymous) —');
  let resultId, sharePath;
  {
    const start = await req('POST', '/api/quiz/start', {});
    ok('quiz start returns 24 shuffled questions', start.status === 200 && start.data.questions.length === 24);
    ok('options have no pole keys', typeof start.data.questions[0].options[0] === 'string');
    const answers = start.data.questions.map((q) => ({ id: q.id, pick: Math.random() < 0.5 ? 0 : 1 }));
    const bad = await req('POST', '/api/quiz/submit', { token: start.data.token, answers: answers.slice(0, 10) });
    ok('incomplete submit rejected (400)', bad.status === 400);
    const submit = await req('POST', '/api/quiz/submit', { token: start.data.token, answers });
    ok('submit returns a charted star', submit.status === 200 && submit.data.title && submit.data.point);
    ok('title begins with "The "', submit.data.title.startsWith('The '));
    ok('three insight paragraphs', submit.data.insight.length === 3);
    ok('six pole scores + percentiles', Object.keys(submit.data.poles).length === 6 && Object.keys(submit.data.percentiles).length === 6);
    ok('four kindred games', submit.data.games.length === 4);
    const again = await req('POST', '/api/quiz/submit', { token: start.data.token, answers });
    ok('double submit rejected (409)', again.status === 409);
    const ghost = await req('POST', '/api/quiz/submit', { token: 'nope', answers });
    ok('unknown token rejected (410)', ghost.status === 410);
    resultId = submit.data.id;
    sharePath = submit.data.sharePath;
  }

  console.log('\n— results & sharing —');
  {
    const r = await req('GET', `/api/results/${resultId}`);
    ok('result fetchable', r.status === 200 && r.data.id === resultId);
    const og = await req('GET', sharePath);
    ok('share page has OG tags', og.status === 200 && String(og.data).includes('og:title'));
    const pop = await req('GET', '/api/population');
    ok('population endpoint (souls + live)', pop.status === 200 && pop.data.count >= 241);
    const del = await req('DELETE', `/api/results/${resultId}`);
    ok('anonymous delete rejected (401)', del.status === 401);
  }

  console.log('\n— auth & persistence —');
  let cookie;
  {
    const weak = await req('POST', '/api/auth/signup', { email: 'bad', password: 'short' });
    ok('weak signup rejected', weak.status === 400);
    const su = await req('POST', '/api/auth/signup', { email: 'judge@hexaxis.gg', password: 'correct horse battery', name: 'The Judge', claim: resultId });
    ok('signup works + claims result', su.status === 200 && su.data.user.name === 'The Judge');
    cookie = (su.headers.get('set-cookie') || '').split(';')[0];
    ok('session cookie set', cookie.includes('hexaxis_session='));
    const dupe = await req('POST', '/api/auth/signup', { email: 'judge@hexaxis.gg', password: 'whatever123' });
    ok('duplicate email rejected (409)', dupe.status === 409);
    const me = await req('GET', '/api/me', null, cookie);
    ok('GET /api/me with session', me.status === 200 && me.data.user.email === 'judge@hexaxis.gg');
    const mine = await req('GET', '/api/me/results', null, cookie);
    ok('claimed result appears in history', mine.status === 200 && mine.data.results.length === 1 && mine.data.results[0].mine);
    const owned = await req('GET', `/api/results/${resultId}`, null, cookie);
    ok('claimed result flagged mine + ownerName', owned.data.mine === true && owned.data.ownerName === 'The Judge');

    // second result for compare/drift
    const s2 = await req('POST', '/api/quiz/start', {});
    const a2 = s2.data.questions.map((q) => ({ id: q.id, pick: 1 }));
    const sub2 = await req('POST', '/api/quiz/submit', { token: s2.data.token, answers: a2 }, cookie);
    ok('authed quiz result saved to user', sub2.status === 200);
    const mine2 = await req('GET', '/api/me/results', null, cookie);
    ok('history has 2 results', mine2.data.results.length === 2);
    const del2 = await req('DELETE', `/api/results/${sub2.data.id}`, null, cookie);
    ok('owner can delete', del2.status === 200);

    const wrong = await req('POST', '/api/auth/login', { email: 'judge@hexaxis.gg', password: 'wrong password' });
    ok('bad login rejected (401)', wrong.status === 401);
    const out = await req('POST', '/api/auth/logout', {}, cookie);
    ok('logout clears cookie', out.status === 200 && (out.headers.get('set-cookie') || '').includes('Max-Age=0'));
    const me2 = await req('GET', '/api/me', null, cookie);
    ok('session dead after logout', me2.data.user === null);
    const lin = await req('POST', '/api/auth/login', { email: 'judge@hexaxis.gg', password: 'correct horse battery' });
    ok('login works', lin.status === 200);
    const ct = await req('POST', '/api/auth/login', null);
    ok('non-JSON POST rejected (415)', ct.status === 415);
  }

  console.log('\n— deterministic scoring checks —');
  {
    // All-A answers vs all-B answers should land at mirrored points (options were shuffled, so we can't target poles directly — but both runs must be internally consistent: r equal, angles opposite)
    const sA = await req('POST', '/api/quiz/start', {});
    const subA = await req('POST', '/api/quiz/submit', { token: sA.data.token, answers: sA.data.questions.map((q) => ({ id: q.id, pick: 0 })) });
    const winsA = Object.values(subA.data.poles).reduce((n, p) => n + p.wins, 0);
    ok('all 24 answers counted', winsA === 24);
    ok('pole strengths sum to 3', Math.abs(Object.values(subA.data.poles).reduce((n, p) => n + p.s, 0) - 3) < 1e-9);
    ok('point inside rim', subA.data.point.rDisplay <= 0.98);
  }

  server.kill();
  await new Promise((r) => setTimeout(r, 400));
  try { fs.unlinkSync(SCRATCH); } catch { /* ignore */ }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
