/**
 * SPAWNPOINT — authentication.
 *
 * Zero dependencies, no OAuth provider, no paid anything.
 *
 *   Passwords : scrypt (Node's built-in, memory-hard) with a per-user 16-byte
 *               salt, stored as hex. Comparison is timing-safe.
 *   Sessions  : an opaque 32-byte random token, delivered as an httpOnly,
 *               SameSite=Lax cookie. Only a SHA-256 hash of the token is
 *               stored, so a database leak does not hand over live sessions.
 *   Expiry    : 30 days, refreshed on use.
 *
 * Signing in is entirely optional in this app. Every quiz, every result and
 * every share link works without an account; an account exists only to keep a
 * history and compare retakes.
 */

import crypto from 'node:crypto';
import db, { randomId } from './db.js';
import config from './config.js';

export const COOKIE_NAME = 'spawnpoint_session';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };

/* -------------------------------------------------------------------------- */
/* Password hashing                                                            */
/* -------------------------------------------------------------------------- */

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, salt, expectedHex) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                  */
/* -------------------------------------------------------------------------- */

export const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,24}$/;

export function validateCredentials(username, password) {
  const errors = {};
  if (typeof username !== 'string' || !USERNAME_RE.test(username.trim())) {
    errors.username = '3–24 characters, letters, numbers, dot, dash or underscore.';
  }
  if (typeof password !== 'string' || password.length < 8) {
    errors.password = 'At least 8 characters.';
  } else if (password.length > 200) {
    errors.password = 'Keep it under 200 characters.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/* -------------------------------------------------------------------------- */
/* Sessions                                                                    */
/* -------------------------------------------------------------------------- */

function hashToken(token) {
  return crypto.createHmac('sha256', config.sessionSecret).update(token).digest('hex');
}

export function createSession(userId) {
  const token = randomId(32);
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 86400_000).toISOString();
  db.createSession({ tokenHash: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

export function destroySession(token) {
  if (!token) return;
  db.deleteSession(hashToken(token));
}

/** @returns {{id:number, username:string, displayName:string}|null} */
export function userForToken(token) {
  if (!token) return null;
  const session = db.getSession(hashToken(token));
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    db.deleteSession(hashToken(token));
    return null;
  }
  return db.getUser(session.userId);
}

/* -------------------------------------------------------------------------- */
/* Cookies                                                                     */
/* -------------------------------------------------------------------------- */

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      out[key] = part.slice(eq + 1).trim();
    }
  }
  return out;
}

export function sessionCookie(token, expiresAt) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Expires=${new Date(expiresAt).toUTCString()}`,
  ];
  if (config.isProd) parts.push('Secure');
  return parts.join('; ');
}

export function clearCookie() {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (config.isProd) parts.push('Secure');
  return parts.join('; ');
}

/* -------------------------------------------------------------------------- */
/* Rate limiting                                                               */
/* -------------------------------------------------------------------------- */

/**
 * A small in-memory sliding window, keyed by IP + action. Enough to stop
 * trivial credential stuffing without pulling in a dependency or a Redis.
 */
const buckets = new Map();

export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, remaining: limit - entry.count, retryAfter: 0 };
}

// Keep the map from growing without bound on a long-lived process.
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) if (now > entry.resetAt) buckets.delete(key);
}, 5 * 60 * 1000);
if (sweeper.unref) sweeper.unref();
