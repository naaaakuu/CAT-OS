/**
 * houses.js — every house grows with the section it holds.
 *
 * Owner, 2026-10-06: "when a player improves in a particular section, that
 * house area should also significantly improve." Each of the eight houses
 * reads its own stage, 0 to 10 (economy.js houseStages: the subject's own
 * questions, never time), and climbs the same ladder, each rung its own:
 *
 *   0  asleep: the colour a little faded, the windows dark, its machine still
 *   1  awake: smoke from the chimney, the lamp by the door, its own machine
 *      starts (the gear turns, the clocks tick, the telescope sweeps, the
 *      carriages shunt: src/home/mechanisms.js)
 *   2  lights in the windows, the first flowers
 *   3  its own keepsake by the door, more flowers
 *   4  a garland: bunting, fairy lights, pennants or star lanterns
 *   5  its first wonder (pages circling the owl, a windmill, the armillary,
 *      sunflowers, glinting jam jars, falling petals, the bell, camp lanterns)
 *   6  birds on the roof by day
 *   7  its second wonder (letters rising from the book, a balloon, the night
 *      sky, the vegetable bed, a weathervane, porch lanterns, pigeons, fireworks)
 *   8  golden dust in the air, the fullest flowers
 *   9  a golden glow round the whole house
 *  10  a crown of light over the roof
 *
 * The colour and the windows are baked into the house body (scenery.js
 * bakeBody). Everything else is drawn on the house's own parts canvas, just in
 * front of its walls, so it sorts with the friends exactly as the house does,
 * and only for houses on screen. Anchors are written in each sprite's own
 * pixels (`LOCAL`) and moved into the world once (`HOUSE_ART`).
 */

import { HOUSES, PLACED, CELLS, worldPoint } from './landscape.js';
import { LAMPS, WINDOWS, CHIMNEYS } from '../pets/paths.js';
import { drawMechanisms } from './mechanisms.js';
import {
  stamp, glow, glowSprite, glyphSprite, flowerBush, pottedPlant, sunflowerHead, pumpkin, lanternSprite, starLanternSprite,
  bookStack, cogCrate, teaSet, logBench, roseBasket, mendingCart, balloonSprite, crownStarSprite,
  drawBunting, drawFairyLights, drawBird, drawPage, drawWindmill, twinkle, litEllipse, INK, rgba,
} from './paint.js';
import { rng } from '../world/engine/palette.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ */
/* Where everything goes, house by house (sprite pixels)                */
/* ------------------------------------------------------------------ */

/**
 * mask      the house's middle and half-size [cx, cy, rx, ry] (fireflies, the camera)
 * flowers   [x, y, kind, size, stage]      keep  the stage-3 keepsake: [sprite, x, y]
 * garland   the stage-4 string(s)          perch where birds sit from stage 6
 * aura      the stage-9 glow [x, y, r]     crown the stage-10 star   motes the stage-8 dust
 * wonders   [stage 5, stage 7], each drawn round its anchor in `at`
 */
const LOCAL = {
  chai: {
    mask: [440, 470, 420, 300], keep: ['books', 560, 726],
    flowers: [[60, 704, 'rose', 1, 2], [835, 700, 'cream', 1, 2], [522, 712, 'lilac', 1, 3], [205, 712, 'sun', 1, 3], [30, 690, 'coral', 1.15, 8], [866, 690, 'rose', 1.05, 8]],
    garland: [{ kind: 'bunting', a: [372, 200], b: [72, 438], sag: 10, n: 10 }, { kind: 'bunting', a: [388, 200], b: [598, 418], sag: 9, n: 9 }],
    perch: [[375, 186], [660, 402], [770, 402]], aura: [440, 480, 430], crown: [375, 104], motes: [440, 520, 380, 220],
    wonders: ['pages', 'letters'], at: { pages: [380, 300], letters: [380, 378] },
  },
  matcha: {
    mask: [460, 460, 400, 300], keep: ['sprouts', 380, 748],
    flowers: [[100, 704, 'cream', 1, 2], [860, 700, 'rose', 1, 2], [420, 760, 'lilac', 1, 3], [130, 740, 'sun', 1, 3], [60, 690, 'coral', 1.1, 8], [800, 760, 'rose', 1.1, 8]],
    garland: { kind: 'lights', a: [100, 420], b: [620, 380], sag: 30, n: 14 },
    perch: [[330, 232], [520, 212], [700, 272]], aura: [450, 450, 420], crown: [440, 84], motes: [450, 500, 380, 220],
    wonders: ['sunflowers', 'garden'], at: { sunflowers: [70, 696], garden: [560, 700] },
  },
  ginger: {
    mask: [440, 470, 400, 260], keep: ['cogs', 160, 640],
    flowers: [[90, 650, 'rose', 1, 2], [205, 704, 'sun', 1, 2], [120, 620, 'lilac', 1, 3], [150, 700, 'cream', 1, 3], [70, 668, 'coral', 1.15, 8], [250, 714, 'rose', 1.05, 8]],
    garland: { kind: 'lights', a: [95, 455], b: [780, 420], sag: 16, n: 16 },
    perch: [[260, 295], [380, 280], [680, 325]], aura: [440, 470, 420], crown: [450, 186], motes: [440, 500, 380, 200],
    wonders: ['windmill', 'balloon'], at: { windmill: [330, 262], balloon: [826, 300] },
  },
  mallow: {
    mask: [400, 430, 380, 360], keep: ['books', 690, 760],
    flowers: [[150, 745, 'lilac', 1, 2], [640, 745, 'sky', 1, 2], [100, 700, 'cream', 1, 3], [720, 720, 'lilac', 1, 3], [60, 720, 'sky', 1.1, 8], [780, 700, 'cream', 1.1, 8]],
    garland: { kind: 'stars', a: [150, 360], b: [660, 350], sag: 16, n: 9 },
    perch: [[440, 95], [300, 165], [580, 120]], aura: [400, 450, 430], crown: [500, 34], motes: [400, 480, 360, 250],
    wonders: ['orrery', 'sky'], at: { orrery: [196, 452], sky: [400, 60] },
  },
  mochi: {
    mask: [420, 450, 400, 300], keep: ['tea', 708, 716],
    flowers: [[60, 690, 'cream', 1, 2], [810, 670, 'sun', 1, 2], [470, 700, 'coral', 1, 3], [120, 705, 'cream', 1, 3], [40, 670, 'lilac', 1.1, 8], [780, 700, 'rose', 1.05, 8]],
    garland: { kind: 'pennants', a: [600, 470], b: [830, 480], sag: 8, n: 9 },
    perch: [[300, 240], [420, 222], [470, 215]], aura: [420, 440, 430], crown: [420, 134], motes: [420, 480, 380, 220],
    wonders: ['jars', 'vane'], at: { jars: [392, 562], vane: [478, 206] },
  },
  biscuit: {
    mask: [430, 450, 420, 280], keep: ['roses', 580, 710],
    flowers: [[60, 665, 'cream', 1, 2], [860, 640, 'sun', 1, 2], [560, 700, 'lilac', 1, 3], [220, 700, 'cream', 1, 3], [30, 650, 'coral', 1.1, 8], [850, 670, 'sky', 1.05, 8]],
    garland: { kind: 'lights', a: [600, 470], b: [850, 455], sag: 10, n: 11 },
    perch: [[300, 248], [420, 245], [560, 280]], aura: [430, 440, 440], crown: [430, 164], motes: [430, 480, 400, 200],
    wonders: ['petals', 'docklights'], at: { petals: [390, 400], docklights: [720, 476] },
  },
  sesame: {
    mask: [400, 480, 380, 400], keep: ['cart', 600, 830],
    flowers: [[110, 795, 'lilac', 1, 2], [760, 800, 'cream', 1, 2], [480, 820, 'sky', 1, 3], [170, 820, 'lilac', 1, 3], [80, 770, 'coral', 1.1, 8], [790, 780, 'cream', 1.05, 8]],
    garland: { kind: 'bunting', a: [440, 470], b: [790, 580], sag: 12, n: 10 },
    perch: [[250, 282], [360, 252], [500, 460], [600, 462]], aura: [400, 500, 450], crown: [312, 14], motes: [400, 560, 350, 260],
    wonders: ['bell', 'pigeons'], at: { bell: [355, 330] },
  },
  toffee: {
    mask: [400, 520, 380, 320], keep: ['logs', 600, 650],
    flowers: [[90, 620, 'sun', 1, 2], [700, 620, 'coral', 1, 2], [60, 780, 'cream', 1, 3], [720, 780, 'sun', 1, 3], [120, 840, 'rose', 1.1, 8], [660, 840, 'cream', 1.1, 8]],
    garland: { kind: 'lights', a: [110, 395], b: [820, 380], sag: 22, n: 14 },
    perch: [[350, 176], [500, 200], [620, 280]], aura: [400, 520, 420], crown: [380, 96], motes: [400, 600, 360, 220],
    wonders: ['camplights', 'fireworks'], at: { camplights: [379, 706], fireworks: [380, 250] },
  },
};

const W = (id, p) => { const q = worldPoint(id, p); return [q.x, q.y]; };
const S = (id, r) => r * PLACED[id].k;

/** The anchors above, in world px. */
export const HOUSE_ART = Object.freeze(Object.fromEntries(Object.entries(LOCAL).map(([id, a]) => [id, Object.freeze({
  mask: [...W(id, a.mask), S(id, a.mask[2]), S(id, a.mask[3])],
  flowers: a.flowers.map(([x, y, kind, size, from]) => [...W(id, [x, y]), kind, size, from]),
  keep: a.keep ? [a.keep[0], ...W(id, [a.keep[1], a.keep[2]])] : null,
  garland: [].concat(a.garland).map((G) => ({ ...G, a: W(id, G.a), b: W(id, G.b) })),
  perch: a.perch.map((p) => W(id, p)),
  aura: [...W(id, a.aura), S(id, a.aura[2])],
  crown: W(id, a.crown),
  motes: [...W(id, a.motes), S(id, a.motes[2]), S(id, a.motes[3])],
  wonders: a.wonders,
  at: Object.fromEntries(Object.entries(a.at).map(([k, p]) => [k, W(id, p)])),
})])));

/** LAMPS that belong to a house (lit from stage 1); WINDOWS (lit from stage 2). */
export const LAMP_HOUSE = new Map(LAMPS.map((l, i) => [i, l.house]));
export const WINDOW_HOUSE = new Map(WINDOWS.map((w, i) => [i, w.house]));

const stageOf = (stages, id) => clamp(Math.floor(Number(stages?.[id]) || 0), 0, 10);

/** Saturation, brightness and warmth at a stage: faded at 0, as painted at 3, rich and golden at 10 (baked into the body by scenery.js). */
export function gradeOf(stage) {
  const s = clamp(stage, 0, 10);
  if (s <= 3) { const t = s / 3; return { sat: 0.8 + 0.2 * t, bri: 0.95 + 0.05 * t, warm: -0.35 * (1 - t) }; }
  const t = (s - 3) / 7;
  return { sat: 1 + 0.15 * t, bri: 1 + 0.045 * t, warm: 0.6 * t };
}

const KEEPSAKE = {
  books: () => bookStack(1), cogs: () => cogCrate(1), sprouts: () => pottedPlant('sprout', 1),
  tea: () => teaSet(), roses: () => roseBasket(), cart: () => mendingCart(), logs: () => logBench(),
};

/** The order houses are drawn in: back (top of the valley) to front. */
const ORDER = Object.keys(HOUSES).sort((a, b) => PLACED[a].y - PLACED[b].y);
const visible = (b, r) => b.x + b.w > r.x && b.x < r.x + r.w && b.y + b.h > r.y && b.y < r.y + r.h;
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/**
 * @param {{ reduced: boolean, stages: object, scene: object, scale: () => number }} o
 *   scene: scenery.js mountScene() (each house's parts canvas); scale: the camera's world-to-screen scale
 * @returns {{ setStages(s), draw(g, now, dt, rect, env), stageOf(id), chimneys(): Array<{x,y}>, burst(id) }}
 *   env: { dark, night, hour, weather, tint, flame } where tint is a CSS colour laid over plain (unlit) paint after dark
 */
export function createHouseLife({ reduced = false, stages: initial = {}, scene = null, scale = () => 1 } = {}) {
  let stages = { ...initial };
  const st = (id) => stageOf(stages, id);
  const R = rng('houses');
  const rand = (a, b) => a + R() * (b - a);

  /* Per-house state for the things that remember (birds, letters, petals...). */
  const S2 = Object.fromEntries(Object.keys(HOUSE_ART).map((id) => [id, { birds: [], parts: [], next: rand(1500, 5000), shoot: rand(4e3, 9e3), burst: 0, drawn: -1e9, key: '' }]));
  const birdColours = [['#8A5A3A', '#E8D2A8'], ['#6E5A4A', '#D8C8B0'], ['#9A6A3A', '#F0DCB8']];
  const pigeon = ['#8C8F9C', '#CFD2DA'];

  const ensureBirds = (id, h, n, env) => {
    const s = S2[id];
    while (s.birds.length < n) {
      const spot = h.perch[s.birds.length % h.perch.length];
      const cols = id === 'sesame' ? pigeon : birdColours[s.birds.length % 3];
      // They fly in, unless nothing moves: then they are simply sitting there.
      s.birds.push(reduced ? { home: spot, x: spot[0], y: spot[1], mode: 'sit', t: 0, dir: s.birds.length % 2 ? 1 : -1, until: Infinity, away: false, colour: cols[0], belly: cols[1] }
        : { home: spot, x: spot[0] + 50, y: spot[1] - 70, mode: 'fly', t: rand(0, 9), dir: -1, until: 0, away: false, colour: cols[0], belly: cols[1] });
    }
    s.birds.length = Math.min(s.birds.length, n);
    for (const b of s.birds) b.sleepy = env.dark;
  };

  const stepBird = (b, now, dt) => {
    const [hx, hy] = b.home;
    b.t += dt;
    if (b.mode === 'fly') {
      const tx = b.away ? hx + b.dir * 120 : hx, ty = b.away ? hy - 90 : hy;
      const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy), v = 60 * dt;
      b.dir = dx >= 0 ? 1 : -1;
      if (d <= v) { b.x = tx; b.y = ty; if (b.away) { b.away = false; b.x = hx + (R() < 0.5 ? -1 : 1) * 100; b.y = hy - 80; b.until = now + rand(6e3, 14e3); b.mode = 'gone'; } else { b.mode = 'sit'; b.until = now + rand(2e3, 5e3); } }
      else { b.x += (dx / d) * v; b.y += (dy / d) * v; }
    } else if (b.mode === 'gone') {
      if (now > b.until) b.mode = 'fly';
    } else if (now > b.until) {
      const r = R();
      if (r < 0.12) { b.mode = 'fly'; b.away = true; b.dir = R() < 0.5 ? -1 : 1; }
      else if (r < 0.45) { b.mode = 'peck'; b.until = now + 300; }
      else if (r < 0.7) { b.home = [hx + rand(-4, 4), hy]; b.x = b.home[0]; b.dir *= R() < 0.5 ? -1 : 1; b.mode = 'sit'; b.until = now + rand(800, 2200); }
      else { b.mode = 'sit'; b.until = now + rand(1500, 4000); }
    }
  };

  /** A sprite from the art pack's atlases at world width `w`, anchored at its base centre. */
  const atlas = (g, img, cell, x, y, w, { sx = 1, rot = 0, ay = 1 } = {}) => {
    if (!img) return;
    const [cx, cy, cw, ch] = cell, h = (w * ch) / cw;
    g.save(); g.translate(x, y); if (rot) g.rotate(rot); if (sx !== 1) g.scale(sx, 1);
    g.drawImage(img, cx, cy, cw, ch, -w / 2, -ay * h, w, h);
    g.restore();
  };

  /* ---------------- the wonders (world px, round their anchor A) ---------------- */

  const wonder = {
    /* Library 5: pages drift out and circle the owl, turning as they go. */
    pages(g, now, dt, env, h, lit) {
      const [cx, cy] = h.at.pages, n = 5;
      for (let k = 0; k < n; k += 1) {
        const a = now / 4200 + (k * TAU) / n, x = cx + Math.cos(a) * 92, y = cy + Math.sin(a) * 24 + Math.sin(now / 900 + k) * 3;
        drawPage(g, x, y, { turn: Math.cos(now / 700 + k * 1.3), rot: Math.sin(a) * 0.25, size: 1.55, glowA: 0 });
      }
      return () => { for (let k = 0; k < n; k += 1) { const a = now / 4200 + (k * TAU) / n; glow(g, '255,226,150', cx + Math.cos(a) * 92, cy + Math.sin(a) * 24, 12, 0.25 + 0.5 * lit); } };
    },
    /* Library 7: words lift off the open book on the gable and float up. */
    letters(g, now, dt, env, h, lit, s) {
      const [bx, by] = h.at.letters;
      if (now > s.next) { s.next = now + rand(260, 520); s.parts.push({ k: 'l', x: bx + rand(-10, 10), y: by, vx: rand(-4, 4), vy: rand(-16, -11), age: 0, life: rand(2.6, 3.6), ch: LETTERS[Math.floor(R() * 26)], w: rand(0, 6) }); }
      for (const p of s.parts) { if (p.k !== 'l') continue; const k = p.age / p.life; stamp(g, glyphSprite(p.ch, 7, true, '#7A5428'), p.x + Math.sin(now / 500 + p.w) * 4, p.y, { alpha: Math.min(1, k / 0.15) * (1 - k) }); }
      return () => { if (!lit) return; glow(g, '255,220,140', bx, by + 2, 16, 0.5 * lit); for (const p of s.parts) if (p.k === 'l') glow(g, '255,220,140', p.x, p.y - 2, 5, 0.35 * lit * (1 - p.age / p.life)); };
    },
    /* Railway 5: a little windmill on the ridge. */
    windmill(g, now, dt, env, h) { const [x, y] = h.at.windmill; drawWindmill(g, x, y, { angle: now / (env.weather === 'rain' ? 380 : 620), r: 18 }); },
    /* Railway 7: a patchwork balloon on a long rope, riding the wind. */
    balloon(g, now, dt, env, h) {
      const [ax, ay] = h.at.balloon, bx = ax + Math.sin(now / 3100) * 5, by = ay - 40 + Math.sin(now / 2300) * 4;
      g.strokeStyle = rgba(INK, 0.7); g.lineWidth = 0.6; g.beginPath(); g.moveTo(bx, by - 1); g.quadraticCurveTo(bx - 10, by + 26, ax - 14, ay + 18); g.stroke();
      stamp(g, balloonSprite(), bx, by, { rot: Math.sin(now / 2600) * 0.05, scale: 1.3 });
    },
    /* Observatory 5: the armillary on the terrace, its rings turning. */
    orrery(g, now, dt, env, h, lit) {
      const [x, y] = h.at.orrery, I = scene?.images ?? {};
      atlas(g, I.mechanisms, CELLS.mechanisms.armillary, x, y, 17, { sx: 0.78 + 0.22 * Math.cos(now / 2600) });
      return () => { glow(g, '255,214,120', x, y - 12, lit ? 14 : 8, lit ? 0.7 : 0.3); };
    },
    /* Observatory 7: after dark, a constellation over the dome and shooting stars; by day, glints on the brass. */
    sky(g, now, dt, env, h, lit, s, stage) {
      const [cx, cy] = h.at.sky;
      return () => {
        if (!env.dark) { g.fillStyle = 'rgba(255,248,220,.9)'; for (let k = 0; k < 3; k += 1) { const a = Math.max(0, Math.sin(now / 900 + k * 2.1)) ** 8; if (a > 0.05) twinkle(g, cx + 30 + k * 9, cy + 16 + k * 7, 2 + a * 3); } return; }
        const stars = [[-104, 12], [-78, -14], [-42, 0], [0, -32], [38, -6], [72, -24], [104, 4], [-64, 32], [52, 28]].slice(0, 5 + Math.max(0, stage - 7) * 2).map(([x, y]) => [cx + x, cy + y - 20]);
        g.strokeStyle = 'rgba(200,220,255,.28)'; g.lineWidth = 0.6; g.beginPath(); stars.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke();
        for (const [i, [x, y]] of stars.entries()) { const a = 0.6 + 0.4 * Math.sin(now / 700 + i * 1.9); glow(g, '210,226,255', x, y, 7, a); g.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`; twinkle(g, x, y, 2.4 * a + 0.8); }
        if (stage >= 9 && now > s.shoot) { s.shoot = now + rand(5e3, 11e3); s.parts.push({ k: 's', x: rand(cx - 150, cx - 20), y: rand(cy - 60, cy - 30), age: 0, life: 1.1 }); }
        for (const p of s.parts) { if (p.k !== 's') continue; const k = p.age / p.life, x = p.x + k * 140, y = p.y + k * 46; const gr = g.createLinearGradient(x - 30, y - 10, x, y); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(255,250,230,${(1 - k).toFixed(2)})`); g.strokeStyle = gr; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x - 30, y - 10); g.lineTo(x, y); g.stroke(); }
      };
    },
    /* Glasshouse 5: three sunflowers by the door, heads nodding in the breeze. */
    sunflowers(g, now, dt, env, h) {
      const [ax, ay] = h.at.sunflowers;
      for (const [k, [ox, oy, tall]] of [[0, [0, 0, 44]], [1, [14, -4, 52]], [2, [30, -1, 40]]]) {
        const x = ax + ox, base = ay + oy, sway = Math.sin(now / 1500 + k * 1.3 + x / 90) * 2.4, hx = x + sway, hy = base - tall;
        g.strokeStyle = '#4E6B2C'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, base); g.quadraticCurveTo(x + sway * 0.2, base - tall / 2, hx, hy); g.stroke();
        g.strokeStyle = INK; g.lineWidth = 0.35; g.stroke();
        for (const [t, side] of [[0.45, -1], [0.62, 1]]) { const lx = x + sway * t * 0.5, ly = base - tall * t; litEllipse(g, lx + side * 3.4, ly, 3.6, 1.6, '#6E8C3A', { lw: 0.35 }); }
        stamp(g, sunflowerHead(k + 1), hx, hy, { rot: sway * 0.05, scale: 1.05 });
      }
    },
    /* Glasshouse 7: pumpkins by the vegetable bed, a sprinkler arcs over it, bees work the flowers. */
    garden(g, now, dt, env, h) {
      const [ax, ay] = h.at.garden;
      stamp(g, pumpkin(1, 1.2), ax - 30, ay + 14); stamp(g, pumpkin(2, 1), ax - 14, ay + 18);
      if (!env.dark && env.weather !== 'rain') {
        const a = Math.sin(now / 1400) * 0.9;
        for (let k = 0; k < 14; k += 1) { const t = ((now / 900 + k / 14) % 1), x = ax + Math.sin(a) * 30 * t, y = ay - 26 * t + 34 * t * t; g.fillStyle = `rgba(170,214,245,${(0.85 * (1 - t)).toFixed(2)})`; g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill(); }
        for (let k = 0; k < 4; k += 1) {
          const t = now / 1000 + k * 7, x = ax + 40 + Math.sin(t * 0.9 + k) * 26 + Math.sin(t * 3.1) * 4, y = ay + 4 + Math.cos(t * 1.2 + k) * 8 + Math.sin(t * 4) * 2;
          g.fillStyle = '#F2C14E'; g.beginPath(); g.ellipse(x, y, 1.6, 1.1, 0, 0, TAU); g.fill(); g.strokeStyle = '#2c2018'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x - 0.4, y - 1); g.lineTo(x - 0.4, y + 1); g.moveTo(x + 0.6, y - 1); g.lineTo(x + 0.6, y + 1); g.stroke();
          g.fillStyle = 'rgba(255,255,255,.7)'; const f = Math.abs(Math.sin(now / 30 + k)) * 1.4 + 0.4; g.beginPath(); g.ellipse(x - 0.4, y - 1.6, f, 0.8, -0.4, 0, TAU); g.fill();
        }
      }
    },
    /* Pantry 5: the jam jars on the shelf catch the light, and now and then a pot bubbles. */
    jars(g, now, dt, env, h, lit, s) {
      const [ax, ay] = h.at.jars;
      if (now > s.next) { s.next = now + rand(900, 2200); s.parts.push({ k: 'b', x: ax + rand(-26, 26), y: ay - 14, vx: rand(-2, 2), vy: rand(-9, -6), age: 0, life: rand(1.4, 2.2), r: rand(1, 1.8) }); }
      for (const p of s.parts) { if (p.k !== 'b') continue; const k = p.age / p.life; g.strokeStyle = `rgba(255,248,230,${(0.8 * (1 - k)).toFixed(2)})`; g.lineWidth = 0.6; g.beginPath(); g.arc(p.x, p.y, p.r * (1 + k), 0, TAU); g.stroke(); }
      return () => {
        g.fillStyle = 'rgba(255,250,225,.95)';
        for (let k = 0; k < 6; k += 1) { const a = Math.max(0, Math.sin(now / 760 + k * 1.7)) ** 7; if (a > 0.05) twinkle(g, ax - 30 + (k % 3) * 26 + (k > 2 ? 10 : 0), ay - 10 + (k > 2 ? 16 : 0), 1.4 + a * 2.4); }
        if (lit) glow(g, '255,200,120', ax, ay, 26, 0.45 * lit);
      };
    },
    /* Pantry 7: the leaf weathervane on the ridge, swinging round with the wind. */
    vane(g, now, dt, env, h) {
      const [x, y] = h.at.vane, I = scene?.images ?? {}, a = Math.sin(now / 5200) * 1.4 + Math.sin(now / 1900) * 0.25;
      atlas(g, I.mechanisms, CELLS.mechanisms.vane, x, y, 20, { sx: Math.cos(a) || 0.01 });
    },
    /* Clockworks 5: the bell rings out (rings of sound) every half minute. */
    bell(g, now, dt, env, h, lit, s) {
      const [bx, by] = h.at.bell, period = 30000, ph = now % period;
      if (ph < 2600) {
        const k = ph / 2600;
        for (let j = 0; j < 3; j += 1) { const t = k - j * 0.18; if (t <= 0 || t >= 1) continue; g.strokeStyle = `rgba(255,232,160,${(0.75 * (1 - t)).toFixed(2)})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(bx, by, 10 + t * 50, 4 + t * 18, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.beginPath(); g.ellipse(bx, by, 10 + t * 50, 4 + t * 18, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke(); }
        if (!s.rang || s.rang < now - period / 2) { s.rang = now; s.scatter = now; }
      }
    },
    /* Clockworks 7: pigeons live on the roof (the birds use the pigeon colours here) and lift off when the bell rings. */
    pigeons() { /* the perched birds are pigeons at the clockworks; see ensureBirds */ },
    /* Cottage 5: rose petals drift from the arch. */
    petals(g, now, dt, env, h, lit, s) {
      const [ax, ay] = h.at.petals;
      if (now > s.next) { s.next = now + rand(380, 760); s.parts.push({ k: 'p', x: ax + rand(-50, 50), y: ay + rand(-6, 14), vx: rand(-7, -2), vy: rand(5, 10), r: rand(0, 6), vr: rand(-2, 2), age: 0, life: rand(5, 7), c: ['#F2B6B8', '#E58C94', '#FBE3E8'][Math.floor(R() * 3)] }); }
      for (const p of s.parts) { if (p.k !== 'p') continue; p.x += (p.vx + Math.sin(now / 700 + p.r) * 6) * dt; p.y += p.vy * dt; p.r += p.vr * dt; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.min(1, (p.life - p.age) / 1.2); g.fillStyle = p.c; g.beginPath(); g.ellipse(0, 0, 1.7, 1, 0, 0, TAU); g.fill(); g.restore(); }
      g.globalAlpha = 1;
    },
    /* Cottage 7: paper lanterns along the porch, swaying. */
    docklights(g, now, dt, env, h, lit) {
      const [ax, ay] = h.at.docklights, spots = [[ax - 34, ay], [ax, ay + 2], [ax + 34, ay - 2]], cols = ['#D9603A', '#E9A23B', '#D97A8A'];
      spots.forEach(([x, y], k) => stamp(g, lanternSprite(cols[k]), x, y, { rot: Math.sin(now / 1300 + k) * 0.12 }));
      return () => { if (!lit) return; spots.forEach(([x, y], k) => glow(g, '255,190,110', x, y + 8, 16, lit * (0.8 + 0.2 * Math.sin(now / 400 + k)))); };
    },
    /* Hearth 5: lanterns on poles round the camp. */
    camplights(g, now, dt, env, h, lit) {
      const [cx, cy] = h.at.camplights, spots = [[-62, -22], [62, -24], [-54, 28], [56, 26]].map(([x, y]) => [cx + x, cy + y]), cols = ['#D9603A', '#E9A23B', '#D97A8A', '#7FA65A'];
      for (const [k, [x, y]] of spots.entries()) {
        g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y + 24); g.lineTo(x, y - 2); g.lineTo(x + 6, y - 2); g.stroke();
        g.strokeStyle = '#8A5A32'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y + 24); g.lineTo(x, y - 2); g.lineTo(x + 6, y - 2); g.stroke();
        stamp(g, lanternSprite(cols[k]), x + 6, y - 2, { rot: Math.sin(now / 1200 + k) * 0.1, scale: 1.1 });
      }
      return () => { if (!lit) return; for (const [k, [x, y]] of spots.entries()) glow(g, '255,190,110', x + 6, y + 6, 15, lit * (0.85 + 0.15 * Math.sin(now / 330 + k))); };
    },
    /* Hearth 7: fireworks after dark; by day, sparklers over the camp. */
    fireworks(g, now, dt, env, h, lit, s) {
      const [cx, cy] = h.at.fireworks;
      if (now > s.shoot) {
        s.shoot = now + (env.dark ? rand(2600, 5200) : rand(4000, 7000));
        const x = cx + rand(-90, 90), y = cy + rand(-40, 30), cols = ['255,190,110', '255,140,160', '170,220,255', '255,236,150', '190,255,170'], c = cols[Math.floor(R() * cols.length)];
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

  /** The things a house has grown that keep still: flowers and its keepsake. */
  function statics(id, g, stage) {
    const h = HOUSE_ART[id];
    if (stage < 2) return;
    for (const [x, y, kind, size, from] of h.flowers) if (stage >= from) stamp(g, flowerBush(kind, Math.round(x + y) % 7, size), x, y);
    if (stage >= 3 && h.keep) {
      const [k, x, y] = h.keep;
      stamp(g, KEEPSAKE[k](), x, y);
      if (k === 'sprouts') stamp(g, pottedPlant('rose', 2), x + 13, y + 3);
    }
  }

  /** Draw a house's plain paint now; return what glows, to be added after the hour's colour. */
  function drawHouse(id, g, now, dt, env) {
    const h = HOUSE_ART[id], stage = st(id), s = S2[id];
    const lights = [];
    if (!stage) return lights;
    const lit = env.night ? 1 : env.dark ? 0.75 : env.hour === 'dawn' ? 0.35 : 0;

    /* 4: the garland */
    if (stage >= 4) for (const G of h.garland) {
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

    /* 6: birds (pigeons at the clockworks) on the roof, by day */
    if (stage >= 6 && !env.night) {
      const n = Math.min(h.perch.length, stage >= 8 ? 3 : 2) + (id === 'sesame' && stage >= 7 ? 1 : 0);
      ensureBirds(id, h, n, env);
      const scatter = id === 'sesame' && s.scatter && now - s.scatter < 400;
      for (const bd of s.birds) {
        if (scatter && bd.mode !== 'fly' && bd.mode !== 'gone') { bd.mode = 'fly'; bd.away = true; bd.dir = R() < 0.5 ? -1 : 1; }
        if (!reduced) stepBird(bd, now, dt);
        if (bd.mode !== 'gone') drawBird(g, bd.x, bd.y, { dir: bd.dir, mode: bd.mode === 'fly' ? 'fly' : bd.mode, flap: bd.t * 18, colour: bd.colour, belly: bd.belly, size: id === 'sesame' ? 1.05 : 0.95 });
      }
      if (scatter) s.scatter = 0;
    }
    lights.push(() => glowsOf(id, h, stage, s, g, now, env));
    return lights;
  }

  /** The stage 8 to 10 lights, and the burst of a house that just grew (drawn in the light pass). */
  function glowsOf(id, h, stage, s, g, now, env) {
    if (stage >= 8) {
      const [mx, my, mrx, mry] = h.motes;
      for (let k = 0; k < 7; k += 1) {
        const t = (now / 9000 + k / 7) % 1, x = mx + Math.sin(k * 2.3 + now / 3000) * mrx * 0.8, y = my + mry * 0.6 - t * mry * 1.6;
        glow(g, '255,226,150', x, y, 3.2, Math.sin(t * Math.PI) * (env.dark ? 0.9 : 0.55));
      }
    }
    /* 9: the golden glow round the whole house is a still CSS halo (village.js), so it costs no drawing at all */
    if (stage >= 10) {
      const [cx, cy] = h.crown, bob = Math.sin(now / 1100) * 2.4;
      glow(g, '255,220,130', cx, cy + bob, 34, 0.85);
      g.globalCompositeOperation = 'source-over';
      stamp(g, crownStarSprite(), cx, cy + bob, { scale: 1.3, rot: Math.sin(now / 1700) * 0.12 });
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(255,246,200,.9)';
      for (let k = 0; k < 5; k += 1) { const a = Math.max(0, Math.sin(now / 520 + k * 1.6)) ** 6; if (a > 0.05) twinkle(g, cx + Math.cos(k * 1.7) * 18, cy + bob + Math.sin(k * 2.2) * 12, 2 + a * 3.4); }
    }
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

  /** The parts canvas's sharpness: the screen's, capped (the sprites are no sharper, and eight big canvases cost a phone). */
  const sharpness = () => clamp(Math.round(scale() * (window.devicePixelRatio || 1) * 4) / 4, 0.75, 1.25);
  /** A house's parts canvas covers the house, and the sky above it once it has wonders, birds or a crown. */
  const fit = (H, stage) => {
    const box = stage >= 5 ? H.frame.parts : H.frame.snug;
    if (box === H.box) return;
    H.box = box;
    Object.assign(H.parts.style, { left: `${box.x.toFixed(1)}px`, top: `${box.y.toFixed(1)}px`, width: `${box.w.toFixed(1)}px`, height: `${box.h.toFixed(1)}px` });
  };

  return {
    setStages(next) { stages = { ...next }; for (const s of Object.values(S2)) s.drawn = -1e9; },
    stageOf: st,
    /** Chimneys that smoke: a house's own from stage 1. */
    chimneys() { return CHIMNEYS.filter((c) => st(c.house) >= 1); },
    /** A house that just grew sends up a burst of light (starting the next time it is drawn). */
    burst(id) { if (S2[id] && !reduced) S2[id].burst = -1; },
    /**
     * Each house on screen redraws its own parts canvas (at most 30 times a
     * second; once per call with less motion, where `now` is held still).
     * `g` (the shared scene canvas) is not drawn on: a house's things sort with the house.
     */
    draw(g, now, dt, rect, env) {
      if (!scene) return;
      const K = sharpness();
      for (const id of ORDER) {
        const H = scene.houses[id], s = S2[id], stage = st(id);
        // particles a house remembers age here, so a house off screen does not pile them up
        for (let i = s.parts.length - 1; i >= 0; i -= 1) { const p = s.parts[i]; p.age += dt; if (p.k !== 'f' && p.k !== 'p') { p.x = (p.x ?? 0) + (p.vx ?? 0) * dt; p.y = (p.y ?? 0) + (p.vy ?? 0) * dt; } if (p.age > p.life) { s.parts[i] = s.parts[s.parts.length - 1]; s.parts.pop(); } }
        if (!H) continue;
        fit(H, stage);
        if (!visible(H.box, rect)) continue;
        const key = `${K}|${env.hour}|${env.weather}|${stage}|${env.flame}`;
        // A house still asleep has nothing moving (the camp's fire always burns): drawn once per look. Awake: 25 times a second.
        const still = reduced || (stage === 0 && id !== 'toffee');
        // Seen from far off (the whole valley on a phone) a house is small: 12 redraws a second are plenty.
        if (key === s.key && (still || now - s.drawn < (scale() < 0.7 ? 80 : 40))) continue;
        s.drawn = now; s.key = key;
        const { box } = H, c = H.parts, cw = Math.round(box.w * K), ch = Math.round(box.h * K);
        if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
        const hg = H.g;
        hg.setTransform(K, 0, 0, K, -box.x * K, -box.y * K);
        hg.clearRect(box.x, box.y, box.w, box.h);
        drawMechanisms(id, hg, reduced ? 0 : now, env, stage, scene.images);
        statics(id, hg, stage);
        const lights = drawHouse(id, hg, reduced ? 0 : now, dt, env);
        // Plain paint takes the hour's colour, as the bodies do; lights go on top, added.
        if (env.tint) { hg.globalCompositeOperation = 'source-atop'; hg.fillStyle = env.tint; hg.fillRect(box.x, box.y, box.w, box.h); }
        hg.globalCompositeOperation = 'lighter';
        for (const f of lights) f();
        hg.globalCompositeOperation = 'source-over';
      }
      void g;
    },
  };
}

export { glowSprite };
