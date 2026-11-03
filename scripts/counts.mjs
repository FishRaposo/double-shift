// Doc counts: every number in the docs that tracks the code is wrapped in a marker, and this script checks
// (or rewrites) them against the code, so the docs can't drift (docs/INDEX.md: every number matches the code).
//
//   <!-- n:tests -->142<!-- /n -->            tests in `npm test` (runs the suite, ~10 s)
//   <!-- n:levels -->12<!-- /n -->            levels in LEVELS
//   <!-- n:lines:src/rules.js -->523<!-- /n -->   lines in a source file (as `wc -l` counts them)
//
// Usage: npm run counts            check: exits 1 listing every marker that doesn't match
//        npm run counts -- --write  rewrite every marker to the current value
// Dated history sentences ("written against the build at 12 levels") are left unmarked on purpose, and a marker
// written in inline code (`<!-- n:… -->`) is an example of the syntax, not a marker.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The value can't contain '<', so a lone example opener never swallows a real marker later on the line.
export const MARKER = /<!-- n:([\w:./-]+) -->([^<]*)<!-- \/n -->/g;

// Pure: check every marker in `text` against valueOf(key) (undefined = unknown key) and rewrite the stale ones
// in place (by position, so an identical example elsewhere is never touched).
export function syncMarkers(text, valueOf) {
  let out = '';
  let last = 0;
  let markers = 0;
  const problems = [];
  for (const m of text.matchAll(MARKER)) {
    if (text[m.index - 1] === '`') continue;
    markers++;
    const [whole, key, shown] = m;
    const line = text.slice(0, m.index).split('\n').length;
    const v = valueOf(key);
    if (v === undefined) { problems.push({ line, key, expected: '(unknown key)', found: shown }); continue; }
    const want = String(v);
    if (shown === want) continue;
    problems.push({ line, key, expected: want, found: shown });
    out += `${text.slice(last, m.index)}<!-- n:${key} -->${want}<!-- /n -->`;
    last = m.index + whole.length;
  }
  return { text: out + text.slice(last), markers, problems };
}

// ---------- CLI ----------

const root = resolve(import.meta.dirname, '..');

function countTests() {
  const files = readdirSync(join(root, 'test')).filter((f) => f.endsWith('.test.mjs')).map((f) => `test/${f}`);
  try {
    const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', ...files], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const m = out.match(/^# tests (\d+)$/m);
    if (!m) throw new Error('no "# tests N" line in the TAP output');
    return Number(m[1]);
  } catch (e) {
    const failures = String(e.stdout ?? '').split('\n').filter((l) => /^\s*not ok|^# (pass|fail)/.test(l));
    console.error(`counts: the test suite fails; fix it before syncing the counts\n  ${failures.join('\n  ') || e.message}`);
    process.exit(1);
  }
}

async function main() {
  const write = process.argv.includes('--write');
  const { LEVELS } = await import('../src/levels.js');
  const cache = {};
  const valueOf = (key) => {
    if (key in cache) return cache[key];
    if (key === 'tests') cache[key] = countTests();
    else if (key === 'levels') cache[key] = LEVELS.length;
    else if (key.startsWith('lines:')) {
      try { cache[key] = (readFileSync(join(root, key.slice(6)), 'utf8').match(/\n/g) ?? []).length; } catch { cache[key] = undefined; }
    } else cache[key] = undefined;
    return cache[key];
  };
  const docs = [
    'README.md', 'CLAUDE.md', 'AGENTS.md', 'itch/page.md',
    ...readdirSync(join(root, 'docs')).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`),
  ];
  const problems = [];
  let markers = 0;
  for (const file of docs) {
    const text = readFileSync(join(root, file), 'utf8');
    const r = syncMarkers(text, valueOf);
    markers += r.markers;
    for (const p of r.problems) problems.push(`${file}:${p.line} ${p.key} expected ${p.expected} found ${p.found}`);
    if (write && r.text !== text) writeFileSync(join(root, file), r.text);
  }
  const unknown = problems.filter((p) => p.includes('(unknown key)'));
  if (write) {
    console.log(problems.length ? `counts: rewrote ${problems.length - unknown.length} of ${markers} markers:\n  ${problems.join('\n  ')}` : `counts: all ${markers} markers already match`);
    if (unknown.length) process.exit(1);
  } else if (problems.length) {
    console.error(`counts: ${problems.length} of ${markers} markers don't match the code (npm run counts -- --write):\n  ${problems.join('\n  ')}`);
    process.exit(1);
  } else {
    console.log(`ok: all ${markers} doc counts match the code`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
