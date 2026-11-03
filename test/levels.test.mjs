// Every level is completable at par by a scripted run, and no level can be won with zero shifts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { DAY, NIGHT, TILE, NO_INPUT, initState, step } from '../src/rules.js';
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
