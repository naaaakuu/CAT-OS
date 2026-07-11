# src/modules/para-summary/ — the Para Summary module

The summary journey: an eight-tier ladder (Foundation → Easy → Medium →
Advanced → CAT → CAT+ → 99 Percentile → Premium) of paragraph-and-four-
options items, built faithfully to `PARA SUMMARY BIBLE.md`. Each tier
teaches ONE reading skill before the next raises the pressure, every
wrong option carries exactly one named distortion archetype from the
Bible's §7 palette, and every attempt updates the reader's Para Summary
Reading DNA (`core/mentor/ps-dna.js`).

The two module-defining experiences:

- **The Summary Builder** — before the options, the learner writes the
  author's point in one sentence of their own, then compares it against
  the ideal summary on the item's own checks (core idea, scope,
  certainty, additions, stance). Generation before recognition.
- **The Think button** — a floating coach available while solving. It
  never hints; it asks the questions expert readers ask themselves
  (Bible §3), tuned to the item's mission.

Structure (the standard module island, Rule 5 — no imports from other
modules):

```
index.js            registerPS(router, context); all app.js knows
screens/intro.js    the first-time introduction (then /ps/about forever;
                    Settings can reset it)
screens/browser.js  the tier journey
screens/session.js  mission → read → write → choose → be taught → mentor
screens/learn.js    an item's revisitable Learning Page
logic/tiers.js      the eight-tier ladder + recommendation (pure)
logic/store.js      persistence through the StorageAdapter only (Rule 6)
logic/teach.js      the teaching-layer HTML, tier-progressive (pure)
logic/think.js      the Think coach's deterministic question picker (pure)
```

Core services this module composes: `core/engine/ps-session.js`
(+3 / 0 CAT-style marks, labeled as per-cycle convention),
`core/mentor/ps-voice.js` / `ps-dna.js` / `ps-lesson.js` (the mentor),
`core/content-loader` (`listPSItems`, `loadPSItem` — schema +
consistency validated at the boundary), and the shared engagement
system (XP, streaks, sounds — nothing new was added to the audio
registry; every cue reuses the existing sound language).

## Content shape this module expects (Rule 22)

One JSON file per item in `content/para-summary/ps-NNNN.json`,
validated against `content/schema/ps.schema.v1.json`. The shape, in
brief (the schema file is the authority):

- `meta` — id/type/status envelope plus the Bible metadata: `tier`
  (the eight-step ladder) and `bible_level` (the Bible's five levels;
  the loader enforces the mapping), `architecture` (§2 paragraph
  shape), `apex` (the claim with its scope, certainty and stance,
  fixed before options were written, §10), `turn`, the eight
  `difficulty_dials` (§5), `load_bearing` words, `separating_element`
  (required at elite, §5), `dna_traits`, `mission` (Today's Mission),
  `format` (carried as configuration with a verification note, never
  a constant).
- `paragraph.sentences` — the source paragraph, each sentence labeled
  with its function (§2): thesis, support, evidence, example,
  concession, setup, conclusion, restatement, qualification, question.
  At most one thesis; zero means the apex is implicit.
- `ideal_summary` — the faithful compression the correct option
  paraphrases and the Summary Builder compares against.
- `builder` — the write-first prompt and 3 to 5 comparison checks,
  each teaching from either answer (kept / drifted).
- `question` — stem, four options, `correct`, and the explanation:
  `paragraph_meaning` (plain retelling), `correct_reasoning` (the
  meaning-preservation test, applied), three `distractors` each with
  its `archetype` (one clean distortion, §7; `secondary_archetype`
  only at elite), `why_wrong`, `seductive_element`, `thinking_mistake`
  (the §6 reader error, named), and one transferable `reading_habit`.
- `mentor` — `challenge` (before solving) and `takeaway`.

Sessions and attempts persist to the SAME stores RC and PJ use, with
`module: "ps"` on each record, so streaks, XP, achievements, backup
and restore cover summaries with no storage changes. PS session
records carry `item_ids` and per-answer `chosen`, `summary_written`,
`summary_text`, and `think_opened`. The learner's own summaries live
in the learning store as `kind: "summary"` records (one per item,
latest wins), also covered by backup.
