import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/input.js';
import { DEFAULT_BINDS, rebind } from '../src/keys.js';

const down = (code, repeat = false) => ({ code, repeat });

test('S-05: holding Shift produces exactly one shift attempt; OS key-repeat is ignored', () => {
  const inp = createInput();
  inp.keyDown(down('ShiftLeft'));
  for (let i = 0; i < 10; i++) inp.keyDown(down('ShiftLeft', true));
  const frames = Array.from({ length: 5 }, () => inp.consume());
  assert.equal(frames.filter((f) => f.shiftPressed).length, 1);
});

test('two presses between physics ticks are queued, not dropped', () => {
  const inp = createInput();
  inp.keyDown(down('ShiftLeft'));
  inp.keyUp(down('ShiftLeft'));
  inp.keyDown(down('ShiftLeft'));
  inp.keyUp(down('ShiftLeft'));
  assert.equal(inp.consume().shiftPressed, true);
  assert.equal(inp.consume().shiftPressed, true);
  assert.equal(inp.consume().shiftPressed, false);
});

test('K and right Shift are shift binds too', () => {
  const inp = createInput();
  inp.keyDown(down('KeyK'));
  inp.keyDown(down('ShiftRight'));
  assert.equal(inp.consume().shiftPressed, true);
  assert.equal(inp.consume().shiftPressed, true);
});

test('a jump tap shorter than a tick still counts as held for its frame (no instant jump cut)', () => {
  const inp = createInput();
  inp.keyDown(down('Space'));
  inp.keyUp(down('Space'));
  const f = inp.consume();
  assert.equal(f.jumpPressed, true);
  assert.equal(f.jumpHeld, true);
});

test('held movement keys report while held', () => {
  const inp = createInput();
  inp.keyDown(down('ArrowRight'));
  assert.equal(inp.consume().right, true);
  inp.keyUp(down('ArrowRight'));
  assert.equal(inp.consume().right, false);
});

test('a key held through a screen change (input cleared) comes back on its next OS repeat, with no new press', () => {
  const inp = createInput();
  inp.keyDown(down('ArrowRight'));
  inp.keyDown(down('ShiftLeft'));
  inp.clear(); // the act card, a resume or a restart
  assert.equal(inp.consume().right, false);
  inp.keyDown(down('ArrowRight', true));
  inp.keyDown(down('ShiftLeft', true));
  const f = inp.consume();
  assert.equal(f.right, true, 'still holding right');
  assert.equal(f.shiftPressed, false, 'a repeat is never a new shift press');
});

test("input: a rebound key drives the action and the old one doesn't", () => {
  const binds = rebind(DEFAULT_BINDS, 'jump', 'KeyJ').binds;
  const inp = createInput(() => binds);
  inp.keyDown(down('KeyJ'));
  assert.equal(inp.consume().jumpPressed, true);
  inp.keyDown(down('Space'));
  assert.equal(inp.consume().jumpPressed, false, 'Space no longer jumps');
  assert.equal(inp.keyDown(down('Space')), false, 'and it is not a game key any more');
});

test('input: one shift per press holds with custom binds', () => {
  const binds = rebind(DEFAULT_BINDS, 'shift', 'KeyX').binds;
  const inp = createInput(() => binds);
  inp.keyDown(down('KeyX'));
  for (let i = 0; i < 10; i++) inp.keyDown(down('KeyX', true));
  const frames = Array.from({ length: 5 }, () => inp.consume());
  assert.equal(frames.filter((f) => f.shiftPressed).length, 1);
  inp.keyDown(down('ShiftLeft'));
  assert.equal(inp.consume().shiftPressed, false, 'Shift was given up');
});
