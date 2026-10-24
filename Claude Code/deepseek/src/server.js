/**
 * SPAWNPOINT — HTTP server.
 *
 * Zero npm dependencies. `node src/server.js` and you are running.
 *
 * Routing order:
 *   1. /api/*   -> JSON API (src/routes.js)
 *   2. /shared/* -> the ES modules shared verbatim between browser and server
 *   3. /         -> static files from public/, with an SPA fallback to index.html
 */

import http from 'node:http';
import path from 'node:path';
import config from './config.js';
import db, { dbNotes } from './db.js';
import { router } from './routes.js';
import { sendJson, sendText, serveStatic } from './http.js';
import { ensureSeedPopulation } from '../scripts/seed.js';
import { QUESTIONS } from '../shared/questions.js';
import { SCORE_VERSION } from '../shared/scoring.js';

const startedAt = Date.now();

/* -------------------------------------------------------------------------- */
/* Request handling                                                            */
/* -------------------------------------------------------------------------- */

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Security headers. The share card is drawn on a canvas from local data, so
  // there is no reason to allow third-party origins anywhere in this app.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "font-src 'self'",
      "base-uri 'none'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
  );

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { Allow: 'GET, POST, DELETE, OPTIONS' });
    return res.end();
  }

  // 1. API
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    const matched = router.match(req.method, pathname);
    if (matched) {
      try {
        await matched.handler(req, res, matched.params, url);
      } catch (err) {
        const status = err.status || 500;
        if (status >= 500) console.error('[spawnpoint] handler error:', err);
        if (!res.headersSent) {
          sendJson(res, status, { error: status >= 500 ? 'Something broke on our side.' : err.message });
        } else {
          res.end();
        }
      }
      return;
    }
    if (router.hasPath(pathname)) {
      return sendJson(res, 405, { error: `${req.method} is not allowed here.` }, { Allow: 'GET, POST, DELETE' });
    }
    return sendJson(res, 404, { error: 'No such endpoint.' });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendText(res, 405, 'Method not allowed');
  }

  // 2. Shared modules (the same files the server imports).
  if (pathname.startsWith('/shared/')) {
    if (serveStatic(req, res, config.sharedDir, pathname.slice('/shared'.length))) return;
    return sendText(res, 404, 'Not found');
  }

  // 3. Static frontend.
  if (serveStatic(req, res, config.publicDir, pathname)) return;

  // SPA fallback: anything else gets the app shell, which routes client-side.
  if (!path.extname(pathname) && serveStatic(req, res, config.publicDir, '/index.html')) return;

  return sendText(res, 404, 'Not found');
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error('[spawnpoint] unhandled:', err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal error' });
    else res.end();
  });
});

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log('');
  console.log('  ███████╗██████╗  █████╗ ██╗    ██╗███╗   ██╗██████╗  ██████╗ ██╗███╗   ██╗████████╗');
  console.log('  ██╔════╝██╔══██╗██╔══██╗██║    ██║████╗  ██║██╔══██╗██╔═══██╗██║████╗  ██║╚══██╔══╝');
  console.log('  ███████╗██████╔╝███████║██║ █╗ ██║██╔██╗ ██║██████╔╝██║   ██║██║██╔██╗ ██║   ██║   ');
  console.log('  ╚════██║██╔═══╝ ██╔══██║██║███╗██║██║╚██╗██║██╔═══╝ ██║   ██║██║██║╚██╗██║   ██║   ');
  console.log('  ███████║██║     ██║  ██║╚███╔███╔╝██║ ╚████║██║     ╚██████╔╝██║██║ ╚████║   ██║   ');
  console.log('  ╚══════╝╚═╝     ╚═╝  ╚═╝ ╚══╝╚══╝ ╚═╝  ╚═══╝╚═╝      ╚═════╝ ╚═╝╚═╝  ╚═══╝   ╚═╝   ');
  console.log('');
  console.log('  Find your spawn point on the Playstyle Plane.');
  console.log('');

  for (const note of dbNotes) console.log(`  storage   ${note}`);

  if (config.sessionGenerated) {
    console.log(
      config.sessionEphemeral
        ? '  sessions  ephemeral secret (data dir not writable) — sessions will not survive a restart'
        : `  sessions  generated a secret and saved it to ${path.relative(process.cwd(), path.join(config.dataDir, 'session-secret'))}`,
    );
  }

  try {
    const seeded = ensureSeedPopulation();
    if (seeded.inserted) {
      console.log(`  seeded    ${seeded.inserted} synthetic playthroughs (population plane)`);
    } else {
      console.log(`  seeded    already present (${seeded.total} attempts on record)`);
    }
  } catch (err) {
    console.warn(`  seeded    skipped (${err.message})`);
  }

  console.log(`  content   ${QUESTIONS.length} questions · 6 archetypes · scoring v${SCORE_VERSION}`);
  console.log(`  open      http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}`);
  console.log('');

  server.listen(config.port, config.host);
}

server.on('listening', () => {
  if (process.env.SPAWNPOINT_QUIET) return;
  console.log(`  ready in ${Date.now() - startedAt}ms\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${config.port} is busy. Try: PORT=4400 npm start\n`);
    process.exit(1);
  }
  throw err;
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log('\n  shutting down…');
    server.close(() => {
      try {
        db.close();
      } catch {
        /* ignore */
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 2000).unref();
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
