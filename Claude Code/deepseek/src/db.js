/**
 * SPAWNPOINT — storage.
 *
 * Two drivers, one interface:
 *
 *   - `sqlite`  (default) uses Node's built-in `node:sqlite` module. No npm
 *     package, no native build step, real SQL, real indexes. Node 22.5+.
 *   - `json`    a dependency-free fallback for older Node runtimes: the same
 *     tables held in memory and flushed atomically to disk.
 *
 * The app never talks to a driver directly; it talks to this module. That is
 * what makes the fallback a genuine guarantee rather than a promise in a README.
 *
 * ---------------------------------------------------------------------------
 * SCHEMA
 * ---------------------------------------------------------------------------
 * users      id, username (unique, case-insensitive), display_name,
 *            password_hash (scrypt), password_salt, created_at, last_seen_at
 * sessions   token_hash (pk), user_id -> users.id, created_at, expires_at
 * attempts   id (public, random), user_id -> users.id (nullable: anonymous
 *            playthroughs are kept, with no identifying data), answers (encoded),
 *            x, y, radius, heading, primary_key, affinities (json),
 *            score_version, signature, duration_ms, source ('player'|'seed'),
 *            created_at
 *
 * Indexes on attempts(user_id, created_at DESC) and attempts(primary_key).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import config from './config.js';

const require = createRequire(import.meta.url);

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

export const SCHEMA_VERSION = 1;

/** URL-safe random id. Used for public attempt ids and session tokens. */
export function randomId(bytes = 9) {
  return crypto.randomBytes(bytes).toString('base64url');
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeAttempt(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id ?? null,
    answers: row.answers,
    x: row.x,
    y: row.y,
    radius: row.radius,
    heading: row.heading,
    primary: row.primary_key,
    affinities: safeJson(row.affinities, {}),
    scoreVersion: row.score_version,
    signature: row.signature,
    durationMs: row.duration_ms ?? null,
    source: row.source,
    createdAt: row.created_at,
  };
}

function safeJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/* -------------------------------------------------------------------------- */
/* SQLite driver                                                               */
/* -------------------------------------------------------------------------- */

function openSqlite(file) {
  // Imported lazily so the fallback works on runtimes without node:sqlite.
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_seen_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      answers TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      radius REAL NOT NULL,
      heading INTEGER NOT NULL,
      primary_key TEXT NOT NULL,
      affinities TEXT NOT NULL,
      score_version INTEGER NOT NULL,
      signature TEXT NOT NULL,
      duration_ms INTEGER,
      source TEXT NOT NULL DEFAULT 'player',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_attempts_primary ON attempts(primary_key);
    CREATE INDEX IF NOT EXISTS idx_attempts_created ON attempts(created_at DESC);
  `);
  return db;
}

/* -------------------------------------------------------------------------- */
/* JSON driver                                                                 */
/* -------------------------------------------------------------------------- */

function openJson(file) {
  const empty = { schemaVersion: SCHEMA_VERSION, users: [], sessions: [], attempts: [], meta: {} };
  let state = empty;
  if (fs.existsSync(file)) {
    state = { ...empty, ...safeJson(fs.readFileSync(file, 'utf8'), {}) };
    state.users = state.users || [];
    state.sessions = state.sessions || [];
    state.attempts = state.attempts || [];
    state.meta = state.meta || {};
  }
  let writeTimer = null;
  const flush = () => {
    writeTimer = null;
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, file); // atomic on both POSIX and NTFS
  };
  const save = () => {
    if (writeTimer) return;
    writeTimer = setTimeout(flush, 40);
    if (writeTimer.unref) writeTimer.unref();
  };
  const flushNow = () => {
    if (writeTimer) clearTimeout(writeTimer);
    flush();
  };
  return { state, save, flushNow, file };
}

/* -------------------------------------------------------------------------- */
/* Driver implementations                                                      */
/* -------------------------------------------------------------------------- */

class SqliteStore {
  constructor(file) {
    this.driver = 'sqlite';
    this.db = openSqlite(file);
    this.nextUserId = this.#scalar('SELECT COALESCE(MAX(id), 0) + 1 AS n FROM users', 'n', 1);
  }

  #scalar(sql, key, fallback) {
    const row = this.db.prepare(sql).get();
    return row ? row[key] ?? fallback : fallback;
  }

  getMeta(key, fallback = null) {
    const row = this.db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
    return row ? row.value : fallback;
  }

  setMeta(key, value) {
    this.db
      .prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, String(value));
  }

  createUser({ username, displayName, passwordHash, passwordSalt }) {
    const info = this.db
      .prepare(
        `INSERT INTO users (username, display_name, password_hash, password_salt, created_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(username, displayName, passwordHash, passwordSalt, nowIso(), nowIso());
    return this.getUser(Number(info.lastInsertRowid));
  }

  getUser(id) {
    const row = this.db
      .prepare('SELECT id, username, display_name, created_at, last_seen_at FROM users WHERE id = ?')
      .get(id);
    return row ? mapUser(row) : null;
  }

  findUserByUsername(username) {
    return this.db
      .prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE')
      .get(username);
  }

  touchUser(id) {
    this.db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(nowIso(), id);
  }

  countUsers() {
    return this.#scalar('SELECT COUNT(*) AS n FROM users', 'n', 0);
  }

  createSession({ tokenHash, userId, expiresAt }) {
    this.db
      .prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(tokenHash, userId, nowIso(), expiresAt);
  }

  getSession(tokenHash) {
    const row = this.db
      .prepare('SELECT token_hash, user_id, expires_at FROM sessions WHERE token_hash = ?')
      .get(tokenHash);
    return row ? { tokenHash: row.token_hash, userId: row.user_id, expiresAt: row.expires_at } : null;
  }

  deleteSession(tokenHash) {
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }

  deleteSessionsForUser(userId) {
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  purgeExpiredSessions() {
    const info = this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(nowIso());
    return Number(info.changes || 0);
  }

  insertAttempt(row) {
    this.db
      .prepare(
        `INSERT INTO attempts
           (id, user_id, answers, x, y, radius, heading, primary_key, affinities,
            score_version, signature, duration_ms, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        row.id,
        row.user_id ?? null,
        row.answers,
        row.x,
        row.y,
        row.radius,
        row.heading,
        row.primary_key,
        row.affinities,
        row.score_version,
        row.signature,
        row.duration_ms ?? null,
        row.source ?? 'player',
        row.created_at ?? nowIso(),
      );
    return this.getAttempt(row.id);
  }

  getAttempt(id) {
    return normalizeAttempt(this.db.prepare('SELECT * FROM attempts WHERE id = ?').get(id));
  }

  listAttemptsByUser(userId, limit = 50) {
    return this.db
      .prepare('SELECT * FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(userId, limit)
      .map(normalizeAttempt);
  }

  deleteAttempt(id, userId) {
    const info = this.db.prepare('DELETE FROM attempts WHERE id = ? AND user_id = ?').run(id, userId);
    return Number(info.changes || 0) > 0;
  }

  deleteAllAttempts() {
    const before = this.countAttempts();
    this.db.exec('DELETE FROM attempts');
    return before;
  }

  claimAttempt(id, userId) {
    const info = this.db
      .prepare('UPDATE attempts SET user_id = ? WHERE id = ? AND user_id IS NULL')
      .run(userId, id);
    return Number(info.changes || 0) > 0;
  }

  archetypeCounts() {
    const rows = this.db
      .prepare('SELECT primary_key AS k, COUNT(*) AS n FROM attempts GROUP BY primary_key')
      .all();
    return Object.fromEntries(rows.map((r) => [r.k, Number(r.n)]));
  }

  countAttempts() {
    return this.#scalar('SELECT COUNT(*) AS n FROM attempts', 'n', 0);
  }

  populationSample(limit) {
    // Reservoir-ish: take a deterministic, evenly spread slice rather than the
    // newest N, so the plane does not just show whatever happened last.
    const total = this.countAttempts();
    const step = total > limit ? Math.ceil(total / limit) : 1;
    const rows = this.db
      .prepare(
        `SELECT id, x, y, primary_key, source, created_at FROM attempts
         WHERE (rowid % ?) = 0 ORDER BY rowid LIMIT ?`,
      )
      .all(step, limit);
    return rows.map((r) => ({
      id: r.id,
      x: r.x,
      y: r.y,
      primary: r.primary_key,
      source: r.source,
      createdAt: r.created_at,
    }));
  }

  close() {
    try {
      this.db.close();
    } catch {
      /* already closed */
    }
  }
}

class JsonStore {
  constructor(file) {
    this.driver = 'json';
    this.j = openJson(file);
    this.nextUserId = this.j.state.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
  }

  getMeta(key, fallback = null) {
    return this.j.state.meta[key] ?? fallback;
  }

  setMeta(key, value) {
    this.j.state.meta[key] = String(value);
    this.j.save();
  }

  createUser({ username, displayName, passwordHash, passwordSalt }) {
    const user = {
      id: this.nextUserId++,
      username,
      display_name: displayName || username,
      password_hash: passwordHash,
      password_salt: passwordSalt,
      created_at: nowIso(),
      last_seen_at: nowIso(),
    };
    this.j.state.users.push(user);
    this.j.save();
    return mapUser(user);
  }

  getUser(id) {
    return mapUser(this.j.state.users.find((u) => u.id === id));
  }

  findUserByUsername(username) {
    const needle = String(username).toLowerCase();
    return this.j.state.users.find((u) => u.username.toLowerCase() === needle) || undefined;
  }

  touchUser(id) {
    const u = this.j.state.users.find((x) => x.id === id);
    if (u) {
      u.last_seen_at = nowIso();
      this.j.save();
    }
  }

  countUsers() {
    return this.j.state.users.length;
  }

  createSession({ tokenHash, userId, expiresAt }) {
    this.j.state.sessions.push({ token_hash: tokenHash, user_id: userId, created_at: nowIso(), expires_at: expiresAt });
    this.j.save();
  }

  getSession(tokenHash) {
    const s = this.j.state.sessions.find((x) => x.token_hash === tokenHash);
    return s ? { tokenHash: s.token_hash, userId: s.user_id, expiresAt: s.expires_at } : null;
  }

  deleteSession(tokenHash) {
    this.j.state.sessions = this.j.state.sessions.filter((s) => s.token_hash !== tokenHash);
    this.j.save();
  }

  deleteSessionsForUser(userId) {
    this.j.state.sessions = this.j.state.sessions.filter((s) => s.user_id !== userId);
    this.j.save();
  }

  purgeExpiredSessions() {
    const now = nowIso();
    const before = this.j.state.sessions.length;
    this.j.state.sessions = this.j.state.sessions.filter((s) => s.expires_at >= now);
    const removed = before - this.j.state.sessions.length;
    if (removed) this.j.save();
    return removed;
  }

  insertAttempt(row) {
    const record = {
      id: row.id,
      user_id: row.user_id ?? null,
      answers: row.answers,
      x: row.x,
      y: row.y,
      radius: row.radius,
      heading: row.heading,
      primary_key: row.primary_key,
      affinities: row.affinities,
      score_version: row.score_version,
      signature: row.signature,
      duration_ms: row.duration_ms ?? null,
      source: row.source ?? 'player',
      created_at: row.created_at ?? nowIso(),
    };
    this.j.state.attempts.push(record);
    this.j.save();
    return normalizeAttempt(record);
  }

  getAttempt(id) {
    return normalizeAttempt(this.j.state.attempts.find((a) => a.id === id));
  }

  listAttemptsByUser(userId, limit = 50) {
    return this.j.state.attempts
      .filter((a) => a.user_id === userId)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, limit)
      .map(normalizeAttempt);
  }

  deleteAttempt(id, userId) {
    const before = this.j.state.attempts.length;
    this.j.state.attempts = this.j.state.attempts.filter((a) => !(a.id === id && a.user_id === userId));
    const removed = before !== this.j.state.attempts.length;
    if (removed) this.j.save();
    return removed;
  }

  archetypeCounts() {
    const out = {};
    for (const a of this.j.state.attempts) out[a.primary_key] = (out[a.primary_key] || 0) + 1;
    return out;
  }

  deleteAllAttempts() {
    const before = this.j.state.attempts.length;
    this.j.state.attempts = [];
    this.j.save();
    return before;
  }

  claimAttempt(id, userId) {
    const a = this.j.state.attempts.find((x) => x.id === id && x.user_id === null);
    if (!a) return false;
    a.user_id = userId;
    this.j.save();
    return true;
  }

  countAttempts() {
    return this.j.state.attempts.length;
  }

  populationSample(limit) {
    const all = this.j.state.attempts;
    const step = all.length > limit ? Math.ceil(all.length / limit) : 1;
    const out = [];
    for (let i = 0; i < all.length && out.length < limit; i += step) {
      const a = all[i];
      out.push({ id: a.id, x: a.x, y: a.y, primary: a.primary_key, source: a.source, createdAt: a.created_at });
    }
    return out;
  }

  close() {
    this.j.flushNow();
  }
}

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name || row.username,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

function open() {
  try {
    const store = new SqliteStore(config.dbFile);
    return { store, notes: [`sqlite (node:sqlite) -> ${path.relative(process.cwd(), config.dbFile)}`] };
  } catch (err) {
    const store = new JsonStore(config.jsonFile);
    return {
      store,
      notes: [
        `node:sqlite unavailable (${err.message.split('\n')[0]}); falling back to the JSON driver.`,
        `json -> ${path.relative(process.cwd(), config.jsonFile)}`,
      ],
    };
  }
}

const { store, notes } = open();

export const db = store;
export const dbNotes = notes;

// A session sweep at boot and hourly thereafter. Cheap, and keeps the sessions
// table from growing forever on a long-running deployment.
try {
  db.purgeExpiredSessions();
  const timer = setInterval(() => {
    try {
      db.purgeExpiredSessions();
    } catch {
      /* non-fatal */
    }
  }, 60 * 60 * 1000);
  if (timer.unref) timer.unref();
} catch {
  /* non-fatal */
}

export default db;
