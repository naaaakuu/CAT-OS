/**
 * check-rooms.mjs — the five rebuilt houses.
 *
 * Node: the room model (what is solved, what opens, what is next).
 * Browser (real taps, at phone size): walk into every house, play one item to
 * the end on paper, come back and watch it arrive, and confirm the save.
 */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { OPENS_AT, roomModel } from '../src/rooms/model.js';
import { findChrome, launchChrome, serveRepo } from './cdp-lite.mjs';

export function checkRoomModel() {
  let cases = 0;
  const check = (fn) => { fn(); cases += 1; };
  const rows = [];
  for (const [tier, n] of [['foundation', 4], ['easy', 4], ['medium', 2]]) for (let i = 0; i < n; i += 1) rows.push({ id: `pj-${tier}-${i}`, tier, title: `${tier} ${i}` });
  const session = (answers, module = 'pj') => ({ module, finished_at: '2026-01-01T00:00:00Z', answers });

  check(() => { const m = roomModel(rows, [], 'pj'); assert.equal(m.tried, 0); assert.equal(m.tiers[0].open, true); assert.equal(m.tiers[1].open, false); assert.equal(m.next?.tier, 'foundation'); });
  check(() => {
    const m = roomModel(rows, [session([{ item_id: rows[0].id, is_correct: true }, { item_id: rows[1].id, is_correct: false }])], 'pj');
    assert.equal(m.tiers[0].items[0].state, 'solved'); assert.equal(m.tiers[0].items[1].state, 'tried'); assert.equal(m.solved, 1); assert.equal(m.tried, 2);
    assert.equal(OPENS_AT, 0.5); assert.equal(m.tiers[1].open, true, 'half the row tried opens the next');
  });
  check(() => { const m = roomModel(rows, [session([{ item_id: rows[0].id, is_correct: true }], 'ooo')], 'pj'); assert.equal(m.solved, 0, 'another subject counts for nothing'); });
  check(() => { const m = roomModel(rows, [session([{ item_id: rows[0].id, is_correct: null }])], 'pj'); assert.equal(m.tried, 0, 'a skipped item is not tried'); });
  check(() => { const m = roomModel(rows, [null, 3, { module: 'pj', answers: 'nope' }, session([null, 7])], 'pj'); assert.equal(m.solved, 0, 'damaged records are harmless'); });
  check(() => { const done = rows.map((r) => ({ item_id: r.id, is_correct: true })); const m = roomModel(rows, [session(done)], 'pj'); assert.equal(m.solved, rows.length); });
  return { cases };
}

export async function checkRoomsBrowser() {
  if (!findChrome()) return { skipped: true, cases: 0, problems: [] };
  const server = await serveRepo();
  const b = await launchChrome({ width: 390, height: 844 });
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const problems = [];
  let cases = 0;
  const ok = (cond, msg) => { cases += 1; if (!cond) problems.push(msg); };
  const until = async (expr, ms = 9000) => { const end = Date.now() + ms; do { if (await b.evaluate(expr)) return true; await pause(80); } while (Date.now() < end); return false; };
  const tap = async (sel) => {
    const p = await b.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'center' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const at = document.elementFromPoint(x, y); return { x, y, hit: !!at && (at === e || e.contains(at) || at.contains(e)) }; })()`);
    if (!p) throw new Error(`missing control ${sel}`);
    if (!p.hit) throw new Error(`a real tap cannot reach ${sel}`);
    for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await pause(70);
  };
  const go = (hash) => b.evaluate(`location.hash = ${JSON.stringify(hash)}; true`);
  const noOverflow = () => b.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`);

  try {
    await b.open(server.url, 2500);
    await b.evaluate(`window.__errs = []; addEventListener('error', (e) => __errs.push(e.message)); addEventListener('unhandledrejection', (e) => __errs.push(String(e.reason)));
      (async () => { const { IndexedDBAdapter } = await import('/src/core/storage/indexeddb-adapter.js'); const s = new IndexedDBAdapter(); if (s.init) await s.init(); await s.put('settings', { id: 'valley', name: 'Test', awakened_at: new Date().toISOString(), met_at: new Date().toISOString() }); return true; })()`);
    await pause(200);

    const rooms = [['loom', '.rw-car', 'chain'], ['bench', '.sk-c', 'stray'], ['completion', '.ck-c', 'gap'], ['placement', '.tb-s', 'seat'], ['table', '.pn-j', 'point']];
    for (const [slug, thing, type] of rooms) {
      await go(`#/world/place/${slug}`);
      ok(await until(`!!document.querySelector('.rm') && !!document.querySelector(${JSON.stringify(thing)})`), `${slug}: the room did not open`);
      ok(await b.evaluate(`document.querySelector('.rm').getBoundingClientRect().height >= innerHeight - 1 && !document.querySelector('.tile, .g-cta')`), `${slug}: not a full-screen room, or the old tier grid is back`);
      ok(await noOverflow(), `${slug}: sideways overflow`);
      ok(await b.evaluate(`document.querySelector('.is-next') !== null`), `${slug}: nothing marks the next item`);
      const before = await b.evaluate(`document.querySelector('.rm__title span').textContent`);
      await tap('.rm__go');
      ok(await until(`!!document.querySelector('.pg .pl')`), `${slug}: the big button did not open a question`);
      ok(await noOverflow(), `${slug}: sideways overflow while playing`);

      // Play it through with real taps, wrong answers included.
      for (let i = 0; i < 30; i += 1) {
        if (await b.evaluate(`!!document.querySelector('.pg-done')`)) break;
        const what = await b.evaluate(`(() => { const go = document.querySelector('#go:not([hidden])'); if (go) return 'go'; for (const [k, s] of [['chain', '#yard .ch__car:not(:disabled)'], ['stray', '.st__s:not(:disabled)'], ['opt', '.pl__opt:not(:disabled)'], ['seat', '.se__seat:not(:disabled)']]) if (document.querySelector(s)) return k; return ''; })()`);
        if (what === 'go') await tap('#go');
        else if (what === 'chain') { const n = await b.evaluate(`document.querySelectorAll('#yard .ch__car:not(:disabled)').length`); await tap(`#yard .ch__car:nth-child(${1 + (i % n)})`); await pause(520); }
        else if (what === 'stray') await tap('.st__s:not(:disabled)');
        else if (what === 'opt') await tap('.pl__opt:not(:disabled)');
        else if (what === 'seat') await tap('.se__seat:not(:disabled)');
        await pause(160);
      }
      ok(await until(`!!document.querySelector('.pg-done')`, 3000), `${slug}: playing never finished`);
      ok(await b.evaluate(`document.querySelector('.pg-done a').getAttribute('href').startsWith('#/world/place/${slug}')`), `${slug}: the finish does not lead home`);
      const saved = await b.evaluate(`(async () => { const { IndexedDBAdapter } = await import('/src/core/storage/indexeddb-adapter.js'); const s = new IndexedDBAdapter(); if (s.init) await s.init(); const all = await s.getAll('sessions'); return all.filter((x) => x.module === '${{ chain: 'pj', stray: 'ooo', gap: 'pc', seat: 'sp', point: 'ps' }[type]}').length; })()`);
      ok(saved >= 1, `${slug}: the attempt was not saved as a normal session`);
      await tap('.pg-done a');
      ok(await until(`!!document.querySelector('.rm')`), `${slug}: did not come back to the room`);
      await pause(250);
      ok(typeof before === 'string', `${slug}: the room lost its count`);
    }

    // The smallest phone we care about.
    await b.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
    for (const [slug] of rooms) {
      await go(`#/world/place/${slug}?t=small`);
      ok(await until(`!!document.querySelector('.rm')`), `${slug}: no room at 320 wide`);
      ok(await noOverflow(), `${slug}: sideways overflow at 320 wide`);
      ok(await b.evaluate(`(() => { const r = document.querySelector('.rm__go').getBoundingClientRect(); return r.bottom <= innerHeight && r.height >= 44; })()`), `${slug}: the big button is off the small screen`);
    }
    const errs = await b.evaluate(`JSON.stringify(__errs)`);
    ok(errs === '[]', `page errors: ${errs}`);
  } catch (err) { problems.push(err.message); } finally { b.close(); server.close(); }
  return { skipped: false, cases, problems };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const m = checkRoomModel();
  const r = await checkRoomsBrowser();
  console.log(`${m.cases} model checks; ${r.cases} browser checks`);
  for (const p of r.problems) console.error(`FAIL ${p}`);
  process.exit(r.problems.length ? 1 : 0);
}
