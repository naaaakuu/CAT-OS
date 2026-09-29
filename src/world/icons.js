/**
 * icons.js — the interface's icon language.
 *
 * The studio's hand: thin line drawings, one stroke weight, round ends,
 * drawn in whatever colour the text around them is (currentColor). The
 * painted things — buildings, the cat, the valley — are the art; the
 * interface only points at them, so its marks stay quiet and matte.
 * Nothing here is an emoji.
 */

import { artIMG } from '../village/art.js';
import { PLACE_BUILDING, buildingById } from '../village/defs.js';
import { thing } from './economy.js';

/** Older mark names, mapped to the glyphs below. */
const GLYPH = Object.freeze({
  tree: 'root', flower: 'bloom', koi: 'bloom', lantern: 'bloom', vine: 'root', workshop: 'thread', cottage: 'house',
  amber: 'bloom', ember: 'star', valley: 'house',
  pages: 'page', books: 'book', seeds: 'seed', blooms: 'bloom', roots: 'root', coins: 'coin',
  growth: 'sprout', records: 'scroll', settings: 'gear',
});

/* 24-unit line drawings. Circles are written as <circle>, everything else
   as one path per glyph, so the stroke weight is identical across the set. */
const C = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const P = (d, extra = '') => `<path d="${d}"${extra}/>`;
const DRAW = Object.freeze({
  book: P('M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5zM12 6.5v13'),
  page: P('M7 3.5h7l4 4V20.5H6.5V3.5zM14 3.5V7.5h4M9.5 12h5M9.5 15.5h5'),
  seed: P('M12 4c4 3.5 5 9 0 16-5-7-4-12.5 0-16zM12 8.5v7'),
  bloom: P('M9.3 5.3A2.8 2.8 0 1 1 14.7 5.3A2.8 2.8 0 1 1 16.4 10.4A2.8 2.8 0 1 1 12 13.6A2.8 2.8 0 1 1 7.6 10.4A2.8 2.8 0 1 1 9.3 5.3zM12 13.6V21M12 18.5c1.2-1.6 2.8-2.2 4.5-2.2') + C(12, 9, 1.5),
  root: P('M4 9.5h16M12 9.5c0-2.5-1.5-4-4-4.5 0 2.5 1.5 4 4 4.5zM12 9.5c0-2.5 1.5-4 4-4.5 0 2.5-1.5 4-4 4.5zM12 9.5V20M12 13c-2 .5-3.5 1.5-4.5 3M12 15.5c2 .5 3 1.5 3.5 3'),
  ink: P('M12 3.5c3.5 4.5 5.5 7.5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-3 2-6 5.5-10.5z'),
  thread: P('M6.5 4.5h11M6.5 19.5h11M8.5 4.5v15M15.5 4.5v15M8.5 8l7 2.5M8.5 12l7 2.5M8.5 15.5l7 2'),
  cloth: P('M4.5 6.5h15v5h-15zM4.5 11.5h15v5h-15zM16 16.5v3.5l-1.8-1.2-1.7 1.2v-3.5'),
  scales: P('M12 4v16M8.5 20h7M5 7h14M5 7l-2.5 6M5 7l2.5 6M2.5 13a2.5 2 0 0 0 5 0zM19 7l-2.5 6M19 7l2.5 6M16.5 13a2.5 2 0 0 0 5 0z'),
  coin: C(12, 12, 8.5) + C(12, 12, 5.2),
  star: P('M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z'),
  hammer: P('M4 18l9.6-9.6M13.2 2.4l6.4 6.4-2.8 2.8-6.4-6.4z'),
  check: P('M5 12.5l4.5 4.5L19 7.5'),
  clock: C(12, 12, 8.5) + P('M12 7.5V12l3 2'),
  house: P('M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5M10 20v-5h4v5'),
  sprout: P('M12 20v-8M12 12c0-3.5-2.5-5.5-6.5-5.5 0 3.5 2.5 5.5 6.5 5.5zM12 12c0-3 2-5 5.5-5 0 3-2 5-5.5 5zM8 20h8'),
  scroll: P('M18 16.5V5.5a2 2 0 0 0-2-2H5.5M8 20.5h10.5a2 2 0 0 0 2-2v-2H10.5v2a2 2 0 1 1-4 0V5.5a2 2 0 1 0-4 0V8h4M10 8h5M10 11.5h5'),
  gear: C(12, 12, 3) + C(12, 12, 6.6) + P('M12 3.6v1.6M12 18.8v1.6M3.6 12h1.6M18.8 12h1.6M6.1 6.1l1.1 1.1M16.8 16.8l1.1 1.1M6.1 17.9l1.1-1.1M16.8 7.2l1.1-1.1', ' stroke-width="2.6"'),
  board: P('M4 5h16v10H4zM7 15v5M17 15v5M7 8.5h6M7 11.5h9'),
  lock: P('M6.5 11h11v9h-11zM9 11V8a3 3 0 0 1 6 0v3M12 14.5v2'),
  road: P('M9 3.5L5 20.5M15 3.5l4 17M12 5v2.5M12 11v3M12 17.5v3'),
  cat: P('M5.6 10.4L5 4l4.6 3.2Q12 6.4 14.4 7.2L19 4l-.6 6.4Q20.4 14 18.4 17Q16 20 12 20Q8 20 5.6 17Q3.6 14 5.6 10.4zM9 12.5h1M14 12.5h1M11 15.4q1 1 2 0'),
  heart: P('M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z'),
  bell: P('M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10.2 20.5a2 2 0 0 0 3.6 0M12 3.5V5'),
  arrow: P('M5 12h14M13.5 6.5L19 12l-5.5 5.5'),
  zz: P('M4.5 10h5l-5 6h5M12.5 5h7l-7 8h7'),
  music: P('M9 18V6l10-2v12') + C(6.5, 18, 2.5) + C(16.5, 16, 2.5),
  sun: C(12, 12, 4) + P('M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M6 18l1.4-1.4M16.6 7.4L18 6'),
});

const glyphOf = (kind) => { const g = GLYPH[kind] ?? kind; return DRAW[g] ? g : 'star'; };
const svgBody = (g) => `<g fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${DRAW[g]}</g>`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/** One icon, as markup. */
export function icon(kind, { className = '', size = 18, alt = '' } = {}) {
  const g = glyphOf(kind);
  const a11y = alt ? `role="img" aria-label="${esc(alt)}"` : 'aria-hidden="true"';
  return `<svg class="ico ico--${g} ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" stroke="currentColor" focusable="false" ${a11y}>${svgBody(g)}</svg>`;
}

/** The icon for a place: its building's good, or the building itself. */
export function placeIcon(slug, opts = {}) {
  const b = buildingById(PLACE_BUILDING[slug] ?? slug);
  if (b?.raw) return icon(b.raw, opts);
  if (b?.id === 'hearth') return icon('house', opts);
  if (b?.id === 'road') return icon('road', opts);
  if (b?.id === 'market') return icon('board', opts);
  return icon('star', opts);
}

/** The icon for a good or coins. */
export function craftIcon(key, opts = {}) { return icon(thing(key)?.glyph ?? 'star', opts); }
export const goodIcon = craftIcon;

/** A raw data URL, for CSS backgrounds and canvas draws. A data URL has no
    currentColor to inherit, so the ink is baked in. */
export function iconURL(kind, scale = 4) {
  const g = glyphOf(kind), px = 24 * scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" stroke="#30473B">${svgBody(g)}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** The picture of a building at a level, sized to a CSS box. */
export function buildingArt(id, level = 1, box = 64) {
  const b = buildingById(id);
  if (!b?.art) return icon('road', { size: Math.round(box * 0.6) });
  return artIMG('building', { id: b.art, level: Math.max(1, level) }, { size: box, className: 'ico--art' });
}

/** Kept for older call sites: a work's picture is its building's picture. */
export function workArt(work, box = 64) { return buildingArt(work?.building ?? work?.id ?? 'hearth', work?.level ?? 1, box); }
