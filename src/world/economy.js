/**
 * economy.js — stars, the one measure every room shares. Pure functions,
 * no DOM, no storage: how a finished run scores (accuracy first, then
 * pace), the words for a star count, the learner's title, and a region's
 * level. The gifts a run makes are src/pets/economy.js.
 */

/* ------------------------------------------------------------------ */
/* Stars                                                               */
/* ------------------------------------------------------------------ */

/**
 * Stars for a Reading Comprehension session.
 *   0  fewer than half right — the passage was not understood
 *   1  at least half right — completed with meaningful mistakes
 *   2  three quarters right, but over the passage's target time
 *   3  three quarters right, within time — CAT pace and CAT accuracy
 * A 100% within time also sets `flawless`.
 */
export function rcStars(session, targetMin, paceFactor = 1) {
  const acc = session.score?.total ? session.score?.correct / session.score?.total : 0;
  const targetMs = Math.max(60_000, (targetMin ?? 6) * 60_000 * paceFactor);
  const inTime = (session.duration_ms ?? Infinity) <= targetMs * 1.1;
  let stars = 0;
  if (acc >= 0.75 && inTime) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && inTime, accuracy: acc, inTime, targetMs };
}

/** Stars for a verbal set (PJ / PS / OOO): accuracy across the set, pace
 *  against the sum of the items' estimated seconds. */
export function verbalStars(session, targetSec) {
  const acc = session.score?.total ? session.score?.correct / session.score?.total : 0;
  const targetMs = Math.max(45_000, (targetSec ?? 90) * 1000);
  const inTime = (session.duration_ms ?? Infinity) <= targetMs * 1.15;
  let stars = 0;
  if (acc >= 0.75 && inTime) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && inTime, accuracy: acc, inTime, targetMs };
}

/** Stars for a vocabulary round (Meadow / Pond / Thicket): accuracy, then
 *  average answer time against the round's target per item. */
export function roundStars({ correct, total, avgMs, targetMs = 7000 }) {
  const acc = total ? correct / total : 0;
  const fast = avgMs <= targetMs;
  let stars = 0;
  if (acc >= 0.9 && fast) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && fast, accuracy: acc, inTime: fast, targetMs };
}

export const STAR_WORDS = Object.freeze(['Not yet', 'Completed', 'Accurate', 'Excellent']);

/* ------------------------------------------------------------------ */
/* Titles                                                             */
/* ------------------------------------------------------------------ */

const TITLES = [[1, 'Newcomer'], [2, 'Reader'], [4, 'Word-gatherer'], [6, 'Root-keeper'], [9, 'Editor'], [12, 'Scholar'], [16, 'Lexicographer'], [20, 'Sage of the Valley']];
export function titleFor(level) {
  let t = TITLES[0][1];
  for (const [lv, name] of TITLES) if (level >= lv) t = name;
  return t;
}

/** Region building level from a count of cleared items, 0–4. */
export function levelFromCleared(cleared, perLevel = 4) { return Math.max(0, Math.min(4, Math.floor(cleared / perLevel))); }
