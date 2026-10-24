import { ARCHETYPES } from './scoring.js';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function wrap(text, maxChars) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fmt(n) {
  const v = Number(n) || 0;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
}

function at(angle, radius, cx, cy) {
  const rad = (angle * Math.PI) / 180;
  return [cx + Math.cos(rad) * radius, cy - Math.sin(rad) * radius];
}

function planeMarkup(profile, cx, cy, radius) {
  const parts = [];
  for (const ring of [0.34, 0.66, 1]) {
    const pts = ARCHETYPES.map((a) => at(a.angle, radius * ring, cx, cy).map((n) => n.toFixed(1)).join(','));
    parts.push(`<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(243,238,228,0.18)" stroke-width="1"/>`);
  }
  for (const arch of ARCHETYPES) {
    if (arch.pole !== 1) continue;
    const opp = ARCHETYPES.find((a) => a.pair === arch.pair && a.pole === -1);
    const [x1, y1] = at(arch.angle, radius, cx, cy);
    const [x2, y2] = at(opp.angle, radius, cx, cy);
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(243,238,228,0.12)" stroke-width="1"/>`);
  }

  const radar = ARCHETYPES.map((a) => {
    const r = (profile.affinity?.[a.id] || 0) * radius * 0.92;
    return at(a.angle, r, cx, cy).map((n) => n.toFixed(1)).join(',');
  });
  parts.push(`<polygon points="${radar.join(' ')}" fill="rgba(226,255,77,0.12)" stroke="#f3eee4" stroke-width="1.4"/>`);

  const jx = cx + profile.point.x * radius;
  const jy = cy - profile.point.y * radius;
  const highlight = new Set(profile.highlight || []);
  for (const id of profile.leaders || []) {
    const arch = ARCHETYPES.find((a) => a.id === id);
    if (!arch) continue;
    const [x, y] = at(arch.angle, radius * 0.94, cx, cy);
    parts.push(`<line x1="${jx.toFixed(1)}" y1="${jy.toFixed(1)}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${arch.color}" stroke-width="1.6"/>`);
  }
  for (const arch of ARCHETYPES) {
    const [x, y] = at(arch.angle, radius, cx, cy);
    const on = highlight.size === 0 || highlight.has(arch.id);
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${on ? 4.2 : 2.6}" fill="${on ? arch.color : 'rgba(243,238,228,0.35)'}"/>`);
  }
  parts.push(`<circle cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" r="10" fill="rgba(226,255,77,0.25)" filter="url(#glow)"/>`);
  parts.push(`<circle cx="${jx.toFixed(1)}" cy="${jy.toFixed(1)}" r="5.5" fill="#e2ff4d"/>`);
  parts.push(`<circle cx="${cx}" cy="${cy}" r="2" fill="rgba(243,238,228,0.45)"/>`);
  return parts.join('');
}

function meter(pair, x, y, width) {
  const posW = Math.max(0, Math.min(100, pair.pos.score));
  const negW = Math.max(0, Math.min(100, pair.neg.score));
  const h = 8;
  return `
    <text x="${x}" y="${y}" fill="#a39888" font-family="Segoe UI, Arial, sans-serif" font-size="12">${esc(pair.pos.label)} ${posW}</text>
    <text x="${x + width}" y="${y}" fill="#a39888" font-family="Segoe UI, Arial, sans-serif" font-size="12" text-anchor="end">${negW} ${esc(pair.neg.label)}</text>
    <text x="${x + width / 2}" y="${y}" fill="#6f675c" font-family="Segoe UI, Arial, sans-serif" font-size="11" text-anchor="middle" letter-spacing="1.5">${esc(pair.label.toUpperCase())}</text>
    <rect x="${x}" y="${y + 8}" width="${width}" height="${h}" fill="rgba(243,238,228,0.06)" stroke="rgba(243,238,228,0.2)"/>
    <rect x="${x}" y="${y + 8}" width="${(width * posW) / 100}" height="${h}" fill="${pair.pos.color}" opacity="0.9"/>
    <rect x="${x + width - (width * negW) / 100}" y="${y + 8}" width="${(width * negW) / 100}" height="${h}" fill="${pair.neg.color}" opacity="0.9"/>
  `;
}

export function renderCard(profile) {
  const titleSize = profile.title.length > 20 ? 38 : 46;
  const pullLines = wrap(profile.pull, 38).slice(0, 5);
  const width = 800;
  const height = 1040;
  const x = 64;
  const inner = width - 128;
  let y = 78;
  const header = y;
  y = 132;
  const callY = y;
  y = 188;
  const titleY = y;
  y = 232;
  const epithetY = y;
  const planeCy = 430;
  const planeR = 132;
  let cursor = 600;
  const coordY = cursor;
  cursor += 46;
  const pullStart = cursor;
  cursor += pullLines.length * 32 + 18;
  const meterStart = cursor;

  const pull = pullLines.map((line, i) => (
    `<text x="${x}" y="${pullStart + i * 32}" fill="#f3eee4" font-family="Georgia, 'Palatino Linotype', Palatino, serif" font-size="22" font-style="italic">${esc(line)}</text>`
  )).join('');

  const meters = (profile.pairs || []).map((pair, i) => meter(pair, x, meterStart + i * 58, inner)).join('');

  const date = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="3" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="#110f0c"/>
  <rect x="28" y="28" width="744" height="984" fill="none" stroke="rgba(243,238,228,0.28)"/>
  <path d="M44 44 H28 V60" fill="none" stroke="#f3eee4" stroke-width="1"/>
  <path d="M756 44 H772 V60" fill="none" stroke="#f3eee4" stroke-width="1"/>
  <path d="M44 996 H28 V980" fill="none" stroke="#f3eee4" stroke-width="1"/>
  <path d="M756 996 H772 V980" fill="none" stroke="#f3eee4" stroke-width="1"/>
  <text x="${x}" y="${header}" fill="#f3eee4" font-family="Segoe UI, Arial, sans-serif" font-size="13" letter-spacing="3">RIFT INDEX</text>
  <text x="${width - x}" y="${header}" fill="#a39888" font-family="Segoe UI, Arial, sans-serif" font-size="13" letter-spacing="2" text-anchor="end">${esc(profile.catalog || '')}  ${esc(date)}</text>
  <text x="${x}" y="${callY}" fill="#e2ff4d" font-family="Segoe UI, Arial, sans-serif" font-size="14" letter-spacing="2.4">${esc(String(profile.callsign || '').toUpperCase())}</text>
  <text x="${x}" y="${titleY}" fill="#f3eee4" font-family="Georgia, 'Palatino Linotype', Palatino, serif" font-size="${titleSize}">${esc(profile.title)}</text>
  <text x="${x}" y="${epithetY}" fill="#a39888" font-family="Georgia, 'Palatino Linotype', Palatino, serif" font-size="18" font-style="italic">${esc(profile.epithet)}</text>
  ${planeMarkup(profile, width / 2, planeCy, planeR)}
  <text x="${x}" y="${coordY}" fill="#f3eee4" font-family="Segoe UI, Arial, sans-serif" font-size="14" letter-spacing="1.4">N ${fmt(profile.point.y)}    E ${fmt(profile.point.x)}</text>
  <text x="${width - x}" y="${coordY}" fill="#6f675c" font-family="Segoe UI, Arial, sans-serif" font-size="13" text-anchor="end">${profile.clarity ? esc(profile.clarity.label) : ''}${profile.reach != null ? `  ·  reach ${Number(profile.reach).toFixed(2)}` : ''}</text>
  ${pull}
  ${meters}
  <text x="${x}" y="990" fill="#6f675c" font-family="Segoe UI, Arial, sans-serif" font-size="12" letter-spacing="1.2">THE PLAYFIELD  ·  /r/${esc(profile.slug || '')}</text>
</svg>`;
}
