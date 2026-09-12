/**
 * growth.js — how much of the valley exists yet.
 *
 * A new learner must arrive in an almost empty place: quiet land, a few
 * trees, one small house, Wick, and room everywhere. Everything else —
 * the wood, the hamlet, the terraces cut into the hill, the workshops in
 * the Quarter, the people — arrives because they learned something.
 *
 * So nothing in the map is a constant. Every count the painter uses comes
 * from here, and everything here is derived from real learning records.
 *
 * The curve is deliberate: `rise()` is a square root, so the first twenty
 * words change the valley more than the next two hundred. A learner must
 * see the world answer on their first day, and still have somewhere to go
 * on their hundredth.
 */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Ease-out 0..1: fast at the start, slow at the end. */
export function rise(value, full) {
  return Math.sqrt(clamp01((value ?? 0) / Math.max(1, full)));
}

/** A count that grows with `g` from `lo` to `hi`. */
export function grown(g, lo, hi) { return Math.round(lo + (hi - lo) * clamp01(g)); }

/**
 * The growth of every part of the valley, 0 → 1.
 * @param {object} s the world state, part-built (regions already derived)
 */
export function deriveGrowth(s) {
  const wood = rise(s.rootwood.metCount * 2 + s.rootwood.grownCount * 3, Math.max(12, s.rootwood.total * 3));
  const meadow = rise(s.meadow.known + s.meadow.mastered + Math.floor((s.banks?.wb?.solved ?? 0) / 2), 260);
  const pond = rise(s.pond.known + s.pond.mastered, 120);
  const thicket = rise(s.thicket.known + s.thicket.mastered, 110);
  // The content engine's banks count where they are played: arguments in
  // the Reading Room, placement and completion in the Quarter, the word
  // bank with the Meadow — a set of six is worth about one item of the
  // older, longer kinds.
  const banks = s.banks ?? {};
  const bankSolved = (k) => banks[k]?.solved ?? 0;
  const reading = rise(s.reading.read * 2 + s.reading.wellRead + Math.floor(bankSolved('cr') / 4), 34);
  const quarterSolved = s.loom.solved + s.table.solved + s.bench.solved + Math.floor((bankSolved('sp') + bankSolved('pc')) / 4);
  const quarter = rise(quarterSolved, 56);
  const terraces = rise(s.terraces.done, 20);
  const wilds = rise(s.wilds.runs, 8);

  // The valley as a whole: what has been learned anywhere, plus what has
  // been built with it. Building counts double — it is the deliberate act.
  const learned = (wood + meadow + pond + thicket + reading + quarter + terraces) / 7;
  const builtShare = rise((s.builds?.length ?? 0), 16);
  const valley = clamp01(learned * 0.6 + builtShare * 0.4);

  return {
    wood, meadow, pond, thicket, reading, quarter, terraces, wilds, valley,
    /* ---- The counts the map paints from ---- */
    // The Rootwood is a thin stand of six trees before anything is grown.
    wildTrees: grown(wood, 16, 158),
    // Trees scattered over the open valley.
    valleyTrees: grown(valley, 3, 30),
    // Brambles in the Thicket's corner.
    brambles: grown(thicket, 4, 20),
    // Loose rock and grass over the whole map.
    rocks: grown(valley, 5, 16),
    tufts: grown(valley, 26, 96),
    // Terrace benches cut into the north-east hill, 0–4.
    terraceBands: Math.min(4, Math.round(terraces * 4.4)),
    // The reading yard: wall, pines and benches round the tower.
    readingYard: reading > 0.18,
    // Each workshop in the Quarter stands only once its craft has been
    // worked; before that the plot holds a frame and a stack of timber.
    loomBuilt: s.loom.solved >= 1,
    tableBuilt: s.table.solved >= 1,
    benchBuilt: s.bench.solved >= 1,
    // The crossing over the river: stones you hop before it is a bridge.
    bridges: valley > 0.14,
    // Houses round the Hearth — the valley becoming a village.
    houses: grown(valley, 0, 5),
    // People. They arrive because there is something here.
    folk: Math.min(7, grown(valley, 0, 5) + Math.floor((s.builds?.length ?? 0) / 4)),
    // A hut at the top of the terraces.
    terraceHut: terraces > 0.3,
  };
}

/**
 * One honest line about how far the valley has come, for the map and for
 * the Hearth. Never a percentage — a place, at a stage.
 */
export const VALLEY_STAGES = Object.freeze([
  { at: 0.00, name: 'Bare ground', line: 'Quiet land, and room everywhere.' },
  { at: 0.12, name: 'A clearing', line: 'Tracks between the places, and the first trees.' },
  { at: 0.28, name: 'A settlement', line: 'Someone else has moved in.' },
  { at: 0.46, name: 'A hamlet', line: 'Smoke from more than one chimney.' },
  { at: 0.64, name: 'A village', line: 'The Quarter works late, and the wood is deep.' },
  { at: 0.80, name: 'A town', line: 'People come here to read.' },
  { at: 0.92, name: 'A valley known for its readers', line: 'And the road out is lit.' },
]);

export function valleyStage(g) {
  let out = VALLEY_STAGES[0];
  for (const s of VALLEY_STAGES) if ((g ?? 0) >= s.at) out = s;
  return out;
}
