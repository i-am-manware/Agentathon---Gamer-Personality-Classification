// A ~150-line fake DOM, just enough for the SPA's views to fully render inside
// node:test — no browser needed to smoke-test the frontend. Not a polyfill:
// an instrumented stub that records what the app builds.

function makeStyle() {
  return new Proxy(
    {},
    {
      get(t, p) {
        return p in t ? t[p] : '';
      },
      set(t, p, v) {
        t[p] = String(v);
        return true;
      },
    }
  );
}

class ClassList {
  constructor(el) {
    this.el = el;
    this.set = new Set();
  }
  add(...xs) { xs.forEach((x) => this.set.add(x)); }
  remove(...xs) { xs.forEach((x) => this.set.delete(x)); }
  contains(x) { return this.set.has(x); }
  toggle(x, force) {
    const want = force === undefined ? !this.set.has(x) : force;
    want ? this.set.add(x) : this.set.delete(x);
    return want;
  }
  toString() { return [...this.set].join(' '); }
}

let idCounter = 0;

class FakeNode {
  constructor() {
    this.parentNode = null;
    this.children = [];
  }
}

class FakeElement extends FakeNode {
  constructor(tag, ns = null) {
    super();
    this.tagName = String(tag).toUpperCase();
    this.ns = ns;
    this.id = '';
    this._id = ++idCounter;
    this.children = [];
    this.attributes = {};
    this.dataset = {};
    this.style = makeStyle();
    this.classList = new ClassList(this);
    this.listeners = new Map();
    this._innerHTML = '';
    this._textContent = '';
    this.disabled = false;
    this.value = '';
    this.open = false;
    this.checked = false;
    this.className = '';
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  append(...nodes) { this.appendChildFlat(nodes); }
  appendChildFlat(flat) {
    for (const n of flatFlat(flat)) {
      if (n == null || n === false) continue;
      if (n instanceof FakeElement || n instanceof FakeText) {
        n.parentNode = this;
        this.children.push(n);
      } else {
        const t = new FakeText(String(n));
        t.parentNode = this;
        this.children.push(t);
      }
    }
  }
  appendChild(n) { this.append(n); return n; }
  prepend(...nodes) { this.appendChildFlat(nodes); }
  replaceChildren(...nodes) { this.children = []; this.appendChildFlat(nodes); }
  remove() {
    if (this.parentNode) {
      const i = this.parentNode.children.indexOf(this);
      if (i !== -1) this.parentNode.children.splice(i, 1);
    }
  }
  get firstElementChild() { return this.children.find((c) => c instanceof FakeElement) || null; }
  get firstChild() { return this.children[0] || null; }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = String(v); this.children = []; }
  get textContent() { return this._textContent || this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this._textContent = String(v); this.children = []; }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  removeEventListener(type, fn) {
    const arr = this.listeners.get(type) || [];
    const i = arr.indexOf(fn);
    if (i !== -1) arr.splice(i, 1);
  }
  dispatch(type, event = {}) {
    const ev = { preventDefault() {}, ...event, target: this };
    (this.listeners.get(type) || []).slice().forEach((fn) => fn(ev));
  }
  click() { this.dispatch('click'); }
  dispatchEvent(ev) { this.dispatch(ev.type, ev); return true; }
  focus() {}
  scrollIntoView() {}
  closest() { return null; }
  setPointerCapture() {}
  releasePointerCapture() {}
  querySelector(sel) {
    // generic descendant that satisfies chains like `el.querySelector('b').textContent`
    const memo = this._qsMemo || (this._qsMemo = new Map());
    if (!memo.has(sel)) memo.set(sel, documentStub.createElement(sel));
    return memo.get(sel);
  }
  querySelectorAll() { return []; }
  animate() { return { finished: Promise.resolve() }; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 1000, right: 1000, bottom: 1000 }; }
  getContext(type) {
    if (String(type).startsWith('2d')) return make2DContext();
    return null;
  }
  toBlob(cb) { cb({ size: 1234, type: 'image/png' }); return undefined; }
  toString() { return `<${this.tagName.toLowerCase()} #${this._id}>`; }
}

class FakeText extends FakeNode {
  constructor(text) { super(); this.text = String(text); }
  get textContent() { return this.text; }
  set textContent(v) { this.text = String(v); }
}

function flatFlat(items) {
  return (Array.isArray(items) ? items : [items]).flatMap((x) => (Array.isArray(x) ? flatFlat(x) : [x]));
}

// canvas 2d context: permissive proxy — every method is a no-op that returns
// chainable junk except the couple with real return values.
function make2DContext() {
  const grad = { addColorStop() {} };
  return new Proxy(
    {},
    {
      get(t, p) {
        if (p === 'measureText') return () => ({ width: 42 });
        if (p === 'createRadialGradient' || p === 'createLinearGradient') return () => grad;
        if (p === 'getImageData') return () => ({ data: [] });
        if (typeof p === 'string') return () => undefined;
        return undefined;
      },
      set() { return true; },
    }
  );
}

const elementRegistry = new Map();

const docListeners = new Map();

const documentStub = {
  title: '',
  body: new FakeElement('body'),
  head: new FakeElement('head'),
  documentElement: new FakeElement('html'),
  fonts: { load: async () => [], check: () => false, ready: Promise.resolve() },
  createElement(tag) { return new FakeElement(tag); },
  createElementNS(ns, tag) { return new FakeElement(tag, ns); },
  createTextNode(text) { return new FakeText(text); },
  getElementById(id) {
    if (!elementRegistry.has(id)) elementRegistry.set(id, new FakeElement('div#' + id));
    return elementRegistry.get(id);
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener(type, fn) {
    if (!docListeners.has(type)) docListeners.set(type, []);
    docListeners.get(type).push(fn);
  },
  removeEventListener(type, fn) {
    const arr = docListeners.get(type) || [];
    const i = arr.indexOf(fn);
    if (i !== -1) arr.splice(i, 1);
  },
  dispatch(type, event = {}) {
    const ev = { preventDefault() {}, ...event, target: documentStub, currentTarget: documentStub };
    (docListeners.get(type) || []).slice().forEach((fn) => fn(ev));
  },
};

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}

// install the browser-shaped globals the SPA touches (preserving real fetch
// is pointless — stub it so every api call lands in a catchable place)
function softAssign(key, value) {
  try {
    globalThis[key] = value;
  } catch {
    // some globals (e.g. Node's `navigator`) are getter-only; the real one is fine
  }
}

export function installFakeDom({ fetchImpl } = {}) {
  globalThis.window = globalThis;
  const winListeners = new Map();
  softAssign('addEventListener', (type, fn) => {
    if (!winListeners.has(type)) winListeners.set(type, []);
    winListeners.get(type).push(fn);
  });
  softAssign('removeEventListener', (type, fn) => {
    const arr = winListeners.get(type) || [];
    const i = arr.indexOf(fn);
    if (i !== -1) arr.splice(i, 1);
  });
  softAssign('dispatchEvent', () => true);
  softAssign('Node', FakeNode);
  softAssign('Element', FakeElement);
  softAssign('Event', class FakeEvent {
    constructor(type, init = {}) { this.type = type; Object.assign(this, init); }
    preventDefault() {}
    stopPropagation() {}
  });
  softAssign('CustomEvent', class FakeCustomEvent {
    constructor(type, init = {}) { this.type = type; Object.assign(this, init); }
    preventDefault() {}
  });
  globalThis.document = documentStub;
  globalThis.localStorage = makeStorage();
  globalThis.sessionStorage = makeStorage();
  globalThis.location = { hash: '', origin: 'http://localhost:3111', pathname: '/', host: 'localhost:3111', href: 'http://localhost:3111/#/' };
  softAssign('navigator', {});
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
  globalThis.cancelAnimationFrame = clearTimeout;
  globalThis.scrollTo = () => {};
  globalThis.CSS = { supports: () => true };
  globalThis.fetch = fetchImpl || (async () => {
    const body = JSON.stringify({ error: { code: 'stub_offline', message: 'offline stub' } });
    return { ok: false, status: 503, statusText: 'stub', headers: new Map(), json: async () => JSON.parse(body), text: async () => body };
  });
  globalThis.AudioContext = undefined;
  return { document: documentStub, elementRegistry };
}

export function dumpTree(node, depth = 0, out = []) {
  out.push('  '.repeat(depth) + String(node));
  for (const child of node.children) dumpTree(child, depth + 1, out);
  return out;
}

export function countBuilt(node) {
  let n = 1;
  for (const c of node.children) n += countBuilt(c);
  return n;
}

export { FakeElement, FakeNode };
