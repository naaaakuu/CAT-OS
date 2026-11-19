/**
 * chase.js — the other half of the game: a beaten Muddle runs into a house.
 *
 * The owner (2026-11-12): PLAY was the only thing anybody pressed, so "no
 * one will ever go inside a particular house"; the game should alternate,
 * one go against a Muddle, the next inside a house. So a Muddle you beat
 * runs off and hides in the home where its bad habit is cured (the Scrambler
 * in Ginger's railway, Sir Waffle in Mochi's pantry, the Skimmer in Chai's
 * library). PLAY becomes CHASE, the camera goes into that house, and the
 * first real round played there catches it, for a pocket of laurels on the
 * Laurel Road. Then PLAY is a duel again. Lose a duel and nobody runs: it is
 * a rematch.
 *
 * Nothing is stored. A chase is read off the ordinary records in time order:
 * a won duel opens it, and it is caught by any evidence of real play in its
 * hideout (seals.js evidenceFrom: answered sessions and rounds in that home,
 * never a visit, never anything a duel made itself) after the duel and before
 * the next one. Starting another duel lets an uncaught Muddle go: no penalty,
 * it simply got away. Pure: no storage, no DOM. tools/check-chase.mjs.
 */

import { duelsIn, boutOf, ladderOf } from './model.js';
import { evidenceFrom, TOUR } from '../pets/seals.js';

/** What catching one is worth: about a third of a win, so a duel stays the big pull and the house is never skipped. */
export const CHASE_LAURELS = 12;

/** Where each Muddle runs to hide: the home that cures its habit. The Great Muddle runs to whichever home you have left longest. */
export const HIDEOUT = Object.freeze({
  smudge: 'matcha', mixup: 'matcha', verbose: 'chai', skimmer: 'chai', scrambler: 'ginger',
  tangent: 'mallow', ellipsis: 'sesame', gatecrasher: 'biscuit', waffle: 'mochi', greatmuddle: null,
});
/** The homes a Muddle can hide in (the hearth is the weekly Gauntlet, never a hideout). */
export const HIDEOUTS = Object.freeze(['chai', 'matcha', 'ginger', 'mallow', 'mochi', 'biscuit', 'sesame']);

const STRAND_HOME = new Map(TOUR.flatMap((h) => h.strands.map((s) => [s.id, h.id])));
/** "Matcha's glasshouse": a hideout's name in a sentence (the tour's own names). */
export const homeName = (id) => TOUR.find((h) => h.id === id)?.home ?? 'a house';
const time = (x) => { const t = Date.parse(x); return Number.isFinite(t) ? t : null; };

/** The home a beaten Muddle runs to, knowing only what was played before `at`. */
export function hideoutFor(boutId, evidence, at) {
  const fixed = HIDEOUT[boutId];
  if (fixed) return fixed;
  const last = new Map(HIDEOUTS.map((h) => [h, -Infinity]));
  for (const e of evidence) { const h = STRAND_HOME.get(e.strand); if (e.at < at && last.has(h)) last.set(h, Math.max(last.get(h), e.at)); }
  // The home left longest; a tie goes to the lane's order.
  return HIDEOUTS.reduce((best, h) => (last.get(h) < last.get(best) ? h : best), HIDEOUTS[0]);
}

/**
 * Every chase, oldest first: { duel, bout, home, at, until, caughtAt }.
 * `until` is when the next duel started (Infinity for the latest), `caughtAt`
 * the first real play in the hideout inside that window, or null.
 */
export function chasesOf(records) {
  const learning = Array.isArray(records?.learning) ? records.learning : [];
  const duels = duelsIn(learning);
  if (!duels.some((d) => d.won)) return [];
  const evidence = evidenceFrom(records);
  const out = [];
  duels.forEach((d, i) => {
    if (!d.won || d.forfeited) return;
    const at = time(d.finished_at), next = duels[i + 1], until = next ? (time(next.started_at) ?? time(next.finished_at) ?? Infinity) : Infinity;
    const home = hideoutFor(d.muddle, evidence, at);
    const hit = evidence.find((e) => e.at > at && e.at < until && STRAND_HOME.get(e.strand) === home);
    out.push({ duel: d, bout: boutOf(d.muddle), home, at, until, caughtAt: hit ? hit.at : null });
  });
  return out;
}

/** The chase still on: the latest duel was won and its Muddle is still hiding. Else null. */
export function openChase(records) {
  const all = chasesOf(records), last = all[all.length - 1];
  const duels = duelsIn(records?.learning);
  if (!last || duels[duels.length - 1] !== last.duel || last.caughtAt !== null) return null;
  return last;
}

/** The latest Muddle caught (for the toast on the way back), or null. */
export function lastCaught(records) {
  const caught = chasesOf(records).filter((c) => c.caughtAt !== null);
  return caught[caught.length - 1] ?? null;
}

/** Laurels earned by catching, as { at, laurels } for the Laurel Road's fold. */
export function chaseLaurels(records) {
  return chasesOf(records).filter((c) => c.caughtAt !== null).map((c) => ({ at: c.caughtAt, laurels: CHASE_LAURELS }));
}

/* ---- What the Muddle ran off with ----
 * A duel keeps what got away from the learner (`got_away` on its record: each
 * miss in the words the result screen used). The Muddle carries it into its
 * hideout, so a chase is after something of the learner's own, and the sign
 * before the next big move of that kind can say what happened last time.
 * Display only: nothing here pays Glow or laurels, and a record without it
 * (every duel before 3.23.0) simply has no loot.
 */
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** One miss as a duel record keeps it: { kind, head, body, trap, from }, every field a short string. */
export function packMiss(m) {
  return { kind: str(m?.kind, 20), head: str(m?.head, 160), body: str(m?.body, 600), trap: str(m?.trap, 120), from: str(m?.from, 120) };
}

/** The kind of miss each home can give back: the one a Muddle hiding there shows first. */
const HOME_KINDS = Object.freeze({ chai: ['read', 'decode'], matcha: ['word', 'twin'], ginger: ['chain'], mallow: ['stray'], sesame: ['gap'], biscuit: ['seat'], mochi: ['point'] });

/**
 * The misses a duel record carries, cleaned (a hostile or old record gives []).
 * With a `home`, the misses that home teaches come first, so Sir Waffle in the
 * pantry holds up the summary you missed before the word you missed.
 */
export function lootOf(duel, home = null) {
  const list = Array.isArray(duel?.got_away) ? duel.got_away : [];
  return leadWith(list.slice(0, 8).map(packMiss).filter((m) => m.head), home);
}

/** The same misses with the ones a home teaches first (order otherwise kept). */
export function leadWith(loot, home) {
  const kinds = HOME_KINDS[home];
  if (!kinds) return loot;
  return [...loot.filter((m) => kinds.includes(m.kind)), ...loot.filter((m) => !kinds.includes(m.kind))];
}

/** One miss in a few words: the word itself, the trap in plain words, or the start of what was asked. */
export function lootShort(m) {
  if (!m) return '';
  if (m.kind === 'word' || m.kind === 'twin') return m.head;
  if (m.trap) return m.trap;
  return m.head.length > 54 ? `${m.head.slice(0, 52).trimEnd()}...` : m.head;
}

/** "one of yours" / "3 of yours": how many things a Muddle took. */
export const lootCount = (n) => (n === 1 ? 'one of yours' : `${n} of yours`);

/**
 * The latest miss of one kind that named its trap, newest first: what the
 * sign before a big move reminds the learner of. `now` is this duel's own
 * misses so far (they come before any saved duel).
 */
export function lastMiss(duels, kind, now = []) {
  const named = (list) => [...list].reverse().find((m) => m?.kind === kind && m.trap);
  const here = named(now.map(packMiss));
  if (here) return here;
  const list = Array.isArray(duels) ? duels : [];
  for (let i = list.length - 1; i >= 0; i -= 1) { const hit = named(lootOf(list[i])); if (hit) return hit; }
  return null;
}

/** The ladder with every caught Muddle folded in: what every screen should show. */
export function ladderFrom(records) {
  return ladderOf(duelsIn(records?.learning), chaseLaurels(records));
}
