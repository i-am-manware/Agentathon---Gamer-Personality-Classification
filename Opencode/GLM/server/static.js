// Static serving with an explicit allowlist: only files inside public/, plus
// the shared/*.js domain modules (imported by the frontend as plain ESM).
// Path traversal and everything else are rejected with 404/403.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

export const CSP =
  "default-src 'self'; " +
  "script-src 'self'; " +
  "style-src 'self' https://fonts.googleapis.com; " +
  "font-src 'self' https://fonts.gstatic.com data:; " +
  "img-src 'self' data: blob:; " +
  "connect-src 'self'; " +
  "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

export function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', CSP);
}

// returns true if the request was handled
export function serveStatic({ rootPublic, rootShared, indexFile }, req, res, pathname) {
  const isGetLike = req.method === 'GET' || req.method === 'HEAD';
  if (!isGetLike) {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' });
    res.end('method not allowed');
    return true;
  }

  let target = null;
  if (pathname === '/' || pathname === '/index.html') {
    target = indexFile;
  } else {
    // normalize() on Windows yields backslashes — fold everything to '/' so the
    // allowlist below sees one canonical form on every platform
    const clean = normalize(pathname).replace(/^([/\\])+/, '').replace(/\\/g, '/');
    if (clean.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('no');
      return true;
    }
    if (clean.startsWith('shared/')) {
      const rest = clean.slice('shared/'.length);
      if (rest.endsWith('.js') && /^[A-Za-z0-9_-]+\.js$/.test(rest)) {
        target = join(rootShared, rest);
      }
    } else if (/^[A-Za-z0-9_.\/-]+$/.test(clean) && !clean.includes('//')) {
      target = join(rootPublic, clean);
    }
  }

  if (!target || !existsSync(target) || !statSync(target).isFile()) {
    // SPA fallback: unknown non-API GET routes land on the app shell
    if (pathname === '/favicon.ico') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404');
      return true;
    }
    target = indexFile;
  }

  const stat = statSync(target);
  const etag = `"${stat.size}-${stat.mtimeMs}"`;
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag });
    res.end();
    return true;
  }

  const ext = target.slice(target.lastIndexOf('.'));
  const type = MIME[ext] || 'application/octet-stream';
  const body = readFileSync(target);
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': body.length,
    'Cache-Control': target === indexFile ? 'no-cache' : 'public, max-age=300',
    ETag: etag,
  });
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}
