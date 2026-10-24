import { state } from './state.js';

let ctx = null;

function context() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  return ctx;
}

function tone({ freq = 440, duration = 0.06, type = 'square', gain = 0.03, delay = 0, slide = 0 }) {
  if (!state.sfx) return;
  const audio = context();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume().catch(() => {});
  const start = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, start + duration);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export const sfx = {
  hover: () => tone({ freq: 880, duration: 0.03, gain: 0.012 }),
  select: () => {
    tone({ freq: 660, duration: 0.05, gain: 0.028 });
    tone({ freq: 990, duration: 0.07, gain: 0.024, delay: 0.05 });
  },
  back: () => tone({ freq: 380, duration: 0.06, gain: 0.022, slide: -80 }),
  tick: () => tone({ freq: 1240, duration: 0.025, gain: 0.01 }),
  error: () => {
    tone({ freq: 180, duration: 0.14, type: 'sawtooth', gain: 0.03 });
    tone({ freq: 140, duration: 0.18, type: 'sawtooth', gain: 0.025, delay: 0.08 });
  },
  coin: () => {
    tone({ freq: 988, duration: 0.07, gain: 0.03 });
    tone({ freq: 1319, duration: 0.16, gain: 0.028, delay: 0.07 });
  },
  complete: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => tone({ freq, duration: 0.14, gain: 0.026, delay: i * 0.09 }));
  }
};
