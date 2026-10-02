/**
 * check-village-data.mjs — the village's geometry is true to its painting.
 *
 * Pets walk only between the nodes in src/pets/paths.js, so a node that
 * drifts onto a roof, into a tree or into the pond puts a pet there for
 * everyone. This checks the graph (inside the map, connected, every home
 * reachable from every other) and then samples the painting itself under
 * every node: the ground must read as sand, stone or planks — warm, not
 * leaf-green, not water-blue.
 *
 *   node tools/check-village-data.mjs           graph + painting
 *   node tools/check-village-data.mjs --graph   graph only (no browser)
 */
import { MAP, NODES, EDGES, HOMES, PLACES, SPOTS, route } from '../src/pets/paths.js';

const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };

for (const [id, n] of Object.entries(NODES)) ok(n.x > 8 && n.y > 8 && n.x < MAP.w - 8 && n.y < MAP.h - 8, `node ${id} is outside the map`);
for (const [a, b] of EDGES) ok(NODES[a] && NODES[b], `edge ${a}–${b} names a missing node`);

// connected
const ids = Object.keys(NODES);
const seen = new Set([ids[0]]), stack = [ids[0]];
while (stack.length) { const u = stack.pop(); for (const [a, b] of EDGES) { const v = a === u ? b : b === u ? a : null; if (v && !seen.has(v)) { seen.add(v); stack.push(v); } } }
ok(seen.size === ids.length, `the path graph is in pieces: unreachable ${ids.filter((i) => !seen.has(i)).join(', ')}`);

const homeNodes = [...Object.values(HOMES), ...Object.values(PLACES)].map((h) => h.node);
for (const n of [...homeNodes, ...Object.values(SPOTS).flat()]) ok(NODES[n], `a home or spot names missing node ${n}`);
for (const a of homeNodes) for (const b of homeNodes) if (a !== b) ok(route(a, b).length >= 2, `no walk from ${a} to ${b}`);

// The living painting: the baked atlas must match the patches (a stale bake
// would show the wrong piece of the painting, so motion.js leaves it still).
{
  const { PATCHES, rectOf } = await import('../src/home/motion.js');
  const { ATLAS } = await import('../src/home/motion-atlas.js');
  const { readFileSync } = await import('node:fs');
  ok(ATLAS.at.length === PATCHES.length, `motion atlas has ${ATLAS.at.length} patches, motion.js ${PATCHES.length}: run node tools/bake-motion.mjs`);
  PATCHES.forEach((p, i) => { const r = rectOf(p), a = ATLAS.at[i] ?? []; ok(a[0] === r.x && a[1] === r.y && a[2] === r.w && a[3] === r.h, `motion patch ${i} (${p.k}) moved since the bake: run node tools/bake-motion.mjs`); });
  const png = readFileSync(new URL(`../${ATLAS.src.replace('./', '')}`, import.meta.url));
  ok(png.readUInt32BE(16) === ATLAS.w && png.readUInt32BE(20) === ATLAS.h, `${ATLAS.src} is not the ${ATLAS.w}×${ATLAS.h} atlas motion-atlas.js describes`);
  // Cut from THIS painting: a repainted village under an old atlas would animate pieces of a picture that is gone.
  const { createHash } = await import('node:crypto');
  const sha = createHash('sha1').update(readFileSync(new URL(`../${MAP.src.replace('./', '')}`, import.meta.url))).digest('hex').slice(0, 12);
  ok(ATLAS.painting === MAP.src && ATLAS.paintingHash === sha, `the motion atlas was cut from ${ATLAS.painting} (${ATLAS.paintingHash}), the village paints ${MAP.src} (${sha}): run node tools/bake-motion.mjs`);
}

if (!process.argv.includes('--graph')) {
  const { serveRepo, launchChrome } = await import('./cdp-lite.mjs');
  const server = await serveRepo();
  const browser = await launchChrome({ width: 400, height: 300 });
  try {
    await browser.open(`${server.url}nothing-here.html`, 600);
    const samples = await browser.evaluate(`(async () => {
      const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = ${JSON.stringify(MAP.src.replace('./', '/'))}; });
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const out = {};
      for (const [id, n] of Object.entries(${JSON.stringify(NODES)})) {
        const d = g.getImageData(n.x - 3, n.y - 3, 7, 7).data;
        let r = 0, gg = 0, b = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
        const k = d.length / 4; out[id] = [Math.round(r / k), Math.round(gg / k), Math.round(b / k)];
      }
      return { w: img.naturalWidth, h: img.naturalHeight, out };
    })()`);
    ok(samples.w === MAP.w && samples.h === MAP.h, `the painting is ${samples.w}×${samples.h}, paths.js says ${MAP.w}×${MAP.h}`);
    for (const [id, [r, g, b]] of Object.entries(samples.out)) {
      // Sand, paving and planks are warm: red leads green, green leads blue.
      // Leaves lead with green; water and slate lead with blue.
      const warm = r >= g - 2 && r - b >= 22;
      ok(warm, `node ${id} (${NODES[id].x},${NODES[id].y}) stands on rgb(${r},${g},${b}) — leaves or water, not ground`);
    }
  } finally { browser.close(); server.close(); }
}

if (fails.length) { console.error(`village data: ${fails.length} problem(s)\n  - ${fails.join('\n  - ')}`); process.exit(1); }
console.log(`village data: ${ids.length} nodes, ${EDGES.length} edges, every home reachable, every node on ground`);
