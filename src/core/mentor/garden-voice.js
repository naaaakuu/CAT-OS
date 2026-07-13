/**
 * garden-voice.js — the Language Garden's entire vocabulary, in one
 * reviewable file, exactly like voice.js does for reading and
 * wd-voice.js does for Word DNA.
 *
 * The register is LANGUAGE_GARDEN_BIBLE §9: a quiet gardener who
 * notices, points once, and lets you look. Never a teacher at a
 * whiteboard, never a hype coach. One sentence per beat, twelve words
 * or fewer where possible, no exclamation marks, no study-app words
 * (drill, test, quiz, memorise, due, backlog, streak — §13). This file
 * also carries the small, fixed set of action labels the Bible names
 * directly (Grow / Revisit / "No one taught you that word."), so every
 * learner-facing string in the module lives in one place and is swept
 * by tools/verify.mjs's banned-word lint, same as every other mentor.
 *
 * Deterministic: variety comes from pick() on a stable seed (usually
 * the session id), never Math.random(), so a re-render never changes
 * what was just said.
 */

import { pick } from './voice.js';

export { pick };

/* ------------------------------------------------------------------ */
/* Growth — the one line at the end of every session, varying only by */
/* what actually happened, never by how well (Bible §6.7, §7).        */
/* ------------------------------------------------------------------ */

export const GROWTH_LINES = Object.freeze({
  /** The plant's first completed grow session. */
  firstGrow: (label, seed) => pick(seed, [
    `${label} is taking root.`,
    `${label} has found its footing.`,
  ]),
  /** A revisit where every beat landed on the first try. */
  revisitClean: (label, seed) => pick(seed, [
    `${label} holds.`,
    `${label} settles in a little deeper.`,
  ]),
  /** A revisit that finished after at least one missed beat — the
   *  plant still regrows; the interval simply grows a little less
   *  (never shown as a lesser outcome). */
  revisitRocky: (label, seed) => pick(seed, [
    `${label} is still growing.`,
    `${label} keeps its footing.`,
  ]),
  /** The revisit that carries the plant to evergreen. */
  evergreen: (label, seed) => pick(seed, [
    `${label} has joined the old growth.`,
    `${label} keeps its leaves through every season now.`,
  ]),
});

/* ------------------------------------------------------------------ */
/* Beat copy — fixed, short, the same every time on purpose (a         */
/* procedural instruction, not a moment that needs variety).           */
/* ------------------------------------------------------------------ */

export const GARDEN_LINES = Object.freeze({
  spreadInstruction: 'Tap each part to see how it joins.',
  reachEyebrow: 'A word you were never taught',
  reachHint: 'Look at the first part.',
  // Bible §5.5, verbatim: true whether it lands in one move or two.
  reachLanded: 'No one taught you that word.',
  keyEyebrow: 'The root',
  continueLabel: 'Continue',
  backToGarden: 'Back to the garden',
  growAction: 'Grow',
  revisitAction: 'Revisit',
  plantedOn: (dateStr) => `Planted ${dateStr}`,
});

/* ------------------------------------------------------------------ */
/* The empty day (Bible §6.5) — never zero, never a list, never a      */
/* reference to absence.                                               */
/* ------------------------------------------------------------------ */

export const EMPTY_DAY_LINES = Object.freeze({
  oneSeedReady: [
    'One seed is ready, whenever you are.',
    'A little open ground is waiting for you.',
  ],
  standAndClose: [
    'Nothing is asking today. The garden is still here tomorrow.',
    'A quiet day in the garden. That is allowed.',
  ],
  onePlantAsking: (label, seed) => pick(seed, [
    `${label} is ready too.`,
    `${label} is also asking.`,
  ]),
});

/* ------------------------------------------------------------------ */
/* Encounter / Attempt — the directional read (Bible §5.1).            */
/* ------------------------------------------------------------------ */

export const ATTEMPT_LINES = Object.freeze({
  eyebrow: 'A word in the wild',
});

/* ------------------------------------------------------------------ */
/* Journal (Bible §11) — one line generated from real events.          */
/* ------------------------------------------------------------------ */

export const JOURNAL_LINES = Object.freeze({
  heading: 'What you can read now',
  emptyHeading: 'Your first plant is still growing',
  sightingsHeading: 'Wild sightings',
  emptySightings: 'Every word you construct in a Reach settles here.',
});
