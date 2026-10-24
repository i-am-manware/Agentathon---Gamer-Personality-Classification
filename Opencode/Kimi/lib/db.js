'use strict';

const fs = require('fs');
const path = require('path');

/**
 * A tiny zero-dependency JSON document store.
 *
 * Why not SQLite? Portability and startup guarantees: this app must clone and
 * run anywhere (Node 18+) with zero install steps and zero native builds. At
 * the scale of a quiz app — thousands of small documents, single-process
 * access — an in-memory store with debounced atomic persistence is simpler,
 * faster, and has literally nothing to compile.
 *
 * Guarantees:
 *  - Atomic writes (write to temp file, then rename) — a crash mid-write can
 *    never corrupt the store.
 *  - Debounced flush (150 ms) batches bursts of mutations into one write.
 *  - flushSync() on shutdown so nothing is lost.
 *
 * The data layout is deliberately boring: four collections of plain objects.
 * Swap this module for a real database by reimplementing the same interface.
 */
class Store {
  constructor(file) {
    this.file = file;
    this.data = { users: [], sessions: [], results: [], meta: { createdAt: new Date().toISOString() } };
    this._timer = null;
    this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      const parsed = JSON.parse(raw);
      for (const key of ['users', 'sessions', 'results']) {
        if (Array.isArray(parsed[key])) this.data[key] = parsed[key];
      }
      if (parsed.meta) this.data.meta = parsed.meta;
    } catch (err) {
      if (err.code !== 'ENOENT') {
        // Corrupt file: preserve it for forensics, start clean.
        try { fs.renameSync(this.file, this.file + '.corrupt-' + Date.now()); } catch { /* ignore */ }
        console.warn('[db] store unreadable, starting fresh (old file preserved)');
      }
    }
  }

  _schedule() {
    if (this._timer) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      this.flushSync();
    }, 150);
    if (this._timer.unref) this._timer.unref();
  }

  flushSync() {
    const tmp = this.file + '.tmp';
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }

  // --- collection helpers (arrays; fine at this scale, see note above) ---

  insert(coll, doc) {
    this.data[coll].push(doc);
    this._schedule();
    return doc;
  }

  find(coll, pred) {
    return this.data[coll].filter(pred);
  }

  findOne(coll, pred) {
    return this.data[coll].find(pred) || null;
  }

  update(coll, pred, patch) {
    let n = 0;
    for (const doc of this.data[coll]) {
      if (pred(doc)) {
        Object.assign(doc, typeof patch === 'function' ? patch(doc) : patch);
        n++;
      }
    }
    if (n) this._schedule();
    return n;
  }

  remove(coll, pred) {
    const before = this.data[coll].length;
    this.data[coll] = this.data[coll].filter((d) => !pred(d));
    if (this.data[coll].length !== before) this._schedule();
    return before - this.data[coll].length;
  }

  count(coll, pred) {
    return pred ? this.data[coll].filter(pred).length : this.data[coll].length;
  }
}

module.exports = { Store };
