/**
 * xp.js — experience points and levels. Pure functions, no storage:
 * XP is DERIVED from stored sessions (decision: derived-first
 * engagement, STATUS.md M4), so it can never drift from the truth,
 * needs no migration, and rides along in every backup for free.
 *
 * The rules are deliberately legible — a user should be able to
 * predict their XP (premium motivation is honest motivation):
 *
 *   +10  per correct answer
 *   +2   per wrong answer (effort counts; skips don't)
 *   +5   per completed session
 *   +25  perfect-session bonus (every question attempted & correct,
 *        minimum 3 questions)
 *
 * Levels: reaching level n+1 from n costs 100 + 50·(n−1) XP —
 * 100, 150, 200… Early levels arrive quickly, later ones ask for
 * real work, and the curve stays predictable.
 */

export const XP_RULES = Object.freeze({
  correct: 10,
  wrong: 2,
  session: 5,
  perfectBonus: 25,
  perfectMinQuestions: 3,
});

/** XP earned by one session record (the shape stored in SESSIONS). */
export function sessionXP(session) {
  const s = session.score;
  let xp = s.correct * XP_RULES.correct
         + s.wrong * XP_RULES.wrong
         + XP_RULES.session;
  const perfect = s.total >= XP_RULES.perfectMinQuestions
    && s.correct === s.total; // no wrong AND no skipped
  if (perfect) xp += XP_RULES.perfectBonus;
  return xp;
}

/** Total XP across all sessions. */
export function totalXP(sessions) {
  return sessions.reduce((sum, s) => sum + sessionXP(s), 0);
}

/** XP required to go from `level` to `level + 1`. */
export function xpForNext(level) {
  return 100 + 50 * (level - 1);
}

/** Resolve total XP into { level, intoLevel, needed, progress }. */
export function levelFromXP(xp) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForNext(level)) {
    remaining -= xpForNext(level);
    level += 1;
  }
  const needed = xpForNext(level);
  return {
    level,
    intoLevel: remaining,          // XP earned inside the current level
    needed,                        // XP the current level asks for
    progress: remaining / needed,  // 0..1 toward the next level
  };
}
