/**
 * letters.js — what a win puts in the post, and what comes out of an envelope.
 *
 * A letter is owed by a saved duel, or by the morning (one Morning Post a day).
 * Opening one saves a `letter-open` record naming the cards it held, so the
 * collection is only ever the union of what was opened: derived, backed up
 * with everything else, impossible to drift.
 *
 * No DOM and no storage, so the odds can be tested in Node.
 */

import { dayKey } from '../core/engagement/streaks.js';
import { sideLetters } from './sideshows.js';

export const GRADES = Object.freeze({
  wax: { id: 'wax', name: 'A sealed letter', cards: 1 },
  silver: { id: 'silver', name: 'A silver-sealed letter', cards: 2 },
  gold: { id: 'gold', name: 'A gold-sealed letter', cards: 3 },
});

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];

/** A small seeded generator: the same letter always holds the same cards. */
export function seeded(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i += 1) { h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    const t = (h ^= h >>> 16) >>> 0;
    return t / 4294967296;
  };
}

/** The grade a win earns. Every tenth letter is golden, so a dry spell always ends. */
export function gradeFor(seed, lettersSoFar, { first = false } = {}) {
  if (first) return 'gold';
  if ((lettersSoFar + 1) % 10 === 0) return 'gold';
  const v = seeded(`grade:${seed}`)();
  return v < 0.06 ? 'gold' : v < 0.3 ? 'silver' : 'wax';
}

/**
 * Letters waiting to be opened, oldest first. Five sources: a won duel, the
 * Morning Post, the first time you finish a book in Chai's library (he tucks
 * a letter inside it), a day's ten words in Matcha's Glasshouse and a week's
 * run of Toffee's Gauntlet (sideshows.js). Book letters come three at a time,
 * so a long reader's history arrives as a treat and not a heap.
 */
export function pendingLetters(learning, now = Date.now(), sessions = []) {
  const list = Array.isArray(learning) ? learning : [];
  const opened = new Set(list.filter((r) => r?.kind === 'letter-open').map((r) => r.letter_id));
  const out = [];
  let anyDuel = false;
  for (const d of list) {
    if (d?.kind !== 'duel') continue;
    anyDuel = true;
    if (d.letter?.id && !opened.has(d.letter.id)) out.push({ ...d.letter, from: 'duel', at: d.finished_at, muddle: d.muddle });
  }
  const books = new Set();
  let bookLetters = 0;
  for (const b of (Array.isArray(sessions) ? [...sessions] : []).sort((x, y) => String(x?.finished_at).localeCompare(String(y?.finished_at)))) {
    if (!b || b.module || !b.passage_id || !b.score?.total || !b.finished_at || books.has(b.passage_id)) continue;
    books.add(b.passage_id);
    const id = `book-${b.passage_id}`;
    if (opened.has(id) || bookLetters >= 3) continue;
    bookLetters += 1;
    out.push({ id, grade: b.score.correct === b.score.total ? 'silver' : 'wax', from: 'book', at: b.finished_at });
  }
  for (const l of sideLetters(list)) if (!opened.has(l.id)) out.push(l);
  out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  // The Morning Post waits for you from the day after your first duel.
  const today = dayKey(now);
  const postId = `post-${today}`;
  const firstDay = list.filter((r) => r?.kind === 'duel').map((r) => dayKey(r.finished_at)).sort()[0];
  if (anyDuel && firstDay && firstDay !== today && !opened.has(postId)) out.unshift({ id: postId, grade: 'silver', from: 'post', at: new Date(now).toISOString() });
  return out;
}

export const openedLetters = (learning) => (Array.isArray(learning) ? learning : []).filter((r) => r?.kind === 'letter-open');

export function ownedCards(learning) {
  const owned = new Map();
  for (const r of openedLetters(learning)) for (const id of (Array.isArray(r.cards) ? r.cards : [])) owned.set(id, (owned.get(id) ?? 0) + 1);
  return owned;
}

function rollRarity(r, floor = 'common') {
  const v = r();
  let rarity = v < 0.01 ? 'legendary' : v < 0.08 ? 'epic' : v < 0.38 ? 'rare' : 'common';
  if (RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.indexOf(floor)) rarity = floor;
  return rarity;
}

/**
 * The card your next letter will open with, told in advance as a one-line
 * teaser: a question planted now and answered by winning. It is a promise, so
 * drawCards puts it first. Stable until the collection changes.
 */
export function teaseCard(deck, owned) {
  const fresh = deck.filter((c) => !owned.has(c.id));
  if (!fresh.length) return null;
  const juicy = fresh.filter((c) => c.rarity !== 'common');
  const from = juicy.length ? juicy : fresh;
  return [...from].sort((a, b) => String(a.id).localeCompare(String(b.id)))[Math.floor(seeded(`tease:${owned.size}`)() * from.length)];
}

/**
 * Pick the cards a letter holds. Cards you do not own come first; once a
 * rarity has run dry the search widens rather than repeating a card.
 * @param {{id:string, grade:string}} letter
 * @param {Array<{id:string,rarity:string}>} deck
 * @param {Map<string,number>} owned
 * @param {{force?:string[], lead?:string|null}} [o] force: exact card ids (the very first letter); lead: the card this letter opens with, the one that was promised
 * @returns {string[]} card ids
 */
export function drawCards(letter, deck, owned, { force = null, lead = null } = {}) {
  const grade = GRADES[letter.grade] ?? GRADES.wax;
  if (force) return force.filter((id) => deck.some((c) => c.id === id)).slice(0, grade.cards);
  const r = seeded(`cards:${letter.id}`);
  const taken = new Set();
  const out = [];
  const floors = letter.grade === 'gold' ? ['common', 'rare', 'epic'] : letter.grade === 'silver' ? ['common', 'rare'] : ['common'];
  const promised = lead ? deck.find((c) => c.id === lead && !owned.has(c.id)) : null;
  if (promised) { taken.add(promised.id); out.push(promised.id); }
  for (let i = out.length; i < grade.cards; i += 1) {
    const want = rollRarity(r, floors[i] ?? 'common');
    const start = RARITY_ORDER.indexOf(want);
    // Search outward from the rolled rarity: up first, because a nicer card is never a disappointment.
    const order = [...RARITY_ORDER.slice(start), ...RARITY_ORDER.slice(0, start).reverse()];
    let picked = null;
    for (const rarity of order) {
      const fresh = deck.filter((c) => c.rarity === rarity && !owned.has(c.id) && !taken.has(c.id));
      if (fresh.length) { picked = fresh[Math.floor(r() * fresh.length)]; break; }
    }
    if (!picked) {
      const any = deck.filter((c) => !taken.has(c.id));
      if (any.length) picked = any[Math.floor(r() * any.length)];
    }
    if (picked) { taken.add(picked.id); out.push(picked.id); }
  }
  return out;
}

/** The record that remembers an opened letter. */
export function openRecord(letter, cards, now = Date.now()) {
  return { id: `letter-open:${letter.id}`, kind: 'letter-open', module: 'duel', letter_id: letter.id, grade: letter.grade, cards, opened_at: new Date(now).toISOString() };
}
