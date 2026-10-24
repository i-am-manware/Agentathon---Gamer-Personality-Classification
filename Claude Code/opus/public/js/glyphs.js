// Archetype glyphs: simple geometric marks drawn in a 24×24 box.
import { s } from './dom.js';

export const GLYPH_PATHS = {
  // Architect – set square with plumb line
  A: ['M12 2.5 L21.5 20 H2.5 Z', 'M12 9 V20', 'M8.5 15.5 H15.5'],
  // Bard – two beamed notes
  B: ['M8 18 V5.5 L19 3 V15.5', 'M8 9 L19 6.5', 'M8 18 m-3 0 a3 2.4 0 1 0 6 0 a3 2.4 0 1 0 -6 0', 'M19 15.5 m-3 0 a3 2.4 0 1 0 6 0 a3 2.4 0 1 0 -6 0'],
  // Curator – cut gem
  C: ['M6 3.5 H18 L22 9 L12 21 L2 9 Z', 'M2 9 H22', 'M9 3.5 L7.5 9 L12 21 L16.5 9 L15 3.5'],
  // Gremlin – lightning squiggle
  G: ['M13.5 2 L4.5 13.5 H11 L9.5 22 L19.5 9.5 H13 Z'],
  // Duelist – crossed blades
  D: ['M4 3 L15 14', 'M20 3 L9 14', 'M12.5 16.5 L17.5 11.5', 'M11.5 16.5 L6.5 11.5', 'M15.5 15.5 L20 20', 'M8.5 15.5 L4 20'],
  // Wayfarer – compass star
  W: ['M12 2 L14.3 9.7 L22 12 L14.3 14.3 L12 22 L9.7 14.3 L2 12 L9.7 9.7 Z', 'M12 12 m-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0'],
  // Omnivore – hexagon
  O: ['M12 2.5 L20.5 7.25 V16.75 L12 21.5 L3.5 16.75 V7.25 Z', 'M12 12 m-2.5 0 a2.5 2.5 0 1 0 5 0 a2.5 2.5 0 1 0 -5 0'],
};

export function glyph(id, attrs = {}) {
  return s('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'aria-hidden': 'true', ...attrs },
    (GLYPH_PATHS[id] || GLYPH_PATHS.O).map((d) => s('path', { d })));
}

/** Path2D versions for canvas rendering. */
export function drawGlyph(ctx, id, x, y, size, color, width = 1.8) {
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (const d of GLYPH_PATHS[id] || GLYPH_PATHS.O) ctx.stroke(new Path2D(d));
  ctx.restore();
}
