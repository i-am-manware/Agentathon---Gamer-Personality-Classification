import crypto from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32, SCRYPT).toString('hex');
  return `scrypt$16384$8$1$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, salt, hash] = parts;
  let next;
  try {
    next = crypto.scryptSync(password, salt, 32, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: SCRYPT.maxmem,
    });
  } catch {
    return false;
  }
  const a = Buffer.from(hash, 'hex');
  if (a.length !== next.length) return false;
  return crypto.timingSafeEqual(a, next);
}

export const DUMMY_HASH = hashPassword('rift-index-placeholder-not-a-user');

export function newSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function sessionExpiry(now = Date.now()) {
  return now + SESSION_MS;
}

export const SESSION_MAX_AGE = Math.floor(SESSION_MS / 1000);

export function cleanEmail(input) {
  const email = String(input ?? '').trim().toLowerCase();
  if (email.length < 6 || email.length > 120) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function cleanName(input) {
  const raw = String(input ?? '').replace(/\s+/g, ' ').trim();
  if (raw.length < 1 || raw.length > 24) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} '’-]*$/u.test(raw)) return null;
  return raw;
}

export function cleanCallsign(input, fallback = 'Operator') {
  const raw = String(input ?? '').replace(/\s+/g, ' ').trim();
  const cleaned = raw.replace(/[^\p{L}\p{N} '’-]/gu, '').slice(0, 22).trim();
  return cleaned || fallback;
}

export function validClaim(token) {
  const value = String(token ?? '');
  return /^[a-f0-9]{48}$/.test(value) ? value : null;
}

export function sessionCookie(token) {
  return [
    `rift_session=${token}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${SESSION_MAX_AGE}`,
  ].join('; ');
}

export function clearSessionCookie() {
  return 'rift_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
}

export function readCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}
