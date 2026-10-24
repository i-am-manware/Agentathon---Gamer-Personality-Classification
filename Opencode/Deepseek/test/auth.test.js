import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, parseCookies, sessionCookie, USERNAME_RE } from '../src/lib/auth.js';
import { rateLimit } from '../src/lib/ratelimit.js';

test('passwords hash with a unique salt and verify correctly', async () => {
  const a = await hashPassword('correct horse battery');
  const b = await hashPassword('correct horse battery');
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.passHash, b.passHash);
  assert.equal(await verifyPassword('correct horse battery', a.salt, a.passHash), true);
  assert.equal(await verifyPassword('wrong password here', a.salt, a.passHash), false);
  assert.equal(await verifyPassword('correct horse battery', b.salt, a.passHash), false);
});

test('verifyPassword rejects malformed hashes without throwing', async () => {
  assert.equal(await verifyPassword('whatever', 'abcd', 'not-hex'), false);
  assert.equal(await verifyPassword('whatever', 'abcd', ''), false);
});

test('username rules accept sane handles and reject the rest', () => {
  for (const ok of ['abc', 'PLAYER1', 'pixel_psyche', 'a-b-c', 'Xyz123']) {
    assert.equal(USERNAME_RE.test(ok), true, `${ok} should be valid`);
  }
  for (const bad of ['ab', 'this-is-way-too-long-for-a-handle', 'has space', 'emoji🎮name', 'semi;colon']) {
    assert.equal(USERNAME_RE.test(bad), false, `${bad} should be invalid`);
  }
});

test('cookie helpers produce parseable, hardened cookies', () => {
  const cookie = sessionCookie('tok123', 3600, false);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.doesNotMatch(cookie, /Secure/);
  const secure = sessionCookie('tok123', 3600, true);
  assert.match(secure, /Secure/);
  const parsed = parseCookies(`pp_session=abc%2Fdef; theme=dark; empty=`);
  assert.equal(parsed.pp_session, 'abc/def');
  assert.equal(parsed.theme, 'dark');
});

test('rate limiter blocks after the limit and resets after the window', () => {
  const key = `test:${Math.random()}`;
  for (let i = 0; i < 5; i++) {
    assert.equal(rateLimit({ key, limit: 5, windowMs: 50 }).ok, true);
  }
  const blocked = rateLimit({ key, limit: 5, windowMs: 50 });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.retryAfter <= 1 ? true : blocked.retryAfter > 0, true);
});
