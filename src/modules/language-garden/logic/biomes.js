/**
 * biomes.js — the seam that turns the Language Garden from a single
 * hard-coded grove into a valley of seven biomes (LANGUAGE_GARDEN_BIBLE
 * §5, §19.1). Pure data + lookups, no DOM, no storage.
 *
 * A biome is "a kind of thinking, not a label on a word list" (§5.0,
 * Principle 50). Each is tied to exactly one ENGINE — the cognitive move
 * its sessions demand — and every future content type is placed by asking
 * which of the seven moves it needs (§19.1). This registry is the single
 * place that mapping lives, so the session, the scene, the plant art, and
 * the Overlook all dispatch on `biome.engine` / `biome.slug` rather than
 * assuming "root_grove" everywhere.
 *
 * STATUS is the honest part. Only the Rootwood is `living`: it has
 * content and its engine (DECOMPOSE) is built. The other six are `wild`
 * — real geography, always visible from the Overlook, simply not yet
 * cultivated (which is exactly how the Bible treats undeveloped valley,
 * §4.3, and the Wilds, §5.8). They are not "coming soon" cards and they
 * are never a grid of empty slots (Principle 64/138): they are land.
 *
 * `compass` places each region on the valley from above, per the Bible's
 * own map (§4.1). The Overlook art turns a compass point into pixels; the
 * data here stays presentation-free.
 */

/** The cognitive engines (§5). `implemented` gates the session flow: only
 *  DECOMPOSE exists today, so only Rootwood content can start a session.
 *  Adding a biome later means building its engine and flipping this flag —
 *  the seam is here, deliberately, so that is the ONLY structural change. */
export const ENGINES = Object.freeze({
  decompose:    { verb: 'Take it apart',          implemented: true },
  compose:      { verb: 'Build it up',            implemented: false },
  contrast:     { verb: 'Place it on the axis',   implemented: false },
  discriminate: { verb: 'Separate the twins',     implemented: false },
  origin:       { verb: 'Learn the story',        implemented: false },
  picture:      { verb: 'Picture the situation',  implemented: false },
  spot:         { verb: 'Spot it, or don’t', implemented: false },
});

/**
 * The seven biomes. `garden` is the content `garden` field that resolves
 * here (so no content migration is needed — lg-*.json keeps saying
 * "root_grove"). `wild` biomes carry no `garden` mapping yet.
 */
export const BIOMES = Object.freeze([
  {
    slug: 'rootwood', name: 'The Rootwood', garden: 'root_grove',
    engine: 'decompose', plant: 'tree', tonic: 'low', compass: 'north',
    status: 'living',
  },
  {
    slug: 'terraces', name: 'The Vine Terraces', garden: null,
    engine: 'compose', plant: 'vine', tonic: 'fifth', compass: 'east',
    status: 'wild',
  },
  {
    slug: 'orchard', name: 'The Orchard', garden: null,
    engine: 'contrast', plant: 'fruit-tree', tonic: 'major', compass: 'south',
    status: 'wild',
  },
  {
    slug: 'meadow', name: 'The Meadow', garden: null,
    engine: 'picture', plant: 'flower', tonic: 'high', compass: 'west',
    status: 'wild',
  },
  {
    slug: 'pond', name: 'The Mirror Pond', garden: null,
    engine: 'discriminate', plant: 'twin', tonic: 'lowest', compass: 'centre',
    status: 'wild',
  },
  {
    slug: 'thicket', name: 'The Thicket', garden: null,
    engine: 'origin', plant: 'bramble', tonic: 'dissonant', compass: 'southeast',
    status: 'wild',
  },
  {
    slug: 'wilds', name: 'The Wilds', garden: null,
    engine: 'spot', plant: null, tonic: 'none', compass: 'beyond',
    status: 'wild',
  },
]);

const BY_SLUG = new Map(BIOMES.map((b) => [b.slug, b]));
const BY_GARDEN = new Map(BIOMES.filter((b) => b.garden).map((b) => [b.garden, b]));

/** The biome a resolved content family belongs to, via its `garden` field. */
export function biomeForFamily(family) {
  return BY_GARDEN.get(family?.meta?.garden) ?? null;
}

/** The biome for a `garden` content value (e.g. "root_grove"). */
export function biomeForGarden(garden) {
  return BY_GARDEN.get(garden) ?? null;
}

/** The biome for an Overlook/route slug (e.g. "rootwood"). */
export function biomeBySlug(slug) {
  return BY_SLUG.get(slug) ?? null;
}

/** Biomes that can actually be entered and grown today. */
export function livingBiomes() {
  return BIOMES.filter((b) => b.status === 'living');
}

/** Can a session actually run for this biome? (Content exists AND its
 *  engine is built.) The session screen refuses politely otherwise, so a
 *  future `living` biome whose engine is half-built can never strand a
 *  learner mid-session. */
export function isPlayable(biome) {
  return !!biome && biome.status === 'living' && !!ENGINES[biome.engine]?.implemented;
}
