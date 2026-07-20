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
 * Phase V, Stage W5 (LANGUAGE GARDEN — THE WORLD.md Part 11, "The Music
 * of the Valley"): the valley's one leitmotif, the Valley Phrase, joins
 * here. It is never played whole except once ever per grown biome — it
 * lives as a head (arrival) and a tail (growth), so the learner's ear
 * assembles a song it has never heard whole. `pitchHz`/`VALLEY_PHRASE`
 * are pure and exported so tools/verify.mjs can hold the actual pitches
 * to THE WORLD's pinned notes mechanically, not just by ear.
 *
 * Import-safe under plain Node (no AudioContext touched until a sound
 * actually plays), so tools/verify.mjs can dry-run this file.
 */

import { feedbackPrefs } from '../../../core/engagement/feedback.js';
import { weatherFor } from './atmosphere.js';

const C3 = 130.81, D3 = 146.83, E3 = 164.81, G3 = 196.0, A3 = 220.0;
const C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392.0, A4 = 440.0;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 783.99, A5 = 880.0;

/* ------------------------------------------------------------------ */
/* The Valley Phrase (THE WORLD Part 11.2, 11.4): one musical sentence  */
/* in the pentatonic canon, stated in scale degrees over a tonic that   */
/* pins to each biome (§10.3, 11.4). Pure pitch math, no AudioContext,  */
/* so it is exported for tools/verify.mjs to check mechanically.        */
/* ------------------------------------------------------------------ */

/** Semitone offsets of the Bible's pentatonic scale (§10.3: do re mi sol
 *  la — no fa, no ti) above its tonic. */
export const PENTATONIC_SEMITONES = Object.freeze({ do: 0, re: 2, mi: 4, sol: 7, la: 9 });

/** The Hz of one scale degree, `octave` steps above the tonic's own
 *  octave (equal temperament) — the single mechanism every biome's
 *  transposition of the Valley Phrase runs through. */
export function pitchHz(tonicHz, degree, octave = 0) {
  return tonicHz * (2 ** ((PENTATONIC_SEMITONES[degree] + octave * 12) / 12));
}

/** The phrase itself (§11.2), as scale degrees — locked. The head is a
 *  question (mi–sol–la), the tail is its answer (sol–la–do′), and the
 *  full phrase is simply the two concatenated (mi–sol–la–sol–la–do′):
 *  the "same phrase to the ear" acceptance gate is exactly this
 *  identity — `full` is BUILT from `head`+`tail`, never re-authored
 *  separately, so the two can never quietly drift apart. */
const PHRASE_HEAD = Object.freeze([{ degree: 'mi', octave: 1 }, { degree: 'sol', octave: 1 }, { degree: 'la', octave: 1 }]);
const PHRASE_TAIL = Object.freeze([{ degree: 'sol', octave: 1 }, { degree: 'la', octave: 1 }, { degree: 'do', octave: 2 }]);
export const VALLEY_PHRASE = Object.freeze({
  head: PHRASE_HEAD,
  tail: PHRASE_TAIL,
  full: Object.freeze([...PHRASE_HEAD, ...PHRASE_TAIL]),
});

/** THE WORLD Part 11.4 pins the Bible's relative tonic table (§10.3) to
 *  real pitch classes. Keyed by biomes.js's own `tonic` descriptor
 *  string (not by what that string says — Rootwood's is 'low', Mirror
 *  Pond's is 'lowest', a labelling quirk predating this stage that is
 *  not this stage's to fix), so the mapping is by BIOME IDENTITY: a
 *  future biome only needs its existing `tonic` field, nothing here
 *  changes. Thicket's "A leaning on G, resolving to the tonic only at
 *  Growth" is encoded as its true tonic (G) — the leaning tension itself
 *  is unbuilt, honestly, because the Thicket has no engine yet
 *  (biomes.js ENGINES.origin.implemented is false) and there is nothing
 *  to attach it to. */
const TONIC_HZ = Object.freeze({
  low: C3,        // Rootwood — the lowest bed (11.4: Rootwood C)
  fifth: G3,       // Vine Terraces — a fifth above the Rootwood (Terraces G)
  major: E3,       // Orchard — bright major colour (Orchard E)
  high: A3,        // Meadow — highest, no bass beneath (Meadow A)
  lowest: D3,      // Mirror Pond — low, and alone (Mirror Pond D)
  dissonant: G3,   // Thicket — leans on A, resolves to G only at Growth
  none: null,      // Wilds — no tonic, wind only (§10.3)
});

/** The Hz to root the Valley Phrase on for a given biome (11.4). Falls
 *  back to the Rootwood's own tonic — today's only living biome, and
 *  the phrase's concrete pitches (§11.2) are already written C-rooted. */
export function tonicHzForBiome(biome) {
  return (biome && TONIC_HZ[biome.tonic]) || C3;
}

const state = {
  ctx: null,
  master: null,
  noiseBuf: null,
  ambienceOn: false,
  ambienceGain: null,
  ambienceSrc: null,
  chirpTimer: null,
  landmarkSong: false, // a bird nests and sings in a Landmark tree (§6.5)
  location: null,      // 'overlook' | 'inner' | 'session' | null (outside the garden) — see setGardenLocation()
  idleTimer: null,     // the Overlook idle fragment's own schedule (§11.2)
  idleCount: 0,        // fragments played this garden visit, capped at 2
  kettleArmed: false,  // eligible to fire the kettle-stone tick once this visit (§11.5)
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
/* The two voices of the Valley Phrase (THE WORLD §11.3). Character is  */
/* pinned; exact envelope numbers are the free parameters that section  */
/* explicitly leaves to an implementer. Neither voice is used for the   */
/* garden's ordinary event set (commit/key/leafTap/bloom) — those keep  */
/* their existing plain-sine identity untouched.                        */
/* ------------------------------------------------------------------ */

/** Felt piano: sine fundamental + a soft octave partial (~0.3 gain), a
 *  4-8ms attack with a breath of filtered noise as the hammer,
 *  exponential decay 1.2-2.5s, low-passed near 2.2kHz — "a piano heard
 *  through a wall at dusk." Used only for the Overlook idle fragment and
 *  the once-ever full Valley Phrase on a biome's Growth (§11.2). */
function feltPiano(t, freq, { peak = 0.04, decay = 1.8 } = {}) {
  const c = state.ctx;
  const bus = c.createGain();
  bus.gain.value = 1;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2200;
  lp.Q.value = 0.5;
  bus.connect(lp).connect(state.master);

  const a = 0.006; // 4-8ms hammer attack
  const o1 = c.createOscillator();
  o1.type = 'sine';
  o1.frequency.setValueAtTime(freq, t);
  const g1 = c.createGain();
  g1.gain.setValueAtTime(0.0001, t);
  g1.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + a);
  g1.gain.exponentialRampToValueAtTime(0.0001, t + a + decay);
  o1.connect(g1).connect(bus);
  o1.start(t);
  o1.stop(t + a + decay + 0.05);

  const o2 = c.createOscillator(); // the octave partial, ~0.3 gain
  o2.type = 'sine';
  o2.frequency.setValueAtTime(freq * 2, t);
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.3), t + a);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + a + decay * 0.8);
  o2.connect(g2).connect(bus);
  o2.start(t);
  o2.stop(t + a + decay * 0.8 + 0.05);

  const hammer = c.createBufferSource(); // the breath of noise at onset
  hammer.buffer = state.noiseBuf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq * 3;
  bp.Q.value = 0.8;
  const gN = c.createGain();
  gN.gain.setValueAtTime(0.0001, t);
  gN.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.4), t + 0.003);
  gN.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
  hammer.connect(bp).connect(gN).connect(bus);
  hammer.start(t);
  hammer.stop(t + 0.03);
}

/** Breath strings: two triangles detuned ±5-8 cents through a low-pass
 *  near 900Hz, attack 500ms+, release long — used only inside the
 *  arrival swell, under the head. Never sustained as a pad outside it. */
function breathString(t, freq, { peak = 0.026, attack = 0.55, release = 1.3 } = {}) {
  const c = state.ctx;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900;
  lp.Q.value = 0.5;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
  lp.connect(g).connect(state.master);
  for (const cents of [-6, 6]) {
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq * (2 ** (cents / 1200)), t);
    o.connect(lp);
    o.start(t);
    o.stop(t + attack + release + 0.05);
  }
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
  /** Arrival (§10.5 #7; THE WORLD §11.2): the Valley Phrase's HEAD —
   *  mi–sol–la, "a question" — hummed by the breath-strings voice, at the
   *  pinned clock (0 / +0.7s / +1.4s), each note blooming rather than
   *  striking (the voice's own 500ms+ attack). The three notes' long,
   *  overlapping attacks and releases ARE the "soft swell… as the valley
   *  fades in" (§10.5 #7) — no separate chord underneath; THE WORLD
   *  rebinds the swell to be exactly this. Always the base (Rootwood)
   *  tonic: arrival happens before any biome is chosen. Plays once when
   *  the learner steps into the Garden from outside. */
  arrival(t, m) {
    const tonic = C3;
    VALLEY_PHRASE.head.forEach((n, i) => {
      breathString(t + i * 0.7, pitchHz(tonic, n.degree, n.octave), { peak: 0.028 * m, attack: 0.55, release: 1.3 - i * 0.06 });
    });
  },
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
   *  body, a sustained fifth held gently underneath (the harmony), and a
   *  rising figure that blooms and resolves on a long, ringing tail — the
   *  sound you pause and smile at. THE WORLD §11.2: the figure IS the Valley
   *  Phrase's TAIL (sol–la–do′) — "growth always answers" — rooted on the
   *  biome's own tonic (default the Rootwood, today's only living biome),
   *  never a new sound beside it. Kept in a warm register (nothing above the
   *  tonic's do′ two octaves up). */
  growth(t, m, { tonic = C3 } = {}) {
    tone(t,        { freq: pitchHz(tonic, 'do', 0),  type: 'sine', peak: 0.050 * m, a: 0.06, hold: 0.14, d: 1.5 });   // body
    tone(t + 0.02, { freq: pitchHz(tonic, 'sol', 0), type: 'sine', peak: 0.030 * m, a: 0.09, hold: 0.26, d: 1.3, pan: -0.14 }); // harmony
    tone(t + 0.02, { freq: pitchHz(tonic, 'do', 1),  type: 'sine', peak: 0.028 * m, a: 0.09, hold: 0.26, d: 1.3, pan: 0.14 });
    tone(t,        { freq: pitchHz(tonic, 'sol', 1), type: 'sine', peak: 0.038 * m, a: 0.035, d: 0.70 });  // the tail blooms: sol…
    tone(t + 0.17, { freq: pitchHz(tonic, 'la', 1),  type: 'sine', peak: 0.042 * m, a: 0.035, d: 0.85 });  // …la…
    tone(t + 0.36, { freq: pitchHz(tonic, 'do', 2),  type: 'sine', peak: 0.054 * m, a: 0.04,  d: 1.20 });  // …do′, and resolves, ringing
  },
  /** Regrowth (§10.5 #5; THE WORLD §11.2 "as canon"): a revisit is a memory
   *  that faded and came back. THE WORLD pins the shape precisely: the
   *  tail's own contour INVERTED (do′–la–sol, the tail read backwards) then
   *  RISING, resolving one step higher than the tail's own do′ — the next
   *  pentatonic degree up, re′. Same warm register, same sustained-fifth
   *  harmony bed as Growth (it is still a peak, still the only harmony in
   *  the product), but every melody note now belongs to the tail itself or
   *  to its resolution one step above it — nothing borrowed from outside
   *  it, unlike the pre-W5 shape this replaces. */
  regrowth(t, m, { tonic = C3 } = {}) {
    tone(t,        { freq: pitchHz(tonic, 'do', 0),  type: 'sine', peak: 0.050 * m, a: 0.06, hold: 0.14, d: 1.5 });   // body
    tone(t + 0.02, { freq: pitchHz(tonic, 'sol', 0), type: 'sine', peak: 0.030 * m, a: 0.09, hold: 0.28, d: 1.35, pan: -0.14 }); // harmony (the held fifth)
    tone(t + 0.02, { freq: pitchHz(tonic, 'do', 1),  type: 'sine', peak: 0.026 * m, a: 0.09, hold: 0.28, d: 1.35, pan: 0.14 });
    // The inverted tail: do′ (where the tail ends) … la … sol (where the
    // tail begins) — then rising past it, resolving one step higher.
    tone(t,        { freq: pitchHz(tonic, 'do', 2),  type: 'sine', peak: 0.040 * m, a: 0.035, d: 0.62 });  // do′, inverted…
    tone(t + 0.15, { freq: pitchHz(tonic, 'la', 1),  type: 'sine', peak: 0.034 * m, a: 0.035, d: 0.60 });  // …la…
    tone(t + 0.32, { freq: pitchHz(tonic, 'sol', 1), type: 'sine', peak: 0.044 * m, a: 0.035, d: 0.80 });  // …sol (the dip complete)…
    tone(t + 0.52, { freq: pitchHz(tonic, 're', 2),  type: 'sine', peak: 0.052 * m, a: 0.04,  d: 1.20 });  // …rising, resolving one step higher
  },
  /** The Overlook idle fragment (THE WORLD §11.2, "optional, sparse"): a
   *  single, distant statement of two ADJACENT notes of the Valley Phrase
   *  — never the whole thing — in the felt-piano voice, 1.2s apart, mixed
   *  at the assembly-tick tier (far beneath any event). "A wind chime of
   *  the theme, not a performance." Weather-tinted: quieter and a touch
   *  more muffled under rain, fog, or snow. Scheduling (at most twice a
   *  visit, never inside a session, never closer than 45s apart) lives in
   *  setGardenLocation()/scheduleIdleFragment() below; this function only
   *  ever plays one pair. */
  idleFragment(t, m, { tonic = C3, pairIndex = 0, weatherTint = 1 } = {}) {
    const i = Math.max(0, Math.min(pairIndex, VALLEY_PHRASE.full.length - 2));
    const a = VALLEY_PHRASE.full[i];
    const b = VALLEY_PHRASE.full[i + 1];
    const peak = 0.020 * m * weatherTint; // the assembly-tick tier (leafTap's grain sits at 0.014-0.032×m)
    const decay = 1.5 - 0.3 * (1 - weatherTint); // weather muffles the ring a little too
    feltPiano(t,       pitchHz(tonic, a.degree, a.octave), { peak, decay });
    feltPiano(t + 1.2, pitchHz(tonic, b.degree, b.octave), { peak: peak * 0.92, decay });
  },
  /** A biome grown (Bible §3.5, §8.8; THE WORLD §11.2): "the only time the
   *  valley ever sings its whole song." The full phrase, once ever per
   *  biome, in the felt-piano voice, solo and unaccompanied — no harmony
   *  bed, unlike Growth — at roughly 66 to the quarter, about five seconds
   *  end to end. Dormant in practice today (it needs every family in a
   *  biome to be at least Mature at once), built correctly so it is ready
   *  the day a valley earns it. Replaces the ordinary Regrowth chime for
   *  the one session that crosses the line (Law 6: one peak per session —
   *  never both). */
  grownPhrase(t, m, { tonic = C3 } = {}) {
    const STEP = 60 / 66;
    VALLEY_PHRASE.full.forEach((n, i) => {
      feltPiano(t + i * STEP, pitchHz(tonic, n.degree, n.octave), { peak: 0.050 * m, decay: 2.0 });
    });
  },
  /** The Hearth's kettle-stone (THE WORLD §11.5): "the closest the Garden
   *  ever comes to saying someone lives here." Two soft unpitched ticks of
   *  cooling metal, 300ms apart — the quietest event in the product, and
   *  the only one built from noise alone (no pitch at all: a tick is not a
   *  note). Dawn, in autumn or winter, at most once per garden visit —
   *  scheduled by maybeKettleTick() below from the Overlook, the only
   *  scene the Hearth stands in. */
  kettleTick(t, m) {
    grain(t,        { peak: 0.010 * m, a: 0.004, d: 0.05, freq: 3200, q: 2.4 });
    grain(t + 0.3,  { peak: 0.009 * m, a: 0.004, d: 0.05, freq: 3450, q: 2.4 });
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

/** Soft haptics, layered under the sounds (§14.5). Exactly two SENSATIONS
 *  exist (Principle 111): a light commitment tick (the same for right and
 *  wrong), and the warmer, longer growth thump — the physical half of the
 *  peak, so it survives with sound off. A revisit's Regrowth is still that
 *  one peak, so it shares the growth thump; it is not a third haptic. The
 *  once-ever grownPhrase is rarer still but is still that same one peak
 *  (§11.7: "every learner, on every setting, feels the tree grow" — sound
 *  off must lose nothing), so it shares the thump too, not a third one.
 *  Gated by the shell's own haptics preference. */
const HAPTICS = { commit: 12, growth: [16, 22, 34], regrowth: [16, 22, 34], grownPhrase: [16, 22, 34] };

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

/** The nesting bird's song (§4.8, §6.5): "the most earned sound in the
 *  product." Warmer, fuller, and lower than the sparse ambient chirp — a
 *  short phrase that dips and lifts, the same shape as Regrowth, so the
 *  Landmark's bird and the Landmark's tree speak with one voice. By day
 *  only; a Landmark at night belongs to the owl and the fireflies. */
function landmarkPhrase(t, m) {
  const song = [G4, E4, A4, C5]; // dip, then rise past the start — the earned motif
  for (let i = 0; i < song.length; i += 1) {
    tone(t + i * (0.12 + Math.random() * 0.04), {
      freq: song[i] * 2, type: 'sine', peak: (0.013 + Math.random() * 0.005) * m,
      a: 0.006, d: 0.10 + Math.random() * 0.05, pan: Math.random() * 0.8 - 0.4,
    });
  }
}

function scheduleChirp() {
  if (!state.ambienceOn) return;
  const delay = 18000 + Math.random() * 24000; // rare: every 18 to 42 seconds
  state.chirpTimer = setTimeout(() => {
    if (!state.ambienceOn || !state.ctx || document.hidden || gardenGain() <= 0) { scheduleChirp(); return; }
    const t = state.ctx.currentTime;
    const m = gardenGain();
    const hour = new Date().getHours();
    const isNight = hour >= 20 || hour < 5; // matches atmosphere.js's night window
    // A Landmark's nesting bird sings sometimes, by day — a fuller phrase than
    // the valley's generic distant chirp, and audible from the Overlook.
    if (state.landmarkSong && !isNight && Math.random() < 0.4) {
      landmarkPhrase(t, m);
      scheduleChirp();
      return;
    }
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
 *         about the Stream keeps its exact prior behaviour.
 *  @param {{landmark?: boolean}} [opts] when the valley holds at least one
 *         Landmark tree (§6.5), its nesting bird may sing by day — a fuller
 *         phrase than the generic chirp, audible from the Overlook. */
export function startGardenAmbience(streamLevel = 1, opts = {}) {
  try {
    state.landmarkSong = !!opts.landmark;
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
    // Calibrated up a step in Phase 4.9 (P6): at the Bible's own 40–50%
    // master volume the old bed sat below audibility on a phone speaker.
    // Still the quietest layer in the mix — a presence, never a soundtrack.
    g.gain.setValueAtTime(0, c.currentTime);
    g.gain.setTargetAtTime(0.036 * gardenGain() * (0.5 + 0.5 * level), c.currentTime, 1.2);
    src.connect(f).connect(g).connect(state.master);
    src.start();

    state.ambienceGain = g;
    state.ambienceSrc = src;
    state.ambienceOn = true;
    scheduleChirp();
    if (state.location === 'overlook') scheduleIdleFragment(); // ambience just turned on while already standing here
  } catch { /* silently fine */ }
}

export function stopGardenAmbience() {
  state.ambienceOn = false;
  if (state.chirpTimer) { clearTimeout(state.chirpTimer); state.chirpTimer = null; }
  if (state.idleTimer) { clearTimeout(state.idleTimer); state.idleTimer = null; }
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

/* ------------------------------------------------------------------ */
/* Where the learner is standing, for the two placements that depend   */
/* on it (THE WORLD §11.2, §11.5): the Overlook idle fragment and the   */
/* Hearth's kettle-stone tick both need "specifically the Overlook,     */
/* right now" and "the start of a fresh visit to the garden" — neither  */
/* is derivable from the Ambience on/off state alone, since ambience    */
/* keeps playing across the Overlook/biome/plant/journal the whole      */
/* visit through. The shell calls setGardenLocation() on every route    */
/* change (app.js syncGardenSoundscape); nothing else needs to know.    */
/* ------------------------------------------------------------------ */

/** @param {'overlook'|'inner'|'session'|null} loc  'overlook' is exactly
 *  the Overlook; 'inner' is a biome/plant/journal; 'session' is an actual
 *  learning session (never eligible for either sound below); null is
 *  outside the garden entirely. A transition INTO the garden from null,
 *  from any of the other three, is a fresh visit: the idle fragment's
 *  twice-per-visit budget resets and the kettle tick is re-armed. */
export function setGardenLocation(loc) {
  const freshVisit = loc !== null && state.location === null;
  const wasOverlook = state.location === 'overlook';
  state.location = loc;
  if (freshVisit) { state.idleCount = 0; state.kettleArmed = true; }
  if (loc !== 'overlook') {
    if (state.idleTimer) { clearTimeout(state.idleTimer); state.idleTimer = null; }
    return;
  }
  if (!wasOverlook) scheduleIdleFragment(); // just arrived at the Overlook specifically
}

/** Schedules (and re-schedules) the Overlook idle fragment. Self-guarding
 *  on every axis the placement rule names: only while ambience is on,
 *  only while still standing at the Overlook when the timer actually
 *  fires (a learner who has since moved on gets silence, not a stray
 *  note), at most twice per visit, and — because each firing reschedules
 *  the NEXT one at a 45-90s delay — never closer together than the
 *  pinned 45s floor. */
function scheduleIdleFragment() {
  if (state.idleTimer || !state.ambienceOn || state.idleCount >= 2) return;
  const delay = state.idleCount === 0 ? (8000 + Math.random() * 14000) : (45000 + Math.random() * 30000);
  state.idleTimer = setTimeout(() => {
    state.idleTimer = null;
    if (state.location === 'overlook' && state.ambienceOn && !document.hidden && gardenGain() > 0 && state.idleCount < 2) {
      const tint = { clear: 1, wind: 1, rain: 0.7, fog: 0.75, snow: 0.8 }[weatherFor()] ?? 1;
      playGardenSound('idleFragment', { pairIndex: Math.floor(Math.random() * (VALLEY_PHRASE.full.length - 1)), weatherTint: tint });
      state.idleCount += 1;
    }
    if (state.location === 'overlook') scheduleIdleFragment();
  }, delay);
}

/** The Hearth's kettle-stone tick (§11.5): called once per Overlook
 *  render (overlook.js), which is the only scene that draws the Hearth.
 *  Consumes the visit's single "armed" chance regardless of outcome — if
 *  it is not dawn in a cold season right now, it will not retroactively
 *  become so later in the same sitting, so there is nothing to keep
 *  waiting for. A short delay avoids landing on top of the arrival swell
 *  when this is also the first screen of a fresh visit. */
export function maybeKettleTick(atmo) {
  if (!state.kettleArmed) return;
  state.kettleArmed = false;
  const cold = atmo.season === 'autumn' || atmo.season === 'winter';
  if (atmo.time !== 'dawn' || !cold) return;
  setTimeout(() => playGardenSound('kettleTick'), 3200);
}

export const GARDEN_SOUND_NAMES = Object.freeze(Object.keys(SOUNDS));
