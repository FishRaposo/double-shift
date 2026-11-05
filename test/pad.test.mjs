// Gamepad (src/pad.js): snapshots of navigator.getGamepads() in, key-like edges out. No browser needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPad, pickPad, readPads, padMenuKey } from '../src/pad.js';
import { createInput } from '../src/input.js';

// A standard-mapping pad with the given buttons held and stick position.
const pad = ({ buttons = [], x = 0, y = 0, mapping = 'standard', id = 'pad' } = {}) => ({
  id, mapping, connected: true, axes: [x, y, 0, 0],
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })),
});
const codes = (events) => events.map((e) => `${e.type} ${e.code}`);

test('pad: one down and one up per press', () => {
  const p = createPad();
  assert.deepEqual(codes(p.poll([pad({ buttons: [0] })])), ['down PadA']);
  for (let i = 0; i < 5; i++) assert.deepEqual(p.poll([pad({ buttons: [0] })]), [], 'held: no repeats');
  assert.deepEqual(codes(p.poll([pad()])), ['up PadA']);
  assert.deepEqual(p.poll([pad()]), []);
  assert.deepEqual(codes(p.poll([pad({ buttons: [1, 14] })])).sort(), ['down PadB', 'down PadLeft']);
});

test("pad: stick hysteresis doesn't chatter", () => {
  const p = createPad();
  const seq = [0, 0.6, 0.45, 0.55, 0.4, 0.35, 0.29, 0.31, 0.45, 0.6, -0.6];
  const out = seq.map((x) => codes(p.poll([pad({ x })])));
  assert.deepEqual(out, [
    [], ['down PadRight'], [], [], [], [], ['up PadRight'], [], [], ['down PadRight'], ['up PadRight', 'down PadLeft'],
  ]);
});

test('pad: a disconnect releases every held code', () => {
  const p = createPad();
  p.poll([pad({ buttons: [0, 5], x: -0.9 })]);
  assert.deepEqual(codes(p.poll([])).sort(), ['up PadA', 'up PadLeft', 'up PadRB']);
  assert.deepEqual(p.poll([null]), []);
});

test('pad: the first standard-mapped pad is used, else the first connected one', () => {
  const odd = pad({ mapping: '', id: 'odd' });
  const std = pad({ id: 'std' });
  assert.equal(pickPad([odd, std]).id, 'std');
  assert.equal(pickPad([null, odd]).id, 'odd');
  assert.equal(pickPad([{ ...std, connected: false }]), null);
  assert.equal(pickPad(undefined), null);
});

test('pad: its fixed codes drive the actions, whatever the keyboard bindings', () => {
  const inp = createInput();
  inp.keyDown({ code: 'PadA' });
  assert.equal(inp.consume().jumpPressed, true);
  for (const code of ['PadB', 'PadX', 'PadRB']) {
    inp.keyDown({ code });
    assert.equal(inp.consume().shiftPressed, true, code);
    inp.keyUp({ code });
  }
  inp.keyDown({ code: 'PadLeft' });
  assert.equal(inp.consume().left, true);
  inp.keyUp({ code: 'PadLeft' });
  assert.equal(inp.consume().left, false);
});

test("pad: a browser that won't share gamepads (an embed's permissions) reads as unavailable, not a crash", () => {
  assert.equal(readPads({ getGamepads() { throw new Error('SecurityError'); } }), null);
  assert.deepEqual(readPads({}), []);
  assert.deepEqual(readPads(undefined), []);
  const pads = [pad()];
  assert.equal(readPads({ getGamepads: () => pads }), pads);
});

test('pad: held() lists what is down, so a hold survives the game clearing its input', () => {
  const p = createPad();
  p.poll([pad({ buttons: [0], x: 0.9 })]);
  assert.deepEqual([...p.held()].sort(), ['PadA', 'PadRight']);
  const inp = createInput();
  inp.clear(); // a restart or the act card
  for (const code of p.held()) inp.keyDown({ code, repeat: true }); // re-asserted every frame, like key-repeat
  const f = inp.consume();
  assert.equal(f.right, true);
  assert.equal(f.jumpPressed, false, 'a re-asserted hold is never a new press');
});

test('pad: in menus A confirms, B goes back, X opens level select, Y settings, Start is Space on the title', () => {
  assert.equal(padMenuKey('PadA', 'select'), 'Space');
  assert.equal(padMenuKey('PadB', 'settings'), 'Escape');
  assert.equal(padMenuKey('PadX', 'title'), 'KeyL');
  assert.equal(padMenuKey('PadY', 'paused'), 'KeyO');
  assert.equal(padMenuKey('PadStart', 'title'), 'Space');
  assert.equal(padMenuKey('PadStart', 'paused'), 'Escape');
  assert.equal(padMenuKey('PadSelect', 'card'), 'KeyR');
  assert.equal(padMenuKey('PadDown', 'select'), 'ArrowDown');
  assert.equal(padMenuKey('PadRB', 'paused'), 'KeyQ'); // on a break: the title
});
