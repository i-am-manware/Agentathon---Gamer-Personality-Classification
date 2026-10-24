/**
 * SPAWNPOINT — the Playstyle Plane renderer.
 *
 * A hand-written canvas star chart. Everything is drawn in *plane space*
 * (x, y in [-1, 1], y up) and mapped to the canvas at draw time, so the same
 * renderer serves the 260px quiz preview and the 640px results hero without a
 * single conditional.
 *
 * Draw order is deliberate: grid, sector wedges, hexagon, spokes, population
 * cloud, then the player. The player is always last and always on top.
 */

import { ARCHETYPES, ARCHETYPE_BY_KEY } from '/shared/archetypes.js';
import { alpha, clamp, lerp, easeOutCubic } from './dom.js';

const TAU = Math.PI * 2;

const DEFAULTS = {
  /** Extra room outside the unit circle for labels, in plane units. */
  pad: 0.3,
  showLabels: true,
  showGrid: true,
  showSectors: true,
  showPopulation: true,
  interactive: false,
  /** Draw the archetype name under each vertex rather than only the glyph. */
  fullLabels: false,
};

export class PlaneRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = { ...DEFAULTS, ...options };
    this.dpr = 1;

    /** @type {{x:number,y:number,primary?:string,color?:string,id?:string,source?:string}[]} */
    this.population = [];
    /** @type {{x:number,y:number,color:string,label:string}|null} */
    this.marker = null;
    /** @type {{x:number,y:number,color:string,label:string,ghost:boolean}[]} */
    this.ghosts = [];
    /** 0..1 reveal progress for the marker. */
    this.reveal = 1;
    /** 0..1 population-cloud fade. */
    this.cloudOpacity = 1;
    this.hovered = null;
    this._raf = null;
    this._t = 0;
    this._running = false;

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    if (this.opts.interactive) this._bindPointer();
    this.resize();
  }

  /* ---------------------------------------------------------------------- */
  /* Sizing                                                                  */
  /* ---------------------------------------------------------------------- */

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(rect.width || this.canvas.clientWidth || 300, 40);
    const cssH = Math.max(rect.height || this.canvas.clientHeight || 300, 40);
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.dpr = dpr;
    this.cssW = cssW;
    this.cssH = cssH;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  /** Plane units -> CSS pixels. */
  toScreen(x, y) {
    const r = this.radius;
    return { sx: this.cx + x * r, sy: this.cy - y * r };
  }

  get radius() {
    const half = Math.min(this.cssW, this.cssH) / 2;
    return half / (1 + this.opts.pad);
  }

  get cx() {
    return this.cssW / 2;
  }

  get cy() {
    return this.cssH / 2;
  }

  /* ---------------------------------------------------------------------- */
  /* Data                                                                    */
  /* ---------------------------------------------------------------------- */

  setPopulation(points) {
    this.population = Array.isArray(points) ? points : [];
    this.draw();
    return this;
  }

  setMarker(point) {
    this.marker = point || null;
    this.draw();
    return this;
  }

  setGhosts(list) {
    this.ghosts = Array.isArray(list) ? list.filter(Boolean) : [];
    this.draw();
    return this;
  }

  /** Animate the marker in from the centre. */
  animateReveal(ms = 1100) {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.reveal = 1;
      this.draw();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const step = (now) => {
        const t = clamp((now - start) / ms, 0, 1);
        this.reveal = easeOutCubic(t);
        this.draw();
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      this.reveal = 0;
      requestAnimationFrame(step);
    });
  }

  start() {
    if (this._running) return;
    this._running = true;
    const loop = () => {
      if (!this._running) return;
      this._t += 1 / 60;
      this.draw();
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
  }

  /* ---------------------------------------------------------------------- */
  /* Drawing                                                                 */
  /* ---------------------------------------------------------------------- */

  draw() {
    const ctx = this.ctx;
    const { cssW: w, cssH: h } = this;
    if (!w || !h) return;

    ctx.clearRect(0, 0, w, h);

    if (this.opts.showSectors) this.#drawSectors();
    if (this.opts.showGrid) this.#drawGrid();
    this.#drawHex();
    this.#drawSpokes();
    if (this.opts.showPopulation && this.population.length) this.#drawPopulation();
    this.#drawGhosts();
    this.#drawVertices();
    this.#drawMarker();
  }

  #drawSectors() {
    const ctx = this.ctx;
    const R = this.radius * 1.02;
    ctx.save();
    ctx.translate(this.cx, this.cy);

    // Each archetype owns a 60-degree wedge centred on its own angle.
    for (const a of ARCHETYPES) {
      const mid = (-a.angle * Math.PI) / 180; // canvas y is flipped
      const half = Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, mid - half, mid + half);
      ctx.closePath();
      const g = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
      g.addColorStop(0, alpha(a.color, 0.005));
      g.addColorStop(0.75, alpha(a.color, 0.055));
      g.addColorStop(1, alpha(a.color, 0.13));
      ctx.fillStyle = g;
      ctx.fill();
    }
    ctx.restore();
  }

  #drawGrid() {
    const ctx = this.ctx;
    const R = this.radius;
    ctx.save();
    ctx.translate(this.cx, this.cy);

    // Concentric rings at 0.25 / 0.5 / 0.75 / 1.0.
    ctx.strokeStyle = 'rgba(140, 175, 230, 0.13)';
    ctx.lineWidth = 1;
    for (const f of [0.25, 0.5, 0.75, 1]) {
      ctx.beginPath();
      ctx.arc(0, 0, R * f, 0, TAU);
      ctx.stroke();
    }

    // Cross hairs, faint.
    ctx.strokeStyle = 'rgba(140, 175, 230, 0.09)';
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(-R, 0);
    ctx.lineTo(R, 0);
    ctx.moveTo(0, -R);
    ctx.lineTo(0, R);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  #drawHex() {
    const ctx = this.ctx;
    const R = this.radius;
    ctx.save();
    ctx.translate(this.cx, this.cy);

    ctx.beginPath();
    ARCHETYPES.forEach((a, i) => {
      const t = (-a.angle * Math.PI) / 180;
      const x = Math.cos(t) * R;
      const y = Math.sin(t) * R;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    ctx.fillStyle = 'rgba(77, 212, 255, 0.022)';
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.42)';
    ctx.shadowColor = 'rgba(77, 212, 255, 0.5)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  #drawSpokes() {
    const ctx = this.ctx;
    const R = this.radius;
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.lineWidth = 1;

    for (const a of ARCHETYPES) {
      const t = (-a.angle * Math.PI) / 180;
      // The three opposing pairs get a solid line through the centre; each is
      // drawn twice (once from each end) which lands as one continuous axis.
      const g = ctx.createLinearGradient(0, 0, Math.cos(t) * R, Math.sin(t) * R);
      g.addColorStop(0, alpha(a.color, 0.06));
      g.addColorStop(1, alpha(a.color, 0.42));
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(t) * R, Math.sin(t) * R);
      ctx.stroke();
    }
    ctx.restore();
  }

  #drawPopulation() {
    const ctx = this.ctx;
    const R = this.radius;
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.globalAlpha = this.cloudOpacity;

    for (const p of this.population) {
      const color = p.color || ARCHETYPE_BY_KEY[p.primary]?.color || '#4dd4ff';
      const isHover = this.hovered && this.hovered.id === p.id;
      const r = isHover ? 5 : p.source === 'seed' ? 2.1 : 2.8;
      ctx.beginPath();
      ctx.arc(p.x * R, -p.y * R, r, 0, TAU);
      ctx.fillStyle = alpha(color, isHover ? 0.95 : p.source === 'seed' ? 0.34 : 0.6);
      ctx.fill();
      if (isHover) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  #drawGhosts() {
    const ctx = this.ctx;
    const R = this.radius;
    ctx.save();
    ctx.translate(this.cx, this.cy);

    for (const g of this.ghosts) {
      const sx = g.x * R;
      const sy = -g.y * R;
      ctx.beginPath();
      ctx.arc(sx, sy, 5, 0, TAU);
      ctx.strokeStyle = alpha(g.color || '#aab3cd', 0.85);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Ghost -> current connector, drawn later by the caller if desired.
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6, 0, TAU);
      ctx.fillStyle = alpha(g.color || '#aab3cd', 0.9);
      ctx.fill();
    }
    ctx.restore();
  }

  #drawVertices() {
    const ctx = this.ctx;
    const R = this.radius;
    const pulse = 0.5 + 0.5 * Math.sin(this._t * 1.6);

    ctx.save();
    ctx.translate(this.cx, this.cy);

    for (const a of ARCHETYPES) {
      const t = (-a.angle * Math.PI) / 180;
      const x = Math.cos(t) * R;
      const y = Math.sin(t) * R;

      // Node
      ctx.beginPath();
      ctx.arc(x, y, 6.5, 0, TAU);
      ctx.fillStyle = 'rgba(5, 6, 13, 0.9)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = alpha(a.color, 0.55 + 0.25 * pulse);
      ctx.shadowColor = alpha(a.color, 0.8);
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, TAU);
      ctx.fillStyle = a.color;
      ctx.fill();

      if (this.opts.showLabels) {
        // Push the label radially outward from the node.
        const lx = Math.cos(t) * (R + 22);
        const ly = Math.sin(t) * (R + 22);
        ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = a.color;
        ctx.globalAlpha = 0.95;
        ctx.fillText(a.glyph, lx, ly - (this.opts.fullLabels ? 9 : 0));
        if (this.opts.fullLabels) {
          ctx.font = '700 11px "Archivo Black", "Arial Black", system-ui, sans-serif';
          ctx.fillStyle = 'rgba(233, 237, 250, 0.82)';
          ctx.fillText(a.short.toUpperCase(), lx, ly + 8);
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
  }

  #drawMarker() {
    const m = this.marker;
    if (!m) return;

    const ctx = this.ctx;
    const R = this.radius;
    const p = this.reveal;

    // The point travels out from the centre as `reveal` runs 0 -> 1.
    const px = m.x * p;
    const py = m.y * p;
    const { sx, sy } = this.toScreen(px, py);
    const color = m.color || '#4dd4ff';

    ctx.save();

    // Trail from the origin.
    if (p > 0.02) {
      const o = this.toScreen(0, 0);
      const g = ctx.createLinearGradient(o.sx, o.sy, sx, sy);
      g.addColorStop(0, alpha(color, 0));
      g.addColorStop(1, alpha(color, 0.6));
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(o.sx, o.sy);
      ctx.lineTo(sx, sy);
      ctx.stroke();
    }

    // Expanding rings behind the point.
    if (p > 0.15) {
      for (let i = 0; i < 2; i++) {
        const phase = (this._t * 0.5 + i * 0.5) % 1;
        const rr = 8 + phase * 30;
        ctx.beginPath();
        ctx.arc(sx, sy, rr, 0, TAU);
        ctx.strokeStyle = alpha(color, (1 - phase) * 0.35 * p);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    }

    // Halo
    const halo = ctx.createRadialGradient(sx, sy, 0, sx, sy, 26);
    halo.addColorStop(0, alpha(color, 0.5 * p));
    halo.addColorStop(1, alpha(color, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(sx, sy, 26, 0, TAU);
    ctx.fill();

    // The point itself
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, TAU);
    ctx.fillStyle = '#05060d';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(sx, sy, 3, 0, TAU);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Crosshair ticks so the point reads as a plotted coordinate.
    ctx.strokeStyle = alpha(color, 0.7);
    ctx.lineWidth = 1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.beginPath();
      ctx.moveTo(sx + dx * 12, sy + dy * 12);
      ctx.lineTo(sx + dx * 20, sy + dy * 20);
      ctx.stroke();
    }

    ctx.restore();
  }

  /* ---------------------------------------------------------------------- */
  /* Pointer interaction                                                     */
  /* ---------------------------------------------------------------------- */

  _bindPointer() {
    const onMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      let best = null;
      let bestD = 14 * 14;
      for (const p of this.population) {
        const { sx, sy } = this.toScreen(p.x, p.y);
        const d = (sx - px) ** 2 + (sy - py) ** 2;
        if (d < bestD) {
          bestD = d;
          best = p;
        }
      }
      if (best?.id !== this.hovered?.id) {
        this.hovered = best;
        this.canvas.style.cursor = best ? 'pointer' : 'default';
        this.draw();
        this.onHover?.(best, best ? this.toScreen(best.x, best.y) : null);
      } else if (best) {
        this.onHover?.(best, this.toScreen(best.x, best.y));
      }
    };

    const onLeave = () => {
      if (!this.hovered) return;
      this.hovered = null;
      this.canvas.style.cursor = 'default';
      this.draw();
      this.onHover?.(null, null);
    };

    this.canvas.addEventListener('pointermove', onMove);
    this.canvas.addEventListener('pointerleave', onLeave);
    this._unbindPointer = () => {
      this.canvas.removeEventListener('pointermove', onMove);
      this.canvas.removeEventListener('pointerleave', onLeave);
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

/** Turn a scoring payload into the marker shape the renderer wants. */
export function markerFor(result, archetypes = ARCHETYPE_BY_KEY) {
  const a = archetypes[result.primary];
  return {
    x: result.x,
    y: result.y,
    color: a?.color || '#4dd4ff',
    label: a?.name || 'Unknown',
  };
}

/**
 * Map a raw population payload (from /api/population) into renderer points.
 * Kept here so the colour rule lives in exactly one place.
 */
export function populationPoints(rows) {
  return (rows || []).map((r) => ({
    id: r.id,
    x: r.x,
    y: r.y,
    primary: r.primary,
    source: r.source,
    color: ARCHETYPE_BY_KEY[r.primary]?.color,
  }));
}

export { lerp };
