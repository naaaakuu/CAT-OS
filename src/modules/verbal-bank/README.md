# Verbal Bank module

One screen for the content engine's four item banks (Rule 22: every module
states the content shape it expects).

| Bank | Type | Files | Played at | Craft |
|---|---|---|---|---|
| Sentence placement | `sp` | `content/sentence-placement/sp-NNNN.json`, one item per file, `sp.schema.v1` | The Loom, by tier | Thread |
| Paragraph completion | `pc` | `content/para-completion/pc-NNNN.json`, one item per file, `pc.schema.v1` | The Summary Table, by tier | Thread |
| Word bank | `wb` | `content/word-bank/wb-NNNN.json`, a bundle of 8–30 items of one kind, `wb.schema.v1` | Meadow (context, register, connotation, synonym distinction), Mirror Pond (confusable), Vine Terraces (decode) | Amber |
| Arguments | `cr` | `content/critical-reasoning/cr-NNNN.json`, a bundle of 5–15 items, `cr.schema.v1` | The Reading Room | Ink |

The loader (`core/content-loader/loader.js`) validates each file against its
schema and its cross-field rules, then `normalizeBankItem` turns any of the
four into the one shape this screen and the engine
(`core/engine/bank-session.js`) work on:

```
{ id, type, kind, label, skill, patterns, difficulty,
  stem, options: {A,B,C,D}, correct, distractors: [{option, trap_type, why_wrong, …}],
  time_sec, explanation: { correct_reasoning, question_type_note, reading_habit, distractors },
  body: { kind: 'sp' | 'pc' | 'wb' | 'cr', … what the screen draws above the question } }
```

Every answer is stored with its `skill`, `patterns` and — when missed — the
`trap` of the distractor chosen, so the skill ledger and the trap ledger
(`core/learning/review.js`) can aim the valley at what keeps going wrong.

A set is `BANKS[type].setSize` items (`core/learning/taxonomy.js`): unsolved
first, a missed item only once it has rested, in journey order. The session
record carries `module` = the bank key, `region` = the place it was played
from and `target_sec` = the sum of the items' own time targets, so the world
derives stars and crafts without opening a content file.
