// Key bindings (src/keys.js): rebinding never leaves an action without a key, never puts one key on two actions,
// and never takes the menu keys.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS, DEFAULT_BINDS, RESERVED, isBindable, rebind, cleanBinds, keyLabel, keysText, keysShort, actionOf, ownsKey, browserShortcut } from '../src/keys.js';

function valid(b) {
  const seen = new Set();
  for (const a of ACTIONS) {
    assert.ok(Array.isArray(b[a]) && b[a].length > 0, `${a} has a key`);
    for (const c of b[a]) {
      assert.ok(isBindable(c), `${a}: ${c} is bindable`);
      assert.ok(!seen.has(c), `${c} is on two actions`);
      seen.add(c);
    }
  }
}

test("keys: taking another action's only key swaps instead of unbinding", () => {
  // shift's defaults are all on other actions, so it takes jump's old key: a swap
  const b = { left: ['ShiftLeft'], right: ['ShiftRight'], jump: ['KeyW'], shift: ['KeyK'] };
  const r = rebind(b, 'jump', 'KeyK');
  assert.equal(r.ok, true);
  assert.deepEqual(r.binds.jump, ['KeyK']);
  assert.deepEqual(r.binds.shift, ['KeyW']);
  valid(r.binds);
  // with its defaults free, an emptied action takes them back
  const r2 = rebind(DEFAULT_BINDS, 'jump', 'KeyK');
  assert.deepEqual(r2.binds.jump, ['KeyK']);
  assert.deepEqual(r2.binds.shift, ['ShiftLeft', 'ShiftRight']);
  valid(r2.binds);
  // either Shift key binds both
  assert.deepEqual(rebind(DEFAULT_BINDS, 'jump', 'ShiftRight').binds.jump, ['ShiftLeft', 'ShiftRight']);
});

test('keys: reserved and unbindable codes are refused', () => {
  for (const code of [...RESERVED, 'F5', 'Numpad1', 'ControlLeft', 'MetaLeft', '', undefined]) {
    const r = rebind(DEFAULT_BINDS, 'jump', code);
    assert.equal(r.ok, false, String(code));
    assert.deepEqual(r.binds, DEFAULT_BINDS);
  }
  for (const code of ['KeyJ', 'Digit3', 'ArrowDown', 'Space', 'ShiftLeft']) assert.equal(isBindable(code), true, code);
  assert.equal(rebind(DEFAULT_BINDS, 'dance', 'KeyJ').ok, false);
});

test('keys: cleanBinds repairs corrupt or partial binds', () => {
  assert.deepEqual(cleanBinds(null), DEFAULT_BINDS);
  assert.deepEqual(cleanBinds('nope'), DEFAULT_BINDS);
  const partial = cleanBinds({ jump: ['KeyJ'] });
  assert.deepEqual(partial.jump, ['KeyJ']);
  assert.deepEqual(partial.left, DEFAULT_BINDS.left);
  valid(partial);
  const junk = cleanBinds({ left: ['KeyA', 'KeyA', 'Escape', 42], right: ['KeyA'], jump: [], shift: 'KeyK' });
  valid(junk);
  assert.deepEqual(junk.left, ['KeyA']);
  assert.ok(!junk.right.includes('KeyA'), 'one key, one action');
});

test('keys: any run of rebinds keeps every action bound and each key on one action', () => {
  let seed = 3;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const codes = ['KeyA', 'KeyD', 'KeyW', 'KeyK', 'KeyJ', 'Space', 'ShiftLeft', 'ArrowUp', 'ArrowLeft', 'Digit1', 'Escape'];
  let b = DEFAULT_BINDS;
  for (let i = 0; i < 500; i++) {
    b = rebind(b, ACTIONS[Math.floor(rnd() * ACTIONS.length)], codes[Math.floor(rnd() * codes.length)]).binds;
    valid(b);
  }
});

test('keys: labels and the action a key drives', () => {
  assert.deepEqual(['KeyA', 'Digit1', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'ShiftLeft', 'ShiftRight'].map(keyLabel),
    ['A', '1', '←', '→', '↑', '↓', 'Space', 'Shift', 'Shift']);
  assert.equal(keysText(DEFAULT_BINDS.shift), 'Shift or K');
  assert.equal(keysText(DEFAULT_BINDS.jump), 'Space, W or ↑');
  assert.equal(keysText(['KeyJ']), 'J');
  assert.equal(keysShort(DEFAULT_BINDS.jump), 'Space/W/↑');
  assert.equal(keysShort(DEFAULT_BINDS.shift), 'Shift/K');
  assert.equal(actionOf(DEFAULT_BINDS, 'KeyK'), 'shift');
  assert.equal(actionOf(DEFAULT_BINDS, 'KeyJ'), null);
});

test('keys: the game keeps every key it could use from the page, bound or not (no scrolling after a rebind)', () => {
  for (const code of ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyA', 'Digit1', 'ShiftLeft', 'Enter', 'Escape', 'KeyR']) {
    assert.equal(ownsKey(code), true, code);
  }
  for (const code of ['Tab', 'F5', 'F12', 'ControlLeft', 'MetaLeft']) assert.equal(ownsKey(code), false, code);
});

test('keys: a press with Ctrl, Cmd or Alt held is a browser shortcut (reload, find, back), never a game key', () => {
  assert.equal(browserShortcut({ code: 'KeyR', ctrlKey: true }), true, 'Ctrl+R reloads; it must not restart the level');
  assert.equal(browserShortcut({ code: 'KeyR', metaKey: true }), true, 'Cmd+R');
  assert.equal(browserShortcut({ code: 'ArrowLeft', altKey: true }), true, 'Alt+Left goes back');
  assert.equal(browserShortcut({ code: 'KeyF', ctrlKey: true, shiftKey: true }), true);
  assert.equal(browserShortcut({ code: 'KeyR' }), false, 'R alone restarts');
  assert.equal(browserShortcut({ code: 'ShiftLeft', shiftKey: true }), false, 'Shift is a game key, not a modifier here');
  assert.equal(browserShortcut({ code: 'PadSelect' }), false, 'gamepad presses carry no modifiers');
});

