/**
 * ambient.js — decides WHETHER a tiny living event happens and WHICH
 * one; the actual drawing (an SVG overlay, a CSS keyframe) lives in the
 * grove screen, since rendering is presentation, not logic (Rule 19).
 *
 * Called once per grove-screen mount, never on a repeating interval:
 * the brief is explicit that these must be "never frequent, never
 * random for the sake of randomness." One quiet chance per visit,
 * gated by time of day so a firefly never appears at noon and a
 * butterfly never appears at midnight, keeps it feeling noticed rather
 * than clockwork.
 *
 * Roadmap 3.3 (§4.8, Law 8: "the world is not a reward, it simply is")
 * replaces what used to be a pure-random gate here: a butterfly or a
 * falling petal used to appear on ANY visit in the daytime, whether or
 * not anything in the biome had ever bloomed. That is a coin flip, not
 * a mirror. Butterflies and petals now require at least one plant that
 * has actually bloomed (Mature or Ancient — the Bible gives Mature its
 * "quiet blossom," §6.2); fireflies at night are weighted up by how
 * many Ancient trees are actually standing. The overall CHANCE of any
 * visitor also scales gently with the Ground's effort tier (§3.2): a
 * well-tended valley is a livelier one, without ever making a visitor a
 * reward for a single session (Law 5 — a mirror of accumulated true
 * state, never a motor for the next tap).
 */

import { timeOfDay } from './atmosphere.js';

export { timeOfDay };

const BASE_EVENTS_BY_TIME = Object.freeze({
  dawn:      ['bird', 'leaf-stir'],   // birdsong at its densest (§4.5)
  morning:   ['bird', 'leaf-stir'],
  afternoon: ['bird', 'leaf-stir'],
  dusk:      ['bird', 'leaf-stir'],   // everything quieting
  night:     ['leaf-stir'],
});

/** How often ANY visitor appears at all, scaled by the Ground's effort
 *  tier (§3.2) — never above a restrained ceiling (Law 6: the valley is
 *  alive, not busy). */
const DENSITY_BY_GROUND_TIER = Object.freeze({
  bare: 0.30, tended: 0.38, growing: 0.45, flourishing: 0.52, lush: 0.60,
});

/** The pool for this time of day, widened only by what is actually true
 *  in this biome right now — never by the clock alone. */
function poolFor(time, { bloomingCount = 0, ancientCount = 0, landmarkCount = 0 }) {
  const pool = [...BASE_EVENTS_BY_TIME[time]];
  if (bloomingCount > 0) {
    if (time === 'dawn' || time === 'morning' || time === 'afternoon') pool.push('butterfly');
    if (time === 'dusk') pool.push('petal');
  }
  if (ancientCount > 0) {
    if (time === 'night') pool.push('firefly', 'firefly'); // a nested firefly-glow bias
    if (time === 'dusk') pool.push('firefly');             // "the first fireflies" (§4.5)
  }
  // Fireflies GATHER at a Landmark (§6.5): where the oldest trees the world
  // has singled out are standing, the dusk-and-night glow is denser still —
  // a mirror of real durable memory, never a reward for a tap (Law 8).
  if (landmarkCount > 0 && (time === 'night' || time === 'dusk')) {
    pool.push('firefly', 'firefly');
  }
  return pool;
}

/**
 * @param {{bloomingCount?: number, ancientCount?: number, landmarkCount?: number, groundTier?: string}} state
 *        true-state counts this biome has right now (Mature+Ancient
 *        plants, Ancient-only plants, Landmark trees) and the valley's
 *        lifetime effort tier — all derived, never stored, never guessed.
 * @param {Date} date
 * @param {() => number} random  injectable for deterministic tests
 * @returns {string|null} one of 'bird'|'butterfly'|'leaf-stir'|'petal'|'firefly', or null (no visitor this time)
 */
export function pickAmbientEvent(state = {}, date = new Date(), random = Math.random) {
  const density = DENSITY_BY_GROUND_TIER[state.groundTier] ?? DENSITY_BY_GROUND_TIER.bare;
  if (random() > density) return null;
  const pool = poolFor(timeOfDay(date), state);
  return pool[Math.floor(random() * pool.length)];
}

/** A bird nests in a tree the world has made a Landmark (Bible §6.5: "a bird
 *  nests in it, and sings from it"). The Landmark state is itself already
 *  earned only by surviving several long-interval retrievals with no lapse
 *  (garden-session.js), so the nest is an honest consequence of durable
 *  memory, not a timer — it appears with the Landmark and needs no separate
 *  clock of its own. */
export function hasNest(state) {
  return state.landmark === true;
}

/* ---------------- The hearth cat (THE WORLD Part 4.5, 9.2, 9.3) ---------------- */

/** The two authored spots the cat might be found (Appendix C.3): bench
 *  left end (43, 87)% and the wall right of the Gate (28, 80)%, converted
 *  to the Overlook's 360×560 pixel frame (100% width = 360, 100% height
 *  = 560 — the same convention every coordinate in overlook.js uses). */
export const HEARTH_CAT_SPOTS = Object.freeze([
  { spot: 'bench', x: 154.8, y: 487.2 },
  { spot: 'wall', x: 100.8, y: 448 },
]);

const HEARTH_CAT_BASE_RATE = 0.10;
const HEARTH_CAT_COLD_SEASON_MULTIPLIER = 2;

/**
 * Whether the hearth cat is visiting right now, and where (Part 4.5: "It
 * sleeps on the bench or the wall — dusk and night more often, cold
 * seasons more often, rarely and unpredictably"). Eligible only at dusk
 * and night (Part 9.3); the rate doubles in autumn and winter; it averages
 * no more than one appearance in ten eligible visits. It is never a
 * reward for a tap (Law 8, P45, P147), so this re-rolls true randomness on
 * every call, exactly like pickAmbientEvent — never seeded from the date
 * or from anything the learner did.
 * @param {string} time  one of atmosphere.js's TIMES_OF_DAY
 * @param {string} season  one of atmosphere.js's world seasons
 * @param {() => number} random  injectable for deterministic tests
 * @returns {{spot: string, x: number, y: number}|null}
 */
export function pickHearthCat(time, season, random = Math.random) {
  if (time !== 'dusk' && time !== 'night') return null;
  const rate = (season === 'autumn' || season === 'winter')
    ? HEARTH_CAT_BASE_RATE * HEARTH_CAT_COLD_SEASON_MULTIPLIER
    : HEARTH_CAT_BASE_RATE;
  if (random() > rate) return null;
  return HEARTH_CAT_SPOTS[Math.floor(random() * HEARTH_CAT_SPOTS.length)];
}
