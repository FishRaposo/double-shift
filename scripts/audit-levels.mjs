// Level audit: how fair and how tight is every level? (docs/LEVELS.md §6)
// - timing windows of every required shift and jump in the scripted solution (fairness floor per act)
// - input-delay tolerance: the scripted solution with its inputs arriving 0–150 ms late
// - a random search for wins with fewer clock-ins than par, or with no shifting at all
// Usage: npm run audit [-- level-id]
import { LEVELS } from '../src/levels.js';
import { step, initState, gravitySign } from '../src/rules.js';
import { inputWindows, recordInputs } from '../test/helpers.mjs';
import { SOLUTIONS, L } from '../test/solutions.mjs';

const only = process.argv[2];
const floor = (act) => (act <= 2 ? 200 : 100);

function delayed(lvl, policy, ticks) {
  let s = initState(lvl);
  const mem = {};
  const queue = [];
  let pj = false;
  let ps = false;
  for (let f = 0; f < 120 * 40 && !s.won; f++) {
    queue.push(policy(s, mem, f) || {});
    const w = queue.length > ticks ? queue.shift() : {};
    const input = { left: !!w.left, right: !!w.right, jumpHeld: !!w.jump, jumpPressed: !!w.jump && !pj, shiftPressed: !!w.shift && !ps };
    pj = !!w.jump;
    ps = !!w.shift;
    s = step(lvl, s, input);
    if (s.deaths > 0) return false;
  }
  return s.won;
}

let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
function randomSearch(lvl, par, tries = 2000) {
  let fewest = Infinity;
  for (let i = 0; i < tries; i++) {
    const shifts = Array.from({ length: Math.floor(rnd() * (par + 1)) }, () => rnd() * 30);
    const jumps = Array.from({ length: Math.floor(rnd() * 6) }, () => rnd() * 30);
    const policy = (s) => {
      const x = s.player.x / 30;
      return { right: true, shift: shifts.some((a) => x > a && x < a + 0.35), jump: s.player.grounded ? jumps.some((a) => x > a && x < a + 0.4) : gravitySign(lvl, s.layer) * s.player.vy < 0 }; // hold while rising against gravity
    };
    let s = initState(lvl);
    let pj = false;
    let ps = false;
    for (let f = 0; f < 120 * 20 && !s.won && s.deaths === 0; f++) {
      const w = policy(s);
      s = step(lvl, s, { left: false, right: true, jumpHeld: w.jump, jumpPressed: w.jump && !pj, shiftPressed: w.shift && !ps });
      pj = w.jump;
      ps = w.shift;
    }
    if (s.won && s.deaths === 0) fewest = Math.min(fewest, s.shifts);
  }
  return fewest;
}

let problems = 0;
for (const def of LEVELS) {
  if (only && def.id !== only) continue;
  const lvl = L[def.id];
  const run = recordInputs(lvl, SOLUTIONS[def.id]);
  const windows = inputWindows(lvl, SOLUTIONS[def.id]);
  const tight = windows.filter((w) => w.ms < floor(def.act));
  const lag = [0, 3, 6, 9, 12, 18].map((t) => (delayed(lvl, SOLUTIONS[def.id], t) ? `${Math.round(t * 1000 / 120)}✓` : `${Math.round(t * 1000 / 120)}✗`));
  const fewest = randomSearch(lvl, def.par);
  console.log(`\n${def.id} · act ${def.act} · par ${def.par} · solution ${(run.inputs.length / 120).toFixed(1)} s`);
  console.log(`  windows (floor ${floor(def.act)} ms): ${windows.map((w) => `${w.kind}@${w.at.toFixed(2)}s ${w.ms}ms${w.ms < floor(def.act) ? ' ✗' : ''}`).join('  ')}`);
  console.log(`  input lag tolerated (ms): ${lag.join(' ')}`);
  console.log(`  random search: ${fewest === Infinity ? 'no random win' : `fewest clock-ins found ${fewest}`}${fewest < def.par ? '  ✗ BELOW PAR' : ''}${fewest === 0 ? '  ✗ WON WITHOUT SHIFTING' : ''}`);
  if (tight.length || fewest < def.par) problems++;
}
console.log(problems ? `\n${problems} level(s) need attention` : '\nall levels fair: every input above its floor, no win below par');
process.exit(problems ? 1 : 0);
