/**
 * SPAWNPOINT — API client.
 *
 * Thin wrapper over fetch. Every method returns parsed JSON or throws an Error
 * carrying `.status` and `.code`, so callers can branch on the shape of the
 * failure rather than on string matching.
 */

const JSON_HEADERS = { 'content-type': 'application/json' };

export class ApiError extends Error {
  constructor(message, status, code, payload) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

async function request(method, path, body, opts = {}) {
  const init = { method, headers: { ...(opts.headers || {}) }, credentials: 'same-origin' };
  if (body !== undefined) {
    init.headers = { ...JSON_HEADERS, ...init.headers };
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, init);
  } catch (err) {
    throw new ApiError('Network unreachable. Is the server still running?', 0, 'network', null);
  }

  if (res.status === 204) return null;

  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text.slice(0, 300) };
    }
  }

  if (!res.ok) {
    const message = payload?.error || payload?.message || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload?.code || 'http', payload);
  }
  return payload;
}

/** Anonymous attempts the browser is holding, sent along on sign-in. */
let attemptHeader = [];

export function setAttemptHeader(ids) {
  attemptHeader = Array.isArray(ids) ? ids.filter(Boolean).slice(0, 50) : [];
}

export const api = {
  quiz: () => request('GET', '/api/quiz'),

  score: (answers) => request('POST', '/api/score', { answers }),

  saveAttempt: (payload) =>
    request('POST', '/api/attempts', payload, {
      headers: attemptHeader.length ? { 'x-spawnpoint-attempts': attemptHeader.join(',') } : {},
    }),

  getAttempt: (id) => request('GET', `/api/attempts/${encodeURIComponent(id)}`),

  deleteAttempt: (id) => request('DELETE', `/api/attempts/${encodeURIComponent(id)}`),

  population: (limit) => request('GET', `/api/population${limit ? `?limit=${limit}` : ''}`),

  me: () => request('GET', '/api/me'),

  register: (username, password, displayName) =>
    request('POST', '/api/auth/register', { username, password, displayName }, {
      headers: attemptHeader.length ? { 'x-spawnpoint-attempts': attemptHeader.join(',') } : {},
    }),

  login: (username, password) =>
    request('POST', '/api/auth/login', { username, password }, {
      headers: attemptHeader.length ? { 'x-spawnpoint-attempts': attemptHeader.join(',') } : {},
    }),

  logout: () => request('POST', '/api/auth/logout'),

  health: () => request('GET', '/api/health'),
};

export default api;
