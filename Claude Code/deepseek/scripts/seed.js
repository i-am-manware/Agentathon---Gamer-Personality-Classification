/**
 * SPAWNPOINT — population seeding.
 *
 * The Playstyle Plane is much more interesting with a crowd on it, and a brand
 * new deployment has nobody. So on first boot we generate a synthetic
 * population: `SEED_SIZE` playthroughs produced by *actually answering the
 * questions* through the real scoring pipeline.
 *
 * They are not random dots painted on the plane — they are simulated players
 * with genuine archetype preferences, run through `score()`. That means the
 * seeded cloud has the same shape a real population would, and it moves
 * correctly if the question bank or the algorithm changes.
 *
 * Everything is deterministic: same seed, same population, on every machine.
 * Seeded rows are tagged `source = 'seed'` and are never attributed to a user.
 *
 *   node scripts/seed.js            # add the population if it is missing
 *   node scripts/seed.js --force    # add another batch
 *   node scripts/seed.js --reset    # wipe all attempts, then reseed
 */

import { pathToFileURL } from 'node:url';
import db from '../src/db.js';
import config from '../src/config.js';
import { QUESTIONS } from '../shared/questions.js';
import { ARCHETYPE_KEYS } from '../shared/archetypes.js';
import { score, encodeAnswers, SCORE_VERSION } from '../shared/scoring.js';

const SEED_TAG = 'population-seed-v1';

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
 * Draw a preference vector. Real gamers are not uniformly spread: most have a
 * clear lean with two or three secondaries, and a minority are genuinely
 * balanced. We mix two regimes to get that shape.
 */
function drawPreference(rand) {
  const focused = rand() < 0.78;
  const shape = focused ? 0.85 : 0.18;
  const raw = ARCHETYPE_KEYS.map(() => Math.pow(rand(), 1 + shape * 4) + 0.04);
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((x) => x / sum);
}

/** A simulated playthrough: pick the option with the highest expected fit. */
function playthrough(rand, preference) {
  return QUESTIONS.map((q) => {
    const utilities = q.options.map((o) => {
      const entries = Object.entries(o.w);
      const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
      let u = 0;
      entries.forEach(([k, v]) => {
        u += (v / total) * preference[ARCHETYPE_KEYS.indexOf(k)];
      });
      return u * (o.intensity ?? 1) + rand() * 0.07;
    });
    let best = 0;
    utilities.forEach((u, i) => {
      if (u > utilities[best]) best = i;
    });
    return best;
  });
}

function makeRow(rand, index) {
  const preference = drawPreference(rand);
  const answers = playthrough(rand, preference);
  const s = score(answers, QUESTIONS);
  // Spread the timestamps across the last ~120 days so history reads naturally.
  const createdAt = new Date(Date.now() - Math.floor(rand() * 120 * 86400_000)).toISOString();
  return {
    id: `seed_${index.toString(36).padStart(5, '0')}_${Math.floor(rand() * 1e6).toString(36)}`,
    user_id: null,
    answers: encodeAnswers(answers),
    x: s.x,
    y: s.y,
    radius: s.radius,
    heading: s.heading,
    primary_key: s.primary,
    affinities: JSON.stringify(s.affinities),
    score_version: SCORE_VERSION,
    signature: s.signature,
    duration_ms: 90_000 + Math.floor(rand() * 300_000),
    source: 'seed',
    created_at: createdAt,
  };
}

/**
 * @returns {{inserted:number, total:number, skipped:boolean}}
 */
export function ensureSeedPopulation({ force = false } = {}) {
  if (!config.seedPopulation && !force) return { inserted: 0, total: db.countAttempts(), skipped: true };

  const already = db.getMeta(SEED_TAG, null);
  if (already && !force) return { inserted: 0, total: db.countAttempts(), skipped: true };

  const rand = seededRandom(20261013);
  const size = Math.max(0, Math.min(20_000, config.seedSize));
  let inserted = 0;
  for (let i = 0; i < size; i++) {
    try {
      db.insertAttempt(makeRow(rand, i));
      inserted += 1;
    } catch {
      /* duplicate id: extremely unlikely, skip */
    }
  }
  db.setMeta(SEED_TAG, new Date().toISOString());
  return { inserted, total: db.countAttempts(), skipped: false };
}

/** CLI entry point — only runs when this file is executed directly. */
const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  const force = process.argv.includes('--force');
  const reset = process.argv.includes('--reset');

  if (reset) {
    // Keep users; drop attempts only, so a reset is non-destructive to accounts.
    const n = db.deleteAllAttempts();
    db.setMeta(SEED_TAG, '');
    console.log(`cleared ${n} attempts`);
  }

  const result = ensureSeedPopulation({ force: true });
  console.log(
    result.skipped
      ? `seeding disabled (SEED_POPULATION=false) — ${result.total} attempts on record`
      : `inserted ${result.inserted} synthetic playthroughs — ${result.total} attempts on record`,
  );
  db.close();
}
