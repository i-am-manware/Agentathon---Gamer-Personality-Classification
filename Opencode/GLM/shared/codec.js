// SPAWNPOINT — share links. The whole result is stateless: one compact code in
// the URL reconstructs the full results screen (plane, bars, written insight),
// no account and no database required.
//
// Wire format (before base64url):
//   1|<axisPos×1000 ×3>|<affinity pct ×6, POLE_RING order>|<conviction pct>
// ~34 chars → ~46 chars base64url. Decode validates and clamps everything;
// hostile input returns null, never throws.

import { POLE_RING, placePoint, clamp, areAdjacent } from './axes.js';
import { CONVICTION_TIERS, TERRITORY_TIERS } from './archetypes.js';

const V = 1;

function hasB64() {
  return typeof btoa === 'function' && typeof atob === 'function';
}
const toB64u = hasB64()
  ? (s) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  : (s) => Buffer.from(s, 'utf8').toString('base64url');
const fromB64u = hasB64()
  ? (s) => atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.replace(/-/g, '+').replace(/_/g, '/').length % 4)) % 4))
  : (s) => Buffer.from(s, 'base64url').toString('utf8');

export function encodeResult(score) {
  const affById = Object.fromEntries(score.affinities.map((row) => [row.id, row]));
  const payload = [
    V,
    score.axes.map((ax) => Math.round(clamp(ax.value, -1, 1) * 1000)).join(','),
    POLE_RING.map((id) => clamp(Math.round(affById[id].pct), 0, 100)).join(','),
    clamp(Math.round(score.conviction.pct), 0, 100),
  ].join('|');
  return toB64u(payload);
}

export function decodeResult(code) {
  try {
    if (typeof code !== 'string' || code.length === 0 || code.length > 256 || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
    const raw = fromB64u(code);
    if (typeof raw !== 'string' || raw.length > 128) return null;
    const parts = raw.split('|');
    if (parts.length !== 4) return null;
    if (Number(parts[0]) !== V) return null;

    const a = parts[1].split(',').map(Number);
    const f = parts[2].split(',').map(Number);
    const c = Number(parts[3]);
    if (a.length !== 3 || f.length !== 6) return null;
    if (!a.every((n) => Number.isInteger(n) && n >= -1000 && n <= 1000)) return null;
    if (!f.every((n) => Number.isInteger(n) && n >= 0 && n <= 100)) return null;
    if (!Number.isInteger(c) || c < 0 || c > 100) return null;

    const shares = {};
    const total = f.reduce((s, n) => s + n, 0);
    const safeTotal = total > 0 ? total : 100;
    for (let i = 0; i < 6; i++) shares[POLE_RING[i]] = f[i] / safeTotal;

    const ranked = [...POLE_RING].sort(
      (x, y) => shares[y] - shares[x] || POLE_RING.indexOf(x) - POLE_RING.indexOf(y)
    );
    const primary = ranked[0];
    const secondary = ranked[1];

    const point = placePoint(shares);
    const distance = Math.hypot(point.x, point.y);

    const PAIRS = [
      { id: 'valor', plus: 'conqueror', minus: 'wayfarer' },
      { id: 'order', plus: 'architect', minus: 'gremlin' },
      { id: 'campfire', plus: 'hypeman', minus: 'lorekeeper' },
    ];
    const axes = PAIRS.map((pair, i) => {
      const value = clamp(a[i] / 1000, -1, 1);
      return { id: pair.id, plus: pair.plus, minus: pair.minus, value, strength: Math.abs(value), toward: value >= 0 ? pair.plus : pair.minus };
    });

    const convictionValue = axes.reduce((s, ax) => s + ax.strength, 0) / 3;
    const cTier = CONVICTION_TIERS.find((t) => convictionValue < t.max) || CONVICTION_TIERS[CONVICTION_TIERS.length - 1];
    const tTier = TERRITORY_TIERS.find((t) => distance < t.max) || TERRITORY_TIERS[TERRITORY_TIERS.length - 1];

    return {
      version: V,
      decoded: true,
      shares,
      affinities: ranked.map((id) => ({ id, share: shares[id], pct: f[POLE_RING.indexOf(id)] })),
      axes,
      point,
      distance,
      conviction: { value: convictionValue, pct: c, tier: cTier.label, line: cTier.line },
      territory: { label: tTier.label, line: tTier.line },
      sector: sectorFor(primary, secondary, distance, shares),
      primary,
      secondary,
    };
  } catch {
    return null;
  }
}

function sectorFor(primary, secondary, distance, shares) {
  if (distance < 0.15 || shares[primary] - shares[secondary] < 0.04) return 'THE CROSSROADS';
  if (areAdjacent(primary, secondary)) return `${primary.toUpperCase()}–${secondary.toUpperCase()} CORRIDOR`;
  return `${primary.toUpperCase()}–${secondary.toUpperCase()} TRADE ROUTE`;
}
