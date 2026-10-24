// Static file server with ETags, in-memory gzip/brotli cache and SPA fallback.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};
const COMPRESSIBLE = /\.(html|js|css|svg|json|webmanifest|txt)$/;

export function createStatic(mounts) {
  const cache = new Map(); // abs path -> { mtime, etag, raw, gz, br }

  function load(abs) {
    let st;
    try { st = fs.statSync(abs); } catch { return null; }
    if (!st.isFile()) return null;
    const hit = cache.get(abs);
    if (hit && hit.mtime === st.mtimeMs) return hit;
    const raw = fs.readFileSync(abs);
    const entry = {
      mtime: st.mtimeMs, raw, etag: `W/"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`,
      type: TYPES[path.extname(abs)] || 'application/octet-stream',
    };
    if (COMPRESSIBLE.test(abs) && raw.length > 1024) {
      entry.br = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } });
      entry.gz = zlib.gzipSync(raw, { level: 9 });
    }
    cache.set(abs, entry);
    return entry;
  }

  function resolve(pathname) {
    for (const [prefix, dir] of mounts) {
      if (!pathname.startsWith(prefix)) continue;
      const rel = decodeURIComponent(pathname.slice(prefix.length));
      const abs = path.join(dir, rel);
      if (!abs.startsWith(dir + path.sep) && abs !== dir) return null; // traversal guard
      return abs;
    }
    return null;
  }

  function sendBuffer(req, res, entry, body, extraHeaders = {}) {
    const headers = { 'Content-Type': entry.type, Vary: 'Accept-Encoding', ...extraHeaders };
    const ae = req.headers['accept-encoding'] || '';
    let payload = body || entry.raw;
    if (!body && entry.br && /\bbr\b/.test(ae)) { payload = entry.br; headers['Content-Encoding'] = 'br'; }
    else if (!body && entry.gz && /\bgzip\b/.test(ae)) { payload = entry.gz; headers['Content-Encoding'] = 'gzip'; }
    headers['Content-Length'] = payload.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : payload);
  }

  return {
    load,
    /** Serve a file under a mount; returns false if not found. */
    serve(req, res, pathname) {
      const abs = resolve(pathname);
      if (!abs) return false;
      const entry = load(abs);
      if (!entry) return false;
      if (req.headers['if-none-match'] === entry.etag) { res.writeHead(304, { ETag: entry.etag }); res.end(); return true; }
      sendBuffer(req, res, entry, null, { ETag: entry.etag, 'Cache-Control': 'no-cache' });
      return true;
    },
    /** Serve an HTML string (for the templated SPA shell). */
    html(req, res, htmlString, status = 200) {
      const body = Buffer.from(htmlString);
      const ae = req.headers['accept-encoding'] || '';
      const headers = { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache', Vary: 'Accept-Encoding' };
      let payload = body;
      if (/\bgzip\b/.test(ae)) { payload = zlib.gzipSync(body); headers['Content-Encoding'] = 'gzip'; }
      headers['Content-Length'] = payload.length;
      res.writeHead(status, headers);
      res.end(req.method === 'HEAD' ? undefined : payload);
    },
  };
}
