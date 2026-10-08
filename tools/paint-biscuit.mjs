/**
 * paint-biscuit.mjs — paint Biscuit, the rose-cottage calico, in the companion
 * strip's hand.
 *
 *   node tools/paint-biscuit.mjs
 *
 * A chubby calico cat hugging a rose velvet cushion (the seat a sentence
 * takes), painted like Sesame (tools/paint-sesame.mjs) with the strip's brush,
 * light and grain from tools/paint-kit.mjs: a warm white coat in golden light,
 * a marmalade patch over the left ear and a charcoal one over the right with a
 * white blaze between them, strokes that pick one colour each so the patches
 * end in fur, not a line; cat ears with pink bowls and cream tufts; a fluffy
 * banded tail curling up behind; pale whiskers; a tufted cushion with pleats,
 * a button and gold tassels. Seeded, so every run paints the same cat. Writes
 * assets/art/home-companion-biscuit.png, the input of
 * `node tools/bake-pets.mjs --only biscuit` (and `--baby --only biscuit`).
 *
 * The face is built the way bake-pets finds a face: two solid near-black eyes,
 * a small dark smile a fifth of the eye spacing below them, a light nose,
 * blush, cream skin round the eyes; whiskers start outside the eyes' span and
 * are lighter than ink, so neither the eye nor the smile finder sees them; and
 * two feet with a gap between.
 */
import { runPainter } from './paint-kit.mjs';

const SEED = 20261009;

/* Runs in the page, with paint-kit's kit. Returns a PNG data URL. */
async function paint(SEED, kit) {
  const K = await kit(SEED, { ODD: ['#C9A97A', '#BF9F6E', '#B5A398', '#D8A48A', '#9DA4B8'] });   // the strays a brush picks up
  const { W, H, R, rr, mk, ctx2, mix, rgb, clamp, smooth, ramp, S, ODD, INK, LIGHT2, resample, closed, shape, toPath, ellipseFn, tube, formOf, maskOf, alphaOf, dab, lock, notchInk, part, FURLAYERS } = K;

  /* Palette. A calico in golden light: the white coat keeps warm grey-brown
     shadows so the egg still reads; marmalade and a warm charcoal (never
     ink-black, so no patch is ever taken for an eye); a rose velvet cushion. */
  const WHITE = ramp(S([[0, '#6A5650'], [0.15, '#816C64'], [0.3, '#9C877C'], [0.45, '#B6A294'], [0.58, '#CBB9A9'], [0.7, '#DCCCBB'], [0.82, '#E8DBCA'], [0.93, '#F1E6D6'], [1.03, '#F6EEE1'], [1.15, '#FAF5EC']]));
  const CREAM = ramp(S([[0, '#9C8580'], [0.3, '#C2ADA2'], [0.55, '#DDCBBB'], [0.75, '#EBDDCB'], [0.95, '#F6ECDD'], [1.15, '#FFF7EA']]));
  const ORANGE = ramp(S([[0, '#5C2E14'], [0.15, '#7B3F18'], [0.3, '#9A5420'], [0.45, '#B86B2B'], [0.58, '#CC8236'], [0.7, '#DA9644'], [0.82, '#E5A955'], [0.93, '#EDBA68'], [1.03, '#F2C67C'], [1.15, '#F6D397']]));
  const CHAR = ramp(S([[0, '#3E3230'], [0.15, '#463936'], [0.3, '#4F413D'], [0.45, '#594A45'], [0.58, '#63534D'], [0.7, '#6E5D56'], [0.82, '#7A6861'], [0.93, '#85736B'], [1.03, '#8F7D75'], [1.15, '#9A8880']]));
  const PINK = ramp(S([[0, '#83505D'], [0.3, '#AA7380'], [0.55, '#CB939A'], [0.78, '#E2B4B0'], [1, '#F2D5CA'], [1.15, '#F8E4D8']]));
  const ROSE = ramp(S([[0, '#5A2533'], [0.18, '#7E3446'], [0.36, '#A34A5E'], [0.54, '#C26477'], [0.72, '#D9848F'], [0.88, '#E9A7AA'], [1, '#F2C3C1'], [1.15, '#F8DCD6']]));
  const GOLD = ramp(S([[0, '#5E3B12'], [0.2, '#8E6020'], [0.42, '#C08D34'], [0.62, '#DCA845'], [0.82, '#EDC462'], [1, '#F8DC8E'], [1.15, '#FCEDBE']]));
  const PAWC = ramp(S([[0, '#8A776D'], [0.35, '#B9A698'], [0.65, '#DACBBB'], [1, '#F5ECDF'], [1.15, '#FBF5EC']]));
  const at = (a, x, y) => a[clamp(Math.round(y), 0, H - 1) * W + clamp(Math.round(x), 0, W - 1)];
  /* clockwise on screen (positive area with y down), as shape() wants */
  const cw = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; } return s > 0 ? pts : [...pts].reverse(); };
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

  /* Biscuit, in source px: body centre BX, feet on the ground at ~570. */
  const BX = 184, BY = 372, BRX = 158, BRY = 170;
  const bodyFn = (t) => {
    const a = -Math.PI / 2 + t * 2 * Math.PI, c = Math.cos(a), s = Math.sin(a);
    const n = s > 0 ? 2.55 : 2.12;
    const px = Math.sign(c) * Math.abs(c) ** (2 / n), py = Math.sign(s) * Math.abs(s) ** (2 / n);
    const k = 0.84 + 0.16 * smooth((py + 1) / 1.35);
    return [BX + BRX * px * k + 4 * py * (1 - Math.abs(py)), BY + BRY * py];
  };
  /* t: 0 top, 0.25 right, 0.5 bottom, 0.75 left; a cat's cheek ruff stands out further than a mouse's */
  const bodyPts = shape(bodyFn, {
    wobble: 0.9,
    clusters: [
      { t: 0.05, n: 2, sp: 0.016, h: [2.2, 3], bend: 0.6 },
      { t: 0.2, n: 3, sp: 0.015, h: [5, 6.6], bend: 0.9 },       // right cheek ruff
      { t: 0.8, n: 3, sp: 0.015, h: [5, 6.6], bend: -0.9 },      // left cheek ruff
      { t: 0.31, n: 2, sp: 0.016, h: [3.6, 4.6], bend: 0.8 },    // flanks
      { t: 0.69, n: 2, sp: 0.016, h: [3.6, 4.6], bend: -0.8 },
    ],
    scallops: [{ t: 0.385, w: 0.012, h: 3, bend: 0.6 }, { t: 0.615, w: 0.012, h: 3, bend: -0.6 }],
  });
  const BODY = { cx: BX, cy: BY + 8, rx: BRX + 6, ry: BRY + 10 };
  const meridian = (x, y) => {
    const ny = clamp((y - BY) / (BRY + 10), -0.97, 0.97), s = Math.max(0.5, Math.sqrt(1 - ny * ny));
    return Math.atan2((BRY + 10) * s, ((x - BX) * -ny) / s);
  };

  /* Ears: rounded triangles standing on the crown, a little out, bases buried
     in the head. Left marmalade, right charcoal: a calico's two-tone crown. */
  const triPts = (P, bulge) => {
    const cx = (P[0][0] + P[1][0] + P[2][0]) / 3, cy = (P[0][1] + P[1][1] + P[2][1]) / 3, out = [];
    for (let s = 0; s < 3; s++) {
      const a = P[s], b = P[(s + 1) % 3], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
      if (((a[0] + b[0]) / 2 - cx) * nx + ((a[1] + b[1]) / 2 - cy) * ny < 0) { nx = -nx; ny = -ny; }
      for (let k = 0; k < 240; k++) { const t = k / 240, d = bulge * L * Math.sin(Math.PI * t); out.push([a[0] + (b[0] - a[0]) * t + nx * d, a[1] + (b[1] - a[1]) * t + ny * d]); }
    }
    return cw(out);
  };
  const EARS = [
    { tip: [82, 136], bo: [64, 276], bi: [158, 214], dir: -1, coat: ORANGE },
    { tip: [290, 140], bo: [304, 276], bi: [212, 212], dir: 1, coat: CHAR },
  ];
  for (const e of EARS) {
    e.mid = lerp(e.bo, e.bi, 0.5);
    e.len = Math.hypot(e.tip[0] - e.mid[0], e.tip[1] - e.mid[1]);
    e.axis = Math.atan2(e.tip[1] - e.mid[1], e.tip[0] - e.mid[0]);
    e.poly = triPts([e.tip, e.bo, e.bi], 0.07);
    e.inner = triPts([lerp(e.tip, e.mid, 0.2), lerp(e.bo, e.mid, 0.3).map((v, i) => v - (i ? 7 : 0)), lerp(e.bi, e.mid, 0.3).map((v, i) => v - (i ? 7 : 0))], 0.05);
  }

  const footL = { cx: 136, cy: 547, rx: 41, ry: 23, rot: -0.14 }, footR = { cx: 234, cy: 548, rx: 41, ry: 23, rot: 0.12 };

  /* The cushion, hugged against the belly: stuffed round, its sides bulging,
     the seams pulling the four corners out into little points, a tufted
     button in the middle; it is deep enough to show its side below. */
  const CU = { cx: 184, cy: 450, a: 70, b: 54, rot: -0.1, depth: 10 };
  const cuLocal = (x, y) => [CU.cx + x * Math.cos(CU.rot) - y * Math.sin(CU.rot), CU.cy + x * Math.sin(CU.rot) + y * Math.cos(CU.rot)];
  const cushionPts = closed(Array.from({ length: 900 }, (_, i) => {
    const th = (i / 900) * 2 * Math.PI, c = Math.cos(th), s = Math.sin(th), n = 2.8;
    const r = (Math.abs(c / CU.a) ** n + Math.abs(s / CU.b) ** n) ** (-1 / n);
    const corner = Math.abs(Math.sin(2 * Math.atan2(s / CU.b, c / CU.a)));   // 1 on the diagonals
    const k = 0.97 + 0.13 * corner ** 10;
    return cuLocal(c * r * k, s * r * k);
  }), 2);
  const BUTTON = cuLocal(2, -2);
  const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => cuLocal(sx * CU.a * 0.84, sy * CU.b * 0.84));
  const pawAt = { L: cuLocal(-CU.a + 13, 6), R: cuLocal(CU.a - 13, -2) };

  /* Arms: short white mittens out of the flanks, round to the cushion's sides. */
  const armL = { P: [[58, 446], [84, 458], [pawAt.L[0] - 8, pawAt.L[1] - 5]], r: [27, 19, 4] };
  const armR = { P: [[310, 436], [286, 428], [pawAt.R[0] + 8, pawAt.R[1] - 4]], r: [27, 19, 4] };
  for (const a of [armL, armR]) a.pts = tube(...a.P, ...a.r);

  /* The tail: a thick fluffy tube from behind the right hip, curling up like a question. */
  const TAILW = (k) => 19 * (1 - k) + 15 * k;
  const tail = (() => {
    const P = [[296, 498], [334, 514], [370, 504], [392, 476], [400, 440], [396, 404], [384, 378], [368, 364], [352, 360]];
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
    const capPts = Array.from({ length: 15 }, (_, k) => { const a = Math.atan2(ty, tx) - Math.PI / 2 + (Math.PI * (k + 1)) / 16; return [tip[0] + Math.cos(a) * TAILW(1) * 1.06, tip[1] + Math.sin(a) * TAILW(1) * 1.06]; });
    const poly = cw(closed([...left, ...capPts, ...right.reverse()], 1.5));
    /* fluff: scallops all round, a tuft at the tip */
    const pts = shape((t) => poly[Math.floor(t * poly.length) % poly.length], {
      N: poly.length, wobble: 0.8, smoothR: 1.6,
      clusters: [0.08, 0.2, 0.32, 0.42, 0.5, 0.58, 0.7, 0.82, 0.93].map((t) => ({ t, n: 2, sp: 0.018, w: 0.6, h: [2.4, 3.4], bend: 0.5 })),
    });
    return { pts, line: L };
  })();
  /* how far along the tail a point is, 0 at the root to 1 at the tip */
  const alongTail = (x, y) => { let best = 1e9, bi = 0; for (let i = 0; i < tail.line.length; i += 2) { const q = tail.line[i], d = (q[0] - x) ** 2 + (q[1] - y) ** 2; if (d < best) { best = d; bi = i; } } return bi / tail.line.length; };
  const tailCoat = (k) => (k > 0.8 || (k > 0.48 && k < 0.6) ? 1 : 0);   // charcoal bands, a charcoal tip

  const out = mk(), o = ctx2(out);
  const shadowOn = (path, dx, dy, blur, alpha, col = [74, 50, 52]) => {
    o.save(); o.globalCompositeOperation = 'source-atop'; o.filter = `blur(${blur}px)`;
    o.translate(dx, dy); o.fillStyle = rgb(col, alpha); o.fill(path); o.restore();
  };

  /* 1. the tail, behind everything: fur combed along it, a dark side below, a lit streak on top */
  {
    const c = part({
      pts: tail.pts, form: { cx: 360, cy: 440, rx: 70, ry: 92 },
      flow: (x, y) => { const i = Math.min(tail.line.length - 2, Math.round(alongTail(x, y) * tail.line.length)), a = tail.line[i], b = tail.line[i + 1]; return Math.atan2(b[1] - a[1], b[0] - a[0]); },
      colour: (x, y, v, isDab) => { const k = alongTail(x, y), ch = tailCoat(k); return ch ? CHAR(v + 0.05) : ORANGE(v); },
      layers: FURLAYERS.map((p) => ({ ...p, step: p.step * 0.6, len: p.len.map((l) => l * 0.55), wid: p.wid.map((l) => l * 0.6), only: null, spread: 0.18 })),
      line: 3.6, lineK: [0.7, 1.45], mottle: 0.4,
      extra: (g) => {
        g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.filter = 'blur(2.5px)';
        for (const [sg, alpha, lw] of [[1, 0.35, 9], [-1, 0.3, 8]]) {
          g.beginPath();
          tail.line.forEach(([x, y], i) => {
            const a = tail.line[Math.max(0, i - 1)], b = tail.line[Math.min(tail.line.length - 1, i + 1)];
            let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
            if (nx * LIGHT2[0] + ny * LIGHT2[1] < 0) { nx = -nx; ny = -ny; }
            const w = TAILW(i / tail.line.length) * 0.55;
            (i ? g.lineTo : g.moveTo).call(g, x + sg * nx * w, y + sg * ny * w);
          });
          g.strokeStyle = sg > 0 ? `rgba(255,236,206,${alpha})` : `rgba(60,34,30,${alpha})`; g.lineWidth = lw; g.stroke();
        }
        g.restore();
      },
    });
    notchInk(ctx2(c), tail.pts.notches, 5);
    o.drawImage(c, 0, 0);
  }

  /* 2. the ears, behind the head: short fur on the rim in the ear's own coat,
     a pink bowl laid in with strokes running up toward the tip (deep rose at
     the base, lighter up the middle), and cream tufts out of the bowl */
  for (const e of EARS) {
    const pts = shape((t) => e.poly[Math.floor(t * e.poly.length) % e.poly.length], { N: e.poly.length, wobble: 0.9, smoothR: 7, clusters: [{ t: e.dir < 0 ? 0.2 : 0.8, n: 2, sp: 0.03, w: 0.6, h: [2, 2.8], bend: e.dir * 0.5 }] });
    const innerPath = toPath(shape((t) => e.inner[Math.floor(t * e.inner.length) % e.inner.length], { N: e.inner.length, wobble: 1.1, smoothR: 6 }));
    const im = maskOf(innerPath, 1), imAt = (x, y) => at(im, x, y);
    const ca = Math.cos(e.axis), sa = Math.sin(e.axis);
    /* 0 at the base of the ear, 1 at the tip; how far from the bowl's midline, and on which side */
    const along = (x, y) => ((x - e.mid[0]) * ca + (y - e.mid[1]) * sa) / e.len;
    const across = (x, y) => (-(x - e.mid[0]) * sa + (y - e.mid[1]) * ca) / (e.len * 0.42);
    const bowlV = (x, y) => 0.3 + 0.55 * smooth(along(x, y) * 1.4) - 0.22 * smooth(Math.abs(across(x, y)) - 0.25) * (1 - smooth(along(x, y) * 2));
    const form = { cx: (e.tip[0] + e.bo[0] + e.bi[0]) / 3, cy: (e.tip[1] + e.bo[1] + e.bi[1]) / 3 + 10, rx: 62, ry: 74, rot: e.dir * 0.25 };
    const c = part({
      pts, form, flow: () => e.axis, mottle: 0.6,
      colour: (x, y, v, isDab) => {
        const k = imAt(x, y), pink = PINK(clamp(bowlV(x, y), 0, 1.1));
        return isDab ? (R() < k ? pink : e.coat(v)) : mix(e.coat(v), pink, k);
      },
      layers: [{ step: 6, len: [8, 12], wid: [2.6, 3.8], alpha: 0.7, crease: 0.3, lit: 0.45, only: 'fur', jit: 0.08, odd: 0.08, blur: 0.4, spread: 0.2 }],
      gain: (x, y) => (imAt(x, y) > 0.5 ? [0.75, 0.45] : [0.4, 0.3]), skin: imAt, line: 3.7, lineK: [0.38, 1.55],
      extra: (g) => {
        g.save(); g.clip(innerPath);
        const inBowl = (x, y) => imAt(x, y) > 0.4;
        const pick = (a0, a1, b0, b1) => {
          for (let tries = 0; tries < 40; tries++) {
            const u = rr(a0, a1), w = rr(b0, b1);
            const x = e.mid[0] + ca * u * e.len - sa * w * e.len * 0.42, y = e.mid[1] + sa * u * e.len + ca * w * e.len * 0.42;
            if (inBowl(x, y)) return [x, y];
          }
          return null;
        };
        const stroke = (x, y, L, w, col, alpha, bend = rr(-0.3, 0.3), ang = e.axis + rr(-0.12, 0.12)) => {
          g.save(); g.translate(x, y); g.rotate(ang);
          const body = lock(L, w, bend); g.fillStyle = rgb(col, alpha); g.fill(body);
          g.clip(body); g.lineCap = 'round';
          for (let k = 0; k < 2; k++) {
            const off = rr(-0.5, 0.5) * w;
            g.strokeStyle = rgb(mix(col, k ? [255, 242, 232] : [96, 44, 60], rr(0.18, 0.3)), rr(0.5, 0.8)); g.lineWidth = rr(0.8, 1.5);
            g.beginPath(); g.moveTo(-L * 0.4, off); g.quadraticCurveTo(0, off + bend * w * 0.4, L * 0.62, off * 0.3 + bend * w); g.stroke();
          }
          g.restore();
        };
        g.filter = 'blur(0.35px)';
        /* broad strokes up the bowl, each one value, so they step like paint */
        for (let k = 0; k < 16; k++) { const p = pick(0.05, 0.85, -0.9, 0.9); if (p) { let col = PINK(clamp(bowlV(...p) + rr(-0.14, 0.14), 0.05, 1.1)); if (R() < 0.12) col = mix(col, ODD[Math.floor(R() * 3)], rr(0.15, 0.3)); stroke(...p, rr(26, 38), rr(7, 10), col, rr(0.8, 0.92)); } }
        for (let k = 0; k < 22; k++) { const p = pick(0.05, 0.9, -0.9, 0.9); if (p) stroke(...p, rr(10, 15), rr(2.6, 3.8), PINK(clamp(bowlV(...p) + rr(-0.2, 0.2), 0.05, 1.1)), rr(0.75, 0.9)); }
        /* deep rose pooled at the base, where the ear meets the head */
        for (let k = 0; k < 7; k++) { const p = pick(0, 0.3, -0.7, 0.7); if (p) stroke(...p, rr(18, 26), rr(6, 8), PINK(rr(0.1, 0.24)), 0.8); }
        /* the lit rim: the fur turning in over the edge that faces the light */
        for (let k = 0; k < 6; k++) { const p = pick(0.25, 0.85, e.dir < 0 ? 0.6 : -0.95, e.dir < 0 ? 0.95 : -0.6); if (p) stroke(...p, rr(20, 28), rr(4, 5.5), mix(CREAM(1.05), PINK(1.1), rr(0.15, 0.4)), rr(0.85, 0.95)); }
        /* cream tufts out of the bowl, leaning out over the rim */
        for (let k = 0; k < 7; k++) { const p = pick(0.02, 0.28, -0.6, 0.6); if (p) stroke(...p, rr(24, 34), rr(3.2, 4.6), CREAM(rr(0.85, 1.12)), 0.92, rr(-0.5, 0.5) - e.dir * 0.3, e.axis - e.dir * rr(0.05, 0.3)); }
        g.restore();
      },
    });
    notchInk(ctx2(c), pts.notches, 5);
    o.drawImage(c, 0, 0);
  }
  const bodyPath = toPath(bodyPts);
  shadowOn(bodyPath, 4, 6, 7, 0.35);   // the head shades the roots of the ears

  /* 3. the feet: white paws, toes at the front, the body's shade on top */
  const feetPaths = [];
  for (const [f, dir] of [[footL, -1], [footR, 1]]) {
    const toeT = dir < 0 ? [0.6, 0.66, 0.72] : [0.28, 0.34, 0.4];
    const pts = shape(ellipseFn(f.cx, f.cy, f.rx, f.ry, f.rot), { wobble: 0.5, scallops: toeT.map((t) => ({ t, w: 0.035, h: 1.6 })) });
    feetPaths.push(toPath(pts));
    const c = part({
      pts, form: { ...f, cx: f.cx - 4, cy: f.cy - 9, ry: f.ry + 6 }, flow: () => f.rot + dir * 0.4, mottle: 0.5,
      colour: (x, y, v) => PAWC(0.08 + 0.85 * v), skin: 1, gain: [0.8, 0.45], line: 3.4, lineK: [0.75, 1.45],
      layers: [{ step: 9, len: [9, 14], wid: [5, 8], alpha: 0.45, crease: 0.3, lit: 0.4, jit: 0.06, odd: 0.04 }],
      extra: (g) => {
        const P = (t, r) => ellipseFn(f.cx, f.cy, f.rx * r, f.ry * r, f.rot)(t);
        g.save(); g.lineCap = 'round';
        for (const t of toeT) { const [x, y] = P(t, 0.8); dab(g, x - 1, y - 1.5, 7, 4.5, f.rot + dir * 0.5, PAWC(0.95), 0.32); }
        for (let k = 0; k < 2; k++) {
          const t = (toeT[k] + toeT[k + 1]) / 2, [ax, ay] = P(t, 1.04), [bx, by] = P(t, 0.66);
          g.strokeStyle = rgb(mix(INK, [120, 96, 84], 0.3)); g.lineWidth = 2.6; g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo((ax + bx) / 2 + dir, (ay + by) / 2, bx, by); g.stroke();
        }
        g.restore();
      },
    });
    o.drawImage(c, 0, 0);
  }

  /* 4. the body: a white coat with marmalade and charcoal patches, a cream face and belly */
  const EYE = { L: [130, 332], R: [238, 332], rx: 12.4, ry: 19 };
  /* A mask melted from blobs (blur, then cut at half, then a soft edge): round joins, no seams. */
  const melt = (blobs, minus = null) => {
    const c = mk(), g = ctx2(c); g.filter = 'blur(6px)'; g.fillStyle = '#000';
    for (const [cx, cy, rx, ry, rot = 0] of blobs) { g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2); g.fill(); }
    const id = g.getImageData(0, 0, W, H); for (let i = 3; i < id.data.length; i += 4) id.data[i] = id.data[i] > 127 ? 255 : 0;
    g.putImageData(id, 0, 0);
    if (minus) { g.globalCompositeOperation = 'destination-out'; g.drawImage(minus, 0, 0); }
    const c2 = mk(), g2 = ctx2(c2); g2.filter = 'blur(1.1px)'; g2.drawImage(c, 0, 0);
    return c2;
  };
  /* the cream mask: two cheek lobes round the eyes, the muzzle, a white blaze
     up between the eyes (the calico's parting), and the belly */
  const faceCv = melt([[EYE.L[0] - 4, EYE.L[1] + 6, 50, 48], [EYE.R[0] + 4, EYE.R[1] + 6, 50, 48], [BX, 368, 78, 44], [BX, 302, 21, 46], [BX + 2, 498, 88, 52]]);
  /* the patches, kept off the face: marmalade on the left crown and flank, charcoal on the right crown and hip */
  const orangeCv = melt([[100, 236, 62, 46, -0.3], [56, 312, 26, 44], [46, 446, 34, 66, 0.2], [150, 214, 30, 22]], faceCv);
  const charCv = melt([[266, 232, 60, 46, 0.3], [318, 452, 34, 58, -0.2], [300, 304, 22, 30], [216, 212, 28, 20]], faceCv);
  const fm = alphaOf(faceCv), fw = alphaOf(faceCv, 14), om = alphaOf(orangeCv), chm = alphaOf(charCv);
  const faceAt = (x, y) => at(fm, x, y);
  const faceDeep = (x, y) => 1 - at(fw, x, y);
  const orangeAt = (x, y) => at(om, x, y), charAt = (x, y) => at(chm, x, y);
  /* the coat under a point: one colour per stroke, picked by the patch weights, so a patch ends in fur */
  const coat = (x, y, v, isDab) => {
    const po = orangeAt(x, y), pc = charAt(x, y);
    if (isDab) { const r = R(); return r < po ? ORANGE(v) : r < po + pc ? CHAR(v + 0.05) : WHITE(v); }
    return mix(mix(WHITE(v), ORANGE(v), smooth(po)), CHAR(v + 0.05), smooth(pc));
  };
  /* the body throws its shade on the tops of the feet */
  for (const fp of feetPaths) { o.save(); o.clip(fp); o.filter = 'blur(4px)'; o.fillStyle = 'rgba(80,52,48,0.5)'; o.translate(3, 7); o.fill(bodyPath); o.restore(); }
  {
    const c = part({
      pts: bodyPts, form: BODY,
      flow: (x, y) => (faceAt(x, y) > 0.5 && y < 404 ? Math.atan2(y - 348, x - BX) : meridian(x, y)),
      colour: (x, y, v, isDab) => {
        const k = faceAt(x, y);
        const cream = CREAM(0.32 + 0.72 * v - 0.28 * faceDeep(x, y)), fur = coat(x, y, v, isDab);
        return isDab ? (R() < k ? cream : fur) : mix(fur, cream, smooth(k));
      },
      layers: [
        ...FURLAYERS.map((p) => ({ ...p, cut: [faceCv, 'destination-out'] })),
        { step: 12, len: [13, 20], wid: [7, 11], alpha: 0.45, crease: 0.1, lit: 0.25, only: 'skin', jit: 0.05, odd: 0.03, blur: 0.8, cut: [faceCv, 'destination-in'] },
      ],
      gain: (x, y) => { const k = faceAt(x, y); return [0.26 + 0.08 * k, 0.5 - 0.06 * k]; },
      skin: (x, y) => faceAt(x, y), line: 4.2, lineK: [0.42, 1.55],
      extra: (g) => {
        /* every edge fluffy, like Chai's facial disc: short tufts across it both ways */
        const inBody = maskOf(bodyPath, 10);
        const tufts = (maskAt, inner, outer, chance) => {
          for (let y = 196; y < 566; y += 3) for (let x = 16; x < 356; x += 3) {
            const k = maskAt(x, y);
            if (k < 0.25 || k > 0.75 || inBody[y * W + x] < 0.98 || R() < chance) continue;
            const gx = maskAt(x + 2, y) - maskAt(x - 2, y), gy = maskAt(x, y + 2) - maskAt(x, y - 2);
            if (Math.hypot(gx, gy) < 0.05) continue;
            const a = Math.atan2(-gy, -gx), v = formOf(BODY, x + rr(-1, 1), y + rr(-1, 1)).v, out = R() < 0.62;
            const L = out ? rr(7, 11) : rr(6, 9), w = out ? rr(3.4, 4.8) : rr(3, 4);
            g.save(); g.translate(x + rr(-1, 1), y + rr(-1, 1)); g.rotate(a + (out ? 0 : Math.PI) + rr(-0.28, 0.28));
            g.fillStyle = rgb(out ? inner(x, y, v) : outer(x, y, v), out ? 0.92 : 0.85); g.fill(lock(L, w, rr(-0.5, 0.5))); g.restore();
          }
        };
        tufts(faceAt, (x, y, v) => CREAM(0.32 + 0.72 * v - 0.28 * faceDeep(x, y) + rr(-0.04, 0.04)), (x, y, v) => coat(x, y, v + rr(-0.06, 0.04), true), 0.6);
        tufts(orangeAt, (x, y, v) => ORANGE(v + rr(-0.05, 0.05)), (x, y, v) => WHITE(v + rr(-0.05, 0.04)), 0.55);
        tufts(charAt, (x, y, v) => CHAR(v + 0.05 + rr(-0.05, 0.05)), (x, y, v) => WHITE(v + rr(-0.05, 0.04)), 0.55);
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

  /* 5. the cushion, hugged in front of the belly: rose velvet, deep enough
     to show its side, plump round a tufted button that pulls in four short
     pleats, gold tassels at the corners */
  const cPath = toPath(cushionPts);
  shadowOn(cPath, 7, 12, 7, 0.36);
  {
    /* its side: the same outline, lower, in the velvet's shadow (only the bottom edge shows) */
    const wall = cushionPts.map(([x, y]) => [x + 2.5, y + CU.depth]);
    o.drawImage(part({
      pts: wall, form: { cx: CU.cx, cy: CU.cy, rx: 120, ry: 110 }, flow: () => CU.rot, mottle: 0, skin: 1,
      colour: (x, y, v) => ROSE(0.06 + 0.3 * v), gain: [0.5, 0.3], line: 3.8, lineK: [1.1, 1.25],
    }), 0, 0);
    const cuForm = { cx: CU.cx - 22, cy: CU.cy - 26, rx: CU.a + 36, ry: CU.b + 40, rot: CU.rot };
    /* stuffing: the face sinks into the button and swells in a ring round it, fullest toward the edges' middles */
    const puff = (x, y) => {
      const dx = x - BUTTON[0], dy = y - BUTTON[1];
      const lx = (dx * Math.cos(-CU.rot) - dy * Math.sin(-CU.rot)) / CU.a, ly = (dx * Math.sin(-CU.rot) + dy * Math.cos(-CU.rot)) / CU.b;
      const r = Math.hypot(lx, ly), diag = 1 - Math.abs(Math.abs(lx) - Math.abs(ly)) / Math.max(0.01, Math.abs(lx) + Math.abs(ly));
      return 0.13 * smooth(r * 2.4) * (1 - smooth((r - 0.55) * 2.2)) - 0.2 * (1 - smooth(r * 5)) - 0.07 * diag * smooth(r * 4) * (1 - smooth((r - 0.45) * 3));
    };
    const c = part({
      pts: cushionPts, form: cuForm, flow: (x, y) => Math.atan2(y - BUTTON[1], x - BUTTON[0]) + Math.PI / 2, skin: 1, mottle: 0.5,
      colour: (x, y, v) => ROSE(clamp(0.1 + 0.86 * v + puff(x, y), 0, 1.15)), gain: [0.55, 0.4], line: 3.9, lineK: [0.95, 1.35],
      layers: [{ step: 9, len: [12, 20], wid: [6, 9], alpha: 0.38, crease: 0.14, lit: 0.3, bristle: 0.25, jit: 0.07, odd: 0.02, spread: 0.35 }],
      extra: (g) => {
        g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
        /* four short pleats out of the button, dying away into the stuffing; each a dark fold with a lit lip */
        for (const cnr of CORNERS) {
          const to = lerp(BUTTON, cnr, 0.42), mx = (to[0] + BUTTON[0]) / 2 + (cnr[1] - BUTTON[1]) * 0.06, my = (to[1] + BUTTON[1]) / 2 - (cnr[0] - BUTTON[0]) * 0.06;
          for (let k = 0; k < 6; k++) {
            const t0 = k / 6, t1 = (k + 1) / 6, q = (t) => [(1 - t) * (1 - t) * BUTTON[0] + 2 * (1 - t) * t * mx + t * t * to[0], (1 - t) * (1 - t) * BUTTON[1] + 2 * (1 - t) * t * my + t * t * to[1]];
            const [a, b] = [q(t0), q(t1)], fade = 1 - t0;
            g.strokeStyle = rgb(ROSE(0.1), 0.7 * fade); g.lineWidth = 3.4 * (0.5 + 0.5 * fade); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
            g.strokeStyle = rgb(ROSE(1.1), 0.45 * fade); g.lineWidth = 1.7; g.beginPath(); g.moveTo(a[0] - 1.8, a[1] - 2.2); g.lineTo(b[0] - 1.8, b[1] - 2.2); g.stroke();
          }
        }
        /* the dimple round the button, then the button: gold, domed, lit up-left */
        const dg = g.createRadialGradient(...BUTTON, 2, ...BUTTON, 20);
        dg.addColorStop(0, 'rgba(70,24,36,0.42)'); dg.addColorStop(1, 'rgba(70,24,36,0)');
        g.fillStyle = dg; g.beginPath(); g.arc(...BUTTON, 20, 0, Math.PI * 2); g.fill();
        const bg = g.createRadialGradient(BUTTON[0] - 2.5, BUTTON[1] - 3, 0.5, ...BUTTON, 7.5);
        bg.addColorStop(0, rgb(GOLD(1.12))); bg.addColorStop(0.55, rgb(GOLD(0.7))); bg.addColorStop(1, rgb(GOLD(0.25)));
        g.fillStyle = bg; g.beginPath(); g.arc(...BUTTON, 7, 0, Math.PI * 2); g.fill();
        g.strokeStyle = rgb(INK, 0.8); g.lineWidth = 1.6; g.stroke();
        /* a soft sheen across the upper left, the velvet's nap catching the light */
        g.filter = 'blur(3px)';
        g.strokeStyle = 'rgba(255,226,222,0.4)'; g.lineWidth = 8;
        g.beginPath(); const s0 = cuLocal(-CU.a * 0.66, CU.b * 0.2), s1 = cuLocal(-CU.a * 0.55, -CU.b * 0.55), s2 = cuLocal(-CU.a * 0.1, -CU.b * 0.72); g.moveTo(...s0); g.quadraticCurveTo(...s1, ...s2); g.stroke();
        g.restore();
      },
    });
    o.drawImage(c, 0, 0);
    /* tassels at the two lower corners: a gold knot and a fringe that hangs and splays */
    for (const cnr of [CORNERS[2], CORNERS[3]]) {
      const [kx, ky] = [cnr[0] + (cnr[0] < CU.cx ? -3 : 3), cnr[1] + 4];
      o.save(); o.lineCap = 'round';
      for (let k = 0; k < 7; k++) {
        const sp = (k - 3) * 1.6, len = rr(17, 22);
        o.strokeStyle = rgb(INK, 0.55); o.lineWidth = 3.1; o.beginPath(); o.moveTo(kx + sp * 0.4, ky + 3); o.quadraticCurveTo(kx + sp, ky + len * 0.5, kx + sp * 1.7, ky + len); o.stroke();
        o.strokeStyle = rgb(GOLD(0.45 + 0.08 * (k % 3) + (k < 3 ? 0.25 : 0))); o.lineWidth = 2.1; o.beginPath(); o.moveTo(kx + sp * 0.4, ky + 3); o.quadraticCurveTo(kx + sp, ky + len * 0.5, kx + sp * 1.7, ky + len); o.stroke();
      }
      const kg = o.createRadialGradient(kx - 1.6, ky - 1.8, 0.5, kx, ky, 6);
      kg.addColorStop(0, rgb(GOLD(1.1))); kg.addColorStop(1, rgb(GOLD(0.35)));
      o.fillStyle = kg; o.beginPath(); o.ellipse(kx, ky, 5.6, 5, 0, 0, Math.PI * 2); o.fill();
      o.strokeStyle = rgb(INK, 0.85); o.lineWidth = 1.6; o.stroke();
      o.restore();
    }
  }

  /* 6. the arms, over the cushion's sides, with their own ink and shading.
     Each grows out of the flank: paint and ink fade away at the shoulder. */
  const paws = [];
  for (const arm of [armL, armR]) {
    const [P0, P1, P2] = arm.P, r0 = arm.r[0];
    const ang = Math.atan2(P2[1] - P0[1], P2[0] - P0[0]), len = Math.hypot(P2[0] - P0[0], P2[1] - P0[1]);
    const form = { cx: (P0[0] + 2 * P1[0] + P2[0]) / 4 - 4, cy: (P0[1] + 2 * P1[1] + P2[1]) / 4 - 9, rx: len / 2 + 22, ry: r0 + 6, rot: ang };
    const d0 = [P1[0] - P0[0], P1[1] - P0[1]], l0 = Math.hypot(...d0);
    const root = (x, y) => smooth(((x - P0[0]) * d0[0] / l0 + (y - P0[1]) * d0[1] / l0 + r0 * 0.7) / (r0 * 0.9));
    const c = part({
      pts: arm.pts, form, flow: (x, y) => ang + 0.3 * Math.sin((x + y) / 40),
      colour: (x, y, v) => WHITE(v + 0.05),
      layers: FURLAYERS.map((p) => ({ ...p, step: p.step * 0.7, len: p.len.map((l) => l * 0.62), wid: p.wid.map((l) => l * 0.72), only: null, spread: 0.1 })),
      line: 3.8, lineK: [0.85, 1.5], fade: root,
      extra: (g) => {
        const Q = (t) => [0, 1].map((k) => (1 - t) * (1 - t) * P0[k] + 2 * (1 - t) * t * P1[k] + t * t * P2[k]);
        const Dq = (t) => [0, 1].map((k) => 2 * (1 - t) * (P1[k] - P0[k]) + 2 * t * (P2[k] - P1[k]));
        for (const [sg, col, a, wk] of [[1, WHITE(1.12), 0.55, 0.42], [-1, WHITE(0.12), 0.42, 0.5]]) {
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
    /* its shadow, on the belly and on the velvet */
    const sh = mk(), shg = ctx2(sh); shg.drawImage(c, 0, 0); shg.globalCompositeOperation = 'source-in'; shg.fillStyle = 'rgb(76,44,52)'; shg.fillRect(0, 0, W, H);
    o.save(); o.globalCompositeOperation = 'source-atop'; o.filter = 'blur(3.5px)'; o.globalAlpha = 0.55; o.drawImage(sh, 3, 8); o.restore();
    o.drawImage(c, 0, 0);
    const dE = [P2[0] - P1[0], P2[1] - P1[1]], lE = Math.hypot(...dE);
    paws.push([P2[0] + (dE[0] / lE) * 9, P2[1] + (dE[1] / lE) * 9, Math.atan2(dE[1], dE[0])]);
  }
  /* 7. the paws, on the front of the cushion: white mittens, toes curled over the velvet */
  for (const [px, py, rot] of paws) {
    const pts = closed(Array.from({ length: 200 }, (_, i) => ellipseFn(px, py, 16.5, 18.5, rot)(i / 200)), 1.5);
    const pp = toPath(pts);
    shadowOn(pp, 3, 4, 2.5, 0.45);
    const c = part({
      pts, form: { cx: px - 4, cy: py - 5, rx: 18, ry: 18 }, flow: () => rot, mottle: 0, skin: 1,
      colour: (x, y, v) => PAWC(0.05 + 0.92 * v), gain: [0.7, 0.4], line: 3, lineK: [0.7, 1.35],
      layers: [{ step: 7, len: [7, 10], wid: [4, 6], alpha: 0.35, crease: 0.15, lit: 0.35, jit: 0.05, odd: 0 }],
      extra: (g) => {
        const c0 = Math.cos(rot), s0 = Math.sin(rot);
        const P = (a, b) => [px + a * c0 - b * s0, py + a * s0 + b * c0];
        g.save(); g.lineCap = 'round'; g.strokeStyle = rgb([116, 94, 84], 0.9); g.lineWidth = 2.1;
        for (const b of [-4.8, 4.8]) { const [ax, ay] = P(15.5, b * 1.05), [bx, by] = P(7, b * 0.85); g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
        for (const b of [-9.5, 0, 9.5]) { const [x, y] = P(10, b - 1.5); dab(g, x - 1, y - 1, 3.2, 2.1, rot, PAWC(1.1), 0.6); }
        g.restore();
      },
    });
    o.drawImage(c, 0, 0);
  }

  /* 8. whiskers: three a side from the outer cheek, past the outline; a warm
     grey line with a pale lit edge, lighter than ink so bake-pets never takes
     one for the smile, and rooted outside the eyes' span */
  o.save(); o.lineCap = 'round';
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
    const x0 = BX + side * (98 + k * 2), y0 = 362 + k * 8, x1 = BX + side * (174 - k * 6), y1 = 350 + k * 21;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 5 + k * 3;
    o.strokeStyle = 'rgba(122,100,88,0.78)'; o.lineWidth = 1.8 - k * 0.2;
    o.beginPath(); o.moveTo(x0, y0); o.quadraticCurveTo(mx, my, x1, y1); o.stroke();
    o.strokeStyle = 'rgba(255,248,236,0.5)'; o.lineWidth = 0.9;
    o.beginPath(); o.moveTo(x0, y0 - 1); o.quadraticCurveTo(mx, my - 1, x1, y1 - 1); o.stroke();
  }
  o.restore();

  K.glaze(o, out);
  /* 9. the face, crisp on top: eyes, nose, smile */
  K.eyes(o, EYE);
  K.nose(o, [BX, 343]);
  K.smile(o, BX, EYE);
  return K.finish(out);
}

await runPainter(paint, SEED, 'home-companion-biscuit.png');
