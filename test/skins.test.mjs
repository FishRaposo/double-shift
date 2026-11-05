// Skins: doors, pillars, portraits and the door pile are ordinary solid tiles in the rules (pranks move them by
// overriding tiles); skinPlan decides which object art covers them, so the screen follows the rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, NIGHT, SKIN_KINDS, parseLevel } from '../src/rules.js';
import { skinPlan, checkpointHangs, exitPose } from '../src/skins.js';
import { L } from './solutions.mjs';
import { LEVELS } from '../src/levels.js';
import { SOUNDS } from '../src/audio.js';
import { level } from './helpers.mjs';
import { initState, step, NO_INPUT } from '../src/rules.js';

test('parseLevel: unknown skin kind throws; defaults; prank sound kept', () => {
  const grid = ['......', '......', '......', 'S....E'];
  const dark = ['......', '......', '......', '......'];
  assert.throws(() => level(grid, dark, { skins: [{ kind: 'statue', tx: 1, ty: 3 }] }), /unknown skin kind "statue"/);
  const lvl = level(grid, dark, {
    skins: [
      { kind: 'door', tx: 1, ty: 3 },
      { kind: 'pillar', tx: 2, ty: 3, layer: 'night' },
      { kind: 'portrait', tx: 3, ty: 0, layer: 'day' },
      { kind: 'doorPile', tx: 4, ty: 3 },
    ],
    pranks: [{ id: 'a', onNight: 1, set: [] }, { id: 'b', onNight: 2, set: [], sound: 'doorThunk' }],
  });
  assert.deepEqual(lvl.skins, [
    { kind: 'door', tx: 1, ty: 3, w: 1, h: 2, layer: null, sag: false },
    { kind: 'pillar', tx: 2, ty: 3, w: 1, h: 4, layer: NIGHT, sag: false },
    { kind: 'portrait', tx: 3, ty: 0, w: 3, h: 2, layer: DAY, sag: false },
    { kind: 'doorPile', tx: 4, ty: 3, w: 2, h: 3, layer: null, sag: false },
  ]);
  assert.equal(lvl.pranks[0].sound, null);
  assert.equal(lvl.pranks[1].sound, 'doorThunk');
  assert.deepEqual(level(['S....E'], ['......']).skins, [], 'no skins by default');
});

test('parseLevel: a door pile is always 2 tiles wide (its art is two doors lying flat)', () => {
  const grid = ['......', '......', 'S....E'];
  const dark = ['......', '......', '......'];
  assert.throws(() => level(grid, dark, { skins: [{ kind: 'doorPile', tx: 1, ty: 2, w: 3 }] }), /door pile is 2 tiles wide/);
  assert.equal(level(grid, dark, { skins: [{ kind: 'doorPile', tx: 1, ty: 2, w: 2 }] }).skins[0].w, 2);
});

test('parseLevel: skins are validated like every other level field', () => {
  const at = (sk) => () => level(['S....E', '......'], ['......', '......'], { skins: [sk] });
  assert.throws(at({ kind: 'door', tx: 1, ty: 1, layer: 'Night' }), /skin layer must be 'day' or 'night'/);
  assert.throws(at({ kind: 'door', tx: 9, ty: 1 }), /skin door at 9,1 is outside the grid/);
  assert.throws(at({ kind: 'door', tx: 1, ty: 1, w: 2 }), /a door is 1 tile wide/);
  assert.throws(at({ kind: 'pillar', tx: 1, ty: 1, w: 2 }), /a pillar is 1 tile wide/);
  // a pile's h is a cap, not its size: one door lying on row 1 is a valid pile, its cap just runs off the top
  assert.equal(at({ kind: 'doorPile', tx: 1, ty: 1 })().skins[0].kind, 'doorPile');
  assert.throws(at({ kind: 'doorPile', tx: 5, ty: 1 }), /skin doorPile at 5,1 is outside the grid/, 'two wide from the last column');
});

test('skinPlan: a door pile counts at most its height (h, default 3), never the platform above it', () => {
  // a 2-wide platform sits right on top of a pile of two: the pile is 2 doors, not 5 rows of "doors"
  const day = ['......', '...##.', '...##.', '...##.', 'S..##E', '######'];
  const lvl = level(day, day, { skins: [{ kind: 'doorPile', tx: 3, ty: 4, h: 2 }] });
  assert.deepEqual(skinPlan(lvl, DAY, {}), [{ draw: 'doorPile', tx: 3, ty: 4, count: 2 }]);
  const tall = level(day, day, { skins: [{ kind: 'doorPile', tx: 3, ty: 4 }] });
  assert.deepEqual(skinPlan(tall, DAY, {}), [{ draw: 'doorPile', tx: 3, ty: 4, count: 3 }], 'default cap 3');
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
  const flat = level(['......', '......', '......', 'S....E', '######'], ['......', '......', '......', '......', '######'], { skins: [{ kind: 'doorPile', tx: 3, ty: 3 }] });
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

test('skinPlan: an empty slot the object never stood in draws nothing; one it left draws what it left', () => {
  // a pillar that moves from slot A (col 1) to slot B (col 4) and on: B is empty in the grid until a prank fills it
  const night = ['.#....', '.#....', '.#....', '.#....', '######'];
  const lvl = level(['......', '......', '......', 'S....E', '######'], night, {
    skins: [{ kind: 'pillar', tx: 1, ty: 3, layer: 'night' }, { kind: 'pillar', tx: 4, ty: 3, layer: 'night' }],
  });
  const cells = (tx, ch) => Object.fromEntries([0, 1, 2, 3].map((ty) => [`1,${tx},${ty}`, ch]));
  assert.deepEqual(skinPlan(lvl, NIGHT, {}), [{ draw: 'pillar', tx: 1, ty: 3, h: 4 }], 'slot B: no crack before the pillar ever stood there');
  assert.deepEqual(skinPlan(lvl, NIGHT, { ...cells(1, '.'), ...cells(4, '#') }), [{ draw: 'crack', tx: 1, ty: 0 }, { draw: 'pillar', tx: 4, ty: 3, h: 4 }]);
  assert.deepEqual(skinPlan(lvl, NIGHT, { ...cells(1, '.'), ...cells(4, '.') }), [{ draw: 'crack', tx: 1, ty: 0 }, { draw: 'crack', tx: 4, ty: 0 }], 'moved on from B: a crack there too');
});

test('skinPlan: a portrait covers a w×h rect from its top-left cell', () => {
  const day = ['......', '.###..', '.###..', 'S....E', '######'];
  const lvl = level(day, day, { skins: [{ kind: 'portrait', tx: 1, ty: 1 }] });
  assert.deepEqual(skinPlan(lvl, DAY, {}), [{ draw: 'portrait', tx: 1, ty: 1, w: 3, h: 2 }]);
});

test('art: every skin kind used in LEVELS is known', () => {
  for (const def of LEVELS) for (const sk of def.skins ?? []) assert.ok(SKIN_KINDS.includes(sk.kind), `${def.id}: ${sk.kind}`);
  assert.deepEqual([...SKIN_KINDS].sort(), ['deck', 'door', 'doorPile', 'pillar', 'portrait', 'shutter']);
});

test('checkpoint art: drawn the way the shift it saves in holds it (no hanging from nothing)', () => {
  // Ceiling Walker's checkpoint only stands on the day floor: on the flipped night it stays upright on that
  // floor's echo instead of hanging under an empty cell
  const c = L.ceiling.checkpoints[0];
  assert.equal(checkpointHangs(L.ceiling, DAY, c), false);
  assert.equal(checkpointHangs(L.ceiling, NIGHT, c), false);
  // Mind Your Head's has ground in both shifts: it hangs at night
  const u = L.upside.checkpoints[0];
  assert.equal(checkpointHangs(L.upside, DAY, u), false);
  assert.equal(checkpointHangs(L.upside, NIGHT, u), true);
  // and one only the flipped night holds hangs by day too
  const tiny = parseLevel({ name: 'tiny', par: 0, upsideDown: true, day: ['....', '..C.', 'S..E', '####'] });
  assert.equal(checkpointHangs(tiny, DAY, tiny.checkpoints[0]), true);
  assert.equal(checkpointHangs(tiny, NIGHT, tiny.checkpoints[0]), true);
});

test('exit art: not drawn where its cell is walled up; on a flipped night it hangs only from a ceiling', () => {
  assert.equal(exitPose(L.fallup, NIGHT), null, 'Falling Up shuts its exit at night');
  assert.deepEqual(exitPose(L.fallup, DAY), { hang: false });
  assert.deepEqual(exitPose(L.upside, NIGHT), { hang: true }, "Mind Your Head's hangs from the beam's copy");
  // Clock Out's is walled up while the step is gone (entry 3), and hangs again once it's back (entry 4)
  const cells = (id) => Object.fromEntries(L.clockout.pranks.find((p) => p.id === id).cells.map(([l, x, y, c]) => [`${l},${x},${y}`, c]));
  assert.equal(exitPose(L.clockout, NIGHT, cells('stepGone')), null);
  assert.deepEqual(exitPose(L.clockout, NIGHT, { ...cells('stepGone'), ...cells('stepBack') }), { hang: true });
  // open, nothing above and a floor under it: it stands, rather than hanging from nothing
  const tiny = parseLevel({ name: 't', par: 0, upsideDown: true, day: ['....', '....', 'S..E', '####'], nightPatch: [{ x0: 3, y0: 3, ch: '#' }] });
  assert.deepEqual(exitPose(tiny, NIGHT), { hang: false });
});
