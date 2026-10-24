import { AXES, COPY } from './content.js';
import { ARCHETYPES, archetype, axisById, opposite } from './scoring.js';

function round(n, places = 4) {
  const f = 10 ** places;
  return Math.round((Number(n) || 0) * f) / f;
}

export function catalogOf(slug) {
  if (!slug) return null;
  let n = 0;
  for (const c of slug) n = (n * 33 + c.charCodeAt(0)) >>> 0;
  return `RI-${String((n % 9000) + 1000)}`;
}

export function markers() {
  return ARCHETYPES.map((a) => {
    const copy = COPY[a.id];
    const axis = axisById(a.pair);
    const opp = opposite(a.id);
    return {
      id: a.id,
      label: a.label,
      angle: a.angle,
      color: a.color,
      pair: a.pair,
      axis: axis?.label || a.pair,
      blurb: copy.blurb,
      play: copy.play,
      opposite: opp,
      oppositeLabel: archetype(opp).label,
    };
  });
}

export function present(scored, story, meta) {
  const markerList = markers();
  const byId = Object.fromEntries(markerList.map((m) => [m.id, m]));
  const slim = (id) => {
    if (!id) return null;
    const m = byId[id];
    return { id: m.id, label: m.label, color: m.color, angle: m.angle };
  };

  return {
    algo: 1,
    slug: meta.slug || null,
    catalog: catalogOf(meta.slug),
    callsign: meta.callsign,
    createdAt: meta.createdAt,
    title: story.title,
    epithet: story.epithet,
    pull: story.pull,
    paragraphs: story.paragraphs,
    mode: scored.identity.mode,
    primary: slim(scored.identity.primary),
    secondary: slim(scored.identity.secondary),
    affinity: scored.affinity,
    scores: scored.scores,
    leans: {
      composition: round(scored.leans.composition),
      destination: round(scored.leans.destination),
      company: round(scored.leans.company),
    },
    point: { x: round(scored.point.x), y: round(scored.point.y) },
    reach: round(scored.reach),
    leaders: scored.leaders,
    highlight: scored.highlight,
    braids: scored.braids,
    clarity: scored.clarity == null
      ? null
      : { value: round(scored.clarity), label: scored.clarityLabel },
    pairs: AXES.map((axis) => ({
      id: axis.id,
      label: axis.label,
      hint: axis.hint,
      lean: round(scored.leans[axis.id]),
      pos: {
        ...slim(axis.pos),
        score: scored.scores[axis.pos],
      },
      neg: {
        ...slim(axis.neg),
        score: scored.scores[axis.neg],
      },
    })),
    markers: markerList,
  };
}

export function comparisonNarrative(prev, curr) {
  const deltas = {};
  let riseId = null;
  let fallId = null;
  for (const id of Object.keys(curr.scores)) {
    const d = (curr.scores[id] || 0) - (prev.scores[id] || 0);
    deltas[id] = d;
    if (riseId == null || d > deltas[riseId]) riseId = id;
    if (fallId == null || d < deltas[fallId]) fallId = id;
  }
  const moved = Math.hypot(curr.point.x - prev.point.x, curr.point.y - prev.point.y);
  const rise = archetype(riseId);
  const fall = archetype(fallId);
  let narrative;
  if (moved < 0.06 && Math.abs(deltas[riseId] || 0) < 6) {
    narrative = `Since ${prev.title}, the jewel barely moved. Same signal, later night.`;
  } else if ((deltas[riseId] || 0) > 0) {
    const cool = (deltas[fallId] || 0) <= -4
      ? ` ${fall.label} cooled by ${Math.abs(deltas[fallId])}.`
      : '';
    narrative = `Since ${prev.title}, ${rise.label} climbed ${deltas[riseId]}.${cool}`;
  } else {
    narrative = `Since ${prev.title}, the jewel shifted ${moved.toFixed(2)} across the playfield.`;
  }
  return {
    slug: prev.slug,
    title: prev.title,
    createdAt: prev.createdAt,
    point: prev.point,
    deltas,
    narrative,
    moved: round(moved, 3),
  };
}
