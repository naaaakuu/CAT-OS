/** Independent landscape, lanes, landmarks and foreground pieces. No game state. */
import { BUILDINGS, ART } from './landscape.js';
import { MAP, NODES, EDGES, LAMPS } from '../pets/paths.js';

const SQUARE = [
  [604, 612], [645, 548], [755, 515], [907, 523], [1006, 567], [1093, 649],
  [1053, 743], [943, 810], [798, 824], [692, 784], [610, 709],
];
const PATH_LAMPS = [10, 11, 12, 13, 16];
// Each tree is positioned by its ground point and drawn width.
const TREES = [[690, 350, 320], [1430, 350, 300], [430, 620, 250], [250, 1120, 310]];

const canvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height });
function polygon(g, points) {
  g.beginPath();
  points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
  g.closePath();
}

let paintedGround = null;

/** Await before mounting the village or composing its geometry-check image. */
export async function loadScenery() {
  if (paintedGround) return;
  const img = new Image();
  img.src = './assets/art/village-paths-v2.webp';
  await img.decode();
  paintedGround = img;
}

/** Paint once on mount or rebake, never in the scene's animation loop. */
export function paintGround(c) {
  if (!paintedGround) throw new Error('Load village scenery before painting its paths.');
  const g = c.getContext('2d');
  const mask = canvas(MAP.w, MAP.h), m = mask.getContext('2d');
  m.strokeStyle = m.fillStyle = '#fff';
  m.lineCap = m.lineJoin = 'round';
  m.lineWidth = 100;
  for (const [a, b] of EDGES) {
    m.beginPath();
    m.moveTo(NODES[a].x, NODES[a].y);
    m.lineTo(NODES[b].x, NODES[b].y);
    m.stroke();
  }
  polygon(m, SQUARE);
  m.fill();
  m.lineWidth = 55;
  m.stroke();
  // Include the bridge's arch and lamp silhouettes, with room for shadows.
  m.fillRect(1305, 555, 405, 185);
  for (const i of PATH_LAMPS) {
    const p = LAMPS[i];
    m.fillRect(p.x - 40, p.y - 45, 100, 135);
  }
  g.drawImage(paintedGround, 0, 0, MAP.w, MAP.h);
  g.globalCompositeOperation = 'destination-in';
  g.filter = 'blur(12px)';
  g.drawImage(mask, 0, 0);
  g.filter = 'none';
  g.globalCompositeOperation = 'source-over';
  return c;
}

/** Crop the preserved artwork into independently positioned landmark canvases. */
export function buildingLayer(source) {
  const layer = document.createElement('div');
  layer.className = 'cw-base';
  layer.setAttribute('aria-hidden', 'true');
  for (const [id, b] of Object.entries(BUILDINGS)) {
    const xs = b.polygon.map(p => p[0]), ys = b.polygon.map(p => p[1]);
    const x = Math.max(0, Math.floor(Math.min(...xs)) - 3);
    const y = Math.max(0, Math.floor(Math.min(...ys)) - 3);
    const w = Math.min(ART.w - x, Math.ceil(Math.max(...xs)) - x + 3);
    const h = Math.min(ART.h - y, Math.ceil(Math.max(...ys)) - y + 3);
    const c = canvas(w, h), g = c.getContext('2d');
    g.translate(-x, -y);
    polygon(g, b.polygon);
    g.clip();
    g.drawImage(source, 0, 0);
    c.dataset.building = id;
    c.style.cssText = `position:absolute;left:${b.x + x * b.scale}px;top:${b.y + y * b.scale}px;width:${w * b.scale}px;height:${h * b.scale}px;filter:drop-shadow(0 5px 4px rgba(49,56,30,.18))`;
    layer.append(c);
  }
  return layer;
}

export function groundLayer() {
  const c = paintGround(canvas(MAP.w, MAP.h));
  c.className = 'cw-ground';
  c.setAttribute('aria-hidden', 'true');
  return c;
}

export function mountWoodland(map, { reduced = false } = {}) {
  const layer = document.createElement('div');
  layer.className = 'cw-woodland';
  layer.setAttribute('aria-hidden', 'true');
  for (const [i, [x, y, w]] of TREES.entries()) {
    const tree = new Image();
    tree.src = './assets/art/village-oak-v2.webp';
    tree.alt = '';
    tree.draggable = false;
    tree.style.cssText = `left:${x - w / 2}px;top:${y - w * 2 / 3}px;width:${w}px;height:${w * 2 / 3}px;--sway:${7 + i * 1.3}s;--delay:${-i * 2.1}s`;
    layer.append(tree);
  }
  map.insertBefore(layer, map.querySelector('.cw-clouds'));
  if (reduced) layer.dataset.reduced = 'true';
  // CSS handles the sway; visibility changes only toggle its paused state.
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.toggleAttribute('data-off', !entry.isIntersecting);
  }, { root: map.parentElement, rootMargin: '60px' });
  for (const tree of layer.children) observer.observe(tree);
  return {
    destroy() {
      observer.disconnect();
      layer.remove();
    },
  };
}

/** Compose a source for water masking and walkable-ground verification. */
export function composeScene(terrain, source) {
  const c = canvas(MAP.w, MAP.h), g = c.getContext('2d');
  g.drawImage(terrain, 0, 0, MAP.w, MAP.h);
  g.drawImage(paintGround(canvas(MAP.w, MAP.h)), 0, 0);
  for (const b of Object.values(BUILDINGS)) {
    g.save();
    g.translate(b.x, b.y);
    g.scale(b.scale, b.scale);
    polygon(g, b.polygon);
    g.clip();
    g.drawImage(source, 0, 0);
    g.restore();
  }
  return c;
}
