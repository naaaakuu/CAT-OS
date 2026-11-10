/**
 * bill.js — tonight's bill: every Muddle, and so every part of the exam, on
 * one screen. PLAY always chooses for you; this is where you choose for
 * yourself. Each poster keeps your record against that Muddle, and the ribbons
 * you have taken off it, so the page is also an honest picture of where your
 * VARC stands: the posters with no ribbon are what to play next.
 */

import { escapeHTML as esc } from '../core/utils/format.js';
import { loadWorldRecords } from '../world/state.js';
import { silenceWorld, startMusic, play } from '../world/audio.js';
import { ensureDuelStyle } from './style.js';
import { loadMuddles } from './content.js';
import { BOUTS, RIBBONS, castOf, duelsIn, ladderOf, nextBout, troublemakerOf, shareOf } from './model.js';
import { muddleSprite } from './arena.js';
import { laurelSVG, envelopeSVG } from './art.js';
import { petFigure } from '../pets/sprite.js';
import { sideShows, GLASSHOUSE_HREF, GAUNTLET_HREF } from './sideshows.js';

/* How much of the paper each one is, where that is worth saying. */
const WEIGHT = { skimmer: 'Two thirds of the exam' };
/* How often PLAY deals each one, in words a person would use. */
const often = (b) => { const every = 1 / shareOf(b); return `PLAY: 1 duel in ${every <= 4 ? 3 : every <= 12 ? 10 : 20}`; };

const ribbonSVG = (on) => `<svg viewBox="0 0 16 22" width="13" height="18" aria-hidden="true"><path d="M3 10v11l5-3.4 5 3.4V10" fill="${on ? '#c9553f' : 'none'}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="8" cy="7" r="5.6" fill="${on ? '#f4c443' : 'none'}" stroke="currentColor" stroke-width="1.6"/></svg>`;

export async function renderBill(outlet, { storage }) {
  await ensureDuelStyle();
  const arrived = location.hash;
  const [records, muddles] = await Promise.all([loadWorldRecords(storage), loadMuddles()]);
  if (location.hash !== arrived) return;
  silenceWorld(); startMusic('world');

  const now = Date.now();
  const duels = duelsIn(records.learning);
  const lad = ladderOf(duels);
  const cast = castOf(duels);
  const up = nextBout(duels, now);
  const trouble = troublemakerOf(duels, now);
  const fresh = duels.length === 0;
  const dunked = BOUTS.filter((b) => cast.get(b.id).wins > 0).length;
  const ribbons = BOUTS.reduce((n, b) => n + RIBBONS.filter((r) => cast.get(b.id).wins >= r.at).length, 0);

  const poster = (b) => {
    const c = cast.get(b.id), m = muddles.get(b.id);
    const isUp = b.id === up.id;
    const double = trouble?.open && trouble.bout.id === b.id;
    // Before the first duel there is only Smudge: the first one is a promise, and it is his.
    const locked = fresh && b.id !== BOUTS[0].id;
    const record = !c.fought ? (locked ? 'After your first duel' : 'Not met yet')
      : c.wins ? `${c.wins} ${c.wins === 1 ? 'dunking' : 'dunkings'}${c.losses ? ` · ${c.losses} lost` : ''}` : `Not dunked yet · ${c.losses} lost`;
    const goal = !c.fought ? '' : c.toRibbon ? `${c.toRibbon} more for ${RIBBONS.find((r) => r.at > c.wins).name.toLowerCase()}` : 'Every ribbon taken';
    const label = `${b.name}, ${b.skill}. ${record}.${double ? ' Today\'s troublemaker: double laurels.' : ''}`;
    const inner = `
        ${double ? '<i class="bl-card__tag bl-card__tag--double">Double laurels</i>' : isUp && !locked ? '<i class="bl-card__tag">Up next</i>' : !c.fought && !locked ? '<i class="bl-card__tag bl-card__tag--new">New</i>' : ''}
        <span class="bl-card__fig">${muddleSprite(b.id, { size: 84, frame: c.lastWon ? 4 : 0 })}</span>
        <b class="bl-card__skill">${esc(b.skill)}</b>
        <span class="bl-card__name">${esc(b.name)}${m.title ? `, ${esc(m.title)}` : ''}</span>
        ${WEIGHT[b.id] ? `<span class="bl-card__weight">${esc(WEIGHT[b.id])}</span>` : ''}
        <span class="bl-card__often">${esc(often(b))}</span>
        <span class="bl-card__ribbons" aria-hidden="true">${RIBBONS.map((r) => ribbonSVG(c.wins >= r.at)).join('')}</span>
        <span class="bl-card__rec">${esc(record)}</span>
        ${goal ? `<span class="bl-card__goal">${esc(goal)}</span>` : ''}`;
    return locked
      ? `<div class="bl-card is-locked" aria-label="${esc(label)}">${inner}</div>`
      : `<a class="bl-card ${isUp ? 'is-up' : ''} ${c.fought ? '' : 'is-new'}" href="#/duel?vs=${b.id}" aria-label="${esc(label)} Play.">${inner}</a>`;
  };

  const shows = sideShows(records.learning, now);
  const sideRow = ({ href, friend, title, what, state, owed, pay }) => `
        <a class="bl-side ${owed ? 'is-owed' : ''}" href="${href}" aria-label="${esc(`${title}. ${what}. ${state}. ${pay}.`)}">
          <span class="bl-side__fig">${petFigure(friend, { size: 58 })}</span>
          <span class="bl-side__text"><b>${esc(title)}</b><span>${esc(what)}</span><small>${esc(state)}</small></span>
          <span class="bl-side__pay">${owed ? envelopeSVG(friend === 'toffee' ? 'silver' : 'wax') : ''}<i>${esc(pay)}</i></span>
        </a>`;
  const g = shows.glasshouse, t = shows.gauntlet;
  const side = [
    sideRow({ href: GLASSHOUSE_HREF, friend: 'matcha', title: 'Matcha\'s Glasshouse', what: 'Ten words, two good recalls each', owed: !g.today,
      state: g.rooted ? `${g.rooted} ${g.rooted === 1 ? 'word' : 'words'} rooted${g.yellow ? ` · ${g.yellow} yellow ${g.yellow === 1 ? 'leaf' : 'leaves'}` : ''}` : g.yellow ? `${g.yellow} yellow ${g.yellow === 1 ? 'leaf' : 'leaves'} to turn green` : 'Nothing planted yet',
      pay: g.today ? 'Today\'s letter earned' : 'A letter today' }),
    sideRow({ href: GAUNTLET_HREF, friend: 'toffee', title: 'Toffee\'s Gauntlet', what: 'Thirty words in three minutes', owed: !t.ran,
      state: t.best ? `Your best: ${t.best.correct} of ${t.best.total}` : 'Not run yet',
      pay: t.ran ? 'This week\'s letter earned' : 'A silver letter this week' }),
  ];

  outlet.innerHTML = `
    <section class="rd bl">
      <header class="bk__top">
        <a class="dl-back" href="#/world" aria-label="Back to the village"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <h1 tabindex="-1">Tonight's Bill</h1>
        <a class="bl__road" href="#/road" aria-label="The Laurel Road: stop ${lad.arena.n}, ${lad.laurels} laurels">${laurelSVG(20)}<b>${lad.laurels}</b></a>
      </header>
      <p class="bl__lead">Ten Muddles. Each one is a part of the exam, and PLAY deals them the way the exam does: most of all, reading.</p>
      <div class="bl__form">
        <div><b>${dunked}<small>/${BOUTS.length}</small></b><span>Muddles dunked</span></div>
        <div><b>${ribbons}<small>/${BOUTS.length * RIBBONS.length}</small></b><span>Ribbons</span></div>
        <a class="dl-btn dl-btn--go" href="#/duel">Play<small>vs ${esc(up.name)}</small></a>
      </div>
      <div class="bl__grid">${BOUTS.map(poster).join('')}</div>
      <p class="bl__foot">The higher your stop on the Laurel Road, the harder every Muddle pulls.</p>
      ${fresh ? '' : `<h2 class="bl__sub">Also in the village</h2>
      <p class="bl__sublead">Two houses with no rope. Words are under every question in the exam, so each of these leaves you a letter.</p>
      <div class="bl__side">${side.join('')}</div>`}
    </section>`;
  try { outlet.querySelector('h1')?.focus({ preventScroll: true }); } catch { /* fine */ }
  outlet.querySelector('.bl').addEventListener('click', (e) => { if (e.target.closest('a.bl-card, a.bl-side')) play('open'); });
}
