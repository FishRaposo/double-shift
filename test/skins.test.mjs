// Skins: doors, pillars, portraits and the door pile are ordinary solid tiles in the rules (pranks move them by
// overriding tiles); skinPlan decides which object art covers them, so the screen follows the rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, NIGHT, SKIN_KINDS } from '../src/rules.js';
import { skinPlan } from '../src/skins.js';
import { LEVELS } from '../src/levels.js';
import { SOUNDS } from '../src/audio.js';
import { level } from './helpers.mjs';
import { initState, step, NO_INPUT } from '../src/rules.js';

test('parseLevel: unknown skin kind throws; defaults; prank sound kept', () => {
  assert.throws(() => level(['S....E'], ['......'], { skins: [{ kind: 'statue', tx: 1, ty: 0 }] }), /unknown skin kind "statue"/);
  const lvl = level(['S....E'], ['......'], {
    skins: [
      { kind: 'door', tx: 1, ty: 0 },
      { kind: 'pillar', tx: 2, ty: 0, layer: 'night' },
      { kind: 'portrait', tx: 3, ty: 0, layer: 'day' },
      { kind: 'doorPile', tx: 4, ty: 0 },
    ],
    pranks: [{ id: 'a', onNight: 1, set: [] }, { id: 'b', onNight: 2, set: [], sound: 'doorThunk' }],
  });
  assert.deepEqual(lvl.skins, [
    { kind: 'door', tx: 1, ty: 0, w: 1, h: 2, layer: null },
    { kind: 'pillar', tx: 2, ty: 0, w: 1, h: 4, layer: NIGHT },
    { kind: 'portrait', tx: 3, ty: 0, w: 3, h: 2, layer: DAY },
    { kind: 'doorPile', tx: 4, ty: 0, w: 2, h: 1, layer: null },
  ]);
  assert.equal(lvl.pranks[0].sound, null);
  assert.equal(lvl.pranks[1].sound, 'doorThunk');
  assert.deepEqual(level(['S....E'], ['......']).skins, [], 'no skins by default');
});

test('parseLevel: a door pile is always 2 tiles wide (its art is two doors lying flat)', () => {
  assert.throws(() => level(['S....E'], ['......'], { skins: [{ kind: 'doorPile', tx: 1, ty: 0, w: 3 }] }), /door pile is 2 tiles wide/);
  assert.equal(level(['S....E'], ['......'], { skins: [{ kind: 'doorPile', tx: 1, ty: 0, w: 2 }] }).skins[0].w, 2);
});

test('every prank sound names a SOUNDS entry (a typo would play nothing, silently)', () => {
  const unknown = (defs) => defs.flatMap((d) => (d.pranks ?? []).map((p) => p.sound).filter((s) => s && !(s in SOUNDS)));
  assert.deepEqual(unknown([{ pranks: [{ sound: 'doorThud' }, { sound: 'doorThunk' }, {}] }]), ['doorThud'], 'the check catches a typo');
  assert.deepEqual(unknown(LEVELS), []);
});

test('skinPlan: a door removed by a prank override becomes an empty frame', () => {
  // a 2-tall door at col 2 in both shifts; the first night entry steals it from the night
  const day = ['......', '..#...', 'S.#..E', '######'];
  const lvl = level(day, day.map((r) => r.replace('S', '.').replace('E', '.')), {
    skins: [{ kind: 'door', tx: 2, ty: 2 }],
    pranks: [{ id: 'steal', onNight: 1, set: [{ layer: 'night', x0: 2, x1: 2, y0: 1, y1: 2, ch: '.' }] }],
  });
  assert.deepEqual(skinPlan(lvl, NIGHT, {}), [{ draw: 'door', tx: 2, ty: 2, h: 2 }], 'before the prank: a door');
  let s = initState(lvl);
  s = step(lvl, s, { ...NO_INPUT, shiftPressed: true }); // night entry 1: the prank fires
  assert.equal(s.nightEntries, 1);
  assert.deepEqual(skinPlan(lvl, NIGHT, s.overrides), [{ draw: 'emptyFrame', tx: 2, ty: 2, h: 2 }], 'stolen: the empty frame');
  assert.deepEqual(skinPlan(lvl, DAY, s.overrides), [{ draw: 'door', tx: 2, ty: 2, h: 2 }], 'still there by day');
});

test('skinPlan: a half-covered door draws nothing (the art would lie about the tiles)', () => {
  const day = ['......', '......', 'S.#..E', '######'];
  const lvl = level(day, day, { skins: [{ kind: 'door', tx: 2, ty: 2 }] });
  assert.deepEqual(skinPlan(lvl, DAY, {}), []);
});

test('skinPlan: doorPile counts solid rows', () => {
  const day = ['......', '......', '...##.', 'S..##E', '######'];
  const lvl = level(day, day, { skins: [{ kind: 'doorPile', tx: 3, ty: 3 }] });
  assert.deepEqual(skinPlan(lvl, DAY, {}), [{ draw: 'doorPile', tx: 3, ty: 3, count: 2 }]);
  const flat = level(['......', 'S....E', '######'], ['......', '......', '######'], { skins: [{ kind: 'doorPile', tx: 3, ty: 1 }] });
  assert.deepEqual(skinPlan(flat, DAY, {}), [], 'an empty pile draws nothing');
});

test('skinPlan: a moved pillar leaves a crack', () => {
  const night = ['..#...', '..#...', '..#...', '..#...', '######'];
  const lvl = level(['......', '......', '......', 'S....E', '######'], night, {
    skins: [{ kind: 'pillar', tx: 2, ty: 3, layer: 'night' }],
    pranks: [{ id: 'move', onNight: 1, set: [{ layer: 'night', x0: 2, x1: 2, y0: 0, y1: 3, ch: '.' }] }],
  });
  assert.deepEqual(skinPlan(lvl, NIGHT, {}), [{ draw: 'pillar', tx: 2, ty: 3, h: 4 }]);
  const ov = { '1,2,0': '.', '1,2,1': '.', '1,2,2': '.', '1,2,3': '.' };
  assert.deepEqual(skinPlan(lvl, NIGHT, ov), [{ draw: 'crack', tx: 2, ty: 0 }]);
  assert.deepEqual(skinPlan(lvl, DAY, {}), [], 'a night skin draws nothing by day');
});

test('skinPlan: a portrait covers a w×h rect from its top-left cell', () => {
  const day = ['......', '.###..', '.###..', 'S....E', '######'];
  const lvl = level(day, day, { skins: [{ kind: 'portrait', tx: 1, ty: 1 }] });
  assert.deepEqual(skinPlan(lvl, DAY, {}), [{ draw: 'portrait', tx: 1, ty: 1, w: 3, h: 2 }]);
});

test('art: every skin kind used in LEVELS is known', () => {
  for (const def of LEVELS) for (const sk of def.skins ?? []) assert.ok(SKIN_KINDS.includes(sk.kind), `${def.id}: ${sk.kind}`);
  assert.deepEqual([...SKIN_KINDS].sort(), ['door', 'doorPile', 'pillar', 'portrait']);
});
