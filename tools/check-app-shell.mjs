/**
 * check-app-shell.mjs — the Android app's web side, driven in headless Chrome
 * with a stand-in for window.CatOSAndroid (android/ Bridge.java).
 *
 *   offline + free  → the net wall, which lifts when the network returns
 *   explanations    → locked behind one video; one video opens them all, and
 *                     the pass survives a reload
 *   Pro             → nothing locked, plays offline, prices come from "Play"
 *   Settings        → Pro card, Share (reaches the share sheet), privacy link
 *   Google account  → sign in saves this phone's village; leaving the app
 *                     sends only what changed; a second phone chooses, and
 *                     "bring back" restores the account's village; delete
 *   EEA/UK          → "Privacy choices" only where the law asks for it
 *   Analytics       → screen_view per route, login
 *   the web         → no bridge: nothing locked, no wall, no Pro card, no account
 *
 * Run: node tools/check-app-shell.mjs  (exits 1 on any failure)
 */

import { launchChrome, serveRepo, findChrome } from './cdp-lite.mjs';
import { SEED } from './check-rendered-contrast.mjs';

const FAKE = `(() => {
  const st = () => { try { return JSON.parse(localStorage.getItem('fake') || '{}'); } catch { return {}; } };
  const put = (v) => localStorage.setItem('fake', JSON.stringify(Object.assign(st(), v)));
  const answer = (id, v, ms = 60) => setTimeout(() => window.__catosNative(id, JSON.stringify(v)), ms);
  window.__events = [];
  window.CatOSAndroid = {
    logEvent: (n, p) => { window.__events.push([n, JSON.parse(p)]); },
    privacyOptionsRequired: () => st().eea === true,
    showPrivacyOptions: () => { window.__privacy = (window.__privacy || 0) + 1; },
    account: () => (st().account ? JSON.stringify(st().account) : ''),
    signIn: (id) => { put({ account: { uid: 'u1', email: 'learner@example.com', name: 'Learner' } }); answer(id, { ok: true }); },
    signOut: (id) => { put({ account: null }); answer(id, { ok: true }); },
    cloudSave: (id, json) => { localStorage.setItem('fakeCloud', json); put({ saves: (st().saves || 0) + 1 }); answer(id, { ok: true }); },
    cloudLoad: (id) => { const c = localStorage.getItem('fakeCloud'); answer(id, { ok: true, backup: c ? JSON.parse(c) : null }); },
    deleteAccount: (id) => { localStorage.removeItem('fakeCloud'); put({ account: null }); answer(id, { ok: true }); },
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
  check(await b.evaluate(`!document.querySelector('#account') && !document.querySelector('#privacy-choices')`), 'web: no Google account card, no privacy choices');

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

  // ---- Google account and the cloud save ----
  const fake = () => b.evaluate(`localStorage.getItem('fake')`).then((s) => JSON.parse(s || '{}'));
  const cloud = () => b.evaluate(`localStorage.getItem('fakeCloud')`).then((s) => JSON.parse(s || 'null'));
  const leave = `Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); 1`;
  const valley = `import('/src/core/storage/indexeddb-adapter.js').then(async (m) => { const s = new m.IndexedDBAdapter(); await s.init(); return (await s.get('settings', 'valley'))?.value?.name ?? null; })`;
  await b.evaluate(`['fakeCloud', 'catos:cloud-linked', 'catos:cloud-sig'].forEach((k) => localStorage.removeItem(k)); 1`);
  await go('#/settings');
  check(await b.evaluate(`!!document.querySelector('#acct-in') && !document.querySelector('#privacy-choices')`), 'app settings: Sign in with Google offered; no privacy choices outside the EEA');
  check(await b.evaluate(`window.__events.some(([n, p]) => n === 'screen_view' && p.screen_name === 'settings')`), 'analytics: a screen_view names the route');
  await b.evaluate(`document.querySelector('#acct-in').click(); 1`);
  check(await until(`!!document.querySelector('#acct-save') && JSON.parse(localStorage.getItem('fakeCloud') || '{}').format === 'cat-os-backup'`, 5000), 'sign in to an empty account: this phone\'s village is saved to it');
  check(await b.evaluate(`window.__events.some(([n, p]) => n === 'login' && p.method === 'Google')`), 'analytics: the sign-in is logged');
  const saved = (await fake()).saves;
  await b.evaluate(leave);
  await wait(800);
  check((await fake()).saves === saved, 'leaving the app with nothing new sends nothing');
  await b.evaluate(`import('/src/core/storage/indexeddb-adapter.js').then(async (m) => { const s = new m.IndexedDBAdapter(); await s.init(); await s.put('settings', { id: 'reading-size', value: 'l' }); return 1; })`);
  await b.evaluate(leave);
  check(await until(`JSON.parse(localStorage.getItem('fake')).saves === ${saved + 1}`, 3000), 'leaving the app after a change saves it');

  // A second phone: the account holds "Cloudvale", this phone holds Ashfield.
  const theirs = await cloud();
  theirs.stores.settings = theirs.stores.settings.map((r) => (r.id === 'valley' ? { ...r, value: { ...r.value, name: 'Cloudvale' } } : r));
  await b.evaluate(`localStorage.setItem('fakeCloud', ${JSON.stringify(JSON.stringify(theirs))}); localStorage.removeItem('catos:cloud-linked'); 1`);
  await b.evaluate(`document.querySelector('#acct-out').click(); 1`);
  check(await until(`!!document.querySelector('#acct-in')`, 3000), 'sign out: the sign-in button is back');
  await b.evaluate(`document.querySelector('#acct-in').click(); 1`);
  check(await until(`(document.querySelector('.gmenu__card')?.textContent || '').includes('Cloudvale')`, 5000), 'a phone with its own village is asked which to keep, and sees both');
  check((await cloud()).stores.settings.some((r) => r.value?.name === 'Cloudvale'), 'nothing is sent before the learner chooses');
  await b.evaluate(`document.querySelector('[data-do="restore"]').click(); 1`);
  await wait(1500);
  await until(ready);
  check(await b.evaluate(valley) === 'Cloudvale', '"Bring back the saved village" restores the account\'s village');

  await setFake({ online: true, eea: true, account: { uid: 'u1', email: 'learner@example.com', name: 'Learner' } });
  await go('#/settings');
  check(await b.evaluate(`!!document.querySelector('#acct-save')`), 'after a restore this phone saves to the account');
  await b.evaluate(`document.querySelector('#privacy-choices').click(); 1`);
  check(await b.evaluate(`window.__privacy === 1`), 'EEA/UK: Privacy choices reopens Google\'s consent form');
  await b.evaluate(`document.querySelector('#acct-delete').click(); 1`);
  await until(`!!document.querySelector('[data-do="delete"]')`, 2000);
  await b.evaluate(`document.querySelector('[data-do="delete"]').click(); 1`);
  check(await until(`!!document.querySelector('#acct-in') && !localStorage.getItem('fakeCloud') && !localStorage.getItem('catos:cloud-linked')`, 3000), 'delete account: the cloud save and the link are gone');
  check(await b.evaluate(valley) === 'Cloudvale', 'delete account: this phone keeps its village');
  await setFake({ online: true });

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
