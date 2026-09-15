/**
 * app.js — the application bootstrap. The ONLY file that wires layers
 * together: it creates the storage adapter, registers shell routes AND
 * module routes, applies the stored theme, registers the service
 * worker, and installs global error handling. It stays a thin wiring
 * layer (FOLDER_STRUCTURE.md); modules own their screens.
 */

import { IndexedDBAdapter } from './core/storage/indexeddb-adapter.js';
import { Router } from './core/router/router.js';
import { toast } from './ui/components/cat-toast.js';
import { registerRC } from './modules/reading-comprehension/index.js';
import { registerPJ } from './modules/para-jumbles/index.js';
import { registerPS } from './modules/para-summary/index.js';
import { registerOOO } from './modules/odd-one-out/index.js';
import { registerWD } from './modules/word-dna/index.js';
import { registerLanguageGarden } from './modules/language-garden/index.js';
import { registerBank } from './modules/verbal-bank/index.js';
import { startLibrarySync } from './core/content-loader/library-sync.js';
import { registerWorld, isWorldRoute } from './world/index.js';
import { syncStage } from './world/stage.js';
import { silenceWorld } from './world/audio.js';
import { initFeedback, installGlobalFeedback } from './core/engagement/feedback.js';
import { loadTheme, applyTheme, loadReadingSize, applyReadingSize, applyMotion } from './shell/prefs.js';
import './ui/components/cat-nav.js';

/* ------------------------------------------------------------------ */
/* Global error handling — one calm surface, details in the console.  */
/* ------------------------------------------------------------------ */

window.addEventListener('error', (e) => {
  console.error('[CAT OS]', e.error ?? e.message);
  toast('Something went wrong. Details are in the console.', 'error');
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[CAT OS]', e.reason);
  toast('Something went wrong. Details are in the console.', 'error');
});

/* ------------------------------------------------------------------ */
/* Storage + theme                                                    */
/* ------------------------------------------------------------------ */

const APP_VERSION = '2.1.1'; // keep in step with CHANGELOG.md

const storage = new IndexedDBAdapter();

/* ------------------------------------------------------------------ */
/* Shell screens                                                       */
/* ------------------------------------------------------------------ */

/* The Home and Practice screens are gone (1.0.0): the village is both.
   The dashboard helpers that fed them — a per-module "Continue your
   journey" card, Today's Discovery, a garden line — went with them in
   2.1.2. They had been unreachable since Home became a redirect, and
   they were dragging every module's store, tiers and loader, plus the
   engagement stats and the garden's scene, into the boot graph: 66
   modules and 590 KB a learner standing in the village never asked for.
   Release 2.1.1 (commit 9a99828) has them if a dashboard ever returns. */

/**
 * The two routes the world replaced.
 *
 * `#/home` was a dashboard — a greeting, a Continue card, a module list —
 * and `#/practice` was the list of rooms beyond the Gate. Since 1.0.0 the
 * valley is both of those things, and since 1.2.0 the first thing a new
 * learner sees is Wick standing in it. Keeping the old screens alive
 * behind a hash meant two answers to "where am I?", so the screens are
 * gone and the addresses simply come home. Old links, old bookmarks and
 * an installed PWA whose start_url predates the world all still work.
 */
function renderHome() { location.replace('#/world'); }
function renderPractice() { location.replace('#/world'); }



function renderNotFound(outlet) {
  outlet.innerHTML = `
    <section class="screen">
      <div class="empty">
        <div class="empty__glyph" aria-hidden="true">?</div>
        <h2>Screen not found</h2>
        <p>That address doesn't exist. It may be from an older version.</p>
        <a class="btn btn--primary" href="#/world">Back to the village</a>
      </div>
    </section>
  `;
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

async function boot() {
  // 1. Storage first — the theme depends on it. If IndexedDB is
  //    unavailable the app still runs; it just can't persist yet.
  try {
    await storage.init();
    applyTheme(await loadTheme(storage));
    applyReadingSize(await loadReadingSize(storage));
    await initFeedback(storage);
    applyMotion();
  } catch (err) {
    console.error('[CAT OS] storage init failed:', err);
    toast('Local storage is unavailable. Nothing will be saved.', 'error');
  }

  // Audio identity: one place installs press / toggle / paper feedback for
  // every button, and unlocks audio (autoplay policy) + plays the opening
  // chime on the first gesture. Installed unconditionally so it works even
  // if storage init failed (sound simply stays at its OFF default).
  installGlobalFeedback();

  // 2. Router: shell routes + module routes. Modules receive a
  //    context object (today: storage) rather than importing globals,
  //    keeping them testable and island-shaped (Rule 5).
  const outlet = document.getElementById('view');
  const router = new Router(outlet)
    .register({ path: '/home',     title: 'Home',     render: renderHome })
    .register({ path: '/practice', title: 'Practice', render: renderPractice })
    // Both are shell screens one tap away, not the screen a cold open lands
    // on, so they load when they are opened (see the RC module for why).
    .register({ path: '/growth',   title: 'Growth',   render: (o) => import('./shell/growth.js').then((m) => m.renderGrowth(o, { storage })) })
    .register({ path: '/settings', title: 'Settings', render: (o) => import('./shell/settings.js').then((m) => m.renderSettings(o, { storage, version: APP_VERSION })) })
    .registerNotFound({ title: 'Not found', render: renderNotFound });

  registerRC(router, { storage });
  registerPJ(router, { storage });
  registerPS(router, { storage });
  registerOOO(router, { storage });
  registerWD(router, { storage }); // soft-hidden from the nav since 0.14.0; its routes stay live
  registerLanguageGarden(router, { storage });
  registerBank(router, { storage });
  registerWorld(router, { storage });

  // 1.0.0: the world is the application. A cold open lands in the valley;
  // every learning room is a place in it. The old routes stay registered so
  // nothing that linked to them breaks.
  // A learner who has never been welcomed meets Wick first, in a valley
  // that has not been named yet. Every later cold open lands in the valley.
  // 2.0.0: the village is the application, and the first minutes are the
  // village screen itself, staged — so every cold open lands there.
  router.start('/world');

  // Chrome destroys place: inside the world — the valley, a place, a round,
  // a Rootwood session — the app's header and tab bar are hidden and every
  // screen carries its own way back. The learning rooms beyond keep the
  // world's paper and typography (game.css restyles the shared chrome under
  // [data-world]) and show the tab bar again, since they are deeper pages.
  const applyImmersiveChrome = () => {
    const h = location.hash;
    const inWorld = isWorldRoute(h);
    document.documentElement.toggleAttribute('data-world', inWorld);
    document.documentElement.toggleAttribute('data-immersive', inWorld);
    document.documentElement.toggleAttribute('data-room', !inWorld);
    if (!inWorld) silenceWorld();
    // Rooms beyond the valley still stand somewhere: the region's own scene
    // is painted behind them (src/world/stage.js).
    //
    // Immersive chrome and standing somewhere are two different questions.
    // A timed reading run is immersive (isWorldRoute covers #/rc/session/ so
    // the tab bar goes away under the clock) but it is NOT the valley: it is
    // the Reading Room, and it needs data-stage="reading-room" for world.css
    // to lift the passage onto warm glass. Tying the stage to isWorldRoute
    // unmounted it there, which left .run on var(--g-night) while the prose
    // still inherited the light theme's near-black ink — the passage rendered
    // at 1.14:1 contrast. stageFor() already returns null for the valley, the
    // rounds and the Rootwood, and syncStage() unmounts on null, so asking it
    // on every navigation is both correct and sufficient.
    syncStage(storage).catch(() => { /* the room still works */ });
  };
  applyImmersiveChrome();
  window.addEventListener('hashchange', applyImmersiveChrome);

  /* The stage is a painted canvas, so it cannot follow a CSS variable:
     switching to dark has to repaint the valley at night. Both the
     explicit switch (settings.js fires catos:theme) and the system one
     (a learner whose phone goes dark at sunset while the app is open). */
  const restage = () => { syncStage(storage).catch(() => { /* the room still works */ }); };
  window.addEventListener('catos:theme', restage);
  try { globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change', restage); } catch { /* old browser */ }

  // The Rootwood's own session sounds (the key, the leaf taps, growth) keep
  // their location-aware state; the world engine now carries all ambience.
  /* The Rootwood's own audio graph is 35 KB and belongs to one module; a
     learner who never walks in should never pay for it. Both hooks below
     load it on demand and are no-ops until then. */
  let gardenAudioLoaded = false;
  const gardenAudio = () => import('./modules/language-garden/logic/audio.js');
  const syncGardenLocation = () => {
    const h = location.hash;
    const where = h.startsWith('#/garden/session') ? 'session' : h.startsWith('#/garden/') ? 'inner' : null;
    if (where === null && !gardenAudioLoaded) return;   // nothing to silence yet
    gardenAudioLoaded = true;
    gardenAudio().then((m) => m.setGardenLocation(where)).catch(() => { /* the room still works */ });
  };
  window.addEventListener('hashchange', syncGardenLocation);
  syncGardenLocation();

  // (Nav taps are covered by installGlobalFeedback's press delegation.)
  // A separate, minimal unlock for the garden's own audio graph — mirrors
  // installGlobalFeedback's early-gesture unlock for the shell's sound,
  // but stays a module-local concern (Rule 5) rather than teaching core/
  // engagement code about a specific module. Deliberately NOT {once:true}:
  // the first gesture may land before sound is even turned on in Settings,
  // and unlockGardenAudio() is a cheap no-op once the context is running.
  window.addEventListener('pointerdown', () => {
    if (!gardenAudioLoaded) return;                      // never entered the Rootwood
    gardenAudio().then((m) => m.unlockGardenAudio()).catch(() => { /* no sound */ });
  }, { capture: true });

  // 3. Service worker — relative path so it works from a GitHub Pages
  //    subpath. Registration failure is non-fatal (e.g. plain HTTP).
  //
  // This is a hash-routed SPA (core/router/router.js never triggers a
  // full navigation), and a browser only re-checks service-worker.js
  // for changes on registration, i.e. on a real page load. A tab left
  // open across a deploy would otherwise keep its original content
  // cache forever, no matter how many times CONTENT_VERSION bumps —
  // so we check for updates explicitly and reload once a new worker
  // actually takes control (not on the very first install: `hadController`
  // guards that so a fresh visit doesn't get an extra reload).
  // 1.0.0: registration waits for the first screen to paint and settle, so a
  // cold open of the valley is never starved by the precache of ~700 files.
  // The library sync does not depend on registration succeeding: it walks
  // the manifest and lets whatever worker is already controlling the page
  // keep the files. It used to live INSIDE the try below, so a registration
  // that threw — a host that cannot serve the worker, a private window —
  // meant the library was never fetched at all.
  startLibrarySync({ delayMs: 7000 });

  if ('serviceWorker' in navigator) {
    // Long enough for the valley to have painted, short enough that a
    // thirty-second visit still installs something. At 3500 ms a learner who
    // opened the app, looked, and closed it installed nothing at all — and
    // the boot that wait was protecting is now 65 requests, not 153.
    await new Promise((r) => setTimeout(r, 1200));
    try {
      const hadController = !!navigator.serviceWorker.controller;
      let refreshing = false;

      /* A new worker must never reload the tab out from under a running
         clock. The worker calls skipWaiting() on install and claim() on
         activate, so controllerchange can fire at any moment — including
         four minutes into a five-minute passage, from the 30-minute timer
         or from the visibilitychange check that runs every time the learner
         comes back to the tab. That reload ends the run and records nothing.
         So: never update while a run is open, and if a controller change
         lands anyway, hold the reload until the learner leaves the run. */
      /* Three routes out of twenty were protected. A run is not the only
         place a reload costs something: a Learning Page, a review, a lesson,
         a browser half-scrolled and — worst of all — the RESULT screen, which
         is where the stars, the goods and the coins are handed over. The old
         rule reloaded the moment the learner LEFT a run, which is precisely
         the navigation into that result. */
      const busy = () => {
        const h = location.hash;
        return /^#\/[a-z-]+\/session\//.test(h)          // any timed run
          || h.startsWith('#/round/')                      // a vocabulary round
          || h === '#/rc/second-look'
          || /^#\/[a-z-]+\/(learn|mentor|review)\//.test(h) // reading, at length
          || h.startsWith('#/garden/');                    // the Rootwood's six beats
      };
      /* The one safe moment to swap the app under a learner is when they are
         standing in the village with nothing open. Everywhere else the
         reload waits. */
      const idleAtHome = () => location.hash === '#/world' || location.hash === '';
      let pendingReload = false;
      const reloadNow = () => { refreshing = true; window.location.reload(); };
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || refreshing) return;
        if (!idleAtHome()) { pendingReload = true; return; }
        reloadNow();
      });
      window.addEventListener('hashchange', () => {
        if (pendingReload && !refreshing && idleAtHome()) reloadNow();
      });

      const registration = await navigator.serviceWorker.register('./service-worker.js');
      const update = () => {
        if (busy()) return;                  // don't even start an install mid-read
        registration.update().catch(() => { /* offline, or a host that cannot serve the worker */ });
      };
      update();
      setInterval(update, 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') update();
      });
    } catch (err) {
      console.warn('[CAT OS] service worker registration failed:', err);
    }
  }
}

boot();
