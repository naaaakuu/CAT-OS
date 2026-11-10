/**
 * model.js — what is in a room, worked out from saved sessions.
 *
 * Every item is one physical thing in the room: a carriage, a constellation, a
 * cog, a guest. It is `solved` once you got it perfectly, `tried` if you had a
 * go and it got away, otherwise `open`. A row of harder things opens when you
 * have tried half of the row before it. Derived, never stored.
 */

import { nextVerbal } from '../world/curator.js';

const TIER_ORDER = ['beginner', 'foundation', 'easy', 'medium', 'advanced', 'cat', 'cat-plus', 'ninety-nine', 'premium'];
export const TIER_LABEL = Object.freeze({ beginner: 'First steps', foundation: 'First steps', easy: 'Easy going', medium: 'Warming up', advanced: 'Advanced', cat: 'Exam level', 'cat-plus': 'Above the exam', 'ninety-nine': '99th percentile', premium: 'The hardest' });

export const OPENS_AT = 0.5;

/**
 * @param {Array<{id,tier,title,genre}>} rows registry rows of this subject
 * @param {Array} sessions every saved session
 * @param {string} mod 'pj' | 'ooo' | 'pc' | 'sp' | 'ps'
 */
export function roomModel(rows, sessions, mod, { seed = 'room', now = Date.now() } = {}) {
  const solved = new Set(), tried = new Set();
  const records = (Array.isArray(sessions) ? sessions : []).filter((s) => s && typeof s === 'object');
  for (const s of records) {
    if (s.module !== mod) continue;
    for (const a of (Array.isArray(s.answers) ? s.answers : [])) {
      if (!a || typeof a !== 'object') continue;
      const id = a.item_id ?? a.question_id;
      if (a.is_correct === true) solved.add(id);
      if (a.is_correct !== null && a.is_correct !== undefined) tried.add(id);
    }
  }
  const stateOf = (id) => (solved.has(id) ? 'solved' : tried.has(id) ? 'tried' : 'open');
  const present = [...new Set(rows.map((r) => r.tier))].sort((a, b) => TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b));
  let n = 0, prevOpen = true, prevTriedShare = 1;
  const tiers = present.map((id, i) => {
    const items = rows.filter((r) => r.tier === id).sort((a, b) => a.id.localeCompare(b.id)).map((r) => ({ ...r, n: (n += 1), state: stateOf(r.id) }));
    const open = i === 0 || (prevOpen && prevTriedShare >= OPENS_AT);
    const triedHere = items.filter((x) => x.state !== 'open').length;
    prevOpen = open; prevTriedShare = items.length ? triedHere / items.length : 1;
    return { id, label: TIER_LABEL[id] ?? id, items, open, done: items.filter((x) => x.state === 'solved').length, tried: triedHere, total: items.length };
  });
  const openRows = tiers.filter((t) => t.open).flatMap((t) => t.items);
  const pick = nextVerbal(openRows, records, mod, seed, now);
  const next = pick?.item ?? openRows.find((x) => x.state !== 'solved') ?? null;
  const all = tiers.flatMap((t) => t.items);
  return { tiers, next, solved: all.filter((x) => x.state === 'solved').length, tried: all.filter((x) => x.state !== 'open').length, total: all.length };
}
