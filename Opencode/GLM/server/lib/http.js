// Small HTTP plumbing: JSON bodies/repairs, cookies, error envelopes.

const BODY_LIMIT = 32 * 1024;

export function parseCookies(req) {
  const out = {};
  const header = req.headers.cookie;
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export function serializeCookie(name, value, { maxAge = 0, httpOnly = true, sameSite = 'Lax', secure = false, path = '/' } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `SameSite=${sameSite}`];
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  if (maxAge > 0) parts.push(`Max-Age=${Math.floor(maxAge)}`);
  if (maxAge === 0) parts.push('Max-Age=0');
  return parts.join('; ');
}

// Strict JSON reader: requires the application/json content type (also blocks
// cross-site HTML form posts), enforces a body limit, never throws.
export function readJsonBody(req) {
  return new Promise((resolveBody) => {
    const ctype = String(req.headers['content-type'] || '');
    if (!/^application\/json\b/i.test(ctype)) {
      resolveBody({ ok: false, status: 415, code: 'bad_content_type', message: 'Content-Type must be application/json' });
      return;
    }
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        req.removeAllListeners('data');
        req.removeAllListeners('end');
        resolveBody({ ok: false, status: 413, code: 'body_too_large', message: 'Request body exceeds 32 KB' });
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolveBody({ ok: false, status: 400, code: 'empty_body', message: 'Request body is empty' });
        return;
      }
      try {
        resolveBody({ ok: true, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) });
      } catch {
        resolveBody({ ok: false, status: 400, code: 'bad_json', message: 'Request body is not valid JSON' });
      }
    });
    req.on('error', () => {
      resolveBody({ ok: false, status: 400, code: 'read_error', message: 'Could not read request body' });
    });
  });
}

export function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

export function sendError(res, status, code, message, fields = undefined) {
  sendJson(res, status, { error: { code, message, ...(fields ? { fields } : {}) } });
}
