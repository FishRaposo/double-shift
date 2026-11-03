// Scripted solutions: one policy per level, reading the state like a player would (position, layer,
// clocks), not frame-exact scripts. Shared by the level tests, the fairness tests and `npm run audit`.
import { LEVELS } from '../src/levels.js';
import { parseLevel, freakBoxes, tileAt, isSolidChar, DAY, NIGHT, PARAMS, TILE } from '../src/rules.js';
import { tx } from './helpers.mjs';

export const L = Object.fromEntries(LEVELS.map((l) => [l.id, parseLevel(l)]));
const want = (s, layer) => s.layer !== layer;

export const SOLUTIONS = {
  clock: (s) => ({ right: true, shift: (tx(s) > 4 && tx(s) < 20 && want(s, NIGHT)) || (tx(s) > 20.5 && want(s, DAY)) }),
  scaff: (s) => ({
    right: true,
    jump: s.player.grounded ? [4.0, 9.6, 13.6].some((a) => tx(s) > a && tx(s) < a + 0.6) : s.player.vy < 0,
    shift: tx(s) > 19 && want(s, NIGHT),
  }),
  closing: (s) => ({ right: true, shift: (tx(s) > 10.4 && tx(s) < 18 && want(s, NIGHT)) || (tx(s) > 19.4 && want(s, DAY)) }),
  midair: (s) => {
    const x = tx(s);
    const jump = s.player.grounded ? [5.0, 10.4, 16.4, 22.4].some((a) => x > a && x < a + 0.5) : s.player.vy < 0;
    let target = DAY;
    if (x > 6 && x < 13) target = NIGHT;
    else if (x >= 13 && x < 19) target = DAY;
    else if (x >= 19 && x < 25) target = NIGHT;
    else if (x >= 25) target = s.layer;
    return { right: true, jump, shift: want(s, target) };
  },
  inventory: (s) => {
    const x = tx(s);
    let target = s.layer;
    if (s.nightEntries === 0 && x > 4) target = NIGHT;
    else if (s.nightEntries === 1 && x > 16.5 && x < 17.5) target = DAY; // step out between the pits...
    else if (s.nightEntries === 1 && x >= 17.5) target = NIGHT; // ...and back in: the plank has moved
    return { right: true, shift: want(s, target) };
  },
  watch: (s) => {
    const x = tx(s);
    let target = s.layer;
    if (x > 3 && x < 8.6) target = NIGHT; // through the day crates
    else if (x >= 8.6 && x < 15.3) target = DAY; // freeze the lurker, walk past it
    else if (x >= 15.3 && x < 26.3) target = NIGHT; // out of the tunnel, past the day rebar
    else if (x >= 26.3) target = DAY; // around the squatter
    let right = true;
    if (s.layer === NIGHT && x > 20.5 && x < 22.3) {
      const t = s.freakClock % 1.6; // peeker is out for the first 0.8 s of each 1.6 s cycle
      right = t > 0.8 && t < 1.0;
    }
    return { right, shift: want(s, target) };
  },
  wet: (s) => {
    const x = tx(s);
    let target = s.layer;
    if (x < 8.5) target = NIGHT; // onto the wax: slide toward the tunnel
    else if (x < 12.7) target = DAY; // dry stop before the lasers, walk past them
    else if (x < 25) target = NIGHT; // back into the tunnel, slide to the lurker
    else target = DAY; // grip and freeze it, then walk to the exit
    return { right: true, shift: want(s, target) };
  },
  stacked: (s) => {
    const x = tx(s);
    let target = s.layer;
    if (s.nightEntries === 0 && x > 3.5) target = NIGHT; // entry 1: the bridge over gap A
    else if (s.nightEntries === 1 && x > 14.3 && x < 15.5) target = DAY; // over A: out on the middle floor...
    else if (s.nightEntries === 1 && x >= 15.5) target = NIGHT; // ...and in: entry 2 lifts the gate at col 18
    else if (s.nightEntries === 2 && x > 19.3 && x < 20.5) target = DAY; // past the gate: out on the landing...
    else if (s.nightEntries === 2 && x >= 20.5) target = NIGHT; // ...and in: entry 3 lays the plank over gap B
    return { right: true, shift: want(s, target) };
  },
  clockout: (s) => {
    const x = tx(s);
    const p = s.player;
    let target = s.layer;
    // room 1: jump stone to stone, shifting mid-air to the stone ahead (night, then day)
    if (x > 2 && x < 8.5) target = NIGHT;
    else if (x >= 8.5 && x < 15) target = DAY;
    // room 2: night past the day crate, day to freeze the lurker, night past the far crate (clock-in 3: the step goes)
    else if (x > 15.3 && x < 18.1) target = NIGHT;
    else if (x >= 18.1 && x < 21.9) target = DAY;
    else if (x >= 21.9 && x < 25.1) target = NIGHT;
    // room 3: out and back in (clock-in 4: the step comes back), then up the step to the time clock
    else if (x >= 25.1 && x < 25.8) target = DAY;
    else if (x >= 25.8) target = NIGHT;
    const onStone = p.grounded && ((x > 1.0 && x < 1.5) || (x > 4.5 && x < 13));
    const climb = p.grounded && s.nightEntries >= 4 && x > 25.9;
    const jump = onStone || climb || (!p.grounded && p.vy < 0);
    return { right: true, jump, shift: want(s, target) };
  },
  daywalker: (s) => {
    const x = tx(s);
    let target = s.layer;
    if (x < 7.2) target = DAY; // the night gate at col 6 only lets the day shift through
    else if (x < 13) target = NIGHT; // inside the day-walker's tunnel: night freezes it, walk through its outline
    else if (x < 17.1) target = DAY; // past it, back to day before the night gate at col 16
    else if (x < 20.1) target = NIGHT; // the day pillar at col 19: enter the lurker's tunnel at night
    else if (x < 25) target = DAY; // inside: day freezes the lurker
    else target = NIGHT; // out past the far pillar at col 27
    return { right: true, shift: want(s, target) };
  },
  supervisor: (s) => {
    const x = tx(s);
    const sup = freakBoxes(L.supervisor, s).find((b) => b.kind === 'supervisor');
    let right = true;
    let target = s.layer;
    if (s.layer === DAY && x > 7.5 && x < 8.4) target = NIGHT; // clock in short of the lurker's reach
    if (s.layer === NIGHT) {
      // left tunnel: cross only while the clipboard points right, with a full window left
      if (x > 7.2 && x < 8.5 && (sup.facing !== 1 || sup.turnIn < 1.2)) right = false;
      // the nook: wait for the left watch before the right tunnel
      if (x > 16 && x < 18.6 && (sup.facing !== -1 || sup.turnIn < 1.2)) right = false;
      if (x > 24.5 && x < 26.3) target = DAY; // the night wall: clock back out
    }
    return { right, shift: want(s, target) };
  },
  // night at the start; hop up the stairs; jump off the top step; past the stairs, mid-air, day onto the tower
  stairs: (s) => {
    const p = s.player;
    const x = tx(s);
    // hop each riser as it comes (a step face about a tile ahead at foot height), and off the end of the top step
    const ground = Math.round((p.y + PARAMS.playerH) / TILE);
    const riser = isSolidChar(tileAt(L.stairs, s.layer, Math.floor((p.x + PARAMS.playerW) / TILE + 0.9), ground - 1));
    const shift = (x < 2 && want(s, NIGHT)) || (!p.grounded && x > 23.6 && want(s, DAY));
    return { right: true, shift, jump: p.grounded ? s.layer === NIGHT && (riser || (x > 21.8 && x < 23.2)) : p.vy < 0 };
  },
  // one clock-in per room, where the room allows it; then climb the pile of doors (jump at each wall)
  doors: (s) => {
    const p = s.player;
    const x = tx(s);
    const plan = [[1.5, 3.4, NIGHT], [5, 7.2, DAY], [10, 12.2, NIGHT], [16, 18.6, DAY], [22, 23.4, NIGHT]];
    const due = plan.find(([a, b]) => x >= a && x <= b);
    const shift = !!due && s.layer !== due[2];
    return { right: true, shift, jump: p.grounded ? x > 24.8 && Math.abs(p.vx) < 1 : p.vy < 0 };
  },
  // under the walkway, clock in and fall up onto it; past the pit, clock out and drop to the floor
  upside: (s) => ({ right: true, shift: (tx(s) > 7 && tx(s) < 16 && want(s, NIGHT)) || (tx(s) > 19 && want(s, DAY)) }),
  offset: (s, m) => {
    // four hops up the tower: walk into place, jump, shift at the apex onto the floor's copy
    const hops = [[7.5, NIGHT], [9.5, DAY], [11, NIGHT], [12, DAY]];
    const i = m.i ?? 0;
    if (i >= hops.length) return { right: true };
    const [at, layer] = hops[i];
    const p = s.player;
    if (m.launched && p.grounded) {
      m.launched = false;
      if (s.layer === layer) { m.i = i + 1; return { right: true }; } // landed on the copy: next hop
    }
    const airborne = !p.grounded;
    const jump = airborne ? p.vy < 0 : tx(s) > at;
    const shift = airborne && Math.abs(p.vy) < 60 && s.layer !== layer;
    if (shift) m.launched = true;
    return { right: !airborne, jump, shift }; // no right in the air: land on the copy below
  },
};
