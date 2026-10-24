/**
 * Calibration harness for the scoring model.
 *
 * Run:  node scripts/calibrate.js
 *
 * The model tares its radius against two constants derived from the question
 * bank at runtime: FLOOR (the noise floor — mean |d| of a coin-flip responder)
 * and CEILING (mean |d| of the six maximally-consistent playthroughs). This
 * script exists to check that the resulting scale behaves: that a random
 * responder lands near the centre, that real preferences spread across the
 * disc rather than smearing against the rim, and that no archetype is
 * systematically advantaged.
 *
 * It reads the calibration straight out of the scoring module, so if the
 * question bank or the model changes, this report changes with it.
 */

import { QUESTIONS } from '../shared/questions.js';
import { score, calibration, SCORE_VERSION, RIM_SHAPE, CENTER_THRESHOLD } from '../shared/scoring.js';
import { ARCHETYPES, ARCHETYPE_KEYS } from '../shared/archetypes.js';

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    return s / 4294967296;
  };
}

function quantiles(values, qs = [0.05, 0.25, 0.5, 0.75, 0.95]) {
  const v = [...values].sort((a, b) => a - b);
  return qs.map((q) => v[Math.min(v.length - 1, Math.floor(q * v.length))]);
}

function mean(xs) {
  return xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
}

/**
 * A simulated player: a preference distribution over the six archetypes plus a
 * "consistency" — how reliably they pick the option their preference favours.
 * Low consistency = someone answering semi-randomly. High = a zealot.
 */
function simulate(rand, consistency) {
  const pref = ARCHETYPE_KEYS.map(() => rand() + 0.06);
  const prefSum = pref.reduce((a, b) => a + b, 0);
  const p = pref.map((x) => x / prefSum);

  return QUESTIONS.map((q) => {
    const utilities = q.options.map((o) => {
      const entries = Object.entries(o.w);
      const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
      let u = 0;
      entries.forEach(([k, v]) => {
        u += (v / total) * p[ARCHETYPE_KEYS.indexOf(k)];
      });
      return u * (o.intensity ?? 1) + rand() * 0.03;
    });
    if (rand() > consistency) return Math.floor(rand() * q.options.length); // a shrug
    let best = 0;
    utilities.forEach((u, i) => {
      if (u > utilities[best]) best = i;
    });
    return best;
  });
}

const bar = (frac, width = 34) => '#'.repeat(Math.max(0, Math.round(frac * width)));

/* --- 0. The instrument's own constants ----------------------------------- */
{
  const cal = calibration(QUESTIONS);
  console.log(`SPAWNPOINT scoring v${SCORE_VERSION} · RIM_SHAPE ${RIM_SHAPE} · CENTER_THRESHOLD ${CENTER_THRESHOLD}\n`);
  console.log('calibration (derived from the bank at runtime, not hard-coded):');
  console.log(`  FLOOR    ${cal.floor.toFixed(4)}   mean |d| of a coin-flip responder`);
  console.log(`  CEILING  ${cal.ceiling.toFixed(4)}   mean |d| of the six ideal playthroughs`);
  console.log(`  span     ${(cal.ceiling - cal.floor).toFixed(4)}\n`);
}

/* --- 1. Bias check: does the bank itself lean toward any archetype? ------- */
{
  const cal = calibration(QUESTIONS);
  const uniform = 100 / ARCHETYPE_KEYS.length;
  console.log(`bank balance (share of a random playthrough; uniform = ${uniform.toFixed(1)}%):`);
  for (const k of ARCHETYPE_KEYS) {
    const pct = cal.expected[k] * 100;
    console.log(`  ${k.padEnd(12)} ${pct.toFixed(1)}%  ${bar(pct / 100)}`);
  }
  const spread = Math.max(...ARCHETYPE_KEYS.map((k) => cal.expected[k] * 100)) -
    Math.min(...ARCHETYPE_KEYS.map((k) => cal.expected[k] * 100));
  console.log(`  spread ${spread.toFixed(1)}pp (the debias step corrects for this)\n`);
}

/* --- 2. Whitening: does every archetype reach the same distance? ---------- */
{
  const cal = calibration(QUESTIONS);
  console.log('reach of a maximally-consistent playthrough, before -> after whitening:');
  for (const k of ARCHETYPE_KEYS) {
    const before = cal.ideal[k];
    const after = before * cal.whitening[k];
    console.log(
      `  ${k.padEnd(12)} ${before.toFixed(3)} -> ${after.toFixed(3)}  (x${cal.whitening[k].toFixed(3)})  ${bar(after)}`,
    );
  }
  const after = ARCHETYPE_KEYS.map((k) => cal.ideal[k] * cal.whitening[k]);
  console.log(`  whitened spread: ${(Math.max(...after) - Math.min(...after)).toFixed(4)}\n`);
}

/* --- 3. Radius distribution across the population ------------------------ */
const N = 4000;
const rand = prng(20261013);

console.log('population              r05    r25    r50    r75    r95    mean   <%centre');
for (const [label, consistency] of [
  ['coin-flip (no signal)', 0.25],
  ['casual', 0.6],
  ['committed', 0.8],
  ['zealot', 0.95],
]) {
  const radii = [];
  for (let i = 0; i < N; i++) radii.push(score(simulate(rand, consistency), QUESTIONS).radius);
  const q = quantiles(radii);
  const centred = radii.filter((r) => r < CENTER_THRESHOLD).length / radii.length;
  console.log(
    `${label.padEnd(22)}  ${q.map((x) => x.toFixed(3)).join('  ')}   ${mean(radii).toFixed(3)}   ${(centred * 100).toFixed(1)}%`,
  );
}

/* --- 4. Per-archetype reach for simulated players ------------------------ */
{
  console.log('\nmean radius by resulting primary archetype (committed population):');
  const buckets = Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, []]));
  for (let i = 0; i < N; i++) {
    const s = score(simulate(rand, 0.8), QUESTIONS);
    buckets[s.primary].push(s.radius);
  }
  for (const k of ARCHETYPE_KEYS) {
    const rs = buckets[k];
    console.log(`  ${k.padEnd(12)} n=${String(rs.length).padStart(4)}  mean ${rs.length ? mean(rs).toFixed(3) : '—'}  ${bar(rs.length ? mean(rs) : 0)}`);
  }
}

/* --- 5. Classification quality ------------------------------------------- */
{
  console.log('\nclassification accuracy (does the primary match the preference?):');
  for (const [label, consistency, dominance] of [
    ['clear preference', 0.9, 1.6],
    ['mild preference', 0.75, 1.15],
  ]) {
    let hits = 0;
    const trials = 1200;
    const r2 = prng(987654321);
    for (let i = 0; i < trials; i++) {
      // Build a preference vector with a controlled dominance ratio.
      const target = ARCHETYPE_KEYS[Math.floor(r2() * ARCHETYPE_KEYS.length)];
      const pref = Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, 1]));
      pref[target] = dominance;
      const answers = QUESTIONS.map((q) => {
        const utils = q.options.map((o) => {
          const entries = Object.entries(o.w);
          const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
          let u = 0;
          entries.forEach(([k, v]) => (u += (v / total) * pref[k]));
          return u * (o.intensity ?? 1) + r2() * 0.05;
        });
        if (r2() > consistency) return Math.floor(r2() * q.options.length);
        let best = 0;
        utils.forEach((u, j) => {
          if (u > utils[best]) best = j;
        });
        return best;
      });
      if (score(answers, QUESTIONS).primary === target) hits++;
    }
    console.log(`  ${label.padEnd(18)} ${((hits / trials) * 100).toFixed(1)}%  ${bar(hits / trials)}`);
  }
}

/* --- 6. Plane coverage --------------------------------------------------- */
{
  const cells = new Set();
  const r3 = prng(55555);
  for (let i = 0; i < N; i++) {
    const s = score(simulate(r3, 0.8), QUESTIONS);
    cells.add(`${Math.floor((s.x + 1) * 12)},${Math.floor((s.y + 1) * 12)}`);
  }
  console.log(`\nplane coverage (committed population): ${cells.size}/576 cells`);
  console.log(`archetype keys: ${ARCHETYPES.map((a) => a.key).join(', ')}`);
}
