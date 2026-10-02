/**
 * hearth.js (screen) — your records, kept by the fire.
 *
 * Toffee keeps the village fire; this page, reached from the cottage, is
 * the honest read on where the learner is: the curator's lines about the
 * learning, a few figures in words first, each friend and how they are,
 * and the treasures the village has made. A progression page, not a
 * dashboard.
 */

import { regionBySlug } from '../regions.js';
import { loadWorld } from '../state.js';
import { standing as standingLines, readingWeakness } from '../curator.js';
import { play, unlock, startMusic, startAmbience } from '../audio.js';
import { escapeHTML } from '../../core/utils/format.js';
import { PETS, PET_BY_ID, GIFTS } from '../../pets/pets.js';
import { petPortrait, giftIcon, backdropStyle, petSprite, FRAME } from '../../pets/sprite.js';

const MOOD_LABEL = { glowing: 'Glowing', happy: 'Happy', missing: 'Missing you', sleepy: 'Sleepy', wilting: 'Wilting', new: 'Waiting to meet you' };

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
        <h1 class="place__title">${f.days ? `A ${f.days}-day glow` : 'A fresh fire'}</h1>
        <p class="place__line">${state.hearth.activeDays} ${state.hearth.activeDays === 1 ? 'day' : 'days'} in the village · best run ${state.hearth.streak.best} · ${f.kindling} kindling saved.</p>
        <div id="panel" class="is-in"></div>
      </div>
    </section>`;

  outlet.querySelector('#back').addEventListener('click', () => { sessionStorage.setItem('world:focus', 'hearth'); play('close'); });
  const warmth = Math.min(1, P.harmony * 0.6 + Math.min(1, state.stars / 90) * 0.4);
  const onDown = () => { unlock(); startMusic('hearth', { hour: atmo.hour, warmth }); startAmbience('hearth', atmo); };
  window.addEventListener('pointerdown', onDown, { capture: true, once: true });
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
        ['Stars', String(state.stars)],
        ['Gifts gathered', String(P.earnedTotal)],
        ['Treasures made', `${P.treasures.filter((t) => t.made).length}/${P.treasures.length}`],
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
          <span class="friend__side"><span class="friend__hearts" aria-label="${p.hearts} of 5 hearts">${'♥'.repeat(p.hearts)}<i>${'♡'.repeat(5 - p.hearts)}</i></span><small>${MOOD_LABEL[p.word]} · ${giftIcon(def.gift, 14)} ${p.gifts}</small></span>
        </a>`;
      }).join('')}
    </div>
    <h2 class="shelf">Treasures</h2>
    <ul class="treasures-made">
      ${P.treasures.map((t) => `<li class="${t.made ? 'is-made' : t.next ? 'is-next' : ''}"><i aria-hidden="true">${t.made ? '✓' : t.next ? '✦' : '·'}</i><span><b>${t.made || t.next ? escapeHTML(t.name) : 'Still to come'}</b>${t.made ? `<small>${escapeHTML(t.appears)}</small>` : t.next ? `<small>${Object.entries(t.recipe).map(([g, n]) => `${giftIcon(g, 13)} ${n}`).join(' ')}</small>` : ''}</span></li>`).join('')}
    </ul>
    <p class="panel__foot"><a href="#/growth">The clock tower →</a> · <a href="#/settings">Settings, backup and restore →</a></p>`;
}

export { regionBySlug, PET_BY_ID, GIFTS };
