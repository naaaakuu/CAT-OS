/**
 * app.js — the application bootstrap. The ONLY file that wires layers
 * together: it creates the storage adapter, registers shell routes AND
 * module routes, applies the stored theme, registers the service
 * worker, and installs global error handling. It stays a thin wiring
 * layer (FOLDER_STRUCTURE.md); modules own their screens.
 */

import { IndexedDBAdapter } from './core/storage/indexeddb-adapter.js';
import { STORES } from './core/storage/storage-adapter.js';
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
import { resetPJIntro, latestByItem as latestPJByItem } from './modules/para-jumbles/logic/store.js';
import { resetPSIntro, latestByItem as latestPSByItem } from './modules/para-summary/logic/store.js';
import { resetOOOIntro, latestByItem as latestOOOByItem } from './modules/odd-one-out/logic/store.js';
import { resetWDIntro } from './modules/word-dna/logic/store.js';
import { recommendNextPJ } from './modules/para-jumbles/logic/tiers.js';
import { recommendNextPS } from './modules/para-summary/logic/tiers.js';
import { recommendNextOOO } from './modules/odd-one-out/logic/tiers.js';
import { listGardenSessions, listGardenSeeds } from './modules/language-garden/logic/store.js';
import { deriveValleyScene } from './modules/language-garden/logic/scene.js';
import { unlockGardenAudio, setGardenLocation } from './modules/language-garden/logic/audio.js';
import { EMPTY_DAY_LINES, pick as pickGardenLine } from './core/mentor/garden-voice.js';
import { listRCItems, listPJItems, listPSItems, listOOOItems, listWDItems, loadWDItem, listLGItems, loadLGItems } from './core/content-loader/loader.js';
import { deriveEngagement } from './core/engagement/stats.js';
import { evaluate } from './core/engagement/achievements.js';
import { dashboardLine } from './core/engagement/messages.js';
import { initFeedback, installGlobalFeedback } from './core/engagement/feedback.js';
import { renderSettings, loadTheme, applyTheme, loadReadingSize, applyReadingSize, applyMotion } from './shell/settings.js';
import { formatDuration } from './core/utils/format.js';
import { recommendNext } from './core/learning/journey.js';
import { renderGrowth } from './shell/growth.js';
import './ui/components/cat-xp-bar.js';
import './ui/components/cat-week-strip.js';
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

const APP_VERSION = '2.1.0'; // keep in step with CHANGELOG.md

const storage = new IndexedDBAdapter();

/* ------------------------------------------------------------------ */
/* Shell screens                                                       */
/* ------------------------------------------------------------------ */

/* Home's "Continue" card follows whichever journey the learner is
   actually in, not just Reading Comprehension: it reads the most
   recent session's module and asks that module's OWN recommender
   (the same one its browser page already uses), so the app's most
   prominent CTA never contradicts what the learner was just doing.
   RC sessions carry no `module` field, so an absent/unrecognized
   value returns null and renderHome falls through to the original
   RC-only card below — no change for RC-only learners. */
/* Word DNA soft-hidden here (0.14.0): the Language Garden is the
   vocabulary surface now (owner decision — keep WD's routes, code and
   data fully intact, just stop advertising it from Home/Practice).
   Re-adding a `wd:` entry (see git history) is the one-line revert. */
const CONTINUE_INFO = {
  pj: { noun: 'Para Jumbles journey', verb: 'Solve it now', prefix: '/pj',
    list: listPJItems, latest: latestPJByItem, recommend: recommendNextPJ },
  ps: { noun: 'Para Summary journey', verb: 'Try it now', prefix: '/ps',
    list: listPSItems, latest: latestPSByItem, recommend: recommendNextPS },
  ooo: { noun: 'Odd One Out journey', verb: 'Try it now', prefix: '/ooo',
    list: listOOOItems, latest: latestOOOByItem, recommend: recommendNextOOO },
};

async function recommendContinue(sessions) {
  const lastModule = [...sessions].sort((a, b) => b.finished_at.localeCompare(a.finished_at))[0]?.module;
  const info = CONTINUE_INFO[lastModule];
  if (!info) return null;
  try {
    const [items, latest] = await Promise.all([info.list(), info.latest(storage)]);
    const solvedIds = new Set([...latest.entries()].filter(([, a]) => a.is_correct === true).map(([id]) => id));
    const triedIds = new Set([...latest.entries()].filter(([, a]) => a.is_correct !== null).map(([id]) => id));
    const next = info.recommend(items, solvedIds, triedIds);
    return next ? { info, next } : null;
  } catch {
    return null; // offline/uncached: Home falls back to the RC card
  }
}

/* Today's Discovery: one word, chosen deterministically from today's
   date (never random, so it stays the same across every open today,
   and never server-driven, since the app is offline-first). Only
   foreign/cat_vocab units qualify — these are words met, not roots to
   practice — and it is a companion habit, surfaced below Continue,
   never a replacement for the learner's primary journey
   (WORD_DNA_BIBLE §9). */
async function todaysDiscovery() {
  try {
    const items = (await listWDItems()).filter((i) => i.kind === 'foreign' || i.kind === 'cat_vocab');
    if (items.length === 0) return null;
    const dayNum = Number(new Date().toISOString().slice(0, 10).replaceAll('-', ''));
    const chosen = items[dayNum % items.length];
    const full = await loadWDItem(chosen.id);
    const taught = full.members.filter((m) => !m.held_out);
    if (taught.length === 0) return null;
    return { unitId: chosen.id, word: taught[dayNum % taught.length] };
  } catch {
    return null; // offline/uncached: Home simply omits the widget
  }
}
// Soft-hidden (0.14.0, owner decision): todaysDiscovery() above is kept
// fully intact and correct, but Home no longer calls it or renders its
// card — the Language Garden is the vocabulary surface now. Wiring it
// back in is calling it once more and re-adding its card to the template.

/* One calm, quiet line about the garden — never a score, never a list
   (LANGUAGE_GARDEN_BIBLE §6.5). Distinct on purpose from the achievement-
   flavoured "Continue your X journey" cards above: the garden earns its
   own register even on Home. */
async function gardenHomeCard() {
  try {
    const registry = await listLGItems();
    if (registry.length === 0) return '';
    const loaded = await loadLGItems(registry.map((i) => i.id));
    const families = registry.map((i) => loaded.get(i.id)).filter(Boolean);
    const sessions = await listGardenSessions(storage);
    const gateSeeds = await listGardenSeeds(storage);
    const scene = deriveValleyScene(families, sessions, Date.now(), gateSeeds);
    const seed = `home-garden:${new Date().toDateString()}`;

    let line;
    if (scene.askingId) {
      const asking = families.find((f) => f.meta.id === scene.askingId);
      line = EMPTY_DAY_LINES.onePlantAsking(asking.root.label, seed);
    } else if (sessions.length === 0) {
      line = 'Your first plant is waiting.';
    } else if (scene.openSeedId) {
      line = pickGardenLine(seed, EMPTY_DAY_LINES.oneSeedReady);
    } else {
      line = pickGardenLine(seed, EMPTY_DAY_LINES.standAndClose);
    }

    return `
      <div class="card">
        <h2>Your garden</h2>
        <p class="muted" style="margin-bottom: var(--space-3)">${line}</p>
        <a class="btn btn--primary btn--block" href="#/world">Enter the valley</a>
      </div>`;
  } catch {
    return ''; // offline/uncached: Home simply omits the widget
  }
}

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
    .register({ path: '/growth',   title: 'Growth',   render: (o) => renderGrowth(o, { storage }) })
    .register({ path: '/settings', title: 'Settings', render: (o) => renderSettings(o, { storage, version: APP_VERSION }) })
    .registerNotFound({ title: 'Not found', render: renderNotFound });

  registerRC(router, { storage });
  registerPJ(router, { storage });
  registerPS(router, { storage });
  registerOOO(router, { storage });
  registerWD(router, { storage }); // soft-hidden from nav (see CONTINUE_INFO); routes stay live
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

  // The Rootwood's own session sounds (the key, the leaf taps, growth) keep
  // their location-aware state; the world engine now carries all ambience.
  const syncGardenLocation = () => {
    const h = location.hash;
    setGardenLocation(h.startsWith('#/garden/session') ? 'session' : h.startsWith('#/garden/') ? 'inner' : null);
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
  window.addEventListener('pointerdown', unlockGardenAudio, { capture: true });

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
  if ('serviceWorker' in navigator) {
    await new Promise((r) => setTimeout(r, 3500));
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
      const inRun = () => {
        const h = location.hash;
        return /^#\/[a-z-]+\/session\//.test(h) || h.startsWith('#/round/') || h === '#/rc/second-look';
      };
      let pendingReload = false;
      const reloadNow = () => { refreshing = true; window.location.reload(); };
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || refreshing) return;
        if (inRun()) { pendingReload = true; return; }
        reloadNow();
      });
      window.addEventListener('hashchange', () => {
        if (pendingReload && !refreshing && !inRun()) reloadNow();
      });

      const registration = await navigator.serviceWorker.register('./service-worker.js');
      const update = () => {
        if (inRun()) return;                 // don't even start an install mid-run
        registration.update().catch(() => { /* offline, or a host that cannot serve the worker */ });
      };
      update();
      // The rest of the library — every passage, jumble, summary and bank
      // file the content engine ships — arrives in the background, a few
      // files at a time, once the valley is painted and the phone is idle.
      // The service worker's fetch handler keeps each one for offline use.
      startLibrarySync({ delayMs: 9000 });
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
