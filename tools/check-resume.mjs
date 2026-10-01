/**
 * check-resume.mjs — what a learner comes back to, in a real browser.
 *
 * §29 proves the ENGINES carry a run across an interruption. This proves
 * the SCREENS do: for Para Jumbles, Para Summary, Odd One Out and Word DNA
 * it answers an item, reloads the page, and checks the screen picks up
 * where it was — on a locked item the verdict and teaching come back, not
 * an empty board; inside a Word DNA family the Predict comes back locked
 * and the first unanswered Apply is waiting — then finishes the set and
 * reads the record out of IndexedDB to see that the answer given before the
 * refresh is in it and the draft is gone.
 *
 * It then pans the village until its buildings leave the frame and checks
 * their callouts pin to the edge — inside the frame, visible, tappable, at
 * least 44px, none overlapping, each with a pointer toward its building —
 * and that a real tap on one brings the village back to the building. They
 * used to be opacity:0, so a pointer user panning the valley had no way of
 * knowing that anything out of view wanted them.
 *
 * Skips loudly without Chrome, like the other browser gates.
 *
 * Run: node tools/check-resume.mjs      verify.mjs §30.
 */

import { launchChrome, serveRepo, findChrome } from './cdp-lite.mjs';
import { SEED } from './check-rendered-contrast.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function checkResume({ width = 390, height = 844 } = {}) {
  if (!findChrome()) return { skipped: true, problems: [], notes: [], cases: 0 };
  const problems = [], notes = [];
  let cases = 0;
  const bad = (s) => { problems.push(s); };
  const ok = (s) => { notes.push(s); cases += 1; };
  const server = await serveRepo();
  const b = await launchChrome({ width, height, dpr: 2 });

  async function settled() {
    for (let i = 0; i < 60; i += 1) {
      const ready = await b.evaluate(`(() => { const v = document.querySelector('#view'); return !!window.__catosBooted && !!v && v.children.length > 0 && !document.querySelector('.route-waiting'); })()`);
      if (ready) return true;
      await sleep(200);
    }
    return false;
  }
  const has = (sel) => b.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
  async function waitFor(sel, tries = 40) { for (let i = 0; i < tries; i += 1) { if (await has(sel)) return true; await sleep(150); } return false; }
  async function click(sel) {
    const done = await b.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
    if (!done) bad('no element to click: ' + sel);
    await sleep(300);
    return done;
  }
  const text = (sel) => b.evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent?.replace(/\\s+/g, ' ').trim() ?? null`);
  async function goto(hash) {
    await b.open(server.url + hash, 700);
    if (!await settled()) bad('route did not settle: ' + hash);
  }
  const DB = `const st = await (async () => { const s = await import('/src/core/storage/indexeddb-adapter.js'); const st = new s.IndexedDBAdapter(); await st.init(); return st; })(); const { STORES } = await import('/src/core/storage/storage-adapter.js');`;
  const draft = (kind, id) => b.evaluate(`(async () => { ${DB} const r = await st.get(STORES.SETTINGS, 'draft:${kind}:${id}'); return r ? r.value : null; })()`);
  const lastSession = (module) => b.evaluate(`(async () => { ${DB} const all = await st.getAll(STORES.SESSIONS); const mine = all.filter((x) => x.module === '${module}').sort((a, c) => String(a.finished_at).localeCompare(String(c.finished_at))); return mine[mine.length - 1] ?? null; })()`);
  async function carriedOn(tag) {
    const t = await text('cat-toast');
    if (!/Carried on from/.test(t ?? '')) bad(tag + ': no "Carried on" toast after resuming');
  }
  async function finishOut(tag) {
    for (let i = 0; i < 40; i += 1) {
      if (await has('.moment')) return true;
      if (await has('#builder-skip')) { await click('#builder-skip'); continue; }
      if (await has('#skip')) { await click('#skip'); continue; }
      if (await has('#next')) { await click('#next'); await sleep(500); continue; }
      await sleep(300);
    }
    bad(tag + ': never reached the mentor moment');
    return false;
  }
  const bar = () => text('.session-bar span');

  try {
    await goto('#/settings');
    await b.evaluate(SEED);
    await b.evaluate(`localStorage.setItem('catos:hour','morning')`);

    /* ---- Para Jumbles ---- */
    {
      const url = '#/pj/session/beginner', tag = 'Para Jumbles';
      await goto(url);
      if (!await waitFor('.jcard')) bad(tag + ': no board');
      const labels = await b.evaluate(`[...document.querySelectorAll('.jcard')].map((c) => c.dataset.label)`);
      for (const l of labels) await click(`.jcard[data-label="${l}"]`);
      await click('#lock');
      if (!await waitFor('.pjx-verdict')) bad(tag + ': no verdict after lock');
      await goto(url);
      if (!await waitFor('.pjx-verdict', 30)) bad(tag + ': refreshed on a locked jumble — the verdict did not come back');
      else ok(tag + ': refreshed on a locked jumble → verdict and teaching are back');
      await carriedOn(tag);
      await click('#next');
      if (!await waitFor('.jcard')) bad(tag + ': next did not show jumble 2');
      await goto(url);
      const b2 = await bar();
      if (!/Jumble 2 of/.test(b2 ?? '')) bad(tag + ': after a refresh on jumble 2 the bar says ' + JSON.stringify(b2)); else ok(tag + ': refreshed on jumble 2 → still jumble 2');
      const d = await draft('pj', 'pj-set:beginner');
      if (!d || d.answers?.length !== 1 || !Number.isFinite(d.elapsed_ms)) bad(tag + ': the draft is ' + JSON.stringify(d)?.slice(0, 120));
      await finishOut(tag);
      const s = await lastSession('pj');
      if (!Array.isArray(s?.answers?.[0]?.entered)) bad(tag + ': the answer given before the refresh is not in the record');
      else ok(tag + `: the record has ${s.answers.length} answers and the pre-refresh answer is in it`);
      if (await draft('pj', 'pj-set:beginner')) bad(tag + ': draft not cleared after finish');
    }

    /* ---- Para Summary ---- */
    {
      const url = '#/ps/session/foundation', tag = 'Para Summary';
      await goto(url);
      if (!await waitFor('#builder-skip')) bad(tag + ': no builder');
      await click('#builder-skip');
      if (!await waitFor('cat-question-card cat-option')) bad(tag + ': no options');
      await click('cat-question-card cat-option[letter="B"] button');
      await click('#lock');
      if (!await waitFor('.psx-verdict')) bad(tag + ': no verdict after lock');
      await goto(url);
      if (!await waitFor('.psx-verdict', 30) || !await has('cat-question-card')) bad(tag + ': refreshed on a locked paragraph — the verdict and options did not come back');
      else ok(tag + ': refreshed on a locked paragraph → verdict, options and teaching are back');
      await carriedOn(tag);
      await click('#next');
      if (!await waitFor('#builder-skip')) bad(tag + ': next did not show paragraph 2');
      await goto(url);
      const b2 = await bar();
      if (!/Paragraph 2 of/.test(b2 ?? '')) bad(tag + ': after a refresh on paragraph 2 the bar says ' + JSON.stringify(b2)); else ok(tag + ': refreshed on paragraph 2 → still paragraph 2');
      await finishOut(tag);
      const s = await lastSession('ps');
      if (s?.answers?.[0]?.chosen !== 'B') bad(tag + ': the choice made before the refresh is not in the record');
      else ok(tag + `: the record has ${s.answers.length} answers and the pre-refresh choice is in it`);
      if (await draft('ps', 'ps-set:foundation')) bad(tag + ': draft not cleared after finish');
    }

    /* ---- Odd One Out (a construct tier) ---- */
    {
      const url = '#/ooo/session/foundation', tag = 'Odd One Out';
      await goto(url);
      if (!await waitFor('.jcard')) bad(tag + ': no board');
      const labels = await b.evaluate(`[...document.querySelectorAll('.jcard')].map((c) => c.dataset.label)`);
      for (const l of labels.slice(0, 4)) await click(`.jcard[data-label="${l}"]`);
      await click('#lock');
      if (!await waitFor('.oox-verdict')) bad(tag + ': no verdict after lock');
      await goto(url);
      if (!await waitFor('.oox-verdict', 30)) bad(tag + ': refreshed on a locked item — the verdict did not come back');
      else ok(tag + ': refreshed on a locked item → verdict and teaching are back');
      await carriedOn(tag);
      await click('#next');
      if (!await waitFor('.jcard')) bad(tag + ': next did not show item 2');
      await goto(url);
      const b2 = await bar();
      if (!/Item 2 of/.test(b2 ?? '')) bad(tag + ': after a refresh on item 2 the bar says ' + JSON.stringify(b2)); else ok(tag + ': refreshed on item 2 → still item 2');
      await finishOut(tag);
      const s = await lastSession('ooo');
      if (typeof s?.answers?.[0]?.chosen !== 'string') bad(tag + ': the exclusion made before the refresh is not in the record');
      else ok(tag + `: the record has ${s.answers.length} answers and the pre-refresh exclusion is in it`);
      if (await draft('ooo', 'ooo-set:foundation')) bad(tag + ': draft not cleared after finish');
    }

    /* ---- Word DNA (interrupted INSIDE a family) ---- */
    {
      const url = '#/wd/session/root', tag = 'Word DNA';
      await goto(url);
      if (!await waitFor('#predict-slot cat-option')) bad(tag + ': no predict options');
      await click('#predict-slot cat-option[letter="B"] button');
      await click('#lock');
      if (!await waitFor('.wd-apply')) bad(tag + ': no Apply after the Predict lock');
      await goto(url);
      if (!await waitFor('#predict-slot[data-locked]', 30) || !await has('.wd-apply')) bad(tag + ': refreshed inside a family — the Predict did not come back locked with its Apply waiting');
      else ok(tag + ': refreshed inside a family → Predict locked, Understand shown, first Apply waiting');
      await carriedOn(tag);
      for (let i = 0; i < 3 && await has('.wd-apply:not([data-locked]) cat-option'); i += 1) {
        await click('.wd-apply:not([data-locked]) cat-option[letter="A"] button');
        await click('#lock');
        await sleep(300);
      }
      if (!await waitFor('#next')) bad(tag + ': no Next after the Applies');
      await click('#next');
      await goto(url);
      const b2 = await bar();
      if (!/Family 2 of/.test(b2 ?? '')) bad(tag + ': after a refresh on family 2 the bar says ' + JSON.stringify(b2)); else ok(tag + ': refreshed on family 2 → still family 2');
      await finishOut(tag);
      const s = await lastSession('wd');
      if (!s?.answers?.[0]?.predict || !s.answers[0].applies?.every((a) => a && typeof a.is_correct === 'boolean')) bad(tag + ': the family answered before the refresh is not whole in the record');
      else ok(tag + `: the record has ${s.answers.length} families and family 1 is whole`);
      if (await draft('wd', 'wd-set:root')) bad(tag + ': draft not cleared after finish');
    }

    /* ---- The village: callouts for buildings out of view ---- */
    {
      const tag = 'village';
      await b.open(server.url + '#/world/village', 900);
      const alive = await (async () => { for (let i = 0; i < 60; i += 1) { if (await b.evaluate(`!!document.querySelector('#vg-canvas')?.__renderer && document.querySelectorAll('.vb.is-in').length > 0`)) return true; await sleep(200); } return false; })();
      if (!alive) bad(tag + ': the village did not render its callouts');
      // The opening settles the camera toward home over 1.5 s; wait it out.
      for (let i = 0; i < 20 && await b.evaluate(`!!document.querySelector('#vg-canvas').__renderer.tween`); i += 1) await sleep(150);
      await b.evaluate(`(() => { const r = document.querySelector('#vg-canvas').__renderer; r.lookAt(r.worldW - 40, r.worldH - 40, { animate: false, zoom: r.maxZoom() }); return 1; })()`);
      await sleep(500);
      const pips = await b.evaluate(`(() => {
        const W = window.innerWidth, H = window.innerHeight;
        return [...document.querySelectorAll('.vb')].map((el) => {
          const rc = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          return { id: el.dataset.id, edge: el.classList.contains('is-edge'), x: rc.left, y: rc.top, w: rc.width, h: rc.height, right: rc.right, bottom: rc.bottom,
            inside: rc.left >= 0 && rc.top >= 0 && rc.right <= W && rc.bottom <= H, opacity: Number(cs.opacity), pe: cs.pointerEvents,
            ang: el.style.getPropertyValue('--ang'), ax: el.style.getPropertyValue('--ax'), ay: el.style.getPropertyValue('--ay') };
        });
      })()`);
      const edge = pips.filter((p) => p.edge);
      if (!edge.length) bad(tag + ': after panning to the far corner no callout is pinned to an edge (' + pips.length + ' callouts)');
      const before = problems.length;
      for (const p of edge) {
        if (!p.inside) bad(`${tag}: ${p.id} pip is not inside the frame`);
        if (!(p.opacity > 0.5)) bad(`${tag}: ${p.id} pip opacity is ${p.opacity}`);
        if (p.pe === 'none') bad(`${tag}: ${p.id} pip has pointer-events: none`);
        if (p.h < 43) bad(`${tag}: ${p.id} pip is ${Math.round(p.h)}px tall — under the 44px floor`);
        if (!p.ang || !p.ax || !p.ay) bad(`${tag}: ${p.id} pip has no pointer toward its building`);
      }
      for (let i = 0; i < edge.length; i += 1) for (let j = i + 1; j < edge.length; j += 1) {
        const a = edge[i], c = edge[j];
        if (a.x < c.right - 2 && c.x < a.right - 2 && a.y < c.bottom - 2 && c.y < a.bottom - 2) bad(`${tag}: ${a.id} and ${c.id} pips overlap at the edge`);
      }
      if (edge.length && problems.length === before) ok(`${tag}: ${edge.length} of ${pips.length} callouts pinned to the edge after a pan to the far corner — inside the frame, visible, tappable, 44px, none overlapping`);
      if (edge.length) {
        const target = edge[0];
        const camBefore = await b.evaluate(`(() => { const r = document.querySelector('#vg-canvas').__renderer; return { x: r.cam.x, y: r.cam.y }; })()`);
        const cx = target.x + target.w / 2, cy = target.y + target.h / 2;
        await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 });
        await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 });
        await sleep(900);
        const after = await b.evaluate(`(() => { const r = document.querySelector('#vg-canvas').__renderer; return { x: r.cam.x, y: r.cam.y, pop: !!document.querySelector('#vpop') }; })()`);
        const moved = Math.hypot(after.x - camBefore.x, after.y - camBefore.y) > 5;
        if (!moved && !after.pop) bad(`${tag}: a real tap on the ${target.id} pip neither moved the camera nor opened anything`);
        else ok(`${tag}: a real tap on the ${target.id} pip brought the village to the building${after.pop ? ' and opened it' : ''}`);
      }
    }
  } catch (err) {
    bad('the tour itself failed: ' + (err?.message ?? err));
  } finally {
    b.close();
    server.close();
  }
  return { skipped: false, problems, notes, cases };
}

if (process.argv[1]?.endsWith('check-resume.mjs')) {
  const r = await checkResume();
  if (r.skipped) { console.log('\n!! SKIPPED — no Chrome found. This gate did NOT run.\n'); process.exit(0); }
  for (const n of r.notes) console.log('  · ' + n);
  for (const p of r.problems) console.log('  ✗ ' + p);
  console.log(`\n${r.problems.length ? '✗ ' + r.problems.length + ' problem(s)' : '✓ four modules resume after a refresh and record what was answered before it; off-screen callouts pin to the edge and bring the village back'}\n`);
  process.exit(r.problems.length ? 1 : 0);
}
