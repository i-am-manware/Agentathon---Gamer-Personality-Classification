/**
 * Rift Index scoring — resolved barycenter.
 *
 * 1. Affinity for a signal is the weight you earned divided by the weight
 *    you could have earned. Each of the six lives in [0, 1].
 * 2. Opposing poles collapse into a signed lean:
 *      composition = architect − wildcard
 *      destination = laureate − nomad
 *      company     = chorus − shade
 *    A tie adds no direction. Both bars can still read high. That is a braid.
 * 3. The winning pole of each pair receives mass equal to the absolute lean.
 * 4. The jewel is their center of mass on the rim. A radius curve lets one
 *    loud lean reach the edge, and keeps a split lean visible inside the field.
 * 5. Clarity is the correlation of the odd questions with the even questions.
 *
 * The nearest rim-word is not the verdict. Bright names and leader lines are.
 * Three axes projected onto a plane will sometimes sit a 120° blend inward of
 * a third label. The title follows the masses, and the lines point at them.
 */

import { AXES, QUESTIONS } from './content.js';

export const ARCHETYPES = [
  { id: 'architect', label: 'Architect', angle: 90, color: '#e4c56a', pair: 'composition', pole: 1 },
  { id: 'laureate', label: 'Laureate', angle: 30, color: '#e2ff4d', pair: 'destination', pole: 1 },
  { id: 'shade', label: 'Shade', angle: 330, color: '#c8b6ff', pair: 'company', pole: -1 },
  { id: 'wildcard', label: 'Wildcard', angle: 270, color: '#ff5a36', pair: 'composition', pole: -1 },
  { id: 'nomad', label: 'Nomad', angle: 210, color: '#8eb7ff', pair: 'destination', pole: -1 },
  { id: 'chorus', label: 'Chorus', angle: 150, color: '#ff9ec8', pair: 'company', pole: 1 },
];

export const IDS = ARCHETYPES.map((a) => a.id);

const BY_ID = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a]));

export const OPPOSITE = {
  architect: 'wildcard',
  wildcard: 'architect',
  laureate: 'nomad',
  nomad: 'laureate',
  chorus: 'shade',
  shade: 'chorus',
};

export function archetype(id) {
  return BY_ID[id];
}

export function opposite(id) {
  return OPPOSITE[id];
}

export class QuizError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.expose = true;
  }
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export function maxPossible() {
  const max = Object.fromEntries(IDS.map((id) => [id, 0]));
  for (const q of QUESTIONS) {
    for (const id of IDS) {
      max[id] += Math.max(0, ...q.options.map((o) => o.weights[id] || 0));
    }
  }
  return max;
}

function affinityFor(questions, answers) {
  const raw = Object.fromEntries(IDS.map((id) => [id, 0]));
  const max = Object.fromEntries(IDS.map((id) => [id, 0]));
  for (const q of questions) {
    for (const id of IDS) {
      max[id] += Math.max(0, ...q.options.map((o) => o.weights[id] || 0));
    }
    const chosen = q.options.find((o) => o.id === answers[q.id]);
    for (const id of IDS) raw[id] += chosen?.weights[id] || 0;
  }
  const affinity = {};
  for (const id of IDS) affinity[id] = max[id] ? raw[id] / max[id] : 0;
  return { raw, max, affinity };
}

function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i += 1) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  if (da < 1e-8 || db < 1e-8) return 1;
  return num / Math.sqrt(da * db);
}

export function clarityLabel(value) {
  if (value == null || Number.isNaN(value)) return null;
  if (value >= 0.45) return 'Sharp';
  if (value >= 0.15) return 'Braided';
  return 'Mixed';
}

function splitHalfClarity(answers) {
  const odd = QUESTIONS.filter((_, i) => i % 2 === 0);
  const even = QUESTIONS.filter((_, i) => i % 2 === 1);
  const a = affinityFor(odd, answers).affinity;
  const b = affinityFor(even, answers).affinity;
  const va = IDS.map((id) => a[id]);
  const vb = IDS.map((id) => b[id]);
  const value = pearson(va, vb);
  return { value, label: clarityLabel(value) };
}

function indexOfId(id) {
  return IDS.indexOf(id);
}

function paradoxPair(rawSorted) {
  const [a, b] = rawSorted;
  if (!a || !b) return null;
  if (opposite(a.id) !== b.id) return null;
  if (a.v < 0.45) return null;
  if (a.v === 0 || b.v / a.v < 0.75) return null;
  return [a.id, b.id];
}

function chooseIdentity(affinity, masses) {
  const raw = IDS.map((id) => ({ id, v: affinity[id] }))
    .sort((a, b) => b.v - a.v || indexOfId(a.id) - indexOfId(b.id));
  const para = paradoxPair(raw);
  const topMass = masses[0]?.m || 0;
  if (para && topMass < raw[0].v * 0.45) {
    return { mode: 'paradox', primary: para[0], secondary: para[1] };
  }
  if (topMass < 0.12) {
    if (raw[0].v >= 0.5) return { mode: 'still', primary: raw[0].id, secondary: null };
    return { mode: 'faint', primary: raw[0].id, secondary: null };
  }
  const primary = masses[0];
  const secondary = masses[1];
  if (!secondary || secondary.m / primary.m < 0.42) {
    return { mode: 'pure', primary: primary.id, secondary: null };
  }
  return { mode: 'blend', primary: primary.id, secondary: secondary.id };
}

/**
 * Place a jewel from six affinities in [0, 1].
 * Returns leans, masses, point, leaders, highlight, braids, identity.
 */
export function assessAffinity(input, extras = {}) {
  const affinity = {};
  for (const id of IDS) affinity[id] = clamp01(Number(input?.[id] ?? 0));

  const leans = {};
  const masses = [];
  for (const axis of AXES) {
    const lean = affinity[axis.pos] - affinity[axis.neg];
    leans[axis.id] = lean;
    const mag = Math.abs(lean);
    if (mag < 1e-4) continue;
    masses.push({ id: lean >= 0 ? axis.pos : axis.neg, m: mag, axis: axis.id });
  }
  masses.sort((a, b) => b.m - a.m || indexOfId(a.id) - indexOfId(b.id));

  let x = 0;
  let y = 0;
  let mass = 0;
  for (const p of masses) {
    const arch = BY_ID[p.id];
    const rad = (arch.angle * Math.PI) / 180;
    x += p.m * Math.cos(rad);
    y += p.m * Math.sin(rad);
    mass += p.m;
  }

  let point = { x: 0, y: 0 };
  if (mass >= 1e-6) {
    const cmx = x / mass;
    const cmy = y / mass;
    const cmr = Math.hypot(cmx, cmy);
    if (cmr >= 1e-6) {
      const curved = cmr ** 0.72;
      const peak = masses[0].m;
      const strength = Math.min(1, peak / 0.85);
      const finalR = Math.min(0.94, curved * strength);
      point = { x: (cmx / cmr) * finalR, y: (cmy / cmr) * finalR };
    }
  }

  const braids = [];
  const braidPoles = [];
  for (const axis of AXES) {
    const a = affinity[axis.pos];
    const b = affinity[axis.neg];
    if (a >= 0.52 && b >= 0.52 && Math.abs(a - b) <= 0.2) {
      braids.push(axis.id);
      braidPoles.push(axis.pos, axis.neg);
    }
  }

  const leaders = masses.filter((p) => p.m >= 0.18).map((p) => p.id);
  const identity = chooseIdentity(affinity, masses);

  const highlight = new Set();
  if (identity.mode === 'still') {
    for (const id of IDS) highlight.add(id);
  } else if (identity.mode === 'paradox') {
    highlight.add(identity.primary);
    highlight.add(identity.secondary);
  } else if (identity.mode === 'pure' || identity.mode === 'blend') {
    highlight.add(identity.primary);
    if (identity.secondary) highlight.add(identity.secondary);
    for (const id of leaders) highlight.add(id);
    for (const id of braidPoles) highlight.add(id);
  }

  const scores = {};
  for (const id of IDS) scores[id] = Math.round(affinity[id] * 100);

  return {
    affinity,
    scores,
    leans,
    masses,
    point,
    reach: Math.hypot(point.x, point.y),
    leaders,
    highlight: [...highlight],
    braids,
    braidPoles,
    identity,
    clarity: extras.clarity ?? null,
    clarityLabel: extras.clarityLabel ?? (extras.clarity == null ? null : clarityLabel(extras.clarity)),
    echoes: extras.echoes || [],
  };
}

function pickEcho(answers, primary) {
  if (!primary) return [];
  let best = null;
  QUESTIONS.forEach((q, index) => {
    const chosen = q.options.find((o) => o.id === answers[q.id]);
    const w = chosen?.weights?.[primary] || 0;
    if (!chosen?.echo || w < 2) return;
    if (!best || w > best.w || (w === best.w && index > best.index)) {
      best = { w, index, echo: chosen.echo };
    }
  });
  return best ? [best.echo] : [];
}

export function assessAnswers(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new QuizError('The plate needs an answer for every situation.');
  }
  for (const q of QUESTIONS) {
    const id = answers[q.id];
    if (!q.options.some((o) => o.id === id)) {
      throw new QuizError('Answer all twenty-four. The plate needs a full reading.');
    }
  }
  const { affinity } = affinityFor(QUESTIONS, answers);
  const clarity = splitHalfClarity(answers);
  const draft = assessAffinity(affinity, { clarity: clarity.value, clarityLabel: clarity.label });
  const echoes = pickEcho(answers, draft.identity.primary);
  return { ...draft, echoes };
}

export function axisById(id) {
  return AXES.find((a) => a.id === id);
}
