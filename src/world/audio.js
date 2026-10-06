/**
 * audio.js — the village's sound: its theme song, its ambience, its little
 * event sounds and the friends' voices, all synthesized live with the Web
 * Audio API (no files, no CDN, offline).
 *
 * THE THEME. One sixteen-bar tune in C major at a bouncy shuffle, written
 * out note by note so it can be hummed: the hook is mi-sol-la, sol-la-do
 * (the Valley Phrase), answered by a tumble back down; the middle climbs a
 * four-step sequence to a high E and lands home. It loops for as long as
 * the app is open, with a different arrangement on each pass (bells and
 * twinkles on the second, a breakdown on the third) so it never wears.
 *
 *   LEAD     the melody, in each friend's own instrument: marimba in the
 *            village, flute in Chai's library, kalimba in Matcha's garden,
 *            clarinet at Mochi's, pizzicato in Ginger's workshop, bells at
 *            Mallow's observatory, a twangy banjo at Toffee's fire.
 *   BAND     a bouncing bass, chord stabs on the off-beats, a soft kick, a
 *            woodblock and a shaker.
 *   FOCUS    while a question is on screen: the same song with no melody
 *            and no drums, so it keeps you company without talking over you.
 *   NIGHT    slower, music box, no drums.
 *
 * The reward sounds quote the hook, so a star, a heart and a new level all
 * sound like the village. Music and sound are on, at full volume, until
 * the learner turns them off. Nothing sounds before the first gesture
 * (the browser's rule); app.js calls unlock() on the first touch anywhere.
 */

import { feedbackPrefs, setFeedbackPref, onFeedbackChange } from '../core/engagement/feedback.js';

const SEMI = { do: 0, re: 2, mi: 4, sol: 7, la: 9 };

export const VALLEY_PHRASE = Object.freeze([['mi', 1], ['sol', 1], ['la', 1], ['sol', 1], ['la', 1], ['do', 2]]);

export function pitch(tonic, degree, octave = 0) { return tonic * 2 ** ((SEMI[degree] + octave * 12) / 12); }
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

const state = {
  ctx: null, master: null, noise: null,
  music: { on: true, playing: false, region: 'world', hour: 'morning', warmth: 0, gain: null, timer: 0, slot: 0, next: 0 },
  amb: { nodes: [], gain: null, region: null, timers: [], key: null },
  unlocked: false,
  storage: null,
};

/* ------------------------------------------------------------------ */
/* Graph                                                               */
/* ------------------------------------------------------------------ */

/** Event sounds follow the sound-effects preference. */
function gain() { const p = feedbackPrefs(); return p.sfx ? p.sfxVolume : 0; }
/** The music and the ambience follow the music preference and its volume. */
function musicGain() { const p = feedbackPrefs(); return p.music ? p.musicVolume : 0; }

function ensure() {
  if (state.ctx) return true;
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return false;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 1;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 4; comp.attack.value = 0.006; comp.release.value = 0.22;
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 7600; warm.Q.value = 0.4;
  master.connect(comp).connect(warm).connect(ctx.destination);
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < d.length; i += 1) { // pink-ish noise: softer than white
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.12;
  }
  state.ctx = ctx; state.master = master; state.noise = buf;
  return true;
}

export function unlock() {
  try {
    if (!ensure()) return;
    if (state.ctx.state === 'suspended') state.ctx.resume();
    state.unlocked = true;
    if (state.music.on && !state.music.playing) startMusic(state.music.region, { hour: state.music.hour, warmth: state.music.warmth });
  } catch { /* audio is a bonus */ }
}

export async function initWorldAudio(storage) {
  state.storage = storage;
  state.music.on = feedbackPrefs().music;
  // The settings screen changes the preference; the music retunes live.
  onFeedbackChange((p) => {
    state.music.on = p.music;
    if (!p.music) { stopMusic(); stopAmbience(); return; }
    if (state.music.playing) { try { state.music.gain?.gain.setTargetAtTime(Math.max(0.0001, musicGain() * MUSIC_LEVEL), state.ctx.currentTime, 0.05); state.amb.gain?.gain.setTargetAtTime(Math.max(0.0001, musicGain()), state.ctx.currentTime, 0.05); } catch { /* fine */ } }
    else if (state.unlocked) startMusic(state.music.region, { hour: state.music.hour, warmth: state.music.warmth });
  });
}

export function musicEnabled() { return feedbackPrefs().music; }
export async function setMusicEnabled(on) {
  state.music.on = !!on;
  try { if (state.storage) await setFeedbackPref(state.storage, 'music', !!on); } catch { /* non-fatal */ }
  if (!on) { stopMusic(); stopAmbience(); } else startMusic(state.music.region, { hour: state.music.hour, warmth: state.music.warmth });
}

/* ------------------------------------------------------------------ */
/* Voices                                                              */
/* ------------------------------------------------------------------ */

function tone(t, { freq, type = 'sine', peak = 0.05, a = 0.01, hold = 0, d = 0.25, pan = 0, dest = state.master, detune = 0, glide = 0 }) {
  const c = state.ctx;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (detune) o.detune.value = detune;
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), t + a + hold + d);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + a);
  const rel = t + a + hold;
  if (hold) g.gain.setValueAtTime(peak, rel);
  g.gain.exponentialRampToValueAtTime(0.0001, rel + d);
  o.connect(g);
  if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p).connect(dest); } else g.connect(dest);
  o.start(t); o.stop(rel + d + 0.05);
}

/** A plucked, kalimba-like note: a sine with a bright triangle transient. */
function pluck(t, freq, peak = 0.06, pan = 0, dest = state.master) {
  tone(t, { freq, type: 'sine', peak, a: 0.004, d: 0.9, pan, dest });
  tone(t, { freq: freq * 2, type: 'triangle', peak: peak * 0.22, a: 0.002, d: 0.16, pan, dest });
  tone(t, { freq: freq * 3.01, type: 'sine', peak: peak * 0.08, a: 0.002, d: 0.4, pan, dest });
}

/** A soft bell for stars and quests. */
function bell(t, freq, peak = 0.06, pan = 0, dest = state.master) {
  tone(t, { freq, type: 'sine', peak, a: 0.006, d: 1.4, pan, dest });
  tone(t, { freq: freq * 2.76, type: 'sine', peak: peak * 0.18, a: 0.004, d: 0.7, pan, dest });
  tone(t, { freq: freq * 5.4, type: 'sine', peak: peak * 0.06, a: 0.002, d: 0.3, pan, dest });
}

function noiseBurst(t, { peak = 0.03, a = 0.01, d = 0.3, filter = 'bandpass', freq = 1200, q = 1, dest = state.master }) {
  const c = state.ctx;
  const src = c.createBufferSource(); src.buffer = state.noise; src.loop = true;
  const f = c.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  src.connect(f).connect(g).connect(dest); src.start(t); src.stop(t + a + d + 0.05);
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

const C5 = 523.25;
const EVENTS = {
  tap:      (t, v) => { tone(t, { freq: 660, type: 'triangle', peak: 0.05 * v, a: 0.002, d: 0.07 }); noiseBurst(t, { peak: 0.025 * v, d: 0.05, freq: 2400 }); },
  open:     (t, v) => { noiseBurst(t, { peak: 0.05 * v, a: 0.05, d: 0.3, filter: 'lowpass', freq: 1800 }); pluck(t + 0.02, pitch(C5, 'mi'), 0.1 * v); pluck(t + 0.11, pitch(C5, 'la'), 0.09 * v, 0.2); },
  close:    (t, v) => { noiseBurst(t, { peak: 0.04 * v, a: 0.02, d: 0.22, filter: 'lowpass', freq: 1200 }); pluck(t, pitch(C5, 'la'), 0.07 * v); pluck(t + 0.09, pitch(C5, 'mi'), 0.06 * v, -0.2); },
  hover:    (t, v) => { tone(t, { freq: 880, type: 'sine', peak: 0.02 * v, a: 0.004, d: 0.08 }); },
  place:    (t, v) => { pluck(t, pitch(C5, 'sol'), 0.1 * v); pluck(t + 0.09, pitch(C5, 'la'), 0.09 * v, 0.15); pluck(t + 0.18, pitch(C5 * 2, 'do'), 0.08 * v, -0.15); },
  correct:  (t, v) => { pluck(t, pitch(784, 'do'), 0.1 * v); pluck(t + 0.08, pitch(784, 'mi'), 0.1 * v, 0.2); },
  wrong:    (t, v) => { tone(t, { freq: 330, type: 'triangle', peak: 0.06 * v, a: 0.01, d: 0.2 }); tone(t + 0.09, { freq: 262, type: 'triangle', peak: 0.06 * v, a: 0.01, d: 0.26 }); },
  star1:    (t, v) => { bell(t, pitch(C5, 'mi'), 0.13 * v, -0.2); },
  star2:    (t, v) => { bell(t, pitch(C5, 'sol'), 0.13 * v, 0); },
  star3:    (t, v) => { bell(t, pitch(C5, 'la'), 0.13 * v, 0.2); bell(t + 0.12, pitch(C5 * 2, 'do'), 0.11 * v, 0.3); },
  nostar:   (t, v) => { tone(t, { freq: 262, type: 'sine', peak: 0.07 * v, a: 0.02, d: 0.6 }); },
  ink:      (t, v) => { tone(t, { freq: 1760, type: 'sine', peak: 0.06 * v, a: 0.002, d: 0.12 }); tone(t + 0.04, { freq: 2349, type: 'sine', peak: 0.04 * v, a: 0.002, d: 0.14 }); },
  coin:     (t, v) => { tone(t, { freq: 1568, type: 'square', peak: 0.025 * v, a: 0.002, d: 0.07 }); tone(t + 0.06, { freq: 2093, type: 'square', peak: 0.025 * v, a: 0.002, d: 0.16 }); },
  heart:    (t, v) => { [['mi', 0], ['la', 0], ['do', 1]].forEach(([d, o], i) => bell(t + i * 0.1, pitch(C5, d, o), 0.1 * v, (i - 1) * 0.3)); },
  quest:    (t, v) => { bell(t, pitch(784, 'do'), 0.1 * v); bell(t + 0.14, pitch(784, 're'), 0.1 * v); bell(t + 0.28, pitch(784, 'mi'), 0.12 * v); },
  grow:     (t, v) => { [['sol', 1], ['la', 1], ['do', 2]].forEach(([d, o], i) => pluck(t + i * 0.16, pitch(130.81, d, o), 0.12 * v, (i - 1) * 0.25)); tone(t + 0.5, { freq: pitch(130.81, 'do', 1), type: 'sine', peak: 0.08 * v, a: 0.2, hold: 0.4, d: 1.2 }); },
  build:    (t, v) => { noiseBurst(t, { peak: 0.09 * v, a: 0.005, d: 0.2, filter: 'lowpass', freq: 400 }); tone(t, { freq: 98, type: 'sine', peak: 0.1 * v, a: 0.005, d: 0.3 }); ['do', 'mi', 'sol', 'la'].forEach((d, i) => bell(t + 0.25 + i * 0.1, pitch(261.63, d), 0.09 * v, (i - 1.5) * 0.2)); },
  tick:     (t, v) => { tone(t, { freq: 1200, type: 'sine', peak: 0.025 * v, a: 0.002, d: 0.04 }); },
  hurry:    (t, v) => { tone(t, { freq: 880, type: 'triangle', peak: 0.04 * v, a: 0.002, d: 0.08 }); tone(t + 0.12, { freq: 880, type: 'triangle', peak: 0.04 * v, a: 0.002, d: 0.08 }); },
  arrival:  (t, v) => { VALLEY_PHRASE.slice(0, 3).forEach(([d, o], i) => pluck(t + i * 0.2, pitch(261.63, d, o), 0.11 * v, (i - 1) * 0.3)); },
  /* The hook itself: a star earned, a treasure made, a friend helped. */
  unlock:   (t, v) => { VALLEY_PHRASE.forEach(([d, o], i) => bell(t + i * 0.15, pitch(261.63, d, o), 0.11 * v, (i % 2 ? 1 : -1) * 0.2)); },
  /* A new village level: the hook, then a chord that blooms. */
  levelup:  (t, v) => {
    VALLEY_PHRASE.forEach(([d, o], i) => bell(t + i * 0.13, pitch(523.25, d, o - 1), 0.11 * v, (i % 2 ? 1 : -1) * 0.25));
    [261.63, 329.63, 392, 523.25].forEach((f, i) => tone(t + 0.85, { freq: f, type: 'triangle', peak: 0.05 * v, a: 0.02, hold: 0.5, d: 1.1, pan: (i - 1.5) * 0.3 }));
    noiseBurst(t + 0.85, { peak: 0.04 * v, a: 0.01, d: 0.6, filter: 'highpass', freq: 5000 });
  },
  /* The day's gift opening: a shake, a pop, a sparkle shower. */
  chest:    (t, v) => {
    for (let i = 0; i < 3; i += 1) noiseBurst(t + i * 0.09, { peak: 0.05 * v, a: 0.004, d: 0.05, filter: 'bandpass', freq: 900 + i * 300, q: 3 });
    tone(t + 0.32, { freq: 180, type: 'sine', peak: 0.12 * v, a: 0.003, d: 0.15, glide: 2.2 });
    [784, 988, 1175, 1568, 1319, 1760].forEach((f, i) => tone(t + 0.4 + i * 0.06, { freq: f, type: 'sine', peak: 0.06 * v, a: 0.003, d: 0.3, pan: Math.sin(i) * 0.5 }));
  },
  /* A finished set: the friends come running, a bouncy run up and three pops of confetti. */
  party:    (t, v) => {
    [['do', 0], ['mi', 0], ['sol', 0], ['do', 1], ['mi', 1], ['sol', 1]].forEach(([d, o], i) => pluck(t + i * 0.075, pitch(C5, d, o - 1), 0.1 * v, (i % 2 ? 1 : -1) * 0.3));
    for (const at of [1.5, 2.7, 4.2]) { noiseBurst(t + at, { peak: 0.06 * v, a: 0.004, d: 0.09, filter: 'bandpass', freq: 1400, q: 1.2 }); bell(t + at + 0.04, pitch(C5, 'sol', 1), 0.06 * v, Math.sin(at) * 0.5); }
  },
  page:     (t, v) => { noiseBurst(t, { peak: 0.05 * v, a: 0.01, d: 0.16, filter: 'highpass', freq: 1500 }); },
  swoosh:   (t, v) => { noiseBurst(t, { peak: 0.06 * v, a: 0.04, d: 0.26, filter: 'bandpass', freq: 900, q: 0.7 }); },
};

export const WORLD_SOUND_NAMES = Object.freeze(Object.keys(EVENTS));

export function play(name, { delay = 0 } = {}) {
  try {
    const v = gain();
    if (v <= 0 || !ensure() || document.visibilityState === 'hidden') return;
    if (state.ctx.state === 'suspended') return;
    const fn = EVENTS[name];
    if (!fn) return;
    fn(state.ctx.currentTime + delay, v);
  } catch { /* never a blocker */ }
}

/* ------------------------------------------------------------------ */
/* The friends' voices: a babble of little blips, one pitch per friend */
/* ------------------------------------------------------------------ */

const VOICE = {
  toffee: { base: 640, type: 'square', step: 0.058, lp: 2600, peak: 0.028 },
  chai: { base: 390, type: 'sine', step: 0.074, lp: 1800, peak: 0.07, glide: 0.86 },
  matcha: { base: 720, type: 'triangle', step: 0.06, lp: 3200, peak: 0.06 },
  mochi: { base: 250, type: 'triangle', step: 0.085, lp: 1400, peak: 0.08 },
  ginger: { base: 560, type: 'triangle', step: 0.05, lp: 3000, peak: 0.06 },
  mallow: { base: 520, type: 'sine', step: 0.07, lp: 2400, peak: 0.065, glide: 1.12 },
  sesame: { base: 980, type: 'triangle', step: 0.045, lp: 4200, peak: 0.05, glide: 1.18 },
};
const VOICE_STEPS = [0, 2, 4, 7, 9, 12];
let voiceUntil = 0;

/** A friend says something: a short babble whose length follows the line. */
export function voice(petId, text = '', { soft = false } = {}) {
  try {
    const v = gain() * (soft ? 0.45 : 1);
    const V = VOICE[petId];
    if (!V || v <= 0 || !ensure() || document.visibilityState === 'hidden' || state.ctx.state === 'suspended') return;
    const c = state.ctx;
    const t0 = Math.max(c.currentTime + 0.01, soft ? voiceUntil : c.currentTime + 0.01);
    const letters = String(text).replace(/[^a-z]/gi, '').length;
    const n = Math.max(2, Math.min(soft ? 5 : 12, Math.ceil(letters / 3)));
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = V.lp; lp.connect(state.master);
    for (let i = 0; i < n; i += 1) {
      const t = t0 + i * V.step;
      const up = i === n - 1 && /\?$/.test(text.trim()) ? 1.25 : 1;
      const f = V.base * 2 ** (VOICE_STEPS[(i * 7 + letters) % VOICE_STEPS.length] / 24) * up;
      tone(t, { freq: f, type: V.type, peak: V.peak * v, a: 0.006, d: V.step * 0.85, dest: lp, glide: V.glide ?? 0 });
    }
    voiceUntil = t0 + n * V.step;
    setTimeout(() => { try { lp.disconnect(); } catch { /* gone */ } }, (voiceUntil - c.currentTime + 0.4) * 1000);
  } catch { /* a voice is a bonus */ }
}

const VOICE_WHO = { f: /female|zira|aria|jenny|samantha|susan|hazel|karen|victoria/i, m: /(^|[^a-z])male|david|mark|daniel|george|alex/i };

/* A tap on a friend: its own little call, built from tones (no speech engine). */
const CALLS = {
  toffee: (t, v, lp) => { for (let i = 0; i < 5; i += 1) { noiseBurst(t + i * 0.045, { peak: 0.05 * v, a: 0.003, d: 0.03, filter: 'bandpass', freq: 3200 + i * 350, q: 4 }); } tone(t + 0.24, { freq: 880, type: 'square', peak: 0.02 * v, a: 0.004, d: 0.1, dest: lp }); },
  chai: (t, v) => { tone(t, { freq: 420, type: 'sine', peak: 0.1 * v, a: 0.06, hold: 0.1, d: 0.2, glide: 0.82 }); tone(t + 0.5, { freq: 400, type: 'sine', peak: 0.1 * v, a: 0.06, hold: 0.14, d: 0.3, glide: 0.8 }); },
  matcha: (t, v, lp) => { [0, 4, 7, 12].forEach((s, i) => tone(t + i * 0.06, { freq: 880 * 2 ** (s / 12), type: 'triangle', peak: 0.07 * v, a: 0.004, d: 0.1, dest: lp })); },
  ginger: (t, v, lp) => { tone(t, { freq: 520, type: 'triangle', peak: 0.09 * v, a: 0.005, d: 0.09, glide: 1.7, dest: lp }); tone(t + 0.12, { freq: 760, type: 'triangle', peak: 0.08 * v, a: 0.005, d: 0.12, glide: 0.7, dest: lp }); },
  mallow: (t, v) => { [0, 7].forEach((s, i) => pluck(t + i * 0.22, 523.25 * 2 ** (s / 12), 0.07 * v, (i - 0.5) * 0.3)); },
  // Two quick squeaks, the second higher: a mouse saying hello.
  sesame: (t, v, lp) => { tone(t, { freq: 1500, type: 'sine', peak: 0.075 * v, a: 0.004, hold: 0.03, d: 0.07, glide: 1.35, dest: lp }); tone(t + 0.13, { freq: 1750, type: 'sine', peak: 0.07 * v, a: 0.004, hold: 0.04, d: 0.09, glide: 1.4, dest: lp }); },
};

/** A friend's tap sound (SIGNATURE). Mochi says its name in the browser's deep voice; everyone else makes a tone. */
export function signature(petId, sig) {
  try {
    const v = gain();
    if (!sig?.say || v <= 0 || document.visibilityState === 'hidden') return;
    if (petId !== 'mochi') {
      if (!ensure() || state.ctx.state === 'suspended') return;
      const c = state.ctx, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200; lp.connect(state.master);
      CALLS[petId]?.(c.currentTime + 0.01, v, lp);
      setTimeout(() => { try { lp.disconnect(); } catch { /* gone */ } }, 1500);
      return;
    }
    const ss = window.speechSynthesis;
    const en = ss?.getVoices?.().filter((x) => /^en/i.test(x.lang)) ?? [];
    if (!ss || !window.SpeechSynthesisUtterance || !en.length) { voice(petId, sig.say); return; }
    ss.cancel();
    const u = new SpeechSynthesisUtterance(sig.say);
    u.voice = en.find((x) => VOICE_WHO[sig.who]?.test(x.name)) ?? en[0];
    u.lang = u.voice.lang; u.pitch = sig.pitch; u.rate = sig.rate; u.volume = Math.min(1, sig.volume * v);
    u.onerror = (e) => { if (!/interrupted|canceled/.test(e.error)) voice(petId, sig.say); };
    ss.speak(u);
  } catch { /* a voice is a bonus */ }
}

/* ------------------------------------------------------------------ */
/* The theme                                                           */
/* ------------------------------------------------------------------ */

const MUSIC_LEVEL = 0.95;
/* C major. Notes are MIDI numbers; a bar is eight shuffled eighths. */
const CHORDS = [
  [48, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [55, 59, 62]],
  [48, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65], 43, [55, 59, 62]], [48, [60, 64, 67]],
  [41, [57, 60, 65]], [43, [55, 59, 62]], [40, [55, 59, 64]], [45, [57, 60, 64]],
  [41, [57, 60, 65]], [48, [60, 64, 67]], [38, [57, 62, 65], 43, [55, 59, 62]], [48, [60, 64, 67]],
];
/* [bar, slot, note, length in eighths]. The hook is bars 0-1 and 4-5. */
const MELODY = [
  [0, 0, 76, 1], [0, 1, 79, 1], [0, 2, 81, 3], [0, 5, 79, 1], [0, 6, 81, 1], [0, 7, 84, 3],
  [1, 2, 81, 1], [1, 3, 79, 1], [1, 4, 76, 4],
  [2, 0, 81, 1], [2, 1, 81, 1], [2, 2, 79, 1], [2, 3, 76, 1], [2, 4, 74, 2], [2, 6, 72, 1], [2, 7, 74, 1],
  [3, 0, 74, 4], [3, 6, 72, 1], [3, 7, 74, 1],
  [4, 0, 76, 1], [4, 1, 79, 1], [4, 2, 81, 3], [4, 5, 79, 1], [4, 6, 81, 1], [4, 7, 84, 3],
  [5, 2, 86, 1], [5, 3, 84, 1], [5, 4, 81, 2], [5, 6, 79, 1], [5, 7, 81, 1],
  [6, 0, 84, 2], [6, 2, 81, 1], [6, 3, 79, 1], [6, 4, 74, 2], [6, 6, 76, 1], [6, 7, 79, 1],
  [7, 0, 72, 6],
  [8, 0, 81, 1], [8, 1, 84, 1], [8, 2, 81, 1], [8, 3, 79, 1], [8, 4, 81, 4],
  [9, 0, 79, 1], [9, 1, 81, 1], [9, 2, 79, 1], [9, 3, 76, 1], [9, 4, 74, 4],
  [10, 0, 76, 1], [10, 1, 79, 1], [10, 2, 76, 1], [10, 3, 74, 1], [10, 4, 76, 4],
  [11, 0, 72, 1], [11, 1, 74, 1], [11, 2, 76, 1], [11, 3, 79, 1], [11, 4, 81, 4],
  [12, 0, 81, 1], [12, 1, 84, 1], [12, 2, 81, 1], [12, 3, 79, 1], [12, 4, 81, 2], [12, 6, 84, 1], [12, 7, 86, 1],
  [13, 0, 88, 3], [13, 3, 86, 1], [13, 4, 84, 2], [13, 6, 81, 2],
  [14, 0, 86, 2], [14, 2, 84, 1], [14, 3, 81, 1], [14, 4, 79, 2], [14, 6, 74, 1], [14, 7, 76, 1],
  [15, 0, 72, 6],
];
const AT = new Map();
for (const [bar, slot, note, len] of MELODY) { const k = bar * 8 + slot; if (!AT.has(k)) AT.set(k, []); AT.get(k).push([note, len]); }
/* A sparkle answering the melody on the second pass: chord tones up high. */
const TWINKLE = [3, 7];

/** Which friend's instrument plays the tune in each place. */
const LEAD_OF = {
  world: 'marimba', 'reading-room': 'flute', meadow: 'kalimba', pond: 'kalimba', thicket: 'kalimba', rootwood: 'kalimba', terraces: 'kalimba',
  table: 'clarinet', loom: 'pizzicato', bench: 'bells', wilds: 'banjo', hearth: 'banjo', placement: 'pizzicato', completion: 'clarinet',
};

function lead(kind, t, f, dur, v, dest) {
  switch (kind) {
    case 'flute': {
      const c = state.ctx, o = c.createOscillator(), g = c.createGain(), vib = c.createOscillator(), vg = c.createGain();
      o.type = 'sine'; o.frequency.value = f; vib.frequency.value = 5.2; vg.gain.value = f * 0.006; vib.connect(vg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1 * v, t + 0.05); g.gain.setValueAtTime(0.1 * v, t + Math.max(0.06, dur * 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
      o.connect(g).connect(dest); o.start(t); vib.start(t); o.stop(t + dur + 0.2); vib.stop(t + dur + 0.2);
      tone(t, { freq: f * 2, type: 'sine', peak: 0.012 * v, a: 0.05, hold: dur * 0.5, d: 0.15, dest });
      break;
    }
    case 'kalimba': pluck(t, f, 0.12 * v, 0, dest); break;
    case 'clarinet': {
      const c = state.ctx, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
      o.type = 'square'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = Math.min(2400, f * 3); lp.Q.value = 0.7;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05 * v, t + 0.03); g.gain.setValueAtTime(0.05 * v, t + Math.max(0.04, dur * 0.75)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
      o.connect(lp).connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.15);
      break;
    }
    case 'pizzicato': tone(t, { freq: f, type: 'triangle', peak: 0.16 * v, a: 0.003, d: 0.2, dest }); tone(t, { freq: f * 2, type: 'sine', peak: 0.03 * v, a: 0.002, d: 0.08, dest }); break;
    case 'bells': bell(t, f, 0.1 * v, 0, dest); break;
    case 'musicbox': tone(t, { freq: f * 2, type: 'sine', peak: 0.08 * v, a: 0.003, d: 0.9, dest }); tone(t, { freq: f * 4, type: 'sine', peak: 0.015 * v, a: 0.002, d: 0.3, dest }); break;
    case 'banjo': {
      const c = state.ctx, o = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 1.01, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      bp.type = 'bandpass'; bp.frequency.value = Math.min(3200, f * 2.5); bp.Q.value = 1.6;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(bp).connect(g).connect(dest); o.start(t); o.stop(t + 0.36);
      break;
    }
    default: // marimba
      tone(t, { freq: f, type: 'sine', peak: 0.14 * v, a: 0.003, d: 0.42, dest });
      tone(t, { freq: f * 3.98, type: 'sine', peak: 0.02 * v, a: 0.002, d: 0.08, dest });
      tone(t, { freq: f * 2, type: 'triangle', peak: 0.02 * v, a: 0.002, d: 0.12, dest });
  }
}

const isNight = (h) => h === 'night' || h === 'dusk';
const bpmFor = (scene) => (isNight(scene.hour) ? 88 : scene.region === 'focus' ? 100 : 112);

/** Schedule every note of one eighth-note slot at time t. */
function playSlot(slot, t, eighth, dest) {
  const m = state.music;
  const bar = Math.floor(slot / 8) % 16, s = slot % 8, pass = Math.floor(slot / 128);
  const night = isNight(m.hour), focus = m.region === 'focus';
  const breakdown = pass % 3 === 2 && bar < 8;
  const [root, chord, root2, chord2] = CHORDS[bar];
  const r = s < 4 || root2 === undefined ? root : root2;
  const ch = s < 4 || chord2 === undefined ? chord : chord2;

  /* bass: root on one, fifth on three, a bounce up the octave */
  if (s === 0 || s === 4) tone(t, { freq: hz(s === 0 ? r : r + 7), type: 'triangle', peak: focus ? 0.13 : 0.16, a: 0.006, d: eighth * 1.7, dest });
  if (s === 0 || s === 4) tone(t, { freq: hz(s === 0 ? r : r + 7), type: 'sine', peak: 0.1, a: 0.006, d: eighth * 1.9, dest });
  if (s === 6 && !night) tone(t, { freq: hz(r + 12), type: 'triangle', peak: 0.07, a: 0.004, d: eighth * 0.8, dest });

  /* chords: stabs on the off-beats by day, a soft held chord at night and in focus */
  if (night || focus) {
    if (s === 0 || (s === 4 && root2 !== undefined)) for (const n of ch) tone(t, { freq: hz(n), type: 'sine', peak: 0.028, a: 0.08, hold: eighth * 2.5, d: eighth * 2, dest });
  } else if (s === 2 || s === 6) {
    for (const [i, n] of ch.entries()) tone(t + i * 0.004, { freq: hz(n), type: 'triangle', peak: 0.03, a: 0.004, d: eighth * 0.9, dest, pan: (i - 1) * 0.25 });
  }

  /* drums: soft kick, woodblock, shaker (just the shaker at night and in focus) */
  if (!night && !focus) {
    if (s === 0 || s === 4) tone(t, { freq: 120, type: 'sine', peak: 0.2, a: 0.002, d: 0.16, dest, glide: 0.4 });
    if (s === 2 || s === 6) { noiseBurst(t, { peak: 0.06, a: 0.001, d: 0.05, filter: 'bandpass', freq: 1900, q: 4, dest }); tone(t, { freq: 820, type: 'sine', peak: 0.04, a: 0.001, d: 0.04, dest }); }
  }
  noiseBurst(t, { peak: s % 2 ? 0.03 : 0.016, a: 0.002, d: 0.04, filter: 'highpass', freq: 7000, dest });

  /* the tune */
  if (!focus && !breakdown) {
    const kind = night ? 'musicbox' : pass % 3 === 1 ? 'bells' : (LEAD_OF[m.region] ?? 'marimba');
    for (const [note, len] of AT.get(bar * 8 + s) ?? []) lead(kind, t, hz(note), len * eighth * 0.95, 1, dest);
    if (pass % 3 === 1 && !night && TWINKLE.includes(s)) bell(t, hz(ch[(bar + s) % 3] + 24), 0.025, s === 3 ? -0.4 : 0.4, dest);
  }
  if (breakdown && s === 0) for (const n of ch) tone(t, { freq: hz(n + 12), type: 'sine', peak: 0.02, a: 0.1, hold: eighth * 4, d: eighth * 3, dest });
}

/**
 * Start the music, or move it to another place. The song never restarts:
 * a new place changes the lead instrument (and the hour, the tempo) from
 * the next note on.
 * @param {string} region  a place slug, 'world', or 'focus' while a question is on screen
 */
export function startMusic(region = 'world', { hour = state.music.hour ?? 'morning', warmth = 0 } = {}) {
  const m = state.music;
  m.region = region; m.hour = hour; m.warmth = Math.max(0, Math.min(1, warmth));
  if (!m.on || !state.unlocked || musicGain() <= 0 || !ensure()) return;
  if (m.playing) return;
  const c = state.ctx;
  const bus = c.createGain();
  bus.gain.setValueAtTime(0.0001, c.currentTime);
  bus.gain.exponentialRampToValueAtTime(Math.max(0.0001, musicGain() * MUSIC_LEVEL), c.currentTime + 1.2);
  bus.connect(state.master);
  m.gain = bus; m.playing = true; m.slot = 0; m.next = c.currentTime + 0.15;
  const tick = () => {
    if (!m.playing) return;
    if (document.visibilityState === 'hidden') { m.next = c.currentTime + 0.2; return; }
    const eighth = 60 / bpmFor(m) / 2;
    if (m.next < c.currentTime - 0.3) m.next = c.currentTime + 0.05; // woke from a stall: do not rush to catch up
    while (m.next < c.currentTime + 0.14) {
      const swing = m.slot % 2 ? eighth * 0.16 : 0;
      try { playSlot(m.slot, m.next + swing, eighth, bus); } catch { /* one note is never worth a crash */ }
      m.slot += 1; m.next += eighth;
    }
  };
  m.timer = setInterval(tick, 30);
  tick();
}

export function stopMusic(fade = 0.6) {
  const m = state.music;
  if (!m.playing) return;
  clearInterval(m.timer);
  const c = state.ctx, bus = m.gain;
  try { bus.gain.cancelScheduledValues(c.currentTime); bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), c.currentTime); bus.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + fade); } catch { /* ignore */ }
  setTimeout(() => { try { bus.disconnect(); } catch { /* ignore */ } }, fade * 1000 + 80);
  m.playing = false; m.gain = null;
}

/* ------------------------------------------------------------------ */
/* Ambience                                                            */
/* ------------------------------------------------------------------ */

/**
 * The environment of a place, under the song: a little wind, water near
 * the pond, birds by day, crickets at night, rain by weather.
 */
export function startAmbience(region = 'world', { hour = 'morning', weather = 'clear', season = 'summer' } = {}) {
  if (musicGain() <= 0 || !ensure() || !state.unlocked) { state.amb.region = region; return; }
  const key = `${region}|${hour}|${weather}|${season}`;
  if (state.amb.key === key) return;
  stopAmbience(0.8);
  state.amb.key = key; state.amb.region = region;
  const c = state.ctx;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, musicGain()), c.currentTime + 2);
  g.connect(state.master);
  const nodes = [], timers = [];
  const night = isNight(hour);
  const windy = region === 'wilds' || weather === 'snow';
  { const src = c.createBufferSource(); src.buffer = state.noise; src.loop = true; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; const wg = c.createGain(); wg.gain.value = windy ? 0.08 : 0.03; const lfo = c.createOscillator(); lfo.frequency.value = 0.08; const lg = c.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(lp.frequency); lfo.start(); src.connect(lp).connect(wg).connect(g); src.start(); nodes.push(src, lfo); }
  if (['pond', 'meadow', 'world', 'hearth'].includes(region)) { const src = c.createBufferSource(); src.buffer = state.noise; src.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = region === 'pond' ? 900 : 1400; bp.Q.value = 0.9; const wg = c.createGain(); wg.gain.value = region === 'pond' ? 0.04 : 0.015; const lfo = c.createOscillator(); lfo.frequency.value = 0.35; const lg = c.createGain(); lg.gain.value = 320; lfo.connect(lg).connect(bp.frequency); lfo.start(); src.connect(bp).connect(wg).connect(g); src.start(); nodes.push(src, lfo); }
  if (weather === 'rain') { const src = c.createBufferSource(); src.buffer = state.noise; src.loop = true; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200; const wg = c.createGain(); wg.gain.value = 0.07; src.connect(hp).connect(wg).connect(g); src.start(); nodes.push(src); }
  const green = ['world', 'hearth', 'rootwood', 'meadow', 'pond', 'thicket', 'terraces'].includes(region);
  if (green && !night && weather !== 'rain' && season !== 'winter') {
    const chirp = () => { if (state.amb.key !== key) return; const base = 2200 + Math.random() * 1400; const n = 2 + Math.floor(Math.random() * 4); const pan = Math.random() * 1.6 - 0.8; for (let i = 0; i < n; i += 1) { const t = c.currentTime + i * (0.07 + Math.random() * 0.06); tone(t, { freq: base * (1 + (Math.random() - 0.5) * 0.18), type: 'sine', peak: 0.014, a: 0.01, d: 0.07, pan, dest: g }); } timers.push(setTimeout(chirp, 3500 + Math.random() * 8000)); };
    timers.push(setTimeout(chirp, 1500 + Math.random() * 3000));
  }
  if (green && night && season !== 'winter') {
    const cricket = () => { if (state.amb.key !== key) return; const pan = Math.random() * 1.4 - 0.7; for (let i = 0; i < 6; i += 1) tone(c.currentTime + i * 0.055, { freq: 4200, type: 'sine', peak: 0.006, a: 0.004, d: 0.03, pan, dest: g }); timers.push(setTimeout(cricket, 900 + Math.random() * 2400)); };
    timers.push(setTimeout(cricket, 800));
  }
  state.amb.nodes = nodes; state.amb.gain = g; state.amb.timers = timers;
}

export function stopAmbience(fade = 0.6) {
  const a = state.amb;
  for (const t of a.timers) clearTimeout(t);
  a.timers = []; a.key = null;
  if (!a.gain) return;
  const c = state.ctx, g = a.gain, nodes = a.nodes;
  try { g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + fade); } catch { /* ignore */ }
  setTimeout(() => { for (const n of nodes) { try { n.stop(); } catch { /* ignore */ } } try { g.disconnect(); } catch { /* ignore */ } }, fade * 1000 + 50);
  a.gain = null; a.nodes = [];
}

/** Leaving the village for a screen with no place of its own: the birds go quiet, the song plays on. */
export function silenceWorld() { stopAmbience(0.5); }
