/**
 * hearth.js (screen) — home, and the Workshop.
 *
 * The Hearth answers "what am I building?", "what do I need?" and "what
 * should I practise to get it?" in one place. Three panels:
 *
 *   WORKSHOP  every work the valley can hold, in three stages. Each shows
 *             its cost in crafts (short ones marked), the standing it
 *             asks of your learning, and — when both are met — a Build
 *             button that changes the world for good.
 *   TODAY     the day's three asks, and what they pay.
 *   STANDING  the honest read on where this learner is, and the records.
 *
 * Building is the product's biggest moment, so it is slow on purpose:
 * the button, the sound, the line, and then the valley, changed.
 */

import { WorldRenderer } from '../engine/canvas.js';
import { buildBackdropScene } from '../engine/map.js';
import { regionBySlug, REGIONS } from '../regions.js';
import { loadWorld } from '../state.js';
import { WORK_STAGES, bagEntries, CRAFTS } from '../economy.js';
import { costChips, purseHTML, chips as craftChips } from '../craft-ui.js';
import { standing as standingLines, readingWeakness } from '../curator.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { play, unlock, startMusic, startAmbience } from '../audio.js';
import { escapeHTML } from '../../core/utils/format.js';

export async function renderHearth(outlet, { storage }) {
  document.documentElement.setAttribute('data-world', '');
  const region = regionBySlug('hearth');

  let world;
  try { world = await loadWorld(storage); } catch (err) {
    outlet.innerHTML = `<section class="place"><div class="place__body"><h1 class="place__title">The Hearth will not open</h1><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }
  let { state } = world;
  const atmo = state.atmo;
  // A query after the route is a hint for this screen, never part of the
  // match (the router strips it): ?works=1 opens the Workshop, ?you=1 the
  // standing. The menu is the only thing that sends them.
  const openWorks = location.hash.includes('works=1');
  const openYou = location.hash.includes('you=1');

  outlet.innerHTML = `
    <section class="place place--hearth">
      <div class="place__hero place__hero--short">
        <canvas id="hero" aria-label="The Hearth"></canvas>
        <a class="place__back" href="#/world" id="back">← The valley</a>
        <div class="place__hero-stat"><span class="purse purse--static">${purseHTML(state.purse)}</span></div>
      </div>
      <div class="place__body" id="body">
        <p class="place__eyebrow">Home</p>
        <h1 class="place__title">The Hearth</h1>
        <p class="place__line" id="hearth-line"></p>
        <div class="tabs" role="tablist">
          <button class="tab" data-tab="works" role="tab">The Workshop</button>
          <button class="tab" data-tab="today" role="tab">Today</button>
          <button class="tab" data-tab="you" role="tab">Standing</button>
        </div>
        <div id="panel"></div>
      </div>
    </section>`;

  outlet.querySelector('#back').addEventListener('click', () => { sessionStorage.setItem('world:focus', 'hearth'); play('close'); });

  /* ---- The hero ---- */
  let renderer = null;
  const mountHero = () => {
    renderer?.destroy();
    const canvas = outlet.querySelector('#hero');
    if (!canvas) return;
    const scene = buildBackdropScene('hearth', state, atmo);
    renderer = new WorldRenderer(canvas, scene, { worldW: scene.W, worldH: scene.H, fit: 'cover', pannable: false, minZoom: 0.3, maxZoom: 8 });
    renderer.lookAt(scene.W / 2, 150, { animate: false });
    renderer.start();
  };
  mountHero();
  const onHash = () => { renderer?.destroy(); window.removeEventListener('hashchange', onHash); };
  window.addEventListener('hashchange', onHash);
  const warmth = Math.min(1, (state.builds.length / 12) * 0.6 + Math.min(1, state.stars / 90) * 0.4);
  const onDown = () => { unlock(); startMusic('hearth', { hour: atmo.hour, warmth }); startAmbience('hearth', atmo); };
  window.addEventListener('pointerdown', onDown, { capture: true, once: true });
  startMusic('hearth', { hour: atmo.hour, warmth }); startAmbience('hearth', atmo);

  const panel = outlet.querySelector('#panel');
  const lineEl = outlet.querySelector('#hearth-line');

  const headline = () => {
    const ready = state.readyWorks.length;
    if (ready) return `${ready === 1 ? 'One work is' : `${ready} works are`} ready to build. This is where the valley changes.`;
    const next = state.nextWork;
    if (next) return `Next: <b>${escapeHTML(next.name)}</b>. ${next.hasStanding ? 'You have the standing — it needs crafts.' : escapeHTML(next.standing.line)}`;
    return 'Every work in the valley is standing. The rest is reading.';
  };
  lineEl.innerHTML = headline();

  /* ---- Panels ---- */
  function renderWorks() {
    const byStage = WORK_STAGES.map((st) => ({ ...st, works: state.works.filter((w) => w.stage === st.n) }));
    panel.innerHTML = `
      <div class="purse-row" aria-label="Your crafts">${CRAFTS.map((c) => `
        <div class="purse-row__c craft--${c.key}">
          <i aria-hidden="true"></i>
          <b>${state.purse[c.key] ?? 0}</b>
          <span>${c.name}</span>
          <small>${escapeHTML(c.from)}</small>
        </div>`).join('')}
      </div>
      ${byStage.map((st) => {
        const open = st.works.filter((w) => !w.built);
        const done = st.works.filter((w) => w.built);
        if (!open.length && !done.length) return '';
        return `
        <section class="stage">
          <h2 class="stage__name">${escapeHTML(st.name)} <span>${done.length}/${st.works.length}</span></h2>
          <p class="stage__line">${escapeHTML(st.line)}</p>
          ${open.map(workCard).join('')}
          ${done.length ? `<div class="stage__done">${done.map((w) => `<span class="built">✓ ${escapeHTML(w.name)}</span>`).join('')}</div>` : ''}
        </section>`;
      }).join('')}`;
    for (const btn of panel.querySelectorAll('[data-build]')) {
      btn.addEventListener('click', () => build(btn.dataset.build));
    }
  }

  function workCard(w) {
    const blocked = w.blockedBy.length > 0;
    const cls = w.ready ? 'is-ready' : blocked ? 'is-blocked' : w.hasStanding ? 'is-waiting' : 'is-locked';
    return `
      <article class="work ${cls}">
        <div class="work__head">
          <h3 class="work__name">${escapeHTML(w.name)}</h3>
          ${w.ready ? '<span class="work__flag">Ready</span>' : ''}
        </div>
        <p class="work__line">${escapeHTML(w.line)}</p>
        <div class="work__cost">${costChips(w.cost, state.purse)}</div>
        <p class="work__standing ${w.hasStanding ? 'is-met' : ''}">
          <span class="tick" aria-hidden="true">${w.hasStanding ? '✓' : '○'}</span>${escapeHTML(w.standing.line)}
        </p>
        ${blocked ? `<p class="work__blocked">Needs ${escapeHTML(w.blockedBy.join(', '))} first.</p>` : ''}
        ${w.ready ? `<button class="g-cta g-cta--gold" data-build="${w.id}">Build it<span class="arrow" aria-hidden="true">→</span></button>`
          : !w.hasStanding ? `<p class="work__hint">Practise to earn the standing.</p>`
            : blocked ? '' : `<p class="work__hint">Short: ${escapeHTML(bagEntries(w.missing).map((c) => `${c.amount} ${c.name}`).join(', '))}. ${escapeHTML(whereToEarn(w.missing))}</p>`}
      </article>`;
  }

  function whereToEarn(missing) {
    const e = bagEntries(missing);
    if (!e.length) return '';
    const first = e.sort((a, b) => b.amount - a.amount)[0];
    return { amber: 'Amber is made in the Meadow, the Pond, the Thicket, the Rootwood and the Terraces.', ink: 'Ink is made only in the Reading Room.', thread: 'Thread is made at the Loom, the Table and the Bench.', ember: 'Embers come only from three-star runs.' }[first.key] ?? '';
  }

  function renderToday() {
    const done = state.quests.filter((q) => q.complete).length;
    panel.innerHTML = `
      <p class="panel__lead">Three small aims, new every day, chosen to pull you across the valley. Each pays ${escapeHTML(bagEntries({ amber: 18, ink: 8, thread: 8, ember: 0 }).map((c) => `${c.amount} ${c.name}`).join(', '))}.</p>
      <div class="asks">
        ${state.quests.map((q) => `
          <a class="ask ${q.complete ? 'is-done' : ''}" href="${regionBySlug(q.region)?.route ?? '#/world'}">
            <span class="ask__tick" aria-hidden="true">${q.complete ? '✓' : ''}</span>
            <span class="ask__body">
              <b>${escapeHTML(q.title)}</b>
              <span>${escapeHTML(q.line)}</span>
              <span class="ask__bar"><i style="width:${Math.round((q.done / q.goal) * 100)}%"></i></span>
            </span>
            <span class="ask__n">${q.done}/${q.goal}</span>
          </a>`).join('')}
      </div>
      <p class="panel__foot">${done === 3 ? 'All three done. The valley is satisfied.' : `${3 - done} to go.`} ${state.hearth.streak.current ? `A ${state.hearth.streak.current}-day run, best ${state.hearth.streak.best}.` : 'Practise anywhere today to start a run.'}</p>`;
  }

  async function renderYou() {
    let weakness = null;
    try { weakness = readingWeakness(world.records.sessions); } catch { /* none */ }
    const lines = standingLines(state, weakness);
    panel.innerHTML = `
      <div class="standing">
        ${lines.map((l) => `<p>${escapeHTML(l)}</p>`).join('')}
      </div>
      <div class="figures">
        ${[
          ['Passages read', `${state.reading.read}/${state.reading.passages}`],
          ['Stars', String(state.stars)],
          ['Root families grown', `${state.rootwood.grownCount}/${state.rootwood.total}`],
          ['Words in memory', String(state.meadow.known + state.pond.known + state.thicket.known)],
          ['Words for good', String(state.meadow.mastered + state.pond.mastered + state.thicket.mastered)],
          ['Verbal items solved', String(state.loom.solved + state.table.solved + state.bench.solved)],
          ['Works built', `${state.works.filter((w) => w.built).length}/${state.works.length}`],
          ['Days in the valley', String(state.hearth.activeDays)],
        ].map(([k, v]) => `<div class="figure"><b>${escapeHTML(v)}</b><span>${escapeHTML(k)}</span></div>`).join('')}
      </div>
      <div class="places">
        ${REGIONS.filter((r) => r.kind === 'learn').map((r) => `<a class="places__row" href="${r.route}"><b>${escapeHTML(r.name)}</b><span>${escapeHTML(r.skill ?? '')}</span></a>`).join('')}
      </div>
      <p class="panel__foot"><a href="#/settings">Settings, backup and restore →</a></p>`;
  }

  const TABS = { works: renderWorks, today: renderToday, you: renderYou };
  let current = openYou ? 'you' : openWorks ? 'works' : state.readyWorks.length ? 'works' : 'today';
  const select = (name) => {
    current = name;
    for (const t of outlet.querySelectorAll('.tab')) t.classList.toggle('is-on', t.dataset.tab === name);
    TABS[name]();
    panel.classList.remove('is-in');
    requestAnimationFrame(() => panel.classList.add('is-in'));
  };
  for (const t of outlet.querySelectorAll('.tab')) t.addEventListener('click', () => { play('tap'); select(t.dataset.tab); });
  select(current);

  /* ---- Building ---- */
  let building = false;
  async function build(id) {
    if (building) return;
    const w = state.works.find((x) => x.id === id);
    if (!w?.ready) return;
    building = true;
    play('build');
    const veil = document.createElement('div');
    veil.className = 'buildveil';
    veil.innerHTML = `
      <div class="buildveil__card">
        <p class="buildveil__eyebrow">Building</p>
        <h2 class="buildveil__name">${escapeHTML(w.name)}</h2>
        <div class="buildveil__cost">${craftChips(w.cost, { sign: '−' })}</div>
        <p class="buildveil__after">${escapeHTML(w.after ?? w.line)}</p>
        <a class="g-cta g-cta--gold" href="#/world" id="buildveil-go">See it<span class="arrow" aria-hidden="true">→</span></a>
      </div>`;
    document.body.appendChild(veil);
    requestAnimationFrame(() => veil.classList.add('is-in'));
    // It is mounted on the body, not the outlet, so the router will never
    // take it away: it has to take itself away on any navigation, or it
    // hangs over every screen the learner visits next.
    const dropVeil = () => { veil.remove(); window.removeEventListener('hashchange', dropVeil); };
    window.addEventListener('hashchange', dropVeil);
    try {
      await storage.put(STORES.LEARNING, {
        id: `build:${w.id}`, kind: 'world-build', module: 'world',
        work_id: w.id, upgrade_id: w.id, region: w.region, cost: w.cost,
        finished_at: new Date().toISOString(),
      });
    } catch (err) { console.error('[CAT OS] build failed', err); }
    setTimeout(() => play('unlock'), 700);
    veil.querySelector('#buildveil-go').addEventListener('click', () => {
      sessionStorage.setItem('world:focus', w.region);
      sessionStorage.setItem('world:changed', w.region);
      sessionStorage.setItem('world:change-line', `<b>${escapeHTML(w.name)}</b> — ${escapeHTML(w.after ?? '')}`);
      sessionStorage.setItem('world:wick', builtLine(w));
      play('open');
    });
    // Refresh in place too, so staying on the Hearth shows the truth.
    try {
      const fresh = await loadWorld(storage);
      world = fresh; state = fresh.state;
      lineEl.innerHTML = headline();
      outlet.querySelector('.place__hero-stat').innerHTML = `<span class="purse purse--static">${purseHTML(state.purse)}</span>`;
      mountHero();
      select('works');
    } catch { /* the veil still tells the truth */ }
    building = false;
  }
}

/** What Wick says when he sees the thing you built. He notices; he never
 *  congratulates, and he never says the word "unlocked". */
function builtLine(w) {
  const name = String(w.name ?? '').replace(/^A |^The /, '');
  const lines = [
    `The ${name.toLowerCase()}. That wasn't here yesterday.`,
    `Look at that. A ${name.toLowerCase()}.`,
    `So that's what the ${name.toLowerCase()} looks like.`,
  ];
  let n = 0;
  for (const ch of String(w.id ?? '')) n = (n + ch.charCodeAt(0)) % 997;
  return lines[n % lines.length];
}

export { REGIONS };
