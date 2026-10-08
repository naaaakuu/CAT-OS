# Architecture (current)

Entry: `index.html` → `src/app.js` (router, boot, `APP_VERSION`, scene audio). Hash routes; modules register their own routes. Cold open budget: `tools/module-graph.mjs`.

```
records (IndexedDB, via StorageAdapter)
   → src/world/state.js   learning state derived from records
   → src/pets/economy.js  derivePets(): Glow, levels, stages, mood, today's three, fire
   → src/home/*           village screen;  src/world/screens/*  rooms, rounds, results
```

## Village (`src/home/`, `src/pets/`)
- One painting (`assets/art/home-world-v1.png`, 1536x1024), full detail, never zooms; phones scroll sideways. The campfire (down to y 950) must never sit under the bottom button: `lowestCam()` in `village.js` lifts the camera, and `.cw-dock` (home.css) is an overlay with the button low-centre (portrait) or lower-right (landscape).
- `home/village.js` camera, HUD, big Help button, today's three, party, intro, the grown painting (bake on load and when houses grow), the house-grew moment. `home/life.js` gaits, chores, greetings, voices, the scene canvas (viewport-sized, moved with the camera, culled; glows are stamped sprites) and the paced loop (60 max, 30 on a struggling device). `home/cards.js` friend/fire/level/every-subject/settings cards and village-level decorations. `home/motion.js` + generated `motion-atlas.js` = the living painting (44 baked patches; `house`/`from` keep a machine still until its house wakes; off-screen patches pause).
- Houses grow with their own section, which is their friend's (`economy.js houseStages`, 0-10; each spot is its friend's id). `home/houses.js`: `HOUSE_ART` (per-house mask, windows, lamps, chimney, flowers, keepsake, garland, perch, wonders, crown), `bakeVillage` (grading + dark windows + still props into a canvas laid over `.cw-art`), `gradeAtlas` (the motion atlas graded to match), `createHouseLife` (everything that moves, drawn on the scene canvas: plain paint, then one hour-tint pass, then additive lights). `home/paint.js` is the brush (cached 3x sprites, glow/glyph sprites). Copy per stage: `pets.js HOUSE_GROWTH`. Gate hook: `.cw.__village.houses(stages)` shows any stages (looks only).
- `pets/pets.js` roster, HOUSES (subject signs), ages, lines (`LINES`: hello, missed, thanks, cheer, grow by seed; `muse`, `arrive`, `arriveNight` dealt as a no-repeat deck by `dealLine`, memory passed to `life.js` as `memory`), stories, `SIGNATURE` voices, `MODULE_PET`/`PLACE_PET`. `pets/paths.js` coordinates in painting space. `pets/sprite.js` + `sheets.js` baked sprite sheets (adult and baby), hats, rig. `pets/next.js` each friend's next activity.
- Art is baked by `tools/bake-pets.mjs` (`--baby` for baby sheets) and `tools/bake-motion.mjs`. Change PATCHES → rerun bake-motion + build-precache.
- New subject for a friend: `MODULE_PET` and `PLACE_PET` in `pets.js`, a Glow/progress source in `economy.js`, an entry in `next.js`.

## Economy (`src/pets/`)
- `glow.js` holds every number (`GLOW`). `economy.js` derives; `progress.js` has `levelFor` (subject ladders) and `achievementsFor` (10 whole-app achievements). Nothing here is stored.
- Friends: Toffee (Gauntlet + fire), Chai owl (Reading), Matcha sprout (Vocabulary), Mochi pebble (PS), Ginger fox (PJ), Mallow cloud (OOO), Sesame mouse (PC, the clock tower), Biscuit calico cat (SP, the rose cottage). The six are cut from the strip; Sesame and Biscuit are painted in code (`tools/paint-sesame.mjs`, `paint-biscuit.mjs`, both on `paint-kit.mjs`'s brush, light and grain), baked with `bake-pets --only <id>` and `--baby --only <id>`.

## Rooms (`src/modules/`, `src/world/`)
- `modules/`: `reading-comprehension`, `para-jumbles`, `para-summary`, `odd-one-out`, `word-dna`, `language-garden` (the Rootwood, six-beat sessions), `verbal-bank` (sentence placement, para completion, word bank, critical reasoning; route `#/bank/session/:type/:set`).
- `core/engine/`: one session engine per kind (`PracticeSession`, `BankSession`, `PJ/PS/OOO/WDSession`); all share the draft contract (`draft-shape.js`).
- `world/`: `regions.js` places, `lexicon.js` vocabulary rounds, `rewards.js`, `stage.js` painted room behind lessons, `audio.js` composed theme + ambience + friend voices, `screens/` (place, round, Gauntlet/wilds, result, records).

## Learning core (`src/core/`)
- `content-loader/` registry, schema validation (`loader.js consistencyIssues`), library warm-up. `learning/`: `journey.js` (RC stages, `STAGE_SIZE`), `order.js` (per-learner order inside a level), `review.js` (skill/trap/pattern ledgers, due skills), `noticing.js` (the only code that turns ledgers into a sentence), `draft.js`, `taxonomy.js` (mirror of `content/taxonomy/varc-taxonomy.json`; verify §19 fails on drift). `mentor/` voice. `engagement/` XP, streaks, achievements. `storage/` adapter + IndexedDB. `router/`, `utils/`, `ads/rewarded.js` (seam; open today).

## Content (`content/`)
JSON by type, one folder per type; `schema/` versioned; `taxonomy/` authority + `AUTHORING.md`; `index.json` registry; `manifest.json` + `boot-index.json` generated. Banks are not precached; `library-sync.js` warms them. Types: RC, PJ, PS, OOO, SP, PC, WB, CR, Word DNA, vocabulary, lexicon, twins, loanwords, Language Garden.

## UI (`src/ui/`, `src/shell/`)
Tokens and CSS in `ui/styles/` (`home.css` village, `rewards.css`, `world.css` rooms and sole owner of `--g-*` colours, `game.css` geometry/type/motion only). Web Components in `ui/components/`. `ui/modal.js` dialog contract. `ui/info.js` native-popover info buttons. `shell/` Progress, Settings (backup, Start over), preferences.

## Shipping
Static files; GitHub Pages deploys the whole repo on push to `main` (`.github/workflows/deploy.yml`). `service-worker.js` installs in resumable batches, promotes transactionally; cache ids are fingerprints of shipped files. `tools/build-precache.mjs` rewrites the lists; `build-manifest.mjs` the content manifest.

## Gates (`tools/verify.mjs`, plain Node, no dependencies)
Sections check content/schema/registry, precache hash (§25), module graph, engines, economy (§16 `check-pet-economy`, pet lines `check-pets`), corpus QC (§21), taxonomy mirror (§19). Browser sections use `tools/cdp-lite.mjs` (any Chrome/Edge, prints SKIPPED if none): §22 `check-contrast`, §23 `check-village-data`, §23b `check-village`, §24 `check-rendered-contrast`, §26 `check-hostile-records`, §27 `check-noticing`, §28 `check-reach` (Tab/focus/44px), §29 `check-interruption`, §30 `check-resume`. Content tools: `check-content`, `build-index`, `qc-corpus`, `blind-solve`, `option-tells`, `shuffle-answers`, `build-lexicon` (reads `../KNOWLEDGE/99_REFERENCE`, which must stay).
