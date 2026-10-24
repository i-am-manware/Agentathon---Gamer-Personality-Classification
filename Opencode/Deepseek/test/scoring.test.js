import test from 'node:test';
import assert from 'node:assert/strict';
import { computeResult, validateAnswers, answerCaps } from '../src/lib/scoring.js';
import { QUESTIONS, ARCHETYPES } from '../shared/quiz.data.js';

function answersFor(weights) {
  return QUESTIONS.map((q) => {
    let bestIndex = 0;
    let bestScore = -Infinity;
    q.options.forEach((option, index) => {
      let score = 0;
      for (const [key, weight] of Object.entries(option.w)) score += weight * (weights[key] || 0);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    return bestIndex;
  });
}

test('every question has at least four options and every option awards points inside the roster', () => {
  const keys = new Set(ARCHETYPES.map((a) => a.key));
  assert.equal(QUESTIONS.length, 25);
  for (const q of QUESTIONS) {
    assert.ok(q.options.length >= 4, `${q.id} needs 4+ options`);
    assert.ok(q.options.length <= 6, `${q.id} has too many options`);
    for (const option of q.options) {
      assert.ok(Object.keys(option.w).length > 0, `${q.id} option has no weights`);
      for (const key of Object.keys(option.w)) assert.ok(keys.has(key), `${q.id} unknown archetype ${key}`);
    }
  }
});

test('every archetype is expressible in at least 20 of 25 questions', () => {
  for (const a of ARCHETYPES) {
    const expressible = QUESTIONS.filter((q) => q.options.some((o) => (o.w[a.key] || 0) >= 2)).length;
    assert.ok(expressible >= 20, `${a.key} only expressible in ${expressible} questions`);
  }
});

test('answer caps are balanced within 25% across archetypes', () => {
  const caps = answerCaps();
  const values = Object.values(caps);
  const min = Math.min(...values);
  const max = Math.max(...values);
  assert.ok(max / min < 1.3, `caps too imbalanced: min=${min} max=${max}`);
});

test('pure personas land near their vertex with the right dominant archetype', () => {
  for (const a of ARCHETYPES) {
    const result = computeResult(answersFor({ [a.key]: 1 }));
    assert.equal(result.dominant, a.key, `pure ${a.key} misclassified as ${result.dominant}`);
    assert.ok(result.coord.r > 0.7, `pure ${a.key} radius ${result.coord.r} too central`);
    assert.equal(result.tier.key, 'pure');
    assert.ok(result.confidence >= 60, `pure ${a.key} confidence ${result.confidence} too low`);
  }
});

test('balanced answering lands near the center', () => {
  const totals = Object.fromEntries(ARCHETYPES.map((a) => [a.key, 0]));
  const answers = QUESTIONS.map((q) => {
    let bestIndex = 0;
    let bestCost = Infinity;
    q.options.forEach((option, index) => {
      const next = { ...totals };
      for (const [key, weight] of Object.entries(option.w)) next[key] = (next[key] || 0) + weight;
      const cost = Object.values(next).reduce((sum, v) => sum + v * v, 0);
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = index;
      }
    });
    for (const [key, weight] of Object.entries(q.options[bestIndex].w)) totals[key] += weight;
    return bestIndex;
  });
  const result = computeResult(answers);
  assert.ok(result.coord.r < 0.45, `balanced radius ${result.coord.r} not central`);
});

test('scores are bounded, complete and deterministic', () => {
  const answers = answersFor({ bard: 1, tactician: 0.5 });
  const first = computeResult(answers);
  const second = computeResult(answers);
  assert.deepEqual(first, second);
  assert.equal(first.scores.length, ARCHETYPES.length);
  for (const s of first.scores) {
    assert.ok(s.pct >= 0 && s.pct <= 100, `pct out of range: ${s.pct}`);
    assert.ok(s.raw >= 0);
    assert.ok(s.cap > 0);
  }
  assert.ok(first.confidence >= 1 && first.confidence <= 99);
  assert.ok(Math.abs(first.coord.x) <= 1 && Math.abs(first.coord.y) <= 1);
  assert.equal(first.tensions.length, 3);
});

test('validateAnswers rejects malformed input', () => {
  assert.equal(validateAnswers(null), false);
  assert.equal(validateAnswers([0, 1, 2]), false);
  assert.equal(validateAnswers(new Array(25).fill(0)), true);
  const tooBig = new Array(25).fill(0);
  tooBig[7] = 99;
  assert.equal(validateAnswers(tooBig), false);
  const float = new Array(25).fill(0);
  float[3] = 1.5;
  assert.equal(validateAnswers(float), false);
  const negative = new Array(25).fill(0);
  negative[0] = -1;
  assert.equal(validateAnswers(negative), false);
});
