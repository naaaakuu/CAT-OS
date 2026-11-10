/**
 * room.js — the four rebuilt houses, and the screen you play them on.
 *
 * One idea, taken from Chai's library because it works: every question is a
 * thing in the room, and getting it right changes that thing, for good, where
 * you can see it. So there are no tier grids and no forms. You walk in, the
 * friend is standing by the next one, and one big button starts it. When you
 * finish you come back to the room and watch your thing arrive.
 */

import { escapeHTML as esc } from '../core/utils/format.js';
import { play, startMusic, startAmbience, silenceWorld, unlock } from '../world/audio.js';
import { petFigure, FRAME } from '../pets/sprite.js';
import { PET_BY_ID } from '../pets/pets.js';
import { gated } from '../core/ads/rewarded.js';
import { loadBigItem, saveBigMove } from '../duel/compose.js';
import { ensureDuelStyle } from '../duel/style.js';
import { reduced, sparks } from '../duel/fx.js';
import { PLAYERS, whyHTML } from '../play/players.js';
import { openModal, closeModal } from '../ui/modal.js';
import { focusContent } from '../ui/focus.js';
import { roomModel } from './model.js';
import { railway, sky, clock, table, pantry } from './scenes.js';

export const ROOMS = Object.freeze({
  loom: { slug: 'loom', pet: 'ginger', mod: 'pj', type: 'chain', scene: railway, cls: 'rw', name: 'Ginger\'s Railway', noun: 'carriage', nouns: 'carriages', cta: 'Couple the next carriage', done: 'Add it to the train', again: 'Back to the yard', say: 'Every jumble you put right joins the train.', soundDone: 'build' },
  bench: { slug: 'bench', pet: 'mallow', mod: 'ooo', type: 'stray', scene: sky, cls: 'sk', name: 'Mallow\'s Sky', noun: 'constellation', nouns: 'constellations', cta: 'Find the next stray', done: 'Light it up', again: 'Back to the sky', say: 'One sentence strayed. The other four make a constellation.', soundDone: 'star3' },
  completion: { slug: 'completion', pet: 'sesame', mod: 'pc', type: 'gap', scene: clock, cls: 'ck', name: 'Sesame\'s Clockworks', noun: 'cog', nouns: 'cogs', cta: 'Fit the next cog', done: 'Set it turning', again: 'Back to the tower', say: 'Find the sentence that keeps the paragraph turning.', soundDone: 'build' },
  table: { slug: 'table', pet: 'mochi', mod: 'ps', type: 'point', scene: pantry, cls: 'pn', name: 'Mochi\'s Pantry', noun: 'jar', nouns: 'jars', cta: 'Fill the next jar', done: 'Seal the jar', again: 'Back to the shelves', say: 'Boil a whole paragraph down to one true line and it keeps for ever.', soundDone: 'place', essence: (item) => item.ideal_summary },
  placement: { slug: 'placement', pet: 'biscuit', mod: 'sp', type: 'seat', scene: table, cls: 'tb', name: 'Biscuit\'s Long Table', noun: 'guest', nouns: 'guests', cta: 'Seat the next guest', done: 'Show them to their seat', again: 'Back to the table', say: 'Every sentence has one seat where it belongs.', soundDone: 'heart' },
});
const BY_TYPE = new Map(Object.values(ROOMS).map((r) => [r.type, r]));
const roomHref = (r) => `#/world/place/${r.slug}`;

let styleReady = null;
export function roomStyle() {
  if (!styleReady) {
    styleReady = Promise.all([ensureDuelStyle(), new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = './src/ui/styles/rooms.css';
      link.onload = resolve; link.onerror = resolve;
      document.head.appendChild(link);
      setTimeout(resolve, 4000);
    })]);
  }
  return styleReady;
}

/** Inside a house. */
export async function renderRoom(outlet, { world, stage = 0 }, room) {
  await roomStyle();
  const { content, records, state } = world;
  const seed = `${room.slug}:${state.today}`;
  const m = roomModel(content[room.mod] ?? [], records.sessions, room.mod, { seed, now: state.now });
  const params = new URLSearchParams(location.hash.split('?')[1] ?? '');
  const placed = params.get('placed'), landed = params.get('ok') === '1';
  const pet = PET_BY_ID.get(room.pet);
  const nextHref = m.next ? `#/play/${room.type}/${m.next.id}` : null;

  outlet.innerHTML = `
    <section class="rm rm--${room.cls}">
      <h1 class="sr-only">${esc(room.name)}</h1>
      <div class="rm__scene" id="scene" tabindex="-1">${room.scene(m)}<div class="rm__foot"></div></div>
      <header class="rm__top">
        <a class="dl-back" href="#/world" id="back" aria-label="Back to the village"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <div class="rm__title"><b>${esc(room.name)}</b><span>${m.solved} of ${m.total} ${esc(room.nouns)}</span></div>
      </header>
      <div class="rm__dock">
        <div class="rm__friend" id="friend">${petFigure(room.pet, { size: 92, stage, frame: FRAME.happy })}<p class="rm__says" id="says">${esc(m.solved ? (landed ? `${pet.name} is delighted.` : room.say) : room.say)}</p></div>
        ${nextHref
    ? `<a class="dl-btn dl-btn--go dl-btn--xl rm__go" href="${nextHref}"><span>${esc(room.cta)}</span><small>${esc(m.next.title)}</small></a>`
    : `<a class="dl-btn dl-btn--go dl-btn--xl rm__go" href="#/duel"><span>Every ${esc(room.noun)} is done</span><small>Go and win a letter</small></a>`}
      </div>
      <div class="rm-sheet" id="sheet" hidden></div>
      <div class="fx-layer" id="fxlayer" aria-hidden="true"></div>
    </section>`;

  const scene = outlet.querySelector('#scene');
  const fx = outlet.querySelector('#fxlayer');
  outlet.querySelector('#back').addEventListener('click', () => { sessionStorage.setItem('world:focus', room.slug); play('close'); });

  const atmo = state.atmo;
  const warmth = Math.min(1, (state.pets?.harmony ?? 0.4) * 0.6);
  const sound = () => { unlock(); startMusic(room.slug, { hour: atmo.hour, warmth }); startAmbience(room.slug, atmo); };
  sound();
  window.addEventListener('pointerdown', sound, { capture: true, once: true });
  window.addEventListener('hashchange', () => window.removeEventListener('pointerdown', sound, { capture: true }), { once: true });

  const openSheet = async (x, opener) => {
    const sheet = outlet.querySelector('#sheet');
    sheet.hidden = false;
    const solved = x.state === 'solved';
    // What the thing you made actually says.
    let keeps = '';
    if (solved && room.essence) { try { keeps = room.essence(await loadBigItem(room.type, x.id)) ?? ''; } catch { /* the title will do */ } }
    sheet.innerHTML = `
      <div class="rm-sheet__bg" data-close></div>
      <div class="rm-sheet__body">
        <p class="rm-sheet__k">${esc(room.noun)} ${x.n}${x.genre ? ` · ${esc(String(x.genre).replace(/-/g, ' '))}` : ''}</p>
        <h2>${esc(x.title)}</h2>
        ${keeps ? `<p class="rm-sheet__keeps">${esc(keeps)}</p>` : `<p class="rm-sheet__st">${solved ? 'You got this one perfectly.' : x.state === 'tried' ? 'This one got away. It is worth another go.' : 'Not solved yet.'}</p>`}
        <a class="dl-btn dl-btn--go" href="#/play/${room.type}/${esc(x.id)}">${solved ? 'Play it again' : 'Play this one'}</a>
        <button class="dl-btn dl-btn--ink" data-close>Close</button>
      </div>`;
    const body = sheet.querySelector('.rm-sheet__body');
    const shut = () => { closeModal(body); sheet.hidden = true; sheet.innerHTML = ''; };
    openModal(body, shut, { returnTo: opener });
    sheet.querySelectorAll('[data-close]').forEach((el) => el.addEventListener('click', shut));
    play('page');
  };
  const byId = new Map(m.tiers.flatMap((t) => t.items).map((x) => [x.id, x]));
  scene.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b || b.disabled) return;
    const x = byId.get(b.dataset.id);
    if (!x) return;
    if (m.next?.id === x.id) { play('open'); location.hash = nextHref; return; }
    openSheet(x, b);
  });

  // Stand in front of the thing that matters right now.
  const focusId = placed ?? m.next?.id;
  const el = focusId ? outlet.querySelector(`[data-id="${CSS.escape(focusId)}"]`) : null;
  if (el) {
    scene.scrollTop = 0;
    el.scrollIntoView({ block: 'center', inline: 'center' });
    if (placed && landed) {
      // The payoff: come back and watch your thing arrive.
      el.classList.add('is-arriving');
      setTimeout(() => {
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect();
        const c = fx.getBoundingClientRect();
        sparks(fx, r.left - c.left + r.width / 2, r.top - c.top + r.height / 2, { n: 20, spread: 110, size: 8 });
        play(room.soundDone);
      }, reduced() ? 0 : 520);
      history.replaceState(null, '', roomHref(room));
    } else if (placed) history.replaceState(null, '', roomHref(room));
  }
}

/** One question, on paper, inside its house. */
export async function renderPlay(outlet, { storage }, params) {
  const room = BY_TYPE.get(params.type);
  if (!room) { location.replace('#/world'); return; }
  await roomStyle();
  const arrived = location.hash;
  let item;
  try { item = await loadBigItem(params.type, params.id); } catch (err) {
    console.error('[CAT OS] item could not open', err);
    outlet.innerHTML = `<section class="pg"><div class="pg__body"><p class="dl-wait" style="color:inherit">This one did not arrive. Check your connection and try again.</p><a class="dl-btn dl-btn--go" href="${roomHref(room)}">Back</a></div></section>`;
    return;
  }
  if (location.hash !== arrived) return;
  silenceWorld(); startMusic('focus');
  const pet = PET_BY_ID.get(room.pet);
  const id = item.meta?.id ?? item.id;
  outlet.innerHTML = `
    <section class="pg pg--${room.cls}">
      <h1 class="sr-only">${esc(item.meta?.title ?? item.title ?? room.name)}</h1>
      <header class="pg__top">
        <a class="pg__back" href="${roomHref(room)}" aria-label="Back to ${esc(room.name)}"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg></a>
        <span>${esc(room.name)}</span>
      </header>
      <div class="pg__body" id="host"></div>
    </section>`;
  const host = outlet.querySelector('#host');
  const inner = document.createElement('div');
  host.appendChild(inner);
  let finished = false;
  const started = Date.now();
  PLAYERS[params.type](inner, item, {
    onDone: async (o) => {
      if (finished) return;
      finished = true;
      await saveBigMove(storage, params.type, item, { ...o, started });
      const why = whyHTML(params.type, item, o);
      const panel = document.createElement('div');
      panel.className = `pg-done ${o.correct ? 'is-good' : 'is-miss'}`;
      panel.innerHTML = `
        <p class="pg-done__v" tabindex="-1">${o.correct ? 'Beautiful.' : `${esc(pet.name)} kept it for you.`}</p>
        ${o.teach ? `<p class="pg-done__t">${esc(o.teach)}</p>` : ''}
        ${why ? `<details class="pg-why"><summary>Show me why</summary><div class="why">${gated(why)}</div></details>` : ''}
        <a class="dl-btn dl-btn--go dl-btn--xl" href="${roomHref(room)}?placed=${encodeURIComponent(id)}${o.correct ? '&ok=1' : ''}">${esc(o.correct ? room.done : room.again)}</a>`;
      inner.appendChild(panel);
      focusContent(panel.querySelector('.pg-done__v'));
      play(o.correct ? 'star3' : 'nostar');
      setTimeout(() => panel.scrollIntoView({ block: 'end', behavior: reduced() ? 'auto' : 'smooth' }), 60);
    },
  });
  focusContent(inner.querySelector('.pl__ask'));
}
