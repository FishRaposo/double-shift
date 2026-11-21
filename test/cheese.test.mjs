// Cheese: ways to beat a level that its author did not mean (docs/LEVELS.md §6). Three instruments on coarse grids
// (test/cheese.mjs; `npm run audit` runs the fine ones), each a test per level, plus three reproduced exploits as
// named regression tests. A level that fails says what won and from where, so the failure is a recipe.
//   1. below-par cheese: from states along the scripted run, hold a direction and hop with no further clock-in: no
//      win with fewer clock-ins than the level's fewest
//   2. job skip: with the work order out of reach (and up to one more clock-in), no win with at most the fewest
//   3. wasted night: one night entry wasted at the first safe spot must not make the level unwinnable
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { step, initState, TILE } from '../src/rules.js';
import { inputsFrom, play } from './helpers.mjs';
import { SOLUTIONS, L } from './solutions.mjs';
import { runMacro } from './cheese.mjs';
import { analyseAll, FIXED_SKIPS } from './cheese-run.mjs';

const res = await analyseAll('COARSE');

for (const def of LEVELS) {
  test(`${def.id}: no win below ${def.min} clock-ins by walking and hopping from the scripted run`, () => {
    const r = res.sweep[def.id];
    assert.ok(r.samples >= 5, 'the sampler found too few states');
    assert.deepEqual(r.hits.filter((h) => !h.verified), [], 'instrument: a finding does not replay from the start');
    if (r.hits.length) assert.fail(`${def.id} BELOW PAR (fewest ${def.min}): ${r.hits[0].text}`);
  });
}

for (const def of LEVELS) {
  test(`${def.id}: the work order can't be skipped: no win with at most ${def.min} clock-ins without it`, () => {
    const r = res.skip[def.id];
    assert.deepEqual(r.hits.filter((h) => !h.verified), [], 'instrument: a finding does not replay from the start');
    if (r.hits.length) assert.fail(`${def.id} JOB SKIPPED (fewest ${def.min}): ${r.hits[0].text}`);
  });
}

for (const def of LEVELS) {
  test(`${def.id}: one wasted night doesn't make the level unwinnable`, () => {
    const bad = res.waste[def.id].checks.filter((c) => c.verdict === 'softlock');
    if (bad.length) assert.fail(`${def.id} SOFTLOCK after a wasted night: ${bad[0].text}`);
  });
}

// ---------- reproduced exploits, as reviewers found them ----------

// Midair: after the valve is done, a jump right from the tower top lands on the day pillar at column 23 and wins
// with two clock-ins (the fewest is three). A family of jump timings, so a nudge to the pillar can't hide it.
test('midair: a jump right from the tower top after the valve, staying on day, does not win below the fewest', () => {
  const lvl = L.midair;
  const s = firstState(lvl, SOLUTIONS.midair, (st) => st.events.some((e) => e.type === 'repaired'));
  assert.ok(s, 'the scripted run no longer repairs the valve');
  const wins = [];
  for (let k = 0; k <= 60; k += 4) {
    for (const hold of [20, 28, 36, 50, 70]) {
      const r = runMacro(lvl, s, { dir: 'right', shifts: [], k, hold, second: null }, 600);
      if (r.s.won && r.s.deaths === 0 && r.s.shifts < lvl.min) wins.push(`jump at +${k} ticks held ${hold}: won with ${r.s.shifts} clock-ins`);
    }
  }
  if (wins.length) assert.fail(`midair BELOW PAR (fewest ${lvl.min}): from the valve, hold right and ${wins[0]}`);
});

// Stacked: from the plank's far end at night (second night entry, three clock-ins so far), two hops over the night
// roof block at columns 27-28 reach the column-31 ledge and win with three clock-ins (the fewest is five).
test('stacked: two hops from the plank end over the night roof block do not win below the fewest', () => {
  const lvl = L.stacked;
  const wins = [];
  const base = firstState(lvl, SOLUTIONS.stacked, (s) => s.nightEntries === 2 && s.layer === 1 && s.player.x / TILE > 24.9 && s.player.grounded);
  assert.ok(base, 'the scripted run no longer stands on the plank end at night');
  for (const j1 of [765, 780]) for (const h1 of [20, 40, 70]) for (const j2 of [810, 830]) for (const h2 of [20, 40, 70]) {
    let s = base;
    let jumped1 = false;
    let jumped2 = false;
    let t1 = 0;
    let t2 = 0;
    let prev = false;
    for (let i = 0; i < 500; i++) {
      const p = s.player;
      let jump = false;
      if (!jumped1 && p.x >= j1) { jumped1 = true; t1 = i; }
      if (jumped1 && i - t1 < h1) jump = true;
      if (jumped1 && !jumped2 && p.grounded && p.y < 400 && p.x >= j2) { jumped2 = true; t2 = i; }
      if (jumped2 && i - t2 < h2) jump = true;
      s = step(lvl, s, { left: false, right: true, jumpHeld: jump, jumpPressed: jump && !prev, shiftPressed: false });
      prev = jump;
      if (s.deaths || s.won) break;
    }
    if (s.won && s.deaths === 0 && s.shifts <= lvl.min) wins.push(`hop at x ${j1} px held ${h1}, again at x ${j2} px held ${h2}: won with ${s.shifts} clock-ins`);
  }
  if (wins.length) assert.fail(`stacked BELOW PAR (fewest ${lvl.min}): from the plank end at night, hold right and ${wins[0]}`);
});

// Doors: a route that never touches the tool or the bolt wins in six clock-ins, which is the fewest: the repair is
// optional (the policy is in test/cheese-run.mjs, where the job-skip sweep also plays it).
test('doors: a route that never touches the tool does not win in the fewest clock-ins', () => {
  const lvl = L.doors;
  const { state } = play(lvl, FIXED_SKIPS.doors.policy, 120 * 45);
  assert.equal(state.repairs[0].tool, false, 'the route is not supposed to touch the tool');
  if (state.won && state.deaths === 0 && state.shifts <= lvl.min) assert.fail(`doors JOB SKIPPED (fewest ${lvl.min}): never touching the tool or the bolt, it won with ${state.shifts} clock-ins`);
});

// The first state of a scripted run where `when` holds (null if it never does).
function firstState(lvl, policy, when) {
  let s = initState(lvl);
  const next = inputsFrom(policy);
  for (let f = 0; f < 120 * 60 && !s.won; f++) {
    s = step(lvl, s, next(s));
    if (when(s)) return s;
  }
  return null;
}
