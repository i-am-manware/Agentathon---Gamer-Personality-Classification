// SQLite repository backed by Node's built-in `node:sqlite` (no native deps).
import fs from 'node:fs';
import path from 'node:path';
import { MIGRATIONS } from './migrations.js';

const rowToResult = (r) => r && ({
  publicId: r.public_id, userId: r.user_id, code: r.code, version: r.version,
  titleKey: r.title_key, primary: r.primary_id, x: r.x, y: r.y,
  scores: JSON.parse(r.scores), isSeed: !!r.is_seed, label: r.label || null, createdAt: r.created_at,
});

// node:sqlite prints an "ExperimentalWarning" on first load; silence just that one.
async function importSqlite() {
  const emit = process.emitWarning;
  process.emitWarning = (warning, ...rest) => {
    if (/SQLite/i.test(String(warning?.message ?? warning))) return;
    emit.call(process, warning, ...rest);
  };
  try { return await import('node:sqlite'); } finally { process.emitWarning = emit; }
}

export async function sqliteAvailable() {
  try { await importSqlite(); return true; } catch { return false; }
}

export async function openSqlite(dataDir) {
  const { DatabaseSync } = await importSqlite();
  fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, 'playerprint.db');
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 3000;');

  const tx = (fn) => {
    db.exec('BEGIN');
    try { const v = fn(); db.exec('COMMIT'); return v; } catch (e) { db.exec('ROLLBACK'); throw e; }
  };

  function migrate() {
    db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT, applied_at INTEGER)');
    const done = new Set(db.prepare('SELECT id FROM schema_migrations').all().map((r) => r.id));
    const applied = [];
    for (const m of MIGRATIONS) {
      if (done.has(m.id)) continue;
      tx(() => {
        db.exec(m.sql);
        db.prepare('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)').run(m.id, m.name, Date.now());
      });
      applied.push(m);
    }
    return applied;
  }
  migrate();

  const q = {
    insUser: db.prepare('INSERT INTO users (username, pass_hash, created_at) VALUES (?, ?, ?)'),
    userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
    userById: db.prepare('SELECT id, username, created_at FROM users WHERE id = ?'),
    insSession: db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'),
    session: db.prepare('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?'),
    delSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    purge: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),
    insResult: db.prepare(`INSERT INTO results (public_id, user_id, code, version, title_key, primary_id, x, y, scores, is_seed, created_at, label)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    byUser: db.prepare('SELECT * FROM results WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'),
    byPublic: db.prepare('SELECT * FROM results WHERE public_id = ?'),
    delResult: db.prepare('DELETE FROM results WHERE public_id = ? AND user_id = ?'),
    label: db.prepare('UPDATE results SET label = ? WHERE public_id = ? AND user_id = ?'),
    count: db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(is_seed), 0) AS seeded FROM results'),
    titles: db.prepare('SELECT title_key AS k, COUNT(*) AS n FROM results GROUP BY title_key'),
    grid: db.prepare(`SELECT MIN(:bins - 1, CAST((x + 1) / 2 * :bins AS INTEGER)) AS bx,
                             MIN(:bins - 1, CAST((1 - y) / 2 * :bins AS INTEGER)) AS by,
                             COUNT(*) AS n
                      FROM results GROUP BY bx, by`),
    recentDup: db.prepare('SELECT public_id FROM results WHERE code = ? AND user_id IS ? AND created_at > ? LIMIT 1'),
    claim: db.prepare('UPDATE results SET user_id = ? WHERE public_id = ? AND code = ? AND user_id IS NULL AND is_seed = 0 AND created_at > ?'),
  };

  return {
    kind: 'sqlite',
    file,
    migrate,
    transaction: tx,
    createUser(username, passHash) {
      const info = q.insUser.run(username, passHash, Date.now());
      return { id: Number(info.lastInsertRowid), username };
    },
    findUserByName: (u) => q.userByName.get(u) || null,
    findUserById: (id) => q.userById.get(id) || null,
    createSession: (h, userId, exp) => q.insSession.run(h, userId, Date.now(), exp),
    findSession: (h) => q.session.get(h) || null,
    deleteSession: (h) => q.delSession.run(h),
    purgeSessions: () => q.purge.run(Date.now()).changes,
    insertResult(r) {
      q.insResult.run(r.publicId, r.userId ?? null, r.code, r.version, r.titleKey, r.primary, r.x, r.y,
        JSON.stringify(r.scores), r.isSeed ? 1 : 0, r.createdAt ?? Date.now(), r.label ?? null);
      return r;
    },
    findRecentDuplicate: (code, userId, since) => q.recentDup.get(code, userId ?? null, since)?.public_id || null,
    getResult: (pid) => rowToResult(q.byPublic.get(pid)),
    claimResult: (pid, code, userId, since) => q.claim.run(userId, pid, code, since).changes > 0,
    listResultsByUser: (userId, limit = 100) => q.byUser.all(userId, limit).map(rowToResult),
    deleteResult: (pid, userId) => q.delResult.run(pid, userId).changes > 0,
    labelResult: (pid, userId, label) => q.label.run(label, pid, userId).changes > 0,
    stats(bins) {
      const { n, seeded } = q.count.get();
      const titles = Object.fromEntries(q.titles.all().map((r) => [r.k, r.n]));
      const grid = q.grid.all({ bins }).map((r) => [r.bx, r.by, r.n]);
      return { total: n, seeded, titles, grid };
    },
    close: () => db.close(),
  };
}
