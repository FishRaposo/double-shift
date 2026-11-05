// The demo GIF encoder (scripts/gif-encode.mjs): pure, so it's checked headless here against a reference reader
// that follows the GIF89a spec, not the encoder. `npm run gif` also has Chromium decode what it writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeGif, quantize, downscale, createColorTable } from '../scripts/gif-encode.mjs';

// The file's blocks in order: extensions with their sub-block data joined, images with their LZW data.
function readGif(bytes) {
  const u16 = (i) => bytes[i] | (bytes[i + 1] << 8);
  assert.equal(String.fromCharCode(...bytes.slice(0, 6)), 'GIF89a');
  const packed = bytes[10];
  const size = packed & 0x80 ? 2 << (packed & 7) : 0;
  const palette = [];
  for (let k = 0; k < size; k++) palette.push([...bytes.slice(13 + 3 * k, 16 + 3 * k)]);
  let i = 13 + 3 * size;
  const subBlocks = () => {
    const data = [];
    while (bytes[i] !== 0) { data.push(...bytes.slice(i + 1, i + 1 + bytes[i])); i += bytes[i] + 1; }
    i++;
    return data;
  };
  const blocks = [];
  for (;;) {
    const b = bytes[i++];
    if (b === 0x3b) { blocks.push({ type: 'trailer' }); break; }
    if (b === 0x21) { const label = bytes[i++]; blocks.push({ type: 'ext', label, data: subBlocks() }); continue; }
    if (b === 0x2c) {
      const im = { type: 'image', left: u16(i), top: u16(i + 2), w: u16(i + 4), h: u16(i + 6), flags: bytes[i + 8] };
      i += 9;
      im.min = bytes[i++];
      im.data = subBlocks();
      blocks.push(im);
      continue;
    }
    throw new Error(`unexpected block 0x${b?.toString(16)} at byte ${i - 1}`);
  }
  return { w: u16(6), h: u16(8), palette, blocks, end: i };
}

// GIF's LZW, decoded the way the spec describes: LSB-first codes, a clear code, codes growing to 12 bits.
function lzwDecode(data, min) {
  const clear = 1 << min;
  const eoi = clear + 1;
  let dict, size, next, prev;
  const reset = () => {
    dict = Array.from({ length: clear }, (_, k) => [k]);
    size = min + 1;
    next = eoi + 1;
    prev = -1;
  };
  reset();
  const out = [];
  let pos = 0;
  for (;;) {
    if (pos + size > data.length * 8) throw new Error('the data ran out before the end code');
    let code = 0;
    for (let b = 0; b < size; b++, pos++) code |= ((data[pos >> 3] >> (pos & 7)) & 1) << b;
    if (code === clear) { reset(); continue; }
    if (code === eoi) break;
    if (prev === -1) {
      if (code >= clear) throw new Error(`code ${code} before any string`);
    } else {
      if (code > next) throw new Error(`code ${code} is past the table (${next})`);
      const first = code < next ? dict[code][0] : dict[prev][0];
      if (next < 4096) {
        dict[next++] = [...dict[prev], first];
        if (next === 1 << size && size < 12) size++;
      }
    }
    out.push(...dict[code]);
    prev = code;
  }
  assert.equal(Math.ceil(pos / 8), data.length, 'the end code is the last thing in the data');
  return out;
}

// Every frame as the viewer sees it: each image drawn over the last (disposal 1, "leave in place").
function frames(gif) {
  const screen = new Array(gif.w * gif.h).fill(0);
  const shown = [];
  for (const im of gif.blocks.filter((b) => b.type === 'image')) {
    const px = lzwDecode(im.data, im.min);
    assert.equal(px.length, im.w * im.h, 'one index per pixel of the image');
    for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) screen[(im.top + y) * gif.w + im.left + x] = px[y * im.w + x];
    shown.push([...screen]);
  }
  return shown;
}

let seed = 7;
const rand = (n) => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 16) % n; };

test('gif: header, size, one image block per frame, trailer', () => {
  const palette = [[0, 0, 0], [255, 236, 90], [40, 60, 120]];
  const f0 = new Uint8Array(15);
  const f1 = new Uint8Array(15).fill(1);
  const f2 = Uint8Array.from(f1);
  f2[7] = 2;
  const bytes = encodeGif([f0, f1, f2], 5, 3, { delayCs: 4, palette });
  assert.ok(bytes instanceof Uint8Array);
  const gif = readGif(bytes);
  assert.deepEqual([gif.w, gif.h], [5, 3]);
  assert.deepEqual(gif.palette, [...palette, [0, 0, 0]], 'the color table pads to a power of two');
  const loop = gif.blocks.find((b) => b.type === 'ext' && b.label === 0xff);
  assert.equal(String.fromCharCode(...loop.data.slice(0, 11)), 'NETSCAPE2.0');
  assert.deepEqual(loop.data.slice(11), [1, 0, 0], 'loops forever');
  const kinds = gif.blocks.filter((b) => b.type !== 'ext' || b.label === 0xf9).map((b) => (b.type === 'ext' ? 'control' : b.type));
  assert.deepEqual(kinds, ['control', 'image', 'control', 'image', 'control', 'image', 'trailer'], 'each image has its own control block');
  for (const c of gif.blocks.filter((b) => b.label === 0xf9)) {
    assert.equal(c.data[1] | (c.data[2] << 8), 4, 'delay in centiseconds');
    assert.equal((c.data[0] >> 2) & 7, 1, 'each frame stays under the next');
  }
  const images = gif.blocks.filter((b) => b.type === 'image');
  assert.deepEqual([images[0].left, images[0].top, images[0].w, images[0].h], [0, 0, 5, 3], 'the first frame fills the screen');
  for (const im of images) {
    assert.ok(im.w >= 1 && im.h >= 1 && im.left + im.w <= 5 && im.top + im.h <= 3, 'images stay on the screen');
    assert.equal(im.flags & 0x80, 0, 'no local color tables');
  }
  assert.deepEqual([images[2].left, images[2].top, images[2].w, images[2].h], [2, 1, 1, 1], 'a frame stores only the rectangle that changed');
  assert.equal(gif.end, bytes.length, 'the trailer is the last byte');
});

test('gif: the LZW data decodes back to the indices', () => {
  // noise over 200 colors fills the 12-bit table (clear codes); runs make long strings; repeats and
  // single-pixel changes make tiny frames, one at the far corner
  const w = 100;
  const h = 80;
  const palette = Array.from({ length: 200 }, (_, k) => [k, 255 - k, (k * 3) & 255]);
  const noise = Uint8Array.from({ length: w * h }, () => rand(200));
  const runs = Uint8Array.from({ length: w * h }, (_, k) => Math.floor(k / 37) % 5);
  const corner = Uint8Array.from(runs);
  corner[w * h - 1] = 199;
  const input = [noise, runs, runs, corner, noise];
  assert.deepEqual(frames(readGif(encodeGif(input, w, h, { delayCs: 4, palette }))), input.map((f) => [...f]));
  // short frames and small palettes: the code size and the end code at every boundary
  for (let n = 1; n <= 64; n++) {
    for (const colors of [2, 3, 5, 16]) {
      const f = Uint8Array.from({ length: n }, () => rand(colors));
      const pal = Array.from({ length: colors }, (_, k) => [k, k, k]);
      assert.deepEqual(frames(readGif(encodeGif([f], n, 1, { delayCs: 5, palette: pal }))), [[...f]], `${n} px, ${colors} colors`);
    }
  }
});

test('gif: the palette is exact up to 256 colors, else the 256 most frequent with the rest on their nearest', () => {
  const colorsOf = (q, f) => [...q.frames[f]].map((k) => (q.palette[k][0] << 16) | (q.palette[k][1] << 8) | q.palette[k][2]);
  const few = [Uint32Array.of(0x102030, 0xffec5a, 0x102030), Uint32Array.of(0x000000, 0x102030, 0xffec5a)];
  const q = quantize(few);
  assert.equal(q.palette.length, 3);
  assert.equal(q.colors, 3);
  assert.deepEqual(colorsOf(q, 0), [...few[0]]);
  assert.deepEqual(colorsOf(q, 1), [...few[1]]);
  // 256 colors seen 3 times each, and 44 seen once, each one step of blue from a frequent one
  const common = Array.from({ length: 256 }, (_, k) => (((k * 7) & 255) << 16) | ((255 - k) << 8) | (k & 0xf0));
  const rare = common.slice(0, 44).map((c) => c + 1);
  const frame = Uint32Array.from([...common, ...common, ...common, ...rare]);
  const q2 = quantize([frame]);
  assert.equal(q2.palette.length, 256);
  assert.equal(q2.colors, 300);
  const out = colorsOf(q2, 0);
  assert.deepEqual(out.slice(0, 768), [...frame.slice(0, 768)], 'the frequent colors are exact');
  assert.deepEqual(out.slice(768), common.slice(0, 44), 'a rare color takes the nearest one in the palette');
});

test('gif: halving averages each 2×2 block, so art on the 2-px grid keeps its colors; --full keeps every pixel', () => {
  const red = [255, 0, 0, 255];
  const white = [255, 255, 255, 255];
  const black = [0, 0, 0, 255];
  const rgba = Uint8ClampedArray.from([...red, ...red, ...white, ...black, ...red, ...red, ...black, ...white]);
  assert.deepEqual([...downscale(rgba, 4, 2, 2)], [0xff0000, 0x808080]);
  assert.deepEqual([...downscale(rgba, 4, 2, 1)], [0xff0000, 0xff0000, 0xffffff, 0x000000, 0xff0000, 0xff0000, 0x000000, 0xffffff]);
});

test('gif: frames kept as color ids (the recorder, to save memory) quantize exactly like packed frames', () => {
  const packed = [
    Uint32Array.from({ length: 600 }, () => (rand(300) * 0x010203) & 0xffffff),
    Uint32Array.from({ length: 600 }, () => (rand(40) * 0x0a0b0c) & 0xffffff),
  ];
  const table = createColorTable();
  const ids = packed.map((f) => table.add(f));
  assert.ok(ids.every((f) => f instanceof Uint16Array), 'two bytes a pixel while there are fewer than 65,536 colors');
  const fromIds = quantize(ids, table);
  const direct = quantize(packed);
  assert.deepEqual(fromIds.palette, direct.palette);
  assert.deepEqual(fromIds.frames, direct.frames);
  assert.equal(fromIds.colors, direct.colors);
});

test('color ids stay 16-bit at real frame sizes, and go 32-bit exactly when an id needs it', () => {
  const table = createColorTable();
  assert.equal(table.add(new Uint32Array(480 * 270)).BYTES_PER_ELEMENT, 2, 'one flat 480×270 frame');
  const many = Uint32Array.from({ length: 70000 }, (_, i) => i + 1);
  const ids = table.add(many);
  assert.equal(ids.BYTES_PER_ELEMENT, 4);
  assert.deepEqual([ids[0], ids[65534], ids[65535], ids[69999]], [1, 65535, 65536, 70000], 'every id exact across the upgrade');
});
