// Local playtest server: serves the repo root with no caching, no dependencies.
// Usage: node scripts/serve.mjs [--open] [--port N] [--root DIR]   (PORT env also works; default 8080, next
// free port if busy; 0 takes any free port; --root serves another folder, e.g. the unzipped itch build).
// It announces the port it got ("running at http://localhost:N/"): scripts/cdp.mjs reads that.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { execFile } from 'node:child_process';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
if (rootArg >= 0 && (args[rootArg + 1] === undefined || args[rootArg + 1].startsWith('--'))) {
  console.error('--root needs a folder: node scripts/serve.mjs --root <dir>');
  process.exit(2);
}
const root = rootArg >= 0 ? resolve(args[rootArg + 1]) : resolve(import.meta.dirname, '..');
const portArg = args.indexOf('--port');
const portText = portArg >= 0 ? args[portArg + 1] : process.env.PORT;
const firstPort = /^\d+$/.test(portText ?? '') ? Number(portText) : 8080;
const open = args.includes('--open');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = createServer(async (req, res) => {
  let path;
  try {
    path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  const file = normalize(join(root, path.endsWith('/') ? path + 'index.html' : path));
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});

function listen(port, triesLeft) {
  server.once('error', (e) => {
    // drop the failed attempt's 'listening' callback so only the real port is announced
    if (e.code === 'EADDRINUSE' && triesLeft > 0) { server.removeAllListeners('listening'); listen(port + 1, triesLeft - 1); }
    else { console.error(e.message); process.exit(1); }
  });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${server.address().port}/`;
    console.log(`Double Shift is running at ${url}`);
    console.log(`  a level:  ${url}?level=offset&autostart   (an id, or a 1-based position like ?level=3)`);
    console.log(`  debug:    ${url}?debug   (toggle overlay with \`)`);
    console.log('Edit files and reload the page; nothing is cached. Ctrl+C to stop.');
    if (open) openBrowser(url);
  });
}

function openBrowser(url) {
  if (process.platform === 'win32') execFile('cmd', ['/c', 'start', '', url]);
  else execFile(process.platform === 'darwin' ? 'open' : 'xdg-open', [url]);
}

listen(firstPort, 10);
