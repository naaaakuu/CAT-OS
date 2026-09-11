# CAT OS

**A living world that makes you better at CAT verbal ability by playing it.**

CAT OS is an offline-first Progressive Web App for the VARC section of India's
Common Admission Test. It is not a study app with a game on top: it is a
small, hand-drawn pixel-art valley you open, explore and grow, where every
place is a real CAT skill and everything you learn changes the land.

The loop is **learn → perform → earn → build → see the world change**. You
never browse a library: a curator chooses what is worth meeting next out of
~3,900 words, 51 root families, 32 passages and 59 verbal items, weighing
what you have mastered, what is due, how hard you can currently work, and
what your own answers say you are weak at.

- **The Rootwood** — 51 Latin and Greek root families (217 words): take a word
  apart, build one nobody taught you, and a tree grows in one of six groves.
- **The Meadow** — the CAT word lists: 2,577 high-, medium- and low-frequency
  words with meanings, synonyms and antonyms, played as timed twelve-word
  rounds, three of them asked the way CAT asks — a word inside a real
  sentence. Every word you master opens a flower that stays.
- **The Mirror Pond** — 401 confusable word pairs and triples. Tell the twins
  apart and koi arrive.
- **The Thicket** — 271 loanwords from twelve languages. A lantern lights for
  every language you learn.
- **The Reading Room** — 32 CAT-register passages (136 questions) read
  against the clock. Three stars means three quarters right inside the
  passage's own time; the tower gains floors and lit windows as you earn them.
- **The Loom · The Summary Table · The Stranger's Bench** — Para Jumbles, Para
  Summary and Odd One Out: eight-tier journeys with a mentor who names the
  exact trap you fell for. The workshops grow as tiers are cleared.
- **The Vine Terraces** — 28 Word DNA units: prefixes, suffixes, roots,
  foreign words and CAT vocabulary learned by pattern, each ending in a word
  you were never shown.
- **The Hearth** — home and the Workshop: the four crafts you have made, the
  twenty-one works you can build with them, the day's three asks, and the
  honest read on where you stand.
- **The Wilds** — the weekly Gauntlet: the same thirty questions all week —
  words from three places and nine asked the way CAT asks them, inside a
  real sentence — three minutes, against your own best.

## The four crafts

Each kind of thinking makes one kind of resource, and no place can make
another place's:

| Craft | Made by | Where |
|---|---|---|
| **Amber** | word knowledge | Meadow, Mirror Pond, Thicket, Rootwood, Terraces |
| **Ink** | reading comprehension | the Reading Room |
| **Thread** | verbal structure | the Loom, the Table, the Bench |
| **Ember** | accuracy at CAT pace | three-star runs, clean revisits, the Gauntlet |

Crafts are spent on **works** — stone paths, arched bridges, lanterns, the
Reading Room's floors and its Observatory, beehives, the Quarter's square,
the traveller's arch, the root shrine. Every work costs crafts *and* asks a
standing of your record ("Read four passages at two stars or better"), so
nothing in the valley can be bought before the learning that earns it, and
the later works need three or four crafts at once. As works go up, villagers
begin to walk the paths.

## Principles

- **No build step, ever.** Plain HTML, CSS and ES modules; no bundler, no
  framework, no runtime CDN. The world engine is 2,000 lines of Canvas 2D.
- **Content is data, never code.** Every passage, family, word list and
  confusable pair is JSON in `content/`, registered in `content/index.json`
  and validated against a versioned schema at load time.
- **Local-first.** Progress lives in IndexedDB on your device; the world is
  derived from your records, so a backup carries the whole valley.
- **Honest progression.** Stars are performance (accuracy, then pace). Ink is
  earned only by finishing real practice and spent only on the world. Levels
  of buildings are derived from mastery, never bought. No casino mechanics,
  no guilt streaks, no locked learning content.

## Running it

There is nothing to install or compile.

- **Hosted:** push to any static host (GitHub Pages, Netlify, Vercel). All
  paths are relative, so a GitHub Pages subpath works as-is.
- **Local:** serve the folder with any static server (a service worker needs
  http(s)): `npx serve .` or `python3 -m http.server`, then open
  `http://localhost:8000`.
- **Install on iPhone:** open the hosted URL in Safari → Share → *Add to Home
  Screen*. It launches full-screen and works offline after the first open.

## Verifying the repository

```sh
node tools/verify.mjs
```

Plain Node, no dependencies. It reuses the app's own validator to check every
content file and schema, the registry, the service-worker precache, the
module graph, the engines (reading, verbal crafts, Rootwood scheduler, world
economy, vocabulary rounds, world-state derivation), the mentor voice, and a
backup round trip. Exit 0 means the repository is internally consistent.

To regenerate the vocabulary bundles from the owner's reference corpus:

```sh
node tools/build-lexicon.mjs
```

## Repository map

| Path | What it is |
|---|---|
| `index.html`, `manifest.webmanifest`, `service-worker.js` | The PWA shell |
| `src/world/` | **The world**: `engine/` (palette, procedural pixel sprites, canvas renderer, life, the map and hero scenes), `regions.js` (the places), `state.js` (the world derived from records), `economy.js` (stars, Ink, quests, upgrades), `lexicon.js` (vocabulary rounds and the mastery ledger), `audio.js` (music, ambience, interaction sounds), `screens/` (the valley, the places, rounds, results, the Hearth, the Wilds) |
| `src/core/` | Logic with no UI: storage adapter, router, content loader + validator, session engines, scoring, engagement, the mentors |
| `src/modules/` | The learning rooms: `reading-comprehension/` (the Reading Room's run), `para-jumbles/`, `para-summary/`, `odd-one-out/`, `word-dna/`, `language-garden/` (the Rootwood's six-beat sessions on the world's canvas) |
| `src/ui/` | Design tokens, base styles, `game.css` (the world's interface language), Web Components |
| `content/` | JSON by type: `reading-comprehension/`, `para-jumbles/`, `para-summary/`, `odd-one-out/`, `word-dna/`, `vocabulary/`, `language-garden/`, `lexicon/`, `twins/`, `loanwords/`; `content/schema/` holds the versioned schemas; `content/index.json` is the registry |
| `tools/verify.mjs` | The offline self-check |
| `tools/build-lexicon.mjs` | The reference-corpus → lexicon/twins/loanwords generator |
| `STATUS.md` / `CHANGELOG.md` | What exists now / what changed, when, and why |

The product documents (the design authority, the module Bibles, the content
pipeline) live in the `KNOWLEDGE/` folder beside this repository. For 1.0.0
the creative authority is `KNOWLEDGE/01_KNOWLEDGE/CAT OS — THE WORLD (1.0).md`.

## Working on CAT OS

The non-negotiables from `PROJECT RULES.md`: no build step; content never
hardcoded; storage only through the `StorageAdapter`; modules never import
each other's screens (the world composes their pure logic); stable IDs
forever; docs updated with every structural change.

Adding a place to the world: add a region to `src/world/regions.js`, draw it
in `src/world/engine/map.js`, derive its state in `src/world/state.js`, give
it a section in `src/world/screens/place.js`, and add its files to the
service worker's precache list.

## Status & license

Current state is always in `STATUS.md`. License: not yet chosen (owner
decision pending).
