// Fixed-window in-memory rate limiter. Adequate for a self-hosted quiz app;
// swap for Redis if you deploy this behind real traffic.

export class RateLimiter {
  constructor(max, windowMs) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = new Map();
    this.window = Math.floor(Date.now() / windowMs);
    this.sweeper = setInterval(() => this.sweep(), windowMs * 2);
    this.sweeper.unref?.();
  }

  check(key) {
    const nowWindow = Math.floor(Date.now() / this.windowMs);
    if (nowWindow !== this.window) {
      this.hits.clear();
      this.window = nowWindow;
    }
    const n = (this.hits.get(key) || 0) + 1;
    this.hits.set(key, n);
    if (n > this.max) {
      return { ok: false, retryAfterSec: Math.ceil((this.windowMs * (nowWindow + 1) - Date.now()) / 1000) };
    }
    return { ok: true };
  }

  sweep() {
    const nowWindow = Math.floor(Date.now() / this.windowMs);
    if (nowWindow !== this.window) this.hits.clear();
  }
}
