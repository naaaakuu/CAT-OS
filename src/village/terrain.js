/**
 * terrain.js — the ground of the village: grass with its blotches and
 * tufts, the paths with their worn edges, the cobbled yard in front of
 * the Hearth, the river with its banks, the pond with its jetty, the
 * road out, the plots (fenced ground waiting, or fields once opened),
 * the square's cobbles. Painted once into a cache with path fills and
 * gradients — no per-pixel loops — and blitted every frame.
 *
 * The hour's light is applied by the renderer, so one terrain serves the
 * whole day; only opening land repaints it.
 */

import { rng, noise2, mix } from '../world/engine/palette.js';
import { PAL, art } from './art.js';
import { WORLD, PLOTS, BUILDINGS, HOUSE_SPOTS, BOARD } from './defs.js';

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** The river, north to south down the east side, with a bend at the bridge. */
export const RIVER = smooth([[880, -20], [900, 120], [930, 260], [905, 400], [890, 520], [905, 640], [940, 760], [925, 900], [900, 1040], [920, 1220]]);
/* How wide the river ACTUALLY is, taken from the same numbers paintTerrain
   strokes it with (70 sand / 62 / 54 deep water / 42). The invariant used a
   flat 14, so anything 15 to 27 units out was standing on open water and the
   gate called it clean: a neighbour's fence, her flower patch and her washing
   line were all in the river, all "valid". A constant that describes the
   drawing must come FROM the drawing. */
export const RIVER_WATER = 27;   // visible water, half-width
export const RIVER_BANK = 35;    // the sand either side
export const BRIDGE = { x: 905, y: 640, w: 76 };
export const POND = { cx: 300, cy: 900, rx: 98, ry: 60 };
/* The jetty's LAND end. It used to stop at x=372, which is inside the pond:
   the deck ran from 332 to 372 and the water's edge at that y is 391, so it
   was a raft nineteen units short of the shore, with a path and a graph node
   that both ended in open water. Kit stood on the pond for a fifth of his
   day. It now reaches the sand. */
export const JETTY = { x: 406, y: 878, len: 74 };

/** The yard in front of the Hearth: where every path meets. */
export const HUB = { x: 600, y: 705 };
/** The cobbles themselves — a hard surface, so nothing grows on it. The
 *  ellipse matches the one paintTerrain draws (see 'The yard in front of the
 *  Hearth' below); flowers were coming up through the paving stones. */
export const YARD = { cx: HUB.x + 6, cy: HUB.y - 4, rx: 58, ry: 32 };
export function inYard(x, y, pad = 0) {
  return ((x - YARD.cx) ** 2) / ((YARD.rx + pad) ** 2) + ((y - YARD.cy) ** 2) / ((YARD.ry + pad) ** 2) <= 1;
}

/** Paths: every building to the yard, the road out, the pond, the bridge. */
export const PATHS = [
  /* The main street runs from the Hearth to the road out in one line, and
     the Market sits BESIDE it on a short spur. It used to be centred on
     x=600 with the road going through its counter, so every neighbour on
     their way south walked through the stall and was drawn behind it. */
  [[600, 674], [600, 705], [600, 780], [600, 860], [600, 930]],                  // hearth → the crossroad
  [[600, 930], [600, 1010], [598, 1090], [600, 1200]],                           // the crossroad → the road out
  [[600, 705], [680, 640], [740, 560], [790, 484]],                              // yard → reading house
  [[600, 705], [520, 660], [450, 610], [400, 574]],                              // yard → word garden
  /* North out of the Word Garden the long way round. Every one of these
     used to leave the building's door and head straight back over its roof:
     the node is south of the building, so "go north" is "go through it", and
     a route is walked exactly as it is drawn. */
  [[400, 574], [344, 578], [330, 500], [386, 420], [442, 380], [470, 344]],     // garden → root workshop
  [[790, 484], [722, 480], [694, 404], [600, 360], [520, 344], [470, 344]],      // reading → roots (the north lane)
  /* Round the Loom, not through it. Both of these had control points inside
     its walls, and a route is walked exactly as it is drawn: two neighbours
     went in one side of the weaving shed and out the other. */
  [[600, 705], [676, 742], [726, 792], [800, 812]],                              // yard → loom
  // The approach comes in level with the deck and only then turns east: the
  // old curve cut the corner and forded the river 30 units short of the
  // bridge, so the path ran through open water.
  [[800, 812], [866, 782], [872, 706], [868, 650], [905, 640]],                  // loom → bridge
  [[400, 574], [372, 660], [360, 752], [376, 808], [410, 814]],                  // garden → Mira's cottage
  [[410, 814], [398, 856], [400, 872]],                                          // Mira → the jetty (the SAND end, not the water)
  [[410, 814], [500, 862], [556, 900], [600, 930]],                              // Mira → the crossroad
  [[905, 640], [960, 640], [1010, 474]],                                         // bridge → across the water
  [[905, 640], [960, 660], [1010, 700]],                                         // bridge → the farm
  [[600, 705], [660, 690], [690, 676]],                                          // yard → the order board
  [[600, 930], [626, 922], [648, 916]],                                          // the crossroad → the Market
  [[600, 935], [522, 1000], [448, 1032], [400, 1040]],                           // the crossroad → the hollow (cottage 8)
  [[1010, 700], [1044, 790], [1054, 880], [1022, 932]],                          // the farm → the east cottage (6)
].map((p) => smooth(p, 5));

/** Catmull-Rom subdivision so a hand-placed polyline flows. */
function smooth(pts, per = 6) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < per; k += 1) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function distToPolyline(px, py, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
    const d = Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    if (d < best) best = d;
  }
  return best;
}
export function nearPath(x, y, pad = 18) { return PATHS.some((p) => distToPolyline(x, y, p) < pad); }
export function inPond(x, y, pad = 0) { return ((x - POND.cx) ** 2) / ((POND.rx + pad) ** 2) + ((y - POND.cy) ** 2) / ((POND.ry + pad) ** 2) <= 1; }
export function nearRiver(x, y, pad = 40) { return distToPolyline(x, y, RIVER) < pad; }
/** Inside a building's footprint (the front wall plus the side that recedes up-right), padded. */
export function nearBuilding(x, y, pad = 40) {
  const near = (b) => x > b.at.x - b.hit.w / 2 - pad && x < b.at.x + b.hit.w / 2 + pad + 30 && y > b.at.y - b.hit.h - pad - 20 && y < b.at.y + pad + 16;
  return BUILDINGS.some(near) || HOUSE_SPOTS.some((s) => near({ at: s, hit: { w: 110, h: 90 } })) || near({ at: BOARD.at, hit: BOARD.hit });
}
export function inPlot(x, y) { return PLOTS.find((p) => x >= p.rect.x && x <= p.rect.x + p.rect.w && y >= p.rect.y && y <= p.rect.y + p.rect.h) ?? null; }

/**
 * Strictly INSIDE a wall — no clearance, no slack. `nearBuilding` is the
 * scatter's "keep away from here" and is deliberately generous (it reaches
 * 30px past the hit box to leave room for the roof that recedes up-right);
 * this is the different, narrower question a validator has to ask, because a
 * lamp beside a door is right and a lamp inside the kitchen is not.
 */
export function insideBuilding(x, y, v = null, inset = 0) { return !!whichBuilding(x, y, v, inset); }

/** Which building's solid box contains this point, or null. For diagnostics. */
export function whichBuilding(x, y, v = null, inset = 0) {
  // `v` is the derived village. WITHOUT it every one of the seven
  // buildings and all ten cottages count, whether or not they are standing —
  // so a barrel beside the Market was "inside" the phantom footprint of a
  // house nobody has built yet, and got shoved forty units into the road.
  // The order board is a forty-unit sign on two posts, not a wall: it was
  // claiming a 56x60 box in the middle of the Hearth's yard and tearing the
  // woodpile in half. It gets the ground its posts actually stand on.
  /* The WALLS, not the tappable area. `hit` is deliberately generous: it
     covers the roof that recedes up-right, the eaves and the crates, because
     a learner aiming a thumb at a building should not have to hit the door.
     Standing under an overhanging roof is normal; standing in the kitchen is
     not. Two thirds of the hit box, measured against the drawn front walls. */
  const inside = (b) => {
    const s = b.solid ?? { w: b.hit.w * 0.7, h: b.hit.h * 0.6 };
    const hw = s.w / 2 - inset, hh = s.h - inset;
    return hw > 0 && hh > 0 && x > b.at.x - hw && x < b.at.x + hw && y > b.at.y - hh && y < b.at.y - inset / 2;
  };
  const standing = (id) => !v || (v.builtIds && v.builtIds.has(id));
  const b = BUILDINGS.find((x2) => standing(x2.id) && inside(x2));
  if (b) return b.id;
  const h = HOUSE_SPOTS.findIndex((s, i) => (!v || i <= (v.houses ?? 0)) && inside({ at: s, hit: { w: 96, h: 76 }, solid: { w: 66, h: 46 } }));
  if (h >= 0) return 'house#' + h;
  if (inside({ at: { x: BOARD.at.x, y: BOARD.at.y }, hit: { w: 34, h: 10 } })) return 'board';
  return null;
}

/**
 * ONE answer to "may something stand here?", for every scatter in scene.js.
 *
 * Each loop used to carry its own list of checks, and the hand-placed trees
 * carried a shorter list than the random ones: they tested paths, buildings
 * and plots but not water. Two of the twenty-four then stood IN the river and
 * the pond — visible from the opening camera, for three releases.
 *
 * Every placement goes through here now, so a rule added once applies
 * everywhere and a new scatter cannot quietly opt out of the river.
 * `tools/check-world.mjs` re-runs these same predicates over the real scene
 * in a real browser and fails the build on any object that broke one.
 *
 * @param {number} x @param {number} y
 * @param {object} pad  how much clearance this kind of thing needs
 * @returns {string|null} the rule it breaks, or null if it may stand here
 */
export function whyNotPlaceable(x, y, {
  path = 22, pond = 30, river = 40, building = 14, bridge = 70, jetty = 60, plots = true,
} = {}) {
  if (path !== false && nearPath(x, y, path)) return 'path';
  if (pond !== false && inPond(x, y, pond)) return 'pond';
  if (river !== false && nearRiver(x, y, river)) return 'river';
  if (building !== false && nearBuilding(x, y, building)) return 'building';
  if (plots && inPlot(x, y)) return 'plot';
  if (bridge !== false && Math.abs(x - BRIDGE.x) < bridge && Math.abs(y - BRIDGE.y) < bridge - 10) return 'bridge';
  if (jetty !== false && Math.abs(x - JETTY.x) < jetty && Math.abs(y - JETTY.y) < jetty - 20) return 'jetty';
  if (inYard(x, y, 4)) return 'yard';
  return null;
}

export function placeable(x, y, pads) { return whyNotPlaceable(x, y, pads) === null; }

/**
 * The invariant, as narrow as it goes: nothing may stand IN the water or
 * INSIDE a wall. Not "keep clear of" — actually in.
 *
 * scene.js enforces it over every object it places, as the last thing it
 * does, and tools/check-world.mjs re-asks it of the scene the renderer is
 * actually drawing. One function, so the gate and the game cannot disagree
 * about what counts.
 */
export function invalidSpot(x, y, v = null) {
  // Decks FIRST: a plank over the river is not the river, and asking about
  // the water before asking about the bridge reported everybody who crossed
  // it as standing in it.
  if (onBridgeDeck(x, y) || onJettyDeck(x, y)) return 'crossing';
  if (inPond(x, y, 0)) return 'pond';
  if (nearRiver(x, y, RIVER_WATER)) return 'river';
  if (insideBuilding(x, y, v)) return 'building';
  if (inYard(x, y, -6)) return 'yard';
  return null;
}

/**
 * The same question asked about a PERSON, an animal or a cat.
 *
 * A flower may not grow on the cobbles of the yard or on the bridge's deck.
 * Walking on both is the entire point of having them. What nobody may do is
 * stand in open water or inside a wall — and that is all this asks.
 */
export function cannotStand(x, y, v = null) {
  if (onBridgeDeck(x, y) || onJettyDeck(x, y)) return null;
  if (inPond(x, y, 0)) return 'pond';
  if (nearRiver(x, y, RIVER_WATER)) return 'river';
  /* Ten units in from the wall. These are oblique sprites drawn on a painted
     world: a figure walking to her own front door has her shoulder over the
     wall line for a frame or two and it reads perfectly well. Standing in the
     middle of somebody's kitchen does not. The margin is the difference
     between a rule that describes the drawing and a rule that fights it —
     and it applies to PEOPLE only; a flower bed one unit inside a wall is
     still a flower bed inside a wall. */
  if (insideBuilding(x, y, v, 10)) return 'building';
  return null;
}

/** The bridge's timber deck, as painted (terrain.js, "The bridge"). */
export function onBridgeDeck(x, y) {
  return Math.abs(x - BRIDGE.x) < BRIDGE.w / 2 + 4 && Math.abs(y - BRIDGE.y) < 25;
}
/** The jetty's planks, as painted. */
export function onJettyDeck(x, y) {
  return x > JETTY.x - JETTY.len && x < JETTY.x && Math.abs(y - JETTY.y) < 12;
}

/* ------------------------------------------------------------------ */
/* Painting                                                            */
/* ------------------------------------------------------------------ */

function strokePath(ctx, pts, width, color) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
}

/**
 * @param {CanvasRenderingContext2D} ctx  a W×H canvas
 * @param {object} atmo   { season }
 * @param {object} v      the village view (which plots are open, levels)
 */
export function paintTerrain(ctx, atmo, v) {
  const W = WORLD.W, H = WORLD.H;
  const season = atmo?.season ?? 'summer';
  const r = rng('terrain');
  const n2 = noise2('village-ground');
  const grass = season === 'autumn' ? mix(PAL.grass, '#C9B85A', 0.28) : season === 'winter' ? mix(PAL.grass, '#DCE4EA', 0.55) : season === 'spring' ? mix(PAL.grass, '#9ED45A', 0.2) : PAL.grass;
  const grassLight = mix(grass, '#FFFFFF', 0.14), grassDark = mix(grass, '#2E6E1F', 0.16);

  /* Ground. */
  ctx.fillStyle = grass; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 110; i += 1) {
    const x = r() * W, y = r() * H, rad = 60 + r() * 150;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const c = i % 3 ? grassLight : grassDark;
    g.addColorStop(0, hexA(c, 0.5)); g.addColorStop(1, hexA(c, 0));
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // The wood's edge: darker ground along the north and the west.
  {
    const g = ctx.createLinearGradient(0, 0, 0, 170);
    g.addColorStop(0, hexA('#2E6E1F', 0.42)); g.addColorStop(1, hexA('#2E6E1F', 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 170);
    const g2 = ctx.createLinearGradient(0, 0, 130, 0);
    g2.addColorStop(0, hexA('#2E6E1F', 0.3)); g2.addColorStop(1, hexA('#2E6E1F', 0));
    ctx.fillStyle = g2; ctx.fillRect(0, 0, 130, H);
  }
  // Fine grain: little grass marks, many, cheap.
  ctx.strokeStyle = hexA(grassDark, 0.55); ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < 1600; i += 1) {
    const x = r() * W, y = r() * H;
    if (n2(x / 90, y / 90) < 0.42) continue;
    ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 2, y - 3 - r() * 3);
  }
  ctx.stroke();
  ctx.strokeStyle = hexA(grassLight, 0.7);
  ctx.beginPath();
  for (let i = 0; i < 1000; i += 1) {
    const x = r() * W, y = r() * H;
    if (n2(x / 70 + 40, y / 70) < 0.55) continue;
    ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 2, y - 3 - r() * 3);
  }
  ctx.stroke();
  // Clover: pale dots in patches.
  ctx.fillStyle = hexA('#F5F7E8', 0.5);
  for (let i = 0; i < 260; i += 1) { const x = r() * W, y = r() * H; if (n2(x / 50 + 90, y / 50 + 30) < 0.62) continue; ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill(); }

  /* Plots: open ones are worked ground; closed ones are pale, fenced by the scene. */
  for (const p of PLOTS) {
    const open = v?.plots?.has(p.id);
    const { x, y, w, h } = p.rect;
    if (open) {
      if (p.id === 'pen' || p.id === 'farm') {
        rr(ctx, x, y, w, h, 18); ctx.fillStyle = hexA(mix(grass, PAL.earth, 0.2), 0.9); ctx.fill();
        if (p.id === 'farm') {
          for (let i = 0; i < 4; i += 1) {
            rr(ctx, x + 18, y + 16 + i * 24, w - 36, 12, 5); ctx.fillStyle = PAL.soil; ctx.fill();
            ctx.strokeStyle = hexA('#000', 0.1); ctx.lineWidth = 1; ctx.stroke();
            for (let k = 0; k < Math.floor((w - 40) / 10); k += 1) { ctx.fillStyle = k % 2 ? PAL.leaf : PAL.leafDark; ctx.beginPath(); ctx.ellipse(x + 24 + k * 10, y + 20 + i * 24, 3.2, 2.2, 0, 0, Math.PI * 2); ctx.fill(); }
          }
        }
      } else if (p.id === 'orchard') {
        rr(ctx, x, y, w, h, 24); ctx.fillStyle = hexA(grassLight, 0.5); ctx.fill();
      } else if (p.id === 'square') {
        cobbles(ctx, x, y, w, h, 14);
      } else if (p.id === 'mill') {
        rr(ctx, x, y, w, h, 18); ctx.fillStyle = hexA(mix(grass, PAL.earth, 0.15), 0.8); ctx.fill();
      }
    } else if (v?.forSale?.has(p.id)) {
      ctx.save();
      ctx.setLineDash([10, 8]);
      rr(ctx, x + 6, y + 6, w - 12, h - 12, 16); ctx.fillStyle = hexA('#FFFFFF', 0.08); ctx.fill();
      ctx.strokeStyle = hexA(PAL.woodDark, 0.45); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  /* Paths: worn earth with a soft edge, and a lighter crown. */
  const roadLit = (v?.levels?.get('road') ?? 0) >= 1;
  for (const p of PATHS) strokePath(ctx, p, 34, hexA(PAL.pathEdge, 0.5));
  for (const p of PATHS) strokePath(ctx, p, 24, PAL.path);
  for (const p of PATHS) strokePath(ctx, p, 9, hexA('#FFFFFF', 0.13));
  strokePath(ctx, PATHS[1], 40, hexA(PAL.pathEdge, 0.5));
  strokePath(ctx, PATHS[1], 30, roadLit ? mix(PAL.path, PAL.stoneLight, 0.35) : PAL.path);
  // The yard in front of the Hearth: cobbles, a little wider.
  { ctx.save(); ctx.beginPath(); ctx.ellipse(HUB.x + 6, HUB.y - 4, 58, 32, 0, 0, Math.PI * 2); ctx.clip(); cobbles(ctx, HUB.x - 60, HUB.y - 40, 132, 72, 0); ctx.restore(); ctx.beginPath(); ctx.ellipse(HUB.x + 6, HUB.y - 4, 58, 32, 0, 0, Math.PI * 2); ctx.strokeStyle = hexA(PAL.pathEdge, 0.6); ctx.lineWidth = 3; ctx.stroke(); }
  // Pebbles.
  ctx.fillStyle = hexA(PAL.stoneLight, 0.55);
  for (let i = 0; i < 320; i += 1) {
    const p = PATHS[Math.floor(r() * PATHS.length)];
    const [x, y] = p[Math.floor(r() * p.length)];
    ctx.beginPath(); ctx.ellipse(x + (r() - 0.5) * 16, y + (r() - 0.5) * 16, 1.6, 1.1, 0, 0, Math.PI * 2); ctx.fill();
  }

  /* The river, with sandy banks and a darker channel. */
  strokePath(ctx, RIVER, 70, hexA(PAL.sand, 0.9));
  strokePath(ctx, RIVER, 62, hexA(mix(PAL.sand, PAL.earth, 0.3), 0.5));
  strokePath(ctx, RIVER, 54, PAL.waterDeep);
  strokePath(ctx, RIVER, 42, PAL.water);
  strokePath(ctx, RIVER, 16, hexA(PAL.waterLight, 0.35));
  ctx.strokeStyle = hexA('#FFFFFF', 0.45); ctx.lineWidth = 1.4;
  for (let i = 0; i < RIVER.length - 1; i += 3) {
    const [x, y] = RIVER[i];
    const dx = (r() - 0.5) * 24;
    ctx.beginPath(); ctx.moveTo(x + dx - 5, y); ctx.quadraticCurveTo(x + dx, y - 2, x + dx + 5, y); ctx.stroke();
  }
  // Stones along the banks.
  ctx.fillStyle = hexA(PAL.stone, 0.7);
  for (let i = 0; i < RIVER.length - 1; i += 2) { const [x, y] = RIVER[i]; const side = r() > 0.5 ? 1 : -1; ctx.beginPath(); ctx.ellipse(x + side * (30 + r() * 4), y + (r() - 0.5) * 8, 3 + r() * 2, 2 + r(), 0, 0, Math.PI * 2); ctx.fill(); }
  // The bridge: stone arches with a timber deck.
  {
    const b = BRIDGE;
    ctx.fillStyle = PAL.stoneDark; rr(ctx, b.x - b.w / 2 - 4, b.y - 20, b.w + 8, 40, 8); ctx.fill();
    ctx.fillStyle = PAL.stone; rr(ctx, b.x - b.w / 2 - 2, b.y - 18, b.w + 4, 36, 7); ctx.fill();
    ctx.fillStyle = PAL.woodLight; rr(ctx, b.x - b.w / 2 + 2, b.y - 13, b.w - 4, 26, 5); ctx.fill();
    ctx.strokeStyle = hexA(PAL.timber, 0.45); ctx.lineWidth = 1.2;
    for (let x = b.x - b.w / 2 + 8; x < b.x + b.w / 2; x += 8) { ctx.beginPath(); ctx.moveTo(x, b.y - 12); ctx.lineTo(x, b.y + 12); ctx.stroke(); }
    ctx.fillStyle = PAL.woodDark; rr(ctx, b.x - b.w / 2, b.y - 21, b.w, 5, 2); ctx.fill(); rr(ctx, b.x - b.w / 2, b.y + 16, b.w, 5, 2); ctx.fill();
    for (let x = b.x - b.w / 2 + 4; x <= b.x + b.w / 2; x += 12) { ctx.fillStyle = PAL.woodDark; rr(ctx, x - 1.5, b.y - 25, 3, 9, 1); ctx.fill(); rr(ctx, x - 1.5, b.y + 16, 3, 9, 1); ctx.fill(); }
  }

  /* The pond, with a shallow rim, lily pads and a jetty. */
  {
    const { cx, cy, rx, ry } = POND;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + 11, ry + 8, 0, 0, Math.PI * 2); ctx.fillStyle = PAL.sand; ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + 4, ry + 3, 0, 0, Math.PI * 2); ctx.fillStyle = hexA(mix(PAL.sand, PAL.water, 0.5), 0.9); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.3, 4, cx, cy, rx);
    g.addColorStop(0, PAL.waterLight); g.addColorStop(0.55, PAL.water); g.addColorStop(1, PAL.waterDeep);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = hexA(PAL.waterDeep, 0.5); ctx.lineWidth = 2; ctx.stroke();
    for (let i = 0; i < 8; i += 1) {
      const a = r() * Math.PI * 2, rad = 0.35 + r() * 0.5;
      const x = cx + Math.cos(a) * rx * rad, y = cy + Math.sin(a) * ry * rad;
      ctx.beginPath(); ctx.ellipse(x, y, 7, 4.5, 0, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(x, y); ctx.closePath(); ctx.fillStyle = PAL.leaf; ctx.fill();
      ctx.strokeStyle = hexA(PAL.leafDark, 0.6); ctx.lineWidth = 0.8; ctx.stroke();
      if (i % 3 === 0) { ctx.beginPath(); ctx.arc(x + 2, y - 2, 2.4, 0, Math.PI * 2); ctx.fillStyle = '#F7C9DF'; ctx.fill(); }
    }
    ctx.strokeStyle = hexA('#FFFFFF', 0.5); ctx.lineWidth = 1.6;
    for (let i = 0; i < 9; i += 1) { const x = cx - rx * 0.6 + r() * rx * 1.2, y = cy - ry * 0.7 + r() * ry * 0.6; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.stroke(); }
    // The jetty: planks out over the water from the east bank.
    const j = JETTY;
    ctx.fillStyle = PAL.woodDark; rr(ctx, j.x - j.len - 2, j.y - 8, j.len + 4, 16, 3); ctx.fill();
    ctx.fillStyle = PAL.woodLight; rr(ctx, j.x - j.len, j.y - 6, j.len, 12, 2); ctx.fill();
    ctx.strokeStyle = hexA(PAL.timber, 0.5); ctx.lineWidth = 1;
    for (let x = j.x - j.len + 6; x < j.x; x += 6) { ctx.beginPath(); ctx.moveTo(x, j.y - 6); ctx.lineTo(x, j.y + 6); ctx.stroke(); }
    ctx.fillStyle = PAL.woodDark; for (const x of [j.x - j.len + 3, j.x - 3]) { rr(ctx, x - 2, j.y - 10, 4, 6, 1); ctx.fill(); rr(ctx, x - 2, j.y + 4, 4, 6, 1); ctx.fill(); }
  }

  /* The last touch: a warm vignette to the south and east edges. */
  {
    const g = ctx.createLinearGradient(0, H - 120, 0, H);
    g.addColorStop(0, hexA('#2E6E1F', 0)); g.addColorStop(1, hexA('#2E6E1F', 0.35));
    ctx.fillStyle = g; ctx.fillRect(0, H - 120, W, 120);
    const g2 = ctx.createLinearGradient(W - 90, 0, W, 0);
    g2.addColorStop(0, hexA('#2E6E1F', 0)); g2.addColorStop(1, hexA('#2E6E1F', 0.3));
    ctx.fillStyle = g2; ctx.fillRect(W - 90, 0, 90, H);
  }
}

/** Cobbles: rounded stones in offset rows, on a pale bed. */
function cobbles(ctx, x, y, w, h, radius) {
  if (radius) { rr(ctx, x, y, w, h, radius); ctx.fillStyle = PAL.cobble; ctx.fill(); } else { ctx.fillStyle = PAL.cobble; ctx.fillRect(x, y, w, h); }
  const r = rng(`cobbles:${x}:${y}`);
  for (let yy = y + 4; yy < y + h - 4; yy += 9) {
    for (let xx = x + 3 + ((yy / 9) % 2 ? 5 : 0); xx < x + w - 6; xx += 11) {
      ctx.beginPath(); ctx.ellipse(xx + 4, yy + 3.5, 4.6 + r() * 0.8, 3.4 + r() * 0.6, 0, 0, Math.PI * 2);
      ctx.fillStyle = hexA(r() > 0.5 ? PAL.stoneLight : PAL.stone, 0.75); ctx.fill();
      ctx.strokeStyle = hexA(PAL.stoneDark, 0.3); ctx.lineWidth = 0.8; ctx.stroke();
    }
  }
}

function rr(ctx, x, y, w, h, rad) {
  const rr2 = Math.min(rad, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + rr2, y); ctx.arcTo(x + w, y, x + w, y + h, rr2); ctx.arcTo(x + w, y + h, x, y + h, rr2); ctx.arcTo(x, y + h, x, y, rr2); ctx.arcTo(x, y, x + w, y, rr2); ctx.closePath();
}
function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export { art };
