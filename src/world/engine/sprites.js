/**
 * sprites.js — the procedural pixel-art sprite factory.
 *
 * Nothing in the world is an image asset: every tree, flower, building,
 * creature and prop is DRAWN here, pixel by pixel, into a small offscreen
 * canvas the first time it is asked for, then cached by recipe. The style
 * is deliberate pixel art — flat tones from a four-step ramp, one light
 * direction (upper left), a dark outline traced around every silhouette,
 * a few highlight pixels — the same hand the reference boards use.
 *
 * Every recipe is a pure function of its parameters and a seed, so the
 * same tree has the same lean and the same crown forever.
 */

import { ramp, mix, shift, rng, PIGMENT, SEASON } from './palette.js';

/* ------------------------------------------------------------------ */
/* A tiny pixel surface                                                */
/* ------------------------------------------------------------------ */

function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.canvas = makeCanvas(w, h);
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
  }
  px(x, y, c) { this.ctx.fillStyle = c; this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  rect(x, y, w, h, c) { this.ctx.fillStyle = c; this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  hline(x0, x1, y, c) { this.rect(Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, c); }
  vline(x, y0, y1, c) { this.rect(x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, c); }
  disc(cx, cy, r, c) {
    for (let y = -r; y <= r; y += 1) {
      const half = Math.floor(Math.sqrt(r * r - y * y + 0.25));
      this.hline(cx - half, cx + half, cy + y, c);
    }
  }
  /** An irregular ellipse — the leafy edge of a canopy or a bush. */
  blob(cx, cy, rx, ry, c, r = Math.random, rough = 0.18) {
    const bumps = 5 + Math.floor(r() * 3);
    const phase = r() * Math.PI * 2;
    for (let y = -ry - 1; y <= ry + 1; y += 1) {
      for (let x = -rx - 1; x <= rx + 1; x += 1) {
        const a = Math.atan2(y / ry, x / rx);
        const wobble = 1 + rough * Math.sin(a * bumps + phase) * Math.cos(a * 2 + phase);
        const d = (x * x) / (rx * rx * wobble) + (y * y) / (ry * ry * wobble);
        if (d <= 1) this.px(cx + x, cy + y, c);
      }
    }
  }
  /** Trace a 1px outline around everything opaque. */
  outline(color = PIGMENT.outline, alphaFloor = 40) {
    const { w, h } = this;
    const img = this.ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i += 1) solid[i] = d[i * 4 + 3] > alphaFloor ? 1 : 0;
    const [r, g, b] = hexRgb(color);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = y * w + x;
        if (solid[i]) continue;
        const near = (x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w]);
        if (near) { d[i * 4] = r; d[i * 4 + 1] = g; d[i * 4 + 2] = b; d[i * 4 + 3] = 255; }
      }
    }
    this.ctx.putImageData(img, 0, 0);
  }
  /** Dither one colour over another in a checker pattern inside a rect. */
  dither(x, y, w, h, c, phase = 0) {
    for (let j = 0; j < h; j += 1) for (let i = 0; i < w; i += 1) if (((i + j + phase) & 1) === 0) this.px(x + i, y + j, c);
  }
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

const cache = new Map();
let cacheGen = 0;

export function clearSpriteCache() { cache.clear(); cacheGen += 1; }

/** @returns {{canvas, w, h, ax, ay}} a cached sprite with its anchor
 *  (the point that sits on the ground / at the object's position). */
export function sprite(name, params = {}) {
  const key = `${cacheGen}|${name}|${JSON.stringify(params)}`;
  let s = cache.get(key);
  if (!s) { s = RECIPES[name](params); cache.set(key, s); }
  return s;
}

const done = (p, ax, ay) => ({ canvas: p.canvas, w: p.w, h: p.h, ax, ay });

/* ------------------------------------------------------------------ */
/* Trees                                                               */
/* ------------------------------------------------------------------ */

/** Canopy colours for a season, with autumn variety and winter bareness. */
function canopyRamp(season, r, kind) {
  const s = SEASON[season] ?? SEASON.summer;
  let base = s.canopy;
  if (kind === 'pine') base = season === 'winter' ? '#5F8A76' : mix(PIGMENT.pine, s.canopy, 0.25);
  if (season === 'autumn' && kind !== 'pine') base = [PIGMENT.autumn, PIGMENT.autumnRed, '#E0A23F', '#B75B3B'][Math.floor(r() * 4)];
  return ramp(base);
}

/**
 * A broadleaf tree at one of the Rootwood's growth stages. Growth is
 * EXTENSION: every stage adds a structure — a stem, a first mass, a crown,
 * a second crown — so the silhouette alone tells the stage.
 *   open_ground → nothing but a mound; seed → a mound with a pale seed;
 *   sprout → stem + two leaves; young → a small tree; in_leaf → a proper
 *   canopy; mature → a full crown with blossom; ancient → a great tree.
 */
function tree({ stage = 'young', seed = 'tree', season = 'summer', kind = 'broad', vigor = 0, landmark = false, due = 'none' }) {
  const r = rng(`${seed}:${stage}:${season}`);
  const lean = Math.round((r() - 0.5) * 2); // -1..1 px of lean at the crown
  const sizes = { seed: [12, 10], sprout: [12, 12], young: [16, 20], in_leaf: [22, 28], mature: [30, 38], ancient: [44, 56] };
  const [w, h] = sizes[stage] ?? sizes.young;
  const p = new Pix(w, h);
  const gx = Math.floor(w / 2);
  const ground = h - 1;
  const trunk = ramp(PIGMENT.trunk);
  const isWinter = season === 'winter';
  const gold = due === 'gold';
  const canopy = gold ? ramp('#E3B93E') : due === 'bare' ? ramp('#A8A66A') : canopyRamp(season, r, kind);

  if (stage === 'open_ground' || stage === 'seed') {
    const soil = ramp(PIGMENT.earth);
    p.blob(gx, ground - 2, 5, 2, soil.base, r, 0.1);
    p.hline(gx - 3, gx + 2, ground - 3, soil.light);
    if (stage === 'seed') { p.px(gx, ground - 4, '#F3E6C4'); p.px(gx + 1, ground - 4, '#E9D6A7'); }
    p.outline();
    return done(p, gx, ground);
  }

  if (stage === 'sprout') {
    p.vline(gx, ground - 6, ground, trunk.shade);
    p.rect(gx - 3, ground - 7, 3, 2, canopy.base); p.px(gx - 3, ground - 8, canopy.light);
    p.rect(gx + 1, ground - 5, 3, 2, canopy.base); p.px(gx + 3, ground - 6, canopy.light);
    p.px(gx, ground - 8, canopy.light);
    p.outline();
    return done(p, gx, ground);
  }

  // Trunk: tapering, with a lit left edge and a shaded right edge.
  const trunkH = { young: 8, in_leaf: 11, mature: 14, ancient: 22 }[stage];
  const trunkW = { young: 2, in_leaf: 3, mature: 4, ancient: 7 }[stage];
  for (let y = 0; y < trunkH; y += 1) {
    const tw = trunkW + (y > trunkH * 0.7 ? 1 : 0) + (y > trunkH * 0.9 ? 1 : 0);
    const x0 = gx - Math.floor(tw / 2) + Math.round(lean * (1 - y / trunkH) * 0.5);
    p.hline(x0, x0 + tw - 1, ground - y, trunk.base);
    p.px(x0, ground - y, trunk.light);
    p.px(x0 + tw - 1, ground - y, trunk.shade);
  }
  // Roots flare at the base for the big stages.
  if (stage === 'mature' || stage === 'ancient') {
    p.hline(gx - Math.floor(trunkW / 2) - 2, gx + Math.floor(trunkW / 2) + 2, ground, trunk.shade);
  }

  if (isWinter && kind !== 'pine') {
    // Bare branches with snow on top: real winter geometry, not a filter.
    const top = ground - trunkH;
    const spread = { young: 4, in_leaf: 6, mature: 9, ancient: 14 }[stage];
    for (let i = 0; i < 3 + (stage === 'ancient' ? 3 : 0); i += 1) {
      const dir = i % 2 ? 1 : -1;
      const len = Math.round(spread * (0.6 + r() * 0.5));
      let x = gx, y = top - Math.floor(i * 2);
      for (let k = 0; k < len; k += 1) { x += dir; y -= (k % 2); p.px(x, y, trunk.base); if (k % 3 === 0) p.px(x, y - 1, PIGMENT.snow); }
    }
    p.vline(gx, top - 4, top, trunk.base);
    p.px(gx, top - 5, PIGMENT.snow);
    p.outline();
    return done(p, gx, ground);
  }

  if (kind === 'pine') {
    const tiers = { young: 2, in_leaf: 3, mature: 4, ancient: 6 }[stage];
    const top = ground - trunkH - 2;
    const tierH = Math.max(4, Math.floor((h - trunkH - 6) / tiers) + 1);
    for (let t = tiers - 1; t >= 0; t -= 1) {
      const baseY = top + (t + 1) * tierH;
      const half = 2 + t * Math.max(2, Math.floor(w / (tiers * 2 + 2)));
      for (let y = 0; y < tierH + 1; y += 1) {
        const hw = Math.max(1, Math.round(half * (y / tierH)));
        const yy = baseY - tierH + y;
        p.hline(gx - hw, gx + hw, yy, canopy.base);
        p.hline(gx - hw, gx - Math.max(0, hw - 2), yy, canopy.light);
        p.hline(gx + Math.max(0, hw - 2), gx + hw, yy, canopy.shade);
      }
      p.hline(gx - half, gx + half, baseY, canopy.dark);
    }
    p.px(gx, top - 1, canopy.light);
    if (season === 'winter') for (let t = 0; t < tiers; t += 1) p.hline(gx - 1 - t, gx + 1 + t, top + t * tierH + 1, PIGMENT.snow);
    p.outline();
    return done(p, gx, ground);
  }

  // Broadleaf crown: one round mass built from three tones — a dark
  // underside, the base, and a lit cap offset to the upper left — with a
  // few leaf clusters bumping the silhouette so no two trees match.
  const crownY = ground - trunkH - Math.floor({ young: 5, in_leaf: 8, mature: 11, ancient: 16 }[stage] * (0.85 + vigor * 0.2));
  const rx = { young: 6, in_leaf: 9, mature: 13, ancient: 20 }[stage];
  const ry = { young: 5, in_leaf: 8, mature: 11, ancient: 16 }[stage];
  const bumps = { young: 2, in_leaf: 3, mature: 4, ancient: 6 }[stage];
  const rb = rng(`${seed}:${stage}:bumps`);
  // Underside and bumps in the dark tone, one pixel down and right.
  p.blob(gx + lean + 1, crownY + 1, rx, ry, canopy.dark, rng(`${seed}:c0`), 0.08);
  const bumpList = [];
  for (let i = 0; i < bumps; i += 1) {
    const a = Math.PI * (0.15 + rb() * 0.7) + (i % 2 ? Math.PI : 0) * 0; // mostly the top half
    const ang = -a;
    const bx = gx + lean + Math.round(Math.cos(ang) * rx * 0.8), by = crownY + Math.round(Math.sin(ang) * ry * 0.8);
    const brx = Math.max(2, Math.round(rx * (0.28 + rb() * 0.2))), bry = Math.max(2, Math.round(ry * (0.28 + rb() * 0.2)));
    bumpList.push([bx, by, brx, bry]);
    p.blob(bx + 1, by + 1, brx, bry, canopy.dark, rb, 0.1);
  }
  // The body in the base tone, then the same bumps.
  p.blob(gx + lean, crownY, rx, ry, canopy.base, rng(`${seed}:c1`), 0.08);
  for (const [bx, by, brx, bry] of bumpList) p.blob(bx, by, brx, bry, canopy.base, rb, 0.1);
  // The lit cap: a smaller mass toward the light.
  p.blob(gx + lean - Math.round(rx * 0.28), crownY - Math.round(ry * 0.3), Math.round(rx * 0.62), Math.round(ry * 0.55), canopy.light, rng(`${seed}:c2`), 0.12);
  // Shade crescent along the lower right, inside the silhouette.
  for (let y = 0; y <= ry; y += 1) {
    const half = Math.floor(Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))) * rx);
    const w = Math.max(0, Math.round(half * (y / ry) * 0.5));
    if (w > 0) p.hline(gx + lean + half - w, gx + lean + half - 1, crownY + y, canopy.shade);
  }
  // Leaf sparkle: bright pixels on the lit side, dark specks below.
  const r3 = rng(`${seed}:${stage}:sparkle`);
  for (let i = 0; i < bumps * 3; i += 1) {
    const sx = gx + lean - Math.round(r3() * rx * 0.7), sy = crownY - Math.round(r3() * ry * 0.7);
    p.px(sx, sy, shift(canopy.light, { l: 0.12 }));
    const dx = gx + lean + Math.round(r3() * rx * 0.6), dy = crownY + Math.round(r3() * ry * 0.5);
    p.px(dx, dy, canopy.dark);
  }
  if (stage === 'mature' || stage === 'ancient') {
    // Blossom or fruit in the crown — the reward of maturity, quietly.
    const r4 = rng(`${seed}:bloom`);
    const bloomColor = SEASON[season]?.blossom ? PIGMENT.blossom : season === 'autumn' ? '#F0C060' : '#F7E7B0';
    for (let i = 0; i < (stage === 'ancient' ? 9 : 5); i += 1) {
      p.px(gx + Math.round((r4() - 0.5) * rx * 1.4), crownY + Math.round((r4() - 0.5) * ry * 1.2), bloomColor);
    }
  }
  if (landmark) {
    // A small lantern hung on the trunk and a nest in the crown.
    p.rect(gx - trunkW - 1, ground - Math.floor(trunkH * 0.6), 2, 3, PIGMENT.lantern);
    p.px(gx - trunkW - 1, ground - Math.floor(trunkH * 0.6) - 1, PIGMENT.timber);
    p.rect(gx + 2, crownY - 1, 4, 2, PIGMENT.timber);
    p.px(gx + 3, crownY - 2, '#DCE8F5');
  }
  p.outline();
  return done(p, gx, ground);
}

/* ------------------------------------------------------------------ */
/* Ground cover                                                        */
/* ------------------------------------------------------------------ */

const FLOWER_COLORS = ['#F26D8C', '#F7C948', '#FFFFFF', '#B58CE8', '#FF8A5B', '#79C7F2', '#F4A6C1'];

function flower({ color = 0, seed = 'f', tall = false }) {
  const r = rng(`${seed}:${color}`);
  const p = new Pix(5, tall ? 8 : 6);
  const c = FLOWER_COLORS[color % FLOWER_COLORS.length];
  const stem = ramp(PIGMENT.grassDeep);
  const h = p.h - 1;
  p.vline(2, h - 3, h, stem.base);
  p.px(1, h - 1, stem.light);
  p.px(2, h - 4, c); p.px(1, h - 4, c); p.px(3, h - 4, c); p.px(2, h - 5, c); p.px(2, h - 3, c);
  p.px(2, h - 4, r() > 0.5 ? '#FFE9A8' : '#FFFFFF');
  if (tall) p.px(3, h - 6, c);
  return done(p, 2, h);
}

function flowerPatch({ seed = 'patch', n = 6, colors = [0, 1, 2], w = 16, h = 10 }) {
  const r = rng(seed);
  const p = new Pix(w, h);
  for (let i = 0; i < n; i += 1) {
    const f = flower({ color: colors[Math.floor(r() * colors.length)], seed: `${seed}:${i}` });
    const x = Math.floor(r() * (w - 5)), y = Math.floor(r() * (h - 6));
    p.ctx.drawImage(f.canvas, x, y);
  }
  return done(p, Math.floor(w / 2), h - 1);
}

function grassTuft({ seed = 'g', season = 'summer' }) {
  const r = rng(seed);
  const p = new Pix(7, 5);
  const g = ramp(SEASON[season]?.grass ?? PIGMENT.grass);
  const c = season === 'winter' ? '#B9C6D2' : g.shade;
  for (let i = 0; i < 4; i += 1) { const x = 1 + i + Math.floor(r() * 2); const hh = 2 + Math.floor(r() * 3); p.vline(x, 4 - hh, 4, c); p.px(x, 4 - hh, season === 'winter' ? PIGMENT.snow : g.light); }
  return done(p, 3, 4);
}

function bush({ seed = 'b', season = 'summer', berries = false }) {
  const r = rng(`${seed}:${season}`);
  const p = new Pix(14, 10);
  const c = season === 'winter' ? ramp('#7C9A8E') : ramp(mix(PIGMENT.canopyDeep, SEASON[season]?.canopy ?? PIGMENT.canopy, 0.5));
  p.blob(7, 6, 6, 3, c.dark, r, 0.2);
  p.blob(6, 5, 5, 3, c.base, r, 0.25);
  p.blob(4, 4, 3, 2, c.light, r, 0.25);
  if (berries) for (let i = 0; i < 4; i += 1) p.px(2 + Math.floor(r() * 10), 3 + Math.floor(r() * 5), PIGMENT.berry);
  if (season === 'winter') p.hline(3, 9, 2, PIGMENT.snow);
  p.outline();
  return done(p, 7, 9);
}

function bramble({ seed = 'br', season = 'summer', lit = false }) {
  const r = rng(`${seed}:${season}`);
  const p = new Pix(22, 14);
  const c = ramp(season === 'winter' ? '#6E7F79' : PIGMENT.bramble);
  const th = ramp(PIGMENT.thorn);
  p.blob(11, 8, 10, 5, c.dark, r, 0.3);
  p.blob(9, 7, 8, 4, c.base, r, 0.3);
  p.blob(6, 5, 4, 3, c.light, r, 0.3);
  for (let i = 0; i < 7; i += 1) { const x = 2 + Math.floor(r() * 18), y = 3 + Math.floor(r() * 9); p.px(x, y, th.shade); p.px(x + 1, y - 1, th.light); }
  for (let i = 0; i < 6; i += 1) p.px(2 + Math.floor(r() * 18), 4 + Math.floor(r() * 8), lit ? '#C48BE0' : PIGMENT.berry);
  p.outline();
  return done(p, 11, 13);
}

function rock({ seed = 'r', size = 1 }) {
  const r = rng(seed);
  const w = 6 + size * 4, h = 4 + size * 2;
  const p = new Pix(w, h);
  const s = ramp(PIGMENT.stone);
  p.blob(Math.floor(w / 2), Math.floor(h / 2) + 1, Math.floor(w / 2) - 1, Math.floor(h / 2) - 1, s.shade, r, 0.12);
  p.blob(Math.floor(w / 2) - 1, Math.floor(h / 2), Math.floor(w / 2) - 2, Math.floor(h / 2) - 2, s.base, r, 0.15);
  p.px(2, 2, s.light); p.px(3, 1, s.light);
  p.outline();
  return done(p, Math.floor(w / 2), h - 1);
}

function stump({ seed = 's' }) {
  const p = new Pix(9, 7);
  const t = ramp(PIGMENT.trunk);
  p.rect(1, 2, 7, 5, t.base); p.rect(1, 2, 2, 5, t.light); p.rect(6, 2, 2, 5, t.shade);
  p.rect(1, 1, 7, 2, '#D9B98C'); p.hline(3, 5, 1, '#B79263');
  p.outline();
  return done(p, 4, 6);
}

function lilypad({ seed = 'l', bloom = false }) {
  const r = rng(seed);
  const p = new Pix(7, 5);
  const c = ramp(PIGMENT.lily);
  p.blob(3, 2, 3, 2, c.base, r, 0.1);
  p.px(2, 1, c.light); p.px(4, 3, c.shade);
  if (bloom) { p.px(3, 1, PIGMENT.lilyBloom); p.px(3, 0, '#F9DFEA'); }
  return done(p, 3, 2);
}

function reeds({ seed = 'reed' }) {
  const r = rng(seed);
  const p = new Pix(9, 12);
  const c = ramp(PIGMENT.reed);
  for (let i = 0; i < 5; i += 1) { const x = 1 + i * 2 - (i % 2); const h = 6 + Math.floor(r() * 5); p.vline(x, 11 - h, 11, i % 2 ? c.shade : c.base); p.rect(x, 11 - h, 1, 2, '#7A5A3E'); }
  return done(p, 4, 11);
}

/* ------------------------------------------------------------------ */
/* Buildings                                                           */
/* ------------------------------------------------------------------ */

/** The Hearth: the learner's cottage. Levels add a chimney, a garden
 *  fence, a second window, flower boxes, and a lantern. */
function cottage({ level = 1, lit = false, smoke = false }) {
  const p = new Pix(48, 40);
  const wall = ramp(PIGMENT.wallLit);
  const roof = ramp(PIGMENT.roof);
  const timber = ramp(PIGMENT.timber);
  const gx = 24, ground = 39;
  // Body
  p.rect(8, 20, 32, 19, wall.base);
  p.rect(8, 20, 32, 1, wall.light);
  p.rect(36, 20, 4, 19, wall.shade);
  // Timber frame
  p.vline(8, 20, 38, timber.base); p.vline(39, 20, 38, timber.shade); p.hline(8, 39, 38, timber.dark);
  p.hline(8, 39, 27, timber.base);
  // Roof (a warm gable)
  for (let y = 0; y < 12; y += 1) {
    const half = 4 + y * 1.6;
    p.hline(Math.round(gx - half), Math.round(gx + half), 9 + y, y < 4 ? roof.light : roof.base);
    p.hline(Math.round(gx + half) - 2, Math.round(gx + half), 9 + y, roof.shade);
  }
  p.hline(4, 44, 21, roof.dark);
  p.hline(3, 45, 20, roof.shade);
  // Door
  p.rect(21, 29, 6, 10, timber.base); p.rect(21, 29, 1, 10, timber.light); p.px(25, 34, PIGMENT.gold);
  p.rect(21, 28, 6, 1, timber.dark);
  // Window(s)
  const win = (x, y) => {
    p.rect(x, y, 5, 5, lit ? PIGMENT.windowLight : '#8FB8D8');
    p.px(x + 2, y, timber.base); p.px(x + 2, y + 1, timber.base); p.px(x + 2, y + 2, timber.base); p.px(x + 2, y + 3, timber.base); p.px(x + 2, y + 4, timber.base);
    p.hline(x, x + 4, y + 2, timber.base);
    p.rect(x - 1, y - 1, 7, 1, timber.dark); p.rect(x - 1, y + 5, 7, 1, timber.dark);
    if (lit) { p.px(x, y, '#FFF0C0'); p.px(x + 3, y + 3, '#FFB84A'); }
  };
  win(12, 30);
  if (level >= 2) win(31, 30);
  // Chimney
  if (level >= 2) { p.rect(33, 6, 4, 9, ramp(PIGMENT.stone).base); p.rect(33, 6, 1, 9, ramp(PIGMENT.stone).light); p.rect(32, 5, 6, 1, ramp(PIGMENT.stone).dark); }
  if (level >= 3) { // flower boxes
    p.rect(11, 36, 7, 2, timber.base); p.px(12, 35, '#F26D8C'); p.px(14, 35, '#F7C948'); p.px(16, 35, '#F26D8C');
    p.rect(30, 36, 7, 2, timber.base); p.px(31, 35, '#B58CE8'); p.px(33, 35, '#FFFFFF'); p.px(35, 35, '#F26D8C');
  }
  if (level >= 4) { // lantern by the door
    p.vline(43, 26, 38, timber.dark); p.rect(42, 24, 3, 3, PIGMENT.lantern); p.px(43, 23, timber.dark);
  }
  if (level >= 5) { // ivy and a weathervane
    const iv = ramp(PIGMENT.vine);
    for (let i = 0; i < 9; i += 1) { p.px(9 + (i % 3), 22 + i, iv.base); if (i % 2) p.px(10 + (i % 2), 21 + i, iv.light); }
    p.vline(24, 4, 8, timber.dark); p.px(25, 5, PIGMENT.gold); p.px(23, 5, PIGMENT.gold);
  }
  p.outline();
  return done(p, gx, ground);
}

/** The Reading Room: a library tower that gains floors with mastery.
 *  `floors` 1–5, `lit` how many windows glow, `observatory` the dome. */
function tower({ floors = 1, lit = 0, observatory = false, night = false }) {
  const floorH = 12;
  const W = 26;
  // A reading stage always sits on top of whatever floors have been earned:
  // the tower is a tower on day one, and grows taller, never wider.
  const stageH = 13;
  const baseH = 9;
  const spireH = observatory ? 13 : 16;
  const h = baseH + floors * floorH + stageH + spireH;
  const p = new Pix(W, h);
  const stone = ramp(PIGMENT.stoneWarm);
  const roof = ramp(PIGMENT.roofWarm);
  const timber = ramp(PIGMENT.timber);
  const gx = 13, ground = h - 1;

  /* The plinth: wider than the shaft, so the tower stands rather than floats. */
  p.rect(3, ground - baseH + 1, 21, baseH, stone.shade);
  p.rect(3, ground - baseH + 1, 2, baseH, stone.base);
  p.rect(3, ground - baseH + 1, 21, 1, stone.light);
  p.rect(3, ground, 21, 1, stone.dark);

  /* The shaft. */
  const shaftTop = ground - baseH - floors * floorH;
  p.rect(6, shaftTop, 15, floors * floorH + 2, stone.base);
  p.rect(6, shaftTop, 2, floors * floorH + 2, stone.light);
  p.rect(18, shaftTop, 3, floors * floorH + 2, stone.shade);
  // One window per floor, centred, glowing per `lit`.
  let winIndex = 0;
  for (let f = 0; f < floors; f += 1) {
    const y = ground - baseH - (f + 1) * floorH + 3;
    p.hline(6, 20, y + floorH - 2, stone.dark);
    const on = winIndex < lit;
    p.rect(11, y, 5, 6, on ? PIGMENT.windowLight : night ? '#2C3A55' : '#8FB8D8');
    p.rect(10, y - 1, 7, 1, timber.dark);
    p.rect(10, y + 6, 7, 1, timber.dark);
    p.px(12, y, on ? '#FFF3CC' : '#B7D6EA');
    winIndex += 1;
  }

  /* The reading stage: a tall arched window that is lit whenever anything is. */
  const stageTop = shaftTop - stageH;
  p.rect(5, stageTop, 17, stageH, stone.base);
  p.rect(5, stageTop, 2, stageH, stone.light);
  p.rect(19, stageTop, 3, stageH, stone.shade);
  p.hline(4, 22, stageTop, stone.dark);
  p.hline(4, 22, stageTop + stageH - 1, stone.dark);
  {
    const on = lit > 0;
    const glass = on ? PIGMENT.windowLight : night ? '#2C3A55' : '#8FB8D8';
    p.rect(10, stageTop + 4, 7, 7, glass);
    // The arch.
    p.rect(11, stageTop + 2, 5, 2, glass);
    p.rect(12, stageTop + 1, 3, 1, glass);
    p.px(11, stageTop + 4, on ? '#FFF3CC' : '#B7D6EA');
    p.px(13, stageTop + 1, timber.dark);
    for (const bx of [9, 17]) p.vline(bx, stageTop + 2, stageTop + 11, timber.dark);
    p.vline(13, stageTop + 2, stageTop + 10, timber.dark);
  }

  /* Door, on the plinth. */
  p.rect(11, ground - 7, 5, 7, timber.base);
  p.rect(11, ground - 7, 1, 7, timber.light);
  p.rect(10, ground - 8, 7, 1, timber.dark);
  p.px(15, ground - 4, PIGMENT.gold);

  /* Spire, or the Observatory's dome. */
  if (observatory) {
    const dome = ramp('#6C8FA6');
    p.rect(4, stageTop - 2, 19, 2, stone.dark);
    for (let y = stageTop - 11; y <= stageTop - 3; y += 1) {
      const half = Math.floor(Math.sqrt(Math.max(0, 64 - (y - (stageTop - 3)) ** 2)));
      p.hline(gx - half, gx + half, y, dome.base);
      p.hline(gx - half, gx - half + 3, y, dome.light);
    }
    p.rect(gx - 1, stageTop - 13, 3, 3, PIGMENT.gold);
    p.vline(gx, stageTop - 15, stageTop - 13, timber.dark);
    p.rect(gx - 2, stageTop - 8, 4, 4, '#1C2A45');
    p.px(gx - 1, stageTop - 7, PIGMENT.gold);
  } else {
    // A steep slate spire: the shape you can name from the far side of the map.
    for (let i = 0; i < spireH - 3; i += 1) {
      const y = stageTop - 1 - i;
      // i counts upward from the eaves, so the spire has to narrow with it.
      const half = Math.max(0, Math.round((spireH - 4 - i) * 0.62));
      p.hline(gx - half, gx + half, y, i > spireH * 0.55 ? roof.light : roof.base);
      p.px(gx + half, y, roof.shade);
    }
    p.hline(3, 22, stageTop - 1, roof.dark);
    p.hline(4, 21, stageTop - 2, roof.base);
    p.vline(gx, stageTop - spireH + 2, stageTop - spireH + 4, timber.dark);
    p.px(gx, stageTop - spireH + 1, PIGMENT.gold);
  }

  p.outline();
  return done(p, gx, ground);
}

/** A workshop building for the verbal crafts: the Loom (weaving), the
 *  Summary Table (a market stall), the Stranger's Bench (a bench under a
 *  lantern). `level` 0–4 dresses it up as tiers are cleared. */
function workshop({ kind = 'loom', level = 0, lit = false }) {
  const p = new Pix(40, 34);
  const wall = ramp(kind === 'loom' ? '#E6D2B0' : kind === 'table' ? '#D9C4A0' : '#CDBFA6');
  const roof = ramp(kind === 'loom' ? '#8A6C9C' : kind === 'table' ? '#C6533A' : '#5D7F90');
  const timber = ramp(PIGMENT.timber);
  const gx = 20, ground = 33;
  if (kind === 'bench') {
    // A stone bench under a great lantern post; a small tree beside it at higher levels.
    p.rect(8, 26, 22, 3, ramp(PIGMENT.stoneWarm).base); p.rect(8, 26, 22, 1, ramp(PIGMENT.stoneWarm).light);
    p.rect(10, 29, 3, 4, ramp(PIGMENT.stoneWarm).shade); p.rect(25, 29, 3, 4, ramp(PIGMENT.stoneWarm).shade);
    p.vline(33, 12, 32, timber.dark); p.rect(31, 8, 5, 5, lit || level >= 1 ? PIGMENT.lantern : '#8C7A5C'); p.px(33, 7, timber.dark);
    if (level >= 2) { p.rect(3, 14, 1, 12, timber.base); p.blob(3, 12, 5, 4, ramp(PIGMENT.canopy).base, rng('benchtree'), 0.2); p.blob(2, 11, 3, 2, ramp(PIGMENT.canopy).light, rng('benchtree2'), 0.2); }
    if (level >= 3) { p.rect(14, 22, 10, 4, '#B24A3B'); p.rect(14, 22, 10, 1, '#D96A58'); } // a cushion
    if (level >= 4) { p.px(17, 20, '#FFFFFF'); p.px(21, 20, '#FFFFFF'); p.px(19, 19, PIGMENT.gold); } // a birdbath-sized bloom
    p.outline();
    return done(p, gx, ground);
  }
  // Body
  p.rect(6, 16, 28, 17, wall.base); p.rect(6, 16, 28, 1, wall.light); p.rect(30, 16, 4, 17, wall.shade);
  p.vline(6, 16, 32, timber.base); p.vline(33, 16, 32, timber.shade); p.hline(6, 33, 32, timber.dark);
  // Roof: a wide awning for the table, a peaked roof for the loom
  if (kind === 'table') {
    for (let y = 0; y < 6; y += 1) p.hline(2 + y, 37 - y, 10 + y, (y & 1) ? roof.light : roof.base);
    p.hline(2, 37, 16, roof.dark);
    // stripes
    for (let x = 4; x < 36; x += 6) p.rect(x, 11, 2, 5, '#F4E6C8');
    // the table itself under the awning
    p.rect(9, 24, 22, 2, timber.base); p.rect(9, 26, 2, 6, timber.shade); p.rect(29, 26, 2, 6, timber.shade);
    p.rect(12, 21, 4, 3, '#F2E9D6'); p.rect(18, 21, 5, 3, '#E7D9BA'); p.rect(25, 21, 3, 3, '#F2E9D6');
  } else {
    for (let y = 0; y < 9; y += 1) { const half = 3 + y * 1.5; p.hline(Math.round(gx - half), Math.round(gx + half), 7 + y, y < 3 ? roof.light : roof.base); p.hline(Math.round(gx + half) - 2, Math.round(gx + half), 7 + y, roof.shade); }
    p.hline(3, 37, 16, roof.dark);
    // Door and a loom window with threads
    p.rect(18, 24, 5, 9, timber.base); p.rect(18, 24, 1, 9, timber.light);
    p.rect(9, 20, 6, 6, lit ? PIGMENT.windowLight : '#8FB8D8'); p.rect(8, 19, 8, 1, timber.dark); p.rect(8, 26, 8, 1, timber.dark);
    p.rect(25, 20, 6, 6, '#F1E6CF'); for (let i = 0; i < 6; i += 1) p.px(25 + i, 20 + (i % 3), ['#C6533A', '#3F87CB', '#F7C948'][i % 3]);
    p.rect(24, 19, 8, 1, timber.dark); p.rect(24, 26, 8, 1, timber.dark);
  }
  if (level >= 1) { p.vline(36, 18, 32, timber.dark); p.rect(35, 15, 3, 3, PIGMENT.lantern); }
  if (level >= 2) { p.rect(1, 28, 5, 5, ramp(PIGMENT.canopy).base); p.px(2, 27, ramp(PIGMENT.canopy).light); p.px(3, 30, '#F26D8C'); }
  if (level >= 3) { p.rect(gx - 1, 2, 1, 6, timber.dark); p.rect(gx, 2, 5, 4, kind === 'loom' ? '#8A6C9C' : '#C6533A'); p.px(gx + 1, 3, PIGMENT.gold); }
  if (level >= 4) { for (let x = 7; x < 33; x += 4) p.px(x, 17, PIGMENT.gold); }
  p.outline();
  return done(p, gx, ground);
}

function lantern({ lit = true }) {
  const p = new Pix(5, 14);
  const t = ramp(PIGMENT.timber);
  p.vline(2, 4, 13, t.dark); p.rect(0, 13, 5, 1, t.shade);
  p.rect(1, 1, 3, 4, lit ? PIGMENT.lantern : '#7C6A52'); p.px(2, 2, lit ? '#FFF1C8' : '#8E7C62'); p.px(2, 0, t.dark);
  p.outline();
  return done(p, 2, 13);
}

function signpost({ arrows = 1 }) {
  const p = new Pix(12, 16);
  const t = ramp(PIGMENT.timber);
  p.vline(5, 2, 15, t.base); p.vline(6, 2, 15, t.shade);
  for (let i = 0; i < arrows; i += 1) { const y = 3 + i * 4; p.rect(1 + (i % 2) * 2, y, 9, 3, '#D9B98C'); p.px(1 + (i % 2) * 2, y + 1, '#B79263'); }
  p.outline();
  return done(p, 5, 15);
}

function bridge({ w = 22 }) {
  const p = new Pix(w, 9);
  const t = ramp(PIGMENT.timber);
  p.rect(0, 4, w, 3, t.base); for (let x = 0; x < w; x += 3) p.vline(x, 4, 6, t.shade);
  p.rect(0, 2, w, 1, t.light); p.rect(0, 7, w, 1, t.dark);
  for (let x = 1; x < w; x += 5) { p.vline(x, 0, 4, t.dark); p.vline(x, 7, 8, t.dark); }
  p.outline();
  return done(p, Math.floor(w / 2), 6);
}

function fence({ w = 24 }) {
  const p = new Pix(w, 8);
  const t = ramp('#C9AE86');
  p.rect(0, 3, w, 1, t.base); p.rect(0, 5, w, 1, t.shade);
  for (let x = 1; x < w; x += 5) { p.vline(x, 1, 7, t.base); p.px(x, 1, t.light); }
  p.outline();
  return done(p, Math.floor(w / 2), 7);
}

function terraceWall({ w = 60, level = 0 }) {
  const p = new Pix(w, 12);
  const s = ramp(PIGMENT.terrace);
  const v = ramp(PIGMENT.vine);
  p.rect(0, 4, w, 8, s.shade); p.rect(0, 3, w, 2, s.light);
  for (let x = 0; x < w; x += 7) p.vline(x, 5, 11, s.dark);
  const r = rng(`terrace:${w}:${level}`);
  for (let i = 0; i < level * 4; i += 1) { const x = Math.floor(r() * w); const h = 3 + Math.floor(r() * 5); for (let y = 0; y < h; y += 1) p.px(x + (y % 2), 4 + y, y % 3 ? v.base : v.light); }
  return done(p, Math.floor(w / 2), 11);
}

/* ------------------------------------------------------------------ */
/* Creatures                                                           */
/* ------------------------------------------------------------------ */

function koi({ variant = 0, frame = 0 }) {
  const p = new Pix(9, 5);
  const body = [PIGMENT.koiOrange, PIGMENT.koiWhite, '#F4B04A', PIGMENT.koiBlack][variant % 4];
  const spot = variant === 1 ? PIGMENT.koiOrange : variant === 3 ? PIGMENT.koiWhite : '#FBF7F0';
  p.rect(2, 1, 5, 3, body); p.px(1, 2, body); p.px(7, 2, body);
  p.px(8, 1 + (frame % 2), body); p.px(8, 3 - (frame % 2), body); // tail flick
  p.px(4, 2, spot); p.px(3, 1, spot);
  p.px(2, 2, '#1C1D1F');
  return done(p, 4, 2);
}

function butterfly({ color = 0, frame = 0 }) {
  const p = new Pix(7, 5);
  const c = ['#F7C948', '#79C7F2', '#F26D8C', '#FFFFFF', '#B58CE8'][color % 5];
  const open = frame % 2 === 0;
  if (open) { p.rect(0, 1, 3, 2, c); p.rect(4, 1, 3, 2, c); p.px(1, 3, c); p.px(5, 3, c); p.px(0, 1, '#FFFFFF'); p.px(6, 1, '#FFFFFF'); }
  else { p.rect(1, 1, 2, 2, c); p.rect(4, 1, 2, 2, c); }
  p.vline(3, 1, 3, '#2A2A38');
  return done(p, 3, 2);
}

function bird({ frame = 0, dark = true }) {
  const p = new Pix(7, 4);
  const c = dark ? '#2A2A38' : '#5B6A7A';
  if (frame % 2 === 0) { p.px(0, 0, c); p.px(1, 1, c); p.px(2, 2, c); p.px(3, 2, c); p.px(4, 2, c); p.px(5, 1, c); p.px(6, 0, c); }
  else { p.px(0, 2, c); p.px(1, 2, c); p.px(2, 2, c); p.px(3, 2, c); p.px(4, 2, c); p.px(5, 2, c); p.px(6, 2, c); p.px(3, 1, c); }
  return done(p, 3, 2);
}

/**
 * Wick at map scale. The valley is drawn at 640 × 720 world pixels, where
 * the whole cottage is thirty across — so the companion who is 26 × 22 in
 * a portrait is 11 × 9 here. Same charcoal, same cream chest, same amber
 * eye: small enough to belong on the map, recognisable enough to be him.
 */
function catSmall({ frame = 0, sitting = true }) {
  const p = new Pix(11, 9);
  const c = ramp('#4A4550');
  const cream = ramp('#EFE3CA');
  // Tail, curling back with a cream tip.
  p.rect(8, 5, 2, 2, c.base); p.px(10, 4, c.base); p.px(10, 3, cream.base);
  // Body and head.
  p.rect(2, 4, 6, 4, c.base);
  p.rect(3, 4, 4, 1, c.light);
  p.rect(4, 5, 3, 3, cream.base);
  p.rect(1, 1, 5, 4, c.base);
  p.px(1, 0, c.base); p.px(5, 0, c.base);              // ears
  p.px(2, 2, '#F2C14E'); p.px(4, 2, '#F2C14E');        // eyes
  p.px(3, 3, '#C58B90');                                // nose
  // Front paws, alternating when he pads about.
  p.px(2, 8 - (frame % 2), cream.base);
  p.px(6, 8, cream.base);
  p.outline();
  return done(p, 5, 8);
}

function cat({ frame = 0 }) {
  const p = new Pix(9, 7);
  const c = ramp(PIGMENT.cat);
  p.rect(1, 3, 6, 3, c.base); p.rect(1, 3, 6, 1, c.light);
  p.rect(5, 1, 3, 3, c.base); p.px(5, 0, c.base); p.px(7, 0, c.base);
  p.px(6, 2, '#F2C14E'); p.px(6, 3, c.dark);
  p.px(0, 2 + (frame % 2), c.shade); p.px(0, 1 + (frame % 2), c.shade);
  p.rect(2, 6, 1, 1, c.dark); p.rect(5, 6, 1, 1, c.dark);
  p.px(3, 4, '#C9BCA6');
  p.outline();
  return done(p, 4, 6);
}

function cloud({ seed = 'c', w = 30 }) {
  const r = rng(seed);
  const h = Math.max(8, Math.floor(w * 0.4));
  const p = new Pix(w, h);
  const n = 3 + Math.floor(w / 12);
  for (let i = 0; i < n; i += 1) {
    const cx = Math.floor(2 + r() * (w - 4)), cy = Math.floor(h * 0.6 + (r() - 0.5) * h * 0.3);
    const rx = Math.floor(3 + r() * w * 0.2), ry = Math.floor(2 + r() * h * 0.3);
    p.blob(cx, cy + 1, rx, ry, '#D6E2EE', r, 0.1);
  }
  const r2 = rng(`${seed}:2`);
  for (let i = 0; i < n; i += 1) {
    const cx = Math.floor(2 + r2() * (w - 4)), cy = Math.floor(h * 0.55 + (r2() - 0.5) * h * 0.3);
    const rx = Math.floor(3 + r2() * w * 0.2), ry = Math.floor(2 + r2() * h * 0.3);
    p.blob(cx, cy, rx, ry, '#FFFFFF', r2, 0.1);
  }
  return done(p, Math.floor(w / 2), h - 1);
}

/** A root-stone: an unmet root family, standing as a carved stone. */
function rootStone({ seed = 'rs' }) {
  const r = rng(seed);
  const p = new Pix(10, 9);
  const s = ramp('#A9A395');
  p.blob(5, 5, 4, 3, s.shade, r, 0.12); p.blob(4, 4, 3, 3, s.base, r, 0.15);
  p.px(3, 2, s.light); p.px(4, 3, s.dark); p.px(5, 4, s.dark); p.px(5, 3, s.dark);
  p.outline();
  return done(p, 5, 8);
}

/** A glowing star marker for a place that is asking for attention. */
function marker({ color = PIGMENT.gold }) {
  const p = new Pix(7, 7);
  p.px(3, 0, color); p.px(3, 6, color); p.px(0, 3, color); p.px(6, 3, color);
  p.rect(2, 2, 3, 3, color); p.px(3, 3, '#FFFFFF');
  return done(p, 3, 6);
}

/** Smoke puff, drawn soft. */
function puff({ size = 3 }) {
  const p = new Pix(size * 2 + 1, size * 2 + 1);
  p.disc(size, size, size, PIGMENT.smoke);
  return done(p, size, size);
}

/* ------------------------------------------------------------------ */
/* The works: what Amber, Ink, Thread and Ember build                   */
/* ------------------------------------------------------------------ */

/** A white bee skep on a low stand. The Meadow's hives. */
function hive({ seed = 'h' }) {
  const p = new Pix(12, 14);
  const w = ramp('#F0E6D2');
  const t = ramp(PIGMENT.timber);
  p.rect(2, 12, 8, 2, t.dark);
  for (let i = 0; i < 5; i += 1) {
    const wdt = 9 - Math.abs(i - 3);
    const x = 6 - Math.floor(wdt / 2);
    p.rect(x, 11 - i * 2, wdt, 2, i % 2 ? w.base : w.light);
    p.hline(x, x + wdt - 1, 11 - i * 2, w.shade);
  }
  p.px(6, 10, '#3A2E22');
  p.px(5, 10, '#3A2E22');
  const r = rng(`hive:${seed}`);
  for (let i = 0; i < 3; i += 1) p.px(1 + Math.floor(r() * 10), 1 + Math.floor(r() * 6), PIGMENT.gold);
  p.outline();
  return done(p, 6, 13);
}

/** A heron standing in the shallows: grey, still, one leg. */
function heron({ frame = 0 }) {
  const p = new Pix(11, 20);
  const g = ramp('#9DA7B4');
  p.vline(5, 15, 19, '#C9A24B');          // leg
  p.blob(5, 12, 3, 4, g.base, rng('heron-body'), 0.1);
  p.rect(5, 11, 2, 3, g.light);
  p.vline(6, 5, 10, g.base);               // neck
  p.vline(7, 5, 9, g.shade);
  p.rect(6, 3, 3, 3, g.light);             // head
  p.hline(9, 10, 4, '#E2B54A');            // bill
  p.px(7, 4, PIGMENT.ink);
  p.hline(2, 4, 2 + 0, '#FFFFFF');
  p.px(3, 7, '#2F3540'); p.px(4, 8, '#2F3540');
  if (frame % 2) p.px(4, 14, g.dark);
  p.outline();
  return done(p, 5, 19);
}

/** A carved stone arch at the Thicket's mouth. */
function arch({ }) {
  const p = new Pix(34, 30);
  const s = ramp(PIGMENT.stoneWarm);
  p.rect(1, 8, 6, 22, s.base); p.rect(27, 8, 6, 22, s.base);
  p.rect(1, 8, 6, 2, s.light); p.rect(27, 8, 6, 2, s.light);
  p.vline(6, 10, 29, s.shade); p.vline(32, 10, 29, s.shade);
  // the span
  for (let x = 5; x <= 29; x += 1) {
    const t = (x - 17) / 12;
    const y = 8 - Math.round(6 * (1 - t * t));
    p.rect(x, y, 1, 5, (x % 4 === 0) ? s.shade : s.base);
    p.px(x, y, s.light);
  }
  // carved marks: the tongues learned from
  for (let i = 0; i < 5; i += 1) { p.px(10 + i * 3, 5, s.dark); p.px(11 + i * 3, 6, s.dark); }
  p.outline();
  return done(p, 17, 29);
}

/** A low root shrine: two uprights, a lintel, a lamp. */
function shrine({ lit = true }) {
  const p = new Pix(20, 20);
  const s = ramp(PIGMENT.stone);
  const t = ramp(PIGMENT.trunk);
  p.rect(2, 8, 3, 11, s.base); p.rect(15, 8, 3, 11, s.base);
  p.rect(1, 5, 18, 3, s.light); p.hline(1, 18, 8, s.shade);
  p.rect(7, 12, 6, 7, t.dark);
  p.rect(8, 13, 4, 4, lit ? PIGMENT.lantern : '#5C5142');
  if (lit) p.px(9, 14, '#FFF1C8');
  p.rect(0, 19, 20, 1, s.dark);
  p.outline();
  return done(p, 10, 19);
}

/** A wooden arbour with vines over it. */
function arbour({ }) {
  const p = new Pix(30, 22);
  const t = ramp(PIGMENT.timber);
  const v = ramp(PIGMENT.vine);
  p.rect(2, 6, 2, 16, t.base); p.rect(26, 6, 2, 16, t.base);
  p.rect(1, 4, 28, 2, t.shade);
  for (let x = 3; x < 28; x += 4) p.rect(x, 2, 2, 3, t.base);
  const r = rng('arbour');
  for (let i = 0; i < 26; i += 1) {
    const x = 2 + Math.floor(r() * 26), y = 1 + Math.floor(r() * 6);
    p.px(x, y, r() > 0.5 ? v.base : v.light);
    if (r() > 0.6) p.px(x, y + 1, v.shade);
  }
  for (let i = 0; i < 8; i += 1) { const y = 7 + Math.floor(r() * 12); p.px(3, y, v.base); p.px(27, y, v.base); }
  p.outline();
  return done(p, 15, 21);
}

/** A market stall with a striped awning — the Quarter's square. */
function stall({ colour = 0 }) {
  const p = new Pix(20, 16);
  const t = ramp(PIGMENT.timber);
  const cloth = [['#C6533A', '#EFE3D0'], ['#3E7FA8', '#EFE3D0'], ['#6E8F4E', '#F2E9D4']][colour % 3];
  p.vline(1, 5, 15, t.dark); p.vline(18, 5, 15, t.dark);
  for (let x = 0; x < 20; x += 1) p.rect(x, 3, 1, 3, (Math.floor(x / 2) % 2) ? cloth[0] : cloth[1]);
  p.rect(0, 6, 20, 1, t.shade);
  p.rect(3, 10, 14, 5, t.base);
  p.rect(3, 10, 14, 1, t.light);
  p.px(6, 12, PIGMENT.gold); p.px(9, 12, '#C6533A'); p.px(12, 12, '#6E8F4E');
  p.outline();
  return done(p, 10, 15);
}

/** A stone well, the heart of a square. */
function well({ }) {
  const p = new Pix(16, 18);
  const s = ramp(PIGMENT.stone);
  const t = ramp(PIGMENT.timber);
  p.rect(2, 11, 12, 6, s.base);
  for (let y = 11; y < 17; y += 2) for (let x = 2; x < 14; x += 3) p.px(x + ((y / 2) % 2), y, s.shade);
  p.rect(2, 10, 12, 2, s.light);
  p.rect(4, 11, 8, 2, '#2A3A4E');
  p.vline(3, 2, 10, t.base); p.vline(12, 2, 10, t.base);
  p.rect(2, 0, 12, 3, '#8A5A3E'); p.rect(2, 0, 12, 1, '#A9713F');
  p.rect(7, 4, 2, 3, t.dark);
  p.outline();
  return done(p, 8, 17);
}

/** A villager: a small figure that walks the paths once the valley lives. */
function villager({ frame = 0, colour = 0 }) {
  const p = new Pix(7, 12);
  const shirts = ['#C6533A', '#3E7FA8', '#6E8F4E', '#8A6C9C', '#C9A24B'];
  const shirt = shirts[colour % shirts.length];
  p.rect(2, 1, 3, 3, '#E8C49A');           // head
  p.px(3, 2, PIGMENT.ink);
  p.rect(2, 4, 3, 4, shirt);
  p.px(1, 5, shirt); p.px(5, 5, shirt);
  const step = frame % 4;
  const a = step === 1 ? 1 : step === 3 ? -1 : 0;
  p.vline(2 + (a > 0 ? -1 : 0), 8, 10, '#4A3B2E');
  p.vline(4 + (a < 0 ? 1 : 0), 8, 10, '#4A3B2E');
  p.px(2, 11, '#2F2A22'); p.px(4, 11, '#2F2A22');
  p.outline();
  return done(p, 3, 11);
}

/** A paved stone path tile, laid when the valley's paths are stoned. */
function paving({ w = 16, seed = 'p' }) {
  const p = new Pix(w, 6);
  const s = ramp(PIGMENT.stoneWarm);
  const r = rng(`paving:${seed}:${w}`);
  for (let y = 0; y < 6; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const cell = Math.floor(x / 4) + Math.floor(y / 3) * 7;
      const n = rng(`pv${seed}${cell}`)();
      p.px(x, y, n > 0.66 ? s.light : n < 0.33 ? s.shade : s.base);
    }
  }
  for (let x = 0; x < w; x += 4) p.vline(x + (r() > 0.5 ? 0 : 1), 0, 5, s.dark);
  p.hline(0, w - 1, 3, s.dark);
  return done(p, Math.floor(w / 2), 5);
}

/** An arched stone bridge, replacing the plank crossing. */
function stoneBridge({ w = 26 }) {
  const p = new Pix(w, 14);
  const s = ramp(PIGMENT.stoneWarm);
  p.rect(0, 4, w, 5, s.base);
  p.rect(0, 3, w, 2, s.light);
  for (let x = 0; x < w; x += 4) p.vline(x, 4, 8, s.shade);
  const cx = Math.floor(w / 2);
  for (let x = 0; x < w; x += 1) {
    const t = (x - cx) / (w / 2);
    const y = 9 + Math.round(4 * (1 - t * t));
    for (let yy = 9; yy < y; yy += 1) p.px(x, yy, s.shade);
  }
  for (let x = 1; x < w; x += 6) { p.vline(x, 0, 3, s.base); p.px(x, 0, s.light); }
  p.rect(0, 2, w, 1, s.dark);
  p.outline();
  return done(p, cx, 8);
}

/* ------------------------------------------------------------------ */
/* Creatures that arrive as the valley grows                           */
/* ------------------------------------------------------------------ */

/** A deer at the edge of the Rootwood: comes out once the wood is old. */
function deer({ frame = 0, stag = false }) {
  const p = new Pix(14, 14);
  const c = ramp('#A2734A');
  const legY = frame % 2 ? 0 : 1;
  p.vline(3, 9, 13 - legY, c.dark);
  p.vline(5, 9, 13, c.dark);
  p.vline(9, 9, 13, c.dark);
  p.vline(11, 9, 13 - (1 - legY), c.dark);
  p.rect(2, 5, 11, 5, c.base);
  p.rect(2, 5, 11, 1, c.light);
  p.rect(2, 9, 11, 1, c.shade);
  p.rect(10, 2, 3, 4, c.base);          // neck
  p.rect(10, 1, 4, 3, c.light);         // head
  p.px(13, 2, PIGMENT.ink);
  p.px(1, 6, c.light);                  // tail
  if (stag) {
    p.px(10, 0, '#6E5233'); p.px(9, -0 + 0, '#6E5233');
    p.vline(11, -0, 0, '#6E5233');
    p.px(12, 0, '#6E5233'); p.px(13, 0, '#6E5233');
  }
  for (let i = 0; i < 4; i += 1) p.px(4 + i * 2, 6 + (i % 2), c.light);  // dapples
  p.outline();
  return done(p, 7, 13);
}

/** A sheep in the Meadow: arrives when whole fields are in bloom. */
function sheep({ frame = 0 }) {
  const p = new Pix(12, 10);
  const w = ramp('#F2EEE4');
  p.vline(3, 7, 9 - (frame % 2), '#5B4A3A');
  p.vline(8, 7, 9, '#5B4A3A');
  p.blob(6, 5, 5, 3, w.base, rng('sheep'), 0.3);
  p.blob(5, 4, 4, 2, w.light, rng('sheep2'), 0.35);
  p.rect(9, 3, 3, 3, '#3D3630');        // head
  p.px(11, 4, '#F2EEE4');
  p.px(10, 4, PIGMENT.ink);
  p.outline();
  return done(p, 6, 9);
}

/** A duck on the Mirror Pond. */
function duck({ frame = 0, drake = false }) {
  const p = new Pix(9, 7);
  const body = drake ? ramp('#5E6B54') : ramp('#B8A98E');
  p.blob(4, 4, 3, 2, body.base, rng('duck'), 0.2);
  p.px(1, 4, body.light);                // tail
  p.rect(6, 1, 2, 3, drake ? '#2F5540' : body.shade);   // neck + head
  p.px(7, 1, drake ? '#3C6B4E' : body.light);
  p.px(8, 2, '#E2A33A');                 // bill
  p.px(7, 2, PIGMENT.ink);
  if (frame % 2) p.px(2, 5, body.shade);
  p.outline();
  return done(p, 4, 6);
}

/** The dog that shows up once the Hearth has a proper door. */
function dog({ frame = 0 }) {
  const p = new Pix(11, 9);
  const c = ramp('#C08C50');
  p.vline(3, 6, 8, c.dark);
  p.vline(7, 6, 8 - (frame % 2), c.dark);
  p.rect(2, 3, 7, 4, c.base);
  p.rect(2, 3, 7, 1, c.light);
  p.rect(8, 1, 3, 3, c.base);            // head
  p.px(10, 2, PIGMENT.ink);
  p.px(8, 0, c.dark); p.px(10, 0, c.dark);  // ears
  p.vline(1, 2 + (frame % 2), 4, c.shade);  // tail
  p.outline();
  return done(p, 5, 8);
}

/* ------------------------------------------------------------------ */
/* Wick — the companion                                                */
/* ------------------------------------------------------------------ */

/**
 * Wick, the lamp-keeper: a small charcoal cat with a cream chest, amber
 * eyes and a brass lantern he never puts down for long. He is the one
 * character in the valley drawn at a size you can read an expression on
 * (20x20 rather than the 9x7 background cat), because he is the only one
 * who ever speaks.
 *
 * Poses: 'sit' (at rest, tail curled), 'look' (chin up, ears forward),
 * 'walk' (legs alternate with frame). `lamp` places the lantern beside
 * him and `lit` decides whether it is burning — the whole first
 * experience turns on that one flame.
 */
function wick({ pose = 'sit', frame = 0, lamp = true, lit = true, blink = false }) {
  const p = new Pix(26, 22);
  const c = ramp('#4A4550');          // charcoal fur
  const cream = ramp('#EFE3CA');      // chest, muzzle, paws, tail tip
  const up = pose === 'look';
  const top = up ? 1 : 2;             // where the head starts

  /* Tail — sweeps out right and curls up, cream at the tip. */
  const curl = up ? 1 : 0;
  p.rect(19, 17, 3, 2, c.base);
  p.rect(21, 15, 2, 3, c.base);
  p.rect(22, 12 - curl, 2, 4, c.base);
  p.rect(21, 10 - curl, 2, 2, cream.base);
  p.px(21, 10 - curl, cream.light);

  /* Body — shoulders narrow, seat wide. */
  p.rect(11, top + 9, 9, 4, c.base);
  p.rect(10, top + 12, 11, 5, c.base);
  p.rect(10, top + 12, 11, 1, mix(c.base, c.light, 0.5));
  p.rect(10, top + 16, 11, 1, c.shade);
  p.px(10, top + 12, c.shade); p.px(20, top + 12, c.shade);
  /* Chest blaze */
  p.rect(13, top + 11, 5, 6, cream.base);
  p.rect(13, top + 11, 5, 1, cream.light);
  p.px(13, top + 16, cream.shade); p.px(17, top + 16, cream.shade);

  /* Front paws — they alternate only when he walks. */
  const lift = pose === 'walk' ? (frame % 2) : 0;
  p.rect(11, top + 16 - lift, 2, 2, cream.base);
  p.rect(18, top + 16 - (pose === 'walk' ? 1 - lift : 0), 2, 2, cream.base);

  /* Ears — separated by a gap of sky, so they read as ears. */
  for (const ex of [10, 17]) {
    p.rect(ex, top + 1, 3, 1, c.base);
    p.px(ex + (ex === 10 ? 1 : 1), top, c.base);
    p.px(ex + 1, top + 1, '#96707A');
  }

  /* Head — a rounded box under the ears. */
  p.rect(10, top + 2, 10, 8, c.base);
  p.px(10, top + 2, c.shade); p.px(19, top + 2, c.shade);
  p.px(10, top + 9, c.shade); p.px(19, top + 9, c.shade);

  /* Eyes — amber, a pupil, a catch-light. */
  const ey = top + 5;
  if (blink) { p.rect(12, ey + 1, 2, 1, c.dark); p.rect(16, ey + 1, 2, 1, c.dark); }
  else {
    p.rect(12, ey, 2, 2, '#F2C14E'); p.rect(16, ey, 2, 2, '#F2C14E');
    p.px(13, ey, '#2A2230'); p.px(13, ey + 1, '#2A2230');
    p.px(16, ey, '#2A2230'); p.px(16, ey + 1, '#2A2230');
    p.px(12, ey, '#FFF3CF'); p.px(17, ey, '#FFF3CF');
  }

  /* Muzzle — a pink nose over a cream chin. */
  p.px(14, top + 7, '#C58B90'); p.px(15, top + 7, '#C58B90');
  p.rect(13, top + 8, 4, 1, cream.base);
  p.px(13, top + 8, c.base); p.px(16, top + 8, c.base);
  /* Whiskers */
  p.px(9, top + 7, cream.shade); p.px(20, top + 7, cream.shade);

  /* The lantern he keeps. */
  if (lamp) {
    const t = ramp(PIGMENT.timber);
    p.vline(4, 9, 19, t.dark); p.vline(3, 9, 19, t.base);
    p.rect(2, 19, 4, 2, t.shade);
    p.rect(1, 3, 6, 6, lit ? '#A8813E' : '#6E6152');
    p.rect(2, 4, 4, 4, lit ? PIGMENT.lantern : '#7C6A52');
    p.rect(3, 5, 2, 2, lit ? '#FFF6D8' : '#8E7C62');
    p.rect(2, 2, 4, 1, t.dark); p.px(4, 1, t.dark);
  }

  p.outline();
  return done(p, 15, 20);
}

/** A short plank dock, walking out over the shallows. */
function dock({ w = 22, h = 9 }) {
  const p = new Pix(w, h + 6);
  const t = ramp(PIGMENT.timber);
  // Posts first, in the water.
  for (let x = 2; x < w - 1; x += 6) { p.vline(x, h - 1, h + 5, t.dark); p.px(x + 1, h + 2, t.shade); }
  // Planks running out from the shore.
  for (let y = 0; y < h; y += 1) {
    const c = y % 3 === 0 ? t.light : y % 3 === 1 ? t.base : t.shade;
    p.hline(0, w - 1, y, c);
  }
  p.hline(0, w - 1, 0, t.light);
  p.hline(0, w - 1, h - 1, t.dark);
  for (let x = 0; x < w; x += 4) p.vline(x, 0, h - 1, mix(t.base, t.dark, 0.35));
  p.outline();
  return done(p, Math.floor(w / 2), h - 1);
}

const RECIPES = {
  tree, flower, flowerPatch, grassTuft, bush, bramble, rock, stump, lilypad, reeds,
  cottage, tower, workshop, lantern, signpost, bridge, fence, terraceWall,
  koi, butterfly, bird, cat, catSmall, cloud, rootStone, marker, puff, wick, dock,
  hive, heron, arch, shrine, arbour, stall, well, villager, paving, stoneBridge,
  deer, sheep, duck, dog,
};

export const RECIPE_NAMES = Object.freeze(Object.keys(RECIPES));
