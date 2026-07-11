/**
 * feedback.js — haptics and sound, both whisper-quiet, kept in step.
 *
 * This is the ORCHESTRATION layer. The sound language itself (every
 * synthesized voice) lives in audio.js; this file owns preferences,
 * maps semantic cues to a haptic pattern + a named sound, and installs
 * the app-wide press / toggle / paper delegation so every button feels
 * alive without each screen wiring it by hand.
 *
 * Preferences persist as settings records through the StorageAdapter:
 *   { id: 'haptics',      value: boolean }  — default ON where supported
 *   { id: 'sounds',       value: boolean }  — default OFF (opt-in)
 *   { id: 'sound-volume', value: 0..1 }     — master volume, default 0.7
 *
 * Haptics: navigator.vibrate where available (mostly Android Chrome;
 * iOS Safari does not expose it — calls no-op silently, by design).
 * Haptics layer naturally with sound: cue() fires both at once, and the
 * short haptic durations here are tuned to sit under the sound envelopes.
 *
 * Sound: see audio.js. HONESTY NOTE: whether Web Audio is silenced by
 * the iOS hardware mute switch varies by iOS version and context — we
 * cannot detect it reliably, so we do the honest things instead: sound
 * defaults OFF, there is a Settings toggle AND a master volume, we never
 * play while the tab is hidden, and we never interrupt reading (no cue
 * fires from scrolling or from the reading surface itself).
 */

import { STORES } from '../storage/storage-adapter.js';
import { configureAudio, playSound, unlockAudio, queueWelcome, configureFocusNoise } from './audio.js';

/*
 * The cue table — the single source of truth mapping a semantic moment
 * to a haptic pattern (navigator.vibrate; null = no buzz) and a sound
 * name (must exist in audio.js). tools/verify.mjs cross-checks every
 * `sound` here against SOUND_NAMES so the two files can never drift.
 */
const CUES = {
  open:           { haptic: null,                     sound: 'open' },
  tap:            { haptic: [4],                       sound: 'tap' },
  toggle:         { haptic: [6],                       sound: 'toggle' },
  cardOpen:       { haptic: null,                      sound: 'cardOpen' }, // paper, no buzz
  correct:        { haptic: [10],                      sound: 'correct' },
  wrong:          { haptic: [18],                      sound: 'wrong' },
  sparkle:        { haptic: null,                      sound: 'sparkle' },
  reflect:        { haptic: [8],                       sound: 'reflect' },
  lessonComplete: { haptic: [10, 40, 14],              sound: 'lessonComplete' },
  levelup:        { haptic: [10, 60, 18],              sound: 'levelUp' },
  achievement:    { haptic: [8, 40, 8, 40, 14],        sound: 'achievement' },
  streak:         { haptic: [8, 30, 10],              sound: 'streak' },
  mentor:         { haptic: null,                      sound: 'mentor' },
  notify:         { haptic: null,                      sound: 'notify' },
  backupOk:       { haptic: [6, 30, 8],               sound: 'backupOk' },
  restore:        { haptic: [8, 40, 10],              sound: 'restore' },
  error:          { haptic: [12],                      sound: 'error' },
  dailyGoal:      { haptic: [10, 50, 10, 50, 16],      sound: 'dailyGoal' },
  celebrate:      { haptic: null,                      sound: 'celebrate' },
};

/** Exposed so tools/verify.mjs can assert every cue points at a real sound. */
export const CUE_SOUND_MAP = Object.freeze(
  Object.fromEntries(Object.entries(CUES).map(([k, v]) => [k, v.sound]))
);

const DEFAULT_VOLUME = 0.7;

const state = {
  haptics: true,
  sounds: false,
  volume: DEFAULT_VOLUME,
  focusNoise: false,
  focusVolume: 0.35,
  installed: false,
  welcomeArmed: false, // the opening chime is queued at most once per app load
};

export async function initFeedback(storage) {
  try {
    const [h, s, v, fn, fv] = await Promise.all([
      storage.get(STORES.SETTINGS, 'haptics'),
      storage.get(STORES.SETTINGS, 'sounds'),
      storage.get(STORES.SETTINGS, 'sound-volume'),
      storage.get(STORES.SETTINGS, 'focus-noise'),
      storage.get(STORES.SETTINGS, 'focus-volume'),
    ]);
    if (typeof h?.value === 'boolean') state.haptics = h.value;
    if (typeof s?.value === 'boolean') state.sounds = s.value;
    if (typeof v?.value === 'number' && Number.isFinite(v.value)) {
      state.volume = Math.max(0, Math.min(1, v.value));
    }
    if (typeof fn?.value === 'boolean') state.focusNoise = fn.value;
    if (typeof fv?.value === 'number' && Number.isFinite(fv.value)) {
      state.focusVolume = Math.max(0, Math.min(1, fv.value));
    }
  } catch {
    /* defaults stand; feedback is never worth an error */
  }
  configureAudio({ enabled: state.sounds, volume: state.volume });
  configureFocusNoise({ enabled: state.focusNoise, volume: state.focusVolume });
  // The opening chime sounds on the first gesture — armed once per load, so
  // re-reading prefs (e.g. after a backup import) never replays it.
  if (state.sounds && !state.welcomeArmed) {
    state.welcomeArmed = true;
    queueWelcome();
  }
}

export function feedbackPrefs() {
  return { 
    haptics: state.haptics, 
    sounds: state.sounds, 
    volume: state.volume,
    focusNoise: state.focusNoise,
    focusVolume: state.focusVolume
  };
}

export async function setFeedbackPref(storage, key, value) {
  if (key === 'haptics') {
    state.haptics = !!value;
    await storage.put(STORES.SETTINGS, { id: 'haptics', value: state.haptics });
  } else if (key === 'sounds') {
    state.sounds = !!value;
    configureAudio({ enabled: state.sounds });
    await storage.put(STORES.SETTINGS, { id: 'sounds', value: state.sounds });
  } else if (key === 'volume') {
    state.volume = Math.max(0, Math.min(1, Number(value) || 0));
    configureAudio({ volume: state.volume });
    await storage.put(STORES.SETTINGS, { id: 'sound-volume', value: state.volume });
  } else if (key === 'focusNoise') {
    state.focusNoise = !!value;
    configureFocusNoise({ enabled: state.focusNoise });
    await storage.put(STORES.SETTINGS, { id: 'focus-noise', value: state.focusNoise });
  } else if (key === 'focusVolume') {
    state.focusVolume = Math.max(0, Math.min(1, Number(value) || 0));
    configureFocusNoise({ volume: state.focusVolume });
    await storage.put(STORES.SETTINGS, { id: 'focus-volume', value: state.focusVolume });
  }
}

function vibrate(pattern) {
  if (!state.haptics || !pattern) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

/**
 * The one public cue API: fires haptics + sound for a semantic moment.
 * Kinds are the keys of CUES. `opts` is forwarded to playSound
 * ({ delay, gain }) so callers can space a reward after a signature.
 */
export function cue(kind, opts = {}) {
  const c = CUES[kind];
  if (!c) return;
  vibrate(c.haptic);
  playSound(c.sound, opts);
}

/* ------------------------------------------------------------------ */
/* App-wide delegation — one place, so every button feels alive.       */
/*                                                                     */
/* · Press: a tiny click on any button / link.                        */
/* · Toggle: a wooden tick on segmented options and answer choices.   */
/* · Paper: a page sound whenever a <details> card opens.             */
/* · Unlock: the first gesture resumes audio and plays the welcome.   */
/*                                                                     */
/* Semantic sounds (correct, cardOpen on a specific reveal, mentor…)   */
/* are still fired at their code sites and LAYER on top of these —     */
/* the click is the finger, the tone is the meaning.                   */
/* ------------------------------------------------------------------ */

export function installGlobalFeedback() {
  if (state.installed || typeof document === 'undefined') return;
  state.installed = true;

  // First gesture: unlock the AudioContext (autoplay policy) + welcome.
  const unlock = () => unlockAudio();
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });

  // Press / toggle micro-feedback for interactive elements.
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.(
      'button, a[href], [role="button"], .segmented__option, cat-option'
    );
    if (!el) return;
    // A disabled control emits no click, but guard anyway.
    if (el.matches?.('[disabled], [aria-disabled="true"]')) return;
    // Some groups manage their own honest demo (the Feedback settings).
    if (el.closest?.('[data-sfx="off"]')) return;

    const isToggle = el.closest?.('.segmented') || el.closest?.('cat-option')
      || el.getAttribute?.('role') === 'switch';
    cue(isToggle ? 'toggle' : 'tap');
  });

  // Paper: a <details> opening is the app's "card opening" gesture. The
  // toggle event does not bubble, so we listen in the capture phase.
  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d?.tagName === 'DETAILS' && d.open) playSound('cardOpen');
  }, true);
}
