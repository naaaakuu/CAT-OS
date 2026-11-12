/**
 * landscape.js — where the village's independent pieces stand (no game state).
 *
 * The world is the painted valley itself: 1086 × 1448 world pixels, one per
 * pixel of assets/art/village/terrain-base.webp. Everything else is a
 * separate sprite placed on it: eight house bodies, two bridges, oak trees,
 * the river's moving water and the houses' moving parts. A house is placed by
 * its visible footprint (`place`: centre x, ground y, drawn width); every
 * other point of a house is written in that sprite's own 896 px canvas
 * (`local`) and moved into the world by `worldPoint`, so a house can move or
 * resize without re-measuring its door, chimney or clock.
 */

export const WORLD = Object.freeze({ w: 1086, h: 1448 });
const DIR = './assets/art/village/';
export const TERRAIN = `${DIR}terrain-base.webp`;
export const ART_FILES = Object.freeze({
  terrain: TERRAIN, water: `${DIR}water.webp`, falls: `${DIR}waterfall.webp`, fx: `${DIR}ambient-fx.webp`, fire: `${DIR}fire.webp`,
  mechanisms: `${DIR}mechanisms.webp`, cloth: `${DIR}cloth-garden.webp`, trunk: `${DIR}tree-trunk.webp`, canopy: `${DIR}tree-canopy.webp`,
  bridgeStone: `${DIR}bridge-stone.webp`, bridgeWood: `${DIR}bridge-wood.webp`, foliage: `${DIR}foreground-foliage.webp`,
});
/** A still of the assembled valley (no pets, no interface), for room and card backdrops: tools/bake-village-still.mjs. */
export const STILL = Object.freeze({ w: 1086, h: 1448, src: `${DIR}village-still.webp` });

const SPRITE = 896;

/**
 * Each house: its sprite, the sprite's visible box [x, y, w, h] (local px),
 * where it stands, and its anchors in local px.
 *   ground   local y where the walls meet the ground: the house sorts with the
 *            friends at this line; what is painted below it (steps, flower
 *            pots, the camp) is ground that every friend walks over
 *   door     where a friend stands to go in
 *   sign     the bottom centre of its subject plate (kept off the facade)
 *   hit      the tap area [x, y, w, h]
 *   chimneys smoke from stage 1; lamps and windows glow after dark
 */
export const HOUSES = Object.freeze({
  chai: {
    file: `${DIR}chai-library.webp`, vis: [33, 140, 824, 627], place: { cx: 290, by: 1138, w: 360 },
    ground: 700, door: [372, 752], sign: [400, 136], hit: [40, 150, 810, 610],
    chimneys: [[208, 138]], lamps: [[360, 600, 44]],
    windows: [[130, 590, 34], [240, 600, 18], [560, 580, 38], [662, 580, 38], [765, 580, 38], [135, 380, 16], [530, 365, 15]],
  },
  matcha: {
    file: `${DIR}matcha-glasshouse.webp`, vis: [79, 110, 771, 660], place: { cx: 800, by: 1114, w: 255 },
    ground: 705, door: [255, 748], sign: [470, 118], hit: [80, 120, 770, 640],
    chimneys: [[745, 260]], lamps: [],
    windows: [[790, 510, 22], [300, 560, 46], [470, 520, 56], [610, 520, 46]],
  },
  ginger: {
    file: `${DIR}ginger-railway.webp`, vis: [67, 206, 775, 511], place: { cx: 305, by: 808, w: 280 },
    ground: 652, door: [420, 724], sign: [455, 236], hit: [70, 210, 770, 500],
    chimneys: [[550, 220]], lamps: [[335, 470, 22], [570, 460, 22], [366, 525, 12]],
    windows: [[182, 535, 26], [605, 500, 24], [455, 520, 40]],
  },
  mallow: {
    file: `${DIR}mallow-observatory.webp`, vis: [88, 74, 710, 732], place: { cx: 868, by: 668, w: 185 },
    ground: 735, door: [362, 806], sign: [420, 70], hit: [90, 80, 705, 720],
    chimneys: [], lamps: [[279, 555, 22], [484, 565, 22]],
    windows: [[204, 610, 28], [679, 570, 36], [384, 435, 40]],
  },
  mochi: {
    file: `${DIR}mochi-pantry.webp`, vis: [44, 139, 799, 611], place: { cx: 285, by: 610, w: 300 },
    ground: 690, door: [585, 742], sign: [380, 170], hit: [44, 145, 795, 600],
    chimneys: [[228, 142]], lamps: [[555, 455, 20]],
    windows: [[155, 540, 28], [400, 545, 58]],
  },
  biscuit: {
    file: `${DIR}biscuit-dining.webp`, vis: [24, 165, 845, 555], place: { cx: 600, by: 484, w: 290 },
    ground: 664, door: [392, 722], sign: [430, 190], hit: [24, 170, 840, 545],
    chimneys: [[644, 170]], lamps: [[324, 488, 16], [389, 488, 16], [449, 488, 16]],
    windows: [[104, 548, 22], [174, 548, 22], [634, 540, 20], [704, 540, 20], [589, 330, 16], [390, 560, 70]],
  },
  sesame: {
    file: `${DIR}sesame-clockworks.webp`, vis: [98, 44, 697, 807], place: { cx: 318, by: 333, w: 205 },
    ground: 792, door: [392, 842], sign: [312, 30], hit: [98, 50, 690, 795],
    chimneys: [[608, 358], [665, 322]], lamps: [[295, 652, 20], [420, 652, 20]],
    windows: [[237, 440, 20], [237, 548, 20], [352, 555, 30], [470, 700, 26], [170, 690, 22], [240, 705, 22], [630, 700, 50]],
  },
  toffee: {
    file: `${DIR}toffee-hearth.webp`, vis: [71, 63, 768, 758], place: { cx: 795, by: 300, w: 210 },
    ground: 618, door: [250, 760], sign: [380, 138], hit: [71, 70, 760, 740],
    chimneys: [[649, 70]], lamps: [[404, 385, 18]], windows: [],
  },
});

/** Scale and top-left of each house sprite in the world. */
export const PLACED = Object.freeze(Object.fromEntries(Object.entries(HOUSES).map(([id, h]) => {
  const [vx, vy, vw, vh] = h.vis, k = h.place.w / vw;
  return [id, Object.freeze({ k, x: h.place.cx - (vx + vw / 2) * k, y: h.place.by - (vy + vh) * k, size: SPRITE * k })];
})));

/** A house's local sprite point in world px. `{x, y}` or `[x, y]` in, `{x, y}` out (extra fields kept). */
export function worldPoint(id, p) {
  const b = PLACED[id];
  const q = Array.isArray(p) ? { x: p[0], y: p[1] } : p;
  return b ? { ...q, x: q.x * b.k + b.x, y: q.y * b.k + b.y } : { ...q };
}

/** World point back into a house's local sprite px. */
export function sourcePoint(id, p) {
  const b = PLACED[id];
  return b ? { ...p, x: (p.x - b.x) / b.k, y: (p.y - b.y) / b.k } : { ...p };
}

/** A local [x, y, w, h] (or {x,y,w,h}) as a world box. */
export function worldBox(id, r) {
  const b = PLACED[id], q = Array.isArray(r) ? { x: r[0], y: r[1], w: r[2], h: r[3] } : r;
  return { ...worldPoint(id, q), w: q.w * b.k, h: q.h * b.k };
}

/** The world y where a house sorts against the friends. */
export const groundY = (id) => worldPoint(id, [0, HOUSES[id].ground]).y;

/* ---- The rest of the valley ------------------------------------------ */

/** Bridges: sprite, visible box (local px) and footprint like a house. The stone bridge covers the spring the lower stream rises from. */
export const BRIDGES = Object.freeze([
  { id: 'stone', file: ART_FILES.bridgeStone, vis: [61, 224, 778, 471], place: { cx: 682, by: 690, w: 150 } },
  { id: 'wood', file: ART_FILES.bridgeWood, vis: [67, 216, 775, 483], place: { cx: 822, by: 1252, w: 186 } },
]);

/** Oaks: root point and canopy width; trunk and canopy share one canvas so the canopy sways over planted roots. */
export const TREE = Object.freeze({ vis: [38, 60, 824, 766], root: [449, 826], pivot: [448, 548] });
export const TREES = Object.freeze([
  { x: 728, y: 604, w: 168 },
  { x: 902, y: 1004, w: 150 },
  { x: 826, y: 458, w: 140 },
  { x: 640, y: 1218, w: 116 },
]);

/**
 * The village square, on the green between the railway, the river and the
 * glasshouse (owner, 2026-11-12: "a centre of the village ground where
 * everyone joins"). Painted in code (src/home/square.js): a cobbled round
 * in the valley's perspective with a fountain at its heart, the notice board
 * where tonight's Muddle is posted, a market stall, two benches and four
 * lamp posts. Each piece is placed by its foot (world px), which is also
 * where it sorts against the friends (z = foot y).
 */
export const SQUARE = Object.freeze({
  cx: 630, cy: 842, rx: 124, ry: 70,
  fountain: { x: 630, y: 860 },
  board: { x: 501, y: 858 },
  stall: { x: 432, y: 886 },
  benches: Object.freeze([{ x: 542, y: 835, flip: false }, { x: 719, y: 835, flip: true }]),
  lamps: Object.freeze([{ x: 590, y: 778 }, { x: 676, y: 780 }, { x: 566, y: 902 }, { x: 694, y: 900 }]),
  /** Lanes into the square, painted as dirt like the valley's own: from the main lane above and below. */
  paths: Object.freeze([[[519, 762], [538, 780], [560, 800]], [[497, 975], [520, 940], [548, 905], [566, 884]]]),
});

/** Waterfalls painted on the terrain, overlaid with the falling-water loop: [x centre, top y, width, height]. */
export const FALLS = Object.freeze([[1030, 210, 34, 40], [979, 322, 30, 34], [994, 450, 22, 20], [1021, 1004, 26, 30]]);

/** Atlas cells [x, y, w, h] in the runtime images (measured alpha bounds). */
export const CELLS = Object.freeze({
  mechanisms: { telescope: [57, 63, 297, 287], armillary: [446, 45, 259, 309], carriage: [786, 100, 334, 216], wheel: [55, 423, 294, 305], gear: [433, 425, 285, 286], minute: [927, 409, 65, 327], hour: [169, 846, 68, 217], bookSign: [426, 829, 298, 248], vane: [831, 846, 261, 240] },
  cloth: { vent: [24, 116, 342, 186], awning: [409, 110, 345, 184], herbs: [842, 24, 255, 337], jamSign: [60, 454, 268, 255], book: [404, 465, 350, 219], kettle: [848, 439, 256, 276] },
  fire: [[0, 0], [384, 0], [768, 0], [0, 384], [384, 384], [768, 384]],
  fireSize: 384, fireBase: [190, 332],
  fx: { smoke: [117, 52, 172, 303], steam: [504, 53, 117, 300], foam: [804, 167, 290, 118], leaf: [108, 473, 194, 204], ember: [536, 529, 79, 82], mist: [791, 454, 332, 221] },
  falls: [[78, 86, 223, 429], [463, 86, 222, 429], [79, 662, 223, 428], [463, 662, 222, 428]],
  foliage: { tl: [0, 0, 234, 291], tr: [629, 0, 139, 252], bl: [0, 802, 198, 222], br: [594, 793, 174, 231] },
});
