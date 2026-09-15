/**
 * check-world-data.mjs — the map, before anything has a chance to repair it.
 *
 * `check-world.mjs` opens the real village and validates the scene the
 * renderer draws. That is necessary and it is not sufficient: scene.js ends
 * every build by nudging any prop that landed somewhere impossible, so a
 * COORDINATE that is wrong in the source data can be invisible to it. The
 * ninth cottage sat 0.6 units from the river's centre-line for three
 * releases; the sweep shoved its sprite onto dry land and the gate said
 * clean, while the hit box, the door, the night lamp and the map anchor —
 * none of which the sweep touches — stayed in the water. Tapping the house
 * you could see did nothing; tapping open river opened the neighbour.
 *
 * So this checks the DATA: every building, every cottage spot, the order
 * board, every plot, every path node and every point of every path. It is
 * pure arithmetic over the exported geometry, needs no browser, and runs in
 * milliseconds — verify.mjs §23a calls it on every run, with no way to skip.
 *
 * Run: node tools/check-world-data.mjs
 */

import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href);

export async function checkWorldData() {
  const t = await load('src/village/terrain.js');
  const d = await load('src/village/defs.js');
  const s = await load('src/village/scene.js');
  const problems = [];
  let checked = 0;

  const wet = (x, y, what) => {
    checked += 1;
    if (t.inPond(x, y, 0)) problems.push(`${what} at (${Math.round(x)}, ${Math.round(y)}) is in the pond`);
    else if (t.nearRiver(x, y, t.RIVER_WATER)) problems.push(`${what} at (${Math.round(x)}, ${Math.round(y)}) is in the river`);
  };

  /* ---- Nothing a learner can tap may be in the water ---- */
  for (const b of d.BUILDINGS) {
    wet(b.at.x, b.at.y, `the ${b.id}`);
    wet(b.at.x, b.at.y - b.hit.h / 2, `the ${b.id}'s wall`);
  }
  d.HOUSE_SPOTS.forEach((sp, i) => wet(sp.x, sp.y, `cottage spot #${i}`));
  wet(d.BOARD.at.x, d.BOARD.at.y, 'the order board');
  for (const p of d.PLOTS) {
    wet(p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h / 2, `plot ${p.id}`);
    wet(p.rect.x, p.rect.y + p.rect.h, `plot ${p.id}'s corner`);
    wet(p.rect.x + p.rect.w, p.rect.y + p.rect.h, `plot ${p.id}'s corner`);
  }

  /* ---- A path may cross the water only on the bridge ---- */
  t.PATHS.forEach((path, i) => {
    for (const [x, y] of path) {
      checked += 1;
      if (t.inPond(x, y, 0)) problems.push(`path ${i} runs through the pond at (${Math.round(x)}, ${Math.round(y)})`);
      else if (t.nearRiver(x, y, t.RIVER_WATER) && !t.onBridgeDeck(x, y)) problems.push(`path ${i} fords the river at (${Math.round(x)}, ${Math.round(y)}) — there is no crossing there`);
      // A route is walked exactly as it is drawn, so a control point inside a
      // building is a person inside a building, every time, forever.
      const b = t.whichBuilding(x, y);
      if (b) problems.push(`path ${i} runs through the ${b} at (${Math.round(x)}, ${Math.round(y)})`);
    }
  });

  /* ---- Every named node is somewhere a person can stand ---- */
  for (const [name, [x, y]] of Object.entries(s.NODES ?? {})) {
    checked += 1;
    if (t.inPond(x, y, 0)) problems.push(`the ${name} node is in the pond`);
    else if (t.nearRiver(x, y, t.RIVER_WATER) && !t.onBridgeDeck(x, y)) problems.push(`the ${name} node is in the river`);
    if (t.insideBuilding(x, y)) problems.push(`the ${name} node is inside ${t.whichBuilding(x, y)}`);
  }

  /* ---- A walker standing at a building's node must draw IN FRONT of it ----
     The renderer sorts by y, so a node north of its building's base puts the
     person behind the roof. Three of the ten neighbours haunt the market, and
     its node was three units north of the stall: they walked up to it and
     vanished. */
  for (const [id, node] of Object.entries(s.BUILDING_NODE ?? {})) {
    const def = d.BUILDINGS.find((b) => b.id === id);
    const at = s.NODES?.[node];
    if (!def || !at) continue;
    checked += 1;
    if (at[1] < def.at.y + 4) problems.push(`the ${node} node (y ${at[1]}) is not south of the ${id}'s base (y ${def.at.y}) — a walker standing there is drawn inside the building`);
  }

  /* ---- The jetty has to reach the shore ---- */
  {
    checked += 1;
    const landEnd = t.JETTY.x;
    const onSand = !t.inPond(landEnd, t.JETTY.y, 0);
    if (!onSand) problems.push(`the jetty's land end (${landEnd}, ${t.JETTY.y}) is still in the pond — it is a raft`);
  }

  /* ---- The road out must stay on the map ---- */
  for (const p of t.PATHS.flat()) {
    checked += 1;
    if (p[0] < 0 || p[0] > d.WORLD.W || p[1] < -40 || p[1] > d.WORLD.H + 40) {
      problems.push(`a path point is off the map at (${Math.round(p[0])}, ${Math.round(p[1])})`);
    }
  }

  return { problems: [...new Set(problems)], checked };
}

if (process.argv[1]?.endsWith('check-world-data.mjs')) {
  const { problems, checked } = await checkWorldData();
  console.log(`\nChecked ${checked} map coordinates.`);
  if (!problems.length) { console.log('✓ every building, cottage, plot, path and node is on ground a person can stand on.\n'); process.exit(0); }
  console.log(`\n✗ ${problems.length} problem(s) in the map data:\n`);
  for (const p of problems) console.log('  ' + p);
  console.log('');
  process.exit(1);
}
