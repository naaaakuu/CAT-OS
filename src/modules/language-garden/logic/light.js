/**
 * light.js — the painted-light recipe (LANGUAGE GARDEN — THE WORLD.md
 * Part 5.2, Stage W1). Pure colour math, no DOM: every function takes
 * hex strings and numbers and returns a hex string or a plain object.
 * Nothing here reads the clock or the world; callers pass the hour.
 *
 * The recipe, pinned so two builders paint the same light:
 *
 *  - A LIT face is the body colour mixed 25% toward the hour's light
 *    colour, lifted about 6 points of lightness.
 *  - A SHADE face is the body colour mixed 20% toward the hour's shadow
 *    colour, dropped about 8 points of lightness.
 *  - A CONTACT shadow is an ellipse 1.1x the object's width, offset away
 *    from the sun by 15% of that width, in the hour's shadow colour at
 *    18% opacity.
 *  - A CAST shadow (dawn, dusk, or autumn only) runs 2.2x the object's
 *    height at 12% opacity, in the same away-from-sun direction.
 *
 * The hour tables below mirror tokens.css's --garden-light-* and
 * --garden-shadow-* values exactly (Part 6.2) — kept here too because
 * SVG markup is built as static strings before insertion, with no DOM
 * pass to read CSS custom properties back out.
 */

export const HOURS = Object.freeze(['dawn', 'morning', 'afternoon', 'dusk', 'night']);

const HOUR_LIGHT = Object.freeze({
  dawn: '#F6D9A8',
  morning: '#F4E6AC',
  afternoon: '#F2DA9E',
  dusk: '#F3C68F',
  night: '#C7D6EA',
});

const HOUR_SHADOW = Object.freeze({
  dawn: '#7A7490',
  morning: '#5F7E63',
  afternoon: '#68806B',
  dusk: '#4E4A72',
  night: '#2C3A4E',
});

/** The pinned mix/lift ratios (§5.2). */
export const LIT_MIX_RATIO = 0.25;
export const LIT_LIFT = 6;
export const SHADE_MIX_RATIO = 0.20;
export const SHADE_DROP = 8;
export const CONTACT_SHADOW_WIDTH_RATIO = 1.1;
export const CONTACT_SHADOW_OFFSET_RATIO = 0.15;
export const CONTACT_SHADOW_OPACITY = 0.18;
export const CAST_SHADOW_HEIGHT_RATIO = 2.2;
export const CAST_SHADOW_OPACITY = 0.12;

/**
 * The sun's side, per hour (§5.1): the valley faces north, so the sun
 * rises at frame-right (dawn) and sets at frame-left (dusk). A shadow
 * falls away from the sun, so the sign here is the shadow's horizontal
 * direction — negative is left, positive is right. Magnitude reflects
 * how raking the light is: low sun (dawn/dusk) casts a strong, mostly
 * horizontal shadow; a high sun (morning/afternoon) casts a shorter,
 * more vertical one; night's moon is high and to the right, and casts
 * the faintest, most vertical shadow of all.
 */
const SUN_OFFSET_SIGN = Object.freeze({
  dawn: -1,
  morning: -0.4,
  afternoon: 0.4,
  dusk: 1,
  night: -0.3,
});

function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const c = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function rgbToHsl({ r, g, b }) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return { h: h / 6, s, l };
}

function hue2rgb(p, q, t) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb({ h, s, l }) {
  if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

/** Linear RGB blend of two hex colours; ratio 0 is pure base, 1 is pure target. */
export function mixHex(baseHex, targetHex, ratio) {
  const a = hexToRgb(baseHex), b = hexToRgb(targetHex);
  const t = clamp(ratio, 0, 1);
  return rgbToHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

/** Adjusts a hex colour's HSL lightness by deltaPoints (on a 0–100 scale). */
export function adjustLightness(hex, deltaPoints) {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.l = clamp(hsl.l + deltaPoints / 100, 0, 1);
  return rgbToHex(hslToRgb(hsl));
}

/** The lit face of a mass at this hour (§5.2: 25% toward light, +6L). */
export function litFace(baseHex, hour) {
  return adjustLightness(mixHex(baseHex, HOUR_LIGHT[hour], LIT_MIX_RATIO), LIT_LIFT);
}

/** The shade face of a mass at this hour (§5.2: 20% toward shadow, −8L). */
export function shadeFace(baseHex, hour) {
  return adjustLightness(mixHex(baseHex, HOUR_SHADOW[hour], SHADE_MIX_RATIO), -SHADE_DROP);
}

/** The hour's raw shadow colour, for contact/cast shadow fills. */
export function shadowColor(hour) {
  return HOUR_SHADOW[hour];
}

/**
 * A contact shadow ellipse for an object of the given width, centred at
 * its base (bx, by). Always present, at every hour (§5.2).
 */
export function contactShadow(bx, by, objWidth, hour) {
  const sign = SUN_OFFSET_SIGN[hour] ?? 0;
  const rx = (objWidth * CONTACT_SHADOW_WIDTH_RATIO) / 2;
  const ry = rx * 0.28;
  return {
    cx: bx + sign * objWidth * CONTACT_SHADOW_OFFSET_RATIO,
    cy: by,
    rx, ry,
    fill: shadowColor(hour),
    opacity: CONTACT_SHADOW_OPACITY,
  };
}

/**
 * Whether a cast shadow should be drawn at all: dawn, dusk, or autumn
 * only (§5.2) — a seasonal pleasure, never a default.
 */
export function castsShadow(hour, season) {
  return hour === 'dawn' || hour === 'dusk' || season === 'autumn';
}

/**
 * A cast shadow ellipse for an object of the given height, stretched
 * away from the sun (§5.2: 2.2x the object's height, 12% opacity).
 */
export function castShadow(bx, by, objHeight, objWidth, hour) {
  const sign = SUN_OFFSET_SIGN[hour] ?? -1;
  const length = objHeight * CAST_SHADOW_HEIGHT_RATIO;
  const rx = length / 2;
  const ry = Math.max(1, objWidth * 0.12);
  return {
    cx: bx + sign * rx * 0.7,
    cy: by,
    rx, ry,
    fill: shadowColor(hour),
    opacity: CAST_SHADOW_OPACITY,
  };
}
