// Fetch wrapper: same-origin, JSON, typed errors with field payloads.

export class ApiError extends Error {
  constructor(status, code, message, fields = null) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function request(method, path, body = undefined) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network', 'cannot reach the SPAWNPOINT server — is it still running?');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body (204) */
  }
  if (!res.ok) {
    const err = data && data.error ? data.error : {};
    throw new ApiError(res.status, err.code || 'http_' + res.status, err.message || 'request failed', err.fields || null);
  }
  return data;
}

export const api = {
  me: () => request('GET', '/api/auth/me'),
  register: (username, password) => request('POST', '/api/auth/register', { username, password }),
  login: (username, password) => request('POST', '/api/auth/login', { username, password }),
  logout: () => request('POST', '/api/auth/logout'),
  saveRun: (answers, version) => request('POST', '/api/runs', { answers, version }),
  listRuns: () => request('GET', '/api/runs'),
  getRun: (id) => request('GET', `/api/runs/${encodeURIComponent(id)}`),
  deleteRun: (id) => request('DELETE', `/api/runs/${encodeURIComponent(id)}`),
};
