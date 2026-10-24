import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json'
};

const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.webmanifest']);
const gzipCache = new Map();
const GZIP_CACHE_MAX = 64;

export function createStaticHandler(rootDir) {
  const root = path.resolve(rootDir);

  return async function serveStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    let pathname = url.pathname;
    try {
      pathname = decodeURIComponent(pathname);
    } catch {
      return false;
    }
    if (pathname === '/') pathname = '/index.html';
    if (pathname.includes('\0')) return false;
    const rel = path.normalize(pathname).replace(/^[/\\]+/, '');
    const filePath = path.resolve(root, rel);
    if (filePath !== root && !filePath.startsWith(root + path.sep)) return false;

    let stat;
    try {
      stat = await fsp.stat(filePath);
      if (stat.isDirectory()) return false;
    } catch {
      return false;
    }

    const ext = path.extname(filePath).toLowerCase();
    const etag = `W/"${stat.mtimeMs.toString(36)}-${stat.size.toString(36)}"`;
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      ETag: etag,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=60',
      Vary: 'Accept-Encoding'
    };

    if (req.headers['if-none-match'] === etag) {
      res.writeHead(304, headers);
      res.end();
      return true;
    }

    const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    let body;
    if (acceptsGzip && COMPRESSIBLE.has(ext) && stat.size > 1024) {
      const cacheKey = `${filePath}:${etag}`;
      let compressed = gzipCache.get(cacheKey);
      if (!compressed) {
        compressed = await fsp.readFile(filePath).then((buf) => zlib.gzipSync(buf, { level: 6 }));
        if (gzipCache.size >= GZIP_CACHE_MAX) gzipCache.clear();
        gzipCache.set(cacheKey, compressed);
      }
      body = compressed;
      headers['Content-Encoding'] = 'gzip';
    } else {
      body = await fsp.readFile(filePath);
    }

    if (headers['Content-Encoding']) {
      headers['Content-Length'] = Buffer.byteLength(body);
    } else {
      headers['Content-Length'] = stat.size;
    }

    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
    return true;
  };
}

export function fileExists(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
