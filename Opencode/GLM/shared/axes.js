// SPAWNPOINT — geometry of the Great Map.
// Isomorphic: imported by the Node server AND the browser (no build step, plain ESM).
//
// The plane is a regular hexagon with circumradius 1. Six archetype "poles" sit on
// the vertices. Poles are grouped into three opposing pairs ("axes"); each axis is
// one diameter line through the center. A player's spawn point is the convex
// combination of the vertices weighted by archetype affinity — which guarantees
// the point lands inside the hexagon.

export const KAPPA = 2; // dominance smoothing for axis positions
export const BETA = 1;  // affinity smoothing floor (everyone has a bit of everything)

// Poles in ring (clockwise) order — used for adjacency checks.
export const POLE_RING = ['conqueror', 'hypeman', 'gremlin', 'wayfarer', 'lorekeeper', 'architect'];

// Vertex angles in degrees (standard math orientation, y-up).
export const POLE_ANGLE = {
  conqueror: 90,
  architect: 150,
  lorekeeper: 210,
  wayfarer: 270,
  gremlin: 330,
  hypeman: 30,
};

// The three opposing pairs. `plus` is the pole at angle, `minus` the one opposite.
export const AXES = [
  { id: 'valor', plus: 'conqueror', minus: 'wayfarer' },
  { id: 'order', plus: 'architect', minus: 'gremlin' },
  { id: 'campfire', plus: 'hypeman', minus: 'lorekeeper' },
];

export const POLES = [...POLE_RING].sort(); // stable id list ['architect','conqueror','gremlin','hypeman','lorekeeper','wayfarer']

const RAD = Math.PI / 180;

// Vertex position of a pole on the unit hexagon (math coords, y-up).
export function vertex(id) {
  const a = POLE_ANGLE[id] * RAD;
  return { x: Math.cos(a), y: Math.sin(a) };
}

export function opposite(pole) {
  const i = POLE_RING.indexOf(pole);
  return POLE_RING[(i + 3) % 6];
}

export function areAdjacent(a, b) {
  if (!POLES.includes(a) || !POLES.includes(b) || a === b) return false;
  const i = POLE_RING.indexOf(a);
  return POLE_RING[(i + 1) % 6] === b || POLE_RING[(i + 5) % 6] === b;
}

export function axisOf(pole) {
  return AXES.find((ax) => ax.plus === pole || ax.minus === pole) || null;
}

// Half-plane containment: is point p (math coords) inside the hexagon of circumradius r?
export function isInsideHexagon(p, r = 1) {
  const ring = POLE_RING.map((id) => {
    const v = vertex(id);
    return { x: v.x * r, y: v.y * r };
  });
  for (let i = 0; i < 6; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % 6];
    // outward normal of edge a->b (center is origin, so outward faces away from 0)
    let nx = -(b.y - a.y);
    let ny = b.x - a.x;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;
    if (nx * a.x + ny * a.y < 0) { nx = -nx; ny = -ny; } // ensure outward
    if (p.x * nx + p.y * ny > a.x * nx + a.y * ny + 1e-9) return false;
  }
  return true;
}

// Scale p back onto the hexagon boundary along the ray from the center (safety net
// for hostile input; the convex-combination placement never needs it in practice).
export function clampToHexagon(p, r = 1) {
  if (isInsideHexagon(p, r)) return { x: p.x, y: p.y };
  let lo = 0, hi = 1;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const q = { x: p.x * mid, y: p.y * mid };
    if (isInsideHexagon(q, r)) lo = mid; else hi = mid;
  }
  return { x: p.x * lo, y: p.y * lo };
}

// Convex combination of vertices weighted by affinity shares (0..1, sum 1).
export function placePoint(shares) {
  let x = 0, y = 0;
  for (const id of POLES) {
    const w = Math.max(0, Number(shares[id]) || 0);
    const v = vertex(id);
    x += w * v.x; y += w * v.y;
  }
  const p = clampToHexagon({ x, y });
  return p;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
