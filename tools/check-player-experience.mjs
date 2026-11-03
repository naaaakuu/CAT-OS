/** Real player paths, including hit-tested taps, replay and small screens. */
import { launchChrome, serveRepo, findChrome } from './cdp-lite.mjs';
import { SEED, ROUTES } from './check-rendered-contrast.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DB = `const { IndexedDBAdapter } = await import('/src/core/storage/indexeddb-adapter.js'); const st = new IndexedDBAdapter(); await st.init();`;

export async function checkPlayerExperience({ matrix = true, log = () => {} } = {}) {
  if (!findChrome()) return { skipped: true, problems: [], cases: 0, screens: 0 };
  const problems = [];
  let cases = 0, screens = 0;
  const server = await serveRepo();
  const b = await launchChrome({ width: 390, height: 844 });
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const has = (sel) => b.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
  const text = (sel) => b.evaluate(`document.querySelector(${JSON.stringify(sel)})?.textContent ?? ''`);
  async function waitFor(sel, timeout = 12000) {
    const until = Date.now() + timeout;
    while (Date.now() < until) { if (await has(sel)) return; await sleep(100); }
    throw new Error(`Did not reach ${sel}`);
  }
  async function goto(hash) {
    await b.evaluate(`location.hash = ${JSON.stringify(hash)}`);
    await sleep(150);
    await waitFor('#view h1');
    await sleep(180);
  }
  async function tap(sel) {
    await waitFor(sel);
    await b.evaluate(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'center', behavior:'instant'})`);
    await sleep(60);
    const p = await b.evaluate(`(() => {
      const e = document.querySelector(${JSON.stringify(sel)}), r = e.getBoundingClientRect();
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      return {x,y,ok:r.width > 0 && r.height > 0 && !e.disabled && (e === hit || e.contains(hit))};
    })()`);
    assert(p.ok, `A real tap cannot reach ${sel}`);
    for (const type of ['mousePressed', 'mouseReleased']) await b.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
    await sleep(100);
  }
  async function key(key, code, n, modifiers = 0) {
    for (const type of ['rawKeyDown', 'keyUp']) await b.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: n, modifiers });
    await sleep(40);
  }
  async function check(label, fn) {
    try { await fn(); cases += 1; }
    catch (e) { problems.push(`${label}: ${e.message}`); }
    const line = `  ${problems.at(-1)?.startsWith(label + ':') ? '!!' : 'ok'} ${label}`;
    if (!/^\d/.test(label)) { log(line); if (process.argv[1]?.endsWith('check-player-experience.mjs')) console.log(line); }
  }
  async function shot(name) {
    if (!process.env.CATOS_UX_SHOTS) return;
    await mkdir(process.env.CATOS_UX_SHOTS, { recursive: true });
    await b.send('Page.bringToFront');
    const { data } = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
    await writeFile(join(process.env.CATOS_UX_SHOTS, name + '.jpg'), Buffer.from(data, 'base64'));
  }
  try {
    await b.open(server.url + '#/settings', 1500);
    await waitFor('#reading-picker');

    await check('skip to content preserves the active screen', async () => {
      await b.evaluate('document.querySelector(".skip").focus()');
      await key('Enter', 'Enter', 13);
      assert(await b.evaluate('location.hash === "#/settings" && document.activeElement.id === "view"'), 'The skip link navigated away from the game');
      await goto('#/rc/session/%');
      assert(/Screen not found/.test(await text('h1')), 'A malformed link did not offer the way home');
      await goto('#/settings');
    });
    await b.evaluate(`(async () => { ${DB}
      await st.put('settings', {id:'valley', value:{name:'Ashfield',awakened_at:new Date().toISOString(),met_at:new Date().toISOString()}});
      await st.put('settings', {id:'motion',value:'reduced'});
      localStorage.setItem('catos:met-gang','1'); localStorage.setItem('catos:hour','morning');
    })()`);
    await b.open(server.url + '#/settings', 700);
    await waitFor('#reading-picker');

    await check('new records offer a first step', async () => {
      await goto('#/world/place/hearth');
      assert(await has('.records-welcome') && !await has('.figure'), 'A new player is shown a wall of empty statistics');
      await tap('.records-welcome a'); await waitFor('.libroom__shelves');
    });

    await check('renaming the village keeps the open sheet accessible', async () => {
      await goto('#/world'); await tap('[data-open="cottage"]');
      await tap('#cw-name-in'); await b.evaluate('document.querySelector("#cw-name-in").select()');
      await b.send('Input.insertText',{text:'Moonrise'});
      await tap('.cw-name__row button');
      await sleep(180);
      assert(await b.evaluate(`(() => {const card=document.querySelector('.cw-card');return document.getElementById(card.getAttribute('aria-labelledby'))?.textContent==='Moonrise';})()`), 'Saving the name broke the dialog label');
      assert(await b.evaluate('window.__catosBack() && location.hash === "#/world"'), 'Android Back did not dismiss the village sheet');
    });

    await check('a first completion counts for progress', async () => {
      await goto('#/bank/session/pc/pc-0001');
      await tap('cat-option button'); await tap('#lock'); await tap('#next');
      await waitFor('.moment');
      await goto('#/growth');
      assert(await b.evaluate('document.querySelectorAll(".ability").length === 8'), 'Progress still welcomes a player who completed a verbal subject');
    });

    for (const mod of ['ps', 'ooo']) await check(`${mod} thinking coach`, async () => {
      await goto(`#/${mod}/session/${mod}-0001`);
      await tap('#think-open');
      assert(await b.evaluate('!!document.activeElement.closest("[role=dialog]")'), 'Opening the coach leaves focus behind');
      for (let n = 0; n < 5; n += 1) {
        await key('Tab', 'Tab', 9, n % 2 ? 8 : 0);
        assert(await b.evaluate('!!document.activeElement.closest("[role=dialog]")'), 'Tab escaped the coach');
      }
      await key('Escape', 'Escape', 27);
      assert(await b.evaluate('document.activeElement.id === "think-open" && !document.querySelector("[role=dialog]")'), 'Escape did not return to the coach button');
      await tap('#think-open');
      assert(await b.evaluate('window.__catosBack()'), 'Android Back did not consume the open coach');
      assert(!await has('[role="dialog"]'), 'Android Back left the coach open');
      await tap('#think-open'); await goto('#/settings');
      assert(await b.evaluate('document.body.style.overflow !== "hidden" && !document.querySelector("[role=dialog]")'), 'Leaving with the coach open locked the next screen');
    });

    await check('sentence placement announces the selected gap', async () => {
      await goto('#/bank/session/sp/sp-0001');
      await tap('.sp-slot__btn');
      assert(await b.evaluate('document.querySelectorAll(".sp-slot__btn[aria-pressed=true]").length === 1'), 'The selected gap is not announced');
      assert(/sentence|beginning/.test(await b.evaluate('document.querySelector(".sp-slot__btn").getAttribute("aria-label")')), 'The gaps have indistinguishable names');
      await tap('#lock');
      assert(await b.evaluate('document.activeElement.classList.contains("verdict")'), 'Focus did not follow the verdict');
      await tap('#next'); await waitFor('.moment');
    });

    await check('a bank answer survives Android discarding the page', async () => {
      const hash = '#/bank/session/pc/pc-0002';
      await goto(hash); await tap('cat-option button'); await tap('#lock');
      const verdict = await text('cat-explanation .verdict');
      await b.open(server.url + hash, 700); await waitFor('#next');
      assert(await text('cat-explanation .verdict') === verdict, 'A locked bank answer became an unanswered question after reload');
      await tap('#next'); await waitFor('.moment');
    });

    await check('sentence ordering, revision, and completion', async () => {
      await goto('#/pj/session/pj-0001');
      for (const label of ['A','B','C','D']) await tap(`.jcard[data-label="${label}"]`);
      await tap('.jcard[data-label="B"]'); await tap('.jcard[data-label="B"]');
      await tap('#lock'); await waitFor('.pjx-verdict');
      assert(await b.evaluate('document.activeElement.classList.contains("pjx-verdict")'), 'Ordering feedback lost focus');
      await tap('#next'); await waitFor('.moment');
    });

    await check('writing a summary, choosing, and completing', async () => {
      await goto('#/ps/session/ps-0001'); await tap('#own-summary');
      await b.send('Input.insertText',{text:'Unfinished tasks keep the mind engaged until they are completed.'});
      await tap('#builder-lock'); await tap('cat-option button'); await tap('#lock');
      await waitFor('.psx-verdict'); await tap('#next'); await waitFor('.moment');
    });

    await check('building the odd-one-out paragraph', async () => {
      await goto('#/ooo/session/ooo-0001');
      for (const label of ['A','B','C','D']) await tap(`.jcard[data-label="${label}"]`);
      await tap('#lock'); await waitFor('.oox-verdict');
      await tap('#next'); await waitFor('.moment');
    });

    await check('Word DNA prediction and application', async () => {
      await goto('#/wd/session/wd-0001');
      for (let step = 0; step < 8 && !await has('.moment'); step += 1) {
        if (await has('#next')) { await tap('#next'); break; }
        await tap('cat-option:not([disabled]) button'); await tap('#lock');
      }
      await waitFor('.moment');
    });

    await check('growing a root family through every beat', async () => {
      await goto('#/garden/session/lg-0001');
      for (let step = 0; step < 55; step += 1) {
        await sleep(850);
        if (await b.evaluate('!!document.querySelector("#lgx-back:not(.is-veiled)")')) break;
        const sel = await b.evaluate(`['#lgx-reach-choice button:not(:disabled)','#lgx-next:not(:disabled)','.lgx-part:not(.is-revealed)','cat-option:not([disabled]) button'].find(s=>document.querySelector(s)) ?? null`);
        if (sel) await tap(sel);
      }
      await tap('#lgx-back'); await waitFor('.place__title');
      assert(/Rootwood/.test(await text('.place__title')), 'Growth did not return to the Rootwood');
    });

    await check('a word round waits, completes, and replays twice', async () => {
      await goto('#/round/meadow');
      assert(await b.evaluate('getComputedStyle(document.querySelector("#pace")).display === "none"'), 'The unstarted clock is visible');
      for (let replay = 0; replay < 2; replay += 1) {
        await tap('#begin');
        const total = Number((await text('#run-what')).match(/of (\d+)/)?.[1]);
        assert(total > 0, 'The round has no questions');
        for (let i = 0; i < total; i += 1) {
          const at = await text('#run-what');
          await tap('.vopt:not(:disabled)');
          await waitFor('#word-next');
          if (replay === 0 && i === 0) {
            await sleep(2400);
            assert(await text('#run-what') === at, 'The explanation advanced before the player continued');
            await shot('vocabulary-feedback');
          }
          await tap('#word-next');
        }
        await waitFor('.result');
        await tap('.result__actions a');
        await waitFor('#begin');
      }
      await tap('#begin'); await tap('.vopt');
      await goto('#/settings'); await sleep(2400);
      assert(await has('#reading-picker'), 'An abandoned word round replaced the next screen');
    });

    await check('the Gauntlet completes, rewards, and replays twice', async () => {
      await goto('#/world/place/wilds'); await tap('#run');
      for (let replay = 0; replay < 2; replay += 1) {
        await waitFor('.vopt');
        let count = 0;
        while (!await has('.result') && count < 32) {
          await waitFor('.vopt:not(:disabled)', 3000).catch(async (e) => { if (!await has('.result')) throw e; });
          if (await has('.result')) break;
          await tap('.vopt:not(:disabled)');
          await sleep(950);
          count += 1;
        }
        await waitFor('.result');
        assert(await has('.result__pet .pvwin[data-pet="toffee"]'), 'The Gauntlet did not show its friend reward');
        await tap('.result__actions a');
      }
      await waitFor('.vopt'); await tap('.vopt');
      await goto('#/settings'); await sleep(1300);
      assert(await has('#reading-picker'), 'The departed Gauntlet wrote into Settings');
    });

    await check('reading, answering, result, and the library return', async () => {
      await goto('#/rc/session/rc-0040'); await tap('#begin'); await tap('#to-questions');
      assert(await b.evaluate('!document.querySelector(".run__body").contains(document.querySelector("#actions"))'), 'Reading controls still overlay the scrolling lesson');
      await b.evaluate(`window.__clockWrites=0; window.__clockObserver=new MutationObserver(()=>window.__clockWrites++); window.__clockObserver.observe(document.querySelector('#clock'),{childList:true});`);
      await sleep(1100);
      assert(await b.evaluate('window.__clockWrites > 0 && window.__clockWrites < 10'), 'The lesson clock is stalled or needlessly redrawn every frame');
      await b.evaluate('window.__clockObserver.disconnect()');
      for (let i = 0; i < 3; i += 1) {
        await tap('cat-option button'); await tap('#submit');
        if (i === 0) {
          const verdict = await text('cat-explanation .verdict');
          await b.open(server.url + '#/rc/session/rc-0040', 700); await tap('#begin'); await waitFor('#next');
          assert(await text('cat-explanation .verdict') === verdict, 'A locked reading answer became an unanswered question after reload');
          await tap('cat-explanation .evidence');
          assert(await has('.reread[open] .p-flash'), 'The supporting paragraph did not open');
          await tap('#back-to-question');
          assert(!await has('.reread[open]'), 'Back to question left the passage expanded');
        }
        assert(await b.evaluate('document.activeElement.id === "explanation-slot"'), 'Focus did not follow the reading explanation');
        await tap('#next');
      }
      await waitFor('.result');
      await tap('.result__actions a[href="#/world/place/reading-room"]');
      await waitFor('.libroom__shelves');
    });

    await check('passage help needs no typing and keeps explanations accessible', async () => {
      await goto('#/rc/mentor/rc-0040');
      assert(!await has('cat-reflection, textarea, .mentor__reflect-q'), 'Passage help still asks the reader to write');
      assert(await has('.mentor__one-line') && await has('.journey'), 'The main idea or paragraph explanation is missing');
      await tap('.mentor__story > summary');
      assert(await has('.mentor__story[open] .mentor__plain'), 'The simpler retelling cannot be opened');
      await tap('.mentor__deeper > summary');
      assert(await has('.mentor__deeper[open] .vocab'), 'The detailed explanation or vocabulary cannot be opened');
      await tap('.mentor-actions a[href="#/world/place/reading-room"]');
      await waitFor('.libroom__shelves');
    });

    await check('backup and reset can be dismissed without changing progress', async () => {
      await goto('#/settings');
      const before = await b.evaluate(`(async()=>{${DB} return (await st.getAll('sessions')).length})()`);
      await tap('#start-over'); await waitFor('[role="dialog"]'); await key('Escape','Escape',27);
      assert(await b.evaluate('document.activeElement.id === "start-over"'), 'Reset dismissal lost its button');
      await b.evaluate(`(async()=>{${DB}
        const {exportAll}=await import('/src/core/storage/backup.js');const data=await exportAll(st);
        const transfer=new DataTransfer();transfer.items.add(new File([JSON.stringify(data)],'test-backup.json',{type:'application/json'}));
        const input=document.querySelector('#backup-file'); input.files=transfer.files; input.dispatchEvent(new Event('change'));
      })()`);
      await waitFor('[role="dialog"]'); await key('Escape','Escape',27);
      const after = await b.evaluate(`(async()=>{${DB} return (await st.getAll('sessions')).length})()`);
      assert(before === after, 'Dismissing backup/reset changed saved runs');
    });

    if (matrix) {
      await b.evaluate(SEED);
      const base = [...new Set([
        ...ROUTES.filter((r) => !r.enter).map((r) => r.hash),
        ...['table','bench','placement','completion','thicket','terraces'].map((s) => '#/world/place/' + s),
        ...['pj','ps','ooo','wd'].flatMap((m) => [`#/${m}/session/${m}-0001`, `#/${m}/learn/${m}-0001`]),
        '#/bank/session/sp/sp-0001', '#/bank/session/pc/pc-0001', '#/bank/session/wb/next', '#/bank/session/cr/next',
        '#/wd/garden', '#/garden/session/lg-0001', '#/garden/plant/lg-0001', '#/rc/mentor/rc-0040', '#/rc/review/rc-0040', '#/pro',
      ])];
      const narrow = ['#/settings', '#/growth', '#/world/place/reading-room', '#/world/place/table', '#/world/place/rootwood', '#/world/place/wilds',
        '#/pj/session/pj-0001', '#/ps/session/ps-0001', '#/ooo/session/ooo-0001', '#/bank/session/sp/sp-0001', '#/bank/session/pc/pc-0001', '#/round/meadow'];
      for (const theme of ['light','dark']) {
        await b.evaluate(`import('/src/shell/prefs.js').then(m=>m.applyTheme(${JSON.stringify(theme)}))`);
        for (const [width,height] of [[390,844],[320,568],[360,640],[360,360],[844,390],[1280,900]]) {
          await b.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
          for (const hash of width === 390 ? base : narrow) await check(`${width}×${height} ${theme} ${hash}`, async () => {
            await goto(hash); screens += 1;
            const issues = await b.evaluate(`(() => {
              const out=[];
              if(document.documentElement.scrollWidth > innerWidth + 1) out.push('horizontal page overflow');
              if(!document.querySelector('#view h1')) out.push('no screen heading');
              for(const el of document.querySelectorAll('#view [hidden]')) if(getComputedStyle(el).display!=='none') out.push('hidden content is displayed');
              for(const el of document.querySelectorAll('#view button,#view a[href],#view summary')) {
                const s=getComputedStyle(el),r=el.getBoundingClientRect();
                if(!r.width||!r.height||s.visibility==='hidden'||el.closest('[hidden],.sr-only')||s.display==='inline')continue;
                if(r.width<43.5||r.height<43.5)out.push((el.textContent.trim().slice(0,24)||el.getAttribute('aria-label'))+' is '+Math.round(r.width)+'×'+Math.round(r.height));
              }
              return out.slice(0,6);
            })()`);
            assert(!issues.length, issues.join('; '));
            if (hash === '#/settings' || hash === '#/ps/session/ps-0001') await shot(`${theme}-${width}x${height}-${hash.includes('settings')?'settings':'summary'}`);
          });
        }
      }
    }
    const errors = await b.evaluate('window.__catos?.errors ?? []');
    for (const e of errors) problems.push('Browser error: ' + e);
    await check('a new player can skip introductions immediately', async () => {
      await goto('#/settings');
      await b.evaluate(`(async()=>{${DB} for(const name of ['settings','sessions','attempts','learning'])await st.clear(name);localStorage.clear();})()`);
      await goto('#/world'); await tap('.cw-tour-skip'); await sleep(150);
      assert(await b.evaluate('!document.querySelector(".cw").classList.contains("is-intro")'), 'Skipping the tour left the village waiting');
      await tap('.cw-play'); await waitFor('.libroom__shelves');
    });
  } finally { b.close(); server.close(); }
  return { skipped: false, problems, cases, screens };
}

if (process.argv[1]?.endsWith('check-player-experience.mjs')) {
  const r = await checkPlayerExperience({ matrix: !process.argv.includes('--flows-only') });
  if (r.skipped) console.log('SKIPPED: no Chrome; player flows were not tested.');
  else {
    for (const p of r.problems) console.log('  !! ' + p);
    console.log(`${r.cases} player checks passed; ${r.screens} screen/viewport/theme combinations inspected.`);
  }
  process.exit(r.problems.length ? 1 : 0);
}
