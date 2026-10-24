// Seed data: a population of simulated players (so the atlas has a crowd on
// first boot) and a demo account with a few retakes (so judges can see the
// signed-in features without creating an account).
import crypto from 'node:crypto';
import { analyze, encodeAnswers, mulberry32 } from '../shared/engine.js';
import { simulateAnswers, answerWithTaste } from './simulate.js';
import { hashPassword } from './auth.js';

export const DEMO = { username: 'demo', password: 'playerprint' };

const rowFor = (answers, extra) => {
  const r = analyze(answers, { bootstrap: 0 });
  return {
    publicId: crypto.randomBytes(6).toString('base64url'),
    code: encodeAnswers(answers), version: r.version, titleKey: r.titleKey, primary: r.primary,
    x: +r.point.x.toFixed(5), y: +r.point.y.toFixed(5),
    scores: Object.fromEntries(Object.entries(r.scores).map(([k, v]) => [k, +v.toFixed(4)])),
    ...extra,
  };
};

export async function seed(store, { players = 640, log = console.log } = {}) {
  const rnd = mulberry32(20260930);
  const now = Date.now();
  const DAY = 86400_000;

  let added = 0;
  store.transaction(() => {
    for (let i = 0; i < players; i++) {
      store.insertResult(rowFor(simulateAnswers(rnd), { userId: null, isSeed: true, createdAt: now - Math.floor(rnd() * 120) * DAY }));
      added++;
    }
  });

  let demo = store.findUserByName(DEMO.username);
  if (!demo) {
    demo = store.createUser(DEMO.username, await hashPassword(DEMO.password));
    // A player drifting from cozy completionist to chaotic party animal over a year.
    const arc = [
      { t: { A: 0.2, B: 0.9, C: 1.4, G: -0.4, D: -0.5, W: 0.1 }, ago: 330, label: 'Animal Crossing era' },
      { t: { A: 0.1, B: 1.3, C: 0.9, G: 0.2, D: -0.4, W: 0.3 }, ago: 210, label: 'Joined a guild' },
      { t: { A: -0.2, B: 1.3, C: 0.2, G: 0.9, D: 0.1, W: 0.4 }, ago: 95, label: 'Lethal Company summer' },
      { t: { A: -0.5, B: 1.1, C: -0.3, G: 1.4, D: 0.3, W: 0.5 }, ago: 12, label: null },
    ];
    const drnd = mulberry32(7);
    store.transaction(() => {
      for (const step of arc) {
        store.insertResult(rowFor(answerWithTaste(drnd, step.t, 2.6), {
          userId: demo.id, isSeed: true, createdAt: now - step.ago * DAY, label: step.label,
        }));
      }
    });
    log(`[seed] demo account → username "${DEMO.username}", password "${DEMO.password}"`);
  }
  log(`[seed] added ${added} simulated players`);
}

export async function seedIfEmpty(store, opts) {
  if (store.stats(1).total > 0) return false;
  await seed(store, opts);
  return true;
}
