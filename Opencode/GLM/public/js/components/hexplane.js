// THE GREAT MAP — interactive hexagonal plane (SVG, hand-built).
//
// Sectors tint by affinity share; vertices are focusable archetype nodes with
// live percentages; the spawn point arrives with projection whiskers, a glow,
// a pulse, and a reveal animation. Optional ghost point + movement arrow for
// run comparison, and a fully draggable demo point for the Map legend page.

import { svgEl, iconRects, prefersReducedMotion } from '../ui.js';
import { POLE_RING, POLE_ANGLE, vertex, AXES, clamp, clampToHexagon } from '../../../shared/axes.js';
import { ARCHETYPES } from '../../../shared/archetypes.js';

const C = 500; // viewBox center
const R = 296; // hexagon circumradius in viewBox units

function toSvg(p) {
  return { x: C + R * p.x, y: C - R * p.y };
}

// point (math coords) → affinity shares via axis projection (demo/legend math)
export function demoShares(point) {
  const p = clampToHexagon(point);
  const shares = {};
  let raw = 0;
  for (const ax of AXES) {
    const u = vertex(ax.plus);
    const v = clamp(p.x * u.x + p.y * u.y, -1, 1);
    const split = (v + 1) / 2;
    shares[ax.plus] = split;
    shares[ax.minus] = 1 - split;
    raw += split + (1 - split);
  }
  for (const pole of POLE_RING) shares[pole] /= raw || 1;
  return shares;
}

export function dominantPole(shares) {
  return [...POLE_RING].sort((a, b) => shares[b] - shares[a])[0];
}

export function hexplane({
  score = null,
  ghost = null,
  ghostLabel = 'PREV',
  onPick = null,
  onDemo = null,
  demoPoint = null,
  demoColor = null,
  reveal = true,
  ariaLabel = null,
} = {}) {
  const svg = svgEl('svg', {
    class: 'hexplane' + (onDemo ? ' hexplane--draggable' : ''),
    viewBox: '0 0 1000 1000',
    role: 'img',
    'aria-label':
      ariaLabel ||
      (score
        ? `The Great Map: spawn point at (${score.point.x.toFixed(2)}, ${score.point.y.toFixed(2)}), strongest pull ${ARCHETYPES[score.primary].name}`
        : 'The Great Map: six archetype regions arranged as three opposing axes'),
  });

  // ---- defs: glow filter + arrow marker
  const defs = svgEl('defs', {}, svg);
  const filt = svgEl('filter', { id: 'hex-glow', x: '-90%', y: '-90%', width: '280%', height: '280%' }, defs);
  svgEl('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 8, result: 'b' }, filt);
  const merge = svgEl('feMerge', {}, filt);
  svgEl('feMergeNode', { in: 'b' }, merge);
  svgEl('feMergeNode', { in: 'SourceGraphic' }, merge);
  const marker = svgEl('marker', { id: 'hex-arrow', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6.5, markerHeight: 6.5, orient: 'auto-start-reverse' }, defs);
  svgEl('path', { d: 'M0 0 L10 5 L0 10 z', fill: 'var(--ghost)' }, marker);

  const shareOf = (pole) => (score ? (score.shares?.[pole] ?? score.affinities.find((r) => r.id === pole)?.share ?? 0) : 0);
  const pctOf = (pole) => (score ? score.affinities.find((r) => r.id === pole)?.pct ?? 0 : null);

  // ---- sectors (tinted by affinity share)
  POLE_RING.forEach((pole, i) => {
    const next = POLE_RING[(i + 1) % 6];
    const a = toSvg(vertex(pole));
    const b = toSvg(vertex(next));
    const share = shareOf(pole);
    const op = score ? 0.05 + share * 0.3 : 0.07;
    const poly = svgEl(
      'polygon',
      {
        points: `${C},${C} ${a.x},${a.y} ${b.x},${b.y}`,
        class: 'hex-sector',
        fill: ARCHETYPES[pole].color,
        style: `--op:${op.toFixed(3)}`,
        'data-pole': pole,
      },
      svg
    );
    if (reveal && !prefersReducedMotion()) {
      poly.animate([{ opacity: 0 }, { opacity: op }], { duration: 520, delay: 120 + i * 70, easing: 'ease-out', fill: 'backwards' });
    }
  });

  // ---- outline + axes + center
  svgEl('polygon', { points: POLE_RING.map((p) => { const v = toSvg(vertex(p)); return `${v.x},${v.y}`; }).join(' '), class: 'hex-outline' }, svg);
  for (const ax of AXES) {
    const a = toSvg(vertex(ax.plus));
    const b = toSvg(vertex(ax.minus));
    svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'hex-axisline' }, svg);
  }
  svgEl('circle', { cx: C, cy: C, r: 5, class: 'hex-center' }, svg);
  svgEl('line', { x1: C - 16, y1: C, x2: C + 16, y2: C, class: 'hex-center-tick' }, svg);
  svgEl('line', { x1: C, y1: C - 16, x2: C, y2: C + 16, class: 'hex-center-tick' }, svg);

  // ---- vertices
  for (const pole of POLE_RING) {
    const arch = ARCHETYPES[pole];
    const v = toSvg(vertex(pole));
    const ang = (POLE_ANGLE[pole] * Math.PI) / 180;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const labelAt = C + R + 62;
    const lx = C + labelAt * ux;
    const ly = C - labelAt * uy;
    const anchor = ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'middle';
    const nameDy = uy > 0.35 ? -12 : uy < -0.35 ? 8 : -14;
    const pct = pctOf(pole);

    const g = svgEl('g', {
      class: 'hex-vertex',
      'data-pole': pole,
      style: `--pole:${arch.color}`,
      tabindex: onPick ? '0' : null,
      role: onPick ? 'button' : null,
      'aria-label': onPick ? `${arch.name} — ${arch.spot}` : null,
    }, svg);
    svgEl('circle', { cx: v.x, cy: v.y, r: 34, class: 'hex-vertex__ring' }, g);
    const icon = svgEl('svg', {
      x: v.x - 19, y: v.y - 19, width: 38, height: 38, viewBox: '0 0 12 12',
      'shape-rendering': 'crispEdges', fill: arch.color, class: 'hex-vertex__icon',
    }, g);
    icon.innerHTML = iconRects(pole);
    svgEl('text', { x: lx, y: ly + nameDy, 'text-anchor': anchor, class: 'hex-vertex__name' }, g).textContent = arch.name;
    svgEl('text', { x: lx, y: ly + nameDy + 34, 'text-anchor': anchor, class: 'hex-vertex__pct' }, g).textContent =
      pct == null ? '·' : `${pct}%`;

    if (onPick) {
      g.addEventListener('click', () => onPick(pole));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPick(pole);
        }
      });
    }
  }

  // ---- spawn point
  let spawnG = null;
  let primaryColor = score ? ARCHETYPES[score.primary].color : demoColor || '#3dfa7e';

  function drawSpawn(p, color, label) {
    if (spawnG) spawnG.remove();
    const S = toSvg(p);
    spawnG = svgEl('g', { class: 'hex-spawn', style: `--spawn:${color}` }, svg);

    // projection whiskers: how far along each axis you sit
    if (score) {
      for (const ax of AXES) {
        const u = vertex(ax.plus);
        const d = clamp(p.x * u.x + p.y * u.y, -1, 1);
        const proj = toSvg({ x: d * u.x, y: d * u.y });
        svgEl('line', { x1: S.x, y1: S.y, x2: proj.x, y2: proj.y, class: 'hex-whisker', stroke: color }, spawnG);
        svgEl('circle', { cx: proj.x, cy: proj.y, r: 5, class: 'hex-whisker-tick', stroke: color }, spawnG);
      }
    }

    svgEl('circle', { cx: S.x, cy: S.y, r: 46, fill: color, opacity: 0.34, filter: 'url(#hex-glow)', class: 'hex-spawn__halo' }, spawnG);
    svgEl('circle', { cx: S.x, cy: S.y, r: 24, class: 'hex-spawn__pulse' }, spawnG);
    svgEl('circle', { cx: S.x, cy: S.y, r: 10, fill: color, class: 'hex-spawn__core' }, spawnG);
    if (label) {
      const off = S.x >= C ? 26 : -26;
      svgEl('text', { x: S.x + off, y: S.y - 22, class: 'hex-spawn__coords', 'text-anchor': S.x >= C ? 'start' : 'end' }, spawnG).textContent = label;
    }

    if (reveal && !prefersReducedMotion()) {
      const dx = S.x - C;
      const dy = S.y - C;
      spawnG.style.transformBox = 'view-box';
      spawnG.style.transformOrigin = 'center';
      spawnG.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0 },
          { transform: `translate(${dx}px, ${dy}px) scale(1.22)`, opacity: 1, offset: 0.7 },
          { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 1 },
        ],
        { duration: 950, delay: 430, easing: 'cubic-bezier(.2,.9,.25,1)', fill: 'backwards' }
      );
    }
  }

  // ---- ghost point + movement arrow
  if (ghost) {
    const Gp = toSvg(ghost.point);
    const P = score ? toSvg(score.point) : null;
    if (P) {
      svgEl('line', {
        x1: Gp.x, y1: Gp.y, x2: P.x, y2: P.y,
        class: 'hex-move', 'marker-end': 'url(#hex-arrow)',
      }, svg);
    }
    const gg = svgEl('g', { class: 'hex-ghost' }, svg);
    svgEl('circle', { cx: Gp.x, cy: Gp.y, r: 15, class: 'hex-ghost__dot' }, gg);
    const offX = Gp.x >= C ? 24 : -24;
    svgEl('text', { x: Gp.x + offX, y: Gp.y + 34, class: 'hex-ghost__label', 'text-anchor': Gp.x >= C ? 'start' : 'end' }, gg).textContent = ghostLabel;
  }

  if (score) {
    drawSpawn(score.point, primaryColor, `${score.point.x >= 0 ? '+' : ''}${score.point.x.toFixed(2)}, ${score.point.y >= 0 ? '+' : ''}${score.point.y.toFixed(2)}`);
  } else if (onDemo) {
    drawSpawn(demoPoint || { x: 0, y: 0 }, primaryColor, 'DEMO — drag me');
    wireDrag();
  }

  function wireDrag() {
    const pointerToMath = (ev) => {
      const rect = svg.getBoundingClientRect();
      const sx = ((ev.clientX - rect.left) / rect.width) * 1000;
      const sy = ((ev.clientY - rect.top) / rect.height) * 1000;
      return { x: (sx - C) / R, y: (C - sy) / R };
    };
    svg.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('.hex-vertex')) return;
      ev.preventDefault();
      svg.setPointerCapture(ev.pointerId);
    const move = (e) => {
      const p = clampToHexagon(pointerToMath(e));
      drawSpawn(p, ARCHETYPES[dominantPole(demoShares(p))].color, 'DEMO — drag me');
      onDemo?.(p);
    };
      const up = () => {
        svg.removeEventListener('pointermove', move);
        svg.removeEventListener('pointerup', up);
        svg.removeEventListener('pointercancel', up);
      };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerup', up);
      svg.addEventListener('pointercancel', up);
      move(ev);
    });
  }

  return {
    el: svg,
    updateDemo(p) {
      drawSpawn(p, ARCHETYPES[dominantPole(demoShares(p))].color, 'DEMO — drag me');
    },
  };
}
