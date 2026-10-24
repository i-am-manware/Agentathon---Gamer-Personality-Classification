'use strict';

/**
 * Population simulator — validates the classification model and tunes its
 * presentation constants (DISPLAY_SCALE, conviction bands).
 *
 * Model: each synthetic reader has latent weights for the six poles
 * (log-normal, with extra mass on 1–2 dominant poles to mimic real people).
 * For every duel they pick pole p with probability w_p / (w_a + w_b).
 *
 * Usage: node scripts/simulate.js [n]
 */

const { QUESTIONS } = require('../data/questions');
const { POLE_ORDER, AXES } = require('../data/content');

const RAD = (d) => (d * Math.PI) / 180;
const UNITS = AXES.map((a) => ({ a, ux: Math.cos(RAD(a.angle)), uy: Math.sin(RAD(a.angle)) }));

// Deterministic PRNG so runs are reproducible (mulberry32)
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand) {
  // Box–Muller
  const u = Math.max(rand(), 1e-12), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makeReader(rand) {
  const w = {};
  for (const p of POLE_ORDER) w[p] = Math.exp(gauss(rand) * 0.9);
  // Boost 1-2 dominant poles
  const dom1 = POLE_ORDER[Math.floor(rand() * 6)];
  w[dom1] *= 2.2;
  if (rand() < 0.5) {
    let dom2 = POLE_ORDER[Math.floor(rand() * 6)];
    if (dom2 !== dom1) w[dom2] *= 1.8;
  }
  return w;
}

function answer(w, rand) {
  const wins = Object.fromEntries(POLE_ORDER.map((p) => [p, 0]));
  for (const q of QUESTIONS) {
    const pa = q.a.p, pb = q.b.p;
    const pick = rand() < w[pa] / (w[pa] + w[pb]) ? pa : pb;
    wins[pick]++;
  }
  return wins;
}

function place(wins) {
  const s = Object.fromEntries(POLE_ORDER.map((p) => [p, wins[p] / 8]));
  let x = 0, y = 0;
  const d = {};
  for (const { a, ux, uy } of UNITS) {
    const lean = s[a.a] - s[a.b];
    d[a.id] = lean;
    x += lean * ux;
    y += lean * uy;
  }
  return { s, d, x, y, r: Math.hypot(x, y) };
}

function pct(sorted, q) {
  return sorted[Math.min(sorted.length - 1, Math.floor((q / 100) * sorted.length))];
}

function main() {
  const n = Number(process.argv[2]) || 100000;
  const rand = rng(0xC0FFEE);
  const rs = [];
  const axisAbs = { glory: [], pursuit: [], method: [] };
  const poleS = Object.fromEntries(POLE_ORDER.map((p) => [p, []]));
  let maxR = 0;

  for (let i = 0; i < n; i++) {
    const w = makeReader(rand);
    const { s, d, r } = place(answer(w, rand));
    rs.push(r);
    maxR = Math.max(maxR, r);
    for (const k of Object.keys(d)) axisAbs[k].push(Math.abs(d[k]));
    for (const p of POLE_ORDER) poleS[p].push(s[p]);
  }
  rs.sort((a, b) => a - b);

  console.log(`\nHEXAXIS population simulation — n=${n.toLocaleString()}`);
  console.log('─'.repeat(56));
  console.log(`|P| radius   p10=${f(pct(rs, 10))}  p25=${f(pct(rs, 25))}  p50=${f(pct(rs, 50))}  p75=${f(pct(rs, 75))}  p90=${f(pct(rs, 90))}  p99=${f(pct(rs, 99))}  max=${f(maxR)}`);
  for (const k of Object.keys(axisAbs)) {
    const v = axisAbs[k].sort((a, b) => a - b);
    console.log(`|d ${k}|`.padEnd(12) + ` p50=${f(pct(v, 50))}  p90=${f(pct(v, 90))}  max=${f(v[v.length - 1])}`);
  }
  const means = POLE_ORDER.map((p) => {
    const v = poleS[p];
    return `${p}:${f(v.reduce((a, b) => a + b, 0) / v.length)}`;
  });
  console.log('mean pole strength  ' + means.join('  '));

  // Evaluate candidate display scales
  console.log('─'.repeat(56));
  for (const scale of [1.1, 1.2, 1.35, 1.5, 1.65]) {
    const disp = rs.map((r) => Math.min(0.98, r * scale)).sort((a, b) => a - b);
    const capped = (100 * rs.filter((r) => r * scale > 0.98).length) / rs.length;
    console.log(`scale=${scale}  →  median rDisplay=${f(pct(disp, 50))}  p90=${f(pct(disp, 90))}  capped=${capped.toFixed(1)}%`);
  }
  // Conviction band occupancy at current thresholds (0.3 / 0.7)
  const low = rs.filter((r) => r < 0.3).length, mid = rs.filter((r) => r >= 0.3 && r < 0.7).length;
  console.log(`bands  low=${((100 * low) / n).toFixed(1)}%  mid=${((100 * mid) / n).toFixed(1)}%  high=${((100 * (n - low - mid)) / n).toFixed(1)}%`);
  console.log('');
}

const f = (v) => v.toFixed(3);
main();
