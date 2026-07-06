/**
 * service-worker.js — offline caching for CAT OS.
 *
 * Two caches, deliberately separate (decision recorded in STATUS.md):
 *
 * - SHELL cache: the application code. Bump CACHE_VERSION on every
 *   release that changes any precached file; the old shell cache is
 *   deleted on activate.
 * - CONTENT cache: passages, the registry, and schemas. Versioned
 *   independently (CONTENT_VERSION) so shipping new app code never
 *   evicts downloaded content, and new content never forces an app
 *   re-download. At today's library size (32 passages) everything is
 *   precached; when the library grows large, this cache switches to
 *   cache-on-first-use without touching the shell strategy.
 *
 * Strategy is cache-first (TECH_STACK.md): guaranteed offline startup;
 * users get new versions on the second load after a deploy.
 *
 * All paths are RELATIVE so the worker functions from a GitHub Pages
 * subpath. `self.registration.scope` resolves them correctly.
 */

const CACHE_VERSION = 10;
const CONTENT_VERSION = 5;
const SHELL_CACHE = `cat-os-shell-v${CACHE_VERSION}`;
const CONTENT_CACHE = `cat-os-content-v${CONTENT_VERSION}`;
const KEEP = [SHELL_CACHE, CONTENT_CACHE];

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './src/app.js',
  './src/core/router/router.js',
  './src/core/storage/storage-adapter.js',
  './src/core/storage/indexeddb-adapter.js',
  './src/core/storage/backup.js',
  './src/core/engine/session.js',
  './src/core/engine/scoring.js',
  './src/core/content-loader/loader.js',
  './src/core/content-loader/validator.js',
  './src/core/utils/format.js',
  './src/core/engagement/xp.js',
  './src/core/engagement/streaks.js',
  './src/core/engagement/stats.js',
  './src/core/engagement/achievements.js',
  './src/core/engagement/feedback.js',
  './src/core/engagement/audio.js',
  './src/core/engagement/messages.js',
  './src/core/learning/journey.js',
  './src/core/mentor/voice.js',
  './src/core/mentor/dna.js',
  './src/core/mentor/lesson.js',
  './src/core/mentor/records.js',
  './src/shell/growth.js',
  './src/modules/reading-comprehension/index.js',
  './src/modules/reading-comprehension/logic/store.js',
  './src/modules/reading-comprehension/screens/browser.js',
  './src/modules/reading-comprehension/screens/session.js',
  './src/modules/reading-comprehension/screens/review.js',
  './src/modules/reading-comprehension/screens/mentor.js',
  './src/ui/components/cat-nav.js',
  './src/ui/components/cat-toast.js',
  './src/ui/components/cat-passage.js',
  './src/ui/components/cat-option.js',
  './src/ui/components/cat-question-card.js',
  './src/ui/components/cat-explanation.js',
  './src/ui/components/cat-progress-bar.js',
  './src/ui/components/cat-timer.js',
  './src/ui/components/cat-xp-bar.js',
  './src/ui/components/cat-week-strip.js',
  './src/ui/components/cat-celebration.js',
  './src/ui/components/cat-briefing.js',
  './src/ui/components/cat-result-summary.js',
  './src/ui/components/cat-reflection.js',
  './src/ui/styles/tokens.css',
  './src/ui/styles/base.css',
  './src/ui/styles/components.css',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './assets/icons/apple-touch-icon.png',
];

const CONTENT_FILES = [
  './content/index.json',
  './content/schema/rc.schema.v1.json',
  './content/schema/rc.schema.v2.json',
  './content/schema/rc.schema.v3.json',
  './content/schema/rc.schema.v4.json',
  './content/reading-comprehension/rc-0001.json',
  './content/reading-comprehension/rc-0002.json',
  './content/reading-comprehension/rc-0003.json',
  './content/reading-comprehension/rc-0004.json',
  './content/reading-comprehension/rc-0005.json',
  './content/reading-comprehension/rc-0006.json',
  './content/reading-comprehension/rc-0007.json',
  './content/reading-comprehension/rc-0008.json',
  './content/reading-comprehension/rc-0009.json',
  './content/reading-comprehension/rc-0010.json',
  './content/reading-comprehension/rc-0011.json',
  './content/reading-comprehension/rc-0012.json',
  './content/reading-comprehension/rc-0013.json',
  './content/reading-comprehension/rc-0014.json',
  './content/reading-comprehension/rc-0015.json',
  './content/reading-comprehension/rc-0016.json',
  './content/reading-comprehension/rc-0017.json',
  './content/reading-comprehension/rc-0018.json',
  './content/reading-comprehension/rc-0019.json',
  './content/reading-comprehension/rc-0020.json',
  './content/reading-comprehension/rc-0021.json',
  './content/reading-comprehension/rc-0022.json',
  './content/reading-comprehension/rc-0023.json',
  './content/reading-comprehension/rc-0024.json',
  './content/reading-comprehension/rc-0025.json',
  './content/reading-comprehension/rc-0026.json',
  './content/reading-comprehension/rc-0027.json',
  './content/reading-comprehension/rc-0028.json',
  './content/reading-comprehension/rc-0029.json',
  './content/reading-comprehension/rc-0030.json',
  './content/reading-comprehension/rc-0031.json',
  './content/reading-comprehension/rc-0032.json',
];

/* Install: precache shell + content, then take over promptly. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_FILES)),
      caches.open(CONTENT_CACHE).then((c) => c.addAll(CONTENT_FILES)),
    ]).then(() => self.skipWaiting())
  );
});

/* Activate: delete every cache not in KEEP. */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !KEEP.includes(k)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch: cache-first across both caches. Navigations fall back to the
   cached shell so the app opens offline even from a deep link. */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // New content files (future batches) are cached on first use so
        // they stay available offline without a shell release.
        if (response.ok && new URL(request.url).pathname.includes('/content/')) {
          const copy = response.clone();
          caches.open(CONTENT_CACHE).then((c) => c.put(request, copy));
        }
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return Response.error();
      });
    })
  );
});
