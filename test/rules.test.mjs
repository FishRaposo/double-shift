// GDD §13.7 collision/shift edge cases, plus S-rules. Each runs headless against src/rules.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { step, initState, NO_INPUT, DAY, NIGHT, TILE, PARAMS, isEmbedded, isSolidChar, overlapsSolid, freakBoxes, tileAt } from '../src/rules.js';
import { level, stepN, place, play } from './helpers.mjs';

const OPEN = [
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '.S......E.',
  '##########',
];
const SHIFT = { ...NO_INPUT, shiftPressed: true };
const RIGHT = { ...NO_INPUT, right: true };

// identical geometry in both shifts: shifting must change nothing but the layer
const twin = level(OPEN, OPEN.map((r) => r.replace(/[SE]/g, '.')));

function sameMotion(a, b) {
  for (const k of ['x', 'y', 'vx', 'vy', 'grounded']) assert.equal(a.player[k], b.player[k], k);
}

test('S-01/S-02 case 1: shift while grounded keeps position, velocity and grounding', () => {
  const s0 = initState(twin);
  s0.player.vx = 150;
  const a = step(twin, s0, SHIFT);
  const b = step(twin, s0, NO_INPUT);
  assert.equal(a.layer, NIGHT);
  assert.equal(a.shifts, 1);
  sameMotion(a, b);
  assert.equal(a.player.grounded, true);
});

test('case 2: shift while rising keeps upward velocity', () => {
  let s = step(twin, initState(twin), { ...NO_INPUT, jumpPressed: true, jumpHeld: true });
  s = stepN(twin, s, 5, { ...NO_INPUT, jumpHeld: true });
  assert.ok(s.player.vy < 0);
  const a = step(twin, s, { ...SHIFT, jumpHeld: true });
  const b = step(twin, s, { ...NO_INPUT, jumpHeld: true });
  assert.equal(a.layer, NIGHT);
  sameMotion(a, b);
  assert.ok(a.player.vy < 0);
});

test('case 3: shift while falling keeps velocity and lands on the destination platform', () => {
  const lvl = level(OPEN, [
    '..........',
    '..........',
    '..........',
    '..........',
    '.###......',
    '..........',
    '..........',
    '..........',
  ]);
  let s = place(initState(lvl), 2, 1);
  s = stepN(lvl, s, 10);
  const vyBefore = s.player.vy;
  assert.ok(vyBefore > 0);
  s = step(lvl, s, SHIFT);
  assert.equal(s.layer, NIGHT);
  assert.ok(s.player.vy > vyBefore, 'gravity keeps acting; velocity not reset');
  s = stepN(lvl, s, 60);
  assert.equal(s.player.grounded, true);
  assert.equal(s.player.y + PARAMS.playerH, 4 * TILE, 'standing on the night platform');
});

test('case 4: shift while pressed against a wall that only exists in the current shift', () => {
  const day = [
    '..........',
    '..........',
    '..........',
    '..........',
    '....#.....',
    '....#.....',
    '.S..#...E.',
    '##########',
  ];
  const lvl = level(day, OPEN.map((r) => r.replace(/[SE]/g, '.')));
  let s = stepN(lvl, initState(lvl), 60, RIGHT);
  const stuckX = s.player.x;
  assert.equal(stuckX + PARAMS.playerW, 4 * TILE, 'blocked by the day wall');
  s = step(lvl, s, { ...RIGHT, shiftPressed: true });
  assert.equal(s.layer, NIGHT);
  s = stepN(lvl, s, 20, RIGHT);
  assert.ok(s.player.x > stuckX + 20, 'walks through where the wall was');
});

test('S-5.5 case 5: shift at a platform edge with no support in the destination → falls', () => {
  const night = OPEN.map(() => '..........');
  const lvl = level(OPEN, night);
  let s = initState(lvl);
  s = step(lvl, s, SHIFT);
  assert.equal(s.layer, NIGHT);
  assert.equal(s.player.grounded, false, 'grounding recomputed on shift');
  const y0 = s.player.y;
  s = stepN(lvl, s, 20);
  assert.ok(s.player.y > y0 + 5);
  assert.equal(s.events.some((e) => e.type === 'jump'), false, 'shifting never creates a jump');
});

test('S-08 case 6: shift into solid is buffered, then rejected without touching player state', () => {
  const night = OPEN.map((r) => r.replace(/[SE]/g, '.'));
  night[6] = '.#........';
  const lvl = level(OPEN, night);
  const s0 = initState(lvl);
  let s = step(lvl, s0, SHIFT);
  assert.equal(s.layer, DAY);
  assert.ok(s.shiftPending > 0, 'request is buffered');
  const events = [];
  for (let i = 0; i < 20; i++) { s = step(lvl, s); events.push(...s.events); }
  assert.equal(s.layer, DAY);
  assert.equal(s.shifts, 0, 'rejected shifts do not count');
  assert.equal(events.filter((e) => e.type === 'shiftFail').length, 1);
  assert.equal(s.player.x, s0.player.x);
  assert.equal(s.player.y, s0.player.y);
  // no cooldown: an immediate retry is accepted as a new attempt
  s = step(lvl, s, SHIFT);
  assert.ok(s.shiftPending > 0);
});

test('S-08: corner nudge resolves a small overlap and shifts', () => {
  const night = OPEN.map((r) => r.replace(/[SE]/g, '.'));
  night[6] = '...#......';
  const lvl = level(OPEN, night);
  const s0 = initState(lvl);
  s0.player.x = 3 * TILE + 2 - PARAMS.playerW; // 2px into the night block
  const s = step(lvl, s0, SHIFT);
  assert.equal(s.layer, NIGHT);
  assert.equal(s.events.find((e) => e.type === 'shift').nudged, true);
  assert.equal(isEmbedded(lvl, s), false);
});

test('S-08: buffered shift fires once the destination clears inside the window', () => {
  const night = OPEN.map((r) => r.replace(/[SE]/g, '.'));
  night[6] = '...#......';
  const lvl = level(OPEN, night);
  const s0 = initState(lvl);
  s0.player.x = 3 * TILE + 18; // 12px overlap, moving right out of it
  s0.player.vx = PARAMS.maxSpeed;
  let s = step(lvl, s0, { ...RIGHT, shiftPressed: true });
  assert.equal(s.layer, DAY);
  const events = [];
  for (let i = 0; i < 9 && s.layer === DAY; i++) { s = step(lvl, s, RIGHT); events.push(...s.events); }
  assert.equal(s.layer, NIGHT);
  assert.equal(events.some((e) => e.type === 'shiftFail'), false);
  assert.equal(isEmbedded(lvl, s), false);
});

test('S-04/S-05 case 7: consecutive presses on consecutive ticks both register, no cooldown', () => {
  let s = step(twin, initState(twin), SHIFT);
  s = step(twin, s, SHIFT);
  assert.equal(s.layer, DAY);
  assert.equal(s.shifts, 2);
  s = stepN(twin, s, 10); // no new presses → no toggling
  assert.equal(s.shifts, 2);
});

test('case 8: shifting into a hazard is a death; respawn restores checkpoint position and shift', () => {
  const night = OPEN.map((r) => r.replace(/[SE]/g, '.'));
  night[6] = '.^........';
  const lvl = level(OPEN, night);
  const s0 = initState(lvl);
  const s = step(lvl, s0, SHIFT);
  assert.ok(s.events.some((e) => e.type === 'death'));
  assert.equal(s.layer, DAY);
  assert.equal(s.player.x, s0.player.x);
  assert.equal(s.player.vx, 0);
  assert.equal(s.deaths, 1);
  assert.equal(s.shifts, 1, 'the shift still counts on the timecard');
});

test('case 9: shift just before landing into a shift with no floor → keeps falling', () => {
  const lvl = level(OPEN, OPEN.map(() => '..........'));
  let s = place(initState(lvl), 2, 5, { dy: 0 });
  s.player.vy = 300;
  // one tick before the floor would catch the player
  s = step(lvl, s, SHIFT);
  s = stepN(lvl, s, 10);
  assert.equal(s.layer, NIGHT);
  assert.ok(s.player.y > 7 * TILE - PARAMS.playerH, 'fell past where the day floor is');
});

test('case 10: shift and jump on the same tick — shift resolves first, jump still fires', () => {
  const both = step(twin, initState(twin), { ...SHIFT, jumpPressed: true, jumpHeld: true });
  assert.equal(both.layer, NIGHT);
  assert.ok(both.events.some((e) => e.type === 'jump'));
  // destination has no floor: coyote time carries across the shift, so the jump is still honoured
  const lvl = level(OPEN, OPEN.map(() => '..........'));
  const s = step(lvl, initState(lvl), { ...SHIFT, jumpPressed: true, jumpHeld: true });
  assert.equal(s.layer, NIGHT);
  assert.ok(s.events.some((e) => e.type === 'jump'));
});

test('checkpoint respawn uses the shift the checkpoint was touched in', () => {
  const day = [
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '.S.C....E.',
    '###.######',
  ];
  const night = [
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '##########',
  ];
  const lvl = level(day, night);
  let s = step(lvl, initState(lvl), SHIFT); // to night, where the floor is complete
  s = stepN(lvl, s, 30, RIGHT);
  assert.ok(s.checkpoint.id, 'checkpoint taken');
  assert.equal(s.checkpoint.layer, NIGHT);
  // stand over the day-only gap and shift to day: fall out, die
  s = place(s, 3, 6, { player: { vx: 0, vy: 0 } });
  s = step(lvl, s, SHIFT);
  assert.equal(s.layer, DAY);
  for (let i = 0; i < 240 && s.deaths === 0; i++) s = step(lvl, s);
  assert.equal(s.deaths, 1);
  assert.equal(s.layer, NIGHT, 'respawned into the checkpoint shift');
  assert.equal(s.player.x, s.checkpoint.x);
});

test('determinism: identical inputs give identical states', () => {
  const policy = (s, m, f) => ({ right: true, jump: f % 50 < 20, shift: f % 37 === 0 });
  const a = play(twin, policy, 600).state;
  const b = play(twin, policy, 600).state;
  assert.deepEqual(a, b);
});

test('a valid shift never leaves the player inside solid geometry (fuzz)', () => {
  const day = [
    '..........',
    '...##.....',
    '.......#..',
    '..#.......',
    '.....##...',
    '.#.....#..',
    '.S..#...E.',
    '##########',
  ];
  const night = [
    '..........',
    '.....#....',
    '..##......',
    '......##..',
    '.#........',
    '...##.....',
    '......#...',
    '##########',
  ];
  const lvl = level(day, night);
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  let s = initState(lvl);
  for (let i = 0; i < 6000; i++) {
    const input = { left: rnd() < 0.3, right: rnd() < 0.5, jumpHeld: rnd() < 0.5, jumpPressed: rnd() < 0.05, shiftPressed: rnd() < 0.08 };
    s = step(lvl, s, input);
    if (s.won) s = initState(lvl);
    assert.equal(isEmbedded(lvl, s), false, `embedded at tick ${i}`);
  }
});

// ---------- freaks and pranks ----------

const BLANK = OPEN.map((r) => r.replace(/[SE]/g, '.'));

test('pranks fire on the Nth entry into night, and only then', () => {
  const lvl = level(OPEN, BLANK, {
    pranks: [{ id: 'p', onNight: 2, set: [{ layer: 'night', x0: 5, y0: 2, ch: '#' }] }],
  });
  let s = step(lvl, initState(lvl), SHIFT); // entry 1
  assert.equal(tileAt(lvl, NIGHT, 5, 2, s.overrides), '.');
  s = step(lvl, s, SHIFT); // back to day: not a night entry
  assert.equal(tileAt(lvl, NIGHT, 5, 2, s.overrides), '.');
  s = step(lvl, s, SHIFT); // entry 2
  assert.equal(s.nightEntries, 2);
  assert.equal(tileAt(lvl, NIGHT, 5, 2, s.overrides), '#');
  assert.ok(s.events.some((e) => e.type === 'prank' && e.id === 'p'));
});

test('a prank that would bury the player blocks the shift; the prank waits', () => {
  const lvl = level(OPEN, BLANK, {
    pranks: [{ id: 'p', onNight: 1, set: [{ layer: 'night', x0: 1, y0: 6, ch: '#' }] }],
  });
  let s = step(lvl, initState(lvl), SHIFT);
  for (let i = 0; i < 20; i++) s = step(lvl, s);
  assert.equal(s.layer, DAY);
  assert.equal(s.nightEntries, 0);
  assert.equal(tileAt(lvl, NIGHT, 1, 6, s.overrides), '.');
});

test('death restores prank state to the checkpoint (no prank softlocks)', () => {
  const lvl = level(OPEN, BLANK, {
    pranks: [{ id: 'p', onNight: 1, set: [{ layer: 'night', x0: 6, y0: 6, ch: '^' }] }],
  });
  let s = step(lvl, initState(lvl), SHIFT);
  assert.equal(tileAt(lvl, NIGHT, 6, 6, s.overrides), '^');
  for (let i = 0; i < 240 && s.deaths === 0; i++) s = step(lvl, s, RIGHT);
  assert.equal(s.deaths, 1);
  assert.equal(s.nightEntries, 0);
  assert.equal(tileAt(lvl, NIGHT, 6, 6, s.overrides), '.');
});

test('freaks freeze while you are on day shift', () => {
  const lvl = level(OPEN, BLANK, { freaks: [{ kind: 'lurker', tx: 5, ty: 6, range: 3, speed: 60 }] });
  let s = initState(lvl);
  const x0 = freakBoxes(lvl, s)[0].x;
  s = stepN(lvl, s, 60); // day: frozen
  assert.equal(s.freakClock, 0);
  assert.equal(freakBoxes(lvl, s)[0].x, x0);
  s = step(lvl, s, SHIFT);
  s = stepN(lvl, s, 60); // night: moving
  assert.ok(s.freakClock > 0.4);
  assert.notEqual(freakBoxes(lvl, s)[0].x, x0);
  const xFrozen = freakBoxes(lvl, s)[0].x;
  s = step(lvl, s, SHIFT);
  s = stepN(lvl, s, 60);
  assert.equal(freakBoxes(lvl, s)[0].x, xFrozen);
});

test('freaks only exist on the night shift: overlapping one by day is safe, shifting into it is a spook', () => {
  const lvl = level(OPEN, BLANK, { freaks: [{ kind: 'squatter', tx: 1, ty: 6 }] });
  let s = stepN(lvl, initState(lvl), 30); // standing inside the squatter's spot, by day
  assert.equal(s.deaths, 0);
  s = step(lvl, s, SHIFT);
  assert.equal(s.deaths, 1);
  assert.ok(s.events.some((e) => e.type === 'death' && e.cause === 'spooked'));
});

test('a peeker that is ducked in cannot spook you', () => {
  const lvl = level(OPEN, BLANK, { freaks: [{ kind: 'peeker', tx: 1, ty: 6, period: 1, duty: 0.5, phase: 0.6 }] });
  let s = initState(lvl);
  assert.equal(freakBoxes(lvl, s)[0].active, false);
  s = step(lvl, s, SHIFT);
  assert.equal(s.deaths, 0);
  s = stepN(lvl, s, 60); // the cycle comes round: out it pops
  assert.equal(s.deaths, 1);
});

// ---------- wet floor `~` (SYS-1) ----------
// Exit sits in the sky: these tests run right at floor level and must never win.
const WIDE = [
  'E...........',
  '............',
  '............',
  '............',
  '............',
  '............',
  '.S..........',
  '############',
];
const WIDE_WET = WIDE.map((r, i) => (i === 6 ? '............' : i === 7 ? '~~~~~~~~~~~~' : r.replace(/E/g, '.')));
const wet = level(WIDE, WIDE_WET);
// Same shape as OPEN but with the exit out of the way.
const OPEN_E_UP = OPEN.map((r, i) => (i === 0 ? '........E.' : r.replace(/[SE]/g, '.')));
OPEN_E_UP[6] = '.S........';

test('wet floor: isSolidChar treats ~ as solid, and only ~ is wet', () => {
  assert.equal(isSolidChar('#'), true);
  assert.equal(isSolidChar('~'), true);
  assert.equal(isSolidChar('^'), false);
  assert.equal(isSolidChar('.'), false);
  assert.equal(overlapsSolid(wet, NIGHT, TILE, 7 * TILE - 1), true, '~ floor holds the player');
});

test('wet floor: letting go slides much farther than on dry ground', () => {
  // the wet level's own day floor is dry: same run, two different stopping distances
  let d = stepN(wet, initState(wet), 90, RIGHT);
  d = stepN(wet, d, 20);
  assert.equal(d.player.vx, 0, 'dry floor stops you fast');
  let w = step(wet, initState(wet), SHIFT);
  w = stepN(wet, w, 90, RIGHT);
  w = stepN(wet, w, 20);
  assert.ok(w.player.vx > 100, `vx ${w.player.vx}: should still be sliding`);
});

test('wet floor: one dry tile under the feet gives grip', () => {
  const mixed = level(OPEN_E_UP, BLANK.map((r, i) => (i === 7 ? '~~~~~~~~~#' : r)));
  let s = step(mixed, initState(mixed), SHIFT);
  s = place(s, 8, 6, { dx: 15, player: { vx: PARAMS.maxSpeed } }); // feet span ~ (col 8) and # (col 9)
  s = stepN(mixed, s, 20);
  assert.equal(s.player.vx, 0, 'dry stopping distance, not the slide');
});

test('wet floor: shifting off ~ onto dry ground stops the slide', () => {
  const lvl = level(OPEN_E_UP, [...BLANK.slice(0, 7), '~~~~~~~~~~']);
  let s = step(lvl, initState(lvl), SHIFT); // to night, on the waxed floor
  s = stepN(lvl, s, 60, RIGHT); // full-speed slide
  s = step(lvl, s, SHIFT); // to day: dry floor underneath
  assert.equal(s.layer, DAY);
  const x0 = s.player.x;
  s = stepN(lvl, s, 20);
  assert.equal(s.player.vx, 0);
  assert.ok(s.player.x - x0 < 20, `stopped in ${s.player.x - x0}px on the dry floor`);
});

test('wet floor: jump and coyote behave the same as on dry ground', () => {
  const lvl = level(OPEN_E_UP, [...BLANK.slice(0, 7), '~~~~~~~~..']); // ~ floor ends at col 8
  let s = step(lvl, initState(lvl), SHIFT);
  s = stepN(lvl, s, 30, RIGHT);
  s = step(lvl, s, { ...RIGHT, jumpPressed: true, jumpHeld: true });
  assert.ok(s.events.some((e) => e.type === 'jump'), 'jump fires while grounded on ~');
  // run off the wet edge; a jump inside coyote time still fires
  s = step(lvl, initState(lvl), SHIFT);
  let guard = 0;
  while (s.player.grounded && guard++ < 300) s = step(lvl, s, RIGHT);
  s = stepN(lvl, s, 3, RIGHT);
  s = step(lvl, s, { ...RIGHT, jumpPressed: true, jumpHeld: true });
  assert.ok(s.events.some((e) => e.type === 'jump'), 'coyote jump fires after leaving a ~ edge');
});

test('wet floor: a tile of ~ blocks a shift just like a wall', () => {
  const night = [...BLANK];
  night[6] = '.~........'; // ~ where the player stands
  const lvl = level(OPEN, night);
  let s = step(lvl, initState(lvl), SHIFT);
  assert.equal(s.layer, DAY, 'shift into ~ is buffered');
  for (let i = 0; i < 20; i++) s = step(lvl, s);
  assert.equal(s.layer, DAY);
  assert.equal(s.shifts, 0);
});

test('wet floor: sliding to a stop emits a wetStop squeak; a dry stop does not', () => {
  let s = step(wet, initState(wet), SHIFT);
  s = stepN(wet, s, 40, RIGHT);
  const evs = [];
  for (let i = 0; i < 240 && !evs.length; i++) { s = step(wet, s); evs.push(...s.events); }
  assert.ok(evs.some((e) => e.type === 'wetStop'), 'hard stop on ~ squeaks');
  let d = stepN(twin, initState(twin), 40, RIGHT);
  const evs2 = [];
  for (let i = 0; i < 60; i++) { d = step(twin, d); evs2.push(...d.events); }
  assert.equal(evs2.filter((e) => e.type === 'wetStop').length, 0);
});
