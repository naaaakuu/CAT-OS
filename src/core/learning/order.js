/**
 * order.js — this learner's own order inside a level (owner, 2026-10-05:
 * "there shouldn't be a particular sequence for the passages; one person
 * might get a first passage different from the next one"). Levels still
 * climb in order; inside one, every item sorts by a key drawn from a seed
 * made once for this learner, so the order is random from one learner to the
 * next and stable for one (the friend's card, the house button and the list
 * always name the same next item). Starting over (settings) clears the seed,
 * so a fresh start deals a fresh order.
 */

const KEY = 'catos:order-seed';
let seed = null;

function learnerSeed() {
  if (seed) return seed;
  try {
    seed = localStorage.getItem(KEY);
    if (!seed) { seed = Math.random().toString(36).slice(2, 10); localStorage.setItem(KEY, seed); }
  } catch { seed = 'cat-os'; } // no storage (Node checks, a locked-down browser): one fixed order
  return seed;
}

/** FNV-1a of this learner's seed and an item id: where the item falls inside its level. */
export function orderKey(id) {
  const s = `${learnerSeed()}:${id}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Sort comparator for two items in the same level. */
export const byLearner = (a, b) => orderKey(a.id) - orderKey(b.id) || String(a.id).localeCompare(String(b.id));
