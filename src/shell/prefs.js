/**
 * prefs.js — the three appearance preferences the shell applies at BOOT:
 * theme, reading size and motion.
 *
 * These live apart from settings.js on purpose. The settings SCREEN pulls in
 * the backup writer, the toast, both sound engines and the world's audio
 * graph — a hundred kilobytes a learner opening the village has not asked
 * for — but the three functions below have to run before the first paint, or
 * the app flashes light at somebody who chose dark. So the boot path imports
 * this file, and settings.js is loaded only when Settings is opened.
 *
 * settings.js re-exports everything here, so every older import still works.
 */

import { STORES } from '../core/storage/storage-adapter.js';
import { feedbackPrefs, motionReduced } from '../core/engagement/feedback.js';

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
  /* Anything painted rather than styled — the room stage's canvas above
     all — cannot hear a CSS variable change. One event, so the theme is
     still a single switch and no screen has to poll for it. */
  try { window.dispatchEvent(new CustomEvent('catos:theme', { detail: { theme } })); } catch { /* pre-DOM */ }
}

export const READING_SIZES = ['s', 'm', 'l', 'xl'];
export async function loadReadingSize(storage) {
  try { const record = await storage.get(STORES.SETTINGS, 'reading-size'); return READING_SIZES.includes(record?.value) ? record.value : 'm'; } catch { return 'm'; }
}
export function applyReadingSize(size) {
  if (size === 'm') document.documentElement.removeAttribute('data-reading');
  else document.documentElement.setAttribute('data-reading', size);
}

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
