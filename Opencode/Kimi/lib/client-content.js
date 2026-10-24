'use strict';

const { POLES, POLE_ORDER, AXES } = require('../data/content');
const { POLE_ANGLE } = require('./quiz');

/**
 * Public archetype metadata for the browser: names, lore, colors, glyphs and
 * plane angles. Answer keys (question → pole mappings) deliberately never
 * leave the server — this is everything the client needs and nothing more.
 */
function clientContent() {
  const poles = {};
  for (const code of POLE_ORDER) {
    const p = POLES[code];
    poles[code] = {
      code,
      name: p.name,
      constellation: p.constellation,
      epithet: p.epithet,
      motto: p.motto,
      color: p.color,
      lore: p.lore,
      glyph: p.glyph,
      angle: POLE_ANGLE[code],
    };
  }
  return {
    poles,
    poleOrder: POLE_ORDER.slice(),
    axes: AXES.map((a) => ({ id: a.id, name: a.name, a: a.a, b: a.b, angle: a.angle })),
  };
}

module.exports = { clientContent };
