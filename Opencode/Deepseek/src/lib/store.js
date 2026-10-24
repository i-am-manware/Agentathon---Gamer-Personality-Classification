import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const FIELD_CAP = 5000;
const ATTEMPTS_PER_USER = 200;

function defaultData() {
  return {
    meta: { schema: 1, createdAt: new Date().toISOString(), seededAt: null },
    users: [],
    sessions: [],
    attempts: [],
    field: [],
    counters: { scans: 0, resultsServed: 0 }
  };
}

export class Database {
  constructor(file) {
    this.file = file;
    this.data = defaultData();
    this.dirty = false;
    this.timer = null;
    this.writing = null;
    this.listeners = new Set();
  }

  load() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    if (fs.existsSync(this.file)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        this.data = { ...defaultData(), ...parsed };
        this.data.meta = { ...defaultData().meta, ...(parsed.meta || {}) };
        this.data.counters = { ...defaultData().counters, ...(parsed.counters || {}) };
      } catch (err) {
        const backup = `${this.file}.corrupt-${Date.now()}`;
        fs.copyFileSync(this.file, backup);
        this.data = defaultData();
      }
    } else {
      this.saveSync();
    }
    this.purgeSessions();
    return this;
  }

  markDirty() {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.save().catch((err) => console.error('[store] save failed:', err.message));
    }, 250);
    if (this.timer.unref) this.timer.unref();
  }

  async save() {
    if (!this.dirty) return;
    this.dirty = false;
    const tmp = `${this.file}.tmp`;
    const payload = JSON.stringify(this.data, null, 2);
    await fsp.writeFile(tmp, payload);
    await fsp.rename(tmp, this.file);
  }

  saveSync() {
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
    this.dirty = false;
  }

  id() {
    return crypto.randomBytes(9).toString('base64url');
  }

  userByName(name) {
    const lower = String(name || '').trim().toLowerCase();
    return this.data.users.find((u) => u.usernameLower === lower) || null;
  }

  userById(id) {
    return this.data.users.find((u) => u.id === id) || null;
  }

  addUser({ username, passHash, salt }) {
    const user = {
      id: this.id(),
      username,
      usernameLower: username.toLowerCase(),
      passHash,
      salt,
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    };
    this.data.users.push(user);
    this.markDirty();
    return user;
  }

  touchLogin(user) {
    user.lastLoginAt = new Date().toISOString();
    this.markDirty();
  }

  addSession(token, userId, ttlMs) {
    const now = Date.now();
    this.data.sessions.push({
      token,
      userId,
      createdAt: new Date(now).toISOString(),
      expiresAt: now + ttlMs
    });
    this.markDirty();
  }

  session(token) {
    if (!token) return null;
    const found = this.data.sessions.find((s) => s.token === token);
    if (!found) return null;
    if (found.expiresAt < Date.now()) {
      this.deleteSession(token);
      return null;
    }
    return found;
  }

  deleteSession(token) {
    const before = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.token !== token);
    if (this.data.sessions.length !== before) this.markDirty();
  }

  purgeSessions() {
    const now = Date.now();
    const before = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => s.expiresAt > now);
    if (this.data.sessions.length !== before) this.markDirty();
  }

  addAttempt({ userId, answers, result, quizVersion, createdAt }) {
    const attempt = {
      id: this.id(),
      userId,
      createdAt: createdAt || new Date().toISOString(),
      quizVersion,
      answers,
      result
    };
    this.data.attempts.push(attempt);
    const mine = this.data.attempts.filter((a) => a.userId === userId);
    if (mine.length > ATTEMPTS_PER_USER) {
      const remove = new Set(mine.slice(0, mine.length - ATTEMPTS_PER_USER).map((a) => a.id));
      this.data.attempts = this.data.attempts.filter((a) => !remove.has(a.id));
    }
    this.markDirty();
    return attempt;
  }

  attemptsByUser(userId) {
    return this.data.attempts
      .filter((a) => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  attemptById(id) {
    return this.data.attempts.find((a) => a.id === id) || null;
  }

  deleteAttempt(id, userId) {
    const before = this.data.attempts.length;
    this.data.attempts = this.data.attempts.filter((a) => !(a.id === id && a.userId === userId));
    if (this.data.attempts.length !== before) {
      this.markDirty();
      return true;
    }
    return false;
  }

  addFieldPoint(point) {
    this.data.field.push(point);
    if (this.data.field.length > FIELD_CAP) {
      this.data.field.splice(0, this.data.field.length - FIELD_CAP);
    }
    this.markDirty();
  }

  countScan() {
    this.data.counters.scans += 1;
    this.markDirty();
  }

  fieldPoints() {
    return this.data.field;
  }

  stats() {
    return {
      scans: this.data.counters.scans,
      players: this.data.users.length,
      fieldPoints: this.data.field.length,
      attempts: this.data.attempts.length
    };
  }
}
