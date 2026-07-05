/**
 * achievements.js — a declarative, scalable achievement engine.
 *
 * An achievement is DATA: { id, title, description, glyph, category,
 * check(stats) } where stats comes from deriveEngagement(). Adding an
 * achievement = adding one object here; no engine changes, no storage
 * changes (unlock state is derived; only "already celebrated" ids are
 * persisted so a milestone is celebrated exactly once).
 *
 * Categories: firsts · consistency · volume · mastery.
 * Vocabulary achievements arrive with the Vocabulary module — there is
 * no vocab interaction data to derive them from yet (STATUS.md M4).
 */

export const ACHIEVEMENTS = Object.freeze([
  // ---- firsts ----
  { id: 'first-practice', category: 'firsts', glyph: '¶',
    title: 'First Practice',
    description: 'Complete your first session.',
    check: (s) => s.sessions >= 1 },
  { id: 'first-perfect', category: 'firsts', glyph: '✓',
    title: 'Perfect RC',
    description: 'Answer every question in a passage correctly.',
    check: (s) => s.hasPerfectSession },
  { id: 'library-complete', category: 'firsts', glyph: '▤',
    title: 'Complete Library',
    description: 'Practice every passage in the library.',
    check: (s) => s.distinctPassages >= 5 },

  // ---- consistency ----
  { id: 'streak-3', category: 'consistency', glyph: '✦',
    title: 'Three in a Row',
    description: 'Practice three days in a row.',
    check: (s) => s.streaks.best >= 3 },
  { id: 'streak-7', category: 'consistency', glyph: '✦',
    title: 'Seven-Day Streak',
    description: 'Practice seven days in a row.',
    check: (s) => s.streaks.best >= 7 },
  { id: 'streak-14', category: 'consistency', glyph: '✦',
    title: 'Fortnight',
    description: 'Practice fourteen days in a row.',
    check: (s) => s.streaks.best >= 14 },

  // ---- volume ----
  { id: 'q-50', category: 'volume', glyph: '∎',
    title: 'Fifty Questions',
    description: 'Answer 50 questions.',
    check: (s) => s.answered >= 50 },
  { id: 'q-100', category: 'volume', glyph: '∎',
    title: 'Hundred Questions',
    description: 'Answer 100 questions.',
    check: (s) => s.answered >= 100 },
  { id: 'time-60', category: 'volume', glyph: '◔',
    title: 'An Hour In',
    description: 'Study for a total of one hour.',
    check: (s) => s.timeMs >= 60 * 60 * 1000 },

  // ---- mastery ----
  { id: 'sharp-80', category: 'mastery', glyph: '◎',
    title: 'Sharp',
    description: 'Hold 80% overall accuracy across 50+ answers.',
    check: (s) => s.answered >= 50 && s.accuracy >= 0.8 },
  { id: 'accuracy-run-5', category: 'mastery', glyph: '◎',
    title: 'Locked In',
    description: 'Five consecutive sessions at 80% accuracy or better.',
    check: (s) => s.streaks.accuracyRun >= 5 },
]);

/** All achievements with their derived unlock state. */
export function evaluate(stats) {
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: a.check(stats) }));
}

/** Unlocked-but-not-yet-celebrated achievements, given the persisted
 *  set of celebrated ids. */
export function newlyUnlocked(stats, celebratedIds) {
  const seen = new Set(celebratedIds ?? []);
  return evaluate(stats).filter((a) => a.unlocked && !seen.has(a.id));
}
