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

const CACHE_VERSION = 18;
const CONTENT_VERSION = 11;
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
  './src/core/engine/pj-session.js',
  './src/core/engine/ps-session.js',
  './src/core/engine/ooo-session.js',
  './src/core/engine/wd-session.js',
  './src/core/engine/garden-session.js',
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
  './src/core/mentor/pj-voice.js',
  './src/core/mentor/pj-dna.js',
  './src/core/mentor/pj-lesson.js',
  './src/core/mentor/ps-voice.js',
  './src/core/mentor/ps-dna.js',
  './src/core/mentor/ps-lesson.js',
  './src/core/mentor/ooo-voice.js',
  './src/core/mentor/ooo-dna.js',
  './src/core/mentor/ooo-lesson.js',
  './src/core/mentor/wd-voice.js',
  './src/core/mentor/wd-dna.js',
  './src/core/mentor/wd-lesson.js',
  './src/core/mentor/garden-voice.js',
  './src/shell/growth.js',
  './src/modules/reading-comprehension/index.js',
  './src/modules/reading-comprehension/logic/store.js',
  './src/modules/reading-comprehension/screens/browser.js',
  './src/modules/reading-comprehension/screens/session.js',
  './src/modules/reading-comprehension/screens/review.js',
  './src/modules/reading-comprehension/screens/mentor.js',
  './src/modules/para-jumbles/index.js',
  './src/modules/para-jumbles/logic/tiers.js',
  './src/modules/para-jumbles/logic/store.js',
  './src/modules/para-jumbles/logic/teach.js',
  './src/modules/para-jumbles/screens/intro.js',
  './src/modules/para-jumbles/screens/browser.js',
  './src/modules/para-jumbles/screens/session.js',
  './src/modules/para-jumbles/screens/learn.js',
  './src/modules/para-summary/index.js',
  './src/modules/para-summary/logic/tiers.js',
  './src/modules/para-summary/logic/store.js',
  './src/modules/para-summary/logic/teach.js',
  './src/modules/para-summary/logic/think.js',
  './src/modules/para-summary/screens/intro.js',
  './src/modules/para-summary/screens/browser.js',
  './src/modules/para-summary/screens/session.js',
  './src/modules/para-summary/screens/learn.js',
  './src/modules/odd-one-out/index.js',
  './src/modules/odd-one-out/logic/tiers.js',
  './src/modules/odd-one-out/logic/store.js',
  './src/modules/odd-one-out/logic/teach.js',
  './src/modules/odd-one-out/logic/think.js',
  './src/modules/odd-one-out/screens/intro.js',
  './src/modules/odd-one-out/screens/browser.js',
  './src/modules/odd-one-out/screens/session.js',
  './src/modules/odd-one-out/screens/learn.js',
  './src/modules/word-dna/index.js',
  './src/modules/word-dna/logic/tree.js',
  './src/modules/word-dna/logic/store.js',
  './src/modules/word-dna/logic/garden.js',
  './src/modules/word-dna/screens/intro.js',
  './src/modules/word-dna/screens/tree.js',
  './src/modules/word-dna/screens/session.js',
  './src/modules/word-dna/screens/learn.js',
  './src/modules/word-dna/screens/garden.js',
  './src/modules/language-garden/index.js',
  './src/modules/language-garden/logic/store.js',
  './src/modules/language-garden/logic/scene.js',
  './src/modules/language-garden/logic/biomes.js',
  './src/modules/language-garden/logic/journal.js',
  './src/modules/language-garden/logic/ambient.js',
  './src/modules/language-garden/logic/audio.js',
  './src/modules/language-garden/logic/effort.js',
  './src/modules/language-garden/screens/overlook.js',
  './src/modules/language-garden/screens/biome.js',
  './src/modules/language-garden/screens/plant.js',
  './src/modules/language-garden/screens/session.js',
  './src/modules/language-garden/screens/journal.js',
  './src/ui/components/cat-nav.js',
  './src/ui/components/cat-plant.js',
  './src/ui/components/cat-jumble-board.js',
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
  './content/schema/pj.schema.v1.json',
  './content/schema/ps.schema.v1.json',
  './content/schema/ooo.schema.v1.json',
  './content/schema/wd.schema.v1.json',
  './content/schema/vocab.schema.v1.json',
  './content/schema/lg.schema.v1.json',
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
  './content/para-jumbles/pj-0001.json',
  './content/para-jumbles/pj-0002.json',
  './content/para-jumbles/pj-0003.json',
  './content/para-jumbles/pj-0004.json',
  './content/para-jumbles/pj-0005.json',
  './content/para-jumbles/pj-0006.json',
  './content/para-jumbles/pj-0007.json',
  './content/para-jumbles/pj-0008.json',
  './content/para-jumbles/pj-0009.json',
  './content/para-jumbles/pj-0010.json',
  './content/para-jumbles/pj-0011.json',
  './content/para-jumbles/pj-0012.json',
  './content/para-jumbles/pj-0013.json',
  './content/para-jumbles/pj-0014.json',
  './content/para-jumbles/pj-0015.json',
  './content/para-jumbles/pj-0016.json',
  './content/para-jumbles/pj-0017.json',
  './content/para-jumbles/pj-0018.json',
  './content/para-jumbles/pj-0019.json',
  './content/para-summary/ps-0001.json',
  './content/para-summary/ps-0002.json',
  './content/para-summary/ps-0003.json',
  './content/para-summary/ps-0004.json',
  './content/para-summary/ps-0005.json',
  './content/para-summary/ps-0006.json',
  './content/para-summary/ps-0007.json',
  './content/para-summary/ps-0008.json',
  './content/para-summary/ps-0009.json',
  './content/para-summary/ps-0010.json',
  './content/para-summary/ps-0011.json',
  './content/para-summary/ps-0012.json',
  './content/para-summary/ps-0013.json',
  './content/para-summary/ps-0014.json',
  './content/para-summary/ps-0015.json',
  './content/para-summary/ps-0016.json',
  './content/para-summary/ps-0017.json',
  './content/para-summary/ps-0018.json',
  './content/para-summary/ps-0019.json',
  './content/para-summary/ps-0020.json',
  './content/odd-one-out/ooo-0001.json',
  './content/odd-one-out/ooo-0002.json',
  './content/odd-one-out/ooo-0003.json',
  './content/odd-one-out/ooo-0004.json',
  './content/odd-one-out/ooo-0005.json',
  './content/odd-one-out/ooo-0006.json',
  './content/odd-one-out/ooo-0007.json',
  './content/odd-one-out/ooo-0008.json',
  './content/odd-one-out/ooo-0009.json',
  './content/odd-one-out/ooo-0010.json',
  './content/odd-one-out/ooo-0011.json',
  './content/odd-one-out/ooo-0012.json',
  './content/odd-one-out/ooo-0013.json',
  './content/odd-one-out/ooo-0014.json',
  './content/odd-one-out/ooo-0015.json',
  './content/odd-one-out/ooo-0016.json',
  './content/odd-one-out/ooo-0017.json',
  './content/odd-one-out/ooo-0018.json',
  './content/odd-one-out/ooo-0019.json',
  './content/odd-one-out/ooo-0020.json',
  './content/word-dna/wd-0001.json',
  './content/word-dna/wd-0002.json',
  './content/word-dna/wd-0003.json',
  './content/word-dna/wd-0004.json',
  './content/word-dna/wd-0005.json',
  './content/word-dna/wd-0006.json',
  './content/word-dna/wd-0007.json',
  './content/word-dna/wd-0008.json',
  './content/word-dna/wd-0009.json',
  './content/word-dna/wd-0010.json',
  './content/word-dna/wd-0011.json',
  './content/word-dna/wd-0012.json',
  './content/vocabulary/vocab-0001.json',
  './content/vocabulary/vocab-0002.json',
  './content/vocabulary/vocab-0003.json',
  './content/vocabulary/vocab-0004.json',
  './content/vocabulary/vocab-0005.json',
  './content/vocabulary/vocab-0006.json',
  './content/vocabulary/vocab-0007.json',
  './content/vocabulary/vocab-0008.json',
  './content/vocabulary/vocab-0009.json',
  './content/vocabulary/vocab-0010.json',
  './content/vocabulary/vocab-0011.json',
  './content/vocabulary/vocab-0012.json',
  './content/vocabulary/vocab-0013.json',
  './content/vocabulary/vocab-0014.json',
  './content/vocabulary/vocab-0015.json',
  './content/vocabulary/vocab-0016.json',
  './content/vocabulary/vocab-0017.json',
  './content/vocabulary/vocab-0018.json',
  './content/vocabulary/vocab-0019.json',
  './content/vocabulary/vocab-0020.json',
  './content/language-garden/lg-0001.json',
  './content/language-garden/lg-0002.json',
  './content/language-garden/lg-0003.json',
  './content/language-garden/lg-0004.json',
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
