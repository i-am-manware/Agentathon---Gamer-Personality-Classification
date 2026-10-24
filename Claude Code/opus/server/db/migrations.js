// Ordered, append-only schema migrations. Each runs once inside a transaction
// and is recorded in `schema_migrations`.
export const MIGRATIONS = [
  {
    id: 1,
    name: 'initial schema',
    sql: `
      CREATE TABLE users (
        id          INTEGER PRIMARY KEY,
        username    TEXT NOT NULL UNIQUE COLLATE NOCASE,
        pass_hash   TEXT NOT NULL,
        created_at  INTEGER NOT NULL
      );
      CREATE TABLE sessions (
        token_hash  TEXT PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at  INTEGER NOT NULL,
        expires_at  INTEGER NOT NULL
      );
      CREATE INDEX sessions_user ON sessions(user_id);
      CREATE INDEX sessions_expiry ON sessions(expires_at);

      -- One row per completed run. The share code is the canonical record
      -- (answers packed base-5); the derived columns exist for fast listing
      -- and population statistics without re-scoring.
      CREATE TABLE results (
        id          INTEGER PRIMARY KEY,
        public_id   TEXT NOT NULL UNIQUE,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        code        TEXT NOT NULL,
        version     INTEGER NOT NULL,
        title_key   TEXT NOT NULL,
        primary_id  TEXT NOT NULL,
        x           REAL NOT NULL,
        y           REAL NOT NULL,
        scores      TEXT NOT NULL,
        is_seed     INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL
      );
      CREATE INDEX results_user ON results(user_id, created_at DESC);
      CREATE INDEX results_title ON results(title_key);
    `,
  },
  {
    id: 2,
    name: 'display name for runs',
    sql: `ALTER TABLE results ADD COLUMN label TEXT;`,
  },
];
