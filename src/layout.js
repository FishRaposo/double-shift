// Double Shift — pure shell logic: level addressing and screen layout. No DOM, so it's tested headless
// (test/layout.test.mjs); src/main.js only draws what these functions return.

import { ACTS, FINALE_ACT } from './levels.js';

// `?level=` accepts a level id (`?level=offset`) or a 1-based position (`?level=11`). An id is stable when
// levels are inserted; a position isn't. Numbers clamp to the list; anything else starts at the first level.
export function levelIndex(defs, param) {
  if (param == null) return 0;
  const byId = defs.findIndex((d) => d.id === param);
  if (byId >= 0) return byId;
  const n = parseInt(param, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n - 1, 0), defs.length - 1);
}

// ---------- level select ----------
// One row per act: an act tab on the left, then up to four timecards. The selected level's full name, best
// and par sit in a detail bar at the bottom, so the cards can stay small enough for six rows (five acts of
// four plus the finale) on a 960×540 screen.

export const SELECT_BOUNDS = { top: 60, bottom: 510 }; // below the TIMECARDS header, above the key hints
export const TAB = { x: 20, w: 90 };
export const CARD = { w: 196, h: 56, gap: 10, top: 64, rowH: 66, pad: 8, x0: TAB.x + TAB.w + 10 };
export const detailRect = { x: 20, y: 470, w: 920, h: 36 };

// Level indices grouped by act, in order of appearance.
export function actRows(defs) {
  const acts = [...new Set(defs.map((d) => d.act))];
  return acts.map((act) => defs.flatMap((d, i) => (d.act === act ? [i] : [])));
}

export function cardRect(defs, i) {
  const rows = actRows(defs);
  const row = rows.findIndex((r) => r.includes(i));
  const col = rows[row].indexOf(i);
  return { x: CARD.x0 + col * (CARD.w + CARD.gap), y: CARD.top + row * CARD.rowH, w: CARD.w, h: CARD.h, row, col };
}

export function tabRect(defs, row) {
  return { x: TAB.x, y: CARD.top + row * CARD.rowH, w: TAB.w, h: CARD.h };
}

// Arrow-key movement on the card grid: rows clamp at the top and bottom, columns clamp to the row's length.
export function moveSelect(defs, i, dx, dy) {
  const rows = actRows(defs);
  const { row, col } = cardRect(defs, i);
  const r = rows[Math.min(Math.max(row + dy, 0), rows.length - 1)];
  return r[Math.min(Math.max(col + dx, 0), r.length - 1)];
}

export function actLabel(act) {
  return act === FINALE_ACT ? 'FINALE' : `ACT ${act} · ${(ACTS[act] ?? '').toUpperCase()}`;
}

// ---------- end screen ----------
// One row per act (clock-ins and par over the levels played this run), then the totals. Twenty-one level
// rows don't fit a 540-px screen at a readable size; six act rows do.
export function endSummary(defs, results) {
  let shifts = 0;
  let par = 0;
  const rows = actRows(defs).map((idx) => {
    const act = defs[idx[0]].act;
    const played = idx.map((i) => results[i]).filter(Boolean);
    const row = {
      act,
      label: actLabel(act),
      shifts: played.reduce((n, r) => n + r.shifts, 0),
      par: played.reduce((n, r) => n + r.par, 0),
      played: played.length,
    };
    shifts += row.shifts;
    par += row.par;
    return row;
  });
  return { rows, shifts, par };
}
