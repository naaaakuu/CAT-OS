/**
 * art-nature.js — trees, bushes, flowers, grass, rocks, reeds: the things
 * the village is set among. Each recipe returns { w, h, ax, ay, draw }.
 */

import { PAL, FLOWERS, rng, mix, hexA, dark, light } from './brush.js';

export function tree({ kind = 'round', size = 1, seed = 't', tone = 0, autumn = false, lean = 0 }) {
  const r = rng(`tree:${seed}`);
  const R = 18 * size;
  const tilt = lean * 0.026;
  if (kind === 'pine') {
    const H = R * 3.2, W = R * 2.3;
    const w = W + 10, h = H + 14;
    return {
      w, h, ax: w / 2, ay: h - 5,
      draw(d, c) {
        const cx = w / 2, ground = h - 5;
        d.shadow(cx, ground, R * 1.0, R * 0.36, 0.22);
        d.rr(cx - R * 0.2, ground - R * 0.95, R * 0.4, R * 1.0, 2).solid(PAL.woodDark);
        if (tilt) { c.translate(cx, ground - R * 0.5); c.rotate(tilt); c.translate(-cx, -(ground - R * 0.5)); }
        const base = tone ? mix(PAL.pine, PAL.leaf, 0.35) : PAL.pine;
        const tiers = [[ground - R * 0.55, W / 2 + R * 0.15, R * 1.3], [ground - R * 1.35, W * 0.45, R * 1.25], [ground - R * 2.05, W * 0.34, R * 1.2]];
        if (size >= 1.3) tiers.push([ground - R * 2.7, W * 0.22, R * 0.9]);
        const pts = (yb, hw, th) => [[cx - hw, yb], [cx - hw * 0.4, yb - th * 0.08], [cx - hw * 0.15, yb - th * 0.12], [cx, yb - th], [cx + hw * 0.15, yb - th * 0.12], [cx + hw * 0.4, yb - th * 0.08], [cx + hw, yb]];
        for (const [yb, hw, th] of tiers) d.poly(pts(yb, hw + 1, th + 1)).fill(dark(base, 0.38));
        for (const [yb, hw, th] of tiers) { d.poly(pts(yb, hw, th)); d.c.fillStyle = d.hgrad(cx - hw, cx + hw, [[0, light(base, 0.3)], [0.5, base], [1, mix(base, '#1A3A40', 0.28)]]); d.c.fill(); }
        for (const [yb, hw, th] of tiers) d.poly([[cx - hw * 0.55, yb - th * 0.3], [cx - hw * 0.12, yb - th * 0.82], [cx, yb - th], [cx - hw * 0.3, yb - th * 0.25]]).fill(hexA('#FFFFFF', 0.16));
        d.circ(cx, ground - H + 1, 1.5).fill(light(base, 0.35));
      },
    };
  }
  // A round broadleaf: a cluster of lobes with one silhouette, lit from the upper left.
  const off = (r() - 0.5) * 3;
  const w = R * 2.8 + 10, h = R * 2.7 + 16;
  const base = autumn ? [PAL.autumn, '#D9603F', '#E5B84A'][Math.floor(r() * 3)] : tone === 1 ? mix(PAL.leaf, PAL.pine, 0.4) : tone === 2 ? mix(PAL.leaf, '#9ED45A', 0.35) : PAL.leaf;
  const lobes = [
    [w / 2 - R * 0.66 + off, h - 12 - R * 1.05, R * 0.8],
    [w / 2 + R * 0.62 + off, h - 12 - R * 1.0, R * 0.84],
    [w / 2 + off * 0.5, h - 12 - R * 1.28, R * 0.98],
    [w / 2 + R * 0.06 + off, h - 12 - R * 1.9, R * 0.72],
    [w / 2 - R * 0.5 + off, h - 12 - R * 1.6, R * 0.6],
    [w / 2 + R * 0.55 + off, h - 12 - R * 1.55, R * 0.62],
  ];
  return {
    w, h, ax: w / 2, ay: h - 5,
    draw(d, c) {
      const cx = w / 2, ground = h - 5;
      d.shadow(cx, ground, R * 1.1, R * 0.4, 0.22);
      d.rr(cx - R * 0.17, ground - R * 1.15, R * 0.34, R * 1.2, 2).solid(PAL.woodDark);
      d.line([[cx - R * 0.1, ground - R * 0.9], [cx - R * 0.45, ground - R * 1.3]]).stroke(PAL.woodDark, R * 0.14);
      d.rr(cx - R * 0.17 + 1, ground - R * 1.05, R * 0.1, R * 0.85, 1).fill(hexA('#FFFFFF', 0.14));
      if (tilt) { c.translate(cx, ground - R * 0.9); c.rotate(tilt); c.translate(-cx, -(ground - R * 0.9)); }
      for (const [x, y, rr] of lobes) d.circ(x, y, rr + 1.1).fill(dark(base, 0.4));
      for (const [x, y, rr] of lobes) { d.circ(x, y, rr); d.c.fillStyle = d.vgrad(y - rr, y + rr, [[0, light(base, 0.3)], [0.55, base], [1, mix(base, '#1A3A20', 0.3)]]); d.c.fill(); }
      // The lit crown: a soft highlight up-left, a second small one right.
      d.gleam(cx - R * 0.4 + off, ground - R * 2.0, R * 0.6, R * 0.42, 0.32);
      d.gleam(cx + R * 0.5 + off, ground - R * 1.25, R * 0.36, R * 0.28, 0.16);
      // A few leaf clusters for texture.
      for (let i = 0; i < 5; i += 1) { const x = cx + (r() - 0.5) * R * 1.7 + off, y = ground - R * 0.9 - r() * R * 1.2; d.ell(x, y, R * 0.16, R * 0.1).fill(hexA(light(base, 0.35), 0.5)); }
      if (autumn) for (let i = 0; i < 4; i += 1) d.circ(cx + (r() - 0.5) * R * 1.6, ground - R * 0.9 - r() * R, 1.4).fill(hexA('#FFF3C4', 0.6));
    },
  };
}

export function bush({ seed = 'b', size = 1, berries = false, flowers = false }) {
  const r = rng(`bush:${seed}`);
  const R = 9 * size;
  const w = R * 2.9 + 8, h = R * 2.0 + 8;
  const lobes = [[w / 2 - R * 0.72, h - 5 - R * 0.6, R * 0.74], [w / 2 + R * 0.66, h - 5 - R * 0.62, R * 0.8], [w / 2, h - 5 - R * 0.98, R * 0.92], [w / 2 - R * 0.2, h - 5 - R * 0.5, R * 0.6]];
  return {
    w, h, ax: w / 2, ay: h - 4,
    draw(d) {
      d.shadow(w / 2, h - 4, R * 1.15, R * 0.36, 0.18);
      for (const [x, y, rr] of lobes) d.circ(x, y, rr + 1).fill(dark(PAL.leaf, 0.4));
      for (const [x, y, rr] of lobes) { d.circ(x, y, rr); d.c.fillStyle = d.vgrad(y - rr, y + rr, [[0, light(PAL.leaf, 0.3)], [1, mix(PAL.leaf, '#1A3A20', 0.26)]]); d.c.fill(); }
      d.gleam(w / 2 - R * 0.35, h - 5 - R * 1.35, R * 0.5, R * 0.35, 0.3);
      if (berries) for (let i = 0; i < 6; i += 1) d.circ(w / 2 + (r() - 0.5) * R * 1.9, h - 5 - R * 0.5 - r() * R * 0.95, 1.4).solid('#D9414E', { ow: 0.6 });
      if (flowers) for (let i = 0; i < 5; i += 1) d.circ(w / 2 + (r() - 0.5) * R * 1.9, h - 5 - R * 0.5 - r() * R * 0.95, 1.7).solid(FLOWERS[i % FLOWERS.length], { ow: 0.5 });
    },
  };
}

export function flower({ color = 0, seed = 'f', size = 1 }) {
  const w = 10 * size, h = 13 * size;
  const col = FLOWERS[color % FLOWERS.length];
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      const cx = w / 2, cy = 3.8 * size;
      d.line([[cx, h - 1], [cx + 0.4 * size, cy + 2]]).stroke(PAL.leafDark, 1.2 * size);
      d.ell(cx + 2.4 * size, h - 5.5 * size, 2.2 * size, 1.1 * size).fill(PAL.leaf);
      for (let i = 0; i < 5; i += 1) { const a = (i / 5) * Math.PI * 2; d.circ(cx + Math.cos(a) * 2.3 * size, cy + Math.sin(a) * 2.3 * size, 1.8 * size).solid(col, { ow: 0.5, oc: dark(col, 0.25) }); }
      d.circ(cx, cy, 1.4 * size).solid(col === '#F6C445' ? '#FFFFFF' : '#F6C445', { ow: 0.4 });
    },
  };
}

export function flowerPatch({ seed = 'fp', n = 5, w = 28, h = 15 }) {
  const r = rng(`fp:${seed}`);
  const spots = Array.from({ length: n }, () => ({ x: 4 + r() * (w - 8), y: 6 + r() * (h - 8), c: Math.floor(r() * FLOWERS.length), s: 0.75 + r() * 0.45 }));
  spots.sort((a, b) => a.y - b.y);
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      for (const s of spots) {
        const cx = s.x, cy = s.y - 3.2 * s.s;
        d.line([[cx, s.y + 2], [cx, cy + 1.5]]).stroke(PAL.leafDark, 0.9);
        d.ell(cx + 1.6, s.y + 0.5, 1.4, 0.7).fill(PAL.leaf);
        const col = FLOWERS[s.c];
        for (let i = 0; i < 5; i += 1) { const a = (i / 5) * Math.PI * 2 + 0.3; d.circ(cx + Math.cos(a) * 1.7 * s.s, cy + Math.sin(a) * 1.7 * s.s, 1.25 * s.s).fill(col); }
        d.circ(cx, cy, 0.95 * s.s).fill(col === '#F6C445' ? '#FFFFFF' : '#F6C445');
      }
    },
  };
}

export function grassTuft({ seed = 'g' }) {
  const r = rng(`tuft:${seed}`);
  const w = 12, h = 8;
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      for (let i = 0; i < 5; i += 1) { const x = 2 + i * 2 + r(); d.line([[x, h - 1], [x + (r() - 0.5) * 3.5, 1 + r() * 2.5]]).stroke(i % 2 ? PAL.grassDeep : PAL.grassDark, 1.1); }
    },
  };
}

export function reeds({ seed = 'rd', n = 5 }) {
  const r = rng(`reeds:${seed}`);
  const w = 18, h = 26;
  const stalks = Array.from({ length: n }, (_, i) => ({ x: 3 + i * (12 / Math.max(1, n - 1)) + (r() - 0.5) * 2, hh: 14 + r() * 10, lean: (r() - 0.5) * 4, head: r() > 0.4 }));
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      for (const s of stalks) {
        d.line([[s.x, h - 1], [s.x + s.lean, h - 1 - s.hh]]).stroke(mix(PAL.leafDark, '#7FA86A', 0.5), 1.2);
        if (s.head) d.rr(s.x + s.lean - 1.2, h - 1 - s.hh - 1, 2.4, 6, 1.2).fill('#7A5A3E');
        d.line([[s.x, h - 6], [s.x + s.lean * 0.5 + 3, h - 12]]).stroke(hexA('#7FA86A', 0.8), 1);
      }
    },
  };
}

export function rock({ seed = 'r', size = 1 }) {
  const r = rng(`rock:${seed}`);
  const W = 13 * size, H = 9 * size;
  const w = W + 6, h = H + 6;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      d.shadow(w / 2, h - 2, W * 0.55, H * 0.3, 0.18);
      const pts = []; const n = 8;
      for (let i = 0; i < n; i += 1) { const a = (i / n) * Math.PI * 2; const rr = 0.82 + r() * 0.34; pts.push([w / 2 + Math.cos(a) * W * 0.5 * rr, h - 2 - H * 0.55 + Math.sin(a) * H * 0.5 * rr]); }
      d.poly(pts).shade(PAL.stone, h - 2 - H, h - 2, { lt: 0.28, dk: 0.28 });
      d.gleam(w / 2 - W * 0.18, h - 2 - H * 0.78, W * 0.3, H * 0.25, 0.4);
      d.ell(w / 2 + W * 0.15, h - 2 - H * 0.3, W * 0.16, H * 0.1).fill(hexA(PAL.leaf, 0.5));
    },
  };
}

export function stump({ seed = 's' }) {
  const w = 18, h = 16;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      d.shadow(w / 2, h - 2, 8, 2.8, 0.18);
      d.rr(3, 5, 12, 9, 2).shade(PAL.wood, 5, 14);
      d.ell(9, 5.5, 6, 3).solid(PAL.woodLight);
      d.ell(9, 5.5, 3.6, 1.7).stroke(dark(PAL.woodLight, 0.2), 0.6);
      d.ell(9, 5.5, 1.4, 0.7).stroke(dark(PAL.woodLight, 0.2), 0.6);
    },
  };
}

export function hay({ seed = 'h' }) {
  const w = 20, h = 15;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      d.shadow(w / 2, h - 2, 9, 2.8, 0.18);
      d.rr(2, 1, 16, 12, 3).shade('#E2B95A', 1, 13, { lt: 0.25 });
      for (let i = 0; i < 3; i += 1) d.line([[4, 4 + i * 3], [16, 4 + i * 3]]).stroke(hexA('#8A6A20', 0.35), 0.7);
      d.line([[7, 1], [7, 13]]).stroke(hexA('#6B4E1B', 0.4), 0.8);
      d.line([[13, 1], [13, 13]]).stroke(hexA('#6B4E1B', 0.4), 0.8);
    },
  };
}

export function log({ seed = 'l' }) {
  const w = 24, h = 12;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      d.shadow(w / 2, h - 2, 11, 2.4, 0.18);
      d.rr(3, 2, 19, 8, 4).shade(PAL.wood, 2, 10);
      d.ell(4, 6, 2.6, 3.6).solid(PAL.woodLight, { ow: 0.6 });
      d.ell(4, 6, 1.2, 1.6).stroke(dark(PAL.woodLight, 0.25), 0.5);
      d.line([[8, 4], [20, 4]]).stroke(hexA('#000', 0.1), 0.8);
    },
  };
}

export const NATURE = { tree, bush, flower, flowerPatch, grassTuft, reeds, rock, stump, hay, log };
