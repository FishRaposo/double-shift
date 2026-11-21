// Level-validation instruments: ways a level can be beaten that its author did not mean (the "cheese" a player
// finds). Shared by test/cheese.test.mjs (coarse grids, a fast run) and `npm run audit` (fine grids).
//
//  1. noShiftSweep     below-par cheese: from states along the scripted run, hold a direction and jump (twice) with
//                      NO further clock-in. A win with fewer clock-ins than the level's `min` is a shortcut.
//  2. jobSkipSweep     the work order neutralised (tool and fix out of reach) and up to a few extra clock-ins: a win
//                      at or under `min` means the repair is optional.
//  3. wasteNightCheck  one night entry wasted (two clock-ins at the first safe spot), then the scripted policy (seeing
//                      the state with the waste subtracted): if it can't win, can the player still win from the last
//                      checkpoint, or is the level softlocked until R?
//
// Nothing here edits src/ or a level: a level is only ever copied (neutralised) and a policy is only ever wrapped.
import { step, initState, NO_INPUT, gravitySign } from '../src/rules.js';
import { inputsFrom, rng } from './helpers.mjs';

const input = (o) => ({ ...NO_INPUT, ...o });

function range(a, b, d) {
  const out = [];
  for (let x = a; x <= b; x += d) out.push(x);
  return out;
}

// Grid sizes. `every`: ticks between samples of the scripted run (a sample is also taken at the start, after every
// clock-in, and after every tool/fix touch). `ks`: ticks of walking before the jump. `holds`: how long the jump
// key stays down (a hop, a medium jump, a full one). `second`: an optional second jump on the next landing.
// `seconds`: how long a macro runs. `skip` is the same for the job-skip sweep, which also has `shiftTicks` and
// `extraShifts`: where, and how many, extra clock-ins a macro may use; its `every` is a multiple of the main one.
// `searchTries`: random attempts from the respawn of a wasted-night level; `wasteEvery`: ticks between the points of
// the scripted run where a night is wasted (0: only at the spawn).
export const COARSE = {
  every: 120,
  ks: range(0, 120, 12),
  holds: [12, 70],
  second: [null, { wait: 0, hold: 70 }],
  seconds: 3.5,
  skip: { every: 360, ks: range(0, 120, 24), holds: [14, 70], second: [null, { wait: 0, hold: 70 }], seconds: 3.5, shiftTicks: [0, 60], extraShifts: 1 },
  searchTries: 150,
  wasteEvery: 0,
};
export const FINE = {
  every: 60,
  ks: range(0, 120, 6),
  holds: [8, 14, 28, 60],
  second: [null, { wait: 0, hold: 28 }, { wait: 0, hold: 70 }, { wait: 20, hold: 70 }],
  seconds: 4,
  skip: { every: 120, ks: range(0, 120, 12), holds: [10, 30, 70], second: [null, { wait: 0, hold: 34 }, { wait: 0, hold: 80 }], seconds: 4, shiftTicks: [0, 30, 70, 120], extraShifts: 1 },
  searchTries: 600,
  wasteEvery: 240,
};

const fmtT = (ticks) => `${(ticks / 120).toFixed(2)} s`;
const tiles = (s) => `${(s.player.x / 30).toFixed(1)},${(s.player.y / 30).toFixed(1)}`;

// ---------- sampling the scripted run ----------

// Run a policy to its win, keeping the input frame of every tick and a state sample every `every` ticks and after
// every clock-in or job touch. A sample is { f: ticks played so far, why, s, fixed }, `fixed[i]` saying job i's fix
// has been placed or pulled by then (the world has changed because of it). Samples that repeat an earlier one
// (same place, speed, layer, clock-ins, jobs and clock second: a policy standing still) are dropped.
export function sampleRun(lvl, policy, { every = 60, maxTicks = 120 * 60 } = {}) {
  let s = initState(lvl);
  const next = inputsFrom(policy);
  const inputs = [];
  const samples = [{ f: 0, why: 'start', s, fixed: lvl.repairs.map(() => false) }];
  const fixed = lvl.repairs.map(() => false);
  const seen = new Set();
  const key = (st) => {
    const p = st.player;
    return [st.layer, Math.round(p.x), Math.round(p.y), Math.round(p.vx), Math.round(p.vy / 20), p.grounded, st.shifts, st.nightEntries, st.repairs.map((j) => `${+j.tool}${+j.done}`).join(''), Math.floor(st.freakClock), Math.floor(st.dayClock)].join();
  };
  seen.add(key(s));
  for (let f = 1; f <= maxTicks && !s.won; f++) {
    const inp = next(s);
    inputs.push(inp);
    s = step(lvl, s, inp);
    for (const e of s.events) if (e.type === 'repaired' || e.type === 'pulled') fixed[e.job] = true;
    const why = s.events.map((e) => e.type).find((t) => t === 'shift' || t === 'tool' || t === 'repaired' || t === 'pulled');
    if (!s.won && (why || f % every === 0)) {
      const k = key(s);
      if (!seen.has(k)) {
        seen.add(k);
        samples.push({ f, why: why ?? 'tick', s, fixed: [...fixed] });
      }
    }
  }
  return { samples, inputs, won: s.won, shifts: s.shifts, deaths: s.deaths, ticks: inputs.length };
}

// ---------- the macros ----------

// A macro: hold `dir` ('right' or 'left'); clock in at each tick of `shifts`; press jump `k` ticks in and hold it
// `hold` ticks; if `second`, press jump again `second.wait` ticks after the first landing and hold it
// `second.hold`. All ticks are counted from the sample. `m` is the running machine's memory (the second jump is
// decided from the state, at the landing).
function frame(macro, m, t, s) {
  const rel = t - macro.k;
  const sec = macro.second;
  let jumpPressed = rel === 0;
  let jumpHeld = rel >= 0 && rel < macro.hold;
  if (sec && rel > 0) {
    if (!s.player.grounded) m.air = true;
    else if (m.air && m.j2 === undefined) m.j2 = rel + sec.wait;
    if (m.j2 !== undefined) {
      jumpPressed ||= rel === m.j2;
      jumpHeld ||= rel >= m.j2 && rel < m.j2 + sec.hold;
    }
  }
  const spent = rel >= macro.hold && (!sec || (m.j2 !== undefined ? rel >= m.j2 + sec.hold : rel > 2 && !m.air && s.player.grounded));
  m.done = spent;
  return input({ left: macro.dir === 'left', right: macro.dir === 'right', jumpPressed, jumpHeld, shiftPressed: macro.shifts.includes(t) });
}

const settled = (m, s) => m.done && s.player.grounded && s.player.vx === 0 && !s.shiftPending;

// Run a macro from sample state `s0` for up to `horizon` ticks (tick 0 = the sample); stops at a death, a win, or
// once the inputs are spent and the player stands still. `from`: { s, t }, a prefix already played (the walk up
// to the jump, which many macros share).
export function runMacro(lvl, s0, macro, horizon, from = { s: s0, t: 0 }) {
  let { s, t } = from;
  const m = {};
  for (; t < horizon; t++) {
    s = step(lvl, s, frame(macro, m, t, s));
    if (s.won || s.deaths > s0.deaths || settled(m, s)) break;
  }
  return { s, t };
}

// The input frames a macro plays, for replaying it from the start of a level.
export function macroInputs(lvl, s0, macro, horizon) {
  const out = [];
  let s = s0;
  const m = {};
  for (let t = 0; t < horizon; t++) {
    const inp = frame(macro, m, t, s);
    out.push(inp);
    s = step(lvl, s, inp);
    if (s.won || s.deaths > s0.deaths || settled(m, s)) break;
  }
  return out;
}

// Choose up to `n` ticks out of `ticks`: [[], [a], [b], ..., [a, b], ...] in a stable order.
function shiftCombos(ticks, n) {
  const out = [[]];
  if (n >= 1) for (const a of ticks) out.push([a]);
  if (n >= 2) for (const a of ticks) for (const b of ticks) if (b > a) out.push([a, b]);
  return out;
}

// The macros that share a walk, a jump key and a hold, differing only in the second jump: play the first jump to
// its landing once, then branch each second jump from there. `finish(state, macro)` is called with every end
// state and returns a finding or null.
function branch(lvl, s0, walkState, base, seconds, horizon, finish) {
  const { k, hold, shifts } = base;
  let s = walkState;
  let air = false;
  let landing = null;
  const m = {};
  let t = k;
  for (; t < horizon; t++) {
    const rel = t - k;
    if (rel > 0) {
      if (!s.player.grounded) air = true;
      else if (air && !landing) landing = { s, t };
    }
    s = step(lvl, s, frame({ ...base, second: null }, m, t, s));
    if (s.won || s.deaths > s0.deaths || settled(m, s)) break;
  }
  const hit = finish(s, { ...base, second: null });
  if (hit) return hit;
  if (!landing) return null;
  for (const second of seconds) {
    if (!second) continue;
    const macro = { ...base, second };
    let u = landing.s;
    for (let tt = landing.t; tt < horizon; tt++) {
      const rel = tt - k;
      const at = landing.t - k + second.wait;
      u = step(lvl, u, input({
        left: base.dir === 'left',
        right: base.dir === 'right',
        jumpPressed: rel === at,
        jumpHeld: rel >= at && rel < at + second.hold,
        shiftPressed: shifts.includes(tt),
      }));
      if (u.won || u.deaths > s0.deaths) break;
      if (rel >= at + second.hold && u.player.grounded && u.player.vx === 0 && !u.shiftPending) break;
    }
    const found = finish(u, macro);
    if (found) return found;
  }
  return null;
}

// Every macro on the grid, from every sample, on level `lvl`. `accept(state, sample)` says whether a final win is a
// finding. One finding per sample; `all: false` stops at the first sample with one. Returns
// [{ sample, macro, state }]. `grid`: { ks, holds, second, seconds, shiftTicks }; `dirs` say which ways to walk, and
// `shiftDirs` which of them also try the extra clock-ins (`extraShifts` of them, at `grid.shiftTicks`).
export function sweep(lvl, samples, grid, { extraShifts = 0, accept, all = false, only = () => true, dirs = ['right', 'left'], shiftDirs = dirs } = {}) {
  const found = [];
  const horizon = grid.seconds * 120;
  const kMax = Math.max(...grid.ks);
  const combos = shiftCombos(extraShifts > 0 ? grid.shiftTicks : [], extraShifts);
  for (const sample of samples) {
    if (!only(sample)) continue;
    let hit = null;
    for (const dir of dirs) {
      for (const shifts of combos) {
        if (shifts.length && !shiftDirs.includes(dir)) continue;
        // the walk before the jump, shared by every macro that jumps later on it
        const walk = [sample.s];
        for (let t = 0; t < kMax; t++) {
          const cur = walk[t];
          if (cur.won || cur.deaths > sample.s.deaths) break;
          walk.push(step(lvl, cur, input({ left: dir === 'left', right: dir === 'right', shiftPressed: shifts.includes(t) })));
        }
        for (const k of grid.ks) {
          if (k >= walk.length) break;
          for (const hold of grid.holds) {
            hit = branch(lvl, sample.s, walk[k], { dir, shifts, k, hold }, grid.second, horizon, (s, macro) => (s.won && s.deaths === sample.s.deaths && accept(s, sample) ? { sample, macro, state: s } : null));
            if (hit) break;
          }
          if (hit) break;
        }
        if (hit) break;
      }
      if (hit) break;
    }
    if (hit) {
      found.push(hit);
      if (!all) break;
    }
  }
  return found;
}

// A one-line description of a finding that a person can replay.
export function describeHit(h) {
  const m = h.macro;
  const at = `scripted run at ${fmtT(h.sample.f)} (${h.sample.why}, ${tiles(h.sample.s)}, ${h.sample.s.layer ? 'night' : 'day'}, ${h.sample.s.shifts} clock-ins so far)`;
  const act = `${m.dir === 'left' ? 'hold left' : 'hold right'}${m.shifts.length ? `, clock in at +${m.shifts.join('/')}` : ''}, jump at +${m.k} ticks held ${m.hold}${m.second ? `, again ${m.second.wait} after landing held ${m.second.hold}` : ''}`;
  return `${at}: ${act} -> won with ${h.state.shifts} clock-ins`;
}

// The whole input list that reproduces a finding from the start of the level.
export function hitInputs(lvl, run, h, horizon = 4 * 120 + 60) {
  return run.inputs.slice(0, h.sample.f).concat(macroInputs(lvl, h.sample.s, h.macro, horizon));
}

// Replay input frames from the start; the final state.
export function replay(lvl, inputs) {
  let s = initState(lvl);
  for (const i of inputs) {
    s = step(lvl, s, i);
    if (s.won) break;
  }
  return s;
}

// ---------- instrument 1: below-par cheese ----------

// Findings: wins with fewer clock-ins than `lvl.min` and nothing more than a walk and a hop or two.
export function noShiftSweep(lvl, policy, grid, { all = false } = {}) {
  const run = sampleRun(lvl, policy, { every: grid.every });
  const hits = sweep(lvl, run.samples, grid, { all, accept: (s) => s.shifts < lvl.min });
  return { run, hits };
}

// ---------- instrument 2: the work order is skipped ----------

// A copy of the level with job `i` out of reach: its tool and every spot moved off the grid. The level's own
// parse is shared, nothing in it is edited.
export const neutralised = (lvl, i) => ({
  ...lvl,
  repairs: lvl.repairs.map((job, k) => (k !== i ? job : {
    ...job,
    tool: { ...job.tool, tx: -9, ty: -9 },
    spots: job.spots.map((f) => ({ ...f, tx: -9, ty: -9, area: undefined })),
  })),
});

// For each job: states of the scripted run from before that job's fix was ever placed (so the world is exactly what
// a player who never fixes it would see), tried on the neutralised level with up to `grid.skip.extraShifts` more
// clock-ins. A win with at most `min` clock-ins skips the job. `run` is a sampleRun of the real level; `jobs` limits
// it to some work orders.
export function jobSkipSweep(lvl, run, grid, { all = false, jobs = null } = {}) {
  const out = [];
  lvl.repairs.forEach((job, i) => {
    if (jobs && !jobs.includes(i)) return;
    const bare = neutralised(lvl, i);
    const sk = grid.skip;
    const hits = sweep(bare, run.samples, sk, {
      all,
      extraShifts: sk.extraShifts,
      shiftDirs: ['right'],
      only: (sm) => !sm.fixed[i] && (sm.why !== 'tick' || sm.f % sk.every === 0),
      accept: (s) => s.shifts <= lvl.min && !s.repairs[i].done,
    });
    for (const h of hits) out.push({ job: i, name: job.tool.name, ...h });
  });
  return out;
}

// A policy played on the level with job `i` out of reach: the final state. For fixed regression policies such
// as the doors no-bolt route.
export function playBare(lvl, i, policy, maxTicks = 120 * 45) {
  const bare = neutralised(lvl, i);
  let s = initState(bare);
  const next = inputsFrom(policy);
  for (let f = 0; f < maxTicks && !s.won; f++) s = step(bare, s, next(s));
  return s;
}

// ---------- instrument 3: one wasted night ----------

// Two clock-ins in a row (day to night and back, or the reverse) at the first tick of a walk where both are
// allowed and nothing dies: a night entry that did nothing. Walks right from the state until it can. Returns
// { s: the state after the waste, walked, at, w: what to hide from a policy } or null.
export function wasteNight(lvl, s0, { maxWalk = 600 } = {}) {
  let s = s0;
  for (let t = 0; t <= maxWalk; t++) {
    const a = step(lvl, s, input({ shiftPressed: true }));
    if (a.layer !== s.layer && a.deaths === s.deaths) {
      const b = step(lvl, a, input({ shiftPressed: true }));
      const entries = b.nightEntries - s.nightEntries;
      if (b.layer === s.layer && b.deaths === s.deaths && !b.shiftPending && entries > 0) {
        return {
          s: b,
          walked: t,
          at: { x: s.player.x, y: s.player.y, layer: s.layer },
          w: { entries, shifts: 2, freakClock: b.freakClock - s.freakClock, dayClock: b.dayClock - s.dayClock, atEntry: b.nightEntries },
        };
      }
    }
    s = step(lvl, s, input({ right: true }));
    if (s.won || s.deaths > s0.deaths) return null;
  }
  return null;
}

// What a policy sees once the waste is hidden: the entry count, clock-ins and clocks as if it never happened.
// `active`: whether the waste is still part of the world (a respawn at a checkpoint banked before it undoes it).
function viewOf(s, w, active) {
  const e = active ? w.entries : 0;
  return {
    ...s,
    shifts: s.shifts - w.shifts,
    nightEntries: s.nightEntries - e,
    freakClock: s.freakClock - w.freakClock,
    dayClock: s.dayClock - w.dayClock,
    repairs: e ? s.repairs.map((j) => (j.done && j.since >= w.atEntry ? { ...j, since: j.since - e } : j)) : s.repairs,
  };
}

// Play a policy from state `s0` with the waste hidden from it. Deaths are allowed (the level's own respawns
// apply); the run ends at a win or after `maxTicks`; `next` is the policy's input source (one that has already
// played part of the run keeps its memory). `cpWasted` says whether the last checkpoint was banked with
// the waste in the world, and `cpState` is the state at that moment.
export function playHidden(lvl, s0, w, policy, maxTicks, next = inputsFrom(policy)) {
  let s = s0;
  let wasted = true;
  let cpWasted = false;
  let cpState = s0;
  for (let f = 0; f < maxTicks && !s.won; f++) {
    s = step(lvl, s, next(viewOf(s, w, wasted)));
    for (const e of s.events) {
      if (e.type === 'checkpoint') {
        cpWasted = wasted;
        cpState = s;
      } else if (e.type === 'respawn') wasted = cpWasted;
    }
  }
  return { s, cpWasted, cpState };
}

// A death on demand: the state after the player falls out of the level, i.e. a respawn from the last checkpoint
// with everything a death restores.
export function forcedRespawn(lvl, s) {
  const t = structuredClone(s);
  t.player.y = gravitySign(lvl, t.layer) > 0 ? lvl.h * 30 + 200 : -200;
  t.shiftPending = 0;
  return step(lvl, t, NO_INPUT);
}

// The world a respawn restores, without what the work orders themselves changed: the tile changes of the pranks
// that have fired and the night entries counted so far.
function bankedWorld(lvl, back) {
  const overrides = { ...back.overrides };
  back.repairs.forEach((j, i) => {
    if (j.done) for (const [layer, tx, ty] of lvl.repairs[i].spots[j.at ?? 0].cells) delete overrides[`${layer},${tx},${ty}`];
  });
  return { overrides, nightEntries: back.nightEntries };
}

// Start over in a banked world: the spawn, fresh jobs, the world's tile changes and night entries, and `extra` more
// wasted nights at the spawn (a prank that repeats comes round again). Deaths respawn here. Returns { s, base }
// (base: what a policy must not see) or null.
function worldAtSpawn(lvl, world, extra) {
  let s = initState(lvl);
  s.overrides = { ...world.overrides };
  s.nightEntries = world.nightEntries;
  for (let i = 0; i < extra; i++) {
    const r = wasteNight(lvl, s);
    if (!r) return null;
    s = r.s;
  }
  s.checkpoint = { ...s.checkpoint, overrides: s.overrides, nightEntries: s.nightEntries };
  return { s, base: { entries: s.nightEntries, shifts: s.shifts, freakClock: s.freakClock, dayClock: s.dayClock, atEntry: s.nightEntries } };
}

// A random attempt from state `s0`: walks, jumps and clock-ins at random ticks or columns, `seconds` long. True if it
// wins without dying.
export function randomFrom(lvl, s0, rnd, seconds, maxShifts, rec = null) {
  const end = seconds * 120;
  const moves = [];
  for (let t = 0; t < end;) moves.push({ to: (t += 30 + Math.floor(rnd() * 300)), dir: rnd() < 0.5 ? 1 : rnd() < 0.85 ? -1 : 0 });
  const when = () => Math.floor(rnd() ** 2 * end);
  const jumps = Array.from({ length: Math.floor(rnd() * 8) }, () => ({ at: when(), hold: 8 + Math.floor(rnd() * 60) }));
  const shifts = Array.from({ length: Math.floor(rnd() * (maxShifts + 1)) }, () => (rnd() < 0.5 ? { at: when() } : { col: rnd() * lvl.w, done: false }));
  let s = s0;
  const next = inputsFrom((st, mem, f) => {
    const dir = (moves.find((m) => f < m.to) ?? { dir: 0 }).dir;
    const col = st.player.x / 30;
    const shift = shifts.some((p) => (p.col === undefined ? f === p.at : !p.done && Math.abs(col - p.col) < 0.4 && (p.done = true)));
    return { left: dir < 0, right: dir > 0, jump: jumps.some((j) => f >= j.at && f < j.at + j.hold), shift };
  });
  for (let f = 0; f < end && !s.won && s.deaths === s0.deaths; f++) {
    const inp = next(s);
    rec?.push(inp);
    s = step(lvl, s, inp);
  }
  return s.won && s.deaths === s0.deaths;
}

// Does a run from `s0` still win, without dying, with each press of the input list moved up to `d` ticks (d = 6 is
// 50 ms) earlier or later? A recovery that only one frame's timing finds is not one a player can use.
export function robustFrom(lvl, s0, inputs, d = 6) {
  const wins = (list) => {
    let s = s0;
    for (const i of list) {
      s = step(lvl, s, i);
      if (s.won || s.deaths > s0.deaths) break;
    }
    return s.won && s.deaths === s0.deaths;
  };
  if (!wins(inputs)) return false;
  for (const kind of ['shiftPressed', 'jumpPressed']) {
    for (let f = 0; f < inputs.length; f++) {
      if (!inputs[f][kind]) continue;
      for (const delta of [-d, -(d >> 1), d >> 1, d]) {
        const g = f + delta;
        if (g < 0 || g >= inputs.length) continue;
        const c = inputs.map((x) => ({ ...x }));
        c[f][kind] = false;
        c[g][kind] = true;
        if (kind === 'jumpPressed') for (let k = Math.min(f, g); k <= Math.max(f, g); k++) c[k].jumpHeld = true;
        if (!wins(c)) return false;
      }
    }
  }
  return true;
}

// One night entry wasted at the first safe spot from tick `at` of the scripted run (0: the spawn; the policy plays
// the ticks before it as usual), then the scripted policy with the waste hidden from it. If it wins: 'ok'. If not, the player needs a way back, and
// what a death restores is the last checkpoint, so the question is whether the world banked there can still be won:
//   recovers  the policy wins again from the respawn (after up to three more wasted nights), or wins the banked
//             world from the spawn after up to `maxExtra` more wasted nights (the player walks back and waits for a
//             repeating prank to come round), or a random search wins from the respawn
//   softlock  none of those does: the world is wrecked and only R restarts it
//   no-waste  there is nowhere to clock in and out again
// The walk back to the spawn is assumed possible, and a route other than the scripted one is only found by the
// random search: "softlock" means "no win found", and `how` says what was tried.
export function wasteNightCheck(lvl, policy, grid, { at = 0, maxTicks = 120 * 60, maxExtra = 6, seed = 7 } = {}) {
  let s0 = initState(lvl);
  const next = inputsFrom(policy);
  for (let f = 0; f < at && !s0.won; f++) s0 = step(lvl, s0, next(s0));
  const w = s0.won ? null : wasteNight(lvl, s0);
  if (!w) return { verdict: 'no-waste' };
  const first = playHidden(lvl, w.s, w.w, policy, maxTicks, next);
  const info = { waste: w, deaths: first.s.deaths };
  if (first.s.won) return { ...info, verdict: 'ok' };
  const cp = first.s.checkpoint;
  const cpInfo = { id: cp.id, nightEntries: cp.nightEntries, banked: first.cpWasted, overrides: Object.keys(cp.overrides).length, jobs: cp.repairs.map((j) => (j.done ? 'done' : j.tool ? 'tool' : '-')).join('/') };
  const recovers = (how) => ({ ...info, verdict: 'recovers', cp: cpInfo, how });
  const back = forcedRespawn(lvl, first.cpState);
  // 1. the policy from the respawn, as is and after more wasted nights there
  let s = back;
  let hide = { ...w.w };
  for (let extra = 0; extra <= 3; extra++) {
    if (extra) {
      const more = wasteNight(lvl, s);
      if (!more) break;
      s = more.s;
      hide = { ...hide, entries: hide.entries + more.w.entries, shifts: hide.shifts + 2, freakClock: hide.freakClock + more.w.freakClock, dayClock: hide.dayClock + more.w.dayClock };
    }
    if (playHidden(lvl, s, hide, policy, maxTicks).s.won) return recovers(extra ? `the policy wins from the respawn after ${extra} more wasted night${extra > 1 ? 's' : ''}` : 'the policy wins again from the respawn');
  }
  // 2. the banked world, from the spawn, with the policy seeing it as the start of a fresh run
  const world = bankedWorld(lvl, back);
  for (let extra = 0; extra <= maxExtra; extra++) {
    const start = worldAtSpawn(lvl, world, extra);
    if (!start) break;
    const next = inputsFrom(policy);
    let t = start.s;
    for (let f = 0; f < maxTicks && !t.won; f++) t = step(lvl, t, next(viewOf(t, start.base, true)));
    if (t.won) return recovers(`the banked world is won from the spawn after ${extra} more wasted night${extra === 1 ? '' : 's'}`);
  }
  // 3. a random search from the respawn; a win only counts if it survives each press moving 50 ms either way
  const rnd = rng(seed);
  let fragile = 0;
  for (let i = 0; i < grid.searchTries; i++) {
    const rec = [];
    if (!randomFrom(lvl, back, rnd, 12, lvl.min + 2, rec)) continue;
    if (robustFrom(lvl, back, rec)) return recovers(`random search, attempt ${i}`);
    fragile++;
  }
  return { ...info, verdict: 'softlock', cp: cpInfo, how: `no win a player could make from the checkpoint: not the policy from the respawn (+3 wasted nights), not the banked world from the spawn (+${maxExtra}), not ${grid.searchTries} random attempts${fragile ? ` (${fragile} won, but only with frame-exact timing)` : ''}` };
}

export const describeWaste = (r, id) => {
  const w = r.waste;
  const where = w ? ` (wasted at ${(w.at.x / 30).toFixed(1)},${(w.at.y / 30).toFixed(1)}, ${w.walked} ticks in)` : '';
  const cp = r.cp ? `; last checkpoint ${r.cp.id ?? 'spawn'}: ${r.cp.nightEntries} night entries, ${r.cp.overrides} tile changes banked${r.cp.banked ? ' with the wasted night' : ''}, jobs ${r.cp.jobs}` : '';
  return `${id}: ${r.verdict}${where}${r.how ? `; ${r.how}` : ''}${cp}`;
};
