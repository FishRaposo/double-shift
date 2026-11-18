// itch.io media: drives headless Edge/Chrome over the DevTools protocol (no dependencies), presses real keys
// at full speed, and saves the cover + screenshots to media/. Also a full-speed smoke test: exits 1 if level 1
// can't be cleared with real keys or the page logs an error.
// Usage: node scripts/media.mjs [outdir] [--review id,id] [--gray] [--cvd] [--memo] [--root DIR]
//   --review id,id  only a day and a night shot of each level, into <outdir>/review/ (night is set directly:
//                   a picture of the geometry, not a playable state)
//   --gray, --cvd   with --review: also grayscale and color-blind (deuteranopia, protanopia, tritanopia) variants
//   --notext id,id  the show-don't-tell deck: each level with no notes, memos or signs, before and after its repairs
//   --memo          with --review: also <id>-memo.png, the worker by the level's memo with its panel open
//   --root DIR      serve DIR instead of the repo (smoke-test the unzipped itch build: no cover, gallery or audio)
// BROWSER env overrides the browser path (scripts/cdp.mjs starts the browser and serves the game).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { startBrowser, sleep } from './cdp.mjs';

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
const notext = option('--notext')?.split(',').filter(Boolean) ?? null;
const serveRoot = option('--root');
const positional = argv.filter((a, i) => !a.startsWith('--') && !['--review', '--root', '--notext'].includes(argv[i - 1]));
const out = resolve(positional[0] || join(root, 'media'));
mkdirSync(out, { recursive: true });

let page;
try {
  page = await startBrowser({ serveRoot, profilePrefix: 'ds-media-' });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const { send, evaluate, open, errors } = page;

const KEYS = { ArrowLeft: ['ArrowLeft', 37], Space: [' ', 32], KeyK: ['k', 75], KeyL: ['l', 76], KeyO: ['o', 79], KeyJ: ['j', 74], Enter: ['Enter', 13], Escape: ['Escape', 27], ArrowRight: ['ArrowRight', 39], ArrowDown: ['ArrowDown', 40] };
// A held key repeats, as a real keyboard's does: the game leans on that to pick a hold back up after it lets go of
// every key (a screen change, a lost focus). Without it a hold can silently end mid-level.
const heldKeys = new Set();
const keyEvent = (type, code, autoRepeat = false) => send('Input.dispatchKeyEvent', { type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1], autoRepeat });
const key = (type, code) => {
  if (type === 'keyDown') heldKeys.add(code);
  else heldKeys.delete(code);
  return keyEvent(type, code);
};
setInterval(() => { for (const code of heldKeys) keyEvent('keyDown', code, true).catch(() => {}); }, 33).unref();
const press = async (code) => { await key('keyDown', code); await sleep(40); await key('keyUp', code); };

// A moment from a level's scripted run (the run the tests prove: test/solutions.mjs), for shots real keys can't
// time: `after` seconds past the run's first `event` (a prank, a shift), found by stepping one tick at a time,
// so a tuning change can't move the shot off its moment. requestAnimationFrame is off meanwhile.
async function moment(id, event, after, name) {
  const { identifier } = await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.requestAnimationFrame = () => 0;' });
  try {
    await open(`?level=${encodeURIComponent(id)}&autostart`);
    const found = await evaluate(`(async () => {
      const g = __doubleShift;
      const { SOLUTIONS } = await import('/test/solutions.mjs');
      const { inputsFrom } = await import('/test/helpers.mjs');
      const next = inputsFrom(SOLUTIONS[${JSON.stringify(id)}]);
      let seen = false;
      for (let tick = 0; tick < 120 * 20 && !seen; tick++) {
        g.advance(1 / 120, next); // exactly one tick
        seen = g.state.events.some((e) => e.type === ${JSON.stringify(event)});
      }
      if (!seen) return false;
      for (let tick = 0; tick < Math.round(${after} * 120); tick++) g.advance(1 / 120, next);
      g.render();
      return true;
    })()`);
    if (!found) throw new Error(`moment: ${id}'s scripted run has no ${event} in 20 s`);
    await shot(name);
  } finally {
    await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
  }
}

// The show-don't-tell deck: every level with no notes, memos or signs, before and after its repairs, on both shifts.
async function notextDeck(ids) {
  const { identifier } = await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.requestAnimationFrame = () => 0;' });
  for (const id of ids) {
    await open(`?level=${encodeURIComponent(id)}&autostart&notext`);
    for (const [when, layer] of [['before', 0], ['before', 1], ['after', 0], ['after', 1]]) {
      await evaluate(`(async () => {
        const g = __doubleShift;
        g.startState ??= g.state; // before the deck turned the shift by hand
        if (${JSON.stringify(when)} === 'after' && !g.fixedUp) {
          g.state = g.startState;
          const { SOLUTIONS } = await import('/test/solutions.mjs');
          const { inputsFrom } = await import('/test/helpers.mjs');
          const next = inputsFrom(SOLUTIONS[${JSON.stringify(id)}]);
          for (let i = 0; i < 120 * 30 && g.screen === 'play' && !g.state.repairs.every((r) => r.done); i++) g.advance(1 / 120, next);
          g.fixedUp = true;
        }
        g.state = { ...g.state, layer: ${layer}, events: [] };
        g.render();
      })()`);
      await shot(`notext/${id}-${when}-${layer ? 'night' : 'day'}.png`);
    }
  }
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
}

async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  mkdirSync(dirname(join(out, name)), { recursive: true }); // review/timer-hud.png into a fresh outdir
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
  console.log(`Saving to ${out}`);
  if (notext) await notextDeck(notext);
  else if (review) await reviewShots(review);
  else await fullRun();
} catch (e) {
  failed = true;
  console.error(e.message);
} finally {
  await page.close();
}
if (errors.length) { failed = true; console.error('page errors:', errors); }
if (failed) console.log('FAILED');
else if (notext) console.log(`ok: text-free deck saved for ${notext.join(', ')}`);
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

  // level 1 with real keys: run right, night across the gap, day for the bolt, up the deck, night past the gate, exit
  await press('Space');
  await sleep(500);
  await shot('10-act-card.png'); // the act 1 title card
  await press('Space'); // any key skips it
  await sleep(300);
  await shot('02-clock-in-day.png');
  // real key presses, timed by where the worker actually is (screenshots can stall frames)
  const tileX = () => evaluate('__doubleShift.state ? __doubleShift.state.player.x / 30 : 0');
  // waits are on the game's state with a long limit: a headless browser's frames can crawl, and this checks that
  // the level can be cleared with real keys, not how fast
  const until = async (cond, ms = 30000) => { const t0 = Date.now(); while (!(await cond()) && Date.now() - t0 < ms) await sleep(15); };
  await key('keyDown', 'ArrowRight');
  await until(async () => (await tileX()) > 4);
  await press('KeyK');
  await until(async () => (await tileX()) > 9);
  await shot('03-clock-in-night.png');
  // stop past the boards and clock out standing still, so a late frame can't carry the worker past the bolt first
  await until(async () => (await tileX()) > 18.9);
  await key('keyUp', 'ArrowRight');
  await until(async () => (await evaluate('__doubleShift.state.player.vx')) === 0);
  await press('KeyK');
  await until(async () => (await evaluate('__doubleShift.state.layer')) === 0);
  await key('keyDown', 'ArrowRight');
  // a full jump by the game's clock, not the wall's: hold until the worker has left the ground and stopped rising
  const rising = () => evaluate('(() => { const p = __doubleShift.state.player; return p.grounded || p.vy < 0; })()');
  const hop = async (at) => {
    // each jump from a standstill inside [at, at + 0.7]: a late frame can carry the worker past the mark and under
    // the ledge, so stop, and step back in short taps until the spot is right
    await until(async () => (await tileX()) > at);
    await key('keyUp', 'ArrowRight');
    const still = () => until(async () => evaluate('(() => { const p = __doubleShift.state.player; return p.grounded && p.vx === 0; })()'));
    await still();
    for (let i = 0; i < 40; i++) {
      const x = await tileX();
      if (x >= at && x <= at + 0.7) break;
      const dir = x < at ? 'ArrowRight' : 'ArrowLeft';
      await key('keyDown', dir);
      await sleep(30);
      await key('keyUp', dir);
      await still();
    }
    await key('keyDown', 'ArrowRight');
    await key('keyDown', 'Space');
    await until(async () => !(await evaluate('__doubleShift.state.player.grounded')), 5000);
    await until(async () => !(await rising()), 5000);
    await key('keyUp', 'Space');
  };
  await hop(20.2); // up onto the deck the bolt raised
  await hop(22.4); // and from the deck to the top floor
  await until(async () => (await tileX()) > 26);
  await key('keyUp', 'ArrowRight'); // the same before the day crew's gate
  await until(async () => (await evaluate('__doubleShift.state.player.vx')) === 0);
  await press('KeyK');
  await until(async () => (await evaluate('__doubleShift.state.layer')) === 1);
  await key('keyDown', 'ArrowRight');
  await until(async () => (await tileX()) > 29.4 || (await evaluate('__doubleShift.screen')) === 'card');
  await key('keyUp', 'ArrowRight'); // a jump can carry you over the door: come back to it
  await until(async () => (await evaluate('__doubleShift.screen')) === 'card', 1000);
  if ((await evaluate('__doubleShift.screen')) !== 'card') {
    await key('keyDown', 'ArrowLeft');
    await until(async () => (await evaluate('__doubleShift.screen')) === 'card' || (await tileX()) < 28.5, 5000); // never back off the ledge
    await key('keyUp', 'ArrowLeft');
  }
  await sleep(700);
  const l1 = await evaluate('({ screen: __doubleShift.screen, shifts: __doubleShift.state.shifts, deaths: __doubleShift.state.deaths, x: __doubleShift.state.player.x / 30, y: __doubleShift.state.player.y / 30, layer: __doubleShift.state.layer })');
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
  await until(async () => (await tileX()) > x0 + 1, 3000);
  await key('keyUp', 'ArrowRight');
  const x1 = await tileX();
  flow('hold Right through the act card moves the worker', x1 > x0 + 1, { x0, x1 });
  // 2. mashing Space at the exit can't skip the timecard before the stamp lands
  await evaluate('(() => { const g = __doubleShift; g.state.won = false; g.screen = "card"; g.screenTime = 0; g.results[g.index] = { shifts: 2, par: 2, deaths: 0, time: 3 }; })()');
  await press('Space');
  flow('Space in the first 0.6 s keeps the timecard up', (await evaluate('__doubleShift.screen')) === 'card');
  // 3. settings opened from pause keep the night music
  await open('?level=watch&autostart');
  await sleep(300); // the page's first frames
  await press('KeyK');
  await sleep(300);
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

  // the speedrun timer: SETTINGS > SPEEDRUN TIMER on with real keys; a level's HUD shows TIME; then off again
  await open('');
  await press('KeyO');
  for (let i = 0; i < 5; i++) await press('ArrowDown');
  await press('Enter'); // SPEEDRUN TIMER: ON
  await sleep(150);
  await shot('18-settings.png');
  const timerOn = await evaluate("JSON.parse(localStorage.getItem('double-shift.settings.v1')).timer");
  flow('SETTINGS turns the speedrun timer on', timerOn === true, timerOn);
  await open('?level=clock&autostart');
  await sleep(1200);
  await shot('review/timer-hud.png');
  await evaluate("(() => { const s = JSON.parse(localStorage.getItem('double-shift.settings.v1')); s.timer = false; localStorage.setItem('double-shift.settings.v1', JSON.stringify(s)); })()");

  // controls: SETTINGS > CONTROLS, rebind JUMP to J with real keys, then back to the defaults
  await open('');
  await press('KeyO');
  for (let i = 0; i < 6; i++) await press('ArrowDown');
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

  // gamepad: a stubbed standard pad (headless Chromium has none): A clocks in from the title, B shifts in the level
  await open('');
  await evaluate("(() => { window.__pad = { id: 'stub', mapping: 'standard', connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) }; navigator.getGamepads = () => [window.__pad]; })()");
  await sleep(300); // the page's first frames
  // held until the game has seen it (a frame can be late), then let go
  const tap = async (i, seen) => { await evaluate(`window.__pad.buttons[${i}].pressed = true`); await until(async () => evaluate(seen), 15000); await evaluate(`window.__pad.buttons[${i}].pressed = false`); await sleep(150); };
  await tap(0, "__doubleShift.screen !== 'title'");
  // the act card runs out on the game's clock, and a headless browser's frames can crawl: wait for the level itself
  // (B pressed on the card would skip it, which spends no clock-in)
  await until(async () => (await evaluate('__doubleShift.screen')) === 'play', 30000);
  await sleep(100);
  await tap(1, '__doubleShift.state?.layer === 1');
  const padState = await evaluate('({ screen: __doubleShift.screen, layer: __doubleShift.state?.layer, index: __doubleShift.index, x: __doubleShift.state?.player.x, shifts: __doubleShift.state?.shifts, time: __doubleShift.state?.time })');
  flow('gamepad: A clocks in from the title, B shifts', padState.screen === 'play' && padState.layer === 1, padState);

  // an abandoned attempt doesn't count: clocking in from the title starts the run totals over
  await evaluate('(() => { const g = __doubleShift; g.spent = [99]; g.results = [{ shifts: 9, par: 1, deaths: 0, time: 99, spent: 99 }]; g.screen = "title"; })()');
  await press('Space');
  await sleep(200);
  const fresh = await evaluate('(() => { const g = __doubleShift; return { screen: g.screen, spent: g.spent.reduce((n, s) => n + (s ?? 0), 0), results: g.results.filter(Boolean).length }; })()');
  flow('clocking in from the title starts a new run', fresh.screen !== 'title' && fresh.spent < 5 && fresh.results === 0, fresh);

  // skipping an act card with the shift key holds it, but spends no clock-in
  await open('');
  await press('Space'); // the act card
  await sleep(200);
  await press('KeyK');
  await sleep(200);
  const skipped = await evaluate('({ screen: __doubleShift.screen, shifts: __doubleShift.state.shifts })');
  flow('skipping the act card spends no clock-in', skipped.screen === 'play' && skipped.shifts === 0, skipped);

  // Esc from a level select opened on a break goes back to the break; losing focus takes a break
  await open('?level=clock&autostart');
  await sleep(300);
  await press('Escape');
  await press('KeyL');
  await press('Escape');
  const back = await evaluate('__doubleShift.screen');
  flow('Esc from level select returns to the break it came from', back === 'paused', back);
  await press('Escape');
  await evaluate("dispatchEvent(new Event('blur'))");
  const blurred = await evaluate('__doubleShift.screen');
  flow('losing focus pauses the level', blurred === 'paused', blurred);

  // the last timecard can't be mashed past the ending
  await evaluate('(() => { const g = __doubleShift; g.screen = "end"; g.screenTime = 0; })()');
  await press('Space');
  const end = await evaluate('__doubleShift.screen');
  flow('Space in the first 0.6 s keeps the end screen up', end === 'end', end);

  // browser shortcuts stay the browser's: Ctrl+R in a level is the page's reload, not the game's restart
  await open('?level=clock&autostart');
  await sleep(400);
  const sc = await evaluate(`(() => {
    const g = __doubleShift;
    const before = g.state.time;
    const e = new KeyboardEvent('keydown', { code: 'KeyR', key: 'r', ctrlKey: true, cancelable: true, bubbles: true });
    dispatchEvent(e);
    return { prevented: e.defaultPrevented, restarted: g.state.time < before, before };
  })()`);
  flow('Ctrl+R is left to the browser (no restart, not blocked)', !sc.prevented && !sc.restarted && sc.before > 0, sc);

  // the tools and tests aren't in the itch build, so --root stops here
  if (serveRoot) return;

  // the itch page's first shots: a prank as it lands (Lost & Found's doors swap on the 1st night clock-in) and the
  // flip (Mind Your Head's first clock-in turns the night over)
  await moment('doors', 'prank', 0.14, '19-prank-lost-found.png');
  await moment('upside', 'shift', 0.11, '20-flip-mind-your-head.png');
  await moment('midair', 'repaired', 0.2, '21-repair-mid-air.png');

  // asset gallery + offline audio loudness check (peaks before the master gain; must not clip)
  await open('tools/gallery.html', 1280, 2100);
  await sleep(500);
  await shot('11-gallery.png');
  const audio = await evaluate('window.__audioCheck()');
  const peaks = [...Object.entries(audio.sfx), ...Object.entries(audio.music).map(([k, v]) => [`music ${k}`, v.peak])];
  const loudest = peaks.sort((a, b) => b[1] - a[1])[0];
  console.log(`  audio: loudest ${loudest[0]} peak ${loudest[1]}; music day ${audio.music.day.peak}, night ${audio.music.night.peak}; finale (every layer) day ${audio.music.day6.peak}, night ${audio.music.night6.peak}; over ${audio.music.day.seconds}s each`);
  if (loudest[1] >= 1 || new Set(Object.values(audio.music).map((m) => m.seconds)).size !== 1) { failed = true; console.error('audio check failed', audio); }
}
