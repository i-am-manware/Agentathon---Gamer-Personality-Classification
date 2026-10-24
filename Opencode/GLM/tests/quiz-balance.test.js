// Fairness audit of the questionnaire: every archetype must be reachable with
// comparable force. Computes, for each archetype, the total evidence a player
// could award it by always choosing its strongest option (and pushing every
// slider its way), then asserts the totals stay within 15% of the mean.

import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS, QUIZ_VERSION } from '../shared/questions.js';
import { POLES, POLE_RING, opposite } from '../shared/axes.js';
import { ARCHETYPES, TITLES, BLEND_LINES } from '../shared/archetypes.js';

test('every question is well-formed', () => {
  for (const q of QUESTIONS) {
    assert.ok(q.id && q.tag && q.prompt, `${q.id}: missing fields`);
    if (q.type === 'slider') {
      assert.ok(['valor', 'order', 'campfire'].includes(q.axis), `${q.id}: bad axis`);
      assert.ok(POLES.includes(q.toward), `${q.id}: bad toward pole`);
      assert.ok(q.left && q.right, `${q.id}: slider needs both end labels`);
      assert.notEqual(q.toward, opposite(q.toward));
    } else {
      assert.ok(q.options.length >= 2, `${q.id}: needs options`);
      for (const opt of q.options) {
        assert.ok(opt.t && typeof opt.t === 'string' && opt.t.length > 3, `${q.id}: option text`);
        assert.ok(opt.w && Object.keys(opt.w).length >= 1, `${q.id}: option weights`);
        for (const [pole, weight] of Object.entries(opt.w)) {
          assert.ok(POLES.includes(pole), `${q.id}: unknown pole ${pole}`);
          assert.ok(Number.isFinite(weight) && weight > 0 && weight <= 5, `${q.id}: weight out of range`);
        }
      }
    }
  }
  assert.equal(QUESTIONS.length, 24);
  assert.equal(QUIZ_VERSION, 1);
});

test('every archetype is reachable with comparable force (±15%)', () => {
  const availability = Object.fromEntries(POLES.map((p) => [p, 0]));
  for (const q of QUESTIONS) {
    if (q.type === 'slider') {
      availability[q.toward] += 3;
      availability[opposite(q.toward)] += 3;
      continue;
    }
    for (const pole of POLES) {
      availability[pole] += Math.max(0, ...q.options.map((o) => o.w[pole] || 0));
    }
  }
  const totals = Object.values(availability);
  const mean = totals.reduce((s, n) => s + n, 0) / totals.length;
  for (const pole of POLES) {
    const rel = availability[pole] / mean;
    assert.ok(
      rel >= 0.85 && rel <= 1.15,
      `${pole} availability ${availability[pole]} outside ±15% of mean ${mean.toFixed(1)} (ratio ${rel.toFixed(2)})`
    );
  }
});

test('every archetype owns at least 4 dedicated questions', () => {
  for (const pole of POLES) {
    const owned = QUESTIONS.filter((q) => {
      if (q.type === 'slider') return q.toward === pole || opposite(q.toward) === pole;
      return q.options.some((o) => (o.w[pole] || 0) >= 3);
    }).length;
    assert.ok(owned >= 4, `${pole} owns only ${owned} questions`);
  }
});

test('titles and blend lines exist for all 30 primary×secondary combos', () => {
  for (const primary of POLE_RING) {
    for (const secondary of POLE_RING) {
      if (primary === secondary) continue;
      const key = `${primary}_${secondary}`;
      assert.ok(TITLES[key], `missing title ${key}`);
      assert.ok(BLEND_LINES[key], `missing blend line ${key}`);
      assert.ok(TITLES[key].length >= 8, `title too lazy for ${key}`);
    }
  }
});

test('archetype profiles are complete', () => {
  for (const pole of POLES) {
    const arch = ARCHETYPES[pole];
    assert.ok(arch.name && arch.epithet && arch.color && arch.spot && arch.vibe && arch.about);
    assert.ok(arch.strengths.length === 3);
    assert.ok(arch.fatigue.length === 2);
    assert.ok(arch.kin.length === 2);
    assert.ok(/^#[0-9a-f]{6}$/i.test(arch.color), `${pole} color must be hex`);
  }
});
