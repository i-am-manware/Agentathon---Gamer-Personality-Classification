import { ARCHETYPES } from '../../shared/quiz.data.js';
import { tooMany, clientIp } from '../http/helpers.js';
import { rateLimit } from '../lib/ratelimit.js';

const MAX_POINTS = 1500;

export function registerFieldRoutes(router, { db, config }) {
  router.get('/api/field', async (req, res) => {
    const limit = rateLimit({ key: `field:${clientIp(req, config.trustProxy)}`, limit: 120, windowMs: 5 * 60_000 });
    if (!limit.ok) throw tooMany(limit.retryAfter);

    const points = db.fieldPoints();
    const total = points.length;
    const distribution = ARCHETYPES.map((_, i) => points.filter((p) => p.a === i).length);
    let sampled = points;
    if (total > MAX_POINTS) {
      const step = total / MAX_POINTS;
      sampled = [];
      for (let i = 0; i < MAX_POINTS; i++) sampled.push(points[Math.floor(i * step)]);
    }
    res.json(
      200,
      {
        total,
        distribution,
        points: sampled.map((p) => [+p.x.toFixed(3), +p.y.toFixed(3), p.a])
      },
      { 'Cache-Control': 'public, max-age=15' }
    );
  });
}
