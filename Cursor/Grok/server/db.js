import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openDatabase(dbFile) {
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const db = new DatabaseSync(dbFile);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 4000');
  migrate(db);
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  return db;
}

function userVersion(db) {
  const row = db.prepare('PRAGMA user_version').get();
  return Number(row?.user_version || 0);
}

function migrate(db) {
  if (userVersion(db) >= 1) return;
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    ) STRICT;

    CREATE TABLE results (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      share_slug TEXT NOT NULL UNIQUE,
      callsign TEXT NOT NULL,
      answers_json TEXT NOT NULL,
      profile_json TEXT NOT NULL,
      claim_token_hash TEXT,
      created_at INTEGER NOT NULL
    ) STRICT;

    CREATE INDEX idx_results_user ON results(user_id, created_at);
    CREATE INDEX idx_results_claim ON results(claim_token_hash, created_at);
    CREATE INDEX idx_sessions_user ON sessions(user_id);
  `);
  db.exec('PRAGMA user_version = 1');
}

export function get(db, sql, ...params) {
  return db.prepare(sql).get(...params);
}

export function all(db, sql, ...params) {
  return db.prepare(sql).all(...params);
}

export function run(db, sql, ...params) {
  return db.prepare(sql).run(...params);
}

export function transaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* already closed */ }
    throw err;
  }
}
