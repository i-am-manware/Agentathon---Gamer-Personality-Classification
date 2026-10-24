const BG = '#06080b';
const PANEL = '#0c1118';
const LINE = '#1e2937';
const INK = '#e9f1f7';
const DIM = '#93a1b1';
const MUTED = '#5d6c7c';
const ACCENT = '#7cf7d0';

const W = 1080;
const H = 1350;

function polar(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(a) * radius, y: -Math.sin(a) * radius };
}

function hexPath(ctx, cx, cy, radius, archetypes) {
  const ring = [...archetypes].sort((a, b) => a.angle - b.angle);
  ring.forEach((a, i) => {
    const p = polar(a.angle, radius);
    if (i === 0) ctx.moveTo(cx + p.x, cy + p.y);
    else ctx.lineTo(cx + p.x, cy + p.y);
  });
  ctx.closePath();
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function glowDot(ctx, x, y, r, color, alpha = 1) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, hexAlpha(color, 0.9 * alpha));
  gradient.addColorStop(0.45, hexAlpha(color, 0.28 * alpha));
  gradient.addColorStop(1, hexAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function hexAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function fitText(ctx, text, fontFamily, weight, startSize, maxWidth, minSize = 26) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function wrapText(ctx, text, maxWidth, maxLines = 2) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (ctx.measureText(attempt).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = attempt;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length + 2) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, '') + ' …';
  }
  return lines;
}

export async function ensureFonts() {
  if (!document.fonts) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('16px "Press Start 2P"'),
        document.fonts.load('700 40px "IBM Plex Mono"'),
        document.fonts.load('400 22px "IBM Plex Mono"'),
        document.fonts.load('italic 400 24px "IBM Plex Mono"')
      ]),
      new Promise((resolve) => setTimeout(resolve, 2500))
    ]);
    await document.fonts.ready;
  } catch {
    /* system fallbacks are fine */
  }
}

export async function buildShareCard({ result, insight, archetypes, field, name, origin }) {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const colorOf = (key) => archetypes.find((a) => a.key === key)?.color || ACCENT;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const glowA = ctx.createRadialGradient(880, 120, 0, 880, 120, 640);
  glowA.addColorStop(0, hexAlpha(colorOf(result.dominant), 0.16));
  glowA.addColorStop(1, hexAlpha(colorOf(result.dominant), 0));
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, W, H);

  const glowB = ctx.createRadialGradient(120, 1240, 0, 120, 1240, 520);
  glowB.addColorStop(0, 'rgba(77,171,247,0.08)');
  glowB.addColorStop(1, 'rgba(77,171,247,0)');
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.022)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.018)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);
  const corner = 46;
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(28, 28 + corner);
  ctx.lineTo(28, 28);
  ctx.lineTo(28 + corner, 28);
  ctx.moveTo(W - 28 - corner, 28);
  ctx.lineTo(W - 28, 28);
  ctx.lineTo(W - 28, 28 + corner);
  ctx.moveTo(W - 28, H - 28 - corner);
  ctx.lineTo(W - 28, H - 28);
  ctx.lineTo(W - 28 - corner, H - 28);
  ctx.moveTo(28 + corner, H - 28);
  ctx.lineTo(28, H - 28);
  ctx.lineTo(28, H - 28 - corner);
  ctx.stroke();

  ctx.textBaseline = 'alphabetic';
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 4;
  roundRect(ctx, 72, 72, 46, 34, 8);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(95, 89, 9, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd43b';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(95, 89, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ff4d6d';
  ctx.fill();
  ctx.fillRect(106, 106, 12, 5);

  ctx.fillStyle = INK;
  ctx.font = '22px "Press Start 2P", monospace';
  ctx.fillText('PIXEL PSYCHE', 138, 98);
  ctx.fillStyle = MUTED;
  ctx.font = '18px "IBM Plex Mono", monospace';
  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const rightTag = `PLAYER DNA REPORT // ${reportDate}`;
  ctx.fillText(rightTag, W - 72 - ctx.measureText(rightTag).width, 96);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, 132);
  ctx.lineTo(W - 72, 132);
  ctx.stroke();

  ctx.fillStyle = '#ffd43b';
  ctx.font = '20px "Press Start 2P", monospace';
  ctx.fillText(insight.eyebrow, 72, 190);

  const titleSize = fitText(ctx, insight.title.toUpperCase(), '"IBM Plex Mono", monospace', 700, 66, W - 144, 34);
  ctx.font = `700 ${titleSize}px "IBM Plex Mono", monospace`;
  ctx.fillStyle = INK;
  ctx.fillText(insight.title.toUpperCase(), 72, 268);

  ctx.font = '22px "IBM Plex Mono", monospace';
  ctx.fillStyle = DIM;
  const subline = `${insight.dominantName} PRIMARY // ${insight.secondaryName} SECONDARY${name ? ` // @${name}` : ''}`;
  ctx.fillText(subline, 72, 312);

  const planeCx = 330;
  const planeCy = 820;
  const planeR = 190;

  ctx.fillStyle = MUTED;
  ctx.font = '15px "Press Start 2P", monospace';
  ctx.fillText('YOUR COORDINATE', 72, 372);

  for (const frac of [0.3333, 0.6666, 1]) {
    ctx.beginPath();
    hexPath(ctx, planeCx, planeCy, planeR * frac, archetypes);
    ctx.strokeStyle = frac === 1 ? '#2b3a4d' : '#1a2431';
    ctx.lineWidth = frac === 1 ? 2 : 1.5;
    ctx.stroke();
  }

  for (const a of archetypes) {
    const p = polar(a.angle, planeR);
    ctx.beginPath();
    ctx.moveTo(planeCx, planeCy);
    ctx.lineTo(planeCx + p.x, planeCy + p.y);
    ctx.strokeStyle = '#141d28';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (field?.points?.length) {
    let points = field.points;
    if (points.length > 420) {
      const step = points.length / 420;
      const sampled = [];
      for (let i = 0; i < 420; i++) sampled.push(points[Math.floor(i * step)]);
      points = sampled;
    }
    for (const [px, py, a] of points) {
      const color = archetypes[a]?.color || MUTED;
      ctx.fillStyle = hexAlpha(color, 0.38);
      ctx.beginPath();
      ctx.arc(planeCx + px * planeR, planeCy - py * planeR, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const a of archetypes) {
    const p = polar(a.angle, planeR);
    const x = planeCx + p.x;
    const y = planeCy + p.y;
    const color = colorOf(a.key);
    glowDot(ctx, x, y, 26, color, result.dominant === a.key ? 0.85 : 0.4);
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#070a0e';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    const labelPos = polar(a.angle, planeR + 36);
    const lx = planeCx + labelPos.x;
    const ly = planeCy + labelPos.y + 5;
    ctx.font = '13px "Press Start 2P", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = Math.abs(p.x) < 1 ? 'center' : p.x > 0 ? 'left' : 'right';
    ctx.fillText(a.name, lx, ly);
    ctx.textAlign = 'left';
  }

  const pointX = planeCx + result.coord.x * planeR;
  const pointY = planeCy - result.coord.y * planeR;
  const dColor = colorOf(result.dominant);

  ctx.strokeStyle = hexAlpha(dColor, 0.5);
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 6]);
  ctx.beginPath();
  ctx.moveTo(planeCx, planeCy);
  ctx.lineTo(pointX, pointY);
  ctx.stroke();
  ctx.setLineDash([]);

  glowDot(ctx, pointX, pointY, 58, dColor, 1);
  ctx.beginPath();
  ctx.setLineDash([6, 5]);
  ctx.arc(pointX, pointY, 21, 0, Math.PI * 2);
  ctx.strokeStyle = dColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);

  const bracket = 15;
  const gap = 27;
  ctx.strokeStyle = dColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pointX - gap, pointY - gap + bracket);
  ctx.lineTo(pointX - gap, pointY - gap);
  ctx.lineTo(pointX - gap + bracket, pointY - gap);
  ctx.moveTo(pointX + gap - bracket, pointY - gap);
  ctx.lineTo(pointX + gap, pointY - gap);
  ctx.lineTo(pointX + gap, pointY - gap + bracket);
  ctx.moveTo(pointX + gap, pointY + gap - bracket);
  ctx.lineTo(pointX + gap, pointY + gap);
  ctx.lineTo(pointX + gap - bracket, pointY + gap);
  ctx.moveTo(pointX - gap + bracket, pointY + gap);
  ctx.lineTo(pointX - gap, pointY + gap);
  ctx.lineTo(pointX - gap, pointY + gap - bracket);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pointX, pointY, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = dColor;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  const barsX = 650;
  const barsW = W - 72 - barsX;
  const barsTop = 430;
  const rowGap = 128;
  const sorted = [...result.scores].sort((a, b) => b.pct - a.pct);

  ctx.fillStyle = MUTED;
  ctx.font = '15px "Press Start 2P", monospace';
  ctx.fillText('SIX-AXIS BREAKDOWN', barsX, 372);

  sorted.forEach((score, index) => {
    const y = barsTop + index * rowGap;
    const color = colorOf(score.key);
    const name = archetypes.find((a) => a.key === score.key)?.name || score.key;
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.fillStyle = color;
    ctx.fillText(name, barsX, y);

    ctx.font = '700 30px "IBM Plex Mono", monospace';
    ctx.fillStyle = INK;
    const pctText = `${Math.round(score.pct)}%`;
    ctx.fillText(pctText, W - 72 - ctx.measureText(pctText).width, y + 2);

    roundRect(ctx, barsX, y + 18, barsW, 20, 4);
    ctx.fillStyle = '#04070a';
    ctx.fill();
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const fillW = Math.max(6, (barsW - 6) * (score.pct / 100));
    roundRect(ctx, barsX + 3, y + 21, fillW, 14, 3);
    const grad = ctx.createLinearGradient(barsX, 0, barsX + fillW, 0);
    grad.addColorStop(0, hexAlpha(color, 0.35));
    grad.addColorStop(1, color);
    ctx.fillStyle = grad;
    ctx.fill();
  });

  ctx.strokeStyle = LINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, 1122);
  ctx.lineTo(W - 72, 1122);
  ctx.stroke();

  ctx.fillStyle = '#ffd43b';
  ctx.font = '14px "Press Start 2P", monospace';
  ctx.fillText('SIGNATURE MOVE', 72, 1168);
  ctx.font = 'italic 400 25px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#c6d3de';
  const signatureLines = wrapText(ctx, insight.signature, W - 144, 2);
  signatureLines.forEach((line, i) => ctx.fillText(line, 72, 1204 + i * 34));

  const clarityText = `SIGNAL CLARITY ${result.confidence}%  //  ${result.tier.name}  //  6 ARCHETYPES, 25 QUESTIONS`;
  ctx.font = '19px "IBM Plex Mono", monospace';
  ctx.fillStyle = MUTED;
  ctx.fillText(clarityText, 72, 1286);

  const urlText = origin || 'PIXEL PSYCHE';
  ctx.font = '19px "IBM Plex Mono", monospace';
  ctx.fillStyle = ACCENT;
  ctx.fillText(urlText, 72, 1318);
  ctx.fillStyle = MUTED;
  const tagline = 'no two players chart alike';
  ctx.fillText(tagline, W - 72 - ctx.measureText(tagline).width, 1318);

  return canvas;
}

export function cardToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

export async function downloadShareCard(opts) {
  const canvas = await buildShareCard(opts);
  const blob = await cardToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pixel-psyche-${opts.result.dominant}-${Date.now()}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return blob;
}

export async function copyShareCard(opts) {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') return false;
  const canvas = await buildShareCard(opts);
  const blob = await cardToBlob(canvas);
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function shareCardFile(opts) {
  if (!navigator.canShare) return false;
  const canvas = await buildShareCard(opts);
  const blob = await cardToBlob(canvas);
  const file = new File([blob], 'pixel-psyche.png', { type: 'image/png' });
  if (!navigator.canShare({ files: [file] })) return false;
  try {
    await navigator.share({
      files: [file],
      title: 'PIXEL PSYCHE — Player DNA Report',
      text: `I charted as ${opts.insight.title} on the Pixel Psyche plane.`
    });
    return true;
  } catch {
    return false;
  }
}
