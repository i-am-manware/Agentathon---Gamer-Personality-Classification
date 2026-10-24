// Stateless session tokens: base64url(payload).base64url(HMAC-SHA256).
// No server-side session table needed; verified with a constant-time compare.

import { createHmac, timingSafeEqual } from 'node:crypto';

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const b64uJson = (obj) => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');

export function signToken(payload, secret) {
  const body = b64uJson(payload);
  const sig = b64u(createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token, secret) {
  try {
    if (typeof token !== 'string') return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = createHmac('sha256', secret).update(body).digest();
    const actual = Buffer.from(sig, 'base64url');
    if (actual.length !== expected.length) return null;
    if (!timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
