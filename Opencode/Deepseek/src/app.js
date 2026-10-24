import http from 'node:http';
import path from 'node:path';
import { Database } from './lib/store.js';
import { seedDatabase } from './lib/seed.js';
import { createRouter } from './http/router.js';
import { createStaticHandler } from './http/static.js';
import { registerRoutes } from './routes/index.js';
import { attachResponders, HttpError, clientIp } from './http/helpers.js';

export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
};

export async function createApp(config, options = {}) {
  const log = options.log ?? (() => {});
  const db = new Database(path.join(config.dataDir, 'psyche.json')).load();
  const seeded = await seedDatabase(db, config);

  const router = createRouter();
  registerRoutes(router, { db, config });
  const serveStatic = createStaticHandler(config.publicDir);

  const server = http.createServer(async (req, res) => {
    const started = process.hrtime.bigint();
    attachResponders(res);
    for (const [key, value] of Object.entries(securityHeaders)) res.setHeader(key, value);

    const url = new URL(req.url, 'http://internal');
    let status = 200;
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = (code, ...args) => {
      status = code;
      return originalWriteHead(code, ...args);
    };

    try {
      const handled = await router.handle(req, res);
      if (!handled) {
        if (url.pathname.startsWith('/api/')) {
          res.error(404, 'not_found', 'No such endpoint');
        } else if (req.method === 'GET' || req.method === 'HEAD') {
          let served = await serveStatic(req, res, url);
          if (!served && path.extname(url.pathname) === '') {
            served = await serveStatic(req, res, new URL('/', 'http://internal'));
          }
          if (!served) res.error(404, 'not_found', 'Not found');
        } else {
          res.error(405, 'method_not_allowed', 'Method not allowed');
        }
      }
    } catch (err) {
      if (err instanceof HttpError) {
        if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
        res.error(err.status, err.code, err.message);
      } else {
        log('error', err);
        res.error(500, 'internal_error', 'The machine jammed. Try again.');
      }
    }

    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    log('request', { status, method: req.method, path: url.pathname, ms, ip: clientIp(req, config.trustProxy) });
  });

  return { server, db, seeded, config };
}
