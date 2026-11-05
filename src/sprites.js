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
  freak: '#05060f', rim: '#5ff2ff', freakEye: '#ffec5a', visor: '#2bdc6a', shades: '#3a4048',
  hatOrange: '#ff8a1c', // the day-walker's hard hat: orange, never the worker's yellow
  plank: '#8a6a45', note: '#ffe96b',
  steel: '#9aa3ad', steelHi: '#d6dbe0', steelLo: '#3a4048', brass: '#e2b955', brassLo: '#b8862f', fixedLamp: '#2bdc6a', rust: '#7a4a2a',
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
// Each kind has its own silhouette (a frozen freak is only its outline, so the outline has to say which kind
// it is; test/art.test.mjs keeps them ≥ 12 art px apart): the lurker's pointed ears and wide body; the
// peeker narrow, fingers gripping above its head; the squatter low on its hoard; the supervisor's green visor
// and clipboard; the day-walker in a hard hat (it clocked in for the day shift) and, drawn on top, shades.
const PEEKER = [
  '.RR......RR.',
  '.RDR....RDR.',
  '..RDRRRRDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RDDDDDDR..',
  '..RRRRRRRR..',
];
const SQUATTER = [
  '............',
  '............',
  '...R.RR.R...',
  '..RDRDDRDR..',
  '.RDDDDDDDDR.',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  'RDDDDDDDDDDR',
  '.RDDDDDDDDR.',
  '.RRRRRRRRRR.',
  'PPPPPPPPYYY.',
  'PPPPPPPPYYYY',
];
const SUPERVISOR = [
  '.....RRRR...',
  '....RDDDDR..',
  '....RGGGGGGG',
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
const DAYWALKER_TOP = [
  '...RRRRRR...',
  '..RYYYYYYR..',
  '.RYYYYYYYYR.',
  'RYYYYYYYYYYR',
  '.RDDDDDDDDR.',
  '.RDDDDDDDDR.',
  '.RDDDDDDDDR.',
  '.RDDDDDDDDR.',
  '.RDDDDDDDDR.',
  '.RDDDDDDDDR.',
  '.RDDDDDDDDR.',
];
const DAYWALKER0 = [...DAYWALKER_TOP, '.RDDR..RDDR.', '.RRR....RRR.'];
const DAYWALKER1 = [...DAYWALKER_TOP, '..RDDR.RDDR.', '..RRR...RRR.'];
// the ending's wave: a freak's hand, 8×10 art px
const HAND = [
  '.R.R.R..',
  'RDRDRDR.',
  'RDRDRDR.',
  'RDDDDDR.',
  'RDDDDDDR',
  'RDDDDDDR',
  'RDDDDDR.',
  '.RDDDR..',
  '.RDDDR..',
  '.RDDDR..',
];
const FREAK_NIGHT = { D: C.freak, R: C.rim, P: C.plank, Y: C.hat, C: C.paper, I: C.paperInk, G: C.visor };
// the day-walker reads against the warm sky (a cream rim), in an orange hard hat: it is out on the worker's shift,
// so it wears none of the worker's colors (test/art.test.mjs)
const FREAK_DAY = { ...FREAK_NIGHT, R: C.cream, Y: C.hatOrange };

// eyes: [x, y] of the left eye in art px within the sprite; `gap` art px between the eyes
export const SPRITES = {
  // anchor: the hitbox's top-left inside the frame; box: the hitbox in art px (vflip mirrors around it)
  worker: { frames: workerFrames, palette: WORKER_DAY, nightPalette: WORKER_NIGHT, anchor: [1, 3], box: [9, 13] },
  lurker: { frames: { a: LURKER0, b: LURKER1 }, palette: FREAK_NIGHT, anchor: [1, 2], box: [10, 11], eyes: [4, 5], gap: 2 },
  peeker: { frames: { a: PEEKER }, palette: FREAK_NIGHT, anchor: [1, 2], box: [10, 11], eyes: [4, 3], gap: 2 },
  squatter: { frames: { a: SQUATTER }, palette: FREAK_NIGHT, anchor: [1, 2], box: [10, 11], eyes: [4, 5], gap: 2 },
  supervisor: { frames: { a: SUPERVISOR }, palette: FREAK_NIGHT, anchor: [1, 2], box: [10, 11], eyes: [5, 3], gap: 2 },
  daywalker: { frames: { a: DAYWALKER0, b: DAYWALKER1 }, palette: FREAK_DAY, anchor: [1, 2], box: [10, 11], eyes: [4, 5], gap: 2 },
  hand: { frames: { a: HAND }, palette: FREAK_NIGHT, anchor: [0, 0], box: [8, 10] },
};


// ---------- work orders: the worker's tools and what they fix (docs/ART.md §5.2) ----------
// Tools are 11×11. Each fixture has a `broken` and a `fixed` frame of one size, different in shape, not only colour.

const JOB_PAL = { K: C.ink, S: C.steel, H: C.steelHi, D: C.steelLo, P: C.paper, G: C.note, W: '#ffffff', O: C.brass, o: C.brassLo, L: C.fixedLamp, R: C.rust };
export const JOB_NIGHT_PAL = { ...JOB_PAL, K: C.nightInk };

const TOOL = {
  fuse: [
    '....KKK....',
    '...KHSSK...',
    '...KKKKK...',
    '...KPPPK...',
    '...KPDPK...',
    '...KPDPK...',
    '...KPDPK...',
    '...KPPPK...',
    '...KKKKK...',
    '...KHSSK...',
    '....KKK....',
  ],
  wrench: [
    '.......KK..',
    '......KSK.K',
    '......KSKKS',
    '.....KHSSSK',
    '....KHSSKK.',
    '...KHSK....',
    '..KHSK.....',
    '.KHSK......',
    'KHSK.......',
    'KSK........',
    '.K.........',
  ],
  bulb: [
    '...KKKKK...',
    '..KGGGGGK..',
    '.KGWGGGGGK.',
    '.KGWGGGGGK.',
    '.KGGGGGGGK.',
    '.KGGGGGGGK.',
    '..KGGGGGK..',
    '...KGGGK...',
    '...KSSSK...',
    '...KHSSK...',
    '....KKK....',
  ],
  oil: [
    '.........KK',
    '........KHK',
    '.......KHK.',
    '......KHK..',
    '...KKKHK...',
    '..KOOOK....',
    '.KOoOOOK...',
    '.KOoOOOK...',
    'KOOoOOOOK..',
    'KOOOOOOOK..',
    '.KKKKKKK...',
  ],
  card: [
    '...........',
    'KKKKKKKKKKK',
    'KPPPPPPPPPK',
    'KPDDDDPDDPK',
    'KPPPPPPPPPK',
    'KPDDDPDDDPK',
    'KPPPPPPPPPK',
    'KPDDPDDDDPK',
    'KPPPPPPPPPK',
    'KKKKKKKKKKK',
    '...........',
  ],
  tape: [
    '...KKKKK...',
    '..KHSSSSK..',
    '.KHSKKKSSK.',
    '.KSK...KSK.',
    '.KSK...KSK.',
    '.KSK...KSK.',
    '.KSSKKKSSKK',
    '..KSSSSSKSK',
    '...KKKKK.KK',
    '...........',
    '...........',
  ],
};
const FIXTURE = {
  fuse: {
    broken: [
      'KKKKKKKKKKK..',
      'KHSSSSSSSSK.K',
      'KSDDDDDDDSKKH',
      'KSDDDDDDDSKSS',
      'KSDDRRDDDSKSS',
      'KSDDRRDDDSKSS',
      'KSDDDDDDDSKSS',
      'KSDDDDDDDSKSS',
      'KSDDDDDDDSKSS',
      'KSDDDDDDDSKSS',
      'KSDDDDDDDSKKH',
      'KSSSSSSSSSK.K',
      'KKKKKKKKKKK..',
    ],
    fixed: [
      'KKKKKKKKKKKKK',
      'KHSSSSSSSSSSK',
      'KSDDDDDDDDDSK',
      'KSDSSSSSSSDSK',
      'KSDSSSSSSSDSK',
      'KSDSSLLSSSDSK',
      'KSDSSLLSSSDSK',
      'KSDSSSSSSSDSK',
      'KSDSSSSSSSDSK',
      'KSDSSSSSSSDSK',
      'KSDDDDDDDDDSK',
      'KSSSSSSSSSSSK',
      'KKKKKKKKKKKKK',
    ],
  },
  pipe: {
    broken: [
      'KKKKKK...KKKKKK',
      'SSSSSK...KSSSSS',
      'HHHHHK...KHHHHH',
      'SSSSSK...KSSSSS',
      'SSSSSK...KSSSSS',
      'DDDDDK...KDDDDD',
      'KKKKKK...KKKKKK',
    ],
    fixed: [
      'KKKKKKKKKKKKKKK',
      'SSSSSKHHHKSSSSS',
      'HHHHHKSSSKHHHHH',
      'SSSSSKSSSKSSSSS',
      'SSSSSKSSSKSSSSS',
      'DDDDDKDDDKDDDDD',
      'KKKKKKKKKKKKKKK',
    ],
  },
  light: {
    broken: [
      '....KKK....',
      '...KSSSK...',
      '..KSSSSSK..',
      '.KSSSSSSSK.',
      'KKKKKKKKKKK',
      '...KD.DK...',
      '...........',
      '...........',
    ],
    fixed: [
      '....KKK....',
      '...KSSSK...',
      '..KSSSSSK..',
      '.KSSSSSSSK.',
      'KKKKKKKKKKK',
      '..KGGGGGK..',
      '...KGGGK...',
      '....KKK....',
    ],
  },
  clock: {
    broken: [
      'KKKKKKKKKKKKK',
      'KHSSSSSSSSSSK',
      'KSKKKKKKKKKSK',
      'KSKPPPDPPPKSK',
      'KSKPPDPPPPKSK',
      'KSKDDPPPDPKSK',
      'KSKPPPPDPPKSK',
      'KSKPPPDPPPKSK',
      'KSKKKKKKKKKSK',
      'KSSSSSSSSSSSK',
      'KSSDD.....SSK',
      'KSSSSSSSSSSDK',
      'KKKKKKKKKKKKK',
    ],
    fixed: [
      'KKKKKKKKKKKKK',
      'KHSSSSSSSSSSK',
      'KSKKKKKKKKKSK',
      'KSKPPPDPPPKSK',
      'KSKPPPDPPPKSK',
      'KSKPPPDDDPKSK',
      'KSKPPPPPPPKSK',
      'KSKPPPPPPPKSK',
      'KSKKKKKKKKKSK',
      'KSSSSSSSSSSSK',
      'KSSDDDDDDDSSK',
      'KSSSSSSSSSSDK',
      'KKKKKKKKKKKKK',
    ],
  },
  bolt: {
    broken: [
      'KKKKKKKKKKKKK',
      'KHSSSSSSSSSSK',
      'KSSSSSSSSSSSK',
      'KSSSSKKKSSSSK',
      'KSSSK...KSSSK',
      'KSSK.....KSSK',
      'KSSK.....KSSK',
      'KSSK.....KSSK',
      'KSSSK...KSSSK',
      'KSSSSKKKSSSSK',
      'KSSSSSSSSSSSK',
      'KSSSSSSSSSSDK',
      'KKKKKKKKKKKKK',
    ],
    fixed: [
      'KKKKKKKKKKKKK',
      'KHSSSSSSSSSSK',
      'KSSSKKKKKSSSK',
      'KSSKOOOOOKSSK',
      'KSKOOKKKOOKSK',
      'KSKOKDDDKOKSK',
      'KSKOKDDDKOKSK',
      'KSKOKDDDKOKSK',
      'KSKOOKKKOOKSK',
      'KSSKoooooKSSK',
      'KSSSKKKKKSSSK',
      'KSSSSSSSSSSDK',
      'KKKKKKKKKKKKK',
    ],
  },
  hinge: {
    broken: [
      '.........',
      'KKKKKKK..',
      'KSSRSSK..',
      'KSSRSSK..',
      'KSSRSSK..',
      'KKKKKKK..',
      '.........',
      '.........',
      '.........',
      '..KKKKKKK',
      '..KSSRSSK',
      '..KSSRSSK',
      '..KSSRSSK',
      '..KKKKKKK',
      '.........',
    ],
    fixed: [
      '..KKK....',
      'KKKHKKK..',
      'KSSHSSK..',
      'KSSHSSK..',
      'KSSHSSK..',
      'KKKHKKK..',
      '..KHK....',
      '..KHK....',
      '..KHK....',
      'KKKHKKK..',
      'KSSHSSK..',
      'KSSHSSK..',
      'KSSHSSK..',
      'KKKHKKK..',
      '..KKK....',
    ],
  },
  cable: {
    broken: [
      '...............',
      'KKKKK..........',
      'DDDDDK.........',
      'KKKKDDK...KKKKK',
      '....KDK..KDDDDD',
      '.....K...KKKKKK',
      '...............',
    ],
    fixed: [
      '...............',
      '.....KKKKK.....',
      'KKKKKKHSSKKKKKK',
      'DDDDDKSSSKDDDDD',
      'KKKKKKSSSKKKKKK',
      '.....KKKKK.....',
      '...............',
    ],
  },
};
const jobSprite = (frames) => ({ frames, palette: JOB_PAL, anchor: [0, 0], box: [frames.a[0].length, frames.a.length] });
for (const [kind, rows] of Object.entries(TOOL)) SPRITES[`tool-${kind}`] = jobSprite({ a: rows });
for (const [kind, frames] of Object.entries(FIXTURE)) SPRITES[`fix-${kind}`] = jobSprite({ a: frames.fixed, ...frames });

// ---------- frame selection (pure) ----------

// Which worker frame to draw for a player state. fx.land > 0 right after touching down. `sign` is the gravity
// (rules.js gravitySign): moving against it is a jump, with it a fall.
export function workerFrame(p, t, fx = {}, sign = 1) {
  if (!p.grounded) return sign * p.vy < 0 ? 'jump' : 'fall';
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

// Where a frame lands on screen (pure, tested): its anchor on (x, y), the top-left of the hitbox in screen px.
// Upside down (vflip) the frame turns over around the hitbox, so the hitbox rows stay put and what stuck out
// above it (the worker's hat) now hangs below.
export function spriteRect(name, frame, x, y, { vflip = false, scale = ART } = {}) {
  const s = SPRITES[name];
  const rows = s.frames[frame];
  const [ax, ay] = s.anchor;
  const below = rows.length - ay - s.box[1]; // frame rows under the hitbox
  return {
    left: Math.round(x) - ax * scale,
    top: Math.round(y) - (vflip ? below : ay) * scale,
    w: rows[0].length * scale,
    h: rows.length * scale,
  };
}

// Draw a sprite frame so that its anchor lines up with (x, y), the top-left of the hitbox in screen px.
// flip mirrors it left-right (facing); vflip turns it upside down (a flipped shift's gravity).
export function drawSprite(g, name, frame, x, y, { flip = false, vflip = false, palette = null, outline = null, alpha = 1, scale = ART } = {}) {
  const s = SPRITES[name];
  const pal = outline ? { outline } : palette ?? s.palette;
  const c = frameCanvas(name, frame, pal, outline ? 'outline' : 'fill');
  const { left, top, w, h } = spriteRect(name, frame, x, y, { vflip, scale });
  const prevSmooth = g.imageSmoothingEnabled;
  const prevAlpha = g.globalAlpha;
  g.imageSmoothingEnabled = false;
  g.globalAlpha = prevAlpha * alpha;
  if (flip || vflip) {
    g.save();
    g.translate(flip ? left + w : left, vflip ? top + h : top);
    g.scale(flip ? -1 : 1, vflip ? -1 : 1);
    g.drawImage(c, 0, 0, w, h);
    g.restore();
  } else {
    g.drawImage(c, left, top, w, h);
  }
  g.globalAlpha = prevAlpha;
  g.imageSmoothingEnabled = prevSmooth;
}

// Eyes on a freak drawn with drawSprite at (x, y). state: 'open' | 'shut' | 'squint'. look: -1..1 glance.
// vflip puts them where they land on the upside-down sprite, lids on the other side.
export function drawEyes(g, name, x, y, { state = 'open', look = 0, flip = false, vflip = false, color = C.freakEye, alpha = 1, scale = ART } = {}) {
  const s = SPRITES[name];
  const rows = SPRITES[name].frames.a;
  const [ex0, ey] = s.eyes;
  const ex = flip ? rows[0].length - ex0 - (s.gap + 2) : ex0;
  const P = scale;
  const r = spriteRect(name, 'a', x, y, { vflip, scale });
  const left = r.left + (ex + look) * P;
  const top = r.top + (vflip ? rows.length - 2 - ey : ey) * P; // the eyes are 2 rows tall
  const lid = vflip ? 0 : P; // a shut eye is the row nearer the cheek
  const prevAlpha = g.globalAlpha;
  g.globalAlpha = prevAlpha * alpha;
  g.fillStyle = color;
  for (const dx of [0, 1 + s.gap]) {
    if (state === 'open') g.fillRect(left + dx * P, top, P, P * 2);
    else g.fillRect(left + dx * P - (state === 'squint' ? P / 2 : 0), top + lid, state === 'squint' ? P * 2 : P * 1.5, P);
  }
  g.globalAlpha = prevAlpha;
}
