// Double Shift sprites: pixel art as string grids, one character per art pixel (2×2 screen pixels).
// The data, palettes and frame selection are pure; drawing renders frames to cached canvases.
// Freaks are never more than a silhouette and eyes; eyes are drawn on top (blink, glance, squint).

export const ART = 2; // screen pixels per art pixel

// Named palette (docs/ART.md §2).
export const C = {
  ink: '#1b1209', paper: '#f7efdc', paperInk: '#3b2d1f', cream: '#fbecc9',
  hat: '#ffcc33', skin: '#f2c79a', eye: '#222222', boots: '#5a3d10',
  overallsDay: '#2f6fdc', overallsDayShade: '#2558b8', overallsNight: '#3f86ff', overallsNightShade: '#2f6fdc',
  vestDay: '#ffe680', vestNight: '#c6ff4d', nightInk: '#d9f6ff',
  freak: '#05060f', rim: '#5ff2ff', freakEye: '#ffec5a',
  plank: '#8a6a45', note: '#ffe96b',
};

// ---------- the worker (hitbox 9×13 art px; sprite 11×16, anchored 1 left and 3 up) ----------

const BODY = [
  '...KKKKK...',
  '..KYYYYYK..',
  '.KKYYYYYKK.',
  'KYYYYYYYYYK',
  'KKSSSSSSSKK',
  '.KSSSSSESK.',
  '.KSSSSSSSK.',
  '.KBBBBBBBK.',
  '.KBBBBBBBK.',
  '.KVVVVVVVK.',
  '.KBBBBBBBK.',
  '.KBbBBBbBK.',
];
const LEGS = {
  stand: ['.KBBKKKBBK.', '.KBBK.KBBK.', '.KWWK.KWWK.', '.KKKK.KKKK.'],
  strideA: ['.KBBKKBBK..', 'KBBK..KBBK.', 'KWWK...KWWK', 'KKKK...KKKK'],
  pass: ['.KBBKKKBBK.', '..KBBBBBK..', '..KWWKWWK..', '..KKKKKKK..'],
  strideB: ['..KBBKKBBK.', '.KBBK..KBBK', 'KWWK...KWWK', 'KKKK...KKKK'],
  tuck: ['.KBBKKKBBK.', '.KWWK.KWWK.', '.KKKK.KKKK.', '...........'],
  dangle: ['.KBBKKKBBK.', 'KBBK...KBBK', 'KWWK...KWWK', 'KKKK...KKKK'],
  socks: ['.KBBKKKBBK.', '.KSSK.KSSK.', '..KK...KK..', '...........'],
};
const EMPTY11 = '...........';
const workerFrames = {
  idle0: [...BODY, ...LEGS.stand],
  idle1: [EMPTY11, ...BODY.slice(0, 11), ...LEGS.stand],
  run0: [...BODY, ...LEGS.strideA],
  run1: [...BODY, ...LEGS.pass],
  run2: [...BODY, ...LEGS.strideB],
  run3: [EMPTY11, ...BODY.slice(0, 11), ...LEGS.pass],
  jump: [...BODY, ...LEGS.tuck],
  fall: [...BODY, ...LEGS.dangle],
  land: [EMPTY11, ...BODY.slice(0, 7), ...BODY.slice(8), ...LEGS.stand],
  spookBody: [...BODY, ...LEGS.socks],
  boots: [...Array(14).fill(EMPTY11), '.KWWK.KWWK.', '.KKKK.KKKK.'],
};
const WORKER_DAY = { K: C.ink, Y: C.hat, S: C.skin, E: C.eye, B: C.overallsDay, b: C.overallsDayShade, V: C.vestDay, W: C.boots };
const WORKER_NIGHT = { ...WORKER_DAY, K: C.nightInk, B: C.overallsNight, b: C.overallsNightShade, V: C.vestNight };

// ---------- the freaks (hitbox 10×11 art px; sprite 12×13, anchored 1 left and 1 up) ----------

const LURKER0 = [
  '............',
  '....R..R....',
  '...RDRRDR...',
  '..RDDDDDDR..',
  '.RDDDDDDDDR.',
  '.RDDDDDDDDR.',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  '.RDDR..RDDR.',
  '.RRR....RRR.',
];
const LURKER1 = [
  '............',
  '...R..R.....',
  '..RDRRDR....',
  '..RDDDDDDR..',
  '.RDDDDDDDDR.',
  '.RDDDDDDDDR.',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  '..RDDR.RDDR.',
  '..RRR...RRR.',
];
const PEEKER = [
  '....RRRR....',
  '...RDDDDR...',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '.RDRDDDDRDR.',
  '.RDRDDDDRDR.',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RRRRRRRR..',
];
const SQUATTER = [
  '............',
  '............',
  '............',
  '...R.RR.R...',
  '..RDRDDRDR..',
  '.RDDDDDDDDR.',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  '.RRRRRRRRRR.',
  'PPPPPPPPYYY.',
  'PPPPPPPPYYYY',
];
const SUPERVISOR = [
  '......RR....',
  '.....RDDR...',
  '....RDDDDR..',
  '...RDDDDDDR.',
  '..RDDDDDDDR.',
  '.RDDDDDDDDR.',
  '.RDDDDDDCCCC',
  '.RDDDDDDCIIC',
  '.RDDDDDDCCCC',
  '.RDDDDDDCIIC',
  '.RDDDDDDCCCC',
  '.RDDR..RDDR.',
  '.RRR....RRR.',
];
const FREAK_NIGHT = { D: C.freak, R: C.rim, P: C.plank, Y: C.hat, C: C.paper, I: C.paperInk };
const FREAK_DAY = { ...FREAK_NIGHT, R: C.cream }; // the day-walker reads against the warm sky

// eyes: [x, y] of the left eye in art px within the sprite; `gap` art px between the eyes
export const SPRITES = {
  worker: { frames: workerFrames, palette: WORKER_DAY, nightPalette: WORKER_NIGHT, anchor: [1, 3] },
  lurker: { frames: { a: LURKER0, b: LURKER1 }, palette: FREAK_NIGHT, anchor: [1, 2], eyes: [4, 5], gap: 2 },
  peeker: { frames: { a: PEEKER }, palette: FREAK_NIGHT, anchor: [1, 2], eyes: [4, 3], gap: 2 },
  squatter: { frames: { a: SQUATTER }, palette: FREAK_NIGHT, anchor: [1, 2], eyes: [4, 5], gap: 2 },
  supervisor: { frames: { a: SUPERVISOR }, palette: FREAK_NIGHT, anchor: [1, 2], eyes: [5, 3], gap: 2 },
  daywalker: { frames: { a: LURKER0, b: LURKER1 }, palette: FREAK_DAY, anchor: [1, 2], eyes: [4, 5], gap: 2 },
};

// ---------- frame selection (pure) ----------

// Which worker frame to draw for a player state. fx.land > 0 right after touching down.
export function workerFrame(p, t, fx = {}) {
  if (!p.grounded) return p.vy < 0 ? 'jump' : 'fall';
  if ((fx.land ?? 0) > 0) return 'land';
  if (Math.abs(p.vx) > 20) return `run${Math.floor(t * 12) % 4}`;
  return `idle${Math.floor(t * 1.6) % 2}`;
}

// Blink: eyes shut for ~0.12 s every ~3.1 s, offset per freak.
export function eyesOpen(t, seed) {
  return (t * 0.9 + seed * 0.37) % 3.1 > 0.12;
}

// ---------- drawing (browser only) ----------

const cache = new Map();

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function frameCanvas(name, frame, palette, mode) {
  const key = `${name}|${frame}|${mode}|${JSON.stringify(palette)}`;
  let c = cache.get(key);
  if (c) return c;
  const rows = SPRITES[name].frames[frame];
  const w = rows[0].length;
  const h = rows.length;
  c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const solid = (x, y) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      if (mode === 'outline') {
        // dotted border of the silhouette: the frozen, other-shift look
        const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1);
        if (!edge || (x + y) % 3 === 2) continue;
        ctx.fillStyle = palette.outline;
      } else {
        ctx.fillStyle = palette[rows[y][x]] ?? '#ff00ff';
      }
      ctx.fillRect(x, y, 1, 1);
    }
  }
  cache.set(key, c);
  return c;
}

// Draw a sprite frame so that its anchor lines up with (x, y), the top-left of the hitbox in screen px.
export function drawSprite(g, name, frame, x, y, { flip = false, palette = null, outline = null, alpha = 1, scale = ART } = {}) {
  const s = SPRITES[name];
  const pal = outline ? { outline } : palette ?? s.palette;
  const c = frameCanvas(name, frame, pal, outline ? 'outline' : 'fill');
  const [ax, ay] = s.anchor;
  const w = c.width * scale;
  const h = c.height * scale;
  const left = Math.round(x) - ax * scale;
  const top = Math.round(y) - ay * scale;
  const prevSmooth = g.imageSmoothingEnabled;
  const prevAlpha = g.globalAlpha;
  g.imageSmoothingEnabled = false;
  g.globalAlpha = prevAlpha * alpha;
  if (flip) {
    g.save();
    g.translate(left + w, top);
    g.scale(-1, 1);
    g.drawImage(c, 0, 0, w, h);
    g.restore();
  } else {
    g.drawImage(c, left, top, w, h);
  }
  g.globalAlpha = prevAlpha;
  g.imageSmoothingEnabled = prevSmooth;
}

// Eyes on a freak drawn with drawSprite at (x, y). state: 'open' | 'shut' | 'squint'. look: -1..1 glance.
export function drawEyes(g, name, x, y, { state = 'open', look = 0, flip = false, color = C.freakEye, alpha = 1, scale = ART } = {}) {
  const s = SPRITES[name];
  const w = SPRITES[name].frames.a[0].length;
  const [ex0, ey] = s.eyes;
  const ex = flip ? w - ex0 - (s.gap + 2) : ex0;
  const P = scale;
  const left = Math.round(x) - s.anchor[0] * P + (ex + look) * P;
  const top = Math.round(y) - s.anchor[1] * P + ey * P;
  const prevAlpha = g.globalAlpha;
  g.globalAlpha = prevAlpha * alpha;
  g.fillStyle = color;
  for (const dx of [0, 1 + s.gap]) {
    if (state === 'open') g.fillRect(left + dx * P, top, P, P * 2);
    else g.fillRect(left + dx * P - (state === 'squint' ? P / 2 : 0), top + P, state === 'squint' ? P * 2 : P * 1.5, P);
  }
  g.globalAlpha = prevAlpha;
}
