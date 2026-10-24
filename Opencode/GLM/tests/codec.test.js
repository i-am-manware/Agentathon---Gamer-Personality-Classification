import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTIONS } from '../shared/questions.js';
import { scoreRun } from '../shared/scoring.js';
import { encodeResult, decodeResult } from '../shared/codec.js';
import { isInsideHexagon } from '../shared/axes.js';

test('share codes round-trip the essential result', () => {
  for (let seed = 0; seed < 60; seed++) {
    const answers = QUESTIONS.map((q, i) => {
      if (q.type === 'slider') return (seed * 23 + i * 11) % 101;
      return (seed * 5 + i * 3) % q.options.length;
    });
    const score = scoreRun(answers);
    const code = encodeResult(score);
    assert.ok(code.length < 120, 'code stays shareable');
    const decoded = decodeResult(code);
    assert.ok(decoded, 'decodes');
    assert.equal(decoded.primary, score.primary);
    assert.equal(decoded.secondary, score.secondary);
    assert.equal(decoded.conviction.pct, score.conviction.pct);
    for (let i = 0; i < 3; i++) {
      assert.ok(Math.abs(decoded.axes[i].value - score.axes[i].value) < 0.002);
    }
    for (let i = 0; i < 6; i++) {
      assert.equal(decoded.affinities[i].pct, score.affinities[i].pct);
    }
    // pcts are integer-rounded, so the reconstructed point may shift by up to
    // ~3% of the plane radius — visually identical, always inside the hexagon
    assert.ok(Math.abs(decoded.point.x - score.point.x) < 0.035);
    assert.ok(Math.abs(decoded.point.y - score.point.y) < 0.035);
    assert.ok(isInsideHexagon(decoded.point));
  }
});

test('hostile codes are rejected without throwing', () => {
  const junk = [
    null, undefined, '', '!!!', 'aGVsbG8gd29ybGQ', 'eyJ2IjoyfHwxfDF8MXwx', '$$$$$',
    'x'.repeat(300), 'a'.repeat(64), 'ABC*DEF', 'e30',
    Buffer.from('2|1|1|1|1|1|1|1').toString('base64url'),
    Buffer.from('1|a|1|1').toString('base64url'),
    Buffer.from('1|99999,1,1|1,1,1,1,1,1|50').toString('base64url'),
    Buffer.from('1|500,500,500,500|1,1,1,1,1,1|50').toString('base64url'),
    Buffer.from('1|0,0,0|1,1,1|50').toString('base64url'),
    Buffer.from('1|0,0,0|1,1,1,1,1,1|200').toString('base64url'),
  ];
  for (const code of junk) {
    assert.equal(decodeResult(code), null, `should reject: ${String(code)}`);
  }
});

test('decoded codes are safe to render (clamped)', () => {
  const score = scoreRun(QUESTIONS.map((q) => (q.type === 'slider' ? 73 : 1)));
  const decoded = decodeResult(encodeResult(score));
  assert.ok(decoded.point.x >= -1.0000001 && decoded.point.x <= 1.0000001);
  assert.ok(decoded.territory.label.length > 0);
  assert.ok(decoded.sector.length > 0);
});
