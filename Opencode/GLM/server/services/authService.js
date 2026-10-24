import { hashPassword, verifyPassword } from '../auth/passwords.js';
import { signToken, verifyToken } from '../auth/tokens.js';
import { serializeCookie, parseCookies } from '../lib/http.js';
import { isUsername, isPassword } from '../lib/validate.js';

export const SESSION_COOKIE = 'sp_session';

export function createAuthService(userRepo, config) {
  const issueToken = (user) =>
    signToken({ uid: user.id, uname: user.username, exp: Date.now() + config.sessionTtlMs }, config.sessionSecret.value);

  const sessionCookie = (token) =>
    serializeCookie(SESSION_COOKIE, token, { maxAge: Math.floor(config.sessionTtlMs / 1000), sameSite: 'Lax' });

  return {
    register({ username, password }) {
      const errors = {};
      if (!isUsername(username)) {
        errors.username = '3–24 chars; letters, numbers, dot, dash, underscore only';
      }
      if (!isPassword(password)) {
        errors.password = 'at least 8 characters (you were going to use hunter2 anyway)';
      }
      if (Object.keys(errors).length > 0) return { ok: false, status: 400, errors };

      if (userRepo.findByUsername(username)) {
        return { ok: false, status: 409, errors: { username: 'that name is already claimed' } };
      }
      const user = userRepo.create({ username, passHash: hashPassword(password) });
      const token = issueToken(user);
      return { ok: true, user: userRepo.toPublic(user), token, cookie: sessionCookie(token) };
    },

    login({ username, password }) {
      const errors = {};
      if (typeof username !== 'string' || username.length === 0) errors.username = 'name required';
      if (typeof password !== 'string' || password.length === 0) errors.password = 'password required';
      if (Object.keys(errors).length > 0) return { ok: false, status: 400, errors };

      const user = userRepo.findByUsername(username);
      if (!user || !verifyPassword(password, user.passHash)) {
        return { ok: false, status: 401, errors: { form: 'wrong name or wrong password (one of the two)' } };
      }
      const token = issueToken(user);
      return { ok: true, user: userRepo.toPublic(user), token, cookie: sessionCookie(token) };
    },

    logoutCookie() {
      return serializeCookie(SESSION_COOKIE, '', { maxAge: 0 });
    },

    userFromRequest(req) {
      const cookies = parseCookies(req);
      const token = cookies[SESSION_COOKIE];
      if (!token) return null;
      const payload = verifyToken(token, config.sessionSecret.value);
      if (!payload) return null;
      const user = userRepo.findByUsername(payload.uname || '');
      if (!user || user.id !== payload.uid) return null;
      return user;
    },
  };
}
