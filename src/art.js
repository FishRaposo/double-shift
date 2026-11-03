// Double Shift art: everything that isn't a character sprite, drawn on the 2-px art grid.
// Tiles, background, hazards, the exit, checkpoints, notes, signs, props, effects and UI panels.
// Pure drawing helpers: they take a canvas context and data, and never read game state themselves.

import { ART, C, drawSprite, drawEyes, eyesOpen } from './sprites.js';
import { drawText, measureText } from './font.js';

import { TILE, DAY, NIGHT } from './rules.js';

export { TILE, DAY, NIGHT };
const A = ART;

// Per-shift palette (docs/ART.md §2). `echo` is how THIS shift's geometry looks when seen from the other one.
export const PAL = {
  [DAY]: {
    skyTop: '#f6e7c8', skyBot: '#e8c58c', window: 'rgba(255,255,255,0.22)', frame: 'rgba(120,90,50,0.1)',
    solid: '#6e5a45', mortar: '#5d4b39', brickHi: '#7d6852', lip: '#fbecc9', lipShade: '#c9ad84', shadow: '#4a3b2c',
    echo: 'rgba(255,170,80,0.95)', hatch: 'rgba(255,232,170,0.6)',
    hud: '#3b2d1f', hudSoft: 'rgba(59,45,31,0.85)', halo: 'rgba(246,231,200,0.9)',
  },
  [NIGHT]: {
    skyTop: '#0b1029', skyBot: '#1d2a56', window: 'rgba(255,214,110,0.12)', frame: 'rgba(120,150,255,0.05)',
    solid: '#2e4173', mortar: '#24345e', brickHi: '#3a5088', lip: '#5ff2ff', lipShade: '#3aa8bd', shadow: '#1a2647',
    echo: 'rgba(52,96,230,1)', hatch: 'rgba(95,242,255,0.35)',
    hud: '#d9f6ff', hudSoft: 'rgba(217,246,255,0.85)', halo: 'rgba(11,16,41,0.9)',
  },
};

// Identity colors the readability tests check (test/palette.test.mjs, ART.md §3.1).
// HUD plates: the shift's sky at 85%, behind HUD text over the playfield.
export const PLATE = { [DAY]: 'rgba(246,231,200,0.85)', [NIGHT]: 'rgba(11,16,41,0.85)' };
// The level note's paper strip.
export const NOTE_STRIP = { paper: C.paper, ink: C.paperInk, border: '#c9ad84' };
// Hazards: rebar spikes (alternating rows) on a base; the laser beam and the dim color it flickers to.
export const HAZARD = {
  rebarBase: '#7a3418', rebar: ['#e07a45', '#c4572a'],
  laser: '#ff3b5c', laserDim: '#c2283f', laserGlow: '255,59,92', emitter: '#ff9db0',
};

// fill an art-pixel rectangle: (x, y) in screen px, w/h in art px
export function px(g, x, y, w = 1, h = 1, color) {
  if (color) g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), w * A, h * A);
}

const hash = (a, b) => {
  const r = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return r - Math.floor(r);
};

// ---------- background ----------

export function drawBackground(g, layer, W, H, t = 0) {
  const pal = PAL[layer];
  // flat bands instead of a smooth gradient: reads as pixel art
  const bands = 8;
  for (let i = 0; i < bands; i++) {
    const k = i / (bands - 1);
    g.fillStyle = mix(pal.skyTop, pal.skyBot, k);
    g.fillRect(0, Math.floor((i * H) / bands), W, Math.ceil(H / bands) + 1);
  }
  if (layer === NIGHT) {
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(hash(i, 1) * W / A) * A;
      const y = Math.floor(hash(i, 2) * H * 0.7 / A) * A;
      const tw = 0.25 + 0.15 * Math.sin(t * 2 + i);
      px(g, x, y, 1, 1, `rgba(255,255,255,${tw})`);
    }
  }
  // the back wall's windows: quiet, never brighter than a solid's edge
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 160;
    px(g, x - 6, 60, 56, 100, pal.frame);
    const lit = layer === DAY || (i * 7) % 3 !== 0;
    if (!lit) continue;
    g.fillStyle = pal.window;
    for (const [dx, dy] of [[0, 6], [52, 6], [0, 102], [52, 102]]) g.fillRect(x + dx, 60 + dy, 48, 92);
  }
}

function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// ---------- tiles ----------
// T(layer, tx, ty) → tile char including pranks. isSolid(ch) decides collision-looking tiles.

export function drawSolidTile(g, tx, ty, layer, open) {
  const pal = PAL[layer];
  const x = tx * TILE;
  const y = ty * TILE;
  g.fillStyle = pal.solid;
  g.fillRect(x, y, TILE, TILE);
  if (layer === DAY) {
    // bricks: two courses per tile, staggered
    g.fillStyle = pal.mortar;
    g.fillRect(x, y + 7 * A, TILE, A);
    g.fillRect(x, y + 14 * A, TILE, A);
    const off = ty % 2 ? 7 : 0;
    g.fillRect(x + ((off + 3) % 15) * A, y, A, 7 * A);
    g.fillRect(x + ((off + 10) % 15) * A, y + 8 * A, A, 6 * A);
    if (hash(tx, ty) > 0.55) px(g, x + Math.floor(hash(ty, tx) * 10 + 2) * A, y + 2 * A, 3, 1, pal.brickHi);
  } else {
    // panels with corner rivets
    g.fillStyle = pal.mortar;
    g.fillRect(x + A, y + A, TILE - 2 * A, A);
    g.fillRect(x + A, y + TILE - 2 * A, TILE - 2 * A, A);
    g.fillRect(x + A, y + A, A, TILE - 2 * A);
    g.fillRect(x + TILE - 2 * A, y + A, A, TILE - 2 * A);
    g.fillStyle = 'rgba(95,242,255,0.3)';
    for (const [rx, ry] of [[3, 3], [11, 3], [3, 11], [11, 11]]) g.fillRect(x + rx * A, y + ry * A, A, A);
  }
  if (open.down) px(g, x, y + 14 * A, 15, 1, pal.shadow);
  if (open.left) px(g, x, y, 1, 15, pal.lip);
  if (open.right) px(g, x + 14 * A, y, 1, 15, pal.lip);
  if (open.up) {
    px(g, x, y, 15, 1, pal.lip);
    px(g, x, y + A, 15, 1, pal.lipShade);
  }
}

// diagonal hatch, continuous across tiles: "this won't be here on the other shift"
export function drawHatch(g, tx, ty, layer) {
  g.fillStyle = PAL[layer].hatch;
  for (let j = 2; j < 15; j++) {
    for (let i = 0; i < 15; i++) {
      if ((tx * 15 + i + ty * 15 + j) % 6 === 0) g.fillRect(tx * TILE + i * A, ty * TILE + j * A, A, A);
    }
  }
}

// dashed outline along a solid region's outer edges (the other shift's geometry)
export function drawEchoEdges(g, segs, color) {
  g.fillStyle = color;
  for (const [x0, y0, x1, y1, kind] of segs) {
    const horiz = y0 === y1;
    const len = (horiz ? x1 - x0 : y1 - y0) / A;
    for (let k = 0; k < len; k++) {
      const gk = Math.round((horiz ? x0 : y0) / A) + k;
      if (gk % 5 >= 3) continue;
      if (horiz) g.fillRect(x0 + k * A, kind === 'bot' ? y0 - A : y0, A, A);
      else g.fillRect(kind === 'right' ? x0 - A : x0, y0 + k * A, A, A);
    }
  }
}

// ---------- hazards ----------

const HZ = 7; // hazard height in art px (bottom 45% of a tile)

export function drawRebar(g, tx, ty) {
  const x = tx * TILE;
  const base = (ty + 1) * TILE;
  px(g, x, base - A, 15, 1, HAZARD.rebarBase);
  for (let i = 0; i < 3; i++) {
    const sx = x + i * 5 * A;
    // a 5-wide spike: two rows each at widths 5, 3, 1
    for (let r = 0; r < 6; r++) {
      const w = r < 2 ? 5 : r < 4 ? 3 : 1;
      px(g, sx + ((5 - w) / 2) * A, base - (r + 2) * A, w, 1, HAZARD.rebar[r % 2]);
    }
  }
}

export function drawLaser(g, tx, ty, t, leftEnd, rightEnd) {
  const x = tx * TILE;
  const base = (ty + 1) * TILE;
  const y = base - 4 * A;
  const on = Math.sin(t * 18 + tx) > -0.3;
  px(g, x, y - A, 15, 3, `rgba(${HAZARD.laserGlow},${on ? 0.28 : 0.14})`);
  px(g, x, y, 15, 1, on ? HAZARD.laser : HAZARD.laserDim);
  if (leftEnd) { px(g, x, base - HZ * A, 2, HZ, HAZARD.emitter); px(g, x, base - HZ * A, 2, 1, '#ffffff'); }
  if (rightEnd) { px(g, x + 13 * A, base - HZ * A, 2, HZ, HAZARD.emitter); px(g, x + 13 * A, base - HZ * A, 2, 1, '#ffffff'); }
}

export function drawHazardEcho(g, tx, ty, color) {
  const x = tx * TILE;
  const top = (ty + 1) * TILE - HZ * A;
  g.fillStyle = color;
  for (let i = 1; i < 14; i += 2) { g.fillRect(x + i * A, top, A, A); g.fillRect(x + i * A, top + (HZ - 1) * A, A, A); }
  for (let j = 0; j < HZ; j += 2) { g.fillRect(x + A, top + j * A, A, A); g.fillRect(x + 13 * A, top + j * A, A, A); }
}

// ---------- shared objects ----------

export function drawExit(g, tx, ty, layer) {
  const x = tx * TILE;
  const y = ty * TILE - TILE; // two tiles tall, standing on the floor
  const door = layer === DAY ? '#3d7a4a' : '#1f6b47';
  px(g, x + A, y + 2 * A, 13, 28, '#9dffb8');
  px(g, x + 2 * A, y + 3 * A, 11, 27, door);
  px(g, x + 4 * A, y + 6 * A, 7, 5, layer === DAY ? '#a9e6bc' : '#5fd18f'); // window
  px(g, x + 10 * A, y + 17 * A, 2, 2, '#9dffb8'); // knob
  // lit sign
  const sw = 21;
  px(g, x + (15 - sw) / 2 * A, y - 9 * A, sw, 9, '#06210f');
  px(g, x + ((15 - sw) / 2 + 1) * A, y - 8 * A, sw - 2, 7, '#2bdc6a');
  drawText(g, 'EXIT', x + TILE / 2, y - 7 * A + 1, { scale: 1, color: '#06210f', align: 'center' });
}

// pixel circle helper
function ring(g, cx, cy, r, color) {
  g.fillStyle = color;
  const steps = Math.max(12, Math.round(r * 1.2));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    g.fillRect(Math.round((cx + Math.cos(a) * r) / A) * A, Math.round((cy + Math.sin(a) * r) / A) * A, A, A);
  }
}

export function drawCheckpoint(g, tx, ty, on, ping = 0) {
  const cx = tx * TILE + TILE / 2;
  const floor = (ty + 1) * TILE;
  px(g, cx - A, floor - 11 * A, 2, 11, '#6b5a48');
  px(g, cx - 3 * A, floor - A, 6, 1, '#4a3b2c');
  const r = 3 + (ping > 0 ? Math.round(ping * 2) : 0);
  const face = on ? '#ffd23f' : '#9a9a9a';
  // clock face: pixel disc
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      if (i * i + j * j > r * r + 1) continue;
      const edge = i * i + j * j > (r - 1) * (r - 1) + 1;
      px(g, cx + i * A - A / 2, floor - (14 + j) * A - A / 2, 1, 1, edge ? '#2a2018' : face);
    }
  }
  px(g, cx - A / 2, floor - 16 * A - A / 2, 1, 2, '#2a2018');
  px(g, cx - A / 2, floor - 14 * A - A / 2, 2, 1, '#2a2018');
}

// sticky note / sign with pixel text; style: 'note' | 'paper' | 'green' | 'red'
export function drawSign(g, cx, cy, text, style = 'note', scale = 1) {
  const bg = { note: C.note, paper: C.paper, green: '#2bdc6a', red: '#e0473c' }[style];
  const ink = { note: '#5a3d10', paper: C.paperInk, green: '#06210f', red: '#fff4e0' }[style];
  const tw = Math.ceil(measureText(text, scale) / A);
  const w = tw + 6;
  const h = 7 * scale / A + 6;
  const x = Math.round(cx - (w * A) / 2);
  const y = Math.round(cy - (h * A) / 2);
  px(g, x + A, y + A, w, h, 'rgba(0,0,0,0.25)');
  px(g, x, y, w, h, bg);
  if (style === 'note') px(g, x + Math.floor(w / 2 - 2) * A, y - A, 4, 2, 'rgba(255,255,255,0.7)'); // tape
  drawText(g, text, x + 3 * A, y + 3 * A, { scale, color: ink });
}

// ---------- the freaks (sprites + eyes) ----------

// b: freak box from rules.freakBoxes. layer: shift being drawn. freakShift: the shift it lives on.
export function drawFreak(g, b, i, t, { layer, freakShift = NIGHT, frozenFlash = 0, prankSquint = 0, look = 0 }) {
  const kind = b.kind;
  const live = layer === freakShift;
  const flip = kind === 'supervisor' && b.facing < 0; // its facing is the planning tell, frozen or not
  if (live) {
    if (kind === 'peeker' && !b.active) {
      // ducked in: a dark slot with eyes
      px(g, b.x - A, b.y + b.h - 3 * A, 12, 3, 'rgba(0,0,0,0.6)');
      drawEyes(g, 'peeker', b.x, b.y + b.h - 13 * A + 2, { state: eyesOpen(t, i) ? 'open' : 'shut' });
      return;
    }
    const jitter = b.active ? Math.round(Math.sin(t * 14 + i) * 0.6) * A : 0;
    const frame = (kind === 'lurker' || kind === 'daywalker') && b.active ? (Math.floor(t * 6 + i) % 2 ? 'b' : 'a') : 'a';
    drawSprite(g, kind, frame, b.x + jitter, b.y, { flip });
    const state = !b.active ? 'shut' : prankSquint > 0 ? 'squint' : eyesOpen(t, i) ? 'open' : 'shut';
    drawEyes(g, kind, b.x + jitter, b.y, { state, look, flip });
  } else {
    // frozen on the other shift: dotted outline in its own shift's echo color
    const color = PAL[freakShift].echo;
    drawSprite(g, kind, 'a', b.x, b.y, { outline: color, alpha: frozenFlash > 0 ? 1 : 0.85, flip });
    if (frozenFlash > 0) drawSprite(g, kind, 'a', b.x, b.y, { outline: '#ffffff', alpha: frozenFlash, flip });
    if (b.active || kind === 'supervisor') drawEyes(g, kind, b.x, b.y, { state: 'open', alpha: 0.6, flip });
  }
}

// ---------- props (cosmetic, docs/ART.md §6.2) ----------
// Each draws relative to the tile it stands in: (x, y) = tile top-left. Floor props sit on the tile's bottom.

const wood = '#8a6a45';
const woodDark = '#6b5233';

export const PROPS = {
  noticeBoard(g, x, y) {
    px(g, x - 4 * A, y - 4 * A, 23, 16, woodDark);
    px(g, x - 3 * A, y - 3 * A, 21, 14, '#b58b5a');
    px(g, x - A, y - 2 * A, 6, 7, C.paper);
    px(g, x + 6 * A, y - A, 6, 5, C.note);
    px(g, x + 13 * A, y - 2 * A, 4, 8, '#dfe8f2');
    for (const [a, b] of [[1, -2], [8, -1], [14, -2]]) px(g, x + a * A, y + b * A, 1, 1, '#e0473c');
  },
  vent(g, x, y) {
    px(g, x, y + 2 * A, 15, 9, '#4f5b6e');
    px(g, x + A, y + 3 * A, 13, 7, '#262c38');
    for (let i = 0; i < 4; i++) px(g, x + A, y + (4 + i * 2) * A, 13, 1, '#6c7a90');
  },
  barrierTape(g, x, y, w = 1) {
    for (let i = 0; i < w * 15; i++) px(g, x + i * A, y + 8 * A, 1, 2, Math.floor(i / 3) % 2 ? '#ffcc33' : '#1b1209');
  },
  pallet(g, x, y) {
    const f = y + TILE;
    px(g, x, f - 4 * A, 15, 1, wood);
    px(g, x, f - 2 * A, 15, 1, wood);
    for (const i of [0, 7, 14]) px(g, x + i * A, f - 4 * A, 1, 4, woodDark);
  },
  crate(g, x, y) {
    const f = y + TILE;
    px(g, x + A, f - 12 * A, 13, 12, wood);
    px(g, x + A, f - 12 * A, 13, 1, '#a88358');
    px(g, x + 2 * A, f - 7 * A, 11, 1, woodDark);
    px(g, x + 4 * A, f - 11 * A, 7, 3, C.paper);
  },
  mopBucket(g, x, y) {
    const f = y + TILE;
    px(g, x + 3 * A, f - 6 * A, 9, 6, '#e8c72e');
    px(g, x + 4 * A, f - 6 * A, 7, 1, '#7fb8d8');
    px(g, x + 9 * A, f - 16 * A, 1, 11, '#b58b5a');
    px(g, x + 8 * A, f - 6 * A, 3, 2, '#d9d2c4');
  },
  wetFloorSign(g, x, y) {
    const f = y + TILE;
    px(g, x + 4 * A, f - 13 * A, 7, 13, '#e8c72e');
    px(g, x + 5 * A, f - 12 * A, 5, 11, C.note);
    px(g, x + 6 * A, f - 10 * A, 3, 3, '#1b1209');
    px(g, x + 6 * A, f - 5 * A, 3, 1, '#1b1209');
  },
  lostFoundBox(g, x, y) {
    const f = y + TILE;
    px(g, x + A, f - 9 * A, 13, 9, '#a07848');
    px(g, x + A, f - 9 * A, 13, 2, '#b88f5c');
    px(g, x + 3 * A, f - 6 * A, 9, 4, C.paper);
  },
  desk(g, x, y) {
    const f = y + TILE;
    px(g, x - 2 * A, f - 8 * A, 19, 2, woodDark);
    px(g, x - A, f - 6 * A, 2, 6, woodDark);
    px(g, x + 13 * A, f - 6 * A, 2, 6, woodDark);
    px(g, x + 3 * A, f - 10 * A, 9, 2, '#d9d2c4');
  },
  elevatorPanel(g, x, y) {
    px(g, x + 4 * A, y + 2 * A, 7, 12, '#9aa3ad');
    for (let i = 0; i < 4; i++) px(g, x + 6 * A, y + (4 + i * 2.5) * A, 3, 1, i === 1 ? '#ffd23f' : '#3b4048');
  },
  mug(g, x, y) {
    const f = y + TILE;
    px(g, x + 6 * A, f - 4 * A, 4, 4, '#f7efdc');
    px(g, x + 10 * A, f - 3 * A, 1, 2, '#f7efdc');
    px(g, x + 6 * A, f - 4 * A, 4, 1, '#5a3d10');
  },
  plaque(g, x, y) {
    px(g, x - 2 * A, y, 19, 13, '#b8862f');
    px(g, x - A, y + A, 17, 11, '#e2b955');
    px(g, x + 3 * A, y + 3 * A, 9, 6, C.freak);
    drawEyes(g, 'lurker', x + 2 * A, y - 2 * A, { state: 'open' });
  },
  coatRack(g, x, y) {
    const f = y + TILE;
    px(g, x + 7 * A, f - 22 * A, 1, 22, woodDark);
    px(g, x + 4 * A, f - 22 * A, 7, 1, woodDark);
    px(g, x + 3 * A, f - 21 * A, 3, 8, '#3d5a80');
    px(g, x + 4 * A, f - A, 7, 1, woodDark);
  },
  chalkCircles(g, x, y) {
    ring(g, x + TILE / 2, y + TILE - 3 * A, 10, 'rgba(240,240,230,0.55)');
    ring(g, x + TILE / 2, y + TILE - 3 * A, 5, 'rgba(240,240,230,0.4)');
  },
  footprints(g, x, y) {
    const f = y + TILE;
    for (let i = 0; i < 4; i++) px(g, x + (1 + i * 4) * A, f - (i % 2 ? 2 : 1) * A, 2, 1, 'rgba(0,0,0,0.35)');
  },
  timeClock(g, x, y) {
    px(g, x + 2 * A, y - 8 * A, 11, 13, '#9aa3ad');
    px(g, x + 3 * A, y - 7 * A, 9, 6, '#e8eef2');
    px(g, x + 7 * A, y - 6 * A, 1, 3, '#1b1209');
    px(g, x + 7 * A, y - 4 * A, 3, 1, '#1b1209');
    px(g, x + 5 * A, y + A, 5, 2, '#3b4048');
  },
  sign(g, x, y, opt = {}) {
    drawSign(g, x + TILE / 2, y + TILE / 2, opt.text ?? 'SIGN', opt.style ?? 'paper');
  },
  eyes(g, x, y, opt = {}) {
    drawEyes(g, 'lurker', x + TILE / 2 - 6 * A, y + 4 * A, { state: eyesOpen(opt.t ?? 0, opt.seed ?? 0) ? 'open' : 'shut' });
  },
};

// ---------- planned-level objects (built now, used when their levels are built) ----------

export function drawWetTile(g, tx, ty, layer, open, t = 0) {
  drawSolidTile(g, tx, ty, layer, { ...open, up: false });
  const pal = PAL[layer];
  const x = tx * TILE;
  const y = ty * TILE;
  if (open.up) {
    for (let i = 0; i < 15; i++) {
      const wave = Math.round(Math.sin((tx * 15 + i) * 0.7) * 0.6 + 0.4);
      px(g, x + i * A, y + wave * A, 1, 1, pal.lip);
      px(g, x + i * A, y + (wave + 1) * A, 1, 1, pal.lipShade);
    }
  }
  for (const [sx, sy] of [[3, 5], [9, 8]]) {
    for (let k = 0; k < 3; k++) px(g, x + (sx + k) * A, y + (sy - k) * A, 1, 1, layer === NIGHT ? 'rgba(95,242,255,0.55)' : 'rgba(251,236,201,0.6)');
  }
}

export function drawDoor(g, tx, ty, layer, rows = 2) {
  const pal = PAL[layer];
  const x = tx * TILE;
  const y = (ty - rows + 1) * TILE;
  px(g, x, y, 15, rows * 15, pal.lip);
  px(g, x + A, y + A, 13, rows * 15 - 1, pal.solid);
  px(g, x + 3 * A, y + 3 * A, 9, 7, pal.mortar);
  px(g, x + 3 * A, y + 13 * A, 9, rows * 15 - 16, pal.mortar);
  px(g, x + 11 * A, y + Math.floor(rows * 15 / 2) * A, 2, 2, '#9dffb8');
}

export function drawEmptyFrame(g, tx, ty, layer, rows = 2) {
  const x = tx * TILE;
  const y = (ty - rows + 1) * TILE;
  g.fillStyle = PAL[layer].hudSoft;
  g.fillRect(x, y, A, rows * TILE);
  g.fillRect(x + TILE - A, y, A, rows * TILE);
  g.fillRect(x, y, TILE, A);
}

export function drawDoorPile(g, tx, ty, layer, count) {
  const pal = PAL[layer];
  for (let i = 0; i < count; i++) {
    const y = (ty + 1) * TILE - (i + 1) * TILE;
    px(g, tx * TILE - A, y, 17 + 15, 15, pal.lip);
    px(g, tx * TILE, y + A, 15 + 15, 13, pal.solid);
    px(g, tx * TILE + 25 * A, y + 6 * A, 2, 2, '#9dffb8');
  }
}

export function drawPillar(g, tx, ty0, ty1, layer) {
  const pal = PAL[layer];
  const x = tx * TILE;
  const y = ty0 * TILE;
  const h = (ty1 - ty0 + 1) * 15;
  px(g, x, y, 15, h, pal.solid);
  px(g, x - A, y, 17, 2, pal.lip);
  px(g, x - A, y + (h - 2) * A, 17, 2, pal.lipShade);
  for (const c of [4, 10]) px(g, x + c * A, y + 3 * A, 1, h - 6, pal.mortar);
}

export function drawCrack(g, tx, ty, layer) {
  g.fillStyle = PAL[layer].hudSoft;
  const x = tx * TILE;
  const y = ty * TILE;
  for (let i = 0; i < 8; i++) g.fillRect(x + (4 + (i % 2) * 2 + i) * A, y + i * A, A, A);
}

export function drawPortrait(g, x, y, t, w = 3, h = 2) {
  px(g, x, y, w * 15, h * 15, '#3b2d1f');
  px(g, x + 2 * A, y + 2 * A, w * 15 - 4, h * 15 - 4, '#b8862f');
  px(g, x + 3 * A, y + 3 * A, w * 15 - 6, h * 15 - 6, C.freak);
  const cx = x + (w * TILE) / 2;
  drawEyes(g, 'lurker', cx - 7 * A, y + 4 * A, { state: eyesOpen(t, 3) ? 'open' : 'shut' });
  drawEyes(g, 'lurker', cx - 2 * A, y + 9 * A, { state: eyesOpen(t, 9) ? 'open' : 'shut', alpha: 0.7 });
}

// One entry of skinPlan() (src/skins.js): the object art over solid tiles. Portraits blink, so they need t.
export function drawSkin(g, sp, layer, t = 0) {
  if (sp.draw === 'door') drawDoor(g, sp.tx, sp.ty, layer, sp.h);
  else if (sp.draw === 'emptyFrame') drawEmptyFrame(g, sp.tx, sp.ty, layer, sp.h);
  else if (sp.draw === 'pillar') drawPillar(g, sp.tx, sp.ty - sp.h + 1, sp.ty, layer);
  else if (sp.draw === 'crack') drawCrack(g, sp.tx, sp.ty, layer);
  else if (sp.draw === 'doorPile') drawDoorPile(g, sp.tx, sp.ty, layer, sp.count);
  else if (sp.draw === 'portrait') drawPortrait(g, sp.tx * TILE, sp.ty * TILE, t, sp.w, sp.h);
}

// ---------- effects ----------

export function drawShiftRing(g, x, y, k, layer) {
  ring(g, x, y, 10 + k * 40, layer === NIGHT ? `rgba(95,242,255,${1 - k})` : `rgba(255,200,90,${1 - k})`);
}

export function drawDust(g, x, y, k) {
  const a = 1 - k;
  for (const d of [-1, 1]) {
    px(g, x + d * (4 + k * 10) * A / 2 - A / 2, y - (1 + k * 3) * A, 1, 1, `rgba(220,210,190,${a})`);
    px(g, x + d * (2 + k * 6) * A / 2 - A / 2, y - k * 2 * A, 1, 1, `rgba(220,210,190,${a * 0.7})`);
  }
}

export function drawPuff(g, x, y, k) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = 6 + k * 20;
    px(g, x + Math.cos(a) * r, y + Math.sin(a) * r, 2, 2, `rgba(255,255,255,${(1 - k) * 0.8})`);
  }
}

export function drawSparkle(g, x, y, k, seed = 0) {
  const a = Math.sin(k * Math.PI);
  for (let i = 0; i < 4; i++) {
    const sx = x + (hash(seed, i) - 0.5) * 24;
    const sy = y + (hash(i, seed) - 0.5) * 24 - k * 6;
    g.fillStyle = `rgba(255,236,90,${a})`;
    g.fillRect(Math.round(sx), Math.round(sy) - A, A, 3 * A);
    g.fillRect(Math.round(sx) - A, Math.round(sy), 3 * A, A);
  }
}

// ---------- UI ----------

// pixel panel with a 1-art-px border and notched corners. light: paper style; else night style.
export function drawPanel(g, x, y, w, h, light) {
  const bg = light ? C.paper : 'rgba(10,14,32,0.92)';
  const border = light ? C.paperInk : '#5ff2ff';
  g.fillStyle = border;
  g.fillRect(x + A, y, w - 2 * A, h);
  g.fillRect(x, y + A, w, h - 2 * A);
  g.fillStyle = bg;
  g.fillRect(x + A, y + A, w - 2 * A, h - 2 * A);
  if (!light) {
    g.fillStyle = 'rgba(95,242,255,0.15)';
    g.fillRect(x + 2 * A, y + 2 * A, w - 4 * A, A);
  }
}

// rubber stamp; k (0→1) animates the slam
export function drawStamp(g, cx, cy, text, color, scale = 2, k = 1) {
  const s = k < 1 ? 1 + (1 - k) * 0.6 : 1;
  const a = Math.min(1, k * 1.5);
  const tw = measureText(text, scale);
  const w = tw + 8 * A;
  const h = 7 * scale + 6 * A;
  g.save();
  g.translate(cx, cy);
  g.scale(s, s);
  g.globalAlpha *= a;
  g.fillStyle = color;
  g.fillRect(-w / 2, -h / 2, w, A);
  g.fillRect(-w / 2, h / 2 - A, w, A);
  g.fillRect(-w / 2, -h / 2, A, h);
  g.fillRect(w / 2 - A, -h / 2, A, h);
  drawText(g, text, 0, -3.5 * scale, { scale, color, align: 'center' });
  g.restore();
}

// big logo: DOUBLE in day ink, SHIFT in night ink, with halos
export function drawLogo(g, cx, y, scale = 8) {
  const gap = 10 * scale;
  const wl = measureText('DOUBLE', scale);
  const wr = measureText('SHIFT', scale);
  const left = cx - (wl + gap + wr) / 2;
  drawText(g, 'DOUBLE', left, y, { scale, color: PAL[DAY].hud, shadow: '#c9ad84' });
  drawText(g, 'SHIFT', left + wl + gap, y, { scale, color: PAL[NIGHT].hud, shadow: '#3aa8bd' });
  return { left, gapX: left + wl, gap };
}
