// itch.io media: drives headless Edge/Chrome over the DevTools protocol (no dependencies), presses real keys
// at full speed, and saves the cover + screenshots to media/. Also a full-speed smoke test: exits 1 if level 1
// can't be cleared with real keys or the page logs an error.
// Usage: node scripts/media.mjs [outdir]   (BROWSER env overrides the browser path)
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] || join(root, 'media'));
const PORT = 8095;
const DEBUG_PORT = 9333;
const BROWSERS = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browserPath = BROWSERS.find((p) => existsSync(p));
if (!browserPath) { console.error('No Edge/Chrome found; set BROWSER to its path.'); process.exit(1); }
mkdirSync(out, { recursive: true });

const server = spawn(process.execPath, [join(root, 'scripts/serve.mjs'), '--port', String(PORT)], { stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'ds-media-'));
const browser = spawn(browserPath, [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank',
], { stdio: 'ignore' });

let ws;
let seq = 0;
const pending = new Map();
const errors = [];

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
        ws.onmessage = (m) => {
          const msg = JSON.parse(m.data);
          if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
          if (msg.method === 'Runtime.exceptionThrown') { const d = msg.params.exceptionDetails; errors.push(`${d.exception?.description ?? d.text} (${d.url ?? ''}:${d.lineNumber})`); }
          if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(JSON.stringify(msg.params.args.map((a) => a.value)));
        };
        return;
      }
    } catch { /* browser still starting */ }
    await sleep(200);
  }
  throw new Error('could not reach the browser DevTools endpoint');
}

function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((r) => pending.set(id, (msg) => r(msg.result)));
}

const KEYS = { Space: [' ', 32], KeyK: ['k', 75], KeyL: ['l', 76], ArrowRight: ['ArrowRight', 39] };
const key = (type, code) => send('Input.dispatchKeyEvent', { type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1] });
const press = async (code) => { await key('keyDown', code); await sleep(40); await key('keyUp', code); };
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

async function open(path, w = 960, h = 540) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `http://localhost:${PORT}/${path}` });
  await sleep(700);
}

async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(out, name), Buffer.from(data, 'base64'));
  console.log(`  ${name}`);
}

let failed = false;
try {
  await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true }); // keep rAF running like a focused tab
  console.log(`Saving to ${out}`);

  await open('tools/cover.html', 1260, 1000);
  await shot('cover.png');

  await open('');
  await shot('01-title.png');

  // level 1 with real keys: run right, night across the gap, day before the gate, exit
  await press('Space');
  await sleep(500);
  await shot('10-act-card.png'); // the act 1 title card
  await press('Space'); // any key skips it
  await sleep(300);
  await shot('02-clock-in-day.png');
  // real key presses, timed by where the worker actually is (screenshots can stall frames)
  const tileX = () => evaluate('__doubleShift.state ? __doubleShift.state.player.x / 30 : 0');
  const until = async (cond, ms = 6000) => { const t0 = Date.now(); while (!(await cond()) && Date.now() - t0 < ms) await sleep(15); };
  await key('keyDown', 'ArrowRight');
  await until(async () => (await tileX()) > 4);
  await press('KeyK');
  await until(async () => (await tileX()) > 9);
  await shot('03-clock-in-night.png');
  await until(async () => (await tileX()) > 20.5);
  await press('KeyK');
  await until(async () => (await evaluate('__doubleShift.screen')) === 'card');
  await key('keyUp', 'ArrowRight');
  await sleep(700);
  const l1 = await evaluate('({ screen: __doubleShift.screen, shifts: __doubleShift.state.shifts, deaths: __doubleShift.state.deaths })');
  await shot('04-timecard.png');
  if (l1.screen !== 'card') { failed = true; console.error(`level 1 not cleared with real keys: ${JSON.stringify(l1)}`); }

  for (const [lvl, night, name] of [[5, false, '05-inventory-day.png'], [5, true, '06-inventory-night.png'], [6, true, '07-night-watch-night.png'], [6, false, '08-night-watch-day.png']]) {
    await open(`?level=${lvl}&autostart`);
    if (night) { await press('KeyK'); await sleep(400); }
    await shot(name);
  }

  // frame-time check on the busiest level (freaks, lasers, night): rAF intervals over 2 s
  await open('?level=6&autostart');
  await press('KeyK');
  // draw cost: render the busiest frame 120 times directly (headless rAF timing is throttled, so not used)
  const ft = await evaluate(`(() => { const g = __doubleShift; g.render(); const t0 = performance.now(); for (let i = 0; i < 120; i++) g.render(); const ms = (performance.now() - t0) / 120; return { ms }; })()`);
  console.log(`  draw cost (level 6, night): ${ft.ms.toFixed(2)} ms per frame (budget 16.7)`);
  if (ft.ms > 8) { failed = true; console.error('drawing a frame is too slow'); }

  // level select, after the level-1 clear above was saved (same browser profile)
  await open('');
  await press('KeyL');
  await sleep(300);
  const sel = await evaluate('__doubleShift.screen');
  await shot('09-level-select.png');
  if (sel !== 'select') { failed = true; console.error(`level select did not open: ${sel}`); }

  // asset gallery + offline audio loudness check (peaks before the master gain; must not clip)
  await open('tools/gallery.html', 1280, 1500);
  await sleep(500);
  await shot('11-gallery.png');
  const audio = await evaluate('window.__audioCheck()');
  const peaks = [...Object.entries(audio.sfx), ...Object.entries(audio.music).map(([k, v]) => [`music ${k}`, v.peak])];
  const loudest = peaks.sort((a, b) => b[1] - a[1])[0];
  console.log(`  audio: loudest ${loudest[0]} peak ${loudest[1]}; music day ${audio.music.day.peak}, night ${audio.music.night.peak} over ${audio.music.day.seconds}s each`);
  if (loudest[1] >= 1 || audio.music.day.seconds !== audio.music.night.seconds) { failed = true; console.error('audio check failed', audio); }
} catch (e) {
  failed = true;
  console.error(e.message);
} finally {
  ws?.close();
  browser.kill();
  server.kill();
  await sleep(500);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* browser may still hold files */ }
}
if (errors.length) { failed = true; console.error('page errors:', errors); }
console.log(failed ? 'FAILED' : 'ok: media saved, level 1 cleared with real keys, no page errors');
process.exit(failed ? 1 : 0);
