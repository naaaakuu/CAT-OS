/**
 * check-duel-browser.mjs — a brand-new player's first minute, in a real
 * browser at phone size, with real taps: the big button, the first duel, the
 * splash, the letter, the card, the Book, the Road, and walking away.
 */
import { pathToFileURL } from 'node:url';
import { findChrome, launchChrome, serveRepo } from './cdp-lite.mjs';

export async function checkDuelBrowser() {
  if (!findChrome()) return { skipped: true, cases: 0, problems: [] };
  const server = await serveRepo();
  const b = await launchChrome({ width: 390, height: 844 });
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));
  const problems = [];
  let cases = 0;
  const ok = (cond, msg) => { cases += 1; if (!cond) problems.push(msg); };
  const until = async (expr, ms = 10000) => { const end = Date.now() + ms; do { if (await b.evaluate(expr)) return true; await pause(70); } while (Date.now() < end); return false; };
  const tap = async (sel) => {
    const p = await b.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const at = document.elementFromPoint(x, y); return { x, y, hit: !!at && (at === e || e.contains(at)) }; })()`);
    if (!p) throw new Error(`missing control ${sel}`);
    if (!p.hit) throw new Error(`a real tap cannot reach ${sel}`);
    for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await pause(60);
  };
  const store = (body) => b.evaluate(`(async () => { const { IndexedDBAdapter } = await import('/src/core/storage/indexeddb-adapter.js'); const s = new IndexedDBAdapter(); if (s.init) await s.init(); ${body} })()`);
  const noOverflow = () => b.evaluate(`document.documentElement.scrollWidth <= innerWidth + 1`);

  try {
    await b.open(server.url, 3000);
    await b.evaluate(`window.__errs = []; addEventListener('error', (e) => __errs.push(e.message)); addEventListener('unhandledrejection', (e) => __errs.push(String(e.reason))); true`);

    /* ---- The front door ---- */
    ok(await until(`!!document.querySelector('.cw-play') && /PLAY/.test(document.querySelector('.cw-play').textContent)`), 'the big button does not say PLAY');
    ok(await b.evaluate(`document.querySelector('.cw-play').getAttribute('href') === '#/duel'`), 'PLAY does not start a duel');
    ok(await b.evaluate(`document.querySelector('.cw').classList.contains('is-pointing')`), 'a new player is not pointed at PLAY');
    ok(await b.evaluate(`getComputedStyle(document.querySelector('.cw-play')).pointerEvents !== 'none'`), 'PLAY cannot be tapped during the hello');
    await tap('.cw-play');

    /* ---- The first duel: real words, answered right ---- */
    ok(await until(`!!document.querySelector('.dl .opt')`, 12000), 'the first duel did not open');
    ok(await b.evaluate(`!document.querySelector('.dl-vs:not([hidden])')`), 'the first duel should not start with the playbill');
    ok(await noOverflow(), 'the duel overflows sideways');
    const lex = await b.evaluate(`(async () => { const out = {}; for (const f of ['f', 't', 'j', 'h', 'l', 'r', 'c']) { const d = await (await fetch('/content/lexicon/lex-high-' + f + '.json')).json(); for (const e of d.entries) out[e.word.toLowerCase()] = e.meaning.trim().replace(/[.;]\\s*$/, '').toLowerCase(); } return out; })()`);
    let guard = 0;
    while (guard++ < 40 && !(await b.evaluate(`!!document.querySelector('.rs')`))) {
      if (await b.evaluate(`!!document.querySelector('.dl .opt:not(:disabled)')`)) {
        const pick = await b.evaluate(`(() => { const word = document.querySelector('.q__word')?.textContent.trim().toLowerCase(); const m = ${JSON.stringify(lex)}[word]; const opts = [...document.querySelectorAll('.opt')]; const i = opts.findIndex((o) => o.textContent.trim().toLowerCase() === m); return i < 0 ? 0 : i; })()`);
        await pause(320);
        await tap(`.opt[data-i="${pick}"]`);
      }
      await pause(240);
    }
    ok(await until(`!!document.querySelector('.rs')`, 8000), 'the first duel never reached a result');
    ok(await b.evaluate(`document.querySelector('.rs').classList.contains('rs--won')`), 'a perfect first duel was not a win');
    ok(await noOverflow(), 'the result overflows sideways');
    const saved = await store(`const all = await s.getAll('learning'); return { duels: all.filter((r) => r.kind === 'duel'), rounds: all.filter((r) => r.kind === 'lex-round').length, ledger: all.filter((r) => r.kind === 'lex-mastery').length };`);
    ok(saved.duels.length === 1 && saved.duels[0].won === true, 'the duel was not saved as a win');
    ok(saved.duels[0].laurels === 36 && saved.duels[0].letter?.grade === 'gold', 'the first duel should pay 36 laurels and a gold-sealed letter');
    ok(saved.rounds === 1 && saved.ledger === saved.duels[0].score.total && saved.ledger >= 3, 'the words of the duel did not reach the spaced-practice ledger');

    /* ---- The letter ---- */
    ok(await until(`document.querySelector('#letter')?.classList.contains('is-in')`, 4000), 'no letter dropped');
    await tap('#letter');
    ok(await until(`!!document.querySelector('.lt #env')`), 'the letter did not open its screen');
    await pause(300);
    const opened = await store(`const all = await s.getAll('learning'); return all.filter((r) => r.kind === 'letter-open').length;`);
    ok(opened === 1, 'the opened letter was not saved before the cards were shown');
    for (let i = 0; i < 3; i += 1) { await tap('#env'); await pause(90); }
    ok(await until(`document.querySelector('.lt').dataset.state === 'reveal' && !!document.querySelector('.cd__title')`, 3000), 'three taps did not break the seal');
    ok(await noOverflow(), 'the card overflows sideways');
    const cards = await store(`const all = await s.getAll('learning'); return all.find((r) => r.kind === 'letter-open').cards.length;`);
    ok(cards >= 1, 'the letter held no cards');
    for (let i = 0; i < cards - 1; i += 1) { await tap('#next'); await pause(180); }

    /* ---- The Book and the Road ---- */
    await b.evaluate(`location.hash = '#/book'; true`);
    ok(await until(`!!document.querySelector('.bk-tile')`), 'the Book did not open');
    ok(await b.evaluate(`document.querySelectorAll('.bk-tile:not(.is-down)').length >= ${cards}`), 'cards from the letter are not in the Book');
    ok(await b.evaluate(`document.querySelectorAll('.bk-tile.is-down').length > 0`), 'unfound cards should stay face down');
    ok(await noOverflow(), 'the Book overflows sideways');
    await tap('.bk-tile.is-down');
    ok(await until(`!!document.querySelector('.cd--down .cd__hook')`), 'a face-down card does not show its teaser');
    await b.evaluate(`location.hash = '#/road'; true`);
    ok(await until(`document.querySelectorAll('.rd-row').length === 9`), 'the Laurel Road does not show nine stops');
    ok(await b.evaluate(`!!document.querySelector('.rd-row.is-now') && document.querySelectorAll('.rd-row__fig.is-hidden').length > 0`), 'the Road should mark your stop and keep the far Muddles in the dark');
    ok(await noOverflow(), 'the Road overflows sideways');

    /* ---- Walking away costs something, after the first duel ---- */
    await b.evaluate(`location.hash = '#/duel?t=2'; true`);
    ok(await until(`!!document.querySelector('#billgo') || !!document.querySelector('.dl .opt')`, 12000), 'the second duel did not open');
    if (await b.evaluate(`!!document.querySelector('#billgo')`)) { await pause(500); await tap('#billgo'); }
    for (let i = 0; i < 2; i += 1) {
      ok(await until(`!!document.querySelector('.dl .opt:not(:disabled)')`, 5000), 'a duel question did not appear');
      await pause(340); await tap('.opt[data-i="0"]');
      await pause(600);
      if (await b.evaluate(`!!document.querySelector('#cont')`)) { await tap('#cont'); await pause(200); }
    }
    await tap('#quit');
    ok(await until(`!!document.querySelector('[data-leave]')`, 2000), 'leaving should ask first');
    await tap('[data-leave]');
    ok(await until(`location.hash === '#/world'`, 5000), 'leaving did not go home');
    const after = await store(`const all = await s.getAll('learning'); return all.filter((r) => r.kind === 'duel').map((r) => ({ won: r.won, forfeited: r.forfeited, laurels: r.laurels }));`);
    ok(after.some((d) => d.forfeited === true && d.won === false && d.laurels < 0), 'a forfeited duel was not recorded as a loss');

    /* ---- Small phones ---- */
    for (const [w, h] of [[320, 568], [360, 640], [412, 915]]) {
      await b.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: true });
      await b.evaluate(`location.hash = '#/duel?t=${w}'; true`);
      ok(await until(`!!document.querySelector('#billgo') || !!document.querySelector('.dl .opt')`, 12000), `no duel at ${w}x${h}`);
      if (await b.evaluate(`!!document.querySelector('#billgo')`)) { await pause(400); await tap('#billgo'); }
      ok(await until(`!!document.querySelector('.dl .opt:not(:disabled)')`, 5000), `no question at ${w}x${h}`);
      ok(await noOverflow(), `sideways overflow at ${w}x${h}`);
      ok(await b.evaluate(`[...document.querySelectorAll('.opt')].every((o) => { const r = o.getBoundingClientRect(); return r.height >= 44 && r.bottom <= innerHeight + 1; })`), `an answer is cut off or too small at ${w}x${h}`);
      await b.evaluate(`location.hash = '#/world'; true`);
      await pause(300);
    }
    const errs = await b.evaluate(`JSON.stringify(window.__errs ?? [])`);
    ok(errs === '[]', `page errors: ${errs}`);
  } catch (err) { problems.push(err.message); } finally { b.close(); server.close(); }
  return { skipped: false, cases, problems };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await checkDuelBrowser();
  console.log(r.skipped ? 'SKIPPED (no Chrome)' : `${r.cases} checks, ${r.problems.length} problems`);
  for (const p of r.problems) console.error(`FAIL ${p}`);
  process.exit(r.problems.length ? 1 : 0);
}
