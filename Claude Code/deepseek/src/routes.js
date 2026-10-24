/**
 * SPAWNPOINT — API routes.
 *
 * Design notes:
 *   - The client is never trusted with the coordinate. It may score locally for
 *     instant feedback, but every persisted attempt is re-scored here from the
 *     raw answers, and a mismatch is rejected.
 *   - Anonymous play is a first-class path. `POST /api/attempts` works with no
 *     cookie at all; the only difference for a signed-in user is that the row
 *     gets a user_id and shows up in their history.
 *   - Nothing here calls an external service, so there is nothing to rate-limit
 *     for cost reasons, only for abuse.
 */

import { createRouter, sendJson, sendNoContent, readJsonBody } from './http.js';
import db, { randomId } from './db.js';
import config from './config.js';
import {
  hashPassword,
  verifyPassword,
  validateCredentials,
  createSession,
  destroySession,
  userForToken,
  parseCookies,
  sessionCookie,
  clearCookie,
  COOKIE_NAME,
  rateLimit,
} from './auth.js';
import { QUESTIONS } from '../shared/questions.js';
import { ARCHETYPES, ARCHETYPE_BY_KEY, ARCHETYPE_KEYS } from '../shared/archetypes.js';
import { score, encodeAnswers, decodeAnswers, SCORE_VERSION, calibration } from '../shared/scoring.js';
import { buildInsight } from '../shared/insight.js';

export const router = createRouter();

const QUESTION_COUNT = QUESTIONS.length;

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

function clientKey(req, action) {
  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  return `${action}:${ip}`;
}

function context(req) {
  const cookies = parseCookies(req.headers.cookie);
  const user = userForToken(cookies[COOKIE_NAME]);
  if (user) db.touchUser(user.id);
  return { user, cookies };
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, displayName: user.displayName, createdAt: user.createdAt };
}

/* -------------------------------------------------------------------------- */
/* Serialisation                                                               */
/* -------------------------------------------------------------------------- */

/** A stored attempt, expanded back into a full result payload. */
function expandAttempt(attempt, { includeAnswers = true } = {}) {
  const answers = decodeAnswers(attempt.answers, QUESTION_COUNT);
  const s = score(answers, QUESTIONS);
  return {
    id: attempt.id,
    createdAt: attempt.createdAt,
    answers: includeAnswers ? answers : undefined,
    answersCode: attempt.answers,
    durationMs: attempt.durationMs,
    result: s,
    insight: buildInsight(s),
  };
}

function slimPoint(row) {
  // `source` matters to the renderer: seeds are drawn dimmer than real points,
  // and hovering a point tells you which it is. Dropping it here would let
  // simulated data masquerade as real.
  return { id: row.id, x: row.x, y: row.y, primary: row.primary, source: row.source };
}

/* -------------------------------------------------------------------------- */
/* Quiz content                                                                */
/* -------------------------------------------------------------------------- */

router.get('/api/quiz', (req, res) => {
  const cal = calibration(QUESTIONS);
  sendJson(res, 200, {
    version: SCORE_VERSION,
    appVersion: config.version,
    questionCount: QUESTION_COUNT,
    questions: QUESTIONS.map((q, index) => ({
      index,
      id: q.id,
      prompt: q.prompt,
      sub: q.sub || '',
      options: q.options.map((o) => o.label),
    })),
    archetypes: ARCHETYPES.map((a) => ({
      key: a.key,
      name: a.name,
      short: a.short,
      angle: a.angle,
      glyph: a.glyph,
      color: a.color,
      tagline: a.tagline,
      blurb: a.blurb,
      loves: a.loves,
      dreads: a.dreads,
      motto: a.motto,
      shadow: a.shadow,
    })),
    /** Surfaced in the UI so the calibration is visible, not magic. */
    calibration: { floor: cal.floor, ceiling: cal.ceiling },
  });
});

/* -------------------------------------------------------------------------- */
/* Scoring / attempts                                                          */
/* -------------------------------------------------------------------------- */

/** Score a set of answers without persisting. Used by the live preview. */
router.post('/api/score', async (req, res) => {
  const body = await readJsonBody(req);
  const answers = sanitiseAnswers(body.answers);
  const s = score(answers, QUESTIONS);
  sendJson(res, 200, { result: s, insight: buildInsight(s) });
});

router.post('/api/attempts', async (req, res) => {
  const limit = rateLimit(clientKey(req, 'attempt'), { limit: 120, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return sendJson(res, 429, { error: 'Too many submissions. Try again shortly.' }, { 'Retry-After': String(limit.retryAfter) });
  }

  const body = await readJsonBody(req);
  const answers = sanitiseAnswers(body.answers);
  const answered = answers.filter((a) => a !== null).length;

  if (answered < Math.ceil(QUESTION_COUNT * 0.6)) {
    return sendJson(res, 400, {
      error: `Answer at least ${Math.ceil(QUESTION_COUNT * 0.6)} of the ${QUESTION_COUNT} questions to record a result.`,
    });
  }

  const { user } = context(req);
  const s = score(answers, QUESTIONS);

  // If the client sent its own coordinate, make sure it agrees. This is a
  // tamper check, not a trust check: the server's number is what gets stored.
  if (Number.isFinite(body.x) && Number.isFinite(body.y)) {
    const drift = Math.hypot(body.x - s.x, body.y - s.y);
    if (drift > 0.02) {
      return sendJson(res, 409, { error: 'Client and server scoring disagree; refusing to store a mismatched result.' });
    }
  }

  const durationMs = Number.isFinite(body.durationMs)
    ? Math.max(0, Math.min(6 * 60 * 60 * 1000, Math.round(body.durationMs)))
    : null;

  const id = randomId(9);
  db.insertAttempt({
    id,
    user_id: user ? user.id : null,
    answers: encodeAnswers(answers),
    x: s.x,
    y: s.y,
    radius: s.radius,
    heading: s.heading,
    primary_key: s.primary,
    affinities: JSON.stringify(s.affinities),
    score_version: SCORE_VERSION,
    signature: s.signature,
    duration_ms: durationMs,
    source: 'player',
    created_at: new Date().toISOString(),
  });

  sendJson(res, 201, {
    id,
    saved: Boolean(user),
    shareCode: encodeAnswers(answers),
    shareUrl: `/r?a=${encodeAnswers(answers)}`,
    result: s,
    insight: buildInsight(s),
    population: populationSummary(),
  });
});

router.get('/api/attempts/:id', (req, res, params) => {
  const attempt = db.getAttempt(params.id);
  if (!attempt) return sendJson(res, 404, { error: 'No such result.' });
  const { user } = context(req);
  const isOwner = user && attempt.userId === user.id;
  sendJson(res, 200, {
    ...expandAttempt(attempt, { includeAnswers: Boolean(isOwner) }),
    owner: Boolean(isOwner),
  });
});

router.delete('/api/attempts/:id', (req, res, params) => {
  const { user } = context(req);
  if (!user) return sendJson(res, 401, { error: 'Sign in to manage your history.' });
  const removed = db.deleteAttempt(params.id, user.id);
  if (!removed) return sendJson(res, 404, { error: 'No such result in your history.' });
  sendNoContent(res);
});

/* -------------------------------------------------------------------------- */
/* Population                                                                  */
/* -------------------------------------------------------------------------- */

function populationSummary() {
  const counts = db.archetypeCounts();
  const total = db.countAttempts();
  return {
    total,
    counts: Object.fromEntries(ARCHETYPE_KEYS.map((k) => [k, counts[k] || 0])),
    shares: Object.fromEntries(
      ARCHETYPE_KEYS.map((k) => [k, total ? Math.round(((counts[k] || 0) / total) * 1000) / 10 : 0]),
    ),
  };
}

router.get('/api/population', (req, res) => {
  const points = db.populationSample(config.populationSampleLimit);
  sendJson(
    res,
    200,
    {
      points: points.map(slimPoint),
      summary: populationSummary(),
      sampled: points.length,
    },
    { 'Cache-Control': 'public, max-age=15' },
  );
});

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

router.post('/api/auth/register', async (req, res) => {
  const limit = rateLimit(clientKey(req, 'register'), { limit: 12, windowMs: 60 * 60 * 1000 });
  if (!limit.allowed) {
    return sendJson(res, 429, { error: 'Too many sign-ups from here. Try again later.' }, { 'Retry-After': String(limit.retryAfter) });
  }

  const body = await readJsonBody(req);
  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  const check = validateCredentials(username, password);
  if (!check.ok) return sendJson(res, 400, { error: 'Check the form.', fields: check.errors });

  if (db.findUserByUsername(username)) {
    return sendJson(res, 409, { error: 'That callsign is taken.', fields: { username: 'Already in use.' } });
  }

  const { hash, salt } = hashPassword(password);
  const user = db.createUser({ username, displayName: username, passwordHash: hash, passwordSalt: salt });

  // Claim any anonymous attempts made in this browser, so a fresh account does
  // not start with an empty history.
  const claimed = claimAttempts(req, user.id);

  const session = createSession(user.id);
  sendJson(res, 201, { user: publicUser(user), claimed }, { 'Set-Cookie': sessionCookie(session.token, session.expiresAt) });
});

router.post('/api/auth/login', async (req, res) => {
  const limit = rateLimit(clientKey(req, 'login'), { limit: 20, windowMs: 15 * 60 * 1000 });
  if (!limit.allowed) {
    return sendJson(res, 429, { error: 'Too many attempts. Wait a few minutes.' }, { 'Retry-After': String(limit.retryAfter) });
  }

  const body = await readJsonBody(req);
  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  const row = db.findUserByUsername(username);
  // Always run a hash so a missing user and a wrong password take the same time.
  const salt = row ? row.password_salt : '0'.repeat(32);
  const expected = row ? row.password_hash : '0'.repeat(128);
  const ok = verifyPassword(password, salt, expected);

  if (!row || !ok) return sendJson(res, 401, { error: 'That callsign and password do not match.' });

  const claimed = claimAttempts(req, row.id);
  const session = createSession(row.id);
  sendJson(res, 200, {
    user: publicUser(db.getUser(row.id)),
    claimed,
  }, { 'Set-Cookie': sessionCookie(session.token, session.expiresAt) });
});

router.post('/api/auth/logout', (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  destroySession(cookies[COOKIE_NAME]);
  sendNoContent(res, { 'Set-Cookie': clearCookie() });
});

router.get('/api/me', (req, res) => {
  const { user } = context(req);
  if (!user) return sendJson(res, 200, { user: null, attempts: [] });
  const attempts = db.listAttemptsByUser(user.id, 100);
  sendJson(res, 200, {
    user: publicUser(user),
    attempts: attempts.map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      answersCode: a.answers,
      durationMs: a.durationMs,
      result: score(decodeAnswers(a.answers, QUESTION_COUNT), QUESTIONS),
    })),
  });
});

/**
 * Anonymous attempts live in a browser-local list of ids (localStorage). On
 * sign-in we hand that list over so the history is not empty on day one.
 * Only ids that are still unowned are claimed, so nobody can steal a result.
 */
function claimAttempts(req, userId) {
  const header = req.headers['x-spawnpoint-attempts'];
  if (!header) return 0;
  const ids = String(header)
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[A-Za-z0-9_-]{6,32}$/.test(s))
    .slice(0, 200);
  let claimed = 0;
  for (const id of ids) {
    const attempt = db.getAttempt(id);
    if (attempt && attempt.userId === null) {
      db.claimAttempt(id, userId);
      claimed += 1;
    }
  }
  return claimed;
}

/* -------------------------------------------------------------------------- */
/* Health                                                                      */
/* -------------------------------------------------------------------------- */

router.get('/api/health', (req, res) => {
  sendJson(res, 200, {
    ok: true,
    driver: db.driver,
    scoreVersion: SCORE_VERSION,
    questions: QUESTION_COUNT,
    archetypes: ARCHETYPE_KEYS.length,
    attempts: db.countAttempts(),
    users: db.countUsers(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function sanitiseAnswers(input) {
  const out = new Array(QUESTION_COUNT).fill(null);
  if (!Array.isArray(input)) return out;
  for (let i = 0; i < QUESTION_COUNT; i++) {
    const v = input[i];
    if (!Number.isInteger(v)) continue;
    if (v < 0 || v >= QUESTIONS[i].options.length) continue;
    out[i] = v;
  }
  return out;
}

export { expandAttempt, populationSummary, publicUser, context, sanitiseAnswers, ARCHETYPE_BY_KEY };
