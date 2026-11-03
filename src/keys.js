// Double Shift — key bindings: which keys (KeyboardEvent.code) drive each action. Pure, so it's tested headless
// (test/keys.test.mjs): input.js reads the current bindings, settings store them, the CONTROLS screen edits them.
// Rebinding never leaves an action without a key, never puts one key on two actions, and never takes a menu key.

export const ACTIONS = Object.freeze(['left', 'right', 'jump', 'shift']);

export const DEFAULT_BINDS = Object.freeze({
  left: Object.freeze(['ArrowLeft', 'KeyA']),
  right: Object.freeze(['ArrowRight', 'KeyD']),
  jump: Object.freeze(['Space', 'KeyW', 'ArrowUp']),
  shift: Object.freeze(['ShiftLeft', 'ShiftRight', 'KeyK']),
});

// The menus' keys never drive an action: Esc (pause, back), Enter (confirm), R (restart), L (levels),
// O (settings), M (mute), ` (debug) and Tab (focus).
export const RESERVED = Object.freeze(['Escape', 'Enter', 'KeyR', 'KeyL', 'KeyO', 'KeyM', 'Backquote', 'Tab']);

const SHIFTS = ['ShiftLeft', 'ShiftRight'];
const ARROWS = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };

// Letters, digits, the arrows, Space and Shift: keys every keyboard has and the pixel font can label.
export function isBindable(code) {
  if (typeof code !== 'string' || RESERVED.includes(code)) return false;
  return /^Key[A-Z]$/.test(code) || /^Digit\d$/.test(code) || code in ARROWS || code === 'Space' || SHIFTS.includes(code);
}

// Either Shift key binds both: players don't think of them as two keys.
const keysOf = (code) => (SHIFTS.includes(code) ? [...SHIFTS] : [code]);

const SPARE = [...'JIUHNYTGBVCXZQEPF'].map((c) => `Key${c}`).concat([...'1234567890'].map((d) => `Digit${d}`));

export function actionOf(binds, code) {
  for (const a of ACTIONS) if (binds[a]?.includes(code)) return a;
  return null;
}

// An action left with no key takes back its defaults that are free; failing that, `fallback` (the swap), and
// failing that, the first spare key nobody uses, so it is never empty.
function refill(next, a, fallback = []) {
  const used = new Set(ACTIONS.flatMap((b) => next[b]));
  const free = DEFAULT_BINDS[a].filter((c) => !used.has(c));
  if (free.length > 0) return free;
  const swap = fallback.filter((c) => !used.has(c));
  if (swap.length > 0) return swap;
  return [SPARE.find((c) => !used.has(c))];
}

// The action takes the key (just that key, or both Shifts); any other action that had it loses it, and an
// action left with nothing takes its free defaults back, else the rebound action's old key: a swap.
export function rebind(binds, action, code) {
  if (!ACTIONS.includes(action) || !isBindable(code)) return { binds, ok: false };
  const keys = keysOf(code);
  const next = {};
  for (const a of ACTIONS) next[a] = a === action ? keys : binds[a].filter((c) => !keys.includes(c));
  for (const a of ACTIONS) if (next[a].length === 0) next[a] = refill(next, a, keysOf(binds[action][0]));
  return { binds: next, ok: true };
}

// Saved bindings, repaired: bindable codes only, each on one action (the first that lists it), and an action
// with nothing usable gets its free defaults. Anything else falls back to the defaults.
export function cleanBinds(x) {
  const next = Object.fromEntries(ACTIONS.map((a) => [a, []]));
  const used = new Set();
  for (const a of ACTIONS) {
    for (const c of Array.isArray(x?.[a]) ? x[a] : []) {
      if (!isBindable(c)) continue;
      for (const k of keysOf(c)) if (!used.has(k)) { next[a].push(k); used.add(k); }
    }
  }
  for (const a of ACTIONS) if (next[a].length === 0) next[a] = refill(next, a);
  return next;
}

// What a key is called on screen: 'A', '1', '←', 'Space', 'Shift'.
export function keyLabel(code) {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (code in ARROWS) return ARROWS[code];
  if (SHIFTS.includes(code)) return 'Shift';
  return code;
}

// An action's keys as words, each label once: "Shift or K", "Space, W or ↑".
export function keysText(codes) {
  const labels = [...new Set(codes.map(keyLabel))];
  return labels.length <= 1 ? labels.join('') : `${labels.slice(0, -1).join(', ')} or ${labels.at(-1)}`;
}

// The same, compact: "Space/W/↑", "Shift/K" (the title's key list).
export function keysShort(codes) {
  return [...new Set(codes.map(keyLabel))].join('/');
}
