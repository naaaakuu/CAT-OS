# Dev notes (durable constraints; no diary)

## Economy and growth
- Glow (`pets/glow.js`): 1 per question answered, +1 right, +2 whole set, 6 per growth stage, 10 for today's three, fire = min(5, run of days) on a day that earned. Time never pays; answers under 1000 ms and skips pay 0; each question pays once per local day. Levels: 0,15,36,63,99,144,198,264,342,435 then +108.
- 0-3 stars survive only as run feedback and mood weight (0.4+0.2*stars). New rewards/achievements/decor read `derivePets().glow/.sources`, never stars.
- Stages: `stageOf(done,total)`; stage 1 = first right answer, 10 = every question of the subject. Ages (`pets.js AGES/ageOf`): Baby 0-2, Growing up 3-6, Grown up 7-10. New growth visuals key off `ageOf(stage)`, never a new counter. A new village is six babies; Settings has Start over (asked twice; clears stores + local/sessionStorage).
- Items inside a level are dealt per learner (`core/learning/order.js byLearner`, seed `catos:order-seed`; Node uses a fixed seed). Never hard-code a fixed first item.
- Growth cards/parties show only after a run (`checkParties(true)`); any other arrival stores `catos:stages` silently, else a restored backup pops a focus-trapping modal.
- Houses order in `HOUSES` is deliberate (as CAT weights sections); do not reorder it to match a request's list.

## Village and UI
- Friend card order: hero, name, "Teaches X", mood, the single Help CTA, level bar, "More ways to practice", Achievements button (lore lives in a native `popover`). Presentation tweaks must not touch `economy.js` math.
- Never name a CSS class `.now` (world.css `.now` is a fixed bottom bar) or `.cw-glow` (lamp halo; the Glow icon is `cw-orb`). Use `is-now`/`is-on`.
- `.run` screens scroll `.run__body`, not `window`; `window.scrollTo` is a no-op inside them. Wide (>=64rem) RC splits passage|question, `<details class="reread">` forced open.
- Colour: only `world.css` declares `--g-*`; a token declared in two sheets breaks one theme. `justify-content:center` on an overflowing scroll container makes the top unreachable. `translate` animations fight `translate` positioning: position with `transform`. `.x{display:grid}` beats `[hidden]`. A CSS custom-property `url()` resolves against the stylesheet, not the element.
- Living painting: a patch is the painting's own pixels (identical at rest); a moving cut must extend past its edge by more than it moves or the static copy ghosts; baked feathered alpha, not CSS masks (36 masks halved frame rate on Intel HD 520); halos use plain alpha, not blend modes. Measure with 600-frame rAF windows.
- Every running CSS animation is restyled on every frame the page draws (composited or not), so the loop's rAF makes them cost: pause what is off screen (`[data-off]`), animate lamp halos only after dusk, and never add per-house CSS animations; draw moving house things on the scene canvas. Headless Chrome is GPU-bound (SwiftShader): compare cost per frame (trace FireAnimationFrame + UpdateLayoutTree per rAF), not fps. Block the service worker while measuring.
- The grown painting (`houses.js bakeVillage`) replaces what `.cw-art` shows; anything cut from the painting (motion atlas, water) must take its pixels from the graded copy or it shows as a brighter patch. HTML subject plates sit over the painting: keep house features clear of `SIGNS` boxes.
- Pet off screen: life.js skips its style writes (a phone sees a third of the map). Text on the canvas goes through `glyphSprite` (per-frame fillText was the top hot spot).
- Dialogs go through `ui/modal.js` (pass `returnTo`; iOS taps do not focus buttons). The village onboarding awaits taps inside `render()`, so "render returned" is not "screen ready".
- A friend's panTo started inside a tap's pointerdown is cancelled by the viewport's handler; defer 30 ms.
- Voices: `SIGNATURE` (pets.js) per friend, played by `world/audio.js signature()`: a tone-built call per friend (`CALLS`: Chai's owl hoot, Toffee's crackle, etc.); only Mochi still speaks its name (Web Speech, blip fallback). No other friend uses a speech engine. Friend lines: 96 chars max (arrive/arriveNight 32, cheer 30: they sit in a 2 second bubble), no em dashes, none of the mentor's banned words, every line unique, and a floor per kind so a daily visitor keeps hearing new ones (`check-pets`). Idle and arrival bubbles are dealt by `dealLine` as a shuffled deck kept on the device (`catos:heard`), so a line does not return until the friend has said them all; add lines freely, never reorder to "fix" a repeat.

## Learning core
- `noticing.js` returns nothing when nothing true can be said; do not force it to speak.
- Drafts (all six engines): `restore()` re-marks every choice against the item, declines unless `sameSet`, stores `elapsed_ms` not `started_at`, clear the draft only after the record is saved. A passage id is `meta.id`, use `passageId(p)`.
- Skill ledger revisit days `[3,3,7,14,30]`; `dueSkills()` sits between weak and new in `nextSkill()`.
- Mentor voice lint bans "wrong/weak/mistake/failure/bad/poor/careless" in `voice.js` strings.

## Content
- Pipeline: write files → `check-content` → `build-index` + `build-manifest` → `qc-corpus` / `option-tells` → `verify`. Authoring contract: `content/taxonomy/AUTHORING.md`.
- `content/CATALOGUE.md` is the corpus gist (one line per item, written by `build-index`): read or grep it to learn what exists before writing; keep every new `meta.theme` under 200 characters so the gist line carries the whole idea.
- RC v5: `word_count` counted (+-10%); `estimated_time_min` = reading_time + sum(q)/60 (+-25%); question `patterns` subset of `meta.reasoning_patterns`; explanations never name option letters. `batch_id` must match `batch-rc-NNN`; `meta.skills` uses hyphenated skill names. RC size rule `journey.js STAGE_SIZE`: at most 4 questions, 650 words; Foundation 3 paragraphs / 3 questions / 350 words. Every passage has `mentor.eli10`.
- Sourcing: no Aeon, The Conversation, CAT papers or coaching mocks (copyright). Use originals in CAT register or public domain (author died before ~1956, published before 1931). FITB/grammar are not in CAT.
- Content agents cost ~400k tokens per 6 passages; max 2 agents at a time (4-core machine).
- Placement/completion/arguments run dry fast (SP 62, PC 46, CR 6); `confusable` and `decode` word-bank shelves are empty.
- Batch recipe that worked (October 2026, rc-007 / pc-004 / sp-003): strong model drafts in a compact author format from a brief that names genre, stage, move, voice and seed per item; Sonnet assembles the JSON and mentor blocks and runs `check-content`; then `option-tells` (the key was the longest option in 37% of fresh questions before repair), `rc-style-audit` (tic phrases), a Sonnet blind solve with and without the text (`blind-solve.mjs strip … --no-text`), and `rc-quality-report` rows. Calibration reference: `KNOWLEDGE/01_KNOWLEDGE/CAT PAPER PATTERNS 2020-2025.md`.

## Shipping
- `build-precache.mjs` after any precached change and after every `APP_VERSION` bump (`app.js`). New `src/pets/*.js` files too. `service-worker.js`, `content/index.json`, many src files are CRLF.
- Bump `APP_VERSION`, add a CHANGELOG entry at the top of `docs/history/CHANGELOG.md`, commit, push `origin/main`.

## Browser verification (no npm, no Playwright)
- `tools/cdp-lite.mjs`: `findChrome`, `serveRepo` (async), `launchChrome`, `open`, `shot`, `send`, `close`. Bypasses the service worker and reloads with ignoreCache on purpose, so offline tests need that turned off for that leg. `open()` = navigate + reload and eats one-shot UI; arrive by `location.hash` for return-toast checks.
- Git Bash mangles `#/route` argv: prefix with `MSYS_NO_PATHCONV=1` or hardcode the hash. Never put JS template literals in bash heredocs or `node -e`; write scripts with Write.
- Wait for the screen, not a clock: `window.__catosBooted && #view.children.length && !.route-waiting`. `Runtime.consoleAPICalled` is an event; capture console by patching `console.error` in page.
- `SEED` (exported by `check-rendered-contrast.mjs`) is the one "learner a week in" fixture. Seed via `import('/src/core/storage/indexeddb-adapter.js')` in page context; settings `{id:'valley'}` skip the intro.
- Chrome is at `C:/Program Files/Google/Chrome/Application/chrome.exe`; never `taskkill /IM chrome.exe` (kills the owner's Chrome); a stale server may own `:8765`; Python is not installed.
- Full verify takes more than 10 minutes: `run_in_background`. Never run two Chromes while measuring.
- RC DOM: `#begin` → `#to-questions` → click option's inner `button` → `#submit` → `#next` → `.result`. Select an option via `cat-option-select` CustomEvent on `cat-question-card`.

## Open items (update when closed)
- Glow follow-ups: mood weight still includes pace; the fire lights on any finished run; Word DNA garden visits are one question per family+kind.
- Language Garden and lexicon word rounds have no draft/resume. Five weakness models still disagree. Button/radius/shadow consolidation pending. Village scene rebuilds whole per craft (11.4 ms).
- Empty states (Records zero tiles, Gauntlet duplicate copy) not redesigned. `check-resume` village toast once showed +1 not +25 (not investigated). License unchosen.
