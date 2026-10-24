/**
 * A very small HTTP toolkit: routing, JSON bodies, static files with ETags and
 * gzip. Written by hand because the whole app runs on zero npm packages.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/* -------------------------------------------------------------------------- */
/* Router                                                                      */
/* -------------------------------------------------------------------------- */

export function createRouter() {
  const routes = [];

  function add(method, pattern, handler) {
    const keys = [];
    const segments = pattern.replace(/\/+$/, '').split('/').filter(Boolean);
    const parts = segments.map((segment) => {
      if (segment.startsWith(':')) {
        keys.push(segment.slice(1));
        return '/([^/]+)';
      }
      if (segment === '*') {
        keys.push('rest');
        return '/(.*)';
      }
      return `/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`;
    });
    const regex = new RegExp(`^${parts.join('')}/?$`);
    routes.push({ method, regex, keys, handler });
  }

  return {
    get: (p, h) => add('GET', p, h),
    post: (p, h) => add('POST', p, h),
    put: (p, h) => add('PUT', p, h),
    patch: (p, h) => add('PATCH', p, h),
    delete: (p, h) => add('DELETE', p, h),
    match(method, pathname) {
      for (const route of routes) {
        if (route.method !== method) continue;
        const m = route.regex.exec(pathname);
        if (!m) continue;
        const params = {};
        route.keys.forEach((key, i) => {
          params[key] = decodeURIComponent(m[i + 1]);
        });
        return { handler: route.handler, params };
      }
      return null;
    },
    /** True if the path exists under another method (for a correct 405). */
    hasPath(pathname) {
      return routes.some((r) => r.regex.test(pathname));
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Responses                                                                   */
/* -------------------------------------------------------------------------- */

export function sendJson(res, status, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

export function sendText(res, status, text, contentType = 'text/plain; charset=utf-8', extraHeaders = {}) {
  const body = Buffer.from(text);
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': body.length,
    ...extraHeaders,
  });
  res.end(body);
}

export function sendNoContent(res, extraHeaders = {}) {
  res.writeHead(204, { 'Cache-Control': 'no-store', ...extraHeaders });
  res.end();
}

/* -------------------------------------------------------------------------- */
/* Request bodies                                                              */
/* -------------------------------------------------------------------------- */

const MAX_BODY = 256 * 1024;

export async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) {
      const err = new Error('Request body too large');
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      const err = new Error('Expected a JSON object');
      err.status = 400;
      throw err;
    }
    return parsed;
  } catch (err) {
    if (err.status) throw err;
    const bad = new Error('Malformed JSON');
    bad.status = 400;
    throw bad;
  }
}

/* -------------------------------------------------------------------------- */
/* Static files                                                                */
/* -------------------------------------------------------------------------- */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json; charset=utf-8',
};

const COMPRESSIBLE = /^(text\/|application\/(json|manifest\+json)|image\/svg)/;

/** Lazily-built gzip cache, keyed by absolute path + mtime. */
const gzipCache = new Map();

function gzipped(file, mtimeMs, raw) {
  const key = `${file}:${mtimeMs}`;
  const hit = gzipCache.get(key);
  if (hit) return hit;
  const buf = zlib.gzipSync(raw, { level: 6 });
  if (gzipCache.size > 200) gzipCache.clear();
  gzipCache.set(key, buf);
  return buf;
}

/**
 * Resolve a URL path inside `rootDir`, refusing anything that escapes it.
 * Returns null on traversal attempts.
 */
export function resolveStatic(rootDir, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const rel = decoded.replace(/^\/+/, '');
  const abs = path.resolve(rootDir, rel);
  const rootAbs = path.resolve(rootDir);
  if (abs !== rootAbs && !abs.startsWith(rootAbs + path.sep)) return null;
  return abs;
}

/**
 * @returns {boolean} true if the request was served.
 */
export function serveStatic(req, res, rootDir, urlPath, { immutable = false } = {}) {
  let file = resolveStatic(rootDir, urlPath);
  if (!file) return false;

  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return false;
  }

  if (stat.isDirectory()) {
    const index = path.join(file, 'index.html');
    if (!fs.existsSync(index)) return false;
    file = index;
    stat = fs.statSync(file);
  }

  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ETag: etag });
    res.end();
    return true;
  }

  const headers = {
    'Content-Type': type,
    ETag: etag,
    'Last-Modified': new Date(stat.mtimeMs).toUTCString(),
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
  };

  const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (acceptsGzip && COMPRESSIBLE.test(type) && stat.size > 1024) {
    const raw = fs.readFileSync(file);
    const body = gzipped(file, Math.floor(stat.mtimeMs), raw);
    res.writeHead(200, {
      ...headers,
      'Content-Encoding': 'gzip',
      'Content-Length': body.length,
      Vary: 'Accept-Encoding',
    });
    res.end(body);
    return true;
  }

  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  fs.createReadStream(file).pipe(res);
  return true;
}
