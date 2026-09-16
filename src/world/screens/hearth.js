/**
 * hearth.js (screen) — your standing.
 *
 * The Hearth on the map is where you build and raise; this page, behind
 * the menu, is the honest read on where the learner is: the village's
 * stage, the curator's lines about the learning, the records, and what
 * stands. It is a progression page, not a dashboard: a few figures, in
 * words first.
 */

import { VillageRenderer } from '../../village/renderer.js';
import { paintedAtmo } from '../stage.js';
import { buildBackdropScene } from '../../village/scene.js';
import { regionBySlug, REGIONS } from '../regions.js';
import { loadWorld } from '../state.js';
import { coinsHTML, purseHTML, wireCraftTaps } from '../craft-ui.js';
import { buildingArt } from '../icons.js';
import { standing as standingLines, readingWeakness } from '../curator.js';
import { play, unlock, startMusic, startAmbience } from '../audio.js';
import { escapeHTML } from '../../core/utils/format.js';

export async function renderHearth(outlet, { storage }) {
  document.documentElement.setAttribute('data-world', '');

  let world;
  try { world = await loadWorld(storage); } catch (err) {
    outlet.innerHTML = `<section class="place"><div class="place__body"><h1 class="place__title">The Hearth will not open</h1><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }
  const { state } = world;
  const v = state.village;
  const atmo = state.atmo;

  outlet.innerHTML = `
    <section class="place place--hearth">
      <div class="place__hero place__hero--short">
        <canvas id="hero" aria-label="The Hearth"></canvas>
        <a class="place__back" href="#/world" id="back">← The village</a>
        <div class="place__hero-stat"><span class="purse purse--static">${coinsHTML(v.coins)}${purseHTML(v.stock, { showZero: false })}</span></div>
      </div>
      <div class="place__body" id="body">
        <p class="place__eyebrow">Your standing</p>
        <h1 class="place__title">${escapeHTML(v.stage.name)}</h1>
        <p class="place__line">${escapeHTML(v.stage.line)} Level ${v.level.n}, ${Math.round(v.level.pct * 100)}% of the way to ${v.level.n + 1}.</p>
        <div id="panel" class="is-in"></div>
      </div>
    </section>`;

  outlet.querySelector('#back').addEventListener('click', () => { sessionStorage.setItem('world:focus', 'hearth'); play('close'); });

  /* ---- The hero ---- */
  let renderer = null;
  const canvas = outlet.querySelector('#hero');
  if (canvas) {
    const scene = buildBackdropScene('hearth', state, paintedAtmo(atmo));
    renderer = new VillageRenderer(canvas, scene, { fit: 'cover', pannable: false, minZoom: 0.3, maxZoom: 8 });
    renderer.lookAt(scene.W / 2, 300, { animate: false });
    renderer.start();
  }
  const onHash = () => { renderer?.destroy(); window.removeEventListener('hashchange', onHash); };
  window.addEventListener('hashchange', onHash);
  const warmth = Math.min(1, (v.levels.size / 8) * 0.6 + Math.min(1, state.stars / 90) * 0.4);
  const onDown = () => { unlock(); startMusic('hearth', { hour: atmo.hour, warmth }); startAmbience('hearth', atmo); };
  window.addEventListener('pointerdown', onDown, { capture: true, once: true });
  startMusic('hearth', { hour: atmo.hour, warmth }); startAmbience('hearth', atmo);

  const panel = outlet.querySelector('#panel');
  wireCraftTaps(outlet.querySelector('.place__hero-stat'), () => state);

  let weakness = null;
  try { weakness = readingWeakness(world.records.sessions); } catch { /* none */ }
  const lines = standingLines(state, weakness);
  const built = v.buildings.filter((b) => b.built);
  panel.innerHTML = `
    <div class="standing">
      ${lines.map((l) => `<p>${escapeHTML(l)}</p>`).join('')}
    </div>
    <div class="figures">
      ${[
        ['Passages read', `${state.reading.read}/${state.reading.passages}`],
        ['Stars', String(state.stars)],
        ['Orders delivered', String(v.ordersDone)],
        ['Coins earned', String(v.earned.coins)],
        ['Root families grown', `${state.rootwood.grownCount}/${state.rootwood.total}`],
        ['Words for good', String(state.meadow.mastered + state.pond.mastered + state.thicket.mastered)],
        ['Verbal items solved', String(state.loom.solved + state.table.solved + state.bench.solved)],
        ['Days in the village', String(state.hearth.activeDays)],
      ].map(([k, val]) => `<div class="figure"><b>${escapeHTML(val)}</b><span>${escapeHTML(k)}</span></div>`).join('')}
    </div>
    <p class="panel__foot">${state.hearth.streak.current ? `A ${state.hearth.streak.current}-day run, best ${state.hearth.streak.best}.` : 'Practise anywhere today to start a run.'}</p>
    <h2 class="shelf">What stands</h2>
    <div class="shelf">
      ${built.map((b) => `
        <a class="wk is-built" href="${b.def.place ? `#/world/place/${b.def.place}` : '#/world'}">
          <span class="wk__plate">${buildingArt(b.id, b.level, 58)}</span>
          <span class="wk__name">${escapeHTML(b.def.name)}</span>
          <span class="wk__flag">Level ${b.level}</span>
        </a>`).join('')}
    </div>
    <div class="places" style="margin-top:18px">
      ${REGIONS.filter((r) => r.kind === 'learn').map((r) => `<a class="places__row" href="${r.route}"><b>${escapeHTML(r.name)}</b><span>${escapeHTML(r.skill ?? '')}</span></a>`).join('')}
    </div>
    <p class="panel__foot"><a href="#/growth">Growth →</a> · <a href="#/settings">Settings, backup and restore →</a></p>`;
}

export { regionBySlug };
