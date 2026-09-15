/**
 * library-sync.js — the whole library, offline, without a slow install.
 *
 * The service worker installs in stages (see service-worker.js): the core
 * first, then the rest of the shell and the reference content in the
 * background. The BANKS — every passage, jumble, summary, odd-one-out,
 * placement, completion, word-bank and argument file — are not precached at
 * all, because a couple of thousand files at install is how an offline
 * promise quietly fails.
 *
 * So, after the first screen has painted and the phone is idle, this walks
 * `content/manifest.json` and fetches what the cache does not hold, a few
 * files at a time. The worker's fetch handler keeps each one. It stops when
 * the tab hides, when the connection is metered (Save-Data), or when the
 * browser goes offline, and resumes from wherever it left off on the next
 * idle open: THE CACHE IS THE CHECKPOINT, so nothing is stored here.
 *
 * It also nudges the worker to carry on with its own staged fill, and
 * answers "how much of this is actually on the device?" for Settings.
 *
 * Nothing is shown while it runs. Wick does not announce downloads.
 */

const MANIFEST = 'content/manifest.json';
const BATCH = 6;

let running = false;
let armed = false;
let lastProgress = { done: 0, total: 0 };

/**
 * Start (or resume) the sync. Safe to call more than once.
 *
 * It used to fire ONCE, six seconds after boot, and give up for the rest of
 * the page's life if the conditions were not right at that instant. On any
 * connection where the service worker had not taken control within six
 * seconds — which is every real phone — `allowed()` was false, the sync
 * returned immediately, and the learner's first visit downloaded none of the
 * library. It came back only if they closed the app and opened it again.
 *
 * So it keeps trying: on a timer, when the tab comes back to the front, and
 * when the browser says it is online again. Each pass is cheap when there is
 * nothing to do — one `cache.keys()` and a set difference.
 */
export function startLibrarySync({ delayMs = 6000 } = {}) {
  if (typeof window === 'undefined' || !('caches' in window) || !('fetch' in window)) return;
  const kick = () => {
    if (running) return;
    running = true;
    sync().finally(() => { running = false; });
  };
  const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 200));
  const soon = () => setTimeout(() => idle(kick, { timeout: 15000 }), 400);
  setTimeout(() => idle(kick, { timeout: 15000 }), delayMs);
  if (armed) return;
  armed = true;
  setInterval(kick, 60_000);
  window.addEventListener('online', soon);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') soon(); });
  navigator.serviceWorker?.addEventListener?.('controllerchange', soon);
}

function allowed() {
  if (typeof navigator === 'undefined') return false;
  // Without a controlling service worker nothing fetched would be kept.
  if (!navigator.serviceWorker?.controller) return false;
  if (navigator.onLine === false) return false;
  if (navigator.connection?.saveData) return false;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
  return true;
}

/** Ask the worker to keep filling its own staged precache. */
function nudgeWorker() {
  try { navigator.serviceWorker?.controller?.postMessage({ type: 'catos:sync' }); } catch { /* no worker */ }
}

/**
 * Tell the worker a cached file was not what it claimed to be, so it drops it
 * and the next read goes to the network. The loader calls this when a content
 * file fails to parse: a truncated write or a captive-portal page stored under
 * a passage's URL is exactly the corruption that makes an offline app fail in
 * a way nobody can explain, and it can only be found by reading the file.
 */
export function reportCorrupt(url) {
  try { navigator.serviceWorker?.controller?.postMessage({ type: 'catos:evict', url: new URL(url, location.href).href }); } catch { /* no worker */ }
}

/** How much of the bank library is on this device right now. */
export async function librarySyncProgress() { return lastProgress; }

/**
 * Everything the worker knows about its own install, for Settings.
 * Resolves to null if there is no worker (plain HTTP, private mode, a browser
 * without service workers) — the caller says so rather than guessing.
 */
export function workerStatus({ timeoutMs = 2500 } = {}) {
  return new Promise((resolve) => {
    const sw = navigator.serviceWorker;
    if (!sw?.controller) { resolve(null); return; }
    const done = (v) => { sw.removeEventListener('message', onMsg); clearTimeout(t); resolve(v); };
    const onMsg = (e) => { if (e.data?.type === 'catos:status') done(e.data); };
    const t = setTimeout(() => done(null), timeoutMs);
    sw.addEventListener('message', onMsg);
    try { sw.controller.postMessage({ type: 'catos:status' }); } catch { done(null); }
  });
}

async function sync() {
  if (!allowed()) return;
  nudgeWorker();
  let manifest;
  try {
    const res = await fetch(MANIFEST);
    if (!res.ok) return;
    manifest = await res.json();
  } catch { return; }
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  if (!files.length) return;

  // Which of them are already ours? `cache.keys()` answers for a whole cache
  // in one go; asking `caches.match` four hundred times was four hundred
  // round trips through the worker on every idle open.
  const have = new Set();
  try {
    for (const name of await caches.keys()) {
      if (!name.startsWith('cat-os-content-v')) continue;
      const c = await caches.open(name);
      for (const req of await c.keys()) have.add(new URL(req.url).pathname);
    }
  } catch { /* no cache API: fall through and just fetch */ }
  const base = new URL('.', location.href).pathname;
  const missing = files.filter((path) => !have.has(base + path) && !have.has('/' + path));
  lastProgress = { done: files.length - missing.length, total: files.length };

  for (let i = 0; i < missing.length; i += BATCH) {
    if (!allowed()) return;
    await Promise.all(missing.slice(i, i + BATCH).map((path) => fetch(path).catch(() => null)));
    lastProgress = { done: Math.min(files.length, lastProgress.done + BATCH), total: files.length };
    // Breathe between batches so a drag of the valley never stutters.
    await new Promise((r) => setTimeout(r, 120));
  }
  lastProgress = { done: files.length, total: files.length };
}
