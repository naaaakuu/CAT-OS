/**
 * mechanisms.js — the moving parts mounted on each house, drawn on its parts
 * canvas (scenery.js) every frame the house is on screen.
 *
 * Every part is a separate sprite from the art pack's atlases, hung from a
 * point on the house painted for it: the clock hands on the railway's and the
 * clockworks' blank faces, the clockworks' gear in its gable ring, the
 * telescope in the observatory's open dome slot, two carriages on the
 * railway's painted track, the glasshouse's ridge vent over its open hatch,
 * the pantry's herbs, sign and kettle, the library's hanging book sign, the
 * long-table cottage's awning and the camp's fire. The house body never moves.
 *
 * A machine keeps still until its house wakes (stage 1), as before: the clocks
 * stand at twenty to five, the carriages wait, the telescope rests. The fire
 * always burns (it is Toffee's, sized by the days in a row). Coordinates are
 * the sprite's own pixels (landscape.js); `now` is the scene clock in ms (0
 * holds every pose still).
 */
import { PLACED, CELLS } from './landscape.js';

const TAU = Math.PI * 2;
const M = CELLS.mechanisms, C = CELLS.cloth;

/** Draw `cell` of `img` at width `w`, its anchor (fractions of the drawn size) at (x, y), turned by `rot` and stretched by sx/sy round the anchor. */
function put(g, img, cell, x, y, w, { ax = 0.5, ay = 0.5, rot = 0, sx = 1, sy = 1, alpha = 1 } = {}) {
  const [cx, cy, cw, ch] = cell, h = (w * ch) / cw;
  g.save();
  g.translate(x, y);
  if (rot) g.rotate(rot);
  if (sx !== 1 || sy !== 1) g.scale(sx, sy);
  if (alpha !== 1) g.globalAlpha *= alpha;
  g.drawImage(img, cx, cy, cw, ch, -ax * w, -ay * h, w, h);
  g.restore();
}

/** Two hands on a painted face, at the real time (or twenty to five, stopped). */
function hands(g, img, x, y, r, stopped) {
  const d = new Date(), m = stopped ? 40 : d.getMinutes() + d.getSeconds() / 60, hr = stopped ? 4 + 40 / 60 : (d.getHours() % 12) + m / 60;
  const longH = (r * 0.86) / 0.905, shortH = (r * 0.56) / 0.853;
  put(g, img, M.hour, x, y, (shortH * M.hour[2]) / M.hour[3], { ay: 0.853, rot: (hr / 12) * TAU });
  put(g, img, M.minute, x, y, (longH * M.minute[2]) / M.minute[3], { ay: 0.905, rot: (m / 60) * TAU });
  g.fillStyle = '#5a3d1c';
  g.beginPath(); g.arc(x, y, r * 0.07, 0, TAU); g.fill();
}

/* The railway's painted track, as a polyline in the sprite's pixels, and points along it by distance. */
const TRACK = [[290, 688], [400, 676], [520, 660], [640, 634], [740, 600], [800, 570], [832, 548]];
const SEG = TRACK.slice(1).map(([x, y], i) => { const [px, py] = TRACK[i]; return { x: px, y: py, dx: x - px, dy: y - py, len: Math.hypot(x - px, y - py) }; });
const TRACK_LEN = SEG.reduce((s, q) => s + q.len, 0);
function onTrack(d) {
  let s = Math.max(0, Math.min(TRACK_LEN - 0.01, d));
  for (const q of SEG) { if (s > q.len) { s -= q.len; continue; } const f = s / q.len; return { x: q.x + q.dx * f, y: q.y + q.dy * f, a: Math.atan2(q.dy, q.dx) }; }
  const q = SEG[SEG.length - 1];
  return { x: q.x + q.dx, y: q.y + q.dy, a: Math.atan2(q.dy, q.dx) };
}
/** Where the pair of carriages stands: at rest near the track's end, now and then rolling back along it and returning. */
function shunt(t) {
  const period = 26000, p = (t % period) / period, rest = TRACK_LEN - 78, back = 120;
  const ease = (k) => k * k * (3 - 2 * k);
  if (p < 0.55) return rest;
  if (p < 0.7) return rest - back * ease((p - 0.55) / 0.15);
  if (p < 0.82) return rest - back;
  if (p < 0.97) return rest - back * (1 - ease((p - 0.82) / 0.15));
  return rest;
}

const PARTS = {
  chai(g, I, t) {
    // a wrought bracket off the reading wing's corner post, and the book sign hanging from it on two short chains
    g.strokeStyle = '#3d2a1a'; g.lineCap = 'round';
    g.lineWidth = 5; g.beginPath(); g.moveTo(832, 497); g.lineTo(896, 497); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.moveTo(838, 528); g.quadraticCurveTo(846, 500, 880, 498); g.stroke();
    const swing = Math.sin(t / 2300) * 0.06 + Math.sin(t / 830) * 0.012;
    g.save(); g.translate(872, 499); g.rotate(swing);
    g.lineWidth = 2; g.strokeStyle = '#4a3626';
    g.beginPath(); g.moveTo(-19, 0); g.lineTo(-24, 13); g.moveTo(19, 0); g.lineTo(24, 13); g.stroke();
    put(g, I.mechanisms, M.bookSign, 0, 11, 84, { ay: 0 });
    g.restore();
  },
  matcha(g, I, t) {
    // the ridge vent: hinged along the ridge over the painted open hatch, its pane propped up above it, opening wider and narrower with the day's warmth
    const lift = 30 + (t ? 12 * Math.sin(t / 19000 * TAU) : 0), hinge = 214;
    g.save();
    g.transform(1, 0, -0.18, 1, hinge * 0.18, 0);
    g.drawImage(I.cloth, C.vent[0], C.vent[1], C.vent[2], C.vent[3], 456, hinge - lift, 182, lift + 4);
    g.restore();
  },
  ginger(g, I, t, env, stage) {
    hands(g, I.mechanisms, 453, 368, 37, stage < 1);
    // two carriages on the painted track, wheels turning as they roll
    const head = shunt(t);
    for (const d of [head, head - 142]) {
      const p = onTrack(d), spin = d / 11;
      for (const off of [-40, 40]) {
        const q = onTrack(d + off);
        put(g, I.mechanisms, M.wheel, q.x, q.y - 9, 22, { rot: spin });
      }
      put(g, I.mechanisms, M.carriage, p.x, p.y - 4, 134, { ay: 0.97, rot: p.a * 0.85 });
    }
  },
  mallow(g, I, t) {
    // the telescope on its mount in the dome's open slot, sweeping slowly across the sky
    const sweep = t ? Math.sin(t / 30000 * TAU) * 0.075 + Math.sin(t / 7300) * 0.01 : 0;
    put(g, I.mechanisms, M.telescope, 652, 276, 124, { ax: 0.498, ay: 0.53, rot: sweep });
  },
  mochi(g, I, t) {
    put(g, I.cloth, C.kettle, 668, 604, 44, { ay: 1 });
    // the jam sign on two chains from the shed's beam, and a bundle of herbs drying at the corner
    const s1 = Math.sin(t / 3100 + 1) * 0.045, s2 = Math.sin(t / 2700) * 0.07 + Math.sin(t / 910) * 0.015;
    g.strokeStyle = '#4a3626'; g.lineWidth = 2;
    g.save(); g.translate(697, 497); g.rotate(s1);
    g.beginPath(); g.moveTo(-22, 0); g.lineTo(-24, 10); g.moveTo(22, 0); g.lineTo(24, 10); g.stroke();
    put(g, I.cloth, C.jamSign, 0, 8, 66, { ay: 0 });
    g.restore();
    g.beginPath(); g.moveTo(793, 494); g.lineTo(793, 502); g.stroke();
    put(g, I.cloth, C.herbs, 793, 500, 54, { ay: 0.06, rot: s2 });
  },
  biscuit(g, I, t) {
    // the striped awning over the porch, its hem lifting in the breeze
    const lift = t ? Math.sin(t / 1300) * 0.03 + Math.sin(t / 470) * 0.008 : 0;
    put(g, I.cloth, C.awning, 604, 430, 214, { ax: 0, ay: 0, sy: 1 + lift });
  },
  sesame(g, I, t, env, stage) {
    // the great gear turning in the gable ring, behind the tower's hands
    put(g, I.mechanisms, M.gear, 665, 545, 96, { rot: t / 30000 * TAU });
    hands(g, I.mechanisms, 355, 408, 51, stage < 1);
  },
  toffee(g, I, t, env) {
    // the camp's fire, on the painted logs; as tall as the days in a row
    const s = (env.flame ?? 0.9) * 0.645, i = t > 0 ? Math.floor(t / 125) % 6 : 0, [fx, fy] = CELLS.fire[i], N = CELLS.fireSize, [bx, by] = CELLS.fireBase;
    g.drawImage(I.fire, fx, fy, N, N, 379 - bx * s, 706 - by * s, N * s, N * s);
  },
};

/** Draw house `id`'s moving parts onto a context already in world coordinates. */
export function drawMechanisms(id, g, now, env, stage, I = {}) {
  const part = PARTS[id];
  if (!part || !I.mechanisms || !I.cloth || !I.fire) return; // the atlases are still arriving
  const b = PLACED[id];
  // The fire burns from the start; every machine waits for its house to wake.
  const t = id === 'toffee' ? now : stage >= 1 ? now : 0;
  g.save();
  g.translate(b.x, b.y);
  g.scale(b.k, b.k);
  part(g, I, t, env, stage);
  g.restore();
}
