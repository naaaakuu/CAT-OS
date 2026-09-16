/**
 * draft-shape.js — the parts of a draft every engine reads the same way.
 *
 * A draft (core/learning/draft.js) is a file on the learner's own device:
 * possibly written by an older release, possibly carried through a backup
 * somebody edited by hand, possibly nonsense. It is not a schema, and the
 * six engines that restore one must agree on three things so that no
 * engine can be the one that forgot:
 *
 *  · which SET a draft belongs to — the same id, the same items, in the
 *    same order. Half of one run inside another is not a run;
 *  · how long the learner had actually SPENT before the interruption. A
 *    draft used to carry the wall-clock start, so a set resumed the next
 *    morning was recorded as an eight-hour set — which failed the "in
 *    time" check in world/economy.js and cost the learner stars for having
 *    been interrupted, and inflated total practice time in engagement/stats.
 *    Drafts carry ELAPSED time now, and restore() re-bases the start so
 *    the record and the timer count only time on task;
 *  · that a number from a draft is a number.
 */

/** A duration from a draft: a non-negative whole number of ms, or 0. */
export const ms = (n) => (Number.isFinite(n) && n > 0 ? Math.round(n) : 0);

/** How long the learner had spent on the set before the interruption.
 *  Capped at a day (a draft does not live longer than that), so a hand-
 *  edited value cannot make a record hours long. */
export const elapsedMs = (snap) => Math.min(ms(snap?.elapsed_ms), 864e5);

/** True when the draft names THIS set: same id, same items, same order. */
export function sameSet(snap, setId, ids) {
  if (!snap || typeof snap !== 'object' || snap.set_id !== setId) return false;
  const theirs = snap.items;
  return Array.isArray(theirs) && theirs.length === ids.length && theirs.every((id, i) => id === ids[i]);
}

/** A whole-number choice inside `n` options, or null. */
export const optionIndex = (v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : null);
