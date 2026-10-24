import { ARCHETYPES, QUIZ_VERSION } from '../../shared/quiz.data.js';
import { computeResult, validateAnswers } from '../lib/scoring.js';
import { buildInsight } from '../lib/insights.js';
import { readJson, unauthorized, tooMany, notFound, clientIp } from '../http/helpers.js';
import { rateLimit } from '../lib/ratelimit.js';
import { currentUser } from '../lib/session.js';

function summary(attempt) {
  const insight = buildInsight(attempt.result);
  return {
    id: attempt.id,
    createdAt: attempt.createdAt,
    quizVersion: attempt.quizVersion,
    answers: attempt.answers,
    result: attempt.result,
    title: insight.title,
    subtitle: insight.subtitle,
    eyebrow: insight.eyebrow
  };
}

export function registerArchiveRoutes(router, { db, config }) {
  router.get('/api/attempts', async (req, res) => {
    const user = currentUser(db, req);
    if (!user) throw unauthorized('Sign in to open your archive');
    const attempts = db.attemptsByUser(user.id).map(summary);
    res.json(200, { attempts });
  });

  router.post('/api/attempts', async (req, res) => {
    const user = currentUser(db, req);
    if (!user) throw unauthorized('Sign in to archive a scan');
    const limit = rateLimit({ key: `attempt:${user.id}`, limit: 60, windowMs: 5 * 60_000 });
    if (!limit.ok) throw tooMany(limit.retryAfter);
    const body = await readJson(req);
    const answers = Array.isArray(body.answers) ? body.answers.map((n) => Number(n)) : null;
    if (!answers || !validateAnswers(answers)) {
      res.error(400, 'bad_answers', 'Answers must cover every question exactly once.');
      return;
    }
    const result = computeResult(answers);
    const attempt = db.addAttempt({ userId: user.id, answers, result, quizVersion: QUIZ_VERSION });
    res.json(201, { attempt: summary(attempt) });
  });

  router.delete('/api/attempts/:id', async (req, res, ctx) => {
    const user = currentUser(db, req);
    if (!user) throw unauthorized('Sign in to manage your archive');
    const removed = db.deleteAttempt(ctx.params.id, user.id);
    if (!removed) throw notFound('Scan not found in your archive');
    res.json(200, { ok: true });
  });

  router.get('/api/stats', async (req, res) => {
    const stats = db.stats();
    const distribution = ARCHETYPES.map(
      (a) => db.fieldPoints().filter((p) => p.a === ARCHETYPES.findIndex((x) => x.key === a.key)).length
    );
    res.json(200, { ...stats, distribution, quizVersion: QUIZ_VERSION });
  });
}
