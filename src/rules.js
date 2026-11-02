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
  wetAccel: 900, // px/s² while grounded on wet floor `~` (grip is 2600)
  wetDecel: 250, // px/s² (grip is 3000): you keep sliding
});

export const DAY = 0;
export const NIGHT = 1;

// ---------- level parsing ----------

// A level is { name, par, day: string[], night: string[] }.
// Legend: '#' solid, '^' hazard, 'S' spawn, 'E' exit, 'C' checkpoint, '.' empty.
// S, E and C are shared between shifts and may be written in either grid.
export function parseLevel(def) {
  const { day, night } = def;
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
    tell: pr.tell ?? null,
    cells: expandCells(pr.set ?? []),
  }));
  const freaks = (def.freaks ?? []).map((f, i) => ({
    id: f.id ?? `freak${i}`,
    kind: f.kind,
    tx: f.tx,
    ty: f.ty,
    range: f.range ?? 0,
    speed: f.speed ?? 0,
    period: f.period ?? 1,
    duty: f.duty ?? 1,
    phase: f.phase ?? 0,
  }));
  return {
    name: def.name,
    par: def.par,
    w,
    h,
    spawnLayer: def.spawnLayer ?? DAY,
    layers,
    spawn,
    exit,
    checkpoints,
    pranks,
    freaks,
    decor: def.decor ?? [],
  };
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

// `ov` holds geometry changed by the freaks' pranks: { 'layer,tx,ty': ch }.
export function tileAt(level, layer, tx, ty, ov = NO_OV) {
  if (tx < 0 || tx >= level.w) return '#'; // side walls
  if (ty < 0) return '#'; // ceiling
  if (ty >= level.h) return '.'; // open below: falling out is death
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

export function overlapsHazard(level, layer, x, y, w = PARAMS.playerW, h = PARAMS.playerH, ov = NO_OV) {
  const [x0, x1] = tileSpan(x, w);
  const [y0, y1] = tileSpan(y, h);
  const hz = TILE * PARAMS.hazardHeight;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tileAt(level, layer, tx, ty, ov) !== '^') continue;
      const top = (ty + 1) * TILE - hz;
      if (y + h > top + EPS && y < (ty + 1) * TILE) return true;
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

function isGrounded(level, layer, p, ov) {
  return overlapsSolid(level, layer, p.x, p.y + 1, undefined, undefined, ov);
}

// Low friction applies only while every tile under the feet is wet: one dry tile gives grip.
function onWetFloor(level, s) {
  const p = s.player;
  if (!p.grounded) return false;
  const ty = Math.floor((p.y + PARAMS.playerH + 1) / TILE);
  const [x0, x1] = tileSpan(p.x, PARAMS.playerW);
  for (let tx = x0; tx <= x1; tx++) {
    if (tileAt(level, s.layer, tx, ty, s.overrides) !== '~') return false;
  }
  return true;
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

export function freakBoxes(level, s) {
  const t = s.freakClock;
  return level.freaks.map((f) => {
    const baseX = f.tx * TILE + (TILE - FREAK.w) / 2;
    const y = (f.ty + 1) * TILE - FREAK.h;
    let x = baseX;
    let active = true;
    if (f.kind === 'lurker') x = baseX + pingpong(f.phase + t * f.speed, f.range * TILE);
    if (f.kind === 'peeker') active = ((t + f.phase) % f.period) < f.duty * f.period;
    return { id: f.id, kind: f.kind, x, y, w: FREAK.w, h: FREAK.h, active };
  });
}

function touchesFreak(level, s) {
  if (s.layer !== NIGHT) return false;
  const p = s.player;
  return freakBoxes(level, s).some((b) =>
    b.active && p.x < b.x + b.w && p.x + PARAMS.playerW > b.x && p.y < b.y + b.h && p.y + PARAMS.playerH > b.y);
}

// ---------- state ----------

function spawnPoint(tx, ty) {
  return {
    x: tx * TILE + (TILE - PARAMS.playerW) / 2,
    y: (ty + 1) * TILE - PARAMS.playerH,
  };
}

export function initState(level) {
  const pos = spawnPoint(level.spawn.tx, level.spawn.ty);
  const layer = level.spawnLayer;
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
    events: [], // things that happened this step, for audio/fx
  };
}

export const NO_INPUT = Object.freeze({ left: false, right: false, jumpHeld: false, jumpPressed: false, shiftPressed: false });

// ---------- shifting ----------

// Pranks due on the next entry into night. The freaks act in the moment of transition,
// the one moment the player can't see.
function pranksFor(level, entry) {
  return level.pranks.filter((pr) => pr.onNight === entry);
}

function withPranks(ov, pranks) {
  if (pranks.length === 0) return ov;
  const next = { ...ov };
  for (const pr of pranks) for (const [layer, tx, ty, ch] of pr.cells) next[`${layer},${tx},${ty}`] = ch;
  return next;
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
    const candidates = [];
    for (let d = 1; d <= PARAMS.shiftNudge; d++) candidates.push([0, -d]);
    for (let d = 1; d <= PARAMS.shiftNudge; d++) candidates.push([dir * d, 0]);
    for (let d = 1; d <= PARAMS.shiftNudge; d++) candidates.push([-dir * d, 0]);
    for (let d = 1; d <= PARAMS.shiftNudge; d++) candidates.push([0, d]);
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
  p.grounded = isGrounded(level, s.layer, p, s.overrides); // S-5.5: recompute contacts immediately
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

function die(level, s, cause) {
  s.deaths += 1;
  s.events.push({ type: 'death', cause, x: s.player.x, y: s.player.y });
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

  // 2. The night keeps moving only while you're in it.
  if (s.layer === NIGHT) s.freakClock += dt;

  // 3. Horizontal intent. Wet floor `~` swaps the ground accel/decel for the slick pair.
  const wet = onWetFloor(level, s);
  const accel = wet ? P.wetAccel : p.grounded ? P.groundAccel : P.airAccel;
  const decel = wet ? P.wetDecel : p.grounded ? P.groundDecel : P.airDecel;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (dir !== 0) p.facing = dir;
  if (dir !== 0) {
    // turning around uses decel + accel for snappier reversals
    const boost = Math.sign(p.vx) === -dir ? decel : 0;
    p.vx = approach(p.vx, dir * P.maxSpeed, (accel + boost) * dt);
  } else {
    const before = p.vx;
    p.vx = approach(p.vx, 0, decel * dt);
    if (wet && before !== 0 && p.vx === 0) s.events.push({ type: 'wetStop' });
  }

  // 4. Jump: buffer, coyote (which carries across shifts), variable height.
  if (input.jumpPressed) p.jumpBuf = P.jumpBuffer;
  else p.jumpBuf = Math.max(0, p.jumpBuf - dt);
  if (p.grounded) p.coyote = P.coyoteTime;
  if (p.jumpBuf > 0 && (p.grounded || p.coyote > 0)) {
    p.vy = -P.jumpVelocity;
    p.jumpBuf = 0;
    p.coyote = 0;
    p.grounded = false;
    p.rising = true;
    s.events.push({ type: 'jump' });
  }
  if (p.rising && !input.jumpHeld && p.vy < 0) {
    p.vy *= P.jumpCut;
    p.rising = false;
  }
  if (p.vy >= 0) p.rising = false;

  // 5. Gravity.
  p.vy = Math.min(p.vy + P.gravity * dt, P.maxFall);

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
  p.grounded = p.vy >= 0 && isGrounded(level, s.layer, p, s.overrides);
  p.coyote = p.grounded ? P.coyoteTime : Math.max(0, p.coyote - dt);
  if (p.grounded && !wasGrounded) s.events.push({ type: 'land' });

  // 7. Hazards, freaks, and falling out.
  if (overlapsHazard(level, s.layer, p.x, p.y, undefined, undefined, s.overrides)) { die(level, s, 'hazard'); return s; }
  if (touchesFreak(level, s)) { die(level, s, 'spooked'); return s; }
  if (p.y > level.h * TILE + 60) { die(level, s, 'fall'); return s; }

  // 8. Shared objects: checkpoints and exit exist in both shifts.
  for (const c of level.checkpoints) {
    if (c.id !== s.checkpoint.id && overlapsTile(p, c.tx, c.ty)) {
      const pos = spawnPoint(c.tx, c.ty);
      s.checkpoint = { ...pos, layer: s.layer, id: c.id, overrides: s.overrides, nightEntries: s.nightEntries };
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
