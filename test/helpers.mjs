import { step, initState, parseLevel, NO_INPUT, TILE } from '../src/rules.js';

// Build a level from compact ASCII for edge-case tests.
export function level(day, night, extra = {}) {
  return parseLevel({ name: 'test', par: 0, day, night, ...extra });
}

export function stepN(lvl, s, n, input = NO_INPUT) {
  for (let i = 0; i < n; i++) s = step(lvl, s, input);
  return s;
}

export function place(s, tx, ty, opts = {}) {
  s.player.x = tx * TILE + (opts.dx ?? 6);
  s.player.y = ty * TILE + (opts.dy ?? 0);
  Object.assign(s.player, opts.player ?? {});
  return s;
}

// Run a policy (state -> input) until win or frame limit. Collects all events.
export function play(lvl, policy, maxFrames = 120 * 60) {
  let s = initState(lvl);
  const events = [];
  const mem = {};
  let prevJump = false;
  let prevShift = false;
  for (let f = 0; f < maxFrames && !s.won; f++) {
    const want = policy(s, mem, f);
    const input = {
      left: !!want.left,
      right: !!want.right,
      jumpHeld: !!want.jump,
      jumpPressed: !!want.jump && !prevJump,
      shiftPressed: !!want.shift && !prevShift,
    };
    prevJump = !!want.jump;
    prevShift = !!want.shift;
    s = step(lvl, s, input);
    events.push(...s.events);
  }
  return { state: s, events };
}

export const tx = (s) => s.player.x / TILE;
