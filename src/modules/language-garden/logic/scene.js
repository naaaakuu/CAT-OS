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

/**
 * The working-set rule (THE WORLD Part 8.5, Stage W3): a biome's
 * foreground holds a fixed number of slots (7, Appendix C.6), filled by
 * priority so the wood never has to grow past its own ceiling to stay
 * legible. Priority, highest first: the single lit (asking) plant, then
 * bare-with-buds, then the still-growing stages, then whichever Mature
 * family was tended most recently, then open ground as quiet filler so a
 * slot is never left standing empty (§Bible 3.3: "nothing is locked").
 * Ancient is never a candidate — it already collapses to the horizon
 * (unchanged by this rule) before this function ever sees the list.
 * @param {Array} nonAncientPlants  a biome's plants, Ancient excluded
 * @param {string|null} askingId  the single most-patient due family, as
 *        already chosen by pickAsking/deriveBiomeScene — never re-derived
 *        here, so there is only ever one definition of "the lit plant"
 * @param {number} slotCount
 * @returns {{foreground: Array, overflowMature: Array}} foreground is at
 *          most slotCount long, in fill-priority order (index 0 is the
 *          highest priority and belongs in the working set's first slot);
 *          overflowMature is every Mature family the slots had no room
 *          for — THE WORLD Part 8.5's "wood behind", drawn as the
 *          mid-wood band rather than a named plant.
 */
export function selectForegroundSlots(nonAncientPlants, askingId, slotCount = 7) {
  const GROWING_STAGES = new Set(['seed', 'sprout', 'young', 'in_leaf']);
  const lit = askingId ? nonAncientPlants.filter((p) => p.family.meta.id === askingId) : [];
  const bare = nonAncientPlants.filter((p) => p.state.due === 'bare');
  const growing = nonAncientPlants.filter((p) => GROWING_STAGES.has(p.state.stage));
  const mature = nonAncientPlants
    .filter((p) => p.state.stage === 'mature')
    .sort((a, b) => (b.state.lastVisitedAt ?? '').localeCompare(a.state.lastVisitedAt ?? ''));
  const openGround = nonAncientPlants.filter((p) => p.state.stage === 'open_ground');

  const seen = new Set();
  const ordered = [];
  for (const group of [lit, bare, growing, mature, openGround]) {
    for (const p of group) {
      const id = p.family.meta.id;
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(p);
    }
  }

  const foreground = ordered.slice(0, slotCount);
  const foregroundIds = new Set(foreground.map((p) => p.family.meta.id));
  const overflowMature = mature.filter((p) => !foregroundIds.has(p.family.meta.id));
  return { foreground, overflowMature };
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
