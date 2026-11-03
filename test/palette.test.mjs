// Readability as tests (docs/ART.md §3.1): the reading order — worker, solids, hazards and freaks, the other
// shift, exit, HUD, background — holds as WCAG contrast between the colors that actually meet on screen.
// rgba colors are composited over what they're drawn on; every check runs against both sky bands of a shift.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PAL, DAY, NIGHT, PLATE, NOTE_STRIP, HAZARD, BACKDROP, drawBackdrop, skyBands } from '../src/art.js';
import { C, SPRITES } from '../src/sprites.js';
import { FINALE_ACT } from '../src/levels.js';

function parse(s) {
  const hex = s.match(/^#([0-9a-f]{6})$/i);
  if (hex) { const n = parseInt(hex[1], 16); return [n >> 16, (n >> 8) & 255, n & 255, 1]; }
  const m = s.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (!m) throw new Error(`unparsed color ${s}`);
  return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
}
// fg over bg (bg opaque, a color string or [r, g, b])
function over(fg, bg) {
  const [r, g, b, a] = parse(fg);
  const [R, G, B] = typeof bg === 'string' ? parse(bg) : bg;
  return [r * a + R * (1 - a), g * a + G * (1 - a), b * a + B * (1 - a)];
}
const luminance = (rgb) => rgb
  .map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
  .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const solid = (s) => over(s, [0, 0, 0]);
// Both sky bands of each shift, plus the finale's dawn: the strongest tint over the low day sky, since the
// whole playfield sits on it in that level.
const SKIES = {
  [DAY]: [PAL[DAY].skyTop, PAL[DAY].skyBot].map(solid).concat([over(BACKDROP[DAY].dawn.at(-1), PAL[DAY].skyBot)]),
  [NIGHT]: [PAL[NIGHT].skyTop, PAL[NIGHT].skyBot].map(solid),
};
const NAME = { [DAY]: 'day', [NIGHT]: 'night' };
function atLeast(ratio, min, what) {
  assert.ok(ratio >= min, `${what}: ${ratio.toFixed(2)}:1 < ${min}:1`);
}

test('readability: the worker outline stands out from both skies (≥ 3:1)', () => {
  for (const L of [DAY, NIGHT]) {
    const k = (L === DAY ? SPRITES.worker.palette : SPRITES.worker.nightPalette).K;
    for (const sky of SKIES[L]) atLeast(contrast(solid(k), sky), 3, `${NAME[L]} outline`);
  }
});

test('readability: solids stand out from the sky by their fill or their edge (≥ 3:1)', () => {
  // by day the dark brick carries it; by night the cyan edge does
  for (const L of [DAY, NIGHT]) {
    for (const sky of SKIES[L]) atLeast(Math.max(contrast(solid(PAL[L].solid), sky), contrast(solid(PAL[L].lip), sky)), 3, `${NAME[L]} solid`);
  }
});

test('readability: night solids are lighter than the night sky (≥ 1.3:1)', () => {
  for (const sky of SKIES[NIGHT]) atLeast(contrast(solid(PAL[NIGHT].solid), sky), 1.3, 'night fill');
});

test('readability: HUD text on its plate (≥ 7:1), over sky or any solid', () => {
  for (const L of [DAY, NIGHT]) {
    for (const under of [...SKIES[L], solid(PAL[L].solid), solid(PAL[L].lip)]) {
      atLeast(contrast(solid(PAL[L].hud), over(PLATE[L], under)), 7, `${NAME[L]} HUD`);
    }
  }
});

test('readability: secondary HUD text and the over-par red on the plate (≥ 4.5:1), over sky or any solid', () => {
  for (const L of [DAY, NIGHT]) {
    for (const under of [...SKIES[L], solid(PAL[L].solid), solid(PAL[L].lip)]) {
      const plate = over(PLATE[L], under);
      atLeast(contrast(over(PAL[L].hudSoft, plate), plate), 4.5, `${NAME[L]} hudSoft`);
      atLeast(contrast(solid(PAL[L].overPar), plate), 4.5, `${NAME[L]} over par`);
    }
  }
});

test('readability: paper text (≥ 7:1) and sticky notes (≥ 4.5:1)', () => {
  atLeast(contrast(solid(NOTE_STRIP.ink), solid(NOTE_STRIP.paper)), 7, 'note strip');
  atLeast(contrast(solid(C.paperInk), solid(C.paper)), 7, 'timecard paper');
  atLeast(contrast(solid('#5a3d10'), solid(C.note)), 4.5, 'sticky note');
});

test("readability: the other shift's echo shows on this sky (≥ 3:1)", () => {
  for (const L of [DAY, NIGHT]) {
    for (const sky of SKIES[L]) atLeast(contrast(over(PAL[1 - L].echo, sky), sky), 3, `${NAME[1 - L]} echo on the ${NAME[L]} sky`);
  }
});

test('readability: hazards stand out from the sky in every color they flicker through (≥ 3:1)', () => {
  for (const c of HAZARD.rebar) for (const sky of SKIES[DAY]) atLeast(contrast(solid(c), sky), 3, `rebar ${c}`);
  for (const c of [HAZARD.laser, HAZARD.laserDim]) for (const sky of SKIES[NIGHT]) atLeast(contrast(solid(c), sky), 3, `laser ${c}`);
});

test('readability: freak eyes on the freak body (≥ 4.5:1)', () => {
  atLeast(contrast(solid(C.freakEye), solid(C.freak)), 4.5, 'eyes');
});

test('readability: the background stays quiet (windows and frames ≤ 1.35:1 against the sky)', () => {
  for (const L of [DAY, NIGHT]) {
    for (const sky of SKIES[L]) {
      for (const c of [PAL[L].window, PAL[L].frame, PAL[L].windowDark].filter(Boolean)) {
        const r = contrast(over(c, sky), sky);
        assert.ok(r <= 1.35, `${NAME[L]} ${c}: ${r.toFixed(2)}:1 > 1.35:1`);
      }
    }
  }
});

// A software canvas for the backdrops: they draw with fillRect only (anything else throws), every rgba is
// composited per pixel, so overlapping motifs count. Rows start as the sky band the game draws there.
const BW = 960;
const BH = 540;
const lin = Array.from({ length: 256 }, (_, c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
const lum = (r, g, b) => 0.2126 * lin[Math.round(r)] + 0.7152 * lin[Math.round(g)] + 0.0722 * lin[Math.round(b)];
const rasters = new Map(); // both backdrop tests read the same rasters: draw each once
function rasterBackdrop(layer, act) {
  const key = `${act},${layer}`;
  if (!rasters.has(key)) rasters.set(key, drawRaster(layer, act));
  return rasters.get(key);
}
function drawRaster(layer, act) {
  const px = new Float32Array(BW * BH * 3);
  const rowSky = new Array(BH);
  for (const band of skyBands(layer, BH)) {
    const [r, g, b] = parse(band.color);
    for (let y = band.y0; y < band.y1; y++) {
      rowSky[y] = [r, g, b];
      for (let i = y * BW * 3; i < (y + 1) * BW * 3; i += 3) { px[i] = r; px[i + 1] = g; px[i + 2] = b; }
    }
  }
  const ctx = {
    fillStyle: '#000000',
    fillRect(x, y, w, h) {
      const [r, g, b, a] = parse(this.fillStyle);
      const x0 = Math.max(0, Math.round(x));
      const y0 = Math.max(0, Math.round(y));
      const x1 = Math.min(BW, Math.round(x + w));
      const y1 = Math.min(BH, Math.round(y + h));
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * BW + xx) * 3;
          px[i] = r * a + px[i] * (1 - a);
          px[i + 1] = g * a + px[i + 1] * (1 - a);
          px[i + 2] = b * a + px[i + 2] * (1 - a);
        }
      }
    },
  };
  const strict = new Proxy(ctx, {
    get(t, k) {
      if (k in t) return typeof t[k] === 'function' ? t[k].bind(t) : t[k];
      throw new Error(`backdrops draw with fillRect only (used ${String(k)})`);
    },
    set(t, k, v) {
      if (k !== 'fillStyle') throw new Error(`backdrops set fillStyle only (set ${String(k)})`);
      t[k] = v;
      return true;
    },
  });
  drawBackdrop(strict, layer, BW, BH, act);
  return { px, rowSky };
}
const ACTS_DRAWN = [0, 1, 2, 3, 4, 5, FINALE_ACT]; // 0: the menus' plain back wall

test('readability: every backdrop stays quiet, overlaps included (≤ 1.35:1 against the sky behind it)', () => {
  for (const L of [DAY, NIGHT]) {
    for (const act of ACTS_DRAWN) {
      const { px, rowSky } = rasterBackdrop(L, act);
      let worst = { r: 1 };
      for (let y = 0; y < BH; y++) {
        const ls = lum(...rowSky[y]);
        for (let x = 0; x < BW; x++) {
          const i = (y * BW + x) * 3;
          const l = lum(px[i], px[i + 1], px[i + 2]);
          const r = (Math.max(l, ls) + 0.05) / (Math.min(l, ls) + 0.05);
          if (r > worst.r) worst = { r, x, y };
        }
      }
      assert.ok(worst.r <= 1.35, `act ${act} ${NAME[L]}: ${worst.r.toFixed(3)}:1 at (${worst.x}, ${worst.y})`);
    }
  }
});

test('backdrops: every act looks different from every other (≥ 3% of the screen differs)', () => {
  for (const L of [DAY, NIGHT]) {
    const shots = ACTS_DRAWN.filter((a) => a > 0).map((act) => [act, rasterBackdrop(L, act).px]);
    for (let i = 0; i < shots.length; i++) {
      for (let j = i + 1; j < shots.length; j++) {
        const [a, pa] = shots[i];
        const [b, pb] = shots[j];
        let diff = 0;
        for (let k = 0; k < BW * BH; k++) {
          const q = k * 3;
          if (Math.abs(pa[q] - pb[q]) + Math.abs(pa[q + 1] - pb[q + 1]) + Math.abs(pa[q + 2] - pb[q + 2]) > 3) diff++;
        }
        assert.ok(diff / (BW * BH) >= 0.03, `${NAME[L]}: acts ${a} and ${b} differ on ${((100 * diff) / (BW * BH)).toFixed(1)}% of the screen`);
      }
    }
  }
});
