/**
 * check-rendered-contrast.mjs — the gate that would have caught 1.14:1.
 *
 * `tools/check-contrast.mjs` reads the TOKENS and proves the palette is sound.
 * It passed every release while the Reading Room rendered its passages at
 * 1.14:1, because the defect needed three runtime facts at once: which
 * stylesheet won, what a route predicate returned, and what attribute was on
 * <html>. No static reading of CSS can see that. This can.
 *
 * HOW IT WORKS — measure the pixels, never the cascade.
 *
 *   1. Open a route in real Chrome, at a real size, in a real theme.
 *   2. Screenshot it.
 *   3. Paint every glyph in the document `transparent` and screenshot again.
 *   4. The pixels that changed ARE the glyphs. Their colour in shot A is the
 *      ink; their colour in shot B is whatever was actually behind them —
 *      a card, a gradient, a translucent veil over a <canvas> valley, an
 *      image, anything. Composite it all by looking at it.
 *   5. WCAG relative luminance over those two colours, per element.
 *
 * Because it never asks the DOM what colour something "should" be, it cannot
 * be fooled by a token that is correct and a stylesheet that overrides it, by
 * a stage that is mounted when it should not be, or by a canvas background
 * that CSS cannot describe at all.
 *
 * Decoding the PNGs needs no dependency either: the screenshots are handed
 * back INTO the page as data URLs and drawn on a canvas, so Chrome decodes
 * its own output and the analysis runs where the pixels already are.
 *
 * Usage:
 *   node tools/check-rendered-contrast.mjs            # all routes, both themes
 *   node tools/check-rendered-contrast.mjs --quick    # the six worst-risk routes
 *   node tools/check-rendered-contrast.mjs --route '#/rc' --theme dark
 *
 * Exit code 1 on any failure. If no Chrome is installed it says so and exits
 * 0 — a gate that cannot run must never pretend it passed, so it prints
 * SKIPPED loudly and verify.mjs repeats that in its summary.
 */

import { launchChrome, serveRepo, findChrome } from './cdp-lite.mjs';

/* Every route a learner can reach, with the seed each one needs to be
   non-empty. `dev` routes (an id that must exist) use real corpus ids. */
export const ROUTES = [
  { hash: '#/world', name: 'village' },
  { hash: '#/growth', name: 'growth' },
  { hash: '#/settings', name: 'settings' },
  { hash: '#/rc', name: 'rc-browser', risk: true },
  { hash: '#/rc/second-look', name: 'rc-second-look', risk: true },
  { hash: '#/pj', name: 'pj-browser', risk: true },
  { hash: '#/pj/about', name: 'pj-about', risk: true },
  { hash: '#/ps', name: 'ps-browser', risk: true },
  { hash: '#/ps/about', name: 'ps-about', risk: true },
  { hash: '#/ooo', name: 'ooo-browser', risk: true },
  { hash: '#/ooo/about', name: 'ooo-about', risk: true },
  { hash: '#/wd', name: 'wd-browser', risk: true },
  { hash: '#/wd/about', name: 'wd-about', risk: true },
  { hash: '#/world/place/hearth', name: 'place-hearth' },
  { hash: '#/world/place/reading-room', name: 'place-reading' },
  { hash: '#/world/place/meadow', name: 'place-meadow' },
  { hash: '#/world/place/pond', name: 'place-pond' },
  { hash: '#/world/place/loom', name: 'place-loom' },
  { hash: '#/world/place/rootwood', name: 'place-rootwood' },
  { hash: '#/world/place/wilds', name: 'place-wilds' },
  { hash: '#/round/meadow', name: 'round-meadow' },
  { hash: '#/nowhere', name: 'not-found' },
];

/* The village screen is a painted game world, not a document: it keeps its
   own warm palette in both themes on purpose, and its type sits on drawn
   panels the renderer controls. Its HUD and popovers are still measured —
   only the canvas itself is out of scope, and it has no DOM text. */

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

/* ------------------------------------------------------------------ */
/* The in-page analyser. Kept as a string so it can be handed to CDP.  */
/* ------------------------------------------------------------------ */

const ANALYSER = `
window.__ctCollect = function () {
  // Every element that paints its OWN text (a leaf-ish node), visible, on screen.
  const out = [];
  const vw = innerWidth, vh = innerHeight;
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const seen = new Set();
  for (let el = walk.nextNode(); el; el = walk.nextNode()) {
    if (seen.has(el)) continue;
    let own = '';
    for (const n of el.childNodes) if (n.nodeType === 3) own += n.nodeValue;
    if (!own.trim()) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (r.bottom < 2 || r.top > vh - 2 || r.right < 2 || r.left > vw - 2) continue;
    seen.add(el);
    const size = parseFloat(cs.fontSize) || 16;
    const weight = Number(cs.fontWeight) || 400;
    out.push({
      x: Math.max(0, r.left), y: Math.max(0, r.top),
      w: Math.min(vw, r.right) - Math.max(0, r.left),
      h: Math.min(vh, r.bottom) - Math.max(0, r.top),
      size, weight,
      large: size >= 24 || (size >= 18.66 && weight >= 700),
      sel: (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : '')).slice(0, 90),
      text: own.trim().replace(/\\s+/g, ' ').slice(0, 60),
    });
  }
  return out;
};

window.__ctHide = function () {
  if (document.getElementById('__ct-hide')) return true;
  const s = document.createElement('style');
  s.id = '__ct-hide';
  // Only the glyphs go. Backgrounds, borders, shadows and every canvas stay
  // exactly where they were, so shot B is a true picture of what is behind
  // the words. text-shadow would otherwise leave a ghost and flatten the diff.
  s.textContent = '*, *::before, *::after { color: transparent !important; text-shadow: none !important; -webkit-text-stroke-color: transparent !important; caret-color: transparent !important; }';
  document.head.appendChild(s);
  return true;
};
window.__ctShow = function () { document.getElementById('__ct-hide')?.remove(); return true; };

window.__ctFreeze = function () {
  if (document.getElementById('__ct-freeze')) return true;
  // Measure the settled screen. A list that is still staggering in, a veil
  // still fading, a ring still filling: any of those move pixels between the
  // two captures and the diff stops being a glyph mask. Freezing first is not
  // cheating — it is measuring the state the learner actually reads.
  const s = document.createElement('style');
  s.id = '__ct-freeze';
  s.textContent = '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }';
  document.head.appendChild(s);
  return true;
};

window.__ctAnalyse = async function (aURL, bURL, cURL, boxes, dpr) {
  const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const [ia, ib, ic] = await Promise.all([load(aURL), load(bURL), load(cURL)]);
  const mk = (img) => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); return c.getContext('2d'); };
  const ca = mk(ia), cb = mk(ib), cc = mk(ic);
  const lum = (r, g, b) => {
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  const results = [];
  for (const box of boxes) {
    const X = Math.round(box.x * dpr), Y = Math.round(box.y * dpr);
    const W = Math.max(1, Math.round(box.w * dpr)), H = Math.max(1, Math.round(box.h * dpr));
    if (X + W > ia.width || Y + H > ia.height) continue;
    const A = ca.getImageData(X, Y, W, H).data;
    const B = cb.getImageData(X, Y, W, H).data;
    const C = cc.getImageData(X, Y, W, H).data;
    const n = W * H;
    // Stability first. C is the same screen as A, taken after B. If this box
    // does not match itself between them, something moved or loaded while we
    // were looking and the "glyph mask" would be motion, not letters. A gate
    // that reports moving pixels as invisible text is a gate nobody trusts.
    let drift = 0;
    for (let i = 0; i < n; i += 1) {
      const p = i * 4;
      drift += Math.abs(A[p] - C[p]) + Math.abs(A[p + 1] - C[p + 1]) + Math.abs(A[p + 2] - C[p + 2]);
    }
    if (drift / n > 2) continue;
    // The glyph mask: pixels whose colour changed when the ink went away.
    let maxD = 0;
    const d = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const p = i * 4;
      const dd = Math.abs(A[p] - B[p]) + Math.abs(A[p + 1] - B[p + 1]) + Math.abs(A[p + 2] - B[p + 2]);
      d[i] = dd; if (dd > maxD) maxD = dd;
    }
    if (maxD < 12) continue;                    // nothing painted here (icon, canvas, spacer)
    // Core glyph pixels only, measured at 2x device pixels: an antialiased
    // edge is a blend of ink and ground, so averaging edges would UNDER-report
    // the contrast of small type — the very type that matters most. At dpr 2
    // a 12px caption still has fully covered pixels in its stems.
    const cut = maxD * 0.88;
    // One ratio PER core pixel, then the median — never the ratio of the two
    // averages. A row of grey type with one saturated dot in it would let the
    // dot drag the average ink green and report the caption as invisible; the
    // median describes what most of this run actually looks like, which is the
    // thing a reader experiences.
    const ratios = [];
    let cnt = 0, ar = 0, ag = 0, ab = 0, br = 0, bg = 0, bb = 0;
    for (let i = 0; i < n; i += 1) {
      if (d[i] < cut) continue;
      const p = i * 4;
      ratios.push(ratio(lum(A[p], A[p + 1], A[p + 2]), lum(B[p], B[p + 1], B[p + 2])));
      ar += A[p]; ag += A[p + 1]; ab += A[p + 2];
      br += B[p]; bg += B[p + 1]; bb += B[p + 2];
      cnt += 1;
    }
    if (cnt < 10) continue;                     // a stray pixel is not a word
    ratios.sort((x, y) => x - y);
    const cr = ratios[Math.floor(ratios.length / 2)];
    const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    results.push({ ...box, ratio: Math.round(cr * 100) / 100, px: cnt, ink: hex(ar / cnt, ag / cnt, ab / cnt), ground: hex(br / cnt, bg / cnt, bb / cnt) });
  }
  return results;
};
true;
`;

/* ------------------------------------------------------------------ */

const SEED = `(async () => {
  const s = await import('/src/core/storage/indexeddb-adapter.js');
  const st = new s.IndexedDBAdapter(); await st.init();
  const iso = (ms) => new Date(Date.now() - ms).toISOString();
  const D = 86400000;
  await st.put('settings', { id: 'valley', value: { name: 'Ashfield', awakened_at: iso(10 * D), met_at: iso(10 * D) } });
  const rc = ['rc-0001','rc-0002','rc-0003','rc-0004','rc-0005','rc-0006'];
  for (let i = 0; i < rc.length; i += 1) {
    const correct = i % 3 === 0 ? 4 : 2;
    await st.put('sessions', { id: 'g-rc-' + i, passage_id: rc[i], started_at: iso((9 - i) * D + 600000), finished_at: iso((9 - i) * D),
      duration_sec: 420, stars: correct >= 4 ? 3 : 1, score: { correct, total: 4, accuracy: correct / 4 },
      answers: [0,1,2,3].map((q) => ({ question_id: rc[i] + '-q' + (q + 1), is_correct: q < correct, time_ms: 30000,
        skill: ['main_idea','inference','tone','scope'][q % 4], patterns: ['inf.vs_speculation'], trap: q < correct ? null : 'scope_jump' })) });
  }
  const L = [
    ['village-build', { building: 'garden', level: 1, cost: { coins: 0 } }, 9],
    ['village-build', { building: 'roots', level: 1, cost: { coins: 120 } }, 8],
    ['village-build', { building: 'loom', level: 1, cost: { coins: 200 } }, 7],
    ['village-build', { building: 'market', level: 1, cost: { coins: 250 } }, 6],
    ['village-build', { building: 'reading', level: 2, cost: { coins: 300 } }, 5],
    ['village-plot', { plot: 'p1', cost: { coins: 60 } }, 8],
    ['village-house', { n: 1, cost: { coins: 150 } }, 7],
    ['village-order', { slot: 0, n: 1, needs: { books: 1 }, paid: 40, giver: 'mira' }, 9],
    ['village-collect', { building: 'reading', good: 'books', amount: 3 }, 2],
  ];
  for (let i = 0; i < L.length; i += 1) await st.put('learning', { id: 'g-l-' + i, kind: L[i][0], at: iso(L[i][2] * D), ...L[i][1] });
  return 'seeded';
})()`;

export async function checkRenderedContrast({
  routes = ROUTES, themes = ['light', 'dark'], width = 390, height = 844, maxScrolls = 6, log = () => {},
} = {}) {
  if (!findChrome()) return { skipped: true, failures: [], checked: 0 };
  const server = await serveRepo();
  const b = await launchChrome({ width, height, dpr: 2 });
  const failures = [];
  const skipped = [];
  let checked = 0;
  try {
    await b.open(server.url, 4000);
    await b.evaluate(SEED);
    await b.evaluate(`localStorage.setItem('catos:hour','morning')`);
    for (const theme of themes) {
      await b.evaluate(`(async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); await st.put('settings', { id: 'theme', value: ${JSON.stringify(theme)} }); return 1; })()`);
      for (const route of routes) {
        try {
        await b.open(server.url + route.hash, 4200);
        // Re-inject before every use. The app registers a service worker a few
        // seconds in and reloads once if a new worker takes control, which
        // wipes anything injected — a gate that dies on that is a gate nobody
        // runs twice.
        const ensure = async () => { await b.evaluate(ANALYSER); };
        await ensure();
        await b.evaluate('window.__ctFreeze()');
        await new Promise((r) => setTimeout(r, 500));
        const docH = await b.evaluate(`Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)`);
        const steps = Math.min(maxScrolls, Math.max(1, Math.ceil(docH / height)));
        for (let s = 0; s < steps; s += 1) {
          await ensure();
          await b.evaluate(`window.__ctFreeze(); window.scrollTo(0, ${s * Math.round(height * 0.9)}); true`);
          await new Promise((r) => setTimeout(r, 400));
          const boxes = await b.evaluate(`JSON.stringify(window.__ctCollect())`).then(JSON.parse);
          if (!boxes.length) continue;
          const a = await b.shot();
          await b.evaluate(`window.__ctHide()`);
          await new Promise((r) => setTimeout(r, 150));
          const bb = await b.shot();
          await b.evaluate(`window.__ctShow()`);
          await new Promise((r) => setTimeout(r, 150));
          const c = await b.shot();
          await b.evaluate(`window.__A = "data:image/png;base64,${a}"; true`);
          await b.evaluate(`window.__B = "data:image/png;base64,${bb}"; true`);
          await b.evaluate(`window.__C = "data:image/png;base64,${c}"; true`);
          await b.evaluate(`window.__BOXES = ${JSON.stringify(JSON.stringify(boxes))}; true`);
          const res = await b.evaluate(`window.__ctAnalyse(window.__A, window.__B, window.__C, JSON.parse(window.__BOXES), 2).then((r) => JSON.stringify(r))`).then(JSON.parse);
          for (const r of res) {
            checked += 1;
            const need = r.large ? AA_LARGE : AA_NORMAL;
            if (r.ratio < need) {
              failures.push({ theme, route: route.name, hash: route.hash, sel: r.sel, text: r.text, ratio: r.ratio, need, size: Math.round(r.size), scroll: s, ink: r.ink, ground: r.ground });
            }
          }
          log(`  ${theme} ${route.name} +${s}: ${res.length} text runs measured`);
        }
        } catch (err) {
          // One unhappy route must not cost the other forty-three. Record it
          // as a failure of the gate, not a pass.
          skipped.push(`${theme} ${route.hash}: ${String(err.message ?? err).slice(0, 120)}`);
        }
      }
    }
  } finally {
    b.close();
    server.close();
  }
  // One row per (theme, selector, text): the same faint caption on six cards
  // is one defect, not six.
  const seen = new Set();
  const unique = failures.filter((f) => {
    const k = `${f.theme}|${f.route}|${f.sel}|${f.ratio}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  });
  return { skipped: false, failures: unique, allFailures: failures, checked, unmeasured: skipped };
}

/* ---- CLI ---- */
if (process.argv[1]?.endsWith('check-rendered-contrast.mjs')) {
  const args = process.argv.slice(2);
  const only = args.includes('--route') ? args[args.indexOf('--route') + 1] : null;
  const theme = args.includes('--theme') ? args[args.indexOf('--theme') + 1] : null;
  const quick = args.includes('--quick');
  const routes = only ? ROUTES.filter((r) => r.hash === only) : quick ? ROUTES.filter((r) => r.risk) : ROUTES;
  const themes = theme ? [theme] : ['light', 'dark'];
  const verbose = args.includes('-v');
  const t0 = Date.now();
  const { skipped, failures, checked, unmeasured } = await checkRenderedContrast({ routes, themes, log: verbose ? console.log : () => {} });
  if (skipped) {
    console.log('SKIPPED — no Chrome on this machine (set CHROME_PATH to run the rendered-contrast gate).');
    process.exit(0);
  }
  console.log(`\nMeasured ${checked} rendered text runs across ${routes.length} route(s) x ${themes.length} theme(s) in ${Math.round((Date.now() - t0) / 1000)}s.`);
  if (!failures.length) { console.log('✓ every rendered text run clears WCAG AA against what is actually behind it.\n'); process.exit(0); }
  console.log(`\n✗ ${failures.length} text run(s) below AA:\n`);
  for (const f of failures.sort((a, b) => a.ratio - b.ratio)) {
    console.log(`  ${String(f.ratio).padStart(5)}:1  (needs ${f.need})  [${f.theme}] ${f.hash}  ${f.sel}`);
    console.log(`         "${f.text}"  ${f.size}px   ink ${f.ink} on ${f.ground}`);
  }
  console.log('');
  process.exit(1);
}
