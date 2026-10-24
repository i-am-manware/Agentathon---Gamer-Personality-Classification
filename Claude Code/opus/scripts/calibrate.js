// Monte-Carlo calibration of the scoring engine.
// Prints how random answerers and simulated "committed" personas spread over
// the plane — used to tune CONVICTION_GAIN and the hybrid threshold.
// Usage: node scripts/calibrate.js
import { QUESTIONS, ARCH_ORDER, analyze, optionCount, optionWeights, mulberry32 } from '../shared/engine.js';
import { simulateAnswers } from '../server/simulate.js';

const rnd = mulberry32(42);
const hist = (vals, bins = 10) => {
  const h = new Array(bins).fill(0);
  for (const v of vals) h[Math.min(bins - 1, Math.floor(v * bins))]++;
  return h.map((c, i) => `${(i / bins).toFixed(1)} ${'#'.repeat(Math.round((c / vals.length) * 120))}`).join('\n');
};

function report(label, gen, n = 2000) {
  const conv = [], titles = {}, conf = [];
  for (let i = 0; i < n; i++) {
    const r = analyze(gen(), { bootstrap: 60 });
    conv.push(r.conviction); conf.push(r.confidence);
    titles[r.titleKey] = (titles[r.titleKey] || 0) + 1;
  }
  console.log(`\n== ${label} ==\nconviction:\n${hist(conv)}`);
  console.log('mean confidence', (conf.reduce((a, b) => a + b, 0) / n).toFixed(2));
  console.log('titles', Object.entries(titles).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${(100 * v / n).toFixed(1)}%`).join(' '));
}

report('uniform random answers', () => QUESTIONS.map((q) => Math.floor(rnd() * optionCount(q))));
report('population personas', () => simulateAnswers(rnd));
for (const k of ARCH_ORDER) {
  // Greedy "pure" player: always the option that maximises k.
  const ans = QUESTIONS.map((q) => {
    let best = 0, bv = -Infinity;
    for (let i = 0; i < optionCount(q); i++) { const v = optionWeights(q, i)[k] || 0; if (v > bv) { bv = v; best = i; } }
    return best;
  });
  const r = analyze(ans);
  console.log(`pure ${k}: ${r.titleKey} conv=${r.conviction.toFixed(2)} conf=${r.confidence.toFixed(2)} scores=${ARCH_ORDER.map((a) => a + (r.scores[a] * 100).toFixed(0)).join(' ')}`);
}
