# CAT OS

**A painted village where every CAT English question you answer helps one of six small friends.**

CAT OS is an offline-first Progressive Web App for the VARC section of India's
Common Admission Test. It is not a study app with a game on top. It is one
painted village, and six pets live in it. Each pet looks after one part of
CAT English, and each is only as happy as your practice of that part.
Leave a subject alone and its friend misses you; help them and the whole
village comes back to life.

Every house in the village holds one part of CAT VARC, and its sign on the
map says which (nothing else lives there: no DILR, no quant):

| House (sign) | Friend | What you practise |
|---|---|---|
| the library (**Reading Comprehension**) | **Chai**, an owl | CAT-sized passages, the second look, arguments |
| the workshop (**Para Jumbles**) | **Ginger**, a fox | four sentences into the author's order |
| the archery cabin (**Para Summary**) | **Mochi**, a pebble | the summary that keeps the point |
| the observatory (**Odd One Out**) | **Mallow**, a cloud | the sentence that does not belong |
| the rose cottage (**Sentence Placement**) | **Ginger** | the one place a sentence fits |
| the clock tower (**Para Completion**) | **Mochi** | the sentence that finishes the paragraph |
| the greenhouse (**Vocabulary**) | **Matcha**, a sprout | word rounds, roots, word parts, words in context |
| the notice board (**The Gauntlet**) | **Toffee**, a flame | the weekly timed mix; Toffee also keeps the daily fire |

The learning underneath is serious CAT preparation:

- **Content:** an engine of authored, taxonomy-tagged, blind-solved items:
  - 146 passages, every one the size CAT sets (average 451 words, never
    more than four questions; seven are real public-domain essays), each
    with an "explain it simply" version
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

## The game in ten seconds

**Learn → earn Glow → the village grows.**

The village is losing its words. Each friend has a trouble only learning can
fix: Chai's pages are going blank, Matcha's word garden is wilting, Mochi's
notebook lost its notes, Ginger's gears are stuck, Mallow's stars went dim,
and Toffee keeps the fire that holds it all together. Every round you finish
with a friend helps them:

- **Glow.** The village's one resource, paid for learning done: 1 for each
  question you answer, 1 more when it is right, 2 for finishing a set. Time
  never counts: slow or fast, a question pays the same, and an open app or a
  skipped question pays nothing. Each question pays once a day; tomorrow it is
  review and pays again. You still see 1 to 3 stars for how a run went.
- **The village level.** Glow adds up to levels, and every level puts
  something new on the map: lanterns, bunting, flowers, firefly jars, a
  swing, chimes, a kite, lily-pad lights, sky lanterns.
- **Growing up.** Each friend grows through ten stages (6 Glow each) as you work through
  their subject: stage 1 is the first question you get right, stage 10 is
  every question in it. Every stage shows on them (a twinkle, a bigger body,
  their own hat, a ring of light, a floating charm, gold trim, a sparkle
  trail, a second charm, a golden aura, a crown of stars) and has a name.
  Every second stage is a chapter of their story and decorates their home.
- **A party after every set.** Finish a passage or three questions and every
  friend runs to the plaza to celebrate the one you helped.
- **Today's three.** Every day the three friends who miss you most wear a
  "!". Help all three and today's gift opens: 10 bonus Glow.
- **Toffee's fire.** Your days in a row. Seven in a row saves a spare log
  that covers one missed day, and adds a little Glow on a day that earned.

## The first minutes

The village opens at the campfire. Toffee says hello, then everyone
introduces themselves, and each one is their subject: Chai has read every
book in the village twice (Reading), Ginger sorts socks by colour and then
by mood (Para Jumbles), Mochi keeps it short (Para Summary), Mallow spots
the sheep among the clouds (Odd One Out), Matcha collects words (Vocabulary).
Then Chai waves from the library and the big button at the bottom glows:
**Help Chai · Read a passage · 5 min**. One tap and you are reading a real
CAT passage against the clock.

When you finish, the result screen counts up your Glow ("You helped
Chai!"), Chai thanks you, and the level bar fills. Back in the village
every friend runs to the plaza for a party round Chai, and if Chai grew a
stage you see the new look and the new name. Then the next friend's "!" is
waiting.

## The village

**One painting** (`assets/art/home-world-v1.png`, 1536 × 1024) fills the
screen at full detail and never zooms: on a phone it fills the height and
you scroll left and right (drag, wheel or arrow keys) to see the rest.
Every house carries a sign with its subject, always visible; tap the sign or
the house to go in.

**On top of it, only this:**
- the top bar: Toffee's fire, the village level and its stars, **every
  subject** (one list, each a tap from its next round) and the settings gear
  (sound, your village's name, progress, records);
- the bottom: today's three friends and their gift, and the big button.

**The friends live there.** Each one walks the painted paths on its own two
feet with its own gait (Chai waddles, Mochi plods, Ginger trots, Matcha
bounces, Toffee hops, Mallow floats), does chores round its home with a prop
in hand, visits its best friend, chats on the plaza, waves when you arrive,
and goes home to sleep at night. Every line comes with a little voice. Tap a
friend for their card: what they need, what they noticed about your answers,
the big Help button, everything you can do with them, and their story.

**The painting moves.** Forty-four pieces of the painting are cut out with
feathered edges and animated in place (the workshop gear, waterfalls and
streams, lily pads, banners, eleven trees and eight flower beds in the wind,
the campfire, the telescope). Five river reaches flow with refracted water.
Lamps breathe, chimneys smoke, fireflies come out at night.

**Sound is always on**, at full volume, until you turn it off: a composed
village theme that each friend plays on their own instrument, a quiet focus
mix while you read against the clock, and reward sounds that quote the
song's hook.

**Everything is derived from your records** (`src/pets/economy.js`), so a
backup carries the whole village and nothing can drift from the truth.

**Every other screen belongs to the same place:**
- A lesson stands in a soft painted crop of its host pet's home. A reading
  run, a word round and the Gauntlet show the host's portrait in their bar.
- A place screen shows the host at its own door.
- Results show the friend celebrating, "You helped Chai!" with the stars
  counted up, the level bar, any new stage and its story line, and today's three.
- Progress and Settings sit behind the gear and in the bottom bar; the clock
  tower and the rose cottage are subject houses. Records are kept by Toffee.
- After a passage, **Explain this passage simply** opens the passage told
  the way you would tell a ten-year-old (the big idea, the story, one line
  per paragraph, what the writer thinks), with the full expert breakdown
  folded underneath. It is the extra a rewarded ad will one day open
  (`src/core/ads/rewarded.js`); no ads are wired, so it is free.

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
- **Earned, never bought.** Every star, stage and level comes from
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
| §16 | Derives the friends: stars, village levels and decorations, growth stages, mood decay, today's three and the gift, the fire and its spare logs, the welcome (`check-pet-economy.mjs`). Also lints every line a friend can say: 96 characters at most, no em dashes, none of the mentor's banned words (`check-pets.mjs`) |
| §17 | Checks that the painting and the six pet sheets are present, and that every place has a line in register |
| §22 `check-contrast.mjs` | Checks the palette and the village's button colours against WCAG AA |
| §23 `check-village-data.mjs` | Samples the path graph against the painting's own pixels, and checks the motion atlas still matches its patches |
| §23b `check-village.mjs` | Six friends walking on two feet, the painting moving, the big button, five cards and focus, decorations by level, night, reduced motion, phone width, offline |
| §24 `check-rendered-contrast.mjs` | Screenshots each screen, paints the glyphs transparent, screenshots again, and measures the real ratio between ink and whatever is behind it. This includes the reading result screen |
| §26 `check-hostile-records.mjs` | Puts deliberately broken records through the derivations |
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
| `src/shell/` | Progress, Settings, preferences |
| `src/core/` | Logic with no UI: storage adapter, router, content loader and validator, session engines, scoring, the skill ledger, engagement, the mentors |
| `src/modules/` | The learning rooms: `reading-comprehension/`, `para-jumbles/`, `para-summary/`, `odd-one-out/`, `word-dna/`, `language-garden/` (the Rootwood's six-beat sessions), `verbal-bank/` (placement, completion, the word bank, arguments) |
| `src/ui/` | Design tokens and styles, plus Web Components. The styles are `home.css` (the village and the pets), `rewards.css` (results), `world.css` and `game.css` (the rooms) |
| `assets/art/` | The painting, the companion strip, the six baked pet sheets, the motion atlas, and the plant stills `<cat-plant>` uses |
| `content/` | JSON by type. `content/schema/` holds the versioned schemas, `content/taxonomy/` the skill/pattern/trap taxonomy and authoring contract, and `content/index.json` is the registry |
| `tools/` | The offline self-check, the browser gates, the bakes and the content tools |
| `STATUS.md` / `CHANGELOG.md` | What exists now / what changed, when, and why |

**`src/pets/`:**
- `pets.js`: the roster, best friends, troubles, requests, and the friends' voice and stories.
- `economy.js`: stars, village levels and decorations, growth stages, mood, today's
  three and the gift, the fire, the welcome, all derived from records.
- `next.js`: each pet's next activity.
- `paths.js`: where everything is in the painting.
- `sprite.js`: pets (and the walking rig), icons and painted backdrops in HTML.
- `sheets.js`: the frame metadata for the baked pet sheets.

**`src/home/`:**
- `village.js`: the camera, the top bar, the big button, today's three, celebrations, the welcome.
- `life.js`: the friends' gaits, chores, greetings and voices, and the ambient canvas.
- `motion.js` and `motion-atlas.js`: the living painting.
- `cards.js`: the friend, fire, level, every-subject, today and settings cards, and the decorations on the map.

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
