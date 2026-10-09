/**
 * check-walk.mjs — the friends walk only where the path is.
 *
 * Owner, 2026-10-09: "Biscuit started walking above the fence ... no character
 * should walk on anything, there is a proper way, they can only walk through
 * that area." A friend that stands a few pixels off the traced nodes and edges
 * (src/pets/paths.js) is on a railing, a step or a flowerbed, so this runs the
 * real village for a few minutes on synthetic frames (the page's
 * requestAnimationFrame is ours: ~190 frames a second, 20 ms of village time
 * each) and measures every friend against the path, every 5 frames:
 *
 *   - no friend is ever more than 1 px from an edge of the walk graph;
 *   - a party called while friends are mid-walk (they turn at the next node,
 *     never cut across the ground) gathers all eight on the plaza, still on it;
 *   - the village keeps roaming: friends are on the move in every minute (a
 *     leaking "spot taken" list once stopped them going anywhere new).
 *
 *   node tools/check-walk.mjs            about a minute and a half
 */
import { serveRepo, launchChrome, findChrome } from './cdp-lite.mjs';
import { NODES, EDGES } from '../src/pets/paths.js';

if (!findChrome()) { console.log('SKIPPED: no Chrome'); process.exit(0); }

const DT = 20;   // village ms per frame: under the 23 ms "slow device" line, so the loop stays at 60 a second
const HOOK = `(() => {
  const NODES = ${JSON.stringify(NODES)}, EDGES = ${JSON.stringify(EDGES)};
  const q = []; let T = 0, k = 0;
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.cancelAnimationFrame = () => {};
  const re = /translate3d\\(([-\\d.]+)px,\\s*([-\\d.]+)px/;
  const off = (x, y) => { let m = 1e9; for (const [a, b] of EDGES) { const A = NODES[a], B = NODES[b], dx = B.x - A.x, dy = B.y - A.y, l2 = dx * dx + dy * dy; const t = Math.max(0, Math.min(1, ((x - A.x) * dx + (y - A.y) * dy) / l2)); m = Math.min(m, Math.hypot(x - A.x - t * dx, y - A.y - t * dy)); } return m; };
  const stat = window.__walk = { samples: 0, worst: 0, at: '', walking: {}, seen: {}, errors: [] };
  window.__run = (n) => {
    for (let i = 0; i < n; i += 1) {
      T += ${DT};
      for (const cb of q.splice(0)) { try { cb(T); } catch (e) { stat.errors.push(String(e)); } }
      if (++k % 5) continue;
      for (const el of document.querySelectorAll('.cw .pet')) {
        const m = re.exec(el.style.transform || ''); if (!m) continue;
        const d = off(+m[1], +m[2]), s = el.dataset.state || '';
        stat.samples += 1;
        if (d > stat.worst) { stat.worst = d; stat.at = el.dataset.pet + ' ' + s + ' ' + m[1] + ',' + m[2]; }
        if (s === 'walk') { const min = Math.floor(T / 60000); stat.walking[min] = (stat.walking[min] || 0) + 1; }
        (stat.seen[el.dataset.pet] ||= {})[s] = 1;
      }
    }
  };
})()`;

const SEED = `(async () => {
  const s = await import('/src/core/storage/indexeddb-adapter.js');
  const st = new s.IndexedDBAdapter(); await st.init();
  for (const store of ['sessions', 'learning']) { const all = await st.getAll(store); for (const r of all) await st.delete(store, r.id); }
  const H = 3600000, D = 24 * H, iso = (ms) => new Date(Date.now() - ms).toISOString();
  await st.put('settings', { id: 'valley', value: { name: 'Ashfield', awakened_at: iso(10 * D), met_at: iso(10 * D) } });
  await st.put('settings', { id: 'motion', value: 'full' });
  return 'seeded';
})()`;

const server = await serveRepo();
const browser = await launchChrome({ width: 1536, height: 1024 });
const ev = (x) => browser.evaluate(x);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = async (frames) => { for (let d = 0; d < frames; d += 1500) await ev(`window.__run(${Math.min(1500, frames - d)})`); };
let checks = 0;
const ok = (c, m) => { if (!c) throw new Error(m); checks += 1; };

try {
  // Headless Chrome only paints a page it believes is in front.
  await browser.send('Page.bringToFront').catch(() => {});
  await browser.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await browser.send('Page.addScriptToEvaluateOnNewDocument', { source: HOOK });
  await browser.open(`${server.url}#/settings`, 2500);
  ok(await ev(SEED) === 'seeded', 'could not seed the learner');
  await ev(`localStorage.setItem('catos:hour', 'afternoon'); localStorage.setItem('catos:met-gang', '1')`);
  await browser.open(`${server.url}#/world`, 1500);
  for (let i = 0; i < 80 && !(await ev(`document.querySelectorAll('.cw .pet').length === 8 && !!document.querySelector('.cw')?.__village`)); i += 1) { await ev('window.__run(30)'); await sleep(120); }
  ok(await ev(`document.querySelectorAll('.cw .pet').length === 8`), 'the village did not draw eight friends');
  await ev('Object.assign(window.__walk, { samples: 0, worst: 0, walking: {} }); 1');

  // Two minutes of village life, then the party.
  await run(6000);
  let w = await ev('JSON.parse(JSON.stringify(window.__walk))');
  ok(!w.errors.length, `the village threw while walking: ${w.errors[0]}`);
  ok(w.samples > 1000, `only ${w.samples} samples: the friends were not drawn`);
  ok(w.worst <= 1, `a friend strayed ${w.worst.toFixed(1)} px off the path (${w.at}): it is standing on a fence, a step or a flowerbed`);
  const mins = [0, 1].map((m) => w.walking[m] ?? 0);
  ok(mins.every((n) => n > 100), `friends stopped roaming: walking samples per minute ${mins.join(', ')}`);

  // A party called while friends are mid-walk: they finish the step in hand, turn at the node, and gather.
  for (let i = 0; i < 40 && (await ev(`[...document.querySelectorAll('.cw .pet')].filter((e) => e.dataset.state === 'walk').length`)) < 2; i += 1) await run(60);
  await ev(`document.querySelector('.cw').__village.party('chai', { ms: 20000 }); window.__walk.seen = {}; 1`);
  await run(1200);
  w = await ev('JSON.parse(JSON.stringify(window.__walk))');
  ok(!w.errors.length, `the village threw during the party: ${w.errors[0]}`);
  ok(w.worst <= 1, `a friend cut across the ground to the party, ${w.worst.toFixed(1)} px off the path (${w.at})`);
  const cheered = Object.entries(w.seen).filter(([, s]) => s.cheer).map(([id]) => id);
  ok(cheered.length === 8, `only ${cheered.join(', ')} reached the party`);

  console.log(`walk: ${w.samples} positions of eight friends over ${((6000 + 1200) * DT / 60000).toFixed(1)} village minutes, none more than ${w.worst.toFixed(2)} px off the path; a party mid-walk gathered all eight (${checks} checks)`);
} catch (err) {
  console.log(`✗ ${err.message}`);
  process.exitCode = 1;
} finally { browser.close(); server.close(); }
