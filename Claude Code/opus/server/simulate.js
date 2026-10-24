// Synthetic respondents used for seeding the population atlas and for
// calibration. Each simulated player has a latent taste vector over the six
// archetypes and answers every question through the real question bank with a
// softmax choice model, so seeded data goes through the exact same engine as
// real players (no hand-placed dots).
import { QUESTIONS, ARCH_ORDER, optionCount, optionWeights } from '../shared/engine.js';

function gaussian(rnd) {
  const u = Math.max(rnd(), 1e-9), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Latent taste: one or two favourite poles, plus background noise. */
export function randomTaste(rnd, favourites) {
  const taste = {};
  for (const k of ARCH_ORDER) taste[k] = gaussian(rnd) * 0.45;
  const favs = favourites || [ARCH_ORDER[Math.floor(rnd() * 6)]];
  if (!favourites && rnd() < 0.55) favs.push(ARCH_ORDER[Math.floor(rnd() * 6)]);
  favs.forEach((k, i) => { taste[k] += (i === 0 ? 1.1 : 0.7) * (0.6 + rnd() * 0.8); });
  return taste;
}

export function answerWithTaste(rnd, taste, beta = 1.6) {
  return QUESTIONS.map((q) => {
    const n = optionCount(q);
    const utils = [];
    for (let i = 0; i < n; i++) {
      const w = optionWeights(q, i);
      let u = 0;
      for (const k of ARCH_ORDER) u += (w[k] || 0) * taste[k];
      utils.push(Math.exp(beta * u));
    }
    const total = utils.reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    for (let i = 0; i < n; i++) { r -= utils[i]; if (r <= 0) return i; }
    return n - 1;
  });
}

export const simulateAnswers = (rnd) => answerWithTaste(rnd, randomTaste(rnd), 0.5 + rnd() * 1.2);
