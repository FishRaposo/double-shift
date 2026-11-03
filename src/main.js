// Double Shift — browser shell: input capture, fixed-step loop, rendering.
// Draws only what src/rules.js decided. Art lives in sprites.js (characters) and art.js (everything else).

import { step, initState, parseLevel, tileAt, isSolidChar, freakBoxes, TILE, DT, DAY, NIGHT, PARAMS, FREAK } from './rules.js';
import { LEVELS, ACTS, FINALE_ACT } from './levels.js';
import { createInput, GAME_KEYS } from './input.js';
import { sfx, playSound, unlockAudio, toggleMute, setVolumes, setMusicShift, setMenu } from './audio.js';
import { skinPlan } from './skins.js';
import { createSave, createSettings, isUnlocked } from './save.js';
import { drawText, measureText, wrapText } from './font.js';
import { drawSprite, drawEyes, eyesOpen, workerFrame, ART, SPRITES, C } from './sprites.js';
import {
  PAL, PROPS, drawBackground, drawSolidTile, drawHatch, drawEchoEdges, drawRebar, drawLaser, drawHazardEcho,
  drawExit, drawCheckpoint, drawSign, drawFreak, drawShiftRing, drawDust, drawPuff, drawSparkle, drawPanel,
  drawStamp, drawLogo, drawWetTile, drawSkin, shouldHatch, PLATE, NOTE_STRIP, px,
} from './art.js';
import { SPOOK_LINES, ACT_LINES, CREDITS, timecardComment, stampText } from './copy.js';
import { levelIndex, actRows, cardRect, tabRect, detailRect, moveSelect, endSummary, selectClick, canvasScale, CARD } from './layout.js';

const W = 960;
const H = 540;
const A = ART;
const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;
const input = createInput();
const NIGHT_PAL = SPRITES.worker.nightPalette;
const levels = LEVELS.map(parseLevel);
const storage = (() => { try { return localStorage; } catch { return null; } })();
const save = createSave(storage);
const settings = createSettings(storage);
setVolumes(settings.get());

const params = new URLSearchParams(location.search);
const freshFx = () => ({ flash: 0, flashLayer: DAY, fail: 0, death: 0, land: 0, rings: [], pops: [], dust: [], puffs: [], sparkles: [], spook: null, freeze: 0, squint: 0, ping: 0 });
const game = {
  screen: 'title', // title | select | settings | act | play | card | end | paused
  settingsFrom: 'title', // where Esc returns to from settings
  settingsRow: 0,
  selected: 0, // highlighted card on the level select screen
  newBest: false, // the last clear beat a saved best
  index: levelIndex(LEVELS, params.get('level')), // ?level=<id> or ?level=<1-based position>
  state: null,
  results: [],
  debug: params.has('debug'),
  fx: freshFx(),
  levelTime: 0,
  clock: 0, // real seconds, for menu animation
  screenTime: 0, // seconds on the current screen (card stamp, act card)
  actShown: 0, // last act whose title card was shown
};

function level() { return levels[game.index]; }

function setScreen(s) {
  game.screen = s;
  game.screenTime = 0;
}

// Start a level. An act's first level gets its title card first, once per run through the act.
function startLevel(i, { card = true } = {}) {
  game.index = i;
  game.state = initState(levels[i]);
  game.levelTime = 0;
  game.fx = freshFx();
  input.clear();
  const act = LEVELS[i].act;
  if (card && act !== game.actShown) {
    game.actShown = act;
    sfx.sting?.();
    setScreen('act');
  } else setScreen('play');
}

function openSettings() {
  game.settingsFrom = game.screen;
  game.settingsRow = 0;
  setScreen('settings');
  input.clear();
}

// Settings rows: three volumes, then reduced effects.
const SETTING_ROWS = [['master', 'MASTER'], ['music', 'MUSIC'], ['sfx', 'SOUND'], ['reduced', 'REDUCED EFFECTS']];

function adjustSetting(row, dir) {
  const [key] = SETTING_ROWS[row];
  const cur = settings.get();
  const next = key === 'reduced' ? settings.set({ reduced: !cur.reduced }) : settings.set({ [key]: Math.round((cur[key] + dir * 0.1) * 10) / 10 });
  setVolumes(next);
  sfx.uiMove();
}

function openSelect() {
  game.selected = game.index;
  setScreen('select');
  input.clear();
}

// ---------- input ----------

addEventListener('keydown', (e) => {
  unlockAudio();
  if (GAME_KEYS.has(e.code) || e.code === 'Enter' || e.code === 'Escape') e.preventDefault();
  if (e.repeat) { input.keyDown(e); return; }
  if (e.code === 'KeyM') { toggleMute(); return; }
  if (e.code === 'Backquote') { game.debug = !game.debug; return; }
  if (game.screen === 'title') {
    if (e.code === 'Space' || e.code === 'Enter') startLevel(game.index);
    else if (e.code === 'KeyL') openSelect();
    else if (e.code === 'KeyO') openSettings();
    return;
  }
  if (game.screen === 'settings') {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { game.settingsRow = (game.settingsRow + SETTING_ROWS.length - 1) % SETTING_ROWS.length; sfx.uiMove(); }
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') { game.settingsRow = (game.settingsRow + 1) % SETTING_ROWS.length; sfx.uiMove(); }
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') adjustSetting(game.settingsRow, -1);
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') adjustSetting(game.settingsRow, 1);
    else if ((e.code === 'Space' || e.code === 'Enter') && SETTING_ROWS[game.settingsRow][0] === 'reduced') adjustSetting(game.settingsRow, 0);
    else if (e.code === 'Escape' || e.code === 'KeyO') setScreen(game.settingsFrom);
    return;
  }
  if (game.screen === 'act') { setScreen('play'); input.keyDown(e); return; }
  if (game.screen === 'select') {
    const dir = SELECT_KEYS[e.code];
    if (dir) { game.selected = moveSelect(LEVELS, game.selected, dir[0], dir[1]); sfx.uiMove?.(); }
    else if (e.code === 'Space' || e.code === 'Enter') {
      if (isUnlocked(LEVELS, game.selected, save)) { sfx.uiSelect?.(); startLevel(game.selected); }
      else sfx.shiftFail(); // NOT YET
    }
    else if (e.code === 'Escape' || e.code === 'KeyL') setScreen('title');
    return;
  }
  if (game.screen === 'card') {
    if (game.screenTime < 0.6) return; // let the stamp land
    if (e.code === 'Space' || e.code === 'Enter') {
      if (game.index + 1 < levels.length) startLevel(game.index + 1);
      else setScreen('end');
    } else if (e.code === 'KeyR') startLevel(game.index, { card: false });
    return;
  }
  if (game.screen === 'end') {
    if (e.code === 'Space' || e.code === 'Enter') { game.results = []; game.actShown = 0; startLevel(0); }
    return;
  }
  if (game.screen === 'paused') {
    if (e.code === 'Escape' || e.code === 'Space') setScreen('play');
    else if (e.code === 'KeyR') startLevel(game.index, { card: false });
    else if (e.code === 'KeyL') openSelect();
    else if (e.code === 'KeyO') openSettings();
    return;
  }
  // play
  if (e.code === 'Escape') { setScreen('paused'); input.clear(); return; }
  if (e.code === 'KeyR') { startLevel(game.index, { card: false }); return; }
  input.keyDown(e);
});
addEventListener('keyup', (e) => { input.keyUp(e); });
addEventListener('blur', () => input.clear());
// Size the canvas in whole pixels where the window allows 2× or more (src/layout.js canvasScale); the CSS in
// index.html is the fallback before this runs.
function fitCanvas() {
  const k = canvasScale(innerWidth, innerHeight);
  canvas.style.width = `${Math.round(W * k)}px`;
  canvas.style.height = `${Math.round(H * k)}px`;
}
addEventListener('resize', fitCanvas);
fitCanvas();

// In an itch.io embed the first click is what gives the game keyboard focus, so let it clock in too.
canvas.addEventListener('pointerdown', (e) => {
  canvas.focus();
  unlockAudio();
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) * W) / r.width;
  const y = ((e.clientY - r.top) * H) / r.height;
  const inside = (b) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  if (game.screen === 'title') {
    if (inside(TITLE_SELECT)) openSelect();
    else if (inside(TITLE_SETTINGS)) openSettings();
    else startLevel(game.index);
  } else if (game.screen === 'settings') {
    const row = SETTING_ROWS.findIndex((_, k) => inside(settingRect(k)));
    if (row >= 0) { const r = settingRect(row); adjustSetting(row, x < r.x + r.w / 2 ? -1 : 1); }
    else setScreen(game.settingsFrom); // click outside the rows: back
  } else if (game.screen === 'act') {
    setScreen('play');
  } else if (game.screen === 'select') {
    const hit = selectClick(LEVELS, x, y); // src/layout.js: tabs and gaps do nothing; header and hints go back
    if (hit.kind === 'back') setScreen('title');
    else if (hit.kind !== 'none') {
      const i = hit.kind === 'card' ? hit.index : game.selected; // the detail bar clocks into the selection
      if (isUnlocked(LEVELS, i, save)) startLevel(i);
      else { game.selected = i; sfx.shiftFail(); } // NOT YET
    }
  } else if (game.screen === 'card' && game.screenTime >= 0.6) {
    if (game.index + 1 < levels.length) startLevel(game.index + 1);
    else setScreen('end');
  } else if (game.screen === 'end') {
    game.results = []; game.actShown = 0; startLevel(0);
  }
});

// ---------- level select ----------
// One row of timecards per act, laid out by src/layout.js. Act starts are always open (src/save.js).

const TITLE_SELECT = { x: W / 2 - 250, y: 444, w: 240, h: 32 };
const TITLE_SETTINGS = { x: W / 2 + 10, y: 444, w: 240, h: 32 };
const settingRect = (row) => ({ x: W / 2 - 260, y: 150 + row * 58, w: 520, h: 46 });
const SELECT_KEYS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1],
};
// ---------- simulation ----------

let spookIx = 0;

function handleEvents(events) {
  const p = game.state.player;
  const fx = game.fx;
  const cx = p.x + PARAMS.playerW / 2;
  for (const ev of events) {
    switch (ev.type) {
      case 'shift':
        sfx.shift(ev.layer === NIGHT);
        if (level().offset) sfx.offsetRumble(); // the building is half a storey off here
        fx.flash = 1;
        fx.flashLayer = ev.layer;
        fx.rings.push({ x: cx, y: p.y + PARAMS.playerH / 2, t: 0, layer: ev.layer });
        if (level().freaks.some((f) => f.shift !== ev.layer)) { fx.freeze = 1; sfx.freeze?.(); } // someone just froze
        break;
      case 'shiftFail': sfx.shiftFail(); fx.fail = 1; break;
      case 'jump': sfx.jump(); fx.dust.push({ x: cx, y: p.y + PARAMS.playerH, t: 0 }); break;
      case 'land': sfx.land(); fx.land = 0.1; fx.dust.push({ x: cx, y: p.y + PARAMS.playerH, t: 0 }); break;
      case 'wetStop': sfx.wetStop(); break;
      case 'peek': sfx.peekerBoing(); break; // a peeker popped out on your shift
      case 'supervisorTurn': sfx.supervisorTurn(); break;
      case 'death':
        if (ev.cause === 'spooked') {
          (ev.by === 'daywalker' ? sfx.daywalkerGiggle : sfx.spooked)();
          fx.pops.push({ x: ev.x + PARAMS.playerW / 2, y: ev.y - 20, t: 0, text: SPOOK_LINES[spookIx++ % SPOOK_LINES.length] });
          fx.spook = { x: ev.x, y: ev.y, t: 0, layer: ev.layer ?? game.state.layer };
        } else {
          sfx.death();
          fx.puffs.push({ x: ev.x + PARAMS.playerW / 2, y: ev.y + PARAMS.playerH / 2, t: 0 });
        }
        fx.death = 1;
        break;
      case 'prank': {
        sfx.giggle();
        sfx.shimmer?.();
        fx.squint = 1;
        fx.pops.push({ x: W / 2, y: 86, t: 0, text: 'hee hee hee', big: true });
        const pr = level().pranks.find((q) => q.id === ev.id);
        if (pr?.sound) playSound(pr.sound); // e.g. doorThunk under the giggle
        for (const [, tx, ty] of pr?.cells ?? []) fx.sparkles.push({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, t: 0, seed: tx * 31 + ty });
        break;
      }
      case 'checkpoint': sfx.checkpoint(); fx.ping = 1; break;
      case 'win':
        sfx.win();
        setTimeout(() => sfx.stamp(), 450);
        game.results[game.index] = { shifts: ev.shifts, par: ev.par, deaths: game.state.deaths, time: game.state.time };
        {
          const id = LEVELS[game.index].id;
          const hadBest = save.cleared(id);
          game.newBest = save.record(id, game.results[game.index]) && hadBest;
        }
        setScreen('card');
        break;
    }
  }
}

let acc = 0;
let last = performance.now();
function frame(now) {
  const elapsed = Math.min(Math.max((now - last) / 1000, 0), 0.1);
  last = now;
  game.clock += elapsed;
  game.screenTime += elapsed;
  if (game.screen === 'act' && game.screenTime > 1.6) setScreen('play');
  if (game.screen === 'play') {
    acc += elapsed;
    let steps = 0;
    while (acc >= DT && steps < 12) {
      game.state = step(level(), game.state, input.consume());
      handleEvents(game.state.events);
      acc -= DT;
      steps++;
      if (game.screen !== 'play') break;
    }
    game.levelTime += elapsed;
  } else {
    acc = 0;
  }
  const fx = game.fx;
  const decay = (v, d) => Math.max(0, v - elapsed / d);
  fx.flash = decay(fx.flash, 0.12);
  fx.fail = decay(fx.fail, 0.25);
  fx.death = decay(fx.death, 0.3);
  fx.land = decay(fx.land, 1);
  fx.freeze = decay(fx.freeze, 0.15);
  fx.squint = decay(fx.squint, 0.8);
  fx.ping = decay(fx.ping, 0.2);
  for (const k of ['rings', 'pops', 'dust', 'puffs', 'sparkles']) {
    const life = { rings: 0.3, pops: 0.9, dust: 0.3, puffs: 0.4, sparkles: 0.5 }[k];
    fx[k] = fx[k].filter((q) => (q.t += elapsed) < life);
  }
  if (fx.spook && (fx.spook.t += elapsed) > 0.35) fx.spook = null;
  const inLevel = game.screen === 'play' || game.screen === 'paused' || game.screen === 'card' || (game.screen === 'settings' && game.settingsFrom === 'paused');
  setMenu(!(game.screen === 'play'));
  const musicLayer = inLevel && game.state ? game.state.layer : DAY;
  if (musicLayer !== game.musicLayer) { game.musicLayer = musicLayer; setMusicShift(musicLayer); }
  render();
  requestAnimationFrame(frame);
}

// ---------- rendering ----------


function solidAt(lvl, layer, tx, ty, ov) {
  if (tx < 0 || tx >= lvl.w || ty < 0 || ty >= lvl.h) return false;
  return isSolidChar(tileAt(lvl, layer, tx, ty, ov));
}

// Outer edges of a layer's solid region, as segments: [x0, y0, x1, y1, 'top'|'bot'|'left'|'right'].
function solidEdges(lvl, layer, ov) {
  const segs = [];
  for (let ty = 0; ty < lvl.h; ty++) {
    for (let tx = 0; tx < lvl.w; tx++) {
      if (!solidAt(lvl, layer, tx, ty, ov)) continue;
      const x = tx * TILE;
      const y = ty * TILE;
      if (!solidAt(lvl, layer, tx, ty - 1, ov)) segs.push([x, y, x + TILE, y, 'top']);
      if (!solidAt(lvl, layer, tx, ty + 1, ov) && ty + 1 < lvl.h) segs.push([x, y + TILE, x + TILE, y + TILE, 'bot']);
      if (!solidAt(lvl, layer, tx - 1, ty, ov) && tx > 0) segs.push([x, y, x, y + TILE, 'left']);
      if (!solidAt(lvl, layer, tx + 1, ty, ov) && tx + 1 < lvl.w) segs.push([x + TILE, y, x + TILE, y + TILE, 'right']);
    }
  }
  return segs;
}

function makeCanvas() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

// The shift cues for one cell, over anything solid drawn there (skins included): hatch = only in this shift,
// and the other shift's hazards.
function drawShiftCues(ctx, lvl, layer, ov, tx, ty) {
  const other = 1 - layer;
  if (shouldHatch(lvl, layer, ov, tx, ty)) drawHatch(ctx, tx, ty, layer); // the rim of a one-shift region (art.js)
  if (tileAt(lvl, other, tx, ty, ov) === '^') drawHazardEcho(ctx, tx, ty, PAL[other].echo);
}

// Everything that doesn't move, drawn once per level × shift × prank state:
// the other shift's echo, solids, hatching, props and the exit. Returns { canvas, portraits }: portraits
// blink, so drawPlay() draws them per frame from this list (same cache key, no per-frame tile scans).
const staticCache = new Map();
function staticLayer(lvl, def, layer, ov) {
  const key = `${def.id}:${layer}:${JSON.stringify(ov)}`;
  const hit = staticCache.get(key);
  if (hit) return hit;
  const [c, ctx] = makeCanvas();
  const other = 1 - layer;
  // props first: they sit behind the geometry
  for (const pr of def.props ?? []) {
    if (pr.layer && (pr.layer === 'night') !== (layer === NIGHT)) continue;
    PROPS[pr.kind]?.(ctx, pr.tx * TILE, pr.ty * TILE, pr.w ?? pr, pr);
  }
  drawEchoEdges(ctx, solidEdges(lvl, other, ov), PAL[other].echo);
  for (let ty = 0; ty < lvl.h; ty++) {
    for (let tx = 0; tx < lvl.w; tx++) {
      const ch = tileAt(lvl, layer, tx, ty, ov);
      if (isSolidChar(ch)) {
        const open = {
          up: !solidAt(lvl, layer, tx, ty - 1, ov) && ty > 0,
          down: !solidAt(lvl, layer, tx, ty + 1, ov) && ty + 1 < lvl.h,
          left: !solidAt(lvl, layer, tx - 1, ty, ov) && tx > 0,
          right: !solidAt(lvl, layer, tx + 1, ty, ov) && tx + 1 < lvl.w,
        };
        if (ch === '~') drawWetTile(ctx, tx, ty, layer, open);
        else drawSolidTile(ctx, tx, ty, layer, open);
      }
    }
  }
  // object art over solid tiles (src/skins.js): a stolen door shows its frame, a moved pillar its crack
  const plan = skinPlan(lvl, layer, ov);
  for (const sp of plan) if (sp.draw !== 'portrait') drawSkin(ctx, sp, layer);
  for (let ty = 0; ty < lvl.h; ty++) for (let tx = 0; tx < lvl.w; tx++) drawShiftCues(ctx, lvl, layer, ov, tx, ty);
  drawExit(ctx, lvl.exit.tx, lvl.exit.ty, layer);
  if (staticCache.size > 24) staticCache.delete(staticCache.keys().next().value);
  const out = { canvas: c, portraits: plan.filter((sp) => sp.draw === 'portrait') };
  staticCache.set(key, out);
  return out;
}

// The sky and the act's backdrop (act 0: the menus' plain back wall), cached per act × shift. A run visits
// one act at a time, so the cache keeps the last few (2 MB each).
const bgCache = new Map();
function background(layer, act = 0) {
  const key = `${act},${layer}`;
  let c = bgCache.get(key);
  if (!c) {
    let ctx;
    [c, ctx] = makeCanvas();
    drawBackground(ctx, layer, W, H, 0, act);
    if (bgCache.size >= 6) bgCache.delete(bgCache.keys().next().value);
    bgCache.set(key, c);
  }
  return c;
}

function drawHazards(lvl, layer, t, ov) {
  for (let ty = 0; ty < lvl.h; ty++) {
    for (let tx = 0; tx < lvl.w; tx++) {
      if (tileAt(lvl, layer, tx, ty, ov) !== '^') continue;
      if (layer === DAY) drawRebar(g, tx, ty);
      else drawLaser(g, tx, ty, t, tx === 0 || tileAt(lvl, layer, tx - 1, ty, ov) !== '^', tx === lvl.w - 1 || tileAt(lvl, layer, tx + 1, ty, ov) !== '^');
    }
  }
}

function drawTells(lvl, s, layer, t) {
  for (const pr of lvl.pranks) {
    if (!pr.tell || s.nightEntries >= pr.onNight) continue;
    const x = pr.tell.tx * TILE + TILE / 2;
    const y = pr.tell.ty * TILE + TILE / 2;
    if (layer === NIGHT) {
      PROPS.eyes(g, x - 30, y - 50, { t, seed: 7 });
      PROPS.eyes(g, x + 4, y - 64, { t, seed: 3 });
    } else {
      drawSign(g, x, y - 36, 'MINE', 'note', 2);
    }
  }
}

function drawDecor(lvl, def, layer, t) {
  if (layer !== NIGHT) return;
  (def.decor ?? []).forEach((d, i) => {
    if (d.kind === 'eyes') PROPS.eyes(g, d.tx * TILE, d.ty * TILE, { t, seed: 11 + i * 5 });
  });
}

function drawWorker(s, layer) {
  const p = s.player;
  const fx = game.fx;
  const opts = (extra) => ({ flip: p.facing < 0, palette: layer === NIGHT ? NIGHT_PAL : null, ...extra });
  if (fx.fail > 0) {
    g.fillStyle = `rgba(255,70,70,${fx.fail})`;
    const x = Math.round(p.x) - 3 * A;
    const y = Math.round(p.y) - 6 * A;
    g.fillRect(x, y, PARAMS.playerW + 6 * A, A);
    g.fillRect(x, y + PARAMS.playerH + 8 * A, PARAMS.playerW + 6 * A, A);
    g.fillRect(x, y, A, PARAMS.playerH + 9 * A);
    g.fillRect(x + PARAMS.playerW + 5 * A, y, A, PARAMS.playerH + 9 * A);
  }
  drawSprite(g, 'worker', workerFrame(p, s.time, fx), p.x, p.y, opts());
}

function drawSpookGag() {
  // the worker leaps out of their boots; the boots stay put for a beat
  const sp = game.fx.spook;
  if (!sp) return;
  const pop = Math.sin(Math.min(1, sp.t / 0.35) * Math.PI) * 26;
  const palette = sp.layer === NIGHT ? NIGHT_PAL : null;
  drawSprite(g, 'worker', 'boots', sp.x, sp.y, { palette });
  drawSprite(g, 'worker', 'spookBody', sp.x, sp.y - pop, { palette });
}

function drawFx(layer, reduced) {
  const fx = game.fx;
  for (const d of fx.dust) drawDust(g, d.x, d.y, d.t / 0.3);
  for (const q of fx.puffs) drawPuff(g, q.x, q.y, q.t / 0.4);
  if (!reduced) {
    for (const r of fx.rings) drawShiftRing(g, r.x, r.y, r.t / 0.3, r.layer);
    for (const sp of fx.sparkles) drawSparkle(g, sp.x, sp.y, sp.t / 0.5, sp.seed);
    if (fx.flash > 0) {
      g.fillStyle = fx.flashLayer === NIGHT ? `rgba(40,80,200,${fx.flash * 0.18})` : `rgba(255,240,200,${fx.flash * 0.22})`;
      g.fillRect(0, 0, W, H);
    }
    if (fx.death > 0) {
      g.fillStyle = `rgba(200,30,40,${fx.death * 0.3})`;
      g.fillRect(0, 0, W, H);
    }
  }
  for (const q of fx.pops) {
    const a = Math.min(1, (0.9 - q.t) / 0.3);
    drawText(g, q.text, q.x, q.y - q.t * 30, { scale: 2, color: q.big ? '#ffec5a' : '#ffffff', halo: '#1b1209', align: 'center', alpha: a });
  }
}

// HUD text sits on a plate (the shift's sky at 85%) instead of a halo, so it never smears over brick or
// hatching (ART.md §3.1; contrast checked in test/palette.test.mjs).
function plate(left, top, w, h, layer) {
  g.fillStyle = PLATE[layer];
  g.fillRect(Math.round(left), Math.round(top), Math.round(w), Math.round(h));
}

function hud(text, x, y, layer, { align = 'left', scale = 2, color } = {}) {
  const w = measureText(text, scale);
  const left = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  plate(left - 4, y - 4, w + 8, 9 * scale + 6, layer);
  drawText(g, text, x, y, { scale, align, color: color ?? PAL[layer].hud });
}

// The level note: a paper strip, like everything official in the building.
function drawNoteStrip(text) {
  const w = measureText(text, 2);
  const left = Math.round(W / 2 - w / 2 - 10);
  const top = H - 36;
  px(g, left, top, (w + 20) / A, 14, NOTE_STRIP.border);
  px(g, left + A, top + A, (w + 20) / A - 2, 12, NOTE_STRIP.paper);
  drawText(g, text, W / 2, top + 7, { scale: 2, color: NOTE_STRIP.ink, align: 'center' });
}

function drawHud(lvl, s, layer) {
  const pal = PAL[layer];
  hud(`${game.index + 1}/${levels.length}  ${lvl.name.toUpperCase()}`, 14, 12, layer);
  // shift indicator: icon + label (not colour alone), on one plate
  const label = layer === DAY ? 'DAY SHIFT' : 'NIGHT SHIFT';
  const lw = measureText(label, 2);
  plate(W - 40 - lw - 4, 8, lw + 34, 24, layer);
  drawText(g, label, W - 40, 12, { scale: 2, align: 'right', color: pal.hud });
  const ix = W - 30;
  if (layer === DAY) {
    px(g, ix, 10, 6, 6, '#f2a516');
    px(g, ix - A, 12, 1, 2, '#f2a516');
    px(g, ix + 6 * A, 12, 1, 2, '#f2a516');
    px(g, ix + 2 * A, 8, 2, 1, '#f2a516');
    px(g, ix + 2 * A, 22, 2, 1, '#f2a516');
  } else {
    // crescent moon
    for (const [cx, cy, w] of [[2, 0, 3], [1, 1, 2], [0, 2, 2], [0, 3, 2], [0, 4, 2], [1, 5, 2], [2, 6, 3]]) px(g, ix + cx * A, 9 + cy * A, w, 1, '#d9f6ff');
  }
  const over = s.shifts > lvl.par;
  hud(`CLOCK-INS ${s.shifts}  ·  PAR ${lvl.par}`, W - 14, 36, layer, { align: 'right', color: over ? '#e0473c' : pal.hud });
  const note = LEVELS[game.index].note;
  if (game.levelTime < 5 && note) drawNoteStrip(note);
  if (game.index === 0 && s.shifts === 0) {
    hud('Press SHIFT (or K) to change shifts', W / 2, 140, layer, { align: 'center', scale: 3 });
    hud('Dashed outlines show the other shift', W / 2, 172, layer, { align: 'center', color: pal.hudSoft });
  }
}

function drawDebug(s) {
  const p = s.player;
  g.strokeStyle = '#ff00ff';
  g.lineWidth = 1;
  g.strokeRect(p.x + 0.5, p.y + 0.5, PARAMS.playerW - 1, PARAMS.playerH - 1);
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(10, H - 76, 470, 72);
  const t = (str, y) => drawText(g, str, 16, y, { scale: 1, color: '#00ff00' });
  t(`pos ${p.x.toFixed(1)},${p.y.toFixed(1)}  tile ${(p.x / TILE).toFixed(2)},${(p.y / TILE).toFixed(2)}`, H - 70);
  t(`vel ${p.vx.toFixed(0)},${p.vy.toFixed(0)}  grounded ${p.grounded}  coyote ${p.coyote.toFixed(3)}`, H - 54);
  t(`layer ${s.layer}  pending ${s.shiftPending.toFixed(3)}  deaths ${s.deaths}`, H - 38);
  t(`night clock ${s.freakClock.toFixed(2)}  day clock ${s.dayClock.toFixed(2)}  night entries ${s.nightEntries}`, H - 22);
}

function drawPlay() {
  const lvl = level();
  const def = LEVELS[game.index];
  const s = game.state;
  const layer = s.layer;
  const t = s.time;
  const reduced = settings.get().reduced;
  g.drawImage(background(layer, def.act), 0, 0);
  const still = staticLayer(lvl, def, layer, s.overrides);
  g.drawImage(still.canvas, 0, 0);
  drawHazards(lvl, layer, t, s.overrides);
  for (const sp of still.portraits) {
    drawSkin(g, sp, layer, t);
    // the shift cues on top of the per-frame portrait, like the static layer does for everything else
    for (let dy = 0; dy < sp.h; dy++) for (let dx = 0; dx < sp.w; dx++) drawShiftCues(g, lvl, layer, s.overrides, sp.tx + dx, sp.ty + dy);
  }
  for (const c of lvl.checkpoints) drawCheckpoint(g, c.tx, c.ty, s.checkpoint.id === c.id, s.checkpoint.id === c.id ? game.fx.ping : 0);
  drawDecor(lvl, def, layer, t);
  drawTells(lvl, s, layer, t);
  freakBoxes(lvl, s).forEach((b, i) => {
    const clock = b.shift === DAY ? s.dayClock : s.freakClock;
    let look = b.kind === 'lurker' || b.kind === 'daywalker' ? Math.sign(Math.sin(clock * 0.9 + i)) : 0;
    if (b.kind === 'supervisor') look = b.facing; // the clipboard's gaze is the tell
    // supervisors squint just before they turn: the readable anticipation cue
    const squint = Math.max(game.fx.squint, b.kind === 'supervisor' && b.turnIn < 0.35 ? 1 : 0);
    drawFreak(g, b, i, t, { layer, freakShift: b.shift, frozenFlash: game.fx.freeze, prankSquint: squint, look });
  });
  if (game.fx.spook) drawSpookGag();
  else drawWorker(s, layer);
  drawFx(layer, reduced);
  drawHud(lvl, s, layer);
  if (game.debug) drawDebug(s);
}

// ---------- screens ----------

function drawTitle() {
  // split screen: day on the left, night on the right
  g.save(); g.beginPath(); g.rect(0, 0, W / 2, H); g.clip(); g.drawImage(background(DAY), 0, 0); g.restore();
  g.save(); g.beginPath(); g.rect(W / 2, 0, W / 2, H); g.clip(); g.drawImage(background(NIGHT), 0, 0); g.restore();
  // a floor across both halves, with the worker on the seam
  for (let tx = 0; tx < 32; tx++) {
    const layer = tx < 16 ? DAY : NIGHT;
    drawSolidTile(g, tx, 16, layer, { up: true, down: false, left: false, right: false });
    drawSolidTile(g, tx, 17, layer, { up: false, down: false, left: false, right: false });
  }
  const logo = drawLogo(g, W / 2, 96, 9);
  const bob = Math.floor(game.clock * 1.6) % 2;
  drawSprite(g, 'worker', `idle${bob}`, logo.gapX + logo.gap / 2 - 13, 112, { scale: 3, palette: game.clock % 4 < 2 ? null : NIGHT_PAL });
  // the hook, under the logo (matches the itch cover; the subtitle is Fish's call, WRITING.md §2)
  drawText(g, 'The freaks come out at night.', W / 2, 196, { scale: 2, color: '#ffec5a', halo: '#1b1209', align: 'center' });
  // the night half isn't empty: eyes in the dark, and a lurker by the floor, watching the worker
  PROPS.eyes(g, 790, 210, { t: game.clock, seed: 2 });
  PROPS.eyes(g, 875, 300, { t: game.clock, seed: 5 });
  PROPS.eyes(g, 812, 405, { t: game.clock, seed: 9 });
  const peek = Math.floor(game.clock * 6) % 2 ? 'b' : 'a';
  drawSprite(g, 'lurker', peek, 900, 16 * TILE - FREAK.h);
  drawEyes(g, 'lurker', 900, 16 * TILE - FREAK.h, { state: eyesOpen(game.clock, 4) ? 'open' : 'shut', look: -1 });
  drawPanel(g, W / 2 - 270, 250, 540, 176, false);
  drawText(g, 'One building. Two shifts. One worker.', W / 2, 270, { scale: 2, color: '#ffffff', align: 'center' });
  drawText(g, 'Move  A/D or ←/→      Jump  Space/W/↑', W / 2, 310, { scale: 2, color: '#d9f6ff', align: 'center' });
  drawText(g, 'Change shift  Shift or K      Restart  R', W / 2, 334, { scale: 2, color: '#d9f6ff', align: 'center' });
  const blink = Math.floor(game.clock * 2) % 2 === 0;
  drawText(g, 'Click or press SPACE to clock in', W / 2, 380, { scale: 2, color: blink ? '#ffec5a' : '#ffffff', align: 'center' });
  for (const [b, label] of [[TITLE_SELECT, 'LEVEL SELECT (L)'], [TITLE_SETTINGS, 'SETTINGS (O)']]) {
    drawPanel(g, b.x, b.y, b.w, b.h, false);
    drawText(g, label, b.x + b.w / 2, b.y + 9, { scale: 2, color: '#ffffff', align: 'center' });
  }
  drawText(g, 'Windows: hammering Shift can open Sticky Keys — use K, or turn off the Sticky Keys shortcut.', W / 2, H - 16, { scale: 1, color: 'rgba(255,255,255,0.8)', align: 'center' });
}

function drawAct() {
  const def = LEVELS[game.index];
  const act = def.act;
  const finale = act === FINALE_ACT; // FINALE · CLOCK OUT · "One more shift."
  // the act card previews the act's backdrop, day on the left and night on the right
  g.save(); g.beginPath(); g.rect(0, 0, W / 2, H); g.clip(); g.drawImage(background(DAY, act), 0, 0); g.restore();
  g.save(); g.beginPath(); g.rect(W / 2, 0, W / 2, H); g.clip(); g.drawImage(background(NIGHT, act), 0, 0); g.restore();
  const k = Math.min(1, game.screenTime / 0.25);
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(0, H / 2 - 90, W, 180);
  drawText(g, finale ? 'FINALE' : `ACT ${act}`, W / 2, H / 2 - 64, { scale: 3, color: '#ffec5a', align: 'center', alpha: k });
  drawText(g, (finale ? def.name : ACTS[act] ?? '').toUpperCase(), W / 2, H / 2 - 24, { scale: 6, color: '#ffffff', halo: '#1b1209', align: 'center', alpha: k });
  drawText(g, ACT_LINES[act] ?? '', W / 2, H / 2 + 40, { scale: 2, color: '#d9f6ff', align: 'center', alpha: k });
}

function drawCard() {
  const r = game.results[game.index];
  const lvl = level();
  const cx = W / 2;
  drawPanel(g, cx - 240, 100, 480, 330, true);
  const ink = C.paperInk;
  drawText(g, 'TIMECARD', cx, 120, { scale: 3, color: ink, align: 'center' });
  drawText(g, lvl.name, cx, 152, { scale: 2, color: ink, align: 'center' });
  px(g, cx - 180, 176, 180, 1, 'rgba(59,45,31,0.4)');
  const rows = [['Clock-ins', String(r.shifts)], ['Par', String(r.par)], ['Time', `${r.time.toFixed(2)}s`], ['Incidents', String(r.deaths)]];
  rows.forEach(([k, v], i) => {
    drawText(g, k, cx - 170, 190 + i * 28, { scale: 2, color: ink });
    drawText(g, v, cx + 170, 190 + i * 28, { scale: 2, color: ink, align: 'right' });
  });
  const diff = r.shifts - r.par;
  const k = Math.min(1, Math.max(0, (game.screenTime - 0.45) / 0.12));
  if (game.screenTime > 0.45) drawStamp(g, cx + 70, 330, stampText(diff), diff <= 0 ? '#c0392b' : '#7f6a50', 3, k);
  const comment = timecardComment(r);
  drawText(g, comment, cx, 372, { scale: measureText(comment, 2) > 440 ? 1 : 2, color: ink, align: 'center' });
  drawText(g, 'SPACE: next    R: retry', cx - 210, 402, { scale: 2, color: ink });
  if (game.newBest) drawText(g, 'NEW BEST', cx + 226, 112, { scale: 2, color: '#c0392b', align: 'right' });
}

function drawEnd() {
  g.drawImage(background(NIGHT), 0, 0);
  const top = 24;
  const bottom = H - 24;
  drawPanel(g, W / 2 - 260, top, 520, bottom - top, true);
  const ink = C.paperInk;
  drawText(g, 'SHIFT COMPLETE', W / 2, top + 18, { scale: 3, color: ink, align: 'center' });
  drawText(g, 'Thanks for working overtime.', W / 2, top + 48, { scale: 2, color: ink, align: 'center' });
  // one row per act (src/layout.js endSummary), then the totals and the credits
  const sum = endSummary(LEVELS, game.results);
  const rowsTop = top + 84;
  const rowH = 26;
  sum.rows.forEach((r, k) => {
    const y = rowsTop + k * rowH;
    drawText(g, r.label, W / 2 - 220, y, { scale: 2, color: ink });
    drawText(g, r.played ? `${r.shifts} / par ${r.par}` : '—', W / 2 + 220, y, { scale: 2, color: ink, align: 'right' });
  });
  const y = rowsTop + sum.rows.length * rowH + 6;
  px(g, W / 2 - 220, y, 220, 1, 'rgba(59,45,31,0.4)');
  drawText(g, 'Total clock-ins', W / 2 - 220, y + 12, { scale: 2, color: ink });
  drawText(g, `${sum.shifts} / par ${sum.par}`, W / 2 + 220, y + 12, { scale: 2, color: ink, align: 'right' });
  CREDITS.forEach((line, k) => drawText(g, line, W / 2, bottom - 112 + k * 22, { scale: 2, color: 'rgba(59,45,31,0.8)', align: 'center' }));
  drawText(g, 'SPACE: clock in again', W / 2, bottom - 36, { scale: 2, color: ink, align: 'center' });
  drawEndingEyes(top, bottom);
}

// The ending (WRITING.md §8): a dozen pairs of eyes in the dark margins open one after another,
// and once they're all open, one of them waves.
function drawEndingEyes(top, bottom) {
  const t = game.screenTime;
  const spots = [];
  for (let i = 0; i < 6; i++) {
    const y = top + 40 + i * ((bottom - top - 100) / 5);
    spots.push([90 + (i % 2) * 50, y], [W - 140 + (i % 2) * 40, y + 20]);
  }
  spots.forEach(([x, y], i) => {
    if (t < 0.4 + i * 0.18) return; // one after another
    const blink = (t * 0.9 + i * 0.37) % 3.1 < 0.12;
    drawEyes(g, 'lurker', x, y, { state: blink ? 'shut' : 'open', scale: 3 });
  });
  const all = 0.4 + spots.length * 0.18;
  if (t > all + 0.3) {
    // one of them rises out of the bottom margin and waves
    const rise = Math.min(1, (t - all - 0.3) / 0.4);
    const fx = W - 120;
    const fy = H - Math.round(rise * 30);
    drawSprite(g, 'lurker', 'a', fx, fy, { scale: 3 });
    drawEyes(g, 'lurker', fx, fy, { state: 'open', scale: 3, look: -1 });
    const wave = Math.round(Math.sin((t - all) * 9) * 2) * A;
    drawSprite(g, 'hand', 'a', fx - 34 + wave, fy - 16, { scale: 3 });
    if (t > all + 0.8) drawText(g, 'See you tonight.', W / 2, bottom + 6, { scale: 2, color: '#ffec5a', align: 'center' });
  }
}

function drawSelect() {
  const pal = PAL[NIGHT];
  g.drawImage(background(NIGHT), 0, 0);
  drawText(g, 'TIMECARDS', W / 2, 16, { scale: 4, color: pal.hud, halo: pal.halo, align: 'center' });
  // act tabs: ACT n and the act's name, or FINALE (src/layout.js keeps six rows on screen)
  actRows(LEVELS).forEach((row, r) => {
    const t = tabRect(LEVELS, r);
    const act = LEVELS[row[0]].act;
    drawPanel(g, t.x, t.y, t.w, t.h, false);
    drawText(g, act === FINALE_ACT ? 'FINALE' : `ACT ${act}`, t.x + CARD.pad, t.y + 9, { scale: 2, color: pal.hud });
    if (act !== FINALE_ACT) {
      wrapText((ACTS[act] ?? '').toUpperCase(), t.w - 2 * CARD.pad, 1).slice(0, 2)
        .forEach((line, k) => drawText(g, line, t.x + CARD.pad, t.y + 31 + k * 10, { scale: 1, color: pal.hudSoft }));
    }
  });
  // cards: the level number big, the name small, the status stamp; the detail bar says the rest
  LEVELS.forEach((def, i) => {
    const c = cardRect(LEVELS, i);
    const open = isUnlocked(LEVELS, i, save);
    const best = save.best(def.id);
    g.globalAlpha = open ? 1 : 0.4;
    drawPanel(g, c.x, c.y, c.w, c.h, true);
    g.globalAlpha = 1;
    if (i === game.selected) {
      g.fillStyle = '#5ff2ff';
      g.fillRect(c.x - 3 * A, c.y - 3 * A, c.w + 6 * A, A);
      g.fillRect(c.x - 3 * A, c.y + c.h + 2 * A, c.w + 6 * A, A);
      g.fillRect(c.x - 3 * A, c.y - 3 * A, A, c.h + 6 * A);
      g.fillRect(c.x + c.w + 2 * A, c.y - 3 * A, A, c.h + 6 * A);
    }
    const ink = open ? C.paperInk : 'rgba(59,45,31,0.7)';
    drawText(g, String(i + 1), c.x + CARD.pad, c.y + 7, { scale: 3, color: ink });
    wrapText(def.name.toUpperCase(), c.w - 2 * CARD.pad, 1).slice(0, 2)
      .forEach((line, k) => drawText(g, line, c.x + CARD.pad, c.y + 34 + k * 10, { scale: 1, color: ink }));
    if (!open) drawText(g, 'NOT YET', c.x + c.w - CARD.pad, c.y + 10, { scale: 1, color: ink, align: 'right' });
    else if (best) {
      const diff = best.shifts - def.par;
      drawStamp(g, c.x + c.w - 40, c.y + 22, stampText(diff, { short: true }), diff <= 0 ? '#c0392b' : '#7f6a50', 1);
    } else drawText(g, `PAR ${def.par}`, c.x + c.w - CARD.pad, c.y + 10, { scale: 1, color: ink, align: 'right' });
  });
  // detail bar: the selected level in full
  const d = detailRect;
  const sel = LEVELS[game.selected];
  const selBest = save.best(sel.id);
  const selOpen = isUnlocked(LEVELS, game.selected, save);
  drawPanel(g, d.x, d.y, d.w, d.h, true);
  drawText(g, `${game.selected + 1}. ${sel.name.toUpperCase()}`, d.x + 12, d.y + 11, { scale: 2, color: C.paperInk });
  const status = !selOpen ? 'NOT YET' : selBest ? `BEST ${selBest.shifts} · PAR ${sel.par}` : `PAR ${sel.par}`;
  drawText(g, status, d.x + d.w - 12, d.y + 11, { scale: 2, color: C.paperInk, align: 'right' });
  drawText(g, 'Arrows: choose · SPACE or click: clock in · Esc: back', W / 2, H - 22, { scale: 2, color: pal.hudSoft, halo: pal.halo, align: 'center' });
}

function drawPause() {
  drawPanel(g, W / 2 - 300, H / 2 - 64, 600, 128, false);
  drawText(g, 'ON BREAK', W / 2, H / 2 - 40, { scale: 3, color: '#d9f6ff', align: 'center' });
  drawText(g, 'Esc: resume   R: restart   L: levels   O: settings', W / 2, H / 2 + 12, { scale: 2, color: '#d9f6ff', align: 'center' });
}

function drawSettings() {
  const pal = PAL[NIGHT];
  g.drawImage(background(NIGHT), 0, 0);
  drawText(g, 'SETTINGS', W / 2, 60, { scale: 4, color: pal.hud, halo: pal.halo, align: 'center' });
  const s = settings.get();
  SETTING_ROWS.forEach(([key, label], row) => {
    const r = settingRect(row);
    const sel = row === game.settingsRow;
    drawPanel(g, r.x, r.y, r.w, r.h, false);
    if (sel) drawText(g, '>', r.x + 14, r.y + 16, { scale: 2, color: '#ffec5a' });
    drawText(g, label, r.x + 36, r.y + 16, { scale: 2, color: sel ? '#ffffff' : pal.hudSoft });
    if (key === 'reduced') {
      drawText(g, s.reduced ? 'ON' : 'OFF', r.x + r.w - 24, r.y + 16, { scale: 2, color: s.reduced ? '#9dffb8' : pal.hudSoft, align: 'right' });
    } else {
      const v = Math.round(s[key] * 10);
      for (let i = 0; i < 10; i++) px(g, r.x + 250 + i * 18, r.y + 14, 7, 9, i < v ? (sel ? '#5ff2ff' : '#3aa8bd') : 'rgba(95,242,255,0.15)');
      drawText(g, `${v * 10}%`, r.x + r.w - 24, r.y + 16, { scale: 2, color: pal.hudSoft, align: 'right' });
    }
  });
  drawText(g, 'Up/Down: choose · Left/Right: change · Esc: back', W / 2, H - 40, { scale: 2, color: pal.hudSoft, halo: pal.halo, align: 'center' });
  drawText(g, 'Reduced effects turns off screen flashes, rings and sparkles.', W / 2, H - 70, { scale: 1, color: pal.hudSoft, align: 'center' });
}

function render() {
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, W, H);
  if (game.screen === 'title') { drawTitle(); return; }
  if (game.screen === 'select') { drawSelect(); return; }
  if (game.screen === 'settings') {
    if (game.settingsFrom === 'paused') { drawPlay(); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, W, H); }
    drawSettings();
    return;
  }
  if (game.screen === 'end') { drawEnd(); return; }
  if (game.screen === 'act') { drawAct(); return; }
  drawPlay();
  if (game.screen === 'card') drawCard();
  if (game.screen === 'paused') drawPause();
}


if (params.has('autostart')) startLevel(game.index, { card: false });
requestAnimationFrame(frame);

// expose for smoke tests (render: for timing the draw cost)
globalThis.__doubleShift = game;
game.render = render;
