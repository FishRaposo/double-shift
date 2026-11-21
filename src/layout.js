// Double Shift — pure shell logic: level addressing and screen layout. No DOM, so it's tested headless
// (test/layout.test.mjs); src/main.js only draws what these functions return.

import { ACTS, FINALE_ACT } from './levels.js';
import { TILE, PARAMS } from './rules.js';
import { wrapText, measureText, CAP } from './font.js';

// The HUD's top rows, and the work order's block under them at the top left (`box`: its right edge and bottom).
// Notes, countdowns and tags keep out of both: `hudFloor` is the lowest the HUD reaches over a thing's left edge.
export const HUD_BOTTOM = 62;
export const hudFloor = (box, left) => (left < box.right ? box.bottom : HUD_BOTTOM);

// A paper tag over something in the level (cx, cy): kept on screen and clear of the HUD. Tags that would land on
// each other stack upwards, then down from the top once there's no more room above. Something already written
// there that isn't a tag (`fixed`: a tell's note, the exit) is stepped round sideways first, up to 90 px, so the
// tag stays beside its thing instead of climbing away from it.
export function placeTag(placed, box, textW, cx, cy, screenW) {
  const half = textW / 2 + 10;
  const clampX = (v) => Math.min(screenW - half, Math.max(half, v));
  const hitsAt = (x, y) => placed.filter((p) => Math.abs(p.x - x) < p.half + half && Math.abs(p.y - y) < 26);
  let x = clampX(cx);
  const y0 = Math.max(hudFloor(box, x - half) + 14, cy);
  const blockers = hitsAt(x, y0);
  if (blockers.length && blockers.every((p) => p.fixed)) {
    for (const dx of [10, -10, 20, -20, 30, -30, 45, -45, 60, -60, 75, -75, 90, -90]) {
      const nx = clampX(cx + dx);
      if (!hitsAt(nx, Math.max(hudFloor(box, nx - half) + 14, cy)).length) { x = nx; break; }
    }
  }
  const top = hudFloor(box, x - half) + 14;
  const hits = (y) => hitsAt(x, y).length > 0;
  let y = Math.max(top, cy);
  let step = -28;
  while (hits(y)) {
    if (y + step < top) step = 28;
    y += step;
  }
  placed.push({ x, y, half });
  return { x, y };
}

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

// A frame's two deltas (src/main.js frame/advance). Interface time — menu timers, the act card's 1.6 s, the
// stamp guards, the note strip, the logged durations — is wall time, so a slow machine cannot stretch it. Only
// the fixed-step simulation is clamped, so a stall costs at most one catch-up instead of a spiral.
export const SIM_MAX = 0.1; // the most simulation one frame may take, in seconds
export function frameDeltas(raw) {
  const wall = Math.max(Number.isFinite(raw) ? raw : 0, 0);
  return { wall, sim: Math.min(wall, SIM_MAX) };
}

// The canvas's on-screen size in CSS px, as a multiple of 960×540. Pixel art at a fractional scale gets uneven
// pixels (some 2 device px wide, some 3), so it snaps to a whole number of *device* pixels per canvas pixel
// (CSS px × devicePixelRatio, so 125% and Retina screens count right), unless that would waste more than 15%
// of the window: then it fits the window, and the unevenness is the smaller cost.
export function canvasScale(winW, winH, dpr = 1) {
  const fit = Math.min(winW / 960, winH / 540);
  const whole = Math.floor(fit * dpr + 1e-9);
  return whole >= 1 && whole / (fit * dpr) >= 0.85 ? whole / dpr : fit;
}

// ---------- level select ----------
// One row per act: an act tab on the left, then up to four timecards. The selected level's full name, best
// and par sit in a detail bar at the bottom, so the cards can stay small enough for six rows (five acts of
// four plus the finale) on a 960×540 screen.

export const SELECT_BOUNDS = { top: 60, bottom: 510 }; // below the TIMECARDS header, above the key hints
export const TAB = { x: 20, w: 90 };
export const CARD = { w: 196, h: 56, gap: 10, top: 64, rowH: 66, pad: 8, x0: TAB.x + TAB.w + 10 };
export const detailRect = { x: 20, y: 470, w: 920, h: 36 };

// Level indices grouped by act, in order of appearance. Memoized per level list: the select screen asks for
// it once per card, every frame.
const rowsCache = new WeakMap();
export function actRows(defs) {
  let rows = rowsCache.get(defs);
  if (!rows) {
    const acts = [...new Set(defs.map((d) => d.act))];
    rows = acts.map((act) => defs.flatMap((d, i) => (d.act === act ? [i] : [])));
    rowsCache.set(defs, rows);
  }
  return rows;
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

// What a click on the level select screen means. Cards pick a level and the detail bar clocks into the selected
// one; tabs and the gaps between cards do nothing (a near miss shouldn't throw you out of the menu); only the
// header and the key hints, outside the grid, go back to the title.
export function selectClick(defs, x, y) {
  const hit = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  const index = defs.findIndex((_, i) => hit(cardRect(defs, i)));
  if (index >= 0) return { kind: 'card', index };
  if (hit(detailRect)) return { kind: 'detail' };
  if (y >= SELECT_BOUNDS.top && y <= SELECT_BOUNDS.bottom) return { kind: 'none' };
  return { kind: 'back' };
}

export function actLabel(act) {
  return act === FINALE_ACT ? ACTS[FINALE_ACT].toUpperCase() : `ACT ${act} · ${(ACTS[act] ?? '').toUpperCase()}`;
}

// ---------- end screen ----------
// One row per act (clock-ins and par over the levels played this run), then the totals. Twenty-one level
// rows don't fit a 540-px screen at a readable size; six act rows do.
export function endSummary(defs, results, spent = []) {
  let shifts = 0;
  let par = 0;
  let time = 0; // the run total: `spent` is every second played this run, abandoned attempts included
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
    if (spent.length === 0) time += played.reduce((t, r) => t + (r.time ?? 0), 0);
    return row;
  });
  for (const s of spent) time += s ?? 0;
  return { rows, shifts, par, time };
}

// ---------- memos (notice-board notes, WRITING.md §6.1) ----------
// A memo prop is a scrap of paper on the wall. While the worker stands within 2 tiles of it (by their middle), its
// text shows on a paper panel above it in the note strip's style: scale 2, at most 360 px wide, below the HUD and
// clamped on screen, on the 2-px art grid; a memo's `w` narrows it where tells crowd the room. The panel carries
// its own metrics, so src/art.js just draws it.
export const MEMO = Object.freeze({ scale: 2, maxW: 360, pad: 8, top: 60, near: 2, lineH: 18 });

export function memoNear(p, memo) {
  const cx = Math.floor((p.x + PARAMS.playerW / 2) / TILE);
  const cy = Math.floor((p.y + PARAMS.playerH / 2) / TILE);
  return Math.abs(cx - memo.tx) <= MEMO.near && Math.abs(cy - memo.ty) <= MEMO.near;
}

export function memoPanel(text, tx, ty, { maxW = MEMO.maxW, W = 960, H = 540 } = {}) {
  const even = (v) => 2 * Math.ceil(v / 2);
  const { scale, pad, lineH } = MEMO;
  const cap = Math.min(maxW, MEMO.maxW);
  const lines = wrapText(text, cap - 2 * pad, scale);
  const w = Math.min(cap, even(Math.max(...lines.map((l) => measureText(l, scale))) + 2 * pad));
  const h = even((lines.length - 1) * lineH + CAP * scale + 2 * pad);
  const x = Math.min(Math.max(even(tx * TILE + TILE / 2 - w / 2), 8), W - 8 - w);
  const y = Math.min(Math.max(even(ty * TILE - h - 6), MEMO.top), H - 8 - h);
  return { x, y, w, h, lines, scale, pad, lineH };
}

// ---------- leaving a break for the title (the pause screen's Q, the pad's RB) ----------
// Quitting a level to the title costs the run, and RB is a button players mash to shift, so it takes two presses:
// the first arms (the row reads "title? again"), a second within QUIT_CONFIRM seconds quits. `armedAt` is the
// clock reading of the arming press, or null when disarmed. Any other key, or the time passing, disarms
// (quitArmed); leaving the pause screen disarms too (main.js setScreen).
export const QUIT_CONFIRM = 2;
export const quitArmed = (armedAt, now) => armedAt !== null && now - armedAt <= QUIT_CONFIRM;
export function quitPress(armedAt, now) {
  return quitArmed(armedAt, now) ? { quit: true, armedAt: null } : { quit: false, armedAt: now };
}

// ---------- volume rows ----------
// A volume row draws ten 7 px segments at an 18 px pitch from x0 (drawSettings). A click picks the segment under
// the pointer (nearest centre, so the gaps count too: that segment's level, i+1 tenths); a click left of the first
// segment's centre, on its left half or off the bar, is 0: the only way to silence a bar with the pointer.
export const VOLUME_SEGMENT = Object.freeze({ w: 7, pitch: 18, count: 10 });
export function volumeAt(x, x0) {
  const { w, pitch, count } = VOLUME_SEGMENT;
  const first = x0 + w / 2;
  if (x < first) return 0;
  const i = Math.min(count - 1, Math.round((x - first) / pitch));
  return (i + 1) / count;
}

// ---------- the stuck hint ----------
// Some levels can still end up unwinnable until the player restarts (GDD §9.3), and the player may not know that R
// restarts. After STUCK_DEATHS deaths in one attempt with no progress since the previous death, the play HUD says so.
// `progress` is the list of progress tokens the run has reached right now (a repair step such as 'r0:tool', 'r0:done',
// 'r0:at1'; a saved checkpoint 'cp:<id>'; 'win'). A token never seen before in this attempt is progress; tokens
// that come back after a death sends the repairs back to the last checkpoint are not. `prev` is the tracker this
// returns (null at the start of an attempt: a restart or a new level drops it, which clears the hint). Pure.
export const STUCK_DEATHS = 3;
export function stuckHint(prev, { deaths, progress = [] }) {
  if (!prev) return { tracker: { deaths, seen: [...progress], fruitless: 0 }, show: false };
  const fresh = progress.filter((p) => !prev.seen.includes(p));
  const fruitless = fresh.length ? 0 : prev.fruitless + Math.max(0, deaths - prev.deaths);
  const tracker = { deaths, seen: fresh.length ? [...prev.seen, ...fresh] : prev.seen, fruitless };
  return { tracker, show: fruitless >= STUCK_DEATHS };
}
