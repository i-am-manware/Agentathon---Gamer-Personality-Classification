async function request(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'same-origin'
    });
  } catch {
    const err = new Error('The cabinet is offline. Check your connection and try again.');
    err.code = 'offline';
    throw err;
  }
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data?.error?.code || 'http_error';
    throw err;
  }
  return data;
}

export const api = {
  quiz: () => request('GET', '/api/quiz'),
  stats: () => request('GET', '/api/stats'),
  field: () => request('GET', '/api/field'),
  result: (payload) => request('POST', '/api/result', payload),
  me: () => request('GET', '/api/auth/me'),
  register: (username, password) => request('POST', '/api/auth/register', { username, password }),
  login: (username, password) => request('POST', '/api/auth/login', { username, password }),
  logout: () => request('POST', '/api/auth/logout', {}),
  attempts: () => request('GET', '/api/attempts'),
  saveAttempt: (answers) => request('POST', '/api/attempts', { answers }),
  deleteAttempt: (id) => request('DELETE', `/api/attempts/${encodeURIComponent(id)}`)
};
