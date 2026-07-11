/**
 * audio.js — the CAT OS sound language, synthesized live with the Web
 * Audio API. No audio files, nothing to download, cache, or license
 * (TECH_STACK durability): every sound is a few oscillators and a
 * filtered-noise grain, built at whisper level for long study sessions.
 *
 * THE IDENTITY (why these sounds feel like one family):
 *
 *  · One tonal world. Every pitched sound is drawn from a single
 *    C-major PENTATONIC scale (C D E G A across octaves). A pentatonic
 *    has no semitone clashes, so any two grains that overlap are always
 *    consonant — layering can never turn ugly, and nothing ever sounds
 *    "wrong". This is what lets correct/incorrect, XP ticks, and a
 *    celebration coexist without fatigue.
 *  · One motif. A rising C–E–G "bloom" (the major triad) is the reward
 *    signature; it appears, more and more complete, in lessonComplete →
 *    levelUp → dailyGoal. Hearing a fragment of it predicts reward
 *    (reward prediction), and the fuller statements resolve it.
 *  · One color for the mentor. A soft Cmaj9 (adds the 9th, D) is lush
 *    and "thoughtful" without dissonance — the mentor's recurring voice,
 *    also hinted in the opening chime so the app's welcome and its
 *    mentor rhyme.
 *  · Three timbre families: CLICKS (filtered-noise ticks — buttons,
 *    toggles), PAPER (band-passed noise sweeps — cards), and CHIMES
 *    (sine/triangle voices with soft attacks — every reward and cue).
 *
 * PSYCHOACOUSTICS applied: anticipation→resolution (two-note rises that
 * land on a stable tone), reward prediction (the motif), variable
 * reinforcement (tiny random detune / top-note choice on "correct" so it
 * never feels mechanical, always inside the pentatonic so always pretty),
 * pleasant intervals (fifths, thirds, octaves), and anti-fatigue (low
 * level, short envelopes, a master low-pass that removes shrillness, and
 * calmer variants under reduced-motion).
 *
 * CONTRACT: this module is pure and side-effect-free at import time — it
 * touches no `window`/`AudioContext` until a sound is actually played, so
 * it imports cleanly under Node (tools/verify.mjs checks the registry).
 * Every entry point is wrapped so audio can NEVER throw into the app;
 * feedback is never worth an error.
 *
 * State (enabled + master volume) is owned here and configured by
 * feedback.js from the StorageAdapter. Components that need sound only
 * (toast, xp-bar, celebration) import this directly; anything that also
 * needs haptics goes through feedback.js `cue()`.
 */

/* ------------------------------------------------------------------ */
/* Tonal material — one C-major pentatonic world (Hz, equal temper).   */
/* ------------------------------------------------------------------ */

const C3 = 130.81, E3 = 164.81, G3 = 196.0, A3 = 220.0;
const C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392.0, A4 = 440.0;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880.0;
const C6 = 1046.5, D6 = 1174.66, E6 = 1318.51, G6 = 1567.98;

// F4 sits OUTSIDE the pentatonic on purpose: the error tone is deliberately
// NEUTRAL — not a member of the "reward" world — so it reads as information,
// never as a wrong note in a melody.
const F4v = 349.23;

/** Ascending ladder for XP counting — a pentatonic run that always lands well. */
const XP_LADDER = [C5, D5, E5, G5, A5, C6, D6, E6, G6];

/* ------------------------------------------------------------------ */
/* Module state                                                        */
/* ------------------------------------------------------------------ */

const state = {
  enabled: false, // default OFF (opt-in) — mirrors the stored pref
  volume: 0.7, // master 0..1
  ctx: null, // lazy AudioContext
  master: null, // GainNode → compressor → lowpass → destination
  noiseBuf: null, // one shared 1s white-noise buffer (tiny, reused)
  welcomePending: false, // a queued opening chime, played on first gesture
  installed: false, // global-listener guard (set by feedback.js caller)
  focusEnabled: false,
  focusVolume: 0.35,
  brownBuf: null,
  focusNode: null, // the GainNode for the active focus noise
  focusSrc: null, // the active BufferSource for focus noise
};

function reduced() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

/** Configure enabled + master volume (called by feedback.js). */
export function configureAudio({ enabled, volume } = {}) {
  if (typeof enabled === 'boolean') state.enabled = enabled;
  if (typeof volume === 'number' && Number.isFinite(volume)) {
    state.volume = Math.max(0, Math.min(1, volume));
  }
  if (state.master && state.ctx) {
    // A gentle ramp avoids a click when the user drags the volume.
    const t = state.ctx.currentTime;
    state.master.gain.cancelScheduledValues(t);
    state.master.gain.setTargetAtTime(state.volume, t, 0.02);
  }
}

export function configureFocusNoise({ enabled, volume } = {}) {
  if (typeof enabled === 'boolean') {
    state.focusEnabled = enabled;
    if (!enabled && state.focusNode) stopFocusNoise();
  }
  if (typeof volume === 'number' && Number.isFinite(volume)) {
    state.focusVolume = Math.max(0, Math.min(1, volume));
    if (state.focusNode && state.ctx) {
      const t = state.ctx.currentTime;
      state.focusNode.gain.cancelScheduledValues(t);
      state.focusNode.gain.setTargetAtTime(state.focusVolume * 0.15, t, 0.02);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Audio graph — built once, lazily, inside a user gesture.            */
/*   master(gain) → compressor(soft limiter) → lowpass(warmth) → out   */
/* ------------------------------------------------------------------ */

function ensureGraph() {
  if (state.ctx) return true;
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return false;
  const ctx = new AC();

  const master = ctx.createGain();
  master.gain.value = state.volume;

  // A soft limiter so overlapping grains never clip or bite — "premium"
  // is partly the absence of harshness.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 24;
  comp.ratio.value = 3;
  comp.attack.value = 0.004;
  comp.release.value = 0.18;

  // A master low-pass keeps everything warm and removes the fizz that
  // makes UI sound fatiguing over an hour of study.
  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 7200;
  warm.Q.value = 0.5;

  master.connect(comp).connect(warm).connect(ctx.destination);

  // One second of white noise, reused by every click/paper sound.
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

  // Four seconds of brown noise (integrated white noise with a leak).
  const brownLen = ctx.sampleRate * 4;
  const bBuf = ctx.createBuffer(1, brownLen, ctx.sampleRate);
  const bData = bBuf.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < brownLen; i += 1) {
    const white = Math.random() * 2 - 1;
    // 0.98 leak factor prevents DC drift and bounds the signal
    bData[i] = (lastOut * 0.98) + (white * 0.02);
    lastOut = bData[i];
  }
  // Normalize the brown noise to [-1, 1] for maximum dynamic range before gain
  let max = 0;
  for (let i = 0; i < brownLen; i += 1) {
    if (Math.abs(bData[i]) > max) max = Math.abs(bData[i]);
  }
  if (max > 0) {
    for (let i = 0; i < brownLen; i += 1) bData[i] /= max;
  }

  // Ensure focus noise never loops silently if the tab is hidden
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopFocusNoise();
    });
  }

  state.ctx = ctx;
  state.master = master;
  state.noiseBuf = buf;
  state.brownBuf = bBuf;
  return true;
}

/**
 * Resume the context inside a user gesture (autoplay policy) and play
 * any queued opening chime. Safe to call on every early gesture.
 */
export function unlockAudio() {
  try {
    if (!state.enabled) return;
    if (!ensureGraph()) return;
    if (state.ctx.state === 'suspended') state.ctx.resume();
    if (state.welcomePending) {
      state.welcomePending = false;
      // A touch of air after the gesture so the chime feels like a reply.
      playSound('open', { delay: 0.03 });
    }
  } catch {
    /* audio unavailable — silently fine */
  }
}

/** Queue the opening chime to sound on the first user gesture. */
export function queueWelcome() {
  if (state.enabled) state.welcomePending = true;
}

/* ------------------------------------------------------------------ */
/* Synthesis primitives                                                */
/* ------------------------------------------------------------------ */

const ctx = () => state.ctx;

function panned(node, pan) {
  const c = state.ctx;
  if (pan && c.createStereoPanner) {
    const p = c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    node.connect(p).connect(state.master);
  } else {
    node.connect(state.master);
  }
}

/** One pitched voice with a soft ADSR-ish envelope. */
function tone(t, { freq, type = 'sine', peak = 0.05, a = 0.006, hold = 0, d = 0.14, detune = 0, glideTo = 0, glideT = 0.05, pan = 0 }) {
  const c = state.ctx;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + glideT);
  if (detune) o.detune.setValueAtTime(detune, t);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  const rel = t + a + hold;
  if (hold) g.gain.setValueAtTime(peak, rel);
  g.gain.exponentialRampToValueAtTime(0.0001, rel + d);
  o.connect(g);
  panned(g, pan);
  o.start(t);
  o.stop(rel + d + 0.04);
}

/** One filtered-noise grain — the click and paper family. */
function noise(t, { peak = 0.04, a = 0.004, d = 0.05, type = 'bandpass', freq = 1800, q = 0.8, glideTo = 0, pan = 0 }) {
  const c = state.ctx;
  const src = c.createBufferSource();
  src.buffer = state.noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  f.Q.value = q;
  if (glideTo) f.frequency.exponentialRampToValueAtTime(glideTo, t + a + d);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  src.connect(f).connect(g);
  panned(g, pan);
  src.start(t);
  src.stop(t + a + d + 0.06);
}

/** A soft sustained chord bed under the bigger rewards (warmth, body). */
function pad(t, freqs, { peak = 0.02, a = 0.05, d = 0.6, type = 'sine' } = {}) {
  for (const freq of freqs) tone(t, { freq, type, peak, a, hold: 0.04, d });
}

/* ------------------------------------------------------------------ */
/* The sound language — one function per named sound.                  */
/* Each receives (t = start time, gain = per-call multiplier).         */
/* ------------------------------------------------------------------ */

const SOUNDS = {
  /* 1 · App opening — a soft welcome that hints the mentor's Cmaj9. */
  open(t, m) {
    tone(t, { freq: C3, type: 'sine', peak: 0.02 * m, a: 0.05, d: 0.7 });
    tone(t, { freq: G4, type: 'triangle', peak: 0.035 * m, a: 0.04, d: 0.5 });
    tone(t + 0.12, { freq: C5, type: 'sine', peak: 0.04 * m, a: 0.03, d: 0.6 });
    tone(t + 0.24, { freq: D5, type: 'sine', peak: 0.02 * m, a: 0.05, d: 0.7 }); // the 9th — a breath of the mentor color
  },

  /* 2 · Button press — a tiny tactile click. */
  tap(t, m) {
    noise(t, { peak: 0.03 * m, a: 0.001, d: 0.016, freq: 2200, q: 0.9 });
    tone(t, { freq: C6, type: 'sine', peak: 0.012 * m, a: 0.001, d: 0.03 });
  },

  /* 3 · Toggle switch — a soft wooden tick (low thock + click). */
  toggle(t, m) {
    tone(t, { freq: 190, type: 'triangle', peak: 0.05 * m, a: 0.002, d: 0.06, glideTo: 150, glideT: 0.05 });
    noise(t, { peak: 0.03 * m, a: 0.001, d: 0.012, freq: 1000, q: 1.1 });
  },

  /* 4 · Card opening — a gentle paper movement (a settling "shff"). */
  cardOpen(t, m) {
    noise(t, { peak: 0.026 * m, a: 0.02, d: 0.16, freq: 3000, q: 0.5, glideTo: 1400 });
    noise(t + 0.02, { peak: 0.016 * m, a: 0.02, d: 0.13, freq: 1000, q: 0.6, glideTo: 700 });
  },

  /* 5 · Correct — satisfying but subtle: a rising resolve, with a tiny
     variable top note so it never feels mechanical (always pentatonic). */
  correct(t, m) {
    const top = Math.random() < 0.4 ? A5 : G5; // variable reinforcement
    const det = (Math.random() * 8 - 4); // ±4 cents warmth
    tone(t, { freq: E5, type: 'sine', peak: 0.04 * m, a: 0.004, d: 0.13 });
    tone(t, { freq: E6, type: 'sine', peak: 0.01 * m, a: 0.004, d: 0.1 });
    tone(t + 0.08, { freq: top, type: 'sine', peak: 0.05 * m, a: 0.005, d: 0.2, detune: det });
    tone(t + 0.08, { freq: top * 2, type: 'sine', peak: 0.012 * m, a: 0.005, d: 0.14 });
  },

  /* 6 · Incorrect — helpful, never punishment: a warm major-third settle
     down to the tonic (calm, resolved), low and soft. No dissonance. */
  wrong(t, m) {
    tone(t, { freq: E4, type: 'triangle', peak: 0.04 * m, a: 0.006, d: 0.16 });
    tone(t + 0.09, { freq: C4, type: 'triangle', peak: 0.045 * m, a: 0.008, d: 0.22 });
    tone(t, { freq: C3, type: 'sine', peak: 0.016 * m, a: 0.02, d: 0.3 }); // warm floor
  },

  /* 7 · Excellent explanation / evidence — a small rewarding sparkle. */
  sparkle(t, m) {
    const grains = reduced() ? [C5, G5] : [C5, E5, G5, C6];
    grains.forEach((f, i) => {
      tone(t + i * 0.035, { freq: f, type: 'sine', peak: 0.02 * m, a: 0.003, d: 0.09, pan: (i - 1.5) * 0.12 });
    });
  },

  /* 8 · Reflection kept — a warm confirmation: an open rising fifth
     over a soft pad (affirming, "kept"). */
  reflect(t, m) {
    pad(t, [C3, G3], { peak: 0.016 * m, d: 0.5 });
    tone(t, { freq: C4, type: 'triangle', peak: 0.04 * m, a: 0.01, d: 0.18 });
    tone(t + 0.09, { freq: G4, type: 'sine', peak: 0.042 * m, a: 0.012, d: 0.3 });
  },

  /* 9 · Lesson complete — the bloom motif, stated simply (G→C→E→G). */
  lessonComplete(t, m) {
    pad(t, [C4, E4, G4], { peak: 0.014 * m, d: 0.8 });
    const seq = [[G4, 0], [C5, 0.13], [E5, 0.26], [G5, 0.4]];
    seq.forEach(([f, dt], i) => {
      tone(t + dt, { freq: f, type: 'sine', peak: (0.04 + i * 0.003) * m, a: 0.006, d: 0.22 + i * 0.05 });
    });
    tone(t + 0.4, { freq: G5 * 2, type: 'sine', peak: 0.01 * m, a: 0.006, d: 0.3 }); // shimmer
  },

  /* 10 · Level up — premium, clean ascending arpeggio to a bell C6. */
  levelUp(t, m) {
    tone(t, { freq: C3, type: 'sine', peak: 0.02 * m, a: 0.01, d: 0.5 }); // body
    const seq = [[C5, 0], [E5, 0.1], [G5, 0.2]];
    seq.forEach(([f, dt]) => tone(t + dt, { freq: f, type: 'sine', peak: 0.045 * m, a: 0.004, d: 0.18 }));
    // the resolved bell on top, with an octave partial and a long tail
    tone(t + 0.32, { freq: C6, type: 'sine', peak: 0.05 * m, a: 0.004, d: 0.55 });
    tone(t + 0.32, { freq: G6, type: 'sine', peak: 0.014 * m, a: 0.006, d: 0.4 });
    if (!reduced()) tone(t + 0.34, { freq: E6, type: 'sine', peak: 0.012 * m, a: 0.006, d: 0.3, pan: 0.15 });
  },

  /* 11 · Achievement — a richer, harmonized phrase resolving to a full
     C-major chord ("you earned this"). */
  achievement(t, m) {
    pad(t, [C3, G3], { peak: 0.016 * m, d: 0.9 });
    const mel = [[C5, 0], [D5, 0.12], [E5, 0.24], [G5, 0.36]];
    const har = [[E4, 0], [G4, 0.12], [G4, 0.24], [C5, 0.36]]; // a warm voice beneath
    mel.forEach(([f, dt]) => tone(t + dt, { freq: f, type: 'sine', peak: 0.04 * m, a: 0.005, d: 0.2 }));
    har.forEach(([f, dt]) => tone(t + dt, { freq: f, type: 'triangle', peak: 0.022 * m, a: 0.006, d: 0.2 }));
    // resolve onto the chord
    pad(t + 0.5, [C4, E4, G4, C5], { peak: 0.03 * m, a: 0.008, d: 0.6 });
    if (!reduced()) tone(t + 0.52, { freq: E6, type: 'sine', peak: 0.01 * m, a: 0.006, d: 0.35 });
  },

  /* 12 · Streak record — a warm, opening rise (A→D→A), a small triumph. */
  streak(t, m) {
    tone(t, { freq: A4, type: 'sine', peak: 0.04 * m, a: 0.005, d: 0.16 });
    tone(t + 0.11, { freq: D5, type: 'sine', peak: 0.044 * m, a: 0.005, d: 0.2 });
    tone(t + 0.24, { freq: A5, type: 'sine', peak: 0.04 * m, a: 0.006, d: 0.3 });
    tone(t, { freq: D4, type: 'triangle', peak: 0.014 * m, a: 0.02, d: 0.4 });
  },

  /* 13 · Reading mentor — the calm, intelligent signature: a soft Cmaj9
     that forms like a thought and resolves with one high shimmer. */
  mentor(t, m) {
    pad(t, [C3, G3, C4], { peak: 0.02 * m, a: 0.08, d: 1.0 });
    tone(t + 0.06, { freq: E4, type: 'sine', peak: 0.028 * m, a: 0.08, d: 0.8 });
    tone(t + 0.06, { freq: G4, type: 'sine', peak: 0.024 * m, a: 0.09, d: 0.8, detune: 3 }); // gentle beating = "alive"
    tone(t + 0.28, { freq: D5, type: 'sine', peak: 0.026 * m, a: 0.1, d: 0.9 }); // the 9th — the "intelligent" color
    tone(t + 0.6, { freq: G5, type: 'sine', peak: 0.014 * m, a: 0.06, d: 0.6 }); // a thought resolving
  },

  /* 14 · XP tick — one grain; ascends via the ladder in xpTick(). Used as
     a single resolved note for a lone/reduced-motion call. */
  xp(t, m) {
    tone(t, { freq: C5, type: 'sine', peak: 0.03 * m, a: 0.003, d: 0.1 });
  },

  /* 15 · Confetti — a layered sparkle SHOWER (not a cheer): pentatonic
     grains spread in time and stereo. Calm under reduced-motion. */
  celebrate(t, m) {
    const notes = [C5, E5, G5, A5, C6, D6, E6, G5, C6, E6];
    const n = reduced() ? 3 : notes.length;
    for (let i = 0; i < n; i += 1) {
      const at = t + i * (0.06 + Math.random() * 0.03);
      const f = notes[i % notes.length];
      tone(at, { freq: f, type: 'sine', peak: (0.012 + Math.random() * 0.01) * m, a: 0.003, d: 0.12 + Math.random() * 0.1, pan: Math.random() * 1.2 - 0.6 });
    }
  },

  /* 16 · Daily goal — THE memorable success melody: a warm phrase with a
     small dip before the lift (anticipation → resolution) over a chord
     bed, ending on a bell. Reserved for the day's goal so it stays rare
     and special (variable reinforcement by scarcity). */
  dailyGoal(t, m) {
    pad(t, [C3, G3, C4, E4], { peak: 0.016 * m, a: 0.04, d: 1.2 });
    const mel = [
      [G4, 0, 0.18], [C5, 0.14, 0.2], [E5, 0.28, 0.22],
      [D5, 0.42, 0.2], [G5, 0.58, 0.3], // dip (D) then lift (G) = the hook
    ];
    mel.forEach(([f, dt, d]) => tone(t + dt, { freq: f, type: 'sine', peak: 0.045 * m, a: 0.006, d }));
    // final resolved bell (C6) with octave partials and a long, warm tail
    tone(t + 0.78, { freq: C6, type: 'sine', peak: 0.05 * m, a: 0.006, d: 0.7 });
    tone(t + 0.78, { freq: E6, type: 'sine', peak: 0.014 * m, a: 0.008, d: 0.5 });
    if (!reduced()) tone(t + 0.8, { freq: G6, type: 'sine', peak: 0.01 * m, a: 0.008, d: 0.45, pan: 0.15 });
  },

  /* 17 · Notification / toast — a soft, unobtrusive major-third dyad. */
  notify(t, m) {
    tone(t, { freq: C5, type: 'sine', peak: 0.022 * m, a: 0.012, d: 0.16 });
    tone(t + 0.005, { freq: E5, type: 'sine', peak: 0.02 * m, a: 0.012, d: 0.2 });
  },

  /* 18 · Backup saved — a tiny reassuring rising fifth ("safe"). */
  backupOk(t, m) {
    tone(t, { freq: C5, type: 'sine', peak: 0.032 * m, a: 0.004, d: 0.1 });
    tone(t + 0.08, { freq: G5, type: 'sine', peak: 0.036 * m, a: 0.005, d: 0.18 });
  },

  /* 19 · Restore complete — a warm arpeggio that "rebuilds" (C→E→G→C). */
  restore(t, m) {
    pad(t, [C3], { peak: 0.016 * m, d: 0.9 });
    const seq = [[C4, 0], [E4, 0.13], [G4, 0.26], [C5, 0.4]];
    seq.forEach(([f, dt]) => tone(t + dt, { freq: f, type: 'sine', peak: 0.036 * m, a: 0.02, d: 0.3 }));
  },

  /* 20 · Error — a short, NEUTRAL double-pulse (attention, not alarm).
     One warm mid tone, said twice; low-passed, no dissonance. */
  error(t, m) {
    tone(t, { freq: F4v, type: 'triangle', peak: 0.04 * m, a: 0.006, d: 0.12 });
    tone(t + 0.11, { freq: F4v, type: 'triangle', peak: 0.036 * m, a: 0.006, d: 0.16 });
    tone(t, { freq: F4v / 2, type: 'sine', peak: 0.014 * m, a: 0.01, d: 0.2 });
  },
};

/** Names in the registry — used by tools/verify.mjs to catch cue/sound drift. */
export const SOUND_NAMES = Object.freeze(Object.keys(SOUNDS));

/* ------------------------------------------------------------------ */
/* Public play API                                                     */
/* ------------------------------------------------------------------ */

/**
 * Play a named sound. Never throws; silently does nothing when sound is
 * off, muted (volume 0), the tab is hidden, or audio is unavailable.
 * @param {string} name  one of SOUND_NAMES
 * @param {{delay?: number, gain?: number}} [opts]
 */
export function playSound(name, opts = {}) {
  try {
    if (!state.enabled || state.volume <= 0) return;
    if (typeof document !== 'undefined' && document.hidden) return; // polite: no background noise
    const fn = SOUNDS[name];
    if (!fn) return;
    if (!ensureGraph()) return;
    if (state.ctx.state === 'suspended') state.ctx.resume();
    const t = state.ctx.currentTime + Math.max(0, opts.delay ?? 0);
    fn(t, opts.gain ?? 1);
  } catch {
    /* audio is a bonus, never a blocker */
  }
}

/**
 * XP counting: one ascending grain per step, synchronized with the
 * count-up animation. Step 0 is the lowest; it climbs the pentatonic
 * ladder and holds at the top. Under reduced motion the count-up is
 * instant, so callers play a single note instead.
 * @param {number} step  0-based index of the tick
 */
export function xpTick(step) {
  try {
    if (!state.enabled || state.volume <= 0) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!ensureGraph()) return;
    if (state.ctx.state === 'suspended') state.ctx.resume();
    const i = Math.max(0, Math.min(XP_LADDER.length - 1, step | 0));
    const t = state.ctx.currentTime;
    tone(t, { freq: XP_LADDER[i], type: 'sine', peak: 0.026, a: 0.003, d: 0.09 });
  } catch {
    /* silently fine */
  }
}

/** Whether the user prefers reduced motion (exposed for callers that
 *  choose calmer variants — e.g. xp-bar plays one note, not a run). */
export function audioReducedMotion() {
  return reduced();
}

/**
 * Start the brown noise ambient loop. Returns silently if audio is unavailable
 * or focus noise is disabled.
 */
export function startFocusNoise() {
  try {
    if (!state.focusEnabled || state.focusNode) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (!ensureGraph()) return;
    if (state.ctx.state === 'suspended') state.ctx.resume();

    const c = state.ctx;
    const src = c.createBufferSource();
    src.buffer = state.brownBuf;
    src.loop = true;

    // A low-pass filter specifically to deepen the brown noise, rolling off
    // higher frequencies to make it purely ambient and non-fatiguing.
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 250;
    f.Q.value = 0.5;

    // Gain node for the focus noise (separate from the main volume but feeds into it).
    // The fixed attenuation (0.15) keeps it beneath the UI sounds.
    const g = c.createGain();
    const targetGain = state.focusVolume * 0.15;
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.setTargetAtTime(targetGain, c.currentTime, 0.5); // 0.5s fade in

    src.connect(f).connect(g).connect(state.master);
    src.start();

    state.focusNode = g;
    state.focusSrc = src;
  } catch {
    /* silently fine */
  }
}

/**
 * Stop the brown noise ambient loop with a smooth fade out.
 */
export function stopFocusNoise() {
  if (!state.focusNode || !state.ctx) return;
  const g = state.focusNode;
  const src = state.focusSrc;
  
  state.focusNode = null;
  state.focusSrc = null;

  try {
    const t = state.ctx.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(0, t, 0.06); // ~60ms fade out to avoid clicks

    // Disconnect after the fade completes
    setTimeout(() => {
      try {
        src.stop();
        src.disconnect();
        g.disconnect();
      } catch { /* already stopped */ }
    }, 200);
  } catch {
    /* silently fine */
  }
}

export function isFocusNoisePlaying() {
  return !!state.focusNode;
}
