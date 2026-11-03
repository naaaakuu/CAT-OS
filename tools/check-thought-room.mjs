/** Progress regressions for Mochi's room. No browser or content bank needed. */
import assert from 'node:assert/strict';
import { thoughtRoom, THOUGHT_ZONES } from '../src/modules/para-summary/logic/room.js';
import { thoughtRoomArt, bloomPose } from '../src/world/screens/thought-room-art.js';
import { findChrome, launchChrome, serveRepo } from './cdp-lite.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function checkThoughtRoom() {
  let cases = 0;
  const check = (fn) => { fn(); cases++; };
  const items = THOUGHT_ZONES.flatMap((z, i) => [0, 1, 2].map((n) => ({ id: `ps-${String(i * 3 + n + 1).padStart(4, '0')}`, tier: z.tier })));
  const session = (answers, module = 'ps') => ({ module, answers });
  const right = (it) => ({ item_id: it.id, is_correct: true });
  const fresh = thoughtRoom(items, []);
  check(() => { assert.equal(fresh.done, 0); assert.equal(fresh.total, 24); assert.equal(fresh.percent, 0); assert.equal(fresh.zones.length, 8); });
  check(() => { const m = thoughtRoom(items, [session([right(items[0]), right(items[0])])]); assert.equal(m.done, 1); assert.equal(m.zones[0].done, 1); assert.equal(m.percent, 4); });
  check(() => { const m = thoughtRoom(items, [session([right(items[0])]), session([{ item_id: items[0].id, is_correct: false }])]); assert.equal(m.done, 1); assert.equal(m.tried.size, 1); });
  check(() => { const m = thoughtRoom(items, [session([right(items[0])], 'pj'), session([{ item_id: 'ps-9999', is_correct: true }, { item_id: items[1].id, is_correct: null }, { item_id: items[2].id, is_correct: 'true' }])]); assert.equal(m.done, 0); assert.equal(m.tried.size, 0); });
  check(() => { const m = thoughtRoom(items, [session([{ question_id: items[0].id, is_correct: true }])]); assert.equal(m.done, 1); });
  check(() => { const m = thoughtRoom(items, [session(items.slice(0, 3).map(right))]); assert.equal(m.zones[0].complete, true); assert.equal(m.zones.filter((z) => z.complete).length, 1); assert.equal(m.zones[1].clean, 0); });
  check(() => { const m = thoughtRoom(items, [session(items.map(right))]); assert.equal(m.percent, 100); assert.equal(m.mood, 'Eight worlds in full bloom'); assert(m.zones.every((z) => z.complete)); });
  check(() => { const m = thoughtRoom(); assert.equal(m.clean, 0); assert.equal(m.percent, 0); assert(m.zones.every((z) => !z.complete)); });
  check(() => { const m = thoughtRoom(items, [null, {}, session(null), session({ bad: true }), session([null, {}, { item_id: items[0].id }])]); assert.equal(m.done, 0); });
  check(() => { const m = thoughtRoom(items, [session(items.map(right))]); const extended = thoughtRoom([...items, { id: 'ps-0100', tier: 'foundation' }], [session(items.map(right))]); assert.equal(m.done, extended.done); assert(extended.percent < 100); });
  check(() => { const many = Array.from({ length: 1001 }, (_, i) => ({ id: `p-${i}`, tier: 'foundation' })); const m = thoughtRoom(many, [session(many.slice(1).map(right))]); assert.equal(m.percent, 99); });
  check(() => { const art = fresh.zones.map((z) => thoughtRoomArt(fresh, fresh.solved, z.tier)).join(''); assert.equal((art.match(/data-bloom=/g) ?? []).length, items.length); assert.equal((art.match(/data-art-zone=/g) ?? []).length, 8); assert.equal(new Set([...art.matchAll(/data-bloom="([^"]+)"/g)].map((m) => m[1])).size, items.length); assert(!art.includes('data-paper=')); });
  check(() => { assert.deepEqual(bloomPose(2), bloomPose(2)); assert.notDeepEqual(bloomPose(2), bloomPose(3)); assert(Number.isFinite(bloomPose(100).x)); });
  return { cases };
}

export async function checkThoughtRoomBrowser() {
  if (!findChrome()) return { skipped:true, cases:0, problems:[] };
  const server = await serveRepo();
  const b = await launchChrome({width:390,height:844});
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const room = '#/world/place/table';
  const problems = []; let cases = 0;
  const shots = process.env.CATOS_MOCHI_SHOTS;
  if (shots) mkdirSync(shots, {recursive:true});
  const shot = async (name) => { if (shots) { const {data} = await b.send('Page.captureScreenshot', {format:'jpeg',quality:88}); writeFileSync(join(shots,name+'.jpg'),Buffer.from(data,'base64')); } };
  const wait = async (expression) => { const until = Date.now()+12000; do { if (await b.evaluate(expression)) return; await pause(90); } while (Date.now()<until); throw new Error('Did not reach '+expression); };
  const tap = async (selector) => {
    const p = await b.evaluate(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e)throw new Error('Missing control'); e.scrollIntoView({block:'center',inline:'center',behavior:'instant'}); const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,hit=document.elementFromPoint(x,y); return {x,y,ok:!e.disabled && (hit===e||e.contains(hit))}; })()`);
    assert(p.ok, 'Real tap cannot reach '+selector);
    for (const type of ['mousePressed','mouseReleased']) await b.send('Input.dispatchMouseEvent',{type,x:p.x,y:p.y,button:'left',clickCount:1});
    await pause(80);
  };
  const goto = async (hash, selector = '.thought-house') => { await b.evaluate(`location.hash=${JSON.stringify(hash)}`); await wait(`!!document.querySelector(${JSON.stringify(selector)})`); };
  const check = async (name, fn) => { try { await fn(); cases++; console.log('  ok '+name); } catch(e) { problems.push(name+': '+e.message); console.log('  !! '+problems.at(-1)); await shot('failure-'+cases); } };
  try {
    await b.open(server.url+'#/settings',1800);
    await b.evaluate(`(async()=>{ const {IndexedDBAdapter}=await import('/src/core/storage/indexeddb-adapter.js'); const s=new IndexedDBAdapter(); await s.init(); await s.put('settings',{id:'valley',value:{name:'Ashfield',awakened_at:new Date().toISOString(),met_at:new Date().toISOString()}}); localStorage.setItem('catos:met-gang','1'); localStorage.setItem('catos:hour','morning'); })()`);
    await goto(room);
    await check('fresh house welcomes visitors with eight open worlds', async()=>{
      assert.equal(await b.evaluate('document.querySelectorAll("[data-zone]").length'),8);
      assert.equal(await b.evaluate('document.querySelectorAll(".thought-bloom.is-grown").length'),0);
      assert(!await b.evaluate('!!document.querySelector("[data-paper],.thought-scraps")'));
      await shot('fresh-390');
    });
    await check('petting, tea, rain, butterfly and fireflies produce visible reactions', async()=>{
      await tap('.thought-mochi'); assert(await b.evaluate('document.querySelector(".thought-house").classList.contains("is-delighted")'));
      await tap('[data-play="tea"]'); assert(await b.evaluate('!!document.querySelector(".is-sipping")'));
      await tap('[data-play="rain"]'); assert.equal(await b.evaluate('document.querySelector("[data-play=rain]").getAttribute("aria-pressed")'),'true');
      await shot('rain-390');
      await tap('[data-play="rain"]'); assert(!await b.evaluate('!!document.querySelector(".is-raining")'));
      await tap('[data-play="lights"]'); assert(await b.evaluate('!!document.querySelector(".is-firefly-time")')); await shot('fireflies-390');
      await tap('[data-play="lights"]');
      await tap('.thought-butterfly'); await wait('!!document.querySelector(".is-befriended")');
      const count = await b.evaluate(`(async()=>{ const {IndexedDBAdapter}=await import('/src/core/storage/indexeddb-adapter.js');const s=new IndexedDBAdapter();await s.init();return (await s.getAll('sessions')).length;})()`);
      assert.equal(count,0,'Play must not generate learning rewards');
    });
    await check('each world changes scenery, skill and playable question', async()=>{
      for (const z of THOUGHT_ZONES) {
        await tap(`[data-zone="${z.tier}"]`);
        assert.equal(await b.evaluate('document.querySelector("#thought-world-name").textContent'),z.name);
        assert.equal(await b.evaluate('document.querySelector("[data-art-zone]").dataset.artZone'),z.tier);
        assert.equal(await b.evaluate('document.querySelectorAll("[data-zone][aria-pressed=true]").length'),1);
        const href=await b.evaluate('document.querySelector(".thought-begin").getAttribute("href")');
        assert(href.startsWith('#/ps/session/ps-'));
      }
      await shot('sunrise-390');
      await tap('[data-zone="foundation"]'); await tap('.thought-world-list');
      assert(await b.evaluate('!document.querySelector("#thought-tray").hidden'));
      assert.equal(await b.evaluate('document.activeElement.id'),'thought-tray-title');
      await tap('.thought-tray__close');
      assert(await b.evaluate('document.activeElement.classList.contains("thought-world-list")'));
    });
    let id, correct;
    await check('direct choices complete, persist and grow a new bloom on return', async()=>{
      id = (await b.evaluate('document.querySelector(".thought-begin").getAttribute("href")')).split('/').at(-1);
      await tap('.thought-begin'); await wait('document.querySelectorAll("cat-option").length===4');
      await wait('getComputedStyle(document.querySelector(".ps-paragraph")).opacity==="1" && getComputedStyle(document.querySelector(".ps-direct-session > .card")).opacity==="1"');
      assert(!await b.evaluate('!!document.querySelector("textarea,#builder-lock,#builder-skip")'));
      correct=await b.evaluate(`import('/src/core/content-loader/loader.js').then(m=>m.loadPSItem(${JSON.stringify(id)})).then(i=>i.question.correct)`);
      await shot('question-390');
      await tap(`cat-option[letter="${correct}"] button`); await tap('#lock'); await wait('!!document.querySelector(".psx-verdict.is-correct")');
      await tap('#next'); await wait('!!document.querySelector(".thought-homecoming")');
      assert((await b.evaluate('document.querySelector(".thought-homecoming").textContent')).includes('new bloom'));
      await tap('.thought-homecoming a'); await wait('!!document.querySelector(".thought-house.is-restoring")');
      assert.equal(await b.evaluate('document.querySelector(".thought-house").dataset.clean'), '1');
      assert.equal(await b.evaluate('document.querySelectorAll(".thought-bloom.is-grown").length'),1);
      await b.evaluate('window.scrollTo({top:0,behavior:"instant"})'); await shot('first-bloom-390');
    });
    await check('a wrong retry cannot remove an earned bloom', async()=>{
      assert(id && correct,'Correct-answer setup did not finish');
      await goto('#/ps/session/'+id,'cat-option');
      const wrong=['A','B','C','D'].find(l=>l!==correct);
      await tap(`cat-option[letter="${wrong}"] button`); await tap('#lock'); await wait('!!document.querySelector(".psx-verdict")');
      await tap('#next'); await wait('!!document.querySelector(".thought-homecoming")');
      await tap('.thought-homecoming a'); await wait('!!document.querySelector(".thought-house")');
      assert.equal(await b.evaluate('document.querySelector(".thought-house").dataset.clean'),'1');
    });
    await check('phone, short screen, landscape and desktop retain reachable controls', async()=>{
      for (const [width,height] of [[320,568],[360,640],[360,360],[844,390],[1280,900]]) {
        await b.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
        await b.evaluate('window.scrollTo({top:0,behavior:"instant"})');
        assert(await b.evaluate('document.documentElement.scrollWidth===innerWidth'),`${width}: page overflow`);
        if(width<600) assert(await b.evaluate('(()=>{const r=document.querySelector(".thought-begin").getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;})()'),`${width}: action not visible`);
        await tap('.thought-mochi'); await tap('[data-play="rain"]');
        await tap('[data-zone="premium"]');
        assert.equal(await b.evaluate('document.querySelector("#thought-world-name").textContent'),'Sunrise Sanctuary');
        const bad=await b.evaluate(`[...document.querySelectorAll('.thought-house button,.thought-house a')].filter(e=>!e.closest('[hidden]')).filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&(r.width<43.5||r.height<43.5)}).map(e=>e.textContent.trim())`);
        assert.deepEqual(bad,[],`${width}: undersized controls`);
        await b.evaluate('window.scrollTo({top:0,behavior:"instant"})'); await shot('layout-'+width+'x'+height);
      }
    });
    await check('full progress welcomes residents and reduced motion stops animation', async()=>{
      await b.evaluate(`(async()=>{ const {IndexedDBAdapter}=await import('/src/core/storage/indexeddb-adapter.js');const s=new IndexedDBAdapter();await s.init();const {listPSItems}=await import('/src/core/content-loader/loader.js');const items=await listPSItems(); const at=new Date().toISOString();await s.put('sessions',{id:'mochi-test-all',module:'ps',passage_id:'ps-test',item_ids:items.map(i=>i.id),started_at:at,finished_at:at,duration_sec:100,stars:3,score:{correct:items.length,total:items.length,accuracy:1},answers:items.map(i=>({item_id:i.id,is_correct:true,chosen:'A'}))}); })()`);
      await b.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
      await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
      await b.open(server.url+room,1400); await wait('!!document.querySelector(".thought-house")');
      assert.equal(await b.evaluate('document.querySelector(".thought-house").dataset.clean'),'100');
      assert.equal(await b.evaluate('document.querySelectorAll(".thought-zone.is-complete").length'),8);
      assert(await b.evaluate('!!document.querySelector(".thought-keepsake.is-earned")'));
      assert.equal(await b.evaluate('getComputedStyle(document.querySelector(".thought-butterfly")).animationName'),'none');
      await shot('complete-390');
    });
  } catch(e) { problems.push('Browser tour: '+e.message); }
  finally { b.close(); server.close(); }
  return {cases,problems};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { cases } = checkThoughtRoom();
  console.log(`PASS ${cases} model checks: unique progress, retries, skips, tiers, completion and stable blooms.`);
  if (!process.argv.includes('--model-only')) {
    const r = await checkThoughtRoomBrowser();
    if (r.skipped) console.log('SKIPPED: no Chrome for Little Worlds browser checks');
    else if (r.problems.length) { console.error(r.problems.join('\n')); process.exitCode=1; }
    else console.log(`PASS ${r.cases} Little Worlds browser checks.`);
  }
}
