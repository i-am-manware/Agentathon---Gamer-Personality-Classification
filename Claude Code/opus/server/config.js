import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Optional `.env` file (KEY=VALUE lines). Real environment variables win.
try {
  const text = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* no .env — defaults apply */ }

const env = process.env;
export const config = {
  port: Number(env.PORT) || 3000,
  host: env.HOST || '0.0.0.0',
  // Where the SQLite file (or JSON fallback) lives.
  dataDir: path.resolve(ROOT, env.DATA_DIR || 'data'),
  // 'sqlite' | 'json' | 'auto' (auto = sqlite when node:sqlite is available).
  store: env.STORE || 'auto',
  // Set to 1 when served over HTTPS so the session cookie gets `Secure`.
  secureCookies: env.SECURE_COOKIES === '1',
  sessionDays: Number(env.SESSION_DAYS) || 30,
  // Seed simulated players + the demo account on first boot.
  seedOnBoot: env.SEED !== '0',
  seedPlayers: Number(env.SEED_PLAYERS) || 640,
  publicUrl: env.PUBLIC_URL || '',
};
