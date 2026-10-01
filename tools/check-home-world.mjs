/** Browser regression for the illustrated home: destinations, dialog focus,
 * map camera, responsive layout, and a real service-worker offline reload. */
import { serveRepo, launchChrome } from './cdp-lite.mjs';

const server = await serveRepo();
const browser = await launchChrome({ width: 1440, height: 1000 });
let checks = 0;
const assert = (ok, message) => { if (!ok) throw new Error(message); checks++; };
const waitFor = async (expression, timeout=12000) => {
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline) { if(await browser.evaluate(expression)) return true; await new Promise(r=>setTimeout(r,150)); }
  return false;
};
const click = async selector => { if(!await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`)) throw new Error('Missing control: '+selector+' on '+await browser.evaluate('location.hash+" "+document.body.innerText.slice(0,250)')); await browser.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); };
try {
  await browser.open(server.url+'#/world',1500);
  assert(await waitFor(`!!document.querySelector('.cw-art')?.naturalWidth`),'Home artwork did not load');
  assert(await browser.evaluate(`document.querySelectorAll('.cw-location').length === 8`),'Eight world destinations must render');
  assert(await browser.evaluate(`!!document.querySelector('.cw h1')`),'Home must have an accessible main heading');
  const width=await browser.evaluate(`document.querySelector('.cw-map').offsetWidth`);
  await click('[data-zoom="+"]');
  assert(await browser.evaluate(`document.querySelector('.cw-map').offsetWidth > ${width}`),'Zoom in must enlarge the world');
  await click('[data-reset]');
  assert(await browser.evaluate(`document.querySelector('.cw-map').offsetWidth === ${width}`),'Recenter restores the camera scale');
  for(const id of ['varc','dilr','quant','garden','practice','daily','progress','life','mocks']) {
    await click(`[data-place="${id}"]`);
    assert(await browser.evaluate(`!!document.querySelector('.cw-panel[aria-modal="true"] h2')`),id+' must open a named dialog');
    assert(await waitFor(`!!document.activeElement.closest('.cw-panel')`),id+' must receive focus');
    if(['quant','dilr','mocks'].includes(id)) assert(await browser.evaluate(`document.querySelector('.cw-panel').textContent.includes('not available')`),id+' must disclose unavailable content');
    await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    assert(await browser.evaluate(`document.querySelector('.cw-overlay').hidden`),'Escape closes '+id);
  }
  for(const [id,expected] of [['varc','reading-room'],['garden','meadow'],['practice','loom'],['daily','meadow'],['progress','growth']]) {
    await browser.evaluate(`window.__homeCheckErrors=[];const oldError=console.error;console.error=(...args)=>{window.__homeCheckErrors.push(args.map(a=>a?.stack || String(a)).join(' '));oldError(...args);};`);
    await click(`[data-place="${id}"]`); await click('.cw-panel .cw-primary');
    const reached=await waitFor(`location.hash.includes(${JSON.stringify(expected)}) && !document.querySelector('.cw') && document.body.innerText.length > 100 && !document.body.innerText.includes("This screen didn't open")`);
    assert(reached,id+' must reach its working learning screen: '+JSON.stringify(await browser.evaluate('window.__homeCheckErrors')));
    assert(await browser.evaluate(`window.__catos.errors.length === 0`),id+' navigation produced browser errors');
    await browser.open(server.url+'#/world',1000); await waitFor(`!!document.querySelector('.cw')`);
  }
  await browser.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await browser.open(server.url+'#/world',1000);
  await click('[data-directory]');
  assert(await browser.evaluate(`document.querySelectorAll('.cw-directory button').length === 9`),'All destinations must be accessible from the phone directory');
  await waitFor(`!!document.activeElement.closest('.cw-panel')`);
  for(let i=0;i<12;i++) {
    await browser.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert(await browser.evaluate(`!!document.activeElement.closest('.cw-panel')`),'Tab must remain inside the open directory');
  }
  await click('.cw-directory [data-place="varc"]'); await click('.cw-panel [data-close]');
  assert(await browser.evaluate(`document.activeElement.hasAttribute('data-directory')`),'Closing a destination reached through the directory restores focus');
  assert(await browser.evaluate(`document.documentElement.scrollWidth === innerWidth`),'Mobile home must not overflow the page');
  await browser.send('Network.setBypassServiceWorker',{bypass:false});
  // The shared gate helper deliberately hard-reloads with ignoreCache, which
  // bypasses service workers. Use a normal navigation for the offline story.
  await browser.send('Page.navigate',{url:server.url+'?offline-check=1#/world'});
  assert(await waitFor(`!!navigator.serviceWorker.controller`,60000),'Service worker did not take control: '+JSON.stringify(await browser.evaluate(`navigator.serviceWorker.getRegistrations().then(rs=>rs.map(r=>({active:r.active?.state,installing:r.installing?.state,waiting:r.waiting?.state})))`)));
  assert(await waitFor(`caches.match('./assets/art/home-world-v1.png').then(Boolean)`,30000),'World artwork must be cached before offline use');
  await browser.send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
  await browser.send('Page.reload',{ignoreCache:false});
  assert(await waitFor(`!!document.querySelector('.cw-art')?.naturalWidth && document.querySelectorAll('.cw-location').length === 8`),'Home must reopen with the network offline');
  await click('[data-place="progress"]');
  assert(await browser.evaluate(`document.querySelectorAll('.cw-progress b').length === 3 && window.__catos.errors.length === 0`),'Offline progress must render without browser errors');
  console.log(`PASS: ${checks} home-world browser checks — destinations, navigation, zoom, dialog focus, mobile layout and offline reload.`);
} catch(error) { console.error('FAIL:',error.message); console.error(await browser.evaluate('JSON.stringify(window.__homeCheckErrors || window.__catos.errors)')); process.exitCode=1; }
finally { browser.close(); server.close(); }
process.exit(process.exitCode || 0);
