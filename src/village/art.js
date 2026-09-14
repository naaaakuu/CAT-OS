/**
 * art.js — the village's illustrated sprite factory.
 *
 * Nothing in the village is an image asset. Every building, person, animal,
 * tree and prop is DRAWN with the canvas path API — rounded forms, one
 * light from the upper left, faces that recede into shade, a soft ground
 * shadow under everything, a slightly darker outline so it reads at a
 * glance on a phone — into a small canvas the first time it is asked for,
 * then cached by recipe.
 *
 * The recipes live in four files: art-nature.js (trees, bushes, flowers),
 * art-things.js (props, animals, glyphs, effects), art-buildings.js (the
 * oblique house builder and every named building at every level) and
 * art-figures.js (the villagers' rig and Wick). This file is the studio:
 * the cache, the scaled renders, the data URLs for the interface.
 *
 * Every recipe is a pure function of its parameters and a seed, so the
 * same tree has the same lean forever. Sprites are drawn at `SCALE`
 * canvas pixels per world unit and the renderer asks for the exact device
 * scale so a sprite is blitted 1:1 and never resampled.
 */

import { PAL, FLOWERS, SKINS, HAIRS, CLOTHES, SCALE, Brush, hexA, makeCanvas, KX, KY, P } from './brush.js';
import { NATURE } from './art-nature.js';
import { THINGS, drawGlyph } from './art-things.js';
import { BUILDINGS_ART } from './art-buildings.js';
import { FIGURES } from './art-figures.js';

export { PAL, FLOWERS, SKINS, HAIRS, CLOTHES, SCALE, hexA, drawGlyph, KX, KY, P };

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

const cache = new Map();
const urlCache = new Map();

const RECIPES = { ...NATURE, ...THINGS, ...BUILDINGS_ART, ...FIGURES };
export const RECIPE_NAMES = Object.freeze(Object.keys(RECIPES));

/** The bare spec of a recipe (no canvas): sizes, anchor and points. */
export function spec(name, params = {}) {
  const recipe = RECIPES[name];
  if (!recipe) throw new Error(`no art recipe "${name}"`);
  return recipe(params);
}

/**
 * @returns {{canvas, w, h, ax, ay, scale, points, at}} a cached sprite.
 * w/h/ax/ay are in world units; the canvas is w*scale by h*scale.
 * `at(scale, flip, tint)` returns the same recipe rendered at another
 * scale, mirrored and/or washed with the hour's tint — each its own
 * cached canvas, so the renderer never resamples or multiplies per frame.
 */
export function art(name, params = {}, scale = SCALE) {
  const key = `${name}|${JSON.stringify(params)}|${scale}`;
  let s = cache.get(key);
  if (s) return s;
  const recipe = RECIPES[name];
  if (!recipe) throw new Error(`no art recipe "${name}"`);
  const sp = recipe(params);
  const canvas = makeCanvas(sp.w * scale, sp.h * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  if (params.flip) { ctx.translate(sp.w, 0); ctx.scale(-1, 1); }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  sp.draw(new Brush(ctx), ctx);
  if (params.tint) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = params.tint;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  s = {
    canvas, w: sp.w, h: sp.h, ax: params.flip ? sp.w - sp.ax : sp.ax, ay: sp.ay, scale, name, params, points: sp.points ?? null,
    at(sc, flip = false, tint = null) {
      if (sc === scale && !!params.flip === !!flip && (params.tint ?? null) === tint) return s;
      const q = { ...params };
      if (flip) q.flip = true; else delete q.flip;
      if (tint) q.tint = tint; else delete q.tint;
      return art(name, q, sc);
    },
  };
  cache.set(key, s);
  return s;
}

/** Drop the big cached canvases rendered at scales the camera no longer uses. */
export function pruneArt(keep) {
  for (const [key, s] of cache) {
    if (keep.has(s.scale)) continue;
    if (s.canvas.width * s.canvas.height < 4096) continue;
    cache.delete(key);
  }
}

/** How many sprites are cached (for the performance probes). */
export function artCacheSize() { return cache.size; }

/** A sprite as a data URL, for the interface. */
export function artURL(name, params = {}, scale = 4) {
  const key = `${name}|${JSON.stringify(params)}|${scale}`;
  let u = urlCache.get(key);
  if (u) return u;
  u = art(name, params, scale).canvas.toDataURL('image/png');
  urlCache.set(key, u);
  return u;
}

/** An <img> of a recipe, sized to a CSS box. */
export function artIMG(name, params = {}, { size = 24, className = '', alt = '' } = {}) {
  let s;
  try { s = spec(name, params); } catch { return ''; }
  const scale = Math.max(2, Math.min(6, Math.ceil((size * 2) / Math.max(s.w, s.h))));
  const url = artURL(name, params, scale);
  const k = size / Math.max(s.w, s.h);
  return `<img class="ico ${className}" src="${url}" width="${Math.round(s.w * k)}" height="${Math.round(s.h * k)}" alt="${alt}"${alt ? '' : ' aria-hidden="true"'} draggable="false">`;
}
