// The share card: a 1200×630 PNG drawn entirely in canvas (no html2canvas,
// no dependencies). Also feeds the /#/card preview route.

import { ICONS } from '../ui.js';
import { POLE_RING, POLE_ANGLE, vertex, AXES } from '../../../shared/axes.js';
import { ARCHETYPES } from '../../../shared/archetypes.js';
import { slugify } from '../ui.js';

const W = 1200;
const H = 630;
const DPR = 2;

const BG = '#060a08';
const INK = '#d7ffe8';
const DIM = '#7fae93';
const PHOS = '#3dfa7e';
const LINE = '#1c3325';

const PS2P = '"Press Start 2P", monospace';
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

async function ensureFonts() {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load(`400 28px "Press Start 2P"`),
        document.fonts.load(`400 15px "IBM Plex Mono"`),
      ]),
      new Promise((r) => setTimeout(r, 1600)),
    ]);
  } catch {
    /* offline: monospace fallback kicks in */
  }
}

function drawPixelIcon(ctx, id, cx, cy, size, color) {
  const rows = ICONS[id];
  if (!rows) return;
  const cell = size / 12;
  ctx.fillStyle = color;
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === '#') {
        ctx.fillRect(Math.round(cx - size / 2 + x * cell), Math.round(cy - size / 2 + y * cell), Math.ceil(cell), Math.ceil(cell));
      }
    }
  }
}

function wrapTitle(ctx, text, maxWidth, font) {
  ctx.font = font;
  if (ctx.measureText(text).width <= maxWidth) return [text];
  const words = text.split(' ');
  let best = [text.slice(0, Math.ceil(text.length / 2))];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(ctx.measureText(a).width - ctx.measureText(b).width);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best;
}

export async function drawShareCard(canvas, { score, insight, host = 'localhost' }) {
  await ensureFonts();
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  const primary = ARCHETYPES[score.primary];
  const shareOf = (pole) => score.affinities.find((r) => r.id === pole)?.share ?? 0;
  const pctOf = (pole) => score.affinities.find((r) => r.id === pole)?.pct ?? 0;

  // background + grid + vignette
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(61,250,126,0.05)';
  ctx.lineWidth = 1;
  for (let x = 24; x < W; x += 24) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke();
  }
  for (let y = 24; y < H; y += 24) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke();
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 800);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // frame + corner ticks
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, W - 28, H - 28);
  ctx.strokeStyle = PHOS;
  ctx.lineWidth = 3;
  const t = 26;
  const corners = [[14, 14, 1, 1], [W - 14, 14, -1, 1], [14, H - 14, 1, -1], [W - 14, H - 14, -1, -1]];
  for (const [cx, cy, sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * t, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * t);
    ctx.stroke();
  }

  // header
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PHOS;
  ctx.font = `400 22px ${PS2P}`;
  ctx.fillText('SPAWN//POINT', 44, 64);
  ctx.fillStyle = DIM;
  ctx.font = `400 14px ${MONO}`;
  ctx.fillText('THE GAMER PERSONALITY DIAGNOSTIC', 46, 88);
  ctx.textAlign = 'right';
  ctx.fillText(`v1.0 · ${new Date().toISOString().slice(0, 10)}`, W - 44, 64);
  ctx.textAlign = 'left';

  // ---- left panel: the Great Map
  const cx = 258;
  const cy = 350;
  const R = 168;
  const toXY = (p) => ({ x: cx + R * p.x, y: cy - R * p.y });

  // sectors
  for (let i = 0; i < 6; i++) {
    const pole = POLE_RING[i];
    const next = POLE_RING[(i + 1) % 6];
    const a = toXY(vertex(pole));
    const b = toXY(vertex(next));
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.closePath();
    ctx.globalAlpha = 0.07 + shareOf(pole) * 0.3;
    ctx.fillStyle = ARCHETYPES[pole].color;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // outline
  ctx.beginPath();
  for (let i = 0; i <= 6; i++) {
    const v = toXY(vertex(POLE_RING[i % 6]));
    if (i === 0) ctx.moveTo(v.x, v.y);
    else ctx.lineTo(v.x, v.y);
  }
  ctx.strokeStyle = '#2a4a36';
  ctx.lineWidth = 2;
  ctx.stroke();
  // axis lines
  ctx.setLineDash([5, 7]);
  ctx.strokeStyle = 'rgba(127,174,147,0.35)';
  ctx.lineWidth = 1.5;
  for (const ax of AXES) {
    const a = toXY(vertex(ax.plus));
    const b = toXY(vertex(ax.minus));
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.setLineDash([]);
  // vertices
  for (const pole of POLE_RING) {
    const v = toXY(vertex(pole));
    const color = ARCHETYPES[pole].color;
    ctx.beginPath();
    ctx.arc(v.x, v.y, 9, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = BG;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawPixelIcon(ctx, pole, v.x, v.y, 15, BG);
    // label
    const ang = (POLE_ANGLE[pole] * Math.PI) / 180;
    const lx = cx + (R + 34) * Math.cos(ang);
    const lyy = cy - (R + 34) * Math.sin(ang);
    ctx.fillStyle = DIM;
    ctx.font = `400 12px ${MONO}`;
    ctx.textAlign = Math.cos(ang) > 0.35 ? 'left' : Math.cos(ang) < -0.35 ? 'right' : 'center';
    ctx.fillText(`${ARCHETYPES[pole].name} ${pctOf(pole)}%`, lx, lyy + 4);
  }
  ctx.textAlign = 'left';
  // spawn point
  const S = toXY(score.point);
  const glow = ctx.createRadialGradient(S.x, S.y, 2, S.x, S.y, 40);
  glow.addColorStop(0, primary.color);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(S.x, S.y, 40, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.arc(S.x, S.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = primary.color; ctx.fill();
  ctx.strokeStyle = BG; ctx.lineWidth = 3; ctx.stroke();

  // coords caption
  const fmt = (v) => (Math.abs(v) < 0.005 ? '±0.00' : (v > 0 ? '+' : '') + v.toFixed(2));
  ctx.fillStyle = DIM;
  ctx.font = `400 13px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(`SPAWN (${fmt(score.point.x)}, ${fmt(score.point.y)})`, cx, cy + R + 74);
  ctx.textAlign = 'left';

  // ---- right panel: identity + bars
  const RX = 560;
  const RW = W - RX - 60;
  ctx.fillStyle = primary.color;
  const titleFont = `400 30px ${PS2P}`;
  const lines = wrapTitle(ctx, insight.title, RW, titleFont);
  ctx.font = titleFont;
  let ty = 168;
  for (const line of lines) {
    ctx.fillText(line, RX, ty);
    ty += 44;
  }
  ctx.fillStyle = DIM;
  ctx.font = `italic 400 16px ${MONO}`;
  ctx.fillText(`${primary.name} × ${ARCHETYPES[score.secondary].name} · ${insight.chips.sector}`, RX, ty + 8);

  // bars
  let by = ty + 48;
  for (const pole of score.affinities.map((r) => r.id)) {
    const arch = ARCHETYPES[pole];
    const pct = pctOf(pole);
    drawPixelIcon(ctx, pole, RX + 10, by - 5, 17, arch.color);
    ctx.fillStyle = INK;
    ctx.font = `400 13px ${MONO}`;
    ctx.fillText(arch.name, RX + 30, by);
    ctx.fillStyle = DIM;
    ctx.textAlign = 'right';
    ctx.fillText(`${pct}%`, RX + RW, by);
    ctx.textAlign = 'left';
    // track
    ctx.fillStyle = '#0a1a10';
    ctx.fillRect(RX, by + 8, RW, 9);
    ctx.fillStyle = arch.color;
    ctx.fillRect(RX, by + 8, (RW * pct) / 100, 9);
    by += 40;
  }

  // chips
  ctx.fillStyle = PHOS;
  ctx.font = `400 13px ${MONO}`;
  ctx.fillText(
    `CONVICTION ${score.conviction.pct}% ${score.conviction.tier}`,
    RX,
    by + 14
  );
  ctx.fillStyle = DIM;
  ctx.fillText(`TERRITORY ${score.territory.label}`, RX, by + 36);

  // footer
  ctx.fillStyle = DIM;
  ctx.font = `400 12px ${MONO}`;
  ctx.fillText('spawnpoint — a gamer personality diagnostic', 44, H - 36);
  ctx.fillStyle = PHOS;
  ctx.font = `400 14px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(`find your coordinates → ${host}`, W - 44, H - 36);
  ctx.textAlign = 'left';

  return canvas;
}

export async function exportShareCard({ score, insight }) {
  const canvas = document.createElement('canvas');
  await drawShareCard(canvas, { score, insight, host: location.host });
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `spawnpoint_${slugify(insight.title)}.png`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(blob);
    }, 'image/png');
  });
}

export async function nativeShareCard({ score, insight }) {
  const canvas = document.createElement('canvas');
  await drawShareCard(canvas, { score, insight, host: location.host });
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return resolve(false);
      const file = new File([blob], `spawnpoint_${slugify(insight.title)}.png`, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'SPAWNPOINT', text: `${insight.title} — my gamer personality spawn` });
          return resolve(true);
        } catch (err) {
          if (err && err.name === 'AbortError') return resolve(true);
          return resolve(false);
        }
      }
      resolve(false);
    }, 'image/png');
  });
}
