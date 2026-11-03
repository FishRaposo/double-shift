// Doc counts: every number in the docs that tracks the code is wrapped in a marker, and this script checks
// (or rewrites) them against the code, so the docs can't drift (docs/INDEX.md: every number matches the code).
//
//   <!-- n:tests -->142<!-- /n -->            tests in `npm test` (runs the suite, ~10 s)
//   <!-- n:levels -->12<!-- /n -->            levels in LEVELS
//   <!-- n:lines:src/rules.js -->523<!-- /n -->   lines in a source file (as `wc -l` counts them)
//
// Usage: npm run counts            check: exits 1 listing every marker that doesn't match
//        npm run counts -- --write  rewrite every marker to the current value
// Dated history sentences ("written against the build at 12 levels") are left unmarked on purpose.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
const MARKER = /<!-- n:([\w:./-]+) -->(.*?)<!-- \/n -->/g;

const docs = [
  'README.md', 'CLAUDE.md', 'AGENTS.md', 'itch/page.md',
  ...readdirSync(join(root, 'docs')).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`),
];

function countTests() {
  const files = readdirSync(join(root, 'test')).filter((f) => f.endsWith('.test.mjs')).map((f) => `test/${f}`);
  let out;
  try {
    out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', ...files], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    console.error('counts: the test suite fails; fix it before syncing the counts');
    process.exit(1);
  }
  const m = out.match(/^# tests (\d+)$/m);
  if (!m) { console.error('counts: no "# tests N" line in the TAP output'); process.exit(1); }
  return Number(m[1]);
}

const lines = (file) => (readFileSync(join(root, file), 'utf8').match(/\n/g) ?? []).length;

const values = {};
async function value(key) {
  if (key in values) return values[key];
  if (key === 'tests') values[key] = countTests();
  else if (key === 'levels') values[key] = (await import('../src/levels.js')).LEVELS.length;
  else if (key.startsWith('lines:')) values[key] = lines(key.slice('lines:'.length));
  else throw new Error(`unknown count key "${key}"`);
  return values[key];
}

const problems = [];
let markers = 0;
for (const file of docs) {
  const text = readFileSync(join(root, file), 'utf8');
  const found = [...text.matchAll(MARKER)];
  if (found.length === 0) continue;
  let next = text;
  for (const m of found) {
    if (text[m.index - 1] === '`') continue; // an example of the syntax in inline code, not a marker
    markers++;
    const [whole, key, shown] = m;
    const want = String(await value(key));
    if (shown === want) continue;
    const line = text.slice(0, m.index).split('\n').length;
    problems.push(`${file}:${line} ${key} expected ${want} found ${shown}`);
    next = next.replace(whole, `<!-- n:${key} -->${want}<!-- /n -->`);
  }
  if (write && next !== text) writeFileSync(join(root, file), next);
}

if (write) {
  console.log(problems.length ? `counts: rewrote ${problems.length} of ${markers} markers:\n  ${problems.join('\n  ')}` : `counts: all ${markers} markers already match`);
} else if (problems.length) {
  console.error(`counts: ${problems.length} of ${markers} markers don't match the code (npm run counts -- --write):\n  ${problems.join('\n  ')}`);
  process.exit(1);
} else {
  console.log(`ok: all ${markers} doc counts match the code`);
}
