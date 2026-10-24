import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUESTIONS, ARCH, ARCH_ORDER, TITLES, OPPOSITE, optionCount, optionWeights,
  analyze, encodeAnswers, decodeCode, hexRadius, wedgeAt, integrityCheck, mulberry32,
} from '../shared/engine.js';
import { buildInsight, PROFILES, HYBRIDS } from '../shared/content.js';
import { simulateAnswers } from '../server/simulate.js';

const rnd = mulberry32(99);
const randomAnswers = () => QUESTIONS.map((q) => Math.floor(rnd() * optionCount(q)));
const greedy = (k) => QUESTIONS.map((q) => {
  let best = 0, bv = -Infinity;
  for (let i = 0; i < optionCount(q); i++) { const v = optionWeights(q, i)[k] || 0; if (v > bv) { bv = v; best = i; } }
  return best;
});

test('question bank is well-formed', () => {
  assert.ok(QUESTIONS.length >= 20 && QUESTIONS.length <= 30);
  assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, QUESTIONS.length, 'ids unique');
  for (const q of QUESTIONS) {
    assert.ok(['scenario', 'versus', 'spectrum'].includes(q.type), q.id);
    assert.ok(q.prompt && q.kicker, q.id);
    if (q.type === 'scenario') assert.equal(q.options.length, 4, q.id);
    if (q.type === 'versus') assert.equal(q.options.length, 2, q.id);
    for (let i = 0; i < optionCount(q); i++) {
      for (const k of Object.keys(optionWeights(q, i))) assert.ok(ARCH[k], `${q.id} unknown pole ${k}`);
    }
  }
  for (const k of ARCH_ORDER) {
    assert.ok(QUESTIONS.some((q) => [...Array(optionCount(q)).keys()].some((i) => (optionWeights(q, i)[k] || 0) > 0)), `${k} reachable`);
  }
});

test('opposites are symmetric and 180° apart', () => {
  for (const k of ARCH_ORDER) {
    assert.equal(OPPOSITE[OPPOSITE[k]], k);
    const d = Math.abs(((ARCH[k].angle - ARCH[OPPOSITE[k]].angle) % 360 + 360) % 360);
    assert.equal(d, 180);
  }
});

test('share codes round-trip and reject garbage', () => {
  for (let i = 0; i < 2000; i++) {
    const a = randomAnswers();
    const code = encodeAnswers(a);
    assert.match(code, /^1[0-9a-z]+$/);
    assert.ok(code.length <= 14);
    assert.deepEqual(decodeCode(code), a);
  }
  for (const bad of ['', '2abc', '1', '1ZZZ', '1-abc', '1zzzzzzzzzzzzzzzzzzz', null, 42, '1abc def']) {
    assert.equal(decodeCode(bad), null, String(bad));
  }
  // digit 4 on a 2-option question must be rejected
  const a = QUESTIONS.map((q) => (q.type === 'versus' ? 0 : 0));
  const vi = QUESTIONS.findIndex((q) => q.type === 'versus');
  let n = 0n;
  a.forEach((v, i) => { n = n * 5n + BigInt(i === vi ? 4 : v); });
  assert.equal(decodeCode(`1${n.toString(36)}`), null);
  assert.throws(() => encodeAnswers(a.slice(1)));
});

test('scores are bounded and the dot stays inside the hexagon', () => {
  for (let i = 0; i < 1500; i++) {
    const r = analyze(i % 2 ? randomAnswers() : simulateAnswers(rnd), { bootstrap: 0 });
    for (const k of ARCH_ORDER) assert.ok(r.scores[k] >= 0 && r.scores[k] <= 1, `${k}=${r.scores[k]}`);
    const rad = Math.hypot(r.point.x, r.point.y);
    const theta = (Math.atan2(r.point.y, r.point.x) * 180) / Math.PI;
    assert.ok(rad <= hexRadius(theta) + 1e-9, 'inside hexagon');
    assert.ok(r.conviction >= 0 && r.conviction <= 1);
  }
});

test('the dot always sits in the wedge named by the title', () => {
  for (let i = 0; i < 3000; i++) {
    const r = analyze(simulateAnswers(rnd), { bootstrap: 0 });
    if (r.titleKey === 'O') continue;
    assert.equal(wedgeAt(r.point.x, r.point.y), r.primary, `${r.titleKey} at ${r.point.x},${r.point.y}`);
    assert.ok(r.titleKey.includes(r.primary));
    if (r.hybrid) assert.notEqual(OPPOSITE[r.primary], r.secondary, 'hybrids never pair opposites');
  }
});

test('pure players land on their own pole with high certainty', () => {
  for (const k of ARCH_ORDER) {
    const r = analyze(greedy(k));
    assert.equal(r.primary, k);
    assert.ok(r.confidence >= 0.9, `${k} confidence ${r.confidence}`);
    assert.ok(r.conviction >= 0.7, `${k} conviction ${r.conviction}`);
    assert.equal(r.integrity.masher, null, `${k} must not look like a button masher`);
  }
});

test('analysis is deterministic (identical bootstrap cloud on every device)', () => {
  const a = randomAnswers();
  assert.deepEqual(analyze(a).cloud, analyze(a).cloud);
  assert.equal(analyze(a).cloud.length, 160);
});

test('partial answers work for the live preview', () => {
  const a = new Array(QUESTIONS.length).fill(null);
  assert.equal(analyze(a, { damp: true }).conviction, 0);
  a[0] = 0; a[1] = 1;
  const r = analyze(a, { damp: true, bootstrap: 0 });
  assert.equal(r.answered, 2);
  assert.equal(r.complete, false);
});

test('integrity check flags mashing and fence-sitting', () => {
  const mash = QUESTIONS.map((q) => (q.type === 'spectrum' ? 2 : 0));
  const ic = integrityCheck(mash);
  assert.ok(ic.masher && ic.masher.slot === 0);
  assert.ok(ic.fenceSitter);
});

test('every title has copy and insights render for all 19 prints', () => {
  for (const key of Object.keys(TITLES)) assert.ok(key.length === 1 && key !== 'O' ? PROFILES[key] : HYBRIDS[key], key);
  const seen = new Set();
  for (let i = 0; i < 20000 && seen.size < Object.keys(TITLES).length; i++) {
    const r = analyze(i % 3 ? simulateAnswers(rnd) : randomAnswers(), { bootstrap: 20 });
    if (seen.has(r.titleKey)) continue;
    seen.add(r.titleKey);
    const ins = buildInsight(r);
    assert.ok(ins.paragraphs.length >= 3, r.titleKey);
    assert.ok(ins.paragraphs.every((p) => typeof p === 'string' && p.length > 20 && !p.includes('undefined')), r.titleKey);
    assert.equal(ins.headline, TITLES[r.titleKey]);
  }
  assert.equal(seen.size, Object.keys(TITLES).length, `saw ${[...seen].join(',')}`);
});
