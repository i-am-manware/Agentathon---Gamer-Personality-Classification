// Minimal path router: method + pattern with :params, in registration order.

export function createRouter() {
  const routes = [];

  function compile(pattern) {
    const keys = [];
    const regex = new RegExp(
      '^' +
        pattern
          .split('/')
          .map((seg) => {
            if (seg.startsWith(':')) {
              keys.push(seg.slice(1));
              return '([^/]+)';
            }
            return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          })
          .join('/') +
        '/?$'
    );
    return { regex, keys };
  }

  return {
    add(method, pattern, handler) {
      routes.push({ method, pattern, ...compile(pattern), handler });
    },
    match(method, pathname) {
      for (const route of routes) {
        if (route.method !== method) continue;
        const m = route.regex.exec(pathname);
        if (!m) continue;
        const params = {};
        route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        return { handler: route.handler, params };
      }
      return null;
    },
  };
}
