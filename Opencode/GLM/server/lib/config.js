import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(here, '..', '..');

const env = process.env;

function resolveSecret() {
  const fromEnv = env.SESSION_SECRET;
  if (typeof fromEnv === 'string' && fromEnv.length >= 16) {
    return { value: fromEnv, generated: false };
  }
  const file = join(env.DATA_DIR ? resolve(env.DATA_DIR) : join(ROOT, 'data'), 'secret.key');
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file)) {
    const value = readFileSync(file, 'utf8').trim();
    if (value.length >= 16) return { value, generated: false };
  }
  const value = randomBytes(48).toString('hex');
  writeFileSync(file, value + '\n', { encoding: 'utf8' });
  return { value, generated: true };
}

export const config = {
  env: env.NODE_ENV || 'production',
  host: env.HOST || '0.0.0.0',
  port: Number(env.PORT) || 3000,
  dataDir: env.DATA_DIR ? resolve(env.DATA_DIR) : join(ROOT, 'data'),
  logFormat: env.LOG_FORMAT === 'json' ? 'json' : 'text',
  sessionSecret: resolveSecret(),
  sessionTtlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  maxRunsPerUser: 100,
  demoAccount: { username: 'demo', password: 'demo1234' },
};
