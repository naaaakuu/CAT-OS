/**
 * scene.js — the living village.
 *
 * Everything the renderer draws over the terrain comes from here, and all
 * of it is a pure function of the village state: the buildings at their
 * levels, the workers at their doors (working when the queue has
 * something in it, idle when it does not, sitting on the bench at dusk,
 * indoors at night), the goods on the shelves, the neighbours walking
 * between their houses and their haunts — and to the order board when
 * what they asked for is ready — Wick on his rounds, the animals the
 * plots brought, the trees, the smoke, the birds, the lamps at night.
 *
 * Every person and animal is here because the learner made the village
 * that holds them. Animation is deliberately sparse: idle → anticipation
 * → action → settle. Nothing is decoration on a timer.
 */

import { rng, LIGHT } from '../world/engine/palette.js';
import { art, PAL } from './art.js';
import { WORLD, BUILDINGS, PLOTS, HOUSE_SPOTS, CHARACTERS, NEIGHBOURS, BOARD, PLACE_BUILDING } from './defs.js';
import { paintTerrain, PATHS, POND, RIVER, BRIDGE, JETTY, HUB, nearPath, inPond, nearRiver, nearBuilding, inPlot, placeable, invalidSpot, cannotStand, insideBuilding, onBridgeDeck, RIVER_WATER } from './terrain.js';

/* ------------------------------------------------------------------ */
/* The path network                                                    */
/* ------------------------------------------------------------------ */

/** Named points the paths join, and which path joins which. */
export const NODES = {
  /* Every node sits ~14 units SOUTH of its building's base, because the
     renderer sorts by y: a walker standing on the node has to draw IN FRONT
     of the building, not inside it. The market's was 3 units NORTH of its
     base, and three of the ten neighbours haunt the market — they walked up
     to the stall and vanished into it. The jetty's was in the pond. */
  yard: [600, 705], crossroad: [600, 930], market: [648, 916], road: [600, 1200], reading: [790, 484], garden: [400, 574], roots: [470, 344],
  loom: [800, 812], bridge: [905, 640], mira: [410, 814], jetty: [400, 872], across: [1010, 474], farm: [1010, 700], board: [690, 676],
  // The hollow: the seventh cottage sits alone south-west of the pond and had
  // no node within two hundred units, so its neighbour set off across the
  // water every time he went fishing.
  hollow: [400, 1040],
  // The sixth cottage stood below the farm with the farm node directly north
  // of it, so its neighbour walked home straight down through his own roof.
  eastfarm: [1022, 932],
};
const EDGES = [['yard', 'crossroad', 0], ['crossroad', 'road', 1], ['yard', 'reading', 2], ['yard', 'garden', 3], ['garden', 'roots', 4], ['reading', 'roots', 5], ['yard', 'loom', 6], ['loom', 'bridge', 7], ['garden', 'mira', 8], ['mira', 'jetty', 9], ['mira', 'crossroad', 10], ['bridge', 'across', 11], ['bridge', 'farm', 12], ['yard', 'board', 13], ['crossroad', 'market', 14], ['crossroad', 'hollow', 15], ['farm', 'eastfarm', 16]];
export const HOUSE_NODE = ['mira', 'across', 'garden', 'roots', 'market', 'market', 'eastfarm', 'hollow', 'crossroad', 'garden'];
export const BUILDING_NODE = { hearth: 'yard', reading: 'reading', garden: 'garden', roots: 'roots', loom: 'loom', market: 'market', road: 'road', board: 'board' };


/**
 * The first and last leg of every journey — door to path, path to door — was
 * a straight line, and the path network is on the other side of whatever the
 * person lives beside. Measured over the ten cottage spots: two walked
 * through the Word Garden and the Root Workshop, two through the Market, one
 * through a cottage, one across the POND and one across the RIVER off the
 * bridge. Kit spent a fifth of his day standing on the water.
 *
 * This bends that leg around whatever is in the way: if the straight segment
 * crosses water or a wall, it goes via the nearest point on the path network
 * that does not. It is not a pathfinder and does not need to be — the node
 * graph already handles everything except the last few steps.
 */
function approach(from, to) {
  if (!crosses(from, to)) return [from, to];
  const points = PATHS.flat();
  // One bend, if one is enough.
  let best = null;
  let bestD = Infinity;
  for (const pt of points) {
    if (crosses(from, pt) || crosses(pt, to)) continue;
    const d = Math.hypot(pt[0] - from[0], pt[1] - from[1]) + Math.hypot(pt[0] - to[0], pt[1] - to[1]);
    if (d < bestD) { bestD = d; best = pt; }
  }
  if (best) return [from, best, to];
  // Two, if it is not. Kit lives south-west of the pond and fishes off the
  // jetty on its east side: no single waypoint gets him round the water, and
  // without this he waded across it for a fifth of his day.
  const reachableFrom = points.filter((p) => !crosses(from, p));
  const reachableTo = points.filter((p) => !crosses(p, to));
  let pair = null;
  bestD = Infinity;
  for (const a of reachableFrom) {
    for (const b of reachableTo) {
      if (crosses(a, b)) continue;
      const d = Math.hypot(a[0] - from[0], a[1] - from[1]) + Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(to[0] - b[0], to[1] - b[1]);
      if (d < bestD) { bestD = d; pair = [a, b]; }
    }
  }
  return pair ? [from, pair[0], pair[1], to] : [from, to];
}

/** Does the straight line a to b pass through water or a wall? */
function crosses(a, b) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.ceil(len / 12));
  for (let i = 0; i <= n; i += 1) {
    const f = i / n;
    const x = a[0] + (b[0] - a[0]) * f;
    const y = a[1] + (b[1] - a[1]) * f;
    const why = cannotStand(x, y);
    if (!why) continue;
    // A doorstep is up against a wall — that is what a doorstep is. Within
    // thirty units of either end, a wall is not an obstacle, or every
    // neighbour is trapped inside their own house and every candidate route
    // is rejected. Water is never exempt, at either end.
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
/* Living things                                                       */
/* ------------------------------------------------------------------ */

/**
 * A worker at a door. Works when the building has something on its clock,
 * idles (and looks up, waves, blinks) when it does not, sits on the bench
 * at dusk, and is indoors at night — the lit window says so.
 */
/**
 * `state` is the building's headline — unbuilt | idle | working | ready — and
 * it goes to READY the instant one finished good lands on the shelf, even
 * though the queue behind it is still crafting. The worker was reading that
 * enum, so the moment anything was collectable she stopped working: measured
 * over two minutes at a Reading House with two Pages pending and ten Books on
 * the shelf, five workers produced 649 frames of idle and wave and not one
 * frame of work. `working` is the separate fact she actually needs.
 */
function worker({ x, y, look, state, working, hour, seed, bench: benchAt, commuteFrom }) {
  const r = rng(`worker:${seed}`);
  let t = r() * 4000, next = 2500 + r() * 3000, face = 1;
  let mode = state === 'working' ? 'work' : 'idle';
  let burst = 0;
  const dusk = hour === 'dusk';
  const night = hour === 'night';
  // The morning commute: from the yard to the door, then the day's work.
  let walk = commuteFrom ? { from: commuteFrom, p: 0, dist: Math.hypot(x - commuteFrom[0], y - commuteFrom[1]) } : null;
  let pos = walk ? { x: commuteFrom[0], y: commuteFrom[1] } : { x, y };
  return {
    kind: 'worker', id: seed,
    update(dt) {
      t += dt; next -= dt;
      if (burst > 0) burst -= dt;
      if (walk) { walk.p += (0.03 * dt) / Math.max(1, walk.dist); if (walk.p >= 1) { walk = null; pos = { x, y }; } else { pos = { x: walk.from[0] + (x - walk.from[0]) * walk.p, y: walk.from[1] + (y - walk.from[1]) * walk.p }; face = x >= walk.from[0] ? 1 : -1; } return; }
      if (next <= 0) {
        next = 3000 + r() * 5000;
        if (working) mode = r() > 0.15 ? 'work' : 'idle';
        else { face = r() > 0.7 ? -face : face; mode = r() > 0.8 ? 'wave' : 'idle'; }
      }
    },
    cheer(ms = 2600) { burst = ms; },
    objects() {
      if (night && !walk) return [];
      const cheering = burst > 0;
      let pose = cheering ? 'cheer' : walk ? 'walk' : dusk && benchAt ? 'sit' : working && mode === 'idle' && r() > 0.7 ? 'work' : mode;
      const frame = Math.floor(t / (pose === 'walk' ? 170 : pose === 'work' ? 380 : 620)) % 4;
      const bob = cheering ? -Math.abs(Math.sin(t / 160)) * 5 : 0;
      // benchAt[1] is already the seat, two above the bench's own anchor.
      const px = pose === 'sit' ? benchAt[0] : pos.x, py = pose === 'sit' ? benchAt[1] : pos.y;
      // `pose` is carried on the object so the animation is testable from
      // outside: tools/check-world.mjs and the village-life probe read it.
      const out = [{ x: px, y: py, pose, art: art('person', { ...look, pose, frame }), flip: face < 0, bob }];
      if (cheering) for (let i = 0; i < 3; i += 1) { const a = burst / 2600; out.push({ x: px + (i - 1) * 14, y: py - 56 - (1 - a) * 24 - i * 4, z: 900, alpha: Math.max(0, a), art: art('icon', { glyph: 'heart', size: 11 }) }); }
      return out;
    },
    get at() { return { x: pos.x, y: pos.y }; },
  };
}

/**
 * A neighbour: lives in a house, walks to a haunt and back, goes indoors at
 * night, and — when an order of theirs can be delivered — walks to the
 * order board and waits there, so the person asking is the person you
 * hand it to.
 */
function neighbour({ nb, spot, node, haunt, waiting, hour, index }) {
  const r = rng(`nb:${nb.id}`);
  const door = [spot.x + 8, spot.y + 8];
  /* The step in front of the door. Without it, "walk to the door" was a
     straight line from wherever the path left off — which for half the
     cottages meant entering through a side wall. Everyone walks round to
     the front and then in, which is both correct and what it looks like
     people do. */
  const step = [spot.x + 8, spot.y + 34];
  const night = hour === 'night';
  let t = r() * 5000;
  let route = [], leg = 0, p = 0, pause = 0, facing = 1;
  let pos = { x: door[0], y: door[1] };
  let mode = 'home'; // home | out | back | toBoard | atBoard | homeFromBoard
  let visible = false;
  let burst = 0;
  const speed = 0.032 + r() * 0.008;
  const startRoute = (from, to) => { route = [from, ...approach(step, NODES[node]), ...routeBetween(node, to).slice(1)]; leg = 0; p = 0; };
  const goBoard = () => { route = [...approach([pos.x, pos.y], NODES[node]), ...routeBetween(node, 'board').slice(1)]; leg = 0; p = 0; mode = 'toBoard'; visible = true; };
  const goHome = (from) => { route = [[pos.x, pos.y], ...routeBetween(from, node).slice(1), ...approach(NODES[node], step).slice(1), door]; leg = 0; p = 0; };
  /* Somebody whose order is ready comes to the board whatever the hour.
     The board said "Mira is waiting for two Books", the learner tapped
     Deliver, and the goods flew to an empty patch of grass and a cheer was
     played on an invisible actor — because every neighbour was indoors. If
     the village says somebody is there, somebody is there. */
  if (waiting) { goBoard(); leg = Math.max(0, route.length - 2); p = 0.999; }
  else if (!night && r() > 0.45) { visible = true; mode = 'out'; startRoute(door, haunt); leg = Math.floor(r() * Math.max(1, route.length - 2)); }
  else pause = 4000 + r() * 12000;
  /* index % 3 for the column and index % 2 for the row means neighbours 0
     and 6 share a spot exactly, and 0 and 3 stand 22px apart — closer than
     a person is wide. A single modulus over six distinct spots, spaced by
     more than a shoulder, puts each of them somewhere of their own. */
  const FAN = [[-30, 6], [-66, 14], [-102, 22], [-30, 40], [-66, 48], [-102, 56]];
  const fan = FAN[index % FAN.length];
  const boardSpot = [BOARD.at.x + fan[0], BOARD.at.y + fan[1]];
  return {
    kind: 'neighbour', id: nb.id,
    update(dt) {
      t += dt;
      if (burst > 0) burst -= dt;
      if (pause > 0) { pause -= dt; return; }
      if (mode === 'home') {
        if (night) { pause = 9e9; return; }
        visible = true; mode = 'out'; startRoute(door, haunt);
        return;
      }
      if (mode === 'atBoard') { if (!waiting) { mode = 'homeFromBoard'; goHome('board'); } return; }
      const from = route[leg], to = route[leg + 1];
      if (!from || !to) { this.arrive(); return; }
      const dist = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1;
      p += (speed * dt) / dist;
      if (p >= 1) { p = 0; leg += 1; if (leg >= route.length - 1) { this.arrive(); return; } }
      const f2 = route[leg], t2 = route[leg + 1];
      if (f2 && t2) { pos = { x: f2[0] + (t2[0] - f2[0]) * p, y: f2[1] + (t2[1] - f2[1]) * p }; if (Math.abs(t2[0] - f2[0]) > 2) facing = t2[0] >= f2[0] ? 1 : -1; }
    },
    arrive() {
      if (mode === 'toBoard') { mode = 'atBoard'; pos = { x: boardSpot[0], y: boardSpot[1] }; facing = 1; return; }
      if (mode === 'out') { mode = 'back'; pause = 2600 + r() * 5000; goHome(haunt); return; }
      mode = 'home'; visible = false; pos = { x: door[0], y: door[1] }; pause = 8000 + r() * 16000;
    },
    /** The order was delivered: a cheer, then home. */
    thank() { burst = 2400; waiting = false; pause = 2400; },
    get waiting() { return mode === 'atBoard'; },
    objects() {
      if (!visible) return [];
      const cheering = burst > 0;
      const moving = pause <= 0 && mode !== 'atBoard' && mode !== 'home';
      const pose = cheering ? 'cheer' : moving ? (mode === 'homeFromBoard' ? 'carry' : 'walk') : mode === 'atBoard' ? (Math.floor(t / 4000) % 3 === 0 ? 'wave' : 'idle') : 'idle';
      const carry = pose === 'carry' ? (nb.carry ?? 'books') : nb.look.prop ?? null;
      const frame = Math.floor(t / (pose === 'walk' || pose === 'carry' ? 170 : 620)) % 4;
      const out = [{ x: pos.x, y: pos.y, art: art('person', { ...nb.look, prop: pose === 'carry' ? carry : nb.look.prop ?? null, pose, frame }), flip: facing < 0, bob: cheering ? -Math.abs(Math.sin(t / 160)) * 5 : 0 }];
      if (cheering) for (let i = 0; i < 3; i += 1) { const a = burst / 2400; out.push({ x: pos.x + (i - 1) * 14, y: pos.y - 56 - (1 - a) * 24 - i * 4, z: 900, alpha: Math.max(0, a), art: art('icon', { glyph: 'heart', size: 11 }) }); }
      return out;
    },
    get at() { return { x: pos.x, y: pos.y }; },
    get visible() { return visible; },
  };
}

/** Grazing animals in a rect: wander, stop, face where they go. */
/**
 * Shrink a grazing rectangle until every corner is ground an animal can
 * stand on. Sheep were wandering into the cottage above the pen, because the
 * rect was written relative to the plot and the plot has a neighbour.
 */
function grazeRect(rect) {
  let { x, y, w, h } = rect;
  for (let i = 0; i < 12; i += 1) {
    const corners = [[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y + h / 2]];
    if (!corners.some(([cx, cy]) => cannotStand(cx, cy))) break;
    x += 6; y += 6; w -= 12; h -= 12;
    if (w < 24 || h < 16) break;
  }
  return { x, y, w: Math.max(24, w), h: Math.max(16, h) };
}

function grazers({ rect, count, kind, seed }) {
  const r = rng(`graze:${seed}`);
  const herd = Array.from({ length: count }, (_, i) => ({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, tx: 0, ty: 0, face: r() > 0.5 ? 1 : -1, pause: r() * 5000, t: r() * 3000, v: 0.012 + r() * 0.008, i }));
  for (const a of herd) { a.tx = rect.x + r() * rect.w; a.ty = rect.y + r() * rect.h; }
  return {
    kind: 'grazers',
    update(dt) {
      for (const a of herd) {
        a.t += dt;
        if (a.pause > 0) { a.pause -= dt; continue; }
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        if (d < 2) { a.tx = rect.x + r() * rect.w; a.ty = rect.y + r() * rect.h; a.pause = 2500 + r() * 8000; continue; }
        a.x += (dx / d) * a.v * dt; a.y += (dy / d) * a.v * dt;
        if (Math.abs(dx) > 0.8) a.face = dx > 0 ? 1 : -1;
      }
    },
    objects() { return herd.map((a) => ({ x: a.x, y: a.y, art: art(kind, kind === 'dog' ? { frame: a.pause <= 0 ? Math.floor(a.t / 300) % 2 : 0, pose: a.pause > 0 ? 'sit' : 'walk' } : { frame: a.pause <= 0 ? Math.floor(a.t / 300) % 2 : 0 }), flip: a.face > 0 })); },
  };
}

/** Ducks paddling the pond. */
function ducks({ count, seed }) {
  const r = rng(`ducks:${seed}`);
  const ds = Array.from({ length: count }, () => ({ a: r() * Math.PI * 2, rr: 0.3 + r() * 0.5, v: (r() > 0.5 ? 1 : -1) * (0.00012 + r() * 0.0001), t: r() * 2000 }));
  return {
    kind: 'ducks',
    update(dt) { for (const d of ds) { d.a += d.v * dt; d.t += dt; } },
    objects() { return ds.map((d) => { const x = POND.cx + Math.cos(d.a) * POND.rx * d.rr, y = POND.cy + Math.sin(d.a) * POND.ry * d.rr; return { x, y, art: art('duck', { frame: Math.floor(d.t / 500) % 2 }), flip: Math.cos(d.a + Math.PI / 2) * d.v < 0 }; }); },
  };
}

/** A rowboat tied to the jetty, rocking. */
function boat() {
  let t = 0;
  return { kind: 'boat', update(dt) { t += dt; }, objects() { return [{ x: JETTY.x - JETTY.len - 22, y: JETTY.y + 16, art: art('boat', { frame: Math.floor(t / 900) % 2 }), z: -1 }]; } };
}

/** Butterflies over a patch. */
function butterflies({ rect, count, seed }) {
  const r = rng(`bf:${seed}`);
  const bs = Array.from({ length: count }, (_, i) => ({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, color: i % 7, phase: r() * 1000 }));
  let t = 0;
  return {
    kind: 'butterflies',
    update(dt) {
      t += dt;
      for (const b of bs) {
        b.x += Math.sin((t + b.phase) / 520) * 0.06 * dt + Math.cos((t + b.phase) / 1900) * 0.03 * dt;
        b.y += Math.cos((t + b.phase) / 610) * 0.04 * dt;
        if (b.x < rect.x) b.x = rect.x + rect.w; if (b.x > rect.x + rect.w) b.x = rect.x;
        if (b.y < rect.y) b.y = rect.y + rect.h; if (b.y > rect.y + rect.h) b.y = rect.y;
      }
    },
    objects() { return bs.map((b) => ({ x: b.x, y: b.y, z: 600, art: art('butterfly', { color: b.color, frame: Math.floor((t + b.phase) / 140) % 2 }) })); },
  };
}

/** Chimney smoke: puffs rising and fading. */
function smoke({ x, y, seed }) {
  const r = rng(`smoke:${seed}`);
  const puffs = [];
  let acc = 0;
  return {
    kind: 'smoke',
    update(dt) {
      acc += dt;
      if (acc > 900 && puffs.length < 6) { acc = 0; puffs.push({ x, y, t: 0, dx: (r() - 0.5) * 0.03 }); }
      for (const p of puffs) { p.t += dt; p.y -= 0.016 * dt; p.x += p.dx * dt + Math.sin(p.t / 500) * 0.06; }
      while (puffs.length && puffs[0].t > 4000) puffs.shift();
    },
    objects() { return puffs.map((p) => ({ x: p.x, y: p.y, z: 800, alpha: Math.max(0, 0.7 * (1 - p.t / 4000)), art: art('puff', { size: 1 + Math.min(2.2, Math.round((p.t / 1400) * 4) / 4) }) })); },
  };
}

/** Laundry on a line, swaying. */
function laundry({ x, y, seed }) {
  let t = 0;
  return { kind: 'laundry', update(dt) { t += dt; }, objects() { return [{ x, y, art: art('laundry', { seed, frame: Math.floor(t / 700) % 2 }) }]; } };
}

/** Sunlight on the water: short flat highlights that come and go, and the river's flow. */
function water({ night }) {
  const r = rng('water');
  const glints = [];
  for (let i = 0; i < 70; i += 1) {
    const [x, y] = RIVER[Math.floor(r() * (RIVER.length - 1))];
    glints.push({ x: x + (r() - 0.5) * 30, y: y + (r() - 0.5) * 6, phase: r() * 6, len: 4 + r() * 6, river: true });
  }
  for (let i = 0; i < 26; i += 1) {
    const a = r() * Math.PI * 2, rad = r() * 0.85;
    glints.push({ x: POND.cx + Math.cos(a) * POND.rx * rad, y: POND.cy + Math.sin(a) * POND.ry * rad, phase: r() * 6, len: 4 + r() * 8, river: false });
  }
  let t = 0;
  return {
    kind: 'water',
    update(dt) { t += dt; },
    objects() {
      return [{ x: 0, y: -9000, draw: (ctx, tt, view) => {
        ctx.strokeStyle = night ? 'rgba(210,225,255,0.55)' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
        ctx.beginPath();
        for (const g of glints) {
          if (g.x < view.x - 20 || g.x > view.x + view.w + 20 || g.y < view.y - 20 || g.y > view.y + view.h + 20) continue;
          const a = Math.sin(t / 700 + g.phase);
          if (a <= 0.35) continue;
          const dx = g.river ? 0 : a * 2;
          ctx.moveTo(g.x + dx - g.len / 2, g.y + (g.river ? (t / 60) % 12 - 6 : 0)); ctx.lineTo(g.x + dx + g.len / 2, g.y + (g.river ? (t / 60) % 12 - 6 : 0));
        }
        ctx.stroke();
        ctx.save(); ctx.setLineDash([18, 26]); ctx.lineDashOffset = -(t / 18) % 44;
        ctx.strokeStyle = night ? 'rgba(200,215,245,0.22)' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 4;
        ctx.beginPath(); RIVER.forEach(([x, y], i) => (i ? ctx.lineTo(x + Math.sin(i) * 6, y) : ctx.moveTo(x, y))); ctx.stroke();
        ctx.restore();
        // Rings on the pond now and then.
        const ring = (t / 1000) % 6;
        if (ring < 2.5) { ctx.strokeStyle = night ? 'rgba(210,225,255,0.3)' : 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(POND.cx - 30, POND.cy + 10, 4 + ring * 12, 2 + ring * 6, 0, 0, Math.PI * 2); ctx.stroke(); }
        if (night) {
          ctx.save(); ctx.translate(POND.cx + 20, POND.cy - 14); ctx.scale(1, 0.4);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
          g.addColorStop(0, 'rgba(255,250,225,0.55)'); g.addColorStop(0.5, 'rgba(255,250,225,0.18)'); g.addColorStop(1, 'rgba(255,250,225,0)');
          ctx.fillStyle = g; ctx.fillRect(-30, -30, 60, 60); ctx.restore();
        }
      } }];
    },
  };
}

/** Koi circling the pond: one for every dozen twins told apart. */
function koiSwim({ count, seed }) {
  const r = rng(`koi:${seed}`);
  const fish = Array.from({ length: count }, (_, i) => ({ a: r() * Math.PI * 2, v: (0.00018 + r() * 0.00014) * (r() > 0.5 ? 1 : -1), rad: 0.3 + r() * 0.5, variant: i % 4, t: r() * 1000 }));
  return {
    kind: 'koi',
    update(dt) { for (const f of fish) { f.a += f.v * dt; f.t += dt; } },
    objects() {
      return fish.map((f) => {
        const x = POND.cx + Math.cos(f.a) * POND.rx * f.rad, y = POND.cy + Math.sin(f.a) * POND.ry * f.rad;
        const heading = f.a + (f.v > 0 ? Math.PI / 2 : -Math.PI / 2);
        return { x, y: -8500, draw: (ctx) => { const a = art('koi', { variant: f.variant, frame: Math.floor(f.t / 260) % 2 }); ctx.save(); ctx.translate(x, y); ctx.rotate(heading + Math.PI); ctx.globalAlpha = 0.9; ctx.drawImage(a.canvas, -a.ax, -a.ay, a.w, a.h); ctx.restore(); } };
      });
    },
  };
}

/** Drifting things in the air: pollen by day, leaves in autumn, petals in spring, snow in winter, fireflies at night. */
function drift({ kind, rect, count, seed }) {
  const r = rng(`drift:${kind}:${seed}`);
  const ps = Array.from({ length: count }, () => ({ x: rect.x + r() * rect.w, y: rect.y + r() * rect.h, t: r() * 5000, phase: r() * 6, amp: 0.4 + r() * 0.8, c: Math.floor(r() * 5), vy: 0.012 + r() * 0.014 }));
  return {
    kind,
    update(dt) {
      for (const q of ps) {
        q.t += dt;
        if (kind === 'fireflies' || kind === 'pollen') { q.x += Math.sin(q.t / 900 + q.phase) * 0.05 * dt; q.y += Math.cos(q.t / 1100 + q.phase) * 0.03 * dt; }
        else { q.y += q.vy * dt; q.x += Math.sin(q.t / 600 + q.phase) * q.amp * 0.06 * dt; if (q.y > rect.y + rect.h) { q.y = rect.y; q.x = rect.x + r() * rect.w; } }
        if (q.x < rect.x) q.x = rect.x + rect.w; if (q.x > rect.x + rect.w) q.x = rect.x;
        if (q.y < rect.y) q.y = rect.y + rect.h; if (q.y > rect.y + rect.h) q.y = rect.y;
      }
    },
    objects() {
      if (kind === 'leaves' || kind === 'petals') return ps.map((q) => ({ x: q.x, y: q.y, z: 700, art: art('leaf', { color: kind === 'petals' ? 3 + (q.c % 2) : q.c % 3 }), rot: Math.sin(q.t / 500 + q.phase) * 0.8 }));
      return [{ x: 0, y: 100000, draw: (ctx, tt, view) => {
        for (const q of ps) {
          if (q.x < view.x || q.x > view.x + view.w || q.y < view.y || q.y > view.y + view.h) continue;
          if (kind === 'fireflies') { const a = 0.3 + 0.7 * Math.max(0, Math.sin(q.t / 450 + q.phase)); ctx.fillStyle = `rgba(248,241,154,${a})`; ctx.beginPath(); ctx.arc(q.x, q.y, 1.6, 0, Math.PI * 2); ctx.fill(); }
          else if (kind === 'pollen') { ctx.fillStyle = 'rgba(255,248,205,0.8)'; ctx.fillRect(q.x, q.y, 1.6, 1.6); }
          else if (kind === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(q.x, q.y, 1.6, 0, Math.PI * 2); ctx.fill(); }
        }
      } }];
    },
    lights() { return kind === 'fireflies' ? ps.filter((q, i) => i % 2 === 0).map((q) => ({ x: q.x, y: q.y, r: 14, a: 0.12 + 0.18 * Math.max(0, Math.sin(q.t / 450 + q.phase)), color: '#F8F19A' })) : []; },
  };
}

/** A flock crossing now and then. */
function birds({ seed }) {
  const r = rng(`birds:${seed}`);
  const flock = [];
  let next = 4000 + r() * 8000, t = 0;
  return {
    kind: 'birds',
    update(dt) {
      t += dt; next -= dt;
      if (next <= 0 && flock.length === 0) {
        const dir = r() > 0.5 ? 1 : -1, y0 = 120 + r() * 500;
        for (let i = 0; i < 4; i += 1) flock.push({ x: dir > 0 ? -30 - i * 14 : WORLD.W + 30 + i * 14, y: y0 + (i % 2) * 6 + i * 3, dir, phase: r() * 10 });
        next = 15000 + r() * 25000;
      }
      for (const b of flock) { b.x += b.dir * 0.09 * dt; b.y += Math.sin((t + b.phase * 1000) / 800) * 0.02 * dt; }
      for (let i = flock.length - 1; i >= 0; i -= 1) if (flock[i].x < -60 || flock[i].x > WORLD.W + 60) flock.splice(i, 1);
    },
    objects() { return flock.map((b) => ({ x: b.x, y: b.y, z: 5000, art: art('bird', { frame: Math.floor(t / 160 + b.phase) % 2 }), flip: b.dir < 0 })); },
  };
}

/** Cloud shadows drifting over the ground: depth for nothing. */
function cloudShadows({ seed, count = 4 }) {
  const r = rng(`cs:${seed}`);
  const cs = Array.from({ length: count }, () => ({ x: r() * WORLD.W, y: r() * WORLD.H, w: 140 + r() * 100, v: 0.006 + r() * 0.005 }));
  return {
    kind: 'clouds',
    update(dt) { for (const c of cs) { c.x += c.v * dt; if (c.x - c.w > WORLD.W) c.x = -c.w; } },
    objects() { return cs.map((c) => ({ x: c.x, y: -10000, art: art('cloudShadow', { w: Math.round(c.w / 20) * 20 }), bob: c.y + 10000 })); },
  };
}

/**
 * Wick. He sits on the Hearth's step and looks about; now and then he
 * walks to wherever the village is pointing, sits there a while, and
 * comes back. At night he sleeps on the step with his lamp beside him.
 * He jumps for joy when something good happens, and comes when called.
 */
function companion({ home, far, night, seed, start = 'home', homeNode = 'yard', farNode = 'yard' }) {
  const r = rng(`wick:${seed}`);
  const speed = 0.024;
  let t = 0, rest = start === 'far' ? 6000 + r() * 5000 : 2200 + r() * 2600, blinkAt = 2400, lookAt = 5000;
  let pos = start === 'far' ? { x: far[0], y: far[1] } : { x: home[0], y: home[1] };
  let target = null, facing = 1, dest = start === 'far' ? 'far' : 'home';
  let burst = 0, sleeping = night;
  /* Wick walked in a straight line between the Hearth and whatever the
     village was asking about, which put him inside the Hearth's front wall
     on two of his four destinations and straight through the Market on the
     other two: 276 of 900 measured ticks were inside a building. He takes
     the paths now, like everybody else — `approach` bends the leg around
     anything solid and the bend is walked as a queue. */
  let queue = [];
  const step = () => { target = queue.shift() ?? null; if (target) facing = target.x >= pos.x ? 1 : -1; };
  /* The full route, not a straight line. Wick's circuit runs from the yard
     to whatever the village is asking about, and the buildings are in the
     way: measured over nine hundred ticks, two hundred and seventy-six of
     them were inside one. He has a home node and a destination node, which
     is everything routeBetween needs — the only unrouted parts left are the
     few steps at each end, and `approach` bends those. */
  const go = (to, toNode) => {
    const a = homeNode === toNode || !toNode
      ? approach([pos.x, pos.y], to)
      : [...approach([pos.x, pos.y], NODES[homeNode]), ...routeBetween(homeNode, toNode).slice(1), ...approach(NODES[toNode], to).slice(1)];
    queue = a.slice(1).map(([x, y]) => ({ x, y }));
    step();
  };
  return {
    kind: 'companion',
    update(dt) {
      t += dt; blinkAt -= dt; lookAt -= dt;
      if (burst > 0) { burst -= dt; return; }
      if (blinkAt <= -170) blinkAt = 2800 + r() * 4200;
      if (lookAt <= -1400) lookAt = 6000 + r() * 8000;
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
    /** Something good happened: a jump, three times. */
    celebrate(ms = 2400) { burst = ms; sleeping = false; },
    /** Come here. */
    call(to) { sleeping = false; target = null; queue = []; dest = 'far'; go(to, farNode); },
    objects() {
      const out = [];
      if (burst > 0) { const k = Math.floor(burst / 400) % 2; out.push({ x: pos.x, y: pos.y, art: art('wick', { pose: k ? 'jump' : 'sit', frame: 0, lamp: night }), flip: facing < 0, bob: k ? -Math.abs(Math.sin(burst / 130)) * 8 : 0 }); if (k) out.push({ x: pos.x + (facing < 0 ? -18 : 18), y: pos.y - 34, z: 900, art: art('sparkle', { size: 1 }) }); return out; }
      if (sleeping) { out.push({ x: pos.x, y: pos.y, art: art('wick', { pose: 'sleep', lamp: night }), flip: facing < 0 }); const z = Math.floor(t / 700) % 3; out.push({ x: pos.x + 14, y: pos.y - 26 - z * 6, z: 900, alpha: 0.7 - z * 0.2, art: art('icon', { glyph: 'zz', size: 8 + z * 2 }) }); return out; }
      const pose = target ? 'walk' : lookAt <= 0 ? 'look' : 'sit';
      out.push({ x: pos.x, y: pos.y, art: art('wick', { pose, frame: Math.floor(t / 180) % 4, lamp: night, blink: blinkAt <= 0 && pose !== 'walk' }), flip: facing < 0 });
      return out;
    },
    lights() { return night ? [{ x: pos.x + (facing < 0 ? 12 : -12), y: pos.y - 4, r: 36, a: 0.45, color: PAL.glow }] : []; },
    get at() { return { x: pos.x, y: pos.y }; },
  };
}

/* ------------------------------------------------------------------ */
/* The scene                                                           */
/* ------------------------------------------------------------------ */

/** Where a building's named point sits in the world. */
export function pointOf(def, sprite, name) {
  const p = sprite.points?.[name];
  if (!p) return { x: def.at.x, y: def.at.y };
  return { x: def.at.x - sprite.ax + p[0], y: def.at.y - sprite.ay + p[1] };
}

/**
 * @param {object} state  the world state (with .village)
 * @param {object} atmo   { hour, season, weather }
 * @param {object} [opts] { focus: buildingId|null, commute: boolean }
 */
export function buildVillageScene(state, atmo, opts = {}) {
  const v = state.village;
  const { hour, season } = atmo;
  const night = hour === 'night';
  const dark = night || hour === 'dusk';
  const statics = [];
  const lamps = [];
  const life = [];
  const workers = new Map();
  const neighbours = new Map();
  const sprites = new Map();
  const focus = opts.focus ?? null;
  const practicedToday = state.hearth?.practicedToday;
  const stageWorth = v.worth;
  const anchors = [];
  const addLamp = (x, y, r = 46, a = 0.5) => { if (dark) lamps.push({ x, y, r, a, color: PAL.glow }); };
  const hitBoxes = [];

  /* ---- Buildings and the people at their doors ---- */
  for (const bv of v.buildings) {
    const def = bv.def;
    if (!bv.built) {
      if (bv.standing) {
        statics.push({ x: def.at.x, y: def.at.y + 4, z: -2, art: art('plotSign', { kind: 'sale' }) });
        statics.push({ x: def.at.x - def.hit.w / 2 + 10, y: def.at.y, z: -3, art: art('fence', { w: Math.round(def.hit.w * 0.36) }), alpha: 0.85 });
        statics.push({ x: def.at.x + def.hit.w / 2 - 10, y: def.at.y, z: -3, art: art('fence', { w: Math.round(def.hit.w * 0.36) }), alpha: 0.85 });
        anchors.push({ id: def.id, x: def.at.x, y: def.at.y - 34, built: false });
      }
      hitBoxes.push({ kind: 'building', id: def.id, x0: def.at.x - def.hit.w / 2, x1: def.at.x + def.hit.w / 2, y0: def.at.y - def.hit.h, y1: def.at.y + 18 });
      continue;
    }
    if (def.id === 'road') {
      statics.push({ x: 552, y: 1086, art: art('signpost', { arrows: 2 }) });
      statics.push({ x: 650, y: 1092, art: art('lamp', { lit: dark }) });
      addLamp(650, 1070);
      if ((v.levels.get('road') ?? 0) >= 2) for (let i = 0; i < 4; i += 1) { const x = i % 2 ? 644 : 556, y = 1130 + i * 26; statics.push({ x, y, art: art('lamp', { lit: true }) }); addLamp(x, y - 22, dark ? 40 : 18, dark ? 0.5 : 0.15); }
      statics.push({ x: 600, y: 1040, art: art('cart', { load: 'crates' }) });
      anchors.push({ id: def.id, x: 600, y: 1000, built: true });
      hitBoxes.push({ kind: 'building', id: def.id, x0: 540, x1: 660, y0: 1000, y1: 1110 });
      continue;
    }
    const sprite = art('building', { id: def.art, level: bv.level, night: dark });
    sprites.set(def.id, sprite);
    statics.push({ x: def.at.x, y: def.at.y, art: sprite, building: def.id });
    const top = def.at.y - sprite.ay + (sprite.points?.top ?? 0);
    anchors.push({ id: def.id, x: def.at.x + 10, y: top - 6, built: true });
    hitBoxes.push({ kind: 'building', id: def.id, x0: def.at.x - sprite.ax + 6, x1: def.at.x - sprite.ax + sprite.w - 6, y0: top, y1: def.at.y + 18 });
    if (dark) { addLamp(def.at.x, def.at.y - 30, 60, 0.3); const lp = sprite.points?.lamp; if (lp) addLamp(def.at.x - sprite.ax + lp[0], def.at.y - sprite.ay + lp[1], 40, 0.5); }
    const chim = sprite.points?.chimney;
    const ch = def.character ? CHARACTERS[def.character] : null;
    if (def.id === 'hearth') {
      statics.push({ x: def.at.x - 92, y: def.at.y - 6, art: art('fence', { w: 46 }) });
      statics.push({ x: def.at.x - 70, y: def.at.y + 30, art: art('bench') });
      statics.push({ x: def.at.x - 82, y: def.at.y + 14, art: art('flowerPatch', { seed: 'hf1', n: 7 }), scale: 1.3 });
      statics.push({ x: def.at.x + 96, y: def.at.y + 6, art: art('bush', { seed: 'hb', flowers: bv.level >= 3 }) });
      statics.push({ x: def.at.x - 104, y: def.at.y + 52, art: art('lamp', { lit: dark }) }); addLamp(def.at.x - 104, def.at.y + 30);
      statics.push({ x: def.at.x + 112, y: def.at.y - 12, art: art('log') }); statics.push({ x: def.at.x + 118, y: def.at.y - 22, art: art('log') }); statics.push({ x: def.at.x + 124, y: def.at.y - 32, art: art('log') });
      statics.push({ x: def.at.x + 96, y: def.at.y + 34, art: art('crate', { kind: 'barrel' }) });
      statics.push({ x: def.at.x - 60, y: def.at.y + 46, art: art('flowerPatch', { seed: 'hf2', n: 6 }), scale: 1.3 });
      if (chim && bv.level >= 2 && practicedToday) life.push(smoke({ x: def.at.x - sprite.ax + chim[0], y: def.at.y - sprite.ay + chim[1], seed: 'hearth' }));
      if (bv.level >= 3) life.push(grazers({ rect: grazeRect({ x: def.at.x - 70, y: def.at.y + 10, w: 140, h: 40 }), count: 1, kind: 'dog', seed: 'hearth-dog' }));
      // The order board by the door.
      const board = art('board', { notes: v.orders.length, ready: v.deliverable.length, night: dark });
      statics.push({ x: BOARD.at.x, y: BOARD.at.y, art: board, board: true });
      anchors.push({ id: 'board', x: BOARD.at.x, y: BOARD.at.y - board.ay - 4, built: true });
      hitBoxes.unshift({ kind: 'board', id: 'board', x0: BOARD.at.x - 30, x1: BOARD.at.x + 30, y0: BOARD.at.y - 46, y1: BOARD.at.y + 14 });
      continue;
    }
    if (def.id === 'roots' && bv.level >= 2 && chim) life.push(smoke({ x: def.at.x - sprite.ax + chim[0], y: def.at.y - sprite.ay + chim[1], seed: 'roots' }));
    if (def.id === 'roots') { statics.push({ x: def.at.x + 96, y: def.at.y + 18, art: art('crate', { kind: 'barrel' }) }); statics.push({ x: def.at.x + 110, y: def.at.y + 30, art: art('crate', { kind: 'barrel' }) }); statics.push({ x: def.at.x - 92, y: def.at.y + 12, art: art('fence', { w: 36 }) }); }
    if (def.id === 'garden') {
      statics.push({ x: def.at.x + 96, y: def.at.y + 14, art: art('beds', { seed: 'gb2', w: 48, rows: 3, grown: 0.4 + Math.min(0.6, (state.meadow?.mastered ?? 0) / 200), flowers: true }) });
      statics.push({ x: def.at.x - 86, y: def.at.y + 8, art: art('fence', { w: 40 }) });
      life.push(butterflies({ rect: { x: def.at.x - 90, y: def.at.y - 50, w: 220, h: 100 }, count: 2 + Math.min(4, Math.floor((state.meadow?.mastered ?? 0) / 60)), seed: 'garden' }));
    }
    if (def.id === 'market') { statics.push({ x: def.at.x + 92, y: def.at.y + 10, art: art('hay') }); statics.push({ x: def.at.x - 92, y: def.at.y + 12, art: art('crate', { kind: 'barrel' }) }); statics.push({ x: def.at.x - 104, y: def.at.y + 30, art: art('cart') }); }
    if (def.id === 'loom') { statics.push({ x: def.at.x - 90, y: def.at.y + 6, art: art('crate', { kind: 'sack' }) }); statics.push({ x: def.at.x - 100, y: def.at.y + 26, art: art('crate') }); life.push(laundry({ x: def.at.x + 100, y: def.at.y + 30, seed: 'loom' })); }
    // The bench was at +96, which is IN the river (the Reading House stands
    // 115 units from it). Ada sat on open water at dusk.
    if (def.id === 'reading') { statics.push({ x: def.at.x - 96, y: def.at.y + 26, art: art('bench'), bench: true }); statics.push({ x: def.at.x - 94, y: def.at.y + 12, art: art('lamp', { lit: dark }) }); addLamp(def.at.x - 94, def.at.y - 10); statics.push({ x: def.at.x - 100, y: def.at.y + 40, art: art('cart', { load: 'books' }) }); statics.push({ x: def.at.x + 40, y: def.at.y + 30, art: art('flowerPatch', { seed: 'rf', n: 7 }), scale: 1.3 }); }
    // The shelf: the made goods waiting to be collected, visible from across the village.
    if (def.good && bv.queue) {
      const sh = pointOf(def, sprite, 'shelf');
      statics.push({ x: sh.x, y: sh.y, art: art('shelf', { count: Math.min(8, bv.queue.ready), good: def.good }) });
    }
    // A bench for the worker at dusk. It is a REFERENCE to the bench object,
    // not a copy of its coordinates: the end-of-build sweep may move the
    // bench, and a worker who sits at the coordinates the bench used to have
    // is a worker sitting on nothing. Ada did exactly that, on the river.
    const benchRef = def.id === 'reading'
      ? statics[statics.findLastIndex((o) => o.bench)]
      : def.id === 'market' ? null : (statics.push({ x: def.at.x - 80, y: def.at.y + 30, art: art('bench'), bench: true }), statics[statics.length - 1]);
    const benchAt = benchRef ? { get 0() { return benchRef.x; }, get 1() { return benchRef.y - 2; } } : null;
    if (ch?.look) {
      const wp = pointOf(def, sprite, 'worker');
      const w = worker({ x: wp.x, y: wp.y, look: ch.look, state: bv.state, working: !!bv.queue?.working, hour, seed: def.id, bench: benchAt, commuteFrom: opts.commute && !night ? [HUB.x, HUB.y] : null });
      workers.set(def.id, w);
      life.push(w);
    }
  }

  /* ---- Land: fenced plots waiting, or what stands on them ---- */
  for (const pv of v.plotViews) {
    const def = pv.def;
    const { x, y, w, h } = def.rect;
    if (!pv.open) {
      if (pv.standing) {
        statics.push({ x: def.at.x, y: y + h - 6, z: -1, art: art('plotSign', { kind: 'sale' }) });
        anchors.push({ id: `plot:${def.id}`, x: def.at.x, y: y + h - 40, plot: true });
        hitBoxes.push({ kind: 'plot', id: def.id, x0: x, x1: x + w, y0: y, y1: y + h });
      }
      continue;
    }
    if (def.id === 'pen') {
      statics.push({ x: x + w / 2, y: y + 16, z: -1, art: art('fence', { w: w - 24 }) });
      statics.push({ x: x + w / 2, y: y + h - 2, art: art('fence', { w: w - 24, gate: true }) });
      statics.push({ x: x + 6, y: y + h / 2 + 6, art: art('fence', { w: 14 }) });
      statics.push({ x: x + w - 6, y: y + h / 2 + 6, art: art('fence', { w: 14 }) });
      statics.push({ x: x + w - 30, y: y + 44, art: art('hay') });
      // The graze rect is trimmed to ground the sheep can actually stand on:
      // the old one reached into the cottage on the rise above the pen.
      life.push(grazers({ rect: grazeRect({ x: x + 20, y: y + 28, w: w - 44, h: h - 46 }), count: 3, kind: 'sheep', seed: 'pen' }));
    } else if (def.id === 'orchard') {
      for (let i = 0; i < 8; i += 1) { const col = i % 4, row = Math.floor(i / 4); statics.push({ x: x + 30 + col * 44, y: y + 60 + row * 72, art: art('tree', { kind: 'round', size: 0.8, seed: `orch${i}`, tone: 2 }) }); }
      statics.push({ x: x + w - 26, y: y + h - 10, art: art('crate') });
    } else if (def.id === 'farm') {
      const barn = art('building', { id: 'barn', night: dark });
      statics.push({ x: x + w - 70, y: y + h - 30, art: barn });
      statics.push({ x: x + 44, y: y + h - 14, art: art('cart') });
      statics.push({ x: x + w / 2, y: y + h - 2, art: art('fence', { w: w - 30, gate: true }) });
      life.push(grazers({ rect: { x: x + 20, y: y + h - 80, w: w - 90, h: 56 }, count: 4, kind: 'chicken', seed: 'farm' }));
      for (let i = 0; i < 3; i += 1) statics.push({ x: x + 30 + i * 26, y: y + h - 34, art: art('hay') });
    } else if (def.id === 'mill') {
      const mill = art('building', { id: 'mill', night: dark });
      statics.push({ x: x + w / 2 - 20, y: y + h - 20, art: mill });
      statics.push({ x: x + 30, y: y + h - 10, art: art('crate', { kind: 'sack' }) });
      const chim = mill.points?.chimney; if (chim) life.push(smoke({ x: x + w / 2 - 20 - mill.ax + chim[0], y: y + h - 20 - mill.ay + chim[1], seed: 'mill' }));
    } else if (def.id === 'square') {
      statics.push({ x: x + w / 2, y: y + h / 2 + 14, art: art('well') });
      statics.push({ x: x + 26, y: y + h - 8, art: art('bench') });
      statics.push({ x: x + w - 26, y: y + h - 8, art: art('bench') });
      statics.push({ x: x + 14, y: y + 18, art: art('lamp', { lit: dark }) }); addLamp(x + 14, y - 4);
      statics.push({ x: x + w - 14, y: y + 18, art: art('lamp', { lit: dark }) }); addLamp(x + w - 14, y - 4);
    }
  }

  /* ---- The neighbours' houses, and the neighbours themselves ---- */
  const waitingFor = new Set(v.deliverable.map((o) => o.giver?.id));
  const haunts = ['reading', 'bridge', 'market', 'roots', 'board', 'bridge', 'market', 'jetty', 'garden', 'loom'];
  for (const nb of v.neighbours) {
    const spot = nb.spot;
    const cot = art('cottage', { seed: nb.id, level: 1 + (nb.n % 2), night: dark });
    statics.push({ x: spot.x, y: spot.y, art: cot, house: nb.n });
    statics.push({ x: spot.x + 74, y: spot.y + 8, art: art('bush', { seed: `hb${nb.n}`, berries: nb.n % 3 === 0 }) });
    if (nb.n % 2 === 0) statics.push({ x: spot.x - 70, y: spot.y + 10, art: art('flowerPatch', { seed: `hf${nb.n}`, n: 6 }), scale: 1.3 });
    if (nb.n % 3 === 1) life.push(laundry({ x: spot.x - 70, y: spot.y + 22, seed: nb.id }));
    statics.push({ x: spot.x - 64, y: spot.y + 12, art: art('fence', { w: 34 }) });
    statics.push({ x: spot.x + 30, y: spot.y + 26, art: art('flowerPatch', { seed: `cf${nb.n}`, n: 5 }), scale: 1.2 });
    if (nb.n % 4 === 2) statics.push({ x: spot.x + 84, y: spot.y + 20, art: art('hay') });
    if (dark) addLamp(spot.x, spot.y - 24, 44, 0.3);
    const top = spot.y - cot.ay + (cot.points?.top ?? 0);
    hitBoxes.push({ kind: 'neighbour', id: nb.id, n: nb.n, x0: spot.x - cot.ax + 6, x1: spot.x - cot.ax + cot.w - 6, y0: top, y1: spot.y + 16 });
    const n = neighbour({ nb, spot, node: HOUSE_NODE[nb.n] ?? 'yard', haunt: haunts[nb.n % haunts.length], waiting: waitingFor.has(nb.id), hour, index: nb.n });
    neighbours.set(nb.id, n);
    life.push(n);
  }
  if (v.nextHouse) {
    const spot = v.nextHouse.at;
    if (v.nextHouse.standing) {
      statics.push({ x: spot.x, y: spot.y + 2, z: -1, art: art('plotSign', { kind: 'sale' }) });
      anchors.push({ id: `house:${v.nextHouse.n}`, x: spot.x, y: spot.y - 34, house: true });
      hitBoxes.push({ kind: 'house', id: `house:${v.nextHouse.n}`, n: v.nextHouse.n, x0: spot.x - 50, x1: spot.x + 50, y0: spot.y - 70, y1: spot.y + 14 });
    }
  }

  /* ---- Trees, bushes, flowers, rocks: a village in a wood ---- */
  const placedTrees = [
    [560, 400, 'round', 1.1, 0], [680, 200, 'round', 1.0, 1], [860, 380, 'pine', 1.1, 0], [880, 520, 'round', 0.9, 2],
    [330, 430, 'round', 1.0, 1], [300, 640, 'round', 0.9, 0], [520, 780, 'round', 1.0, 2], [700, 900, 'round', 1.0, 0],
    [900, 870, 'pine', 1.0, 1], [840, 960, 'round', 0.9, 0], [470, 900, 'pine', 0.9, 1], [200, 600, 'pine', 1.2, 0],
    [690, 590, 'round', 0.8, 1], [560, 200, 'pine', 1.3, 0], [400, 200, 'round', 1.1, 0], [760, 160, 'round', 1.0, 2],
    [1040, 560, 'round', 1.0, 1], [1050, 860, 'round', 1.1, 0], [180, 990, 'round', 1.0, 1], [720, 1060, 'round', 0.9, 2],
    [480, 1110, 'pine', 1.1, 0], [640, 1000, 'round', 0.8, 1], [250, 860, 'round', 0.9, 2], [990, 1000, 'pine', 1.1, 0],
  ];
  for (const [x, y, kind, size, tone] of placedTrees) {
    // Through the one guard, like every other scatter. This list used to test
    // buildings, plots and paths only, and two of its trees stood in the water.
    if (!placeable(x, y, { path: 16, building: 8, pond: 24, river: 36 })) continue;
    const treeParams = { kind, size, seed: `hp${(x + y) % 6}`, tone, autumn: season === 'autumn' && kind === 'round' };
    statics.push({ x, y, art: art('tree', treeParams), sway: (x * 7 + y) % 6, treeParams });
  }
  const tr = rng('village-trees');
  for (let i = 0; i < 260; i += 1) {
    const x = 20 + tr() * (WORLD.W - 40), y = 30 + tr() * (WORLD.H - 60);
    const edge = Math.min(x, WORLD.W - x, y * 1.4, (WORLD.H - y) * 1.6);
    const keep = tr() < (edge < 120 ? 0.95 : edge < 240 ? 0.55 : 0.3);
    if (!keep) continue;
    if (!placeable(x, y, { path: 26, pond: 40, river: 46, building: 14 })) continue;
    const pine = tr() > 0.62;
    const size = [0.8, 1, 1.2, 1.4][Math.floor(tr() * 4)];
    const treeParams = { kind: pine ? 'pine' : 'round', size, seed: `t${i % 6}`, tone: Math.floor(tr() * 3), autumn: season === 'autumn' && !pine };
    statics.push({ x, y, art: art('tree', treeParams), sway: tr() * 6.28, treeParams });
  }
  const fr = rng('village-flowers');
  for (let i = 0; i < 110; i += 1) {
    const path = PATHS[Math.floor(fr() * PATHS.length)];
    const [px, py] = path[Math.floor(fr() * path.length)];
    const side = fr() > 0.5 ? 1 : -1;
    const x = px + side * (26 + fr() * 14), y = py + (fr() - 0.5) * 20;
    if (!placeable(x, y, { path: false, pond: 30, river: 40, building: 20 })) continue;
    statics.push({ x, y, art: art(fr() > 0.7 ? 'grassTuft' : 'flowerPatch', { seed: `pf${i}`, n: 5, w: 24, h: 14 }), scale: fr() > 0.7 ? 1.6 : 1.3 });
  }
  const br = rng('village-bushes');
  for (let i = 0; i < 80; i += 1) {
    const x = 60 + br() * (WORLD.W - 120), y = 80 + br() * (WORLD.H - 160);
    if (!placeable(x, y, { path: 22, pond: 30, river: 40, building: 12 })) continue;
    const kind = br();
    statics.push({ x, y, art: art(kind > 0.55 ? 'bush' : kind > 0.25 ? 'flowerPatch' : 'grassTuft', { seed: `b${i}`, n: 5, berries: br() > 0.7, flowers: br() > 0.8 }), scale: kind > 0.55 ? 1 : 1.5 });
    if (kind > 0.55 && br() > 0.5) statics.push({ x: x + 22, y: y + 6, art: art('bush', { seed: `bb${i}`, size: 0.7 }) });
  }
  const gr = rng('village-tufts');
  for (let i = 0; i < 160; i += 1) {
    const x = 40 + gr() * (WORLD.W - 80), y = 60 + gr() * (WORLD.H - 120);
    if (!placeable(x, y, { path: 14, pond: 24, river: 34, building: 6 })) continue;
    statics.push({ x, y, art: art('grassTuft', { seed: `g${i % 8}` }), scale: 1.4 + (i % 3) * 0.3 });
  }
  for (let i = 0; i < 24; i += 1) {
    const x = 60 + br() * (WORLD.W - 120), y = 80 + br() * (WORLD.H - 160);
    if (!placeable(x, y, { path: 20, pond: 30, river: 30, building: 26 })) continue;
    statics.push({ x, y, art: art(br() > 0.7 ? 'log' : 'rock', { seed: `r${i}`, size: 0.7 + br() * 0.9 }) });
  }
  // Reeds and a stump by the pond, stones along the river.
  for (let i = 0; i < 6; i += 1) { const a = 0.9 + i * 0.42; statics.push({ x: POND.cx + Math.cos(a) * (POND.rx + 10), y: POND.cy + Math.sin(a) * (POND.ry + 8) + 6, art: art('reeds', { seed: `pr${i}`, n: 4 + (i % 3) }), waterside: true }); }
  for (let i = 0; i < 4; i += 1) { const a = 3.6 + i * 0.4; statics.push({ x: POND.cx + Math.cos(a) * (POND.rx + 8), y: POND.cy + Math.sin(a) * (POND.ry + 6) + 4, art: art('reeds', { seed: `pq${i}`, n: 3 + (i % 2) }), waterside: true }); }
  // Hand-placed, and checked like everything else: reeds belong ON the pond's
  // rim, a stump belongs beside it, and the wall belongs on the river's bank.
  // Anything here that fails the guard is a bug, not a decision.
  statics.push({ x: 236, y: 848, art: art('stump', { seed: 'ps' }), waterside: true });
  statics.push({ x: 858, y: 612, art: art('stoneWall', { w: 36 }), waterside: true });
  // Lamps in the yard and along the main street once there is a market.
  for (const [x, y] of [[540, 760], [660, 790]]) { statics.push({ x, y, art: art('lamp', { lit: dark }) }); addLamp(x, y - 22); }
  if (v.builtIds.has('market')) { for (const [x, y] of [[560, 850], [640, 860]]) { statics.push({ x, y, art: art('lamp', { lit: dark }) }); addLamp(x, y - 22); } }

  /* ---- Animals that came with the village ---- */
  if (stageWorth >= 20) life.push(ducks({ count: Math.min(4, 1 + Math.floor(stageWorth / 60)), seed: 'pond' }));
  life.push(boat());
  {
    const koiCount = Math.min(8, Math.floor((state.pond?.mastered ?? 0) / 12) + ((state.pond?.known ?? 0) >= 5 ? 1 : 0));
    if (koiCount > 0) life.push(koiSwim({ count: koiCount, seed: 'pond' }));
  }
  if (stageWorth >= 44 && !night) life.push(grazers({ rect: { x: 640, y: 160, w: 120, h: 60 }, count: 2, kind: 'rabbit', seed: 'wood' }));

  /* ---- The environment: water that catches light, air with things in it ---- */
  life.push(water({ night }));
  if (night && season !== 'winter') {
    life.push(drift({ kind: 'fireflies', rect: { x: 300, y: 480, w: 260, h: 220 }, count: 10 + Math.min(14, Math.floor((state.meadow?.mastered ?? 0) / 40)), seed: 'garden' }));
    life.push(drift({ kind: 'fireflies', rect: { x: 40, y: 60, w: 500, h: 160 }, count: 8, seed: 'wood' }));
    life.push(drift({ kind: 'fireflies', rect: { x: 200, y: 820, w: 220, h: 160 }, count: 8, seed: 'pond' }));
  }
  if (!dark && season !== 'winter' && atmo.weather !== 'rain') life.push(drift({ kind: 'pollen', rect: { x: 310, y: 480, w: 240, h: 180 }, count: 14, seed: 'garden' }));
  if (season === 'autumn') life.push(drift({ kind: 'leaves', rect: { x: 0, y: 0, w: WORLD.W, h: WORLD.H }, count: 22, seed: 'leaves' }));
  if (season === 'spring') life.push(drift({ kind: 'petals', rect: { x: 200, y: 200, w: 700, h: 600 }, count: 14, seed: 'petals' }));
  if (atmo.weather === 'snow') life.push(drift({ kind: 'snow', rect: { x: 0, y: 0, w: WORLD.W, h: WORLD.H }, count: 140, seed: 'snow' }));

  /* ---- Wick ---- */
  let wick;
  {
    const hearth = BUILDINGS.find((b) => b.id === 'hearth');
    const toward = focus ?? v.tip?.building ?? 'reading';
    const farDef = toward === 'board' ? { at: { x: BOARD.at.x - 40, y: BOARD.at.y + 14 } } : BUILDINGS.find((b) => b.id === toward) ?? BUILDINGS.find((b) => b.id === 'reading');
    wick = companion({ // Wick sits at the edge of the yard, not against the Hearth's wall: from
      // there every circuit he walks starts on a path, and he stopped clipping
      // the front of the house on his way out.
      home: [hearth.at.x - 18, hearth.at.y + 48], far: [farDef.at.x - 56, farDef.at.y + 18], night, seed: toward, start: focus ? 'far' : 'home',
      homeNode: 'yard', farNode: BUILDING_NODE[toward] ?? 'reading' });
    life.push(wick);
  }

  /* ---- The invariant: nothing stands in the water or inside a wall ----

     The scatters ask the guard before they place; these are the ones that
     do NOT scatter — a bench 96px to the right of the Reading House, a bush
     beside a cottage, a lamp by the market — positioned by hand relative to
     their owner. Most are right. A few were not: the Reading House sits 115
     pixels from the river, so its bench stood IN it, and two cottage bushes
     landed inside the neighbouring house as the village grew.

     Rather than hand-nudge each one and wait for the next building to move,
     every placed object is checked here, once, at the end. A prop that lands
     somewhere impossible is mirrored to the other side of whatever it
     belongs beside; if that is impossible too it is dropped, because an
     absent bush is invisible and a bush inside a wall is a bug. Objects that
     belong at the water (reeds on the pond rim, the stone wall on the bank)
     carry `waterside` and are left alone.

     tools/check-world.mjs re-asks the same question of the scene the
     renderer actually draws, so this cannot quietly stop working. */
  {
    let moved = 0, dropped = 0;
    // Small nudges first, in a widening ring. The first version mirrored the
    // prop about the nearest building, which threw things two hundred units
    // across the map and tore a three-log woodpile in half. A prop that is
    // four units into a wall wants to move four units, not to the other side
    // of the house.
    const RING = [];
    for (let r = 8; r <= 40; r += 8) for (let a = 0; a < 8; a += 1) RING.push([Math.cos((a * Math.PI) / 4) * r, Math.sin((a * Math.PI) / 4) * r * 0.7]);
    for (let i = statics.length - 1; i >= 0; i -= 1) {
      const st = statics[i];
      if (st.waterside || !invalidSpot(st.x, st.y, v)) continue;
      const ok = RING.find(([dx, dy]) => !invalidSpot(st.x + dx, st.y + dy, v));
      if (ok) { st.x += ok[0]; st.y += ok[1]; moved += 1; } else { statics.splice(i, 1); dropped += 1; }
    }
    if (moved || dropped) scenePlacementFixes = { moved, dropped };
  }
  /* ---- Sky ---- */
  life.push(birds({ seed: 'sky' }));
  if (!dark) life.push(cloudShadows({ seed: 'sky', count: 3 }));

  /* ---- Sprites the first minute will want, rendered a few per frame after the first paint ---- */
  const pending = [];
  {
    const seen = new Set();
    for (const st of statics) {
      if (!st.treeParams) continue;
      const k = JSON.stringify(st.treeParams);
      if (seen.has(k)) continue;
      seen.add(k);
      pending.push({ ...st.treeParams, lean: 1 }, { ...st.treeParams, lean: -1 });
    }
  }
  /* Keep the village alive across a rebuild.

     refresh() rebuilds the whole scene after every collect, deliver, build,
     plot and house, on visibilitychange, and on the timer that fires the
     moment a worker finishes crafting — which is to say, precisely while the
     learner is watching. Every actor here is constructed from a fixed seed
     (`rng('nb:'+id)`, `rng('graze:'+seed)`), so a rebuild put all of them back
     exactly where they started: neighbours snapped mid-stride to the same
     point on their route, sheep and chickens jumped across the pen, chimney
     smoke and bird flocks vanished, ducks restarted. Identical every time,
     because the seeds are. The world visibly reset itself as a reward for
     playing, which is the most amateur thing the village did.

     Their state lives in closure variables (puffs, herd, t, acc) and cannot be
     copied from outside — so carry the INSTANCES instead. When nothing that
     determines the cast has changed, the previous actors keep running; the
     freshly built ones are discarded, which costs a few object literals
     (art() is lazy and cached, so no raster is repeated).

     The key is the cast itself — the ordered list of kinds — plus the values
     that decide how many of each there are. Anything that genuinely changes
     the village changes the key, and then everything is built anew, which is
     right: a new building should arrive with its smoke. */
  /* THE CAST, and only the cast.
     This key decides whether the previous scene's actors are carried across a
     rebuild — and refresh() rebuilds after every collect, deliver, build,
     plot and house, which is to say precisely while the learner is watching.
     It used to include `stageWorth` (which moves by three on EVERY delivered
     order) and the full per-building level string, so the key changed on
     every one of those actions and the carry was refused: measured, every
     walker in the village snapped back to its seeded start mid-stride, a
     neighbour cheering at the board vanished, and the cat restarted his walk.
     Only what adds or removes an ACTOR belongs here — a chimney that starts
     smoking, a dog that arrives at level three, the duck and rabbit counts —
     so the levels are reduced to those facts and the worth to a coarse
     bucket. */
  const lifeKey = [
    life.map((a) => a?.kind ?? '?').join(','),
    night ? 'night' : 'day',
    season,
    Math.floor((stageWorth ?? 0) / 60),
    Math.floor((state.meadow?.mastered ?? 0) / 12),
    Math.floor((state.pond?.mastered ?? 0) / 12),
    Math.floor((state.pond?.known ?? 0) / 12),
    v.neighbours.length,
    // Only the levels that change the cast.
    ['hearth', 'roots'].map((id) => `${id}${Math.min(3, v.levels.get(id) ?? 0)}`).join(''),
  ].join('|');
  if (opts.carryLifeKey === lifeKey && Array.isArray(opts.carryLife) && opts.carryLife.length === life.length) {
    life.length = 0;
    for (const a of opts.carryLife) life.push(a);
    /* AND re-point the handles. `workers`, `neighbours` and `wick` were
       filled with the freshly built actors above, and the carry then replaced
       `life` wholesale — so from the first rebuild onward every handle
       addressed an object that was never updated and never drawn. Everything
       that reaches for a character by name went with it: the cheer when a
       delivery lands, the thank-you, Wick's celebrate and call, Wick's hit box
       and the anchor his speech bubble is placed at. All of it was being sent
       to invisible objects. */
    for (const a of life) {
      if (a?.kind === 'worker' && a.id) workers.set(a.id, a);
      else if (a?.kind === 'neighbour' && a.id) neighbours.set(a.id, a);
      else if (a?.kind === 'companion') wick = a;
    }
  }

  let warmSince = 0;

  /* Rain drops, seeded once. Each drop keeps its column, its phase and its
     speed for the life of the scene; only its position is a function of time,
     so the shower FALLS. (It used to reseed the generator every 90 ms and
     scatter 80 fresh drops, which reads as flickering static, not weather.)
     Offsets are unit fractions so one table serves any viewport. */
  const RAIN = (() => {
    if (atmo.weather !== 'rain') return null;
    const r = rng('rain:drops');
    return Array.from({ length: 80 }, () => ({ u: r(), v: r(), sp: 0.78 + r() * 0.44 }));
  })();

  const scene = {
    W: WORLD.W, H: WORLD.H,
    backdrop: night ? '#1E3A20' : '#4F8E36',
    hour, atmo, season,
    life, lifeKey,          // so the next rebuild can carry these forward
    statics,                // tools/check-world.mjs validates every anchor
    village: v,             // …and needs to know what is actually standing
    warm(bucket, tint = null) {
      if (!pending.length) return;
      warmSince += 1;
      if (warmSince < 20) return;
      for (let i = 0; i < 2 && pending.length; i += 1) { const q = pending.shift(); try { art('tree', tint ? { ...q, tint } : q, bucket); } catch { /* skip */ } }
    },
    get terrainKey() { return `${season}|${[...v.plots].sort().join(',')}|${[...(v.forSale ?? [])].sort().join(',')}|${v.levels.get('road') ?? 0}`; },
    terrain(ctx) { paintTerrain(ctx, this.atmo, v); },
    update(dt, t) { this.time = t; for (const s of life) s.update(dt); },
    objects(view, t) {
      const out = [];
      const windy = atmo.weather === 'rain';
      for (const s of statics) {
        if (s.treeParams && s.x > view.x - 80 && s.x < view.x + view.w + 80 && s.y > view.y - 20 && s.y < view.y + view.h + 160) {
          const phase = Math.sin(t / (windy ? 900 : 1700) + s.sway);
          const lean = phase > 0.45 ? 1 : phase < -0.45 ? -1 : 0;
          if (lean !== (s.lean ?? 0)) { s.lean = lean; s.art = art('tree', lean ? { ...s.treeParams, lean } : s.treeParams); }
        }
        out.push(s);
      }
      for (const s of life) for (const o of s.objects(t)) out.push(o);
      return out;
    },
    light() {
      const l = LIGHT[hour] ?? LIGHT.morning;
      const tint = hour === 'night' ? '#2E3F86' : hour === 'dusk' ? '#9A6A8E' : hour === 'dawn' ? '#FFD8B0' : l.tint;
      return { tint, strength: l.strength * (hour === 'night' ? 0.86 : hour === 'dusk' ? 0.8 : hour === 'dawn' ? 0.9 : 0.9) };
    },
    lights() { const out = [...lamps]; for (const s of life) if (s.lights) out.push(...s.lights()); return out; },
    overlay(ctx, view, t) {
      if (hour === 'dawn' || hour === 'dusk') {
        const g = ctx.createLinearGradient(hour === 'dawn' ? view.x + view.w : view.x, 0, hour === 'dawn' ? view.x : view.x + view.w, 0);
        g.addColorStop(0, hour === 'dawn' ? 'rgba(255,196,120,0.22)' : 'rgba(255,150,90,0.26)'); g.addColorStop(1, 'rgba(120,90,160,0.12)');
        ctx.fillStyle = g; ctx.fillRect(view.x, view.y, view.w, view.h);
      }
      if (RAIN) {
        ctx.strokeStyle = 'rgba(200,225,245,0.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath();
        const secs = t / 1000;
        for (let i = 0; i < RAIN.length; i += 1) {
          const d = RAIN[i];
          // Down fast, drifting left a little — the same slant the streak is drawn at.
          const y = view.y + (((d.v + secs * d.sp * 1.35) % 1) * view.h);
          const x = view.x + ((((d.u - secs * d.sp * 0.3) % 1) + 1) % 1) * view.w;
          ctx.moveTo(x, y); ctx.lineTo(x - 2, y + 9);
        }
        ctx.stroke();
      }
      if (atmo.weather === 'fog') { ctx.fillStyle = 'rgba(232,237,242,0.18)'; ctx.fillRect(view.x, view.y, view.w, view.h); }
    },
    anchors,
    workers,
    neighbours,
    wick,
    sprites,
    hit(x, y) {
      // Wick, if you tap him.
      const w = wick.at;
      if (Math.abs(x - w.x) < 20 && y > w.y - 34 && y < w.y + 8) return { kind: 'wick' };
      for (const nb of neighbours.values()) { if (!nb.visible) continue; const a = nb.at; if (Math.abs(x - a.x) < 20 && y > a.y - 56 && y < a.y + 6) return { kind: 'person', id: nb.id }; }
      for (const h of hitBoxes) if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) return h;
      return null;
    },
    /** A building's front-door point (or the board's), for camera moves and flights. */
    anchorOf(id) {
      if (id === 'board') return { x: BOARD.at.x, y: BOARD.at.y - 20 };
      if (String(id).startsWith('house:')) { const n = Number(id.slice(6)); return HOUSE_SPOTS[n] ?? null; }
      if (String(id).startsWith('plot:')) { const p = PLOTS.find((q) => q.id === id.slice(5)); return p?.at ?? null; }
      const b = BUILDINGS.find((q) => q.id === id);
      if (!b) return null;
      return { x: b.at.x, y: b.at.y - 30 };
    },
    /** A named point of a built building: door, worker, shelf, chimney. */
    pointOf(id, name) {
      const def = BUILDINGS.find((q) => q.id === id), sp = sprites.get(id);
      if (!def || !sp) return this.anchorOf(id);
      return pointOf(def, sp, name);
    },
  };
  return scene;
}

/* ------------------------------------------------------------------ */
/* A still of one building, for the place screens and the rooms        */
/* ------------------------------------------------------------------ */

/**
 * A portrait backdrop of one building at its level with its worker at the
 * door, on the village's ground. Painted once and left still.
 */
export let scenePlacementFixes = null;

export function buildBackdropScene(slug, state, atmo) {
  const bid = PLACE_BUILDING[slug] ?? 'hearth';
  const v = state?.village;
  const level = v?.levels?.get(bid) ?? 1;
  const def = BUILDINGS.find((b) => b.id === bid);
  const { hour, season } = atmo;
  const night = hour === 'night' || hour === 'dusk';
  const W = 360, H = 520;
  const lamps = night ? [{ x: W / 2, y: 214, r: 90, a: 0.4, color: PAL.glow }] : [];
  const r = rng(`bd:${slug}`);
  return {
    W, H, backdrop: night ? '#1E3A20' : '#4F8E36', hour, atmo, focusY: 214,
    get terrainKey() { return `bd|${slug}|${level}|${season}|${night}`; },
    terrain(ctx) {
      const grass = season === 'autumn' ? '#B9B857' : season === 'winter' ? '#C9D3D8' : PAL.grass;
      ctx.fillStyle = grass; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 26; i += 1) { const x = r() * W, y = r() * H, rad = 40 + r() * 90; const g = ctx.createRadialGradient(x, y, 0, x, y, rad); const c = i % 2 ? PAL.grassLight : PAL.grassDark; g.addColorStop(0, hexA(c, 0.45)); g.addColorStop(1, hexA(c, 0)); ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
      const g = ctx.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, 'rgba(46,110,31,0.5)'); g.addColorStop(1, 'rgba(46,110,31,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 120);
      ctx.strokeStyle = PAL.path; ctx.lineWidth = 26; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(W / 2, 250); ctx.quadraticCurveTo(W / 2 + 20, 360, W / 2 - 10, H + 10); ctx.stroke();
      const draw = (name, params, x, y, scale = 1) => { const a = art(name, params); ctx.drawImage(a.canvas, x - a.ax * scale, y - a.ay * scale, a.w * scale, a.h * scale); return a; };
      for (let i = 0; i < 7; i += 1) draw('tree', { kind: i % 2 ? 'pine' : 'round', size: 0.9 + r() * 0.5, seed: `bdt${i % 6}`, tone: i % 3 }, 30 + i * 52, 96 + r() * 26);
      let sp = null;
      if (bid === 'road') { draw('signpost', { arrows: 2 }, W / 2 - 40, 240); draw('lamp', { lit: night }, W / 2 + 46, 246); draw('cart', { load: 'crates' }, W / 2, 290); }
      else if (def?.art) sp = draw('building', { id: def.art, level, night }, W / 2 - 10, 244, 0.9);
      const ch = def?.character ? CHARACTERS[def.character] : null;
      if (ch?.look) { const wp = sp?.points?.worker; const wx = wp ? W / 2 - 10 - sp.ax * 0.9 + wp[0] * 0.9 : W / 2 + 40; const wy = wp ? 244 - sp.ay * 0.9 + wp[1] * 0.9 : 252; draw('person', { ...ch.look, pose: 'idle' }, wx, wy, 0.9); }
      if (bid === 'hearth') draw('wick', { pose: 'sit', lamp: night }, W / 2 - 60, 258);
      draw('bush', { seed: 'bdb1', flowers: true }, 40, 270); draw('bush', { seed: 'bdb2' }, W - 40, 274);
      draw('flowerPatch', { seed: 'bdf', n: 7 }, 120, 292); draw('flowerPatch', { seed: 'bdf2', n: 6 }, W - 110, 296);
      draw('fence', { w: 50 }, 70, 250); draw('fence', { w: 50 }, W - 70, 250);
      const g2 = ctx.createLinearGradient(0, H - 200, 0, H); g2.addColorStop(0, 'rgba(12,18,34,0)'); g2.addColorStop(1, 'rgba(12,18,34,0.55)'); ctx.fillStyle = g2; ctx.fillRect(0, H - 200, W, 200);
    },
    update() {},
    objects() { return []; },
    light() { const l = LIGHT[hour] ?? LIGHT.morning; return { tint: l.tint, strength: l.strength * 0.75 }; },
    lights() { return lamps; },
    hit() { return null; },
  };
}

function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export { PATHS, POND, RIVER, HUB };
