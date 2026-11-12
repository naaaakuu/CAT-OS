/**
 * scenery.js — the valley's independent layers, assembled (no game state).
 *
 *   terrain   the clean painted valley (an <img>, under everything)
 *   shadows   soft contact shadows under houses, bridges and trees (one still canvas)
 *   scene     bridges, houses and trees as separate sprites. A house is cut at
 *             its `ground` line: what is painted below it (steps, pots, the
 *             camp) lies flat under every friend; the walls above it carry
 *             z-index = that world y, the same scale life.js gives each friend
 *             (z = foot y), so a friend behind a house is hidden by it. Each
 *             house also has a `parts` canvas just in front of its walls, where
 *             houses.js and mechanisms.js draw what moves and what it has grown.
 *
 * House bodies are baked once per look: the stage's colour (houses.js
 * gradeOf), dark windows before stage 2, and the hour's light multiplied in
 * the same way the CSS tint lays it over the terrain, except lit glass after
 * dark, which keeps its glow. Nothing here runs in the frame loop.
 */
import { ART_FILES, HOUSES, PLACED, BRIDGES, TREES, TREE, worldPoint, groundY } from './landscape.js';
import { gradeOf } from './houses.js';
import { SQUARE_BOX, paintSquareGround, squarePieces, posterOn } from './square.js';

const canvasOf = (w, h) => Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);

const IMG = {};
let loading = null;
const load = (src) => { const i = new Image(); i.decoding = 'async'; i.src = src; return i.decode().then(() => i); };

/** What the scene cannot be drawn without; the moving parts' atlases, the water and the leaves follow (each user waits for its own). */
const ESSENTIAL = new Set(['terrain', 'trunk', 'canopy', 'bridgeStone', 'bridgeWood']);
let extras = null;
/** Await before mounting the village (or composing its still). Resolves to the decoded images (IMG fills in as the rest arrive). */
export function loadScenery() {
  if (!loading) {
    const jobs = [
      ...Object.entries(ART_FILES).filter(([k]) => ESSENTIAL.has(k)).map(([k, src]) => load(src).then((i) => { IMG[k] = i; })),
      ...Object.entries(HOUSES).map(([id, h]) => load(h.file).then((i) => { IMG[id] = i; })),
    ];
    loading = Promise.all(jobs).then(() => IMG, (err) => { loading = null; throw err; });
    extras = Promise.allSettled(Object.entries(ART_FILES).filter(([k]) => !ESSENTIAL.has(k)).map(([k, src]) => load(src).then((i) => { IMG[k] = i; })));
  }
  return loading;
}
/** Every picture, the moving parts' atlases too (the gates and the still wait for this). */
export const loadAllScenery = () => loadScenery().then(() => extras).then(() => IMG);
export const sceneryImages = () => IMG;

/* ---- The hour's light ------------------------------------------------ */

/** The CSS tint (home.css .cw-tint) as a per-channel multiply: 1 - a + a·C/255. */
const TINT = {
  dawn: [246, 196, 186, 0.5], morning: [222, 236, 248, 0.32], dusk: [244, 150, 104, 0.62], night: [46, 60, 112, 0.8],
  rain: [150, 165, 180, 0.42], rainNight: [40, 52, 96, 0.84],
};
export function lightOf(hour, weather) {
  const t = weather === 'rain' ? (hour === 'night' ? TINT.rainNight : TINT.rain) : TINT[hour];
  if (!t) return null;
  const [r, g, b, a] = t;
  return [1 - a + (a * r) / 255, 1 - a + (a * g) / 255, 1 - a + (a * b) / 255];
}

/* ---- Baking a house body --------------------------------------------- */

const idle = () => new Promise((res) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => res(), { timeout: 120 }) : setTimeout(res, 16)));

/**
 * One house body for a stage and an hour, as a canvas of the sprite's own
 * pixels (local px). Lit glass is the warm, bright pixels inside a window
 * circle: dark before stage 2, warmer from stage 6, and unaffected by the
 * night's multiply (it is the light).
 */
async function bakeBody(id, stage, light, isAborted) {
  const h = HOUSES[id], img = IMG[id];
  const N = img.naturalWidth, f = N / 896;
  const c = canvasOf(N, N), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const st = clamp(Math.floor(Number(stage) || 0), 0, 10), gr = gradeOf(st);
  const plain = gr.sat === 1 && gr.bri === 1 && gr.warm === 0;
  const lit = st >= 2;
  if (plain && !light && lit && st < 6) return c;
  const [vx, vy, vw, vh] = h.vis.map((v) => Math.round(v * f));
  const x0 = Math.max(0, vx - 2), y0 = Math.max(0, vy - 2), w = Math.min(N - x0, vw + 4), hh = Math.min(N - y0, vh + 4);
  const data = g.getImageData(x0, y0, w, hh), d = data.data;
  const wins = h.windows.map(([x, y, r]) => ({ x: x * f - x0, y: y * f - y0, r: r * f }));
  const mul = light ?? [1, 1, 1];
  let y = 0;
  while (y < hh) {
    const t0 = performance.now();
    for (; y < hh && performance.now() - t0 < 7; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        if (!d[i + 3]) continue;
        let r = d[i], gg = d[i + 1], b = d[i + 2];
        if (!plain) {
          const L = 0.299 * r + 0.587 * gg + 0.114 * b, T = gr.warm;
          r = (L + (r - L) * gr.sat) * gr.bri + T * 18; gg = (L + (gg - L) * gr.sat) * gr.bri + T * 6; b = (L + (b - L) * gr.sat) * gr.bri - T * 16;
        }
        // lit glass: inside a window circle, warm and bright
        let glass = 0;
        for (const q of wins) {
          const e = Math.hypot(x - q.x, y - q.y) / q.r;
          if (e < 1) { const L = 0.299 * r + 0.587 * gg + 0.114 * b; glass = Math.max(glass, clamp((r - b - 40) / 70, 0, 1) * clamp((L - 110) / 80, 0, 1) * ease(clamp((1 - e) / 0.35, 0, 1))); }
        }
        if (glass && !lit) { const k = glass * 0.86; r += (64 - r) * k; gg += (62 - gg) * k; b += (80 - b) * k; glass = 0; }
        else if (glass && st >= 6) { const k = glass * 0.28; r += (255 - r) * k; gg += (222 - gg) * k; b += (150 - b) * k; }
        // the hour's light (glass after dark keeps its own)
        const keep = light ? glass : 0;
        d[i] = r * (mul[0] + (1 - mul[0]) * keep); d[i + 1] = gg * (mul[1] + (1 - mul[1]) * keep); d[i + 2] = b * (mul[2] + (1 - mul[2]) * keep);
      }
    }
    if (y < hh) { await idle(); if (isAborted()) return null; }
  }
  g.putImageData(data, x0, y0);
  return c;
}

/** A sprite with the hour's multiply baked in (bridges, trees, the square's pieces). */
function tinted(img, light, region = null) {
  const [sx, sy, sw, sh] = region ?? [0, 0, img.naturalWidth ?? img.width, img.naturalHeight ?? img.height];
  const c = canvasOf(sw, sh), g = c.getContext('2d');
  g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  if (light) {
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgb(${Math.round(light[0] * 255)},${Math.round(light[1] * 255)},${Math.round(light[2] * 255)})`;
    g.fillRect(0, 0, sw, sh);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  }
  return c;
}

/* ---- Geometry shared by the scene, the still and the gates ------------ */

const placedBox = (spec) => {
  const [vx, vy, vw, vh] = spec.vis, k = spec.place.w / vw;
  return { k, x: spec.place.cx - (vx + vw / 2) * k, y: spec.place.by - (vy + vh) * k };
};
const treeBox = (t) => {
  const [vx, , vw] = TREE.vis, k = t.w / vw;
  return { k, x: t.x - TREE.root[0] * k, y: t.y - TREE.root[1] * k, size: 896 * k };
};
/** Where the walls and the parts canvas of a house sit in the world. */
export function houseFrame(id) {
  const h = HOUSES[id], b = PLACED[id], [vx, vy, vw, vh] = h.vis;
  const x0 = b.x + (vx - 4) * b.k, y0 = b.y + (vy - 4) * b.k, x1 = b.x + (vx + vw + 4) * b.k, y1 = b.y + (vy + vh + 4) * b.k;
  // Room above the roof only once a house has wonders, birds or a crown (stage 5 on); before that its parts stay on the house.
  return { x0, y0, x1, y1, ground: groundY(id), parts: { x: x0 - 70, y: y0 - 150, w: x1 - x0 + 140, h: y1 - y0 + 185 }, snug: { x: x0 - 30, y: y0 - 36, w: x1 - x0 + 60, h: y1 - y0 + 66 } };
}

function shadowLayer(scale = 0.5) {
  const W = 1086, H = 1448, c = canvasOf(W * scale, H * scale), g = c.getContext('2d');
  g.scale(scale, scale);
  g.filter = `blur(${Math.round(10 * scale)}px)`;
  const blob = (x, y, rx, ry, a) => { g.fillStyle = `rgba(36,40,18,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); };
  for (const id of Object.keys(HOUSES)) {
    const f = houseFrame(id), w = f.x1 - f.x0, cx = (f.x0 + f.x1) / 2;
    blob(cx + w * 0.07, f.ground + 6, w * 0.5, w * 0.11, 0.3);
  }
  for (const s of BRIDGES) { const w = s.place.w; blob(s.place.cx + w * 0.04, s.place.by - 4, w * 0.46, w * 0.1, 0.22); }
  for (const t of TREES) blob(t.x + t.w * 0.16, t.y + 2, t.w * 0.42, t.w * 0.12, 0.26);
  g.filter = 'none';
  return c;
}

/**
 * The assembled valley as one still canvas: terrain, shadows, bridges,
 * houses (at the given stages; the painting as drawn when omitted), trees.
 * For room backdrops (tools/bake-village-still.mjs) and the geometry gate.
 */
export async function composeStill({ stages = null, scale = 1 } = {}) {
  await loadAllScenery();
  const c = canvasOf(1086 * scale, 1448 * scale), g = c.getContext('2d');
  g.scale(scale, scale);
  g.drawImage(IMG.terrain, 0, 0, 1086, 1448);
  g.drawImage(paintSquareGround(2), SQUARE_BOX.x, SQUARE_BOX.y, SQUARE_BOX.w, SQUARE_BOX.h);
  g.drawImage(shadowLayer(), 0, 0, 1086, 1448);
  for (const s of BRIDGES) { const b = placedBox(s); g.drawImage(IMG[s.id === 'stone' ? 'bridgeStone' : 'bridgeWood'], b.x, b.y, 896 * b.k, 896 * b.k); }
  const order = Object.keys(HOUSES).sort((a, b) => groundY(a) - groundY(b));
  const items = [
    ...order.map((id) => ({ y: groundY(id), draw: async () => { const b = PLACED[id]; const body = stages ? await bakeBody(id, stages[id] ?? 0, null, () => false) : IMG[id]; g.drawImage(body, b.x, b.y, b.size, b.size); } })),
    ...TREES.map((t) => ({ y: t.y, draw: () => { const b = treeBox(t); g.drawImage(IMG.trunk, b.x, b.y, b.size, b.size); g.drawImage(IMG.canopy, b.x, b.y, b.size, b.size); } })),
    ...squarePieces().map((p) => ({ y: p.y, draw: () => g.drawImage(p.sprite.c, p.x - p.sprite.ax, p.y - p.sprite.ay, p.sprite.w, p.sprite.h) })),
  ].sort((a, b) => a.y - b.y);
  for (const it of items) await it.draw();
  return c;
}

/* ---- The live scene --------------------------------------------------- */

/**
 * Mount the valley's layers into `.cw-map`, after its terrain <img>.
 * @returns {{ parts(id): {canvas, g, box} , setLook(stages, hour, weather): Promise, destroy() }}
 */
export function mountScene(map, { reduced = false } = {}) {
  const terrain = map.querySelector('.cw-art');
  // The square's cobbles: flat on the terrain, under the hour's tint like the painting (no z-index).
  const squareGround = paintSquareGround(2);
  squareGround.className = 'cw-square';
  squareGround.setAttribute('aria-hidden', 'true');
  squareGround.style.cssText = `left:${SQUARE_BOX.x}px;top:${SQUARE_BOX.y}px;width:${SQUARE_BOX.w}px;height:${SQUARE_BOX.h}px`;
  terrain.after(squareGround);
  const shadows = shadowLayer();
  shadows.className = 'cw-shadows';
  shadows.setAttribute('aria-hidden', 'true');
  squareGround.after(shadows);

  const scene = document.createElement('div');
  scene.className = 'cw-scene';
  scene.setAttribute('aria-hidden', 'true');
  const place = (el, x, y, w, h, z) => { el.style.cssText = `left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;z-index:${Math.round(z)}`; return el; };

  // bridges: flat under every friend (a friend on the deck is drawn over its rails)
  const bridges = BRIDGES.map((s) => {
    const b = placedBox(s), [vx, vy, vw, vh] = s.vis, el = canvasOf(vw + 8, vh + 8);
    el.className = 'cw-bridge'; el.dataset.bridge = s.id;
    place(el, b.x + (vx - 4) * b.k, b.y + (vy - 4) * b.k, (vw + 8) * b.k, (vh + 8) * b.k, 3);
    scene.append(el);
    return { s, el, region: [vx - 4, vy - 4, vw + 8, vh + 8] };
  });

  // houses: ground, walls, parts
  const houses = {};
  for (const id of Object.keys(HOUSES)) {
    const h = HOUSES[id], b = PLACED[id], f = houseFrame(id), [vx, vy, vw, vh] = h.vis;
    const N = 896, top = vy - 4, mid = h.ground, bot = Math.min(N, vy + vh + 4), left = vx - 4, wide = vw + 8;
    const walls = canvasOf(wide, mid - top), ground = canvasOf(wide, bot - mid);
    walls.className = 'cw-house'; ground.className = 'cw-house cw-house--ground';
    walls.dataset.house = ground.dataset.house = id;
    place(ground, b.x + left * b.k, b.y + mid * b.k, wide * b.k, (bot - mid) * b.k, 4);
    place(walls, b.x + left * b.k, b.y + top * b.k, wide * b.k, (mid - top) * b.k, f.ground);
    const parts = canvasOf(1, 1);
    parts.className = 'cw-parts'; parts.dataset.house = id;
    place(parts, f.parts.x, f.parts.y, f.parts.w, f.parts.h, f.ground + 1);
    scene.append(ground, walls, parts);
    houses[id] = { walls, ground, parts, g: parts.getContext('2d'), box: f.parts, frame: f, cut: { left, top, mid, bot, wide } };
  }

  // trees: trunk and canopy on one canvas origin; the canopy sways round its pivot over still roots
  const trees = TREES.map((t, i) => {
    const b = treeBox(t), [vx, vy, vw, vh] = TREE.vis;
    const el = document.createElement('div');
    el.className = 'cw-tree';
    place(el, b.x + vx * b.k, b.y + vy * b.k, vw * b.k, vh * b.k, t.y);
    const trunk = canvasOf(vw, vh), canopy = canvasOf(vw, vh);
    trunk.className = 'cw-tree__trunk'; canopy.className = 'cw-tree__canopy';
    canopy.style.transformOrigin = `${(((TREE.pivot[0] - vx) / vw) * 100).toFixed(1)}% ${(((TREE.pivot[1] - vy) / vh) * 100).toFixed(1)}%`;
    canopy.style.setProperty('--sway', `${(7 + i * 1.3).toFixed(1)}s`);
    canopy.style.setProperty('--delay', `${(-i * 2.1).toFixed(1)}s`);
    el.append(trunk, canopy);
    scene.append(el);
    return { el, trunk, canopy, region: [vx, vy, vw, vh] };
  });
  // the square's pieces: each sorts with the friends by its foot, like a house's walls
  const pieces = squarePieces().map((p) => {
    const el = canvasOf(p.sprite.c.width, p.sprite.c.height);
    el.className = 'cw-piece'; el.dataset.piece = p.id;
    place(el, p.x - p.sprite.ax, p.y - p.sprite.ay, p.sprite.w, p.sprite.h, p.y);
    scene.append(el);
    return { ...p, el, src: p.sprite.c };
  });
  if (reduced) scene.dataset.reduced = 'true';
  shadows.after(scene);

  // Trees off screen keep still (their sway is CSS).
  const observer = new IntersectionObserver((entries) => {
    for (const e of entries) e.target.toggleAttribute('data-off', !e.isIntersecting);
  }, { root: map.parentElement, rootMargin: '80px' });
  for (const t of trees) observer.observe(t.el);

  let job = 0, disposed = false, lastLight = undefined;
  const drawInto = (canvas, src, region) => {
    const [sx, sy, sw, sh] = region, g = canvas.getContext('2d');
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(src, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  };
  const lightPiece = (p, light) => drawInto(p.el, tinted(p.src, light), [0, 0, p.src.width, p.src.height]);
  for (const p of pieces) lightPiece(p, null);
  let pieceLight = null;
  return {
    houses,
    images: IMG,
    /** Where the square's pieces stand ({ id, x, y }), for the gates. */
    pieces: pieces.map(({ id, x, y }) => ({ id, x, y })),
    /** Post a Muddle on the square's notice board (its sheet's first frame); null takes the poster down to a blank playbill. */
    poster(img, sheet) {
      const board = pieces.find((p) => p.id === 'board');
      if (!board || disposed) return;
      board.src = posterOn(img, sheet).c;
      lightPiece(board, pieceLight);
    },
    /** Bake every body for these stages and this hour (bridges and trees for the hour). Old pictures stay until the new ones are ready. */
    async setLook(stages, hour, weather) {
      const mine = ++job, stale = () => disposed || mine !== job;
      const light = lightOf(hour, weather), key = JSON.stringify(light);
      if (key !== lastLight) {
        lastLight = key;
        for (const b of bridges) drawInto(b.el, tinted(IMG[b.s.id === 'stone' ? 'bridgeStone' : 'bridgeWood'], light), b.region);
        const trunk = tinted(IMG.trunk, light), canopy = tinted(IMG.canopy, light);
        for (const t of trees) { drawInto(t.trunk, trunk, t.region); drawInto(t.canopy, canopy, t.region); }
        pieceLight = light;
        for (const p of pieces) lightPiece(p, light);
      }
      for (const id of Object.keys(HOUSES)) {
        // A house whose stage and light are unchanged keeps its picture (baking is a pass over every pixel).
        const want = `${Math.floor(Number(stages?.[id]) || 0)}|${key}`;
        if (houses[id].baked === want) continue;
        const body = await bakeBody(id, stages?.[id] ?? 0, light, stale);
        if (!body || stale()) return;
        const { left, top, mid, bot, wide } = houses[id].cut, f = body.width / 896;
        drawInto(houses[id].walls, body, [left * f, top * f, wide * f, (mid - top) * f]);
        drawInto(houses[id].ground, body, [left * f, mid * f, wide * f, (bot - mid) * f]);
        houses[id].walls.dataset.ready = 'true';
        houses[id].baked = want;
      }
      scene.dataset.ready = 'true';
    },
    destroy() { disposed = true; job += 1; observer.disconnect(); scene.remove(); shadows.remove(); squareGround.remove(); },
  };
}

export { worldPoint };
