# src/modules/odd-one-out/ — the Odd One Out module

The detection journey: an eight-tier ladder (Foundation → Easy → Medium →
Advanced → CAT → CAT+ → 99 Percentile → Premium) of five-sentence,
TITA-style exclusion items, built faithfully to `ODD_MAN_OUT_BIBLE.md`.
The durable skill is **structural reading**: the outlier is on-topic but
out-of-structure, defined by the discourse relation it cannot enter,
never by the topic it is about (Bible §4). Each tier teaches ONE
structural reading skill before the next raises the pressure, every
core sentence carries the §7 solver pattern that makes it tempting to
exclude, and every attempt updates the reader's Odd One Out Reading
DNA (`core/mentor/ooo-dna.js` — the bounded §8 trait extension).

The two module-defining experiences:

- **The Paragraph Builder** — at the first three tiers the learner does
  not hunt the odd sentence. They arrange the four connected sentences
  on the shared `<cat-jumble-board>` (placing four of five), and the
  sentence left out becomes their answer: construction before
  elimination (Bible §7 remediation, Recommendation 5). From Advanced
  up the surface is the exam's (tap the sentence that stands apart),
  with a read-back before locking at every tier.
- **The Think button** — a floating coach available while solving. It
  never hints; it asks the coaching questions strong structural readers
  ask themselves (which four belong together, does one sentence begin a
  different discussion, is it broken or simply from another paragraph),
  tuned to the item's mission.

Structure (the standard module island, Rule 5 — no imports from other
modules):

```
index.js            registerOOO(router, context); all app.js knows
screens/intro.js    the first-time introduction (then /ooo/about forever;
                    Settings can reset it)
screens/browser.js  the tier journey
screens/session.js  mission → read the five → build (or exclude) →
                    read back → lock → be taught → mentor moment
screens/learn.js    an item's revisitable Learning Page
logic/tiers.js      the eight-tier ladder + per-tier mode + recommendation (pure)
logic/store.js      persistence through the StorageAdapter only (Rule 6)
logic/teach.js      the §12 teaching-layer HTML, tier-progressive (pure)
logic/think.js      the Think coach's deterministic question picker (pure)
```

Core services this module composes: `core/engine/ooo-session.js`
(TITA scoring: +3 / 0, no negatives, labeled as per-cycle convention),
`core/mentor/ooo-voice.js` / `ooo-dna.js` / `ooo-lesson.js` (the
mentor), `core/content-loader` (`listOOOItems`, `loadOOOItem` — schema
+ consistency validated at the boundary), and the shared engagement
system (XP, streaks, sounds — nothing new was added to the audio
registry; every cue reuses the existing sound language).

## Content shape this module expects (Rule 22)

One JSON file per item in `content/odd-one-out/ooo-NNNN.json`,
validated against `content/schema/ooo.schema.v1.json`. The shape, in
brief (the schema file is the authority):

- `meta` — id/type/status envelope plus the Bible §13 metadata: `tier`
  (the eight-step ladder), `format` (5 sentences, TITA, +3/0 — carried
  as configuration with a `format_verified` note, never a constant),
  `spine_type` and `nucleus` (the core's shape and RST center),
  `violation_type` (the §4 a–g taxonomy of the outlier's crime), the
  §6 `difficulty_vector` with `topical_overlap` as the primary lever
  and `violation_locus` (local/global/mixed), `traps` (Trap A =
  belonging-looks-odd, Trap B = outlier-looks-belonging, §5),
  `cohesion_signals` (Halliday & Hasan ties present in the core, §3),
  `dna_traits` (the bounded §8 set), `mission` (Today's Mission), and
  `validation` (the §11 gates — uniqueness, reconstruction,
  heuristic-adversarial, trap audit — all must pass to ship).
- `sentences` — the five in PRESENTATION order (`label`, `text`);
  presentation order never signals the answer.
- `outlier` — the label of the sentence with no seat.
- `core_order` — the four core sentences in the author's paragraph
  order; powers the Paragraph Builder and the reconstruction layer.
- `builder` — the construct-mode prompt.
- `explanation` — the §12 design: `spine_note` (reconstruct the core),
  `core_roles` (each core sentence's discourse role, in core order),
  `links` (the three joins, each naming its cohesive tie),
  `violation_named` + `why_it_breaks` (the precise principle violated
  and why the outlier cannot attach), `trap_exposed` (why it looked
  like it belonged / why a belonging sentence looked odd),
  `exclusion_analysis` (each core sentence's §7 `mistake_type`,
  `why_tempting`, `what_breaks` — the uniqueness test, taught), and
  one transferable `detection_habit`.
- `mentor` — `challenge` (before solving) and `takeaway`.

Sessions and attempts persist to the SAME stores RC, PJ and PS use,
with `module: "ooo"` on each record, so streaks, XP, achievements,
backup and restore cover exclusion practice with no storage changes.
OOO session records carry `item_ids` and per-answer `chosen` (the
excluded label), `built` (the four labels arranged in construct mode),
`build_links_correct`, `think_opened`, `revised`, and `read_back_ms`
(the verification window — the premature-closure signal).
