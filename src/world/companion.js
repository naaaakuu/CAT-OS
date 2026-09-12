/**
 * companion.js — Wick, and the name of the valley.
 *
 * Wick is the one character in CAT OS who speaks. He is a small charcoal
 * cat who keeps the valley's lamps, and he has been keeping exactly one
 * of them alight, alone, for a long time. That is the whole premise of
 * the first five minutes: the valley is dark, Wick is still here, and
 * everything the learner learns lights something.
 *
 * His voice, held to across every screen:
 *   - short sentences, plainly said, never more than two at a time;
 *   - he notices, he does not congratulate ("Look at that." not "Great job!");
 *   - he never explains a rule, names a metric, or says the word "study";
 *   - he is glad you came back, and he never guilts you for being away.
 *
 * This module owns three things nothing else should duplicate: the
 * valley's name (stored in settings, so it travels in backups), whether
 * the learner has been welcomed yet, and the lines Wick says.
 */

import { STORES } from '../core/storage/storage-adapter.js';

export const WICK = Object.freeze({
  name: 'Wick',
  what: 'the lamp-keeper',
});

const KEY = 'valley';

/* ------------------------------------------------------------------ */
/* The valley's name                                                   */
/* ------------------------------------------------------------------ */

/** @returns {{name: string|null, awakened_at: string|null}} */
export async function loadValley(storage) {
  try {
    const rec = await storage.get(STORES.SETTINGS, KEY);
    const v = rec?.value;
    if (v && typeof v === 'object') return { name: v.name ?? null, awakened_at: v.awakened_at ?? null };
  } catch { /* an unnamed valley still opens */ }
  return { name: null, awakened_at: null };
}

export async function saveValley(storage, patch) {
  const now = await loadValley(storage);
  const value = { ...now, ...patch };
  await storage.put(STORES.SETTINGS, { id: KEY, value });
  return value;
}

/** True when the learner has never been welcomed. */
export function isUnawakened(valley) { return !valley?.awakened_at; }

/** The valley's name, or the honest fallback before it has one. */
export function valleyName(valley) { return valley?.name?.trim() || 'the valley'; }

/** Names offered on the naming sign. Seeded by the day so a learner who
 *  reloads sees the same three, and they are all things a valley could
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
  // Capitalise after a space or a hyphen only: an apostrophe inside a
  // word belongs to the word ("Wren's Fold", never "Wren'S Fold").
  return t.replace(/(^|[\s-])(\p{L})/gu, (m, pre, ch) => pre + ch.toLocaleUpperCase());
}

/* ------------------------------------------------------------------ */
/* What Wick says                                                      */
/* ------------------------------------------------------------------ */

/** The opening, before the valley has a name. One line per tap. */
export const OPENING = Object.freeze([
  'Oh. You came.',
  'I’m Wick. I keep the lamps around here.',
  'All of this is yours. The wood, the water, the whole of it.',
  'It went quiet a long time ago. Most of the lamps went out.',
  'Here’s the part worth knowing: everything you learn lights one.',
]);

export const NAMING = Object.freeze({
  ask: 'It should have a name. What do we call it?',
  after: (name) => `${name}. Good. I’ll remember that.`,
});

export const FIRST_TASK = Object.freeze({
  offer: 'Come on — one small thing, and you’ll see what I mean.',
  during: 'Take your time. Wrong is fine; wrong is how it sticks.',
  after: 'Now look up.',
});

export const DAWN = Object.freeze([
  'There. That was you.',
  'One lamp. There are a hundred more out there.',
]);

/**
 * A line for coming home, chosen by what is actually true of the world.
 * Order matters: the most useful thing Wick could say wins.
 * @param {object} state the derived world state
 * @param {{awayDays?: number, name?: string}} extra
 */
export function homecoming(state, { awayDays = 0, name = 'the valley' } = {}) {
  const ready = state?.readyWorks?.length ?? 0;
  const due = (state?.rootwood?.dueCount ?? 0) + (state?.meadow?.due ?? 0) + (state?.pond?.due ?? 0) + (state?.thicket?.due ?? 0);
  const built = state?.builds?.length ?? 0;

  if (ready > 0) return ready === 1
    ? 'You’ve got enough for something. Come and see.'
    : `You’ve got enough for ${ready} of them now.`;
  if (awayDays >= 7) return `${awayDays} days. The lamps held. Start anywhere.`;
  if (awayDays >= 2) return due
    ? `You’ve been away. ${due} ${due === 1 ? 'thing is' : 'things are'} asking to be looked at again.`
    : 'You’ve been away. The valley kept.';
  if (due >= 12) return `A few things are slipping. Worth catching them today.`;
  if (built === 0) return 'Pick anywhere. It all counts toward the same thing.';
  if (built < 4) return `${name} is starting to look like somewhere.`;
  return 'Quiet day. Good weather for it.';
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
    case 'hearth': return state?.readyWorks?.length ? 'Something’s ready to go up.' : 'Home. Warm enough.';
    default: return '';
  }
}
