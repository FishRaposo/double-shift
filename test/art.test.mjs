// Pixel font and sprite data: every asset well-formed, every character the game prints has a glyph.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GLYPHS, ROWS, CAP, measureArt, hasGlyph } from '../src/font.js';
import { SPRITES, workerFrame, ART } from '../src/sprites.js';
import { PARAMS, FREAK } from '../src/rules.js';
import { LEVELS, ACTS } from '../src/levels.js';
import { CREDITS } from '../src/copy.js';

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
  for (const f of ['src/main.js', 'src/art.js', 'src/copy.js']) {
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
