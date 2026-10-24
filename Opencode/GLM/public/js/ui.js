// Tiny DOM toolkit + pixel-art icon system + toasts. No framework, no build step.

export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'html') node.innerHTML = value; // sanitized static copy only
    else if (key in node && key !== 'list' && key !== 'form' && typeof value !== 'string') {
      node[key] = value;
    } else {
      node.setAttribute(key, value === true ? '' : String(value));
    }
  }
  append(node, children);
  return node;
}

export function append(node, children) {
  for (const child of flat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

function flat(items) {
  return (Array.isArray(items) ? items : [items]).flatMap((x) => (Array.isArray(x) ? flat(x) : [x]));
}

export function svgEl(tag, attrs = {}, parent = null) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    node.setAttribute(k, v === true ? '' : String(v));
  }
  if (parent) parent.append(node);
  return node;
}

// ---- pixel icons (12×12 bitmaps, drawn as SVG rects, crispEdges) -----------

export const ICONS = {
  brand: [
    '....####....',
    '...#....#...',
    '..#......#..',
    '..#......#..',
    '..#..##..#..',
    '..#..##..#..',
    '..#......#..',
    '..#......#..',
    '...#....#...',
    '....####....',
  ],
  conqueror: [
    '............',
    '.##.........',
    '.##.#####...',
    '.##.######..',
    '.##.#######.',
    '.##.######..',
    '.##.#####...',
    '.##.........',
    '.##.........',
    '.##.........',
    '.##.........',
    '............',
  ],
  wayfarer: [
    '.....##.....',
    '....#..#....',
    '...#....#...',
    '..#......#..',
    '.#.....#..#.',
    '#....##....#',
    '#....##....#',
    '.#..#.....#.',
    '..#......#..',
    '...#....#...',
    '....#..#....',
    '.....##.....',
  ],
  architect: [
    '............',
    '.##########.',
    '.#....#...#.',
    '.#....#...#.',
    '.#....#...#.',
    '.#....#...#.',
    '.##########.',
    '.#....#...#.',
    '.#....#...#.',
    '.#....#...#.',
    '.##########.',
    '............',
  ],
  gremlin: [
    '............',
    '............',
    '.##......##.',
    '.##......##.',
    '............',
    '............',
    '...#.##.#...',
    '...##..##...',
    '....#..#....',
    '............',
    '............',
    '............',
  ],
  lorekeeper: [
    '............',
    '..#......#..',
    '.#........#.',
    '.####..####.',
    '.#..#..#..#.',
    '.#..#..#..#.',
    '.#..#..#..#.',
    '.####..####.',
    '..########..',
    '....####....',
    '............',
    '............',
  ],
  hypeman: [
    '............',
    '............',
    '........##..',
    '........##..',
    '.....##.##..',
    '.....##.##..',
    '.....##.##..',
    '.##..##.##..',
    '.##..##.##..',
    '............',
    '............',
    '............',
  ],
};

export function iconRects(id) {
  const rows = ICONS[id];
  if (!rows) return '';
  return rows
    .map((row, y) =>
      [...row]
        .map((cell, x) => (cell === '#' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : ''))
        .join('')
    )
    .join('');
}

export function iconSVG(id, { size = 24, color = 'currentColor', className = '' } = {}) {
  const rects = iconRects(id);
  if (!rects) return '';
  return (
    `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 12 12" ` +
    `shape-rendering="crispEdges" fill="${color}" aria-hidden="true" focusable="false">${rects}</svg>`
  );
}

export function iconEl(id, { size = 24, className = '' } = {}) {
  const wrap = h('span', { class: `icon-wrap ${className}`, html: iconSVG(id, { size }) });
  return wrap;
}

// ---- toasts -----------------------------------------------------------------

export function toastHost() {
  return document.getElementById('toasts');
}

export function toast(message, { tone = 'ok', duration = 3400 } = {}) {
  const host = toastHost();
  if (!host) return;
  const el = h(
    'div',
    { class: `toast toast--${tone}` },
    h('span', { class: 'toast__dot', 'aria-hidden': 'true' }),
    h('span', { class: 'toast__msg' }, message)
  );
  host.append(el);
  while (host.children.length > 4) host.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add('toast--out');
    setTimeout(() => el.remove(), 320);
  }, duration);
}

// ---- misc helpers -----------------------------------------------------------

export function fmtDate(ts) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 86400000) return 'today';
  if (diff < 2 * 86400000) return 'yesterday';
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)} days ago`;
  return d.toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: 'numeric' });
}

export function fmtCoord(x, y) {
  const f = (v) => (Math.abs(v) < 0.005 ? '±0.00' : (v > 0 ? '+' : '') + v.toFixed(2));
  return `(${f(x)}, ${f(y)})`;
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'spawnpoint';
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
