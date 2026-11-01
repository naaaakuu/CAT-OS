/** Real browser checks for Chai's room. Uses an isolated browser profile. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findChrome, launchChrome, serveRepo } from './cdp-lite.mjs';

if (!findChrome()) { console.log('SKIPPED: library requires Chrome'); process.exit(0); }
const server = await serveRepo();
const page = await launchChrome({ width: 390, height: 844 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const room = '#/world/place/reading-room';
const shots = process.env.CATOS_LIBRARY_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const ok = (value, message) => { if (!value) throw new Error(message); console.log('PASS ' + message); };
const waitFor = async (expr, timeout = 10000) => {
  const end = Date.now() + timeout;
  do { if (await page.evaluate(expr)) return true; await sleep(120); } while (Date.now() < end);
  return false;
};
const shot = async (name) => { if (shots) writeFileSync(join(shots, name + '.png'), Buffer.from(await page.shot(), 'base64')); };
const tap = async (selector) => {
  // A real scroll/touch cancels the arrival camera. Cancel it before this
  // test's programmatic scroll too, so the target cannot move mid-tap.
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape' });
  const p = await page.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:'nearest', inline:'nearest', behavior:'instant'}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; })()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...p });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...p });
};
const seed = async (count, perfect = false) => page.evaluate(`(async () => {
  const {IndexedDBAdapter} = await import('/src/core/storage/indexeddb-adapter.js');
  const st = new IndexedDBAdapter(); await st.init();
  const {listRCItems} = await import('/src/core/content-loader/loader.js');
  const {libraryShelves} = await import('/src/core/learning/journey.js');
  const books = libraryShelves(await listRCItems(), []).shelves.flatMap(s=>s.books);
  for (const b of books.slice(0, ${count})) {
    const i=books.indexOf(b), correct=${perfect}?3:i%3===0?3:i%3===1?1:0;
    const at=new Date(Date.now()-600000+i*1000).toISOString();
    await st.put('sessions',{id:'library-check-'+b.id, passage_id:b.id, started_at:at, finished_at:at, duration_sec:180, stars:1, score:{correct,total:3,accuracy:correct/3},answers:[]});
  }
  return books.map(b=>b.id);
})()`);
const reopen = async () => {
  await page.open(server.url + room, 1800);
  ok(await waitFor(`!!document.querySelector('.lib__owl-touch')`), 'library renders');
};

try {
  await page.open(server.url + room, 5000);
  ok(await waitFor(`document.querySelectorAll('.lib__row').length === 5`), 'five shelves render');
  ok(await page.evaluate(`!document.querySelector('.lib__chain, .lib__padlock') && document.querySelectorAll('.lib__lock').length === 4`), 'fresh library has four subtle locks and no chains');
  ok(await page.evaluate(`new Set([...document.querySelectorAll('.lib__row')].map(r=>r.querySelector('.bk').style.getPropertyValue('--c'))).size === 5`), 'each level has different bindings');
  ok(await page.evaluate(`document.documentElement.scrollWidth === innerWidth && document.documentElement.scrollHeight <= innerHeight + 1`), 'fresh mobile room fits without overflow');
  await shot('fresh-390');
  await tap('.lib__owl-touch');
  ok(await waitFor(`document.querySelector('#lib-live').textContent.includes('saved book')`), 'a real tap on Chai offers guidance');
  ok(await waitFor(`document.querySelector('.lib__owl.is-reading')`, 19000), 'Chai settles down to read');
  ok(await waitFor(`document.querySelector('.lib__owl.is-sleeping')`, 27000), 'idle Chai falls asleep');
  await tap('.lib__owl-touch');
  ok(await page.evaluate(`!document.querySelector('.lib__owl.is-sleeping')`), 'tapping Chai wakes him');
  await tap('.lib__row[data-stage="developing"] .bk');
  ok(await page.evaluate(`location.hash === ${JSON.stringify(room)} && document.querySelector('#lib-live').textContent.includes('Foundation')`), 'locked books explain the milestone without navigating');
  const ids = await seed(10);
  await reopen();
  ok(await page.evaluate(`document.querySelectorAll('.bk.is-read').length===10 && document.querySelectorAll('.bk.is-gleaming').length===4 && !!document.querySelector('.lib__row[data-stage="developing"].is-locked')`), 'read ribbons, golden spines and pre-unlock state match saved results');
  ok(await page.evaluate(`document.querySelector('.lib__milestone').textContent.startsWith('1 more Foundation book ')`), 'next milestone counts down to one');
  await shot('progress-390');
  await seed(11);
  await reopen();
  ok(await waitFor(`!document.querySelector('.lib__row[data-stage="developing"].is-locked')`, 15000), 'returning from the threshold book unlocks Developing');
  ok(await page.evaluate(`!!document.querySelector('.lib__row[data-stage="developing"] .bk[href]') && !document.querySelector('.lib__row[data-stage="developing"] .lib__lock')`), 'unlocked books are real links and lose their lock');
  await sleep(3000);
  await shot('unlocked-390');
  await seed(22);
  await reopen();
  ok(await page.evaluate(`!!document.querySelector('.lib__row[data-stage="foundation"] .lib__reward')`), 'finishing a shelf earns its decoration');
  await tap('.lib__find');
  ok(await page.evaluate(`document.activeElement.classList.contains('is-next')`), 'Find my book focuses the next passage');
  await sleep(900);
  await shot('restored-390');
  await tap('.bk.is-next');
  ok(await waitFor(`location.hash.startsWith('#/rc/session/') && !!document.querySelector('#begin')`), 'a real book tap opens a playable passage');
  await reopen();
  await page.send('Emulation.setDeviceMetricsOverride', {width:320,height:568,deviceScaleFactor:1,mobile:true});
  await tap('.lib__find');
  await sleep(900);
  ok(await page.evaluate(`location.hash === ${JSON.stringify(room)} && !document.querySelector('.lib-open')`), 'Find my book on a small phone stays in the library');
  ok(await page.evaluate(`document.documentElement.scrollWidth===innerWidth && document.querySelector('.lib__head').getBoundingClientRect().width<=innerWidth`), 'small phone has no sideways page overflow');
  ok(await page.evaluate(`(() => { const r=document.querySelector('#back').getBoundingClientRect(); return r.top>=0 && r.bottom<innerHeight; })()`), 'Village control stays visible after scrolling a small phone');
  await shot('small-320');
  await page.send('Emulation.setDeviceMetricsOverride', {width:1280,height:900,deviceScaleFactor:1,mobile:false});
  await page.evaluate('window.scrollTo({top:0,behavior:"instant"})');
  await sleep(500);
  await shot('desktop-1280');
  await page.send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await seed(ids.length);
  await page.send('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await reopen();
  ok(await page.evaluate(`!document.querySelector('.lib__row.is-locked') && document.querySelectorAll('.lib__reward').length===5 && document.querySelector('.lib__milestone').textContent.includes('Every shelf restored')`), 'fully read library has five keepsakes and no stale unlock message');
  ok(await page.evaluate(`getComputedStyle(document.querySelector('.lib__halo')).animationName==='none'`), 'system reduced-motion preference stops ambient animation');
  await shot('complete-390');
  await seed(ids.length, true);
  await reopen();
  ok(await page.evaluate(`!document.querySelector('.bk.is-next') && document.querySelector('.lib__find').textContent.includes('Visit Chai') && document.querySelectorAll('.bk.is-gleaming').length===${ids.length}`), 'fully golden library has no stale next book');
  await tap('.lib__find');
  ok(await page.evaluate(`document.activeElement.classList.contains('lib__owl-touch')`), 'completed-library action reaches Chai');
  console.log('Library interaction and layout checks passed.');
} catch (error) {
  console.error(await page.evaluate(`({hash:location.hash, text:document.body.innerText.slice(-1800)})`));
  await shot('failure');
  console.error(error);
  process.exitCode = 1;
} finally { page.close(); server.close(); }
process.exit(process.exitCode || 0);
