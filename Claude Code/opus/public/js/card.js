// Share card: a 1080×1350 risograph "specimen card" painted on <canvas>.
// Hand-drawn with the 2D API (not an SVG screenshot) so web fonts render
// correctly and the export works offline.
import { ARCH, ARCH_ORDER } from '/shared/engine.js';
import { drawGlyph } from './glyphs.js';

const W = 1080, H = 1350;
const PAPER = '#F3EDE0', INK = '#1E1B18', INK2 = '#4B453C';
const RAD = Math.PI / 180;
const F = {
  display: '"Bricolage Grotesque", "Arial Narrow", sans-serif',
  mono: '"Space Mono", ui-monospace, Menlo, monospace',
  serif: '"Fraunces", Georgia, serif',
};

export async function ensureFonts() {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`800 120px ${F.display}`), document.fonts.load(`600 40px ${F.display}`),
      document.fonts.load(`400 24px ${F.mono}`), document.fonts.load(`700 24px ${F.mono}`),
      document.fonts.load(`italic 400 40px ${F.serif}`),
    ]);
  } catch { /* fall back to system fonts */ }
}

function grain(ctx, seed = 7) {
  let a = seed;
  const rnd = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.save();
  for (let i = 0; i < 14000; i++) {
    ctx.fillStyle = `rgba(90,75,55,${(rnd() * 0.11).toFixed(3)})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
  }
  ctx.restore();
}

function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

// Note: assigning ctx.font resets ctx.fontStretch, so stretch is re-applied each time.
function setFont(ctx, font, stretch = 'normal') {
  ctx.font = font;
  if ('fontStretch' in ctx) ctx.fontStretch = stretch;
}

function fitFont(ctx, text, weight, family, maxSize, maxW, stretch) {
  let size = maxSize;
  do { setFont(ctx, `${weight} ${size}px ${family}`, stretch); size -= 4; } while (ctx.measureText(text).width > maxW && size > 30);
  return size + 4;
}

const pol = (cx, cy, r, deg) => [cx + r * Math.cos(deg * RAD), cy - r * Math.sin(deg * RAD)];

function hexPath(ctx, cx, cy, r) {
  ctx.beginPath();
  ARCH_ORDER.forEach((k, i) => { const [x, y] = pol(cx, cy, r, ARCH[k].angle); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  ctx.closePath();
}

function drawPlane(ctx, r, cx, cy, R) {
  // wedges: tint + halftone
  for (const k of ARCH_ORDER) {
    const a = ARCH[k].angle;
    const kite = [[cx, cy], pol(cx, cy, R * Math.cos(30 * RAD), a - 30), pol(cx, cy, R, a), pol(cx, cy, R * Math.cos(30 * RAD), a + 30)];
    ctx.save();
    ctx.beginPath();
    kite.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.globalAlpha = 0.2; ctx.fillStyle = ARCH[k].color; ctx.fill();
    ctx.clip();
    ctx.globalAlpha = 0.55;
    const step = 11;
    for (let y = cy - R; y < cy + R; y += step) {
      for (let x = cx - R; x < cx + R; x += step) {
        ctx.beginPath(); ctx.arc(x + ((y / step) % 2 ? step / 2 : 0), y, 2.1, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  // rings + spokes
  ctx.save();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]); ctx.globalAlpha = 0.5;
  for (const f of [0.25, 0.5, 0.75]) { hexPath(ctx, cx, cy, R * f); ctx.stroke(); }
  ctx.setLineDash([]);
  for (const k of ['A', 'B', 'C']) {
    const [x1, y1] = pol(cx, cy, R, ARCH[k].angle), [x2, y2] = pol(cx, cy, R, ARCH[k].angle + 180);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  ctx.restore();
  ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.lineJoin = 'round'; hexPath(ctx, cx, cy, R); ctx.stroke(); ctx.restore();

  // cloud
  ctx.save(); ctx.fillStyle = INK; ctx.globalAlpha = 0.3;
  for (const [x, y] of r.cloud || []) { ctx.beginPath(); ctx.arc(cx + x * R, cy - y * R, 3.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();

  // tethers
  ctx.save(); ctx.lineCap = 'round';
  const px = cx + r.point.x * R, py = cy - r.point.y * R;
  for (const k of ARCH_ORDER) {
    const [vx, vy] = pol(cx, cy, R, ARCH[k].angle);
    ctx.strokeStyle = ARCH[k].color; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5 + r.scores[k] * 9;
    ctx.setLineDash(r.scores[k] < 0.5 ? [8, 7] : []);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(vx, vy); ctx.stroke();
  }
  ctx.restore();

  // vertex badges
  for (const k of ARCH_ORDER) {
    const [x, y] = pol(cx, cy, R + 34, ARCH[k].angle);
    ctx.save();
    ctx.fillStyle = ARCH[k].color; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    drawGlyph(ctx, k, x, y, 30, INK, 2.2);
    ctx.fillStyle = INK; ctx.font = `700 19px ${F.mono}`;
    const label = `${ARCH[k].name.toUpperCase()} ${Math.round(r.scores[k] * 100)}`;
    const a = ARCH[k].angle;
    if (a === 90 || a === -90) { ctx.textAlign = 'left'; ctx.fillText(label, x + 36, y + 7); }
    else if (x < cx) { ctx.textAlign = 'right'; ctx.fillText(label, x + 26, y + 50); }
    else { ctx.textAlign = 'left'; ctx.fillText(label, x - 26, y + 50); }
    ctx.restore();
  }

  // the dot
  ctx.save();
  ctx.strokeStyle = INK; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(px - 30, py); ctx.lineTo(px + 30, py); ctx.moveTo(px, py - 30); ctx.lineTo(px, py + 30); ctx.stroke();
  ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(px, py, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = ARCH.D.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 26, 0, Math.PI * 2); ctx.stroke();
  // tag
  ctx.font = `700 18px ${F.mono}`;
  const tw = ctx.measureText('YOU').width + 18;
  ctx.fillStyle = INK; ctx.fillRect(px + 22, py - 52, tw, 30);
  ctx.fillStyle = PAPER; ctx.textAlign = 'left'; ctx.fillText('YOU', px + 31, py - 31);
  ctx.restore();
}

function drawAxes(ctx, r, y0) {
  const left = 70, right = W - 70, mid = W / 2, half = 230;
  r.axes.forEach((ax, i) => {
    const y = y0 + i * 66;
    ctx.save();
    ctx.font = `800 30px ${F.display}`; ctx.fillStyle = INK;
    ctx.textAlign = 'left'; ctx.fillText(ARCH[ax.a].name, left, y + 24);
    const aw = ctx.measureText(ARCH[ax.a].name).width;
    ctx.textAlign = 'right'; ctx.fillText(ARCH[ax.b].name, right, y + 24);
    const bw = ctx.measureText(ARCH[ax.b].name).width;
    ctx.font = `700 20px ${F.mono}`; ctx.fillStyle = INK2;
    ctx.textAlign = 'left'; ctx.fillText(String(Math.round(ax.sa * 100)), left + aw + 10, y + 23);
    ctx.textAlign = 'right'; ctx.fillText(String(Math.round(ax.sb * 100)), right - bw - 10, y + 23);
    // bipolar track
    const ty = y + 2, th = 26;
    ctx.fillStyle = PAPER; ctx.fillRect(mid - half, ty, half * 2, th);
    ctx.fillStyle = ARCH[ax.a].color; ctx.fillRect(mid - half * ax.sa, ty, half * ax.sa, th);
    ctx.fillStyle = ARCH[ax.b].color; ctx.fillRect(mid, ty, half * ax.sb, th);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(mid - half, ty, half * 2, th);
    ctx.beginPath(); ctx.moveTo(mid, ty - 6); ctx.lineTo(mid, ty + th + 6); ctx.stroke();
    ctx.restore();
  });
}

function drawStrip(ctx, strip, y) {
  const left = 90, width = W - 180, n = strip.length, gap = 4;
  const bw = (width - gap * (n - 1)) / n;
  strip.forEach((k, i) => {
    const x = left + i * (bw + gap);
    ctx.fillStyle = k ? ARCH[k].color : '#C9C0AE';
    ctx.fillRect(x, y, bw, 46);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, 46);
  });
}

/** Paint the card. `r` = engine analysis, `meta` = { code, origin }. */
export async function renderCard(canvas, r, meta) {
  await ensureFonts();
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  grain(ctx);

  // frame
  ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.strokeRect(34, 34, W - 68, H - 68);

  // header
  ctx.fillStyle = INK; ctx.font = `800 34px ${F.display}`; ctx.textAlign = 'left';
  ctx.fillText('PLAYERPRINT', 70, 96);
  ctx.font = `400 20px ${F.mono}`; ctx.textAlign = 'right';
  ctx.fillText(`SPECIMEN Nº ${meta.code.toUpperCase()}`, W - 70, 94);
  ctx.fillRect(70, 116, W - 140, 3);

  // title (two-ink misregistered overprint)
  const name = r.title.replace(/^The\s+/i, '').toUpperCase();
  ctx.textAlign = 'left';
  ctx.font = `italic 400 40px ${F.serif}`; ctx.fillStyle = INK2;
  ctx.fillText('I am the', 70, 176);
  const size = fitFont(ctx, name, 800, F.display, 176, W - 150, 'condensed');
  const ty = 176 + size * 0.88;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const c1 = ARCH[r.primary].color;
  const c2 = r.hybrid ? ARCH[r.secondary].color : r.primary === 'A' ? ARCH.D.color : ARCH.A.color;
  ctx.fillStyle = c1; ctx.fillText(name, 70 - 5, ty + 3);
  ctx.fillStyle = c2; ctx.globalAlpha = 0.62; ctx.fillText(name, 70 + 5, ty - 4);
  ctx.restore();

  // tagline
  setFont(ctx, `italic 400 32px ${F.serif}`);
  ctx.fillStyle = INK;
  const lines = wrapText(ctx, meta.tagline, W - 140).slice(0, 2);
  lines.forEach((l, i) => ctx.fillText(l, 70, ty + 52 + i * 40));
  const tagBottom = ty + 52 + (lines.length - 1) * 40;

  // Lay out bottom-up so long titles/taglines shrink the plane, never overlap.
  const stripY = H - 108 - 34 - 46;
  const axesY = stripY - 44 - 162;
  const planeTop = tagBottom + 30;
  const R = Math.max(140, Math.min(215, (axesY - 24 - planeTop - 120) / 2));
  drawPlane(ctx, r, W / 2, planeTop + 60 + R, R);
  drawAxes(ctx, r, axesY);
  drawStrip(ctx, r.strip, stripY);

  // footer
  ctx.fillStyle = INK; ctx.fillRect(70, H - 108, W - 140, 3);
  ctx.font = `700 21px ${F.mono}`; ctx.textAlign = 'left';
  ctx.fillText('FIND YOUR PLACE ON THE ATLAS →', 70, H - 66);
  ctx.textAlign = 'right'; ctx.font = `400 21px ${F.mono}`;
  ctx.fillText(meta.origin.replace(/^https?:\/\//, ''), W - 70, H - 66);
  return canvas;
}

