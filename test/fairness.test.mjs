// Fairness: every input a level requires has real timing slack, and no respawn point sits in a patrol.
// Floors (Fish, 2026-11-02): ≥ 200 ms in acts 1–2, ≥ 100 ms in acts 3–6, the finale included (docs/LEVELS.md §1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { freakBoxes, initState, standableSpot, TILE, PARAMS, DAY, NIGHT } from '../src/rules.js';
import { inputWindows } from './helpers.mjs';
import { SOLUTIONS, L } from './solutions.mjs';

export const WINDOW_FLOOR = (act) => (act <= 2 ? 200 : 100);

for (const def of LEVELS) {
  test(`${def.name}: every required shift and jump has ≥ ${WINDOW_FLOOR(def.act)} ms of slack`, () => {
    const tight = inputWindows(L[def.id], SOLUTIONS[def.id]).filter((w) => w.ms < WINDOW_FLOOR(def.act));
    assert.deepEqual(tight.map((w) => `${w.kind} at ${w.at.toFixed(2)} s: ${w.ms} ms`), []);
  });
}

// Every place a freak's active box can be over its whole cycle, sampled on both clocks.
function patrolBoxes(lvl) {
  const s = initState(lvl);
  const out = [];
  for (let t = 0; t <= 20; t += 1 / 30) {
    s.freakClock = t;
    s.dayClock = t;
    for (const b of freakBoxes(lvl, s)) if (b.active && b.kind !== 'supervisor') out.push(b);
  }
  return out;
}

for (const def of LEVELS) {
  test(`${def.name}: no spawn or checkpoint lies inside a freak's patrol`, () => {
    const lvl = L[def.id];
    // every place you can respawn: the spawn, exactly where initState puts you, and each checkpoint standing
    // (or hanging) wherever that shift's gravity gives it ground, the same standableSpot the rules save with
    const start = initState(lvl).checkpoint;
    const spots = [{ x: start.x, y: start.y, at: 'spawn' }, ...lvl.checkpoints.flatMap(({ tx, ty }) => [DAY, NIGHT]
      .map((layer) => standableSpot(lvl, layer, tx, ty))
      .filter(Boolean)
      .map((pos) => ({ ...pos, at: `${tx},${ty}` })))];
    const boxes = patrolBoxes(lvl);
    for (const p of spots) {
      const hit = boxes.find((b) => p.x < b.x + b.w && p.x + PARAMS.playerW > b.x && p.y < b.y + b.h && p.y + PARAMS.playerH > b.y);
      assert.equal(hit, undefined, `respawn ${p.at} overlaps a ${hit?.kind} patrol`);
    }
  });
}

// A freak patrolling over the exit lets you dash in past it at the right moment (a Wet Floor skip).
for (const def of LEVELS) {
  test(`${def.name}: no freak patrols over the exit`, () => {
    const lvl = L[def.id];
    const ex = { x: lvl.exit.tx * TILE, y: lvl.exit.ty * TILE, w: TILE, h: TILE };
    const hit = patrolBoxes(lvl).find((b) => ex.x < b.x + b.w && ex.x + ex.w > b.x && ex.y < b.y + b.h && ex.y + ex.h > b.y);
    assert.equal(hit, undefined, `a ${hit?.kind} patrol covers the exit`);
  });
}

// The spawn is the first respawn point: it must stand (or hang) on ground in its own shift, or every death
// would drop you from it.
for (const def of LEVELS) {
  test(`${def.name}: the spawn has ground under it in its shift`, () => {
    const lvl = L[def.id];
    const s = initState(lvl);
    assert.deepEqual(standableSpot(lvl, s.layer, lvl.spawn.tx, lvl.spawn.ty), { x: s.player.x, y: s.player.y });
  });
}
