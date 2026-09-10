/**
 * groves.js — the map of the Rootwood Walk (LANGUAGE GARDEN — THE WORLD.md
 * Part 16, 0.17.0). Pure data + pure layout; no DOM, no storage.
 *
 * The 0.16.0 Rootwood held seven foreground plants and let every other
 * family recede into anonymous canopy (THE WORLD Part 8.5, the working
 * set). With fifty-one families in the content system that rule showed a
 * learner six saplings and hid the rest of their own wood. Part 16 replaces
 * it: **every family stands in the wood, in a fixed stand, in a named
 * grove, forever.** The wood is a walk — wider than the frame, entered at
 * its mouth, crossed by hand — and the groves are its places.
 *
 * A grove is a SEMANTIC neighbourhood: the roots that share a field of
 * meaning stand together, because that is how a reader actually meets
 * them (a passage about power meets *archy* and *cracy* in one breath).
 * Membership is authored here, never derived, and never rearranged: a
 * family's stand is as fixed as the Hearth's bench (Part 7.2). Adding a
 * family to the content later means adding its id to a grove below; a
 * family missing from every grove is honestly placed at the wood's edge
 * (see layoutWood) rather than dropped, so content can never disappear.
 *
 * Copy law: grove names and lines are world text (a place has a name),
 * held to the mentor's register by tools/verify.mjs — no judgment words,
 * no exclamation marks, no numbers.
 */

/** One grove is 1.4 frames wide, in the wood's own units (Part 16.2: one
 *  unit is one percent of the frame's width) — wide enough that three
 *  front-row crowns stand apart, close enough that a grove is one place. */
export const GROVE_WIDTH = 140;
/** The path in from the valley, before the first grove — where the fern
 *  banks, the old stump and the carved stone stand (Appendix C.6). */
export const WOOD_ENTRANCE = 28;
/** A little wood beyond the last grove, so the walk ends in trees. */
export const WOOD_END = 16;

export const GROVES = Object.freeze([
  {
    slug: 'ways', name: 'The Grove of Ways',
    line: 'Roots that go, bend, break, and touch.',
    families: ['lg-0001', 'lg-0042', 'lg-0043', 'lg-0044', 'lg-0037', 'lg-0033', 'lg-0032', 'lg-0007'],
  },
  {
    slug: 'measures', name: 'The Grove of Measures',
    line: 'Time, size, and number: how much, how many, how long.',
    families: ['lg-0002', 'lg-0010', 'lg-0005', 'lg-0006', 'lg-0034', 'lg-0031', 'lg-0008', 'lg-0009', 'lg-0036', 'lg-0011'],
  },
  {
    slug: 'voices', name: 'The Grove of Voices',
    line: 'Knowing, saying, naming, and writing down.',
    families: ['lg-0028', 'lg-0018', 'lg-0024', 'lg-0050', 'lg-0027', 'lg-0030', 'lg-0045', 'lg-0021', 'lg-0023', 'lg-0004'],
  },
  {
    slug: 'kin', name: 'The Grove of Kin',
    line: 'People, bodies, and the shapes a life takes.',
    families: ['lg-0026', 'lg-0012', 'lg-0013', 'lg-0016', 'lg-0019', 'lg-0017', 'lg-0051', 'lg-0041'],
  },
  {
    slug: 'hearts', name: 'The Grove of Hearts',
    line: 'Love and its opposite, feeling, good and ill, and the gods.',
    families: ['lg-0003', 'lg-0025', 'lg-0022', 'lg-0048', 'lg-0046', 'lg-0047', 'lg-0020'],
  },
  {
    slug: 'embers', name: 'The Grove of Embers',
    line: 'Fire and stars, rule and war, endings and nothing.',
    families: ['lg-0014', 'lg-0015', 'lg-0029', 'lg-0049', 'lg-0038', 'lg-0039', 'lg-0040', 'lg-0035'],
  },
]);

/** The wood's edge: where a family no grove has claimed yet stands. Never
 *  shown unless something actually stands there. */
export const EDGE_GROVE = Object.freeze({
  slug: 'edge', name: 'The Wood’s Edge',
  line: 'Roots that arrived after the groves were named.',
  families: [],
});

/**
 * The eleven authored stands of one grove, in fill order (Part 16.2):
 * the three front stands first (the eye lands here), then the four of
 * the mid row, then the four of the back row. (x, y) are percentages of
 * the grove's own frame — base-anchored, x from its left edge, y where
 * the plant meets the ground. `scale` is the row's depth scale; `band`
 * only changes the shadow's visual weight. Hand-placed and uneven on
 * purpose (Guide 5.2): nothing here sits on a grid.
 */
export const GROVE_STANDS = Object.freeze([
  { x: 30, y: 88, scale: 1.2, band: 'front' },
  { x: 72, y: 90, scale: 1.2, band: 'front' },
  { x: 110, y: 87, scale: 1.2, band: 'front' },
  { x: 26, y: 77, scale: 0.92, band: 'mid' },
  { x: 56, y: 78, scale: 0.92, band: 'mid' },
  { x: 88, y: 76, scale: 0.92, band: 'mid' },
  { x: 116, y: 78, scale: 0.92, band: 'mid' },
  { x: 36, y: 67, scale: 0.68, band: 'back' },
  { x: 70, y: 66, scale: 0.68, band: 'back' },
  { x: 104, y: 67, scale: 0.68, band: 'back' },
  { x: 132, y: 66, scale: 0.68, band: 'back' },
]);
/** The doorposts (Part 16.3) stand at each grove's left edge (x = 0 of the
 *  grove) and at the wood's mouth and far end. The stands above are
 *  authored so that no front or mid crown — a front Mature crown is about
 *  fifty units wide, a mid one about forty — reaches a doorpost: front
 *  stands keep thirty units from either edge, mid stands twenty-six.
 *  A back-row crown may stand partly behind a doorpost: it is the back
 *  row, and a distant tree behind a near trunk is what a wood looks like. */
export const DOORPOST_CLEARANCE = Object.freeze({ front: 30, mid: 24 });

/** How many families one grove can seat. A grove larger than this is a
 *  content-authoring error tools/verify.mjs reports. */
export const GROVE_CAPACITY = GROVE_STANDS.length;

/** The full width of the walk, in wood units, for a given list of groves
 *  (the six authored ones, plus the edge grove only when it holds
 *  something). */
export function woodWidth(groveCount) {
  return WOOD_ENTRANCE + groveCount * GROVE_WIDTH + WOOD_END;
}

/** The left edge (in wood units) of the grove at `index`. */
export function groveLeft(index) {
  return WOOD_ENTRANCE + index * GROVE_WIDTH;
}

/**
 * Where every family stands (Part 16.2). Pure: the same families give the
 * same map forever. Families absent from every authored grove are seated,
 * in registry order, at the wood's edge — a seventh grove that exists only
 * while something stands in it.
 * @param {Array} families  loaded lg families (any biome; only those whose
 *        id appears in a grove, or none, are placed — callers pass the
 *        Rootwood's own)
 * @returns {{ groves: Array<{grove, index, left, families: Array}>,
 *             stands: Map<string, {familyId, grove, groveIndex, stand,
 *             x, y, scale, band}>, width: number }}
 *         `x` is absolute, in wood units (0..width); `y` is the stand's
 *         ground line as a percentage of frame height.
 */
export function layoutWood(families) {
  const byId = new Map(families.map((f) => [f.meta.id, f]));
  const claimed = new Set();
  const groves = [];

  GROVES.forEach((grove, index) => {
    const present = grove.families.filter((id) => byId.has(id));
    present.forEach((id) => claimed.add(id));
    groves.push({ grove, index, left: groveLeft(index), families: present.map((id) => byId.get(id)) });
  });

  const unclaimed = families.filter((f) => !claimed.has(f.meta.id))
    .sort((a, b) => a.meta.id.localeCompare(b.meta.id));
  if (unclaimed.length) {
    const index = groves.length;
    groves.push({ grove: EDGE_GROVE, index, left: groveLeft(index), families: unclaimed });
  }

  const stands = new Map();
  for (const g of groves) {
    g.families.forEach((family, i) => {
      // Past the eleventh family a grove simply wraps onto its own stands
      // again, nudged along, rather than dropping a family — verify.mjs
      // reports the overflow so it is fixed in content, never hidden.
      const stand = GROVE_STANDS[i % GROVE_STANDS.length];
      const wrap = Math.floor(i / GROVE_STANDS.length);
      stands.set(family.meta.id, {
        familyId: family.meta.id,
        grove: g.grove, groveIndex: g.index, stand,
        x: g.left + stand.x + wrap * 5,
        y: stand.y - wrap * 2,
        scale: stand.scale, band: stand.band,
      });
    });
  }

  return { groves, stands, width: woodWidth(groves.length) };
}

/** The grove a wood position (in wood units) falls in, or null in the
 *  entrance/end margins. Used to name the place the learner is standing. */
export function groveAt(x, groves) {
  for (const g of groves) {
    if (x >= g.left && x < g.left + GROVE_WIDTH) return g;
  }
  return null;
}
