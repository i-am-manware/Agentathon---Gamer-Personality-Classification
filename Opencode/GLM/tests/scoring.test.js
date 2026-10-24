import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS } from '../shared/questions.js';
import { scoreRun, scoreFromEvidence, validateAnswers, evidenceFromAnswers } from '../shared/scoring.js';
import { POLES, POLE_RING, isInsideHexagon } from '../shared/axes.js';
import { buildInsight } from '../shared/insights.js';

const neutral = QUESTIONS.map((q) => (q.type === 'slider' ? 50 : 0));

test('validateAnswers rejects the right things', () => {
  assert.equal(validateAnswers(neutral).ok, true);
  assert.equal(validateAnswers(neutral.slice(1)).ok, false);
  assert.equal(validateAnswers([...'x'].map(() => 0)).ok, false);
  const badOption = QUESTIONS.map((q) => (q.type === 'slider' ? 50 : 0));
  badOption[0] = 99;
  assert.equal(validateAnswers(badOption).ok, false);
  const badSlider = QUESTIONS.map((q) => (q.type === 'slider' ? 50 : 0));
  badSlider[2] = 101;
  assert.equal(validateAnswers(badSlider).ok, false);
});

test('sliders parked at 50 contribute no evidence (the neutral shrug)', () => {
  // expected evidence = only what option 0 of every choice/versus question feeds
  const expected = Object.fromEntries(POLES.map((p) => [p, 0]));
  for (const q of QUESTIONS) {
    if (q.type === 'slider') continue;
    for (const [pole, weight] of Object.entries(q.options[0].w)) {
      expected[pole] += weight;
    }
  }
  assert.deepEqual(evidenceFromAnswers(neutral), expected);
});

test('pure single-archetype runs dominate that axis pole', () => {
  // pick the option with maximum weight for one archetype each run
  for (const pole of POLES) {
    const answers = QUESTIONS.map((q) => {
      if (q.type === 'slider') {
        return q.toward === pole ? 100 : 50;
      }
      let best = 0;
      let bestW = -1;
      q.options.forEach((opt, i) => {
        const w = opt.w[pole] || 0;
        if (w > bestW) {
          bestW = w;
          best = i;
        }
      });
      return best;
    });
    const score = scoreRun(answers);
    assert.equal(score.primary, pole, `primary should be ${pole}`);
    const share = score.shares[pole];
    assert.ok(share > 0.4, `${pole} share should dominate (got ${share.toFixed(2)})`);
    assert.ok(score.affinities[0].pct >= score.affinities[1].pct, 'ranking consistent');
    assert.ok(isInsideHexagon(score.point), `point for ${pole} inside hexagon`);
  }
});

test('affinity pcts sum to exactly 100 (largest remainder)', () => {
  for (let seed = 0; seed < 200; seed++) {
    const answers = QUESTIONS.map((q, i) => {
      if (q.type === 'slider') return ((seed * 7 + i * 13) % 101);
      return (seed + i) % q.options.length;
    });
    const score = scoreRun(answers);
    const sum = score.affinities.reduce((s, r) => s + r.pct, 0);
    assert.equal(sum, 100, `pct sum must be 100, got ${sum}`);
    for (const row of score.affinities) assert.ok(row.pct >= 0 && row.pct <= 100);
  }
});

test('spawn point is always inside the hexagon (convex combination)', () => {
  for (let seed = 0; seed < 500; seed++) {
    const answers = QUESTIONS.map((q, i) => {
      if (q.type === 'slider') return (seed * 31 + i * 17) % 101;
      return (seed * 3 + i * 7) % q.options.length;
    });
    const score = scoreRun(answers);
    assert.ok(isInsideHexagon(score.point), `seed ${seed} outside hexagon: ${JSON.stringify(score.point)}`);
    assert.ok(Math.hypot(score.point.x, score.point.y) <= 1.0000001);
    assert.ok(score.distance >= 0);
  }
});

test('axis positions are bounded and follow the evidence', () => {
  const answers = QUESTIONS.map((q) => (q.type === 'slider' ? (q.toward === 'architect' ? 100 : 50) : 0));
  const score = scoreRun(answers);
  for (const ax of score.axes) {
    assert.ok(ax.value > -1.00001 && ax.value < 1.00001, 'axis in (-1,1)-ish bounds');
    assert.ok(ax.strength >= 0 && ax.strength <= 1);
  }
  // the order axis should lean architect (Q03 slider pulled toward architect at 100)
  const orderAxis = score.axes.find((a) => a.id === 'order');
  assert.equal(orderAxis.toward, 'architect');
  assert.ok(orderAxis.value > 0.2, `order axis should lean architect, got ${orderAxis.value}`);
});

test('insight assembly is deterministic and complete for every combo', () => {
  const answers = QUESTIONS.map((q, i) => (q.type === 'slider' ? 50 : i % Math.max(1, q.options.length)));
  const base = scoreRun(answers);
  const a = JSON.stringify(buildInsight(base));
  const b = JSON.stringify(buildInsight(scoreRun(answers)));
  assert.equal(a, b, 'same answers → identical reading');
  assert.ok(buildInsight(base).paragraphs.length === 3);
  assert.ok(buildInsight(base).title.length > 3);
});

test('fully neutral evidence lands at the crossroads center', () => {
  const zeros = Object.fromEntries(POLES.map((p) => [p, 0]));
  const score = scoreFromEvidence(zeros);
  assert.ok(Math.hypot(score.point.x, score.point.y) < 0.001, 'equal evidence → center spawn');
  assert.equal(score.affinities.reduce((s, r) => s + r.pct, 0), 100);
  for (const row of score.affinities) assert.ok(row.pct === 16 || row.pct === 17);
  assert.equal(buildInsight(score).crossroads, true);
});

test('scoreFromEvidence agrees with scoreRun end to end', () => {
  const answers = QUESTIONS.map((q, i) => (q.type === 'slider' ? 73 : i % q.options.length));
  const a = scoreRun(answers);
  const { answers: _drop, ...b } = { ...a, answers: undefined };
  const direct = scoreFromEvidence(a.evidence);
  for (const key of ['primary', 'secondary', 'point', 'distance', 'sector']) {
    assert.deepEqual(direct[key], a[key], `key ${key} must agree`);
  }
});
