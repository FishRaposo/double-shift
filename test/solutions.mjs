// Scripted solutions: one policy per level, reading the state like a player would (position, layer,
// clocks), not frame-exact scripts. Shared by the level tests, the fairness tests and `npm run audit`.
import { LEVELS } from '../src/levels.js';
import { parseLevel, freakBoxes, tileAt, isSolidChar, DAY, NIGHT, PARAMS, TILE } from '../src/rules.js';
import { tx } from './helpers.mjs';

export const L = Object.fromEntries(LEVELS.map((l) => [l.id, parseLevel(l)]));
const want = (s, layer) => s.layer !== layer;
// One press per shift: ask once, then wait to see the world change (however late the press lands) before asking
// again. A policy that holds `shift` down while its target flips between two shifts loses the second press.
const pressShift = (s, mem, target) => {
  if (mem.held) { // the key was down last tick: let go first, or the next press is lost
    mem.held = false;
    return false;
  }
  if (s.layer === target) {
    mem.sentFrom = null;
    return false;
  }
  if (mem.sentFrom === s.layer) return false;
  mem.sentFrom = s.layer;
  mem.held = true;
  return true;
};

// Jump like a player who holds the key until the apex: `start` says "jump now" (it may come a little early, in the
// air: the game buffers a press for 100 ms); once asked, the key stays down until the player has risen and begun to
// fall, however late the press lands.
const holdJump = (s, mem, start) => {
  if (mem.air && s.player.grounded) { // landed (a bumped head never rises): let go for a tick, so the next jump is a new press
    mem.jump = mem.up = mem.air = false;
    return false;
  }
  if (start) mem.jump = true;
  if (mem.jump && !s.player.grounded) mem.air = true;
  if (mem.jump && !s.player.grounded && s.player.vy < 0) mem.up = true;
  if (mem.up && s.player.vy >= 0) mem.jump = mem.up = mem.air = false;
  return !!mem.jump;
};

// A policy written for on-time inputs, played as a player who presses each shift once and holds each jump to the
// apex: a shift wish is sent once per layer (pressShift) and a jump started on the ground is held (holdJump), so
// the run survives inputs that land late. The policy's own memory is kept apart from the wrapper's.
// `{ jumps: false }` leaves the policy's own jumps alone and only steadies its shifts.
export const steady = (policy, { jumps = true } = {}) => (s, mem, f) => {
  const own = (mem.own ??= {});
  const out = policy(s, own, f) || {};
  const shift = out.shift ? pressShift(s, mem, s.layer === DAY ? NIGHT : DAY) : ((mem.held = false), s.layer !== mem.sentFrom && (mem.sentFrom = null), false);
  const jump = jumps ? holdJump(s, mem, !!out.jump && s.player.grounded) : !!out.jump;
  return { ...out, shift, jump };
};

export const SOLUTIONS = {
  clock: steady((s) => {
    const x = tx(s);
    const target = x > 7 && x < 19.2 ? NIGHT : x > 26 ? NIGHT : DAY;
    const jump = s.player.grounded && ((x > 19.8 && x < 20.6) || (x > 23 && x < 24.5));
    return { right: true, jump, shift: want(s, target) };
  }),
  scaff: steady((s) => {
    const x = tx(s);
    const y = s.player.y / TILE;
    const g = s.player.grounded;
    if (s.shifts === 0) return { right: true, shift: s.repairs[0].done && g && x > 9.2 }; // hammer, bracket, then in
    if (s.shifts === 1) { // up the night boards to the stub, and out on it
      if (y < 8 && x > 21.5) return { right: x < 22.6, left: x > 23.6, shift: g && x > 22.3 && x < 24.2 };
      return { right: true, jump: g && ((y > 12.5 && x > 10) || (y > 10.5 && y < 11.5 && x > 13.4) || (y > 8.5 && y < 9.5 && x > 19.2)) };
    }
    // the day crew's ledge, the tower, and stop at the exit
    return { right: x < 31.1, jump: g && ((y < 8 && y > 6.5 && x > 24.4) || (y < 6 && y > 4.5 && x > 28.6)) };
  }),
  closing: (s, m) => {
    const x = tx(s);
    const job = s.repairs[0];
    if (!job.done && job.at === null && !m.pulled && !job.tool) return { right: true };
    if (job.at === 0 && !m.through) { if (x > 14.2) m.through = true; return { right: true }; }
    if (job.at === 0) return { left: true }; // back to the box in the wall: take the fuse
    m.pulled = true;
    const target = x > 26.8 ? DAY : x > 14.4 ? NIGHT : s.layer;
    const peek = freakBoxes(L.closing, s)[0];
    if (s.layer === NIGHT && x > 22.5 && x < 25.4 && (peek.active || peek.popIn < 0.4)) return { shift: false };
    const jump = s.player.grounded ? job.at === 1 && x > 16 && x < 16.7 : s.player.vy < 0;
    return { right: true, jump, shift: want(s, target) };
  },
  midair: steady((s) => {
    const x = tx(s);
    const y = s.player.y / TILE;
    let target = DAY;
    if (x > 10.2 && x < 15.2) target = NIGHT; // off the day stone and onto the night one, mid-air
    if (x > 21.5) target = NIGHT; // past the day wall
    // onto the stone, then off it and off the night ledge wherever you landed on them
    const jump = s.player.grounded && ((x > 3.2 && x < 3.9) || (y < 13 && x > 7.6 && x < 10) || (y < 11 && x > 13.2 && x < 14.6) || (x > 24 && x < 24.8));
    return { right: true, jump, shift: want(s, target) };
  }),
  inventory: (s, mem) => {
    const x = tx(s);
    const target = x > 5 && x < 15.4 ? NIGHT : x >= 15.4 && x < 18.3 ? DAY : x >= 18.3 ? NIGHT : DAY;
    const jump = s.player.grounded ? x > 26.2 && x < 26.9 : s.player.vy < 0;
    return { right: x < 30, left: x > 30.6, jump, shift: want(s, target) };
  },
  watch: (s) => {
    const x = tx(s);
    let target = DAY;
    if (x > 3.8 && x < 6.9) target = NIGHT;
    else if (x >= 13.2 && x < 26.2) target = NIGHT;
    const jump = s.player.grounded ? (x > 26.9 && x < 28) : s.player.vy < 0;
    return { right: x < 30, left: x > 30.6, jump, shift: want(s, target) };
  },
  wet: (s, m) => {
    const x = tx(s);
    const job = s.repairs[0];
    if (!job.tool) return { right: true, shift: want(s, x > 8.4 && x < 10.8 ? NIGHT : x >= 10.8 ? DAY : DAY) };
    if (!job.done) {
      if (x > 11.6) return { left: true, shift: want(s, DAY) };
      if (x > 8.6) return { left: true, shift: want(s, NIGHT) };
      if (x < 4.2) m.back = true;
      if (!m.back) return { left: true };
      return { right: true, jump: s.player.grounded ? x > 3.6 : s.player.vy < 0 };
    }
    const target = x > 21 ? DAY : NIGHT;
    const jump = s.player.grounded ? (x > 6 && x < 7.8) || (x > 26 && x < 26.7) : s.player.vy < 0;
    return { right: x < 30, left: x > 30.6, jump, shift: want(s, target) };
  },
  stacked: (s, m) => {
    const x = tx(s);
    const job = s.repairs[0];
    if (!job.done) {
      if (x < 14.4) return { right: true, shift: want(s, x > 4.6 ? NIGHT : DAY) };
      return { right: x < 15.1, left: x > 15.4, shift: want(s, DAY), jump: s.layer === DAY && (s.player.grounded ? x > 14.8 : s.player.vy < 0) };
    }
    const jump = s.player.grounded ? x > 27 && x < 27.7 : s.player.vy < 0;
    return { right: x < 30.4, jump, shift: want(s, x > 18 ? NIGHT : DAY) };
  },
  clockout: (s, m) => {
    const x = tx(s);
    const [fuse] = s.repairs;
    switch (s.shifts) {
      case 0: return { right: true, shift: x >= 1.5 };
      case 1: {
        // hanging at the peeker: wait until the clipboard looks away from this room, then cross without stopping
        const sup = freakBoxes(L.clockout, s).find((b) => b.kind === 'supervisor');
        if (sup.facing === 1 && sup.turnIn >= 0.9) m.past = true;
        return { right: x < 3.4 || !!m.past, shift: x >= 9.6 };
      }
      case 2: // through the shutter, then back to the box in the wall for the fuse
        if (fuse.at === 0 && !m.far) { if (x > 14.1) m.far = true; return { right: true }; }
        if (fuse.at === 0) return { left: true };
        return { right: x < 14.2, shift: x >= 13.9 };
      case 3: return { right: true, shift: x >= 16.4 };
      case 4: return { right: x < 22.4, shift: x >= 22.4 };
      case 5: return { right: x < 27.65, shift: x >= 27.65 };
      case 6: return { right: true, shift: x >= 28.8 };
      default: return { right: true };
    }
  },
  daywalker: steady((s, m) => {
    const x = tx(s);
    const y = s.player.y / TILE;
    const g = s.player.grounded;
    switch (s.shifts) {
      case 0: return { right: true, shift: x > 4.6 }; // in for the grease
      case 1: return { right: true, shift: x > 9.4 }; // out for the pulley
      case 2: // onto the car, and in: it takes you up
        return { right: x < 15.3, left: x > 15.6, shift: g && x > 15.1 && x < 15.8 };
      case 3: // arrived by night, the lurker at the landing: a beat on the car, then out for day
        m.t = g && y < 8 ? (m.t ?? 0) + 1 : 0;
        return { shift: m.t > 40 };
      case 4: return { right: x < 22.1, left: x > 22.5, shift: g && x > 21.8 && x < 22.6 }; // past the frozen lurker
      default: return { right: true, jump: g && x > 28.6 }; // past the frozen day-walker, and up the step to the exit
    }
  }),
  supervisor: (s, m) => {
    const x = tx(s);
    const job = s.repairs[0];
    const [sup, lo, hi] = freakBoxes(L.supervisor, s);
    const clear = (b) => !b.watched && sup.turnIn > 0.85;
    if (!job.tool || x < 7.2) return { right: true, shift: want(s, x > 6.6 ? NIGHT : DAY) };
    if (x < 8 && !clear(lo)) return {};
    if (job.at === 0 && !m.through) { if (x > 16.2) m.through = true; return { right: true }; }
    if (job.at === 0) return { left: true }; // take the fuse with you
    if (x < 18 && x > 16.8 && !clear(hi)) return {};
    if (job.at === 1 || x > 16.8 || !m.pulled) { m.pulled = true; }
    const jump = s.player.grounded ? x > 27.4 && x < 28 : s.player.vy < 0;
    return { right: x < 30, left: x > 30.6, jump, shift: want(s, x > 25.4 ? DAY : NIGHT) };
  },
  stairs: steady((s, m) => {
    const x = tx(s);
    const job = s.repairs[0];
    if (!job.done) return { right: true, shift: want(s, x > 7.4 ? NIGHT : DAY) };
    if (x < 16.4) return { right: true, shift: want(s, x > 10 && x < 15 ? DAY : NIGHT) }; // the tunnel by day: its lurker stops
    const stop = s.nightEntries - job.since;
    if (stop < 1) return { shift: (m.p = !m.p), right: true };
    if (stop === 1 && x < 19.4) return { right: true, jump: s.player.grounded ? x > 17 : s.player.vy < 0 };
    if (stop === 1) return s.player.grounded ? { shift: (m.p = !m.p) } : {};
    return { right: true, shift: want(s, x > 25.4 ? NIGHT : s.layer) };
  }, { jumps: false }),
  doors: steady((s, m) => {
    const x = tx(s);
    const job = s.repairs[0];
    if (!job.tool) return { right: true };
    m.t = (m.t ?? 0) + 1;
    if (m.t === 60 || m.t === 120) return { shift: true };
    if (m.t < 180) return {};
    if (!job.done) {
      // up onto the clamp's ledge: a run-up from the left, and back for another if you end up under it
      const low = s.player.grounded && s.player.y / TILE > 12.5;
      if (low && x > 2.2) m.ready = false;
      if (!m.ready) { if (x < 0.8) m.ready = true; return { left: true }; }
      return { right: x < 4.2, left: x > 4.6, jump: low && x > 0.6 && x < 1.6 };
    }
    let target = NIGHT;
    if (x >= 13.4 && x < 16.2) target = DAY;
    else if (x >= 26.6) target = DAY;
    const jump = s.player.grounded && x > 24.7 && x < 25.4;
    return { right: true, jump, shift: want(s, target) };
  }),
  pillar: (s, m) => {
    const x = tx(s);
    const job = s.repairs[0];
    if (!job.done) {
      const target = x > 4 && x < 8.8 ? NIGHT : x >= 8.8 && x < 14.6 ? DAY : NIGHT;
      return { right: true, shift: want(s, target) };
    }
    if (x < 21 && !m.up) { // up the day crates, and clock in mid-jump off them
      const target = x > 18.6 || x < 15.2 ? NIGHT : DAY;
      const jump = s.player.grounded ? (x > 15.3 && x < 16.6) || (x > 17 && x < 18.6) || x > 19.6 : s.player.vy < 0;
      if (x > 20.2 && s.player.grounded && s.layer === NIGHT) m.up = true;
      return { right: true, jump, shift: want(s, target) };
    }
    const target = x > 25.4 ? NIGHT : s.layer;
    const jump = s.player.grounded ? x < 21.6 : s.player.vy < 0;
    return { right: true, jump, shift: want(s, target) };
  },
  portrait: steady((s, m) => {
    const x = tx(s);
    const y = s.player.y / TILE;
    const g = s.player.grounded;
    const job = s.repairs[0];
    switch (s.shifts) {
      case 0: return { right: true, shift: x > 3 }; // in: it's rehung on the low hook, and the doorway clears
      case 1: // through the doorway's tunnel at night, up onto the crate, and out there
        if (y > 12.5) return { right: true, jump: g && x > 11.6 && x < 12.4 };
        return { right: x < 13.15, left: x > 13.45, shift: g && x > 12.95 && x < 13.6 };
      case 2: // up the portrait to the shelf for the bulb, off its far end, and in at the day wall
        if (!job.tool) {
          if (!g && y < 12 && x > 14.6 && !m.onM) return {}; // let go mid-air: land on the near end of the portrait
          if (g && y > 10 && y < 11) m.onM = true;
          return { right: true, jump: g && ((y > 12 && x > 13.1) || (y > 10 && y < 11)) };
        }
        return { right: x < 20.2, left: x > 20.6, shift: g && y > 12.5 && x > 19.9 && x < 20.7 };
      case 3: // the spotlight, through the lit tunnel, onto the crate, and out
        if (!job.done) return { right: x < 20.2, left: x > 20.6 }; // stand in the spotlight
        if (y > 12.5 && x < 26) return { right: true, jump: g && x > 24.2 && x < 25.2 };
        return { right: x < 26.2, left: x > 26.5, shift: g && x > 25.95 && x < 26.6 };
      default: // up the portrait from the crate, then a run along its top and up onto the ledge
        if (g && y < 11 && x < 25.2) m.onTop = true; // standing on the portrait
        if (!m.onTop) return { left: x > 23.6, jump: g && x > 25.4 };
        return { right: true, jump: g && y < 11 && x > 23.2 && x < 24.6 };
    }
  }),
  audit: (s, m) => {
    const p = s.player;
    const x = tx(s);
    // each press in the middle of its window, so a press moved early or late still lands inside it
    const plan = [[1.2, 2.4, NIGHT], [6.6, 7.6, DAY], [10.6, 11.4, NIGHT]];
    const due = plan.find(([a, b]) => x >= a && x <= b);
    let shift = !!due && s.layer !== due[2];
    let right = true;
    if (s.layer === NIGHT && x > 10.5 && x < 16.5) {
      // the supervisor works one side at a time: at each tunnel's mouth, wait until its lurker slacks with time
      // to spare, then go through without stopping (the left lurker reaches x 14.83, the right one from 16.57)
      const sup = freakBoxes(L.audit, s).find((b) => b.kind === 'supervisor');
      if (x < 11.5 && !m.goA) right = m.goA = sup.facing === 1 && sup.turnIn > 0.5;
      else if (x >= 14.95 && !m.goB) right = m.goB = sup.facing === -1 && sup.turnIn > 0.5;
    }
    // past the day-walker (its reach ends at x 22.83), stop before the pit (24.4): out for the clamp and back in
    // (entry 3, when they would have had the plank). The stop starts early enough to absorb a slow reaction.
    if (x > 23.5 && x < 24.4 && !m.plank) {
      right = false;
      if (Math.abs(p.vx) < 1) {
        m.ticks = (m.ticks ?? 0) + 1;
        shift = (m.ticks > 4 && m.ticks < 8 && s.layer === NIGHT) || (m.ticks > 24 && m.ticks < 28 && s.layer === DAY);
        if (m.ticks > 40 && s.nightEntries >= 3) m.plank = true;
      }
    }
    return { right, shift };
  },
  fallup: (s) => {
    const p = s.player;
    const x = tx(s);
    const plan = [[2, 6, NIGHT], [13, 15, DAY]];
    const due = plan.find(([a, b]) => x >= a && x <= b);
    const brake = s.layer === DAY && x > 17.5 && x < 28 && p.y > 10.5 * TILE; // deep enough to carry across
    const drop = s.layer === NIGHT && p.grounded && x > 28; // hanging on the far side: drop to the exit
    return { right: true, shift: (!!due && s.layer !== due[2]) || brake || drop };
  },
  // A loop. Bottom, rightward: in before the day-walker, out before the lurker, in over the pit and up the shaft.
  // Top, leftward: out onto the walkway, in before the day-walker, out before the lurker, in for the plank (the
  // 4th clock-in brings it over the last gap).
  heels: (s, m) => {
    const x = tx(s);
    const job = s.repairs[0];
    if (job.at === 0 && !m.pulled) { // past the shutter, back to the box in the wall: the fuse comes along
      if (x > 28.2) m.back = true;
      return m.back ? { left: true } : { right: true };
    }
    if (m.back) m.pulled = true;
    if (s.player.y > 9 * TILE && !m.top) {
      const plan = [[11.2, 12.2, NIGHT], [15.6, 16.6, DAY], [21, 30, NIGHT]];
      const due = plan.find(([a, b]) => x >= a && x <= b);
      return { right: true, shift: !!due && s.layer !== due[2] };
    }
    if (!s.player.grounded && !m.top) return { right: true }; // rising up the shaft
    m.top = true;
    const plan = [[22, 28.5, DAY], [16.8, 21.4, NIGHT], [12.6, 16.2, DAY], [0, 11, NIGHT]];
    const due = plan.find(([a, b]) => x >= a && x <= b);
    return { left: true, shift: !!due && s.layer !== due[2] };
  },
  ceiling: (s) => {
    const x = tx(s);
    const plan = [[2.8, 4.4, NIGHT], [13.9, 14.9, DAY], [20.8, 21.6, NIGHT], [31, 32, DAY]];
    const due = plan.find(([a, b]) => x >= a && x <= b);
    return { right: true, shift: !!due && s.layer !== due[2] };
  },
  upside: (s) => {
    const x = tx(s);
    return { right: x < 30, left: x > 30.6, shift: (x > 7 && x < 28.4 && want(s, NIGHT)) || (x >= 28.4 && want(s, DAY)) };
  },
  offset: steady((s, m) => {
    // four hops up the tower: walk into place, jump, shift at the apex onto the floor's copy
    const hops = [[7.5, NIGHT], [9.5, DAY], [10, NIGHT], [11.4, DAY]];
    const i = m.i ?? 0;
    const p = s.player;
    if (i >= hops.length) {
      const x = tx(s);
      if (x < 14.6) return { right: true };
      if (s.nightEntries === (m.base ??= s.nightEntries)) return p.grounded ? { shift: (m.q = !m.q) } : {}; // on the car: in and it carries you
      if (s.layer === NIGHT) return { shift: (m.q = !m.q) };
      return { right: true };
    }
    const [at, layer] = hops[i];
    if (m.launched && p.grounded) {
      m.launched = false;
      if (s.layer === layer) { m.i = i + 1; return { right: true }; } // landed on the copy: next hop
    }
    const airborne = !p.grounded;
    const jump = airborne ? p.vy < 0 : tx(s) > at;
    const shift = airborne && Math.abs(p.vy) < 60 && s.layer !== layer;
    if (shift) m.launched = true;
    // no right in the air (land on the copy below), and none past the take-off spot: a late jump still lifts off there
    return { right: !airborne && tx(s) < at + 0.4, jump, shift };
  }),
};

// Policies for levels kept outside LEVELS: the classic Clock Out (CLOCKOUT_CLASSIC).
export const SOLUTIONS_EXTRA = {
  clockoutClassic: (s) => {
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
};
