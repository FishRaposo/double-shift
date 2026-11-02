// The theme: one 16-bar tune in two arrangements that always play in sync, so a shift never restarts it.
// Day: jaunty pulse lead, bouncy root-fifth bass, hats. Night: the same melody in the minor mode on a theremin
// (sine, vibrato, glide), a walking bass and cheesy organ stabs. The note data is pure and tested;
// the engine schedules it ahead on a WebAudio clock.

export const BPM = 110;
export const STEPS_PER_BAR = 8; // eighth notes
export const BARS = 16;
export const STEP = 60 / BPM / 2; // seconds per eighth

const NAMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(name) {
  const m = /^([A-G])(b|#)?(\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return 12 * (Number(m[3]) + 1) + NAMES[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0);
}

// One token per eighth: a note, '-' to hold, '.' for a rest. Bars separated by '|'.
const MELODY_TEXT = [
  'E5 - G5 - C6 - . G5', 'A5 - G5 - E5 - . .', 'F5 - A5 - C6 - A5 G5', 'G5 - - - . F5 E5 D5',
  'E5 - G5 - C6 - D6 C6', 'A5 - C6 - E6 - D6 C6', 'A5 - F5 - G5 - B5 -', 'C6 - - - . . . .',
  'A5 - A5 C6 - A5 G5 F5', 'G5 - E5 - C5 - E5 G5', 'F5 - A5 - D6 - C6 A5', 'G5 - - - B5 - D6 -',
  'E6 - D6 C6 - G5 E5 G5', 'A5 - C6 - E6 - D6 C6', 'A5 - C6 - B5 - G5 -', 'C6 - - - - - . .',
].join(' | ');

// Two chords per bar (half-bar roots), as triads.
const CHORDS = {
  C: ['C', 'E', 'G'], Am: ['A', 'C', 'E'], F: ['F', 'A', 'C'], G: ['G', 'B', 'D'], Dm: ['D', 'F', 'A'],
};
const PROGRESSION = [
  'C C', 'Am Am', 'F F', 'G G', 'C C', 'Am Am', 'F G', 'C C',
  'F F', 'C C', 'Dm Dm', 'G G', 'C C', 'Am Am', 'F G', 'C C',
];

function parseMelody(text) {
  const out = [];
  for (const bar of text.split('|')) {
    const toks = bar.trim().split(/\s+/);
    if (toks.length !== STEPS_PER_BAR) throw new Error(`bar has ${toks.length} steps: ${bar}`);
    for (const t of toks) out.push(t === '-' ? '-' : t === '.' ? null : midi(t));
  }
  return out;
}

export const MELODY = parseMelody(MELODY_TEXT);
export const HALF_BAR_CHORDS = PROGRESSION.flatMap((b) => b.split(' '));

// Night is the same tune in the minor mode: E → Eb and A → Ab (B stays natural: harmonic minor, spooky).
export function minorize(n) {
  const pc = ((n % 12) + 12) % 12;
  return pc === 4 || pc === 9 ? n - 1 : n;
}

const pcOf = (name) => NAMES[name];

// Bass for a quarter-note beat (0..63) in either arrangement.
export function bassNote(beat, night) {
  const half = Math.floor(beat / 2);
  const chord = CHORDS[HALF_BAR_CHORDS[half]];
  const root = 36 + pcOf(chord[0]);
  if (!night) return beat % 2 === 0 ? root : root + 7; // bouncy root-fifth
  // walking bass: root, third, fifth, then a chromatic step into the next half-bar's root
  const pos = beat % 4;
  const third = 36 + ((pcOf(chord[1]) - pcOf(chord[0]) + 12) % 12) + pcOf(chord[0]);
  if (pos === 0 || pos === 2) return pos === 0 ? root : root + 7;
  if (pos === 1) return third;
  const next = CHORDS[HALF_BAR_CHORDS[(half + 1) % HALF_BAR_CHORDS.length]];
  const nextRoot = 36 + pcOf(next[0]);
  return nextRoot > root ? nextRoot - 1 : nextRoot + 1;
}

export function chordNotes(half) {
  return CHORDS[HALF_BAR_CHORDS[half]].map((n) => 60 + pcOf(n));
}

export const LOOP_STEPS = BARS * STEPS_PER_BAR;
export const LOOP_SECONDS = LOOP_STEPS * STEP;

// ---------- engine (browser only) ----------

const freq = (n) => 440 * 2 ** ((n - 69) / 12);

// Schedules both arrangements for one eighth-note step at time t. dest: { day, night } gain nodes.
export function scheduleStep(ctx, dest, step, t, noise) {
  const s = ((step % LOOP_STEPS) + LOOP_STEPS) % LOOP_STEPS;
  const note = MELODY[s];
  if (typeof note === 'number') {
    let len = 1;
    while (MELODY[(s + len) % LOOP_STEPS] === '-') len++;
    const dur = len * STEP;
    lead(ctx, dest.day, note, t, dur);
    theremin(ctx, dest.night, minorize(note), t, dur, prevNote(s));
  }
  if (s % 2 === 0) {
    const beat = s / 2;
    pluck(ctx, dest.day, bassNote(beat, false), t, STEP * 0.9, 'square', 0.09, 700);
    pluck(ctx, dest.night, minorize(bassNote(beat, true)), t, STEP * 1.8, 'triangle', 0.16, 2000);
    if (beat % 2 === 0) kick(ctx, dest.day, t);
  } else {
    hat(ctx, dest.day, t, noise);
  }
  // organ stabs on the "and" of 2 and 4
  if (s % 8 === 3 || s % 8 === 7) {
    for (const n of chordNotes(Math.floor(s / 4))) pluck(ctx, dest.night, minorize(n), t, STEP * 0.6, 'square', 0.022, 1800);
  }
}

function prevNote(s) {
  for (let k = 1; k <= LOOP_STEPS; k++) {
    const n = MELODY[(s - k + LOOP_STEPS) % LOOP_STEPS];
    if (typeof n === 'number') return minorize(n);
  }
  return null;
}

function env(ctx, g, t, vol, dur, attack = 0.006) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - 0.04));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function lead(ctx, dest, n, t, dur) {
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(freq(n), t);
  f.type = 'lowpass';
  f.frequency.value = 2600;
  env(ctx, g, t, 0.055, Math.min(dur, STEP * 1.6) * 0.92);
  o.connect(f).connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function theremin(ctx, dest, n, t, dur, from) {
  const o = ctx.createOscillator();
  const vib = ctx.createOscillator();
  const vibGain = ctx.createGain();
  const g = ctx.createGain();
  o.type = 'sine';
  const target = freq(n);
  o.frequency.setValueAtTime(from ? freq(from) : target, t);
  o.frequency.exponentialRampToValueAtTime(target, t + 0.07); // glide
  vib.frequency.value = 6;
  vibGain.gain.value = target * 0.012;
  vib.connect(vibGain).connect(o.frequency);
  env(ctx, g, t, 0.16, dur * 0.97, 0.03);
  o.connect(g).connect(dest);
  o.start(t);
  vib.start(t);
  o.stop(t + dur + 0.05);
  vib.stop(t + dur + 0.05);
}

function pluck(ctx, dest, n, t, dur, type, vol, cutoff) {
  const o = ctx.createOscillator();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq(n), t);
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  env(ctx, g, t, vol, dur, 0.004);
  o.connect(f).connect(g).connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function kick(ctx, dest, t) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.09);
  env(ctx, g, t, 0.18, 0.1, 0.002);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + 0.15);
}

function hat(ctx, dest, t, noise) {
  if (!noise) return;
  const src = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  src.buffer = noise;
  f.type = 'highpass';
  f.frequency.value = 7000;
  env(ctx, g, t, 0.035, 0.035, 0.001);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5);
  src.stop(t + 0.06);
}

// Live player: schedules ahead on a timer; crossfades between arrangements on every shift.
export function createMusic(ctx, out, noise) {
  const day = ctx.createGain();
  const night = ctx.createGain();
  day.gain.value = 1;
  night.gain.value = 0;
  day.connect(out);
  night.connect(out);
  let step = 0;
  let next = ctx.currentTime + 0.1;
  let timer = null;
  const tick = () => {
    while (next < ctx.currentTime + 0.12) {
      scheduleStep(ctx, { day, night }, step, next, noise);
      step++;
      next += STEP;
    }
  };
  return {
    start() {
      if (timer) return;
      next = ctx.currentTime + 0.1;
      timer = setInterval(tick, 25);
      tick();
    },
    // 0 = day, 1 = night. A ≤ 60 ms crossfade so the switch lands on the shift.
    setShift(layer) {
      const t = ctx.currentTime;
      for (const [g, on] of [[day, layer === 0], [night, layer === 1]]) {
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(g.gain.value, t);
        g.gain.linearRampToValueAtTime(on ? 1 : 0, t + 0.05);
      }
    },
  };
}
