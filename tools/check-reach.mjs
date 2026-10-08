/**
 * check-reach.mjs — the gate that tabs through the app with a keyboard.
 *
 * Everything this catches was found the same way: by pressing Tab. Not by
 * reading the stylesheet, which said there was a focus ring — there was, and
 * eight component classes each set their own `:focus-visible` box-shadow,
 * which REPLACES it rather than adding to it, so every passage row, every
 * primary call to action and every Settings toggle focused invisibly. A token
 * audit cannot see that. A cascade audit cannot see it either, because
 * whether it happens depends on which rules matched this element on this
 * route in this theme.
 *
 * So this presses the key and reads the computed style afterwards, at every
 * stop, on every route, in both themes.
 *
 * WHAT IT CHECKS, and the defect behind each:
 *
 *   FOCUS IS VISIBLE   every tab stop paints a ring or an outline.
 *   THE FIRST STOP     is the skip link. #/rc was sixty stops deep.
 *   TARGETS            every control is 44x44 — the exception being a link
 *                      inside a line of prose, which cannot be.
 *   TAPPABLE           what a key can reach, a finger can press. The word
 *                      round's Begin took focus but computed pointer-events:
 *                      none (a garden-only .is-veiled rule), so a tap went
 *                      through it and the round could never start.
 *   NAMES              nothing is announced by its element id. Three
 *                      Settings groups were read out as "music-picker".
 *   LIVE REGIONS       nothing announces a paragraph. The result screen said
 *                      six hundred and eighty-two characters in one breath,
 *                      and the XP counter rewrote its own forty-two times in
 *                      seven hundred milliseconds.
 *   DIALOGS            anything claiming role="dialog" has a name and is
 *                      aria-modal.
 *   HEADINGS           every screen has an h1 to jump to.
 *   SHEETS             a sheet that says role="dialog" keeps Tab inside it,
 *                      answers Escape, and hands focus back to whatever
 *                      opened it. The global cottage card — reachable from the
 *                      header of every world route — did none of the three.
 *
 * Usage:
 *   node tools/check-reach.mjs                 # every route, both themes
 *   node tools/check-reach.mjs --theme dark
 *   node tools/check-reach.mjs --route '#/settings'
 *
 * No Chrome: prints SKIPPED loudly and exits 0, like the other browser gates
 * — a gate that could not run must never report that it passed.
 */

import { launchChrome, serveRepo, findChrome } from './cdp-lite.mjs';
/* The same played village the contrast gate measures — one definition of
   "a learner a week in", so the two gates cannot drift apart. */
import { SEED } from './check-rendered-contrast.mjs';

/* The routes with something to press: the village is driven by a canvas and
   its callouts, Settings is the densest control surface in the app, and the
   reading list is the longest tab order in it. */
export const REACH_ROUTES = [
  { hash: '#/world', name: 'the village' },
  { hash: '#/rc', name: 'the reading list' },
  { hash: '#/settings', name: 'settings' },
  { hash: '#/growth', name: 'growth' },
  { hash: '#/rc/second-look', name: 'the second look' },
  { hash: '#/round/meadow', name: 'a word round' },
  { hash: '#/world/place/reading-room', name: 'the reading room' },
  { hash: '#/nowhere', name: 'a screen that is not there' },
];

const MIN_TARGET = 44;

/** Whatever has focus right now, and everything it can be judged by. */
const STOP = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const label = el.getAttribute('aria-label') || '';
  return {
    tag: el.tagName.toLowerCase(),
    cls: (el.getAttribute('class') || '').slice(0, 60),
    id: el.id || '',
    text: (el.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 40),
    w: Math.round(r.width), h: Math.round(r.height),
    shadow: cs.boxShadow, outline: cs.outlineStyle + ' ' + cs.outlineWidth,
    visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none',
    untappable: cs.pointerEvents === 'none',
    inProse: !!el.closest('p, li, .row__hint, .list-item__reason') && cs.display.indexOf('inline') === 0,
    label,
    idNamed: !!label && !!el.id && label === el.id,
    inContent: el.classList.contains('skip') || !!el.closest('#view'),
  };
})()`;

/** The things that can be judged without pressing anything. */
const STATIC = `(() => {
  const out = { live: [], dialogs: [], h1: document.querySelectorAll('h1').length, idNamed: [] };
  for (const el of document.querySelectorAll('[aria-live]')) {
    if (el.getAttribute('aria-live') === 'off') continue;
    out.live.push({ tag: el.tagName.toLowerCase(), cls: (el.getAttribute('class') || '').slice(0, 40), len: (el.textContent || '').trim().length });
  }
  for (const el of document.querySelectorAll('[role="dialog"]')) {
    out.dialogs.push({ cls: (el.getAttribute('class') || '').slice(0, 40),
      named: !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')),
      modal: el.getAttribute('aria-modal') === 'true' });
  }
  for (const el of document.querySelectorAll('[aria-label]')) {
    if (el.id && el.getAttribute('aria-label') === el.id) out.idNamed.push(el.id);
  }
  return out;
})()`;

const ringed = (s) => (s.shadow && s.shadow !== 'none') || (s.outline && !/none|^\s*\S+\s+0px/.test(s.outline));

/** Wait until the route has actually rendered, not merely until time passed. */
async function settled(b, tries = 30) {
  for (let i = 0; i < tries; i += 1) {
    const ready = await b.evaluate(`(() => { const v = document.querySelector('#view'); return !!window.__catosBooted && !!v && v.children.length > 0 && !document.querySelector('.route-waiting'); })()`);
    if (ready) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

/* A sheet is a promise: while I am open, I am the only thing here. The
   village's popovers kept it and the cottage card, opened from the header of
   every world route, kept none of it — focus stayed behind on the button,
   Tab walked straight out into the world underneath while the scrim held
   the pointer in, and Escape did nothing. */
const OPENER = '[data-open="cottage"]', CARD = '.cw-overlay:not([hidden]) .cw-card[aria-modal="true"]';
async function checkSheet(b, tab) {
  const problems = [];
  const found = await b.evaluate(`(() => { const el = document.querySelector('${OPENER}'); if (!el) return false; el.focus(); return true; })()`);
  if (!found) return ['the cottage button is not on the village at all'];
  for (const type of ['rawKeyDown', 'char', 'keyUp']) {
    await b.send('Input.dispatchKeyEvent', { type, windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, key: 'Enter', code: 'Enter', text: '\r' });
  }
  await new Promise((r) => setTimeout(r, 600));
  if (!await b.evaluate(`!!document.querySelector('${CARD}')`)) return ['the cottage button did not open its card'];

  const inside = await b.evaluate(`!!document.activeElement?.closest('${CARD}')`);
  if (!inside) problems.push('opening the cottage card leaves focus behind on the button that opened it');

  let out = 0;
  for (let i = 0; i < 14; i += 1) {
    await tab();
    if (!await b.evaluate(`!!document.activeElement?.closest('${CARD}')`)) out += 1;
  }
  if (out) problems.push(`Tab leaves the open cottage card ${out} time(s) in fourteen presses — into a world the scrim will not let you touch`);

  await b.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27, key: 'Escape', code: 'Escape' });
  await b.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27, key: 'Escape', code: 'Escape' });
  await new Promise((r) => setTimeout(r, 500));
  if (await b.evaluate(`!!document.querySelector('${CARD}')`)) problems.push('Escape does not close the cottage card');
  else if (!await b.evaluate(`document.activeElement?.matches?.('${OPENER}')`)) problems.push('closing the cottage card drops focus instead of handing it back to the button that opened it');
  return problems;
}

export async function checkReach({ theme = 'light', only = null, width = 390, height = 844, stops = 70 } = {}) {
  if (!findChrome()) return { skipped: true, problems: [], checked: 0 };
  const last = only ? String(only).split('/').filter(Boolean).pop() : null;
  const routes = last ? REACH_ROUTES.filter((r) => r.hash.endsWith(last) || r.name.includes(last)) : REACH_ROUTES;
  if (only && !routes.length) throw new Error(`--route ${only} matches none of: ${REACH_ROUTES.map((r) => r.hash).join(', ')}`);
  const problems = [];
  const server = await serveRepo();
  const b = await launchChrome({ width, height, dpr: 2 });
  let checked = 0;
  const tab = async () => {
    await b.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
    await b.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' });
  };
  try {
    await b.open(server.url, 4000);
    await b.evaluate(SEED);
    await b.evaluate(`localStorage.setItem('catos:hour','morning'); localStorage.setItem('catos:met-gang','1')`);
    await b.evaluate(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); await st.put('settings', { id: 'theme', value: ${JSON.stringify(theme)} }); return 1; })()`);

    for (const route of routes) {
      await b.open(server.url + route.hash, 1200);
      const where = `${route.name} (${theme})`;
      if (!await settled(b)) { problems.push(`${where}: the route never finished rendering`); continue; }

      const s = await b.evaluate(STATIC);
      if (!s.h1) problems.push(`${where}: the screen has no <h1>, so there is nothing to jump to`);
      for (const l of s.live) {
        if (l.len > 220) problems.push(`${where}: <${l.tag} class="${l.cls}"> is an aria-live region holding ${l.len} characters — a screen reader says all of it, at once, before anyone has looked at any of it`);
      }
      for (const d of s.dialogs) {
        if (!d.named) problems.push(`${where}: role="dialog" on .${d.cls} has no accessible name — it is announced as "dialog" and nothing else`);
        if (!d.modal) problems.push(`${where}: role="dialog" on .${d.cls} is not aria-modal, so the page behind it is still read`);
      }
      for (const l of s.idNamed) problems.push(`${where}: something is announced as "${l}" — its own element id`);

      /* Now walk it with the key. */
      await b.evaluate(`document.activeElement?.blur?.(); true`);
      const seen = [];
      for (let i = 0; i < stops; i += 1) {
        await tab();
        const stop = await b.evaluate(STOP);
        if (!stop) break;
        const key = `${stop.tag}.${stop.cls}#${stop.id}|${stop.text}`;
        if (seen.some((x) => x.key === key)) break; // the order has wrapped round
        seen.push({ ...stop, key });
      }
      checked += seen.length;
      if (!seen.length) { problems.push(`${where}: nothing at all is reachable by keyboard`); continue; }

      /* The property that matters is that a keyboard user never walks the
         chrome to reach the screen — satisfied EITHER by the skip link being
         first (a cold load) or by focus already sitting in the content (the
         router moves it there on every navigation, which is the same thing
         done for them). */
      if (!seen[0].inContent) {
        problems.push(`${where}: tabbing starts at "${seen[0].text || seen[0].cls || seen[0].tag}" — outside the screen's own content, with no skip link to get past it`);
      }
      const blind = seen.filter((x) => x.visible && !ringed(x));
      if (blind.length) {
        const w = blind[0];
        problems.push(`${where}: ${blind.length} tab stop(s) paint no focus indicator, e.g. <${w.tag} class="${w.cls}"> "${w.text}" — box-shadow: ${w.shadow}, outline: ${w.outline}`);
      }
      const small = seen.filter((x) => x.visible && !x.inProse && (x.w < MIN_TARGET || x.h < MIN_TARGET));
      if (small.length) {
        const w = small[0];
        problems.push(`${where}: ${small.length} control(s) under ${MIN_TARGET}x${MIN_TARGET}, e.g. <${w.tag} class="${w.cls}"> "${w.text}" at ${w.w}x${w.h}`);
      }
      const dead = seen.filter((x) => x.visible && x.untappable);
      if (dead.length) problems.push(`${where}: ${dead.length} control(s) take focus but ignore a tap (pointer-events: none), e.g. <${dead[0].tag} class="${dead[0].cls}"> "${dead[0].text}"`);
      const idn = seen.filter((x) => x.idNamed);
      if (idn.length) problems.push(`${where}: ${idn.length} control(s) announced by their element id, e.g. "${idn[0].label}"`);

      if (route.hash === '#/world') {
        for (const p of await checkSheet(b, tab)) problems.push(`${where}: ${p}`);
      }
    }
  } finally {
    b.close();
    server.close();
  }
  return { skipped: false, problems, checked };
}

if (process.argv[1]?.endsWith('check-reach.mjs')) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
  const themes = arg('--theme') ? [arg('--theme')] : ['light', 'dark'];
  let bad = 0; let total = 0; let skipped = false;
  for (const theme of themes) {
    const r = await checkReach({ theme, only: arg('--route') });
    if (r.skipped) { skipped = true; break; }
    total += r.checked;
    for (const p of r.problems) { console.log('  ' + p); bad += 1; }
  }
  if (skipped) { console.log('\n!! SKIPPED — no Chrome found. This gate did NOT run.\n'); process.exit(0); }
  console.log(`\n${total} tab stops walked with a real keyboard.`);
  if (!bad) { console.log('✓ every stop is visible, named, and big enough to hit.\n'); process.exit(0); }
  console.log(`\n✗ ${bad} problem(s).\n`);
  process.exit(1);
}
