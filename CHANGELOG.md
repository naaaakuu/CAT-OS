# CHANGELOG

> Every meaningful change, newest first. Format: version — date — what and why.
> Versions here are app releases; they map onto the capability milestones in
> `PROJECT_ROADMAP.md` (0.x releases build toward Roadmap V1.0).

## 0.14.0 — 2026-07-14 — Language Garden (Root Grove)

The sixth module island, and the first not built around a question-and-answer
loop at all. Built to a new `LANGUAGE_GARDEN_BIBLE.md`, which explicitly
replaces the old idea of a "vocabulary module": Word DNA (0.13.0) taught
roots through notice/predict/apply, scored, XP'd, and celebrated like every
other module. The Language Garden throws that model out on purpose.
Vocabulary stops being content to consume and becomes a small living place —
a grove of root-family trees the learner tends — where growth is never faked
and nothing is ever scored. This release ships only the first vertical
slice: the **Root Grove** (Latin and Greek roots, the "decompose" engine of
the Bible's four; Vine Walk, Orchard, Wildflower Meadow and Twin Patch are
reserved in the schema but ship no content yet), four hand-authored root
families, deliberately small — "quality, not quantity" was the owner's
explicit brief.

### The session, honestly scored by nothing
- **Six beats, one shape**: Encounter+Attempt (a directional guess on a real
  sentence, before anything is explained) → Key (the root, its origin, its
  meaning, one line) → Spread (tap each morpheme to reveal its gloss, watch
  the parts join into the taught word) → Reach (the SAME tap-and-join
  mechanic on a word never taught, then construct its meaning from three
  options) → Growth (one line, one animation, back to the garden). A later
  visit runs a shorter retrieval-only shape instead: a bare-root Key quiz,
  two taught members re-tested in fresh context sentences, then one Reach.
- **The Reach beat cannot be failed.** A wrong first guess gets one pointing
  line ("Look at the first part.") and a second try; either way the
  construction lands and the copy is the same: "No one taught you that
  word." Getting there is the point, not getting it right immediately.
- **No red, anywhere.** LANGUAGE_GARDEN_BIBLE §8 is explicit that removing
  red "removes the flinch that makes people avoid review" — an incorrect
  pick gets the same neutral dimming as every other non-answer, never the
  shared `cat-option` red state the rest of the app uses freely.
- **No score, anywhere.** Not a percentage, not a streak, not XP. Garden
  sessions persist to `STORES.LEARNING` (`kind: 'garden-session'`), not
  `STORES.SESSIONS` — a deliberate choice so growing a tree can never
  silently earn XP or streak credit through the shell's existing engagement
  system, which the Bible names outright as "a second reward economy."

### A spacing scheduler that never demotes
`core/engine/garden-session.js` derives a plant's life stage (Seed → Sprout
→ Sapling → In leaf → Evergreen) and whether it is due purely from its
session history — nothing is ever stored as a conclusion, only recomputed.
A conservative rung ladder (10 minutes, then 1/3/8/21 days) grows the
interval only after a CLEAN revisit; a rocky one still regrows the plant
(canopy fuller, a real animation) but simply doesn't buy a longer interval
next time. The garden itself enforces "at most one plant asking per visit"
even when several are technically due (guilt containment, Bible §6.4), and
offers exactly one open seed to plant on a day nothing is due — never a list,
never a queue, never copy that references absence.

### A grove that feels alive, cheaply
`<cat-plant>` draws every life stage and the Gold / Bare-with-buds overlays
as a small, fixed set of layered vector states (deterministic ring-layout
math, never Math.random(), never per-leaf simulation) — a garden full of
evergreens costs the same frame budget as an empty one. A grove visit has a
~45% chance of one quiet ambient visitor (a bird, a butterfly, a firefly at
night, a drifting petal), time-of-day sky tinting from the real clock, and —
purely derived from timestamps already in history — a small nest that
appears in an evergreen's canopy once it has held that stage for two weeks.
Sound is a second, deliberately smaller synthesis identity
(`logic/audio.js`, module-local, not a reuse of the shell's reward sounds):
two named session sounds (a soft note at the Key, a warm chime at Growth),
two tap-mechanic grains, and an optional off-by-default ambient bed of
breeze and distant chirps that reads the shell's own master Sounds
preference before ever making a sound.

### Content: a new shared substrate, and four plants
`vocab-NNNN` is the shared word substrate `MASTER_CONTEXT.md` already
reserved a prefix for: every future garden references words by id instead
of inlining them. `lg-NNNN` is the grouping layer — a plant's root, its
opening directional Attempt, and its members' morpheme parts, glosses, and
two context sentences each (one to teach, one "fresh" sentence every
revisit reuses, so recognition attaches to the word and not a memorised
sentence). The loader cross-validates that a member's parts actually
concatenate to its own word — a real authoring bug (three members were
missing a connecting vowel: chronometer, chronograph, philosophy) was
caught by this check before it ever reached a screen. Four families ship:
**cede** (Bible's own worked example throughout), **chron** (the Bible's
own Journal example), **phil**, and **cred**.

### Product decision: Word DNA soft-hidden, not removed
The Bible frames the Garden as replacing "the old vocabulary module," which
is Word DNA in every practical sense. Owner decision: keep Word DNA's
routes, code, and data fully intact (nothing here touches
`src/modules/word-dna/`), but stop advertising it — removed from Home's
Continue card, Home's daily word widget, and the Practice hub, replaced by
a correspondingly calm "Your garden" card and a Language Garden Practice
row. `#/wd` still works for anyone who navigates there directly; restoring
its Home presence is a one-line revert (see `CONTINUE_INFO` in `app.js`).

No DB migration (the `learning` store already existed, 0.6.0; a new `kind`
value is additive). Two new content schemas (`vocab.schema.v1.json`,
`lg.schema.v1.json`), 20 vocabulary words, 4 root families, one new UI
component (`cat-plant`), one new mentor voice
(`core/mentor/garden-voice.js`, banned-word-linted like every other
mentor but deliberately carrying none of the DNA-trait/one-lesson
apparatus the Bible abolishes for this module). `CACHE_VERSION` → 16,
`CONTENT_VERSION` → 11.

## 0.13.0 — 2026-07-13 — Word DNA

The fifth module, and the first not to imitate a CAT question format at
all. Built to a new `WORD_DNA_BIBLE.md`, using two owner-supplied PDFs
(`SECTION 1- Vocabulary.pdf`, `Section 4 Roots, Prefixes,.pdf`) as the
exclusive, non-negotiable source of truth for every word, meaning, and
example transcribed — never invented, rewritten, or simplified. The
durable idea, and the reason it isn't called "Vocabulary": **understanding
a word's shared parts beats memorising a list.** A learner who has met
"chron" once should be able to work out a chron-word they've never seen;
memorising a list doesn't transfer, noticing a pattern does.

### The learning journey (not a word list)
- **A first-time introduction** (`/wd` on first open, then `/wd/about`
  forever, resettable from Settings → Learning): what Word DNA is, why so
  many words repeat their parts, why understanding beats memorising, how
  one root unlocks fifty words, and how the journey teaches — five
  progressive-reveal sections, calm and concrete.
- **The Language Tree, not a ladder.** Every other module stages
  difficulty across eight tiers; Word DNA doesn't, because there's no
  difficulty curve to a root — there's only "met" or "not met yet." The
  Tree browses five branches (root, prefix, suffix, foreign words, CAT
  vocabulary) plus a sixth, **Frequently Confused Words**, shown as a
  disabled "Coming later" row rather than skipped silently: the source
  chapter for it wasn't available this pass, and the architecture should
  say so honestly instead of pretending the branch doesn't exist.
- **One loop, every family: Notice → Predict → Reveal → Understand →
  Apply.** Notice shows the shared fragment across several taught words
  (highlighted exactly, hyphens stripped, every spelling of a
  multi-spelling root tried in turn — `cede`/`ceed`/`cess` all light up).
  Predict asks what it means before revealing anything. Understand
  explains why the piece threads every taught word. Apply is the actual
  test: one or two words the learner was never taught, each decoded from
  the pattern alone — this is where transfer, not recall, gets proven.
  Foreign words and CAT vocabulary have no shared root to notice, so they
  honestly swap the shared-piece Notice for a word-in-context Notice
  instead (Bible §3a) — meeting a borrowed word is the whole skill, and
  the module says so rather than manufacturing a pattern that isn't there.
- **A bounded, four-trait Word DNA** (`core/mentor/wd-dna.js`): root
  recognition, meaning transfer (the signature trait — the one that
  actually measures whether a pattern generalized), context calibration,
  and family fluency. Chosen from seven candidate traits the Bible
  considered; three were merged or dropped by name (§5) rather than
  shipped as a padded list. Evidence-floored and banned-word-linted like
  every other module's DNA.
- **A derived Word Garden** (`/wd/garden`, `logic/garden.js`): every word
  earned through a correct Apply — never the taught words themselves,
  since those were given, not earned. No new storage; entirely computed
  from stored sessions.
- **Today's Discovery**: Home offers one word a day (foreign or CAT
  vocabulary only, deterministic by calendar day) without being asked — a
  reason to open the app even on a day with no time for a full set. It
  stops itself; there's no streak to protect and no guilt for skipping it.
- Plain accuracy, no CAT-style marks. Word DNA isn't a CAT question type,
  so the result screen says so instead of inventing a scoring convention
  to imitate one.

Content: 12 families (`batch-wd-001`), spanning all five active branches,
transcribed verbatim from the two source PDFs. This is deliberately a
small but *complete* first batch, not the full corpus — every screen,
interaction, and system is fully experienceable today; the schema and
registry are designed so every future batch is pure content (more JSON
files), never a code or UI change.

One real bug caught during browser verification, before shipping: for
the two-Apply families (foreign words, CAT vocabulary), the second Apply
challenge was replacing the entire Apply region instead of joining it,
silently erasing the learner's own first correct transfer — the exact
moment the module exists to reward — the instant the second challenge
appeared. Fixed to accumulate, the same pattern Notice/Predict/Understand
already use, so both transfers stay visible with their verdicts through
to the mentor moment.

No new component, no new sound, no new color (`--color-info` — blue — is
reused for the Understand block, the one surface where it's the star);
`module:"wd"` in the existing sessions/attempts/learning stores; no
existing module changed. `CACHE_VERSION` → 15, `CONTENT_VERSION` → 10.

Verified: `tools/verify.mjs` (all 14 sections, up from 13 — a new Word
DNA schema+consistency section and a new engine/voice/DNA/lesson dry run
section), 217 precached files all resolve, 94 modules reachable from
app.js all exist and are precached, and two full scripted Chromium passes
with zero console errors: the root/prefix/suffix path (intro → Tree → a
full four-family Roots set → mentor moment → Word Garden → Learning Page
revisit → Growth → Home) and the foreign-word path specifically
(context-sentence Notice → both Apply challenges → mentor moment), the
second written to confirm the two-Apply accumulation fix.

## 0.12.1 — 2026-07-13 — Product audit: four cross-module fixes

A full screen-by-screen audit of every flow in the app (Home, Practice,
Growth, Settings, and all four module journeys), looking specifically for
places a first-time CAT aspirant could hesitate or feel lost. No new
features; four concrete fixes, each confirmed in a real browser against
live IndexedDB state before shipping.

- **Home's "Continue" card is now module-aware.** It previously asked
  `core/learning/journey.js`'s RC-only recommender no matter what the
  learner actually last practiced, so a learner deep in Para Jumbles kept
  being nudged back to Reading Comprehension by the app's single most
  prominent call to action. Home now reads the most recent session's
  `module` and asks that module's own recommender (the same one its
  browser page already uses via `recommendNextPJ`/`PS`/`OOO`), so the
  card always says "Continue your Para Jumbles journey" (etc.) and links
  straight into the right session. RC-only learners see no change.
- **Para Jumbles introduction now has a Settings row.** Para Summary and
  Odd One Out both shipped a "Show again" row for their first-time
  introduction (`resetPSIntro`, `resetOOOIntro`); Para Jumbles had the
  identical `markPJIntroSeen`/`hasSeenPJIntro` mechanic but no
  `resetPJIntro` and no Settings row, an asymmetry left over from before
  the "Settings can reset it" pattern existed. Added `resetPJIntro`
  (`modules/para-jumbles/logic/store.js`) and wired it in, matching PS/OOO
  exactly.
- **RC's session screens now say "Journey," matching RC's own name for
  itself.** RC's browser page has always titled itself "Your reading
  journey," but its session, mentor-moment, and review screens said
  "← Library" (RC's own inconsistency, four places), while Para Jumbles,
  Para Summary, and Odd One Out all said "← Journey" (six places,
  matching their own browser titles). Renamed RC's four to "← Journey."
- **RC's action verbs now match the other three modules.** RC still said
  "Skip" and "Submit"; Para Jumbles, Para Summary, and Odd One Out had
  since converged on "Set aside" and "Lock it in" for the identical two
  actions. A learner moving between modules met two vocabularies for the
  same actions. Aligned RC's session screen to the newer, established pair.

Verified: `tools/verify.mjs` (all 13 checks), full ES module graph
resolves cleanly under Node, and a scripted Chromium pass through Home →
RC session → Settings → Para Jumbles first-time intro → solve → Home
again, with zero console errors and the "Continue your Para Jumbles
journey" card confirmed on screen. `CACHE_VERSION` bumped to 14 (five
precached files changed).

## 0.12.0 — 2026-07-11 — Odd One Out

The fourth VARC module, built faithfully to `ODD_MAN_OUT_BIBLE.md`. The
durable skill is **structural reading over elimination tricks**: the
outlier is on-topic but out-of-structure, defined by the discourse
relation it cannot enter, never by the topic it is about (Bible §4).
This is not an Odd One Out question bank; it is a complete learning
system that trains a reader to build the paragraph first and let the
stranger reveal itself.

### The learning journey (not a question bank)
- **A first-time introduction** (`/ooo` on first open, then `/ooo/about`
  forever, resettable from Settings → Learning): no questions until the
  learner understands what Odd One Out is, why CAT asks it, why beginners
  give away marks by hunting for a faulty sentence, why building the
  paragraph first is the whole method, and how paragraphs naturally
  develop ideas (old information carrying new). Calm, illustrated,
  progressive-reveal sections in very simple English.
- **An eight-tier ladder** — Foundation, Easy, Medium, Advanced, CAT,
  CAT+, 99 Percentile, Premium — each tier **teaches one structural
  reading skill** before the next raises the pressure (see the paragraph
  inside the five → build before you judge → same words different job →
  test the ties not the tone → hold the whole paragraph → both traps at
  once → the finest branch → everything at once). The primary difficulty
  lever is topical overlap between outlier and core (Bible §6). Tiers
  recommend; nothing locks.
- **The Paragraph Builder**: at the first three tiers the learner does
  not hunt the odd sentence at all. They arrange the four connected
  sentences on the shared `<cat-jumble-board>` (placing four of five),
  and the sentence left out becomes the answer — **construction before
  elimination** (Bible §7 remediation), until the protocol is a reflex.
  From Advanced up the surface is the exam's (tap the sentence that
  stands apart), with a read-back before locking at every tier.
- **Today's Mission before every item** ("Protect paragraph continuity.",
  "Find the logical branch.", "Build the paragraph before eliminating.",
  …) — eight missions, rotated intelligently because each item declares
  the skill its design foregrounds.
- **The Think button**: a floating coach available while solving. It
  never hints — it asks the coaching questions strong structural readers
  ask themselves (which four belong together, does one sentence begin a
  different discussion, is it broken or simply from another paragraph),
  two tuned to the item's mission plus a deterministic core.

### Teaching, not marking (the §12 answer experience)
Never a bare verdict. Every answer teaches in layers: **the paragraph
the four sentences build** (the four gently join into readable prose,
its spine named), **each sentence doing its job** (the discourse role
rail, with the cohesive tie between each pair of neighbours named),
**why one sentence stands apart** (the outlier visibly separates, its
§4 violation type named, and the reason it cannot attach), **the trap
exposed** (why the outlier looked like it belonged, and when the learner
excluded a belonging sentence, the exact §7 way-of-reading that produced
the pick), and **make it a habit**. Explanations grow richer with tier —
tie names from Medium, the cohesion and locus anatomy from Advanced,
the full difficulty anatomy at the elite tiers.

### The mentor and Reading DNA (the bounded §8 extension)
- An Odd-One-Out **Reading DNA** (`core/mentor/ooo-dna.js`) exposes
  exactly the four new traits the Bible sanctions and no more:
  coherence-monitoring (the local vs global locus split),
  relatedness-vs-belonging (the topical-overlap split),
  candidate-model-maintenance (build quality and quick exclusions that
  did not hold), and ambiguity-tolerance (the Trap A decoy). Every wrong
  pick is a core sentence carrying its own §7 tag, so misses aggregate by
  named solver pattern with no approximation. All evidence-floored and
  banned-word-linted, exactly like the RC, PJ and PS mentors. Growth
  gains a "How you detect" section.
- One lesson per set (`core/mentor/ooo-lesson.js`), same learning-store
  shape, so a coherence-monitoring insight can open tomorrow's reading
  session as a twenty-second recall (the Bible frames Odd One Out as
  comprehension monitoring, the metacognitive layer of all reading).

### Content: 20 items, all eight tiers, Bible-governed
`content/schema/ooo.schema.v1.json` encodes the Bible's §13 metadata:
the five sentences, the outlier and the core order, `spine_type` and
`nucleus`, the §4 a–g `violation_type` taxonomy, the §6
`difficulty_vector` with `topical_overlap` as the primary lever and
`violation_locus` (local/global/mixed), the two engineered `traps`
(A = belonging-looks-odd, B = outlier-looks-belonging), the Halliday &
Hasan `cohesion_signals`, and the §11 `validation` gates (uniqueness,
reconstruction, heuristic-adversarial, trap audit) which all pass to
ship. The bank: 20 original five-sentence items across 12 genres and all
seven violation types, outlier positions balanced exactly 5/5/5/5/5 (no
answer-position leak on a TITA type), and heuristic-adversarial from the
medium tier up (a pure surface-heuristic solver gets those items wrong,
Bible §10). Format (5 sentences, TITA, +3/0) is carried as configuration
with a `format_verified` note, never a constant. All enforced
mechanically — loader consistency checks + batch-level fairness checks.

### Reuse, not duplication
- OOO sessions/attempts persist to the **same** stores as RC, PJ and PS
  (`module: "ooo"`), so streaks, XP, levels, achievements, backup and
  restore cover detection with **zero** storage changes.
- Reuses `<cat-jumble-board>` (extended additively with an optional
  `maxPlaced` cap and an `excluded` reveal state — PJ passes neither and
  behaves exactly as before), the progress/timer/XP components, the
  celebration surface, and the existing audio language (**no new
  sounds**). Intro, mission, Think and teaching CSS shared with PJ/PS via
  grouped selectors — no component duplicated, no working file renamed.
- Reading Comprehension, Para Jumbles and Para Summary are untouched
  except for shared, additive surfaces (Growth section, Practice list,
  Settings row, Home recent-practice label, loader + verify extensions).
- `tools/verify.mjs` extended: OOO schema + consistency, registry
  mirror, precache coverage, batch fairness (outlier-position spread,
  violation-type variety, adversarial-flag enforcement), and a full OOO
  engine/voice/missions/think/DNA/lesson dry run.

**Roadmap note (per ROADMAP_V2 maintenance rule):** Odd One Out ships at
0.12.0, reusing the sentence-ordering interaction that Para Jumbles
introduced (as the 0.7.0 plan anticipated). Vocabulary remains the last
module in the V1.x ladder.

## 0.11.0 — 2026-07-11 — Para Summary

The third VARC module, built faithfully to `PARA SUMMARY BIBLE.md`. The
durable skill is **hierarchical reading**: find the apex claim, fix its
scope and certainty, hold the author's stance, and compress without
changing any of the three. Every item, option, explanation and
Reading-DNA signal is engineered to train exactly that — a learning
system, not a question bank.

### The learning journey (not a question bank)
- **A first-time introduction** (`/ps` on first open, then `/ps/about`
  forever, resettable from Settings → Learning): no questions until the
  learner understands what a summary question is, why CAT asks it, how
  beginners and experts read differently, and why "sounds good" is not
  the test — the meaning-preservation test is. Calm, illustrated,
  progressive-reveal sections in very simple English.
- **An eight-tier ladder** — Foundation, Easy, Medium, Advanced, CAT,
  CAT+, 99 Percentile, Premium — each tier **teaches one reading skill**
  before the next raises the pressure (claim vs topic → resisting the
  example → evidence vs claim → finding the turn → keeping qualifiers →
  holding stance → the one-word finalists → everything at once), mapped
  onto the Bible's five levels (§5 dials). Tiers recommend; nothing locks.
- **Today's Mission before every paragraph** ("Protect the author's
  scope.", "Ignore the examples.", …) — ten missions, rotated
  intelligently because each item declares the skill its design
  foregrounds.
- **The Summary Builder**: before the options, the learner writes the
  author's point in one sentence of their own, then walks an honest,
  item-specific comparison against the ideal summary (core idea, scope,
  certainty, additions, stance) — generation before recognition. Their
  sentences persist (learning store, `kind: "summary"`) and reappear on
  the Learning Page.
- **The Think button**: a floating coach available while solving. It
  never hints — it asks the questions expert readers ask themselves
  (Bible §3), two tuned to the item's mission plus a deterministic core.

### Teaching, not marking
Never a bare verdict. Every answer teaches in layers: **what the
paragraph actually says** (the paragraph gently compresses into the
ideal summary, thesis sentence highlighted), **why the best answer
holds** (the meaning-preservation test, applied), **why each option was
built to tempt you** (its §7 distortion archetype named, plus the §6
way-of-reading that produces it), and **make it a habit**. Explanations
grow richer with tier — sentence anatomy from Advanced, the separating
element at the elite tiers — never overwhelming beginners.

### The mentor and Reading DNA
- A Para-Summary **Reading DNA** (`core/mentor/ps-dna.js`): every wrong
  pick carries the taxonomy tag of the distortion that rewarded it, so
  misses aggregate by family (scope, certainty, structure, addition,
  stance, logic, language, precision) into the learner's dominant
  pattern — "scope pulls keep finding you" — plus qualifier-density and
  unmarked-turn splits, finalist strength, pace watches, and growth
  observations. All evidence-floored and banned-word-linted, exactly
  like the RC and PJ mentors. Growth gains a "How you summarise" section.
- One lesson per set (`core/mentor/ps-lesson.js`), same learning-store
  shape, so a summary insight can open tomorrow's reading session as a
  twenty-second recall.

### Content: 20 items, all eight tiers, Bible-governed
`content/schema/ps.schema.v1.json` encodes the Bible's operational core:
apex (claim/scope/certainty/stance) fixed before options, architecture
(§2), the eight difficulty dials (§5), load-bearing words, the elite
`separating_element`, and per-distractor archetypes (§7 palette,
single-distortion rule; layering elite-only). The bank: 20 original
paragraphs across 12 genres and 7 architectures (concession-turn capped
at 20%, §14), correct positions balanced 5/5/5/5, option lengths banded,
three error families per item, near-miss finalists with nameable
separating elements at the elite tiers. All enforced mechanically —
loader consistency checks + batch-level fairness checks in verify.

### Reuse, not duplication
- PS sessions/attempts persist to the **same** stores as RC and PJ
  (`module: "ps"`), so streaks, XP, levels, achievements, backup and
  restore cover summaries with **zero** storage changes.
- Reuses `<cat-question-card>`/`<cat-option>`, the progress/timer/XP
  components, the celebration surface, and the existing audio language
  (no new sounds). Intro and teaching CSS shared with PJ via grouped
  selectors — no component duplicated, no working file renamed.
- Reading Comprehension and Para Jumbles are untouched except for
  shared, additive surfaces (Growth section, Practice list, Settings
  row, loader + verify extensions).
- `tools/verify.mjs` extended: PS schema + consistency, registry
  mirror, precache coverage, batch fairness (position spread,
  architecture variety, concession-turn cap), and a full PS
  engine/voice/missions/think/DNA/lesson dry run. All 83 checks pass.

**Roadmap note (per ROADMAP_V2 maintenance rule):** Para Summary ships
at 0.11.0. Odd One Out and Vocabulary remain next in the module ladder.

## 0.10.0 — 2026-07-10 — Para Jumbles

The second VARC module, and the first that teaches a genuinely new skill:
rebuilding a scrambled paragraph into the order its author wrote. Built
faithfully to the new `PARA_JUMBLES_BIBLE.md` — the durable skill is
**global coherence tracking over local pattern-matching**, and every item,
explanation, and Reading-DNA signal is engineered to train exactly that.

### The learning journey (not a question bank)
- **A first-time introduction** (`/pj` on first open, then `/pj/about`
  forever): no questions until the learner understands what a jumble is,
  why CAT asks it, why memorised tricks fail, and how authors build
  paragraphs (old information carrying new). Calm, illustrated, sections
  that reveal as they scroll, written in very simple English — the learner
  should finish excited, not scared.
- **An eight-tier ladder** — Beginner, Easy, Medium, Advanced, CAT, CAT+,
  99 Percentile, Premium — each with a distinct design contract from the
  Bible's §6 difficulty bands, so every step *feels* different. The decisive
  local-linking → macro-structure plateau (Bible §9, level 2→3) is crossed
  between Medium and Advanced by design. Tiers recommend; nothing locks.
- **The solving surface**: tap sentences into order, then a mandatory
  **read-back** — the assembled paragraph appears as prose before you can
  lock in (Bible Recommendation 6, defeating premature closure). The time
  spent on that read-back is recorded and read by the DNA.

### Teaching, not marking (the four-layer explanation, Bible §11)
Every attempt, right or wrong, is taught in four layers: **the shape**
(name the macro pattern first), **the author's moves** (why each sentence
sits where it does, tied to meaning), **the order that tempted you** (your
exact wrong order walked to the point it breaks, with the trap named), and
**the trap as a reusable defense** plus one transferable habit. Signals are
always taught *with their reliability* — never as rules — because the Bible's
core lesson is that every surface cue can be weaponised.

### The mentor and Reading DNA
- A Para-Jumbles **Reading DNA** (`core/mentor/pj-dna.js`) profiles how you
  rebuild paragraphs: surface-matching, opener/ending judgement,
  global-coherence tracking (accuracy vs number of plausible orderings),
  working memory for long chains, implicit-inference gaps, and premature
  closure (quick locks that did not hold). Every observation is
  evidence-gated behind explicit floors — the mentor never sees a pattern in
  noise — and the language is banned-word-linted for judgment, exactly like
  the reading mentor. Growth's "How you order" section surfaces it.
- One lesson per set (`core/mentor/pj-lesson.js`), in the same learning-store
  shape the reading mentor uses, so a jumble insight can open tomorrow's
  reading session as a twenty-second recall.

### Content: 19 authentic items, all eight tiers
Each written paragraph-first then scrambled (Bible §10), single defensible
order, one documentable link per consecutive pair with its reliability, the
full §12 metadata (twelve-axis difficulty vector, macro pattern, cohesion
signals, engineered traps, `num_plausible_orderings`, and a
`heuristic_adversarial` flag that is **true from Medium up** — a pure
surface-heuristic solver gets those items wrong). Format (4 sentences, TITA,
+3/0 no negatives) is carried as *configuration* with a "last verified" flag,
never hard-coded, per the Bible's volatility warning.

### Reuse, not duplication
- TITA scoring engine (`core/engine/pj-session.js`, +3/0). PJ sessions and
  attempts persist to the **same** stores as RC (records tagged
  `module: "pj"`), so streaks, XP, levels, achievements, backup and restore
  cover jumbles with **zero** storage changes.
- One new shared component, `<cat-jumble-board>` (select-to-order, not
  drag — reliable on small screens and keyboard-friendly, per ROADMAP_V2's
  0.7.0 decision). No new sounds: every cue reuses the existing audio
  language. Reading Comprehension is untouched; the module registers itself.
- `tools/verify.mjs` extended: PJ schema + consistency (permutation checks,
  links-per-pair, adversarial-flag enforcement), registry agreement,
  precache coverage, and a full PJ engine/voice/DNA/lesson dry run. All
  checks pass.

**Roadmap note (per ROADMAP_V2 maintenance rule):** Para Jumbles ships at
0.10.0, ahead of Odd One Out. It shares the sentence-ordering interaction
that Odd One Out (originally paired with it at 0.7.0) will reuse. Module
order behind is unchanged.

## 0.9.0 — 2026-07-07 — Audio Identity

A complete, coherent sound language, synthesized live — so studying feels
satisfying, calm, and premium rather than noisy. Success criterion: the
sounds read as one family (a recurring motif, one tonal world), never feel
childish or arcade-like, and hold up over a long study session without
fatigue. Everything is Web Audio; no mp3/wav assets are added, nothing new
to download, cache, or license (the durability rule holds).

**Roadmap note (per ROADMAP_V2 maintenance rule):** Audio Identity is
inserted at 0.9.0; the Para Summary module shifts by one (→ 0.10.0). The
module order behind it (PS → PJ → OOO → Vocab) is unchanged.

### The sound engine (`src/core/engagement/audio.js`, new)
- One **tonal world**: every pitched sound is drawn from a single C-major
  **pentatonic** scale, so any two grains that overlap are always
  consonant — layering (with haptics, or with another sound) can never
  turn ugly, and nothing ever sounds "wrong". This is what makes the
  family cohere and what keeps hours of study fatigue-free.
- One **motif**: a rising C–E–G "bloom" (the major triad) is the reward
  signature, stated more completely as the reward grows (lessonComplete →
  levelUp → dailyGoal). Hearing a fragment predicts reward; the fuller
  statements resolve it (reward prediction, anticipation → resolution).
- One **mentor colour**: a soft Cmaj9 (adds the 9th) — lush and
  "thoughtful" without dissonance — is the mentor's recurring voice, also
  hinted in the opening chime so the app's welcome and its mentor rhyme.
- Three **timbre families**: CLICKS (filtered-noise ticks — buttons,
  toggles), PAPER (band-passed noise sweeps — cards/pages), and CHIMES
  (soft sine/triangle voices — every cue and reward).
- **Master chain**: gain → gentle compressor (a soft limiter so overlaps
  never bite) → low-pass (warmth, removes fatiguing fizz) → destination.
  One shared 1-second noise buffer feeds every click (tiny, reused).
- Psychoacoustics applied throughout: **variable reinforcement** (the
  "correct" tone picks its resolving top note and a few cents of detune at
  random — never mechanical, always pentatonic), pleasant intervals
  (fifths, thirds, octaves), and low levels with short envelopes.

### The twenty sounds, and where they live
- App open → a soft welcome chime (armed once, sounds on the first
  gesture, because autoplay policy blocks sound before any interaction).
- Button press → a tiny click; Toggle/segmented/answer-pick → a wooden
  tick; a `<details>` card opening → a paper sweep — all wired **once** as
  app-wide delegation (`installGlobalFeedback`), so every control feels
  alive without per-screen plumbing.
- Correct → a satisfying-but-subtle rising resolve; Incorrect → a warm,
  low settle to the tonic (helpful, never a punishment sting); Evidence
  re-anchor ("¶ Re-read the evidence") → a small sparkle (the reward of
  finding the proof — the "excellent explanation" moment, user-initiated
  so it never fatigues).
- Reflection kept → a warm confirmation; Session end → the **mentor
  signature** (every session); Lesson complete / Level up / Achievement /
  new-best Streak → the reward tier, one sound chosen by the biggest
  milestone, landing a beat after the mentor and synced to the rising
  celebration sheet. **Stacked** milestones add a layered sparkle shower
  ("confetti" — layered light, never a cheer).
- **Daily goal** (first session of the day) → the memorable success
  melody, a warm phrase with a dip-then-lift hook and a bell resolve; it
  is audio-only (no sheet) and reserved for the day's goal so it stays
  special. (Where a new-best streak coincides it escalates to the streak
  tone; documented so the two daily-ish sounds never double-fire.)
- XP counting → tiny ascending pentatonic notes synchronized with the
  count-up; the XP bar now reveals on scroll-into-view (Intersection
  Observer) so the run accompanies a *visible* climb and never collides
  with the mentor/reward audio from inside a collapsed fold.
- Toasts → a soft, unobtrusive `notify`; Backup saved → a tiny reassuring
  confirmation; Restore complete → a warm "rebuilding" arpeggio; Error →
  a short, deliberately NEUTRAL double-pulse (F, outside the reward world,
  so it reads as information — attention, not alarm).

### Preferences & Settings
- New **master volume** control (a token-styled, accessible native range;
  persisted as `sound-volume`, default 0.7) beside the existing Sounds
  toggle, which is unchanged and **still defaults OFF** (opt-in). Enabling
  Sounds replays the welcome chime as an honest demo; dragging the volume
  previews a tick at the new level.
- `feedback.js` becomes the orchestration layer: a single **cue table**
  maps each semantic moment to a haptic pattern + a named sound (haptics
  and sound layer naturally, fired together). `tools/verify.mjs` §10
  cross-checks every cue against the engine's registry so the two files
  can never drift, and confirms the disabled play-path is a safe no-op.

### Accessibility & honesty
- **Reduced-motion** is respected: the XP run collapses to one soft note,
  and the sparkle/confetti showers thin to a few grains — less rapid
  stimulation for sensitive users (sound is never muted outright; it isn't
  motion).
- Sound never plays while the tab is **hidden**, and never fires from
  reading or scrolling — reading is never interrupted.
- HONESTY NOTE retained: whether the iOS hardware-mute switch silences Web
  Audio varies by version/context and can't be reliably detected — hence
  the OFF default, the toggle, the master volume, and the no-background
  rule, rather than a false promise of respecting system mute.

### Plumbing and verification
- Service worker precaches `src/core/engagement/audio.js`; shell
  `CACHE_VERSION` 9 → 10 (content cache untouched). The module-graph +
  precache-coverage check proves the new module is reachable and cached,
  so offline can't break. `APP_VERSION` → 0.9.0.
- No design tokens changed; the volume range styles are token-only
  additions to `components.css`. No content, schema, or engine logic
  changed.

## 0.8.0 — 2026-07-06 — The Premium Reading Library

The milestone that turns a starter shelf into a library. Success criterion:
after finishing a passage's questions, a student should think "now I finally
understand what I just read." The content library — the actual product —
grows from 8 passages to 32, and the Learning Page becomes a complete,
book-like lesson rather than a set of coaching notes.

**Roadmap note (per ROADMAP_V2 maintenance rule):** this release is a
content-and-learning-surface milestone inserted at 0.8.0 ahead of the Para
Summary module (which shifts by one). Rationale: ROADMAP_V2 §1 names the thin
content library as "the binding constraint on daily-use value, ahead of any
feature", and §10's steering sentence is "grow the library" first. The module
work (PS/PJ/OOO/Vocab) is unchanged in order behind it.

### Content — 24 new premium RC passages (rc-0009 … rc-0032)
- Two reviewed batches (`batch-rc-003` = rc-0009…rc-0020, `batch-rc-004` =
  rc-0021…rc-0032) covering **all 12 genres exactly twice**, at the mission's
  **6 easy / 12 medium / 6 hard** split (25/50/25), with **no two hard
  passages adjacent in id order** so the journey ladder never spikes.
- New genres given their first passages: anthropology, political-theory,
  technology-ethics, environment — every genre in the schema is now represented
  (each with a foundation/developing/intermediate/advanced/elite spread).
- Each passage is authored to the `CAT_VARC_BIBLE` craft rules: an argument
  (not a topic), a discernible author with a contestable stance, qualified
  claims, every distractor a named trap with an articulated seductive element,
  and correct answers that are the defensible survivor rather than the most
  satisfying option. Several passages deliberately withhold a resolution
  (moral luck, the boundary problem) so the correct answers describe a tension
  rather than dissolve it. Provenance stays honest — original compositions in
  CAT register (`source.publication: "original"`), never fabricated citations.
- 102 new questions (library now **136**) carry full distractor teardowns and a
  transferable `reading_habit`; every passage extracts vocabulary-in-context,
  and hard passages run 5 questions including strengthen/weaken items.

### Schema v4 — the full Learning Page (appended; v1–v3 files stay valid)
- `content/schema/rc.schema.v4.json` extends the mentor block with five
  fields that make the Learning Page a complete lesson: `one_sentence_summary`
  (the honest one-line the reader checks their own summary against),
  `simple_explanation` (the whole passage retold in lucid, beginner-readable
  English), `why_difficult` (where readers genuinely struggle, named without
  blame), `reading_lesson` (the ONE permanent reading habit the passage
  builds), and `reflection_question` (one question worth sitting with; the
  schema enforces it ends with "?").
- Versions are appended, never edited: the loader still resolves each file to
  its own schema version, and the eight existing v3 passages are untouched.

### The Learning Page, rebuilt (`/rc/mentor/:id`)
- New sections render in a calm, book-like order: the recall reveal now opens
  with the one-sentence summary; "The passage, explained simply" renders the
  retelling as real paragraphs; "Why this passage was difficult", "The reading
  lesson" (held in a quiet card), and "A question to sit with" (above the
  reflection line) all ship. Every new section is guarded, so v3 passages
  render exactly as before.
- Each of the 12 new passages gets its own self-drawing, monochrome theme
  illustration (keyed by id in `mentor.js`, content JSON stays pure data), and
  the four previously-uncovered genres gain fallback motifs.
- New styles are token-only additions to `components.css`; no design tokens
  were changed and the existing look is preserved.

### Plumbing and verification
- Registry rebuilt from the passage files themselves (a scripted, idempotent
  mirror), so `content/index.json` and the files cannot disagree.
- Service worker: schema v4 and the 24 passages added to the content precache;
  `CONTENT_VERSION` 3 → 5 and `CACHE_VERSION` 7 → 9 across the milestone (both
  content and shell changed as the two batches and the renderer shipped).
- `tools/verify.mjs` extended for v4: the mentor-voice trap lint now targets
  the newest schema on disk, and the schema-precache check now covers every
  version present (not just v1), so a forgotten schema precache is unshippable.
  Full verify is green; edited DOM modules pass `node --check`.

## 0.7.0 — 2026-07-05 — The Personal Reading Mentor

The milestone that gives CAT OS its voice. Success criterion: a student
should finish a session thinking "this app understands how I read" — never
"here is my list of errors." The Mistake Notebook the roadmap planned is
deliberately **subsumed, not built**: every miss is still captured (attempts
since M2, one lesson per session from today), but the product surface is a
mentor and a growth story, never a ledger of failure.

**Roadmap note (per ROADMAP_V2 maintenance rule):** this release takes the
0.7.0 slot the notebook held. Its learning goals — capture, resurface,
retire — ship here in mentor form: lessons captured per session, resurfaced
as twenty-second recalls, retired ("absorbed") after three successful
recalls. Spaced repetition (1.2) inherits this loop instead of a notebook.

### The mentor core (`src/core/mentor/` — pure, deterministic, offline)
- `voice.js` — every sentence the mentor can say, in one reviewable file:
  opening lines by situation, ten named trap patterns (each with the pull,
  how to notice it, and a twenty-second recall seed), question-type advice,
  Reading-DNA copy. Deterministic variety (seeded pick, never random). The
  vocabulary of failure is machine-banned: verify lints every string
  against BANNED_WORDS (wrong/failure/mistake/poor/weak/bad…).
- `dna.js` — **Reading DNA**: evidence-gated observations derived from
  stored sessions + content, never stored, never judged. Detectors: trap
  affinities ("the pull of certainty"), traps gone quiet (growth,
  celebrated first), question-type strengths and frictions, sitting long
  without accuracy, ending rush, fast first pass, late-session dip. Every
  detector sits behind explicit minimum-evidence FLOORS — the mentor stays
  silent rather than pretend noise is a pattern.
- `lesson.js` — the **One Lesson Rule**: after every session, exactly one
  teaching — the miss that matches the reader's characteristic pull, or the
  way into a skipped question, or (clean read) the understanding worth
  keeping, including "an old pull, walked past" when a known pattern was
  present and avoided. Plus `pickRecall`: tomorrow's single twenty-second
  recall (never today's lesson, never twice a day, retired after 3).
- `records.js` — lessons and recall state in the `learning` store (shipped
  0.6.0; no migration), through the StorageAdapter only.

### The mentor moment (session end, rebuilt)
Sessions no longer end on a scoreboard. The mentor opens ("Today I noticed
something…"), teaches the one lesson — the moment, why the brain goes
there, how to notice it next time — with the question itself one fold away,
then a single quiet line: "6 of 8 landed — the numbers matter less than the
noticing." Full numbers, XP, recap, and the review link live in a
"Session details" fold: honesty one tap deep, judgment nowhere.
Milestone celebrations (levels, achievements, best streaks) unchanged.

### Twenty-second recall (before reading)
Opening a new passage first offers one tiny card from a previous lesson:
think → reveal → "Got it" → it collapses and the reading begins. Revision
that barely feels like revision; skippable by simply reading on.

### Growth (new screen, new tab)
`/growth` — the anti-notebook, first extracted shell screen
(`src/shell/growth.js`). Three sections, no marks anywhere: **How you
read** (DNA observations as calm cards — growth first, then strengths,
then watches, each with its evidence sentence), **Concepts you've
collected** (one per session, Fresh → Recalled n of 3 → Absorbed), and
**In your own words** (the latest reflection, quoted). Beautiful empty
state before the first session; "still listening" card until evidence
clears the floors. Bottom nav gains a fourth item (sprout icon) — still
under the five-tab ceiling.

### Verification & plumbing
- verify.mjs section 9 — mentor dry run: voice lint against BANNED_WORDS
  (walks every exported string and template output), a teaching pattern +
  recall must exist for **every** trap_type the schema allows, seeded-pick
  and DNA determinism, evidence floors gate below-threshold histories, one
  lesson per messy session (kind watch), mastery lesson on clean sessions,
  recall rules (not today's lesson, once per day, retire at 3).
- `loadRCPassages(ids)` added to the content loader (shared by mentor and
  Growth — no duplicated loading logic).
- Service worker: shell cache v7; five new modules precached (content
  cache untouched at v3 — no content changed).

## 0.6.0 — 2026-07-05 — The Reading Experience

The milestone that makes CAT OS feel like the best reading application a
CAT aspirant has ever used. Success criterion: a student should *enjoy
reading here*, not merely solve questions.

**Roadmap note (per ROADMAP_V2 maintenance rule):** this owner-directed
release takes the 0.6.0 slot; the Mistake Notebook moves to 0.7.0 and
subsequent ladder versions shift by one.

### The reading surface, rebuilt
- `cat-passage` redesigned against the best reading software (Kindle,
  Apple Books, Medium, Readwise Reader): a true book measure (~64
  characters), scaled serif title, paragraph rhythm via a dedicated
  `--para-space` token, `text-wrap: pretty`, hyphenation on narrow
  phones only, margin-hung numerals, and a quiet end-mark (◆) so the
  reader always knows the text is finished.
- Reading size grows to four steps (S/M/L/XL) — XL for late-night and
  accessibility reading; leading loosens as type grows.
- While reading: a sticky, veiled session bar (backdrop blur, safe-area
  aware, notch-painting `::before`), a scroll-driven progress hairline,
  and a Kindle-style "~N min left" that counts down as you scroll.
- Paragraphs carry `scroll-margin-top` so evidence jumps land clear of
  the sticky bar.

### Real difficulty progression (foundation → elite, every rung real)
- Three new fully-authored v3 passages (batch-rc-002): **rc-0006 "What
  the Hand Remembers"** (foundation/easy 2 — the journey's deliberately
  gentle first step), **rc-0007 "The Invention of the Weekend"**
  (intermediate/medium 5, first history item), **rc-0008 "The Authority
  of the Original"** (elite/hard 9, first elite passage, 5 questions).
- Registry now carries `difficulty_numeric` for every item, so
  within-stage ordering is genuine, not id-accidental. The library
  ladder is 2→3 / 5→6 / 5→6 / 8 / 9 across five populated stages.
- The library screen became "Your reading journey": overall progress
  bar, stages that introduce themselves (one reviewable voice in
  `journey.js` → `STAGE_INFO`), per-stage read counts, difficulty shown
  as a calm dot, and the recommended passage carrying an accent edge
  with its reason.

### Content schema v3 (appended; v1/v2 files remain valid)
- Every question's explanation must now teach one transferable
  **reading habit** (`explanation.reading_habit`) — shown as "Make it a
  habit" — and every mentor block must explain **why students misread
  this passage** (`mentor.misunderstanding`).
- All five existing passages upgraded to v3 with authored habits and
  misunderstanding notes (owner review pending, as recorded since M2).

### The Learning Page, redesigned (the signature)
- A theme illustration per passage — monochrome inline SVG drawn for
  *this* passage's idea (a balance for deference, a nib for muscle
  memory, a calendar with two freed days…), self-drawing on arrival,
  with genre fallbacks for future content.
- Chapter sections renamed into a mentor's voice: What was this
  actually about? (recall-first) · What was the author doing? · The
  journey, paragraph by paragraph (now with each paragraph's opening
  words as a memory anchor) · Where the argument turns · How the voice
  moves · **Why readers misread it** (new) · The traps, as advice ·
  Words worth keeping (margin-note vocabulary cards) · **Keep this
  forever** (the page's one pull-quote) · Where life will show you this
  again.

### Reading reflection (new, optional, local)
- After the Learning Page: `<cat-reflection>` — sentence starters ("I
  never realised…", "My biggest takeaway…", "What surprised me…"), an
  auto-growing serif textarea, saved per passage and editable later.
- First use of the new **`learning` object store** (IndexedDB v2,
  additive; the store the notebook will share). Backup format v2
  exports it; v1 backups still import cleanly.

### Explanations that teach thinking
- `cat-explanation` rebuilt as a reading lesson: plain verdict line →
  "How a strong reader gets there" with an evidence pill (¶ Re-read the
  evidence) → distractor teardown cards with trap-type labels and
  "feels right because" → the reading-habit callout.
- Review mode uses the same verdict language (duplicate chips removed);
  each reviewed question is numbered.

### Visual identity & mobile polish
- Bottom nav: matched inline-SVG stroke icons (home/book/sliders) on a
  veiled, blurred bar; nav labels tightened.
- New tokens: `--text-3xl`, `--para-space`, `--radius-xl`,
  `--duration-slower`, `--color-veil`; reading measure corrected to
  36rem; empty-state glyphs sit in quiet circles; skeleton variants for
  lines/titles; quiet `.btn--quiet`; difficulty dots.
- Forced light/dark theme now recolors the iOS status bar
  (`theme-color` metas kept in sync); `overscroll-behavior-x: none`;
  progress bar advances when a question is answered (not one behind);
  screen-scoped event listeners (no accumulation across navigations).

### Verification (`tools/verify.mjs`)
- **Fixed:** dynamic imports now use `pathToFileURL` — the tool
  previously could not run on Windows at all.
- New checks: registry↔file agreement extended to stage /
  difficulty_numeric / estimated_time_min / word_count; journey must
  cover every stage and start foundation-easy-minimum; **module-graph
  resolution** (every import reachable from app.js exists **and is
  precached** — offline breakage is now unshippable); backup round-trip
  of the learning store incl. v1-file compatibility.
- Service worker: shell cache v6, content cache v3; schema v3, three
  new passages, `cat-reflection.js` precached.

## 0.5.0 — 2026-07-04 — The Reading Mentor

The milestone that shifts the product's center of gravity from scoring to
understanding. Success criterion: a student who completes one passage should
be a better reader than twenty minutes earlier.

**Roadmap note (per ROADMAP_V2 maintenance rule):** this release displaces
the Mistake Notebook, which moves from 0.5.0 to 0.6.0; subsequent ladder
versions shift by one. Rationale: the mentor layer changes what a "mistake"
links back to (the Learning Page), so building it first makes the notebook
better, not later.

### Content becomes a curriculum (schema v2 — appended, v1 untouched)
- `content/schema/rc.schema.v2.json`: adds `meta.stage` (foundation →
  elite), `meta.skills` (reading skills practiced), and a required `mentor`
  block: challenge (pre-read), main idea, author's intention, per-paragraph
  journey (role + note, mirrored 1:1 against paragraphs and enforced by the
  loader), tone progression, key transitions, traps-as-advice, real-world
  relevance, one takeaway.
- All five passages upgraded to v2 with fully authored mentor layers
  (meta.version 2; owner review pending, as recorded since M2). Registry
  carries stages.

### The Learning Page (`/rc/mentor/:id`) — the signature
A book chapter, not a dashboard: the app's only artwork (one monochrome
inline-SVG motif per genre, offline by construction), recall-before-reveal
on the main idea (generation effect), the Paragraph Journey rail, tone and
transitions, traps converted into next-passage advice, vocabulary worth
keeping, real-world relevance, one line to keep — then "What you learned
today," derived from this passage and this session, never generic.

### Learning progression (`src/core/learning/journey.js`)
Stage ladder with grouping for the library; recommendations always carry a
plain-English reason; balance rules are legible: never two hard passages in
a row, consolidate a stage after a rough session, and when the library is
read, resurface the weakest passage. Nothing is ever locked — stages
recommend, they do not gate.

### Reading experience
- Reading-size preference (S/M/L) in Settings, persisted through the
  StorageAdapter, scaling only the reading surface via tokens.
- Pre-reading briefing card: stage, genre, difficulty, time, key-word
  count, skills practiced, and the passage's challenge — five seconds of
  mental preparation before the first sentence.
- Evidence jumps: every explanation's anchor is now a control that opens
  the passage and flashes the exact source paragraph, in session and review.

### Changed
- Browser → "Your reading journey," grouped by stage, with a reasoned
  "Next for you"; dashboard Continue card is journey-driven and states why.
- Result screen's primary action is now "Understand this passage."
- Service worker: shell v5, content v2 (passages changed), schema v2 and
  three new files precached.
- `tools/verify.mjs`: resolves schemas per item version; journey dry run
  (ladder order, grouping, balance rules, re-read fallback); loader enforces
  mentor↔paragraph mirroring.

## 0.4.0 — 2026-07-03 — Milestone 4: Engagement system

Premium motivation, not gamification: XP, streaks, achievements, a motivational
dashboard, and whisper-level feedback — all derived from data the app already
stores, all offline, all inside the existing architecture.

### Core (`src/core/engagement/` — pure logic, no DOM, no storage writes*)
- `xp.js` — legible XP rules (+10 correct, +2 wrong, +5 session, +25 perfect)
  and a predictable level curve (100, 150, 200… per level).
- `streaks.js` — daily/best/perfect/accuracy streaks derived from session
  dates on the device's local calendar; humane recovery framing (a streak is
  alive through yesterday; the UI invites, never scolds).
- `stats.js` — the single aggregation point every surface derives from.
- `achievements.js` — declarative registry (11 achievements across firsts /
  consistency / volume / mastery); adding one = adding one object.
- `feedback.js` — haptics (navigator.vibrate, silent no-op on iOS) and tiny
  synthesized WebAudio cues (no audio files). *Persists only two settings
  records (haptics, sounds) plus the celebrated-ids record, via StorageAdapter.
- `messages.js` — the app's whole motivational vocabulary in one reviewable
  file; information over judgment, never manipulative.

### UI
- `cat-xp-bar` (animated fill + reduced-motion-safe XP count-up),
  `cat-week-strip` (last 7 days as quiet bars), `cat-celebration` (the ONE
  celebration surface: a calm sheet with a self-drawing medal).
- Dashboard: date eyebrow, greeting + one honest motivational line, a Today
  card (goal · streak badge · XP bar · week strip), six-stat grid (sessions,
  answered, accuracy, time studied, best streak, level), Continue learning,
  Achievements (n of 11 + three most recent), Recent practice.
- Session result: XP earned with count-up, level progress, one performance
  line; celebration only for level-ups, new unlocks, or a new best streak —
  never for ordinary answers.
- Settings: Feedback card (Haptics default ON where supported; Sounds default
  OFF, opt-in) with an immediate demo cue on toggle.

### Decisions (recorded in STATUS.md)
- Derived-first engagement: XP/levels/streaks/stats are computed from stored
  sessions — no new object stores, no DB migration, backups already cover it.
- "Vocabulary Explorer" deferred honestly (no vocab interaction data exists);
  "Complete Library" takes its slot until the Vocabulary module lands.
- Sounds default OFF: iOS hardware-mute behavior for WebAudio is not reliably
  consistent — verify on device; volumes are whisper-level regardless.

### Changed
- `service-worker.js` → shell cache v4; nine new files precached.
- `tools/verify.mjs` → engagement dry run (XP curve monotonicity + exact
  thresholds, perfect-bonus formula, streak derivation incl. recovery state,
  7-day strip shape, achievement gating against celebrated ids).

## 0.3.0 — 2026-07-03 — Milestone 3: Experience pass

Experience only: no new features, no architecture changes, no functionality
touched. The same app, made to feel calm, fast, and intentional.

### Design system (tokens.css rebuilt as the full design language)
- Three-level ink hierarchy (`--color-ink/-2/-3`), surface scale, line scale.
- Semantic colors: success / warning / danger / info (+ dark equivalents);
  answer-feedback colors now alias the semantic tokens.
- Complete scales: spacing (4px), typography (12→30 with a dedicated 18px
  reading size), radius (xs→full), elevation (`--shadow-0/1/2`), motion
  (`--duration-fast/default/slow`, eases, `--press-scale`), state tokens
  (focus ring, disabled/dim opacities), and a tighter reading measure.

### Motion (all `prefers-reduced-motion`-safe)
- One orchestrated entrance: screens rise gently; top-level cards follow in a
  capped 40ms stagger. Nothing else animates on load.
- Uniform press feedback (scale 0.98) on buttons, options, nav, list items.
- Explanations fade in; the results screen draws a small check; toasts settle
  in with a spring-less rise; theme switching cross-fades background/color.
- Skeleton shimmer for the passage list (static fill under reduced motion).

### Screens
- **Home → dashboard:** date eyebrow, serif greeting, stat grid (sessions /
  answered / accuracy), a Continue-practicing card that surfaces the next
  unread passage, and Recent practice with per-session review links.
- **Settings → grouped premium page:** Appearance / Your data / About cards
  with consistent leading icons, descriptions per row, storage usage via
  `navigator.storage.estimate()` (honest fallback text), and the app version.
- **Empty states** for 404 and the passage browser — direction, not mood.
- RC reading surface: passage column tightened to a reading measure, body
  raised to 18px/1.75, paragraph numerals hang in the margin on wide screens.

### Mobile & accessibility
- Safe-area padding on all four edges; landscape-phone header compaction;
  `touch-action: manipulation`; tap-highlight replaced by our press feedback.
- Consistent two-layer focus ring token applied via `:focus-visible`;
  hover styles gated behind `(hover: hover)` so touch devices never stick.
- `aria-busy` during list loading; labeled review links; decorative glyphs
  `aria-hidden`.

### Performance
- Animations restricted to `transform`/`opacity` (compositor-friendly);
  transitions declare specific properties, never `all`; hover lift avoided on
  touch; no new network work; offline behavior unchanged (shell cache → v3).

### Unchanged by design
Engine, scoring, loader, validator, storage, router, module contracts, all
content, and every user-facing behavior.

## 0.2.0 — 2026-07-02 — Milestone 2: Reading Comprehension module

The first fully working VARC module: an end-to-end, offline learning loop —
read a passage, answer its questions, see exactly why each option is right or
wrong, and review the attempt later — with every attempt persisted through the
existing StorageAdapter. Nothing from Milestone 1 was rebuilt.

### Added
- **RC content schema v1** — `content/schema/rc.schema.v1.json`, the mechanical
  form of CONTENT_DATABASE_SCHEMA.md's RC model (paragraph array, per-question
  distractor analysis, difficulty at two granularities, estimated times).
- **Content pipeline (app side)** — `core/content-loader/validator.js` (a small
  dependency-free JSON-Schema-subset validator) and `core/content-loader/loader.js`
  (fetch + schema-validate + cross-field consistency checks at the boundary).
- **Session engine** — `core/engine/session.js` (pure, DOM-free walk through a
  passage's questions with per-question timing) and `core/engine/scoring.js`
  (accuracy + clearly-labeled CAT-style +3/−1 marks).
- **RC module** — `src/modules/reading-comprehension/`: passage browser, the
  three-phase session screen (reading → question-by-question with immediate
  explanations → result), and review mode. Registered via `registerRC(router,
  context)`; app.js stays a thin wiring layer.
- **UI components** — `cat-passage` (reading-first, numbered paragraphs),
  `cat-option`, `cat-question-card`, `cat-explanation` (trap-type + why-seductive
  per distractor), `cat-progress-bar`, `cat-timer`, `cat-result-summary`.
- **Persistence** — sessions → `sessions` store, per-question attempts →
  `attempts` store, all through the StorageAdapter (Rule 6). Home shows a quiet
  aggregate; the browser shows per-passage status.
- **Starter content** — five original CAT-register passages (rc-0001…rc-0005),
  21 questions total, across philosophy / economics / science / sociology /
  arts-culture and easy→hard, each with full explanations, distractor analysis,
  estimated times, and vocabulary. Registry populated to match.
- **Verification tool** — `tools/verify.mjs`, run with plain Node, reusing the
  app's own validator and consistency rules so tool and runtime cannot drift.
  Checks schema validity, registry↔file agreement, service-worker precache↔disk,
  and does an engine dry run.

### Changed
- `service-worker.js` → shell cache **v2** (all new module + component files
  precached) plus a **separate content cache v1** precaching the schema, registry,
  and five passages; new content is cached on first use as the library grows.
- `src/ui/styles/tokens.css` — added reading line-height and answer-feedback
  colors (light + dark). Additive; no existing token changed.
- `src/ui/styles/components.css` — added practice-flow patterns (badges, list
  items, session bar, verdicts). Additive.
- `src/app.js` — registers the RC module and renders module list on Practice;
  Home now shows aggregate progress. Shell screens and Backup/Restore unchanged.
- `src/modules/README.md` — documents the now-established module pattern.

### Fixed (during verification, before release)
- Passage `meta` blocks were missing the schema-required
  `meta.estimated_time_min`; added to all five and now enforced by the tool.
- Session screen timers now count from the true session start rather than
  resetting between phases.

### Decisions
Recorded in `STATUS.md` → "Recorded decisions (Milestone 2)": paragraph-array
passage shape (schema authority over the prompt template, which is flagged for a
v2 update), array-shaped distractor analysis, the two time fields, the
no-dependency validator, the separate content cache, and CAT-style (not official)
marks. Content provenance policy (original vs. sourced passages) logged as an
open owner decision.

## 0.1.0 — 2026-07-02 — Milestone 1: Walking Skeleton

The first shippable state: an installable, offline, no-build PWA shell with
working local persistence. No practice content yet — by design.

### Added
- App shell: `index.html`, bottom navigation (`<cat-nav>`), Home / Practice /
  Settings / Not-found screens.
- PWA: `manifest.webmanifest`, full icon set (192/512/maskable/apple-touch),
  `service-worker.js` with versioned cache-first shell caching and offline
  navigation fallback.
- Design system: `tokens.css` (light/dark, single accent, type/space scales),
  `base.css`, `components.css`. Motion respects `prefers-reduced-motion`;
  visible keyboard focus throughout.
- Core: hash `Router` with param routes and 404; `StorageAdapter` interface
  (Rule 6) + `IndexedDBAdapter` (DB `cat-os` v1; stores `settings`,
  `attempts`, `sessions`); `backup.js` export/import with versioned file
  format and explicit merge/replace.
- Settings: theme preference (system/light/dark) persisted through the
  StorageAdapter; working Backup & Restore.
- Error handling: global `error`/`unhandledrejection` handlers surfacing
  through a single `<cat-toast>` component.
- Repo hygiene: accurate `README.md`, `STATUS.md`, this changelog,
  `content/index.json` (empty registry), `.nojekyll`, `src/modules/README.md`.

### Fixed
- Replaced the incorrect README, which described an unrelated hobby kernel OS.

### Decisions
- Recorded in `STATUS.md`: relative-path constraint, system font stacks, no
  empty stubs for later-version files, DB naming and keying.
