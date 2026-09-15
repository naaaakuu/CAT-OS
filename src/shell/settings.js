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

/* ------------------------------------------------------------------ */
/* Theme, reading size, motion                                         */
/* ------------------------------------------------------------------ */

export const THEMES = ['system', 'light', 'dark'];
const THEME_BG = { light: '#F7F6F3', dark: '#151618' };

export async function loadTheme(storage) {
  try { const record = await storage.get(STORES.SETTINGS, 'theme'); return THEMES.includes(record?.value) ? record.value : 'system'; } catch { return 'system'; }
}
export function applyTheme(theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const scheme = meta.getAttribute('media')?.includes('dark') ? 'dark' : 'light';
    meta.setAttribute('content', THEME_BG[theme === 'system' ? scheme : theme]);
  }
}
async function saveTheme(storage, theme) { await storage.put(STORES.SETTINGS, { id: 'theme', value: theme }); applyTheme(theme); }

export const READING_SIZES = ['s', 'm', 'l', 'xl'];
export async function loadReadingSize(storage) {
  try { const record = await storage.get(STORES.SETTINGS, 'reading-size'); return READING_SIZES.includes(record?.value) ? record.value : 'm'; } catch { return 'm'; }
}
export function applyReadingSize(size) {
  if (size === 'm') document.documentElement.removeAttribute('data-reading');
  else document.documentElement.setAttribute('data-reading', size);
}
async function saveReadingSize(storage, size) { await storage.put(STORES.SETTINGS, { id: 'reading-size', value: size }); applyReadingSize(size); }

/* Two attributes, because the stylesheets need two different facts.
   data-reduced-motion is the RESOLVED answer — "cut the animation" — and
   base.css keys the universal reset off it. data-motion is the raw choice,
   which base.css needs separately so that an explicit "Full" can opt out of
   the prefers-reduced-motion media query; the resolved flag cannot express
   that, since "Full" and "Auto on a normal system" both resolve to false. */
export function applyMotion() {
  const root = document.documentElement;
  root.toggleAttribute('data-reduced-motion', motionReduced());
  root.setAttribute('data-motion', feedbackPrefs().motion ?? 'system');
}

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
