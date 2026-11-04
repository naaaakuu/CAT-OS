/** Focused Android-sized regression for Matcha, using the repository's browser harness. */
import assert from 'node:assert/strict';
import { serveRepo, launchChrome } from './cdp-lite.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const server = await serveRepo();
const browser = await launchChrome({width:412,height:915});
const wait = (ms) => new Promise((r) => setTimeout(r,ms));
const db = `const {IndexedDBAdapter}=await import('/src/core/storage/indexeddb-adapter.js');const s=new IndexedDBAdapter();await s.init();`;
async function until(selector) {
  const end=Date.now()+12000;
  while(Date.now()<end){if(await browser.evaluate(`!!document.querySelector(${JSON.stringify(selector)})`))return;await wait(80);}
  throw new Error('Did not reach '+selector);
}
async function tap(selector) {
  await until(selector);
  const pos=await browser.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,h=document.elementFromPoint(x,y);return {x,y,ok:!e.disabled&&(h===e||e.contains(h))}})()`);
  assert(pos.ok,'Unreachable tap: '+selector);
  for(const type of ['mousePressed','mouseReleased'])await browser.send('Input.dispatchMouseEvent',{type,x:pos.x,y:pos.y,button:'left',clickCount:1});
  await wait(100);
}
async function go(hash,selector){await browser.evaluate(`location.hash=${JSON.stringify(hash)}`);await until(selector);}
async function shot(name){if(!process.env.CATOS_MATCHA_SHOTS)return;await mkdir(process.env.CATOS_MATCHA_SHOTS,{recursive:true});const {data}=await browser.send('Page.captureScreenshot',{format:'jpeg',quality:90});await writeFile(process.env.CATOS_MATCHA_SHOTS+'/'+name+'.jpg',Buffer.from(data,'base64'));}
try {
  await browser.open(server.url+'#/world/place/meadow',1000);
  await until('.gh-house');
  for(const [width,height] of [[320,740],[360,800],[412,915]]){
    await browser.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    assert(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Horizontal overflow at '+width);
    for(const band of ['high','medium','low']){
      await tap(`[data-band="${band}"]`);
      assert.equal(await browser.evaluate('document.querySelectorAll(".gh-bed").length'),26);
      assert(await browser.evaluate(`document.querySelector('.gh-dock .gh-start').getAttribute('href').includes('band=${band}')`));
    }
    assert(await browser.evaluate(`Array.from(document.querySelectorAll('.gh-tabs button,.gh-back,.gh-nav .info-btn,.gh-dock .gh-start')).every(e=>{const r=e.getBoundingClientRect();return r.width>=44&&r.height>=44})`),'A primary control is smaller than 44 px');
  }
  console.log('ok three frequency gardens, 26 beds each, no overflow and 44 px controls at 320/360/412');
  assert(await browser.evaluate(`(()=>{const r=document.querySelector('.gh-room-backdrop').getBoundingClientRect();return r.top===0&&r.width===innerWidth&&r.height===innerHeight&&getComputedStyle(document.querySelector('.gh-room-backdrop')).position==='fixed'&&!document.querySelector('.gh-hero')})()`),'The glasshouse must fill the viewport rather than a banner');
  await browser.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:200,y:500,deltaX:0,deltaY:420});await wait(300);
  assert(await browser.evaluate(`scrollY>150&&document.querySelector('.gh-room-backdrop').getBoundingClientRect().top===0&&document.querySelector('.gh-room-tools').getBoundingClientRect().top===0`),'Scrolling lost the room or its navigation');
  console.log('ok nursery benches scroll inside a full-screen glasshouse with fixed navigation');
  await tap('[data-letter="X"]');await until('.gh-dialog[open] #gh-word-list .gh-word-row');
  assert(await browser.evaluate('window.__catosBack()&&!document.querySelector(".gh-dialog[open]")'));
  console.log('ok Android Back closes the journal');
  await go('#/round/meadow/lex-low-x','#begin');await tap('#begin');await until('.gh-question-word');
  assert.equal(await browser.evaluate('document.querySelectorAll("[data-option]").length'),4,'A single-word bed must still have four choices');
  await shot('practice');
  const meaning=await browser.evaluate(`(async()=>{const {loadField}=await import('/src/world/lexicon.js');const b=await loadField('meadow','lex-low-x');return b.entries[0].meaning;})()`);
  const correct=()=>browser.evaluate(`Array.from(document.querySelectorAll('[data-option]')).findIndex(e=>e.children[1].textContent===${JSON.stringify(meaning)})`);
  await tap(`[data-option="${await correct()}"]`);await until('#word-next:not(:disabled)');
  assert.equal(await browser.evaluate('document.querySelectorAll(".gh-recall-leaf.is-yellow").length'),1);
  await browser.open(server.url+'#/round/meadow/lex-low-x',500);await until('#begin');await tap('#begin');
  assert(await browser.evaluate('document.querySelector(".gh-question-meta").textContent.includes("1 / 2")'),'Resume lost the first recall');
  await tap(`[data-option="${await correct()}"]`);await until('#word-next:not(:disabled)');await tap('#word-next');await until('.gh-complete');
  console.log('ok tiny bed has four choices, one recall stays yellow, refresh resumes, second recall completes');
  const record=await browser.evaluate(`(async()=>{${db}return (await s.getAll('learning')).find(r=>r.kind==='lex-mastery');})()`);
  assert.equal(record.level,2);
  await browser.evaluate(`(async()=>{${db}const r=await s.get('learning',${JSON.stringify(record.id)});await s.put('learning',{...r,next_at:new Date(Date.now()-1000).toISOString()});})()`);
  await go('#/world/place/meadow','.gh-house');
  assert(await browser.evaluate('document.querySelector(".gh-start.is-review").getAttribute("href").includes("review=1")'));
  await tap('.gh-dock .gh-start');await until('#begin');await tap('#begin');
  for(let i=0;i<2;i++){await tap(`[data-option="${await correct()}"]`);await until('#word-next:not(:disabled)');await tap('#word-next');}
  await until('.gh-complete');
  assert(await browser.evaluate(`(async()=>{${db}const r=await s.get('learning',${JSON.stringify(record.id)});return Date.parse(r.next_at)>Date.now()&&r.level>=2;})()`));
  console.log('ok due words invite review and two recalls restore green leaves');
  await go('#/world/place/meadow','.gh-house');await tap('[data-band="low"]');await tap('#gh-words');await until('.gh-dialog[open] .gh-word-row');
  await shot('word-journal');
  assert(await browser.evaluate('window.__catosBack()&&!document.querySelector(".gh-dialog[open]")'));
  await browser.evaluate(`(async()=>{${db}const at=new Date().toISOString();await s.put('settings',{id:'valley',value:{name:'Glasshouse checks',awakened_at:at,met_at:at}});await s.put('settings',{id:'motion',value:'reduced'});localStorage.setItem('catos:met-gang','1');sessionStorage.setItem('world:focus','meadow');})()`);
  for(const selector of ['[data-spot="matcha"]','.pet[data-pet="matcha"]']){
    await go('#/world','.cw-spot');
    await browser.evaluate(`document.querySelector('.cw').__village.look(332,470)`);await wait(200);
    await tap(selector);await until('.gh-house--immersive');
    assert(!await browser.evaluate('!!document.querySelector(".cw-card,.cw-overlay,.gh-hero")'),'A friend card still stands between the village and Matcha’s room');
  }
  await go('#/world','.cw-spot');await tap('[data-open="friends"]');await tap('.cw-roster a[href="#/world/place/meadow"]');await until('.gh-house--immersive');
  console.log('ok house, Matcha and subject roster enter the glasshouse directly without a friend card');
  await shot('immersive-room');
  console.log('Glasshouse: focused Android browser checks passed.');
} finally { await browser.close(); server.close(); }
