const SVG_NS = 'http://www.w3.org/2000/svg';

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  applyProps(el, props);
  append(el, children);
  return el;
}

export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  applyProps(el, attrs, true);
  append(el, children);
  return el;
}

function applyProps(el, props, isSvg = false) {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.setAttribute('class', value);
    else if (key === 'text') el.textContent = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key === 'dataset') Object.assign(el.dataset, value);
    else if (key === 'style' && typeof value === 'object') {
      for (const [prop, val] of Object.entries(value)) {
        if (prop.startsWith('--')) el.style.setProperty(prop, val);
        else el.style[prop] = val;
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'value' && !isSvg) el.value = value;
    else if (key === 'checked' || key === 'disabled' || key === 'selected') el[key] = !!value;
    else el.setAttribute(key, String(value));
  }
}

function append(el, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false || child === '') continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

export function frag(...children) {
  const f = document.createDocumentFragment();
  append(f, children);
  return f;
}

export function mount(root, ...children) {
  root.innerHTML = '';
  append(root, children);
  return root;
}

export function fmtInt(n) {
  return new Intl.NumberFormat('en-US').format(Number(n) || 0);
}

export function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fmtDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(iso) {
  const d = new Date(iso).getTime();
  if (!d) return '';
  const secs = Math.max(1, Math.floor((Date.now() - d) / 1000));
  const units = [
    ['y', 31536000],
    ['mo', 2592000],
    ['d', 86400],
    ['h', 3600],
    ['m', 60]
  ];
  for (const [label, size] of units) {
    if (secs >= size) return `${Math.floor(secs / size)}${label} ago`;
  }
  return 'just now';
}

export function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export const easeOutCubic = (t) => 1 - (1 - t) ** 3;
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export function tween({ duration = 900, ease = easeOutCubic, onUpdate, onDone }) {
  const start = performance.now();
  let raf = 0;
  let cancelled = false;
  const step = (now) => {
    if (cancelled) return;
    const t = Math.min(1, (now - start) / duration);
    onUpdate(ease(t), t);
    if (t < 1) raf = requestAnimationFrame(step);
    else if (onDone) onDone();
  };
  raf = requestAnimationFrame(step);
  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
  };
}

export function animateWidth(el, targetPct, duration = 1000) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.width = `${targetPct}%`;
    });
  });
}
