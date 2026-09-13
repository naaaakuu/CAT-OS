/**
 * icons.js — the interface's icon language.
 *
 * Every icon in CAT OS is drawn by the same hand as the village (see
 * village/art.js). Nothing here is an emoji and nothing is a stroke glyph
 * from an icon set: a system icon inside a hand-painted world is the one
 * thing that makes the whole product look like a web page with a game
 * stuck on top.
 */

import { artIMG, artURL } from '../village/art.js';
import { PLACE_BUILDING, buildingById } from '../village/defs.js';
import { thing } from './economy.js';

/** Older mark names, mapped to the village's glyphs. */
const GLYPH = Object.freeze({
  tree: 'root', flower: 'bloom', koi: 'bloom', lantern: 'bloom', book: 'page', vine: 'root', workshop: 'thread', cottage: 'house',
  road: 'road', sprout: 'sprout', star: 'star', gear: 'gear', amber: 'bloom', ink: 'page', thread: 'thread', ember: 'star',
  valley: 'house', lock: 'lock', check: 'check', hammer: 'hammer', coin: 'coin', page: 'page', bloom: 'bloom', root: 'root',
  scroll: 'scroll', board: 'board', heart: 'heart', bell: 'bell', clock: 'clock', cat: 'cat', arrow: 'arrow',
});

/** One icon, as markup. */
export function icon(kind, { className = '', size = 18, alt = '' } = {}) {
  try { return artIMG('icon', { glyph: GLYPH[kind] ?? kind, size: 20 }, { size, className, alt }); } catch { return ''; }
}

/** The icon for a place: its building's good, or the building itself. */
export function placeIcon(slug, opts = {}) {
  const b = buildingById(PLACE_BUILDING[slug] ?? slug);
  if (b?.good) return icon(b.good, opts);
  if (b?.id === 'hearth') return icon('house', opts);
  if (b?.id === 'road') return icon('road', opts);
  if (b?.id === 'market') return icon('board', opts);
  return icon('star', opts);
}

/** The icon for a good or coins. */
export function craftIcon(key, opts = {}) { return icon(thing(key)?.glyph ?? 'star', opts); }
export const goodIcon = craftIcon;

/** A raw data URL, for CSS backgrounds and canvas draws. */
export function iconURL(kind, scale = 4) {
  try { return artURL('icon', { glyph: GLYPH[kind] ?? kind, size: 20 }, scale); } catch { return ''; }
}

/** The picture of a building at a level, sized to a CSS box. */
export function buildingArt(id, level = 1, box = 64) {
  const b = buildingById(id);
  if (!b?.art) return icon('road', { size: Math.round(box * 0.6) });
  return artIMG('building', { id: b.art, level: Math.max(1, level) }, { size: box, className: 'ico--art' });
}

/** Kept for older call sites: a work's picture is its building's picture. */
export function workArt(work, box = 64) { return buildingArt(work?.building ?? work?.id ?? 'hearth', work?.level ?? 1, box); }
