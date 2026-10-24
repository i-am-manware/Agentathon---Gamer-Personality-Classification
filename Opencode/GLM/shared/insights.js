// SPAWNPOINT — deterministic insight assembly. Same input, same reading, both
// sides of the wire (share links reconstruct the full write-up client-side).

import {
  ARCHETYPES, TITLES, BLEND_LINES, WEAK_LINES, AXIS_LABELS,
} from './archetypes.js';
import { POLES, POLE_RING, opposite } from './axes.js';

export const CROSSROADS_TITLE = 'The Crossroads Drifter';
export const CROSSROADS_TAGLINE =
  'Six equal voices, one perfectly balanced spawn. The Great Map has rarely seen anything like it.';

function fmtCoord(score) {
  const fx = (v) => (Math.abs(v) < 0.005 ? '±0.00' : (v > 0 ? '+' : '') + v.toFixed(2));
  return `(${fx(score.point.x)}, ${fx(score.point.y)})`;
}

export function buildInsight(score) {
  const primary = ARCHETYPES[score.primary];
  const secondary = ARCHETYPES[score.secondary];
  const affById = Object.fromEntries(score.affinities.map((row) => [row.id, row]));
  const weakest = [...score.affinities].sort((a, b) => a.pct - b.pct)[0];
  const weak = ARCHETYPES[weakest.id];

  const crossroads = score.distance < 0.15 || affById[score.primary].pct - affById[score.secondary].pct < 4;

  const title = crossroads ? CROSSROADS_TITLE : TITLES[`${score.primary}_${score.secondary}`];
  const tagline = crossroads ? CROSSROADS_TAGLINE : BLEND_LINES[`${score.primary}_${score.secondary}`];

  const p1 =
    primary.about +
    ` Your diagnostic spawn lands at ${fmtCoord(score)} — ${score.territory.line}` +
    (score.distance >= 0.62
      ? ` ${Math.round(affById[score.primary].pct)}% of your energy reads ${primary.name}, and the Great Map has assigned you a permanent address in ${primary.name} territory.`
      : '');

  let p2;
  if (crossroads) {
    p2 =
      'No single archetype got a controlling stake in you — the six pulls nearly cancel out, which is its own kind of signature. You can fill any slot in a lobby, read any room, and borrow the right playstyle at the right hour. The trade-off: sometimes the Map reads you as "undecided" when you are actually "fluent in everything."';
  } else {
    p2 =
      `${tagline} ` +
      `The secondary strain runs deep: ${secondary.about} ` +
      `Read it as ${Math.round(affById[score.secondary].pct)}% of your blend — the opening act in every session before the ${primary.spot} takes over.`;
  }

  let p3 =
    `Every spawn has a shadow. The archetype you keep at arm's length is ${weak.name} — ` +
    WEAK_LINES[weakest.id].replace(/^the /, 'the ') +
    (weakest.pct >= 14 ? ` (At ${weakest.pct}%, they are not exactly a stranger, though.)` : '') +
    ` ${score.conviction.line}`;

  if (opposite(score.primary) === score.secondary) {
    p3 +=
      ' And a special note: your top two strains are exact opposites on the Map — you are built from a live contradiction, and the friction is somehow the engine. Handle with care. Or don\u2019t. That\u2019s kind of your thing.';
  }

  return {
    title,
    tagline,
    crossroads,
    primary,
    secondary,
    paragraphs: [p1, p2, p3],
    strengths: [...primary.strengths, secondary.strengths[0]],
    fatigue: [...primary.fatigue, secondary.fatigue[0]],
    kin: primary.kin,
    chips: {
      conviction: `${score.conviction.pct}% ${score.conviction.tier}`,
      territory: score.territory.label,
      sector: score.sector,
      blend: `${primary.name} ${Math.round(affById[score.primary].pct)}% × ${secondary.name} ${Math.round(affById[score.secondary].pct)}%`,
    },
    coords: fmtCoord(score),
    axisLabels: AXIS_LABELS,
    affinities: score.affinities,
    axes: score.axes,
  };
}
