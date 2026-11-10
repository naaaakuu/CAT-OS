/**
 * paint-muddles.mjs — the nine Muddles, painted in code.
 *
 * Runs in headless Chrome (no npm), writes assets/art/muddle-<id>.webp as a
 * five-frame strip in the same order as a friend's sheet (idle, blink, happy,
 * talk, sleep = knocked silly) and src/duel/muddle-sheets.js.
 *
 *   node tools/paint-muddles.mjs            every Muddle
 *   node tools/paint-muddles.mjs baron      just the ones named
 *
 * A Muddle is a drop of old ink that has got ideas: a glossy indigo blob with
 * drips, big eyes, and one accessory that says which bad habit of English it
 * is. Everything draws from a seed, so a repaint is the same Muddle.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { serveRepo, launchChrome, REPO_ROOT } from './cdp-lite.mjs';

const CAST = {
  smudge: { seed: 11, w: 196, h: 176, ink: ['#3a3d78', '#20224f'], eyes: { r: 30, gap: 42, y: -8 }, baby: true },
  verbose: { seed: 23, w: 222, h: 224, ink: ['#403a74', '#201b48'], eyes: { r: 25, gap: 42, y: -16 } },
  scrambler: { seed: 37, w: 226, h: 206, ink: ['#34507a', '#172a4a'], eyes: { r: 25, gap: 44, y: -12 } },
  tangent: { seed: 41, w: 206, h: 232, ink: ['#40386e', '#1d1a40'], eyes: { r: 25, gap: 40, y: -22 } },
  ellipsis: { seed: 53, w: 214, h: 214, ink: ['#54407c', '#2a1e4e'], eyes: { r: 24, gap: 44, y: -14 }, lashes: true },
  gatecrasher: { seed: 67, w: 236, h: 202, ink: ['#2f5a70', '#163244'], eyes: { r: 26, gap: 46, y: -14 } },
  waffle: { seed: 71, w: 236, h: 218, ink: ['#4d4470', '#272045'], eyes: { r: 22, gap: 42, y: -8 } },
  mixup: { seed: 83, w: 214, h: 222, ink: ['#5a3a70', '#311d46'], eyes: { r: 24, gap: 42, y: -14 }, lashes: true },
  greatmuddle: { seed: 97, w: 292, h: 300, ink: ['#2a2750', '#0e0c26'], eyes: { r: 20, gap: 60, y: -40 } },
};

const paintAll = async (cast, only) => {
  const W = 336, H = 384, GROUND = 374;
  const FRAMES = ['idle', 'blink', 'happy', 'talk', 'sleep'];
  const OUTLINE = '#120f2a';
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const css = (c, a = 1) => `rgba(${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')},${a})`;
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  function rngFrom(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /** The drop's outline: a fat pear, its hem breaking into drips. */
  function bodyPath(g, cx, base, w, h, R) {
    const hw = w / 2, top = base - h;
    const drips = 5;
    const pts = [];
    for (let i = 0; i <= drips; i += 1) pts.push(cx - hw * 0.82 + (i / drips) * hw * 1.64);
    g.beginPath();
    g.moveTo(cx - hw * 0.86, base - 16);
    g.bezierCurveTo(cx - hw * 1.1, base - h * 0.38, cx - hw * 0.86, top + 6, cx, top);
    g.bezierCurveTo(cx + hw * 0.86, top + 6, cx + hw * 1.1, base - h * 0.38, cx + hw * 0.86, base - 16);
    for (let i = drips; i > 0; i -= 1) {
      const a = pts[i], b = pts[i - 1], m = (a + b) / 2;
      const deep = base - 6 + (i % 2 ? 11 + R() * 7 : R() * 3);
      g.quadraticCurveTo(a - 2, deep + 3, m, deep);
      g.quadraticCurveTo(b + 2, deep + 3, b, base - 12 - R() * 4);
    }
    g.closePath();
  }

  function paintInk(g, cx, base, w, h, spec, R) {
    const [lightC, darkC] = spec.ink.map(hex);
    const top = base - h;
    const seedR = R; // the same draws for every frame, so the coat does not flicker
    g.save();
    bodyPath(g, cx, base, w, h, seedR);
    const fill = g.createRadialGradient(cx - w * 0.2, top + h * 0.26, 8, cx, base - h * 0.4, Math.max(w, h) * 0.78);
    fill.addColorStop(0, css(mix(lightC, [120, 120, 190], 0.42)));
    fill.addColorStop(0.45, css(lightC));
    fill.addColorStop(1, css(darkC));
    g.fillStyle = fill; g.fill();
    g.clip();
    // wet mottling
    for (let i = 0; i < 90; i += 1) {
      const x = cx + (R() - 0.5) * w, y = top + R() * h, r = 8 + R() * 30;
      const dark = R() < 0.55;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const c = dark ? darkC : mix(lightC, [140, 150, 215], 0.4);
      grad.addColorStop(0, css(c, 0.13 + R() * 0.1)); grad.addColorStop(1, css(c, 0));
      g.fillStyle = grad; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // the strokes that follow the form
    g.lineCap = 'round';
    for (let i = 0; i < 70; i += 1) {
      const a = -Math.PI + R() * Math.PI, rr = 0.25 + R() * 0.75;
      const x = cx + Math.cos(a) * (w / 2) * rr, y = base - h * 0.5 + Math.sin(a) * (h / 2) * rr;
      g.strokeStyle = css(R() < 0.5 ? mix(lightC, [190, 190, 240], 0.3) : darkC, 0.08 + R() * 0.1);
      g.lineWidth = 1 + R() * 2.2;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (R() - 0.5) * 22, y + (R() - 0.5) * 22, x + (R() - 0.5) * 40, y + (R() - 0.5) * 34); g.stroke();
    }
    // warm rim on the shadow side, cool sky on the light side
    const rim = g.createLinearGradient(cx + w * 0.52, 0, cx + w * 0.16, 0);
    rim.addColorStop(0, 'rgba(232,150,120,.34)'); rim.addColorStop(1, 'rgba(232,150,120,0)');
    g.fillStyle = rim; g.fillRect(cx, top, w, h + 30);
    const sky = g.createLinearGradient(0, top - 4, 0, top + h * 0.3);
    sky.addColorStop(0, 'rgba(170,185,255,.3)'); sky.addColorStop(1, 'rgba(170,185,255,0)');
    g.fillStyle = sky; g.fillRect(cx - w, top - 4, w * 2, h * 0.34);
    // gloss: the thing that makes it read as wet ink
    const gx = cx - w * 0.26, gy = top + h * 0.2;
    g.save(); g.translate(gx, gy); g.rotate(-0.5); g.scale(1, 0.56);
    const gloss = g.createRadialGradient(0, 0, 2, 0, 0, w * 0.24);
    gloss.addColorStop(0, 'rgba(255,255,255,.55)'); gloss.addColorStop(0.5, 'rgba(225,230,255,.2)'); gloss.addColorStop(1, 'rgba(225,230,255,0)');
    g.fillStyle = gloss; g.beginPath(); g.arc(0, 0, w * 0.24, 0, 7); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,.62)';
    g.beginPath(); g.ellipse(gx - 8, gy - 6, 8, 4, -0.55, 0, 7); g.fill();
    g.beginPath(); g.ellipse(gx + 24, gy - 18, 3, 2, -0.5, 0, 7); g.fill();
    g.restore();
    // the ink line
    bodyPath(g, cx, base, w, h, spec.__R2());
    g.strokeStyle = OUTLINE; g.lineWidth = 6.5; g.lineJoin = 'round'; g.stroke();
  }

  const outlined = (g, fill, lw = 4, stroke = OUTLINE) => { g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); };

  function eye(g, x, y, r, mood, lookX = 0, lookY = 0, lash = false) {
    if (mood === 'blink') {
      g.strokeStyle = '#efe8ff'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - r * 0.85, y + 2); g.quadraticCurveTo(x, y + r * 0.45, x + r * 0.85, y + 2); g.stroke();
      if (lash) { g.lineWidth = 3.4; for (const dx of [-0.8, 0, 0.8]) { g.beginPath(); g.moveTo(x + dx * r, y + r * 0.2); g.lineTo(x + dx * r * 1.25, y + r * 0.62); g.stroke(); } }
      return;
    }
    if (mood === 'happy') {
      g.strokeStyle = '#efe8ff'; g.lineWidth = 7; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - r * 0.88, y + 6); g.quadraticCurveTo(x, y - r * 0.95, x + r * 0.88, y + 6); g.stroke();
      return;
    }
    if (mood === 'sleep') { // knocked silly: spiral eyes
      g.beginPath(); g.arc(x, y, r, 0, 7); outlined(g, '#f4eefb', 3.5);
      g.strokeStyle = '#3a2f66'; g.lineWidth = 3.4; g.lineCap = 'round';
      g.beginPath();
      for (let t = 0; t < Math.PI * 4.4; t += 0.2) { const rr = 1.5 + (t / (Math.PI * 4.4)) * (r - 5); const px = x + Math.cos(t) * rr, py = y + Math.sin(t) * rr; if (t === 0) g.moveTo(px, py); else g.lineTo(px, py); }
      g.stroke();
      return;
    }
    g.beginPath(); g.ellipse(x, y, r, r * 1.08, 0, 0, 7); outlined(g, '#fbf6ee', 3.5);
    g.beginPath(); g.ellipse(x, y + r * 0.55, r * 0.74, r * 0.34, 0, 0, 7); g.fillStyle = 'rgba(170,150,190,.28)'; g.fill();
    const px = x + lookX * r * 0.3, py = y + lookY * r * 0.3 + r * 0.06;
    g.beginPath(); g.ellipse(px, py, r * 0.6, r * 0.68, 0, 0, 7); g.fillStyle = '#161226'; g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(px - r * 0.2, py - r * 0.26, r * 0.2, 0, 7); g.fill();
    g.beginPath(); g.arc(px + r * 0.2, py + r * 0.22, r * 0.09, 0, 7); g.fill();
    if (lash) {
      g.strokeStyle = OUTLINE; g.lineWidth = 3.6; g.lineCap = 'round';
      for (const a of [-2.6, -2.2, -1.8]) { const sign = x > 168 ? -1 : 1; const ax = Math.cos(a) * r * sign, ay = Math.sin(a) * r * 1.08; g.beginPath(); g.moveTo(x + ax, y + ay); g.lineTo(x + ax * 1.32, y + ay * 1.32); g.stroke(); }
    }
  }

  function mouth(g, x, y, mood, size = 1) {
    g.lineCap = 'round';
    if (mood === 'talk') {
      g.beginPath(); g.ellipse(x, y + 4, 18 * size, 15 * size, 0, 0, 7); outlined(g, '#7a2840', 3.5);
      g.beginPath(); g.ellipse(x, y + 12, 10 * size, 6 * size, 0, 0, 7); g.fillStyle = '#d96a7c'; g.fill();
    } else if (mood === 'happy') {
      g.beginPath(); g.moveTo(x - 27 * size, y - 3); g.quadraticCurveTo(x, y + 30 * size, x + 27 * size, y - 3); g.closePath(); outlined(g, '#7a2840', 3.5);
      g.save(); g.beginPath(); g.moveTo(x - 27 * size, y - 3); g.quadraticCurveTo(x, y + 30 * size, x + 27 * size, y - 3); g.closePath(); g.clip();
      g.fillStyle = '#fbf6ee'; g.fillRect(x - 30 * size, y - 6, 60 * size, 10 * size); g.restore();
    } else if (mood === 'sleep') {
      g.strokeStyle = '#efe8ff'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(x - 18 * size, y + 5); for (let i = 1; i <= 6; i += 1) g.lineTo(x - 18 * size + i * 6 * size, y + 5 + (i % 2 ? -6 : 3)); g.stroke();
    } else {
      g.strokeStyle = '#efe8ff'; g.lineWidth = 5.4;
      g.beginPath(); g.moveTo(x - 14 * size, y + 2); g.quadraticCurveTo(x, y + 12 * size, x + 15 * size, y); g.stroke();
    }
  }

  const fingers = (g, x, y, r, c) => { g.beginPath(); g.arc(x, y, r, 0, 7); outlined(g, c, 3.6); };

  /* ---- What makes each one who they are ------------------------- */
  function goldGrad(g, x0, y0, x1, y1) { const G = g.createLinearGradient(x0, y0, x1, y1); G.addColorStop(0, '#fbe08a'); G.addColorStop(0.55, '#d9a93b'); G.addColorStop(1, '#8f6516'); return G; }

  const EXTRAS = {
    smudge(g, ctx) { // a bitten letter held up, like a biscuit
      const { cx, top, f } = ctx;
      g.save(); g.translate(cx, top + 2);
      g.beginPath(); g.moveTo(0, 6); g.bezierCurveTo(-20, -12, 2, -18, 4, -36); g.bezierCurveTo(10, -18, 22, -10, 0, 6); outlined(g, '#2a2c64', 5);
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(0, -16, 2.4, 6, 0.4, 0, 7); g.fill();
      g.restore();
      // the bitten letter, painted alone so the bite cannot go through the body
      const hy = ctx.base - 58, hx = cx - ctx.w * 0.5 - 6;
      const lc = document.createElement('canvas'); lc.width = 112; lc.height = 112;
      const l = lc.getContext('2d');
      l.font = '800 74px Georgia, serif'; l.textAlign = 'center'; l.textBaseline = 'middle';
      l.lineJoin = 'round'; l.lineWidth = 9; l.strokeStyle = OUTLINE; l.strokeText('e', 54, 54);
      l.fillStyle = goldGrad(l, 54, 22, 54, 86); l.fillText('e', 54, 54);
      if (f !== 'sleep') { l.globalCompositeOperation = 'destination-out'; l.beginPath(); l.arc(86, 26, 15, 0, 7); l.arc(72, 18, 11, 0, 7); l.fill(); l.globalCompositeOperation = 'source-over'; }
      g.drawImage(lc, hx - 54, hy - 54);
      fingers(g, hx - 2, hy + 34, 13, '#3a3d78');
    },
    verbose(g, ctx) { // top hat, monocle, moustache
      const { cx, top, eyeL, eyeR, eyeY, r, mY, f } = ctx;
      g.save(); g.translate(cx + 6, top + 2); g.rotate(0.05);
      g.beginPath(); g.ellipse(0, 6, 76, 15, 0, 0, 7); outlined(g, '#2b1f44', 5);
      g.beginPath(); g.moveTo(-42, 2); g.lineTo(-37, -78); g.quadraticCurveTo(0, -90, 37, -78); g.lineTo(42, 2); g.quadraticCurveTo(0, 12, -42, 2); outlined(g, '#3a2a5c', 5);
      g.beginPath(); g.moveTo(-42, -8); g.quadraticCurveTo(0, 2, 42, -8); g.lineTo(41, -26); g.quadraticCurveTo(0, -16, -41, -26); g.closePath(); outlined(g, goldGrad(g, -40, -30, 40, 0), 3);
      g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(-30, -74); g.quadraticCurveTo(-22, -40, -32, -6); g.lineTo(-20, -8); g.quadraticCurveTo(-12, -40, -20, -78); g.closePath(); g.fill();
      g.restore();
      if (f !== 'sleep') {
        g.beginPath(); g.arc(eyeR, eyeY, r + 8, 0, 7); g.strokeStyle = OUTLINE; g.lineWidth = 8.5; g.stroke(); g.strokeStyle = goldGrad(g, eyeR - 26, eyeY - 26, eyeR + 26, eyeY + 26); g.lineWidth = 5; g.stroke();
        g.strokeStyle = '#d9a93b'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(eyeR + r + 6, eyeY + 6); g.bezierCurveTo(eyeR + r + 30, eyeY + 40, eyeR + 20, eyeY + 90, eyeR + 40, eyeY + 112); g.stroke();
      }
      const c = '#f1e7d2';
      for (const s of [-1, 1]) {
        g.save(); g.translate(cx, mY - 16); g.scale(s, 1);
        g.beginPath(); g.moveTo(2, 2); g.bezierCurveTo(30, -18, 48, 4, 56, -14); g.bezierCurveTo(60, 8, 26, 22, 2, 12); g.closePath(); outlined(g, c, 3.6);
        g.restore();
      }
    },
    scrambler(g, ctx) { // a frying pan of scrambled eggs for a hat, and letters that will not sit still
      const { cx, top, i } = ctx;
      g.save(); g.translate(cx - 2, top + 14); g.rotate(-0.12);
      g.save(); g.translate(58, -2); g.rotate(0.1); g.beginPath(); g.roundRect(0, -8, 92, 16, 8); outlined(g, '#3d3d46', 4.5); g.restore();
      g.beginPath(); g.ellipse(0, 0, 74, 21, 0, 0, 7); outlined(g, '#3d3d46', 5);
      g.beginPath(); g.ellipse(0, -5, 62, 13, 0, 0, 7); g.fillStyle = '#2a2a33'; g.fill();
      const R = rngFrom(7);
      for (let n = 0; n < 15; n += 1) { const x = (R() - 0.5) * 100, y = -8 - R() * 14; g.beginPath(); g.ellipse(x, y, 13 + R() * 9, 9 + R() * 5, R() * 2, 0, 7); outlined(g, n % 3 ? '#f8d868' : '#fff1b4', 3); }
      g.restore();
      g.font = '800 30px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const letters = [['t', -88, 52, -0.6], ['h', 112, 74, 0.5], ['e', -112, 118, 0.4], ['?', 116, 150, -0.3]];
      for (const [t, dx, dy, rot] of letters) {
        g.save(); g.translate(cx + dx + (i % 2 ? 3 : -3), top + dy + (i % 3 ? 2 : -2)); g.rotate(rot); g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = OUTLINE; g.strokeText(t, 0, 0); g.fillStyle = '#f8d868'; g.fillText(t, 0, 0); g.restore();
      }
    },
    tangent(g, ctx) { // a Count's collar (painted behind him, see BACK) and a spring antenna that wanders off
      const { cx, top, base, i } = ctx;
      g.save(); g.translate(cx - 6, top + 4); g.strokeStyle = OUTLINE; g.lineWidth = 8; g.lineCap = 'round'; g.lineJoin = 'round';
      const path = () => { g.beginPath(); g.moveTo(0, 2); g.bezierCurveTo(-6, -24, 26, -28, 28, -46); g.bezierCurveTo(30, -66, 2, -70, 6, -48); g.bezierCurveTo(10, -24, 58, -32, 66, -60); g.bezierCurveTo(72, -82, 96, -84, 106, -66); };
      path(); g.stroke(); g.strokeStyle = '#a9b0f0'; g.lineWidth = 3.4; path(); g.stroke();
      const ey = i % 2 ? 2 : -2;
      g.beginPath(); g.arc(112, -60 + ey, 12, 0, 7); outlined(g, '#f4c443', 4);
      g.restore();
    },
    ellipsis(g, ctx) { // a grand hat with three dots on stalks, a string of pearls that stops early
      const { cx, top, base } = ctx;
      g.save(); g.translate(cx - 4, top + 12); g.rotate(-0.09);
      g.beginPath(); g.ellipse(0, 4, 98, 22, 0, 0, 7); outlined(g, '#6b3c72', 5);
      g.beginPath(); g.ellipse(0, 1, 84, 15, 0, 0, 7); g.fillStyle = '#854c8c'; g.fill();
      g.beginPath(); g.moveTo(-46, 0); g.bezierCurveTo(-52, -54, 52, -54, 46, 0); g.quadraticCurveTo(0, 10, -46, 0); outlined(g, '#854c8c', 5);
      g.beginPath(); g.moveTo(-46, -6); g.quadraticCurveTo(0, 6, 46, -6); g.lineTo(45, -18); g.quadraticCurveTo(0, -6, -45, -18); g.closePath(); outlined(g, '#f4c7d8', 3);
      [-30, 0, 30].forEach((x, n) => { g.strokeStyle = OUTLINE; g.lineWidth = 4; g.beginPath(); g.moveTo(x * 0.7, -38); g.lineTo(x, -72 - (n === 1 ? 10 : 0)); g.stroke(); g.beginPath(); g.arc(x, -78 - (n === 1 ? 10 : 0), 13, 0, 7); outlined(g, goldGrad(g, x - 12, -92, x + 12, -66), 4); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x - 4, -82 - (n === 1 ? 10 : 0), 3.4, 0, 7); g.fill(); });
      g.restore();
      for (let n = 0; n < 5; n += 1) { const t = n / 4; const x = cx - 44 + t * 72, y = base - 40 + Math.sin(t * Math.PI) * 16; g.beginPath(); g.arc(x, y, 9, 0, 7); outlined(g, '#f6efe4', 3.2); }
    },
    gatecrasher(g, ctx) { // a party hat, a kazoo, confetti it brought with it
      const { cx, top, i, mX, mY, f } = ctx;
      g.save(); g.translate(cx + 16, top + 6); g.rotate(0.28);
      g.beginPath(); g.moveTo(-40, 6); g.lineTo(0, -96); g.lineTo(40, 6); g.quadraticCurveTo(0, 18, -40, 6); outlined(g, '#e0533f', 5);
      g.save(); g.clip(); for (let n = -3; n < 8; n += 1) { g.fillStyle = n % 2 ? '#f4c443' : '#3e9c96'; g.save(); g.translate(0, n * 16); g.rotate(-0.55); g.fillRect(-60, 0, 130, 7); g.restore(); } g.restore();
      g.beginPath(); g.arc(0, -100, 14, 0, 7); outlined(g, '#f6efe4', 4);
      g.restore();
      if (f !== 'sleep') { g.save(); g.translate(mX + 16, mY + 10); g.rotate(-0.22); g.beginPath(); g.roundRect(0, -10, 70, 20, 8); outlined(g, '#3e9c96', 4); g.beginPath(); g.moveTo(68, -14); g.lineTo(104, -24); g.lineTo(104, 24); g.lineTo(68, 14); g.closePath(); outlined(g, '#f4c443', 4); g.restore(); }
      const R = rngFrom(19 + i);
      for (let n = 0; n < 16; n += 1) { const a = R() * 6.28, d = 96 + R() * 56; g.save(); g.translate(cx + Math.cos(a) * d, ctx.base - ctx.h * 0.6 + Math.sin(a) * d * 0.85); g.rotate(R() * 4); g.fillStyle = ['#e0533f', '#f4c443', '#3e9c96', '#f4c7d8'][n % 4]; g.fillRect(-6, -3, 12, 6); g.restore(); }
    },
    waffle(g, ctx) { // a golden waffle helmet, syrup, a very small wobbly sword
      const { cx, top, base, f } = ctx;
      g.save(); g.translate(cx, top + 34);
      g.beginPath(); g.roundRect(-92, -58, 184, 88, 18); outlined(g, '#c98b35', 5.5);
      g.save(); g.beginPath(); g.roundRect(-84, -50, 168, 72, 13); g.clip();
      g.fillStyle = '#e9b458'; g.fillRect(-90, -56, 180, 86);
      g.strokeStyle = '#a66d24'; g.lineWidth = 7; for (let x = -84; x <= 84; x += 28) { g.beginPath(); g.moveTo(x, -56); g.lineTo(x, 30); g.stroke(); } for (let y = -50; y <= 30; y += 28) { g.beginPath(); g.moveTo(-90, y); g.lineTo(90, y); g.stroke(); }
      g.fillStyle = '#7a3f12'; g.globalAlpha = 0.25; for (let x = -70; x <= 70; x += 28) for (let y = -36; y <= 20; y += 28) g.fillRect(x, y, 12, 12);
      g.globalAlpha = 1; g.restore();
      g.beginPath(); g.moveTo(-36, -60); g.bezierCurveTo(-28, -30, -48, -22, -36, 24); g.bezierCurveTo(-30, 36, -14, 36, -14, 18); g.bezierCurveTo(-14, -6, -6, -30, -2, -60); g.closePath(); outlined(g, '#a0601e', 3.5);
      g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(-28, 8, 3.4, 11, 0.12, 0, 7); g.fill();
      g.restore();
      if (f !== 'sleep') { g.save(); g.translate(cx + 96, base - 96); g.rotate(0.3); g.beginPath(); g.moveTo(-5, -4); g.bezierCurveTo(-12, -36, 10, -56, 0, -96); g.bezierCurveTo(16, -56, -2, -36, 7, -4); g.closePath(); outlined(g, '#d6dbe8', 4); g.beginPath(); g.roundRect(-22, -6, 44, 11, 5); outlined(g, '#d9a93b', 4); g.beginPath(); g.roundRect(-5, 3, 10, 26, 4); outlined(g, '#6b3c2c', 4); g.restore(); }
    },
    mixup(g, ctx) { // a plumed hat and spectacles worn upside down
      const { cx, top, eyeL, eyeR, eyeY, r, f, i } = ctx;
      g.save(); g.translate(cx - 2, top + 8); g.rotate(-0.1);
      g.beginPath(); g.ellipse(0, 4, 82, 17, 0, 0, 7); outlined(g, '#2a7a72', 5);
      g.beginPath(); g.moveTo(-42, 2); g.quadraticCurveTo(0, -52, 42, 2); g.quadraticCurveTo(0, 12, -42, 2); outlined(g, '#2f8f85', 5);
      g.save(); g.translate(22 + (i % 2 ? 2 : -2), -30); g.rotate(0.55);
      g.beginPath(); g.moveTo(0, 18); g.bezierCurveTo(-34, -24, -12, -78, 18, -116); g.bezierCurveTo(40, -70, 40, -18, 0, 18); outlined(g, '#f4c7d8', 4.5);
      g.strokeStyle = '#cf7f9f'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(0, 18); g.quadraticCurveTo(8, -46, 18, -112); g.stroke();
      g.restore(); g.restore();
      if (f !== 'blink' && f !== 'happy') {
        for (const ex of [eyeL, eyeR]) { g.beginPath(); g.ellipse(ex, eyeY + 2, r + 10, r + 9, 0, 0, 7); g.strokeStyle = OUTLINE; g.lineWidth = 8.5; g.stroke(); g.strokeStyle = '#e0533f'; g.lineWidth = 5; g.stroke(); }
        g.strokeStyle = OUTLINE; g.lineWidth = 7.5; g.beginPath(); g.moveTo(eyeL + r + 8, eyeY + 12); g.quadraticCurveTo(cx, eyeY + 24, eyeR - r - 8, eyeY + 12); g.stroke(); g.strokeStyle = '#e0533f'; g.lineWidth = 4; g.stroke();
        for (const [x, s] of [[eyeL - r - 10, -1], [eyeR + r + 10, 1]]) { g.strokeStyle = OUTLINE; g.lineWidth = 7.5; g.beginPath(); g.moveTo(x, eyeY - 4); g.quadraticCurveTo(x + s * 8, eyeY + 20, x + s * 4, eyeY + 40); g.stroke(); g.strokeStyle = '#e0533f'; g.lineWidth = 4; g.stroke(); }
      }
    },
    greatmuddle(g, ctx) { // a crown of bent pen nibs and too many eyes
      const { cx, top, base, f, i } = ctx;
      const open = f !== 'sleep';
      for (let n = 0; n < 7; n += 1) {
        const a = -Math.PI / 2 + (n - 3) * 0.3; const x = cx + Math.cos(a) * 96, y = top + 54 + Math.sin(a) * 70;
        g.save(); g.translate(x, y); g.rotate(a + Math.PI / 2 + (n % 2 ? 0.12 : -0.12));
        g.beginPath(); g.moveTo(-13, 26); g.bezierCurveTo(-13, -8, -5, -28, 0, -50); g.bezierCurveTo(5, -28, 13, -8, 13, 26); g.closePath(); outlined(g, goldGrad(g, -12, -50, 12, 26), 4.5);
        g.fillStyle = OUTLINE; g.beginPath(); g.arc(0, -2, 4.5, 0, 7); g.fill(); g.strokeStyle = OUTLINE; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -8); g.lineTo(0, -40); g.stroke();
        g.restore();
      }
      if (open) for (const [dx, dy, s] of [[-92, -72, 0.72], [96, -86, 0.66], [-110, 16, 0.52], [112, 8, 0.56], [-40, -118, 0.46], [50, -128, 0.42]]) {
        const ey = base - 150 + dy; const ex = cx + dx;
        g.beginPath(); g.ellipse(ex, ey, 16 * s + 6, 18 * s + 6, 0, 0, 7); outlined(g, '#f6eadf', 3.5);
        g.beginPath(); g.ellipse(ex + (i % 2 ? 2 : -2), ey + 1, 11 * s, 13 * s, 0, 0, 7); g.fillStyle = '#7a1320'; g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - 3, ey - 4, 3 * s + 1, 0, 7); g.fill();
      }
    },
  };

  /* Painted before the ink, so it stands behind the body. */
  const BACK = {
    tangent(g, { cx, base }) {
      for (const s of [-1, 1]) {
        g.save(); g.translate(cx, base - 120); g.scale(s, 1);
        g.beginPath(); g.moveTo(40, 66); g.lineTo(150, -70); g.lineTo(134, 66); g.quadraticCurveTo(96, 92, 40, 66); outlined(g, '#6a2436', 5);
        g.beginPath(); g.moveTo(66, 56); g.lineTo(138, -40); g.lineTo(122, 54); g.quadraticCurveTo(94, 74, 66, 56); g.fillStyle = '#b8415a'; g.fill();
        g.restore();
      }
    },
  };

  function paintFrame(id, spec, f) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    const R = rngFrom(spec.seed);
    spec.__R2 = () => rngFrom(spec.seed);
    const cx = W / 2 - 6, base = GROUND - 14, w = spec.w, h = spec.h, top = base - h;
    const i = FRAMES.indexOf(f);
    // little feet, under everything
    BACK[id]?.(g, { cx, base, top, w, h });
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * w * 0.24, GROUND - 8, 26, 12, s * 0.14, 0, 7); outlined(g, spec.ink[1], 5); }
    paintInk(g, cx, base, w, h, spec, R);
    const { r, gap, y: ey } = spec.eyes;
    const eyeY = base - h * 0.5 + ey, eyeL = cx - gap, eyeR = cx + gap;
    const mX = cx + 2, mY = eyeY + r + 28;
    const ctx = { cx, base, top, w, h, f, i, eyeL, eyeR, eyeY, r, mX, mY };
    let lookL = 0, lookY = 0, lookR = 0;
    if (id === 'tangent' && (f === 'idle' || f === 'talk')) { lookL = -1; lookR = 1; lookY = -0.6; }
    if (id === 'scrambler' && (f === 'idle' || f === 'talk')) { lookL = 0.7; lookR = -0.7; }
    const face = f === 'blink' ? 'blink' : f === 'happy' ? 'happy' : f === 'sleep' ? 'sleep' : 'open';
    if (id === 'scrambler' && face === 'open') {
      eye(g, eyeL, eyeY, r * 1.18, face, lookL, lookY); eye(g, eyeR, eyeY + 4, r * 0.8, face, lookR, lookY);
    } else if (id === 'greatmuddle' && face === 'open') {
      eye(g, eyeL, eyeY, r * 1.3, face, 0, 0.2); eye(g, eyeR, eyeY, r * 1.3, face, 0, 0.2);
      g.fillStyle = 'rgba(120,16,32,.45)'; for (const ex of [eyeL, eyeR]) { g.beginPath(); g.arc(ex, eyeY + 2, r * 0.6, 0, 7); g.fill(); }
    } else {
      eye(g, eyeL, eyeY, r, face, lookL, lookY, spec.lashes); eye(g, eyeR, eyeY, r, face, lookR, lookY, spec.lashes);
    }
    // cheeks
    if (!['greatmuddle'].includes(id)) { g.fillStyle = 'rgba(232,120,150,.3)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * (gap + r * 0.95), eyeY + r + 12, 15, 9, 0, 0, 7); g.fill(); } }
    const mood = f === 'talk' ? 'talk' : f === 'happy' ? 'happy' : f === 'sleep' ? 'sleep' : 'still';
    if (id === 'greatmuddle') {
      // a mouth full of letters
      g.save(); g.translate(cx, mY + 18);
      g.beginPath(); g.moveTo(-92, -8); g.quadraticCurveTo(0, f === 'talk' ? 88 : 58, 92, -8); g.quadraticCurveTo(0, f === 'talk' ? 6 : 16, -92, -8); g.closePath(); outlined(g, '#3a0f22', 5);
      g.font = '800 25px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f6eadf';
      'muddle'.split('').forEach((ch, n) => { const t = (n + 0.5) / 6; const x = -66 + t * 132; const y = 13 + Math.sin(t * Math.PI) * 18; g.save(); g.translate(x, y); g.rotate((n - 3) * 0.1); g.fillText(ch, 0, 0); g.restore(); });
      g.restore();
    } else if (id !== 'waffle') mouth(g, mX, mY - (id === 'verbose' ? 2 : 0), mood);
    else mouth(g, mX, mY + 4, mood, 0.9);
    // arms reach forward for the rope (their left, our right is the side the friend is on: the sheet faces left)
    if (id !== 'smudge') fingers(g, cx - w * 0.5 + 6, base - h * 0.32, 15, spec.ink[0]);
    EXTRAS[id]?.(g, ctx);
    if (f === 'sleep') { // stars going round
      g.font = '700 26px Georgia, serif'; g.textAlign = 'center';
      const R3 = rngFrom(spec.seed + 3);
      for (let n = 0; n < 4; n += 1) { const a = R3() * 6.28; const x = cx + Math.cos(a) * w * 0.5, y = top - 2 + Math.sin(a) * 24; g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = OUTLINE; g.strokeText('✦', x, y); g.fillStyle = '#f4c443'; g.fillText('✦', x, y); }
    }
    // the same paper tooth as the friends: a soft luminance grain over the ink
    const img = g.getImageData(0, 0, W, H), d = img.data, Rg = rngFrom(spec.seed + 91);
    for (let p = 0; p < d.length; p += 4) { if (d[p + 3] < 8) continue; const n = (Rg() - 0.5) * 11; d[p] = Math.max(0, Math.min(255, d[p] + n)); d[p + 1] = Math.max(0, Math.min(255, d[p + 1] + n)); d[p + 2] = Math.max(0, Math.min(255, d[p + 2] + n)); }
    g.putImageData(img, 0, 0);
    return c;
  }

  const out = {};
  for (const [id, spec] of Object.entries(cast)) {
    if (only.length && !only.includes(id)) continue;
    const strip = document.createElement('canvas'); strip.width = (W + 4) * FRAMES.length - 4; strip.height = H;
    const g = strip.getContext('2d');
    FRAMES.forEach((f, i) => g.drawImage(paintFrame(id, spec, f), i * (W + 4), 0));
    out[id] = strip.toDataURL('image/webp', 0.86);
  }
  return { out, W, H };
};

const srv = await serveRepo(REPO_ROOT);
const page = await launchChrome({ width: 800, height: 600 });
await page.open(`${srv.url}privacy.html`, 500);
const only = process.argv.slice(2);
const res = await page.evaluate(`(${paintAll.toString()})(${JSON.stringify(CAST)}, ${JSON.stringify(only)})`);
for (const [id, url] of Object.entries(res.out)) {
  const file = join(REPO_ROOT, 'assets', 'art', `muddle-${id}.webp`);
  writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
  console.log('painted', id);
}
if (!only.length) {
  const lines = Object.keys(CAST).map((id) => `  ${id}: { w: ${res.W}, h: ${res.H}, gutter: 4, frames: 5 },`).join('\n');
  writeFileSync(join(REPO_ROOT, 'src', 'duel', 'muddle-sheets.js'), `/* Generated by tools/paint-muddles.mjs. Frame i of assets/art/muddle-<id>.webp sits at\n   x = i * (w + gutter); frames: idle, blink, happy, talk, sleep (knocked silly). */\nexport const MUDDLE_SHEETS = {\n${lines}\n};\n`);
}
page.close();
srv.close();
process.exit(0);
