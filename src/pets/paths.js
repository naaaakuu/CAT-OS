/**
 * paths.js — where things are in the painted valley.
 *
 * World pixels (src/home/landscape.js WORLD, 1086 × 1448: one per pixel of the
 * terrain painting). The screen scales the world, so these never change with
 * the viewport. Friends walk ONLY along EDGES between NODES, which follow the
 * painted dirt lanes, the two bridges and the open meadow (the village green,
 * where friends gather), and are checked by tools/check-village-data.mjs: a
 * node that drifts into the river, onto a roof or a house fails the gate.
 * They also STAND only on a node, so everything that needs two friends side
 * by side names two neighbouring nodes (CHATS, HOMES[].side).
 *
 * A house's own points (door, sign, lamps, windows, chimneys) are written in
 * its sprite's pixels in landscape.js and moved into the world here.
 */

import { WORLD, STILL, HOUSES, SQUARE, worldPoint, worldBox } from '../home/landscape.js';
export const MAP = Object.freeze({ w: WORLD.w, h: WORLD.h, src: STILL.src });

/* ---- The walkable graph -------------------------------------------- */

const n = (x, y) => Object.freeze({ x, y });
export const NODES = Object.freeze({
  // the lane up from the valley's foot, the library's door
  start: n(248, 1440), b1: n(262, 1398), b2: n(305, 1355), b3: n(372, 1318), b4: n(422, 1278), b5: n(440, 1235), b6: n(425, 1192), b7: n(380, 1155),
  lj: n(318, 1126), lib: n(262, 1140),
  // across to the main lane, the glasshouse and the wooden bridge
  w1: n(395, 1112), w2: n(480, 1105), j1: n(560, 1100), e1: n(625, 1121), e2: n(700, 1147), green: n(731, 1117),
  wb1: n(768, 1174), wb2: n(830, 1191), wb3: n(896, 1221), e3: n(945, 1254),
  // the main lane north to the railway
  m1: n(578, 1060), m2: n(568, 1020), m3: n(545, 995), m4: n(500, 973), m5: n(440, 948), m6: n(368, 922), m7: n(300, 898), m8: n(276, 865), m9: n(280, 828),
  gj: n(322, 802), shop: n(293, 816),
  // on north to the stone bridge, the observatory and the pantry
  m10: n(395, 790), m11: n(470, 782), m12: n(525, 765), m13: n(535, 740), m14: n(505, 712), m15: n(462, 685), m16: n(470, 664), m17: n(520, 648),
  p1: n(400, 650), pantry: n(340, 614),
  oj: n(560, 630), sb1: n(606, 646), sbA: n(632, 628), sb2: n(670, 620), sbB: n(712, 636), sb3: n(750, 664), obs: n(847, 673),
  // the long-table cottage, the clockworks and up to the hearth
  m18: n(578, 608), m19: n(565, 585), m20: n(530, 568), m21: n(510, 543), bj: n(495, 520), cottage: n(580, 494),
  m22: n(460, 500), m23: n(420, 485), m24: n(368, 470), m25: n(320, 450), m26: n(290, 432), m27: n(284, 410), m28: n(300, 390),
  m29: n(340, 374), sj: n(328, 357), clock: n(302, 340),
  m30: n(390, 360), m31: n(440, 350), m32: n(500, 325), m33: n(558, 300), m34: n(592, 280), m35: n(606, 255), m36: n(640, 238), m37: n(700, 226),
  camp: n(728, 274), f3: n(776, 304), f2: n(826, 282),
  // the village square: a ring of cobbles round the fountain where friends gather (parties, chats); pc is the front of the fountain
  pc: n(630, 886), pn: n(630, 790), pne: n(692, 804), pe: n(718, 838), pse: n(692, 872), psw: n(568, 872), pw: n(542, 838), pnw: n(568, 804),
});

export const EDGES = Object.freeze([
  // the foot of the valley and the library
  ['start', 'b1'], ['b1', 'b2'], ['b2', 'b3'], ['b3', 'b4'], ['b4', 'b5'], ['b5', 'b6'], ['b6', 'b7'], ['b7', 'lj'], ['lj', 'lib'],
  // the glasshouse and the wooden bridge
  ['b7', 'w1'], ['w1', 'w2'], ['w2', 'j1'], ['j1', 'e1'], ['e1', 'e2'], ['e2', 'green'], ['e2', 'wb1'], ['wb1', 'wb2'], ['wb2', 'wb3'], ['wb3', 'e3'],
  // the main lane to the railway
  ['j1', 'm1'], ['m1', 'm2'], ['m2', 'm3'], ['m3', 'm4'], ['m4', 'm5'], ['m5', 'm6'], ['m6', 'm7'], ['m7', 'm8'], ['m8', 'm9'], ['m9', 'gj'], ['gj', 'shop'],
  // to the stone bridge, the observatory and the pantry
  ['gj', 'm10'], ['m10', 'm11'], ['m11', 'm12'], ['m12', 'm13'], ['m13', 'm14'], ['m14', 'm15'], ['m15', 'm16'], ['m16', 'm17'], ['m17', 'oj'],
  ['m16', 'p1'], ['p1', 'pantry'],
  ['oj', 'sb1'], ['sb1', 'sbA'], ['sbA', 'sb2'], ['sb2', 'sbB'], ['sbB', 'sb3'], ['sb3', 'obs'],
  // the cottage, the clockworks, the hearth
  ['oj', 'm18'], ['m18', 'm19'], ['m19', 'm20'], ['m20', 'm21'], ['m21', 'bj'], ['bj', 'cottage'], ['bj', 'm22'], ['m22', 'm23'], ['m23', 'm24'], ['m24', 'm25'], ['m25', 'm26'], ['m26', 'm27'], ['m27', 'm28'],
  ['m28', 'm29'], ['m29', 'sj'], ['sj', 'clock'], ['m29', 'm30'], ['m30', 'm31'], ['m31', 'm32'], ['m32', 'm33'], ['m33', 'm34'], ['m34', 'm35'], ['m35', 'm36'], ['m36', 'm37'], ['m37', 'camp'], ['camp', 'f3'], ['f3', 'f2'],
  // the square: a ring round the fountain (nobody walks through it), reached by the two lanes from the main lane
  ['pn', 'pne'], ['pne', 'pe'], ['pe', 'pse'], ['pse', 'pc'], ['pc', 'psw'], ['psw', 'pw'], ['pw', 'pnw'], ['pnw', 'pn'],
  ['m12', 'pnw'], ['m4', 'psw'],
]);

/* ---- Homes, places and spots ---------------------------------------- */

const LABEL = {
  chai: 'The library', matcha: 'The glasshouse', ginger: 'The railway workshop', mallow: 'The observatory',
  mochi: 'The pantry', biscuit: 'The long-table cottage', sesame: 'The clockworks', toffee: 'The hearth',
};
const HOME_NODES = {
  chai: ['lib', 'lj'], matcha: ['green', 'e2'], ginger: ['shop', 'gj'], mallow: ['obs', 'sb3'],
  mochi: ['pantry', 'p1'], biscuit: ['cottage', 'bj'], sesame: ['clock', 'sj'], toffee: ['camp', 'f3'],
};

/** Each friend's home: where it stands, `side` (the next node down its road: where a visitor stands beside it), the door and the building's tap area. */
export const HOMES = Object.freeze(Object.fromEntries(Object.entries(HOUSES).map(([id, h]) => [id, Object.freeze({
  node: HOME_NODES[id][0], side: HOME_NODES[id][1], door: worldPoint(id, h.door), hit: worldBox(id, h.hit), label: LABEL[id],
})])));

/** Places that are not a friend's own home: the fire in the camp. */
export const PLACES = Object.freeze({
  fire: { node: 'camp', hit: worldBox('toffee', [240, 640, 290, 160]), label: 'The fire' },
});

/** Where each house's subject plate hangs (its bottom centre): above the roof, clear of the door and facade. */
export const SIGNS = Object.freeze(Object.fromEntries(Object.entries(HOUSES).map(([id, h]) => [id, worldPoint(id, h.sign)])));

/** Places a friend may wander to and linger. `ring` goes round the fountain, in order (pc, its front, is where a party's host stands). */
export const SPOTS = Object.freeze({
  plaza: ['pn', 'pne', 'pe', 'pse', 'pc', 'psw', 'pw', 'pnw'],
  ring: ['pn', 'pne', 'pe', 'pse', 'pc', 'psw', 'pw', 'pnw'],
  bench: ['pw', 'pe'],
  fire: ['camp', 'f2', 'f3'],
  dock: ['wb2'],
});

/** Two friends who stop in the square to talk: neighbouring nodes. */
export const CHATS = Object.freeze([['pn', 'pne'], ['pnw', 'pn'], ['pne', 'pe'], ['pe', 'pse'], ['psw', 'pw'], ['pw', 'pnw']]);

/* ---- Light, smoke, water, time -------------------------------------- */

const own = (key) => Object.freeze(Object.entries(HOUSES).flatMap(([id, h]) => h[key].map(([x, y, r]) => Object.freeze({ ...worldPoint(id, [x, y]), r: Math.max(6, r * 0.42), house: id }))));
/** The square's lamp posts: their glass is 50 world px above the foot (square.js LAMP_HEAD). They always burn. */
const SQUARE_LAMPS = SQUARE.lamps.map((l) => Object.freeze({ x: l.x, y: l.y - 50, r: 9 }));
/** Every painted lantern and lamp (a faint halo by day, full at dusk and night); `house` lights with its house. */
export const LAMPS = Object.freeze([...own('lamps'), ...SQUARE_LAMPS]);
/** Painted windows: warm at dusk, glowing at night. */
export const WINDOWS = own('windows');

/** Smoke rises from each chimney (its house awake): world points carrying `house`. */
export const CHIMNEYS = Object.freeze(Object.entries(HOUSES).flatMap(([id, h]) => h.chimneys.map((p) => Object.freeze({ ...worldPoint(id, p), house: id }))));
/** The kettle on the pantry counter steams. */
export const TEAPOT = Object.freeze(worldPoint('mochi', [668, 560]));
/** The square's fountain: the top of its upper bowl (water spills from here) and the basin's water, for the air's drops and ripples. */
export const FOUNTAIN = Object.freeze({ x: SQUARE.fountain.x, top: SQUARE.fountain.y - 58, pool: { x: SQUARE.fountain.x, y: SQUARE.fountain.y - 23, rx: 30, ry: 11 } });
/** A calm pool where the lower stream widens: glints, a fish, dragonflies. */
export const POND = Object.freeze({ x: 742, y: 752, rx: 40, ry: 16 });
/** The clockworks' face (its hands are drawn by src/home/mechanisms.js). */
export const CLOCK = Object.freeze({ ...worldPoint('sesame', [355, 408]), r: 52 * 0.294 });
export const FIRE = Object.freeze(worldPoint('toffee', [379, 706]));

/** Where each village treasure draws itself. `ground` joins the friends' z scale (z = foot y). */
export const TREASURE_AT = Object.freeze({
  // a paper lantern on each lamp post's hook, and bunting strung between the posts at the back and the front of the square
  lanterns: SQUARE.lamps.map((l) => ({ x: l.x + 6.5, y: l.y - 38, ground: l.y })),
  bunting: [[{ x: SQUARE.lamps[0].x, y: SQUARE.lamps[0].y - 57, ground: SQUARE.lamps[0].y }, { x: SQUARE.lamps[1].x, y: SQUARE.lamps[1].y - 57 }], [{ x: SQUARE.lamps[2].x, y: SQUARE.lamps[2].y - 57, ground: SQUARE.lamps[2].y }, { x: SQUARE.lamps[3].x, y: SQUARE.lamps[3].y - 57 }]],
  flowers: [{ x: 452, y: 884 }, { x: 760, y: 900 }, { x: 512, y: 1190 }, { x: 395, y: 604 }, { x: 700, y: 520 }, { x: 866, y: 1060 }],
  fireflies: [{ x: 552, y: 862 }, { x: 828, y: 880 }],
  swing: { x: 702, y: 556 },
  chimes: { x: 742, y: 400 },
  kite: { x: 560, y: 140 },
  lilylights: [{ x: 712, y: 742 }, { x: 760, y: 762 }, { x: 806, y: 786 }, { x: 650, y: 1300 }, { x: 724, y: 1270 }],
  skylanterns: { x: SQUARE.cx, y: SQUARE.cy },
});

/** Framings of the assembled valley still (landscape.js STILL) for backdrops behind other screens. */
export const CROPS = Object.freeze({
  chai: { x: 60, y: 760, w: 470, h: 400 },
  matcha: { x: 600, y: 860, w: 430, h: 300 },
  ginger: { x: 100, y: 560, w: 430, h: 300 },
  mallow: { x: 690, y: 420, w: 360, h: 300 },
  mochi: { x: 80, y: 330, w: 460, h: 320 },
  biscuit: { x: 420, y: 210, w: 420, h: 320 },
  cottage: { x: 420, y: 210, w: 420, h: 320 },
  sesame: { x: 150, y: 50, w: 360, h: 330 },
  clock: { x: 150, y: 50, w: 360, h: 330 },
  toffee: { x: 620, y: 50, w: 380, h: 300 },
  plaza: { x: 440, y: 680, w: 400, h: 330 },
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
    for (const q of open) if (u === null || dist.get(q) < dist.get(u)) u = q;
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
  for (const [id, q] of Object.entries(NODES)) { const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd) { bd = d; best = id; } }
  return best;
}
