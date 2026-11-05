// Double Shift art: everything that isn't a character sprite, drawn on the 2-px art grid.
// Tiles, background, hazards, the exit, checkpoints, notes, signs, props, effects and UI panels.
// Pure drawing helpers: they take a canvas context and data, and never read game state themselves.

import { ART, C, SPRITES, JOB_NIGHT_PAL, drawSprite, drawEyes, eyesOpen } from './sprites.js';
import { drawText, measureText } from './font.js';

import { TILE, DAY, NIGHT, tileAt, isSolidChar } from './rules.js';

export { TILE, DAY, NIGHT };
const A = ART;

// Per-shift palette (docs/ART.md §2). `echo` is how THIS shift's geometry looks when seen from the other one.
export const PAL = {
  [DAY]: {
    skyTop: '#f6e7c8', skyBot: '#e8c58c', window: 'rgba(255,255,255,0.22)', frame: 'rgba(120,90,50,0.1)',
    solid: '#6e5a45', mortar: '#5d4b39', brickHi: '#7d6852', lip: '#fbecc9', lipShade: '#c9ad84', shadow: '#4a3b2c',
    echo: 'rgba(255,170,80,0.95)', hatch: 'rgba(255,232,170,0.6)',
    hud: '#3b2d1f', hudSoft: 'rgba(59,45,31,0.85)', halo: 'rgba(246,231,200,0.9)',
    overPar: '#a82317', // CLOCK-INS turns this red once over par (≥ 4.5:1 on the HUD plate)
  },
  [NIGHT]: {
    skyTop: '#0b1029', skyBot: '#1d2a56', window: 'rgba(255,214,110,0.12)', frame: 'rgba(120,150,255,0.05)',
    windowDark: 'rgba(120,150,255,0.05)', // unlit panes: most of the building is dark at night
    solid: '#2e4173', mortar: '#24345e', brickHi: '#3a5088', lip: '#5ff2ff', lipShade: '#3aa8bd', shadow: '#1a2647',
    echo: 'rgba(52,96,230,1)', hatch: 'rgba(95,242,255,0.35)',
    hud: '#d9f6ff', hudSoft: 'rgba(217,246,255,0.85)', halo: 'rgba(11,16,41,0.9)',
    overPar: '#ff7a6b',
  },
};

// Identity colors the readability tests check (test/palette.test.mjs, ART.md §3.1).
// HUD plates: the shift's sky at 85%, behind HUD text over the playfield.
export const PLATE = { [DAY]: 'rgba(246,231,200,0.85)', [NIGHT]: 'rgba(11,16,41,0.85)' };
// The level note's paper strip.
export const NOTE_STRIP = { paper: C.paper, ink: C.paperInk, border: '#c9ad84' };
// Hazards: rebar spikes (alternating rows) on a base; the laser beam and the dim color it flickers to. Every
// color holds ≥ 3:1 against both sky bands (the rebar was 1.8:1 and the dim laser 2.4:1 before Nov 3).
export const HAZARD = {
  rebarBase: '#6a2c12', rebar: ['#b04a20', '#8f3a18'],
  laser: '#ff3b5c', laserDim: '#e8324f', laserGlow: '255,59,92', emitter: '#ff9db0',
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
// The sky (flat bands; stars at night), then the backdrop: the back wall and one quiet motif per act, so each
// act has its own look (ART.md §6). Everything in the backdrop stays ≤ 1.35:1 against the sky behind it,
// overlaps included: test/palette.test.mjs rasterizes every act's backdrop on both shifts.

// Flat bands instead of a smooth gradient: reads as pixel art. Pure, so the palette test uses the same rows.
export function skyBands(layer, H, bands = 8) {
  const pal = PAL[layer];
  return Array.from({ length: bands }, (_, i) => ({
    y0: Math.floor((i * H) / bands),
    y1: Math.floor(((i + 1) * H) / bands),
    color: mix(pal.skyTop, pal.skyBot, i / (bands - 1)),
  }));
}

// Backdrop colors (ART.md §2). `line` draws structure (poles, pipes, shelves, fixtures), `fill` large quiet
// shapes (tarps, boxes), `light` and `glow` what shines. The finale's dawn tints the low day sky pink in three
// steps, lighter, never darker: the echoes and the rebar hold 3:1 on it (the palette test checks).
export const BACKDROP = {
  [DAY]: {
    line: 'rgba(110,80,45,0.13)', fill: 'rgba(110,80,45,0.07)', light: 'rgba(255,255,240,0.5)', glow: 'rgba(255,255,240,0.25)',
    dawn: ['rgba(255,200,200,0.12)', 'rgba(255,200,200,0.22)', 'rgba(255,200,200,0.32)'], sun: 'rgba(255,248,225,0.6)',
  },
  [NIGHT]: {
    line: 'rgba(120,150,255,0.1)', fill: 'rgba(120,150,255,0.05)', light: 'rgba(255,214,110,0.1)',
    emergency: 'rgba(230,240,255,0.1)', emergencyGlow: 'rgba(230,240,255,0.03)', exitSign: 'rgba(43,220,106,0.14)',
    moon: 'rgba(217,246,255,0.1)',
  },
};

export function drawBackground(g, layer, W, H, t = 0, act = 0) {
  for (const b of skyBands(layer, H)) {
    g.fillStyle = b.color;
    g.fillRect(0, b.y0, W, b.y1 - b.y0);
  }
  if (layer === NIGHT) {
    for (let i = 0; i < 70; i++) {
      const x = Math.floor(hash(i, 1) * W / A) * A;
      const y = Math.floor(hash(i, 2) * H * 0.7 / A) * A;
      const tw = 0.25 + 0.15 * Math.sin(t * 2 + i);
      px(g, x, y, 1, 1, `rgba(255,255,255,${tw})`);
    }
  }
  drawBackdrop(g, layer, W, H, act);
}

// One act's backdrop, drawn with art-px rects only (the palette test's raster canvas allows nothing else).
// Act 0 is the plain back wall the menus use. The Upside Down's night is its day backdrop, upside down.
export function drawBackdrop(g, layer, W, H, act = 0) {
  const motif = MOTIFS[act] ?? MOTIFS[0];
  const flip = motif.flipAtNight && layer === NIGHT;
  const r = (x, y, w, h, color) => px(g, x, flip ? H - y - h * A : y, w, h, color);
  motif.draw(r, layer, W, H);
}

// The back wall's six windows: quiet, never brighter than a solid's edge. At night most are dark; `lit` are the
// warm ones. The frame is drawn around and between the panes, never under them, so nothing compounds.
// `blinds` (act 2) gives each window's blind depth in px from the top pane's top edge.
function backWall(r, layer, { lit = [1, 4], blinds = null } = {}) {
  const pal = PAL[layer];
  const b = BACKDROP[layer];
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 160;
    r(x - 6, 60, 56, 3, pal.frame);
    r(x - 6, 254, 56, 3, pal.frame);
    r(x - 6, 66, 3, 94, pal.frame);
    r(x + 100, 66, 3, 94, pal.frame);
    r(x + 48, 66, 2, 94, pal.frame); // mullion
    r(x, 158, 24, 2, pal.frame); // transoms
    r(x + 52, 158, 24, 2, pal.frame);
    const color = layer === DAY || lit.includes(i) ? pal.window : pal.windowDark;
    for (const [dx, dy] of [[0, 6], [52, 6], [0, 102], [52, 102]]) {
      const bottom = 60 + dy + 92;
      let y = 60 + dy;
      // under a blind: a slat, then the pane showing through, every 3 art px
      for (; blinds && y < Math.min(bottom, 66 + blinds[i]); y += 3 * A) {
        r(x + dx, y, 24, 1, b.line);
        const h = Math.min(2, (bottom - y - A) / A);
        if (h > 0) r(x + dx, y + A, 24, h, color);
      }
      if (y < bottom) r(x + dx, y, 24, (bottom - y) / A, color);
    }
  }
}

// Rows of a pixel disc of radius R art px around (cx, cy), each row drawn once (no overlaps to compound).
function disc(r, cx, cy, R, color, { upperHalf = false } = {}) {
  for (let j = -R; j <= (upperHalf ? 0 : R); j++) {
    const hw = Math.floor(Math.sqrt(R * R - j * j));
    r(cx - hw * A, cy + j * A, 2 * hw + 1, 1, color);
  }
}

// A wall clock (act 2): a ring, four ticks and two hands, every art pixel drawn once.
function wallClock(r, cx, cy, R, hour, color) {
  const cells = new Set();
  for (let j = -R; j <= R; j++) {
    const outer = Math.floor(Math.sqrt(R * R - j * j));
    const inner = Math.abs(j) < R - 1 ? Math.floor(Math.sqrt((R - 1) * (R - 1) - j * j)) : -1;
    for (let i = -outer; i <= outer; i++) if (Math.abs(i) > inner) cells.add(`${i},${j}`);
  }
  for (const [i, j] of [[0, 2 - R], [R - 2, 0], [0, R - 2], [2 - R, 0]]) cells.add(`${i},${j}`);
  for (const [angle, len] of [[(hour / 12) * 2 * Math.PI, R * 0.55], [0, R * 0.8]]) {
    for (let k = 0; k <= len; k++) cells.add(`${Math.round(Math.sin(angle) * k)},${Math.round(-Math.cos(angle) * k)}`);
  }
  for (const c of cells) {
    const [i, j] = c.split(',').map(Number);
    r(cx + i * A, cy + j * A, 1, 1, color);
  }
}

// Act 1's scaffold poles stand in the gaps between the windows, so nothing quiet is drawn over anything else.
const POLES = [170, 330, 490, 650, 810];

const MOTIFS = {
  0: { draw: (r, layer) => backWall(r, layer) },

  // Act 1, Renovation: scaffolding in front of the back wall, tarps hung from it, braces and a ladder.
  1: {
    draw(r, layer, W, H) {
      const b = BACKDROP[layer];
      backWall(r, layer);
      for (const x of POLES) r(x, 40, 2, (H - 40) / A, b.line);
      const edges = [0, ...POLES.flatMap((x) => [x, x + 2 * A]), W];
      for (const y of [50, 270, 440]) {
        for (let k = 0; k < edges.length; k += 2) r(edges[k], y, (edges[k + 1] - edges[k]) / A, 2, b.line);
      }
      const brace = (x0, x1, y0, y1) => {
        const steps = (x1 - x0) / A;
        for (let k = 0; k < steps; k++) r(x0 + k * A, Math.round((y0 + ((y1 - y0) * k) / steps) / A) * A, 1, 2, b.line);
      };
      brace(POLES[0] + 2 * A, POLES[1], 274, 436 - 2 * A);
      brace(POLES[2] + 2 * A, POLES[3], 436 - 2 * A, 274);
      // tarps: vertical strips with a fold gap between them and a sagging hem
      for (const [x0, x1, top, bottom] of [[POLES[1] + 2 * A, POLES[2], 54, 236], [POLES[4] + 2 * A, W, 274, 400]]) {
        for (let x = x0 + 2 * A; x + 4 * A <= x1; x += 10 * A) {
          const w = Math.min(9, (x1 - 2 * A - x) / A);
          const sag = Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 5) * A;
          r(x, top, w, (bottom - top + sag) / A, b.fill);
        }
      }
      // a ladder up the lower storey
      r(700, 274, 1, 81, b.line);
      r(726, 274, 1, 81, b.line);
      for (let y = 282; y < 436; y += 16) r(702, y, 12, 1, b.line);
    },
  },

  // Act 2, Overtime: office blinds half drawn, and a wall clock: five by day, three in the morning by night.
  2: {
    draw(r, layer) {
      backWall(r, layer, { blinds: [92, 60, 80, 36, 188, 48] });
      wallClock(r, 490, 330, 13, layer === DAY ? 5 : 3, BACKDROP[layer].line);
    },
  },

  // Act 3, Graveyard Shift: warehouse shelving full of boxes, pipes along the ceiling. No windows.
  3: {
    draw(r, layer, W, H) {
      const b = BACKDROP[layer];
      for (const y of [66, 84]) {
        r(0, y, W / A, 3, b.line);
        for (let x = 80; x < W; x += 160) r(x, y === 66 ? y + 3 * A : y - A, 2, 1, b.line); // flanges
      }
      r(930, 90, 3, (H - 90) / A, b.line); // a drop pipe down the right wall
      [60, 360, 660].forEach((x0, u) => {
        r(x0, 140, 2, (H - 140) / A, b.line);
        r(x0 + 236, 140, 2, (H - 140) / A, b.line);
        [200, 290, 380].forEach((y, s) => {
          r(x0 + 2 * A, y, 116, 1, b.line);
          for (let x = x0 + 8, k = 0; ; k++) {
            const w = 12 + Math.floor(hash(u * 7 + s, k) * 14);
            const h = 10 + Math.floor(hash(k, u * 7 + s) * 12);
            if (x + w * A > x0 + 228) break;
            if (hash(u + k, s) > 0.2) r(x, y - h * A, w, h, b.fill);
            x += w * A + 3 * A;
          }
        });
      });
    },
  },

  // Act 4, Lights Out: no windows, rows of fluorescent fixtures. By day the tubes are dim; at night they're dead,
  // and only the emergency lights and the EXIT signs glow (pictograms, no text: only the real exit reads EXIT).
  4: {
    draw(r, layer) {
      const b = BACKDROP[layer];
      const night = layer === NIGHT;
      for (const [y, xs] of [[80, [80, 320, 560, 800]], [170, [200, 440, 680]], [260, [80, 320, 560, 800]]]) {
        for (const x of xs) {
          r(x + 10, y - 30, 1, 15, b.line); // hangers
          r(x + 68, y - 30, 1, 15, b.line);
          r(x, y, 40, 2, b.line); // the housing
          if (night) continue;
          r(x + 2 * A, y + 2 * A, 36, 1, b.light); // the tube, and its light
          for (let k = 1; k <= 8; k++) r(x + 2 * A - k * A, y + (2 + k) * A, 36 + 2 * k, 1, b.glow);
        }
      }
      if (!night) return;
      // twin-head emergency lights, lamps at the ends of a flat box (nothing like a freak's ears on top),
      // glowing down the wall; white, not red: red at night means a laser
      for (const x of [240, 480, 720]) {
        r(x - 10, 296, 10, 3, b.line);
        r(x - 16, 298, 3, 3, b.emergency);
        r(x + 10, 298, 3, 3, b.emergency);
        for (let k = 0; k < 8; k++) r(x - 16 - k * A, 304 + k * A, 16 + 2 * k, 1, b.emergencyGlow);
      }
      for (const x of [300, 624]) {
        const y = 116;
        r(x, y, 18, 1, b.exitSign); // the sign's frame
        r(x, y + 7 * A, 18, 1, b.exitSign);
        r(x, y + A, 1, 6, b.exitSign);
        r(x + 17 * A, y + A, 1, 6, b.exitSign);
        r(x + 4 * A, y + 3 * A, 8, 2, b.exitSign); // an arrow
        r(x + 12 * A, y + 2 * A, 1, 4, b.exitSign);
        r(x + 13 * A, y + 3 * A, 1, 2, b.exitSign);
      }
    },
  },

  // Act 5, Upside Down: lamps hanging between the windows. At night the whole backdrop hangs the other way.
  5: {
    flipAtNight: true,
    draw(r, layer) {
      const b = BACKDROP[layer];
      backWall(r, layer);
      for (const [x, bottom] of [[170, 150], [330, 210], [490, 170], [650, 230], [810, 160]]) {
        r(x, 0, 1, (bottom - 5 * A) / A, b.line); // the cord
        for (let k = 0; k < 5; k++) r(x + 1 - (3 + 2 * k), bottom - (5 - k) * A, 3 + 2 * k, 1, b.line); // the shade
        r(x - A, bottom, 3, 1, b.light); // the bulb
        for (let k = 0; k < 10; k++) r(x + 1 - (5 + 2 * k), bottom + (1 + k) * A, 5 + 2 * k, 1, b.light);
      }
    },
  },

  // The finale: dawn by day (the low sky warms to pink, the sun's rim on the horizon); the moon low by night.
  6: {
    draw(r, layer, W, H) {
      const b = BACKDROP[layer];
      if (layer === DAY) {
        b.dawn.forEach((c, i) => r(0, 300 + i * 60, W / A, (i === 2 ? H - 420 : 60) / A, c));
        disc(r, 150, 480, 30, b.sun, { upperHalf: true });
      } else {
        disc(r, 800, 430, 23, b.moon);
      }
      backWall(r, layer);
    },
  },
};

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

// Turning things over inside their cell, for a flipped layer: the one formula every hanging object uses.
// mirrorInCell maps a span (y, height h in px) of row ty to its mirror; withCellMirror draws upside down.
function mirrorInCell(ty, y, h) {
  return (2 * ty + 1) * TILE - y - h;
}
export function withCellMirror(g, ty, draw) {
  g.save();
  g.translate(0, (2 * ty + 1) * TILE); // y → (2ty + 1)·TILE − y
  g.scale(1, -1);
  draw();
  g.restore();
}

// On a flipped layer (`top`) a hazard is the same drawing turned over inside its tile: the band at the top,
// matching the rules' hitbox (overlapsHazard).
const mirrorIn = (ty, top) => (y, h) => (top ? mirrorInCell(ty, y, h * A) : y);

export function drawLaser(g, tx, ty, t, leftEnd, rightEnd, { top = false } = {}) {
  const x = tx * TILE;
  const base = (ty + 1) * TILE;
  const y = base - 4 * A;
  const Y = mirrorIn(ty, top);
  const on = Math.sin(t * 18 + tx) > -0.3;
  px(g, x, Y(y - A, 3), 15, 3, `rgba(${HAZARD.laserGlow},${on ? 0.28 : 0.14})`);
  px(g, x, Y(y, 1), 15, 1, on ? HAZARD.laser : HAZARD.laserDim);
  for (const [end, ex] of [[leftEnd, x], [rightEnd, x + 13 * A]]) {
    if (!end) continue;
    px(g, ex, Y(base - HZ * A, HZ), 2, HZ, HAZARD.emitter);
    px(g, ex, Y(base - HZ * A, 1), 2, 1, '#ffffff'); // the tip, at the open end
  }
}

export function drawHazardEcho(g, tx, ty, color, { top: flipped = false } = {}) {
  const x = tx * TILE;
  const top = flipped ? ty * TILE : (ty + 1) * TILE - HZ * A; // the dotted box is symmetric: only its band moves
  g.fillStyle = color;
  for (let i = 1; i < 14; i += 2) { g.fillRect(x + i * A, top, A, A); g.fillRect(x + i * A, top + (HZ - 1) * A, A, A); }
  for (let j = 0; j < HZ; j += 2) { g.fillRect(x + A, top + j * A, A, A); g.fillRect(x + 13 * A, top + j * A, A, A); }
}

// the other shift's water: a dotted box the size of the tile, because all of it is deadly
export function drawWaterEcho(g, tx, ty, color) {
  const x = tx * TILE;
  const y = ty * TILE;
  g.fillStyle = color;
  for (let i = 1; i < 14; i += 2) {
    g.fillRect(x + i * A, y + A, A, A);
    g.fillRect(x + i * A, y + 13 * A, A, A);
    g.fillRect(x + A, y + i * A, A, A);
    g.fillRect(x + 13 * A, y + i * A, A, A);
  }
}

// ---------- shared objects ----------

const SCREEN_W = 32 * TILE;
const SCREEN_H = 18 * TILE;

// Where the exit's door and its lit sign go (pure, tested). The door is two tiles tall, standing on (tx, ty).
// The sign sits above it; with no room above (an exit on row 1) it hangs beside the door instead, and it never
// leaves the screen at the sides.
// On a flipped layer (`hang`) the door hangs from the top of its cell and the sign goes under it (or beside it,
// with no room below); the sign's text stays upright.
export function exitRects(tx, ty, { hang = false } = {}) {
  const x = tx * TILE;
  const top = ty * TILE - TILE;
  const door = { x: x + A, y: top + 2 * A, w: 13 * A, h: 28 * A };
  const sign = { x: x + TILE / 2 - 21, y: top - 9 * A, w: 21 * A, h: 9 * A };
  if (hang) for (const r of [door, sign]) r.y = mirrorInCell(ty, r.y, r.h); // turned over inside the cell
  if (hang ? sign.y + sign.h > SCREEN_H : sign.y < 0) {
    sign.y = hang ? door.y + door.h - 2 * A - sign.h : top + 4 * A;
    sign.x = x + TILE + A;
    if (sign.x + sign.w > SCREEN_W) sign.x = x - A - sign.w;
  }
  sign.x = Math.min(Math.max(sign.x, 0), SCREEN_W - sign.w);
  return { door, sign };
}

export function drawExit(g, tx, ty, layer, { hang = false } = {}) {
  const { door: d, sign: s } = exitRects(tx, ty, { hang });
  const Y = (off, h) => d.y + (hang ? d.h - off - h * A : off); // the door's own details, turned over
  const fill = layer === DAY ? '#3d7a4a' : '#1f6b47';
  px(g, d.x, d.y, 13, 28, '#9dffb8');
  px(g, d.x + A, Y(A, 27), 11, 27, fill);
  px(g, d.x + 3 * A, Y(4 * A, 5), 7, 5, layer === DAY ? '#a9e6bc' : '#5fd18f'); // window
  px(g, d.x + 9 * A, Y(15 * A, 2), 2, 2, '#9dffb8'); // knob
  // lit sign
  px(g, s.x, s.y, 21, 9, '#06210f');
  px(g, s.x + A, s.y + A, 19, 7, '#2bdc6a');
  drawText(g, 'EXIT', s.x + s.w / 2, s.y + 2 * A + 1, { scale: 1, color: '#06210f', align: 'center' });
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

// The checkpoint is a punch clock on a post (pure rect, tested): a metal box with a clock face and a card
// slot; once taken, the face lights up and a timecard sticks out of the top. It stands on (tx, ty).
// On a flipped layer (`hang`) the clock hangs from the top of its cell: the same drawing, turned over.
export function checkpointRect(tx, ty, { hang = false } = {}) {
  const floor = (ty + 1) * TILE;
  const r = { x: tx * TILE + TILE / 2 - 6 * A, y: floor - 24 * A, w: 12 * A, h: 24 * A };
  if (hang) r.y = mirrorInCell(ty, r.y, r.h);
  return r;
}

export function drawCheckpoint(g, tx, ty, on, ping = 0, { hang = false } = {}) {
  if (hang) { withCellMirror(g, ty, () => drawCheckpoint(g, tx, ty, on, ping)); return; }
  const { x, y } = checkpointRect(tx, ty);
  const floor = (ty + 1) * TILE;
  const cx = x + 6 * A;
  px(g, cx - A, floor - 10 * A, 2, 10, '#6b5a48'); // post
  px(g, cx - 3 * A, floor - A, 6, 1, '#4a3b2c'); // foot
  const by = floor - 20 * A; // the box: 12×10 art px
  px(g, x, by, 12, 10, '#3a4048');
  px(g, x + A, by + A, 10, 8, '#9aa3ad');
  // the face: a pixel disc that swells on the ping
  const r = Math.min(4, 3 + (ping > 0 ? Math.round(ping * 2) : 0));
  const fx = cx;
  const fy = by + 4 * A;
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      if (i * i + j * j > r * r + 1) continue;
      const edge = i * i + j * j > (r - 1) * (r - 1) + 1;
      px(g, fx + i * A - A / 2, fy + j * A - A / 2, 1, 1, edge ? '#2a2018' : on ? '#ffd23f' : '#d6dbe0');
    }
  }
  px(g, fx - A / 2, fy - 2 * A - A / 2, 1, 2, '#2a2018'); // hands
  px(g, fx - A / 2, fy - A / 2, 2, 1, '#2a2018');
  px(g, x + 3 * A, by + 8 * A, 6, 1, '#1b1209'); // the card slot
  if (on) {
    // a timecard punched in, sticking out of the top
    px(g, cx - A, y, 3, 4, C.paper);
    px(g, cx - A, y + A, 3, 1, '#c0392b');
  }
}

// Hatch marks "this exists only in this shift". Only a region's rim is hatched, so a big region reads as a
// solid with a hatched edge instead of a field of stripes; the screen edge isn't a rim. Levels whose night is
// generated from the day (offset, upside down) differ almost everywhere, so the echoes carry the cue instead.
export function shouldHatch(level, layer, ov, tx, ty) {
  if (level.nightGenerated) return false;
  const onlyHere = (x, y) => {
    if (x < 0 || y < 0 || x >= level.w || y >= level.h) return true;
    return isSolidChar(tileAt(level, layer, x, y, ov)) && !isSolidChar(tileAt(level, 1 - layer, x, y, ov));
  };
  if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h || !onlyHere(tx, ty)) return false;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !onlyHere(tx + dx, ty + dy));
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
export function drawFreak(g, b, i, t, { layer, freakShift = NIGHT, frozenFlash = 0, prankSquint = 0, look = 0, reduced = false }) {
  const kind = b.kind;
  const live = layer === freakShift;
  const flip = kind === 'supervisor' && b.facing < 0; // its facing is the planning tell, frozen or not
  const vflip = !!b.hang; // a freak of a flipped shift hangs from the solid above (rules.js freakBoxes)
  if (live) {
    if (kind === 'peeker' && !b.active) {
      // ducked in: a dark slot with eyes, on the floor side (the ceiling side when it hangs);
      // about to pop, it rattles and the eyes go wide
      const warn = b.popIn > 0 && b.popIn < PEEK_WARN && (!b.supervised || b.watched);
      const shake = warn && !reduced ? (Math.floor(t * 30) % 2 ? A : -A) : 0;
      px(g, b.x - A + shake, vflip ? b.y : b.y + b.h - 3 * A, 12, 3, 'rgba(0,0,0,0.6)');
      drawEyes(g, 'peeker', b.x + shake, vflip ? b.y + 13 * A - b.h - 2 : b.y + b.h - 13 * A + 2, { state: warn || eyesOpen(t, i) ? 'open' : 'shut', vflip });
      if (warn && !b.supervised) drawStatusMark(g, b.x + b.w / 2, vflip ? b.y + 13 * A : b.y + b.h - 13 * A, 'alert', reduced ? 0 : t, 1, vflip); // a worker wears its own mark
      return;
    }
    const jitter = b.active && !reduced ? Math.round(Math.sin(t * 14 + i) * 0.6) * A : 0;
    const frame = (kind === 'lurker' || kind === 'daywalker') && b.active ? (Math.floor(t * 6 + i) % 2 ? 'b' : 'a') : 'a';
    const slacking = b.supervised && !b.watched;
    drawSprite(g, kind, frame, b.x + jitter, b.y, { flip, vflip, alpha: slacking ? 0.55 : 1 });
    if (kind === 'daywalker') { drawShades(g, b.x + jitter, b.y, look); return; }
    const state = !b.active ? 'shut' : prankSquint > 0 ? 'squint' : eyesOpen(t, i) ? 'open' : 'shut';
    drawEyes(g, kind, b.x + jitter, b.y, { state, look, flip, vflip });
  } else {
    // frozen on the other shift: dotted outline in its own shift's echo color
    const color = PAL[freakShift].echo;
    drawSprite(g, kind, 'a', b.x, b.y, { outline: color, alpha: frozenFlash > 0 ? 1 : 0.85, flip, vflip });
    if (frozenFlash > 0) drawSprite(g, kind, 'a', b.x, b.y, { outline: '#ffffff', alpha: frozenFlash, flip, vflip });
    if (kind === 'daywalker') drawShades(g, b.x, b.y, look, 0.6);
    else if (b.active || kind === 'supervisor') drawEyes(g, kind, b.x, b.y, { state: 'open', look, alpha: 0.6, flip, vflip });
  }
}

// The day-walker works the day shift in shades: two lenses with a glint where the eyes would be.
function drawShades(g, x, y, look = 0, alpha = 1) {
  const s = SPRITES.daywalker;
  const left = Math.round(x) + (s.eyes[0] - 1 - s.anchor[0] + look) * A;
  const top = Math.round(y) + (s.eyes[1] - s.anchor[1]) * A;
  const prev = g.globalAlpha;
  g.globalAlpha = prev * alpha;
  px(g, left, top, 6, 1, C.shades); // the bridge
  px(g, left, top + A, 2, 2, C.shades);
  px(g, left + 4 * A, top + A, 2, 2, C.shades);
  px(g, left, top + A, 1, 1, '#ffffff'); // glints
  px(g, left + 4 * A, top + A, 1, 1, '#ffffff');
  g.globalAlpha = prev;
}

// Eyes in the dark (decor and prank tells): twice the freaks' eye size, with a soft glow, blinking.
function drawGlowEyes(g, cx, y, { t = 0, seed = 0 } = {}) {
  const open = eyesOpen(t, seed);
  for (const ex of [cx - 4 * A, cx + 2 * A]) {
    if (open) {
      px(g, ex - A, y - A, 4, 6, 'rgba(255,236,90,0.25)');
      px(g, ex, y, 2, 4, C.freakEye);
    } else px(g, ex, y + 2 * A, 2, 1, C.freakEye);
  }
}

// ---------- work orders: the worker's own job (docs/ART.md §5.2) ----------
// Tools and fixtures are sprites. On the other shift they're dashed outlines, like everything else that isn't here.

const jobPal = (layer) => (layer === NIGHT ? JOB_NIGHT_PAL : null);

// the tool on its tile; `layer` is the shift being drawn
export function drawTool(g, job, t, layer) {
  const x = job.tx * TILE + 2 * A;
  const y = job.ty * TILE + 2 * A;
  if (layer !== job.layer) { drawSprite(g, `tool-${job.kind}`, 'a', x, y, { outline: PAL[job.layer].echo }); return; }
  drawSprite(g, `tool-${job.kind}`, 'a', x, y + Math.round(Math.sin(t * 4)) * A, { palette: jobPal(layer) });
}

// the tool in the worker's hand
export function drawCarriedTool(g, kind, x, y, layer) {
  drawSprite(g, `tool-${kind}`, 'a', x, y, { palette: jobPal(layer), scale: 1 });
}

// the broken thing, sitting centred in its tile; a ceiling light hangs on its cord from `cordFrom` (a row)
export function drawFixture(g, job, t, layer, done, { cordFrom = null } = {}) {
  const name = `fix-${job.kind}`;
  const [w, h] = SPRITES[name].box;
  const x = job.tx * TILE + Math.floor((15 - w) / 2) * A;
  const y = job.ty * TILE + (job.kind === 'light' ? 0 : Math.floor((15 - h) / 2) * A);
  const here = layer === job.layer;
  if (job.kind === 'light' && cordFrom !== null && here) {
    for (let ty = cordFrom; ty < job.ty; ty++) px(g, job.tx * TILE + 7 * A, ty * TILE, 1, 15, layer === NIGHT ? C.steel : C.steelLo);
  }
  const frame = done ? 'fixed' : 'broken';
  if (!here) { drawSprite(g, name, frame, x, y, { outline: PAL[job.layer].echo }); return; }
  if (job.kind === 'light' && done) drawLightPool(g, job);
  drawSprite(g, name, frame, x, y, { palette: jobPal(layer) });
  if (done) return;
  const spark = Math.floor(t * 5) % 3 !== 2;
  if (job.kind === 'pipe') px(g, x + 7 * A, y + (8 + Math.floor(t * 8) % 7) * A, 1, 2, C.rim);
  else if (spark && (job.kind === 'fuse' || job.kind === 'cable')) px(g, x + 6 * A, y + 4 * A, 2, 2, C.note);
}

// light falling from a repaired fixture, in steps on the art grid
function drawLightPool(g, job) {
  g.fillStyle = 'rgba(255,233,107,0.14)';
  const cx = job.tx * TILE + TILE / 2;
  for (let i = 0; i < 6; i++) { const half = (7 + i * 4) * A; g.fillRect(cx - half, job.ty * TILE + 8 * A + i * 8 * A, half * 2, 8 * A); }
}

// the run of cable or pipe from the broken thing to what it drives: dead until the repair, then live
export function drawJobLink(g, points, t, done, layer) {
  const lit = layer === NIGHT ? '#9dffb8' : '#3d7a4a';
  const dead = layer === NIGHT ? 'rgba(217,246,255,0.45)' : 'rgba(59,45,31,0.55)';
  for (let i = 0; i + 1 < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const n = (Math.abs(x1 - x0) + Math.abs(y1 - y0)) * 15;
    for (let k = 0; k <= n; k++) {
      const x = (x0 + ((x1 - x0) * k) / (n || 1)) * TILE + TILE / 2;
      const y = (y0 + ((y1 - y0) * k) / (n || 1)) * TILE + TILE / 2;
      if (!done && k % 3 === 2) continue; // dead: a broken line
      px(g, x, y, 1, 1, done && (k + Math.floor(t * 18)) % 9 < 2 ? '#ffffff' : done ? lit : dead);
    }
  }
}

// a repair landing: corner brackets opening out from the fixture
export function drawFixBrackets(g, x, y, k, layer) {
  const r = (10 + k * 14) * A;
  const color = layer === NIGHT ? '#9dffb8' : '#3d7a4a';
  const prev = g.globalAlpha;
  g.globalAlpha = prev * (1 - k);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    px(g, x + sx * r - (sx > 0 ? 3 * A : 0), y + sy * r, 3, 1, color);
    px(g, x + sx * r, y + sy * r - (sy > 0 ? 3 * A : 0), 1, 3, color);
  }
  g.globalAlpha = prev;
}

// water: a hazard filling its tile. Only the top row of a body of water shows the surface.
export function drawWater(g, tx, ty, t, surface, layer) {
  const x = tx * TILE;
  const y = ty * TILE;
  g.fillStyle = layer === NIGHT ? '#1f6f8f' : '#3f9fbf';
  g.fillRect(x, y + (surface ? 3 * A : 0), TILE, surface ? TILE - 3 * A : TILE);
  if (!surface) { // falling or deep: streaks running down it
    g.fillStyle = layer === NIGHT ? '#3aa8bd' : '#8fd6e8';
    for (const [sx, phase] of [[2, 0], [7, 5], [11, 9]]) g.fillRect(x + sx * A, y + ((Math.floor(t * 40) + phase * A + ty * 7) % 12) * A, A, 3 * A);
    return;
  }
  for (let i = 0; i < 15; i++) {
    const w = Math.round(Math.sin(tx * 15 + i * 0.8 + t * 3));
    px(g, x + i * A, y + (2 + w) * A, 1, 1, '#d9f6ff');
  }
}

// ---------- telegraphs: what a freak or prank is about to do (docs/ART.md §3) ----------

const PEEK_WARN = 0.35; // seconds of rattle before a peeker pops out
const DANGER = '#ff6a4d';
const TELL = '#ffd23f';

// by a freak's head (y = that edge; `hang`: it hangs, so the mark sits below it, upright):
// 'alert' = dangerous now, 'slack' = harmless for the moment
export function drawStatusMark(g, cx, y, kind, t, alpha = 1, hang = false) {
  if (kind === 'alert') {
    const top = hang ? y + 6 : y - 20;
    drawText(g, '!', cx, top + Math.round(Math.sin(t * 8)) * A, { scale: 2, color: '#ffec5a', halo: '#1b1209', align: 'center', alpha });
  } else {
    const k = (t * 0.8) % 1; // a z drifts away from the surface and off to the side
    drawText(g, 'z', cx + 4 + k * 8, hang ? y + 2 + k * 10 : y - 16 - k * 10, { scale: 2, color: '#9fb4d8', halo: '#1b1209', align: 'center', alpha });
  }
}

// the stretch of floor a patroller covers, end stops included (`hang`: of ceiling, marked from y downwards)
export function drawPatrol(g, x0, x1, floorY, alpha = 1, hang = false) {
  const prev = g.globalAlpha;
  g.globalAlpha = prev * alpha;
  g.fillStyle = DANGER;
  for (let x = x0; x < x1; x += 4 * A) g.fillRect(Math.round(x), hang ? floorY : floorY - 2 * A, 2 * A, 2 * A);
  g.fillRect(Math.round(x0), hang ? floorY : floorY - 4 * A, A, 4 * A);
  g.fillRect(Math.round(x1) - A, hang ? floorY : floorY - 4 * A, A, 4 * A);
  g.globalAlpha = prev;
}

// the supervisor's gaze: a scanline wedge from its eyes to the floor of the side it's watching (up, on a flipped night)
export function drawGaze(g, b, reachX, floorY, alpha = 1) {
  const cx = b.x + b.w / 2;
  const top = b.hang ? b.y + b.h - 4 * A : b.y + 4 * A;
  const rows = Math.abs(floorY - top) / (2 * A);
  g.fillStyle = `rgba(255,236,90,${0.2 * alpha})`;
  for (let i = 0; i < rows; i++) {
    const w = (reachX - cx) * (i / rows);
    g.fillRect(Math.round(Math.min(cx, cx + w)), Math.round(top + Math.sign(floorY - top) * i * 2 * A), Math.round(Math.abs(w)), A);
  }
}

// over the supervisor's head: an arrow for the side it's watching, and pips running out until it turns
export function drawTurnTimer(g, b, period, alpha = 1) {
  const prev = g.globalAlpha;
  g.globalAlpha = prev * alpha;
  const cx = Math.round(b.x + b.w / 2);
  const y = b.hang ? Math.round(b.y + b.h) + 4 * A : Math.round(b.y) - 10 * A;
  px(g, cx - 7 * A, y - 2 * A, 14, 10, 'rgba(27,18,9,0.8)'); // a plate, so it reads on both shifts
  const soon = b.turnIn < 0.35;
  const color = soon ? '#ffffff' : '#ffec5a';
  for (let i = 0; i < 3; i++) px(g, cx + b.facing * (i - 1) * 2 * A - A, y + i * A, 2, 5 - 2 * i, color);
  const lit = Math.ceil((b.turnIn / period) * 4);
  for (let i = 0; i < 4; i++) px(g, cx + (i * 3 - 5) * A, y + 5 * A, 2, 1, i < lit ? color : 'rgba(255,255,255,0.25)');
  g.globalAlpha = prev;
}

// tiles a pending prank will change: filled = something will be here, crossed = it will be gone
export function drawPrankCells(g, cells, isEmpty, { alpha = 1, color = TELL } = {}) {
  const prev = g.globalAlpha;
  const has = new Set(cells.map((c) => `${c.tx},${c.ty}`));
  for (const c of cells) {
    const x = c.tx * TILE;
    const y = c.ty * TILE;
    g.globalAlpha = prev * alpha;
    if (isEmpty(c.ch)) {
      for (let i = 2; i < 13; i += 2) {
        px(g, x + i * A, y + i * A, 1, 1, color);
        px(g, x + (14 - i) * A, y + i * A, 1, 1, color);
      }
    } else {
      g.globalAlpha = prev * alpha * 0.16;
      g.fillStyle = color;
      g.fillRect(x, y, TILE, TILE);
      g.globalAlpha = prev * alpha;
    }
    g.fillStyle = color;
    for (let i = 0; i < TILE; i += 3 * A) {
      if (!has.has(`${c.tx},${c.ty - 1}`)) g.fillRect(x + i, y, 2 * A, A);
      if (!has.has(`${c.tx},${c.ty + 1}`)) g.fillRect(x + i, y + TILE - A, 2 * A, A);
      if (!has.has(`${c.tx - 1},${c.ty}`)) g.fillRect(x, y + i, A, 2 * A);
      if (!has.has(`${c.tx + 1},${c.ty}`)) g.fillRect(x + TILE - A, y + i, A, 2 * A);
    }
  }
  g.globalAlpha = prev;
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
  // A cordon: two stanchions standing on the floor at the centers of the first and last of `w` cells, with
  // striped tape sagging between their tops (never a line at floor height, which reads as a bridge).
  barrierTape(g, x, y, w = 2) {
    const n = Math.max(2, typeof w === 'number' ? w : 2);
    const x0 = x + TILE / 2 - A;
    const x1 = x + (n - 1) * TILE + TILE / 2 - A;
    const topY = y + TILE - 12 * A;
    for (const sx of [x0, x1]) {
      px(g, sx, topY, 2, 12, '#3a4048'); // post
      px(g, sx - A, y + TILE - A, 4, 1, '#1b1209'); // base
      px(g, sx, topY - A, 2, 1, '#ffcc33'); // cap
    }
    const span = (x1 - x0) / A;
    for (let i = 2; i < span; i++) {
      const u = i / span;
      const sag = Math.round(4 * 4 * u * (1 - u)); // up to 4 art px at the middle
      px(g, x0 + i * A, topY + (1 + sag) * A, 1, 2, Math.floor(i / 3) % 2 ? '#ffcc33' : '#1b1209');
    }
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
  // where a portrait hangs, seen when it isn't there: a nail and the unfaded patch of wall (3x2 tiles)
  nail(g, x, y) {
    px(g, x, y, 3 * TILE / A, 2 * TILE / A, 'rgba(255,255,255,0.05)');
    px(g, x + TILE + TILE / 2 - A, y - 2 * A, 2, 2, '#8a8f99');
    px(g, x + TILE + TILE / 2 - A, y - 2 * A, 1, 1, '#d9dde3');
  },
  // a memo pinned to the wall: its text shows on a panel while you're near (memoPanel in src/layout.js)
  memo(g, x, y) {
    px(g, x + 4 * A, y + 3 * A, 8, 10, NOTE_STRIP.border);
    px(g, x + 5 * A, y + 4 * A, 6, 8, C.paper);
    for (const r of [6, 8, 10]) px(g, x + 6 * A, y + r * A, r === 10 ? 3 : 4, 1, C.paperInk);
    px(g, x + 7 * A, y + 2 * A, 2, 2, '#e0473c'); // the pin
  },
  // a spare hard hat, management's white one (never the worker's yellow); Head Over Heels sticks it to the ceiling
  hardHat(g, x, y) {
    const f = y + TILE;
    px(g, x + 5 * A, f - 6 * A, 5, 1, '#f7efdc');
    px(g, x + 4 * A, f - 5 * A, 7, 3, '#f7efdc');
    px(g, x + 7 * A, f - 6 * A, 1, 4, '#c9ad84'); // the ridge
    px(g, x + 2 * A, f - 2 * A, 11, 1, '#f7efdc'); // the brim
    px(g, x + 2 * A, f - A, 11, 1, '#5a3d10');
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
    drawGlowEyes(g, x + TILE / 2, y + 4 * A, { t: opt.t ?? 0, seed: opt.seed ?? 0 });
  },
  // just watching: small and dim, with no glow, so the big glowing pair always means a prank is coming
  watchers(g, x, y, opt = {}) {
    const open = eyesOpen(opt.t ?? 0, opt.seed ?? 0);
    const cx = x + TILE / 2;
    for (const ex of [cx - 3 * A, cx + 2 * A]) {
      if (open) px(g, ex, y + 4 * A, 1, 2, 'rgba(255,236,90,0.45)');
      else px(g, ex, y + 5 * A, 1, 1, 'rgba(255,236,90,0.3)');
    }
  },
};

// ---------- planned-level objects (built now, used when their levels are built) ----------

export function drawWetTile(g, tx, ty, layer, open) {
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

// A formal portrait: gold frame, a dark sitter with ears and a collar, a brass plate. Big, because it's a wall.
export function drawPortrait(g, x, y, t, w = 3, h = 2) {
  const W = w * 15;
  const H = h * 15;
  px(g, x, y, W, H, C.ink);
  px(g, x + A, y + A, W - 2, H - 2, C.brassLo);
  px(g, x + 2 * A, y + 2 * A, W - 4, 1, C.brass);
  px(g, x + 2 * A, y + 2 * A, 1, H - 4, C.brass);
  px(g, x + 4 * A, y + 4 * A, W - 8, H - 8, '#5a2f3c'); // the wallpaper behind the sitter
  const cx = x + (W * A) / 2;
  const scale = Math.max(1, Math.floor((h * 15) / 22));
  const head = 10 * scale;
  const top = y + 8 * A;
  px(g, cx - head * A, top + 5 * scale * A, head * 2, head + 2 * scale, C.freak); // head
  px(g, cx - head * A, top + 2 * scale * A, 3 * scale, 4 * scale, C.freak); // ears
  px(g, cx + (head - 3 * scale) * A, top + 2 * scale * A, 3 * scale, 4 * scale, C.freak);
  px(g, cx - (head + 3 * scale) * A, top + (head + 8 * scale) * A, (head + 3 * scale) * 2, H - head - 8 * scale - 16, C.freak); // shoulders
  px(g, cx - 3 * scale * A, top + (head + 8 * scale) * A, 6 * scale, 2 * scale, C.paper); // collar
  const open = eyesOpen(t, 3);
  for (const ex of [cx - 5 * scale * A, cx + 2 * scale * A]) px(g, ex, top + (8 * scale + (open ? 0 : 2 * scale)) * A, 3 * scale, open ? 4 * scale : scale, C.freakEye);
  px(g, cx - 12 * A, y + (H - 7) * A, 24, 4, C.brass); // the plate
  px(g, cx - 10 * A, y + (H - 6) * A, 20, 1, C.brassLo);
}

// the same portrait, dropped flat on the floor: a gold-edged slab
export function drawPortraitFlat(g, tx, ty, w) {
  const x = tx * TILE;
  const y = ty * TILE + 8 * A;
  px(g, x, y, w * 15, 7, C.ink);
  px(g, x + A, y + A, w * 15 - 2, 5, C.brassLo);
  px(g, x + 2 * A, y + A, w * 15 - 4, 1, C.brass);
  px(g, x + 3 * A, y + 3 * A, w * 15 - 6, 2, '#5a2f3c');
}

// a steel roller shutter over a doorway, and the drum it rolls up into
export function drawShutter(g, tx, ty, layer, rows = 4) {
  const x = tx * TILE;
  const y = (ty - rows + 1) * TILE;
  px(g, x, y, 15, rows * 15, C.ink);
  for (let i = 0; i < rows * 15; i += 3) {
    px(g, x + A, y + i * A, 13, 2, C.steel);
    px(g, x + A, y + i * A, 13, 1, C.steelHi);
  }
  px(g, x, y + (rows * 15 - 2) * A, 15, 2, C.steelLo);
  px(g, x + 6 * A, y + (rows * 15 - 5) * A, 3, 3, C.ink); // the handle
}

export function drawShutterOpen(g, tx, ty) {
  const x = tx * TILE;
  const y = ty * TILE;
  px(g, x, y, 15, 8, C.ink);
  px(g, x + A, y + A, 13, 6, C.steel);
  px(g, x + A, y + A, 13, 1, C.steelHi);
  px(g, x + A, y + 5 * A, 13, 2, C.steelLo);
}

// scaffold deck: planks on tube, with legs down to the next floor; sagging, it hangs at an angle off one bolt
export function drawDeck(g, tx, ty, w, sag, floorRow) {
  const x = tx * TILE;
  const y = ty * TILE;
  const W = w * 15;
  for (const lx of [1, W - 3]) for (let r = ty + 1; r < floorRow; r++) px(g, x + lx * A, r * TILE, 2, 15, C.steelLo);
  for (let i = 0; i < W; i += 1) {
    const dip = sag ? Math.floor((i / W) * 6) : 0;
    px(g, x + i * A, y + (4 + dip) * A, 1, 5, i % 15 === 14 ? C.ink : C.plank);
    px(g, x + i * A, y + (4 + dip) * A, 1, 1, '#b58b5a');
    px(g, x + i * A, y + (9 + dip) * A, 1, 1, C.ink);
  }
}

// a hoist car: a steel platform on its rails, with every stop it can reach marked
export function drawCar(g, tx, ty, w, stops, layer) {
  const mark = layer === NIGHT ? 'rgba(217,246,255,0.5)' : 'rgba(59,45,31,0.55)';
  const xs = stops.map(([x]) => x);
  const ys = stops.map(([, y]) => y);
  for (const col of [Math.min(...xs), Math.max(...xs) + w]) {
    for (let y = Math.min(...ys) * TILE; y < (Math.max(...ys) + 1) * TILE; y += 8) px(g, col * TILE - 1, y, 1, 2, mark);
  }
  for (const [x, y] of stops) {
    px(g, x * TILE - 6, y * TILE, 3, 1, mark);
    px(g, (x + w) * TILE, y * TILE, 3, 1, mark);
  }
  const x = tx * TILE;
  const y = ty * TILE;
  const W = w * 15;
  px(g, x, y, W, 15, C.ink);
  px(g, x + A, y + A, W - 2, 3, C.steelHi);
  px(g, x + A, y + 4 * A, W - 2, 8, C.steel);
  for (let i = 1; i < W - 4; i += 6) px(g, x + (i + 1) * A, y + 6 * A, 3, 3, '#e8b23a');
  px(g, x + A, y + 12 * A, W - 2, 2, C.steelLo);
}

// One entry of skinPlan() (src/skins.js): the object art over solid tiles. Portraits blink, so they need t.
export function drawSkin(g, sp, layer, t = 0) {
  if (sp.hang) { // turned over about its middle row: on a flipped night its floor end is the top
    withCellMirror(g, sp.ty - (sp.h - 1) / 2, () => drawSkin(g, { ...sp, hang: false }, layer, t));
    return;
  }
  if (sp.draw === 'door') drawDoor(g, sp.tx, sp.ty, layer, sp.h);
  else if (sp.draw === 'emptyFrame') drawEmptyFrame(g, sp.tx, sp.ty, layer, sp.h);
  else if (sp.draw === 'pillar') drawPillar(g, sp.tx, sp.ty - sp.h + 1, sp.ty, layer);
  else if (sp.draw === 'crack') drawCrack(g, sp.tx, sp.ty, layer);
  else if (sp.draw === 'doorPile') drawDoorPile(g, sp.tx, sp.ty, layer, sp.count);
  else if (sp.draw === 'portrait') drawPortrait(g, sp.tx * TILE, sp.ty * TILE, t, sp.w, sp.h);
  else if (sp.draw === 'portraitFlat') drawPortraitFlat(g, sp.tx, sp.ty, sp.w);
  else if (sp.draw === 'shutter') drawShutter(g, sp.tx, sp.ty, layer, sp.h);
  else if (sp.draw === 'shutterOpen') drawShutterOpen(g, sp.tx, sp.ty);
  else if (sp.draw === 'deck') drawDeck(g, sp.tx, sp.ty, sp.w, sp.sag, sp.floorRow);
  else if (sp.draw === 'car') drawCar(g, sp.tx, sp.ty, sp.w, sp.stops, layer);
}

// ---------- effects ----------

export function drawShiftRing(g, x, y, k, layer) {
  ring(g, x, y, 10 + k * 40, layer === NIGHT ? `rgba(95,242,255,${1 - k})` : `rgba(255,200,90,${1 - k})`);
}

// Dust puffs away from the floor at (x, y): up the screen, or down it when `up` (hanging on a flipped night).
export function drawDust(g, x, y, k, { up = false } = {}) {
  const a = 1 - k;
  const away = (dy) => (up ? y + dy - A : y - dy); // mirrored: a 1-art-px puff at y + dy − A
  for (const d of [-1, 1]) {
    px(g, x + d * (4 + k * 10) * A / 2 - A / 2, away((1 + k * 3) * A), 1, 1, `rgba(220,210,190,${a})`);
    px(g, x + d * (2 + k * 6) * A / 2 - A / 2, away(k * 2 * A), 1, 1, `rgba(220,210,190,${a * 0.7})`);
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

// A memo's text on a paper panel: the note strip's paper and rim, laid out by memoPanel (src/layout.js).
export function drawMemoPanel(g, p) {
  px(g, p.x, p.y, p.w / A, p.h / A, NOTE_STRIP.border);
  px(g, p.x + A, p.y + A, p.w / A - 2, p.h / A - 2, NOTE_STRIP.paper);
  p.lines.forEach((line, i) => drawText(g, line, p.x + p.pad, p.y + p.pad + i * p.lineH, { scale: p.scale, color: NOTE_STRIP.ink }));
}
