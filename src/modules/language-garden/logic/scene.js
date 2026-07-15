/**
 * scene.js — what the valley and each biome look like right now: pure
 * logic, no DOM, no storage. Joins loaded plant content against stored
 * garden-session history to decide the state of every plant and which
 * single one (if any) is asking to be tended.
 *
 * Guilt containment (LANGUAGE_GARDEN_BIBLE §16.1, §17.2): however many
 * plants are technically due, only ONE invitation is ever shown — the
 * most patient one, the one waiting longest. The scheduler holds the
 * queue; the interface shows an invitation, never a backlog. This holds
 * at both scales: the Overlook shows one for the whole valley, and a
 * biome shows one for itself.
 */

import { computePlantState } from '../../../core/engine/garden-session.js';
import { biomeForFamily, biomeBySlug } from './biomes.js';
import { sessionsForFamily } from './store.js';

/** Build the per-plant view: content + derived state + its biome. */
function plantsFor(families, allSessions, now) {
  return families.map((family) => {
    const history = sessionsForFamily(allSessions, family.meta.id);
    return { family, state: computePlantState(history, now), history, biome: biomeForFamily(family) };
  });
}

/** The single most patient due plant, or null. */
function pickAsking(plants) {
  return plants
    .filter((p) => p.state.due !== 'none')
    .sort((a, b) => a.state.nextReviewAt.localeCompare(b.state.nextReviewAt))[0] ?? null;
}

/** One patch of open ground to offer, but only when nothing is asking —
 *  a seed is never surfaced over a plant that wants tending (§16.1). */
function pickOpenSeed(plants, asking) {
  if (asking) return null;
  return plants.find((p) => p.state.stage === 'open_ground' || p.state.stage === 'seed') ?? null;
}

/**
 * The whole valley, for the Overlook (and the Home card).
 * @returns {{plants, byBiome: Map<string, Array>, askingId, askingBiomeSlug,
 *            openSeedId, openSeedBiomeSlug}}
 */
export function deriveValleyScene(families, allSessions, now = Date.now()) {
  const plants = plantsFor(families, allSessions, now);
  const asking = pickAsking(plants);
  const openSeed = pickOpenSeed(plants, asking);

  const byBiome = new Map();
  for (const p of plants) {
    const slug = p.biome?.slug ?? null;
    if (!slug) continue;
    if (!byBiome.has(slug)) byBiome.set(slug, []);
    byBiome.get(slug).push(p);
  }

  return {
    plants,
    byBiome,
    askingId: asking?.family.meta.id ?? null,
    askingBiomeSlug: asking?.biome?.slug ?? null,
    openSeedId: openSeed?.family.meta.id ?? null,
    openSeedBiomeSlug: openSeed?.biome?.slug ?? null,
  };
}

/**
 * One biome, for the biome screen (the Rootwood today).
 * @returns {{biome, plants, askingId, openSeedId}}
 */
export function deriveBiomeScene(families, allSessions, biomeSlug, now = Date.now()) {
  const inBiome = families.filter((f) => biomeForFamily(f)?.slug === biomeSlug);
  const plants = plantsFor(inBiome, allSessions, now);
  const asking = pickAsking(plants);
  const openSeed = pickOpenSeed(plants, asking);
  return {
    biome: biomeBySlug(biomeSlug),
    plants,
    askingId: asking?.family.meta.id ?? null,
    openSeedId: openSeed?.family.meta.id ?? null,
  };
}

/** Which reach word this visit should serve: whichever of the pool has
 *  been used least recently (tie broken by pool order), so a family with
 *  two reserved Reach words rotates between them rather than always
 *  serving the first. */
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
