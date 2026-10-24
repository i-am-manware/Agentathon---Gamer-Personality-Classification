import crypto from 'node:crypto';
import { AXES, QUESTIONS } from './content.js';
import { assessAffinity, assessAnswers } from './scoring.js';
import { narrate } from './insights.js';
import { present } from './present.js';
import { get, run } from './db.js';

export function buildProfile({ answers, callsign, slug, createdAt }) {
  const scored = assessAnswers(answers);
  const story = narrate(scored);
  return present(scored, story, { callsign, slug, createdAt });
}

export function projectAffinity(affinity) {
  const scored = assessAffinity(affinity);
  const story = narrate(scored);
  return present(scored, story, {
    callsign: 'Playground',
    slug: null,
    createdAt: Date.now(),
  });
}

export function saveReading(db, { userId = null, slug, callsign, answers, claimHash = null, createdAt = Date.now() }) {
  const profile = buildProfile({ answers, callsign, slug, createdAt });
  const id = crypto.randomUUID();
  run(
    db,
    `INSERT INTO results (id, user_id, share_slug, callsign, answers_json, profile_json, claim_token_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    userId,
    slug,
    callsign,
    JSON.stringify(answers),
    JSON.stringify(profile),
    claimHash,
    createdAt,
  );
  return profile;
}

export function answersFor(strong) {
  const seen = Object.fromEntries(AXES.map((axis) => [axis.id, 0]));
  const answers = {};
  for (const q of QUESTIONS) {
    let arch;
    let level;
    if (strong[q.axis]) {
      arch = strong[q.axis];
      level = 3;
    } else {
      const axis = AXES.find((item) => item.id === q.axis);
      const n = seen[q.axis];
      seen[q.axis] = n + 1;
      arch = n % 2 === 0 ? axis.pos : axis.neg;
      level = 2;
    }
    const option = q.options.find((o) => (o.weights[arch] || 0) === level && Object.keys(o.weights).length === 1);
    if (!option) throw new Error(`No ${arch} option at weight ${level} on ${q.id}`);
    answers[q.id] = option.id;
  }
  return answers;
}

export function slugTaken(db, slug) {
  return Boolean(get(db, 'SELECT 1 AS ok FROM results WHERE share_slug = ?', slug));
}
