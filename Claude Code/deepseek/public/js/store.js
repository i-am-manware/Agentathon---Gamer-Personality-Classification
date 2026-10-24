/**
 * SPAWNPOINT — local persistence.
 *
 * Everything the app remembers lives here: the in-progress run, the list of
 * anonymous attempt ids (so signing in can adopt them), sound preference and
 * the last viewed result. Wrapped in try/catch because Safari in private mode
 * throws on localStorage writes and we would rather degrade than break.
 */

const NS = 'spawnpoint.';
const KEYS = {
  progress: `${NS}progress`,
  attempts: `${NS}attempts`,
  sound: `${NS}sound`,
  lastResult: `${NS}last-result`,
  seenIntro: `${NS}seen-intro`,
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function drop(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}

/* --- in-progress run ------------------------------------------------------ */

export function loadProgress() {
  const p = read(KEYS.progress, null);
  if (!p || !Array.isArray(p.answers)) return null;
  // Guard against a bank that changed shape under a stale save.
  if (typeof p.length !== 'number' || p.answers.length !== p.length) return null;
  return p;
}

export function saveProgress(progress) {
  return write(KEYS.progress, { ...progress, savedAt: new Date().toISOString() });
}

export function clearProgress() {
  drop(KEYS.progress);
}

/* --- anonymous attempt ids ------------------------------------------------ */

export function loadAttemptIds() {
  const ids = read(KEYS.attempts, []);
  return Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : [];
}

export function rememberAttemptId(id) {
  if (!id) return loadAttemptIds();
  const ids = loadAttemptIds().filter((x) => x !== id);
  ids.unshift(id);
  const trimmed = ids.slice(0, 50);
  write(KEYS.attempts, trimmed);
  return trimmed;
}

export function forgetAttemptId(id) {
  const ids = loadAttemptIds().filter((x) => x !== id);
  write(KEYS.attempts, ids);
  return ids;
}

export function clearAttemptIds() {
  drop(KEYS.attempts);
}

/* --- preferences ---------------------------------------------------------- */

export function loadSoundEnabled() {
  return read(KEYS.sound, true) !== false;
}

export function saveSoundEnabled(on) {
  write(KEYS.sound, !!on);
}

export function loadSeenIntro() {
  return read(KEYS.seenIntro, false) === true;
}

export function markSeenIntro() {
  write(KEYS.seenIntro, true);
}

/* --- last viewed result --------------------------------------------------- */

export function loadLastResult() {
  return read(KEYS.lastResult, null);
}

export function saveLastResult(result) {
  return write(KEYS.lastResult, result);
}

export function clearLastResult() {
  drop(KEYS.lastResult);
}

export const STORAGE_KEYS = KEYS;
