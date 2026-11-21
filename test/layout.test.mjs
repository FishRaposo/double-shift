// Shell logic that would otherwise hide in the browser-only main.js: level addressing and screen layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, ACTS, FINALE_ACT } from '../src/levels.js';
import {
  placeTag, hudFloor, HUD_BOTTOM, levelIndex, actRows, cardRect, tabRect, detailRect, moveSelect, actLabel, endSummary, selectClick, canvasScale, frameDeltas, SIM_MAX, CARD, TAB, SELECT_BOUNDS,
  memoPanel, memoNear, MEMO, quitPress, quitArmed, QUIT_CONFIRM, volumeAt, stuckHint, STUCK_DEATHS,
} from '../src/layout.js';
import { wrapText, measureText } from '../src/font.js';

test('frameDeltas: a slow frame is honest interface time but a clamped simulation step', () => {
  // The act card shows for 1.6 s of real time: at 5 FPS one frame is 0.2 s of wall time, and the card must count
  // all of it, or every menu timer runs at half speed on a slow machine (opengame-front-end, interface time).
  const slow = frameDeltas(0.2);
  assert.equal(slow.wall, 0.2, 'the interface sees the real frame time');
  assert.equal(slow.sim, SIM_MAX, 'the simulation is clamped to one catch-up');
  const fast = frameDeltas(1 / 60);
  assert.equal(fast.wall, fast.sim, 'at a normal frame rate the two agree, so the GIF and tests are unchanged');
  assert.deepEqual(frameDeltas(-5), { wall: 0, sim: 0 }, 'a clock that went backwards is no time at all');
  assert.deepEqual(frameDeltas(NaN), { wall: 0, sim: 0 });
});

test('levelIndex: ids, numbers, junk', () => {
  assert.equal(levelIndex(LEVELS, 'offset'), LEVELS.findIndex((l) => l.id === 'offset'));
  assert.equal(levelIndex(LEVELS, '3'), 2);
  assert.equal(levelIndex(LEVELS, '99'), LEVELS.length - 1, 'numbers past the end clamp to the last level');
  assert.equal(levelIndex(LEVELS, '0'), 0, 'numbers before the start clamp to the first level');
  assert.equal(levelIndex(LEVELS, 'nope'), 0);
  assert.equal(levelIndex(LEVELS, null), 0);
  assert.equal(levelIndex(LEVELS, ''), 0, '?level= with nothing after it');
  assert.equal(levelIndex(LEVELS, '-4'), 0);
  assert.equal(levelIndex(LEVELS, '2.9'), 1, 'a fraction reads as its whole part');
  assert.equal(levelIndex(LEVELS, 'NaN'), 0);
});

// The finished game: five acts of four plus the finale, with its longest planned names (docs/LEVELS.md §5.0).
const PLANNED_NAMES = ['Under Renovation', 'Lost & Found', 'Structural Integrity', 'Employee of the Month', 'Night Audit',
  'Mind Your Head', 'Falling Up', 'Ceiling Walker', 'Head Over Heels', 'Clock Out'];
const FULL_GAME = [4, 4, 4, 4, 4, 1].flatMap((n, a) => Array.from({ length: n }, (_, k) => ({
  id: `a${a + 1}l${k}`, name: 'Employee of the Month', act: a + 1, par: 3,
})));

const inside = (r) => r.x >= 0 && r.x + r.w <= 960 && r.y >= SELECT_BOUNDS.top && r.y + r.h <= SELECT_BOUNDS.bottom;
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const allRects = (defs) => [
  ...defs.map((_, i) => cardRect(defs, i)),
  ...actRows(defs).map((_, row) => tabRect(defs, row)),
  detailRect,
];

test('layout: every card, tab and the detail bar sit inside 960×(60..510)', () => {
  assert.equal(SELECT_BOUNDS.top, 60);
  assert.equal(SELECT_BOUNDS.bottom, 510);
  for (const defs of [LEVELS, FULL_GAME]) {
    for (const r of allRects(defs)) assert.ok(inside(r), `off the select area: ${JSON.stringify(r)}`);
  }
});

test('layout: nothing overlaps', () => {
  for (const defs of [LEVELS, FULL_GAME]) {
    const rs = allRects(defs);
    for (let i = 0; i < rs.length; i++) {
      for (let j = i + 1; j < rs.length; j++) assert.ok(!overlap(rs[i], rs[j]), `${JSON.stringify(rs[i])} overlaps ${JSON.stringify(rs[j])}`);
    }
  }
});

test('layout: every level name wraps to ≤ 2 lines at scale 1 inside its card', () => {
  const inner = CARD.w - 2 * CARD.pad;
  for (const name of [...LEVELS.map((l) => l.name), ...PLANNED_NAMES]) {
    const lines = wrapText(`${name}`.toUpperCase(), inner, 1);
    assert.ok(lines.length <= 2, `${name}: ${lines.length} lines`);
    for (const l of lines) assert.ok(measureText(l, 1) <= inner, `${name}: "${l}" is wider than the card`);
  }
});

test('layout: every act name wraps to ≤ 2 lines at scale 1 inside its tab', () => {
  const inner = TAB.w - 2 * CARD.pad;
  for (const name of [...Object.values(ACTS), 'Upside Down']) {
    const lines = wrapText(name.toUpperCase(), inner, 1);
    assert.ok(lines.length <= 2 && lines.every((l) => measureText(l, 1) <= inner), `${name}: ${JSON.stringify(lines)}`);
  }
});

test('layout: moveSelect clamps', () => {
  const rows = actRows(LEVELS);
  assert.equal(moveSelect(LEVELS, 0, -1, 0), 0, 'left at the start of a row stays');
  assert.equal(moveSelect(LEVELS, 0, 0, -1), 0, 'up from the top row stays');
  assert.equal(moveSelect(LEVELS, 0, 1, 0), 1, 'right moves along the row');
  const last = LEVELS.length - 1;
  assert.equal(moveSelect(LEVELS, last, 0, 1), last, 'down from the bottom row stays');
  assert.equal(moveSelect(LEVELS, rows[0][3], 0, 1), rows[1][rows[1].length - 1], 'down into a shorter row clamps the column');
});

test('layout: a click on a card picks it; on the detail bar, the selection; tabs and gaps do nothing; outside goes back', () => {
  const c = cardRect(LEVELS, 5);
  assert.deepEqual(selectClick(LEVELS, c.x + 5, c.y + 5), { kind: 'card', index: 5 });
  assert.deepEqual(selectClick(LEVELS, detailRect.x + 50, detailRect.y + 10), { kind: 'detail' });
  const t = tabRect(LEVELS, 1);
  assert.deepEqual(selectClick(LEVELS, t.x + 10, t.y + 10), { kind: 'none' }, 'an act tab');
  assert.deepEqual(selectClick(LEVELS, c.x + c.w + CARD.gap / 2, c.y + 10), { kind: 'none' }, 'the gap between two cards');
  assert.deepEqual(selectClick(LEVELS, 480, 20), { kind: 'back' }, 'the header');
  assert.deepEqual(selectClick(LEVELS, 480, 525), { kind: 'back' }, 'the key hints');
});

test('layout: actLabel names acts and the finale', () => {
  assert.equal(actLabel(1), 'ACT 1 · RENOVATION');
  assert.equal(actLabel(3), 'ACT 3 · GRAVEYARD SHIFT');
  assert.equal(actLabel(FINALE_ACT), 'FINALE');
});

test('layout: endSummary sums per act and marks unplayed acts', () => {
  const results = [];
  results[0] = { shifts: 2, par: 2, deaths: 0, time: 3 };
  results[1] = { shifts: 3, par: 1, deaths: 1, time: 5 };
  const wet = LEVELS.findIndex((l) => l.id === 'wet');
  results[wet] = { shifts: 5, par: 4, deaths: 0, time: 9 };
  const s = endSummary(LEVELS, results);
  assert.deepEqual(s.rows.map((r) => r.act), [...new Set(LEVELS.map((l) => l.act))]);
  assert.deepEqual(s.rows[0], { act: 1, label: 'ACT 1 · RENOVATION', shifts: 5, par: 3, played: 2 });
  assert.equal(s.rows[1].played, 0, 'act 2 not played');
  assert.equal(s.rows[2].shifts, 5);
  assert.equal(s.shifts, 10);
  assert.equal(s.par, 7);
});

test('canvasScale: whole device pixels per canvas pixel unless that wastes > 15% of the window', () => {
  const close = (a, b, what) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a} ≠ ${b}`);
  assert.equal(canvasScale(960, 540), 1, 'the itch embed');
  assert.equal(canvasScale(960, 540, 2), 1, 'the itch embed on a Retina screen: 2 device px each');
  assert.equal(canvasScale(1920, 1080), 2);
  assert.equal(canvasScale(3840, 2160), 4);
  close(canvasScale(1000, 562), 1, '1.04×: 1× wastes 4%');
  close(canvasScale(2560, 1440), 1440 / 540, '2.67×: 2× would waste 25%, so fit');
  close(canvasScale(1366, 768), 768 / 540, '1.42×: 1× would waste 30%, so fit');
  close(canvasScale(800, 600), 800 / 960, 'a small window shrinks to fit');
  // fractional device pixel ratios: the whole step is counted in device pixels, not CSS pixels
  close(canvasScale(3072, 1728, 1.25), 4 / 1.25, '4K at 125%: 4 device px per canvas px');
  close(canvasScale(1440, 900, 2), 1.5, 'a 1440×900 Retina window: 3 device px');
  close(canvasScale(1280, 720, 1.5), 2 / 1.5, '1080p at 150%: 2 device px');
  for (const [w, h, dpr] of [[1920, 1080, 1], [3072, 1728, 1.25], [1440, 900, 2], [1280, 720, 1.5], [1512, 982, 2]]) {
    const dev = canvasScale(w, h, dpr) * dpr;
    assert.ok(Math.abs(dev - Math.round(dev)) < 1e-9, `${w}×${h} @${dpr}: ${dev} device px per canvas px`);
  }
});

test('wrapText keeps every line within maxPx', () => {
  const text = 'Break room: all snacks have been taken. The wrappers have been arranged in a circle. With candles.';
  for (const [maxPx, scale] of [[360, 2], [180, 1], [120, 2]]) {
    const lines = wrapText(text, maxPx, scale);
    assert.ok(lines.length > 1, 'long text wraps');
    for (const l of lines) assert.ok(measureText(l, scale) <= maxPx, `"${l}" > ${maxPx}px at scale ${scale}`);
    assert.equal(lines.join(' '), text, 'no words lost or reordered');
  }
  assert.deepEqual(wrapText('', 100, 2), []);
  assert.deepEqual(wrapText('Short', 100, 2), ['Short']);
});

test('the title screen fits its panel and never overlaps the footnote', () => {
  // These were both overflows found by opening a capture (opengame-front-end: "No text is cut, overlapped or off
  // screen at any size"). The panel is 580 px wide; every line inside it must fit, and the sticky note must end
  // above the Sticky Keys line, at the largest bindings the game can hold.
  const PANEL_W = 580;
  const lines = [
    ['One building. Two shifts. One worker.', 2],
    ['Move  ←/A  →/D      Jump  Space/W/↑', 2], // the widest default: both arrows and both letters for a direction
    ['Change shift  Shift or K      Restart  R', 2],
    ['Gamepad: stick move · A jump · B, X or RB shift · Start pause · X levels · Y settings', 1],
    ['This game needs a keyboard or a gamepad.', 2],
    ['Open it on a computer to clock in.', 2],
    ['No sound? Press any key or click once.', 1],
  ];
  for (const [text, scale] of lines) assert.ok(measureText(text, scale) <= PANEL_W, `"${text}" at scale ${scale}: ${measureText(text, scale)} > ${PANEL_W}`);
  // the bottom strip: the note sits at H-56 (its art is ~20 px tall at scale 1) and the footnote baseline at H-8
  const NOTE_Y = 540 - 56;
  const FOOT_Y = 540 - 8;
  assert.ok(NOTE_Y + 24 < FOOT_Y, `the note (${NOTE_Y}+24) must end above the footnote (${FOOT_Y})`);
});

test('memos: every level has one, and its panel wraps within 360 px, on screen and below the HUD', () => {
  for (const def of LEVELS) {
    const memos = (def.props ?? []).filter((p) => p.kind === 'memo');
    assert.equal(memos.length, 1, `${def.id}: one memo`);
    const m = memos[0];
    assert.ok(m.text, `${def.id}: the memo says something`);
    const p = memoPanel(m.text, m.tx, m.ty, { maxW: m.w });
    assert.ok(p.w <= MEMO.maxW, `${def.id}: ${p.w} px wide`);
    assert.ok(p.x >= 0 && p.x + p.w <= 960 && p.y >= MEMO.top && p.y + p.h <= 540, `${def.id}: panel ${JSON.stringify(p)}`);
    for (const line of p.lines) assert.ok(measureText(line, MEMO.scale) <= p.w - 2 * MEMO.pad, `${def.id}: "${line}"`);
  }
});

test('memos: the panel shows while the worker is within 2 tiles of the memo', () => {
  const m = { tx: 10, ty: 12 };
  const at = (tx, ty) => ({ x: tx * 30 + 6, y: ty * 30 + 4 });
  assert.equal(memoNear(at(10, 12), m), true);
  assert.equal(memoNear(at(12, 13), m), true);
  assert.equal(memoNear(at(8, 10), m), true);
  assert.equal(memoNear(at(13, 12), m), false);
  assert.equal(memoNear(at(10, 15), m), false);
});

test('endSummary: the run time sums the levels played (the speedrun timer)', () => {
  const results = [];
  results[0] = { shifts: 2, par: 2, deaths: 0, time: 3.5 };
  results[4] = { shifts: 3, par: 3, deaths: 1, time: 10.25 };
  assert.equal(endSummary(LEVELS, results).time, 13.75);
  assert.equal(endSummary(LEVELS, []).time, 0);
});

test('endSummary: the run total counts every second played, abandoned attempts and levels included', () => {
  const results = [{ shifts: 2, par: 2, time: 3 }];
  assert.equal(endSummary(LEVELS, results, [10, 60]).time, 70);
  assert.equal(endSummary(LEVELS, results).time, 3, 'no timing kept: the clearing runs');
});

test('job tags: on screen, clear of the HUD, and never on each other', () => {
  const box = { right: 430, bottom: 90 };
  assert.equal(hudFloor(box, 100), 90);
  assert.equal(hudFloor(box, 500), HUD_BOTTOM);
  const placed = [];
  const a = placeTag(placed, box, 160, 345, 20, 960);
  assert.equal(a.y, 104, 'its left edge is under the work order, though its centre is not far from it');
  const b = placeTag(placed, box, 160, 345, 20, 960);
  assert.equal(b.y, 132, 'with no room above, the next one stacks downwards');
  const c = placeTag(placed, box, 160, 345, 300, 960);
  const d = placeTag(placed, box, 160, 345, 300, 960);
  assert.deepEqual([c.y, d.y], [300, 272]);
  assert.equal(placeTag([], box, 200, 950, 200, 960).x, 850, 'kept on screen');
});

test('job tags: a tell or the exit in the way is stepped round sideways, and only a tag in the way stacks', () => {
  const box = { right: 0, bottom: 0 };
  const tell = { x: 285, y: 368, half: 98, fixed: true }; // a tell's sticky note
  const a = placeTag([tell], box, 80, 380, 376, 960);
  assert.equal(a.y, 376, 'it stays at its thing\'s height');
  assert.ok(Math.abs(a.x - 380) <= 90 && Math.abs(a.x - tell.x) >= tell.half + 50, 'beside the note, not on it');
  const wall = [{ x: 380, y: 376, half: 400, fixed: true }]; // nothing within reach sideways
  assert.notEqual(placeTag(wall, box, 80, 380, 376, 960).y, 376, 'then it stacks as before');
});

test('quitPress: leaving a break for the title takes a second press within two seconds', () => {
  const first = quitPress(null, 10);
  assert.deepEqual(first, { quit: false, armedAt: 10 }, 'the first press only arms');
  assert.equal(quitArmed(first.armedAt, 10.5), true, 'the row reads "title? again" meanwhile');
  assert.deepEqual(quitPress(first.armedAt, 11.5), { quit: true, armedAt: null }, 'a second press inside the window quits');
  assert.equal(quitArmed(first.armedAt, 10 + QUIT_CONFIRM + 0.01), false, 'time passing disarms');
  assert.deepEqual(quitPress(first.armedAt, 13), { quit: false, armedAt: 13 }, 'a late press arms afresh, it does not quit');
  assert.equal(quitArmed(null, 5), false, 'disarmed (any other key, leaving the break) is never armed');
  assert.deepEqual(quitPress(null, 0), { quit: false, armedAt: 0 }, 'a clock reading of 0 is still a reading');
});

test('volumeAt: a click picks the segment under it, and left of the first segment is 0', () => {
  const x0 = 250; // segments span x0 + 18 * i .. + 7
  assert.equal(volumeAt(x0 + 3.5 + 18 * 4, x0), 0.5, 'the middle of the fifth segment');
  assert.equal(volumeAt(x0 + 18 * 9 + 3.5, x0), 1, 'the last segment');
  assert.equal(volumeAt(x0 + 500, x0), 1, 'past the bar is full, not out of range');
  assert.equal(volumeAt(x0 + 3.5 + 1, x0), 0.1, 'the right half of the first segment is 10%');
  assert.equal(volumeAt(x0 + 2, x0), 0, 'the left half of the first segment is 0');
  assert.equal(volumeAt(x0 - 20, x0), 0, 'left of the bar is 0');
  for (let x = x0 - 30; x < x0 + 200; x += 0.5) {
    const v = volumeAt(x, x0);
    assert.ok(v >= 0 && v <= 1 && Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, `${x} -> ${v}`);
  }
});

test('stuckHint: the hint shows on the third fruitless death, and not before', () => {
  let t = null;
  let r = stuckHint(t, { deaths: 0, progress: ['cp:a'] });
  assert.equal(r.show, false);
  t = r.tracker;
  for (let d = 1; d <= STUCK_DEATHS; d++) {
    r = stuckHint(t, { deaths: d, progress: ['cp:a'] });
    t = r.tracker;
    assert.equal(r.show, d >= STUCK_DEATHS, `death ${d}`);
  }
  r = stuckHint(t, { deaths: STUCK_DEATHS, progress: ['cp:a'] });
  assert.equal(r.show, true, 'it stays up while nothing changes');
});

test('stuckHint: progress clears it and restarts the count; tokens a death rolls back are not progress', () => {
  let t = stuckHint(null, { deaths: 0, progress: ['r0:tool'] }).tracker;
  let r;
  for (let d = 1; d <= 3; d++) { r = stuckHint(t, { deaths: d, progress: ['r0:tool'] }); t = r.tracker; }
  assert.equal(r.show, true);
  r = stuckHint(t, { deaths: 3, progress: ['r0:tool', 'r0:done'] });
  assert.equal(r.show, false, 'a new repair step is progress');
  t = r.tracker;
  r = stuckHint(t, { deaths: 4, progress: [] }); // the death put the repairs back to the checkpoint's
  t = r.tracker;
  r = stuckHint(t, { deaths: 4, progress: ['r0:tool', 'r0:done'] });
  assert.equal(r.show, false);
  assert.equal(r.tracker.fruitless, 1, 'redoing a step already made is not progress');
  r = stuckHint(r.tracker, { deaths: 5, progress: ['cp:b'] });
  assert.equal(r.tracker.fruitless, 0, 'a new checkpoint is progress');
  r = stuckHint(r.tracker, { deaths: 5, progress: ['cp:b', 'win'] });
  assert.equal(r.tracker.fruitless, 0, 'a win is progress');
});

test('stuckHint: a restart (a null tracker) clears it', () => {
  let t = stuckHint(null, { deaths: 0, progress: [] }).tracker;
  let r;
  for (let d = 1; d <= 4; d++) { r = stuckHint(t, { deaths: d, progress: [] }); t = r.tracker; }
  assert.equal(r.show, true);
  r = stuckHint(null, { deaths: 0, progress: [] });
  assert.equal(r.show, false);
  assert.equal(stuckHint(r.tracker, { deaths: 2, progress: [] }).show, false, 'two deaths after the restart is still quiet');
});
