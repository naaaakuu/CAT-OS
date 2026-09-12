/**
 * icons.js — the interface's icon language.
 *
 * Every icon in CAT OS is a pixel mark drawn by the same hand as the
 * valley (see `mark` in engine/sprites.js). Nothing here is an emoji and
 * nothing is a stroke glyph from an icon set: a system icon inside a
 * hand-painted world is the one thing that makes the whole product look
 * like a web page with a game stuck on top.
 *
 * `icon(kind)` gives an <img> you can put anywhere. It is a data URL, so
 * it needs no network, no build step and no sprite sheet.
 */

import { spriteURL, sprite as spriteMeta } from './engine/sprites.js';

/** Which mark stands for which place. */
export const PLACE_MARK = Object.freeze({
  rootwood: 'tree',
  meadow: 'flower',
  pond: 'koi',
  thicket: 'lantern',
  'reading-room': 'tower',
  terraces: 'vine',
  quarter: 'workshop',
  loom: 'workshop',
  table: 'workshop',
  bench: 'workshop',
  hearth: 'cottage',
  wilds: 'road',
});

/** Which mark stands for which craft. */
export const CRAFT_MARK = Object.freeze({ amber: 'amber', ink: 'ink', thread: 'thread', ember: 'ember' });

/**
 * One icon, as markup.
 * @param {string} kind  a mark kind (see `mark` in sprites.js)
 * @param {object} [opts] class name and rendered size in px
 */
export function icon(kind, { className = '', size = 18, alt = '' } = {}) {
  let src = '';
  try { src = spriteURL('mark', { kind }, 4); } catch { return ''; }
  return `<img class="ico ${className}" src="${src}" width="${size}" height="${size}" alt="${alt}"${alt ? '' : ' aria-hidden="true"'} draggable="false">`;
}

/** The icon for a place. */
export function placeIcon(slug, opts) { return icon(PLACE_MARK[slug] ?? 'valley', opts); }

/** The icon for a craft. */
export function craftIcon(key, opts) { return icon(CRAFT_MARK[key] ?? 'amber', opts); }

/** A raw data URL, for CSS backgrounds and canvas draws. */
export function iconURL(kind, scale = 4) {
  try { return spriteURL('mark', { kind }, scale); } catch { return ''; }
}

/**
 * A sprite scaled to sit inside a box of `box` CSS pixels, nearest
 * neighbour, whole numbers only — a building drawn at 2.37× is mush, and
 * mush is what makes pixel art look like a stock illustration.
 */
export function fitSprite(name, params = {}, box = 64) {
  let s;
  try { s = spriteMeta(name, params); } catch { return ''; }
  const b = typeof box === 'number' ? { w: box * 2.6, h: box } : box;
  const scale = Math.max(1, Math.min(Math.floor(b.w / s.w), Math.floor(b.h / s.h)));
  let src = '';
  try { src = spriteURL(name, params, scale); } catch { return ''; }
  return `<img class="ico ico--art" src="${src}" width="${s.w * scale}" height="${s.h * scale}" alt="" aria-hidden="true" draggable="false">`;
}

/** The picture of a work, for the Workshop. */
export function workArt(work, box = 64) {
  const a = work?.art;
  if (!a) return icon('star', { size: 28 });
  return fitSprite(a[0], a[1] ?? {}, box);
}
