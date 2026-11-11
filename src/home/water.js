/**
 * Living water, in world coordinates. A small colour mask read once from the
 * terrain keeps everything on the painted water (off the banks, rocks and
 * bridges, which sit above this layer anyway). Each reach refracts the
 * painting in narrow bands, carries the water tile's own sun glints
 * downstream, and draws flecks along its current; the falls play the art
 * pack's falling-water loop with a little foam at their feet. Shares life's
 * clock; no WebGL, dependencies or separate animation loop.
 */
import { MAP } from '../pets/paths.js';
import { FALLS, CELLS } from './landscape.js';
import { rng } from '../world/engine/palette.js';

/** Separate visible reaches, each with its centre line (upstream first). */
export const REACHES = [
  { box: [880, 186, 206, 452], line: [[1048, 196], [1028, 230], [998, 264], [984, 304], [976, 344], [972, 392], [984, 440], [990, 484], [986, 530], [1000, 578], [1040, 620]], width: 20, speed: 34, count: 30 },
  { box: [596, 640, 330, 234], line: [[612, 668], [650, 700], [700, 728], [760, 760], [820, 790], [870, 826], [905, 862]], width: 26, speed: 24, count: 34, pond: true },
  { box: [848, 826, 238, 330], line: [[905, 862], [950, 906], [990, 960], [1014, 1010], [1028, 1060], [1000, 1110], [960, 1142]], width: 24, speed: 28, count: 26 },
  { box: [356, 1080, 730, 368], line: [[1070, 1078], [980, 1130], [900, 1180], [820, 1222], [740, 1262], [660, 1300], [580, 1336], [500, 1368], [430, 1402], [380, 1446]], width: 30, speed: 24, count: 44 },
];

const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const canvasOf = (w, h) => Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) });

function along(reach, distance, lane = 0) {
  let d = clamp(distance, 0, reach.length - 0.001);
  for (const s of reach.segments) {
    if (d > s.length) { d -= s.length; continue; }
    const f = d / s.length;
    return [s.x + s.dx * f - s.dy / s.length * lane, s.y + s.dy * f + s.dx / s.length * lane];
  }
  return reach.line[reach.line.length - 1];
}

/** The water tile's bright glints only, as white on transparent (read once). */
function glintsOf(tile) {
  const N = 256, c = canvasOf(N, N), g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(tile, 0, 0, N, N);
  const px = g.getImageData(0, 0, N, N), d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i + 3] = Math.round(255 * clamp((L - 170) / 70, 0, 1) ** 1.4);
    d[i] = 255; d[i + 1] = 252; d[i + 2] = 236;
  }
  g.putImageData(px, 0, 0);
  return c;
}

function prepare(img, spec, index) {
  const [x, y, w, h] = spec.box;
  const source = canvasOf(w, h), mask = canvasOf(w, h), surface = canvasOf(w / 2, h / 2);
  surface.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  const sg = source.getContext('2d', { willReadFrequently: true });
  const sx = (img.naturalWidth || img.width) / MAP.w, sy = (img.naturalHeight || img.height) / MAP.h;
  sg.drawImage(img, x * sx, y * sy, w * sx, h * sy, 0, 0, w, h);
  const mg = mask.getContext('2d'), pixels = sg.getImageData(0, 0, w, h);
  // Water is blue, land and rock are warm or grey. Read once, never in the frame loop.
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
    const px = (i / 4) % w, py = Math.floor(i / 4 / w);
    const blue = clamp((b - r - 28) / 34, 0, 1) * clamp((b - g + 6) / 24, 0, 1);
    const edge = clamp(Math.min(px, py, w - px - 1, h - py - 1) / 5, 0, 1);
    pixels.data[i + 3] = Math.round(255 * blue * edge);
  }
  mg.putImageData(pixels, 0, 0);
  const segments = spec.line.slice(1).map(([bx, by], i) => {
    const [ax, ay] = spec.line[i];
    return { x: ax, y: ay, dx: bx - ax, dy: by - ay, length: Math.hypot(bx - ax, by - ay) };
  });
  const [fx, fy] = spec.line[0], [lx, ly] = spec.line[spec.line.length - 1], fl = Math.hypot(lx - fx, ly - fy) || 1;
  const random = rng(`water-${index}`);
  const flecks = Array.from({ length: spec.count }, () => ({
    phase: random(), lane: (random() - 0.5) * spec.width * 2,
    size: 4 + random() * 10, alpha: 0.2 + random() * 0.4, speed: 0.75 + random() * 0.5,
  }));
  return { ...spec, source, mask, surface, g: surface.getContext('2d'), segments, dir: [(lx - fx) / fl, (ly - fy) / fl],
    length: segments.reduce((sum, s) => sum + s.length, 0), flecks };
}

export function createWater(map, { reduced = false, images = null } = {}) {
  const noop = { paint() {}, ripple() {}, setSource() {}, destroy() {} };
  const img = map.querySelector('.cw-art');
  if (reduced || !img) return noop;
  const layer = document.createElement('div');
  layer.className = 'cw-water'; layer.setAttribute('aria-hidden', 'true');
  // Over the terrain, under the shadows, bridges and houses.
  img.after(layer);
  let reaches = [], disposed = false, last = -Infinity, clock = 0, glints = null, pattern = null;
  const ripples = [];
  const falls = FALLS.map(([x, top, w, h]) => ({ x, top, w, h, reach: REACHES.findIndex((r) => x >= r.box[0] && x <= r.box[0] + r.box[2] && top >= r.box[1] && top <= r.box[1] + r.box[3]) }));
  const from = (src) => {
    if (disposed) return;
    const next = REACHES.map((s, i) => prepare(src, s, i));
    for (const r of reaches) r.surface.remove();
    reaches = next;
    layer.append(...reaches.map((r) => r.surface));
    layer.dataset.ready = 'true';
  };
  img.decode().then(() => { if (!reaches.length) from(img); }).catch(() => { layer.remove(); });

  return {
    paint(ms, weather = '', view = null) {
      clock = ms / 1000;
      // Water runs at about 24 fps; friends and the camera keep the display's rate.
      if (!reaches.length || ms - last < (view?.s < 0.7 ? 80 : 40)) return;
      last = ms;
      const time = clock * (weather === 'rain' ? 1.3 : 1);
      while (ripples.length && clock - ripples[0].time > 2.4) ripples.shift();
      for (const [ri, reach] of reaches.entries()) {
        const [x, y, w, h] = reach.box, c = reach.g;
        // A reach off screen keeps its last picture: nobody is looking at it.
        if (view && (x > view.x + view.w || x + w < view.x || y > view.y + view.h || y + h < view.y)) continue;
        c.setTransform(reach.surface.width / w, 0, 0, reach.surface.height / h, 0, 0);
        c.clearRect(0, 0, w, h);
        // Refract the actual painting in narrow bands. The mask stays fixed.
        for (let row = 0; row < h; row += 3) {
          const dx = Math.sin(row * 0.16 - time * 2.8) * 2.2 + Math.sin(row * 0.07 + time * 1.4) * 1.2;
          const sy = clamp(row + Math.sin(row * 0.09 - time * 3.2) * 1.6, 0, h - 3);
          c.drawImage(reach.source, 0, sy, w, Math.min(3, h - row), dx, row, w, Math.min(3, h - row));
        }
        // The tile's sun glints, two layers drifting downstream at different speeds.
        if (!glints && images?.water) glints = glintsOf(images.water);
        if (glints) {
          if (!pattern) pattern = c.createPattern(glints, 'repeat');
          const [ux, uy] = reach.dir, k = 0.34;
          for (const [speed, side, alpha] of [[reach.speed, 0, 0.55], [reach.speed * 0.62, 9, 0.35]]) {
            const d = time * speed, ox = ux * d - uy * side * Math.sin(time * 0.4), oy = uy * d + ux * side * Math.sin(time * 0.4);
            c.save(); c.globalAlpha = alpha; c.translate(ox % (256 * k) - 256 * k, oy % (256 * k) - 256 * k); c.scale(k, k);
            c.fillStyle = pattern; c.fillRect(0, 0, (w + 512 * k) / k, (h + 512 * k) / k);
            c.restore();
          }
        }
        c.lineCap = 'round';
        for (const f of reach.flecks) {
          const distance = (f.phase * reach.length + time * reach.speed * f.speed) % reach.length;
          const lane = f.lane + Math.sin(time * 1.5 + f.phase * TAU) * 2;
          const a = along(reach, distance, lane), b = along(reach, distance + f.size, lane);
          const fade = Math.min(1, distance / 16, (reach.length - distance) / 16);
          c.strokeStyle = `rgba(222,249,246,${f.alpha * fade})`; c.lineWidth = 1.4;
          c.beginPath(); c.moveTo(a[0] - x, a[1] - y);
          c.quadraticCurveTo((a[0] + b[0]) / 2 - x + 2, (a[1] + b[1]) / 2 - y - 2, b[0] - x, b[1] - y); c.stroke();
        }
        // Rings at the foot of each fall, plus rings where the learner taps.
        const rings = [...falls.filter((f) => f.reach === ri).map((f, i) => ({ x: f.x, y: f.top + f.h, age: ((time + i * 0.7) % 2) / 2 })),
          ...ripples.map((r) => ({ ...r, age: (clock - r.time) / 2.4 }))];
        for (const r of rings) {
          if (r.x < x || r.x > x + w || r.y < y || r.y > y + h) continue;
          for (let j = 0; j < 2; j += 1) {
            const age = r.age - j * 0.17;
            if (age <= 0 || age >= 1) continue;
            c.strokeStyle = `rgba(232,250,244,${(1 - age) * 0.5})`; c.lineWidth = 1.1;
            c.beginPath(); c.ellipse(r.x - x, r.y - y, 3 + age * 20, 1 + age * 6, 0, 0, TAU); c.stroke();
          }
        }
        c.globalCompositeOperation = 'destination-in'; c.drawImage(reach.mask, 0, 0);
        c.globalCompositeOperation = 'source-over';
        // The falls and their foam ride over the rocks, so they are not masked.
        if (images?.falls) {
          const frame = Math.floor(time * 10) % 4;
          for (const [i, f] of falls.entries()) {
            if (f.reach !== ri) continue;
            const [fx, fy, fw, fh] = CELLS.falls[(frame + i) % 4];
            c.globalAlpha = 0.82;
            c.drawImage(images.falls, fx, fy, fw, fh * 0.86, f.x - f.w / 2 - x, f.top - y, f.w, f.h);
            if (images.fx) {
              const [qx, qy, qw, qh] = CELLS.fx.foam, fw2 = f.w * 1.5, drift = Math.sin(time * 1.3 + i) * 1.5;
              c.globalAlpha = 0.55 + 0.2 * Math.sin(time * 2.1 + i);
              c.drawImage(images.fx, qx, qy, qw, qh, f.x - fw2 / 2 - x + drift, f.top + f.h - fw2 * 0.18 - y, fw2, fw2 * qh / qw);
            }
            c.globalAlpha = 1;
          }
        }
      }
    },
    ripple(x, y) {
      if (!reaches.some((r) => x >= r.box[0] && x <= r.box[0] + r.box[2] && y >= r.box[1] && y <= r.box[1] + r.box[3])) return;
      if (ripples.length >= 8) ripples.shift();
      ripples.push({ x, y, time: clock });
    },
    /** Cut the water again from another picture of the terrain. */
    setSource(src) { try { from(src); } catch { /* keep the old water */ } },
    destroy() { disposed = true; reaches = []; ripples.length = 0; layer.remove(); },
  };
}
