# CAT OS

**A painted village where six small friends get happier as your CAT English gets better.**

CAT OS is an offline-first Progressive Web App for the VARC section of India's
Common Admission Test. It is not a study app with a game on top. It is one
painted village, and six pets live in it. Each pet looks after one part of
CAT English, and each is only as happy as your practice of that part.
Neglect a subject and you see it: that pet droops, its neighbour slows down,
and the lanterns dim across the village.

| Pet | What it looks after | Lives in |
|---|---|---|
| **Toffee**, a flame | CAT pace: the weekly Gauntlet. Also keeps the village fire | the campfire and notice board |
| **Chai**, an owl | Reading: passages, the second look, arguments | the library |
| **Matcha**, a sprout | Vocabulary: word rounds, roots, word parts, the word bank | the greenhouse |
| **Mochi**, a pebble | Para summary and paragraph completion | the archery cabin |
| **Ginger**, a fox | Para jumbles and sentence placement | the workshop |
| **Mallow**, a cloud | Odd one out | the observatory |

The learning underneath is serious CAT preparation:

- **Content:** an engine of authored, taxonomy-tagged, blind-solved items:
  - 115 passages
  - 76 jumbles
  - 77 summaries
  - 81 odd-ones-out
  - 52 placements
  - 27 completions
  - 110 word-bank items
  - 51 root families
  - 2,577 CAT words
- **A curator** that chooses what is worth meeting next.
- **A ledger** of the seventeen abilities the exam tests.
- **Mentors** who name the exact trap you fell for.

The game is simple; the learning is not.

## The first minutes

The village opens on its plaza. Toffee, at the fire, says hello in three
short lines. Then Chai's thought bubble lights up: she has a short passage
waiting.

Tap Chai and her card opens:
- her mood;
- her friendship hearts;
- one line in her voice;
- one button that starts the real thing: a CAT passage, against the clock.

When you finish, the result screen stands in her library. Chai celebrates
and counts up the stories she made from your reading. You come back to the
village, Chai hops, and a toast names what you earned.

You can name the village in your cottage whenever you like. Nothing is
behind a gate.

## The village

**One painting** (`assets/art/home-world-v1.png`, 1536 × 1024) fills the
screen. You pan by drag, wheel or arrow keys, and zoom by pinch,
ctrl+wheel or the zoom buttons. Desktop opens with the whole village visible;
the overview button fits the whole map on a phone as well.

**Three small pieces of chrome sit on it:**
- Toffee's flame, with the day count and the village name;
- the satchel and the cottage;
- today's wishes.

Everything else is in the world:
- tap a pet or its house for its card;
- tap the clock tower for Progress;
- tap your cottage for sound, settings and backup.

**The painting moves.** Forty-four pieces of the painting are cut out with
feathered edges and animated in place, so at rest each one is pixel-identical
to the picture beneath it:
- the workshop gear and wheels turn;
- the waterfalls and streams run, and the pond drifts;
- lily pads bob;
- banners, bunting and awnings stir;
- eleven trees and eight flower beds sway as a gust crosses the map;
- the campfire flickers;
- the telescope pans now and then, and the armillary turns.

Five visible river reaches also have refracted water, downstream foam,
travelling surface ripples and moving reflections. A cached colour mask
keeps the water inside the painted banks and behind bridges, rocks and
lilies. Tap the water to leave a ripple. Small canvases cover only the water,
update at 30 fps and stop when the tab is hidden. Reduced motion leaves the
original painting still. Drifting sunlight and cloud shadows give the
village changing light without moving the camera.

Over that:
- **Light:** every lamp and lantern breathes a warm halo, faint by day and
  full at dusk and night. Smoke rises from four chimneys and the teapot
  steams.
- **Sky:** the real clock sets the hour's light, and the clock tower keeps
  real time. Fireflies come out at night; butterflies, birds, autumn leaves
  and rain come by day.

**The pets live there.** Each one:
- hop-walks the painted paths, blinks and chats in pairs;
- carries its gift next door;
- sits by the fire;
- walks home to sleep at night.

How far a pet wanders is its mood.

**The economy is derived from your records** (`src/pets/economy.js`). It
recomputes on every load, so a backup carries the whole village:

- **Mood.** Each pet's mood comes from how recently and how well you
  practised its subject (a 36-hour half-life). A pet you have not met yet is
  waiting, never sad.
- **The gift ring:** Matcha → Chai → Mochi → Ginger → Mallow → Toffee →
  Matcha. Each pet makes its gifts twice as fast while the pet before it is
  happy.
- **Harmony.** A mean of all six moods, weighted toward the lowest. It sets
  how many lanterns are lit, the size of the fire, the warmth of the music
  and the number of fireflies.
- **Friendship.** Five hearts per pet, each unlocking a line of its story.
- **Nine treasures, made in order** from the gifts in your satchel:
  lanterns, bunting, flower boxes, firefly jars, a swing, wind chimes, a
  kite, lily-pad lights and sky-lantern night. Each one is drawn on the map.
  A treasure is the only new kind of record (`village-treasure`).
- **Reasons to come back:**
  - three daily wishes aimed at whoever needs you most;
  - Toffee's flame, your daily run, protected by kindling;
  - a letter, pinned to the notice board, from the pet who missed you
    after a day away;
  - festival nights when everyone is happy.

**Every other screen belongs to the same place:**
- A lesson stands in a soft painted crop of its host pet's home. A reading
  run, a word round and the Gauntlet show the host's portrait in their bar.
- A place screen shows the host at its own door.
- Results show the pet celebrating, the gifts it made, the ring bonus, any
  new heart and its story line, and a treasure you can now make.
- Progress is the clock tower and Settings is your cottage. Records are kept
  by Toffee.

## What the game knows about you

Every answer anywhere feeds one ledger of the seventeen abilities CAT's
verbal section tests. Each pet's card offers the curator's next activity
for that subject.

A question you missed **rests** before it comes back: twenty minutes, then a
day, then three days, then most of a week.

About 124 finite **collections** are always there for anyone who wants to
finish something: a grove of roots, a letter of the word lists, a stage of
passages.

## Principles

- **No build step, ever.** Plain HTML, CSS and ES modules. There is no
  bundler, no framework and no runtime CDN.
- **Content is data, never code.** Every passage, family, word list and
  confusable pair is JSON in `content/`, registered in `content/index.json`
  and validated against a versioned schema at load time.
- **Local-first.** Progress lives in IndexedDB on your device. The village
  is derived from your records.
- **Earned, never bought.** Every gift, heart and treasure comes from
  finished learning. Stars are performance (accuracy, then pace) and are
  never spent.

  The pets' pull to come back is deliberate (THE WORLD A11). What it rests
  on is real practice, never a timer or a purchase.
- **One painting, no new art.** The pets' five frames were baked from the
  original strip (`tools/bake-pets.mjs`). The moving parts of the village
  were cut from the painting itself (`tools/bake-motion.mjs`).
- **Performance is part of the art direction.** The moving patches carry
  their feathered edges baked in rather than as CSS masks: thirty-six masks
  halved the frame rate on an Intel HD 520. The lamp halos use plain alpha
  rather than a blend mode. On that GPU, the village holds a 16.7 ms median
  frame on a phone and on a 1440 × 900 desktop.

## Running it

There is nothing to install or compile.

- **Hosted:** push to any static host (GitHub Pages, Netlify, Vercel). All
  paths are relative, so a GitHub Pages subpath works as-is.
- **Local:** serve the folder with any static server (a service worker needs
  http(s)), for example `npx serve .`, then open the address it prints.
- **Install on iPhone:** open the hosted URL in Safari → Share → *Add to Home
  Screen*. It launches full-screen and works offline after the first open.
- **Look at any hour:** in the console, run
  `localStorage.setItem('catos:hour', 'night')` and reload. The hours are
  dawn, morning, afternoon, dusk and night.

## Verifying the repository

```sh
node tools/verify.mjs
```

This is plain Node with no dependencies. It reuses the app's own validator
to check:
- every content file, its schema and the registry;
- the service-worker precache and the module graph;
- the engines, the pets' economy, the mentor voice and the corpus QC;
- a backup round trip.

Exit 0 means the repository is internally consistent.

Several sections drive a **real browser**: any Chrome or Edge on the
machine, with no Playwright and no npm. They exist because green unit
tests are not a working screen. `verify.mjs` once passed for a whole release
while the Reading Room rendered its passages at 1.14:1 contrast.

| Section | What it does |
|---|---|
| §16 | Derives the pets: mood decay, ring doubling, harmony, the flame and its kindling, wishes, and treasure stock (`check-pet-economy.mjs`). Also lints the pets' lines: no "!", 96 characters at most, none of the mentor's banned words (`check-pets.mjs`) |
| §17 | Checks that the painting and the six pet sheets are present, and that every place has a line in register |
| §22 `check-contrast.mjs` | Checks the palette and the village's button colours against WCAG AA |
| §23 `check-village-data.mjs` | Samples the path graph against the painting's own pixels, and checks the motion atlas still matches its patches |
| §23b `check-village.mjs` | Six pets walking, the painting moving, cards and focus, a treasure made, night, reduced motion, phone width, offline |
| §24 `check-rendered-contrast.mjs` | Screenshots each screen, paints the glyphs transparent, screenshots again, and measures the real ratio between ink and whatever is behind it. This includes the reading result screen |
| §26 `check-hostile-records.mjs` | Puts deliberately broken records, broken treasures included, through the derivations |
| §27 `check-noticing.mjs` | Checks that the trap, pattern and skill ledgers reach a learner, in register, with a number behind every line |
| §28 `check-reach.mjs` | Walks every route and the village cards with a real Tab key in both themes: focus visible, 44 × 44, every control named |
| §29 `check-interruption.mjs` | Feeds garbage drafts and record logs through six engines and the satchel |
| §30 `check-resume.mjs` | Answers, refreshes, resumes and finishes a set in four rooms, then comes back to the village and checks the greeting |

A release runs the full contrast sweep over every route, not just the
riskiest:

```sh
CATOS_FULL=1 node tools/verify.mjs
```

If no Chrome is found, those sections print `SKIPPED` loudly and do not
pretend to have passed.

**Other tools:**
- `tools/check-content.mjs <file|dir>`, which content authors run;
- `tools/bake-pets.mjs` and `tools/bake-motion.mjs`, the two art bakes;
- `tools/build-index.mjs`, `tools/build-manifest.mjs`, `tools/build-precache.mjs`;
- `tools/qc-corpus.mjs`, `tools/blind-solve.mjs`, `tools/build-lexicon.mjs`;
- `tools/module-graph.mjs`, the cold-open budget;
- `tools/cdp-lite.mjs`, the dependency-free Chrome driver the browser gates
  share.

## Repository map

| Path | What it is |
|---|---|
| `index.html`, `manifest.webmanifest`, `service-worker.js` | The PWA shell |
| `src/pets/` | **The pets**, see below |
| `src/home/` | **The village screen** at `#/world`, see below |
| `src/world/` | **The rooms around the village**, see below |
| `src/shell/` | Progress (the clock tower), Settings (your cottage), preferences |
| `src/core/` | Logic with no UI: storage adapter, router, content loader and validator, session engines, scoring, the skill ledger, engagement, the mentors |
| `src/modules/` | The learning rooms: `reading-comprehension/`, `para-jumbles/`, `para-summary/`, `odd-one-out/`, `word-dna/`, `language-garden/` (the Rootwood's six-beat sessions), `verbal-bank/` (placement, completion, the word bank, arguments) |
| `src/ui/` | Design tokens and styles, plus Web Components. The styles are `home.css` (the village and the pets), `rewards.css` (results), `world.css` and `game.css` (the rooms) |
| `assets/art/` | The painting, the companion strip, the six baked pet sheets, the motion atlas, and the plant stills `<cat-plant>` uses |
| `content/` | JSON by type. `content/schema/` holds the versioned schemas, `content/taxonomy/` the skill/pattern/trap taxonomy and authoring contract, and `content/index.json` is the registry |
| `tools/` | The offline self-check, the browser gates, the bakes and the content tools |
| `STATUS.md` / `CHANGELOG.md` | What exists now / what changed, when, and why |

**`src/pets/`:**
- `pets.js`: the roster, the ring, and the pets' voice and stories.
- `economy.js`: mood, gifts, harmony, the flame, wishes, treasures and
  letters, all derived from records.
- `next.js`: each pet's next activity.
- `paths.js`: where everything is in the painting.
- `sprite.js`: pets, gifts and painted backdrops in HTML.
- `sheets.js`: the frame metadata for the baked pet sheets.

**`src/home/`:**
- `village.js`: the camera, the HUD, the cards and the returns.
- `life.js`: the pets' behaviour and the ambient canvas.
- `motion.js` and `motion-atlas.js`: the living painting.
- `cards.js`: the pet, hearth, satchel, cottage and letter cards.

**`src/world/`:**
- `state.js`: learning derived from records, with `state.pets`.
- `economy.js`: stars.
- `regions.js`: the places.
- `curator.js` and `collections.js`.
- `lexicon.js`: vocabulary rounds.
- `rewards.js` and `screens/`: places, rounds, the Gauntlet, results,
  records.
- `stage.js`: the painted room behind every lesson.
- `audio.js`: music, ambience and sounds.

The product documents (the creative authority, the module Bibles, the
content pipeline) live in the `KNOWLEDGE/` folder beside this repository.
The creative authority is `KNOWLEDGE/01_KNOWLEDGE/CAT OS — THE WORLD (1.0).md`;
Part A11 is the pet village.

## Working on CAT OS

These are the non-negotiables from `PROJECT RULES.md`:
- no build step;
- content is never hardcoded;
- storage goes only through the `StorageAdapter`;
- modules never import each other's screens (the village composes their
  pure logic);
- IDs stay stable forever;
- docs are updated with every structural change.

**Moving a piece of the painting:** add a patch to `PATCHES` in
`src/home/motion.js`, with coordinates read off a zoomed crop of the
painting. Then run `node tools/bake-motion.mjs` and
`node tools/build-precache.mjs`. §23 fails while the atlas is stale.

**A new subject for a pet:**
1. Map its module in `MODULE_PET` and its place in `PLACE_PET`
   (`src/pets/pets.js`).
2. Give it stars in `src/pets/economy.js`.
3. Give it a next activity in `src/pets/next.js`.

Everything else derives from the records.

## Status & license

Current state is always in `STATUS.md`. License: not yet chosen (owner
decision pending).
