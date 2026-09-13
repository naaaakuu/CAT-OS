/**
 * defs.js — the VARC village, as data.
 *
 * Everything the village is made of is declared here and nowhere else:
 * the goods, the buildings and their levels, the people who work in them,
 * the plots of land that can be opened, the houses neighbours move into,
 * and the shapes of the orders villagers post. The map painter, the
 * screens and the economy all read this one file, so a second world (a
 * Data Interpretation harbour, a Quant quarry) is another file shaped
 * like this one, not another game.
 *
 * Coordinates are world units on a 1200 × 1200 map. `at` is where a
 * building's front door meets the ground.
 */

import { PAL } from './art.js';

export const WORLD = Object.freeze({ id: 'varc', name: 'the village', W: 1200, H: 1200, home: { x: 600, y: 600 } });

/* ------------------------------------------------------------------ */
/* Goods and coins                                                     */
/* ------------------------------------------------------------------ */

/**
 * Four goods, one per learning building, each made only by one kind of
 * thinking. A finished activity makes one per star (a flawless run makes
 * one more), so "Ada needs 3 Pages" means "about one good passage".
 */
export const GOODS = Object.freeze([
  { key: 'pages', name: 'Pages', one: 'Page', glyph: 'page', building: 'reading', color: '#C9A961', price: 22, line: 'Made by reading a passage well.' },
  { key: 'blooms', name: 'Blooms', one: 'Bloom', glyph: 'bloom', building: 'garden', color: PAL.bloom, price: 16, line: 'Made by learning words.' },
  { key: 'roots', name: 'Roots', one: 'Root', glyph: 'root', building: 'roots', color: PAL.root, price: 20, line: 'Made by taking words apart.' },
  { key: 'thread', name: 'Thread', one: 'Thread', glyph: 'thread', building: 'loom', color: PAL.thread, price: 24, line: 'Made by putting paragraphs in order.' },
]);
export const GOOD_KEYS = Object.freeze(GOODS.map((g) => g.key));
const GOOD_BY_KEY = new Map(GOODS.map((g) => [g.key, g]));
export function good(key) { return GOOD_BY_KEY.get(key) ?? null; }
export const COINS = Object.freeze({ key: 'coins', name: 'Coins', one: 'Coin', glyph: 'coin', color: PAL.coin });

/* ------------------------------------------------------------------ */
/* The people                                                          */
/* ------------------------------------------------------------------ */

export const CHARACTERS = Object.freeze({
  wick: { id: 'wick', name: 'Wick', role: 'the cat who keeps the lamps', building: 'hearth' },
  ada: {
    id: 'ada', name: 'Ada', role: 'the reader', building: 'reading',
    look: { skin: '#F1C7A2', hair: '#4A2E1F', style: 'bun', top: '#D9603F', bottom: '#4E4A5C', apron: '#F7E9CB', prop: 'book' },
    idle: ['A passage is a small argument. Find the point and the rest falls in.', 'Read it once, closely. Twice is for checking.', 'The clock is part of the reading.'],
    asks: ['I need Pages for the schoolhouse.', 'Someone is waiting on a letter.', 'The board outside is bare.'],
  },
  bo: {
    id: 'bo', name: 'Bo', role: 'the gardener', building: 'garden',
    look: { skin: '#C68863', hair: '#2E2A2A', style: 'short', top: '#5FA36B', bottom: '#5B4636', hat: 'straw', prop: 'can' },
    idle: ['Every word that sticks is a flower that stays.', 'Twins first. The look-alikes are where marks go missing.', 'Twelve words, then look up. That is a round.'],
    asks: ['I could use Blooms for the window boxes.', 'The hives want flowers.', 'A wedding wants Blooms by the weekend.'],
  },
  ines: {
    id: 'ines', name: 'Ines', role: 'the root-scholar', building: 'roots',
    look: { skin: '#E8B48F', hair: '#B9B0A6', style: 'bun', top: '#5C8FBB', bottom: '#4E4A5C', glasses: true, prop: 'lens' },
    idle: ['Take a word apart and a dozen open.', 'Prefix, root, suffix. Then the sentence settles it.', 'Ten roots, a thousand words.'],
    asks: ['The apothecary is asking for Roots.', 'I want Roots to plant along the road.', 'The winter store is low on Roots.'],
  },
  nell: {
    id: 'nell', name: 'Nell', role: 'the weaver', building: 'loom',
    look: { skin: '#8D5B3B', hair: '#1E1B1B', style: 'curly', top: '#8E6DB8', bottom: '#3A3846', prop: 'spool' },
    idle: ['Sentences in the wrong order. Find the thread.', 'The pronoun needs an owner. Start there.', 'One sentence never belonged. It shows itself.'],
    asks: ['The flags want mending. Thread, please.', 'A new sail needs Thread.', 'The festival banners are frayed.'],
  },
  rafi: {
    id: 'rafi', name: 'Rafi', role: 'the merchant', building: 'market',
    look: { skin: '#D19A73', hair: '#7A4A2A', style: 'short', top: '#F6C445', bottom: '#4E4A5C', hat: 'cap', prop: 'basket' },
    idle: ['Orders on the board. Bring what they ask and the coins are yours.', 'Every order is somebody in the village.', 'Deliver, and the board fills again.'],
    asks: [],
  },
});

/* Neighbours who post orders once they have moved in. */
export const NEIGHBOURS = Object.freeze([
  { name: 'Old Tomas', look: { skin: '#F5CBA7', hair: '#D8D3CC', style: 'bald', top: '#7C8797', bottom: '#4E4A5C', glasses: true } },
  { name: 'Mira', look: { skin: '#B57A55', hair: '#2B2222', style: 'long', top: '#4EA7A0', bottom: '#3A3846' } },
  { name: 'The schoolhouse', look: { skin: '#F5CBA7', hair: '#B86F3A', style: 'short', top: '#5C8FBB', bottom: '#4E4A5C' } },
  { name: 'Hal', look: { skin: '#E8B48F', hair: '#7A4A2A', style: 'short', top: '#E08B6A', bottom: '#5B4636', hat: 'cap' } },
  { name: 'Priya', look: { skin: '#D19A73', hair: '#1E1B1B', style: 'long', top: '#D9603F', bottom: '#3A3846' } },
  { name: 'The ferryman', look: { skin: '#B57A55', hair: '#4A2E1F', style: 'short', top: '#7C8797', bottom: '#4E4A5C', hat: 'scarf' } },
  { name: 'Wren', look: { skin: '#F1C7A2', hair: '#D9B26B', style: 'curly', top: '#8E6DB8', bottom: '#4E4A5C' } },
  { name: 'The innkeeper', look: { skin: '#C68863', hair: '#2B2222', style: 'short', top: '#F6C445', bottom: '#5B4636', apron: '#F7E9CB' } },
]);

/* ------------------------------------------------------------------ */
/* Buildings                                                           */
/* ------------------------------------------------------------------ */

const std = (line, test) => ({ line, test });

/**
 * A building has levels. Level 1 is what stands when the building is
 * built (`unlock` is what it takes to build it; the Hearth and the
 * Reading House are there from the first minute). Every later level has
 * a coin cost, sometimes goods, and a standing — something the learner's
 * record must already show — so nothing in the village is bought without
 * having been earned.
 *
 * `effect.helper` is automation: once the learner has proved the skill,
 * the building's worker makes a small trickle of its good on their own,
 * up to a cap. It is never enough to replace learning, and it is never
 * offered before the mastery that justifies it.
 */
export const BUILDINGS = Object.freeze([
  {
    id: 'hearth', name: 'The Hearth', kind: 'home', character: 'wick', art: 'hearth',
    at: { x: 600, y: 640 }, hit: { w: 96, h: 76 },
    line: 'Home. Wick keeps the lamps; you keep the rest.',
    levels: [
      { n: 1, line: 'A small house with a good roof.' },
      { n: 2, name: 'A chimney', cost: { coins: 90 }, standing: std('Deliver 2 orders.', (v) => v.ordersDone >= 2), line: 'Stone and a good flue, so the house can hold a fire.', after: 'Smoke rises from the Hearth on every day you practise.' },
      { n: 3, name: 'Flower boxes', cost: { coins: 240, blooms: 3 }, standing: std('Master 30 words.', (v, s) => s.meadow.mastered + s.pond.mastered + s.thicket.mastered >= 30), line: 'Boxes under the windows, planted from the Word Garden.', after: 'Flowers hang under the Hearth’s windows, and a dog has moved in.' },
      { n: 4, name: 'A lamp by the door', cost: { coins: 520, thread: 3, pages: 3 }, standing: std('Hold a seven-day streak.', (v, s) => s.hearth.streak.best >= 7), line: 'Iron and glass, lit every dusk.', after: 'A lantern burns by the Hearth’s door each night.' },
      { n: 5, name: 'The oldest house', cost: { coins: 1200, pages: 6, blooms: 6, roots: 6, thread: 6 }, standing: std('Earn fifty stars.', (v, s) => s.stars >= 50), line: 'A dormer, a weathervane, and ivy.', after: 'The Hearth is the oldest house in the village, and looks it.' },
    ],
  },
  {
    id: 'reading', name: 'The Reading House', kind: 'learn', character: 'ada', art: 'reading', good: 'pages',
    skill: 'Reading comprehension', place: 'reading-room',
    at: { x: 742, y: 452 }, hit: { w: 112, h: 90 },
    line: 'CAT passages against the clock. Ada makes Pages from what you read.',
    activity: { label: 'Read a passage', verb: 'Read with Ada', route: '#/world/place/reading-room', minutes: 5, makes: 'pages' },
    levels: [
      { n: 1, line: 'A small house with two big windows and a lamp.' },
      { n: 2, name: 'A second floor', cost: { coins: 180, pages: 4 }, standing: std('Read 3 passages at two stars or better.', (v, s) => s.reading.wellRead >= 3), line: 'Another storey, and shelves to fill it. Orders for Pages pay more.', after: 'The Reading House stands two floors tall.', effect: { pay: 1.1 } },
      { n: 3, name: 'The reading tower', cost: { coins: 560, pages: 8, roots: 2 }, standing: std('Read 8 passages well, 3 of them at three stars.', (v, s) => s.reading.wellRead >= 8 && s.reading.threeStar >= 3), line: 'A tower beside the house. Ada reads on her own now: a Page every three hours, up to three.', after: 'A tower rises beside the Reading House, and Ada works on her own.', effect: { pay: 1.2, helper: { every: 3 * 3600e3, cap: 3 } } },
      { n: 4, name: 'The Observatory', cost: { coins: 1500, pages: 14, thread: 4, roots: 4 }, standing: std('Read 16 passages well, 6 at three stars.', (v, s) => s.reading.wellRead >= 16 && s.reading.threeStar >= 6), line: 'A copper dome, and Night Reading: passages at a tighter clock for the flawless mark.', after: 'A copper dome crowns the tower. Night Reading is open.', effect: { pay: 1.3, helper: { every: 2 * 3600e3, cap: 6 }, nightReading: true } },
    ],
  },
  {
    id: 'garden', name: 'The Word Garden', kind: 'learn', character: 'bo', art: 'garden', good: 'blooms',
    skill: 'Vocabulary', place: 'meadow',
    at: { x: 426, y: 566 }, hit: { w: 100, h: 84 },
    line: 'The CAT word lists, the look-alike twins, the borrowed words. Bo grows Blooms from what you keep.',
    activity: { label: 'Take a word round', verb: 'Plant with Bo', route: '#/round/meadow', minutes: 2, makes: 'blooms' },
    unlock: { cost: { coins: 40 }, standing: std('Deliver your first order.', (v) => v.ordersDone >= 1), line: 'Bo has asked for a patch of ground and a shed.' },
    levels: [
      { n: 1, line: 'A shed and two beds.' },
      { n: 2, name: 'A glasshouse', cost: { coins: 160, blooms: 4 }, standing: std('Bring 60 words to memory.', (v, s) => s.meadow.known + s.pond.known + s.thicket.known >= 60), line: 'Glass and white timber. Orders for Blooms pay more.', after: 'A glasshouse stands in the Word Garden.', effect: { pay: 1.1 } },
      { n: 3, name: 'The hives', cost: { coins: 480, blooms: 8, pages: 2 }, standing: std('Hold 120 words for good.', (v, s) => s.meadow.mastered + s.pond.mastered + s.thicket.mastered >= 120), line: 'Bees work the beds. Bo makes a Bloom every three hours on his own, up to three.', after: 'Bees work the Word Garden, and Bo tends it alone.', effect: { pay: 1.2, helper: { every: 3 * 3600e3, cap: 3 } } },
      { n: 4, name: 'The long garden', cost: { coins: 1300, blooms: 14, roots: 4, thread: 4 }, standing: std('Hold 300 words for good.', (v, s) => s.meadow.mastered + s.pond.mastered + s.thicket.mastered >= 300), line: 'Beds to the river, and a banner on the glasshouse.', after: 'The Word Garden runs all the way to the water.', effect: { pay: 1.3, helper: { every: 2 * 3600e3, cap: 6 } } },
    ],
  },
  {
    id: 'roots', name: 'The Root Workshop', kind: 'learn', character: 'ines', art: 'roots', good: 'roots',
    skill: 'Roots & word parts', place: 'rootwood',
    at: { x: 468, y: 346 }, hit: { w: 100, h: 84 },
    line: 'Latin and Greek roots, prefixes and suffixes. Ines makes Roots from every family you take apart.',
    activity: { label: 'Grow a root family', verb: 'Dig with Ines', route: '#/world/place/rootwood', minutes: 4, makes: 'roots' },
    unlock: { cost: { coins: 120, blooms: 2 }, standing: std('Deliver 2 orders.', (v) => v.ordersDone >= 2), line: 'Ines wants a stone workshop by the wood.' },
    levels: [
      { n: 1, line: 'A stone workshop with a round window.' },
      { n: 2, name: 'A chimney and a kiln', cost: { coins: 200, roots: 4 }, standing: std('Grow 6 root families.', (v, s) => s.rootwood.grownCount >= 6), line: 'Orders for Roots pay more.', after: 'Smoke rises from the Root Workshop.', effect: { pay: 1.1 } },
      { n: 3, name: 'The store', cost: { coins: 520, roots: 8, pages: 2 }, standing: std('Grow 14 root families.', (v, s) => s.rootwood.grownCount >= 14), line: 'Barrels and a lamp. Ines digs a Root every three hours on her own, up to three.', after: 'The Root Workshop keeps a store, and Ines works it alone.', effect: { pay: 1.2, helper: { every: 3 * 3600e3, cap: 3 } } },
      { n: 4, name: 'The second storey', cost: { coins: 1400, roots: 14, blooms: 4, thread: 4 }, standing: std('Grow 26 root families, 10 of them mature.', (v, s) => s.rootwood.grownCount >= 26 && s.rootwood.matureCount >= 10), line: 'A study above the workshop.', after: 'The Root Workshop has a study upstairs, and a banner.', effect: { pay: 1.3, helper: { every: 2 * 3600e3, cap: 6 } } },
    ],
  },
  {
    id: 'loom', name: 'The Loom', kind: 'learn', character: 'nell', art: 'loom', good: 'thread',
    skill: 'Verbal reasoning', place: 'loom',
    at: { x: 764, y: 748 }, hit: { w: 104, h: 84 },
    line: 'Para jumbles, summaries, the odd one out. Nell makes Thread from every paragraph you put right.',
    activity: { label: 'Solve a jumble set', verb: 'Weave with Nell', route: '#/world/place/loom', minutes: 5, makes: 'thread' },
    unlock: { cost: { coins: 200, pages: 2, blooms: 2 }, standing: std('Deliver 3 orders.', (v) => v.ordersDone >= 3), line: 'Nell wants a timber workshop with an awning.' },
    levels: [
      { n: 1, line: 'A timber workshop with a purple awning.' },
      { n: 2, name: 'The spool sign', cost: { coins: 220, thread: 4 }, standing: std('Solve 12 items in the workshops.', (v, s) => s.loom.solved + s.table.solved + s.bench.solved >= 12), line: 'Orders for Thread pay more.', after: 'A spool sign hangs at the Loom.', effect: { pay: 1.1 } },
      { n: 3, name: 'The upper room', cost: { coins: 600, thread: 8, pages: 2 }, standing: std('Solve 40 items, 12 of them at three stars.', (v, s) => s.loom.solved + s.table.solved + s.bench.solved >= 40 && s.loom.stars + s.table.stars + s.bench.stars >= 12), line: 'Nell weaves a Thread every three hours on her own, up to three.', after: 'The Loom has an upper room, and Nell works it alone.', effect: { pay: 1.2, helper: { every: 3 * 3600e3, cap: 3 } } },
      { n: 4, name: 'The banner house', cost: { coins: 1500, thread: 14, pages: 4, roots: 4 }, standing: std('Solve 90 items in the workshops.', (v, s) => s.loom.solved + s.table.solved + s.bench.solved >= 90), line: 'Lamps and a banner.', after: 'The Loom glows after dusk.', effect: { pay: 1.3, helper: { every: 2 * 3600e3, cap: 6 } } },
    ],
  },
  {
    id: 'market', name: 'The Market', kind: 'market', character: 'rafi', art: 'market',
    at: { x: 600, y: 858 }, hit: { w: 104, h: 76 },
    line: 'Rafi keeps the order board. Every order is somebody in the village asking for what you make.',
    unlock: { cost: { coins: 60 }, standing: std('Deliver your first order.', (v) => v.ordersDone >= 1), line: 'Rafi has a cart and wants a stall.' },
    levels: [
      { n: 1, line: 'A stall with a striped awning. Three orders on the board.', effect: { slots: 3 } },
      { n: 2, name: 'The market house', cost: { coins: 320, pages: 2, blooms: 2 }, standing: std('Deliver 8 orders.', (v) => v.ordersDone >= 8), line: 'A roof over the stall, and a fourth order on the board. Every order pays a little more.', after: 'The Market has a roof, and four orders on the board.', effect: { slots: 4, pay: 1.1 } },
      { n: 3, name: 'The bell', cost: { coins: 900, pages: 4, blooms: 4, roots: 4, thread: 4 }, standing: std('Deliver 24 orders.', (v) => v.ordersDone >= 24), line: 'A lamp, a banner, five orders on the board, and better prices.', after: 'Five orders on the Market board, and a bell to ring when one is done.', effect: { slots: 5, pay: 1.25 } },
    ],
  },
  {
    id: 'road', name: 'The Road Out', kind: 'challenge', character: null, art: null,
    skill: 'Mixed timed challenge', place: 'wilds',
    at: { x: 600, y: 1040 }, hit: { w: 90, h: 60 },
    line: 'Beyond the village: the Gauntlet, mixed and timed, against your own best. It pays in coins.',
    activity: { label: 'Run the Gauntlet', verb: 'Take the road out', route: '#/world/place/wilds', minutes: 8, makes: 'coins' },
    unlock: { cost: { coins: 250 }, standing: std('Earn 12 stars.', (v, s) => s.stars >= 12), line: 'A signpost and a lamp, and the road is open.' },
    levels: [
      { n: 1, line: 'A signpost at the edge of the village.' },
      { n: 2, name: 'Lanterns on the road', cost: { coins: 700, thread: 4, pages: 4 }, standing: std('Finish 3 Gauntlet runs.', (v, s) => s.wilds.runs >= 3), line: 'The road lit as far as the ridge. Gauntlet runs pay half again.', after: 'The road out is lit all the way to the ridge.', effect: { pay: 1.5 } },
    ],
  },
]);

const BUILDING_BY_ID = new Map(BUILDINGS.map((b) => [b.id, b]));
export function buildingById(id) { return BUILDING_BY_ID.get(id) ?? null; }
export function characterById(id) { return CHARACTERS[id] ?? null; }

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
    id: 'pen', name: 'The sheep pen', at: { x: 300, y: 790 }, rect: { x: 220, y: 720, w: 170, h: 120 },
    cost: { coins: 150 }, standing: std('Deliver 4 orders.', (v) => v.ordersDone >= 4),
    line: 'A fence, a trough, and three sheep who have nowhere else to be.', after: 'Sheep graze by the pond.',
  },
  {
    id: 'orchard', name: 'The orchard', at: { x: 300, y: 300 }, rect: { x: 210, y: 210, w: 190, h: 170 },
    cost: { coins: 340, blooms: 4 }, standing: std('Hold 80 words for good.', (v, s) => s.meadow.mastered + s.pond.mastered + s.thicket.mastered >= 80),
    line: 'Rows of young trees on the rise above the workshop.', after: 'An orchard stands above the Root Workshop.',
  },
  {
    id: 'farm', name: 'The farm', at: { x: 1010, y: 640 }, rect: { x: 930, y: 540, w: 230, h: 220 },
    cost: { coins: 600, roots: 4, thread: 4 }, standing: std('Deliver 12 orders.', (v) => v.ordersDone >= 12),
    line: 'Across the river: a barn, a cart, chickens, and hay.', after: 'A farm works the land across the river.',
  },
  {
    id: 'mill', name: 'The mill', at: { x: 1010, y: 300 }, rect: { x: 930, y: 200, w: 230, h: 200 },
    cost: { coins: 1100, pages: 6, blooms: 6 }, standing: std('Deliver 30 orders and earn 40 stars.', (v, s) => v.ordersDone >= 30 && s.stars >= 40),
    line: 'A mill on the water, upstream of the bridge.', after: 'A mill turns on the river.',
  },
  {
    id: 'square', name: 'The square', at: { x: 600, y: 520 }, rect: { x: 520, y: 470, w: 160, h: 90 },
    cost: { coins: 900, pages: 4, blooms: 4, roots: 4, thread: 4 }, standing: std('Deliver 20 orders.', (v) => v.ordersDone >= 20),
    line: 'Cobbles, a well, and a bench between the Hearth and the Reading House.', after: 'The village has a square, and a well in it.',
  },
]);
const PLOT_BY_ID = new Map(PLOTS.map((p) => [p.id, p]));
export function plotById(id) { return PLOT_BY_ID.get(id) ?? null; }

/**
 * Houses for neighbours: the work that never runs out. Every house costs
 * more than the last and asks for more delivered orders, and every one is
 * a person who walks the paths and posts orders of their own.
 */
export const HOUSE_SPOTS = Object.freeze([
  { x: 402, y: 820 }, { x: 868, y: 620 }, { x: 300, y: 660 }, { x: 900, y: 320 }, { x: 470, y: 960 }, { x: 760, y: 950 },
  { x: 250, y: 470 }, { x: 900, y: 860 }, { x: 640, y: 1090 }, { x: 350, y: 1060 },
]);
export const HOUSE = Object.freeze({
  cost: (n) => ({ coins: 280 + (n - 1) * 160 }),
  standing: (n) => std(`Deliver ${6 + (n - 1) * 4} orders.`, (v) => v.ordersDone >= 6 + (n - 1) * 4),
  name: (n) => (n === 1 ? 'A house for a neighbour' : `A ${ORDINALS[n - 1] ?? `${n}th`} neighbour`),
  line: (n) => (n === 1 ? `${NEIGHBOURS[0].name} has asked to settle here. A roof, two windows and a chimney.` : `${NEIGHBOURS[(n - 1) % NEIGHBOURS.length].name} would like to live in your village.`),
  after: (n) => `${NEIGHBOURS[(n - 1) % NEIGHBOURS.length].name} has moved in, and will be posting orders.`,
  max: HOUSE_SPOTS.length,
});
const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

/* ------------------------------------------------------------------ */
/* Orders                                                              */
/* ------------------------------------------------------------------ */

/** Why somebody wants a good — one line, chosen by seed. */
export const ORDER_REASONS = Object.freeze({
  pages: ['for the schoolhouse', 'to bind a book', 'for a letter home', 'for the notice board', 'to copy the almanac', 'for the ferry timetable'],
  blooms: ['for the window boxes', 'for a wedding', 'for the hives', 'for the festival', 'for the inn’s tables', 'for a grave by the wood'],
  roots: ['for the apothecary', 'to plant along the road', 'for the winter store', 'for the kiln', 'for the mill garden', 'for the ferryman’s cure'],
  thread: ['to mend the flags', 'for a new sail', 'for the festival banners', 'for the school’s curtains', 'for the market awning', 'for a winter coat'],
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
  { at: 0, name: 'A camp', line: 'A house, a reading room, and room everywhere.' },
  { at: 44, name: 'A hamlet', line: 'Two chimneys, and a stall.' },
  { at: 90, name: 'A village', line: 'Workshops, a market, and people who come to it.' },
  { at: 170, name: 'A busy village', line: 'Every worker has work, and the board is never empty.' },
  { at: 290, name: 'A town', line: 'Neighbours, a square, and a road out.' },
  { at: 460, name: 'A market town', line: 'People come here to trade, and to read.' },
  { at: 700, name: 'A town people travel to', line: 'Somebody on the road asked the way here. By name.' },
]);
