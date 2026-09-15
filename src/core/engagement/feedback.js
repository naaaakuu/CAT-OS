/**
 * feedback.js — haptics, sound effects, music and motion: the preferences,
 * kept in step.
 *
 * This is the ORCHESTRATION layer. The sound languages themselves live
 * elsewhere (the shell's cues in audio.js; the village's music, ambience
 * and event sounds in world/audio.js); this file owns the preferences,
 * maps semantic cues to a haptic pattern + a named sound, and installs
 * the app-wide press / toggle / paper delegation so every button feels
 * alive without each screen wiring it by hand.
 *
 * Preferences persist as settings records through the StorageAdapter:
 *   { id: 'haptics',           value: boolean }  — default ON where supported
 *   { id: 'sounds',            value: boolean }  — sound effects, default ON
 *   { id: 'sound-volume',      value: 0..1 }     — sound effects volume, default 1
 *   { id: 'world:music',       value: boolean }  — music and ambience, default ON
 *   { id: 'world:music-volume', value: 0..1 }    — music volume, default 1
 *   { id: 'motion',            value: 'full'|'reduced' } — default follows the OS
 *
 * Browsers do not let a page make a sound before the first gesture; the
 * world unlocks its audio on the first tap, so music that is ON begins
 * the moment the learner touches the village, and never before.
 *
 * Haptics: navigator.vibrate where available (mostly Android Chrome;
 * iOS Safari does not expose it — calls no-op silently, by design).
 */

import { STORES } from '../storage/storage-adapter.js';
import { configureAudio, playSound, unlockAudio, queueWelcome } from './audio.js';

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

const state = {
  haptics: true,
  sfx: true,
  sfxVolume: 1,
  music: true,
  musicVolume: 1,
  motion: 'system',
  installed: false,
  welcomeArmed: false,
  listeners: new Set(),
};

export async function initFeedback(storage) {
  try {
    const [h, s, v, m, mv, mo] = await Promise.all([
      storage.get(STORES.SETTINGS, 'haptics'),
      storage.get(STORES.SETTINGS, 'sounds'),
      storage.get(STORES.SETTINGS, 'sound-volume'),
      storage.get(STORES.SETTINGS, 'world:music'),
      storage.get(STORES.SETTINGS, 'world:music-volume'),
      storage.get(STORES.SETTINGS, 'motion'),
    ]);
    if (typeof h?.value === 'boolean') state.haptics = h.value;
    if (typeof s?.value === 'boolean') state.sfx = s.value;
    if (typeof v?.value === 'number' && Number.isFinite(v.value)) state.sfxVolume = Math.max(0, Math.min(1, v.value));
    if (typeof m?.value === 'boolean') state.music = m.value;
    if (typeof mv?.value === 'number' && Number.isFinite(mv.value)) state.musicVolume = Math.max(0, Math.min(1, mv.value));
    if (mo?.value === 'full' || mo?.value === 'reduced' || mo?.value === 'system') state.motion = mo.value;
  } catch {
    /* defaults stand; feedback is never worth an error */
  }
  configureAudio({ enabled: state.sfx, volume: state.sfxVolume });
  if (state.sfx && !state.welcomeArmed) {
    state.welcomeArmed = true;
    queueWelcome();
  }
  emit();
}

export function feedbackPrefs() {
  return {
    haptics: state.haptics,
    sfx: state.sfx, sfxVolume: state.sfxVolume,
    music: state.music, musicVolume: state.musicVolume,
    motion: state.motion,
    // Older call sites read these names.
    sounds: state.sfx, volume: state.sfxVolume,
  };
}

/** True when the learner asked for less motion, or the OS did and they did not say otherwise. */
export function motionReduced() {
  if (state.motion === 'reduced') return true;
  if (state.motion === 'full') return false;
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; } catch { return false; }
}

/** Be told when a preference changes (the world retunes its music live). */
export function onFeedbackChange(fn) { state.listeners.add(fn); return () => state.listeners.delete(fn); }
function emit() { for (const fn of state.listeners) { try { fn(feedbackPrefs()); } catch { /* a listener is never a blocker */ } } }

export async function setFeedbackPref(storage, key, value) {
  const put = (id, v) => storage.put(STORES.SETTINGS, { id, value: v });
  if (key === 'haptics') { state.haptics = !!value; await put('haptics', state.haptics); }
  else if (key === 'sfx' || key === 'sounds') { state.sfx = !!value; configureAudio({ enabled: state.sfx }); await put('sounds', state.sfx); }
  else if (key === 'sfxVolume' || key === 'volume') { state.sfxVolume = Math.max(0, Math.min(1, Number(value) || 0)); configureAudio({ volume: state.sfxVolume }); await put('sound-volume', state.sfxVolume); }
  else if (key === 'music') { state.music = !!value; await put('world:music', state.music); }
  else if (key === 'musicVolume') { state.musicVolume = Math.max(0, Math.min(1, Number(value) || 0)); await put('world:music-volume', state.musicVolume); }
  else if (key === 'motion') { state.motion = value === 'reduced' ? 'reduced' : value === 'full' ? 'full' : 'system'; await put('motion', state.motion); document.documentElement.toggleAttribute('data-reduced-motion', motionReduced()); document.documentElement.setAttribute('data-motion', state.motion); }
  emit();
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
    // Immersive screens own their own sound world (the village and the
    // Language Garden fire their own cues at the code site).
    if (document.documentElement.hasAttribute('data-immersive')) return;
    const el = e.target.closest?.(
      'button, a[href], [role="button"], .segmented__option, cat-option'
    );
    if (!el) return;
    if (el.matches?.('[disabled], [aria-disabled="true"]')) return;
    // Some groups manage their own honest demo (the audio settings).
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
