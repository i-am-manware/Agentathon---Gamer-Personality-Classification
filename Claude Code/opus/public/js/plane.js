// The atlas plane: a hexagon with the six archetypes at its vertices, drawn as
// risograph-style SVG. Reused everywhere (hero, live quiz map, results, log,
// atlas, run thumbnails) with layers toggled on/off.
import { s, h, tween, easeOutBack } from './dom.js';
import { ARCH, ARCH_ORDER, OPPOSITE } from '/shared/engine.js';
import { GLYPH_PATHS } from './glyphs.js';

const RAD = Math.PI / 180;
const VB = 1.4;
const pol = (r, deg) => [r * Math.cos(deg * RAD), -r * Math.sin(deg * RAD)]; // SVG y-down
const pts = (arr) => arr.map((p) => p.map((v) => v.toFixed(4)).join(',')).join(' ');
const hexPts = (r) => pts(ARCH_ORDER.map((k) => pol(r, ARCH[k].angle)));
let uid = 0;

export function createPlane(opts = {}) {
  const { interactive = true, labels = true, mini = false, onSelect = null, describe = null, ariaLabel = 'Gamer atlas plane' } = opts;
  const id = `pl${++uid}`;
  const vb = mini ? 1.06 : VB;

  const svg = s('svg', {
    class: ['plane', !interactive && 'static', mini && 'mini'],
    viewBox: `${-vb} ${-vb} ${vb * 2} ${vb * 2}`, role: 'img', 'aria-label': ariaLabel,
  });

  /* ---- defs: halftone pattern per ink ---- */
  const defs = s('defs');
  for (const k of ARCH_ORDER) {
    defs.append(s('pattern', { id: `${id}-ht-${k}`, width: 0.036, height: 0.036, patternUnits: 'userSpaceOnUse', patternTransform: `rotate(${20 + ARCH_ORDER.indexOf(k) * 15})` },
      s('circle', { cx: 0.018, cy: 0.018, r: mini ? 0.012 : 0.0075, fill: ARCH[k].color })));
  }
  defs.append(s('clipPath', { id: `${id}-clip` }, s('polygon', { points: hexPts(1) })));
  svg.append(defs);

  /* ---- wedges ---- */
  const gW = s('g', { class: 'wedges' });
  const wedges = {};
  for (const k of ARCH_ORDER) {
    const a = ARCH[k].angle;
    const kite = pts([[0, 0], pol(Math.cos(30 * RAD), a - 30), pol(1, a), pol(Math.cos(30 * RAD), a + 30)]);
    const g = s('g', { class: 'wedge', 'data-k': k },
      s('polygon', { class: 'tint', points: kite, fill: ARCH[k].color }),
      s('polygon', { class: 'dots', points: kite, fill: `url(#${id}-ht-${k})` }));
    if (interactive) {
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `${ARCH[k].name} region`);
      g.addEventListener('mouseenter', (e) => showTip(k, e));
      g.addEventListener('mousemove', (e) => moveTip(e));
      g.addEventListener('mouseleave', hideTip);
      g.addEventListener('focus', () => showTip(k));
      g.addEventListener('blur', hideTip);
      g.addEventListener('click', () => onSelect?.(k));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(k); } });
    }
    wedges[k] = g;
    gW.append(g);
  }
  svg.append(gW);

  /* ---- grid ---- */
  const gGrid = s('g', { class: 'grid', 'pointer-events': 'none' });
  if (!mini) for (const r of [0.25, 0.5, 0.75]) gGrid.append(s('polygon', { class: 'ring', points: hexPts(r) }));
  for (const k of ['A', 'B', 'C']) {
    const a = ARCH[k].angle;
    gGrid.append(s('line', { class: 'spoke', x1: pol(1, a)[0], y1: pol(1, a)[1], x2: pol(1, a + 180)[0], y2: pol(1, a + 180)[1] }));
  }
  gGrid.append(s('polygon', { class: 'rim', points: hexPts(1), style: mini ? { strokeWidth: 0.04 } : null }));
  svg.append(gGrid);

  /* ---- data layers ---- */
  const layer = (cls) => { const g = s('g', { class: cls, 'pointer-events': 'none' }); svg.append(g); return g; };
  const gCrowd = layer('crowd');
  gCrowd.setAttribute('clip-path', `url(#${id}-clip)`);
  const gCloud = layer('cloud');
  const gTether = layer('tethers');
  const gTrail = layer('trail');
  const gGhost = layer('ghost');
  const gFriend = layer('friend');
  const gMe = layer('me');

  /* ---- vertex labels ---- */
  if (labels && !mini) {
    const gL = s('g', { class: 'vlabels', 'pointer-events': 'none' });
    for (const k of ARCH_ORDER) {
      const a = ARCH[k].angle;
      const [x, y] = pol(1.13, a);
      const badge = s('g', { transform: `translate(${x.toFixed(4)} ${y.toFixed(4)})` },
        s('circle', { class: 'vglyph-bg', r: 0.075, fill: ARCH[k].color }),
        s('g', { transform: 'translate(-0.05 -0.05) scale(0.00417)', fill: 'none', stroke: '#1E1B18', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' },
          GLYPH_PATHS[k].map((d) => s('path', { d }))));
      // Top/bottom labels centre on the badge; side labels hang outward so they
      // never collide with the rim.
      const top = a === 90, side = a !== 90 && a !== -90;
      const anchor = side ? (x < 0 ? 'end' : 'start') : 'middle';
      const tx = (side ? x + (x < 0 ? 0.078 : -0.078) : x).toFixed(4);
      const nameY = top ? y - 0.165 : y + 0.152;
      const subY = top ? y - 0.103 : y + 0.21;
      gL.append(badge,
        s('text', { class: 'vlabel', x: tx, y: nameY.toFixed(4), 'text-anchor': anchor }, ARCH[k].name),
        s('text', { class: 'vsub', x: tx, y: subY.toFixed(4), 'text-anchor': anchor }, `vs ${ARCH[OPPOSITE[k]].name}`));
    }
    svg.append(gL);
  }

  /* ---- tooltip ---- */
  const wrap = h('div', { class: 'plane-wrap' }, svg);
  const tip = h('div', { class: 'plane-tip', role: 'tooltip' });
  if (interactive) wrap.append(tip);
  function showTip(k, e) {
    if (!describe) return;
    const d = describe(k);
    tip.replaceChildren(h('span', { class: 'k' }, d.kicker || 'Region'), h('b', d.title), d.body);
    tip.classList.add('show');
    if (e) moveTip(e);
    else {
      const [x, y] = pol(0.55, ARCH[k].angle);
      const rect = wrap.getBoundingClientRect();
      tip.style.left = `${((x + vb) / (2 * vb)) * rect.width - 100}px`;
      tip.style.top = `${((y + vb) / (2 * vb)) * rect.height}px`;
    }
  }
  function moveTip(e) {
    const r = wrap.getBoundingClientRect();
    let x = e.clientX - r.left + 14, y = e.clientY - r.top + 14;
    if (x + 250 > r.width) x = e.clientX - r.left - 254;
    tip.style.left = `${Math.max(0, x)}px`;
    tip.style.top = `${y}px`;
  }
  function hideTip() { tip.classList.remove('show'); }

  /* ---- "me" marker ---- */
  let me = null;
  const mePos = { x: 0, y: 0 };
  function ensureMe(tag) {
    if (me) return me;
    const sc = mini ? 2.2 : 1;
    me = s('g', { class: 'me-g' },
      s('circle', { class: 'me-pulse', r: 0.05 * sc }),
      s('line', { x1: -0.09 * sc, x2: 0.09 * sc, y1: 0, y2: 0, stroke: 'var(--ink)', 'stroke-width': 0.01 * sc }),
      s('line', { y1: -0.09 * sc, y2: 0.09 * sc, x1: 0, x2: 0, stroke: 'var(--ink)', 'stroke-width': 0.01 * sc }),
      s('circle', { class: 'me-ring', r: 0.045 * sc, fill: 'var(--paper)', style: mini ? { strokeWidth: 0.025 } : null }),
      s('circle', { r: 0.022 * sc, fill: 'var(--ink)', class: 'me-core' }));
    if (tag && !mini) {
      const w = 0.03 + tag.length * 0.03;
      me.append(s('g', { class: 'me-tag', transform: 'translate(0.07 -0.135)' },
        s('rect', { width: w, height: 0.075, rx: 0.01 }),
        s('text', { x: w / 2, y: 0.052, 'text-anchor': 'middle' }, tag)));
    }
    gMe.append(me);
    return me;
  }
  function placeMe(x, y) {
    mePos.x = x; mePos.y = y;
    me.setAttribute('transform', `translate(${x.toFixed(4)} ${(-y).toFixed(4)})`);
  }

  const api = {
    el: wrap,
    svg,
    /** Population density from /api/stats, drawn as halftone dots. */
    setCrowd(stats) {
      gCrowd.replaceChildren();
      if (!stats || !stats.grid?.length) return;
      const bins = stats.bins, cell = 2 / bins;
      const max = Math.max(...stats.grid.map((c) => c[2]));
      for (const [bx, by, n] of stats.grid) {
        const cx = -1 + (bx + 0.5) * cell, cy = -1 + (by + 0.5) * cell;
        const r = (cell / 2) * 0.92 * Math.sqrt(n / max);
        if (r < 0.004) continue;
        gCrowd.append(s('circle', { cx: cx.toFixed(4), cy: cy.toFixed(4), r: r.toFixed(4) }));
      }
    },
    /** Bootstrap resample cloud. */
    setCloud(points, color = 'var(--ink)', animate = true) {
      gCloud.replaceChildren();
      points.forEach(([x, y], i) => {
        const c = s('circle', { cx: x.toFixed(4), cy: (-y).toFixed(4), r: 0.011, fill: color });
        if (animate) { c.style.opacity = '0'; c.style.transition = `opacity .4s ${300 + i * 6}ms`; setTimeout(() => { c.style.opacity = ''; }, 50); }
        gCloud.append(c);
      });
    },
    /** Lines from the dot to each pole, thickness ∝ that pole's score. */
    setTethers(scores, at) {
      gTether.replaceChildren();
      for (const k of ARCH_ORDER) {
        const [vx, vy] = pol(1, ARCH[k].angle);
        gTether.append(s('line', { class: 'tether', x1: at.x, y1: -at.y, x2: vx, y2: vy, stroke: ARCH[k].color,
          'stroke-width': (0.004 + scores[k] * 0.03).toFixed(4), 'stroke-dasharray': scores[k] < 0.5 ? '0.02 0.016' : null }));
      }
    },
    /** Chronological path through past runs (oldest first). */
    setTrail(points) {
      gTrail.replaceChildren();
      if (!points.length) return;
      if (points.length > 1) gTrail.append(s('polyline', { class: 'trail-line', points: pts(points.map((p) => [p.x, -p.y])) }));
      points.forEach((p, i) => {
        gTrail.append(s('circle', { class: 'trail-dot', cx: p.x, cy: -p.y, r: mini ? 0.06 : 0.04, fill: p.color || 'var(--paper)', style: p.color ? { fill: p.color } : null }));
        if (!mini) gTrail.append(s('text', { class: 'trail-num', x: p.x, y: -p.y }, String(i + 1)));
      });
    },
    setGhost(p, label) {
      gGhost.replaceChildren();
      if (!p) return;
      gGhost.append(s('circle', { cx: p.x, cy: -p.y, r: 0.04 }), s('text', { x: p.x + 0.06, y: -p.y + 0.015 }, label || 'before'));
    },
    setFriend(p, label, color) {
      gFriend.replaceChildren();
      if (!p) return;
      gFriend.append(
        s('line', { x1: mePos.x, y1: -mePos.y, x2: p.x, y2: -p.y, stroke: 'var(--ink)', 'stroke-width': 0.006, 'stroke-dasharray': '0.01 0.012' }),
        s('rect', { class: 'fdot', x: p.x - 0.04, y: -p.y - 0.04, width: 0.08, height: 0.08, fill: color || 'var(--B)', transform: `rotate(45 ${p.x} ${-p.y})` }),
        s('text', { x: p.x + 0.07, y: -p.y + 0.015 }, label || 'friend'));
    },
    /** Place the "you" marker; animates from its previous spot. */
    async setMe(p, { tag = null, animate = true, ms = 1200, bounce = true } = {}) {
      const fresh = !me;
      ensureMe(tag);
      if (fresh && !animate) { placeMe(p.x, p.y); return; }
      const fx = fresh ? 0 : mePos.x, fy = fresh ? 0 : mePos.y;
      await tween(ms, (t) => placeMe(fx + (p.x - fx) * t, fy + (p.y - fy) * t), bounce ? easeOutBack : undefined);
    },
    clearMe() { me?.remove(); me = null; },
    setLayer(name, on) {
      const g = { crowd: gCrowd, cloud: gCloud, tethers: gTether, trail: gTrail, ghost: gGhost, friend: gFriend }[name];
      if (g) g.style.display = on ? '' : 'none';
    },
    highlight(k) { for (const [kk, g] of Object.entries(wedges)) g.classList.toggle('on', kk === k); },
  };
  return api;
}
