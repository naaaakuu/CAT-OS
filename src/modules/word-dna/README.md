# src/modules/word-dna/ — the Word DNA module

The decoding journey: a Language Tree, not a difficulty ladder
(WORD_DNA_BIBLE §2), because lineage — not difficulty — organizes this
module. Six branches (Roots, Prefixes, Suffixes, Foreign Words, CAT
Vocabulary, and a reserved-but-empty Frequently Confused Words), each
made of small families the learner meets through one loop: Notice the
shared piece → Predict its meaning → Commit → Reveal + Understand why
it threads through every taught word → Apply it to one or two words
never taught directly (§3). Never called "Vocabulary" to the learner —
the product bet is the feeling "I can understand words I have never
seen before," not "I memorised more words."

Structure (the standard module island, Rule 5 — no imports from other
modules):

```
index.js            registerWD(router, context); all app.js knows
screens/intro.js    the first-time introduction (then /wd/about forever)
screens/tree.js     the Language Tree
screens/session.js  notice/predict → reveal/understand → apply → mentor moment
screens/learn.js    a family's revisitable Learning Page
screens/garden.js   the Word Garden (derived, no separate storage)
logic/tree.js       the six branches + recommendation (pure)
logic/store.js      persistence through the StorageAdapter only (Rule 6)
logic/garden.js     derives earned words from sessions + content (pure)
```

Core services this module composes: `core/engine/wd-session.js` (plain
accuracy, not CAT-style marks — Word DNA imitates no exam format),
`core/mentor/wd-voice.js` / `wd-dna.js` / `wd-lesson.js` (the mentor;
Reading DNA is bounded to exactly four traits per WORD_DNA_BIBLE §5:
Root Recognition, Meaning Transfer, Context Calibration, Family
Fluency), `core/content-loader` (`listWDItems`, `loadWDItem` — schema +
consistency validated at the boundary), and the shared engagement
system (XP, streaks, sounds — nothing new was added to the audio
registry).

## Content shape this module expects (Rule 22)

One JSON file per family/group in `content/word-dna/wd-NNNN.json`,
validated against `content/schema/wd.schema.v1.json`. The shape, in
brief (the schema file is the authority):

- `meta` — id/type/status envelope plus `kind` (`root` | `prefix` |
  `suffix` | `foreign` | `cat_vocab` | `confused`, the Tree branch),
  `title`, `estimated_time_sec`, `source` (which owner PDF this was
  transcribed from), the usual pipeline fields.
- `unit` — `label` (the root/prefix/suffix itself, or the group name),
  `origin_language`, `core_meaning` (null for `foreign`/`cat_vocab`,
  which have no shared meaning — WORD_DNA_BIBLE §3a), `mentor_note`
  (authored teaching layer).
- `members` — every word, transcribed faithfully from the source PDFs,
  never invented or reworded; `held_out` marks the word(s) reserved for
  the Apply/transfer step (exactly one for `root`/`prefix`/`suffix`,
  exactly two for `foreign`/`cat_vocab`); `context_sentence` is
  authored (never source content) and required for the no-shared-root
  kinds.
- `discovery` — `notice_prompt`, `predict_options` (3, exactly one
  correct), `understand_note` (authored), `applies` (1 or 2 transfer
  challenges, each naming its `held_out_word`, its own prompt, and 3–4
  options with an optional `trap` tag: `literal_only` | `wrong_root` |
  `context_mismatch`).

Sessions and attempts persist to the SAME stores RC/PJ/PS/OOO use, with
`module: "wd"` on each record, so streaks, XP, achievements, backup and
restore cover Word DNA with no storage changes. Word DNA session
records carry `item_ids` and per-answer `predict` and `applies` (kept
as separate signals, never blended into one score, because the mentor
and Reading DNA read them as different traits).

## Adding content later (no code changes)

New families/groups are new `content/word-dna/wd-NNNN.json` files plus
new registry rows — the Tree, the loop, the mentor, and the Reading DNA
all already generalize over `kind`. The `confused` kind is reserved in
the schema now specifically so a future Frequently Confused Words batch
plugs in the same way, whenever that source material exists.
