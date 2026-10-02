/**
 * companion.js — the village's name, whether the learner has been welcomed,
 * and the one line a place says on arrival.
 *
 * (2.x kept Wick's whole script here: the opening, the naming, the first
 * order, coming home, a line for every stage of the village. 3.0's pets
 * speak for themselves in src/pets/pets.js, and Toffee says the hello.)
 *
 * The name lives in settings, so it travels in backups.
 */

import { STORES } from '../core/storage/storage-adapter.js';

const KEY = 'valley';

/* ------------------------------------------------------------------ */
/* The village's name                                                  */
/* ------------------------------------------------------------------ */

/** @returns {{name: string|null, awakened_at: string|null, met_at: string|null}} */
export async function loadValley(storage) {
  try {
    const rec = await storage.get(STORES.SETTINGS, KEY);
    const v = rec?.value;
    if (v && typeof v === 'object') return { name: v.name ?? null, awakened_at: v.awakened_at ?? null, met_at: v.met_at ?? null };
  } catch { /* an unnamed village still opens */ }
  return { name: null, awakened_at: null, met_at: null };
}

export async function saveValley(storage, patch) {
  const now = await loadValley(storage);
  const value = { ...now, ...patch };
  await storage.put(STORES.SETTINGS, { id: KEY, value });
  return value;
}

/** True when the learner has never been welcomed. */
export function isUnawakened(valley) { return !valley?.awakened_at; }

/** The village's name, or the honest fallback before it has one. */
export function valleyName(valley) { return valley?.name?.trim() || 'the village'; }

/** Names offered on the naming sign. Seeded by the day so a learner who
 *  reloads sees the same three, and they are all things a village could
 *  plausibly be called — never cute, never branded. */
export function nameSuggestions(seed = String(new Date().getDate())) {
  const first = ['Alder', 'Ember', 'Quill', 'Hollow', 'Marrow', 'Kestrel', 'Bramble', 'Sable', 'Wren', 'Thistle', 'Loam', 'Vesper'];
  const second = ['Hollow', 'Vale', 'Reach', 'Bottom', 'Hush', 'Fold', 'Glen', 'Wend'];
  let h = 2166136261;
  for (const ch of `valley:${seed}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const pick = (arr, n) => arr[Math.abs((h >>> (n * 5)) % arr.length)];
  const out = new Set();
  for (let i = 0; i < 6 && out.size < 3; i += 1) out.add(`${pick(first, i)} ${pick(second, i + 1)}`);
  return [...out];
}

/** What the learner types, made safe and shaped like a place name. */
export function cleanValleyName(raw) {
  const t = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 28);
  if (!t) return '';
  return t.replace(/(^|[\s-])(\p{L})/gu, (m, pre, ch) => pre + ch.toLocaleUpperCase());
}

/** A line for a place the learner is standing in, said once on arrival. */
export function atPlace(slug, state) {
  switch (slug) {
    case 'rootwood': return 'Take a word apart here and a dozen others open up.';
    case 'meadow': return 'Every word that sticks is a flower that stays.';
    case 'pond': return 'Two words, almost the same. Almost is the whole problem.';
    case 'reading-room': return 'Clock’s running in there. That’s the point.';
    case 'terraces': return 'Word parts. Learn ten, read a thousand.';
    case 'thicket': return 'Words that came from somewhere else, and kept their accent.';
    case 'loom': return 'Sentences in the wrong order. Find the thread.';
    case 'wilds': return 'Nothing new out there. Just everything, fast.';
    case 'hearth': return state?.pets?.nextTreasure?.affordable ? 'There is enough in the satchel for a treasure.' : 'Home. Warm enough.';
    default: return '';
  }
}
