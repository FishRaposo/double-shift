// Fairness: every input a level requires has real timing slack, and no respawn point sits in a patrol.
// Floors (Fish, 2026-11-02): ≥ 200 ms in acts 1–2, ≥ 100 ms in acts 3–6, the finale included (docs/LEVELS.md §1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { initState, standableSpot, overlapsHazard, overridesAfter, TILE, PARAMS, DAY, NIGHT, freakBoxes } from '../src/rules.js';
import { inputWindows, level, patrolBoxes, respawnSpots, spotInPatrol, WINDOW_FLOOR } from './helpers.mjs';
import { SOLUTIONS, L } from './solutions.mjs';

for (const def of LEVELS) {
  test(`${def.name}: every required shift and jump has ≥ ${WINDOW_FLOOR(def.act)} ms of slack`, () => {
    const tight = inputWindows(L[def.id], SOLUTIONS[def.id]).filter((w) => w.ms < WINDOW_FLOOR(def.act));
    assert.deepEqual(tight.map((w) => `${w.kind} at ${w.at.toFixed(2)} s: ${w.ms} ms`), []);
  });
}

for (const def of LEVELS) {
  test(`${def.name}: no spawn or checkpoint lies inside a freak's patrol`, () => {
    const lvl = L[def.id];
    const boxes = patrolBoxes(lvl);
    for (const p of respawnSpots(lvl)) {
      const hit = spotInPatrol(p, boxes);
      assert.equal(hit, undefined, `respawn ${p.at} overlaps a ${hit?.kind} patrol`);
    }
  });
}

test('fairness: a checkpoint that only a prank makes standable is still checked against patrols', () => {
  const lvl = level(
    ['........', '........', '........', '........', '........', '...C....', 'S......E', '########'],
    ['........', '........', '........', '........', '........', '........', '........', '########'],
    {
      pranks: [{ id: 'floor', onNight: 1, set: [{ layer: 'day', x0: 3, y0: 6, ch: '#' }] }],
      freaks: [{ kind: 'lurker', tx: 3, ty: 5, range: 1, speed: 40 }],
    },
  );
  const boxes = patrolBoxes(lvl);
  const before = respawnSpots(lvl).filter((p) => p.at !== 'spawn');
  assert.ok(before.length === 1 && before[0].at.includes('after 1 night'), 'the spot exists only once the prank lays the floor');
  assert.ok(spotInPatrol(before[0], boxes), 'and it sits in the lurker\'s patrol, so the level check would fail');
});

// A respawn that is already inside a laser's band would kill you again on the next tick, forever.
for (const def of LEVELS) {
  test(`${def.name}: no spawn or checkpoint save stands in a hazard, in any prank state`, () => {
    const lvl = L[def.id];
    const start = initState(lvl).checkpoint;
    assert.equal(overlapsHazard(lvl, start.layer, start.x, start.y), false, 'the spawn is in a hazard');
    const last = Math.max(0, ...lvl.pranks.map((pr) => pr.onNight + 2 * (pr.every ?? 0)));
    for (let entries = 0; entries <= last; entries++) {
      const ov = overridesAfter(lvl, entries);
      for (const { tx, ty } of lvl.checkpoints) {
        for (const layer of [DAY, NIGHT]) {
          const p = standableSpot(lvl, layer, tx, ty, ov);
          assert.ok(!p || !overlapsHazard(lvl, layer, p.x, p.y, undefined, undefined, ov), `checkpoint ${tx},${ty} (layer ${layer}, ${entries} night entries) is in a hazard`);
        }
      }
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
