// Keyboard input → per-tick input frames. No DOM access: feed it KeyboardEvent-like objects.
// GDD S-05: one shift attempt per physical key-down; OS key-repeat ignored; presses that
// land between physics ticks are queued, not dropped.

const BINDS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  jump: ['Space', 'KeyW', 'ArrowUp'],
  shift: ['ShiftLeft', 'ShiftRight', 'KeyK'],
};

export const GAME_KEYS = new Set(Object.values(BINDS).flat());

function actionOf(code) {
  for (const [action, codes] of Object.entries(BINDS)) if (codes.includes(code)) return action;
  return null;
}

export function createInput() {
  const held = new Set();
  let jumpPresses = 0;
  let shiftPresses = 0;

  return {
    keyDown(e) {
      const a = actionOf(e.code);
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
      return actionOf(e.code) !== null;
    },
    clear() {
      held.clear();
      jumpPresses = 0;
      shiftPresses = 0;
    },
    isHeld(action) {
      return BINDS[action].some((c) => held.has(c));
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
