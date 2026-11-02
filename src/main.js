// Double Shift — browser shell: input capture, fixed-step loop, rendering.
// Draws only what src/rules.js decided.

import { step, initState, parseLevel, tileAt, freakBoxes, TILE, DT, DAY, NIGHT, PARAMS } from './rules.js';
import { LEVELS } from './levels.js';
import { createInput, GAME_KEYS } from './input.js';
import { sfx, unlockAudio, toggleMute } from './audio.js';

const W = 960;
const H = 540;
const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
const input = createInput();
const levels = LEVELS.map(parseLevel);

const params = new URLSearchParams(location.search);
const game = {
  screen: 'title', // title | play | card | end | paused
  index: Math.min(Math.max((parseInt(params.get('level'), 10) || 1) - 1, 0), levels.length - 1),
  state: null,
  results: [],
  debug: params.has('debug'),
  fx: { flash: 0, flashLayer: DAY, fail: 0, death: 0, rings: [], pops: [] },
  levelTime: 0,
};

function level() { return levels[game.index]; }

function startLevel(i) {
  game.index = i;
  game.state = initState(levels[i]);
  game.levelTime = 0;
  game.fx = { flash: 0, flashLayer: DAY, fail: 0, death: 0, rings: [], pops: [] };
  game.screen = 'play';
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
    return;
  }
  if (game.screen === 'card') {
    if (e.code === 'Space' || e.code === 'Enter') {
      if (game.index + 1 < levels.length) startLevel(game.index + 1);
      else game.screen = 'end';
    } else if (e.code === 'KeyR') startLevel(game.index);
    return;
  }
  if (game.screen === 'end') {
    if (e.code === 'Space' || e.code === 'Enter') { game.results = []; startLevel(0); }
    return;
  }
  if (game.screen === 'paused') {
    if (e.code === 'Escape' || e.code === 'Space') game.screen = 'play';
    else if (e.code === 'KeyR') startLevel(game.index);
    return;
  }
  // play
  if (e.code === 'Escape') { game.screen = 'paused'; input.clear(); return; }
  if (e.code === 'KeyR') { startLevel(game.index); return; }
  input.keyDown(e);
});
addEventListener('keyup', (e) => { input.keyUp(e); });
addEventListener('blur', () => input.clear());

// ---------- simulation ----------

function handleEvents(events) {
  const p = game.state.player;
  for (const ev of events) {
    switch (ev.type) {
      case 'shift':
        sfx.shift(ev.layer === NIGHT);
        game.fx.flash = 1;
        game.fx.flashLayer = ev.layer;
        game.fx.rings.push({ x: p.x + PARAMS.playerW / 2, y: p.y + PARAMS.playerH / 2, t: 0, layer: ev.layer });
        break;
      case 'shiftFail': sfx.shiftFail(); game.fx.fail = 1; break;
      case 'jump': sfx.jump(); break;
      case 'land': sfx.land(); break;
      case 'death':
        if (ev.cause === 'spooked') {
          sfx.spooked();
          game.fx.pops.push({ x: ev.x + PARAMS.playerW / 2, y: ev.y - 8, t: 0, text: pick(SPOOK_LINES) });
        } else sfx.death();
        game.fx.death = 1;
        break;
      case 'prank':
        sfx.giggle();
        game.fx.pops.push({ x: W / 2, y: 92, t: 0, text: 'hee hee hee', big: true });
        break;
      case 'checkpoint': sfx.checkpoint(); break;
      case 'win':
        sfx.win();
        setTimeout(() => sfx.stamp(), 450);
        game.results[game.index] = { shifts: ev.shifts, par: ev.par, deaths: game.state.deaths, time: game.state.time };
        game.screen = 'card';
        break;
    }
  }
}

let acc = 0;
let last = performance.now();
function frame(now) {
  const elapsed = Math.min((now - last) / 1000, 0.1);
  last = now;
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
  fx.flash = Math.max(0, fx.flash - elapsed / 0.12);
  fx.fail = Math.max(0, fx.fail - elapsed / 0.25);
  fx.death = Math.max(0, fx.death - elapsed / 0.3);
  fx.rings = fx.rings.filter((r) => (r.t += elapsed) < 0.3);
  fx.pops = fx.pops.filter((q) => (q.t += elapsed) < 0.9);
  render();
  requestAnimationFrame(frame);
}

// ---------- rendering ----------

const PAL = {
  [DAY]: {
    skyTop: '#f6e7c8', skyBot: '#e8c58c', window: 'rgba(255,255,255,0.22)', frame: 'rgba(120,90,50,0.1)',
    solid: '#6e5a45', solidEdge: '#fbecc9', echo: 'rgba(255,170,80,0.95)', hud: '#3b2d1f', hudSoft: 'rgba(59,45,31,0.85)', halo: 'rgba(246,231,200,0.85)',
  },
  [NIGHT]: {
    skyTop: '#0b1029', skyBot: '#1d2a56', window: 'rgba(255,214,110,0.12)', frame: 'rgba(120,150,255,0.05)',
    solid: '#2e4173', solidEdge: '#5ff2ff', echo: 'rgba(52,96,230,1)', hud: '#d9f6ff', hudSoft: 'rgba(217,246,255,0.85)', halo: 'rgba(11,16,41,0.85)',
  },
};

// deterministic star field
const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = Math.sin(i * 127.1) * 43758.5453;
  const r2 = Math.sin(i * 311.7) * 12543.123;
  return { x: (r - Math.floor(r)) * W, y: (r2 - Math.floor(r2)) * H * 0.7, s: i % 3 === 0 ? 2 : 1 };
});

function drawBackground(layer) {
  const pal = PAL[layer];
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, pal.skyTop);
  grad.addColorStop(1, pal.skyBot);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  if (layer === NIGHT) {
    g.fillStyle = 'rgba(255,255,255,0.35)';
    for (const s of STARS) g.fillRect(s.x, s.y, s.s, s.s);
  }
  // big windows of the building interior
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * 160;
    g.fillStyle = pal.frame;
    g.fillRect(x - 6, 60, 112, 200);
    g.fillStyle = pal.window;
    const lit = layer === DAY || (i * 7) % 3 !== 0;
    if (lit) {
      g.fillRect(x, 66, 48, 92);
      g.fillRect(x + 52, 66, 48, 92);
      g.fillRect(x, 162, 48, 92);
      g.fillRect(x + 52, 162, 48, 92);
    }
  }
}

// current geometry, including whatever the freaks have changed
let curOv = {};
function T(lvl, layer, tx, ty) { return tileAt(lvl, layer, tx, ty, curOv); }

function isSolid(lvl, layer, tx, ty) {
  if (tx < 0 || tx >= lvl.w || ty < 0 || ty >= lvl.h) return false;
  return T(lvl, layer, tx, ty) === '#';
}

// Outer edges of a layer's solid region, as line segments.
function solidEdges(lvl, layer) {
  const segs = [];
  for (let ty = 0; ty < lvl.h; ty++) {
    for (let tx = 0; tx < lvl.w; tx++) {
      if (!isSolid(lvl, layer, tx, ty)) continue;
      const x = tx * TILE;
      const y = ty * TILE;
      if (!isSolid(lvl, layer, tx, ty - 1)) segs.push([x, y, x + TILE, y, 'top']);
      if (!isSolid(lvl, layer, tx, ty + 1) && ty + 1 < lvl.h) segs.push([x, y + TILE, x + TILE, y + TILE, 'bot']);
      if (!isSolid(lvl, layer, tx - 1, ty) && tx > 0) segs.push([x, y, x, y + TILE, 'side']);
      if (!isSolid(lvl, layer, tx + 1, ty) && tx + 1 < lvl.w) segs.push([x + TILE, y, x + TILE, y + TILE, 'side']);
    }
  }
  return segs;
}

const edgeCache = new Map();
function edges(lvl, layer) {
  const key = `${lvl.name}:${layer}:${JSON.stringify(curOv)}`;
  if (!edgeCache.has(key)) edgeCache.set(key, solidEdges(lvl, layer));
  return edgeCache.get(key);
}

function drawEcho(lvl, layer) {
  // the other shift: dashed outlines, never filled (shape, not just colour, tells them apart)
  const pal = PAL[layer];
  g.save();
  g.strokeStyle = pal.echo;
  g.lineWidth = 2.5;
  g.setLineDash([8, 5]);
  g.beginPath();
  for (const [x0, y0, x1, y1] of edges(lvl, layer)) { g.moveTo(x0, y0); g.lineTo(x1, y1); }
  g.stroke();
  g.setLineDash([3, 4]);
  for (let ty = 0; ty < lvl.h; ty++) {
    for (let tx = 0; tx < lvl.w; tx++) {
      if (T(lvl, layer, tx, ty) !== '^') continue;
      const hz = TILE * PARAMS.hazardHeight;
      g.strokeRect(tx * TILE + 2, (ty + 1) * TILE - hz, TILE - 4, hz - 1);
    }
  }
  g.restore();
}

const hatchCache = {};
function hatch(layer) {
  if (hatchCache[layer]) return hatchCache[layer];
  const c = document.createElement('canvas');
  c.width = c.height = 10;
  const h = c.getContext('2d');
  h.strokeStyle = layer === DAY ? 'rgba(255,232,170,0.6)' : 'rgba(95,242,255,0.35)';
  h.lineWidth = 2;
  h.beginPath();
  h.moveTo(-2, 12); h.lineTo(12, -2);
  h.moveTo(-2, 2); h.lineTo(2, -2);
  h.moveTo(8, 12); h.lineTo(12, 8);
  h.stroke();
  return (hatchCache[layer] = g.createPattern(c, 'repeat'));
}

function drawSolids(lvl, layer) {
  const pal = PAL[layer];
  g.fillStyle = pal.solid;
  for (let ty = 0; ty < lvl.h; ty++) {
    for (let tx = 0; tx < lvl.w; tx++) {
      if (T(lvl, layer, tx, ty) === '#') g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  // texture: day = brick courses, night = panel seams
  g.strokeStyle = layer === DAY ? 'rgba(0,0,0,0.12)' : 'rgba(95,242,255,0.08)';
  g.lineWidth = 1;
  g.beginPath();
  for (let ty = 0; ty < lvl.h; ty++) {
    for (let tx = 0; tx < lvl.w; tx++) {
      if (T(lvl, layer, tx, ty) !== '#') continue;
      const x = tx * TILE;
      const y = ty * TILE;
      if (layer === DAY) {
        g.moveTo(x, y + 15.5); g.lineTo(x + TILE, y + 15.5);
        const off = ty % 2 ? 15 : 0;
        g.moveTo(x + off + 0.5, y); g.lineTo(x + off + 0.5, y + 15);
      } else {
        g.rect(x + 3.5, y + 3.5, TILE - 7, TILE - 7);
      }
    }
  }
  g.stroke();
  // hatch geometry that exists only in this shift: "this won't be here on the other shift"
  g.fillStyle = hatch(layer);
  for (let ty = 0; ty < lvl.h; ty++) {
    for (let tx = 0; tx < lvl.w; tx++) {
      if (T(lvl, layer, tx, ty) === '#' && T(lvl, 1 - layer, tx, ty) !== '#') g.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }
  g.strokeStyle = pal.solidEdge;
  g.lineWidth = 2;
  g.beginPath();
  for (const [x0, y0, x1, y1, kind] of edges(lvl, layer)) {
    if (kind === 'bot') continue;
    g.moveTo(x0, y0 + (kind === 'top' ? 1 : 0)); g.lineTo(x1, y1 + (kind === 'top' ? 1 : 0));
  }
  g.stroke();
}

function drawHazards(lvl, layer, t) {
  const hz = TILE * PARAMS.hazardHeight;
  for (let ty = 0; ty < lvl.h; ty++) {
    for (let tx = 0; tx < lvl.w; tx++) {
      if (T(lvl, layer, tx, ty) !== '^') continue;
      const x = tx * TILE;
      const base = (ty + 1) * TILE;
      if (layer === DAY) {
        // rebar: rusty spikes
        g.fillStyle = '#c4572a';
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.moveTo(x + 2 + i * 9, base);
          g.lineTo(x + 6.5 + i * 9, base - hz);
          g.lineTo(x + 11 + i * 9, base);
          g.fill();
        }
      } else {
        // security laser: pulsing beam with emitters
        const a = 0.65 + 0.35 * Math.sin(t * 18 + tx);
        g.fillStyle = `rgba(255,59,92,${a})`;
        g.fillRect(x, base - hz * 0.6, TILE, 3);
        g.fillStyle = `rgba(255,59,92,${a * 0.25})`;
        g.fillRect(x, base - hz * 0.6 - 4, TILE, 11);
        g.fillStyle = '#ff9db0';
        if (tx === 0 || T(lvl, layer, tx - 1, ty) !== '^') g.fillRect(x, base - hz, 4, hz);
        if (tx === lvl.w - 1 || T(lvl, layer, tx + 1, ty) !== '^') g.fillRect(x + TILE - 4, base - hz, 4, hz);
      }
    }
  }
}

function drawShared(lvl, s, layer) {
  const pal = PAL[layer];
  // exit door
  const ex = lvl.exit.tx * TILE;
  const ey = lvl.exit.ty * TILE;
  g.fillStyle = layer === DAY ? '#3d7a4a' : '#1f6b47';
  g.fillRect(ex + 3, ey - TILE + 4, TILE - 6, TILE * 2 - 4);
  g.strokeStyle = '#9dffb8';
  g.lineWidth = 2;
  g.strokeRect(ex + 3, ey - TILE + 4, TILE - 6, TILE * 2 - 4);
  g.fillStyle = '#9dffb8';
  g.fillRect(ex + TILE - 10, ey + 8, 3, 3);
  // lit sign above the door
  g.fillStyle = '#2bdc6a';
  g.fillRect(ex - 4, ey - TILE - 14, TILE + 8, 14);
  g.fillStyle = '#06210f';
  g.font = 'bold 11px monospace';
  g.textAlign = 'center';
  g.fillText('EXIT', ex + TILE / 2, ey - TILE - 3);
  // checkpoints: time clocks on a post
  for (const c of lvl.checkpoints) {
    const cx = c.tx * TILE + TILE / 2;
    const cy = (c.ty + 1) * TILE;
    const on = s.checkpoint.id === c.id;
    g.fillStyle = pal.hudSoft;
    g.fillRect(cx - 2, cy - 22, 4, 22);
    g.fillStyle = on ? '#ffd23f' : '#8a8a8a';
    g.beginPath(); g.arc(cx, cy - 26, 7, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#222'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(cx, cy - 26); g.lineTo(cx, cy - 31); g.moveTo(cx, cy - 26); g.lineTo(cx + 3, cy - 26); g.stroke();
  }
}


// ---------- the freaks ----------
// Never fully shown: a dark lumpy silhouette and a pair of eyes. That's the joke.

const SPOOK_LINES = ['SPOOKED!', 'AAAGH!', 'NOPE!', 'EEP!', 'NOT PAID ENOUGH'];
let spookIx = 0;
function pick(list) { return list[spookIx++ % list.length]; }

function eyes(x, y, t, seed, alpha = 1, size = 3) {
  // blink: closed for ~0.12 s every few seconds, offset per freak
  const cyc = (t * 0.9 + seed * 0.37) % 3.1;
  const open = cyc > 0.12;
  g.fillStyle = `rgba(255,236,90,${alpha})`;
  if (open) {
    g.fillRect(x - size - 2, y - size / 2, size, size);
    g.fillRect(x + 2, y - size / 2, size, size);
  } else {
    g.fillRect(x - size - 2, y, size, 1);
    g.fillRect(x + 2, y, size, 1);
  }
}

function blob(b, t, seed) {
  // jittery lumpy silhouette with a few spikes of fur on top
  const { x, y, w, h } = b;
  const j = Math.sin(t * 14 + seed) * 1.2;
  g.beginPath();
  g.moveTo(x, y + h);
  g.lineTo(x - 1, y + 8 + j);
  g.lineTo(x + 3, y + 2);
  g.lineTo(x + 6, y + 5 - j);
  g.lineTo(x + 10, y - 2 + j);
  g.lineTo(x + 14, y + 4);
  g.lineTo(x + 17, y + 1 - j);
  g.lineTo(x + w + 1, y + 9 + j);
  g.lineTo(x + w, y + h);
  g.closePath();
}

function drawFreaks(lvl, s, layer, t) {
  const boxes = freakBoxes(lvl, s);
  boxes.forEach((b, i) => {
    const cx = b.x + b.w / 2;
    if (layer === NIGHT) {
      if (b.kind === 'peeker' && !b.active) {
        // ducked in: just eyes in the dark of its hole
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.fillRect(b.x - 2, b.y + b.h - 6, b.w + 4, 6);
        eyes(cx, b.y + b.h - 3, t, i, 0.8, 2);
        return;
      }
      g.fillStyle = '#05060f';
      blob(b, t, i);
      g.fill();
      g.strokeStyle = 'rgba(95,242,255,0.6)';
      g.lineWidth = 1.5;
      g.stroke();
      eyes(cx + (b.kind === 'lurker' ? Math.sign(Math.sin(t)) * 2 : 0), b.y + 9, t, i);
    } else {
      // day: they're frozen on the other shift. Dashed outline where they'll be when you go back.
      g.save();
      g.setLineDash([4, 3]);
      g.strokeStyle = PAL[NIGHT].echo;
      g.lineWidth = 2;
      blob(b, 0, i);
      g.stroke();
      g.restore();
      if (b.active) eyes(cx, b.y + 9, 1, i, 0.6);
    }
  });
}

// Warnings for pranks that haven't happened yet: eyes watching by night, a note by day.
function drawTells(lvl, s, layer, t) {
  for (const pr of lvl.pranks) {
    if (!pr.tell || s.nightEntries >= pr.onNight) continue;
    const x = pr.tell.tx * TILE + TILE / 2;
    const y = pr.tell.ty * TILE + TILE / 2;
    if (layer === NIGHT) {
      eyes(x - 18, y - 30, t, 7, 1, 4);
      eyes(x + 16, y - 44, t, 3, 1, 4);
    } else {
      g.save();
      g.translate(x, y - 40);
      g.rotate(0.08);
      g.fillStyle = '#ffe96b';
      g.fillRect(-21, -15, 42, 30);
      g.fillStyle = '#5a3d10';
      g.font = 'bold 13px monospace';
      g.textAlign = 'center';
      g.fillText('MINE', 0, 5);
      g.restore();
    }
  }
}

function drawDecor(lvl, layer, t) {
  if (layer !== NIGHT) return;
  lvl.decor.forEach((d, i) => {
    if (d.kind === 'eyes') eyes(d.tx * TILE + TILE / 2, d.ty * TILE + TILE / 2, t, 11 + i * 5, 0.85);
  });
}

function drawPlayer(s, layer) {
  const p = s.player;
  const x = Math.round(p.x);
  const y = Math.round(p.y);
  const w = PARAMS.playerW;
  const h = PARAMS.playerH;
  // failed-shift pulse: outline, no camera shake (GDD §7.5)
  if (game.fx.fail > 0) {
    g.strokeStyle = `rgba(255,70,70,${game.fx.fail})`;
    g.lineWidth = 3;
    g.strokeRect(x - 3, y - 6, w + 6, h + 9);
  }
  // outline in the shift's contrast colour: the worker is always the easiest thing to find
  g.fillStyle = layer === DAY ? '#1b1209' : '#d9f6ff';
  for (const [rx, ry, rw, rh] of [[x, y + 8, w, h - 8], [x + 3, y + 3, w - 6, 7], [x - 1, y - 2, w + 2, 5], [x + 3, y - 5, w - 6, 4]]) {
    g.fillRect(rx - 1.5, ry - 1.5, rw + 3, rh + 3);
  }
  // overalls
  g.fillStyle = layer === DAY ? '#2f6fdc' : '#3f86ff';
  g.fillRect(x, y + 8, w, h - 8);
  // face
  g.fillStyle = '#f2c79a';
  g.fillRect(x + 3, y + 3, w - 6, 7);
  // eye in facing direction
  g.fillStyle = '#222';
  g.fillRect(p.facing > 0 ? x + w - 7 : x + 5, y + 5, 2, 2);
  // hard hat
  g.fillStyle = '#ffcc33';
  g.fillRect(x - 1, y - 2, w + 2, 5);
  g.fillRect(x + 3, y - 5, w - 6, 4);
  // hi-vis stripe
  g.fillStyle = layer === DAY ? '#ffe680' : '#c6ff4d';
  g.fillRect(x, y + 15, w, 2);
}

function drawFx(layer) {
  const fx = game.fx;
  for (const r of fx.rings) {
    const k = r.t / 0.3;
    g.strokeStyle = r.layer === NIGHT ? `rgba(95,242,255,${1 - k})` : `rgba(255,200,90,${1 - k})`;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(r.x, r.y, 10 + k * 40, 0, Math.PI * 2);
    g.stroke();
  }
  if (fx.flash > 0) {
    g.fillStyle = fx.flashLayer === NIGHT ? `rgba(40,80,200,${fx.flash * 0.18})` : `rgba(255,240,200,${fx.flash * 0.22})`;
    g.fillRect(0, 0, W, H);
  }
  if (fx.death > 0) {
    g.fillStyle = `rgba(200,30,40,${fx.death * 0.3})`;
    g.fillRect(0, 0, W, H);
  }
  for (const q of fx.pops) {
    const a = Math.min(1, (0.9 - q.t) / 0.3);
    g.textAlign = 'center';
    g.font = q.big ? 'italic 16px monospace' : 'bold 16px monospace';
    g.fillStyle = q.big ? `rgba(255,236,90,${a})` : `rgba(255,255,255,${a})`;
    g.strokeStyle = `rgba(0,0,0,${a})`;
    g.lineWidth = 3;
    const y = q.y - q.t * 30;
    g.strokeText(q.text, q.x, y);
    g.fillText(q.text, q.x, y);
  }
}

// HUD text with a halo in the shift's background colour, so it stays readable over walls
function hudText(text, x, y, color, halo) {
  g.lineJoin = 'round';
  g.strokeStyle = halo;
  g.lineWidth = 4;
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
}

function drawHud(lvl, s, layer) {
  const pal = PAL[layer];
  g.textAlign = 'left';
  g.font = 'bold 18px monospace';
  hudText(`${game.index + 1}/${levels.length}  ${lvl.name.toUpperCase()}`, 14, 26, pal.hud, pal.halo);
  // dimension indicator: icon + label (not colour alone)
  g.textAlign = 'right';
  hudText(layer === DAY ? 'DAY SHIFT' : 'NIGHT SHIFT', W - 44, 26, pal.hud, pal.halo);
  if (layer === DAY) {
    g.fillStyle = '#f2a516';
    g.beginPath(); g.arc(W - 26, 19, 8, 0, Math.PI * 2); g.fill();
  } else {
    g.fillStyle = '#d9f6ff';
    g.beginPath(); g.arc(W - 26, 19, 8, 0, Math.PI * 2); g.fill();
    g.fillStyle = PAL[NIGHT].skyTop;
    g.beginPath(); g.arc(W - 22, 16, 7, 0, Math.PI * 2); g.fill();
  }
  g.font = 'bold 15px monospace';
  const over = s.shifts > lvl.par;
  hudText(`CLOCK-INS ${s.shifts}  ·  PAR ${lvl.par}`, W - 14, 48, over ? '#e0473c' : pal.hud, pal.halo);
  g.textAlign = 'left';
  g.font = '15px monospace';
  const note = LEVELS[game.index].note;
  if (game.levelTime < 5 && note) hudText(note, 14, 48, pal.hudSoft, pal.halo);
  if (game.index === 0 && s.shifts === 0) {
    g.textAlign = 'center';
    g.font = 'bold 22px monospace';
    hudText('Press SHIFT (or K) to change shifts', W / 2, 150, pal.hud, pal.halo);
    g.font = '15px monospace';
    hudText('Dashed outlines show the other shift', W / 2, 176, pal.hudSoft, pal.halo);
  }
}

function drawDebug(lvl, s) {
  const p = s.player;
  g.strokeStyle = '#ff00ff';
  g.lineWidth = 1;
  g.strokeRect(p.x + 0.5, p.y + 0.5, PARAMS.playerW - 1, PARAMS.playerH - 1);
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(10, H - 70, 380, 60);
  g.fillStyle = '#0f0';
  g.font = '12px monospace';
  g.textAlign = 'left';
  g.fillText(`pos ${p.x.toFixed(1)},${p.y.toFixed(1)}  tile ${(p.x / TILE).toFixed(2)},${(p.y / TILE).toFixed(2)}`, 16, H - 52);
  g.fillText(`vel ${p.vx.toFixed(0)},${p.vy.toFixed(0)}  grounded ${p.grounded}  coyote ${p.coyote.toFixed(3)}`, 16, H - 36);
  g.fillText(`layer ${s.layer}  pending ${s.shiftPending.toFixed(3)}  deaths ${s.deaths}`, 16, H - 20);
}

function panel(x, y, w, h, light) {
  g.fillStyle = light ? '#f7efdc' : 'rgba(10,14,32,0.88)';
  g.fillRect(x, y, w, h);
  g.strokeStyle = light ? '#3b2d1f' : '#5ff2ff';
  g.lineWidth = 2;
  g.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function drawTitle() {
  // split screen: day on the left, night on the right
  g.save();
  g.beginPath(); g.rect(0, 0, W / 2, H); g.clip();
  drawBackground(DAY);
  g.restore();
  g.save();
  g.beginPath(); g.rect(W / 2, 0, W / 2, H); g.clip();
  drawBackground(NIGHT);
  g.restore();
  g.textAlign = 'center';
  g.font = 'bold 72px monospace';
  g.fillStyle = PAL[DAY].hud;
  g.fillText('DOUBLE', W / 2 - 150, 220);
  g.fillStyle = PAL[NIGHT].hud;
  g.fillText('SHIFT', W / 2 + 140, 220);
  g.font = '18px monospace';
  g.fillStyle = '#ffffff';
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(W / 2 - 260, 270, 520, 150);
  g.fillStyle = '#fff';
  g.fillText('One building. Two shifts. One worker.', W / 2, 300);
  g.font = '15px monospace';
  g.fillText('Move: A/D or ←/→    Jump: Space/W/↑', W / 2, 335);
  g.fillText('Change shift: Shift or K    Restart: R', W / 2, 358);
  g.font = 'bold 18px monospace';
  g.fillText('Press SPACE to clock in', W / 2, 400);
  g.font = '12px monospace';
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.fillText('Windows: hammering Shift can open Sticky Keys — use K, or turn off the Sticky Keys shortcut.', W / 2, H - 24);
}

function drawCard() {
  const r = game.results[game.index];
  const lvl = level();
  panel(W / 2 - 200, 110, 400, 300, true);
  g.textAlign = 'center';
  g.fillStyle = '#3b2d1f';
  g.font = 'bold 22px monospace';
  g.fillText('TIMECARD', W / 2, 150);
  g.font = '16px monospace';
  g.fillText(lvl.name, W / 2, 176);
  g.textAlign = 'left';
  const rows = [
    ['Clock-ins', String(r.shifts)],
    ['Par', String(r.par)],
    ['Time', `${r.time.toFixed(2)}s`],
    ['Incidents', String(r.deaths)],
  ];
  rows.forEach(([k, v], i) => {
    g.fillText(k, W / 2 - 150, 220 + i * 28);
    g.textAlign = 'right';
    g.fillText(v, W / 2 + 150, 220 + i * 28);
    g.textAlign = 'left';
  });
  const diff = r.shifts - r.par;
  const stamp = diff < 0 ? 'UNDER PAR!' : diff === 0 ? 'ON PAR' : `+${diff} OVERTIME`;
  g.save();
  g.translate(W / 2 + 90, 360);
  g.rotate(-0.15);
  g.strokeStyle = diff <= 0 ? '#c0392b' : '#7f6a50';
  g.fillStyle = g.strokeStyle;
  g.lineWidth = 3;
  g.strokeRect(-80, -20, 160, 36);
  g.font = 'bold 18px monospace';
  g.textAlign = 'center';
  g.fillText(stamp, 0, 5);
  g.restore();
  g.textAlign = 'left';
  g.font = '13px monospace';
  g.fillStyle = '#3b2d1f';
  g.fillText('SPACE: next   R: retry', W / 2 - 170, 395);
}

function drawEnd() {
  drawBackground(NIGHT);
  panel(W / 2 - 240, 80, 480, 380, false);
  g.textAlign = 'center';
  g.fillStyle = '#d9f6ff';
  g.font = 'bold 24px monospace';
  g.fillText('END OF PROTOTYPE', W / 2, 125);
  g.font = '15px monospace';
  g.fillText('Thanks for working overtime.', W / 2, 152);
  levels.forEach((lvl, i) => {
    const r = game.results[i];
    g.textAlign = 'left';
    g.fillText(lvl.name, W / 2 - 200, 200 + i * 30);
    g.textAlign = 'right';
    g.fillText(r ? `${r.shifts} / par ${r.par}` : '—', W / 2 + 200, 200 + i * 30);
  });
  g.textAlign = 'center';
  g.fillText('SPACE: clock in again', W / 2, 430);
}

function render() {
  g.clearRect(0, 0, W, H);
  if (game.screen === 'title') { drawTitle(); return; }
  if (game.screen === 'end') { drawEnd(); return; }
  const lvl = level();
  const s = game.state;
  const layer = s.layer;
  const other = 1 - layer;
  const t = s.time;
  curOv = s.overrides;
  drawBackground(layer);
  drawEcho(lvl, other);
  drawSolids(lvl, layer);
  drawHazards(lvl, layer, t);
  drawShared(lvl, s, layer);
  drawDecor(lvl, layer, t);
  drawTells(lvl, s, layer, t);
  drawFreaks(lvl, s, layer, t);
  drawPlayer(s, layer);
  drawFx(layer);
  drawHud(lvl, s, layer);
  if (game.debug) drawDebug(lvl, s);
  if (game.screen === 'card') drawCard();
  if (game.screen === 'paused') {
    panel(W / 2 - 150, H / 2 - 60, 300, 120, false);
    g.textAlign = 'center';
    g.fillStyle = '#d9f6ff';
    g.font = 'bold 20px monospace';
    g.fillText('ON BREAK', W / 2, H / 2 - 15);
    g.font = '14px monospace';
    g.fillText('Esc: resume   R: restart', W / 2, H / 2 + 20);
  }
}

if (params.has('autostart')) startLevel(game.index);
requestAnimationFrame(frame);

// expose for smoke tests
globalThis.__doubleShift = game;
