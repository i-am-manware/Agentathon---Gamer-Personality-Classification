import test from 'node:test';
import assert from 'node:assert/strict';

import { QUESTIONS, optionCoverage } from '../shared/questions.js';
import { ARCHETYPE_KEYS, ARCHETYPES } from '../shared/archetypes.js';
import { score, encodeAnswers, decodeAnswers, calibration, CENTER_THRESHOLD } from '../shared/scoring.js';
import { buildInsight } from '../shared/insight.js';

const N = QUESTIONS.length;

/** Deterministic PRNG so this suite is reproducible. */
function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 4294967296;
  };
}

const randomAnswers = (rand) => Array.from({ length: N }, () => Math.floor(rand() * 4));

/** For each question, pick whichever option most favours archetype `key`. */
const pureAnswers = (key) =>
  QUESTIONS.map((q) => {
    let best = 0;
    let bestVal = -1;
    q.options.forEach((o, i) => {
      const v = (o.w[key] || 0) * (o.intensity ?? 1);
      if (v > bestVal) {
        bestVal = v;
        best = i;
      }
    });
    return best;
  });

/**
 * A simulated player with a genuine archetype preference `p`, answering by
 * utility plus a little noise — i.e. someone with a style, not a robot.
 */
function simulatePlayer(rand, p) {
  return QUESTIONS.map((q) => {
    const utils = q.options.map((o) => {
      const entries = Object.entries(o.w);
      const t = entries.reduce((acc, [, v]) => acc + v, 0) || 1;
      let u = 0;
      entries.forEach(([k, v]) => {
        u += (v / t) * p[ARCHETYPE_KEYS.indexOf(k)];
      });
      return u * (o.intensity ?? 1) + rand() * 0.05;
    });
    let best = 0;
    utils.forEach((u, idx) => {
      if (u > utils[best]) best = idx;
    });
    return best;
  });
}

test('question bank is well formed', () => {
  assert.ok(N >= 20 && N <= 30, `expected 20-30 questions, got ${N}`);
  const ids = new Set();
  for (const q of QUESTIONS) {
    assert.ok(!ids.has(q.id), `duplicate question id ${q.id}`);
    ids.add(q.id);
    assert.ok(q.prompt.length > 10, `${q.id} prompt too short`);
    assert.ok(q.options.length >= 3, `${q.id} needs at least 3 options`);
    const seen = new Set();
    for (const o of q.options) {
      assert.ok(o.label.length > 5, `${q.id} option label too short`);
      assert.ok(!seen.has(o.label), `${q.id} has a duplicate option`);
      seen.add(o.label);
      const keys = Object.keys(o.w);
      assert.ok(keys.length > 0, `${q.id} option has no weights`);
      for (const k of keys) {
        assert.ok(ARCHETYPE_KEYS.includes(k), `${q.id} references unknown archetype ${k}`);
        assert.ok(o.w[k] > 0, `${q.id} has a non-positive weight for ${k}`);
      }
      assert.ok((o.intensity ?? 1) >= 1 && (o.intensity ?? 1) <= 3, `${q.id} intensity out of range`);
    }
  }
});

test('every archetype is reachable and well represented', () => {
  const cover = optionCoverage();
  for (const k of ARCHETYPE_KEYS) {
    assert.ok((cover[k] ?? 0) >= 8, `${k} only appears in ${cover[k]} options`);
  }
});

test('the six archetypes are three opposing pairs 180 degrees apart', () => {
  for (const a of ARCHETYPES) {
    const opposite = (((a.angle + 180) % 360) + 360) % 360;
    const match = ARCHETYPES.find((b) => b.angle === opposite);
    assert.ok(match, `${a.key} has no opposite`);
    assert.equal(match.key, a.shadow, `${a.key}.shadow should point at its opposite`);
  }
  const angles = ARCHETYPES.map((a) => a.angle).sort((x, y) => x - y);
  assert.deepEqual(angles, [0, 60, 120, 180, 240, 300], 'archetypes must sit on a regular hexagon');
});

test('debias works: on average a coin-flip responder lands on the origin', () => {
  // No single random playthrough sits at the centre (there is sampling noise),
  // but the *average* of thousands must, otherwise the bank itself leans and
  // every player inherits that lean.
  const rand = prng(2026);
  let sx = 0;
  let sy = 0;
  let centred = 0;
  const runs = 4000;
  for (let i = 0; i < runs; i++) {
    const s = score(randomAnswers(rand), QUESTIONS);
    sx += s.x;
    sy += s.y;
    if (s.radius < CENTER_THRESHOLD) centred += 1;
  }
  const drift = Math.hypot(sx / runs, sy / runs);
  assert.ok(drift < 0.03, `coin-flip answerers drift off-centre by ${drift.toFixed(4)}`);
  assert.ok(centred / runs > 0.5, `only ${((centred / runs) * 100).toFixed(0)}% of coin-flip answerers read as balanced`);
});

test('the calibration is derived from the bank, not hard-coded', () => {
  const c = calibration(QUESTIONS);
  assert.ok(c.floor > 0 && c.floor < c.ceiling, 'floor must sit below ceiling');
  const total = ARCHETYPE_KEYS.reduce((sum, k) => sum + c.expected[k], 0);
  assert.ok(Math.abs(total - 1) < 1e-9, 'expected vector must be a distribution');
  // The six ideal playthroughs should reach comparable distances, otherwise one
  // archetype has a longer lever than its siblings.
  const reaches = ARCHETYPE_KEYS.map((k) => c.ideal[k] * c.whitening[k]);
  const ratio = Math.max(...reaches) / Math.min(...reaches);
  assert.ok(ratio < 1.5, `ideal reach is uneven across archetypes: ${ratio.toFixed(2)}x`);
});

test('the bank is not lopsided toward any archetype', () => {
  const c = calibration(QUESTIONS);
  const shares = ARCHETYPE_KEYS.map((k) => c.expected[k]);
  const ratio = Math.max(...shares) / Math.min(...shares);
  assert.ok(ratio < 1.6, `baseline share varies ${ratio.toFixed(2)}x across archetypes`);
});

test('pure archetype answers land near that archetype vertex', () => {
  for (const k of ARCHETYPE_KEYS) {
    const s = score(pureAnswers(k), QUESTIONS);
    assert.equal(s.primary, k, `pure ${k} answers classified as ${s.primary}`);
    const target = ARCHETYPES.find((a) => a.key === k);
    const headingDelta = Math.abs(((s.heading - target.angle + 540) % 360) - 180);
    assert.ok(headingDelta < 15, `${k}: heading ${s.heading} is not near ${target.angle}`);
    assert.ok(s.radius > 0.85, `${k}: expected a rim-hugging radius, got ${s.radius}`);
  }
});

test('a consistent player is classified correctly, not just extremists', () => {
  const rand = prng(31337);
  let correct = 0;
  let total = 0;
  for (let i = 0; i < 600; i++) {
    const pref = ARCHETYPE_KEYS.map(() => rand() + 0.05);
    const sum = pref.reduce((a, b) => a + b, 0);
    const p = pref.map((x) => x / sum);
    const truth = ARCHETYPE_KEYS[p.indexOf(Math.max(...p))];
    const sorted = [...p].sort((a, b) => b - a);
    if (sorted[0] / sorted[1] < 1.5) continue; // nobody should be graded on a coin flip
    const s = score(simulatePlayer(rand, p), QUESTIONS);
    total += 1;
    if (s.primary === truth) correct += 1;
  }
  assert.ok(total > 50, 'simulation produced too few clear-cut players');
  const accuracy = correct / total;
  assert.ok(accuracy > 0.9, `primary archetype accuracy only ${(accuracy * 100).toFixed(1)}%`);
});

test('the plane gets used: consistent players spread across the disc', () => {
  const rand = prng(4242);
  const radii = [];
  for (let i = 0; i < 1200; i++) {
    const pref = ARCHETYPE_KEYS.map(() => rand() + 0.05);
    const sum = pref.reduce((a, b) => a + b, 0);
    const p = pref.map((x) => x / sum);
    radii.push(score(simulatePlayer(rand, p), QUESTIONS).radius);
  }
  const avg = radii.reduce((a, b) => a + b, 0) / radii.length;
  assert.ok(avg > 0.3 && avg < 0.8, `average radius ${avg.toFixed(2)} is not well spread`);
  assert.ok(radii.filter((r) => r > 0.55).length / radii.length > 0.15, 'nobody reaches the outer plane');
  assert.ok(radii.filter((r) => r < 0.35).length / radii.length > 0.05, 'nobody occupies the middle of the plane');
});

test('radius always stays inside the unit circle', () => {
  const rand = prng(99);
  for (let i = 0; i < 3000; i++) {
    const s = score(randomAnswers(rand), QUESTIONS);
    assert.ok(s.radius >= 0 && s.radius < 1, `radius out of range: ${s.radius}`);
    assert.ok(Math.hypot(s.x, s.y) < 1.0001, `point escaped the plane: ${s.x},${s.y}`);
  }
});

test('weights are a distribution and affinities agree with the ranking', () => {
  const rand = prng(5);
  for (let i = 0; i < 400; i++) {
    const s = score(randomAnswers(rand), QUESTIONS);
    const total = ARCHETYPE_KEYS.reduce((acc, k) => acc + s.weights[k], 0);
    assert.ok(Math.abs(total - 1) < 1e-9, `weights sum to ${total}`);
    assert.equal(s.ranked.length, 6);
    assert.equal(s.ranked[0], s.primary);
    for (const k of ARCHETYPE_KEYS) {
      assert.ok(s.affinities[k] >= 0 && s.affinities[k] <= 100, `${k} affinity out of range`);
    }
    assert.ok(s.affinities[s.primary] >= s.affinities[s.secondary], 'primary scored below secondary');
    assert.ok(s.margin >= 0, 'margin must be non-negative');
  }
});

test('scoring is deterministic', () => {
  const rand = prng(11);
  const answers = randomAnswers(rand);
  const a = score(answers, QUESTIONS);
  const b = score(answers, QUESTIONS);
  assert.deepEqual(a, b);
  assert.deepEqual(buildInsight(a), buildInsight(b));
});

test('skipped questions are tolerated and counted', () => {
  const answers = Array.from({ length: N }, (_, i) => (i < 10 ? i % 4 : null));
  const s = score(answers, QUESTIONS);
  assert.equal(s.answeredCount, 10);
  assert.equal(s.skippedCount, N - 10);
  assert.ok(Number.isFinite(s.radius));
});

test('empty answers do not explode', () => {
  const s = score(new Array(N).fill(null), QUESTIONS);
  assert.equal(s.answeredCount, 0);
  assert.equal(s.radius, 0);
  assert.equal(s.sector.key, 'meridian');
  assert.ok(buildInsight(s).title.length > 0);
});

test('out-of-range answer indices are ignored rather than crashing', () => {
  const s = score(new Array(N).fill(99), QUESTIONS);
  assert.equal(s.answeredCount, 0);
});

test('answer codec round-trips, including gaps', () => {
  const answers = [0, 1, 2, 3, null, 2, null, 0, 1];
  const code = encodeAnswers(answers);
  assert.equal(code.length, answers.length);
  assert.equal(code[4], '-');
  assert.deepEqual(decodeAnswers(code, answers.length), answers);
});

test('insight text is generated for every archetype without blanks', () => {
  for (const k of ARCHETYPE_KEYS) {
    const s = score(pureAnswers(k), QUESTIONS);
    const ins = buildInsight(s);
    const short = ARCHETYPES.find((a) => a.key === k).short;
    assert.ok(ins.title.includes(short.slice(0, 4)), `title missing for ${k}: ${ins.title}`);
    assert.equal(ins.reads.length, 3);
    const blob = JSON.stringify(ins);
    assert.ok(!blob.includes('undefined'), `insight for ${k} leaked "undefined"`);
    assert.ok(!blob.includes('NaN'), `insight for ${k} leaked "NaN"`);
    assert.ok(ins.paragraphs[0].length > 80);
    assert.ok(ins.recommendation.length > 40);
  }
});

test('the insight varies with the answers', () => {
  const texts = new Set();
  const rand = prng(1234);
  for (let i = 0; i < 200; i++) texts.add(buildInsight(score(randomAnswers(rand), QUESTIONS)).title);
  assert.ok(texts.size > 6, `only ${texts.size} distinct titles across 200 playthroughs`);
});

test('call signs are deterministic and well formed', () => {
  const rand = prng(77);
  const answers = randomAnswers(rand);
  const s1 = score(answers, QUESTIONS);
  const s2 = score(answers, QUESTIONS);
  assert.equal(s1.signature, s2.signature);
  assert.match(s1.signature, /^[A-Z]{3}-\d{3}$/);
});
