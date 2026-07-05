# ROADMAP_V2.md

**The master roadmap for CAT OS, from release 0.4.0 to Version 2.0.**

Status: adopted. This document supersedes the version mapping in
`PROJECT_ROADMAP.md`. Recommended follow-up (not yet made, to avoid touching
existing files in this milestone): add one line at the top of
`PROJECT_ROADMAP.md` pointing here. Authority: below `MASTER_CONTEXT.md` and
`PROJECT_RULES.md`, above all implementation choices.

Audience: the owner, and any future AI session doing planning work.
Calibration: one solo developer, building primarily with AI assistance, in
sessions rather than sprints. Every estimate in this document is a rough
range in focused sessions (a session being one sitting of concentrated work);
treat them as planning aids, not commitments.

---

## 1. Current Project Assessment (at 0.4.0)

**Maturity: a real, working product with a thin content spine.** The
application is genuinely shippable: an installable offline PWA with a complete
RC practice loop (read, answer, learn why, review), persistence through a
clean storage abstraction, backup and restore, a full design language, and a
derived engagement system. Verification tooling exists and is green.

**Strengths worth protecting**

The architecture has earned trust in four places. The `StorageAdapter`
boundary means cloud sync is an adapter away, not a rewrite. The
content-as-data discipline with versioned schemas and a registry means the
content library can grow without touching code. The derived-first pattern
(`engagement/stats.js` as the single aggregation point) means statistics can
never disagree with stored truth and never need migration. And the module
island pattern was proven by RC: the next four modules have a template, not a
research project.

**Weaknesses, stated plainly**

1. **The content library is the product, and it is five passages.** Twenty
   one questions is a demo, not a preparation tool. This is the binding
   constraint on daily-use value, ahead of any feature.
2. **All five passages are self-authored and owner-unreviewed.** The quality
   scores in the registry are self-assessed. Until the owner practices them
   and judges them, the pipeline rubric is uncalibrated.
3. **The mistake notebook does not exist yet**, and the blueprint calls it
   the soul of the product. Attempts data is being collected but not yet
   turned into learning.
4. **Testing is thin.** `tools/verify.mjs` plus jsdom smoke tests cover logic
   and rendering shape, but nothing exercises real IndexedDB, a real service
   worker, or a real iPhone. Releases so far have never been installed on the
   actual target device by the actual owner, as far as the repository records.
5. **Growth pressure on two files.** `app.js` now wires routing, theme,
   feedback, and renders three shell screens; component styles are split
   between `components.css` and per-component `<style>` blocks with aliases
   bridging them. Acceptable today, debt at ten modules.

**Missing systems** (all designed, none built): mistake notebook, the four
remaining VARC modules, analytics, spaced repetition, adaptive practice,
configurable goals, mock mode, cloud sync, content pipeline operations
(balance dashboard, batch log, CI validation), owner review workflow.

**Technical debt register**

| Item | Severity | Pay down |
|---|---|---|
| Owner review of shipped content pending | High | 0.5.0 gate |
| No CI; verification is manual | Medium | 0.9.0 |
| `app.js` accumulating screen code | Medium | 0.6.0 (extract shell screens) |
| Token aliases bridging M2 styles | Low | opportunistic |
| License undecided | Low but overdue | 1.0 gate |
| Docs corpus vs repo drift risk | Medium | every release, STATUS.md discipline |

**Risks**

The dominant risk is not technical. It is **content authoring throughput**:
every module needs a schema, a prompt, and a reviewed batch, and review time
is owner time that cannot be delegated to AI. Second: **solo-developer
abandonment**, mitigated by the documentation discipline that already exists
(any future session can resume from STATUS.md). Third: **quiet breakage on
iOS** (service worker eviction, storage quotas, mute-switch behavior), which
only real-device testing catches. Fourth: **scope drift toward the "general
OS" idea** before the study tool is finished; section 8 resolves this.

---

## 2. Product Vision

**By Version 2.0, CAT OS is the finest personal VARC preparation environment
that exists for one person:** every question type practiced daily, every
mistake captured, explained, resurfaced at the right moment, and eventually
retired as learned; progress visible without noise; usable on a phone, on a
flight, for years, with data the owner can hold in one exported file.

**What never changes**

1. Offline first. The core loop never requires a network.
2. The owner's data belongs to the owner, exportable in full, always.
3. No build step. The repository runs as it is checked out.
4. Content is data. No question ever lives in code.
5. Calm. Information over judgment; motivation without manipulation.
6. One person's tool. No accounts, no social features, no audience.

**Decision principles for everything below**

Prefer deriving over storing. Prefer extending a schema over migrating a
database. Prefer one excellent module over two adequate ones. Prefer the
mistake loop over new content types when they compete. And when a feature
cannot be explained in one sentence to a tired student on a train, it does
not ship.

---

## 3. Complete Version Roadmap

Numbering continues the existing release line. Capability labels from the
original roadmap map as follows: 1.0 here equals the original "V1.0 complete
plus V1.x learning loop begun"; the original V2.0 goals land across 1.1 to
2.0 here.

### 0.5.0 — The Mistake Notebook

**Objective:** turn stored attempts into the learning loop the blueprint
calls the soul of the product.
**Features:** a Mistakes screen listing every wrongly answered question with
its passage context, explanation, and trap type; per-mistake status (open,
understood, retired) persisted as lightweight records; re-attempt a mistaken
question in isolation; entry points from dashboard and review.
**Why here:** highest learning value per unit of effort; consumes data
already collected; blocks spaced repetition (1.2) and adaptive practice
(1.3), so it must come early.
**Dependencies:** attempts store (exists), content loader (exists).
**Complexity:** medium. **Effort:** roughly 3 to 5 sessions.
**Risks:** status records introduce the first non-derived learning state;
keep the record shape minimal (`{id, question_id, status, updated_at}`) so
it never needs migration.
**Done when:** a wrong answer automatically appears in the notebook, can be
re-attempted and marked understood, survives backup and restore, and
verify.mjs covers the status transitions. **Gate:** owner has practiced and
reviewed all five shipped passages; rubric calibration notes recorded.

### 0.6.0 — Para Summary module

**Objective:** prove the module pattern generalizes, on the simplest new
type.
**Features:** `ps.schema.v1.json`; PS generation prompt v1 (paragraph array
shape, per the recorded M2 decision); a starter batch of 8 to 10 reviewed
items; `src/modules/para-summary/` following the RC shape; shell screens
extracted from `app.js` into `src/shell/` while touching it anyway.
**Why here:** PS reuses the option/explanation interaction wholesale;
smallest step from RC.
**Dependencies:** RC pattern (exists), pipeline prompt work (owner review).
**Complexity:** low to medium. **Effort:** 4 to 6 sessions, half of it
content.
**Risks:** second module is where hidden RC-specific assumptions surface in
"shared" components; budget one session for extraction fixes.
**Done when:** PS practicable end to end offline; mistakes flow into the
notebook; module added by registration only, no RC file modified.

### 0.7.0 — Para Jumbles and Odd One Out

**Objective:** cover the ordering family of VARC questions.
**Features:** one shared arrangement interaction (select-to-order on
mobile, not drag-and-drop, for reliability and accessibility); PJ and OOO
schemas and prompts; starter batches; two thin modules over the shared
interaction.
**Why together:** they share the interaction and the sentence-set content
shape; building them apart would duplicate exactly what modules must not
duplicate.
**Dependencies:** 0.6.0's extraction work.
**Complexity:** medium (new interaction). **Effort:** 5 to 8 sessions.
**Risks:** ordering UX on small screens; prototype the interaction first.
**Done when:** both types practicable offline with explanations of correct
order logic; notebook integration; interaction passes keyboard-only use.

### 0.8.0 — Vocabulary

**Objective:** activate the vocabulary data already shipping inside every
passage.
**Features:** vocab practice drawn from the `vocabulary` arrays of studied
passages (recognition and usage-in-context formats); vocabulary achievements
(finally, honestly derivable); a word list view.
**Why here:** content cost is near zero because passages already carry it;
it deepens rereading of studied passages, which serves retention.
**Dependencies:** content corpus from 0.5 through 0.7 for word volume.
**Complexity:** low to medium. **Effort:** 3 to 5 sessions.
**Done when:** words from any studied passage are practicable; the deferred
Vocabulary Explorer achievement ships against real interaction data.

### 0.9.0 — Content at scale, pipeline operational

**Objective:** shift the binding constraint from authoring mechanics to
review throughput.
**Features:** GitHub Action running `tools/verify.mjs` on every push; an
in-app developer page rendering registry balance (genre, difficulty, type)
from `content/index.json`; `PIPELINE_LOG.md` and batch cadence begun; the
content service worker cache moved to cache-on-demand with a "download all"
control as the library passes roughly 50 items; library target 60 to 100
reviewed items across all five types.
**Why here:** the four module milestones establish what "balanced" means;
operations before scale is ceremony, scale before operations is chaos.
**Complexity:** low code, high content. **Effort:** 2 to 3 sessions of
code; content sessions ongoing and owner-paced.
**Risks:** review fatigue; mitigate with fixed small batches (pipeline rule
of 5 or 10) and the log.
**Done when:** CI is green on main; balance is visible without manual
tallying; a month of batch cadence is recorded.

### 1.0 — The complete daily VARC tool

**Objective:** hardening, honesty, and a version worth the number.
**Features:** full on-device QA pass (install, airplane mode, storage
pressure, backup restore round-trip on the owner's iPhone); LICENSE decided;
docs consolidation pass (STATUS, README, corpus cross-references); accuracy
review of every user-facing claim (the marks disclaimer, streak wording);
performance pass on list rendering at 100+ items; tag v1.0.
**Complexity:** low. **Effort:** 2 to 4 sessions.
**Done when:** the owner would hand this to a fellow aspirant without
apology, and everything in STATUS.md marked shipped has been exercised on
real hardware.

### 1.1 — Analytics

**Objective:** turn accumulated attempts into insight, derived-first.
**Features:** per-question-type accuracy and time; per-genre and
per-difficulty breakdowns; trap-type analysis (which distractor patterns
catch the user, powered by the trap_type data shipped since M2); trend over
time; all computed through the `stats.js` aggregation pattern, no stored
aggregates.
**Dependencies:** volume from 0.9/1.0 usage; trap_type data (exists).
**Complexity:** medium. **Effort:** 4 to 6 sessions.
**Risks:** insight without volume is noise; gate charts behind minimum
sample sizes and say so in the UI.
**Done when:** the user can answer "what kind of question loses me marks"
from data, with sample-size honesty built in.

### 1.2 — Spaced repetition and the review engine

**Objective:** mistakes resurface at the right moment instead of on demand.
**Features:** a scheduling layer over notebook items (a simple, legible
interval scheme; publishable in one sentence, tunable later); a daily review
queue blending due mistakes and due vocabulary; configurable daily goal
replacing the fixed one-session goal.
**Dependencies:** notebook (0.5.0), vocabulary (0.8.0), analytics helpers.
**Complexity:** medium. **Effort:** 4 to 6 sessions.
**Risks:** over-clever scheduling; start with fixed graduated intervals and
resist algorithmic vanity.
**Done when:** opening the app on any day produces a finite, honest queue,
and completing it feels like completion.

### 1.3 — Adaptive practice

**Objective:** recommendations, not automation: the app suggests what to
practice next from analytics, and the user always sees why.
**Features:** a "recommended next" slot on the dashboard driven by weakest
type, stale genres, and due reviews; explanation strings attached to every
recommendation.
**Dependencies:** 1.1 and 1.2.
**Complexity:** medium. **Effort:** 3 to 4 sessions.
**Done when:** recommendations are explainable in the UI and dismissible
without penalty.

### 1.4 — Sectional mock mode

**Objective:** exam-condition practice.
**Features:** timed mixed sets composed from the library (approximating the
real section's shape; exact composition verified against the current year's
official pattern at build time, since the pattern changes across years and
must not be hardcoded from memory); a section-level result and review.
**Complexity:** medium. **Effort:** 4 to 6 sessions.
**Done when:** a full timed section runs offline, and its attempts flow into
the same notebook and analytics as everything else.

### 2.0 — Cloud sync and the second device

**Objective:** the same data on iPhone and laptop, with local-first intact.
**Features:** a `CloudStorageAdapter` implementing the existing interface
against one simple backed service (evaluated at build time; candidates
include any key-value or file store the owner already trusts); opt-in,
off by default; last-write-wins per record with export-before-first-sync as
the safety rail; sync status surfaced honestly in Settings.
**Dependencies:** everything above; the adapter seam from M1.
**Complexity:** high (the only genuinely hard engineering left).
**Effort:** 8 to 12 sessions including failure-mode testing.
**Risks:** conflict handling and silent data loss; mitigations are the
per-record LWW policy, mandatory pre-sync export, and a reconciliation log.
**Done when:** two devices converge after offline divergence in testing,
and pulling the plug mid-sync corrupts nothing.

---

## 4. Feature Dependency Graph

```
StorageAdapter (M1)
 ├── everything below
Content schema/loader (M2) ──┬── RC (M2) ──┬── Mistake Notebook (0.5)
                             │             │      ├── Spaced Repetition (1.2) ──┐
                             │             │      └── re-attempt flow           │
                             ├── PS (0.6)  │                                    │
                             ├── PJ/OOO (0.7) [shared arrangement interaction]  │
                             └── Vocabulary (0.8) ── review queue (1.2)         │
Attempts/Sessions stores (M2) ── stats.js (M4) ── Analytics (1.1) ── Adaptive (1.3)
trap_type content data (M2) ─────────────────────────┘                          │
Content ops + CI (0.9) ── library scale ── Mock mode (1.4)                      │
All learning state local ──────────────────────────── CloudStorageAdapter (2.0) ┘
```

**Order rationale:** the notebook precedes every intelligence feature because
repetition, analytics, and adaptivity all consume mistake state. Modules
precede scale operations because balance targets need all types to exist.
Sync comes last because every store and record shape must be stable before
two devices share them.

**Mistakes this graph prevents:** building spaced repetition before the
notebook (nothing to schedule); building adaptive before analytics (nothing
to explain recommendations with); building sync before 1.x (every new store
after sync ships doubles conflict surface); hardcoding this year's exam
pattern into mock mode.

---

## 5. Technical Evolution

**Storage.** IndexedDB stays. Two additive DB version bumps are anticipated:
v2 adding a `learning` store for notebook/scheduling records (0.5.0), and v3
adding indexes on `attempts.passage_id` and `attempts.answered_at` when
analytics queries need them (1.1). Never rename, never drop. The backup
format gains stores additively and keeps importing every older version.

**Performance.** The honest expectation: this app is small, and the main
risks are list length and content cache size, not computation. Paginate or
window lists past roughly 100 rows; move content caching to on-demand at
0.9.0; keep animations compositor-only as established in M3.

**Offline.** The two-cache service worker pattern holds through 2.0. Sync in
2.0 is a data feature, not a network dependency: the app must remain fully
usable with sync failing forever.

**AI integration.** See section 8. Architecturally: nothing in `src/` may
import anything network-dependent for core function through 2.0.

**Content system.** One schema family per type, versions appended never
edited; prompts versioned beside schemas; the registry remains the single
index; CI validation from 0.9.0 makes malformed content unmergeable.

**Deployment.** GitHub Pages remains the target; relative-path discipline is
permanent. A release checklist lives in this repo from 1.0: bump versions
(app, cache, changelog), run verify, on-device pass, tag.

**Testing.** `tools/verify.mjs` grows into `tools/tests/` when it passes
roughly 400 lines: content validation, pure-logic tests, and jsdom component
tests as separate files under one runner, still plain Node, still
dependency-free except jsdom as a dev-only convenience that the app never
sees. On-device manual passes are a release gate from 1.0, because no
simulator honestly reproduces iOS storage and service worker behavior.

**Security and privacy.** The model is simplicity: no accounts, no
telemetry, no third-party requests, ever. Two obligations grow with sync:
backup files and synced data contain personal study history, so 2.0 must
document where synced data lives and default to off. Content JSON is
rendered escaped (established M2); that rule is permanent.

**Maintainability.** The shell-screen extraction (0.6.0) keeps `app.js` a
wiring layer. Style aliases retire opportunistically. STATUS.md remains the
resume-from-here file; any milestone that ships without updating it is
incomplete by definition.

---

## 6. Learning System Evolution

**RC** is feature-complete as an interaction; its evolution is content
volume, then analytics depth (trap-type insight), then presence in mock
mode. **Para Summary** ships at 0.6.0 reusing the option interaction.
**Para Jumbles** and **Odd One Out** share one arrangement interaction at
0.7.0. **Vocabulary** activates data already shipped (0.8.0) and feeds the
review queue.

The **Mistake Notebook** (0.5.0) is the spine: every module writes to it,
spaced repetition schedules from it, analytics reads it, adaptivity
recommends from it. Its lifecycle is deliberately human: open, understood,
retired, with retirement earned by correct re-attempts over time (1.2), not
by a single lucky answer.

**Analytics** (1.1) stays derived and sample-size honest. **Spaced
repetition** (1.2) starts with legible fixed intervals. **Adaptive
practice** (1.3) is a recommender with reasons, never an autopilot.
**Daily goals** evolve from the fixed one-session goal (M4) to configurable
targets (1.2) without ever becoming punitive; a missed day changes numbers,
not tone. The **review engine** (1.2) is the daily front door: due mistakes,
due words, one suggested fresh piece.

---

## 7. Product Experience Evolution

The feeling to preserve is the one already built: a calm desk. Growth must
add depth, not surface. Concretely: the bottom navigation never exceeds
five items through 2.0 (Home, Practice, Review, Progress, Settings is the
anticipated end state). New modules appear inside Practice, not as new
chrome. The dashboard may reorder but never lengthen past one comfortable
phone scroll. Celebration stays reserved for real milestones; sounds stay
opt-in; nothing ever counts down at the user except mock mode, by explicit
choice.

Never sacrificed: reading typography, offline completeness, data export,
the one-sentence explainability of any number on screen, and the absence of
manipulation. If a proposed feature needs a red badge to succeed, it fails.

---

## 8. AI Strategy

This section resolves the vision question that has been open in STATUS.md
since Milestone 1, as a formal recommendation to the owner.

**Tier 1: AI for development.** Continue exactly as practiced: AI as
architect, implementer, and reviewer, governed by the docs corpus and the
verify tooling. The repository is structured so any AI session can resume
cold; that property is a permanent requirement.

**Tier 2: AI for content generation.** AI drafts, the owner judges. The
prompt library grows one versioned prompt per content type; the rubric and
acceptance checklists remain the quality gate; provenance stays honest
(original compositions marked as such; real sources verified before cited).
No AI-generated item reaches `content/` without passing validation and owner
review. This tier is where AI leverage compounds most for a solo builder.

**Tier 3: AI inside the product.** **None through 2.0.** The core loop
remains offline forever: practicing, explanations, the notebook, review,
analytics, and mocks must never require a network or an API key. The
"general intelligent personal OS" framing is recorded as a V3-era question,
to be reconsidered only after 2.0 ships, and even then only as an optional,
clearly separated layer (for example, on-demand explanation elaboration)
that degrades to nothing when offline. Rationale: runtime AI would break
three invariants at once (offline-first, zero ongoing cost, no third-party
data flow) and the product's value through 2.0 comes from content quality
and the mistake loop, not from generation at runtime.

**Offline forever:** everything the user does daily. That sentence is the
whole policy.

---

## 9. Technical Rules (permanent)

The following consolidate rules already recorded across PROJECT_RULES.md and
STATUS.md decisions, plus this roadmap's additions. They bind every future
version.

1. No build step, no npm in the application, no CDN at runtime. Dev-only
   Node tooling is permitted under `tools/`.
2. Content is data in `content/`, schema-validated at the boundary, IDs
   stable forever, schema versions appended never edited.
3. All persistence through `StorageAdapter`. Object stores are added, never
   renamed or dropped. Every store addition updates backup import/export in
   the same release.
4. Modules are islands: register through `app.js`, import only `core/` and
   `ui/`, never each other. Shared needs move down a layer.
5. Derived over stored for anything computable from events; single
   aggregation points for any number shown twice.
6. All paths relative. GitHub Pages subpath compatibility is a test case,
   not an aspiration.
7. Every release: verify green, CHANGELOG entry, STATUS.md updated, cache
   versions bumped when precached files change, APP_VERSION in step.
8. Docs live where the docs corpus says; stale STATUS is a bug; decisions
   are recorded where they are made.
9. Accessibility floor: keyboard operability, visible focus, reduced-motion
   safety, labeled controls. Regressions block release.
10. Honesty in the UI: no invented sources, no unverifiable claims about the
    exam, sample-size caveats on statistics, and disclaimers where behavior
    (like iOS audio) cannot be guaranteed.

---

## 10. Final CTO Review

Reviewing the above as if maintaining it for ten years:

**Cut, deliberately, from all plans through 2.0:** user accounts, social or
leaderboard features, native app wrappers, notification systems, runtime AI,
a web backend of our own, theming beyond light/dark, and any second exam
domain. Each would multiply surface area against the same one pair of hands.

**Simplified during this review:** PJ and OOO were merged into one milestone
around one shared interaction (they were separate); analytics was moved
after 1.0 (insight needs usage volume that only a hardened daily tool
generates); adaptive practice was reduced from an engine to an explainable
recommender; and mock mode's exam-pattern details were explicitly deferred
to build-time verification rather than written here, because the section's
composition varies by year and this document must not enshrine a stale fact.

**Assumptions challenged.** First: that engagement drives retention. It
helps, but for a solo user the honest driver is whether tomorrow's session
makes yesterday's mistake less likely; hence the notebook leads the roadmap.
Second: that more modules equal more value. Value concentrates in RC plus
the mistake loop; modules 0.6 through 0.8 are sized small accordingly.
Third: that estimates mean much. They are ranges from one AI's judgment
about one person's unmeasured pace; re-estimate after 0.5.0 ships and record
actuals in STATUS.md, because one real data point beats this whole table.

**The single sentence to steer by:** grow the library, close the mistake
loop, harden on real hardware, and only then teach the app to think about
the data; everything else is decoration.

---

*Maintenance: revisit this document at every x.0 release and whenever a
milestone's actual effort diverges from its estimate by more than double.
Record revisions in CHANGELOG.md.*
