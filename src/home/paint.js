/**
 * paint.js — the brush for the things a house grows.
 *
 * Everything a house gains as you learn its subject (src/home/houses.js) is
 * painted here, in the village painting's own manner: warm light from the
 * upper left, a soft core shadow lower right, a thin dark-brown line and a
 * little grain, never flat vector fill. Small things are painted once, at
 * three times their size, into a cached sprite, then stamped: into the
 * baked painting (static props) or onto the scene canvas each frame
 * (things that move). Units are painting pixels throughout.
 */

import { rng } from '../world/engine/palette.js';

const TAU = Math.PI * 2;
/** How much finer than a painting pixel a sprite is painted. */
const SC = 3;
export const INK = '#3b2a1c';

export function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

/* ---------------------------------------------------------------- */
/* Colour                                                            */
/* ---------------------------------------------------------------- */

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
export const rgba = (c, a = 1) => { const [r, g, b] = typeof c === 'string' ? hex(c) : c; return `rgba(${r},${g},${b},${a})`; };
/** A hex colour lightened (t > 0, toward warm cream) or darkened (t < 0, toward warm brown). */
export const tone = (c, t) => rgba(mixRgb(hex(c), t > 0 ? [255, 246, 222] : [42, 26, 16], Math.abs(t)));

/* ---------------------------------------------------------------- */
/* Sprites                                                           */
/* ---------------------------------------------------------------- */

const cache = new Map();
/**
 * A cached sprite, painted once. `draw(g)` paints in local units, the box
 * (0,0)-(w,h); (ax, ay) is the point that lands on the spot it is stamped at.
 */
export function sprite(key, w, h, ax, ay, draw) {
  let s = cache.get(key);
  if (!s) {
    const c = canvasOf(w * SC, h * SC), g = c.getContext('2d');
    g.scale(SC, SC);
    g.lineJoin = 'round'; g.lineCap = 'round';
    draw(g);
    s = { c, w, h, ax, ay };
    cache.set(key, s);
  }
  return s;
}

/** Stamp a sprite with its anchor at (x, y). */
export function stamp(g, s, x, y, { scale = 1, alpha = 1, rot = 0, flip = false, sx = 1 } = {}) {
  if (alpha <= 0.003) return;
  const prevA = g.globalAlpha;
  if (alpha !== 1) g.globalAlpha = prevA * alpha;
  if (!rot && !flip && sx === 1) {
    g.drawImage(s.c, x - s.ax * scale, y - s.ay * scale, s.w * scale, s.h * scale);
  } else {
    g.save(); g.translate(x, y); if (rot) g.rotate(rot); g.scale((flip ? -1 : 1) * scale * sx, scale);
    g.drawImage(s.c, -s.ax, -s.ay, s.w, s.h);
    g.restore();
  }
  if (alpha !== 1) g.globalAlpha = prevA;
}

/** A soft round light of one colour, for additive glows (fireflies, lanterns, auras). */
const glows = new Map();
export function glowSprite(rgb, size = 64) {
  if (size === 64) { const hit = glows.get(rgb); if (hit) return hit; }
  const s = sprite(`glow:${rgb}:${size}`, size, size, size / 2, size / 2, (g) => {
    const r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.28, `rgba(${rgb},.6)`); gr.addColorStop(0.62, `rgba(${rgb},.16)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
  });
  if (size === 64) glows.set(rgb, s);
  return s;
}
/** Draw a glow sprite of radius r centred on (x, y). */
export function glow(g, rgb, x, y, r, alpha = 1) {
  const s = glowSprite(rgb);
  stamp(g, s, x, y, { scale: (r * 2) / s.w, alpha });
}

/* ---------------------------------------------------------------- */
/* Brushwork                                                         */
/* ---------------------------------------------------------------- */

/** A soft ground shadow under a thing standing on the grass. */
export function groundShadow(g, x, y, rx, ry, a = 0.32) {
  const gr = g.createRadialGradient(x, y, 0, x, y, rx);
  gr.addColorStop(0, `rgba(48,32,14,${a})`); gr.addColorStop(1, 'rgba(48,32,14,0)');
  g.save(); g.translate(x, y); g.scale(1, ry / rx); g.translate(-x, -y);
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, rx, 0, TAU); g.fill();
  g.restore();
}

/** An ellipse lit from the upper left: base, a light bloom, a dark core shadow lower right. */
export function litEllipse(g, x, y, rx, ry, base, { line = true, lw = 0.7, light = 0.45, dark = 0.4 } = {}) {
  g.save();
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU);
  g.fillStyle = base; g.fill();
  g.clip();
  const m = Math.max(rx, ry);
  let gr = g.createRadialGradient(x - rx * 0.4, y - ry * 0.45, 0, x - rx * 0.4, y - ry * 0.45, m * 1.1);
  gr.addColorStop(0, tone(base, light)); gr.addColorStop(1, rgba(base, 0));
  g.fillStyle = gr; g.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  gr = g.createRadialGradient(x + rx * 0.55, y + ry * 0.6, 0, x + rx * 0.55, y + ry * 0.6, m * 1.15);
  gr.addColorStop(0, tone(base, -dark)); gr.addColorStop(1, rgba(base, 0));
  g.fillStyle = gr; g.fillRect(x - rx, y - ry, rx * 2, ry * 2);
  g.restore();
  if (line) { g.strokeStyle = INK; g.lineWidth = lw; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.stroke(); }
}

/** A filled path lit from the upper left (the path is built by `path(g)`). */
export function litPath(g, path, base, { line = true, lw = 0.7, box = null, light = 0.42, dark = 0.42 } = {}) {
  g.save();
  g.beginPath(); path(g);
  g.fillStyle = base; g.fill();
  if (box) {
    g.clip();
    const [x, y, w, h] = box;
    let gr = g.createLinearGradient(x, y, x + w * 0.9, y + h);
    gr.addColorStop(0, tone(base, light)); gr.addColorStop(0.45, rgba(base, 0)); gr.addColorStop(1, tone(base, -dark));
    g.fillStyle = gr; g.fillRect(x, y, w, h);
  }
  g.restore();
  if (line) { g.strokeStyle = INK; g.lineWidth = lw; g.beginPath(); path(g); g.stroke(); }
}

/** Painterly grain: tiny dabs of lighter and darker paint inside the current box. */
function grain(g, x, y, w, h, base, rand, n = 40, size = 0.7) {
  for (let i = 0; i < n; i += 1) {
    const px = x + rand() * w, py = y + rand() * h, up = rand() < 0.5;
    g.fillStyle = tone(base, up ? 0.18 + rand() * 0.2 : -(0.12 + rand() * 0.2));
    g.globalAlpha = 0.35 + rand() * 0.3;
    g.beginPath(); g.ellipse(px, py, size * (0.6 + rand()), size * (0.4 + rand() * 0.5), rand() * 3, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}

/* ---------------------------------------------------------------- */
/* Plants                                                            */
/* ---------------------------------------------------------------- */

export const BLOOMS = {
  rose: ['#E58C94', '#F2B6B8', '#D9667A'],
  cream: ['#F6EED8', '#FFF8E6', '#EADFC0'],
  sun: ['#F2C14E', '#F7D774', '#E9A23B'],
  lilac: ['#B9A0D6', '#CDB9E6', '#9D84C2'],
  sky: ['#8FB0E0', '#B5CCF0', '#7896CC'],
  coral: ['#EE9C72', '#F6BE98', '#D9774E'],
};

/** One five-petal flower. */
function blossom(g, x, y, r, [c0, c1, c2], rand) {
  const rot = rand() * TAU;
  for (let k = 0; k < 5; k += 1) {
    const a = rot + (k * TAU) / 5, px = x + Math.cos(a) * r * 0.62, py = y + Math.sin(a) * r * 0.55;
    g.fillStyle = k < 2 ? c1 : k === 4 ? c2 : c0;
    g.beginPath(); g.ellipse(px, py, r * 0.58, r * 0.44, a, 0, TAU); g.fill();
  }
  g.strokeStyle = rgba(INK, 0.35); g.lineWidth = 0.3;
  g.beginPath(); g.arc(x, y, r * 0.95, 0, TAU); g.stroke();
  g.fillStyle = '#E8A93A'; g.beginPath(); g.arc(x, y, r * 0.3, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,250,230,.8)'; g.beginPath(); g.arc(x - r * 0.4, y - r * 0.42, r * 0.18, 0, TAU); g.fill();
}

/** A leafy mound: dark blobs low, lighter ones up and to the left, like the painting's bushes. */
function leafMound(g, cx, cy, w, h, rand, greens = ['#475C27', '#62792F', '#869C43', '#B3C267']) {
  const blobs = [];
  const n = Math.round(10 + w * 0.35);
  for (let i = 0; i < n; i += 1) {
    const t = rand(), a = rand() * Math.PI;
    blobs.push({ x: cx + Math.cos(a) * (w / 2) * (0.25 + t * 0.7), y: cy - Math.sin(a) * h * (0.15 + t * 0.6), r: 2.2 + rand() * (w * 0.09) });
  }
  // a soft dark rim first, so the mound has an edge like the painting's foliage (not a drawn line)
  g.fillStyle = '#2C3618'; g.globalAlpha = 0.6;
  for (const b of blobs) { g.beginPath(); g.arc(b.x + 0.25, b.y + 0.35, b.r + 0.5, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  for (const [layer, col, dx, dy, k] of [[0, greens[0], 0.3, 0.35, 1], [1, greens[1], -0.1, -0.15, 0.8], [2, greens[2], -0.35, -0.4, 0.55], [3, greens[3], -0.5, -0.6, 0.3]]) {
    g.fillStyle = col;
    for (const b of blobs) {
      if (layer && rand() > 0.85 - layer * 0.12) continue;
      g.beginPath(); g.arc(b.x + dx * b.r, b.y + dy * b.r, b.r * k, 0, TAU); g.fill();
    }
  }
  // leaf-shaped dabs over the top, the brush marks the painting's bushes are made of
  for (const b of blobs) {
    for (let k = 0; k < 2; k += 1) {
      const a = rand() * TAU, x = b.x + Math.cos(a) * b.r * 0.6, y = b.y + Math.sin(a) * b.r * 0.5;
      g.fillStyle = rand() < 0.5 ? greens[2] : (rand() < 0.5 ? greens[3] : greens[1]); g.globalAlpha = 0.7;
      g.beginPath(); g.ellipse(x, y, b.r * 0.42, b.r * 0.22, a, 0, TAU); g.fill();
    }
  }
  g.globalAlpha = 1;
  return blobs;
}

/** A flowering bush on the grass: a leafy mound dotted with blossoms. */
export function flowerBush(kind = 'rose', seed = 1, size = 1) {
  const w = 36 * size, h = 26 * size;
  return sprite(`bush:${kind}:${seed}:${size}`, w + 4, h + 4, (w + 4) / 2, h + 1, (g) => {
    const rand = rng(`bush${kind}${seed}`);
    groundShadow(g, w / 2 + 3, h - 0.5, w * 0.55, h * 0.18, 0.38);
    const blobs = leafMound(g, w / 2 + 2, h - 1, w, h * 0.92, rand);
    const cols = BLOOMS[kind] ?? BLOOMS.rose;
    const tops = blobs.filter((b) => b.y < h * 0.82).sort(() => rand() - 0.5).slice(0, Math.round(6 + 5 * size));
    for (const b of tops) blossom(g, b.x - b.r * 0.2, b.y - b.r * 0.3, 1.8 + rand() * 1.2 * size, cols, rand);
  });
}

/** A terracotta pot with a little plant (sprout, lavender or blooms). */
export function pottedPlant(kind = 'lavender', seed = 1) {
  return sprite(`pot:${kind}:${seed}`, 16, 24, 8, 23, (g) => {
    const rand = rng(`pot${kind}${seed}`);
    groundShadow(g, 8.5, 22.5, 7, 1.8, 0.4);
    litPath(g, (p) => { p.moveTo(3.2, 14); p.lineTo(12.8, 14); p.lineTo(11.4, 22.5); p.lineTo(4.6, 22.5); p.closePath(); }, '#C2643F', { box: [3, 14, 10, 9], lw: 0.6 });
    litPath(g, (p) => { p.rect(2.4, 12.6, 11.2, 2.4); }, '#D27A50', { box: [2.4, 12.6, 11.2, 2.4], lw: 0.6 });
    if (kind === 'lavender') {
      for (let i = 0; i < 7; i += 1) {
        const x = 4 + i * 1.35 + rand() * 0.6, top = 2 + rand() * 4;
        g.strokeStyle = '#5E7A3A'; g.lineWidth = 0.55; g.beginPath(); g.moveTo(8, 13); g.quadraticCurveTo((x + 8) / 2, 9, x, top + 4); g.stroke();
        for (let k = 0; k < 4; k += 1) { g.fillStyle = k % 2 ? '#B9A0D6' : '#8F73BA'; g.beginPath(); g.ellipse(x, top + k * 1.3, 0.85, 0.7, 0, 0, TAU); g.fill(); }
      }
    } else if (kind === 'sprout') {
      g.fillStyle = '#5A3A22'; g.fillRect(3.4, 12.8, 9.2, 1.4);
      for (const [x, a] of [[6, -0.6], [8, 0], [10, 0.6]]) {
        g.strokeStyle = '#4E7A2C'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, 13); g.lineTo(x + a * 2, 8); g.stroke();
        litEllipse(g, x + a * 2 - 1.2, 7.4, 1.7, 1.05, '#8DB560', { lw: 0.35 });
        litEllipse(g, x + a * 2 + 1.2, 7.8, 1.6, 1, '#7FA64E', { lw: 0.35 });
      }
    } else {
      leafMound(g, 8, 13, 13, 9, rand);
      for (let i = 0; i < 6; i += 1) blossom(g, 3 + rand() * 10, 5 + rand() * 6, 1.4, BLOOMS[kind] ?? BLOOMS.rose, rand);
    }
  });
}

/** A sunflower head (the stem is drawn live, so it can sway). */
export function sunflowerHead(seed = 1) {
  return sprite(`sunhead:${seed}`, 14, 14, 7, 7, (g) => {
    const rand = rng(`sun${seed}`);
    for (let k = 0; k < 14; k += 1) {
      const a = (k * TAU) / 14 + rand() * 0.2;
      g.fillStyle = k % 3 === 0 ? '#E9A23B' : k % 3 === 1 ? '#F4C443' : '#F7D774';
      g.save(); g.translate(7 + Math.cos(a) * 3.6, 7 + Math.sin(a) * 3.4); g.rotate(a);
      g.beginPath(); g.ellipse(0, 0, 2.6, 1.05, 0, 0, TAU); g.fill();
      g.strokeStyle = rgba(INK, 0.5); g.lineWidth = 0.3; g.stroke(); g.restore();
    }
    litEllipse(g, 7, 7, 2.9, 2.7, '#6A4022', { lw: 0.5 });
    grain(g, 4.5, 4.5, 5, 5, '#6A4022', rand, 16, 0.35);
  });
}

/** A big pumpkin for the vegetable bed. */
export function pumpkin(seed = 1, size = 1) {
  return sprite(`pumpkin:${seed}:${size}`, 18 * size, 14 * size, 9 * size, 13 * size, (g) => {
    const w = 16 * size, h = 11 * size, x = 9 * size, y = 7.4 * size;
    groundShadow(g, x + 1, y + h * 0.48, w * 0.6, h * 0.2, 0.42);
    for (const [dx, sx] of [[-0.3, 0.55], [0.3, 0.55], [0, 0.62]]) litEllipse(g, x + dx * w, y, (w / 2) * sx, h / 2, '#E07A2E', { lw: 0.55, light: 0.5, dark: 0.45 });
    g.strokeStyle = '#4E6B2C'; g.lineWidth = 1.2 * size; g.beginPath(); g.moveTo(x, y - h * 0.42); g.quadraticCurveTo(x + 1, y - h * 0.75, x + 2.2 * size, y - h * 0.8); g.stroke();
    litEllipse(g, x - 3 * size, y - h * 0.5, 2.4 * size, 1.1 * size, '#7FA64E', { lw: 0.35 });
  });
}

/* ---------------------------------------------------------------- */
/* Things                                                            */
/* ---------------------------------------------------------------- */

/** A paper lantern: body (not the glow; houses.js adds light at dusk). */
export function lanternSprite(colour = '#D9603A') {
  return sprite(`lantern:${colour}`, 10, 16, 5, 0, (g) => {
    g.strokeStyle = INK; g.lineWidth = 0.5; g.beginPath(); g.moveTo(5, 0); g.lineTo(5, 3); g.stroke();
    g.fillStyle = INK; g.fillRect(3.2, 2.6, 3.6, 1.1);
    litEllipse(g, 5, 8.2, 3.9, 4.6, colour, { lw: 0.55, light: 0.55 });
    g.strokeStyle = rgba(INK, 0.45); g.lineWidth = 0.35;
    for (const dx of [-1.6, 0, 1.6]) { g.beginPath(); g.moveTo(5 + dx * 0.4, 3.8); g.quadraticCurveTo(5 + dx * 1.4, 8.2, 5 + dx * 0.4, 12.6); g.stroke(); }
    g.fillStyle = INK; g.fillRect(3.2, 12.6, 3.6, 1.1);
    g.strokeStyle = '#C2643F'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(5, 13.7); g.lineTo(5, 15.6); g.stroke();
  });
}

/** A five-point paper star lantern (the observatory's). */
export function starLanternSprite() {
  return sprite('starlantern', 12, 14, 6, 0, (g) => {
    g.strokeStyle = INK; g.lineWidth = 0.45; g.beginPath(); g.moveTo(6, 0); g.lineTo(6, 2.6); g.stroke();
    litPath(g, (p) => { for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 2.2 : 5; p[i ? 'lineTo' : 'moveTo'](6 + Math.cos(a) * r, 8 + Math.sin(a) * r); } p.closePath(); }, '#F4D27A', { box: [1, 3, 10, 10], lw: 0.55, light: 0.5 });
  });
}

/** A stack of books on the grass (the library's). */
export function bookStack(seed = 1) {
  return sprite(`books:${seed}`, 22, 18, 11, 17, (g) => {
    const rand = rng(`books${seed}`);
    groundShadow(g, 11.5, 16.4, 10, 2.2, 0.42);
    const cols = ['#9B3B2E', '#3E5A7A', '#5E7A3A', '#B9853A', '#7A4A6A'];
    let y = 16;
    for (let i = 0; i < 4; i += 1) {
      const w = 15 - i * 1.2 + rand() * 2, h = 2.8 + rand() * 0.8, x = 11 - w / 2 + (rand() - 0.5) * 2.2, c = cols[(i + seed) % cols.length];
      y -= h;
      litPath(g, (p) => { p.rect(x, y, w, h); }, c, { box: [x, y, w, h], lw: 0.5 });
      g.fillStyle = '#F4EAD2'; g.fillRect(x + w - 1.4, y + 0.6, 1, h - 1.2);
      g.strokeStyle = tone(c, 0.45); g.lineWidth = 0.35; g.beginPath(); g.moveTo(x + 1, y + h * 0.5); g.lineTo(x + w - 2.2, y + h * 0.5); g.stroke();
    }
    // an open book leaning on the stack
    litPath(g, (p) => { p.moveTo(14, y + 1); p.quadraticCurveTo(17, y - 1.4, 21, y + 0.4); p.lineTo(21, y + 4.4); p.quadraticCurveTo(17, y + 2.6, 14, y + 5); p.closePath(); }, '#FBF3E0', { lw: 0.45 });
  });
}

/** A wooden crate of brass cogs (the workshop's). */
export function cogCrate(seed = 1) {
  return sprite(`cogs:${seed}`, 24, 20, 12, 19, (g) => {
    groundShadow(g, 12.5, 18.4, 11, 2.4, 0.42);
    // cogs peeking out
    for (const [x, y, r] of [[8, 7.2, 3.6], [14.5, 6.2, 4.2], [18.6, 8.4, 2.6]]) {
      g.save(); g.translate(x, y);
      g.fillStyle = '#C9973A'; g.strokeStyle = INK; g.lineWidth = 0.45;
      g.beginPath();
      for (let k = 0; k < 16; k += 1) { const a = (k * TAU) / 16, rr = k % 2 ? r : r * 0.8; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#E8C46A'; g.beginPath(); g.arc(-r * 0.2, -r * 0.2, r * 0.42, 0, TAU); g.fill();
      g.fillStyle = INK; g.beginPath(); g.arc(0, 0, r * 0.2, 0, TAU); g.fill();
      g.restore();
    }
    // the crate: front and top faces
    litPath(g, (p) => { p.rect(3, 9, 18, 9.6); }, '#9A6A3A', { box: [3, 9, 18, 9.6], lw: 0.6 });
    g.strokeStyle = rgba(INK, 0.6); g.lineWidth = 0.4;
    for (const y of [12.2, 15.4]) { g.beginPath(); g.moveTo(3.4, y); g.lineTo(20.6, y); g.stroke(); }
    g.strokeStyle = '#6A4424'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(3.6, 9.6); g.lineTo(20.4, 18); g.stroke();
  });
}

/** A small brass telescope on a wooden tripod (the observatory's). */
export function telescopeSprite() {
  return sprite('telescope', 22, 26, 11, 25, (g) => {
    groundShadow(g, 11.5, 24.6, 8, 1.8, 0.4);
    g.strokeStyle = '#6A4424'; g.lineWidth = 1.1;
    for (const [x2] of [[5], [11], [17]]) { g.beginPath(); g.moveTo(11, 13); g.lineTo(x2, 24.4); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 0.35;
    for (const [x2] of [[5], [17]]) { g.beginPath(); g.moveTo(11, 13); g.lineTo(x2, 24.4); g.stroke(); }
    g.save(); g.translate(11, 12); g.rotate(-0.55);
    litPath(g, (p) => { p.rect(-8, -2, 15, 4); }, '#C9973A', { box: [-8, -2, 15, 4], lw: 0.55, light: 0.55 });
    litPath(g, (p) => { p.rect(6, -2.8, 3.4, 5.6); }, '#B5822E', { box: [6, -2.8, 3.4, 5.6], lw: 0.55 });
    g.fillStyle = '#FFF2C4'; g.fillRect(-6, -1.4, 10, 0.7);
    g.restore();
  });
}

/** A teapot and two cups on a stool top (Mochi's). */
export function teaSet() {
  return sprite('teaset', 20, 14, 10, 13, (g) => {
    groundShadow(g, 10.5, 12.6, 9, 1.8, 0.35);
    litEllipse(g, 8, 8.6, 4.6, 3.8, '#E8E0CC', { lw: 0.55, light: 0.5 });
    g.strokeStyle = INK; g.lineWidth = 0.55;
    g.beginPath(); g.moveTo(12, 8); g.quadraticCurveTo(15, 6.8, 15.6, 4.8); g.stroke();
    g.beginPath(); g.moveTo(4, 7.4); g.quadraticCurveTo(1.6, 8.4, 3.6, 10.4); g.stroke();
    g.fillStyle = '#C2643F'; g.fillRect(4.2, 8.6, 7.6, 0.9);
    litEllipse(g, 8, 4.8, 1.6, 0.8, '#E8E0CC', { lw: 0.45 });
    for (const x of [15.2, 18.2]) { litPath(g, (p) => { p.moveTo(x - 1.4, 9.6); p.lineTo(x + 1.4, 9.6); p.lineTo(x + 1, 12); p.lineTo(x - 1, 12); p.closePath(); }, '#F6EEDC', { lw: 0.4 }); }
  });
}

/** Two logs to sit on by the fire (Toffee's). */
export function logBench() {
  return sprite('logbench', 30, 12, 15, 11, (g) => {
    groundShadow(g, 15.5, 10.6, 14, 2, 0.42);
    for (const [y, x0, x1] of [[7.2, 2, 27], [3.6, 6, 24]]) {
      litPath(g, (p) => { p.moveTo(x0, y - 2.4); p.lineTo(x1, y - 2.4); p.lineTo(x1, y + 2.4); p.lineTo(x0, y + 2.4); p.closePath(); }, '#8A5A32', { box: [x0, y - 2.4, x1 - x0, 4.8], lw: 0.55 });
      litEllipse(g, x1, y, 1.6, 2.4, '#D9B07A', { lw: 0.5 });
      g.strokeStyle = '#6A4424'; g.lineWidth = 0.3; g.beginPath(); g.ellipse(x1, y, 0.8, 1.3, 0, 0, TAU); g.stroke();
    }
  });
}

/** A basket of cut roses (the rose cottage's). */
export function roseBasket() {
  return sprite('rosebasket', 18, 16, 9, 15, (g) => {
    const rand = rng('rosebasket');
    groundShadow(g, 9.5, 14.6, 8, 1.7, 0.4);
    leafMound(g, 9, 9, 13, 6, rand);
    for (let i = 0; i < 6; i += 1) blossom(g, 4 + rand() * 10, 3.6 + rand() * 4, 1.6, BLOOMS.rose, rand);
    litPath(g, (p) => { p.moveTo(2.4, 8.6); p.lineTo(15.6, 8.6); p.lineTo(14, 14.8); p.lineTo(4, 14.8); p.closePath(); }, '#B9853A', { box: [2.4, 8.6, 13.2, 6.2], lw: 0.55 });
    g.strokeStyle = rgba(INK, 0.5); g.lineWidth = 0.3;
    for (let x = 4; x < 15; x += 2) { g.beginPath(); g.moveTo(x, 9); g.lineTo(x - 0.4, 14.4); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 0.6; g.beginPath(); g.moveTo(3.4, 8.8); g.quadraticCurveTo(9, -0.6, 14.6, 8.8); g.stroke();
  });
}

/** A little cart of cogs and a ladder (the clock tower's mending kit). */
export function mendingCart() {
  return sprite('mendcart', 26, 20, 13, 19, (g) => {
    groundShadow(g, 13.5, 18.6, 12, 2, 0.4);
    litPath(g, (p) => { p.moveTo(3, 8); p.lineTo(22, 8); p.lineTo(20.5, 14.5); p.lineTo(4.5, 14.5); p.closePath(); }, '#8A5A32', { box: [3, 8, 19, 6.5], lw: 0.6 });
    for (const [x, y, r] of [[8, 6.6, 2.6], [13, 5.8, 3.2], [18, 7, 2.2]]) {
      g.save(); g.translate(x, y); g.fillStyle = '#C9973A'; g.strokeStyle = INK; g.lineWidth = 0.4; g.beginPath();
      for (let k = 0; k < 14; k += 1) { const a = (k * TAU) / 14, rr = k % 2 ? r : r * 0.78; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(0, 0, r * 0.22, 0, TAU); g.fill(); g.restore();
    }
    for (const x of [7, 19]) { litEllipse(g, x, 15.8, 2.6, 2.6, '#6A4424', { lw: 0.5 }); g.fillStyle = '#C9973A'; g.beginPath(); g.arc(x, 15.8, 0.8, 0, TAU); g.fill(); }
  });
}

/* ---------------------------------------------------------------- */
/* Live pieces: drawn every frame (cheap paths, no gradients)         */
/* ---------------------------------------------------------------- */

const FLAGS = ['#C2643F', '#EDBE66', '#8FB3C9', '#F6EEDB', '#7FA65A', '#D98B7A'];

/** A sagging string from a to b, its sag swaying; returns the point at t. */
export function along(a, b, sag, t, sway = 0) {
  return { x: a.x + (b.x - a.x) * t + sway * Math.sin(Math.PI * t) * 0.4, y: a.y + (b.y - a.y) * t + 4 * sag * t * (1 - t) + Math.abs(sway) * 0.1 * Math.sin(Math.PI * t) };
}

/** Bunting: a line of little flags between two points. */
export function drawBunting(g, a, b, { sag = 10, n = 9, sway = 0, colours = FLAGS, size = 1 } = {}) {
  g.strokeStyle = INK; g.lineWidth = 0.7;
  g.beginPath();
  for (let i = 0; i <= 16; i += 1) { const p = along(a, b, sag, i / 16, sway); g[i ? 'lineTo' : 'moveTo'](p.x, p.y); }
  g.stroke();
  for (let i = 1; i < n; i += 1) {
    const t = i / n, p = along(a, b, sag, t, sway), q = along(a, b, sag, t + 0.5 / n, sway);
    const ang = Math.atan2(q.y - p.y, q.x - p.x), flap = Math.sin(sway * 0.4 + i) * 0.12;
    g.save(); g.translate(p.x, p.y); g.rotate(ang + flap);
    g.fillStyle = colours[i % colours.length];
    g.beginPath(); g.moveTo(-3.4 * size, 0); g.lineTo(3.4 * size, 0); g.lineTo(0.2 * size, 7.4 * size); g.closePath(); g.fill();
    g.strokeStyle = rgba(INK, 0.85); g.lineWidth = 0.5; g.stroke();
    g.fillStyle = 'rgba(255,250,235,.35)'; g.beginPath(); g.moveTo(-2.9 * size, 0.5); g.lineTo(-0.3 * size, 0.5); g.lineTo(-0.5 * size, 3.6 * size); g.closePath(); g.fill();
    g.fillStyle = 'rgba(40,24,12,.18)'; g.beginPath(); g.moveTo(3.2 * size, 0.3); g.lineTo(1.2 * size, 0.3); g.lineTo(0.3 * size, 7 * size); g.closePath(); g.fill();
    g.restore();
  }
}

/** Fairy lights: bulbs on a string; they glow when it is dark. */
export function drawFairyLights(g, a, b, { sag = 8, n = 12, sway = 0, lit = 0, now = 0, phase = 0 } = {}) {
  g.strokeStyle = rgba(INK, 0.85); g.lineWidth = 0.45;
  g.beginPath();
  for (let i = 0; i <= 16; i += 1) { const p = along(a, b, sag, i / 16, sway); g[i ? 'lineTo' : 'moveTo'](p.x, p.y); }
  g.stroke();
  const cols = ['255,214,140', '255,170,120', '255,236,170', '190,226,255'];
  for (let i = 1; i < n; i += 1) {
    const p = along(a, b, sag, i / n, sway), c = cols[i % cols.length];
    const tw = lit ? 0.75 + 0.25 * Math.sin(now / 600 + i * 1.7 + phase) : 0;
    g.fillStyle = lit ? `rgba(${c},1)` : `rgba(${c},.9)`;
    g.beginPath(); g.arc(p.x, p.y + 1.5, 1.35, 0, TAU); g.fill();
    g.strokeStyle = rgba(INK, 0.6); g.lineWidth = 0.3; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(p.x - 0.45, p.y + 1.05, 0.38, 0, TAU); g.fill();
    if (lit) { g.globalCompositeOperation = 'lighter'; glow(g, c, p.x, p.y + 1.2, 5.5, lit * tw * 0.9); g.globalCompositeOperation = 'source-over'; }
  }
}

/** A small songbird: sitting (frame 0), pecking (1), or flying (wings by `flap`). */
export function drawBird(g, x, y, { dir = 1, mode = 'sit', flap = 0, colour = '#8A5A3A', belly = '#E8D2A8', size = 1 } = {}) {
  g.save(); g.translate(x, y); g.scale(dir * size, size);
  g.lineWidth = 0.45; g.strokeStyle = INK;
  if (mode === 'fly') {
    const w = Math.sin(flap) * 3.4;
    g.fillStyle = colour;
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-2.6, -1.4 - w, -5.2, -w * 1.1); g.quadraticCurveTo(-2.4, 0.4, 0, 0.6); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(2.6, -1.4 - w, 5.2, -w * 1.1); g.quadraticCurveTo(2.4, 0.4, 0, 0.6); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, 0.4, 1.9, 1.2, 0, 0, TAU); g.fill(); g.stroke();
  } else {
    const peck = mode === 'peck' ? 1 : 0;
    g.fillStyle = colour;
    g.beginPath(); g.moveTo(-2.4, -1); g.lineTo(-5, -0.2); g.lineTo(-2.6, 0.6); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -1.6, 2.7, 2, -0.15, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = belly; g.beginPath(); g.ellipse(0.6, -1, 1.6, 1.2, 0, 0, TAU); g.fill();
    g.fillStyle = colour; g.beginPath(); g.arc(2.2, -3.4 + peck * 2.2, 1.5, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#E9A23B'; g.beginPath(); g.moveTo(3.5, -3.7 + peck * 2.2); g.lineTo(5, -3.2 + peck * 2.6); g.lineTo(3.4, -2.9 + peck * 2.2); g.closePath(); g.fill();
    g.fillStyle = '#1c1410'; g.beginPath(); g.arc(2.6, -3.7 + peck * 2.2, 0.38, 0, TAU); g.fill();
    g.strokeStyle = '#6A4424'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(-0.4, 0.2); g.lineTo(-0.4, 1.2); g.moveTo(0.8, 0.2); g.lineTo(0.8, 1.2); g.stroke();
  }
  g.restore();
}

/** A sheet of paper turning in the air (scaleX is the turn). */
export function drawPage(g, x, y, { turn = 1, rot = 0, size = 1, glowA = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(Math.max(0.08, Math.abs(turn)) * size, size);
  if (glowA > 0) { g.globalCompositeOperation = 'lighter'; glow(g, '255,226,150', 0, 0, 9, glowA); g.globalCompositeOperation = 'source-over'; }
  g.fillStyle = turn > 0 ? '#FBF3E0' : '#EFE2C4';
  g.strokeStyle = INK; g.lineWidth = 0.45;
  g.beginPath(); g.moveTo(-3.2, -4.2); g.lineTo(2.6, -4.2); g.lineTo(3.2, -3.4); g.lineTo(3.2, 4.2); g.lineTo(-3.2, 4.2); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(120,96,70,.55)'; g.lineWidth = 0.35;
  for (let k = 0; k < 4; k += 1) { g.beginPath(); g.moveTo(-2.2, -2.4 + k * 1.6); g.lineTo(2.2 - (k === 3 ? 1.4 : 0), -2.4 + k * 1.6); g.stroke(); }
  g.restore();
}

/**
 * A windmill on a post, its four sails turning in a plane seen at the
 * painting's three-quarter angle (`ax`, `ay` foreshorten the sail plane).
 */
export function drawWindmill(g, x, y, { angle = 0, r = 16, lean = 0.42 } = {}) {
  // post and cap
  litPath(g, (p) => { p.moveTo(x - 2.6, y + 18); p.lineTo(x + 2.6, y + 18); p.lineTo(x + 1.4, y + 1); p.lineTo(x - 1.4, y + 1); p.closePath(); }, '#8A5A32', { box: [x - 3, y, 6, 18], lw: 0.6 });
  litPath(g, (p) => { p.moveTo(x - 3.4, y + 2); p.lineTo(x + 3.4, y + 2); p.lineTo(x + 2.2, y - 2.4); p.lineTo(x - 2.2, y - 2.4); p.closePath(); }, '#B9533A', { lw: 0.6 });
  const hub = { x: x - 1.6, y: y - 0.4 };
  // the sail plane faces down-left: x stretched by cos(lean), with a slight shear for depth
  const P = (u, v) => ({ x: hub.x + u * Math.cos(lean), y: hub.y + v + u * Math.sin(lean) * 0.35 });
  for (let k = 0; k < 4; k += 1) {
    const a = angle + (k * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a);
    const pt = (t, w) => P(ca * t - sa * w, sa * t + ca * w);
    const q = [pt(r * 0.22, 0), pt(r, 0), pt(r, r * 0.26), pt(r * 0.25, r * 0.26)];
    g.fillStyle = 'rgba(246,238,219,.92)';
    g.beginPath(); q.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p.x, p.y)); g.closePath(); g.fill();
    g.strokeStyle = '#6A4424'; g.lineWidth = 0.4;
    for (let t = 0.4; t < 1; t += 0.2) { const p1 = pt(r * t, 0), p2 = pt(r * t, r * 0.26); g.beginPath(); g.moveTo(p1.x, p1.y); g.lineTo(p2.x, p2.y); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 0.5; g.beginPath(); q.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p.x, p.y)); g.closePath(); g.stroke();
    const s0 = pt(0, 0), s1 = pt(r * 1.02, 0);
    g.strokeStyle = '#5a3a20'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(s0.x, s0.y); g.lineTo(s1.x, s1.y); g.stroke();
  }
  g.fillStyle = INK; g.beginPath(); g.arc(hub.x, hub.y, 1.2, 0, TAU); g.fill();
}

/** A patchwork hot-air balloon with its basket. */
export function balloonSprite() {
  return sprite('balloon', 40, 58, 20, 57, (g) => {
    const cx = 20, cy = 20, rx = 15, ry = 17;
    const env = (p) => { p.moveTo(cx, cy + ry + 7); p.bezierCurveTo(cx - rx * 0.55, cy + ry * 0.9, cx - rx * 1.05, cy + ry * 0.35, cx - rx, cy - ry * 0.05); p.bezierCurveTo(cx - rx, cy - ry * 1.05, cx + rx, cy - ry * 1.05, cx + rx, cy - ry * 0.05); p.bezierCurveTo(cx + rx * 1.05, cy + ry * 0.35, cx + rx * 0.55, cy + ry * 0.9, cx, cy + ry + 7); p.closePath(); };
    g.save(); g.beginPath(); env(g); g.clip();
    const stripes = ['#D9603A', '#F2C14E', '#7FA65A', '#8FB3C9', '#F6EEDB', '#D98B7A'];
    for (let i = -3; i <= 3; i += 1) {
      g.fillStyle = stripes[(i + 6) % stripes.length];
      g.beginPath(); g.moveTo(cx + i * 4.4, cy - ry - 4); g.quadraticCurveTo(cx + i * 8.4, cy, cx + i * 1.4, cy + ry + 8); g.lineTo(cx + (i + 1) * 1.4, cy + ry + 8); g.quadraticCurveTo(cx + (i + 1) * 8.4, cy, cx + (i + 1) * 4.4, cy - ry - 4); g.closePath(); g.fill();
    }
    let gr = g.createRadialGradient(cx - 6, cy - 8, 1, cx - 6, cy - 8, 20); gr.addColorStop(0, 'rgba(255,248,226,.6)'); gr.addColorStop(1, 'rgba(255,248,226,0)'); g.fillStyle = gr; g.fillRect(0, 0, 40, 46);
    gr = g.createRadialGradient(cx + 9, cy + 10, 1, cx + 9, cy + 10, 22); gr.addColorStop(0, 'rgba(50,28,16,.42)'); gr.addColorStop(1, 'rgba(50,28,16,0)'); g.fillStyle = gr; g.fillRect(0, 0, 40, 46);
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 0.7; g.beginPath(); env(g); g.stroke();
    g.strokeStyle = rgba(INK, 0.8); g.lineWidth = 0.4;
    for (const [x0, x1] of [[cx - 4, cx - 3], [cx + 4, cx + 3]]) { g.beginPath(); g.moveTo(x0, cy + ry + 5); g.lineTo(x1, 50); g.stroke(); }
    litPath(g, (p) => { p.moveTo(cx - 4.4, 49.6); p.lineTo(cx + 4.4, 49.6); p.lineTo(cx + 3.6, 56); p.lineTo(cx - 3.6, 56); p.closePath(); }, '#9A6A3A', { box: [cx - 4.4, 49.6, 8.8, 6.4], lw: 0.6 });
  });
}

/** A brass ring seen edge-on at an angle (for the orrery): an ellipse drawn as two halves so a planet can pass behind. */
export function drawRingHalf(g, x, y, rx, ry, tilt, front, colour = '#C9973A') {
  g.save(); g.translate(x, y); g.rotate(tilt);
  g.strokeStyle = INK; g.lineWidth = 2.1;
  g.beginPath(); g.ellipse(0, 0, rx, ry, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); g.stroke();
  g.strokeStyle = colour; g.lineWidth = 1.2;
  g.beginPath(); g.ellipse(0, 0, rx, ry, 0, front ? 0 : Math.PI, front ? Math.PI : TAU); g.stroke();
  g.restore();
}

/** An arrow (shaft along +x, head at x = 0). */
export function drawArrow(g, x, y, ang, { len = 13 } = {}) {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.strokeStyle = INK; g.lineWidth = 1.1; g.beginPath(); g.moveTo(-len, 0); g.lineTo(0, 0); g.stroke();
  g.strokeStyle = '#B9853A'; g.lineWidth = 0.55; g.beginPath(); g.moveTo(-len + 0.4, 0); g.lineTo(-0.6, 0); g.stroke();
  g.fillStyle = '#9aa3ad'; g.strokeStyle = INK; g.lineWidth = 0.35; g.beginPath(); g.moveTo(1.6, 0); g.lineTo(-1, -1.2); g.lineTo(-1, 1.2); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#D9603A';
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(-len + 3.2, 0); g.lineTo(-len, s * 1.9); g.lineTo(-len + 1, 0); g.closePath(); g.fill(); g.stroke(); }
  g.restore();
}

/** A five-point star of light (the crown over a house at stage ten). */
export function crownStarSprite() {
  return sprite('crownstar', 20, 20, 10, 10, (g) => {
    litPath(g, (p) => { for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 3.6 : 8.4; p[i ? 'lineTo' : 'moveTo'](10 + Math.cos(a) * r, 10.6 + Math.sin(a) * r); } p.closePath(); }, '#F4C443', { box: [2, 2, 16, 16], lw: 0.7, light: 0.6 });
    g.fillStyle = 'rgba(255,252,236,.85)'; g.beginPath(); g.ellipse(8.4, 8, 1.6, 1, -0.6, 0, TAU); g.fill();
  });
}

/**
 * A letter or a note as a sprite: text is rasterised once, then stamped
 * (fillText every frame re-shapes the glyph, which a busy scene feels).
 */
export function glyphSprite(ch, px = 10, serif = false, colour = '#5a4130') {
  const w = px * 1.2, h = px * 1.4;
  return sprite(`glyph:${ch}:${px}:${serif ? 1 : 0}:${colour}`, w, h, w / 2, h * 0.78, (g) => {
    g.font = `${serif ? 'italic ' : ''}700 ${px}px ${serif ? 'Georgia, serif' : 'system-ui, sans-serif'}`;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = colour;
    g.fillText(ch, w / 2, h * 0.78);
  });
}

/** A four-point twinkle, drawn in the current fill colour. */
export function twinkle(g, x, y, r) {
  g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.26, y - r * 0.26); g.lineTo(x + r, y); g.lineTo(x + r * 0.26, y + r * 0.26); g.lineTo(x, y + r); g.lineTo(x - r * 0.26, y + r * 0.26); g.lineTo(x - r, y); g.lineTo(x - r * 0.26, y - r * 0.26); g.closePath(); g.fill();
}

export { FLAGS };
