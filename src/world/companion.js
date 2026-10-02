/**
 * companion.js — Wick, and the name of the village.
 *
 * Wick is the one character in CAT OS who speaks to the learner. He is a
 * small charcoal cat who keeps the village's lamps, and he has kept them
 * alone for a long time. That is the whole premise of the first minutes:
 * the village is small, Wick is still here, and everything the learner
 * learns builds something.
 *
 * His voice, held to across every screen:
 *   - short sentences, plainly said, never more than two at a time;
 *   - he notices, he does not congratulate ("Look at that." not "Great job!");
 *   - he never explains a rule, names a metric, or says the word "study";
 *   - he is glad you came back, and he never guilts you for being away.
 *
 * This module owns three things nothing else should duplicate: the
 * village's name (stored in settings, so it travels in backups), whether
 * the learner has been welcomed yet, and the lines Wick says.
 */

import { STORES } from '../core/storage/storage-adapter.js';
import { STAGES } from '../village/defs.js';

export const WICK = Object.freeze({
  name: 'Wick',
  what: 'the lamp-keeper',
});

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

/* ------------------------------------------------------------------ */
/* What Wick says                                                      */
/* ------------------------------------------------------------------ */

/** The opening. One line per tap. */
export const OPENING = Object.freeze([
  'Oh. You came.',
  'I’m Wick. I keep the lamps around here.',
  'This is your village. A house, a reading house, and Mira across the way.',
  'Mira needs a Book for the school. Ada binds them. Go and see her.',
]);

export const NAMING = Object.freeze({
  ask: 'It should have a name. What do we call it?',
  after: (name) => `${name}. Good. I’ll remember that.`,
});

export const FIRST_TASK = Object.freeze({
  offer: 'She needs Pages, and Pages come from reading. Take your time.',
  during: 'Take your time. Wrong is fine; wrong is how it sticks.',
  after: 'Now look up.',
});

export const DAWN = Object.freeze([
  'There. That was you.',
  'Deliver them, and the coins are yours.',
]);

/** Lines for the first loop, by onboarding step. */
export const STEP_LINES = Object.freeze({
  'first-read': 'Ada binds Pages into Books. Pages come from reading. Tap the Reading House.',
  binding: 'Ada’s binding. Give her a moment.',
  collect: 'It’s on the shelf. Take it.',
  deliver: 'Mira’s waiting at the board by the door. Give it to her.',
  build: 'Coins build things. Bo wants a patch of ground for a garden.',
  name: 'It should have a name now.',
});

/**
 * A line for coming home, chosen by what is actually true of the village.
 * Order matters: the most useful thing Wick could say wins.
 * @param {object} state the derived world state (with .village)
 * @param {{awayDays?: number, name?: string}} extra
 */
export function homecoming(state, { awayDays = 0, name = 'the village' } = {}) {
  const v = state?.village;
  const deliverable = v?.deliverable?.length ?? state?.readyWorks?.length ?? 0;
  const ready = v?.readyThings?.length ?? 0;
  const collect = v?.collectable?.reduce((n, b) => n + (b.helper?.available ?? 0), 0) ?? 0;
  const due = (state?.rootwood?.dueCount ?? 0) + (state?.meadow?.due ?? 0) + (state?.pond?.due ?? 0) + (state?.thicket?.due ?? 0);
  const built = v?.levels?.size ?? state?.builds?.length ?? 0;

  if (deliverable > 0) return deliverable === 1 ? 'An order is ready. Somebody’s waiting on it.' : `${deliverable} orders are ready to go.`;
  if (ready > 0) return ready === 1 ? 'You’ve got enough for something. Come and see.' : `You’ve got enough for ${ready} of them now.`;
  if (collect > 0) return `${collect} ${collect === 1 ? 'thing was' : 'things were'} made while you were gone. Go and collect.`;
  if (awayDays >= 7) return `${awayDays} days. The lamps held. Start anywhere.`;
  if (awayDays >= 2) return due
    ? `You’ve been away. ${due} ${due === 1 ? 'word is' : 'words are'} asking to be looked at again.`
    : 'You’ve been away. The village kept.';
  if (due >= 12) return 'A few things are slipping. Worth catching them today.';
  if (built <= 2) return 'Pick anywhere. It all counts toward the same thing.';
  if (built < 5) return `${name} is starting to look like somewhere.`;
  return 'Quiet day. Good weather for it.';
}

/**
 * What Wick says the first time the village reaches a new stage. He does
 * not congratulate and he does not explain — he notices, the way someone
 * who lives somewhere notices it changing.
 */
const STAGE_LINES = Object.freeze({
  'A hamlet': 'Two chimneys going this morning. Used to be one.',
  'A village': 'The market was busy when I came past. That is new.',
  'A busy village': 'Everybody has work. Nobody had work when you got here.',
  'A town': 'Somebody put a roof up by the river. Word gets round.',
  'A market town': 'People come here to trade now. I have stopped counting them.',
  'A town people travel to': 'Somebody on the road asked me the way here. By name.',
});

export function stageLine(stageName) { return STAGE_LINES[stageName] ?? null; }

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

/** What Wick says when he sees the thing you built. He notices; he never
 *  congratulates, and he never says the word "unlocked". */
export function builtLine(name) {
  const n = String(name ?? '').replace(/^A |^The /, '');
  const lines = [
    `The ${n.toLowerCase()}. That wasn’t here yesterday.`,
    `Look at that. A ${n.toLowerCase()}.`,
    `So that’s what the ${n.toLowerCase()} looks like.`,
  ];
  let h = 0;
  for (const ch of String(name ?? '')) h = (h + ch.charCodeAt(0)) % 997;
  return lines[h % lines.length];
}

export { STAGES };
