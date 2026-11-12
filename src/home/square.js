/**
 * square.js — the village square, painted in code (no game state).
 *
 * The green used to be an empty meadow with bunting floating over it. Now it
 * is the place everyone meets: a round of cobbles laid in the valley's own
 * perspective (rings of stones round the fountain, a terracotta band, kerb
 * stones at the edge, grass growing over it), dirt lanes in from the main
 * lane, and the things that stand on it, each its own sprite so a friend can
 * walk in front of or behind it: the fountain, the notice board where
 * tonight's Muddle is posted, a market stall, two benches, four lamp posts.
 *
 * The brush is paint.js's: light from the upper left, a soft core shadow
 * lower right, a thin dark-brown line, grain. Painted once when the village
 * opens (a few milliseconds); the cobbles lie under the hour's CSS tint like
 * the terrain, and the standing pieces are re-lit for the hour by scenery.js
 * the same way the bridges and oaks are. Geometry: landscape.js SQUARE.
 */

import { SQUARE } from './landscape.js';
import { sprite, litEllipse, litPath, groundShadow, flowerBush, pottedPlant, tone, rgba, INK, canvasOf } from './paint.js';
import { rng } from '../world/engine/palette.js';

const TAU = Math.PI * 2;

/* ---- The ground: cobbles and lanes ------------------------------------ */

/** The world box the ground canvas covers (the round, its lanes, and room for the grass over its edge). */
export const SQUARE_BOX = (() => {
  const xs = [SQUARE.cx - SQUARE.rx - 14, SQUARE.cx + SQUARE.rx + 14, ...SQUARE.paths.flat().map((p) => p[0])];
  const ys = [SQUARE.cy - SQUARE.ry - 14, SQUARE.cy + SQUARE.ry + 14, ...SQUARE.paths.flat().map((p) => p[1])];
  const x = Math.floor(Math.min(...xs) - 18), y = Math.floor(Math.min(...ys) - 18);
  return Object.freeze({ x, y, w: Math.ceil(Math.max(...xs) + 18) - x, h: Math.ceil(Math.max(...ys) + 18) - y });
})();

const STONE = ['#D9C49B', '#CFB98E', '#E2D0AA', '#C7AE83', '#D4BE95', '#DCCAA2'];
const BAND = ['#C08A62', '#B57C56', '#C99770', '#AD7550'];
const KERB = ['#BFB194', '#B3A586', '#C8BB9E'];
const GRASS = ['#6E8A2E', '#7F9B37', '#93AE45', '#A9C056', '#5E7A28'];

/** A point on the square's ellipse at normalised radius rho and angle a. */
const at = (rho, a) => [SQUARE.cx + Math.cos(a) * SQUARE.rx * rho, SQUARE.cy + Math.sin(a) * SQUARE.ry * rho];

/** The round's edge, a little uneven, as a closed path. */
function edgePath(g, k, rand) {
  const n = 64, wob = Array.from({ length: n }, () => 1 + (rand() - 0.5) * 0.035);
  g.beginPath();
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * TAU, [x, y] = at(k * wob[i % n], a);
    g[i ? 'lineTo' : 'moveTo'](x, y);
  }
  g.closePath();
}

/** One cobble between two rings and two angles: a rounded four-sided stone, lit from the upper left. */
function cobble(g, r0, r1, a0, a1, base, rand) {
  const inset = 0.08;
  const ra = r0 + (r1 - r0) * inset, rb = r1 - (r1 - r0) * inset;
  const da = (a1 - a0) * inset;
  const pts = [at(ra, a0 + da), at(ra, a1 - da), at(rb, a1 - da), at(rb, a0 + da)];
  const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cy = pts.reduce((s, p) => s + p[1], 0) / 4;
  // A rounded quad: midpoints joined by curves through the corners.
  const path = () => {
    g.beginPath();
    for (let i = 0; i < 4; i += 1) {
      const p = pts[i], q = pts[(i + 1) % 4], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      if (!i) { const l = pts[3], m0 = [(l[0] + p[0]) / 2, (l[1] + p[1]) / 2]; g.moveTo(m0[0], m0[1]); }
      g.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    g.closePath();
  };
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, h = Math.max(...ys) - y0;
  // a little shadow under and right of every stone
  g.save(); g.translate(0.45, 0.5); path(); g.fillStyle = 'rgba(70,52,30,.32)'; g.fill(); g.restore();
  path();
  const gr = g.createLinearGradient(x0, y0, x0 + w, y0 + h);
  gr.addColorStop(0, tone(base, 0.22)); gr.addColorStop(0.5, base); gr.addColorStop(1, tone(base, -0.16));
  g.fillStyle = gr; g.fill();
  g.strokeStyle = rgba(INK, 0.22); g.lineWidth = 0.35; g.stroke();
  // a fleck or two of grain
  if (rand() < 0.6) { g.fillStyle = tone(base, rand() < 0.5 ? 0.3 : -0.22); g.globalAlpha = 0.5; g.beginPath(); g.ellipse(cx + (rand() - 0.5) * w * 0.4, cy + (rand() - 0.5) * h * 0.4, 0.9, 0.5, rand() * 3, 0, TAU); g.fill(); g.globalAlpha = 1; }
}

/** A tuft of grass blades at (x, y). */
function tuft(g, x, y, rand, size = 1) {
  const n = 3 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i += 1) {
    const lean = (rand() - 0.5) * 2.4 * size, len = (2.4 + rand() * 3.4) * size;
    g.strokeStyle = GRASS[Math.floor(rand() * GRASS.length)]; g.lineWidth = 0.7 + rand() * 0.5;
    g.beginPath(); g.moveTo(x + (rand() - 0.5) * 2.4, y); g.quadraticCurveTo(x + lean * 0.4, y - len * 0.6, x + lean, y - len); g.stroke();
  }
}

/** A dirt lane like the valley's own: a soft dark verge, the warm earth, pale wear down the middle, grass over both edges. */
function lane(g, pts, rand) {
  const line = (w, style) => {
    g.strokeStyle = style; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke();
  };
  g.save(); g.filter = 'blur(2px)'; line(26, 'rgba(96,78,40,.35)'); g.restore();
  line(21, '#C9A46C');
  g.save(); g.filter = 'blur(1.5px)'; line(11, 'rgba(232,206,150,.55)'); g.restore();
  for (let s = 0; s < pts.length - 1; s += 1) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1], L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L;
    for (let d = 0; d < L; d += 3.2) {
      const t = d / L, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      // pebbles and wear in the earth
      if (rand() < 0.5) { const o = (rand() - 0.5) * 14; g.fillStyle = rand() < 0.5 ? 'rgba(150,118,72,.5)' : 'rgba(240,220,170,.5)'; g.beginPath(); g.ellipse(x + nx * o, y + ny * o, 0.9 + rand(), 0.6 + rand() * 0.5, rand() * 3, 0, TAU); g.fill(); }
      // grass reaching over both edges
      for (const side of [-1, 1]) if (rand() < 0.7) tuft(g, x + nx * side * (9.5 + rand() * 2.5), y + ny * side * (9.5 + rand() * 2.5), rand, 0.8);
    }
  }
}

/**
 * The square's ground as one canvas covering SQUARE_BOX, `k` canvas px per
 * world px. Lies flat under every friend and under the hour's tint.
 */
export function paintSquareGround(k = 2) {
  const B = SQUARE_BOX, c = canvasOf(B.w * k, B.h * k), g = c.getContext('2d');
  g.scale(k, k); g.translate(-B.x, -B.y);
  g.lineJoin = 'round'; g.lineCap = 'round';
  const rand = rng('village-square');

  for (const p of SQUARE.paths) lane(g, p, rand);

  // a soft dark rim where the cobbles meet the grass
  g.save(); g.filter = 'blur(3px)'; edgePath(g, 1.05, rng('rim')); g.fillStyle = 'rgba(78,64,34,.42)'; g.fill(); g.restore();
  // mortar under everything
  edgePath(g, 1.0, rng('edge'));
  g.fillStyle = '#9E8763'; g.fill();
  g.save(); edgePath(g, 1.0, rng('edge')); g.clip();

  // Rings of cobbles, from the fountain's kerb out to the edge.
  const RINGS = 9, r0 = 0.3;
  for (let i = 0; i < RINGS; i += 1) {
    const a = r0 + ((1 - r0) * i) / RINGS, b = r0 + ((1 - r0) * (i + 1)) / RINGS;
    const kerb = i === RINGS - 1, band = i === 4, rose = i < 2;
    const n = Math.max(12, Math.round((TAU * ((a + b) / 2) * SQUARE.rx) / (kerb ? 15 : 10.5)));
    const off = rand() * TAU;
    for (let j = 0; j < n; j += 1) {
      const a0 = off + (j / n) * TAU, a1 = off + ((j + 1) / n) * TAU;
      let pal = kerb ? KERB : band ? BAND : STONE;
      // a compass rose round the fountain: eight warm points
      if (rose) { const sector = Math.floor((((a0 + a1) / 2 - off + TAU * 4) % TAU) / (TAU / 16)); if (sector % 2 === 0) pal = BAND; }
      cobble(g, a, b, a0, a1, pal[Math.floor(rand() * pal.length)], rand);
    }
  }

  // light over the whole round from the upper left, shade lower right
  let gr = g.createRadialGradient(SQUARE.cx - SQUARE.rx * 0.45, SQUARE.cy - SQUARE.ry * 0.6, 4, SQUARE.cx - SQUARE.rx * 0.45, SQUARE.cy - SQUARE.ry * 0.6, SQUARE.rx * 1.3);
  gr.addColorStop(0, 'rgba(255,244,214,.22)'); gr.addColorStop(1, 'rgba(255,244,214,0)');
  g.fillStyle = gr; g.fillRect(B.x, B.y, B.w, B.h);
  gr = g.createRadialGradient(SQUARE.cx + SQUARE.rx * 0.6, SQUARE.cy + SQUARE.ry * 0.7, 4, SQUARE.cx + SQUARE.rx * 0.6, SQUARE.cy + SQUARE.ry * 0.7, SQUARE.rx * 1.1);
  gr.addColorStop(0, 'rgba(60,44,22,.2)'); gr.addColorStop(1, 'rgba(60,44,22,0)');
  g.fillStyle = gr; g.fillRect(B.x, B.y, B.w, B.h);
  // moss in the outer joints
  for (let i = 0; i < 140; i += 1) {
    const a = rand() * TAU, rho = 0.78 + rand() * 0.24, [x, y] = at(rho, a);
    g.fillStyle = rgba(GRASS[Math.floor(rand() * 3)], 0.35 + rand() * 0.3);
    g.beginPath(); g.ellipse(x, y, 0.8 + rand() * 1.2, 0.5 + rand() * 0.6, rand() * 3, 0, TAU); g.fill();
  }
  g.restore();

  // grass growing over the edge, thicker where nobody walks (the back, by the river)
  for (let i = 0; i < 230; i += 1) {
    const a = rand() * TAU, back = Math.sin(a) < -0.2 ? 1.5 : 1, rho = 0.97 + rand() * 0.07, [x, y] = at(rho, a);
    if (rand() < 0.8) tuft(g, x, y + 1, rand, back);
  }
  // a few daisies in the grass at the edge
  for (let i = 0; i < 36; i += 1) {
    const a = rand() * TAU, [x, y] = at(1.02 + rand() * 0.1, a);
    g.fillStyle = rand() < 0.75 ? '#FBF6E6' : '#F4D35E'; g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill();
  }
  // flowering bushes along the back, where the square meets the river bank
  const bush = (kind, seed, x, y, s = 1) => { const sp = flowerBush(kind, seed, s); g.drawImage(sp.c, x - sp.ax, y - sp.ay, sp.w, sp.h); };
  bush('rose', 3, SQUARE.cx + 40, SQUARE.cy - SQUARE.ry + 4, 0.85);
  bush('cream', 5, SQUARE.cx + 96, SQUARE.cy - 30, 0.8);
  bush('lilac', 2, SQUARE.cx - 26, SQUARE.cy - SQUARE.ry + 2, 0.7);
  const pot = (kind, seed, x, y) => { const sp = pottedPlant(kind, seed); g.drawImage(sp.c, x - sp.ax, y - sp.ay, sp.w, sp.h); };
  for (const b of SQUARE.benches) { pot(b.flip ? 'rose' : 'lavender', 1, b.x + (b.flip ? 20 : -20), b.y - 1); }
  return c;
}

/* ---- The pieces that stand on it -------------------------------------- */

const WOOD = '#8A5A32', WOOD_DARK = '#5E3B20', STONE_W = '#CDBB98', STONE_TOP = '#E2D6BA';

/** The fountain: a round stone basin, a column, an upper bowl spilling water, and a little brass orrery on top. Anchor: the front of the basin, on the ground. */
export function fountainSprite() {
  return sprite('sq:fountain', 92, 96, 46, 90, (g) => {
    const cx = 46, ry = 17, rx = 40, top = 66, wall = 10;
    groundShadow(g, cx + 4, top + wall + ry - 6, rx + 10, ry * 0.9, 0.42);
    // the basin's outer wall: the front half of a short stone cylinder
    litPath(g, (p) => { p.moveTo(cx - rx, top); p.lineTo(cx - rx, top + wall); p.ellipse(cx, top + wall, rx, ry, 0, Math.PI, 0, true); p.lineTo(cx + rx, top); p.ellipse(cx, top, rx, ry, 0, 0, Math.PI, false); p.closePath(); }, STONE_W, { box: [cx - rx, top, rx * 2, wall + ry], lw: 0.8 });
    // its blocks
    g.strokeStyle = rgba(INK, 0.4); g.lineWidth = 0.5;
    for (let i = 1; i < 9; i += 1) { const a = Math.PI - (i / 9) * Math.PI, x = cx + Math.cos(a) * rx, y = top + Math.sin(a) * ry; g.beginPath(); g.moveTo(x, y + 0.5); g.lineTo(x, y + wall - 0.5); g.stroke(); }
    g.beginPath(); g.ellipse(cx, top + wall * 0.5, rx, ry, 0, Math.PI, 0, true); g.stroke();
    // the rim
    g.save(); g.beginPath(); g.ellipse(cx, top, rx, ry, 0, 0, TAU); g.ellipse(cx, top + 0.6, rx - 6, ry - 4.4, 0, 0, TAU, true);
    g.fillStyle = STONE_TOP; g.fill('evenodd'); g.restore();
    g.strokeStyle = INK; g.lineWidth = 0.8; g.beginPath(); g.ellipse(cx, top, rx, ry, 0, 0, TAU); g.stroke();
    // water in the basin: darker under the far rim, bright toward you
    g.save(); g.beginPath(); g.ellipse(cx, top + 0.6, rx - 6, ry - 4.4, 0, 0, TAU); g.clip();
    let gr = g.createLinearGradient(0, top - ry, 0, top + ry);
    gr.addColorStop(0, '#2F6478'); gr.addColorStop(0.45, '#4D8FA3'); gr.addColorStop(1, '#8CC6CF');
    g.fillStyle = gr; g.fillRect(cx - rx, top - ry, rx * 2, ry * 2);
    g.fillStyle = 'rgba(20,40,50,.35)'; g.beginPath(); g.ellipse(cx, top - ry + 5.5, rx - 7, 4, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(235,250,255,.75)'; g.lineWidth = 0.7;
    for (const [dx, dy, w] of [[-18, 4, 8], [10, 6, 10], [-4, 8.5, 6], [22, 2, 5]]) { g.beginPath(); g.ellipse(cx + dx, top + dy, w, 1.4, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.restore();
    g.strokeStyle = rgba(INK, 0.6); g.lineWidth = 0.5; g.beginPath(); g.ellipse(cx, top + 0.6, rx - 6, ry - 4.4, 0, 0, TAU); g.stroke();
    // the column
    const colTop = 34;
    litPath(g, (p) => { p.moveTo(cx - 4.4, top + 2); p.lineTo(cx - 3.4, colTop); p.lineTo(cx + 3.4, colTop); p.lineTo(cx + 4.4, top + 2); p.closePath(); }, STONE_W, { box: [cx - 5, colTop, 10, top - colTop], lw: 0.7 });
    litEllipse(g, cx, top + 1.6, 6.4, 2.4, STONE_TOP, { lw: 0.6 });
    // the upper bowl
    const bowl = 32;
    litPath(g, (p) => { p.moveTo(cx - 16, bowl); p.quadraticCurveTo(cx - 12, bowl + 9, cx, bowl + 9.5); p.quadraticCurveTo(cx + 12, bowl + 9, cx + 16, bowl); p.closePath(); }, STONE_W, { box: [cx - 16, bowl, 32, 10], lw: 0.7 });
    litEllipse(g, cx, bowl, 16, 5.2, STONE_TOP, { lw: 0.7 });
    litEllipse(g, cx, bowl + 0.4, 12.6, 3.4, '#4D8FA3', { lw: 0.4, light: 0.6 });
    // water spilling over the bowl's lip into the basin
    for (let i = 0; i < 9; i += 1) {
      const t = (i + 0.5) / 9, a = Math.PI * (1 - t), x0 = cx + Math.cos(a) * 15.5, y0 = bowl + Math.sin(a) * 5 + 0.8;
      const x1 = cx + Math.cos(a) * 25, y1 = top + Math.sin(a) * 6 + 1;
      g.strokeStyle = 'rgba(200,232,246,.6)'; g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(x0 + (x1 - x0) * 0.6, y0 + 2, x1, y1); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.45;
      g.beginPath(); g.moveTo(x0, y0 + 0.6); g.quadraticCurveTo(x0 + (x1 - x0) * 0.6, y0 + 2.4, x1, y1); g.stroke();
      g.fillStyle = 'rgba(240,250,255,.8)'; g.beginPath(); g.ellipse(x1, y1, 1.8, 0.7, 0, 0, TAU); g.fill();
    }
    // the brass orrery on a stem
    g.strokeStyle = '#8A6420'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx, bowl - 1); g.lineTo(cx, 22); g.stroke();
    litEllipse(g, cx, 16, 5.2, 5.2, '#D9A640', { lw: 0.6, light: 0.6 });
    g.save(); g.translate(cx, 16);
    for (const [rx2, ry2, rot] of [[9, 3, -0.35], [9, 3, 0.5], [3.4, 9, 0]]) { g.save(); g.rotate(rot); g.strokeStyle = INK; g.lineWidth = 1.5; g.beginPath(); g.ellipse(0, 0, rx2, ry2, 0, 0, TAU); g.stroke(); g.strokeStyle = '#E3B85A'; g.lineWidth = 0.8; g.stroke(); g.restore(); }
    g.restore();
    g.fillStyle = '#E3B85A'; g.strokeStyle = INK; g.lineWidth = 0.5; g.beginPath(); g.moveTo(cx, 3); g.lineTo(cx + 1.4, 7); g.lineTo(cx - 1.4, 7); g.closePath(); g.fill(); g.stroke();
  });
}

/** The notice board: two posts, a little shingled roof, notices pinned up and a poster frame for tonight's Muddle (filled by `posterOn`). Anchor: between the posts' feet. */
export const BOARD = Object.freeze({ w: 56, h: 66, ax: 28, ay: 64, poster: [16, 22, 24, 26] });
export function boardSprite() {
  return sprite('sq:board', BOARD.w, BOARD.h, BOARD.ax, BOARD.ay, (g) => {
    groundShadow(g, 29, 63, 24, 3.4, 0.42);
    for (const x of [8, 44]) litPath(g, (p) => p.rect(x, 12, 4, 51), WOOD_DARK, { box: [x, 12, 4, 51], lw: 0.6 });
    // the board
    litPath(g, (p) => p.rect(5, 16, 46, 36), '#A06A3C', { box: [5, 16, 46, 36], lw: 0.8 });
    litPath(g, (p) => p.rect(7.5, 18.5, 41, 31), '#C79A64', { box: [7.5, 18.5, 41, 31], lw: 0.5, light: 0.3 });
    g.strokeStyle = rgba(INK, 0.18); g.lineWidth = 0.4;
    for (let y = 22; y < 49; y += 4.5) { g.beginPath(); g.moveTo(8, y); g.lineTo(48, y + 0.6); g.stroke(); }
    // notices round the poster
    const note = (x, y, w, h, rot, col) => {
      g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(rot);
      g.fillStyle = 'rgba(40,24,12,.25)'; g.fillRect(-w / 2 + 0.6, -h / 2 + 0.8, w, h);
      g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
      g.strokeStyle = rgba(INK, 0.35); g.lineWidth = 0.3;
      for (let yy = -h / 2 + 2.4; yy < h / 2 - 1.2; yy += 1.8) { g.beginPath(); g.moveTo(-w / 2 + 1.2, yy); g.lineTo(w / 2 - 1.2 - (yy % 3), yy); g.stroke(); }
      g.fillStyle = '#B4402C'; g.beginPath(); g.arc(0, -h / 2 + 0.9, 0.8, 0, TAU); g.fill();
      g.restore();
    };
    note(9, 21, 7, 9, -0.08, '#F3E7C8'); note(9.5, 33, 6.5, 8, 0.06, '#EFE0BC'); note(41, 22, 6.5, 8.5, 0.07, '#F6EAD0'); note(41.5, 35, 6, 9, -0.05, '#EADBB5');
    // the poster: parchment with a red playbill band (the Muddle is painted onto it)
    const [px, py, pw, ph] = BOARD.poster;
    g.fillStyle = 'rgba(40,24,12,.3)'; g.fillRect(px + 0.8, py + 1, pw, ph);
    g.fillStyle = '#F7ECCF'; g.fillRect(px, py, pw, ph);
    g.fillStyle = '#A9362A'; g.fillRect(px, py, pw, 4.2);
    g.fillStyle = '#F7ECCF'; for (let x = px + 3; x < px + pw - 2; x += 3.2) g.fillRect(x, py + 1.7, 1.6, 0.9);
    g.strokeStyle = rgba(INK, 0.55); g.lineWidth = 0.5; g.strokeRect(px, py, pw, ph);
    // the roof
    litPath(g, (p) => { p.moveTo(1, 16); p.lineTo(28, 4); p.lineTo(55, 16); p.lineTo(52, 18); p.lineTo(28, 7.5); p.lineTo(4, 18); p.closePath(); }, '#7A4A2A', { box: [1, 4, 54, 14], lw: 0.7 });
    g.strokeStyle = rgba(INK, 0.35); g.lineWidth = 0.4;
    for (let i = 1; i < 8; i += 1) { const t = i / 8; g.beginPath(); g.moveTo(28 - 27 * t, 4 + 12 * t); g.lineTo(28 - 27 * t + 2, 6.5 + 12 * t); g.stroke(); g.beginPath(); g.moveTo(28 + 27 * t, 4 + 12 * t); g.lineTo(28 + 27 * t - 2, 6.5 + 12 * t); g.stroke(); }
  });
}

/** Paint a Muddle's face onto a copy of the board (its sprite sheet's first frame, cropped to the head and shoulders). */
export function posterOn(img, sheet) {
  const base = boardSprite(), c = canvasOf(base.c.width, base.c.height), g = c.getContext('2d');
  g.drawImage(base.c, 0, 0);
  if (img && sheet) {
    const k = base.c.width / BOARD.w, [px, py, pw, ph] = BOARD.poster;
    g.save(); g.scale(k, k);
    g.beginPath(); g.rect(px + 1, py + 4.6, pw - 2, ph - 5.6); g.clip();
    const fh = sheet.h, fw = sheet.w, dh = (ph - 4) * 1.25, dw = (dh * fw) / fh;
    g.drawImage(img, 0, 0, fw, fh, px + pw / 2 - dw / 2, py + 3.4, dw, dh);
    g.restore();
  }
  return { ...base, c };
}

/** A market stall: a striped awning on four posts over a counter of jam jars, apples, books and flowers. Anchor: the counter's front, on the ground. */
export function stallSprite() {
  return sprite('sq:stall', 82, 74, 41, 71, (g) => {
    const rand = rng('stall');
    groundShadow(g, 43, 70, 38, 4.5, 0.42);
    // back posts
    for (const x of [12, 70]) litPath(g, (p) => p.rect(x, 18, 3, 34), WOOD_DARK, { box: [x, 18, 3, 34], lw: 0.5 });
    // the counter
    litPath(g, (p) => p.rect(6, 48, 70, 21), WOOD, { box: [6, 48, 70, 21], lw: 0.8 });
    g.strokeStyle = rgba(INK, 0.35); g.lineWidth = 0.45;
    for (let x = 14; x < 76; x += 8) { g.beginPath(); g.moveTo(x, 49); g.lineTo(x, 68.5); g.stroke(); }
    litPath(g, (p) => p.rect(4, 45, 74, 4.4), '#A87444', { box: [4, 45, 74, 4.4], lw: 0.7 });
    // goods: jam jars, a basket of apples, a stack of books, a jug of flowers
    for (let i = 0; i < 4; i += 1) {
      const x = 10 + i * 5.2;
      litPath(g, (p) => p.rect(x, 38.5, 4.4, 6.5), '#E58A35', { box: [x, 38.5, 4.4, 6.5], lw: 0.45 });
      g.fillStyle = '#F2E6CC'; g.fillRect(x - 0.3, 37.2, 5, 1.8); g.strokeStyle = rgba(INK, 0.6); g.lineWidth = 0.35; g.strokeRect(x - 0.3, 37.2, 5, 1.8);
    }
    litPath(g, (p) => { p.moveTo(33, 40); p.lineTo(47, 40); p.lineTo(45.5, 45); p.lineTo(34.5, 45); p.closePath(); }, '#B9853A', { box: [33, 40, 14, 5], lw: 0.5 });
    for (let i = 0; i < 6; i += 1) litEllipse(g, 35 + i * 2.1 + rand() * 0.6, 39 - (i % 2) * 1.2, 1.5, 1.4, i % 3 ? '#C9442E' : '#D9A23A', { lw: 0.3 });
    for (const [y, col] of [[42, '#3F6A8A'], [39.6, '#8A3A2E'], [37.4, '#5A7A3A']]) litPath(g, (p) => p.rect(52, y, 10, 2.4), col, { box: [52, y, 10, 2.4], lw: 0.35 });
    litPath(g, (p) => { p.moveTo(66, 45); p.lineTo(67, 38); p.lineTo(72, 38); p.lineTo(73, 45); p.closePath(); }, '#7FA2B8', { box: [66, 38, 7, 7], lw: 0.4 });
    for (let i = 0; i < 5; i += 1) { g.fillStyle = ['#F2B6B8', '#F7D774', '#FBF6E6', '#E58C94', '#B9A0D6'][i]; g.beginPath(); g.arc(67 + rand() * 5, 33 + rand() * 4, 1.3, 0, TAU); g.fill(); }
    // front posts
    for (const x of [6, 74]) litPath(g, (p) => p.rect(x, 20, 3, 28), WOOD_DARK, { box: [x, 20, 3, 28], lw: 0.5 });
    // the awning: cream and sage stripes, sloping toward you, a scalloped edge
    const ax0 = 2, ax1 = 80, back = 8, front = 24, n = 10;
    for (let i = 0; i < n; i += 1) {
      const x0 = ax0 + ((ax1 - ax0) * i) / n, x1 = ax0 + ((ax1 - ax0) * (i + 1)) / n;
      litPath(g, (p) => { p.moveTo(x0 + 3, back); p.lineTo(x1 + 3, back); p.lineTo(x1, front); p.lineTo(x0, front); p.closePath(); }, i % 2 ? '#7E9B62' : '#F1E6CB', { box: [x0, back, x1 - x0 + 3, front - back], lw: 0.35, light: 0.25, dark: 0.3 });
      litPath(g, (p) => { p.moveTo(x0, front); p.lineTo(x1, front); p.quadraticCurveTo((x0 + x1) / 2, front + 7, x0, front); p.closePath(); }, i % 2 ? '#6E8A54' : '#E6D8B6', { box: [x0, front, x1 - x0, 6], lw: 0.45 });
    }
    g.strokeStyle = INK; g.lineWidth = 0.7; g.beginPath(); g.moveTo(ax0 + 3, back); g.lineTo(ax1 + 3, back); g.stroke();
    litPath(g, (p) => p.rect(ax0, front - 1, ax1 - ax0, 2), '#A87444', { box: [ax0, front - 1, ax1 - ax0, 2], lw: 0.5 });
  });
}

/** A park bench with a slatted back. Anchor: the middle of its front feet. `flip` faces it the other way. */
export function benchSprite(flip = false) {
  return sprite(`sq:bench:${flip}`, 40, 26, 20, 24, (g) => {
    if (flip) { g.translate(40, 0); g.scale(-1, 1); }
    groundShadow(g, 21, 23, 18, 2.8, 0.4);
    // back legs and the backrest
    for (const x of [7, 32]) litPath(g, (p) => p.rect(x, 4, 2.2, 15), WOOD_DARK, { box: [x, 4, 2.2, 15], lw: 0.45 });
    for (const y of [5, 9]) litPath(g, (p) => { p.moveTo(5, y); p.lineTo(36, y - 1); p.lineTo(36, y + 2.4); p.lineTo(5, y + 3.4); p.closePath(); }, WOOD, { box: [5, y - 1, 31, 4.4], lw: 0.5 });
    // the seat
    litPath(g, (p) => { p.moveTo(3, 15); p.lineTo(35, 13.6); p.lineTo(38, 17); p.lineTo(5.5, 18.6); p.closePath(); }, '#9A6A3E', { box: [3, 13.6, 35, 5], lw: 0.55 });
    litPath(g, (p) => { p.moveTo(5.5, 18.6); p.lineTo(38, 17); p.lineTo(38, 18.8); p.lineTo(5.5, 20.4); p.closePath(); }, WOOD_DARK, { lw: 0.45 });
    // front legs
    for (const x of [6, 35]) litPath(g, (p) => p.rect(x, 18.5, 2.2, 5), WOOD_DARK, { box: [x, 18.5, 2.2, 5], lw: 0.45 });
  });
}

/** A lamp post: a stone foot, a dark iron pole and a glass lantern (its light is a halo in village.js). Anchor: its foot. */
export const LAMP_HEAD = 50; // world px from the foot up to the lantern's glass
export function lampSprite() {
  return sprite('sq:lamp', 18, 64, 9, 62, (g) => {
    groundShadow(g, 10, 61.5, 7, 1.8, 0.42);
    litPath(g, (p) => { p.moveTo(5, 62); p.lineTo(6, 56); p.lineTo(12, 56); p.lineTo(13, 62); p.closePath(); }, STONE_W, { box: [5, 56, 8, 6], lw: 0.55 });
    litPath(g, (p) => p.rect(8, 16, 2, 41), '#3E3A36', { box: [8, 16, 2, 41], lw: 0.45 });
    g.strokeStyle = '#3E3A36'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(9, 22); g.quadraticCurveTo(15, 20, 15.5, 24); g.stroke();
    // the lantern
    litPath(g, (p) => { p.moveTo(4.6, 6); p.lineTo(13.4, 6); p.lineTo(12, 15); p.lineTo(6, 15); p.closePath(); }, '#F6D58A', { box: [4.6, 6, 8.8, 9], lw: 0.55, light: 0.6, dark: 0.2 });
    g.strokeStyle = '#3E3A36'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(9, 6); g.lineTo(9, 15); g.stroke();
    litPath(g, (p) => { p.moveTo(3.4, 6.4); p.lineTo(9, 2); p.lineTo(14.6, 6.4); p.closePath(); }, '#3E3A36', { lw: 0.45 });
    litPath(g, (p) => p.rect(5.6, 15, 6.8, 1.6), '#3E3A36', { lw: 0.4 });
    g.fillStyle = '#3E3A36'; g.beginPath(); g.arc(9, 1.6, 1, 0, TAU); g.fill();
  });
}

/** Every standing piece, as { id, sprite, x, y } (foot in world px, which is also its z). */
export function squarePieces() {
  return [
    { id: 'fountain', sprite: fountainSprite(), ...SQUARE.fountain },
    { id: 'board', sprite: boardSprite(), ...SQUARE.board },
    { id: 'stall', sprite: stallSprite(), ...SQUARE.stall },
    ...SQUARE.benches.map((b, i) => ({ id: `bench${i}`, sprite: benchSprite(b.flip), x: b.x, y: b.y })),
    ...SQUARE.lamps.map((l, i) => ({ id: `lamp${i}`, sprite: lampSprite(), x: l.x, y: l.y })),
  ];
}
