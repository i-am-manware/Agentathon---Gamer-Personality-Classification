// PLAYERPRINT scoring engine.
// Pure, dependency-free ES module shared by the browser (live preview, instant
// results) and the server (authoritative scoring, OG tags, seeding, stats).

export const VERSION = 1;

/* ------------------------------------------------------------------ */
/* Archetypes: six poles on a hexagon, three opposing pairs.          */
/* Angles are degrees, counter-clockwise from +x (math convention).   */
/* Around the hexagon the poles alternate between the two "drives":   */
/* Trophy (A, C, D) and Journey (B, G, W).                            */
/* ------------------------------------------------------------------ */
export const ARCH = {
  A: { id: 'A', name: 'Architect', angle: 90,   color: '#3255A4', drive: 'trophy'  },
  B: { id: 'B', name: 'Bard',      angle: 30,   color: '#F5A300', drive: 'journey' },
  C: { id: 'C', name: 'Curator',   angle: -30,  color: '#765BA7', drive: 'trophy'  },
  G: { id: 'G', name: 'Gremlin',   angle: -90,  color: '#FF6C2F', drive: 'journey' },
  D: { id: 'D', name: 'Duelist',   angle: -150, color: '#FF3E8F', drive: 'trophy'  },
  W: { id: 'W', name: 'Wayfarer',  angle: 150,  color: '#00A95C', drive: 'journey' },
};
export const ARCH_ORDER = ['A', 'B', 'C', 'G', 'D', 'W']; // clockwise from top

export const AXES = [
  { id: 'order',   a: 'A', b: 'G', name: 'Order / Chaos',     poles: ['Plan', 'Play'] },
  { id: 'rivalry', a: 'D', b: 'B', name: 'Rivalry / Kinship', poles: ['Win', 'Bond'] },
  { id: 'horizon', a: 'W', b: 'C', name: 'Horizon / Hoard',   poles: ['Roam', 'Keep'] },
];

export const OPPOSITE = { A: 'G', G: 'A', D: 'B', B: 'D', W: 'C', C: 'W' };

/* Titles: 6 pure archetypes, 12 hybrids (any two non-opposite poles), 1 centre. */
export const TITLES = {
  A: 'The Architect', B: 'The Bard', C: 'The Curator',
  G: 'The Gremlin', D: 'The Duelist', W: 'The Wayfarer',
  AB: 'The Raid Leader', AC: 'The Spreadsheet Sage', AD: 'The Tactician', AW: 'The Cartographer',
  BC: 'The Hearthkeeper', BG: 'The Party Starter', BW: 'The Caravan Captain',
  CG: 'The Magpie', CD: 'The Trophy Hunter',
  DG: 'The Cheese Wizard', GW: 'The Sequence Breaker', DW: 'The Daredevil',
  O: 'The Omnivore',
};
// Canonical hybrid key is alphabetical so lookups are stable.
export const titleKey = (p, q) => (q ? [p, q].sort().join('') : p);

/* ------------------------------------------------------------------ */
/* Questions. Three formats:                                           */
/*   scenario: 4 options   versus: 2 options   spectrum: 5 stops        */
/* Each option carries sparse weights over archetypes (may be < 0).    */
/* ------------------------------------------------------------------ */
export const QUESTIONS = [
  { id: 'boot', type: 'scenario', kicker: 'Fresh save',
    prompt: 'You boot up a brand-new open-world game. The first ten minutes, you…',
    options: [
      { label: 'Pick the direction the tutorial is NOT pointing at and just go.', w: { W: 2, G: 1 } },
      { label: 'Open every menu. Skill tree, crafting tab, stat sheet. I need to understand this thing.', w: { A: 2, C: 1 } },
      { label: 'Find out when ranked / PvP unlocks.', w: { D: 2 } },
      { label: "Text the group chat: 'we're playing this tonight.'", w: { B: 2 } },
    ] },
  { id: 'legend', type: 'versus', kicker: 'Would you rather',
    prompt: 'Which would you rather be known for?',
    options: [
      { label: '#1 on a leaderboard', w: { D: 2, C: 1 } },
      { label: 'Finding a secret nobody else ever found', w: { W: 2, A: -1 } },
    ] },
  { id: 'cheevos', type: 'spectrum', kicker: 'Be honest',
    prompt: 'Achievements are…',
    left:  { label: "Background noise. I didn't even notice the popup.", w: { W: 1, G: 1, C: -1 } },
    right: { label: "A contract. 100% or it doesn't count.", w: { C: 2 } } },
  { id: 'wipe', type: 'scenario', kicker: 'Attempt #9',
    prompt: 'Your party wipes on the same boss for the ninth time. You…',
    options: [
      { label: 'Propose everyone fights it with only fists. For science.', w: { G: 2, B: 1 } },
      { label: 'Go quiet. Lock in. We are NOT losing to this thing.', w: { D: 2 } },
      { label: 'Pull up a spreadsheet of its attack patterns.', w: { A: 2 } },
      { label: 'Order pizza. Morale is a resource too.', w: { B: 2 } },
    ] },
  { id: 'sandbox', type: 'scenario', kicker: 'No objectives',
    prompt: 'A game hands you a physics sandbox and zero goals. You…',
    options: [
      { label: 'Launch the nearest cow into orbit.', w: { G: 2 } },
      { label: 'Build a working calculator out of it.', w: { A: 2, C: 1 } },
      { label: 'Invent a minigame and make your friends compete in it.', w: { B: 1, D: 1, G: 1 } },
      { label: 'Close it. Where is my quest log?', w: { C: 2, W: -1 } },
    ] },
  { id: 'inventory', type: 'scenario', kicker: 'Open your bag',
    prompt: 'Your inventory right now is…',
    options: [
      { label: 'Sorted by type, then rarity, then vibes.', w: { C: 2, A: 1 } },
      { label: 'A crime scene. 99 cheese wheels, one sword.', w: { G: 2, C: 1 } },
      { label: "Mostly gifts I'm holding for other players.", w: { B: 2 } },
      { label: 'Light. I travel fast and only pick up weird stuff.', w: { W: 2, C: -1 } },
    ] },
  { id: 'story', type: 'versus', kicker: 'Pick one',
    prompt: 'You came here for…',
    options: [
      { label: 'The story. I am here to feel things.', w: { W: 2, B: 1 } },
      { label: 'The scoreboard. Feelings are for the losers bracket.', w: { D: 2 } },
    ] },
  { id: 'loss', type: 'spectrum', kicker: 'Post-match',
    prompt: 'You just lost a ranked match. Your reaction:',
    left:  { label: 'Did not care. That was hilarious.', w: { G: 2, D: -1 } },
    right: { label: "I'm reviewing the replay. Tonight.", w: { D: 2, A: 1 } } },
  { id: 'dlc', type: 'scenario', kicker: 'Patch notes',
    prompt: 'Surprise DLC drops a whole new region. You are most excited to…',
    options: [
      { label: 'Explore every corner before the wiki does.', w: { W: 2, C: 1 } },
      { label: 'Find out if it breaks the meta.', w: { A: 2, D: 1 } },
      { label: 'Collect the new set of cosmetic hats.', w: { C: 2 } },
      { label: 'Host a group expedition with the guild.', w: { B: 2, W: 1 } },
    ] },
  { id: 'power', type: 'versus', kicker: 'In-game superpower',
    prompt: 'Pick a superpower (in-game only):',
    options: [
      { label: 'Pause time to plan every single move', w: { A: 2 } },
      { label: 'Reroll anything, anytime — results totally random', w: { G: 2 } },
    ] },
  { id: 'couch', type: 'scenario', kicker: 'Couch co-op',
    prompt: 'Friends are over and someone hands you a controller. You pick…',
    options: [
      { label: 'The most competitive fighter we own. No mercy on the couch.', w: { D: 2 } },
      { label: "Something co-op where we yell at each other lovingly.", w: { B: 2 } },
      { label: 'A party game where the rules are pure chaos.', w: { G: 2, B: 1 } },
      { label: "Honestly? I'd rather coach from the side.", w: { A: 2, B: 1 } },
    ] },
  { id: 'wiki', type: 'spectrum', kicker: 'Research habits',
    prompt: 'Guides and wikis:',
    left:  { label: "Spoilers! I'd rather be lost forever.", w: { W: 2, A: -1 } },
    right: { label: 'I have eleven tabs open right now.', w: { A: 1, C: 2 } } },
  { id: 'glitch', type: 'scenario', kicker: 'Out of bounds',
    prompt: 'You find a glitch that skips half the game. You…',
    options: [
      { label: 'Use it immediately. Then look for three more.', w: { G: 2 } },
      { label: 'Ignore it. I want to see everything they built.', w: { W: 2, C: 1 } },
      { label: 'Study it. Could this be routed into a speedrun?', w: { A: 2, D: 1 } },
      { label: 'Clip it and send it to literally everyone.', w: { B: 2, G: 1 } },
    ] },
  { id: 'mmo', type: 'versus', kicker: 'MMO life',
    prompt: 'In an MMO, you would rather be…',
    options: [
      { label: 'The guild leader who runs the Discord', w: { B: 2, A: 1 } },
      { label: 'A lone wanderer who is mostly a rumor', w: { W: 2, B: -1 } },
    ] },
  { id: 'stat', type: 'scenario', kicker: 'End-of-year recap',
    prompt: 'Which stat on your yearly recap makes you proudest?',
    options: [
      { label: 'Win rate: 71%', w: { D: 2 } },
      { label: 'Completion: 100%', w: { C: 2 } },
      { label: 'Distance travelled: 4,812 km', w: { W: 2 } },
      { label: 'Friends played with: 38', w: { B: 2 } },
    ] },
  { id: 'builds', type: 'spectrum', kicker: 'Loadout screen',
    prompt: 'How do you pick a build?',
    left:  { label: 'Whatever looks the funniest.', w: { G: 2 } },
    right: { label: 'Math-verified optimal.', w: { A: 2, D: 1 } } },
  { id: 'craft', type: 'scenario', kicker: 'Crafting bench',
    prompt: 'The game has a crafting system. You…',
    options: [
      { label: 'Craft every recipe at least once.', w: { C: 2 } },
      { label: 'Craft the weirdest possible thing to see what happens.', w: { G: 2, W: 1 } },
      { label: 'Automate it. Build a factory that crafts for me.', w: { A: 2 } },
      { label: "Craft gear for my friends' characters.", w: { B: 2 } },
    ] },
  { id: 'hurts', type: 'versus', kicker: 'Pain scale',
    prompt: 'Which hurts more?',
    options: [
      { label: 'Losing a 1v1 by a single hit', w: { D: 2 } },
      { label: 'Stuck at 99% with one collectible missing', w: { C: 2 } },
    ] },
  { id: 'credits', type: 'scenario', kicker: 'Roll credits',
    prompt: 'Final boss down. Credits roll. Your next move:',
    options: [
      { label: 'New Game+ on the hardest difficulty.', w: { D: 2, A: 1 } },
      { label: 'Hunt down every remaining collectible.', w: { C: 2 } },
      { label: 'Start a completely different game. Immediately.', w: { W: 2, C: -1 } },
      { label: 'Go argue about the lore with the community.', w: { B: 2, W: 1 } },
    ] },
  { id: 'plans', type: 'spectrum', kicker: 'Contact with the enemy',
    prompt: 'Going into a big fight, you had…',
    left:  { label: 'Plans? I had vibes.', w: { G: 2 } },
    right: { label: 'Three contingencies and a backup.', w: { A: 2 } } },
  { id: 'npc', type: 'scenario', kicker: 'Fantasy career day',
    prompt: 'You wake up as an NPC in a fantasy town. Your job is…',
    options: [
      { label: 'Tavern keeper. I know everybody’s business.', w: { B: 2 } },
      { label: 'Arena champion.', w: { D: 2 } },
      { label: 'Keeper of the museum of rare artifacts.', w: { C: 2 } },
      { label: 'Alchemist who blows up the lab weekly.', w: { G: 2, W: 1 } },
    ] },
  { id: 'map', type: 'versus', kicker: 'Would you rather',
    prompt: 'Would you rather play a game with…',
    options: [
      { label: 'No map at all', w: { W: 2, G: 1 } },
      { label: 'A perfect map with every item marked', w: { C: 2, A: 1 } },
    ] },
  { id: 'voice', type: 'spectrum', kicker: 'Open mic',
    prompt: 'Talking to strangers in voice chat is…',
    left:  { label: 'Absolutely not. Mute all.', w: { B: -1, W: 1 } },
    right: { label: 'Honestly the best part of the game.', w: { B: 2 } } },
  { id: 'devday', type: 'scenario', kicker: 'Dev for a day',
    prompt: "You're a game developer for one day. You add…",
    options: [
      { label: 'A ranked ladder with seasonal rewards.', w: { D: 2, C: 1 } },
      { label: 'A secret area only reachable by climbing the skybox.', w: { W: 2, G: 1 } },
      { label: 'A set of 150 cosmetics to collect.', w: { C: 2 } },
      { label: 'A physics bug. On purpose.', w: { G: 2 } },
    ] },
  { id: 'victory', type: 'versus', kicker: 'Sweetest win',
    prompt: 'Victory tastes best when…',
    options: [
      { label: 'I out-thought everyone', w: { A: 2, D: 1 } },
      { label: 'Nobody, including me, knows how it happened', w: { G: 2 } },
    ] },
  { id: 'savefile', type: 'scenario', kicker: 'Last one',
    prompt: 'Pick your save file name:',
    options: [
      { label: 'undefeated', w: { D: 2 } },
      { label: '100%_DO_NOT_TOUCH', w: { C: 2 } },
      { label: 'co-op w/ the gang ♡', w: { B: 2 } },
      { label: 'OPTIMAL_ROUTE_v7', w: { A: 2 } },
    ] },
];

export const SPECTRUM_STOPS = ['Totally', 'Kinda', 'Torn', 'Kinda', 'Totally'];

export const optionCount = (q) => (q.type === 'spectrum' ? 5 : q.options.length);

const scaleW = (w, f) => Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v * f]));

/** Weights contributed by picking option `i` of question `q`. */
export function optionWeights(q, i) {
  if (q.type !== 'spectrum') return q.options[i]?.w || {};
  // 5 stops: full left, half left, neutral, half right, full right
  return [q.left.w, scaleW(q.left.w, 0.5), {}, scaleW(q.right.w, 0.5), q.right.w][i] || {};
}

/** Pre-computed per-question min/max contribution per archetype (for normalization). */
const RANGES = QUESTIONS.map((q) => {
  const n = optionCount(q);
  const r = {};
  for (const k of ARCH_ORDER) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const v = optionWeights(q, i)[k] || 0;
      lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    r[k] = [lo, hi];
  }
  return r;
});

/** Archetype whose weight dominates a chosen option (used for the print strip). */
export function dominantOf(q, i) {
  const w = optionWeights(q, i);
  let best = null, bv = 0;
  for (const k of ARCH_ORDER) if ((w[k] || 0) > bv) { bv = w[k]; best = k; }
  return best;
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

/**
 * Range-normalized archetype scores in [0,1].
 * Each archetype is scored against the min/max that was *achievable* on the
 * questions actually answered, so uneven question coverage cannot bias a pole.
 * `picks` is an array of question indices (may repeat — used by the bootstrap).
 */
function scoreOn(answers, picks) {
  const raw = {}, lo = {}, hi = {};
  for (const k of ARCH_ORDER) { raw[k] = 0; lo[k] = 0; hi[k] = 0; }
  for (const qi of picks) {
    const w = optionWeights(QUESTIONS[qi], answers[qi]);
    const rg = RANGES[qi];
    for (const k of ARCH_ORDER) {
      raw[k] += w[k] || 0; lo[k] += rg[k][0]; hi[k] += rg[k][1];
    }
  }
  const s = {};
  for (const k of ARCH_ORDER) s[k] = hi[k] > lo[k] ? (raw[k] - lo[k]) / (hi[k] - lo[k]) : 0.5;
  return s;
}

const RAD = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Radius of the unit hexagon (vertices at the archetype angles) at angle θ (deg). */
export function hexRadius(thetaDeg) {
  // Edge mid-points sit at 0°, ±60°, ±120°, 180°.
  const off = ((((thetaDeg % 60) + 60) % 60) + 30) % 60 - 30; // distance to nearest edge-midpoint dir
  return Math.cos(30 * RAD) / Math.cos(off * RAD);
}

// Conviction curve: maps the weighted pole-strength (≈0..0.8 in practice)
// onto the plane radius. Tuned via scripts/calibrate.js so that very
// committed players reach the rim while balanced ones sit near the core.
const CONVICTION_GAIN = 1.45;

/**
 * Pole-dominance projection.
 * 1. Collapse each opposing pair to a signed net lean n = s_a − s_b.
 * 2. The strongest lean picks the wedge (so the dot always sits in the
 *    region named by its title — no linear-projection aliasing where
 *    "Architect + Curator" would masquerade as "Bard").
 * 3. The other two leans tilt the dot inside the wedge toward their side.
 * 4. Distance from centre = conviction (weighted strength of the leans).
 */
export function place(s) {
  const poles = AXES.map((ax) => {
    const n = s[ax.a] - s[ax.b];
    const id = n >= 0 ? ax.a : ax.b;
    return { axis: ax.id, id, m: Math.abs(n), angle: ARCH[id].angle };
  }).sort((p, q) => q.m - p.m);
  const [p1, p2, p3] = poles;
  const strength = 0.6 * p1.m + 0.25 * p2.m + 0.15 * p3.m;
  const conviction = clamp(1 - Math.pow(1 - clamp(strength * CONVICTION_GAIN, 0, 1), 1.2), 0, 1);
  if (p1.m < 1e-9) return { x: 0, y: 0, theta: 90, conviction: 0, poles };
  const pull = (p2.m * Math.sin((p2.angle - p1.angle) * RAD) + p3.m * Math.sin((p3.angle - p1.angle) * RAD)) / p1.m;
  const theta = p1.angle + clamp(pull, -1, 1) * 28;
  const r = conviction * hexRadius(theta);
  return { x: r * Math.cos(theta * RAD), y: r * Math.sin(theta * RAD), theta, conviction, poles };
}

/** Title from pole ranking: centre → Omnivore; dominant → pure; close runner-up → hybrid. */
export function classify(pl) {
  const [p1, p2] = pl.poles;
  if (pl.conviction < 0.16) return { key: 'O', primary: p1.id, secondary: p2.id, hybrid: false };
  const hybrid = p2.m >= 0.55 * p1.m && p2.m > 0.08;
  return { key: hybrid ? titleKey(p1.id, p2.id) : p1.id, primary: p1.id, secondary: p2.id, hybrid };
}

/* Deterministic PRNG so client and server produce identical bootstrap clouds. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/**
 * Full analysis of an answer vector (entries may be null for unanswered).
 * opts.bootstrap: number of resamples for the uncertainty cloud (0 = skip).
 * opts.damp: shrink the dot while few answers are in (live preview).
 */
export function analyze(answers, opts = {}) {
  const { bootstrap = 160, damp = false } = opts;
  const answered = [];
  answers.forEach((a, i) => { if (a !== null && a !== undefined && i < QUESTIONS.length) answered.push(i); });
  const scores = scoreOn(answers, answered);
  const pl = place(scores);
  if (damp && answered.length < QUESTIONS.length) {
    const f = Math.sqrt(answered.length / QUESTIONS.length);
    pl.x *= f; pl.y *= f; pl.conviction *= f;
  }
  const cls = classify(pl);

  const axes = AXES.map((ax) => ({
    ...ax, sa: scores[ax.a], sb: scores[ax.b], net: scores[ax.a] - scores[ax.b],
  }));
  // Hidden third dimension lost by any 3-axis → 2-D map: which triangle of poles
  // (Trophy: A, C, D vs Journey: B, G, W) you favour overall.
  const trophy = (scores.A + scores.C + scores.D) / 3;
  const journey = (scores.B + scores.G + scores.W) / 3;
  const drive = journey - trophy; // + = Journey
  // Paradox: both ends of a pair run hot. Void: neither end moves you at all.
  const tensions = axes.filter((ax) => Math.min(ax.sa, ax.sb) >= 0.5).map((ax) => ax.id);
  const voids = axes.filter((ax) => Math.max(ax.sa, ax.sb) <= 0.25).map((ax) => ax.id);

  let cloud = [], confidence = null, runnerUp = null;
  if (bootstrap > 0 && answered.length > 2) {
    const rnd = mulberry32(hashStr(answers.join(',')));
    const tally = {};
    for (let b = 0; b < bootstrap; b++) {
      const picks = answered.map(() => answered[Math.floor(rnd() * answered.length)]);
      const bp = place(scoreOn(answers, picks));
      const bc = classify(bp);
      cloud.push([+bp.x.toFixed(4), +bp.y.toFixed(4)]);
      tally[bc.primary] = (tally[bc.primary] || 0) + 1;
    }
    confidence = (tally[cls.primary] || 0) / bootstrap;
    runnerUp = Object.entries(tally).filter(([k]) => k !== cls.primary).sort((a, b) => b[1] - a[1])[0] || null;
    if (runnerUp) runnerUp = { id: runnerUp[0], share: runnerUp[1] / bootstrap };
  }

  const strip = answers.map((a, i) => (a === null || a === undefined ? null : dominantOf(QUESTIONS[i], a)));
  const integrity = integrityCheck(answers);

  return {
    version: VERSION,
    answered: answered.length,
    complete: answered.length === QUESTIONS.length,
    scores, axes,
    point: { x: pl.x, y: pl.y }, theta: pl.theta, conviction: pl.conviction, poles: pl.poles,
    titleKey: cls.key, title: TITLES[cls.key], primary: cls.primary, secondary: cls.secondary, hybrid: cls.hybrid,
    drive, tensions, voids, cloud, confidence, runnerUp, strip, integrity,
  };
}

/**
 * Response-quality heuristics. Picking the same slot on ≥80% of the choice
 * questions essentially never happens by chance (<0.01% of uniform-random
 * runs) and no archetype's honest answers cluster that way, so we flag it;
 * same for parking nearly every slider on "Torn".
 */
export function integrityCheck(answers) {
  const picks = [], sliders = [];
  answers.forEach((a, i) => {
    if (a === null || a === undefined) return;
    (QUESTIONS[i].type === 'spectrum' ? sliders : picks).push(a);
  });
  const counts = {};
  for (const a of picks) counts[a] = (counts[a] || 0) + 1;
  const [slot, n] = Object.entries(counts).sort((x, y) => y[1] - x[1])[0] || [null, 0];
  const torn = sliders.filter((a) => a === 2).length;
  return {
    masher: picks.length >= 10 && n / picks.length >= 0.8 ? { slot: Number(slot), count: n, of: picks.length } : null,
    fenceSitter: sliders.length >= 4 && torn / sliders.length >= 0.8 ? { count: torn, of: sliders.length } : null,
  };
}

/** Region (wedge) an arbitrary plane point falls into. */
export function wedgeAt(x, y) {
  if (Math.hypot(x, y) < 1e-9) return null;
  const th = Math.atan2(y, x) / RAD;
  let best = null, bd = 999;
  for (const k of ARCH_ORDER) {
    const d = Math.abs((((th - ARCH[k].angle) % 360) + 540) % 360 - 180);
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/* Share codes: answers packed base-5 into a base-36 BigInt.           */
/* 26 answers → ~12 chars. Stateless: the link IS the result.          */
/* ------------------------------------------------------------------ */
export function encodeAnswers(answers) {
  if (answers.length !== QUESTIONS.length) throw new Error('incomplete');
  let n = 0n;
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    if (!Number.isInteger(a) || a < 0 || a >= optionCount(QUESTIONS[i])) throw new Error('bad answer');
    n = n * 5n + BigInt(a);
  }
  return `${VERSION}${n.toString(36)}`;
}

export const CODE_RE = /^[1-9][0-9a-z]{1,20}$/;

export function decodeCode(code) {
  if (typeof code !== 'string' || !CODE_RE.test(code)) return null;
  if (Number(code[0]) !== VERSION) return null;
  let n = 0n;
  for (const ch of code.slice(1)) n = n * 36n + BigInt(parseInt(ch, 36));
  const out = new Array(QUESTIONS.length);
  for (let i = QUESTIONS.length - 1; i >= 0; i--) { out[i] = Number(n % 5n); n /= 5n; }
  if (n !== 0n) return null;
  for (let i = 0; i < out.length; i++) if (out[i] >= optionCount(QUESTIONS[i])) return null;
  return out;
}
