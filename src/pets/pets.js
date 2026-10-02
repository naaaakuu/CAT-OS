/**
 * pets.js — the six pets of the village: who they are, which subject each
 * looks after, the gift ring that ties them together, and every line they
 * can say. Pure data and a few lookups; no DOM, no storage.
 *
 * Copy rules (tools/check-pets.mjs enforces them): no "!", at most 96
 * characters, never wrong / failure / failed / mistake / poor / weak / bad /
 * careless / study / score / XP / "level up" / "unlocked". The pets notice;
 * they do not grade, and they never guilt.
 */

import { rng } from '../world/engine/palette.js';

const freeze = (o) => Object.freeze(o);

export const PETS = freeze([
  freeze({
    id: 'toffee', name: 'Toffee', creature: 'amber flame spirit', subject: 'CAT pace: the Gauntlet',
    home: 'the campfire', gift: 'sparks', giftOne: 'spark', colour: '#E9963A', frame: freeze([0, 350]),
    places: freeze(['wilds', 'hearth']), modules: freeze(['gauntlet']),
    blurb: 'Keeps the village fire and runs the Gauntlet: everything at once, against the clock.',
  }),
  freeze({
    id: 'chai', name: 'Chai', creature: 'cream owl', subject: 'Reading: passages, the second look, arguments',
    home: 'the library', gift: 'stories', giftOne: 'story', colour: '#A9825A', frame: freeze([355, 330]),
    places: freeze(['reading-room']), modules: freeze(['rc', 'rc2', 'cr']),
    blurb: 'Keeps the passages, and helps you find what a passage is really saying.',
  }),
  freeze({
    id: 'matcha', name: 'Matcha', creature: 'moss sprout', subject: 'Vocabulary: words, roots and word parts',
    home: 'the greenhouse', gift: 'leaves', giftOne: 'leaf', colour: '#7FA65A', frame: freeze([700, 338]),
    places: freeze(['meadow', 'pond', 'thicket', 'rootwood', 'terraces']), modules: freeze(['lex', 'garden', 'wd', 'wb']),
    blurb: 'Grows words in the greenhouse: word rounds, look-alike twins, borrowed words and roots.',
  }),
  freeze({
    id: 'mochi', name: 'Mochi', creature: 'slate pebble', subject: 'Para summary and paragraph completion',
    home: 'the cabin', gift: 'notes', giftOne: 'note', colour: '#7D8FA8', frame: freeze([1040, 335]),
    places: freeze(['table']), modules: freeze(['ps', 'pc']),
    blurb: 'Finds the gist: summaries, and the sentence a paragraph is missing.',
  }),
  freeze({
    id: 'ginger', name: 'Ginger', creature: 'terracotta fox', subject: 'Para jumbles and sentence placement',
    home: 'the workshop', gift: 'maps', giftOne: 'map', colour: '#D2693A', frame: freeze([1380, 397]),
    places: freeze(['loom']), modules: freeze(['pj', 'sp']),
    blurb: 'Maps how a paragraph goes: jumbled sentences, and the one seat a sentence can take.',
  }),
  freeze({
    id: 'mallow', name: 'Mallow', creature: 'dusty-blue cloud', subject: 'Odd one out',
    home: 'the observatory', gift: 'stardust', giftOne: 'pinch of stardust', colour: '#93AED1', frame: freeze([1780, 392]),
    places: freeze(['bench']), modules: freeze(['ooo']),
    blurb: 'Watches the sky for the star that does not belong: the sentence that is out of place.',
  }),
]);

export const PET_BY_ID = new Map(PETS.map((p) => [p.id, p]));

/** Each pet needs the gift of the pet before it. */
export const RING = freeze(['matcha', 'chai', 'mochi', 'ginger', 'mallow', 'toffee']);
export function supplierOf(id) { const i = RING.indexOf(id); return i < 0 ? null : RING[(i + RING.length - 1) % RING.length]; }
export function successorOf(id) { const i = RING.indexOf(id); return i < 0 ? null : RING[(i + 1) % RING.length]; }

const MODULE_PET = new Map(PETS.flatMap((p) => p.modules.map((m) => [m, p.id])));
const PLACE_PET = new Map(PETS.flatMap((p) => p.places.map((s) => [s, p.id])));
/** rc (an RC session has no module; callers pass 'rc'), rc2, cr → chai; lex, garden, wd, wb → matcha; … */
export function petForModule(mod) { return MODULE_PET.get(mod) ?? null; }
export function petForPlace(slug) { return PLACE_PET.get(slug) ?? null; }
/** The pet's own place, where a wish sends the learner. */
export function homeHref(id) { const p = PET_BY_ID.get(id); return p ? `#/world/place/${p.places[0]}` : '#/world'; }

export const GIFTS = freeze({
  sparks: freeze({ name: 'Sparks', one: 'spark', pet: 'toffee' }),
  stories: freeze({ name: 'Stories', one: 'story', pet: 'chai' }),
  leaves: freeze({ name: 'Leaves', one: 'leaf', pet: 'matcha' }),
  notes: freeze({ name: 'Notes', one: 'note', pet: 'mochi' }),
  maps: freeze({ name: 'Maps', one: 'map', pet: 'ginger' }),
  stardust: freeze({ name: 'Stardust', one: 'pinch of stardust', pet: 'mallow' }),
});
export const GIFT_KEYS = freeze(Object.keys(GIFTS));

export const MOOD_WORDS = freeze(['glowing', 'happy', 'missing', 'sleepy', 'wilting', 'new']);

/* ------------------------------------------------------------------ */
/* The voice                                                           */
/* ------------------------------------------------------------------ */

export const LINES = freeze({
  mood: {
    glowing: {
      toffee: [
        'The fire is roaring. The whole village can feel it.',
        'Sparks up to the treetops. You have been keeping this fire well.',
        'Everyone keeps drifting over to warm their paws. That is your fire.',
      ],
      chai: [
        'Every shelf feels a little warmer lately. You have been reading closely.',
        'I marked a page for you. It argues with itself, and I think you will enjoy that.',
        'Your reading has a steady rhythm now. I can hear it from the top shelf.',
      ],
      matcha: [
        'The greenhouse is bursting. Every word you planted has put out new leaves.',
        'Look at all these sprouts. Words grow fast when they get sun every day.',
        'I could hardly find room for the new words. What a lovely problem to have.',
      ],
      mochi: [
        'Clear notes. Clean gists. Good.',
        'My notebook is full of your summaries. I like them.',
        'You find the point quickly now. I noticed.',
      ],
      ginger: [
        'Every route you drew lately went straight to the end. Not one wasted step.',
        'My maps are covered in your trails. The workshop has never looked better.',
        'You read the signposts fast now. Opening, link, link, close. Lovely.',
      ],
      mallow: [
        'The sky has been so clear lately. Every odd star stands out for you.',
        'My telescope keeps finding new constellations. You helped draw them.',
        'Stardust everywhere. I keep sneezing sparkles.',
      ],
    },
    happy: {
      toffee: [
        'Pull up a log. The fire is steady and the kettle is on.',
        'The village is cosy today. Fancy a run through the Gauntlet?',
        'Warm fire, warm hands. Good to see you.',
      ],
      chai: [
        'A new passage came in today. It is short, and it hides its point well.',
        'I kept a ribbon in the book we read last. Shall we open it again?',
        'Good to see you. The library is quiet, which is how I like it.',
      ],
      matcha: [
        'The soil is warm and the seed trays are ready. Twelve words, whenever you like.',
        'A few words came up overnight. They would love a look from you.',
        'Hello, gardener. The meadow is green and humming.',
      ],
      mochi: [
        'A paragraph is waiting. Find its gist.',
        'Tea is warm. Notebook is open.',
        'Hello. One paragraph, one point.',
      ],
      ginger: [
        'Fresh trail today. Four sentences, one true route through them.',
        'I have a jumble on the bench. Want to find the path?',
        'Hello, navigator. The compass is pointing your way.',
      ],
      mallow: [
        'Five stars, and one of them a stranger. Shall we find it?',
        'I mapped a new constellation. One star does not quite fit.',
        'The telescope is warm and the sky is open.',
      ],
    },
    missing: {
      toffee: [
        'I keep looking up whenever the path creaks. Hoping it is you.',
        'The fire is fine. It just burns brighter with company.',
        'I saved the best log for when you come by.',
      ],
      chai: [
        'I saved your chair by the window. The passages have been piling up, gently.',
        'The library has been very quiet. I read aloud to the shelves, but they never answer.',
        'There is a passage I keep wanting to show you.',
      ],
      matcha: [
        'The seedlings keep leaning toward the door, waiting for you.',
        'I watered the words myself, but they grow best when you visit.',
        'Some of the newer words are getting thirsty.',
      ],
      mochi: [
        'The notebook has empty pages. I kept them for you.',
        'Quiet here. Maybe too quiet.',
        'I wrote you a note. Then I put it back.',
      ],
      ginger: [
        'The trail markers are getting overgrown. I could use a scout.',
        'I keep drawing routes alone. They come out better with you.',
        'There is a paragraph out there with no map yet.',
      ],
      mallow: [
        'I keep watching the path from the observatory. Just in case.',
        'The stars drift on without you. They seem a little lost.',
        'There is a stray star I saved for you to find.',
      ],
    },
    sleepy: {
      toffee: [
        'Down to a low glow. A quick run would stir it up.',
        'The embers are drowsy, and so am I.',
        'Toss me a little something and I will flicker right up.',
      ],
      chai: [
        'Mm. I dozed off over a footnote. A passage together would wake me.',
        'The lamp is low and the pages are dusty. One short read would help.',
        'I have been on the same line for a while. It needs a second pair of eyes.',
      ],
      matcha: [
        'The greenhouse is a bit dim. A short round would let the light back in.',
        'My leaves are drooping a little. Nothing a few words cannot fix.',
        'I napped in a flowerpot. The words did too.',
      ],
      mochi: [
        'Mm. Sleepy. A summary would help.',
        'My pencil is getting blunt. One paragraph?',
        'Resting by the window. Waiting for a gist.',
      ],
      ginger: [
        'Curled up by the gears. A quick route would get me moving.',
        'My compass is spinning slowly. One jumble would set it straight.',
        'The workshop is ticking quietly. Not much to map lately.',
      ],
      mallow: [
        'Floating low today. A little stargazing would lift me.',
        'The telescope is fogging up. One set would clear it.',
        'I dreamed of a sentence that did not belong. Then I dozed off again.',
      ],
    },
    wilting: {
      toffee: [
        'Just embers now. But embers remember how to be a fire.',
        'I am keeping one coal warm for you. It is enough to start again.',
        'Quiet fire. Sit with me when you can.',
      ],
      chai: [
        'The library lamps went out a while ago. I kept your bookmark where you left it.',
        'I am still here, between the shelves. Any passage, any length, whenever you like.',
        'The books miss being opened. So do I, a little.',
      ],
      matcha: [
        'The trays have dried out, but roots remember. A little water brings them back.',
        'Things have gone quiet in here. One round would start the green again.',
        'I kept the seeds safe for you. They are ready when you are.',
      ],
      mochi: [
        'The cabin is dark. Still here, though.',
        'No notes for a while. One would be enough.',
        'I kept your seat. It is still yours.',
      ],
      ginger: [
        'The gears have stopped turning. One small trail would start them again.',
        'Maps rolled up, lamp out. I can unroll them for you any time.',
        'The routes are all still here, waiting to be walked.',
      ],
      mallow: [
        'The dome is closed and the sky is grey. One look up would open it.',
        'I am a very small cloud right now. Come by when you can.',
        'The constellations are still there, behind the clouds.',
      ],
    },
    new: {
      toffee: [
        'Oh, hello. Come and sit by the fire. I am Toffee.',
        'I keep the fire, and the fire keeps the village.',
        'Everyone here is glad you came. Me most of all.',
      ],
      chai: [
        'Oh, a reader. I am Chai. I keep the passages, and I have a short one for you.',
        'Welcome to the library. Every passage here has one point it is trying to make.',
        'I have been hoping someone would come and read with me.',
      ],
      matcha: [
        'Hi, I am Matcha. I grow words here, and I saved you a seed.',
        'Welcome to the greenhouse. Every word you learn gets a pot of its own.',
        'Plant one root and a whole family of words comes up. Want to see?',
      ],
      mochi: [
        'Hello. I am Mochi. I find the point of things.',
        'Every paragraph has one idea. I help you find it.',
        'Sit down. There is tea, and a paragraph.',
      ],
      ginger: [
        'Oh, a traveller. I am Ginger. I map how paragraphs go.',
        'Every paragraph is a trail. Want to find where it starts?',
        'Welcome to the workshop. Sentences in, routes out.',
      ],
      mallow: [
        'Hello, star-friend. I am Mallow. I find the one that does not belong.',
        'Welcome to the observatory. Every set of sentences is a little constellation.',
        'Come look through the telescope. One star is always pretending.',
      ],
    },
  },
  /** Matcha, when the reviews pile up (spec §2.2). */
  fading: [
    'Some of our words are fading. A quick round would bring their colour back.',
    'A few old words are curling at the edges. They only need a little attention.',
    'The words you grew are asking for water. Revisiting them keeps them for good.',
  ],
  tap: {
    toffee: ['Warm, is it not?', 'Careful, I crackle.', 'The fire says hello.', 'Sit a while.'],
    chai: [
      'Hoo. Gently, I am mid-chapter.',
      'The shortest passages often hide the sharpest points.',
      'I underline everything. It is a problem.',
      'Read the question, then the passage, then the question again.',
    ],
    matcha: ['That tickles. I am mostly leaf.', 'Every word is a seed. Some take a while.', 'Hello. Did you bring sunshine?', 'Roots first, then flowers.'],
    mochi: ['Hm.', 'Gist first.', 'Still here.', 'Tea?'],
    ginger: ['Quick, this way.', 'Every jumble has an opening. Find it first.', 'Watch the pronouns. They point the way.', 'I have a map for that.'],
    mallow: ['Oh. You startled a star.', 'Soft, I am mostly cloud.', 'One of these things is not like the others.', 'Shh. The sky is thinking.'],
  },
  /** On the notice board after a day or more away (spec §2.8). */
  letter: {
    toffee: 'Kept the fire going while you were away. There is a warm spot by the logs for you.',
    chai: 'I kept your page marked and the lamp trimmed. The library is ready when you are.',
    matcha: 'The greenhouse missed you. I left the door open so the words could see you coming.',
    mochi: 'Notebook open. Tea warm. Glad you are back.',
    ginger: 'I chalked a trail from the gate to the workshop. Follow it whenever you like.',
    mallow: 'I counted stars while you were gone. I saved the brightest one for you.',
  },
  /** One pet talking about another, by that pet's mood word. */
  gossip: {
    glowing: ['{name} has been humming all day. Have you noticed?', 'Have you seen {name} lately? Practically sparkling.'],
    happy: ['{name} seems in good spirits.', 'I passed {name} on the path. All smiles.'],
    missing: ['Have you seen {name}? Quiet lately.', '{name} keeps looking toward the cottage.'],
    sleepy: ['{name} dozed off by the door again.', 'I think {name} could use a visit.'],
    wilting: ['{name}\'s windows have been dark for a while.', 'I worry about {name} a little. Maybe drop by?'],
    new: ['Have you met {name} yet? Lovely company.', '{name} has been hoping to meet you.'],
  },
  /** The ring line on a pet card: the supplier's gift is fresh, or running low. */
  ringFull: [
    'Working at full speed, with fresh {gift} from {supplier}.',
    '{supplier} keeps the {gift} coming. Everything here runs at full speed.',
  ],
  ringLow: [
    'Working slowly. {supplier} has run low on {gift}.',
    'Working slowly until {supplier} has more {gift} to share.',
  ],
  /** Toffee's welcome on the first visit (spec §3.6). */
  intro: [
    'Oh — hello. This is your village.',
    'Six of us live here, and each of us looks after one part of CAT English.',
    'Come and meet Chai at the library. She has a short passage waiting.',
  ],
});

/** One line per heart: a tiny arc of each pet's story. */
export const STORIES = freeze({
  toffee: [
    'I was the first spark of the first fire in this village. Everyone else came after.',
    'Every pet here found the village by following my light.',
    'On cold nights I burn a bit brighter, so no one feels far from home.',
    'Mallow\'s stardust gives me my colours. Without it I am just orange.',
    'You are part of the fire now. I feel it every time you come back.',
  ],
  chai: [
    'I hatched in a library. The first thing I ever saw was a book left open.',
    'For years I read every page twice: once for the words, once for what they meant.',
    'My first reader left one autumn. I kept the passage we never finished.',
    'I stopped counting the books I have read. Now I count the readers I read with.',
    'That passage we never finished? I think you are the one to finish it with me.',
  ],
  matcha: [
    'I started as a seed someone dropped on the greenhouse floor. Lucky floor.',
    'The first word I ever grew was "ephemeral". It did not last, which felt right.',
    'Toffee keeps the greenhouse warm in winter. I owe that fire every leaf.',
    'Words wilt if no one says them. So I talk to mine, out loud, every morning.',
    'This greenhouse used to be half empty. Now there is a pot with your name on it.',
  ],
  mochi: [
    'I was a river stone once. The water taught me to be smooth and say little.',
    'Someone left a notebook by the river. I have been writing in it ever since.',
    'I wear glasses because the important part is usually small.',
    'Chai reads me the long ones. I tell her the point. We are a good team.',
    'My notebook has a page just for you. It says: finds the point.',
  ],
  ginger: [
    'I was born lost. Truly. That is why I started drawing maps.',
    'My first map was of my own den. I still got lost in it.',
    'I built the workshop gear by gear, one for every route I found.',
    'Mochi\'s notes are the best maps I have ever read. Do not tell Mochi I said so.',
    'There is one map I keep in my coat. It shows the way to your door.',
  ],
  mallow: [
    'I drifted in on a summer wind and got caught on the observatory roof.',
    'The old astronomer let me stay, as long as I kept the lens dry.',
    'I learned the sky by finding the star that did not belong. There is always one.',
    'Ginger draws the routes, and I watch for whatever wanders off them.',
    'When I feel small, I remember: the odd star is still a star.',
  ],
});

/* ------------------------------------------------------------------ */
/* Picking a line                                                      */
/* ------------------------------------------------------------------ */

const pick = (pool, seed) => (pool?.length ? pool[Math.floor(rng(String(seed))() * pool.length)] : '');
const fill = (t, vars) => t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/**
 * A deterministic line: the same pet, kind and seed always say the same thing.
 * @param {string} petId
 * @param {string} kind  a mood word, 'tap', 'fading' (Matcha) or 'letter'
 */
export function lineFor(petId, kind, seed = '') {
  if (kind === 'letter') return LINES.letter[petId] ?? '';
  if (kind === 'tap') return pick(LINES.tap[petId], `${petId}:tap:${seed}`);
  if (kind === 'fading') return pick(LINES.fading, `${petId}:fading:${seed}`);
  return pick(LINES.mood[kind]?.[petId] ?? LINES.mood.happy[petId], `${petId}:${kind}:${seed}`);
}

/** A line about another pet, by that pet's mood word. */
export function gossipLine(aboutId, word, seed = '') {
  return fill(pick(LINES.gossip[word] ?? LINES.gossip.happy, `gossip:${aboutId}:${seed}`), { name: PET_BY_ID.get(aboutId)?.name ?? '' });
}

/** The ring line on a pet card: is the supplier's gift fresh? */
export function ringLine(petId, full, seed = '') {
  const sup = PET_BY_ID.get(supplierOf(petId));
  if (!sup) return '';
  return fill(pick(full ? LINES.ringFull : LINES.ringLow, `ring:${petId}:${seed}`), { supplier: sup.name, gift: GIFTS[sup.gift].name.toLowerCase() });
}
