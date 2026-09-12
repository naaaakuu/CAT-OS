/**
 * economy.js — the rules of progression. Pure functions, no DOM, no
 * storage: stars, the four crafts, the works you build with them, the
 * day's asks, titles.
 *
 * Every mechanic here answers one question — does it make the learner
 * better at CAT while making the world more compelling? — so:
 *
 *   STARS   are performance, per run: accuracy first, then pace. They are
 *           the honest signal of CAT readiness (right, and in time).
 *
 *   CRAFTS  are four resources, and each one can only be made by one kind
 *           of thinking, so no single activity can build the valley:
 *             AMBER  word knowledge  — Meadow, Pond, Thicket, Rootwood, Terraces
 *             INK    reading         — the Reading Room
 *             THREAD verbal structure— the Loom, the Table, the Bench
 *             EMBER  mastery         — three-star runs, clean spaced revisits,
 *                                      the Gauntlet. Scarce on purpose.
 *
 *   WORKS   are the things you build. Each has a cost in crafts AND a
 *           standing that must be earned by learning first, so nothing in
 *           the valley can be bought without having read, or without
 *           having thought. Big works want three or four crafts at once.
 *
 *   LEVELS  that are not built — a tree's age, a field in bloom, the koi —
 *           are derived from mastery and can never be purchased.
 *
 * Nothing here is stored; the world derives all of it from records.
 */

/* ------------------------------------------------------------------ */
/* Stars                                                               */
/* ------------------------------------------------------------------ */

/**
 * Stars for a Reading Comprehension session.
 *   0  fewer than half right — the passage was not understood
 *   1  at least half right — completed with meaningful mistakes
 *   2  three quarters right, but over the passage's target time
 *   3  three quarters right, within time — CAT pace and CAT accuracy
 * A 100% within time also sets `flawless`.
 * @param {object} session   stored session record (score, duration_ms)
 * @param {number} targetMin the passage's estimated_time_min
 * @param {number} [paceFactor] 1 by default; the Observatory's Night Reading uses 0.8
 */
export function rcStars(session, targetMin, paceFactor = 1) {
  const acc = session.score?.total ? session.score.correct / session.score.total : 0;
  const targetMs = Math.max(60_000, (targetMin ?? 6) * 60_000 * paceFactor);
  const inTime = (session.duration_ms ?? Infinity) <= targetMs * 1.1;
  let stars = 0;
  if (acc >= 0.75 && inTime) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && inTime, accuracy: acc, inTime, targetMs };
}

/** Stars for a verbal set (PJ / PS / OOO): accuracy across the set, pace
 *  against the sum of the items' estimated seconds. */
export function verbalStars(session, targetSec) {
  const acc = session.score?.total ? session.score.correct / session.score.total : 0;
  const targetMs = Math.max(45_000, (targetSec ?? 90) * 1000);
  const inTime = (session.duration_ms ?? Infinity) <= targetMs * 1.15;
  let stars = 0;
  if (acc >= 0.75 && inTime) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && inTime, accuracy: acc, inTime, targetMs };
}

/** Stars for a vocabulary round (Meadow / Pond / Thicket): accuracy, then
 *  average answer time against the round's target per item. */
export function roundStars({ correct, total, avgMs, targetMs = 7000 }) {
  const acc = total ? correct / total : 0;
  const fast = avgMs <= targetMs;
  let stars = 0;
  if (acc >= 0.9 && fast) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && fast, accuracy: acc, inTime: fast, targetMs };
}

export const STAR_WORDS = Object.freeze(['Not yet', 'Completed', 'Accurate', 'Excellent']);

/* ------------------------------------------------------------------ */
/* The four crafts                                                     */
/* ------------------------------------------------------------------ */

export const CRAFTS = Object.freeze([
  {
    key: 'amber', name: 'Amber', plural: 'Amber',
    line: 'Words held still. Made in the Meadow, the Pond, the Thicket, the Rootwood and the Terraces.',
    from: 'Vocabulary, roots, twins and loanwords',
    color: '#E9A13B', glow: '#FFD27A',
  },
  {
    key: 'ink', name: 'Ink', plural: 'Ink',
    line: 'What a passage leaves behind when you have truly read it. Made only in the Reading Room.',
    from: 'Reading comprehension',
    color: '#3B7BD6', glow: '#8FC0FF',
  },
  {
    key: 'thread', name: 'Thread', plural: 'Thread',
    line: 'The line of an argument, pulled out whole. Made at the Loom, the Table and the Bench.',
    from: 'Para jumbles, summary, odd one out',
    color: '#9C6BC0', glow: '#D6B4F0',
  },
  {
    key: 'ember', name: 'Ember', plural: 'Ember',
    line: 'Right, and in time. An ember is only ever struck by a three-star run — the rarest craft in the valley.',
    from: 'Accuracy at CAT pace',
    color: '#D2542F', glow: '#FF9C6B',
  },
]);

export const CRAFT_KEYS = Object.freeze(CRAFTS.map((c) => c.key));
const CRAFT_BY_KEY = new Map(CRAFTS.map((c) => [c.key, c]));
export function craft(key) { return CRAFT_BY_KEY.get(key) ?? null; }

/** An empty purse. */
export function emptyBag() { return { amber: 0, ink: 0, thread: 0, ember: 0 }; }

/** a + b, as a new bag. */
export function addBag(a, b) {
  const out = emptyBag();
  for (const k of CRAFT_KEYS) out[k] = (a?.[k] ?? 0) + (b?.[k] ?? 0);
  return out;
}

/** a - b, floored at zero. */
export function subBag(a, b) {
  const out = emptyBag();
  for (const k of CRAFT_KEYS) out[k] = Math.max(0, (a?.[k] ?? 0) - (b?.[k] ?? 0));
  return out;
}

/** Total across a bag — used only for ordering and for one-number displays. */
export function bagTotal(bag) { return CRAFT_KEYS.reduce((n, k) => n + (bag?.[k] ?? 0), 0); }

/** Does the purse cover the cost? */
export function canAfford(purse, cost) { return CRAFT_KEYS.every((k) => (purse?.[k] ?? 0) >= (cost?.[k] ?? 0)); }

/** What is still missing, as a bag (zero where covered). */
export function shortfall(purse, cost) { return subBag(cost, purse); }

/** The non-zero entries of a bag, richest first, for display. */
export function bagEntries(bag) {
  return CRAFTS.filter((c) => (bag?.[c.key] ?? 0) > 0).map((c) => ({ ...c, amount: bag[c.key] }));
}

/* ------------------------------------------------------------------ */
/* Earning — what a finished run makes                                 */
/* ------------------------------------------------------------------ */

/**
 * Ember is never given for showing up. It is struck by performance:
 * one for a three-star run, one more for a flawless one.
 */
function emberFor(stars, flawless) { return (stars >= 3 ? 1 : 0) + (flawless ? 1 : 0); }

export const EARN = Object.freeze({
  /** A Reading Room passage. */
  rc: (stars, correct = 0, flawless = false) => ({
    amber: 0, ink: 14 + 10 * stars + 4 * correct, thread: 0, ember: emberFor(stars, flawless),
  }),
  /** The second look: the questions that got away, answered again. */
  secondLook: (stars, correct = 0, flawless = false) => ({
    amber: 0, ink: 10 + 8 * stars + 5 * correct, thread: 0, ember: emberFor(stars, flawless),
  }),
  /** A set at the Loom, the Table or the Bench. */
  verbal: (stars, correct = 0, flawless = false) => ({
    amber: 0, ink: 0, thread: 8 + 6 * stars + 5 * correct, ember: emberFor(stars, flawless),
  }),
  /** A set from one of the content engine's banks. Placement and
   *  completion are verbal structure (Thread); arguments are reading
   *  (Ink); the word bank is word knowledge (Amber). Smaller sets pay a
   *  little less than a whole passage or a tier of the Quarter. */
  bank: (mod, stars, correct = 0, flawless = false) => (
    mod === 'wb' ? { amber: 6 + 5 * stars + 2 * correct, ink: 0, thread: 0, ember: emberFor(stars, flawless) }
      : mod === 'cr' ? { amber: 0, ink: 8 + 6 * stars + 3 * correct, thread: 0, ember: emberFor(stars, flawless) }
        : { amber: 0, ink: 0, thread: 6 + 5 * stars + 3 * correct, ember: emberFor(stars, flawless) }),
  /** A family on the Vine Terraces (Word DNA). */
  wd: (stars, correct = 0) => ({
    amber: 8 + 5 * correct, ink: 0, thread: 4 * stars, ember: stars >= 3 ? 1 : 0,
  }),
  /** A walk in the Rootwood: growing a family, or revisiting one. */
  garden: (type, clean) => (type === 'grow'
    ? { amber: 26, ink: 0, thread: 0, ember: 0 }
    : { amber: 16, ink: 0, thread: 0, ember: clean ? 1 : 0 }),
  /** A vocabulary round in the Meadow, the Pond or the Thicket. */
  round: (stars, correct = 0, flawless = false) => ({
    amber: 6 + 6 * stars + 2 * correct, ink: 0, thread: 0, ember: emberFor(stars, flawless),
  }),
  /** A Gauntlet run in the Wilds: mixed pressure, so it pays mixed. */
  gauntlet: (stars, correct = 0) => ({
    amber: 10 + 2 * correct, ink: 8 + 4 * stars, thread: 8 + 4 * stars, ember: 1 + stars,
  }),
  /** One of the day's three asks. */
  ask: () => ({ amber: 18, ink: 8, thread: 8, ember: 0 }),
  /** All three of the day's asks, claimed: the day's seal. */
  daySeal: () => ({ amber: 30, ink: 15, thread: 15, ember: 1 }),
});

/** The craft a place pays in, for the UI's "what is made here". */
export const REGION_CRAFT = Object.freeze({
  meadow: 'amber', pond: 'amber', thicket: 'amber', rootwood: 'amber', terraces: 'amber',
  'reading-room': 'ink',
  loom: 'thread', table: 'thread', bench: 'thread',
  wilds: 'ember', hearth: 'ember',
});

/* ------------------------------------------------------------------ */
/* The works: what Amber, Ink, Thread and Ember build                   */
/* ------------------------------------------------------------------ */

/**
 * A work is a real change to the valley. Every one has:
 *   cost     a bag of crafts
 *   standing a predicate on world state — what must already be true of
 *            your learning before the valley will let you build it. This
 *            is what stops the economy becoming a grind: you cannot buy
 *            a second floor on the Reading Room without having read.
 *   after    one line, present tense, of what the valley looks like now
 *   art      the sprite that IS this thing, so the Workshop can be a
 *            shelf of small buildings rather than a page of paragraphs
 *
 * `stage` groups works into three arcs so the Workshop never shows a
 * wall of twenty: Settling, Building, Flourishing.
 */
const std = (line, test) => ({ line, test });

export const WORKS = Object.freeze([
  /* ---------------- Stage 1 · Settling ---------------- */
  {
    id: 'hearth-chimney', region: 'hearth', stage: 1, name: 'A chimney',
    art: ['cottage', { level: 2, lit: false, smoke: true }],
    line: 'Stone and a good flue, so the cottage can hold a fire.',
    after: 'Smoke rises from the Hearth on every day you practise.',
    cost: { amber: 40, ink: 0, thread: 0, ember: 0 },
    standing: std('Practise anywhere once.', (s) => s.hearth.activeDays >= 1),
    effect: { hearthLevel: 2 },
  },
  {
    id: 'meadow-path', region: 'meadow', stage: 1, name: 'A trodden path',
    art: ['pathPiece', { stone: false }],
    line: 'The grass between the fields is walked flat and edged with stones.',
    after: 'A pale path runs through the Meadow.',
    cost: { amber: 70, ink: 0, thread: 0, ember: 0 },
    standing: std('Meet 40 words in the Meadow.', (s) => s.meadow.met >= 40),
    effect: { meadowPath: true },
  },
  {
    id: 'rr-lamp', region: 'reading-room', stage: 1, name: 'A reading lamp',
    art: ['lantern', { lit: true }],
    line: 'One good lamp in the window of the Reading Room.',
    after: 'The Reading Room window is lit after dark.',
    cost: { amber: 0, ink: 60, thread: 0, ember: 0 },
    standing: std('Finish two passages.', (s) => s.reading.read >= 2),
    effect: { rrLamp: true },
  },
  {
    id: 'quarter-lamps', region: 'loom', stage: 1, name: 'Lamps in the Quarter',
    art: ['lantern', { lit: true }],
    line: 'A lamp outside each workshop door, so the craftsmen can work late.',
    after: 'The Quarter glows after dusk.',
    cost: { amber: 0, ink: 0, thread: 70, ember: 0 },
    standing: std('Solve six items in the Quarter.', (s) => s.loom.solved + s.table.solved + s.bench.solved >= 6),
    effect: { quarterLamps: true },
  },

  /* ---------------- Stage 2 · Building ---------------- */
  {
    id: 'hearth-boxes', region: 'hearth', stage: 2, name: 'Flower boxes',
    art: ['cottage', { level: 3, lit: true }],
    line: 'Boxes under both windows, planted from the Meadow.',
    after: 'Flowers hang under the Hearth’s windows.',
    cost: { amber: 120, ink: 40, thread: 0, ember: 0 },
    requires: ['hearth-chimney'],
    standing: std('Master 30 words.', (s) => s.meadow.mastered + s.pond.mastered + s.thicket.mastered >= 30),
    effect: { hearthLevel: 3 },
  },
  {
    id: 'rr-floor-2', region: 'reading-room', stage: 2, name: 'A second floor',
    art: ['tower', { floors: 2, lit: 2, night: false }],
    line: 'Another storey on the Reading Room, and shelves to fill it.',
    after: 'The Reading Room stands two floors tall.',
    cost: { amber: 60, ink: 160, thread: 0, ember: 1 },
    requires: ['rr-lamp'],
    standing: std('Read four passages at two stars or better.', (s) => s.reading.wellRead >= 4),
    effect: { floors: 2 },
  },
  {
    id: 'pond-lanterns', region: 'pond', stage: 2, name: 'Lanterns on the water',
    art: ['lantern', { lit: true }],
    line: 'Paper lanterns strung between the bridge posts of the Mirror Pond.',
    after: 'The Mirror Pond glows after dark.',
    cost: { amber: 150, ink: 0, thread: 40, ember: 2 },
    standing: std('Tell 40 twins apart for good.', (s) => s.pond.mastered >= 40),
    effect: { pondLanterns: true },
  },
  {
    id: 'thicket-path', region: 'thicket', stage: 2, name: 'The lantern path',
    art: ['pathPiece', { stone: false }],
    line: 'A cut path through the brambles, posted for lanterns.',
    after: 'A path winds through the Thicket, ready for its lanterns.',
    cost: { amber: 130, ink: 30, thread: 0, ember: 0 },
    standing: std('Light three languages.', (s) => s.thicket.lanterns >= 3),
    effect: { thicketPath: true },
  },
  {
    id: 'stone-paths', region: 'hearth', stage: 2, name: 'Stone the valley paths',
    art: ['pathPiece', { stone: true }],
    line: 'Every track between the places, laid in pale stone. The valley stops being a clearing and starts being a home.',
    after: 'Stone paths join every place in the valley.',
    cost: { amber: 140, ink: 70, thread: 70, ember: 1 },
    standing: std('Practise in four different places.', (s) => s.placesVisited >= 4),
    effect: { stonePaths: true },
  },
  {
    id: 'meadow-hives', region: 'meadow', stage: 2, name: 'Three beehives',
    art: ['hive', { seed: "art" }],
    line: 'White hives at the top of the field, and bees all summer.',
    after: 'Bees work the Meadow from the three white hives.',
    cost: { amber: 200, ink: 0, thread: 0, ember: 1 },
    requires: ['meadow-path'],
    standing: std('Bring 120 Meadow words to memory.', (s) => s.meadow.known >= 120),
    effect: { meadowHives: true },
  },
  {
    id: 'quarter-square', region: 'table', stage: 2, name: 'The Quarter’s square',
    art: ['well', {}],
    line: 'Cobbles, a bench and two market stalls between the three workshops.',
    after: 'A cobbled square with stalls sits in the Quarter.',
    cost: { amber: 80, ink: 40, thread: 200, ember: 2 },
    requires: ['quarter-lamps'],
    standing: std('Solve thirty items across the Quarter.', (s) => s.loom.solved + s.table.solved + s.bench.solved >= 30),
    effect: { quarterSquare: true },
  },
  {
    id: 'terrace-arbour', region: 'terraces', stage: 2, name: 'An arbour',
    art: ['arbour', {}],
    line: 'A wooden arbour at the top of the terraces for the vines to climb.',
    after: 'Vines climb an arbour on the Vine Terraces.',
    cost: { amber: 180, ink: 30, thread: 60, ember: 0 },
    standing: std('Finish four families on the Terraces.', (s) => s.terraces.done >= 4),
    effect: { terraceArbour: true },
  },

  /* ---------------- Stage 3 · Flourishing ---------------- */
  {
    id: 'hearth-lantern', region: 'hearth', stage: 3, name: 'A lantern by the door',
    art: ['cottage', { level: 4, lit: true }],
    line: 'Iron and glass, lit every dusk.',
    after: 'A lantern burns by the Hearth’s door each night.',
    cost: { amber: 220, ink: 90, thread: 90, ember: 3 },
    requires: ['hearth-boxes'],
    standing: std('Hold a seven-day streak.', (s) => s.hearth.streak.best >= 7),
    effect: { hearthLevel: 4 },
  },
  {
    id: 'rr-floor-3', region: 'reading-room', stage: 3, name: 'A third floor',
    art: ['tower', { floors: 3, lit: 4, night: false }],
    line: 'The Reading Room becomes a tower, and can be seen from the Wilds.',
    after: 'The Reading Room rises three floors above the valley.',
    cost: { amber: 100, ink: 320, thread: 80, ember: 3 },
    requires: ['rr-floor-2'],
    standing: std('Read ten passages at two stars or better.', (s) => s.reading.wellRead >= 10),
    effect: { floors: 3 },
  },
  {
    id: 'river-bridges', region: 'hearth', stage: 3, name: 'Stone bridges',
    art: ['stoneBridge', { w: 34 }],
    line: 'The two plank crossings replaced with arched stone.',
    after: 'Two stone bridges arch over the river.',
    cost: { amber: 200, ink: 120, thread: 120, ember: 3 },
    requires: ['stone-paths'],
    standing: std('Earn twenty stars across the valley.', (s) => s.stars >= 20),
    effect: { stoneBridges: true },
  },
  {
    id: 'pond-heron', region: 'pond', stage: 3, name: 'The heron’s reeds',
    art: ['heron', {}],
    line: 'Reeds and a shallow shelf at the pond’s north edge. Herons come to still water.',
    after: 'A heron stands in the Mirror Pond’s reeds.',
    cost: { amber: 280, ink: 60, thread: 60, ember: 2 },
    requires: ['pond-lanterns'],
    standing: std('Tell 90 twins apart for good.', (s) => s.pond.mastered >= 90),
    effect: { pondHeron: true },
  },
  {
    id: 'thicket-arch', region: 'thicket', stage: 3, name: 'The traveller’s arch',
    art: ['arch', {}],
    line: 'A stone arch at the Thicket’s mouth, carved with every tongue you have learned from.',
    after: 'A carved arch stands at the mouth of the Thicket.',
    cost: { amber: 320, ink: 80, thread: 80, ember: 3 },
    requires: ['thicket-path'],
    standing: std('Light eight languages.', (s) => s.thicket.lanterns >= 8),
    effect: { thicketArch: true },
  },
  {
    id: 'rootwood-shrine', region: 'rootwood', stage: 3, name: 'The root shrine',
    art: ['shrine', { lit: true }],
    line: 'A low stone shrine in the oldest clearing, where the first roots were found.',
    after: 'A shrine stands among the oldest roots.',
    cost: { amber: 300, ink: 60, thread: 60, ember: 4 },
    standing: std('Grow twelve root families.', (s) => s.rootwood.grownCount >= 12),
    effect: { rootShrine: true },
  },
  {
    id: 'wilds-lanterns', region: 'wilds', stage: 3, name: 'Lanterns on the road out',
    art: ['signpost', { arrows: 2 }],
    line: 'The road beyond the valley, lit — and your Gauntlet records keep their splits.',
    after: 'The road out of the valley is lit all the way to the ridge.',
    cost: { amber: 200, ink: 160, thread: 160, ember: 5 },
    standing: std('Finish three Gauntlet runs.', (s) => s.wilds.runs >= 3),
    effect: { wildsLanterns: true },
  },
  {
    id: 'observatory', region: 'reading-room', stage: 3, name: 'The Observatory',
    art: ['tower', { floors: 3, lit: 5, observatory: true, night: false }],
    line: 'A copper dome above the third floor — and Night Reading, where passages run at a tighter clock for the flawless mark.',
    after: 'A copper dome crowns the Reading Room. Night Reading is open.',
    cost: { amber: 240, ink: 480, thread: 200, ember: 8 },
    requires: ['rr-floor-3'],
    standing: std('Read sixteen passages well, six of them at three stars.', (s) => s.reading.wellRead >= 16 && s.reading.threeStar >= 6),
    effect: { observatory: true },
  },
  {
    id: 'hearth-vane', region: 'hearth', stage: 3, name: 'Ivy and a weathervane',
    art: ['cottage', { level: 5, lit: true, smoke: true }],
    line: 'The cottage becomes the oldest house in the valley.',
    after: 'Ivy covers the Hearth, and a weathervane turns on its ridge.',
    cost: { amber: 400, ink: 200, thread: 200, ember: 6 },
    requires: ['hearth-lantern'],
    standing: std('Reach four hundred stars’ worth of work — fifty stars.', (s) => s.stars >= 50),
    effect: { hearthLevel: 5 },
  },
]);


/* ------------------------------------------------------------------ */
/* Beyond: the works that never run out                                */
/* ------------------------------------------------------------------ */

/**
 * CAT preparation does not finish, so neither does the valley.
 *
 * The twenty-one works above are finite on purpose: they are the arc of
 * a place being settled. These are not. Each one can be built again and
 * again; every build costs more and asks more of the learner's record,
 * and the valley answers by growing in a direction that has no end —
 * more neighbours, and more road.
 *
 * A repeatable work is a template. `instance(n)` returns the n-th build
 * as an ordinary work, so everything downstream — the Workshop, the
 * purse, the build veil, the map — treats it exactly like the others.
 */

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
function ordinal(n) { return ORDINALS[n - 1] ?? `${n}th`; }

/** The places the road out goes, in order. Adding a name adds a work. */
export const WAYMARKS = Object.freeze([
  { name: 'the Ridge', line: 'The first rise out of the valley. From the top you can see the tower.' },
  { name: 'Copperbeck', line: 'A mill town on fast water, two days south.' },
  { name: 'the Long Water', line: 'A lake so still the mountains are in it twice.' },
  { name: 'Anselm’s Bridge', line: 'Five arches, and nobody remembers who Anselm was.' },
  { name: 'the Winter Road', line: 'It is only open half the year, and it goes somewhere worth it.' },
  { name: 'Haldenmoor', line: 'Heather to the horizon, and one lit window.' },
  { name: 'the Old Library', line: 'Further than anyone in the valley has been.' },
]);

export const ENDLESS_WORKS = Object.freeze([
  {
    id: 'hamlet-house', region: 'hearth', stage: 4, kind: 'endless',
    art: ['house', { level: 2, lit: true, seed: 'work' }],
    name: (n) => (n === 1 ? 'A house for a neighbour' : `A ${ordinal(n)} neighbour`),
    line: (n) => (n === 1
      ? 'Someone has asked to settle here. A roof, two windows and a chimney.'
      : `Word has got round. A ${ordinal(n)} family would like to live in your valley.`),
    after: (n) => `${n === 1 ? 'A neighbour' : `A ${ordinal(n)} family`} has moved into the hamlet.`,
    cost: (n) => ({ amber: 160 + (n - 1) * 90, ink: 80 + (n - 1) * 45, thread: 80 + (n - 1) * 45, ember: 2 + n }),
    standing: (n) => ({
      line: `Earn ${30 + (n - 1) * 22} stars.`,
      test: (s) => s.stars >= 30 + (n - 1) * 22,
    }),
    effect: (n) => ({ extraHouses: n }),
  },
  {
    id: 'waymark', region: 'wilds', stage: 4, kind: 'endless',
    art: ['signpost', { arrows: 2 }],
    name: (n) => `The road to ${WAYMARKS[(n - 1) % WAYMARKS.length].name}`,
    line: (n) => `${WAYMARKS[(n - 1) % WAYMARKS.length].line} Post the road and a waymark, and the valley stops being the whole of the world.`,
    after: (n) => `The road out runs as far as ${WAYMARKS[(n - 1) % WAYMARKS.length].name}.`,
    cost: (n) => ({ amber: 120 + (n - 1) * 80, ink: 120 + (n - 1) * 80, thread: 120 + (n - 1) * 80, ember: 3 + n * 2 }),
    standing: (n) => ({
      line: `Read ${6 + (n - 1) * 5} passages at three stars.`,
      test: (s) => s.reading.threeStar >= 6 + (n - 1) * 5,
    }),
    effect: (n) => ({ waymarks: n }),
  },
  {
    id: 'planting', region: 'rootwood', stage: 4, kind: 'endless',
    art: ['tree', { stage: 'mature', seed: 'work-plant', season: 'summer' }],
    name: (n) => (n === 1 ? 'A planting' : `A ${ordinal(n)} planting`),
    line: () => 'A stand of young trees along the wood’s edge, set out in rows and left to it.',
    after: (n) => `${n === 1 ? 'A new stand' : `A ${ordinal(n)} stand`} of trees is growing at the wood's edge.`,
    cost: (n) => ({ amber: 220 + (n - 1) * 120, ink: 40, thread: 40, ember: 1 + n }),
    standing: (n) => ({
      line: `Hold ${120 + (n - 1) * 90} words for good.`,
      test: (s) => s.meadow.mastered + s.pond.mastered + s.thicket.mastered >= 120 + (n - 1) * 90,
    }),
    effect: (n) => ({ plantings: n }),
  },
]);

const ENDLESS_BY_ID = new Map(ENDLESS_WORKS.map((w) => [w.id, w]));

/** How many of a repeatable work are already standing. */
export function endlessCount(builtIds, id) {
  const p = `endless:${id}:`;
  let n = 0;
  for (const b of builtIds) if (String(b).startsWith(p)) n += 1;
  return n;
}

/** The n-th build of a repeatable work, as an ordinary work. */
export function endlessInstance(tpl, n) {
  const standing = tpl.standing(n);
  return {
    id: `endless:${tpl.id}:${n}`,
    region: tpl.region, stage: tpl.stage, kind: 'endless', template: tpl.id, nth: n,
    art: tpl.art,
    name: tpl.name(n),
    line: tpl.line(n),
    after: tpl.after(n),
    cost: tpl.cost(n),
    standing,
    effect: tpl.effect(n),
    requires: [],
  };
}

/** Resolve an id that may be a repeatable build. */
export function endlessById(id) {
  const m = /^endless:([a-z-]+):(\d+)$/.exec(String(id ?? ''));
  if (!m) return null;
  const tpl = ENDLESS_BY_ID.get(m[1]);
  return tpl ? endlessInstance(tpl, Number(m[2])) : null;
}

export const WORK_STAGES = Object.freeze([
  { n: 1, name: 'Settling', line: 'The first marks you leave on the valley.' },
  { n: 2, name: 'Building', line: 'Paths, floors and lanterns. The valley starts to hold together.' },
  { n: 3, name: 'Flourishing', line: 'The works that need every craft at once.' },
  { n: 4, name: 'Beyond', line: 'These never run out. Every one costs more and asks more than the last.' },
]);

const WORK_BY_ID = new Map(WORKS.map((w) => [w.id, w]));
export function workById(id) { return WORK_BY_ID.get(id) ?? endlessById(id); }

/**
 * Every work, annotated against the learner's world:
 *   built      already standing
 *   blocked    a prerequisite work is missing
 *   standing   the learning condition is met
 *   affordable the purse covers it
 *   ready      standing && affordable && !blocked && !built
 * Sorted so what can be built now comes first.
 */
export function surveyWorks(state) {
  const built = new Set(state.builds ?? []);
  const purse = state.purse ?? emptyBag();
  // The finite arc, and then the next one of each thing the valley can
  // always take more of. Only the NEXT instance is ever offered, so
  // "Beyond" is three cards, not an infinite scroll.
  const all = [...WORKS];
  for (const tpl of ENDLESS_WORKS) {
    const n = endlessCount(state.builds ?? [], tpl.id);
    for (let i = 1; i <= n; i += 1) all.push(endlessInstance(tpl, i));
    all.push(endlessInstance(tpl, n + 1));
  }
  return all.map((w) => {
    const reqs = w.requires ?? [];
    const blocked = reqs.filter((r) => !built.has(r));
    const isBuilt = built.has(w.id);
    let ok = false;
    try { ok = !!w.standing.test(state); } catch { ok = false; }
    const affordable = canAfford(purse, w.cost);
    return {
      ...w,
      built: isBuilt,
      blockedBy: blocked.map((r) => WORK_BY_ID.get(r)?.name ?? r),
      hasStanding: ok,
      affordable,
      missing: shortfall(purse, w.cost),
      ready: !isBuilt && ok && affordable && blocked.length === 0,
    };
  });
}

/** The one work the valley should be pointing at: buildable now, else the
 *  nearest thing worth working towards. */
export function nextWork(state) {
  // "Beyond" is never what the valley points at while a settled work is
  // still open: an endless work is somewhere to put a surplus, not the
  // next thing a learner should aim at.
  const all = surveyWorks(state).filter((w) => !w.built && w.blockedBy.length === 0 && w.kind !== 'endless');
  const ready = all.filter((w) => w.ready);
  if (ready.length) return ready.sort((a, b) => a.stage - b.stage || bagTotal(a.cost) - bagTotal(b.cost))[0];
  const standing = all.filter((w) => w.hasStanding);
  if (standing.length) return standing.sort((a, b) => bagTotal(a.missing) - bagTotal(b.missing))[0];
  return all.sort((a, b) => a.stage - b.stage || bagTotal(a.cost) - bagTotal(b.cost))[0] ?? null;
}

/* ------------------------------------------------------------------ */
/* Titles                                                             */
/* ------------------------------------------------------------------ */

const TITLES = [[1, 'Newcomer'], [2, 'Reader'], [4, 'Word-gatherer'], [6, 'Root-keeper'], [9, 'Editor'], [12, 'Scholar'], [16, 'Lexicographer'], [20, 'Sage of the Valley']];
export function titleFor(level) {
  let t = TITLES[0][1];
  for (const [lv, name] of TITLES) if (level >= lv) t = name;
  return t;
}

/* ------------------------------------------------------------------ */
/* The day's asks                                                      */
/* ------------------------------------------------------------------ */

/**
 * The pool the day draws from. `progress(today)` reads a summary of
 * today's activity (see state.js `todaySummary`) and returns {done, goal}.
 */
export const QUEST_POOL = Object.freeze([
  { id: 'read-2', region: 'reading-room', title: 'Read one passage well', line: 'Finish a passage in the Reading Room with two stars or better.', progress: (d) => ({ done: Math.min(1, d.rcTwoStar), goal: 1 }) },
  { id: 'read-any', region: 'reading-room', title: 'Read a passage', line: 'Finish any passage in the Reading Room.', progress: (d) => ({ done: Math.min(1, d.rc), goal: 1 }) },
  { id: 'bloom-20', region: 'meadow', title: 'Bloom twenty words', line: 'Answer twenty Meadow words correctly.', progress: (d) => ({ done: Math.min(20, d.lexCorrect.meadow), goal: 20 }) },
  { id: 'bloom-round', region: 'meadow', title: 'Tend a field', line: 'Finish a Meadow round with two stars or better.', progress: (d) => ({ done: Math.min(1, d.roundTwoStar.meadow), goal: 1 }) },
  { id: 'roots-2', region: 'rootwood', title: 'Tend two root families', line: 'Grow or revisit two families in the Rootwood.', progress: (d) => ({ done: Math.min(2, d.garden), goal: 2 }) },
  { id: 'roots-1', region: 'rootwood', title: 'Walk into the wood', line: 'Grow or revisit one root family.', progress: (d) => ({ done: Math.min(1, d.garden), goal: 1 }) },
  { id: 'twins-10', region: 'pond', title: 'Tell ten twins apart', line: 'Answer ten confusable-word items correctly at the Mirror Pond.', progress: (d) => ({ done: Math.min(10, d.lexCorrect.pond), goal: 10 }) },
  { id: 'loan-8', region: 'thicket', title: 'Light the thicket', line: 'Answer eight loanwords correctly in the Thicket.', progress: (d) => ({ done: Math.min(8, d.lexCorrect.thicket), goal: 8 }) },
  { id: 'verbal-2', region: 'loom', title: 'Two verbal crafts', line: 'Solve two items at the Loom, the Table or the Bench.', progress: (d) => ({ done: Math.min(2, d.verbalCorrect), goal: 2 }) },
  { id: 'places-2', region: 'hearth', title: 'Two places in one day', line: 'Practise in two different places today.', progress: (d) => ({ done: Math.min(2, d.regions.size), goal: 2 }) },
  { id: 'three-stars', region: 'hearth', title: 'Strike an ember', line: 'Earn a three-star result anywhere in the valley.', progress: (d) => ({ done: Math.min(1, d.threeStars), goal: 1 }) },
  { id: 'terrace-1', region: 'terraces', title: 'Climb a terrace', line: 'Complete one family on the Vine Terraces.', progress: (d) => ({ done: Math.min(1, d.wd), goal: 1 }) },
]);

/** Three asks for a date: one vocabulary, one reading/verbal, one roots
 *  or places — chosen deterministically from the date so they hold all day. */
export function questsForDate(dateKey) {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i += 1) { h ^= dateKey.charCodeAt(i); h = Math.imul(h, 16777619); }
  const next = () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const groups = [
    QUEST_POOL.filter((q) => ['meadow', 'pond', 'thicket'].includes(q.region)),
    QUEST_POOL.filter((q) => ['reading-room', 'loom'].includes(q.region)),
    QUEST_POOL.filter((q) => ['rootwood', 'hearth', 'terraces'].includes(q.region)),
  ];
  return groups.map((g) => g[Math.floor(next() * g.length)]);
}

/** Region building level from a count of cleared items, 0–4. */
export function levelFromCleared(cleared, perLevel = 4) { return Math.max(0, Math.min(4, Math.floor(cleared / perLevel))); }
