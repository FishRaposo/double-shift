// Syntax-check every module by importing it (browser-only main.js is checked with node --check).
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for (const f of readdirSync('src')) {
  if (!f.endsWith('.js')) continue;
  execFileSync(process.execPath, ['--check', `src/${f}`], { stdio: 'inherit' });
}
await import('../src/rules.js');
const { LEVELS } = await import('../src/levels.js');
const { parseLevel } = await import('../src/rules.js');
LEVELS.forEach(parseLevel);
console.log(`ok: modules parse, ${LEVELS.length} levels valid`);
