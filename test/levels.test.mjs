// Every level is completable at par by a scripted run, and no level can be won with zero shifts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, CLOCKOUT_CLASSIC } from '../src/levels.js';
import { DAY, NIGHT, TILE, NO_INPUT, PARAMS, overridesAfter, initState, step, tileAt, supervisorFacing, parseLevel, freakBoxes, gravitySign } from '../src/rules.js';
import { play, tx, inputsFrom, recordInputs, searchBelowPar } from './helpers.mjs';
import { skinPlan } from '../src/skins.js';
import { memoNear, memoPanel } from '../src/layout.js';
import { SOLUTIONS, SOLUTIONS_EXTRA, L } from './solutions.mjs';

test('a policy holding jump or shift makes one press until it lets go (play, the audit and the demo GIF)', () => {
  const held = inputsFrom(() => ({ right: true, jump: true, shift: true }));
  assert.deepEqual(held(null), { left: false, right: true, jumpHeld: true, jumpPressed: true, shiftPressed: true });
  assert.deepEqual(held(null), { left: false, right: true, jumpHeld: true, jumpPressed: false, shiftPressed: false });
  const seen = [];
  const next = inputsFrom((s, mem, f) => {
    mem.calls = (mem.calls ?? 0) + 1;
    seen.push([s, f, mem.calls]);
    return f === 1 ? { shift: true } : {};
  });
  assert.deepEqual([next('a'), next('b'), next('c')].map((i) => i.shiftPressed), [false, true, false]);
  assert.deepEqual(seen, [['a', 0, 1], ['b', 1, 2], ['c', 2, 3]], 'the state, the tick and one memory object per run');
});

test("a policy that returns nothing is a bug in the policy, not 'no input'", () => {
  const forgot = inputsFrom((s, mem, f) => { if (f < 1) return { right: true }; });
  assert.equal(forgot(null).right, true);
  assert.throws(() => forgot(null), /policy returned undefined at tick 1/);
});

test('every level has a scripted solution', () => {
  assert.deepEqual(Object.keys(SOLUTIONS).sort(), LEVELS.map((l) => l.id).sort());
});

for (const def of LEVELS) {
  test(`${def.name}: completable at par (${def.par}) with no deaths`, () => {
    const { state, events } = play(L[def.id], SOLUTIONS[def.id], 120 * 30);
    assert.equal(state.won, true);
    assert.ok(state.shifts <= def.par, `took ${state.shifts} shifts, par ${def.par}`);
    assert.equal(events.filter((e) => e.type === 'death').length, 0);
  });

  test(`${def.name}: cannot be won without shifting (running and jumping only)`, () => {
    const lvl = L[def.id];
    for (const jumpEvery of [0, 20, 45, 70]) {
      const { state } = play(lvl, (s, m, f) => ({ right: true, jump: jumpEvery && f % jumpEvery < 12 }), 120 * 12);
      assert.equal(state.won, false, `won with jumpEvery=${jumpEvery}`);
    }
  });
}

test('Broad Daylight: staying on day through the tunnel gets you spooked by the day-walker', () => {
  const { events } = play(L.daywalker, () => ({ right: true }), 120 * 8);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'spooked' && e.by === 'daywalker'));
});

test('Broad Daylight: the day-walker cannot be jumped (the tunnel roof stops you)', () => {
  const { events } = play(L.daywalker, (s, m, f) => ({ right: true, jump: f % 30 < 15 }), 120 * 8);
  assert.ok(events.some((e) => e.type === 'death' && e.by === 'daywalker'));
});

test('Clock Out (classic): still wins at par 7', () => {
  const lvl = parseLevel(CLOCKOUT_CLASSIC);
  const { state } = play(lvl, SOLUTIONS_EXTRA.clockoutClassic);
  assert.equal(state.won, true);
  assert.equal(state.deaths, 0);
  assert.ok(state.shifts <= CLOCKOUT_CLASSIC.par, `${state.shifts} clock-ins`);
  assert.equal(CLOCKOUT_CLASSIC.par, 7);
});

test('Clock Out (classic): without the fourth clock-in the step stays gone and the time clock is out of reach', () => {
  const { state } = play(parseLevel(CLOCKOUT_CLASSIC), (s, m, f) => {
    const want = SOLUTIONS_EXTRA.clockoutClassic(s, m, f);
    return s.nightEntries >= 3 && tx(s) > 25 ? { right: true, jump: s.player.grounded || s.player.vy < 0 } : want;
  }, 120 * 12);
  assert.equal(state.won, false);
});

test('Mind Your Head: the first clock-in lands you on the walkway', () => {
  const lvl = L.upside;
  let s = initState(lvl);
  let f = 0;
  for (; f < 120 * 10 && s.shifts === 0; f++) s = step(lvl, s, { ...NO_INPUT, right: true, shiftPressed: tx(s) > 7 });
  assert.equal(s.layer, NIGHT);
  for (let i = 0; i < 120 && !s.player.grounded; i++) s = step(lvl, s, { ...NO_INPUT, right: true });
  assert.equal(s.player.grounded, true, 'hanging');
  assert.equal(s.player.y, 12 * TILE, 'under the walkway (night row 11, the day walkway at row 6 turned over)');
  assert.equal(s.deaths, 0);
});

test('Structural Integrity: the pillar stands at P1, P2, P3 after entries 1, 2, 3', () => {
  const lvl = L.pillar;
  const P = { P0: 6, P1: 11, P2: 20, P3: 13 };
  const standsAt = (s, col) => [10, 11, 12, 13].every((ty) => tileAt(lvl, NIGHT, col, ty, s.overrides) === '#');
  let s = initState(lvl); // toggle at the spawn, where both shifts are open
  const expect = [['P0'], ['P1'], ['P2'], ['P3']];
  assert.ok(standsAt(s, P.P0));
  for (let entry = 1; entry <= 3; entry++) {
    if (s.layer === NIGHT) s = step(lvl, s, { ...NO_INPUT, shiftPressed: true });
    s = step(lvl, s, { ...NO_INPUT, shiftPressed: true });
    assert.equal(s.nightEntries, entry);
    const where = Object.entries(P).filter(([, col]) => standsAt(s, col)).map(([k]) => k);
    assert.deepEqual(where, expect[entry], `after entry ${entry}`);
  }
});

// ---------- Night Audit: one test per lesson it examines ----------
const auditAt = (x, layer, extra = {}) => {
  const s = initState(L.audit);
  s.layer = layer;
  s.overrides = { [`${NIGHT},12,13`]: '.', [`${DAY},28,13`]: '.', [`${NIGHT},28,13`]: '.' }; // both stations done
  Object.assign(s.player, { x: x * TILE, y: 14 * TILE - 26, vx: 0, vy: 0, grounded: true });
  return Object.assign(s, extra);
};
const run = (lvl, s, input, frames) => {
  const events = [];
  for (let f = 0; f < frames && s.deaths === 0 && !s.won; f++) { s = step(lvl, s, input(s, f)); events.push(...s.events); }
  return { s, events };
};

test('Night Audit: night through the wax slides into the hazard (letting go does not stop you)', () => {
  const lvl = L.audit;
  const { events } = run(lvl, initState(lvl), (s) => ({ ...NO_INPUT, right: tx(s) < 4.2, shiftPressed: s.shifts === 0 && tx(s) > 1.2 }), 120 * 6);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'hazard'), 'slid into the laser');
});

test('Night Audit: crossing a watched tunnel spooks', () => {
  const lvl = L.audit;
  // facing left: the left tunnel's lurker is working
  const sup = lvl.freaks.find((f) => f.kind === 'supervisor');
  let t = 0;
  while (supervisorFacing(sup, t) !== -1) t += 0.05;
  const { events } = run(lvl, auditAt(11.3, NIGHT, { freakClock: t + 0.05, nightEntries: 2 }), () => ({ ...NO_INPUT, right: true }), 120 * 3);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'spooked' && e.by === 'lurker'));
});

test('Night Audit: day past the day-walker spooks', () => {
  const lvl = L.audit;
  const { events } = run(lvl, auditAt(19.3, DAY), () => ({ ...NO_INPUT, right: true }), 120 * 3);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'spooked' && e.by === 'daywalker'));
});

test('Night Audit: night past the squatter spooks', () => {
  const lvl = L.audit;
  const sup = lvl.freaks.find((f) => f.kind === 'supervisor');
  let t = 0;
  while (supervisorFacing(sup, t) !== 1) t += 0.05; // facing right: the far squatter works too
  const { events } = run(lvl, auditAt(27.1, NIGHT, { freakClock: t + 0.05, nightEntries: 3 }), () => ({ ...NO_INPUT, right: true }), 120 * 2);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'spooked' && e.by === 'squatter'));
});

test('Structural Integrity: one clock-in too many is not a softlock: the pillar comes back around to P2', () => {
  const lvl = L.pillar;
  let s = initState(lvl);
  for (let k = 0; k < 9; k++) s = step(lvl, s, { ...NO_INPUT, shiftPressed: true }); // entries 1-5 at the spawn
  assert.deepEqual([s.layer, s.nightEntries], [NIGHT, 5]);
  assert.ok([10, 11, 12, 13].every((ty) => tileAt(lvl, NIGHT, 20, ty, s.overrides) === '#'), 'at P2 again on entry 5');
});

test('Falling Up: the first clock-in falls you up onto the ceiling (the floor is up there now)', () => {
  const lvl = L.fallup;
  let s = initState(lvl);
  s = step(lvl, s, { ...NO_INPUT, shiftPressed: true });
  for (let i = 0; i < 120 && !s.player.grounded; i++) s = step(lvl, s);
  assert.equal(s.layer, NIGHT);
  assert.ok(Math.abs(s.player.y - 4 * TILE) < 1, `hanging under the floor's copy, rows 0-3 (y ${s.player.y})`);
});

test('Falling Up: skipping the brake flip falls into the pit', () => {
  const lvl = L.fallup;
  // the solution up to the high ledge, then run off its end without the mid-fall clock-in
  const policy = (s, m, f) => (s.shifts >= 2 && s.layer === DAY && tx(s) > 16 ? { right: true } : SOLUTIONS.fallup(s, m, f));
  const { events } = play(lvl, policy, 120 * 15);
  assert.ok(events.some((e) => e.type === 'death' && e.cause === 'fall'));
});

test('Ceiling Walker: walking on through the tunnel while the clipboard watches it spooks, and night alone never wins', () => {
  const lvl = L.ceiling;
  // the solution's first clock-in, then never out: the lurker's tunnel is one tile high and solid to the grid's
  // edge below, so jumps don't get over it; a rhythm that arrives while it slacks falls at the second pit instead
  for (const period of [0, 18, 24, 30, 36, 48, 60, 90]) {
    const jump = (s, f) => s.layer === NIGHT && period > 0 && f % period < period / 2;
    const policy = (s, m, f) => ({ right: true, shift: s.shifts === 0 && SOLUTIONS.ceiling(s, m, f).shift, jump: jump(s, f) });
    const { events, state: { won } } = play(lvl, policy, 120 * 8);
    assert.equal(events.filter((e) => e.type === 'shift').length, 1);
    const death = events.find((e) => e.type === 'death');
    assert.ok(!won, `jump period ${period}: won on one clock-in`);
    if (period === 0) assert.ok(death?.cause === 'spooked' && death.by === 'lurker', `died of ${death?.cause}`);
  }
});

test('Ceiling Walker: the wax before the tunnel keeps you sliding after you let go', () => {
  const lvl = L.ceiling;
  assert.equal(tileAt(lvl, NIGHT, 13, 11), '~');
  const policy = (s, m, f) => ({ right: tx(s) < 13.2, shift: s.shifts === 0 && SOLUTIONS.ceiling(s, m, f).shift });
  const { state } = play(lvl, policy, 120 * 3);
  assert.ok(tx(state) > 14 || state.deaths > 0, `stopped at ${tx(state).toFixed(2)}`);
});

test('Head Over Heels: staying on day meets the day-walker', () => {
  const lvl = L.heels;
  // never clocking in: the bottom slot through the block is one tile high, so no rhythm of jumps gets past it
  for (const period of [0, 18, 30, 48, 90]) {
    const policy = (s, m, f) => ({ right: true, jump: period > 0 && f % period < period / 2 });
    const { events } = play(lvl, policy, 120 * 6);
    const death = events.find((e) => e.type === 'death');
    assert.ok(death && death.cause === 'spooked' && death.by === 'daywalker', `jump period ${period}: died of ${death?.cause}`);
  }
});

test('Head Over Heels: staying on night meets the lurker', () => {
  const lvl = L.heels;
  // the solution's first clock-in, then never out: the lurker further along the slot is awake all night
  for (const period of [0, 18, 30, 48, 90]) {
    const jump = (s, f) => s.layer === NIGHT && period > 0 && f % period < period / 2;
    const policy = (s, m, f) => ({ right: true, shift: s.shifts === 0 && SOLUTIONS.heels(s, m, f).shift, jump: jump(s, f) });
    const { events } = play(lvl, policy, 120 * 6);
    assert.equal(events.filter((e) => e.type === 'shift').length, 1);
    const death = events.find((e) => e.type === 'death');
    assert.ok(death && death.cause === 'spooked' && death.by === 'lurker', `jump period ${period}: died of ${death?.cause}`);
  }
});

test('Head Over Heels: the final plank needs the right night entry', () => {
  const lvl = L.heels;
  const over = (entries) => tileAt(lvl, NIGHT, 5, 3, overridesAfter(lvl, entries));
  assert.equal(over(3), '.', 'on the 3rd clock-in the last gap has no ceiling');
  assert.equal(over(4), '#', 'the 4th lays the plank over it');
});

// The finale (rev 2): one lesson test per room.
test('Clock Out: room 1, crossing while the clipboard watches this room meets the peeker', () => {
  const policy = (s, m, f) => {
    const out = SOLUTIONS.clockout(s, m, f);
    return s.shifts === 1 ? { right: true } : out; // no waiting
  };
  const { events } = play(L.clockout, policy, 120 * 3);
  assert.ok(events.some((e) => e.type === 'death' && e.by === 'peeker'));
});

test('Clock Out: one of every freak, and the supervisor perched out of the corridor', () => {
  const kinds = new Set(L.clockout.freaks.map((f) => f.kind));
  assert.deepEqual([...kinds].sort(), ['daywalker', 'lurker', 'peeker', 'squatter', 'supervisor']);
  assert.equal(L.clockout.freaks.find((f) => f.kind === 'supervisor').ty, 4);
});

test('Falling Up: no brake from the floor (a clock-in at the foot of the wall never gets under it)', () => {
  // the shortcut the full audit's random search found: jump along the floor, clock in falling at the wall's
  // foot, pass under it on the night side, rise into the pit and clock out going up: an arc onto the far floor
  const lvl = L.fallup;
  for (const a of [15.3, 15.4, 15.5]) for (const b of [21.25, 21.75, 22.5]) {
    const policy = (s) => {
      const x = tx(s);
      const jump = s.player.grounded ? [2.4, 10.1].some((j) => x > j && x < j + 0.4) : gravitySign(lvl, s.layer) * s.player.vy < 0;
      return { right: true, jump, shift: [a, b].some((w) => x > w && x < w + 0.35) };
    };
    const { state } = play(lvl, policy, 120 * 8);
    assert.ok(!(state.won && state.shifts < lvl.par), `won with ${state.shifts} clock-ins (shift windows ${a}, ${b})`);
  }
});

test('Clock Out: the stolen door leaves its empty frame', () => {
  const lvl = L.clockout;
  const doors = (ov) => skinPlan(lvl, NIGHT, ov).filter((p) => p.tx === 16);
  assert.deepEqual(doors({}), [{ draw: 'door', tx: 16, ty: 14, h: 2, hang: true }]);
  const { state } = play(lvl, (s, m, f) => (s.shifts >= 3 ? {} : SOLUTIONS.clockout(s, m, f)), 120 * 4); // to the 2nd clock-in
  assert.equal(state.nightEntries, 2);
  assert.deepEqual(doors(state.overrides), [{ draw: 'emptyFrame', tx: 16, ty: 14, h: 2, hang: true }]);
});

// A relocated object goes round its places forever: however many clock-ins, its useful place comes back.
const toggleTo = (lvl, entries) => {
  let s = initState(lvl);
  for (let k = 0; k < 2 * entries - 1; k++) s = step(lvl, s, { ...NO_INPUT, shiftPressed: true }); // in place at the spawn
  assert.deepEqual([s.layer, s.nightEntries], [NIGHT, entries]);
  return s;
};
const solidAt = (lvl, s, cells) => cells.every(([tx, ty]) => tileAt(lvl, NIGHT, tx, ty, s.overrides) === '#');

test('relocations never run out: P2, the step, the planks all come round again by entry 40-41', () => {
  assert.ok(solidAt(L.pillar, toggleTo(L.pillar, 41), [[20, 10], [20, 11], [20, 12], [20, 13]]), 'pillar at P2 on entry 41');
  assert.ok(solidAt(L.heels, toggleTo(L.heels, 40), [[2, 3], [9, 3]]), 'plank over the last gap on entry 40');
});

test('memos: the solution passes close enough to read every memo, in its shift', () => {
  for (const def of LEVELS) {
    const m = (def.props ?? []).find((p) => p.kind === 'memo');
    if (!m) continue;
    const shift = m.layer === 'night' ? NIGHT : m.layer === 'day' ? DAY : null;
    let read = false;
    play(L[def.id], (s, mem, f) => {
      if (!read && (shift === null || s.layer === shift) && memoNear(s.player, m)) read = true;
      return SOLUTIONS[def.id](s, mem, f);
    });
    assert.ok(read, `${def.id}: the memo at ${m.tx},${m.ty} is never in reach`);
  }
});

// ---------- cohesion: what every level has to hold to ----------

test('every prank has a tell (LEVELS.md §3 rule 6)', () => {
  for (const def of LEVELS) {
    for (const pr of L[def.id].pranks) assert.ok(pr.tell, `${def.id}: prank ${pr.id}`);
  }
});

test('no prop hides inside a solid on a shift it shows on', () => {
  for (const def of LEVELS) {
    const lvl = L[def.id];
    for (const p of (def.props ?? []).filter((q) => q.kind !== 'nail')) { // a nail waits behind what hangs on it
      for (const layer of p.layer ? [p.layer === 'night' ? NIGHT : DAY] : [DAY, NIGHT]) {
        assert.notEqual(tileAt(lvl, layer, p.tx, p.ty, {}), '#', `${def.id}: ${p.kind} at ${p.tx},${p.ty} on layer ${layer}`);
      }
    }
  }
});

for (const def of LEVELS) {
  const memo = (def.props ?? []).find((p) => p.kind === 'memo');
  const open = (s) => (!memo.layer || (memo.layer === 'night') === (s.layer === NIGHT)) && memoNear(s.player, memo);

  test(`${def.name}: the memo stays open long enough to read and never hides the worker at a required press`, () => {
    const lvl = L[def.id];
    const panel = memoPanel(memo.text, memo.tx, memo.ty, { maxW: memo.w });
    const { inputs } = recordInputs(lvl, SOLUTIONS[def.id]);
    let s = initState(lvl);
    let openTicks = 0;
    for (const input of inputs) {
      if (open(s)) {
        openTicks++;
        const p = s.player;
        const covered = p.x < panel.x + panel.w && p.x + PARAMS.playerW > panel.x && p.y < panel.y + panel.h && p.y + PARAMS.playerH > panel.y;
        assert.ok(!(covered && (input.jumpPressed || input.shiftPressed)), `worker hidden at a press, tick ${Math.round(s.time * 120)}`);
      }
      s = step(lvl, s, input);
    }
    assert.ok(openTicks >= 36, `open ${(openTicks / 120).toFixed(2)} s on the par route`);
  });
}

for (const def of LEVELS) {
  test(`${def.name}: a random search both ways finds no win below par`, () => {
    assert.ok(searchBelowPar(L[def.id], def.par, 120) >= def.par);
  });
}

test('Head Over Heels: the spawn is nowhere near the exit (hold left, clock in early)', () => {
  for (let jumpAt = 0; jumpAt < 60; jumpAt += 3) {
    const { state } = play(L.heels, (s, m, f) => ({ left: true, shift: f === 0, jump: f >= jumpAt && f < jumpAt + 40 }), 120 * 4);
    assert.equal(state.won, false, `won jumping at tick ${jumpAt}`);
  }
  const { state } = play(L.heels, (s, m, f) => ({ left: true, shift: s.player.vy > 0 && s.layer === DAY }), 120 * 4);
  assert.equal(state.won, false, 'won by clocking in on the way down');
});

// ---------- work orders: the repair is the level's puzzle, not its lock (docs/GDD.md §4.11) ----------

const TYPES = {
  clock: 'build', scaff: 'build', closing: 'power', midair: 'water', inventory: 'secure', watch: 'light', stairs: 'machine', doors: 'secure',
  wet: 'water', pillar: 'secure', supervisor: 'power', stacked: 'secure', portrait: 'light', daywalker: 'machine', offset: 'machine', audit: 'mixed',
  upside: 'light', fallup: 'water', ceiling: 'secure', heels: 'power', clockout: 'mixed',
};

test('distribution: every level has its type, each type repeats, and only the first levels go without freaks', () => {
  assert.deepEqual(Object.keys(TYPES).sort(), LEVELS.map((d) => d.id).sort());
  const count = (type) => Object.values(TYPES).filter((t) => t === type).length;
  for (const type of ['build', 'power', 'water', 'machine', 'light', 'secure']) assert.ok(count(type) >= 2, type);
  const quiet = LEVELS.filter((d) => L[d.id].freaks.length === 0 && L[d.id].pranks.length === 0).map((d) => d.id);
  assert.deepEqual(quiet, ['clock', 'scaff', 'midair']);
});

test('Clock Out: one job of every type, room by room', () => {
  const jobs = L.clockout.repairs;
  assert.ok(jobs.some((j) => j.spots.length > 1), 'power');
  assert.ok(jobs.some((j) => j.fix.swap), 'water');
  assert.ok(jobs.some((j) => j.fix.car), 'machine');
  assert.ok(jobs.some((j) => j.fix.clears), 'light');
  assert.ok(jobs.some((j) => j.fix.secures.length > 0), 'secure');
  assert.ok(jobs.some((j) => !j.fix.swap && !j.fix.car && j.spots.length === 1 && j.fix.cells.length > 0), 'build');
});

const without = (lvl, i) => ({ ...lvl, repairs: lvl.repairs.map((job, k) => (k === i ? { ...job, tool: { ...job.tool, tx: -9 } } : job)) });

for (const { id } of LEVELS) {
  test(`${id}: the work order sits on the par route`, () => {
    const { events, state } = play(L[id], SOLUTIONS[id], 120 * 30);
    assert.equal(state.won, true);
    assert.equal(events.filter((e) => e.type === 'tool').length, L[id].repairs.length);
    assert.ok(events.filter((e) => e.type === 'repaired').length >= L[id].repairs.length);
  });

  test(`${id}: every job says what it is, and its links run straight`, () => {
    for (const job of L[id].repairs) {
      for (const text of [job.tool.name, job.fix.goal, ...job.spots.map((f) => f.name)]) assert.ok(text, 'a job is missing a label');
      for (const { link } of job.spots) {
        assert.ok(link.length >= 2);
        link.slice(1).forEach(([x, y], k) => assert.ok(x === link[k][0] || y === link[k][1], 'a link runs straight, on the art grid'));
      }
    }
  });

  test(`${id}: no prank undoes a repair`, () => {
    const lvl = L[id];
    const fixed = new Set(lvl.repairs.flatMap((job) => job.fix.cells.map(([layer, tx, ty]) => `${layer},${tx},${ty}`)));
    for (const pr of lvl.pranks) for (const [layer, tx, ty] of pr.cells) assert.equal(fixed.has(`${layer},${tx},${ty}`), false, `${pr.id} would undo a repair at ${tx},${ty}`);
  });
}

for (const [id, type] of Object.entries(TYPES)) {
  test(`${id}: every job is needed: without it the level can't be won`, () => {
    const lvl = L[id];
    lvl.repairs.forEach((job, i) => assert.equal(searchBelowPar(without(lvl, i), 8, 150), Infinity, job.tool.name));
  });

  test(`${id}: the repair comes early, and the level goes on after it`, () => {
    const lvl = L[id];
    const { inputs } = recordInputs(lvl, SOLUTIONS[id]);
    let s = initState(lvl);
    let first = null;
    let shifts = 0;
    let jumps = 0;
    inputs.forEach((input, f) => {
      if (first !== null) { shifts += input.shiftPressed ? 1 : 0; jumps += input.jumpPressed ? 1 : 0; }
      s = step(lvl, s, input);
      if (first === null && s.events.some((e) => e.type === 'repaired')) first = f;
    });
    assert.ok(first <= inputs.length * 0.7, `repaired ${Math.round((first / inputs.length) * 100)}% of the way through`);
    assert.ok(shifts >= 1 && (jumps >= 1 || type === 'mixed' || lvl.upsideDown), `${shifts} shifts and ${jumps} jumps after it`);
  });

  test(`${id}: ${type} does what a ${type} job does`, () => {
    const lvl = L[id];
    const { events } = play(lvl, SOLUTIONS[id], 120 * 30);
    const jobs = lvl.repairs;
    if (type === 'build') assert.ok(jobs.every((j) => j.fix.cells.length > 0));
    if (type === 'power') assert.ok(new Set(events.filter((e) => e.type === 'repaired').map((e) => e.spot)).size >= 2, 'the fuse is used in two sockets');
    if (type === 'water') {
      assert.ok(jobs.some((j) => j.undoes && j.fix.cells.some((c) => c[3] === 'w') && j.fix.cells.some((c) => c[3] === '.')), 'it floods one place and drains another');
    }
    if (type === 'machine') assert.ok(events.filter((e) => e.type === 'machine').length >= Math.min(2, jobs[0].fix.car.stops.length - 1), 'the run uses its stops');
    if (type === 'light') {
      const lit = jobs.flatMap((j) => (j.fix.clears ? [j.fix.clears] : []));
      assert.ok(lvl.freaks.some((f) => lit.some((r) => f.tx >= r.x0 && f.tx <= r.x1 && f.ty >= r.y0 && f.ty <= r.y1)), 'there is a freak to clear');
    }
    if (type === 'secure') {
      const ids = lvl.pranks.map((p) => p.id);
      assert.ok(jobs.some((j) => j.fix.secures.length > 0 && j.fix.secures.every((p) => ids.includes(p))), 'it stops a real prank');
    }
  });
}

