// SPAWNPOINT — the classification algorithm.
// Isomorphic & deterministic: same module, same answers, same result, on both
// the server (before persisting) and the browser (instant results, share links).
//
// THE MATH (see README for the full write-up):
//   1. Every answer contributes evidence FOR one or more archetype poles.
//   2. Axis position (dominance ratio, per opposing pair):
//        axisPos = (Eplus − Eminus) / (Eplus + Eminus + κ),  κ = 2
//      Bounded to (−1, +1); resists question-count imbalance; κ smoothing means
//      nobody lands on the absolute vertex from a handful of questions.
//   3. Affinity share per archetype (smoothed, sums to exactly 1):
//        share_i = (E_i + β) / Σ(E_j + 6β),  β = 1
//   4. Spawn point = convex combination of the six vertices weighted by shares:
//        P = Σ share_i · vertex_i      → guaranteed inside the hexagon.
//   5. Conviction = mean(|axisPos|) — how decisively you leaned overall.

import {
  KAPPA, BETA, AXES, POLES, POLE_RING, placePoint, opposite, areAdjacent,
} from './axes.js';
import {
  QUESTIONS, QUIZ_VERSION, SLIDER_NEUTRAL, SLIDER_MAX_EVIDENCE,
} from './questions.js';
import { CONVICTION_TIERS, TERRITORY_TIERS } from './archetypes.js';

export { QUIZ_VERSION };

// ---- validation -------------------------------------------------------------

export function validateAnswers(answers) {
  const errors = [];
  if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) {
    return { ok: false, errors: [`answers must be an array of ${QUESTIONS.length} entries`] };
  }
  answers.forEach((a, i) => {
    const q = QUESTIONS[i];
    if (typeof a !== 'number' || !Number.isFinite(a)) {
      errors.push(`${q.id}: answer must be a number`);
      return;
    }
    if (q.type === 'slider') {
      if (a < 0 || a > 100) errors.push(`${q.id}: slider value must be within 0..100`);
    } else if (!Number.isInteger(a) || a < 0 || a >= q.options.length) {
      errors.push(`${q.id}: option index out of range (0..${q.options.length - 1})`);
    }
  });
  return { ok: errors.length === 0, errors };
}

// ---- evidence ---------------------------------------------------------------

export function evidenceFromAnswers(answers) {
  const ev = Object.fromEntries(POLES.map((p) => [p, 0]));
  QUESTIONS.forEach((q, i) => {
    const a = answers[i];
    if (q.type === 'slider') {
      const offset = (Number(a) - 50) / 50; // −1..+1
      if (Math.abs(offset) < SLIDER_NEUTRAL) return; // a neutral shrug
      const strength = Math.min(SLIDER_MAX_EVIDENCE, Math.abs(offset) * SLIDER_MAX_EVIDENCE);
      const pole = offset > 0 ? q.toward : opposite(q.toward);
      ev[pole] += strength;
    } else {
      const opt = q.options[a];
      if (!opt || !opt.w) return;
      for (const [pole, weight] of Object.entries(opt.w)) {
        if (POLES.includes(pole)) ev[pole] += weight;
      }
    }
  });
  return ev;
}

// ---- axes -------------------------------------------------------------------

export function axisPositions(ev) {
  return AXES.map((ax) => {
    const plus = ev[ax.plus];
    const minus = ev[ax.minus];
    const value = (plus - minus) / (plus + minus + KAPPA);
    return {
      id: ax.id,
      plus: ax.plus,
      minus: ax.minus,
      value, // −1..+1 (positive pulls toward `plus`)
      strength: Math.abs(value),
      toward: value >= 0 ? ax.plus : ax.minus,
    };
  });
}

// ---- affinities -------------------------------------------------------------

// Shares sum to exactly 1; pcts sum to exactly 100 (largest-remainder rounding).
export function affinityShares(ev) {
  const total = POLES.reduce((s, p) => s + ev[p] + BETA, 0);
  const shares = Object.fromEntries(POLES.map((p) => [p, (ev[p] + BETA) / total]));
  return shares;
}

// pct (rounded, sums to 100) per pole, in POLE_RING order — deterministic.
export function affinityPcts(shares) {
  const idx = (pole) => POLE_RING.indexOf(pole);
  const floors = POLE_RING.map((p) => Math.floor(shares[p] * 100));
  let remainder = 100 - floors.reduce((s, n) => s + n, 0);
  const frac = POLE_RING.map((p) => shares[p] * 100 - Math.floor(shares[p] * 100));
  const byFrac = [...POLE_RING.keys()].sort((a, b) => frac[b] - frac[a] || a - b);
  const pcts = [...floors];
  for (let k = 0; k < remainder; k++) pcts[byFrac[k % POLE_RING.length]]++;
  return pcts;
}

// Ranked rows. Ranking is a pure function of the ROUNDED pcts (ties broken by
// ring order), so the share-codec — which only carries pcts — reproduces the
// exact same ranking when a link is opened elsewhere.
export function affinityRows(shares) {
  const pcts = affinityPcts(shares);
  const pctOf = (pole) => pcts[POLE_RING.indexOf(pole)];
  const order = [...POLE_RING].sort(
    (a, b) => pctOf(b) - pctOf(a) || POLE_RING.indexOf(a) - POLE_RING.indexOf(b)
  );
  return order.map((id, i) => ({ id, share: shares[id], pct: pctOf(id), rank: i + 1 }));
}

// ---- the run ----------------------------------------------------------------

// Everything after evidence — exported so tests (and anyone curious) can score
// hypothetical evidence directly.
export function scoreFromEvidence(evidence) {
  const shares = affinityShares(evidence);
  const affinities = affinityRows(shares);
  const axes = axisPositions(evidence);

  const point = placePoint(shares);
  const distance = Math.hypot(point.x, point.y);
  const convictionValue = axes.reduce((s, ax) => s + ax.strength, 0) / axes.length;
  const convictionTier = tierFor(CONVICTION_TIERS, convictionValue);
  const conviction = {
    value: convictionValue,
    pct: Math.round(convictionValue * 100),
    tier: convictionTier.label,
    line: convictionTier.line,
  };

  const territory = tierFor(TERRITORY_TIERS, distance);
  const primary = affinities[0].id;
  const secondary = affinities[1].id;

  return {
    version: QUIZ_VERSION,
    evidence,
    shares,
    affinities,
    axes,
    point,
    distance,
    conviction,
    territory: { label: territory.label, line: territory.line },
    sector: sectorName(primary, secondary, distance, shares),
    primary,
    secondary,
  };
}

export function scoreRun(answers) {
  const check = validateAnswers(answers);
  if (!check.ok) {
    const err = new Error(`invalid answers: ${check.errors.join('; ')}`);
    err.status = 400;
    throw err;
  }
  const evidence = evidenceFromAnswers(answers);
  return { ...scoreFromEvidence(evidence), answers };
}

function tierFor(tiers, value) {
  return tiers.find((t) => value < t.max) || tiers[tiers.length - 1];
}

export function sectorName(primary, secondary, distance, shares) {
  if (distance < 0.15 || shares[primary] - shares[secondary] < 0.04) return 'THE CROSSROADS';
  if (areAdjacent(primary, secondary)) return `${primary.toUpperCase()}–${secondary.toUpperCase()} CORRIDOR`;
  return `${primary.toUpperCase()}–${secondary.toUpperCase()} TRADE ROUTE`;
}

// ---- compact summary (server responses, profile lists) ----------------------

export function summarize(score) {
  return {
    version: score.version,
    primary: score.primary,
    secondary: score.secondary,
    axes: score.axes.map((ax) => Math.round(ax.value * 1000) / 1000),
    affinities: score.affinities.map((row) => row.pct),
    convictionPct: score.conviction.pct,
    coords: { x: Math.round(score.point.x * 1000) / 1000, y: Math.round(score.point.y * 1000) / 1000 },
  };
}
