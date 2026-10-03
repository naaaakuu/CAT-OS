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

export const PETS = freeze([
  freeze({
    id: 'toffee', name: 'Toffee', creature: 'flame spirit', subject: 'Daily streak and the Gauntlet',
    teaches: 'The daily fire and the weekly Gauntlet', home: 'the campfire', icon: 'sparks', colour: '#E9963A', frame: freeze([0, 350]),
    places: freeze(['wilds', 'hearth']), modules: freeze(['gauntlet']), bff: 'matcha',
    trouble: 'The fire is the heart of the village. It burns as long as you come back each day.',
    blurb: 'Keeps the village fire. Come back every day and it never goes out.',
  }),
  freeze({
    id: 'chai', name: 'Chai', creature: 'owl', subject: 'Reading comprehension',
    teaches: 'Reading passages and their questions', home: 'the library', icon: 'stories', colour: '#A9825A', frame: freeze([355, 330]),
    places: freeze(['reading-room']), modules: freeze(['rc', 'rc2', 'cr']), bff: 'mochi',
    trouble: 'The pages in her library are going blank. Every passage you read brings words back.',
    blurb: 'Keeps the library. Reads passages with you and helps you find what they really say.',
  }),
  freeze({
    id: 'matcha', name: 'Matcha', creature: 'sprout', subject: 'Vocabulary',
    teaches: 'Words, roots and word parts', home: 'the greenhouse', icon: 'leaves', colour: '#7FA65A', frame: freeze([700, 338]),
    places: freeze(['meadow', 'pond', 'thicket', 'rootwood', 'terraces']), modules: freeze(['lex', 'garden', 'wd', 'wb']), bff: 'toffee',
    trouble: 'The word garden is wilting. Every word you learn waters a pot.',
    blurb: 'Grows words in the greenhouse: word rounds, look-alike twins, borrowed words and roots.',
  }),
  freeze({
    id: 'mochi', name: 'Mochi', creature: 'pebble', subject: 'Para summary and completion',
    teaches: 'Finding the point of a paragraph', home: 'the cabin', icon: 'notes', colour: '#7D8FA8', frame: freeze([1040, 335]),
    places: freeze(['table', 'completion']), modules: freeze(['ps', 'pc']), bff: 'chai',
    trouble: 'His notebook lost its notes. Every summary you find writes a page back.',
    blurb: 'Finds the gist: summaries, and the sentence a paragraph is missing.',
  }),
  freeze({
    id: 'ginger', name: 'Ginger', creature: 'fox', subject: 'Para jumbles and placement',
    teaches: 'Putting sentences in order', home: 'the workshop', icon: 'maps', colour: '#D2693A', frame: freeze([1380, 397]),
    places: freeze(['loom', 'placement']), modules: freeze(['pj', 'sp']), bff: 'mallow',
    trouble: 'The workshop gears are stuck. Every jumble you put in order turns one again.',
    blurb: 'Maps how a paragraph goes: jumbled sentences, and the one seat a sentence can take.',
  }),
  freeze({
    id: 'mallow', name: 'Mallow', creature: 'cloud', subject: 'Odd one out',
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
  freeze({ spot: 'clock', pet: 'mochi', subject: 'Para Completion', place: 'completion', ask: 'Choose the sentence that finishes the paragraph' }),
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

/** What a friend's home gains with each heart, drawn on the map (src/home/cards.js). */
export const HOME_GIFTS = freeze(['a lantern by the door', 'flowers by the door', 'bunting over the door', 'warm lights in every window', 'a golden glow: best friends']);

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
  /** The very first meeting. */
  meet: {
    toffee: ['Hi! I am Toffee. I keep the village fire, and the fire keeps the village.'],
    chai: ['Oh, a reader! I am Chai, and you are just in time. My library needs you.'],
    matcha: ['Hi, I am Matcha! I grow words here, and I saved you a seed.'],
    mochi: ['Hello. I am Mochi. I find the point of things. Nice to meet you.'],
    ginger: ['Oh, a traveller! I am Ginger. I map how paragraphs go.'],
    mallow: ['Hello, star-friend! I am Mallow. I find the one that does not belong.'],
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
  tap: {
    toffee: ['Hehe, that tickles!', 'Crackle crackle!', 'Warm, is it not?', 'Sit with me a while!'],
    chai: ['Hoo! You found me!', 'Read the question first. Trust me!', 'Hoo hoo!', 'I underline everything. It is a problem.'],
    matcha: ['Hi hi! I am mostly leaf!', 'Did you bring sunshine?', 'Every word is a seed!', 'Roots first, then flowers!'],
    mochi: ['Oh! Hello.', 'Gist first. Always.', 'Tea?', 'Hm! Hi.'],
    ginger: ['This way, this way!', 'Find the opening sentence first!', 'Pronouns point the way!', 'Yip!'],
    mallow: ['Oh! You startled a star!', 'Soft! I am mostly cloud.', 'One of these is not like the others!', 'Shh. The sky is thinking.'],
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
  /** Toffee's welcome on the very first visit: the problem, then the purpose. */
  intro: [
    'Hi! You are here! I am Toffee. I keep the village fire.',
    'Our village is losing its words. Every question you answer brings some of them back.',
    'Each house holds one part of CAT English, and its sign says which. Tap any sign to go in.',
    'Hoo! Over here! I need help first. Tap the big button and we will start!',
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
 * @param {string} kind  'tap' | 'hello' | 'missed' | 'meet' | 'thanks', or a mood word
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
