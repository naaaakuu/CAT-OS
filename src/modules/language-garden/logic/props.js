/**
 * props.js — the authored world's inventory (LANGUAGE GARDEN — THE WORLD
 * Part 7, Appendix C.4–C.5; Phase V, Stage W6). Pure logic, no DOM, no
 * storage: it answers only "which props are revealed right now," and the
 * drawing of each one lives in screens/prop-art.js (Rule 19).
 *
 * THE WORLD Part 7.1 states the doctrine plainly: density is testimony,
 * not decoration. The valley must never feel empty and never feel busy,
 * and the resolution is a FIXED, AUTHORED inventory with FIXED placements
 * revealed progressively by the Effort Ledger. So:
 *
 *  - Every prop below carries an authored position transcribed from
 *    Appendix C, converted to the Overlook's 360×560 pixel frame (100%
 *    width = 360, 100% height = 560 — the convention logic/light.js
 *    established in W1 and overlook.js has used since W2). A prop without
 *    an Appendix C coordinate does not exist (Part 7.3), which is why
 *    two of Part 7.4's twelve environmental stories are absent here: see
 *    STORIES_AWAITING_COORDINATES below.
 *  - Placements never move, never re-roll, and never reverse (Part 7.2).
 *    revealedProps() is a pure function of true state, so the same tier
 *    at the same hour always yields the same list, in the same order —
 *    "nothing random per frame" is guaranteed by construction, not by
 *    discipline.
 *  - Conditions are true states only — tier, season, hour, weather
 *    (Part 7.2 rule 4: mirrors, never motors). Nothing here can read
 *    anything the learner is about to do, only what is already true.
 *
 * The budget (Part 7.3): eight standing props at founding, four more per
 * lifetime tier, to twenty-four at Lush — counted across the whole world,
 * so the items marked `scene: 'rootwood'` spend from the same budget
 * while landing in the biome scene rather than on the Overlook.
 */

import { GROUND_TIERS } from './effort.js';

/** Appendix C's percent-of-frame convention → the Overlook's pixel frame. */
const FX = 3.6;   // 1% of frame width
const FY = 5.6;   // 1% of frame height
const px = (xPct, yPct) => ({ x: +(xPct * FX).toFixed(1), y: +(yPct * FY).toFixed(1) });

/** Tier order, lowest to highest — read from effort.js rather than
 *  restated, so a tier can never be added there and forgotten here. */
export const TIER_ORDER = Object.freeze(GROUND_TIERS.map((t) => t.tier));

/** How far up the ladder a tier stands (bare = 0). */
export function tierRank(tier) {
  const i = TIER_ORDER.indexOf(tier);
  return i === -1 ? 0 : i;
}

/* ------------------------------------------------------------------ */
/* The founding eight (Appendix C.4) — always present, from day one.    */
/* Six of the eight were built in Stage W2 and are drawn by overlook.js */
/* directly (the bridge, the Gate, the Hearth set, the rocks, the fence */
/* run, the reeds, the meander banks); they are catalogued here only so */
/* the budget of Part 7.3 can be counted honestly against one list.     */
/* ------------------------------------------------------------------ */

export const FOUNDING_PROPS = Object.freeze([
  { id: 'bridge', tier: 'bare', builtIn: 'W2' },
  { id: 'gate', tier: 'bare', builtIn: 'W2' },
  { id: 'hearth-set', tier: 'bare', builtIn: 'W2' },
  { id: 'mossy-shoulder-rock', tier: 'bare', builtIn: 'W2', ...px(26, 47) },
  { id: 'pale-rock-pair', tier: 'bare', builtIn: 'W2', ...px(63, 61) },
  { id: 'fence-post-run', tier: 'bare', builtIn: 'W2' },
  { id: 'reed-cluster', tier: 'bare', builtIn: 'W2', ...px(55, 62) },
  { id: 'meander-banks', tier: 'bare', builtIn: 'W2' },
]);

/* ------------------------------------------------------------------ */
/* The tier props (Appendix C.5) — four per tier, revealed by the        */
/* Effort Ledger and never taken back.                                   */
/* ------------------------------------------------------------------ */

/**
 * Each entry: `id` (its class hook and its identity), `tier` (the lifetime
 * Ground tier that reveals it), its authored position, and an optional
 * `when` — a further TRUE-STATE condition Appendix C.5 states in words
 * ("rain hours only", "dawn in autumn"). `scene` names where it is drawn:
 * absent means the Overlook, 'rootwood' means the biome's cathedral
 * (Appendix C.5's own *in-scene* marks).
 */
export const TIER_PROPS = Object.freeze([
  // Tended
  { id: 'stepping-stones', tier: 'tended', ...px(28, 72) },
  { id: 'fallen-log', tier: 'tended', ...px(18, 44) },
  { id: 'cattails', tier: 'tended', ...px(58, 61) },
  { id: 'meadow-drift', tier: 'tended', ...px(14, 58) },
  // Growing
  { id: 'gate-lantern', tier: 'growing', ...px(26, 81) },
  { id: 'hazel-panel', tier: 'growing', ...px(62, 71), to: px(74, 72) },
  { id: 'mushrooms', tier: 'growing', ...px(35, 45), when: 'rain' },
  { id: 'perch-snag', tier: 'growing', ...px(68, 30) },
  // Flourishing
  { id: 'sitting-stone', tier: 'flourishing', ...px(27, 74) },
  { id: 'berry-canes', tier: 'flourishing', ...px(80, 72) },
  { id: 'lily-pads', tier: 'flourishing', ...px(48, 58), to: px(53, 60) },
  { id: 'fern-banks', tier: 'flourishing', scene: 'rootwood' },
  // Lush
  { id: 'hollow-log', tier: 'lush', ...px(16, 47) },
  { id: 'spring-seam', tier: 'lush', ...px(42, 40) },
  { id: 'dew-web', tier: 'lush', ...px(82, 73), when: 'autumn-dawn' },
  { id: 'old-stump', tier: 'lush', scene: 'rootwood' },
]);

/** THE WORLD Part 7.3's stated budget, asserted mechanically by
 *  tools/verify.mjs so a future addition cannot quietly overrun it. */
export const FOUNDING_BUDGET = 8;
export const PROPS_PER_TIER = 4;
export const LUSH_BUDGET = 24;

/* ------------------------------------------------------------------ */
/* The seasonal set (Part 7.3) — recurring, never scarce. These are NOT  */
/* tier props and spend nothing from the budget: they come and go with   */
/* the calendar alone, at every tier, so a first-week valley sees the    */
/* blossom drift exactly as a five-year one does.                        */
/* ------------------------------------------------------------------ */

export const SEASONAL_PROPS = Object.freeze([
  { id: 'blossom-drift', season: 'spring' },
  { id: 'heat-haze', season: 'summer', times: ['afternoon'] },
  { id: 'mushroom-ring', season: 'autumn' },
  { id: 'geese-line', season: 'autumn' },
  { id: 'snow-caps', season: 'winter' },
  { id: 'animal-tracks', season: 'winter' },
]);

/* ------------------------------------------------------------------ */
/* The environmental stories (Part 7.4) — twelve authored micro-stories, */
/* placed once, never explained, never pointed at (P143).                */
/* ------------------------------------------------------------------ */

/**
 * The stories that can be placed today. Every one of them is a MARK ON AN
 * ALREADY-PINNED OBJECT rather than a new standing object, so each takes
 * its position from the Appendix C coordinate of the thing it belongs to
 * (the wall, the Gate posts, the kettle-stone, the stepping stones, the
 * path's first bend, the bridge, the fence run) — never from a coordinate
 * invented here. `at` names that host, and prop-art.js draws the mark
 * relative to the host geometry overlook.js already has.
 *
 * They obey Part 7.4's three laws: each happened BEFORE the learner
 * arrived, each is small, and none is ever referenced anywhere in copy,
 * in the Journal, or in a sighting.
 */
export const STORIES = Object.freeze([
  { id: 'mended-wall-gap', at: 'wall', tier: 'bare' },
  { id: 'worn-gate-post', at: 'gate', tier: 'bare' },
  { id: 'kettle-soot-ring', at: 'kettle-stone', tier: 'bare' },
  { id: 'wrens-fence-post', at: 'fence-post-run', tier: 'bare' },
  { id: 'bridge-keystone', at: 'bridge', tier: 'bare' },
  { id: 'polished-bend', at: 'path', tier: 'bare' },
  { id: 'wobbling-stone', at: 'stepping-stones', tier: 'tended' },
  { id: 'carved-stone', at: 'old-stump', tier: 'lush', scene: 'rootwood' },
]);

/**
 * The four of Part 7.4's twelve this stage does NOT place, recorded here
 * so the gap is documented in code rather than silently missing.
 *
 * The first two are Part 7.4's own *in-scene* stories whose scenes are
 * Stage W7's work (the Journal at the bench, Part 10.5; the Gate journey,
 * Part 10.6) — they take their coordinates there, exactly as 7.4 says.
 *
 * The last two are a genuine documentation gap, reported rather than
 * invented: Part 7.4 states that "Overlook-placed stories carry
 * coordinates in Appendix C.5," but neither appears in Appendix C.5 or
 * anywhere else in Appendix C, and unlike the eight above neither is a
 * mark on an already-pinned object — each is a new standing thing that
 * would need a position of its own. Appendix C's own rule governs: "a
 * position that is not here is not decided, and deciding it means adding
 * it here." Deciding them in code would be exactly the improvisation THE
 * WORLD forbids, so they wait for a revision of that document.
 */
export const STORIES_AWAITING_COORDINATES = Object.freeze([
  { id: 'bench-initials', reason: 'in-scene (Part 10.5, the Journal at the bench) — Stage W7' },
  { id: 'boot-scrape', reason: 'in-scene (Part 10.6, the Gate journey) — Stage W7' },
  { id: 'birdhouse', reason: 'no coordinate in Appendix C; a new standing object, not a mark on a pinned one' },
  { id: 'coppiced-stump', reason: 'no coordinate in Appendix C; a new standing object, not a mark on a pinned one' },
]);

/* ------------------------------------------------------------------ */
/* The reveal                                                           */
/* ------------------------------------------------------------------ */

/** Whether a prop's own extra true-state condition holds right now. */
function conditionHolds(when, { season, time, weather }) {
  if (!when) return true;
  if (when === 'rain') return weather === 'rain';
  if (when === 'autumn-dawn') return season === 'autumn' && time === 'dawn';
  return true;
}

/**
 * Every prop revealed right now, in authored order (Part 7.2: the world
 * only ever deepens; it never rearranges). Pure and total — the same
 * arguments always give the same array, so a re-render can never shuffle
 * the valley and an idle screen can never gain or lose a prop between
 * frames.
 *
 * @param {{tier?: string, season?: string, time?: string, weather?: string,
 *          scene?: string}} state  true state only. `scene` filters to one
 *        stage's own props: omitted (or 'overlook') gives the Overlook's,
 *        'rootwood' gives the in-scene ones.
 * @returns {Array<object>} the prop records themselves, positions included
 */
export function revealedProps(state = {}) {
  const { tier = 'bare', scene = 'overlook' } = state;
  const rank = tierRank(tier);
  return TIER_PROPS.filter((p) => {
    if ((p.scene ?? 'overlook') !== scene) return false;
    if (tierRank(p.tier) > rank) return false;
    return conditionHolds(p.when, state);
  });
}

/** Every seasonal dressing showing right now (Part 7.3's recurring set):
 *  a function of the calendar alone, never of effort — a first-day valley
 *  gets the blossom drift exactly as a five-year one does. */
export function revealedSeasonalProps({ season, time } = {}) {
  return SEASONAL_PROPS.filter((p) =>
    p.season === season && (!p.times || p.times.includes(time)));
}

/** The stories standing right now (Part 7.4). A story attached to a tier
 *  prop cannot appear before its host does — the stepping stone that
 *  wobbles needs stepping stones first. */
export function revealedStories(state = {}) {
  const { tier = 'bare', scene = 'overlook' } = state;
  const rank = tierRank(tier);
  return STORIES.filter((s) =>
    (s.scene ?? 'overlook') === scene && tierRank(s.tier) <= rank);
}
