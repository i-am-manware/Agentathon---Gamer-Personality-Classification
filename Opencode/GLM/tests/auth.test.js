import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../server/auth/passwords.js';
import { signToken, verifyToken } from '../server/auth/tokens.js';

const SECRET = 'test-secret-0123456789abcdef';

test('passwords: hash → verify round-trip, wrong password fails', () => {
  const hash = hashPassword('hunter2butlonger');
  assert.notEqual(hash, 'hunter2butlonger');
  assert.ok(hash.startsWith('scrypt$'));
  assert.ok(verifyPassword('hunter2butlonger', hash));
  assert.equal(verifyPassword('hunter2butlonge', hash), false);
  assert.equal(verifyPassword('', hash), false);
  assert.equal(verifyPassword('hunter2butlonger', 'garbage'), false);
  assert.equal(verifyPassword('hunter2butlonger', null), false);
});

test('passwords: unique salts', () => {
  const a = hashPassword('same-password-1');
  const b = hashPassword('same-password-1');
  assert.notEqual(a, b);
});

test('tokens: sign → verify round-trip', () => {
  const token = signToken({ uid: 'u1', uname: 'player', exp: Date.now() + 60_000 }, SECRET);
  const payload = verifyToken(token, SECRET);
  assert.ok(payload);
  assert.equal(payload.uid, 'u1');
  assert.equal(payload.uname, 'player');
});

test('tokens: tampering fails, wrong secret fails, expiry fails', () => {
  const token = signToken({ uid: 'u1', uname: 'player', exp: Date.now() + 60_000 }, SECRET);
  const [body, sig] = token.split('.');
  const forged = `${body}.${sig.slice(0, -2)}aa`;
  assert.equal(verifyToken(forged, SECRET), null);
  assert.equal(verifyToken(token, 'another-secret-9876543210'), null);
  const expired = signToken({ uid: 'u1', uname: 'player', exp: Date.now() - 1000 }, SECRET);
  assert.equal(verifyToken(expired, SECRET), null);
  assert.equal(verifyToken('not-a-token', SECRET), null);
  assert.equal(verifyToken(null, SECRET), null);
});
