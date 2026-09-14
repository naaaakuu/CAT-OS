/**
 * art-things.js — props, animals, glyphs, icons and effects. The small
 * things that make a village look lived in, and the marks the interface
 * borrows so the sheets are drawn by the same hand as the map.
 */

import { PAL, FLOWERS, rng, mix, hexA, dark, light, shade, lit, P, starPts } from './brush.js';

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

export function fence({ w = 44, gate = false }) {
  const h = 20;
  return {
    w: w + 6, h, ax: (w + 6) / 2, ay: h - 3,
    draw(d) {
      const ground = h - 3;
      const posts = Math.max(2, Math.round(w / 14) + 1);
      const step = w / (posts - 1);
      d.rr(3, ground - 11, w, 2.6, 1).solid(PAL.woodLight, { ow: 0.7 });
      d.rr(3, ground - 5.5, w, 2.6, 1).solid(PAL.woodLight, { ow: 0.7 });
      for (let i = 0; i < posts; i += 1) {
        const x = 3 + i * step;
        d.shadow(x, ground, 2.6, 1.1, 0.16);
        d.rr(x - 1.8, ground - 14, 3.6, 14, 1.4).shade(PAL.woodLight, ground - 14, ground, { lt: 0.18, dk: 0.2 });
        d.poly([[x - 1.8, ground - 14], [x, ground - 16], [x + 1.8, ground - 14]]).fill(PAL.woodLight);
      }
      if (gate) { d.line([[w / 2 - 5, ground - 4], [w / 2 + 7, ground - 11]]).stroke(PAL.woodDark, 1.3); }
    },
  };
}

export function stoneWall({ w = 50 }) {
  const h = 14;
  return {
    w: w + 4, h, ax: (w + 4) / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow((w + 4) / 2, ground, w * 0.5, 2, 0.16);
      d.rr(2, ground - 9, w, 9, 2).shade(PAL.stone, ground - 9, ground, { lt: 0.16, dk: 0.2 });
      for (let i = 0; i < Math.floor(w / 9); i += 1) { const x = 4 + i * 9 + (i % 2) * 3; d.rr(x, ground - 8 + (i % 2) * 4, 7, 3.5, 1.5).fill(hexA(i % 3 ? PAL.stoneLight : PAL.stoneDark, 0.5)); }
    },
  };
}

export function signpost({ arrows = 1 }) {
  const w = 28, h = 32;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow(w / 2, ground, 4.5, 1.6, 0.16);
      d.rr(w / 2 - 1.8, ground - 22, 3.6, 22, 1).shade(PAL.woodDark, ground - 22, ground);
      for (let i = 0; i < arrows; i += 1) {
        const y = 4 + i * 8;
        d.poly(i % 2 ? [[3, y], [19, y], [24, y + 3], [19, y + 6], [3, y + 6]] : [[9, y], [25, y], [25, y + 6], [9, y + 6], [4, y + 3]]).shade(PAL.woodLight, y, y + 6);
        d.line([[i % 2 ? 6 : 11, y + 3], [i % 2 ? 16 : 21, y + 3]]).stroke(hexA(PAL.timber, 0.5), 1);
      }
    },
  };
}

/** The village's order board: a wooden notice board with papers pinned to it. */
export function board({ notes = 2, ready = 0, night = false }) {
  const w = 44, h = 44;
  return {
    w, h, ax: w / 2, ay: h - 3,
    draw(d) {
      const ground = h - 3;
      d.shadow(w / 2, ground, 16, 3.5, 0.18);
      // Posts and a little roof.
      d.rr(5, ground - 30, 3.4, 30, 1.2).shade(PAL.woodDark, ground - 30, ground);
      d.rr(w - 9, ground - 30, 3.4, 30, 1.2).shade(PAL.woodDark, ground - 30, ground);
      d.rr(3, 8, w - 6, 22, 2.5).shade(PAL.plank, 8, 30, { lt: 0.2 });
      for (let i = 0; i < 3; i += 1) d.line([[5, 13 + i * 6], [w - 5, 13 + i * 6]]).stroke(hexA(PAL.timber, 0.25), 0.8);
      d.poly([[1, 9], [w / 2, 2], [w - 1, 9], [w - 1, 11], [w / 2, 4.5], [1, 11]]).shade(PAL.roofBrown, 2, 11);
      // Papers.
      const n = Math.max(0, Math.min(4, notes));
      for (let i = 0; i < n; i += 1) {
        const x = 7 + i * 8 + (i % 2) * 1.5, y = 12 + (i % 2) * 3;
        d.rr(x, y, 7.5, 10, 1).solid(i < ready ? '#FFF1B8' : PAL.page, { ow: 0.6, oc: hexA(PAL.outline, 0.35) });
        d.line([[x + 1.5, y + 3], [x + 6, y + 3]]).stroke(PAL.pageLine, 0.7); d.line([[x + 1.5, y + 5.5], [x + 5, y + 5.5]]).stroke(PAL.pageLine, 0.7); d.line([[x + 1.5, y + 8], [x + 5.5, y + 8]]).stroke(PAL.pageLine, 0.7);
        d.circ(x + 3.75, y + 0.6, 0.9).fill(i < ready ? PAL.coinDark : '#D9414E');
      }
      if (night) d.glow(w / 2, 16, 14, PAL.glow, 0.18);
    },
  };
}

export function lamp({ lit: isLit = false }) {
  const w = 14, h = 36;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2, cx = w / 2;
      d.shadow(cx, ground, 4, 1.4, 0.18);
      d.rr(cx - 3, ground - 3.5, 6, 3.5, 1.2).solid(PAL.iron);
      d.rr(cx - 1.1, 10, 2.2, ground - 13, 1).solid(PAL.iron);
      d.circ(cx, 11, 1.8).fill(PAL.iron);
      d.rr(cx - 3.6, 3.5, 7.2, 9, 1.6).solid(isLit ? PAL.glassNight : '#C9D6E0', { oc: PAL.iron, ow: 1 });
      d.line([[cx, 3.5], [cx, 12.5]]).stroke(hexA(PAL.iron, 0.5), 0.6);
      d.poly([[cx - 4.6, 3.8], [cx, 0.5], [cx + 4.6, 3.8]]).solid(PAL.iron, { ow: 0.6 });
      if (isLit) { d.glow(cx, 8, 11, PAL.glow, 0.6); d.circ(cx, 8, 1.8).fill('#FFF8DC'); }
    },
  };
}

export function well() {
  const w = 36, h = 42;
  return {
    w, h, ax: w / 2, ay: h - 3,
    draw(d) {
      const ground = h - 3, cx = w / 2;
      d.shadow(cx, ground, 15, 5, 0.2);
      d.ell(cx, ground - 6, 13, 6).shade(PAL.stone, ground - 12, ground, { lt: 0.2 });
      d.ell(cx, ground - 10, 13, 6).shade(PAL.stone, ground - 16, ground - 4, { lt: 0.25 });
      for (let i = 0; i < 6; i += 1) d.rr(cx - 11 + i * 4, ground - 9 + (i % 2) * 1.5, 3, 2, 1).fill(hexA(i % 2 ? PAL.stoneDark : PAL.stoneLight, 0.45));
      d.ell(cx, ground - 10, 9, 4).solid(PAL.waterDeep, { oc: dark(PAL.stone, 0.4) });
      d.gleam(cx - 2.5, ground - 11, 3.5, 1.4, 0.5);
      d.rr(cx - 12, 10, 2.8, ground - 18, 1).solid(PAL.woodDark);
      d.rr(cx + 9.2, 10, 2.8, ground - 18, 1).solid(PAL.woodDark);
      d.poly([[cx - 16, 11], [cx, 1.5], [cx + 16, 11], [cx + 13, 13.5], [cx, 5.5], [cx - 13, 13.5]]).shade(PAL.roofRed, 1.5, 13.5);
      d.rr(cx - 0.9, 11, 1.8, ground - 22, 0.6).solid(PAL.iron, { outline: false });
      d.rr(cx - 3, ground - 18, 6, 4.6, 1.2).solid(PAL.woodLight);
    },
  };
}

export function cart({ load = 'hay' }) {
  const w = 46, h = 30;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow(w / 2, ground, 19, 5, 0.2);
      d.rr(7, 9, 30, 13, 2.5).shade(PAL.wood, 9, 22);
      for (let i = 0; i < 3; i += 1) d.line([[11 + i * 9, 10], [11 + i * 9, 21]]).stroke(hexA(PAL.timber, 0.5), 0.8);
      if (load === 'hay') { d.ell(22, 9, 14, 6).shade('#E2B95A', 3, 15, { lt: 0.28 }); d.line([[13, 9], [31, 9]]).stroke(hexA('#8A6A20', 0.3), 0.7); }
      else if (load === 'books') { for (let i = 0; i < 3; i += 1) d.rr(10 + i * 9, 4 + (i % 2) * 2, 8, 6, 1).shade([PAL.book, PAL.bookBlue, PAL.bookGreen][i], 4, 10); }
      else { for (let i = 0; i < 3; i += 1) d.rr(10 + i * 9, 3 + (i % 2) * 2, 8, 8, 1.5).shade(PAL.woodLight, 3, 11); }
      d.line([[37, 17], [44, 13]]).stroke(PAL.woodDark, 1.8);
      for (const x of [14, 32]) { d.circ(x, ground - 4.5, 5.2).solid(PAL.woodDark, { oc: PAL.timber, ow: 1 }); d.circ(x, ground - 4.5, 1.8).fill(PAL.woodLight); d.circ(x, ground - 4.5, 3.6).stroke(hexA('#000', 0.15), 0.8); }
    },
  };
}

export function crate({ kind = 'crate' } = {}) {
  const w = 18, h = 18;
  return {
    w, h, ax: w / 2, ay: h - 3,
    draw(d) {
      const ground = h - 3;
      d.shadow(w / 2, ground, 7, 2.4, 0.18);
      if (kind === 'barrel') {
        d.rr(3, 1, 12, 14, 4.5).shade(PAL.wood, 1, 15);
        d.line([[3, 4.5], [15, 4.5]]).stroke(PAL.iron, 1.2); d.line([[3, 11], [15, 11]]).stroke(PAL.iron, 1.2);
        d.line([[8, 2], [8, 14]]).stroke(hexA('#000', 0.1), 0.8);
      } else if (kind === 'sack') {
        d.rr(3, 4, 12, 11, 4.5).shade('#D9C39A', 4, 15);
        d.rr(6.5, 1, 5, 4.5, 2).solid('#C7AE82');
        d.line([[5, 9], [13, 9]]).stroke(hexA('#000', 0.08), 1);
      } else if (kind === 'books') {
        // A stack of books, the top one open.
        d.rr(3, 10, 12, 4, 1).shade(PAL.bookBlue, 10, 14);
        d.rr(4, 6, 11, 4, 1).shade(PAL.book, 6, 10);
        d.rr(3.5, 2, 12, 4, 1).shade(PAL.bookGreen, 2, 6);
        for (const y of [11.2, 7.2, 3.2]) d.line([[5, y + 1.6], [13, y + 1.6]]).stroke(hexA('#FFF', 0.5), 0.7);
      } else {
        // An oblique crate: a lit front, a shaded side, a top.
        d.rr(2, 5, 11, 10, 1.4).shade(PAL.woodLight, 5, 15);
        d.poly([[13, 5], P(13, 5, 6), P(13, 15, 6), [13, 15]]).solid(shade(PAL.woodLight, 0.25), { oc: dark(PAL.woodLight, 0.35), ow: 0.8 });
        d.poly([[2, 5], [13, 5], P(13, 5, 6), P(2, 5, 6)]).solid(lit(PAL.woodLight, 0.2), { oc: dark(PAL.woodLight, 0.35), ow: 0.8 });
        d.line([[2, 10], [13, 10]]).stroke(hexA(PAL.timber, 0.5), 0.8);
        d.line([[7.5, 5], [7.5, 15]]).stroke(hexA(PAL.timber, 0.5), 0.8);
      }
    },
  };
}

export function bench() {
  const w = 26, h = 16;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow(w / 2, ground, 11, 2.4, 0.16);
      d.rr(4, ground - 8, 2.4, 8, 0.8).solid(PAL.woodDark);
      d.rr(19.6, ground - 8, 2.4, 8, 0.8).solid(PAL.woodDark);
      d.rr(1, ground - 9.5, 24, 3.4, 1.4).shade(PAL.woodLight, ground - 9.5, ground - 6);
      d.rr(2, ground - 14, 22, 2.6, 1.2).shade(PAL.woodLight, ground - 14, ground - 11);
      d.rr(5, ground - 12, 1.6, 3, 0.6).fill(PAL.woodDark); d.rr(19, ground - 12, 1.6, 3, 0.6).fill(PAL.woodDark);
    },
  };
}

export function beds({ seed = 'bd', w = 46, rows = 3, grown = 1, flowers = false }) {
  const r = rng(`beds:${seed}`);
  const h = 9 + rows * 8;
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      d.rr(1, 1, w - 2, h - 3, 3).shade(PAL.soil, 1, h - 2, { lt: 0.12, dk: 0.16, oc: dark(PAL.soil, 0.35) });
      for (let i = 0; i < rows; i += 1) {
        const y = 6 + i * 8;
        d.line([[4, y], [w - 4, y]]).stroke(hexA('#000', 0.12), 2.6);
        const n = Math.floor((w - 8) / 5.5);
        for (let k = 0; k < n; k += 1) {
          if (r() > grown) continue;
          const x = 6 + k * 5.5 + (r() - 0.5);
          if (flowers && k % 2 === 0) { const col = FLOWERS[(i + k) % FLOWERS.length]; d.circ(x, y - 2.4, 1.9).solid(col, { ow: 0.5 }); d.circ(x, y - 2.4, 0.8).fill('#FFF2A8'); }
          else { d.line([[x, y + 0.5], [x - 1.6, y - 3]]).stroke(PAL.leafDark, 1.1); d.line([[x, y + 0.5], [x + 1.6, y - 3.2]]).stroke(PAL.leaf, 1.1); }
        }
      }
    },
  };
}

export function hive() {
  const w = 16, h = 19;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow(w / 2, ground, 7, 2.2, 0.16);
      d.rr(3.5, ground - 4.5, 9, 4.5, 1).solid(PAL.woodDark);
      d.rr(2.5, 5, 11, ground - 9.5, 2).shade(PAL.white, 5, ground - 4.5);
      d.line([[2.5, 9], [13.5, 9]]).stroke(hexA('#000', 0.08), 1);
      d.poly([[1, 5.5], [w / 2, 1], [w - 1, 5.5]]).shade(PAL.roofRed, 1, 5.5);
      d.rr(7, ground - 8, 2, 1.8, 0.5).fill(PAL.iron);
    },
  };
}

export function plotSign({ kind = 'sale' }) {
  const w = 26, h = 28;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2, cx = w / 2;
      d.shadow(cx, ground, 4.5, 1.6, 0.16);
      d.rr(cx - 1.6, ground - 16, 3.2, 16, 1).shade(PAL.woodDark, ground - 16, ground);
      d.rr(2, 2, 22, 12, 2.5).shade(PAL.woodLight, 2, 14);
      if (kind === 'sale') { d.circ(cx, 8, 3.8).solid(PAL.coin, { oc: PAL.coinDark, ow: 0.8 }); d.circ(cx, 8, 1.4).fill(PAL.coinLight); }
      else { d.line([[6, 6], [20, 6]]).stroke(hexA(PAL.timber, 0.5), 1.4); d.line([[6, 10], [15, 10]]).stroke(hexA(PAL.timber, 0.5), 1.4); }
    },
  };
}

export function laundry({ seed = 'ln', frame = 0 }) {
  const r = rng(`laundry:${seed}`);
  const w = 52, h = 30;
  const items = Array.from({ length: 4 }, (_, i) => ({ x: 8 + i * 11, col: [PAL.white, PAL.roofBlue, PAL.cloth, PAL.threadLight][Math.floor(r() * 4)], hh: 9 + r() * 5 }));
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.rr(2, ground - 26, 2.6, 26, 1).solid(PAL.woodDark);
      d.rr(w - 5, ground - 26, 2.6, 26, 1).solid(PAL.woodDark);
      d.line([[3.5, ground - 24], [w - 3.5, ground - 24]]).stroke(PAL.iron, 0.8);
      const sway = frame % 2 ? 1.5 : 0;
      for (const it of items) { d.poly([[it.x, ground - 24], [it.x + 8, ground - 24], [it.x + 8 + sway, ground - 24 + it.hh], [it.x + sway, ground - 24 + it.hh]]).solid(it.col, { ow: 0.6 }); d.circ(it.x + 1, ground - 24, 0.8).fill(PAL.woodDark); d.circ(it.x + 7, ground - 24, 0.8).fill(PAL.woodDark); }
    },
  };
}

export function boat({ frame = 0 }) {
  const w = 34, h = 16;
  return {
    w, h, ax: w / 2, ay: h - 3,
    draw(d) {
      const y = frame % 2 ? 0.6 : 0;
      d.ell(w / 2, h - 3, 14, 3).fill(hexA('#2A5A80', 0.25));
      d.poly([[3, 6 + y], [31, 6 + y], [27, 12 + y], [7, 12 + y]]).shade(PAL.wood, 6, 12, { lt: 0.2 });
      d.line([[6, 8.5 + y], [28, 8.5 + y]]).stroke(hexA(PAL.timber, 0.5), 0.8);
      d.rr(12, 5 + y, 10, 2.2, 1).solid(PAL.woodLight, { ow: 0.6 });
      d.line([[22, 5 + y], [30, 1 + y]]).stroke(PAL.woodDark, 1.2);
    },
  };
}

export function flowerBox({ w = 18 }) {
  const h = 10;
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      d.rr(1, 5, w - 2, 4.5, 1.2).shade(PAL.woodLight, 5, 9.5);
      for (let i = 0; i < Math.floor(w / 4.5); i += 1) d.circ(3 + i * 4.5, 4, 1.6).solid(FLOWERS[i % FLOWERS.length], { ow: 0.4 });
    },
  };
}

/** Books on a shelf outside the Reading House: the finished goods waiting to be collected. */
export function shelf({ count = 0, good = 'books' }) {
  const w = 30, h = 26;
  const cols = { books: [PAL.book, PAL.bookBlue, PAL.bookGreen], blooms: [PAL.bloom, '#F6C445', '#A785DD'], ink: [PAL.ink, PAL.inkLight, PAL.ink], cloth: [PAL.cloth, PAL.thread, PAL.roofTeal] }[good] ?? [PAL.book, PAL.bookBlue, PAL.bookGreen];
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const ground = h - 2;
      d.shadow(w / 2, ground, 13, 3.4, 0.18);
      d.rr(2, ground - 18, 26, 18, 2).shade(PAL.plank, ground - 18, ground, { lt: 0.16 });
      d.rr(2, ground - 9.5, 26, 1.6, 0.6).fill(PAL.woodDark);
      d.rr(2, ground - 18, 26, 1.6, 0.6).fill(PAL.woodDark);
      const n = Math.min(8, count);
      for (let i = 0; i < n; i += 1) {
        const row = i < 4 ? 0 : 1; const k = i % 4;
        const x = 4.5 + k * 6, y = row ? ground - 8 : ground - 16.5;
        if (good === 'books') { d.rr(x, y, 4.6, 7, 0.8).solid(cols[i % 3], { ow: 0.5 }); d.line([[x + 1, y + 1.5], [x + 1, y + 5.5]]).stroke(hexA('#FFF', 0.45), 0.6); }
        else if (good === 'blooms') { d.rr(x + 1.2, y + 1, 2.4, 6, 0.8).fill(PAL.leafDark); d.circ(x + 2.3, y + 1.5, 2.2).solid(cols[i % 3], { ow: 0.5 }); }
        else if (good === 'ink') { d.rr(x + 0.4, y + 1.5, 4, 5.5, 1.2).solid(PAL.glass, { ow: 0.5 }); d.rr(x + 0.9, y + 3.5, 3, 3, 0.6).fill(cols[i % 3]); d.rr(x + 1.4, y + 0.3, 2, 1.6, 0.4).fill(PAL.iron); }
        else { d.rr(x, y + 1, 4.6, 6, 1).solid(cols[i % 3], { ow: 0.5 }); d.line([[x, y + 3], [x + 4.6, y + 3]]).stroke(hexA('#FFF', 0.3), 0.6); }
      }
    },
  };
}



/* ------------------------------------------------------------------ */
/* Animals                                                             */
/* ------------------------------------------------------------------ */

export function sheep({ frame = 0 }) {
  const w = 26, h = 21;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const cx = 13, ground = 19;
      d.shadow(cx, ground, 9, 2.6, 0.2);
      const legs = frame % 2 ? 1 : 0;
      d.rr(cx - 7, ground - 6, 2.8, 6 - legs, 1).solid('#4E4A5C', { ow: 0.5 });
      d.rr(cx + 4, ground - 6, 2.8, 6 - (1 - legs), 1).solid('#4E4A5C', { ow: 0.5 });
      d.rr(cx - 3, ground - 6, 2.8, 5.5, 1).solid('#4E4A5C', { ow: 0.5 });
      const puffs = [[cx - 4.5, ground - 10.5, 5.2], [cx + 4.5, ground - 10.5, 5.2], [cx, ground - 13, 5.8], [cx - 1, ground - 8, 4.8], [cx + 2, ground - 8.5, 4.6]];
      for (const [x, y, r] of puffs) d.circ(x, y, r + 1).fill(dark(PAL.white, 0.35));
      for (const [x, y, r] of puffs) d.circ(x, y, r).fill(PAL.white);
      d.gleam(cx - 2.5, ground - 15, 4.5, 2.2, 0.5);
      d.ell(cx - 9.5, ground - 11, 3.8, 3.4).solid('#4E4A5C', { ow: 0.6 });
      d.ell(cx - 12, ground - 13.5, 1.8, 1.1).fill('#4E4A5C');
      d.ell(cx - 7.5, ground - 13.5, 1.8, 1.1).fill('#4E4A5C');
      d.circ(cx - 10.5, ground - 12, 0.9).fill('#FFFFFF');
      d.circ(cx - 10.6, ground - 12, 0.45).fill(PAL.outline);
    },
  };
}

export function chicken({ frame = 0 }) {
  const w = 14, h = 14;
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      const cx = 7, ground = 13;
      d.shadow(cx, ground, 4.5, 1.5, 0.18);
      d.line([[cx - 1.5, ground - 4], [cx - 1.5, ground]]).stroke(PAL.coinDark, 1.1);
      d.line([[cx + 1.5, ground - 4], [cx + 1.5, ground - (frame % 2 ? 0.8 : 0)]]).stroke(PAL.coinDark, 1.1);
      d.ell(cx, ground - 7, 5.2, 3.8).shade(PAL.white, ground - 11, ground - 3, { lt: 0.1 });
      d.poly([[cx - 5, ground - 8], [cx - 7.5, ground - 10.5], [cx - 4, ground - 6.5]]).solid(PAL.white, { ow: 0.5 });
      d.circ(cx + 4, ground - 10.5 + (frame % 2 ? 0.7 : 0), 2.7).solid(PAL.white, { ow: 0.7 });
      d.poly([[cx + 6.2, ground - 10.8], [cx + 9, ground - 10], [cx + 6.2, ground - 9.4]]).fill(PAL.coin);
      d.circ(cx + 4, ground - 13.4, 1.1).fill('#E04848'); d.circ(cx + 5.4, ground - 13.1, 1).fill('#E04848');
      d.circ(cx + 4.8, ground - 11.1, 0.55).fill(PAL.outline);
    },
  };
}

export function dog({ frame = 0, pose = 'walk' }) {
  const w = 24, h = 18;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const cx = 12, ground = 16, col = '#C88A52';
      d.shadow(cx, ground, 8, 2.3, 0.18);
      if (pose === 'sit') {
        d.ell(cx + 1, ground - 6, 6, 5).shade(col, ground - 11, ground - 1, { lt: 0.18 });
        d.rr(cx - 4, ground - 5, 2.6, 5, 1).solid(col, { ow: 0.5 }); d.rr(cx + 2, ground - 5, 2.6, 5, 1).solid(col, { ow: 0.5 });
      } else {
        d.rr(cx - 6, ground - 5, 2.8, 5 - (frame % 2), 1).solid(col, { ow: 0.5 });
        d.rr(cx + 3, ground - 5, 2.8, 5 - (1 - (frame % 2)), 1).solid(col, { ow: 0.5 });
        d.ell(cx, ground - 7.5, 7.5, 4.2).shade(col, ground - 12, ground - 3, { lt: 0.18 });
      }
      d.line([[cx + 7, ground - 9.5], [cx + 10.5, ground - 14 + (frame % 2 ? 2.5 : 0)]]).stroke(col, 1.8);
      d.circ(cx - 7, ground - 11.5, 4.2).shade(col, ground - 16, ground - 7, { lt: 0.18 });
      d.ell(cx - 10, ground - 10, 1.9, 2.8).solid(dark(col, 0.25), { ow: 0.5 });
      d.ell(cx - 4, ground - 10.5, 1.9, 2.6).solid(dark(col, 0.25), { ow: 0.5 });
      d.circ(cx - 8.2, ground - 12.4, 0.7).fill(PAL.outline);
      d.circ(cx - 10.8, ground - 10.4, 0.95).fill(PAL.outline);
      d.circ(cx - 7, ground - 9.5, 1.2).fill(hexA('#FFF', 0.5));
    },
  };
}

export function duck({ frame = 0 }) {
  const w = 14, h = 12;
  return {
    w, h, ax: w / 2, ay: h - 2,
    draw(d) {
      const cx = 7, ground = 10;
      d.ell(cx, ground + 0.5, 5.5, 1.6).fill(hexA('#2A5A80', 0.2));
      d.ell(cx, ground - 2.6, 5, 3).shade(PAL.white, ground - 6, ground, { lt: 0.1 });
      d.poly([[cx - 5, ground - 3.5], [cx - 7, ground - 5.5], [cx - 3.5, ground - 2]]).fill(PAL.white);
      d.circ(cx + 4, ground - 6.5 + (frame % 2 ? 0.5 : 0), 2.3).solid(PAL.white, { ow: 0.6 });
      d.poly([[cx + 6.2, ground - 6.6], [cx + 9.2, ground - 5.8], [cx + 6.2, ground - 5.2]]).fill(PAL.coin);
      d.circ(cx + 4.8, ground - 7.1, 0.55).fill(PAL.outline);
    },
  };
}

export function koi({ variant = 0, frame = 0 }) {
  const w = 18, h = 9;
  const body = ['#F27A3A', '#FBF7F0', '#F2A83A', '#E4553F'][variant % 4];
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      const cx = 9, cy = 4.5, k = frame % 2 ? 1 : -1;
      d.poly([[cx - 8, cy], [cx - 5.5, cy - 1.8 * k], [cx - 5, cy + 1.8 * k]]).fill(body);
      d.ell(cx + 0.5, cy, 6, 2.7).solid(body, { oc: dark(body, 0.25), ow: 0.5 });
      if (variant % 4 === 1) { d.circ(cx + 1, cy - 0.9, 1.5).fill('#F27A3A'); d.circ(cx - 2.2, cy + 0.7, 1.1).fill('#2B2B33'); }
      if (variant % 4 === 0) d.circ(cx + 2.2, cy, 1.3).fill('#FBF7F0');
      d.circ(cx + 4, cy - 0.7, 0.5).fill(PAL.outline);
      d.gleam(cx, cy - 1.1, 2.8, 1.1, 0.35);
    },
  };
}

export function butterfly({ color = 0, frame = 0 }) {
  const w = 9, h = 8;
  const col = FLOWERS[color % FLOWERS.length];
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      const cx = 4.5, cy = 4, k = frame % 2 ? 0.6 : 1;
      d.ell(cx - 2 * k, cy - 0.7, 2.1 * k, 1.8).solid(col, { ow: 0.45 });
      d.ell(cx + 2 * k, cy - 0.7, 2.1 * k, 1.8).solid(col, { ow: 0.45 });
      d.ell(cx - 1.5 * k, cy + 1.5, 1.4 * k, 1.2).fill(col);
      d.ell(cx + 1.5 * k, cy + 1.5, 1.4 * k, 1.2).fill(col);
      d.line([[cx, cy - 1.7], [cx, cy + 2.2]]).stroke(PAL.outline, 0.8);
    },
  };
}

export function bird({ frame = 0 }) {
  const w = 12, h = 7;
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      const y = frame % 2 ? 1.5 : 4;
      d.line([[1, 3.5], [6, y], [11, 3.5]]).stroke('#3A3846', 1.3);
    },
  };
}

export function rabbit({ frame = 0 }) {
  const w = 14, h = 14;
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      const cx = 7, ground = 13, col = '#D9CFC0';
      d.shadow(cx, ground, 5, 1.5, 0.16);
      d.ell(cx + 1, ground - 4, 4.8, 3.4).shade(col, ground - 8, ground, { lt: 0.15 });
      d.circ(cx - 3.5, ground - 6.5, 3).shade(col, ground - 10, ground - 3, { lt: 0.15 });
      d.ell(cx - 4.5, ground - 11 + (frame % 2 ? 0.5 : 0), 1.2, 3).solid(col, { ow: 0.5 });
      d.ell(cx - 2.2, ground - 11, 1.2, 3).solid(col, { ow: 0.5 });
      d.circ(cx - 4.8, ground - 7, 0.55).fill(PAL.outline);
      d.circ(cx + 5.5, ground - 5, 1.3).fill(PAL.white);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Glyphs, icons and the interface's marks                             */
/* ------------------------------------------------------------------ */

/** Small emblem glyphs used on signs, bubbles and as icons. */
export function drawGlyph(d, glyph, cx, cy, r) {
  switch (glyph) {
    case 'book': {
      d.rr(cx - r * 0.85, cy - r * 0.7, r * 1.7, r * 1.4, r * 0.15).solid(PAL.book, { oc: dark(PAL.book, 0.3), ow: 0.7 });
      d.rr(cx - r * 0.85, cy - r * 0.7, r * 0.3, r * 1.4, r * 0.12).fill(dark(PAL.book, 0.25));
      d.rr(cx - r * 0.35, cy - r * 0.4, r * 0.95, r * 0.75, r * 0.1).fill(PAL.page);
      d.line([[cx - r * 0.2, cy - r * 0.15], [cx + r * 0.42, cy - r * 0.15]]).stroke(PAL.pageLine, 0.6);
      d.line([[cx - r * 0.2, cy + r * 0.1], [cx + r * 0.3, cy + r * 0.1]]).stroke(PAL.pageLine, 0.6);
      d.gleam(cx - r * 0.3, cy - r * 0.45, r * 0.35, r * 0.25, 0.4);
      break;
    }
    case 'page': {
      d.poly([[cx - r * 0.75, cy - r], [cx + r * 0.35, cy - r], [cx + r * 0.75, cy - r * 0.6], [cx + r * 0.75, cy + r], [cx - r * 0.75, cy + r]]).solid(PAL.page, { oc: dark(PAL.page, 0.4), ow: 0.7 });
      d.poly([[cx + r * 0.35, cy - r], [cx + r * 0.35, cy - r * 0.6], [cx + r * 0.75, cy - r * 0.6]]).solid(mix(PAL.page, PAL.pageLine, 0.4), { ow: 0.5 });
      for (let i = 0; i < 3; i += 1) d.line([[cx - r * 0.45, cy - r * 0.25 + i * r * 0.38], [cx + r * 0.4 - (i === 2 ? r * 0.3 : 0), cy - r * 0.25 + i * r * 0.38]]).stroke(PAL.pageLine, 0.7);
      break;
    }
    case 'seed': {
      d.ell(cx, cy + r * 0.15, r * 0.62, r * 0.8).solid(PAL.seed, { oc: dark(PAL.seed, 0.3), ow: 0.7 });
      d.line([[cx, cy - r * 0.6], [cx + r * 0.1, cy - r * 1.0]]).stroke(PAL.leafDark, 1.1);
      d.ell(cx + r * 0.45, cy - r * 0.95, r * 0.42, r * 0.24).solid(PAL.leaf, { ow: 0.5 });
      d.gleam(cx - r * 0.2, cy - r * 0.15, r * 0.3, r * 0.35, 0.45);
      break;
    }
    case 'flower':
    case 'bloom': {
      for (let i = 0; i < 5; i += 1) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; d.ell(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.46, r * 0.46).solid(PAL.bloom, { oc: dark(PAL.bloom, 0.25), ow: 0.6 }); }
      d.circ(cx, cy, r * 0.36).solid('#FFD75E', { ow: 0.5 });
      d.gleam(cx - r * 0.3, cy - r * 0.45, r * 0.3, r * 0.25, 0.5);
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
    case 'ink': {
      d.rr(cx - r * 0.6, cy - r * 0.3, r * 1.2, r * 1.2, r * 0.25).solid(PAL.glass, { oc: dark(PAL.glass, 0.4), ow: 0.7 });
      d.rr(cx - r * 0.5, cy + r * 0.1, r * 1.0, r * 0.7, r * 0.15).fill(PAL.ink);
      d.rr(cx - r * 0.3, cy - r * 0.75, r * 0.6, r * 0.5, r * 0.12).solid(PAL.iron, { ow: 0.5 });
      d.gleam(cx - r * 0.3, cy - r * 0.1, r * 0.25, r * 0.3, 0.5);
      break;
    }
    case 'spool':
    case 'thread': {
      d.rr(cx - r * 0.62, cy - r * 0.8, r * 1.24, r * 1.6, r * 0.25).solid(PAL.thread, { oc: dark(PAL.thread, 0.3), ow: 0.7 });
      d.rr(cx - r * 0.85, cy - r * 1.0, r * 1.7, r * 0.34, r * 0.12).solid(PAL.woodLight, { ow: 0.6 });
      d.rr(cx - r * 0.85, cy + r * 0.66, r * 1.7, r * 0.34, r * 0.12).solid(PAL.woodLight, { ow: 0.6 });
      for (let i = 0; i < 4; i += 1) d.line([[cx - r * 0.6, cy - r * 0.55 + i * r * 0.36], [cx + r * 0.6, cy - r * 0.55 + i * r * 0.36]]).stroke(hexA('#FFF', 0.3), 0.55);
      d.line([[cx + r * 0.6, cy], [cx + r * 1.05, cy + r * 0.5]]).stroke(PAL.threadLight, 0.7);
      break;
    }
    case 'cloth': {
      d.rr(cx - r * 0.85, cy - r * 0.55, r * 1.7, r * 1.25, r * 0.2).solid(PAL.cloth, { oc: dark(PAL.cloth, 0.3), ow: 0.7 });
      d.line([[cx - r * 0.85, cy - r * 0.1], [cx + r * 0.85, cy - r * 0.1]]).stroke(hexA('#FFF', 0.35), 0.7);
      d.line([[cx - r * 0.85, cy + r * 0.3], [cx + r * 0.85, cy + r * 0.3]]).stroke(hexA('#FFF', 0.35), 0.7);
      d.poly([[cx - r * 0.85, cy - r * 0.55], [cx - r * 0.3, cy - r * 0.95], [cx + r * 0.9, cy - r * 0.95], [cx + r * 0.85, cy - r * 0.55]]).solid(light(PAL.cloth, 0.25), { ow: 0.6 });
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
      d.rr(cx - r * 0.7, cy - r * 0.6, r * 0.6, r * 0.8, r * 0.05).fill(PAL.page);
      d.rr(cx + r * 0.1, cy - r * 0.6, r * 0.6, r * 0.8, r * 0.05).fill(PAL.page);
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
    case 'zz': {
      d.line([[cx - r * 0.5, cy - r * 0.4], [cx + r * 0.3, cy - r * 0.4], [cx - r * 0.5, cy + r * 0.4], [cx + r * 0.3, cy + r * 0.4]]).stroke(PAL.white, 1.3);
      break;
    }
    case 'music': {
      d.line([[cx - r * 0.2, cy + r * 0.4], [cx - r * 0.2, cy - r * 0.8], [cx + r * 0.6, cy - r * 1.0], [cx + r * 0.6, cy + r * 0.2]]).stroke(PAL.outline, 1.2);
      d.ell(cx - r * 0.5, cy + r * 0.45, r * 0.35, r * 0.25).fill(PAL.outline);
      d.ell(cx + r * 0.3, cy + r * 0.25, r * 0.35, r * 0.25).fill(PAL.outline);
      break;
    }
    case 'sun': {
      d.circ(cx, cy, r * 0.5).solid('#F6C445', { oc: '#C7901E', ow: 0.6 });
      for (let i = 0; i < 8; i += 1) { const a = (i / 8) * Math.PI * 2; d.line([[cx + Math.cos(a) * r * 0.65, cy + Math.sin(a) * r * 0.65], [cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95]]).stroke('#C7901E', 1.1); }
      break;
    }
    default: {
      d.circ(cx, cy, r * 0.8).solid(PAL.stone);
    }
  }
}

/** Icons for the interface: one glyph on an optional little plate. */
export function icon({ glyph = 'star', plate = false, size = 16 }) {
  const w = size + 4, h = size + 4;
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      if (plate) d.rr(1, 1, w - 2, h - 2, 4).solid(PAL.white, { oc: hexA(PAL.outline, 0.25), ow: 0.7 });
      drawGlyph(d, glyph, w / 2, h / 2, size * 0.42);
    },
  };
}

/** A good, floating: used for the flights into buildings and pop-ups. */
export function good({ kind = 'pages', size = 14 }) {
  const glyph = { pages: 'page', books: 'book', seeds: 'seed', blooms: 'bloom', roots: 'root', ink: 'ink', thread: 'thread', cloth: 'cloth', coins: 'coin' }[kind] ?? kind;
  return icon({ glyph, size });
}

/** A speech bubble mark over a building: a plate with a glyph. */
export function bubble({ glyph = 'page', tone = 'plain' }) {
  const w = 28, h = 32;
  return {
    w, h, ax: w / 2, ay: h - 1,
    draw(d) {
      const bg = tone === 'ready' ? '#F6D77A' : tone === 'urgent' ? '#F26D7D' : PAL.white;
      d.rr(1.5, 1.5, w - 3, 22, 7).solid(bg, { oc: hexA(PAL.outline, 0.35), ow: 1 });
      d.poly([[w / 2 - 4, 22], [w / 2 + 4, 22], [w / 2, 28]]).solid(bg, { oc: hexA(PAL.outline, 0.35), ow: 1 });
      d.rr(4, 20, w - 8, 3.5, 1).fill(bg);
      drawGlyph(d, glyph, w / 2, 12.5, 6.6);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

export function leaf({ color = 0 }) {
  const w = 7, h = 6;
  const col = ['#E0913F', '#D9603F', '#E5B84A', '#F4B8CF', '#FFFFFF'][color % 5];
  return { w, h, ax: w / 2, ay: h / 2, draw(d) { d.ell(3.5, 3, 2.9, 1.7).solid(col, { ow: 0.4, oc: dark(col, 0.2) }); } };
}

export function cloud({ seed = 'c', w = 40 }) {
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

export function puff({ size = 1 }) {
  const w = 12 * size, h = 10 * size;
  return { w, h, ax: w / 2, ay: h / 2, draw(d) { d.circ(w / 2, h / 2, 3.6 * size).fill(hexA('#F1EDE6', 0.9)); d.circ(w / 2 - 2.4 * size, h / 2 + 1, 2.5 * size).fill(hexA('#F1EDE6', 0.85)); d.circ(w / 2 + 2.4 * size, h / 2 + 0.5, 2.7 * size).fill(hexA('#F1EDE6', 0.85)); } };
}

export function dust({ size = 1 }) {
  const w = 14 * size, h = 10 * size;
  return { w, h, ax: w / 2, ay: h / 2, draw(d) { d.circ(w / 2, h / 2, 4 * size).fill(hexA('#D9C39A', 0.8)); d.circ(w / 2 - 3 * size, h / 2 + 1.2, 2.8 * size).fill(hexA('#D9C39A', 0.7)); d.circ(w / 2 + 3 * size, h / 2 + 0.6, 3 * size).fill(hexA('#D9C39A', 0.7)); } };
}

export function sparkle({ size = 1, color = '#FFF1B8' }) {
  const w = 12 * size, h = 12 * size;
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      const cx = w / 2, cy = h / 2, r = 5 * size;
      d.poly([[cx, cy - r], [cx + r * 0.25, cy - r * 0.25], [cx + r, cy], [cx + r * 0.25, cy + r * 0.25], [cx, cy + r], [cx - r * 0.25, cy + r * 0.25], [cx - r, cy], [cx - r * 0.25, cy - r * 0.25]]).fill(color);
      d.circ(cx, cy, r * 0.3).fill('#FFFFFF');
    },
  };
}

/** A lamp's glow: additive, cached by radius, colour and strength. */
export function glow({ r = 40, color = PAL.glow, a = 0.5 }) {
  const w = r * 2 + 2, h = r * 2 + 2;
  return { w, h, ax: w / 2, ay: h / 2, draw(d) { d.glow(w / 2, h / 2, r, color, a); } };
}

/** A cloud's shadow on the ground: a soft dark ellipse. */
export function cloudShadow({ w = 180 }) {
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

/** A ring of progress drawn as a sprite (quantised to twelfths) for the world. */
export function ring({ pct = 0, r = 9, color = PAL.coin }) {
  const w = r * 2 + 6, h = r * 2 + 6;
  const p = Math.max(0, Math.min(12, Math.round(pct * 12))) / 12;
  return {
    w, h, ax: w / 2, ay: h / 2,
    draw(d) {
      const cx = w / 2, cy = h / 2;
      d.circ(cx, cy, r + 1.5).solid(PAL.white, { oc: hexA(PAL.outline, 0.35), ow: 1 });
      d.circ(cx, cy, r - 1).stroke(hexA(PAL.outline, 0.12), 2.6);
      if (p > 0) { d.c.beginPath(); d.c.arc(cx, cy, r - 1, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); d.stroke(color, 2.8); }
    },
  };
}

export const THINGS = {
  fence, stoneWall, signpost, board, lamp, well, cart, crate, bench, beds, hive, plotSign, laundry, boat, flowerBox, shelf,
  sheep, chicken, dog, duck, koi, butterfly, bird, rabbit,
  icon, good, bubble, leaf, cloud, puff, dust, sparkle, glow, cloudShadow, ring,
};
