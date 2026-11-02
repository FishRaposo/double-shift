// Progress: the best result per level, kept in localStorage. No DOM: the browser shell passes the storage in,
// and every read and write tolerates a missing or throwing storage (private windows, blocked site data),
// falling back to memory for the session.

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

export function createSave(storage) {
  const data = load(storage);
  return {
    best(id) {
      return data.best[id] ?? null;
    },
    cleared(id) {
      return id in data.best;
    },
    // Returns true if this is a new best for the level.
    record(id, r) {
      const prev = data.best[id];
      if (prev && !better(r, prev)) return false;
      data.best[id] = { shifts: r.shifts, time: r.time, deaths: r.deaths };
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
