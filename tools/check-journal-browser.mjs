import { serveRepo, launchChrome, findChrome } from './cdp-lite.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

if (!findChrome()) { console.log('SKIPPED: no Chrome for journal flow'); process.exit(0); }
const server = await serveRepo();
let browser, checks = 0;
const ok = (value, message) => { if (!value) throw new Error(message); checks++; };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const ev = x => browser.evaluate(x);
async function waitFor(expr) {
  for (let i = 0; i < 100; i++) { if (await ev(expr)) return; await pause(100); }
  throw new Error(`Did not arrive: ${expr}`);
}
async function tap(selector) {
  const point = await ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({block:'nearest'}); const r = el.getBoundingClientRect(); const x=r.left+r.width/2, y=r.top+r.height/2; return el.contains(document.elementFromPoint(x,y)) ? {x,y} : null; })()`);
  if (!point) {
    console.log(await ev(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); const r=el?.getBoundingClientRect(); return {selector:${JSON.stringify(selector)},cover:r?document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.outerHTML:null,parties:document.querySelector('.cw-party')?.outerHTML, root:document.querySelector('.cw')?.className}; })()`));
    const shot=await browser.send('Page.captureScreenshot',{format:'jpeg',quality:85});
    writeFileSync('/private/tmp/catos-journal-failure.jpg',Buffer.from(shot.data,'base64'));
  }
  ok(point, `Control is covered: ${selector}`);
  await browser.send('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...point});
  await browser.send('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,...point});
  await pause(450);
}
try {
  browser = await launchChrome({width:360,height:800});
  await browser.open(`${server.url}#/settings`, 1500);
  await ev(`(async () => { const {IndexedDBAdapter}=await import('/src/core/storage/indexeddb-adapter.js'); window.st = new IndexedDBAdapter(); await st.init(); await st.put('settings',{id:'valley',value:{name:'Journal test',awakened_at:new Date().toISOString(),met_at:new Date().toISOString()}}); localStorage.setItem('catos:met-gang','1'); localStorage.setItem('catos:motion','reduced'); })()`);
  await browser.open(`${server.url}#/world`, 1500);
  await waitFor(`document.querySelector('.cw-journal')?.textContent.includes('Journal')`);
  await tap('.cw-journal');
  await waitFor(`document.querySelector('.cw-card--journal')?.getAttribute('role') === 'dialog'`);
  ok(await ev(`document.querySelector('.j-cover h3').textContent === 'A little light'`), 'New village starts at chapter one');
  ok(await ev(`document.querySelector('.j-reward').textContent.includes('First-light lantern')`), 'Chapter reward is named');
  await tap('[data-j-tab="collection"]');
  ok(await ev(`document.querySelectorAll('.j-keepsake').length === 32 && !document.querySelector('.j-keepsake.is-earned')`), 'New collection has 32 honest locked keepsakes');
  await tap('.j-keepsake summary');
  ok(await ev(`!!document.querySelector('.j-keepsake[open] .j-action')`), 'Keepsake reveals its story and practice action');
  await tap('[data-j-tab="week"]');
  ok(await ev(`document.querySelectorAll('.j-goals li').length === 3 && !document.querySelector('.j-check.is-done')`), 'Weekly expedition has three unearned goals');
  ok(await ev(`document.querySelector('.j-week-date').textContent.includes('New expedition')`), 'Weekly deadline visible');
  ok(await ev(`(async () => { const {dismissTopLayer}=await import('/src/ui/modal.js'); return dismissTopLayer(); })()`), 'Android Back dismisses journal');
  await pause(400);
  ok(await ev(`document.activeElement.matches('.cw-journal')`), 'Journal returns focus to trigger');

  // A real saved session, then navigation: no private UI counter can grant these.
  await ev(`(async () => { const {IndexedDBAdapter}=await import('/src/core/storage/indexeddb-adapter.js'); const st = new IndexedDBAdapter(); await st.init(); const now = Date.now()-1000; await st.put('sessions',{id:'journal-saved-session',module:'pj',finished_at:new Date(now).toISOString(),started_at:new Date(now-90000).toISOString(),duration_ms:90000,score:{correct:6,total:6,accuracy:1},answers:Array.from({length:6},(_,i)=>({item_id:'journal-item-'+i,is_correct:true,time_ms:15000}))}); })()`);
  await browser.open(`${server.url}#/world`, 1500);
  await waitFor(`!!document.querySelector('.cw-journal')`);
  await tap('.cw-journal');
  ok(await ev(`document.querySelector('.j-cover h3').textContent === 'Paths between friends'`), 'Saved learning advances chapter');
  await tap('[data-j-tab="collection"]');
  ok(await ev(`document.querySelectorAll('.j-keepsake.is-earned').length === 2`), 'Saved learning awards chapter gift and friend gift');
  ok(await ev(`document.querySelector('[data-keepsake="ginger-1"]').classList.contains('is-earned')`), 'Correct friend earns gift');

  for (const [width,height] of [[320,640],[360,800],[412,915],[740,360],[1280,800]]) {
    await browser.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
    for (const section of ['journey','collection','week']) {
      await tap(`[data-j-tab="${section}"]`);
      ok(await ev(`!!document.getElementById(document.querySelector('.cw-card').getAttribute('aria-labelledby'))`), 'Journal keeps its accessible name after changing section');
      ok(await ev(`document.querySelector('.cw-card').scrollWidth <= document.querySelector('.cw-card').clientWidth+1`), `${section} fits ${width}x${height}`);
      ok(await ev(`[...document.querySelectorAll('.j-tabs button, .j-page .j-action')].every(e=>e.getBoundingClientRect().height>=44)`), `44px journal controls at ${width}x${height}`);
      if (process.env.CATOS_JOURNAL_SHOTS && width === 360) {
        mkdirSync(process.env.CATOS_JOURNAL_SHOTS,{recursive:true});
        const shot=await browser.send('Page.captureScreenshot',{format:'jpeg',quality:85});
        writeFileSync(`${process.env.CATOS_JOURNAL_SHOTS}/${section}.jpg`,Buffer.from(shot.data,'base64'));
      }
    }
  }
  for (const theme of ['light', 'dark']) {
    await ev(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}`);
    await tap('[data-j-tab="collection"]');
    ok(await ev(`document.querySelector('.cw-card').scrollWidth <= document.querySelector('.cw-card').clientWidth+1`), `Collection fits in ${theme} theme`);
    ok(await ev(`document.querySelectorAll('.j-keepsake.is-earned').length === 2`), `Earned state survives ${theme} theme change`);
  }
  // The journey action starts the recommended unvisited friend, never a dead end.
  await tap('[data-j-tab="journey"]');
  const href = await ev(`document.querySelector('.j-action').getAttribute('href')`);
  await tap('.j-action');
  await waitFor(`!document.querySelector('.cw-card--journal')`);
  ok(await ev(`location.hash === ${JSON.stringify(href)}`), 'Continue journey reaches recommended activity');
  await ev(`sessionStorage.removeItem('world:toasted'); localStorage.setItem('catos:level-seen','1')`);
  await ev(`location.hash = '#/world?journal=1'`);
  await waitFor(`document.querySelector('.cw-card--journal')?.getAttribute('role') === 'dialog'`);
  await pause(8500);
  ok(await ev(`document.querySelector('.cw-overlay').classList.contains('is-open') && document.querySelector('.cw-party').hidden`), 'Celebrations do not interrupt the result-to-journal link');
  await tap('.cw-card [data-close]');
  await waitFor(`!document.querySelector('.cw-party').hidden`);
  ok(true, 'Queued celebration appears after the Journal is closed');
  console.log(`PASS: ${checks} journal browser checks`);
} finally {
  await browser?.close(); server.close();
}
