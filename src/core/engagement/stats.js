/**
 * stats.js — the single aggregation point for engagement numbers.
 * Every screen (dashboard, results, achievements) derives from THIS
 * function so no two surfaces can ever disagree.
 * Pure: sessions in, numbers out.
 */

import { totalXP, levelFromXP } from './xp.js';
import { deriveStreaks, weekActivity } from './streaks.js';

export function deriveEngagement(sessions, now = new Date()) {
  const answered = sessions.reduce((n, s) => n + s.score.attempted, 0);
  const correct = sessions.reduce((n, s) => n + s.score.correct, 0);
  const timeMs = sessions.reduce((n, s) => n + (s.duration_ms ?? 0), 0);
  const xp = totalXP(sessions);
  const passageIds = new Set(sessions.map((s) => s.passage_id));

  return {
    sessions: sessions.length,
    answered,
    correct,
    accuracy: answered ? correct / answered : 0,
    avgAccuracy: sessions.length
      ? sessions.reduce((n, s) => n + (s.score.accuracy ?? 0), 0) / sessions.length
      : 0,
    timeMs,
    xp,
    level: levelFromXP(xp),
    streaks: deriveStreaks(sessions, now),
    week: weekActivity(sessions, now),
    distinctPassages: passageIds.size,
    hasPerfectSession: sessions.some(
      (s) => s.score.total >= 3 && s.score.correct === s.score.total
    ),
  };
}
