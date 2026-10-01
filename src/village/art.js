/**
 * art.js — the village's sprites.
 *
 * Every picture in the village comes from one art pack ("Cute Nature",
 * assets/art/): the Hearth at five levels, the Reading House at four, Wick
 * with five animated clips, three trees and the garden props — authored in
 * 3D and baked to transparent PNGs in the village's own oblique projection.
 * living-art.js supplies cached inhabitants alongside these bakes. This file serves
 * them through the same synchronous contract the renderer always used:
 *
 *   art(name, params, scale) → { canvas, w, h, ax, ay, scale, points, at }
 *
 * w/h/ax/ay are world units; the canvas is w*scale by h*scale. Images are
 * decoded in the background from the moment this module loads. A sprite
 * asked for before its image has arrived comes back blank and is repainted
 * in place when it does, and `onArtReady` tells the renderers to redraw — so
 * no caller ever has to await anything.
 *
 * Names: 'building' {id, level} (the highest baked level at or below the
 * one asked for), 'wick' {pose, frame}, 'glow' {r, color, a} (the only thing
 * for lamps), 'person', 'portrait', the small wildlife, and every still in
 * the pack by its own name — tree_oak, tree_birch, tree_pine, bush, flowers,
 * grass, rock, pond, fence, bench, lamp, sign, books, planter, crate,
 * pathTile.
 */

import { STILLS, CLIPS } from './sprites.js';
import { livingSpec, LIVING_SPRITE_NAMES } from './living-art.js';

export const SCALE = 2;

/** The pack's palette (MATERIALS/palette.json), plus the few named uses. */
export const PAL = Object.freeze({
  plaster: '#E9DABD', cream: '#F7EBCF', wood: '#927052', woodLight: '#B6956E', woodDark: '#54483D',
  roof: '#AD664F', roofLight: '#C28265', roofDark: '#854D41', teal: '#557E80', tealLight: '#789699', tealDark: '#3D6166',
  fern: '#355B48', leaf: '#67845B', leafLight: '#9AAA72', sage: '#859C78', grass: '#829967', soil: '#745D49',
  path: '#CCBA98', stone: '#AAA994', water: '#659D9A', glass: '#486B70', gold: '#D8AD59', blush: '#C58B87',
  petal: '#E5C884', iron: '#3C4C47', paper: '#F2E4C6', ink: '#53777A', cat: '#3D3A47', catLight: '#5B5768',
  glow: '#FFD89A',
  // The goods, in the pack's colours.
  page: '#F2E4C6', book: '#AD664F', seed: '#745D49', bloom: '#C58B87', root: '#927052', thread: '#859C78', cloth: '#C28265', coin: '#D8AD59',
});

export function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

const BASE = new URL('../../assets/art/', import.meta.url);
const images = new Map();      // file → HTMLImageElement
const waiting = new Map();     // file → sprites to repaint when it lands
const readyListeners = new Set();
let pending = 0;

function image(file) {
  let img = images.get(file);
  if (img) return img;
  img = new Image();
  img.decoding = 'async';
  images.set(file, img);
  pending += 1;
  const done = () => {
    pending -= 1;
    for (const s of waiting.get(file) ?? []) paint(s);
    waiting.delete(file);
    for (const fn of readyListeners) fn(file);
  };
  img.onload = done;
  img.onerror = done;   // a missing file stays blank; nothing else depends on it
  img.src = new URL(file, BASE).href;
  return img;
}

/** Start every download now, so the first scene rarely waits. */
if (typeof Image !== 'undefined') {
  for (const s of Object.values(STILLS)) image(s.file);
  for (const c of Object.values(CLIPS)) for (const f of c.frames) image(f.file);
}

/** Called with the file name whenever an image finishes loading. */
export function onArtReady(fn) { readyListeners.add(fn); return () => readyListeners.delete(fn); }
/** Resolves once every image the pack ships has arrived (or failed). */
export function artLoaded() {
  if (!pending) return Promise.resolve();
  return new Promise((res) => { const off = onArtReady(() => { if (!pending) { off(); res(); } }); });
}

/* ------------------------------------------------------------------ */
/* Names → baked frames                                                */
/* ------------------------------------------------------------------ */

/** The yards have no house of their own; in the interface each is shown by
 *  the prop that says what it is. */
const YARD_FACE = Object.freeze({ garden: 'flowers', roots: 'planter', loom: 'crate', market: 'books' });

/** A root family's growth stage as [sprite, scale] — the Rootwood grove,
 *  the Language Garden and Growth all draw a plant from this one map. */
export const PLANT_STAGE = Object.freeze({ open_ground: ['grass', 1.4], seed: ['planter', 0.8], sprout: ['bush', 0.8], young: ['tree_birch', 0.6], in_leaf: ['tree_oak', 0.7], mature: ['tree_oak', 0.85], ancient: ['tree_oak', 1] });

/** Every name art() answers to. */
export const SPRITE_NAMES = Object.freeze(['building', 'wick', 'glow', ...LIVING_SPRITE_NAMES, ...Object.keys(STILLS).filter((k) => !/_L\d$/.test(k))]);
/** Every image file the pack ships, for the gates. */
export const SPRITE_FILES = Object.freeze([...Object.values(STILLS).map((s) => s.file), ...Object.values(CLIPS).flatMap((c) => c.frames.map((f) => f.file))]);

/** Wick's game poses, onto the pack's clips. */
const WICK_CLIP = Object.freeze({ sit: 'Idle', look: 'Idle', idle: 'Idle', walk: 'Walk', sleep: 'Sleep', jump: 'Celebrate', celebrate: 'Celebrate', read: 'Read' });

function frameOf(name, params) {
  if (name === 'building') {
    for (let l = Math.max(1, params.level ?? 1); l >= 1; l -= 1) { const s = STILLS[`${params.id}_L${l}`]; if (s) return s; }
    const s = STILLS[YARD_FACE[params.id] ?? params.id];
    if (s) return s;
    throw new Error(`no building art "${params.id}"`);
  }
  if (name === 'wick') {
    const clip = CLIPS[WICK_CLIP[params.pose] ?? 'Idle'];
    return clip.frames[Math.abs(params.frame ?? 0) % clip.frames.length];
  }
  const s = STILLS[name];
  if (!s) throw new Error(`no art "${name}"`);
  return s;
}

/** How many frames a Wick pose has, so callers can loop it. */
export function wickFrames(pose) { return CLIPS[WICK_CLIP[pose] ?? 'Idle'].frames.length; }

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

const cache = new Map();

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

function paint(s) {
  const ctx = s.canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
  if (s.draw) {
    if (s.flip) { ctx.translate(s.canvas.width, 0); ctx.scale(-1, 1); }
    s.draw(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (s.tint) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = s.tint; ctx.fillRect(0, 0, s.canvas.width, s.canvas.height); ctx.globalCompositeOperation = 'source-over'; }
    return;
  }
  const img = images.get(s.file);
  if (!img?.complete || !img.naturalWidth) { let l = waiting.get(s.file); if (!l) waiting.set(s.file, (l = new Set())); l.add(s); return; }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (s.flip) { ctx.translate(s.canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(img, 0, 0, s.canvas.width, s.canvas.height);
  if (s.tint) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = s.tint;
    ctx.fillRect(0, 0, s.canvas.width, s.canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
}

/** A lamp's light: a soft radial glow, the one thing not from the pack. */
function glowSpec({ r = 40, color = PAL.glow, a = 0.5 }) {
  return {
    w: r * 2, h: r * 2, ax: r, ay: r, points: null,
    draw(ctx, scale) {
      const R = r * scale;
      const g = ctx.createRadialGradient(R, R, 0, R, R, R);
      g.addColorStop(0, hexA(color, a)); g.addColorStop(0.45, hexA(color, a * 0.4)); g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, R * 2, R * 2);
    },
  };
}

/** The bare spec of a sprite (no canvas): sizes, anchor and points. */
export function spec(name, params = {}) {
  if (name === 'glow') return glowSpec(params);
  const living = livingSpec(name, params);
  if (living) return living;
  const f = frameOf(name, params);
  const flip = !!params.flip;
  const points = flip ? Object.fromEntries(Object.entries(f.points).map(([k, p]) => [k, Array.isArray(p) ? [f.w - p[0], p[1]] : p])) : f.points;
  return { w: f.w, h: f.h, ax: flip ? f.w - f.ax : f.ax, ay: f.ay, points, file: f.file };
}

/**
 * @returns {{canvas, w, h, ax, ay, scale, points, at}} a cached sprite.
 * `at(scale, flip, tint)` returns the same sprite at another scale,
 * mirrored and/or washed with the hour's tint — each its own cached canvas,
 * so the renderer never resamples or multiplies per frame.
 */
export function art(name, params = {}, scale = SCALE) {
  const key = `${name}|${JSON.stringify(params)}|${scale}`;
  let s = cache.get(key);
  if (s) return s;
  const sp = spec(name, params);
  s = {
    canvas: makeCanvas(sp.w * scale, sp.h * scale), w: sp.w, h: sp.h, ax: sp.ax, ay: sp.ay, scale, name, params,
    points: sp.points ?? null, file: sp.file, flip: !!params.flip, tint: params.tint ?? null,
    draw: sp.draw ? (ctx) => sp.draw(ctx, scale) : null,
    at(sc, flip = false, tint = null) {
      if (sc === scale && !!params.flip === !!flip && (params.tint ?? null) === tint) return s;
      const q = { ...params };
      if (flip) q.flip = true; else delete q.flip;
      if (tint) q.tint = tint; else delete q.tint;
      return art(name, q, sc);
    },
  };
  if (!s.draw) image(s.file);
  paint(s);
  cache.set(key, s);
  return s;
}

/** Drop the big cached canvases rendered at scales the camera no longer uses. */
export function pruneArt(keep) {
  for (const [key, s] of cache) {
    if (keep.has(s.scale)) continue;
    if (s.canvas.width * s.canvas.height < 4096) continue;
    for (const l of waiting.values()) l.delete(s);
    cache.delete(key);
  }
}

/** A sprite's image file, for the interface. */
export function artURL(name, params = {}) {
  return new URL(spec(name, params).file, BASE).href;
}

/** An <img> of a sprite, sized to a CSS box. */
export function artIMG(name, params = {}, { size = 24, className = '', alt = '' } = {}) {
  let s;
  try { s = spec(name, params); } catch { return ''; }
  const k = size / Math.max(s.w, s.h);
  const src = s.draw ? art(name, params, 3).canvas.toDataURL() : new URL(s.file, BASE).href;
  const flip = params.flip ? ' style="transform:scaleX(-1)"' : '';
  return `<img class="ico ${className}" src="${src}" width="${Math.round(s.w * k)}" height="${Math.round(s.h * k)}" alt="${alt}"${alt ? '' : ' aria-hidden="true"'} draggable="false"${flip}>`;
}



