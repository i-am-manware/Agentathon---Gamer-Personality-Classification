// WebAudio bleeps — square waves, zero assets, very quiet by design.
// Created lazily on the first user gesture; every call is fail-safe.

import { state } from './state.js';

let ctx = null;

function ensure() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

window.addEventListener(
  'pointerdown',
  () => {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
  },
  { once: true, passive: true }
);

function blip({ freq = 660, dur = 0.05, type = 'square', gain = 0.038, slide = 0 } = {}) {
  if (!state.settings.sound) return;
  const c = ensure();
  if (!c || c.state === 'suspended') return;
  try {
    const osc = c.createOscillator();
    const amp = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), c.currentTime + dur);
    amp.gain.setValueAtTime(gain, c.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(amp).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur + 0.02);
  } catch {
    /* audio is best-effort */
  }
}

export const sfx = {
  tap: () => blip({ freq: 520, dur: 0.035 }),
  select: () => blip({ freq: 760, dur: 0.055, slide: 240 }),
  back: () => blip({ freq: 420, dur: 0.045, slide: -140 }),
  nav: () => blip({ freq: 300, dur: 0.03, gain: 0.024 }),
  reveal: () => {
    blip({ freq: 440, dur: 0.09 });
    setTimeout(() => blip({ freq: 560, dur: 0.09 }), 110);
    setTimeout(() => blip({ freq: 740, dur: 0.16, gain: 0.05 }), 220);
  },
  error: () => blip({ freq: 180, dur: 0.16, type: 'sawtooth', gain: 0.045 }),
};
