// Headless browser smoke test: loads the page, plays level 1 with real key events, captures screenshots.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = await import('playwright')); } catch { ({ chromium } = require('playwright')); }
const base = process.argv[2] || 'http://localhost:8080/';
const out = process.argv[3] || 'media';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(base);
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/title.png` });
await page.keyboard.press('Space');
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/level1-day.png` });
// play level 1 with real keys: run right, shift to night, cross, shift back to day
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(250);
await page.keyboard.press('Shift');
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/level1-night.png` });
await page.waitForTimeout(1000);
await page.keyboard.press('KeyK');
await page.waitForTimeout(1200);
await page.keyboard.up('ArrowRight');
const g = await page.evaluate(() => ({ screen: __doubleShift.screen, shifts: __doubleShift.state.shifts, deaths: __doubleShift.state.deaths }));
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/timecard.png` });
for (const [lvl, shift] of [[2, false], [3, true], [4, false], [4, true]]) {
  await page.goto(`${base}?level=${lvl}&autostart`);
  await page.waitForTimeout(200);
  if (shift) { await page.keyboard.press('KeyK'); await page.waitForTimeout(150); }
  await page.screenshot({ path: `${out}/level${lvl}-${shift ? 'night' : 'day'}.png` });
}
await browser.close();
console.log(JSON.stringify({ level1: g, errors }));
if (errors.length || g.screen !== 'card' || g.shifts !== 2) process.exit(1);
