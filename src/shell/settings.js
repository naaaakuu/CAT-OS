/**
 * settings.js — the settings screen, and the three appearance preferences
 * the shell applies at boot (theme, reading size, motion).
 *
 * Every control on this screen does something you can see or hear the
 * moment you touch it, and nothing is here to fill the page:
 *   AUDIO       music & ambience on/off and volume; sound effects on/off and volume
 *   FEEL        haptics; reduced motion
 *   READING     reading size; theme
 *   YOUR DATA   export, import, storage used
 *   ABOUT       the version
 */

import { STORES } from '../core/storage/storage-adapter.js';
import { downloadBackup, importAll } from '../core/storage/backup.js';
import { toast } from '../ui/components/cat-toast.js';
import { initFeedback, feedbackPrefs, setFeedbackPref, cue, motionReduced } from '../core/engagement/feedback.js';
import { playSound } from '../core/engagement/audio.js';
import { play, unlock, startMusic, startAmbience, musicEnabled } from '../world/audio.js';
import { escapeHTML } from '../core/utils/format.js';
import { workerStatus, librarySyncProgress, startLibrarySync } from '../core/content-loader/library-sync.js';

/* The three preferences the shell applies at boot live in prefs.js, so the
   boot path never has to load this screen. Re-exported here because that is
   where they used to live. */
import { THEMES, READING_SIZES, loadTheme, applyTheme, loadReadingSize, applyReadingSize, applyMotion } from './prefs.js';
export { THEMES, READING_SIZES, loadTheme, applyTheme, loadReadingSize, applyReadingSize, applyMotion };

async function saveTheme(storage, theme) { await storage.put(STORES.SETTINGS, { id: 'theme', value: theme }); applyTheme(theme); }
async function saveReadingSize(storage, size) { await storage.put(STORES.SETTINGS, { id: 'reading-size', value: size }); applyReadingSize(size); }

/* ------------------------------------------------------------------ */
/* The screen                                                          */
/* ------------------------------------------------------------------ */

const row = (icon, label, hint, control) => `
  <div class="row">
    <div class="row__lead">
      <span class="row__icon" aria-hidden="true">${icon}</span>
      <div><div class="row__label">${escapeHTML(label)}</div><div class="row__hint">${escapeHTML(hint)}</div></div>
    </div>
    ${control}
  </div>`;
const onOff = (id, attr) => `
  <div class="segmented" id="${id}" role="group" aria-label="${escapeHTML(id)}" data-sfx="off">
    <button class="segmented__option" data-${attr}="true" aria-pressed="false">On</button>
    <button class="segmented__option" data-${attr}="false" aria-pressed="false">Off</button>
  </div>`;
const slider = (id, label) => `<input class="range" id="${id}" type="range" min="0" max="100" step="1" value="100" aria-label="${escapeHTML(label)}" data-sfx="off" />`;

export function renderSettings(outlet, { storage, version }) {
  outlet.innerHTML = `
    <section class="screen">
      <p class="screen__eyebrow">Settings</p>
      <h1>Settings</h1>

      <div class="card">
        <h2>Audio</h2>
        ${row('♫', 'Music and ambience', 'The village’s own music, wind, water and birds', onOff('music-picker', 'music'))}
        ${row('◑', 'Music volume', 'How loud the village plays', slider('music-volume', 'Music volume'))}
        ${row('♩', 'Sound effects', 'Taps, chimes, deliveries and stars', onOff('sfx-picker', 'sfx'))}
        ${row('◑', 'Effects volume', 'How loud the cues are', slider('sfx-volume', 'Effects volume'))}
      </div>

      <div class="card">
        <h2>Feel</h2>
        ${row('◇', 'Haptics', 'A subtle vibration where your device supports it', onOff('haptics-picker', 'haptics'))}
        ${row('≋', 'Reduce motion', 'Shorter animations in the village and the rooms', `
          <div class="segmented" id="motion-picker" role="group" aria-label="Motion">
            <button class="segmented__option" data-motion="system" aria-pressed="false">Auto</button>
            <button class="segmented__option" data-motion="full" aria-pressed="false">Full</button>
            <button class="segmented__option" data-motion="reduced" aria-pressed="false">Less</button>
          </div>`)}
      </div>

      <div class="card">
        <h2>Reading</h2>
        ${row('Aa', 'Reading size', 'Scales passages and lessons only', `
          <div class="segmented" id="reading-picker" role="group" aria-label="Reading size">
            ${READING_SIZES.map((s) => `<button class="segmented__option" data-reading-option="${s}" aria-pressed="false">${s.toUpperCase()}</button>`).join('')}
          </div>`)}
        ${row('◐', 'Theme', 'The rooms follow your device, or not', `
          <div class="segmented" id="theme-picker" role="group" aria-label="Theme">
            ${THEMES.map((t) => `<button class="segmented__option" data-theme-option="${t}" aria-pressed="false">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
          </div>`)}
      </div>

      <div class="card">
        <h2>Your data</h2>
        <p class="row__hint">Everything lives on this device — the village, every passage you read, every word you keep. Export a backup to keep it safe or move it to another phone.</p>
        ${row('↓', 'Export all data', 'Saves a .json backup file', '<button class="btn" id="backup-export">Export</button>')}
        ${row('↑', 'Import a backup', 'Merge or replace — you choose', '<button class="btn" id="backup-import">Import</button>')}
        ${row('▤', 'Storage used', 'Measuring…', '')}
        <input type="file" id="backup-file" accept="application/json" hidden />
      </div>

      <div class="card">
        <h2>Offline</h2>
        <p class="row__hint">CAT OS downloads itself so it works on a train, in a basement, on a dead connection. The library arrives in the background, a few files at a time, and picks up where it stopped.</p>
        ${row('◆', 'Downloaded for offline', 'Checking…', '<button class="btn" id="offline-refresh">Check</button>')}
        <div class="offline-bar" id="offline-bar" aria-hidden="true"><i style="width:0%"></i></div>
      </div>

      <div class="card">
        <h2>About</h2>
        ${row('℅', 'CAT OS', `Version ${version} · offline-first · your data stays yours`, '')}
        ${row('⌂', 'The village', 'Home is the village. Learning is its economy.', '<a class="btn" href="#/world">Open</a>')}
      </div>
    </section>`;

  // Storage estimate (progressive enhancement; honest if unavailable).
  const storageHint = [...outlet.querySelectorAll('.row__hint')].find((el) => el.textContent === 'Measuring…');
  if (navigator.storage?.estimate) {
    navigator.storage.estimate().then(({ usage, quota }) => {
      const mb = (n) => (n / (1024 * 1024)).toFixed(1);
      if (storageHint) storageHint.textContent = `${mb(usage)} MB of ${mb(quota)} MB available`;
    }).catch(() => { if (storageHint) storageHint.textContent = 'Not available on this browser'; });
  } else if (storageHint) storageHint.textContent = 'Not available on this browser';

  /* ---- Offline ----
     A real number from the worker itself, never a claim. "Offline-ready" is
     the one promise this app makes that a learner cannot check by looking,
     so the row says how much is actually on the device, admits it when
     there is no service worker at all, and the button asks the worker to
     carry on rather than pretending to start something new. */
  const offlineHint = [...outlet.querySelectorAll('.row__hint')].find((el) => el.textContent === 'Checking…');
  const offlineBar = outlet.querySelector('#offline-bar i');
  const refreshOffline = async () => {
    let status = null;
    try { status = await workerStatus(); } catch { status = null; }
    if (!status) {
      if (offlineHint) offlineHint.textContent = navigator.onLine === false
        ? 'Not set up on this device yet — reconnect once and it will download.'
        : 'Not set up on this device (this browser or this address cannot store it).';
      if (offlineBar) offlineBar.style.width = '0%';
      return;
    }
    let lib = { done: 0, total: 0 };
    try { lib = await librarySyncProgress(); } catch { /* nothing yet */ }
    // The app itself, then the reference content, then the bank library. The
    // library's total comes from the manifest the page walked; if it has not
    // walked it yet, fall back to what the worker has actually stored, so the
    // number is never a guess and never over 100%.
    const libDone = Math.max(lib.done, status.library?.cached ?? 0);
    const libTotal = Math.max(lib.total, libDone);
    const done = status.core.cached + status.shell.cached + status.content.cached + libDone;
    const total = status.core.total + status.shell.total + status.content.total + libTotal;
    const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
    if (offlineBar) offlineBar.style.width = `${pct}%`;
    if (offlineHint) {
      offlineHint.textContent = pct >= 100
        ? `The whole app and library are on this device — ${done} files.`
        : `${done} of ${total} files (${pct}%). The rest arrives while you play.`;
    }
  };
  outlet.querySelector('#offline-refresh')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;               // read BEFORE the first await
    play('tap');
    btn.disabled = true;
    try {
      navigator.serviceWorker?.controller?.postMessage({ type: 'catos:sync' });
      startLibrarySync({ delayMs: 0 });
      await refreshOffline();
    } finally { btn.disabled = false; }
  });
  refreshOffline();

  /* ---- Audio ---- */
  const musicVol = outlet.querySelector('#music-volume');
  const sfxVol = outlet.querySelector('#sfx-volume');
  const syncAudio = () => {
    const p = feedbackPrefs();
    for (const b of outlet.querySelectorAll('[data-music]')) b.setAttribute('aria-pressed', String((b.dataset.music === 'true') === p.music));
    for (const b of outlet.querySelectorAll('[data-sfx]')) b.setAttribute('aria-pressed', String((b.dataset.sfx === 'true') === p.sfx));
    musicVol.value = String(Math.round(p.musicVolume * 100)); musicVol.disabled = !p.music; musicVol.closest('.row').style.opacity = p.music ? '' : 'var(--opacity-dim)';
    sfxVol.value = String(Math.round(p.sfxVolume * 100)); sfxVol.disabled = !p.sfx; sfxVol.closest('.row').style.opacity = p.sfx ? '' : 'var(--opacity-dim)';
  };
  outlet.querySelector('#music-picker').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-music]');
    if (!b) return;
    const on = b.dataset.music === 'true';
    await setFeedbackPref(storage, 'music', on);
    syncAudio();
    cue('toggle');
    // Hear it now: a few bars of the village, so the toggle is honest.
    if (on) { unlock(); startMusic('world', { hour: 'morning' }); startAmbience('world', { hour: 'morning' }); }
  });
  let musicPreview = 0;
  musicVol.addEventListener('input', async () => {
    await setFeedbackPref(storage, 'musicVolume', Number(musicVol.value) / 100);
    const now = Date.now();
    if (now - musicPreview > 250 && musicEnabled()) { musicPreview = now; unlock(); startMusic('world', { hour: 'morning' }); }
  });
  outlet.querySelector('#sfx-picker').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-sfx]');
    if (!b) return;
    const on = b.dataset.sfx === 'true';
    await setFeedbackPref(storage, 'sfx', on);
    syncAudio();
    if (on) { playSound('open'); play('place'); }
  });
  let sfxPreview = 0;
  sfxVol.addEventListener('input', async () => {
    await setFeedbackPref(storage, 'sfxVolume', Number(sfxVol.value) / 100);
    const now = Date.now();
    if (now - sfxPreview > 120) { sfxPreview = now; playSound('tap'); }
  });
  syncAudio();

  /* ---- Feel ---- */
  const syncFeel = () => {
    const p = feedbackPrefs();
    for (const b of outlet.querySelectorAll('[data-haptics]')) b.setAttribute('aria-pressed', String((b.dataset.haptics === 'true') === p.haptics));
    for (const b of outlet.querySelectorAll('[data-motion]')) b.setAttribute('aria-pressed', String(b.dataset.motion === p.motion));
  };
  outlet.querySelector('#haptics-picker').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-haptics]');
    if (!b) return;
    await setFeedbackPref(storage, 'haptics', b.dataset.haptics === 'true');
    syncFeel();
    cue('toggle');
  });
  outlet.querySelector('#motion-picker').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-motion]');
    if (!b) return;
    await setFeedbackPref(storage, 'motion', b.dataset.motion);
    applyMotion();
    syncFeel();
  });
  syncFeel();

  /* ---- Reading ---- */
  const readingPicker = outlet.querySelector('#reading-picker');
  const syncReading = async () => { const current = await loadReadingSize(storage); for (const btn of readingPicker.querySelectorAll('button')) btn.setAttribute('aria-pressed', String(btn.dataset.readingOption === current)); };
  readingPicker.addEventListener('click', async (e) => { const option = e.target.closest('[data-reading-option]'); if (!option) return; await saveReadingSize(storage, option.dataset.readingOption); await syncReading(); });
  syncReading();
  const themePicker = outlet.querySelector('#theme-picker');
  const syncTheme = async () => { const current = await loadTheme(storage); for (const btn of themePicker.querySelectorAll('button')) btn.setAttribute('aria-pressed', String(btn.dataset.themeOption === current)); };
  themePicker.addEventListener('click', async (e) => { const option = e.target.closest('[data-theme-option]'); if (!option) return; await saveTheme(storage, option.dataset.themeOption); await syncTheme(); });
  syncTheme();

  /* ---- Backup & restore ---- */
  outlet.querySelector('#backup-export').addEventListener('click', async () => {
    await downloadBackup(storage);
    cue('backupOk');
    toast('Backup saved', 'info', { mute: true });
  });
  const fileInput = outlet.querySelector('#backup-file');
  outlet.querySelector('#backup-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    let backup;
    try { backup = JSON.parse(await file.text()); } catch { toast('That file is not valid JSON.', 'error'); return; }
    // Never silently overwrite: the user chooses.
    const replace = confirm('Import backup.\n\nOK = replace everything on this device with the backup.\nCancel = merge the backup into what is already here.');
    try {
      const written = await importAll(storage, backup, replace ? 'replace' : 'merge');
      await initFeedback(storage);
      applyMotion();
      cue('restore');
      toast(`Backup imported — ${written} records`, 'info', { mute: true });
      applyTheme(await loadTheme(storage));
      applyReadingSize(await loadReadingSize(storage));
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}
