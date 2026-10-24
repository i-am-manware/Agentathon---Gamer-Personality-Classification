/**
 * SPAWNPOINT — share card.
 *
 * Draws a 1200x630 PNG entirely on a canvas: no html2canvas, no image assets,
 * no server round-trip. The card is the screenshot people would have taken
 * anyway, except it is already cropped, already branded, and already legible
 * at feed size.
 *
 * It re-uses the same plane geometry as the live renderer so the card is
 * always a faithful picture of the result, never a stylised approximation.
 */

import { ARCHETYPES, ARCHETYPE_BY_KEY } from '/shared/archetypes.js';
import { buildInsight } from '/shared/insight.js';
import { alpha } from './dom.js';

export const CARD_W = 1200;
export const CARD_H = 630;

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const DISPLAY = '"Archivo Black", "Arial Black", system-ui, sans-serif';

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth, startSize, family, weight = '700') {
  let size = startSize;
  for (;;) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth || size <= 18) return size;
    size -= 2;
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} result  scoring payload
 * @param {{ x:number, y:number, color:string }} marker
 * @param {{ signature?:string, shareUrl?:string, username?:string }} [meta]
 */
export function drawShareCard(ctx, result, marker, meta = {}) {
  const W = CARD_W;
  const H = CARD_H;
  const primary = ARCHETYPE_BY_KEY[result.primary];
  const secondary = ARCHETYPE_BY_KEY[result.secondary];
  const least = ARCHETYPE_BY_KEY[result.least];
  const insight = buildInsight(result);
  const accent = marker.color || primary.color;

  /* --- background ------------------------------------------------------- */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#080b16');
  bg.addColorStop(0.55, '#05060d');
  bg.addColorStop(1, '#0a0714');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Corner glows keyed to the result's own archetype colour.
  const glow = ctx.createRadialGradient(W * 0.72, H * 0.42, 0, W * 0.72, H * 0.42, 420);
  glow.addColorStop(0, alpha(accent, 0.22));
  glow.addColorStop(1, alpha(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Graph paper.
  ctx.strokeStyle = 'rgba(90, 130, 200, 0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // Scanlines.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

  // Border.
  ctx.strokeStyle = 'rgba(160, 190, 255, 0.22)';
  ctx.lineWidth = 2;
  rr(ctx, 14, 14, W - 28, H - 28, 18);
  ctx.stroke();

  /* --- plane ------------------------------------------------------------ */
  drawCardPlane(ctx, result, marker, { cx: 838, cy: 316, r: 236 });

  /* --- left column ------------------------------------------------------ */
  const L = 66;
  let y = 74;

  // Brand
  ctx.textAlign = 'left';
  ctx.font = `600 15px ${MONO}`;
  ctx.fillStyle = 'rgba(109, 118, 147, 0.95)';
  ctx.fillText('S P A W N P O I N T', L, y);
  ctx.font = `500 12px ${MONO}`;
  ctx.fillStyle = 'rgba(109, 118, 147, 0.7)';
  ctx.fillText('THE PLAYSTYLE PLANE', L + 168, y);
  y += 34;

  ctx.strokeStyle = alpha(accent, 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L, y);
  ctx.lineTo(L + 54, y);
  ctx.stroke();
  y += 40;

  // Archetype glyph + name
  ctx.font = `400 40px ${DISPLAY}`;
  ctx.fillStyle = accent;
  ctx.fillText(primary.glyph, L, y + 6);

  const title = insight.title;
  const titleSize = fitText(ctx, title, W * 0.52, 62, DISPLAY, '900');
  ctx.font = `900 ${titleSize}px ${DISPLAY}`;
  ctx.fillStyle = '#e9edfa';
  ctx.fillText(title, L + 62, y + 12);
  y += titleSize + 30;

  // Tagline
  ctx.font = `italic 400 20px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = 'rgba(170, 179, 205, 0.92)';
  ctx.fillText(primary.tagline, L, y);
  y += 42;

  // Coordinate readout strip
  const coordY = y;
  ctx.font = `600 13px ${MONO}`;
  ctx.fillStyle = 'rgba(109, 118, 147, 0.95)';
  ctx.fillText('COORDINATE', L, coordY);
  ctx.fillText('INTENSITY', L + 168, coordY);
  ctx.fillText('BAND', L + 320, coordY);

  ctx.font = `700 26px ${MONO}`;
  ctx.fillStyle = '#4dd4ff';
  const coordText = `${result.x >= 0 ? '+' : '−'}${Math.abs(result.x).toFixed(2)}  ${result.y >= 0 ? '+' : '−'}${Math.abs(result.y).toFixed(2)}`;
  ctx.fillText(coordText, L, coordY + 32);
  ctx.fillStyle = '#e9edfa';
  ctx.fillText(`${Math.round(result.radius * 100)}%`, L + 168, coordY + 32);
  ctx.font = `700 20px ${MONO}`;
  ctx.fillStyle = accent;
  ctx.fillText(insight.band.toUpperCase(), L + 320, coordY + 30);
  y = coordY + 62;

  /* --- affinity bars ---------------------------------------------------- */
  const barW = 300;
  const barH = 9;
  const rowH = 26;
  const ranked = [...ARCHETYPES].sort((a, b) => result.affinities[b.key] - result.affinities[a.key]);

  for (const a of ranked) {
    const v = result.affinities[a.key];
    ctx.font = `600 12px ${MONO}`;
    ctx.fillStyle = a.key === result.primary ? '#e9edfa' : 'rgba(170, 179, 205, 0.8)';
    ctx.textAlign = 'left';
    ctx.fillText(a.short.toUpperCase(), L, y + 10);

    const trackX = L + 118;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    rr(ctx, trackX, y, barW, barH, barH / 2);
    ctx.fill();

    // Bars grow from the 50 baseline, so a bar over half reads as "above neutral".
    const half = barW / 2;
    const frac = (v - 50) / 50;
    const w = Math.abs(frac) * half;
    ctx.fillStyle = a.color;
    ctx.shadowColor = alpha(a.color, 0.7);
    ctx.shadowBlur = 10;
    rr(ctx, frac >= 0 ? trackX + half : trackX + half - w, y, Math.max(w, 1.5), barH, barH / 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(trackX + half, y - 2, 1, barH + 4);

    ctx.font = `700 13px ${MONO}`;
    ctx.fillStyle = '#e9edfa';
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(v)), trackX + barW + 34, y + 10);
    ctx.textAlign = 'left';

    y += rowH;
  }

  /* --- footer ----------------------------------------------------------- */
  const fy = H - 62;
  ctx.font = `600 13px ${MONO}`;
  ctx.fillStyle = 'rgba(109, 118, 147, 0.9)';
  ctx.fillText(`CALL SIGN  ${meta.signature || result.signature}`, L, fy);
  ctx.fillText(
    `${result.answeredCount}/${result.answeredCount + result.skippedCount} ANSWERED  ·  ${insight.summary.toUpperCase()}`,
    L,
    fy + 22,
  );

  if (meta.username) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(109, 118, 147, 0.9)';
    ctx.fillText(`@${meta.username}`, W - 66, fy);
    ctx.textAlign = 'left';
  }

  // Second-place note, bottom right, so the card says something even at thumbnail size.
  ctx.textAlign = 'right';
  ctx.font = `600 13px ${MONO}`;
  ctx.fillStyle = alpha(secondary.color, 0.95);
  ctx.fillText(`+ ${secondary.short.toUpperCase()} ${Math.round(result.affinities[secondary.key])}`, W - 66, fy + 22);
  ctx.fillStyle = 'rgba(109, 118, 147, 0.75)';
  ctx.font = `500 12px ${MONO}`;
  ctx.fillText(`THINNEST: ${least.short.toUpperCase()} ${Math.round(result.affinities[least.key])}`, W - 66, fy + 42);
  ctx.textAlign = 'left';
}

/** The plane, drawn inline so the card has no dependency on the live renderer. */
function drawCardPlane(ctx, result, marker, { cx, cy, r }) {
  const accent = marker.color || '#4dd4ff';

  ctx.save();
  ctx.translate(cx, cy);

  // Outer disc
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.12, 0, Math.PI * 2);
  const disc = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.12);
  disc.addColorStop(0, 'rgba(77, 212, 255, 0.07)');
  disc.addColorStop(1, 'rgba(77, 212, 255, 0)');
  ctx.fillStyle = disc;
  ctx.fill();

  // Sector wedges
  for (const a of ARCHETYPES) {
    const mid = (-a.angle * Math.PI) / 180;
    const half = Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, mid - half, mid + half);
    ctx.closePath();
    const g = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
    g.addColorStop(0, alpha(a.color, 0.0));
    g.addColorStop(1, alpha(a.color, 0.16));
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Rings
  ctx.strokeStyle = 'rgba(140, 175, 230, 0.14)';
  ctx.lineWidth = 1;
  for (const f of [0.33, 0.66, 1]) {
    ctx.beginPath();
    ctx.arc(0, 0, r * f, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Hexagon
  ctx.beginPath();
  ARCHETYPES.forEach((a, i) => {
    const t = (-a.angle * Math.PI) / 180;
    const x = Math.cos(t) * r;
    const y = Math.sin(t) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(77, 212, 255, 0.03)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(150, 200, 255, 0.5)';
  ctx.shadowColor = 'rgba(77, 212, 255, 0.6)';
  ctx.shadowBlur = 16;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Spokes + vertices
  for (const a of ARCHETYPES) {
    const t = (-a.angle * Math.PI) / 180;
    const ex = Math.cos(t) * r;
    const ey = Math.sin(t) * r;

    const g = ctx.createLinearGradient(0, 0, ex, ey);
    g.addColorStop(0, alpha(a.color, 0.05));
    g.addColorStop(1, alpha(a.color, 0.45));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(ex, ey);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(ex, ey, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#05060d';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = a.color;
    ctx.shadowColor = alpha(a.color, 0.85);
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(ex, ey, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = a.color;
    ctx.fill();

    // Labels
    const lx = Math.cos(t) * (r + 30);
    const ly = Math.sin(t) * (r + 30);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 12px ${MONO}`;
    ctx.fillStyle = a.color;
    ctx.fillText(a.short.toUpperCase(), lx, ly - 8);
    ctx.font = `400 15px ${DISPLAY}`;
    ctx.fillText(a.glyph, lx, ly + 9);
  }
  ctx.textBaseline = 'alphabetic';

  // Trail from origin
  const px = result.x * r;
  const py = -result.y * r;
  const tg = ctx.createLinearGradient(0, 0, px, py);
  tg.addColorStop(0, alpha(accent, 0));
  tg.addColorStop(1, alpha(accent, 0.75));
  ctx.strokeStyle = tg;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(px, py);
  ctx.stroke();

  // Halo + point
  const halo = ctx.createRadialGradient(px, py, 0, px, py, 46);
  halo.addColorStop(0, alpha(accent, 0.6));
  halo.addColorStop(1, alpha(accent, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(px, py, 46, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(px, py, 10, 0, Math.PI * 2);
  ctx.fillStyle = '#05060d';
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 24;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(px, py, 4.2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Crosshair
  ctx.strokeStyle = alpha(accent, 0.8);
  ctx.lineWidth = 1.5;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.beginPath();
    ctx.moveTo(px + dx * 16, py + dy * 16);
    ctx.lineTo(px + dx * 27, py + dy * 27);
    ctx.stroke();
  }

  ctx.restore();
}

/* -------------------------------------------------------------------------- */
/* Export                                                                     */
/* -------------------------------------------------------------------------- */

/** Render the card offscreen and return a PNG blob. */
export async function renderCardBlob(result, marker, meta = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');
  drawShareCard(ctx, result, marker, meta);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function cardFilename(result) {
  return `spawnpoint-${result.primary}-${result.signature.replace(/[^A-Za-z0-9]/g, '')}.png`;
}

/** Web Share API with a file, when the platform allows it. Falls back to download. */
export async function shareCard(result, marker, meta = {}) {
  const blob = await renderCardBlob(result, marker, meta);
  const file = new File([blob], cardFilename(result), { type: 'image/png' });
  const text = `${result.signature} · ${result.primary} at ${result.x.toFixed(2)}, ${result.y.toFixed(2)} on the Spawnpoint Playstyle Plane`;

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        title: 'My spawn point',
        text,
        url: meta.shareUrl,
        files: [file],
      });
      return { shared: true, blob };
    } catch (err) {
      if (err?.name === 'AbortError') return { shared: false, aborted: true, blob };
      // fall through to download
    }
  }

  downloadBlob(blob, cardFilename(result));
  return { shared: false, blob };
}
