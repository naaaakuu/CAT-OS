/**
 * motion.js — the painting itself, moving.
 *
 * Every moving thing here is cut out of home-world-v1.png. A patch is a small
 * element at painting coordinates showing that same piece of the painting,
 * its edge feathered into transparency, so at rest it is pixel-identical to
 * what lies beneath it. Animating only transform, opacity and filter on it
 * turns the painted gear, stirs the painted banner and runs the painted
 * water — no new art, and nothing can drift out of register with the picture
 * underneath.
 *
 * The cut-outs live pre-feathered in assets/art/home-motion-v1.png, baked by
 * tools/bake-motion.mjs from PATCHES below (src/home/motion-atlas.js says
 * where each one went). A CSS mask would do the same job, but every masked
 * element is a render pass of its own on every frame: thirty-six of them
 * halved the frame rate on an Intel HD 520. Change a patch, rebake.
 *
 *   spin   a wheel or gear turning about its hub. `sx`/`sy` undo the
 *          painting's foreshortening, so a tilted wheel turns in its own
 *          plane instead of wobbling.
 *   flow   water and smoke: two copies slide along (dx, dy) and cross-fade
 *          (the top copy is fully opaque exactly when the bottom one jumps
 *          back), so the texture runs forever without a seam or a jump.
 *   sway   trees (about the trunk, below the canopy) and bunting.
 *   flag   banners: a slower, double-humped wave from the rod.
 *   flap   awnings lifting in the wind.
 *   bob    lily pads riding the pond.
 *   flame  the campfire's flicker, about its base.
 *   pan    the telescope, now and then.
 *   turn   the armillary sphere.
 *   wobble the patio umbrella.
 *
 * Coordinates were read off zoomed, gridded crops of the painting; the
 * centres of the gear and wheels to a tenth of a pixel, because a hub one
 * pixel out wobbles by two.
 *
 * The lamps' breathing halos are .cw-glow (village.js + home.css), above the
 * hour's tint; everything here sits just above img.cw-art, under the tint, so
 * dusk and night colour it like the rest of the picture.
 */

import { ATLAS } from './motion-atlas.js';
import { MAP } from '../pets/paths.js';

/** k, rect (an ellipse fills it) or poly, then what the kind needs. Painting pixels throughout. */
export const PATCHES = [
  /* --- the workshop: the gear on the gable, the two wheels under the lean-to --- */
  /* `house` + `from`: still until that house reaches that stage (src/home/houses.js): the stuck gears turn again. */
  { k: 'spin', x: 801, y: 91, w: 64, h: 60, cx: 832.8, cy: 120.8, sx: 1, sy: 0.93, t: 46, house: 'ginger', from: 1 },
  { k: 'spin', x: 636, y: 166, w: 36, h: 46, cx: 654.4, cy: 188.8, sx: 0.77, sy: 1, t: 17, house: 'ginger', from: 3 },
  { k: 'spin', x: 663, y: 189, w: 30, h: 44, cx: 678.5, cy: 211, sx: 0.69, sy: 1, t: 13, house: 'ginger', from: 3 },

  /* --- the observatory --- */
  { k: 'pan', poly: [[1310, 86], [1386, 35], [1413, 77], [1332, 122]], blur: 2, cx: 1342, cy: 106, t: 26, house: 'mallow', from: 1 },
  { k: 'turn', x: 1432, y: 178, w: 60, h: 58, cx: 1462, cy: 207, t: 7.5, house: 'mallow', from: 3 },

  /* --- fire and smoke --- */
  { k: 'flame', x: 805, y: 834, w: 36, h: 62, cx: 823, cy: 893, t: 1.7 },
  { k: 'flow', x: 212, y: 520, w: 46, h: 58, dx: 2, dy: -6, t: 2.8, house: 'cottage', from: 1 },

  /* --- water: the falls at the left edge, the pond's outflow, the stream under the clock-tower bridge, the pond --- */
  { k: 'flow', poly: [[0, 506], [28, 504], [46, 528], [44, 551], [18, 549], [0, 541]], blur: 2.5, dx: 2, dy: 5, t: 1.4 },
  { k: 'flow', poly: [[55, 610], [95, 604], [119, 621], [111, 641], [101, 668], [99, 701], [70, 701], [51, 672], [49, 640]], blur: 3, dx: -1, dy: 8, t: 1.05 },
  { k: 'flow', x: 28, y: 738, w: 46, h: 32, dx: 0, dy: 4, t: 1.2 },
  { k: 'flow', poly: [[378, 958], [410, 955], [440, 975], [457, 1000], [453, 1024], [420, 1024], [395, 996]], blur: 3, dx: 2, dy: 6, t: 1.2 },
  { k: 'flow', poly: [[1342, 880], [1372, 872], [1405, 885], [1402, 930], [1380, 955], [1330, 960], [1318, 940], [1345, 915]], blur: 3, dx: -2, dy: 5, t: 1.3 },
  { k: 'flow', x: 185, y: 850, w: 240, h: 54, dx: 4, dy: 0, t: 6 },

  /* --- lily pads --- */
  { k: 'bob', x: 33, y: 799, w: 40, h: 18, a: 0.8, r: 1.6, t: 4.6, dl: -0.4 },
  { k: 'bob', x: 57, y: 824, w: 42, h: 18, a: 0.9, r: -1.4, t: 5.3, dl: -2.1 },
  { k: 'bob', x: 82, y: 838, w: 56, h: 26, a: 0.7, r: 1.2, t: 6.1, dl: -3.3 },
  { k: 'bob', x: 124, y: 857, w: 42, h: 18, a: 0.9, r: -1.8, t: 4.9, dl: -1.2 },
  { k: 'bob', x: 151, y: 834, w: 28, h: 13, a: 0.6, r: 2, t: 4.2, dl: -2.8 },
  { k: 'bob', x: 423, y: 884, w: 34, h: 14, a: 0.7, r: -1.5, t: 5.6, dl: -0.9 },

  /* --- cloth --- */
  { k: 'flag', poly: [[1198, 664], [1235, 664], [1235, 729], [1217, 754], [1198, 729]], blur: 2, cx: 1216.5, cy: 667, t: 4.6, dl: 0, house: 'sesame', from: 1 },
  { k: 'flag', poly: [[1300, 669], [1342, 669], [1342, 736], [1321, 757], [1300, 736]], blur: 2, cx: 1321, cy: 672, t: 5.2, dl: -1.7, house: 'sesame', from: 1 },
  { k: 'sway', poly: [[394, 363], [444, 365], [444, 395], [394, 393]], blur: 2, cx: 419, cy: 366, a: 2.4, t: 3.2, dl: -0.6 },
  { k: 'flap', poly: [[892, 128], [905, 117], [970, 135], [980, 149], [963, 165], [930, 171], [903, 165], [889, 148]], blur: 2, cx: 900, cy: 120, t: 3.4, dl: 0 },
  { k: 'flap', poly: [[1073, 367], [1165, 355], [1191, 380], [1128, 399], [1074, 386]], blur: 2, cx: 1120, cy: 362, t: 3.9, dl: -1.3 },
  { k: 'wobble', x: 430, y: 660, w: 58, h: 30, cx: 458, cy: 708, a: 1.4, t: 5.4, house: 'cottage', from: 1 },

  /* --- trees: canopy ellipses, swaying about the trunk below them --- */
  ...[
    [764, 290, 88, 56, 362, 7.5], // the plaza tree
    [75, 48, 75, 52, 150, 8], // top left
    [520, 40, 72, 42, 120, 7], // beside the library steps
    [1005, 62, 72, 56, 160, 8.5], // past the workshop
    [1480, 60, 56, 60, 170, 7.8], // behind the observatory
    [1500, 545, 42, 72, 700, 6.5], // the birch
    [985, 700, 55, 52, 800, 7.2], // beside the notice board
    [1100, 630, 58, 42, 700, 8], // west of the clock tower
    [190, 985, 115, 48, 1080, 9], // the foreground, left
    [905, 980, 105, 50, 1080, 8.4], // the foreground, middle
    [1120, 990, 90, 40, 1080, 7.6], // the foreground, right
  ].map(([cx, cy, rx, ry, py, t]) => ({ k: 'sway', x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2, cx, cy: py, a: 1.9, t, tree: true })),

  // Smaller plants answer the same breeze, on quicker, independent beats.
  ...[
    [190, 306, 35, 25, 355, 4.8], [455, 552, 38, 28, 594, 5.1],
    [597, 564, 34, 24, 595, 4.3], [975, 566, 33, 26, 599, 4.9],
    [555, 657, 31, 39, 708, 5.6], [472, 735, 32, 29, 772, 4.5],
    [1208, 538, 35, 29, 580, 5.2], [472, 923, 37, 23, 955, 4.7],
  ].map(([cx, cy, rx, ry, py, t]) => ({ k: 'sway', x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2, cx, cy: py, a: 2.6, t, tree: true })),
];

/* A gust crosses the map from the west: each tree's phase lags by its x. */
const lag = (p) => (p.tree ? -(p.t * 10 - p.cx / 300) : (p.dl ?? 0));

/** A patch's box in the painting: its rect, or its polygon plus room for the feather. */
export function rectOf(p) {
  if (!p.poly) return { x: p.x, y: p.y, w: p.w, h: p.h };
  const pad = Math.ceil((p.blur ?? 2) * 3);
  const xs = p.poly.map((q) => q[0]), ys = p.poly.map((q) => q[1]);
  const x = Math.floor(Math.min(...xs)) - pad, y = Math.floor(Math.min(...ys)) - pad;
  return { x, y, w: Math.ceil(Math.max(...xs)) + pad - x, h: Math.ceil(Math.max(...ys)) + pad - y };
}

/** How a patch's edge fades: an ellipse solid to `solid` of its radius, or a blurred polygon. */
export function maskOf(p, r = rectOf(p)) {
  // Spinning things keep their rim inside the solid part; the rest feather wider.
  if (!p.poly) return { ellipse: true, solid: p.k === 'spin' || p.k === 'turn' ? 0.84 : 0.58 };
  return { blur: p.blur ?? 2, points: p.poly.map(([px, py]) => [px - r.x, py - r.y]) };
}

/**
 * @param {HTMLElement} map  the .cw-map layer (painting pixels, 1536×1024)
 * @param {{atmo: {hour, weather, season}, reduced: boolean, stages?: object, atlas?: string}} o
 *   stages  each house's stage (economy.js houseStages): a patch with `house`/`from` stays still below it
 *   atlas   a URL for the atlas graded to match the grown painting (houses.js gradeAtlas), else the baked one
 * @returns {{ setAtmo(atmo): void, destroy(): void }}
 */
export function mountMotion(map, { atmo, reduced, stages = null, atlas = null } = {}) {
  const art = map?.querySelector('.cw-art');
  // At rest every patch IS the painting, so with less motion there is nothing
  // to add; and nothing at all from an atlas cut from another painting.
  if (reduced || !art || !ATLAS.at.length || ATLAS.painting !== MAP.src) return { setAtmo() {}, setView() {}, destroy() {} };
  const src = `url("${atlas ?? new URL(ATLAS.src, document.baseURI).href}")`;
  const box = document.createElement('div');
  box.className = 'cw-motion';
  box.setAttribute('aria-hidden', 'true');
  PATCHES.forEach((p, i) => {
    const r = rectOf(p), a = ATLAS.at[i];
    // A machine whose house has not woken up yet keeps still: the painting under it is the same picture.
    if (p.house && stages && (stages[p.house] ?? 0) < p.from) return;
    // A stale bake would show the wrong piece of the painting; leave it still instead.
    if (a && a[0] === r.x && a[1] === r.y && a[2] === r.w && a[3] === r.h) box.appendChild(patch(p, r, a[4], a[5], src));
  });
  ([...map.querySelectorAll('.cw-base')].at(-1) ?? art).after(box);
  const setAtmo = (at = {}) => { box.dataset.weather = at.weather ?? ''; };
  setAtmo(atmo);
  /* A patch off screen is paused: a running CSS animation is restyled every frame the page draws, seen or not. */
  const items = [...box.children].map((el) => ({ el, x0: parseFloat(el.style.left), y0: parseFloat(el.style.top), x1: parseFloat(el.style.left) + parseFloat(el.style.width), y1: parseFloat(el.style.top) + parseFloat(el.style.height), off: false }));
  const setView = (v) => {
    for (const it of items) {
      const off = it.x1 < v.x - 40 || it.x0 > v.x + v.w + 40 || it.y1 < v.y - 40 || it.y0 > v.y + v.h + 40;
      if (off !== it.off) { it.off = off; it.el.toggleAttribute('data-off', off); }
    }
  };
  return { setAtmo, setView, destroy: () => box.remove() };
}

function patch(p, { x, y, w, h }, ax, ay, src) {
  const el = document.createElement('i');
  el.className = `mo mo--${p.k}`;
  el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  el.style.setProperty('--t', `${p.t}s`);
  el.style.setProperty('--dl', `${lag(p).toFixed(2)}s`);
  if (p.a !== undefined) el.style.setProperty('--a', p.a);
  if (p.r !== undefined) el.style.setProperty('--r', p.r);
  if (p.k === 'spin') {
    el.style.setProperty('--sx', p.sx); el.style.setProperty('--sy', p.sy);
    el.style.setProperty('--ix', (1 / p.sx).toFixed(5)); el.style.setProperty('--iy', (1 / p.sy).toFixed(5));
  }
  const layer = () => {
    const b = document.createElement('b');
    b.style.cssText = `background-image:${src};background-size:${ATLAS.w}px ${ATLAS.h}px;background-position:${-ax}px ${-ay}px`;
    if (p.cx !== undefined) b.style.transformOrigin = `${(p.cx - x).toFixed(1)}px ${(p.cy - y).toFixed(1)}px`;
    return b;
  };
  if (p.k === 'flow') {
    el.style.setProperty('--dx', `${p.dx}px`); el.style.setProperty('--dy', `${p.dy}px`);
    el.append(layer(), layer());
  } else {
    el.append(layer());
  }
  return el;
}
