/**
 * app.js — the application bootstrap. The ONLY file that wires layers
 * together: it creates the storage adapter, registers shell routes AND
 * module routes, applies the stored theme, registers the service
 * worker, and installs global error handling. It stays a thin wiring
 * layer (FOLDER_STRUCTURE.md); modules own their screens.
 */

import { IndexedDBAdapter } from './core/storage/indexeddb-adapter.js';
import { STORES } from './core/storage/storage-adapter.js';
import { downloadBackup, importAll } from './core/storage/backup.js';
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
import { loadValley } from './world/companion.js';
import { syncStage, unmountStage } from './world/stage.js';
import { silenceWorld, musicEnabled, setMusicEnabled } from './world/audio.js';
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
import { initFeedback, feedbackPrefs, setFeedbackPref, cue, installGlobalFeedback } from './core/engagement/feedback.js';
import { playSound, stopFocusNoise, startFocusNoise } from './core/engagement/audio.js';
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

const APP_VERSION = '1.1.4'; // keep in step with CHANGELOG.md

const storage = new IndexedDBAdapter();

const THEMES = ['system', 'light', 'dark'];

/* Browser-chrome colors matching tokens.css --color-bg; a forced
   in-app theme must recolor the iOS status bar too, not just the page. */
const THEME_BG = { light: '#F7F6F3', dark: '#151618' };

async function loadTheme() {
  const record = await storage.get(STORES.SETTINGS, 'theme');
  return THEMES.includes(record?.value) ? record.value : 'system';
}

function applyTheme(theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const scheme = meta.getAttribute('media')?.includes('dark') ? 'dark' : 'light';
    meta.setAttribute('content', THEME_BG[theme === 'system' ? scheme : theme]);
  }
}

async function saveTheme(theme) {
  await storage.put(STORES.SETTINGS, { id: 'theme', value: theme });
  applyTheme(theme);
}

/* Reading size: the one Kindle-style comfort control. Scales only the
   reading surface (see tokens.css) — the UI around it stays put. */
const READING_SIZES = ['s', 'm', 'l', 'xl'];

async function loadReadingSize() {
  const record = await storage.get(STORES.SETTINGS, 'reading-size');
  return READING_SIZES.includes(record?.value) ? record.value : 'm';
}

function applyReadingSize(size) {
  if (size === 'm') document.documentElement.removeAttribute('data-reading');
  else document.documentElement.setAttribute('data-reading', size);
}

async function saveReadingSize(size) {
  await storage.put(STORES.SETTINGS, { id: 'reading-size', value: size });
  applyReadingSize(size);
}

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



function renderSettings(outlet) {
  outlet.innerHTML = `
    <section class="screen">
      <p class="screen__eyebrow">Settings</p>
      <h1>Settings</h1>

      <div class="card">
        <h2>Appearance</h2>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">◐</span>
            <div>
              <div class="row__label">Theme</div>
              <div class="row__hint">System follows your device</div>
            </div>
          </div>
          <div class="segmented" id="theme-picker" role="group" aria-label="Theme">
            ${THEMES.map((t) => `
              <button class="segmented__option" data-theme-option="${t}" aria-pressed="false">
                ${t[0].toUpperCase() + t.slice(1)}
              </button>`).join('')}
          </div>
        </div>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">Aa</span>
            <div>
              <div class="row__label">Reading size</div>
              <div class="row__hint">Scales passages and Learning Pages only</div>
            </div>
          </div>
          <div class="segmented" id="reading-picker" role="group" aria-label="Reading size">
            ${READING_SIZES.map((s) => `
              <button class="segmented__option" data-reading-option="${s}" aria-pressed="false">
                ${s.toUpperCase()}
              </button>`).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Feedback</h2>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">◇</span>
            <div>
              <div class="row__label">Haptics</div>
              <div class="row__hint">Subtle vibration where your device supports it</div>
            </div>
          </div>
          <div class="segmented" id="haptics-picker" role="group" aria-label="Haptics" data-sfx="off">
            <button class="segmented__option" data-haptics="true" aria-pressed="false">On</button>
            <button class="segmented__option" data-haptics="false" aria-pressed="false">Off</button>
          </div>
        </div>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">♩</span>
            <div>
              <div class="row__label">Sounds</div>
              <div class="row__hint">Tiny cues for answers and milestones — off by default</div>
            </div>
          </div>
          <div class="segmented" id="sounds-picker" role="group" aria-label="Sounds" data-sfx="off">
            <button class="segmented__option" data-sounds="true" aria-pressed="false">On</button>
            <button class="segmented__option" data-sounds="false" aria-pressed="false">Off</button>
          </div>
        </div>
        <div class="row" id="volume-row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">◑</span>
            <div>
              <div class="row__label">Sound volume</div>
              <div class="row__hint">Master level for every sound</div>
            </div>
          </div>
          <input class="range" id="volume-slider" type="range" min="0" max="100" step="1"
                 value="70" aria-label="Sound volume" data-sfx="off" />
        </div>
      </div>

      <div class="card">
        <h2>Focus Sound</h2>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">◎</span>
            <div>
              <div class="row__label">Brown noise</div>
              <div class="row__hint">A warm ambient tone for reading sessions — off by default</div>
            </div>
          </div>
          <div class="segmented" id="focus-noise-picker" role="group" aria-label="Focus noise" data-sfx="off">
            <button class="segmented__option" data-focus-noise="true" aria-pressed="false">On</button>
            <button class="segmented__option" data-focus-noise="false" aria-pressed="false">Off</button>
          </div>
        </div>
        <div class="row" id="focus-volume-row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">◑</span>
            <div>
              <div class="row__label">Focus volume</div>
              <div class="row__hint">Level for the ambient noise</div>
            </div>
          </div>
          <input class="range" id="focus-volume-slider" type="range" min="0" max="100" step="1"
                 value="35" aria-label="Focus volume" data-sfx="off" />
        </div>
      </div>

      <div class="card">
        <h2>The world</h2>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">♫</span>
            <div>
              <div class="row__label">Music and ambience</div>
              <div class="row__hint">The valley's own music, wind, water and birds — needs Sounds on</div>
            </div>
          </div>
          <div class="segmented" id="garden-ambience-picker" role="group" aria-label="World music" data-sfx="off">
            <button class="segmented__option" data-garden-ambience="true" aria-pressed="false">On</button>
            <button class="segmented__option" data-garden-ambience="false" aria-pressed="false">Off</button>
          </div>
        </div>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">⌂</span>
            <div>
              <div class="row__label">Back to the valley</div>
              <div class="row__hint">The world is the home screen</div>
            </div>
          </div>
          <a class="btn" href="#/world">Open</a>
        </div>
      </div>

      <div class="card">
        <h2>Learning</h2>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">⇅</span>
            <div>
              <div class="row__label">Para Jumbles introduction</div>
              <div class="row__hint">Show the first-time introduction again</div>
            </div>
          </div>
          <button class="btn" id="pj-intro-reset">Show again</button>
        </div>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">§</span>
            <div>
              <div class="row__label">Para Summary introduction</div>
              <div class="row__hint">Show the first-time introduction again</div>
            </div>
          </div>
          <button class="btn" id="ps-intro-reset">Show again</button>
        </div>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">⊘</span>
            <div>
              <div class="row__label">Odd One Out introduction</div>
              <div class="row__hint">Show the first-time introduction again</div>
            </div>
          </div>
          <button class="btn" id="ooo-intro-reset">Show again</button>
        </div>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">⋔</span>
            <div>
              <div class="row__label">Word DNA introduction</div>
              <div class="row__hint">Show the first-time introduction again</div>
            </div>
          </div>
          <button class="btn" id="wd-intro-reset">Show again</button>
        </div>
      </div>

      <div class="card">
        <h2>Your data</h2>
        <p class="row__hint">Everything lives on this device. Export a backup to
        keep it safe or move it to another phone.</p>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">↓</span>
            <div>
              <div class="row__label">Export all data</div>
              <div class="row__hint">Saves a .json backup file</div>
            </div>
          </div>
          <button class="btn" id="backup-export">Export</button>
        </div>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">↑</span>
            <div>
              <div class="row__label">Import a backup</div>
              <div class="row__hint">Merge or replace — you choose</div>
            </div>
          </div>
          <button class="btn" id="backup-import">Import</button>
        </div>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">▤</span>
            <div>
              <div class="row__label">Storage used</div>
              <div class="row__hint" id="storage-info">Measuring…</div>
            </div>
          </div>
        </div>
        <input type="file" id="backup-file" accept="application/json" hidden />
      </div>

      <div class="card">
        <h2>About</h2>
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">℅</span>
            <div>
              <div class="row__label">CAT OS</div>
              <div class="row__hint">Version ${APP_VERSION} · offline-first · your data stays yours</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  // --- Storage estimate (progressive enhancement; honest if unavailable) ---
  const storageInfo = outlet.querySelector('#storage-info');
  if (navigator.storage?.estimate) {
    navigator.storage.estimate().then(({ usage, quota }) => {
      const mb = (n) => (n / (1024 * 1024)).toFixed(1);
      storageInfo.textContent = `${mb(usage)} MB of ${mb(quota)} MB available`;
    }).catch(() => { storageInfo.textContent = 'Not available on this browser'; });
  } else {
    storageInfo.textContent = 'Not available on this browser';
  }

  // --- Theme picker ---
  const picker = outlet.querySelector('#theme-picker');
  const syncPicker = async () => {
    const current = await loadTheme();
    for (const btn of picker.querySelectorAll('button')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.themeOption === current));
    }
  };
  picker.addEventListener('click', async (e) => {
    const option = e.target.closest('[data-theme-option]');
    if (!option) return;
    await saveTheme(option.dataset.themeOption);
    await syncPicker();
  });
  syncPicker();

  // --- Reading size picker ---
  const readingPicker = outlet.querySelector('#reading-picker');
  const syncReading = async () => {
    const current = await loadReadingSize();
    for (const btn of readingPicker.querySelectorAll('button')) {
      btn.setAttribute('aria-pressed', String(btn.dataset.readingOption === current));
    }
  };
  readingPicker.addEventListener('click', async (e) => {
    const option = e.target.closest('[data-reading-option]');
    if (!option) return;
    await saveReadingSize(option.dataset.readingOption);
    await syncReading();
  });
  syncReading();

  // --- Feedback toggles (haptics / sounds) + master volume ---
  // These pickers carry data-sfx="off" so the global press delegation
  // stays out of their way — each gives its own honest demo instead.
  const volumeSlider = outlet.querySelector('#volume-slider');
  const volumeRow = outlet.querySelector('#volume-row');
  const syncFeedback = () => {
    const prefs = feedbackPrefs();
    for (const b of outlet.querySelectorAll('[data-haptics]')) {
      b.setAttribute('aria-pressed', String((b.dataset.haptics === 'true') === prefs.haptics));
    }
    for (const b of outlet.querySelectorAll('[data-sounds]')) {
      b.setAttribute('aria-pressed', String((b.dataset.sounds === 'true') === prefs.sounds));
    }
    // Volume only means something while sound is on — dim it otherwise.
    volumeSlider.value = String(Math.round(prefs.volume * 100));
    volumeSlider.disabled = !prefs.sounds;
    volumeRow.style.opacity = prefs.sounds ? '' : 'var(--opacity-dim)';
  };
  outlet.querySelector('#haptics-picker').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-haptics]');
    if (!b) return;
    await setFeedbackPref(storage, 'haptics', b.dataset.haptics === 'true');
    syncFeedback();
    cue('toggle'); // feel + hear the new setting, honestly
  });
  outlet.querySelector('#sounds-picker').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-sounds]');
    if (!b) return;
    const on = b.dataset.sounds === 'true';
    await setFeedbackPref(storage, 'sounds', on);
    syncFeedback();
    if (on) playSound('open'); // the welcome chime confirms sound is awake
  });
  // Master volume: preview a tick at the new level as the user drags.
  let volPreview = 0;
  volumeSlider.addEventListener('input', async () => {
    await setFeedbackPref(storage, 'volume', Number(volumeSlider.value) / 100);
    const now = Date.now();
    if (now - volPreview > 90) { volPreview = now; playSound('tap'); }
  });
  syncFeedback();

  // --- Focus Sound toggles and volume ---
  const focusVolumeSlider = outlet.querySelector('#focus-volume-slider');
  const focusVolumeRow = outlet.querySelector('#focus-volume-row');
  const syncFocusNoise = () => {
    const prefs = feedbackPrefs();
    for (const b of outlet.querySelectorAll('[data-focus-noise]')) {
      b.setAttribute('aria-pressed', String((b.dataset.focusNoise === 'true') === prefs.focusNoise));
    }
    focusVolumeSlider.value = String(Math.round(prefs.focusVolume * 100));
    focusVolumeSlider.disabled = !prefs.focusNoise;
    focusVolumeRow.style.opacity = prefs.focusNoise ? '' : 'var(--opacity-dim)';
  };
  outlet.querySelector('#focus-noise-picker').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-focus-noise]');
    if (!b) return;
    const on = b.dataset.focusNoise === 'true';
    await setFeedbackPref(storage, 'focusNoise', on);
    syncFocusNoise();
    cue('toggle');
    if (on) {
      startFocusNoise();
      setTimeout(stopFocusNoise, 1000); // 1-second preview
    } else {
      stopFocusNoise();
    }
  });
  let focusVolPreview = 0;
  focusVolumeSlider.addEventListener('input', async () => {
    await setFeedbackPref(storage, 'focusVolume', Number(focusVolumeSlider.value) / 100);
    const now = Date.now();
    // Re-start preview if dragging
    if (now - focusVolPreview > 250) { 
      focusVolPreview = now; 
      startFocusNoise(); 
      setTimeout(stopFocusNoise, 500); 
    }
  });
  syncFocusNoise();

  // --- The world: music and ambience toggle ---
  const syncGardenAmbience = () => {
    const on = musicEnabled();
    for (const b of outlet.querySelectorAll('[data-garden-ambience]')) {
      b.setAttribute('aria-pressed', String((b.dataset.gardenAmbience === 'true') === on));
    }
  };
  outlet.querySelector('#garden-ambience-picker').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-garden-ambience]');
    if (!b) return;
    await setMusicEnabled(b.dataset.gardenAmbience === 'true');
    syncGardenAmbience();
    cue('toggle');
  });
  syncGardenAmbience();

  // --- Learning: bring the Para Jumbles introduction back ---
  outlet.querySelector('#pj-intro-reset').addEventListener('click', async () => {
    try {
      await resetPJIntro(storage);
      cue('toggle');
      toast('The introduction will greet you on your next visit to Para Jumbles.', 'info', { mute: true });
    } catch (err) {
      toast('Could not reset the introduction.', 'error');
      console.error('[CAT OS]', err);
    }
  });

  // --- Learning: bring the Para Summary introduction back ---
  outlet.querySelector('#ps-intro-reset').addEventListener('click', async () => {
    try {
      await resetPSIntro(storage);
      cue('toggle');
      toast('The introduction will greet you on your next visit to Para Summary.', 'info', { mute: true });
    } catch (err) {
      toast('Could not reset the introduction.', 'error');
      console.error('[CAT OS]', err);
    }
  });

  // --- Learning: bring the Odd One Out introduction back ---
  outlet.querySelector('#ooo-intro-reset').addEventListener('click', async () => {
    try {
      await resetOOOIntro(storage);
      cue('toggle');
      toast('The introduction will greet you on your next visit to Odd One Out.', 'info', { mute: true });
    } catch (err) {
      toast('Could not reset the introduction.', 'error');
      console.error('[CAT OS]', err);
    }
  });

  // --- Learning: bring the Word DNA introduction back ---
  outlet.querySelector('#wd-intro-reset').addEventListener('click', async () => {
    try {
      await resetWDIntro(storage);
      cue('toggle');
      toast('The introduction will greet you on your next visit to Word DNA.', 'info', { mute: true });
    } catch (err) {
      toast('Could not reset the introduction.', 'error');
      console.error('[CAT OS]', err);
    }
  });

  // --- Backup & Restore ---
  outlet.querySelector('#backup-export').addEventListener('click', async () => {
    await downloadBackup(storage);
    cue('backupOk'); // a tiny reassuring confirmation
    toast('Backup saved', 'info', { mute: true });
  });

  const fileInput = outlet.querySelector('#backup-file');
  outlet.querySelector('#backup-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    let backup;
    try {
      backup = JSON.parse(await file.text());
    } catch {
      toast('That file is not valid JSON.', 'error');
      return;
    }
    // Never silently overwrite (blueprint §3.17): the user chooses.
    const replace = confirm(
      'Import backup.\n\nOK = replace everything on this device with the backup.\nCancel = merge the backup into what is already here.'
    );
    try {
      const written = await importAll(storage, backup, replace ? 'replace' : 'merge');
      await initFeedback(storage); // imported feedback prefs take effect now
      cue('restore'); // a warm "rebuilt" confirmation
      toast(`Backup imported — ${written} records`, 'info', { mute: true });
      applyTheme(await loadTheme()); // imported theme takes effect immediately
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

function renderNotFound(outlet) {
  outlet.innerHTML = `
    <section class="screen">
      <div class="empty">
        <div class="empty__glyph" aria-hidden="true">?</div>
        <h2>Screen not found</h2>
        <p>That address doesn't exist. It may be from an older version.</p>
        <a class="btn btn--primary" href="#/world">Back to the valley</a>
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
    applyTheme(await loadTheme());
    applyReadingSize(await loadReadingSize());
    await initFeedback(storage);
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
    .register({ path: '/settings', title: 'Settings', render: renderSettings })
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
  let opening = '/world';
  try {
    const valley = await loadValley(storage);
    if (!valley.awakened_at && (!location.hash || location.hash === '#/' || location.hash === '#/world')) opening = '/awaken';
  } catch { /* the valley is the safe default */ }
  router.start(opening);

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
    if (inWorld) unmountStage(); else syncStage(storage).catch(() => { /* the room still works */ });
  };
  applyImmersiveChrome();
  window.addEventListener('hashchange', applyImmersiveChrome);

  // Stop focus noise automatically when navigating away from a session screen.
  // We check the hash to see if it's one of the session routes.
  window.addEventListener('hashchange', () => {
    const h = location.hash;
    const isSession = h.startsWith('#/rc/session') || h.startsWith('#/rc/mentor') ||
                      h.startsWith('#/pj/session') || h.startsWith('#/ps/session') ||
                      h.startsWith('#/ooo/session') || h.startsWith('#/wd/session') ||
                      h.startsWith('#/bank/session');
    if (!isSession) {
      stopFocusNoise();
    }
  });

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
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || refreshing) return;
        refreshing = true;
        window.location.reload();
      });

      const registration = await navigator.serviceWorker.register('./service-worker.js');
      registration.update();
      // The rest of the library — every passage, jumble, summary and bank
      // file the content engine ships — arrives in the background, a few
      // files at a time, once the valley is painted and the phone is idle.
      // The service worker's fetch handler keeps each one for offline use.
      startLibrarySync({ delayMs: 9000 });
      setInterval(() => registration.update(), 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
    } catch (err) {
      console.warn('[CAT OS] service worker registration failed:', err);
    }
  }
}

boot();
