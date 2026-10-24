import { QUESTIONS, QUIZ_VERSION } from '../../shared/quiz.data.js';
import { validateAnswers } from './scoring.js';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

function checksum(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ALPHABET[h % 36] + ALPHABET[Math.floor(h / 36) % 36];
}

export function encodeAnswers(answers) {
  if (!validateAnswers(answers)) throw new Error('invalid answers');
  const version = ALPHABET[QUIZ_VERSION % 36];
  const body = answers.map((a) => ALPHABET[a]).join('');
  const payload = version + body;
  return payload + checksum(payload);
}

export function decodeCode(code) {
  if (typeof code !== 'string') return { ok: false, error: 'missing' };
  const clean = code.trim().toLowerCase();
  const expected = QUESTIONS.length + 3;
  if (clean.length !== expected) return { ok: false, error: 'length' };
  const payload = clean.slice(0, -2);
  if (checksum(payload) !== clean.slice(-2)) return { ok: false, error: 'checksum' };
  const version = ALPHABET.indexOf(payload[0]);
  if (version !== QUIZ_VERSION % 36) return { ok: false, error: 'version' };
  const answers = [];
  for (let i = 0; i < QUESTIONS.length; i++) {
    const idx = ALPHABET.indexOf(payload[i + 1]);
    if (idx < 0 || idx >= QUESTIONS[i].options.length) return { ok: false, error: 'range' };
    answers.push(idx);
  }
  return { ok: true, answers, version };
}
