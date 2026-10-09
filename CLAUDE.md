# CAT OS

Offline-first, no-build PWA for CAT VARC prep, presented as a painted village where eight pet friends (one per subject) grow as the learner answers real CAT questions. Vanilla JS ES modules, IndexedDB, static JSON content. Current app version: `APP_VERSION` in `src/app.js`.

## How to work here (read this first, then stop reading)

1. Find your task in the router below. Read **only** the files it lists.
2. Do not read `docs/history/`, `KNOWLEDGE/_archive/`, `content/**/*.json`, `assets/`, or the whole of any big file. `Read` with `offset/limit`; `Grep` with a path, never the repo root against `content/`.
3. After a change, update only the one doc section that owns that fact (table below), and add a short entry at the top of `docs/history/CHANGELOG.md` (Read `limit: 15` to match the format).
4. Standing owner rules: judge the real app, not the code; presentation-only requests stay presentation-only; ≤2 agents at once; commit and push to `origin/main` when work is done; no em dashes in anything a learner reads.

## Task router

| Task | Read | Code |
|---|---|---|
| Village screen, friend cards, walking, visits, motion, sprites | `docs/ARCHITECTURE.md` §Village, `docs/DEV-NOTES.md` §Village | `src/home/*`, `src/pets/paths.js`, `src/pets/visits.js`, `src/pets/sprite.js`, `src/pets/pets.js` |
| Glow, levels, growth stages, ages, achievements | §Economy | `src/pets/glow.js`, `economy.js`, `progress.js`, `pets.js` |
| A learning room (RC, PJ, PS, OOO, Word DNA, bank, Rootwood) | §Rooms | `src/modules/<room>/`, `src/core/engine/*-session.js`, `src/world/screens/` |
| What to show next, ledgers, mentor voice, noticing | §Learning core | `src/core/learning/*`, `src/world/curator.js` |
| What content exists: topics, gaps, balance, what a passage is about | `content/CATALOGUE.md` (generated gist, one line per item; grep a genre or a `## type` section, never open the JSON) + `node tools/qc-corpus.mjs` | `tools/build-index.mjs` (writes it) |
| Add or change content (passages, items, words) | `content/taxonomy/AUTHORING.md`, `docs/DEV-NOTES.md` §Content | `tools/check-content.mjs`, `build-index.mjs` |
| Content generation prompts and module Bibles | `KNOWLEDGE/README.md` | (outside the repo's `cat-os/`) |
| Colour, theme, CSS, dialogs, a11y | §UI | `src/ui/styles/world.css` (palette owner), `src/ui/modal.js` |
| Service worker, precache, offline, versioning | §Shipping | `service-worker.js`, `tools/build-precache.mjs` |
| Android app, ads, Pro, Play release | §Shipping (The Android app), `docs/DEV-NOTES.md` §Shipping | `android/`, `src/core/native.js`, `src/core/ads/rewarded.js`, `src/shell/pro.js`, `src/shell/online-gate.js`, `tools/check-app-shell.mjs` |
| Storage, backup, Start over, settings | §Storage | `src/core/storage/*`, `src/shell/settings.js` |
| Tests, gates, driving a real browser | §Gates, `docs/DEV-NOTES.md` §Browser | `tools/verify.mjs`, `tools/cdp-lite.mjs` |
| Product intent, copy, UX judgement | `docs/PRODUCT.md` | |
| "Why was X done / what happened in version Y" | `docs/history/CHANGELOG.md` (grep the heading) | |

## Rules that must not be broken

- No build step, bundler, framework, npm dependency or runtime CDN.
- Content is data (JSON in `content/`, registered in `content/index.json`, validated by versioned schemas; schemas are appended, never edited). IDs are stable forever.
- Storage only through `StorageAdapter`. The village, Glow, stages and levels are **derived from records, never stored**.
- Modules never import each other's screens; the village composes their pure logic.
- Glow pays learning only, never time (details in `docs/DEV-NOTES.md`).
- After touching any precached file (anything under `src/`, `index.html`, `content/` lists) run `node tools/build-precache.mjs`; `verify.mjs` §25 fails otherwise.
- Many files are CRLF. Patch with the Edit tool; never with a bash heredoc or a JS template literal in bash.

## Commands

- Serve: `npx serve .` (any static server; a service worker needs http). No install step.
- Check: `node tools/verify.mjs` (30 sections, several drive real Chrome, takes more than 10 min: use `run_in_background`). Release check: `CATOS_FULL=1 node tools/verify.mjs`.
- Content: `node tools/check-content.mjs <file|dir>` then `node tools/build-index.mjs && node tools/build-manifest.mjs`.
- Android: `node tools/check-app-shell.mjs` (the app's web side with a fake bridge); release AAB per `docs/DEV-NOTES.md` §Shipping.
- Pin the hour while looking: `localStorage.setItem('catos:hour','night')` (dawn, morning, afternoon, dusk, night).

## Where facts live (one fact, one place)

| Fact | Owner |
|---|---|
| Structure, subsystems, data flow | `docs/ARCHITECTURE.md` |
| Hard-won constraints, gotchas, open items | `docs/DEV-NOTES.md` |
| What the game is for a learner | `docs/PRODUCT.md` |
| What changed when | `docs/history/CHANGELOG.md` (opt-in) |
| Content authoring contract / taxonomy | `content/taxonomy/AUTHORING.md`, `varc-taxonomy.json` |
| Old comments citing `STATUS.md` or `ROADMAP_V2` | now `docs/history/` (historical only) |
