// Frontend smoke test: render every view and component against the fake DOM.
// This catches broken imports, undefined variables, and render-time errors
// without needing a browser — the real visual check is a manual browser visit.

import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeDom, countBuilt, FakeElement } from './support/fakedom.js';
import { QUESTIONS } from '../shared/questions.js';
import { scoreRun } from '../shared/scoring.js';
import { encodeResult } from '../shared/codec.js';

await installFakeDom();

// module under test resolution happens AFTER globals exist, because the app
// modules touch window/document at import time (audio.js wires a listener)
const { hexplane, demoShares, dominantPole } = await import('../public/js/components/hexplane.js');
const { affinityBars, axisLeanBars } = await import('../public/js/components/bars.js');
const { drawShareCard } = await import('../public/js/components/sharecard.js');
const { homeView } = await import('../public/js/views/home.js');
const { mapView } = await import('../public/js/views/map.js');
const { quizView } = await import('../public/js/views/quiz.js');
const { computeView } = await import('../public/js/views/compute.js');
const { resultView } = await import('../public/js/views/result.js');
const { cardView } = await import('../public/js/views/card.js');
const { profileView } = await import('../public/js/views/profile.js');
const { diffView } = await import('../public/js/views/diff.js');
const { signinView } = await import('../public/js/views/signin.js');
const { state, stashRun, setPendingCode, clearQuizSession } = await import('../public/js/state.js');

const gremlinPersona = {
  weights: { gremlin: 2, hypeman: 1 },
  sliders: { order: ['gremlin', 0.6], campfire: ['hypeman', 0.5], valor: ['wayfarer', 0.3] },
};
const architectPersona = {
  weights: { architect: 2, conqueror: 1 },
  sliders: { order: ['architect', 0.6], campfire: ['lorekeeper', 0.2], valor: ['conqueror', 0.4] },
};
function answersFor(persona) {
  return QUESTIONS.map((q) => {
    if (q.type === 'slider') {
      const t = persona.sliders[q.axis];
      return t ? (q.toward === t[0] ? 50 + 50 * t[1] : 50 - 50 * t[1]) : 50;
    }
    let best = 0;
    let bestScore = -1;
    q.options.forEach((o, i) => {
      let s = 0;
      for (const [pole, w] of Object.entries(o.w)) s += w * (persona.weights[pole] || 0);
      if (s > bestScore) { bestScore = s; best = i; }
    });
    return best;
  });
}
const gremlinScore = scoreRun(answersFor(gremlinPersona));
const architectScore = scoreRun(answersFor(architectPersona));
const gremlinCode = encodeResult(gremlinScore);
const architectCode = encodeResult(architectScore);

const root = () => new FakeElement('main');

test('hexplane renders with score, ghost, and demo drag hooks', () => {
  const p1 = hexplane({ score: gremlinScore, ghost: architectScore, ghostLabel: 'OLD' });
  assert.ok(countBuilt(p1.el) > 60, 'plane should build a rich SVG tree');
  const p2 = hexplane({ score: null, onDemo() {}, onPick() {}, reveal: false });
  assert.ok(countBuilt(p2.el) > 40);
  assert.equal(typeof p2.updateDemo, 'function');
  const shares = demoShares({ x: 0.5, y: 0.2 });
  const sum = Object.values(shares).reduce((s, n) => s + n, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, 'demo shares sum to 1');
  assert.ok(dominantPole(shares));
});

test('bars render for both score shapes', () => {
  assert.ok(countBuilt(affinityBars(gremlinScore, { animate: false })) >= 12);
  assert.ok(countBuilt(axisLeanBars(architectScore)) >= 9);
  const decoded = { affinities: gremlinScore.affinities, axes: gremlinScore.axes };
  assert.ok(countBuilt(affinityBars(decoded, { animate: false })) >= 12);
});

test('home view builds the boot log + menu', () => {
  const out = homeView(root());
  assert.equal(typeof out, 'function'); // cleanup (boot animation timer)
  out();
});

test('map view builds plane + live panel + dossier', () => {
  mapView(root());
});

test('quiz view renders question 1 and supports render-time cleanup', () => {
  clearQuizSession();
  const out = quizView(root()) || null;
  assert.ok(out);
  assert.equal(typeof out, 'function');
  out(); // removes key listener
});

test('compute view requires a pending code, then navigates', async () => {
  setPendingCode(gremlinCode);
  const out = computeView(root());
  assert.ok(out); // cleanup cancels navigation
  out();
  // no pending code → bounces home without rendering
  const out2 = computeView(root());
  assert.equal(out2, null);
});

test('result view renders the full money screen from a share code', () => {
  stashRun(gremlinCode, gremlinScore.answers, Date.now()); // gives it a prev-run ghost
  resultView(root(), { code: architectCode });
  assert.ok(document.title.includes('SPAWNPOINT'));
  // corrupt code → readable error module, no throw
  resultView(root(), { code: '!!!badcode!!!' });
});

test('card view draws the share card on a fake canvas', async () => {
  await cardView(root(), { code: gremlinCode });
});

test('profile view (guest) shows the sign-in-required panel', async () => {
  await profileView(root());
});

test('diff view renders from two share codes', async () => {
  await diffView(root(), { a: architectCode, b: gremlinCode });
  await diffView(root(), { a: '!!!', b: gremlinCode });
});

test('signin view renders both tabs and the guest panel', () => {
  signinView(root());
});

test('drawShareCard completes against the proxy 2d context', async () => {
  const canvas = document.createElement('canvas');
  await drawShareCard(canvas, { score: gremlinScore, insight: { title: 'The Party Detonator', chips: { sector: 'GREMLIN-HYPEMAN CORRIDOR' } }, host: 'localhost:3111' });
  assert.equal(canvas.width, 2400); // 1200 × DPR2
  assert.equal(canvas.height, 1260);
});

test('state module round-trips quiz + run stash under stubbed storage', () => {
  stashRun(gremlinCode, gremlinScore.answers, 1234);
  stashRun(architectCode, architectScore.answers, 5678);
  assert.equal(state.settings.crt, true);
});

test('full user journey: 24 keypresses drive the quiz to completion', async () => {
  clearQuizSession();
  const cleanupQuiz = quizView(root());
  assert.equal(typeof cleanupQuiz, 'function');

  // make auto-advance timers fire immediately so the journey is synchronous
  const realSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => { fn(); return 0; };
  try {
    for (let i = 0; i < QUESTIONS.length; i++) {
      const q = QUESTIONS[i];
      if (q.type === 'slider') {
        document.dispatch('keydown', { key: 'ArrowRight' });
        document.dispatch('keydown', { key: 'Enter' });
      } else {
        document.dispatch('keydown', { key: '1' });
      }
    }
  } finally {
    globalThis.setTimeout = realSetTimeout;
    cleanupQuiz();
  }

  assert.equal(location.hash, '#/compute', 'quiz should route to the compute screen');
  const stashed = JSON.parse(localStorage.getItem('sp_lastRun') || 'null');
  assert.ok(stashed && Array.isArray(stashed.answers) && stashed.answers.length === QUESTIONS.length);
  assert.ok(typeof stashed.code === 'string' && stashed.code.length > 10);

  // and the compute screen itself should hand off to the result view
  setPendingCode(stashed.code);
  console.log('DBG pending stored:', sessionStorage.getItem('sp_pending_code')?.slice(0, 8));
  const { decodeResult } = await import('../shared/codec.js');
  const dbgScore = decodeResult(stashed.code);
  console.log('DBG decode of stashed code:', dbgScore ? dbgScore.primary : 'NULL');
  const cleanupCompute = computeView(root());
  assert.ok(cleanupCompute);
  cleanupCompute();
  assert.equal(location.hash, '#/r/' + stashed.code);
});

test('main.js boots the router, header session slot, and footer toggles', async () => {
  sessionStorage.setItem('sp_booted', '1'); // skip the boot animation timer
  await import('../public/js/main.js');
  await new Promise((r) => setTimeout(r, 10)); // let the session fetch settle

  const view = document.getElementById('view');
  assert.ok(view.children.length > 0, 'router should render a view');
  assert.ok(document.title.includes('SPAWNPOINT'));
  const slot = document.getElementById('session-slot');
  assert.ok(slot.children.length > 0, 'session slot should render (guest state)');
});
