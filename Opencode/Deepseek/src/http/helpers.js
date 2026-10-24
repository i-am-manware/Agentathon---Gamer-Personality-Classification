export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function badRequest(code, message) {
  return new HttpError(400, code, message);
}

export function unauthorized(message = 'Sign in required') {
  return new HttpError(401, 'unauthorized', message);
}

export function notFound(message = 'Not found') {
  return new HttpError(404, 'not_found', message);
}

export function tooMany(retryAfter) {
  const err = new HttpError(429, 'rate_limited', 'Slow down, speedrunner. Try again shortly.');
  err.retryAfter = retryAfter;
  return err;
}

export function attachResponders(res) {
  res.json = (status, body, headers = {}) => {
    const payload = JSON.stringify(body);
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
      'Cache-Control': 'no-store',
      ...headers
    });
    res.end(payload);
  };
  res.error = (status, code, message) => {
    res.json(status, { error: { code, message } });
  };
}

export async function readJson(req, limit = 128 * 1024) {
  if (req.method === 'GET' || req.method === 'HEAD') return {};
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    throw badRequest('bad_content_type', 'Expected application/json');
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new HttpError(413, 'too_large', 'Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(badRequest('bad_json', 'Body must be valid JSON'));
      }
    });
    req.on('error', reject);
  });
}

export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const fwd = req.headers['x-forwarded-for'];
    if (fwd) return String(fwd).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}
