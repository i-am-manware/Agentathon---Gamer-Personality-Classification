import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

export const USERNAME_RE = /^[A-Za-z0-9_-]{3,16}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

export function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const key = await scrypt(password, salt, 64);
  return { salt, passHash: key.toString('hex') };
}

export async function verifyPassword(password, salt, passHash) {
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(passHash, 'hex');
  if (expected.length !== key.length) return false;
  return crypto.timingSafeEqual(key, expected);
}

export function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

export function sessionCookie(token, ttlSeconds, secure) {
  const attrs = [`pp_session=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${ttlSeconds}`];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export function clearSessionCookie(secure) {
  const attrs = ['pp_session=', 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}
