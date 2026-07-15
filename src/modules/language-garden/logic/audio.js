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

const C3 = 130.81, E3 = 164.81, G3 = 196.0, A3 = 220.0;
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

/** Tracks the shell's own master volume 1:1 — 0 whenever the shell's Sounds
 *  preference is off. An earlier pass held this back to 0.82x "to stay a
 *  little quieter than the shell," but on a real phone speaker at the
 *  Bible's own 40-50% target that made several events (Commitment, the
 *  assembly tick, Bloom) sit below the threshold of being reliably heard.
 *  Warmth and restraint now come entirely from each sound's own envelope
 *  and the compressor/lowpass glue below, not from an extra gain penalty. */
function gardenGain() {
  const prefs = feedbackPrefs();
  return prefs.sounds ? prefs.volume : 0;
}

function ensureGraph() {
  if (state.ctx) return true;
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return false;
  const ctx = new AC();

  // The warm chain, mirroring the shell's own (gain → compressor → lowpass):
  // a gentle compressor glues the mix and tames peaks so nothing is ever
  // harsh, even if the learner turns the system up; a low ceiling keeps the
  // garden warm rather than bright. This is the "warm, clear, never harsh at
  // 40–50% volume" mandate expressed in the graph, not in raw loudness.
  const master = ctx.createGain();
  master.gain.value = 1; // per-sound peaks already carry the actual level (see gardenGain())
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -20; // linear ~0.1 — the growth chord sums to about here, so it compresses gently
  glue.knee.value = 26;       // a soft knee: warmth, never a pump
  glue.ratio.value = 3;
  glue.attack.value = 0.006;  // let the soft attacks through, catch only the peak
  glue.release.value = 0.2;
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 4900; // clears the 2–4 kHz band that turns tinny/harsh, but leaves enough
  warm.Q.value = 0.6;          // presence through for the quieter events to still read on a phone speaker
  master.connect(glue).connect(warm).connect(ctx.destination);

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
/* The garden's small sound set (Bible §10). Everything is sine-based   */
/* (no harsh harmonics), every attack is soft (no click), and the whole */
/* set is balanced so GROWTH is unmistakably the loudest event — the    */
/* one peak per session — while COMMIT is barely a touch. Each takes    */
/* (t, m, opts): m is the current gardenGain(), opts carries a rising   */
/* step for the assembly. Nothing here stores a volume to "update".     */
/* ------------------------------------------------------------------ */

const ASSEMBLY_STEPS = [C4, D4, E4, G4, A4, C5]; // rising, so a 3-part word climbs

const SOUNDS = {
  /** Commitment (§10.5 #1): the sound of *you chose*, never *you were right* —
   *  identical for a right and a wrong answer (Law 7). One warm note with a
   *  soft octave of body underneath, quiet enough to be a touch, not an event. */
  commit(t, m) {
    tone(t, { freq: C4, type: 'sine', peak: 0.042 * m, a: 0.012, d: 0.20 });
    tone(t, { freq: C3, type: 'sine', peak: 0.020 * m, a: 0.020, d: 0.26 });
  },
  /** The Key (§10.5 #2): something opening. A low body, a warm mid note, and
   *  a gentle rise settling a fifth above — a small question finding its answer. */
  key(t, m) {
    tone(t, { freq: A3, type: 'sine', peak: 0.026 * m, a: 0.03, hold: 0.05, d: 0.55 });
    tone(t, { freq: A4, type: 'sine', peak: 0.052 * m, a: 0.02, d: 0.42 });
    tone(t + 0.16, { freq: D5, type: 'sine', peak: 0.036 * m, a: 0.03, d: 0.5 });
  },
  /** Growth (§10.5 #4): the peak, and the ONLY sound with harmony. A warm low
   *  body, a sustained fifth held gently underneath (the harmony), and a rising
   *  pentatonic figure that blooms and resolves on a long, ringing tail — the
   *  sound you pause and smile at. Kept in a warm register (nothing above C5). */
  growth(t, m) {
    tone(t,        { freq: C3, type: 'sine', peak: 0.050 * m, a: 0.06, hold: 0.14, d: 1.5 });   // body
    tone(t + 0.02, { freq: G3, type: 'sine', peak: 0.030 * m, a: 0.09, hold: 0.26, d: 1.3, pan: -0.14 }); // harmony
    tone(t + 0.02, { freq: C4, type: 'sine', peak: 0.028 * m, a: 0.09, hold: 0.26, d: 1.3, pan: 0.14 });
    tone(t,        { freq: E4, type: 'sine', peak: 0.038 * m, a: 0.035, d: 0.70 });  // the figure blooms…
    tone(t + 0.17, { freq: G4, type: 'sine', peak: 0.042 * m, a: 0.035, d: 0.85 });
    tone(t + 0.36, { freq: C5, type: 'sine', peak: 0.054 * m, a: 0.04,  d: 1.20 });  // …and resolves, ringing
  },
  /** A tapped word-part (§10.5 #3, assembly): a soft pitched tick that RISES
   *  with each part, so assembling a three-part word is a small climbing figure.
   *  A hair of woody grain gives it body without a UI-click edge. */
  leafTap(t, m, { step = 0 } = {}) {
    const f = ASSEMBLY_STEPS[Math.min(step, ASSEMBLY_STEPS.length - 1)];
    tone(t, { freq: f, type: 'sine', peak: 0.032 * m, a: 0.006, d: 0.18 });
    grain(t, { peak: 0.014 * m, a: 0.003, d: 0.04, freq: 1400, q: 1.4 });
  },
  /** Parts joining into the whole word: a warm, round settle, a step above the
   *  last tap — the figure landing. */
  bloom(t, m) {
    tone(t, { freq: G4, type: 'sine', peak: 0.040 * m, a: 0.012, d: 0.24 });
    tone(t + 0.05, { freq: C5, type: 'sine', peak: 0.032 * m, a: 0.016, d: 0.30 });
  },
};

/** Soft haptics, layered under the sounds (§14.5). Exactly two moments carry
 *  a buzz: commitment (a light tick, the same for right and wrong) and growth
 *  (a warmer, longer thump — the physical half of the peak, so it survives
 *  with sound off). Gated by the shell's own haptics preference. */
const HAPTICS = { commit: 12, growth: [16, 22, 34] };

function gardenVibrate(name) {
  try {
    const pattern = HAPTICS[name];
    if (!pattern || !feedbackPrefs().haptics) return;
    navigator.vibrate?.(pattern);
  } catch { /* unsupported — silent by design */ }
}

export function playGardenSound(name, opts = {}) {
  try {
    const m = gardenGain();
    if (m <= 0) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    const fn = SOUNDS[name];
    if (!fn) return;
    if (!ensureGraph()) return;
    if (state.ctx.state === 'suspended') state.ctx.resume();
    fn(state.ctx.currentTime + Math.max(0, opts.delay ?? 0), m, opts);
  } catch { /* feedback is never worth an error */ }
}

/** The one cue API for the garden: sound + haptic together, mirroring the
 *  shell's cue(). A sound with no haptic (key, leafTap, bloom) simply plays. */
export function gardenCue(name, opts = {}) {
  gardenVibrate(name);
  playGardenSound(name, opts);
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
 *  without ever surprising a learner who muted the app.
 *
 *  @param {number} [streamLevel] 0..1, from logic/effort.js
 *         computeStreamLevel() — "the audio bed whose gain = consistency"
 *         (Roadmap 3.1). The breeze bed itself never changes shape, only
 *         how present it is: a well-tended valley is a little louder with
 *         running water, a quiet one a little quieter, and it never goes
 *         fully silent (the Stream's own hard floor, §4.2). Defaults to 1
 *         (full presence) so every existing caller that does not know
 *         about the Stream keeps its exact prior behaviour. */
export function startGardenAmbience(streamLevel = 1) {
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
    const level = Math.max(0, Math.min(1, streamLevel));
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.setTargetAtTime(0.028 * gardenGain() * (0.5 + 0.5 * level), c.currentTime, 1.2);
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
