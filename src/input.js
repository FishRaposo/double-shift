// Keyboard input → per-tick input frames. No DOM access: feed it KeyboardEvent-like objects.
// GDD S-05: one shift attempt per physical key-down; OS key-repeat ignored; presses that
// land between physics ticks are queued, not dropped. Which keys drive which action comes from
// getBinds() (src/keys.js), read on every event, so a rebinding applies at once.

import { DEFAULT_BINDS, actionOf } from './keys.js';

export function createInput(getBinds = () => DEFAULT_BINDS) {
  const held = new Set();
  let jumpPresses = 0;
  let shiftPresses = 0;

  return {
    keyDown(e) {
      const a = actionOf(getBinds(), e.code);
      if (!a) return false;
      // OS auto-repeat: never a new press, but it re-asserts the hold. So a key held through a screen
      // change (act card, resume, restart all clear input) starts working again ~30 ms later.
      held.add(e.code);
      if (e.repeat) return true;
      if (a === 'jump') jumpPresses++;
      if (a === 'shift') shiftPresses++;
      return true;
    },
    keyUp(e) {
      held.delete(e.code);
      return actionOf(getBinds(), e.code) !== null;
    },
    clear() {
      held.clear();
      jumpPresses = 0;
      shiftPresses = 0;
    },
    isHeld(action) {
      return getBinds()[action].some((c) => held.has(c));
    },
    // Called once per physics tick. Consumes at most one queued press of each kind.
    consume() {
      const frame = {
        left: this.isHeld('left'),
        right: this.isHeld('right'),
        jumpHeld: this.isHeld('jump') || jumpPresses > 0,
        jumpPressed: jumpPresses > 0,
        shiftPressed: shiftPresses > 0,
      };
      if (jumpPresses > 0) jumpPresses--;
      if (shiftPresses > 0) shiftPresses--;
      return frame;
    },
  };
}
