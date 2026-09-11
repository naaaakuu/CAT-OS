# src/modules/language-garden/ — the Rootwood's sessions

The Rootwood is the world's root-and-word-family place (see `src/world/`
and `KNOWLEDGE/01_KNOWLEDGE/CAT OS — THE WORLD (1.0).md`). This module owns
what happens **inside** it: the six-beat Grow and Revisit sessions, the plant
page, and the pure logic the world reads to draw every family as a tree.

Since 1.0.0 the valley, the walk, the journal and the discoveries that used
to live here as SVG screens are retired; the world engine draws the Rootwood
(`src/world/engine/map.js`) and sessions render on its canvas
(`src/world/garden-backdrop.js`). The learning design is unchanged: no score
inside a session, construction before recall, a scheduler that never demotes.

```
index.js             registerLanguageGarden(router, context)
                       /garden/session/:id   the six-beat Grow / Revisit session
                       /garden/plant/:id     a plant at a glance: key, members, one action
                       /garden, /garden/biome/*, /garden/journal  → redirect into the world
screens/session.js   the session: Encounter+Attempt → Key → Spread → Reach → Growth
                       (grow) or Key retrieval → two member checks → Reach → Growth
                       (revisit); growth animates in the canvas scene; the Ink earned
                       is shown once the tree has come to rest
screens/plant.js     one plant on the canvas backdrop
logic/store.js       persistence through the StorageAdapter only (garden-session
                       records in STORES.LEARNING, seeds/sightings via the Gate)
logic/scene.js       derives valley/biome state from content + history (pure)
logic/groves.js      the six semantic groves and every family's stand (pure)
logic/biomes.js      the biome/engine registry (only the Rootwood is living)
logic/effort.js      the Stream, ground tiers, path wear (pure)
logic/atmosphere.js  time of day, season, weather from the Date (pure)
logic/audio.js       the session's own sounds: the key, leaf taps, growth, the
                       Valley Phrase (import-safe under Node)
```

Core services composed: `core/engine/garden-session.js` (`computePlantState`
scheduler + the `GardenSession` state machine), `core/mentor/garden-voice.js`
(the quiet gardener, banned-word-linted), `core/content-loader` (`listLGItems`,
`loadLGItem(s)`, `loadVocabItem(s)`).

## Content shape (Rule 22)

`content/language-garden/lg-NNNN.json` (schema `lg.schema.v1.json`): `meta.garden`
(`root_grove`), `root` (label, origin_language, core_meaning, optional mentor_note),
`attempt` (a prompt and exactly two options), `members[]` (`vocab_id`, `held_out`,
morpheme `parts` with glosses, exactly two `context_sentences`; held-out members
carry `construct_options`). Words and meanings are resolved from
`content/vocabulary/vocab-NNNN.json` at load time. A family's grove is authored
in `logic/groves.js`; a family in no grove is seated at the wood's edge and
reported by `tools/verify.mjs`.
