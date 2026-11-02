// Synthesized sound (WebAudio). No audio files.
// One mix bus: music and SFX gains → master gain → compressor → speakers. Every SFX is ≤ 0.25 s,
// so rapid shifting never stacks into noise (GDD §11.2). Music lives in music.js.

import { createMusic } from './music.js';

let ctx = null;
let master = null;
let sfxBus = null;
let musicBus = null;
let noise = null;
let music = null;
let muted = false;
const vol = { master: 0.8, music: 0.6, sfx: 0.8 };
let shift = 0;
let menu = true;

const MASTER = 0.55; // headroom before the compressor

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.15;
  master = ctx.createGain();
  sfxBus = ctx.createGain();
  musicBus = ctx.createGain();
  sfxBus.connect(master);
  musicBus.connect(master);
  master.connect(comp).connect(ctx.destination);
  noise = makeNoise(ctx);
  applyVolumes();
  music = createMusic(ctx, musicBus, noise);
  music.start();
  music.setShift(shift);
}

export function makeNoise(c) {
  const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 12345;
  for (let i = 0; i < d.length; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (seed / 0x7fffffff) * 2 - 1;
  }
  return buf;
}

function applyVolumes() {
  if (!master) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(muted ? 0 : MASTER * vol.master, t, 0.02);
  sfxBus.gain.setTargetAtTime(vol.sfx, t, 0.02);
  musicBus.gain.setTargetAtTime(vol.music * (menu ? 0.6 : 1), t, 0.1);
}

export function setVolumes(v) {
  Object.assign(vol, v);
  applyVolumes();
}

export function toggleMute() {
  muted = !muted;
  applyVolumes();
  return muted;
}

// Music follows the shift; menus play the day arrangement a little quieter.
export function setMusicShift(layer) {
  shift = layer;
  music?.setShift(layer);
}
export function setMenu(on) {
  if (menu === on) return;
  menu = on;
  applyVolumes();
}

// One synthesized voice. type: an oscillator type or 'noise'. Frequencies sweep exponentially f0 → f1.
export function voice(c, out, {
  type = 'square', f0 = 440, f1 = f0, dur = 0.08, vol: v = 0.3, delay = 0, attack = 0.003,
  filter = null, q = 1, vibrato = 0, noiseBuf = noise,
}) {
  const t = c.currentTime + delay;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = g;
  if (filter) {
    const f = c.createBiquadFilter();
    f.type = filter.type;
    f.frequency.setValueAtTime(filter.f0 ?? filter.freq, t);
    if (filter.f1) f.frequency.exponentialRampToValueAtTime(filter.f1, t + dur);
    f.Q.value = q;
    f.connect(g);
    node = f;
  }
  g.connect(out);
  if (type === 'noise') {
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.connect(node);
    src.start(t, (t * 7.3) % 0.5);
    src.stop(t + dur + 0.02);
    return;
  }
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  if (vibrato) {
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = vibrato;
    lg.gain.value = f0 * 0.04;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.02);
  }
  o.connect(node);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const play = (spec) => { if (ctx && !muted) voice(ctx, sfxBus, spec); };

// Every sound effect, as data: name → list of voices (docs/AUDIO.md §2, §4, §4.1).
export const SOUNDS = {
  // day → night falls, night → day rises: the pitch tells you which shift you're in
  shiftNight: [{ type: 'triangle', f0: 880, f1: 330, dur: 0.07, vol: 0.32 }, { type: 'noise', dur: 0.06, vol: 0.05, filter: { type: 'bandpass', f0: 3000, f1: 800 } }],
  shiftDay: [{ type: 'triangle', f0: 330, f1: 880, dur: 0.07, vol: 0.32 }, { type: 'noise', dur: 0.06, vol: 0.05, filter: { type: 'bandpass', f0: 800, f1: 3000 } }],
  shiftFail: [{ type: 'square', f0: 120, f1: 90, dur: 0.06, vol: 0.16, filter: { type: 'lowpass', freq: 900 } }],
  jump: [{ type: 'square', f0: 260, f1: 520, dur: 0.07, vol: 0.09, filter: { type: 'lowpass', freq: 2200 } }],
  land: [{ type: 'sine', f0: 140, f1: 70, dur: 0.05, vol: 0.18 }, { type: 'noise', dur: 0.04, vol: 0.05, filter: { type: 'lowpass', freq: 700 } }],
  death: [{ type: 'sawtooth', f0: 400, f1: 60, dur: 0.25, vol: 0.18, filter: { type: 'lowpass', freq: 1800 } }],
  checkpoint: [{ type: 'triangle', f0: 523, dur: 0.07, vol: 0.22 }, { type: 'triangle', f0: 784, dur: 0.1, vol: 0.22, delay: 0.07 }, { type: 'sine', f0: 1568, dur: 0.12, vol: 0.06, delay: 0.07 }],
  win: [523, 659, 784, 1047].map((f, i) => ({ type: 'triangle', f0: f, dur: 0.12, vol: 0.22, delay: i * 0.08 })).concat([{ type: 'sine', f0: 2093, dur: 0.2, vol: 0.05, delay: 0.32 }]),
  // the worker yelps and leaps out of their boots
  spooked: [{ type: 'square', f0: 500, f1: 1400, dur: 0.12, vol: 0.17, filter: { type: 'lowpass', freq: 3500 } }, { type: 'square', f0: 1300, f1: 600, dur: 0.1, vol: 0.14, delay: 0.12, filter: { type: 'lowpass', freq: 3500 } }],
  // the freaks, somewhere, very pleased with themselves
  giggle: [0, 0.07, 0.14, 0.21].map((d, i) => ({ type: 'triangle', f0: 900 + (i % 2) * 180, f1: 700, dur: 0.05, vol: 0.13, delay: 0.05 + d })),
  shimmer: [1568, 2093, 2637, 2093].map((f, i) => ({ type: 'sine', f0: f, dur: 0.06, vol: 0.035, delay: 0.06 + i * 0.045 })),
  stamp: [{ type: 'square', f0: 90, f1: 50, dur: 0.09, vol: 0.24, filter: { type: 'lowpass', freq: 600 } }, { type: 'noise', dur: 0.05, vol: 0.12, filter: { type: 'lowpass', freq: 1200 } }],
  freeze: [{ type: 'noise', dur: 0.08, vol: 0.05, filter: { type: 'bandpass', f0: 1400, f1: 350 }, q: 4 }],
  uiMove: [{ type: 'square', f0: 660, dur: 0.03, vol: 0.05, filter: { type: 'lowpass', freq: 2500 } }],
  uiSelect: [{ type: 'square', f0: 660, f1: 990, dur: 0.06, vol: 0.07, filter: { type: 'lowpass', freq: 3000 } }],
  sting: [392, 494].map((f) => ({ type: 'triangle', f0: f, dur: 0.12, vol: 0.12 })).concat([523, 659].map((f) => ({ type: 'triangle', f0: f, dur: 0.18, vol: 0.12, delay: 0.13 }))),
  // planned levels (built now)
  peekerBoing: [{ type: 'sine', f0: 300, f1: 600, dur: 0.05, vol: 0.08 }],
  lurkerStep: [{ type: 'noise', dur: 0.02, vol: 0.04, filter: { type: 'lowpass', freq: 300 } }],
  wetSqueak: [{ type: 'square', f0: 900, f1: 1300, dur: 0.08, vol: 0.06, vibrato: 6, filter: { type: 'lowpass', freq: 3000 } }],
  doorThunk: [{ type: 'sine', f0: 180, f1: 90, dur: 0.1, vol: 0.22 }, { type: 'noise', dur: 0.06, vol: 0.06, filter: { type: 'lowpass', freq: 500 } }],
  pillarScrape: [{ type: 'sawtooth', f0: 70, f1: 55, dur: 0.22, vol: 0.1, filter: { type: 'lowpass', freq: 400 } }, { type: 'noise', dur: 0.22, vol: 0.04, filter: { type: 'bandpass', freq: 600 }, q: 2 }],
  clipboardTick: [{ type: 'square', f0: 2000, dur: 0.02, vol: 0.04 }],
  turnWhoosh: [{ type: 'noise', dur: 0.1, vol: 0.05, filter: { type: 'bandpass', f0: 600, f1: 300 }, q: 2 }],
  offsetRumble: [{ type: 'sine', f0: 55, f1: 45, dur: 0.25, vol: 0.2 }, { type: 'noise', dur: 0.25, vol: 0.04, filter: { type: 'lowpass', freq: 200 } }],
  daywalkerGiggle: [0, 0.06, 0.12, 0.18].map((d, i) => ({ type: 'triangle', f0: 1100 + (i % 2) * 200, f1: 900, dur: 0.05, vol: 0.11, delay: d })),
};

export function playSound(name) {
  for (const v of SOUNDS[name] ?? []) play(v);
}

export const sfx = {
  shift(toNight) { playSound(toNight ? 'shiftNight' : 'shiftDay'); },
  shiftFail: () => playSound('shiftFail'),
  jump: () => playSound('jump'),
  land: () => playSound('land'),
  death: () => playSound('death'),
  checkpoint: () => playSound('checkpoint'),
  win: () => playSound('win'),
  spooked: () => playSound('spooked'),
  giggle: () => playSound('giggle'),
  shimmer: () => playSound('shimmer'),
  stamp: () => playSound('stamp'),
  freeze: () => playSound('freeze'),
  uiMove: () => playSound('uiMove'),
  uiSelect: () => playSound('uiSelect'),
  sting: () => playSound('sting'),
};
