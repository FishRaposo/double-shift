import { step, initState, parseLevel, NO_INPUT, TILE, freakBoxes, standableSpot, overridesAfter, PARAMS, DAY, NIGHT } from '../src/rules.js';

// The slack every required input must have, by act (Fish, 2026-11-02; docs/LEVELS.md §1).
export const WINDOW_FLOOR = (act) => (act <= 2 ? 200 : 100);

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

// ---------- random search: is there a route the level didn't mean to allow? ----------

export function rng(seed = 7) {
  return () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff;
}

// One random attempt with fewer than `par` clock-ins: walks left, right or stands in random stretches, jumps at
// random, and clocks in at a random moment or a random column. Early presses are likelier, since a shortcut is
// usually near the spawn. The clock-ins it took if it won without dying, else Infinity.
export function randomAttempt(lvl, par, rnd, seconds = 9) {
  const end = seconds * 120;
  const moves = [];
  for (let t = 0; t < end;) {
    const n = 30 + Math.floor(rnd() * 300);
    moves.push({ to: (t += n), dir: rnd() < 0.45 ? 1 : rnd() < 0.8 ? -1 : 0 });
  }
  const when = () => Math.floor(rnd() ** 2 * end);
  const jumps = Array.from({ length: Math.floor(rnd() * 8) }, () => ({ at: when(), hold: 8 + Math.floor(rnd() * 60) }));
  const shifts = Array.from({ length: Math.floor(rnd() * par) }, () => (rnd() < 0.5 ? { at: when() } : { col: rnd() * lvl.w, done: false }));
  let s = initState(lvl);
  const next = inputsFrom((st, mem, f) => {
    const dir = (moves.find((m) => f < m.to) ?? { dir: 0 }).dir;
    const col = st.player.x / TILE;
    const shift = shifts.some((p) => (p.col === undefined ? f === p.at : !p.done && Math.abs(col - p.col) < 0.4 && (p.done = true)));
    return { left: dir < 0, right: dir > 0, jump: jumps.some((j) => f >= j.at && f < j.at + j.hold), shift };
  });
  for (let f = 0; f < end && !s.won && s.deaths === 0; f++) s = step(lvl, s, next(s));
  return s.won && s.deaths === 0 ? s.shifts : Infinity;
}

// The fewest clock-ins any of `tries` random attempts won with (Infinity: none won).
export function searchBelowPar(lvl, par, tries, seed = 7) {
  const rnd = rng(seed);
  let fewest = Infinity;
  for (let i = 0; i < tries; i++) fewest = Math.min(fewest, randomAttempt(lvl, par, rnd));
  return fewest;
}

// ---------- fairness: respawn spots against patrols ----------

// Every place a freak's active box can be over its whole cycle, sampled on both clocks (the supervisor watches,
// it doesn't patrol).
export function patrolBoxes(lvl) {
  const s = initState(lvl);
  const out = [];
  for (let t = 0; t <= 20; t += 1 / 30) {
    s.freakClock = t;
    s.dayClock = t;
    for (const b of freakBoxes(lvl, s)) if (b.active && b.kind !== 'supervisor') out.push(b);
  }
  return out;
}

// Every place you can respawn: the spawn, exactly where initState puts you, and each checkpoint standing (or
// hanging) wherever a shift's gravity gives it ground, in every prank state the level reaches (night entries
// 0 up to the last first-firing plus two rounds of any repeating prank), the same standableSpot the rules save with.
export function respawnSpots(lvl) {
  const start = initState(lvl).checkpoint;
  const last = Math.max(0, ...lvl.pranks.map((pr) => pr.onNight + 2 * (pr.every ?? 0)));
  const seen = new Set();
  const spots = [{ x: start.x, y: start.y, at: 'spawn' }];
  for (let entries = 0; entries <= last; entries++) {
    const ov = overridesAfter(lvl, entries);
    for (const { tx, ty } of lvl.checkpoints) {
      for (const layer of [DAY, NIGHT]) {
        const pos = standableSpot(lvl, layer, tx, ty, ov);
        const key = pos && `${pos.x},${pos.y}`;
        if (!pos || seen.has(key)) continue;
        seen.add(key);
        spots.push({ ...pos, at: `${tx},${ty}${entries ? ` after ${entries} night entries` : ''}` });
      }
    }
  }
  return spots;
}

// The first patrol box a respawn spot overlaps, if any.
export function spotInPatrol(p, boxes) {
  return boxes.find((b) => p.x < b.x + b.w && p.x + PARAMS.playerW > b.x && p.y < b.y + b.h && p.y + PARAMS.playerH > b.y);
}


// The scripted policy replayed as a player who reacts `ticks` ticks (1 tick = 1000/120 ms) late to everything.
// Returns true if it still wins without dying; with `info` (an object) it fills in where it ended.
export function delayed(lvl, policy, ticks, info = {}) {
  let s = initState(lvl);
  const mem = {};
  const queue = [];
  let pj = false;
  let ps = false;
  for (let f = 0; f < 120 * 40 && !s.won; f++) {
    queue.push(policy(s, mem, f) || {});
    const w = queue.length > ticks ? queue.shift() : {};
    const input = { left: !!w.left, right: !!w.right, jumpHeld: !!w.jump, jumpPressed: !!w.jump && !pj, shiftPressed: !!w.shift && !ps };
    pj = !!w.jump;
    ps = !!w.shift;
    s = step(lvl, s, input);
    if (s.deaths > 0) {
      info.at = f;
      info.state = s;
      return false;
    }
  }
  info.at = 120 * 40;
  info.state = s;
  return s.won;
}
