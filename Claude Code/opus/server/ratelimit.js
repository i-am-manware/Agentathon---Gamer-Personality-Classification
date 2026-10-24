// Fixed-window in-memory rate limiter keyed by (bucket, ip).
export function createRateLimiter(rules) {
  const hits = new Map();
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, 60_000);
  sweep.unref();
  return {
    /** Returns seconds to wait if limited, else 0. */
    check(bucket, ip) {
      const rule = rules[bucket];
      if (!rule) return 0;
      const key = `${bucket}:${ip}`, now = Date.now();
      let e = hits.get(key);
      if (!e || e.reset < now) { e = { n: 0, reset: now + rule.windowMs }; hits.set(key, e); }
      e.n++;
      return e.n > rule.max ? Math.ceil((e.reset - now) / 1000) : 0;
    },
  };
}
