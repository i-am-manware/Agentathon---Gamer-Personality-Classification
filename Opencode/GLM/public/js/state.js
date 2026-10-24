// App state: settings (localStorage), quiz progress (sessionStorage),
// guest run history, session. Tiny emitter for session changes.

const LS = {
  settings: 'sp_settings',
  lastRun: 'sp_lastRun',
  prevRun: 'sp_prevRun',
  pendingClaim: 'sp_pending_claim',
};

const SS = {
  quiz: 'sp_quiz',
  booted: 'sp_booted',
  pendingCode: 'sp_pending_code',
  claimFlag: 'sp_claim_flag',
};

export const state = {
  user: null,
  settings: { crt: true, sound: true },
};

// ---- tiny emitter ------------------------------------------------------------

const listeners = new Set();
export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function setSession(user) {
  state.user = user;
  for (const fn of listeners) {
    try { fn(user); } catch { /* keep going */ }
  }
}

// ---- settings ---------------------------------------------------------------

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS.settings) || '{}');
    state.settings = {
      crt: typeof raw.crt === 'boolean' ? raw.crt : true,
      sound: typeof raw.sound === 'boolean' ? raw.sound : true,
    };
  } catch {
    state.settings = { crt: true, sound: true };
  }
  applySettings();
}

export function saveSettings() {
  localStorage.setItem(LS.settings, JSON.stringify(state.settings));
  applySettings();
}

export function applySettings() {
  document.documentElement.classList.toggle('no-crt', !state.settings.crt);
  document.documentElement.classList.toggle('no-sfx', !state.settings.sound);
}

// ---- quiz progress (sessionStorage) ------------------------------------------

export function getQuizSession() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(SS.quiz) || 'null');
    if (!raw || !Array.isArray(raw.answers)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function setQuizSession(session) {
  sessionStorage.setItem(SS.quiz, JSON.stringify(session));
}

export function clearQuizSession() {
  sessionStorage.removeItem(SS.quiz);
}

export function wasBooted() {
  return sessionStorage.getItem(SS.booted) === '1';
}

export function markBooted() {
  sessionStorage.setItem(SS.booted, '1');
}

// ---- result handoff (quiz → compute → result) ---------------------------------

export function setPendingCode(code) {
  sessionStorage.setItem(SS.pendingCode, code);
}

export function takePendingCode() {
  const code = sessionStorage.getItem(SS.pendingCode);
  sessionStorage.removeItem(SS.pendingCode);
  return code;
}

export function setClaimFlag() {
  sessionStorage.setItem(SS.claimFlag, '1');
}

export function takeClaimFlag() {
  const flag = sessionStorage.getItem(SS.claimFlag) === '1';
  sessionStorage.removeItem(SS.claimFlag);
  return flag;
}

// ---- guest run history (localStorage) ----------------------------------------

export function stashRun(code, answers, ts) {
  try {
    const last = JSON.parse(localStorage.getItem(LS.lastRun) || 'null');
    if (last && last.code && code !== last.code) {
      localStorage.setItem(LS.prevRun, JSON.stringify(last));
    }
  } catch { /* first run */ }
  localStorage.setItem(LS.lastRun, JSON.stringify({ code, answers, ts }));
}

export function getLastRun() {
  try {
    return JSON.parse(localStorage.getItem(LS.lastRun) || 'null');
  } catch {
    return null;
  }
}

export function getPrevRun() {
  try {
    return JSON.parse(localStorage.getItem(LS.prevRun) || 'null');
  } catch {
    return null;
  }
}

// ---- guest → account claim ----------------------------------------------------

export function setPendingClaim({ answers, version, returnTo }) {
  localStorage.setItem(LS.pendingClaim, JSON.stringify({ answers, version, returnTo, ts: Date.now() }));
}

export function takePendingClaim() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS.pendingClaim) || 'null');
    if (!raw) return null;
    localStorage.removeItem(LS.pendingClaim);
    return raw;
  } catch {
    return null;
  }
}
