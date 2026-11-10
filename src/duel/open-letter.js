/**
 * open-letter.js — a letter, a thumb, and the best thing about English you
 * have read all week. One envelope, one tap to crack the seal, then the cards
 * come out one at a time, each held until you are done with it.
 *
 * The opened letter is saved before the cards are shown, so a closed app can
 * never lose a card or open the same letter twice.
 */

import { STORES } from '../core/storage/storage-adapter.js';
import { escapeHTML as esc } from '../core/utils/format.js';
import { play, holdMusic } from '../world/audio.js';
import { loadWorldRecords } from '../world/state.js';
import { shareText, track } from '../core/native.js';
import { remindersSupported, remindersOn, turnOnReminders } from '../shell/reminders.js';
import { ensureDuelStyle } from './style.js';
import { loadCurios } from './content.js';
import { GRADES, drawCards, ownedCards, openRecord, teaseCard } from './letters.js';
import { envelopeSVG } from './art.js';
import { buzz, confetti, reduced, sparks } from './fx.js';

/* Paper, from the humblest to the one you would lock in a safe. */
export const RARITY_WORD = { common: 'Scrap', rare: 'Folio', epic: 'Manuscript', legendary: 'First Edition' };
export const RARITY_RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };

/* The very first letter of a player's life is hand-picked. */
const FIRST_CARDS = ['glamour', 'nice', 'bully'];

/** One card, on paper. Shared with the Book. */
export function cardHTML(card, chapter, { fresh = false } = {}) {
  return `
    <article class="cd cd--${esc(card.rarity)}">
      <header class="cd__top">
        <span class="cd__rarity">${RARITY_WORD[card.rarity] ?? ''}</span>
        ${fresh ? '<span class="cd__new">New</span>' : ''}
      </header>
      <h2 class="cd__title">${esc(card.title)}</h2>
      <p class="cd__origin">${esc(card.origin ?? '')}</p>
      <p class="cd__story">${esc(card.story)}</p>
      ${card.try ? `<p class="cd__try">${esc(card.try)}</p>` : ''}
      <footer class="cd__foot">${esc(chapter?.title ?? '')}</footer>
    </article>`;
}

/** A card is worth passing on: that is how a curious person finds this game. */
export async function shareCard(card, button) {
  const r = await shareText(`${card.title}\n\n${card.story}`);
  if (r === 'shared') try { track('share', { content_type: 'card', item_id: card.id }); } catch { /* fine */ }
  if (button && r === 'copied') button.textContent = 'Copied';
}

export async function renderLetterOpen(outlet, { storage, letter, first = false, onDone, doneLabel = 'Done', doneHref = '#/world' }) {
  await ensureDuelStyle();
  const grade = GRADES[letter.grade] ?? GRADES.wax;

  outlet.innerHTML = `
    <section class="lt lt--${esc(letter.grade)}" data-state="sealed">
      <div class="lt__glow"></div>
      <p class="lt__head">${esc(letter.from === 'post' ? 'The Morning Post' : letter.from === 'book' ? 'Tucked inside the book' : grade.name)}</p>
      <button class="lt__env" id="env" aria-label="Open the letter">${envelopeSVG(letter.grade, { width: 240 })}</button>
      <p class="lt__hint" id="hint">Tap the seal to break it</p>
      <div class="lt__cards" id="cards"></div>
      <div class="fx-layer" id="fxlayer" aria-hidden="true"></div>
    </section>`;

  const root = outlet.querySelector('.lt');
  const env = outlet.querySelector('#env');
  const cardsEl = outlet.querySelector('#cards');
  const fxLayer = outlet.querySelector('#fxlayer');
  // The seal, the rip and the reveal have the air to themselves; the song comes back when the letter is done.
  holdMusic(true);
  const letGo = () => { window.removeEventListener('hashchange', letGo); holdMusic(false, { resumeIn: 0.4 }); };
  window.addEventListener('hashchange', letGo);

  const [{ chapters, cards }, records] = await Promise.all([loadCurios(), loadWorldRecords(storage)]);
  const chapterOf = new Map(chapters.map((c) => [c.id, c]));
  const byId = new Map(cards.map((c) => [c.id, c]));
  // No cards in hand (first run, offline): the letter stays sealed for later rather than opening empty.
  if (!cards.length) {
    root.querySelector('#hint').textContent = 'The post is delayed. This letter will keep.';
    env.disabled = true;
    return;
  }
  const owned = ownedCards(records.learning);
  const firstEver = first ? cards.filter((c) => FIRST_CARDS.includes(String(c.title).toLowerCase())).sort((a, b) => FIRST_CARDS.indexOf(String(a.title).toLowerCase()) - FIRST_CARDS.indexOf(String(b.title).toLowerCase())).map((c) => c.id) : null;
  const promised = teaseCard(cards, owned);
  const ids = drawCards(letter, cards, owned, { force: firstEver?.length ? firstEver : null, lead: promised?.id ?? null });

  // Written down before anything is shown.
  try { await storage.put(STORES.LEARNING, openRecord(letter, ids)); } catch (err) { console.error('[CAT OS] a letter could not be saved', err); }

  const drawn = ids.map((id) => byId.get(id)).filter(Boolean);
  // What the next letter promises, now that these are yours.
  const after = new Map(owned); for (const id of ids) after.set(id, 1);
  const nextTease = teaseCard(cards, after);
  // Right after the teaser is when someone wants to be told. Asked here, never on opening the app.
  let offerReminder = false;
  try { offerReminder = remindersSupported() && !(await remindersOn(storage)) && !localStorage.getItem('catos:reminder-denied'); } catch { /* no offer */ }

  /* Three taps to break it. The wait is half the pleasure: each one cracks the
     wax a little more, harder in the hand, and the third lets it go. */
  let cracks = 0, opened = false;
  const hint = root.querySelector('#hint');
  env.addEventListener('click', () => {
    if (opened) return;
    cracks += 1;
    if (cracks < 3) {
      env.classList.remove('is-knock'); void env.offsetWidth; env.classList.add('is-knock');
      root.dataset.cracks = String(cracks);
      play('bite'); buzz(cracks === 1 ? 14 : 26);
      hint.textContent = cracks === 1 ? 'Again' : 'One more';
      return;
    }
    opened = true;
    root.dataset.state = 'opening';
    play('rip'); buzz([18, 30, 40]);
    setTimeout(() => {
      if (!root.isConnected) return;
      const r = env.getBoundingClientRect();
      sparks(fxLayer, r.left + r.width / 2, r.top + r.height / 2, { n: 24, spread: 150, size: 9 });
      show(0);
    }, reduced() ? 40 : 520);
  });

  function show(i) {
    if (!root.isConnected) return;
    root.dataset.state = 'reveal';
    const c = drawn[i];
    if (!c) { finish(); return; }
    const rank = RARITY_RANK[c.rarity] ?? 0;
    const isLast = i === drawn.length - 1;
    cardsEl.innerHTML = `
      <div class="lt__stage">
        <p class="lt__count">${drawn.length > 1 ? `Card ${i + 1} of ${drawn.length}` : ''}</p>
        <div class="lt__flip is-${esc(c.rarity)}" id="flip">${cardHTML(c, chapterOf.get(c.chapter), { fresh: !owned.has(c.id) })}</div>
        <button class="lt__share" id="share">Show someone</button>
        <button class="dl-btn dl-btn--go dl-btn--xl" id="next">${isLast ? esc(doneLabel) : 'Next card'}</button>
        ${isLast ? '<a class="dl-btn dl-btn--plain" href="#/book">See your Book</a>' : ''}
        ${isLast && nextTease ? `<p class="lt__tease"><span>Your next letter opens with</span>${esc(nextTease.hook)}</p>` : ''}
        ${isLast && nextTease && offerReminder ? '<button class="lt__share" id="remind">Tell me when it arrives</button>' : ''}
      </div>`;
    play('cardflip');
    setTimeout(() => {
      if (!root.isConnected) return;
      play('reveal', { pitch: rank });
      if (rank >= 2) { buzz(rank === 3 ? [30, 40, 30, 40, 80] : [24, 40, 40]); confetti(root, { n: rank === 3 ? 70 : 34 }); }
    }, reduced() ? 0 : 340);
    cardsEl.querySelector('#next').addEventListener('click', () => (isLast ? finish() : show(i + 1)), { once: true });
    cardsEl.querySelector('#share').addEventListener('click', () => shareCard(c, cardsEl.querySelector('#share')));
    cardsEl.querySelector('#remind')?.addEventListener('click', async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      const ok = await turnOnReminders(storage);
      if (!ok) { try { localStorage.setItem('catos:reminder-denied', '1'); } catch { /* fine */ } }
      b.textContent = ok ? 'Done. Watch for it.' : 'You can turn this on in Settings';
    });
  }

  function finish() {
    if (doneHref) { location.hash = doneHref; return; }
    letGo();
    onDone?.();
  }
}
