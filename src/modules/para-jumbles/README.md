# src/modules/para-jumbles/ — the Para Jumbles module

The ordering journey: an eight-tier ladder (Beginner → Easy → Medium →
Advanced → CAT → CAT+ → 99 Percentile → Premium) of four-sentence,
TITA-style jumbles, each of which TEACHES — the four-layer explanation
of `PARA_JUMBLES_BIBLE.md` §11 renders after every attempt, and every
attempt updates the solver's Para Jumbles Reading DNA
(`core/mentor/pj-dna.js`).

Structure (the standard module island, Rule 5 — no imports from other
modules):

```
index.js            registerPJ(router, context); all app.js knows
screens/intro.js    the first-time introduction (then /pj/about forever)
screens/browser.js  the tier journey
screens/session.js  solve → read back → lock → be taught → mentor moment
screens/learn.js    a jumble's revisitable Learning Page
logic/tiers.js      the eight-tier ladder + recommendation (pure)
logic/store.js      persistence through the StorageAdapter only (Rule 6)
logic/teach.js      the four-layer teaching HTML (pure)
```

Core services this module composes: `core/engine/pj-session.js` (TITA
scoring: +3 / 0, no negatives), `core/mentor/pj-voice.js` /
`pj-dna.js` / `pj-lesson.js` (the mentor), `core/content-loader`
(`listPJItems`, `loadPJItem` — schema + consistency validated at the
boundary), and the shared engagement system (XP, streaks, sounds —
nothing new was added to the audio registry; every cue reuses the
existing sound language).

## Content shape this module expects (Rule 22)

One JSON file per jumble in `content/para-jumbles/pj-NNNN.json`,
validated against `content/schema/pj.schema.v1.json`. The shape, in
brief (the schema file is the authority):

- `meta` — id/type/status envelope plus the Bible §12 metadata:
  `tier` (the eight-step ladder), `format` (sentence count, TITA/MCQ,
  opener/closer given — format is CONFIGURATION, re-verified each
  cycle, never a constant), `macro_pattern`, `cohesion_signals`,
  `primary_trap` + `secondary_traps`, `dna_traits`, the twelve-axis
  `difficulty_vector`, `num_plausible_orderings` (the master
  difficulty variable), `heuristic_adversarial` (must be true from
  Medium up), `nucleus`, `learning_objective`.
- `sentences` — PRESENTATION order (`label`, `text`, `role`); the
  correct order must never equal the presentation order.
- `correct_order` — the unique best order, as labels.
- `links` — one entry per consecutive pair of the correct order:
  `device`, `reliability` (signals are taught with their failure
  modes, never as rules), `explanation`.
- `explanation` — the four layers of Bible §11: `macro_pattern_note`,
  `movement` (per sentence, in correct order), `tempting_orders`
  (each tagged with the `trap_type` that makes it tempting — this tag
  also powers precise Reading-DNA diagnosis when a learner enters
  exactly that order), `trap_named`, `solving_habit`.
- `mentor` — `challenge` (before solving), `paragraph_plain` (what the
  paragraph says, in very plain English), `takeaway`.

Sessions and attempts persist to the SAME stores RC uses, with
`module: "pj"` on each record, so streaks, XP, achievements, backup
and restore cover jumbles with no storage changes. PJ session records
carry `item_ids` and per-answer `entered`, `positions_correct`,
`links_correct`, `revised`, and `read_back_ms` (the verification
window — the premature-closure signal).
