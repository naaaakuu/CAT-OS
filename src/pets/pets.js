/**
 * pets.js — the six friends of the village: who they are, what each one
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
   Para Jumbles, the one who says it short keeps Para Summary. `tag` is that
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
    id: 'mochi', name: 'Mochi', creature: 'pebble', subject: 'Para summary and completion',
    tag: 'Says it short. Gets to the point. Finishes your sentences.', item: 'a beret', charm: 'notebook',
    teaches: 'Finding the point of a paragraph', home: 'the cabin', icon: 'notes', colour: '#7D8FA8', frame: freeze([1040, 335]),
    places: freeze(['table', 'completion']), modules: freeze(['ps', 'pc']), bff: 'chai',
    trouble: 'His notebook lost its notes. Every summary you find writes a page back.',
    blurb: 'Finds the gist: summaries, and the sentence a paragraph is missing.',
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
]);

export const PET_BY_ID = new Map(PETS.map((p) => [p.id, p]));

/**
 * Every house in the village holds one CAT VARC subject, and its sign says
 * which (owner, 2026-10-03: "all houses must be filled up with only VARC
 * subjects"). `spot` is the building on the painting (paths.js HOMES and
 * PLACES); `place` is the page it opens. Ginger and Mochi each keep a second
 * house: Sentence Placement in the rose cottage, Para Completion in the clock
 * tower. Ordered as CAT weights them: reading first.
 */
export const HOUSES = freeze([
  freeze({ spot: 'chai', pet: 'chai', subject: 'Reading Comprehension', place: 'reading-room', ask: 'A passage and four questions, as CAT sets them' }),
  freeze({ spot: 'ginger', pet: 'ginger', subject: 'Para Jumbles', place: 'loom', ask: 'Put four sentences in the order the author wrote' }),
  freeze({ spot: 'mochi', pet: 'mochi', subject: 'Para Summary', place: 'table', ask: 'Choose the summary that keeps the point' }),
  freeze({ spot: 'mallow', pet: 'mallow', subject: 'Odd One Out', place: 'bench', ask: 'Five sentences: find the one that does not belong' }),
  freeze({ spot: 'cottage', pet: 'ginger', subject: 'Sentence Placement', place: 'placement', ask: 'Find the one place a sentence fits' }),
  freeze({ spot: 'clock', pet: 'mochi', subject: 'Para Completion', place: 'completion', ask: 'Choose the sentence the gap in a paragraph needs' }),
  freeze({ spot: 'matcha', pet: 'matcha', subject: 'Vocabulary', place: 'meadow', ask: 'CAT words, many inside a real sentence' }),
  freeze({ spot: 'toffee', pet: 'toffee', subject: 'The Gauntlet', place: 'wilds', ask: 'A weekly timed mix: thirty quick questions' }),
]);

/** The three friendships, said the way the village says them. */
export const FRIENDSHIPS = freeze([
  freeze({ a: 'chai', b: 'mochi', line: 'Reading buddies. Chai reads the long ones, Mochi finds the point.' }),
  freeze({ a: 'ginger', b: 'mallow', line: 'Best friends. Ginger draws the maps, Mallow spots what wanders off them.' }),
  freeze({ a: 'matcha', b: 'toffee', line: 'Toffee keeps the greenhouse warm all winter, so Matcha adores Toffee.' }),
]);
export function friendshipOf(id) { return FRIENDSHIPS.find((f) => f.a === id || f.b === id) ?? null; }

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
});

/** What a friend's home gains with each chapter (every second stage), drawn on the map (src/home/cards.js). */
export const HOME_GIFTS = freeze(['a lantern by the door', 'flowers by the door', 'bunting over the door', 'warm lights in every window', 'a golden glow: best friends']);

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
    toffee: ['There you are! Come warm your hands.', 'Hi hi! The fire is so happy you came.', 'Ooh, a visitor! Sit with me a while!'],
    chai: ['Hoo! You came! I saved you the comfy chair.', 'Oh, it is you! I was hoping you would drop by.', 'Welcome back, reader! I have a good one today.'],
    matcha: ['Hi hi! The greenhouse is so happy to see you!', 'You are here! The sprouts all turned to look.', 'Hello, gardener! Did you bring sunshine?'],
    mochi: ['Oh! Hello. Glad you came.', 'You! Good. Tea is warm.', 'Hello, friend. I kept your seat.'],
    ginger: ['Yip! You found the workshop!', 'Hey, navigator! I was just thinking about you.', 'You came! Quick, I have a fun one.'],
    mallow: ['Oh! Hello, star-friend!', 'You are here! The sky got brighter just now.', 'Hi! I was watching the path for you.'],
  },
  /** A friend who has not seen you for a while. Glad, never cross. */
  missed: {
    toffee: ['You are back! I kept one coal warm, just for you.', 'There you are! I knew you would come.'],
    chai: ['You are back! I kept your bookmark exactly where you left it.', 'Oh, I missed you! The library was so quiet.'],
    matcha: ['You came back! The seedlings kept leaning toward the door.', 'Yay! I watered your words while you were gone.'],
    mochi: ['You are back. Good. I missed this.', 'Oh! There you are. Kept your seat.'],
    ginger: ['You are back! I chalked a trail to the door for you.', 'Yip yip! I knew you would find your way back.'],
    mallow: ['You came back! I saved the brightest star for you.', 'Oh! I kept watching the path. And here you are!'],
  },
  /** The very first meeting: who they are, then why that is their subject (the intro says both, in order). */
  meet: {
    toffee: ["Hi hi hi! I'm Toffee! I keep the fire going. I haven't missed a day. Not ONE.", "Come back every day and the fire grows. Race me in the Gauntlet too. I always win. Mostly."],
    chai: ["Hoo! I'm Chai. I've read every book in this village. Twice. Even the cookbook.", "Give me any passage and I'll find what the author really meant. That's Reading!"],
    matcha: ["Hello hello! I'm Matcha! Some collect stamps. I collect words!", "Today's favourite word is 'serendipity'. Come grow your words with me!"],
    mochi: ["Mochi. Hi. I keep it short.", "Long paragraph? I find the point. Half a paragraph? I finish it."],
    ginger: ["I'm Ginger! I sort my socks by colour. Then by mood.", "Shuffled sentences? A sentence with nowhere to go? I know where everything goes!"],
    mallow: ["Hi! I'm Mallow! See those five clouds? One of them is a sheep.", "I always spot the one that doesn't belong. Five sentences, one stranger. Easy!"],
  },
  /** On coming back from a run: thank you. */
  thanks: {
    toffee: ['The fire roared up! Thank you!', 'Whoosh! Look at those sparks! Thank you!'],
    chai: ['Thank you! I can read the pages again!', 'Hoo hoo! The words came back! Thank you!'],
    matcha: ['Yay! Everything is blooming! Thank you!', 'Look, new leaves! You did that!'],
    mochi: ['A page came back. Thank you. Really.', 'Notes! Lovely notes! Thank you.'],
    ginger: ['Click! The gears are turning! Thank you!', 'Yip! The workshop is humming again!'],
    mallow: ['A star came back! Thank you!', 'Look up! It is shining again, thanks to you!'],
  },
  /** Said to nobody in particular while you watch: who they are, out loud (src/home/life.js muse). */
  muse: {
    toffee: ['Who wants to race? Anyone? Ready, set... go!', 'Day after day after day! I love days!', 'I counted the sparks. Two hundred and twelve!', "I'm not hot-headed. I'm just a head. Made of fire.", 'Crackle crackle! That means hello in fire.', 'Race you to the pond! Go!', 'Did you come yesterday? You did! I counted!'],
    chai: ["Plot twist: the butler was nice all along.", 'I just read the back of a jam jar. Twice. Still good.', 'Every author hides one sentence that matters most. I always find it.', "Shh! I'm at the good part.", "Owls can't move their eyes. So I turn my whole head. Very dramatic.", 'Read the question first. Trust me!', "I underline everything. It's a problem.", 'Fun fact: owls have three eyelids. I read that. Twice.'],
    matcha: ["Word of the day: petrichor! It's the smell of rain. Sniff sniff!", "Today's word is ebullient. It means me, right now!", "This flower isn't pretty. It's resplendent!", 'I whisper words to my seeds. They grow faster. Probably.', "Quixotic! I don't know what it means yet. I just like saying it.", 'Did you bring sunshine?', 'Every word is a seed!', 'Gosh, you look positively radiant today!'],
    mochi: ['Tea. Good.', 'Long day? Short version: nice day.', 'Hm. Clouds. Rain soon.', 'The point is usually small. Like me.', 'Chai read me a whole book. Summary: dragon, friends, happy.', 'Gist first. Always.', 'Tea?'],
    ginger: ['Who put the spoons with the forks? Fixed it.', 'First the kettle, then the tea, then the cup. Order matters!', 'I sorted the flowers. Daisy, lily, rose. Much better.', "A 'however' always comes after something. Always!", 'Everything has a place. Your place is right here!', 'Find the opening sentence first!', 'Pronouns point the way!', 'Your bag was a mess. I tidied it. You are welcome!'],
    mallow: ['Ooh! One of those birds is flying backwards!', 'Five leaves fell. One was a butterfly!', 'Something is different today. Did the pond move?', 'Spot the odd one: tea, coffee, juice, a sock.', "That cloud looks like a teapot. I look like a sheep. It's fine.", 'One of these is not like the others!', 'Shh. The sky is thinking.'],
  },
  /** Everyone in the plaza, celebrating a finished set. */
  cheer: {
    toffee: ['Woo hoo!', 'Fire party!'],
    chai: ['Hoo hoo hooray!', 'Bravo, bravo!'],
    matcha: ['Splendiferous!', 'Yay yay yay!'],
    mochi: ['Nice.', 'Good job. Really.'],
    ginger: ['All in order! Yes!', 'Yip yip hooray!'],
    mallow: ['Wheee!', 'So sparkly!'],
  },
  /** A friend who just grew a stage. */
  grow: {
    toffee: ['BIGGER FIRE! Look at me!', 'I grew! I am the brightest thing here!'],
    chai: ['I feel wiser. And taller!', 'Hoo! A new chapter of me!'],
    matcha: ['I grew! Literally!', 'Look at my leaves! Magnificent!'],
    mochi: ['Bigger. Good.', 'New look. Same Mochi.'],
    ginger: ['Upgraded! Neatly!', 'Everything in order, including me!'],
    mallow: ['I got fluffier! Look!', 'I sparkle now! Like a star!'],
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
  toffee: { say: 'Crackle, crackle, whoosh!', pitch: 1.5, rate: 1.25, volume: 1, who: '' },
  chai: { say: 'Hoo, hoo. Every book. Twice.', pitch: 1.55, rate: 0.8, volume: 0.7, who: 'f' },
  matcha: { say: "Hi hi! I'm mostly leaf!", pitch: 1.8, rate: 1.1, volume: 0.9, who: 'f' },
  mochi: { say: 'Mochi.', pitch: 0.1, rate: 0.55, volume: 1, who: 'm' },
  ginger: { say: 'Yip! Everything has a place!', pitch: 1.25, rate: 1.2, volume: 1, who: '' },
  mallow: { say: "Soft, soft. I'm mostly cloud.", pitch: 1.4, rate: 0.7, volume: 0.65, who: 'f' },
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
