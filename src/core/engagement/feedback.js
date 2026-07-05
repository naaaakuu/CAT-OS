/**
 * feedback.js — haptics and sound, both whisper-quiet.
 *
 * Preferences persist as settings records through the StorageAdapter:
 *   { id: 'haptics', value: boolean }  — default ON where supported
 *   { id: 'sounds',  value: boolean }  — default OFF (opt-in)
 *
 * Haptics: navigator.vibrate where available (mostly Android Chrome;
 * iOS Safari does not expose it — calls no-op silently, by design).
 *
 * Sound: tiny synthesized WebAudio blips — no audio files, nothing to
 * cache, nothing to license. The AudioContext is created lazily inside
 * a user gesture (autoplay policy). HONESTY NOTE: whether WebAudio is
 * silenced by the iOS hardware mute switch varies by iOS version and
 * context — do not rely on it; that is one reason sounds default OFF
 * and the toggle sits in Settings.
 */

import { STORES } from '../storage/storage-adapter.js';

const PATTERNS = {
  tap:        [4],
  correct:    [10],
  wrong:      [24],
  levelup:    [10, 60, 18],
  achievement:[8, 40, 8, 40, 14],
};

// Frequencies (Hz) and per-note seconds for each cue — quiet, short, dry.
const TONES = {
  tap:         [[880, 0.03]],
  correct:     [[660, 0.05], [880, 0.07]],
  wrong:       [[196, 0.09]],
  levelup:     [[523, 0.06], [659, 0.06], [784, 0.1]],
  achievement: [[587, 0.06], [740, 0.06], [880, 0.1]],
};

const state = {
  haptics: true,
  sounds: false,
  audio: null, // lazy AudioContext
};

export async function initFeedback(storage) {
  try {
    const h = await storage.get(STORES.SETTINGS, 'haptics');
    const s = await storage.get(STORES.SETTINGS, 'sounds');
    if (typeof h?.value === 'boolean') state.haptics = h.value;
    if (typeof s?.value === 'boolean') state.sounds = s.value;
  } catch { /* defaults stand; feedback is never worth an error */ }
}

export function feedbackPrefs() {
  return { haptics: state.haptics, sounds: state.sounds };
}

export async function setFeedbackPref(storage, key, value) {
  if (key !== 'haptics' && key !== 'sounds') return;
  state[key] = value;
  await storage.put(STORES.SETTINGS, { id: key, value });
}

function vibrate(kind) {
  if (!state.haptics) return;
  try { navigator.vibrate?.(PATTERNS[kind]); } catch { /* unsupported */ }
}

function play(kind) {
  if (!state.sounds) return;
  try {
    state.audio ??= new (window.AudioContext ?? window.webkitAudioContext)();
    const ctx = state.audio;
    if (ctx.state === 'suspended') ctx.resume();
    let t = ctx.currentTime;
    for (const [freq, dur] of TONES[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.04, t + 0.01); // whisper level
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      t += dur * 0.9;
    }
  } catch { /* audio unavailable — silently fine */ }
}

/** The one public cue API. Kinds: tap · correct · wrong · levelup · achievement */
export function cue(kind) {
  if (!(kind in PATTERNS)) return;
  vibrate(kind);
  play(kind);
}
