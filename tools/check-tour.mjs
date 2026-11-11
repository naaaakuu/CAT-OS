/**
 * check-tour.mjs — the valley tour, in a real browser, as a learner meets it.
 *
 *   - a new learner sees 0 of 8 homes and a seal over the library's plate
 *   - walking into a home and back (a real tap, a deep link) seals nothing
 *   - three real plays in Ginger's railway seal it: the top bar, the plate, the card and the room agree
 *   - the same plays made inside a duel's time seal nothing
 *   - the hearth stays closed with homes missing; every strand played starts tour 2
 *   - reloading changes nothing (no seal is stored: they are read from the records)
 *
 *   node tools/check-tour.mjs
 */
import { serveRepo, launchChrome, findChrome } from './cdp-lite.mjs';

if (!findChrome()) { console.log('SKIPPED: no Chrome'); process.exit(0); }
const server = await serveRepo();
const browser = await launchChrome({ width: 390, height: 844 });
let checks = 0;
const ok = (c, m) => { if (!c) throw new Error(m); checks += 1; };
const ev = (x) => browser.evaluate(x);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (expr, ms = 15000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await ev(expr)) return true; await sleep(150); } return false; };

/** Put records straight into the learner's IndexedDB (the same stores the rooms write). */
const put = (store, recs) => ev(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); for (const r of ${JSON.stringify(recs)}) await st.put('${store}', r); return 1; })()`);
const iso = (minAgo) => new Date(Date.now() - minAgo * 60e3).toISOString();
const play = (module, item, minAgo, extra = {}) => ({ id: `tour-${module}-${item}-${minAgo}`, module, passage_id: item, item_ids: [item], started_at: iso(minAgo + 1), finished_at: iso(minAgo), duration_ms: 6e4, score: { correct: 1, total: 1, accuracy: 1 }, answers: [{ question_id: item, item_id: item, is_correct: true, time_ms: 30000 }], ...extra });
const chip = () => ev(`document.querySelector('.cw-chip--tour')?.textContent.replace(/\\s+/g, '')`);
const nextPlate = () => ev(`document.querySelector('.cw-plate.is-next')?.dataset.spot ?? null`);
const village = async () => { await ev(`location.hash = '#/settings'`); await sleep(500); await ev(`location.hash = '#/world'`); ok(await waitFor(`!!document.querySelector('.cw-chip--tour b')`), 'the village did not come back'); };

try {
  await browser.open(`${server.url}#/settings`, 2500);
  await ev(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); for (const store of ['sessions', 'learning']) for (const r of await st.getAll(store)) await st.delete(store, r.id); await st.put('settings', { id: 'valley', value: { name: 'Tourfield', awakened_at: new Date(Date.now() - 9e8).toISOString(), met_at: new Date(Date.now() - 9e8).toISOString() } }); localStorage.setItem('catos:met-gang', '1'); localStorage.setItem('catos:hour', 'afternoon'); return 1; })()`);
  await browser.open(`${server.url}#/world`, 2000);
  ok(await waitFor(`!!document.querySelector('.cw-chip--tour b')`), 'the village has no tour chip');
  ok(await chip() === '0/8' && await nextPlate() === 'chai', `a new learner should see 0/8 and the library next (saw ${await chip()}, next ${await nextPlate()})`);

  // A visit is not a seal: a real tap into the railway and straight back, and a deep link.
  await ev(`document.querySelector('.cw').__village.look(${291}, ${760})`);
  await sleep(200);
  const p = await ev(`(() => { const r = document.querySelector('.cw-spot[data-spot="ginger"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  await browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
  ok(await waitFor(`location.hash.startsWith('#/world/place/loom') && !!document.querySelector('.rm__title .tour-seal')`), 'tapping the railway did not walk into the room, or the room has no tour line');
  ok(/0 of 3 played/.test(await ev(`document.querySelector('.rm__title .tour-seal').textContent`)), 'the railway should say its seal is 0 of 3 played');
  await ev(`location.hash = '#/world/place/bench'`);
  await sleep(1500);
  await village();
  ok(await chip() === '0/8', 'visiting rooms sealed something');

  // Three real plays in the railway seal it, and everyone says so.
  await put('sessions', [play('pj', 'pj-0001', 30), play('pj', 'pj-0002', 25), play('pj', 'pj-0003', 20)]);
  await village();
  ok(await chip() === '1/8', `three trains coupled in the railway should seal it (saw ${await chip()})`);
  await ev(`document.querySelector('[data-open="tour"]').click()`);
  ok(await waitFor(`document.querySelectorAll('.cw-tour > li.is-sealed').length === 1 && /Ginger/.test(document.querySelector('.cw-tour > li.is-sealed').textContent) && document.querySelectorAll('.cw-tour > li').length === 8`), 'the tour card should list eight homes with the railway sealed');
  await ev(`document.querySelector('.cw-card [data-close]').click()`);
  await ev(`location.hash = '#/world/place/loom'`);
  ok(await waitFor(`/Sealed on tour 1/.test(document.querySelector('.rm__title .tour-seal')?.textContent ?? '')`), 'the railway room should say it is sealed');

  // The same plays inside a duel's time seal nothing.
  const t0 = Date.now() - 60 * 60e3; // an hour ago, clear of every real play seeded below
  await put('learning', [{ id: 'tour-duel', kind: 'duel', module: 'duel', started_at: new Date(t0).toISOString(), finished_at: new Date(t0 + 4 * 60e3).toISOString(), won: true, answers: [{ kind: 'decode', correct: true }] }]);
  await put('sessions', [1, 2, 3].map((k) => ({ ...play('ooo', `ooo-000${k}`, 0), id: `tour-duel-ooo-${k}`, started_at: new Date(t0 + k * 50e3).toISOString(), finished_at: new Date(t0 + k * 50e3 + 20e3).toISOString() })));
  await village();
  ok(await chip() === '1/8', 'odd ones out found in a duel sealed the observatory');

  // The hearth stays closed with homes missing; then every strand: tour 2.
  await ev(`document.querySelector('[data-open="tour"]').click()`);
  ok(await waitFor(`/Opens when the seven other homes are sealed/.test(document.querySelector('.cw-tour > li:last-child')?.textContent ?? '')`), 'the hearth should say it opens after the seven other seals');
  await ev(`document.querySelector('.cw-card [data-close]').click()`);
  await put('sessions', [
    { id: 'tour-rc', passage_id: 'rc-0040', started_at: iso(19), finished_at: iso(18), duration_ms: 3e5, score: { correct: 3, total: 4, accuracy: 0.75 }, answers: [{ question_id: 'rc-0040-q1', is_correct: true }] },
    { ...play('cr', 'cr-0001', 17), set_id: 'cr-set:cr-0001' }, play('wd', 'wd-0001', 16),
    ...['ooo', 'ps', 'sp', 'pc'].flatMap((m, i) => [1, 2, 3].map((k) => play(m, `${m}-010${k}`, 14 - i * 2 - k * 0.3))),
  ]);
  await put('learning', [
    { id: 'tour-gh', kind: 'lex-round', region: 'meadow', greenhouse: true, started_at: iso(12), finished_at: iso(11), answers: [{ correct: true }], score: { correct: 10, total: 10 } },
    { id: 'tour-pond', kind: 'lex-round', region: 'pond', started_at: iso(10.5), finished_at: iso(10), answers: [{ correct: true }], score: { correct: 9, total: 12 } },
    { id: 'tour-thicket', kind: 'lex-round', region: 'thicket', started_at: iso(9.5), finished_at: iso(9), answers: [{ correct: true }], score: { correct: 9, total: 12 } },
    { id: 'tour-root', kind: 'garden-session', module: 'lg', family_id: 'f-1', finished_at: iso(8) },
  ]);
  await village();
  ok(await chip() === '7/8' && await nextPlate() === 'toffee', `every home but the hearth should be sealed, the hearth next (saw ${await chip()}, next ${await nextPlate()})`);
  await put('learning', [{ id: 'tour-g', kind: 'gauntlet-run', module: 'world', week: '2026-W46', stars: 2, score: { answered: 25, total: 30, correct: 22 }, finished_at: iso(2), answers: [{ correct: true }] }]);
  await village();
  ok(await chip() === '0/8' && await nextPlate() === 'chai', `a starred Gauntlet after the seven seals should finish the tour and start the next (saw ${await chip()})`);
  await ev(`document.querySelector('[data-open="tour"]').click()`);
  ok(await waitFor(`/tour 2/.test(document.querySelector('.cw-card .cw-eyebrow')?.textContent ?? '')`), 'the card should say this is tour 2');

  // Nothing is stored: a reload reads the same tour from the records.
  await browser.open(`${server.url}#/world`, 2000);
  ok(await waitFor(`document.querySelector('.cw-chip--tour')?.textContent.replace(/\\s+/g, '') === '0/8'`), 'a reload changed the tour');
  ok(await ev(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); const all = [...await st.getAll('settings'), ...await st.getAll('learning')]; return !all.some((r) => /seal|tour/i.test(String(r.id)) && !/^tour-/.test(String(r.id))); })()`), 'a tour or seal record was stored');
  ok(await ev(`window.__catos?.errors?.length === 0`), 'browser errors: ' + await ev(`JSON.stringify(window.__catos?.errors)`));
  console.log(`check-tour: ${checks} checks passed`);
} catch (err) {
  console.error('check-tour FAIL:', err.message);
  process.exitCode = 1;
} finally { browser.close(); server.close(); }
process.exit(process.exitCode || 0);
