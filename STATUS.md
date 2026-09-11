# STATUS

> The honest, current state of CAT OS. One line per system:
> **shipped** (works today) / **building** (in progress) / **designed** (docs only).
> Update this file with every milestone. Stale status is a bug (Rule 1).

_Last updated: 2026-09-12 — 1.1.0, the final world rebuild: four crafts made by four CAT abilities, twenty-one works that need learning before crafts, a curator that chooses what to practise out of the whole corpus, place screens that are places, and sixteen new Word DNA units from the previously unconnected prefix/suffix reference. App version 1.1.0._

## What changed in 1.1.0

| System | State | Notes |
|---|---|---|
| **The economy** (`world/economy.js`) | **shipped (1.1.0)** | Four crafts — Amber (word knowledge), Ink (reading), Thread (verbal structure), Ember (accuracy at pace, scarce). A place can never make another place's craft. 21 works, each with a cost bag AND a standing predicate over the learner's record; 14 need three or four crafts, 11 need Embers. Three stages: Settling, Building, Flourishing |
| **The curator** (`world/curator.js`) | **shipped (1.1.0)** | Composes a word round across bundles (due → slipped → new, frequency band by reach), picks the next passage by measured stage reach and by weakness, climbs the verbal tiers rung by rung, chooses the next root family. Weakness is derived from stored per-answer question `type` — never claimed, never shown as a chart on the way in |
| **The Workshop** (`world/screens/hearth.js`) | **shipped (1.1.0)** | What am I building, what do I need, what should I practise to get it — in one screen, with a build moment that changes the map |
| **Place screens** (`world/screens/place.js`) | **shipped (1.1.0)** | The region's scene fills the screen; a sheet holds one line and one action; the shelves live under a pull. `buildBackdropScene` paints a portrait landscape per place |
| **The valley's home** (`world/screens/world.js`) | **shipped (1.1.0)** | Named pins that pulse when asking, at most three "worth doing now" cards (never three of a kind), crafts that fly into the purse, a line when you come back after days away, sky and land beyond the map's edge |
| **Visual language** (`ui/styles/world.css`) | **shipped (1.1.0)** | Painted surfaces, crafts as coloured gems, the sheet, the pins, the works, the build veil |
| **The second look** (`reading-comprehension/screens/second-look.js`) | **shipped (1.1.4)** | Up to six questions the reader got wrong and has not since got right, weighted by their weakest type; the evidence paragraph one tap away; the trap named from the corpus's own distractor analysis; settles on a right answer. Offered above a new passage once four have got away |
| **Words in context** (`tools/build-context.mjs`, `content/context/pack.json`) | **shipped (1.1.2)** | 270 words shown in a real sentence with the sense they carry there, built from the RC vocabulary blocks and the Rootwood context sentences. Three of every twelve in a word round, nine of the Gauntlet's thirty. Own mastery bucket (`context`), so place counts stay honest |
| **Life in the valley** (`world/engine/life.js`) | **shipped (1.1.3)** | Villagers walk the paths as works go up; deer come to an old Rootwood, sheep to a Meadow in bloom, ducks to a worked Pond, a dog to a Hearth with flower boxes. Nothing appears on a timer: every creature is a consequence of learning |
| **The stage** (`world/stage.js`) | **shipped (1.1.0)** | The region's own still scene painted behind the rooms beyond the valley (the Quarter, the Terraces, the Reading Room), with `data-stage` on the root lifting their screens onto warm glass. One canvas, no frame loop |
| **Word DNA content** | **shipped (1.1.0)** | 16 new units (wd-0013…wd-0028) from `99_REFERENCE/5- Prefix and Suffix.md`; the Terraces go from 12 units to 28; registry 493 items |
| **Audio** | **shipped (1.1.0)** | `startMusic` takes a `warmth` from works built and stars earned: one more pad voice and a slightly freer line as the valley fills. Same key, same calm |
| **Verification** | **shipped (1.1.0)** | The content loader reads from disk under Node, so `tools/verify.mjs` exercises the real pipeline: craft separation, bag arithmetic, work standings, round composition, reach and weakness. All 44 routes sweep with no console errors |

## Application

| System | State | Notes |
|---|---|---|
| PWA shell (index.html, manifest, icons) | **shipped** | Installable; relative paths → GitHub Pages subpath safe; `start_url` is the valley |
| Service worker / offline caching | **shipped** | Shell cache v31 + content cache v13, cache-first by exact URL; ~640 content files precached; registration waits for the first screen to paint (1.0.0) |
| Design tokens + base styles + `game.css` | **shipped (1.0.0)** | Tokens and base unchanged; `game.css` is the world's interface language (glass HUD, place sheets, run frame, star reveal, tiles/rows) and restyles the shared chrome under `[data-world]` |
| Hash router | **shipped** | Param routes; 404; modules register their own routes; the world registers `/world`, `/world/place/:slug`, `/round/:region` and `/round/:region/:field`; a query after a route is a hint for the screen, never part of the match (1.1.0) |
| `StorageAdapter` + IndexedDB adapter | **shipped** | DB `cat-os` v2; stores: settings, attempts, sessions, learning. New record kinds in `learning` (all additive, all in backups): `lex-mastery`, `lex-round`, `gauntlet-run`, `world-build`, `world-quest` |
| Backup & Restore | **shipped** | Format v2; the whole world derives from records, so a backup carries the valley |
| **The world — engine** (`src/world/engine/`) | **shipped (1.0.0)** | Canvas 2D, no dependencies, no image assets: hue-shifted palette ramps and seeded noise; a procedural pixel-sprite factory (trees at seven stages, pines, flowers, bushes, brambles, rocks, the cottage at five levels, the tower with floors/windows/observatory, three workshops, lanterns, signposts, bridges, fences, terrace walls, koi, butterflies, birds, the cat, clouds, root-stones); a renderer drawing at world resolution and blitting at whole-device-pixel zoom with camera, input, depth sort, lighting and hit-testing; particle and creature systems; the 640×720 valley terrain painted through one raster (~270 ms software), hero scenes per place. Frame ≈ 5 ms |
| **The world — state** (`src/world/state.js`, `economy.js`) | **shipped (1.0.0)** | Pure derivation of every place from records: Rootwood stages per family, Meadow/Pond/Thicket mastery from the ledger, Reading Room stars/floors/windows, workshop levels, Hearth level from builds, Ink earned − spent, stars total, three seeded daily quests with progress, the one place asking. Stars: accuracy then pace, 0–3 + flawless; Ink rules; eight upgrades; titles |
| **The world — screens** | **shipped (1.0.0)** | The valley (home), places, vocabulary rounds, the shared result (star reveal), the Hearth, the Wilds (weekly Gauntlet with records) |
| **The world — audio** (`src/world/audio.js`) | **shipped (1.0.0)** | Generative pentatonic music (tonic per place, night variant), ambience (wind, water, birds, crickets, rain), interaction sounds; HUD + Settings toggle; honours master Sounds |
| **The Rootwood** (`language-garden/`) | **shipped (1.0.0)** | The six-beat Grow/Revisit sessions and the scheduler are unchanged; the SVG valley/walk/journal are retired; sessions and plant pages render on the world's canvas (`world/garden-backdrop.js`), growth animates in the scene, Ink shown after rest; 51 families in six groves |
| **The Reading Room** (`reading-comprehension/`) | **shipped (1.0.0)** | Rebuilt run: briefing → timed reading (pace ring, target time) → questions with the clock running → star reveal with mentor lesson and Learning Page; review and mentor pages unchanged |
| **Meadow / Mirror Pond / Thicket rounds** (`world/lexicon.js`, `screens/round.js`) | **shipped (1.0.0)** | Twelve-word rounds from a field, due-first; question kinds meaning/reverse/synonym/antonym/twin/twin-meaning/loan/origin built from the entries; per-word mastery ledger (levels 0–4, spacing 10 min/1/3/7/21 d, climbs only when due, never below met) |
| **Para Jumbles / Para Summary / Odd One Out / Word DNA** | **shipped** | Unchanged journeys, restyled; each ends with the world's reward strip (stars, Ink) and returns to its place |
| Personal Reading Mentor, Growth screen, Learning Pages, reflections | **shipped** | Unchanged; the Growth screen is "the study" at the Hearth |
| Engagement: XP + levels, streaks, achievements | **shipped** | Unchanged derivations; levels give the learner's title; achievements shown at the Hearth |
| The Wilds (Gauntlet) | **shipped (1.0.0)** | Thirty words across the three vocabulary places, the same all week (seeded), three minutes, records per week and all-time, splits when the road is lit |
| Analytics, cloud sync | designed | V2.0+ |

## Content system

| System | State | Notes |
|---|---|---|
| Registry (`content/index.json`) | **shipped** | 32 RC + 19 PJ + 20 PS + 20 OOO + 12 Word DNA + 217 vocabulary + 51 Language Garden + **71 lexicon + 12 loanword + 23 twin bundles** (477 items); type-aware agreement with files (tools/verify.mjs) |
| Schemas | **shipped** | `rc.schema.v1–v4`, `pj/ps/ooo/wd/vocab/lg.schema.v1`, **`lex/loan/twin.schema.v1` (1.0.0)** — appended, never edited |
| **Lexicon / twins / loanwords** | **shipped (1.0.0)** | Generated deterministically from the owner's reference corpus by `tools/build-lexicon.mjs` (idempotent; faithful transcription; every bundle validated): 2,577 words (1,115 high / 965 medium / 497 low frequency) with synonyms and antonyms; 401 confusable sets (370 with per-word senses); 271 loanwords in 12 languages |
| Reading, verbal, Word DNA, vocabulary and Rootwood content | **shipped** | As before: 32 passages (136 questions, all stages and genres), 19 jumbles, 20 summaries, 20 odd-one-outs, 12 Word DNA families, 217 words, 51 root families |
| Verification tool (`tools/verify.mjs`) | **shipped** | Sections 1–16: every content type, registry, precache, module graph, engines, mentors, backups, the Rootwood dry run, the world (regions, economy, lexicon rounds, state derivation, audio identity, no retired imports). 507 checks pass |

## Open owner decisions

1. **License** — still unchosen.
2. **Proper nouns in the lexicon** — the generator lower-cases every headword (the source capitalises all of them); a handful of proper nouns (e.g. "john bull") are therefore lower-case. Trivially reversible in `caseWord`.
3. **Content provenance** — passages remain original compositions in CAT register; the lexicon, twins and loanwords are transcribed from the owner's own reference. Unchanged policy.

## Recorded decisions (1.0.0)

- **Canvas 2D over SVG and over a game framework.** The SVG world could not carry lighting, particles, hundreds of sprites and water at 60 fps on a phone; PixiJS/Phaser would break the no-build/no-CDN rules and add a dependency to maintain. A ~2,000-line Canvas 2D engine gives crisp pixel art at whole-device-pixel zoom, procedural sprites (no assets to rot), and a ~5 ms frame.
- **The world derives, never stores.** Every place's growth, the Ink balance, the stars and the quests are pure functions of the records already in IndexedDB (plus two small additive record kinds for builds and quest claims). No migration, no drift, backups carry the world.
- **Stars are performance; Ink is effort; levels are mastery.** Stars follow accuracy first and pace second (CAT's own two demands); Ink is earned only by finishing real practice and weighted by stars; building levels are derived from mastery and cannot be bought; nothing learnable is locked behind an upgrade (the Observatory adds a mode, the rest is the valley itself).
- **The Rootwood keeps its inner design.** No score is shown inside a session; the world's reward (Ink) appears only after the tree has come to rest. The scheduler, the six beats and the voice are untouched.
- **The Language Garden documents are superseded where they conflict with the 2026-09-11 brief.** Recorded in `KNOWLEDGE/01_KNOWLEDGE/CAT OS — THE WORLD (1.0).md`, which is the creative authority for the world.

## Recorded decisions (Milestone 2)

- **Passage shape = paragraph array.** `CONTENT_DATABASE_SCHEMA.md` (the data
  authority) mandates paragraphs as an array of `{id, text}` objects; the RC
  master prompt template shows a flat `body` string with `\n\n`. Per the authority
  hierarchy (schema wins on data structure), the schema and all content use the
  paragraph array. **Action flagged:** update the RC prompt template to emit the
  array in its next version (`RC_MASTER_GENERATION_PROMPT.v2`) so generated output
  matches stored shape.
- **Distractor analysis = array**, `[{option, trap_type, why_wrong,
  seductive_element}]`, one entry per wrong option. Same information as the schema
  doc's per-letter object, but uniform to validate and iterate.
- **Two schema-carried time fields:** `meta.estimated_time_min` (whole passage)
  and per-question `estimated_time_sec`. The registry mirrors the passage-level
  estimate. (Caught during M2 verification that these must agree — the tool now
  enforces it.)
- **No-dependency JSON-Schema validator.** ajv and friends need npm/a bundler,
  which the no-build rule forbids. Our schemas restrict themselves to the subset
  `validator.js` implements; extend that file (never add a dependency) if a future
  schema needs more.
- **Separate content cache** (`cat-os-content-v${CONTENT_VERSION}`) from the shell
  cache, so shipping app code never evicts downloaded passages and vice-versa.
- **Marks labeled "CAT-style," never official.** +3/−1 is the widely used
  convention, but the official scheme is announced per exam cycle; the result
  screen says so and shows accuracy as the primary honest signal.

- **Language Garden / Root Grove (0.14.0):** the sixth module, and the
  first built around no question-and-answer loop, no score, and no
  reward economy at all — a deliberate reversal of Word DNA's own model,
  built to a new `LANGUAGE_GARDEN_BIBLE.md` that names Word DNA (or
  rather, "the old vocabulary module" it describes, which Word DNA
  factually is) as the thing it replaces. Central decision, made with the
  owner up front rather than assumed: Word DNA is **soft-hidden**, not
  removed — its routes, code and stored data are untouched, only its
  Home/Practice advertising is gone, so the whole change is a one-line
  revert if ever wanted. Architecturally the biggest departure from every
  prior module is storage: garden sessions persist to `STORES.LEARNING`
  (`kind: 'garden-session'`) instead of `STORES.SESSIONS`, specifically
  so they can never feed `core/engagement/stats.js` and silently earn XP
  or streak credit — the Bible calls a second reward economy stacked on
  the garden a design failure by name, and the only way to guarantee that
  is to keep the data out of the system that computes XP entirely, not
  to hide it in the UI. The spacing scheduler (`computePlantState`) is
  intentionally simple relative to real SRS systems (a fixed rung ladder,
  not an ease-factor formula) because the Bible explicitly asks the
  memory model to "start conservative" and says the visual language
  "does not depend on the scheduler's exact mathematics." Three real
  authoring bugs (a member's morpheme parts not concatenating to its own
  word: chronometer, chronograph, philosophy, each missing a connecting
  vowel) were caught by a loader consistency check before ever reaching a
  screen — the same boundary discipline every prior module's content
  gets. Browser verification (not just `tools/verify.mjs`, which only
  exercises logic/data) caught real bugs no dry run could: the Reach
  beat's tap-to-join step was revealing a held-out word's meaning before
  its own construction quiz, which would have handed learners the answer
  every single time; the correct option in both the Attempt and Reach
  choice sets was always authored first in content, which without a
  seeded shuffle would have taught learners to pattern-match on position
  A/B instead of actually reasoning; and a CSS rule was unconditionally
  overriding the `hidden` attribute the plant detail page's "tap a leaf
  to recall its meaning" interaction depends on, silently deleting the
  entire recall mechanic. One content decision worth naming: `vocab-NNNN`
  is genuinely new shared infrastructure, not Root-Grove-only — every
  future garden (Vine Walk, Orchard, Wildflower Meadow, Twin Patch) is
  expected to reference the same word substrate by id rather than
  inlining words again, per the Bible's own content note (§10).
- **Word DNA (0.13.0):** the fifth module, and deliberately not called
  "Vocabulary" — the product's whole thesis is that understanding a
  word's shared parts beats memorising a list. Built to the new
  `WORD_DNA_BIBLE.md`, using two owner-supplied PDFs as the exclusive,
  non-negotiable source of truth for every word/meaning transcribed
  (never invented, rewritten, or simplified); the surrounding teaching
  layer, screens, and mentor voice are original design reusing existing
  tokens, sounds, and components only. Central IA decision: a
  **Language Tree** (root → prefix → suffix → foreign words → CAT
  vocabulary, with a sixth "Frequently Confused Words" branch reserved
  empty for later content) replaces the eight-tier ladder every other
  module uses — Word DNA isn't difficulty-staged, so it doesn't pretend
  to be. Every family runs the same loop: Notice the shared piece →
  Predict its meaning → Reveal + Understand why it threads every taught
  word → Apply it to one or two words never taught at all, the actual
  proof of transfer. Foreign words and CAT vocabulary have no shared
  root to notice, so they honestly swap the shared-piece Notice for a
  word-in-context Notice instead (Bible §3a) rather than forcing a
  pattern that isn't there. The Reading-DNA-style trait system is a
  **bounded** four, chosen from seven candidates the Bible considered
  and rejected three of by name (§5): root_recognition,
  meaning_transfer (the signature trait), context_calibration, and
  family_fluency — evidence-floored and banned-word-linted like every
  other mentor. A derived **Word Garden** (words earned via a correct
  Apply, no new storage) and a deterministic **Today's Discovery** (one
  word a day, stops itself, foreign/cat_vocab only) give the module a
  reason to open on a day without a full session. Scoring is plain
  accuracy with no CAT-style marks, on purpose — "Word DNA imitates no
  exam format." Ships with 12 families (batch-wd-001) spanning all five
  active branches, transcribed verbatim from the source PDFs; the
  schema and registry are designed so every future batch is pure
  content, no code or UI changes. One real bug caught in browser
  verification before shipping: the two-Apply flow (foreign/cat_vocab
  families) was replacing the whole Apply region on the second
  challenge, silently erasing the learner's own first correct transfer
  the instant the second appeared — fixed to accumulate, matching the
  accumulate-don't-replace pattern Notice/Predict/Understand already
  use. No new DB store, no new sounds, no new colors (`--color-info` is
  the one surface where blue is the star, reused exactly); `module:"wd"`
  in the existing sessions/attempts/learning stores; RC/PJ/PS/OOO
  untouched. `CACHE_VERSION` → 15, `CONTENT_VERSION` → 10.
- **Product audit (0.12.1):** a full screen-by-screen pass over every
  shell and module screen, looking for places a first-time CAT aspirant
  could hesitate. No new features (the brief explicitly excluded them);
  four fixes, all confirmed in a scripted Chromium pass against live
  IndexedDB before shipping, not just `verify.mjs`. The headline finding:
  Home's "Continue" card (the app's single most prominent call to action)
  asked the RC-only recommender regardless of which module the learner
  actually last practiced, so a Para-Jumbles-focused learner was
  perpetually nudged back to Reading Comprehension. Home now asks
  whichever module's own recommender matches the most recent session,
  reusing each module's existing `recommendNext{PJ,PS,OOO}` rather than
  inventing new logic. The other three fixes are straight consistency
  bugs inherited from RC shipping before the PJ/PS/OOO vocabulary
  converged: RC alone said "← Library" (its own browser page has always
  called itself "Your reading journey") and "Skip"/"Submit" where the
  three newer modules settled on "← Journey" and "Set aside"/"Lock it
  in"; and Para Jumbles alone was missing the Settings → Learning "Show
  again" row that Para Summary and Odd One Out both have. Several other
  observations (the RC Learning Page's length, Para Summary's longer
  per-item loop, the module intros' length) were deliberately left
  untouched: each is either a documented, deliberate pedagogical design
  (Bible-mandated) or a signature surface iterated across several prior
  milestones, so changing it is a call for the owner, not an audit
  autopilot. `CACHE_VERSION` → 14 (five precached files changed); no DB
  migration, no new files, no module touches another module's files.
- **Odd One Out (0.12.0):** the fourth module, built to `ODD_MAN_OUT_BIBLE.md`.
  Central design decision, straight from the Bible: the module teaches
  **structural reading, not elimination tricks** — the outlier is on-topic but
  out-of-structure, so the product leads with a **Paragraph Builder** (build
  the four, and the fifth excludes itself) at the first three tiers before the
  exam surface appears. This reuses `<cat-jumble-board>` extended additively
  (`maxPlaced` cap, `excluded` reveal state) rather than a new component, so PJ
  is untouched. The Reading DNA is a **bounded** extension: exactly the four
  §8 traits (coherence-monitoring, candidate-model-maintenance,
  relatedness-vs-belonging, ambiguity-tolerance), no invented fifth, each
  mapped to a `difficulty_vector` split so it is derived, not stored. Content
  is TITA, so the batch check guards the **answer-position spread** (outliers
  5/5/5/5/5) the way the PS check guards the correct-option spread. The §11
  validation gates ship as data on every item and are enforced by the loader
  for any accepted/review item (uniqueness, reconstruction, trap audit pass;
  heuristic-adversarial pass from Medium up). No new sounds, no DB migration,
  `module:"ooo"` in the same stores; RC/PJ/PS untouched. Roadmap ladder note in
  CHANGELOG per ROADMAP_V2's maintenance rule (Vocabulary remains last).
- **Premium Reading Library (0.8.0):** schema **v4** appended (v1–v3 files
  stay valid) adds five mentor fields that turn the Learning Page from coaching
  notes into a complete lesson — `one_sentence_summary`, `simple_explanation`
  (plain-English retelling), `why_difficult`, `reading_lesson` (one transferable
  habit), and `reflection_question` (schema-enforced to end with "?"). Twenty-four
  new passages — `batch-rc-003` (rc-0009…rc-0020) and `batch-rc-004`
  (rc-0021…rc-0032) — give every one of the 12 schema genres exactly two
  passages, at the mission's 6 easy / 12 medium / 6 hard split (25/50/25) with no
  two hard passages adjacent by id, so the journey ladder never spikes. The
  registry is now rebuilt FROM the passage
  files by a scripted mirror, so file and registry cannot drift (verify still
  enforces the mirror). Theme illustrations remain code in `mentor.js` keyed by
  passage id (content JSON stays pure data — the 0.6.0 decision, extended to all
  24 new passages plus fallback motifs for the four new genres). verify.mjs
  gained schema-precache coverage for EVERY version and points its mentor-voice
  lint at the newest schema, so a forgotten schema precache or a stale trap enum
  is unshippable. Roadmap ladder shifts by one (Para Summary → 0.9.0), recorded
  in CHANGELOG per ROADMAP_V2's maintenance rule; ROADMAP_V2 §1/§10 justify
  putting library growth ahead of the next module.
- **Personal Reading Mentor (0.7.0):** the notebook is subsumed, not
  built — recorded as a product decision, not a deferral: a ledger of
  failures contradicts the product's emotional design, while its learning
  goals (capture → resurface → retire) ship in mentor form. All mentor
  intelligence is DERIVED (dna.js reads sessions + content; nothing
  aggregated is stored); only lessons and recall state persist, in the
  existing `learning` store — no DB migration. Every mentor sentence lives
  in `voice.js`, and verify machine-lints it against the banned vocabulary
  of failure, so the register survives future sessions of work. Evidence
  floors (FLOORS in dna.js) are the fairness contract: below them the
  mentor says nothing. Recall retire-at-3 is the deliberately legible
  precursor to 1.2's spaced repetition, which should inherit this loop.
- **Reading Experience (0.6.0):** schema v3 appended (v1/v2 files stay
  valid): explanations must teach a transferable `reading_habit`; mentors
  must name the passage's characteristic `misunderstanding`. The registry
  now mirrors `difficulty_numeric` so the journey's within-stage order is
  data, not id-accident — verify enforces the mirror plus full stage
  coverage and a foundation-easy-minimum first step. Reflections are the
  first records in the anticipated `learning` store (IndexedDB v2,
  additive; backup format v2, still importing v1 files). Theme
  illustrations live in mentor.js as code (a map keyed by passage id with
  genre fallbacks) — content JSON stays pure data and never references
  artwork. verify.mjs gained the module-graph + precache-coverage check
  after the Windows `pathToFileURL` fix revealed how easily an
  import/precache drift could ship: offline breakage is now mechanically
  unshippable. Roadmap ladder shifted by one again (notebook → 0.7.0),
  recorded in CHANGELOG per ROADMAP_V2's maintenance rule.
- **Reading Mentor (0.5.0):** mentor material is CONTENT, so it lives in
  schema v2 (appended; v1 files remain valid) and every mentor's paragraph
  journey must mirror the paragraphs 1:1 (loader-enforced). Stages recommend
  and never lock. Reading font remains the system serif: vendoring a webfont
  trades durability for marginal gain; comfort ships as the size control
  instead. The genre motifs are inline SVG in the mentor screen — the app's
  only artwork, deliberately. Roadmap ladder shifted by one (notebook →
  0.6.0), recorded in CHANGELOG per ROADMAP_V2's maintenance rule.
- **Milestone 4 (engagement):** derived-first — XP, levels, streaks, and all
  statistics are pure functions of the stored sessions (single aggregation
  point: `engagement/stats.js`), so surfaces can never disagree, there is no
  DB migration, and Backup & Restore covers engagement automatically. Only
  three settings records persist: `haptics`, `sounds`,
  `engagement:celebrated` (ids already celebrated, so each milestone
  celebrates exactly once). Vocabulary achievements deferred until vocab
  interaction data exists. Sounds default OFF (iOS mute-switch behavior for
  WebAudio is not reliably consistent — verify on device).
- **Milestone 3 (experience pass):** tokens.css is now the complete design
  language; components consume tokens only (no raw hex/durations outside
  tokens.css). One orchestrated entrance + uniform press feedback; every
  animation is `prefers-reduced-motion`-safe and compositor-only
  (transform/opacity). Hover is gated behind `(hover: hover)`. M2 token names
  (`--color-ink-muted`, `--shadow-soft`, answer-feedback colors) are kept as
  aliases so embedded component styles never broke during the pass.
  `APP_VERSION` lives in app.js and must be bumped with CHANGELOG.

### Carried from Milestone 1
Relative-path constraint; system font stacks; no empty stubs for later-version
files; DB `cat-os` v1 keyed by `id`; README replaced (was an unrelated kernel OS).
