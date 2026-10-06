/**
 * paint-sesame.mjs — paint Sesame, the clock-tower mouse, in the companion
 * strip's hand.
 *
 *   node tools/paint-sesame.mjs
 *
 * The six older friends were painted by hand (assets/art/home-companions-v1.png).
 * Sesame is painted here, in headless Chrome, at the strip's scale and in its
 * manner: a warm golden key from the upper left (a pale lilac light mass on
 * the crown and cheek, a warm mauve-brown core shadow lower right); fur laid
 * in broad strokes that follow the egg of the body, each with a crease under
 * it and a lit edge, finer strokes on the ears and hard-edged pink strokes
 * curving round their bowls; a cream face mask with a fluffy but clear edge;
 * wet mottles of stray colour like Mochi's; a wobbly brown outline, thin on
 * the lit side, heavy underneath, broken by small rounded fur scallops and
 * eased off at the rim like the strip's; and the strip's own paper and brush
 * grain (Chai's feathers, Chai's and Mallow's smooth faces) lifted off the
 * painting and laid over the midtones. Seeded, so every run paints the same
 * mouse. Writes assets/art/home-companion-sesame.png, the input of
 * `node tools/bake-pets.mjs --only sesame` (and `--baby --only sesame`).
 *
 * The face is built the way bake-pets finds a face: two solid near-black
 * eyes, a small dark smile a fifth of the eye spacing below them, a light
 * nose, blush, cream skin round the eyes; and two feet with a gap between.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { serveRepo, launchChrome, REPO_ROOT } from './cdp-lite.mjs';

const SEED = 20261006;

/* Runs in the page. Returns a PNG data URL. */
async function paint(SEED) {
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

  /* Palette. Lilac fur in golden light: mauve-brown shadows, and a light
     mass that stays a pale lilac (never cream, or it runs into the face). */
  const FUR = ramp(S([[0, '#3F2C2E'], [0.15, '#574047'], [0.3, '#6F5762'], [0.45, '#867186'], [0.58, '#9C89A4'], [0.7, '#AF9DB8'], [0.82, '#BFAFC8'], [0.93, '#C9BAD2'], [1.03, '#D2C5DB'], [1.15, '#DACFE2']]));
  const CREAM = ramp(S([[0, '#9C8580'], [0.3, '#C2ADA2'], [0.55, '#DDCBBB'], [0.75, '#EBDDCB'], [0.95, '#F6ECDD'], [1.15, '#FFF7EA']]));
  const PINK = ramp(S([[0, '#83505D'], [0.3, '#AA7380'], [0.55, '#CB939A'], [0.78, '#E2B4B0'], [1, '#F2D5CA'], [1.15, '#F8E4D8']]));
  const FEET = ramp(S([[0, '#5E3644'], [0.25, '#8A5664'], [0.5, '#B47C86'], [0.75, '#D3A0A2'], [1, '#EBC6BD'], [1.15, '#F3D8CC']]));
  const PAW = ramp(S([[0, '#875462'], [0.35, '#B57D88'], [0.65, '#D8A5A9'], [1, '#F2D2CA'], [1.15, '#F8E2D8']]));
  const GOLD = ramp(S([[0, '#5E3B12'], [0.2, '#8E6020'], [0.42, '#C08D34'], [0.62, '#DCA845'], [0.82, '#EDC462'], [1, '#F8DC8E'], [1.15, '#FCEDBE']]));
  const ODD = [hex('#B5A398'), hex('#8E95B5'), hex('#C2A2AE'), hex('#C9A97A'), hex('#BF9F6E')];   // the strays a brush picks up
  const INK = hex('#4B332B');
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

  /* Sesame, in source px: body centre BX, feet on the ground at ~566. */
  const BX = 180, BY = 368, BRX = 160, BRY = 172;
  const bodyFn = (t) => {
    const a = -Math.PI / 2 + t * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a);
    const n = s > 0 ? 2.55 : 2.12;
    const px = Math.sign(c) * Math.abs(c) ** (2 / n), py = Math.sign(s) * Math.abs(s) ** (2 / n);
    const k = 0.84 + 0.16 * smooth((py + 1) / 1.35);
    return [BX + BRX * px * k + 4 * py * (1 - Math.abs(py)), BY + BRY * py];
  };
  /* t: 0 top, 0.25 right, 0.5 bottom, 0.75 left; scallops combed downward */
  const bodyPts = shape(bodyFn, {
    wobble: 0.9,
    clusters: [
      { t: 0.062, n: 2, sp: 0.016, h: [2.4, 3.2], bend: 0.6 },      // crown, off-centre toward the right ear
      { t: 0.205, n: 3, sp: 0.0145, h: [4.2, 5.6], bend: 0.9 },     // right cheek fluff
      { t: 0.795, n: 3, sp: 0.0145, h: [4.2, 5.6], bend: -0.9 },    // left cheek fluff
      { t: 0.315, n: 2, sp: 0.016, h: [3.4, 4.4], bend: 0.8 },      // flanks
      { t: 0.685, n: 2, sp: 0.016, h: [3.4, 4.4], bend: -0.8 },
    ],
    scallops: [{ t: 0.385, w: 0.012, h: 3, bend: 0.6 }, { t: 0.615, w: 0.012, h: 3, bend: -0.6 }],
  });
  const BODY = { cx: BX, cy: BY + 8, rx: BRX + 6, ry: BRY + 10 };
  /* fur hangs along the egg's meridians: out from the crown, down the sides, in under the belly */
  const meridian = (x, y) => {
    const ny = clamp((y - BY) / (BRY + 10), -0.97, 0.97), s = Math.max(0.5, Math.sqrt(1 - ny * ny));
    return Math.atan2((BRY + 10) * s, ((x - BX) * -ny) / s);
  };

  const earL = { cx: 96, cy: 186, rx: 62, ry: 59, rot: -0.3, dir: -1 }, earR = { cx: 266, cy: 182, rx: 63, ry: 59, rot: 0.28, dir: 1 };
  /* An ear is not a ball: flattened on the side that meets the head, a
     little fuller on the outer top, scaled by `k` for the inner bowl. */
  const earFn = (e, k = 1, dx = 0, dy = 0) => {
    const ah = Math.atan2(BY - e.cy, BX - e.cx), ao = ah + Math.PI + e.dir * 0.5;
    return (t) => {
      const a = -Math.PI / 2 + t * 2 * Math.PI;
      const s = 1 - 0.13 * Math.max(0, Math.cos(a - ah)) ** 2 + 0.035 * Math.cos(a - ao);
      return [e.cx + dx + k * e.rx * s * Math.cos(a), e.cy + dy + k * e.ry * s * Math.sin(a)];
    };
  };
  /* two small fur scallops on the outer rim, on the shadow side of each ear */
  const earPts = (e) => shape(earFn(e), { wobble: 0.9, smoothR: 3, clusters: [{ t: e.dir < 0 ? 0.665 : 0.325, n: 2, sp: 0.034, w: 0.6, h: [2.2, 3], bend: e.dir * 0.5 }] });
  const footL = { cx: 131, cy: 543, rx: 42, ry: 23, rot: -0.14 }, footR = { cx: 231, cy: 544, rx: 42, ry: 23, rot: 0.12 };

  /* The puzzle piece, tilted, held at two opposite corners so two whole square
     corners, the side knob and the socket stay clear of the paws.
     Sides top/right/bottom/left: knob out (1), socket in (-1), flat (0). */
  const PC = { cx: 180, cy: 446, S: 116, rot: 0.22, kr: 18, kc: 11, sides: [0, 1, 0, -1] };
  const pieceLocal = (x, y) => [PC.cx + x * Math.cos(PC.rot) - y * Math.sin(PC.rot), PC.cy + x * Math.sin(PC.rot) + y * Math.cos(PC.rot)];
  const piecePts = (() => {
    const h = PC.S / 2, { kr, kc } = PC, a = Math.sqrt(kr * kr - kc * kc), pts = [];
    PC.sides.forEach((side, e) => {
      const edge = [];
      if (!side) for (let x = -h; x < h; x += 1) edge.push([x, -h]);
      else {
        for (let x = -h; x < -a; x += 1) edge.push([x, -h]);
        const cy = -h - side * kc;
        const f0 = Math.atan2(-h - cy, -a), f1 = Math.atan2(-h - cy, a);
        const end = side > 0 ? f1 + 2 * Math.PI : f1 - 2 * Math.PI;
        for (let k = 0; k <= 48; k++) { const f = f0 + ((end - f0) * k) / 48; edge.push([kr * Math.cos(f), cy + kr * Math.sin(f)]); }
        for (let x = a; x < h; x += 1) edge.push([x, -h]);
      }
      const r = (e * Math.PI) / 2;
      for (const [x, y] of edge) pts.push([x * Math.cos(r) - y * Math.sin(r), x * Math.sin(r) + y * Math.cos(r)]);
    });
    /* a little rounding on the corners: wood, not a cut-out */
    return closed(pts.map(([x, y]) => pieceLocal(x, y)), 2.2);
  })();
  const pawAt = { L: pieceLocal(-PC.S / 2 + 6, PC.S / 2 - 7), R: pieceLocal(PC.S / 2 - 6, -PC.S / 2 + 7) };

  /* Arms: short chubby mittens that grow out of the flanks and curl in and
     down to the piece's corners. */
  const armL = { P: [[56, 444], [84, 452], [pawAt.L[0] - 8, pawAt.L[1] - 5]], r: [27, 19, 4] };
  const armR = { P: [[306, 394], [280, 384], [pawAt.R[0] + 8, pawAt.R[1] - 4]], r: [27, 19, 4] };
  for (const a of [armL, armR]) a.pts = tube(...a.P, ...a.r);

  /* The tail: a pink tube from behind the right hip, curling up. */
  const TAILW = (k) => 10.5 * (1 - k) + 5 * k;
  const tailPts = (() => {
    const P = [[304, 486], [335, 503], [368, 499], [392, 477], [400, 446], [393, 418], [375, 405], [358, 409], [352, 425], [361, 437]];
    const cr = (p0, p1, p2, p3, t) => [0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t));
    const line = [];
    for (let i = 0; i < P.length - 1; i++) for (let k = 0; k < 20; k++) line.push(cr(P[Math.max(0, i - 1)], P[i], P[i + 1], P[Math.min(P.length - 1, i + 2)], k / 20));
    line.push(P[P.length - 1]);
    const L = resample(line, 1.5, false), n = L.length, left = [], right = [];
    L.forEach((p, i) => {
      const a = L[Math.max(0, i - 1)], b = L[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const w = TAILW(i / n);
      left.push([p[0] + ty * w, p[1] - tx * w]); right.push([p[0] - ty * w, p[1] + tx * w]);
    });
    const tip = L[n - 1], [tx, ty] = [tip[0] - L[n - 4][0], tip[1] - L[n - 4][1]];
    const capPts = Array.from({ length: 9 }, (_, k) => { const a = Math.atan2(ty, tx) - Math.PI / 2 + (Math.PI * (k + 1)) / 10; return [tip[0] + Math.cos(a) * TAILW(1), tip[1] + Math.sin(a) * TAILW(1)]; });
    return { pts: closed([...left, ...capPts, ...right.reverse()], 1.5), line: L };
  })();

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

  const out = mk(), o = ctx2(out);
  const shadowOn = (path, dx, dy, blur, alpha, col = [74, 48, 70]) => {
    o.save(); o.globalCompositeOperation = 'source-atop'; o.filter = `blur(${blur}px)`;
    o.translate(dx, dy); o.fillStyle = rgb(col, alpha); o.fill(path); o.restore();
  };
  /* Fur, three scales: broad form strokes that model the egg, impasto dabs in
     the midtones and lights, and short locks with creases (Chai's clumps). */
  const FURLAYERS = [
    { step: 24, len: [30, 46], wid: [13, 19], alpha: 0.82, jit: 0.035, odd: 0.06, crease: 0.55, lit: 0.5, bristle: 0.5, only: 'fur', blur: 0.7, spread: 0.12 },
    { step: 12, len: [11, 17], wid: [7, 11], alpha: 0.7, jit: 0.1, odd: 0.2, bristle: 0.3, lit: 0.3, only: 'fur', where: (v) => smooth((v - 0.25) / 0.35), blur: 0.35 },
    { step: 19, len: [18, 26], wid: [8, 12], alpha: 0.6, jit: 0.04, odd: 0.04, crease: 0.75, lit: 0.55, only: 'fur', where: (v) => 0.25 + 0.75 * smooth((0.95 - v) / 0.5), blur: 0.55 },
  ];

  /* 1. the tail, behind everything */
  {
    const line = tailPts.line;
    const c = part({
      pts: tailPts.pts, form: { cx: 350, cy: 420, rx: 70, ry: 80 }, flow: () => 0, mottle: 0,
      colour: (x, y, v) => PINK(0.14 + 0.72 * v), skin: 1, gain: [0.7, 0.4], line: 3.4, lineK: [0.8, 1.3],
      extra: (g) => {
        /* the tube: a dark side below, a bright streak along its upper left */
        g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
        for (const [col, alpha, lw, off] of [[PINK(0.05), 0.55, 4.4, 0.5], [PINK(1.12), 0.9, 3, -0.4]]) {
          g.strokeStyle = rgb(col, alpha); g.lineWidth = lw; g.beginPath();
          line.forEach(([x, y], i) => { const w = TAILW(i / line.length); (i ? g.lineTo : g.moveTo).call(g, x + off * 0.75 * w, y + off * w); });
          g.stroke();
        }
        g.restore();
      },
    });
    o.drawImage(c, 0, 0);
  }
  /* 2. the ears, behind the head: a fine short fur on the rim, and a pink
     bowl laid in with hard-edged strokes that curve with the cup (Ginger's
     inner ears): a cream lip along the lit upper-left rim, a rose shadow
     just under it, lighter pink across the middle, deep rose at the base
     where the ear meets the head */
  for (const e of [earL, earR]) {
    const dir = e.dir, pts = earPts(e);
    const inner = { cx: e.cx - dir * 6 + 2, cy: e.cy + 8, rx: e.rx * 0.64, ry: e.ry * 0.66, rot: e.rot };
    const innerPath = toPath(shape(earFn(e, 0.65, -dir * 6 + 2, 8), { wobble: 1.2 }));
    const im = maskOf(innerPath, 1);
    const base = [e.cx - dir * 34, e.cy + 46];
    const imAt = (x, y) => im[clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)];
    /* where a point sits in the bowl: u along the light (1 = upper-left
       rim), down (1 = the base), r (0 centre .. 1 rim) */
    const ah = Math.atan2(BY - inner.cy, BX - inner.cx);
    const bowl = (x, y) => {
      const lx = (x - inner.cx) / inner.rx, ly = (y - inner.cy) / inner.ry, r = Math.hypot(lx, ly) || 1e-6;
      return { r, u: (lx * LIGHT2[0] + ly * LIGHT2[1]) / r, head: (lx * Math.cos(ah) + ly * Math.sin(ah)) / r, lx, ly };
    };
    const bowlV = (x, y) => {
      const b = bowl(x, y);
      return 0.74 + 0.16 * (-b.ly) - 0.36 * smooth(b.head * b.r * 1.2) - 0.1 * smooth((b.r - 0.55) / 0.3) * smooth(b.u);
    };
    const c = part({
      pts, form: e, flow: (x, y) => Math.atan2(y - base[1], x - base[0]), mottle: 0.6,
      colour: (x, y, v, isDab) => {
        const k = imAt(x, y), pink = PINK(clamp(bowlV(x, y), 0, 1.1));
        return isDab ? (R() < k ? pink : FUR(v)) : mix(FUR(v), pink, k);
      },
      layers: [
        { step: 6, len: [8, 12], wid: [2.6, 3.8], alpha: 0.7, crease: 0.3, lit: 0.45, only: 'fur', jit: 0.08, odd: 0.08, blur: 0.4, spread: 0.25 },
      ],
      gain: (x, y) => (imAt(x, y) > 0.5 ? [0.75, 0.45] : [0.4, 0.3]), skin: imAt, line: 3.7, lineK: [0.38, 1.55],
      extra: (g) => {
        g.save(); g.clip(innerPath);
        /* a stroke that curves with the cup: along the rings round the
           bowl's deepest point (low, toward the head), bent toward it */
        const deep = [inner.cx + 0.35 * inner.rx * Math.cos(ah), inner.cy + 0.35 * inner.ry * Math.sin(ah)];
        const cup = (x, y, L, w, col, alpha) => {
          const lx = (x - deep[0]) / inner.rx, ly = (y - deep[1]) / inner.ry;
          const a = Math.atan2(lx * inner.ry, -ly * inner.rx) + rr(-0.1, 0.1);
          const rho = Math.max(10, Math.hypot(x - deep[0], y - deep[1]));
          const toC = (deep[0] - x) * -Math.sin(a) + (deep[1] - y) * Math.cos(a) > 0 ? 1 : -1;
          const bend = clamp(toC * (0.62 * L) ** 2 / (2 * rho * w), -1.6, 1.6);
          g.save(); g.translate(x, y); g.rotate(a);
          const body = lock(L, w, bend); g.fillStyle = rgb(col, alpha); g.fill(body);
          /* bristle streaks along it, a shade up and a shade down */
          g.clip(body); g.lineCap = 'round';
          for (let k = 0, n = w > 5 ? 3 : 2; k < n; k++) {
            const off = rr(-0.5, 0.5) * w;
            g.strokeStyle = rgb(mix(col, k % 2 ? [255, 242, 232] : [96, 44, 60], rr(0.18, 0.3)), rr(0.5, 0.8)); g.lineWidth = rr(0.8, 1.6);
            g.beginPath(); g.moveTo(-L * 0.4, off); g.quadraticCurveTo(0, off + bend * w * 0.4, L * 0.62, off * 0.3 + bend * w); g.stroke();
          }
          g.restore();
        };
        const inBowl = (x, y) => im[Math.round(y) * W + Math.round(x)] > 0.4;
        const at = (rad0, rad1, uMin = -2) => {
          for (let tries = 0; tries < 40; tries++) {
            const ang = rr(0, Math.PI * 2), rad = rr(rad0, rad1);
            const x = inner.cx + Math.cos(ang) * rad * inner.rx, y = inner.cy + Math.sin(ang) * rad * inner.ry;
            if (inBowl(x, y) && bowl(x, y).u >= uMin) return [x, y];
          }
          return null;
        };
        g.filter = 'blur(0.35px)';
        /* a few broad strokes over the whole bowl, each one value, so they step like paint */
        for (let k = 0; k < 18; k++) {
          const p = at(0, 1.0); if (!p) continue;
          let col = PINK(clamp(bowlV(...p) + rr(-0.16, 0.16), 0.05, 1.1));
          if (R() < 0.12) col = mix(col, ODD[Math.floor(R() * 3)], rr(0.15, 0.3));
          cup(...p, rr(24, 36), rr(8, 12), col, rr(0.8, 0.92));
        }
        /* smaller strokes over them, the brush's texture */
        for (let k = 0; k < 26; k++) { const p = at(0, 0.95); if (p) cup(...p, rr(9, 14), rr(2.6, 3.8), PINK(clamp(bowlV(...p) + rr(-0.2, 0.2), 0.05, 1.1)), rr(0.75, 0.9)); }
        /* the rose shadow the lip throws, just inside the upper-left rim */
        for (let k = 0; k < 4; k++) { const p = at(0.68, 0.84, 0.2); if (p) cup(...p, rr(20, 28), rr(4, 5.5), PINK(rr(0.24, 0.36)), 0.8); }
        /* a few lighter planes across the middle */
        for (let k = 0; k < 6; k++) { const p = at(0.1, 0.7); if (p && bowl(...p).head < 0.3) cup(...p, rr(14, 20), rr(4.5, 6.5), PINK(clamp(bowlV(...p) + rr(0.07, 0.15), 0, 1.15)), 0.85); }
        /* deep rose pooled at the base, toward the head */
        for (let k = 0; k < 8; k++) { const p = at(0.45, 1.0); if (p && bowl(...p).head > 0.35) cup(...p, rr(18, 26), rr(6, 8), PINK(rr(0.12, 0.26)), 0.8); }
        /* the cream lip: the fur turning in over the rim, lit */
        for (let k = 0; k < 7; k++) { const p = at(0.84, 0.97, 0.6); if (p) cup(...p, rr(22, 30), rr(4.2, 6), mix(CREAM(1.05), PINK(1.1), rr(0.15, 0.4)), rr(0.85, 0.95)); }
        g.restore();
      },
    });
    notchInk(ctx2(c), pts.notches, 5);
    o.drawImage(c, 0, 0);
  }
  const bodyPath = toPath(bodyPts);
  shadowOn(bodyPath, 4, 6, 7, 0.35);   // the head shades the roots of the ears
  /* 3. the feet: rose pads, toes at the front, the body's shade on top */
  const feetPaths = [];
  for (const [f, dir] of [[footL, -1], [footR, 1]]) {
    const toeT = dir < 0 ? [0.6, 0.66, 0.72] : [0.28, 0.34, 0.4];
    const pts = shape(ellipseFn(f.cx, f.cy, f.rx, f.ry, f.rot), { wobble: 0.5, scallops: toeT.map((t) => ({ t, w: 0.035, h: 1.6 })) });
    feetPaths.push(toPath(pts));
    const c = part({
      pts, form: { ...f, cx: f.cx - 4, cy: f.cy - 9, ry: f.ry + 6 }, flow: () => f.rot + dir * 0.4, mottle: 0.5,
      colour: (x, y, v) => FEET(0.08 + 0.85 * v), skin: 1, gain: [0.8, 0.45], line: 3.4, lineK: [0.75, 1.45],
      layers: [{ step: 9, len: [9, 14], wid: [5, 8], alpha: 0.45, crease: 0.3, lit: 0.4, jit: 0.06, odd: 0.04 }],
      extra: (g) => {
        /* toes: a crease between each, a lit knuckle on each */
        const P = (t, r) => ellipseFn(f.cx, f.cy, f.rx * r, f.ry * r, f.rot)(t);
        g.save(); g.lineCap = 'round';
        for (const t of toeT) { const [x, y] = P(t, 0.8); dab(g, x - 1, y - 1.5, 7, 4.5, f.rot + dir * 0.5, FEET(0.9), 0.32); }
        for (let k = 0; k < 2; k++) {
          const t = (toeT[k] + toeT[k + 1]) / 2, [ax, ay] = P(t, 1.04), [bx, by] = P(t, 0.66);
          g.strokeStyle = rgb(mix(INK, [110, 60, 72], 0.25)); g.lineWidth = 2.6; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx) / 2 + dir, (ay + by) / 2, bx, by); g.stroke();
        }
        g.restore();
      },
    });
    o.drawImage(c, 0, 0);
  }
  /* 4. the body: lilac fur, a cream face and belly */
  const EYE = { L: [126, 328], R: [234, 328], rx: 12.4, ry: 19 };
  /* The cream mask, one clear symmetric shape: two cheek lobes round the
     eyes, the muzzle, and a narrow bridge between them, so the lilac comes
     down between the eyes as a short, even widow's peak. Melted together
     (blur, then cut at half) so the joins are round; the belly as well. */
  const faceCv = (() => {
    const c = mk(), g = ctx2(c); g.filter = 'blur(6px)'; g.fillStyle = '#000';
    for (const [cx, cy, rx, ry] of [[EYE.L[0] - 4, EYE.L[1] + 6, 50, 48], [EYE.R[0] + 4, EYE.R[1] + 6, 50, 48], [BX, 364, 78, 44], [BX, 326, 26, 26], [BX + 2, 494, 88, 52]]) {
      g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
    }
    const id = g.getImageData(0, 0, W, H); for (let i = 3; i < id.data.length; i += 4) id.data[i] = id.data[i] > 127 ? 255 : 0;
    g.putImageData(id, 0, 0);
    const c2 = mk(), g2 = ctx2(c2); g2.filter = 'blur(1.1px)'; g2.drawImage(c, 0, 0);
    return c2;
  })();
  const alphaOf = (cv, blur = 0) => {
    const c = mk(), g = ctx2(c); if (blur) g.filter = `blur(${blur}px)`; g.drawImage(cv, 0, 0);
    const d = g.getImageData(0, 0, W, H).data, a = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) a[i] = d[i * 4 + 3] / 255;
    return a;
  };
  const fm = alphaOf(faceCv), fw = alphaOf(faceCv, 14);
  const faceAt = (x, y) => fm[clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)];
  /* the cream is lit from inside out, like Chai's face: deeper toward its rim */
  const faceDeep = (x, y) => 1 - fw[clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)];
  /* the body throws its shade on the tops of the feet */
  for (const fp of feetPaths) { o.save(); o.clip(fp); o.filter = 'blur(4px)'; o.fillStyle = 'rgba(80,40,62,0.55)'; o.translate(3, 7); o.fill(bodyPath); o.restore(); }
  {
    const c = part({
      pts: bodyPts, form: BODY,
      flow: (x, y) => (faceAt(x, y) > 0.5 && y < 400 ? Math.atan2(y - 344, x - BX) : meridian(x, y)),
      colour: (x, y, v, isDab) => {
        const k = faceAt(x, y);
        const cream = CREAM(0.32 + 0.72 * v - 0.28 * faceDeep(x, y)), fur = FUR(v);
        return isDab ? (R() < k ? cream : fur) : mix(fur, cream, smooth(k));
      },
      layers: [
        ...FURLAYERS.map((p) => ({ ...p, cut: [faceCv, 'destination-out'] })),
        { step: 12, len: [13, 20], wid: [7, 11], alpha: 0.45, crease: 0.1, lit: 0.25, only: 'skin', jit: 0.05, odd: 0.03, blur: 0.8, cut: [faceCv, 'destination-in'] },
      ],
      gain: (x, y) => { const k = faceAt(x, y); return [0.26 + 0.08 * k, 0.5 - 0.06 * k]; },
      skin: (x, y) => faceAt(x, y), line: 4.2, lineK: [0.42, 1.55],
      extra: (g) => {
        /* the mask's edge, fluffy like Chai's facial disc: short cream tufts
           out into the lilac and a few lilac ones in, across the edge */
        const inBody = maskOf(bodyPath, 10);
        const tufts = [];
        for (let y = 236; y < 566; y += 3) for (let x = 16; x < 350; x += 3) {
          const k = faceAt(x, y);
          if (k < 0.25 || k > 0.75 || inBody[y * W + x] < 0.98 || R() < 0.6) continue;
          const gx = faceAt(x + 2, y) - faceAt(x - 2, y), gy = faceAt(x, y + 2) - faceAt(x, y - 2);
          if (Math.hypot(gx, gy) < 0.05) continue;
          tufts.push([x + rr(-1, 1), y + rr(-1, 1), Math.atan2(-gy, -gx)]);
        }
        for (const [x, y, a] of tufts) {
          const v = formOf(BODY, x, y).v, cream = R() < 0.64;
          const L = cream ? rr(7, 11) : rr(6, 9), w = cream ? rr(3.4, 4.8) : rr(3, 4);
          const col = cream ? CREAM(0.32 + 0.72 * v - 0.28 * faceDeep(x, y) + rr(-0.04, 0.04)) : FUR(v + rr(-0.06, 0.04));
          g.save(); g.translate(x, y); g.rotate(a + (cream ? 0 : Math.PI) + rr(-0.28, 0.28));
          g.fillStyle = rgb(col, cream ? 0.92 : 0.85); g.fill(lock(L, w, rr(-0.5, 0.5))); g.restore();
        }
        /* blush, a dabbed soft pink */
        for (const [bx, by] of [[EYE.L[0] - 22, EYE.L[1] + 27], [EYE.R[0] + 22, EYE.R[1] + 27]]) {
          const gr = g.createRadialGradient(bx, by, 0, bx, by, 22);
          gr.addColorStop(0, 'rgba(240,136,116,0.66)'); gr.addColorStop(0.6, 'rgba(240,140,120,0.4)'); gr.addColorStop(1, 'rgba(240,144,124,0)');
          g.save(); g.translate(bx, by); g.scale(1, 0.66); g.translate(-bx, -by); g.fillStyle = gr; g.beginPath(); g.arc(bx, by, 22, 0, Math.PI * 2); g.fill(); g.restore();
          for (let k = 0; k < 12; k++) dab(g, bx + rr(-13, 13), by + rr(-7, 7), rr(3, 6), rr(2, 3.5), rr(-0.4, 0.4), [238, 140, 122], rr(0.06, 0.16));
        }
      },
    });
    notchInk(ctx2(c), bodyPts.notches);
    o.drawImage(c, 0, 0);
  }

  /* 5. the puzzle piece, held in front of the belly: a thick wooden tile
     gilded gold, a lit rim along the top and left, its dark wall showing
     along the lower right, an engraved clock face, a scuffed corner */
  const pPath = toPath(piecePts);
  shadowOn(pPath, 8, 10, 6, 0.36);
  {
    const wall = piecePts.map(([x, y]) => [x + 4.6, y + 6]);
    const c = part({
      pts: wall, form: { cx: PC.cx, cy: PC.cy, rx: 110, ry: 110 }, flow: () => 0, mottle: 0, skin: 1,
      colour: (x, y, v) => GOLD(0.05 + 0.26 * v), gain: [0.5, 0.3], line: 3.8, lineK: [1.1, 1.2],
    });
    o.drawImage(c, 0, 0);
    const pf = { cx: PC.cx - 24, cy: PC.cy - 30, rx: 120, ry: 120 };
    const area = piecePts.reduce((a, p, i) => { const q = piecePts[(i + 1) % piecePts.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
    const face = part({
      pts: piecePts, form: pf, flow: () => PC.rot + 0.7, skin: 1, gain: [0.55, 0.35], line: 3.9, lineK: [1.05, 1.15],
      colour: (x, y, v) => GOLD(0.3 + 0.78 * v),
      layers: [{ step: 10, len: [12, 20], wid: [5, 8], alpha: 0.4, crease: 0.12, lit: 0.3, bristle: 0.5, jit: 0.07, odd: 0, spread: 0.08 }],
      extra: (g) => {
        g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
        /* a faint wood grain under the gilt, running with the piece */
        g.save(); g.translate(PC.cx, PC.cy); g.rotate(PC.rot);
        for (let k = 0; k < 9; k++) {
          const y0 = -50 + k * 12 + rr(-3, 3);
          g.strokeStyle = rgb(GOLD(0.18), rr(0.12, 0.22)); g.lineWidth = rr(1, 1.8); g.beginPath(); g.moveTo(-70, y0);
          for (let x = -70; x <= 80; x += 10) g.lineTo(x, y0 + 2.5 * Math.sin(x / 19 + k) + 1.5 * Math.sin(x / 7 + 2 * k));
          g.stroke();
        }
        /* the engraved clock: a ring, four ticks, two hands, cut in and lit
           on its lower right edge like Chai's embossed leaf */
        const cxk = -6, cyk = 2, rk = 21;
        const cut = (fn) => {
          for (const [col, a, w, dx, dy] of [[[255, 238, 186], 0.75, 1.6, 1.1, 1.1], [GOLD(0.12), 0.85, 2.4, 0, 0]]) {
            g.strokeStyle = rgb(col, a); g.lineWidth = w; g.save(); g.translate(dx, dy); fn(); g.restore();
          }
        };
        cut(() => { g.beginPath(); g.arc(cxk, cyk, rk, 0, Math.PI * 2); g.stroke(); });
        cut(() => { g.beginPath(); for (let q = 0; q < 4; q++) { const a = (q * Math.PI) / 2; g.moveTo(cxk + Math.cos(a) * (rk - 4), cyk + Math.sin(a) * (rk - 4)); g.lineTo(cxk + Math.cos(a) * (rk - 8), cyk + Math.sin(a) * (rk - 8)); } g.stroke(); });
        cut(() => { g.beginPath(); g.moveTo(cxk, cyk); g.lineTo(cxk, cyk - 13); g.moveTo(cxk, cyk); g.lineTo(cxk + 9, cyk + 4); g.stroke(); });
        g.fillStyle = rgb(GOLD(0.12), 0.9); g.beginPath(); g.arc(cxk, cyk, 2.4, 0, Math.PI * 2); g.fill();
        /* a scuffed top-left corner: the gilt rubbed thin, a few scratches */
        const sx = -PC.S / 2 + 12, sy = -PC.S / 2 + 12;
        const sg = g.createRadialGradient(sx - 6, sy - 6, 0, sx - 6, sy - 6, 20);
        sg.addColorStop(0, 'rgba(250,236,196,0.5)'); sg.addColorStop(1, 'rgba(250,236,196,0)');
        g.fillStyle = sg; g.fillRect(sx - 30, sy - 30, 50, 50);
        for (let k = 0; k < 5; k++) {
          const ax = sx + rr(-8, 10), ay = sy + rr(-8, 10), ang = rr(0.5, 1.1), l = rr(5, 11);
          g.strokeStyle = rgb(k % 2 ? [255, 244, 210] : GOLD(0.2), rr(0.35, 0.6)); g.lineWidth = rr(0.8, 1.3);
          g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + Math.cos(ang) * l, ay + Math.sin(ang) * l); g.stroke();
        }
        /* a soft sheen across the upper left, painted in two strokes */
        g.filter = 'blur(2px)';
        g.strokeStyle = 'rgba(255,246,214,0.5)'; g.lineWidth = 6;
        g.beginPath(); g.moveTo(-44, 26); g.quadraticCurveTo(-46, -20, -26, -40); g.stroke();
        g.strokeStyle = 'rgba(255,246,214,0.32)'; g.lineWidth = 3.5;
        g.beginPath(); g.moveTo(14, -44); g.lineTo(30, -44); g.stroke();
        g.restore();
        /* the bevel, painted: a lit rim along the edges that face the light,
           a dark rounded-over edge along the ones that turn away */
        const n = piecePts.length, sgn = area > 0 ? 1 : -1;
        for (let i = 0; i < n; i += 2) {
          const a = piecePts[i], b = piecePts[(i + 3) % n];
          let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
          const nx = -ty * sgn, ny = tx * sgn;   // inward
          const facing = -(nx * LIGHT2[0] + ny * LIGHT2[1]);   // outward normal toward the light
          const ins = facing > 0 ? 3.2 : 3;
          const p = [a[0] + nx * ins, a[1] + ny * ins], q = [b[0] + nx * ins, b[1] + ny * ins];
          if (facing > 0.05) { g.strokeStyle = rgb(GOLD(1.15), 0.95 * smooth(facing * 1.6)); g.lineWidth = 3.8; }
          else if (facing < -0.05) { g.strokeStyle = rgb(GOLD(0.22), 0.6 * smooth(-facing * 1.6)); g.lineWidth = 3.4; }
          else continue;
          g.beginPath(); g.moveTo(...p); g.lineTo(...q); g.stroke();
        }
        g.restore();
      },
    });
    o.drawImage(face, 0, 0);
  }
  /* 6. the arms, over the piece's corners, with their own ink and shading.
     Each grows out of the flank: paint and ink fade away at the shoulder. */
  const paws = [];
  for (const arm of [armL, armR]) {
    const [P0, P1, P2] = arm.P, r0 = arm.r[0];
    const ang = Math.atan2(P2[1] - P0[1], P2[0] - P0[0]), len = Math.hypot(P2[0] - P0[0], P2[1] - P0[1]);
    const form = { cx: (P0[0] + 2 * P1[0] + P2[0]) / 4 - 4, cy: (P0[1] + 2 * P1[1] + P2[1]) / 4 - 9, rx: len / 2 + 22, ry: r0 + 6, rot: ang };
    const d0 = [P1[0] - P0[0], P1[1] - P0[1]], l0 = Math.hypot(...d0);
    /* the shoulder's round end is hidden in the flank; the arm's sides run on into it */
    const root = (x, y) => smooth(((x - P0[0]) * d0[0] / l0 + (y - P0[1]) * d0[1] / l0 + r0 * 0.7) / (r0 * 0.9));
    const c = part({
      pts: arm.pts, form, flow: (x, y) => ang + 0.3 * Math.sin((x + y) / 40),
      colour: (x, y, v) => FUR(v + 0.05),
      layers: FURLAYERS.map((p) => ({ ...p, step: p.step * 0.7, len: p.len.map((l) => l * 0.62), wid: p.wid.map((l) => l * 0.72), only: null, spread: 0.1 })),
      line: 3.8, lineK: [0.85, 1.5], fade: root,
      extra: (g) => {
        /* the round of the arm: a lit band along its top, a shaded band under it */
        const Q = (t) => [0, 1].map((k) => (1 - t) * (1 - t) * P0[k] + 2 * (1 - t) * t * P1[k] + t * t * P2[k]);
        const Dq = (t) => [0, 1].map((k) => 2 * (1 - t) * (P1[k] - P0[k]) + 2 * t * (P2[k] - P1[k]));
        for (const [sg, col, a, wk] of [[1, FUR(1.12), 0.55, 0.42], [-1, FUR(0.12), 0.42, 0.5]]) {
          g.save(); g.filter = 'blur(3px)'; g.lineCap = 'round'; g.strokeStyle = rgb(col, a);
          g.lineWidth = arm.r[1] * wk * 2; g.beginPath();
          for (let k = 0; k <= 20; k++) {
            const t = 0.12 + 0.84 * k / 20, p = Q(t), d = Dq(t), l = Math.hypot(...d);
            let nx = -d[1] / l, ny = d[0] / l; if (nx * LIGHT2[0] + ny * LIGHT2[1] < 0) { nx = -nx; ny = -ny; }
            const r = arm.r[0] + (arm.r[1] - arm.r[0]) * t + arm.r[2] * Math.sin(Math.PI * t);
            (k ? g.lineTo : g.moveTo).call(g, p[0] + sg * nx * r * 0.58, p[1] + sg * ny * r * 0.58);
          }
          g.stroke(); g.restore();
        }
      },
    });
    const g = ctx2(c), id = g.getImageData(0, 0, W, H), e = id.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (e[i + 3]) e[i + 3] *= root(x, y); }
    g.putImageData(id, 0, 0);
    /* its shadow, on the belly and on the gold */
    const sh = mk(), shg = ctx2(sh); shg.drawImage(c, 0, 0); shg.globalCompositeOperation = 'source-in'; shg.fillStyle = 'rgb(70,40,64)'; shg.fillRect(0, 0, W, H);
    o.save(); o.globalCompositeOperation = 'source-atop'; o.filter = 'blur(3.5px)'; o.globalAlpha = 0.55; o.drawImage(sh, 3, 8); o.restore();
    o.drawImage(c, 0, 0);
    const dE = [P2[0] - P1[0], P2[1] - P1[1]], lE = Math.hypot(...dE);
    paws.push([P2[0] + (dE[0] / lE) * 9, P2[1] + (dE[1] / lE) * 9, Math.atan2(dE[1], dE[0])]);
  }
  /* 7. the paws, on the front of the piece, fingers curled over its face */
  for (const [px, py, rot] of paws) {
    const pts = closed(Array.from({ length: 200 }, (_, i) => ellipseFn(px, py, 16, 18.5, rot)(i / 200)), 1.5);
    const pp = toPath(pts);
    shadowOn(pp, 3, 4, 2.5, 0.45);
    const c = part({
      pts, form: { cx: px - 4, cy: py - 5, rx: 18, ry: 18 }, flow: () => rot, mottle: 0, skin: 1,
      colour: (x, y, v) => PAW(0.05 + 0.92 * v), gain: [0.7, 0.4], line: 3, lineK: [0.7, 1.35],
      layers: [{ step: 7, len: [7, 10], wid: [4, 6], alpha: 0.35, crease: 0.15, lit: 0.35, jit: 0.05, odd: 0 }],
      extra: (g) => {
        /* three fingers: two dark marks at the front, a lit knuckle on each */
        const c0 = Math.cos(rot), s0 = Math.sin(rot);
        const P = (a, b) => [px + a * c0 - b * s0, py + a * s0 + b * c0];
        g.save(); g.lineCap = 'round'; g.strokeStyle = rgb([104, 64, 62], 0.9); g.lineWidth = 2.1;
        for (const b of [-4.8, 4.8]) { const [ax, ay] = P(15.5, b * 1.05), [bx, by] = P(7, b * 0.85); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
        for (const b of [-9.5, 0, 9.5]) { const [x, y] = P(10, b - 1.5); dab(g, x - 1, y - 1, 3.2, 2.1, rot, PAW(1.1), 0.6); }
        g.restore();
      },
    });
    o.drawImage(c, 0, 0);
  }

  /* the golden hour over the whole figure: a warm soft-light glaze, and a
     creamy glow where the light comes from, as over the whole strip */
  {
    const gz = mk(), gg = ctx2(gz);
    const lg = gg.createLinearGradient(60, 150, 330, 540);
    lg.addColorStop(0, 'rgba(255,196,120,0.32)'); lg.addColorStop(0.6, 'rgba(236,166,104,0.22)'); lg.addColorStop(1, 'rgba(170,112,90,0.3)');
    gg.fillStyle = lg; gg.fillRect(0, 0, W, H);
    gg.globalCompositeOperation = 'destination-in'; gg.drawImage(out, 0, 0);
    o.save(); o.globalCompositeOperation = 'soft-light'; o.drawImage(gz, 0, 0); o.restore();
    const gl = o.createRadialGradient(96, 236, 10, 96, 236, 230);
    gl.addColorStop(0, 'rgba(246,234,238,0.14)'); gl.addColorStop(1, 'rgba(246,234,238,0)');
    o.save(); o.globalCompositeOperation = 'source-atop'; o.fillStyle = gl; o.fillRect(0, 0, W, H); o.restore();
  }
  /* 8. the face, crisp on top: eyes, nose, smile */
  for (const [ex, ey] of [EYE.L, EYE.R]) {
    o.save();
    o.fillStyle = '#231815'; o.beginPath(); o.ellipse(ex, ey, EYE.rx, EYE.ry, 0, 0, Math.PI * 2); o.fill();
    const gl = o.createRadialGradient(ex + 1, ey + 11, 0, ex + 1, ey + 11, 11);
    gl.addColorStop(0, 'rgba(70,52,52,0.9)'); gl.addColorStop(1, 'rgba(70,52,52,0)');
    o.clip(); o.fillStyle = gl; o.fillRect(ex - 13, ey - 2, 26, 24);
    o.restore();
    /* a soft sheen, dark enough that the eye stays one solid shape */
    o.fillStyle = 'rgba(255,250,240,0.13)'; o.beginPath(); o.ellipse(ex - 3.8, ey - 7.5, 3.8, 5.2, -0.3, 0, Math.PI * 2); o.fill();
  }
  const NOSE = [BX, 339];
  {
    const [nx, ny] = NOSE;
    o.save();
    o.beginPath(); o.moveTo(nx - 7.5, ny - 3.2); o.quadraticCurveTo(nx, ny - 6, nx + 7.5, ny - 3.2); o.quadraticCurveTo(nx + 6, ny + 2.5, nx, ny + 4.6); o.quadraticCurveTo(nx - 6, ny + 2.5, nx - 7.5, ny - 3.2); o.closePath();
    const ng = o.createLinearGradient(nx, ny - 6, nx, ny + 5); ng.addColorStop(0, '#F2AFB4'); ng.addColorStop(1, '#D98A95');
    o.fillStyle = ng; o.fill(); o.lineWidth = 1.3; o.strokeStyle = 'rgba(176,104,112,0.9)'; o.stroke();
    o.fillStyle = 'rgba(255,240,236,0.85)'; o.beginPath(); o.ellipse(nx - 2.4, ny - 2.6, 2, 1.1, -0.2, 0, Math.PI * 2); o.fill();
    o.restore();
  }
  {
    /* the mouse smile, a soft ω under the nose, centred a fifth of the eye spacing below the eyes */
    const sy = EYE.L[1] + 0.2 * (EYE.R[0] - EYE.L[0]) + 1;
    o.save(); o.strokeStyle = '#3A2420'; o.lineWidth = 3.8; o.lineCap = 'round'; o.lineJoin = 'round';
    o.beginPath(); o.moveTo(BX - 14, sy - 2.5); o.quadraticCurveTo(BX - 7, sy + 6, BX, sy); o.quadraticCurveTo(BX + 7, sy + 6, BX + 14, sy - 2.5); o.stroke();
    o.restore();
  }
  /* The strip's edge is not cut clean: the ink bleeds about a pixel out,
     and the last few pixels in are a touch see-through. A 0.8 px blurred
     copy under the figure, then alpha eased over ~6 px inside the rim. */
  {
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
  }
}

const server = await serveRepo();
const browser = await launchChrome({ width: 800, height: 600 });
try {
  await browser.open(server.url + 'assets/art/home-companions-v1.png', 600);
  const url = await browser.evaluate(`(${paint})(${SEED})`);
  const file = join(REPO_ROOT, 'assets/art/home-companion-sesame.png');
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`wrote ${file}`);
} finally {
  browser.close();
  server.close();
}
