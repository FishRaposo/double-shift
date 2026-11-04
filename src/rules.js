// Double Shift — pure game rules.
// No DOM, no clock: step(level, state, input) returns the next state.
// Everything the screen shows is decided here.

export const TILE = 30;
export const DT = 1 / 120; // fixed timestep, seconds

export const PARAMS = Object.freeze({
  playerW: 18,
  playerH: 26,
  maxSpeed: 270, // px/s
  groundAccel: 2600,
  airAccel: 1700,
  groundDecel: 3000,
  airDecel: 900,
  gravity: 2000,
  jumpVelocity: 620,
  jumpCut: 0.45, // vy multiplier when jump is released while rising
  maxFall: 900,
  coyoteTime: 0.08,
  jumpBuffer: 0.1,
  shiftBuffer: 0.08,
  shiftNudge: 4, // px
  hazardHeight: 0.45, // fraction of a tile, measured from the tile bottom
  wetAccel: 500, // px/s² while grounded on wet floor `~` (grip is 2600): steering back barely helps
  wetDecel: 250, // px/s² (grip is 3000): you keep sliding
});

export const DAY = 0;
export const NIGHT = 1;

// Skins are object art drawn over ordinary solid tiles (src/skins.js decides which); the rules only validate
// them. Default sizes in tiles: a door is 1×2, a pillar 1×4, a portrait 3×2; the door pile is 2 wide and at most
// h (3) doors high.
export const SKIN_KINDS = Object.freeze(['door', 'pillar', 'portrait', 'doorPile']);
const SKIN_SIZE = { door: [1, 2], pillar: [1, 4], portrait: [3, 2], doorPile: [2, 3] };

// The cells a skin must have inside the grid: doors and pillars stand on their bottom cell (ty) and a portrait
// hangs from its top-left cell. A pile's h is only a cap (skinPlan stops counting at the top of the grid), so
// only its bottom row has to fit.
function skinCells(sk) {
  if (sk.kind === 'portrait') return { x0: sk.tx, x1: sk.tx + sk.w - 1, y0: sk.ty, y1: sk.ty + sk.h - 1 };
  const h = sk.kind === 'doorPile' ? 1 : sk.h;
  return { x0: sk.tx, x1: sk.tx + sk.w - 1, y0: sk.ty - h + 1, y1: sk.ty };
}

// ---------- level parsing ----------

// A level is { name, par, day: string[], night: string[] } — or `offset` or `upsideDown: true`, plus an optional
// `nightPatch`, instead of `night`: those generate the night grid from the day one.
// Legend: '#' solid, '^' hazard, 'S' spawn, 'E' exit, 'C' checkpoint, '.' empty.
// S, E and C are shared between shifts and may be written in either grid.
export function parseLevel(def) {
  const { day } = def;
  if (def.night && def.offset) throw new Error(`${def.name}: give a night grid or an offset, not both`);
  if (def.upsideDown && (def.night || def.offset)) throw new Error(`${def.name}: an upside down level generates its night from the day; give no night grid or offset`);
  for (const r of def.nightPatch ?? []) {
    if ('SEC'.includes(r.ch)) throw new Error(`${def.name}: nightPatch can't place S, E or C (they're shared)`);
  }
  const night = def.night ?? generateNight(def);
  if (!night) throw new Error(`${def.name}: needs a night grid, an offset or upsideDown`);
  const sups = (def.freaks ?? []).filter((f) => f.kind === 'supervisor');
  if (sups.length > 1) throw new Error(`${def.name}: one supervisor per level`);
  if (def.rev !== undefined && !(Number.isInteger(def.rev) && def.rev >= 1)) throw new Error(`${def.name}: rev must be a whole number from 1`);
  for (const pr of def.pranks ?? []) {
    if (pr.every !== undefined && !(Number.isInteger(pr.every) && pr.every >= 1)) throw new Error(`${def.name}: prank ${pr.id} every must be a whole number from 1`);
  }
  for (const f of def.freaks ?? []) {
    if (f.period !== undefined && !(f.period > 0)) throw new Error(`${def.name}: ${f.kind} period must be > 0`);
    if (f.duty !== undefined && !(f.duty > 0 && f.duty <= 1)) throw new Error(`${def.name}: ${f.kind} duty must be in (0, 1]`);
  }
  if (day.length !== night.length) throw new Error(`${def.name}: day/night height differs`);
  const h = day.length;
  const w = day[0].length;
  const layers = [day, night].map((rows, li) => {
    rows.forEach((r, y) => {
      if (r.length !== w) throw new Error(`${def.name}: ${li ? 'night' : 'day'} row ${y} has width ${r.length}, expected ${w}`);
    });
    return rows.map((r) => r.split(''));
  });
  let spawn = null;
  let exit = null;
  const checkpoints = [];
  for (let li = 0; li < 2; li++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = layers[li][y][x];
        if (c === 'S') spawn = { tx: x, ty: y };
        else if (c === 'E') exit = { tx: x, ty: y };
        else if (c === 'C') checkpoints.push({ tx: x, ty: y, id: `${x},${y}` });
        else continue;
        layers[li][y][x] = '.';
      }
    }
  }
  if (!spawn) throw new Error(`${def.name}: no spawn`);
  if (!exit) throw new Error(`${def.name}: no exit`);
  const pranks = (def.pranks ?? []).map((pr) => ({
    id: pr.id,
    onNight: pr.onNight,
    every: pr.every ?? 0, // > 0: fires again every that many night entries after onNight (a relocation's lap)
    tell: pr.tell ?? null,
    cells: expandCells(pr.set ?? []),
    sound: pr.sound ?? null, // an extra sound when it fires (SOUNDS name), e.g. doorThunk
  }));
  const skins = (def.skins ?? []).map((sk) => {
    if (!SKIN_KINDS.includes(sk.kind)) throw new Error(`${def.name}: unknown skin kind "${sk.kind}"`);
    if (sk.kind === 'doorPile' && sk.w !== undefined && sk.w !== 2) throw new Error(`${def.name}: a door pile is 2 tiles wide (two doors lying flat)`);
    if ((sk.kind === 'door' || sk.kind === 'pillar') && sk.w !== undefined && sk.w !== 1) throw new Error(`${def.name}: a ${sk.kind} is 1 tile wide`);
    if (sk.layer !== undefined && sk.layer !== 'day' && sk.layer !== 'night') throw new Error(`${def.name}: skin layer must be 'day' or 'night' (or left out for both)`);
    const [dw, dh] = SKIN_SIZE[sk.kind];
    const layer = sk.layer === 'night' ? NIGHT : sk.layer === 'day' ? DAY : null;
    const out = { kind: sk.kind, tx: sk.tx, ty: sk.ty, w: sk.w ?? dw, h: sk.h ?? dh, layer };
    const c = skinCells(out);
    if (!(c.x0 >= 0 && c.x1 < w && c.y0 >= 0 && c.y1 < h)) throw new Error(`${def.name}: skin ${sk.kind} at ${sk.tx},${sk.ty} is outside the grid`);
    return out;
  });
  const freaks = (def.freaks ?? []).map((f, i) => ({
    id: f.id ?? `freak${i}`,
    kind: f.kind,
    shift: f.kind === 'daywalker' ? DAY : NIGHT, // which shift it lives on
    tx: f.tx,
    ty: f.ty,
    range: f.range ?? 0,
    speed: f.speed ?? 0,
    period: f.period ?? 1,
    duty: f.duty ?? 1,
    phase: f.phase ?? 0,
    startDir: f.startFacing === 'left' ? -1 : 1, // supervisor: first facing
  }));
  return {
    name: def.name,
    par: def.par,
    rev: def.rev ?? 1, // a reworked level's revision: saves ignore bests from another one (save.js)
    w,
    h,
    spawnLayer: def.spawnLayer ?? DAY,
    layers,
    spawn,
    exit,
    checkpoints,
    pranks,
    freaks,
    skins,
    decor: def.decor ?? [],
    offset: def.offset ?? null,
    upsideDown: !!def.upsideDown, // the night is the day turned over, gravity included (gravitySign)
    nightGenerated: !def.night, // the night grid was generated from the day one (offset, upside down)
  };
}

// A generated night grid. `offset: { dx, dy }` (in tiles) moves the day grid: night[y][x] = day[y - dy][x - dx],
// '.' outside the grid. `upsideDown` turns it over: night[y] = day[h - 1 - y]. S/E/C are shared markers and are
// stripped from the copy — they are not moved. `nightPatch` rectangles (the prank `set` format minus `layer`)
// then apply differences: the exit approach, hazards.
function generateNight(def) {
  if (!def.offset && !def.upsideDown) return null;
  const { dx = 0, dy = 0 } = def.offset ?? {};
  const h = def.day.length;
  const w = def.day[0].length;
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    for (let x = 0; x < w; x++) {
      const sy = def.upsideDown ? h - 1 - y : y - dy;
      const sx = def.upsideDown ? x : x - dx;
      const ch = sy >= 0 && sy < h && sx >= 0 && sx < w ? def.day[sy][sx] : '.';
      row += ch === 'S' || ch === 'E' || ch === 'C' ? '.' : ch;
    }
    rows.push(row.split(''));
  }
  for (const r of def.nightPatch ?? []) {
    for (let ty = r.y0; ty <= (r.y1 ?? r.y0); ty++) {
      for (let tx = r.x0; tx <= (r.x1 ?? r.x0); tx++) {
        if (ty >= 0 && ty < h && tx >= 0 && tx < w) rows[ty][tx] = r.ch;
      }
    }
  }
  return rows.map((r) => r.join(''));
}

// Prank cell sets: { layer: 'day'|'night', x0, x1, y0, y1, ch } rectangles → [layer, tx, ty, ch]
function expandCells(rects) {
  const out = [];
  for (const r of rects) {
    const layer = r.layer === 'night' ? NIGHT : DAY;
    for (let ty = r.y0; ty <= (r.y1 ?? r.y0); ty++) {
      for (let tx = r.x0; tx <= (r.x1 ?? r.x0); tx++) out.push([layer, tx, ty, r.ch]);
    }
  }
  return out;
}

// ---------- geometry ----------

// Gravity per shift: 1 pulls down the screen; -1 (only the night of an upside-down level) pulls up. Every rule
// that knows which way is down reads this, so the flipped night is the day's rules mirrored.
export function gravitySign(level, layer) {
  return level.upsideDown && layer === NIGHT ? -1 : 1;
}

// `ov` holds geometry changed by the freaks' pranks: { 'layer,tx,ty': ch }.
// Outside the grid: side walls, a solid ceiling and an open floor (falling out is death); a flipped layer has
// them the other way up (open above, solid below).
export function tileAt(level, layer, tx, ty, ov = NO_OV) {
  if (tx < 0 || tx >= level.w) return '#'; // side walls
  if (ty < 0) return gravitySign(level, layer) > 0 ? '#' : '.'; // the ceiling
  if (ty >= level.h) return gravitySign(level, layer) > 0 ? '.' : '#'; // the open floor
  const k = `${layer},${tx},${ty}`;
  if (k in ov) return ov[k];
  return level.layers[layer][ty][tx];
}
const NO_OV = Object.freeze({});

const EPS = 1e-6;

// '#' is ordinary solid, '~' is wet floor (solid but low friction). Rules and
// renderer share this so they can't disagree about what counts as ground.
export function isSolidChar(ch) {
  return ch === '#' || ch === '~';
}

function tileSpan(x, w) {
  return [Math.floor(x / TILE), Math.floor((x + w - EPS) / TILE)];
}

export function overlapsSolid(level, layer, x, y, w = PARAMS.playerW, h = PARAMS.playerH, ov = NO_OV) {
  const [x0, x1] = tileSpan(x, w);
  const [y0, y1] = tileSpan(y, h);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolidChar(tileAt(level, layer, tx, ty, ov))) return true;
    }
  }
  return false;
}

// A hazard's hitbox is the 45% of its tile on the floor side: the bottom, or the top on a flipped layer.
export function overlapsHazard(level, layer, x, y, w = PARAMS.playerW, h = PARAMS.playerH, ov = NO_OV) {
  const [x0, x1] = tileSpan(x, w);
  const [y0, y1] = tileSpan(y, h);
  const hz = TILE * PARAMS.hazardHeight;
  const up = gravitySign(level, layer) < 0;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tileAt(level, layer, tx, ty, ov) !== '^') continue;
      if (up) {
        const bottom = ty * TILE + hz;
        if (y < bottom - EPS && y + h > ty * TILE) return true;
      } else {
        const top = (ty + 1) * TILE - hz;
        if (y + h > top + EPS && y < (ty + 1) * TILE) return true;
      }
    }
  }
  return false;
}

function overlapsTile(p, tx, ty) {
  return (
    p.x < (tx + 1) * TILE && p.x + PARAMS.playerW > tx * TILE &&
    p.y < (ty + 1) * TILE && p.y + PARAMS.playerH > ty * TILE
  );
}

// Ground is 1 px away in the direction gravity pulls.
function isGrounded(level, layer, p, ov) {
  return overlapsSolid(level, layer, p.x, p.y + gravitySign(level, layer), undefined, undefined, ov);
}

// Low friction applies only while every tile under the feet is wet: one dry tile gives grip.
function onWetFloor(level, s) {
  const p = s.player;
  if (!p.grounded) return false;
  const ty = gravitySign(level, s.layer) > 0 ? Math.floor((p.y + PARAMS.playerH + 1) / TILE) : Math.floor((p.y - 1) / TILE);
  const [x0, x1] = tileSpan(p.x, PARAMS.playerW);
  let wet = false;
  for (let tx = x0; tx <= x1; tx++) {
    const ch = tileAt(level, s.layer, tx, ty, s.overrides);
    if (ch === '~') wet = true;
    else if (isSolidChar(ch)) return false; // any dry floor under a foot gives grip; air doesn't
  }
  return wet;
}

const solidAt = (level, s, layer, x, y) => overlapsSolid(level, layer, x, y, undefined, undefined, s.overrides);

// ---------- freaks ----------
// Never fully shown. Fixed patterns only (no AI), driven by a clock that runs only on the
// night shift: switch to day and every freak freezes mid-stride.

export const FREAK = Object.freeze({ w: 20, h: 22 });

function pingpong(d, len) {
  if (len <= 0) return 0;
  const m = ((d % (2 * len)) + 2 * len) % (2 * len);
  return m < len ? m : 2 * len - m;
}

// The supervisor faces startDir for each [2kP,(2k+1)P) window of the night clock, the other
// way otherwise. A freak is watched while the facing matches its side; its own pattern sees
// only the accumulated watched time, so unwatched freaks freeze mid-pose instead of jumping.
export function supervisorFacing(f, t) {
  return Math.floor(t / f.period) % 2 === 0 ? f.startDir : -f.startDir;
}

export function watchedClock(side, sup, t) {
  const P = sup.period;
  const k = Math.floor(t / (2 * P));
  const r = t - 2 * k * P;
  const startSide = k * P + Math.min(r, P); // night-time the start side has been watched
  return side === sup.startDir ? startSide : t - startSide;
}

export function freakBoxes(level, s) {
  const sup = level.freaks.find((f) => f.kind === 'supervisor');
  const facing = sup ? supervisorFacing(sup, s.freakClock) : 0;
  return level.freaks.map((f) => {
    const baseX = f.tx * TILE + (TILE - FREAK.w) / 2;
    const hang = gravitySign(level, f.shift) < 0; // a freak of a flipped shift hangs from the solid above its cell
    const y = hang ? f.ty * TILE : (f.ty + 1) * TILE - FREAK.h;
    let x = baseX;
    let active = true;
    let face = 0;
    let turnIn = Infinity;
    if (f.kind === 'supervisor') {
      face = facing;
      turnIn = (Math.floor(s.freakClock / f.period) + 1) * f.period - s.freakClock;
    } else {
      let t = f.shift === DAY ? s.dayClock : s.freakClock; // each shift runs its own clock
      if (sup && f.shift === NIGHT) {
        const side = Math.sign(f.tx - sup.tx) || 0;
        active = side !== 0 && facing === side; // only works while the clipboard points its way
        t = watchedClock(side, sup, s.freakClock);
      }
      if (f.kind === 'lurker' || f.kind === 'daywalker') x = baseX + pingpong(f.phase + t * f.speed, f.range * TILE);
      if (f.kind === 'peeker') active = active && ((t + f.phase) % f.period) < f.duty * f.period;
    }
    return { id: f.id, kind: f.kind, shift: f.shift, x, y, w: FREAK.w, h: FREAK.h, active, facing: face, turnIn, hang };
  });
}

// The freak currently touching the player on its own shift, if any. The supervisor is
// management: it never spooks.
function touchedFreak(level, s) {
  const p = s.player;
  return freakBoxes(level, s).find((b) =>
    b.kind !== 'supervisor' && b.shift === s.layer && b.active &&
    p.x < b.x + b.w && p.x + PARAMS.playerW > b.x && p.y < b.y + b.h && p.y + PARAMS.playerH > b.y);
}

// ---------- state ----------

// Where you stand in a cell: on its floor, or with gravity -1 hanging under the cell above (head at its top).
export function spawnPoint(tx, ty, sign = 1) {
  return {
    x: tx * TILE + (TILE - PARAMS.playerW) / 2,
    y: sign > 0 ? (ty + 1) * TILE - PARAMS.playerH : ty * TILE,
  };
}

// The spot in a cell where you'd stand under that shift's gravity, or null when it's inside solid or has no
// ground. Spawn, checkpoint saves and respawns use it (and the fairness test), so a respawn is always grounded.
export function standableSpot(level, layer, tx, ty, ov = NO_OV) {
  const pos = spawnPoint(tx, ty, gravitySign(level, layer));
  if (overlapsSolid(level, layer, pos.x, pos.y, undefined, undefined, ov)) return null;
  return isGrounded(level, layer, pos, ov) ? pos : null;
}

export function initState(level) {
  const layer = level.spawnLayer;
  const pos = spawnPoint(level.spawn.tx, level.spawn.ty, gravitySign(level, layer));
  const player = { ...pos, vx: 0, vy: 0, facing: 1, grounded: false, coyote: 0, jumpBuf: 0, rising: false };
  player.grounded = isGrounded(level, layer, player, NO_OV);
  player.coyote = player.grounded ? PARAMS.coyoteTime : 0;
  return {
    layer,
    player,
    shiftPending: 0, // seconds left on a buffered shift request
    shifts: 0, // successful shifts this run (the timecard)
    deaths: 0,
    checkpoint: { ...pos, layer, id: null, overrides: {}, nightEntries: 0 },
    won: false,
    time: 0,
    nightEntries: 0, // successful shifts into night: the freaks act on these
    overrides: {}, // geometry their pranks changed
    freakClock: 0, // advances only on the night shift
    dayClock: 0, // advances only on the day shift (the day-walker's clock)
    events: [], // things that happened this step, for audio/fx
  };
}

export const NO_INPUT = Object.freeze({ left: false, right: false, jumpHeld: false, jumpPressed: false, shiftPressed: false });

// ---------- shifting ----------

// Pranks due on the next entry into night. The freaks act in the moment of transition,
// the one moment the player can't see.
function pranksFor(level, entry) {
  return level.pranks.filter((pr) => pr.onNight === entry || (pr.every > 0 && entry > pr.onNight && (entry - pr.onNight) % pr.every === 0));
}

function withPranks(ov, pranks) {
  if (pranks.length === 0) return ov;
  const next = { ...ov };
  for (const pr of pranks) for (const [layer, tx, ty, ch] of pr.cells) next[`${layer},${tx},${ty}`] = ch;
  return next;
}

// The tile overrides after `entries` night clock-ins: each entry's due pranks applied in order, as tryShift does.
// The fairness test uses it to check respawn spots that only a prank creates.
export function overridesAfter(level, entries) {
  let ov = {};
  for (let e = 1; e <= entries; e++) ov = withPranks(ov, pranksFor(level, e));
  return ov;
}

// Attempt the pending shift. Order: clean → corner nudge → keep buffering.
// The destination is validated against the geometry as it will be after any due prank.
function tryShift(level, s) {
  const p = s.player;
  const target = 1 - s.layer;
  const entry = target === NIGHT ? s.nightEntries + 1 : null;
  const due = entry ? pranksFor(level, entry) : [];
  const ov = withPranks(s.overrides, due);
  const blocked = (x, y) => overlapsSolid(level, target, x, y, undefined, undefined, ov);
  let dx = 0;
  let dy = 0;
  if (blocked(p.x, p.y)) {
    const dir = p.vx !== 0 ? Math.sign(p.vx) : p.facing;
    const up = -gravitySign(level, target); // against the destination's gravity first
    const candidates = [];
    for (let d = 1; d <= PARAMS.shiftNudge; d++) candidates.push([0, up * d]);
    for (let d = 1; d <= PARAMS.shiftNudge; d++) candidates.push([dir * d, 0]);
    for (let d = 1; d <= PARAMS.shiftNudge; d++) candidates.push([-dir * d, 0]);
    for (let d = 1; d <= PARAMS.shiftNudge; d++) candidates.push([0, -up * d]);
    const hit = candidates.find(([cx, cy]) => !blocked(p.x + cx, p.y + cy));
    if (!hit) return false;
    [dx, dy] = hit;
  }
  p.x += dx;
  p.y += dy;
  s.layer = target;
  s.shifts += 1;
  s.shiftPending = 0;
  s.overrides = ov;
  if (entry) s.nightEntries = entry;
  // S-5.5: recompute contacts immediately, by step 6's rule: touching a floor you're moving away from isn't
  // standing on it (a flip can leave you flush against the new floor on your way off it)
  p.grounded = gravitySign(level, s.layer) * p.vy >= 0 && isGrounded(level, s.layer, p, s.overrides);
  if (gravitySign(level, target) !== gravitySign(level, 1 - target)) {
    // gravity turned over: what you were rising against is now a fall, and no mid-air jump right after a flip
    p.rising = false;
    if (!p.grounded) p.coyote = 0;
  }
  s.events.push({ type: 'shift', layer: target, nudged: dx !== 0 || dy !== 0 });
  for (const pr of due) s.events.push({ type: 'prank', id: pr.id });
  return true;
}

// ---------- step ----------

function approach(v, target, amount) {
  if (v < target) return Math.min(v + amount, target);
  if (v > target) return Math.max(v - amount, target);
  return v;
}

function die(level, s, cause, by) {
  s.deaths += 1;
  s.events.push({ type: 'death', cause, by, x: s.player.x, y: s.player.y, layer: s.layer });
  const p = s.player;
  p.x = s.checkpoint.x;
  p.y = s.checkpoint.y;
  p.vx = 0;
  p.vy = 0;
  p.coyote = 0;
  p.jumpBuf = 0;
  p.rising = false;
  s.layer = s.checkpoint.layer;
  // GDD §9.3: level objects return to the checkpoint's state, so a prank can never softlock a run
  s.overrides = s.checkpoint.overrides;
  s.nightEntries = s.checkpoint.nightEntries;
  s.shiftPending = 0;
  p.grounded = isGrounded(level, s.layer, p, s.overrides);
  s.events.push({ type: 'respawn' });
}

export function step(level, prev, input = NO_INPUT, dt = DT) {
  const s = structuredClone(prev);
  s.events = [];
  if (s.won) return s;
  s.time += dt;
  const p = s.player;
  const P = PARAMS;

  // 1. Shift first, so a jump on the same tick sees the new world (GDD §13.7 case 10).
  if (input.shiftPressed) s.shiftPending = P.shiftBuffer; // a new press replaces a pending one
  if (s.shiftPending > 0 && !tryShift(level, s)) {
    s.shiftPending -= dt;
    if (s.shiftPending <= EPS) {
      s.shiftPending = 0;
      s.events.push({ type: 'shiftFail' });
    }
  }

  // 2. Each shift's clock moves only while you're in it. A peeker popping out (hidden before the tick, out
  // after it) is an event, for the boing; its clock runs only at night, so that's the only time it can pop.
  if (s.layer === NIGHT) {
    for (const f of level.freaks) {
      if (f.kind === 'supervisor' && supervisorFacing(f, s.freakClock) !== supervisorFacing(f, s.freakClock + dt)) {
        s.events.push({ type: 'supervisorTurn', id: f.id, facing: supervisorFacing(f, s.freakClock + dt) });
      }
    }
    const before = level.freaks.some((f) => f.kind === 'peeker') ? freakBoxes(level, s) : null;
    s.freakClock += dt;
    if (before) {
      freakBoxes(level, s).forEach((b, i) => {
        if (b.kind === 'peeker' && b.active && !before[i].active) s.events.push({ type: 'peek', id: b.id });
      });
    }
  } else s.dayClock += dt;

  // 3. Horizontal intent. Wet floor `~` swaps the ground accel/decel for the slick pair.
  const wet = onWetFloor(level, s);
  const accel = wet ? P.wetAccel : p.grounded ? P.groundAccel : P.airAccel;
  const decel = wet ? P.wetDecel : p.grounded ? P.groundDecel : P.airDecel;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) p.facing = dir;
  if (dir !== 0) {
    // turning around uses decel + accel for snappier reversals — but not on wax, where only grip stops you
    const boost = !wet && Math.sign(p.vx) === -dir ? decel : 0;
    p.vx = approach(p.vx, dir * P.maxSpeed, (accel + boost) * dt);
  } else {
    const before = p.vx;
    p.vx = approach(p.vx, 0, decel * dt);
    if (wet && before !== 0 && p.vx === 0) s.events.push({ type: 'wetStop' });
  }

  // 4. Jump: buffer, coyote (which carries across shifts of the same gravity), variable height. `sign` is the
  // gravity after the shift resolved: every vertical rule below is the same rule mirrored on a flipped night.
  const sign = gravitySign(level, s.layer);
  if (input.jumpPressed) p.jumpBuf = P.jumpBuffer;
  else p.jumpBuf = Math.max(0, p.jumpBuf - dt);
  if (p.grounded) p.coyote = P.coyoteTime;
  if (p.jumpBuf > 0 && (p.grounded || p.coyote > 0)) {
    p.vy = -sign * P.jumpVelocity;
    p.jumpBuf = 0;
    p.coyote = 0;
    p.grounded = false;
    p.rising = true;
    s.events.push({ type: 'jump', x: p.x, y: p.y, layer: s.layer });
  }
  if (p.rising && !input.jumpHeld && sign * p.vy < 0) {
    p.vy *= P.jumpCut;
    p.rising = false;
  }
  if (sign * p.vy >= 0) p.rising = false;

  // 5. Gravity.
  p.vy = sign * Math.min(sign * p.vy + P.gravity * dt, P.maxFall);

  // 6. Move X, then Y, resolving against the active layer only.
  p.x += p.vx * dt;
  if (solidAt(level, s, s.layer, p.x, p.y)) {
    if (p.vx > 0) p.x = Math.floor((p.x + P.playerW) / TILE) * TILE - P.playerW;
    else if (p.vx < 0) p.x = (Math.floor(p.x / TILE) + 1) * TILE;
    p.vx = 0;
  }
  const wasGrounded = p.grounded;
  p.y += p.vy * dt;
  if (solidAt(level, s, s.layer, p.x, p.y)) {
    if (p.vy > 0) p.y = Math.floor((p.y + P.playerH) / TILE) * TILE - P.playerH;
    else if (p.vy < 0) p.y = (Math.floor(p.y / TILE) + 1) * TILE;
    p.vy = 0;
    p.rising = false;
  }
  p.grounded = sign * p.vy >= 0 && isGrounded(level, s.layer, p, s.overrides);
  p.coyote = p.grounded ? P.coyoteTime : Math.max(0, p.coyote - dt);
  if (p.grounded && !wasGrounded) s.events.push({ type: 'land', x: p.x, y: p.y, layer: s.layer });

  // 7. Hazards, freaks, and falling out.
  if (overlapsHazard(level, s.layer, p.x, p.y, undefined, undefined, s.overrides)) { die(level, s, 'hazard'); return s; }
  const fb = touchedFreak(level, s);
  if (fb) { die(level, s, 'spooked', fb.kind); return s; }
  if (sign > 0 ? p.y > level.h * TILE + 60 : p.y + P.playerH < -60) { die(level, s, 'fall'); return s; }

  // 8. Shared objects: checkpoints and exit exist in both shifts.
  // A checkpoint saves you in the shift you touched it in, but only where you'd respawn on ground (standing,
  // or hanging on a flipped night): touched mid-air over a pit, it saves in the other shift if that one has
  // ground, else not at all. (Otherwise a respawn would drop straight back into the pit, forever.)
  for (const c of level.checkpoints) {
    if (c.id !== s.checkpoint.id && overlapsTile(p, c.tx, c.ty)) {
      const here = standableSpot(level, s.layer, c.tx, c.ty, s.overrides);
      const there = here ? null : standableSpot(level, 1 - s.layer, c.tx, c.ty, s.overrides);
      if (!here && !there) continue;
      const layer = here ? s.layer : 1 - s.layer;
      s.checkpoint = { ...(here ?? there), layer, id: c.id, overrides: s.overrides, nightEntries: s.nightEntries };
      s.events.push({ type: 'checkpoint', id: c.id });
    }
  }
  if (overlapsTile(p, level.exit.tx, level.exit.ty)) {
    s.won = true;
    s.events.push({ type: 'win', shifts: s.shifts, par: level.par });
  }
  return s;
}

// Debug/test helper: does the player currently overlap solid in the active layer?
export function isEmbedded(level, s) {
  return solidAt(level, s, s.layer, s.player.x, s.player.y);
}
