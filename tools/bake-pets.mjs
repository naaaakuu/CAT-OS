/**
 * bake-pets.mjs — bake the six five-frame pet sheets from the companion strip.
 *
 *   node tools/bake-pets.mjs [--baby] [--preview <dir>]
 *
 * Reads assets/art/home-companions-v1.png in headless Chrome, finds each
 * pet's eyes and smile (or Chai's beak), paints the blink / happy / talk /
 * sleep faces over the painted ones, scales every frame to 384 px tall and
 * writes assets/art/pet-<id>.png (frames: idle, blink, happy, talk, sleep;
 * 4 px transparent gutter between frames) plus src/pets/sheets.js.
 * --preview <dir> also writes a 3x crop of every face per pet, to eyeball.
 * --baby bakes the baby sheets instead (assets/art/pet-<id>-baby.png and
 * BABY_SHEETS): the same frames, the eyes bigger and the body shorter.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { serveRepo, launchChrome, REPO_ROOT } from './cdp-lite.mjs';

/* Strip order, [id, x, width] in source px. */
const PETS = [
  ['toffee', 0, 350], ['chai', 355, 330], ['matcha', 700, 338],
  ['mochi', 1040, 335], ['ginger', 1380, 397], ['mallow', 1780, 392],
];
const H = 384, GUTTER = 4, FRAMES = 5;
/* The baby sheets are smaller: a baby is never drawn much bigger than three
   quarters of the grown size (src/pets/sprite.js growOf). */
const BABY_H = 288;

/* Runs in the page. Returns [{id, w, sheet, preview, log}]. */
async function bake(pets, H, GUTTER, wantPreview, babyMode, BABY_H) {
  const img = new Image();
  img.src = '/assets/art/home-companions-v1.png';
  await img.decode();
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const ctx2 = (c) => c.getContext('2d', { willReadFrequently: true });
  const INK = '#3a2a22', MOUTH = '#7a2e2e', TONGUE = '#c45a55';
  /* Source px repainted around an eye: its anti-aliased edge plus the light
     glow the painter left round it (at 4 the glow read as a pale smudge
     over a closed eye). */
  const EYE_GROW = 9;
  const INK_GROW = 5;   // same, around the smile
  const out = [];

  for (const [id, fx, fw] of pets) {
    /* 1. crop + trim alpha margins, keep a 6 px pad */
    const strip = mk(fw, img.height); const sg = ctx2(strip); sg.drawImage(img, -fx, 0);
    const sd = sg.getImageData(0, 0, fw, img.height).data;
    let x0 = fw, y0 = img.height, x1 = -1, y1 = -1;
    for (let y = 0; y < img.height; y++) for (let x = 0; x < fw; x++) {
      if (sd[(y * fw + x) * 4 + 3] >= 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const PAD = 6, W = x1 - x0 + 1 + 2 * PAD, Hs = y1 - y0 + 1 + 2 * PAD;
    const base = mk(W, Hs); const bg = ctx2(base); bg.drawImage(strip, PAD - x0, PAD - y0);
    const baseData = bg.getImageData(0, 0, W, Hs), d = baseData.data;
    const at = (x, y) => (y * W + x) * 4;
    const dark = (t) => (x, y) => { const i = at(x, y); return d[i] < t && d[i + 1] < t && d[i + 2] < t && d[i + 3] > 200; };
    const lum = (i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];

    /* 8-connected components of `test` inside a box, as blobs with stats */
    const components = (test, bx0, by0, bx1, by1, skip) => {
      bx0 = Math.max(0, Math.round(bx0)); by0 = Math.max(0, Math.round(by0));
      bx1 = Math.min(W - 1, Math.round(bx1)); by1 = Math.min(Hs - 1, Math.round(by1));
      const seen = new Uint8Array(W * Hs), found = [];
      const ok = (x, y) => x >= bx0 && y >= by0 && x <= bx1 && y <= by1 && !seen[y * W + x] && !skip?.has(y * W + x) && test(x, y);
      for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) {
        if (!ok(x, y)) continue;
        const pts = [], st = [[x, y]]; seen[y * W + x] = 1;
        while (st.length) {
          const [cx, cy] = st.pop(); pts.push([cx, cy]);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (ok(cx + dx, cy + dy)) { seen[(cy + dy) * W + cx + dx] = 1; st.push([cx + dx, cy + dy]); }
          }
        }
        let a = 1e9, b = 1e9, c = -1, e = -1;
        for (const [p, q] of pts) { a = Math.min(a, p); c = Math.max(c, p); b = Math.min(b, q); e = Math.max(e, q); }
        const bw = c - a + 1, bh = e - b + 1;
        found.push({ pts, area: pts.length, bw, bh, left: a, top: b, bottom: e + 1, cx: (a + c + 1) / 2, cy: (b + e + 1) / 2, fill: pts.length / (Math.PI / 4 * bw * bh) });
      }
      return found;
    };

    /* 2. eyes: two filled near-black blobs in the upper 65%, side by side.
       Filled (fill > 0.6) so Mochi's glasses rims never count. */
    const blobs = components(dark(70), 0, 0, W - 1, Hs * 0.65).filter((b) => b.area >= 12 && b.area <= 900 && b.fill > 0.6);
    let best = null;
    for (let i = 0; i < blobs.length; i++) for (let j = i + 1; j < blobs.length; j++) {
      const a = blobs[i], b = blobs[j];
      const dy = Math.abs(a.cy - b.cy), dx = Math.abs(a.cx - b.cx), m = Math.max(a.bw, b.bw);
      if (dy > 0.5 * Math.max(a.bh, b.bh) || dx < 2.5 * m || dx > 10 * m) continue;
      if (Math.max(a.area, b.area) / Math.min(a.area, b.area) > 1.8) continue;
      const score = a.area + b.area - 4 * dy;
      if (!best || score > best.score) best = { score, eyes: a.cx < b.cx ? [a, b] : [b, a] };
    }
    if (!best) throw new Error(`${id}: no eye pair among ${blobs.length} blobs`);
    const [L, R] = best.eyes, spacing = R.cx - L.cx;
    const eyeCy = (L.cy + R.cy) / 2, eyeBh = (L.bh + R.bh) / 2;
    const eyePts = new Set([...L.pts, ...R.pts].map(([a, b]) => b * W + a));

    /* the smile: the wide dark stroke nearest to where a smile sits (centred,
       a fifth of the eye spacing below the eyes). Nearest, not widest, so
       Toffee's scarf, Mochi's glasses bridge and Ginger's nose lose. */
    const ex = (L.cx + R.cx) / 2, ey = eyeCy + 0.2 * spacing;
    const smile = components(dark(110), L.cx, eyeCy - 0.1 * spacing, R.cx, eyeCy + 0.5 * spacing, eyePts)
      .filter((c) => c.bw >= 1.3 * c.bh && c.bw >= 0.15 * spacing && Math.hypot(c.cx - ex, c.cy - ey) < 0.3 * spacing)
      .sort((a, b) => Math.hypot(a.cx - ex, a.cy - ey) - Math.hypot(b.cx - ex, b.cy - ey))[0] ?? null;
    /* no smile (Chai): the beak, the largest non-cream shape between the eyes */
    const beak = smile ? null : components((x, y) => d[at(x, y) + 3] > 200 && lum(at(x, y)) < 200,
      L.cx + L.bw / 2, Math.min(L.top, R.top), R.cx - R.bw / 2, eyeCy + eyeBh / 2 + 0.5 * spacing).sort((a, b) => b.area - a.area)[0] ?? null;
    if (!smile && !beak) throw new Error(`${id}: no smile or beak`);

    /* 3. skin: median of a ring 4..8 px outside each eye blob */
    const near = (pts, x, y) => { let m = 1e9; for (const [a, b] of pts) { const q = (a - x) ** 2 + (b - y) ** 2; if (q < m) m = q; } return Math.sqrt(m); };
    const skinOf = (e) => {
      const set = new Set(e.pts.map(([a, b]) => b * W + a)), ch = [[], [], []];
      for (let y = Math.floor(e.top - 8); y <= e.bottom + 8; y++) for (let x = Math.floor(e.left - 8); x <= e.left + e.bw + 8; x++) {
        if (x < 0 || y < 0 || x >= W || y >= Hs || set.has(y * W + x)) continue;
        const r = near(e.pts, x, y), i = at(x, y);
        if (r < 4 || r > 8 || d[i + 3] < 200 || (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 90)) continue;
        for (let c = 0; c < 3; c++) ch[c].push(d[i + c]);
      }
      return ch.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
    };

    /* Seamless clone (Poisson): copy a clean patch of the same skin from
       nearby, then add a harmonic correction (each pixel relaxes to the mean
       of its neighbours) so the patch border matches the surroundings
       exactly. The painting's grain survives; the seam and any colour
       mismatch (fur into blush into cream) do not. `busy` marks pixels a
       patch may not come from: ink, eyes, smile, transparent edge. `wall`
       pixels are kept and not pulled in (Neumann edge): Mochi's rims. */
    const busy = new Uint8Array(W * Hs);
    /* grain = luminance minus its 7x7 mean; the quietest patch wins, so no
       feather tuft or fur marking gets copied into a closed eye */
    const grain = new Float32Array(W * Hs), sum = new Float64Array((W + 1) * (Hs + 1));
    for (let y = 0; y < Hs; y++) for (let x = 0; x < W; x++) {
      sum[(y + 1) * (W + 1) + x + 1] = lum(at(x, y)) + sum[y * (W + 1) + x + 1] + sum[(y + 1) * (W + 1) + x] - sum[y * (W + 1) + x];
    }
    for (let y = 3; y < Hs - 3; y++) for (let x = 3; x < W - 3; x++) {
      const box = sum[(y + 4) * (W + 1) + x + 4] - sum[(y - 3) * (W + 1) + x + 4] - sum[(y + 4) * (W + 1) + x - 3] + sum[(y - 3) * (W + 1) + x - 3];
      grain[y * W + x] = lum(at(x, y)) - box / 49;
    }
    const inpaint = (src, mask, seed, wall = null) => {
      const s = src.data, mx = mask.map((i) => i % W), my = mask.map((i) => (i / W) | 0);
      let off = null, bestCost = Infinity;
      const RAD = Math.round(0.9 * spacing);
      for (let oy = -RAD; oy <= RAD; oy += 3) for (let ox = -RAD; ox <= RAD; ox += 3) {
        const dist = Math.hypot(ox, oy);
        if (dist > RAD) continue;
        let ok = true, sr = 0, sg = 0, sb = 0, dev = 0;
        for (let n = 0; n < mask.length; n++) {
          const x = mx[n] + ox, y = my[n] + oy, j = y * W + x;
          if (x < 3 || y < 3 || x >= W - 3 || y >= Hs - 3 || busy[j]) { ok = false; break; }
          sr += s[j * 4]; sg += s[j * 4 + 1]; sb += s[j * 4 + 2]; dev = Math.max(dev, Math.abs(grain[j]));
        }
        if (!ok) continue;
        const n = mask.length;
        const tint = (Math.abs(sr / n - seed[0]) + Math.abs(sg / n - seed[1]) + Math.abs(sb / n - seed[2])) / 3;
        const cost = dev + 0.5 * tint + 0.05 * dist;
        if (cost < bestCost) { bestCost = cost; off = [ox, oy]; }
      }
      const pos = new Int32Array(W * Hs).fill(-1);
      mask.forEach((i, n) => { pos[i] = n; });
      /* only the patch's grain (pixel minus its 7x7 mean) is copied, so a
         soft highlight in the source cannot ride along into a closed eye,
         and it is turned down to the grain of the skin round the mask */
      const oi = off && off[0] + off[1] * W;
      let gain = 0;
      if (off) {
        const near6 = new Uint8Array(W * Hs); let ring = 0, rn = 0, patch = 0;
        for (const i of mask) {
          patch += grain[i + oi] ** 2;
          for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
            const j = i + dy * W + dx;
            if (near6[j] || pos[j] >= 0 || wall?.[j] || d[j * 4 + 3] < 250 || (d[j * 4] < 110 && d[j * 4 + 1] < 110 && d[j * 4 + 2] < 110)) continue;
            near6[j] = 1; ring += grain[j] ** 2; rn++;
          }
        }
        gain = Math.min(1, Math.sqrt(ring / rn) / Math.sqrt(patch / mask.length + 1e-6));
      }
      const guide = (i, c) => {
        if (!off) return seed[c];
        const j = i + oi; let m = 0;
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) m += s[(j + dy * W + dx) * 4 + c];
        return seed[c] + gain * (s[j * 4 + c] - m / 49);
      };
      const out = new ImageData(new Uint8ClampedArray(s), W, Hs), o = out.data;
      const v = new Float32Array(mask.length * 3);
      const nb = mask.map((i) => [i - 1, i + 1, i - W, i + W].filter((j) => pos[j] >= 0 || (s[j * 4 + 3] > 200 && !wall?.[j])));
      const edge = nb.map((js) => js.filter((j) => pos[j] < 0).map((j) => [0, 1, 2].map((c) => s[j * 4 + c] - seed[c])));
      for (let it = 0; it < 600; it++) {
        for (let n = 0; n < mask.length; n++) {
          let r = 0, g = 0, b = 0;
          for (const j of nb[n]) if (pos[j] >= 0) { r += v[pos[j] * 3]; g += v[pos[j] * 3 + 1]; b += v[pos[j] * 3 + 2]; }
          for (const [er, eg, eb] of edge[n]) { r += er; g += eg; b += eb; }
          const c = nb[n].length || 1;
          v[n * 3] = r / c; v[n * 3 + 1] = g / c; v[n * 3 + 2] = b / c;
        }
      }
      mask.forEach((i, n) => { for (let c = 0; c < 3; c++) o[i * 4 + c] = guide(i, c) + v[n * 3 + c]; });
      fills.push(off ? `${off.join(',')}x${gain.toFixed(2)}` : 'flat');
      return out;
    };
    const ellipseMask = (e, grow) => {
      const m = [], a = e.bw / 2 + grow, b = e.bh / 2 + grow;
      for (let y = Math.floor(e.cy - b); y <= e.cy + b; y++) for (let x = Math.floor(e.cx - a); x <= e.cx + a; x++) {
        if (((x + 0.5 - e.cx) / a) ** 2 + ((y + 0.5 - e.cy) / b) ** 2 <= 1) m.push(y * W + x);
      }
      return m;
    };
    const strokeMask = (c, grow) => {
      const m = [];
      for (let y = c.top - grow; y <= c.bottom + grow; y++) for (let x = c.left - grow; x <= c.left + c.bw + grow; x++) {
        if (near(c.pts, x, y) <= grow) m.push(y * W + x);
      }
      return m;
    };
    for (let i = 0; i < W * Hs; i++) if (d[i * 4 + 3] < 250 || (d[i * 4] < 110 && d[i * 4 + 1] < 110 && d[i * 4 + 2] < 110)) busy[i] = 1;
    for (const e of [L, R]) for (const i of ellipseMask(e, EYE_GROW + 3)) busy[i] = 1;
    if (smile) for (const i of strokeMask(smile, INK_GROW + 2)) busy[i] = 1;
    const skins = [skinOf(L), skinOf(R)], fills = [];
    /* the eye mask, minus a wall of anything clearly darker than the skin
       that is not the eye itself (Mochi's glasses rim), dilated by 1 px */
    const eyeFill = (src, e, seed) => {
      const inner = new Set(ellipseMask(e, 4)), wall = new Uint8Array(W * Hs);
      const t = Math.min(150, 0.3 * seed[0] + 0.59 * seed[1] + 0.11 * seed[2] - 30);
      for (const i of ellipseMask(e, EYE_GROW + 2)) {
        if (!inner.has(i) && lum(i * 4) < t) for (const j of [i, i - 1, i + 1, i - W, i + W]) if (!inner.has(j)) wall[j] = 1;
      }
      return inpaint(src, ellipseMask(e, EYE_GROW).filter((i) => !wall[i]), seed, wall);
    };
    const noEyes = eyeFill(eyeFill(baseData, L, skins[0]), R, skins[1]);
    const noSmile = smile ? inpaint(baseData, strokeMask(smile, INK_GROW), skinOf(smile)) : baseData;

    /* 4. paint the frames at source resolution; widths are output px */
    const k = Hs / H;
    const frame = (data, paint) => { const c = mk(W, Hs); const g = ctx2(c); g.putImageData(data, 0, 0); paint?.(g); return c; };
    const arc = (g, e, { up = false, sag, drop, width, span = 1.5 }) => {
      const hw = e.bw * span / 2, y = e.cy + drop * e.bh, s = sag * e.bw * span;
      g.save(); g.strokeStyle = INK; g.lineWidth = width * k; g.lineCap = 'round'; g.beginPath();
      if (up) { g.moveTo(e.cx - hw, y + s / 2); g.quadraticCurveTo(e.cx, y - 1.5 * s, e.cx + hw, y + s / 2); }
      else { g.moveTo(e.cx - hw, y - s / 2); g.quadraticCurveTo(e.cx, y + 1.5 * s, e.cx + hw, y - s / 2); }
      g.stroke(); g.restore();
    };
    const closed = (opts) => frame(noEyes, (g) => { arc(g, L, opts); arc(g, R, opts); });
    const mouth = (g, cx, cy, mw) => {
      const mh = 0.6 * mw;
      g.save(); g.beginPath(); g.ellipse(cx, cy, mw / 2, mh / 2, 0, 0, Math.PI * 2);
      g.fillStyle = MOUTH; g.fill(); g.clip();
      g.fillStyle = TONGUE; g.beginPath(); g.ellipse(cx, cy + mh * 0.42, mw * 0.32, mh * 0.3, 0, 0, Math.PI * 2); g.fill();
      g.restore();
      g.save(); g.strokeStyle = INK; g.lineWidth = 1.4 * k; g.beginPath(); g.ellipse(cx, cy, mw / 2, mh / 2, 0, 0, Math.PI * 2); g.stroke(); g.restore();
    };
    const talk = frame(noSmile, (g) => {
      if (smile) { mouth(g, smile.cx, (smile.top + smile.bottom) / 2 + 0.05 * spacing, 0.45 * spacing); return; }
      /* beak: the mouth opens under the tip, then the beak (anything darker
         than the cream face) is laid back on top */
      const mw = 0.32 * spacing;
      mouth(g, beak.cx, beak.bottom + 0.06 * mw, mw);
      const bx = Math.floor(beak.left - 3), by = Math.floor(beak.top - 3), bw = beak.bw + 6, bh = beak.bottom - beak.top + 6;
      const cur = g.getImageData(bx, by, bw, bh), c = cur.data;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const i = at(bx + x, by + y), j = (y * bw + x) * 4, t = Math.min(1, Math.max(0, (230 - lum(i)) / 40));
        for (let ch = 0; ch < 3; ch++) c[j + ch] = d[i + ch] * t + c[j + ch] * (1 - t);
      }
      g.putImageData(cur, bx, by);
    });
    const frames = [
      frame(baseData),
      closed({ sag: 0.22, drop: 0.12, width: 3 }),
      closed({ up: true, sag: 0.3, drop: 0, width: 3 }),
      talk,
      closed({ sag: 0.1, drop: 0.3, width: 2.5 }),
    ];

    /* 5-6. scale to HH tall and assemble the sheet */
    const assemble = (frs, HH) => {
      const fw = frs[0].width, fh = frs[0].height;
      const w = Math.round(fw * HH / fh);
      const sheet = mk(frs.length * w + (frs.length - 1) * GUTTER, HH); const shg = sheet.getContext('2d');
      shg.imageSmoothingEnabled = true; shg.imageSmoothingQuality = 'high';
      frs.forEach((f, i) => shg.drawImage(f, i * (w + GUTTER), 0, w, HH));

      /* 7. the feet, for the walk. Near the bottom of the idle frame, the gap
         between the two feet is the transparent gap closest to the middle
         (one foot often sits a pixel lower, and Mallow has a puff of tail);
         walking up that gap until it closes finds where the body begins. */
      const idle = mk(w, HH); const ig = ctx2(idle); ig.drawImage(frs[0], 0, 0, w, HH);
      const ia = ig.getImageData(0, 0, w, HH).data;
      const solid = (x, y) => ia[(y * w + x) * 4 + 3] >= 128;
      const runsOf = (y) => { const rs = []; let s = -1; for (let x = 0; x <= w; x++) { const o = x < w && solid(x, y); if (o && s < 0) s = x; if (!o && s >= 0) { if (x - s >= 3) rs.push([s, x]); s = -1; } } return rs; };
      let bottom = HH - 1; while (bottom > 0 && !runsOf(bottom).length) bottom--;
      let feet = null;
      for (let y = bottom; y > bottom - 12 && !feet; y--) {
        const rs = runsOf(y);
        const gaps = rs.slice(1).map((r, i) => [rs[i][1], r[0]]).sort((a, b) => Math.abs((a[0] + a[1]) / 2 - w / 2) - Math.abs((b[0] + b[1]) / 2 - w / 2));
        if (!gaps.length) continue;
        const split = Math.round((gaps[0][0] + gaps[0][1]) / 2);
        let top = y;
        while (top > bottom - HH * 0.25 && !solid(split, top - 1)) top--;
        if (bottom - top >= 6) feet = { top, bottom, split };
      }
      return { w, sheet, feet };
    };

    /* 8. the baby (--baby): the same friend before they have grown. A baby
       reads as a big head on a small body with big eyes, so everything below
       the mouth is shortened (horizontal size kept, which also makes them
       rounder) and each eye is magnified from its centre by a smooth bulge
       that fades to nothing at its rim, so no edge tears. Bilinear, on
       premultiplied colour so the transparent edge does not darken. */
    const babyOf = (src) => {
      const mo = smile ?? beak;
      const yF = Math.round(mo.bottom + 0.12 * spacing), CB = 0.74;
      const Hb = yF + Math.round((Hs - yF) * CB);
      const sd = ctx2(src).getImageData(0, 0, W, Hs).data;
      const out = new ImageData(W, Hb), o = out.data;
      const eyes = [L, R].map((e) => ({ x: e.cx, y: e.cy, r: 0.46 * spacing }));
      const EYE_M = 1.38;
      const px = (x, y, c) => { x = Math.max(0, Math.min(W - 1, x)); y = Math.max(0, Math.min(Hs - 1, y)); return sd[(y * W + x) * 4 + c]; };
      for (let y = 0; y < Hb; y++) for (let x = 0; x < W; x++) {
        let sx = x + 0.5, sy = y + 0.5;
        for (const e of eyes) {
          const dx = sx - e.x, dy = sy - e.y, t = Math.hypot(dx, dy) / e.r;
          if (t < 1) { const g = 1 - (1 - 1 / EYE_M) * (1 - t * t) ** 2; sx = e.x + dx * g; sy = e.y + dy * g; }
        }
        if (sy > yF) sy = yF + (sy - yF) / CB;
        sx -= 0.5; sy -= 0.5;
        const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
        const wts = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy], pts = [[x0, y0], [x0 + 1, y0], [x0, y0 + 1], [x0 + 1, y0 + 1]];
        let a = 0, r = 0, g = 0, b = 0;
        pts.forEach(([qx, qy], k) => { const al = px(qx, qy, 3) * wts[k]; a += al; r += px(qx, qy, 0) * al; g += px(qx, qy, 1) * al; b += px(qx, qy, 2) * al; });
        const i = (y * W + x) * 4;
        if (a > 0) { o[i] = r / a; o[i + 1] = g / a; o[i + 2] = b / a; o[i + 3] = a; }
      }
      const c = mk(W, Hb); ctx2(c).putImageData(out, 0, 0);
      return c;
    };

    const { w, sheet, feet } = assemble(babyMode ? frames.map(babyOf) : frames, babyMode ? BABY_H : H);

    let preview = null;
    if (wantPreview && babyMode) {
      /* the grown idle frame next to the baby one, both at the sheet's height */
      const a = assemble([frames[0]], BABY_H), pv = mk(a.w + w + 12, BABY_H), pg = pv.getContext('2d');
      pg.fillStyle = '#e9dcc0'; pg.fillRect(0, 0, pv.width, pv.height);
      pg.drawImage(a.sheet, 0, 0); pg.drawImage(sheet, 0, 0, w, BABY_H, a.w + 12, 0, w, BABY_H);
      preview = pv.toDataURL('image/png');
    } else if (wantPreview) {
      /* 3x of the face (eyes and mouth), cut from the baked sheet itself */
      const fcx = (L.cx + R.cx) / 2 / k, fcy = eyeCy / k, cw = Math.round(2 * spacing / k), ch = Math.round(1.3 * spacing / k), Z = 3;
      const pv = mk(frames.length * cw * Z + (frames.length - 1) * 8, ch * Z); const pg = pv.getContext('2d');
      pg.fillStyle = '#fff'; pg.fillRect(0, 0, pv.width, pv.height);
      pg.imageSmoothingEnabled = false;
      frames.forEach((_, i) => pg.drawImage(sheet, i * (w + GUTTER) + fcx - cw / 2, fcy - ch * 0.4, cw, ch, i * (cw * Z + 8), 0, cw * Z, ch * Z));
      preview = pv.toDataURL('image/png');
    }
    const r1 = (v) => Math.round(v * 10) / 10, m = smile ?? beak;
    out.push({
      id, w, feet, sheet: sheet.toDataURL('image/png'), preview,
      log: `${id}: src ${W}x${Hs} -> ${w}x${babyMode ? BABY_H : H}; eyes L(${r1(L.cx)},${r1(L.cy)} ${L.bw}x${L.bh}) R(${r1(R.cx)},${r1(R.cy)} ${R.bw}x${R.bh}) of ${blobs.length} blobs; ${smile ? 'smile' : 'beak'} cx ${r1(m.cx)} y ${m.top}-${m.bottom} w ${m.bw}; skin ${skins.map((s) => s.join(',')).join(' ')}; patches from ${fills.join(' ')}`,
    });
  }
  return out;
}

const pi = process.argv.indexOf('--preview');
const previewDir = pi > 0 ? process.argv[pi + 1] : null;
const server = await serveRepo();
const browser = await launchChrome({ width: 800, height: 600 });
try {
  await browser.open(server.url + 'assets/art/home-companions-v1.png', 600);
  const baby = process.argv.includes('--baby'), suffix = baby ? '-baby' : '';
  const res = await browser.evaluate(`(${bake})(${JSON.stringify(PETS)}, ${H}, ${GUTTER}, ${!!previewDir}, ${baby}, ${BABY_H})`);
  const png = (url) => Buffer.from(url.split(',')[1], 'base64');
  if (previewDir) mkdirSync(previewDir, { recursive: true });
  for (const r of res) {
    writeFileSync(join(REPO_ROOT, 'assets/art', `pet-${r.id}${suffix}.png`), png(r.sheet));
    if (previewDir) writeFileSync(join(previewDir, `${baby ? 'baby' : 'face'}-${r.id}.png`), png(r.preview));
    console.log(r.log);
  }
  const body = res.map((r) => `  ${r.id}: { w: ${r.w}, h: ${baby ? BABY_H : H}, gutter: ${GUTTER}, frames: ${FRAMES}, feet: ${r.feet ? `{ top: ${r.feet.top}, bottom: ${r.feet.bottom}, split: ${r.feet.split} }` : 'null'} },`).join('\n');
  mkdirSync(join(REPO_ROOT, 'src/pets'), { recursive: true });
  /* One file, two blocks: each mode rewrites its own and keeps the other. */
  const file = join(REPO_ROOT, 'src/pets/sheets.js');
  let old = '';
  try { old = readFileSync(file, 'utf8'); } catch { /* the first bake */ }
  const keep = (name) => old.match(new RegExp(`export const ${name} = \\{[\\s\\S]*?\\n\\};\\n`))?.[0] ?? '';
  const mine = `export const ${baby ? 'BABY_SHEETS' : 'SHEETS'} = {\n${body}\n};\n`;
  writeFileSync(file,
    `/* Generated by tools/bake-pets.mjs. Frame i of assets/art/pet-<id>.png sits at\n   x = i * (w + gutter); frames: idle, blink, happy, talk, sleep. \`feet\` is where\n   the two feet are in the idle frame (sheet px): they step on their own when a\n   pet walks (src/pets/sprite.js). BABY_SHEETS are pet-<id>-baby.png (--baby). */\n${baby ? keep('SHEETS') : mine}${baby ? mine : keep('BABY_SHEETS')}`);
  console.log(`wrote ${res.length} sheets + src/pets/sheets.js`);
} finally {
  browser.close();
  server.close();
}
