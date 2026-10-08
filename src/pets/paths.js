/**
 * paths.js — where things are in the painted village.
 *
 * Every number is a pixel in the painting's own space (1536 × 1024,
 * assets/art/home-world-v1.png). The screen scales the painting, so these
 * never change with the viewport. Pets walk ONLY along EDGES between NODES,
 * which were traced onto the sand and stone of the painting and checked by
 * tools/check-village-data.mjs: a node that drifts onto a roof, a tree or the
 * pond fails the gate.
 */

export const MAP = Object.freeze({ w: 1536, h: 1024, src: './assets/art/home-world-v1.png' });

/* ---- The walkable graph -------------------------------------------- */

export const NODES = Object.freeze({
  // the plaza: a paved ellipse round the flower medallion
  pc: { x: 770, y: 492 },
  pn: { x: 770, y: 420 }, pne: { x: 872, y: 438 }, pe: { x: 925, y: 490 }, pse: { x: 872, y: 545 },
  ps: { x: 770, y: 556 }, psw: { x: 668, y: 545 }, pw: { x: 615, y: 490 }, pnw: { x: 668, y: 438 },
  // north-west road to the library
  l4: { x: 622, y: 392 }, l3: { x: 566, y: 334 }, l2: { x: 500, y: 302 }, l1: { x: 420, y: 298 }, lib: { x: 336, y: 290 },
  // north-east: the workshop and the observatory share a fork
  w3: { x: 864, y: 384 }, w2: { x: 890, y: 336 }, fork: { x: 935, y: 300 }, w1: { x: 896, y: 268 }, shop: { x: 846, y: 250 },
  o2: { x: 1010, y: 274 }, o1: { x: 1080, y: 280 }, obs: { x: 1162, y: 280 },
  // west: the greenhouse
  g3: { x: 556, y: 480 }, g2: { x: 496, y: 472 }, g1: { x: 420, y: 478 }, green: { x: 332, y: 470 },
  // east: the archery cabin
  a5: { x: 1004, y: 456 }, a4: { x: 1052, y: 510 }, a3: { x: 1102, y: 548 }, a2: { x: 1150, y: 520 }, a1: { x: 1166, y: 484 }, cabin: { x: 1232, y: 476 },
  // the southern loop round the flower bed
  sw1: { x: 446, y: 522 }, sw2: { x: 470, y: 566 }, sw3: { x: 530, y: 590 }, sw4: { x: 600, y: 608 }, s1: { x: 662, y: 622 },
  s2: { x: 770, y: 640 }, s3: { x: 880, y: 628 }, se1: { x: 950, y: 608 },
  // south-west: the rose arch and the cottage
  c3: { x: 486, y: 636 }, c2: { x: 420, y: 704 }, c1: { x: 342, y: 736 }, cottage: { x: 290, y: 752 },
  // the dock along the pond
  d1: { x: 350, y: 796 }, dock: { x: 446, y: 822 }, d2: { x: 528, y: 830 }, d3: { x: 586, y: 818 },
  // south: steps down to the kiosk and the fire
  k1: { x: 646, y: 690 }, k2: { x: 640, y: 744 }, k3: { x: 642, y: 800 }, k4: { x: 712, y: 818 }, kiosk: { x: 806, y: 820 },
  f1: { x: 742, y: 866 }, f2: { x: 902, y: 842 }, f3: { x: 820, y: 922 },
  // south-east: down to the clock tower
  t1: { x: 1000, y: 652 }, t2: { x: 1048, y: 700 }, t3: { x: 1090, y: 746 }, t4: { x: 1160, y: 800 }, clock: { x: 1244, y: 814 },
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

/** Each pet's home: where it stands, and the building's tap area. */
export const HOMES = Object.freeze({
  chai: { node: 'lib', door: { x: 322, y: 222 }, hit: { x: 150, y: 40, w: 300, h: 220 }, label: 'The library' },
  ginger: { node: 'shop', door: { x: 822, y: 200 }, hit: { x: 610, y: 30, w: 330, h: 200 }, label: 'The workshop' },
  mallow: { node: 'obs', door: { x: 1231, y: 190 }, hit: { x: 1170, y: 20, w: 240, h: 190 }, label: 'The observatory' },
  matcha: { node: 'green', door: { x: 325, y: 420 }, hit: { x: 130, y: 300, w: 280, h: 160 }, label: 'The greenhouse' },
  mochi: { node: 'cabin', door: { x: 1225, y: 420 }, hit: { x: 1100, y: 280, w: 300, h: 170 }, label: 'The archery cabin' },
  toffee: { node: 'f1', door: { x: 806, y: 760 }, hit: { x: 720, y: 680, w: 180, h: 130 }, label: 'The campfire' },
  sesame: { node: 'clock', door: { x: 1256, y: 772 }, hit: { x: 1170, y: 520, w: 230, h: 280 }, label: 'The clock tower' },
  biscuit: { node: 'cottage', door: { x: 272, y: 716 }, hit: { x: 170, y: 560, w: 270, h: 180 }, label: 'The rose cottage' },
});

/** Places that are not a pet's own home: the fire. */
export const PLACES = Object.freeze({
  fire: { node: 'f1', hit: { x: 740, y: 836, w: 170, h: 90 }, label: 'The fire' },
});

/**
 * Where each house's subject sign hangs: the board's bottom centre, in
 * painting px. Low on the roof or the wall, so a phone's top bar never
 * covers it, and clear of the door where the friend stands.
 */
export const SIGNS = Object.freeze({
  chai: { x: 282, y: 168 },
  ginger: { x: 742, y: 160 },
  mallow: { x: 1286, y: 166 },
  matcha: { x: 262, y: 352 },
  mochi: { x: 1246, y: 340 },
  biscuit: { x: 300, y: 610 },
  sesame: { x: 1240, y: 668 },
  toffee: { x: 808, y: 704 },
});

/** Places a pet may wander to and linger. */
export const SPOTS = Object.freeze({
  plaza: ['pn', 'pne', 'pe', 'pse', 'ps', 'psw', 'pw', 'pnw', 'pc'],
  bench: ['pw', 'pe', 'pn'],
  fire: ['f1', 'f2', 'f3'],
  dock: ['dock'],
  visit: ['lib', 'shop', 'obs', 'green', 'cabin', 'cottage', 'clock'],
});

/* ---- Light, smoke, water, time -------------------------------------- */

/** Every painted lamp post and lantern (the glass): a faint halo by day, full at dusk and night. */
export const LAMPS = Object.freeze([
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
export const WINDOWS = Object.freeze([
  { x: 166, y: 184, r: 22 }, { x: 236, y: 190, r: 22 }, { x: 397, y: 186, r: 22 }, { x: 320, y: 212, r: 18 },
  { x: 177, y: 107, r: 12 }, { x: 374, y: 102, r: 12 },
  { x: 712, y: 180, r: 16 }, { x: 822, y: 200, r: 26 },
  { x: 1232, y: 182, r: 18 }, { x: 1290, y: 183, r: 16 }, { x: 1341, y: 182, r: 16 },
  { x: 166, y: 360, r: 20 }, { x: 250, y: 370, r: 18 }, { x: 330, y: 416, r: 18 }, { x: 1334, y: 400, r: 16 },
  { x: 272, y: 700, r: 28 }, { x: 386, y: 690, r: 18 }, { x: 283, y: 647, r: 12 }, { x: 200, y: 708, r: 14 },
  { x: 1366, y: 630, r: 10 }, { x: 1386, y: 708, r: 12 },
]);

/** Smoke rises from each painted chimney: the cottage, the library, the workshop, the cabin. */
export const CHIMNEYS = Object.freeze([{ x: 214, y: 562 }, { x: 228, y: 42 }, { x: 860, y: 18 }, { x: 1339, y: 278 }]);
/** The teapot on the cottage patio steams. */
export const TEAPOT = Object.freeze({ x: 430, y: 700 });
export const POND = Object.freeze({ x: 250, y: 900, rx: 300, ry: 110 });
export const CLOCK = Object.freeze({ x: 1324, y: 634, r: 26 });
export const FIRE = Object.freeze({ x: 822, y: 878 });

/** Where each treasure draws itself. */
export const TREASURE_AT = Object.freeze({
  /* `ground` is the painting y where the lamp post stands (the foot of its stone base, or of the iron post for the south pair). A friend whose feet are above it walks BEHIND the lantern or string, below it IN FRONT (life.js sets each friend's z-index to its foot y; cards.js gives these the same scale). */
  lanterns: [{ x: 552, y: 330, ground: 450 }, { x: 966, y: 330, ground: 450 }, { x: 520, y: 462, ground: 555 }, { x: 980, y: 464, ground: 555 }],
  bunting: [[{ x: 552, y: 340, ground: 450 }, { x: 966, y: 340 }], [{ x: 520, y: 470, ground: 555 }, { x: 980, y: 472 }]],
  flowers: [{ x: 452, y: 300 }, { x: 600, y: 360 }, { x: 940, y: 330 }, { x: 1040, y: 560 }, { x: 560, y: 640 }, { x: 980, y: 640 }],
  fireflies: [{ x: 600, y: 540 }, { x: 948, y: 540 }],
  swing: { x: 700, y: 330 },
  chimes: { x: 1128, y: 196 },
  kite: { x: 1060, y: 120 },
  lilylights: [{ x: 90, y: 860 }, { x: 180, y: 900 }, { x: 290, y: 940 }, { x: 380, y: 880 }, { x: 140, y: 960 }],
  skylanterns: { x: 770, y: 480 },
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

/** The shortest walk between two nodes, as points (both ends included). */
export function route(from, to) {
  if (!NODES[from] || !NODES[to]) return [];
  if (from === to) return [NODES[from]];
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
  return ids.map((id) => NODES[id]);
}

export function nearestNode(p) {
  let best = null, bd = Infinity;
  for (const [id, n] of Object.entries(NODES)) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = id; } }
  return best;
}
