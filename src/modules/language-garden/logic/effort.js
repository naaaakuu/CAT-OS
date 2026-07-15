/**
 * effort.js — the Effort Ledger made visible (LANGUAGE_GARDEN_BIBLE §8.3,
 * §4.2–§4.4, Roadmap Phase 3 items 3.1–3.2). Pure logic, no DOM, no
 * storage: every function here takes garden-session records (already
 * loaded by the caller via store.js) and a clock, and returns a number
 * or a tier name. Nothing is ever written back.
 *
 * Two ledgers, two shapes of time (Law 2 / §0.1):
 *
 *  - The STREAM (§4.2, §8.4) reflects RECENT tending only. It rises
 *    within a day of a session and decays smoothly on absence, but it
 *    has a hard floor and never reaches it exactly — "the fox comes
 *    back," the stream never runs dry.
 *
 *  - The GROUND (§4.3) is lifetime, monotonic, and never reverses: it
 *    is every session ever completed, including the ones the learner
 *    got nothing right in. Effort is honoured even when memory did not
 *    improve (Law 2). A session can only ever raise this tier or leave
 *    it unchanged — subtracting from history (impossible in practice,
 *    since sessions are never deleted) is the only way it would fall.
 *
 * PATHS (§4.4) share the Stream's "recency, not lifetime" shape but a
 * longer half-life — a path wears in over several visits and softens
 * over a longer absence than the Stream's day-to-day reading, matching
 * the Bible's own words: "returning polishes the stone again in a
 * couple of visits," not in one.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/* ---------------- The Stream (§3.1) ---------------- */

/** However quiet, the stream is never dry. */
export const STREAM_FLOOR = 0.15;

const STREAM_HALF_LIFE_DAYS = 3;
const STREAM_DECAY_K = Math.log(2) / (STREAM_HALF_LIFE_DAYS * DAY_MS);

/**
 * The Stream's level right now: each session contributes a pulse that
 * decays on a 3-day half-life, summed and clamped to 1, then scaled onto
 * the floor..1 range. One session today reads near-full; a string of
 * sessions this week reads fuller still (consistency, not just recency);
 * two quiet weeks settles all the way back to the floor and stays there.
 * @param {Array<{finished_at: string}>} sessions  any order
 * @param {number} [now]  epoch ms, injectable for tests
 * @returns {number} STREAM_FLOOR..1
 */
export function computeStreamLevel(sessions, now = Date.now()) {
  if (!sessions.length) return STREAM_FLOOR;
  let raw = 0;
  for (const s of sessions) {
    const age = now - new Date(s.finished_at).getTime();
    if (age < 0) continue;
    raw += Math.exp(-STREAM_DECAY_K * age);
  }
  return STREAM_FLOOR + (1 - STREAM_FLOOR) * Math.min(1, raw);
}

/** The level, in the three bands the world actually renders differently
 *  (stroke width, brightness, ambience gain) — never a percentage shown
 *  to the learner (§8: no number a learner can be bad at). */
export function streamBand(level) {
  if (level >= 0.66) return 'high';
  if (level >= 0.35) return 'mid';
  return 'low';
}

/* ---------------- The Ground (§3.2) ---------------- */

/** Five tiers of accumulated effort, lifetime, monotonic. Thresholds are
 *  session counts (grow + revisit both count — Law 2: a rocky session
 *  still thickened the soil). Ordered lowest → highest. */
export const GROUND_TIERS = Object.freeze([
  { tier: 'bare', min: 0 },
  { tier: 'tended', min: 8 },
  { tier: 'growing', min: 25 },
  { tier: 'flourishing', min: 60 },
  { tier: 'lush', min: 120 },
]);

/**
 * @param {Array} sessions  every garden-session record, any biome
 * @returns {{tier: string, totalSessions: number}}
 */
export function computeGroundTier(sessions) {
  const total = sessions.length;
  let tier = GROUND_TIERS[0].tier;
  for (const t of GROUND_TIERS) if (total >= t.min) tier = t.tier;
  return { tier, totalSessions: total };
}

/* ---------------- The Paths (§3.2, §4.4) ---------------- */

const PATH_HALF_LIFE_DAYS = 5;
const PATH_DECAY_K = Math.log(2) / (PATH_HALF_LIFE_DAYS * DAY_MS);

/**
 * How worn the path to one region is, from that region's own session
 * history (never the whole valley's — a path is per-region, §4.4).
 * @param {Array<{finished_at: string}>} sessionsInRegion
 * @param {number} [now]
 * @returns {'worn'|'settling'|'mossy'}  never "broken" or "gone" — a
 *          neglected path is softened by moss, not erased (§4.4).
 */
export function computePathWear(sessionsInRegion, now = Date.now()) {
  if (!sessionsInRegion.length) return 'mossy';
  let raw = 0;
  for (const s of sessionsInRegion) {
    const age = now - new Date(s.finished_at).getTime();
    if (age < 0) continue;
    raw += Math.exp(-PATH_DECAY_K * age);
  }
  if (raw >= 1.4) return 'worn';
  if (raw >= 0.5) return 'settling';
  return 'mossy';
}
