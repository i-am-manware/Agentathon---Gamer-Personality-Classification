import { QUESTIONS, ARCHETYPES } from '../shared/quiz.data.js';
import { computeResult } from '../src/lib/scoring.js';

function pick(weights) {
  return QUESTIONS.map((q) => {
    let bestIndex = 0;
    let bestScore = -Infinity;
    q.options.forEach((option, index) => {
      let score = 0;
      for (const [key, weight] of Object.entries(option.w)) score += weight * (weights[key] || 0);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    return bestIndex;
  });
}

function randomAnswers(rand) {
  return QUESTIONS.map((q) => Math.floor(rand() * q.options.length));
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function show(label, answers) {
  const r = computeResult(answers);
  const scores = r.scores.map((s) => `${s.key.slice(0, 4)}:${String(Math.round(s.pct)).padStart(3)}`).join(' ');
  console.log(
    `${label.padEnd(22)} r=${r.coord.r.toFixed(2)} conf=${String(r.confidence).padStart(2)}  ${scores}  ${r.tier.key.padEnd(10)} ${r.dominant}>${r.secondary}`
  );
  return r;
}

const rand = mulberry32(42);

console.log('--- pure personas ---');
const pureR = [];
for (const a of ARCHETYPES) pureR.push(show(`pure ${a.key}`, pick({ [a.key]: 1 })));

console.log('--- adjacent dual personas ---');
const pairs = [
  ['duelist', 'architect'],
  ['curator', 'pathfinder'],
  ['tactician', 'bard'],
  ['duelist', 'curator'],
  ['architect', 'bard'],
  ['pathfinder', 'tactician']
];
for (const [a, b] of pairs) show(`dual ${a}+${b}`, pick({ [a]: 1, [b]: 0.85 }));

console.log('--- random answering ---');
let sum = 0;
let min = 1;
let max = 0;
for (let i = 0; i < 60; i++) {
  const r = computeResult(randomAnswers(rand));
  sum += r.coord.r;
  min = Math.min(min, r.coord.r);
  max = Math.max(max, r.coord.r);
}
console.log(`random: avg r=${(sum / 60).toFixed(2)} min=${min.toFixed(2)} max=${max.toFixed(2)}`);

console.log('--- pure radii ---');
console.log(pureR.map((r) => `${r.dominant}:${r.coord.r.toFixed(2)}`).join('  '));
