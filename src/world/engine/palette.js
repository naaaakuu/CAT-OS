/**
 * palette.js — colour math and seeded randomness for the world engine.
 * Pure functions only: no DOM, no canvas. Every visual value in the world
 * is derived from the ramps here, so a season, an hour, or a whole mood
 * can be retuned in one place.
 *
 * The world is drawn in pixel art: a small number of flat colours per
 * object, a lit face, a base tone, a shade tone, and a dark outline. The
 * ramps below turn one base colour into that quartet deterministically.
 */

/* ------------------------------------------------------------------ */
/* Seeded randomness (mulberry32 over an FNV-1a hash). Same seed, same  */
/* stream, forever — the world never rearranges itself between frames.  */
/* ------------------------------------------------------------------ */

export function hashSeed(seed) {
  let h = 2166136261;
  const s = String(seed ?? 'cat-os');
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** @returns {() => number} a deterministic PRNG in [0, 1). */
export function rng(seed) {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth 2-D value noise in [0, 1) — the terrain's grain. */
export function noise2(seed) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const base = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  for (let i = 0; i < 512; i += 1) perm[i] = base[i & 255];
  const grad = (h, x, y) => { const g = h & 3; return (g & 1 ? -x : x) + (g & 2 ? -y : y); };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    const n = lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u), v,
    );
    return (n + 1) / 2;
  };
}

/* ------------------------------------------------------------------ */
/* Colour                                                              */
/* ------------------------------------------------------------------ */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix `a` toward `b` by `t` (0..1). */
export function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

export function hslToRgb([h, s, l]) {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** Shift a colour's hue/saturation/lightness by deltas. */
export function shift(hex, { h = 0, s = 0, l = 0 } = {}) {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl[0] = (hsl[0] + h + 1) % 1;
  hsl[1] = Math.max(0, Math.min(1, hsl[1] + s));
  hsl[2] = Math.max(0, Math.min(1, hsl[2] + l));
  return rgbToHex(hslToRgb(hsl));
}

/**
 * A pixel-art ramp from one base colour: the classic four tones. The lit
 * face warms and lightens (hue toward yellow), the shade cools and darkens
 * (hue toward blue/purple) — hue-shifted shading is what keeps flat pixel
 * colours from looking muddy.
 */
export function ramp(base) {
  return {
    light: towardHue(base, 1 / 6, 0.25, { s: 0.02, l: 0.16 }),
    base,
    shade: towardHue(base, 2 / 3, 0.12, { s: 0.02, l: -0.14 }),
    dark: towardHue(base, 2 / 3, 0.2, { s: 0.02, l: -0.28 }),
  };
}

/** Move a colour's hue part of the way toward a target hue (0..1 on the
 *  wheel, shortest way round), then adjust saturation and lightness —
 *  pixel-art shading: highlights lean to yellow, shadows to blue. */
function towardHue(hex, target, amount, { s = 0, l = 0 } = {}) {
  const hsl = rgbToHsl(hexToRgb(hex));
  let d = target - hsl[0];
  if (d > 0.5) d -= 1; else if (d < -0.5) d += 1;
  const scale = Math.min(1, hsl[1] * 1.5) * (1 - Math.abs(hsl[2] - 0.5));
  hsl[0] = (hsl[0] + d * amount * scale + 1) % 1;
  hsl[1] = Math.max(0, Math.min(1, hsl[1] + s));
  hsl[2] = Math.max(0, Math.min(1, hsl[2] + l));
  return rgbToHex(hslToRgb(hsl));
}

/* ------------------------------------------------------------------ */
/* The pigment canon: every base colour the world is built from.       */
/* ------------------------------------------------------------------ */

export const PIGMENT = Object.freeze({
  grass: '#79B85A',
  grassDeep: '#5C9C47',
  grassPale: '#9CCB74',
  meadow: '#A6CF72',
  earth: '#B98F5C',
  path: '#D9BE8A',
  pathEdge: '#B99A66',
  stone: '#9B9DA5',
  stoneWarm: '#BFB4A2',
  water: '#4D9FD3',
  waterDeep: '#2F79B4',
  waterGlint: '#E8F6FF',
  sand: '#E4D3A5',
  trunk: '#7A5A3E',
  trunkDark: '#4E3A29',
  canopy: '#4E9E4C',
  canopyDeep: '#2F7A3E',
  pine: '#3E8A62',
  autumn: '#D98A3A',
  autumnRed: '#C6533A',
  blossom: '#F4B8CF',
  snow: '#F6F9FF',
  wallLit: '#F1E1C0',
  wallShade: '#C9AF86',
  roof: '#5D7F90',
  roofDeep: '#3F5C6C',
  roofWarm: '#B8624A',
  timber: '#7B5A44',
  windowLight: '#FFD37A',
  lantern: '#FFB955',
  firefly: '#F8F19A',
  bramble: '#3F6B3F',
  thorn: '#6B5240',
  berry: '#8B57A0',
  terrace: '#D9C29B',
  terraceShade: '#B39A70',
  vine: '#5FA65A',
  mountain: '#7B8BB5',
  mountainFar: '#A9B6D6',
  mountainSnow: '#EEF3FB',
  koiOrange: '#F27A3A',
  koiWhite: '#FBF7F0',
  koiBlack: '#2B2B33',
  lily: '#5FAE63',
  lilyBloom: '#F7C9DF',
  cat: '#4A4644',
  smoke: '#E8E3DB',
  reed: '#7FA86A',
  gold: '#F2C14E',
  ink: '#1C1D1F',
  outline: '#2A2A38',
});

/* ------------------------------------------------------------------ */
/* Hours and seasons                                                   */
/* ------------------------------------------------------------------ */

/** Sky gradients per hour: [zenith, mid, horizon]. */
export const SKY = Object.freeze({
  dawn:      ['#6C6FB0', '#E39C8E', '#FBDCA8'],
  morning:   ['#3F87CB', '#8EC4E6', '#E9F3E3'],
  afternoon: ['#3A7FC3', '#97CAE7', '#F6E8B6'],
  dusk:      ['#383D7C', '#A8608E', '#F4A65C'],
  night:     ['#0A1230', '#16264C', '#2B436F'],
});

/** The lighting overlay per hour, as a multiply colour and strength, plus
 *  how strongly window and lantern lights show. Day multiplies by white
 *  (no change); night by a deep blue, which is why lit windows glow. */
export const LIGHT = Object.freeze({
  dawn:      { tint: '#FFD8B0', strength: 0.22, lamps: 0.55, stars: 0.2 },
  morning:   { tint: '#FFFFFF', strength: 0.0, lamps: 0.0, stars: 0 },
  afternoon: { tint: '#FFF1C8', strength: 0.10, lamps: 0.0, stars: 0 },
  dusk:      { tint: '#9A6A9E', strength: 0.36, lamps: 0.85, stars: 0.5 },
  night:     { tint: '#2A3F8C', strength: 0.58, lamps: 1.0, stars: 1 },
});

/** Season palettes: canopy ramp base, meadow grass, blossom presence. */
export const SEASON = Object.freeze({
  spring: { canopy: '#63B356', grass: '#86C463', meadow: '#A9D67C', blossom: true, leaves: false, snow: false },
  summer: { canopy: '#4E9E4C', grass: '#79B85A', meadow: '#A6CF72', blossom: false, leaves: false, snow: false },
  autumn: { canopy: '#D98A3A', grass: '#A3AE58', meadow: '#C4B966', blossom: false, leaves: true, snow: false },
  winter: { canopy: '#8C9AA6', grass: '#DCE4EA', meadow: '#E6EBF0', blossom: false, leaves: false, snow: true },
});

/** The hour of a Date, in the world's five words. */
export function hourWord(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'night';
  if (h < 8) return 'dawn';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'dusk';
  return 'night';
}

/** The calendar season (northern hemisphere, as the CAT calendar reads it). */
export function seasonWord(date = new Date()) {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/** Deterministic weather for a day: calm most days, a little rain or fog
 *  now and then, snow only in winter — seeded by the date so it holds all day. */
export function weatherWord(date = new Date(), season = seasonWord(date)) {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const r = rng(`weather:${key}`)();
  if (season === 'winter') return r < 0.28 ? 'snow' : r < 0.4 ? 'fog' : 'clear';
  if (season === 'autumn') return r < 0.2 ? 'rain' : r < 0.32 ? 'fog' : 'clear';
  if (season === 'spring') return r < 0.22 ? 'rain' : 'clear';
  return r < 0.1 ? 'rain' : 'clear';
}
