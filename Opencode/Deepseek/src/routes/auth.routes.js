import {
  USERNAME_RE,
  PASSWORD_MIN,
  PASSWORD_MAX,
  hashPassword,
  verifyPassword,
  newToken,
  sessionCookie,
  clearSessionCookie
} from '../lib/auth.js';
import { currentUser, publicUser, SESSION_COOKIE } from '../lib/session.js';
import { readJson, badRequest, tooMany, clientIp } from '../http/helpers.js';
import { rateLimit } from '../lib/ratelimit.js';

function validateCredentials(body) {
  const username = String(body.username || '').trim();
  const password = String(body.password || '');
  if (!USERNAME_RE.test(username)) {
    throw badRequest('bad_username', 'Username must be 3-16 characters: letters, numbers, _ or -');
  }
  if (password.length < PASSWORD_MIN) {
    throw badRequest('bad_password', `Password must be at least ${PASSWORD_MIN} characters`);
  }
  if (password.length > PASSWORD_MAX) {
    throw badRequest('bad_password', 'Password is too long');
  }
  return { username, password };
}

export function registerAuthRoutes(router, { db, config }) {
  router.post('/api/auth/register', async (req, res, ctx) => {
    const limit = rateLimit({ key: `reg:${clientIp(req, config.trustProxy)}`, limit: 8, windowMs: 10 * 60_000 });
    if (!limit.ok) throw tooMany(limit.retryAfter);

    const body = await readJson(req);
    const { username, password } = validateCredentials(body);
    if (db.userByName(username)) {
      res.error(409, 'username_taken', 'That handle is already on the cabinet. Pick another.');
      return;
    }
    const { salt, passHash } = await hashPassword(password);
    const user = db.addUser({ username, passHash, salt });
    const token = newToken();
    db.addSession(token, user.id, config.sessionTtlMs);
    db.touchLogin(user);
    res.json(
      201,
      { user: publicUser(user) },
      { 'Set-Cookie': sessionCookie(token, Math.floor(config.sessionTtlMs / 1000), config.cookieSecure) }
    );
  });

  router.post('/api/auth/login', async (req, res, ctx) => {
    const limit = rateLimit({ key: `login:${clientIp(req, config.trustProxy)}`, limit: 12, windowMs: 10 * 60_000 });
    if (!limit.ok) throw tooMany(limit.retryAfter);

    const body = await readJson(req);
    const { username, password } = validateCredentials(body);
    const user = db.userByName(username);
    const ok = user ? await verifyPassword(password, user.salt, user.passHash) : false;
    if (!ok) {
      res.error(401, 'bad_credentials', 'Those credentials did not survive the scan. Try again.');
      return;
    }
    const token = newToken();
    db.addSession(token, user.id, config.sessionTtlMs);
    db.touchLogin(user);
    res.json(
      200,
      { user: publicUser(user) },
      { 'Set-Cookie': sessionCookie(token, Math.floor(config.sessionTtlMs / 1000), config.cookieSecure) }
    );
  });

  router.post('/api/auth/logout', async (req, res) => {
    const token = parseToken(req);
    if (token) db.deleteSession(token);
    res.json(200, { ok: true }, { 'Set-Cookie': clearSessionCookie(config.cookieSecure) });
  });

  router.get('/api/auth/me', async (req, res) => {
    const user = currentUser(db, req);
    res.json(200, { user: user ? publicUser(user) : null });
  });
}

function parseToken(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
