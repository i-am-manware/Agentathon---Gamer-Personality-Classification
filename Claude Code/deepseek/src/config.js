/**
 * Runtime configuration.
 *
 * Everything has a working default, so `npm start` on a fresh clone does the
 * right thing with zero setup. Nothing here requires a paid service or a key.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');

/** Minimal .env loader (no dependency). Real env vars always win. */
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv(path.join(ROOT, '.env'));

const dataDir = path.resolve(ROOT, process.env.DATA_DIR || 'data');
fs.mkdirSync(dataDir, { recursive: true });

/**
 * Session secret. If the operator does not supply one we generate a strong
 * random secret and persist it, so sessions survive a restart without anybody
 * having to configure anything. SESSION_SECRET always takes precedence.
 */
function resolveSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return { secret: process.env.SESSION_SECRET, generated: false };
  }
  const file = path.join(dataDir, 'session-secret');
  try {
    if (fs.existsSync(file)) {
      const existing = fs.readFileSync(file, 'utf8').trim();
      if (existing.length >= 32) return { secret: existing, generated: false };
    }
    const fresh = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(file, fresh, { mode: 0o600 });
    return { secret: fresh, generated: true };
  } catch {
    // Read-only filesystem: fall back to an ephemeral secret. Sessions will not
    // survive a restart, but the app still works.
    return { secret: crypto.randomBytes(32).toString('hex'), generated: true, ephemeral: true };
  }
}

const { secret, generated, ephemeral } = resolveSecret();

export const config = {
  port: Number(process.env.PORT || 4321),
  host: process.env.HOST || '127.0.0.1',
  dataDir,
  dbFile: path.join(dataDir, 'spawnpoint.db'),
  jsonFile: path.join(dataDir, 'spawnpoint.json'),
  sessionSecret: secret,
  sessionGenerated: generated,
  sessionEphemeral: Boolean(ephemeral),
  sessionTtlDays: Number(process.env.SESSION_TTL_DAYS || 30),
  /** Seed a synthetic population on first boot so the plane is never empty. */
  seedPopulation: process.env.SEED_POPULATION !== 'false',
  seedSize: Number(process.env.SEED_SIZE || 900),
  /** Hard cap on how many stored attempts a single share page will plot. */
  populationSampleLimit: 2400,
  publicDir: path.join(ROOT, 'public'),
  sharedDir: path.join(ROOT, 'shared'),
  isProd: process.env.NODE_ENV === 'production',
  version: '1.0.0',
};

export default config;
