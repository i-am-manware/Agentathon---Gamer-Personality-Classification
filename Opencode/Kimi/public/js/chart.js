'use strict';

/* ═══════════════════════════════════════════════════════════════════
   StarChart — the HEXAXIS plane renderer.
   A hexagonal star chart: six poles, three opposing axes, soul-stars
   of past readers, and the reader's own star with a drop-in reveal.

   Plain canvas, no dependencies. Shared by:
     · results screen (interactive, animated)
     · landing demo (ambient wanderer)
     · dashboard minis + compare overlay
     · PNG portrait export (static, hi-res)
   ═══════════════════════════════════════════════════════════════════ */

(function (global) {
  const TAU = Math.PI * 2;
  const RAD = (d) => (d * Math.PI) / 180;
  const AZURE = '#7cd4ff';
  const EMBER = '#ff8c5a';
  const GOLD = '#d8b26e';

  const reducedMotion = () =>
    global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hexPath(ctx, cx, cy, r, rotation = 0) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = RAD(i * 60) + rotation;
      const x = cx + r * Math.cos(a);
      const y = cy - r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  /** display coords for a result point: use raw angle, display radius */
  function dispXY(point) {
    const theta = Math.atan2(point.y, point.x);
    const r = point.rDisplay != null ? point.rDisplay : Math.hypot(point.x, point.y);
    return { ux: r * Math.cos(theta), uy: r * Math.sin(theta), theta };
  }

  function drawGlyph(ctx, glyph, cx, cy, size, color, glow) {
    const k = size / 100;
    const px = (p) => cx + (p[0] - 50) * k;
    const py = (p) => cy + (p[1] - 50) * k;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = Math.max(1, size / 34);
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = size / 4; }
    ctx.beginPath();
    for (const [a, b] of glyph.links) {
      ctx.moveTo(px(glyph.stars[a]), py(glyph.stars[a]));
      ctx.lineTo(px(glyph.stars[b]), py(glyph.stars[b]));
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = color;
    ctx.globalAlpha = 1;
    for (const s of glyph.stars) {
      ctx.beginPath();
      ctx.arc(px(s), py(s), Math.max(1.4, size / 22), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  class StarChart {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.opts = Object.assign({ mini: false, interactive: false, onPoleHover: null, onPoleLeave: null }, opts);
      this.content = null;
      this.souls = [];
      this.user = null;       // {ux, uy, color, label}
      this.compare = null;    // {a:{ux,uy}, b:{ux,uy}}
      this.hoverPole = null;
      this.t = 0;             // intro progress 0..1
      this.startedAt = 0;
      this._raf = null;
      this._destroyed = false;
      this._soulsData = [];
      this._resize = this._resize.bind(this);
      this._onMove = this._onMove.bind(this);

      if (global.ResizeObserver) {
        this._ro = new ResizeObserver(this._resize);
        this._ro.observe(canvas.parentElement || canvas);
      }
      if (this.opts.interactive) {
        canvas.addEventListener('mousemove', this._onMove);
        canvas.addEventListener('mouseleave', () => this._setHover(null));
        canvas.addEventListener('click', () => { if (this.hoverPole && this.opts.onPoleHover) this.opts.onPoleHover(this.hoverPole, null, null, true); });
      }
      this._resize();
    }

    setContent(content) { this.content = content; }
    setSouls(souls) {
      this._soulsData = souls || [];
      this.souls = this._soulsData.map((s, i) => {
        const d = dispXY({ x: s[0], y: s[1], rDisplay: s[2] });
        return { ux: d.ux, uy: d.uy, phase: (i * 0.618) % 1, size: 0.7 + ((i * 37) % 10) / 12 };
      });
      if (this.t >= 1) this._render(performance.now());
    }
    setUser(point, color = AZURE) {
      const d = dispXY(point);
      this.user = { ux: d.ux, uy: d.uy, color };
    }
    setCompare(a, b) {
      this.compare = {
        a: Object.assign(dispXY(a), { color: GOLD }),
        b: Object.assign(dispXY(b), { color: AZURE }),
      };
    }
    clearPoints() { this.user = null; this.compare = null; }

    play() {
      this.t = reducedMotion() ? 1 : 0;
      this.startedAt = performance.now();
      const loop = (now) => {
        if (this._destroyed) return;
        const dur = 1600;
        if (this.t < 1) this.t = Math.min(1, (now - this.startedAt) / dur);
        this._render(now);
        if (this.t < 1 || (!this.opts.mini && !reducedMotion())) {
          this._raf = requestAnimationFrame(loop);
        }
      };
      this._raf = requestAnimationFrame(loop);
    }

    destroy() {
      this._destroyed = true;
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this._ro) this._ro.disconnect();
    }

    /** Re-render the final state immediately (used by the souls toggle). */
    refresh() {
      this.t = 1;
      this._render(performance.now());
    }

    _resize() {
      const holder = this.canvas.parentElement;
      if (!holder) return;
      const rect = holder.getBoundingClientRect();
      const dpr = Math.min(2.5, global.devicePixelRatio || 1);
      this.w = Math.max(120, rect.width);
      this.h = Math.max(120, rect.height);
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.t >= 1) this._render(performance.now());
    }

    _geom() {
      const cx = this.w / 2;
      const cy = this.h / 2;
      let R = Math.min(this.w, this.h) * (this.opts.mini ? 0.44 : 0.36);
      // Shrink R until the east/west pole labels (the widest ones) fit inside
      // the canvas with a small margin — labels are drawn outside the rim.
      if (!this.opts.mini && this.content) {
        // Shrink R until every side label fits: pole x + glyph + gap + text ≤ edge.
        const ctx = this.ctx;
        for (const code of this.content.poleOrder) {
          const p = this.content.poles[code];
          const cos = Math.cos(RAD(p.angle));
          ctx.font = `700 ${Math.max(11, R * 0.075)}px Cinzel, serif`;
          const textW = ctx.measureText(p.name.toUpperCase()).width;
          const limit = (cx - 18 - textW) / (Math.abs(cos) + 0.16);
          R = Math.min(R, limit);
        }
        R = Math.max(R, Math.min(this.w, this.h) * 0.2);
      }
      return { cx, cy, R };
    }

    _onMove(e) {
      if (!this.content) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { cx, cy, R } = this._geom();
      let found = null;
      for (const code of this.content.poleOrder) {
        const p = this.content.poles[code];
        const px = cx + R * Math.cos(RAD(p.angle));
        const py = cy - R * Math.sin(RAD(p.angle));
        if (Math.hypot(mx - px, my - py) < Math.max(26, R * 0.14)) { found = code; break; }
      }
      this._setHover(found, e.clientX - rect.left, e.clientY - rect.top);
    }

    _setHover(code, x, y) {
      if (this.hoverPole === code) return;
      this.hoverPole = code;
      this.canvas.style.cursor = code ? 'pointer' : 'default';
      if (code && this.opts.onPoleHover) this.opts.onPoleHover(code, x, y, false);
      if (!code && this.opts.onPoleLeave) this.opts.onPoleLeave();
    }

    _render(now) {
      const { ctx } = this;
      const { cx, cy, R } = this._geom();
      const t = this.t;
      ctx.clearRect(0, 0, this.w, this.h);
      const time = now / 1000;

      // ── ambient center glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.35);
      g.addColorStop(0, 'rgba(84, 100, 180, 0.14)');
      g.addColorStop(1, 'rgba(84, 100, 180, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.w, this.h);

      // ── axis spokes (through opposing poles)
      if (this.content) {
        ctx.save();
        ctx.globalAlpha = 0.5 * t;
        for (const axis of this.content.axes) {
          const a = RAD(axis.angle);
          ctx.strokeStyle = 'rgba(164, 173, 201, 0.16)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx - R * Math.cos(a), cy + R * Math.sin(a));
          ctx.lineTo(cx + R * Math.cos(a), cy - R * Math.sin(a));
          ctx.stroke();
        }
        ctx.restore();
      }

      // ── rings (draw progressively with intro)
      const ringFracs = [1 / 3, 2 / 3, 1];
      ringFracs.forEach((f, i) => {
        const local = Math.max(0, Math.min(1, t * 1.6 - i * 0.18));
        if (local <= 0) return;
        ctx.save();
        ctx.globalAlpha = local;
        ctx.strokeStyle = i === 2 ? 'rgba(216, 178, 110, 0.5)' : 'rgba(216, 178, 110, 0.14)';
        ctx.lineWidth = i === 2 ? 1.4 : 1;
        if (i === 2) { ctx.shadowColor = 'rgba(216,178,110,.5)'; ctx.shadowBlur = 12; }
        const rr = R * f * local;
        hexPath(ctx, cx, cy, rr);
        ctx.stroke();
        ctx.restore();
      });

      // ── souls (past readers)
      if (this.souls.length && t > 0.25) {
        const soulT = Math.min(1, (t - 0.25) / 0.5);
        for (const s of this.souls) {
          const tw = 0.45 + 0.55 * Math.abs(Math.sin(time * 0.7 + s.phase * TAU));
          ctx.globalAlpha = 0.34 * soulT * tw;
          ctx.fillStyle = '#cfd8f5';
          ctx.beginPath();
          ctx.arc(cx + s.ux * R, cy - s.uy * R, s.size, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // ── poles
      if (this.content && t > 0.4) {
        const poleT = Math.min(1, (t - 0.4) / 0.4);
        ctx.globalAlpha = poleT;
        for (const code of this.content.poleOrder) {
          const p = this.content.poles[code];
          const px = cx + R * Math.cos(RAD(p.angle));
          const py = cy - R * Math.sin(RAD(p.angle));
          const hovered = this.hoverPole === code;
          const glyphSize = this.opts.mini ? R * 0.22 : R * 0.3 * (hovered ? 1.18 : 1);
          drawGlyph(ctx, p.glyph, px, py, glyphSize, p.color, hovered);
          if (!this.opts.mini) {
            const a = RAD(p.angle);
            const side = Math.cos(a) >= 0 ? 1 : -1; // every pole gets a side label
            const nameFont = Math.max(11, R * 0.075);
            const constFont = Math.max(8.5, R * 0.046);
            const gap = glyphSize / 2 + 10;
            const lx = px + gap * side;
            ctx.textAlign = side > 0 ? 'left' : 'right';
            ctx.fillStyle = hovered ? p.color : 'rgba(236, 226, 201, 0.92)';
            ctx.font = `700 ${nameFont}px Cinzel, serif`;
            ctx.fillText(p.name.toUpperCase(), lx, py + 2);
            ctx.fillStyle = hovered ? p.color : 'rgba(164, 173, 201, 0.62)';
            ctx.font = `${constFont}px "JetBrains Mono", monospace`;
            ctx.fillText(p.constellation.toUpperCase(), lx, py + nameFont * 0.95);
          }
        }
        ctx.globalAlpha = 1;
      }

      // ── center marker
      if (t > 0.35) {
        ctx.globalAlpha = Math.min(1, (t - 0.35) / 0.3) * 0.7;
        ctx.fillStyle = GOLD;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.2, 0, TAU);
        ctx.fill();
        if (!this.opts.mini && !(this.user && Math.hypot(this.user.ux, this.user.uy) < 0.3)) {
          ctx.fillStyle = 'rgba(164, 173, 201, 0.5)';
          ctx.font = `${Math.max(8, R * 0.042)}px "JetBrains Mono", monospace`;
          ctx.textAlign = 'center';
          ctx.fillText('THE STILL CENTER', cx, cy + R * 0.09);
        }
        ctx.globalAlpha = 1;
      }

      // ── compare points
      if (this.compare && t > 0.5) {
        const ct = Math.min(1, (t - 0.5) / 0.4);
        const { a, b } = this.compare;
        ctx.save();
        ctx.globalAlpha = ct * 0.75;
        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = 'rgba(236, 226, 201, 0.5)';
        ctx.beginPath();
        ctx.moveTo(cx + a.ux * R, cy - a.uy * R);
        ctx.lineTo(cx + b.ux * R, cy - b.uy * R);
        ctx.stroke();
        ctx.restore();
        for (const p of [a, b]) {
          ctx.globalAlpha = ct;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(cx + p.ux * R, cy - p.uy * R, 5.5, 0, TAU);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      }

      // ── user star
      if (this.user) {
        const dropStart = 0.55;
        const dt = Math.max(0, Math.min(1, (t - dropStart) / 0.35));
        if (dt > 0) {
          const ux = cx + this.user.ux * R;
          const uy = cy - this.user.uy * R;
          const ease = 1 - Math.pow(1 - dt, 3);
          const overshoot = dt < 1 ? 1 + 2.2 * (1 - ease) : 1;

          // shockwave
          if (dt > 0.15 && dt < 1) {
            const st = (dt - 0.15) / 0.85;
            ctx.globalAlpha = (1 - st) * 0.6;
            ctx.strokeStyle = this.user.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(ux, uy, 8 + st * R * 0.55, 0, TAU);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }

          // tether to center
          ctx.save();
          ctx.globalAlpha = 0.4 * ease;
          ctx.setLineDash([3, 6]);
          ctx.strokeStyle = this.user.color;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(ux, uy);
          ctx.stroke();
          ctx.restore();

          // glow + star
          const pulse = this.opts.mini ? 1 : 1 + 0.12 * Math.sin(time * 2.4);
          const gr = 15 * overshoot * pulse;
          const grad = ctx.createRadialGradient(ux, uy, 0, ux, uy, gr * 2.6);
          grad.addColorStop(0, this.user.color);
          grad.addColorStop(0.25, this.user.color + '88');
          grad.addColorStop(1, this.user.color + '00');
          ctx.globalAlpha = ease;
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(ux, uy, gr * 2.6, 0, TAU);
          ctx.fill();

          // 4-point sparkle
          const sr = 9 * overshoot * pulse;
          ctx.fillStyle = '#eaf7ff';
          ctx.beginPath();
          ctx.moveTo(ux, uy - sr);
          ctx.quadraticCurveTo(ux, uy, ux + sr, uy);
          ctx.quadraticCurveTo(ux, uy, ux, uy + sr);
          ctx.quadraticCurveTo(ux, uy, ux - sr, uy);
          ctx.quadraticCurveTo(ux, uy, ux, uy - sr);
          ctx.fill();
          ctx.globalAlpha = 1;

          if (!this.opts.mini && dt >= 1) {
            ctx.fillStyle = this.user.color;
            ctx.font = `700 ${Math.max(10, R * 0.055)}px "JetBrains Mono", monospace`;
            if (Math.hypot(this.user.ux, this.user.uy) < 0.3) {
              ctx.textAlign = 'left';
              ctx.fillText('YOU', ux + 16, uy + 4);
            } else {
              ctx.textAlign = 'center';
              ctx.fillText('YOU', ux, uy - 18);
            }
          }
        }
      }
    }
  }

  /* ── PNG portrait export ────────────────────────────────────────── */
  function exportPNG(result, content, souls) {
    const W = 1600, H = 1000;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    // bg
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#070b20');
    bg.addColorStop(0.55, '#0a1029');
    bg.addColorStop(1, '#050818');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    // starfield (deterministic-ish)
    let seed = 42;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 220; i++) {
      ctx.globalAlpha = 0.12 + rnd() * 0.5;
      ctx.fillStyle = rnd() > 0.85 ? '#f2d8a0' : '#cfd8f5';
      ctx.beginPath();
      ctx.arc(rnd() * W, rnd() * H, 0.4 + rnd() * 1.3, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // chart (left)
    const chart = new StarChart(document.createElement('canvas'), { mini: false });
    const size = 860;
    chart.canvas.width = size; chart.canvas.height = size;
    chart.w = size; chart.h = size;
    chart.ctx.setTransform(1, 0, 0, 1, 0, 0);
    chart.setContent(content);
    chart.setSouls(souls || []);
    chart.setUser(result.point, AZURE);
    chart.t = 1;
    chart._render(0);
    ctx.drawImage(chart.canvas, 40, 70);

    // right column
    const X = 960;
    ctx.textAlign = 'left';
    ctx.fillStyle = GOLD;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText('✦  H E X A X I S  ·  A  C A R T O G R A P H Y  O F  T H E  G A M E R  S O U L', X, 130);

    ctx.fillStyle = '#f2d8a0';
    ctx.font = '900 54px Cinzel, serif';
    wrapText(ctx, result.title, X, 200, 560, 60);
    const titleLines = Math.ceil(ctx.measureText(result.title).width / 560);
    let y = 200 + titleLines * 60;

    ctx.fillStyle = '#a4adc9';
    ctx.font = 'italic 24px Cinzel, serif';
    ctx.fillText(result.epithet, X, y + 14);
    y += 66;

    // conviction line
    ctx.fillStyle = '#ece2c9';
    ctx.font = '15px Sora, sans-serif';
    ctx.fillText(`Conviction ${result.conviction.value} · Consistency ${result.consistency.value}`, X, y);
    y += 40;

    // pole bars
    for (const code of content.poleOrder) {
      const p = content.poles[code];
      const val = result.poles[code].s;
      ctx.fillStyle = '#a4adc9';
      ctx.font = '600 15px Sora, sans-serif';
      ctx.fillText(p.name, X, y + 14);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, X + 130, y, 340, 12, 6);
      ctx.fill();
      ctx.fillStyle = p.color;
      roundRect(ctx, X + 130, y, Math.max(10, 340 * val), 12, 6);
      ctx.fill();
      ctx.fillStyle = '#ece2c9';
      ctx.font = '13px "JetBrains Mono", monospace';
      ctx.fillText(`${Math.round(val * 100)}%`, X + 490, y + 11);
      y += 34;
    }

    // footer
    ctx.fillStyle = 'rgba(164,173,201,0.75)';
    ctx.font = '13px "JetBrains Mono", monospace';
    ctx.fillText(`charted ${new Date(result.createdAt).toDateString()}  ·  your star awaits at the atlas`, X, H - 66);
    ctx.strokeStyle = 'rgba(216,178,110,0.35)';
    ctx.beginPath();
    ctx.moveTo(X, H - 90);
    ctx.lineTo(W - 60, H - 90);
    ctx.stroke();

    const a = document.createElement('a');
    a.download = `hexaxis-${result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y);
        line = word;
        y += lineH;
      } else line = test;
    }
    ctx.fillText(line, x, y);
  }

  global.StarChart = StarChart;
  global.HexaxisExport = { exportPNG };
})(window);
