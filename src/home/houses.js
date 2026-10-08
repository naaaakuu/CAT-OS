/**
 * houses.js — every house grows with the section it holds.
 *
 * Owner, 2026-10-06: "when a player improves in a particular section, that
 * house area should also significantly improve." Each of the eight houses
 * reads its own stage, 0 to 10 (economy.js houseStages: the subject's own
 * questions, never time), and climbs the same ladder, each rung its own:
 *
 *   0  asleep: the colour a little faded, the windows dark
 *   1  awake: smoke from the chimney, the lamp by the door, its own machine
 *      starts (the workshop gear turns, the clock ticks, the telescope pans)
 *   2  lights in the windows, the first flowers
 *   3  its own keepsake by the door, more flowers
 *   4  a garland: bunting, fairy lights or star lanterns
 *   5  its first wonder (floating pages, a windmill, an orrery, sunflowers,
 *      arrows finding the bullseye, the bell, falling petals, camp lanterns)
 *   6  birds on the roof, butterflies by day, fireflies by night
 *   7  its second wonder (words rising from the lectern, a balloon, the night
 *      sky, the vegetable bed, a weathervane, pigeons, dock lanterns, fireworks)
 *   8  golden dust in the air, the fullest flowers
 *   9  a golden glow round the whole house
 *  10  a crown of light over the roof
 *
 * and the colour of the painting round it warms from faded to rich as it
 * goes. What does not move is baked once into a copy of the painting
 * (bakeVillage: grading, dark windows, flowers, keepsakes), so it costs
 * nothing per frame; what moves is drawn by createHouseLife onto the scene
 * canvas, only for houses on screen. Painting pixels throughout.
 */

import { WINDOWS } from '../pets/paths.js';
import {
  canvasOf, stamp, glow, glowSprite, glyphSprite, flowerBush, pottedPlant, sunflowerHead, pumpkin, lanternSprite, starLanternSprite,
  bookStack, cogCrate, telescopeSprite, teaSet, logBench, roseBasket, mendingCart, balloonSprite, crownStarSprite,
  drawBunting, drawFairyLights, drawBird, drawPage, drawWindmill, drawRingHalf, drawArrow, twinkle, litEllipse, INK, rgba,
} from './paint.js';
import { rng } from '../world/engine/palette.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);

/* ------------------------------------------------------------------ */
/* Where everything goes, house by house (read off gridded crops)       */
/* ------------------------------------------------------------------ */

/**
 * mask      the ellipse whose colour follows the stage (feathered)
 * windows   WINDOWS indices that light up at stage 2
 * lamps     LAMPS indices that are this house's own (lit from stage 1)
 * chimney   where its smoke rises from stage 1 (null: none)
 * flowers   [x, y, kind, size, stage]
 * keep      the stage-3 keepsake: [sprite name, x, y]
 * garland   the stage-4 string: kind and its two ends
 * perch     where birds sit from stage 6
 * aura      the stage-9 glow; crown: the stage-10 star
 */
export const HOUSE_ART = {
  chai: {
    mask: [285, 150, 235, 165], windows: [0, 1, 2, 3, 4, 5], lamps: [0, 1, 2, 3], chimney: { x: 228, y: 42 },
    flowers: [[112, 252, 'rose', 1, 2], [488, 292, 'cream', 1, 2], [205, 292, 'lilac', 1, 3], [540, 300, 'sun', 1, 3], [150, 300, 'coral', 1.15, 8], [470, 238, 'rose', 1.05, 8]],
    keep: ['books', 440, 284], garland: [{ kind: 'bunting', a: [304, 18], b: [136, 146], sag: 10, n: 10 }, { kind: 'bunting', a: [308, 18], b: [446, 126], sag: 9, n: 9 }],
    perch: [[182, 90], [368, 80], [292, 58]], aura: [290, 165, 190], crown: [306, 24], motes: [285, 175, 150, 80],
    wonders: ['pages', 'letters'],
  },
  ginger: {
    mask: [770, 140, 240, 150], windows: [6, 7], lamps: [4, 5, 6], chimney: { x: 860, y: 18 },
    flowers: [[612, 286, 'rose', 1, 2], [930, 300, 'sun', 1, 2], [575, 248, 'lilac', 1, 3], [968, 248, 'cream', 1, 3], [690, 292, 'coral', 1.15, 8], [1000, 292, 'rose', 1.05, 8]],
    keep: ['cogs', 600, 244], garland: [{ kind: 'lights', a: [858, 36], b: [962, 148], sag: 12, n: 12 }, { kind: 'lights', a: [688, 52], b: [592, 146], sag: 10, n: 11 }],
    perch: [[722, 48], [784, 43], [826, 39]], aura: [770, 150, 200], crown: [800, 30], motes: [770, 160, 160, 80],
    wonders: ['windmill', 'balloon'],
  },
  mallow: {
    mask: [1290, 150, 220, 150], windows: [8, 9, 10], lamps: [7, 8, 9], chimney: null,
    flowers: [[1160, 292, 'lilac', 1, 2], [1352, 252, 'sky', 1, 2], [1222, 288, 'cream', 1, 3], [1488, 282, 'lilac', 1, 3], [1105, 262, 'sky', 1.1, 8], [1410, 296, 'cream', 1.1, 8]],
    keep: ['telescope', 1418, 240], garland: { kind: 'stars', a: [1398, 203], b: [1502, 236], sag: 7, n: 7 },
    perch: [[1196, 137], [1262, 146], [1384, 139]], aura: [1290, 150, 190], crown: [1290, 30], motes: [1290, 160, 150, 80],
    wonders: ['orrery', 'sky'],
  },
  matcha: {
    mask: [262, 402, 215, 125], windows: [11, 12, 13], lamps: [14], chimney: { x: 240, y: 318 },
    flowers: [[62, 432, 'cream', 1, 2], [300, 490, 'rose', 1, 2], [430, 470, 'lilac', 1, 3], [150, 492, 'sun', 1, 3], [20, 466, 'coral', 1.1, 8], [372, 492, 'rose', 1.1, 8]],
    keep: ['sprouts', 396, 446], garland: { kind: 'lights', a: [200, 382], b: [338, 372], sag: 9, n: 11 },
    perch: [[252, 322], [298, 316], [336, 313]], aura: [262, 405, 180], crown: [282, 300], motes: [262, 410, 150, 70],
    wonders: ['sunflowers', 'garden'],
  },
  mochi: {
    mask: [1272, 392, 220, 130], windows: [14], lamps: [19, 20], chimney: { x: 1339, y: 278 },
    flowers: [[1092, 456, 'cream', 1, 2], [1405, 492, 'sun', 1, 2], [1190, 486, 'coral', 1, 3], [1500, 470, 'cream', 1, 3], [1060, 410, 'lilac', 1.1, 8], [1330, 500, 'rose', 1.05, 8]],
    keep: ['tea', 1146, 441], garland: { kind: 'pennants', a: [1376, 380], b: [1496, 406], sag: 7, n: 9 },
    perch: [[1212, 300], [1262, 295], [1302, 292]], aura: [1272, 395, 180], crown: [1266, 278], motes: [1272, 400, 150, 70],
    wonders: ['arrows', 'vane'],
  },
  biscuit: {
    mask: [300, 652, 205, 125], windows: [15, 16, 17, 18], lamps: [15], chimney: { x: 214, y: 562 },
    flowers: [[455, 768, 'cream', 1, 2], [150, 602, 'sun', 1, 2], [535, 742, 'lilac', 1, 3], [100, 650, 'cream', 1, 3], [520, 612, 'coral', 1.1, 8], [395, 772, 'sky', 1.05, 8]],
    keep: ['roses', 352, 744], garland: { kind: 'lights', a: [398, 656], b: [520, 702], sag: 10, n: 11 },
    perch: [[242, 598], [292, 584], [334, 590]], aura: [300, 655, 180], crown: [286, 566], motes: [300, 660, 150, 70],
    wonders: ['petals', 'docklights'],
  },
  sesame: {
    mask: [1290, 682, 190, 170], windows: [19, 20], lamps: [21], chimney: null,
    flowers: [[1405, 768, 'lilac', 1, 2], [1168, 822, 'cream', 1, 2], [1460, 690, 'sky', 1, 3], [1205, 842, 'lilac', 1, 3], [1112, 760, 'coral', 1.1, 8], [1425, 820, 'cream', 1.05, 8]],
    keep: ['cart', 1186, 806], garland: { kind: 'bunting', a: [1166, 706], b: [1300, 698], sag: 10, n: 10 },
    perch: [[1212, 650], [1254, 641], [1302, 600], [1362, 598]], aura: [1292, 690, 185], crown: [1335, 488], motes: [1290, 690, 140, 90],
    wonders: ['bell', 'pigeons'],
  },
  toffee: {
    mask: [815, 820, 205, 150], windows: [], lamps: [17, 18], chimney: null,
    flowers: [[668, 902, 'sun', 1, 2], [968, 880, 'coral', 1, 2], [640, 820, 'cream', 1, 3], [990, 812, 'sun', 1, 3], [700, 960, 'rose', 1.1, 8], [945, 950, 'cream', 1.1, 8]],
    keep: ['logs', 880, 926], garland: { kind: 'lights', a: [729, 742], b: [889, 742], sag: 14, n: 13 },
    perch: [[762, 700], [812, 694], [862, 700]], aura: [815, 830, 190], crown: [810, 690], motes: [815, 840, 150, 70],
    wonders: ['camplights', 'fireworks'],
  },
};

/** The order houses are drawn in: back (top of the painting) to front. */
const DRAW_ORDER = Object.keys(HOUSE_ART).sort((a, b) => HOUSE_ART[a].mask[1] - HOUSE_ART[b].mask[1]);

/** LAMPS that belong to a house (lit from stage 1); the rest are the village's and always lit. */
export const LAMP_HOUSE = new Map(Object.entries(HOUSE_ART).flatMap(([id, h]) => h.lamps.map((i) => [i, id])));
/** WINDOWS that belong to a house (lit from stage 2). */
export const WINDOW_HOUSE = new Map(Object.entries(HOUSE_ART).flatMap(([id, h]) => h.windows.map((i) => [i, id])));

const stageOf = (stages, id) => clamp(Math.floor(Number(stages?.[id]) || 0), 0, 10);

/* ------------------------------------------------------------------ */
/* Colour: the painting round a house warms as it grows                 */
/* ------------------------------------------------------------------ */

/** Saturation, brightness and warmth at a stage: faded at 0, the painting itself at 3, rich and golden at 10. */
export function gradeOf(stage) {
  const s = clamp(stage, 0, 10);
  if (s <= 3) { const t = s / 3; return { sat: 0.8 + 0.2 * t, bri: 0.95 + 0.05 * t, warm: -0.35 * (1 - t) }; }
  const t = (s - 3) / 7;
  return { sat: 1 + 0.15 * t, bri: 1 + 0.045 * t, warm: 0.6 * t };
}

/** Build the per-pixel grader for these stages: returns f(data, i, x, y) that rewrites one RGBA pixel in place. */
function grader(stages) {
  const houses = Object.entries(HOUSE_ART).map(([id, h]) => {
    const st = stageOf(stages, id), g = gradeOf(st), [cx, cy, rx, ry] = h.mask;
    return { id, st, ...g, cx, cy, rx, ry, x0: cx - rx, x1: cx + rx, y0: cy - ry, y1: cy + ry,
      dark: st < 2 ? h.windows.map((i) => WINDOWS[i]) : [], warmWin: st >= 6 ? h.windows.map((i) => WINDOWS[i]) : [] };
  }).filter((h) => !(h.sat === 1 && h.bri === 1 && h.warm === 0 && !h.dark.length && !h.warmWin.length));
  return (d, i, x, y) => {
    let W = 0, sat = 0, bri = 0, warm = 0;
    let dimF = 0, glowF = 0;
    for (const h of houses) {
      if (x < h.x0 || x > h.x1 || y < h.y0 || y > h.y1) continue;
      const dx = (x - h.cx) / h.rx, dy = (y - h.cy) / h.ry, e = Math.sqrt(dx * dx + dy * dy);
      if (e < 1) {
        const w = ease(clamp((1 - e) / 0.4, 0, 1));
        W += w; sat += w * h.sat; bri += w * h.bri; warm += w * h.warm;
      }
      for (const win of h.dark) { const q = Math.hypot(x - win.x, y - win.y) / (win.r * 1.05); if (q < 1) dimF = Math.max(dimF, (1 - q) ** 0.6); }
      for (const win of h.warmWin) { const q = Math.hypot(x - win.x, y - win.y) / (win.r * 0.9); if (q < 1) glowF = Math.max(glowF, (1 - q) ** 0.8); }
    }
    if (!W && !dimF && !glowF) return;
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (W) {
      const k = Math.min(1, W), n = W > 1 ? W : 1;
      const S = 1 + (sat / n - 1) * k, B = 1 + (bri / n - 1) * k, T = (warm / n) * k;
      const L = 0.299 * r + 0.587 * g + 0.114 * b;
      r = (L + (r - L) * S) * B + T * 18; g = (L + (g - L) * S) * B + T * 6; b = (L + (b - L) * S) * B - T * 16;
    }
    if (dimF || glowF) {
      const L = 0.299 * r + 0.587 * g + 0.114 * b;
      // Only the lit glass: warm and bright. The frames and the wall stay as painted.
      const lit = clamp((r - b - 26) / 70, 0, 1) * clamp((L - 96) / 90, 0, 1);
      if (dimF) { const f = dimF * lit * 0.86; r += (64 - r) * f; g += (62 - g) * f; b += (80 - b) * f; }
      if (glowF) { const f = glowF * lit * 0.28; r += (255 - r) * f; g += (222 - g) * f; b += (150 - b) * f; }
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  };
}

const idle = () => new Promise((res) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => res(), { timeout: 120 }) : setTimeout(res, 16)));

/** Grade pixels of `img` (painting-sized) in slices so a frame is never held for long. Returns ImageData. */
async function gradePixels(ctx, w, h, stages, map = (x, y) => [x, y], isAborted = () => false) {
  const f = grader(stages);
  const data = ctx.getImageData(0, 0, w, h), d = data.data;
  let y = 0;
  while (y < h) {
    const t0 = performance.now();
    for (; y < h && performance.now() - t0 < 7; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        if (!d[i + 3]) continue;
        const [px, py] = map(x, y);
        f(d, i, px, py);
      }
    }
    if (y < h) { await idle(); if (isAborted()) return null; }
  }
  return data;
}

/* ------------------------------------------------------------------ */
/* The baked village: graded painting + everything that keeps still     */
/* ------------------------------------------------------------------ */

const KEEPSAKE = {
  books: () => bookStack(1), cogs: () => cogCrate(1), telescope: () => telescopeSprite(), sprouts: () => pottedPlant('sprout', 1),
  tea: () => teaSet(), roses: () => roseBasket(), cart: () => mendingCart(), logs: () => logBench(),
};

/** Paint the props that do not move onto a painting-sized context. */
export function stampStatics(g, stages) {
  for (const id of DRAW_ORDER) {
    const h = HOUSE_ART[id], st = stageOf(stages, id);
    if (st < 2) continue;
    for (const [x, y, kind, size, from] of h.flowers) if (st >= from) stamp(g, flowerBush(kind, Math.round(x + y) % 7, size), x, y);
    if (st >= 3 && h.keep) {
      const [k, x, y] = h.keep;
      stamp(g, KEEPSAKE[k](), x, y);
      if (k === 'sprouts') stamp(g, pottedPlant('rose', 2), x + 13, y + 3);
    }
    if (id === 'sesame' && st >= 3) { stamp(g, pottedPlant('lavender', 1), 1226, 800); stamp(g, pottedPlant('lavender', 2), 1290, 798); }
    if (id === 'matcha' && st >= 7) { stamp(g, pumpkin(1, 1.35), 236, 474); stamp(g, pumpkin(2, 1.1), 176, 476); stamp(g, pumpkin(3, 0.9), 258, 470); }
    if (id === 'mochi' && st >= 5) {
      // Arrows that found the bullseye stay in the door's target.
      const n = st >= 9 ? 3 : st >= 7 ? 2 : 1;
      for (let k = 0; k < n; k += 1) drawArrow(g, 1244 + (k - 1) * 3.2, 414 + (k % 2) * 2.4, Math.PI + 0.18 - k * 0.16, { len: 11 });
    }
  }
}

/**
 * The painting as this learner's village has grown it: graded colour, dark
 * or lit windows, and the props that keep still. Resolves to a canvas the
 * size of the painting (or null if `isAborted` turns true while it works).
 */
export async function bakeVillage(img, stages, { isAborted = () => false } = {}) {
  const w = img.naturalWidth || 1536, h = img.naturalHeight || 1024;
  const c = canvasOf(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, w, h);
  const data = await gradePixels(g, w, h, stages, undefined, isAborted);
  if (!data) return null;
  g.putImageData(data, 0, 0);
  stampStatics(g, stages);
  return c;
}

/**
 * The living painting's cut-outs (src/home/motion.js) graded the same way,
 * so a turning gear or a waving banner is never a brighter patch than the
 * painting round it. `at` is the atlas table: [x, y, w, h, ax, ay] per patch.
 */
export async function gradeAtlas(atlasImg, at, stages, { isAborted = () => false } = {}) {
  const w = atlasImg.naturalWidth, h = atlasImg.naturalHeight;
  const c = canvasOf(w, h), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(atlasImg, 0, 0);
  // atlas pixel -> painting pixel, through whichever patch rect holds it
  const owner = new Int16Array(w * h).fill(-1);
  at.forEach(([, , pw, ph, ax, ay], k) => { for (let y = ay; y < ay + ph && y < h; y += 1) for (let x = ax; x < ax + pw && x < w; x += 1) owner[y * w + x] = k; });
  const map = (x, y) => { const k = owner[y * w + x]; if (k < 0) return [-1e4, -1e4]; const [px, py, , , ax, ay] = at[k]; return [px + x - ax, py + y - ay]; };
  const data = await gradePixels(g, w, h, stages, map, isAborted);
  if (!data) return null;
  g.putImageData(data, 0, 0);
  return c;
}

/* ------------------------------------------------------------------ */
/* The living houses: what moves, drawn each frame for houses in view   */
/* ------------------------------------------------------------------ */

/** A house's bounding box for culling (its mask, plus room for things above the roof). */
const boxOf = (h) => { const [cx, cy, rx, ry] = h.mask; return { x0: cx - rx - 40, y0: Math.max(0, cy - ry - 90), x1: cx + rx + 40, y1: cy + ry + 30 }; };
const BOX = Object.fromEntries(Object.entries(HOUSE_ART).map(([id, h]) => [id, boxOf(h)]));
const visible = (b, r) => b.x1 > r.x && b.x0 < r.x + r.w && b.y1 > r.y && b.y0 < r.y + r.h;

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * @param {{ reduced: boolean, stages: object }} o
 * @returns {{ setStages(s), draw(g, now, dt, rect, env), stageOf(id), chimneys(): Array<{x,y}>, burst(id) }}
 *   env: { dark, night, hour, weather, tint } where tint is a CSS colour laid over plain (unlit) paint after dark
 */
export function createHouseLife({ reduced = false, stages: initial = {} } = {}) {
  let stages = { ...initial };
  const st = (id) => stageOf(stages, id);
  const R = rng('houses');
  const rand = (a, b) => a + R() * (b - a);

  /* Per-house state for the things that remember (birds, arrows, letters...). */
  const S = Object.fromEntries(Object.keys(HOUSE_ART).map((id) => [id, { birds: [], parts: [], next: rand(1500, 5000), shoot: rand(4e3, 9e3), burst: 0 }]));
  const birdColours = [['#8A5A3A', '#E8D2A8'], ['#6E5A4A', '#D8C8B0'], ['#9A6A3A', '#F0DCB8']];
  const pigeon = ['#8C8F9C', '#CFD2DA'];

  const ensureBirds = (id, h, n, env) => {
    const s = S[id];
    while (s.birds.length < n) {
      const spot = h.perch[s.birds.length % h.perch.length];
      const cols = id === 'sesame' ? pigeon : birdColours[s.birds.length % 3];
      // They fly in, unless nothing moves: then they are simply sitting there.
      s.birds.push(reduced ? { home: spot, x: spot[0], y: spot[1], mode: 'sit', t: 0, dir: s.birds.length % 2 ? 1 : -1, until: Infinity, away: false, colour: cols[0], belly: cols[1] }
        : { home: spot, x: spot[0] + 60, y: spot[1] - 80, mode: 'fly', t: rand(0, 9), dir: -1, until: 0, away: false, colour: cols[0], belly: cols[1] });
    }
    s.birds.length = Math.min(s.birds.length, n);
    for (const b of s.birds) b.sleepy = env.dark;
  };

  const stepBird = (b, now, dt) => {
    const [hx, hy] = b.home;
    b.t += dt;
    if (b.mode === 'fly') {
      const tx = b.away ? hx + b.dir * 260 : hx, ty = b.away ? hy - 140 : hy;
      const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy), v = 70 * dt;
      b.dir = dx >= 0 ? 1 : -1;
      if (d <= v) { b.x = tx; b.y = ty; if (b.away) { b.away = false; b.x = hx + (R() < 0.5 ? -1 : 1) * 220; b.y = hy - 120; b.until = now + rand(6e3, 14e3); b.mode = 'gone'; } else { b.mode = 'sit'; b.until = now + rand(2e3, 5e3); } }
      else { b.x += (dx / d) * v; b.y += (dy / d) * v; }
    } else if (b.mode === 'gone') {
      if (now > b.until) b.mode = 'fly';
    } else if (now > b.until) {
      const r = R();
      if (r < 0.12) { b.mode = 'fly'; b.away = true; b.dir = R() < 0.5 ? -1 : 1; }
      else if (r < 0.45) { b.mode = 'peck'; b.until = now + 300; }
      else if (r < 0.7) { b.home = [hx + rand(-5, 5), hy]; b.x = b.home[0]; b.dir *= R() < 0.5 ? -1 : 1; b.mode = 'sit'; b.until = now + rand(800, 2200); }
      else { b.mode = 'sit'; b.until = now + rand(1500, 4000); }
    }
  };


  /* ---------------- the wonders ---------------- */

  const wonder = {
    /* Library 5: pages drift out and circle the owl, turning as they go. */
    pages(g, now, dt, env, h, lit) {
      const n = 5;
      for (let k = 0; k < n; k += 1) {
        const a = now / 4200 + (k * TAU) / n, x = 300 + Math.cos(a) * 92, y = 92 + Math.sin(a) * 24 + Math.sin(now / 900 + k) * 3;
        drawPage(g, x, y, { turn: Math.cos(now / 700 + k * 1.3), rot: Math.sin(a) * 0.25, size: 1.55, glowA: 0 });
      }
      return () => { for (let k = 0; k < n; k += 1) { const a = now / 4200 + (k * TAU) / n; glow(g, '255,226,150', 300 + Math.cos(a) * 92, 92 + Math.sin(a) * 24, 12, 0.25 + 0.5 * lit); } };
    },
    /* Library 7: words lift off the open book on the lectern and float up. */
    letters(g, now, dt, env, h, lit, s) {
      if (now > s.next) { s.next = now + rand(260, 520); s.parts.push({ k: 'l', x: 455 + rand(-6, 6), y: 238, vx: rand(-4, 4), vy: rand(-16, -11), age: 0, life: rand(2.6, 3.6), ch: LETTERS[Math.floor(R() * 26)], w: rand(0, 6) }); }
      for (const p of s.parts) { if (p.k !== 'l') continue; const k = p.age / p.life; stamp(g, glyphSprite(p.ch, 7, true, '#7A5428'), p.x + Math.sin(now / 500 + p.w) * 4, p.y, { alpha: Math.min(1, k / 0.15) * (1 - k) }); }
      return () => { if (!lit) return; glow(g, '255,220,140', 455, 240, 16, 0.5 * lit); for (const p of s.parts) if (p.k === 'l') glow(g, '255,220,140', p.x, p.y - 2, 5, 0.35 * lit * (1 - p.age / p.life)); };
    },
    /* Workshop 5: a little windmill on the ridge. */
    windmill(g, now, dt, env) { drawWindmill(g, 735, 30, { angle: now / (env.weather === 'rain' ? 380 : 620), r: 22 }); },
    /* Workshop 7: a patchwork balloon on a long rope, riding the wind. */
    balloon(g, now) {
      const bx = 985 + Math.sin(now / 3100) * 5, by = 92 + Math.sin(now / 2300) * 4;
      g.strokeStyle = rgba(INK, 0.7); g.lineWidth = 0.6; g.beginPath(); g.moveTo(bx, by - 1); g.quadraticCurveTo(bx - 10, by + 30, 962, 150); g.stroke();
      stamp(g, balloonSprite(), bx, by, { rot: Math.sin(now / 2600) * 0.05, scale: 1.4 });
    },
    /* Observatory 5: an orrery over the terrace, two worlds round a little sun, in 3D. */
    orrery(g, now, dt, env, h, lit) {
      const cx = 1442, cy = 112, rings = [[21, 0.36, -0.3, 5200, '#8FB3C9', 2.8], [33, 0.3, 0.22, 9100, '#D98B7A', 3.4]];
      g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx, cy + 4); g.lineTo(cx, cy + 46); g.stroke();
      g.strokeStyle = '#C9973A'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(cx, cy + 4); g.lineTo(cx, cy + 46); g.stroke();
      const worlds = rings.map(([r, f, tilt, per, col, size]) => { const a = now / per * TAU; return { r, f, tilt, col, size, x: Math.cos(a) * r, y: Math.sin(a) * r * f, front: Math.sin(a) > 0 }; });
      const put = (w) => { const c = Math.cos(w.tilt), s = Math.sin(w.tilt); litEllipse(g, cx + w.x * c - w.y * s, cy + w.x * s + w.y * c, w.size, w.size, w.col, { lw: 0.45 }); };
      for (const w of worlds) { drawRingHalf(g, cx, cy, w.r, w.r * w.f, w.tilt, false); if (!w.front) put(w); }
      litEllipse(g, cx, cy, 6, 6, '#F2C14E', { lw: 0.7, light: 0.6 });
      for (const w of worlds) { drawRingHalf(g, cx, cy, w.r, w.r * w.f, w.tilt, true); if (w.front) put(w); }
      return () => { glow(g, '255,214,120', cx, cy, lit ? 18 : 10, lit ? 0.8 : 0.35); };
    },
    /* Observatory 7: after dark, a constellation over the dome and shooting stars; by day, glints on the brass. */
    sky(g, now, dt, env, h, lit, s, stage) {
      return () => {
        if (!env.dark) { g.fillStyle = 'rgba(255,248,220,.9)'; for (let k = 0; k < 3; k += 1) { const a = Math.max(0, Math.sin(now / 900 + k * 2.1)) ** 8; if (a > 0.05) twinkle(g, 1400 + k * 9, 70 + k * 7, 2 + a * 3); } return; }
        const stars = [[1196, 66], [1222, 40], [1258, 54], [1300, 22], [1338, 48], [1372, 30], [1404, 58], [1236, 86], [1352, 82]].slice(0, 5 + Math.max(0, stage - 7) * 2);
        g.strokeStyle = 'rgba(200,220,255,.28)'; g.lineWidth = 0.6; g.beginPath(); stars.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke();
        for (const [i, [x, y]] of stars.entries()) { const a = 0.6 + 0.4 * Math.sin(now / 700 + i * 1.9); glow(g, '210,226,255', x, y, 7, a); g.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`; twinkle(g, x, y, 2.4 * a + 0.8); }
        if (stage >= 9 && now > s.shoot) { s.shoot = now + rand(5e3, 11e3); s.parts.push({ k: 's', x: rand(1120, 1300), y: rand(10, 40), age: 0, life: 1.1 }); }
        for (const p of s.parts) { if (p.k !== 's') continue; const k = p.age / p.life, x = p.x + k * 160, y = p.y + k * 52; const gr = g.createLinearGradient(x - 30, y - 10, x, y); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(255,250,230,${(1 - k).toFixed(2)})`); g.strokeStyle = gr; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x - 30, y - 10); g.lineTo(x, y); g.stroke(); }
      };
    },
    /* Greenhouse 5: three sunflowers behind the fence, heads nodding in the breeze. */
    sunflowers(g, now) {
      for (const [k, [x, base, tall]] of [[0, [86, 410, 44]], [1, [104, 404, 52]], [2, [124, 408, 40]]]) {
        const sway = Math.sin(now / 1500 + k * 1.3 + x / 90) * 2.4, hx = x + sway, hy = base - tall;
        g.strokeStyle = '#4E6B2C'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + sway * 0.2, base - tall / 2, hx, hy); g.stroke();
        g.strokeStyle = INK; g.lineWidth = 0.35; g.stroke();
        for (const [t, side] of [[0.45, -1], [0.62, 1]]) { const lx = x + sway * t * 0.5, ly = base - tall * t; litEllipse(g, lx + side * 3.4, ly, 3.6, 1.6, '#6E8C3A', { lw: 0.35 }); }
        stamp(g, sunflowerHead(k + 1), hx, hy, { rot: sway * 0.05, scale: 1.05 });
      }
    },
    /* Greenhouse 7: the vegetable bed swells (baked), a sprinkler arcs over it, bees work the flowers. */
    garden(g, now, dt, env, h, lit, s) {
      if (!env.dark && env.weather !== 'rain') {
        const a = Math.sin(now / 1400) * 0.9;
        for (let k = 0; k < 14; k += 1) { const t = ((now / 900 + k / 14) % 1), x = 96 + Math.sin(a) * 34 * t, y = 452 - 26 * t + 34 * t * t; g.fillStyle = `rgba(170,214,245,${(0.85 * (1 - t)).toFixed(2)})`; g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill(); }
        for (let k = 0; k < 4; k += 1) {
          const t = now / 1000 + k * 7, x = 300 + Math.sin(t * 0.9 + k) * 30 + Math.sin(t * 3.1) * 4, y = 472 + Math.cos(t * 1.2 + k) * 10 + Math.sin(t * 4) * 2;
          g.fillStyle = '#F2C14E'; g.beginPath(); g.ellipse(x, y, 1.6, 1.1, 0, 0, TAU); g.fill(); g.strokeStyle = '#2c2018'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x - 0.4, y - 1); g.lineTo(x - 0.4, y + 1); g.moveTo(x + 0.6, y - 1); g.lineTo(x + 0.6, y + 1); g.stroke();
          g.fillStyle = 'rgba(255,255,255,.7)'; const f = Math.abs(Math.sin(now / 30 + k)) * 1.4 + 0.4; g.beginPath(); g.ellipse(x - 0.4, y - 1.6, f, 0.8, -0.4, 0, TAU); g.fill();
        }
      }
    },
    /* Cabin 5: Mochi finds the point: now and then an arrow flies into the bullseye. */
    arrows(g, now, dt, env, h, lit, s) {
      if (now > s.next) { s.next = now + rand(5500, 9500); s.parts.push({ k: 'a', age: 0, life: 5.2 }); }
      const T = [1452, 420], F = [1100, 404], fly = 0.85;
      for (const p of s.parts) {
        if (p.k !== 'a') continue;
        if (p.age < fly) {
          const t = p.age / fly, x = F[0] + (T[0] - F[0]) * t, y = F[1] + (T[1] - F[1]) * t - Math.sin(Math.PI * t) * 26;
          const ang = Math.atan2((T[1] - F[1]) - Math.cos(Math.PI * t) * 26 * Math.PI, T[0] - F[0]);
          drawArrow(g, x, y, ang);
        } else {
          const k = (p.age - fly), wob = Math.exp(-k * 6) * Math.sin(k * 40) * 0.12, a = Math.min(1, (p.life - p.age) / 0.6);
          g.globalAlpha = a; drawArrow(g, T[0] - 2, T[1], 0.08 + wob, { len: 12 }); g.globalAlpha = 1;
          if (k < 0.5) { g.strokeStyle = `rgba(255,236,170,${(1 - k * 2).toFixed(2)})`; g.lineWidth = 0.9; g.beginPath(); g.arc(T[0], T[1], 4 + k * 22, 0, TAU); g.stroke(); }
        }
      }
    },
    /* Cabin 7: a weathervane on the ridge, swinging round with the wind, in 3D. */
    vane(g, now) {
      const x = 1196, y = 280, a = Math.sin(now / 5200) * 1.4 + Math.sin(now / 1900) * 0.25, len = 12;
      g.strokeStyle = INK; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 16); g.lineTo(x, y - 2); g.stroke();
      for (const [ax, lab] of [[0, 'N'], [Math.PI / 2, 'E']]) { const dx = Math.cos(ax) * 7, dy = Math.sin(ax) * 2.2; g.strokeStyle = INK; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - dx, y + 4 - dy); g.lineTo(x + dx, y + 4 + dy); g.stroke(); void lab; }
      const ex = Math.cos(a) * len, ey = Math.sin(a) * len * 0.3;
      g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x - ex, y - ey); g.lineTo(x + ex, y + ey); g.stroke();
      g.fillStyle = '#C9973A'; g.strokeStyle = INK; g.lineWidth = 0.4;
      g.beginPath(); g.moveTo(x + ex * 1.25, y + ey * 1.25); g.lineTo(x + ex * 0.85 - ey * 0.5, y + ey * 0.85 - 2.6 * Math.abs(Math.cos(a)) - 0.8); g.lineTo(x + ex * 0.85 + ey * 0.5, y + ey * 0.85 + 2.6 * Math.abs(Math.cos(a)) + 0.8); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(x - ex, y - ey - 3 * Math.abs(Math.cos(a)) - 0.6); g.lineTo(x - ex * 0.7, y - ey * 0.7); g.lineTo(x - ex, y - ey + 3 * Math.abs(Math.cos(a)) + 0.6); g.closePath(); g.fill(); g.stroke();
    },
    /* Clock 5: the bell rings out (rings of sound) every half minute. */
    bell(g, now, dt, env, h, lit, s) {
      const period = 30000, ph = now % period;
      if (ph < 2600) {
        const k = ph / 2600;
        for (let j = 0; j < 3; j += 1) { const t = k - j * 0.18; if (t <= 0 || t >= 1) continue; g.strokeStyle = `rgba(255,232,160,${(0.75 * (1 - t)).toFixed(2)})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(1335, 560, 10 + t * 50, 4 + t * 18, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.beginPath(); g.ellipse(1335, 560, 10 + t * 50, 4 + t * 18, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); }
        if (!s.rang || s.rang < now - period / 2) { s.rang = now; s.scatter = now; }
      }
    },
    /* Clock 7: pigeons live on the roof (the birds use the pigeon colours here) and lift off when the bell rings. */
    pigeons() { /* the perched birds are pigeons at the clock tower; see ensureBirds */ },
    /* Cottage 5: rose petals drift from the arch and the roof. */
    petals(g, now, dt, env, h, lit, s) {
      if (now > s.next) { s.next = now + rand(380, 760); s.parts.push({ k: 'p', x: rand(410, 520), y: rand(590, 620), vx: rand(-7, -2), vy: rand(5, 10), r: rand(0, 6), vr: rand(-2, 2), age: 0, life: rand(5, 7), c: ['#F2B6B8', '#E58C94', '#FBE3E8'][Math.floor(R() * 3)] }); }
      for (const p of s.parts) { if (p.k !== 'p') continue; p.x += (p.vx + Math.sin(now / 700 + p.r) * 6) * dt; p.y += p.vy * dt; p.r += p.vr * dt; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.min(1, (p.life - p.age) / 1.2); g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, 1.7, 1, 0, 0, TAU); g.fill(); g.restore(); }
      g.globalAlpha = 1;
    },
    /* Cottage 7: paper lanterns along the dock, swaying over the water. */
    docklights(g, now, dt, env, h, lit) {
      const spots = [[452, 802], [492, 810], [532, 818]], cols = ['#D9603A', '#E9A23B', '#D97A8A'];
      spots.forEach(([x, y], k) => stamp(g, lanternSprite(cols[k]), x, y, { rot: Math.sin(now / 1300 + k) * 0.12 }));
      return () => { if (!lit) return; spots.forEach(([x, y], k) => glow(g, '255,190,110', x, y + 8, 16, lit * (0.8 + 0.2 * Math.sin(now / 400 + k)))); };
    },
    /* Campfire 5: lanterns on poles round the camp. */
    camplights(g, now, dt, env, h, lit) {
      const spots = [[676, 830], [966, 826], [700, 930], [946, 926]], cols = ['#D9603A', '#E9A23B', '#D97A8A', '#7FA65A'];
      for (const [k, [x, y]] of spots.entries()) {
        g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y + 26); g.lineTo(x, y - 2); g.lineTo(x + 6, y - 2); g.stroke();
        g.strokeStyle = '#8A5A32'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y + 26); g.lineTo(x, y - 2); g.lineTo(x + 6, y - 2); g.stroke();
        stamp(g, lanternSprite(cols[k]), x + 6, y - 2, { rot: Math.sin(now / 1200 + k) * 0.1, scale: 1.15 });
      }
      return () => { if (!lit) return; for (const [k, [x, y]] of spots.entries()) glow(g, '255,190,110', x + 6, y + 6, 15, lit * (0.85 + 0.15 * Math.sin(now / 330 + k))); };
    },
    /* Campfire 7: fireworks after dark; by day, sparklers over the camp. */
    fireworks(g, now, dt, env, h, lit, s) {
      if (now > s.shoot) {
        s.shoot = now + (env.dark ? rand(2600, 5200) : rand(4000, 7000));
        const x = rand(720, 910), y = rand(600, 680), cols = ['255,190,110', '255,140,160', '170,220,255', '255,236,150', '190,255,170'], c = cols[Math.floor(R() * cols.length)];
        const n = env.dark ? 26 : 12;
        for (let k = 0; k < n; k += 1) { const a = (k / n) * TAU + rand(-0.1, 0.1), v = rand(26, 44) * (env.dark ? 1 : 0.6); s.parts.push({ k: 'f', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, life: rand(1.1, 1.6), c }); }
      }
      return () => {
        for (const p of s.parts) {
          if (p.k !== 'f') continue;
          p.vy += 22 * dt; p.vx *= 1 - dt * 1.2; p.vy *= 1 - dt * 0.8; p.x += p.vx * dt; p.y += p.vy * dt;
          const k = p.age / p.life;
          glow(g, p.c, p.x, p.y, env.dark ? 4.5 : 3, (1 - k) * (env.dark ? 1 : 0.7));
        }
      };
    },
  };

  /* ---------------- each frame ---------------- */

  const BUNTING = ['#C2643F', '#EDBE66', '#8FB3C9', '#F6EEDB', '#7FA65A', '#D98B7A'];
  const PENNANTS = ['#C23B3B', '#F6EEDB', '#2F5E8E', '#EDBE66'];

  /** Draw a house's plain paint now; return what glows, to be added after the hour's colour. */
  function drawHouse(id, g, now, dt, env, rect) {
    const h = HOUSE_ART[id], stage = st(id), s = S[id], b = BOX[id];
    if (!stage) return null;
    const lit = env.night ? 1 : env.dark ? 0.75 : env.hour === 'dawn' ? 0.35 : 0;
    // particles a house remembers age here, so a house off screen does not pile them up
    for (let i = s.parts.length - 1; i >= 0; i -= 1) { const p = s.parts[i]; p.age += dt; if (p.k !== 'f' && p.k !== 'p') { p.x = (p.x ?? 0) + (p.vx ?? 0) * dt; p.y = (p.y ?? 0) + (p.vy ?? 0) * dt; } if (p.age > p.life) { s.parts[i] = s.parts[s.parts.length - 1]; s.parts.pop(); } }
    if (!visible(b, rect)) return null;
    const lights = [];

    /* 4: the garland */
    if (stage >= 4 && h.garland) for (const G of [].concat(h.garland)) {
      const a = { x: G.a[0], y: G.a[1] }, z = { x: G.b[0], y: G.b[1] }, sway = Math.sin(now / 1700 + a.x / 100) * (env.weather === 'rain' ? 3 : 1.6);
      if (G.kind === 'bunting') drawBunting(g, a, z, { sag: G.sag, n: G.n, sway, colours: BUNTING });
      else if (G.kind === 'pennants') drawBunting(g, a, z, { sag: G.sag, n: G.n, sway, colours: PENNANTS, size: 1.1 });
      else if (G.kind === 'stars') {
        g.strokeStyle = rgba(INK, 0.8); g.lineWidth = 0.45; g.beginPath(); for (let i = 0; i <= 12; i += 1) { const t = i / 12; g[i ? 'lineTo' : 'moveTo'](a.x + (z.x - a.x) * t, a.y + (z.y - a.y) * t + 4 * G.sag * t * (1 - t)); } g.stroke();
        for (let i = 1; i < G.n; i += 1) { const t = i / G.n, x = a.x + (z.x - a.x) * t, y = a.y + (z.y - a.y) * t + 4 * G.sag * t * (1 - t); stamp(g, starLanternSprite(), x, y, { rot: Math.sin(now / 1500 + i) * 0.15, scale: 1.05 }); lights.push(() => glow(g, '255,222,140', x, y + 8, 12, lit * 0.9)); }
      } else { drawFairyLights(g, a, z, { sag: G.sag, n: G.n, sway, lit: 0, now }); lights.push(() => drawFairyLightsGlow(g, a, z, G, sway, lit, now)); }
    }

    /* 5 and 7: the wonders */
    for (const [k, w] of h.wonders.entries()) {
      if (stage < (k ? 7 : 5)) continue;
      const after = wonder[w]?.(g, now, dt, env, h, lit, s, stage);
      if (after) lights.push(after);
    }

    /* 6: birds (pigeons at the clock tower) on the roof, by day */
    if (stage >= 6 && !env.night) {
      const n = Math.min(h.perch.length, stage >= 8 ? 3 : 2) + (id === 'sesame' && stage >= 7 ? 1 : 0);
      ensureBirds(id, h, n, env);
      const scatter = id === 'sesame' && s.scatter && now - s.scatter < 400;
      for (const bd of s.birds) {
        if (scatter && bd.mode !== 'fly' && bd.mode !== 'gone') { bd.mode = 'fly'; bd.away = true; bd.dir = R() < 0.5 ? -1 : 1; }
        if (!reduced) stepBird(bd, now, dt);
        if (bd.mode !== 'gone') drawBird(g, bd.x, bd.y, { dir: bd.dir, mode: bd.mode === 'fly' ? 'fly' : bd.mode, flap: bd.t * 18, colour: bd.colour, belly: bd.belly, size: id === 'sesame' ? 1.1 : 1 });
      }
      if (scatter) s.scatter = 0;
    }
    lights.push(() => glowsOf(id, h, stage, s, g, now, env));
    return lights;
  }

  /** The stage 8 to 10 lights, and the burst of a house that just grew (drawn in the light pass). */
  function glowsOf(id, h, stage, s, g, now, env) {
    /* 8: golden dust rising round the house */
    if (stage >= 8) {
      const [mx, my, mrx, mry] = h.motes;
      for (let k = 0; k < 7; k += 1) {
        const t = (now / 9000 + k / 7) % 1, x = mx + Math.sin(k * 2.3 + now / 3000) * mrx * 0.8, y = my + mry * 0.6 - t * mry * 1.6;
        glow(g, '255,226,150', x, y, 3.2, Math.sin(t * Math.PI) * (env.dark ? 0.9 : 0.55));
      }
    }
    /* 9: the golden glow round the whole house is a still CSS halo (village.js), so it costs no drawing at all */
    /* 10: the crown of light */
    if (stage >= 10) {
      const [cx, cy] = h.crown, bob = Math.sin(now / 1100) * 2.4;
      glow(g, '255,220,130', cx, cy + bob, 34, 0.85);
      g.globalCompositeOperation = 'source-over';
      stamp(g, crownStarSprite(), cx, cy + bob, { scale: 1.3, rot: Math.sin(now / 1700) * 0.12 });
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(255,246,200,.9)';
      for (let k = 0; k < 5; k += 1) { const a = Math.max(0, Math.sin(now / 520 + k * 1.6)) ** 6; if (a > 0.05) twinkle(g, cx + Math.cos(k * 1.7) * 18, cy + bob + Math.sin(k * 2.2) * 12, 2 + a * 3.4); }
    }
    /* a house that just grew: a burst of sparkles rising off it */
    if (s.burst === -1) s.burst = now || 1;
    if (s.burst && now - s.burst < 2600) {
      const k = (now - s.burst) / 2600, [cx, cy, rx, ry] = h.mask;
      g.fillStyle = `rgba(255,246,200,${(1 - k).toFixed(2)})`;
      for (let j = 0; j < 24; j += 1) { const a = j * 2.39996, d = 0.25 + (j % 5) * 0.15; twinkle(g, cx + Math.cos(a) * rx * d * 0.8, cy - ry * 0.2 + Math.sin(a) * ry * d * 0.5 - k * 50, 2 + 3 * Math.sin(k * Math.PI)); }
      glow(g, '255,220,140', cx, cy - 10, rx * 0.9, 0.35 * Math.sin(k * Math.PI));
    }
  }

  function drawFairyLightsGlow(g, a, z, G, sway, lit, now) {
    if (!lit) return;
    const cols = ['255,214,140', '255,170,120', '255,236,170', '190,226,255'];
    for (let i = 1; i < G.n; i += 1) {
      const t = i / G.n, x = a.x + (z.x - a.x) * t + sway * Math.sin(Math.PI * t) * 0.4, y = a.y + (z.y - a.y) * t + 4 * G.sag * t * (1 - t) + 1.2;
      glow(g, cols[i % cols.length], x, y, 5.5, lit * (0.75 + 0.25 * Math.sin(now / 600 + i * 1.7)));
    }
  }

  return {
    setStages(next) { stages = { ...next }; },
    stageOf: st,
    /** Chimneys that smoke: a house's own from stage 1. */
    chimneys() { return Object.entries(HOUSE_ART).filter(([id, h]) => h.chimney && st(id) >= 1).map(([, h]) => h.chimney); },
    /** A house that just grew sends up a burst of light (starting the next time it is drawn). */
    burst(id) { if (S[id] && !reduced) S[id].burst = -1; },
    /** With less motion this is called once per view, with `now` held still: the house shows everything it has grown, keeping still. */
    draw(g, now, dt, rect, env) {
      const lights = [];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const id of DRAW_ORDER) {
        const l = drawHouse(id, g, now, dt, env, rect);
        if (!l) continue;
        lights.push(...l);
        const b = BOX[id]; x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); x1 = Math.max(x1, b.x1); y1 = Math.max(y1, b.y1);
      }
      if (!lights.length) return;
      // Plain paint takes the hour's colour, as the painting does under the tint; lights go on top, added.
      if (env.tint) {
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = env.tint; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      }
      g.globalCompositeOperation = 'lighter';
      for (const f of lights) f();
      g.globalCompositeOperation = 'source-over';
    },
  };
}

export { glowSprite };
