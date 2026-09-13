/**
 * terrain.js — the ground of the village: grass with its blotches and
 * tufts, the paths, the river and its banks, the pond, the road out, the
 * plots (fenced ground waiting, or fields once opened), the square's
 * cobbles. Painted once into a cache with path fills and gradients — no
 * per-pixel loops — and blitted every frame.
 *
 * The hour's light is applied by the renderer, so one terrain serves the
 * whole day; only opening land repaints it.
 */

import { rng, noise2, mix } from '../world/engine/palette.js';
import { PAL, art } from './art.js';
import { WORLD, PLOTS, BUILDINGS } from './defs.js';

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

/** The river, north to south down the east side, with a bend at the bridge. */
export const RIVER = smooth([[880, -20], [900, 120], [930, 260], [905, 400], [890, 520], [905, 640], [940, 760], [925, 900], [900, 1040], [920, 1220]]);
export const BRIDGE = { x: 905, y: 640, w: 72 };
export const POND = { cx: 300, cy: 900, rx: 96, ry: 58 };

/** Paths: every building to the square in front of the Hearth, and the road out. */
const HUB = { x: 600, y: 700 };
export const PATHS = [
  [[600, 660], [600, 700], [600, 780], [600, 840]],                              // hearth → market
  [[600, 860], [600, 940], [598, 1040], [600, 1200]],                           // market → the road out
  [[600, 700], [660, 640], [700, 560], [740, 470]],                             // hub → reading house
  [[600, 700], [540, 660], [480, 620], [430, 582]],                             // hub → word garden
  [[430, 582], [430, 500], [450, 420], [468, 362]],                             // garden → root workshop
  [[740, 470], [700, 400], [600, 360], [520, 350], [468, 362]],                 // reading → roots (the north lane)
  [[600, 700], [660, 720], [720, 740], [764, 764]],                             // hub → loom
  [[764, 764], [830, 700], [870, 650], [905, 640]],                             // loom → bridge
  [[430, 582], [380, 640], [330, 720], [300, 810]],                             // garden → pond
  [[905, 640], [960, 640], [1010, 655]],                                        // bridge → farm
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
export function nearBuilding(x, y, pad = 40) {
  return BUILDINGS.some((b) => Math.abs(x - b.at.x) < b.hit.w / 2 + pad && y > b.at.y - b.hit.h - pad && y < b.at.y + pad);
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
  // Big soft blotches so the green is never flat.
  for (let i = 0; i < 90; i += 1) {
    const x = r() * W, y = r() * H, rad = 60 + r() * 140;
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
  for (let i = 0; i < 1400; i += 1) {
    const x = r() * W, y = r() * H;
    if (n2(x / 90, y / 90) < 0.42) continue;
    ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 2, y - 3 - r() * 3);
  }
  ctx.stroke();
  ctx.strokeStyle = hexA(grassLight, 0.7);
  ctx.beginPath();
  for (let i = 0; i < 900; i += 1) {
    const x = r() * W, y = r() * H;
    if (n2(x / 70 + 40, y / 70) < 0.55) continue;
    ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 2, y - 3 - r() * 3);
  }
  ctx.stroke();

  /* Plots: open ones are worked ground; closed ones are pale, fenced by the scene. */
  for (const p of PLOTS) {
    const open = v?.plots?.has(p.id);
    const { x, y, w, h } = p.rect;
    if (open) {
      if (p.id === 'pen' || p.id === 'farm') {
        rr(ctx, x, y, w, h, 18); ctx.fillStyle = hexA(mix(grass, PAL.earth, 0.2), 0.9); ctx.fill();
        if (p.id === 'farm') {
          // Crop rows in the north half.
          for (let i = 0; i < 4; i += 1) {
            rr(ctx, x + 18, y + 16 + i * 24, w - 36, 12, 5); ctx.fillStyle = PAL.soil; ctx.fill();
            ctx.strokeStyle = hexA('#000', 0.1); ctx.lineWidth = 1; ctx.stroke();
            for (let k = 0; k < Math.floor((w - 40) / 10); k += 1) { ctx.fillStyle = k % 2 ? PAL.leaf : PAL.leafDark; ctx.beginPath(); ctx.ellipse(x + 24 + k * 10, y + 20 + i * 24, 3.2, 2.2, 0, 0, Math.PI * 2); ctx.fill(); }
          }
        }
      } else if (p.id === 'orchard') {
        rr(ctx, x, y, w, h, 24); ctx.fillStyle = hexA(grassLight, 0.5); ctx.fill();
      } else if (p.id === 'square') {
        rr(ctx, x, y, w, h, 14); ctx.fillStyle = PAL.stoneLight; ctx.fill();
        ctx.strokeStyle = hexA(PAL.stoneDark, 0.35); ctx.lineWidth = 1;
        for (let yy = y + 10; yy < y + h; yy += 12) for (let xx = x + ((yy / 12) % 2 ? 6 : 0); xx < x + w; xx += 14) { rr(ctx, xx + 1, yy + 1, 12, 10, 3); ctx.stroke(); }
      } else if (p.id === 'mill') {
        rr(ctx, x, y, w, h, 18); ctx.fillStyle = hexA(mix(grass, PAL.earth, 0.15), 0.8); ctx.fill();
      }
    } else {
      if (!v?.forSale?.has(p.id)) continue;
      ctx.save();
      ctx.setLineDash([10, 8]);
      rr(ctx, x + 6, y + 6, w - 12, h - 12, 16); ctx.fillStyle = hexA('#FFFFFF', 0.08); ctx.fill();
      ctx.strokeStyle = hexA(PAL.woodDark, 0.45); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
  }

  /* Paths: worn earth with a soft edge. */
  const roadLit = (v?.levels?.get('road') ?? 0) >= 1;
  for (const p of PATHS) strokePath(ctx, p, 30, hexA(PAL.pathEdge, 0.55));
  for (const p of PATHS) strokePath(ctx, p, 22, PAL.path);
  for (const p of PATHS) strokePath(ctx, p, 8, hexA('#FFFFFF', 0.12));
  // The road out is wider and paler, and lit later.
  strokePath(ctx, PATHS[1], 36, hexA(PAL.pathEdge, 0.5));
  strokePath(ctx, PATHS[1], 28, roadLit ? mix(PAL.path, PAL.stoneLight, 0.35) : PAL.path);
  // The yard in front of the Hearth: trodden earth, a little wider.
  { const g = ctx.createRadialGradient(600, 690, 10, 600, 690, 70); g.addColorStop(0, hexA(PAL.path, 0.9)); g.addColorStop(1, hexA(PAL.path, 0)); ctx.fillStyle = g; ctx.fillRect(520, 620, 160, 140); }
  // Pebbles.
  ctx.fillStyle = hexA(PAL.stoneLight, 0.55);
  for (let i = 0; i < 260; i += 1) {
    const p = PATHS[Math.floor(r() * PATHS.length)];
    const [x, y] = p[Math.floor(r() * p.length)];
    ctx.beginPath(); ctx.ellipse(x + (r() - 0.5) * 16, y + (r() - 0.5) * 16, 1.6, 1.1, 0, 0, Math.PI * 2); ctx.fill();
  }

  /* The river. */
  strokePath(ctx, RIVER, 64, hexA(PAL.sand, 0.9));
  strokePath(ctx, RIVER, 52, PAL.waterDeep);
  strokePath(ctx, RIVER, 40, PAL.water);
  strokePath(ctx, RIVER, 14, hexA(PAL.waterLight, 0.35));
  // Ripples.
  ctx.strokeStyle = hexA('#FFFFFF', 0.45); ctx.lineWidth = 1.4;
  for (let i = 0; i < RIVER.length - 1; i += 3) {
    const [x, y] = RIVER[i];
    const dx = (r() - 0.5) * 24;
    ctx.beginPath(); ctx.moveTo(x + dx - 5, y); ctx.quadraticCurveTo(x + dx, y - 2, x + dx + 5, y); ctx.stroke();
  }
  // The bridge.
  {
    const b = BRIDGE;
    ctx.fillStyle = PAL.woodDark; rr(ctx, b.x - b.w / 2, b.y - 16, b.w, 32, 6); ctx.fill();
    ctx.fillStyle = PAL.woodLight; rr(ctx, b.x - b.w / 2 + 2, b.y - 13, b.w - 4, 26, 5); ctx.fill();
    ctx.strokeStyle = hexA(PAL.timber, 0.45); ctx.lineWidth = 1.2;
    for (let x = b.x - b.w / 2 + 8; x < b.x + b.w / 2; x += 8) { ctx.beginPath(); ctx.moveTo(x, b.y - 12); ctx.lineTo(x, b.y + 12); ctx.stroke(); }
    ctx.fillStyle = PAL.woodDark; rr(ctx, b.x - b.w / 2, b.y - 20, b.w, 4, 2); ctx.fill(); rr(ctx, b.x - b.w / 2, b.y + 16, b.w, 4, 2); ctx.fill();
  }

  /* The pond. */
  {
    const { cx, cy, rx, ry } = POND;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx + 9, ry + 7, 0, 0, Math.PI * 2); ctx.fillStyle = PAL.sand; ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.3, 4, cx, cy, rx);
    g.addColorStop(0, PAL.waterLight); g.addColorStop(0.55, PAL.water); g.addColorStop(1, PAL.waterDeep);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = hexA(PAL.waterDeep, 0.5); ctx.lineWidth = 2; ctx.stroke();
    // Lily pads.
    for (let i = 0; i < 7; i += 1) {
      const a = r() * Math.PI * 2, rad = 0.35 + r() * 0.5;
      const x = cx + Math.cos(a) * rx * rad, y = cy + Math.sin(a) * ry * rad;
      ctx.beginPath(); ctx.ellipse(x, y, 6, 4, 0, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(x, y); ctx.closePath(); ctx.fillStyle = PAL.leaf; ctx.fill();
      if (i % 3 === 0) { ctx.beginPath(); ctx.arc(x + 2, y - 2, 2.2, 0, Math.PI * 2); ctx.fillStyle = '#F7C9DF'; ctx.fill(); }
    }
    // Reeds are scene objects; the sheen is here.
    ctx.strokeStyle = hexA('#FFFFFF', 0.5); ctx.lineWidth = 1.6;
    for (let i = 0; i < 9; i += 1) { const x = cx - rx * 0.6 + r() * rx * 1.2, y = cy - ry * 0.7 + r() * ry * 0.6; ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y); ctx.stroke(); }
  }

  /* The Hearth's flower border and the garden beds' ground are scene objects; the last touch is a warm vignette to the south edge. */
  {
    const g = ctx.createLinearGradient(0, H - 120, 0, H);
    g.addColorStop(0, hexA('#2E6E1F', 0)); g.addColorStop(1, hexA('#2E6E1F', 0.35));
    ctx.fillStyle = g; ctx.fillRect(0, H - 120, W, 120);
    const g2 = ctx.createLinearGradient(W - 90, 0, W, 0);
    g2.addColorStop(0, hexA('#2E6E1F', 0)); g2.addColorStop(1, hexA('#2E6E1F', 0.3));
    ctx.fillStyle = g2; ctx.fillRect(W - 90, 0, 90, H);
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
