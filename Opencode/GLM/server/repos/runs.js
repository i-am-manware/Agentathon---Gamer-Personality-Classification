import { randomUUID } from 'node:crypto';
import { POLE_RING } from '../../shared/axes.js';

export function createRunRepo(store) {
  const runs = () => store.db.data.runs;

  const summary = (run) => ({
    id: run.id,
    createdAt: run.createdAt,
    version: run.version,
    title: run.title,
    tagline: run.tagline,
    primary: run.primary,
    secondary: run.secondary,
    sector: run.sector,
    territory: run.territory,
    convictionPct: run.convictionPct,
    axes: run.axes,
    affinities: run.affinities,
    point: run.point,
    distance: run.distance,
    code: run.code,
    poleRing: POLE_RING,
  });

  return {
    listByUsername(usernameLower) {
      return runs()
        .filter((r) => r.usernameLower === usernameLower)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(summary);
    },
    get(id) {
      return runs().find((r) => r.id === id) || null;
    },
    create(usernameLower, record) {
      const run = {
        id: randomUUID(),
        usernameLower,
        createdAt: Date.now(),
        ...record,
      };
      runs().push(run);
      // keep each save file within a fixed budget (oldest pruned first)
      const mine = runs()
        .filter((r) => r.usernameLower === usernameLower)
        .sort((a, b) => b.createdAt - a.createdAt);
      const drop = mine.slice(100).map((r) => r.id);
      if (drop.length > 0) {
        store.db.data.runs = runs().filter((r) => !drop.includes(r.id));
      }
      store.db.save();
      return run;
    },
    delete(id) {
      const before = runs().length;
      store.db.data.runs = runs().filter((r) => r.id !== id);
      if (runs().length !== before) store.db.save();
      return runs().length !== before;
    },
    count() {
      return runs().length;
    },
    summary,
  };
}
