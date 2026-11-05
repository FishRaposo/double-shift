// Double Shift — gamepad: snapshots of navigator.getGamepads() in, key-like edges out ({ type: 'down' | 'up',
// code }), with pad codes ('PadA', 'PadLeft', ...). Pure, so it's tested headless (test/pad.test.mjs): main.js
// polls once a frame; input.js maps the pad codes to actions, main.js to the menus' keys. A fixed mapping on the
// standard layout (not rebindable): A jumps; B, X or RB shift; Start pauses; Back restarts; the d-pad or the
// left stick moves.

const PAD_BUTTONS = Object.freeze({
  0: 'PadA', 1: 'PadB', 2: 'PadX', 3: 'PadY', 5: 'PadRB', 8: 'PadSelect', 9: 'PadStart',
  12: 'PadUp', 13: 'PadDown', 14: 'PadLeft', 15: 'PadRight',
});

// The stick latches a direction past 0.5 and lets go below 0.3, so resting near a threshold never chatters.
const STICK = Object.freeze({ press: 0.5, release: 0.3 });

// navigator.getGamepads(), or null when the browser won't share pads: inside an embed whose iframe doesn't allow
// gamepads, getGamepads() throws a SecurityError, and the game must carry on with the keyboard.
export function readPads(nav) {
  try {
    return nav?.getGamepads?.() ?? [];
  } catch {
    return null;
  }
}

// Outside a level a press stands in for a menu key: A Space, B Esc, X L (level select), Y O (settings), Start
// Space on the title and Esc elsewhere, Back R, the d-pad or stick the arrows. Null: no menu meaning.
const MENU_KEYS = Object.freeze({ PadA: 'Space', PadB: 'Escape', PadX: 'KeyL', PadY: 'KeyO', PadSelect: 'KeyR', PadUp: 'ArrowUp', PadDown: 'ArrowDown', PadLeft: 'ArrowLeft', PadRight: 'ArrowRight' });
export function padMenuKey(code, screen) {
  if (code === 'PadStart') return screen === 'title' ? 'Space' : 'Escape';
  return MENU_KEYS[code] ?? null;
}

// The first pad with the standard mapping, else the first connected one, else none.
export function pickPad(pads) {
  const list = [...(pads ?? [])].filter((p) => p && p.connected !== false);
  return list.find((p) => p.mapping === 'standard') ?? list[0] ?? null;
}

function latch(cur, v) {
  if (cur !== 0 && Math.sign(v) === cur && Math.abs(v) >= STICK.release) return cur; // still held that way
  return Math.abs(v) > STICK.press ? Math.sign(v) : 0;
}

export function createPad() {
  let held = new Set();
  let stick = { x: 0, y: 0 };
  return {
    // Codes down now against codes down last poll: ups first, then downs. A missing pad releases everything.
    poll(pads) {
      const pad = pickPad(pads);
      const now = new Set();
      if (pad) {
        for (const [i, code] of Object.entries(PAD_BUTTONS)) if (pad.buttons?.[i]?.pressed) now.add(code);
        stick = { x: latch(stick.x, pad.axes?.[0] ?? 0), y: latch(stick.y, pad.axes?.[1] ?? 0) };
        if (stick.x) now.add(stick.x < 0 ? 'PadLeft' : 'PadRight');
        if (stick.y) now.add(stick.y < 0 ? 'PadUp' : 'PadDown');
      } else {
        stick = { x: 0, y: 0 };
      }
      const events = [];
      for (const code of held) if (!now.has(code)) events.push({ type: 'up', code });
      for (const code of now) if (!held.has(code)) events.push({ type: 'down', code });
      held = now;
      return events;
    },
    // What's down now: re-asserted every frame (as OS key-repeat does for the keyboard), so a hold survives the
    // game clearing its input on a restart, the act card or a pause.
    held() {
      return held;
    },
  };
}
