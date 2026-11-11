/**
 * check-village.mjs — the pet village, in a real browser.
 *
 * What a learner would notice if it broke: the eight friends are there and
 * walking; the big button starts a real activity; each friend's card names
 * it and starts its real next activity (Chai has no card: he and his house
 * open his library as the whole screen); the friends, today, level, fire and
 * cottage cards open as proper dialogs and give focus back; the village
 * level draws its decorations; friends go home to sleep at night and stand
 * still when motion is reduced; the phone layout never scrolls sideways;
 * and the village reopens offline.
 *
 *   node tools/check-village.mjs            all of it
 *   node tools/check-village.mjs --quick    no offline leg
 */
import { serveRepo, launchChrome, findChrome } from './cdp-lite.mjs';
import { MAP, HOMES, NODES, LAMPS } from '../src/pets/paths.js';
import { groundY, STILL, ART_FILES, HOUSES } from '../src/home/landscape.js';
import { REACHES } from '../src/home/water.js';

if (!findChrome()) { console.log('SKIPPED: no Chrome'); process.exit(0); }
const quick = process.argv.includes('--quick');
const server = await serveRepo();
const browser = await launchChrome({ width: 390, height: 844 });
// A phone has a touch screen: two-finger gestures only reach the page as pointers when touch is emulated from the first load.
await browser.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
let checks = 0;
const ok = (c, m) => { if (!c) throw new Error(m); checks += 1; };
const ev = (x) => browser.evaluate(x);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (expr, ms = 12000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await ev(expr)) return true; await sleep(150); } return false; };
const key = (k, code, vk) => browser.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk });
// A tap that cannot land on a house or a friend: the intro listens for any pointerdown on the village.
const nudge = (sel = '.cw') => ev(`document.querySelector('${sel}').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); 1`);
const positions = () => ev(`JSON.stringify([...document.querySelectorAll('.pet')].map((e) => e.style.transform))`);
// Real taps catch an artwork or foreground layer intercepting a relocated
// landmark even when dispatching .click() would still reach its handler.
const tapHouse = async (id) => {
  const h = HOMES[id].hit;
  await ev(`document.querySelector('.cw').__village.look(${h.x + h.w / 2}, ${h.y + h.h / 2})`);
  await sleep(120);
  const p = await ev(`(() => {
    const el = document.querySelector('[data-spot="${id}"]'), r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    return { x, y, hit: document.elementFromPoint(x, y)?.closest('[data-spot]')?.dataset.spot };
  })()`);
  ok(p.x > 0 && p.x < 390 && p.y > 0 && p.y < 844 && p.hit === id, `${id}'s relocated house is not reachable by a phone tap`);
  await browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
};

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
  ok(await waitFor(`document.querySelectorAll('.cw .pet').length === 8 && !!document.querySelector('.cw-art')?.naturalWidth`), 'the village did not draw eight pets on the painting');
  ok(await ev(`!!document.querySelector('.cw h1')`), 'the village needs a heading');
  ok(await ev(`['.cw-chip--fire', '.cw-chip--level', '[data-open="friends"]', '[data-open="cottage"]', '.cw-play'].every((s) => document.querySelector(s))`), 'the top bar or the big button is missing');
  ok(await ev(`!document.querySelector('[data-open="satchel"], .cw-location, .cw-welcome, .vhud, .cw-envelope')`), 'old home chrome is back on the map');
  ok(await ev(`document.querySelector('.cw-play').getAttribute('href') === '#/duel'`), 'the big button does not start a duel');
  ok(await ev(`document.querySelector('.pet[data-pet="ginger"]').dataset.word === 'new' && document.querySelector('.pet[data-pet="chai"]').dataset.word !== 'new'`), 'pet moods do not follow the records');

  // The valley is assembled from separate pieces (src/home/scenery.js): eight baked house bodies cut at their ground lines, each with its parts canvas, bridges and oaks.
  ok(await waitFor(`document.querySelectorAll('.cw-scene .cw-house[data-ready]').length === 8 && document.querySelectorAll('.cw-scene .cw-house--ground').length === 8 && document.querySelectorAll('.cw-scene .cw-parts').length === 8 && document.querySelectorAll('.cw-bridge').length === 2 && document.querySelectorAll('.cw-tree').length >= 3`, 20000), 'the assembled houses, bridges or oaks did not mount');
  ok(await ev(`!document.querySelector('.cw-base, .cw-motion, .cw-woodland, .cw-ground')`), 'a layer of the old cropped painting is back');
  // A house sorts with the friends at its ground line (life.js gives each friend z-index = foot y), and the scene layer makes no stacking context of its own.
  ok(await ev(`(() => { const s = getComputedStyle(document.querySelector('.cw-scene')); const w = document.querySelector('.cw-house[data-house="chai"]:not(.cw-house--ground)'); return s.zIndex === 'auto' && s.transform === 'none' && s.opacity === '1' && Math.abs(Number(w.style.zIndex) - ${Math.round(groundY('chai'))}) <= 1; })()`), 'houses do not sort with the friends at their ground line');
  // A machine waits for its house to wake: Ginger is new, so the railway's carriages and clock stand still; its parts canvas does not change.
  const partsOf = (id) => `(() => { const c = document.querySelector('.cw-parts[data-house="${id}"]'); return c.width > 1 ? Array.from(c.getContext('2d').getImageData(0, 0, c.width, c.height).data.filter((_, i) => i % 97 === 0)).join(',') : ''; })()`;
  const moves = async (id) => { const a = await ev(partsOf(id)); await sleep(900); const b = await ev(partsOf(id)); return { drawn: a.length > 0, moved: a !== b }; };
  await ev(`document.querySelector('.cw').__village.look(${HOMES.ginger.door.x}, ${HOMES.ginger.door.y - 60})`);
  await sleep(400);
  { const m = await moves('ginger'); ok(m.drawn && !m.moved, `the railway's parts ${m.drawn ? 'move before its house has woken' : 'were never drawn'}`); }
  // Oak canopies sway over planted trunks; one off screen is paused (a running CSS animation is restyled every frame, seen or not).
  ok(await ev(`(() => { const t = [...document.querySelectorAll('.cw-tree')]; const on = t.filter((e) => !e.hasAttribute('data-off')), off = t.filter((e) => e.hasAttribute('data-off')); return on.length >= 1 && off.length >= 1 && on.every((e) => e.querySelector('.cw-tree__canopy').getAnimations().some((a) => a.playState === 'running') && e.querySelector('.cw-tree__trunk').getAnimations().length === 0) && off.every((e) => e.querySelector('.cw-tree__canopy').getAnimations().every((a) => a.playState === 'paused')); })()`), 'oak canopies do not sway on screen over still trunks, or keep swaying off screen');
  ok(await ev(`document.querySelectorAll('.cw-glow--lamp').length >= ${LAMPS.length} && ${LAMPS.length} >= 10 && getComputedStyle(document.querySelector('.cw-glow--lamp')).opacity > 0`), 'the lamps should glow faintly by day');
  // A mature village: every machine wakes (the clockworks' gear, the telescope, the carriages); then the record-derived stages come back.
  await ev(`(async () => { const v = document.querySelector('.cw').__village; window.__recordStages = JSON.parse(v.grown()); await v.houses(Object.fromEntries(Object.keys(window.__recordStages).map(id => [id, 10]))); return 1; })()`);
  for (const id of ['sesame', 'mallow', 'ginger']) {
    await ev(`document.querySelector('.cw').__village.look(${HOMES[id].door.x}, ${HOMES[id].door.y - 60})`);
    await sleep(500);
    const m = await moves(id); ok(m.drawn && m.moved, `${id}'s house is grown but its moving parts are still`);
  }
  await ev(`(async () => { await document.querySelector('.cw').__village.houses(window.__recordStages); return 1; })()`);
  ok(await waitFor(`document.querySelector('.cw').__village.grown() === JSON.stringify(window.__recordStages)`), 'restoring record-derived house stages did not take');

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
  ok(water.length === REACHES.length && seen.some(Boolean) && water.every((n, i) => !seen[i] || n > 20), `a river reach on screen is still: ${water} (on screen: ${seen})`);
  // The river sits under the valley's pieces: in front of the terrain, behind every bridge, house and friend.
  ok(await ev(`(() => { const w = document.querySelector('.cw-water'), sc = document.querySelector('.cw-scene'); return getComputedStyle(w).zIndex === 'auto' && !!(w.compareDocumentPosition(sc) & Node.DOCUMENT_POSITION_FOLLOWING); })()`), 'the animated river is not under the bridges and houses');

  // The valley always covers the screen (never a small picture with empty edges, owner 2026-10-03), opens closer than that on a phone so a house reads at a
  // useful size, and a pinch goes closer or wider but never wider than covering the screen.
  const mapBox = () => ev(`JSON.stringify(document.querySelector('.cw-map').getBoundingClientRect())`).then(JSON.parse);
  ok(await ev(`(() => { const c = document.querySelector('.cw').__village.camera; return c.zoom > 1.2 && c.s * ${HOUSES.chai.place.w} >= 250; })()`), 'a phone should open framed closer than the whole valley, with houses at a useful size');
  { const r = await mapBox(); ok(r.width >= 389 && r.height >= 843, 'the valley no longer covers the phone screen'); }
  await ev(`document.querySelector('.cw').__village.look(${MAP.w / 2}, ${MAP.h / 2})`);
  const before = await mapBox();
  // Two real fingers (touch emulation is on from the start, as on a phone), the gesture in small steps.
  const pinch = async (from, to) => {
    await browser.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195 + from, y: 420, id: 1 }, { x: 195 - from, y: 420, id: 2 }] });
    for (let k = 1; k <= 6; k += 1) { const d = from + (to - from) * k / 6; await browser.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195 + d, y: 420, id: 1 }, { x: 195 - d, y: 420, id: 2 }] }); await sleep(25); }
    await browser.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await sleep(150);
  };
  await pinch(35, 105);
  ok(await waitFor(`document.querySelector('.cw-map').getBoundingClientRect().height > ${before.height * 1.3}`, 3000), 'spreading two fingers did not bring the valley closer');
  for (let k = 0; k < 4; k += 1) await pinch(150, 20);
  await sleep(400);
  { const r = await mapBox(); ok(r.height >= 843 && r.width >= 389 && r.left <= 0.5 && r.top <= 0.5, 'pinching in left the valley smaller than the screen'); }
  await ev(`document.querySelector('.cw').__village.look(${MAP.w / 2}, ${MAP.h / 2}, 1.6)`);
  const ya = (await mapBox()).top;
  await browser.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 200, y: 420, deltaX: 0, deltaY: 240 });
  await sleep(250);
  ok((await mapBox()).top < ya - 100, 'an ordinary mouse wheel should scroll the tall valley down');
  await ev(`document.querySelector('.cw').__village.look(${MAP.w / 2}, ${MAP.h / 2}, 1.42)`);

  // Every house says its subject, on a sign that is always up.
  ok(await ev(`(() => { const p = [...document.querySelectorAll('.cw-plates .cw-plate')]; return p.length === 8 && p.every((e) => getComputedStyle(e).opacity === '1' && e.getBoundingClientRect().width > 60 && e.textContent.trim().length > 4); })()`), 'every house needs a visible subject sign');
  ok(await ev(`['Reading Comprehension', 'Para Jumbles', 'Para Summary', 'Odd One Out', 'Sentence Placement', 'Para Completion', 'Vocabulary'].every((t) => [...document.querySelectorAll('.cw-plate')].some((p) => p.textContent.includes(t)))`), 'a VARC subject has no house');

  // Pets choose at random, and every one may idle for a while: wait for any of them to move, up to twenty seconds.
  const p0 = JSON.parse(await positions());
  let moved = 0;
  for (let t = 0; t < 40 && !moved; t += 1) { await sleep(500); moved = JSON.parse(await positions()).filter((x, i) => x !== p0[i]).length; }
  ok(moved >= 1, 'no pet moved in twenty seconds');

  // Chai has no card and no Help button (owner, 2026-11-01): he and his house walk the learner straight into his library, and the shelves are the whole screen.
  const inLibrary = `location.hash === '#/world/place/reading-room' && !!document.querySelector('.place--library .lib__case .bk')`;
  const backToVillage = async (why) => {
    await ev(`document.querySelector('#back').click()`);
    ok(await waitFor(`location.hash === '#/world' && !!document.querySelector('[data-spot="chai"]')`), `the way back from the library did not reach the village (${why})`);
  };
  await ev(`document.querySelector('.pet[data-pet="chai"]').click()`);
  ok(await waitFor(inLibrary, 10000), 'tapping Chai did not walk into his library');
  ok(await ev(`!document.querySelector('.cw-card, .place__hero, .g-cta, #cta, .place__title')`), 'a card, a village picture, a title or a Help button stands between the learner and the library');
  // The page slides in over a few hundred ms (game.css place-in): measure once it has settled.
  const wholeScreen = `(() => { const r = document.querySelector('.lib__case').getBoundingClientRect(); return r.top <= 1 && r.bottom > innerHeight * 0.8; })()`;
  ok(await waitFor(wholeScreen, 3000), `the shelves are not the whole screen (${await ev(`JSON.stringify(document.querySelector('.lib__case').getBoundingClientRect())`)})`);
  await backToVillage('Chai');
  await tapHouse('chai');
  ok(await waitFor(inLibrary, 10000), "Chai's house did not open his library");
  await backToVillage('his house');

  // Matcha shares direct room entry: neither the mascot nor house opens a card.
  for (const sel of ['.pet[data-pet="matcha"]', '[data-spot="matcha"]']) {
    if (sel.startsWith('[data-spot')) await tapHouse('matcha');
    else await ev(`document.querySelector('${sel}').click()`);
    ok(await waitFor(`location.hash === '#/world/place/meadow' && !!document.querySelector('.gh-house--immersive')`, 10000), 'Matcha did not open the glasshouse directly');
    ok(await ev(`!document.querySelector('.cw-card, .gh-hero')`), 'Matcha still has a card or a banner between the learner and the room');
    await ev(`document.querySelector('.gh-back').click()`);
    ok(await waitFor(`!!document.querySelector('.cw')?.__village`), 'the greenhouse did not return to the village');
  }

  // Who is who, today's three, the village level, the fire, the cottage.
  for (const [open, sel, n] of [['friends', '.cw-roster li a[href^="#/"]', 8], ['fire', '.cw-week li', 7], ['cottage', '.cw-toggle', 2]]) {
    await ev(`document.querySelector('[data-open="${open}"]').focus(); document.querySelector('[data-open="${open}"]').click()`);
    ok(await waitFor(`document.querySelectorAll('.cw-card ${sel}').length === ${n}`), `${open} did not open with ${n} × ${sel}`);
    await key('Escape', 'Escape', 27);
    ok(await waitFor(`document.querySelector('.cw-overlay').hidden && document.activeElement?.dataset?.open === '${open}'`, 3000), `${open} did not close and give focus back`);
  }
  // Today's three and the village level live in the Rooms sheet now.
  for (const [open, sel, n] of [['today', '.cw-todo li', 3], ['level', '.cw-road li', 9]]) {
    await ev(`document.querySelector('[data-open="friends"]').focus(); document.querySelector('[data-open="friends"]').click()`);
    ok(await waitFor(`!!document.querySelector('.cw-roomlinks [data-open="${open}"]')`), `the Rooms sheet has no way to ${open}`);
    await ev(`document.querySelector('.cw-roomlinks [data-open="${open}"]').click()`);
    ok(await waitFor(`document.querySelectorAll('.cw-card ${sel}').length === ${n}`), `${open} did not open with ${n} × ${sel}`);
    await key('Escape', 'Escape', 27);
    ok(await waitFor(`document.querySelector('.cw-overlay').hidden && document.activeElement?.dataset?.open === 'friends'`, 3000), `${open} did not close and give focus back to Rooms`);
  }

  // The village level draws what it has earned: this learner is past level 2, so the plaza lanterns hang.
  ok(await waitFor(`document.querySelectorAll('.cw-treasure--lanterns').length === 4`), 'the plaza lanterns are not drawn for a level-2 village');
  // Each house grows with its own section (src/home/houses.js): Chai's library (sixteen right answers, stage 2) has its lamps and windows lit; new Ginger's workshop is still dark.
  ok(await ev(`(() => { const g = JSON.parse(document.querySelector('.cw').__village.grown() || '{}'); const on = (h, k) => [...document.querySelectorAll('.cw-glow--' + k + '[data-house="' + h + '"]')].filter((e) => !e.classList.contains('is-off')).length; return g.chai >= 2 && g.ginger === 0 && on('chai', 'win') >= 4 && on('chai', 'lamp') >= 1 && on('ginger', 'win') === 0 && on('ginger', 'lamp') === 0; })()`), "the houses do not show how far each section has come");
  ok(await ev(`document.querySelectorAll('.pet .rig__foot').length === 16`), 'the friends should walk on two feet each');

  // Each friend grows with their subject and wears it: this learner's Chai has questions right, so is past stage 1.
  ok(await ev(`[...document.querySelectorAll('.pet')].every((e) => /^\\d+$/.test(e.dataset.stage ?? ''))`), 'every friend should carry its growth stage');
  ok(await ev(`Number(document.querySelector('.pet[data-pet="chai"]').dataset.stage) >= 1 && !!document.querySelector('.pet[data-pet="chai"] .pet-body .gear')`), 'Chai has grown and should be wearing it');

  // A set just finished: every friend runs to the plaza and cheers round the one helped.
  await ev(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); await st.put('sessions', { id: 'cv-party', module: 'ooo', started_at: new Date(Date.now() - 2e5).toISOString(), finished_at: new Date().toISOString(), duration_ms: 18e4, score: { correct: 3, total: 3, accuracy: 1 }, item_ids: [], target_sec: 300, answers: [] }); sessionStorage.removeItem('world:toasted'); return 1; })()`);
  await ev(`location.hash = '#/settings'`);
  await sleep(900);
  await ev(`location.hash = '#/world'`);
  const pc = JSON.parse(await ev(`import('/src/pets/paths.js').then((m) => JSON.stringify(m.NODES.pc))`));
  ok(await waitFor(`(() => { const v = document.querySelector('.cw')?.__village; return !!v && ['toffee', 'chai', 'matcha', 'mochi', 'ginger', 'mallow', 'sesame', 'biscuit'].filter((id) => { const p = v.positionOf(id); return Math.hypot(p.x - ${pc.x}, p.y + 40 - ${pc.y}) < 210; }).length >= 5; })()`, 15000), 'the friends did not gather in the plaza after a finished set');
  ok(await waitFor(`document.querySelectorAll('.pet[data-state="cheer"]').length >= 4`, 8000), 'the friends in the plaza are not cheering');

  // The clock tower is Sesame's home (Para Completion); the rose cottage is Biscuit's (Sentence Placement).
  await tapHouse('sesame');
  ok(await waitFor(`location.hash.startsWith('#/world/place/completion') && /Sesame/.test(document.querySelector('.rm__title b')?.textContent ?? '')`, 10000), "the clock tower did not walk straight into Sesame's room");
  await ev(`location.hash = '#/world'`);
  ok(await waitFor(`!!document.querySelector('[data-spot="biscuit"]')`), 'the village did not come back');
  await sleep(600);
  await tapHouse('biscuit');
  ok(await waitFor(`location.hash.startsWith('#/world/place/placement') && /Biscuit/.test(document.querySelector('.rm__title b')?.textContent ?? '')`, 10000), "the rose cottage did not walk straight into Biscuit's room");

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
  ok(await ev(`[...document.querySelectorAll('.cw-tree__canopy')].every((t) => t.getAnimations().every((a) => a.playState !== 'running'))`), 'the oaks swayed with reduced motion on');
  ok(await ev(`!document.querySelector('.cw-water')`), 'water animation mounted with reduced motion on');
  ok(await ev(`!document.querySelector('.pet .prop')`), 'a friend started a chore with reduced motion on');
  ok(await ev(`document.documentElement.scrollWidth <= innerWidth`), 'the phone village scrolls sideways');
  ok(await ev(`window.__catos.errors.length === 0`), 'browser errors: ' + await ev(`JSON.stringify(window.__catos.errors)`));

  // The larger world must not shrink touch targets on a short Android phone.
  for (const [width, height] of [[320, 568], [360, 740], [390, 844], [844, 390]]) {
    await browser.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    await sleep(200);
    ok(await ev(`document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('.pet, .cw-spot')].every(e => { const r=e.getBoundingClientRect(); return r.width >= 43.9 && r.height >= 43.9; })`), `touch targets shrank or the page overflowed at ${width}×${height}`);
    ok(await ev(`['.cw-play','.cw-side--l','.cw-side--r'].every(s => {const r=document.querySelector(s).getBoundingClientRect();return r.left>=0 && r.top>=0 && r.right<=innerWidth+1 && r.bottom<=innerHeight+1;})`), `the dock is clipped at ${width}×${height}`);
  }
  ok(await ev(`document.querySelectorAll('.cw-scene .cw-house[data-ready]').length === 8`), 'the houses did not bake with reduced motion on');

  // The first visit: one line from Toffee, and PLAY is ready at once.
  await ev(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); await st.delete('settings', 'valley'); await st.put('settings', { id: 'motion', value: 'full' }); return 1; })()`);
  await browser.open(`${server.url}#/world`, 1500);
  ok(await waitFor(`document.querySelector('.cw')?.classList.contains('is-pointing')`), 'a first visit should point at PLAY');
  ok(await ev(`document.querySelector('.cw-play').getAttribute('href') === '#/duel' && getComputedStyle(document.querySelector('.cw-play')).pointerEvents !== 'none' && Number(getComputedStyle(document.querySelector('.cw-dock')).opacity) > 0.9`), 'PLAY is not ready on a first visit');

  // A wide screen: the card sits on the right, clear of the map's centre.
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await browser.open(`${server.url}#/world`, 2000);
  await ev(`document.querySelector('[data-open="friends"]').click()`);
  ok(await waitFor(`document.querySelector('.cw-card')?.getBoundingClientRect().left > 900`), 'the desktop card should sit on the right');

  if (!quick) {
    await browser.send('Network.setBypassServiceWorker', { bypass: false });
    await browser.send('Page.navigate', { url: `${server.url}?offline-check=1#/world` });
    ok(await waitFor(`!!navigator.serviceWorker.controller`, 60000), 'the service worker did not take control');
    ok(await waitFor(`Promise.all([${JSON.stringify(ART_FILES.terrain)}, ${JSON.stringify(STILL.src)}, ${JSON.stringify(HOUSES.chai.file)}, ${JSON.stringify(ART_FILES.mechanisms)}, ${JSON.stringify(ART_FILES.water)}, './src/home/mechanisms.js', './assets/art/pet-chai.png'].map((u) => caches.match(u))).then((r) => r.every(Boolean))`, 30000), 'the valley, its houses, moving parts, water and friends must be cached for offline');
    await browser.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
    await browser.send('Page.reload', { ignoreCache: false });
    ok(await waitFor(`document.querySelectorAll('.cw .pet').length === 8 && !!document.querySelector('.cw-art')?.naturalWidth`, 20000), 'the village did not reopen offline');
  }
  console.log(`check-village: ${checks} checks passed`);
} catch (err) {
  console.error('check-village FAIL:', err.message);
  process.exitCode = 1;
} finally { browser.close(); server.close(); }
process.exit(process.exitCode || 0);
