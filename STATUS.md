# STATUS

> The honest, current state of CAT OS. One line per system:
> **shipped** (works today) / **building** (in progress) / **designed** (docs only).
> Update this file with every milestone. Stale status is a bug (Rule 1).

_Last updated: 2026-07-11 — Para Summary module complete. App version 0.11.0._

## Application

| System | State | Notes |
|---|---|---|
| PWA shell (index.html, manifest, icons) | **shipped** | Installable; relative paths → GitHub Pages subpath safe |
| Service worker / offline caching | **shipped** | Two caches: shell (v12) + content (v8), cache-first; content cached on first use as the library grows |
| Design tokens + base styles | **shipped** | Light/dark; system fonts; reading leading + answer-feedback colors added in M2 |
| Hash router | **shipped** | Param routes (`/:id`); 404; modules register their own routes |
| `StorageAdapter` interface | **shipped** | `src/core/storage/storage-adapter.js` |
| IndexedDB adapter | **shipped** | DB `cat-os` v2; stores: settings, attempts, sessions, learning (v2, additive) |
| Backup & Restore (core + Settings UI) | **shipped** | Format v2 (adds learning store); v1 files import cleanly; explicit merge/replace |
| Global error handling | **shipped** | `cat-toast` surface; details to console |
| Shell screens (Home / Practice / Growth / Settings / 404) | **shipped** | Home shows quiet progress; Practice lists modules; Growth is the first extracted shell screen (`src/shell/`) |
| **Personal Reading Mentor** (`core/mentor/`) | **shipped** | Voice (banned-word-linted), Reading DNA (evidence-floored, derived), One Lesson Rule, twenty-second recall with retire-at-3; mentor moment ends every session |
| Growth screen (`/growth`) | **shipped** | How you read · Concepts collected (Fresh→Recalled→Absorbed) · In your own words; no marks anywhere; the notebook's goals, subsumed |
| **Reading Comprehension module** | **shipped** | Journey library → briefing → session (read → answer → explain, with evidence jumps) → result → Learning Page → review |
| **Para Jumbles module** | **shipped (0.10.0)** | Second module island; built to `PARA_JUMBLES_BIBLE.md`. First-time introduction → eight-tier journey (Beginner→Premium) → solve (tap-to-order) → mandatory read-back → four-layer teaching (Bible §11) → mentor moment. TITA scoring (+3/0); Para-Jumbles Reading DNA (`core/mentor/pj-dna.js`, evidence-floored, banned-word-linted); `<cat-jumble-board>` (select-to-order). Sessions/attempts share the RC stores tagged `module:"pj"`; RC untouched |
| **Para Summary module** | **shipped (0.11.0)** | Third module island; built to `PARA SUMMARY BIBLE.md`. First-time introduction (resettable from Settings → Learning) → eight-tier journey (Foundation→Premium, each tier teaching one skill) → Today's Mission → paragraph → **Summary Builder** (write your own sentence, then compare on item-specific checks) → options with the **Think** coach (questions, never hints) → layered teaching (paragraph compresses into the ideal summary; every distractor's §7 archetype and §6 thinking pattern named; richness grows with tier) → mentor moment. +3/0 CAT-style marks; Para-Summary Reading DNA (`core/mentor/ps-dna.js`, family-aggregated, evidence-floored, banned-word-linted). Sessions/attempts share the same stores tagged `module:"ps"`; RC and PJ untouched |
| Reading surface (0.6.0) | **shipped** | Book measure, paragraph rhythm token, sticky veiled session bar, scroll progress + "~N min left", end-mark, hyphenation on narrow screens |
| Learning Page (Passage Mentor) | **shipped** | `/rc/mentor/:id`; **v4 Learning Page** — one-sentence summary, plain-English retelling, why-it-was-hard, the reading lesson, reflection question — layered over v3 mentor content; self-drawing theme illustration per passage; recall-before-reveal; pull-quote takeaway |
| Reading reflection | **shipped** | Optional per-passage line, sentence starters, saved to the `learning` store, editable; covered by backup |
| Explanations as reading lessons | **shipped** | Verdict → expert reasoning + evidence pill → distractor teardown → "Make it a habit" (v3 `reading_habit`) |
| Learning progression (stages + journey) | **shipped** | `core/learning/journey.js`; all five stages populated (8 passages, numeric ladder 2→9); STAGE_INFO voice; recommends with reasons; never locks |
| Reading-size preference | **shipped** | S/M/L/XL, StorageAdapter-persisted, reading surface only |
| Content schema (RC v1) as a file | **shipped** | `content/schema/rc.schema.v1.json` |
| Content loader + schema validator | **shipped** | Dependency-free validator; cross-field consistency checks |
| Practice session engine + scoring | **shipped** | Pure logic; accuracy + clearly-labeled CAT-style marks |
| Review mode | **shipped** | Re-shows the latest attempt with verdicts + full explanations |
| Progress tracking | **shipped (basic)** | Per-session records; Home aggregate. Full mistake notebook + analytics: later |
| Engagement: XP + levels | **shipped** | Derived from sessions; legible rules in `engagement/xp.js` |
| Engagement: streaks (daily/best/quality) | **shipped** | Derived, local-calendar days, humane recovery |
| Engagement: achievements engine | **shipped** | Declarative registry, 11 achievements; unlocks derived, celebrations persisted once |
| Engagement: haptics + sound | **shipped** | Haptics default on (no-op on iOS); sounds default off, synthesized, no assets |
| Engagement: celebration surface | **shipped** | One sheet, milestones only |
| Mistake notebook | **subsumed (0.7.0)** | Deliberately never built as a surface. Its goals ship as the mentor: misses captured (attempts + one lesson/session), resurfaced (twenty-second recall), retired (absorbed after 3 recalls). Attempt-history browser: still designed, V1.x |
| Odd One Out / Vocabulary | designed | V1.x — copy the module pattern; Odd One Out reuses `<cat-jumble-board>` |
| Analytics, spaced repetition, cloud sync | designed | V2.0+ |

## Content system

| System | State | Notes |
|---|---|---|
| Registry (`content/index.json`) | **shipped** | 32 RC + 19 PJ + 20 PS items; type-aware agreement with files (checked by tools/verify.mjs); rebuilt from files by a scripted mirror |
| RC content schema files | **shipped** | v1 + v2 (mentor layer) + v3 (reading_habit per question, misunderstanding per mentor) + **v4 (full Learning Page: one_sentence_summary, simple_explanation, why_difficult, reading_lesson, reflection_question)**; loader resolves per item |
| **PJ content schema file** | **shipped (0.10.0)** | `content/schema/pj.schema.v1.json`; implements PARA_JUMBLES_BIBLE §12 metadata (twelve-axis difficulty vector, macro pattern, cohesion signals, traps, `num_plausible_orderings`, `heuristic_adversarial`), the §11 four-layer explanation, and one reliability-tagged link per consecutive pair. Format carried as configuration, not constant |
| **PS content schema file** | **shipped (0.11.0)** | `content/schema/ps.schema.v1.json`; implements the PARA SUMMARY BIBLE's operational core: apex (claim/scope/certainty/stance) fixed before options (§10), architecture (§2), the eight difficulty dials (§5), load-bearing words, elite `separating_element`, per-distractor §7 archetypes (single distortion; layering elite-only), Summary-Builder checks, missions, and format as configuration. Loader enforces cross-field truths incl. three error families per item and the tier↔bible_level map |
| Content library | **shipped** | 32 RC passages (136 questions; foundation→elite, all 12 genres) + 19 Para Jumbles (all 8 tiers Beginner→Premium, difficulty_numeric 1→10, paragraph-first then scrambled, adversarial from Medium up) + **20 Para Summary items (all 8 tiers Foundation→Premium, 12 genres, 7 architectures with concession-turn capped at 20%, correct positions 5/5/5/5, near-miss finalists with named separating elements at elite)** |
| Verification tool (`tools/verify.mjs`) | **shipped** | Reuses the app's own validators (RC + PJ + PS); type-aware registry agreement, module-graph + precache-coverage (every schema version), journey-progression, backup round-trip, PJ and PS engine/voice/DNA/lesson dry runs, and PS batch-fairness checks (position spread, architecture variety, concession-turn cap); mentor-voice lint covers all three mentors; runs on Windows (pathToFileURL fix); run before every release |
| Content schemas for OOO/Vocab | designed | Author with each module |
| RC master generation prompt | shipped (v1, docs) | See "Decisions" re: passage shape flag |
| Pipeline scaffolding (log, balance dashboard) | designed | Create with the first *generated* (not authored) batch |

## Open owner decisions

1. **License** — still unchosen.
2. **Vision scope** — the docs define an offline, no-runtime-AI personal tool; the
   co-founder framing describes an "AI-powered general personal OS." These will
   conflict once runtime AI (network + paid API) is on the table. Recommended:
   record the docs' identity as canonical for V1–V2 in `MASTER_CONTEXT.md`; treat
   "general OS" as an explicit V3+ re-scoping question. **Unchanged from M1.**
3. **Content provenance** — all thirty-two passages (eight from M2 and the
   earlier milestones, twenty-four from `batch-rc-003` and `batch-rc-004`) are
   ORIGINAL compositions in CAT register (`source.publication: "original"`), not
   adaptations of real essays, because live source URLs can't be verified from the
   build environment and fabricating citations is disallowed. When the real
   pipeline runs, `source` should carry genuine, verified publications/URLs.
   Owner: confirm this policy or supply sourced passages. **Unchanged in policy
   from 0.7.0; both 0.8.0 batches follow it.**

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
