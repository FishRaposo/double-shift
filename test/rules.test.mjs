// GDD §13.7 collision/shift edge cases, plus S-rules. Each runs headless against src/rules.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { step, initState, NO_INPUT, DAY, NIGHT, TILE, DT, PARAMS, isEmbedded, isSolidChar, overlapsHazard, overlapsSolid, freakBoxes, pendingPranks, tileAt, supervisorFacing, watchedClock } from '../src/rules.js';
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

// The Mid-Air / Wet Floor death loop: a checkpoint touched mid-air over a pit used to save you in that
// shift, so every respawn dropped you straight back into the pit.
test('a checkpoint touched over a pit saves in the shift that has floor there, never over the pit', () => {
  const day = [
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '.S..C...E.',
    '##########',
  ];
  const night = [
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '..........',
    '###....###',
  ];
  const lvl = level(day, night);
  let s = step(lvl, initState(lvl), SHIFT); // night: the checkpoint at col 4 hangs over the night pit
  for (let i = 0; i < 240 && !s.checkpoint.id && s.deaths === 0; i++) s = step(lvl, s, RIGHT);
  assert.ok(s.checkpoint.id, 'checkpoint taken while falling past it at night');
  assert.equal(s.checkpoint.layer, DAY, 'saved in the shift with floor under it');
  for (let i = 0; i < 240 && s.deaths === 0; i++) s = step(lvl, s);
  assert.equal(s.deaths, 1, 'fell into the night pit');
  assert.equal(s.layer, DAY, 'respawned standing on the day floor');
  s = stepN(lvl, s, 120);
  assert.equal(s.deaths, 1, 'and stays alive: no loop');
});

test('a death event says which shift you died in (the spook gag draws in those colors)', () => {
  const lvl = level(OPEN_FLOORED_HAZARD_DAY, OPEN_FLOORED_HAZARD_NIGHT);
  let s = step(lvl, initState(lvl), SHIFT);
  let death = null;
  for (let i = 0; i < 240 && !death; i++) {
    s = step(lvl, s, RIGHT);
    death = s.events.find((e) => e.type === 'death');
  }
  assert.ok(death, 'ran into the night laser');
  assert.equal(death.layer, NIGHT);
  assert.equal(s.layer, DAY, 'respawned on the spawn shift');
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

test('a peeker popping out on your shift emits one peek event per cycle (and none while it is frozen)', () => {
  // far from the player so it never spooks; out for the first half of each 1 s cycle
  const lvl = level(OPEN, BLANK, { freaks: [{ kind: 'peeker', tx: 8, ty: 1, period: 1, duty: 0.5 }] });
  let s = step(lvl, initState(lvl), SHIFT); // onto night: its clock runs
  const peeks = [];
  for (let i = 0; i < 120 * 2.5; i++) { s = step(lvl, s); peeks.push(...s.events.filter((e) => e.type === 'peek')); }
  assert.equal(peeks.length, 2, 'out at t = 1 s and t = 2 s');
  assert.deepEqual(peeks[0], { type: 'peek', id: 'freak0' });
  s = step(lvl, s, SHIFT); // to day: frozen
  let dayPeeks = 0;
  for (let i = 0; i < 120 * 2; i++) { s = step(lvl, s); dayPeeks += s.events.filter((e) => e.type === 'peek').length; }
  assert.equal(dayPeeks, 0);
});

test('a patrolling lurker reports the way it is walking', () => {
  const lvl = level(OPEN, BLANK, { freaks: [{ kind: 'lurker', tx: 2, ty: 6, range: 1, speed: 60 }] });
  let s = step(lvl, initState(lvl), SHIFT);
  s = stepN(lvl, s, 30); // ~0.25 s: heading out
  assert.equal(freakBoxes(lvl, s)[0].dir, 1);
  s = stepN(lvl, s, 60); // ~0.75 s: past the end of its range, heading back
  assert.equal(freakBoxes(lvl, s)[0].dir, -1);
});

test('a ducked peeker reports how long until it pops out', () => {
  const lvl = level(OPEN, BLANK, { freaks: [{ kind: 'peeker', tx: 5, ty: 6, period: 1, duty: 0.5, phase: 0.6 }] });
  const s = initState(lvl);
  const b = freakBoxes(lvl, s)[0];
  assert.equal(b.active, false);
  assert.ok(Math.abs(b.popIn - 0.4) < 1e-9);
  const up = { ...s, freakClock: 0.5 }; // (0.5 + 0.6) % 1 = 0.1: out
  assert.equal(freakBoxes(lvl, up)[0].popIn, 0);
});

test('pending pranks: a repeating prank stays pending, and a lap that changes nothing hides its tell', () => {
  const lvl = level(OPEN, BLANK, {
    pranks: [
      { id: 'a', onNight: 1, every: 2, tell: { tx: 2, ty: 3 }, set: [{ layer: 'night', x0: 4, x1: 4, y0: 5, ch: '#' }, { layer: 'night', x0: 6, x1: 6, y0: 5, ch: '.' }] },
      { id: 'b', onNight: 2, every: 2, tell: { tx: 3, ty: 3 }, set: [{ layer: 'night', x0: 4, x1: 4, y0: 5, ch: '.' }, { layer: 'night', x0: 6, x1: 6, y0: 5, ch: '#' }] },
    ],
  });
  let s = step(lvl, initState(lvl), SHIFT); // entry 1: `a` fires
  assert.deepEqual(pendingPranks(lvl, s).map((p) => [p.id, p.nights]), [['b', 1], ['a', 2]]);
  assert.equal(pendingPranks(lvl, s)[1].tell, null, 'its tiles are spoken for by the next lap');
  s = step(lvl, stepN(lvl, s, 2), SHIFT); // to day
  s = step(lvl, stepN(lvl, s, 2), SHIFT); // entry 2: `b` fires
  assert.equal(s.nightEntries, 2);
  assert.deepEqual(pendingPranks(lvl, s).map((p) => [p.id, p.nights]), [['a', 1], ['b', 2]]);
  assert.ok(pendingPranks(lvl, s)[0].tell, 'the coming lap keeps its tell');
});

test('pending pranks: two pranks telling from one spot show only the soonest', () => {
  const lvl = level(OPEN, BLANK, {
    pranks: [
      { id: 'later', onNight: 2, tell: { tx: 3, ty: 3 }, set: [{ layer: 'night', x0: 6, x1: 6, y0: 5, ch: '#' }] },
      { id: 'soon', onNight: 1, tell: { tx: 3, ty: 3 }, set: [{ layer: 'night', x0: 4, x1: 4, y0: 5, ch: '#' }] },
    ],
  });
  assert.deepEqual(pendingPranks(lvl, initState(lvl)).map((p) => [p.id, !!p.tell]), [['soon', true], ['later', false]]);
});

test('pending pranks: count down in night entries and list only the tiles that will change', () => {
  const lvl = level(OPEN, BLANK, {
    pranks: [
      { id: 'back', onNight: 2, tell: { tx: 3, ty: 3 }, set: [{ layer: 'night', x0: 4, x1: 4, y0: 5, ch: '.' }] },
      { id: 'put', onNight: 1, tell: { tx: 2, ty: 3 }, set: [{ layer: 'night', x0: 4, x1: 5, y0: 5, ch: '#' }] },
    ],
  });
  let s = initState(lvl);
  let list = pendingPranks(lvl, s);
  assert.deepEqual(list.map((p) => [p.id, p.nights]), [['put', 1], ['back', 2]]);
  assert.equal(list[0].cells.length, 2);
  assert.equal(list[1].cells.length, 0, 'a tile already spoken for shows its next change only');
  assert.equal(list[1].tell, null, 'and a prank with nothing to change yet keeps its tell to itself');
  s = step(lvl, s, SHIFT); // entry 1: `put` fires
  list = pendingPranks(lvl, s);
  assert.deepEqual(list.map((p) => [p.id, p.nights]), [['back', 1]]);
  assert.deepEqual(list[0].cells.map((c) => [c.tx, c.ty, c.ch]), [[4, 5, '.']]);
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

// ---------- day-walker freak (SYS-2) ----------
// Lives on the day shift: patrols on `dayClock`, a frozen harmless outline by night.
const DW_LVL = level(OPEN_E_UP, BLANK, { freaks: [{ kind: 'daywalker', tx: 5, ty: 6, range: 3, speed: 60 }] });

test('day-walker: patrols on dayClock (advances by day only), freezes at night', () => {
  let s = initState(DW_LVL);
  const x0 = freakBoxes(DW_LVL, s)[0].x;
  s = stepN(DW_LVL, s, 60); // by day it walks its patrol
  assert.ok(s.dayClock > 0.4);
  assert.equal(s.freakClock, 0);
  assert.notEqual(freakBoxes(DW_LVL, s)[0].x, x0);
  const xFrozen = freakBoxes(DW_LVL, s)[0].x;
  const dc = s.dayClock;
  s = step(DW_LVL, s, SHIFT);
  s = stepN(DW_LVL, s, 60); // at night its clock stops: frozen mid-stride
  assert.equal(s.dayClock, dc);
  assert.equal(freakBoxes(DW_LVL, s)[0].x, xFrozen);
  s = step(DW_LVL, s, SHIFT);
  s = stepN(DW_LVL, s, 30); // back to day: the patrol resumes
  assert.notEqual(freakBoxes(DW_LVL, s)[0].x, xFrozen);
});

test('day-walker: contact by day spooks; sharing its tile by night is safe', () => {
  let s = place(initState(DW_LVL), 5, 6, { dx: 5 }); // on its patrol spot, by day
  s = step(DW_LVL, s);
  assert.equal(s.deaths, 1);
  s = step(DW_LVL, initState(DW_LVL), SHIFT);
  s = place(s, 5, 6, { dx: 5 }); // inside its outline, by night
  s = stepN(DW_LVL, s, 60);
  assert.equal(s.deaths, 0);
});

test('day-walker: shifting to day onto it is a spook (mirror of the night rule)', () => {
  let s = step(DW_LVL, initState(DW_LVL), SHIFT);
  s = place(s, 5, 6, { dx: 5 }); // inside its outline, safe by night
  s = stepN(DW_LVL, s, 10);
  assert.equal(s.deaths, 0);
  s = step(DW_LVL, s, SHIFT); // the shift lands you on it, by day
  assert.equal(s.deaths, 1);
  assert.ok(s.events.some((e) => e.type === 'death' && e.cause === 'spooked'));
});

test('day-walker: dayClock is not rewound by death (same rule as freakClock)', () => {
  let s = initState(DW_LVL);
  s = stepN(DW_LVL, s, 60);
  const dc = s.dayClock;
  assert.ok(dc > 0);
  const b = freakBoxes(DW_LVL, s)[0]; // it has wandered off its base tile by now
  s = place(s, 0, 6, { dx: b.x });
  s = step(DW_LVL, s);
  assert.equal(s.deaths, 1);
  assert.ok(s.dayClock > dc - 1e-9, 'dayClock kept its value through the respawn');
});

test('day-walker: each shift wakes one freak and freezes the other', () => {
  const both = level(OPEN_E_UP, BLANK, {
    freaks: [
      { kind: 'daywalker', tx: 3, ty: 6, range: 2, speed: 60 },
      { kind: 'lurker', tx: 6, ty: 6, range: 2, speed: 60 },
    ],
  });
  let s = initState(both);
  s = stepN(both, s, 60); // day: walker moves, lurker frozen
  const [dw, lu] = freakBoxes(both, s);
  assert.notEqual(dw.x, 3 * TILE + 5);
  assert.equal(lu.x, 6 * TILE + 5);
  s = step(both, s, SHIFT);
  s = stepN(both, s, 60); // night: lurker moves, walker frozen
  const [dw2, lu2] = freakBoxes(both, s);
  assert.equal(dw2.x, dw.x);
  assert.notEqual(lu2.x, lu.x);
});

// ---------- supervisor freak (SYS-3) ----------
// Management, mid-screen: faces left/right on a cycle; only the watched side's freaks work.
const SUP_LVL = level(OPEN_E_UP, BLANK, {
  freaks: [
    { kind: 'supervisor', tx: 5, ty: 6, period: 1, startFacing: 'left' },
    { kind: 'lurker', tx: 2, ty: 6, range: 1, speed: 60 },
    { kind: 'lurker', tx: 8, ty: 6, range: 1, speed: 60 },
  ],
});

test('supervisor: facing alternates every period on the night clock, frozen by day', () => {
  let s = step(SUP_LVL, initState(SUP_LVL), SHIFT); // to night
  assert.equal(freakBoxes(SUP_LVL, s)[0].facing, -1, 'starts facing left');
  s = stepN(SUP_LVL, s, 120); // ~1 s: turned
  assert.equal(freakBoxes(SUP_LVL, s)[0].facing, 1);
  s = stepN(SUP_LVL, s, 120); // ~2 s: back
  assert.equal(freakBoxes(SUP_LVL, s)[0].facing, -1);
  const f = freakBoxes(SUP_LVL, s)[0].facing;
  s = step(SUP_LVL, s, SHIFT); // to day: the clipboard freezes mid-turn
  s = stepN(SUP_LVL, s, 240);
  assert.equal(freakBoxes(SUP_LVL, s)[0].facing, f);
});

test('supervisor: the watched lurker works; the other slacks off frozen and harmless', () => {
  let s = step(SUP_LVL, initState(SUP_LVL), SHIFT);
  s = stepN(SUP_LVL, s, 60); // ~0.5 s: left watched, right slack
  const [, left, right] = freakBoxes(SUP_LVL, s);
  assert.ok(left.active, 'watched side works');
  assert.ok(left.supervised && left.watched);
  assert.ok(right.supervised && !right.watched);
  assert.equal(right.active, false, 'slack side is frozen and harmless');
  s = place(s, 8, 6, { dx: 5 }); // stand on the slack lurker's outline
  s = stepN(SUP_LVL, s, 5);
  assert.equal(s.deaths, 0);
});

test('supervisor: stepping onto the watched lurker still spooks', () => {
  let s = step(SUP_LVL, initState(SUP_LVL), SHIFT);
  s = stepN(SUP_LVL, s, 60); // left watched
  const left = freakBoxes(SUP_LVL, s)[1];
  s = place(s, 0, 6, { dx: left.x });
  s = step(SUP_LVL, s);
  assert.equal(s.deaths, 1);
});

test('supervisor: never moves and never spooks (it is management)', () => {
  let s = step(SUP_LVL, initState(SUP_LVL), SHIFT);
  s = stepN(SUP_LVL, s, 240); // two full cycles
  assert.equal(freakBoxes(SUP_LVL, s)[0].x, 5 * TILE + 5, 'it never leaves the perch');
  s = place(s, 5, 6, { dx: 5 }); // stand on the clipboard itself
  s = stepN(SUP_LVL, s, 60);
  assert.equal(s.deaths, 0);
});

test('supervisor: an unwatched lurker freezes mid-pose and resumes on the next watch', () => {
  let s = step(SUP_LVL, initState(SUP_LVL), SHIFT);
  s = stepN(SUP_LVL, s, 150); // t≈1.3 s: right is watched now
  const frozen = freakBoxes(SUP_LVL, s)[1].x;
  s = stepN(SUP_LVL, s, 60); // still right-watched: the left lurker holds its pose
  assert.equal(freakBoxes(SUP_LVL, s)[1].x, frozen);
  s = stepN(SUP_LVL, s, 40); // t≈2.1 s: left watched again, patrol resumes
  assert.notEqual(freakBoxes(SUP_LVL, s)[1].x, frozen);
});

test('supervisor: watched clock closed form matches counting watched ticks', () => {
  const sup = { startDir: -1, period: 1.7 };
  for (const side of [-1, 1]) {
    let acc = 0;
    let maxErr = 0;
    for (let t = 0; t < 83; t += DT) { // ~10 000 ticks
      if (supervisorFacing(sup, t) === side) acc += DT;
      maxErr = Math.max(maxErr, Math.abs(watchedClock(side, sup, t) - acc));
    }
    assert.ok(maxErr < 2 * DT, `side ${side}: closed form drifted ${maxErr}`);
  }
});

test('supervisor: emits supervisorTurn when the facing flips, once per window', () => {
  let s = step(SUP_LVL, initState(SUP_LVL), SHIFT);
  let turns = 0;
  for (let i = 0; i < 360; i++) {
    s = step(SUP_LVL, s);
    turns += s.events.filter((e) => e.type === 'supervisorTurn').length;
  }
  assert.ok(turns >= 2, `expected turns in 3 s of night, got ${turns}`);
});

// ---------- offset layer (SYS-4) ----------
// `offset` generates the night grid by moving the day grid; S/E/C stay shared and unmoved.
const TOWER_DAY = [
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '..S....E..',
  '##########',
  '##########',
  '##########',
];
// dy: -3 → the floor copy lands 3 tiles up at night
const TOWER_NIGHT = [
  '..........',
  '..........',
  '..........',
  '##########',
  '##########',
  '##########',
  '..........',
  '..........',
  '..........',
];
const tower = level(TOWER_DAY, null, { offset: { dx: 0, dy: -3 } });

test('offset: the generated night grid equals the day grid moved by (dx, dy)', () => {
  const hand = level(TOWER_DAY, TOWER_NIGHT);
  for (let y = 0; y < 9; y++) {
    for (let x = 0; x < 10; x++) {
      assert.equal(tileAt(tower, NIGHT, x, y), tileAt(hand, NIGHT, x, y), `tile ${x},${y}`);
    }
  }
  // shared markers come from the day grid only — they are not moved by the offset
  assert.deepEqual(tower.spawn, hand.spawn);
  assert.deepEqual(tower.exit, hand.exit);
  assert.equal(tileAt(tower, NIGHT, 2, 2), '.', 'the moved S is stripped from the copy');
});

test('offset: nightPatch applies after the offset, day side untouched', () => {
  const lvl = level(TOWER_DAY, null, {
    offset: { dx: 0, dy: -3 },
    nightPatch: [{ x0: 0, x1: 2, y0: 3, ch: '^' }, { x0: 8, y0: 6, ch: '#' }],
  });
  assert.equal(tileAt(lvl, NIGHT, 0, 3), '^');
  assert.equal(tileAt(lvl, NIGHT, 2, 3), '^');
  assert.equal(tileAt(lvl, NIGHT, 8, 6), '#', 'single-cell patch via x0-only rect');
  assert.equal(tileAt(lvl, DAY, 0, 3), '.', 'patch never touches day');
});

test('offset: a grounded shift into the raised copy is refused and changes nothing', () => {
  let s = step(tower, initState(tower), SHIFT);
  for (let i = 0; i < 30; i++) s = step(tower, s);
  assert.equal(s.layer, DAY);
  assert.equal(s.shifts, 0, 'the copy would embed the player: S-08 refusal');
});

test('offset: shifting at a jump apex lands on the raised night copy', () => {
  const { state } = play(tower, (s) => ({
    jump: s.layer === DAY && (s.player.grounded || s.player.vy < 0),
    shift: !s.player.grounded && Math.abs(s.player.vy) < 60 && s.layer !== NIGHT,
  }), 240);
  assert.equal(state.layer, NIGHT);
  assert.equal(state.player.grounded, true, 'landed on the copy');
  assert.ok(state.player.y < 100, `up on the copy (y ${state.player.y})`);
});

const OPEN_FLOORED_HAZARD_DAY = ['..........', '..........', '.S......E.', '##########'];
const OPEN_FLOORED_HAZARD_NIGHT = ['..........', '..........', '.....^....', '##########'];

test('wet floor: air under one foot does not count as grip at a waxed ledge', () => {
  const day = ['..........', '..........', '.S......E.', '##########'];
  const night = ['..........', '..........', '..........', '~~~~......'];
  const lvl = level(day, night);
  let s = initState(lvl);
  s.layer = NIGHT;
  s = place(s, 3, 2, { dx: 18, dy: TILE - PARAMS.playerH, player: { vx: 200, grounded: true } }); // feet on col 3 (wax) and over col 4 (air)
  const before = s.player.vx;
  s = step(lvl, s, NO_INPUT);
  assert.ok(s.player.vx > before - PARAMS.wetDecel * DT - 1e-9 && s.player.vx < before, 'slides with wet decel, no grip from the air');
});

test('parseLevel rejects definitions that would misbehave', () => {
  const day = ['.S.E', '####'];
  const night = ['....', '####'];
  assert.throws(() => level(day, night, { offset: { dx: 0, dy: 0 } }), /not both/);
  assert.throws(() => level(day, null, { offset: { dx: 0, dy: 0 }, nightPatch: [{ x0: 0, y0: 0, ch: 'E' }] }), /shared/);
  const sup = { kind: 'supervisor', tx: 1, ty: 0, period: 2 };
  assert.throws(() => level(day, night, { freaks: [sup, sup] }), /one supervisor/);
  assert.throws(() => level(day, night, { freaks: [{ kind: 'peeker', tx: 1, ty: 0, period: 0 }] }), /period/);
  assert.throws(() => level(day, night, { freaks: [{ kind: 'peeker', tx: 1, ty: 0, period: 1, duty: 0 }] }), /duty/);
});

// ---------- upside down (TECH.md §6.5, GDD §13.7 cases 11–15) ----------
// The night is the day map turned over, with gravity turned over too: every rule is the day rule mirrored.
// Namespace import, so a missing export fails these tests one by one instead of the whole file.
import * as R from '../src/rules.js';
import { ty } from './helpers.mjs';

const UP_DAY = [
  '........',
  '........',
  '........',
  '........',
  '........',
  '........',
  'S......E',
  '###.####',
];
const upside = (day = UP_DAY, extra = {}) => level(day, undefined, { upsideDown: true, ...extra });
const nightAt = (lvl, x, y, player = {}) => {
  const s = initState(lvl);
  s.layer = NIGHT;
  Object.assign(s.player, { x, y, vx: 0, vy: 0, grounded: false, coyote: 0, rising: false }, player);
  return s;
};

test('upside down: the night is the day grid flipped; S, E and C are not copied; nightPatch applies after the flip', () => {
  const day = ['S..C', '.#..', '#^#E', '####'];
  const lvl = level(day, undefined, { upsideDown: true, nightPatch: [{ x0: 1, y0: 0, ch: '~' }] });
  assert.deepEqual(lvl.layers[NIGHT].map((r) => r.join('')), ['#~##', '#^#.', '.#..', '....']);
  assert.equal(lvl.upsideDown, true);
  assert.equal(lvl.nightGenerated, true);
  assert.deepEqual([lvl.spawn, lvl.exit], [{ tx: 0, ty: 0 }, { tx: 3, ty: 2 }], 'S and E stay where the day put them');
});

test('upside down: cannot be combined with a night grid or an offset', () => {
  assert.throws(() => level(UP_DAY, UP_DAY, { upsideDown: true }), /upside down/);
  assert.throws(() => level(UP_DAY, undefined, { upsideDown: true, offset: { dx: 1, dy: 0 } }), /upside down/);
});

test('upside down: the gravity sign is -1 only on the flipped night', () => {
  const lvl = upside();
  assert.equal(R.gravitySign(lvl, DAY), 1);
  assert.equal(R.gravitySign(lvl, NIGHT), -1);
  assert.equal(R.gravitySign(twin, NIGHT), 1, 'an ordinary level');
});

test('upside down: at night you fall up and land hanging (grounded, a land event)', () => {
  const lvl = upside();
  let s = initState(lvl); // standing on the day floor at row 6
  s = step(lvl, s, SHIFT);
  assert.equal(s.layer, NIGHT);
  const events = [];
  for (let i = 0; i < 120 && !s.player.grounded; i++) { s = step(lvl, s); events.push(...s.events); }
  assert.equal(s.player.y, TILE, 'hanging under the night ceiling (row 0), head at the top of row 1');
  assert.equal(s.player.grounded, true);
  assert.equal(s.player.vy, 0);
  assert.ok(events.some((e) => e.type === 'land'));
  assert.equal(isEmbedded(lvl, s), false);
});

test('upside down: a night jump goes down the screen, and releasing jump cuts it', () => {
  const lvl = upside();
  const hang = () => nightAt(lvl, 1 * TILE + 6, TILE, { grounded: true });
  const deepest = (holdTicks) => {
    let s = step(lvl, hang(), { ...NO_INPUT, jumpPressed: true, jumpHeld: true });
    assert.ok(s.player.vy > 0, 'the jump pushes away from the ceiling, down the screen');
    let max = s.player.y;
    for (let i = 0; i < 120 && !(s.player.grounded && i > 2); i++) {
      s = step(lvl, s, { ...NO_INPUT, jumpHeld: i < holdTicks });
      max = Math.max(max, s.player.y);
    }
    return max - TILE;
  };
  const full = deepest(200);
  const tap = deepest(1);
  assert.ok(full > 90 && full < 100, `a full jump reaches about 96 px: ${full}`);
  assert.ok(tap < full * 0.5, `a tap is a short hop: ${tap} vs ${full}`);
});

test('upside down: a mid-air shift keeps vx and vy and reverses the fall', () => {
  const lvl = upside();
  let s = initState(lvl);
  Object.assign(s.player, { x: 3 * TILE, y: 3 * TILE, vx: PARAMS.maxSpeed, vy: 300, grounded: false, coyote: 0 });
  s = step(lvl, s, { ...RIGHT, shiftPressed: true });
  assert.equal(s.layer, NIGHT);
  assert.equal(s.player.vx, PARAMS.maxSpeed, 'horizontal speed kept');
  assert.ok(Math.abs(s.player.vy - (300 - PARAMS.gravity * DT)) < 1e-9, 'the fall kept, now slowed by gravity pulling up');
  for (let i = 0; i < 30; i++) s = step(lvl, s, RIGHT);
  assert.ok(s.player.vy < 0, 'the fall reversed: now moving up the screen');
});

test('upside down: a grounded shift into the mirrored floor is refused and changes nothing', () => {
  const day = ['........', '########', ...UP_DAY.slice(2)]; // a day ceiling at row 1 is the night floor at row 6
  const lvl = upside(day);
  const s0 = initState(lvl);
  let s = step(lvl, s0, SHIFT);
  assert.equal(s.layer, DAY);
  assert.deepEqual([s.player.x, s.player.y, s.shifts], [s0.player.x, s0.player.y, 0]);
  const events = [];
  for (let i = 0; i < 12; i++) { s = step(lvl, s); events.push(...s.events); }
  assert.ok(events.some((e) => e.type === 'shiftFail'));
});

test('upside down: the nudge tries against the new gravity first (down the screen at night)', () => {
  // night has a solid at (2,2); the player overlaps its bottom-left corner by 2 px both ways, so moving down
  // or left by 2 px would both clear it. Night gravity pulls up, so the nudge goes down first.
  const day = ['........', '........', '........', '........', '........', '..#.....', 'S......E', '########'];
  const lvl = upside(day);
  let s = initState(lvl);
  Object.assign(s.player, { x: 2 * TILE - PARAMS.playerW + 2, y: 3 * TILE - 2, vx: -100, vy: 0, facing: -1, grounded: false, coyote: 0 });
  s = step(lvl, s, SHIFT);
  assert.equal(s.layer, NIGHT);
  assert.ok(s.events.some((e) => e.type === 'shift' && e.nudged));
  assert.ok(s.player.x > 2 * TILE - PARAMS.playerW + 1, `not nudged sideways: x ${s.player.x}`);
  assert.ok(s.player.y >= 3 * TILE - 1e-9, `nudged down, clear of the solid: y ${s.player.y}`);
});

test('upside down: a flipping shift clears coyote time; a same-sign shift keeps it', () => {
  const jumpShift = { ...NO_INPUT, shiftPressed: true, jumpPressed: true, jumpHeld: true };
  const lvl = upside();
  let s = initState(lvl);
  Object.assign(s.player, { x: 1 * TILE + 6, y: 3 * TILE, vy: 50, grounded: false, coyote: 0.05 });
  s = step(lvl, s, jumpShift);
  assert.equal(s.layer, NIGHT);
  assert.ok(!s.events.some((e) => e.type === 'jump'), 'no mid-air jump right after a flip');
  assert.equal(s.player.coyote, 0);
  assert.equal(s.player.rising, false);
  // the same thing in an ordinary level: coyote carries across the shift
  let o = initState(twin);
  Object.assign(o.player, { x: 1 * TILE + 6, y: 3 * TILE, vy: 50, grounded: false, coyote: 0.05 });
  o = step(twin, o, jumpShift);
  assert.ok(o.events.some((e) => e.type === 'jump'));
});

test('upside down: a flip that leaves you touching the new floor while moving away from it is no landing (no jump, no coyote)', () => {
  const day = [...UP_DAY];
  day[5] = '...#....'; // hangs at (3,2) on the flipped night: its underside is a floor at y = 3 * TILE
  const lvl = upside(day);
  const start = (vy) => {
    const s = initState(lvl);
    Object.assign(s.player, { x: 3 * TILE + 6, y: 3 * TILE - 2.3, vx: 0, vy, grounded: false, coyote: 0, rising: false });
    return s;
  };
  const jumpShift = { ...NO_INPUT, shiftPressed: true, jumpPressed: true, jumpHeld: true };
  // falling down the screen by day is moving away from that underside at night, though the nudge leaves you touching it
  let s = step(lvl, start(150), jumpShift);
  assert.equal(s.layer, NIGHT);
  assert.ok(!s.events.some((e) => e.type === 'jump'), 'no jump on the flip tick');
  assert.equal(s.player.coyote, 0, 'no coyote time from a floor you are leaving');
  for (let i = 0; i < 6; i++) s = step(lvl, s, NO_INPUT);
  s = step(lvl, s, { ...NO_INPUT, jumpPressed: true, jumpHeld: true });
  assert.ok(!s.events.some((e) => e.type === 'jump'), 'and no mid-air jump 50 ms later');
  // rising by day is moving toward it at night: a real landing, so the shift-jump still fires (S-5.5)
  const t = step(lvl, start(-150), jumpShift);
  assert.ok(t.events.some((e) => e.type === 'jump'), 'moving toward the new floor: the shift-jump fires');
});

test('upside down: night hazards hit in the top 45% of the tile', () => {
  const day = ['........', '........', '........', '........', '........', '........', 'S..^...E', '########'];
  const lvl = upside(day); // the day spike at (3,6) hangs at (3,1) at night
  const x = 3 * TILE + 6;
  const band = TILE * PARAMS.hazardHeight;
  assert.equal(R.overlapsHazard(lvl, NIGHT, x, TILE), true, 'hanging into it');
  assert.equal(R.overlapsHazard(lvl, NIGHT, x, TILE + band - 1), true);
  assert.equal(R.overlapsHazard(lvl, NIGHT, x, TILE + band + 0.5), false, 'below the band');
  assert.equal(R.overlapsHazard(lvl, DAY, x, 7 * TILE - PARAMS.playerH), true, 'the day spike still hits from below');
  let s = nightAt(lvl, 2 * TILE + 6, TILE, { grounded: true });
  for (let i = 0; i < 40 && s.deaths === 0; i++) s = step(lvl, s, RIGHT);
  assert.equal(s.deaths, 1, 'walking along the ceiling into the hanging spike');
});

test('upside down: falling out the top at night is a fall death, and the respawn is clean', () => {
  const lvl = upside(); // the day pit at column 3 is a hole in the night ceiling
  let s = nightAt(lvl, 3 * TILE + 6, 3 * TILE);
  const events = [];
  for (let i = 0; i < 240 && s.deaths === 0; i++) { s = step(lvl, s); events.push(...s.events); }
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'fall'));
  assert.equal(s.layer, DAY);
  assert.deepEqual([s.player.x, s.player.y], [initState(lvl).player.x, initState(lvl).player.y]);
  assert.equal(s.player.grounded, true);
  assert.equal(isEmbedded(lvl, s), false);
  assert.equal(R.tileAt(lvl, NIGHT, 0, -1), '.', 'above the flipped night is open');
  assert.equal(R.tileAt(lvl, NIGHT, 0, lvl.h), '#', 'below it is solid');
  assert.deepEqual([R.tileAt(lvl, DAY, 0, -1), R.tileAt(lvl, DAY, 0, lvl.h)], ['#', '.'], 'the day is unchanged');
});

test('upside down: a night checkpoint saves hanging; the respawn is grounded and not embedded', () => {
  const day = ['........', '........', '....#...', '........', '........', '........', 'S...C..E', '########'];
  const lvl = upside(day); // at night (4,5) is solid: the checkpoint cell (4,6) has a ceiling to hang from
  assert.deepEqual(R.standableSpot(lvl, NIGHT, 4, 6), { x: 4 * TILE + (TILE - PARAMS.playerW) / 2, y: 6 * TILE });
  assert.deepEqual(R.standableSpot(lvl, DAY, 4, 6), R.spawnPoint(4, 6));
  assert.equal(R.standableSpot(lvl, NIGHT, 2, 6), null, 'nothing to hang from');
  let s = nightAt(lvl, 4 * TILE + 6, 6 * TILE, { grounded: true });
  s = step(lvl, s);
  assert.equal(s.checkpoint.layer, NIGHT);
  assert.equal(s.checkpoint.y, 6 * TILE);
  s.player.y = -200; // out the top
  s = step(lvl, s);
  assert.equal(s.deaths, 1);
  assert.equal(s.layer, NIGHT);
  assert.equal(ty(s), 6);
  assert.equal(s.player.grounded, true);
  assert.equal(isEmbedded(lvl, s), false);
});

test('upside down: night freaks hang and freeze by day; the day-walker stands', () => {
  const lvl = upside(UP_DAY, {
    freaks: [{ kind: 'lurker', tx: 2, ty: 1, range: 2, speed: 40 }, { kind: 'daywalker', tx: 5, ty: 6, range: 1, speed: 40 }],
  });
  let s = initState(lvl);
  const [lurker, walker] = freakBoxes(lvl, s);
  assert.deepEqual([lurker.y, lurker.hang], [TILE, true], 'hangs under the night ceiling');
  assert.deepEqual([walker.y, !!walker.hang], [7 * TILE - 22, false]);
  s = stepN(lvl, s, 60);
  assert.equal(freakBoxes(lvl, s)[0].x, lurker.x, 'frozen by day');
});

test('upside down: determinism, and a valid shift never leaves the player inside solid geometry (fuzz)', () => {
  const day = [
    '..........',
    '...##.....',
    '.......#..',
    '..#.......',
    '.....##...',
    '.#.....#..',
    '.S..#...E.',
    '###.######',
  ];
  const lvl = level(day, undefined, { upsideDown: true });
  const run = () => {
    let seed = 11;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    let s = initState(lvl);
    for (let i = 0; i < 6000; i++) {
      const input = { left: rnd() < 0.3, right: rnd() < 0.5, jumpHeld: rnd() < 0.5, jumpPressed: rnd() < 0.05, shiftPressed: rnd() < 0.08 };
      s = step(lvl, s, input);
      if (s.won) s = initState(lvl);
      assert.equal(isEmbedded(lvl, s), false, `embedded at tick ${i}`);
    }
    return s;
  };
  assert.deepEqual(run(), run());
});

test('jump and land events carry where they happened (x, y and the layer), for the dust', () => {
  const lvl = upside();
  let s = initState(lvl);
  s = step(lvl, s, { ...NO_INPUT, jumpPressed: true, jumpHeld: true });
  const jump = s.events.find((e) => e.type === 'jump');
  assert.ok(jump, 'jumped');
  assert.deepEqual([typeof jump.x, typeof jump.y, jump.layer], ['number', 'number', DAY]);
  const events = [];
  for (let i = 0; i < 120 && !events.some((e) => e.type === 'land'); i++) { s = step(lvl, s, { ...NO_INPUT, jumpHeld: true }); events.push(...s.events); }
  const land = events.find((e) => e.type === 'land');
  assert.deepEqual([land.x, land.y, land.layer], [s.player.x, s.player.y, DAY]);
});

test('parseLevel: a level revision defaults to 1 and must be a whole number from 1', () => {
  const day = ['S..E', '####'];
  assert.equal(R.parseLevel({ name: 't', par: 0, day, night: day }).rev, 1);
  assert.equal(R.parseLevel({ name: 't', par: 0, day, night: day, rev: 2 }).rev, 2);
  for (const rev of [0, 1.5, '2']) assert.throws(() => R.parseLevel({ name: 't', par: 0, day, night: day, rev }), /rev/);
});

test('pranks: a prank with `every: n` fires on its entry and again every n entries after', () => {
  const day = ['S..E', '####'];
  const lvl = R.parseLevel({ name: 't', par: 0, day, night: day, pranks: [{ id: 'p', onNight: 2, every: 3, set: [{ layer: 'night', x0: 1, y0: 0, ch: '#' }] }] });
  let s = R.initState(lvl);
  const fired = [];
  for (let k = 0; k < 2 * 11 - 1; k++) {
    s = R.step(lvl, s, { ...R.NO_INPUT, shiftPressed: true });
    if (s.events.some((e) => e.type === 'prank')) fired.push(s.nightEntries);
  }
  assert.deepEqual(fired, [2, 5, 8, 11]);
  assert.throws(() => R.parseLevel({ name: 't', par: 0, day, night: day, pranks: [{ id: 'p', onNight: 1, every: 0, set: [] }] }), /every/);
});

test('overridesAfter: the tile overrides after N night clock-ins, pranks applied in order as step() does', () => {
  const lvl = level(OPEN, OPEN.map((r) => r.replace(/[SE]/g, '.')), {
    pranks: [
      { id: 'a', onNight: 1, set: [{ layer: 'night', x0: 2, y0: 6, ch: '#' }] },
      { id: 'b', onNight: 2, every: 2, set: [{ layer: 'day', x0: 4, y0: 6, ch: '#' }] },
    ],
  });
  assert.deepEqual(R.overridesAfter(lvl, 0), {});
  assert.deepEqual(R.overridesAfter(lvl, 1), { '1,2,6': '#' });
  assert.deepEqual(R.overridesAfter(lvl, 4), { '1,2,6': '#', '0,4,6': '#' });
  // the same overrides the rules reach by actually clocking in
  let s = initState(lvl);
  for (let i = 0; i < 4; i++) { s = step(lvl, s, SHIFT); s = step(lvl, s, NO_INPUT); s = step(lvl, s, SHIFT); s = step(lvl, s, NO_INPUT); }
  assert.equal(s.nightEntries, 4);
  assert.deepEqual(s.overrides, R.overridesAfter(lvl, 4));
});

// ---------- work orders ----------
const JOB_DAY = [
  '..........',
  '..........',
  '..........',
  '..........',
  '..........',
  '.S......E.',
  '##########',
];
const JOB_NIGHT = JOB_DAY.map((r) => r.replace(/[SE]/g, '.'));
const JOB = (tool = 'day', fix = 'day') => level(JOB_DAY, JOB_NIGHT, { repairs: [{ tool: { tx: 3, ty: 5, layer: tool, name: 'FUSE', kind: 'fuse' }, fix: { tx: 6, ty: 5, layer: fix, name: 'FUSE BOX', kind: 'fuse' } }] });
const walkTo = (lvl, s, tile) => { for (let i = 0; i < 600 && s.player.x / TILE < tile && !s.won; i++) s = step(lvl, s, RIGHT); return s; };

test('work order: the tool, then the fix, then the exit opens', () => {
  const lvl = JOB();
  const { state, events } = play(lvl, () => ({ right: true }), 120 * 4);
  assert.equal(state.won, true);
  assert.deepEqual(events.filter((e) => ['tool', 'repaired', 'win'].includes(e.type)).map((e) => e.type), ['tool', 'repaired', 'win']);
});

test('work order: a repair changes the map, and waits rather than close on the worker', () => {
  const job = (x) => ({ repairs: [{ tool: { tx: 2, ty: 5, layer: 'day', name: 'A', kind: 'fuse' }, fix: { tx: 4, ty: 5, layer: 'day', name: 'B', kind: 'fuse', set: [{ layer: 'day', x0: x, y0: 5, ch: '#' }] } }] });
  const lvl = level(JOB_DAY, JOB_NIGHT, job(7));
  let s = walkTo(lvl, initState(lvl), 5);
  assert.equal(s.repairs[0].done, true);
  assert.equal(tileAt(lvl, DAY, 7, 5, s.overrides), '#');
  const onMe = level(JOB_DAY, JOB_NIGHT, job(4));
  s = walkTo(onMe, initState(onMe), 4);
  assert.equal(s.repairs[0].done, false, 'not while you stand in it');
});

test('work order: the tool and the broken thing only count on their own shift', () => {
  const lvl = JOB('night', 'day');
  let s = walkTo(lvl, initState(lvl), 4.5);
  assert.equal(s.repairs[0].tool, false, 'walked past it on day');
  s = place(step(lvl, s, SHIFT), 3, 5);
  s = stepN(lvl, s, 2);
  assert.equal(s.repairs[0].tool, true);
});

test('work order: the broken thing needs the tool first', () => {
  const lvl = JOB('night', 'day');
  const s = walkTo(lvl, initState(lvl), 7);
  assert.equal(s.repairs[0].done, false);
});

test('work order: a death returns to what the checkpoint saved, tool included', () => {
  const job = { repairs: [{ tool: { tx: 2, ty: 1, layer: 'day', name: 'A', kind: 'fuse' }, fix: { tx: 9, ty: 1, layer: 'day', name: 'B', kind: 'fuse' } }] };
  const stopAfterDying = (s) => ({ right: s.deaths === 0 });
  const saved = level(['..........', '.S.C.....E', '####....##'], ['..........', '..........', '####....##'], job);
  const a = play(saved, stopAfterDying, 120 * 4).state;
  assert.equal(a.deaths, 1);
  assert.equal(a.repairs[0].tool, true, 'picked up before the checkpoint, so it stays');
  const unsaved = level(['..........', '.S.......E', '####....##'], ['..........', '..........', '####....##'], job);
  const b = play(unsaved, stopAfterDying, 120 * 4).state;
  assert.equal(b.deaths, 1);
  assert.equal(b.repairs[0].tool, false, 'no checkpoint: the tool goes back');
});

test('a level without a work order is unchanged: the exit just works', () => {
  const lvl = level(JOB_DAY, JOB_NIGHT);
  assert.deepEqual(lvl.repairs, []);
  assert.equal(play(lvl, () => ({ right: true }), 120 * 4).state.won, true);
});

test('water: deadly across its tile, less a lip at the surface, and the lip turns over on a flipped night', () => {
  const day = ['....', '.ww.', '....'];
  const flat = level(['S..E', ...day], ['S..E', ...day]);
  const flip = level(['S..E', '....', '....', '####'], undefined, { upsideDown: true, nightPatch: [{ x0: 1, y0: 1, ch: 'w' }] });
  const [x, w, h] = [TILE + 6, 10, 10];
  assert.equal(overlapsHazard(flat, DAY, x, 2 * TILE - h + 4, w, h), false, 'in the lip above the surface');
  assert.equal(overlapsHazard(flat, DAY, x, 2 * TILE - h + 12, w, h), true);
  assert.equal(overlapsHazard(flip, NIGHT, x, 2 * TILE - 4, w, h), false, 'in the lip below it, on a flipped night');
  assert.equal(overlapsHazard(flip, NIGHT, x, 2 * TILE - 12, w, h), true);
});

// ---------- what each kind of repair does ----------

const ROOM = ['..........', '..........', '..........', '.S......E.', '##########'];
const NIGHT_ROOM = ROOM.map((r) => r.replace(/[SE]/g, '.'));
const FUSE = { tx: 2, ty: 3, layer: 'day', name: 'FUSE', kind: 'fuse' };
const leftTo = (lvl, s, tile) => { for (let i = 0; i < 600 && s.player.x / TILE > tile; i++) s = step(lvl, s, { ...NO_INPUT, left: true }); return s; };
const wall = (x) => [{ layer: 'day', x0: x, y0: 0, ch: '#' }];
const round = (lvl, s) => stepN(lvl, step(lvl, stepN(lvl, step(lvl, s, SHIFT), 2), SHIFT), 2);

test('power: one fuse, two sockets; the fuse pulled from one goes in the other', () => {
  const lvl = level(ROOM, NIGHT_ROOM, { repairs: [{ tool: FUSE, fix: { name: 'BOX', kind: 'fuse', layer: 'day', spots: [{ tx: 4, ty: 3, set: wall(0) }, { tx: 6, ty: 3, set: wall(1) }] } }] });
  let s = walkTo(lvl, initState(lvl), 4.6);
  assert.deepEqual([s.repairs[0].done, s.repairs[0].at], [true, 0]);
  assert.equal(tileAt(lvl, DAY, 0, 0, s.overrides), '#');
  s = walkTo(lvl, s, 6.6);
  assert.equal(tileAt(lvl, DAY, 1, 0, s.overrides), '.', 'the other socket does nothing while the fuse is elsewhere');
  s = leftTo(lvl, s, 4.4);
  assert.equal(s.repairs[0].done, false, 'back at the filled one: pulled');
  assert.equal(tileAt(lvl, DAY, 0, 0, s.overrides), '.');
  s = walkTo(lvl, s, 6.6);
  assert.equal(s.repairs[0].at, 1);
  assert.equal(tileAt(lvl, DAY, 1, 0, s.overrides), '#');
});

test('water: touching the valve again undoes it, and again redoes it, but not while you stand there', () => {
  const lvl = level(ROOM, NIGHT_ROOM, { repairs: [{ tool: FUSE, fix: { tx: 4, ty: 3, name: 'VALVE', kind: 'pipe', layer: 'day', swap: true, set: wall(0) } }] });
  let s = walkTo(lvl, initState(lvl), 4.1);
  s = stepN(lvl, s, 120);
  assert.equal(tileAt(lvl, DAY, 0, 0, s.overrides), '#', 'standing on it changes nothing');
  s = walkTo(lvl, s, 5.6);
  s = leftTo(lvl, s, 3.5);
  assert.equal(tileAt(lvl, DAY, 0, 0, s.overrides), '.');
  s = walkTo(lvl, s, 5.6);
  assert.equal(tileAt(lvl, DAY, 0, 0, s.overrides), '#');
});

const LIFT_DAY = ['..........', '..........', '..........', '..........', '......##..', '..........', '.S.....E..', '##########'];
const LIFT_NIGHT = LIFT_DAY.map((r) => r.replace(/[SE]/g, '.'));
const LIFT = { repairs: [{ tool: { tx: 2, ty: 6, layer: 'day', name: 'OIL', kind: 'oil' }, fix: { tx: 4, ty: 6, name: 'HOIST', kind: 'hinge', layer: 'day', car: { w: 2, stops: [[6, 4], [6, 2]] } } }] };

test('machine: nothing until repaired; then one stop per night clock-in, back and forth', () => {
  const lvl = level(LIFT_DAY, LIFT_NIGHT, LIFT);
  let s = round(lvl, initState(lvl));
  assert.equal(tileAt(lvl, DAY, 6, 4, s.overrides), '#', 'still broken');
  s = walkTo(lvl, s, 4.6);
  assert.equal(s.repairs[0].done, true);
  s = round(lvl, s);
  assert.equal(tileAt(lvl, DAY, 6, 4, s.overrides), '.');
  assert.equal(tileAt(lvl, NIGHT, 6, 2, s.overrides), '#', 'on both shifts');
  s = round(lvl, s);
  assert.equal(tileAt(lvl, DAY, 6, 4, s.overrides), '#', 'and back');
  assert.equal(tileAt(lvl, DAY, 6, 2, s.overrides), '.');
});

test('machine: it carries whoever stands on it, and a clock-in that would bury you waits', () => {
  const lvl = level(LIFT_DAY, LIFT_NIGHT, LIFT);
  const running = () => { const st = initState(lvl); st.repairs = [{ ...st.repairs[0], tool: true, done: true, at: 0 }]; return st; };
  let s = stepN(lvl, place(running(), 6, 3), 40);
  assert.equal(s.player.grounded, true);
  const { y } = s.player;
  s = step(lvl, s, SHIFT);
  assert.equal(s.layer, NIGHT);
  assert.equal(s.player.y, y - 2 * TILE, 'carried up');
  const b = step(lvl, place(running(), 6, 2), SHIFT);
  assert.equal(b.layer, DAY, 'the car would land on you');
});

test('light: once repaired, the freaks in its room scatter, and a death brings them back', () => {
  const lvl = level(ROOM, NIGHT_ROOM, { freaks: [{ kind: 'squatter', tx: 7, ty: 3 }], repairs: [{ tool: FUSE, fix: { tx: 4, ty: 3, name: 'LIGHT', kind: 'light', layer: 'day', clears: { x0: 6, x1: 8, y0: 0, y1: 3 } } }] });
  let s = initState(lvl);
  assert.equal(freakBoxes(lvl, s)[0].active, true);
  s = walkTo(lvl, s, 4.6);
  const box = freakBoxes(lvl, s)[0];
  assert.deepEqual([box.active, box.scattered], [false, true]);
  s.repairs = s.checkpoint.repairs;
  assert.equal(freakBoxes(lvl, s)[0].active, true);
});

test('secure: a repaired clamp stops its prank for good, and its tell with it', () => {
  const pranks = [{ id: 'grab', onNight: 2, every: 1, cells: [{ layer: 'day', x0: 0, y0: 0, ch: '#' }], tell: { tx: 0, ty: 1 } }];
  const lvl = level(ROOM, NIGHT_ROOM, { pranks, repairs: [{ tool: FUSE, fix: { tx: 4, ty: 3, name: 'CLAMP', kind: 'bolt', layer: 'day', secures: ['grab'] } }] });
  let s = initState(lvl);
  assert.equal(pendingPranks(lvl, s).length, 1);
  s = walkTo(lvl, s, 4.6);
  assert.equal(pendingPranks(lvl, s).length, 0);
  for (let i = 0; i < 3; i++) s = round(lvl, s);
  assert.equal(s.nightEntries, 3);
  assert.equal(tileAt(lvl, DAY, 0, 0, s.overrides), '.');
});

test("work order: a position needs a layer", () => {
  assert.throws(() => level(JOB_DAY, JOB_NIGHT, { repairs: [{ tool: { tx: 1, ty: 1 }, fix: { tx: 2, ty: 1, layer: 'day' } }] }), /needs a layer/);
});
