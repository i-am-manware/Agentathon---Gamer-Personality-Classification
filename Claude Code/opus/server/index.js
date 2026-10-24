import { config } from './config.js';
import { openStore } from './db/index.js';
import { createApp } from './app.js';
import { seedIfEmpty } from './seed.js';

const store = await openStore(config);
if (config.seedOnBoot) await seedIfEmpty(store, { players: config.seedPlayers });

const { server } = createApp({ store, config });
server.listen(config.port, config.host, () => {
  const shown = config.host === '0.0.0.0' ? 'localhost' : config.host;
  console.log(`\n  ▲ PLAYERPRINT is live → http://${shown}:${config.port}\n    store: ${store.kind} (${store.file})\n`);
});

const purge = setInterval(() => store.purgeSessions(), 3600_000);
purge.unref();

const shutdown = (sig) => {
  console.log(`\n[${sig}] shutting down…`);
  server.close(() => { store.close(); process.exit(0); });
  setTimeout(() => process.exit(0), 2000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
