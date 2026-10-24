// Run intake: the server NEVER trusts the client's math. Answers are validated
// and re-scored with the same isomorphic scoring module the browser used, then
// the derived summary is persisted.

import { QUESTIONS, QUIZ_VERSION } from '../../shared/questions.js';
import { scoreRun, validateAnswers } from '../../shared/scoring.js';
import { buildInsight } from '../../shared/insights.js';
import { encodeResult } from '../../shared/codec.js';
import { POLE_RING } from '../../shared/axes.js';

export function createRunService(runRepo) {
  function persistableRun(answers) {
    const score = scoreRun(answers); // throws 400-status Error on bad input
    const insight = buildInsight(score);
    const affById = Object.fromEntries(score.affinities.map((row) => [row.id, row]));
    return {
      version: QUIZ_VERSION,
      answers,
      evidence: score.evidence,
      title: insight.title,
      tagline: insight.tagline,
      primary: score.primary,
      secondary: score.secondary,
      sector: score.sector,
      territory: score.territory.label,
      convictionPct: score.conviction.pct,
      axes: score.axes.map((ax) => Math.round(ax.value * 1000) / 1000),
      affinities: POLE_RING.map((id) => affById[id].pct),
      point: { x: Math.round(score.point.x * 1000) / 1000, y: Math.round(score.point.y * 1000) / 1000 },
      distance: Math.round(score.distance * 1000) / 1000,
      code: encodeResult(score),
    };
  }

  return {
    createRun(user, body) {
      if (body.version !== QUIZ_VERSION) {
        return {
          ok: false,
          status: 400,
          code: 'version_mismatch',
          message: `the questionnaire updated (v${QUIZ_VERSION}); retake the diagnostic`,
        };
      }
      const check = validateAnswers(body.answers);
      if (!check.ok) {
        return { ok: false, status: 400, code: 'invalid_answers', message: check.errors[0], fields: check.errors };
      }
      const run = runRepo.create(user.usernameLower, persistableRun(body.answers));
      return { ok: true, run: runRepo.summary(run) };
    },

    listRuns(user) {
      return { ok: true, runs: runRepo.listByUsername(user.usernameLower) };
    },

    getRun(user, id) {
      const run = runRepo.get(id);
      if (!run || run.usernameLower !== user.usernameLower) {
        return { ok: false, status: 404, code: 'not_found', message: 'no such save file' };
      }
      return { ok: true, run: { ...runRepo.summary(run), answers: run.answers } };
    },

    deleteRun(user, id) {
      const run = runRepo.get(id);
      if (!run || run.usernameLower !== user.usernameLower) {
        return { ok: false, status: 404, code: 'not_found', message: 'no such save file' };
      }
      runRepo.delete(id);
      return { ok: true };
    },

    // used by the seeder: same path real traffic takes
    persistableRun,
  };
}
