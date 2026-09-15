/**
 * cdp-lite.mjs — a ~140-line raw Chrome DevTools Protocol client and a tiny
 * static server, with no dependencies at all.
 *
 * This repo has no package.json and no Playwright on purpose (PROJECT_RULES:
 * no build step), but the defects that matter most are the ones only a real
 * browser can see. `tools/check-rendered-contrast.mjs` and any future
 * runtime gate drive Chrome through this.
 *
 * Node 24 has a global WebSocket, so speaking CDP needs nothing installed.
 */

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

/** The Chrome this machine has, or null. A gate that cannot run says so. */
export function findChrome() {
  for (const p of CHROME_CANDIDATES) if (existsSync(p)) return p;
  return null;
}

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

/** Serve the repo over http on an ephemeral port. Returns {url, close}. */
export async function serveRepo(root = REPO_ROOT) {
  const ROOT = resolve(root);
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let p = decodeURIComponent(url.pathname);
      if (p === '/') p = '/index.html';
      const full = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
      if (!full.startsWith(ROOT)) { res.writeHead(403).end('no'); return; }
      const st = await stat(full).catch(() => null);
      if (!st?.isFile()) { res.writeHead(404).end('not found'); return; }
      const body = await readFile(full);
      res.writeHead(200, { 'content-type': TYPES[extname(full).toLowerCase()] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(body);
    } catch { res.writeHead(500).end('error'); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}/`, close: () => server.close() };
}

/**
 * Launch headless Chrome and return a small page API.
 * @param {{width?:number,height?:number,dpr?:number,port?:number}} opts
 */
export async function launchChrome({ width = 390, height = 844, dpr = 1, port = 0 } = {}) {
  const chrome = findChrome();
  if (!chrome) throw new Error('no Chrome found (set CHROME_PATH)');
  const profile = mkdtempSync(join(tmpdir(), 'catos-gate-'));
  const debugPort = port || 9000 + Math.floor(Math.random() * 900);
  const proc = spawn(chrome, [
    '--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--force-device-scale-factor=1', `--window-size=${width},${height}`, 'about:blank',
  ], { stdio: 'ignore' });

  let info = null;
  for (let i = 0; i < 120; i += 1) {
    try { const r = await fetch(`http://127.0.0.1:${debugPort}/json/version`); if (r.ok) { info = await r.json(); break; } } catch { /* not up */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!info) { try { proc.kill(); } catch { /* gone */ } throw new Error('Chrome did not expose its debugging port'); }

  const list = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const target = list.find((t) => t.type === 'page');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id === undefined) return;
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.error) p.rej(new Error(JSON.stringify(msg.error))); else p.res(msg.result);
  };
  const send = (method, params = {}, timeout = 60000) => new Promise((res, rej) => {
    const myId = (id += 1);
    pending.set(myId, { res, rej });
    ws.send(JSON.stringify({ id: myId, method, params }));
    setTimeout(() => { if (pending.has(myId)) { pending.delete(myId); rej(new Error(`timeout ${method}`)); } }, timeout);
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  /* Measure the files on disk, not the last install's cache. A worker that
     precaches every stylesheet will happily serve yesterday's colours to a
     gate checking today's, and the gate will report a fix that landed as a
     fix that did not. */
  await send('Network.setBypassServiceWorker', { bypass: true });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: width < 700 });

  return {
    send,
    async evaluate(expression) {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    /**
     * A hash-only change is a SAME-document navigation: always reload.
     * `ignoreCache` on purpose — a gate that measures the browser's memory
     * cache is a gate that keeps reporting a defect you have already fixed,
     * which is worse than no gate at all.
     */
    async open(url, wait = 3500) {
      await send('Page.navigate', { url });
      await new Promise((r) => setTimeout(r, 150));
      await send('Page.reload', { ignoreCache: true });
      await new Promise((r) => setTimeout(r, wait));
    },
    /* A screenshot of a full-bleed canvas on a busy machine can miss a
       frame deadline and never answer. Two more tries beats losing a
       twenty-minute sweep to one slow capture. */
    async shot() {
      let last;
      for (let i = 0; i < 3; i += 1) {
        try { return (await send('Page.captureScreenshot', { format: 'png' }, 25000)).data; } catch (err) {
          last = err;
          await new Promise((r) => setTimeout(r, 600));
        }
      }
      throw last;
    },
    close() {
      try { ws.close(); } catch { /* closed */ }
      try { proc.kill(); } catch { /* gone */ }
      try { rmSync(profile, { recursive: true, force: true }); } catch { /* locked */ }
    },
  };
}
