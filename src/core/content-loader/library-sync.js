/**
 * library-sync.js — the whole library, offline, without a slow install.
 *
 * The service worker precaches the shell, the registry, the schemas and
 * the reference bundles at install, and caches any other content file
 * the first time it is fetched. That keeps a cold install fast, but it
 * would leave a learner who opened the app once and then went offline
 * with only the passages they had already read.
 *
 * So, after the first screen has painted and the phone is idle, this
 * walks `content/manifest.json` — every bank file the content engine
 * ships, written by tools/build-manifest.mjs — and fetches the ones the
 * cache does not hold yet, a few at a time. The service worker's fetch
 * handler stores each one. It stops when the tab hides, when the
 * connection is metered (Save-Data), or when the browser goes offline,
 * and resumes from wherever it left off on the next idle open: the cache
 * itself is the checkpoint, so nothing is stored here.
 *
 * Nothing is shown. Wick does not announce downloads.
 */

const MANIFEST = 'content/manifest.json';
const BATCH = 4;

let running = false;

/** Start (or resume) the sync. Safe to call more than once. */
export function startLibrarySync({ delayMs = 6000 } = {}) {
  if (running || typeof window === 'undefined' || !('caches' in window) || !('fetch' in window)) return;
  running = true;
  const kick = () => sync().finally(() => { running = false; });
  const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 200));
  setTimeout(() => idle(kick, { timeout: 15000 }), delayMs);
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

async function sync() {
  if (!allowed()) return;
  let manifest;
  try {
    const res = await fetch(MANIFEST);
    if (!res.ok) return;
    manifest = await res.json();
  } catch { return; }
  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  // Which of them are already ours? One cache lookup each; cheap.
  const missing = [];
  for (const path of files) {
    try {
      const hit = await caches.match(new Request(path));
      if (!hit) missing.push(path);
    } catch { missing.push(path); }
  }
  for (let i = 0; i < missing.length; i += BATCH) {
    if (!allowed()) return;
    await Promise.all(missing.slice(i, i + BATCH).map((path) => fetch(path).catch(() => null)));
    // Breathe between batches so a drag of the valley never stutters.
    await new Promise((r) => setTimeout(r, 120));
  }
}
