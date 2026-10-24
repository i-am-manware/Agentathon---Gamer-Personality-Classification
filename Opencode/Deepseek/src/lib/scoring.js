import { QUESTIONS, ARCHETYPES, PAIRS, QUIZ_VERSION } from '../../shared/quiz.data.js';

const DEG = Math.PI / 180;

const UNITS = Object.fromEntries(
  ARCHETYPES.map((a) => [a.key, { x: Math.cos(a.angle * DEG), y: Math.sin(a.angle * DEG) }])
);

export const GEOMETRY = {
  maxVectorMagnitude: 2,
  displayGain: 3.1,
  displayCeiling: 0.97
};

export const TIERS = [
  { max: 0.24, key: 'fluid', name: 'FLUID BUILD', note: 'No single drive runs the show.' },
  { max: 0.48, key: 'hybrid', name: 'HYBRID BUILD', note: 'Two currents share the wheel.' },
  { max: 0.72, key: 'specialist', name: 'SPECIALIST BUILD', note: 'One drive leads and the rest support.' },
  { max: Infinity, key: 'pure', name: 'PURE BUILD', note: 'An extreme build. There is no mistaking you.' }
];

export function validateAnswers(answers) {
  if (!Array.isArray(answers) || answers.length !== QUESTIONS.length) return false;
  for (let i = 0; i < answers.length; i++) {
    const v = answers[i];
    if (!Number.isInteger(v) || v < 0 || v >= QUESTIONS[i].options.length) return false;
  }
  return true;
}

export function answerCaps() {
  const caps = Object.fromEntries(ARCHETYPES.map((a) => [a.key, 0]));
  for (const q of QUESTIONS) {
    const best = {};
    for (const o of q.options) {
      for (const [k, v] of Object.entries(o.w)) {
        if (!(k in caps)) continue;
        best[k] = Math.max(best[k] ?? 0, v);
      }
    }
    for (const [k, v] of Object.entries(best)) caps[k] += v;
  }
  return caps;
}

export function computeScores(answers) {
  const caps = answerCaps();
  const raw = Object.fromEntries(ARCHETYPES.map((a) => [a.key, 0]));
  QUESTIONS.forEach((q, i) => {
    const chosen = q.options[answers[i]];
    for (const [k, v] of Object.entries(chosen.w)) {
      if (k in raw) raw[k] += v;
    }
  });
  const scores = ARCHETYPES.map((a) => {
    const cap = caps[a.key] || 1;
    const pct = Math.max(0, Math.min(100, (raw[a.key] / cap) * 100));
    return { key: a.key, raw: raw[a.key], cap, pct: round(pct, 1) };
  });
  return { scores, raw, caps };
}

export function pairTensions(scores) {
  const pct = Object.fromEntries(scores.map((s) => [s.key, s.pct]));
  return PAIRS.map((p) => ({
    pos: p.pos,
    neg: p.neg,
    label: p.label,
    posBlurb: p.posBlurb,
    negBlurb: p.negBlurb,
    net: round(pct[p.pos] - pct[p.neg], 1)
  }));
}

export function projectCoordinate(tensions) {
  let vx = 0;
  let vy = 0;
  for (const t of tensions) {
    const u = UNITS[t.pos];
    vx += (t.net / 100) * u.x;
    vy += (t.net / 100) * u.y;
  }
  const magnitude = Math.hypot(vx, vy);
  const rn = Math.min(1, magnitude / GEOMETRY.maxVectorMagnitude);
  const eased = Math.tanh(GEOMETRY.displayGain * rn);
  const r = round(GEOMETRY.displayCeiling * eased, 4);
  const angle = magnitude < 1e-9 ? 0 : Math.atan2(vy, vx) / DEG;
  const x = round(Math.cos(angle * DEG) * r, 4);
  const y = round(Math.sin(angle * DEG) * r, 4);
  return { x, y, r, rn: round(rn, 4), angle: round(angle, 1), magnitude: round(magnitude, 4) };
}

export function coherence(scores) {
  const total = scores.reduce((s, x) => s + x.pct, 0);
  if (total <= 0) return 0;
  let h = 0;
  for (const s of scores) {
    if (s.pct <= 0) continue;
    const p = s.pct / total;
    h -= p * Math.log(p);
  }
  return round(1 - h / Math.log(ARCHETYPES.length), 4);
}

export function tierFor(r) {
  return TIERS.find((t) => r < t.max) ?? TIERS[TIERS.length - 1];
}

export function computeResult(answers) {
  const { scores } = computeScores(answers);
  const tensions = pairTensions(scores);
  const coord = projectCoordinate(tensions);
  const clarity = coherence(scores);
  const confidence = Math.round(
    100 * (0.55 * clarity + 0.45 * Math.min(1, coord.rn * 2.2))
  );
  const sorted = [...scores].sort((a, b) => b.pct - a.pct || a.key.localeCompare(b.key));
  const dominant = sorted[0].key;
  const secondary = sorted[1].key;
  const weakest = sorted[sorted.length - 1].key;
  const gap = round(sorted[0].pct - sorted[1].pct, 1);
  const tier = tierFor(coord.r);

  return {
    v: QUIZ_VERSION,
    scores,
    tensions,
    coord,
    dominant,
    secondary,
    weakest,
    gap,
    confidence: Math.max(1, Math.min(99, confidence)),
    clarity,
    tier: { key: tier.key, name: tier.name, note: tier.note }
  };
}

function round(n, d) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
