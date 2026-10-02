/**
 * check-village.mjs — the pet village, in a real browser.
 *
 * What a learner would notice if it broke: the six pets are there and
 * walking; each pet's card names it and starts its real next activity;
 * the satchel, the fire and the cottage open as proper dialogs and give
 * focus back; a treasure can be made and appears on the map; pets go home
 * to sleep at night and stand still when motion is reduced; the phone
 * layout never scrolls sideways; and the village reopens offline.
 *
 *   node tools/check-village.mjs            all of it
 *   node tools/check-village.mjs --quick    no offline leg
 */
import { serveRepo, launchChrome, findChrome } from './cdp-lite.mjs';

if (!findChrome()) { console.log('SKIPPED: no Chrome'); process.exit(0); }
const quick = process.argv.includes('--quick');
const server = await serveRepo();
const browser = await launchChrome({ width: 390, height: 844 });
let checks = 0;
const ok = (c, m) => { if (!c) throw new Error(m); checks += 1; };
const ev = (x) => browser.evaluate(x);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (expr, ms = 12000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await ev(expr)) return true; await sleep(150); } return false; };
const key = (k, code, vk) => browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk });
const positions = () => ev(`JSON.stringify([...document.querySelectorAll('.pet')].map((e) => e.style.transform))`);

/* A learner some days in: Chai and Mallow recent, Matcha fading, Mochi
   sleepy, Ginger never met, Toffee's Gauntlet a week old. No treasures. */
const SEED = `(async () => {
  const s = await import('/src/core/storage/indexeddb-adapter.js');
  const st = new s.IndexedDBAdapter(); await st.init();
  for (const store of ['sessions', 'learning']) { const all = await st.getAll(store); for (const r of all) await st.delete(store, r.id); }
  const H = 3600000, D = 24 * H, iso = (ms) => new Date(Date.now() - ms).toISOString();
  await st.put('settings', { id: 'valley', value: { name: 'Ashfield', awakened_at: iso(10 * D), met_at: iso(10 * D) } });
  const rc = ['rc-0001', 'rc-0002', 'rc-0003', 'rc-0004'], rcAt = [3 * H, 26 * H, 50 * H, 4 * D];
  for (let i = 0; i < rc.length; i += 1) await st.put('sessions', { id: 'cv-rc-' + i, passage_id: rc[i], started_at: iso(rcAt[i] + 6e5), finished_at: iso(rcAt[i]), duration_ms: 3e5, score: { correct: 4, total: 4, accuracy: 1 }, answers: [0, 1, 2, 3].map((q) => ({ question_id: rc[i] + '-q' + (q + 1), is_correct: true, time_ms: 30000, skill: 'main_idea' })) });
  for (const [i, t] of [46 * H, 70 * H].entries()) await st.put('learning', { id: 'cv-lex-' + i, kind: 'lex-round', region: 'meadow', bundle_id: 'x', stars: 3, flawless: false, score: { correct: 11, total: 12 }, finished_at: iso(t) });
  const mod = (m, t, i) => st.put('sessions', { id: 'cv-' + m + '-' + i, module: m, started_at: iso(t + 3e5), finished_at: iso(t), duration_ms: 24e4, score: { correct: 3, total: 4, accuracy: 0.75 }, item_ids: [], target_sec: 400, answers: [] });
  await mod('ps', 4 * D, 0); await mod('ooo', 20 * H, 0); await mod('ooo', 30 * H, 1);
  await st.put('learning', { id: 'cv-g', kind: 'gauntlet-run', stars: 2, score: { correct: 20, total: 30 }, finished_at: iso(6 * D) });
  await st.put('settings', { id: 'motion', value: 'full' });
  return 'seeded';
})()`;

try {
  await browser.open(`${server.url}#/settings`, 2500);
  ok(await ev(SEED) === 'seeded', 'could not seed the learner');
  await ev(`localStorage.setItem('catos:hour', 'afternoon')`);
  await browser.open(`${server.url}#/world`, 1500);
  ok(await waitFor(`document.querySelectorAll('.cw .pet').length === 6 && !!document.querySelector('.cw-art')?.naturalWidth`), 'the village did not draw six pets on the painting');
  ok(await ev(`!!document.querySelector('.cw h1')`), 'the village needs a heading');
  ok(await ev(`['.cw-flame', '[data-open="satchel"]', '[data-open="cottage"]', '.cw-today'].every((s) => document.querySelector(s))`), 'the three pieces of chrome are missing');
  ok(await ev(`!document.querySelector('.cw-location, .cw-dock, .cw-welcome, .vhud')`), 'old home chrome is back on the map');
  ok(await ev(`document.querySelector('.pet[data-pet="ginger"]').dataset.word === 'new' && document.querySelector('.pet[data-pet="chai"]').dataset.word !== 'new'`), 'pet moods do not follow the records');

  const p0 = await positions(); await sleep(6000); const p1 = await positions();
  const moved = JSON.parse(p0).filter((t, i) => t !== JSON.parse(p1)[i]).length;
  ok(moved >= 1, 'no pet moved in six seconds');

  // A pet's card names the pet and starts its real next activity.
  await ev(`document.querySelector('.pet[data-pet="chai"]').click()`);
  ok(await waitFor(`!!document.querySelector('.cw-card[aria-modal="true"] h2')?.textContent.includes('Chai')`), "Chai's card did not open as a named dialog");
  ok(await waitFor(`!!document.activeElement.closest('.cw-card')`), "Chai's card did not take focus");
  ok(await ev(`/^#\\/(rc|world\\/place|bank)\\//.test(document.querySelector('.cw-card .cw-go')?.getAttribute('href') ?? '')`), "Chai's card does not start a reading activity");
  await key('Escape', 'Escape', 27);
  ok(await waitFor(`document.querySelector('.cw-overlay').hidden`, 3000), 'Escape did not close the card');

  // The satchel, the fire, the cottage.
  for (const [open, sel, n] of [['satchel', '.cw-gifts li', 6], ['wishes', '.cw-wishes li', 3], ['cottage', '.cw-toggle', 2]]) {
    await ev(`document.querySelector('[data-open="${open}"]').focus(); document.querySelector('[data-open="${open}"]').click()`);
    ok(await waitFor(`document.querySelectorAll('.cw-card ${sel}').length === ${n}`), `${open} did not open with ${n} × ${sel}`);
    await key('Escape', 'Escape', 27);
    ok(await waitFor(`document.querySelector('.cw-overlay').hidden && document.activeElement?.dataset?.open === '${open}'`, 3000), `${open} did not close and give focus back`);
  }

  // Make the first treasure; it appears on the map.
  await ev(`document.querySelector('[data-open="satchel"]').click()`);
  ok(await waitFor(`!!document.querySelector('.cw-card [data-make]:not([disabled])')`), 'the lanterns should be affordable for this learner');
  await ev(`document.querySelector('.cw-card [data-make]').click()`);
  ok(await waitFor(`document.querySelectorAll('.cw-treasure--lanterns').length === 4`), 'the lanterns did not appear after making them');
  ok(await ev(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); return (await st.getAll('learning')).filter((r) => r.kind === 'village-treasure').length; })()`) === 1, 'making a treasure must write exactly one record');

  // The clock tower is progress.
  await ev(`document.querySelector('[data-spot="clock"]').click()`);
  ok(await waitFor(`location.hash === '#/growth'`), 'the clock tower did not open progress');

  // Night: the pets go home to sleep.
  await ev(`localStorage.setItem('catos:hour', 'night')`);
  await browser.open(`${server.url}#/world`, 1500);
  ok(await waitFor(`[...document.querySelectorAll('.pet')].filter((e) => e.dataset.state === 'sleep' || e.dataset.state === 'doze' || e.dataset.state === 'slump').length >= 4`, 15000), 'pets did not go to sleep at night');
  ok(await ev(`document.querySelector('.cw').dataset.hour === 'night'`), 'the village is not at night');

  // Reduced motion: nobody walks.
  await ev(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); await st.put('settings', { id: 'motion', value: 'reduced' }); return 1; })()`);
  await ev(`localStorage.setItem('catos:hour', 'afternoon')`);
  await browser.open(`${server.url}#/world`, 2500);
  const r0 = await positions(); await sleep(4000); const r1 = await positions();
  ok(r0 === r1, 'pets walked with reduced motion on');
  ok(await ev(`document.documentElement.scrollWidth <= innerWidth`), 'the phone village scrolls sideways');
  ok(await ev(`window.__catos.errors.length === 0`), 'browser errors: ' + await ev(`JSON.stringify(window.__catos.errors)`));

  // A wide screen: the card sits on the right, clear of the map's centre.
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await browser.open(`${server.url}#/world`, 2000);
  await ev(`document.querySelector('.pet[data-pet="matcha"]').click()`);
  ok(await waitFor(`document.querySelector('.cw-card')?.getBoundingClientRect().left > 900`), 'the desktop card should sit on the right');

  if (!quick) {
    await browser.send('Network.setBypassServiceWorker', { bypass: false });
    await browser.send('Page.navigate', { url: `${server.url}?offline-check=1#/world` });
    ok(await waitFor(`!!navigator.serviceWorker.controller`, 60000), 'the service worker did not take control');
    ok(await waitFor(`Promise.all(['./assets/art/home-world-v1.png', './assets/art/pet-chai.png'].map((u) => caches.match(u))).then((r) => r.every(Boolean))`, 30000), 'the painting and the pets must be cached for offline use');
    await browser.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await browser.send('Page.reload', { ignoreCache: false });
    ok(await waitFor(`document.querySelectorAll('.cw .pet').length === 6 && !!document.querySelector('.cw-art')?.naturalWidth`, 20000), 'the village did not reopen offline');
  }
  console.log(`check-village: ${checks} checks passed`);
} catch (err) {
  console.error('check-village FAIL:', err.message);
  process.exitCode = 1;
} finally { browser.close(); server.close(); }
process.exit(process.exitCode || 0);
