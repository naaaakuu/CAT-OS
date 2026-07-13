# src/modules/language-garden/ — the Language Garden module

Vocabulary stops being content to consume and becomes a living place
the learner tends (`LANGUAGE_GARDEN_BIBLE.md`). The unit of learning is
a **family** (a plant), not a word; the unit of progress is growth,
never a score. This is the module's first vertical slice: only the
**Root Grove** (Latin and Greek roots, the "decompose" engine of Bible
§5.1) is built. The other four gardens (Vine Walk, Orchard, Wildflower
Meadow, Twin Patch) are reserved in the schema's `garden` enum but ship
no content or screens yet, exactly as `WORD_DNA_BIBLE` reserved
"confused" before that content existed.

Structure (the standard module island, Rule 5 — no imports from other
modules):

```
index.js             registerLanguageGarden(router, context); all app.js knows
screens/grove.js      the Root Grove scene (module home; first-ever
                       visit hands straight to screens/session.js — no
                       tutorial, Bible §6.3)
screens/plant.js      one plant at a glance: key, members, one action
screens/session.js    the six-beat Grow/Revisit session (Bible §5, §6.6)
screens/journal.js    what you can read now + wild sightings (Bible §11)
logic/store.js        persistence through the StorageAdapter only (Rule 6)
logic/scene.js        derives the grove's state from content + history (pure)
logic/journal.js      derives Journal content from content + history (pure)
logic/scene.js        which plant (if any) is asking; guilt containment
logic/ambient.js       decides whether/which tiny living event appears (pure)
logic/audio.js        the garden's own small, separate sound identity
```

Core services this module composes: `core/engine/garden-session.js`
(the spacing scheduler `computePlantState()` plus the `GardenSession`
beat-by-beat state machine — plain construction/retrieval, no CAT-style
marks, no score of any kind), `core/mentor/garden-voice.js` (the quiet
gardener; banned-word-linted like every other mentor, but deliberately
carries none of the DNA-trait/one-lesson apparatus the other mentors
use — Bible §13 forbids a second reward economy, and abolishes the
mentor page outright in favour of single lines at earned moments), and
`core/content-loader` (`listLGItems`, `loadLGItem`, `loadVocabItem(s)`
— schema + cross-file consistency validated at the boundary).

**Storage is deliberately NOT `STORES.SESSIONS`.** Garden sessions are
`kind: 'garden-session'` records in `STORES.LEARNING` instead, so they
never feed the shell's XP/streak/achievement system (`core/engagement/
stats.js` reads `STORES.SESSIONS` unconditionally) — see `logic/
store.js` for the full reasoning. They are still fully covered by
Backup & Restore.

## Content shape this module expects (Rule 22)

Two content types, because every future garden shares the first one:

**`content/vocabulary/vocab-NNNN.json`** (schema
`content/schema/vocab.schema.v1.json`) — one standalone word: `word`,
`meaning` (one line), optional `part_of_speech`, plus the usual
id/status/source/provenance envelope. This is the shared substrate
`MASTER_CONTEXT.md` already reserves the `vocab` prefix for; every
future garden references words by id here rather than inlining them
(Rule 3: never duplicate content).

**`content/language-garden/lg-NNNN.json`** (schema `content/schema/
lg.schema.v1.json`) — one plant:
- `meta.garden` — which garden (`root_grove` today).
- `root` — `label` (the root itself, e.g. `"cede"`), `origin_language`
  (`Latin` | `Greek`), `core_meaning`, and an optional one-sentence
  `mentor_note` shown only on the plant detail page.
- `attempt` — the opening directional read (Bible §5.1): a prompt and
  exactly two options, tested against `members[0]`'s first context
  sentence.
- `members` — 4 to 8 entries, each `{vocab_id, held_out, parts,
  context_sentences}`. `parts` is the morpheme breakdown (`{text,
  gloss, is_root}`) the Spread and Reach beats tap-to-reveal; the
  loader enforces that a member's parts actually concatenate to its
  word. `context_sentences` is exactly two: `[0]` teaches, `[1]` is the
  "fresh" sentence every revisit reuses (Bible §6.6). 2 or 3 members
  are taught (`held_out: false`, walked in Spread); at least 2 are
  reserved Reach words (`held_out: true`), each additionally carrying
  `construct_options` (exactly one correct, others may carry a `trap`
  tag) for the Reach beat's construction quiz. Word/meaning facts are
  never inlined here — they are resolved from `vocab_id` at load time
  and merged onto the member in memory.

Garden sessions persist to `STORES.LEARNING` with `kind:
'garden-session'` (see above). No XP, no achievements, no celebration
overlay, no progress bar or clock inside a session — all deliberate
omissions, not oversights (Bible §13).

## Adding content later (no code changes)

New Root Grove plants are new `content/language-garden/lg-NNNN.json`
files (plus any new `vocab-NNNN.json` words they reference) and new
registry rows. A future garden (Vine Walk, Orchard, Wildflower Meadow,
Twin Patch) needs a new `garden` value, a new session "engine" (Bible
§5 names four: decompose, contrast, picture, discriminate — this
module only implements decompose), and its own screens; the content
substrate (`vocab-NNNN`) and the module-island shape already generalize.
