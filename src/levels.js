// Double Shift — levels. Two equal-size ASCII grids per level.
// Legend: # solid, ^ hazard, ~ wet floor (solid, slick), S spawn, E exit, C checkpoint, . empty.
// S, E and C are shared between shifts. `par` = the scripted solution's clock-ins (test/solutions.mjs);
// the tests also check fair timing and that no route wins below par (npm run audit).
//
// pranks: what the freaks change on the Nth entry into night (`onNight`; `every` repeats it). `set` rectangles
//         override tiles; `tell` is where the warning (eyes at night, a note by day, `text` for its words, and a
//         countdown) appears before it happens; `sound` plays under the giggle.
// freaks: fixed patterns on their own shift's clock, frozen while you're on the other shift.
//         lurker (patrols `range` tiles at `speed` px/s), peeker (out for `duty` of `period` s),
//         squatter (never moves), supervisor (turns every `period` s from `startFacing`; only the
//         freaks on the side it faces work), daywalker (a lurker that works the day shift).
// offset: { dx, dy } instead of a night grid: night is the day grid moved; `nightPatch` adds differences.
// upsideDown: true instead of a night grid: night is the day grid turned over and gravity points up there
//         (act 5). Author the day map; night pranks, tells, freaks and props use night screen coordinates.
// decor:  cosmetic only: small dim eyes, just watching (a tell's big glowing pair always means a prank).
// skins:  object art over solid tiles: doors, pillars, portraits (src/skins.js).
// props:  cosmetic scenery from PROPS in src/art.js: { kind, tx, ty, layer?: 'day'|'night', w?, text?, style?,
//         flip? } (flip hangs it upside down in its cell, for a flipped night; signs stay upright). One `memo`
//         per level: its text shows on a panel while the worker is near.
// act:    which act the level belongs to (the first level of each act is always open in level select).
// rev:    the level's revision: saved bests from an older one don't carry over.

export const ACTS = { 1: 'Renovation', 2: 'Overtime', 3: 'Graveyard Shift', 4: 'Lights Out', 5: 'Upside Down', 6: 'Finale' };

// The finale is its own act: level select gives it a row labelled FINALE, and its act card reads
// FINALE · <level name> instead of ACT 6.
export const FINALE_ACT = 6;

// One object moved by every night entry around a loop of places (the pillar, the portrait, a plank): entry `first`
// (default 1) takes it from `start` to loop[0], each later entry to the next place, round the loop for good (the
// lap's moves repeat with `every`). So a clock-in too many costs a lap, never the level (pillar and portrait have
// no death to reset them). Every move has a tell at its destination.
function relocations(id, { start, loop, rect, sound, first = 1 }) {
  return Array.from({ length: loop.length + 1 }, (_, i) => {
    const from = i === 0 ? start : loop[(i - 1) % loop.length];
    const to = loop[i % loop.length];
    const r = rect(to);
    return {
      id: `${id}${i + 1}`,
      onNight: first + i,
      ...(i > 0 ? { every: loop.length } : {}),
      tell: { tx: Math.floor((r.x0 + (r.x1 ?? r.x0)) / 2), ty: r.y0 },
      ...(sound ? { sound } : {}),
      set: [{ layer: 'night', ...rect(from), ch: '.' }, { layer: 'night', ...r, ch: '#' }],
    };
  });
}

// The classic Clock Out from before the rework: three rooms, no Upside Down. Not in LEVELS; the rework took its slot
// and id. Kept for the record and proven at par 7 by test/levels.test.mjs. Bringing it back would also need a memo
// and new room tests (LEVELS.md §5.3).
export const CLOCKOUT_CLASSIC = {
  id: 'clockout',
  name: 'Clock Out',
  act: FINALE_ACT,
  note: "Almost done. Don't look at the vents.",
  par: 7,
  props: [
    { kind: 'timeClock', tx: 30, ty: 9 },
    { kind: 'coatRack', tx: 29, ty: 9, layer: 'day' },
    { kind: 'vent', tx: 26, ty: 6 },
    { kind: 'sign', tx: 2, ty: 9, text: 'LAST SHIFT', style: 'paper', layer: 'day' },
  ],
  decor: [
    { kind: 'eyes', tx: 3, ty: 4 }, { kind: 'eyes', tx: 9, ty: 2 }, { kind: 'eyes', tx: 13, ty: 6 },
    { kind: 'eyes', tx: 26, ty: 3 }, { kind: 'eyes', tx: 30, ty: 5 },
  ],
  // Everything once more, in three rooms. Room 1 (cols 0-14): a pit with a night stone and a
  // higher day stone, so both crossings are mid-air shifts. Room 2 (cols 15-24): `watch`'s
  // tunnel: day crates at 17 and 24 force night in and out, the lurker inside forces a day
  // freeze. Room 3 (cols 25-31): the time clock sits on a ledge 4 tiles up; the only way up is
  // a night step. Leaving room 2 at night is clock-in 3, when they take the step; clock-in 4
  // puts it back. So clock out and in again before you climb. Checkpoints at rooms 2 and 3.
  day: [
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.....E.',
    '.................########...####',
    '.................########...####',
    '..........###....########...####',
    'S..............C.#......#C..####',
    '##.............#################',
    '##.............#################',
    '##.............#################',
    '##.............#################',
  ],
  night: [
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########.......',
    '.................########...####',
    '.................########...####',
    '.................########..#####',
    '.....###...................#####',
    '##.............#################',
    '##.............#################',
    '##.............#################',
    '##.............#################',
  ],
  freaks: [{ kind: 'lurker', tx: 20, ty: 13, range: 1, speed: 45 }],
  pranks: [
    {
      id: 'stepGone',
      onNight: 3,
      tell: { tx: 27, ty: 10 },
      set: [{ layer: 'night', x0: 27, x1: 27, y0: 12, y1: 13, ch: '.' }],
    },
    {
      id: 'stepBack',
      onNight: 4,
      tell: { tx: 26, ty: 7 },
      set: [{ layer: 'night', x0: 27, x1: 27, y0: 12, y1: 13, ch: '#' }],
    },
  ],
};

export const LEVELS = [
  {
    id: 'clock',
    name: 'Clock In',
    act: 1,
    props: [
      { kind: 'memo', tx: 14, ty: 11, text: "Mind the gap. Seriously. — Renovation" },
      { kind: 'barrierTape', tx: 11, ty: 13, w: 10, layer: 'day' }, // a cordon from floor edge to floor edge
      { kind: 'sign', tx: 8, ty: 10, text: 'RENOVATION', style: 'note' },
      { kind: 'footprints', tx: 21, ty: 13, layer: 'night' },
      { kind: 'footprints', tx: 22, ty: 13, layer: 'night' },
    ],
    decor: [{ kind: 'eyes', tx: 29, ty: 4 }],
    // the night crew is here from level 1: a peeker blinks behind the locked gate — sealed
    // off by the wall at col 24, so it is evidence, not danger
    freaks: [{ kind: 'peeker', tx: 26, ty: 8, period: 1.6, duty: 0.5 }], // on a stack too tall to reach: a look, not a threat yet
    note: 'Gap in the floor by day. The night crew laid planks, and locked the gate.',
    par: 2,
    day: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '..S..........................E..',
      '############........############',
      '############........############',
      '############........############',
      '############........############',
    ],
    night: [
      '........................#.......',
      '........................#.......',
      '........................#.......',
      '........................#.......',
      '........................#.......',
      '........................#.......',
      '........................#.......',
      '........................#.......',
      '........................#.......',
      '........................#.#.....',
      '........................#.#.....',
      '........................#.#.....',
      '........................#.#.....',
      '........................#.#.....',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
  },
  {
    id: 'scaff',
    name: 'Scaffolding',
    act: 1,
    props: [
      { kind: 'memo', tx: 20, ty: 6, text: "Deliveries go on the ledge. Not on the scaffolding. Not on the ledge either. — Receiving" },
      { kind: 'pallet', tx: 18, ty: 7, layer: 'day' },
      { kind: 'crate', tx: 20, ty: 7, layer: 'day' },
      { kind: 'sign', tx: 5, ty: 9, text: 'DELIVERIES', style: 'paper' },
      { kind: 'footprints', tx: 9, ty: 13, layer: 'night' },
      { kind: 'footprints', tx: 10, ty: 13, layer: 'night' },
    ],
    decor: [{ kind: 'eyes', tx: 8, ty: 4 }, { kind: 'eyes', tx: 13, ty: 6 }],
    note: 'The day crew put up scaffolding. Deliveries came in.',
    par: 1,
    day: [
      '.......................##.......',
      '.......................##.......',
      '.......................##.......',
      '.......................##.......',
      '.......................##.......',
      '.......................##.......',
      '.......................##.......',
      '.......................##....E..',
      '................################',
      '................################',
      '...........###..################',
      '................################',
      '......####......################',
      '..S.............################',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    night: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................################',
      '................################',
      '................################',
      '................################',
      '................################',
      '................################',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
  },
  {
    id: 'closing',
    name: 'Closing Time',
    act: 1,
    props: [
      { kind: 'memo', tx: 13, ty: 11, text: "Lasers are for security, not for jumping over. — Night Management" },
      { kind: 'sign', tx: 5, ty: 10, text: 'CLOSING TIME', style: 'paper' }, { kind: 'sign', tx: 22, ty: 10, text: 'LASERS', style: 'red', layer: 'night' },
    ],
    decor: [{ kind: 'eyes', tx: 24, ty: 4 }],
    // a peeker sealed past the far night gate: it blinks at night, and by day its frozen
    // outline stands beside the exit — the first freak a new player walks through
    freaks: [{ kind: 'peeker', tx: 29, ty: 7, period: 1.3, duty: 0.4 }], // up on a shelf, out of reach
    note: 'Rebar by day, lasers by night. Gates go down at closing.',
    par: 2,
    day: [
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..S.........^^^^^^#...........E.',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    night: [
      '.........#.................#....',
      '.........#.................#....',
      '.........#.................#....',
      '.........#.................#....',
      '.........#.................#....',
      '.........#.................#....',
      '.........#.................#....',
      '.........#.................#....',
      '.........#.................####.',
      '.........#.................#....',
      '.........#.................#....',
      '.........#.................#....',
      '.........#.................#....',
      '.........#...........^^^^^.#....',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
  },
  {
    id: 'midair',
    name: 'Mid-Air',
    act: 1,
    props: [
      { kind: 'memo', tx: 6, ty: 11, text: "Please report blinking in the dark to nobody." },
      { kind: 'vent', tx: 24, ty: 4 }, { kind: 'barrierTape', tx: 4, ty: 13, w: 2, layer: 'day' },
    ],
    note: 'Something up there blinked.',
    par: 3,
    day: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................C...............',
      '...............###..............',
      '..S...........................E.',
      '######.....................#####',
      '######.....................#####',
      '######.....................#####',
      '######.....................#####',
    ],
    night: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '.........###.........###........',
      '######.....................#####',
      '######.....................#####',
      '######.....................#####',
      '######.....................#####',
    ],
    decor: [{ kind: 'eyes', tx: 19, ty: 4 }, { kind: 'eyes', tx: 7, ty: 8 }],
  },
  {
    id: 'inventory',
    name: 'Inventory',
    act: 2,
    props: [
      { kind: 'sign', tx: 4, ty: 11, text: 'STUCK? RESTART.', style: 'paper' },
      { kind: 'memo', tx: 9, ty: 11, text: "Lost: one (1) plank. If found, please return to the pit." },
      { kind: 'noticeBoard', tx: 3, ty: 10 }, { kind: 'footprints', tx: 17, ty: 13 }, { kind: 'footprints', tx: 18, ty: 13 },
    ],
    note: 'Every time you clock in, something gets moved.',
    par: 3,
    day: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '..S...........................E.',
      '#######........#####........####',
      '#######........#####........####',
      '#######........#####........####',
      '#######........#####........####',
    ],
    night: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '####################........####',
      '#######........#####........####',
      '#######........#####........####',
      '#######........#####........####',
    ],
    pranks: [
      {
        id: 'plank',
        onNight: 2,
        tell: { tx: 23, ty: 13, text: 'MINE NOW' },
        set: [
          { layer: 'night', x0: 7, x1: 14, y0: 14, ch: '.' },
          { layer: 'night', x0: 20, x1: 27, y0: 14, ch: '#' },
        ],
      },
    ],
  },
  {
    id: 'watch',
    name: 'Night Watch',
    act: 2,
    props: [
      { kind: 'memo', tx: 5, ty: 11, text: "Reminder: the vents are not a break room." },
      { kind: 'vent', tx: 22, ty: 11 }, { kind: 'mug', tx: 3, ty: 13, layer: 'day' },
    ],
    note: 'Something is in the tunnel. It only moves at night.',
    par: 4,
    day: [
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '..S...###........###.^^^^^....E.',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    night: [
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......##############............',
      '......########################..',
      '................................',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    freaks: [
      { kind: 'lurker', tx: 11, ty: 13, range: 3, speed: 55 },
      { kind: 'peeker', tx: 23, ty: 13, period: 1.6, duty: 0.5 },
      { kind: 'squatter', tx: 29, ty: 13 },
    ],
  },
  {
    id: 'stairs',
    name: 'Under Renovation',
    act: 2,
    note: "They built a staircase. It leads nowhere. They're very proud.",
    par: 2,
    // By day a tower blocks the floor; its top (row 9) is five tiles up, out of reach. At night the tower is
    // missing (renovation) and the freaks' staircase rises in 1-tile steps (4 wide, so every hop has room) to the
    // same height, then stops. Climb at night, jump off the top step toward the tower, clock out mid-air and land
    // on it. The exit is 7 tiles past the top step: a night jump falls short.
    props: [
      { kind: 'memo', tx: 9, ty: 11, text: "Who approved the staircase. — Facilities" },
      { kind: 'noticeBoard', tx: 3, ty: 10, layer: 'day' },
      { kind: 'sign', tx: 21, ty: 7, text: 'OUR STARES!', style: 'note', layer: 'night' },
      { kind: 'barrierTape', tx: 21, ty: 13, w: 2, layer: 'day' },
    ],
    decor: [{ kind: 'eyes', tx: 8, ty: 12 }, { kind: 'eyes', tx: 16, ty: 11 }], // under the stairs
    day: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '...............................E',
      '.........................#######',
      '.........................#######',
      '.........................#######',
      '.........................#######',
      '.S.......................#######',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    night: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '...................#####........',
      '...............#########........',
      '...........#############........',
      '.......#################........',
      '...#####################........',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
  },
  {
    id: 'doors',
    name: 'Lost & Found',
    act: 2,
    note: 'The freaks have stolen every door. Not the keys. The doors.',
    par: 5,
    // Three doors (cols 4, 15, 24; 4 tall) cut the floor into rooms, and the exit ledge is 6 up. Night entry n
    // steals door n from the night and lays it on the pile at the ledge's foot: three doors make two 3-tile
    // rises. So you want the freaks to act: three entries, five clock-ins, one per room, and the rooms say where.
    // Room 2 has lasers by night (cols 8-9) and rebar by day (13-14): clock out before the lasers, back in
    // before the rebar. Room 3's lurker works nights: clock out as you enter it, back in past it. Low beams
    // (their tops out of reach) hang over the hazards and the lurker, so nothing is jumped: spend the clock-ins
    // at the spawn and you meet the lasers at night.
    pranks: [
      { id: 'door1', onNight: 1, tell: { tx: 4, ty: 10 }, sound: 'doorThunk', set: [{ layer: 'night', x0: 4, y0: 10, y1: 13, ch: '.' }, { layer: 'night', x0: 26, x1: 27, y0: 13, ch: '#' }] },
      { id: 'door2', onNight: 2, tell: { tx: 15, ty: 10 }, sound: 'doorThunk', set: [{ layer: 'night', x0: 15, y0: 10, y1: 13, ch: '.' }, { layer: 'night', x0: 26, x1: 27, y0: 12, ch: '#' }] },
      { id: 'door3', onNight: 3, tell: { tx: 24, ty: 10 }, sound: 'doorThunk', set: [{ layer: 'night', x0: 24, y0: 10, y1: 13, ch: '.' }, { layer: 'night', x0: 26, x1: 27, y0: 11, ch: '#' }] },
    ],
    skins: [
      { kind: 'door', tx: 4, ty: 13, h: 4 }, { kind: 'door', tx: 15, ty: 13, h: 4 }, { kind: 'door', tx: 24, ty: 13, h: 4 },
      { kind: 'doorPile', tx: 26, ty: 13, h: 3, layer: 'night' },
    ],
    freaks: [{ kind: 'lurker', tx: 20, ty: 13, range: 1, speed: 40 }],
    props: [
      { kind: 'memo', tx: 10, ty: 11, text: "Doors are now available at Lost & Found. Please take only your own door.", w: 200 },
      { kind: 'noticeBoard', tx: 1, ty: 10, layer: 'day' },
      { kind: 'lostFoundBox', tx: 25, ty: 13 },
      { kind: 'vent', tx: 11, ty: 8, layer: 'night' },
    ],
    day: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '..............................E.',
      '............................####',
      '........##...##....####.....####',
      '....#...##...###...####.#...####',
      '....#...##...###...####.#...####',
      '....#...##...###...####.#...####',
      '.S..#........^^#C.......#...####',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    night: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '............................####',
      '........##...##....####.....####',
      '....#...##...###...####.#...####',
      '....#...##...###...####.#...####',
      '....#...##...###...####.#...####',
      '....#...^^.....#........#...####',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
  },
  {
    id: 'wet',
    name: 'Wet Floor',
    act: 3,
    note: 'Someone waxed the floors. Nobody on the payroll waxes floors.',
    par: 4,
    props: [
      { kind: 'memo', tx: 6, ty: 11, text: "Floors were waxed at 3 AM. We do not employ anyone at 3 AM." },
      { kind: 'wetFloorSign', tx: 5, ty: 13, layer: 'night' },
      { kind: 'footprints', tx: 6, ty: 13, layer: 'night' },
      { kind: 'footprints', tx: 7, ty: 13, layer: 'night' },
    ],
    decor: [{ kind: 'eyes', tx: 3, ty: 8 }, { kind: 'eyes', tx: 6, ty: 5 }],
    // One long night tunnel of `~` (cols 5–31, roofed rows 0–12 cols 8–30): inside a 1-tile
    // tunnel you can't jump, so neither the lasers nor the lurker can be cleared by air.
    // The only brake is shifting to the dry day floor. Day walls at 4 and 13–14 force both
    // night entries; the day pit (cols 19–24) keeps the day route from skipping the lurker.
    // Two checkpoints keep both lessons' deaths cheap: before the lasers, before the lurker.
    day: [
      '....#..........##...............',
      '....#..........##...............',
      '....#..........##...............',
      '....#..........##...............',
      '....#..........##...............',
      '....#..........##...............',
      '....#..........##...............',
      '....#..........##...............',
      '....#..........##...............',
      '....#..........##...............',
      '....#..........##...............',
      '....#..........##...............',
      '....#..........##...............',
      '..S.#.C........##..............E',
      '###################......#######',
      '###################......#######',
      '###################......#######',
      '###################......#######',
    ],
    night: [
      '........#######################.',
      '........#######################.',
      '........#######################.',
      '........#######################.',
      '........#######################.',
      '........#######################.',
      '........#######################.',
      '........#######################.',
      '........#######################.',
      '........#######################.',
      '........#######################.',
      '........#######################.',
      '........#######################.',
      '..........^^........C...........',
      '#####~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '#####~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '#####~~~~~~~~~~~~~~~~~~~~~~~~~~~',
      '#####~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    ],
    freaks: [{ kind: 'lurker', tx: 28, ty: 13, range: 2, speed: 55 }],
  },
  {
    id: 'pillar',
    name: 'Structural Integrity',
    act: 3,
    note: 'They moved a load-bearing pillar. The building is somehow fine.',
    par: 3,
    // One pillar, 4 tall: by day it stays at P0 (col 6) and blocks the floor; by night each entry moves it, to
    // P1 (col 11, a wall on the night floor), P2 (col 20, against the mezzanine: the step between the day crate
    // and the mezzanine top) and P3 (col 13, out of the way). Clock in to pass P0, out to pass P1, climb the
    // day crate, and clock back in mid-jump off it: that's entry 2, and the pillar lands under you. One clock-in
    // too many and it's on P3 when you jump.
    // P0 → P1 → P2 → P3, then around P1, P2, P3 again (for good)
    pranks: relocations('pillar', { start: 6, loop: [11, 20, 13], rect: (col) => ({ x0: col, y0: 10, y1: 13 }), sound: 'pillarScrape' }),
    skins: [
      { kind: 'pillar', tx: 6, ty: 13 },
      { kind: 'pillar', tx: 11, ty: 13, layer: 'night' },
      { kind: 'pillar', tx: 20, ty: 13, layer: 'night' },
      { kind: 'pillar', tx: 13, ty: 13, layer: 'night' },
    ],
    props: [
      { kind: 'memo', tx: 5, ty: 12, text: "Structural survey: fine. Somehow. — Engineering", w: 200 },
      { kind: 'noticeBoard', tx: 2, ty: 10, layer: 'day' },
      { kind: 'sign', tx: 6, ty: 8, text: 'LOAD BEARING', style: 'paper', layer: 'day' },
      { kind: 'pallet', tx: 15, ty: 13, layer: 'day' },
    ],
    day: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '.............................E..',
      '.....................###########',
      '.....................###########',
      '.....................###########',
      '......#..............###########',
      '......#..........##..###########',
      '......#..........##..###########',
      '.S....#..........##..###########',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    night: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '.....................###########',
      '.....................###########',
      '.....................###########',
      '......#..............###########',
      '......#..............###########',
      '......#..............###########',
      '......#..............###########',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
  },
  {
    id: 'supervisor',
    name: 'Night Management',
    act: 3,
    note: 'One of them has a clipboard now. It supervises the others.',
    par: 2,
    props: [
      { kind: 'memo', tx: 6, ty: 12, text: "We did not hire a night supervisor. — HR" },
      { kind: 'sign', tx: 4, ty: 9, text: 'STAFF ONLY', style: 'paper', layer: 'day' },
      { kind: 'vent', tx: 16, ty: 13 },
      { kind: 'footprints', tx: 15, ty: 13 },
    ],
    decor: [{ kind: 'eyes', tx: 4, ty: 7 }, { kind: 'eyes', tx: 27, ty: 6 }],
    // The supervisor sits on a perch mid-screen (the ledge off the left roof) and turns every
    // 2 s: the lurker on the watched side works, the other slacks off frozen. Both crossings
    // are 1-tile night tunnels, so a watched lurker can't be jumped — cross on the slack side.
    // Day walls at 11–12 and 20–21 force night for the crossings; a night wall at 26–27
    // forces day back for the exit. Nooks at the mouths and cols 14–18 are outside every patrol.
    day: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '...........##.###...##..........',
      '...........##.......##..........',
      '...........##.......##..........',
      '..S........##...C...##.......E..',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    night: [
      '........######.....######.......',
      '........######.....######.......',
      '........######.....######.......',
      '........######.....######.......',
      '........######.....######.......',
      '........######.....######.......',
      '........######.....######.......',
      '........######.....######.......',
      '........######.....######.......',
      '........######.....######.......',
      '........#########..######.##....',
      '........######.....######.##....',
      '........######.....######.##....',
      '..........................##....',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    freaks: [
      { kind: 'supervisor', tx: 15, ty: 9, period: 2, startFacing: 'left' },
      { kind: 'lurker', tx: 9, ty: 13, range: 3, speed: 60 },
      { kind: 'lurker', tx: 19, ty: 13, range: 3, speed: 60 },
    ],
  },

  {
    id: 'stacked',
    name: 'Stacked',
    act: 3,
    note: "They've been busy.",
    par: 5,
    props: [
      { kind: 'memo', tx: 4, ty: 11, text: "Whoever keeps drawing circles in chalk on the loading dock: stop.", w: 300 },
      { kind: 'noticeBoard', tx: 2, ty: 10 },
      { kind: 'chalkCircles', tx: 15, ty: 13, layer: 'night' },
      { kind: 'footprints', tx: 16, ty: 13, layer: 'night' },
    ],
    decor: [{ kind: 'eyes', tx: 24, ty: 6 }],
    // Three pranks queued on night entries 1, 2 and 3, all telegraphed from the spawn. Entry 1
    // bridges gap A (cols 6-13) but drops a night gate at col 18; entry 2 lifts the gate but takes
    // the bridge back; entry 3 lays a plank over gap B (cols 23-30). The day wall at col 18 means
    // only the night gets past it. So: cross A on entry 1, clock out and back in on the middle floor
    // (cols 14-17) for entry 2, pass col 18, then out and in again on the landing for entry 3.
    // Clock in at the wrong place and you strand yourself; the pit resets the pranks (checkpoint rule).
    day: [
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..................#.............',
      '..S...............#.C..........E',
      '######........#########........#',
      '######........#########........#',
      '######........#########........#',
      '######........#########........#',
    ],
    night: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '######........#########........#',
      '######........#########........#',
      '######........#########........#',
      '######........#########........#',
    ],
    pranks: [
      {
        id: 'bridgeA',
        onNight: 1,
        tell: { tx: 10, ty: 12 },
        set: [{ layer: 'night', x0: 6, x1: 13, y0: 14, ch: '#' }],
      },
      {
        id: 'gateDown',
        onNight: 1,
        tell: { tx: 18, ty: 9, text: 'DO NOT TUCH' },
        set: [{ layer: 'night', x0: 18, x1: 18, y0: 0, y1: 13, ch: '#' }],
      },
      {
        id: 'gateC',
        onNight: 2,
        tell: { tx: 18, ty: 9, text: 'DO NOT TUCH' },
        set: [
          { layer: 'night', x0: 18, x1: 18, y0: 0, y1: 13, ch: '.' },
          { layer: 'night', x0: 6, x1: 13, y0: 14, ch: '.' },
        ],
      },
      {
        id: 'plankB',
        onNight: 3,
        tell: { tx: 27, ty: 12, text: 'MINE NOW' },
        set: [{ layer: 'night', x0: 23, x1: 30, y0: 14, ch: '#' }],
      },
    ],
  },
  {
    id: 'portrait',
    name: 'Employee of the Month',
    act: 4,
    note: 'They installed a portrait of themselves. It blocks the exit.',
    par: 3,
    // The exit is in a doorway past a ledge 5 up (cols 19-24). At night their portrait (3x2, solid) hangs in the
    // doorway; by day the doorway is clear but you can't get over the ledge. Each night entry rehangs it: high on
    // the wall (P1), then low against the ledge (P2), where its top is the step you were missing (floor → 2 →
    // the ledge, 3 more), then back in the doorway (P3). On entry 2 the doorway is clear too: climb, drop, out.
    // P0 (the doorway) → P1 (high) → P2 (the step) → P0, and around again (for good)
    pranks: relocations('portrait', { start: [26, 12], loop: [[3, 4], [16, 12], [26, 12]], rect: ([x, y]) => ({ x0: x, x1: x + 2, y0: y, y1: y + 1 }) }),
    skins: [
      { kind: 'portrait', tx: 26, ty: 12, layer: 'night' },
      { kind: 'portrait', tx: 3, ty: 4, layer: 'night' },
      { kind: 'portrait', tx: 16, ty: 12, layer: 'night' },
    ],
    props: [
      { kind: 'memo', tx: 3, ty: 11, text: "Employee of the Month: [photo is just eyes]", w: 200 },
      { kind: 'plaque', tx: 13, ty: 10, layer: 'day' },
      { kind: 'noticeBoard', tx: 7, ty: 10, layer: 'day' },
      { kind: 'nail', tx: 26, ty: 12, layer: 'night' }, // where it hangs when it isn't there
      { kind: 'nail', tx: 3, ty: 4, layer: 'night' },
      { kind: 'nail', tx: 16, ty: 12, layer: 'night' },
    ],
    day: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '...................######.......',
      '...................######.......',
      '...................######...####',
      '...................######.......',
      '.S.................######.....E.',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    night: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '...................######.......',
      '...................######.......',
      '...................######...####',
      '...................######.###...',
      '...................######.###...',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
  },
  {
    id: 'daywalker',
    name: 'Broad Daylight',
    act: 4,
    note: 'One of them clocked in for the day shift.',
    par: 5,
    props: [
      { kind: 'memo', tx: 17, ty: 11, text: "Day crew: if you see eyes, no you didn't." },
      { kind: 'sign', tx: 3, ty: 10, text: 'DAY SHIFT', style: 'paper', layer: 'day' },
      { kind: 'footprints', tx: 12, ty: 13, layer: 'day' },
      { kind: 'mug', tx: 4, ty: 13, layer: 'day' },
    ],
    decor: [{ kind: 'eyes', tx: 17, ty: 6 }],
    // Two tunnels, mirror images. First, a day tunnel under a building (cols 7-15, rows 0-12) with the
    // day-walker in it: night gates at cols 6 and 16 only let the day shift in and out, the building
    // above means you can't jump it, and its patrol fills the tunnel. So go night inside: it freezes,
    // you walk through its outline, and come back to day before the far gate. Then `watch`'s
    // tunnel the other way round: day pillars at 19 and 27 force night in and out, the lurker
    // inside forces a day freeze. Checkpoint between the two.
    day: [
      '.......#########...#########....',
      '.......#########...#########....',
      '.......#########...#########....',
      '.......#########...#########....',
      '.......#########...#########....',
      '.......#########...#########....',
      '.......#########...#########....',
      '.......#########...#########....',
      '.......#########...#########....',
      '.......#########...#########....',
      '.......#########...#########....',
      '.......#########...#########....',
      '.......#########...#########....',
      '..S..............C.#.......#..E.',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    night: [
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#..#########....',
      '......#.........#...............',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
    freaks: [
      { kind: 'daywalker', tx: 10, ty: 13, range: 2, speed: 55 },
      { kind: 'lurker', tx: 22, ty: 13, range: 2, speed: 50 },
    ],
  },
  {
    id: 'offset',
    name: 'Floor 3.5',
    act: 4,
    note: "There is no Floor 3 anymore. It's now Floor 3.5.",
    par: 4,
    // The night grid is generated: the day building moved 3 tiles up. Each hop is the same
    // move — jump, and at the apex shift, stepping onto the floor's other-shift copy. The
    // grounded shift is refused (the copy would embed you), so the level teaches the jump.
    offset: { dx: 0, dy: -3 },
    // lasers trace where the day floor continues at night: the copy ends, don't wander off
    nightPatch: [{ x0: 11, x1: 18, y0: 11, ch: '^' }],
    props: [
      { kind: 'memo', tx: 9, ty: 10, text: "The elevator now stops at 3.5. Do not press 3.5." },
      { kind: 'sign', tx: 3, ty: 12, text: '3', style: 'paper', layer: 'day' },
      { kind: 'sign', tx: 12, ty: 4, text: '3.5', style: 'note', layer: 'night' },
    ],
    decor: [{ kind: 'eyes', tx: 21, ty: 15 }],
    day: [
      '................................',
      '......................E.........',
      '...........##############.......',
      '...........##############.......',
      '................................',
      '................................',
      '................................',
      '................................',
      '.......#######..................',
      '.......#######..................',
      '................................',
      '................................',
      '................................',
      '..S.............................',
      '###########.....................',
      '###########.....................',
      '###########.....................',
      '###########.....................',
    ],
  },
  {
    id: 'audit',
    name: 'Night Audit',
    act: 4,
    note: 'Management is doing a walkthrough tonight. So are they.',
    par: 5,
    // Acts 1-4 on one screen, no new rules, a checkpoint after each beat. Every beat is a 1-tile tunnel under
    // a 4-thick roof (its top 5 up, out of reach), so no beat can be jumped or walked over.
    // 1 (act 3, wax): a day wall sends you in at night; under a low roof, rebar by day keeps you on the night's
    //   wax, which won't let you stop before the laser: clock out on the dry stretch (cols 6-8).
    // 2 (act 3, the supervisor): the block is solid by day; at night a tunnel runs through it with a lurker on
    //   each side of the supervisor (who manages every night freak here). Cross each on its slack side.
    // 3 (act 4): the day-walker is frozen while you're on night. Past it, out and back in: that's entry 3,
    //   when they lay the plank over the last pit (a low roof, so no jumping it). Then the lurker under the roof:
    //   it works nights, but it answers to the clipboard too, so clock out or wait until it slacks. Their tell
    //   shows from the spawn, just before the roof.
    pranks: [{ id: 'plank', onNight: 3, tell: { tx: 23, ty: 11, text: 'HEXED. NO TUCH' }, set: [{ layer: 'night', x0: 25, x1: 26, y0: 14, ch: '#' }] }],
    freaks: [
      { kind: 'supervisor', tx: 15, ty: 8, period: 1.6, startFacing: 'right' },
      { kind: 'lurker', tx: 13, ty: 13, range: 1, speed: 40 },
      { kind: 'peeker', tx: 17, ty: 13, period: 1, duty: 0.7 },
      { kind: 'daywalker', tx: 21, ty: 13, range: 1, speed: 50 },
      { kind: 'squatter', tx: 29, ty: 13 },
    ],
    props: [
      { kind: 'memo', tx: 11, ty: 11, text: "Pest control visit cancelled. Pest control would like to not talk about it." },
      { kind: 'sign', tx: 7, ty: 7, text: 'INSPECTION', style: 'paper', layer: 'day' },
      { kind: 'noticeBoard', tx: 21, ty: 10, layer: 'day' },
      { kind: 'mopBucket', tx: 7, ty: 13, layer: 'night' },
      { kind: 'wetFloorSign', tx: 11, ty: 13, layer: 'night' },
    ],
    day: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '....#######.#######.....#######.',
      '...########.#######.....#######.',
      '...########.#######.....#######.',
      '...########.#######.....#######.',
      '.S.#^^....C.#######C...C.......E',
      '#########################..#####',
      '#########################..#####',
      '#########################..#####',
      '#########################..#####',
    ],
    night: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '....#######.#######.....#######.',
      '....#######.#######.....#######.',
      '....#######.#######.....#######.',
      '....#######.#######.....#######.',
      '.........^......................',
      '####~~~~~~###############..#####',
      '#########################..#####',
      '#########################..#####',
      '#########################..#####',
    ],
  },
  {
    id: 'upside',
    name: 'Mind Your Head',
    act: 5,
    note: 'They flipped the night shift. Mind your head.',
    par: 2,
    // The night is this map turned over, gravity included (upsideDown). By day the pit (cols 10-17) is too
    // wide to jump and the walkway (row 6) too high to reach. Clock in under the walkway and you fall up
    // onto it: at night it's row 11, three rows above your head. Cross the pit hanging from it. A wall
    // stands on the walkway (night rows 12-15, deeper than a jump), so clock out past the pit and drop to the
    // floor. The checkpoint hangs from the walkway at night and sits on a shelf by day.
    upsideDown: true,
    props: [
      { kind: 'memo', tx: 24, ty: 13, text: "Ceiling inspection passed. The ceiling is now the floor. — Facilities", layer: 'day' },
      { kind: 'sign', tx: 4, ty: 12, text: 'MIND YOUR HEAD', style: 'note', layer: 'day' },
      { kind: 'noticeBoard', tx: 26, ty: 12, layer: 'day' },
      { kind: 'mug', tx: 13, ty: 12, layer: 'night', flip: true }, // someone's coffee, upside down under the walkway
    ],
    decor: [{ kind: 'eyes', tx: 14, ty: 8 }],
    day: [
      '................................',
      '................................',
      '........................#.......',
      '........................#...####',
      '........................#.......',
      '........................#.......',
      '......####################......',
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '....................C...........',
      '....................#...........',
      '................................',
      '..S...........................E.',
      '##########........##############',
      '##########........##############',
    ],
  },
  {
    id: 'fallup',
    name: 'Falling Up',
    act: 5,
    note: 'The floor is up there now.',
    par: 4,
    // At night the floor's copy is the ceiling (rows 0-3): clock in anywhere and you fall up to it. Walk over the
    // high ledge (row 6, 8 up, out of reach by day) and clock out: you drop onto it. Run off its end into the pit
    // (10 wide, bottomless, too far for a jump off the ledge; a wall under the ledge means you can only come at it
    // from above) and clock in mid-fall:
    // the fall turns round and carries you up and across to the far side's ceiling. Clock out to drop to the exit.
    upsideDown: true,
    // lasers along the underside of the high ledge's night copy: hang there and they get you (otherwise you could
    // walk off its end at night and clock out over the pit, two clock-ins in all)
    // and the exit is shut at night (its cell is solid), so the brake's rise can't sweep you through it: clock out.
    // The wall's night copy runs on down to the grid's edge (col 17, rows 13-17): otherwise a clock-in falling at
    // its foot passed under it on the night side, rose into the pit and clocked out going up, an arc onto the far
    // floor in two clock-ins (found by the full audit's random search).
    nightPatch: [{ x0: 12, x1: 17, y0: 12, ch: '^' }, { x0: 31, y0: 13, ch: '#' }, { x0: 17, y0: 13, y1: 17, ch: '#' }],
    props: [
      { kind: 'memo', tx: 16, ty: 5, text: "Gravity will be restored after the renovation. — Facilities", layer: 'day' },
      { kind: 'sign', tx: 3, ty: 11, text: 'THIS WAY UP', style: 'note', layer: 'day' },
      { kind: 'noticeBoard', tx: 7, ty: 10, layer: 'day' },
      { kind: 'vent', tx: 6, ty: 4, layer: 'night', flip: true }, // under the floor's copy, where you hang
    ],
    decor: [{ kind: 'eyes', tx: 24, ty: 8 }],
    day: [
      '................................',
      '................................',
      '................................',
      '................................',
      '................................',
      '..............C.................',
      '............######..............',
      '.................#..............',
      '.................#..............',
      '.................#..............',
      '.................#..............',
      '.................#..............',
      '.................#..............',
      '.S...............#.............E',
      '##################..........####',
      '##################..........####',
      '##################..........####',
      '##################..........####',
    ],
  },
  {
    id: 'ceiling',
    name: 'Ceiling Walker',
    act: 5,
    note: "Something is walking on the ceiling. It's fine.",
    par: 4,
    // Two 8-tile pits stop the day. By night you hang under the walkway's copy (row 11, one step above the
    // floor), where their plank bridges one of the walkway's two gaps, also 8 tiles: over pit A on the first
    // clock-in, moved over pit B on the second, back on the third, and so on. Clock in to cross pit A; a lurker
    // hangs in a 1-tile tunnel on the night route (solid down to the grid's edge, so no jumping past it): clock
    // out, walk under its outline, clock in past it (entry 2: the plank's over pit B now), cross, and clock out
    // over the exit, which is bricked up by night. Two things the finale asks for start here: the walkway's copy is
    // waxed just before the tunnel, and a clipboard hangs over it, so the lurker slacks whenever it looks away.
    // A day wall (col 29) closes the exit's pocket, so the only way in is hanging from the plank on entry 2.
    upsideDown: true,
    nightPatch: [
      { x0: 5, x1: 12, y0: 11, ch: '#' }, // the plank, over pit A until they move it
      { x0: 13, x1: 14, y0: 11, ch: '~' }, // wax on the walkway's copy: you slide towards the tunnel
      { x0: 29, y0: 4, y1: 11, ch: '.' }, // the exit's day wall isn't there at night: you hang in past it
      { x0: 30, x1: 31, y0: 13, y1: 17, ch: '#' },
    ],
    pranks: relocations('plank', { start: 5, loop: [22, 5], rect: (x0) => ({ x0, x1: x0 + 7, y0: 11 }), first: 2 }),
    freaks: [
      { kind: 'supervisor', tx: 18, ty: 4, period: 2, startFacing: 'left' }, // perched under the floor's copy, well out of the way
      { kind: 'lurker', tx: 16, ty: 12, range: 1, speed: 40 },
    ],
    props: [
      { kind: 'memo', tx: 17, ty: 12, text: "To the night crew: please stop moving the planks. — Management", layer: 'day' },
      { kind: 'sign', tx: 2, ty: 10, text: "IT'S FINE", style: 'note', layer: 'day' },
      { kind: 'noticeBoard', tx: 21, ty: 10, layer: 'day' },
      { kind: 'footprints', tx: 13, ty: 12, layer: 'night', flip: true }, // on the walkway's copy, not the plank
      { kind: 'footprints', tx: 14, ty: 12, layer: 'night', flip: true },
    ],
    decor: [{ kind: 'eyes', tx: 16, ty: 7 }],
    day: [
      '...............####.............',
      '...............####.............',
      '...............####.............',
      '...............####.............',
      '...............####.............',
      '................................',
      '#####........#########.......###',
      '.............................#..',
      '.............................#..',
      '.............................#..',
      '.............................#..',
      '.............................#..',
      '.............................#..',
      '.S.................C.........#.E',
      '#####........#########........##',
      '#####........#########........##',
      '#####........#########........##',
      '#####........#########........##',
    ],
  },
  {
    id: 'heels',
    name: 'Head Over Heels',
    act: 5,
    note: 'Up is a matter of opinion now.',
    par: 7,
    // A loop: right along the bottom, up a shaft, back left along the top. The floor (rows 14-17) and the walkway
    // (row 5) each carry one corridor by day and the other by night: by day you stand on the floor (bottom) or the
    // walkway (top); on the flipped night you hang under the walkway's copy (bottom) or the floor's (top), 4 px from
    // where you stood. A block (cols 13-19) leaves one slot through each corridor, and a day-walker and a lurker
    // share each slot: every clock-in or out freezes the one in your way and wakes the other, so you flip past
    // each in turn, never on top of the one waking up. Bottom: the pit (cols 20-27) is crossed hanging, and at the
    // walkway's gap (col 31) you fall up the shaft. Top: the last gap (cols 2-9, no floor, no walkway) has a
    // ceiling only while their plank is in it. It starts over the pit's copy and moves over the gap on the 4th
    // clock-in, back on the 5th, and so on: arrive with a clock-in to spare and it isn't there yet. A wall (col 9)
    // cuts the spawn off from the last gap, and a low roof (row 12) keeps a jump from clearing the walkway's copy,
    // so the only way to the top corridor is round the loop.
    upsideDown: true,
    nightPatch: [
      { x0: 20, x1: 27, y0: 3, ch: '#' }, // the plank, over the pit's copy until they move it
      { x0: 9, y0: 4, ch: '.' }, // the wall stops at the top corridor: that's the way to the exit
    ],
    pranks: relocations('plank', { start: 20, loop: [2, 20], rect: (x0) => ({ x0, x1: x0 + 7, y0: 3 }), first: 4 }),
    freaks: [
      { kind: 'daywalker', tx: 13, ty: 13, range: 1, speed: 45 },
      { kind: 'lurker', tx: 18, ty: 13, range: 1, speed: 45 },
      { kind: 'daywalker', tx: 18, ty: 4, range: 1, speed: 45 },
      { kind: 'lurker', tx: 13, ty: 4, range: 1, speed: 45 },
    ],
    props: [
      { kind: 'memo', tx: 20, ty: 12, text: "To the day crew: we do not have a night crew. — Night Management", layer: 'day' },
      { kind: 'sign', tx: 24, ty: 9, text: 'HARD HAT AREA', style: 'paper', layer: 'day' },
      { kind: 'noticeBoard', tx: 11, ty: 10, layer: 'day' },
      { kind: 'hardHat', tx: 24, ty: 13, layer: 'night', flip: true },
    ],
    decor: [{ kind: 'eyes', tx: 5, ty: 9 }],
    day: [
      '.........#...#######............',
      '.........#...#######............',
      '.........#...#######............',
      '.........#...#######............',
      '.E.......#.C.................C..',
      '##.......######################.',
      '.........#...#######............',
      '.........#...#######............',
      '.........#...#######............',
      '.........#...#######............',
      '.........#...#######............',
      '.........#...#######............',
      '.........###########............',
      '.........#S.....................',
      '##........##########........####',
      '##........##########........####',
      '##........##########........####',
      '##........##########........####',
    ],
  },
  {
    id: 'clockout',
    name: 'Clock Out',
    act: FINALE_ACT,
    rev: 2, // the rework: bests from the classic Clock Out (CLOCKOUT_CLASSIC, rev 1) don't carry over
    note: "Almost done. Don't look at the vents.",
    par: 7,
    // One room per act, on the flipped map, with one of every freak: the walkway (row 5) is the night's ceiling, one
    // step above the floor, so a shift flips you in place. Room 1 (act 1, cols 0-11): no ceiling over the spawn, so
    // walk off the ledge and clock in as you fall; cross the gap hanging, past a peeker the clipboard has to be
    // looking away from; clock out before the locked gate (night only). Room 2 (act 2, cols 12-21): a day wall; they
    // take the door on the 2nd clock-in; clock out before the squatter, since the far wall is night-only too. Room 3 (act 3, cols 22-26): stop on the dry floor and clock in; the supervisor
    // watches one tunnel at a time, so wait, hanging, until it looks away from this one and slide over the wax
    // past its lurker. Room 4 (acts 4-5, cols 27-31): the 3rd clock-in took the last step at the top of the shaft:
    // clock out short of the day-walker, in again (the 4th puts it back), and fall up to the time clock.
    upsideDown: true,
    // The night's walls are drawn in the day grid's top rows so they mirror into the night's bottom ones: the
    // locked gate (col 11), the door (16), room 2's tunnel floor (16-20) and far wall (21), room 3's tunnel floor
    // (24-26). By day they stand on the walkway and close it off, so it's no road past the rooms.
    nightPatch: [
      { x0: 30, x1: 31, y0: 12, ch: '.' }, // the time clock's pocket is day-only: the shaft is 3 wide at night
      { x0: 30, y0: 13, ch: '.' },
      { x0: 31, y0: 14, ch: '.' },
    ],
    pranks: [
      { id: 'door', onNight: 2, tell: { tx: 16, ty: 11, text: 'FINDERS KEEPERS' }, sound: 'doorThunk', set: [{ layer: 'night', x0: 16, y0: 13, y1: 14, ch: '.' }] },
      // they take the ceiling over the shaft and wall up the time clock, so rising past it on entry 3 touches nothing
      { id: 'stepGone', onNight: 3, tell: { tx: 29, ty: 3 }, set: [{ layer: 'night', x0: 29, x1: 31, y0: 0, y1: 3, ch: '.' }, { layer: 'night', x0: 31, y0: 4, ch: '#' }] },
      // the same spot: its tell stays up after the step goes, so one more clock-in reads as the way back
      { id: 'stepBack', onNight: 4, tell: { tx: 29, ty: 3 }, set: [{ layer: 'night', x0: 29, x1: 31, y0: 0, y1: 3, ch: '#' }, { layer: 'night', x0: 31, y0: 4, ch: '.' }] },
    ],
    skins: [{ kind: 'door', tx: 16, ty: 14, layer: 'night' }], // Lost & Found's door, in the tunnel's mouth
    freaks: [
      { kind: 'peeker', tx: 6, ty: 13, period: 1.2, duty: 0.6 },
      { kind: 'squatter', tx: 19, ty: 13 },
      { kind: 'supervisor', tx: 23, ty: 4, period: 2, startFacing: 'left' }, // perched under the floor's copy, over its room
      { kind: 'lurker', tx: 25, ty: 13, range: 1, speed: 45 },
      { kind: 'daywalker', tx: 30, ty: 13, range: 1, speed: 45 },
    ],
    props: [
      { kind: 'memo', tx: 10, ty: 12, w: 160, text: "Overtime is mandatory. So are the freaks, apparently.", layer: 'day' },
      { kind: 'sign', tx: 4, ty: 9, text: 'LAST SHIFT', style: 'paper', layer: 'day' },
      { kind: 'coatRack', tx: 12, ty: 13, layer: 'day' },
      { kind: 'vent', tx: 20, ty: 8, layer: 'day' },
      { kind: 'vent', tx: 19, ty: 4, layer: 'night', flip: true }, // the note's warning, with eyes in it
      { kind: 'timeClock', tx: 29, ty: 4, layer: 'day' },
      { kind: 'timeClock', tx: 28, ty: 4, layer: 'night', flip: true }, // under the ceiling they leave alone
    ],
    decor: [{ kind: 'eyes', tx: 5, ty: 7 }, { kind: 'eyes', tx: 13, ty: 6 }, { kind: 'eyes', tx: 19, ty: 4 }, { kind: 'eyes', tx: 27, ty: 7 }],
    day: [
      '...........#....######..###.....',
      '...........#....######..###.....',
      '...........#....######..###.....',
      '...........#....######..###....#',
      '...........#....#....#........#E',
      '..######################~~~##.##',
      '................................',
      '................................',
      '................................',
      '................................',
      '...............#........#.......',
      '...............#........#.......',
      '...............#........#.......',
      '.S...........C.#......C.#..C....',
      '##.......################..#####',
      '##.......################..#####',
      '##.......################..#####',
      '##.......################..#####',
    ],
  },
];
