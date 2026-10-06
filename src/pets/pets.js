/**
 * pets.js — the seven friends of the village: who they are, what each one
 * teaches, who their best friend is, what is troubling them, and every
 * line they can say. Pure data and a few lookups; no DOM, no storage.
 *
 * The story in one breath: the village is losing its words. Every round
 * you finish with a friend brings some of theirs back, and their home
 * shows it.
 *
 * Copy rules (tools/check-pets.mjs enforces them): at most 96 characters,
 * no em dashes, never wrong / failure / failed / mistake / poor / weak /
 * bad / careless / study / score / XP / "level up" / "unlocked". The
 * friends are warm and excited to see you; they never grade and never guilt.
 */

import { rng } from '../world/engine/palette.js';

const freeze = (o) => Object.freeze(o);

/* Each friend IS their subject (owner, 2026-10-03: "their allotted subject
   is how they actually are"): the bookworm keeps Reading, the tidy fox keeps
   Para Jumbles, the one who says it short keeps Para Summary, the mouse who
   finishes your sentences keeps Para Completion. `tag` is that
   personality in a breath; `meet` (LINES) is how they say it themselves. */
export const PETS = freeze([
  freeze({
    id: 'toffee', name: 'Toffee', creature: 'flame spirit', subject: 'Daily streak and the Gauntlet',
    tag: 'Never misses a day. Ever.', item: 'a party hat', charm: 'spark',
    teaches: 'The daily fire and the weekly Gauntlet', home: 'the campfire', icon: 'sparks', colour: '#E9963A', frame: freeze([0, 350]),
    places: freeze(['wilds', 'hearth']), modules: freeze(['gauntlet']), bff: 'matcha',
    trouble: 'The fire is the heart of the village. It burns as long as you come back each day.',
    blurb: 'Keeps the village fire. Come back every day and it never goes out.',
  }),
  freeze({
    id: 'chai', name: 'Chai', creature: 'owl', subject: 'Reading comprehension',
    tag: 'Has read every book in the village. Twice.', item: 'a scholar\'s cap', charm: 'book',
    teaches: 'Reading passages and their questions', home: 'the library', icon: 'stories', colour: '#A9825A', frame: freeze([355, 330]),
    places: freeze(['reading-room']), modules: freeze(['rc', 'rc2', 'cr']), bff: 'mochi',
    trouble: 'The pages in her library are going blank. Every passage you read brings words back.',
    blurb: 'Keeps the library. Reads passages with you and helps you find what they really say.',
  }),
  freeze({
    id: 'matcha', name: 'Matcha', creature: 'sprout', subject: 'Vocabulary',
    tag: 'Collects words the way others collect stickers.', item: 'a flower crown', charm: 'leaf',
    teaches: 'Words, roots and word parts', home: 'the greenhouse', icon: 'leaves', colour: '#7FA65A', frame: freeze([700, 338]),
    places: freeze(['meadow', 'pond', 'thicket', 'rootwood', 'terraces']), modules: freeze(['lex', 'garden', 'wd', 'wb']), bff: 'toffee',
    trouble: 'The word garden is wilting. Every word you learn waters a pot.',
    blurb: 'Grows words in the greenhouse: word rounds, look-alike twins, borrowed words and roots.',
  }),
  freeze({
    id: 'mochi', name: 'Mochi', creature: 'pebble', subject: 'Para summary',
    tag: 'Says it short. Gets to the point.', item: 'a beret', charm: 'notebook',
    teaches: 'Finding the point of a paragraph', home: 'the cabin', icon: 'notes', colour: '#7D8FA8', frame: freeze([1040, 335]),
    places: freeze(['table']), modules: freeze(['ps']), bff: 'chai',
    trouble: 'His notebook lost its notes. Every summary you find writes a page back.',
    blurb: 'Finds the gist: reads a long paragraph and keeps only the point.',
  }),
  freeze({
    id: 'ginger', name: 'Ginger', creature: 'fox', subject: 'Para jumbles and placement',
    tag: 'Cannot stand a mess. Knows where everything goes.', item: 'workshop goggles', charm: 'map',
    teaches: 'Putting sentences in order', home: 'the workshop', icon: 'maps', colour: '#D2693A', frame: freeze([1380, 397]),
    places: freeze(['loom', 'placement']), modules: freeze(['pj', 'sp']), bff: 'mallow',
    trouble: 'The workshop gears are stuck. Every jumble you put in order turns one again.',
    blurb: 'Maps how a paragraph goes: jumbled sentences, and the one seat a sentence can take.',
  }),
  freeze({
    id: 'mallow', name: 'Mallow', creature: 'cloud', subject: 'Odd one out',
    tag: 'Spots the one thing that does not belong. Every time.', item: 'a stargazer\'s hat', charm: 'star',
    teaches: 'Spotting the sentence that does not belong', home: 'the observatory', icon: 'stardust', colour: '#93AED1', frame: freeze([1780, 392]),
    places: freeze(['bench']), modules: freeze(['ooo']), bff: 'ginger',
    trouble: 'The stars went dim. Every odd one out you spot lights one again.',
    blurb: 'Watches the sky for the star that does not belong: the sentence that is out of place.',
  }),
  freeze({
    id: 'sesame', name: 'Sesame', creature: 'mouse', subject: 'Para completion',
    tag: 'Finishes your sentences. Spots the missing piece.', item: 'a tiny top hat', charm: 'puzzle piece',
    teaches: 'Finding the sentence a paragraph is missing', home: 'the clock tower', icon: 'pieces', colour: '#9A889E', frame: freeze([0, 416]),
    places: freeze(['completion']), modules: freeze(['pc']), bff: 'mochi',
    trouble: 'The clock tower stopped ticking. Every gap you fill puts a missing cog back.',
    blurb: 'Keeps the clock tower. Finds the sentence a paragraph is missing, and why it fits.',
  }),
]);

export const PET_BY_ID = new Map(PETS.map((p) => [p.id, p]));

/**
 * Every house in the village holds one CAT VARC subject, and its sign says
 * which (owner, 2026-10-03: "all houses must be filled up with only VARC
 * subjects"). `spot` is the building on the painting (paths.js HOMES and
 * PLACES); `place` is the page it opens. Ginger keeps a second house:
 * Sentence Placement in the rose cottage. Sesame keeps Para Completion in the
 * clock tower. Ordered as CAT weights them: reading first.
 */
export const HOUSES = freeze([
  freeze({ spot: 'chai', pet: 'chai', subject: 'Reading Comprehension', place: 'reading-room', home: 'the library', ask: 'A passage and four questions, as CAT sets them' }),
  freeze({ spot: 'ginger', pet: 'ginger', subject: 'Para Jumbles', place: 'loom', home: 'the workshop', ask: 'Put four sentences in the order the author wrote' }),
  freeze({ spot: 'mochi', pet: 'mochi', subject: 'Para Summary', place: 'table', home: 'the archery cabin', ask: 'Choose the summary that keeps the point' }),
  freeze({ spot: 'mallow', pet: 'mallow', subject: 'Odd One Out', place: 'bench', home: 'the observatory', ask: 'Five sentences: find the one that does not belong' }),
  freeze({ spot: 'cottage', pet: 'ginger', subject: 'Sentence Placement', place: 'placement', home: 'the rose cottage', ask: 'Find the one place a sentence fits' }),
  freeze({ spot: 'sesame', pet: 'sesame', subject: 'Para Completion', place: 'completion', home: 'the clock tower', ask: 'Choose the sentence the gap in a paragraph needs' }),
  freeze({ spot: 'matcha', pet: 'matcha', subject: 'Vocabulary', place: 'meadow', home: 'the greenhouse', ask: 'CAT words, many inside a real sentence' }),
  freeze({ spot: 'toffee', pet: 'toffee', subject: 'The Gauntlet', place: 'wilds', home: 'the campfire', ask: 'A weekly timed mix: thirty quick questions' }),
]);

/**
 * What each house gains at each of its ten stages (src/home/houses.js draws
 * them): the house grows with its own section, so a learner can see on the
 * map which parts of VARC they have worked at. Index 0 is stage 1.
 */
const TOP3 = (home) => ['golden dust in the air', `a golden glow round ${home}`, 'a crown of light over the roof'];
export const HOUSE_GROWTH = freeze({
  chai: freeze(['smoke from the chimney and a lamp by the door', 'lights in every window and the first flowers', 'a stack of books by the steps', 'bunting over the door', 'pages that float out to read', 'birds on the roof', 'words rising from the open book', ...TOP3('the library')]),
  ginger: freeze(['the big gear turns again', 'lights in the windows and the first flowers', 'a crate of brass cogs, and the wheels turn', 'fairy lights over the door', 'a windmill on the roof', 'birds on the roof', 'a balloon on a long rope', ...TOP3('the workshop')]),
  mochi: freeze(['smoke from the chimney and a lamp by the door', 'a light in the window and the first flowers', 'tea for two by the door', 'pennants along the fence', 'arrows that find the bullseye', 'birds on the roof', 'a weathervane on the roof', ...TOP3('the cabin')]),
  mallow: freeze(['the telescope sweeps the sky again', 'lights in the windows and the first flowers', 'a little telescope on the terrace, and the brass globe turns', 'star lanterns on the railing', 'a model of the sky that turns', 'birds on the dome', 'a constellation after dark', ...TOP3('the observatory')]),
  cottage: freeze(['tea steaming on the patio, smoke from the chimney', 'lights in the windows and more flowers', 'a basket of cut roses', 'fairy lights over the patio', 'rose petals on the breeze', 'birds on the roof', 'lanterns along the dock', ...TOP3('the cottage')]),
  sesame: freeze(['the clock ticks again and the banners wave', 'lights in the windows and the first flowers', 'a cart of cogs and pots of lavender', 'bunting over the door', 'the bell rings out', 'pigeons on the roof', 'more pigeons, who fly when the bell rings', ...TOP3('the clock tower')]),
  matcha: freeze(['the stove warms the greenhouse', 'lights in the glass and the first flowers', 'pots of new sprouts', 'fairy lights along the glass', 'sunflowers by the fence', 'birds on the roof', 'bees, a sprinkler and giant pumpkins', ...TOP3('the greenhouse')]),
  toffee: freeze(['the lanterns by the board light up', 'the first flowers round the camp', 'a log bench by the fire', 'fairy lights over the board', 'lanterns round the camp', 'birds on the board', 'fireworks after dark', ...TOP3('the camp')]),
});
/** What stage `stage` puts on house `spot` ('' outside 1 to 10). */
export function houseGift(spot, stage) { return HOUSE_GROWTH[spot]?.[stage - 1] ?? ''; }

/**
 * The friendships, said the way the village says them. Three pairs of best
 * friends, and Sesame, the newest, who adores Mochi next door (Mochi's best
 * friend is still Chai): friendshipOf finds a friend's own best friendship.
 */
export const FRIENDSHIPS = freeze([
  freeze({ a: 'chai', b: 'mochi', line: 'Reading buddies. Chai reads the long ones, Mochi finds the point.' }),
  freeze({ a: 'ginger', b: 'mallow', line: 'Best friends. Ginger draws the maps, Mallow spots what wanders off them.' }),
  freeze({ a: 'matcha', b: 'toffee', line: 'Toffee keeps the greenhouse warm all winter, so Matcha adores Toffee.' }),
  freeze({ a: 'mochi', b: 'sesame', line: 'Neighbours down the hill. Mochi finds the point, Sesame finds the missing piece.' }),
]);
export function friendshipOf(id) {
  const bff = PET_BY_ID.get(id)?.bff;
  return FRIENDSHIPS.find((f) => (f.a === id && f.b === bff) || (f.b === id && f.a === bff)) ?? null;
}

const MODULE_PET = new Map(PETS.flatMap((p) => p.modules.map((m) => [m, p.id])));
const PLACE_PET = new Map(PETS.flatMap((p) => p.places.map((s) => [s, p.id])));
/** rc (an RC session has no module; callers pass 'rc'), rc2, cr → chai; lex, garden, wd, wb → matcha; … */
export function petForModule(mod) { return MODULE_PET.get(mod) ?? null; }
export function petForPlace(slug) { return PLACE_PET.get(slug) ?? null; }
/** The pet's own place. */
export function homeHref(id) { const p = PET_BY_ID.get(id); return p ? `#/world/place/${p.places[0]}` : '#/world'; }

export const MOOD_WORDS = freeze(['glowing', 'happy', 'missing', 'sleepy', 'wilting', 'new']);

/* ------------------------------------------------------------------ */
/* What each friend needs, chapter by chapter (one chapter per heart)  */
/* ------------------------------------------------------------------ */

export const REQUESTS = freeze({
  chai: [
    'My pages are going blank! Read one passage with me and the words come back.',
    'The first shelf has its words again! Shall we save the next one?',
    'The reading nook is still dark. One more passage and I can light its lamp.',
    'I found a book I thought was lost forever. Help me read it back to life?',
    'Only one shelf left! Read with me and the whole library will glow.',
  ],
  matcha: [
    'My word garden is wilting! Learn a few words with me and they will bloom again.',
    'Look, a sprout! Words grow so fast when you visit. More water?',
    'The rose bed still droops. A quick word round would perk it right up!',
    'The old words want to be remembered. Shall we water the fading ones?',
    'One more round and the whole greenhouse will be in flower!',
  ],
  mochi: [
    'My notebook went blank. Help me find the point of a paragraph? It writes a page back.',
    'One page back! Tea is warm. Another?',
    'Chai left me a pile of paragraphs. Help me sum them up?',
    'Almost half my notebook is back. You are very good at this.',
    'Last chapter of my notes. Finish it with me?',
  ],
  sesame: [
    'The clock stopped! Fill one gap in a paragraph and I can put a cog back.',
    'Tick! One cog turned! Shall we find the next missing piece?',
    'A paragraph lost its middle sentence. Help me work out what goes in the gap?',
    'The hands are moving again. A few more gaps and the bell will ring!',
    'One last cog and the whole tower chimes. Finish it with me?',
  ],
  ginger: [
    'The workshop gears are stuck! Put a jumbled paragraph in order and one turns again.',
    'Click! A gear turned! Want to try the next trail?',
    'The wind mixed up all my maps. Help me sort a few?',
    'The big wheel is almost free! A couple more and it will spin.',
    'One last gear and the whole workshop runs again. Ready, navigator?',
  ],
  mallow: [
    'The stars went dim! Find the sentence that does not belong and one will shine again.',
    'A star came back! Look, up there! Shall we find another?',
    'My telescope is foggy. Spot a few odd ones out and it will clear up.',
    'A whole constellation is still missing. Help me find it?',
    'One more set and the sky will be full of stars again!',
  ],
  toffee: [
    'Keep me burning! Help any friend today and the fire stays bright.',
    'Two days of fire! Come back tomorrow and it grows even taller.',
    'The fire is getting big! Every day you come, the whole village feels it.',
    'Look how bright we are! Do not let it go out now.',
    'This is the best fire the village has ever had. All thanks to you!',
  ],
});

/** Said once a friend has all five hearts: the story is done, the friendship is not. */
export const BEST_FRIEND_ASK = freeze({
  chai: 'Every shelf is full, thanks to you. Want to read something new together?',
  matcha: 'The greenhouse is blooming! Let us keep the words fresh. Just a little round?',
  mochi: 'Notebook full. Still love doing this with you. One more?',
  ginger: 'The workshop hums all day now. Shall we chase a tricky trail for fun?',
  mallow: 'The sky is full of stars! Let us find the sneakiest odd one yet.',
  sesame: 'The tower chimes every hour now. Want to find a sneaky missing piece together?',
  toffee: 'Best fire ever! Keep coming back and it never goes out.',
});

/** One line per heart: a tiny arc of each friend's story. */
export const STORIES = freeze({
  toffee: [
    'Day one! I was the very first spark of the very first fire in this village.',
    'Every friend here found the village by following my light.',
    'On cold nights I burn extra bright, so no one feels far from home.',
    'Mallow\'s stardust gives me my colours. Without it I am just orange!',
    'You are part of the fire now. I feel it every single time you come back.',
  ],
  chai: [
    'You saved the first shelf! I hatched in this library. It is my whole world.',
    'I read every page twice. Once for the words, once for what they mean.',
    'The reading nook glows again. I used to be scared of how quiet it got.',
    'My first reader left one autumn. I kept the passage we never finished.',
    'Every shelf is full! Will you finish that old passage with me? It has to be you.',
  ],
  matcha: [
    'You watered my first pot! I started as a seed someone dropped on this floor.',
    'The first word I ever grew was "ephemeral". It did not last, which felt right.',
    'Toffee keeps the greenhouse warm all winter. I owe that fire every leaf.',
    'Words wilt if nobody says them, so I talk to mine every morning. Out loud!',
    'The greenhouse is blooming, and there is a pot with your name on it now.',
  ],
  mochi: [
    'You found the point! I was a river stone once. The water taught me to say little.',
    'Someone left this notebook by the river. I have written in it ever since.',
    'I wear glasses because the important part is usually small.',
    'Chai reads me the long ones. I tell her the point. Best team in the village.',
    'My notebook has a page just for you now. It says: finds the point. Every time.',
  ],
  ginger: [
    'You got a gear turning! I was born lost, truly. That is why I draw maps.',
    'My first map was of my own den. I still got lost in it. Twice.',
    'I built every gear in here myself, one for each route I ever found.',
    'Mallow spots whatever wanders off my maps. Best friends since the windy summer.',
    'There is a map I keep in my coat. It shows the way to your door.',
  ],
  mallow: [
    'You lit a star! I drifted in on a summer wind and got stuck on this roof.',
    'The old astronomer let me stay, as long as I kept the lens dry.',
    'I learned the sky by finding the star that does not belong. There is always one.',
    'Ginger draws the routes, and I watch for whatever wanders off them.',
    'When I feel small, I remember you. And that the odd star is still a star.',
  ],
  sesame: [
    'You found the missing piece! I ran up this clock one day and never came back down.',
    'Hickory, dickory, dock. That rhyme is about my great-great-grandmother. True story.',
    'I mend gaps. A missing cog, a missing button, a missing sentence. Same thing, really.',
    'Mochi finds the point and I find what is missing. Between us, nothing gets lost.',
    'There is a cog in the big clock with your name on it. It is the one that never stops.',
  ],
});


/* ------------------------------------------------------------------ */
/* Growing up: ten stages per friend                                   */
/* ------------------------------------------------------------------ */

/**
 * A friend grows as you work through their subject (economy.js stageOf):
 * stage 1 is the first question you get right, stage 10 is every question
 * in the subject. Each stage has a name, and each one shows on the friend
 * (src/pets/sprite.js petGear), so every stage is something you can see.
 */
export const STAGE_TITLES = freeze({
  toffee: freeze(['Spark', 'Ember', 'Party Flame', 'Campfire', 'Torch', 'Blaze', 'Bonfire', 'Beacon', 'Sunburst', 'Eternal Flame']),
  chai: freeze(['Page Turner', 'Bookworm', 'Scholar', 'Speed Reader', 'Story Sleuth', 'Professor', 'Wise Owl', 'Head Librarian', 'Grand Sage', 'Keeper of Every Book']),
  matcha: freeze(['Seedling', 'Sprout', 'First Bloom', 'Word Gardener', 'Word Collector', 'Wordsmith', 'Walking Dictionary', 'Word Wizard', 'Lexicon Legend', 'Master of Words']),
  mochi: freeze(['Pebble', 'Notetaker', 'Long Story Short', 'Gist Finder', 'Point Maker', 'Editor', 'The Big Picture', 'Five-Word Wonder', 'Grand Summariser', 'Master of the Point']),
  ginger: freeze(['Tidier', 'Sorter', 'Tinkerer', 'Mapmaker', 'Puzzle Solver', 'Pathfinder', 'Master Builder', 'Navigator', 'Order Keeper', 'Master of Order']),
  mallow: freeze(['Cloud Watcher', 'Star Spotter', 'Stargazer', 'Sharp Eye', 'Odd Hunter', 'Sky Detective', 'Eagle Eye', 'Night Watcher', 'Star Sage', 'Master Spotter']),
  sesame: freeze(['Squeaker', 'Gap Spotter', 'Cog Fixer', 'Puzzle Piece', 'Clock Winder', 'Thread Finder', 'Missing Link', 'Bridge Builder', 'Master Mender', 'Keeper of the Clock']),
});

/**
 * How grown up a friend is, as a new player reads it (owner, 2026-10-05:
 * "your understanding of this subject is growing, so your character is
 * growing too"). A new village is all babies (src/pets/sprite.js draws them
 * from the baby sheets, small); at stage 3 a friend grows into their own face
 * and hat, and at stage 7 they are full size. Stages are real work in their
 * subject (economy.js stageOf), never time.
 */
export const AGES = freeze([
  freeze({ id: 'baby', from: 0, name: 'Baby', line: '{name} is still little.', grew: '{name} grew!' }),
  freeze({ id: 'young', from: 3, name: 'Growing up', line: '{name} is growing up.', grew: '{name} is growing up!' }),
  freeze({ id: 'grown', from: 7, name: 'Grown up', line: '{name} is all grown up, thanks to you.', grew: '{name} is all grown up!' }),
]);
/** The age a stage falls in. */
export function ageOf(stage) { return AGES.findLast((a) => (Number(stage) || 0) >= a.from) ?? AGES[0]; }
/** What to say when a friend grows from stage `from` to `to`: "Chai is growing up!" on the stage that changes their age. */
export function grewLine(id, from, to) {
  const a = ageOf(to);
  return fill(a.id === ageOf(from).id ? AGES[0].grew : a.grew, { name: PET_BY_ID.get(id)?.name ?? '' });
}
/** What one more stage takes, in the friend's own unit: "4 more right answers". */
export function toGrow(n, unit) {
  const [one, many] = unit === 'words' ? ['word', 'words'] : unit === 'days' ? ['day of practice', 'days of practice'] : ['right answer', 'right answers'];
  return `${n} more ${n === 1 ? one : many}`;
}

/** What each stage puts on a friend, in order (stage 1 first). */
const GROWTH = ['a twinkle over {name}\'s head', '{name} grew bigger', '{item}', 'a glowing ring of light', 'a floating {charm}', 'gold trim and a growth spurt', 'a trail of sparkles', 'a second {charm}', 'a golden aura', 'a crown of stars'];

/** The name of a friend's stage ('' before stage 1). */
export function stageTitle(id, stage) { return STAGE_TITLES[id]?.[stage - 1] ?? ''; }

/** What reaching `stage` gave the friend, in words ("a floating book"). */
export function stageGift(id, stage) {
  const p = PET_BY_ID.get(id);
  const t = GROWTH[stage - 1];
  return p && t ? fill(t, { name: p.name, item: p.item, charm: p.charm }) : '';
}

/* ------------------------------------------------------------------ */
/* The voice                                                           */
/* ------------------------------------------------------------------ */

export const LINES = freeze({
  /** A friend glad to see you, on their card. */
  hello: {
    toffee: [
      'There you are! Come warm your hands.',
      'Hi hi! The fire is so happy you came.',
      'Ooh, a visitor! Sit with me a while!',
      'You made it! My sparks are doing a little dance.',
      'Look who it is! Pull up a log. Mind the sparks.',
      'Hi hi! I got so excited my sparks went up three feet.',
      "Ready for a Gauntlet? No rush. I'm just happy you're here!",
      'The fire is crackling in your honour. Mostly it crackles anyway.',
      'Sit, sit! I saved the best log for you. It only smokes a little.',
    ],
    chai: [
      'Hoo! You came! I saved you the comfy chair.',
      'Oh, it is you! I was hoping you would drop by.',
      'Welcome back, reader! I have a good one today.',
      'A visitor! Perfect. I just found a sentence with a secret in it.',
      'Sit, sit! The lamp is lit and a passage is waiting.',
      "Hello, reader! Today's author is up to something. I can tell.",
      'You came! I kept the last chapter closed until you got here.',
      'Ooh, good timing! I was about to read a paragraph aloud. Dramatically.',
      'Welcome! Library rules: no dog-ears, no spoilers, and yes, hooting.',
    ],
    matcha: [
      'Hi hi! The greenhouse is so happy to see you!',
      'You are here! The sprouts all turned to look.',
      'Hello, gardener! Did you bring sunshine?',
      "Oh, you came! My word for right now is 'delighted'. It fits.",
      'Welcome! I saved you the seat between the fern and the dictionary.',
      "A visitor! Quick, say a word, any word. I'm collecting.",
      "Perfect timing! I was teaching the cactus 'gregarious'. It's not working.",
      "Hello! I rehearsed 'welcome' in six voices. Want the dramatic one?",
      "Hi hi! I invented a word for this: 'glad-you-came'. Hyphens included.",
    ],
    mochi: [
      'Oh! Hello. Glad you came.',
      'You! Good. Tea is warm.',
      'Hello, friend. I kept your seat.',
      'Oh, hi. Short welcome, long friendship.',
      'Summary of this moment: you came. Good.',
      'Hello. I was shortening a paragraph. It can wait.',
      'I poured an extra cup, just in case. Good guess.',
      'Welcome. Pull up a rock. Chairs also work.',
      'Hello. Chai is mid-chapter. I am mid-tea. Join either.',
    ],
    ginger: [
      'Yip! You found the workshop!',
      'Hey, navigator! I was just thinking about you.',
      'You came! Quick, I have a fun one.',
      "Yip! Your cushion was crooked, so now it isn't. You are welcome!",
      'I found a jumble whose opener is hiding in plain sight. Come look!',
      "Welcome to the workshop! Mind the gears. They've been polished.",
      'Oh good, a fresh pair of eyes! I have a tangled paragraph for you.',
      'You came! Goggles are on the hook. Safety first, then sentences.',
      'Ah, perfect. A shuffled paragraph is waiting, and so am I.',
      'Pull up a stool! Careful, the labels are still drying.',
    ],
    mallow: [
      'Oh! Hello, star-friend!',
      'You are here! The sky got brighter just now.',
      'Hi! I was watching the path for you.',
      'You are not the odd one out here. You are the one I hoped for.',
      'I was finding shapes in the clouds. One looked like you. Hello!',
      'Come sit by the telescope. It sees far, but you are nicer to look at.',
      'Hello! Spot anything odd on the way here? I always do.',
      "Company! Hold on, I'm fluffing up. There. Ready.",
      'Welcome! No hurry here. Clouds never rush, and neither do I.',
    ],
    sesame: [
      'Squeak! You came! I was just about to say... you came!',
      'Oh, hello hello! Perfect timing. I would know, I keep the clock.',
      'You are here! The tower felt a little empty without you.',
      'You came! I swept the step. Mind the crumbs, they are mine.',
      'Hello hello! I saved you a gap to fill. A juicy one!',
      'Hi! I was winding the clock. It can wait. Clocks are good at that.',
      'Welcome! Please mind the cogs. They roll. I have chased several.',
      "Hello! I'd finish your sentence, but you haven't started. Take your time!",
      'Pull up a thimble! I have crumbs, buttons and one very small spoon.',
    ],
  },
  /** A friend who has not seen you for a while. Glad, never cross. */
  missed: {
    toffee: [
      'You are back! I kept one coal warm, just for you.',
      'There you are! I knew you would come.',
      "You're back! The fire kept your seat warm. Very warm. Hot, actually.",
      'Hi again! I counted sparks while you were away. Still lots!',
      'Oh, hooray! I told the logs all about you. They crackled.',
      'Hello again! I saved you a log and a very careful hug.',
      'Welcome back! The fire never went out. It just waited, humming.',
      'Coming back is the whole trick! Welcome! The logs missed you.',
    ],
    chai: [
      'You are back! I kept your bookmark exactly where you left it.',
      'Oh, I missed you! The library was so quiet.',
      "Hoo, you're back! Even the cricket I keep shushing was waiting.",
      'I saved the best paragraph for you. Okay, I only read it twice.',
      "You're back! I kept a mystery unsolved for you. No spoilers, promise.",
      'Ah, the next chapter has arrived, and it is you! Hoo hoo!',
      "Oh good, you're back! The lanterns listen well, but never answer.",
    ],
    matcha: [
      'You came back! The seedlings kept leaning toward the door.',
      'Yay! I watered your words while you were gone.',
      "You're back! I saved you the word 'reunion'. It felt right.",
      "I practised 'effervescent' while you were away. I fizzed a little.",
      'Welcome back! The ferns said you would return. They were smug about it.',
      "Hello again! 'Again' is my favourite word right now. It means you're back.",
      'You are back! I was rooting for you the whole time. Pun intended.',
    ],
    mochi: [
      'You are back. Good. I missed this.',
      'Oh! There you are. Kept your seat.',
      'Notebook update: you are back. Written in pen.',
      'Reheated the tea three times. Worth it. Welcome back.',
      'Welcome back. Your page stayed open. It waited well.',
      'Oh! My notebook asked about you. In pencil.',
      'Rolled to the gate to look for you. Uphill is slow.',
    ],
    ginger: [
      'You are back! I chalked a trail to the door for you.',
      'Yip yip! I knew you would find your way back.',
      'Your corner of the workshop is dusted and ready. Welcome back!',
      "Yip! I re-sorted the pencils three times. Now you're back, I can stop.",
      'Welcome back! The best jumble has been waiting under a paperweight.',
      "Oh, hello again! I told the gears you'd be back. They believed me.",
      'Navigator! The map still has your name at the top.',
    ],
    mallow: [
      'You came back! I saved the brightest star for you.',
      'Oh! I kept watching the path. And here you are!',
      'You are back! I counted the stars twice. Different answers. Hello!',
      'Welcome back! I made a cloud shape just for you. It came out a sheep.',
      "There you are! I told the stars you'd be back. They said, obviously.",
      'You came back! Your spot on the bench is still here. I fluffed it.',
      'Hello, you! The sky was thinking while I waited. It says hi too.',
    ],
    sesame: [
      'You are back! There was a you-shaped gap in the village.',
      'Squeak! I saved your spot. It looked very empty.',
      'Oh, you are back! I saved you a crumb. I only nibbled the corner.',
      'Tick, tock, tick... and there you are! My favourite tock yet.',
      'Welcome back! I left the door ajar. Mouse-sized, but it counts.',
      'You are back! I have so much to tell you. First: I found a button.',
      'There you are! I kept the end of your sentence for you. I only peeked.',
    ],
  },
  /** The very first meeting: who they are, then why that is their subject (the intro says both, in order). */
  meet: {
    toffee: ["Hi hi hi! I'm Toffee! I keep the fire going. I haven't missed a day. Not ONE.", "Come back every day and the fire grows. Race me in the Gauntlet too. I always win. Mostly."],
    chai: ["Hoo! I'm Chai. I've read every book in this village. Twice. Even the cookbook.", "Give me any passage and I'll find what the author really meant. That's Reading!"],
    matcha: ["Hello hello! I'm Matcha! Some collect stamps. I collect words!", "Today's favourite word is 'serendipity'. Come grow your words with me!"],
    mochi: ["Mochi. Hi. I keep it short.", "Long paragraph? I find the point. One line. Done. That's Para Summary."],
    ginger: ["I'm Ginger! I sort my socks by colour. Then by mood.", "Shuffled sentences? A sentence with nowhere to go? I know where everything goes!"],
    mallow: ["Hi! I'm Mallow! See those five clouds? One of them is a sheep.", "I always spot the one that doesn't belong. Five sentences, one stranger. Easy!"],
    sesame: ["Squeak! I'm Sesame! I live up in the clock. You were about to say hello. See? Finished it!", "A paragraph with a hole in it? I know exactly what fits. That's Para Completion!"],
  },
  /** On coming back from a run: thank you. */
  thanks: {
    toffee: [
      'The fire roared up! Thank you!',
      'Whoosh! Look at those sparks! Thank you!',
      'Thank you! The fire just grew a whole new flicker!',
      'Ooh, the logs are glowing! Thank you, thank you!',
      'Thanks! Three new sparks hopped out. I counted. Twice!',
      'That was toasty! The logs wrote you a thank-you. In smoke.',
      "Thank you! My hat is glowing. Even I'm surprised.",
      'Crackle, crackle, THANKS! The village feels cosier.',
    ],
    chai: [
      'Thank you! I can read the pages again!',
      'Hoo hoo! The words came back! Thank you!',
      'Thank you! A blank page just filled itself in. I clapped. Quietly.',
      'Thanks to you, a shelf got its words back. I read it aloud. Twice.',
      'A paragraph just returned, twist and all. I gasped. Thank you!',
      'The library rustles with pages again. Thank you, truly. Hoo!',
      "Each passage you read returns a page. Thank you. I'm a rich owl now.",
      'Even the footnotes came back! Thanks. I could cry. I might.',
    ],
    matcha: [
      'Yay! Everything is blooming! Thank you!',
      'Look, new leaves! You did that!',
      'The seeds heard it all and are very impressed. Thank you!',
      'Thanks! The roots went deeper. I felt it in my toes. I have toes.',
      'Thank you! A word you met just bloomed. Third pot from the door.',
      'Thank you! The whole greenhouse did a little dance. Leaves only.',
      'Thanks! My word jar is fuller. My heart is fuller. Mostly the jar.',
      'Gerald says that was riveting. He is easily moved. Thank you!',
    ],
    mochi: [
      'A page came back. Thank you. Really.',
      'Notes! Lovely notes! Thank you.',
      'One page fuller. Thank you.',
      'I read the new page twice. Short. Perfect. Thank you.',
      'Page back. Tea to celebrate. Small cup. Thanks.',
      'Thank you. Notes are back. Chai wants the long version. No.',
      'The notebook is thicker. I am thrilled. Quietly. Thanks.',
      "Thank you. New page. One word: 'Nice.' It took effort.",
    ],
    ginger: [
      'Click! The gears are turning! Thank you!',
      'Yip! The workshop is humming again!',
      'Thank you! Another gear just turned. I felt it in my paws.',
      'Listen to that! The big wheel is humming. Thank you!',
      'A cog clicked into place. My favourite sound. Thank you!',
      'Thanks! I may cry a little. Neatly, into a folded hankie.',
      'Even the stuck gear by the door finally budged. Thank you!',
      'Thank you! I was going to oil the wheels. You beat me to it.',
    ],
    mallow: [
      'A star came back! Thank you!',
      'Look up! It is shining again, thanks to you!',
      'Thank you! A star just blinked on. I think it winked at you.',
      "Thanks! The sky has one more sparkle, and it's yours.",
      'The fog on my telescope is gone. Thank you!',
      'Every stranger you find lights a star. Thank you!',
      'Thank you. I think the stars are whispering about you.',
      "A brand new twinkle! I'm naming it after you. Thank you!",
    ],
    sesame: [
      'Tick, tock! The clock is ticking again! Thank you!',
      'A missing piece, found! Thank you, thank you!',
      'Thank you! A gap closed and a cog clicked back into place.',
      'The tower ticks. I squeak. Together we are a very small band. Thanks!',
      "I'd give you a crumb, but I ate it. Have a squeak instead! Thank you!",
      'Thank you! Both sides of the gap agree now. I agree too. Squeak!',
      'The clock just said thank you in tick. I translated. Me too!',
    ],
  },
  /** Said to nobody in particular while you watch: who they are, out loud (src/home/life.js muse). */
  muse: {
    toffee: [
      'Who wants to race? Anyone? Ready, set... go!',
      'Day after day after day! I love days!',
      'I counted the sparks. Two hundred and twelve!',
      "I'm not hot-headed. I'm just a head. Made of fire.",
      'Crackle crackle! That means hello in fire.',
      'Race you to the pond! Go!',
      'Did you come yesterday? You did! I counted!',
      'Nobody can hold a candle to me. I am the candle!',
      'My hot takes are literally hot. Please stand back a little.',
      'Fire needs heat, fuel and air. And a hat. I checked.',
      'I tried being calm once. Four seconds. Then: crackle!',
      'Achoo! Nine new sparks. Personal best!',
      'Hic! Orange hiccup. I only do orange ones.',
      "I keep my snacks inside me. Mostly logs. Don't ask.",
      "The pond and I had a moment once. We don't talk about it.",
      'My shadow dances. I never taught it. It just knows.',
      'Smoke signals? I send those. They all say: hi hi hi!',
      'Ten minutes a day, thirty days: three hundred minutes. Fire math!',
      'A streak is just days stacked like logs. Stack, stack, stack!',
      'Stuck on one? Skip it, come back. Some logs take a while to catch!',
      'Fast is fine! Just read every option. Even the boring-looking ones.',
      'Kindling first, big logs later. Try an easy one to warm up!',
      'Logs need gaps so air gets through. Breaks between rounds are fine!',
      "Thirty quick questions, every kind: that's the Gauntlet. Whoosh!",
      'Words you meet again after a break stick better. Hello again, word!',
      'Sleep helps memories stick. I never sleep. So I count everything twice.',
      'Burn all your logs at once and you get one big flash. Pace!',
      'Pick the best option, then move on. Dithering is just smoke!',
      'Matcha says I keep the greenhouse warm. I just stand near it.',
      "The clock tower ticks. I crackle. Sesame says we're a band.",
      'Chai says shh. I say crackle. We both mean well.',
      'I wave at the kite. It has never waved first. I wave anyway!',
      "Ginger sorted my logs by size. Now I'm scared to burn them.",
      "Mochi said 'good fire.' Two words! That's a whole speech.",
      "Lanterns think they're small fires. Cute. I let them.",
      'Mallow swears one star looks like me. I checked. It does!',
      'Psst. Matcha is my best friend. You are my best visitor. Different jobs!',
      'Tiny challenge: one question before I count to ten. One... two...',
      "Bet you can't hear a crackle and not smile. Try it! Crackle!",
      "Favourite word? Mine is 'whoosh'. What's yours? I'll wait.",
      "Ask me anything! I'll say 'fire.' It's a very flexible answer.",
      'You look like someone who reads every option. I respect that!',
      "Ready? I'll take your silence as a yes. Fire rules!",
      "Race you to the next question! You go first. I'll cheer loudly.",
      'Brainwave: tiny hats for every spark. Hundreds of hats!',
      "Pun alert: I'm having a ball. A fire ball! Get it? Get it?",
      'Tiny story, Mochi style: spark, log, fire. The end.',
      'If I had a pet, it would be a smaller fire. Toffee Two!',
      "Fire fact! Fire is hot. That's the whole fact. Amazing!",
      'Seven logs. I counted twice. Same seven both times. Wow, logs!',
      "Yes, my name is a sweet. No, don't toast me. I'm the toaster!",
    ],
    chai: [
      'Plot twist: the butler was nice all along.',
      'I just read the back of a jam jar. Twice. Still good.',
      'Every author hides one sentence that matters most. I always find it.',
      "Shh! I'm at the good part.",
      "Owls can't move their eyes. So I turn my whole head. Very dramatic.",
      'Read the question first. Trust me!',
      "I underline everything. It's a problem.",
      'Fun fact: owls have three eyelids. I read that. Twice.',
      "My bookmarks have bookmarks. It's getting out of hand.",
      'Main idea: the whole meal. A detail: one bite.',
      "Mochi summarised my whole library as 'books. Many.' Fair, honestly.",
      "You read with your eyebrows. I've noticed. It suits you.",
      'Owl be right here. Reading. Pun fully intended.',
      'Shushed a cricket. It was reading over my shoulder. Rude.',
      "A 'but' is a door. Watch where the author walks next.",
      'Sesame counts 86,400 seconds a day. I lose count at the prologue.',
      "If my day were a passage, the main idea would be 'one more chapter'.",
      'What if a footnote is just a sentence that got shy?',
      'Read the dictionary once. Huge cast, no plot. Still loved it.',
      'Inferred is what the page all but whispers. Stated is what it prints.',
      "Toffee crackles in rhythm. I'm fairly sure it's a sonnet.",
      "Challenge: say a paragraph's point in six words. I'd need a chapter.",
      "Silence in the library! Except me. I'm narrating.",
      'In an EXCEPT question, three options fit the passage. Hunt the fibber.',
      'Matcha labels every plant with a word. I proofread the labels. Twice.',
      'Missing bookmark? It was in the book. It was always in the book.',
      "Options with 'always', 'never' or 'only' get a second look from me.",
      "Give me a tone word. Mine is 'wry'. It means dryly funny.",
      'Every paragraph has a job. Name the job and you have the map.',
      'Ginger alphabetised my shelves. Dragons now live next to Dentistry.',
      'Chapter one: a frog. Chapter two: the pond. Chapter three: splash.',
      'An example is a witness, not the verdict.',
      'The tea table wobbles. Mochi: character. Me: foreshadowing.',
      'I once cried at an index. Such a clean ending.',
      "What the author reports isn't always what the author believes.",
      "Nosy? No. I'm a thorough reader of everyone's shopping lists.",
      'Tried reading the kite. Lots of tail, very little plot.',
      "Tone hides in small words: 'sadly', 'merely', 'remarkably'.",
      'Lanterns lean in when I read aloud. I swear. Good listeners.',
      'Answer from the passage, even if you know better. The page is the judge.',
      'Old books smell of dust, glue and drama. I checked.',
      "Favourite ending: twist, hug or cliffhanger? I'll take all three.",
      'Ask what the author is up to: arguing, describing, comparing or warning.',
      "Plot twists make me gasp. Even the ones I've read twice.",
      'If a book falls in the library and nobody hears, I still shush it.',
      "'Wistful' means quietly longing. That's me, waiting for a sequel.",
      'Stated: crumbs on the floor. Inferred: Sesame found the cookie.',
      'Could the passage lose this sentence? No? Underline. Yes? Underline lightly.',
      'A group of owls is a parliament. Our debates are mostly about sequels.',
      'Owls fly almost silently. Ideal for a librarian. I hoot to be polite.',
    ],
    matcha: [
      "Word of the day: petrichor! It's the smell of rain. Sniff sniff!",
      "Today's word is ebullient. It means me, right now!",
      "This flower isn't pretty. It's resplendent!",
      'I whisper words to my seeds. They grow faster. Probably.',
      "Quixotic! I don't know what it means yet. I just like saying it.",
      'Did you bring sunshine?',
      'Every word is a seed!',
      'Gosh, you look positively radiant today!',
      "I'm a sprout with a vocabulary. Most sprouts just have a pot.",
      "My favourite word changes hourly. Right now it's gossamer.",
      "The cactus is now labelled 'unapproachable'. It seemed pleased.",
      'Adjectives are my acorns. I bury them, then forget where.',
      'My seeds all have names. Gerald is the dramatic one.',
      "My leaves rustle when I'm excited. Right now: loudly.",
      'Some count sheep. I count synonyms: glad, merry, chipper, jolly, cheery...',
      "'Bloom' is in every sentence I say. It's rooted in my personality.",
      'Sprout life: mostly leaning toward the light. And gossiping.',
      "Meet a word five times and it's yours. I'm on four with 'obstreperous'.",
      'Ephemeral means short-lived. Like this speech bubble. Bye, bubble!',
      "Mellifluous: 'mel' is honey, 'fluere' is flow. A voice like poured honey.",
      'Serendipity is named after Serendip, an old name for Sri Lanka.',
      'Radical comes from Latin radix: root. A radical idea goes to the root.',
      "Kindergarten is German for 'children's garden'. I approve.",
      "English borrowed 'jungle' and 'shampoo' from Hindi. Words travel!",
      "Sesquipedalian means long-worded. Literally 'a foot and a half'. Guilty!",
      'Susurrus: the soft whisper of leaves. Say it. Hear the leaves?',
      'Stuck on a new word? The sentence around it is a free dictionary.',
      'Predict is pre (before) plus dict (say). Saying it before it happens!',
      "Twins! A principle is a rule, and both end in 'le'. Principal means main.",
      "Companion means 'bread-sharer'. Toffee, I'll bring the toast!",
      "'Chai' just means tea. So I'm friends with an owl called Tea. Hoo knew?",
      "Mochi shares a name with a rice cake. I have not checked if he's chewy.",
      "Ginger alphabetised my seeds. Zinnia is always last. It doesn't mind.",
      "Mallow finds the odd one out. I collect odd words. Hello, 'discombobulated'.",
      "I told a lantern 'ineffable': too grand for words. It flickered. Fair.",
      'Chai reads every word. I collect them. The dictionary is nervous.',
      'Affect or effect? Mostly, A is for action and E is for end result.',
      "You know a word I don't, I bet. Swap you!",
      "Challenge: use 'luminous' in a sentence out loud. I'll wait. I'm rooted.",
      "You have a very 'affable' face. It means friendly. Compliment!",
      "Do you have a favourite word? Everyone does. Even if it's 'pancake'.",
      'The speaker implies, the listener infers. Swap them and both get huffy.',
      'If a word looks scary, split it: prefix, root, ending. Tiny pieces, no panic.',
      'A thesaurus is a dictionary that branched out.',
      "'Blossomfully' is a word I invented. The dictionary has not replied.",
      'A noun, a verb and an adjective met at the pond. The adjective talked nonstop.',
      "Bark is a tree's coat and a dog's shout. One word, two jobs. Sneaky!",
      'Benevolent is bene (well) plus velle (to wish). A well-wisher!',
      "Synonym is 'same name'. Sprout, shoot, seedling: three names, one me.",
      'New word? Look for a comma or a dash nearby. The meaning often hides there.',
      "Guess a new word's meaning before you check. A guess is a seed.",
      "Muscle comes from Latin for 'little mouse'. Flex your little mouse!",
      "'Nice' once meant 'foolish'. Words change their minds. I do too.",
      "'Pen' comes from the Latin for feather. Chai is not surprised.",
      'Flour and flower were once the same word. So bread is basically a bouquet.',
      "I could say 'big'. I choose 'gargantuan'. Nobody asked. Delightful.",
      "Tiny words are load-bearing. 'But' and 'so' hold up whole paragraphs.",
      "Necessary has one collar and two sleeves: one 'c', two 's'.",
    ],
    mochi: [
      'Tea. Good.',
      'Long day? Short version: nice day.',
      'Hm. Clouds. Rain soon.',
      'The point is usually small. Like me.',
      'Chai read me a whole book. Summary: dragon, friends, happy.',
      'Gist first. Always.',
      'Tea?',
      'Rocks do not nap. We simply continue.',
      'People say I am quiet. I am edited.',
      'Boulders ramble. Pebbles get to the point.',
      'One sport: rolling downhill. Undefeated.',
      'Sat still for an hour. Got so much done.',
      'Notebook pages: mostly one word each. Very readable.',
      'Never been late. I was already here.',
      'Deep thought: hm. Deeper thought: hmmm.',
      'Small, round, reliable. My entire CV.',
      'Examples are guests. The main idea owns the house.',
      'A summary longer than the paragraph is just a new paragraph.',
      'Summary rule: add nothing. Not a thought. Not a joke.',
      'First line, last line. The point often waits there.',
      "'Always' or 'never' in an option? Look twice.",
      'An option covering half the paragraph is half an answer.',
      "'But' is a signpost. The point is often just past it.",
      'New fact in the option? The paragraph never said it. Out.',
      'Rivers make stones smooth by taking bits away. Editing.',
      "Keep the author's mood. Worried in, worried out.",
      'Say the paragraph in one breath. That is the gist.',
      "Chai asked for a review. I said: 'Long. Lovely.' She framed it.",
      'Toffee, in short: warm. Loud. Warm again.',
      "I said 'tea' to a fern. It leaned in. Matcha was right.",
      'Sesame says my notes skip the middle. Fair. I skip middles.',
      'Mallow spots the odd star. I find the main one. Same sky.',
      'Ginger lined up my teacups by height. Tea tastes tidier.',
      'The tower bell says one thing, once an hour. Concise.',
      'Reading my bubble? Kept it short. For you.',
      'Good choice of village. Great choice of pebble.',
      'Your day in six words? I am a rock. I can wait.',
      'Your summary: curious, kind, here. Short. Good.',
      'Tea or tea? Take your time.',
      'You listen well. Nearly as well as a rock.',
      'Rolling stones gather no moss. Sitting ones gather tea.',
      'My autobiography is three words: river, notebook, tea.',
      'Clouds are paragraphs with no main idea. Lovely anyway.',
      'Chatted with the pond. Very short. Very mutual.',
      "Wrote an epic poem. Full text: 'Tea.' Reviews pending.",
      'Got skipped across the pond once. Four bounces. Still telling people.',
      "'For example' usually follows the point. It is not the point.",
      'Cross out a sentence. Idea still stands? It was extra.',
      'Main idea of tea: warm. Everything else is steam.',
      'Topic is what it is about. The point is what it says about it.',
      'Lost my notebook for a minute. I was sitting on it.',
      'Tea fogs my glasses. I allow it.',
      'Won a staring contest with a wall. Close one.',
      'Chai underlines everything. I underline one word. Teamwork.',
      "Tried 'antidisestablishmentarianism' once. Summary: no.",
      'Spoke twelve words in a row. Chatty, for me.',
    ],
    ginger: [
      'Who put the spoons with the forks? Fixed it.',
      'First the kettle, then the tea, then the cup. Order matters!',
      'I sorted the flowers. Daisy, lily, rose. Much better.',
      "A 'however' always comes after something. Always!",
      'Everything has a place. Your place is right here!',
      'Find the opening sentence first!',
      'Pronouns point the way!',
      'Your bag was a mess. I tidied it. You are welcome!',
      'The label maker needed a label. Done. It looks pleased.',
      'My coat has eleven pockets. Ten for maps. One for snacks.',
      'Straight lines make me happy. Crooked ones just need a ruler.',
      'Forty-one pencils, sorted by how sharp they feel.',
      "I tidy when I'm happy. You should see the workshop right now.",
      'Alphabetised the pond. Duck first, then frog, frog, frog.',
      'I once tidied a sandwich. It is now a very organised salad.',
      'Tail routine: left side, right side, fluff. Never skip the fluff.',
      'Fox rule one: never lose the map. Rule two: draw a spare map.',
      "'Just leave it.' Three words I physically cannot do.",
      "Candidate opener says 'she' but never says who? Next candidate!",
      "Every 'it' is a leash. Find the thing on the other end.",
      "'However' and 'therefore' are bridges. Find both banks, then cross.",
      "'Therefore' announces a result. Its cause is waiting somewhere earlier.",
      'Two sentences that only make sense together? Glue them, then sort.',
      'Paragraphs often zoom in, like a map: the big picture, then a street.',
      "Cause, then effect. No domino falls before it's pushed.",
      "'First', 'then', 'later', 'finally': breadcrumbs. Follow them in order.",
      "'Thus' is a sentence putting on its coat. Usually the last one out.",
      'Placing a sentence? Try every seat. Listen for the click.',
      'Bookends first: opener and closer. The middle has less room to wander.',
      "A sentence that starts with 'But' is arguing with the one before it.",
      "Mallow spots the stray cloud. I draw it a route home. It's a system.",
      "That clock tower chimes right on time. I'd hug it, if it weren't so tall.",
      'Chai shelves books by thickness. I have never been prouder.',
      "Mochi's tea table is perfect. One cup. One spoon. Nothing else.",
      "Matcha plants seeds in a swirl. Art, I'm told. I'm still hunting for rows.",
      "Toffee's sparks never land in a straight line. I'm coping.",
      'The village kite has forty paces of string. I paced it twice.',
      'Lanterns sorted by height look so calm. The tall ones know it.',
      "How's your desk looking? I won't come over to tidy it. Probably.",
      'You look like someone who puts the cap back on. I trust you.',
      'Starting at the closer is allowed. The opener never finds out.',
      'One more jumble? A gear just twitched. I think it wants one.',
      "Order, order! I'm no judge. I just really like order.",
      'Brainwave: a drawer for my other drawers. Yip yip yip!',
      "A button rolled away. I followed it for ten minutes. We're friends now.",
      "Sort of tidy? Not a thing. It's sorted or it isn't.",
      'Dream job: sorting the stars by brightness. Mallow keeps saying no.',
      'Goggles on for sentences. Goggles off for soup.',
      'Someone keeps un-sorting my cogs. The wind denies everything.',
    ],
    mallow: [
      'Ooh! One of those birds is flying backwards!',
      'Five leaves fell. One was a butterfly!',
      'Something is different today. Did the pond move?',
      'Spot the odd one: tea, coffee, juice, a sock.',
      "That cloud looks like a teapot. I look like a sheep. It's fine.",
      'One of these is not like the others!',
      'Shh. The sky is thinking.',
      'My yawns come out as tiny clouds. Then they float off. Rude.',
      'Counting sheep? I kept counting me.',
      'Found a cloud that looks exactly like a cloud. Bold choice.',
      'Not sleepy. Just resting my eyes. Both of them. For ages.',
      "This stargazer's hat is mostly for confidence.",
      'People say I look like a sheep. I say sheep look like me.',
      "Cloud speed is a real speed. It's called eventually.",
      "Mallow rhymes with shallow. I'm not. I'm cloud-deep.",
      'Happy? I fluff. Sleepy? I fluff. Surprised? Extra fluff.',
      'Floating is just napping with better posture.',
      "I'm cirrus-ly sleepy. Get it? Cloud joke. Sorry.",
      'Pillows are just tiny clouds that gave up flying.',
      "That cloud changed its mind halfway. It was a rabbit. Now it's a shoe.",
      'I asked the sky a question. It said nothing. Wise.',
      "Ginger tried to sort me by size. I'm one size. Cloud-sized.",
      'Spotted something odd! Looked closer. It was my own fluff.',
      "Ginger drew me a map. It's a circle. A very good circle.",
      "Toffee's smoke and I both drift upward. Cousins, I think.",
      "Sesame's clock ticks. The sky doesn't. I'm with the sky.",
      'Chai reads about the sky. I just look at it. We meet in the middle.',
      'Mochi and I had tea in total silence. Best chat ever.',
      'My telescope sees far. I see odd. Together: everything.',
      'Matcha whispers to seeds. I whisper to the sky. Both are listening.',
      "Four sentences hold hands. One lets go. That's your stranger.",
      'Name the theme first. Then the stranger just walks out.',
      'On topic is not the same as on theme. Same room, different party.',
      'Watch for a shift of subject, time, person or tone. Someone changed seats.',
      'A shiny sentence can be the stranger. Sparkly is not belonging.',
      'Find the glue: what four sentences share. The fifth slides right off.',
      'Four sentences stuck in yesterday. One skipped to tomorrow. Suspicious!',
      'A grumpy sentence in a cheerful set? Tone shift. Look closer.',
      'Read all five before you choose. A stranger can sit in any seat.',
      "The stranger can look perfectly normal. It's just facing another way.",
      'Two sentences feel odd? Name the theme again. One will come back in.',
      'Before the stranger: what do the other four share? Say it softly.',
      'Be honest: ever pick the odd one just because it sounded fancy? I have.',
      'Planet comes from a Greek word for wanderer. The sky has odd ones too.',
      "Cumulus is Latin for heap. I'm a heap. A tidy, fluffy one.",
      'Tricky set? Squint a little. Stargazers do. Then name the theme.',
      "If you were the odd one out, I'd still sit next to you.",
      'Can you spot the stranger before I finish this yaaaawn?',
      'Tiny quest: find one odd little thing within ten steps of you.',
      'A whale walked into a bakery. Four loaves, one whale. Easy.',
      'Pen, pencil, ruler, a goldfish. The goldfish has some explaining to do.',
    ],
    sesame: [
      'Something is missing here... oh! My other sock.',
      'Every gap has one thing that fits. Like a key in a lock.',
      'Tick, tock, tick... I count the seconds. For fun.',
      'The sentence before the gap and the one after. Both have to agree!',
      'Chai started a story and stopped. I know how it ends.',
      'Read both sides of the gap first!',
      'I found a crumb. Then another. Then a whole cookie!',
      'A gap is just a sentence waiting for its friend.',
      "I finished my sentence too early again. Now I'm standing here, finished.",
      'My top hat holds three crumbs and a button. Always ready!',
      "Late? Me? I keep the clock. It's the clock that's early.",
      'Snack plan: eat half, save half. ...Plan changed.',
      "Squeak means hello, hooray, or 'where's my snack'. Context matters!",
      'Winding the clock is my workout. Forty turns, then a very long snack.',
      "I found a tiny key. Now I'm collecting locks. Tiny ones.",
      'From the tower the whole village looks mouse-sized. I feel right at home.',
      'Not talking fast. The clock is just talking slow. Tick... tock...',
      'Collection update: one button, two beads, one spoon the size of a pea.',
      'To-do list: wind the clock, find a button, snack. Snack went first.',
      "Gap, then 'This...'? The gap must give 'this' something to point at.",
      'A set-up is a promise. The sentence before makes it. The gap keeps it!',
      "Jokey sentence, serious paragraph? That's a hat on a fish. Match the tone!",
      'Same topic is not enough. It has to hand over to the sentence after.',
      'The missing sentence is a bridge. Check both ends before you cross!',
      'Opening sentence missing? Then everything after it is your clue.',
      'Gap at the end? Usually it should close the door, not open a new one.',
      "'For example' right after the gap? The gap probably states the big idea.",
      "Fanciest option isn't a clue. The sentences next door are. Go look!",
      'Test your pick: pop it in the gap and read it through. Bumpy? Swap.',
      'Tempting option borrows words from the paragraph? Match ideas, not words.',
      'Two options sound right? Ask which one the next sentence needs.',
      'Mochi summed up my day in three words: squeak, snack, clock. Accurate.',
      'I told Chai how her story ends. She called it spoilers. I called it help.',
      'Toffee counts sparks. I count ticks. Nobody counts crumbs. Except me.',
      "Mallow finds the one that doesn't belong. I find the one that's gone.",
      'Ginger lined my buttons up by size. The bead is thrilled to be first.',
      "Matcha says 'serendipity' means lucky finds. Like a crumb in your pocket!",
      'The library has gaps on its shelves. Each one is a book out for a walk.',
      'Mochi keeps a thimble just for my tea. Best cup in the village.',
      'Psst! You have the look of someone who checks the sentence after, too.',
      "Finishing other people's sentences? Join my club. Members: me. Snacks: yes!",
      "Once upon a... time! Sorry. You hadn't said it yet. I can't help it.",
      'Smallest thing you ever kept? A crumb, for me. It lasted ten seconds.',
      "Which comes first, tick or tock? Tick. I've checked. Many, many times.",
      'Brainwave! A clock with no hands, just a polite cough every hour.',
      'Mini story: a mouse found a button. She kept it. The end. (It was me.)',
      "New idea: a thirteenth hour, just for snacks. I'll tell the clock.",
      "Knock, sock, tick, tock. That's a poem. Short, but finished!",
    ],
  },
  /** The quick hello above each friend you can see the moment you open the village (src/home/life.js greet). */
  arrive: {
    toffee: [
      'Hi hi! Crackle crackle!',
      'You came! Sparks everywhere!',
      'Ooh, hot take incoming!',
      'Race you to the fire!',
      'One toasty hello, coming up!',
      "I counted: you're here!",
      'Whoosh! Perfect timing!',
      'Warm hands, warm hello!',
      'Three sparks for hello!',
      'Logs are ready. Are you?',
    ],
    chai: [
      'Hoo! There you are.',
      'Dear reader, you made it!',
      'Chapter one: you arrive.',
      'The plot thickens. Hoo!',
      'A reader! Cue the hooting!',
      'Shh... good part coming.',
      'Enter, stage left: you!',
      'Ah, my favourite reader.',
      'Come in, mind the stacks.',
      "Don't trip on chapter nine.",
    ],
    matcha: [
      'Hi hi! Mind the seedlings.',
      'Look who sprouted up!',
      'Psst! Seeds are listening.',
      "Today's word: hello!",
      'Oh! Mid-photosynthesis. Hi!',
      'Serendipity! Oh, hi!',
      'Sprouts, attention: visitor!',
      'Ahoy, word-lover!',
      "Watering can's at the ready!",
    ],
    mochi: [
      'Oh. Hello.',
      'Tea is ready.',
      'Hello, summarised: hi.',
      'Pebble here. Present.',
      'Ah. Visitor. Welcome.',
      'Sit. Sip. Stay.',
      'Look who rolled in.',
      'Welcome. That is all.',
      'Kettle is on. Hello.',
      'Hm? Oh! Hello.',
    ],
    ginger: [
      'Mind the tidy floor!',
      'Goggles on, navigator!',
      'Ooh! Shoes off, please.',
      "Don't touch the pencils.",
      'One moment, mid-map!',
      'I tidied for you!',
      'Wipe your paws, please!',
      'Neat! A visitor!',
      'Yip! Mind the gears!',
      'Wet paint! Kidding. Hello!',
    ],
    mallow: [
      'Hi! There you are.',
      'Spotted you first!',
      'Yawn... oh! Hi!',
      'Look, someone nice!',
      'Fluffing up for you!',
      "Mind the sheep. That's me.",
      'Ooh, a familiar shape!',
      'Cloud here. Welcome in.',
      'Shh, I was mid-daydream. Hi!',
      'Hi! I saved you a cloud.',
    ],
    sesame: [
      'Squeak! Perfect timing!',
      "Tock! You're here!",
      'Oh! A visitor! Snack?',
      'Just in time! For snacks!',
      'Mind the crumbs!',
      'Tick! Right on the dot!',
      'Welcome in, welcome in!',
      'Psst! Found a button!',
      "Look up! It's me!",
      'Squeak! Mind the cogs!',
      'Oops, dropped a crumb. Hi!',
    ],
  },
  /** The same, at night: sleepy and whispery (Toffee never sleeps). */
  arriveNight: {
    toffee: [
      'Awake! Always awake! Hi!',
      'Night shift! I never nap!',
      'Dark? Not with me here!',
      'Night hello! Still crackling!',
      'Cosy fire, wide awake!',
      'Moon who? I brought sparks!',
    ],
    chai: [
      'Hoo... quietly now.',
      'Hush, the books are asleep.',
      'A candle, a book, you.',
      'Soft pages, soft hoots.',
      'Welcome, night reader.',
      "Night shift? That's my shift!",
    ],
    matcha: [
      'Shh, the seeds are asleep.',
      'Yawn... oh! Hello!',
      'Moonlit leaves say hello.',
      'Night-night, pots. Hi, you!',
      'Hush! The ferns are dozing.',
    ],
    mochi: [
      'Shh. Hello.',
      'Late. Cosy. Hello.',
      'Warm tea, soft hello.',
      'Yawn. Oh. Hi.',
      'Lantern on. Come in.',
    ],
    ginger: [
      'Shh... the maps are asleep.',
      'Tiptoe past the gears.',
      'Slippers by the door, please.',
      'Shh. The pencils are in bed.',
      'Even the cogs are yawning.',
      "Lamp low. I'll sort quietly.",
    ],
    mallow: [
      'Shh... hello, sleepy one.',
      'Yaaawn. Oh, hello.',
      'Stars saved you a seat.',
      'Psst. Come sit, softly.',
      'Soft night. Soft hello.',
      'Look up. Now look at me. Hi!',
    ],
    sesame: [
      'Shh... hello, you.',
      'Yawn... you made it.',
      'Mind the sleepy crumbs.',
      'Squeaking softly. Hello.',
      'Tiptoe in. Cosy up.',
      'Shh, the bell is asleep.',
    ],
  },
  /** Everyone in the plaza, celebrating a finished set. */
  cheer: {
    toffee: [
      'Woo hoo!',
      'Fire party!',
      'Sparks up, everybody!',
      'Crackle crackle HOORAY!',
      'Hot hot hot! Yay!',
      'Whoosh! Toast to us!',
      'Pretend fireworks! Boom!',
    ],
    chai: [
      'Hoo hoo hooray!',
      'Bravo, bravo!',
      'What a finale!',
      'Pages in the air!',
      'Standing ovation, hoo!',
      'Curtain call! Take a bow!',
    ],
    matcha: [
      'Splendiferous!',
      'Yay yay yay!',
      'Bloom, bloom, hooray!',
      'Petal confetti for all!',
      'Three cheers and a leaf!',
      'Jubilant! Utterly jubilant!',
    ],
    mochi: [
      'Nice.',
      'Good job. Really.',
      'Hooray. Quietly.',
      'Yay. In brief.',
      'Tea for everyone!',
      'This is me shouting.',
      'Standing ovation. Seated.',
    ],
    ginger: [
      'All in order! Yes!',
      'Yip yip hooray!',
      'Sorted! Sorted! Sorted!',
      'Neatest party ever!',
      "I'll sweep the confetti!",
      'Alphabetical applause!',
    ],
    mallow: [
      'Wheee!',
      'So sparkly!',
      'Fluff it up, everyone!',
      'A whole sky of cheers!',
      'Odd ones, unite! Woo!',
      'The clouds are clapping!',
    ],
    sesame: [
      'Squeak squeak hooray!',
      'A perfect fit!',
      'Hip hip, squeak!',
      'Just in time! Hooray!',
      'Crumbs for everyone!',
      'Chime time, everybody!',
    ],
  },
  /** A friend who just grew a stage. */
  grow: {
    toffee: [
      'BIGGER FIRE! Look at me!',
      'I grew! I am the brightest thing here!',
      'I grew! Count my flames with me. One! Two! Three!',
      'Look how tall I am! I almost touch the clock tower.',
      'Bigger, brighter, bouncier! Even my hat feels taller.',
    ],
    chai: [
      'I feel wiser. And taller!',
      'Hoo! A new chapter of me!',
      "The top shelf is in reach! Hoo, what I'll read!",
      'I grew by a whole paragraph! Maybe two!',
      'Bigger wings! More room to flap dramatically.',
    ],
    matcha: [
      'I grew! Literally!',
      'Look at my leaves! Magnificent!',
      'A whole new leaf! Very photogenic, if I say so myself.',
      'Taller! Now I can whisper words down to the seeds.',
      'Burgeoning! It means growing fast, and that is me.',
    ],
    mochi: [
      'Bigger. Good.',
      'New look. Same Mochi.',
      'I grew. Did not ramble. Proud of that.',
      'Larger pebble. Same short sentences.',
      'A bit taller. The point stayed small. As it should.',
    ],
    ginger: [
      'Upgraded! Neatly!',
      'Everything in order, including me!',
      'I grew! Quick, everybody, line up by height!',
      'A taller fox, and not one hair out of place!',
      "New size! I've already re-sorted my pockets to fit.",
    ],
    mallow: [
      'I got fluffier! Look!',
      'I sparkle now! Like a star!',
      'I grew! Still a cloud. Just a taller one.',
      'New stage, same sheep. Okay, cloud. Same cloud!',
      'I grew, and I noticed first. Spotting is my thing!',
    ],
    sesame: [
      'I grew! Squeak!',
      'Bigger! And my ears grew too!',
      'Look! A bigger me, in a slightly bigger tiny hat!',
      'Taller! I can reach the next cog now. Tick, tock, wow!',
      'Look, look! Mark my height on the tower wall. Quick!',
      'Is the hat bigger, or am I? Both! Squeak!',
    ],
  },
  /** One friend talking about another, by that friend's mood word. */
  gossip: {
    glowing: ['{name} has been humming all day!', 'Have you seen {name}? Practically sparkling!'],
    happy: ['{name} seems so happy today.', 'I passed {name} on the path. All smiles!'],
    missing: ['{name} keeps looking toward the gate. Maybe visit?', 'I think {name} misses you.'],
    sleepy: ['{name} dozed off by the door again.', '{name} could use a visit, I think.'],
    wilting: ['{name} has been quiet lately. A visit would cheer them up!', 'Let us go see {name} soon.'],
    new: ['Have you met {name} yet? So lovely!', '{name} has been hoping to meet you!'],
  },
  /** The first visit: Toffee's welcome, then everyone says hello (LINES.meet), then Chai calls you over. */
  intro: [
    "You're here! You're really here! I've been waiting all morning. Okay, all week.",
    'We are all still little! Every question you get right helps one of us grow.',
    'And when we grow, the whole village grows with us. Lanterns, flowers, a kite!',
    'Everyone here keeps one part of CAT English, and it is who they are. Come and meet them!',
    "Hoo! Over here! I'm still a baby owl. Help me grow? Tap the big button!",
  ],
});

/**
 * Each friend's catchphrase: the same words every time you tap them, spoken where the browser can
 * (pitch 0..2 and rate are Web Speech knobs; `who` only nudges which voice is picked), a babble elsewhere.
 */
export const SIGNATURE = freeze({
  toffee: { say: 'Crackle!', pitch: 1.5, rate: 1.25, volume: 1, who: '' },
  chai: { say: 'Hoo, hoo.', pitch: 1.55, rate: 0.8, volume: 0.7, who: 'f' },
  matcha: { say: 'Hi hi!', pitch: 1.8, rate: 1.1, volume: 0.9, who: 'f' },
  mochi: { say: 'Mochi.', pitch: 0.1, rate: 0.55, volume: 1, who: 'm' },
  ginger: { say: 'Yip!', pitch: 1.25, rate: 1.2, volume: 1, who: '' },
  mallow: { say: 'Soft, soft.', pitch: 1.4, rate: 0.7, volume: 0.65, who: 'f' },
  sesame: { say: 'Squeak!', pitch: 2, rate: 1.4, volume: 0.9, who: 'f' },
});

/* ------------------------------------------------------------------ */
/* Picking a line                                                      */
/* ------------------------------------------------------------------ */

const pick = (pool, seed) => (pool?.length ? pool[Math.floor(rng(String(seed))() * pool.length)] : '');
const fill = (t, vars) => t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');

/**
 * A deterministic line: the same pet, kind and seed always say the same thing.
 * @param {string} petId
 * @param {string} kind  'hello' | 'missed' | 'meet' | 'thanks', or a mood word
 */
export function lineFor(petId, kind, seed = '') {
  const pool = LINES[kind]?.[petId];
  if (pool) return pick(pool, `${petId}:${kind}:${seed}`);
  if (kind === 'new') return pick(LINES.meet[petId], `${petId}:meet:${seed}`);
  if (kind === 'missing' || kind === 'sleepy' || kind === 'wilting') return pick(LINES.missed[petId], `${petId}:missed:${seed}`);
  return pick(LINES.hello[petId], `${petId}:hello:${seed}`);
}

/**
 * The next line from a friend's pool, dealt like a shuffled deck: nothing comes round again until every line has been said,
 * and a new deck never opens with the line that just closed the last. `heard` is the indices dealt so far; pass back what is returned.
 */
export function dealLine(petId, kind, heard = [], rand = Math.random) {
  const pool = LINES[kind]?.[petId] ?? [];
  if (!pool.length) return { line: '', heard };
  const all = pool.map((_, i) => i);
  let left = all.filter((i) => !heard.includes(i));
  let had = heard;
  if (!left.length) { had = []; left = all.filter((i) => i !== heard.at(-1)); if (!left.length) left = all; }
  const i = left[Math.floor(rand() * left.length)];
  return { line: pool[i], heard: [...had, i] };
}

/** A line about another pet, by that pet's mood word. */
export function gossipLine(aboutId, word, seed = '') {
  return fill(pick(LINES.gossip[word] ?? LINES.gossip.happy, `gossip:${aboutId}:${seed}`), { name: PET_BY_ID.get(aboutId)?.name ?? '' });
}

/** What a friend asks for now: the chapter of their story their hearts have reached. */
export function requestFor(petId, hearts = 0) {
  const r = REQUESTS[petId];
  if (!r) return '';
  return hearts >= 5 ? BEST_FRIEND_ASK[petId] : r[Math.max(0, Math.min(4, hearts))];
}
