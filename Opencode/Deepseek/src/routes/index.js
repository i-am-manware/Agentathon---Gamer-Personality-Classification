import { registerAuthRoutes } from './auth.routes.js';
import { registerQuizRoutes } from './quiz.routes.js';
import { registerArchiveRoutes } from './archive.routes.js';
import { registerFieldRoutes } from './field.routes.js';

export function registerRoutes(router, ctx) {
  registerAuthRoutes(router, ctx);
  registerQuizRoutes(router, ctx);
  registerArchiveRoutes(router, ctx);
  registerFieldRoutes(router, ctx);
  router.get('/api/healthz', async (req, res) => {
    res.json(200, { ok: true, uptime: Math.round(process.uptime()) });
  });
}
