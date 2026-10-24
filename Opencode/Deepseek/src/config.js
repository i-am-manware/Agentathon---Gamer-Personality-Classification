import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  root,
  publicDir: path.join(root, 'public'),
  dataDir: process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(root, 'data'),
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || undefined,
  sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
  cookieSecure: process.env.COOKIE_SECURE === '1',
  trustProxy: process.env.TRUST_PROXY === '1',
  demoUser: { username: 'PLAYER1', password: 'arcade123' }
};