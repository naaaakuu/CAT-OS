/**
 * settings.js — the settings screen, and the three appearance preferences
 * the shell applies at boot (theme, reading size, motion).
 *
 * Every control on this screen does something you can see or hear the
 * moment you touch it, and nothing is here to fill the page:
 *   AUDIO       music & ambience on/off and volume; sound effects on/off and volume
 *   FEEL        haptics; reduced motion
 *   READING     reading size; theme
 *   YOUR DATA   export, import, storage used, start over
 *   ABOUT       the version
 */

import { STORES } from '../core/storage/storage-adapter.js';
// Settings was the only screen breaking the law icons.js states in its
// own first paragraph: nothing is an emoji, nothing is a glyph from a set.
import { icon } from '../world/icons.js';
import { downloadBackup, importAll, describeBackup } from '../core/storage/backup.js';
import { openModal, closeModal } from '../ui/modal.js';
import { toast } from '../ui/components/cat-toast.js';
import { initFeedback, feedbackPrefs, setFeedbackPref, cue, motionReduced } from '../core/engagement/feedback.js';
import { playSound } from '../core/engagement/audio.js';
import { play, unlock, startMusic, startAmbience, musicEnabled } from '../world/audio.js';
import { escapeHTML } from '../core/utils/format.js';
import { workerStatus, librarySyncProgress, startLibrarySync } from '../core/content-loader/library-sync.js';

/* The three preferences the shell applies at boot live in prefs.js, so the
   boot path never has to load this screen. Re-exported here because that is
   where they used to live. */
import { backdropStyle } from '../pets/sprite.js';
import { THEMES, READING_SIZES, loadTheme, applyTheme, loadReadingSize, applyReadingSize, applyMotion } from './prefs.js';
export { THEMES, READING_SIZES, loadTheme, applyTheme, loadReadingSize, applyReadingSize, applyMotion };

async function saveTheme(storage, theme) { await storage.put(STORES.SETTINGS, { id: 'theme', value: theme }); applyTheme(theme); }
async function saveReadingSize(storage, size) { await storage.put(STORES.SETTINGS, { id: 'reading-size', value: size }); applyReadingSize(size); }

/* ------------------------------------------------------------------ */
/* The screen                                                          */
/* ------------------------------------------------------------------ */

/* A store is a technical word. What is in it is not. */
const STORE_WORD = {
  settings: 'settings', sessions: 'finished runs', attempts: 'answers',
  learning: 'things the village remembers',
};

/* THE DESCRIPTION GETS A LINE OF ITS OWN.
   The row was a flex with space-between, so the text column took whatever
   the control left it — and the three-option controls (Auto/Full/Less,
   S/M/L/XL, System/Light/Dark) left about a hundred and seventy pixels.
   "The rooms follow your device, or not" wrapped to four lines for six
   words with "not" alone on the last. The label and the control belong on
   one line together, because that is the decision; the sentence explaining
   it belongs underneath, across the whole width.

   Settings has its own row rather than bending the shared .row, which the
   mentor's "What you learned today" uses with a different structure. */
const row = (mark, label, hint, control) => `
  <div class="srow">
    <span class="srow__icon row__icon" aria-hidden="true">${mark}</span>
    <div class="srow__label row__label">${escapeHTML(label)}</div>
    <div class="srow__control">${control}</div>
    <p class="srow__hint row__hint">${escapeHTML(hint)}</p>
  </div>`;
/* A screen reader read these three groups out as "music-picker",
   "sfx-picker" and "haptics-picker" — the element id, because that is what
   was passed. */
const onOff = (id, attr, label) => `
  <div class="segmented" id="${id}" role="group" aria-label="${escapeHTML(label ?? id)}" data-sfx="off">
    <button class="segmented__option" data-${attr}="true" aria-pressed="false">On</button>
    <button class="segmented__option" data-${attr}="false" aria-pressed="false">Off</button>
  </div>`;
const slider = (id, label) => `<input class="range" id="${id}" type="range" min="0" max="100" step="1" value="100" aria-label="${escapeHTML(label)}" data-sfx="off" />`;

export function renderSettings(outlet, { storage, version }) {
  outlet.innerHTML = `
    <section class="screen screen--cottage">
      <div class="cottage__hero" style="${backdropStyle('cottage')}" aria-hidden="true"></div>
      <p class="screen__eyebrow">Settings</p>
      <h1>Settings</h1>
      <p class="cottage__line">How the village sounds and moves, how big the words are, and your backup.</p>

      <div class="card">
        <h2>Audio</h2>
        ${row(icon('music', { size: 20 }), 'Music and ambience', 'The village’s own music, wind, water and birds', onOff('music-picker', 'music', 'Music and ambience'))}
        ${row(icon('music', { size: 20 }), 'Music volume', 'How loud the village plays', slider('music-volume', 'Music volume'))}
        ${row(icon('star', { size: 20 }), 'Sound effects', 'Taps, chimes, deliveries and stars', onOff('sfx-picker', 'sfx', 'Sound effects'))}
        ${row(icon('star', { size: 20 }), 'Effects volume', 'How loud the cues are', slider('sfx-volume', 'Effects volume'))}
      </div>

      <div class="card">
        <h2>Feel</h2>
        ${row(icon('bell', { size: 20 }), 'Haptics', 'A subtle vibration where your device supports it', onOff('haptics-picker', 'haptics', 'Haptics'))}
        ${row(icon('arrow', { size: 20 }), 'Reduce motion', 'Shorter animations in the village and the rooms', `
          <div class="segmented" id="motion-picker" role="group" aria-label="Motion">
            <button class="segmented__option" data-motion="system" aria-pressed="false">Auto</button>
            <button class="segmented__option" data-motion="full" aria-pressed="false">Full</button>
            <button class="segmented__option" data-motion="reduced" aria-pressed="false">Less</button>
          </div>`)}
      </div>

      <div class="card">
        <h2>Reading</h2>
        ${row(icon('page', { size: 20 }), 'Reading size', 'Scales passages and lessons only', `
          <div class="segmented" id="reading-picker" role="group" aria-label="Reading size">
            ${READING_SIZES.map((s) => `<button class="segmented__option" data-reading-option="${s}" aria-pressed="false">${s.toUpperCase()}</button>`).join('')}
          </div>`)}
        ${row(icon('sun', { size: 20 }), 'Theme', 'The rooms follow your device, or not', `
          <div class="segmented" id="theme-picker" role="group" aria-label="Theme">
            ${THEMES.map((t) => `<button class="segmented__option" data-theme-option="${t}" aria-pressed="false">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
          </div>`)}
      </div>

      <div class="card">
        <h2>Your data</h2>
        <p class="row__hint">Everything lives on this device: the village, every passage you read, every word you keep. Export a backup to keep it safe or move it to another phone.</p>
        ${row(icon('scroll', { size: 20 }), 'Export all data', 'Saves a .json backup file', '<button class="btn" id="backup-export">Export</button>')}
        ${row(icon('scroll', { size: 20 }), 'Import a backup', 'Merge or replace: you choose', '<button class="btn" id="backup-import">Import</button>')}
        ${row(icon('scales', { size: 20 }), 'Storage used', 'Measuring…', '')}
        ${row(icon('arrow', { size: 20 }), 'Start over', 'Back to the very first day: baby friends, level 1, nothing read', '<button class="btn btn--danger" id="start-over">Start over</button>')}
        <input type="file" id="backup-file" accept="application/json" hidden />
      </div>

      <div class="card">
        <h2>Offline</h2>
        <p class="row__hint">CAT OS downloads itself so it works on a train, in a basement, on a dead connection. The library arrives in the background, a few files at a time, and picks up where it stopped.</p>
        ${row(icon('check', { size: 20 }), 'Downloaded for offline', 'Checking…', '<button class="btn" id="offline-refresh">Check</button>')}
        <div class="offline-bar" id="offline-bar" aria-hidden="true"><i style="width:0%"></i></div>
      </div>

      <div class="card">
        <h2>About</h2>
        ${row(icon('cat', { size: 20 }), 'CAT OS', `Version ${version} · offline-first · your data stays yours`, '')}
        ${row(icon('house', { size: 20 }), 'The village', 'Six friends, one for each part of CAT English. Learning is what keeps them well.', '<a class="btn" href="#/world">Open</a>')}
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
        ? 'Not set up on this device yet: reconnect once and it will download.'
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
        ? `The whole app and library are on this device…${done} files.`
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
    musicVol.value = String(Math.round(p.musicVolume * 100)); musicVol.disabled = !p.music; musicVol.closest('.srow').style.opacity = p.music ? '' : 'var(--opacity-dim)';
    sfxVol.value = String(Math.round(p.sfxVolume * 100)); sfxVol.disabled = !p.sfx; sfxVol.closest('.srow').style.opacity = p.sfx ? '' : 'var(--opacity-dim)';
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

    /* THE ONE IRREVERSIBLE THING IN THE PRODUCT.
       It used to be a raw browser confirm() whose CANCEL performed a merge:
       once a file was chosen there was no path that did nothing. Escape,
       a tap outside, and the button labelled Cancel all wrote to the
       learner's device. A dismiss affordance wired to a destructive write
       is the one thing a dialog must never be.

       So: the app's own sheet, defaulting to doing nothing, saying what is
       in the file before either write — and saying it plainly when the
       backup is a DIFFERENT valley, because merging two villages fuses
       them, and nothing said so. */
    const replace = await askHowToImport(backup);
    if (replace === null) { toast('Nothing was changed.', 'info', { mute: true }); return; }
    try {
      const { written, kept } = await importAll(storage, backup, replace ? 'replace' : 'merge');
      await initFeedback(storage);
      applyMotion();
      applyTheme(await loadTheme(storage));
      applyReadingSize(await loadReadingSize(storage));
      // The screen was showing the OLD values: every toggle, every slider and
      // both pickers are painted from state read at render time, and an
      // import replaces that state underneath them.
      syncAudio(); syncFeel();
      await syncReading(); await syncTheme();
      cue('restore');
      toast(kept.length
        ? `Backup merged…${written} records. Your village kept its own name.`
        : `Backup imported…${written} records`, 'info', { mute: true });
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  /**
   * @returns {Promise<boolean|null>} true = replace, false = merge,
   *   null = the learner backed out and nothing at all should be written.
   */
  async function askHowToImport(backup) {
    const d = describeBackup(backup);
    const here = await loadValleyName();
    const theirs = d.valley?.name ?? null;
    const different = !!(here && theirs && here !== theirs);
    const when = d.exportedAt ? new Date(d.exportedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'an unknown date';
    const rows = Object.entries(d.counts).filter(([, n]) => n > 0)
      .map(([name, n]) => `<li><b>${n}</b> ${escapeHTML(STORE_WORD[name] ?? name)}</li>`).join('');

    const act = await askSheet(`From ${when}`, theirs ? `${theirs}'s backup` : 'A backup', `
          <ul class="importsheet__what">${rows || '<li>Nothing recognisable</li>'}</ul>
          ${different ? `<p class="importsheet__warn"><b>This is a different valley.</b> Yours is ${escapeHTML(here)}; the backup is ${escapeHTML(theirs)}. Adding it puts two villages in one place. Your village keeps its own name either way.</p>` : ''}
          <div class="importsheet__acts">
            <button class="btn btn--primary" data-do="merge">Add it to this device</button>
            <button class="btn btn--danger" data-do="replace">Replace everything here</button>
            <button class="btn btn--quiet" data-close>Do nothing</button>
          </div>`);
    return act === null ? null : act === 'replace';
  }

  /* ---- Start over ----
     The owner's own ask (2026-10-05): see the game the way a first-time
     player does. Everything this device holds for CAT OS goes: every run,
     answer and word, the village and its name, the settings, the friends'
     growth (all of it is derived from those records), and this browser's
     small notes (the order a level deals its items in, which cards were
     seen). Asked twice, and both sheets default to doing nothing. */
  outlet.querySelector('#start-over').addEventListener('click', async () => {
    const counts = {};
    for (const s of Object.values(STORES)) { try { counts[s] = (await storage.getAll(s)).length; } catch { counts[s] = 0; } }
    const runs = counts[STORES.SESSIONS] ?? 0, answers = counts[STORES.ATTEMPTS] ?? 0;
    const first = await askSheet('Start over', 'Start from the very beginning?', `
          <p class="importsheet__warn">Your village goes back to its first day: every friend a baby again, level 1, no Glow, nothing read. You will meet everyone again like a new player.</p>
          <div class="importsheet__acts">
            <button class="btn btn--danger" data-do="next">Yes, start over</button>
            <button class="btn btn--primary" data-close>Keep my village</button>
          </div>`);
    if (first !== 'next') return;
    const sure = await askSheet('Start over', 'Are you sure?', `
          <p class="importsheet__warn"><b>This deletes everything on this device and cannot be undone</b>: ${runs} finished ${runs === 1 ? 'run' : 'runs'}, ${answers} ${answers === 1 ? 'answer' : 'answers'}, every word you keep, and your village's name. Export a backup first if you might want it back.</p>
          <div class="importsheet__acts">
            <button class="btn btn--danger" data-do="wipe">Delete everything and start over</button>
            <button class="btn btn--primary" data-close>No, keep it</button>
          </div>`);
    if (sure !== 'wipe') { toast('Nothing was changed.', 'info', { mute: true }); return; }
    try {
      for (const s of Object.values(STORES)) await storage.clear(s);
      try { localStorage.clear(); sessionStorage.clear(); } catch { /* storage blocked: nothing kept there either */ }
    } catch (err) { toast(`Could not start over: ${err.message}`, 'error'); return; }
    // A fresh page: every screen re-reads the now-empty records, and the village opens on its first day.
    location.hash = '#/world';
    location.reload();
  });

  /**
   * One of the app's own sheets (never a browser confirm): a title, the
   * body's buttons, and a promise of the `data-do` tapped, or null for
   * Escape, a tap outside, or any `data-close` button.
   */
  function askSheet(eyebrow, title, body) {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'gmenu is-in';
      el.innerHTML = `
        <div class="gmenu__scrim" data-close></div>
        <nav class="gmenu__card" role="dialog">
          <div class="gmenu__head">
            <div>
              <p class="gmenu__eyebrow">${escapeHTML(eyebrow)}</p>
              <h2 class="gmenu__name">${escapeHTML(title)}</h2>
            </div>
            <button class="gmenu__close" data-close aria-label="Close">×</button>
          </div>${body}
        </nav>`;
      document.body.appendChild(el);
      const card = el.querySelector('.gmenu__card');
      let done = false;
      const finish = (v) => {
        if (done) return;
        done = true;
        closeModal(card);
        el.remove();
        resolve(v);
      };
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) { finish(null); return; }
        const act = e.target.closest('[data-do]');
        if (act) finish(act.dataset.do);
      });
      // Escape, a tap outside, and the quiet button all mean the same thing,
      // and that thing is nothing.
      openModal(card, () => finish(null), { label: title });
    });
  }

  async function loadValleyName() {
    try { const r = await storage.get(STORES.SETTINGS, 'valley'); return r?.value?.name ?? null; } catch { return null; }
  }
}
