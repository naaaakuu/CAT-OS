# CAT OS content engine — the authoring framework

This is the contract every item in the corpus is written to. It is what
an author (a person, or a model session given one batch) reads before
writing, and what `tools/verify.mjs` and `tools/qc-corpus.mjs` enforce
afterwards. The taxonomy of ids it refers to is `varc-taxonomy.json` in
this folder.

The objective is never "give the learner ten questions". It is: **train
the learner to recognise the patterns a CAT question setter exploits**,
so that one day they think *"this option expands the scope"* before they
have finished reading it.

---

## 0. The workflow, for every item

```
GENERATE  → write the passage / paragraph / sentence and the key
SOLVE     → put the key away; re-derive the answer from the text alone
ADVERSARY → for EACH wrong option, write the best case a strong CAT
            candidate would make for it; if that case survives, the
            option is not a distractor, it is a second answer — rewrite
NAME      → name every distractor's trap from the taxonomy; if none
            fits, the option is not doing a job — rewrite
CHECK     → exactly one defensible answer; no two options equivalent;
            no option obviously longest or most hedged; no absolute word
            as the only tell; nothing answerable without the text
WRITE UP  → the explanation that teaches the METHOD (§3), the quality
            block with the adversarial review written down
VALIDATE  → node tools/verify.mjs (schema + consistency + QC)
```

The `quality.adversarial_review` field is that ADVERSARY step written
down: which option a strong candidate argues for, and the exact word or
sentence in the text that settles it. Never a formula. Status is
`reviewed` after authoring; `verified` only after a blind solve
(`tools/blind-solve.mjs`) by a reader who had no key.

## 1. What makes an item CAT-authentic

- **Register.** Serious, adult prose: the essay in a good magazine, the
  first page of an academic book, a considered op-ed. Nothing childish,
  no "school exam" voice, no artificial vocabulary dropped in to sound
  hard, no trivia.
- **Difficulty comes from thinking, not from knowing.** Structure,
  abstraction, competing interpretations, qualification, inference. A
  reader who knows nothing about the topic must be able to answer every
  question from the text. Never depend on obscure facts, and never let
  common knowledge answer a question without the passage.
- **No gotchas.** A question must not turn on a technicality the
  passage never signals. Hard is fine; unfair is not.
- **Original.** Every passage, paragraph, sentence set, argument and
  option is written new. Learn from the *style* of competitive exams,
  never reproduce a passage or a question.
- **British spelling** ("recognise", "colour", "programme"), as the
  existing corpus uses. Curly apostrophes are fine. No em-dash overload:
  at most a couple per paragraph.

## 2. Distractors are the product

A mediocre question has one right answer and three visibly wrong ones. A
CAT question has one right answer and three **intelligent** wrong ones,
each a recognisable reasoning mistake. Every wrong option must:

1. be attractive to a reader who did the *natural* careless thing —
   read the vivid example as the thesis, dropped a qualifier, took the
   conceded view for the author's, generalised, inverted;
2. be wrong for **one nameable reason** — one trap type, one decisive
   word or sentence in the text that kills it;
3. be defensible to *nobody who read precisely*.

Across a question's three distractors, use **three different trap
families** where the question type allows. Across a passage's set, the
signature CAT trap (`passage_language_shifted`) should appear at least
once, and no trap type should appear in every question.

Build **one near-tie** per set: a finalist that differs from the correct
option by a single element — one scope word, one degree, one direction —
where the deciding element is demonstrably in the text.

Never let surface features give the answer away: the correct option is
not systematically the longest, the most hedged, the only one without
"always"/"never", or the only one that reuses passage words. Vary answer
positions freely; the corpus QC checks balance across the whole bank.

## 2a. The option set must not contain the passage

A reader was given seventeen passages from this corpus **with the passage text deleted** — stems and four options only — and answered eighty of eighty. Para-summaries with their paragraphs deleted: six of six. Chance is one in four.

The cause is structural, and it is the deepest defect this corpus has had. Distractors are written per question to be wrong about the passage; keys are written to be right about it. So across one passage's questions the keys form a single mutually consistent reading and the distractors form none. Find the consistent column and you have every answer, having read nothing.

### What does not fix it

Carrying **one** coherent rival reading through every question — the obvious repair — was piloted on ten passages and rewrote sixty-five per cent of every option set. Text-free solving fell from 43/43 to 42/43. It fails for a reason worth knowing: a single rival carried through every question becomes *the most frequent idea in the pool*, and the most frequent idea is identifiably the rejected one. Subtraction replaces coherence. Two readers found this independently.

### What does fix it

**Symmetric columns.** Build three complete rival readings of the passage, each owning one option in **every** question, including the strengthen and weaken questions. All four columns then appear equally often, so neither coherence nor frequency selects anything, and only the text decides. In the pilot exactly one passage had this shape — by accident of its question mix — and every reader named it as the one where their method failed.

It costs more than distractor repair because it is a **question-design** decision: it works only where questions are argument-level, and it is defeated by stacking global questions (main idea, purpose, title) on one passage, since a global key *is* a compressed abstract of the passage by definition of the type.

### The types that leak structurally, and what to do

- **not_true / except** — the three non-keyed options must each be true, so the item hands over three propositions about the passage. Rebuilt three times in the pilot at mechanism, framing and adverb level; it stayed a top-three cue every time. Use sparingly, and never put an EXCEPT and a strengthen question on the same passage: a statement that is a wrong strengthener is thereby proved inert, which is what the EXCEPT question tests.
- **application** — the scenario in the stem must instantiate the passage's conditions, so the stem states the mechanism. Keep the stem's scenario thin and put the conditions in the options.
- **main_idea / primary_purpose / title_selection** — the key is a compressed abstract. Not fixable by distractor work; limit these to one per passage.
- **tone** — the only type that stayed at chance throughout. Register is the one thing options do not leak.
- **vocabulary_in_context** — should be the safest and ranked fifth, because keys restated the argument. Define the word in its sentence; if a thesis-in-miniature belongs anywhere, put it in a *distractor*.

### The cheap fixes, which do work

Confirmed dead by four independent readers after the pilot: option length as a cue, key-to-key paraphrase across questions, stem shape, shared opening clauses, "the most cautious option is the answer", and the vocabulary key that restates the thesis. Apply all of these always; they are cheap.

### How to measure

```
node tools/blind-solve.mjs strip <type> --out <dir> --no-text <ids…>
```
then a fresh reader that sees only that file. But do not read the raw score alone: a four-to-six question option pool *is* in some measure a paraphrase of its passage, and a frontier reader may stay high however well the item is built. Report three things — the score, the reader's per-passage confidence, and **how many complete readings it could assemble**. In the pilot the score moved by one mark while the reader's self-estimate fell from 38–41 to 31 and it began reporting passages where it had to guess between several complete readings. Those two are the honest signal.

## 3. Explanations teach a method

Never: *"Option B is correct because it is supported by the passage."*

Every explanation answers, in prose a strong student would keep:

1. what the question is really testing (`question_type_note`)
2. what an expert notices in the text before looking at options
   (`expert_notice` / `clue` / `what_the_gap_needs` / `clue_before`)
3. why the correct option is correct — by the evidence, not by decree
   (`correct_reasoning`)
4. why each distractor fails and what trap it was built from
   (`distractors[].why_wrong` + `trap_type` + `seductive_element`:
   *why it felt right*)
5. the rule the learner can reuse on the next item (`reading_habit` /
   `method`)

**Never name an option letter in prose** ("Option B says…"). Keys are
rebalanced by tooling that cannot rewrite prose; write "the correct
option", "this option", or quote the option's own words. The QC fails an
item that names a letter.

## 4. Reading Comprehension (rc, schema v5)

**Passages.** 120–900 words. Short (120–349), medium (350–599), long
(600–900) — the corpus needs all three. Vary density, sentence
complexity, abstraction, tone, structure, number of voices. Choose a
`structure` from the taxonomy and let it genuinely organise the passage.
At least one paragraph must do real argumentative work: concede,
qualify, pivot, adjudicate. Subjects: the thirty genres, weighted toward
philosophy, psychology, economics, sociology, history, political
thought, science, ecology, art, literature, linguistics, law, ethics,
media, institutions, markets, public policy, scientific method,
intellectual history — never two passages on the same specific idea.

**Question sets.** Two to six questions (four or five is the CAT norm).
Mix the types: over a batch, the inference family (`inference`,
`implication`, `must_be_true`, `cannot_be_inferred`, `agree_disagree`,
`comparative`, `application`, `scope`) should be 35–55% of questions,
with main idea / primary purpose, detail (including `except` and
`not_true`), tone / attitude, structure / paragraph function / role of
detail, phrase or word in context, strengthen / weaken / assumption,
relationship and best characterisation all represented. Never four
questions of the same type on one passage.

Per question: `skill` is fixed by `type` (taxonomy `rc_type_skill`);
`patterns` name what a strong reader actually uses (one to four);
`target_mistake` names the specific misreading the question catches;
`prediction_target` (required for prediction-friendly types) states what
the learner should be able to say **before** seeing options;
`difficulty` is the honest triple; `estimated_time_sec` is the CAT-pace
target (main idea ~75 s, inference ~80–100 s, detail ~50 s, vocabulary
~45 s, structure ~85 s).

`estimated_time_min` = `reading_time_min` + Σ `estimated_time_sec`/60,
rounded to 0.5; `word_count` is the real count. `difficulty_numeric`:
1–3 easy, 4–6 medium, 7–10 hard; the `stage` ladder foundation →
developing → intermediate → advanced → elite tracks it.

**The mentor block** is the Learning Page and is written in full for
every passage: a challenge (no spoilers), the one-sentence summary, the
main idea, a *simple explanation* retelling the whole passage in very
plain English (200+ characters, paragraph breaks with `\n\n`), why it is
difficult, the author's intention, the paragraph journey (one entry per
paragraph, in order, `role` two to four words), tone progression, one to
three key transitions (quoted), the misunderstanding a hurried reader
builds, the traps summary, the one reading lesson, a real-world line, a
takeaway, and a reflection question ending in `?`.

**The vocabulary block**: two to four words with `passage_use` being a
phrase from the passage that contains the word (the context pack is
built from it), `meaning_here` the sense in this passage.

## 5. Para Jumbles (pj, schema v2 = v1 + patterns + quality)

Four sentences (five or six for the top tiers). Do **not** shuffle an
ordinary paragraph: engineer the clues — pronoun reference,
demonstratives, repeated nouns, lexical chains, chronology, cause and
effect, contrast, concession, example after claim, general to specific,
specific to general, definition then application, question then answer,
claim then evidence, problem then solution, a rhetorical pivot, explicit
and implicit transitions, opening and closing sentences. For the harder
tiers, make **two or more adjacent pairs look plausible** so the answer
depends on structure, not on one connective; set
`heuristic_adversarial: true` and make it true. Fill `links` (one per
consecutive pair, device and reliability), `movement` (why each sentence
sits where it does), `tempting_orders` (real wrong orders, the trap that
makes each tempting, and exactly where it breaks), the `trap_named`
paragraph and the `solving_habit`. `mentor.paragraph_plain` retells the
paragraph in plain words. Name `reasoning_patterns` from the `disc.*`
family.

## 6. Para Summary (ps, schema v2 = v1 + patterns + quality)

One paragraph of four to seven sentences with a nameable architecture
and one apex claim (`apex.claim`, its scope, its certainty, its stance).
Sentence roles are honest (at most one `thesis`). The correct summary
preserves scope, certainty, stance and the central qualification; the
three distractors are **one clean distortion each** from three different
archetype families (scope, certainty, structure, addition, stance,
logic, language) — an example promoted to thesis, an overgeneralisation,
an added recommendation, a flipped stance, a dropped qualifier, a
narrowed or widened scope, a distorted causal relation, a polished
paraphrase that changes the meaning. Option lengths within 1.75×. The
`builder` gives the learner a prompt to write their own sentence and two
to four checks (core / scope / certainty / addition / stance) with
`kept` and `drifted` feedback. Elite tier needs a `near_miss` finalist
and a named `separating_element`.

## 7. Odd One Out (ooo, schema v2 = v1 + patterns + quality)

Five sentences; four form one coherent paragraph (`core_order`), one is
the outlier. The outlier must be **thematically related, grammatically
compatible, lexically connected** and yet structurally disconnected:
wrong scope, general where the core is specific, a stance shift, a
thread break, a method where the core reports findings, an example with
no claim to serve. Below medium, a topic matcher may succeed; from
medium up, `topical_overlap ≥ 3` and `heuristic_adversarial: pass` are
required, and the core must be strong (`core_structure_strength ≥ 3`).
Write the `exclusion_analysis` for each core sentence (why a hurried
reader might exclude it, and what breaks without it), the three joins,
the violation, and the `detection_habit`.

## 8. Sentence Placement (sp, schema v1)

A coherent paragraph of four to seven sentences; remove one (never the
first unless the item is about openers). The remaining sentences are
numbered 1..n in order; `missing.position` is 0 (before 1) or k (after
k). Offer four positions (the correct one and the three most plausible)
as options like "Before sentence 1", "After sentence 2". Engineer the
clue: a pronoun whose antecedent sits only in one place, a "however"
that needs a specific claim to push against, a "for instance" that must
follow its generalisation, a given-new chain, a tense or stance
continuity. Every wrong position is a named `placement_trap` (the
pronoun binding to the wrong noun there; fits its neighbours but breaks
a later sentence; a conclusion placed too early; a redundant restatement
beside its twin; a scope jump). `clue_before` / `clue_after` name what
the neighbouring sentences demand.

## 9. Para Completion (pc, schema v1)

A paragraph that stops one sentence early (or, less often, has a gap in
the middle or at the start — `gap_index`). First decide `gap_function`
(conclusion, consequence, example, qualification, contrast turn,
explanation, restatement, next step, implication, resolution, opening),
then write the correct option to do exactly that job at the paragraph's
scope and stance. Distractors: right topic, wrong function; a broad
quotable generality the paragraph never needed; a sentence that
contradicts or changes sides; a summary where development is needed; a
new topic nothing picks up; a scope jump. `what_the_gap_needs` states
the function, scope and stance derived from the paragraph alone — the
prediction the learner should make before reading options.

## 10. The Word Bank (wb, schema v1; bundles of 8–30, one kind each)

Reasoning-based vocabulary, never recall alone.

- **context** — a real sentence containing a CAT-list word; four senses;
  the sentence forces one. Distractors: the commonest dictionary sense
  that the sentence does not support; a near-synonym at the wrong
  strength; the opposite invited by the sentence's structure.
- **decode** — a word the learner has probably never met, built from
  parts they can recognise; the sentence plus the parts settle the
  meaning. `parts` join to the word exactly (include linking vowels as
  their own part with gloss "linking"). Distractors: the parts added up
  too literally; the wrong root recognised; a meaning the word can have
  but this sentence cannot.
- **confusable** — a sentence with `____`, four look-alikes (the pair,
  plus forms or other look-alikes), one the sentence wants.
- **register / connotation / synonym_distinction** — a sentence with
  `____` (or a marked word) and four near-synonyms separated by room,
  colouring or degree.

`skill` is fixed by kind (context → `vocabulary_in_context`; decode →
`root` or `word_part`; confusable → `word_pair`; the rest →
`word_precision`). `clue` names the exact thing in the sentence or the
parts that settles it; `method` is the reusable move. Words come from
the CAT lists (the lexicon bundles) and the confusable pairs (the twin
bundles); a word is tested once per kind across the bank.

## 11. Arguments (cr, schema v1; bundles of 5–15)

An argument of two to six sentences in the CAT verbal register, then one
question of one kind: assumption, strengthen, weaken, inference, flaw,
conclusion, paradox, evaluate, parallel, principle, role. The
explanation first lays the argument bare — premises, conclusion, and
for gap kinds the unstated link — then judges the options. Distractors
are the classic ones, named: restates a premise or the conclusion; the
opposite effect; irrelevant information; a scope shift; more than the
argument needs (for necessary assumptions); supports the wrong link;
explains only one side of a paradox; shares the topic but not the
structure; attacks a premise instead of the reasoning; reads correlation
as cause; ignores an alternative cause.

## 12. Word DNA (wd, schema v1) — more units

Root, prefix and suffix families of five to seven members, one held out
for the Apply step (two for foreign / cat_vocab kinds), a `notice_prompt`,
three predict options with one correct, an `understand_note` that shows
the shared meaning at work in each taught member, and an apply challenge
whose distractors are `literal_only`, `wrong_root` or `context_mismatch`.

## 13. Difficulty is multidimensional

Every RC passage carries an eight-dial vector (lexical, syntactic,
abstraction, inference_depth, distractor_similarity, reasoning_depth,
structural_ambiguity, time_pressure), each 1–5 by the anchors in the
taxonomy. A passage can be lexically easy and inferentially hard; write
both kinds. Every question carries its own triple. PJ / PS / OOO / SP /
PC carry the vectors their schemas define. Fill them honestly: they aim
the curator.

## 14. Diversity and balance, per batch

Do not write ten items that are the same item with different nouns.
Across a batch vary topic, structure, reasoning pattern, question type,
trap type, style, difficulty and answer position. Across the corpus the
QC checks: answer keys 18–32% per letter, no trap above 20% of a type's
distractors, inference 35–55% of RC questions, absolute words not a
tell, no duplicated sentence or title anywhere.

## 15. Metadata that must be true

`word_count` is counted. `estimated_time_*` follows the formula.
`difficulty` matches `difficulty_numeric`. `question_types` is exactly
the set asked. `vocab_extracted` ⊆ the vocabulary block. Tier ranges:
foundation 1–2, easy 2–3, medium 4–5, advanced 5–6, cat 6–7, cat-plus
7–8, ninety-nine 8–9, premium 9–10. Every pattern, trap and skill id
exists in the taxonomy. Run `node tools/verify.mjs` before calling a
batch done; then `node tools/build-index.mjs` and
`node tools/build-manifest.mjs` register it.
