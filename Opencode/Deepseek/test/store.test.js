import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Database } from '../src/lib/store.js';

function tempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'psyche-store-'));
  return path.join(dir, 'psyche.json');
}

test('store creates, persists and reloads data', () => {
  const file = tempFile();
  const db = new Database(file).load();
  const user = db.addUser({ username: 'Tester', passHash: 'aa', salt: 'bb' });
  db.addSession('tok-1', user.id, 60_000);
  db.addAttempt({
    userId: user.id,
    answers: new Array(25).fill(0),
    result: { coord: { x: 0.1, y: 0.2, r: 0.22 }, dominant: 'duelist', scores: [] },
    quizVersion: 1
  });
  db.addFieldPoint({ x: 0.5, y: -0.2, a: 3 });
  db.countScan();
  db.saveSync();

  const reloaded = new Database(file).load();
  assert.equal(reloaded.userByName('tester').username, 'Tester');
  assert.equal(reloaded.userByName('TESTER').id, user.id);
  assert.equal(reloaded.session('tok-1').userId, user.id);
  assert.equal(reloaded.attemptsByUser(user.id).length, 1);
  assert.equal(reloaded.fieldPoints().length, 1);
  assert.equal(reloaded.stats().scans, 1);
});

test('expired sessions are purged on access and load', () => {
  const file = tempFile();
  const db = new Database(file).load();
  const user = db.addUser({ username: 'Ghost', passHash: 'aa', salt: 'bb' });
  db.addSession('expired', user.id, -1000);
  assert.equal(db.session('expired'), null);
  db.addSession('alive', user.id, 60_000);
  db.saveSync();
  const reloaded = new Database(file).load();
  assert.equal(reloaded.data.sessions.length, 1);
  assert.equal(reloaded.session('alive').userId, user.id);
});

test('deleting attempts is scoped to the owner', () => {
  const file = tempFile();
  const db = new Database(file).load();
  const a = db.addUser({ username: 'Alpha', passHash: 'aa', salt: 'bb' });
  const b = db.addUser({ username: 'Bravo', passHash: 'cc', salt: 'dd' });
  const attempt = db.addAttempt({
    userId: a.id,
    answers: [],
    result: { coord: {}, dominant: 'bard', scores: [] },
    quizVersion: 1
  });
  assert.equal(db.deleteAttempt(attempt.id, b.id), false);
  assert.equal(db.deleteAttempt(attempt.id, a.id), true);
  assert.equal(db.attemptsByUser(a.id).length, 0);
});

test('field points are capped and duplicate usernames are prevented by lookup', () => {
  const file = tempFile();
  const db = new Database(file).load();
  db.addUser({ username: 'Casey', passHash: 'aa', salt: 'bb' });
  assert.ok(db.userByName('casey'));
  assert.ok(db.userByName('CASEY'));
  for (let i = 0; i < 5100; i++) db.addFieldPoint({ x: 0, y: 0, a: i % 6 });
  assert.ok(db.fieldPoints().length <= 5000);
});

test('corrupt store files are backed up and replaced', () => {
  const file = tempFile();
  fs.writeFileSync(file, '{ not json at all');
  const db = new Database(file).load();
  assert.equal(db.data.users.length, 0);
  const backups = fs.readdirSync(path.dirname(file)).filter((f) => f.includes('corrupt'));
  assert.equal(backups.length, 1);
});
