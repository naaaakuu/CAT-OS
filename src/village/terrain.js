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
export const BRIDGE = { x: 905, y: 640, w: 76 };
export const POND = { cx: 300, cy: 900, rx: 98, ry: 60 };
export const JETTY = { x: 372, y: 878, len: 40 };

/** The yard in front of the Hearth: where every path meets. */
export const HUB = { x: 600, y: 705 };

/** Paths: every building to the yard, the road out, the pond, the bridge. */
export const PATHS = [
  [[600, 674], [600, 705], [600, 780], [600, 850], [600, 895]],                  // hearth → market
  [[600, 905], [600, 1000], [598, 1080], [600, 1200]],                           // market → the road out
  [[600, 705], [680, 640], [740, 560], [790, 484]],                              // yard → reading house
  [[600, 705], [520, 660], [450, 610], [400, 574]],                              // yard → word garden
  [[400, 574], [410, 470], [440, 400], [470, 344]],                              // garden → root workshop
  [[790, 484], [720, 400], [600, 360], [520, 344], [470, 344]],                  // reading → roots (the north lane)
  [[600, 705], [680, 730], [750, 770], [800, 804]],                              // yard → loom
  [[800, 804], [850, 730], [880, 680], [905, 640]],                              // loom → bridge
  [[400, 574], [380, 660], [400, 760], [410, 814]],                              // garden → Mira's cottage
  [[410, 814], [370, 860], [372, 878]],                                          // Mira → the jetty
  [[410, 814], [500, 860], [560, 896]],                                          // Mira → the market
  [[905, 640], [960, 640], [1010, 474]],                                         // bridge → across the water
  [[905, 640], [960, 660], [1010, 700]],                                         // bridge → the farm
  [[600, 705], [660, 690], [690, 676]],                                          // yard → the order board
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
