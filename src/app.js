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
import { formatPercent, formatDate } from './core/utils/format.js';
import { registerRC } from './modules/reading-comprehension/index.js';
import { registerPJ } from './modules/para-jumbles/index.js';
import { registerPS } from './modules/para-summary/index.js';
import { registerOOO } from './modules/odd-one-out/index.js';
import { resetPSIntro } from './modules/para-summary/logic/store.js';
import { resetOOOIntro } from './modules/odd-one-out/logic/store.js';
import { listRCItems } from './core/content-loader/loader.js';
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

const APP_VERSION = '0.12.0'; // keep in step with CHANGELOG.md

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

async function renderHome(outlet) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning.' : hour < 18 ? 'Good afternoon.' : 'Good evening.';
  const dateLine = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  let sessions = [];
  let items = [];
  try {
    [sessions, items] = await Promise.all([
      storage.getAll(STORES.SESSIONS),
      listRCItems().catch(() => []),
    ]);
  } catch { /* storage unavailable — Home still renders below */ }

  const stats = deriveEngagement(sessions);
  const titles = new Map(items.map((i) => [i.id, i.title]));

  /* ---- Today: goal, streak, level, week — one calm card ---- */
  const goalDone = stats.streaks.practicedToday;
  const todayHTML = `
    <div class="card">
      <div class="row" style="padding-top: 0">
        <div class="row__lead">
          <span class="row__icon" aria-hidden="true">${goalDone ? '✓' : '○'}</span>
          <div>
            <div class="row__label">Today's goal · one session</div>
            <div class="row__hint">${goalDone ? 'Done for today' : 'One passage keeps the habit'}</div>
          </div>
        </div>
        <span class="badge ${stats.streaks.current > 0 ? 'badge--success' : ''}"
              aria-label="Streak: ${stats.streaks.current} days">
          ✦ ${stats.streaks.current}-day streak</span>
      </div>
      <div style="margin: var(--space-4) 0"><cat-xp-bar></cat-xp-bar></div>
      <cat-week-strip></cat-week-strip>
    </div>`;

  /* ---- Statistics — quiet, tabular, honest ---- */
  const statsHTML = stats.sessions === 0 ? '' : `
    <div class="stat-grid">
      <div class="stat"><b>${stats.sessions}</b><span>Sessions</span></div>
      <div class="stat"><b>${stats.answered}</b><span>Answered</span></div>
      <div class="stat"><b>${stats.answered ? formatPercent(stats.accuracy) : '—'}</b><span>Accuracy</span></div>
      <div class="stat"><b>${formatDuration(stats.timeMs)}</b><span>Studied</span></div>
      <div class="stat"><b>${stats.streaks.best}</b><span>Best streak</span></div>
      <div class="stat"><b>${stats.level.level}</b><span>Level</span></div>
    </div>`;

  /* ---- Continue learning (journey-aware, reason stated) ---- */
  const next = recommendNext(items, sessions);
  const continueHTML = stats.sessions === 0 ? `
    <div class="card">
      <h2>Reading Comprehension</h2>
      <p class="muted">Read deeply, answer carefully, and learn exactly why each
      option is right or wrong. Everything works offline and stays on your device.</p>
      <a class="btn btn--primary btn--block" href="#/rc">Start practicing</a>
    </div>` : next ? `
    <div class="card">
      <h2>Continue your journey</h2>
      <p class="muted"><em>${next.item.title}</em> — ${next.item.stage}, ${next.item.difficulty}, ~${next.item.estimated_time_min} min.</p>
      <p class="hint" style="margin-bottom: var(--space-3)">${next.reason}</p>
      <a class="btn btn--primary btn--block" href="#/rc/session/${next.item.id}">Read it now</a>
    </div>` : `
    <div class="card">
      <h2>The library is read</h2>
      <p class="muted">New passages arrive through the content pipeline.</p>
      <a class="btn btn--primary btn--block" href="#/rc">Open the library</a>
    </div>`;

  /* ---- Achievements — unlocked count + the three most recent tiers ---- */
  const evaluated = evaluate(stats);
  const unlocked = evaluated.filter((a) => a.unlocked);
  const achievementsHTML = stats.sessions === 0 ? '' : `
    <div class="card">
      <h2>Achievements</h2>
      <p class="row__hint" style="margin-bottom: var(--space-2)">${unlocked.length} of ${evaluated.length} unlocked</p>
      ${unlocked.slice(-3).reverse().map((a) => `
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">${a.glyph}</span>
            <div>
              <div class="row__label">${a.title}</div>
              <div class="row__hint">${a.description}</div>
            </div>
          </div>
          <span class="badge badge--success">Unlocked</span>
        </div>`).join('')}
    </div>`;

  /* ---- Recent practice (RC and PJ sessions share the store) ---- */
  const recent = [...sessions].sort((a, b) => b.finished_at.localeCompare(a.finished_at)).slice(0, 3);
  const recentHTML = recent.length === 0 ? '' : `
    <div class="card">
      <h2>Recent practice</h2>
      ${recent.map((s) => {
        const isPJ = s.module === 'pj';
        const isPS = s.module === 'ps';
        const isOOO = s.module === 'ooo';
        const count = s.item_ids?.length ?? s.score.total;
        const label = isPJ
          ? `Para Jumbles · ${count} jumble${count === 1 ? '' : 's'}`
          : isPS
            ? `Para Summary · ${count} paragraph${count === 1 ? '' : 's'}`
            : isOOO
              ? `Odd One Out · ${count} item${count === 1 ? '' : 's'}`
              : (titles.get(s.passage_id) ?? s.passage_id);
        const href = isPJ ? '#/pj' : isPS ? '#/ps' : isOOO ? '#/ooo' : `#/rc/review/${s.passage_id}`;
        return `
        <div class="row">
          <div class="row__lead">
            <span class="row__icon" aria-hidden="true">${s.score.accuracy >= 0.5 ? '✓' : '·'}</span>
            <div>
              <div class="row__label">${label}</div>
              <div class="row__hint">${formatDate(s.finished_at)} · ${s.score.correct}/${s.score.total} correct</div>
            </div>
          </div>
          <a class="hint" href="${href}" aria-label="Review ${label}">${(isPJ || isPS || isOOO) ? 'Journey' : 'Review'}</a>
        </div>`;
      }).join('')}
    </div>`;

  outlet.innerHTML = `
    <section class="screen">
      <p class="screen__eyebrow">${dateLine}</p>
      <h1 class="greeting">${greeting}</h1>
      <p class="muted" style="margin-top: calc(-1 * var(--space-4)); margin-bottom: var(--space-4)">${dashboardLine(stats)}</p>
      ${todayHTML}
      ${statsHTML}
      ${continueHTML}
      ${achievementsHTML}
      ${recentHTML}
    </section>
  `;
  outlet.querySelector('cat-xp-bar').data = stats.level;
  outlet.querySelector('cat-week-strip').days = stats.week;
}

function renderPractice(outlet) {
  outlet.innerHTML = `
    <section class="screen">
      <p class="screen__eyebrow">Practice</p>
      <h1>Question types</h1>
      <a class="list-item" href="#/rc">
        <div class="list-item__title">Reading Comprehension</div>
        <div class="list-item__meta">
          <span class="badge badge--success">Available</span>
          <span>A staged journey of passages, each with its own Learning Page</span>
        </div>
      </a>
      <a class="list-item" href="#/pj">
        <div class="list-item__title">Para Jumbles</div>
        <div class="list-item__meta">
          <span class="badge badge--success">Available</span>
          <span>Rebuild the author's paragraph — an eight-tier journey from Beginner to Premium</span>
        </div>
      </a>
      <a class="list-item" href="#/ps">
        <div class="list-item__title">Para Summary</div>
        <div class="list-item__meta">
          <span class="badge badge--success">Available</span>
          <span>Find the author's point and protect it — an eight-tier journey from Foundation to Premium</span>
        </div>
      </a>
      <a class="list-item" href="#/ooo">
        <div class="list-item__title">Odd One Out</div>
        <div class="list-item__meta">
          <span class="badge badge--success">Available</span>
          <span>Build the paragraph, and the stranger reveals itself — an eight-tier journey from Foundation to Premium</span>
        </div>
      </a>
      ${['Vocabulary'].map((name) => `
        <div class="list-item" aria-disabled="true" style="opacity: var(--opacity-dim)">
          <div class="list-item__title">${name}</div>
          <div class="list-item__meta"><span class="badge">Coming in V1.x</span></div>
        </div>`).join('')}
    </section>
  `;
}

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
        <h2>Learning</h2>
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
        <a class="btn btn--primary" href="#/home">Go to Home</a>
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

  router.start();

  // Stop focus noise automatically when navigating away from a session screen.
  // We check the hash to see if it's one of the session routes.
  window.addEventListener('hashchange', () => {
    const h = location.hash;
    const isSession = h.startsWith('#/rc/session') || h.startsWith('#/rc/mentor') ||
                      h.startsWith('#/pj/session') || h.startsWith('#/ps/session') ||
                      h.startsWith('#/ooo/session');
    if (!isSession) {
      stopFocusNoise();
    }
  });

  // (Nav taps are covered by installGlobalFeedback's press delegation.)

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
  if ('serviceWorker' in navigator) {
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
