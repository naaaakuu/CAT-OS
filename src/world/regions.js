/**
 * regions.js — the places of the CAT OS world. Pure data: every place has
 * a name, one line of what is learned there, where it stands on the map
 * (world pixels), and the route that enters it. The map painter draws
 * from these anchors; the screens read the same registry; nothing else
 * knows a coordinate.
 *
 * The world is 640 × 720 world pixels, portrait: the mountains at the
 * top, the Hearth (home) low in the centre, the road out at the bottom.
 */

export const WORLD_W = 640;
export const WORLD_H = 720;

export const REGIONS = Object.freeze([
  {
    slug: 'hearth', name: 'The Hearth', kind: 'home',
    line: 'Home. Your standing, your collections, your records.',
    verb: 'Come home',
    anchor: { x: 214, y: 566 }, hit: { x: 160, y: 500, w: 110, h: 80 },
    route: '#/world/place/hearth', color: '#F1E1C0',
  },
  {
    slug: 'rootwood', name: 'The Rootwood', kind: 'learn',
    line: 'Latin and Greek roots, the Root Workshop’s wood. Take a word apart and a whole family of words opens.',
    verb: 'Walk into the wood',
    skill: 'Roots & word families',
    anchor: { x: 160, y: 262 }, hit: { x: 24, y: 150, w: 290, h: 180 },
    route: '#/world/place/rootwood', color: '#4E9E4C',
  },
  {
    slug: 'meadow', name: 'The Meadow', kind: 'learn',
    line: 'The CAT word lists. Every word you master is a flower that stays.',
    verb: 'Bloom a field',
    skill: 'Vocabulary',
    anchor: { x: 150, y: 428 }, hit: { x: 24, y: 350, w: 250, h: 120 },
    route: '#/world/place/meadow', color: '#A6CF72',
  },
  {
    slug: 'pond', name: 'The Mirror Pond', kind: 'learn',
    line: 'Words that look alike and mean different things. Tell the twins apart and koi arrive.',
    verb: 'Look into the pond',
    skill: 'Confusable words',
    anchor: { x: 340, y: 388 }, hit: { x: 276, y: 344, w: 130, h: 90 },
    route: '#/world/place/pond', color: '#4D9FD3',
  },
  {
    slug: 'reading-room', name: 'The Reading House', kind: 'learn',
    line: 'CAT passages against the clock, sized like the exam: four questions each.',
    verb: 'Read with Chai',
    skill: 'Reading comprehension',
    anchor: { x: 522, y: 404 }, hit: { x: 446, y: 320, w: 160, h: 130 },
    route: '#/world/place/reading-room', color: '#BFB4A2',
  },
  {
    slug: 'terraces', name: 'The Vine Terraces', kind: 'learn',
    line: 'Prefixes, suffixes and borrowed words that climb the hill in vines.',
    verb: 'Climb the terraces',
    skill: 'Prefixes & suffixes',
    anchor: { x: 540, y: 250 }, hit: { x: 430, y: 168, w: 196, h: 136 },
    route: '#/world/place/terraces', color: '#D9C29B',
  },
  {
    slug: 'thicket', name: 'The Thicket', kind: 'learn',
    line: 'English words that arrived from other languages. A lantern lights for every tongue you learn.',
    verb: 'Enter the thicket',
    skill: 'Loanwords',
    anchor: { x: 84, y: 596 }, hit: { x: 14, y: 500, w: 130, h: 160 },
    route: '#/world/place/thicket', color: '#3F6B3F',
  },
  {
    slug: 'loom', name: 'The Loom', kind: 'learn', inQuarter: true,
    line: 'Para Jumbles. Four sentences, one order: weave the paragraph the author wrote.',
    verb: 'Sit at the loom',
    skill: 'Para jumbles',
    anchor: { x: 424, y: 566 }, hit: { x: 396, y: 520, w: 60, h: 60 },
    route: '#/world/place/loom', color: '#8A6C9C',
  },
  {
    slug: 'table', name: 'The Summary Table', kind: 'learn', inQuarter: true,
    line: 'Para Summary. Find the author’s point and protect it from the options that almost say it.',
    verb: 'Sit at the table',
    skill: 'Para summary',
    anchor: { x: 516, y: 606 }, hit: { x: 486, y: 560, w: 62, h: 60 },
    route: '#/world/place/table', color: '#C6533A',
  },
  {
    slug: 'bench', name: 'The Stranger’s Bench', kind: 'learn', inQuarter: true,
    line: 'Odd One Out. Build the paragraph, and the sentence that never belonged shows itself.',
    verb: 'Take the bench',
    skill: 'Odd one out',
    anchor: { x: 594, y: 540 }, hit: { x: 566, y: 500, w: 62, h: 56 },
    route: '#/world/place/bench', color: '#5D7F90',
  },
  {
    slug: 'placement', name: 'The Rose Cottage', kind: 'learn', inQuarter: true,
    line: 'Sentence Placement. A paragraph with one sentence lifted out: find the one seat it can take.',
    verb: 'Step into the cottage',
    skill: 'Sentence placement',
    anchor: { x: 452, y: 586 }, hit: { x: 440, y: 576, w: 26, h: 22 },
    route: '#/world/place/placement', color: '#D98B7A',
  },
  {
    slug: 'completion', name: 'The Clock Tower', kind: 'learn', inQuarter: true,
    line: 'Para Completion. A paragraph that stops one sentence early: decide what the gap needs.',
    verb: 'Climb the tower',
    skill: 'Para completion',
    anchor: { x: 560, y: 586 }, hit: { x: 550, y: 576, w: 24, h: 22 },
    route: '#/world/place/completion', color: '#93AED1',
  },
  {
    slug: 'wilds', name: 'The Wilds', kind: 'challenge',
    line: 'Beyond the valley: the weekly Gauntlet, timed and mixed, against your own best.',
    verb: 'Take the road out',
    skill: 'Mixed timed challenge',
    anchor: { x: 340, y: 690 }, hit: { x: 250, y: 656, w: 180, h: 64 },
    route: '#/world/place/wilds', color: '#B9C0CB',
  },
]);

/**
 * The Quarter: the three verbal workshops stand in one yard, and at map
 * scale three pins twenty pixels apart is three overlapping labels and no
 * information. So the map shows one place — the Quarter — and the card it
 * opens offers the three benches inside it. The three regions themselves
 * are untouched: same slugs, same routes, same crafts, same content.
 */
export const QUARTER = Object.freeze({
  slug: 'quarter', name: 'The Quarter', kind: 'quarter',
  line: 'Three workshops in one yard: the order of sentences, the point of a paragraph, and the one that never belonged.',
  skill: 'Verbal reasoning',
  verb: 'Into the Quarter',
  anchor: { x: 508, y: 556 }, hit: { x: 388, y: 500, w: 250, h: 110 },
  members: ['loom', 'table', 'bench', 'placement', 'completion'],
  color: '#8A6C9C',
});

/** What the map draws a pin for: every region except the three inside the
 *  Quarter, plus the Quarter itself, in map order. */
export const MAP_PLACES = Object.freeze([
  ...REGIONS.filter((r) => !r.inQuarter),
  QUARTER,
]);

const BY_SLUG = new Map([...REGIONS, QUARTER].map((r) => [r.slug, r]));
export function regionBySlug(slug) { return BY_SLUG.get(slug) ?? null; }

/** The region under a world point, or null. Smaller hit boxes win when
 *  they overlap a larger one (the Quarter's buildings sit in a shared yard). */
export function regionAt(x, y) {
  let best = null;
  for (const r of MAP_PLACES) {
    const h = r.hit;
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
      if (!best || h.w * h.h < best.hit.w * best.hit.h) best = r;
    }
  }
  return best;
}

/** The six groves of the Rootwood, placed as clearings inside the wood
 *  (world pixels). Family ids come from the content's grove map. */
export const GROVE_SPOTS = Object.freeze({
  ways:     { x: 70,  y: 210 },
  measures: { x: 150, y: 190 },
  voices:   { x: 236, y: 206 },
  kin:      { x: 66,  y: 288 },
  hearts:   { x: 150, y: 300 },
  embers:   { x: 240, y: 292 },
  edge:     { x: 296, y: 250 },
});

/** The thirteen loanword lanterns along the Thicket path, in order. */
export const LANTERN_SPOTS = Object.freeze([
  { x: 40, y: 530 }, { x: 62, y: 548 }, { x: 88, y: 540 }, { x: 112, y: 556 }, { x: 128, y: 578 },
  { x: 104, y: 600 }, { x: 78, y: 612 }, { x: 52, y: 626 }, { x: 34, y: 648 }, { x: 60, y: 656 },
  { x: 90, y: 646 }, { x: 118, y: 640 }, { x: 136, y: 620 },
]);
