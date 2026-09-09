/**
 * fauna.js — the fauna design language as data (LANGUAGE GARDEN — THE
 * WORLD Part 9; Bible §4.8; Phase V, Stage W6). Pure logic, no DOM: this
 * module owns the roster's pinned sizes and pigments, each creature's one
 * motion verb, and the decision of WHICH creature (if any) is here right
 * now. The drawing lives in screens/fauna-art.js (Rule 19).
 *
 * Three laws hold every line below in place:
 *
 *  - **Law 8 (Bible §4.8): the world is not a reward; the world simply
 *    is.** Nothing here can be earned, collected, completed, or caused by
 *    a tap. The conditions are true states the learner will slowly deduce
 *    — flowers bring butterflies, Ancients bring fireflies, rain brings
 *    snails — and deducing them is the whole pleasure.
 *
 *  - **Facelessness is a law, not a budget (Part 9.1, P147).** No creature
 *    has a face or eyes at any distance. Faces make characters, characters
 *    make companions, and there is no companion. Identity lives in
 *    silhouette, colour, and motion — which is exactly what this file
 *    pins.
 *
 *  - **One verb each, slow enough to ignore (Part 9.2).** Nothing ever
 *    moves toward the learner, looks at the learner, or performs for the
 *    learner.
 *
 * Sizes are shares of the FRAME WIDTH, exactly as Part 9.3's table states
 * them; a caller multiplies by its own frame width (360 on the Overlook)
 * or uses them directly as percentages in a percentage-space scene.
 */

/**
 * THE WORLD Part 9.3's roster, transcribed. `size` is the share of frame
 * width as a fraction; `verb` is Part 9.2's single motion verb, which
 * fauna-art.js turns into exactly one animation. Pigments are literal hex
 * because they are pinned values, not themeable choices — a Meadow-white
 * butterfly is chalk `#F2EFE2` in every theme, at every hour, and the
 * hour's own light is carried by the scene around it, never by recolouring
 * the creature.
 */
export const FAUNA = Object.freeze({
  'butterfly-white': { size: 0.016, verb: 'drift', fill: '#F2EFE2' },
  'butterfly-dark': { size: 0.016, verb: 'drift', fill: '#4A3F52' },
  bee: { size: 0.012, verb: 'potter', fill: '#D9A24A', band: '#4A4038' },
  dragonfly: { size: 0.022, verb: 'hover-slip', fill: '#7FA2B8', sheen: '#D6DEE6', sheenOpacity: 0.4 },
  firefly: { size: 0.004, glowSize: 0.02, verb: 'breathe', fill: '#F2D98A' },
  bird: { size: 0.02, verb: 'cross', fill: '#8C7A66' },
  moth: { size: 0.014, verb: 'orbit', fill: '#E4DFD2' },
  snail: { size: 0.012, verb: 'present', fill: '#C9BCA6', shell: '#A98F72' },
  frog: { size: 0.018, verb: 'present', fill: '#7FA066' },
  deer: { size: 0.08, verb: 'step-freeze', fill: '#B08D66', underside: '#E3D3B8' },
  fox: { size: 0.07, verb: 'cross-unhurried', fill: '#C97F58', tailTip: '#F2EFE2' },
  heron: { size: 0.06, verb: 'stand', fill: '#AEB9C6', leg: '#4A4038' },
  owl: { size: 0.035, verb: 'is-there', fill: '#6F5B48' },
  cat: { size: 0.05, verb: 'sleep', fill: '#4A4644', chest: '#C9BCA6' },
});

/**
 * The four creatures Part 9.3 rosters that the world cannot honestly show
 * yet, recorded rather than quietly omitted. Each is blocked by a biome
 * that has no engine, not by this stage's scope: Bible §4.8 gates bees on
 * an Orchard whose trees are in leaf and dragonflies on a Mirror Pond
 * whose water clears with mastery, and neither biome lives (biomes.js
 * marks both `wild`). Their draw specs are built and pinned above, so the
 * day those biomes ship they need placement only, never invention.
 */
export const FAUNA_AWAITING_A_LIVING_BIOME = Object.freeze([
  { id: 'bee', reason: 'Bible §4.8 gates bees on the Orchard in leaf; the Orchard is still wild' },
  { id: 'dragonfly', reason: 'Bible §4.8 gates dragonflies on the Mirror Pond\'s clarity; the Pond is still wild' },
]);

/* ------------------------------------------------------------------ */
/* Who is here, right now                                              */
/* ------------------------------------------------------------------ */

/**
 * The Overlook's rare pool (Bible §4.8): "A fox, a deer, a heron, an owl.
 * Rare, unpredictable, unearned, unrepeatable in any given moment and
 * entirely repeatable in general. They are not rewards. They are the best
 * thing in the Garden precisely because they are not rewards."
 *
 * Each keeps to the hours its own verb makes sense in — the owl is a night
 * creature, the deer and the fox belong to the edges of the day, the heron
 * stands at the water in daylight. Nothing is gated on effort: a valley on
 * its first week can see a fox, and a five-year valley can go a month
 * without one. That asymmetry is the point.
 */
const RARE_POOL = Object.freeze({
  deer: ['dawn', 'dusk'],
  fox: ['dawn', 'dusk', 'night'],
  heron: ['morning', 'afternoon', 'dusk'],
  owl: ['night'],
});

/** Roughly one visit in twenty-five carries one of the rare four. Low
 *  enough that it is never expected, high enough that it recurs — the
 *  Bible's "unrepeatable in any given moment and entirely repeatable in
 *  general," made a number. */
export const RARE_RATE = 0.04;

/** How often ANY of the common creatures appears, scaled by the Ground's
 *  lifetime tier (Bible §8.3: "more effort over time means a valley with
 *  more in it") — but ceilinged well short of busy (Part 7.1, Law 6). */
const COMMON_RATE_BY_TIER = Object.freeze({
  bare: 0.22, tended: 0.30, growing: 0.38, flourishing: 0.45, lush: 0.52,
});

/**
 * The Overlook's common pool for this moment: everything whose true-state
 * condition Bible §4.8 states actually holds. Flowers bring butterflies;
 * Ancients bring fireflies and the birds that nest in them; rain brings
 * snails and frogs to the stones and the reeds; night brings moths to the
 * pale flowers. Nothing appears because the learner arrived.
 */
function commonPoolFor(time, { bloomingCount = 0, ancientCount = 0, tier = 'bare', weather = 'clear' }) {
  const pool = [];
  const day = time === 'morning' || time === 'afternoon';
  const flowers = bloomingCount > 0 || tier === 'flourishing' || tier === 'lush';

  // Butterflies where there are flowers (§4.8). The Meadow's own drift
  // arrives at Tended, so a well-tended valley has them even before its
  // first family blooms; the Thicket-dark form waits for the berry canes
  // that arrive with Flourishing.
  if ((day || time === 'dawn') && (flowers || tier !== 'bare')) pool.push('butterfly-white');
  if (day && (tier === 'flourishing' || tier === 'lush')) pool.push('butterfly-dark');

  // A bird crossing: birds nest in trees that reach Ancient (§4.8, §6.5).
  if (ancientCount > 0 && time !== 'night') pool.push('bird');

  // Fireflies in the Rootwood at night, denser where there are Ancients.
  if (time === 'night' && ancientCount > 0) pool.push('firefly', 'firefly');
  if (time === 'dusk' && ancientCount > 0) pool.push('firefly');

  // Moths at night, near the pale flowers (§4.8).
  if (time === 'night' && flowers) pool.push('moth');

  // Snails after rain, on the stones; the frog belongs to the same wet
  // hour, at the reeds the founding set already put at the pond's lip.
  if (weather === 'rain') pool.push('snail', 'frog');

  return pool;
}

/**
 * Which creature, if any, the Overlook shows this visit — called ONCE per
 * screen mount, never on an interval, so a five-minute idle shows at most
 * quiet, unsynchronised life (Part 13's own W6 acceptance line) and the
 * valley never reshuffles itself to look busy (Law 6).
 *
 * The rare four are rolled first and independently of effort, so they stay
 * genuinely unearned; only if they decline does the common pool roll at
 * the Ground tier's density.
 *
 * @param {{time: string, season?: string, weather?: string, tier?: string,
 *          bloomingCount?: number, ancientCount?: number}} state
 *        true state only — every field is something already true about the
 *        world or the calendar, never anything the learner is about to do.
 * @param {() => number} random  injectable for deterministic tests
 * @returns {string|null} a key of FAUNA, or null (no visitor this time)
 */
export function pickOverlookVisitor(state = {}, random = Math.random) {
  const { time = 'morning' } = state;

  const rareHere = Object.keys(RARE_POOL).filter((id) => RARE_POOL[id].includes(time));
  if (rareHere.length && random() < RARE_RATE) {
    return rareHere[Math.floor(random() * rareHere.length)];
  }

  const pool = commonPoolFor(time, state);
  if (!pool.length) return null;
  const rate = COMMON_RATE_BY_TIER[state.tier] ?? COMMON_RATE_BY_TIER.bare;
  if (random() > rate) return null;
  return pool[Math.floor(random() * pool.length)];
}
