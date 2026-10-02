/**
 * check-village.mjs — the pet village, in a real browser.
 *
 * What a learner would notice if it broke: the six friends are there and
 * walking; the big button starts a real activity; each friend's card names
 * it and starts its real next activity; the friends, today, level, fire and
 * cottage cards open as proper dialogs and give focus back; the village
 * level draws its decorations; friends go home to sleep at night and stand
 * still when motion is reduced; the phone layout never scrolls sideways;
 * and the village reopens offline.
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
  ok(await ev(`['.cw-chip--fire', '.cw-chip--level', '[data-open="friends"]', '[data-open="cottage"]', '.cw-today', '.cw-play'].every((s) => document.querySelector(s))`), 'the top bar or the big button is missing');
  ok(await ev(`!document.querySelector('[data-open="satchel"], .cw-location, .cw-welcome, .vhud, .cw-envelope')`), 'old home chrome is back on the map');
  ok(await ev(`['#/rc/', '#/round/', '#/garden/', '#/pj/', '#/ps/', '#/ooo/', '#/bank/', '#/wd/', '#/world/place/'].some((p) => (document.querySelector('.cw-play').getAttribute('href') ?? '').startsWith(p))`), 'the big button does not start a real activity');
  ok(await ev(`document.querySelector('.pet[data-pet="ginger"]').dataset.word === 'new' && document.querySelector('.pet[data-pet="chai"]').dataset.word !== 'new'`), 'pet moods do not follow the records');

  // The painting itself moves: the wheel, the water, the banners, the trees.
  ok(await waitFor(`document.querySelectorAll('.cw-motion .mo').length >= 30 && document.querySelector('.cw-motion').previousElementSibling?.classList.contains('cw-art')`), 'the living painting did not mount just above the painting');
  ok(await ev(`[...document.querySelectorAll('.cw-motion .mo > b')].every((b) => b.getAnimations().some((a) => a.playState === 'running'))`), 'a patch of the living painting is standing still');
  ok(await ev(`document.querySelectorAll('.cw-glow--lamp').length >= 20 && getComputedStyle(document.querySelector('.cw-glow--lamp')).opacity > 0`), 'the lamps should glow faintly by day');

  // Sample the rendered water twice: every visible reach must actually move.
  ok(await waitFor(`document.querySelector('.cw-water')?.dataset.ready === 'true'`), 'the water mask did not load');
  await ev(`window.__waterBefore = [...document.querySelectorAll('.cw-water canvas')].map((c) => c.getContext('2d').getImageData(0, 0, c.width, c.height).data)`);
  await sleep(700);
  const water = await ev(`(() => {
    return [...document.querySelectorAll('.cw-water canvas')].map((c, reach) => {
      const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, before = window.__waterBefore[reach];
      let changed = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i+3] > 20 && Math.abs(data[i]-before[i]) + Math.abs(data[i+1]-before[i+1]) > 6) changed++;
      }
      return changed;
    });
  })()`);
  ok(water.length === 5 && water.every((n) => n > 20), `a river reach is still: ${water}`);
  ok(await ev(`(() => { const c = document.querySelectorAll('.cw-water canvas')[2]; return c.getContext('2d').getImageData(205, 25, 1, 1).data[3] === 0; })()`), 'water painted over the wooden dock');

  // Whole-map view works even on a phone; zooming returns to exploration.
  await ev(`document.querySelector('[data-camera="overview"]').click()`); await sleep(850);
  ok(await ev(`(() => { const r = document.querySelector('.cw-map').getBoundingClientRect(); return r.width <= innerWidth + 1 && r.height <= innerHeight + 1 && r.left >= -1 && r.top >= -1; })()`), 'overview crops part of the village');
  const wide = await ev(`document.querySelector('.cw-map').getBoundingClientRect().width`);
  await ev(`document.querySelector('[data-camera="overview"]').click()`); await sleep(850);
  ok(await ev(`document.querySelector('.cw-map').getBoundingClientRect().width`) > wide, 'the overview button did not zoom back in');

  // Pets choose at random, and every one may idle for a while: wait for any of them to move, up to twenty seconds.
  const p0 = JSON.parse(await positions());
  let moved = 0;
  for (let t = 0; t < 40 && !moved; t += 1) { await sleep(500); moved = JSON.parse(await positions()).filter((x, i) => x !== p0[i]).length; }
  ok(moved >= 1, 'no pet moved in twenty seconds');

  // A pet's card names the pet and starts its real next activity.
  await ev(`document.querySelector('.pet[data-pet="chai"]').click()`);
  ok(await waitFor(`!!document.querySelector('.cw-card[aria-modal="true"] h2')?.textContent.includes('Chai')`), "Chai's card did not open as a named dialog");
  ok(await waitFor(`!!document.activeElement.closest('.cw-card')`), "Chai's card did not take focus");
  ok(await ev(`/^#\\/(rc|world\\/place|bank)\\//.test(document.querySelector('.cw-card .cw-go')?.getAttribute('href') ?? '')`), "Chai's card does not start a reading activity");
  await key('Escape', 'Escape', 27);
  ok(await waitFor(`document.querySelector('.cw-overlay').hidden`, 3000), 'Escape did not close the card');

  // Who is who, today's three, the village level, the fire, the cottage.
  for (const [open, sel, n] of [['friends', '.cw-roster li', 6], ['today', '.cw-todo li', 3], ['level', '.cw-road li', 9], ['fire', '.cw-week li', 7], ['cottage', '.cw-toggle', 2]]) {
    await ev(`document.querySelector('[data-open="${open}"]').focus(); document.querySelector('[data-open="${open}"]').click()`);
    ok(await waitFor(`document.querySelectorAll('.cw-card ${sel}').length === ${n}`), `${open} did not open with ${n} × ${sel}`);
    await key('Escape', 'Escape', 27);
    ok(await waitFor(`document.querySelector('.cw-overlay').hidden && document.activeElement?.dataset?.open === '${open}'`, 3000), `${open} did not close and give focus back`);
  }

  // The village level draws what it has earned: this learner is past level 2, so the plaza lanterns hang.
  ok(await ev(`Number(document.querySelector('.cw-lv b')?.textContent) >= 2`), 'this learner should be past village level 2');
  ok(await waitFor(`document.querySelectorAll('.cw-treasure--lanterns').length === 4`), 'the plaza lanterns are not drawn for a level-2 village');
  ok(await ev(`document.querySelectorAll('.cw-treasure[data-home]').length >= 1`), "no friend's home shows its hearts");
  ok(await ev(`document.querySelectorAll('.pet .rig__foot').length === 12`), 'the friends should walk on two feet each');

  // The clock tower is progress.
  await ev(`document.querySelector('[data-spot="clock"]').click()`);
  ok(await waitFor(`location.hash === '#/growth'`), 'the clock tower did not open progress');

  // Night: the pets go home to sleep.
  await ev(`localStorage.setItem('catos:hour', 'night')`);
  await browser.open(`${server.url}#/world`, 1500);
  ok(await waitFor(`[...document.querySelectorAll('.pet')].filter((e) => e.dataset.state === 'sleep' || e.dataset.state === 'doze' || e.dataset.state === 'slump').length >= 4`, 15000), 'pets did not go to sleep at night: ' + await ev(`JSON.stringify([...document.querySelectorAll('.pet')].map((e) => e.dataset.pet + ':' + e.dataset.state + ':' + e.dataset.word))`));
  ok(await ev(`document.querySelector('.cw').dataset.hour === 'night'`), 'the village is not at night');

  // Reduced motion: nobody walks.
  await ev(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); await st.put('settings', { id: 'motion', value: 'reduced' }); return 1; })()`);
  await ev(`localStorage.setItem('catos:hour', 'afternoon')`);
  await browser.open(`${server.url}#/world`, 2500);
  const r0 = await positions(); await sleep(4000); const r1 = await positions();
  ok(r0 === r1, 'pets walked with reduced motion on');
  ok(await ev(`!document.querySelector('.cw-motion')`), 'the painting moved with reduced motion on');
  ok(await ev(`!document.querySelector('.cw-water')`), 'water animation mounted with reduced motion on');
  ok(await ev(`!document.querySelector('.pet .prop')`), 'a friend started a chore with reduced motion on');
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
