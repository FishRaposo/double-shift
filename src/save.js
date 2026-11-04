// Progress: the best result per level, kept in localStorage. No DOM: the browser shell passes the storage in,
// and every read and write tolerates a missing or throwing storage (private windows, blocked site data),
// falling back to memory for the session.

import { DEFAULT_BINDS, cleanBinds } from './keys.js';

const KEY = 'double-shift.progress.v1';

// Fewer clock-ins wins; on a tie, the faster time.
export function better(a, b) {
  return a.shifts < b.shifts || (a.shifts === b.shifts && a.time < b.time);
}

const isResult = (r) => r && Number.isFinite(r.shifts) && Number.isFinite(r.time) && Number.isFinite(r.deaths);

function load(storage) {
  try {
    const data = JSON.parse(storage?.getItem(KEY) ?? 'null');
    const best = {};
    for (const [id, r] of Object.entries(data?.best ?? {})) if (isResult(r)) best[id] = r;
    return { best };
  } catch {
    return { best: {} };
  }
}

// A reworked level (`rev` 2 and up) keeps its bests apart from the old one's, under `id#rev` (rev 1 stays under
// plain `id`, so saves from before revisions read as rev 1). A rework starts with no best; shipping the old version
// again finds its bests untouched; a clear on any revision counts for unlocking.
const keyOf = (id, rev) => (rev === 1 ? id : `${id}#${rev}`);

export function createSave(storage) {
  const data = load(storage);
  return {
    best(id, rev = 1) {
      return data.best[keyOf(id, rev)] ?? null;
    },
    cleared(id) {
      return Object.keys(data.best).some((k) => k === id || k.startsWith(`${id}#`));
    },
    // Returns true if this is a new best for the level (at this revision).
    record(id, r, rev = 1) {
      const prev = this.best(id, rev);
      if (prev && !better(r, prev)) return false;
      data.best[keyOf(id, rev)] = { shifts: r.shifts, time: r.time, deaths: r.deaths };
      try {
        storage?.setItem(KEY, JSON.stringify(data));
      } catch { /* storage full or blocked: keep it for this session */ }
      return true;
    },
  };
}

// A level is open if it's the first of its act, already cleared, or the level before it is cleared.
// Act starts are always open so a player (or a jam rater) can jump straight to any act.
export function isUnlocked(defs, i, save) {
  if (i === 0 || defs[i].act !== defs[i - 1].act) return true;
  return save.cleared(defs[i].id) || save.cleared(defs[i - 1].id);
}

// ---------- settings ----------
// Volumes (0–1) and reduced effects, under their own key, with the same blocked/corrupt-storage fallback.

const SETTINGS_KEY = 'double-shift.settings.v1';
export const DEFAULT_SETTINGS = Object.freeze({ master: 0.8, music: 0.6, sfx: 0.8, reduced: false, timer: false, binds: DEFAULT_BINDS });

const clamp01 = (v, d) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d);

function cleanSettings(s) {
  return {
    master: clamp01(s?.master, DEFAULT_SETTINGS.master),
    music: clamp01(s?.music, DEFAULT_SETTINGS.music),
    sfx: clamp01(s?.sfx, DEFAULT_SETTINGS.sfx),
    reduced: typeof s?.reduced === 'boolean' ? s.reduced : DEFAULT_SETTINGS.reduced,
    timer: typeof s?.timer === 'boolean' ? s.timer : DEFAULT_SETTINGS.timer, // the speedrun timer on the HUD
    binds: cleanBinds(s?.binds), // the key bindings (src/keys.js), repaired if corrupt
  };
}

export function createSettings(storage) {
  let data;
  try {
    data = cleanSettings(JSON.parse(storage?.getItem(SETTINGS_KEY) ?? 'null'));
  } catch {
    data = cleanSettings(null);
  }
  return {
    get() {
      return { ...data };
    },
    // The key bindings as stored, without a copy: input reads them on every key event and three times a tick.
    // Never mutated (set() builds new settings), so sharing the object is safe.
    binds() {
      return data.binds;
    },
    set(patch) {
      data = cleanSettings({ ...data, ...patch });
      try {
        storage?.setItem(SETTINGS_KEY, JSON.stringify(data));
      } catch { /* blocked: keep for this session */ }
      return { ...data };
    },
  };
}
