/**
 * check-village.mjs — the pet village, in a real browser.
 *
 * What a learner would notice if it broke: the seven friends are there and
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
// A tap that cannot land on a house or a friend: the intro listens for any pointerdown on the village.
const nudge = (sel = '.cw') => ev(`document.querySelector('${sel}').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); 1`);
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
  await ev(`localStorage.setItem('catos:hour', 'afternoon'); localStorage.setItem('catos:met-gang', '1')`);
  await browser.open(`${server.url}#/world`, 1500);
  ok(await waitFor(`document.querySelectorAll('.cw .pet').length === 7 && !!document.querySelector('.cw-art')?.naturalWidth`), 'the village did not draw seven pets on the painting');
  ok(await ev(`!!document.querySelector('.cw h1')`), 'the village needs a heading');
  ok(await ev(`['.cw-chip--fire', '.cw-chip--level', '[data-open="friends"]', '[data-open="cottage"]', '.cw-today', '.cw-play'].every((s) => document.querySelector(s))`), 'the top bar or the big button is missing');
  ok(await ev(`!document.querySelector('[data-open="satchel"], .cw-location, .cw-welcome, .vhud, .cw-envelope')`), 'old home chrome is back on the map');
  ok(await ev(`['#/rc/', '#/round/', '#/garden/', '#/pj/', '#/ps/', '#/ooo/', '#/bank/', '#/wd/', '#/world/place/'].some((p) => (document.querySelector('.cw-play').getAttribute('href') ?? '').startsWith(p))`), 'the big button does not start a real activity');
  ok(await ev(`document.querySelector('.pet[data-pet="ginger"]').dataset.word === 'new' && document.querySelector('.pet[data-pet="chai"]').dataset.word !== 'new'`), 'pet moods do not follow the records');

  // The painting itself moves: the wheel, the water, the banners, the trees.
  // ...laid over the painting as this learner has grown it (src/home/houses.js), the patches just above it.
  ok(await waitFor(`!!document.querySelector('.cw-base.is-in') && document.querySelectorAll('.cw-motion .mo').length >= 30 && document.querySelector('.cw-motion').previousElementSibling?.classList.contains('cw-base')`, 20000), 'the grown painting or the living painting above it did not mount');
  // A house's own machine waits for it: Ginger is new, so the workshop gear is still.
  ok(await ev(`![...document.querySelectorAll('.cw-motion .mo--spin')].some((m) => parseFloat(m.style.left) === 801)`), 'the workshop gear turns before its house has woken');
  // On screen every patch runs; off screen they pause (a running CSS animation is restyled every frame, seen or not).
  ok(await ev(`(() => { const on = [...document.querySelectorAll('.cw-motion .mo:not([data-off]) > b')], off = [...document.querySelectorAll('.cw-motion .mo[data-off] > b')]; return on.length >= 3 && on.every((b) => b.getAnimations().some((a) => a.playState === 'running')) && off.every((b) => b.getAnimations().every((a) => a.playState === 'paused')); })()`), 'a patch on screen is standing still, or one off screen is still animating');
  ok(await ev(`document.querySelectorAll('.cw-glow--lamp').length >= 20 && getComputedStyle(document.querySelector('.cw-glow--lamp')).opacity > 0`), 'the lamps should glow faintly by day');

  // Sample the rendered water twice: every reach on screen must actually move (one off screen keeps its last picture).
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
  const seen = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.cw-water canvas')].map((c) => { const r = c.getBoundingClientRect(); return r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight; }))`));
  ok(water.length === 5 && seen.some(Boolean) && water.every((n, i) => !seen[i] || n > 20), `a river reach on screen is still: ${water} (on screen: ${seen})`);
  ok(await ev(`(() => { const c = document.querySelectorAll('.cw-water canvas')[2]; return c.getContext('2d').getImageData(205, 25, 1, 1).data[3] === 0; })()`), 'water painted over the wooden dock');

  // No zoom (owner, 2026-10-03): on a phone the painting fills the height at full detail and scrolls sideways.
  ok(await ev(`!document.querySelector('[data-camera="overview"], .cw-overview')`), 'a zoom-out control is back on the map');
  ok(await ev(`(() => { const r = document.querySelector('.cw-map').getBoundingClientRect(); return Math.abs(r.height - innerHeight) <= 1 && r.width > innerWidth * 2.5; })()`), 'the phone map should fill the height and run about three screens wide');
  await browser.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 420 }, { x: 120, y: 420 }] });
  await browser.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 360, y: 420 }, { x: 60, y: 420 }] });
  await browser.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(300);
  ok(await ev(`Math.abs(document.querySelector('.cw-map').getBoundingClientRect().height - innerHeight) <= 1`), 'a pinch changed the zoom');
  await ev(`document.querySelector('.cw').__village.look(768, 512)`);
  const xa = await ev(`document.querySelector('.cw-map').getBoundingClientRect().left`);
  await browser.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 200, y: 420, deltaX: 0, deltaY: 240 });
  await sleep(250);
  ok(await ev(`document.querySelector('.cw-map').getBoundingClientRect().left`) < xa - 100, 'an ordinary mouse wheel should scroll the village sideways');

  // Every house says its subject, on a sign that is always up.
  ok(await ev(`(() => { const p = [...document.querySelectorAll('.cw-spot .cw-plate')]; return p.length === 8 && p.every((e) => getComputedStyle(e).opacity === '1' && e.getBoundingClientRect().width > 60 && e.textContent.trim().length > 4); })()`), 'every house needs a visible subject sign');
  ok(await ev(`['Reading Comprehension', 'Para Jumbles', 'Para Summary', 'Odd One Out', 'Sentence Placement', 'Para Completion', 'Vocabulary'].every((t) => [...document.querySelectorAll('.cw-plate')].some((p) => p.textContent.includes(t)))`), 'a VARC subject has no house');

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
  for (const [open, sel, n] of [['friends', '.cw-roster li a[href^="#/"]', 8], ['today', '.cw-todo li', 3], ['level', '.cw-road li', 9], ['fire', '.cw-week li', 7], ['cottage', '.cw-toggle', 2]]) {
    await ev(`document.querySelector('[data-open="${open}"]').focus(); document.querySelector('[data-open="${open}"]').click()`);
    ok(await waitFor(`document.querySelectorAll('.cw-card ${sel}').length === ${n}`), `${open} did not open with ${n} × ${sel}`);
    await key('Escape', 'Escape', 27);
    ok(await waitFor(`document.querySelector('.cw-overlay').hidden && document.activeElement?.dataset?.open === '${open}'`, 3000), `${open} did not close and give focus back`);
  }

  // The village level draws what it has earned: this learner is past level 2, so the plaza lanterns hang.
  ok(await ev(`Number(document.querySelector('.cw-lv b')?.textContent) >= 2`), 'this learner should be past village level 2');
  ok(await waitFor(`document.querySelectorAll('.cw-treasure--lanterns').length === 4`), 'the plaza lanterns are not drawn for a level-2 village');
  // Each house grows with its own section (src/home/houses.js): Chai's library (sixteen right answers, stage 2) has its lamps and windows lit; new Ginger's workshop is still dark.
  ok(await ev(`(() => { const g = JSON.parse(document.querySelector('.cw').__village.grown() || '{}'); const on = (h, k) => [...document.querySelectorAll('.cw-glow--' + k + '[data-house="' + h + '"]')].filter((e) => !e.classList.contains('is-off')).length; return g.chai >= 2 && g.ginger === 0 && on('chai', 'win') >= 4 && on('chai', 'lamp') >= 2 && on('ginger', 'win') === 0 && on('ginger', 'lamp') === 0; })()`), "the houses do not show how far each section has come");
  ok(await ev(`document.querySelectorAll('.pet .rig__foot').length === 14`), 'the friends should walk on two feet each');

  // Each friend grows with their subject and wears it: this learner's Chai has questions right, so is past stage 1.
  ok(await ev(`[...document.querySelectorAll('.pet')].every((e) => /^\\d+$/.test(e.dataset.stage ?? ''))`), 'every friend should carry its growth stage');
  ok(await ev(`Number(document.querySelector('.pet[data-pet="chai"]').dataset.stage) >= 1 && !!document.querySelector('.pet[data-pet="chai"] .pet-body .gear')`), 'Chai has grown and should be wearing it');

  // A set just finished: every friend runs to the plaza and cheers round the one helped.
  await ev(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); await st.put('sessions', { id: 'cv-party', module: 'ooo', started_at: new Date(Date.now() - 2e5).toISOString(), finished_at: new Date().toISOString(), duration_ms: 18e4, score: { correct: 3, total: 3, accuracy: 1 }, item_ids: [], target_sec: 300, answers: [] }); sessionStorage.removeItem('world:toasted'); return 1; })()`);
  await ev(`location.hash = '#/settings'`);
  await sleep(900);
  await ev(`location.hash = '#/world'`);
  const pc = JSON.parse(await ev(`import('/src/pets/paths.js').then((m) => JSON.stringify(m.NODES.pc))`));
  ok(await waitFor(`(() => { const v = document.querySelector('.cw')?.__village; return !!v && ['toffee', 'chai', 'matcha', 'mochi', 'ginger', 'mallow', 'sesame'].filter((id) => { const p = v.positionOf(id); return Math.hypot(p.x - ${pc.x}, p.y + 40 - ${pc.y}) < 210; }).length >= 5; })()`, 15000), 'the friends did not gather in the plaza after a finished set');
  ok(await waitFor(`document.querySelectorAll('.pet[data-state="cheer"]').length >= 4`, 8000), 'the friends in the plaza are not cheering');

  // The clock tower is Sesame's home (Para Completion); the rose cottage is Ginger's Sentence Placement.
  await ev(`document.querySelector('[data-spot="sesame"]').click()`);
  ok(await waitFor(`/Sesame/.test(document.querySelector('.cw-card--pet .cw-card__name')?.textContent ?? '') && /^#\\/(bank\\/session\\/pc|world\\/place\\/completion)/.test(document.querySelector('.cw-card--pet .cw-go')?.getAttribute('href') ?? '')`), 'the clock tower did not open Sesame and Para Completion');
  await ev(`document.querySelector('.cw-card [data-close]').click()`);
  await sleep(400);
  await ev(`location.hash = '#/world/place/completion'`);
  ok(await waitFor(`/Para completion · with Sesame/i.test(document.querySelector('.place__eyebrow')?.textContent ?? '')`), 'Para Completion is not hosted by Sesame');
  await ev(`location.hash = '#/world'`);
  ok(await waitFor(`!!document.querySelector('[data-spot="cottage"]')`), 'the village did not come back');
  await ev(`document.querySelector('[data-spot="cottage"]').click()`);
  ok(await waitFor(`location.hash === '#/world/place/placement' && /Sentence placement/i.test(document.querySelector('.place__eyebrow')?.textContent ?? '')`), 'the rose cottage did not open Sentence Placement');

  // Night: the pets go home to sleep.
  await ev(`localStorage.setItem('catos:hour', 'night')`);
  await browser.open(`${server.url}#/world`, 1500);
  ok(await waitFor(`[...document.querySelectorAll('.pet')].filter((e) => e.dataset.state === 'sleep' || e.dataset.state === 'doze' || e.dataset.state === 'slump').length >= 4`, 15000), 'pets did not go to sleep at night: ' + await ev(`JSON.stringify([...document.querySelectorAll('.pet')].map((e) => e.dataset.pet + ':' + e.dataset.state + ':' + e.dataset.word))`));
  ok(await ev(`document.querySelector('.cw').dataset.hour === 'night'`), 'the village is not at night');

  // Reduced motion: nobody walks.
  await ev(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); await st.put('settings', { id: 'motion', value: 'reduced' }); return 1; })()`);
  await ev(`localStorage.setItem('catos:hour', 'afternoon'); localStorage.setItem('catos:met-gang', '1')`);
  await browser.open(`${server.url}#/world`, 2500);
  const r0 = await positions(); await sleep(4000); const r1 = await positions();
  ok(r0 === r1, 'pets walked with reduced motion on');
  ok(await ev(`!document.querySelector('.cw-motion')`), 'the painting moved with reduced motion on');
  ok(await ev(`!document.querySelector('.cw-water')`), 'water animation mounted with reduced motion on');
  ok(await ev(`!document.querySelector('.pet .prop')`), 'a friend started a chore with reduced motion on');
  ok(await ev(`document.documentElement.scrollWidth <= innerWidth`), 'the phone village scrolls sideways');
  ok(await ev(`window.__catos.errors.length === 0`), 'browser errors: ' + await ev(`JSON.stringify(window.__catos.errors)`));

  // The first visit: Toffee, then each friend says who they are with a card naming their subject; Skip jumps to Chai.
  await ev(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); await st.delete('settings', 'valley'); await st.put('settings', { id: 'motion', value: 'full' }); return 1; })()`);
  await browser.open(`${server.url}#/world`, 1500);
  ok(await waitFor(`document.querySelector('.cw')?.classList.contains('is-intro')`), 'a first visit should open on the introductions');
  await sleep(1400);
  await nudge();
  ok(await waitFor(`!document.querySelector('.cw-meet').hidden && /Toffee/.test(document.querySelector('.cw-meet h2')?.textContent ?? '') && /Gauntlet/.test(document.querySelector('.cw-meet__keeps')?.textContent ?? '')`, 6000), "Toffee's meet card did not name Toffee and the Gauntlet");
  await sleep(500);
  await nudge('[data-skip]');
  ok(await waitFor(`document.querySelector('.cw').classList.contains('is-pointing') && document.querySelector('.cw-meet').hidden`, 6000), 'Skip did not jump to Chai calling you to the big button');
  await sleep(500);
  await nudge();
  ok(await waitFor(`!document.querySelector('.cw').classList.contains('is-intro')`, 6000), 'the introductions did not end');

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
    ok(await waitFor(`document.querySelectorAll('.cw .pet').length === 7 && !!document.querySelector('.cw-art')?.naturalWidth`, 20000), 'the village did not reopen offline');
  }
  console.log(`check-village: ${checks} checks passed`);
} catch (err) {
  console.error('check-village FAIL:', err.message);
  process.exitCode = 1;
} finally { browser.close(); server.close(); }
process.exit(process.exitCode || 0);
