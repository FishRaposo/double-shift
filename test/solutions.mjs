// Scripted solutions: one policy per level, reading the state like a player would (position, layer,
// clocks), not frame-exact scripts. Shared by the level tests, the fairness tests and `npm run audit`.
import { LEVELS } from '../src/levels.js';
import { parseLevel, freakBoxes, tileAt, isSolidChar, DAY, NIGHT, PARAMS, TILE } from '../src/rules.js';
import { tx } from './helpers.mjs';

export const L = Object.fromEntries(LEVELS.map((l) => [l.id, parseLevel(l)]));
const want = (s, layer) => s.layer !== layer;

export const SOLUTIONS = {
  clock: (s) => {
    const x = tx(s);
    const target = x > 7 && x < 19.2 ? NIGHT : x > 26 ? NIGHT : DAY;
    const jump = s.player.grounded ? (x > 20.9 && x < 21.6) || (x > 23 && x < 24.2) : s.player.vy < 0;
    return { right: true, jump, shift: want(s, target) };
  },
  scaff: (s) => {
    const x = tx(s);
    const flying = !s.player.grounded && x > 15.2;
    let target = DAY;
    if (x > 3.6 && x < 6.4) target = NIGHT; // the wrench is on the night shift
    else if (flying && x < 25) target = NIGHT; // off the deck and through where the wall was
    else if (x > 16 && x < 25) target = NIGHT;
    else if (x >= 25) target = DAY; // past the night wall
    const jump = s.player.grounded ? (x > 9.2 && x < 9.9) || (x > 13.2 && x < 14) : s.player.vy < 0;
    return { right: true, jump, shift: want(s, target) };
  },
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
  midair: (s) => {
    const x = tx(s);
    let target = DAY;
    if (x > 10.2 && x < 15.2) target = NIGHT; // off the day stone and onto the night one, mid-air
    if (x > 21.5) target = NIGHT; // past the day wall
    const jump = s.player.grounded ? (x > 3.6 && x < 4.3) || (x > 7.6 && x < 8.3) || (x > 13.2 && x < 13.8) || (x > 24 && x < 24.8) : s.player.vy < 0;
    return { right: true, jump, shift: want(s, target) };
  },
  inventory: (s) => {
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
    switch (s.shifts) {
      case 0: return { right: true, shift: x >= 2.5 };
      case 1: {
        // hanging at the peeker: wait until the clipboard looks away from this room, then cross without stopping
        const sup = freakBoxes(L.clockout, s).find((b) => b.kind === 'supervisor');
        if (sup.facing === 1 && sup.turnIn >= 0.9) m.past = true;
        return { right: x < 4.4 || !!m.past, shift: x >= 9.6 };
      }
      case 2: return { right: true, shift: x >= 13 };
      case 3: return { right: true, shift: x >= 16.4 };
      case 4: return { right: x < 22.4, shift: x >= 22.4 };
      case 5: {
        const sup = freakBoxes(L.clockout, s).find((b) => b.kind === 'supervisor');
        if (sup.facing === -1 && sup.turnIn >= 1) m.go = true;
        return { right: !!m.go && x < 27.65, shift: x >= 27.65 };
      }
      case 6: return { shift: Math.abs(s.player.vx) < 1 };
      default: return { right: true };
    }
  },
  daywalker: (s, m) => {
    const x = tx(s);
    const job = s.repairs[0];
    if (!job.done) return { right: true, shift: want(s, x > 7.4 ? NIGHT : DAY) };
    if (x < 19.4) return { right: true, shift: want(s, x > 10 && x < 14.3 ? DAY : NIGHT) };
    const stop = s.nightEntries - job.since;
    if (stop === 1 && x < 22.4) return { right: true, jump: s.player.grounded ? x > 19.8 : s.player.vy < 0 };
    if (stop === 1) return s.player.grounded ? { shift: (m.p = !m.p) } : {};
    return { right: true, shift: want(s, x > 26.4 ? NIGHT : s.layer) };
  },
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
  stairs: (s, m) => {
    const x = tx(s);
    const job = s.repairs[0];
    if (!job.done) return { right: true, shift: want(s, x > 7.4 ? NIGHT : DAY) };
    if (x < 16.4) return { right: true, shift: want(s, x > 10 && x < 15 ? DAY : NIGHT) }; // the tunnel by day: its lurker stops
    const stop = s.nightEntries - job.since;
    if (stop < 1) return { shift: (m.p = !m.p), right: true };
    if (stop === 1 && x < 19.4) return { right: true, jump: s.player.grounded ? x > 16.8 : s.player.vy < 0 };
    if (stop === 1) return s.player.grounded ? { shift: (m.p = !m.p) } : {};
    return { right: true, shift: want(s, x > 25.4 ? NIGHT : s.layer) };
  },
  doors: (s, m) => {
    const x = tx(s);
    const job = s.repairs[0];
    if (!job.tool) return { right: true };
    m.t = (m.t ?? 0) + 1;
    if (m.t === 60 || m.t === 120) return { shift: true };
    if (m.t < 180) return {};
    if (!job.done) return { right: x < 4.2, jump: s.player.grounded ? x > 1.6 : s.player.vy < 0 };
    let target = NIGHT;
    if (x >= 13.4 && x < 16.2) target = DAY;
    else if (x >= 26.6) target = DAY;
    const jump = s.player.grounded ? x > 24.7 && x < 25.4 : s.player.vy < 0;
    return { right: true, jump, shift: want(s, target) };
  },
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
  portrait: (s) => {
    const x = tx(s);
    let target = NIGHT;
    if (x > 11 && x < 17.2) target = DAY; // onto the day shelf, mid-air
    if (x > 25.3) target = DAY;
    if (x < 3.6) target = DAY;
    const jump = s.player.grounded ? (x > 5 && x < 5.7) || (x > 9.4 && x < 10.2) || (x > 25.6 && x < 26.2) : s.player.vy < 0;
    return { right: x < 28.6, jump, shift: want(s, target) };
  },
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
      if (x < 11.5 && !m.goA) right = m.goA = sup.facing === 1 && sup.turnIn > 0.75;
      else if (x >= 14.95 && !m.goB) right = m.goB = sup.facing === -1 && sup.turnIn > 0.75;
    }
    // past the day-walker (its reach ends at x 22.83), stop before the pit (24.4): out for the clamp and back in
    // (entry 3, when they would have had the plank). The stop starts early enough to absorb a slow reaction.
    if (x > 23.5 && x < 24.4 && !m.plank) {
      right = false;
      if (Math.abs(p.vx) < 1) {
        m.ticks = (m.ticks ?? 0) + 1;
        shift = (m.ticks > 12 && m.ticks < 16 && s.layer === NIGHT) || (m.ticks > 45 && m.ticks < 49 && s.layer === DAY);
        if (m.ticks > 80 && s.nightEntries >= 3) m.plank = true;
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
  // in under the walkway (entry 1: the plank's over pit A); out past the pit, walk under the lurker's outline; in
  // past its tunnel (entry 2: they move the plank over pit B); out over the exit
  ceiling: (s) => {
    const x = tx(s);
    const plan = [[2, 4, NIGHT], [13.9, 14.9, DAY], [20, 21, NIGHT], [31, 32, DAY]];
    const due = plan.find(([a, b]) => x >= a && x <= b);
    return { right: true, shift: !!due && s.layer !== due[2] };
  },
  // under the walkway, clock in and fall up onto it; past the pit, clock out and drop to the floor
  upside: (s) => ({ right: true, shift: (tx(s) > 7 && tx(s) < 16 && want(s, NIGHT)) || (tx(s) > 19 && want(s, DAY)) }),
  offset: (s, m) => {
    // four hops up the tower: walk into place, jump, shift at the apex onto the floor's copy
    const hops = [[7.5, NIGHT], [9.5, DAY], [11, NIGHT], [12, DAY]];
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
    return { right: !airborne, jump, shift }; // no right in the air: land on the copy below
  },
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
