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
 */

export function timeOfDay(date = new Date()) {
  const h = date.getHours();
  if (h < 6) return 'night';
  if (h < 9) return 'dawn';
  if (h < 17) return 'day';
  if (h < 20) return 'dusk';
  return 'night';
}

const EVENTS_BY_TIME = Object.freeze({
  dawn:  ['bird', 'leaf-stir'],
  day:   ['bird', 'butterfly', 'leaf-stir'],
  dusk:  ['bird', 'petal', 'leaf-stir'],
  night: ['firefly', 'leaf-stir'],
});

/**
 * @param {Date} date
 * @param {() => number} random  injectable for deterministic tests
 * @returns {string|null} one of 'bird'|'butterfly'|'leaf-stir'|'petal'|'firefly', or null (no visitor this time)
 */
export function pickAmbientEvent(date = new Date(), random = Math.random) {
  if (random() > 0.45) return null;
  const pool = EVENTS_BY_TIME[timeOfDay(date)];
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
