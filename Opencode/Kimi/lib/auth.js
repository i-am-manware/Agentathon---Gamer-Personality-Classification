'use strict';

const crypto = require('crypto');
const { id, parseCookies } = require('./util');

/**
 * Passwords: scrypt with per-user salt (OWASP-recommended params), stored as
 * `scrypt:N:r:p:salt:hash`. Verified with a constant-time comparison.
 *
 * Sessions: opaque 32-byte tokens. Only the SHA-256 of the token is stored
 * server-side, so a leaked store file cannot be used to hijack sessions.
 * Cookies are httpOnly + SameSite=Lax (+ Secure when served over HTTPS).
 */
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const COOKIE_NAME = 'hexaxis_session';

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt:${SCRYPT.N}:${SCRYPT.r}:${SCRYPT.p}:${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  try {
    const [scheme, N, r, p, saltHex, hashHex] = String(stored).split(':');
    if (scheme !== 'scrypt') return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, {
      N: Number(N), r: Number(r), p: Number(p),
    });
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const tokenDigest = (token) => crypto.createHash('sha256').update(token).digest('hex');

class AuthService {
  constructor(store) {
    this.store = store;
    this._sweep();
    this._sweeper = setInterval(() => this._sweep(), 60 * 60 * 1000);
    if (this._sweeper.unref) this._sweeper.unref();
  }

  _sweep() {
    const now = Date.now();
    this.store.remove('sessions', (s) => s.expiresAt <= now);
  }

  createSession(userId) {
    const token = id(32);
    this.store.insert('sessions', {
      digest: tokenDigest(token),
      userId,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    });
    return token;
  }

  destroySession(token) {
    if (!token) return;
    this.store.remove('sessions', (s) => s.digest === tokenDigest(token));
  }

  /** Resolve the request's session cookie to a user record (or null). */
  userFromRequest(req) {
    const token = parseCookies(req)[COOKIE_NAME];
    if (!token) return null;
    const session = this.store.findOne('sessions', (s) => s.digest === tokenDigest(token));
    if (!session || session.expiresAt <= Date.now()) return null;
    return this.store.findOne('users', (u) => u.id === session.userId) || null;
  }

  cookieHeader(token, secure) {
    const parts = [
      `${COOKIE_NAME}=${token}`,
      'Path=/', 'HttpOnly', 'SameSite=Lax',
      `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    ];
    if (secure) parts.push('Secure');
    return parts.join('; ');
  }

  clearCookieHeader() {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  }
}

/**
 * Fixed-window rate limiter for sensitive endpoints (auth, quiz start).
 * In-memory, per-process — intentionally simple; documented in README.
 */
class RateLimiter {
  constructor({ windowMs, max }) {
    this.windowMs = windowMs;
    this.max = max;
    this.hits = new Map();
    this._gc = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.hits) if (entry.reset <= now) this.hits.delete(key);
    }, windowMs);
    if (this._gc.unref) this._gc.unref();
  }

  /** Returns true if the request may proceed, false if the limit is exceeded. */
  allow(key) {
    const now = Date.now();
    let entry = this.hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + this.windowMs };
      this.hits.set(key, entry);
    }
    entry.count++;
    return entry.count <= this.max;
  }
}

module.exports = { AuthService, RateLimiter, hashPassword, verifyPassword };
