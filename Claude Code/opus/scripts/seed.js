// Seeds simulated players + the demo account. `--reset` wipes the data dir first.
import fs from 'node:fs';
import { config } from '../server/config.js';
import { openStore } from '../server/db/index.js';
import { seed } from '../server/seed.js';

if (process.argv.includes('--reset')) {
  fs.rmSync(config.dataDir, { recursive: true, force: true });
  console.log(`[seed] reset ${config.dataDir}`);
}
const store = await openStore(config);
await seed(store, { players: config.seedPlayers });
store.close();
