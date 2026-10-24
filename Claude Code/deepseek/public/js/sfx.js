/**
 * SPAWNPOINT — sound effects.
 *
 * Synthesised with the Web Audio API: no audio files, no network requests, no
 * bundle weight. The whole sound design is about forty lines of oscillators,
 * which is the correct amount of sound design for a quiz.
 *
 * The AudioContext is created lazily on the first user gesture, because every
 * browser blocks it before then.
 */

import { loadSoundEnabled, saveSoundEnabled } from './store.js';

let ctx = null;
let enabled = loadSoundEnabled();

function context() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/**
 * One blip.
 * @param {object} o
 * @param {number} o.freq   start frequency
 * @param {number} [o.to]   end frequency (glide)
 * @param {number} [o.ms]   duration
 * @param {OscillatorType} [o.type]
 * @param {number} [o.gain] peak gain
 */
function blip({ freq, to, ms = 70, type = 'square', gain = 0.045, delay = 0 }) {
  const ac = context();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});

  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + ms / 1000);

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);

  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.02);
}

/** A short arpeggio, used for the reveal. */
function arpeggio(freqs, { step = 90, type = 'triangle', gain = 0.05 } = {}) {
  freqs.forEach((f, i) => blip({ freq: f, ms: step * 1.6, type, gain, delay: (i * step) / 1000 }));
}

export const sfx = {
  get enabled() {
    return enabled;
  },

  setEnabled(on) {
    enabled = !!on;
    saveSoundEnabled(enabled);
    if (enabled) sfx.tick();
    return enabled;
  },

  toggle() {
    return sfx.setEnabled(!enabled);
  },

  /** Warm the context up on a real user gesture. */
  unlock() {
    const ac = context();
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  },

  tick() {
    if (enabled) blip({ freq: 880, to: 1320, ms: 45, gain: 0.03 });
  },

  select() {
    if (enabled) blip({ freq: 520, to: 940, ms: 80, gain: 0.05 });
  },

  back() {
    if (enabled) blip({ freq: 420, to: 260, ms: 90, gain: 0.04 });
  },

  hover() {
    if (enabled) blip({ freq: 1400, ms: 22, type: 'sine', gain: 0.012 });
  },

  /** Called when the last question is answered. */
  complete() {
    if (!enabled) return;
    arpeggio([523.25, 659.25, 783.99, 1046.5], { step: 85, gain: 0.045 });
  },

  /** Called when the result plane finishes plotting. */
  reveal() {
    if (!enabled) return;
    arpeggio([392, 523.25, 659.25, 880], { step: 70, type: 'triangle', gain: 0.05 });
    blip({ freq: 1760, ms: 260, type: 'sine', gain: 0.02, delay: 0.28 });
  },

  error() {
    if (enabled) blip({ freq: 220, to: 130, ms: 180, type: 'sawtooth', gain: 0.035 });
  },

  copy() {
    if (enabled) blip({ freq: 1200, to: 1600, ms: 55, gain: 0.035 });
  },
};

export default sfx;
