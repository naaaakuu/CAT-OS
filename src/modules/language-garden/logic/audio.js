/**
 * audio.js — the Root Grove's sound, synthesized live with the Web
 * Audio API. No files, no CDN, offline-safe, matching the project's
 * Web Audio direction (core/engagement/audio.js).
 *
 * Deliberately a SEPARATE, smaller identity from the shell's sound
 * language, not a reuse of it: LANGUAGE_GARDEN_BIBLE §7 asks for "at
 * most two sounds per session: a soft note at the Key, a warm chime at
 * Growth. No tap sounds. No error sounds, ever," which is a much
 * quieter contract than the shell's reward-and-feedback vocabulary
 * (correct/wrong/levelUp/achievement/celebrate). Reusing that engine
 * would either mute those sounds' own identity or leak the garden into
 * the gamified register it is explicitly designed to feel nothing like
 * (Bible §13: no second reward economy). The two share only a
 * philosophy — one pentatonic world, so nothing can ever clash — not
 * code (Rule 5: modules are independent islands).
 *
 * This DOES read the shell's master "Sounds" preference directly
 * (`feedbackPrefs()`, core/engagement/feedback.js) rather than keeping
 * its own enabled/volume state that would need manual syncing at every
 * touchpoint: a module composing core/ is the allowed import direction
 * (Rule 5), and it means a learner who turns app sound off gets a
 * silent garden too, with no extra wiring anywhere. The garden's own
 * Ambience toggle (Settings, off by default) layers on TOP of that —
 * ambience only ever plays if both are on.
 *
 * Import-safe under plain Node (no AudioContext touched until a sound
 * actually plays), so tools/verify.mjs can dry-run this file.
 */

import { feedbackPrefs } from '../../../core/engagement/feedback.js';

const C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392.0, A4 = 440.0;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880.0;

const state = {
  ctx: null,
  master: null,
  noiseBuf: null,
  ambienceOn: false,
  ambienceGain: null,
  ambienceSrc: null,
  chirpTimer: null,
};

/** The garden stays a little quieter than the shell even at the same
 *  master volume — 0 whenever the shell's own Sounds preference is off. */
function gardenGain() {
  const prefs = feedbackPrefs();
  return prefs.sounds ? prefs.volume * 0.82 : 0;
}

function ensureGraph() {
  if (state.ctx) return true;
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return false;
  const ctx = new AC();

  const master = ctx.createGain();
  master.gain.value = 1; // per-sound peaks already carry the actual level (see gardenGain())
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 5200; // softer ceiling than the shell's 7200 — the garden is quieter, never bright
  warm.Q.value = 0.5;
  master.connect(warm).connect(ctx.destination);

  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

  state.ctx = ctx;
  state.master = master;
  state.noiseBuf = buf;
  return true;
}

export function unlockGardenAudio() {
  try {
    if (!feedbackPrefs().sounds) return;
    if (!ensureGraph()) return;
    if (state.ctx.state === 'suspended') state.ctx.resume();
  } catch { /* audio is a bonus, never a blocker */ }
}

function tone(t, { freq, type = 'sine', peak = 0.05, a = 0.01, hold = 0, d = 0.2, pan = 0 }) {
  const c = state.ctx;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + a);
  const rel = t + a + hold;
  if (hold) g.gain.setValueAtTime(peak, rel);
  g.gain.exponentialRampToValueAtTime(0.0001, rel + d);
  o.connect(g);
  if (pan && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    g.connect(p).connect(state.master);
  } else {
    g.connect(state.master);
  }
  o.start(t);
  o.stop(rel + d + 0.05);
}

function grain(t, { peak = 0.02, a = 0.01, d = 0.08, freq = 2400, q = 1.2 }) {
  const c = state.ctx;
  const src = c.createBufferSource();
  src.buffer = state.noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  src.connect(f).connect(g).connect(state.master);
  src.start(t);
  src.stop(t + a + d + 0.05);
}

/* ------------------------------------------------------------------ */
/* The two session sounds Bible §7 names by name, plus two tiny        */
/* construction-mechanic grains. Each takes (t, m) — m is the current  */
/* gardenGain(), so nothing needs to "update" a stored volume.         */
/* ------------------------------------------------------------------ */

const SOUNDS = {
  /** The Key: one soft note, a small question settling into an answer. */
  key(t, m) {
    tone(t, { freq: A4, type: 'sine', peak: 0.05 * m, a: 0.02, d: 0.4 });
    tone(t + 0.16, { freq: D5, type: 'sine', peak: 0.035 * m, a: 0.03, d: 0.5 });
  },
  /** Growth: the one peak per session, warm and unhurried. */
  growth(t, m) {
    tone(t, { freq: C4, type: 'sine', peak: 0.03 * m, a: 0.05, d: 0.9 });
    tone(t + 0.05, { freq: E4, type: 'triangle', peak: 0.03 * m, a: 0.05, d: 0.7 });
    tone(t + 0.22, { freq: G4, type: 'sine', peak: 0.04 * m, a: 0.03, d: 0.6 });
    tone(t + 0.42, { freq: C5, type: 'sine', peak: 0.045 * m, a: 0.02, d: 0.8 });
    tone(t + 0.42, { freq: E5, type: 'sine', peak: 0.012 * m, a: 0.03, d: 0.6, pan: 0.12 });
  },
  /** A tapped word-part: a tiny, soft, woody tick — never a UI click. */
  leafTap(t, m) {
    grain(t, { peak: 0.018 * m, a: 0.004, d: 0.04, freq: 1500, q: 1.4 });
  },
  /** Parts joining into the whole word: a small, round settling sound. */
  bloom(t, m) {
    tone(t, { freq: E5, type: 'sine', peak: 0.03 * m, a: 0.015, d: 0.22 });
    tone(t + 0.05, { freq: G5, type: 'sine', peak: 0.022 * m, a: 0.02, d: 0.26 });
  },
};

export function playGardenSound(name, opts = {}) {
  try {
    const m = gardenGain();
    if (m <= 0) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const fn = SOUNDS[name];
    if (!fn) return;
    if (!ensureGraph()) return;
    if (state.ctx.state === 'suspended') state.ctx.resume();
    fn(state.ctx.currentTime + Math.max(0, opts.delay ?? 0), m);
  } catch { /* feedback is never worth an error */ }
}

/* ------------------------------------------------------------------ */
/* Ambient soundscape (Settings-gated, off by default): a soft breeze   */
/* bed plus rare, distant, synthesized bird phrases. Never loops        */
/* identically — each chirp is a small deterministic-ish variation so   */
/* nothing repeats mechanically over a long sitting.                    */
/* ------------------------------------------------------------------ */

function scheduleChirp() {
  if (!state.ambienceOn) return;
  const delay = 18000 + Math.random() * 24000; // rare: every 18 to 42 seconds
  state.chirpTimer = setTimeout(() => {
    if (!state.ambienceOn || !state.ctx || document.hidden || gardenGain() <= 0) { scheduleChirp(); return; }
    const t = state.ctx.currentTime;
    const m = gardenGain();
    const notes = [A5, C5 * 2, D5 * 2, E5 * 2];
    const phrase = Math.random() < 0.5 ? 2 : 3;
    for (let i = 0; i < phrase; i += 1) {
      const f = notes[Math.floor(Math.random() * notes.length)];
      tone(t + i * (0.09 + Math.random() * 0.05), {
        freq: f, type: 'sine', peak: (0.012 + Math.random() * 0.006) * m,
        a: 0.006, d: 0.08 + Math.random() * 0.05, pan: Math.random() * 1.4 - 0.7,
      });
    }
    scheduleChirp();
  }, delay);
}

/** Starts the breeze + chirp loop. A no-op if the shell's master Sounds
 *  preference is off — the garden's Ambience toggle can be left on
 *  without ever surprising a learner who muted the app. */
export function startGardenAmbience() {
  try {
    if (state.ambienceOn || gardenGain() <= 0) return;
    if (!ensureGraph()) return;
    if (state.ctx.state === 'suspended') state.ctx.resume();
    const c = state.ctx;

    const src = c.createBufferSource();
    // A short, softly filtered noise loop reused as a breeze bed —
    // the same buffer the leaf/bloom grains use, just looped and low.
    src.buffer = state.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    f.Q.value = 0.4;
    const g = c.createGain();
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.setTargetAtTime(0.028 * gardenGain(), c.currentTime, 1.2);
    src.connect(f).connect(g).connect(state.master);
    src.start();

    state.ambienceGain = g;
    state.ambienceSrc = src;
    state.ambienceOn = true;
    scheduleChirp();
  } catch { /* silently fine */ }
}

export function stopGardenAmbience() {
  state.ambienceOn = false;
  if (state.chirpTimer) { clearTimeout(state.chirpTimer); state.chirpTimer = null; }
  if (!state.ambienceGain || !state.ctx) return;
  const g = state.ambienceGain;
  const src = state.ambienceSrc;
  state.ambienceGain = null;
  state.ambienceSrc = null;
  try {
    const t = state.ctx.currentTime;
    g.gain.setTargetAtTime(0, t, 0.4);
    setTimeout(() => { try { src.stop(); src.disconnect(); g.disconnect(); } catch { /* already stopped */ } }, 1200);
  } catch { /* silently fine */ }
}

export function isGardenAmbiencePlaying() {
  return state.ambienceOn;
}

export const GARDEN_SOUND_NAMES = Object.freeze(Object.keys(SOUNDS));
