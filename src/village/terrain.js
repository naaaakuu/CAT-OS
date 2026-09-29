/**
 * terrain.js — the ground of the village and the rules of where things may
 * stand. The ground itself is plain: matte grass in the art pack's greens,
 * a worn trail under every path, worked soil on the farm, a dashed line
 * round land for sale. Everything with a shape — the stepping stones, the
 * pond, the trees — is a sprite from the pack, placed by scene.js.
 *
 * The hour's light is applied by the renderer, so one terrain serves the
 * whole day; only opening land repaints it.
 */

import { rng, mix } from '../world/engine/palette.js';
import { PAL } from './art.js';
import { WORLD, PLOTS, BUILDINGS, HOUSE_SPOTS, BOARD } from './defs.js';

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** The pond, south-west of the yard: the pack's pond drawn at POND_SCALE.
 *  rx/ry are its water and stone rim, measured off the sprite. */
export const POND_SCALE = 2.2;
export const POND = { cx: 300, cy: 900, rx: 104, ry: 44 };

/** The yard in front of the Hearth: where every path meets. */
export const HUB = { x: 600, y: 705 };
/** The yard's stones — a hard surface, so nothing grows on it. The
 *  ellipse matches the one paintTerrain draws (see 'The yard in front of the
 *  Hearth' below); flowers were coming up through the paving stones. */
export const YARD = { cx: HUB.x + 6, cy: HUB.y - 4, rx: 58, ry: 32 };
export function inYard(x, y, pad = 0) {
  return ((x - YARD.cx) ** 2) / ((YARD.rx + pad) ** 2) + ((y - YARD.cy) ** 2) / ((YARD.ry + pad) ** 2) <= 1;
}

/** Paths: every building to the yard, the road out, the pond, the east fields. */
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
  [[800, 812], [866, 782], [872, 706], [868, 650], [905, 640]],                  // loom → the stile
  [[400, 574], [372, 660], [360, 752], [376, 808], [410, 814]],                  // garden → Mira's cottage
  [[410, 814], [398, 856], [400, 872]],                                          // Mira → the pond's edge
  [[410, 814], [500, 862], [556, 900], [600, 930]],                              // Mira → the crossroad
  [[905, 640], [960, 640], [1010, 474]],                                         // the stile → the east cottages
  [[905, 640], [960, 660], [1010, 700]],                                         // the stile → the farm
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

/* THE HOTTEST FUNCTION IN THE VILLAGE.
   The end-of-build placement sweep asks every one of ~284 props whether it
   is standing on a path, in the pond or inside a wall, and a
   profile of the rebuild put HALF of its 47ms in here. Two reasons, both
   avoidable: Math.hypot is several times slower than the multiply it stands
   for, and every call walked every segment of a polyline the prop was four
   hundred units away from.

   So: squared distances in the loop (one sqrt at the end), and a cached
   bounding box per polyline so a point that cannot possibly be within
   that limit is rejected by four comparisons. The answer is identical; the
   sweep is not. */
const BOXES = new WeakMap();
function boxOf(pts) {
  let box = BOXES.get(pts);
  if (box) return box;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  box = { x0, y0, x1, y1 };
  BOXES.set(pts, box);
  return box;
}

/**
 * @param {number} limit when given, a point further than this from the
 *        polyline's bounding box returns Infinity without walking it. Pass
 *        the pad you were about to compare against; never pass one you were
 *        not, or a caller reading the number itself gets Infinity.
 */
export function distToPolyline(px, py, pts, limit = Infinity) {
  if (limit !== Infinity) {
    const b = boxOf(pts);
    if (px < b.x0 - limit || px > b.x1 + limit || py < b.y0 - limit || py > b.y1 + limit) return Infinity;
  }
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const dx = x2 - x1, dy = y2 - y1;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
    const ex = px - (x1 + t * dx), ey = py - (y1 + t * dy);
    const d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}
export function nearPath(x, y, pad = 18) { return PATHS.some((p) => distToPolyline(x, y, p, pad) < pad); }
export function inPond(x, y, pad = 0) { return ((x - POND.cx) ** 2) / ((POND.rx + pad) ** 2) + ((y - POND.cy) ** 2) / ((POND.ry + pad) ** 2) <= 1; }
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
 * carried a shorter list than the random ones, so two of them stood in the
 * water for three releases. Every placement goes through here now, so a rule
 * added once applies everywhere.
 * `tools/check-world.mjs` re-runs these same predicates over the real scene
 * in a real browser and fails the build on any object that broke one.
 *
 * @param {number} x @param {number} y
 * @param {object} pad  how much clearance this kind of thing needs
 * @returns {string|null} the rule it breaks, or null if it may stand here
 */
export function whyNotPlaceable(x, y, {
  path = 22, pond = 30, building = 14, plots = true,
} = {}) {
  if (path !== false && nearPath(x, y, path)) return 'path';
  if (pond !== false && inPond(x, y, pond)) return 'pond';
  if (building !== false && nearBuilding(x, y, building)) return 'building';
  if (plots && inPlot(x, y)) return 'plot';
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
  if (inPond(x, y, 0)) return 'pond';
  if (insideBuilding(x, y, v)) return 'building';
  if (inYard(x, y, -6)) return 'yard';
  return null;
}

/**
 * The same question asked about a PERSON, an animal or a cat.
 *
 * A flower may not grow on the stones of the yard; walking on them is the
 * point of having them. What nobody may do is stand in open water or inside
 * a wall — and that is all this asks.
 */
export function cannotStand(x, y, v = null) {
  if (inPond(x, y, 0)) return 'pond';
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

/* ------------------------------------------------------------------ */
/* Painting                                                            */
/* ------------------------------------------------------------------ */

function strokePath(ctx, pts, width, color) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
}

/** The grass for a season, from the pack's greens. */
export function grassFor(season) {
  return season === 'autumn' ? mix(PAL.grass, PAL.petal, 0.3) : season === 'winter' ? mix(PAL.grass, PAL.cream, 0.5) : season === 'spring' ? mix(PAL.grass, PAL.leafLight, 0.25) : PAL.grass;
}

/**
 * @param {CanvasRenderingContext2D} ctx  a W×H canvas
 * @param {object} atmo   { season }
 * @param {object} v      the village view (which plots are open, levels)
 */
export function paintTerrain(ctx, atmo, v) {
  const W = WORLD.W, H = WORLD.H;
  const r = rng('terrain');
  const grass = grassFor(atmo?.season ?? 'summer');

  /* Matte ground: the base green and a few broad, quiet patches — the pack's
     models are lit flat and soft, and a busy ground fights them. */
  ctx.fillStyle = grass; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 46; i += 1) {
    const x = r() * W, y = r() * H, rad = 90 + r() * 160;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const c = i % 3 === 0 ? PAL.sage : i % 3 === 1 ? PAL.leafLight : PAL.leaf;
    g.addColorStop(0, hexA(c, 0.28)); g.addColorStop(1, hexA(c, 0));
    ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // The wood's edge: a deeper green round the rim of the map.
  for (const [x0, y0, x1, y1] of [[0, 0, 0, 150], [0, H, 0, H - 120], [0, 0, 120, 0], [W, 0, W - 120, 0]]) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, hexA(PAL.fern, 0.34)); g.addColorStop(1, hexA(PAL.fern, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* Plots: open ones are worked ground; land for sale is marked out. */
  for (const p of PLOTS) {
    const open = v?.plots?.has(p.id);
    const { x, y, w, h } = p.rect;
    if (open) {
      if (p.id === 'farm') {
        rr(ctx, x + 10, y + 10, w - 20, h - 20, 14); ctx.fillStyle = hexA(PAL.soil, 0.35); ctx.fill();
        for (let i = 0; i < 5; i += 1) { rr(ctx, x + 22, y + 26 + i * 34, w - 44, 14, 6); ctx.fillStyle = hexA(PAL.soil, 0.75); ctx.fill(); }
      } else if (p.id === 'pen') {
        rr(ctx, x + 8, y + 8, w - 16, h - 16, 16); ctx.fillStyle = hexA(PAL.leafLight, 0.35); ctx.fill();
      } else if (p.id === 'square') {
        rr(ctx, x, y, w, h, 18); ctx.fillStyle = hexA(PAL.path, 0.55); ctx.fill();
      }
    } else if (v?.forSale?.has(p.id)) {
      ctx.save();
      ctx.setLineDash([10, 8]);
      rr(ctx, x + 6, y + 6, w - 12, h - 12, 16); ctx.fillStyle = hexA(PAL.cream, 0.1); ctx.fill();
      ctx.strokeStyle = hexA(PAL.woodDark, 0.4); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  /* The yards: trodden ground under every open-air workplace that stands,
     with beds dug in the Word Garden, so each reads as a place. */
  for (const b of BUILDINGS) {
    if (!b.yard || !v?.builtIds?.has(b.id)) continue;
    const w = b.hit.w + 24, h = b.hit.h + 10;
    rr(ctx, b.at.x - w / 2, b.at.y - h + 14, w, h, 26); ctx.fillStyle = hexA(PAL.path, 0.4); ctx.fill();
    if (b.id === 'garden') for (let i = 0; i < 2; i += 1) { rr(ctx, b.at.x - 56, b.at.y - 62 + i * 28, 112, 14, 6); ctx.fillStyle = hexA(PAL.soil, 0.45); ctx.fill(); }
  }

  /* Paths: a soft worn trail. The stepping stones on it are sprites. */
  for (const p of PATHS) strokePath(ctx, p, 26, hexA(PAL.path, 0.28));
  for (const p of PATHS) strokePath(ctx, p, 14, hexA(PAL.path, 0.3));
  strokePath(ctx, PATHS[1], 30, hexA(PAL.path, (v?.levels?.get('road') ?? 0) >= 1 ? 0.5 : 0.3));
  // The yard in front of the Hearth.
  ctx.beginPath(); ctx.ellipse(YARD.cx, YARD.cy, YARD.rx + 6, YARD.ry + 4, 0, 0, Math.PI * 2); ctx.fillStyle = hexA(PAL.path, 0.5); ctx.fill();
  // The pond's damp ground.
  ctx.beginPath(); ctx.ellipse(POND.cx, POND.cy + 4, POND.rx + 18, POND.ry + 14, 0, 0, Math.PI * 2); ctx.fillStyle = hexA(PAL.leaf, 0.35); ctx.fill();
}

/**
 * Where the stepping stones go: along every path at an even stride, and
 * across the yard in rings. Pure data, so scene.js can place them as
 * sprites (crisp at every zoom) and the gates can count them.
 */
export function steppingStones() {
  const out = [];
  const seen = [];
  const near = (x, y, d) => seen.some(([a, b]) => (a - x) ** 2 + (b - y) ** 2 < d * d);
  PATHS.forEach((p, pi) => {
    const stride = pi <= 1 ? 24 : 28;
    let carry = 0, k = 0;
    for (let i = 0; i < p.length - 1; i += 1) {
      const [x1, y1] = p[i], [x2, y2] = p[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      let t = carry;
      while (t < len) {
        const f = t / len, x = x1 + (x2 - x1) * f, y = y1 + (y2 - y1) * f;
        // A little sideways wander, like stones set by hand.
        const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1), w = (k % 2 ? 3 : -3);
        const sx = x + nx * w, sy = y + ny * w;
        if (sy > -10 && sy < WORLD.H + 10 && !near(sx, sy, stride * 0.7)) { out.push([sx, sy]); seen.push([sx, sy]); }
        t += stride; k += 1;
      }
      carry = t - len;
    }
  });
  for (let ring = 0; ring < 3; ring += 1) {
    const n = 4 + ring * 4;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + ring * 0.3;
      const x = YARD.cx + Math.cos(a) * ring * 24, y = YARD.cy + Math.sin(a) * ring * 13;
      if (!near(x, y, 16)) { out.push([x, y]); seen.push([x, y]); }
    }
  }
  return out;
}

function rr(ctx, x, y, w, h, rad) {
  const rr2 = Math.min(rad, w / 2, h / 2);
  ctx.beginPath(); ctx.moveTo(x + rr2, y); ctx.arcTo(x + w, y, x + w, y + h, rr2); ctx.arcTo(x + w, y + h, x, y + h, rr2); ctx.arcTo(x, y + h, x, y, rr2); ctx.arcTo(x, y, x + w, y, rr2); ctx.closePath();
}
function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
