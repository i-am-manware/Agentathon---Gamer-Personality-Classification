import { QUESTIONS, ARCHETYPES, QUIZ_VERSION } from '../../shared/quiz.data.js';
import { computeResult, pairTensions, projectCoordinate } from './scoring.js';
import { hashPassword } from './auth.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function coordFromPcts(pcts) {
  const scores = ARCHETYPES.map((a) => ({ key: a.key, pct: pcts[a.key] }));
  const coord = projectCoordinate(pairTensions(scores));
  let best = ARCHETYPES[0].key;
  for (const a of ARCHETYPES) if (pcts[a.key] > pcts[best]) best = a.key;
  return { coord, dominant: best };
}

export function generateFieldPoints() {
  const rand = mulberry32(19870815);
  const points = [];
  const push = (pcts) => {
    const { coord, dominant } = coordFromPcts(pcts);
    points.push({
      x: Math.round(coord.x * 1000) / 1000,
      y: Math.round(coord.y * 1000) / 1000,
      a: ARCHETYPES.findIndex((a) => a.key === dominant)
    });
  };

  for (const target of ARCHETYPES) {
    for (let i = 0; i < 95; i++) {
      const secondary = ARCHETYPES[Math.floor(rand() * ARCHETYPES.length)];
      const pcts = {};
      for (const a of ARCHETYPES) {
        if (a.key === target.key) {
          pcts[a.key] = clamp(62 + gaussian(rand) * 13, 38, 94);
        } else if (a.key === secondary.key) {
          pcts[a.key] = clamp(36 + gaussian(rand) * 11, 10, 68);
        } else {
          pcts[a.key] = clamp(28 + gaussian(rand) * 10, 6, 60);
        }
      }
      push(pcts);
    }
  }

  for (let i = 0; i < 150; i++) {
    const pcts = {};
    for (const a of ARCHETYPES) pcts[a.key] = clamp(48 + gaussian(rand) * 11, 22, 74);
    push(pcts);
  }

  for (let i = 0; i < 130; i++) {
    const pcts = {};
    for (const a of ARCHETYPES) pcts[a.key] = 15 + rand() * 65;
    push(pcts);
  }

  return points;
}

function answersFor(profile) {
  return QUESTIONS.map((q) => {
    let bestIndex = 0;
    let bestScore = -1;
    q.options.forEach((option, index) => {
      let score = 0;
      for (const [key, weight] of Object.entries(option.w)) score += weight * (profile[key] || 0);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    return bestIndex;
  });
}

export async function seedDatabase(db, config) {
  const changed = { field: false, demo: false };

  if (db.fieldPoints().length === 0 && !db.data.meta.seededAt) {
    const points = generateFieldPoints();
    for (const point of points) db.addFieldPoint(point);
    db.data.meta.seededAt = new Date().toISOString();
    db.markDirty();
    changed.field = true;
  }

  if (db.data.users.length === 0) {
    const { salt, passHash } = await hashPassword(config.demoUser.password);
    const user = db.addUser({
      username: config.demoUser.username,
      passHash,
      salt
    });
    user.createdAt = new Date(Date.now() - 34 * 24 * 3600_000).toISOString();
    db.touchLogin(user);

    const profiles = [
      { profile: { duelist: 3, tactician: 2, bard: 1 }, daysAgo: 26 },
      { profile: { curator: 3, pathfinder: 2, architect: 1 }, daysAgo: 12 },
      { profile: { architect: 3, bard: 2, pathfinder: 1 }, daysAgo: 3 }
    ];
    for (const entry of profiles) {
      const answers = answersFor(entry.profile);
      const result = computeResult(answers);
      db.addAttempt({
        userId: user.id,
        answers,
        result,
        quizVersion: QUIZ_VERSION,
        createdAt: new Date(Date.now() - entry.daysAgo * 24 * 3600_000).toISOString()
      });
    }
    db.markDirty();
    changed.demo = true;
  }

  return changed;
}
