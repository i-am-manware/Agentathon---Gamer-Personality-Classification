import { hashPassword } from './auth.js';
import { get, run, transaction } from './db.js';
import { answersFor, saveReading, slugTaken } from './readings.js';

export const DEMO_EMAIL = 'ada@riftindex.demo';
export const DEMO_PASSWORD = 'night-desk';
export const DEMO_NAME = 'Ada Quill';

const HISTORY = [
  {
    slug: 'firstwin',
    daysAgo: 50,
    strong: { destination: 'laureate', company: 'chorus' },
  },
  {
    slug: 'sidetrip',
    daysAgo: 16,
    strong: { composition: 'wildcard', destination: 'nomad' },
  },
  {
    slug: 'sample',
    daysAgo: 1,
    strong: { composition: 'architect', company: 'shade' },
  },
];

export function seed(db) {
  let user = get(db, 'SELECT id FROM users WHERE email = ?', DEMO_EMAIL);
  if (!user) {
    const id = cryptoId();
    run(
      db,
      'INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
      id,
      DEMO_EMAIL,
      DEMO_NAME,
      hashPassword(DEMO_PASSWORD),
      Date.now() - 60 * 24 * 60 * 60 * 1000,
    );
    user = { id };
  }

  if (slugTaken(db, 'sample')) return;

  const day = 24 * 60 * 60 * 1000;
  transaction(db, () => {
    for (const item of HISTORY) {
      if (slugTaken(db, item.slug)) continue;
      saveReading(db, {
        userId: user.id,
        slug: item.slug,
        callsign: DEMO_NAME,
        answers: answersFor(item.strong),
        createdAt: Date.now() - item.daysAgo * day,
      });
    }
  });
}

function cryptoId() {
  return globalThis.crypto.randomUUID();
}
