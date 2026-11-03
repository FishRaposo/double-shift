// Headless Edge/Chrome over the DevTools protocol, with no dependencies: serves the game (scripts/serve.mjs),
// starts the browser on a throwaway profile and drives its one page. Shared by media.mjs and gif.mjs.
// BROWSER env overrides the browser path.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
export const BROWSERS = [
  process.env.BROWSER,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/opt/pw-browsers/chromium', // cloud sessions (Playwright's Chromium)
].filter(Boolean);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Serve `serveRoot` (default: the repo) on `port`, start the browser with DevTools on `debugPort`, and connect.
// Page exceptions and console errors collect in `errors`. close() stops both processes and deletes the profile.
export async function startBrowser({ port, debugPort, serveRoot = null, profilePrefix = 'ds-cdp-' }) {
  const browserPath = BROWSERS.find((p) => existsSync(p));
  if (!browserPath) throw new Error('No Edge/Chrome found; set BROWSER to its path.');
  const serveArgs = [join(root, 'scripts/serve.mjs'), '--port', String(port), ...(serveRoot ? ['--root', serveRoot] : [])];
  const server = spawn(process.execPath, serveArgs, { stdio: 'ignore' });
  const profile = mkdtempSync(join(tmpdir(), profilePrefix));
  const browser = spawn(browserPath, [
    '--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--autoplay-policy=no-user-gesture-required',
    ...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), // Chromium refuses to sandbox as root (containers)
    'about:blank',
  ], { stdio: 'ignore' });

  let ws;
  let seq = 0;
  const pending = new Map();
  const errors = [];

  async function connect() {
    for (let i = 0; i < 150; i++) { // up to 30 s: a cold Edge start can be slow
      try {
        const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
        const page = targets.find((t) => t.type === 'page');
        if (page) {
          ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
          ws.onmessage = (m) => {
            const msg = JSON.parse(m.data);
            if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
            if (msg.method === 'Runtime.exceptionThrown') { const d = msg.params.exceptionDetails; errors.push(`${d.exception?.description ?? d.text} (${d.url ?? ''}:${d.lineNumber})`); }
            if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(JSON.stringify(msg.params.args.map((a) => a.value)));
          };
          return;
        }
      } catch { /* browser still starting */ }
      await sleep(200);
    }
    throw new Error('could not reach the browser DevTools endpoint');
  }

  function send(method, params = {}) {
    const id = ++seq;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((r, j) => pending.set(id, (msg) => (msg.error ? j(new Error(`${method}: ${msg.error.message}`)) : r(msg.result))));
  }

  async function close() {
    ws?.close();
    browser.kill();
    server.kill();
    await sleep(500);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* the browser may still hold files */ }
  }

  try {
    await connect();
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.bringToFront');
    await send('Emulation.setFocusEmulationEnabled', { enabled: true }); // keep rAF running like a focused tab
  } catch (e) {
    await close();
    throw e;
  }

  return {
    errors,
    send,
    close,
    // An expression's value in the page (promises awaited). A thrown error comes back as a rejection.
    async evaluate(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(`in the page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
      return r.result.value;
    },
    // Load a path from the server in a w × h viewport, then give it a moment to start.
    async open(path, w = 960, h = 540) {
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
      await send('Page.navigate', { url: `http://localhost:${port}/${path}` });
      await sleep(700);
    },
  };
}
