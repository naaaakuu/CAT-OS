/**
 * art.js — the village's illustrated sprite factory.
 *
 * Nothing in the village is an image asset. Every building, person, animal,
 * tree and prop is DRAWN here with the canvas path API — rounded forms, one
 * light from the upper left, a soft ground shadow under everything, a
 * slightly darker outline so it reads at a glance on a phone — into a small
 * canvas the first time it is asked for, then cached by recipe.
 *
 * The style is deliberate: warm, round, readable, a little bit 3D. Not
 * pixel art, not a stock illustration set. The same hand draws the map,
 * the sheets and the icons, which is what makes it one product.
 *
 * Every recipe is a pure function of its parameters and a seed, so the
 * same tree has the same lean forever. Sprites are drawn at `SCALE`
 * canvas pixels per world unit and the renderer scales them smoothly.
 */

import { rng, mix } from '../world/engine/palette.js';

export const SCALE = 2;

/* ------------------------------------------------------------------ */
/* The village palette                                                 */
/* ------------------------------------------------------------------ */

export const PAL = Object.freeze({
  grass: '#8DC85F', grassLight: '#A8DB78', grassDark: '#6FAE49', grassDeep: '#5A9A3C',
  path: '#E7CB93', pathEdge: '#CDA86E', earth: '#B98B58', soil: '#8A6240', soilLight: '#A97C52',
  water: '#5CB6E7', waterDeep: '#3A91C8', waterLight: '#A3DCF4', sand: '#EBD9A6',
  cream: '#F7E9CB', creamShade: '#DCC49C', white: '#FBF5E8', plaster: '#F2E2C4',
  wood: '#B57B48', woodDark: '#7F5331', woodLight: '#D6A067', timber: '#6B4630',
  roofRed: '#DB6543', roofBlue: '#5C8FBB', roofGreen: '#5DA76A', roofPlum: '#8E6DB8', roofSlate: '#7C8797', roofGold: '#E5B84A', roofTeal: '#4EA7A0',
  stone: '#B9B6AE', stoneDark: '#8E8B84', stoneLight: '#D8D5CD',
  leaf: '#5EB65A', leafLight: '#8AD57A', leafDark: '#3D8D45', pine: '#3F8E6B', pineLight: '#67B48A', pineDark: '#2E6E52', autumn: '#E0913F',
  glass: '#BFE4F5', glassNight: '#FFD98A', glow: '#FFD27A',
  iron: '#4B4A55', copper: '#C9803E', copperLight: '#E9A96A',
  outline: '#2B2438',
  coin: '#F3C447', coinDark: '#C7901E', coinLight: '#FFE79A',
  page: '#FBF4E3', pageLine: '#B9AE96', bloom: '#F26D8D', bloomLight: '#FFA8BC', root: '#B2713F', rootLight: '#D9A16D', thread: '#8E6DB8', threadLight: '#C4A6E8',
  wick: '#3D3A47', wickLight: '#5B5768', wickEye: '#F2C14E',
});

export const FLOWERS = Object.freeze(['#F26D7D', '#F6C445', '#FFFFFF', '#A785DD', '#FF9A5C', '#7FD3F0', '#F2A6C6']);
export const SKINS = Object.freeze(['#F5CBA7', '#E8B48F', '#D19A73', '#B57A55', '#8D5B3B', '#6E4530']);
export const HAIRS = Object.freeze(['#2B2222', '#4A2E1F', '#7A4A2A', '#B86F3A', '#D9B26B', '#B9B0A6', '#1E1B1B']);
export const CLOTHES = Object.freeze(['#D9603F', '#5FA36B', '#5C8FBB', '#8E6DB8', '#F6C445', '#4EA7A0', '#E08B6A', '#7C8797']);

/* ------------------------------------------------------------------ */
/* Drawing helpers                                                     */
/* ------------------------------------------------------------------ */

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}

const dark = (c, t = 0.3) => mix(c, PAL.outline, t);
const light = (c, t = 0.22) => mix(c, '#FFFFFF', t);

/** A tiny brush over a scaled context: paths in world units. */
class Brush {
  constructor(ctx) { this.c = ctx; }
  rr(x, y, w, h, r = 3) {
    const c = this.c; r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); return this;
  }
  /** A rounded rect with a bigger radius at the top: an arched door. */
  arch(x, y, w, h) {
    const c = this.c, r = w / 2;
    c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + r); c.arc(x + r, y + r, r, Math.PI, 0); c.lineTo(x + w, y + h); c.closePath(); return this;
  }
  ell(cx, cy, rx, ry) { this.c.beginPath(); this.c.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); this.c.closePath(); return this; }
  circ(cx, cy, r) { return this.ell(cx, cy, r, r); }
  poly(pts) { const c = this.c; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); return this; }
  line(pts) { const c = this.c; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); return this; }
  fill(color) { this.c.fillStyle = color; this.c.fill(); return this; }
  stroke(color, w = 1) { const c = this.c; c.strokeStyle = color; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); return this; }
  vgrad(y0, y1, stops) { const g = this.c.createLinearGradient(0, y0, 0, y1); for (const [t, col] of stops) g.addColorStop(t, col); return g; }
  hgrad(x0, x1, stops) { const g = this.c.createLinearGradient(x0, 0, x1, 0); for (const [t, col] of stops) g.addColorStop(t, col); return g; }
  /** Fill the current path lit from above, then outline it. */
  shade(color, y0, y1, { lt = 0.2, dk = 0.18, outline = true, ow = 0.9, oc } = {}) {
    this.c.fillStyle = this.vgrad(y0, y1, [[0, light(color, lt)], [0.5, color], [1, mix(color, '#000000', dk)]]);
    this.c.fill();
    if (outline) this.stroke(oc ?? dark(color, 0.32), ow);
    return this;
  }
  /** A flat fill with an outline. */
  solid(color, { outline = true, ow = 0.9, oc } = {}) { this.fill(color); if (outline) this.stroke(oc ?? dark(color, 0.32), ow); return this; }
  /** Soft ground shadow. */
  shadow(cx, cy, rx, ry, a = 0.2) {
    const c = this.c; c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(30,40,20,${a})`); g.addColorStop(0.62, `rgba(30,40,20,${a * 0.55})`); g.addColorStop(1, 'rgba(30,40,20,0)');
    c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore(); return this;
  }
  /** A specular highlight: a soft white ellipse. */
  gleam(cx, cy, rx, ry, a = 0.35) {
    const c = this.c; c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore(); return this;
  }
  glow(cx, cy, r, color = PAL.glow, a = 0.5) {
    const c = this.c; const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, hexA(color, a)); g.addColorStop(1, hexA(color, 0));
    c.fillStyle = g; c.fillRect(cx - r, cy - r, r * 2, r * 2); return this;
  }
}

export function hexA(hex, a) {
  const n = parseInt(String(hex).slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ------------------------------------------------------------------ */
/* Cache                                                               */
/* ------------------------------------------------------------------ */

const cache = new Map();
const urlCache = new Map();

/**
 * @returns {{canvas, w, h, ax, ay, scale, at}} a cached sprite. w/h/ax/ay
 * are in world units; the canvas is w*scale by h*scale. `at(scale, flip)`
 * returns the same recipe rendered at another scale (the renderer asks
 * for the exact device scale, so a sprite is blitted 1:1 and never
 * resampled), mirrored if asked.
 *
 * `params.flip` mirrors the drawing; it is part of the cache key, so a
 * villager walking left is a second small canvas, not a transform.
 */
export function art(name, params = {}, scale = SCALE) {
  const key = `${name}|${JSON.stringify(params)}|${scale}`;
  let s = cache.get(key);
  if (s) return s;
  const recipe = RECIPES[name];
  if (!recipe) throw new Error(`no art recipe "${name}"`);
  const spec = recipe(params);
  const canvas = makeCanvas(spec.w * scale, spec.h * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  if (params.flip) { ctx.translate(spec.w, 0); ctx.scale(-1, 1); }
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  spec.draw(new Brush(ctx), ctx);
  // The hour's light, baked in: a wash of the tint over everything opaque.
  if (params.tint) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = params.tint;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
  }
  s = {
    canvas, w: spec.w, h: spec.h, ax: params.flip ? spec.w - spec.ax : spec.ax, ay: spec.ay, scale, name, params,
    at(sc, flip = false, tint = null) {
      if (sc === scale && !!params.flip === !!flip && (params.tint ?? null) === tint) return s;
      const q = { ...params };
      if (flip) q.flip = true; else delete q.flip;
      if (tint) q.tint = tint; else delete q.tint;
      return art(name, q, sc);
    },
  };
  cache.set(key, s);
  return s;
}

/**
 * Drop the big cached canvases rendered at scales the camera no longer
 * uses. Small ones (icons, portraits) are cheap and stay.
 */
export function pruneArt(keep) {
  for (const [key, s] of cache) {
    if (keep.has(s.scale)) continue;
    if (s.canvas.width * s.canvas.height < 4096) continue;
    cache.delete(key);
  }
}

/** A sprite as a data URL, for the interface. */
export function artURL(name, params = {}, scale = 4) {
  const key = `${name}|${JSON.stringify(params)}|${scale}`;
  let u = urlCache.get(key);
  if (u) return u;
  u = art(name, params, scale).canvas.toDataURL('image/png');
  urlCache.set(key, u);
  return u;
}

/** An <img> of a recipe, sized to a CSS box. */
export function artIMG(name, params = {}, { size = 24, className = '', alt = '' } = {}) {
  let s;
  try { s = art(name, params, 1); } catch { return ''; }
  const scale = Math.max(2, Math.min(6, Math.ceil((size * 2) / Math.max(s.w, s.h))));
  const url = artURL(name, params, scale);
  const k = size / Math.max(s.w, s.h);
  return `<img class="ico ${className}" src="${url}" width="${Math.round(s.w * k)}" height="${Math.round(s.h * k)}" alt="${alt}"${alt ? '' : ' aria-hidden="true"'} draggable="false">`;
}

/* ------------------------------------------------------------------ */
/* Nature                                                              */
/* ------------------------------------------------------------------ */

function tree({ kind = 'round', size = 1, seed = 't', tone = 0, autumn = false, lean = 0 }) {
  const r = rng(`tree:${seed}`);
  const R = 15 * size;
  // A breeze: the crown leans a degree or so either way, drawn as its own
  // sprite so a swaying tree is still a whole-pixel blit.
  const tilt = lean * 0.026;
  if (kind === 'pine') {
    const H = R * 3.1, W = R * 2.2;
    const w = W + 6, h = H + 12;
    return {
      w, h, ax: w / 2, ay: h - 4,
      draw(d, c) {
        const cx = w / 2, ground = h - 4;
        d.shadow(cx, ground, R * 0.9, R * 0.35, 0.22);
        d.rr(cx - R * 0.18, ground - R * 0.9, R * 0.36, R * 0.95, 2).solid(PAL.woodDark);
        if (tilt) { c.translate(cx, ground - R * 0.5); c.rotate(tilt); c.translate(-cx, -(ground - R * 0.5)); }
        const base = tone ? mix(PAL.pine, PAL.leaf, 0.35) : PAL.pine;
        const tiers = [[ground - R * 0.55, W / 2 + R * 0.15, R * 1.25], [ground - R * 1.3, W * 0.45, R * 1.2], [ground - R * 2.0, W * 0.34, R * 1.15]];
        const pts = (yb, hw, th) => [[cx - hw, yb], [cx - hw * 0.15, yb - th * 0.1], [cx, yb - th], [cx + hw * 0.15, yb - th * 0.1], [cx + hw, yb]];
        for (const [yb, hw, th] of tiers) d.poly(pts(yb, hw + 0.9, th + 1)).fill(dark(base, 0.35));
        for (const [yb, hw, th] of tiers) { d.poly(pts(yb, hw, th)); d.c.fillStyle = d.vgrad(yb - th, yb, [[0, light(base, 0.28)], [0.6, base], [1, mix(base, '#000', 0.16)]]); d.c.fill(); }
        for (const [yb, hw, th] of tiers) d.poly([[cx - hw * 0.5, yb - th * 0.35], [cx - hw * 0.1, yb - th * 0.85], [cx, yb - th], [cx - hw * 0.35, yb - th * 0.3]]).fill(hexA('#FFFFFF', 0.16));
        d.circ(cx, ground - H + 1, 1.4).fill(light(base, 0.35));
      },
    };
  }
  // A round broadleaf: three lobes and a top, one silhouette.
  const off = (r() - 0.5) * 3;
  const w = R * 2.7 + 8, h = R * 2.6 + 14;
  const base = autumn ? [PAL.autumn, '#D9603F', '#E5B84A'][Math.floor(r() * 3)] : tone === 1 ? mix(PAL.leaf, PAL.pine, 0.4) : tone === 2 ? mix(PAL.leaf, '#9ED45A', 0.35) : PAL.leaf;
  const lobes = [
    [w / 2 - R * 0.62 + off, h - 10 - R * 1.05, R * 0.78],
    [w / 2 + R * 0.6 + off, h - 10 - R * 1.0, R * 0.82],
    [w / 2 + off * 0.5, h - 10 - R * 1.25, R * 0.95],
    [w / 2 + R * 0.05 + off, h - 10 - R * 1.85, R * 0.7],
  ];
  return {
    w, h, ax: w / 2, ay: h - 4,
    draw(d, c) {
      const cx = w / 2, ground = h - 4;
      d.shadow(cx, ground, R * 1.05, R * 0.38, 0.22);
      d.rr(cx - R * 0.16, ground - R * 1.1, R * 0.32, R * 1.15, 2).solid(PAL.woodDark);
      d.rr(cx - R * 0.16 + 1, ground - R * 1.0, R * 0.1, R * 0.8, 1).fill(hexA('#FFFFFF', 0.14));
      if (tilt) { c.translate(cx, ground - R * 0.9); c.rotate(tilt); c.translate(-cx, -(ground - R * 0.9)); }
      for (const [x, y, rr] of lobes) d.circ(x, y, rr + 1).fill(dark(base, 0.38));
      for (const [x, y, rr] of lobes) { d.circ(x, y, rr); d.c.fillStyle = d.vgrad(y - rr, y + rr, [[0, light(base, 0.3)], [0.55, base], [1, mix(base, '#1A3A20', 0.28)]]); d.c.fill(); }
      d.gleam(cx - R * 0.35 + off, ground - R * 1.9, R * 0.55, R * 0.4, 0.3);
      d.gleam(cx + R * 0.45 + off, ground - R * 1.2, R * 0.35, R * 0.28, 0.16);
      if (autumn) for (let i = 0; i < 4; i += 1) d.circ(cx + (r() - 0.5) * R * 1.6, ground - R * 0.9 - r() * R, 1.3).fill(hexA('#FFF3C4', 0.6));
    },
  };
}

function bush({ seed = 'b', size = 1, berries = false, flowers = false }) {
  const r = rng(`bush:${seed}`);
  const R = 8 * size;
  const w = R * 2.8 + 6, h = R * 1.9 + 6;
  const lobes = [[w / 2 - R * 0.7, h - 4 - R * 0.6, R * 0.72], [w / 2 + R * 0.65, h - 4 - R * 0.62, R * 0.78], [w / 2, h - 4 - R * 0.95, R * 0.9]];
  return {
    w, h, ax: w / 2, ay: h - 3,
    draw(d) {
      d.shadow(w / 2, h - 3, R * 1.1, R * 0.35, 0.18);
      for (const [x, y, rr] of lobes) d.circ(x, y, rr + 0.9).fill(dark(PAL.leaf, 0.38));
      for (const [x, y, rr] of lobes) { d.circ(x, y, rr); d.c.fillStyle = d.vgrad(y - rr, y + rr, [[0, light(PAL.leaf, 0.28)], [1, mix(PAL.leaf, '#1A3A20', 0.24)]]); d.c.fill(); }
      d.gleam(w / 2 - R * 0.3, h - 4 - R * 1.3, R * 0.5, R * 0.35, 0.28);
      if (berries) for (let i = 0; i < 5; i += 1) d.circ(w / 2 + (r() - 0.5) * R * 1.8, h - 4 - R * 0.5 - r() * R * 0.9, 1.3).solid('#D9414E', { ow: 0.6 });
      if (flowers) for (let i = 0; i < 4; i += 1) d.circ(w / 2 + (r() - 0.5) * R * 1.8, h - 4 - R * 0.5 - r() * R * 0.9, 1.6).solid(FLOWERS[i % FLOWERS.length], { ow: 0.5 });
    },
  };
}

function flower({ color = 0, seed = 'f', size = 1 }) {
  const w = 9 * size, h = 12 * size;
  const col = FLOWERS[color % FLOWERS.length];
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      const cx = w / 2, cy = 3.6 * size;
      d.line([[cx, h - 1], [cx + 0.4 * size, cy + 2]]).stroke(PAL.leafDark, 1.1 * size);
      d.ell(cx + 2.2 * size, h - 5 * size, 2 * size, 1 * size).fill(PAL.leaf);
      for (let i = 0; i < 5; i += 1) { const a = (i / 5) * Math.PI * 2; d.circ(cx + Math.cos(a) * 2.2 * size, cy + Math.sin(a) * 2.2 * size, 1.7 * size).solid(col, { ow: 0.5, oc: dark(col, 0.25) }); }
      d.circ(cx, cy, 1.3 * size).solid(col === '#F6C445' ? '#FFFFFF' : '#F6C445', { ow: 0.4 });
    },
  };
}

function flowerPatch({ seed = 'fp', n = 5, w = 26, h = 14 }) {
  const r = rng(`fp:${seed}`);
  const spots = Array.from({ length: n }, (_, i) => ({ x: 4 + r() * (w - 8), y: 6 + r() * (h - 8), c: Math.floor(r() * FLOWERS.length), s: 0.7 + r() * 0.4 }));
  spots.sort((a, b) => a.y - b.y);
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      for (const s of spots) {
        const cx = s.x, cy = s.y - 3 * s.s;
        d.line([[cx, s.y + 2], [cx, cy + 1.5]]).stroke(PAL.leafDark, 0.9);
        const col = FLOWERS[s.c];
        for (let i = 0; i < 5; i += 1) { const a = (i / 5) * Math.PI * 2 + 0.3; d.circ(cx + Math.cos(a) * 1.6 * s.s, cy + Math.sin(a) * 1.6 * s.s, 1.2 * s.s).fill(col); }
        d.circ(cx, cy, 0.9 * s.s).fill(col === '#F6C445' ? '#FFFFFF' : '#F6C445');
      }
    },
  };
}

function grassTuft({ seed = 'g' }) {
  const r = rng(`tuft:${seed}`);
  const w = 10, h = 7;
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      for (let i = 0; i < 4; i += 1) { const x = 2 + i * 2 + r(); d.line([[x, h - 1], [x + (r() - 0.5) * 3, 1 + r() * 2]]).stroke(i % 2 ? PAL.grassDeep : PAL.grassDark, 1.1); }
    },
  };
}

function rock({ seed = 'r', size = 1 }) {
  const r = rng(`rock:${seed}`);
  const W = 12 * size, H = 8 * size;
  const w = W + 4, h = H + 5;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      d.shadow(w / 2, h - 2, W * 0.55, H * 0.3, 0.18);
      const pts = []; const n = 7;
      for (let i = 0; i < n; i += 1) { const a = (i / n) * Math.PI * 2; const rr = 0.85 + r() * 0.3; pts.push([w / 2 + Math.cos(a) * W * 0.5 * rr, h - 2 - H * 0.55 + Math.sin(a) * H * 0.5 * rr]); }
      d.poly(pts).shade(PAL.stone, h - 2 - H, h - 2, { lt: 0.25, dk: 0.25 });
      d.gleam(w / 2 - W * 0.15, h - 2 - H * 0.75, W * 0.3, H * 0.25, 0.4);
    },
  };
}

function stump({ seed = 's' }) {
  const w = 16, h = 14;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      d.shadow(w / 2, h - 2, 7, 2.5, 0.18);
      d.rr(3, 4, 10, 8, 2).shade(PAL.wood, 4, 12);
      d.ell(8, 4.5, 5.2, 2.6).solid(PAL.woodLight);
      d.ell(8, 4.5, 3, 1.4).stroke(dark(PAL.woodLight, 0.2), 0.6);
      d.ell(8, 4.5, 1.2, 0.6).stroke(dark(PAL.woodLight, 0.2), 0.6);
    },
  };
}

function hay({ seed = 'h' }) {
  const w = 18, h = 13;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      d.shadow(w / 2, h - 2, 8, 2.5, 0.18);
      d.rr(2, 1, 14, 10, 3).shade('#E2B95A', 1, 11, { lt: 0.25 });
      for (let i = 0; i < 3; i += 1) d.line([[4, 3.5 + i * 2.6], [14, 3.5 + i * 2.6]]).stroke(hexA('#8A6A20', 0.35), 0.7);
      d.line([[6, 1], [6, 11]]).stroke(hexA('#6B4E1B', 0.4), 0.8);
      d.line([[12, 1], [12, 11]]).stroke(hexA('#6B4E1B', 0.4), 0.8);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

function fence({ w = 40, gate = false }) {
  const h = 16;
  return {
    w: w + 4, h, ax: (w + 4) / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      const posts = Math.max(2, Math.round(w / 13) + 1);
      const step = w / (posts - 1);
      d.rr(2, ground - 9.5, w, 2.2, 1).solid(PAL.woodLight, { ow: 0.7 });
      d.rr(2, ground - 5, w, 2.2, 1).solid(PAL.woodLight, { ow: 0.7 });
      for (let i = 0; i < posts; i += 1) {
        const x = 2 + i * step;
        d.shadow(x, ground, 2.4, 1, 0.16);
        d.rr(x - 1.6, ground - 12, 3.2, 12, 1.2).shade(PAL.woodLight, ground - 12, ground, { lt: 0.18, dk: 0.2 });
      }
      if (gate) { d.line([[w / 2 - 5, ground - 4], [w / 2 + 6, ground - 10]]).stroke(PAL.woodDark, 1.2); }
    },
  };
}

function signpost({ text = '', arrows = 1 }) {
  const w = 24, h = 26;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow(w / 2, ground, 4, 1.5, 0.16);
      d.rr(w / 2 - 1.5, ground - 18, 3, 18, 1).shade(PAL.woodDark, ground - 18, ground);
      for (let i = 0; i < arrows; i += 1) {
        const y = 4 + i * 7;
        d.poly(i % 2 ? [[3, y], [17, y], [21, y + 2.5], [17, y + 5], [3, y + 5]] : [[7, y], [21, y], [21, y + 5], [7, y + 5], [3, y + 2.5]]).shade(PAL.woodLight, y, y + 5);
        d.line([[i % 2 ? 6 : 9, y + 2.5], [i % 2 ? 15 : 18, y + 2.5]]).stroke(hexA(PAL.timber, 0.5), 0.9);
      }
    },
  };
}

function board({ w = 26, lines = 2, color = PAL.woodLight }) {
  const h = 26;
  return {
    w: w + 4, h, ax: (w + 4) / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow((w + 4) / 2, ground, w * 0.4, 1.5, 0.16);
      d.rr(4, ground - 10, 2.6, 10, 1).solid(PAL.woodDark);
      d.rr(w - 2, ground - 10, 2.6, 10, 1).solid(PAL.woodDark);
      d.rr(2, 2, w, 13, 2.5).shade(color, 2, 15, { lt: 0.2 });
      for (let i = 0; i < lines; i += 1) d.line([[6, 6 + i * 4], [w - 4 - (i % 2) * 5, 6 + i * 4]]).stroke(hexA(PAL.timber, 0.55), 1.2);
    },
  };
}

function lamp({ lit = false }) {
  const w = 12, h = 30;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2, cx = w / 2;
      d.shadow(cx, ground, 3.5, 1.3, 0.18);
      d.rr(cx - 2.5, ground - 3, 5, 3, 1).solid(PAL.iron);
      d.rr(cx - 1, 9, 2, ground - 12, 1).solid(PAL.iron);
      d.rr(cx - 3.2, 3, 6.4, 8, 1.5).solid(lit ? PAL.glassNight : '#C9D6E0', { oc: PAL.iron, ow: 1 });
      d.poly([[cx - 4, 3.2], [cx, 0.5], [cx + 4, 3.2]]).solid(PAL.iron, { ow: 0.6 });
      if (lit) { d.glow(cx, 7, 9, PAL.glow, 0.55); d.circ(cx, 7, 1.6).fill('#FFF8DC'); }
    },
  };
}

function well() {
  const w = 30, h = 34;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2, cx = w / 2;
      d.shadow(cx, ground, 13, 4.5, 0.2);
      d.ell(cx, ground - 5, 11, 5).shade(PAL.stone, ground - 10, ground, { lt: 0.2 });
      d.ell(cx, ground - 8, 11, 5).shade(PAL.stone, ground - 13, ground - 3, { lt: 0.25 });
      d.ell(cx, ground - 8, 7.5, 3.2).solid(PAL.waterDeep, { oc: dark(PAL.stone, 0.4) });
      d.gleam(cx - 2, ground - 9, 3, 1.2, 0.5);
      d.rr(cx - 10, 8, 2.4, ground - 14, 1).solid(PAL.woodDark);
      d.rr(cx + 7.6, 8, 2.4, ground - 14, 1).solid(PAL.woodDark);
      d.poly([[cx - 14, 9], [cx, 1], [cx + 14, 9], [cx + 11, 11], [cx, 4.5], [cx - 11, 11]]).shade(PAL.roofRed, 1, 11);
      d.rr(cx - 0.8, 9, 1.6, ground - 18, 0.6).solid(PAL.iron, { outline: false });
      d.rr(cx - 2.5, ground - 14, 5, 4, 1).solid(PAL.woodLight);
    },
  };
}

function cart({ seed = 'c', load = 'hay' }) {
  const w = 40, h = 26;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow(w / 2, ground, 17, 4.5, 0.2);
      d.rr(6, 8, 26, 11, 2.5).shade(PAL.wood, 8, 19);
      for (let i = 0; i < 3; i += 1) d.line([[9 + i * 8, 9], [9 + i * 8, 18]]).stroke(hexA(PAL.timber, 0.5), 0.8);
      if (load === 'hay') { d.ell(19, 8, 12, 5).shade('#E2B95A', 3, 13, { lt: 0.28 }); d.line([[11, 8], [27, 8]]).stroke(hexA('#8A6A20', 0.3), 0.7); }
      else { for (let i = 0; i < 3; i += 1) d.rr(8 + i * 8, 3 + (i % 2) * 2, 7, 7, 1.5).shade(PAL.woodLight, 3, 10); }
      d.line([[32, 15], [38, 12]]).stroke(PAL.woodDark, 1.6);
      for (const x of [12, 28]) { d.circ(x, ground - 4, 4.6).solid(PAL.woodDark, { oc: PAL.timber, ow: 1 }); d.circ(x, ground - 4, 1.6).fill(PAL.woodLight); d.circ(x, ground - 4, 3.2).stroke(hexA('#000', 0.15), 0.8); }
    },
  };
}

function crate({ seed = 'x', kind = 'crate' }) {
  const w = 14, h = 14;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow(w / 2, ground, 6, 2, 0.18);
      if (kind === 'barrel') {
        d.rr(2.5, 1, 9, 11, 3.5).shade(PAL.wood, 1, 12);
        d.line([[2.5, 4], [11.5, 4]]).stroke(PAL.iron, 1); d.line([[2.5, 9], [11.5, 9]]).stroke(PAL.iron, 1);
      } else if (kind === 'sack') {
        d.rr(2.5, 3, 9, 9, 3.5).shade('#D9C39A', 3, 12);
        d.rr(5, 1, 4, 3.5, 1.5).solid('#C7AE82');
      } else {
        d.rr(2, 2, 10, 10, 1.5).shade(PAL.woodLight, 2, 12);
        d.line([[2, 7], [12, 7]]).stroke(hexA(PAL.timber, 0.55), 0.8);
        d.line([[7, 2], [7, 12]]).stroke(hexA(PAL.timber, 0.55), 0.8);
      }
    },
  };
}

function bench() {
  const w = 22, h = 12;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow(w / 2, ground, 9, 2, 0.16);
      d.rr(3, ground - 7, 2, 7, 0.8).solid(PAL.woodDark);
      d.rr(17, ground - 7, 2, 7, 0.8).solid(PAL.woodDark);
      d.rr(1, ground - 8, 20, 3, 1.2).shade(PAL.woodLight, ground - 8, ground - 5);
    },
  };
}

function beds({ seed = 'bd', w = 40, rows = 3, grown = 1, flowers = false }) {
  const r = rng(`beds:${seed}`);
  const h = 8 + rows * 7;
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      d.rr(1, 1, w - 2, h - 3, 3).shade(PAL.soil, 1, h - 2, { lt: 0.12, dk: 0.16, oc: dark(PAL.soil, 0.35) });
      for (let i = 0; i < rows; i += 1) {
        const y = 5 + i * 7;
        d.line([[4, y], [w - 4, y]]).stroke(hexA('#000', 0.12), 2.2);
        const n = Math.floor((w - 8) / 5);
        for (let k = 0; k < n; k += 1) {
          if (r() > grown) continue;
          const x = 6 + k * 5 + (r() - 0.5);
          if (flowers && k % 2 === 0) { const col = FLOWERS[(i + k) % FLOWERS.length]; d.circ(x, y - 2, 1.7).solid(col, { ow: 0.5 }); d.circ(x, y - 2, 0.7).fill('#FFF2A8'); }
          else { d.line([[x, y + 0.5], [x - 1.4, y - 2.6]]).stroke(PAL.leafDark, 1); d.line([[x, y + 0.5], [x + 1.4, y - 2.8]]).stroke(PAL.leaf, 1); }
        }
      }
    },
  };
}

function hive() {
  const w = 14, h = 16;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow(w / 2, ground, 6, 2, 0.16);
      d.rr(3, ground - 4, 8, 4, 1).solid(PAL.woodDark);
      d.rr(2, 4, 10, ground - 8, 2).shade(PAL.white, 4, ground - 4);
      d.poly([[1, 4.5], [w / 2, 0.8], [w - 1, 4.5]]).shade(PAL.roofRed, 0.8, 4.5);
      d.rr(6, ground - 7, 2, 1.6, 0.5).fill(PAL.iron);
    },
  };
}

function plotSign({ kind = 'sale' }) {
  const w = 22, h = 24;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2, cx = w / 2;
      d.shadow(cx, ground, 4, 1.4, 0.16);
      d.rr(cx - 1.4, ground - 14, 2.8, 14, 1).shade(PAL.woodDark, ground - 14, ground);
      d.rr(2, 2, 18, 10, 2).shade(PAL.woodLight, 2, 12);
      if (kind === 'sale') { d.circ(cx, 7, 3.2).solid(PAL.coin, { oc: PAL.coinDark, ow: 0.8 }); d.circ(cx, 7, 1.2).fill(PAL.coinLight); }
      else { d.line([[6, 5.5], [16, 5.5]]).stroke(hexA(PAL.timber, 0.5), 1.2); d.line([[6, 9], [13, 9]]).stroke(hexA(PAL.timber, 0.5), 1.2); }
    },
  };
}

function scaffold({ w = 70, h = 46, seed = 'sc' }) {
  const r = rng(`scaffold:${seed}`);
  return {
    w: w + 10, h: h + 8, ax: (w + 10) / 2, ay: h + 5,
    draw(d) {
      const ground = h + 5, x0 = 5;
      d.shadow((w + 10) / 2, ground, w * 0.55, 6, 0.18);
      d.rr(x0, ground - 12, w, 12, 2).shade(PAL.stoneLight, ground - 12, ground, { lt: 0.1 });
      for (let i = 0; i < 4; i += 1) { const x = x0 + 6 + i * ((w - 12) / 3); d.rr(x - 1.5, ground - h + 4, 3, h - 4, 1).solid(PAL.woodLight); }
      for (let j = 0; j < 3; j += 1) { const y = ground - h + 10 + j * 12; d.rr(x0 + 2, y, w - 4, 2.4, 1).solid(PAL.woodLight, { ow: 0.6 }); }
      for (let i = 0; i < 5; i += 1) { d.rr(x0 + 6 + i * 12 + r() * 3, ground - 20 - (i % 2) * 4, 9, 6, 1.5).shade(PAL.woodLight, ground - 24, ground - 14); }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Buildings                                                           */
/* ------------------------------------------------------------------ */

/**
 * A house drawn from parts, front-on from a little above: a wall, a roof
 * whose front slope we see, an arched door, windows that glow at night.
 * Every building in the village is this with a few extras.
 */
function house(o) {
  const {
    w = 80, wallH = 34, roofH = 24, wall = PAL.cream, roof = PAL.roofRed, eave = 7,
    door = { x: 0.5, w: 12, h: 18, color: PAL.woodDark }, windows = [], chimney = null, lamp: hasLamp = false,
    boxes = false, sign = null, night = false, dormer = false, banner = null, tower = null, awning = null,
    plinth = true, floors = 1, extras = [], stripes = null, dome = false, glass = false,
  } = o;
  const fullH = wallH * floors;
  const towerH = tower ? tower.h : 0;
  const top = Math.max(fullH + roofH + 14, towerH + 26, dome ? fullH + roofH + 30 : 0);
  const W = w + eave * 2 + 12 + (tower ? tower.w + 4 : 0);
  const H = top + 8;
  const ax = (w + eave * 2 + 12) / 2;
  return {
    w: W, h: H, ax, ay: H - 6,
    draw(d, c) {
      const ground = H - 6;
      const x0 = eave + 6, wallTop = ground - fullH;
      d.shadow(ax, ground, w * 0.62 + eave, 8, 0.22);
      /* wall */
      d.rr(x0, wallTop, w, fullH, 3.5).shade(wall, wallTop, ground, { lt: 0.14, dk: 0.12 });
      if (glass) {
        // A glasshouse: pale panes over the wall.
        for (let i = 0; i < Math.floor(w / 12); i += 1) d.rr(x0 + 3 + i * 12, wallTop + 4, 9, fullH - 8, 1.5).solid(night ? mix(PAL.glass, PAL.glassNight, 0.5) : PAL.glass, { oc: PAL.white, ow: 1.1 });
      }
      if (plinth) d.rr(x0, ground - 5, w, 5, 2).solid(mix(wall, PAL.stoneDark, 0.35), { outline: false });
      if (floors > 1) for (let f = 1; f < floors; f += 1) d.line([[x0 + 2, ground - wallH * f], [x0 + w - 2, ground - wallH * f]]).stroke(hexA(PAL.timber, 0.35), 1.2);
      /* windows */
      for (const wn of windows) {
        const ww = wn.w ?? 10, wh = wn.h ?? 11;
        const wx = x0 + wn.x * w - ww / 2, wy = wallTop + (wn.y ?? 8) + (wn.floor ? wallH * (floors - 1 - wn.floor) : 0);
        d.rr(wx - 1.4, wy - 1.4, ww + 2.8, wh + 2.8, 2.5).solid(PAL.white, { oc: dark(wall, 0.35), ow: 0.8 });
        if (wn.arch) d.arch(wx, wy, ww, wh); else d.rr(wx, wy, ww, wh, 1.5);
        d.solid(night ? PAL.glassNight : PAL.glass, { oc: dark(wall, 0.3), ow: 0.7 });
        d.line([[wx + ww / 2, wy], [wx + ww / 2, wy + wh]]).stroke(hexA(PAL.white, 0.9), 1);
        d.line([[wx, wy + wh / 2], [wx + ww, wy + wh / 2]]).stroke(hexA(PAL.white, 0.9), 1);
        if (!night) d.gleam(wx + ww * 0.3, wy + wh * 0.3, ww * 0.3, wh * 0.25, 0.5);
        if (boxes && !wn.floor) { d.rr(wx - 1.5, wy + wh + 1, ww + 3, 3.5, 1).solid(PAL.woodLight, { ow: 0.7 }); for (let i = 0; i < 4; i += 1) d.circ(wx + 1 + i * (ww / 3.2), wy + wh + 0.4, 1.4).solid(FLOWERS[(i + wn.x * 7) % FLOWERS.length | 0], { ow: 0.4 }); }
      }
      /* door */
      if (door) {
        const dw = door.w, dh = door.h, dx = x0 + door.x * w - dw / 2, dy = ground - dh;
        d.rr(dx - 3, ground - 1, dw + 6, 3, 1).solid(mix(wall, PAL.stoneDark, 0.4), { outline: false });
        d.arch(dx, dy, dw, dh).shade(door.color, dy, ground, { lt: 0.18, dk: 0.2 });
        d.arch(dx + 1.8, dy + 1.8, dw - 3.6, dh - 2.6).stroke(hexA('#000', 0.14), 0.8);
        d.circ(dx + dw - 3, dy + dh * 0.58, 0.9).fill(PAL.coin);
      }
      /* roof: the front slope, eaves out past the wall */
      const rTop = wallTop - roofH;
      const rx0 = x0 - eave, rx1 = x0 + w + eave;
      const inset = w * 0.14;
      d.rr(x0, wallTop, w, 6, 0).fill(hexA('#000', 0.16)); // eave shadow on the wall
      d.poly([[rx0, wallTop + 1], [rx1, wallTop + 1], [rx1 - inset - eave, rTop], [rx0 + inset + eave, rTop]]).shade(roof, rTop, wallTop, { lt: 0.24, dk: 0.16 });
      d.rr(rx0 + inset + eave - 2, rTop - 2.4, w - inset * 2 + 4, 4, 2).solid(light(roof, 0.28), { oc: dark(roof, 0.3), ow: 0.8 });
      for (let i = 1; i <= 2; i += 1) { const y = rTop + (roofH / 3) * i; const k = i / 3; d.line([[rx0 + (inset + eave) * (1 - k) + 2, y + 1], [rx1 - (inset + eave) * (1 - k) - 2, y + 1]]).stroke(hexA('#000', 0.11), 1); }
      d.line([[rx0 + inset + eave + 3, rTop + 3], [rx0 + inset + eave + w * 0.25, rTop + 3]]).stroke(hexA('#FFF', 0.32), 1.6);
      if (stripes) { for (let i = 0; i < Math.floor((w + eave * 2) / 9); i += 1) if (i % 2) d.poly([[rx0 + i * 9, wallTop + 1], [rx0 + i * 9 + 9, wallTop + 1], [rx0 + i * 9 + 9 - (9 * (inset + eave)) / (w + eave * 2), rTop], [rx0 + i * 9 - (9 * (inset + eave)) / (w + eave * 2) + (i ? 0 : 0), rTop]]).fill(hexA('#FFFFFF', 0.55)); }
      if (dormer) {
        const dx = x0 + w * 0.5 - 7, dy = rTop + 4;
        d.rr(dx, dy, 14, roofH - 8, 2).shade(wall, dy, dy + roofH - 8, { lt: 0.1 });
        d.poly([[dx - 3, dy + 1], [dx + 7, dy - 6], [dx + 17, dy + 1]]).shade(roof, dy - 6, dy + 1);
        d.rr(dx + 4, dy + 3, 6, 6, 1.2).solid(night ? PAL.glassNight : PAL.glass, { oc: dark(wall, 0.3), ow: 0.7 });
      }
      if (chimney) {
        const cx = x0 + w * chimney.x;
        d.rr(cx - 4, rTop + 2, 8, roofH * 0.55, 1.5).shade(PAL.stone, rTop, rTop + roofH * 0.6, { lt: 0.15 });
        d.rr(cx - 5, rTop + 1, 10, 3, 1).solid(PAL.stoneDark, { outline: false });
      }
      if (dome) {
        const cx = x0 + w * 0.5, dy = rTop - 3;
        d.rr(cx - 12, dy - 6, 24, 8, 2).shade(PAL.stone, dy - 6, dy + 2);
        c.beginPath(); c.arc(cx, dy - 6, 13, Math.PI, 0); c.closePath();
        d.shade(PAL.copper, dy - 19, dy - 6, { lt: 0.3 });
        d.line([[cx - 8, dy - 6], [cx - 8, dy - 16]]).stroke(hexA('#000', 0.14), 1);
        d.line([[cx + 2, dy - 19], [cx + 12, dy - 26]]).stroke(PAL.iron, 2.2);
        d.circ(cx, dy - 20, 1.6).fill(PAL.copperLight);
      }
      if (banner) {
        const bx = x0 + w * banner.x;
        d.rr(bx - 0.9, rTop - 16, 1.8, 20, 0.8).solid(PAL.woodDark);
        d.poly([[bx + 1, rTop - 15], [bx + 13, rTop - 12], [bx + 1, rTop - 8]]).solid(banner.color, { ow: 0.7 });
      }
      if (hasLamp) {
        const lx = x0 + w * 0.06, ly = ground - 26;
        d.rr(lx - 0.8, ly, 1.6, 8, 0.6).solid(PAL.iron, { outline: false });
        d.rr(lx - 2.6, ly + 6, 5.2, 6.5, 1.2).solid(night ? PAL.glassNight : '#C9D6E0', { oc: PAL.iron, ow: 0.9 });
        if (night) d.glow(lx, ly + 9, 9, PAL.glow, 0.5);
      }
      if (sign) {
        const sx = x0 + w * (sign.x ?? 0.9), sy = wallTop + 6;
        d.rr(sx - 0.8, sy - 2, 1.6, 4, 0.6).solid(PAL.iron, { outline: false });
        d.rr(sx - 7, sy + 2, 14, 12, 2.5).shade(sign.bg ?? PAL.white, sy + 2, sy + 14, { lt: 0.08 });
        drawGlyph(d, sign.glyph, sx, sy + 8, 4.2);
      }
      if (awning) {
        const ax0 = x0 + w * awning.x0, ax1 = x0 + w * awning.x1, ay = wallTop + awning.y;
        d.rr(ax0, ay, ax1 - ax0, 6, 1.5).solid(awning.color, { ow: 0.7 });
        for (let i = 0; i < Math.floor((ax1 - ax0) / 8); i += 1) if (i % 2) d.rr(ax0 + i * 8, ay, 8, 6, 0).fill(hexA('#FFFFFF', 0.6));
        for (let i = 0; i <= Math.floor((ax1 - ax0) / 8); i += 1) { const sx = ax0 + i * 8 + 4; if (sx < ax1) { c.beginPath(); c.arc(sx, ay + 6, 4, 0, Math.PI); c.closePath(); c.fillStyle = i % 2 ? awning.color : hexA('#FFFFFF', 0.9); c.fill(); d.stroke(dark(awning.color, 0.3), 0.6); } }
      }
      if (tower) {
        const tx = x0 + w + 2, tw = tower.w, th = tower.h;
        const tTop = ground - th;
        d.rr(tx, tTop + 10, tw, th - 10, 3).shade(tower.wall ?? PAL.stoneLight, tTop, ground, { lt: 0.14 });
        d.rr(tx, ground - 5, tw, 5, 2).solid(mix(PAL.stoneLight, PAL.stoneDark, 0.4), { outline: false });
        for (let f = 0; f < (tower.windows ?? 2); f += 1) {
          const wy = tTop + 18 + f * 16;
          d.arch(tx + tw / 2 - 3.5, wy, 7, 9).solid(night ? PAL.glassNight : PAL.glass, { oc: dark(PAL.stoneLight, 0.35), ow: 0.8 });
        }
        if (tower.dome) {
          c.beginPath(); c.arc(tx + tw / 2, tTop + 10, tw / 2 + 2, Math.PI, 0); c.closePath();
          d.shade(PAL.copper, tTop - 4, tTop + 10, { lt: 0.32 });
          d.line([[tx + tw / 2 - 5, tTop + 10], [tx + tw / 2 - 5, tTop - 1]]).stroke(hexA('#000', 0.14), 1);
          d.line([[tx + tw / 2 + 3, tTop - 2], [tx + tw / 2 + 11, tTop - 9]]).stroke(PAL.iron, 2);
        } else {
          d.poly([[tx - 3, tTop + 11], [tx + tw / 2, tTop - 6], [tx + tw + 3, tTop + 11]]).shade(tower.roof ?? roof, tTop - 6, tTop + 11, { lt: 0.24 });
          d.circ(tx + tw / 2, tTop - 6, 1.5).fill(PAL.coin);
        }
      }
      for (const ex of extras) ex(d, { x0, w, ground, wallTop, rTop, c });
    },
  };
}

/** Small emblem glyphs used on signs and as icons. */
function drawGlyph(d, glyph, cx, cy, r) {
  switch (glyph) {
    case 'book': {
      d.rr(cx - r, cy - r * 0.8, r * 2, r * 1.6, 1).solid(PAL.roofBlue, { ow: 0.6 });
      d.line([[cx, cy - r * 0.8], [cx, cy + r * 0.8]]).stroke(PAL.white, 0.8);
      d.line([[cx - r * 0.6, cy - r * 0.3], [cx - r * 0.25, cy - r * 0.3]]).stroke(hexA('#FFF', 0.7), 0.6);
      d.line([[cx + r * 0.25, cy - r * 0.3], [cx + r * 0.6, cy - r * 0.3]]).stroke(hexA('#FFF', 0.7), 0.6);
      break;
    }
    case 'flower': {
      for (let i = 0; i < 5; i += 1) { const a = (i / 5) * Math.PI * 2; d.circ(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.42).solid(PAL.bloom, { ow: 0.5 }); }
      d.circ(cx, cy, r * 0.34).fill('#F6C445');
      break;
    }
    case 'root': {
      d.line([[cx, cy - r * 0.9], [cx, cy + r * 0.3], [cx - r * 0.5, cy + r * 0.9]]).stroke(PAL.root, 1.6);
      d.line([[cx, cy + r * 0.3], [cx + r * 0.55, cy + r * 0.85]]).stroke(PAL.root, 1.6);
      d.line([[cx, cy - r * 0.2], [cx - r * 0.45, cy + r * 0.1]]).stroke(PAL.root, 1.2);
      d.ell(cx + r * 0.35, cy - r * 0.95, r * 0.42, r * 0.28).fill(PAL.leaf);
      d.ell(cx - r * 0.35, cy - r * 0.95, r * 0.42, r * 0.28).fill(PAL.leafDark);
      break;
    }
    case 'spool': {
      d.rr(cx - r * 0.7, cy - r * 0.9, r * 1.4, r * 1.8, r * 0.3).solid(PAL.thread, { ow: 0.6 });
      d.rr(cx - r * 0.9, cy - r * 1.0, r * 1.8, r * 0.35, r * 0.15).solid(PAL.woodLight, { ow: 0.5 });
      d.rr(cx - r * 0.9, cy + r * 0.65, r * 1.8, r * 0.35, r * 0.15).solid(PAL.woodLight, { ow: 0.5 });
      for (let i = 0; i < 3; i += 1) d.line([[cx - r * 0.7, cy - r * 0.5 + i * r * 0.45], [cx + r * 0.7, cy - r * 0.5 + i * r * 0.45]]).stroke(hexA('#FFF', 0.35), 0.5);
      break;
    }
    case 'scales': {
      d.line([[cx, cy - r * 0.9], [cx, cy + r * 0.9]]).stroke(PAL.iron, 1.2);
      d.line([[cx - r * 0.9, cy - r * 0.5], [cx + r * 0.9, cy - r * 0.5]]).stroke(PAL.iron, 1.2);
      d.ell(cx - r * 0.85, cy + r * 0.15, r * 0.45, r * 0.2).solid(PAL.coin, { ow: 0.5 });
      d.ell(cx + r * 0.85, cy + r * 0.15, r * 0.45, r * 0.2).solid(PAL.coin, { ow: 0.5 });
      d.rr(cx - r * 0.5, cy + r * 0.7, r, r * 0.3, r * 0.1).fill(PAL.iron);
      break;
    }
    case 'coin': {
      d.circ(cx, cy, r).solid(PAL.coin, { oc: PAL.coinDark, ow: 0.9 });
      d.circ(cx, cy, r * 0.68).stroke(PAL.coinDark, 0.6);
      d.poly(starPts(cx, cy, r * 0.42, r * 0.2)).fill(PAL.coinDark);
      d.gleam(cx - r * 0.35, cy - r * 0.4, r * 0.4, r * 0.3, 0.6);
      break;
    }
    case 'page': {
      d.poly([[cx - r * 0.75, cy - r], [cx + r * 0.35, cy - r], [cx + r * 0.75, cy - r * 0.6], [cx + r * 0.75, cy + r], [cx - r * 0.75, cy + r]]).solid(PAL.page, { oc: dark(PAL.page, 0.4), ow: 0.7 });
      d.poly([[cx + r * 0.35, cy - r], [cx + r * 0.35, cy - r * 0.6], [cx + r * 0.75, cy - r * 0.6]]).solid(mix(PAL.page, PAL.pageLine, 0.4), { ow: 0.5 });
      for (let i = 0; i < 3; i += 1) d.line([[cx - r * 0.45, cy - r * 0.25 + i * r * 0.38], [cx + r * 0.4 - (i === 2 ? r * 0.3 : 0), cy - r * 0.25 + i * r * 0.38]]).stroke(PAL.pageLine, 0.7);
      break;
    }
    case 'bloom': {
      for (let i = 0; i < 5; i += 1) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; d.ell(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.46, r * 0.46).solid(PAL.bloom, { oc: dark(PAL.bloom, 0.25), ow: 0.6 }); }
      d.circ(cx, cy, r * 0.36).solid('#FFD75E', { ow: 0.5 });
      d.gleam(cx - r * 0.3, cy - r * 0.45, r * 0.3, r * 0.25, 0.5);
      break;
    }
    case 'thread': {
      d.rr(cx - r * 0.62, cy - r * 0.8, r * 1.24, r * 1.6, r * 0.25).solid(PAL.thread, { oc: dark(PAL.thread, 0.3), ow: 0.7 });
      d.rr(cx - r * 0.85, cy - r * 1.0, r * 1.7, r * 0.34, r * 0.12).solid(PAL.woodLight, { ow: 0.6 });
      d.rr(cx - r * 0.85, cy + r * 0.66, r * 1.7, r * 0.34, r * 0.12).solid(PAL.woodLight, { ow: 0.6 });
      for (let i = 0; i < 4; i += 1) d.line([[cx - r * 0.6, cy - r * 0.55 + i * r * 0.36], [cx + r * 0.6, cy - r * 0.55 + i * r * 0.36]]).stroke(hexA('#FFF', 0.3), 0.55);
      d.line([[cx + r * 0.6, cy], [cx + r * 1.05, cy + r * 0.5]]).stroke(PAL.threadLight, 0.7);
      break;
    }
    case 'star': {
      d.poly(starPts(cx, cy, r, r * 0.45)).solid('#F4C443', { oc: '#B88A12', ow: 0.7 });
      d.gleam(cx - r * 0.2, cy - r * 0.3, r * 0.35, r * 0.3, 0.5);
      break;
    }
    case 'hammer': {
      d.line([[cx - r * 0.7, cy + r * 0.8], [cx + r * 0.3, cy - r * 0.2]]).stroke(PAL.woodDark, 1.6);
      d.rr(cx - r * 0.1, cy - r * 0.9, r * 1.1, r * 0.75, r * 0.2).solid(PAL.iron, { ow: 0.6 });
      break;
    }
    case 'check': {
      d.circ(cx, cy, r).solid(PAL.leaf, { oc: PAL.leafDark, ow: 0.8 });
      d.line([[cx - r * 0.45, cy], [cx - r * 0.1, cy + r * 0.38], [cx + r * 0.5, cy - r * 0.4]]).stroke('#FFFFFF', 1.6);
      break;
    }
    case 'clock': {
      d.circ(cx, cy, r).solid(PAL.white, { oc: PAL.iron, ow: 0.9 });
      d.line([[cx, cy], [cx, cy - r * 0.6]]).stroke(PAL.iron, 1);
      d.line([[cx, cy], [cx + r * 0.45, cy + r * 0.2]]).stroke(PAL.iron, 1);
      break;
    }
    case 'house': {
      d.rr(cx - r * 0.7, cy - r * 0.1, r * 1.4, r * 1.0, r * 0.15).solid(PAL.cream, { ow: 0.6 });
      d.poly([[cx - r * 1.0, cy - r * 0.05], [cx, cy - r * 0.95], [cx + r * 1.0, cy - r * 0.05]]).solid(PAL.roofRed, { ow: 0.6 });
      d.arch(cx - r * 0.2, cy + r * 0.3, r * 0.4, r * 0.6).fill(PAL.woodDark);
      break;
    }
    case 'sprout': {
      d.line([[cx, cy + r * 0.9], [cx, cy - r * 0.2]]).stroke(PAL.leafDark, 1.4);
      d.ell(cx - r * 0.5, cy - r * 0.2, r * 0.55, r * 0.32).solid(PAL.leaf, { ow: 0.5 });
      d.ell(cx + r * 0.5, cy - r * 0.45, r * 0.55, r * 0.32).solid(PAL.leafLight, { ow: 0.5 });
      break;
    }
    case 'scroll': {
      d.rr(cx - r * 0.7, cy - r * 0.8, r * 1.4, r * 1.6, r * 0.2).solid(PAL.page, { oc: dark(PAL.page, 0.4), ow: 0.7 });
      for (let i = 0; i < 3; i += 1) d.line([[cx - r * 0.4, cy - r * 0.35 + i * r * 0.38], [cx + r * 0.4, cy - r * 0.35 + i * r * 0.38]]).stroke(PAL.pageLine, 0.7);
      d.rr(cx - r * 0.85, cy - r * 0.95, r * 1.7, r * 0.35, r * 0.15).solid(PAL.woodLight, { ow: 0.5 });
      break;
    }
    case 'gear': {
      for (let i = 0; i < 8; i += 1) { const a = (i / 8) * Math.PI * 2; d.rr(cx + Math.cos(a) * r * 0.75 - r * 0.18, cy + Math.sin(a) * r * 0.75 - r * 0.18, r * 0.36, r * 0.36, r * 0.1).fill(PAL.iron); }
      d.circ(cx, cy, r * 0.62).solid(PAL.stone, { oc: PAL.iron, ow: 0.8 });
      d.circ(cx, cy, r * 0.22).fill(PAL.iron);
      break;
    }
    case 'board': {
      d.rr(cx - r, cy - r * 0.8, r * 2, r * 1.3, r * 0.2).solid(PAL.woodLight, { ow: 0.7 });
      d.line([[cx - r * 0.6, cy - r * 0.4], [cx + r * 0.6, cy - r * 0.4]]).stroke(hexA(PAL.timber, 0.6), 0.8);
      d.line([[cx - r * 0.6, cy], [cx + r * 0.2, cy]]).stroke(hexA(PAL.timber, 0.6), 0.8);
      d.rr(cx - r * 0.7, cy + r * 0.5, r * 0.25, r * 0.5, 0.2).fill(PAL.woodDark);
      d.rr(cx + r * 0.45, cy + r * 0.5, r * 0.25, r * 0.5, 0.2).fill(PAL.woodDark);
      break;
    }
    case 'lock': {
      d.rr(cx - r * 0.7, cy - r * 0.1, r * 1.4, r * 1.0, r * 0.2).solid(PAL.coin, { oc: PAL.coinDark, ow: 0.7 });
      d.line([[cx - r * 0.4, cy - r * 0.1], [cx - r * 0.4, cy - r * 0.5], [cx + r * 0.4, cy - r * 0.5], [cx + r * 0.4, cy - r * 0.1]]).stroke(PAL.iron, 1.2);
      d.circ(cx, cy + r * 0.4, r * 0.18).fill(PAL.iron);
      break;
    }
    case 'road': {
      d.poly([[cx - r * 0.5, cy + r], [cx + r * 0.5, cy + r], [cx + r * 0.2, cy - r], [cx - r * 0.2, cy - r]]).solid(PAL.path, { oc: PAL.pathEdge, ow: 0.7 });
      d.line([[cx, cy + r * 0.7], [cx, cy + r * 0.3]]).stroke(PAL.white, 0.8);
      d.line([[cx, cy - r * 0.1], [cx, cy - r * 0.5]]).stroke(PAL.white, 0.8);
      break;
    }
    case 'cat': {
      d.circ(cx, cy + r * 0.1, r * 0.8).solid(PAL.wick, { oc: dark(PAL.wick, 0.4), ow: 0.7 });
      d.poly([[cx - r * 0.75, cy - r * 0.3], [cx - r * 0.55, cy - r * 1.0], [cx - r * 0.15, cy - r * 0.6]]).solid(PAL.wick, { ow: 0.6 });
      d.poly([[cx + r * 0.75, cy - r * 0.3], [cx + r * 0.55, cy - r * 1.0], [cx + r * 0.15, cy - r * 0.6]]).solid(PAL.wick, { ow: 0.6 });
      d.circ(cx - r * 0.3, cy, r * 0.17).fill(PAL.wickEye);
      d.circ(cx + r * 0.3, cy, r * 0.17).fill(PAL.wickEye);
      break;
    }
    case 'heart': {
      d.c.beginPath(); d.c.moveTo(cx, cy + r * 0.9); d.c.bezierCurveTo(cx - r * 1.4, cy - r * 0.1, cx - r * 0.6, cy - r * 1.1, cx, cy - r * 0.35); d.c.bezierCurveTo(cx + r * 0.6, cy - r * 1.1, cx + r * 1.4, cy - r * 0.1, cx, cy + r * 0.9); d.c.closePath();
      d.solid('#F26D7D', { oc: '#B23E52', ow: 0.6 });
      break;
    }
    case 'bell': {
      d.c.beginPath(); d.c.moveTo(cx - r * 0.8, cy + r * 0.5); d.c.quadraticCurveTo(cx - r * 0.7, cy - r * 1.0, cx, cy - r * 0.9); d.c.quadraticCurveTo(cx + r * 0.7, cy - r * 1.0, cx + r * 0.8, cy + r * 0.5); d.c.closePath();
      d.solid(PAL.coin, { oc: PAL.coinDark, ow: 0.7 });
      d.circ(cx, cy + r * 0.75, r * 0.22).fill(PAL.coinDark);
      break;
    }
    case 'arrow': {
      d.line([[cx - r * 0.7, cy], [cx + r * 0.6, cy]]).stroke(PAL.outline, 1.4);
      d.line([[cx + r * 0.1, cy - r * 0.5], [cx + r * 0.6, cy], [cx + r * 0.1, cy + r * 0.5]]).stroke(PAL.outline, 1.4);
      break;
    }
    default: {
      d.circ(cx, cy, r * 0.8).solid(PAL.stone);
    }
  }
}

function starPts(cx, cy, R, r) {
  const pts = [];
  for (let i = 0; i < 10; i += 1) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r : R; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return pts;
}

/** Icons for the interface: one glyph on a little rounded plate. */
function icon({ glyph = 'star', plate = false, size = 16 }) {
  const w = size + 4, h = size + 4;
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      if (plate) d.rr(1, 1, w - 2, h - 2, 4).solid(PAL.white, { oc: hexA(PAL.outline, 0.25), ow: 0.7 });
      drawGlyph(d, glyph, w / 2, h / 2, size * 0.42);
    },
  };
}

/* The named buildings. Each level is a variation of `house`. */
function building({ id = 'hearth', level = 1, night = false }) {
  const L = Math.max(1, level);
  switch (id) {
    case 'hearth': return house({
      w: 72 + Math.min(L, 3) * 4, wallH: 32, roofH: 24 + L * 1.5, wall: PAL.cream, roof: PAL.roofRed, night,
      windows: [{ x: 0.24, y: 9 }, ...(L >= 4 ? [{ x: 0.76, y: 9 }] : [])],
      door: { x: L >= 4 ? 0.5 : 0.7, w: 12, h: 18, color: PAL.woodDark },
      chimney: L >= 2 ? { x: 0.78 } : null, boxes: L >= 3, lamp: L >= 4, dormer: L >= 5,
      banner: L >= 5 ? { x: 0.08, color: PAL.roofRed } : null,
    });
    case 'reading': return house({
      w: 84, wallH: L >= 2 ? 30 : 36, floors: L >= 2 ? 2 : 1, roofH: 24, wall: PAL.plaster, roof: PAL.roofBlue, night,
      windows: L >= 2
        ? [{ x: 0.28, y: 6, w: 10, h: 10 }, { x: 0.72, y: 6, w: 10, h: 10 }, { x: 0.28, y: 8, floor: 1, w: 12, h: 13, arch: true }, { x: 0.72, y: 8, floor: 1, w: 12, h: 13, arch: true }]
        : [{ x: 0.28, y: 9, w: 14, h: 15, arch: true }, { x: 0.7, y: 9, w: 14, h: 15, arch: true }],
      door: { x: 0.5, w: 13, h: 19, color: PAL.timber }, sign: { glyph: 'book', x: 0.92 }, lamp: true, boxes: L >= 2,
      tower: L >= 3 ? { w: 26, h: L >= 4 ? 96 : 84, windows: 3, dome: L >= 4, roof: PAL.roofBlue } : null,
      banner: L >= 3 ? { x: 0.06, color: PAL.roofBlue } : null,
    });
    case 'garden': return house({
      w: L >= 2 ? 78 : 60, wallH: 26, roofH: 20, wall: L >= 2 ? PAL.white : PAL.woodLight, roof: PAL.roofGreen, night, glass: L >= 2,
      windows: L >= 2 ? [] : [{ x: 0.3, y: 7, w: 9, h: 9 }],
      door: { x: L >= 2 ? 0.5 : 0.7, w: 11, h: 16, color: PAL.timber }, sign: { glyph: 'flower', x: 0.92 }, plinth: true,
      banner: L >= 4 ? { x: 0.06, color: PAL.roofGreen } : null,
      extras: [
        (d, { x0, w, ground }) => { const b = beds({ seed: 'gb', w: L >= 3 ? 52 : 40, rows: 2, grown: 0.5 + L * 0.15, flowers: L >= 2 }); d.c.drawImage(art('beds', { seed: 'gb', w: L >= 3 ? 52 : 40, rows: 2, grown: 0.5 + L * 0.15, flowers: L >= 2 }).canvas, 0, 0, b.w * SCALE, b.h * SCALE, x0 + w * 0.5 - b.w / 2, ground + 2 - b.h * 0.2, b.w, b.h); },
        ...(L >= 3 ? [(d, { x0, ground }) => { d.c.drawImage(art('hive').canvas, 0, 0, 14 * SCALE, 16 * SCALE, x0 - 16, ground - 14, 14, 16); }] : []),
      ],
    });
    case 'roots': return house({
      w: 78, wallH: L >= 4 ? 28 : 34, floors: L >= 4 ? 2 : 1, roofH: 22, wall: PAL.stoneLight, roof: PAL.roofTeal, night,
      windows: L >= 4 ? [{ x: 0.3, y: 6, w: 10, h: 10 }, { x: 0.7, y: 6, w: 10, h: 10 }, { x: 0.5, y: 6, floor: 1, w: 14, h: 14, arch: true }] : [{ x: 0.5, y: 6, w: 16, h: 16, arch: true }, { x: 0.22, y: 12, w: 8, h: 9 }],
      door: { x: L >= 4 ? 0.5 : 0.78, w: 12, h: 18, color: PAL.woodDark }, sign: { glyph: 'root', x: 0.92 }, chimney: L >= 2 ? { x: 0.22 } : null, lamp: L >= 3,
      banner: L >= 4 ? { x: 0.06, color: PAL.roofTeal } : null,
      extras: L >= 3 ? [(d, { x0, w, ground }) => { d.c.drawImage(art('crate', { kind: 'barrel' }).canvas, 0, 0, 14 * SCALE, 14 * SCALE, x0 + w + 2, ground - 12, 14, 14); d.c.drawImage(art('crate', { kind: 'sack' }).canvas, 0, 0, 14 * SCALE, 14 * SCALE, x0 + w + 12, ground - 12, 14, 14); }] : [],
    });
    case 'loom': return house({
      w: 82, wallH: L >= 3 ? 28 : 34, floors: L >= 3 ? 2 : 1, roofH: 22, wall: PAL.cream, roof: PAL.roofPlum, night,
      windows: L >= 3 ? [{ x: 0.22, y: 6, w: 10, h: 10 }, { x: 0.78, y: 6, w: 10, h: 10 }, { x: 0.3, y: 7, floor: 1, w: 11, h: 11 }, { x: 0.7, y: 7, floor: 1, w: 11, h: 11 }] : [{ x: 0.24, y: 8, w: 12, h: 12 }, { x: 0.76, y: 8, w: 12, h: 12 }],
      door: { x: 0.5, w: 12, h: 18, color: PAL.timber }, sign: L >= 2 ? { glyph: 'spool', x: 0.92 } : null, lamp: L >= 4,
      awning: { x0: 0.08, x1: 0.92, y: 6, color: PAL.roofPlum }, banner: L >= 4 ? { x: 0.06, color: PAL.roofPlum } : null,
      extras: [(d, { x0, w, ground, wallTop }) => { for (let i = 0; i < 4; i += 1) d.line([[x0 + 4 + i * 4, wallTop + 2], [x0 + 4 + i * 4, ground - 6]]).stroke(hexA(PAL.timber, 0.28), 1.2); }],
    });
    case 'market': return L >= 2 ? house({
      w: 88, wallH: 30, roofH: 22, wall: PAL.cream, roof: PAL.roofGold, night,
      windows: [{ x: 0.22, y: 8, w: 11, h: 11 }, { x: 0.78, y: 8, w: 11, h: 11 }],
      door: { x: 0.5, w: 14, h: 19, color: PAL.timber }, sign: { glyph: 'scales', x: 0.92 }, lamp: L >= 3,
      awning: { x0: 0.06, x1: 0.94, y: 4, color: PAL.roofRed }, banner: L >= 3 ? { x: 0.06, color: PAL.roofRed } : null,
      extras: [(d, { x0, w, ground }) => { d.c.drawImage(art('crate').canvas, 0, 0, 14 * SCALE, 14 * SCALE, x0 - 12, ground - 12, 14, 14); d.c.drawImage(art('crate', { kind: 'sack' }).canvas, 0, 0, 14 * SCALE, 14 * SCALE, x0 + w - 2, ground - 12, 14, 14); }],
    }) : stall({ night });
    default: return house({ w: 70, wallH: 30, roofH: 22, night });
  }
}

/** The market at level one: a stall with a striped awning and crates. */
function stall({ night = false }) {
  const w = 84, h = 62;
  return {
    w, h, ax: w / 2, ay: h - 6,
    draw(d, c) {
      const ground = h - 6, x0 = 12, W = 60;
      d.shadow(w / 2, ground, 38, 7, 0.22);
      d.rr(x0 - 1, ground - 32, 3, 32, 1).solid(PAL.woodDark);
      d.rr(x0 + W - 2, ground - 32, 3, 32, 1).solid(PAL.woodDark);
      d.rr(x0, ground - 16, W, 14, 2.5).shade(PAL.woodLight, ground - 16, ground - 2);
      for (let i = 0; i < 5; i += 1) d.line([[x0 + 4 + i * 12, ground - 14], [x0 + 4 + i * 12, ground - 4]]).stroke(hexA(PAL.timber, 0.4), 0.8);
      d.rr(x0 - 2, ground - 18, W + 4, 3, 1).solid(PAL.woodLight, { ow: 0.7 });
      // Goods on the counter.
      for (let i = 0; i < 3; i += 1) d.circ(x0 + 10 + i * 6, ground - 20, 2.6).solid(['#F26D7D', '#F6C445', '#F26D7D'][i], { ow: 0.5 });
      d.rr(x0 + 32, ground - 24, 10, 6, 1.5).shade(PAL.page, ground - 24, ground - 18);
      d.rr(x0 + 46, ground - 23, 8, 5, 1.5).shade('#D9C39A', ground - 23, ground - 18);
      // Awning.
      d.poly([[x0 - 8, ground - 30], [x0 + W + 8, ground - 30], [x0 + W + 2, ground - 40], [x0 - 2, ground - 40]]).shade(PAL.roofRed, ground - 40, ground - 30, { lt: 0.22 });
      for (let i = 0; i < 8; i += 1) if (i % 2) d.poly([[x0 - 8 + i * 9.5, ground - 30], [x0 - 8 + (i + 1) * 9.5, ground - 30], [x0 - 2 + (i + 1) * 8, ground - 40], [x0 - 2 + i * 8, ground - 40]]).fill(hexA('#FFFFFF', 0.62));
      for (let i = 0; i < 8; i += 1) { c.beginPath(); c.arc(x0 - 8 + i * 9.5 + 4.75, ground - 30, 4.75, 0, Math.PI); c.closePath(); c.fillStyle = i % 2 ? '#FFFFFF' : PAL.roofRed; c.fill(); d.stroke(dark(PAL.roofRed, 0.3), 0.6); }
      d.rr(x0 + W / 2 - 8, ground - 52, 16, 12, 2.5).shade(PAL.white, ground - 52, ground - 40, { lt: 0.08 });
      d.rr(x0 + W / 2 - 0.8, ground - 42, 1.6, 4, 0.5).solid(PAL.iron, { outline: false });
      drawGlyph(d, 'scales', x0 + W / 2, ground - 46, 4.2);
      c.drawImage(art('crate').canvas, 0, 0, 14 * SCALE, 14 * SCALE, x0 - 12, ground - 12, 14, 14);
      c.drawImage(art('crate', { kind: 'sack' }).canvas, 0, 0, 14 * SCALE, 14 * SCALE, x0 + W - 2, ground - 12, 14, 14);
      if (night) { d.glow(x0 + W / 2, ground - 24, 20, PAL.glow, 0.25); }
    },
  };
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

/**
 * A villager: a big round head, a small body, dot eyes, a smile. Poses:
 * idle | walk | work | cheer | sit. Frames alternate limbs.
 */
function person({ skin = SKINS[0], hair = HAIRS[1], style = 'short', top = CLOTHES[0], bottom = '#4E4A5C', hat = null, apron = null, prop = null, pose = 'idle', frame = 0, glasses = false, size = 1 }) {
  const w = 30 * size, h = 40 * size;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d, c) {
      c.save(); c.scale(size, size);
      const cx = 15, ground = 38;
      const bob = pose === 'idle' ? (frame % 2 ? 0.6 : 0) : pose === 'walk' ? (frame % 2 ? 0.8 : 0) : 0;
      const cheer = pose === 'cheer';
      d.shadow(cx, ground, 8, 2.8, 0.2);
      // legs
      const lift = pose === 'walk' ? (frame % 2 ? 2 : -2) : 0;
      d.rr(cx - 5, ground - 10 - Math.max(0, lift), 4.4, 10 + Math.max(0, lift), 2).shade(bottom, ground - 10, ground, { lt: 0.12 });
      d.rr(cx + 0.8, ground - 10 - Math.max(0, -lift), 4.4, 10 + Math.max(0, -lift), 2).shade(bottom, ground - 10, ground, { lt: 0.12 });
      d.rr(cx - 5.6, ground - 2.5, 5.6, 2.8, 1.2).solid(PAL.timber, { ow: 0.6 });
      d.rr(cx + 0.2, ground - 2.5, 5.6, 2.8, 1.2).solid(PAL.timber, { ow: 0.6 });
      // body
      const by = ground - 22 - bob;
      d.poly([[cx - 6.5, by + 1], [cx + 6.5, by + 1], [cx + 7.5, by + 13], [cx - 7.5, by + 13]]).shade(top, by, by + 13, { lt: 0.2 });
      if (apron) { d.rr(cx - 4.5, by + 4, 9, 9, 1.5).solid(apron, { ow: 0.6 }); }
      // arms
      const armL = cheer ? [[cx - 7, by + 3], [cx - 11, by - 6]] : pose === 'work' ? [[cx - 7, by + 3], [cx - 11, by + (frame % 2 ? 2 : 8)]] : [[cx - 7, by + 3], [cx - 9, by + 11]];
      const armR = cheer ? [[cx + 7, by + 3], [cx + 11, by - 6]] : pose === 'work' ? [[cx + 7, by + 3], [cx + 11, by + (frame % 2 ? 8 : 2)]] : pose === 'wave' ? [[cx + 7, by + 3], [cx + 12, by - 4]] : [[cx + 7, by + 3], [cx + 9, by + 11]];
      d.line(armL).stroke(dark(top, 0.3), 4.4); d.line(armL).stroke(top, 3.2);
      d.line(armR).stroke(dark(top, 0.3), 4.4); d.line(armR).stroke(top, 3.2);
      d.circ(armL[1][0], armL[1][1], 2).solid(skin, { ow: 0.6 });
      d.circ(armR[1][0], armR[1][1], 2).solid(skin, { ow: 0.6 });
      // prop in the right hand
      if (prop) drawProp(d, c, prop, armR[1][0], armR[1][1], frame);
      // head
      const hy = by - 7;
      d.circ(cx, hy, 8.6).shade(skin, hy - 9, hy + 9, { lt: 0.16, dk: 0.14 });
      // hair
      if (style === 'bun') { d.circ(cx - 1, hy - 9.5, 3.6).solid(hair, { ow: 0.7 }); }
      if (style !== 'bald') {
        c.beginPath(); c.arc(cx, hy - 0.5, 8.9, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(cx + 8.6, hy + (style === 'long' || style === 'curly' ? 5 : 1)); c.lineTo(cx - 8.6, hy + (style === 'long' || style === 'curly' ? 5 : 1)); c.closePath();
        d.solid(hair, { ow: 0.7 });
        if (style === 'curly') for (let i = 0; i < 6; i += 1) d.circ(cx - 8 + i * 3.2, hy - 5 + (i % 2) * 1.5, 2.6).solid(hair, { ow: 0.5 });
        d.poly([[cx - 6, hy - 3], [cx + 1, hy - 3.5], [cx + 4, hy - 6]]).fill(hair);
        d.gleam(cx - 3, hy - 6.5, 3, 1.6, 0.25);
      }
      if (hat === 'straw') { d.ell(cx, hy - 5.5, 12, 3.2).solid('#E8CF7A', { ow: 0.7 }); d.rr(cx - 6, hy - 14, 12, 9, 3).shade('#E8CF7A', hy - 14, hy - 5); d.rr(cx - 6, hy - 8.5, 12, 2, 0.6).fill(PAL.roofRed); }
      if (hat === 'cap') { d.rr(cx - 7.5, hy - 11, 15, 7, 4).shade(top, hy - 11, hy - 4); d.rr(cx - 9, hy - 5.5, 18, 2.4, 1).solid(dark(top, 0.2), { ow: 0.5 }); }
      if (hat === 'scarf') { d.rr(cx - 8.5, hy - 12, 17, 9, 5).shade('#D9603F', hy - 12, hy - 3); }
      // face
      d.circ(cx - 3.2, hy + 0.8, 1.15).fill(PAL.outline);
      d.circ(cx + 3.2, hy + 0.8, 1.15).fill(PAL.outline);
      d.circ(cx - 2.8, hy + 0.4, 0.4).fill('#FFFFFF');
      d.circ(cx + 3.6, hy + 0.4, 0.4).fill('#FFFFFF');
      if (glasses) { d.circ(cx - 3.2, hy + 0.8, 2.4).stroke(PAL.iron, 0.7); d.circ(cx + 3.2, hy + 0.8, 2.4).stroke(PAL.iron, 0.7); d.line([[cx - 0.8, hy + 0.8], [cx + 0.8, hy + 0.8]]).stroke(PAL.iron, 0.7); }
      d.circ(cx - 5.2, hy + 3.2, 1.6).fill(hexA('#F26D7D', 0.35));
      d.circ(cx + 5.2, hy + 3.2, 1.6).fill(hexA('#F26D7D', 0.35));
      c.beginPath(); c.arc(cx, hy + 2.6, cheer ? 2.6 : 2, 0.15 * Math.PI, 0.85 * Math.PI); d.stroke(dark(skin, 0.5), 0.9);
      c.restore();
    },
  };
}

function drawProp(d, c, prop, x, y, frame) {
  switch (prop) {
    case 'book': d.rr(x - 5, y - 4, 8, 6, 1).solid(PAL.roofBlue, { ow: 0.7 }); d.line([[x - 1, y - 4], [x - 1, y + 2]]).stroke(PAL.white, 0.8); break;
    case 'can': d.rr(x - 4, y - 3, 7, 6, 1.5).shade(PAL.iron, y - 3, y + 3); d.line([[x + 3, y - 1], [x + 7, y - 4]]).stroke(PAL.iron, 1.4); if (frame % 2) for (let i = 0; i < 3; i += 1) d.circ(x + 8 + i, y - 2 + i * 2, 0.7).fill(PAL.waterLight); break;
    case 'lens': d.circ(x + 2, y - 3, 3.4).solid(hexA(PAL.glass, 0.9), { oc: PAL.iron, ow: 1 }); d.line([[x - 1, y], [x - 4, y + 3]]).stroke(PAL.woodDark, 1.6); break;
    case 'spool': d.rr(x - 3, y - 5, 6, 8, 1.2).solid(PAL.thread, { ow: 0.6 }); d.rr(x - 4, y - 5.6, 8, 1.6, 0.5).fill(PAL.woodLight); d.rr(x - 4, y + 2, 8, 1.6, 0.5).fill(PAL.woodLight); break;
    case 'basket': d.rr(x - 5, y - 2, 10, 6, 2).shade(PAL.woodLight, y - 2, y + 4); c.beginPath(); c.arc(x, y - 2, 5, Math.PI, 0); d.stroke(PAL.woodDark, 1.2); d.circ(x - 2, y - 3, 1.8).fill('#F26D7D'); d.circ(x + 2, y - 3.5, 1.8).fill('#F6C445'); break;
    case 'hammer': d.line([[x, y], [x + 4, y - 7]]).stroke(PAL.woodDark, 1.6); d.rr(x + 1.5, y - 10, 6, 3.6, 1).solid(PAL.iron, { ow: 0.6 }); break;
    case 'lamp': d.rr(x - 2.6, y - 1, 5.2, 6, 1.2).solid(PAL.glassNight, { oc: PAL.iron, ow: 0.8 }); d.glow(x, y + 2, 7, PAL.glow, 0.5); break;
    default: break;
  }
}

/** Wick: a small charcoal cat with lamp-coloured eyes. */
function wick({ pose = 'sit', frame = 0, lamp: withLamp = false, blink = false, size = 1 }) {
  const w = 24 * size, h = 22 * size;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d, c) {
      c.save(); c.scale(size, size);
      const cx = 12, ground = 20;
      const bob = frame % 2 ? 0.5 : 0;
      d.shadow(cx, ground, 7, 2.2, 0.2);
      const body = PAL.wick;
      // tail
      c.beginPath(); c.moveTo(cx + 5, ground - 5); c.quadraticCurveTo(cx + 12, ground - 6 - (frame % 2 ? 3 : 0), cx + 10, ground - 12); d.stroke(dark(body, 0.35), 3.2); c.beginPath(); c.moveTo(cx + 5, ground - 5); c.quadraticCurveTo(cx + 12, ground - 6 - (frame % 2 ? 3 : 0), cx + 10, ground - 12); d.stroke(body, 2);
      // body
      if (pose === 'walk') { d.ell(cx, ground - 6, 7.5, 4.5).shade(body, ground - 11, ground - 1, { lt: 0.22 }); d.rr(cx - 6, ground - 4 - (frame % 2 ? 1 : 0), 3, 4, 1).solid(body, { ow: 0.6 }); d.rr(cx + 3, ground - 4 - (frame % 2 ? 0 : 1), 3, 4, 1).solid(body, { ow: 0.6 }); }
      else { d.ell(cx, ground - 6.5, 6.5, 6).shade(body, ground - 13, ground, { lt: 0.22 }); d.rr(cx - 5, ground - 3, 4, 3, 1.2).solid(body, { ow: 0.6 }); d.rr(cx + 1, ground - 3, 4, 3, 1.2).solid(body, { ow: 0.6 }); }
      // head
      const hy = ground - 13 - bob + (pose === 'walk' ? 2 : 0);
      d.poly([[cx - 6.5, hy - 2], [cx - 5.5, hy - 9.5], [cx - 1.5, hy - 5]]).solid(body, { ow: 0.7 });
      d.poly([[cx + 6.5, hy - 2], [cx + 5.5, hy - 9.5], [cx + 1.5, hy - 5]]).solid(body, { ow: 0.7 });
      d.poly([[cx - 5.2, hy - 3], [cx - 4.8, hy - 7.5], [cx - 2.4, hy - 4.5]]).fill('#C58B90');
      d.poly([[cx + 5.2, hy - 3], [cx + 4.8, hy - 7.5], [cx + 2.4, hy - 4.5]]).fill('#C58B90');
      d.ell(cx, hy, 7.2, 6.4).shade(body, hy - 6, hy + 6, { lt: 0.2, dk: 0.12 });
      if (blink) { d.line([[cx - 4.2, hy - 0.4], [cx - 1.8, hy - 0.4]]).stroke(PAL.wickEye, 1); d.line([[cx + 1.8, hy - 0.4], [cx + 4.2, hy - 0.4]]).stroke(PAL.wickEye, 1); }
      else { d.ell(cx - 3, hy - 0.4, 1.7, 2).fill(PAL.wickEye); d.ell(cx + 3, hy - 0.4, 1.7, 2).fill(PAL.wickEye); d.ell(cx - 3, hy - 0.2, 0.7, 1.4).fill(PAL.outline); d.ell(cx + 3, hy - 0.2, 0.7, 1.4).fill(PAL.outline); d.circ(cx - 3.6, hy - 1.2, 0.45).fill('#FFFFFF'); d.circ(cx + 2.4, hy - 1.2, 0.45).fill('#FFFFFF'); }
      d.poly([[cx - 1, hy + 1.8], [cx + 1, hy + 1.8], [cx, hy + 2.9]]).fill('#C58B90');
      d.line([[cx - 7.5, hy + 2], [cx - 3.5, hy + 2.6]]).stroke(hexA('#FFFFFF', 0.5), 0.5);
      d.line([[cx + 3.5, hy + 2.6], [cx + 7.5, hy + 2]]).stroke(hexA('#FFFFFF', 0.5), 0.5);
      if (withLamp) { d.rr(cx - 12, ground - 9, 4.4, 5.5, 1.2).solid(PAL.glassNight, { oc: PAL.iron, ow: 0.8 }); d.line([[cx - 9.8, ground - 9], [cx - 8, ground - 12]]).stroke(PAL.iron, 1); d.glow(cx - 9.8, ground - 6, 8, PAL.glow, 0.5); }
      c.restore();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Animals                                                             */
/* ------------------------------------------------------------------ */

function sheep({ frame = 0, seed = 's' }) {
  const w = 22, h = 18;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const cx = 11, ground = 16;
      d.shadow(cx, ground, 8, 2.4, 0.2);
      const legs = frame % 2 ? 1 : 0;
      d.rr(cx - 6, ground - 5, 2.6, 5 - legs, 1).solid('#4E4A5C', { ow: 0.5 });
      d.rr(cx + 3.5, ground - 5, 2.6, 5 - (1 - legs), 1).solid('#4E4A5C', { ow: 0.5 });
      for (const [x, y, r] of [[cx - 4, ground - 9, 4.6], [cx + 4, ground - 9, 4.6], [cx, ground - 11, 5.2], [cx - 1, ground - 7, 4.2]]) d.circ(x, y, r + 0.9).fill(dark(PAL.white, 0.35));
      for (const [x, y, r] of [[cx - 4, ground - 9, 4.6], [cx + 4, ground - 9, 4.6], [cx, ground - 11, 5.2], [cx - 1, ground - 7, 4.2]]) d.circ(x, y, r).fill(PAL.white);
      d.gleam(cx - 2, ground - 13, 4, 2, 0.5);
      d.ell(cx - 8, ground - 9.5, 3.4, 3).solid('#4E4A5C', { ow: 0.6 });
      d.ell(cx - 10.5, ground - 11.5, 1.6, 1).fill('#4E4A5C');
      d.circ(cx - 9, ground - 10.3, 0.7).fill('#FFFFFF');
      d.circ(cx - 9, ground - 10.3, 0.35).fill(PAL.outline);
    },
  };
}

function chicken({ frame = 0 }) {
  const w = 12, h = 12;
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      const cx = 6, ground = 11;
      d.shadow(cx, ground, 4, 1.4, 0.18);
      d.line([[cx - 1.5, ground - 3.5], [cx - 1.5, ground]]).stroke(PAL.coinDark, 1);
      d.line([[cx + 1.5, ground - 3.5], [cx + 1.5, ground - (frame % 2 ? 0.6 : 0)]]).stroke(PAL.coinDark, 1);
      d.ell(cx, ground - 6, 4.6, 3.4).shade(PAL.white, ground - 10, ground - 3, { lt: 0.1 });
      d.circ(cx + 3.5, ground - 9 + (frame % 2 ? 0.6 : 0), 2.4).solid(PAL.white, { ow: 0.7 });
      d.poly([[cx + 5.5, ground - 9.2], [cx + 8, ground - 8.6], [cx + 5.5, ground - 8]]).fill(PAL.coin);
      d.circ(cx + 3.5, ground - 11.6, 1).fill('#E04848'); d.circ(cx + 4.8, ground - 11.3, 0.9).fill('#E04848');
      d.circ(cx + 4.2, ground - 9.6, 0.5).fill(PAL.outline);
    },
  };
}

function dog({ frame = 0 }) {
  const w = 20, h = 15;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const cx = 10, ground = 13, col = '#C88A52';
      d.shadow(cx, ground, 7, 2, 0.18);
      d.rr(cx - 5, ground - 4, 2.4, 4 - (frame % 2), 1).solid(col, { ow: 0.5 });
      d.rr(cx + 2.5, ground - 4, 2.4, 4 - (1 - (frame % 2)), 1).solid(col, { ow: 0.5 });
      d.ell(cx, ground - 6.5, 6.5, 3.6).shade(col, ground - 10, ground - 3, { lt: 0.18 });
      d.line([[cx + 6, ground - 8], [cx + 9, ground - 12 + (frame % 2 ? 2 : 0)]]).stroke(col, 1.6);
      d.circ(cx - 6, ground - 9.5, 3.6).shade(col, ground - 13, ground - 6, { lt: 0.18 });
      d.ell(cx - 8.5, ground - 8.2, 1.6, 2.4).solid(dark(col, 0.25), { ow: 0.5 });
      d.circ(cx - 7, ground - 10.2, 0.6).fill(PAL.outline);
      d.circ(cx - 9.2, ground - 8.6, 0.8).fill(PAL.outline);
    },
  };
}

function duck({ frame = 0 }) {
  const w = 12, h = 10;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const cx = 6, ground = 8;
      d.ell(cx, ground - 2.2, 4.4, 2.6).shade(PAL.white, ground - 5, ground, { lt: 0.1 });
      d.circ(cx + 3.6, ground - 5.5 + (frame % 2 ? 0.4 : 0), 2).solid(PAL.white, { ow: 0.6 });
      d.poly([[cx + 5.4, ground - 5.6], [cx + 8, ground - 5], [cx + 5.4, ground - 4.4]]).fill(PAL.coin);
      d.circ(cx + 4.2, ground - 6, 0.5).fill(PAL.outline);
    },
  };
}

function koi({ variant = 0, frame = 0 }) {
  const w = 16, h = 8;
  const body = ['#F27A3A', '#FBF7F0', '#F2A83A', '#E4553F'][variant % 4];
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      const cx = 8, cy = 4, k = frame % 2 ? 1 : -1;
      d.poly([[cx - 7, cy], [cx - 5, cy - 1.6 * k], [cx - 4.5, cy + 1.6 * k]]).fill(body);
      d.ell(cx + 0.5, cy, 5.2, 2.4).solid(body, { oc: dark(body, 0.25), ow: 0.5 });
      if (variant % 4 === 1) { d.circ(cx + 1, cy - 0.8, 1.3).fill('#F27A3A'); d.circ(cx - 2, cy + 0.6, 1).fill('#2B2B33'); }
      if (variant % 4 === 0) d.circ(cx + 2, cy, 1.2).fill('#FBF7F0');
      d.circ(cx + 3.6, cy - 0.6, 0.45).fill(PAL.outline);
      d.gleam(cx, cy - 1, 2.5, 1, 0.35);
    },
  };
}

function leaf({ color = 0 }) {
  const w = 6, h = 5;
  const col = ['#E0913F', '#D9603F', '#E5B84A', '#F4B8CF', '#FFFFFF'][color % 5];
  return { w, h, ax: w / 2, ay: h / 2, draw(d) { d.ell(3, 2.5, 2.6, 1.5).solid(col, { ow: 0.4, oc: dark(col, 0.2) }); } };
}

function butterfly({ color = 0, frame = 0 }) {
  const w = 8, h = 7;
  const col = FLOWERS[color % FLOWERS.length];
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      const cx = 4, cy = 3.5, k = frame % 2 ? 0.6 : 1;
      d.ell(cx - 1.8 * k, cy - 0.6, 1.9 * k, 1.6).solid(col, { ow: 0.45 });
      d.ell(cx + 1.8 * k, cy - 0.6, 1.9 * k, 1.6).solid(col, { ow: 0.45 });
      d.ell(cx - 1.4 * k, cy + 1.4, 1.3 * k, 1.1).fill(col);
      d.ell(cx + 1.4 * k, cy + 1.4, 1.3 * k, 1.1).fill(col);
      d.line([[cx, cy - 1.5], [cx, cy + 2]]).stroke(PAL.outline, 0.8);
    },
  };
}

function bird({ frame = 0 }) {
  const w = 10, h = 6;
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      const y = frame % 2 ? 1.5 : 3.5;
      d.line([[1, 3], [5, y], [9, 3]]).stroke('#3A3846', 1.2);
    },
  };
}

function cloud({ seed = 'c', w = 40 }) {
  const r = rng(`cloud:${seed}`);
  const h = w * 0.5;
  const lobes = Array.from({ length: 4 }, (_, i) => [w * (0.22 + i * 0.19) + (r() - 0.5) * 4, h * (0.6 - (i % 2) * 0.2), h * (0.28 + r() * 0.16)]);
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      for (const [x, y, rr] of lobes) d.circ(x, y, rr).fill(hexA('#FFFFFF', 0.92));
      d.ell(w / 2, h * 0.72, w * 0.4, h * 0.22).fill(hexA('#FFFFFF', 0.92));
      d.ell(w / 2, h * 0.8, w * 0.36, h * 0.12).fill(hexA('#9FB8D8', 0.25));
    },
  };
}

function puff({ size = 1 }) {
  const w = 10 * size, h = 8 * size;
  return { w, h, ax: w / 2, ay: h / 2, draw(d) { d.circ(w / 2, h / 2, 3.2 * size).fill(hexA('#F1EDE6', 0.9)); d.circ(w / 2 - 2 * size, h / 2 + 1, 2.2 * size).fill(hexA('#F1EDE6', 0.85)); d.circ(w / 2 + 2 * size, h / 2 + 0.5, 2.4 * size).fill(hexA('#F1EDE6', 0.85)); } };
}

/** A lamp's glow: additive, cached by radius, colour and strength. */
function glow({ r = 40, color = PAL.glow, a = 0.5 }) {
  const w = r * 2 + 2, h = r * 2 + 2;
  return { w, h, ax: w / 2, ay: h / 2, draw(d) { d.glow(w / 2, h / 2, r, color, a); } };
}

/** A cloud's shadow on the ground: a soft dark ellipse. */
function cloudShadow({ w = 180 }) {
  const h = w * 0.55;
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      const c = d.c; c.save(); c.translate(w / 2, h / 2); c.scale(1, h / w);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, w / 2);
      g.addColorStop(0, 'rgba(20,50,20,0.14)'); g.addColorStop(0.7, 'rgba(20,50,20,0.08)'); g.addColorStop(1, 'rgba(20,50,20,0)');
      c.fillStyle = g; c.fillRect(-w / 2, -w / 2, w, w); c.restore();
    },
  };
}

/** A good, floating: used for the flights into buildings and pop-ups. */
function good({ kind = 'pages', size = 14 }) { return icon({ glyph: kind === 'pages' ? 'page' : kind === 'blooms' ? 'bloom' : kind === 'roots' ? 'root' : kind === 'thread' ? 'thread' : kind === 'coins' ? 'coin' : kind, size }); }

/** A speech bubble mark over a building: a plate with a glyph. */
function bubble({ glyph = 'page', tone = 'plain' }) {
  const w = 26, h = 30;
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      const bg = tone === 'ready' ? '#F6D77A' : tone === 'urgent' ? '#F26D7D' : PAL.white;
      d.rr(1.5, 1.5, w - 3, 21, 7).solid(bg, { oc: hexA(PAL.outline, 0.35), ow: 1 });
      d.poly([[w / 2 - 4, 21], [w / 2 + 4, 21], [w / 2, 27]]).solid(bg, { oc: hexA(PAL.outline, 0.35), ow: 1 });
      d.rr(4, 19, w - 8, 3.5, 1).fill(bg);
      drawGlyph(d, glyph, w / 2, 12, 6.2);
    },
  };
}

/* ------------------------------------------------------------------ */

const RECIPES = {
  tree, bush, flower, flowerPatch, grassTuft, rock, stump, hay,
  fence, signpost, board, lamp, well, cart, crate, bench, beds, hive, plotSign, scaffold,
  building, stall, person, wick, sheep, chicken, dog, duck, butterfly, bird, cloud, puff, koi, leaf,
  icon, good, bubble, glow, cloudShadow,
};
export const RECIPE_NAMES = Object.freeze(Object.keys(RECIPES));
export { drawGlyph };
