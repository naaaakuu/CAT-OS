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
function poolFor(time, { bloomingCount = 0, ancientCount = 0 }) {
  const pool = [...BASE_EVENTS_BY_TIME[time]];
  if (bloomingCount > 0) {
    if (time === 'dawn' || time === 'morning' || time === 'afternoon') pool.push('butterfly');
    if (time === 'dusk') pool.push('petal');
  }
  if (ancientCount > 0) {
    if (time === 'night') pool.push('firefly', 'firefly'); // a nested firefly-glow bias
    if (time === 'dusk') pool.push('firefly');             // "the first fireflies" (§4.5)
  }
  return pool;
}

/**
 * @param {{bloomingCount?: number, ancientCount?: number, groundTier?: string}} state
 *        true-state counts this biome has right now (Mature+Ancient
 *        plants, Ancient-only plants) and the valley's lifetime effort
 *        tier — all derived, never stored, never guessed.
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

/** How long a tree must have HELD Ancient, in real elapsed time, before a
 *  nest quietly appears (Bible §6.5: a bird nests in an Ancient tree once
 *  it "has existed for some time"). Fourteen days of standing Ancient. */
export const NEST_ELIGIBLE_MS = 14 * 24 * 60 * 60 * 1000;

/** @param {ReturnType<import('../../../core/engine/garden-session.js').computePlantState>} state */
export function hasNest(state, now = Date.now()) {
  if (state.stage !== 'ancient' || !state.ancientAt) return false;
  return now - new Date(state.ancientAt).getTime() >= NEST_ELIGIBLE_MS;
}
