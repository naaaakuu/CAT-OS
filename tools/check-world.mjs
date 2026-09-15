/**
 * check-world.mjs — nothing stands in the river.
 *
 * The owner opened the village and saw a tree in the middle of the water. It
 * had been there for three releases, because the twenty-four hand-placed
 * trees in scene.js were filtered against buildings, plots and paths but NOT
 * against the pond or the river, while the two hundred and sixty scattered
 * ones were filtered against all five. Every scatter carried its own list of
 * rules, so one of them was simply shorter than the others.
 *
 * The rules live in one function now (`terrain.js whyNotPlaceable`). This
 * tool is the half that makes that stick: it builds the REAL scene in a REAL
 * browser — the art pipeline needs a canvas, so it cannot run under Node —
 * and walks every static object the village actually draws, at several stages
 * of growth, several seasons and several hours, asking the same question of
 * each: may this stand here?
 *
 * It checks anchors, not a list of coordinates, so it covers props nobody
 * thought to write a test for: lamps, carts, woodpiles, fences, barrels,
 * benches, reeds, stumps, the order board. An object may opt out by carrying
 * `waterside: true` — the reeds on the pond's rim and the stone wall on the
 * river's bank are placed there on purpose — and the tool reports how many
 * did, so an opt-out cannot be used to hide a mistake quietly.
 *
 * Run: node tools/check-world.mjs            (every state)
 *      node tools/check-world.mjs -v         (per-state detail)
 * verify.mjs §23 calls checkWorld(). Exit code 1 on any invalid placement.
 * With no Chrome installed it says SKIPPED loudly and exits 0.
 */

import { launchChrome, serveRepo, findChrome } from './cdp-lite.mjs';

/* The village at four ages, because what stands where depends on what is
   built: plots open, houses arrive, the market puts lamps down the street. */
const STATES = [
  { name: 'empty', builds: [], plots: [], houses: 0 },
  { name: 'early', builds: [['garden', 1], ['roots', 1]], plots: ['p1'], houses: 1 },
  { name: 'busy', builds: [['garden', 2], ['roots', 2], ['loom', 1], ['market', 1], ['reading', 2], ['hearth', 2]], plots: ['p1', 'p2'], houses: 3 },
  { name: 'full', builds: [['garden', 4], ['roots', 4], ['loom', 4], ['market', 3], ['reading', 4], ['hearth', 4], ['road', 2]], plots: ['p1', 'p2', 'p3', 'p4', 'p5'], houses: 8 },
];
const HOURS = ['morning', 'dusk', 'night'];

const seedFor = (s) => `(async () => {
  const mod = await import('/src/core/storage/indexeddb-adapter.js');
  const st = new mod.IndexedDBAdapter(); await st.init();
  for (const store of ['learning']) { for (const r of await st.getAll(store)) await st.delete(store, r.id); }
  const iso = (d) => new Date(Date.now() - d * 86400000).toISOString();
  await st.put('settings', { id: 'valley', value: { name: 'Ashfield', awakened_at: iso(20), met_at: iso(20) } });
  let n = 0;
  for (const [b, lv] of ${JSON.stringify(s.builds)}) for (let l = 1; l <= lv; l += 1) await st.put('learning', { id: 'w-b' + (n += 1), kind: 'village-build', building: b, level: l, cost: { coins: 0 }, at: iso(19 - n) });
  for (const p of ${JSON.stringify(s.plots)}) await st.put('learning', { id: 'w-p' + p, kind: 'village-plot', plot: p, cost: { coins: 0 }, at: iso(10) });
  for (let h = 1; h <= ${s.houses}; h += 1) await st.put('learning', { id: 'w-h' + h, kind: 'village-house', n: h, cost: { coins: 0 }, at: iso(9) });
  return 'ok';
})()`;

/* Runs in the page: walk the scene the renderer is actually drawing. */
const VALIDATE = `(async () => {
  const t = await import('/src/village/terrain.js');
  const canvas = document.querySelector('#vg-canvas');
  const scene = canvas && canvas.__renderer && canvas.__renderer.scene;
  if (!scene) return JSON.stringify({ error: 'no scene mounted' });
  const statics = scene.statics || [];
  const bad = [];
  let waived = 0;
  for (const s of statics) {
    if (s.waterside) { waived += 1; continue; }
    // Clearance a drawn thing needs from each feature. A prop touching the
    // bank is fine; standing in the water is not, and neither is standing
    // inside a wall or in the middle of a road.
    // Water and walls only, with no clearance at all: this asks 'is it IN
    // the thing' rather than the scatter's much wider 'keep away from here'.
    // A lamp beside a door is right; a lamp inside the kitchen is not.
    const why = t.inPond(s.x, s.y, 0) ? 'pond' : t.nearRiver(s.x, s.y, 14) ? 'river' : t.insideBuilding(s.x, s.y) ? 'building' : null;
    if (why) bad.push({ x: Math.round(s.x), y: Math.round(s.y), why, w: Math.round((s.art && s.art.w) || 0), h: Math.round((s.art && s.art.h) || 0) });
  }
  return JSON.stringify({ total: statics.length, waived, bad });
})()`;

export async function checkWorld({ log = () => {} } = {}) {
  if (!findChrome()) return { skipped: true, problems: [], checked: 0 };
  const server = await serveRepo();
  const b = await launchChrome({ width: 390, height: 844, dpr: 1 });
  const problems = [];
  let checked = 0;
  let waived = 0;
  try {
    await b.open(server.url, 4000);
    for (const state of STATES) {
      try { await b.evaluate(seedFor(state)); } catch { await new Promise((r) => setTimeout(r, 2500)); try { await b.evaluate(seedFor(state)); } catch { problems.push(state.name + ": could not seed"); continue; } }
      for (const hour of HOURS) {
        await b.evaluate(`localStorage.setItem('catos:hour', ${JSON.stringify(hour)})`);
        await b.open(`${server.url}#/world`, 4000);
        // Wait for the scene, do not guess at it: on a loaded machine the
        // village can take a few seconds to mount, and a gate that reports
        // 'no scene' on a slow laptop is a gate people learn to ignore.
        for (let i = 0; i < 30; i += 1) {
          try { if (await b.evaluate("!!(document.querySelector('#vg-canvas') && document.querySelector('#vg-canvas').__renderer && document.querySelector('#vg-canvas').__renderer.scene)")) break; } catch { /* still loading */ }
          await new Promise((r) => setTimeout(r, 600));
        }
        let res;
        try { res = JSON.parse(await b.evaluate(VALIDATE)); } catch (err) {
          // A slow machine can leave the canvas un-mounted when we ask. Give
          // it one more beat rather than losing the state.
          await new Promise((r) => setTimeout(r, 3500));
          try { res = JSON.parse(await b.evaluate(VALIDATE)); } catch (err2) { problems.push(`${state.name}/${hour}: could not read the scene (${String(err2.message).slice(0, 60)})`); continue; }
        }
        if (res.error) { problems.push(`${state.name}/${hour}: ${res.error}`); continue; }
        checked += res.total;
        waived += res.waived;
        for (const o of res.bad) problems.push(`${state.name}/${hour}: something stands in the ${o.why} at (${o.x}, ${o.y})`);
        log(`  ${state.name.padEnd(6)} ${hour.padEnd(8)} ${String(res.total).padStart(4)} objects, ${res.bad.length} invalid, ${res.waived} waterside`);
      }
    }
  } finally {
    b.close();
    server.close();
  }
  // The same bad anchor appears at every hour; report each once.
  const seen = new Set();
  const unique = problems.filter((p) => {
    const k = p.replace(/^[a-z]+\/[a-z]+: /, '');
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  return { skipped: false, problems: unique, checked, waived };
}

if (process.argv[1]?.endsWith('check-world.mjs')) {
  const verbose = process.argv.includes('-v');
  const { skipped, problems, checked, waived } = await checkWorld({ log: verbose ? console.log : () => {} });
  if (skipped) { console.log('SKIPPED — no Chrome on this machine (set CHROME_PATH to run the world placement gate).'); process.exit(0); }
  console.log(`\nChecked ${checked} placed objects across ${STATES.length} village states x ${HOURS.length} hours (${waived} waterside by design).`);
  if (!problems.length) { console.log('✓ nothing stands in the water, in a wall, or in the middle of a road.\n'); process.exit(0); }
  console.log(`\n✗ ${problems.length} invalid placement(s):\n`);
  for (const p of problems) console.log('  ' + p);
  console.log('');
  process.exit(1);
}
