// Double Shift — a GIF89a encoder for the demo GIFs (scripts/gif.mjs). Pure and dependency-free, so it runs in
// Node (test/gif.test.mjs) and in the page, where gif.mjs records frames. Three steps:
//   downscale(rgba, w, h, k)  canvas pixels → packed 0xRRGGBB, each k×k block averaged (2: 960×540 → 480×270)
//   quantize(frames)          one palette for every frame: exact up to 256 colors, else the 256 most frequent
//   encodeGif(frames, ...)    palette indices → GIF bytes: looping, one image per frame, each frame storing only
//                             the rectangle that changed since the last

// Each k×k block averaged (k = 1 packs every pixel as is). The art sits on a 2-px grid, so at k = 2 a block is
// usually one color and stays exact; 1-px detail (the scale-1 font) blends instead of dropping every other pixel.
export function downscale(rgba, w, h, k = 2) {
  const ow = Math.floor(w / k);
  const oh = Math.floor(h / k);
  const out = new Uint32Array(ow * oh);
  const n = k * k;
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let dy = 0; dy < k; dy++) {
        for (let dx = 0; dx < k; dx++) {
          const i = ((y * k + dy) * w + x * k + dx) * 4;
          r += rgba[i];
          g += rgba[i + 1];
          b += rgba[i + 2];
        }
      }
      const avg = (v) => Math.floor((v + (n >> 1)) / n);
      out[y * ow + x] = (avg(r) << 16) | (avg(g) << 8) | avg(b);
    }
  }
  return out;
}

// One palette for the whole GIF. Up to 256 colors it is exact. Past that it keeps the 256 colors that cover the
// most pixels (ties to the lower value, so it's deterministic) and maps every other color to its nearest
// (squared RGB distance). Returns { palette: [[r, g, b]], frames: [Uint8Array], colors: distinct colors seen }.
export function quantize(frames) {
  const count = new Map();
  for (const f of frames) for (const c of f) count.set(c, (count.get(c) ?? 0) + 1);
  const kept = [...count.keys()].sort((a, b) => count.get(b) - count.get(a) || a - b).slice(0, 256);
  const palette = kept.map((c) => [c >> 16, (c >> 8) & 255, c & 255]);
  const index = new Map(kept.map((c, k) => [c, k]));
  for (const c of count.keys()) {
    if (index.has(c)) continue;
    const r = c >> 16;
    const g = (c >> 8) & 255;
    const b = c & 255;
    let best = 0;
    let bestD = Infinity;
    palette.forEach(([pr, pg, pb], k) => {
      const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (d < bestD) { bestD = d; best = k; }
    });
    index.set(c, best);
  }
  const indexed = frames.map((f) => {
    const out = new Uint8Array(f.length);
    for (let i = 0; i < f.length; i++) out[i] = index.get(f[i]);
    return out;
  });
  return { palette, frames: indexed, colors: count.size };
}

// A growing byte buffer.
function bytesOut() {
  let buf = new Uint8Array(1 << 16);
  let n = 0;
  return {
    push(...bs) {
      if (n + bs.length > buf.length) {
        const bigger = new Uint8Array(Math.max(buf.length * 2, n + bs.length));
        bigger.set(buf);
        buf = bigger;
      }
      for (const b of bs) buf[n++] = b;
    },
    u16(v) { this.push(v & 255, (v >> 8) & 255); },
    bytes() { return buf.slice(0, n); },
  };
}

// The string table, keyed by (prefix code << 8 | next index): a code per key, valid while its stamp matches the
// current generation, so a clear code empties it without touching a million entries.
const tableCode = new Int16Array(4096 << 8);
const tableGen = new Int32Array(4096 << 8);
let gen = 0;

// GIF's LZW: variable-width codes packed LSB first, starting at minCodeSize + 1 bits and growing to 12; a clear
// code whenever the table fills. The code width tracks what a decoder will use: it adds a table entry after
// every code but the first, one step behind the encoder, so the width grows once `next` passes the current
// power of two, and once more before the end code if the last entry crosses it.
function lzw(out, indices, minCodeSize) {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let size = minCodeSize + 1;
  let next = eoi + 1;
  let cur = 0;
  let bits = 0;
  const data = [];
  const emit = (code) => {
    cur |= code << bits;
    bits += size;
    while (bits >= 8) { data.push(cur & 255); cur >>>= 8; bits -= 8; }
  };
  gen++;
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    if (tableGen[key] === gen) { prefix = tableCode[key]; continue; }
    emit(prefix);
    if (next === 4096) {
      emit(clear);
      size = minCodeSize + 1;
      next = eoi + 1;
      gen++;
    } else {
      tableCode[key] = next;
      tableGen[key] = gen;
      next++;
      if (next > 1 << size && size < 12) size++;
    }
    prefix = k;
  }
  emit(prefix);
  next++;
  if (next > 1 << size && size < 12) size++;
  emit(eoi);
  if (bits > 0) data.push(cur & 255);
  out.push(minCodeSize);
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.slice(i, i + 255);
    out.push(chunk.length, ...chunk);
  }
  out.push(0);
}

// The rectangle where `f` differs from `prev`; a frame that changed nothing still gets a 1×1 image, so every frame
// keeps its own delay.
function changed(prev, f, w, h) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (prev[y * w + x] === f[y * w + x]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      y1 = y;
    }
  }
  return x1 < 0 ? { x: 0, y: 0, w: 1, h: 1 } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// frames: one Uint8Array of palette indices per frame (w × h, row-major). palette: up to 256 [r, g, b].
// delayCs: each frame's time on screen, in hundredths of a second. Loops forever.
export function encodeGif(frames, w, h, { delayCs, palette }) {
  if (!frames.length) throw new Error('encodeGif: no frames');
  if (!palette.length || palette.length > 256) throw new Error(`encodeGif: ${palette.length} colors (1–256)`);
  let tableBits = 1;
  while (1 << tableBits < palette.length) tableBits++;
  const out = bytesOut();
  out.push(...[...'GIF89a'].map((ch) => ch.charCodeAt(0)));
  out.u16(w);
  out.u16(h);
  out.push(0x80 | 0x70 | (tableBits - 1), 0, 0); // a global table of 2^tableBits colors, 8 bits per channel
  for (let k = 0; k < 1 << tableBits; k++) out.push(...(palette[k] ?? [0, 0, 0]));
  out.push(0x21, 0xff, 11, ...[...'NETSCAPE2.0'].map((ch) => ch.charCodeAt(0)), 3, 1, 0, 0, 0); // loop forever
  frames.forEach((f, i) => {
    if (f.length !== w * h) throw new Error(`encodeGif: frame ${i} has ${f.length} pixels, not ${w * h}`);
    const r = i === 0 ? { x: 0, y: 0, w, h } : changed(frames[i - 1], f, w, h);
    out.push(0x21, 0xf9, 4, 1 << 2); // control: disposal 1 (leave the frame in place), no transparency
    out.u16(delayCs);
    out.push(0, 0);
    out.push(0x2c);
    out.u16(r.x);
    out.u16(r.y);
    out.u16(r.w);
    out.u16(r.h);
    out.push(0);
    const px = new Uint8Array(r.w * r.h);
    for (let y = 0; y < r.h; y++) px.set(f.subarray((r.y + y) * w + r.x, (r.y + y) * w + r.x + r.w), y * r.w);
    lzw(out, px, Math.max(2, tableBits));
  });
  out.push(0x3b);
  return out.bytes();
}
