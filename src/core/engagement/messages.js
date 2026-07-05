/**
 * messages.js — the app's small motivational vocabulary. Data, not
 * logic, so tone is reviewable in one place. Rules (blueprint §6 +
 * this milestone's brief): information over judgment, encouragement
 * over pressure, never manipulative, never spammy, no exclamation
 * marks doing the work that substance should.
 */

/** One line under the greeting, chosen from real state. */
export function dashboardLine(stats) {
  const { streaks, sessions } = stats;
  if (sessions === 0) return 'A calm place to build a serious reading habit.';
  if (streaks.practicedToday && streaks.current >= 2) {
    return `Day ${streaks.current} of your streak — done for today.`;
  }
  if (streaks.practicedToday) return 'Today is done. Come back tomorrow.';
  if (streaks.current > 0) {
    return `One session today keeps your ${streaks.current}-day streak going.`;
  }
  if (streaks.best >= 3) return 'Your best run is ' + streaks.best + ' days. Start a new one today.';
  return 'One passage a day compounds quickly.';
}

/** One line on the session result, chosen from that session's score. */
export function sessionLine(score) {
  if (score.total >= 3 && score.correct === score.total) {
    return 'A perfect passage. Read the explanations anyway — they consolidate.';
  }
  if (score.accuracy >= 0.75) return 'Strong session. The review is where it sticks.';
  if (score.attempted === 0) return 'A full read-through counts. Answer when ready.';
  if (score.accuracy >= 0.5) return 'Solid work. Two of the traps below are worth studying.';
  return 'Hard passage. The distractor notes below are exactly what to review.';
}
