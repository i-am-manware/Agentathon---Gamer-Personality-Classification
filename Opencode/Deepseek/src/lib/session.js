import { parseCookies } from './auth.js';

export const SESSION_COOKIE = 'pp_session';

export function currentUser(db, req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[SESSION_COOKIE];
  const session = db.session(token);
  if (!session) return null;
  return db.userById(session.userId);
}

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt
  };
}
