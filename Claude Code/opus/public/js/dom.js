// Tiny DOM helpers — hyperscript for HTML and SVG, no framework.
const SVG_NS = 'http://www.w3.org/2000/svg';

function apply(el, attrs, isSvg) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.setAttribute('class', Array.isArray(v) ? v.filter(Boolean).join(' ') : v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
      }
    } else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'html') el.innerHTML = v; // only ever used with trusted constants
    else if (!isSvg && k in el && typeof v !== 'string' && k !== 'list') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
}
function append(el, kids) {
  for (const c of kids.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs && (attrs instanceof Node || Array.isArray(attrs) || typeof attrs !== 'object')) { kids.unshift(attrs); attrs = null; }
  apply(el, attrs, false);
  append(el, kids);
  return el;
}

export function s(tag, attrs, ...kids) {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs && (attrs instanceof Node || Array.isArray(attrs) || typeof attrs !== 'object')) { kids.unshift(attrs); attrs = null; }
  apply(el, attrs, true);
  append(el, kids);
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const clear = (el) => { while (el.firstChild) el.firstChild.remove(); return el; };

/** Render a tiny subset of markdown (**bold**, *italic*) safely into nodes. */
export function rich(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(m[1] ? h('strong', m[1]) : h('em', m[2]));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function toast(msg, ms = 2600) {
  const root = document.getElementById('toasts');
  const t = h('div', { class: 'toast' }, msg);
  root.append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 260); }, ms);
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function tween(ms, fn, ease = (t) => 1 - Math.pow(1 - t, 3)) {
  // Skip animation when motion is reduced or the tab is hidden (rAF is paused there).
  if (reducedMotion() || document.hidden) { fn(1); return Promise.resolve(); }
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      fn(ease(t));
      if (t < 1) requestAnimationFrame(step); else resolve();
    };
    requestAnimationFrame(step);
  });
}

export const easeOutBack = (t) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

export const store = {
  get(k, fallback = null) { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

/**
 * Two-tap confirmation without a native dialog: the first tap "arms" the
 * button (shows `armedLabel`), a second tap within 3 s runs `action`.
 */
export function armable(btn, armedLabel, action) {
  let timer = null;
  const original = [...btn.childNodes];
  const disarm = () => { clearTimeout(timer); timer = null; btn.classList.remove('armed'); btn.replaceChildren(...original); };
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (timer) { disarm(); action(); return; }
    btn.classList.add('armed');
    btn.replaceChildren(armedLabel);
    timer = setTimeout(disarm, 3000);
  });
  btn.addEventListener('blur', () => { if (timer) setTimeout(disarm, 150); });
  return btn;
}

export const fmtDate = (ts) => new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
