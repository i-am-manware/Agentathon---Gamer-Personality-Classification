// CLI: (re)create the demo save file. `node scripts/seed.js --force` wipes the
// database first (irreversible), otherwise it only seeds an empty one.

import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { config, ROOT } from '../server/lib/config.js';
import { createStore } from '../server/data/store.js';
import { createUserRepo } from '../server/repos/users.js';
import { createRunRepo } from '../server/repos/runs.js';
import { createRunService } from '../server/services/runService.js';
import { ensureSeed } from '../server/seed.js';

if (process.argv.includes('--force')) {
  const db = join(config.dataDir, 'db.json');
  if (existsSync(db)) rmSync(db);
}

const store = createStore(config.dataDir);
const userRepo = createUserRepo(store);
const runRepo = createRunRepo(store);
const runService = createRunService(runRepo);

const seeded = ensureSeed({ userRepo, runRepo, runService });
console.log(
  seeded
    ? `Seeded. Sign in as "${config.demoAccount.username}" / "${config.demoAccount.password}" (${join(ROOT, 'data')})`
    : 'Database already has users; nothing to seed. Use --force to wipe and reseed.'
);
