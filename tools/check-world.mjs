/**
 * check-world.mjs — nothing stands in the water or inside a wall.
 *
 * The owner once opened the village and saw a tree in the middle of the
 * water: the hand-placed trees were filtered against fewer rules than the
 * scattered ones. Every scatter carried its own list of rules, so one of
 * them was simply shorter than the others.
 *
 * The rules live in one function now (`terrain.js whyNotPlaceable`). This
 * tool is the half that makes that stick: it builds the REAL scene in a REAL
 * browser — the art pipeline needs a canvas, so it cannot run under Node —
 * and walks every static object the village actually draws, at several stages
 * of growth, several seasons and several hours, asking the same question of
 * each: may this stand here?
 *
 * It checks anchors, not a list of coordinates, so it covers props nobody
 * thought to write a test for: lamps, crates, fences, benches, planters, the
 * order board. Two kinds of object opt out, and the tool reports how many
 * did, so an opt-out cannot hide a mistake quietly: `ground` (the pond and
 * the stepping stones ARE the ground) and `part` (a yard's props stand inside
 * the yard they make up).
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
  { name: 'early', builds: [['garden', 1], ['roots', 1]], plots: ['pen'], houses: 1 },
  { name: 'busy', builds: [['garden', 2], ['roots', 2], ['loom', 1], ['market', 1], ['reading', 2], ['hearth', 2]], plots: ['pen', 'orchard'], houses: 3 },
  { name: 'full', builds: [['garden', 4], ['roots', 4], ['loom', 4], ['market', 3], ['reading', 4], ['hearth', 4], ['road', 2]], plots: ['pen', 'orchard', 'farm', 'mill', 'square'], houses: 8 },
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
  const v = scene.village || null;   // ask about the village that is STANDING
  const bad = [];
  let waived = 0;

  // "Is it IN the thing" — no clearance at all. That is a different and much
  // narrower question than the scatter's "keep away from here": a lamp beside
  // a door is right, a lamp inside the kitchen is not.
  const whyProp = (x, y) => t.invalidSpot(x, y, v);
  const whyPerson = (x, y) => t.cannotStand(x, y, v);

  const statics = scene.statics || [];
  for (const s of statics) {
    if (s.ground || s.part) { waived += 1; continue; }
    let w = whyProp(s.x, s.y);
    if (w === 'building') w = 'building (' + t.whichBuilding(s.x, s.y, v) + ')';
    if (w) bad.push({ kind: 'prop', x: Math.round(s.x), y: Math.round(s.y), why: w });
  }

  // THE PEOPLE. A gate that only looks at furniture misses the thing a
  // learner actually watches: a neighbour walking across the pond, a worker
  // sitting on a bench that was moved out from under her, Wick strolling
  // through the Hearth's front wall. Run the village forward and look.
  //
  // Every actor is seeded, so this is deterministic: the same minute of
  // village life every time, on every machine.
  const seen = new Set();
  const SECONDS = 90;
  const STEP = 250;
  for (let ms = 0; ms < SECONDS * 1000; ms += STEP) {
    scene.update(STEP, ms);
    for (const actor of scene.life || []) {
      let objs = [];
      try { objs = actor.objects(ms) || []; } catch { objs = []; }
      for (const o of objs) {
        // Only things that stand on the ground: a bird, a cloud shadow, a
        // sparkle and a speech bubble are all allowed over the water.
        if (!o || o.z || !o.art || o.art.h < 14) continue;
        let w = whyPerson(o.x, o.y);
        if (!w) continue;
        if (w === 'building') w = 'building (' + t.whichBuilding(o.x, o.y, v, 10) + ')';
        const key = actor.kind + '|' + (actor.id || '') + '|' + w;
        if (seen.has(key)) continue;
        seen.add(key);
        bad.push({ kind: actor.kind, id: actor.id || '', x: Math.round(o.x), y: Math.round(o.y), why: w, at: Math.round(ms / 1000) });
      }
    }
  }

  return JSON.stringify({ total: statics.length, actors: (scene.life || []).length, waived, bad });
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
        for (const o of res.bad) {
          problems.push(o.kind === 'prop'
            ? `${state.name}/${hour}: a prop stands in the ${o.why} at (${o.x}, ${o.y})`
            : `${state.name}/${hour}: ${o.kind}${o.id ? ' ' + o.id : ''} is in the ${o.why} at (${o.x}, ${o.y}), ${o.at}s in`);
        }
        log(`  ${state.name.padEnd(6)} ${hour.padEnd(8)} ${String(res.total).padStart(4)} props + ${String(res.actors).padStart(2)} actors over 90s, ${res.bad.length} invalid, ${res.waived} ground or yard parts`);
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
  console.log(`\nChecked ${checked} placed objects and ninety seconds of village life across ${STATES.length} village states x ${HOURS.length} hours (${waived} ground or yard parts by design).`);
  if (!problems.length) { console.log('✓ nothing stands in the water, in a wall, or in the middle of a road.\n'); process.exit(0); }
  console.log(`\n✗ ${problems.length} invalid placement(s):\n`);
  for (const p of problems) console.log('  ' + p);
  console.log('');
  process.exit(1);
}
