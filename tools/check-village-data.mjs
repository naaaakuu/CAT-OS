/**
 * check-village-data.mjs — the village's geometry is true to its pieces.
 *
 * Friends walk only between the nodes in src/pets/paths.js, so a node that
 * drifts into the river, into a house's walls or off the lanes puts a friend
 * there for everyone. This checks the graph (inside the valley, connected,
 * every home reachable from every other, visitor and chat spots next to each
 * other) and the scene's own data (every house, bridge and tree sprite and
 * atlas cell inside its image), then samples the real pictures under every
 * node and along every walk (8 px apart):
 *   water   the terrain's painted river, unless a bridge's deck covers it
 *   walls   a house sprite's opaque pixels above its ground line (a friend
 *           there would stand inside the house, not behind or before it)
 *   lanes   the painted dirt (warm: red leads green, red well above blue),
 *           except on the green, the door steps and the camp, which are
 *           grass, stone and boards on purpose
 *
 *   node tools/check-village-data.mjs           graph + pictures
 *   node tools/check-village-data.mjs --graph   graph only (no browser)
 */
import { readFileSync, existsSync } from 'node:fs';
import { MAP, NODES, EDGES, HOMES, PLACES, SPOTS, CHATS, SIGNS, route } from '../src/pets/paths.js';
import { WORLD, HOUSES, PLACED, BRIDGES, TREES, CELLS, ART_FILES, STILL, groundY } from '../src/home/landscape.js';

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const file = (src) => new URL(`../${src.replace('./', '')}`, import.meta.url);

ok(MAP.w === WORLD.w && MAP.h === WORLD.h, `paths.js MAP ${MAP.w}×${MAP.h} is not the world ${WORLD.w}×${WORLD.h}`);
for (const [id, n] of Object.entries(NODES)) ok(n.x > 8 && n.y > 8 && n.x < MAP.w - 8 && n.y < MAP.h - 2, `node ${id} is outside the valley`);
for (const [a, b] of EDGES) ok(NODES[a] && NODES[b], `edge ${a}–${b} names a missing node`);

// connected
const ids = Object.keys(NODES);
const seen = new Set([ids[0]]), stack = [ids[0]];
while (stack.length) { const u = stack.pop(); for (const [a, b] of EDGES) { const v = a === u ? b : b === u ? a : null; if (v && !seen.has(v)) { seen.add(v); stack.push(v); } } }
ok(seen.size === ids.length, `the path graph is in pieces: unreachable ${ids.filter((i) => !seen.has(i)).join(', ')}`);

const homeNodes = [...Object.values(HOMES), ...Object.values(PLACES)].map((h) => h.node);
for (const n of [...homeNodes, ...Object.values(SPOTS).flat()]) ok(NODES[n], `a home or spot names missing node ${n}`);
for (const a of homeNodes) for (const b of homeNodes) if (a !== b) ok(route(a, b).length >= 2, `no walk from ${a} to ${b}`);

// A friend stands only on a node, so two side by side need two neighbouring nodes: a visitor's spot beside a home, and each pair that chats on the green.
const linked = (a, b) => EDGES.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
for (const [id, h] of Object.entries(HOMES)) ok(linked(h.node, h.side) && !homeNodes.includes(h.side), `${id}'s visitor spot "${h.side}" is not a free node next to its home "${h.node}"`);
for (const [a, b] of CHATS) ok(linked(a, b) && SPOTS.plaza.includes(a) && SPOTS.plaza.includes(b), `chat spots ${a} and ${b} are not neighbours on the green`);
ok(SPOTS.ring.every((n) => SPOTS.plaza.includes(n)) && SPOTS.ring.every((n, i) => linked(n, SPOTS.ring[(i + 1) % SPOTS.ring.length])), 'the green ring is not a closed loop of neighbouring nodes');

// Each friend's home node stands at its own door, in front of its walls; each plate hangs above its house.
for (const [id, h] of Object.entries(HOMES)) {
  const n = NODES[h.node], d = Math.hypot(n.x - h.door.x, n.y - h.door.y);
  ok(d < 22, `${id}'s home node "${h.node}" is ${Math.round(d)} px from its door`);
  ok(n.y >= groundY(id) - 2, `${id}'s home node stands behind its own walls (y ${n.y} < ground ${Math.round(groundY(id))})`);
  ok(SIGNS[id].y < groundY(id), `${id}'s subject plate hangs below its ground line`);
}

// The scene's files and cells: every sprite exists, every atlas cell lies inside its image.
const webpSize = (src) => {
  const b = readFileSync(file(src));
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  return null;
};
const sizes = {};
for (const src of [...Object.values(ART_FILES), ...Object.values(HOUSES).map((h) => h.file), STILL.src]) {
  if (!existsSync(file(src))) { ok(false, `${src} is missing`); continue; }
  sizes[src] = webpSize(src);
  ok(sizes[src], `${src} is not a WebP`);
}
ok(sizes[ART_FILES.terrain]?.w === WORLD.w && sizes[ART_FILES.terrain]?.h === WORLD.h, `the terrain is not ${WORLD.w}×${WORLD.h}`);
ok(sizes[STILL.src]?.w === STILL.w && sizes[STILL.src]?.h === STILL.h, `${STILL.src} is not the ${STILL.w}×${STILL.h} still: run node tools/bake-village-still.mjs`);
for (const [id, h] of Object.entries(HOUSES)) {
  ok(sizes[h.file]?.w === 896 && sizes[h.file]?.h === 896, `${id}'s sprite is not 896×896`);
  const [x, y, w, hh] = h.vis;
  ok(x >= 0 && y >= 0 && x + w <= 896 && y + hh <= 896 && h.ground > y && h.ground < y + hh, `${id}'s visible box or ground line is outside its sprite`);
  ok(PLACED[id].x > -60 && PLACED[id].x + PLACED[id].size < WORLD.w + 60, `${id} is placed off the valley`);
}
const inside = (src, [x, y, w, h]) => { const s = sizes[src]; return !!s && x >= 0 && y >= 0 && x + w <= s.w && y + h <= s.h; };
for (const [k, c] of Object.entries(CELLS.mechanisms)) ok(inside(ART_FILES.mechanisms, c), `mechanism cell ${k} is outside the atlas`);
for (const [k, c] of Object.entries(CELLS.cloth)) ok(inside(ART_FILES.cloth, c), `cloth cell ${k} is outside the atlas`);
for (const [k, c] of Object.entries(CELLS.fx)) ok(inside(ART_FILES.fx, c), `effect cell ${k} is outside the atlas`);
CELLS.falls.forEach((c, i) => ok(inside(ART_FILES.falls, c), `waterfall frame ${i} is outside the atlas`));
CELLS.fire.forEach(([x, y], i) => ok(inside(ART_FILES.fire, [x, y, CELLS.fireSize, CELLS.fireSize]), `fire frame ${i} is outside the atlas`));
for (const t of TREES) ok(t.x > 0 && t.x < WORLD.w && t.y > 0 && t.y < WORLD.h, `an oak is outside the valley`);
for (const b of BRIDGES) ok(b.place.cx > 0 && b.place.cx < WORLD.w, `the ${b.id} bridge is outside the valley`);

/* Grass, stone and boards are fine here: the green, the door steps, the camp. */
const GRASS = new Set([...SPOTS.plaza, 'm12', 'm4']);
const OPEN_EDGE = (a, b) => (GRASS.has(a) && GRASS.has(b)) || homeNodes.includes(a) || homeNodes.includes(b) || ['camp', 'f2', 'f3', 'p1'].includes(a) || ['camp', 'f2', 'f3', 'p1'].includes(b);

if (!process.argv.includes('--graph')) {
  const { serveRepo, launchChrome } = await import('./cdp-lite.mjs');
  const server = await serveRepo();
  const browser = await launchChrome({ width: 400, height: 300 });
  try {
    await browser.open(`${server.url}nothing-here.html`, 600);
    const res = await browser.evaluate(`(async () => {
      const scene = await import('/src/home/scenery.js');
      const L = await import('/src/home/landscape.js');
      const I = await scene.loadAllScenery();
      const still = await scene.composeStill(), sg = still.getContext('2d', { willReadFrequently: true });
      const flat = (img) => { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); return { w: c.width, data: g.getImageData(0, 0, c.width, c.height).data }; };
      const terrain = flat(I.terrain);
      const houses = Object.fromEntries(Object.keys(L.HOUSES).map((id) => [id, flat(I[id])]));
      const bridges = L.BRIDGES.map((b) => ({ b, px: flat(I[b.id === 'stone' ? 'bridgeStone' : 'bridgeWood']), k: b.place.w / b.vis[2] }));
      const at = (p, x, y) => { const i = (Math.round(y) * p.w + Math.round(x)) * 4; return [p.data[i], p.data[i + 1], p.data[i + 2], p.data[i + 3]]; };
      const onBridge = (x, y) => bridges.some(({ b, px, k }) => { const ox = b.place.cx - (b.vis[0] + b.vis[2] / 2) * k, oy = b.place.by - (b.vis[1] + b.vis[3]) * k; const lx = (x - ox) / k, ly = (y - oy) / k; return lx >= 0 && ly >= 0 && lx < 896 && ly < 896 && at(px, lx, ly)[3] > 128; });
      const water = (x, y) => { const [r, g, b] = at(terrain, x, y); return b - r > 30 && b - g > -6 && !onBridge(x, y); };
      const wall = (x, y) => { for (const [id, h] of Object.entries(L.HOUSES)) { const P = L.PLACED[id], lx = (x - P.x) / P.k, ly = (y - P.y) / P.k; if (lx < 0 || ly < 0 || lx >= 896 || ly >= h.ground - 4) continue; if (at(houses[id], lx, ly)[3] > 160) return id; } return null; };
      const sand = (x, y) => { const d = sg.getImageData(Math.round(x) - 2, Math.round(y) - 2, 5, 5).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const k = d.length / 4; r /= k; g /= k; b /= k; return r >= g - 2 && r - b >= 22; };
      const N = ${JSON.stringify(NODES)}, nodes = {}, edges = {};
      for (const [id, n] of Object.entries(N)) nodes[id] = { water: water(n.x, n.y), wall: wall(n.x, n.y), sand: sand(n.x, n.y) };
      for (const [a, b] of ${JSON.stringify(EDGES)}) {
        const A = N[a], B = N[b], n = Math.max(1, Math.round(Math.hypot(B.x - A.x, B.y - A.y) / 8));
        let wet = 0, walls = null, off = 0;
        for (let i = 0; i <= n; i += 1) { const x = A.x + (B.x - A.x) * i / n, y = A.y + (B.y - A.y) * i / n; if (water(x, y)) wet += 1; walls = walls || wall(x, y); if (!sand(x, y)) off += 1; }
        edges[a + '|' + b] = { wet, walls, off: off / (n + 1) };
      }
      return { w: still.width, h: still.height, nodes, edges };
    })()`);
    ok(res.w === MAP.w && res.h === MAP.h, `the assembled valley is ${res.w}×${res.h}, paths.js says ${MAP.w}×${MAP.h}`);
    // A walk may pass behind a house (its walls hide the friend, as they should); a friend never stops where walls would hide it.
    const STAND = new Set([...homeNodes, ...Object.values(HOMES).map((h) => h.side), ...Object.values(SPOTS).flat(), ...CHATS.flat()]);
    for (const [id, s] of Object.entries(res.nodes)) {
      ok(!s.water, `node ${id} (${NODES[id].x},${NODES[id].y}) stands in the river`);
      if (STAND.has(id)) ok(!s.wall, `friends stop at node ${id} (${NODES[id].x},${NODES[id].y}), hidden inside ${s.wall}'s walls`);
    }
    for (const [e, s] of Object.entries(res.edges)) {
      const [a, b] = e.split('|');
      ok(!s.wet, `the walk ${a}–${b} wades through the river (${s.wet} samples)`);
      // A shadow may darken a stretch; a lane that runs over grass for long is not a lane.
      if (!OPEN_EDGE(a, b) && !/^(sb|wb)/.test(a) && !/^(sb|wb)/.test(b)) ok(s.off <= 0.25, `the walk ${a}–${b} leaves the painted lane for ${Math.round(s.off * 100)}% of its length`);
    }
  } finally { browser.close(); server.close(); }
}

if (fails.length) { console.error(`village data: ${fails.length} problem(s)\n  - ${fails.join('\n  - ')}`); process.exit(1); }
console.log(`village data: ${ids.length} nodes, ${EDGES.length} edges, every home reachable; no node or walk in the river, in a wall or off its lane`);
