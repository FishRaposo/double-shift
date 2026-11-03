// Pixel font and sprite data: every asset well-formed, every character the game prints has a glyph.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLYPHS, ROWS, CAP, measureArt, hasGlyph } from '../src/font.js';
import { SPRITES, workerFrame, ART } from '../src/sprites.js';
import { PARAMS, FREAK } from '../src/rules.js';
import { LEVELS, ACTS } from '../src/levels.js';
import { CREDITS } from '../src/copy.js';
import { exitRects, checkpointRect, shouldHatch, DAY, NIGHT } from '../src/art.js';
import { parseLevel } from '../src/rules.js';

const FREAK_KINDS = ['lurker', 'peeker', 'squatter', 'supervisor', 'daywalker'];
const mask = (kind) => SPRITES[kind].frames.a.map((row) => [...row].map((c) => c !== '.'));

test('freaks: every kind has a distinct silhouette (≥ 12 art px apart, pairwise)', () => {
  // the frozen outline is the silhouette, so a frozen freak must still say which kind it is
  for (let i = 0; i < FREAK_KINDS.length; i++) {
    for (let j = i + 1; j < FREAK_KINDS.length; j++) {
      const a = mask(FREAK_KINDS[i]);
      const b = mask(FREAK_KINDS[j]);
      let diff = 0;
      a.forEach((row, y) => row.forEach((v, x) => { if (v !== b[y][x]) diff++; }));
      assert.ok(diff >= 12, `${FREAK_KINDS[i]} vs ${FREAK_KINDS[j]}: only ${diff} art px differ`);
    }
  }
});

test('freaks: the silhouette fills ≥ 75% of the hitbox, so a touch looks like a touch', () => {
  for (const kind of FREAK_KINDS) {
    const [ax, ay] = SPRITES[kind].anchor;
    const m = mask(kind);
    let filled = 0;
    for (let y = ay; y < ay + 11; y++) for (let x = ax; x < ax + 10; x++) if (m[y][x]) filled++;
    assert.ok(filled >= 0.75 * 110, `${kind}: ${filled}/110 hitbox art px filled`);
  }
});

test('checkpoint and exit draw inside the screen for any cell', () => {
  const inside = (r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= 960 && r.y + r.h <= 540;
  for (let tx = 0; tx < 32; tx++) {
    for (let ty = 1; ty < 18; ty++) {
      const e = exitRects(tx, ty);
      assert.ok(inside(e.door) && inside(e.sign), `exit at ${tx},${ty}: ${JSON.stringify(e)}`);
      assert.ok(inside(checkpointRect(tx, ty)), `checkpoint at ${tx},${ty}: ${JSON.stringify(checkpointRect(tx, ty))}`);
    }
  }
});

test('hatch: only the rim of a one-shift region, never along the screen edge, and none when the night is generated', () => {
  const day = ['........', '.####...', '.####...', '.####...', 'S......E', '########'];
  const night = ['........', '........', '........', '........', '........', '########'];
  const lvl = parseLevel({ name: 't', par: 0, day, night });
  assert.equal(shouldHatch(lvl, DAY, {}, 1, 1), true, 'corner of the day-only block');
  assert.equal(shouldHatch(lvl, DAY, {}, 2, 2), false, 'the middle of the block (all four neighbours are block)');
  assert.equal(shouldHatch(lvl, DAY, {}, 2, 3), true, 'its bottom row (open air below)');
  assert.equal(shouldHatch(lvl, DAY, {}, 0, 5), false, 'floor in both shifts');
  const wide = parseLevel({ name: 't', par: 0, day: ['S......E', '######..', '######..', '######..', '######..'], night: ['........', '........', '........', '........', '........'] });
  assert.equal(shouldHatch(wide, DAY, {}, 2, 2), false, 'interior of a big day-only block: no hatch');
  assert.equal(shouldHatch(wide, DAY, {}, 0, 3), false, 'along the screen edge: no hatch');
  assert.equal(shouldHatch(wide, DAY, {}, 5, 2), true, 'its open side: hatched');
  const offset = parseLevel({ name: 't', par: 0, day: ['S......E', '####....', '####....'], offset: { dx: 3, dy: 0 } });
  for (let x = 0; x < 8; x++) for (let y = 0; y < 3; y++) assert.equal(shouldHatch(offset, DAY, {}, x, y), false, `offset level ${x},${y}`);
});

test('every glyph is a rectangle of # and . no taller than 9 rows', () => {
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    assert.ok(rows.length >= CAP && rows.length <= ROWS, `${ch}: ${rows.length} rows`);
    const w = rows[0].length;
    for (const r of rows) {
      assert.equal(r.length, w, `${JSON.stringify(ch)}: ragged rows`);
      assert.match(r, /^[#.]+$/, `${JSON.stringify(ch)}: only # and .`);
    }
  }
  assert.equal(measureArt('A'), 5);
  assert.equal(measureArt('AA'), 11, 'one art pixel between glyphs');
});

// Every string literal in the game's screens and copy (credits, act lines, timecard comments), plus level
// names, notes and act names.
function gameStrings() {
  const out = [];
  for (const f of ['src/main.js', 'src/art.js', 'src/copy.js', 'src/layout.js']) {
    let src = '';
    try { src = readFileSync(f, 'utf8'); } catch { continue; }
    src = src.replace(/^\s*\/\/.*$/gm, '');
    for (const m of src.matchAll(/'((?:[^'\\\n]|\\.)*)'/g)) out.push(m[1]);
    for (const m of src.matchAll(/`([^`]*)`/g)) out.push(m[1].replace(/\$\{[^}]*\}/g, ''));
  }
  for (const l of LEVELS) out.push(l.name, l.note ?? '', l.name.toUpperCase());
  out.push(...Object.values(ACTS), ...Object.values(ACTS).map((a) => a.toUpperCase()));
  return out;
}

test('the credits read exactly as decided (WRITING.md §8)', () => {
  assert.deepEqual(CREDITS, [
    'Designed by Vinícius Raposo.',
    'Built with AI assistance (Claude).',
    'Made for GitHub Game Off 2026.',
  ]);
});

test('every character the game prints has a glyph', () => {
  const missing = new Set();
  for (const s of gameStrings()) for (const ch of s) if (!hasGlyph(ch) && ch >= ' ') missing.add(ch);
  assert.deepEqual([...missing], []);
});

test('every sprite frame is a rectangle using only its palette', () => {
  for (const [name, s] of Object.entries(SPRITES)) {
    const sizes = new Set();
    for (const [frame, rows] of Object.entries(s.frames)) {
      const w = rows[0].length;
      sizes.add(`${w}x${rows.length}`);
      for (const r of rows) {
        assert.equal(r.length, w, `${name}.${frame}: ragged rows`);
        for (const ch of r) if (ch !== '.') assert.ok(ch in s.palette, `${name}.${frame}: '${ch}' not in palette`);
      }
    }
    assert.equal(sizes.size, 1, `${name}: all frames share a size`);
  }
});

test('sprites fit their hitboxes: worker 9×13, freaks 10×11 art pixels inside the frame', () => {
  const box = (name, w, h) => {
    const s = SPRITES[name];
    const rows = Object.values(s.frames)[0];
    const [ax, ay] = s.anchor;
    assert.ok(rows[0].length >= ax + w && rows.length >= ay + h, `${name}: frame holds the hitbox`);
  };
  assert.equal(PARAMS.playerW, 9 * ART);
  assert.equal(PARAMS.playerH, 13 * ART);
  box('worker', 9, 13);
  assert.equal(FREAK.w, 10 * ART);
  assert.equal(FREAK.h, 11 * ART);
  for (const f of ['lurker', 'peeker', 'squatter', 'supervisor', 'daywalker']) box(f, 10, 11);
  const nightKeys = Object.keys(SPRITES.worker.nightPalette).sort();
  assert.deepEqual(nightKeys, Object.keys(SPRITES.worker.palette).sort(), 'night palette covers the same keys');
});

test('worker frame follows the player state', () => {
  const p = (o) => ({ grounded: true, vx: 0, vy: 0, ...o });
  assert.equal(workerFrame(p({ grounded: false, vy: -300 }), 0), 'jump');
  assert.equal(workerFrame(p({ grounded: false, vy: 200 }), 0), 'fall');
  assert.equal(workerFrame(p({}), 0, { land: 0.05 }), 'land');
  assert.match(workerFrame(p({ vx: 270 }), 0.3), /^run[0-3]$/);
  assert.match(workerFrame(p({}), 0), /^idle[01]$/);
  const runs = new Set([0, 0.09, 0.17, 0.26].map((t) => workerFrame(p({ vx: -270 }), t)));
  assert.equal(runs.size, 4, 'the run cycles through 4 frames');
  for (const f of ['jump', 'fall', 'land', 'run0', 'run1', 'run2', 'run3', 'idle0', 'idle1', 'spookBody', 'boots']) {
    assert.ok(f in SPRITES.worker.frames, `worker has frame ${f}`);
  }
});
