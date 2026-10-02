/**
 * Living water, in painting coordinates. A small, cached colour mask keeps
 * refraction, foam and ripples off the rocks, lilies, banks and bridges.
 * Shares life's clock; no WebGL, dependencies or separate animation loop.
 */
import { rng } from '../world/engine/palette.js';

// Separate visible reaches: the bridges occlude the current between them.
export const REACHES = [
  { box: [0, 505, 56, 56], line: [[0, 519], [21, 529], [40, 542]], width: 13, speed: 36, count: 16 },
  { box: [43, 607, 76, 96], line: [[76, 610], [79, 632], [66, 652], [77, 676], [85, 702]], width: 14, speed: 54, count: 30 },
  { box: [0, 741, 548, 203], line: [[48, 744], [52, 777], [27, 796], [59, 822], [191, 880], [308, 887], [383, 920], [514, 930]], width: 27, speed: 25, count: 64, pond: true },
  { box: [369, 957, 92, 67], line: [[383, 959], [407, 980], [427, 998], [436, 1024]], width: 11, speed: 49, count: 24 },
  { box: [1318, 875, 89, 89], line: [[1367, 881], [1373, 906], [1360, 930], [1328, 951]], width: 14, speed: 34, count: 24 },
];

const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const canvasOf = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

function along(reach, distance, lane = 0) {
  let d = clamp(distance, 0, reach.length - 0.001);
  for (const s of reach.segments) {
    if (d > s.length) { d -= s.length; continue; }
    const f = d / s.length;
    return [s.x + s.dx * f - s.dy / s.length * lane, s.y + s.dy * f + s.dx / s.length * lane];
  }
  return reach.line[reach.line.length - 1];
}

function prepare(img, spec, index) {
  const [x, y, w, h] = spec.box;
  const source = canvasOf(w, h), mask = canvasOf(w, h), surface = canvasOf(Math.ceil(w / 2), Math.ceil(h / 2));
  surface.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  const sg = source.getContext('2d');
  sg.drawImage(img, x, y, w, h, 0, 0, w, h);
  const mg = mask.getContext('2d'), pixels = sg.getImageData(0, 0, w, h);
  // Water is blue/teal, land is warm. Read once, never in the frame loop.
  // Soft chroma edges retain the painted banks and foreground vegetation.
  for (let i = 0; i < pixels.data.length; i += 4) {
    const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
    const px = (i / 4) % w, py = Math.floor(i / 4 / w);
    const blue = clamp((Math.min(g - r, b - r) - 5) / 22, 0, 1);
    const edge = clamp(Math.min(px, py, w - px - 1, h - py - 1) / 5, 0, 1);
    pixels.data[i + 3] = Math.round(255 * blue * edge);
  }
  mg.putImageData(pixels, 0, 0);
  const segments = spec.line.slice(1).map(([bx, by], i) => {
    const [ax, ay] = spec.line[i];
    return { x: ax, y: ay, dx: bx - ax, dy: by - ay, length: Math.hypot(bx - ax, by - ay) };
  });
  const random = rng(`water-${index}`);
  const flecks = Array.from({ length: spec.count }, () => ({
    phase: random(), lane: (random() - 0.5) * spec.width * 2,
    size: 4 + random() * 12, alpha: 0.2 + random() * 0.4, speed: 0.75 + random() * 0.5,
  }));
  const waves = Array.from({ length: spec.pond ? 32 : 0 }, () => ({
    x: 15 + random() * (w - 30), y: 30 + random() * (h - 40), phase: random() * TAU, size: 6 + random() * 14,
  }));
  return { ...spec, source, mask, surface, g: surface.getContext('2d'), segments,
    length: segments.reduce((sum, s) => sum + s.length, 0), flecks, waves };
}

export function createWater(map, { reduced = false } = {}) {
  const noop = { paint() {}, ripple() {}, destroy() {} };
  const img = map.querySelector('.cw-art');
  if (reduced || !img) return noop;
  const canvas = document.createElement('div');
  canvas.className = 'cw-water'; canvas.setAttribute('aria-hidden', 'true');
  // Under the hour's tint, so the same current belongs to day and night.
  map.insertBefore(canvas, map.querySelector('.cw-clouds'));
  let reaches = [], disposed = false, last = -Infinity, clock = 0;
  const ripples = [];
  img.decode().then(() => {
    if (disposed) return;
    reaches = REACHES.map((s, i) => prepare(img, s, i));
    canvas.append(...reaches.map((r) => r.surface));
    canvas.dataset.ready = 'true';
  }).catch(() => { canvas.remove(); });

  return {
    paint(ms, weather = '') {
      clock = ms / 1000;
      // Water runs at 30 fps; pets and camera remain at the display's rate.
      if (!reaches.length || ms - last < 32) return;
      last = ms;
      const time = clock * (weather === 'rain' ? 1.3 : 1);
      while (ripples.length && clock - ripples[0].time > 2.4) ripples.shift();
      for (const reach of reaches) {
        const [x, y, w, h] = reach.box, c = reach.g;
        c.setTransform(reach.surface.width / w, 0, 0, reach.surface.height / h, 0, 0);
        c.clearRect(0, 0, w, h);
        // Refract the actual painting in narrow bands. The mask stays fixed.
        for (let row = 0; row < h; row += 3) {
          const dx = Math.sin(row * 0.16 - time * 2.8) * 2.6 + Math.sin(row * 0.07 + time * 1.4) * 1.4;
          const sy = clamp(row + Math.sin(row * 0.09 - time * 3.2) * 2, 0, h - 3);
          c.drawImage(reach.source, 0, sy, w, Math.min(3, h - row), dx, row, w, Math.min(3, h - row));
        }
        c.lineCap = 'round';
        for (const f of reach.flecks) {
          const distance = (f.phase * reach.length + time * reach.speed * f.speed) % reach.length;
          const lane = f.lane + Math.sin(time * 1.5 + f.phase * TAU) * 2;
          const a = along(reach, distance, lane), b = along(reach, distance + f.size, lane);
          const fade = Math.min(1, distance / 16, (reach.length - distance) / 16);
          c.strokeStyle = `rgba(215,249,242,${f.alpha * fade})`; c.lineWidth = reach.pond ? 1.2 : 1.7;
          c.beginPath(); c.moveTo(a[0] - x, a[1] - y);
          c.quadraticCurveTo((a[0] + b[0]) / 2 - x + 2, (a[1] + b[1]) / 2 - y - 2, b[0] - x, b[1] - y); c.stroke();
        }
        for (const wave of reach.waves) {
          const phase = time * 1.2 + wave.phase, wx = wave.x + Math.sin(phase * 0.7) * 8, wy = wave.y + Math.sin(phase) * 3;
          c.strokeStyle = `rgba(225,250,239,${0.12 + (Math.sin(phase) + 1) * 0.12})`; c.lineWidth = 1;
          c.beginPath(); c.ellipse(wx, wy, wave.size, 2.2, 0, 0.1, Math.PI - 0.1); c.stroke();
        }
        // Rings at the foot of the falls, plus rings where the learner taps.
        const mouth = reach.line[Math.min(2, reach.line.length - 1)];
        const rings = [{ x: mouth[0], y: mouth[1], age: (time % 2) / 2 },
          ...ripples.map((r) => ({ ...r, age: (clock - r.time) / 2.4 }))];
        for (const r of rings) {
          if (r.x < x || r.x > x + w || r.y < y || r.y > y + h) continue;
          for (let j = 0; j < 2; j += 1) {
            const age = r.age - j * 0.17;
            if (age <= 0 || age >= 1) continue;
            c.strokeStyle = `rgba(227,250,239,${(1 - age) * 0.5})`; c.lineWidth = 1.2;
            c.beginPath(); c.ellipse(r.x - x, r.y - y, 3 + age * 28, 1 + age * 9, 0, 0, TAU); c.stroke();
          }
        }
        c.globalCompositeOperation = 'destination-in'; c.drawImage(reach.mask, 0, 0);
        c.globalCompositeOperation = 'source-over';
      }
    },
    ripple(x, y) {
      if (!reaches.some((r) => x >= r.box[0] && x <= r.box[0] + r.box[2] && y >= r.box[1] && y <= r.box[1] + r.box[3])) return;
      if (ripples.length >= 8) ripples.shift();
      ripples.push({ x, y, time: clock });
    },
    destroy() { disposed = true; reaches = []; ripples.length = 0; canvas.remove(); },
  };
}
