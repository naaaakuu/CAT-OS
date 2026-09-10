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
import { layoutWood } from './groves.js';
import { sessionsForFamily } from './store.js';

/** Build the per-plant view: content + derived state + its biome. Seeds
 *  (carried back through the Gate, §19.2) shape the STATE but are never
 *  part of the session history — a seed is intent, not effort, so it
 *  must not thicken the Ground or wear a Path. */
function plantsFor(families, allSessions, now, seeds = []) {
  return families.map((family) => {
    const history = sessionsForFamily(allSessions, family.meta.id);
    const familySeeds = seeds.filter((s) => s.family_id === family.meta.id);
    return { family, state: computePlantState([...history, ...familySeeds], now), history, biome: biomeForFamily(family) };
  });
}

/** The single most patient due plant, or null. */
function pickAsking(plants) {
  return plants
    .filter((p) => p.state.due !== 'none')
    .sort((a, b) => a.state.nextReviewAt.localeCompare(b.state.nextReviewAt))[0] ?? null;
}

/** One patch of open ground to offer, but only when nothing is asking —
 *  a seed is never surfaced over a plant that wants tending (§16.1).
 *  0.17.0 (THE WORLD Part 16): a seed carried back through the Gate comes
 *  first (it is the learner's own intent); otherwise the offer is the
 *  next open stand along the walk after the last grown one, so the wood
 *  fills grove by grove rather than by registry id. The learner may plant
 *  ANY root-stone they walk to; this is only the one the wood quietly
 *  lifts. */
function pickOpenSeed(plants, asking) {
  if (asking) return null;
  const seed = plants.find((p) => p.state.stage === 'seed');
  if (seed) return seed;
  const open = plants.filter((p) => p.state.stage === 'open_ground');
  if (open.length === 0) return null;
  const { stands } = layoutWood(plants.map((p) => p.family));
  const x = (p) => stands.get(p.family.meta.id)?.x ?? Number.POSITIVE_INFINITY;
  const grownX = plants.filter((p) => p.state.stage !== 'open_ground').map(x).filter(Number.isFinite);
  const frontier = grownX.length ? Math.max(...grownX) : -1;
  const sorted = [...open].sort((a, b) => x(a) - x(b));
  return sorted.find((p) => x(p) > frontier) ?? sorted[0];
}

/**
 * The whole valley, for the Overlook (and the Home card).
 * @returns {{plants, byBiome: Map<string, Array>, askingId, askingBiomeSlug,
 *            openSeedId, openSeedBiomeSlug}}
 */
export function deriveValleyScene(families, allSessions, now = Date.now(), seeds = []) {
  const plants = plantsFor(families, allSessions, now, seeds);
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
export function deriveBiomeScene(families, allSessions, biomeSlug, now = Date.now(), seeds = []) {
  const inBiome = families.filter((f) => biomeForFamily(f)?.slug === biomeSlug);
  const plants = plantsFor(inBiome, allSessions, now, seeds);
  const asking = pickAsking(plants);
  const openSeed = pickOpenSeed(plants, asking);
  return {
    biome: biomeBySlug(biomeSlug),
    plants,
    askingId: asking?.family.meta.id ?? null,
    openSeedId: openSeed?.family.meta.id ?? null,
  };
}

/* The working-set rule (THE WORLD Part 8.5, 0.15–0.16) lived here as
   selectForegroundSlots(): seven foreground slots filled by priority, every
   other family folded into anonymous canopy. Retired in 0.17.0 by Part 16:
   every family now stands in its own fixed stand in a named grove
   (logic/groves.js), so there is nothing left to select. */

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

/** Whether every family in ONE biome has reached at least Mature (Bible
 *  §3.5 "every flower is bloomed"; THE WORLD Part 13's own definition,
 *  "every family in it is at least Mature" — Ancient counts too, being a
 *  stronger case of it). A pure replay of history, exactly like the
 *  Landmark check session.js already makes for one plant — never a
 *  stored flag — so the single session where a biome crosses this line
 *  is found by comparing this against history with and without that
 *  session's own record.
 * @param {Array} families  every family (any biome) — filtered internally
 * @param {Array} allSessions
 * @param {string} biomeSlug
 * @param {number} [now]
 */
export function isBiomeGrown(families, allSessions, biomeSlug, now = Date.now()) {
  const inBiome = families.filter((f) => biomeForFamily(f)?.slug === biomeSlug);
  if (!inBiome.length) return false;
  return inBiome.every((f) => {
    const stage = computePlantState(sessionsForFamily(allSessions, f.meta.id), now).stage;
    return stage === 'mature' || stage === 'ancient';
  });
}
