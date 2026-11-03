// Every level is completable at par by a scripted run, and no level can be won with zero shifts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { DAY, NIGHT, TILE, NO_INPUT, initState, step, tileAt, supervisorFacing } from '../src/rules.js';
import { play, tx } from './helpers.mjs';
import { SOLUTIONS, L } from './solutions.mjs';

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

test('Clock Out: without the fourth clock-in the step stays gone and the time clock is out of reach', () => {
  const { state } = play(L.clockout, (s, m, f) => {
    const want = SOLUTIONS.clockout(s, m, f);
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

test('Night Audit: night past the lurker spooks', () => {
  const lvl = L.audit;
  const sup = lvl.freaks.find((f) => f.kind === 'supervisor');
  let t = 0;
  while (supervisorFacing(sup, t) !== 1) t += 0.05; // facing right: the far lurker works too
  const { events } = run(lvl, auditAt(27.1, NIGHT, { freakClock: t + 0.05, nightEntries: 3 }), () => ({ ...NO_INPUT, right: true }), 120 * 2);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'spooked' && e.by === 'lurker'));
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
