// Cross-platform test runner: `node --test` + explicit file list (no shell globs,
// works on every Node version from 18 up).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../server/config.js';

const dir = path.join(ROOT, 'tests');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).map((f) => path.join(dir, f));
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status ?? 1);
