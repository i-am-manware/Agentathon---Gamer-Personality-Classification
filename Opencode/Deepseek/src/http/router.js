export function createRouter() {
  const routes = [];
  const add = (method, pattern, handler) =>
    routes.push({ method, parts: pattern.split('/').filter(Boolean), handler });

  return {
    get: (pattern, handler) => add('GET', pattern, handler),
    post: (pattern, handler) => add('POST', pattern, handler),
    delete: (pattern, handler) => add('DELETE', pattern, handler),
    routes,
    async handle(req, res) {
      const url = new URL(req.url, 'http://internal');
      const segments = url.pathname.split('/').filter(Boolean);
      for (const route of routes) {
        if (route.method !== req.method) continue;
        const params = match(route.parts, segments);
        if (!params) continue;
        await route.handler(req, res, { params, url, query: url.searchParams });
        return true;
      }
      return false;
    }
  };
}

function match(pattern, segments) {
  if (pattern.length !== segments.length) return null;
  const params = {};
  for (let i = 0; i < pattern.length; i++) {
    const part = pattern[i];
    if (part.startsWith(':')) {
      params[part.slice(1)] = safeDecode(segments[i]);
    } else if (part !== segments[i]) {
      return null;
    }
  }
  return params;
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
