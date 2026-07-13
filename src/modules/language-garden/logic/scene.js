/**
 * scene.js — the Root Grove scene: pure logic, no DOM, no storage.
 * Joins loaded plant content against stored garden-session history to
 * decide what the grove looks like right now and which single plant
 * (if any) is asking to be tended (LANGUAGE_GARDEN_BIBLE §6.4's guilt
 * containment: "at most one plant asking per visit, however many are
 * technically due — the scheduler holds the queue; the interface shows
 * one invitation").
 */

import { computePlantState } from '../../../core/engine/garden-session.js';
import { sessionsForFamily } from './store.js';

/**
 * @param {Array} families    loaded (resolved) lg items, registry order
 * @param {Array} allSessions every garden-session record (any family)
 * @param {number} [now]
 * @returns {{plants: Array, askingId: string|null, openSeedId: string|null}}
 */
export function deriveGroveScene(families, allSessions, now = Date.now()) {
  const plants = families.map((family) => {
    const history = sessionsForFamily(allSessions, family.meta.id);
    const state = computePlantState(history, now);
    return { family, state, history };
  });

  // Guilt containment: among every plant technically due, the single
  // most patient one — the one that has been waiting longest — carries
  // the one invitation the garden is allowed to show.
  const due = plants
    .filter((p) => p.state.due !== 'none')
    .sort((a, b) => a.state.nextReviewAt.localeCompare(b.state.nextReviewAt));
  const asking = due[0] ?? null;

  // The empty day's other half: one seed, chosen by the system, never a
  // list (§6.5). Stable order (registry order) so the same seed is
  // offered all day rather than flickering between opens.
  const openSeed = asking ? null : plants.find((p) => p.state.stage === 'seed') ?? null;

  return {
    plants,
    askingId: asking?.family.meta.id ?? null,
    openSeedId: openSeed?.family.meta.id ?? null,
  };
}

/** Which reach word this visit should serve: whichever of the pool has
 *  been used least recently (tie broken by pool order), so a family
 *  with two reserved Reach words rotates between them rather than
 *  always serving the first. */
export function nextReachPoolIndex(history, poolSize) {
  if (poolSize <= 1) return 0;
  let best = 0;
  let bestAt = null;
  for (let i = 0; i < poolSize; i += 1) {
    const uses = history.filter((s) => s.reach?.pool_index === i);
    const lastAt = uses.length ? uses[uses.length - 1].finished_at : null;
    if (lastAt === null) return i; // never used — always the first choice
    if (bestAt === null || lastAt < bestAt) { best = i; bestAt = lastAt; }
  }
  return best;
}

/** Revisit member-check rotation offset: cycles taught members across
 *  successive revisits so every member gets fresh-context practice over
 *  time, rather than testing the same two forever. */
export function memberCheckOffset(history) {
  return history.filter((s) => s.session_type === 'revisit').length;
}
