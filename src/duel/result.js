/**
 * result.js — what happens after the splash. The loudest moment in the game
 * and the one that decides whether you press Play again, so it is built in
 * beats: the verdict, the laurels counting, then the letter dropping in.
 *
 * A loss shows the words that got away first: that is the lesson, and a
 * rematch is one tap below it.
 */

import { escapeHTML as esc } from '../core/utils/format.js';
import { play } from '../world/audio.js';
import { petFigure, backdropStyle, FRAME } from '../pets/sprite.js';
import { muddleSprite } from './arena.js';
import { ensureDuelStyle } from './style.js';
import { confetti, reduced } from './fx.js';
import { GRADES } from './letters.js';
import { renderLetterOpen } from './open-letter.js';
import { laurelSVG, envelopeSVG } from './art.js';
import { openModal, closeModal } from '../ui/modal.js';
import { loadWorldRecords } from '../world/state.js';
import { duelsIn } from './model.js';
import { sideShows, sideDoor } from './sideshows.js';

function countUp(el, from, to, ms = 900) {
  if (!el) return;
  if (reduced() || from === to) { el.textContent = String(to); return; }
  const t0 = performance.now();
  const tick = (t) => {
    if (!el.isConnected) return;
    const p = Math.min(1, (t - t0) / ms), e = 1 - (1 - p) ** 3;
    el.textContent = String(Math.round(from + (to - from) * e));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export async function renderDuelResult(outlet, { storage, summary }) {
  await ensureDuelStyle();
  const { won, delta, before, after, muddle, friend, friendStage, arena, misses, right, wrong, bestCombo, first, letter, newArena, near, title, newWords, newBest, bout, bounty, ribbon, firstDunk, next, chase } = summary;
  /* A beaten Muddle runs off into a house (chase.js): the big button follows it in through the village. */
  const chaseHref = '#/world?chase=1';
  // One line of honour at most, the rarest first.
  const medal = ribbon ? `${ribbon.name} taken off ${muddle.name}` : bounty ? 'Troublemaker dunked: double laurels' : firstDunk ? `First dunking of ${muddle.name}` : '';
  const stamp = Date.now();
  const total = right + wrong;
  const pct = after.next ? after.pct : 1;
  const fromPct = before.arena.n === after.arena.n ? (before.next ? before.pct : 1) : 0;

  const line = won ? summary.winLine : summary.loseLine;
  const notes = misses.length ? `
    <details class="rs-notes" ${won ? '' : 'open'}>
      <summary><b>${misses.length} ${misses.length === 1 ? 'thing' : 'things'} got away</b><span>Learn ${misses.length === 1 ? 'it' : 'them'} and win ${misses.length === 1 ? 'it' : 'them'} back</span></summary>
      <ul>${misses.map((m) => `<li><b>${esc(m.head)}</b><span>${esc(m.body)}</span></li>`).join('')}</ul>
    </details>` : '';

  const letterHTML = letter ? `
    <button class="rs-letter is-${esc(letter.grade)}" id="letter">
      ${envelopeSVG(letter.grade)}
      <span><b>${esc(GRADES[letter.grade]?.name ?? 'A letter')}</b><i>Tap to open</i></span>
    </button>` : '';

  outlet.innerHTML = `
    <section class="rs ${won ? 'rs--won' : 'rs--lost'}">
      <div class="rs__bg" style="${backdropStyle(arena.backdrop ?? friend)}"></div>
      <div class="rs__veil"></div>
      <div class="rs__scroll">
        <div class="rs__head">
          <p class="rs__kicker">${esc(bout?.skill ? `${bout.skill} · ${arena.name}` : arena.name)}</p>
          <h1 class="rs__title" tabindex="-1">${won ? esc(title ?? 'In the pond!') : near ? 'So close!' : 'Pulled in!'}</h1>
          ${!won && near ? `<p class="rs__near">${near === 1 ? 'One more right answer' : 'Two more right answers'} and ${esc(muddle.name)} was in the pond.</p>` : ''}
          <p class="sr-only" role="status">${won ? 'You won the duel' : 'You lost the duel'}. ${delta >= 0 ? '+' : ''}${delta} laurels. ${right} of ${total} right.</p>
        </div>
        <div class="rs__stage">
          <div class="rs__fig rs__fig--me ${won ? 'is-up' : 'is-down'}">${petFigure(friend, { size: 118, stage: friendStage, frame: won ? FRAME.happy : FRAME.sleep })}</div>
          <div class="rs__fig rs__fig--them ${won ? 'is-down' : 'is-up'}">${muddleSprite(muddle.id, { size: 118, frame: won ? FRAME.sleep : FRAME.happy })}</div>
          ${line ? `<p class="rs__quote"><b>${esc(muddle.name)}:</b> ${esc(line)}</p>` : ''}
        </div>
        ${medal ? `<p class="rs__medal">${esc(medal)}</p>` : ''}
        <div class="rs__laurels">
          <div class="rs__delta ${delta >= 0 ? 'is-up' : 'is-down'}">${laurelSVG(26)}<b>${delta >= 0 ? '+' : ''}${delta}</b></div>
          <div class="rs__bar"><i id="bar" style="width:${(fromPct * 100).toFixed(1)}%"></i></div>
          <p class="rs__arena"><span><b id="count">${before.laurels}</b> laurels</span><span>${after.next ? `${Math.max(1, Math.ceil(after.toNext / 30))} ${Math.ceil(after.toNext / 30) <= 1 ? 'win' : 'wins'} to ${esc(after.next.name)}` : 'The top of the road'}</span></p>
        </div>
        <div class="rs__facts">
          <div><b>${right}/${total}</b><span>Right</span></div>
          <div class="${newBest ? 'is-best' : ''}"><b>${bestCombo}</b><span>${newBest ? 'New best!' : 'Best streak'}</span></div>
          <div><b>${newWords}</b><span>New ${newWords === 1 ? 'word' : 'words'}</span></div>
        </div>
        ${won && chase ? `<p class="rs-chase"><span class="rs-chase__fig">${muddleSprite(muddle.id, { size: 64, frame: FRAME.talk })}</span><span><b>${esc(muddle.name)} ran off into ${esc(chase.name)}!</b><span>One round in there catches ${esc(muddle.name)}: +${chase.laurels} laurels.</span></span></p>` : ''}
        ${won ? letterHTML : ''}
        ${notes}
        <div class="rs__actions">
          ${won
    ? chase
      ? `<a class="dl-btn dl-btn--go dl-btn--xl dl-btn--chase" id="chase" href="${chaseHref}">Chase ${esc(muddle.name)}<small class="rs__next">Into ${esc(chase.name)}</small></a><a class="dl-btn dl-btn--plain" id="again" href="#/duel?again=${stamp}">Duel again instead</a>`
      : `<a class="dl-btn dl-btn--go dl-btn--xl" id="again" href="#/duel?again=${stamp}">Play again${next && !first ? `<small class="rs__next">Next: ${esc(next.name)}, ${esc(next.skill)}</small>` : ''}</a>`
    : `<a class="dl-btn dl-btn--go dl-btn--xl" id="again" href="#/duel?again=${stamp}&vs=${esc(muddle.id)}">Rematch</a>`}
          <div class="rs__more">
            <a class="dl-btn dl-btn--plain" href="#/bill">Pick a Muddle</a>
            <a class="dl-btn dl-btn--plain" href="#/world">Village</a>
          </div>
          <div id="side" hidden></div>
        </div>
      </div>
    </section>`;

  try { outlet.querySelector('.rs__title')?.focus({ preventScroll: true }); } catch { /* fine */ }
  const root = outlet.querySelector('.rs');
  play(won ? 'fanfare' : 'defeat');
  if (won) confetti(root);
  setTimeout(() => {
    countUp(outlet.querySelector('#count'), before.laurels, after.laurels);
    const bar = outlet.querySelector('#bar');
    if (bar) bar.style.width = `${(pct * 100).toFixed(1)}%`;
    if (delta > 0) play('coin', { delay: 0.2 });
  }, reduced() ? 0 : 450);

  const letterBtn = outlet.querySelector('#letter');
  if (letterBtn) {
    setTimeout(() => { letterBtn.classList.add('is-in'); play('swoosh'); }, reduced() ? 0 : 1100);
    letterBtn.addEventListener('click', () => {
      renderLetterOpen(outlet, { storage, letter, first, doneLabel: chase ? `Chase ${muddle.name}` : 'Play again', doneHref: chase ? chaseHref : `#/duel?again=${Date.now()}` });
    });
  }

  /* One door to a house with no rope, after a win and only while its letter
     is still unearned: the Glasshouse and the Gauntlet are not duels, so this
     is where a player who lives on PLAY is reminded they exist. */
  if (won && !first && !chase) {
    loadWorldRecords(storage).then((records) => {
      const door = sideDoor(sideShows(records.learning), duelsIn(records.learning).length);
      const slot = outlet.querySelector('#side');
      if (!door || !slot) return;
      slot.innerHTML = `<a class="rs-side" href="${door.href}"><span class="rs-side__fig">${petFigure(door.friend, { size: 48 })}</span><span class="rs-side__text"><b>${esc(door.title)}</b><span>${esc(door.line)}</span></span><i aria-hidden="true">›</i></a>`;
      slot.hidden = false;
    }).catch(() => { /* the result stands without it */ });
  }

  if (newArena) {
    // A new stop on the road gets its own moment, over the result.
    setTimeout(() => {
      if (!root.isConnected) return;
      play('levelup');
      const sheet = document.createElement('div');
      sheet.className = 'rs-unlock';
      sheet.innerHTML = `
        <div class="rs-unlock__card">
          <p class="rs-unlock__kicker">The road opens</p>
          <h2>${esc(newArena.name)}</h2>
          <div class="rs-unlock__fig">${muddleSprite(newArena.muddle, { size: 128 })}</div>
          <p class="rs-unlock__teach">${esc(newArena.muddleName)} lives here</p>
          <p class="rs-unlock__line">A new stop on the Laurel Road. From here on, every Muddle pulls a little harder.</p>
          <button class="dl-btn dl-btn--go" data-close>Bring it on</button>
        </div>`;
      root.appendChild(sheet);
      const card = sheet.querySelector('.rs-unlock__card');
      const shut = () => { closeModal(card); sheet.remove(); };
      openModal(card, shut);
      sheet.querySelector('[data-close]').addEventListener('click', shut, { once: true });
    }, reduced() ? 300 : 1900);
  }

}
