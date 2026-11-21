// A real-browser check of the shell paths a unit test cannot reach, over the same CDP helper the media script
// uses: prefers-reduced-motion seeding reduced effects (and an explicit save winning), the touch-only pointer
// probe, P pausing beside Esc, and interface time staying wall time under a 20x CPU throttle.
// Run with: npm run shell   (starts its own server and browser)
import { startBrowser, sleep } from './cdp.mjs';

const { evaluate, open, close, errors, send } = await startBrowser();

// Chromium decides `pointer: coarse` from touch emulation plus a mobile viewport.
async function emulate({ reducedMotion = null, touch = false } = {}) {
  await send('Emulation.setEmulatedMedia', {
    features: reducedMotion ? [{ name: 'prefers-reduced-motion', value: reducedMotion }] : [],
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: touch ? 1 : 1 });
  await send('Emulation.setEmitTouchEventsForMouse', { enabled: touch, configuration: 'mobile' });
  await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 540, deviceScaleFactor: 1, mobile: touch });
}

// The running game's settings, read from the shell (the boot-time default is in memory, not in storage, until the
// player saves — reading localStorage would miss it).
const readSettings = () => evaluate('(() => ({ reduced: __doubleShift.settings.get().reduced, stored: __doubleShift.settings.stored() }))()');
const clearStorage = () => evaluate('localStorage.clear()');

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

try {
  // 1. A first run under prefers-reduced-motion: reduce starts with reduced effects on, and has saved nothing.
  await open('?tools');
  await clearStorage();
  await emulate({ reducedMotion: 'reduce' });
  await open('?tools');
  await sleep(300);
  const seeded = await readSettings();
  check('prefers-reduced-motion seeds reduced effects on a first run', seeded.reduced === true && seeded.stored === false, JSON.stringify(seeded));

  // 2. The OS preference flipping back changes it, because the player still has not chosen.
  await emulate({ reducedMotion: 'no-preference' });
  await open('?tools');
  await sleep(300);
  const flipped = await readSettings();
  check('the OS preference is still followed before the player saves', flipped.reduced === false, JSON.stringify(flipped));

  // 3. One explicit save wins, permanently.
  await evaluate(`(async () => { const m = await import('/src/save.js'); m.createSettings(localStorage).set({ reduced: true }); })()`);
  await emulate({ reducedMotion: 'no-preference' });
  await open('?tools');
  await sleep(300);
  const saved = await readSettings();
  check('an explicit choice beats a later OS change', saved.reduced === true && saved.stored === true, JSON.stringify(saved));

  // 4. A touch-only device is detected (the title draws its notice from the same probe).
  await emulate({ touch: true });
  await open('?tools');
  await sleep(300);
  const probe = await evaluate(`(() => {
    const q = (s) => { try { return matchMedia(s).matches; } catch { return false; } };
    return { coarse: q('(pointer: coarse)'), fine: q('(any-pointer: fine)') };
  })()`);
  check('a touch-only device reads as coarse and not fine', probe.coarse === true && probe.fine === false, JSON.stringify(probe));

  // 5. P pauses and resumes a live level. Reset the media emulation first: this is a desktop check.
  await emulate();
  await open('?level=clock&autostart&tools');
  await sleep(700);
  const press = (code) => evaluate(`(() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}', bubbles: true })); })()`);
  const screen = () => evaluate('__doubleShift.screen');
  check('the level starts playing', (await screen()) === 'play', await screen());
  await press('KeyP');
  await sleep(150);
  check('P pauses a live level', (await screen()) === 'paused', await screen());
  await press('KeyP');
  await sleep(150);
  check('P resumes it', (await screen()) === 'play', await screen());

  // 6. Esc still pauses, and the two keys do not conflict.
  await press('Escape');
  await sleep(150);
  check('Esc still pauses', (await screen()) === 'paused', await screen());
  await press('Escape');
  await sleep(150);
  check('Esc still resumes', (await screen()) === 'play', await screen());

  // 7. Interface time is wall time: under a heavy CPU throttle the act card still shows for ~1.6 s of real time.
  //    With the old single clamped delta, every frame below 10 FPS shortened the clock and stretched it.
  await send('Emulation.setCPUThrottlingRate', { rate: 20 });
  await open('?tools');
  await sleep(400);
  const throttled = await evaluate(`(async () => {
    const g = __doubleShift;
    const t0 = performance.now();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true })); // title -> act card
    let sawCard = false; let worst = 0; let last = t0;
    for (let i = 0; i < 4000 && g.screen !== 'play'; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      worst = Math.max(worst, now - last); last = now;
      if (g.screen === 'act') sawCard = true;
    }
    return { ms: performance.now() - t0, sawCard, worstFrameMs: worst, screen: g.screen };
  })()`);
  await send('Emulation.setCPUThrottlingRate', { rate: 1 });
  check('the act card lasts about 1.6 s of real time under a 20x CPU throttle',
    throttled.sawCard && throttled.screen === 'play' && throttled.ms > 1200 && throttled.ms < 2600,
    `${Math.round(throttled.ms)} ms, worst frame ${Math.round(throttled.worstFrameMs)} ms`);

  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await close();
}

const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} failed` : '\nall accessibility checks passed');
process.exit(failed ? 1 : 0);
