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
// O (settings), M (mute), P (pause), Q (title, from the pause screen), ` (debug) and Tab (focus).
export const RESERVED = Object.freeze(['Escape', 'Enter', 'KeyR', 'KeyL', 'KeyO', 'KeyM', 'KeyP', 'KeyQ', 'Backquote', 'Tab']);

const SHIFTS = ['ShiftLeft', 'ShiftRight'];
const ARROWS = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓' };

// Letters, digits, the arrows, Space and Shift: keys every keyboard has and the pixel font can label.
export function isBindable(code) {
  if (typeof code !== 'string' || RESERVED.includes(code)) return false;
  return /^Key[A-Z]$/.test(code) || /^Digit\d$/.test(code) || Object.hasOwn(ARROWS, code) || code === 'Space' || SHIFTS.includes(code);
}

// Either Shift key binds both: players don't think of them as two keys.
const keysOf = (code) => (SHIFTS.includes(code) ? [...SHIFTS] : [code]);

const SPARE = [...'JIUHNYTGBVCXZEF'].map((c) => `Key${c}`).concat([...'1234567890'].map((d) => `Digit${d}`));

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
  const spare = SPARE.filter((c) => !used.has(c));
  if (spare.length > 0) return [spare[0]];
  // Every spare taken too (only a hand-edited save can do this): take the action's own defaults anyway. A key on
  // two actions beats an action with no key at all, which would make it unreachable and render a blank row.
  return [...DEFAULT_BINDS[a]];
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

// What a key is called on screen: 'A', '1', '←', 'Space', 'Shift'. Codes name QWERTY positions, so with the
// player's layout (navigator.keyboard.getLayoutMap(), a Map of code → character, where the browser shares it) a
// letter or digit key is named by what its cap prints: KeyQ is 'A' on AZERTY. A character the pixel font can't
// draw keeps the QWERTY name.
export function keyLabel(code, layout = null) {
  if (/^(Key[A-Z]|Digit\d)$/.test(code)) {
    const ch = layout?.get?.(code)?.toUpperCase();
    if (ch && /^[A-Z0-9]$/.test(ch)) return ch;
  }
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (Object.hasOwn(ARROWS, code)) return ARROWS[code];
  if (SHIFTS.includes(code)) return 'Shift';
  return code;
}

// An action's keys as words, each label once: "Shift or K", "Space, W or ↑".
export function keysText(codes, layout = null) {
  const labels = [...new Set(codes.map((c) => keyLabel(c, layout)))];
  return labels.length <= 1 ? labels.join('') : `${labels.slice(0, -1).join(', ')} or ${labels.at(-1)}`;
}

// The same, compact: "Space/W/↑", "Shift/K" (the title's key list).
export function keysShort(codes, layout = null) {
  return [...new Set(codes.map((c) => keyLabel(c, layout)))].join('/');
}

// Keys the game keeps from the page (preventDefault): everything it could bind, bound right now or not, plus
// Enter and Esc. So a rebind never lets Space or the arrows scroll the page around an embed. Tab stays free.
export function ownsKey(code) {
  return isBindable(code) || RESERVED.includes(code) && code !== 'Tab';
}

// A press with Ctrl, Cmd or Alt held is the browser's (reload, find, bookmark, back): the game neither acts on it
// nor stops it, so Ctrl+R reloads instead of restarting the level. Shift isn't a modifier here: it's a game key.
export function browserShortcut(e) {
  return Boolean(e?.ctrlKey || e?.metaKey || e?.altKey);
}
