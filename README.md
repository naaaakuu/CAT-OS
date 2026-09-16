# CAT OS

**A village that grows because you get better at CAT verbal ability.**

CAT OS is an offline-first Progressive Web App for the VARC section of India's
Common Admission Test. It is not a study app with a game on top: it is a small
illustrated village you own, with people who work in it, and every building
is a real CAT skill. Reading a passage makes Pages, and Ada binds them into
Books. Learning words makes Seeds, and Bo grows them into Blooms. Taking a
word apart makes Roots, and Ines boils them into Ink. Putting a paragraph in
order makes Thread, and Nell weaves it into Cloth. Your neighbours — a
schoolteacher, a ferryman, an innkeeper — post orders for those goods with
reasons, delivering pays coins, and coins build, raise and open land. The
village grows because you learn — and it says so, on the screen, at every
moment:

> *Mira needs 1 Book for the schoolhouse shelf. Bring me Pages and I will bind them.*

The learning underneath is serious CAT preparation: a content engine of
authored, taxonomy-tagged, blind-solved items (115 passages, 76 jumbles, 77
summaries, 81 odd-ones-out, 52 placements, 27 completions, 110 word-bank
items, 51 root families, 2,577 CAT words, 401 confusable sets, 271 loanwords,
28 Word DNA units), a curator that chooses what is worth meeting next, a
ledger of the seventeen abilities the exam tests, and mentors who name the
exact trap you fell for. The game is simple; the learning is not.

## The first minutes

Black; the CAT OS mark; the camera glides down from the whole village to
your house. A small charcoal cat called **Wick** says four lines. Mira, the
schoolteacher across the way, needs a Book — Ada binds Books from Pages, and
Pages come from reading. You tap the Reading House; Ada tells you so herself,
and one button starts a short passage (the real thing, against the clock).
You come back: the Page flies into her house, a ring over the roof counts
down, and a Book appears on the shelf outside. You take it. Mira is waiting
at the order board by your door; you hand it to her, she cheers, and forty
coins fly into your purse. Bo wants a patch of ground; you build the Word
Garden under a scaffold, a builder's hammer and dust; Bo arrives at its
door. Then you name the place. That is the whole game, taught by doing it
once.

## The village

| Building | Who | You make | They make | From |
|---|---|---|---|---|
| **The Hearth** | Wick | — | — | home; five levels of house; the order board by the door |
| **The Reading House** | Ada, the bookbinder | **Pages** | **Books** | CAT passages against the clock, the second look, arguments |
| **The Word Garden** | Bo, the gardener | **Seeds** | **Blooms** | the CAT word lists, confusables, loanwords, the word bank — twelve-word rounds, some asked in a real sentence |
| **The Root Workshop** | Ines, the ink-maker | **Roots** | **Ink** | 51 Latin and Greek families in the Rootwood, prefixes and suffixes, decoding |
| **The Loom** | Nell, the weaver | **Thread** | **Cloth** | para jumbles, summaries, odd one out, sentence placement, paragraph completion |
| **The Market** | Rafi, the merchant | — | more orders, better prices | the order board: three, four, then five orders |
| **The Road Out** | — | coins | — | the weekly Gauntlet, mixed and timed |

A raw good goes straight to its building; the worker there crafts it, one
for one, on a short clock (the first in nine seconds) into the made good
that sits on the shelf outside until you collect it. Only made goods trade.

Every building has levels. A level costs coins (sometimes goods) *and* asks
for standing — three passages read well before a second floor, twelve items
solved before the spool sign — so nothing is bought without the learning
that earns it. A building's third level puts its worker to work on their
own: a Page, a Bloom, a Root or a Thread every three hours, up to three,
collected with a tap. It asks for real mastery first, and it never replaces
you; you are the engine, the village handles the repetition.

Land opens outward — the sheep pen by the pond, the orchard, the farm across
the river, the mill, the square with its well — and neighbours move into
houses you build for them, walk the paths, and post orders of their own.
There is no last building.

The village keeps what made the valley before it a place: the real clock,
with the hour's light on everything and windows and lamps and the moon on
the pond after dark; the seasons and seeded weather; the river's flow and
glints; koi for every dozen confusables told apart; ducks, birds, butterflies
and pollen, fireflies at night, leaves in autumn and petals in spring; trees
that sway; chimney smoke on days you practised; and the music.

## What the game knows about you

Every answer anywhere feeds one ledger of the seventeen abilities CAT's
verbal section tests, and the village's one card points at the one that is
slipping — in a sentence, never a dashboard. A question you missed **rests**
before it comes back (twenty minutes, then a day, then three days, then most
of a week). About 124 finite **collections** — a grove of roots, a letter of
the word lists, a stage of passages — are always there for anyone who wants
to finish something.

## Principles

- **No build step, ever.** Plain HTML, CSS and ES modules; no bundler, no
  framework, no runtime CDN. The village is drawn with the canvas path API
  into cached sprites; there are no image assets and no emoji.
- **Content is data, never code.** Every passage, family, word list and
  confusable pair is JSON in `content/`, registered in `content/index.json`
  and validated against a versioned schema at load time.
- **Local-first.** Progress lives in IndexedDB on your device; the village is
  derived from your records, so a backup carries the whole village.
- **Honest progression.** Stars are performance (accuracy, then pace) and
  are never spent. Goods come only from finished learning. Every build asks
  for standing. No casino mechanics, no energy, no guilt streaks, no locked
  learning content.
- **Performance is part of the art direction.** Sprites are cached at the
  exact device scale and blitted at whole pixels; the ground is one blit; the
  hour's light is baked, not multiplied. A frame costs about 22 ms even under
  software rasterisation.

## Running it

There is nothing to install or compile.

- **Hosted:** push to any static host (GitHub Pages, Netlify, Vercel). All
  paths are relative, so a GitHub Pages subpath works as-is.
- **Local:** serve the folder with any static server (a service worker needs
  http(s)): `npx serve .` or `python3 -m http.server`, then open
  `http://localhost:8000`.
- **Install on iPhone:** open the hosted URL in Safari → Share → *Add to Home
  Screen*. It launches full-screen and works offline after the first open.
- **Look at any hour:** in the console, `localStorage.setItem('catos:hour',
  'night')` (dawn · morning · afternoon · dusk · night) and reload.

## Verifying the repository

```sh
node tools/verify.mjs
```

Plain Node, no dependencies. It reuses the app's own validator to check every
content file and schema, the registry, the service-worker precache, the
module graph, the engines (reading, verbal crafts, Rootwood scheduler, the
village economy and its derived state, vocabulary rounds), the mentor voice,
the corpus QC, and a backup round trip. Exit 0 means the repository is
internally consistent.

Seven sections drive a **real browser** (any Chrome or Edge
on the machine; no Playwright, no npm). They exist because green unit tests
are not the same as a working screen — `verify.mjs` passed for a whole release
while the Reading Room rendered its passages at 1.14:1 contrast.

| Section | What it does |
|---|---|
| §23 `check-world-data.mjs` | Validates the map as data: 628 coordinates, none in water or a wall |
| §23b `check-world.mjs` | Drives four village states across three hours: 3450 placed objects, ninety seconds of walking |
| §24 `check-rendered-contrast.mjs` | Screenshots each route, paints the glyphs transparent, screenshots again, and measures the real ratio between ink and whatever is behind it |
| §26 `check-hostile-records.mjs` | Puts 25 deliberately broken records through eight derivations |
| §27 `check-noticing.mjs` | Checks the trap, pattern and skill ledgers actually reach a learner, in register, with a number behind every line |
| §28 `check-reach.mjs` | Walks every route with a real Tab key in both themes: focus visible, 44×44, named by something other than its own id |
| §30 `check-resume.mjs` | Answers, refreshes, resumes and finishes a set in Para Jumbles, Para Summary, Odd One Out and Word DNA, and reads the record back; pans the village until its buildings leave the frame and checks their callouts pin to the edge, tappable, and bring the village back |

A release runs the full sweep, which measures all twenty-two routes rather
than the ten riskiest:

```sh
CATOS_FULL=1 node tools/verify.mjs
```

If no Chrome is found, those sections print `SKIPPED` loudly and do not
pretend to have passed.

Other tools: `tools/check-content.mjs <file|dir>` (what content authors run),
`tools/build-index.mjs`, `tools/build-manifest.mjs`, `tools/build-precache.mjs`,
`tools/qc-corpus.mjs`, `tools/blind-solve.mjs`, `tools/build-lexicon.mjs`,
`tools/module-graph.mjs` (the cold-open budget), and `tools/cdp-lite.mjs`
(the dependency-free Chrome driver the browser gates share).

## Repository map

| Path | What it is |
|---|---|
| `index.html`, `manifest.webmanifest`, `service-worker.js` | The PWA shell |
| `src/village/` | **The village**: `defs.js` (the world as data — goods, people, buildings and levels, land, houses, orders, stages), `state.js` (the village derived from records), `art.js` (the sprite factory), `terrain.js`, `scene.js` (the living scene and building stills), `grove.js` (the Rootwood), `renderer.js` (the camera), `screens/village.js` (home) |
| `src/world/` | **The world's rules and rooms**: `economy.js` (stars, goods, orders, worth), `state.js` (learning derived from records), `regions.js` (the places), `curator.js`, `collections.js`, `lexicon.js` (vocabulary rounds and the mastery ledger), `companion.js` (Wick), `audio.js` (music, ambience, sounds), `craft-ui.js` and `icons.js` (goods and icons in the interface), `screens/` (the places, rounds, results, your standing, the Gauntlet) |
| `src/core/` | Logic with no UI: storage adapter, router, content loader + validator, session engines, scoring, the skill ledger, engagement, the mentors |
| `src/modules/` | The learning rooms: `reading-comprehension/`, `para-jumbles/`, `para-summary/`, `odd-one-out/`, `word-dna/`, `language-garden/` (the Rootwood's six-beat sessions), `verbal-bank/` (placement, completion, the word bank, arguments) |
| `src/ui/` | Design tokens, base styles, `game.css` (the world's interface language), `village.css` (the village screen), Web Components |
| `content/` | JSON by type, `content/schema/` for the versioned schemas, `content/taxonomy/` for the skill/pattern/trap taxonomy and the authoring contract, `content/index.json` as the registry |
| `tools/` | The offline self-check and the content tools |
| `STATUS.md` / `CHANGELOG.md` | What exists now / what changed, when, and why |

The product documents (the creative authority, the module Bibles, the content
pipeline) live in the `KNOWLEDGE/` folder beside this repository. The
creative authority is `KNOWLEDGE/01_KNOWLEDGE/CAT OS — THE WORLD (1.0).md`,
Part A (2.0).

## Working on CAT OS

The non-negotiables from `PROJECT RULES.md`: no build step; content never
hardcoded; storage only through the `StorageAdapter`; modules never import
each other's screens (the village composes their pure logic); stable IDs
forever; docs updated with every structural change.

Adding a building: describe it in `src/village/defs.js` (levels, costs,
standing, the good it makes, its worker), give it a recipe in
`src/village/art.js`, map its learning route in `PLACE_BUILDING` /
`MODULE_BUILDING`, and add nothing else — the state, the scene, the sheets,
the orders and the tip derive from the definition. Adding a world: another
definition file shaped like `defs.js`.

## Status & license

Current state is always in `STATUS.md`. License: not yet chosen (owner
decision pending).
