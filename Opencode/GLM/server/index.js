// SPAWNPOINT server entrypoint. Zero npm dependencies — plain node:http.

import http from 'node:http';
import { join } from 'node:path';
import { config, ROOT } from './lib/config.js';
import { initLogger, log } from './lib/logger.js';
import { createStore } from './data/store.js';
import { createUserRepo } from './repos/users.js';
import { createRunRepo } from './repos/runs.js';
import { createAuthService } from './services/authService.js';
import { createRunService } from './services/runService.js';
import { registerApiRoutes } from './routes/api.js';
import { serveStatic, securityHeaders } from './static.js';
import { createRouter } from './lib/router.js';
import { RateLimiter } from './lib/ratelimit.js';
import { sendError } from './lib/http.js';
import { ensureSeed } from './seed.js';

initLogger(config.logFormat);

const store = createStore(config.dataDir);
const userRepo = createUserRepo(store);
const runRepo = createRunRepo(store);
const authService = createAuthService(userRepo, config);
const runService = createRunService(runRepo);

const router = createRouter();
const limits = {
  auth: new RateLimiter(12, 5 * 60 * 1000),
  writes: new RateLimiter(60, 60 * 1000),
  general: new RateLimiter(300, 60 * 1000),
};
registerApiRoutes(router, { authService, runService, limits });

ensureSeed({ userRepo, runRepo, runService });

const staticEnv = {
  rootPublic: join(ROOT, 'public'),
  rootShared: join(ROOT, 'shared'),
  indexFile: join(ROOT, 'public', 'index.html'),
};

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://internal').pathname);
  } catch {
    pathname = req.url.split('?')[0];
  }
  securityHeaders(res);

  try {
    if (pathname.startsWith('/api/') || pathname === '/api') {
      const general = limits.general.check(`${req.socket.remoteAddress}:${req.method}:${pathname}`);
      if (!general.ok) {
        res.setHeader('Retry-After', String(general.retryAfterSec));
        sendError(res, 429, 'rate_limited', `easy there — retry in ${general.retryAfterSec}s`);
      } else {
        const match = router.match(req.method, pathname);
        if (!match) {
          sendError(res, 404, 'not_found', 'no such endpoint — see README for the API map');
        } else {
          await match.handler(req, res, match.params);
        }
      }
    } else {
      serveStatic(staticEnv, req, res, pathname);
    }
  } catch (err) {
    log('error', `request failed: ${req.method} ${pathname}`, err);
    if (!res.headersSent) {
      if (pathname.startsWith('/api/')) {
        sendError(res, 500, 'internal', 'something broke on our side (it was logged)');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 — module fault. Check the server console.');
      }
    } else {
      res.end();
    }
  } finally {
    log('info', `${req.method} ${pathname} → ${res.statusCode} ${Date.now() - started}ms`);
  }
});

server.listen(config.port, config.host, () => {
  const url = `http://localhost:${config.port}`;
  const lines = [
    '',
    '  +----------------------------------------------------------+',
    '  |   S P A W N P O I N T  --  gamer personality diagnostic  |',
    '  +----------------------------------------------------------+',
    `  > listening   ${url}  (${config.host}:${config.port})`,
    `  > data        ${config.dataDir}`,
    `  > demo login  ${config.demoAccount.username} / ${config.demoAccount.password}`,
    '  > deps        zero (0) npm dependencies - plain Node',
    `  > mode        ${config.env}${config.sessionSecret.generated ? ' (auto-generated session secret - set SESSION_SECRET in real deployments)' : ''}`,
    '  > stop        Ctrl+C',
    '',
  ];
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    // eslint-disable-next-line no-console
    console.log(`\n[shutdown] ${signal} received — closing server…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}
