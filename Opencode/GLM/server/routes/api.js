import { readJsonBody, sendJson, sendError } from '../lib/http.js';
import { QUIZ_VERSION } from '../../shared/questions.js';

export function registerApiRoutes(router, { authService, runService, limits }) {
  const authed = (req, res) => {
    const user = authService.userFromRequest(req);
    if (!user) {
      sendError(res, 401, 'unauthorized', 'sign in first (or continue as guest — the diagnostic is free)');
      return null;
    }
    return user;
  };

  const limit = (req, res, bucket) => {
    const ip = req.socket.remoteAddress || 'unknown';
    const verdict = bucket.check(`${req.method}:/auth:${ip}`);
    if (!verdict.ok) {
      res.setHeader('Retry-After', String(verdict.retryAfterSec));
      sendError(res, 429, 'rate_limited', `slow down — retry in ${verdict.retryAfterSec}s`);
      return false;
    }
    return true;
  };

  router.add('GET', '/api/health', (req, res) => {
    sendJson(res, 200, { ok: true, app: 'spawnpoint', version: '1.0.0', quizVersion: QUIZ_VERSION, uptimeSec: Math.floor(process.uptime()) });
  });

  router.add('POST', '/api/auth/register', async (req, res) => {
    if (!limit(req, res, limits.auth)) return;
    const parsed = await readJsonBody(req);
    if (!parsed.ok) return sendError(res, parsed.status, parsed.code, parsed.message);
    const result = authService.register(parsed.body || {});
    if (!result.ok) return sendError(res, result.status, 'invalid', 'fix the fields below', result.errors);
    res.setHeader('Set-Cookie', result.cookie);
    sendJson(res, 201, { user: result.user });
  });

  router.add('POST', '/api/auth/login', async (req, res) => {
    if (!limit(req, res, limits.auth)) return;
    const parsed = await readJsonBody(req);
    if (!parsed.ok) return sendError(res, parsed.status, parsed.code, parsed.message);
    const result = authService.login(parsed.body || {});
    if (!result.ok) return sendError(res, result.status, 'invalid', 'fix the fields below', result.errors);
    res.setHeader('Set-Cookie', result.cookie);
    sendJson(res, 200, { user: result.user });
  });

  router.add('POST', '/api/auth/logout', (req, res) => {
    res.setHeader('Set-Cookie', authService.logoutCookie());
    sendJson(res, 200, { ok: true });
  });

  router.add('GET', '/api/auth/me', (req, res) => {
    const user = authed(req, res);
    if (!user) return;
    sendJson(res, 200, { user: { id: user.id, username: user.username, createdAt: user.createdAt } });
  });

  router.add('POST', '/api/runs', async (req, res) => {
    if (!limit(req, res, limits.writes)) return;
    const user = authed(req, res);
    if (!user) return;
    const parsed = await readJsonBody(req);
    if (!parsed.ok) return sendError(res, parsed.status, parsed.code, parsed.message);
    const result = runService.createRun(user, parsed.body || {});
    if (!result.ok) return sendError(res, result.status, result.code, result.message, result.fields);
    sendJson(res, 201, { run: result.run });
  });

  router.add('GET', '/api/runs', (req, res) => {
    const user = authed(req, res);
    if (!user) return;
    const result = runService.listRuns(user);
    sendJson(res, 200, { runs: result.runs });
  });

  router.add('GET', '/api/runs/:id', (req, res, params) => {
    const user = authed(req, res);
    if (!user) return;
    const result = runService.getRun(user, params.id);
    if (!result.ok) return sendError(res, result.status, result.code, result.message);
    sendJson(res, 200, { run: result.run });
  });

  router.add('DELETE', '/api/runs/:id', (req, res, params) => {
    const user = authed(req, res);
    if (!user) return;
    const result = runService.deleteRun(user, params.id);
    if (!result.ok) return sendError(res, result.status, result.code, result.message);
    sendJson(res, 200, { ok: true });
  });
}
