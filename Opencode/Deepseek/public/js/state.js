const KEY = 'pp_state_v1';

const defaults = () => ({
  quiz: null,
  stats: null,
  field: null,
  user: null,
  last: null,
  progress: null,
  sfx: true,
  pendingSave: null
});

export const state = defaults();

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(topic) {
  for (const fn of listeners) fn(topic, state);
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(state, defaults(), JSON.parse(raw));
  } catch {
    Object.assign(state, defaults());
  }
  return state;
}

export function persist() {
  try {
    const { quiz, stats, field, ...rest } = state;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* storage full or blocked — the app still works in-memory */
  }
}

export function setProgress(progress) {
  state.progress = progress;
  persist();
}

export function clearProgress() {
  state.progress = null;
  persist();
}

export function setLast(last) {
  state.last = last;
  persist();
}

export function clearLast() {
  state.last = null;
  persist();
}

export function setUser(user) {
  state.user = user;
  persist();
  emit('user');
}

export function setSfx(on) {
  state.sfx = !!on;
  persist();
  emit('sfx');
}
