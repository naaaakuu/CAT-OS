/**
 * glow.js — Glow, the village's one resource. Learning → Glow → the village grows.
 *
 * Glow pays for learning done, never for time spent: a question pays the
 * same answered in four seconds or four minutes, and an open app pays nothing.
 *
 *   a question answered (not skipped, not a blind tap)   1
 *   ... and answered right                               +1
 *   a whole set answered, with something new in it       +2
 *   a friend growing a stage (a milestone)               6
 *   today's three friends all helped                     10
 *   the fire, on a day that earned: days in a row, up to 5
 *
 * Each question pays once a day for being answered and once for being
 * right, so replaying the same one earns nothing more; the next day it is
 * review again and pays again. Pure: records in, numbers out, nothing stored.
 */

import { dayKey } from '../core/engagement/streaks.js';

export const GLOW = Object.freeze({ TRY: 1, RIGHT: 1, SET: 2, STAGE: 6, GIFT: 10, FIRE_CAP: 5, THINK_MS: 1000 });
export const GLOW_NAME = 'Glow';

/** The one drawing of Glow: a warm light with its halo. */
export const GLOW_SVG = '<svg class="cw-orb" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="#F4C443" opacity=".3"/><circle cx="12" cy="12" r="6.2" fill="#F4C443" stroke="#B88A12" stroke-width="1.3"/><circle cx="10" cy="10" r="1.9" fill="#FFF3C4"/></svg>';

const arr = (x) => (Array.isArray(x) ? x : []);
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

/**
 * The questions a finished record asked: { key, tried, right } each.
 * `tried` is a real answer: not skipped, and not faster than a person can read.
 * Records with no answer list count by their score; a garden visit is one question per family and kind.
 */
export function questionsOf(x) {
  const list = arr(x?.answers).filter((a) => a && typeof a === 'object');
  if (list.length) {
    return list.map((a, i) => {
      const ms = num(a.time_ms) ?? num(a.ms);
      const answered = typeof a.is_correct === 'boolean' || typeof a.correct === 'boolean';
      const tried = answered && (ms === null || ms >= GLOW.THINK_MS);
      return { key: `${a.item_id ?? a.question_id ?? a.entry_id ?? `${x.id}#${i}`}${a.kind ? `:${a.kind}` : ''}`, tried, right: tried && (a.is_correct === true || a.correct === true) };
    });
  }
  const total = Math.min(60, Math.max(0, Math.floor(num(x?.score?.total) ?? 0)));
  if (total) return Array.from({ length: total }, (_, i) => ({ key: `${x.id}#${i}`, tried: true, right: i < (num(x.score.correct) ?? 0) }));
  return [{ key: x?.family_id ? `${x.family_id}:${x.session_type}` : `${x?.id}`, tried: true, right: x?.clean === true }];
}

/**
 * Pay every visit (sorted by time) what its questions are worth, once a day
 * per question. Sets `visit.glow = { tried, right, set, total }`.
 */
export function payVisits(visits) {
  const paid = new Map();
  for (const v of visits) {
    const day = dayKey(v.at);
    let tried = 0, right = 0;
    for (const q of v.qs) {
      const k = `${day}|${q.key}`, s = paid.get(k) ?? { t: false, r: false };
      if (q.tried && !s.t) { s.t = true; tried += 1; }
      if (q.right && !s.r) { s.r = true; right += 1; }
      paid.set(k, s);
    }
    const whole = v.qs.length > 0 && v.qs.every((q) => q.tried);
    const set = whole && tried + right > 0 ? GLOW.SET : 0;
    v.glow = { tried, right, set, total: tried * GLOW.TRY + right * GLOW.RIGHT + set };
  }
  return visits;
}

/** What a finished run earned, said in a line: "4 answered, 3 right, set finished". */
export function glowWhy(g) {
  if (!g || !(g.total > 0)) return '';
  const parts = [];
  if (g.tried) parts.push(`${g.tried} answered`);
  if (g.right) parts.push(`${g.right} right`);
  if (g.set) parts.push('set finished');
  return parts.join(', ');
}
