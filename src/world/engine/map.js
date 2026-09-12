/**
 * map.js — the valley itself: the terrain painter and the world scene.
 *
 * `paintTerrain` draws everything that never moves — sky, mountains, the
 * ground and its grain, the river and pond, paths, terraces, flower
 * fields, the small ground cover — once per hour/season change into the
 * renderer's terrain cache. `buildWorldScene` returns the Scene object the
 * renderer drives: the depth-sorted living objects (trees, buildings,
 * creatures, particles), the lights, and the hour's tint. Everything the
 * scene shows is a pure function of the world state it is given, so the
 * valley visibly remembers what the learner has learned.
 */

import { noise2, rng, ramp, mix, SKY, SEASON, PIGMENT, LIGHT } from './palette.js';
import { sprite, Pix } from './sprites.js';
import { particles, smoke, birds, butterflies, koi, hearthCat, clouds, waterGlints, walker, grazers, ducks } from './life.js';
import { WORLD_W, WORLD_H, REGIONS, GROVE_SPOTS, LANTERN_SPOTS, regionAt } from '../regions.js';

/* ------------------------------------------------------------------ */
/* Geometry shared by the painter and the scene                        */
/* ------------------------------------------------------------------ */

export const POND = { cx: 338, cy: 390, rx: 74, ry: 41 };

/**
 * The pond's shoreline is not an ellipse. `pondR(angle)` returns how far
 * the water reaches at that bearing — a slow wobble with one real bay on
 * the west shore, so the bank has somewhere to put a beach and a dock.
 * Everything that asks "is this water?" goes through here, so the water,
 * the shallows, the sand, the grass and the props all agree.
 */
export function pondR(a) {
  const w = 1
    + 0.105 * Math.sin(a * 2 + 0.6)
    + 0.07 * Math.sin(a * 3 - 1.2)
    + 0.045 * Math.sin(a * 5 + 2.1)
    + 0.022 * Math.sin(a * 8 - 0.4);
  // A bay on the west-south-west shore (the side the path arrives on).
  const d = ((a - Math.PI * 0.92) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  const bay = Math.exp(-(d * d) / 0.18);
  // …and a narrow inlet on the north-east shore where the river comes in.
  const d2 = ((a + Math.PI * 0.42) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  const inlet = Math.exp(-(d2 * d2) / 0.05);
  return w - 0.2 * bay + 0.1 * inlet;
}

/** Fill the pond's true outline into a mask context, scaled by `k`. */
function fillPond(m, k = 1, dx = 0, dy = 0) {
  m.beginPath();
  const N = 96;
  for (let i = 0; i <= N; i += 1) {
    const a = (i / N) * Math.PI * 2;
    const r = pondR(a) * k;
    const x = POND.cx + dx + Math.cos(a) * POND.rx * r;
    const y = POND.cy + dy + Math.sin(a) * POND.ry * r;
    if (i === 0) m.moveTo(x, y); else m.lineTo(x, y);
  }
  m.closePath();
  m.fill();
}
const RIVER = smooth([[398, 186], [386, 230], [370, 288], [356, 338], [340, 360], [348, 424], [364, 470], [350, 520], [334, 570], [352, 620], [340, 672], [346, 720]]);

/** Catmull-Rom subdivision so a hand-placed polyline flows like water. */
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
const PATHS = [
  [[214, 578], [214, 600], [260, 632], [330, 640], [400, 636], [430, 584]],          // hearth → loom
  [[430, 584], [480, 608], [516, 620], [560, 590], [594, 556]],                        // quarter
  [[214, 578], [180, 560], [150, 520], [140, 480], [150, 446]],                        // hearth → meadow
  [[150, 446], [200, 420], [270, 400], [296, 392]],                                    // meadow → pond west bank
  [[384, 392], [420, 400], [470, 416], [516, 422]],                                    // pond east bank → reading room
  [[214, 578], [230, 540], [240, 500], [236, 440], [220, 380], [190, 340], [160, 312]], // hearth → rootwood
  [[516, 422], [536, 380], [548, 330], [540, 300]],                                    // reading room → terraces
  [[214, 578], [180, 590], [150, 596], [120, 590], [96, 610]],                         // hearth → thicket
  [[330, 640], [336, 660], [340, 690], [340, 720]],                                    // road out
].map((p) => smooth(p, 4));
const BRIDGE = { x: 340, y: 452, w: 26 };
const BRIDGE_N = { x: 372, y: 300, w: 22 };

/**
 * A raster the terrain painter writes into pixel by pixel, flushed to the
 * canvas once: hundreds of thousands of fillRect calls become one
 * putImageData. Colours are hex strings, parsed once and cached.
 */
class Raster {
  constructor(W, H) { this.W = W; this.H = H; this.img = new ImageData(W, H); this.d = this.img.data; this.cache = new Map(); }
  rgb(hex) { let v = this.cache.get(hex); if (!v) { const n = parseInt(hex.slice(1), 16); v = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; this.cache.set(hex, v); } return v; }
  set(x, y, hex) { if (x < 0 || y < 0 || x >= this.W || y >= this.H) return; const i = (y * this.W + x) * 4, c = this.rgb(hex); this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255; }
  rect(x, y, w, h, hex) { for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) this.set(x + i, y + j, hex); }
  flush(ctx) { ctx.putImageData(this.img, 0, 0); }
}

/** Point-in-ellipse test. */
const inPond = (x, y, pad = 0) => {
  const dx = x - POND.cx, dy = y - POND.cy;
  const a = Math.atan2(dy, dx);
  const r = pondR(a);
  return (dx * dx) / ((POND.rx * r + pad) ** 2) + (dy * dy) / ((POND.ry * r + pad) ** 2) <= 1;
};

function distToPolyline(px, py, pts) {
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

/**
 * Rasterise strokes into a hard-edged mask (Uint8Array, 1 = inside) by
 * drawing with the canvas API and thresholding the alpha — hundreds of
 * times cheaper than testing every pixel against every segment.
 */
function strokeMask(W, H, draw) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const m = c.getContext('2d');
  m.fillStyle = '#000'; m.strokeStyle = '#000'; m.lineCap = 'round'; m.lineJoin = 'round';
  draw(m);
  const d = m.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H);
  for (let i = 0; i < out.length; i += 1) out[i] = d[i * 4 + 3] > 127 ? 1 : 0;
  return out;
}
function strokePolyline(m, pts, width) {
  m.lineWidth = width;
  m.beginPath();
  pts.forEach(([x, y], i) => (i ? m.lineTo(x, y) : m.moveTo(x, y)));
  m.stroke();
}
/** A river whose width follows its y — stroked segment by segment. */
function strokeRiver(m, pts, widthAt) {
  for (let i = 0; i < pts.length - 1; i += 1) {
    m.lineWidth = widthAt((pts[i][1] + pts[i + 1][1]) / 2);
    m.beginPath(); m.moveTo(pts[i][0], pts[i][1]); m.lineTo(pts[i + 1][0], pts[i + 1][1]); m.stroke();
  }
}
function fillEllipse(m, cx, cy, rx, ry) { m.beginPath(); m.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2); m.fill(); }

/** River half-width at a given y: wider as it nears the pond, narrow in the hills. */
function riverHalfWidth(y) { return y < 250 ? 3 : y < 340 ? 4 : y > 470 ? 5 : 4; }

/* ------------------------------------------------------------------ */
/* The terrain                                                         */
/* ------------------------------------------------------------------ */

/**
 * @param {CanvasRenderingContext2D} ctx  the terrain cache (WORLD_W × WORLD_H)
 * @param {object} atmo   { hour, season, weather }
 * @param {object} state  world state (see state.js) — only its static parts are used
 */
export function paintTerrain(ctx, atmo, state) {
  const { hour, season } = atmo;
  const W = WORLD_W, H = WORLD_H;
  const ras = new Raster(W, H);
  const px = (x, y, c) => ras.set(x, y, c);
  const rect = (x, y, w, h, c) => ras.rect(x, y, w, h, c);
  const after = []; // sprite draws, made after the raster is flushed
  const n = noise2('valley');
  const n2 = noise2('valley-grain');
  const seasonPal = SEASON[season] ?? SEASON.summer;
  const grass = ramp(seasonPal.grass);
  const meadowC = ramp(seasonPal.meadow);
  const isWinter = season === 'winter';

  /* ---- Sky: a three-stop gradient, dithered so it bands like paint ---- */
  const sky = SKY[hour] ?? SKY.morning;
  const HORIZON = 196;
  for (let y = 0; y < HORIZON; y += 1) {
    const t = y / HORIZON;
    const c = t < 0.55 ? mix(sky[0], sky[1], t / 0.55) : mix(sky[1], sky[2], (t - 0.55) / 0.45);
    rect(0, y, W, 1, c);
  }
  // Stars (night and dusk): a fixed constellation, brighter higher up.
  if (hour === 'night' || hour === 'dusk' || hour === 'dawn') {
    const r = rng('stars');
    const strength = LIGHT[hour].stars;
    for (let i = 0; i < 140; i += 1) {
      const x = Math.floor(r() * W), y = Math.floor(r() * 150), b = r();
      if (b > strength) continue;
      px(x, y, b > 0.8 ? '#FFFFFF' : '#DDE6FF');
      if (b > 0.94) { px(x - 1, y, '#AEBDF0'); px(x + 1, y, '#AEBDF0'); px(x, y - 1, '#AEBDF0'); px(x, y + 1, '#AEBDF0'); }
    }
  }
  // Sun or moon.
  if (hour === 'night') {
    const mx = 500, my = 46;
    drawDisc(ras, mx, my, 9, '#F3F1E4'); drawDisc(ras, mx - 4, my - 2, 8, sky[0]);
    px(mx + 3, my + 4, '#DDD9C4'); px(mx + 5, my - 1, '#DDD9C4');
  } else if (hour === 'dawn' || hour === 'dusk') {
    const sx = hour === 'dawn' ? 120 : 520, sy = 150;
    drawDisc(ras, sx, sy, 12, hour === 'dawn' ? '#FFE9B8' : '#FFC46A');
    drawDisc(ras, sx, sy, 9, '#FFF6DE');
  } else {
    drawDisc(ras, 540, 40, 8, '#FFF8D6'); drawDisc(ras, 540, 40, 5, '#FFFFFF');
  }

  /* ---- Mountains: two ranges with snow, then a hill band ---- */
  const farC = ramp(hour === 'night' ? '#2C3A64' : hour === 'dusk' ? '#6B5B8F' : hour === 'dawn' ? '#8E82B0' : PIGMENT.mountainFar);
  const nearC = ramp(hour === 'night' ? '#1E2A4E' : hour === 'dusk' ? '#4E4374' : hour === 'dawn' ? '#6E6A98' : PIGMENT.mountain);
  const farSnow = mix(PIGMENT.mountainSnow, farC.light, isWinter ? 0.1 : 0.5);
  for (let x = 0; x < W; x += 1) {
    const far = 128 - Math.floor(n(x / 90, 3) * 46 + n(x / 22, 9) * 10);
    for (let y = far; y < HORIZON; y += 1) px(x, y, y < far + 4 && !isWinter ? farC.light : farC.base);
    if (isWinter || hour !== 'night') for (let y = far; y < far + (isWinter ? 12 : 5); y += 1) if (n(x / 7, 5) > 0.42) px(x, y, mix(PIGMENT.mountainSnow, farC.light, isWinter ? 0.1 : 0.5));
  }
  for (let x = 0; x < W; x += 1) {
    const near = 158 - Math.floor(n(x / 60 + 7, 11) * 40 + n(x / 15 + 3, 2) * 8);
    const litSide = n(x / 40, 20) > 0.5;
    for (let y = near; y < HORIZON + 4; y += 1) px(x, y, litSide && y < near + 10 ? nearC.light : y > near + 26 ? nearC.shade : nearC.base);
    const snowLine = near + (isWinter ? 14 : 4);
    for (let y = near; y < snowLine; y += 1) if (n(x / 5 + 1, 8) > 0.38) px(x, y, PIGMENT.mountainSnow);
  }

  /* ---- Ground: rolling grass with grain, cooler and paler to the north ---- */
  const grassSoftShade = mix(grass.base, grass.shade, 0.55), grassSoftLight = mix(grass.base, grass.light, 0.6);
  for (let y = HORIZON - 12; y < H; y += 1) {
    const north = Math.max(0, (260 - y) / 90);
    const rowShade = north > 0 ? mix(grassSoftShade, '#B9D6C3', north * 0.55) : grassSoftShade;
    const rowLight = north > 0 ? mix(grassSoftLight, '#B9D6C3', north * 0.55) : grassSoftLight;
    const rowBase = north > 0 ? mix(grass.base, '#B9D6C3', north * 0.55) : grass.base;
    const rowTip = north > 0 ? mix(grass.light, '#B9D6C3', north * 0.55) : grass.light;
    for (let x = 0; x < W; x += 1) {
      const g = n2(x / 18, y / 18) * 0.7 + n2(x / 60, y / 60) * 0.3;
      let c = g < 0.4 ? rowShade : g > 0.66 ? rowLight : rowBase;
      if (((x * 7 + y * 13) % 29) === 0 && g > 0.5) c = rowTip; // a sparse leaf-tip sparkle
      px(x, y, c);
    }
  }
  // The valley's hill line: a soft pale edge where the ground meets the mountains.
  for (let x = 0; x < W; x += 1) { const y = HORIZON - 12 + Math.floor(n(x / 30, 40) * 10); rect(x, y - 2, 1, 3, mix(grass.light, '#DCE9DF', 0.5)); }

  /* ---- Region grounds ---- */
  // Rootwood floor: darker, mossy.
  const rwA = mix(grass.shade, '#3E6B4B', 0.4), rwB = mix(grass.base, '#3E6B4B', 0.3);
  fillRegionGround(ras, 24, 150, 292, 184, (x, y) => (n2(x / 22, y / 22) > 0.52 ? rwA : rwB), n2, 'rootwood');
  // Meadow: pale and flowery.
  const mdA = mix(meadowC.light, meadowC.base, 0.4);
  fillRegionGround(ras, 26, 350, 246, 122, (x, y) => (n2(x / 20, y / 20) > 0.58 ? mdA : meadowC.base), n2, 'meadow');
  // Reading Room hill: a raised, lighter mound with a stone crown.
  const hillCrown = mix(grass.base, PIGMENT.stoneWarm, 0.3), hillA = mix(grass.base, grass.light, 0.3), hillB = mix(grass.base, grass.light, 0.15);
  for (let y = 322; y < 452; y += 1) for (let x = 448; x < 606; x += 1) {
    const d = ((x - 524) ** 2) / (72 ** 2) + ((y - 402) ** 2) / (46 ** 2);
    if (d < 1 && n2(x / 9, y / 9) > 0.3) px(x, y, d < 0.3 ? hillCrown : d < 0.6 ? hillA : hillB);
    if (d > 0.9 && d < 1 && n2(x / 5, y / 5) > 0.5) px(x, y, grassSoftShade);
  }
  // Thicket floor: dark and tangled.
  const thA = mix(grass.shade, PIGMENT.bramble, 0.45), thB = mix(grass.base, PIGMENT.bramble, 0.3);
  fillRegionGround(ras, 14, 500, 132, 162, (x, y) => (n2(x / 18, y / 18) > 0.5 ? thA : thB), n2, 'thicket');
  // Terraces: stepped bands of warm stone on the north-east hill.
  const terraceLevel = state?.terraces?.level ?? 0;
  const terr = ramp(PIGMENT.terrace), terrA = mix(grass.base, PIGMENT.terrace, 0.55), terrB = mix(grass.light, PIGMENT.terrace, 0.45);
  for (let i = 0; i < 4; i += 1) {
    const y0 = 192 + i * 28, x0 = 440 + i * 6, w = 180 - i * 12;
    for (let y = y0; y < y0 + 28; y += 1) for (let x = x0; x < x0 + w; x += 1) {
      const edge = x - x0 < 2 || x0 + w - x < 3;
      px(x, y, y - y0 < 3 ? terr.light : edge ? terr.shade : n2(x / 7, y / 7) > 0.5 ? terrA : terrB);
    }
    const wall = sprite('terraceWall', { w, level: Math.max(0, Math.min(3, terraceLevel - i)) });
    after.push(() => ctx.drawImage(wall.canvas, x0, y0 + 28 - 12));
  }
  // The Wilds: pale fields fading into mist at the bottom.
  for (let y = 656; y < H; y += 1) { const wc = mix(grass.base, '#C9D1D8', (y - 656) / 64 * 0.8); for (let x = 0; x < W; x += 1) if (n2(x / 15, y / 15) > 0.3) px(x, y, wc); }
  // The Hearth yard: trodden earth.
  const yardA = mix(grass.base, PIGMENT.path, 0.7), yardB = mix(grass.base, PIGMENT.path, 0.35);
  for (let y = 546; y < 600; y += 1) for (let x = 176; x < 262; x += 1) {
    const d = ((x - 218) ** 2) / (44 ** 2) + ((y - 576) ** 2) / (26 ** 2);
    if (d < 1 && n2(x / 6, y / 6) > 0.3) px(x, y, d < 0.6 ? yardA : yardB);
  }
  // The Quarter's square: cobbles.
  const cobbleLine = mix(PIGMENT.stoneWarm, PIGMENT.pathEdge, 0.5), cobbleA = mix(grass.base, PIGMENT.stoneWarm, 0.62), cobbleB = mix(grass.base, PIGMENT.stoneWarm, 0.45);
  for (let y = 540; y < 632; y += 1) for (let x = 400; x < 620; x += 1) {
    const d = ((x - 510) ** 2) / (110 ** 2) + ((y - 590) ** 2) / (44 ** 2);
    if (d < 1 && n2(x / 7, y / 7) > 0.3) px(x, y, (x % 6 === 0 || y % 5 === 0) ? cobbleLine : d < 0.5 ? cobbleA : cobbleB);
  }

  /* ---- Paths: worn earth with a dithered edge, rasterised from a stroked
          mask. Once the valley's paths are stoned, the same tracks are
          laid in pale flags with a mortar grid: the first work the whole
          valley can see. ---- */
  {
    const stoned = state?.built?.stonePaths === true;
    const mask = strokeMask(W, H, (m) => { for (const path of PATHS) strokePolyline(m, path, stoned ? 7.6 : 6.8); });
    const core = strokeMask(W, H, (m) => { for (const path of PATHS) strokePolyline(m, path, stoned ? 5.4 : 4.4); });
    const flagA = mix(PIGMENT.stoneWarm, '#FFFFFF', 0.18);
    const flagB = PIGMENT.stoneWarm;
    const mortar = mix(PIGMENT.stoneWarm, PIGMENT.outline, 0.3);
    for (let y = 150; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const i = y * W + x;
      if (!stoned) {
        if (core[i]) px(x, y, PIGMENT.path);
        else if (mask[i]) px(x, y, (x + y) & 1 ? PIGMENT.path : PIGMENT.pathEdge);
      } else if (core[i]) {
        const grid = (x % 5 === 0) || (y % 4 === 0);
        px(x, y, grid ? mortar : (Math.floor(x / 5) + Math.floor(y / 4)) % 2 ? flagA : flagB);
      } else if (mask[i]) {
        px(x, y, (x + y) & 1 ? PIGMENT.pathEdge : mix(PIGMENT.stoneWarm, PIGMENT.pathEdge, 0.5));
      }
    }
  }

  /* ---- Water: the river and the Mirror Pond ---- */
  const waterBody = ramp(hour === 'night' ? '#213B5E' : hour === 'dusk' ? '#5F6BA8' : hour === 'dawn' ? '#7FA8D6' : PIGMENT.water);
  const bank = ramp(PIGMENT.sand);
  {
    const riverW = (y) => riverHalfWidth(y) * 2;
    // Five masks. Depth is bands, not noise: a pond painted in two tones
    // with a checker between them reads as static, and a pond painted in
    // four flat steps reads as water you could wade into.
    const bankM = strokeMask(W, H, (m) => { strokeRiver(m, RIVER, (y) => riverW(y) + 3); fillPond(m, 1.08); });
    const bodyM = strokeMask(W, H, (m) => { strokeRiver(m, RIVER, riverW); fillPond(m, 1); });
    const midM = strokeMask(W, H, (m) => { fillPond(m, 0.9); });
    const deepM = strokeMask(W, H, (m) => { fillPond(m, 0.72, 2, 3); });
    const deepestM = strokeMask(W, H, (m) => { fillPond(m, 0.46, 4, 5); });
    const riverDeepM = strokeMask(W, H, (m) => { strokeRiver(m, RIVER, (y) => riverW(y) * 0.45); });

    const shallow = mix(waterBody.base, PIGMENT.sand, 0.34);
    const mid = waterBody.base;
    const deep = mix(waterBody.base, waterBody.shade, 0.6);
    const deepest = waterBody.shade;
    const nEdge = noise2('pond-edge');
    const nSand = noise2('pond-sand');
    // A one-pixel ragged seam between two depths, so the step is a shoreline
    // and not a drawn curve.
    const ragged = (x, y, t) => nEdge(x / 3.5, y / 3.5) > t;

    for (let y = 150; y < H; y += 1) for (let x = 0; x < W; x += 1) {
      const i = y * W + x;
      const pond = bodyM[i] && inPond(x, y, 1);
      if (pond) {
        let c = shallow;
        if (deepestM[i]) c = deepest;
        else if (deepM[i]) c = ragged(x, y, 0.62) ? deepest : deep;
        else if (midM[i]) c = ragged(x, y, 0.66) ? deep : mid;
        else c = ragged(x, y, 0.7) ? mid : shallow;
        px(x, y, c);
        continue;
      }
      if (bodyM[i]) { px(x, y, riverDeepM[i] ? deep : mid); continue; }
      if (!bankM[i]) continue;
      // The shore. Sand in the western bay and where the river runs out;
      // everywhere else the grass comes down to wet stone.
      const inBay = x < POND.cx - POND.rx * 0.3 && Math.abs(y - POND.cy) < POND.ry * 1.0;
      const nearRiver = distToPolyline(x, y, RIVER) < riverW(y) + 4;
      if (inBay || nearRiver) px(x, y, nSand(x / 7, y / 7) > 0.52 ? bank.light : bank.base);
      else if (nSand(x / 6, y / 6) > 0.62) px(x, y, bank.shade);
      else px(x, y, mix(grass.shade, bank.shade, 0.45));
    }

    /* The mirror. A pale band across the pond's northern water, where the
       sky lands on it, and a scatter of flat highlights that give the
       surface a plane. This, and not the outline, is why it is a pond. */
    const sheen = mix(waterBody.light, '#FFFFFF', hour === 'night' ? 0.18 : 0.5);
    const nSheen = noise2('pond-sheen');
    for (let y = POND.cy - POND.ry; y < POND.cy + POND.ry * 0.2; y += 1) {
      for (let x = POND.cx - POND.rx; x < POND.cx + POND.rx; x += 1) {
        if (!inPond(x, y, -3)) continue;
        const d = (POND.cy - y) / (POND.ry * 1.1);          // 1 at the top edge
        const v = nSheen(x / 13, y / 5);
        // Short, flat, well spaced: a surface catching light, not scratches.
        if (v > 0.80 - d * 0.22 && (y % 3 === 0) && ((x + y) % 9) < 5) px(x, y, sheen);
      }
    }
    /* A brighter line just inside the shore, all the way round: the light
       that catches on the meniscus. */
    const N = 260;
    for (let j = 0; j < N; j += 1) {
      const ang = (j / N) * Math.PI * 2;
      if ((j >> 1) % 4 === 0) continue;
      const r = pondR(ang) * 0.965;
      const x = Math.round(POND.cx + Math.cos(ang) * POND.rx * r);
      const y = Math.round(POND.cy + Math.sin(ang) * POND.ry * r);
      px(x, y, sheen);
    }
  }
  // Snow settles on the ground in winter: a light dither over the grass.
  if (isWinter) for (let y = HORIZON - 12; y < H; y += 2) for (let x = (y >> 1) & 1; x < W; x += 3) if (n2(x / 11, y / 11) > 0.45 && !inPond(x, y, 0) && distToPolyline(x, y, RIVER) > riverHalfWidth(y)) px(x, y, mix(PIGMENT.snow, grass.light, 0.25));

  // Everything per-pixel is painted; now the raster goes to the canvas
  // once, and the props are drawn on top of it.
  ras.flush(ctx);
  for (const f of after) f();

  // Pond edge sparkle and lily pads are baked; koi are alive (scene).
  const rr = rng('pond-lilies');
  const lilies = Math.min(14, 4 + Math.floor((state?.pond?.mastered ?? 0) / 18));
  for (let i = 0; i < lilies; i += 1) {
    // A raft of pads in the north-east corner, where the water is still.
    const a = -0.9 + rr() * 1.5;
    const rad = 0.5 + rr() * 0.34;
    const s = sprite('lilypad', { seed: `lily${i}`, bloom: i % 3 === 0 && !isWinter });
    ctx.drawImage(s.canvas, Math.round(POND.cx + Math.cos(a) * POND.rx * rad - s.ax), Math.round(POND.cy + Math.sin(a) * POND.ry * rad - s.ay));
  }
  // Reeds all round the shallow shore, thickest away from the beach.
  const reedAngles = [0.25, 0.55, 0.85, 1.15, 1.5, 1.85, 2.2, 4.35, 4.75, 5.1, 5.5, 5.85];
  reedAngles.forEach((a, i) => {
    const s = sprite('reeds', { seed: `reeds${i}` });
    const r = pondR(a) * (1.0 + (i % 2) * 0.03);
    ctx.drawImage(s.canvas,
      Math.round(POND.cx + Math.cos(a) * POND.rx * r - s.ax),
      Math.round(POND.cy + Math.sin(a) * POND.ry * r - s.ay + 2));
  });
  // The dock, walking out of the western bay.
  {
    const d = sprite('dock', { w: 26, h: 8 });
    ctx.drawImage(d.canvas, Math.round(POND.cx - POND.rx * 0.92 - 4), Math.round(POND.cy - 4));
  }
  // Bridges.
  const b1 = sprite('bridge', { w: BRIDGE.w }); ctx.drawImage(b1.canvas, BRIDGE.x - b1.ax, BRIDGE.y - b1.ay);
  const b2 = sprite('bridge', { w: BRIDGE_N.w }); ctx.drawImage(b2.canvas, BRIDGE_N.x - b2.ax, BRIDGE_N.y - b2.ay);

  /* ---- Ground cover: flowers by mastery, tufts, rocks — baked ---- */
  const r = rng('cover');
  const meadowBloom = Math.min(1, (state?.meadow?.mastered ?? 0) / Math.max(1, state?.meadow?.total ?? 1));
  const meadowPatches = 6 + Math.round(meadowBloom * 60);
  for (let i = 0; i < meadowPatches; i += 1) {
    const x = 30 + r() * 236, y = 352 + r() * 112;
    if (distToPolyline(x, y, PATHS[2]) < 6 || distToPolyline(x, y, PATHS[3]) < 6) continue;
    const s = sprite('flowerPatch', { seed: `mp${i}`, n: isWinter ? 2 : 5 + Math.floor(r() * 4), colors: [i % 7, (i + 2) % 7, (i + 4) % 7], w: 14, h: 9 });
    ctx.globalAlpha = isWinter ? 0.5 : 1;
    ctx.drawImage(s.canvas, Math.round(x - s.ax), Math.round(y - s.ay));
    ctx.globalAlpha = 1;
  }
  for (let i = 0; i < 90; i += 1) {
    const x = 20 + r() * 600, y = 200 + r() * 500;
    if (inPond(x, y, 6) || distToPolyline(x, y, RIVER) < 8) continue;
    if (regionAt(x, y)?.slug === 'rootwood' || regionAt(x, y)?.slug === 'thicket') continue;
    const s = sprite('grassTuft', { seed: `t${i}`, season });
    ctx.drawImage(s.canvas, Math.round(x - s.ax), Math.round(y - s.ay));
  }
  for (let i = 0; i < 14; i += 1) {
    const x = 20 + r() * 600, y = 210 + r() * 480;
    if (inPond(x, y, 10) || distToPolyline(x, y, RIVER) < 10) continue;
    const s = sprite('rock', { seed: `rock${i}`, size: r() > 0.7 ? 2 : 1 });
    ctx.drawImage(s.canvas, Math.round(x - s.ax), Math.round(y - s.ay));
  }
}

function fillRegionGround(ras, x0, y0, w, h, colorAt, n2, seed) {
  // An organic edge: the region's ground fades into the valley with noise.
  for (let y = y0; y < y0 + h; y += 1) for (let x = x0; x < x0 + w; x += 1) {
    const ex = Math.min(x - x0, x0 + w - x) / w, ey = Math.min(y - y0, y0 + h - y) / h;
    const edge = Math.min(ex, ey) * 4;
    if (edge + (n2(x / 16 + 100, y / 16) - 0.5) * 1.6 + (n2(x / 5 + 300, y / 5) - 0.5) * 0.4 < 0.3) continue;
    ras.set(x, y, colorAt(x, y));
  }
}

function drawDisc(ras, cx, cy, r, c) {
  for (let y = -r; y <= r; y += 1) { const half = Math.floor(Math.sqrt(r * r - y * y + 0.25)); ras.rect(cx - half, cy + y, half * 2 + 1, 1, c); }
}

/* ------------------------------------------------------------------ */
/* The living scene                                                    */
/* ------------------------------------------------------------------ */

/**
 * @param {object} state  world state from state.js
 * @param {object} atmo   { hour, season, weather }
 * @param {object} [opts] { focus: slug|null }
 * @returns a Scene for WorldRenderer
 */
/**
 * The hour's light, applied the way `WorldRenderer.draw` applies it: a
 * multiply by mix(white, tint, strength), not a lerp toward the tint. The
 * edge painters have to use this or the sky beyond the ridge meets the map's
 * own sky at a visible step every dusk and dawn.
 */
function multiplyTint(hex, tint, strength) {
  if (!(strength > 0)) return hex;
  const m = mix('#FFFFFF', tint, strength);
  const c = parseInt(String(hex).slice(1), 16);
  const t = parseInt(String(m).slice(1), 16);
  const ch = (shift) => Math.round((((c >> shift) & 255) * ((t >> shift) & 255)) / 255);
  return `#${((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)}`;
}

/** A hex colour at an alpha, for gradients that fade to nothing. */
function hexAlpha(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function buildWorldScene(state, atmo, opts = {}) {
  const { hour, season, weather } = atmo;
  const night = hour === 'night' || hour === 'dusk';
  const isWinter = season === 'winter';
  const r = rng('scene');
  const statics = []; // objects that never move, built once
  const lamps = [];   // static lights
  const life = [];    // updatable systems

  /* ---- The Rootwood: one tree per family, in its grove ---- */
  const groveOf = new Map();
  for (const f of state.rootwood.families) {
    if (!groveOf.has(f.grove)) groveOf.set(f.grove, []);
    groveOf.get(f.grove).push(f);
  }
  for (const [grove, fams] of groveOf) {
    const spot = GROVE_SPOTS[grove] ?? GROVE_SPOTS.edge;
    const gr = rng(`grove:${grove}`);
    fams.forEach((f, i) => {
      // A ring of stands around the clearing, front row bigger.
      const a = (i / fams.length) * Math.PI * 2 + gr() * 0.4;
      const rad = 14 + (i % 3) * 9 + gr() * 4;
      const x = spot.x + Math.cos(a) * rad * 1.4, y = spot.y + Math.sin(a) * rad * 0.7;
      const stage = f.stage;
      if (stage === 'open_ground') {
        statics.push({ x, y, sprite: sprite('rootStone', { seed: f.id }), id: f.id, region: 'rootwood' });
      } else {
        statics.push({ x, y, sprite: sprite('tree', { stage, seed: f.id, season, vigor: Math.round(f.vigor * 4) / 4, landmark: f.landmark, due: f.due }), id: f.id, region: 'rootwood' });
        if (f.landmark && night) lamps.push({ x, y: y - 8, r: 14, a: 0.35, color: PIGMENT.lantern });
      }
    });
    // A signpost at the grove mouth when the grove has begun.
    if (fams.some((f) => f.stage !== 'open_ground')) statics.push({ x: spot.x, y: spot.y + 26, sprite: sprite('signpost', { arrows: 1 }) });
  }
  // Wild trees fill the Rootwood around the groves — the wood is a wood
  // before anything is planted, and thickens as the learner grows.
  const wr = rng('wildwood');
  const wildCount = 90 + Math.min(50, state.rootwood.grownCount * 2);
  for (let i = 0; i < wildCount; i += 1) {
    const x = 26 + wr() * 288, y = 152 + wr() * 180;
    let tooClose = false;
    for (const g of Object.values(GROVE_SPOTS)) if (Math.hypot((x - g.x) / 1.4, y - g.y) < 24) { tooClose = true; break; }
    if (tooClose) continue;
    const pine = wr() > 0.6;
    statics.push({ x, y, sprite: sprite('tree', { stage: wr() > 0.75 ? 'mature' : wr() > 0.3 ? 'in_leaf' : 'young', seed: `wild${i}`, season, kind: pine ? 'pine' : 'broad' }) });
  }
  // A few trees scattered over the whole valley, so no field is empty.
  const vr = rng('valley-trees');
  for (let i = 0; i < 26; i += 1) {
    const x = 20 + vr() * 600, y = 210 + vr() * 440;
    if (regionAt(x, y) && regionAt(x, y).slug !== 'meadow') continue;
    if (Math.hypot(x - POND.cx, y - POND.cy) < 80 || Math.abs(x - 350) < 24) continue;
    statics.push({ x, y, sprite: sprite('tree', { stage: vr() > 0.5 ? 'in_leaf' : 'young', seed: `vt${i}`, season, kind: vr() > 0.5 ? 'pine' : 'broad' }) });
  }
  // Fireflies in the wood at night, more with every Ancient.
  if (night && !isWinter) {
    const ff = particles({ kind: 'fireflies', rect: { x: 40, y: 190, w: 260, h: 130 }, count: 8 + state.rootwood.ancientCount * 4, seed: 'ff-wood' });
    life.push(ff);
  }

  /* ---- The Hearth ---- */
  const hearth = REGIONS.find((x) => x.slug === 'hearth');
  const cottage = sprite('cottage', { level: state.hearth.level, lit: night, smoke: state.hearth.practicedToday });
  statics.push({ x: hearth.anchor.x, y: hearth.anchor.y, sprite: cottage, region: 'hearth' });
  statics.push({ x: hearth.anchor.x - 40, y: hearth.anchor.y + 6, sprite: sprite('fence', { w: 24 }) });
  statics.push({ x: hearth.anchor.x + 40, y: hearth.anchor.y + 6, sprite: sprite('fence', { w: 24 }) });
  statics.push({ x: hearth.anchor.x + 34, y: hearth.anchor.y + 2, sprite: sprite('bush', { seed: 'hb1', season, berries: true }) });
  if (night) lamps.push({ x: hearth.anchor.x - 8, y: hearth.anchor.y - 10, r: 22, a: 0.5, color: PIGMENT.windowLight });
  if (state.hearth.level >= 4 && night) lamps.push({ x: hearth.anchor.x + 19, y: hearth.anchor.y - 14, r: 16, a: 0.5, color: PIGMENT.lantern });
  if (state.hearth.practicedToday) life.push(smoke({ x: hearth.anchor.x + 11, y: hearth.anchor.y - 34 }));
  const catSys = hearthCat({ x: hearth.anchor.x + 14, y: hearth.anchor.y + 4 });
  life.push(catSys);

  /* ---- The Reading Room tower ---- */
  const rr = REGIONS.find((x) => x.slug === 'reading-room');
  statics.push({ x: rr.anchor.x, y: rr.anchor.y, sprite: sprite('tower', { floors: state.reading.floors, lit: night ? state.reading.litWindows : 0, observatory: state.reading.observatory, night }), region: 'reading-room' });
  if (night) for (let i = 0; i < Math.min(state.reading.litWindows, state.reading.floors * 2); i += 1) {
    const f = Math.floor(i / 2), side = i % 2 ? 4 : -4;
    lamps.push({ x: rr.anchor.x + side, y: rr.anchor.y - 8 - f * 11, r: 10, a: 0.35, color: PIGMENT.windowLight });
  }
  // The reading yard: a low wall, benches under the trees, a lamp by the
  // door, and a stand of pines behind the tower to give it a horizon.
  {
    const yr = rng('rr-yard');
    // One continuous run at one height: four fence sprites at different
    // y's read as dropped slats, not as a yard.
    for (const dx of [-39, -13, 13, 39]) {
      statics.push({ x: rr.anchor.x + dx, y: rr.anchor.y + 27, sprite: sprite('fence', { w: 26 }), z: -1 });
    }
    for (const [dx, dy, kind, stage] of [[-30, 4, 'pine', 'mature'], [-44, -10, 'pine', 'in_leaf'], [34, -6, 'pine', 'mature'], [46, 6, 'broad', 'in_leaf']]) {
      statics.push({ x: rr.anchor.x + dx, y: rr.anchor.y + dy, sprite: sprite('tree', { stage, seed: `rr-t${dx}`, season, kind }) });
    }
    statics.push({ x: rr.anchor.x - 20, y: rr.anchor.y + 16, sprite: sprite('bush', { seed: 'rrb1', season }) });
    statics.push({ x: rr.anchor.x + 26, y: rr.anchor.y + 14, sprite: sprite('bush', { seed: 'rrb2', season }) });
    statics.push({ x: rr.anchor.x + 16, y: rr.anchor.y + 2, sprite: sprite('lantern', { lit: night }) });
    if (night) lamps.push({ x: rr.anchor.x + 16, y: rr.anchor.y - 8, r: 18, a: 0.5, color: PIGMENT.lantern });
    // A reader on the bench once the tower has been climbed a little.
    if (state.reading.read >= 4) statics.push({ x: rr.anchor.x - 24, y: rr.anchor.y + 18, sprite: sprite('villager', { colour: 3 }) });
    for (let i = 0; i < 5; i += 1) {
      statics.push({ x: rr.anchor.x - 50 + Math.round(yr() * 100), y: rr.anchor.y + 30 + Math.round(yr() * 26), sprite: sprite('grassTuft', { seed: `rrg${i}`, season }) });
    }
  }

  /* ---- The Quarter: loom, table, bench ---- */
  for (const [slug, kind] of [['loom', 'loom'], ['table', 'table'], ['bench', 'bench']]) {
    const reg = REGIONS.find((x) => x.slug === slug);
    const level = state[slug]?.level ?? 0;
    statics.push({ x: reg.anchor.x, y: reg.anchor.y, sprite: sprite('workshop', { kind, level, lit: night }), region: slug });
    if (night && (level >= 1 || kind === 'bench')) lamps.push({ x: reg.anchor.x + (kind === 'bench' ? 13 : 16), y: reg.anchor.y - (kind === 'bench' ? 22 : 17), r: 16, a: 0.45, color: PIGMENT.lantern });
  }
  statics.push({ x: 470, y: 548, sprite: sprite('tree', { stage: 'mature', seed: 'sq-tree', season }) });
  statics.push({ x: 560, y: 640, sprite: sprite('tree', { stage: 'in_leaf', seed: 'sq-tree2', season }) });

  /* ---- The Thicket: brambles and thirteen lanterns ---- */
  const tr = rng('thicket');
  for (let i = 0; i < 16; i += 1) {
    const x = 20 + tr() * 120, y = 506 + tr() * 150;
    if (LANTERN_SPOTS.some((l) => Math.hypot(l.x - x, l.y - y) < 10)) continue;
    statics.push({ x, y, sprite: sprite('bramble', { seed: `br${i}`, season, lit: i < state.thicket.lanterns }) });
  }
  LANTERN_SPOTS.forEach((l, i) => {
    const lit = i < state.thicket.lanterns;
    statics.push({ x: l.x, y: l.y, sprite: sprite('lantern', { lit }), region: 'thicket' });
    if (lit) lamps.push({ x: l.x, y: l.y - 10, r: night ? 14 : 8, a: night ? 0.55 : 0.2, color: PIGMENT.lantern });
  });
  statics.push({ x: 60, y: 520, sprite: sprite('tree', { stage: 'mature', seed: 'th-tree', season, kind: 'pine' }) });

  /* ---- The Meadow: butterflies and pollen scale with bloom ---- */
  const bloom = state.meadow.total ? state.meadow.mastered / state.meadow.total : 0;
  if (!isWinter) {
    life.push(butterflies({ rect: { x: 40, y: 356, w: 220, h: 100 }, count: 2 + Math.min(8, Math.round(bloom * 12) + state.meadow.fieldsDone) }));
    if (hour !== 'night') life.push(particles({ kind: 'pollen', rect: { x: 40, y: 356, w: 220, h: 100 }, count: 10 + Math.round(bloom * 30), seed: 'pollen' }));
  }
  statics.push({ x: 44, y: 372, sprite: sprite('tree', { stage: 'in_leaf', seed: 'md-tree', season }) });
  statics.push({ x: 250, y: 456, sprite: sprite('stump', { seed: 's1' }) });

  /* ---- The Mirror Pond: koi per mastered set ---- */
  if (state.pond.koi > 0) life.push(koi({ cx: POND.cx, cy: POND.cy, rx: POND.rx, ry: POND.ry, count: Math.min(12, state.pond.koi), seed: 'pond-koi' }));
  const glints = waterGlints({ shapes: [{ cx: POND.cx, cy: POND.cy, rx: POND.rx, ry: POND.ry }, { x: 386, y: 190, w: 14, h: 100 }, { x: 340, y: 470, w: 12, h: 250 }], color: hour === 'night' ? 'rgba(200,214,240,0.7)' : 'rgba(232,246,255,0.8)' });
  life.push(glints);
  if (night) lamps.push({ x: POND.cx, y: POND.cy, r: 40, a: 0.12, color: '#9FB9E8' });

  /* ---- The Terraces: vines and a small hut at the top ---- */
  statics.push({ x: 530, y: 190, sprite: sprite('workshop', { kind: 'loom', level: 0, lit: night }), region: 'terraces', z: -2 });
  for (let i = 0; i < 6; i += 1) statics.push({ x: 450 + i * 30, y: 300 + (i % 2) * 6, sprite: sprite('bush', { seed: `tb${i}`, season, berries: i % 2 === 0 && state.terraces.level > 0 }) });

  /* ---- The Wilds: a signpost at the road out ---- */
  statics.push({ x: 356, y: 676, sprite: sprite('signpost', { arrows: 2 }), region: 'wilds' });
  statics.push({ x: 300, y: 690, sprite: sprite('tree', { stage: 'in_leaf', seed: 'w-tree', season, kind: 'pine' }) });
  statics.push({ x: 396, y: 700, sprite: sprite('rock', { seed: 'w-rock', size: 2 }) });

  /* ---- The works: everything Amber, Ink, Thread and Ember have built.
          This is the whole point of the economy — the valley is visibly
          the sum of what the learner has understood. ---- */
  const built = state.built ?? {};
  if (built.meadowHives) for (let i = 0; i < 3; i += 1) statics.push({ x: 62 + i * 22, y: 388 + (i % 2) * 8, sprite: sprite('hive', { seed: `mh${i}` }), region: 'meadow' });
  if (built.pondLanterns) {
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const r = pondR(a);
      const x = POND.cx + Math.cos(a) * (POND.rx * r + 9), y = POND.cy + Math.sin(a) * (POND.ry * r + 7);
      statics.push({ x, y, sprite: sprite('lantern', { lit: true }), region: 'pond' });
      lamps.push({ x, y: y - 10, r: night ? 18 : 9, a: night ? 0.6 : 0.18, color: PIGMENT.lantern });
    }
  }
  if (built.pondHeron) statics.push({ x: POND.cx - 54, y: POND.cy - 20, sprite: sprite('heron', {}), region: 'pond' });
  if (built.thicketArch) statics.push({ x: 74, y: 512, sprite: sprite('arch', {}), region: 'thicket' });
  if (built.rootShrine) statics.push({ x: GROVE_SPOTS.hearts.x, y: GROVE_SPOTS.hearts.y + 14, sprite: sprite('shrine', { lit: night }), region: 'rootwood' });
  if (built.rootShrine && night) lamps.push({ x: GROVE_SPOTS.hearts.x, y: GROVE_SPOTS.hearts.y + 6, r: 18, a: 0.5, color: PIGMENT.lantern });
  if (built.terraceArbour) statics.push({ x: 540, y: 214, sprite: sprite('arbour', {}), region: 'terraces' });
  if (built.quarterSquare) {
    statics.push({ x: 470, y: 606, sprite: sprite('well', {}), region: 'table' });
    statics.push({ x: 440, y: 626, sprite: sprite('stall', { colour: 0 }), region: 'loom' });
    statics.push({ x: 506, y: 636, sprite: sprite('stall', { colour: 1 }), region: 'table' });
    statics.push({ x: 556, y: 600, sprite: sprite('stall', { colour: 2 }), region: 'bench' });
  }
  if (built.quarterLamps) {
    for (const [x, y] of [[404, 546], [496, 586], [574, 520]]) {
      statics.push({ x, y, sprite: sprite('lantern', { lit: true }) });
      lamps.push({ x, y: y - 10, r: night ? 16 : 8, a: night ? 0.55 : 0.18, color: PIGMENT.lantern });
    }
  }
  if (built.wildsLanterns) {
    for (let i = 0; i < 4; i += 1) {
      const x = i % 2 ? 310 : 372, y = 664 + i * 14;
      statics.push({ x, y, sprite: sprite('lantern', { lit: true }), region: 'wilds' });
      lamps.push({ x, y: y - 10, r: night ? 16 : 8, a: night ? 0.55 : 0.18, color: PIGMENT.lantern });
    }
  }
  if (built.stoneBridges) {
    statics.push({ x: 372, y: 302, sprite: sprite('stoneBridge', { w: 30 }) });
    statics.push({ x: 344, y: 494, sprite: sprite('stoneBridge', { w: 28 }) });
  }
  /* Creatures arrive because the learner brought them. Nothing here is
     decoration on a timer: a deer needs an old wood, sheep need fields in
     bloom, ducks need a pond that has been worked, the dog needs a home
     with a lit door. */
  if (state.rootwood.matureCount >= 8) {
    life.push(grazers({ rect: { x: 40, y: 318, w: 250, h: 26 }, count: Math.min(4, 1 + Math.floor(state.rootwood.matureCount / 10)), kind: 'deer', seed: 'wood-deer' }));
  }
  if (state.meadow.fieldsDone >= 1 || state.meadow.mastered >= 90) {
    life.push(grazers({ rect: { x: 46, y: 392, w: 210, h: 62 }, count: Math.min(6, 2 + state.meadow.fieldsDone), kind: 'sheep', seed: 'meadow-sheep' }));
  }
  if (state.pond.koi >= 4) {
    life.push(ducks({ cx: POND.cx, cy: POND.cy, rx: POND.rx, ry: POND.ry, count: Math.min(5, Math.floor(state.pond.koi / 3)), seed: 'pond-ducks' }));
  }
  if (built.hearthLevel >= 3) {
    life.push(grazers({ rect: { x: 178, y: 574, w: 80, h: 22 }, count: 1, kind: 'dog', seed: 'hearth-dog' }));
  }

  // Villagers: the valley stops being scenery and becomes a settlement.
  // One walks for every three works standing, up to six.
  const worksBuilt = (state.builds ?? []).length;
  const folk = Math.min(6, Math.floor(worksBuilt / 2));
  if (folk > 0) {
    const routes = [
      [[214, 592], [280, 560], [340, 520], [300, 470]],
      [[150, 440], [200, 470], [250, 520], [214, 566]],
      [[424, 580], [470, 600], [516, 610], [560, 560]],
      [[522, 420], [470, 470], [420, 520], [424, 566]],
      [[84, 580], [130, 540], [180, 500], [150, 440]],
      [[340, 660], [320, 620], [280, 590], [240, 570]],
    ];
    for (let i = 0; i < folk; i += 1) life.push(walker(routes[i], i));
  }

  /* ---- Sky and weather life ---- */
  const cloudSys = clouds({ rect: { x: -40, y: 20, w: 720, h: 90 }, count: hour === 'night' ? 2 : 5, seed: 'clouds' });
  const birdSys = birds({ rect: { x: 0, y: 30, w: WORLD_W, h: 120 }, seed: 'birds' });
  const weatherSys = weather === 'rain' ? particles({ kind: 'rain', rect: { x: 0, y: 0, w: WORLD_W, h: WORLD_H }, count: 140, seed: 'rain' })
    : weather === 'snow' ? particles({ kind: 'snow', rect: { x: 0, y: 0, w: WORLD_W, h: WORLD_H }, count: 120, seed: 'snow' })
      : season === 'autumn' ? particles({ kind: 'leaves', rect: { x: 20, y: 150, w: 300, h: 200 }, count: 14, seed: 'leaves', colors: ['#D98A3A', '#C6533A', '#E0A23F'] })
        : season === 'spring' ? particles({ kind: 'petals', rect: { x: 20, y: 150, w: 300, h: 200 }, count: 10, seed: 'petals', colors: ['#F4B8CF', '#FFFFFF', '#F7D1DE'] })
          : null;

  /* ---- Markers: the one place asking for attention ---- */
  const askingSlug = state.asking;

  const scene = {
    backdrop: (SKY[hour] ?? SKY.morning)[0],
    hour,
    atmo,
    get edgeKey() { return this.hour; },
    time: 0,
    focus: opts.focus ?? null,
    terrain(ctx) { paintTerrain(ctx, this.atmo ?? atmo, state); },
    /** Everything outside the 640 × 720 map: more sky above the mountains,
     *  and haze below the road out. A tall phone must never see a bar. */
    beyond(ctx, { ox, oy, z, w, h, worldH, worldW }) {
      // `this.hour` so a screen can move the clock (the first dawn does)
      // and the sky above the ridge moves with it.
      const hr = this.hour ?? hour;
      const isNight = hr === 'night' || hr === 'dusk';
      const sky = SKY[hr] ?? SKY.morning;
      const li = LIGHT[hr] ?? LIGHT.morning;
      const lit = (c) => multiplyTint(c, li.tint, li.strength);
      /* The sides, on a screen wider than the valley: the same sky above
         the same horizon, the same land below, so the map never floats in
         a coloured box. */
      const horizonY = oy + 150 * z;
      const sideGround = lit(mix(PIGMENT.pine, '#3C5C42', 0.5));
      for (const [sx, sw] of [[0, Math.max(0, ox)], [ox + worldW * z, Math.max(0, w - (ox + worldW * z))]]) {
        if (sw <= 0) continue;
        ctx.fillStyle = lit(sky[0]);
        ctx.fillRect(sx, 0, sw + 1, Math.max(0, Math.min(h, horizonY)));
        if (horizonY < h) {
          const g = ctx.createLinearGradient(0, horizonY, 0, h);
          g.addColorStop(0, sideGround);
          g.addColorStop(1, lit(mix(PIGMENT.pine, '#16261C', 0.75)));
          ctx.fillStyle = g;
          ctx.fillRect(sx, Math.max(0, horizonY), sw + 1, h - Math.max(0, horizonY));
        }
      }
      if (oy > 0) {
        // The map's own sky runs sky[0] → sky[1] over its top 196 rows; this
        // continues that gradient upward so the two never meet at a step.
        const g = ctx.createLinearGradient(0, 0, 0, oy + 2);
        g.addColorStop(0, lit(mix(sky[0], isNight ? '#05091F' : '#8FC6F2', 0.45)));
        g.addColorStop(1, lit(sky[0]));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, oy + 2);
        if (isNight || hr === 'dawn') {
          const sr = rng('beyond-stars');
          const a = (LIGHT[hr] ?? LIGHT.night).stars ?? 0.5;
          for (let i = 0; i < 90; i += 1) {
            const sx = Math.floor(sr() * w), sy = Math.floor(sr() * Math.max(1, oy));
            ctx.fillStyle = `rgba(255,255,255,${(0.25 + sr() * 0.5) * a})`;
            ctx.fillRect(sx, sy, 2, 2);
          }
        }
      }
      const bottom = oy + worldH * z;
      if (bottom < h) {
        const depth = h - bottom;
        const g = ctx.createLinearGradient(0, bottom - 2, 0, h);
        g.addColorStop(0, lit(mix(PIGMENT.pine, '#40684A', 0.4)));
        g.addColorStop(0.45, lit(mix(PIGMENT.pine, '#27462F', 0.6)));
        g.addColorStop(1, lit(mix(PIGMENT.pine, '#101E17', 0.85)));
        ctx.fillStyle = g;
        ctx.fillRect(0, bottom - 2, w, depth + 2);
        // Three wooded ridges walking away from the valley, front one darkest:
        // the country south of the road, seen from the last hill.
        const bands = [
          { at: 0.0, hgt: 0.2, tone: mix(PIGMENT.pine, '#3E6A47', 0.35), step: Math.max(5, Math.round(z * 5)) },
          { at: 0.3, hgt: 0.26, tone: mix(PIGMENT.pine, '#24462E', 0.62), step: Math.max(7, Math.round(z * 8)) },
          { at: 0.62, hgt: 0.34, tone: mix(PIGMENT.pine, '#0E1F16', 0.86), step: Math.max(9, Math.round(z * 12)) },
        ];
        let bi = 0;
        for (const b of bands) {
          const br = rng('beyond-band' + bi);
          const top = bottom - 2 + depth * b.at;
          ctx.fillStyle = lit(b.tone);
          for (let x = -b.step; x < w + b.step; x += b.step) {
            const hgt = Math.round(depth * b.hgt * (0.45 + br() * 0.9));
            ctx.fillRect(x, top, b.step + 1, Math.max(2, hgt));
          }
          ctx.fillRect(0, top + Math.round(depth * b.hgt * 0.5), w, h - top);
          bi += 1;
        }
        // Mist lying in the folds, so the eye stops here rather than at a seam.
        const mg = ctx.createLinearGradient(0, bottom - 2, 0, bottom + depth * 0.5);
        mg.addColorStop(0, hexAlpha(lit(sky[0]), isNight ? 0.22 : 0.26));
        mg.addColorStop(1, hexAlpha(lit(sky[0]), 0));
        ctx.fillStyle = mg;
        ctx.fillRect(0, bottom - 2, w, depth * 0.5);
      }
    },
    update(dt, t) {
      this.time = t;
      cloudSys.update(dt); birdSys.update(dt); weatherSys?.update(dt);
      for (const s of life) s.update(dt);
    },
    objects(view, t) {
      const out = [];
      // Sky life is drawn first (lowest y) — clouds and birds live above the mountains.
      out.push({ x: 0, y: -1000, draw: (ctx) => { cloudSys.draw(ctx, night ? 0.5 : 0.92); birdSys.draw(ctx); } });
      for (const s of statics) out.push(s);
      for (const s of life) {
        if (s.kind === 'fireflies' || s.kind === 'pollen') out.push({ x: 0, y: 100000, draw: (ctx) => s.draw(ctx, t) });
        else if (s.ps) out.push({ x: 0, y: 100000, draw: (ctx) => s.draw(ctx, t) });
        else out.push({ x: 0, y: s.y ?? (s === glints ? -900 : 10000), draw: (ctx) => s.draw(ctx, t) });
      }
      if (weatherSys) out.push({ x: 0, y: 200000, draw: (ctx) => weatherSys.draw(ctx) });
      // The marker over the place that is asking, bobbing.
      if (askingSlug) {
        const reg = REGIONS.find((x) => x.slug === askingSlug);
        if (reg) {
          const bob = Math.round(Math.sin(t / 420) * 2);
          out.push({ x: reg.anchor.x, y: 300000, draw: (ctx) => { const m = sprite('marker', {}); ctx.drawImage(m.canvas, Math.round(reg.anchor.x - m.ax), Math.round(reg.anchor.y - 52 - m.ay + bob)); } });
        }
      }
      return out;
    },
    light() { return LIGHT[hour] ?? LIGHT.morning; },
    lights(view, t) {
      const out = [...lamps];
      for (const s of life) if (s.lights) out.push(...s.lights());
      if (hour === 'night') out.push({ x: 500, y: 46, r: 40, a: 0.25, color: '#DDE6FF' });
      return out;
    },
    overlay(ctx, view, t) {
      if (weather === 'fog') {
        ctx.fillStyle = 'rgba(232,237,242,0.28)';
        ctx.fillRect(0, 160, WORLD_W, WORLD_H - 160);
        for (let i = 0; i < 6; i += 1) { const y = 200 + i * 90 + Math.sin(t / 3000 + i) * 8; ctx.fillStyle = 'rgba(240,244,248,0.22)'; ctx.fillRect(0, Math.round(y), WORLD_W, 14); }
      }
      // The Wilds fade into mist at the road's end.
      const g = ctx.createLinearGradient(0, 650, 0, WORLD_H);
      g.addColorStop(0, 'rgba(220,230,246,0)'); g.addColorStop(1, night ? 'rgba(20,30,60,0.6)' : 'rgba(220,230,246,0.7)');
      ctx.fillStyle = g; ctx.fillRect(0, 650, WORLD_W, WORLD_H - 650);
    },
    /** After the blit: soften the seam where the map meets the beyond, so a
     *  wide screen reads as distance rather than as a border. */
    hud(ctx, { ox, oy, z, w, h }) {
      const right = ox + WORLD_W * z;
      const fade = Math.max(10, Math.round(26 * z));
      if (ox > 0) { const g = ctx.createLinearGradient(ox - fade, 0, ox + fade, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(12,20,40,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(ox - fade, 0, fade * 2, h); }
      if (right < w) { const g = ctx.createLinearGradient(right - fade, 0, right + fade, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(12,20,40,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(right - fade, 0, fade * 2, h); }
      const bottom = oy + WORLD_H * z;
      if (bottom < h) { const g = ctx.createLinearGradient(0, bottom - fade, 0, bottom + fade); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(12,20,40,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, bottom - fade, w, fade * 2); }
    },
    hit(x, y) { return regionAt(x, y); },
    /** Where a region's growth animation should play from. */
    anchorOf(slug) { return REGIONS.find((x) => x.slug === slug)?.anchor ?? null; },
  };
  return scene;
}

/* ------------------------------------------------------------------ */
/* Hero scenes for the places (small panels inside a place screen)     */
/* ------------------------------------------------------------------ */

/**
 * A grove of the Rootwood, seen up close: the families as trees on a
 * clearing, front row to back. 320 × 180 world px.
 */
export function buildGroveScene(grove, families, atmo, opts = {}) {
  const { hour, season } = atmo;
  const night = hour === 'night' || hour === 'dusk';
  const portrait = !!opts.portrait;
  const W = portrait ? 240 : 320, H = portrait ? 340 : 180;
  const n2 = noise2(`grove-${grove.slug}`);
  const grass = ramp((SEASON[season] ?? SEASON.summer).grass);
  const objects = [];
  const gr = rng(`grovescene:${grove.slug}`);
  // Stands: three rows, hand-placed and uneven.
  const rows = portrait
    ? [[0.3, 200, 1.1], [0.7, 204, 1.1], [0.26, 180, 0.95], [0.5, 176, 0.9], [0.74, 182, 0.95], [0.33, 160, 0.85], [0.67, 162, 0.85], [0.29, 142, 0.75], [0.5, 140, 0.75], [0.71, 144, 0.75], [0.4, 126, 0.65]]
    : [[0.5, 150, 1], [0.32, 128, 1], [0.7, 132, 1], [0.18, 108, 0.9], [0.5, 104, 0.9], [0.84, 110, 0.9], [0.1, 84, 0.8], [0.36, 80, 0.8], [0.64, 82, 0.8], [0.9, 86, 0.8], [0.5, 66, 0.7]];
  // In the portrait scene the tended family takes the hero stand, centre front.
  const heroId = portrait ? opts.heroId ?? null : null;
  let rowIndex = 0;
  families.forEach((f, i) => {
    let fx, y, scale;
    if (heroId && f.id === heroId) { fx = 0.5; y = 208; scale = 1.3; }
    else { [fx, y, scale] = rows[rowIndex % rows.length]; rowIndex += 1; }
    const x = Math.round(fx * W + (gr() - 0.5) * 12);
    const sp = f.stage === 'open_ground' ? sprite('rootStone', { seed: f.id }) : sprite('tree', { stage: f.stage, seed: f.id, season, vigor: Math.round(f.vigor * 4) / 4, landmark: f.landmark, due: f.due });
    objects.push({ x, y: y + Math.floor(i / rows.length) * 3, sprite: sp, scaleY: scale, scaleX: scale, id: f.id, family: f });
  });
  const lamps = [];
  for (const o of objects) if (o.family?.landmark && night) lamps.push({ x: o.x, y: o.y - 10, r: 16, a: 0.4, color: PIGMENT.lantern });
  const ff = night ? particles({ kind: 'fireflies', rect: { x: 10, y: 40, w: W - 20, h: H - 60 }, count: portrait ? 16 : 10, seed: `ff-${grove.slug}` }) : null;
  const bf = !night && season !== 'winter' ? butterflies({ rect: { x: 20, y: 60, w: W - 40, h: H - 80 }, count: 2, seed: `bf-${grove.slug}` }) : null;
  let selected = opts.selected ?? null;
  const scene = {
    backdrop: '#0A1230', W, H, focusY: portrait ? 166 : 112,
    terrain(ctx) {
      const sky = SKY[hour] ?? SKY.morning;
      const skyH = portrait ? 56 : 44;
      for (let y = 0; y < skyH; y += 1) { ctx.fillStyle = mix(sky[1], sky[2], y / skyH); ctx.fillRect(0, y, W, 1); }
      // A canopy ceiling: overlapping dark masses along the top edge.
      // Deep enough to be a ceiling. An autumn canopy seen from underneath
      // is not the colour of an autumn canopy seen from above: it is that
      // colour with the whole wood's shade behind it.
      const canopyTone = season === 'autumn' ? mix(PIGMENT.autumn, PIGMENT.canopyDeep, 0.42)
        : season === 'winter' ? '#5E7466' : PIGMENT.canopyDeep;
      const c = ramp(canopyTone);
      const canopyH = portrait ? 72 : 70;
      const pxl = new Pix(W, canopyH);
      const cr = rng(`canopy:${grove.slug}`);
      const cy = portrait ? 1.7 : 1;
      // Three passes, dark to light, then a scatter of small clusters so the
      // ceiling has leaves in it rather than being one shape; then gaps,
      // punched back out, where the sky gets through.
      for (let i = 0; i < 34; i += 1) pxl.blob(Math.floor(cr() * W), Math.floor(cr() * 26 * cy) - 8, 22 + Math.floor(cr() * 18), 12 + Math.floor(cr() * 8), c.dark, cr, 0.26);
      for (let i = 0; i < 26; i += 1) pxl.blob(Math.floor(cr() * W), 2 + Math.floor(cr() * 22 * cy), 15 + Math.floor(cr() * 13), 8 + Math.floor(cr() * 6), c.shade, cr, 0.3);
      for (let i = 0; i < 20; i += 1) pxl.blob(Math.floor(cr() * W), 4 + Math.floor(cr() * 20 * cy), 9 + Math.floor(cr() * 9), 5 + Math.floor(cr() * 4), c.base, cr, 0.32);
      for (let i = 0; i < 26; i += 1) pxl.blob(Math.floor(cr() * W), 1 + Math.floor(cr() * 18 * cy), 4 + Math.floor(cr() * 5), 3 + Math.floor(cr() * 3), c.light, cr, 0.35);
      pxl.outline(ramp(c.dark).dark);
      // Gaps: erase a few small holes so daylight shows between the leaves.
      pxl.ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 9; i += 1) pxl.blob(Math.floor(cr() * W), 3 + Math.floor(cr() * 22 * cy), 3 + Math.floor(cr() * 4), 2 + Math.floor(cr() * 3), '#000', cr, 0.4);
      pxl.ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(pxl.canvas, 0, 0);
      // Two great trunks frame the grove.
      const trunk = ramp(PIGMENT.trunk);
      const trunkH = portrait ? 108 : 92;
      for (const [tx, tw] of [[6, 9], [W - 16, 10]]) { ctx.fillStyle = trunk.base; ctx.fillRect(tx, 0, tw, trunkH); ctx.fillStyle = trunk.light; ctx.fillRect(tx, 0, 2, trunkH); ctx.fillStyle = trunk.dark; ctx.fillRect(tx + tw - 2, 0, 2, trunkH); }
      // The floor: mossy ground with light pools.
      const floorBase = mix(grass.base, '#3E6B4B', 0.28), floorShade = mix(grass.shade, '#3E6B4B', 0.3), floorPool = mix(grass.light, '#F3E9C2', 0.3);
      for (let y = portrait ? 50 : 38; y < H; y += 1) for (let x = 0; x < W; x += 1) {
        const g = n2(x / 16, y / 16);
        const pool = n2(x / 34 + 50, y / 34) > 0.66 && !night;
        ctx.fillStyle = pool ? mix(floorBase, floorPool, 0.6) : g < 0.4 ? floorShade : floorBase;
        ctx.fillRect(x, y, 1, 1);
      }
      // A path through the middle.
      const pathTop = portrait ? 84 : 92;
      for (let y = pathTop; y < H; y += 1) { const hw = 6 + (y - pathTop) * (portrait ? 0.08 : 0.25); ctx.fillStyle = PIGMENT.path; ctx.fillRect(Math.round(W / 2 - hw + Math.sin(y / 20) * 4), y, Math.round(hw * 2), 1); }
      // A wall of wood behind the stands: a clearing has to be inside
      // something, or it reads as a field with two trees in it.
      if (portrait) {
        const br = rng(`backwood:${grove.slug}`);
        for (let i = 0; i < 18; i += 1) {
          const bs = sprite('tree', { stage: br() > 0.5 ? 'mature' : 'in_leaf', seed: `bw${grove.slug}${i}`, season, kind: br() > 0.6 ? 'pine' : 'broad' });
          ctx.drawImage(bs.canvas, Math.round(br() * (W + 40) - 20 - bs.ax), Math.round(76 + br() * 26 - bs.ay));
        }
        // A soft shadow under them, to seat the wall on the floor.
        for (let y = 96; y < 120; y += 1) {
          ctx.fillStyle = `rgba(20,34,24,${(0.24 * (1 - (y - 96) / 24)).toFixed(3)})`;
          ctx.fillRect(0, y, W, 1);
        }
      }
      const tr = rng(`tufts:${grove.slug}`);
      const floorTop = portrait ? 72 : 70;
      for (let i = 0; i < (portrait ? 44 : 30); i += 1) { const s = sprite('grassTuft', { seed: `gt${i}`, season }); ctx.drawImage(s.canvas, Math.floor(tr() * W), floorTop + Math.floor(tr() * (H - floorTop - 6))); }
      for (let i = 0; i < (portrait ? 12 : 6); i += 1) { const s = sprite('flowerPatch', { seed: `gf${i}`, n: 3, colors: [2, 3, 6], w: 10, h: 7 }); ctx.drawImage(s.canvas, Math.floor(tr() * W), floorTop + 20 + Math.floor(tr() * (H - floorTop - 30))); }
    },
    update(dt) { ff?.update(dt); bf?.update(dt); },
    objects(view, t) {
      const out = objects.map((o) => {
        const isSel = selected && o.id === selected;
        return isSel ? { ...o, draw: (ctx) => { const s = o.sprite; ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.scaleX, o.scaleY); ctx.drawImage(s.canvas, -s.ax, -s.ay); ctx.restore(); const m = sprite('marker', {}); ctx.drawImage(m.canvas, Math.round(o.x - m.ax), Math.round(o.y - o.sprite.h * o.scaleY - 8 - m.ay + Math.sin(t / 400) * 2)); } } : o;
      });
      if (ff) out.push({ x: 0, y: 10000, draw: (ctx) => ff.draw(ctx, t) });
      if (bf) out.push({ x: 0, y: 10000, draw: (ctx) => bf.draw(ctx, t) });
      return out;
    },
    light() { return LIGHT[hour] ?? LIGHT.morning; },
    lights() { return [...lamps, ...(ff?.lights() ?? [])]; },
    hit(x, y) {
      let best = null, bd = Infinity;
      for (const o of objects) {
        const w = o.sprite.w * o.scaleX, h = o.sprite.h * o.scaleY;
        if (x >= o.x - w / 2 - 3 && x <= o.x + w / 2 + 3 && y >= o.y - h - 3 && y <= o.y + 4) {
          const d = Math.hypot(x - o.x, y - (o.y - h / 2));
          if (d < bd) { bd = d; best = o; }
        }
      }
      return best;
    },
    select(id) { selected = id; },
    objectsList: objects,
  };
  return scene;
}

/**
 * A field of the Meadow: flowers for every mastered word, buds for the
 * ones met, bare earth for the rest. 320 × 140 world px.
 */
export function buildFieldScene(field, atmo) {
  const { hour, season } = atmo;
  const W = 320, H = 140;
  const grass = ramp((SEASON[season] ?? SEASON.summer).meadow);
  const n2 = noise2(`field-${field.id}`);
  const bf = season !== 'winter' && hour !== 'night' ? butterflies({ rect: { x: 10, y: 30, w: 300, h: 90 }, count: 1 + Math.min(4, Math.floor(field.mastered / 8)), seed: `bf-${field.id}` }) : null;
  const pollen = hour !== 'night' && season !== 'winter' ? particles({ kind: 'pollen', rect: { x: 0, y: 20, w: W, h: 110 }, count: 6 + Math.min(30, field.mastered), seed: `pollen-${field.id}` }) : null;
  const ff = hour === 'night' ? particles({ kind: 'fireflies', rect: { x: 10, y: 30, w: 300, h: 100 }, count: 6 + Math.min(14, Math.floor(field.mastered / 3)), seed: `ff-${field.id}` }) : null;
  return {
    backdrop: '#0A1230', W, H, focusY: 92,
    terrain(ctx) {
      const sky = SKY[hour] ?? SKY.morning;
      for (let y = 0; y < 44; y += 1) { ctx.fillStyle = mix(sky[1], sky[2], y / 44); ctx.fillRect(0, y, W, 1); }
      // Far hills
      for (let x = 0; x < W; x += 1) { const h = 30 + Math.floor(n2(x / 40, 1) * 14); ctx.fillStyle = mix(grass.light, '#B9D6C3', 0.5); ctx.fillRect(x, h, 1, 44 - h); }
      const fShade = mix(grass.base, grass.shade, 0.5), fLight = mix(grass.base, grass.light, 0.5);
      for (let y = 40; y < H; y += 1) for (let x = 0; x < W; x += 1) { const g = n2(x / 18, y / 18); ctx.fillStyle = g > 0.64 ? fLight : g < 0.38 ? fShade : grass.base; ctx.fillRect(x, y, 1, 1); }
      // One flower per word, in rows across the field: mastered = open
      // flower, met = bud, unmet = a dark seed mark.
      const cols = Math.ceil(Math.sqrt(field.total * 2.2));
      const cellW = (W - 20) / cols, cellH = 84 / Math.ceil(field.total / cols);
      const fr = rng(`flowers:${field.id}`);
      field.words.forEach((w, i) => {
        const cx = 10 + (i % cols) * cellW + fr() * cellW * 0.6, cy = 50 + Math.floor(i / cols) * cellH + fr() * cellH * 0.6;
        if (w.level >= 3) { const s = sprite('flower', { color: i % 7, seed: w.id, tall: w.level >= 4 }); ctx.drawImage(s.canvas, Math.round(cx - s.ax), Math.round(cy - s.ay)); }
        else if (w.level >= 1) { ctx.fillStyle = ramp(PIGMENT.grassDeep).base; ctx.fillRect(Math.round(cx), Math.round(cy) - 2, 1, 3); ctx.fillStyle = w.level === 2 ? '#F7C948' : '#9CCB74'; ctx.fillRect(Math.round(cx), Math.round(cy) - 3, 1, 1); }
        else { ctx.fillStyle = mix(grass.light, PIGMENT.sand, 0.5); ctx.fillRect(Math.round(cx), Math.round(cy), 1, 1); }
      });
      const tr = rng(`ftufts:${field.id}`);
      for (let i = 0; i < 16; i += 1) { const s = sprite('grassTuft', { seed: `ft${i}`, season }); ctx.drawImage(s.canvas, Math.floor(tr() * W), 44 + Math.floor(tr() * 90)); }
      const tree = sprite('tree', { stage: 'in_leaf', seed: `ftree-${field.id}`, season });
      ctx.drawImage(tree.canvas, 4, 46 - tree.h + 4);
    },
    update(dt) { bf?.update(dt); pollen?.update(dt); ff?.update(dt); },
    objects(view, t) { const out = []; if (pollen) out.push({ x: 0, y: 1, draw: (ctx) => pollen.draw(ctx, t) }); if (bf) out.push({ x: 0, y: 2, draw: (ctx) => bf.draw(ctx, t) }); if (ff) out.push({ x: 0, y: 3, draw: (ctx) => ff.draw(ctx, t) }); return out; },
    light() { return LIGHT[hour] ?? LIGHT.morning; },
    lights() { return ff?.lights() ?? []; },
    hit() { return null; },
  };
}

/** The Mirror Pond up close: koi for mastered sets, lilies, reeds. 320 × 150. */
export function buildPondScene(pond, atmo) {
  const { hour, season } = atmo;
  const W = 320, H = 150;
  const C = { cx: 160, cy: 92, rx: 120, ry: 44 };
  const n2 = noise2('pondscene');
  const grass = ramp((SEASON[season] ?? SEASON.summer).grass);
  const fish = pond.koi > 0 ? koi({ cx: C.cx, cy: C.cy, rx: C.rx, ry: C.ry, count: Math.min(14, pond.koi), seed: 'pondscene-koi' }) : null;
  const glints = waterGlints({ shapes: [C], seed: 'pond-glints', color: hour === 'night' ? 'rgba(200,214,240,0.7)' : 'rgba(232,246,255,0.85)' });
  const ff = hour === 'night' ? particles({ kind: 'fireflies', rect: { x: 20, y: 30, w: 280, h: 100 }, count: 8, seed: 'ff-pond' }) : null;
  return {
    backdrop: '#0A1230', W, H, focusY: 92,
    terrain(ctx) {
      const sky = SKY[hour] ?? SKY.morning;
      for (let y = 0; y < 40; y += 1) { ctx.fillStyle = mix(sky[1], sky[2], y / 40); ctx.fillRect(0, y, W, 1); }
      for (let y = 36; y < H; y += 1) for (let x = 0; x < W; x += 1) { const g = n2(x / 18, y / 18); ctx.fillStyle = g > 0.64 ? mix(grass.base, grass.light, 0.5) : g < 0.38 ? mix(grass.base, grass.shade, 0.5) : grass.base; ctx.fillRect(x, y, 1, 1); }
      const body = ramp(hour === 'night' ? '#213B5E' : hour === 'dusk' ? '#5F6BA8' : PIGMENT.water);
      for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
        const d = ((x - C.cx) ** 2) / (C.rx ** 2) + ((y - C.cy) ** 2) / (C.ry ** 2);
        if (d <= 1.08 && d > 1) { ctx.fillStyle = (x + y) & 1 ? PIGMENT.sand : ramp(PIGMENT.sand).shade; ctx.fillRect(x, y, 1, 1); }
        else if (d <= 1) { ctx.fillStyle = d < 0.5 ? body.shade : body.base; ctx.fillRect(x, y, 1, 1); }
      }
      // Reflections of the sky on the far half: a lighter dither.
      for (let y = C.cy - C.ry + 2; y < C.cy; y += 2) for (let x = (y & 2) ? 1 : 0; x < W; x += 4) { const d = ((x - C.cx) ** 2) / (C.rx ** 2) + ((y - C.cy) ** 2) / (C.ry ** 2); if (d < 0.9) { ctx.fillStyle = mix(body.base, sky[2], 0.35); ctx.fillRect(x, y, 2, 1); } }
      const lr = rng('pond-lilies-2');
      const lilies = Math.min(14, 3 + Math.floor(pond.mastered / 12));
      for (let i = 0; i < lilies; i += 1) { const a = lr() * Math.PI * 2, rad = 0.5 + lr() * 0.45; const s = sprite('lilypad', { seed: `pl${i}`, bloom: i % 3 === 0 && season !== 'winter' }); ctx.drawImage(s.canvas, Math.round(C.cx + Math.cos(a) * C.rx * rad - s.ax), Math.round(C.cy + Math.sin(a) * C.ry * rad - s.ay)); }
      const reedsS = sprite('reeds', { seed: 'preeds' });
      ctx.drawImage(reedsS.canvas, 24, 60); ctx.drawImage(reedsS.canvas, 284, 104); ctx.drawImage(reedsS.canvas, 140, 130);
      const tree = sprite('tree', { stage: 'mature', seed: 'pond-tree', season });
      ctx.drawImage(tree.canvas, 262 - tree.ax, 58 - tree.ay);
      const rock = sprite('rock', { seed: 'prock', size: 2 }); ctx.drawImage(rock.canvas, 40, 120);
    },
    update(dt) { fish?.update(dt); ff?.update(dt); },
    objects(view, t) { const out = [{ x: 0, y: 0, draw: (ctx) => glints.draw(ctx, t) }]; if (fish) out.push({ x: 0, y: 1, draw: (ctx) => fish.draw(ctx) }); if (ff) out.push({ x: 0, y: 2, draw: (ctx) => ff.draw(ctx, t) }); return out; },
    light() { return LIGHT[hour] ?? LIGHT.morning; },
    lights() { return [...(ff?.lights() ?? []), ...(hour === 'night' ? [{ x: C.cx, y: C.cy, r: 60, a: 0.14, color: '#9FB9E8' }] : [])]; },
    hit() { return null; },
  };
}

/** The Thicket path with its lanterns. 320 × 130. */
export function buildThicketScene(thicket, atmo) {
  const { hour, season } = atmo;
  const W = 320, H = 130;
  const night = hour === 'night' || hour === 'dusk';
  const n2 = noise2('thicketscene');
  const grass = ramp((SEASON[season] ?? SEASON.summer).grass);
  const spots = Array.from({ length: 13 }, (_, i) => ({ x: 14 + i * 24, y: 96 + (i % 2) * 14 }));
  const ff = night ? particles({ kind: 'fireflies', rect: { x: 10, y: 30, w: 300, h: 90 }, count: 10, seed: 'ff-th' }) : null;
  const lamps = spots.filter((_, i) => i < thicket.lanterns).map((s) => ({ x: s.x, y: s.y - 10, r: night ? 16 : 9, a: night ? 0.55 : 0.22, color: PIGMENT.lantern }));
  return {
    backdrop: '#0A1230', W, H, focusY: 84,
    terrain(ctx) {
      const sky = SKY[hour] ?? SKY.morning;
      for (let y = 0; y < 40; y += 1) { ctx.fillStyle = mix(sky[1], sky[2], y / 40); ctx.fillRect(0, y, W, 1); }
      for (let y = 34; y < H; y += 1) for (let x = 0; x < W; x += 1) { const g = n2(x / 16, y / 16); ctx.fillStyle = g > 0.55 ? mix(grass.base, PIGMENT.bramble, 0.3) : mix(grass.shade, PIGMENT.bramble, 0.4); ctx.fillRect(x, y, 1, 1); }
      for (let y = 88; y < 120; y += 1) { ctx.fillStyle = PIGMENT.path; ctx.fillRect(0, y + Math.round(Math.sin(y / 9) * 2), W, 1); }
      const br = rng('th-brambles');
      for (let i = 0; i < 26; i += 1) { const s = sprite('bramble', { seed: `tsb${i}`, season, lit: i % 3 === 0 && thicket.lanterns > i / 3 }); ctx.drawImage(s.canvas, Math.floor(br() * W) - 10, 30 + Math.floor(br() * 46)); }
      for (let i = 0; i < 4; i += 1) { const s = sprite('tree', { stage: i % 2 ? 'mature' : 'in_leaf', seed: `tht${i}`, season, kind: 'pine' }); ctx.drawImage(s.canvas, 20 + i * 80 - s.ax, 62 - s.ay); }
      spots.forEach((s, i) => { const l = sprite('lantern', { lit: i < thicket.lanterns }); ctx.drawImage(l.canvas, s.x - l.ax, s.y - l.ay); });
    },
    update(dt) { ff?.update(dt); },
    objects(view, t) { return ff ? [{ x: 0, y: 1, draw: (ctx) => ff.draw(ctx, t) }] : []; },
    light() { return LIGHT[hour] ?? LIGHT.morning; },
    lights() { return [...lamps, ...(ff?.lights() ?? [])]; },
    hit() { return null; },
  };
}

/** The Reading Room tower on its hill. 320 × 170. */
export function buildTowerScene(reading, atmo) {
  const { hour, season } = atmo;
  const W = 320, H = 170;
  const night = hour === 'night' || hour === 'dusk';
  const n2 = noise2('towerscene');
  const grass = ramp((SEASON[season] ?? SEASON.summer).grass);
  const cloudSys = clouds({ rect: { x: -30, y: 6, w: 380, h: 40 }, count: 3, seed: 'tower-clouds' });
  const birdSys = birds({ rect: { x: 0, y: 10, w: W, h: 60 }, seed: 'tower-birds', count: 2 });
  const lamps = [];
  if (night) for (let i = 0; i < Math.min(reading.litWindows, reading.floors * 2); i += 1) { const f = Math.floor(i / 2), side = i % 2 ? 4 : -4; lamps.push({ x: 160 + side, y: 150 - 8 - f * 11, r: 12, a: 0.4, color: PIGMENT.windowLight }); }
  return {
    backdrop: '#0A1230', W, H, focusY: 118,
    terrain(ctx) {
      const sky = SKY[hour] ?? SKY.morning;
      for (let y = 0; y < 110; y += 1) { ctx.fillStyle = y < 60 ? mix(sky[0], sky[1], y / 60) : mix(sky[1], sky[2], (y - 60) / 50); ctx.fillRect(0, y, W, 1); }
      if (night) { const r = rng('tstars'); for (let i = 0; i < 60; i += 1) { ctx.fillStyle = r() > 0.7 ? '#FFFFFF' : '#DDE6FF'; ctx.fillRect(Math.floor(r() * W), Math.floor(r() * 80), 1, 1); } }
      const mc = ramp(night ? '#2C3A64' : PIGMENT.mountainFar);
      for (let x = 0; x < W; x += 1) { const h = 78 - Math.floor(n2(x / 50, 1) * 30); ctx.fillStyle = mc.base; ctx.fillRect(x, h, 1, 110 - h); ctx.fillStyle = PIGMENT.mountainSnow; if (n2(x / 5, 3) > 0.45) ctx.fillRect(x, h, 1, 3); }
      for (let y = 104; y < H; y += 1) for (let x = 0; x < W; x += 1) { const d = ((x - 160) ** 2) / (150 ** 2) + ((y - 150) ** 2) / (50 ** 2); const g = n2(x / 18, y / 18); ctx.fillStyle = d < 0.5 ? mix(grass.base, grass.light, 0.4) : g > 0.64 ? mix(grass.base, grass.light, 0.5) : g < 0.38 ? mix(grass.base, grass.shade, 0.5) : grass.base; ctx.fillRect(x, y, 1, 1); }
      for (let y = 118; y < H; y += 1) { ctx.fillStyle = PIGMENT.path; ctx.fillRect(Math.round(160 - 4 - (y - 118) * 0.2), y, Math.round(8 + (y - 118) * 0.4), 1); }
      const tower = sprite('tower', { floors: reading.floors, lit: night ? reading.litWindows : 0, observatory: reading.observatory, night });
      ctx.drawImage(tower.canvas, 160 - tower.ax, 150 - tower.ay);
      const t1 = sprite('tree', { stage: 'mature', seed: 'tw1', season, kind: 'pine' }); ctx.drawImage(t1.canvas, 90 - t1.ax, 156 - t1.ay);
      const t2 = sprite('tree', { stage: 'in_leaf', seed: 'tw2', season }); ctx.drawImage(t2.canvas, 236 - t2.ax, 160 - t2.ay);
      const b = sprite('bush', { seed: 'twb', season }); ctx.drawImage(b.canvas, 196, 150);
      const rk = sprite('rock', { seed: 'twr', size: 1 }); ctx.drawImage(rk.canvas, 120, 158);
    },
    update(dt) { cloudSys.update(dt); birdSys.update(dt); },
    objects() { return [{ x: 0, y: 0, draw: (ctx) => { cloudSys.draw(ctx, night ? 0.5 : 0.9); birdSys.draw(ctx); } }]; },
    light() { return LIGHT[hour] ?? LIGHT.morning; },
    lights() { return lamps; },
    hit() { return null; },
  };
}

/** A generic building hero (the Quarter workshops, the Terraces hut, the Hearth). 320 × 140. */
export function buildBuildingScene(kind, level, atmo, extra = {}) {
  const { hour, season } = atmo;
  const W = 320, H = 170;
  const night = hour === 'night' || hour === 'dusk';
  const n2 = noise2(`bscene-${kind}`);
  const grass = ramp((SEASON[season] ?? SEASON.summer).grass);
  const sm = kind === 'cottage' && extra.practicedToday ? smoke({ x: 160 + 11, y: 118 - 34, seed: 'hs' }) : null;
  const catSys = kind === 'cottage' ? hearthCat({ x: 176, y: 122, seed: 'hero-cat', recipe: 'wick', lamp: true, lit: night }) : null;
  const bf = season !== 'winter' && !night ? butterflies({ rect: { x: 20, y: 60, w: 280, h: 60 }, count: 2, seed: `bf-${kind}` }) : null;
  const lamps = [];
  if (night) lamps.push({ x: kind === 'cottage' ? 152 : 176, y: kind === 'cottage' ? 108 : 102, r: 20, a: 0.45, color: PIGMENT.windowLight });
  return {
    backdrop: '#0A1230', W, H, focusY: 104,
    terrain(ctx) {
      const sky = SKY[hour] ?? SKY.morning;
      for (let y = 0; y < 70; y += 1) { ctx.fillStyle = mix(sky[1], sky[2], y / 70); ctx.fillRect(0, y, W, 1); }
      for (let x = 0; x < W; x += 1) { const h = 56 + Math.floor(n2(x / 40, 1) * 16); ctx.fillStyle = mix(grass.light, '#B9D6C3', 0.5); ctx.fillRect(x, h, 1, 72 - h); }
      for (let y = 68; y < H; y += 1) for (let x = 0; x < W; x += 1) { const g = n2(x / 18, y / 18); ctx.fillStyle = g > 0.64 ? mix(grass.base, grass.light, 0.5) : g < 0.38 ? mix(grass.base, grass.shade, 0.5) : grass.base; ctx.fillRect(x, y, 1, 1); }
      for (let y = 92; y < 140; y += 1) for (let x = 60; x < 260; x += 1) if (n2(x / 7, y / 7) > 0.35) { ctx.fillStyle = mix(grass.base, kind === 'cottage' ? PIGMENT.path : PIGMENT.stoneWarm, 0.45); ctx.fillRect(x, y, 1, 1); }
      const s = kind === 'cottage' ? sprite('cottage', { level, lit: night }) : sprite('workshop', { kind, level, lit: night });
      ctx.drawImage(s.canvas, 160 - s.ax, 118 - s.ay);
      const t1 = sprite('tree', { stage: 'mature', seed: `bt1-${kind}`, season }); ctx.drawImage(t1.canvas, 56 - t1.ax, 112 - t1.ay);
      const t2 = sprite('tree', { stage: 'in_leaf', seed: `bt2-${kind}`, season, kind: 'pine' }); ctx.drawImage(t2.canvas, 262 - t2.ax, 116 - t2.ay);
      const f = sprite('fence', { w: 30 }); ctx.drawImage(f.canvas, 100, 114); ctx.drawImage(f.canvas, 196, 114);
      const fp = sprite('flowerPatch', { seed: `bf-${kind}`, n: 6, colors: [0, 1, 3], w: 18, h: 9 }); ctx.drawImage(fp.canvas, 118, 122); ctx.drawImage(fp.canvas, 190, 124);
      const b2 = sprite('bush', { seed: `bb-${kind}`, season }); ctx.drawImage(b2.canvas, 30, 130); ctx.drawImage(b2.canvas, 280, 134);
    },
    update(dt) { sm?.update(dt); catSys?.update(dt); bf?.update(dt); },
    objects(view, t) { const out = []; if (sm) out.push({ x: 0, y: 0, draw: (ctx) => sm.draw(ctx) }); if (catSys) out.push({ x: 0, y: 1, draw: (ctx) => catSys.draw(ctx) }); if (bf) out.push({ x: 0, y: 2, draw: (ctx) => bf.draw(ctx) }); return out; },
    light() { return LIGHT[hour] ?? LIGHT.morning; },
    lights() { return lamps; },
    hit() { return null; },
  };
}

/* ------------------------------------------------------------------ */
/* The full-bleed backdrop behind a run                                */
/* ------------------------------------------------------------------ */

/**
 * A tall landscape of one place, painted once and left still: the sky of
 * the hour, a ridge, the ground, and the place's own signature — the
 * tower, the water, the brambles, the looms. Portrait (240 x 420) so a
 * phone covers it without cropping away what identifies the place.
 *
 * The run screens dim it heavily; it is there so the learner always knows
 * where in the valley they are standing, never to be stared at.
 */
export function buildBackdropScene(slug, state, atmo) {
  const { hour, season } = atmo;
  const W = 240, H = 340;
  const night = hour === 'night' || hour === 'dusk';
  const HOR = 124;                       // where the ground begins
  const n2 = noise2(`bd-${slug}`);
  const r = rng(`bd-${slug}`);
  const seasonPal = SEASON[season] ?? SEASON.summer;
  const grass = ramp(slug === 'meadow' ? seasonPal.meadow : seasonPal.grass);
  const lamps = [];
  // The window a phone actually shows: cover-zoom crops the sides, and the
  // sheet covers everything below y ~236. Every signature lives in here.
  const SAFE_X = 56, SAFE_W = 128, BAND_TOP = HOR + 6, BAND_BOT = HOR + 84;
  const stars = night ? Array.from({ length: 44 }, () => ({ x: Math.floor(r() * W), y: Math.floor(r() * (HOR - 34)), b: r() })) : [];

  const sky = (ctx) => {
    const s = SKY[hour] ?? SKY.morning;
    for (let y = 0; y < HOR; y += 1) {
      ctx.fillStyle = mix(mix(s[0], s[1], Math.min(1, y / 84)), s[2], Math.max(0, (y - 76) / 78));
      ctx.fillRect(0, y, W, 1);
    }
    for (const st of stars) { ctx.fillStyle = `rgba(255,255,255,${0.2 + st.b * 0.65})`; ctx.fillRect(st.x, st.y, 1, 1); }
    if (night) {
      // A moon, so a night backdrop has one warm thing in it.
      ctx.fillStyle = 'rgba(255,246,214,0.92)';
      for (let y = -7; y <= 7; y += 1) {
        const half = Math.floor(Math.sqrt(49 - y * y));
        for (let x = -half; x <= half; x += 1) {
          const dx = x + 3, dy = y - 1;
          if (dx * dx + dy * dy <= 42) continue;   // the bite that makes a crescent
          ctx.fillRect(190 + x, 36 + y, 1, 1);
        }
      }
    }
  };
  /** A ridge that lightens toward its base, the way distance works. */
  const ridge = (ctx, colour, haze, base, amp, freq) => {
    for (let x = 0; x < W; x += 1) {
      const h = base + Math.floor(n2(x / freq, 3) * amp);
      const span = Math.max(1, HOR - h + 2);
      for (let y = h; y < HOR + 2; y += 1) {
        ctx.fillStyle = mix(colour, haze, Math.min(0.55, ((y - h) / span) * 0.7));
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.fillStyle = mix(colour, '#FFFFFF', 0.28);
      ctx.fillRect(x, h, 1, 1);
    }
  };
  const ground = (ctx) => {
    const gBase = grass.base;
    const gLight = mix(grass.base, grass.light, 0.55);
    const gShade = mix(grass.base, grass.shade, 0.55);
    for (let y = HOR; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const g = n2(x / 20, y / 20);
        ctx.fillStyle = g > 0.63 ? gLight : g < 0.37 ? gShade : gBase;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    for (let y = HOR; y < HOR + 9; y += 1) { ctx.fillStyle = `rgba(20,30,40,${0.18 * (1 - (y - HOR) / 9)})`; ctx.fillRect(0, y, W, 1); }
    // The very bottom darkens: the ground the learner is standing on.
    for (let y = H - 56; y < H; y += 1) { ctx.fillStyle = `rgba(12,18,34,${0.5 * ((y - (H - 56)) / 56) ** 1.4})`; ctx.fillRect(0, y, W, 1); }
  };
  const treeline = (ctx, y, n, kind, stage) => {
    for (let i = 0; i < n; i += 1) {
      const s = sprite('tree', { stage, seed: `bdt-${slug}-${i}`, season, kind });
      ctx.drawImage(s.canvas, Math.round(SAFE_X + r() * SAFE_W - s.ax), Math.round(y + r() * 12 - s.ay));
    }
  };
  const scatter = (ctx, name, n, y0, y1, params = {}) => {
    for (let i = 0; i < n; i += 1) {
      const s = sprite(name, { seed: `bds-${slug}-${name}-${i}`, season, ...params });
      ctx.drawImage(s.canvas, Math.round(r() * W - s.ax / 2), Math.round(y0 + r() * (y1 - y0) - s.ay));
    }
  };

  /* Every place puts its signature in the band just under the horizon
     (y 150–290), because that is the part of the screen a sheet does not
     cover on a phone. */
  const terrain = (ctx) => {
    sky(ctx);
    const hazeC = SKY[hour]?.[2] ?? '#EEEEEE';
    ridge(ctx, mix(PIGMENT.mountainFar, hazeC, night ? 0.3 : 0.45), hazeC, 58, 20, 46);
    ridge(ctx, mix(PIGMENT.mountain, night ? '#16264C' : '#8FA6CE', 0.38), hazeC, 90, 14, 34);
    // A treeline along the far bank, so the ground never meets the hills
    // in a straight line.
    {
      const tl = ramp(night ? '#1E3A2C' : mix(PIGMENT.pine, hazeC, 0.28));
      for (let x = 0; x < W; x += 1) {
        const h = HOR - 4 - Math.floor(n2(x / 9, 7) * 9);
        ctx.fillStyle = (x & 1) ? tl.base : tl.shade;
        ctx.fillRect(x, h, 1, HOR - h + 1);
      }
    }
    ground(ctx);

    if (slug === 'meadow') {
      treeline(ctx, HOR + 2, 3, 'broad', 'mature');
      const bloom = Math.min(1, (state?.meadow?.mastered ?? 0) / 160);
      for (let i = 0; i < 34 + Math.round(bloom * 90); i += 1) {
        const s = sprite('flower', { color: Math.floor(r() * 7), seed: `bdf${i}`, tall: r() > 0.7 });
        ctx.drawImage(s.canvas, Math.round(r() * W - s.ax), Math.round(BAND_TOP + r() * 110 - s.ay));
      }
      if (state?.meadow?.path) for (let x = 0; x < W; x += 14) { const s = sprite('paving', { w: 16, seed: `mp${x}` }); ctx.drawImage(s.canvas, x - 2, BAND_BOT - 8); }
      if (state?.meadow?.hives) for (let i = 0; i < 3; i += 1) { const s = sprite('hive', { seed: `bh${i}` }); ctx.drawImage(s.canvas, SAFE_X + 8 + i * 38 - s.ax, BAND_TOP + 28 - s.ay); }
      scatter(ctx, 'grassTuft', 20, HOR + 10, HOR + 150);
    } else if (slug === 'pond') {
      const C = { cx: 120, cy: 206, rx: 96, ry: 44 };
      const body = ramp(night ? '#213B5E' : hour === 'dusk' ? '#5F6BA8' : PIGMENT.water);
      for (let y = HOR; y < H; y += 1) {
        for (let x = 0; x < W; x += 1) {
          const d = ((x - C.cx) ** 2) / (C.rx ** 2) + ((y - C.cy) ** 2) / (C.ry ** 2);
          if (d > 1) continue;
          const g = n2(x / 14, y / 9);
          ctx.fillStyle = d > 0.87 ? mix(body.light, PIGMENT.sand, 0.35) : g > 0.6 ? body.light : g < 0.4 ? body.shade : body.base;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      for (let i = 0; i < 8; i += 1) { const s = sprite('lilypad', { seed: `bdl${i}`, bloom: i % 3 === 0 }); ctx.drawImage(s.canvas, Math.round(SAFE_X + r() * SAFE_W - s.ax), Math.round(184 + r() * 52 - s.ay)); }
      scatter(ctx, 'reeds', 8, HOR + 2, HOR + 22);
      treeline(ctx, HOR - 4, 2, 'broad', 'in_leaf');
      if (state?.pond?.lanterns) {
        for (let i = 0; i < 4; i += 1) {
          const s = sprite('lantern', { lit: true });
          const x = SAFE_X + 8 + i * 38, y = HOR + 10;
          ctx.drawImage(s.canvas, x - s.ax, y - s.ay);
          lamps.push({ x, y: y - 8, r: 22, a: night ? 0.65 : 0.2, color: PIGMENT.lantern });
        }
      }
      if (state?.pond?.heron) { const s = sprite('heron', {}); ctx.drawImage(s.canvas, 172 - s.ax, HOR + 30 - s.ay); }
    } else if (slug === 'thicket') {
      for (let i = 0; i < 18; i += 1) {
        const lit = i < (state?.thicket?.lanterns ?? 0);
        const s = sprite('bramble', { seed: `bdb${i}`, season, lit });
        ctx.drawImage(s.canvas, Math.round(r() * W - s.ax), Math.round(HOR + 4 + r() * 120 - s.ay));
      }
      if (state?.thicket?.path) for (let x = 0; x < W; x += 14) { const s = sprite('paving', { w: 16, seed: `tp${x}` }); ctx.drawImage(s.canvas, x - 2, BAND_BOT - 20); }
      for (let i = 0; i < Math.min(6, state?.thicket?.lanterns ?? 0); i += 1) {
        const s = sprite('lantern', { lit: true });
        const x = SAFE_X + 10 + (i % 3) * 54, y = HOR + 22 + Math.floor(i / 3) * 42;
        ctx.drawImage(s.canvas, x - s.ax, y - s.ay);
        lamps.push({ x, y: y - 10, r: 24, a: night ? 0.7 : 0.22, color: PIGMENT.lantern });
      }
      if (state?.thicket?.arch) { const s = sprite('arch', {}); ctx.drawImage(s.canvas, 120 - s.ax, HOR + 28 - s.ay); }
      treeline(ctx, HOR - 8, 4, 'pine', 'mature');
    } else if (slug === 'rootwood') {
      treeline(ctx, HOR - 4, 4, 'broad', 'ancient');
      treeline(ctx, HOR + 30, 4, 'broad', 'mature');
      if (state?.built?.rootShrine) { const s = sprite('shrine', {}); ctx.drawImage(s.canvas, 120 - s.ax, HOR + 66 - s.ay); }
      scatter(ctx, 'rootStone', 4, HOR + 40, HOR + 100);
      scatter(ctx, 'grassTuft', 14, HOR + 8, HOR + 150);
    } else if (slug === 'reading-room') {
      const t = sprite('tower', { floors: state?.reading?.floors ?? 1, lit: night ? (state?.reading?.litWindows ?? 0) : 0, observatory: state?.reading?.observatory, night });
      ctx.drawImage(t.canvas, 120 - t.ax, HOR + 54 - t.ay);
      if (night || state?.built?.rrLamp) lamps.push({ x: 120, y: HOR + 22, r: 42, a: night ? 0.55 : 0.18, color: PIGMENT.windowLight });
      treeline(ctx, HOR + 4, 3, 'pine', 'in_leaf');
      scatter(ctx, 'grassTuft', 12, HOR + 10, HOR + 150);
    } else if (slug === 'terraces') {
      for (let i = 0; i < 5; i += 1) {
        const wall = sprite('terraceWall', { w: W - 16, level: Math.max(0, Math.min(3, (state?.terraces?.level ?? 0) - i)) });
        ctx.drawImage(wall.canvas, 8, HOR + 6 + i * 26);
      }
      if (state?.terraces?.arbour) { const s = sprite('arbour', {}); ctx.drawImage(s.canvas, 120 - s.ax, HOR + 4 - s.ay); }
      scatter(ctx, 'bush', 6, HOR + 4, HOR + 120, { berries: true });
    } else if (slug === 'loom' || slug === 'table' || slug === 'bench') {
      const s = sprite('workshop', { kind: slug, level: state?.[slug]?.level ?? 0, lit: night });
      ctx.drawImage(s.canvas, 116 - s.ax, HOR + 56 - s.ay);
      if (night || state?.built?.quarterLamps) {
        const l = sprite('lantern', { lit: true });
        ctx.drawImage(l.canvas, 158 - l.ax, HOR + 56 - l.ay);
        lamps.push({ x: 158, y: HOR + 44, r: 26, a: night ? 0.6 : 0.2, color: PIGMENT.lantern });
      }
      if (state?.built?.quarterSquare) {
        for (let i = 0; i < W; i += 14) { const pv = sprite('paving', { w: 16, seed: `qp${i}` }); ctx.drawImage(pv.canvas, i - 2, HOR + 62); }
        const st = sprite('stall', { colour: slug === 'loom' ? 0 : slug === 'table' ? 1 : 2 });
        ctx.drawImage(st.canvas, 70 - st.ax, HOR + 80 - st.ay);
        const wl = sprite('well', {}); ctx.drawImage(wl.canvas, 168 - wl.ax, HOR + 84 - wl.ay);
      }
      treeline(ctx, HOR - 2, 2, 'broad', 'mature');
      scatter(ctx, 'grassTuft', 12, HOR + 10, HOR + 150);
    } else if (slug === 'wilds') {
      for (let y = HOR; y < H; y += 1) {
        const t = (y - HOR) / (H - HOR);
        const w = 6 + t * 46, cx = 120 + Math.sin(t * 2.3) * 14;
        for (let x = Math.round(cx - w / 2); x < Math.round(cx + w / 2); x += 1) {
          if (x < 0 || x >= W) continue;
          ctx.fillStyle = n2(x / 6, y / 6) > 0.5 ? PIGMENT.path : PIGMENT.pathEdge;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      if (state?.built?.wildsLanterns) {
        for (let i = 0; i < 4; i += 1) {
          const s = sprite('lantern', { lit: true });
          const x = i % 2 ? 158 : 82, y = HOR + 16 + i * 38;
          ctx.drawImage(s.canvas, x - s.ax, y - s.ay);
          lamps.push({ x, y: y - 10, r: 24, a: night ? 0.65 : 0.2, color: PIGMENT.lantern });
        }
      }
      treeline(ctx, HOR - 8, 4, 'pine', 'mature');
      scatter(ctx, 'rock', 5, HOR + 16, HOR + 120, { size: 2 });
    } else {
      treeline(ctx, HOR - 6, 3, 'broad', 'mature');
      const s = sprite('cottage', { level: state?.hearth?.level ?? 1, lit: night, smoke: false });
      ctx.drawImage(s.canvas, 120 - s.ax, HOR + 56 - s.ay);
      lamps.push({ x: 120, y: HOR + 36, r: night ? 34 : 20, a: night ? 0.55 : 0.16, color: PIGMENT.windowLight });
      // A lamp by the door, lit after dark: the one Wick keeps.
      {
        const ln = sprite('lantern', { lit: true });
        ctx.drawImage(ln.canvas, 92 - ln.ax, HOR + 58 - ln.ay);
        lamps.push({ x: 92, y: HOR + 48, r: night ? 26 : 14, a: night ? 0.6 : 0.14, color: PIGMENT.lantern });
      }
      // Wick, on the step. He is the reason this screen is a home and not
      // a building, and he is the same cat who does the talking.
      {
        const wk = sprite('wick', { pose: 'sit', lamp: false, lit: true });
        ctx.drawImage(wk.canvas, 152 - wk.ax, HOR + 64 - wk.ay);
      }
      if (state?.built?.stonePaths) for (let x = 0; x < W; x += 14) { const pv = sprite('paving', { w: 16, seed: `hp${x}` }); ctx.drawImage(pv.canvas, x - 2, HOR + 64); }
      // In the band a phone actually shows, not below the sheet.
      scatter(ctx, 'flowerPatch', 5, HOR + 22, HOR + 70, { n: 6, colors: [0, 1, 3], w: 18, h: 9 });
      scatter(ctx, 'grassTuft', 8, HOR + 16, HOR + 76, { size: 2 });
      scatter(ctx, 'bush', 3, HOR + 10, HOR + 40, {});
    }
  };

  const light = LIGHT[hour] ?? LIGHT.morning;
  // A backdrop is lit a little more kindly than the map: a run must be
  // readable at midnight without the place disappearing.
  const softened = { ...light, strength: light.strength * 0.78 };

  return {
    backdrop: (SKY[hour] ?? SKY.morning)[0], W, H, focusY: 196,
    terrain,
    beyond(ctx, { oy, z, w, h }) {
      const s = SKY[hour] ?? SKY.morning;
      const tinted = multiplyTint(s[0], softened.tint, softened.strength);
      if (oy > 0) { ctx.fillStyle = tinted; ctx.fillRect(0, 0, w, oy + 2); }
      const bottom = oy + H * z;
      if (bottom < h) { ctx.fillStyle = multiplyTint(mix(grass.shade, '#121B2C', 0.62), softened.tint, softened.strength); ctx.fillRect(0, bottom - 2, w, h - bottom + 2); }
    },
    update() { /* still */ },
    objects() { return []; },
    light() { return softened; },
    lights() { return lamps; },
    hit() { return null; },
  };
}
