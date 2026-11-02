import test from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/input.js';

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
