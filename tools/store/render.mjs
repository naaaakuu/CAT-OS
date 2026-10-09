/**
 * render.mjs — the Google Play listing images, from the real app.
 *   node tools/store/render.mjs   → android/store/feature.png (1024x500)
 *                                   android/store/phone-NN.jpg (1080x1920)
 * Screens are the web build with a learner a week in (check-rendered-contrast SEED).
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launchChrome, serveRepo, REPO_ROOT } from '../cdp-lite.mjs';
import { SEED } from '../check-rendered-contrast.mjs';

const OUT = join(REPO_ROOT, 'android', 'store');
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await serveRepo();

const SHOTS = [
  ['#/world', ''],
  ['#/world/place/reading-room', ''],
  ['#/rc/review/rc-0001', `document.querySelectorAll('cat-explanation')[1]?.scrollIntoView({block:'start'}); document.querySelector('.run__body,.screen')?.scrollBy?.(0,-90)`],
  ['#/pj/learn/pj-0001', ''],
  ['#/growth', ''],
  ['#/rc/mentor/rc-0001', ''],
];

{
  const b = await launchChrome({ width: 1024, height: 500 });
  await b.open(server.url + 'tools/store/feature.html', 1500);
  const r = await b.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, 'feature.png'), Buffer.from(r.data, 'base64'));
  b.close();
  console.log('feature.png');
}

const b = await launchChrome({ width: 360, height: 640, dpr: 3 });
await b.open(server.url + 'index.html#/world', 1500);
await b.evaluate(SEED);
// One real-shaped attempt (chosen options, duration_ms) so the review shows verdicts and traps.
await b.evaluate(`(async () => {
  const s = await import('/src/core/storage/indexeddb-adapter.js');
  const st = new s.IndexedDBAdapter(); await st.init();
  await st.put('sessions', { id: 'store-rc', passage_id: 'rc-0001', started_at: new Date(Date.now() - 500000).toISOString(), finished_at: new Date().toISOString(),
    duration_ms: 412000, stars: 2, score: { correct: 2, total: 4, accuracy: 0.5 },
    answers: ['A', 'C', 'B', 'D'].map((chosen, q) => ({ question_id: 'rc-0001-q' + (q + 1), chosen, time_ms: 60000 })) });
  return 1;
})()`);
let n = 0;
for (const [hash, js] of SHOTS) {
  await b.open(server.url + 'index.html' + hash, 6000);
  if (js) { await b.evaluate(js); await wait(1200); }
  await b.send('Page.bringToFront');
  await b.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  const r = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 }, 60000);
  const name = `phone-${String(++n).padStart(2, '0')}.jpg`;
  writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64'));
  console.log(name, hash);
}
b.close();
server.close();
