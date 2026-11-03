import { step, initState, parseLevel, NO_INPUT, TILE } from '../src/rules.js';

// Build a level from compact ASCII for edge-case tests.
export function level(day, night, extra = {}) {
  return parseLevel({ name: 'test', par: 0, day, night, ...extra });
}

export function stepN(lvl, s, n, input = NO_INPUT) {
  for (let i = 0; i < n; i++) s = step(lvl, s, input);
  return s;
}

export function place(s, tx, ty, opts = {}) {
  s.player.x = tx * TILE + (opts.dx ?? 6);
  s.player.y = ty * TILE + (opts.dy ?? 0);
  Object.assign(s.player, opts.player ?? {});
  return s;
}

// A policy as an input source: policy(state, mem, tick) says what it wants held ({ left, right, jump, shift });
// this turns that into one input frame per tick. Jump and shift press on their rising edge, so a held shift is
// one press: a policy releases shift between two shifts. `mem` is one object for the whole run. A policy
// returns {} for no input; returning nothing throws, so a branch that forgot its return fails loudly. Shared by
// play(), recordInputs() and the demo GIF (scripts/gif.mjs), so all three run exactly the same inputs.
export function inputsFrom(policy) {
  const mem = {};
  let f = 0;
  let prevJump = false;
  let prevShift = false;
  return (s) => {
    const want = policy(s, mem, f);
    if (want === null || typeof want !== 'object') throw new Error(`policy returned ${want} at tick ${f} (return {} for no input)`);
    f++;
    const input = {
      left: !!want.left,
      right: !!want.right,
      jumpHeld: !!want.jump,
      jumpPressed: !!want.jump && !prevJump,
      shiftPressed: !!want.shift && !prevShift,
    };
    prevJump = !!want.jump;
    prevShift = !!want.shift;
    return input;
  };
}

// Run a policy until win or frame limit. Collects all events.
export function play(lvl, policy, maxFrames = 120 * 60) {
  let s = initState(lvl);
  const events = [];
  const next = inputsFrom(policy);
  for (let f = 0; f < maxFrames && !s.won; f++) {
    s = step(lvl, s, next(s));
    events.push(...s.events);
  }
  return { state: s, events };
}

export const tx = (s) => s.player.x / TILE;
export const ty = (s) => s.player.y / TILE;

// ---------- fairness: how much timing slack each required input has ----------

// Run a policy and record the input frame it produced on every tick.
export function recordInputs(lvl, policy, maxFrames = 120 * 40) {
  let s = initState(lvl);
  const next = inputsFrom(policy);
  const inputs = [];
  for (let f = 0; f < maxFrames && !s.won; f++) {
    const input = next(s);
    inputs.push(input);
    s = step(lvl, s, input);
  }
  return { inputs, won: s.won, shifts: s.shifts };
}

// Replay recorded inputs; true if it wins without dying. After the recording ends, keep holding the last
// movement for up to 2 s (moving a press later can need a little longer to finish).
export function replayWins(lvl, inputs) {
  let s = initState(lvl);
  const tail = { ...inputs[inputs.length - 1], jumpPressed: false, shiftPressed: false };
  for (let f = 0; f < inputs.length + 240 && !s.won; f++) {
    s = step(lvl, s, inputs[f] ?? tail);
    if (s.deaths > 0) return false;
  }
  return s.won;
}

// For every shift and jump press in a winning run: how many ms it can move earlier or later (one press at a
// time, everything else unchanged) and still win. Capped at ±500 ms.
export function inputWindows(lvl, policy) {
  const { inputs, won } = recordInputs(lvl, policy);
  if (!won) throw new Error('the scripted run does not win');
  const out = [];
  for (const kind of ['shiftPressed', 'jumpPressed']) {
    inputs.forEach((inp, f) => {
      if (!inp[kind]) return;
      const moved = (d) => {
        const g = f + d;
        if (g < 0 || g >= inputs.length) return false;
        const c = inputs.map((x) => ({ ...x }));
        c[f][kind] = false;
        c[g][kind] = true;
        if (kind === 'jumpPressed') for (let k = Math.min(f, g); k <= Math.max(f, g); k++) c[k].jumpHeld = true;
        return replayWins(lvl, c);
      };
      let lo = 0;
      let hi = 0;
      while (lo > -60 && moved(lo - 1)) lo--;
      while (hi < 60 && moved(hi + 1)) hi++;
      out.push({ kind: kind === 'shiftPressed' ? 'shift' : 'jump', at: f / 120, ms: Math.round(((hi - lo + 1) * 1000) / 120) });
    });
  }
  return out.sort((a, b) => a.at - b.at);
}
