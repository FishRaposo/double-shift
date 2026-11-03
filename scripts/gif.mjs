// Demo GIFs for the itch page: a level's scripted run from the tests (test/solutions.mjs), played by the real
// game in headless Edge/Chrome on a fixed clock, so the same command always makes the same file. Writes
// media/demo-<id>.gif at 480×270 (each 2×2 block of the canvas averaged), looping forever.
// Usage: npm run gif -- <id> [--seconds 8] [--fps 25] [--full]
//   --full  the canvas's own 960×540 pixels instead, as media/demo-<id>-full.gif (crisper; 2–3× the bytes)
//   The recording stops 1.5 s after the timecard comes up, or at --seconds. Over 3 MB it tries 20 fps, then 6 s.
//   It checks that the page ran the same run as the tests (shifts, deaths, time) and that Chromium's own GIF
//   decoder reads every frame back as recorded. Exits 1 if a check fails or the file stays over 3 MB.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { startBrowser } from './cdp.mjs';
import { SOLUTIONS, L } from '../test/solutions.mjs';
import { play } from '../test/helpers.mjs';

const root = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const number = (name, fallback) => {
  if (!argv.includes(name)) return fallback;
  const v = Number(argv[argv.indexOf(name) + 1]);
  if (!(v > 0)) { console.error(`${name} needs a positive number`); process.exit(2); }
  return v;
};
const id = argv.find((a, i) => !a.startsWith('--') && !['--seconds', '--fps'].includes(argv[i - 1]));
if (!id || !SOLUTIONS[id]) {
  console.error(`usage: npm run gif -- <id> [--seconds 8] [--fps 25] [--full]\nlevel ids: ${Object.keys(L).join(', ')}`);
  process.exit(2);
}
const seconds = number('--seconds', 8);
const fps = number('--fps', 25);
const k = argv.includes('--full') ? 1 : 2; // canvas pixels per GIF pixel, each way
const MAX_BYTES = 3_000_000;
const HOLD = 1.5; // seconds of timecard after the exit

// Runs in the page (serialized with toString, so it imports what it needs): the scripted run, one frame every
// delayCs of game time, through the game's own advance() and render() (requestAnimationFrame is switched off).
async function record({ id, seconds, delayCs, hold, k }) {
  const g = globalThis.__doubleShift;
  const [{ SOLUTIONS }, { inputsFrom }, { downscale, quantize, encodeGif }, { LEVELS }] = await Promise.all([
    import('/test/solutions.mjs'), import('/test/helpers.mjs'), import('/scripts/gif-encode.mjs'), import('/src/levels.js'),
  ]);
  if (g.screen !== 'play' || LEVELS[g.index].id !== id) throw new Error(`level "${id}" did not start`);
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const w = width / k;
  const h = height / k;
  const next = inputsFrom(SOLUTIONS[id]);
  const dt = delayCs / 100;
  const rgb = [];
  let cardAt = null;
  for (let f = 0; f * dt < seconds; f++) {
    if (f > 0) g.advance(dt, next);
    g.render();
    rgb.push(downscale(ctx.getImageData(0, 0, width, height).data, width, height, k));
    if (cardAt === null && g.screen === 'card') cardAt = f;
    if (cardAt !== null && (f - cardAt) * dt >= hold) break;
  }
  const q = quantize(rgb);
  const bytes = encodeGif(q.frames, w, h, { delayCs, palette: q.palette });
  // Chromium's decoder reads the file back; `worst` is the largest channel difference from what was encoded.
  let decoded = null;
  if (typeof ImageDecoder !== 'undefined') {
    const dec = new ImageDecoder({ data: bytes, type: 'image/gif' });
    await dec.tracks.ready;
    const count = dec.tracks.selectedTrack.frameCount;
    const off = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
    let worst = 0;
    for (let f = 0; f < count; f++) {
      const { image } = await dec.decode({ frameIndex: f });
      off.clearRect(0, 0, w, h);
      off.drawImage(image, 0, 0);
      image.close();
      const px = off.getImageData(0, 0, w, h).data;
      const want = q.frames[f] ?? [];
      for (let i = 0; i < want.length; i++) {
        const c = q.palette[want[i]];
        worst = Math.max(worst, Math.abs(px[4 * i] - c[0]), Math.abs(px[4 * i + 1] - c[1]), Math.abs(px[4 * i + 2] - c[2]));
      }
    }
    decoded = { count, worst };
  }
  let bin = ''; // base64 in chunks: String.fromCharCode(...) on megabytes at once overflows the stack
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const s = g.state;
  return { b64: btoa(bin), w, h, frames: rgb.length, colors: q.colors, decoded, run: { won: s.won, shifts: s.shifts, deaths: s.deaths, time: s.time } };
}

const expected = play(L[id], SOLUTIONS[id]).state;
const attempts = [{ fps, seconds }];
if (fps > 20) attempts.push({ fps: 20, seconds });
if (seconds > 6) attempts.push({ fps: Math.min(fps, 20), seconds: 6 });

let page;
try {
  page = await startBrowser({ port: 8096, debugPort: 9334, profilePrefix: 'ds-gif-' });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
// Time is ours to step, so nothing runs between frames; a clean save every load, so no BEST on the timecard.
await page.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.requestAnimationFrame = () => 0; try { localStorage.clear(); } catch {}' });

const problems = [];
const name = `demo-${id}${k === 1 ? '-full' : ''}.gif`;
const file = join(root, 'media', name);
let result = null;
try {
  for (const a of attempts) {
    const delayCs = Math.max(2, Math.round(100 / a.fps)); // browsers slow anything under 2 cs down to 10
    await page.open(`?level=${encodeURIComponent(id)}&autostart`);
    const r = await page.evaluate(`(${record})(${JSON.stringify({ id, seconds: a.seconds, delayCs, hold: HOLD, k })})`);
    const bytes = Buffer.from(r.b64, 'base64');
    result = { ...r, bytes, delayCs };
    if (bytes.length <= MAX_BYTES) break;
    console.log(`  ${(bytes.length / 1e6).toFixed(2)} MB at ${100 / delayCs} fps for ${a.seconds} s: over 3 MB`);
  }
} catch (e) {
  problems.push(e.message);
} finally {
  await page.close();
}

if (result) {
  mkdirSync(join(root, 'media'), { recursive: true });
  writeFileSync(file, result.bytes);
  const { run, decoded } = result;
  if (run.won && (run.shifts !== expected.shifts || run.deaths !== expected.deaths || Math.abs(run.time - expected.time) > 1e-6)) {
    problems.push(`the page's run differs from the tests' (page ${JSON.stringify(run)}, tests ${JSON.stringify({ shifts: expected.shifts, deaths: expected.deaths, time: expected.time })})`);
  }
  if (!decoded) console.log('  (no ImageDecoder in this browser: the decode check was skipped)');
  else if (decoded.count !== result.frames || decoded.worst > 2) problems.push(`Chromium decoded ${decoded.count} of ${result.frames} frames, off by up to ${decoded.worst} per channel`);
  if (result.bytes.length > MAX_BYTES) problems.push(`${(result.bytes.length / 1e6).toFixed(2)} MB: over the 3 MB target even at 20 fps and 6 s`);
  const secs = (result.frames * result.delayCs) / 100;
  console.log(`  ${file}: ${result.w}×${result.h}, ${result.frames} frames at ${100 / result.delayCs} fps (${secs.toFixed(2)} s), ${result.colors} colors${result.colors > 256 ? ' (the 256 most frequent kept)' : ''}, ${(result.bytes.length / 1e6).toFixed(2)} MB`);
  console.log(`  run: ${run.won ? `the exit at ${run.time.toFixed(2)} s, ${run.shifts} clock-ins (par ${L[id].par}), ${run.deaths} deaths, as in the tests` : `stopped before the exit (${seconds} s)`}${decoded ? `; Chromium decodes all ${decoded.count} frames as encoded` : ''}`);
}
if (page.errors.length) problems.push(`page errors: ${page.errors.join('; ')}`);
if (problems.length) { for (const p of problems) console.error(p); console.log('FAILED'); process.exit(1); }
console.log(`ok: media/${name}`);
