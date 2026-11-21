// Level audit: how fair and how tight is every level? (docs/LEVELS.md §6)
// - timing windows of every required shift and jump in the scripted solution (fairness floor per act)
// - input-delay tolerance: the scripted solution with its inputs arriving 0–150 ms late
// - a random search, in both directions, for wins with fewer clock-ins than the fewest (`min`), or with no shifting at all
// - the cheese instruments of test/cheese.mjs on fine grids, on worker threads alongside the checks above: a
//   walk-and-hop sweep from states along the scripted run with no further clock-in (a win below the fewest), the same
//   with each work order out of reach and up to one more clock-in (the job is optional), and one night entry wasted at
//   points along the run (a softlock: the level can't be won from the last checkpoint)
// Usage: npm run audit [-- level-id]
import { LEVELS } from '../src/levels.js';
import { delayed, inputWindows, recordInputs, searchBelowPar, WINDOW_FLOOR as floor } from '../test/helpers.mjs';
import { SOLUTIONS, L } from '../test/solutions.mjs';
import { analyseAll } from '../test/cheese-run.mjs';

const only = process.argv[2];
if (only && !LEVELS.some((l) => l.id === only)) {
  console.error(`no level with id "${only}"`);
  process.exit(1);
}

// Started first: the workers run alongside the serial checks below and never wait for this thread.
const cheeseStart = performance.now();
const cheese = analyseAll('FINE', { ids: only ? [only] : undefined, all: true });

let problems = 0;
for (const def of LEVELS) {
  if (only && def.id !== only) continue;
  const lvl = L[def.id];
  const run = recordInputs(lvl, SOLUTIONS[def.id]);
  const windows = inputWindows(lvl, SOLUTIONS[def.id]);
  const tight = windows.filter((w) => w.ms < floor(def.act));
  const lag = [0, 3, 6, 9, 12, 18].map((t) => (delayed(lvl, SOLUTIONS[def.id], t) ? `${Math.round(t * 1000 / 120)}✓` : `${Math.round(t * 1000 / 120)}✗`));
  const fewest = searchBelowPar(lvl, def.min, 2000);
  console.log(`\n${def.id} · act ${def.act} · fewest ${def.min} (par ${lvl.par}) · solution ${(run.inputs.length / 120).toFixed(1)} s`);
  console.log(`  windows (floor ${floor(def.act)} ms): ${windows.map((w) => `${w.kind}@${w.at.toFixed(2)}s ${w.ms}ms${w.ms < floor(def.act) ? ' ✗' : ''}`).join('  ')}`);
  console.log(`  input lag tolerated (ms): ${lag.join(' ')}`);
  console.log(`  random search: ${fewest === Infinity ? 'no win below the fewest' : `won with ${fewest} clock-ins`}${fewest < def.min ? '  ✗ BELOW THE FEWEST' : ''}${fewest === 0 ? '  ✗ WON WITHOUT SHIFTING' : ''}`);
  if (tight.length || fewest < def.min) problems++;
}

// ---------- the cheese instruments, fine grids ----------

const found = await cheese;
console.log(`\n--- cheese instruments, fine grids (finished ${((performance.now() - cheeseStart) / 1000).toFixed(0)} s after the start, on worker threads) ---`);
const flagged = new Set();
for (const def of LEVELS) {
  if (only && def.id !== only) continue;
  const sweep = found.sweep[def.id];
  const skip = found.skip[def.id];
  const waste = found.waste[def.id];
  const bad = (hits, what) => hits.map((h) => `  ✗ ${what}${h.verified ? '' : ' (DOES NOT REPLAY: instrument bug)'}: ${h.text}`);
  const lines = [
    ...bad(sweep.hits, 'BELOW THE FEWEST'),
    ...bad(skip.hits, 'JOB SKIPPED'),
    ...waste.checks.filter((c) => c.verdict === 'softlock').map((c) => `  ✗ SOFTLOCK after a night wasted at ${(c.at / 120).toFixed(1)} s: ${c.text}`),
  ];
  const notes = waste.checks
    .filter((c) => c.verdict === 'recovers')
    .map((c) => `    (a night wasted at ${(c.at / 120).toFixed(1)} s needs a death or more waiting to recover: ${c.text.replace(/^[^:]+: /, '')})`);
  const verdicts = waste.checks.length ? waste.checks.map((c) => c.verdict).join(' ') : 'no pranks';
  console.log(`${def.id} · walk-and-hop sweep: ${sweep.samples} states, ${sweep.hits.length} found · job skip: ${skip.hits.length} found · wasted night: ${verdicts}`);
  for (const l of [...lines, ...notes]) console.log(l);
  if (lines.length) flagged.add(def.id);
}
const cheesy = flagged.size;
console.log(
  problems + cheesy
    ? `\n${problems} level(s) need attention in the checks above, ${cheesy} flagged by the cheese instruments${cheesy ? ` (${[...flagged].join(', ')})` : ''}`
    : '\nall levels fair: every input above its floor, no win below the fewest, no skippable job, no softlock after a wasted night',
);
process.exit(problems + cheesy ? 1 : 0);
