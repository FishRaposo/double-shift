// Level audit: how fair and how tight is every level? (docs/LEVELS.md §6)
// - timing windows of every required shift and jump in the scripted solution (fairness floor per act)
// - input-delay tolerance: the scripted solution with its inputs arriving 0–150 ms late
// - a random search, in both directions, for wins with fewer clock-ins than par, or with no shifting at all
// Usage: npm run audit [-- level-id]
import { LEVELS } from '../src/levels.js';
import { delayed, inputWindows, recordInputs, searchBelowPar, WINDOW_FLOOR as floor } from '../test/helpers.mjs';
import { SOLUTIONS, L } from '../test/solutions.mjs';

const only = process.argv[2];
if (only && !LEVELS.some((l) => l.id === only)) {
  console.error(`no level with id "${only}"`);
  process.exit(1);
}

let problems = 0;
for (const def of LEVELS) {
  if (only && def.id !== only) continue;
  const lvl = L[def.id];
  const run = recordInputs(lvl, SOLUTIONS[def.id]);
  const windows = inputWindows(lvl, SOLUTIONS[def.id]);
  const tight = windows.filter((w) => w.ms < floor(def.act));
  const lag = [0, 3, 6, 9, 12, 18].map((t) => (delayed(lvl, SOLUTIONS[def.id], t) ? `${Math.round(t * 1000 / 120)}✓` : `${Math.round(t * 1000 / 120)}✗`));
  const fewest = searchBelowPar(lvl, def.par, 2000);
  console.log(`\n${def.id} · act ${def.act} · par ${def.par} · solution ${(run.inputs.length / 120).toFixed(1)} s`);
  console.log(`  windows (floor ${floor(def.act)} ms): ${windows.map((w) => `${w.kind}@${w.at.toFixed(2)}s ${w.ms}ms${w.ms < floor(def.act) ? ' ✗' : ''}`).join('  ')}`);
  console.log(`  input lag tolerated (ms): ${lag.join(' ')}`);
  console.log(`  random search: ${fewest === Infinity ? 'no win below par' : `won with ${fewest} clock-ins`}${fewest < def.par ? '  ✗ BELOW PAR' : ''}${fewest === 0 ? '  ✗ WON WITHOUT SHIFTING' : ''}`);
  if (tight.length || fewest < def.par) problems++;
}
console.log(problems ? `\n${problems} level(s) need attention` : '\nall levels fair: every input above its floor, no win below par');
process.exit(problems ? 1 : 0);
