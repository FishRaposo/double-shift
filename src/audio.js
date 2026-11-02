// Synthesized sound effects (WebAudio). No audio files.
// Sounds are short so rapid shifting never stacks into noise (GDD §11.2).

let ctx = null;
let master = null;
let muted = false;

export function unlockAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.35;
  return muted;
}

function tone({ type = 'square', f0, f1 = f0, dur = 0.08, vol = 0.3, delay = 0 }) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  // day → night falls, night → day rises: the pitch tells you which shift you're in
  shift(toNight) {
    if (toNight) tone({ type: 'triangle', f0: 880, f1: 330, dur: 0.07, vol: 0.35 });
    else tone({ type: 'triangle', f0: 330, f1: 880, dur: 0.07, vol: 0.35 });
  },
  shiftFail() { tone({ type: 'square', f0: 120, f1: 90, dur: 0.06, vol: 0.2 }); },
  jump() { tone({ type: 'square', f0: 260, f1: 420, dur: 0.06, vol: 0.12 }); },
  land() { tone({ type: 'sine', f0: 140, f1: 70, dur: 0.05, vol: 0.2 }); },
  death() { tone({ type: 'sawtooth', f0: 400, f1: 60, dur: 0.25, vol: 0.25 }); },
  checkpoint() {
    tone({ type: 'triangle', f0: 523, dur: 0.07, vol: 0.25 });
    tone({ type: 'triangle', f0: 784, dur: 0.1, vol: 0.25, delay: 0.07 });
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.12, vol: 0.25, delay: i * 0.08 }));
  },
  // the worker yelps and leaps out of their boots
  spooked() {
    tone({ type: 'square', f0: 500, f1: 1400, dur: 0.12, vol: 0.22 });
    tone({ type: 'square', f0: 1300, f1: 600, dur: 0.1, vol: 0.18, delay: 0.12 });
  },
  // the freaks, somewhere, very pleased with themselves
  giggle() {
    [0, 0.07, 0.14, 0.21].forEach((d, i) => tone({ type: 'triangle', f0: 900 + (i % 2) * 180, f1: 700, dur: 0.05, vol: 0.14, delay: 0.05 + d }));
  },
  stamp() { tone({ type: 'square', f0: 90, f1: 50, dur: 0.09, vol: 0.3 }); },
};
