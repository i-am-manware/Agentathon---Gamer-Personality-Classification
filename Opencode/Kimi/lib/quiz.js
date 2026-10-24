'use strict';

const { QUESTIONS } = require('../data/questions');
const { POLES, POLE_ORDER, AXES, CONVICTION, BALANCED_TITLE, CONSISTENCY } = require('../data/content');
const { id, shuffled } = require('./util');

/**
 * ── The HEXAXIS classification model ─────────────────────────────────────────
 *
 * Every answer pulls toward one of six poles. Each pole is offered exactly 8
 * times (4 within its opposing pair, 4 against other poles), so every pole has
 * an equal opportunity surface.
 *
 *   s(pole)   = wins / 8                       ∈ [0, 1]
 *   d(axis)   = s(poleA) − s(poleB)            ∈ [-1, 1]   (3 opposing pairs)
 *   P         = Σ d(axis) · unit(angle(axis))  ∈ ℝ²        (the star's position)
 *
 * Because cross-pair duels feed every pole they touch, |P| can reach 2 in
 * theory; realistically it stays under ~1.4. The display transform scales the
 * radius so the population spreads nicely across the chart (see
 * scripts/simulate.js, which was used to tune DISPLAY_SCALE and the
 * conviction bands against 100k simulated readers).
 *
 * Derived signals:
 *   conviction  — |P|: how far your star sits from the Still Center.
 *   consistency — cross-validation: do your cross-pair picks agree with the
 *                 leans you revealed in the within-pair duels?
 *   percentile  — where each pole score falls vs. everyone ever charted.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const APPEARANCES_PER_POLE = 8;
const SESSION_TTL_MS = 45 * 60 * 1000;
// Presentation transform, tuned with scripts/simulate.js over 100k synthetic
// readers (plus a pure-random control population):
//   raw |P|   p50≈0.45 (random) / 0.70 (latent prefs)   p90≈0.78 / 1.19
//   rDisplay = min(0.98, 0.9·|P|)  →  medians land at 0.41 / 0.63 with only
//   ~6% of the strongest stars touching the rim — where they look intentional.
const DISPLAY_SCALE = 0.9;
const DISPLAY_RIM = 0.98;
const BALANCED_RADIUS = 0.18; // |P| below this earns the special "Still Center" title

const RAD = (deg) => (deg * Math.PI) / 180;
const AXIS_UNIT = AXES.map((axis) => ({
  axis,
  ux: Math.cos(RAD(axis.angle)),
  uy: Math.sin(RAD(axis.angle)),
}));

class QuizService {
  constructor() {
    this.sessions = new Map(); // token -> session (in-memory; quiz state need not survive restarts)
    this._gc = setInterval(() => {
      const now = Date.now();
      for (const [token, s] of this.sessions) {
        if (s.expiresAt <= now || s.consumed) this.sessions.delete(token);
      }
    }, 10 * 60 * 1000);
    if (this._gc.unref) this._gc.unref();
  }

  /** Start a reading: shuffle question + option order, keep pole mapping server-side. */
  start() {
    const token = id(24);
    const items = shuffled(QUESTIONS).map((q) => ({
      id: q.id,
      pair: q.pair,
      text: q.q,
      options: shuffled([q.a, q.b]), // [{t, p}] — p never leaves the server
    }));
    this.sessions.set(token, {
      token,
      items,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
      consumed: false,
    });
    return {
      token,
      count: items.length,
      questions: items.map((it, i) => ({
        n: i + 1,
        id: it.id,
        text: it.text,
        options: it.options.map((o) => o.t),
      })),
    };
  }

  /** Score a completed reading. Throws {status} errors for invalid submissions. */
  submit(token, answers) {
    const session = this.sessions.get(token);
    if (!session || session.expiresAt <= Date.now()) {
      throw Object.assign(new Error('This reading has expired — begin a new one.'), { status: 410 });
    }
    if (session.consumed) {
      throw Object.assign(new Error('This reading was already submitted.'), { status: 409 });
    }
    if (!Array.isArray(answers) || answers.length !== session.items.length) {
      throw Object.assign(new Error(`Expected ${session.items.length} answers.`), { status: 400 });
    }

    const wins = Object.fromEntries(POLE_ORDER.map((p) => [p, 0]));
    const withinWins = Object.fromEntries(POLE_ORDER.map((p) => [p, 0]));
    const crossPicks = []; // [{picked, rival}] for consistency cross-validation
    const byId = new Map(session.items.map((it) => [it.id, it]));
    const seen = new Set();

    for (const ans of answers) {
      const item = byId.get(ans && ans.id);
      if (!item || seen.has(item.id)) {
        throw Object.assign(new Error('Unknown or duplicate question in answers.'), { status: 400 });
      }
      seen.add(item.id);
      const pick = ans.pick === 0 || ans.pick === 1 ? item.options[ans.pick] : null;
      if (!pick) throw Object.assign(new Error('Answer out of range.'), { status: 400 });
      const rival = item.options[1 - ans.pick];
      wins[pick.p]++;
      if (item.pair) {
        withinWins[pick.p]++;
      } else {
        crossPicks.push({ picked: pick.p, rival: rival.p });
      }
    }
    session.consumed = true;
    return this._compose(wins, withinWins, crossPicks);
  }

  _compose(wins, withinWins, crossPicks) {
    // 1. Pole strengths
    const s = Object.fromEntries(POLE_ORDER.map((p) => [p, wins[p] / APPEARANCES_PER_POLE]));

    // 2. Axis leans and the raw point
    const axes = {};
    let x = 0, y = 0;
    for (const { axis, ux, uy } of AXIS_UNIT) {
      const d = s[axis.a] - s[axis.b];
      axes[axis.id] = { a: axis.a, b: axis.b, d: round3(d) };
      x += d * ux;
      y += d * uy;
    }
    const r = Math.hypot(x, y);

    // 3. Primary / secondary poles (ties broken by proximity to the point's angle)
    const theta = Math.atan2(y, x);
    const ranked = POLE_ORDER.slice().sort((p1, p2) => {
      const ds = s[p2] - s[p1];
      if (Math.abs(ds) > 1e-9) return ds;
      return angularDist(theta, RAD(POLE_ANGLE[p2])) - angularDist(theta, RAD(POLE_ANGLE[p1]));
    });
    const [primary, secondary] = ranked;

    // 4. Title
    const gap = s[primary] - s[secondary];
    const balanced = r < BALANCED_RADIUS;
    let title, hybrid;
    if (balanced) {
      title = `The ${BALANCED_TITLE.noun}`;
      hybrid = false;
    } else if (gap >= 0.5) {
      title = `The True ${POLES[primary].noun}`;
      hybrid = false;
    } else {
      title = `The ${POLES[secondary].prefix} ${POLES[primary].noun}`;
      hybrid = true;
    }

    // 5. Conviction (how far from center) — bands tuned against simulated population
    const convictionValue = Math.round(100 * Math.min(1, r / 1.15));
    const convictionBand = r < 0.3 ? 'low' : r < 0.7 ? 'mid' : 'high';

    // 6. Consistency: do cross-pair picks agree with within-pair leans?
    let agree = 0, total = 0;
    for (const { picked, rival } of crossPicks) {
      const lean = withinWins[picked] - withinWins[rival];
      if (lean === 0) continue; // no revealed preference between these two poles
      total++;
      if (lean > 0) agree++;
    }
    const consistencyValue = total ? Math.round((100 * agree) / total) : 100;
    const consistencyBand = consistencyValue >= 75 ? 'high' : consistencyValue >= 45 ? 'mid' : 'low';

    // 7. Strongest axis for the reading's second paragraph
    const strongest = AXES.slice().sort((a1, a2) => Math.abs(axes[a2.id].d) - Math.abs(axes[a1.id].d))[0];
    const leanLine = axes[strongest.id].d >= 0 ? strongest.leanA : strongest.leanB;

    // 8. Prose
    const insight = [];
    if (balanced) {
      insight.push(BALANCED_TITLE.line + ' ' + POLES[primary].insight);
    } else {
      insight.push(POLES[primary].insight);
    }
    const p2 = [];
    if (hybrid && !balanced) p2.push(POLES[secondary].modifier);
    p2.push(leanLine);
    insight.push(p2.join(' '));
    insight.push(`${CONVICTION[convictionBand]} ${CONSISTENCY[consistencyBand]}`);

    // 9. Kindred worlds: 3 from the primary star, 1 from the secondary
    const games = balanced
      ? POLE_ORDER.map((p) => POLES[p].games[0]).slice(0, 4)
      : [...POLES[primary].games.slice(0, 3), POLES[secondary].games[0]];

    return {
      point: { x: round3(x), y: round3(y), r: round3(r), rDisplay: round3(Math.min(DISPLAY_RIM, r * DISPLAY_SCALE)) },
      axes,
      poles: Object.fromEntries(POLE_ORDER.map((p) => [p, { s: round3(s[p]), wins: wins[p], of: APPEARANCES_PER_POLE }])),
      title,
      epithet: balanced ? BALANCED_TITLE.epithet : POLES[primary].epithet,
      primary,
      secondary,
      hybrid,
      balanced,
      conviction: { value: convictionValue, band: convictionBand, line: CONVICTION[convictionBand] },
      consistency: { value: consistencyValue, band: consistencyBand, line: CONSISTENCY[consistencyBand] },
      insight,
      games,
    };
  }
}

/** Percentile of each pole score vs a population (seed souls + live results). */
function computePercentiles(result, population) {
  const out = {};
  const n = population.length;
  for (const p of POLE_ORDER) {
    if (!n) { out[p] = 50; continue; }
    const mine = result.poles[p].s;
    let below = 0;
    for (const soul of population) {
      // Seed souls store poles[p] as a bare number; live results store {s, wins}.
      const theirs = typeof soul.poles[p] === 'number' ? soul.poles[p] : soul.poles[p].s;
      if (theirs < mine - 1e-9) below++;
    }
    out[p] = Math.max(1, Math.min(99, Math.round((100 * below) / n)));
  }
  return out;
}

const POLE_ANGLE = { CMP: 0, EXP: 60, ARC: 120, SOC: 180, ACH: 240, DAR: 300 };

function angularDist(a, b) {
  let d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

module.exports = { QuizService, computePercentiles, DISPLAY_SCALE, DISPLAY_RIM, POLE_ANGLE };
