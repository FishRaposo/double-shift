// Every level is completable at par by a scripted run, and no level can be won with zero shifts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { parseLevel, DAY, NIGHT } from '../src/rules.js';
import { play, tx } from './helpers.mjs';

const L = Object.fromEntries(LEVELS.map((l) => [l.id, parseLevel(l)]));
const want = (s, layer) => s.layer !== layer;

// Scripted solutions: policies reading the state, like a player would.
const SOLUTIONS = {
  clock: (s) => ({ right: true, shift: (tx(s) > 4 && tx(s) < 20 && want(s, NIGHT)) || (tx(s) > 20.5 && want(s, DAY)) }),
  scaff: (s) => ({
    right: true,
    jump: s.player.grounded ? [5.3, 9.6, 13.6].some((a) => tx(s) > a && tx(s) < a + 0.6) : s.player.vy < 0,
    shift: tx(s) > 19 && want(s, NIGHT),
  }),
  closing: (s) => ({ right: true, shift: (tx(s) > 10.05 && tx(s) < 18 && want(s, NIGHT)) || (tx(s) > 19.05 && want(s, DAY)) }),
  midair: (s) => {
    const x = tx(s);
    const jump = s.player.grounded ? [5.0, 10.4, 16.4, 22.4].some((a) => x > a && x < a + 0.5) : s.player.vy < 0;
    let target = DAY;
    if (x > 6 && x < 13) target = NIGHT;
    else if (x >= 13 && x < 19) target = DAY;
    else if (x >= 19 && x < 25) target = NIGHT;
    else if (x >= 25) target = s.layer;
    return { right: true, jump, shift: want(s, target) };
  },
  inventory: (s) => {
    const x = tx(s);
    let target = s.layer;
    if (s.nightEntries === 0 && x > 4) target = NIGHT;
    else if (s.nightEntries === 1 && x > 16.5 && x < 17.5) target = DAY; // step out between the pits...
    else if (s.nightEntries === 1 && x >= 17.5) target = NIGHT; // ...and back in: the plank has moved
    return { right: true, shift: want(s, target) };
  },
  watch: (s) => {
    const x = tx(s);
    let target = s.layer;
    if (x > 3 && x < 8.6) target = NIGHT; // through the day crates
    else if (x >= 8.6 && x < 15.3) target = DAY; // freeze the lurker, walk past it
    else if (x >= 15.3 && x < 26.3) target = NIGHT; // out of the tunnel, past the day rebar
    else if (x >= 26.3) target = DAY; // around the squatter
    let right = true;
    if (s.layer === NIGHT && x > 20.5 && x < 22.3) {
      const t = s.freakClock % 1.6; // peeker is out for the first 0.8 s of each 1.6 s cycle
      right = t > 0.8 && t < 1.0;
    }
    return { right, shift: want(s, target) };
  },
  wet: (s) => {
    const x = tx(s);
    let target = s.layer;
    if (x < 8.5) target = NIGHT; // onto the wax: slide toward the tunnel
    else if (x < 12.05) target = DAY; // dry stop before the lasers, walk past them
    else if (x < 25) target = NIGHT; // back into the tunnel, slide to the lurker
    else target = DAY; // grip and freeze it, then walk to the exit
    return { right: true, shift: want(s, target) };
  },
};

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
