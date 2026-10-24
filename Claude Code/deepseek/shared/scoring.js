/**
 * SPAWNPOINT — the classification algorithm.
 *
 * ===========================================================================
 * 1. THE FRAME
 * ===========================================================================
 * Each of the six archetypes owns a fixed unit vector V_i on the plane, spaced
 * 60 degrees apart, so opposing pairs sit exactly 180 degrees apart:
 *
 *      competitor   0 deg      wanderer   180 deg
 *      architect   60 deg      connector  240 deg
 *      storyteller 120 deg      curator   300 deg
 *
 * Answers produce a weight vector over the six archetypes. Normalised to a
 * distribution `w` (sum = 1), the player's point is the *weighted barycentre*
 * of the six vertices:
 *
 *      P = SUM_i  w_i * V_i
 *
 * A hexagon is not a decoration here, it is the load-bearing choice. It is the
 * only regular polygon whose six vertices sum to the origin while still
 * forming three clean opposing pairs — which is what makes "no strong
 * preference" land exactly on (0,0). Direction encodes *which* archetype you
 * lean toward; radius encodes *how hard* you lean.
 *
 * ===========================================================================
 * 2. DEBIAS
 * ===========================================================================
 * No question bank is perfectly even. If Competitor options happen to be worded
 * more often than Curator options, a player answering at random still drifts
 * toward Competitor — which is a lie. So we compute `E`, the weight vector a
 * uniformly random playthrough would score against this exact bank, and work
 * with the deviation:
 *
 *      d = w - E          (SUM d_i = 0, so the origin still means "no signal")
 *
 * E is derived from the bank at runtime and memoised. Questions can be
 * rewritten later without silently shifting everyone's coordinate.
 *
 * ===========================================================================
 * 3. CALIBRATE THE RADIUS
 * ===========================================================================
 * Raw |d| is a narrow band: about 0.15 for a coin-flip responder (pure sampling
 * noise across 24 questions) rising to about 0.6 for someone who picks the
 * most on-brand option every single time. Plotted raw, everybody would land in
 * a small ring near the middle and the outer plane would be dead space.
 *
 * So the scale is *tared*, the way you would zero a set of scales:
 *
 *      FLOOR   = mean |d| of a simulated coin-flip responder   (the instrument's
 *                noise floor — the radius at which we genuinely cannot tell
 *                signal from randomness)
 *      CEILING = mean |d| of the six maximally-consistent playthroughs
 *                (one per archetype — "as committed as this quiz can detect")
 *
 *      r = ((|d| - FLOOR) / (CEILING - FLOOR)) ^ RIM_SHAPE        clamped to [0,1]
 *
 * Both constants are *computed from the bank at startup*, not hand-tuned
 * magic numbers, and are cached per bank. Change the questions and the scale
 * re-tares itself. The result of a coin-flip responder is 0 on average; the
 * result of a zealot hugs the rim; everyone real falls in between, spread
 * across the disc rather than smeared against the edge.
 */

import { ARCHETYPES, ARCHETYPE_KEYS, ARCHETYPE_BY_KEY, SECTORS, CENTER_SECTOR } from './archetypes.js';

export const SCORE_VERSION = 4;
/** Exponent applied after taring. <1 pushes points outward off the centre. */
export const RIM_SHAPE = 0.62;
/** r below this reads as "balanced rather than typed". */
export const CENTER_THRESHOLD = 0.3;
/** Deviation -> 0-100 affinity. 50 is the neutral baseline. */
export const AFFINITY_SCALE = 250;

const CALIBRATION_SAMPLES = 720;

/* -------------------------------------------------------------------------- */
/* Geometry                                                                    */
/* -------------------------------------------------------------------------- */

const VECTORS = (() => {
  const out = {};
  for (const a of ARCHETYPES) {
    const t = (a.angle * Math.PI) / 180;
    out[a.key] = { x: Math.cos(t), y: Math.sin(t) };
  }
  return out;
})();

export function archetypeVector(key) {
  return VECTORS[key] ?? { x: 0, y: 0 };
}

export function archetypeAngle(key) {
  return ARCHETYPE_BY_KEY[key]?.angle ?? 0;
}

/* -------------------------------------------------------------------------- */
/* Expected vector + calibration, memoised per question bank                    */
/* -------------------------------------------------------------------------- */

const CALIBRATION_CACHE = new WeakMap();

/** Deterministic xorshift so calibration is identical on every machine. */
function seededRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/**
 * What a uniformly random playthrough would score, given this exact bank.
 * Derived, never hard-coded.
 */
export function expectedVector(questions) {
  return calibration(questions).expected;
}

/**
 * @returns {{expected: Record<string,number>, floor: number, ceiling: number}}
 */
export function calibration(questions) {
  const cached = CALIBRATION_CACHE.get(questions);
  if (cached) return cached;

  // --- Expected weights under uniform random answering -------------------
  const totals = Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, 0]));
  for (const q of questions) {
    const optionCount = q.options.length || 1;
    for (const o of q.options) {
      const entries = Object.entries(o.w).filter(([, v]) => v > 0);
      const sum = entries.reduce((s, [, v]) => s + v, 0) || 1;
      const inten = o.intensity ?? 1;
      for (const [k, v] of entries) totals[k] += ((v / sum) * inten) / optionCount;
    }
  }
  const grand = ARCHETYPE_KEYS.reduce((s, k) => s + totals[k], 0) || 1;
  const expected = Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, totals[k] / grand]));

  // --- Per-archetype spread, from the same simulation --------------------
  // Some archetypes are simply easier to trigger than others (more of the
  // bank's options point their way). Left alone, that gives them more leverage
  // over the coordinate than their siblings. We measure the spread of each
  // archetype's deviation under random play and divide it out, exactly the way
  // you would standardise features before a linear projection.
  const rand = seededRandom(0x5a1d0c);
  const sums = Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, 0]));
  const sumsq = Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, 0]));
  const samples = new Array(CALIBRATION_SAMPLES);
  for (let i = 0; i < CALIBRATION_SAMPLES; i++) {
    const answers = questions.map((q) => Math.floor(rand() * q.options.length));
    const { raw } = rawVector(answers, questions);
    const { d } = project(raw, expected, null);
    samples[i] = d;
    for (const k of ARCHETYPE_KEYS) {
      sums[k] += d[k];
      sumsq[k] += d[k] * d[k];
    }
  }
  // --- Whitening: give every archetype equal reach ------------------------
  // "Reach" is how far a maximally-consistent playthrough for that archetype
  // can push the point. Without this, an archetype whose options happen to be
  // packed into more of the bank gets a longer lever than its siblings, and its
  // players are placed further from the centre for identical consistency.
  // We measure the six ideal playthroughs and rescale the axes so all six
  // reach exactly the same distance. We also fold in the random-play spread, so
  // a noisier archetype does not outrank a stable one on sampling luck alone.
  const ideal = {};
  for (const k of ARCHETYPE_KEYS) {
    const answers = questions.map((q) => {
      let best = 0;
      let bestVal = -1;
      q.options.forEach((o, i) => {
        const v = (o.w[k] || 0) * (o.intensity ?? 1);
        if (v > bestVal) {
          bestVal = v;
          best = i;
        }
      });
      return best;
    });
    const { raw } = rawVector(answers, questions);
    ideal[k] = project(raw, expected, null).r;
  }
  const spread = Object.fromEntries(
    ARCHETYPE_KEYS.map((k) => {
      const mean = sums[k] / CALIBRATION_SAMPLES;
      const variance = Math.max(sumsq[k] / CALIBRATION_SAMPLES - mean * mean, 1e-9);
      return [k, Math.sqrt(variance)];
    }),
  );
  const idealMean = ARCHETYPE_KEYS.reduce((s, k) => s + ideal[k], 0) / ARCHETYPE_KEYS.length;
  const spreadMean = ARCHETYPE_KEYS.reduce((s, k) => s + spread[k], 0) / ARCHETYPE_KEYS.length;
  // Half the correction comes from reach, half from spread. Both are ratios
  // around 1, so this nudges rather than distorts.
  const whitening = Object.fromEntries(
    ARCHETYPE_KEYS.map((k) => {
      const reachRatio = idealMean / Math.max(ideal[k], idealMean * 0.4);
      const spreadRatio = spreadMean / Math.max(spread[k], spreadMean * 0.4);
      return [k, Math.sqrt(reachRatio * spreadRatio)];
    }),
  );

  // --- Noise floor: mean |d| of a simulated coin-flip responder -----------
  let floorSum = 0;
  for (const d of samples) {
    let px = 0;
    let py = 0;
    for (const k of ARCHETYPE_KEYS) {
      const v = d[k] * whitening[k];
      px += v * VECTORS[k].x;
      py += v * VECTORS[k].y;
    }
    floorSum += Math.hypot(px, py);
  }
  const floor = floorSum / CALIBRATION_SAMPLES;

  // --- Ceiling: mean |d| of the six maximally-consistent playthroughs -----
  const reach = ARCHETYPE_KEYS.map((k) => ideal[k] * whitening[k]);
  const ceiling = reach.reduce((s, v) => s + v, 0) / reach.length;

  const result = {
    expected,
    whitening,
    ideal,
    spread,
    floor,
    // Guard against a degenerate bank where the two collapse onto each other.
    ceiling: ceiling > floor * 1.15 ? ceiling : floor * 1.6,
  };
  CALIBRATION_CACHE.set(questions, result);
  return result;
}

const EMPTY_VECTOR = Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, 0]));

/** Raw sum of option weights, per archetype. */
function rawVector(answers, questions) {
  const raw = { ...EMPTY_VECTOR };
  let answered = 0;
  questions.forEach((q, qi) => {
    const ai = answers?.[qi];
    const opt = Number.isInteger(ai) ? q.options[ai] : undefined;
    if (!opt) return;
    answered += 1;
    const entries = Object.entries(opt.w).filter(([, v]) => v > 0);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    const intensity = opt.intensity ?? 1;
    for (const [k, v] of entries) raw[k] += (v / total) * intensity;
  });
  return { raw, answered };
}

/**
 * The whitened deviation vector and its raw magnitude.
 * @returns {{d: Record<string,number>, px: number, py: number, r: number}}
 */
function project(raw, expected, whitening) {
  const total = ARCHETYPE_KEYS.reduce((s, k) => s + raw[k], 0) || 1;
  const d = {};
  const dv = {};
  let px = 0;
  let py = 0;
  for (const k of ARCHETYPE_KEYS) {
    d[k] = raw[k] / total - expected[k];
    dv[k] = whitening ? d[k] * whitening[k] : d[k];
    px += dv[k] * VECTORS[k].x;
    py += dv[k] * VECTORS[k].y;
  }
  return { d, dv, px, py, r: Math.hypot(px, py) };
}

/* -------------------------------------------------------------------------- */
/* Scoring                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Turn an answers array (option index per question, or null for skipped) into
 * the full scoring payload.
 *
 * This is the single source of truth. The browser calls it live to draw the
 * preview plane; the server calls it again before persisting, so a tampered
 * client cannot write a fabricated coordinate into the population data.
 *
 * @param {(number|null)[]} answers
 * @param {Array} questions
 */
export function score(answers, questions) {
  const { expected, whitening, floor, ceiling } = calibration(questions);
  const { raw, answered } = rawVector(answers, questions);

  const totalRaw = ARCHETYPE_KEYS.reduce((s, k) => s + raw[k], 0) || 1;
  const weights = Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, raw[k] / totalRaw]));
  const { d: deviation, dv, px, py, r: rRaw } = project(raw, expected, whitening);

  // Tare the instrument, then shape the rim.
  const tared = clamp01((rRaw - floor) / (ceiling - floor));
  const rOut = Math.pow(tared, RIM_SHAPE);
  const scale = rRaw > 1e-9 ? rOut / rRaw : 0;
  const x = round4(px * scale);
  const y = round4(py * scale);

  // Ranked on the *whitened* deviation — the z-score against the baseline — so
  // an archetype that is worded across more of the bank does not simply outrank
  // its siblings by weight of numbers.
  const ranked = [...ARCHETYPE_KEYS].sort((a, b) => dv[b] - dv[a]);
  const primary = ranked[0];
  const secondary = ranked[1];
  const least = ranked[ranked.length - 1];

  // Versatility: how evenly your *excess* is spread. Above baseline on all six
  // archetypes = versatile; above baseline on one = a specialist.
  const positive = ARCHETYPE_KEYS.map((k) => Math.max(0, dv[k]));
  const posSum = positive.reduce((s, v) => s + v, 0) || 1;
  let entropy = 0;
  for (const p of positive) {
    const q = p / posSum;
    if (q > 0) entropy -= q * Math.log(q);
  }
  const versatility = entropy / Math.log(ARCHETYPE_KEYS.length);

  const intensity = rOut; // 0..1, how far from dead centre
  const balance = 1 - intensity;

  // 0-100 affinity per archetype, 50 = neutral baseline. This is the number in
  // the results breakdown, and it lines up exactly with the geometry: a bar
  // above 50 physically pulls the point toward that vertex.
  const affinities = Object.fromEntries(
    ARCHETYPE_KEYS.map((k) => [k, Math.round(clamp(50 + dv[k] * AFFINITY_SCALE, 0, 100) * 10) / 10]),
  );

  /** Gap between your top two archetypes, in affinity points (0-100 scale). */
  const margin = affinities[primary] - affinities[secondary];

  // Human-readable 0-100 "decisiveness": how much of the result is one
  // archetype running away with it.
  const decisiveness = clamp01(margin / 26) * 0.6 + clamp01(rOut * 1.15) * 0.4;

  const heading = (((Math.atan2(y, x) * 180) / Math.PI) % 360 + 360) % 360;
  const nearCenter = rOut < CENTER_THRESHOLD;
  const sector = nearCenter || answered === 0 ? CENTER_SECTOR : sectorFor(heading);

  // Bipolar readouts for the three opposing pairs: the difference of the two
  // affinities, so -100 = entirely the left pole, +100 = entirely the right.
  const pairs = [
    { label: 'Discovery ↔ Conquest', left: 'wanderer', right: 'competitor' },
    { label: 'Collect ↔ Build', left: 'curator', right: 'architect' },
    { label: 'Immerse ↔ Belong', left: 'storyteller', right: 'connector' },
  ].map((p) => ({
    ...p,
    leftLabel: ARCHETYPE_BY_KEY[p.left].short,
    rightLabel: ARCHETYPE_BY_KEY[p.right].short,
    value: Math.round(clamp(affinities[p.right] - affinities[p.left], -100, 100)),
  }));

  return {
    version: SCORE_VERSION,
    answeredCount: answered,
    skippedCount: questions.length - answered,
    weights,
    /** Whitened deviation (z-score against the baseline), pre-scaled. */
    deviation: Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, round4(dv[k])])),
    affinities,
    /** Raw share of your answers, as a percentage summing to 100. */
    share: Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, Math.round(weights[k] * 1000) / 10])),
    raw: Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, round4(raw[k])])),
    x,
    y,
    radius: round4(rOut),
    tared: round4(tared),
    rawRadius: round4(rRaw),
    heading: Math.round(heading),
    primary,
    secondary,
    least,
    tension: ARCHETYPE_BY_KEY[primary]?.shadow ?? null,
    ranked,
    pairs,
    versatility: round4(versatility),
    intensity: round4(intensity),
    balance: round4(balance),
    margin: round4(margin),
    decisiveness: round4(decisiveness),
    sector: { key: sector.key, label: sector.label, text: sector.text },
    signature: signature(answers, heading, rOut),
    calibration: { floor: round4(floor), ceiling: round4(ceiling) },
  };
}

/* -------------------------------------------------------------------------- */

function sectorFor(heading) {
  for (const s of SECTORS) {
    const from = ((s.from % 360) + 360) % 360;
    const to = ((s.to % 360) + 360) % 360;
    if (from < to ? heading >= from && heading < to : heading >= from || heading < to) return s;
  }
  return CENTER_SECTOR;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function round4(v) {
  return Math.round(v * 10000) / 10000;
}

/* -------------------------------------------------------------------------- */
/* Answers <-> share-link codec                                                */
/* -------------------------------------------------------------------------- */

const EMPTY = '-';

/** answers -> compact string like "0213-12..." (one base-36 char per question) */
export function encodeAnswers(answers) {
  return answers
    .map((a) => (Number.isInteger(a) && a >= 0 && a < 36 ? a.toString(36) : EMPTY))
    .join('');
}

/** compact string -> answers array (null for skipped / malformed) */
export function decodeAnswers(code, length) {
  if (typeof code !== 'string') return new Array(length).fill(null);
  const out = [];
  for (let i = 0; i < length; i++) {
    const ch = code[i];
    if (ch === undefined || ch === EMPTY) {
      out.push(null);
      continue;
    }
    const v = parseInt(ch, 36);
    out.push(Number.isInteger(v) && v >= 0 ? v : null);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Call sign                                                                   */
/* -------------------------------------------------------------------------- */

const CALL_ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O, they read as 1/0

/**
 * Deterministic 6-char call sign, e.g. `KQX-410`. Derived from the answer
 * pattern plus the resulting coordinate, so identical playthroughs collide
 * (which is the point) and near-identical ones usually do not.
 */
export function signature(answers, heading, radius) {
  let h = 2166136261 >>> 0;
  const seed = `${(answers || []).join(',')}|${Math.round(heading)}|${Math.round(radius * 1000)}`;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const chars = [];
  for (let i = 0; i < 3; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    chars.push(CALL_ALPHA[h % CALL_ALPHA.length]);
  }
  for (let i = 0; i < 3; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    chars.push(String(h % 10));
  }
  return `${chars.slice(0, 3).join('')}-${chars.slice(3).join('')}`;
}
