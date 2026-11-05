// Double Shift — skins: which object art (a door, a pillar, a portrait, the door pile) covers which tiles.
// In the rules these are ordinary solid tiles, and pranks move them by overriding tiles. This pure function
// reads the tiles under each skin, so the art always matches what the rules decided: a stolen door shows its
// empty frame, a moved pillar leaves a crack (only where it stood), and art never covers a half-solid area.
//
// Anchors: a door and a pillar stand on (tx, ty), their bottom cell, and rise h cells; a portrait hangs from
// (tx, ty), its top-left cell, and covers w×h; the door pile's bottom row is ty, 2 cells wide, at most h high.

import { tileAt, isSolidChar, standableSpot, gravitySign } from './rules.js';

const solid = (level, layer, ov, tx, ty) => isSolidChar(tileAt(level, layer, tx, ty, ov));

function column(level, layer, ov, tx, ty0, ty1) {
  let n = 0;
  for (let ty = ty0; ty <= ty1; ty++) if (solid(level, layer, ov, tx, ty)) n++;
  return n === 0 ? 'empty' : n === ty1 - ty0 + 1 ? 'solid' : 'mixed';
}

// An empty slot shows what the object left behind (a door's frame, a pillar's crack) only if it stood there:
// the level built it there, or a prank has written those tiles (a prank put it there, or took it away). A slot
// it hasn't reached yet stays bare.
function stoodThere(level, layer, ov, tx, ty0, ty1) {
  for (let ty = ty0; ty <= ty1; ty++) if (solid(level, layer, {}, tx, ty) || `${layer},${tx},${ty}` in ov) return true;
  return false;
}

export function skinPlan(level, layer, ov = {}) {
  const out = [];
  const hang = gravitySign(level, layer) < 0 ? { hang: true } : {}; // on a flipped layer a door's floor end is its top
  for (const sk of level.skins ?? []) {
    if (sk.layer !== null && sk.layer !== layer) continue;
    if (sk.kind === 'door' || sk.kind === 'pillar') {
      const top = sk.ty - sk.h + 1;
      const state = column(level, layer, ov, sk.tx, top, sk.ty);
      if (state === 'solid') out.push({ draw: sk.kind, tx: sk.tx, ty: sk.ty, h: sk.h, ...hang });
      else if (state === 'empty' && stoodThere(level, layer, ov, sk.tx, top, sk.ty)) {
        out.push(sk.kind === 'door' ? { draw: 'emptyFrame', tx: sk.tx, ty: sk.ty, h: sk.h, ...hang } : { draw: 'crack', tx: sk.tx, ty: top });
      }
    } else if (sk.kind === 'portrait') {
      let all = true;
      for (let dy = 0; dy < sk.h && all; dy++) for (let dx = 0; dx < sk.w; dx++) if (!solid(level, layer, ov, sk.tx + dx, sk.ty + dy)) all = false;
      if (all) out.push({ draw: 'portrait', tx: sk.tx, ty: sk.ty, w: sk.w, h: sk.h });
    } else if (sk.kind === 'doorPile') {
      let count = 0;
      const full = (ty) => Array.from({ length: sk.w }, (_, dx) => sk.tx + dx).every((tx) => solid(level, layer, ov, tx, ty));
      while (count < sk.h && sk.ty - count >= 0 && full(sk.ty - count)) count++; // never the platform above it
      if (count > 0) out.push({ draw: 'doorPile', tx: sk.tx, ty: sk.ty, count });
    }
  }
  return out;
}

// A checkpoint is drawn the way the shift it saves in holds it: hanging only where a flipped night holds it (a
// solid above its cell). One that only the other shift can stand on keeps that shift's pose, standing on the
// day floor's echo rather than hanging under an empty cell, so it never promises a save it won't make.
export function checkpointHangs(level, layer, c, ov = {}) {
  const other = 1 - layer;
  const anchor = !standableSpot(level, layer, c.tx, c.ty, ov) && standableSpot(level, other, c.tx, c.ty, ov) ? other : layer;
  return gravitySign(level, anchor) < 0;
}

// The exit is drawn where its cell is open in that shift (walled up, it isn't drawn at all: Falling Up shuts it at
// night, Clock Out while the step is gone). On a flipped night it hangs from the solid above its cell; with nothing
// above it and a floor under it, it stands, so it never hangs from nothing.
export function exitPose(level, layer, ov = {}) {
  const { tx, ty } = level.exit;
  if (solid(level, layer, ov, tx, ty)) return null;
  const flipped = gravitySign(level, layer) < 0;
  return { hang: flipped && (solid(level, layer, ov, tx, ty - 1) || !solid(level, layer, ov, tx, ty + 1)) };
}
