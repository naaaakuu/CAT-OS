/**
 * defs.js — the VARC village, as data.
 *
 * Everything the village is made of is declared here and nowhere else:
 * the goods and the chain that makes them, the buildings and their levels,
 * the people who work in them, the neighbours who live here and post
 * orders, the plots of land that can be opened, and the shapes of the
 * stages the village grows through. The map painter, the screens and the
 * economy all read this one file, so a second world (a Data Interpretation
 * harbour, a Quant quarry) is another file shaped like this one.
 *
 * THE CHAIN, in one breath:
 *   learning makes a RAW good (Pages, Seeds, Roots, Thread) that goes to
 *   the building that wanted it → the worker there CRAFTS it into a MADE
 *   good (Books, Blooms, Ink, Cloth) you can see on the shelf → you collect
 *   it → a neighbour with a reason is waiting for it on the order board →
 *   delivering pays COINS → coins build, and the village grows.
 *
 * Coordinates are world units on a 1200 × 1200 map. `at` is where a
 * building's front wall meets the ground, at its middle.
 */

import { PAL } from './brush.js';

export const WORLD = Object.freeze({ id: 'varc', name: 'the village', W: 1200, H: 1200, home: { x: 600, y: 650 } });

/* ------------------------------------------------------------------ */
/* Goods and coins                                                     */
/* ------------------------------------------------------------------ */

/**
 * Eight goods in four chains. A raw good is what the learner's thinking
 * makes — one per star, one more for a flawless run — and it goes straight
 * to its building's queue. A made good is what the worker there turns it
 * into, one for one, on a short clock; only made goods are traded.
 */
export const GOODS = Object.freeze([
  { key: 'pages', name: 'Pages', one: 'Page', glyph: 'page', kind: 'raw', building: 'reading', color: '#C9A961', line: 'Made by reading a passage well. Ada binds them into Books.' },
  { key: 'books', name: 'Books', one: 'Book', glyph: 'book', kind: 'made', building: 'reading', from: 'pages', color: PAL.book, price: 26, line: 'Bound at the Reading House from the Pages you read.' },
  { key: 'seeds', name: 'Seeds', one: 'Seed', glyph: 'seed', kind: 'raw', building: 'garden', color: PAL.seed, line: 'Made by learning words. Bo grows them into Blooms.' },
  { key: 'blooms', name: 'Blooms', one: 'Bloom', glyph: 'bloom', kind: 'made', building: 'garden', from: 'seeds', color: PAL.bloom, price: 18, line: 'Grown in the Word Garden from the Seeds you learned.' },
  { key: 'roots', name: 'Roots', one: 'Root', glyph: 'root', kind: 'raw', building: 'roots', color: PAL.root, line: 'Made by taking words apart. Ines boils them into Ink.' },
  { key: 'ink', name: 'Ink', one: 'Ink', glyph: 'ink', kind: 'made', building: 'roots', from: 'roots', color: PAL.ink, price: 24, line: 'Boiled at the Root Workshop from the Roots you dug.' },
  { key: 'thread', name: 'Thread', one: 'Thread', glyph: 'thread', kind: 'raw', building: 'loom', color: PAL.thread, line: 'Made by putting paragraphs in order. Nell weaves it into Cloth.' },
  { key: 'cloth', name: 'Cloth', one: 'Cloth', glyph: 'cloth', kind: 'made', building: 'loom', from: 'thread', color: PAL.cloth, price: 28, line: 'Woven at the Loom from the Thread you spun.' },
]);
export const GOOD_KEYS = Object.freeze(GOODS.map((g) => g.key));
export const RAW_KEYS = Object.freeze(GOODS.filter((g) => g.kind === 'raw').map((g) => g.key));
export const MADE_KEYS = Object.freeze(GOODS.filter((g) => g.kind === 'made').map((g) => g.key));
const GOOD_BY_KEY = new Map(GOODS.map((g) => [g.key, g]));
export function good(key) { return GOOD_BY_KEY.get(key) ?? null; }
/** The made good a raw good becomes, or null. */
export function madeFrom(rawKey) { return GOODS.find((g) => g.from === rawKey) ?? null; }
export const COINS = Object.freeze({ key: 'coins', name: 'Coins', one: 'Coin', glyph: 'coin', color: PAL.coin });

/* ------------------------------------------------------------------ */
/* The people                                                          */
/* ------------------------------------------------------------------ */

/** The workers: one per building, each with a look, a job, and things to say. */
export const CHARACTERS = Object.freeze({
  wick: { id: 'wick', name: 'Wick', role: 'the cat who keeps the lamps', building: 'hearth' },
  ada: {
    id: 'ada', name: 'Ada', role: 'the bookbinder', building: 'reading',
    look: { skin: '#F1C7A2', hair: '#4A2E1F', style: 'bun', top: '#D9603F', bottom: '#4E4A5C', apron: '#F7E9CB', prop: 'book', eyes: '#3A5A2A' },
    idle: ['A passage is a small argument. Find the point and the rest falls in.', 'Read it once, closely. Twice is for checking.', 'The clock is part of the reading.'],
    working: ['Binding. Give me a minute.', 'Pages in, Books out. That is the whole trade.'],
    ready: ['Bound and on the shelf. Take them.', 'Your Books are ready.'],
    asks: ['Bring me Pages and I will bind them.', 'The shelf is bare. Read something.'],
  },
  bo: {
    id: 'bo', name: 'Bo', role: 'the gardener', building: 'garden',
    look: { skin: '#C68863', hair: '#2E2A2A', style: 'short', top: '#5FA36B', bottom: '#5B4636', hat: 'straw', prop: 'can', eyes: '#2A2A2A' },
    idle: ['Every word that sticks is a flower that stays.', 'Twins first. The look-alikes are where marks go missing.', 'Twelve words, then look up. That is a round.'],
    working: ['Growing. They need a minute and some water.', 'Seeds go in, Blooms come up.'],
    ready: ['Blooms are up. Cut them before they drop.', 'Your Blooms are ready.'],
    asks: ['Bring me Seeds and I will grow them.', 'The beds are empty. Learn a few words.'],
  },
  ines: {
    id: 'ines', name: 'Ines', role: 'the ink-maker', building: 'roots',
    look: { skin: '#E8B48F', hair: '#B9B0A6', style: 'bun', top: '#5C8FBB', bottom: '#4E4A5C', glasses: true, prop: 'mortar', eyes: '#3A4A6A' },
    idle: ['Take a word apart and a dozen open.', 'Prefix, root, suffix. Then the sentence settles it.', 'Ten roots, a thousand words.'],
    working: ['Boiling down. Ink takes patience.', 'Roots in, Ink out. Do not rush it.'],
    ready: ['Bottled. Take the Ink before it thickens.', 'Your Ink is ready.'],
    asks: ['Bring me Roots and I will make Ink.', 'The kettle is cold. Dig a root family.'],
  },
  nell: {
    id: 'nell', name: 'Nell', role: 'the weaver', building: 'loom',
    look: { skin: '#8D5B3B', hair: '#1E1B1B', style: 'curly', top: '#8E6DB8', bottom: '#3A3846', prop: 'shuttle', eyes: '#2A2A2A' },
    idle: ['Sentences in the wrong order. Find the thread.', 'The pronoun needs an owner. Start there.', 'One sentence never belonged. It shows itself.'],
    working: ['Weaving. The shuttle does not like to be hurried.', 'Thread in, Cloth out.'],
    ready: ['Off the loom and folded. Take it.', 'Your Cloth is ready.'],
    asks: ['Bring me Thread and I will weave it.', 'The loom is idle. Put a paragraph in order.'],
  },
  rafi: {
    id: 'rafi', name: 'Rafi', role: 'the merchant', building: 'market',
    look: { skin: '#D19A73', hair: '#7A4A2A', style: 'short', top: '#F6C445', bottom: '#4E4A5C', hat: 'cap', prop: 'basket', eyes: '#3A2F2A' },
    idle: ['More orders on the board, better prices. That is what a market does.', 'Every order is somebody in the village.', 'Deliver, and the board fills again.'],
    working: [], ready: [], asks: [],
  },
});

/**
 * The neighbours: people with a house, a job and reasons. Every order on
 * the board is one of them asking for a made good for something in their
 * life. The first, Mira, lives here from the first minute; the rest move
 * in as their houses are built, in this order.
 */
export const NEIGHBOURS = Object.freeze([
  {
    id: 'mira', name: 'Mira', role: 'the schoolteacher',
    look: { skin: '#B57A55', hair: '#2B2222', style: 'long', top: '#4EA7A0', bottom: '#3A3846', glasses: true, prop: 'satchel', eyes: '#2A2A2A' },
    reasons: { books: ['for the schoolhouse shelf', 'for Friday’s reading lesson', 'as a prize for the class'], ink: ['for the slates', 'for the school register'], blooms: ['for the classroom window'], cloth: ['for the school’s curtains'] },
    greet: 'Mira teaches at the schoolhouse across the water. She needs Books.',
  },
  {
    id: 'tomas', name: 'Old Tomas', role: 'the ferryman',
    look: { skin: '#F5CBA7', hair: '#D8D3CC', style: 'bald', beard: true, top: '#7C8797', bottom: '#4E4A5C', hat: 'cap', eyes: '#4A5A7A' },
    reasons: { cloth: ['for a new sail', 'to patch the ferry’s awning'], books: ['for the ferry timetable', 'to read on the crossing'], ink: ['for the tide book'], blooms: ['for the ferry’s prow'] },
    greet: 'Tomas runs the ferry. His sail is more patch than sail.',
  },
  {
    id: 'hal', name: 'Hal', role: 'the innkeeper',
    look: { skin: '#E8B48F', hair: '#7A4A2A', style: 'short', top: '#E08B6A', bottom: '#5B4636', apron: '#F7E9CB', eyes: '#3A2F2A' },
    reasons: { blooms: ['for the inn’s tables', 'for a wedding at the inn'], books: ['for the guests’ shelf'], cloth: ['for the inn’s tablecloths'], ink: ['for the guest book'] },
    greet: 'Hal keeps the inn, and the inn is always short of something.',
  },
  {
    id: 'priya', name: 'Priya', role: 'the apothecary',
    look: { skin: '#D19A73', hair: '#1E1B1B', style: 'braid', top: '#D9603F', bottom: '#3A3846', hat: 'scarf', eyes: '#2A2A2A' },
    reasons: { ink: ['for the remedy labels', 'for the herbal'], blooms: ['for the tinctures'], books: ['for the herbal'], cloth: ['for bandages'] },
    greet: 'Priya makes remedies, and labels every one of them.',
  },
  {
    id: 'wren', name: 'Wren', role: 'the letter-carrier',
    look: { skin: '#F1C7A2', hair: '#D9B26B', style: 'bob', top: '#5C8FBB', bottom: '#4E4A5C', hat: 'beret', prop: 'satchel', eyes: '#3A5A2A' },
    reasons: { ink: ['for the letters', 'for the addresses'], cloth: ['for a winter coat', 'for the mailbag'], books: ['for the almanac'], blooms: ['for a letter that needs one'] },
    greet: 'Wren carries the letters. Everyone here writes more than you would think.',
  },
  {
    id: 'anselm', name: 'Anselm', role: 'the bridge-keeper',
    look: { skin: '#B57A55', hair: '#4A2E1F', style: 'short', beard: true, top: '#4EA7A0', bottom: '#4E4A5C', hat: 'hood', eyes: '#2A2A2A' },
    reasons: { cloth: ['for the festival flags', 'for the bridge banner'], books: ['for the bridge ledger'], ink: ['for the toll book'], blooms: ['for the bridge posts'] },
    greet: 'Anselm keeps the bridge. Nobody remembers who built it.',
  },
  {
    id: 'dara', name: 'Dara', role: 'the baker',
    look: { skin: '#C68863', hair: '#C2452F', style: 'bun', top: '#F6C445', bottom: '#5B4636', apron: '#FBF5E8', eyes: '#3A2F2A' },
    reasons: { blooms: ['for a wedding cake'], cloth: ['for aprons'], books: ['for the recipes'], ink: ['for the price board'] },
    greet: 'Dara bakes. The whole village smells of it by seven.',
  },
  {
    id: 'kit', name: 'Kit', role: 'the fisher',
    look: { skin: '#8D5B3B', hair: '#2B2222', style: 'curly', top: '#7C8797', bottom: '#3A3846', prop: 'rod', eyes: '#2A2A2A' },
    reasons: { cloth: ['for a net', 'for a new sail'], blooms: ['for a grave by the wood'], books: ['for the long winter'], ink: ['for the catch book'] },
    greet: 'Kit fishes the pond and the river, and knows every fish by name.',
  },
  {
    id: 'sunniva', name: 'Sunniva', role: 'the beekeeper',
    look: { skin: '#F5CBA7', hair: '#B86F3A', style: 'long', top: '#E5B84A', bottom: '#4E4A5C', hat: 'straw', eyes: '#3A5A2A' },
    reasons: { blooms: ['for the hives', 'for the honey stall'], cloth: ['for the veil'], books: ['for the bee book'], ink: ['for the jar labels'] },
    greet: 'Sunniva keeps bees, which means she keeps flowers.',
  },
  {
    id: 'oren', name: 'Oren', role: 'the carpenter',
    look: { skin: '#D19A73', hair: '#4A2E1F', style: 'short', top: '#B57B48', bottom: '#4E4A5C', apron: '#7F5331', prop: 'hammer', eyes: '#3A2F2A' },
    reasons: { cloth: ['for the workshop awning'], books: ['for the plans'], ink: ['for the measurements'], blooms: ['for his mother'] },
    greet: 'Oren builds. Half the roofs here are his.',
  },
]);
export function neighbourById(id) { return NEIGHBOURS.find((n) => n.id === id) ?? null; }

/* ------------------------------------------------------------------ */
/* Buildings                                                           */
/* ------------------------------------------------------------------ */

const std = (line, test) => ({ line, test });
const H3 = 3 * 3600e3, H2 = 2 * 3600e3;

/**
 * A building has levels. Level 1 is what stands when the building is
 * built (`unlock` is what it takes to build it; the Hearth and the
 * Reading House are there from the first minute). Every later level has
 * a coin cost, sometimes goods, and a standing — something the learner's
 * record must already show — so nothing in the village is bought without
 * having been earned.
 *
 * `craft` is the building's clock: seconds per unit at each level, and a
 * faster first unit so the first loop never waits. `effect.helper` is
 * automation: once the learner has proved the skill, the worker makes a
 * raw unit on their own now and then, up to a cap of uncollected goods.
 * It is never enough to replace learning, and never offered before the
 * mastery that justifies it.
 */
export const BUILDINGS = Object.freeze([
  {
    id: 'hearth', name: 'The Hearth', kind: 'home', character: 'wick', art: 'hearth',
    at: { x: 600, y: 650 }, hit: { w: 132, h: 112 },
    line: 'Home. Wick keeps the lamps; you keep the rest. The order board stands by the door.',
    levels: [
      { n: 1, line: 'A small house with a good roof.' },
      { n: 2, name: 'A chimney', cost: { coins: 90 }, standing: std('Deliver 2 orders.', (v) => v.ordersDone >= 2), line: 'Stone and a good flue, so the house can hold a fire.', after: 'Smoke rises from the Hearth on every day you practise.' },
      { n: 3, name: 'Flower boxes', cost: { coins: 240, blooms: 3 }, standing: std('Master 30 words.', (v, s) => s.meadow.mastered + s.pond.mastered + s.thicket.mastered >= 30), line: 'Boxes under the windows, planted from the Word Garden.', after: 'Flowers hang under the Hearth’s windows, and a dog has moved in.' },
      { n: 4, name: 'A lamp by the door', cost: { coins: 520, cloth: 3, books: 3 }, standing: std('Hold a seven-day streak.', (v, s) => s.hearth.streak.best >= 7), line: 'Iron and glass, lit every dusk.', after: 'A lantern burns by the Hearth’s door each night.' },
      { n: 5, name: 'The oldest house', cost: { coins: 1200, books: 6, blooms: 6, ink: 6, cloth: 6 }, standing: std('Earn fifty stars.', (v, s) => s.stars >= 50), line: 'A dormer, a weathervane, and ivy.', after: 'The Hearth is the oldest house in the village, and looks it.' },
    ],
  },
  {
    id: 'reading', name: 'The Reading House', kind: 'learn', character: 'ada', art: 'reading', raw: 'pages', good: 'books',
    skill: 'Reading comprehension', place: 'reading-room',
    at: { x: 790, y: 470 }, hit: { w: 156, h: 124 },
    line: 'CAT passages against the clock make Pages. Ada binds Pages into Books.',
    activity: { label: 'Read a passage', verb: 'Read a passage', route: '#/world/place/reading-room', minutes: 5, makes: 'pages', brief: 'One short CAT passage, three questions, about five minutes.' },
    craft: { secs: [40, 30, 20, 12], firstSecs: 9 },
    levels: [
      { n: 1, line: 'A small house with two big windows and a lamp.' },
      { n: 2, name: 'A second floor', cost: { coins: 180, books: 4 }, standing: std('Read 3 passages at two stars or better.', (v, s) => s.reading.wellRead >= 3), line: 'Another storey, and shelves to fill it. Ada binds faster, and orders for Books pay more.', after: 'The Reading House stands two floors tall.', effect: { pay: 1.1 } },
      { n: 3, name: 'The reading tower', cost: { coins: 560, books: 8, ink: 2 }, standing: std('Read 8 passages well, 3 of them at three stars.', (v, s) => s.reading.wellRead >= 8 && s.reading.threeStar >= 3), line: 'A tower beside the house. Ada reads on her own now: a Page every three hours, while the shelf has room.', after: 'A tower rises beside the Reading House, and Ada reads on her own.', effect: { pay: 1.2, helper: { every: H3, cap: 3 } } },
      { n: 4, name: 'The Observatory', cost: { coins: 1500, books: 14, cloth: 4, ink: 4 }, standing: std('Read 16 passages well, 6 at three stars.', (v, s) => s.reading.wellRead >= 16 && s.reading.threeStar >= 6), line: 'A copper dome, and Night Reading: passages at a tighter clock for the flawless mark.', after: 'A copper dome crowns the tower. Night Reading is open.', effect: { pay: 1.3, helper: { every: H2, cap: 6 }, nightReading: true } },
    ],
  },
  {
    id: 'garden', name: 'The Word Garden', kind: 'learn', character: 'bo', art: 'garden', raw: 'seeds', good: 'blooms',
    skill: 'Vocabulary', place: 'meadow',
    at: { x: 400, y: 560 }, hit: { w: 136, h: 104 },
    line: 'The CAT word lists, the look-alike twins, the borrowed words: every word you keep is a Seed. Bo grows Seeds into Blooms.',
    activity: { label: 'Take a word round', verb: 'Take a word round', route: '#/round/meadow', minutes: 2, makes: 'seeds', brief: 'Twelve words, some inside a real sentence, about two minutes.' },
    craft: { secs: [35, 26, 18, 10], firstSecs: 9 },
    unlock: { cost: { coins: 40 }, standing: std('Deliver your first order.', (v) => v.ordersDone >= 1), line: 'Bo has asked for a patch of ground and a shed.' },
    levels: [
      { n: 1, line: 'A shed and two beds.' },
      { n: 2, name: 'A glasshouse', cost: { coins: 160, blooms: 4 }, standing: std('Bring 60 words to memory.', (v, s) => s.meadow.known + s.pond.known + s.thicket.known >= 60), line: 'Glass and white timber. Bo grows faster, and orders for Blooms pay more.', after: 'A glasshouse stands in the Word Garden.', effect: { pay: 1.1 } },
      { n: 3, name: 'The hives', cost: { coins: 480, blooms: 8, books: 2 }, standing: std('Hold 120 words for good.', (v, s) => s.meadow.mastered + s.pond.mastered + s.thicket.mastered >= 120), line: 'Bees work the beds. Bo plants a Seed every three hours on his own, while the shelf has room.', after: 'Bees work the Word Garden, and Bo tends it alone.', effect: { pay: 1.2, helper: { every: H3, cap: 3 } } },
      { n: 4, name: 'The long garden', cost: { coins: 1300, blooms: 14, ink: 4, cloth: 4 }, standing: std('Hold 300 words for good.', (v, s) => s.meadow.mastered + s.pond.mastered + s.thicket.mastered >= 300), line: 'Beds to the river, and a banner on the glasshouse.', after: 'The Word Garden runs all the way to the water.', effect: { pay: 1.3, helper: { every: H2, cap: 6 } } },
    ],
  },
  {
    id: 'roots', name: 'The Root Workshop', kind: 'learn', character: 'ines', art: 'roots', raw: 'roots', good: 'ink',
    skill: 'Roots & word parts', place: 'rootwood',
    at: { x: 470, y: 330 }, hit: { w: 140, h: 114 },
    line: 'Latin and Greek roots, prefixes and suffixes: every family you take apart is a Root. Ines boils Roots into Ink.',
    activity: { label: 'Grow a root family', verb: 'Dig a root family', route: '#/world/place/rootwood', minutes: 4, makes: 'roots', brief: 'One root, its family of words, about four minutes.' },
    craft: { secs: [45, 32, 22, 14], firstSecs: 10 },
    unlock: { cost: { coins: 120, blooms: 2 }, standing: std('Deliver 2 orders.', (v) => v.ordersDone >= 2), line: 'Ines wants a stone workshop by the wood.' },
    levels: [
      { n: 1, line: 'A stone workshop with a round window.' },
      { n: 2, name: 'A chimney and a kiln', cost: { coins: 200, ink: 4 }, standing: std('Grow 6 root families.', (v, s) => s.rootwood.grownCount >= 6), line: 'Ines boils faster, and orders for Ink pay more.', after: 'Smoke rises from the Root Workshop.', effect: { pay: 1.1 } },
      { n: 3, name: 'The store', cost: { coins: 520, ink: 8, books: 2 }, standing: std('Grow 14 root families.', (v, s) => s.rootwood.grownCount >= 14), line: 'Barrels and a lamp. Ines digs a Root every three hours on her own, while the shelf has room.', after: 'The Root Workshop keeps a store, and Ines works it alone.', effect: { pay: 1.2, helper: { every: H3, cap: 3 } } },
      { n: 4, name: 'The second storey', cost: { coins: 1400, ink: 14, blooms: 4, cloth: 4 }, standing: std('Grow 26 root families, 10 of them mature.', (v, s) => s.rootwood.grownCount >= 26 && s.rootwood.matureCount >= 10), line: 'A study above the workshop.', after: 'The Root Workshop has a study upstairs, and a banner.', effect: { pay: 1.3, helper: { every: H2, cap: 6 } } },
    ],
  },
  {
    id: 'loom', name: 'The Loom', kind: 'learn', character: 'nell', art: 'loom', raw: 'thread', good: 'cloth',
    skill: 'Verbal reasoning', place: 'loom',
    at: { x: 800, y: 790 }, hit: { w: 144, h: 112 },
    line: 'Para jumbles, summaries, the odd one out: every paragraph you put right is Thread. Nell weaves Thread into Cloth.',
    activity: { label: 'Solve a jumble set', verb: 'Solve a set', route: '#/world/place/loom', minutes: 5, makes: 'thread', brief: 'A set of jumbles or summaries against the clock, about five minutes.' },
    craft: { secs: [45, 32, 22, 14], firstSecs: 10 },
    unlock: { cost: { coins: 200, books: 2, blooms: 2 }, standing: std('Deliver 3 orders.', (v) => v.ordersDone >= 3), line: 'Nell wants a timber workshop with an awning.' },
    levels: [
      { n: 1, line: 'A timber workshop with a purple awning.' },
      { n: 2, name: 'The spool sign', cost: { coins: 220, cloth: 4 }, standing: std('Solve 12 items in the workshops.', (v, s) => s.loom.solved + s.table.solved + s.bench.solved >= 12), line: 'Nell weaves faster, and orders for Cloth pay more.', after: 'A spool sign hangs at the Loom.', effect: { pay: 1.1 } },
      { n: 3, name: 'The upper room', cost: { coins: 600, cloth: 8, books: 2 }, standing: std('Solve 40 items, 12 of them at three stars.', (v, s) => s.loom.solved + s.table.solved + s.bench.solved >= 40 && s.loom.stars + s.table.stars + s.bench.stars >= 12), line: 'Nell spins a Thread every three hours on her own, while the shelf has room.', after: 'The Loom has an upper room, and Nell works it alone.', effect: { pay: 1.2, helper: { every: H3, cap: 3 } } },
      { n: 4, name: 'The banner house', cost: { coins: 1500, cloth: 14, books: 4, ink: 4 }, standing: std('Solve 90 items in the workshops.', (v, s) => s.loom.solved + s.table.solved + s.bench.solved >= 90), line: 'Lamps and a banner.', after: 'The Loom glows after dusk.', effect: { pay: 1.3, helper: { every: H2, cap: 6 } } },
    ],
  },
  {
    id: 'market', name: 'The Market', kind: 'market', character: 'rafi', art: 'market',
    at: { x: 600, y: 900 }, hit: { w: 156, h: 100 },
    line: 'Rafi’s stall: more orders on the board, and better prices for everything the village makes.',
    unlock: { cost: { coins: 60 }, standing: std('Deliver 2 orders.', (v) => v.ordersDone >= 2), line: 'Rafi has a cart and wants a stall.' },
    levels: [
      { n: 1, line: 'A stall with a striped awning. Three orders on the board.', effect: { slots: 3 } },
      { n: 2, name: 'The market house', cost: { coins: 320, books: 2, blooms: 2 }, standing: std('Deliver 8 orders.', (v) => v.ordersDone >= 8), line: 'A roof over the stall, and a fourth order on the board. Every order pays a little more.', after: 'The Market has a roof, and four orders on the board.', effect: { slots: 4, pay: 1.1 } },
      { n: 3, name: 'The bell', cost: { coins: 900, books: 4, blooms: 4, ink: 4, cloth: 4 }, standing: std('Deliver 24 orders.', (v) => v.ordersDone >= 24), line: 'A lamp, a banner, five orders on the board, and better prices.', after: 'Five orders on the Market board, and a bell to ring when one is done.', effect: { slots: 5, pay: 1.25 } },
    ],
  },
  {
    id: 'road', name: 'The Road Out', kind: 'challenge', character: null, art: null,
    skill: 'Mixed timed challenge', place: 'wilds',
    at: { x: 600, y: 1080 }, hit: { w: 100, h: 70 },
    line: 'Beyond the village: the Gauntlet, mixed and timed, against your own best. It pays in coins.',
    activity: { label: 'Run the Gauntlet', verb: 'Take the road out', route: '#/world/place/wilds', minutes: 8, makes: 'coins', brief: 'Everything at once, fast, paid in coins.' },
    unlock: { cost: { coins: 250 }, standing: std('Earn 12 stars.', (v, s) => s.stars >= 12), line: 'A signpost and a lamp, and the road is open.' },
    levels: [
      { n: 1, line: 'A signpost at the edge of the village.' },
      { n: 2, name: 'Lanterns on the road', cost: { coins: 700, cloth: 4, books: 4 }, standing: std('Finish 3 Gauntlet runs.', (v, s) => s.wilds.runs >= 3), line: 'The road lit as far as the ridge. Gauntlet runs pay half again.', after: 'The road out is lit all the way to the ridge.', effect: { pay: 1.5 } },
    ],
  },
]);

const BUILDING_BY_ID = new Map(BUILDINGS.map((b) => [b.id, b]));
export function buildingById(id) { return BUILDING_BY_ID.get(id) ?? null; }
export function characterById(id) { return CHARACTERS[id] ?? null; }
/** The building a raw good goes to. */
export function buildingForRaw(rawKey) { return BUILDINGS.find((b) => b.raw === rawKey) ?? null; }

/** The order board: by the Hearth's door, where neighbours come to ask. */
export const BOARD = Object.freeze({ at: { x: 690, y: 672 }, hit: { w: 56, h: 60 } });

/* Which building each learning place and module belongs to. */
export const PLACE_BUILDING = Object.freeze({
  'reading-room': 'reading', meadow: 'garden', pond: 'garden', thicket: 'garden', rootwood: 'roots', terraces: 'roots',
  loom: 'loom', table: 'loom', bench: 'loom', hearth: 'hearth', wilds: 'road', quarter: 'loom',
});
export const MODULE_BUILDING = Object.freeze({
  rc: 'reading', rc2: 'reading', cr: 'reading', wb: 'garden', lex: 'garden', garden: 'roots', wd: 'roots',
  pj: 'loom', ps: 'loom', ooo: 'loom', sp: 'loom', pc: 'loom', gauntlet: 'road',
});

/* ------------------------------------------------------------------ */
/* Land: plots, houses, and the things that never run out               */
/* ------------------------------------------------------------------ */

/**
 * A plot is fenced ground with a sign. Opening it costs coins and asks for
 * standing; what appears there is drawn by the scene (a pen of sheep, an
 * orchard, a mill by the river). Plots are the village growing outward.
 */
export const PLOTS = Object.freeze([
  {
    id: 'pen', name: 'The sheep pen', at: { x: 255, y: 780 }, rect: { x: 170, y: 690, w: 170, h: 120 },
    cost: { coins: 150 }, standing: std('Deliver 4 orders.', (v) => v.ordersDone >= 4),
    line: 'A fence, a trough, and three sheep who have nowhere else to be.', after: 'Sheep graze by the pond.',
  },
  {
    id: 'orchard', name: 'The orchard', at: { x: 255, y: 350 }, rect: { x: 160, y: 190, w: 190, h: 170 },
    cost: { coins: 340, blooms: 4 }, standing: std('Hold 80 words for good.', (v, s) => s.meadow.mastered + s.pond.mastered + s.thicket.mastered >= 80),
    line: 'Rows of young trees on the rise above the workshop.', after: 'An orchard stands above the Root Workshop.',
  },
  {
    id: 'farm', name: 'The farm', at: { x: 1060, y: 750 }, rect: { x: 950, y: 540, w: 220, h: 220 },
    cost: { coins: 600, ink: 4, cloth: 4 }, standing: std('Deliver 12 orders.', (v) => v.ordersDone >= 12),
    line: 'Across the river: a barn, a cart, chickens, and hay.', after: 'A farm works the land across the river.',
  },
  {
    id: 'mill', name: 'The mill', at: { x: 1060, y: 380 }, rect: { x: 950, y: 190, w: 220, h: 200 },
    cost: { coins: 1100, books: 6, blooms: 6 }, standing: std('Deliver 30 orders and earn 40 stars.', (v, s) => v.ordersDone >= 30 && s.stars >= 40),
    line: 'A mill on the water, upstream of the bridge.', after: 'A mill turns on the river.',
  },
  {
    id: 'square', name: 'The square', at: { x: 600, y: 515 }, rect: { x: 520, y: 430, w: 160, h: 90 },
    cost: { coins: 900, books: 4, blooms: 4, ink: 4, cloth: 4 }, standing: std('Deliver 20 orders.', (v) => v.ordersDone >= 20),
    line: 'Cobbles, a well, and a bench between the Hearth and the Reading House.', after: 'The village has a square, and a well in it.',
  },
]);
const PLOT_BY_ID = new Map(PLOTS.map((p) => [p.id, p]));
export function plotById(id) { return PLOT_BY_ID.get(id) ?? null; }

/**
 * Houses for the neighbours: the work that never runs out. The first spot
 * is Mira's cottage, there from the start; every later house costs more
 * than the last and asks for more delivered orders, and every one is a
 * person who walks the paths and posts orders of their own.
 */
export const HOUSE_SPOTS = Object.freeze([
  { x: 410, y: 800 }, { x: 1010, y: 460 }, { x: 240, y: 500 }, { x: 700, y: 280 }, { x: 470, y: 980 },
  { x: 760, y: 985 }, { x: 1010, y: 900 }, { x: 330, y: 1055 }, { x: 900, y: 1060 }, { x: 150, y: 560 },
]);
export const HOUSE = Object.freeze({
  /** House n (1-based) is the n-th neighbour after Mira. */
  cost: (n) => ({ coins: 280 + (n - 1) * 160 }),
  standing: (n) => std(`Deliver ${6 + (n - 1) * 4} orders.`, (v) => v.ordersDone >= 6 + (n - 1) * 4),
  who: (n) => NEIGHBOURS[Math.min(NEIGHBOURS.length - 1, n)],
  name: (n) => `${HOUSE.who(n).name}’s house`,
  line: (n) => `${HOUSE.who(n).name}, ${HOUSE.who(n).role}, has asked to settle here. A roof, two windows and a chimney.`,
  after: (n) => `${HOUSE.who(n).name} has moved in, and will be posting orders.`,
  max: HOUSE_SPOTS.length - 1,
});

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

/** Why somebody wants a good when their own reasons run out — one line, chosen by seed. */
export const ORDER_REASONS = Object.freeze({
  books: ['for the schoolhouse', 'for a letter home', 'for the notice board', 'to copy the almanac', 'for the ferry timetable', 'for the long winter'],
  blooms: ['for the window boxes', 'for a wedding', 'for the hives', 'for the festival', 'for the inn’s tables', 'for a grave by the wood'],
  ink: ['for the letters', 'for the labels', 'for the register', 'for the ledger', 'for the notices', 'for the tide book'],
  cloth: ['to mend the flags', 'for a new sail', 'for the festival banners', 'for the school’s curtains', 'for the market awning', 'for a winter coat'],
});

/** The places the road out goes, in order: what a Gauntlet run is walking toward. */
export const WAYMARKS = Object.freeze([
  { name: 'the Ridge', line: 'The first rise out of the village. From the top you can see the tower.' },
  { name: 'Copperbeck', line: 'A mill town on fast water, two days south.' },
  { name: 'the Long Water', line: 'A lake so still the mountains are in it twice.' },
  { name: 'Anselm’s Bridge', line: 'Five arches, and nobody remembers who Anselm was.' },
  { name: 'the Winter Road', line: 'It is only open half the year, and it goes somewhere worth it.' },
  { name: 'Haldenmoor', line: 'Heather to the horizon, and one lit window.' },
  { name: 'the Old Library', line: 'Further than anyone in the village has been.' },
]);

/** The village's stages, by worth. Every stage has a line for Wick. */
export const STAGES = Object.freeze([
  { at: 0, name: 'A camp', line: 'A house, a reading house, a cottage, and room everywhere.' },
  { at: 44, name: 'A hamlet', line: 'Two chimneys, and a stall.' },
  { at: 90, name: 'A village', line: 'Workshops, a market, and people who come to it.' },
  { at: 170, name: 'A busy village', line: 'Every worker has work, and the board is never empty.' },
  { at: 290, name: 'A town', line: 'Neighbours, a square, and a road out.' },
  { at: 460, name: 'A market town', line: 'People come here to trade, and to read.' },
  { at: 700, name: 'A town people travel to', line: 'Somebody on the road asked the way here. By name.' },
]);
