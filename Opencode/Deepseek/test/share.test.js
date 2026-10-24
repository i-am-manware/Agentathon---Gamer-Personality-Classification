import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeAnswers, decodeCode } from '../src/lib/share.js';
import { QUESTIONS } from '../shared/quiz.data.js';

const allFirst = QUESTIONS.map(() => 0);
const mixed = QUESTIONS.map((q, i) => i % q.options.length);
const allLast = QUESTIONS.map((q) => q.options.length - 1);

test('share codes round-trip for any valid answer set', () => {
  for (const answers of [allFirst, mixed, allLast]) {
    const code = encodeAnswers(answers);
    assert.equal(typeof code, 'string');
    assert.ok(/^[0-9a-z]+$/.test(code), 'code must be url-safe lowercase');
    const decoded = decodeCode(code);
    assert.equal(decoded.ok, true);
    assert.deepEqual(decoded.answers, answers);
    assert.equal(decoded.version, 1);
  }
});

test('share codes survive case and whitespace sloppiness', () => {
  const code = encodeAnswers(mixed);
  const decoded = decodeCode(`  ${code.toUpperCase()}  `);
  assert.equal(decoded.ok, true);
  assert.deepEqual(decoded.answers, mixed);
});

test('corrupted codes are rejected cleanly', () => {
  const code = encodeAnswers(mixed);
  const flipped = (code[4] === 'a' ? 'b' : 'a') + code.slice(1);
  assert.equal(decodeCode(flipped).ok, false);
  assert.equal(decodeCode(flipped).error, 'checksum');
  assert.equal(decodeCode(code.slice(0, -1)).ok, false);
  assert.equal(decodeCode('').ok, false);
  assert.equal(decodeCode(null).ok, false);
  assert.equal(decodeCode('zzzzzzzzzzzzzzzzzzzzzzzzzzzz').ok, false);
});

test('codes with out-of-range answers fail before checksum gaming', () => {
  const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
  const checksum = (str) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ALPHABET[h % 36] + ALPHABET[Math.floor(h / 36) % 36];
  };
  const payload = '1' + '9'.repeat(QUESTIONS.length);
  const forged = payload + checksum(payload);
  assert.equal(decodeCode(forged).ok, false);
  assert.equal(decodeCode(forged).error, 'range');
  assert.throws(() => encodeAnswers([9, ...allFirst.slice(1)]));
});
