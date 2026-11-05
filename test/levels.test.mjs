// Every level is completable at par by a scripted run, and no level can be won with zero shifts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, CLOCKOUT_CLASSIC } from '../src/levels.js';
import { DAY, NIGHT, TILE, NO_INPUT, PARAMS, initState, step, tileAt, supervisorFacing, parseLevel, freakBoxes, gravitySign } from '../src/rules.js';
import { play, tx, inputsFrom, recordInputs, searchBelowPar } from './helpers.mjs';
import { skinPlan } from '../src/skins.js';
import { memoNear, memoPanel } from '../src/layout.js';
import { SOLUTIONS, SOLUTIONS_EXTRA, L } from './solutions.mjs';

test('a policy holding jump or shift makes one press until it lets go (play, the audit and the demo GIF)', () => {
  const held = inputsFrom(() => ({ right: true, jump: true, shift: true }));
  assert.deepEqual(held(null), { left: false, right: true, jumpHeld: true, jumpPressed: true, shiftPressed: true });
  assert.deepEqual(held(null), { left: false, right: true, jumpHeld: true, jumpPressed: false, shiftPressed: false });
  const seen = [];
  const next = inputsFrom((s, mem, f) => {
    mem.calls = (mem.calls ?? 0) + 1;
    seen.push([s, f, mem.calls]);
    return f === 1 ? { shift: true } : {};
  });
  assert.deepEqual([next('a'), next('b'), next('c')].map((i) => i.shiftPressed), [false, true, false]);
  assert.deepEqual(seen, [['a', 0, 1], ['b', 1, 2], ['c', 2, 3]], 'the state, the tick and one memory object per run');
});

test("a policy that returns nothing is a bug in the policy, not 'no input'", () => {
  const forgot = inputsFrom((s, mem, f) => { if (f < 1) return { right: true }; });
  assert.equal(forgot(null).right, true);
  assert.throws(() => forgot(null), /policy returned undefined at tick 1/);
});

test('every level has a scripted solution', () => {
  assert.deepEqual(Object.keys(SOLUTIONS).sort(), LEVELS.map((l) => l.id).sort());
});

for (const def of LEVELS) {
  test(`${def.name}: completable at par (${def.par}) with no deaths`, () => {
    const { state, events } = play(L[def.id], SOLUTIONS[def.id], 120 * 30);
    assert.equal(state.won, true);
    assert.ok(state.shifts <= def.par, `took ${state.shifts} shifts, par ${def.par}`);
    assert.equal(events.filter((e) => e.type === 'death').length, 0);
  });

  test(`${def.name}: cannot be won without shifting (running and jumping only)`, () => {
    const lvl = L[def.id];
    for (const jumpEvery of [0, 20, 45, 70]) {
      const { state } = play(lvl, (s, m, f) => ({ right: true, jump: jumpEvery && f % jumpEvery < 12 }), 120 * 12);
      assert.equal(state.won, false, `won with jumpEvery=${jumpEvery}`);
    }
  });
}

test('Inventory: the plank moves on the second clock-in, not before', () => {
  const lvl = L.inventory;
  const { events } = play(lvl, SOLUTIONS.inventory, 120 * 30);
  const order = events.filter((e) => e.type === 'shift' || e.type === 'prank').map((e) => e.type);
  assert.deepEqual(order, ['shift', 'shift', 'shift', 'prank']);
});

test('Night Watch: staying on night through the tunnel gets you spooked by the lurker', () => {
  const policy = (s) => ({ right: true, shift: s.layer === DAY && tx(s) > 3 });
  const { events } = play(L.watch, policy, 120 * 8);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'spooked'));
});

test('Night Watch: walking into the peeker while it is out gets you spooked', () => {
  const policy = (s) => {
    const x = tx(s);
    let target = s.layer;
    if (x > 3 && x < 8.6) target = NIGHT;
    else if (x >= 8.6 && x < 15.3) target = DAY;
    else if (x >= 15.3) target = NIGHT;
    let right = true;
    if (s.layer === NIGHT && x > 20.5 && x < 22.3) right = s.freakClock % 1.6 < 0.4; // go while it's out
    return { right, shift: s.layer !== target };
  };
  const { events } = play(L.watch, policy, 120 * 8);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'spooked'));
});

test('Night Watch: the night roof stops you jumping the peeker and squatter (no 3-clock-in skip)', () => {
  // night into the tunnel, day to freeze the lurker, night out — then stay on night and jump everything
  const policy = (s) => {
    const x = tx(s);
    let target = s.layer;
    if (x > 3 && x < 8.6) target = NIGHT;
    else if (x >= 8.6 && x < 15.3) target = DAY;
    else if (x >= 15.3) target = NIGHT;
    return { right: true, jump: x > 19, shift: s.layer !== target };
  };
  const { state, events } = play(L.watch, policy, 120 * 10);
  assert.equal(state.won && events.filter((e) => e.type === 'death').length === 0, false);
});

test('Broad Daylight: staying on day through the tunnel gets you spooked by the day-walker', () => {
  const { events } = play(L.daywalker, () => ({ right: true }), 120 * 8);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'spooked' && e.by === 'daywalker'));
});

test('Broad Daylight: the day-walker cannot be jumped (the tunnel roof stops you)', () => {
  const { events } = play(L.daywalker, (s, m, f) => ({ right: true, jump: f % 30 < 15 }), 120 * 8);
  assert.ok(events.some((e) => e.type === 'death' && e.by === 'daywalker'));
});

test('Stacked: clocking in twice before gap A takes the bridge away; the pit resets the pranks', () => {
  // in, out, in again on the spawn floor: entry 2 removes the bridge before you've crossed it
  const policy = (s, m) => {
    const x = tx(s);
    m.n = m.n ?? 0;
    if (s.deaths > 0) return { right: false };
    let target = s.layer;
    if (x > 2.5 && s.nightEntries === 0) target = NIGHT;
    else if (x > 3.2 && x < 3.8 && s.nightEntries === 1) target = DAY;
    else if (x >= 3.8 && s.nightEntries === 1 && s.layer === DAY) target = NIGHT;
    return { right: true, shift: s.layer !== target };
  };
  const { state, events } = play(L.stacked, policy, 120 * 6);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'fall'), 'fell where the bridge used to be');
  assert.equal(state.nightEntries, 0, 'respawn restored the pranks');
  assert.equal(state.won, false);
});

test('Clock Out (classic): still wins at par 7', () => {
  const lvl = parseLevel(CLOCKOUT_CLASSIC);
  const { state } = play(lvl, SOLUTIONS_EXTRA.clockoutClassic);
  assert.equal(state.won, true);
  assert.equal(state.deaths, 0);
  assert.ok(state.shifts <= CLOCKOUT_CLASSIC.par, `${state.shifts} clock-ins`);
  assert.equal(CLOCKOUT_CLASSIC.par, 7);
});

test('Clock Out (classic): without the fourth clock-in the step stays gone and the time clock is out of reach', () => {
  const { state } = play(parseLevel(CLOCKOUT_CLASSIC), (s, m, f) => {
    const want = SOLUTIONS_EXTRA.clockoutClassic(s, m, f);
    return s.nightEntries >= 3 && tx(s) > 25 ? { right: true, jump: s.player.grounded || s.player.vy < 0 } : want;
  }, 120 * 12);
  assert.equal(state.won, false);
});

test('Mind Your Head: the first clock-in lands you on the walkway', () => {
  const lvl = L.upside;
  let s = initState(lvl);
  let f = 0;
  for (; f < 120 * 10 && s.shifts === 0; f++) s = step(lvl, s, { ...NO_INPUT, right: true, shiftPressed: tx(s) > 7 });
  assert.equal(s.layer, NIGHT);
  for (let i = 0; i < 120 && !s.player.grounded; i++) s = step(lvl, s, { ...NO_INPUT, right: true });
  assert.equal(s.player.grounded, true, 'hanging');
  assert.equal(s.player.y, 12 * TILE, 'under the walkway (night row 11, the day walkway at row 6 turned over)');
  assert.equal(s.deaths, 0);
});

test('Mind Your Head: staying on night after the walkway never reaches the exit', () => {
  const lvl = L.upside;
  for (const jumpEvery of [0, 30, 55]) {
    const { state } = play(lvl, (s, m, f) => ({ right: true, shift: s.shifts === 0 && tx(s) > 7, jump: jumpEvery && f % jumpEvery < 14 }), 120 * 15);
    assert.equal(state.won, false, `won at night with jumpEvery=${jumpEvery}`);
    assert.equal(state.shifts, 1);
  }
});

test('Under Renovation: night alone never reaches the exit', () => {
  const lvl = L.stairs;
  for (const jumpEvery of [0, 25, 40, 60]) {
    const policy = (s, m, f) => ({ right: true, shift: s.shifts === 0, jump: jumpEvery ? f % jumpEvery < 16 : s.player.grounded || s.player.vy < 0 });
    const { state } = play(lvl, policy, 120 * 15);
    assert.equal(state.won, false, `won at night with jumpEvery=${jumpEvery}`);
    assert.equal(state.shifts, 1);
  }
});

test('Lost & Found: the doors go in order D1, D2, D3', () => {
  const { events } = play(L.doors, SOLUTIONS.doors, 120 * 30);
  assert.deepEqual(events.filter((e) => e.type === 'prank').map((e) => e.id), ['door1', 'door2', 'door3']);
});

test('Lost & Found: with two night entries the exit ledge stays out of reach', () => {
  const lvl = L.doors;
  // play the solution until the second door is gone, then stand at the foot of the pile at night and keep trying
  let s = initState(lvl);
  const mem = {};
  let prevShift = false;
  for (let f = 0; f < 120 * 30 && s.nightEntries < 2; f++) {
    const want = SOLUTIONS.doors(s, mem, f);
    s = step(lvl, s, { ...NO_INPUT, right: !!want.right, jumpHeld: !!want.jump, jumpPressed: false, shiftPressed: !!want.shift && !prevShift });
    prevShift = !!want.shift;
  }
  assert.equal(s.nightEntries, 2);
  assert.equal(s.layer, NIGHT);
  Object.assign(s.player, { x: 25 * TILE + 6, y: 14 * TILE - 26, vx: 0, vy: 0, grounded: true });
  for (const jumpEvery of [20, 35, 60]) {
    let t = structuredClone(s);
    for (let f = 0; f < 120 * 8 && !t.won; f++) t = step(lvl, t, { ...NO_INPUT, right: true, jumpHeld: f % jumpEvery < 18, jumpPressed: f % jumpEvery === 0 });
    assert.equal(t.won, false, `climbed with two doors on the pile (jumpEvery=${jumpEvery})`);
  }
});

test('Structural Integrity: the pillar stands at P1, P2, P3 after entries 1, 2, 3', () => {
  const lvl = L.pillar;
  const P = { P0: 6, P1: 11, P2: 20, P3: 13 };
  const standsAt = (s, col) => [10, 11, 12, 13].every((ty) => tileAt(lvl, NIGHT, col, ty, s.overrides) === '#');
  let s = initState(lvl); // toggle at the spawn, where both shifts are open
  const expect = [['P0'], ['P1'], ['P2'], ['P3']];
  assert.ok(standsAt(s, P.P0));
  for (let entry = 1; entry <= 3; entry++) {
    if (s.layer === NIGHT) s = step(lvl, s, { ...NO_INPUT, shiftPressed: true });
    s = step(lvl, s, { ...NO_INPUT, shiftPressed: true });
    assert.equal(s.nightEntries, entry);
    const where = Object.entries(P).filter(([, col]) => standsAt(s, col)).map(([k]) => k);
    assert.deepEqual(where, expect[entry], `after entry ${entry}`);
  }
});

test('Structural Integrity: reaching the crate on entry 3 misses the staircase', () => {
  const lvl = L.pillar;
  // waste one entry at the spawn (night, day), then play the solution: the crate jump's clock-in is entry 3
  const policy = (s, m, f) => (s.shifts < 2 ? { shift: f % 4 < 2 } : SOLUTIONS.pillar(s, m, f));
  const { state } = play(lvl, policy, 120 * 15);
  assert.equal(state.won, false);
  assert.ok(state.nightEntries >= 3);
});

test('Employee of the Month: the exit can\'t be entered at night while the portrait hangs', () => {
  const lvl = L.portrait;
  for (const jumpEvery of [0, 25, 50]) {
    let s = initState(lvl);
    s.layer = NIGHT; // the portrait still hangs in front of the doorway (no night entry yet)
    Object.assign(s.player, { x: 25 * TILE + 6, y: 14 * TILE - 26, vx: 0, vy: 0, grounded: true });
    for (let f = 0; f < 120 * 8 && !s.won; f++) {
      s = step(lvl, s, { ...NO_INPUT, right: true, jumpHeld: jumpEvery > 0 && f % jumpEvery < 16, jumpPressed: jumpEvery > 0 && f % jumpEvery === 0 });
    }
    assert.equal(s.won, false, `got in at night (jumpEvery=${jumpEvery})`);
  }
});

test('Employee of the Month: without the entry-2 step the ledge is out of reach', () => {
  const lvl = L.portrait;
  for (const entries of [1, 3]) {
    let s = initState(lvl);
    for (let k = 0; k < 2 * entries - 1; k++) s = step(lvl, s, { ...NO_INPUT, shiftPressed: true }); // toggle at the spawn
    assert.deepEqual([s.layer, s.nightEntries], [NIGHT, entries]);
    for (const jumpEvery of [20, 40]) {
      let t = structuredClone(s);
      for (let f = 0; f < 120 * 10 && !t.won; f++) t = step(lvl, t, { ...NO_INPUT, right: true, jumpHeld: f % jumpEvery < 18, jumpPressed: f % jumpEvery === 0 });
      assert.equal(t.won, false, `won on entry ${entries} (jumpEvery=${jumpEvery})`);
      assert.ok(t.player.y > 9 * TILE, `on the ledge on entry ${entries}`);
    }
  }
});

// ---------- Night Audit: one test per lesson it examines ----------
const auditAt = (x, layer, extra = {}) => {
  const s = initState(L.audit);
  s.layer = layer;
  Object.assign(s.player, { x: x * TILE, y: 14 * TILE - 26, vx: 0, vy: 0, grounded: true });
  return Object.assign(s, extra);
};
const run = (lvl, s, input, frames) => {
  const events = [];
  for (let f = 0; f < frames && s.deaths === 0 && !s.won; f++) { s = step(lvl, s, input(s, f)); events.push(...s.events); }
  return { s, events };
};

test('Night Audit: night through the wax slides into the hazard (letting go does not stop you)', () => {
  const lvl = L.audit;
  const { events } = run(lvl, initState(lvl), (s) => ({ ...NO_INPUT, right: tx(s) < 4.2, shiftPressed: s.shifts === 0 && tx(s) > 1.2 }), 120 * 6);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'hazard'), 'slid into the laser');
});

test('Night Audit: crossing a watched tunnel spooks', () => {
  const lvl = L.audit;
  // facing left: the left tunnel's lurker is working
  const sup = lvl.freaks.find((f) => f.kind === 'supervisor');
  let t = 0;
  while (supervisorFacing(sup, t) !== -1) t += 0.05;
  const { events } = run(lvl, auditAt(11.3, NIGHT, { freakClock: t + 0.05, nightEntries: 2 }), () => ({ ...NO_INPUT, right: true }), 120 * 3);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'spooked' && e.by === 'lurker'));
});

test('Night Audit: day past the day-walker spooks', () => {
  const lvl = L.audit;
  const { events } = run(lvl, auditAt(19.3, DAY), () => ({ ...NO_INPUT, right: true }), 120 * 3);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'spooked' && e.by === 'daywalker'));
});

test('Night Audit: night past the squatter spooks', () => {
  const lvl = L.audit;
  const sup = lvl.freaks.find((f) => f.kind === 'supervisor');
  let t = 0;
  while (supervisorFacing(sup, t) !== 1) t += 0.05; // facing right: the far squatter works too
  const { events } = run(lvl, auditAt(27.1, NIGHT, { freakClock: t + 0.05, nightEntries: 3 }), () => ({ ...NO_INPUT, right: true }), 120 * 2);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'spooked' && e.by === 'squatter'));
});

test('Night Audit: the last pit on the wrong night entry is a fall; on entry 3 the plank is there', () => {
  const lvl = L.audit;
  // the real route up to the stop before the pit (two entries so far), then straight on at night
  const route = (toggle) => (s, m, f) => {
    if (!toggle && tx(s) > 22.9) return { right: true };
    return SOLUTIONS.audit(s, m, f);
  };
  const short = play(lvl, route(false), 120 * 20);
  assert.ok(short.events.some((e) => e.type === 'death' && e.cause === 'fall'), 'no plank on entry 2: into the pit');
  const full = play(lvl, route(true), 120 * 20);
  assert.ok(full.events.some((e) => e.type === 'prank' && e.id === 'plank'));
  assert.equal(full.state.won, true);
  assert.equal(full.events.filter((e) => e.type === 'death').length, 0);
});

test('Lost & Found: spending every clock-in at the spawn does not win (the hazards and the lurker cannot be jumped)', () => {
  const lvl = L.doors;
  // all doors gone at night, then run right at night jumping the lasers and the lurker and climbing the pile
  for (const a of [5.8, 6.2, 6.6, 7.0]) {
    for (const b of [16.6, 17.2, 17.8, 18.4]) {
      const policy = (s) => {
        if (s.shifts < 5) return { shift: s.time % 0.05 < 0.025 };
        const x = tx(s);
        const p = s.player;
        const hop = (x > a && x < a + 0.5) || (x > b && x < b + 0.5) || (x > 24.8 && Math.abs(p.vx) < 1);
        return { right: true, jump: p.grounded ? hop : p.vy < 0 };
      };
      const { state, events } = play(lvl, policy, 120 * 15);
      const clean = state.won && !events.some((e) => e.type === 'death');
      assert.equal(clean, false, `won from the spawn jumping at x ${a} and ${b}`);
    }
  }
});

test('Structural Integrity: one clock-in too many is not a softlock: the pillar comes back around to P2', () => {
  const lvl = L.pillar;
  let s = initState(lvl);
  for (let k = 0; k < 9; k++) s = step(lvl, s, { ...NO_INPUT, shiftPressed: true }); // entries 1-5 at the spawn
  assert.deepEqual([s.layer, s.nightEntries], [NIGHT, 5]);
  assert.ok([10, 11, 12, 13].every((ty) => tileAt(lvl, NIGHT, 20, ty, s.overrides) === '#'), 'at P2 again on entry 5');
});

test('Employee of the Month: one clock-in too many is not a softlock: the portrait comes back around to the step', () => {
  const lvl = L.portrait;
  let s = initState(lvl);
  for (let k = 0; k < 9; k++) s = step(lvl, s, { ...NO_INPUT, shiftPressed: true }); // entries 1-5 at the spawn
  assert.deepEqual([s.layer, s.nightEntries], [NIGHT, 5]);
  assert.ok([16, 17, 18].every((tx) => tileAt(lvl, NIGHT, tx, 12, s.overrides) === '#'), 'by the ledge again on entry 5');
});

test('Falling Up: the first clock-in falls you up onto the ceiling (the floor is up there now)', () => {
  const lvl = L.fallup;
  let s = initState(lvl);
  s = step(lvl, s, { ...NO_INPUT, shiftPressed: true });
  for (let i = 0; i < 120 && !s.player.grounded; i++) s = step(lvl, s);
  assert.equal(s.layer, NIGHT);
  assert.ok(Math.abs(s.player.y - 4 * TILE) < 1, `hanging under the floor's copy, rows 0-3 (y ${s.player.y})`);
});

test('Falling Up: skipping the brake flip falls into the pit', () => {
  const lvl = L.fallup;
  // the solution up to the high ledge, then run off its end without the mid-fall clock-in
  const policy = (s, m, f) => (s.shifts >= 2 && s.layer === DAY && tx(s) > 16 ? { right: true } : SOLUTIONS.fallup(s, m, f));
  const { events } = play(lvl, policy, 120 * 15);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'fall'));
});

test('Ceiling Walker: walking on through the tunnel while the clipboard watches it spooks, and night alone never wins', () => {
  const lvl = L.ceiling;
  // the solution's first clock-in, then never out: the lurker's tunnel is one tile high and solid to the grid's
  // edge below, so jumps don't get over it; a rhythm that arrives while it slacks falls at the second pit instead
  for (const period of [0, 18, 24, 30, 36, 48, 60, 90]) {
    const jump = (s, f) => s.layer === NIGHT && period > 0 && f % period < period / 2;
    const policy = (s, m, f) => ({ right: true, shift: s.shifts === 0 && SOLUTIONS.ceiling(s, m, f).shift, jump: jump(s, f) });
    const { events, state: { won } } = play(lvl, policy, 120 * 8);
    assert.equal(events.filter((e) => e.type === 'shift').length, 1);
    const death = events.find((e) => e.type === 'death');
    assert.ok(!won, `jump period ${period}: won on one clock-in`);
    if (period === 0) assert.ok(death?.cause === 'spooked' && death.by === 'lurker', `died of ${death?.cause}`);
  }
});

test('Ceiling Walker: the wax before the tunnel keeps you sliding after you let go', () => {
  const lvl = L.ceiling;
  assert.equal(tileAt(lvl, NIGHT, 13, 11), '~');
  const policy = (s, m, f) => ({ right: tx(s) < 13.2, shift: s.shifts === 0 && SOLUTIONS.ceiling(s, m, f).shift });
  const { state } = play(lvl, policy, 120 * 3);
  assert.ok(tx(state) > 14 || state.deaths > 0, `stopped at ${tx(state).toFixed(2)}`);
});

test("Ceiling Walker: the plank isn't there on the wrong night entry", () => {
  const lvl = L.ceiling;
  // the solution as far as the lurker's far side, then one clock-in too many: in (entry 2: the plank goes over
  // the second pit), out, in (entry 3: back over the first one). The walkway's copy over pit B is open sky.
  const policy = (s, m, f) => {
    if (s.shifts < 2 || tx(s) < 19.1) return SOLUTIONS.ceiling(s, m, f);
    if (s.nightEntries < 3) return { shift: f % 2 === 0 };
    return { right: true };
  };
  const { events: all } = play(lvl, policy, 120 * 10);
  const events = all.slice(0, all.findIndex((e) => e.type === 'death') + 1); // up to the first death
  assert.deepEqual(events.filter((e) => e.type === 'prank').map((e) => e.id), ['plank1', 'plank2']);
  const death = events.at(-1);
  assert.ok(death && death.cause === 'fall' && death.layer === NIGHT, `died of ${death?.cause}`);
  assert.ok(death.x > 21 * TILE && death.x < 30 * TILE, `fell up through the second pit's copy (x ${death.x})`);
});

test('Head Over Heels: staying on day meets the day-walker', () => {
  const lvl = L.heels;
  // never clocking in: the bottom slot through the block is one tile high, so no rhythm of jumps gets past it
  for (const period of [0, 18, 30, 48, 90]) {
    const policy = (s, m, f) => ({ right: true, jump: period > 0 && f % period < period / 2 });
    const { events } = play(lvl, policy, 120 * 6);
    const death = events.find((e) => e.type === 'death');
    assert.ok(death && death.cause === 'spooked' && death.by === 'daywalker', `jump period ${period}: died of ${death?.cause}`);
  }
});

test('Head Over Heels: staying on night meets the lurker', () => {
  const lvl = L.heels;
  // the solution's first clock-in, then never out: the lurker further along the slot is awake all night
  for (const period of [0, 18, 30, 48, 90]) {
    const jump = (s, f) => s.layer === NIGHT && period > 0 && f % period < period / 2;
    const policy = (s, m, f) => ({ right: true, shift: s.shifts === 0 && SOLUTIONS.heels(s, m, f).shift, jump: jump(s, f) });
    const { events } = play(lvl, policy, 120 * 6);
    assert.equal(events.filter((e) => e.type === 'shift').length, 1);
    const death = events.find((e) => e.type === 'death');
    assert.ok(death && death.cause === 'spooked' && death.by === 'lurker', `jump period ${period}: died of ${death?.cause}`);
  }
});

test('Head Over Heels: the final plank needs the right night entry', () => {
  const lvl = L.heels;
  // the solution, except that it stays on night along the top under their plank over the pit (no clock-out and
  // in): it reaches the last gap with a clock-in to spare, so the clock-in there is entry 3, and the plank only
  // comes over on the 4th
  const policy = (s, m, f) => {
    const want = SOLUTIONS.heels(s, m, f);
    return m.top && tx(s) > 16.8 ? { ...want, shift: s.layer === DAY } : want;
  };
  const { events: all } = play(lvl, policy, 120 * 20);
  const events = all.slice(0, all.findIndex((e) => e.type === 'death') + 1); // up to the first death
  assert.equal(events.filter((e) => e.type === 'shift' && e.layer === NIGHT).length, 3);
  assert.deepEqual(events.filter((e) => e.type === 'prank').map((e) => e.id), []);
  const death = events.at(-1);
  assert.ok(death?.type === 'death' && death.cause === 'fall' && death.layer === NIGHT, `ended on ${death?.type} ${death?.cause}`);
  assert.ok(death.x < 10 * TILE, `fell up through the last gap (x ${death.x})`);
  // the solution gets there on the 4th clock-in, and the plank is over the gap
  const { events: won } = play(lvl, SOLUTIONS.heels, 120 * 20);
  assert.deepEqual(won.filter((e) => e.type === 'prank').map((e) => e.id), ['plank1']);
});

// The finale (rev 2): one lesson test per room.
test('Clock Out: room 1, crossing while the clipboard watches this room meets the peeker', () => {
  const policy = (s, m, f) => {
    const out = SOLUTIONS.clockout(s, m, f);
    return s.shifts === 1 ? { right: true } : out; // no waiting
  };
  const { events } = play(L.clockout, policy, 120 * 3);
  assert.ok(events.some((e) => e.type === 'death' && e.by === 'peeker'));
});

test('Clock Out: one of every freak, and the supervisor perched out of the corridor', () => {
  const kinds = new Set(L.clockout.freaks.map((f) => f.kind));
  assert.deepEqual([...kinds].sort(), ['daywalker', 'lurker', 'peeker', 'squatter', 'supervisor']);
  assert.equal(L.clockout.freaks.find((f) => f.kind === 'supervisor').ty, 4);
});

test('Clock Out: room 1, staying on night after the gap stops at the locked gate', () => {
  let maxX = 0;
  const policy = (s, m, f) => { // as the solution, past the peeker, then never out
    maxX = Math.max(maxX, s.player.x);
    const out = SOLUTIONS.clockout(s, m, f);
    return s.shifts === 1 ? { right: out.right } : out;
  };
  const { state } = play(L.clockout, policy, 120 * 6);
  assert.equal(state.won, false);
  assert.equal(state.deaths, 0);
  assert.equal(state.layer, NIGHT);
  assert.ok(maxX < 11 * TILE, `got to x ${maxX}`);
});

test('Clock Out: room 2, the door goes on the second clock-in, but the far wall still needs a clock-out', () => {
  let maxX = 0;
  const policy = (s, m, f) => { maxX = Math.max(maxX, s.player.x); return s.shifts >= 3 ? { right: true } : SOLUTIONS.clockout(s, m, f); };
  const { state, events } = play(L.clockout, policy, 120 * 8);
  assert.ok(events.some((e) => e.type === 'prank' && e.id === 'door'));
  assert.equal(state.won, false);
  assert.ok(maxX < 21 * TILE, `got to x ${maxX}`);
});

test('Clock Out: room 3, crossing the wax while the clipboard watches the far tunnel spooks', () => {
  const policy = (s, m, f) => {
    if (s.shifts < 5) return SOLUTIONS.clockout(s, m, f);
    const sup = freakBoxes(L.clockout, s).find((b) => b.kind === 'supervisor');
    if (sup.facing === 1 && sup.turnIn > 1) m.go = true;
    return { right: !!m.go };
  };
  const { events } = play(L.clockout, policy, 120 * 12);
  const death = events.find((e) => e.type === 'death');
  assert.ok(death && death.cause === 'spooked' && death.by === 'lurker', `died of ${death?.cause}`);
  assert.ok(death.x > 22 * TILE, `in room 3 (x ${death.x})`);
});

test('Clock Out: room 4, the third clock-in took the step: up the shaft never reaches the time clock', () => {
  // the solution across the wax (entry 3), then straight on up the shaft without clocking out and in again: no
  // ceiling over the shaft, and the time clock walled up, so you fly out the top or end up stuck under the wall
  const lvl = L.clockout;
  const policy = (s, m, f) => (s.shifts >= 5 && m.go ? { right: true } : SOLUTIONS.clockout(s, m, f));
  const { state, events } = play(lvl, policy, 120 * 14);
  assert.ok(events.some((e) => e.type === 'prank' && e.id === 'stepGone'));
  assert.equal(state.won, false);
  assert.ok(!events.some((e) => e.type === 'shift' && e.layer === DAY && events.indexOf(e) > events.findIndex((x) => x.id === 'stepGone')));
  // and with the 4th clock-in (the solution), the step is back and the time clock open
  const won = play(lvl, SOLUTIONS.clockout, 120 * 20);
  assert.equal(won.state.won, true);
  assert.deepEqual(won.events.filter((e) => e.type === 'prank').map((e) => e.id), ['door', 'stepGone', 'stepBack']);
});

test('Falling Up: no brake from the floor (a clock-in at the foot of the wall never gets under it)', () => {
  // the shortcut the full audit's random search found: jump along the floor, clock in falling at the wall's
  // foot, pass under it on the night side, rise into the pit and clock out going up: an arc onto the far floor
  const lvl = L.fallup;
  for (const a of [15.3, 15.4, 15.5]) for (const b of [21.25, 21.75, 22.5]) {
    const policy = (s) => {
      const x = tx(s);
      const jump = s.player.grounded ? [2.4, 10.1].some((j) => x > j && x < j + 0.4) : gravitySign(lvl, s.layer) * s.player.vy < 0;
      return { right: true, jump, shift: [a, b].some((w) => x > w && x < w + 0.35) };
    };
    const { state } = play(lvl, policy, 120 * 8);
    assert.ok(!(state.won && state.shifts < lvl.par), `won with ${state.shifts} clock-ins (shift windows ${a}, ${b})`);
  }
});

test('Clock Out: every prank is telegraphed, the step coming back included', () => {
  for (const pr of L.clockout.pranks) assert.ok(pr.tell, `${pr.id} has no tell`);
});

test('Clock Out: the stolen door leaves its empty frame', () => {
  const lvl = L.clockout;
  assert.deepEqual(skinPlan(lvl, NIGHT, {}), [{ draw: 'door', tx: 16, ty: 14, h: 2, hang: true }]);
  const { state } = play(lvl, (s, m, f) => (s.shifts >= 3 ? {} : SOLUTIONS.clockout(s, m, f)), 120 * 4); // to the 2nd clock-in
  assert.equal(state.nightEntries, 2);
  assert.deepEqual(skinPlan(lvl, NIGHT, state.overrides), [{ draw: 'emptyFrame', tx: 16, ty: 14, h: 2, hang: true }]);
});

// A relocated object goes round its places forever: however many clock-ins, its useful place comes back.
const toggleTo = (lvl, entries) => {
  let s = initState(lvl);
  for (let k = 0; k < 2 * entries - 1; k++) s = step(lvl, s, { ...NO_INPUT, shiftPressed: true }); // in place at the spawn
  assert.deepEqual([s.layer, s.nightEntries], [NIGHT, entries]);
  return s;
};
const solidAt = (lvl, s, cells) => cells.every(([tx, ty]) => tileAt(lvl, NIGHT, tx, ty, s.overrides) === '#');

test('relocations never run out: P2, the step, the planks all come round again by entry 40-41', () => {
  assert.ok(solidAt(L.pillar, toggleTo(L.pillar, 41), [[20, 10], [20, 11], [20, 12], [20, 13]]), 'pillar at P2 on entry 41');
  assert.ok(solidAt(L.portrait, toggleTo(L.portrait, 41), [[16, 12], [17, 12], [18, 12]]), 'portrait by the ledge on entry 41');
  assert.ok(solidAt(L.ceiling, toggleTo(L.ceiling, 40), [[22, 11], [29, 11]]), 'plank over pit B on entry 40');
  assert.ok(solidAt(L.heels, toggleTo(L.heels, 40), [[2, 3], [9, 3]]), 'plank over the last gap on entry 40');
});

test('memos: the solution passes close enough to read every memo, in its shift', () => {
  for (const def of LEVELS) {
    const m = (def.props ?? []).find((p) => p.kind === 'memo');
    if (!m) continue;
    const shift = m.layer === 'night' ? NIGHT : m.layer === 'day' ? DAY : null;
    let read = false;
    play(L[def.id], (s, mem, f) => {
      if (!read && (shift === null || s.layer === shift) && memoNear(s.player, m)) read = true;
      return SOLUTIONS[def.id](s, mem, f);
    });
    assert.ok(read, `${def.id}: the memo at ${m.tx},${m.ty} is never in reach`);
  }
});

// ---------- cohesion: what every level has to hold to ----------

test('every prank has a tell (LEVELS.md §3 rule 6)', () => {
  for (const def of LEVELS) {
    for (const pr of L[def.id].pranks) assert.ok(pr.tell, `${def.id}: prank ${pr.id}`);
  }
});

test('no prop hides inside a solid on a shift it shows on', () => {
  for (const def of LEVELS) {
    const lvl = L[def.id];
    for (const p of (def.props ?? []).filter((q) => q.kind !== 'nail')) { // a nail waits behind what hangs on it
      for (const layer of p.layer ? [p.layer === 'night' ? NIGHT : DAY] : [DAY, NIGHT]) {
        assert.notEqual(tileAt(lvl, layer, p.tx, p.ty, {}), '#', `${def.id}: ${p.kind} at ${p.tx},${p.ty} on layer ${layer}`);
      }
    }
  }
});

for (const def of LEVELS) {
  const memo = (def.props ?? []).find((p) => p.kind === 'memo');
  const open = (s) => (!memo.layer || (memo.layer === 'night') === (s.layer === NIGHT)) && memoNear(s.player, memo);

  test(`${def.name}: the memo stays open long enough to read and never hides the worker at a required press`, () => {
    const lvl = L[def.id];
    const panel = memoPanel(memo.text, memo.tx, memo.ty, { maxW: memo.w });
    const { inputs } = recordInputs(lvl, SOLUTIONS[def.id]);
    let s = initState(lvl);
    let openTicks = 0;
    for (const input of inputs) {
      if (open(s)) {
        openTicks++;
        const p = s.player;
        const covered = p.x < panel.x + panel.w && p.x + PARAMS.playerW > panel.x && p.y < panel.y + panel.h && p.y + PARAMS.playerH > panel.y;
        assert.ok(!(covered && (input.jumpPressed || input.shiftPressed)), `worker hidden at a press, tick ${Math.round(s.time * 120)}`);
      }
      s = step(lvl, s, input);
    }
    assert.ok(openTicks >= 36, `open ${(openTicks / 120).toFixed(2)} s on the par route`);
  });
}

for (const def of LEVELS) {
  test(`${def.name}: a random search both ways finds no win below par`, () => {
    assert.ok(searchBelowPar(L[def.id], def.par, 120) >= def.par);
  });
}

test('Head Over Heels: the spawn is nowhere near the exit (hold left, clock in early)', () => {
  for (let jumpAt = 0; jumpAt < 60; jumpAt += 3) {
    const { state } = play(L.heels, (s, m, f) => ({ left: true, shift: f === 0, jump: f >= jumpAt && f < jumpAt + 40 }), 120 * 4);
    assert.equal(state.won, false, `won jumping at tick ${jumpAt}`);
  }
  const { state } = play(L.heels, (s, m, f) => ({ left: true, shift: s.player.vy > 0 && s.layer === DAY }), 120 * 4);
  assert.equal(state.won, false, 'won by clocking in on the way down');
});

// ---------- work orders: every level has one ----------

for (const { id } of LEVELS) {
  test(`${id}: the work order sits on the par route, on the two shifts`, () => {
    const { events, state } = play(L[id], SOLUTIONS[id], 120 * 30);
    assert.equal(state.won, true);
    assert.deepEqual(events.filter((e) => ['tool', 'repaired'].includes(e.type)).map((e) => e.type), ['tool', 'repaired']);
    assert.notEqual(L[id].repair.tool.layer, L[id].repair.fix.layer);
    assert.equal(events.filter((e) => e.type === 'exitLocked').length, 0);
  });
}
