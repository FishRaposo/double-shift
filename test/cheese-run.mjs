// Runs the three instruments of test/cheese.mjs on every level, across worker threads (each level and instrument is
// its own task: the sweeps are the slow part of the suite, and they share nothing). Used by test/cheese.test.mjs
// with the coarse grids and by `npm run audit` with the fine ones. Results are plain data.
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { LEVELS } from '../src/levels.js';
import { SOLUTIONS, L, steady } from './solutions.mjs';
import { tx } from './helpers.mjs';
import * as C from './cheese.mjs';

const GRIDS = { COARSE: C.COARSE, FINE: C.FINE };

// Routes a reviewer found that skip a work order, kept as fixed inputs of the job-skip instrument: { job, policy }.
// Doors: night one at the spawn, back to day on the island, through the wall by day, night two, straight back to
// day while the bridges are up, night three, and the rest by the book, without ever touching the tool or the bolt.
export const FIXED_SKIPS = {
  doors: {
    job: 0,
    policy: steady((s) => {
      const x = tx(s);
      const ne = s.nightEntries;
      let target = s.layer;
      if (ne === 0) target = 1;
      else if (ne === 1 && s.layer === 1) { if (x > 13.6) target = 0; }
      else if (ne === 1 && s.layer === 0) { if (x > 16.3) target = 1; }
      else if (ne === 2 && s.layer === 1) target = 0;
      else if (ne === 2 && s.layer === 0) target = 1;
      else if (ne >= 3) target = x >= 26.6 ? 0 : 1;
      const jump = s.player.grounded && x > 24.7 && x < 25.4;
      return { right: true, jump, shift: s.layer !== target };
    }),
  },
};
export const PARTS = ['sweep', 'skip', 'waste'];

// One task: { id, part, grid: 'COARSE' | 'FINE', all, job }. `all` keeps every finding, not just the first per sample;
// `job` limits the job-skip sweep to one work order (a level with six is slow).
export function analyse({ id, part, grid: gridName, all = false, job = null }) {
  const lvl = L[id];
  const policy = SOLUTIONS[id];
  const grid = GRIDS[gridName];
  const t0 = performance.now();
  const out = { id, part, min: lvl.min };
  if (part === 'sweep') {
    const { run, hits } = C.noShiftSweep(lvl, policy, grid, { all });
    out.samples = run.samples.length;
    out.hits = hits.map((h) => {
      const fin = C.replay(lvl, C.hitInputs(lvl, run, h, grid.seconds * 120));
      return { text: C.describeHit(h), shifts: h.state.shifts, at: h.sample.f, verified: fin.won && fin.deaths === 0 && fin.shifts < lvl.min };
    });
  } else if (part === 'skip') {
    const run = C.sampleRun(lvl, policy, { every: grid.every });
    out.samples = run.samples.length;
    const fixed = FIXED_SKIPS[id];
    const fin = fixed && (job === null || job === fixed.job) ? C.playBare(lvl, fixed.job, fixed.policy) : null;
    out.hits = (fin && fin.won && fin.deaths === 0 && fin.shifts <= lvl.min ? [{ job: lvl.repairs[fixed.job].tool.name, text: `${lvl.repairs[fixed.job].tool.name}: the fixed route that never touches it (test/cheese-run.mjs) won with ${fin.shifts} clock-ins`, shifts: fin.shifts, at: 0, verified: true }] : []).concat(C.jobSkipSweep(lvl, run, grid, { all, jobs: job === null ? null : [job] }).map((h) => {
      const bare = C.neutralised(lvl, h.job);
      const fin = C.replay(bare, C.hitInputs(bare, run, h, grid.skip.seconds * 120));
      return { job: h.name, text: `${h.name}: ${C.describeHit(h)}`, shifts: h.state.shifts, at: h.sample.f, verified: fin.won && fin.deaths === 0 && fin.shifts <= lvl.min && !fin.repairs[h.job].done };
    }));
  } else if (part === 'waste') {
    out.checks = [];
    if (lvl.pranks.length) {
      const ticks = grid.wasteEvery ? C.sampleRun(lvl, policy, { every: 1e9 }).ticks : 0;
      for (let at = 0; at <= ticks; at += grid.wasteEvery || 1e9) {
        const r = C.wasteNightCheck(lvl, policy, grid, { at });
        out.checks.push({ at, verdict: r.verdict, text: C.describeWaste(r, id), deaths: r.deaths });
      }
    }
  } else throw new Error(`unknown part ${part}`);
  out.ms = Math.round(performance.now() - t0);
  return out;
}

// All tasks for `ids` (default: every level), the slowest levels first.
export function tasks(gridName, ids = LEVELS.map((d) => d.id), parts = PARTS, all = false) {
  const heavy = ['clockout', 'audit', 'portrait', 'wet', 'heels', 'daywalker'];
  const weight = (id) => (heavy.includes(id) ? 100 - heavy.indexOf(id) : 0);
  return ids
    .flatMap((id) => parts.flatMap((part) => (part === 'skip' ? L[id].repairs.map((_, job) => ({ id, part, grid: gridName, all, job })) : [{ id, part, grid: gridName, all }])))
    .sort((a, b) => weight(b.id) - weight(a.id));
}

// Several results for one level and part (the job-skip sweep runs one task per work order) become one.
function collect(out, r) {
  const have = out[r.part][r.id];
  if (!have) out[r.part][r.id] = r;
  else {
    have.hits = [...have.hits, ...r.hits];
    have.ms += r.ms;
  }
}

// Run the tasks on up to `threads` workers (1: in this thread). The workers take tasks off a shared counter, so they
// never wait for this thread (which `npm run audit` keeps busy with its own checks). Resolves to
// { sweep: {id: result}, skip: {...}, waste: {...} }.
export async function analyseAll(gridName, { ids, parts, all = false, threads = Math.min(8, availableParallelism()) } = {}) {
  const queue = tasks(gridName, ids, parts, all);
  const out = Object.fromEntries(PARTS.map((p) => [p, {}]));
  if (threads <= 1) {
    for (const task of queue) collect(out, analyse(task));
    return out;
  }
  const counter = new SharedArrayBuffer(4);
  const workers = [];
  await Promise.all(
    Array.from({ length: Math.min(threads, queue.length) }, () => new Promise((resolve, reject) => {
      const w = new Worker(new URL('./cheese-worker.mjs', import.meta.url), { workerData: { tasks: queue, counter } });
      workers.push(w);
      w.once('message', (results) => {
        for (const r of results) collect(out, r);
        resolve();
      });
      w.once('error', (e) => {
        for (const x of workers) x.terminate();
        reject(e);
      });
    })),
  );
  return out;
}
