/**
 * audio.js — the world's sound: music, environment, and interaction, all
 * synthesized live with the Web Audio API (no files, no CDN, offline).
 *
 * Identity: one pentatonic world (do re mi sol la — no fa, no ti, so
 * nothing can ever clash), rooted on a tonic per place. The Valley Phrase
 * (mi–sol–la · sol–la–do′) is the leitmotif: the music generator keeps
 * returning to its shapes, the arrival plays its head, growth its tail.
 *
 * Layers:
 *   MUSIC      a slow generative bed — two soft pads breathing under a
 *              plucked pentatonic line, sparser and lower at night.
 *   AMBIENCE   wind, water, birds by day, crickets at night, rain, per place.
 *   EVENTS     tap, open, star chimes, ink, quests, growth, building, timer.
 *
 * Every layer reads the shell's master Sounds preference; music has its
 * own toggle. Nothing sounds before the first gesture (autoplay law); the
 * world calls unlock() on any pointerdown.
 */

import { feedbackPrefs } from '../core/engagement/feedback.js';
import { STORES } from '../core/storage/storage-adapter.js';

const SEMI = { do: 0, re: 2, mi: 4, sol: 7, la: 9 };
const DEGREES = ['do', 're', 'mi', 'sol', 'la'];
const TONIC = { hearth: 130.81, rootwood: 130.81, meadow: 220.0, pond: 146.83, 'reading-room': 164.81, terraces: 196.0, thicket: 196.0, loom: 164.81, table: 164.81, bench: 164.81, wilds: 110.0, world: 130.81 };

export const VALLEY_PHRASE = Object.freeze([['mi', 1], ['sol', 1], ['la', 1], ['sol', 1], ['la', 1], ['do', 2]]);

export function pitch(tonic, degree, octave = 0) { return tonic * 2 ** ((SEMI[degree] + octave * 12) / 12); }

const state = {
  ctx: null, master: null, noise: null,
  music: { on: true, playing: false, region: null, timer: 0, pads: [], gain: null, step: 0, seed: 1 },
  amb: { nodes: [], gain: null, region: null, timers: [] },
  unlocked: false,
  storage: null,
};

/* ------------------------------------------------------------------ */
/* Graph                                                               */
/* ------------------------------------------------------------------ */

function gain() { const p = feedbackPrefs(); return p.sounds ? p.volume : 0; }

function ensure() {
  if (state.ctx) return true;
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return false;
  const ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 1;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3; comp.attack.value = 0.008; comp.release.value = 0.25;
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 5200; warm.Q.value = 0.5;
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
    if (state.music.on && state.music.region && !state.music.playing) startMusic(state.music.region, { hour: state.music.hour });
  } catch { /* audio is a bonus */ }
}

export async function initWorldAudio(storage) {
  state.storage = storage;
  try { const rec = await storage.get(STORES.SETTINGS, 'world:music'); state.music.on = rec?.value !== false; } catch { /* default on */ }
}

export function musicEnabled() { return state.music.on; }
export async function setMusicEnabled(on) {
  state.music.on = !!on;
  try { await state.storage?.put(STORES.SETTINGS, { id: 'world:music', value: !!on }); } catch { /* non-fatal */ }
  if (!on) stopMusic(); else if (state.music.region) startMusic(state.music.region, { hour: state.music.hour });
}

/* ------------------------------------------------------------------ */
/* Voices                                                              */
/* ------------------------------------------------------------------ */

function tone(t, { freq, type = 'sine', peak = 0.05, a = 0.01, hold = 0, d = 0.25, pan = 0, dest = state.master, detune = 0 }) {
  const c = state.ctx;
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (detune) o.detune.value = detune;
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
function bell(t, freq, peak = 0.06, pan = 0) {
  tone(t, { freq, type: 'sine', peak, a: 0.006, d: 1.4, pan });
  tone(t, { freq: freq * 2.76, type: 'sine', peak: peak * 0.18, a: 0.004, d: 0.7, pan });
  tone(t, { freq: freq * 5.4, type: 'sine', peak: peak * 0.06, a: 0.002, d: 0.3, pan });
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

const EVENTS = {
  tap:      (t, v) => { tone(t, { freq: 620, type: 'triangle', peak: 0.022 * v, a: 0.002, d: 0.06 }); noiseBurst(t, { peak: 0.012 * v, d: 0.05, freq: 2400 }); },
  open:     (t, v) => { noiseBurst(t, { peak: 0.03 * v, a: 0.05, d: 0.35, filter: 'lowpass', freq: 1800 }); pluck(t + 0.02, pitch(261.63, 'mi'), 0.05 * v); pluck(t + 0.12, pitch(261.63, 'la'), 0.045 * v, 0.2); },
  close:    (t, v) => { noiseBurst(t, { peak: 0.025 * v, a: 0.02, d: 0.25, filter: 'lowpass', freq: 1200 }); pluck(t, pitch(261.63, 'la'), 0.035 * v); pluck(t + 0.1, pitch(261.63, 'mi'), 0.03 * v, -0.2); },
  hover:    (t, v) => { tone(t, { freq: 880, type: 'sine', peak: 0.012 * v, a: 0.004, d: 0.08 }); },
  place:    (t, v) => { pluck(t, pitch(261.63, 'sol'), 0.05 * v); pluck(t + 0.09, pitch(261.63, 'la'), 0.045 * v, 0.15); pluck(t + 0.18, pitch(523.25, 'do'), 0.04 * v, -0.15); },
  correct:  (t, v) => { pluck(t, pitch(392, 'sol'), 0.05 * v); pluck(t + 0.08, pitch(392, 'do', 1), 0.05 * v, 0.2); },
  wrong:    (t, v) => { tone(t, { freq: 196, type: 'triangle', peak: 0.03 * v, a: 0.01, d: 0.22 }); tone(t + 0.05, { freq: 174.6, type: 'triangle', peak: 0.025 * v, a: 0.01, d: 0.28 }); },
  star1:    (t, v) => { bell(t, pitch(523.25, 'mi'), 0.06 * v, -0.2); },
  star2:    (t, v) => { bell(t, pitch(523.25, 'sol'), 0.06 * v, 0); },
  star3:    (t, v) => { bell(t, pitch(523.25, 'la'), 0.06 * v, 0.2); bell(t + 0.12, pitch(523.25, 'do', 1), 0.05 * v, 0.3); },
  nostar:   (t, v) => { tone(t, { freq: 220, type: 'sine', peak: 0.035 * v, a: 0.02, d: 0.6 }); },
  ink:      (t, v) => { tone(t, { freq: 1760, type: 'sine', peak: 0.03 * v, a: 0.002, d: 0.12 }); tone(t + 0.04, { freq: 2349, type: 'sine', peak: 0.02 * v, a: 0.002, d: 0.14 }); },
  quest:    (t, v) => { bell(t, pitch(392, 'sol'), 0.05 * v); bell(t + 0.14, pitch(392, 'la'), 0.05 * v); bell(t + 0.28, pitch(392, 'do', 1), 0.06 * v); },
  grow:     (t, v) => { [['sol', 1], ['la', 1], ['do', 2]].forEach(([d, o], i) => pluck(t + i * 0.16, pitch(130.81, d, o), 0.06 * v, (i - 1) * 0.25)); tone(t + 0.5, { freq: pitch(130.81, 'do', 1), type: 'sine', peak: 0.04 * v, a: 0.2, hold: 0.4, d: 1.2 }); tone(t + 0.5, { freq: pitch(130.81, 'sol', 1), type: 'sine', peak: 0.03 * v, a: 0.2, hold: 0.4, d: 1.2 }); },
  build:    (t, v) => { noiseBurst(t, { peak: 0.05 * v, a: 0.005, d: 0.2, filter: 'lowpass', freq: 400 }); tone(t, { freq: 98, type: 'sine', peak: 0.05 * v, a: 0.005, d: 0.3 }); [ 'do', 'mi', 'sol', 'la' ].forEach((d, i) => bell(t + 0.25 + i * 0.1, pitch(261.63, d), 0.045 * v, (i - 1.5) * 0.2)); },
  tick:     (t, v) => { tone(t, { freq: 1200, type: 'sine', peak: 0.012 * v, a: 0.002, d: 0.04 }); },
  hurry:    (t, v) => { tone(t, { freq: 880, type: 'triangle', peak: 0.02 * v, a: 0.002, d: 0.08 }); tone(t + 0.12, { freq: 880, type: 'triangle', peak: 0.02 * v, a: 0.002, d: 0.08 }); },
  arrival:  (t, v) => { VALLEY_PHRASE.slice(0, 3).forEach(([d, o], i) => pluck(t + i * 0.22, pitch(130.81, d, o + 1), 0.055 * v, (i - 1) * 0.3)); tone(t, { freq: 130.81, type: 'sine', peak: 0.03 * v, a: 0.6, hold: 0.6, d: 1.6 }); },
  unlock:   (t, v) => { VALLEY_PHRASE.forEach(([d, o], i) => bell(t + i * 0.18, pitch(261.63, d, o), 0.055 * v, (i % 2 ? 1 : -1) * 0.2)); },
  levelup:  (t, v) => { ['do', 'mi', 'sol', 'do'].forEach((d, i) => bell(t + i * 0.12, pitch(261.63, d, i === 3 ? 1 : 0), 0.055 * v, (i - 1.5) * 0.2)); },
  page:     (t, v) => { noiseBurst(t, { peak: 0.028 * v, a: 0.01, d: 0.18, filter: 'highpass', freq: 1500 }); },
  swoosh:   (t, v) => { noiseBurst(t, { peak: 0.03 * v, a: 0.04, d: 0.28, filter: 'bandpass', freq: 900, q: 0.7 }); },
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
/* Music: a generative pentatonic bed                                  */
/* ------------------------------------------------------------------ */

function seeded(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/**
 * Start (or retune) the music for a place. Idempotent: calling it for the
 * place already playing does nothing; a new place crossfades the pads and
 * moves the line to the new tonic.
 */
export function startMusic(region = 'world', { hour = 'morning', warmth = 0 } = {}) {
  state.music.region = region; state.music.hour = hour;
  // Warmth is how far the valley has come: 0 on the first morning, 1 for a
  // grown, built settlement. It never changes the key or the tempo — it
  // adds a voice and lets the line breathe a little more often, so coming
  // back after months sounds like a fuller place, not a different one.
  const warm = Math.max(0, Math.min(1, warmth));
  state.music.warmth = warm;
  if (!state.music.on || !state.unlocked) return;
  if (gain() <= 0 || !ensure()) return;
  if (state.music.playing && state.music.tonic === (TONIC[region] ?? TONIC.world) && state.music.hourPlaying === hour && Math.abs((state.music.warmthPlaying ?? 0) - warm) < 0.2) return;
  stopMusic(0.9);
  const c = state.ctx;
  const tonic = TONIC[region] ?? TONIC.world;
  const night = hour === 'night' || hour === 'dusk';
  const bed = c.createGain(); bed.gain.setValueAtTime(0.0001, c.currentTime); bed.gain.exponentialRampToValueAtTime(1, c.currentTime + 2.5);
  bed.connect(state.master);
  const pads = [];
  // Two pads: the tonic and its fifth, each two detuned triangles through a
  // slowly breathing lowpass. Quiet enough to sit under the environment.
  const padNotes = night ? [pitch(tonic, 'do', 0), pitch(tonic, 'sol', 0)] : [pitch(tonic, 'do', 0), pitch(tonic, 'sol', 0), pitch(tonic, 'mi', 1)];
  if (warm >= 0.45) padNotes.push(pitch(tonic, night ? 'mi' : 'la', 1));
  if (warm >= 0.8) padNotes.push(pitch(tonic, 'do', 1));
  padNotes.forEach((f, i) => {
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300 + i * 120; lp.Q.value = 0.7;
    const g = c.createGain(); g.gain.value = (night ? 0.02 : 0.026) / padNotes.length * 1.4;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.05 + i * 0.017; const lg = c.createGain(); lg.gain.value = 140; lfo.connect(lg).connect(lp.frequency); lfo.start();
    for (const det of [-6, 6]) { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(); pads.push(o); }
    lp.connect(g).connect(bed);
    pads.push(lfo);
  });
  state.music.pads = pads; state.music.gain = bed; state.music.playing = true; state.music.tonic = tonic; state.music.hourPlaying = hour; state.music.warmthPlaying = warm;
  // The line: a scheduler that places pentatonic plucks on a slow grid,
  // leaning on the Valley Phrase's shapes; rests are part of the music.
  const r = seeded((region.length * 7919 + (night ? 13 : 1)) >>> 0);
  const beat = night ? 0.95 : 0.72;
  let step = 0;
  let last = 2; // degree index
  const lineGain = c.createGain(); lineGain.gain.value = night ? 0.7 : 1; lineGain.connect(bed);
  const schedule = () => {
    if (!state.music.playing) return;
    const t = c.currentTime + 0.1;
    const bar = step % 16;
    let deg = null, oct = 1;
    if (bar === 0 && r() < 0.5) { // sometimes open a bar with the phrase head
      VALLEY_PHRASE.slice(0, 3).forEach(([d, o], i) => pluck(t + i * beat * 0.5, pitch(tonic, d, o), 0.03, (i - 1) * 0.2, lineGain));
      step += 2;
    } else if (r() < (night ? 0.42 : 0.6) + warm * 0.12) {
      const move = r() < 0.6 ? (r() < 0.5 ? -1 : 1) : (r() < 0.5 ? -2 : 2);
      last = Math.max(0, Math.min(DEGREES.length - 1, last + move));
      deg = DEGREES[last]; oct = r() < 0.2 ? 2 : 1;
      pluck(t, pitch(tonic, deg, oct), 0.028 + r() * 0.012, (r() - 0.5) * 0.6, lineGain);
      if (r() < 0.15) pluck(t + beat * 0.5, pitch(tonic, DEGREES[Math.max(0, last - 2)], oct), 0.02, 0, lineGain);
    }
    if (bar === 15 && r() < 0.35) { VALLEY_PHRASE.slice(3).forEach(([d, o], i) => pluck(t + i * beat * 0.5, pitch(tonic, d, o), 0.03, (i - 1) * 0.2, lineGain)); }
    step += 1;
    state.music.timer = setTimeout(schedule, beat * 1000 * (r() < 0.25 ? 2 : 1));
  };
  state.music.timer = setTimeout(schedule, 1200);
}

export function stopMusic(fade = 0.6) {
  const m = state.music;
  if (!m.playing) return;
  clearTimeout(m.timer);
  const c = state.ctx;
  const bed = m.gain, pads = m.pads;
  try { bed.gain.cancelScheduledValues(c.currentTime); bed.gain.setValueAtTime(Math.max(0.0001, bed.gain.value), c.currentTime); bed.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + fade); } catch { /* ignore */ }
  setTimeout(() => { for (const o of pads) { try { o.stop(); } catch { /* ignore */ } } try { bed.disconnect(); } catch { /* ignore */ } }, fade * 1000 + 50);
  m.playing = false; m.pads = []; m.gain = null;
}

/* ------------------------------------------------------------------ */
/* Ambience                                                            */
/* ------------------------------------------------------------------ */

/**
 * The environment of a place: wind everywhere (louder in the Wilds and on
 * the tower), water near the pond and river, birds by day, crickets at
 * night, rain or snow-hush by weather.
 */
export function startAmbience(region = 'world', { hour = 'morning', weather = 'clear', season = 'summer' } = {}) {
  if (gain() <= 0 || !ensure() || !state.unlocked) { state.amb.region = region; return; }
  const key = `${region}|${hour}|${weather}|${season}`;
  if (state.amb.key === key) return;
  stopAmbience(0.8);
  state.amb.key = key; state.amb.region = region;
  const c = state.ctx;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(1, c.currentTime + 2);
  g.connect(state.master);
  const nodes = [], timers = [];
  const night = hour === 'night' || hour === 'dusk';
  const windy = region === 'wilds' || region === 'reading-room' || weather === 'snow';
  // Wind: pink noise through a slow-breathing lowpass.
  { const src = c.createBufferSource(); src.buffer = state.noise; src.loop = true; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; const wg = c.createGain(); wg.gain.value = windy ? 0.16 : 0.07; const lfo = c.createOscillator(); lfo.frequency.value = 0.08; const lg = c.createGain(); lg.gain.value = 180; lfo.connect(lg).connect(lp.frequency); lfo.start(); src.connect(lp).connect(wg).connect(g); src.start(); nodes.push(src, lfo); }
  // Water near the pond, the meadow's stream, the reading room's river bend.
  if (['pond', 'meadow', 'world', 'hearth'].includes(region)) { const src = c.createBufferSource(); src.buffer = state.noise; src.loop = true; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = region === 'pond' ? 900 : 1400; bp.Q.value = 0.9; const wg = c.createGain(); wg.gain.value = region === 'pond' ? 0.07 : 0.03; const lfo = c.createOscillator(); lfo.frequency.value = 0.35; const lg = c.createGain(); lg.gain.value = 320; lfo.connect(lg).connect(bp.frequency); lfo.start(); src.connect(bp).connect(wg).connect(g); src.start(); nodes.push(src, lfo); }
  // Rain: brighter noise plus occasional drips.
  if (weather === 'rain') { const src = c.createBufferSource(); src.buffer = state.noise; src.loop = true; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2200; const wg = c.createGain(); wg.gain.value = 0.11; src.connect(hp).connect(wg).connect(g); src.start(); nodes.push(src); const drip = () => { if (state.amb.key !== key) return; tone(c.currentTime, { freq: 1800 + Math.random() * 900, type: 'sine', peak: 0.014, a: 0.002, d: 0.08, pan: Math.random() * 2 - 1, dest: g }); timers.push(setTimeout(drip, 180 + Math.random() * 500)); }; timers.push(setTimeout(drip, 400)); }
  // Birds by day (not in rain), crickets at night, in the green places.
  const green = ['world', 'hearth', 'rootwood', 'meadow', 'pond', 'thicket', 'terraces'].includes(region);
  if (green && !night && weather !== 'rain' && season !== 'winter') {
    const chirp = () => { if (state.amb.key !== key) return; const base = 2200 + Math.random() * 1400; const n = 2 + Math.floor(Math.random() * 4); const pan = Math.random() * 1.6 - 0.8; for (let i = 0; i < n; i += 1) { const t = c.currentTime + i * (0.07 + Math.random() * 0.06); tone(t, { freq: base * (1 + (Math.random() - 0.5) * 0.18), type: 'sine', peak: 0.012, a: 0.01, d: 0.07, pan, dest: g }); } timers.push(setTimeout(chirp, 2500 + Math.random() * 7000)); };
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

/** Everything off — leaving the world for a session that carries its own sound. */
export function silenceWorld() { stopMusic(0.5); stopAmbience(0.5); state.music.region = null; }
