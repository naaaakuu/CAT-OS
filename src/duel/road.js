/**
 * road.js — the Laurel Road: nine stops, one above the other, the Muddle
 * waiting in each. You always see the next one, and what it will teach you.
 */

import { escapeHTML as esc } from '../core/utils/format.js';
import { loadWorldRecords } from '../world/state.js';
import { silenceWorld, startMusic } from '../world/audio.js';
import { ensureDuelStyle } from './style.js';
import { loadMuddles } from './content.js';
import { ARENAS, boutOf, castOf, duelsIn, ladderOf } from './model.js';
import { muddleSprite } from './arena.js';
import { laurelSVG } from './art.js';
import { PET_BY_ID } from '../pets/pets.js';
import { petPortrait, backdropStyle } from '../pets/sprite.js';

export async function renderRoad(outlet, { storage }) {
  await ensureDuelStyle();
  const arrived = location.hash;
  const [records, cast] = await Promise.all([loadWorldRecords(storage), loadMuddles()]);
  if (location.hash !== arrived) return;
  silenceWorld(); startMusic('world');
  const duels = duelsIn(records.learning);
  const lad = ladderOf(duels);
  const met = castOf(duels);

  // Top of the road first, so the screen scrolls to where you stand.
  const rows = [...ARENAS].reverse().map((a) => {
    const m = cast.get(a.muddle);
    const state = a.n < lad.arena.n ? 'past' : a.n === lad.arena.n ? 'now' : 'ahead';
    // A Muddle you have not met, living further up than the next stop, stays in the dark until you get close.
    const hidden = a.n > lad.arena.n + 1 && !met.get(a.muddle)?.fought;
    const b = boutOf(a.muddle);
    return `
      <article class="rd-row is-${state}" ${state === 'now' ? 'id="here"' : ''}>
        <div class="rd-row__art" style="${backdropStyle(a.backdrop ?? a.friend)}"></div>
        <div class="rd-row__body">
          <div class="rd-row__fig ${hidden ? 'is-hidden' : ''}">${muddleSprite(a.muddle, { size: 76, frame: state === 'past' ? 4 : 0 })}</div>
          <div class="rd-row__txt">
            <p class="rd-row__n">Stop ${a.n}${state === 'past' ? ' · cleared' : state === 'now' ? ' · you are here' : ` · ${a.from} laurels`}</p>
            <h2>${esc(a.name)}</h2>
            ${hidden ? '<p class="rd-row__m">Something is waiting here.</p>' : `<p class="rd-row__m"><b>${esc(m.name)}</b>${m.habit ? `, ${esc(lowerFirst(m.habit))}` : ''}</p>
            <p class="rd-row__teach">${esc(b.skill)}: ${esc(b.line)}</p>`}
          </div>
          <span class="rd-row__friend">${petPortrait(a.friend, 34)}<i>with ${esc(PET_BY_ID.get(a.friend)?.name ?? '')}</i></span>
        </div>
      </article>`;
  }).join('');

  outlet.innerHTML = `
    <section class="rd">
      <header class="bk__top">
        <a class="dl-back" href="#/world" aria-label="Back to the village"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <h1 tabindex="-1">The Laurel Road</h1>
      </header>
      <div class="rd__me">
        ${laurelSVG(36)}
        <div><b>${lad.laurels} laurels</b><span>${lad.wins} wins · ${lad.duels} duels</span></div>
        <a class="dl-btn dl-btn--go" href="#/bill">The bill</a>
      </div>
      <div class="rd__rows">${rows}</div>
    </section>`;
  outlet.querySelector('#here')?.scrollIntoView({ block: 'center' });
}

const lowerFirst = (s) => (s ? s[0].toLowerCase() + s.slice(1) : s);
