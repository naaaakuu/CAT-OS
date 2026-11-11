/**
 * paths.js — where things are in the painted village.
 *
 * Navigation uses the 2048 × 1280 world. SOURCE_* coordinates refer to the
 * immutable 1536 × 1024 landmark atlas. The screen scales the world, so these
 * never change with the viewport. Pets walk ONLY along EDGES between NODES,
 * which follow the layered sand, stone and bridge surfaces and are checked by
 * tools/check-village-data.mjs: a node that drifts onto a roof, a tree or the
 * pond fails the gate. They also STAND only on a node (never beside one: a few
 * pixels off the traced path is already a fence, a step or a flowerbed), so
 * everything that needs two friends side by side names two neighbouring nodes
 * (CHATS, HOMES[].side).
 */

import { TERRAIN, worldPoint, worldBox } from '../home/landscape.js';
export const MAP = Object.freeze({ w: 2048, h: 1280, src: TERRAIN });

/* ---- The walkable graph -------------------------------------------- */

export const NODES = Object.freeze({
  "pc": {
    "x": 850,
    "y": 650
  },
  "pn": {
    "x": 840,
    "y": 550
  },
  "pne": {
    "x": 950,
    "y": 570
  },
  "pe": {
    "x": 1040,
    "y": 650
  },
  "pse": {
    "x": 965,
    "y": 738
  },
  "ps": {
    "x": 850,
    "y": 775
  },
  "psw": {
    "x": 735,
    "y": 735
  },
  "pw": {
    "x": 650,
    "y": 650
  },
  "pnw": {
    "x": 730,
    "y": 565
  },
  "l4": {
    "x": 630,
    "y": 500
  },
  "l3": {
    "x": 570,
    "y": 465
  },
  "l2": {
    "x": 520,
    "y": 451
  },
  "l1": {
    "x": 493,
    "y": 458
  },
  "lib": {
    "x": 417,
    "y": 451
  },
  "w3": {
    "x": 1020,
    "y": 500
  },
  "w2": {
    "x": 1090,
    "y": 455
  },
  "fork": {
    "x": 1240,
    "y": 420
  },
  "w1": {
    "x": 1173,
    "y": 368
  },
  "shop": {
    "x": 1130,
    "y": 353
  },
  "o2": {
    "x": 1420,
    "y": 400
  },
  "o1": {
    "x": 1640,
    "y": 450
  },
  "obs": {
    "x": 1754,
    "y": 454
  },
  "g3": {
    "x": 550,
    "y": 650
  },
  "g2": {
    "x": 440,
    "y": 690
  },
  "g1": {
    "x": 316,
    "y": 769
  },
  "green": {
    "x": 241,
    "y": 763
  },
  "a5": {
    "x": 1210,
    "y": 600
  },
  "a4": {
    "x": 1350,
    "y": 650
  },
  "a3": {
    "x": 1660,
    "y": 650
  },
  "a2": {
    "x": 1900,
    "y": 760
  },
  "a1": {
    "x": 1840,
    "y": 963
  },
  "cabin": {
    "x": 1737,
    "y": 955
  },
  "sw1": {
    "x": 365,
    "y": 820
  },
  "sw2": {
    "x": 450,
    "y": 840
  },
  "sw3": {
    "x": 565,
    "y": 860
  },
  "sw4": {
    "x": 650,
    "y": 855
  },
  "s1": {
    "x": 745,
    "y": 850
  },
  "s2": {
    "x": 875,
    "y": 875
  },
  "s3": {
    "x": 1000,
    "y": 850
  },
  "se1": {
    "x": 1100,
    "y": 820
  },
  "c3": {
    "x": 605,
    "y": 910
  },
  "c2": {
    "x": 660,
    "y": 970
  },
  "c1": {
    "x": 670,
    "y": 1017
  },
  "cottage": {
    "x": 626,
    "y": 1030
  },
  "d1": {
    "x": 740,
    "y": 1080
  },
  "dock": {
    "x": 810,
    "y": 1110
  },
  "d2": {
    "x": 850,
    "y": 1140
  },
  "d3": {
    "x": 900,
    "y": 1150
  },
  "k1": {
    "x": 780,
    "y": 930
  },
  "k2": {
    "x": 815,
    "y": 1010
  },
  "k3": {
    "x": 863,
    "y": 1126
  },
  "k4": {
    "x": 926,
    "y": 1142
  },
  "kiosk": {
    "x": 1010,
    "y": 1144
  },
  "f1": {
    "x": 953,
    "y": 1185
  },
  "f2": {
    "x": 1097,
    "y": 1164
  },
  "f3": {
    "x": 1023,
    "y": 1236
  },
  "t1": {
    "x": 1150,
    "y": 845
  },
  "t2": {
    "x": 1190,
    "y": 855
  },
  "t3": {
    "x": 1220,
    "y": 855
  },
  "t4": {
    "x": 1198,
    "y": 814
  },
  "clock": {
    "x": 1269,
    "y": 826
  }
});

export const EDGES = Object.freeze([
  // plaza ring and spokes
  ['pn', 'pne'], ['pne', 'pe'], ['pe', 'pse'], ['pse', 'ps'], ['ps', 'psw'], ['psw', 'pw'], ['pw', 'pnw'], ['pnw', 'pn'],
  ['pc', 'pn'], ['pc', 'pe'], ['pc', 'ps'], ['pc', 'pw'],
  // library
  ['pnw', 'l4'], ['l4', 'l3'], ['l3', 'l2'], ['l2', 'l1'], ['l1', 'lib'],
  // workshop + observatory
  ['pne', 'w3'], ['w3', 'w2'], ['w2', 'fork'], ['fork', 'w1'], ['w1', 'shop'], ['fork', 'o2'], ['o2', 'o1'], ['o1', 'obs'],
  // greenhouse
  ['pw', 'g3'], ['g3', 'g2'], ['g2', 'g1'], ['g1', 'green'],
  // archery
  ['pne', 'a5'], ['a5', 'a4'], ['a4', 'a3'], ['a3', 'a2'], ['a2', 'a1'], ['a1', 'cabin'],
  // southern loop
  ['g1', 'sw1'], ['sw1', 'sw2'], ['sw2', 'sw3'], ['sw3', 'sw4'], ['sw4', 's1'], ['s1', 'psw'], ['s1', 's2'], ['s2', 's3'], ['s3', 'pse'], ['s3', 'se1'],
  // cottage + dock
  ['sw3', 'c3'], ['c3', 'c2'], ['c2', 'c1'], ['c1', 'cottage'], ['c1', 'd1'], ['d1', 'dock'], ['dock', 'd2'], ['d2', 'd3'], ['d3', 'k3'],
  // kiosk + fire
  ['s1', 'k1'], ['k1', 'k2'], ['k2', 'k3'], ['k3', 'k4'], ['k4', 'kiosk'], ['kiosk', 'f1'], ['kiosk', 'f2'], ['f1', 'f3'], ['f2', 'f3'],
  // clock tower
  ['se1', 't1'], ['t1', 't2'], ['t2', 't3'], ['t3', 't4'], ['t4', 'clock'],
]);

/* ---- Homes, places and spots ---------------------------------------- */

/** Each pet's home: where it stands, `side` (the next node down its road: where a visitor stands beside it), and the building's tap area. */
export const SOURCE_HOMES = Object.freeze({
  chai: { node: 'lib', side: 'l1', door: { x: 322, y: 222 }, hit: { x: 150, y: 40, w: 300, h: 220 }, label: 'The library' },
  ginger: { node: 'shop', side: 'w1', door: { x: 822, y: 200 }, hit: { x: 610, y: 30, w: 330, h: 200 }, label: 'The workshop' },
  mallow: { node: 'obs', side: 'o1', door: { x: 1231, y: 190 }, hit: { x: 1170, y: 20, w: 240, h: 190 }, label: 'The observatory' },
  matcha: { node: 'green', side: 'g1', door: { x: 325, y: 420 }, hit: { x: 130, y: 300, w: 280, h: 160 }, label: 'The greenhouse' },
  mochi: { node: 'cabin', side: 'a1', door: { x: 1225, y: 420 }, hit: { x: 1100, y: 280, w: 300, h: 170 }, label: 'The archery cabin' },
  toffee: { node: 'f1', side: 'f3', door: { x: 806, y: 760 }, hit: { x: 720, y: 680, w: 180, h: 130 }, label: 'The campfire' },
  sesame: { node: 'clock', side: 't4', door: { x: 1256, y: 772 }, hit: { x: 1170, y: 520, w: 230, h: 280 }, label: 'The clock tower' },
  biscuit: { node: 'cottage', side: 'c1', door: { x: 272, y: 716 }, hit: { x: 170, y: 560, w: 270, h: 180 }, label: 'The rose cottage' },
});

export const HOMES = Object.freeze(Object.fromEntries(Object.entries(SOURCE_HOMES).map(([id,h]) => [id, { ...h, door: worldPoint(id,h.door), hit: worldBox(id,h.hit) }])));

/** Places that are not a pet's own home: the fire. */
export const PLACES = Object.freeze({
  fire: { node: 'f1', hit: worldBox('toffee', { x: 740, y: 836, w: 170, h: 90 }), label: 'The fire' },
});

/**
 * Where each house's subject sign hangs: the board's bottom centre, in
 * painting px. Low on the roof or the wall, so a phone's top bar never
 * covers it, and clear of the door where the friend stands.
 */
const SOURCE_SIGNS = Object.freeze({
  chai: { x: 282, y: 168 },
  ginger: { x: 742, y: 160 },
  mallow: { x: 1286, y: 166 },
  matcha: { x: 262, y: 352 },
  mochi: { x: 1246, y: 340 },
  biscuit: { x: 300, y: 610 },
  sesame: { x: 1240, y: 668 },
  toffee: { x: 808, y: 704 },
});

export const SIGNS = Object.freeze(Object.fromEntries(Object.entries(SOURCE_SIGNS).map(([id,p]) => [id, worldPoint(id,p)])));

/** Places a pet may wander to and linger. `ring` is the plaza's edge, in order round it. */
export const SPOTS = Object.freeze({
  plaza: ['pn', 'pne', 'pe', 'pse', 'ps', 'psw', 'pw', 'pnw', 'pc'],
  ring: ['pn', 'pne', 'pe', 'pse', 'ps', 'psw', 'pw', 'pnw'],
  bench: ['pw', 'pe', 'pn'],
  fire: ['f1', 'f2', 'f3'],
  dock: ['dock'],
});

/** Two friends who stop on the plaza to talk: neighbouring nodes, close enough to chat, never off the paving. */
export const CHATS = Object.freeze([['pc', 'pn'], ['pc', 'ps'], ['pne', 'pe'], ['pe', 'pse'], ['psw', 'pw'], ['pw', 'pnw']]);

/* ---- Light, smoke, water, time -------------------------------------- */

/** Every painted lamp post and lantern (the glass): a faint halo by day, full at dusk and night. */
const SOURCE_LAMPS = Object.freeze([
  // the library
  { x: 112, y: 180, r: 24 }, { x: 274, y: 197, r: 24 }, { x: 365, y: 200, r: 24 }, { x: 436, y: 151, r: 24 },
  // the workshop
  { x: 568, y: 173, r: 28 }, { x: 754, y: 178, r: 26 }, { x: 885, y: 172, r: 26 },
  // the observatory
  { x: 1118, y: 188, r: 28 }, { x: 1197, y: 168, r: 24 }, { x: 1392, y: 173, r: 22 },
  // the plaza's four posts
  { x: 559, y: 368, r: 46 }, { x: 956, y: 368, r: 46 }, { x: 537, y: 505, r: 42 }, { x: 972, y: 505, r: 42 },
  // greenhouse arch, cottage patio, the dock
  { x: 455, y: 405, r: 22 }, { x: 478, y: 648, r: 26 }, { x: 492, y: 822, r: 30 },
  // the notice board
  { x: 729, y: 750, r: 30 }, { x: 889, y: 750, r: 30 },
  // the archery cabin
  { x: 1195, y: 401, r: 24 }, { x: 1314, y: 410, r: 22 },
  // round the clock tower and its bridge
  { x: 1257, y: 737, r: 24 }, { x: 1132, y: 692, r: 28 }, { x: 1130, y: 813, r: 30 }, { x: 1447, y: 790, r: 28 },
]);

/** Painted windows: warm at dusk, glowing at night. */
export const SOURCE_WINDOWS = Object.freeze([
  { x: 166, y: 184, r: 22 }, { x: 236, y: 190, r: 22 }, { x: 397, y: 186, r: 22 }, { x: 320, y: 212, r: 18 },
  { x: 177, y: 107, r: 12 }, { x: 374, y: 102, r: 12 },
  { x: 712, y: 180, r: 16 }, { x: 822, y: 200, r: 26 },
  { x: 1232, y: 182, r: 18 }, { x: 1290, y: 183, r: 16 }, { x: 1341, y: 182, r: 16 },
  { x: 166, y: 360, r: 20 }, { x: 250, y: 370, r: 18 }, { x: 330, y: 416, r: 18 }, { x: 1334, y: 400, r: 16 },
  { x: 272, y: 700, r: 28 }, { x: 386, y: 690, r: 18 }, { x: 283, y: 647, r: 12 }, { x: 200, y: 708, r: 14 },
  { x: 1366, y: 630, r: 10 }, { x: 1386, y: 708, r: 12 },
]);

const lampOwners = ['chai','chai','chai','chai','ginger','ginger','ginger','mallow','mallow','mallow',null,null,null,null,'matcha','biscuit',null,'toffee','toffee','mochi','mochi','sesame','sesame','sesame','sesame'];
const windowOwners = ['chai','chai','chai','chai','chai','chai','ginger','ginger','mallow','mallow','mallow','matcha','matcha','matcha','mochi','biscuit','biscuit','biscuit','biscuit','sesame','sesame'];
const squareLamps = {10:{x:655,y:480,r:34},11:{x:1070,y:515,r:34},12:{x:620,y:755,r:34},13:{x:1090,y:790,r:34},16:{x:810,y:1080,r:24}};
export const LAMPS = Object.freeze(SOURCE_LAMPS.map((p,i)=>lampOwners[i]?worldPoint(lampOwners[i],p):squareLamps[i]));
export const WINDOWS = Object.freeze(SOURCE_WINDOWS.map((p,i)=>worldPoint(windowOwners[i],p)));

/** Smoke rises from each painted chimney: the cottage, the library, the workshop, the cabin. */
export const CHIMNEYS = Object.freeze([worldPoint('biscuit', { x: 214, y: 562 }), worldPoint('chai', { x: 228, y: 42 }), worldPoint('ginger', { x: 860, y: 18 }), worldPoint('mochi', { x: 1339, y: 278 })]);
/** The teapot on the cottage patio steams. */
export const TEAPOT = Object.freeze(worldPoint('biscuit', { x: 430, y: 700 }));
export const POND = Object.freeze({ x: 1670, y: 895, rx: 40, ry: 23 });
export const CLOCK = Object.freeze(worldPoint('sesame', { x: 1324, y: 634, r: 22 }));
export const FIRE = Object.freeze(worldPoint('toffee', { x: 822, y: 878 }));

/** Where each treasure draws itself. */
export const TREASURE_AT = Object.freeze({
  /* `ground` is the painting y where the lamp post stands (the foot of its stone base, or of the iron post for the south pair). A friend whose feet are above it walks BEHIND the lantern or string, below it IN FRONT (life.js sets each friend's z-index to its foot y; cards.js gives these the same scale). */
  lanterns: [{ x: 655, y: 480, ground: 560 }, { x: 1070, y: 515, ground: 595 }, { x: 620, y: 755, ground: 835 }, { x: 1090, y: 790, ground: 870 }],
  bunting: [[{ x: 655, y: 490, ground: 560 }, { x: 1070, y: 525 }], [{ x: 620, y: 765, ground: 835 }, { x: 1090, y: 800 }]],
  flowers: [{ x: 452, y: 300 }, { x: 600, y: 360 }, { x: 940, y: 330 }, { x: 1040, y: 560 }, { x: 560, y: 640 }, { x: 980, y: 640 }],
  fireflies: [{ x: 600, y: 540 }, { x: 948, y: 540 }],
  swing: { x: 590, y: 490 },
  chimes: { x: 1128, y: 196 },
  kite: { x: 1060, y: 120 },
  lilylights: [{ x: 90, y: 860 }, { x: 180, y: 900 }, { x: 290, y: 940 }, { x: 380, y: 880 }, { x: 140, y: 960 }],
  skylanterns: { x: 850, y: 650 },
});

/** Painted crops of each home, for backdrops behind other screens. */
export const CROPS = Object.freeze({
  chai: { x: 90, y: 0, w: 460, h: 330 },
  ginger: { x: 560, y: 0, w: 460, h: 320 },
  mallow: { x: 1060, y: 0, w: 476, h: 320 },
  matcha: { x: 60, y: 280, w: 460, h: 260 },
  mochi: { x: 1040, y: 260, w: 496, h: 280 },
  toffee: { x: 600, y: 660, w: 440, h: 330 },
  cottage: { x: 80, y: 520, w: 460, h: 330 },
  biscuit: { x: 80, y: 520, w: 460, h: 330 },
  clock: { x: 1060, y: 500, w: 420, h: 380 },
  sesame: { x: 1060, y: 500, w: 420, h: 380 },
  plaza: { x: 520, y: 300, w: 520, h: 380 },
});

/* ---- Routing -------------------------------------------------------- */

const ADJ = new Map();
for (const id of Object.keys(NODES)) ADJ.set(id, []);
for (const [a, b] of EDGES) {
  const d = Math.hypot(NODES[a].x - NODES[b].x, NODES[a].y - NODES[b].y);
  ADJ.get(a).push([b, d]); ADJ.get(b).push([a, d]);
}

/** The shortest walk between two nodes, as fresh points (both ends included), each carrying its node `id`. */
export function route(from, to) {
  if (!NODES[from] || !NODES[to]) return [];
  if (from === to) return [{ ...NODES[from], id: from }];
  const dist = new Map([[from, 0]]), prev = new Map(), open = new Set([from]);
  while (open.size) {
    let u = null;
    for (const n of open) if (u === null || dist.get(n) < dist.get(u)) u = n;
    open.delete(u);
    if (u === to) break;
    for (const [v, w] of ADJ.get(u)) {
      const alt = dist.get(u) + w;
      if (alt < (dist.get(v) ?? Infinity)) { dist.set(v, alt); prev.set(v, u); open.add(v); }
    }
  }
  if (!prev.has(to)) return [];
  const ids = [to];
  while (ids[0] !== from) ids.unshift(prev.get(ids[0]));
  return ids.map((id) => ({ ...NODES[id], id }));
}

export function nearestNode(p) {
  let best = null, bd = Infinity;
  for (const [id, n] of Object.entries(NODES)) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = id; } }
  return best;
}
