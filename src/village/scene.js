/**
 * scene.js — the village, as the renderer draws it.
 *
 * Everything over the ground comes from here, and all of it is a pure
 * function of the village state: the Hearth and the Reading House at their
 * levels, the open-air yards of the Word Garden, the Root Workshop, the Loom
 * and the Market (each grows a prop at a time as it levels), the
 * neighbours' cottages, the land that has been opened, the pond, the
 * stepping stones, the trees — and Wick on his rounds.
 *
 * Every picture is a sprite from the art pack (see art.js). Nothing here
 * draws; it only decides what stands where. The only living thing is Wick:
 * the pack has no people or animals, so the neighbours live in the order
 * board and the callouts rather than on the paths.
 */

import { rng, LIGHT } from '../world/engine/palette.js';
import { art, PAL, wickFrames } from './art.js';
import { WORLD, BUILDINGS, PLOTS, HOUSE_SPOTS, BOARD, PLACE_BUILDING } from './defs.js';
import { paintTerrain, grassFor, steppingStones, PATHS, POND, POND_SCALE, HUB, placeable, invalidSpot, cannotStand } from './terrain.js';

/* ------------------------------------------------------------------ */
/* The path network                                                    */
/* ------------------------------------------------------------------ */

/** Named points the paths join, and which path joins which. Every node sits
 *  south of its building's base: the renderer sorts by y, so a walker on the
 *  node draws IN FRONT of the building, not inside it. */
export const NODES = {
  yard: [600, 705], crossroad: [600, 930], market: [648, 916], road: [600, 1200], reading: [790, 484], garden: [400, 574], roots: [470, 344],
  loom: [800, 812], stile: [905, 640], mira: [410, 814], pondside: [400, 872], across: [1010, 474], farm: [1010, 700], board: [690, 676],
  hollow: [400, 1040], eastfarm: [1022, 932],
};
const EDGES = [['yard', 'crossroad', 0], ['crossroad', 'road', 1], ['yard', 'reading', 2], ['yard', 'garden', 3], ['garden', 'roots', 4], ['reading', 'roots', 5], ['yard', 'loom', 6], ['loom', 'stile', 7], ['garden', 'mira', 8], ['mira', 'pondside', 9], ['mira', 'crossroad', 10], ['stile', 'across', 11], ['stile', 'farm', 12], ['yard', 'board', 13], ['crossroad', 'market', 14], ['crossroad', 'hollow', 15], ['farm', 'eastfarm', 16]];
export const HOUSE_NODE = ['mira', 'across', 'garden', 'roots', 'market', 'market', 'eastfarm', 'hollow', 'crossroad', 'garden'];
export const BUILDING_NODE = { hearth: 'yard', reading: 'reading', garden: 'garden', roots: 'roots', loom: 'loom', market: 'market', road: 'road', board: 'board' };

/**
 * The first and last leg of a walk — door to path, path to door — bent
 * round whatever is in the way: if the straight segment crosses water or a
 * wall, it goes via the nearest point on the path network that does not.
 */
function approach(from, to) {
  if (!crosses(from, to)) return [from, to];
  const points = PATHS.flat();
  let best = null;
  let bestD = Infinity;
  for (const pt of points) {
    if (crosses(from, pt) || crosses(pt, to)) continue;
    const d = Math.hypot(pt[0] - from[0], pt[1] - from[1]) + Math.hypot(pt[0] - to[0], pt[1] - to[1]);
    if (d < bestD) { bestD = d; best = pt; }
  }
  return best ? [from, best, to] : [from, to];
}

/** Does the straight line a to b pass through water or a wall? */
function crosses(a, b) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(len / 12));
  for (let i = 0; i <= n; i += 1) {
    const f = i / n;
    const why = cannotStand(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
    if (!why) continue;
    // A doorstep is up against a wall — that is what a doorstep is.
    if (why === 'building' && (f * len < 46 || (1 - f) * len < 46)) continue;
    return true;
  }
  return false;
}

/** The polyline from one node to another along the paths (breadth-first over the little graph). */
function routeBetween(a, b) {
  if (a === b) return [NODES[a]];
  const prev = new Map([[a, null]]);
  const queue = [a];
  while (queue.length) {
    const n = queue.shift();
    if (n === b) break;
    for (const [u, w, i] of EDGES) {
      const o = u === n ? w : w === n ? u : null;
      if (o && !prev.has(o)) { prev.set(o, [n, i, u === n]); queue.push(o); }
    }
  }
  if (!prev.has(b)) return [NODES[a], NODES[b]];
  const legs = [];
  for (let n = b; prev.get(n); n = prev.get(n)[0]) legs.unshift(prev.get(n));
  const out = [];
  for (const [, i, forward] of legs) { const p = forward ? PATHS[i] : [...PATHS[i]].reverse(); for (const q of p) out.push(q); }
  return out;
}

/* ------------------------------------------------------------------ */
/* Wick                                                                */
/* ------------------------------------------------------------------ */

/** Wick at the pack's own size: a cat beside a door. */
const WICK_SCALE = 1;
/** How long each pose holds a frame, in ms. */
const WICK_BEAT = { sit: 520, look: 520, walk: 110, sleep: 640, jump: 150, read: 480 };

/**
 * Wick. He sits by the Hearth and looks about; now and then he walks the
 * paths to wherever the village is pointing, sits there a while, and comes
 * back. At night he sleeps. He celebrates when something good happens, and
 * comes when called.
 */
function companion({ home, far, night, seed, start = 'home', homeNode = 'yard', farNode = 'yard' }) {
  const r = rng(`wick:${seed}`);
  const speed = 0.024;
  let t = 0, rest = start === 'far' ? 6000 + r() * 5000 : 2200 + r() * 2600, readAt = 7000 + r() * 6000;
  let pos = start === 'far' ? { x: far[0], y: far[1] } : { x: home[0], y: home[1] };
  let target = null, facing = 1, dest = start === 'far' ? 'far' : 'home';
  let burst = 0, sleeping = night;
  let queue = [];
  const step = () => { target = queue.shift() ?? null; if (target) facing = target.x >= pos.x ? 1 : -1; };
  const go = (to, toNode) => {
    const a = homeNode === toNode || !toNode
      ? approach([pos.x, pos.y], to)
      : [...approach([pos.x, pos.y], NODES[homeNode]), ...routeBetween(homeNode, toNode).slice(1), ...approach(NODES[toNode], to).slice(1)];
    queue = a.slice(1).map(([x, y]) => ({ x, y }));
    step();
  };
  const sprite = (pose) => art('wick', { pose, frame: Math.floor(t / (WICK_BEAT[pose] ?? 500)) % wickFrames(pose) });
  return {
    kind: 'companion',
    update(dt) {
      t += dt; readAt -= dt;
      if (burst > 0) { burst -= dt; return; }
      if (readAt <= -5200) readAt = 9000 + r() * 9000;
      if (sleeping) return;
      if (target) {
        const dx = target.x - pos.x, dy = target.y - pos.y, d = Math.hypot(dx, dy);
        if (d < 2) { if (queue.length) { step(); return; } target = null; rest = dest === 'far' ? 6000 + r() * 9000 : 5000 + r() * 8000; return; }
        pos.x += (dx / d) * speed * dt; pos.y += (dy / d) * speed * dt;
        return;
      }
      if (rest > 0) { rest -= dt; return; }
      if (dest === 'home') { dest = 'far'; go(far, farNode); } else { dest = 'home'; go(home, homeNode); }
    },
    /** Something good happened. */
    celebrate(ms = 2400) { burst = ms; sleeping = false; },
    /** Come here. */
    call(to) { sleeping = false; target = null; queue = []; dest = 'far'; go(to, farNode); },
    objects() {
      // `pose` rides on the object so the animation is testable from outside.
      const pose = burst > 0 ? 'jump' : sleeping ? 'sleep' : target ? 'walk' : readAt <= 0 ? 'read' : 'sit';
      return [{ x: pos.x, y: pos.y, pose, art: sprite(pose), scale: WICK_SCALE, flip: facing < 0 }];
    },
    lights() { return night ? [{ x: pos.x, y: pos.y - 10, r: 36, a: 0.35, color: PAL.glow }] : []; },
    get at() { return { x: pos.x, y: pos.y }; },
  };
}

/* ------------------------------------------------------------------ */
/* The yards: buildings made of the pack's props                       */
/* ------------------------------------------------------------------ */

/**
 * The four workplaces the pack has no house for are open-air yards, laid
 * out prop by prop relative to the building's `at`, and each level adds to
 * what the last one had — so a level-up is something you can see arrive.
 * [sprite, dx, dy, scale?, flip?]
 */
const YARDS = {
  garden: [
    [['fence', -36, -80], ['fence', 36, -80], ['flowers', -42, -46], ['flowers', 0, -52], ['flowers', 42, -46], ['planter', -58, -12], ['planter', 58, -12], ['sign', -30, 6]],
    [['flowers', -20, -24, 0.9], ['flowers', 24, -24, 0.9], ['bush', -66, -58, 0.85], ['bush', 68, -58, 0.85]],
    [['bench', 26, 2, 0.9]],
    [['tree_birch', -64, -92, 0.75], ['lamp', 66, 8, 0.8], ['flowers', -60, -80, 0.8], ['flowers', 60, -80, 0.8]],
  ],
  roots: [
    [['rock', -26, -54, 1.3], ['planter', -52, -18], ['planter', 12, -72], ['crate', 38, -26], ['grass', -8, -34, 1.2], ['sign', -14, 6]],
    [['planter', -24, -84], ['planter', 50, -64], ['planter', -60, -52, 0.9]],
    [['crate', 60, -10], ['books', 36, -44, 0.8], ['lamp', 62, 8, 0.8]],
    [['tree_pine', -70, -96, 0.8], ['tree_pine', 70, -100, 0.75], ['bench', 20, 4, 0.9]],
  ],
  loom: [
    [['bench', 0, -34], ['crate', -52, -38], ['crate', 52, -38], ['books', -52, -56, 0.8], ['sign', -34, 6]],
    [['books', -10, -48, 0.85], ['books', 14, -46, 0.7], ['crate', 38, -70, 0.9]],
    [['fence', -36, -92], ['fence', 36, -92], ['planter', 64, -6]],
    [['lamp', -66, 8, 0.8], ['lamp', 66, 8, 0.8]],
  ],
  market: [
    [['crate', -40, -26], ['crate', 0, -26], ['crate', 40, -26], ['books', -22, -44, 0.8], ['books', 22, -44, 0.8], ['sign', -60, 6]],
    [['planter', -72, -8], ['planter', 72, -8], ['bench', 0, -72, 0.9]],
    [['lamp', -70, 8, 0.8], ['lamp', 70, 8, 0.8], ['flowers', -40, -78, 0.8], ['flowers', 40, -78, 0.8]],
  ],
};

/** A yard's parts at a level: everything from level 1 up to it. */
export function yardParts(id, level) {
  const tiers = YARDS[id];
  if (!tiers) return [];
  return tiers.slice(0, Math.max(1, Math.min(level, tiers.length))).flat();
}

/** A yard has no image of its own; this stands in for one so named points work. */
function yardSprite(def) {
  const hw = def.hit.w / 2;
  return { ax: 0, ay: 0, w: def.hit.w, h: def.hit.h, points: { door: [0, 10], worker: [-20, 6], shelf: [hw - 26, 4], top: -def.hit.h } };
}

/* ------------------------------------------------------------------ */
/* The scene                                                           */
/* ------------------------------------------------------------------ */

/** Where a building's named point sits in the world. */
export function pointOf(def, sprite, name) {
  const p = sprite.points?.[name];
  if (!Array.isArray(p)) return { x: def.at.x, y: def.at.y };
  return { x: def.at.x - sprite.ax + p[0], y: def.at.y - sprite.ay + p[1] };
}

export let scenePlacementFixes = null;

/** Trees, oaks and birches for the broadleaf, pines for the rest. */
const treeName = (kind, i) => (kind === 'pine' ? 'tree_pine' : i % 3 === 0 ? 'tree_birch' : 'tree_oak');
const q4 = (n) => Math.round(n * 4) / 4;

/**
 * @param {object} state  the world state (with .village)
 * @param {object} atmo   { hour, season, weather }
 * @param {object} [opts] { focus: buildingId|null, carryLife, carryLifeKey }
 */
export function buildVillageScene(state, atmo, opts = {}) {
  const v = state.village;
  const { hour, season } = atmo;
  const night = hour === 'night';
  const dark = night || hour === 'dusk';
  const statics = [];
  const lamps = [];
  const life = [];
  const sprites = new Map();
  const focus = opts.focus ?? null;
  const anchors = [];
  const hitBoxes = [];
  const put = (name, x, y, o = {}) => { const s = { x, y, art: art(name, o.flip ? { flip: true } : {}), ...o }; if (s.scale === 1) delete s.scale; statics.push(s); if (name === 'lamp') addLamp(x, y - 56 * (o.scale ?? 1)); return s; };
  const addLamp = (x, y, r = 46, a = 0.5) => { if (dark) lamps.push({ x, y, r, a, color: PAL.glow }); };
  const forSale = (x, y, w) => {
    put('sign', x, y + 4, { z: -2 });
    put('fence', x - w / 2 + 30, y - 4, { z: -3, scale: 0.8, part: true });
    put('fence', x + w / 2 - 30, y - 4, { z: -3, scale: 0.8, part: true });
  };

  /* ---- The ground's sprites: the pond and the stepping stones ---- */
  statics.push({ x: POND.cx, y: POND.cy, z: -3000, art: art('pond'), scale: POND_SCALE, ground: true });
  for (const [x, y] of steppingStones()) statics.push({ x, y, z: -2000, art: art('pathTile'), scale: 0.8, ground: true });

  /* ---- Buildings ---- */
  for (const bv of v.buildings) {
    const def = bv.def;
    if (!bv.built) {
      if (bv.standing) { forSale(def.at.x, def.at.y, def.hit.w); anchors.push({ id: def.id, x: def.at.x, y: def.at.y - 34, built: false }); }
      hitBoxes.push({ kind: 'building', id: def.id, x0: def.at.x - def.hit.w / 2, x1: def.at.x + def.hit.w / 2, y0: def.at.y - def.hit.h, y1: def.at.y + 18 });
      continue;
    }
    if (def.id === 'road') {
      put('sign', 556, 1086);
      put('lamp', 650, 1092);
      put('crate', 630, 1040, { scale: 0.9 });
      if ((v.levels.get('road') ?? 0) >= 2) for (let i = 0; i < 4; i += 1) put('lamp', i % 2 ? 644 : 556, 1130 + i * 26, { scale: 0.8 });
      anchors.push({ id: def.id, x: 600, y: 1000, built: true });
      hitBoxes.push({ kind: 'building', id: def.id, x0: 540, x1: 660, y0: 1000, y1: 1110 });
      continue;
    }
    let sprite;
    if (YARDS[def.id]) {
      sprite = yardSprite(def);
      for (const [name, dx, dy, scale = 1, flip = false] of yardParts(def.id, bv.level)) put(name, def.at.x + dx, def.at.y + dy, { scale, flip, part: true, building: def.id });
    } else {
      sprite = art('building', { id: def.art, level: bv.level });
      statics.push({ x: def.at.x, y: def.at.y, art: sprite, building: def.id });
    }
    sprites.set(def.id, sprite);
    const top = def.at.y - sprite.ay + (sprite.points?.top ?? 0);
    anchors.push({ id: def.id, x: def.at.x + 10, y: top - 6, built: true });
    hitBoxes.push({ kind: 'building', id: def.id, x0: def.at.x - def.hit.w / 2 - 6, x1: def.at.x + def.hit.w / 2 + (YARDS[def.id] ? 6 : 30), y0: top, y1: def.at.y + 18 });
    if (dark && !YARDS[def.id]) addLamp(def.at.x, def.at.y - 30, 60, 0.3);
    if (def.id === 'hearth') {
      put('fence', def.at.x - 112, def.at.y - 6, { scale: 0.8 });
      put('bench', def.at.x - 78, def.at.y + 34, { scale: 0.85 });
      put('flowers', def.at.x - 90, def.at.y + 14, { scale: 0.8 });
      put('bush', def.at.x + 116, def.at.y + 8);
      put('planter', def.at.x + 104, def.at.y + 36, { scale: 0.9 });
      put('lamp', def.at.x - 112, def.at.y + 54, { scale: 0.8 });
      put('flowers', def.at.x - 58, def.at.y + 50, { scale: 0.7 });
      // The order board by the door.
      const board = art('sign');
      statics.push({ x: BOARD.at.x, y: BOARD.at.y, art: board, scale: 1.15, board: true });
      anchors.push({ id: 'board', x: BOARD.at.x, y: BOARD.at.y - board.ay * 1.15 - 4, built: true });
      hitBoxes.unshift({ kind: 'board', id: 'board', x0: BOARD.at.x - 30, x1: BOARD.at.x + 30, y0: BOARD.at.y - 58, y1: BOARD.at.y + 14 });
    }
    if (def.id === 'reading') {
      put('bench', def.at.x - 104, def.at.y + 26, { scale: 0.85 });
      put('lamp', def.at.x - 96, def.at.y + 10, { scale: 0.8 });
      put('flowers', def.at.x + 30, def.at.y + 34, { scale: 0.8 });
      put('planter', def.at.x + 122, def.at.y + 20, { scale: 0.9 });
    }
    // The shelf: made goods waiting to be collected, visible from across the village.
    if (def.good && bv.queue?.ready > 0) {
      const sh = pointOf(def, sprite, 'shelf');
      put(def.good === 'books' ? 'books' : 'crate', sh.x + (YARDS[def.id] ? 0 : 14), sh.y + 10, { scale: 0.75, part: true });
    }
  }

  /* ---- Land: marked out for sale, or what stands on it ---- */
  for (const pv of v.plotViews) {
    const def = pv.def;
    const { x, y, w, h } = def.rect;
    if (!pv.open) {
      if (pv.standing) {
        put('sign', def.at.x, y + h - 6, { z: -1 });
        anchors.push({ id: `plot:${def.id}`, x: def.at.x, y: y + h - 40, plot: true });
        hitBoxes.push({ kind: 'plot', id: def.id, x0: x, x1: x + w, y0: y, y1: y + h });
      }
      continue;
    }
    if (def.id === 'pen') {
      for (let fx = x + 40; fx < x + w - 20; fx += 60) { put('fence', fx, y + 22, { scale: 0.85, part: true }); put('fence', fx, y + h - 4, { scale: 0.85, part: true }); }
      put('grass', x + 50, y + 60, { scale: 1.2, part: true }); put('grass', x + w - 50, y + 70, { part: true }); put('crate', x + w - 36, y + 50, { scale: 0.85, part: true });
      put('flowers', x + 80, y + 84, { scale: 0.8, part: true });
    } else if (def.id === 'orchard') {
      for (let i = 0; i < 8; i += 1) { const col = i % 4, row = Math.floor(i / 4); put(i % 3 === 1 ? 'tree_birch' : 'tree_oak', x + 30 + col * 44, y + 70 + row * 72, { scale: 0.62, part: true }); }
      put('crate', x + w - 26, y + h - 10, { scale: 0.85, part: true });
    } else if (def.id === 'farm') {
      for (let i = 0; i < 5; i += 1) for (let k = 0; k < 4; k += 1) put(k % 2 ? 'flowers' : 'planter', x + 40 + k * 40, y + 40 + i * 34, { scale: 0.7, part: true });
      put('crate', x + w - 30, y + h - 14, { part: true }); put('crate', x + w - 58, y + h - 8, { scale: 0.85, part: true });
      put('fence', x + 50, y + h - 2, { part: true }); put('fence', x + 124, y + h - 2, { part: true });
    } else if (def.id === 'mill') {
      for (let i = 0; i < 6; i += 1) put('tree_birch', x + 30 + (i % 3) * 76, y + 70 + Math.floor(i / 3) * 90 + (i % 2) * 10, { scale: 0.8, part: true });
      put('bench', x + w / 2, y + h - 30, { part: true }); put('books', x + w / 2 + 10, y + h - 40, { scale: 0.6, z: 4, part: true });
      put('lamp', x + w / 2 + 50, y + h - 20, { scale: 0.8, part: true });
    } else if (def.id === 'square') {
      put('bench', x + 30, y + h - 8, { scale: 0.85, part: true }); put('bench', x + w - 30, y + h - 8, { scale: 0.85, part: true });
      put('planter', x + w / 2, y + h / 2 + 10, { part: true });
      put('lamp', x + 14, y + 22, { scale: 0.8, part: true }); put('lamp', x + w - 14, y + 22, { scale: 0.8, part: true });
      for (let i = 0; i < 10; i += 1) statics.push({ x: x + 20 + (i % 5) * 30, y: y + 30 + Math.floor(i / 5) * 34, z: -2000, art: art('pathTile'), scale: 0.8, ground: true });
    }
  }

  /* ---- The neighbours' cottages ---- */
  for (const nb of v.neighbours) {
    const spot = nb.spot;
    // Never mirrored: the pack is lit from the upper left, and a flipped
    // cottage would be the one house in the village lit from the right.
    const cot = art('building', { id: 'hearth', level: 1 });
    statics.push({ x: spot.x, y: spot.y, art: cot, house: nb.n, scale: 0.8 });
    const side = nb.n % 2 ? -1 : 1;
    put('bush', spot.x + side * 82, spot.y + 8, { scale: 0.8 });
    put(nb.n % 2 ? 'planter' : 'flowers', spot.x - side * 66, spot.y + 12, { scale: 0.8 });
    if (nb.n % 3 === 0) put('fence', spot.x - side * 80, spot.y - 8, { scale: 0.7 });
    if (dark) addLamp(spot.x, spot.y - 24, 44, 0.3);
    const top = spot.y - (cot.ay - (cot.points?.top ?? 0)) * 0.8;
    hitBoxes.push({ kind: 'neighbour', id: nb.id, n: nb.n, x0: spot.x - 60, x1: spot.x + 60, y0: top, y1: spot.y + 16 });
  }
  if (v.nextHouse?.standing) {
    const spot = v.nextHouse.at;
    forSale(spot.x, spot.y, 110);
    anchors.push({ id: `house:${v.nextHouse.n}`, x: spot.x, y: spot.y - 34, house: true });
    hitBoxes.push({ kind: 'house', id: `house:${v.nextHouse.n}`, n: v.nextHouse.n, x0: spot.x - 50, x1: spot.x + 50, y0: spot.y - 70, y1: spot.y + 14 });
  }

  /* ---- Trees, bushes, flowers, rocks: a garden town in a wood ---- */
  const placedTrees = [
    [560, 400, 'round', 1.0], [680, 200, 'round', 0.9], [860, 380, 'pine', 1.0], [900, 560, 'round', 0.9],
    [330, 430, 'round', 0.9], [300, 640, 'round', 0.9], [520, 780, 'round', 0.9], [720, 900, 'round', 0.9],
    [900, 870, 'pine', 0.9], [840, 960, 'round', 0.8], [470, 900, 'pine', 0.8], [200, 600, 'pine', 1.0],
    [560, 200, 'pine', 1.1], [400, 200, 'round', 1.0], [760, 160, 'round', 0.9],
    [1040, 560, 'round', 0.9], [1050, 860, 'round', 1.0], [180, 990, 'round', 0.9], [720, 1060, 'round', 0.8],
    [480, 1110, 'pine', 1.0], [640, 1000, 'round', 0.75], [250, 860, 'round', 0.8], [990, 1000, 'pine', 1.0],
  ];
  placedTrees.forEach(([x, y, kind, size], i) => {
    if (!placeable(x, y, { path: 16, building: 8, pond: 24 })) return;
    put(treeName(kind, i), x, y, { scale: q4(size) });
  });
  const tr = rng('village-trees');
  for (let i = 0; i < 260; i += 1) {
    const x = 20 + tr() * (WORLD.W - 40), y = 30 + tr() * (WORLD.H - 60);
    const edge = Math.min(x, WORLD.W - x, y * 1.4, (WORLD.H - y) * 1.6);
    const keep = tr() < (edge < 120 ? 0.9 : edge < 240 ? 0.45 : 0.2);
    if (!keep) continue;
    if (!placeable(x, y, { path: 26, pond: 40, building: 14 })) continue;
    const pine = tr() > 0.6;
    put(treeName(pine ? 'pine' : 'round', i), x, y, { scale: [0.75, 0.85, 1, 1.1][Math.floor(tr() * 4)] });
  }
  const fr = rng('village-flowers');
  for (let i = 0; i < 150; i += 1) {
    const path = PATHS[Math.floor(fr() * PATHS.length)];
    const [px, py] = path[Math.floor(fr() * path.length)];
    const side = fr() > 0.5 ? 1 : -1;
    const x = px + side * (26 + fr() * 14), y = py + (fr() - 0.5) * 20;
    if (!placeable(x, y, { path: false, pond: 30, building: 20 })) continue;
    put(fr() > 0.65 ? 'grass' : 'flowers', x, y, { scale: q4(0.8 + fr() * 0.4) });
  }
  const br = rng('village-bushes');
  for (let i = 0; i < 120; i += 1) {
    const x = 60 + br() * (WORLD.W - 120), y = 80 + br() * (WORLD.H - 160);
    if (!placeable(x, y, { path: 22, pond: 30, building: 12 })) continue;
    const k = br();
    put(k > 0.5 ? 'bush' : k > 0.25 ? 'flowers' : 'grass', x, y, { scale: q4(0.8 + br() * 0.4) });
  }
  for (let i = 0; i < 26; i += 1) {
    const x = 60 + br() * (WORLD.W - 120), y = 80 + br() * (WORLD.H - 160);
    if (!placeable(x, y, { path: 20, pond: 30, building: 26 })) continue;
    put('rock', x, y, { scale: q4(0.5 + br() * 0.4) });
  }
  // Round the pond: shrubs, flowers and stones on its bank.
  for (let i = 0; i < 9; i += 1) {
    const a = 0.2 + i * 0.7;
    const x = POND.cx + Math.cos(a) * (POND.rx + 22), y = POND.cy + Math.sin(a) * (POND.ry + 16) + 8;
    put(['bush', 'flowers', 'rock', 'grass'][i % 4], x, y, { scale: 0.75 });
  }
  put('bench', POND.cx + 40, POND.cy - POND.ry - 22, { scale: 0.85 });
  // Lamps in the yard and down the main street once there is a market.
  for (const [x, y] of [[540, 760], [660, 790]]) put('lamp', x, y, { scale: 0.8 });
  if (v.builtIds.has('market')) for (const [x, y] of [[560, 850], [640, 860]]) put('lamp', x, y, { scale: 0.8 });

  /* ---- Wick ---- */
  let wick;
  {
    const hearth = BUILDINGS.find((b) => b.id === 'hearth');
    const toward = focus ?? v.tip?.building ?? 'reading';
    const farDef = toward === 'board' ? { at: { x: BOARD.at.x - 40, y: BOARD.at.y + 14 } } : BUILDINGS.find((b) => b.id === toward) ?? BUILDINGS.find((b) => b.id === 'reading');
    wick = companion({
      home: [hearth.at.x - 18, hearth.at.y + 48], far: [farDef.at.x - 56, farDef.at.y + 18], night, seed: toward, start: focus ? 'far' : 'home',
      homeNode: 'yard', farNode: BUILDING_NODE[toward] ?? 'reading' });
    life.push(wick);
  }

  /* ---- The invariant: nothing stands in the water or inside a wall ----
     Every hand-placed object is checked once, at the end. One that lands
     somewhere impossible is nudged in a widening ring, or dropped: an absent
     bush is invisible and a bush inside a wall is a bug. A yard's own props
     (`part`) belong inside it, and the ground's sprites (`ground`) are the
     pond and the stones themselves. tools/check-world.mjs re-asks the same
     question of the scene the renderer actually draws. */
  {
    let moved = 0, dropped = 0;
    const RING = [];
    for (let r = 8; r <= 40; r += 8) for (let a = 0; a < 8; a += 1) RING.push([Math.cos((a * Math.PI) / 4) * r, Math.sin((a * Math.PI) / 4) * r * 0.7]);
    for (let i = statics.length - 1; i >= 0; i -= 1) {
      const st = statics[i];
      if (st.part || st.ground || !invalidSpot(st.x, st.y, v)) continue;
      const ok = RING.find(([dx, dy]) => !invalidSpot(st.x + dx, st.y + dy, v));
      if (ok) { st.x += ok[0]; st.y += ok[1]; moved += 1; } else { statics.splice(i, 1); dropped += 1; }
    }
    if (moved || dropped) scenePlacementFixes = { moved, dropped };
  }

  /* Keep Wick walking across a rebuild. refresh() rebuilds the scene after
     every collect, deliver and build — precisely while the learner is
     watching — and a fresh companion starts from his seeded spot. When
     nothing that decides the cast has changed, the previous actor carries on. */
  const lifeKey = [life.map((a) => a.kind).join(','), night ? 'night' : 'day', focus ?? ''].join('|');
  if (opts.carryLifeKey === lifeKey && Array.isArray(opts.carryLife) && opts.carryLife.length === life.length) {
    life.length = 0;
    for (const a of opts.carryLife) { life.push(a); if (a?.kind === 'companion') wick = a; }
  }

  /* Rain drops, seeded once: each keeps its column, phase and speed. */
  const RAIN = (() => {
    if (atmo.weather !== 'rain') return null;
    const r = rng('rain:drops');
    return Array.from({ length: 80 }, () => ({ u: r(), v: r(), sp: 0.78 + r() * 0.44 }));
  })();

  return {
    W: WORLD.W, H: WORLD.H,
    backdrop: grassFor(season),
    hour, atmo, season,
    life, lifeKey,          // so the next rebuild can carry Wick forward
    statics,                // tools/check-world.mjs validates every anchor
    village: v,             // …and needs to know what is actually standing
    get terrainKey() { return `${season}|${[...v.plots].sort().join(',')}|${[...(v.forSale ?? [])].sort().join(',')}|${[...v.builtIds].sort().join(',')}|${v.levels.get('road') ?? 0}`; },
    terrain(ctx) { paintTerrain(ctx, this.atmo, v); },
    update(dt, t) { this.time = t; for (const s of life) s.update(dt); },
    objects(view, t) {
      const out = statics.slice();
      for (const s of life) for (const o of s.objects(t)) out.push(o);
      return out;
    },
    light() {
      const l = LIGHT[hour] ?? LIGHT.morning;
      const tint = hour === 'night' ? '#2E3F6E' : hour === 'dusk' ? '#9A6A7E' : hour === 'dawn' ? '#FFD8B0' : l.tint;
      return { tint, strength: l.strength * (hour === 'night' ? 0.86 : hour === 'dusk' ? 0.8 : 0.9) };
    },
    lights() { const out = [...lamps]; for (const s of life) if (s.lights) out.push(...s.lights()); return out; },
    overlay(ctx, view, t) {
      if (hour === 'dawn' || hour === 'dusk') {
        const g = ctx.createLinearGradient(hour === 'dawn' ? view.x + view.w : view.x, 0, hour === 'dawn' ? view.x : view.x + view.w, 0);
        g.addColorStop(0, hour === 'dawn' ? 'rgba(255,196,120,0.18)' : 'rgba(255,150,90,0.2)'); g.addColorStop(1, 'rgba(120,90,160,0.1)');
        ctx.fillStyle = g; ctx.fillRect(view.x, view.y, view.w, view.h);
      }
      if (RAIN) {
        ctx.strokeStyle = 'rgba(220,232,240,0.5)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        const secs = t / 1000;
        for (const d of RAIN) {
          const y = view.y + (((d.v + secs * d.sp * 1.35) % 1) * view.h);
          const x = view.x + ((((d.u - secs * d.sp * 0.3) % 1) + 1) % 1) * view.w;
          ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 9);
        }
        ctx.stroke();
      }
      if (atmo.weather === 'fog') { ctx.fillStyle = 'rgba(240,238,228,0.18)'; ctx.fillRect(view.x, view.y, view.w, view.h); }
    },
    anchors,
    // The pack has no people: nobody works at a door or waits at the board,
    // so these stay empty and every caller already asks with `?.`.
    workers: new Map(),
    neighbours: new Map(),
    get wick() { return wick; },
    sprites,
    hit(x, y) {
      const w = wick.at;
      if (Math.abs(x - w.x) < 20 && y > w.y - 34 && y < w.y + 8) return { kind: 'wick' };
      for (const h of hitBoxes) if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h;
      return null;
    },
    /** A building's front-door point (or the board's), for camera moves and flights. */
    anchorOf(id) {
      if (id === 'board') return { x: BOARD.at.x, y: BOARD.at.y - 20 };
      if (String(id).startsWith('house:')) { const n = Number(id.slice(6)); return HOUSE_SPOTS[n] ?? null; }
      if (String(id).startsWith('plot:')) { const p = PLOTS.find((q) => q.id === id.slice(5)); return p?.at ?? null; }
      const b = BUILDINGS.find((q) => q.id === id);
      return b ? { x: b.at.x, y: b.at.y - 30 } : null;
    },
    /** A named point of a built building: door, worker, shelf, chimney. */
    pointOf(id, name) {
      const def = BUILDINGS.find((q) => q.id === id), sp = sprites.get(id);
      if (!def || !sp) return this.anchorOf(id);
      return pointOf(def, sp, name);
    },
  };
}

/* ------------------------------------------------------------------ */
/* A still of one building, for the place screens and the rooms        */
/* ------------------------------------------------------------------ */

/**
 * A portrait backdrop of one building at its level on the village's
 * ground, with trees behind and a path to the door. Drawn once and left
 * still (the renderer repaints it when a late image lands).
 */
export function buildBackdropScene(slug, state, atmo) {
  const bid = PLACE_BUILDING[slug] ?? 'hearth';
  const v = state?.village;
  const level = v?.levels?.get(bid) ?? 1;
  const def = BUILDINGS.find((b) => b.id === bid);
  const { hour, season } = atmo;
  const night = hour === 'night' || hour === 'dusk';
  const W = 360, H = 520, cx = W / 2 - 10, cy = 244;
  const lamps = night ? [{ x: W / 2, y: 214, r: 90, a: 0.4, color: PAL.glow }] : [];
  const objects = [];
  const put = (name, x, y, scale = 1, params = {}) => objects.push({ x, y, art: art(name, params), scale });
  [['tree_oak', 0.9], ['tree_pine', 1], ['tree_birch', 0.9], ['tree_oak', 1.1], ['tree_pine', 0.9], ['tree_oak', 1], ['tree_birch', 1]]
    .forEach(([name, s], i) => put(name, 24 + i * 52, 110 + (i % 2) * 18, s));
  if (bid === 'road') { put('sign', cx - 30, 250); put('lamp', cx + 56, 256); put('crate', cx + 10, 300, 0.9); }
  else if (YARDS[bid]) for (const [name, dx, dy, scale = 1] of yardParts(bid, level)) put(name, cx + dx, cy + dy, scale);
  else if (def?.art) put('building', cx, cy, 0.9, { id: def.art, level });
  if (bid === 'hearth') put('wick', cx - 60, cy + 14, WICK_SCALE, { pose: 'sit', frame: 0 });
  put('bush', 40, 276); put('bush', W - 40, 280, 0.9);
  put('flowers', 110, 300, 0.9); put('flowers', W - 104, 304, 0.8);
  put('fence', 64, 250, 0.8); put('fence', W - 62, 250, 0.8);
  for (let i = 0; i < 9; i += 1) objects.push({ x: W / 2 + Math.sin(i * 0.7) * 10, y: 300 + i * 26, z: -2000, art: art('pathTile'), scale: 0.6 });
  return {
    W, H, backdrop: grassFor(season), hour, atmo, focusY: 214,
    get terrainKey() { return `bd|${slug}|${level}|${season}|${night}`; },
    terrain(ctx) {
      ctx.fillStyle = grassFor(season); ctx.fillRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, 140); g.addColorStop(0, 'rgba(53,91,72,0.45)'); g.addColorStop(1, 'rgba(53,91,72,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 140);
      const g2 = ctx.createLinearGradient(0, H - 200, 0, H); g2.addColorStop(0, 'rgba(20,28,24,0)'); g2.addColorStop(1, 'rgba(20,28,24,0.5)'); ctx.fillStyle = g2; ctx.fillRect(0, H - 200, W, 200);
    },
    update() {},
    objects() { return objects; },
    light() { const l = LIGHT[hour] ?? LIGHT.morning; return { tint: l.tint, strength: l.strength * 0.75 }; },
    lights() { return lamps; },
    hit() { return null; },
  };
}

export { PATHS, POND, HUB };
