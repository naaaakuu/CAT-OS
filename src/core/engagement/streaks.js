/**
 * streaks.js — streaks derived from stored sessions. Pure functions.
 *
 * Day boundaries use the DEVICE's local calendar (a study day is the
 * user's day, not UTC's). Recovery logic is thoughtful, not punitive:
 * a streak is "alive" through yesterday — the UI invites today's
 * practice instead of announcing a loss at midnight.
 */

/** Local-calendar day key: 2026-07-03 → "2026-07-03". */
export function dayKey(dateLike) {
  const d = new Date(dateLike);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function shiftDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return dayKey(dt);
}

/**
 * @returns {{
 *   current: number,        // consecutive days ending today or yesterday
 *   practicedToday: boolean,
 *   alive: boolean,         // true if practicing today continues it
 *   best: number,           // longest run ever
 *   perfectRun: number,     // consecutive most-recent sessions at 100%
 *   accuracyRun: number,    // consecutive most-recent sessions ≥ 80%
 * }}
 */
export function deriveStreaks(sessions, now = new Date()) {
  const days = new Set(sessions.map((s) => dayKey(s.finished_at)));
  const today = dayKey(now);
  const practicedToday = days.has(today);

  // Current run: walk back from today (or yesterday if today is empty).
  let cursor = practicedToday ? today : shiftDay(today, -1);
  let current = 0;
  while (days.has(cursor)) { current += 1; cursor = shiftDay(cursor, -1); }
  const alive = practicedToday || current > 0;

  // Best run ever: walk each day-run once.
  let best = 0;
  for (const day of days) {
    if (days.has(shiftDay(day, -1))) continue; // not a run start
    let len = 0; let c = day;
    while (days.has(c)) { len += 1; c = shiftDay(c, 1); }
    if (len > best) best = len;
  }

  // Session-quality runs (most recent first).
  const ordered = [...sessions].sort((a, b) => b.finished_at.localeCompare(a.finished_at));
  let perfectRun = 0;
  for (const s of ordered) {
    if (s.score.total > 0 && s.score.correct === s.score.total) perfectRun += 1;
    else break;
  }
  let accuracyRun = 0;
  for (const s of ordered) {
    if (s.score.attempted > 0 && s.score.accuracy >= 0.8) accuracyRun += 1;
    else break;
  }

  return { current, practicedToday, alive, best, perfectRun, accuracyRun };
}

/** Last 7 local days (oldest → today) with session counts, for the
 *  weekly activity strip. */
export function weekActivity(sessions, now = new Date()) {
  const counts = new Map();
  for (const s of sessions) {
    const k = dayKey(s.finished_at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const k = shiftDay(dayKey(now), -i);
    const d = new Date(k);
    days.push({
      key: k,
      label: d.toLocaleDateString(undefined, { weekday: 'narrow' }),
      count: counts.get(k) ?? 0,
      isToday: i === 0,
    });
  }
  return days;
}
