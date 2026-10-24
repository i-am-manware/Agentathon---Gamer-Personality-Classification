// Password hashing (scrypt) + opaque server-side sessions.
// Cookie holds a random 256-bit token; the DB stores only its SHA-256,
// so a leaked database cannot be replayed as live sessions.
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError, parseCookies, serializeCookie } from './http.js';

const scrypt = promisify(crypto.scrypt);
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const COOKIE = 'pp_session';

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const [alg, n, saltB64, keyB64] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, { ...SCRYPT, N: Number(n) });
  return crypto.timingSafeEqual(key, expected);
}

// Constant-ish work for unknown usernames so login timing doesn't reveal accounts.
let dummyHash = null;
export async function burnHash(password) {
  dummyHash ||= await hashPassword('not-a-real-password');
  await verifyPassword(password, dummyHash);
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;

export function validateCredentials(body) {
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!USERNAME_RE.test(username)) throw new HttpError(400, 'Username must be 3–24 characters: letters, numbers, _ . -', 'bad_username');
  if (password.length < 8 || password.length > 200) throw new HttpError(400, 'Password must be at least 8 characters', 'bad_password');
  return { username, password };
}

export function createSessionService(store, { sessionDays, secureCookies }) {
  const ttl = sessionDays * 86400 * 1000;
  return {
    issue(res, userId) {
      const token = crypto.randomBytes(32).toString('base64url');
      store.createSession(sha256(token), userId, Date.now() + ttl);
      res.setHeader('Set-Cookie', serializeCookie(COOKIE, token, { maxAge: ttl / 1000, secure: secureCookies }));
    },
    revoke(req, res) {
      const token = parseCookies(req.headers.cookie)[COOKIE];
      if (token) store.deleteSession(sha256(token));
      res.setHeader('Set-Cookie', serializeCookie(COOKIE, '', { maxAge: 0, secure: secureCookies }));
    },
    /** Resolve the signed-in user for a request, or null. */
    user(req) {
      const token = parseCookies(req.headers.cookie)[COOKIE];
      if (!token || token.length > 100) return null;
      const s = store.findSession(sha256(token));
      if (!s || s.expires_at < Date.now()) return null;
      return store.findUserById(s.user_id);
    },
  };
}
