/**
 * hearth.js (screen) — your records, kept by the fire.
 *
 * Toffee keeps the village fire; this page, reached from the cottage, is
 * the honest read on where the learner is: the curator's lines about the
 * learning, a few figures in words first, each friend and how they are,
 * and what each village level has put on the map. A progression page, not
 * a dashboard.
 */

import { regionBySlug } from '../regions.js';
import { loadWorld } from '../state.js';
import { standing as standingLines, readingWeakness } from '../curator.js';
import { play, unlock, startMusic, startAmbience } from '../audio.js';
import { escapeHTML } from '../../core/utils/format.js';
import { PETS, PET_BY_ID, stageTitle } from '../../pets/pets.js';
import { petPortrait, backdropStyle, petSprite, FRAME } from '../../pets/sprite.js';

const MOOD_LABEL = { glowing: 'Very happy', happy: 'Happy', missing: 'Misses you', sleepy: 'Sleepy', wilting: 'Lonely', new: 'New friend' };

export async function renderHearth(outlet, { storage }) {
  document.documentElement.setAttribute('data-world', '');

  let world;
  try { world = await loadWorld(storage); } catch (err) {
    outlet.innerHTML = `<section class="place"><div class="place__body"><h1 class="place__title">The records will not open</h1><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }
  const { state } = world;
  const P = state.pets;
  const atmo = state.atmo;
  const f = P.flame;

  outlet.innerHTML = `
    <section class="place place--hearth">
      <div class="place__hero place__hero--short place__hero--painted" style="${backdropStyle('toffee')}">
        <a class="place__back" href="#/world" id="back">← Village</a>
        <span class="place__pet place__pet--toffee" aria-hidden="true">${petSprite('toffee', { size: 92, frame: FRAME.happy })}</span>
      </div>
      <div class="place__body" id="body">
        <p class="place__eyebrow">Records · kept by Toffee</p>
        <h1 class="place__title">${f.days ? `A ${f.days}-day fire` : 'A fresh fire'}</h1>
        <p class="place__line">Village level ${P.level.level} · ${P.stars} stars · ${state.hearth.activeDays} ${state.hearth.activeDays === 1 ? 'day' : 'days'} in the village · best run ${state.hearth.streak.best} · ${f.kindling} spare ${f.kindling === 1 ? 'log' : 'logs'}.</p>
        <div id="panel" class="is-in"></div>
      </div>
    </section>`;

  outlet.querySelector('#back').addEventListener('click', () => { sessionStorage.setItem('world:focus', 'hearth'); play('close'); });
  const warmth = Math.min(1, P.harmony * 0.6 + Math.min(1, state.stars / 90) * 0.4);
  const onDown = () => { unlock(); startMusic('hearth', { hour: atmo.hour, warmth }); startAmbience('hearth', atmo); };
  window.addEventListener('pointerdown', onDown, { capture: true, once: true });
  window.addEventListener('hashchange', () => window.removeEventListener('pointerdown', onDown, { capture: true }), { once: true });
  startMusic('hearth', { hour: atmo.hour, warmth }); startAmbience('hearth', atmo);

  let weakness = null;
  try { weakness = readingWeakness(world.records.sessions); } catch { /* none */ }
  const lines = standingLines(state, weakness);
  outlet.querySelector('#panel').innerHTML = `
    <div class="standing">
      ${lines.map((l) => `<p>${escapeHTML(l)}</p>`).join('')}
    </div>
    <div class="figures">
      ${[
        ['Passages read', `${state.reading.read}/${state.reading.passages}`],
        ['Stars', String(P.stars)],
        ['Village level', String(P.level.level)],
        ['On the map', `${P.decor.filter((t) => t.made).length}/${P.decor.length}`],
        ['Root families grown', `${state.rootwood.grownCount}/${state.rootwood.total}`],
        ['Words for good', String(state.meadow.mastered + state.pond.mastered + state.thicket.mastered)],
        ['Verbal items solved', String(state.loom.solved + state.table.solved + state.bench.solved)],
        ['Days in the village', String(state.hearth.activeDays)],
      ].map(([k, val]) => `<div class="figure"><b>${escapeHTML(val)}</b><span>${escapeHTML(k)}</span></div>`).join('')}
    </div>
    <h2 class="shelf">Your friends</h2>
    <div class="friends">
      ${PETS.map((def) => {
        const p = P.pets.find((x) => x.id === def.id);
        return `<a class="friend friend--${p.word}" href="${def.places[0] === 'hearth' ? '#/world/place/wilds' : `#/world/place/${def.places[0]}`}">
          ${petPortrait(def.id, 44, { mood: p.isNew ? 0.3 : p.mood })}
          <span class="friend__lead"><b>${escapeHTML(def.name)}</b><small>${escapeHTML(def.subject)}</small></span>
          <span class="friend__side"><span class="friend__stage">${p.stage ? `Stage ${p.stage} · ${escapeHTML(stageTitle(def.id, p.stage))}` : 'Not grown yet'}</span><small>${MOOD_LABEL[p.word]} · ${p.visits} ${p.visits === 1 ? 'visit' : 'visits'}</small></span>
        </a>`;
      }).join('')}
    </div>
    <h2 class="shelf">The village, level by level</h2>
    <ul class="treasures-made">
      ${P.decor.map((t) => `<li class="${t.made ? 'is-made' : t === P.nextDecor ? 'is-next' : ''}"><i aria-hidden="true">${t.made ? '✓' : t === P.nextDecor ? '★' : '·'}</i><span><b>Level ${t.level}: ${escapeHTML(t.name)}</b><small>${escapeHTML(t.appears)}</small></span></li>`).join('')}
    </ul>
    <p class="panel__foot"><a href="#/growth">The clock tower →</a> · <a href="#/settings">Settings, backup and restore →</a></p>`;
}

export { regionBySlug, PET_BY_ID };
