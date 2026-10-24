import { publicQuiz, ARCHETYPES, QUIZ_VERSION } from '../../shared/quiz.data.js';
import { computeResult, validateAnswers } from '../lib/scoring.js';
import { buildInsight } from '../lib/insights.js';
import { encodeAnswers, decodeCode } from '../lib/share.js';
import { readJson, badRequest, tooMany, clientIp } from '../http/helpers.js';
import { rateLimit } from '../lib/ratelimit.js';
import { currentUser } from '../lib/session.js';

export function registerQuizRoutes(router, { db, config }) {
  router.get('/api/quiz', async (req, res) => {
    res.json(200, publicQuiz());
  });

  router.post('/api/result', async (req, res) => {
    const limit = rateLimit({ key: `result:${clientIp(req, config.trustProxy)}`, limit: 120, windowMs: 5 * 60_000 });
    if (!limit.ok) throw tooMany(limit.retryAfter);

    const body = await readJson(req);
    let answers = null;
    let via = body.code ? 'link' : 'quiz';

    if (typeof body.code === 'string' && body.code.length) {
      const decoded = decodeCode(body.code);
      if (!decoded.ok) {
        if (decoded.error === 'version') {
          res.error(409, 'code_version', 'That share code was minted by an older cabinet firmware.');
          return;
        }
        res.error(400, 'bad_code', 'That share code is not valid.');
        return;
      }
      answers = decoded.answers;
    } else if (Array.isArray(body.answers)) {
      answers = body.answers.map((n) => Number(n));
      if (!validateAnswers(answers)) {
        res.error(400, 'bad_answers', 'Answers must cover every question exactly once.');
        return;
      }
    } else {
      throw badRequest('bad_request', 'Provide either answers[] or a share code');
    }

    const result = computeResult(answers);
    const insight = buildInsight(result);
    const shareCode = encodeAnswers(answers);
    const user = currentUser(db, req);

    let saved = false;
    let attemptId = null;
    let fieldRecorded = false;

    if (body.record === true && via === 'quiz') {
      const dominantIndex = ARCHETYPES.findIndex((a) => a.key === result.dominant);
      db.addFieldPoint({
        x: Math.round(result.coord.x * 1000) / 1000,
        y: Math.round(result.coord.y * 1000) / 1000,
        a: dominantIndex
      });
      db.countScan();
      fieldRecorded = true;
      if (user) {
        const attempt = db.addAttempt({ userId: user.id, answers, result, quizVersion: QUIZ_VERSION });
        saved = true;
        attemptId = attempt.id;
      }
    } else if (body.record === true && user && via === 'link') {
      const attempt = db.addAttempt({ userId: user.id, answers, result, quizVersion: QUIZ_VERSION });
      saved = true;
      attemptId = attempt.id;
    }

    res.json(200, {
      result,
      insight,
      shareCode,
      saved,
      attemptId,
      fieldRecorded,
      user: user ? user.username : null
    });
  });
}
