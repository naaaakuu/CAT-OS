/**
 * brush.js — the village's palette and the little brush every recipe
 * draws with. No cache, no DOM beyond a canvas context: this is the hand,
 * art.js is the studio that keeps what the hand has drawn.
 *
 * The world is lit from the upper left. Faces that look at the light are
 * warmer and lighter; faces that turn away are cooler and darker; every
 * grounded thing casts a soft shadow to the lower right. Buildings are
 * drawn in a gentle oblique projection (see `P`): a front wall, a side wall
 * receding up and to the right, a roof with two slopes — the perception of
 * depth without a 3D engine.
 */

import { rng, mix } from '../world/engine/palette.js';

export { rng, mix };

export const SCALE = 2;

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

export const PAL = Object.freeze({
  grass: '#8DC85F', grassLight: '#A8DB78', grassDark: '#6FAE49', grassDeep: '#5A9A3C',
  path: '#E7CB93', pathEdge: '#CDA86E', earth: '#B98B58', soil: '#8A6240', soilLight: '#A97C52',
  water: '#5CB6E7', waterDeep: '#3A91C8', waterLight: '#A3DCF4', sand: '#EBD9A6',
  cream: '#F7E9CB', creamShade: '#DCC49C', white: '#FBF5E8', plaster: '#F2E2C4', plasterWarm: '#F6E3BF',
  wood: '#B57B48', woodDark: '#7F5331', woodLight: '#D6A067', timber: '#6B4630', plank: '#C99A62',
  roofRed: '#DB6543', roofBlue: '#5C8FBB', roofGreen: '#5DA76A', roofPlum: '#8E6DB8', roofSlate: '#7C8797', roofGold: '#E5B84A', roofTeal: '#4EA7A0', roofThatch: '#D9B46A', roofBrown: '#A8663F',
  stone: '#B9B6AE', stoneDark: '#8E8B84', stoneLight: '#D8D5CD', cobble: '#C9C2B4',
  leaf: '#5EB65A', leafLight: '#8AD57A', leafDark: '#3D8D45', pine: '#3F8E6B', pineLight: '#67B48A', pineDark: '#2E6E52', autumn: '#E0913F',
  glass: '#BFE4F5', glassNight: '#FFD98A', glow: '#FFD27A',
  iron: '#4B4A55', copper: '#C9803E', copperLight: '#E9A96A',
  outline: '#2B2438',
  coin: '#F3C447', coinDark: '#C7901E', coinLight: '#FFE79A',
  page: '#FBF4E3', pageLine: '#B9AE96', book: '#B85C4A', bookBlue: '#4F7FB5', bookGreen: '#5B9A6A',
  seed: '#B98B58', seedLight: '#E2C48F', bloom: '#F26D8D', bloomLight: '#FFA8BC',
  root: '#B2713F', rootLight: '#D9A16D', ink: '#3A3F86', inkLight: '#6A6FB8',
  thread: '#8E6DB8', threadLight: '#C4A6E8', cloth: '#D9603F', clothLight: '#F0907A',
  wick: '#3D3A47', wickLight: '#5B5768', wickEye: '#F2C14E', wickPink: '#C58B90',
});

export const FLOWERS = Object.freeze(['#F26D7D', '#F6C445', '#FFFFFF', '#A785DD', '#FF9A5C', '#7FD3F0', '#F2A6C6']);
export const SKINS = Object.freeze(['#F5CBA7', '#E8B48F', '#D19A73', '#B57A55', '#8D5B3B', '#6E4530']);
export const HAIRS = Object.freeze(['#2B2222', '#4A2E1F', '#7A4A2A', '#B86F3A', '#D9B26B', '#B9B0A6', '#1E1B1B', '#C2452F']);
export const CLOTHES = Object.freeze(['#D9603F', '#5FA36B', '#5C8FBB', '#8E6DB8', '#F6C445', '#4EA7A0', '#E08B6A', '#7C8797']);

/* ------------------------------------------------------------------ */
/* Colour helpers                                                      */
/* ------------------------------------------------------------------ */

export function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export const dark = (c, t = 0.3) => mix(c, PAL.outline, t);
export const light = (c, t = 0.22) => mix(c, '#FFFFFF', t);
/** A face turned from the light: cooler and darker. */
export const shade = (c, t = 0.22) => mix(mix(c, '#2A3A6A', t * 0.5), '#000000', t * 0.55);
/** A face toward the light: warmer and lighter. */
export const lit = (c, t = 0.18) => mix(c, '#FFF3D6', t);

/* ------------------------------------------------------------------ */
/* Oblique projection                                                  */
/* ------------------------------------------------------------------ */

/** Depth recedes up and to the right: one unit back is KX right and KY up. */
export const KX = 0.5;
export const KY = 0.42;
/** Project a 3-D point (x right, y down on the front plane, z back) to the sprite plane. */
export const P = (x, y, z = 0) => [x + z * KX, y - z * KY];

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

/* ------------------------------------------------------------------ */
/* The brush                                                           */
/* ------------------------------------------------------------------ */

/** A tiny brush over a scaled context: paths in world units. */
export class Brush {
  constructor(ctx) { this.c = ctx; }
  rr(x, y, w, h, r = 3) {
    const c = this.c; r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); return this;
  }
  /** A rounded rect with a bigger radius at the top: an arched door. */
  arch(x, y, w, h) {
    const c = this.c, r = w / 2;
    c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath(); return this;
  }
  ell(cx, cy, rx, ry) { this.c.beginPath(); this.c.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); this.c.closePath(); return this; }
  circ(cx, cy, r) { return this.ell(cx, cy, r, r); }
  poly(pts) { const c = this.c; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); return this; }
  line(pts) { const c = this.c; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); return this; }
  /** A smooth curve through points (quadratic midpoints). */
  curve(pts) {
    const c = this.c; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i += 1) { const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2; c.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); }
    const l = pts[pts.length - 1]; c.lineTo(l[0], l[1]); return this;
  }
  fill(color) { this.c.fillStyle = color; this.c.fill(); return this; }
  stroke(color, w = 1) { const c = this.c; c.strokeStyle = color; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); return this; }
  vgrad(y0, y1, stops) { const g = this.c.createLinearGradient(0, y0, 0, y1); for (const [t, col] of stops) g.addColorStop(t, col); return g; }
  hgrad(x0, x1, stops) { const g = this.c.createLinearGradient(x0, 0, x1, 0); for (const [t, col] of stops) g.addColorStop(t, col); return g; }
  /** Fill the current path lit from above, then outline it. */
  shade(color, y0, y1, { lt = 0.2, dk = 0.18, outline = true, ow = 0.9, oc } = {}) {
    this.c.fillStyle = this.vgrad(y0, y1, [[0, light(color, lt)], [0.5, color], [1, mix(color, '#000000', dk)]]);
    this.c.fill();
    if (outline) this.stroke(oc ?? dark(color, 0.32), ow);
    return this;
  }
  /** A flat fill with an outline. */
  solid(color, { outline = true, ow = 0.9, oc } = {}) { this.fill(color); if (outline) this.stroke(oc ?? dark(color, 0.32), ow); return this; }
  /** Soft ground shadow, cast a little to the lower right. */
  shadow(cx, cy, rx, ry, a = 0.2) {
    const c = this.c; c.save(); c.translate(cx + rx * 0.12, cy + ry * 0.1); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(30,40,20,${a})`); g.addColorStop(0.62, `rgba(30,40,20,${a * 0.55})`); g.addColorStop(1, 'rgba(30,40,20,0)');
    c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore(); return this;
  }
  /** A specular highlight: a soft white ellipse. */
  gleam(cx, cy, rx, ry, a = 0.35) {
    const c = this.c; c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore(); return this;
  }
  glow(cx, cy, r, color = PAL.glow, a = 0.5) {
    const c = this.c; const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, hexA(color, a)); g.addColorStop(1, hexA(color, 0));
    c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2); return this;
  }
  /** Run another recipe's spec into this context at (x, y) with its anchor there. */
  stamp(spec, x, y, scale = 1) {
    const c = this.c; c.save(); c.translate(x - spec.ax * scale, y - spec.ay * scale); if (scale !== 1) c.scale(scale, scale);
    spec.draw(new Brush(c), c); c.restore(); return this;
  }
}

export function starPts(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r : R; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return pts;
}
