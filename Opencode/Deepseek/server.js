import path from 'node:path';
import { config } from './src/config.js';
import { createApp } from './src/app.js';

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';

const { server, db, seeded } = await createApp(config, {
  log(level, data) {
    if (level === 'error') {
      console.error(`${RED}[error]${RESET}`, data);
      return;
    }
    const color = data.status >= 500 ? RED : data.status >= 400 ? YELLOW : GREEN;
    console.log(
      `${DIM}${new Date().toLocaleTimeString()}${RESET} ${color}${data.status}${RESET} ${data.method} ${data.path} ${DIM}${data.ms.toFixed(1)}ms ${data.ip}${RESET}`
    );
  }
});

let port = config.port;
let attempts = 0;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && attempts < 10) {
    console.log(`${YELLOW}[port]${RESET} ${port} is busy, trying ${port + 1}...`);
    port += 1;
    attempts += 1;
    server.listen(port, config.host);
  } else {
    console.error(`${RED}[fatal]${RESET}`, err.message);
    process.exit(1);
  }
});

server.listen(port, config.host, () => {
  const line = '='.repeat(58);
  console.log(`\n${CYAN}${line}${RESET}`);
  console.log(`  ${GREEN}PIXEL PSYCHE${RESET} ${DIM}// player DNA scanner // zero dependencies${RESET}`);
  console.log(`${CYAN}${line}${RESET}`);
  console.log(`  ${DIM}local:${RESET}   http://localhost:${port}`);
  console.log(`  ${DIM}data:${RESET}    ${path.join(config.dataDir, 'psyche.json')}`);
  if (seeded.field) console.log(`  ${DIM}seed:${RESET}    ghost field charted (${db.fieldPoints().length} synthetic scans)`);
  if (seeded.demo) console.log(`  ${DIM}demo:${RESET}    ${config.demoUser.username} / ${config.demoUser.password} (archive + compare)`);
  console.log(`${CYAN}${line}${RESET}\n`);
});

function shutdown() {
  console.log(`\n${DIM}[psyche] flushing data and powering down...${RESET}`);
  try {
    db.saveSync();
  } catch (err) {
    console.error(`${RED}[store]${RESET} final flush failed:`, err.message);
  }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
