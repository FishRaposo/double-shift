// itch.io media: drives headless Edge/Chrome over the DevTools protocol (no dependencies), presses real keys
// at full speed, and saves the cover + screenshots to media/. Also a full-speed smoke test: exits 1 if level 1
// can't be cleared with real keys or the page logs an error.
// Usage: node scripts/media.mjs [outdir] [--review id,id] [--gray] [--cvd] [--memo] [--root DIR]
//   --review id,id  only a day and a night shot of each level, into <outdir>/review/ (night is set directly:
//                   a picture of the geometry, not a playable state)
//   --gray, --cvd   with --review: also grayscale and color-blind (deuteranopia, protanopia, tritanopia) variants
//   --memo          with --review: also <id>-memo.png, the worker by the level's memo with its panel open
//   --root DIR      serve DIR instead of the repo (smoke-test the unzipped itch build: no cover, gallery or audio)
// BROWSER env overrides the browser path.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => {
  if (!argv.includes(name)) return null;
  const v = argv[argv.indexOf(name) + 1];
  if (v === undefined || v.startsWith('--')) { console.error(`${name} needs a value (e.g. ${name === '--review' ? '--review clock,watch' : `${name} <dir>`})`); process.exit(2); }
  return v;
};
const review = option('--review')?.split(',').filter(Boolean) ?? null;
const serveRoot = option('--root');
const positional = argv.filter((a, i) => !a.startsWith('--') && !['--review', '--root'].includes(argv[i - 1]));
const out = resolve(positional[0] || join(root, 'media'));
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
  '/opt/pw-browsers/chromium', // cloud sessions (Playwright's Chromium)
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browserPath = BROWSERS.find((p) => existsSync(p));
if (!browserPath) { console.error('No Edge/Chrome found; set BROWSER to its path.'); process.exit(1); }
mkdirSync(out, { recursive: true });

const serveArgs = [join(root, 'scripts/serve.mjs'), '--port', String(PORT), ...(serveRoot ? ['--root', serveRoot] : [])];
const server = spawn(process.execPath, serveArgs, { stdio: 'ignore' });
const profile = mkdtempSync(join(tmpdir(), 'ds-media-'));
const browser = spawn(browserPath, [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--autoplay-policy=no-user-gesture-required',
  ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), // Chromium refuses to sandbox as root (containers)
  'about:blank',
], { stdio: 'ignore' });

let ws;
let seq = 0;
const pending = new Map();
const errors = [];

async function connect() {
  for (let i = 0; i < 150; i++) { // up to 30 s: a cold Edge start can be slow
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

const KEYS = { Space: [' ', 32], KeyK: ['k', 75], KeyL: ['l', 76], KeyO: ['o', 79], KeyJ: ['j', 74], Enter: ['Enter', 13], Escape: ['Escape', 27], ArrowRight: ['ArrowRight', 39], ArrowDown: ['ArrowDown', 40] };
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

// Color-vision simulation for review shots (the common Brettel/Viénot matrices, applied in sRGB).
const CVD = {
  deuteranopia: '0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0',
  protanopia: '0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0',
  tritanopia: '0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0',
};
const CVD_SVG = Object.entries(CVD)
  .map(([k, v]) => `<filter id="cvd-${k}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${v}"/></filter>`)
  .join('');

// Review: a day and a night picture of each level, plus the requested variants. The simulation is stopped
// (won = true makes step() a no-op) so nothing falls or dies between the two shots.
async function reviewShots(ids) {
  const dir = join(out, 'review');
  mkdirSync(dir, { recursive: true });
  const variants = [['', 'none'], ...(flag('--gray') ? [['-gray', 'grayscale(1)']] : []),
    ...(flag('--cvd') ? Object.keys(CVD).map((k) => [`-${k.slice(0, 4)}`, `url(#cvd-${k})`]) : [])];
  for (const id of ids) {
    await open(`?level=${encodeURIComponent(id)}&autostart`);
    // ?level= falls back to level 1 for an unknown id: check the level that actually started
    const started = await evaluate(`(async () => { const g = __doubleShift; if (!g.state || g.screen !== 'play') return null; const { LEVELS } = await import('/src/levels.js'); return LEVELS[g.index].id; })()`);
    if (started !== id) throw new Error(`review: level "${id}" did not start (${started ? `got "${started}"` : 'nothing started'}); check the id`);
    await evaluate(`(() => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.style.position = 'absolute'; s.innerHTML = '${CVD_SVG}'; document.body.appendChild(s); })()`);
    for (const [shiftName, layer] of [['day', 0], ['night', 1]]) {
      await evaluate(`(() => { const s = __doubleShift.state; s.layer = ${layer}; s.won = true; })()`);
      await sleep(250);
      for (const [suffix, filter] of variants) {
        await evaluate(`document.getElementById('game').style.filter = '${filter}'`);
        await sleep(60);
        const name = `${id}-${shiftName}${suffix}.png`;
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(dir, name), Buffer.from(data, 'base64'));
        console.log(`  review/${name}`);
      }
      await evaluate(`document.getElementById('game').style.filter = 'none'`);
    }
    if (flag('--memo')) {
      // the worker moved to the memo's column, in the memo's shift, so its panel is open (WRITING.md §6.1)
      const at = await evaluate(`(async () => { const g = __doubleShift; const { LEVELS } = await import('/src/levels.js'); const m = (LEVELS[g.index].props ?? []).find((p) => p.kind === 'memo'); if (!m) return null; const s = g.state; s.layer = m.layer === 'night' ? 1 : 0; s.player.x = m.tx * 30 + 6; s.won = true; return m.tx; })()`);
      if (at !== null) {
        await sleep(250);
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(dir, `${id}-memo.png`), Buffer.from(data, 'base64'));
        console.log(`  review/${id}-memo.png`);
      }
    }
  }
}

let failed = false;
try {
  await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.bringToFront');
  await send('Emulation.setFocusEmulationEnabled', { enabled: true }); // keep rAF running like a focused tab
  console.log(`Saving to ${out}`);
  if (review) await reviewShots(review);
  else await fullRun();
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
if (failed) console.log('FAILED');
else if (review) console.log(`ok: review shots saved for ${review.join(', ')}, no page errors`);
else console.log(`ok: media saved, level 1 cleared with real keys, no page errors${serveRoot ? ` (served from ${serveRoot})` : ''}`);
process.exit(failed ? 1 : 0);

async function fullRun() {
  if (!serveRoot) {
    await open('tools/cover.html', 1260, 1000);
    await shot('cover.png');
  }

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

  // ---- flow checks (real keys) ----
  const flow = (name, ok, detail) => { console.log(`  flow: ${name} ${ok ? 'ok' : 'FAILED'}${ok ? '' : ` ${JSON.stringify(detail)}`}`); if (!ok) failed = true; };
  // 1. a key pressed to skip the act card keeps working: hold Right from the card into the level
  await open('');
  await press('Space'); // title -> act card
  await sleep(200);
  const x0 = await tileX();
  await key('keyDown', 'ArrowRight'); // skips the card AND is held
  await sleep(500);
  await key('keyUp', 'ArrowRight');
  const x1 = await tileX();
  flow('hold Right through the act card moves the worker', x1 > x0 + 1, { x0, x1 });
  // 2. mashing Space at the exit can't skip the timecard before the stamp lands
  await evaluate('(() => { const g = __doubleShift; g.state.won = false; g.screen = "card"; g.screenTime = 0; g.results[g.index] = { shifts: 2, par: 2, deaths: 0, time: 3 }; })()');
  await press('Space');
  flow('Space in the first 0.6 s keeps the timecard up', (await evaluate('__doubleShift.screen')) === 'card');
  // 3. settings opened from pause keep the night music
  await open('?level=watch&autostart');
  await press('KeyK');
  await sleep(200);
  await press('Escape');
  await press('KeyO');
  await sleep(100);
  const m = await evaluate('({ screen: __doubleShift.screen, music: __doubleShift.musicLayer })');
  flow('settings from pause keep the night music', m.screen === 'settings' && m.music === 1, m);
  // 4. the end screen fits every level (results for every level, played or not)
  await evaluate('(() => { const g = __doubleShift; for (let i = 0; i < 64; i++) if (!g.results[i]) g.results[i] = { shifts: 3, par: 3, deaths: 0, time: 4 }; g.screen = "end"; })()');
  await sleep(3500); // let the ending play: eyes open one by one, then one waves
  await shot('12-end.png');

  // levels by id, so inserting a level never shifts a capture
  for (const [id, night, name] of [['inventory', false, '05-inventory-day.png'], ['inventory', true, '06-inventory-night.png'], ['watch', true, '07-night-watch-night.png'], ['watch', false, '08-night-watch-day.png'], ['stacked', true, '13-stacked-night.png'], ['clockout', false, '14-clock-out-day.png'], ['clockout', true, '15-clock-out-night.png'], ['upside', true, '17-mind-your-head-night.png']]) {
    await open(`?level=${id}&autostart`);
    if (night) { await press('KeyK'); await sleep(400); }
    await shot(name);
  }

  // draw cost on the busiest level (freaks, lasers, night): render the frame 120 times directly
  // (headless rAF timing is throttled, so frame intervals aren't used)
  await open('?level=watch&autostart');
  await press('KeyK');
  const ft = await evaluate(`(() => { const g = __doubleShift; g.render(); const t0 = performance.now(); for (let i = 0; i < 120; i++) g.render(); const ms = (performance.now() - t0) / 120; return { ms }; })()`);
  console.log(`  draw cost (Night Watch, night): ${ft.ms.toFixed(2)} ms per frame (budget 16.7)`);
  if (ft.ms > 8) { failed = true; console.error('drawing a frame is too slow'); }

  // level select, after the level-1 clear above was saved (same browser profile)
  await open('');
  await press('KeyL');
  await sleep(300);
  const sel = await evaluate('__doubleShift.screen');
  await shot('09-level-select.png');
  if (sel !== 'select') { failed = true; console.error(`level select did not open: ${sel}`); }

  // controls: SETTINGS > CONTROLS, rebind JUMP to J with real keys, then back to the defaults
  await open('');
  await press('KeyO');
  for (let i = 0; i < 4; i++) await press('ArrowDown');
  await press('Enter'); // CONTROLS
  await press('ArrowDown');
  await press('ArrowDown');
  await press('Enter'); // JUMP: waiting for a key
  await press('KeyJ');
  await sleep(150);
  const jumpKeys = await evaluate("JSON.parse(localStorage.getItem('double-shift.settings.v1')).binds.jump");
  await shot('16-controls.png');
  flow('CONTROLS rebinds JUMP to J', JSON.stringify(jumpKeys) === '["KeyJ"]', jumpKeys);
  await press('ArrowDown');
  await press('ArrowDown');
  await press('Enter'); // RESET TO DEFAULTS
  const reset = await evaluate("JSON.parse(localStorage.getItem('double-shift.settings.v1')).binds.jump");
  flow('RESET TO DEFAULTS puts Space, W and Up back on JUMP', JSON.stringify(reset) === '["Space","KeyW","ArrowUp"]', reset);

  // asset gallery + offline audio loudness check (peaks before the master gain; must not clip).
  // The tools aren't in the itch build, so --root skips them.
  if (serveRoot) return;
  await open('tools/gallery.html', 1280, 1500);
  await sleep(500);
  await shot('11-gallery.png');
  const audio = await evaluate('window.__audioCheck()');
  const peaks = [...Object.entries(audio.sfx), ...Object.entries(audio.music).map(([k, v]) => [`music ${k}`, v.peak])];
  const loudest = peaks.sort((a, b) => b[1] - a[1])[0];
  console.log(`  audio: loudest ${loudest[0]} peak ${loudest[1]}; music day ${audio.music.day.peak}, night ${audio.music.night.peak}; finale (every layer) day ${audio.music.day6.peak}, night ${audio.music.night6.peak}; over ${audio.music.day.seconds}s each`);
  if (loudest[1] >= 1 || new Set(Object.values(audio.music).map((m) => m.seconds)).size !== 1) { failed = true; console.error('audio check failed', audio); }
}
