/**
 * check-app-shell.mjs — the Android app's web side, driven in headless Chrome
 * with a stand-in for window.CatOSAndroid (android/ Bridge.java).
 *
 *   offline + free  → the net wall, which lifts when the network returns
 *   explanations    → locked behind one video; one video opens them all, and
 *                     the pass survives a reload
 *   Pro             → nothing locked, plays offline, prices come from "Play"
 *   Settings        → Pro card, Share (reaches the share sheet), privacy link
 *   the web         → no bridge: nothing locked, no wall, no Pro card
 *
 * Run: node tools/check-app-shell.mjs  (exits 1 on any failure)
 */

import { launchChrome, serveRepo, findChrome } from './cdp-lite.mjs';
import { SEED } from './check-rendered-contrast.mjs';

const FAKE = `(() => {
  const st = () => { try { return JSON.parse(localStorage.getItem('fake') || '{}'); } catch { return {}; } };
  const answer = (id, v, ms = 60) => setTimeout(() => window.__catosNative(id, JSON.stringify(v)), ms);
  window.CatOSAndroid = {
    isOnline: () => st().online !== false,
    isPro: () => st().pro === true,
    proPlan: () => (st().pro ? 'yearly' : ''),
    version: () => 'test',
    showRewarded: (id) => { window.__videos = (window.__videos || 0) + 1; answer(id, { rewarded: st().closeAd ? false : true, reason: st().closeAd ? 'closed' : undefined }); },
    products: (id) => answer(id, { products: [
      { id: 'catos_pro_yearly', price: '₹499.00', micros: 499000000, currency: 'INR', period: 'P1Y' },
      { id: 'catos_pro_lifetime', price: '₹1,299.00', micros: 1299000000, currency: 'INR' } ] }),
    buy: (id) => answer(id, { pro: false, reason: 'cancelled' }),
    restore: (id) => answer(id, { pro: st().pro === true }),
    share: (t) => { window.__shared = t; },
    openExternal: (u) => { window.__opened = u; },
    saveFile: (id) => answer(id, { ok: true }),
  };
})();`;

if (!findChrome()) { console.log('SKIPPED: no Chrome'); process.exit(0); }
const server = await serveRepo();
const b = await launchChrome({ width: 390, height: 844 });
const problems = [];
const check = (ok, what) => { console.log(`${ok ? '  ok ' : '  FAIL'} ${what}`); if (!ok) problems.push(what); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (expr, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await b.evaluate(expr).catch(() => false)) return true; await wait(150); } return false; };
const ready = `!!(window.__catosBooted && document.querySelector('#view')?.children.length && !document.querySelector('.route-waiting'))`;
const go = async (hash) => { await b.open(server.url + 'index.html' + hash, 500); await until(ready); await wait(900); };
const setFake = (v) => b.evaluate(`localStorage.setItem('fake', ${JSON.stringify(JSON.stringify(v))}); 1`);

try {
  // ---- The web: no bridge at all ----
  await b.open(server.url + 'index.html#/world', 500);
  await until(ready);
  await b.evaluate(SEED);
  await go('#/rc/review/rc-0001');
  check(await b.evaluate(`!document.querySelector('.why-lock__card') && !!document.querySelector('cat-explanation #working')`), 'web: explanations open, no lock');
  await go('#/settings');
  check(await b.evaluate(`![...document.querySelectorAll('h2')].some((h) => h.textContent === 'CAT OS Pro') && !!document.querySelector('#share-app')`), 'web: no Pro card, Share is there');

  // ---- The app ----
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: FAKE });
  await setFake({ online: false });
  await go('#/world');
  check(await b.evaluate(`!!document.querySelector('.net-wall') && document.getElementById('shell').inert === true`), 'app offline: the wall is up and the app underneath is inert');
  await setFake({ online: true });
  await b.evaluate(`window.dispatchEvent(new Event('online')); 1`);
  check(await until(`!document.querySelector('.net-wall') && document.getElementById('shell').inert === false`, 3000), 'app: the wall lifts when the network returns');

  await b.evaluate(`localStorage.removeItem('catos:why-until'); 1`);
  await go('#/rc/review/rc-0001');
  const locks = await b.evaluate(`document.querySelectorAll('cat-explanation .why-lock__card').length`);
  check(locks > 0 && await b.evaluate(`!document.querySelector('cat-explanation #working') && !!document.querySelector('cat-explanation .verdict')`), `app: ${locks} explanations locked, verdicts still shown`);
  check(await b.evaluate(`!!document.querySelector('.why-lock__pro[href="#/pro"]')`), 'app: the lock offers Pro');

  await setFake({ online: true, closeAd: true });
  await b.evaluate(`document.querySelector('[data-why-open]').click(); 1`);
  check(await until(`(document.querySelector('.why-lock__said')?.textContent || '').includes('did not finish')`, 3000), 'app: a video closed early leaves it locked and says so');

  await setFake({ online: true });
  await b.evaluate(`document.querySelector('[data-why-open]').click(); 1`);
  check(await until(`!document.querySelector('.why-lock__card') && document.querySelectorAll('cat-explanation #working').length === ${locks}`, 4000), 'app: one video opens every explanation on the screen');
  await go('#/rc/review/rc-0001');
  check(await b.evaluate(`!document.querySelector('.why-lock__card')`), 'app: the pass survives a reload');

  await b.evaluate(`localStorage.removeItem('catos:why-until'); 1`);
  await go('#/rc/mentor/rc-0001');
  check(await b.evaluate(`!!document.querySelector('.why-lock__card [data-why-open="explain:rc-0001"]')`), 'app: the passage page is locked with its own key');

  await setFake({ online: false, pro: true });
  await go('#/rc/review/rc-0001');
  check(await b.evaluate(`!document.querySelector('.net-wall') && !document.querySelector('.why-lock__card')`), 'Pro: plays offline, nothing locked');
  await setFake({ online: true, pro: false });
  await b.evaluate(`localStorage.removeItem('catos:why-until'); 1`);

  await go('#/settings');
  check(await b.evaluate(`[...document.querySelectorAll('h2')].some((h) => h.textContent === 'CAT OS Pro') && !document.querySelector('#offline-refresh')`), 'app settings: Pro card, no web-only Offline card');
  await b.evaluate(`document.querySelector('#share-app').click(); 1`);
  check(await until(`(window.__shared || '').includes('play.google.com/store/apps/details?id=com.nakulcreations.catos')`, 2000), 'app settings: Share sends the Play link');
  await b.evaluate(`document.querySelector('#privacy').click(); 1`);
  check(await b.evaluate(`(window.__opened || '').endsWith('/privacy.html')`), 'app settings: the privacy policy opens outside the app');

  await go('#/pro');
  check(await until(`document.querySelector('[data-price="catos_pro_yearly"]')?.textContent === '₹499.00 a year'`, 3000), 'Pro screen: the yearly price is Play\'s');
  check(await b.evaluate(`(document.querySelector('[data-per="catos_pro_yearly"]')?.textContent || '').includes('a month')`), 'Pro screen: the monthly equivalent is shown');
  check(await b.evaluate(`/renews automatically/i.test(document.querySelector('.pro__fine')?.textContent || '')`), 'Pro screen: the renewal terms are stated');
} catch (err) {
  problems.push(String(err?.stack || err));
  console.error(err);
} finally {
  b.close();
  server.close();
}

console.log(problems.length ? `\n${problems.length} problem(s)` : '\nall good');
process.exit(problems.length ? 1 : 0);
