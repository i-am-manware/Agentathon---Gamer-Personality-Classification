'use strict';

/**
 * Generates the baseline population — the "souls" already charted on the
 * plane. They serve two purposes:
 *   1. Percentile baselines, so the very first real user still gets a
 *      meaningful "more X than N% of charted souls".
 *   2. The faint starfield of past readers on the results plane.
 *
 * The file is committed, so a fresh clone works with zero setup. Regenerate
 * any time with:  node scripts/seed.js [count]
 */

const fs = require('fs');
const path = require('path');
const { QUESTIONS } = require('../data/questions');
const { POLE_ORDER, AXES } = require('../data/content');
const { DISPLAY_SCALE, DISPLAY_RIM } = require('../lib/quiz');

const RAD = (d) => (d * Math.PI) / 180;
const UNITS = AXES.map((a) => ({ a, ux: Math.cos(RAD(a.angle)), uy: Math.sin(RAD(a.angle)) }));

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
  const u = Math.max(rand(), 1e-12), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makeSoul(rand) {
  const w = {};
  for (const p of POLE_ORDER) w[p] = Math.exp(gauss(rand) * 0.9);
  const dom1 = POLE_ORDER[Math.floor(rand() * 6)];
  w[dom1] *= 2.2;
  if (rand() < 0.5) {
    const dom2 = POLE_ORDER[Math.floor(rand() * 6)];
    if (dom2 !== dom1) w[dom2] *= 1.8;
  }
  const wins = Object.fromEntries(POLE_ORDER.map((p) => [p, 0]));
  for (const q of QUESTIONS) {
    const pick = rand() < w[q.a.p] / (w[q.a.p] + w[q.b.p]) ? q.a.p : q.b.p;
    wins[pick]++;
  }
  const s = Object.fromEntries(POLE_ORDER.map((p) => [p, Math.round((wins[p] / 8) * 1000) / 1000]));
  let x = 0, y = 0;
  for (const { a, ux, uy } of UNITS) {
    const d = s[a.a] - s[a.b];
    x += d * ux;
    y += d * uy;
  }
  const r = Math.hypot(x, y);
  return {
    poles: s,
    point: {
      x: Math.round(x * 1000) / 1000,
      y: Math.round(y * 1000) / 1000,
      rDisplay: Math.round(Math.min(DISPLAY_RIM, r * DISPLAY_SCALE) * 1000) / 1000,
    },
  };
}

function main() {
  const count = Number(process.argv[2]) || 240;
  const rand = rng(0x5eed5);
  const souls = [];
  for (let i = 0; i < count; i++) souls.push(makeSoul(rand));
  const file = path.join(__dirname, '..', 'data', 'population.json');
  fs.writeFileSync(file, JSON.stringify({ generatedAt: new Date().toISOString(), count, souls }));
  console.log(`Seeded ${count} souls → ${path.relative(process.cwd(), file)}`);
}

main();
