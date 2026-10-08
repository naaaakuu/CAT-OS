/**
 * paint-kit.mjs — the companion strip's hand, for friends painted in code
 * (tools/paint-sesame.mjs, tools/paint-biscuit.mjs).
 *
 * `kit(seed, { ODD })` runs in the page, inside a friend's own paint(); it
 * lifts the strip's paper and brush grain (Chai's feathers, Chai's and
 * Mallow's smooth faces) and returns the brush: a seeded random, colour ramps,
 * shapes with a painter's wobble and fur scallops, a warm key light from the
 * upper left, `part()` (base light, wet mottles, stroke passes, grain in the
 * midtones, a bevel, the ink), the bead eyes / nose / smile bake-pets finds a
 * face by, the golden-hour glaze and the strip's soft edge. Everything a
 * friend paints draws the random in the same order, so a seed paints the same
 * friend every run. `runPainter` opens the strip in headless Chrome, runs
 * paint(seed, kit) there and writes the PNG it returns.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { serveRepo, launchChrome, REPO_ROOT } from './cdp-lite.mjs';

/* Runs in the page (serialised with the friend's paint()): nothing outside it is in scope. */
export async function kit(SEED, { ODD: oddHex = [], INK: inkHex = '#4B332B' } = {}) {
  const W = 416, H = 576;
  let st = SEED >>> 0;
  const R = () => { st = (st + 0x6D2B79F5) | 0; let t = Math.imul(st ^ (st >>> 15), 1 | st); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * R();
  const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ctx2 = (c) => c.getContext('2d', { willReadFrequently: true });
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t);
  const rgb = (c, a = 1) => `rgba(${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')},${a})`;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const smooth = (v) => { v = clamp(v); return v * v * (3 - 2 * v); };
  /* a colour ramp over [first stop, last stop]; values above 1 are the light mass */
  const ramp = (stops) => (v) => {
    v = clamp(v, stops[0][0], stops[stops.length - 1][0]);
    for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) return mix(stops[i - 1][1], stops[i][1], (v - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]));
    return stops[stops.length - 1][1];
  };
  const S = (list) => list.map(([v, h]) => [v, hex(h)]);
  const ODD = oddHex.map(hex);   // the strays a brush picks up
  const INK = hex(inkHex);
  const LIGHT2 = [-0.63, -0.78];   // toward the light, on the page

  /* ---------------------------------------------------------------- */
  /* The strip's grain: luminance over its local mean, two bands.       */
  /* ---------------------------------------------------------------- */
  const strip = new Image();
  strip.src = '/assets/art/home-companions-v1.png';
  await strip.decode();
  const SW = strip.width, SH = strip.height;
  const scv = mk(SW, SH); const scg = ctx2(scv); scg.drawImage(strip, 0, 0);
  const sd = scg.getImageData(0, 0, SW, SH).data;
  const Ls = new Float32Array(SW * SH);
  for (let i = 0; i < SW * SH; i++) Ls[i] = 0.3 * sd[i * 4] + 0.59 * sd[i * 4 + 1] + 0.11 * sd[i * 4 + 2];
  const integral = new Float64Array((SW + 1) * (SH + 1));
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) integral[(y + 1) * (SW + 1) + x + 1] = Ls[y * SW + x] + integral[y * (SW + 1) + x + 1] + integral[(y + 1) * (SW + 1) + x] - integral[y * (SW + 1) + x];
  const mean = (x, y, r) => {
    const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(SW, x + r + 1), y1 = Math.min(SH, y + r + 1);
    return (integral[y1 * (SW + 1) + x1] - integral[y0 * (SW + 1) + x1] - integral[y1 * (SW + 1) + x0] + integral[y0 * (SW + 1) + x0]) / ((x1 - x0) * (y1 - y0));
  };
  const fineAt = (x, y) => { const m = mean(x, y, 3); return (Ls[y * SW + x] - m) / Math.max(m, 1); };
  const blotchAt = (x, y) => { const m = mean(x, y, 10); return (mean(x, y, 1) - m) / Math.max(m, 1); };

  /* Donor patches: clean painted fur or skin, far from any outline. */
  const PR = 15;
  const donors = (x0, x1, y0, y1, keep) => {
    const out = [];
    for (let y = y0; y <= y1; y += 4) for (let x = x0; x <= x1; x += 4) {
      let ok = true, lo = 1e9, sum = 0, n = 0;
      for (let dy = -PR - 8; dy <= PR + 8 && ok; dy += 2) for (let dx = -PR - 8; dx <= PR + 8; dx += 2) {
        const i = (y + dy) * SW + x + dx;
        if (sd[i * 4 + 3] < 240) { ok = false; break; }
        if (Math.abs(dx) <= PR + 2 && Math.abs(dy) <= PR + 2) { lo = Math.min(lo, Ls[i]); sum += Ls[i]; n++; }
      }
      if (!ok || lo < 0.62 * (sum / n) || !keep(x, y, sum / n)) continue;
      out.push([x, y]);
    }
    return out;
  };
  const chai = [355, 685];
  const furDonors = donors(chai[0] + 20, chai[1] - 20, 230, 590, (x, y, m) => m > 150 && m < 212 && Math.abs(blotchAt(x, y)) < 0.25);
  const smoothDonors = [
    ...donors(chai[0] + 60, chai[1] - 60, 250, 360, (x, y, m) => m > 222),
    ...donors(1800, 2140, 240, 600, (x, y, m) => m > 200 && sd[(y * SW + x) * 4 + 2] > 200),
  ];
  /* Quilt the grain over the canvas from random donor patches, each with a
     soft window; normalising by the root of the summed squared weights keeps
     the grain as strong as it was on the painting. */
  const quilt = (list) => {
    const F = new Float32Array(W * H), B = new Float32Array(W * H), w2 = new Float32Array(W * H);
    const step = 11;
    for (let cy = -PR; cy < H + PR; cy += step) for (let cx = -PR; cx < W + PR; cx += step) {
      const [sx, sy] = list[Math.floor(R() * list.length)];
      const ox = cx + Math.round(rr(-4, 4)), oy = cy + Math.round(rr(-4, 4)), flip = R() < 0.5 ? -1 : 1;
      for (let dy = -PR; dy <= PR; dy++) for (let dx = -PR; dx <= PR; dx++) {
        const x = ox + dx, y = oy + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const r = Math.hypot(dx, dy) / PR; if (r >= 1) continue;
        const w = Math.cos(r * Math.PI / 2) ** 2, i = y * W + x;
        F[i] += w * fineAt(sx + flip * dx, sy + dy); B[i] += w * blotchAt(sx + flip * dx, sy + dy); w2[i] += w * w;
      }
    }
    for (let i = 0; i < W * H; i++) { const k = w2[i] > 0 ? 1 / Math.sqrt(w2[i]) : 0; F[i] *= k; B[i] *= k; }
    return { F, B };
  };
  const GR = { fur: quilt(furDonors), smooth: quilt(smoothDonors) };

  /* ---------------------------------------------------------------- */
  /* Shapes                                                            */
  /* ---------------------------------------------------------------- */
  const resample = (pts, step, closed = true) => {
    const out = [pts[0]]; let carry = 0;
    for (let i = 1; i < pts.length + (closed ? 1 : 0); i++) {
      const a = pts[i - 1], b = pts[i % pts.length], seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let pos = step - carry;
      while (pos <= seg) { const k = pos / seg; out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); pos += step; }
      carry = seg - (pos - step);
    }
    return out;
  };
  /* Gaussian smoothing along a closed outline (r in points): no corners survive it. */
  const smoothClosed = (pts, r) => {
    const n = pts.length, K = Math.ceil(r * 2.5), out = [];
    for (let i = 0; i < n; i++) {
      let sx = 0, sy = 0, sw = 0;
      for (let k = -K; k <= K; k++) { const w = Math.exp(-(k * k) / (2 * r * r)), p = pts[(i + k + n) % n]; sx += p[0] * w; sy += p[1] * w; sw += w; }
      out.push([sx / sw, sy / sw]);
    }
    return out;
  };
  const closed = (pts, r = 2) => smoothClosed(resample(pts, 1.2), r);
  /* A closed outline from fn(t), t in [0,1) clockwise on screen, with a
     painter's wobble and fur scallops. A scallop is a round bump (a raised
     cosine, so its top is round and its feet are smooth), sheared along the
     edge by `bend` so it is combed one way. `clusters` are runs of 2-3
     scallops; the notch between two of them gets a short ink stroke into the
     fur (returned as pts.notches). */
  const shape = (fn, { N = 1600, scallops = [], clusters = [], wobble = 0.8, smoothR = 2 } = {}) => {
    const sc = [...scallops], notchT = [];
    for (const c of clusters) {
      const n = c.n ?? 3, sp = c.sp ?? 0.015;
      for (let i = 0; i < n; i++) {
        const t = c.t + (i - (n - 1) / 2) * sp + rr(-0.12, 0.12) * sp;
        sc.push({ t, w: sp * (c.w ?? 0.62), h: rr(c.h[0], c.h[1]) * (i === 0 || i === n - 1 ? 0.85 : 1), bend: c.bend * rr(0.8, 1.2) });
        if (i) notchT.push({ t: t - sp / 2, bend: c.bend });
      }
    }
    const base = Array.from({ length: N }, (_, i) => fn(i / N));
    const ph = [rr(0, 7), rr(0, 7), rr(0, 7)];
    const frame = (i) => {
      const a = base[(i + N - 1) % N], b = base[(i + 1) % N];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; return [tx / l, ty / l];
    };
    const disp = (t) => {
      let d = wobble * (0.6 * Math.sin(2 * Math.PI * 4 * t + ph[0]) + 0.35 * Math.sin(2 * Math.PI * 9 * t + ph[1]) + 0.25 * Math.sin(2 * Math.PI * 19 * t + ph[2]));
      let s = 0;
      for (const f of sc) {
        let u = t - f.t; u -= Math.round(u); u /= f.w;
        if (Math.abs(u) < 1) { const k = 0.5 + 0.5 * Math.cos(Math.PI * u); d += f.h * k; s += (f.bend ?? 0) * f.h * k * k; }
      }
      return [d, s];
    };
    const pts = base.map((p, i) => {
      const [tx, ty] = frame(i), [d, s] = disp(i / N);
      return [p[0] + ty * d + tx * s, p[1] - tx * d + ty * s];
    });
    const out = closed(pts, smoothR);
    out.notches = notchT.map(({ t, bend }) => {
      const i = Math.round(t * N + N) % N, [tx, ty] = frame(i), [d] = disp(i / N), p = base[i];
      return { x: p[0] + ty * d, y: p[1] - tx * d, nx: ty, ny: -tx, tx, ty, bend };
    });
    return out;
  };
  const toPath = (pts) => { const p = new Path2D(); p.moveTo(...pts[0]); for (const q of pts) p.lineTo(...q); p.closePath(); return p; };
  const ellipseFn = (cx, cy, rx, ry, rot = 0) => (t) => {
    const a = -Math.PI / 2 + t * 2 * Math.PI, x = rx * Math.cos(a), y = ry * Math.sin(a);
    return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
  };
  /* A chubby tube along a quadratic curve P0 -> P1 -> P2, radius r0 at the
     start to r1 at the end plus a bulge in the middle, round at both ends. */
  const tube = (P0, P1, P2, r0, r1, bulge = 0) => {
    const N = 80, Q = (t) => [0, 1].map((k) => (1 - t) * (1 - t) * P0[k] + 2 * (1 - t) * t * P1[k] + t * t * P2[k]);
    const D = (t) => [0, 1].map((k) => 2 * (1 - t) * (P1[k] - P0[k]) + 2 * t * (P2[k] - P1[k]));
    const rad = (t) => r0 + (r1 - r0) * t + bulge * Math.sin(Math.PI * t);
    const L = [], Rt = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = Q(t), d = D(t), l = Math.hypot(...d), nx = -d[1] / l, ny = d[0] / l, r = rad(t);
      L.push([p[0] + nx * r, p[1] + ny * r]); Rt.push([p[0] - nx * r, p[1] - ny * r]);
    }
    const cap = (c, a0, r) => Array.from({ length: 23 }, (_, k) => { const a = a0 - (Math.PI * (k + 1)) / 24; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; });
    const aE = Math.atan2(D(1)[1], D(1)[0]), aS = Math.atan2(D(0)[1], D(0)[0]);
    return closed([...L, ...cap(P2, aE + Math.PI / 2, r1), ...Rt.reverse(), ...cap(P0, aS - Math.PI / 2, r0)], 2.5);
  };

  /* ---------------------------------------------------------------- */
  /* Light: an ellipsoid in a warm key from the upper left, front.     */
  /* ---------------------------------------------------------------- */
  const LV = (() => { const v = [-0.58, -0.66, 0.5], l = Math.hypot(...v); return v.map((c) => c / l); })();
  const formOf = (f, x, y) => {
    let dx = x - f.cx, dy = y - f.cy;
    if (f.rot) { const c = Math.cos(-f.rot), s = Math.sin(-f.rot); [dx, dy] = [dx * c - dy * s, dx * s + dy * c]; }
    let nx = dx / f.rx, ny = dy / f.ry; const q = Math.min(1, nx * nx + ny * ny);
    if (f.rot) { const c = Math.cos(f.rot), s = Math.sin(f.rot); [nx, ny] = [nx * c - ny * s, nx * s + ny * c]; }
    const nz = Math.sqrt(Math.max(0, 1 - q)), l = Math.hypot(nx, ny, nz) || 1;
    const dot = (nx * LV[0] + ny * LV[1] + nz * LV[2]) / l;
    /* half-lambert with more contrast, a core shadow just past the
       terminator, and a creamy light mass where the key hits square on */
    let v = 0.45 + 0.5 * dot;
    v -= 0.1 * Math.exp(-(((dot - 0.06) / 0.2) ** 2));
    v += 0.2 * smooth((dot - 0.78) / 0.2);
    return { v: clamp(v, 0, 1.15), q, dot, side: clamp(0.5 + 0.5 * (nx * 0.5 + ny * 0.9)) };
  };

  /* ---------------------------------------------------------------- */
  /* Painting a part                                                   */
  /* ---------------------------------------------------------------- */
  const maskOf = (path, blur = 0) => {
    const c = mk(), g = ctx2(c);
    if (blur) g.filter = `blur(${blur}px)`;
    g.fillStyle = '#000'; g.fill(path);
    const d = g.getImageData(0, 0, W, H).data, a = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3] / 255;
    return a;
  };
  const alphaOf = (cv, blur = 0) => {
    const c = mk(), g = ctx2(c); if (blur) g.filter = `blur(${blur}px)`; g.drawImage(cv, 0, 0);
    const d = g.getImageData(0, 0, W, H).data, a = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3] / 255;
    return a;
  };
  const dab = (g, x, y, len, wid, ang, col, alpha) => {
    g.fillStyle = rgb(col, alpha);
    g.beginPath(); g.ellipse(x, y, len, wid, ang, 0, Math.PI * 2); g.fill();
  };
  /* a stroke of the brush: round at the root, pointed at the tip, along +x */
  const lock = (L, w, bend) => {
    const p = new Path2D(), tx = L * 0.62, ty = bend * w;
    p.moveTo(tx, ty);
    p.bezierCurveTo(L * 0.18, -w * 0.5 + ty * 0.5, -L * 0.38, -w * 0.62, -L * 0.38, 0);
    p.bezierCurveTo(-L * 0.38, w * 0.62, L * 0.18, w * 0.5 + ty * 0.5, tx, ty);
    return p;
  };
  /* Strokes on a jittered grid, painted from the bottom up so each upper
     stroke lies over the roots of the ones below. Each takes one colour (the
     light at its root, so neighbours step in value like paint, not a
     gradient), a darker crease pushed down and away from the light (strong
     in shadow, faint in the light), a lit edge on the side facing the light,
     and a few bristle streaks along it. `only` picks fur or skin; `where`
     weights by light value. */
  const strokePass = (g, { m, form, flow, colour, skinAt, bbox, step, len, wid, alpha, crease = 0, lit = 0, bristle = 0, jit = 0.06, odd = 0.1, only = null, where = null, spread = 0.16 }) => {
    const at = [];
    for (let y = bbox[1] - step; y < bbox[3] + step; y += step * 0.72) for (let x = bbox[0] - step; x < bbox[2] + step; x += step) {
      const px = x + rr(-0.5, 0.5) * step, py = y + rr(-0.45, 0.45) * step;
      if (px < 1 || py < 1 || px >= W - 1 || py >= H - 1 || !(m[Math.round(py) * W + Math.round(px)] > 0.25)) continue;
      const sk = skinAt(px, py) > rr(0.35, 0.65);
      if ((only === 'fur' && sk) || (only === 'skin' && !sk)) continue;
      if (where && R() > where(formOf(form, px, py).v)) continue;
      at.push([px, py]);
    }
    at.sort((a, b) => b[1] - a[1]);
    for (const [x, y] of at) {
      const f = formOf(form, x, y), a = flow(x, y) + rr(-spread, spread);
      const L = rr(len[0], len[1]), w = rr(wid[0], wid[1]), bend = rr(-0.4, 0.4), v = f.v + rr(-jit, jit);
      let col = colour(x, y, v, true);
      if (R() < odd) col = mix(col, ODD[Math.floor(R() * ODD.length)], rr(0.15, 0.35));
      const shade = 1 - smooth(f.v * 1.15);
      if (crease) {
        g.save(); g.translate(x + 1.5 + 2.4 * shade, y + 2.4 + 2.6 * shade); g.rotate(a); g.filter = 'blur(1.4px)';
        g.fillStyle = rgb(colour(x, y, v - 0.32, true), crease * (0.25 + 0.6 * shade)); g.fill(lock(L * 1.06, w * 1.12, bend)); g.restore();
      }
      g.save(); g.translate(x, y); g.rotate(a);
      const body = lock(L, w, bend);
      g.fillStyle = rgb(col, alpha); g.fill(body);
      if (bristle) {
        g.save(); g.clip(body); g.lineCap = 'round';
        const n = 2 + Math.floor(R() * 3);
        for (let k = 0; k < n; k++) {
          const off = rr(-0.55, 0.55) * w, c2 = colour(x, y, v + (k % 2 ? 0.12 : -0.13), true);
          g.strokeStyle = rgb(c2, bristle * rr(0.45, 0.9)); g.lineWidth = rr(0.8, 1.7);
          g.beginPath(); g.moveTo(-L * 0.4, off); g.quadraticCurveTo(0, off + bend * w * 0.4, L * 0.62, off * 0.3 + bend * w); g.stroke();
        }
        g.restore();
      }
      if (lit) {
        const ly = LIGHT2[0] * -Math.sin(a) + LIGHT2[1] * Math.cos(a), sg = ly < 0 ? -1 : 1;
        g.translate(-L * 0.06, sg * w * 0.24);
        g.fillStyle = rgb(colour(x, y, v + 0.15, true), lit * smooth(f.v * 1.3 - 0.15) * (0.5 + 0.5 * Math.abs(ly)));
        g.fill(lock(L * 0.78, w * 0.48, bend * 1.4));
      }
      g.restore();
    }
  };
  /* The outline: an ink line, thin on the lit side, heavy underneath.
     `fade(x, y)` (0..1) lets a line die away where a part grows out of another. */
  const outline = (g, pts, { w = 3.4, form = null, col = INK, k = [0.6, 1.5], fade = null } = {}) => {
    const n = pts.length, ph = [rr(0, 7), rr(0, 7)];
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    for (let i = 0; i < n; i += 2) {
      const a = pts[i], b = pts[(i + 2) % n], t = i / n;
      const side = form ? formOf(form, a[0], a[1]).side : 0.5;
      const fa = fade ? fade(a[0], a[1]) : 1; if (fa <= 0.02) continue;
      const lw = w * (k[0] + (k[1] - k[0]) * side) * (1 + 0.12 * Math.sin(2 * Math.PI * 5 * t + ph[0]) + 0.08 * Math.sin(2 * Math.PI * 13 * t + ph[1]));
      g.strokeStyle = rgb(mix(col, [100, 72, 64], 0.12 + 0.14 * Math.sin(2 * Math.PI * 3 * t + ph[1]) + 0.12 * (1 - side)), fa);
      g.lineWidth = lw * (0.4 + 0.6 * fa); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
    }
    g.restore();
  };
  /* the notch between two fur scallops: a short tapered ink stroke into the fur */
  const notchInk = (g, notches, len = 8) => {
    g.save(); g.lineCap = 'round';
    for (const { x, y, nx, ny, tx, ty, bend } of notches) {
      const L = len * rr(0.8, 1.2), ex = x - nx * L + tx * bend * L * 0.5, ey = y - ny * L + ty * bend * L * 0.5;
      const mx = x - nx * L * 0.45 + tx * bend * L * 0.1, my = y - ny * L * 0.45 + ty * bend * L * 0.1;
      g.strokeStyle = rgb(INK, 0.85); g.lineWidth = 2.6; g.beginPath(); g.moveTo(x, y); g.lineTo(mx, my); g.stroke();
      g.strokeStyle = rgb(INK, 0.55); g.lineWidth = 1.3; g.beginPath(); g.moveTo(mx, my); g.quadraticCurveTo((mx + ex) / 2 + tx * bend, (my + ey) / 2 + ty * bend, ex, ey); g.stroke();
    }
    g.restore();
  };
  /* base light per pixel, wet mottles, strokes, the strip's grain in the
     midtones, a bevel, the ink. `skin` (0..1, or a function of x, y): 0 is
     fur, 1 is smooth skin, which takes the smooth grain. */
  const part = ({ pts, form, colour, flow, layers = [], mottle = 1, skin = 0, gain = [0.45, 0.72], line = 3.5, lineK, fade = null, bevel = null, extra = null }) => {
    const skinAt = typeof skin === 'function' ? skin : () => skin;
    const c = mk(), g = ctx2(c), path = toPath(pts);
    const m = maskOf(path), mb = maskOf(path, 6);
    const img = g.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!m[i]) continue;
      const col = colour(x, y, formOf(form, x, y).v);
      d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = m[i] * 255;
    }
    g.putImageData(img, 0, 0);
    g.save(); g.clip(path);
    let x0 = W, y0 = H, x1 = 0, y1 = 0; for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const bbox = [x0, y0, x1, y1];
    /* big wet mottles first, stray colours and all, blurred like pooled paint */
    if (mottle) {
      const lay = mk(), lg = ctx2(lay), n = Math.round(((x1 - x0) * (y1 - y0)) / 600 * mottle);
      for (let k = 0; k < n; k++) {
        const x = rr(x0, x1), y = rr(y0, y1); if (!(m[Math.round(y) * W + Math.round(x)] > 0.5)) continue;
        let col = colour(x, y, formOf(form, x, y).v + rr(-0.1, 0.1), true);
        if (R() < 0.4) col = mix(col, ODD[Math.floor(R() * ODD.length)], rr(0.2, 0.4));
        dab(lg, x, y, rr(13, 26), rr(8, 15), flow(x, y) + rr(-0.6, 0.6), col, rr(0.14, 0.26));
      }
      g.filter = 'blur(2.5px)'; g.drawImage(lay, 0, 0); g.filter = 'none';
    }
    for (const p of layers) {
      const lay = mk(), lg = ctx2(lay);
      strokePass(lg, { m, form, flow, colour, skinAt, bbox, ...p });
      /* `cut`: [mask canvas, composite op] keeps fur strokes off the face and skin strokes on it */
      if (p.cut) { lg.globalCompositeOperation = p.cut[1]; lg.drawImage(p.cut[0], 0, 0); }
      g.filter = `blur(${p.blur ?? 0.5}px)`; g.drawImage(lay, 0, 0); g.filter = 'none';
    }
    extra?.(g);
    g.restore();
    /* the grain (strongest in the midtones), a little pooling on the shadow side, and the bevel */
    const mv = bevel ? maskOf(path, bevel.w) : null;
    const id = g.getImageData(0, 0, W, H), e = id.data;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (!e[i * 4 + 3]) continue;
      const f = formOf(form, x, y), edge = clamp((1 - mb[i]) * 2 - 0.1);
      const gk = typeof gain === 'function' ? gain(x, y) : gain;
      const mid = 0.35 + 0.65 * clamp(1 - Math.abs(f.v - 0.55) / 0.6);
      const sk = skinAt(x, y), gf = GR.fur.F[i] * (1 - sk) + GR.smooth.F[i] * sk, gb = GR.fur.B[i] * (1 - sk) + GR.smooth.B[i] * sk;
      const k = (1 - edge * 0.2 * f.side * f.side) * (1 + clamp(mid * (gk[0] * gf + gk[1] * gb), -0.35, 0.35));
      let t = 0;
      if (mv && m[i] > 0.5) {
        const band = clamp((1 - mv[i]) * 2.2);
        if (band > 0) {
          const gx = mv[i + 1] - mv[i - 1], gy = mv[i + W] - mv[i - W], gl = Math.hypot(gx, gy) || 1;
          t = band * band * ((gx * -LIGHT2[0] + gy * -LIGHT2[1]) / gl) * bevel.k;
        }
      }
      for (let ch = 0; ch < 3; ch++) {
        let v = e[i * 4 + ch] * k;
        v = t > 0 ? v + (bevel.hi[ch] - v) * Math.min(1, t) * 0.8 : v * (1 + t * 0.5);
        e[i * 4 + ch] = v;
      }
    }
    g.putImageData(id, 0, 0);
    if (line) outline(g, pts, { w: line, form, k: lineK, fade });
    return c;
  };
  /* Fur, three scales: broad form strokes that model the egg, impasto dabs in
     the midtones and lights, and short locks with creases (Chai's clumps). */
  const FURLAYERS = [
    { step: 24, len: [30, 46], wid: [13, 19], alpha: 0.82, jit: 0.035, odd: 0.06, crease: 0.55, lit: 0.5, bristle: 0.5, only: 'fur', blur: 0.7, spread: 0.12 },
    { step: 12, len: [11, 17], wid: [7, 11], alpha: 0.7, jit: 0.1, odd: 0.2, bristle: 0.3, lit: 0.3, only: 'fur', where: (v) => smooth((v - 0.25) / 0.35), blur: 0.35 },
    { step: 19, len: [18, 26], wid: [8, 12], alpha: 0.6, jit: 0.04, odd: 0.04, crease: 0.75, lit: 0.55, only: 'fur', where: (v) => 0.25 + 0.75 * smooth((0.95 - v) / 0.5), blur: 0.55 },
  ];

  /* ---------------------------------------------------------------- */
  /* Over the whole figure, and the face bake-pets reads               */
  /* ---------------------------------------------------------------- */
  /* the golden hour: a warm soft-light glaze from (x0,y0) to (x1,y1), and a
     creamy glow centred on `glow` [x, y, r] where the light comes from */
  const glaze = (o, out, { from = [60, 150], to = [330, 540], glow = [96, 236, 230] } = {}) => {
    const gz = mk(), gg = ctx2(gz);
    const lg = gg.createLinearGradient(...from, ...to);
    lg.addColorStop(0, 'rgba(255,196,120,0.32)'); lg.addColorStop(0.6, 'rgba(236,166,104,0.22)'); lg.addColorStop(1, 'rgba(170,112,90,0.3)');
    gg.fillStyle = lg; gg.fillRect(0, 0, W, H);
    gg.globalCompositeOperation = 'destination-in'; gg.drawImage(out, 0, 0);
    o.save(); o.globalCompositeOperation = 'soft-light'; o.drawImage(gz, 0, 0); o.restore();
    const gl = o.createRadialGradient(glow[0], glow[1], 10, glow[0], glow[1], glow[2]);
    gl.addColorStop(0, 'rgba(246,234,238,0.14)'); gl.addColorStop(1, 'rgba(246,234,238,0)');
    o.save(); o.globalCompositeOperation = 'source-atop'; o.fillStyle = gl; o.fillRect(0, 0, W, H); o.restore();
  };
  /* two solid near-black bead eyes, each with a soft sheen dark enough that it stays one shape */
  const eyes = (o, EYE) => {
    for (const [ex, ey] of [EYE.L, EYE.R]) {
      o.save();
      o.fillStyle = '#231815'; o.beginPath(); o.ellipse(ex, ey, EYE.rx, EYE.ry, 0, 0, Math.PI * 2); o.fill();
      const gl = o.createRadialGradient(ex + 1, ey + 11, 0, ex + 1, ey + 11, 11);
      gl.addColorStop(0, 'rgba(70,52,52,0.9)'); gl.addColorStop(1, 'rgba(70,52,52,0)');
      o.clip(); o.fillStyle = gl; o.fillRect(ex - 13, ey - 2, 26, 24);
      o.restore();
      o.fillStyle = 'rgba(255,250,240,0.13)'; o.beginPath(); o.ellipse(ex - 3.8, ey - 7.5, 3.8, 5.2, -0.3, 0, Math.PI * 2); o.fill();
    }
  };
  /* a small pink nose, wider on top */
  const nose = (o, [nx, ny]) => {
    o.save();
    o.beginPath(); o.moveTo(nx - 7.5, ny - 3.2); o.quadraticCurveTo(nx, ny - 6, nx + 7.5, ny - 3.2); o.quadraticCurveTo(nx + 6, ny + 2.5, nx, ny + 4.6); o.quadraticCurveTo(nx - 6, ny + 2.5, nx - 7.5, ny - 3.2); o.closePath();
    const ng = o.createLinearGradient(nx, ny - 6, nx, ny + 5); ng.addColorStop(0, '#F2AFB4'); ng.addColorStop(1, '#D98A95');
    o.fillStyle = ng; o.fill(); o.lineWidth = 1.3; o.strokeStyle = 'rgba(176,104,112,0.9)'; o.stroke();
    o.fillStyle = 'rgba(255,240,236,0.85)'; o.beginPath(); o.ellipse(nx - 2.4, ny - 2.6, 2, 1.1, -0.2, 0, Math.PI * 2); o.fill();
    o.restore();
  };
  /* the soft ω smile under the nose, centred a fifth of the eye spacing below the eyes */
  const smile = (o, cx, EYE) => {
    const sy = EYE.L[1] + 0.2 * (EYE.R[0] - EYE.L[0]) + 1;
    o.save(); o.strokeStyle = '#3A2420'; o.lineWidth = 3.8; o.lineCap = 'round'; o.lineJoin = 'round';
    o.beginPath(); o.moveTo(cx - 14, sy - 2.5); o.quadraticCurveTo(cx - 7, sy + 6, cx, sy); o.quadraticCurveTo(cx + 7, sy + 6, cx + 14, sy - 2.5); o.stroke();
    o.restore();
  };
  /* The strip's edge is not cut clean: the ink bleeds about a pixel out,
     and the last few pixels in are a touch see-through. A 0.8 px blurred
     copy under the figure, then alpha eased over ~6 px inside the rim. */
  const finish = (out) => {
    const fin = mk(), fg = ctx2(fin);
    fg.filter = 'blur(0.8px)'; fg.drawImage(out, 0, 0); fg.filter = 'none'; fg.drawImage(out, 0, 0);
    const ab = alphaOf(fin, 3), id = fg.getImageData(0, 0, W, H), d = id.data;
    const curve = [[0, 0], [0.5, 0.62], [0.63, 0.84], [0.75, 0.9], [0.91, 0.95], [0.977, 0.982], [1, 1]];
    for (let i = 0; i < W * H; i++) {
      if (!d[i * 4 + 3]) continue;
      const b = ab[i]; let k = 1;
      for (let j = 1; j < curve.length; j++) if (b <= curve[j][0]) { const [a0, v0] = curve[j - 1], [a1, v1] = curve[j]; k = v0 + ((v1 - v0) * (b - a0)) / (a1 - a0); break; }
      /* past the rim pixel only the ink thins, never the lit fur behind a thin line */
      if (b > 0.6) k = 1 - (1 - k) * clamp((175 - (0.3 * d[i * 4] + 0.59 * d[i * 4 + 1] + 0.11 * d[i * 4 + 2])) / 55);
      d[i * 4 + 3] = Math.round(d[i * 4 + 3] * k);
    }
    fg.putImageData(id, 0, 0);
    return fin.toDataURL('image/png');
  };

  return {
    W, H, R, rr, mk, ctx2, hex, mix, rgb, clamp, smooth, ramp, S, ODD, INK, LIGHT2,
    resample, closed, shape, toPath, ellipseFn, tube, formOf,
    maskOf, alphaOf, dab, lock, outline, notchInk, part, FURLAYERS,
    glaze, eyes, nose, smile, finish,
  };
}

/** Paint a friend in headless Chrome over the strip and write `assets/art/<file>`. */
export async function runPainter(paint, seed, file) {
  const server = await serveRepo();
  const browser = await launchChrome({ width: 800, height: 600 });
  try {
    await browser.open(server.url + 'assets/art/home-companions-v1.png', 600);
    const url = await browser.evaluate(`(${paint})(${seed}, ${kit})`);
    const out = join(REPO_ROOT, 'assets/art', file);
    writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
    console.log(`wrote ${out}`);
  } finally {
    browser.close();
    server.close();
  }
}
