/**
 * book.js — the Book of Curiosities: every card a letter can hold, chapter by
 * chapter. Cards you have not found stay face down, showing only their hook,
 * so an empty slot is a question you want answered.
 */

import { escapeHTML as esc } from '../core/utils/format.js';
import { play, silenceWorld, startMusic } from '../world/audio.js';
import { loadWorldRecords } from '../world/state.js';
import { ensureDuelStyle } from './style.js';
import { loadCurios } from './content.js';
import { ownedCards, pendingLetters } from './letters.js';
import { cardHTML, RARITY_WORD, shareCard } from './open-letter.js';
import { openModal, closeModal } from '../ui/modal.js';

export async function renderBook(outlet, { storage }) {
  outlet.innerHTML = '<section class="bk"><p class="dl-wait">Opening the Book…</p></section>';
  await ensureDuelStyle();
  const arrived = location.hash;
  const [{ chapters, cards }, records] = await Promise.all([loadCurios(), loadWorldRecords(storage)]);
  if (location.hash !== arrived) return;
  silenceWorld(); startMusic('reading-room');
  const owned = ownedCards(records.learning);
  const found = cards.filter((c) => owned.has(c.id)).length;
  const waiting = pendingLetters(records.learning, Date.now(), records.sessions).length;

  const chapterHTML = (ch) => {
    const list = cards.filter((c) => c.chapter === ch.id);
    const have = list.filter((c) => owned.has(c.id)).length;
    return `
      <section class="bk-ch">
        <header><h2>${esc(ch.title)}</h2><span>${have} / ${list.length}</span></header>
        <p>${esc(ch.blurb ?? '')}</p>
        <div class="bk-grid">
          ${list.map((c) => (owned.has(c.id)
    ? `<button class="bk-tile is-${esc(c.rarity)}" data-id="${esc(c.id)}"><b>${esc(c.title)}</b><i>${esc(RARITY_WORD[c.rarity] ?? '')}</i></button>`
    : `<button class="bk-tile is-down" data-id="${esc(c.id)}"><b aria-hidden="true">?</b><span class="sr-only">A card you have not found yet</span></button>`)).join('')}
        </div>
      </section>`;
  };

  outlet.innerHTML = `
    <section class="bk">
      <header class="bk__top">
        <a class="dl-back" href="#/world" aria-label="Back to the village"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>
        <h1 tabindex="-1">The Book of Curiosities</h1>
      </header>
      <div class="bk__count">
        <p><b>${found}</b> of ${cards.length} found</p>
        <div class="bk__bar"><i style="width:${cards.length ? ((found / cards.length) * 100).toFixed(1) : 0}%"></i></div>
        ${waiting ? `<a class="dl-btn dl-btn--go" href="#/letters">${waiting} ${waiting === 1 ? 'letter' : 'letters'} waiting</a>` : '<p class="bk__how">Every win in a duel drops a letter. Every letter holds cards.</p>'}
      </div>
      <div class="bk__chapters">${chapters.map(chapterHTML).join('')}</div>
      <div class="bk-sheet" id="sheet" hidden></div>
    </section>`;

  try { outlet.querySelector('h1')?.focus({ preventScroll: true }); } catch { /* fine */ }
  const sheet = outlet.querySelector('#sheet');
  const byId = new Map(cards.map((c) => [c.id, c]));
  const chapterOf = new Map(chapters.map((c) => [c.id, c]));
  const close = () => { const body = sheet.querySelector('.bk-sheet__body'); if (body) closeModal(body); sheet.hidden = true; sheet.innerHTML = ''; };
  outlet.querySelector('.bk__chapters').addEventListener('click', (e) => {
    const b = e.target.closest('.bk-tile');
    if (!b) return;
    const c = byId.get(b.dataset.id);
    if (!c) return;
    play('page');
    sheet.hidden = false;
    sheet.innerHTML = owned.has(c.id)
      ? `<div class="bk-sheet__bg" data-close></div><div class="bk-sheet__body">${cardHTML(c, chapterOf.get(c.chapter))}<button class="lt__share" id="share">Show someone</button><button class="dl-btn dl-btn--go" data-close>Close</button></div>`
      : `<div class="bk-sheet__bg" data-close></div><div class="bk-sheet__body"><div class="cd cd--down"><p class="cd__rarity">Not found yet</p><p class="cd__hook">${esc(c.hook)}</p><p class="cd__foot">${esc(chapterOf.get(c.chapter)?.title ?? '')}</p></div><a class="dl-btn dl-btn--go" href="#/duel">Win a letter</a><button class="dl-btn dl-btn--plain" data-close>Close</button></div>`;
    openModal(sheet.querySelector('.bk-sheet__body'), close, { label: 'A card', returnTo: b });
    sheet.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', close));
    sheet.querySelector('#share')?.addEventListener('click', (ev) => shareCard(c, ev.currentTarget));
  });
}

/** Open every waiting letter in turn. */
export async function renderLetters(outlet, { storage }) {
  await ensureDuelStyle();
  const records = await loadWorldRecords(storage);
  const waiting = pendingLetters(records.learning, Date.now(), records.sessions);
  if (!waiting.length) { location.replace('#/book'); return; }
  const { renderLetterOpen } = await import('./open-letter.js');
  renderLetterOpen(outlet, { storage, letter: waiting[0], doneLabel: waiting.length > 1 ? 'Next letter' : 'Done', doneHref: waiting.length > 1 ? `#/letters?n=${Date.now()}` : '#/world' });
}
