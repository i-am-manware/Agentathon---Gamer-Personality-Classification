// Applies pending schema migrations. (The server also migrates on boot.)
import { config } from '../server/config.js';
import { openStore } from '../server/db/index.js';
import { MIGRATIONS } from '../server/db/migrations.js';

const store = await openStore(config);
// openStore already ran migrate(); a second call reports nothing new unless raced.
store.migrate();
console.log(`[migrate] ${store.kind} store at ${store.file} is at schema v${MIGRATIONS.at(-1).id}`);
store.close();
