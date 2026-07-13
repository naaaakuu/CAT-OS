# CAT OS

A calm, private, **offline-first Progressive Web App** for preparing the VARC
(Verbal Ability and Reading Comprehension) section of India's Common Admission
Test — built as a personal study environment meant to keep working, untouched,
for years.

**Not** a course, a content marketplace, or a quiz warehouse. One owner, one
device-first workflow, full data ownership.

## Principles (the short version)

- **No build step, ever.** Plain HTML, CSS, and ES modules. Editable from a phone.
- **Content is data, never code.** All passages and questions are JSON in `content/`.
- **Local-first.** Progress lives in IndexedDB on your device and is exportable.
- **Durability over novelty.** Web standards over frameworks; nothing that rots.

## What works today

An installable, fully offline PWA built around a **reading journey**: a
staged library (foundation → developing → intermediate → advanced → elite,
every stage populated) → a pre-reading briefing → a reading surface built
like a good book (book-width serif column, four reading sizes, scroll
progress with minutes-left, a quiet end-mark) → answer question by question
with one-tap jumps to the evidence paragraph → explanations that teach how
an expert reader thinks (verdict, reasoning, distractor teardown, one
reading habit to keep) → a **Learning Page** for every passage (a theme
illustration, what it was actually about, the author's intention, the
paragraph-by-paragraph journey in plain language, why readers misread it,
the traps as advice, vocabulary, one line to keep forever, one real-life
connection) → an optional written reflection, kept on-device → review.
Every session now ends with a **personal mentor moment**: one lesson — the
single most valuable thing this session revealed, taught as why-the-brain-
goes-there rather than what-was-incorrect — with the numbers kept one quiet
tap away. The next session opens with a **twenty-second recall** of a
previous lesson; three successful recalls quietly retire it. A **Growth**
tab shows your Reading DNA (evidence-gated observations about how you
read — growth first, never judgment), the concepts you've collected, and
your own reflections. Every attempt is saved locally.
Alongside Reading Comprehension, three verbal-ability journeys share the
same calm shell, the same mentor voice, and the same local storage:
**Para Jumbles** (rebuild the author's paragraph), **Para Summary** (find
the author's point and protect it), and **Odd One Out** (build the
paragraph, and the sentence that never belonged reveals itself). Each is
an eight-tier journey with its own first-time introduction, a Today's
Mission before every item, a floating Think coach that asks questions
rather than giving hints, layered teaching that names the exact trap,
and one mentor lesson per set.
A fifth journey, **Word DNA**, teaches roots, prefixes, suffixes, foreign
words, and CAT vocabulary through pattern recognition instead of rote
memorising: notice the piece shared by several words, predict its
meaning, reveal it, then apply it to a word never taught at all — the
transfer is the proof of understanding. A browsable **Language Tree**
replaces tiers; a derived **Word Garden** collects every word earned
through a correct transfer; **Today's Discovery** offers one word a day
without being asked. The first content batch is small but complete
end to end; the schema is designed so future batches are pure content,
no code changes. (Word DNA's Home/Practice presence is soft-hidden as of
0.14.0, in favour of the Language Garden below; its routes and data are
untouched.)

A sixth space, the **Language Garden**, is not a journey at all. It is a
small living root grove the learner tends instead of a question type to
practise: no score, no XP, no streak, ever, inside it. The first open
hands straight to a real sentence and a strange word — no tutorial. Six
beats teach one root family by construction (tap a word's parts, watch
them join, then build the meaning of a word nobody taught you), and a
later visit is pure retrieval on the same family. A quiet spacing
scheduler decides, from session history alone, when a plant is ready to
be revisited, and a small vector-art `<cat-plant>` shows exactly what it
knows: Seed, Sprout, Sapling, In leaf, or Evergreen, gold when a review
is welcome, softly bare with buds when it has waited a while — never
red, never "due," never a debt. Currently ships four hand-authored root
families (`content/language-garden/`) over a small shared word substrate
(`content/vocabulary/`) every future garden will reuse.
Progress is motivating without being loud: XP and levels, daily streaks,
achievements, a weekly activity strip, and optional whisper-level haptics and
sound — all derived from your stored sessions, all offline.
Theme (light/dark/system), reading size, feedback toggles, Backup & Restore,
and storage info are in Settings.
The interface follows a complete token-driven design language (see
`src/ui/styles/tokens.css`) with reduced-motion-safe animation throughout.

Ships with 32 reading passages (136 questions) spanning all twelve genres
(philosophy, economics, science, sociology, arts-culture, psychology, history,
literature-theory, anthropology, political-theory, technology-ethics,
environment), staged foundation→elite so the first passage never overwhelms.
Each passage carries a full Learning Page — a plain-English retelling, the one
reading habit it builds, and a question to sit with. See `STATUS.md` for the
precise shipped/designed breakdown and `CHANGELOG.md` for history.

## Running it

There is nothing to install or compile.

- **Hosted:** push to any static host (GitHub Pages, Netlify, Vercel). All paths
  are relative, so a GitHub Pages subpath works as-is.
- **Local:** serve the folder with any static server (a service worker requires
  http(s), so opening `index.html` directly from disk won't register offline
  support): `python3 -m http.server` then open `http://localhost:8000`.
- **Install on iPhone:** open the hosted URL in Safari → Share → *Add to Home
  Screen*. It launches full-screen and works offline (open it once online so the
  shell and passages cache; then it runs on a flight).

## Verifying the repository

Run the self-check with plain Node (no dependencies):

```sh
node tools/verify.mjs
```

It reuses the app's own validator to confirm every passage is schema-valid and
consistent, the registry matches the files (including journey ordering
fields), the service worker precaches everything on disk, **every module
reachable from `app.js` exists and is precached** (so offline can't break
silently), the learning journey covers every stage and starts gently, the
engine behaves, and backups round-trip. Exit 0 = repository is consistent.
Run it before every release.

## Repository map

| Path | What it is |
|---|---|
| `index.html`, `manifest.webmanifest`, `service-worker.js` | The PWA shell |
| `src/core/` | Logic with no UI: storage adapter, router, content loader + validator, session engine, scoring, engagement, learning journey, the reading mentor (`core/mentor/`), utils |
| `src/shell/` | Extracted shell screens (Growth); app.js still hosts the rest |
| `src/ui/` | Design tokens, base styles, reusable Web Components |
| `src/modules/` | The five VARC modules: `reading-comprehension/`, `para-jumbles/`, `para-summary/`, `odd-one-out/`, `word-dna/` (each: browser / session / learn, plus its own logic), plus the sixth, differently-shaped `language-garden/` (grove / plant / session / journal, no score anywhere) |
| `content/schema/` | Versioned JSON schemas (`rc.schema.v1–v4`, `pj/ps/ooo/wd/vocab/lg.schema.v1`; appended, never edited) |
| `content/` | Content as JSON by type (`reading-comprehension/`, `para-jumbles/`, `para-summary/`, `odd-one-out/`, `word-dna/`, `vocabulary/`, `language-garden/`); `content/index.json` is the registry |
| `tools/verify.mjs` | Offline repository self-check |
| The documentation corpus | The project's permanent memory — **read `AI_OPERATING_MANUAL.md` first**, then `MASTER_CONTEXT.md` |
| `STATUS.md` | What actually exists right now (designed / building / shipped) |
| `CHANGELOG.md` | What changed, when, and why |

## Working on CAT OS

Every rule that keeps this project maintainable lives in `PROJECT_RULES.md`.
The non-negotiables: no build step; content never hardcoded; storage only
through the `StorageAdapter`; modules never import each other; stable IDs
forever; docs updated with every structural change.

Adding another module: copy an existing module's shape (e.g.
`src/modules/word-dna/`), write its screens against the shared `src/ui/`
components, register it in `src/app.js`, and add its files to the
service worker's precache list. No existing module changes.

## Status & license

Current state is always in `STATUS.md`. License: not yet chosen (owner
decision pending).
