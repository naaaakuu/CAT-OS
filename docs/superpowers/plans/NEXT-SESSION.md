# Continue CAT OS 3.0 — the pet village (handoff, 2026-10-02)

Paste everything below into a fresh Claude Code session opened in `D:\USER DATA\Desktop\CAT OS\cat-os`.

---

Continue building CAT OS 3.0, "the pet village". The work so far is on branch `pet-village-3.0`, pushed to origin. `main` is still 2.2 and auto-deploys to GitHub Pages, so only merge when everything below is done and verified.

Read these first:
- `docs/superpowers/specs/2026-10-02-pet-village-design.md` — the approved design; binding.
- `docs/superpowers/plans/2026-10-02-pet-village.md` — the plan.
- My memory file `cat-os-pet-village`.

## The approved concept, in brief

- One painted village: `assets/art/home-world-v1.png`, 1536×1024. All coordinates in `src/pets/paths.js` are pixels of that painting.
- Six pets, names chosen by the owner:
  - Toffee (flame): CAT pace and the Gauntlet; keeps the village fire.
  - Chai (owl): Reading.
  - Matcha (sprout): Vocabulary.
  - Mochi (pebble): Para summary and paragraph completion.
  - Ginger (fox): Para jumbles and sentence placement.
  - Mallow (cloud): Odd one out.
- The gift ring: Matcha → Chai → Mochi → Ginger → Mallow → Toffee. Each pet works at double speed while the pet before it is happy.
- Moods, harmony, hearts and stories, three daily wishes, Toffee's flame with kindling, letters, festival nights, and nine treasures made in order (`village-treasure` records).
- The owner explicitly asked for addictive hooks; THE WORLD A11 records that this overrides the old ban.

## Done, on the branch

- **`src/pets/`**:
  - `pets.js` (roster and voice)
  - `economy.js` (derivePets; tested by `tools/check-pet-economy.mjs` and `tools/check-pets.mjs`)
  - `next.js`
  - `paths.js` (gated by `tools/check-village-data.mjs`)
  - `sprite.js`
  - `sheets.js`, plus `assets/art/pet-*.png`: five baked frames each, from `tools/bake-pets.mjs`
- **`src/home/`**:
  - `village.js` is the new `#/world`: transform camera, three-piece HUD, cards, intro, return toast, letters.
  - `life.js`: pet state machines and the ambient particle canvas.
  - `cards.js`: pet, hearth, satchel, cottage and letter cards, and the treasure overlays.
  - `motion.js`: a stub only (see task 1).
- **CSS**: `src/ui/styles/home.css`.
- **Palette**: unified in `tokens.css`, `world.css` and `game.css`.
- **Wiring**:
  - `world/state.js` sets `state.pets`, plus `petChangeLine` and `newlyAffordable`. `worldChangeLine` and `newlyBuildable` are temporary shims.
  - `world/stage.js` sets `html[data-host]` and paints the host's home behind module rooms.
- **Screens re-themed**:
  - Place screens: painted hero with the host pet.
  - Records: `world/screens/hearth.js`.
  - Progress: the clock tower, `shell/growth.js`, six pet rows.
  - Settings: the cottage header.
  - `cat-nav`: Village · Progress · Cottage.
- **Gates rewritten in `tools/verify.mjs`**:
  - §16: pets
  - §17: art
  - §22: `check-contrast` reads `home.css`
  - §23: `check-village-data`
  - §23b: `tools/check-village.mjs`
- **Other gates updated**: `check-reach` (cottage card), `check-resume` (return toast), `check-interruption` (satchel) and `check-hostile-records`.
- **Docs**: THE WORLD doc (in `KNOWLEDGE/`) has Part A11. The draft CHANGELOG text is at the end of this file.

## Remaining, in order

### 1. The living painting (the owner's newest and most important request)

The owner said the map still feels like a static image. Make the PAINTED elements themselves move.

**Technique.** Lift each element out as a feathered patch: a div at painting coordinates whose background is the same PNG at 1536×1024 with `background-position: -x -y`, so at rest it is pixel-identical. Mask the edges with a gradient and animate it with CSS keyframes (transform, opacity and filter only).

**Elements:**
- the water wheel by the workshop (around 650,200): spin it;
- the workshop gear emblem (around 835,115): spin it;
- chimney smoke: the painted wisp on the cottage (around 225,545), plus visible, continuous particles from every chimney (`CHIMNEYS` in `paths.js`; smoke is drawn in `life.js`);
- every lamp and lantern ("tube lights"): a breathing warm halo, faint by day and strong at dusk and night;
- the campfire (around 822,878): flame flicker and a pool of light;
- the waterfall and stream at the left edge, and the stream under the clock tower bridge: flowing highlights;
- the pond: shimmer, lily pads bobbing;
- the clock-tower banners (around 1235,720 and 1290,700), the painted bunting and the awning: cloth wave;
- 6–10 tree canopies, including the big plaza tree: very slow wind sway;
- the telescope (around 1340,80): an occasional pan; the armillary sphere (around 1450,215): a slow spin;
- the patio umbrella and the teapot: steam.

**Rules:**
- Implement it in `src/home/motion.js`. It is already called from `village.js` as `mountMotion(map, { atmo, reduced })` and must return `{ setAtmo, destroy }`.
- Insert one `.cw-motion` container right after `img.cw-art`, so the hour's tint still covers it.
- Use at most about 40 patches.
- Respect reduced motion.

**How to place them.** Find coordinates with zoomed, gridded crops of the PNG, drawn through `tools/cdp-lite.mjs`. Return images in chunks: CDP evaluate results over about 1 MB stall. Then verify each patch moves without a seam by comparing two screenshots taken apart.

### 2. Finish the results and module screens

A stopped agent left this mid-way; check what it changed with `git diff main -- <file>`. Remaining:
- **`renderResult`** (`world/screens/result.js`) and **`worldReward`** (`world/rewards.js`, with an async `{storage}` option): show the host pet celebrating, the gifts with `giftIcon`, the ring bonus line, any new heart with its story line, and a newly affordable treasure. Re-theme the result screen from forced night to the warm painted look (`paintedBackdrop(pet)`; CSS in `src/ui/styles/rewards.css`, already linked in `index.html`). It must pass AA contrast in light and dark.
- **Callers to move onto `petChangeLine` / `newlyAffordable`**, then delete the shims in `state.js`:
  - `rc/screens/session.js`
  - `rc/screens/second-look.js`
  - `world/screens/round.js`
  - `world/screens/wilds.js`
  - `language-garden/screens/session.js` (growth beat)
- **`worldReward` callers** in the pj, ps, ooo, wd and verbal-bank session screens must pass `{storage}`.
- **Canvas backdrops**: rounds, the Gauntlet, the second look, and Language Garden session and plant must all use `paintedBackdrop(<pet>)`. `backdrop.js`, `garden-backdrop.js` and `craft-ui.js` are already deleted; make sure nothing still imports them.
- **Host chips** (`hostChip`) on the `.run__bar` of rounds and RC.

### 3. Retire the canvas village

- Delete `src/village/` (screens, scene, renderer, terrain, life, living-art, grove, next, sprites, state, and `defs.js` once its last importers move) and `src/ui/styles/village.css` (plus its link in `index.html`).
- Keep whatever `<cat-plant>` still needs: the plant stills plus `artURL` and `PLANT_STAGE`. Move them into `cat-plant.js` or a tiny module.
- Strip `world/icons.js` of its `art.js` and `defs.js` imports.
- Remove the dead goods, orders and stage exports from `world/economy.js`, and the dead lines from `world/companion.js`.
- Delete the Cute Nature PNGs in `assets/art/` that nothing references.
- Then:
  - `grep -rn "village/" src tools` must be empty, apart from intentional mentions;
  - run `node tools/build-precache.mjs`.

### 4. Fix and verify

- `node tools/check-village.mjs` (the full run includes the offline leg) last failed at "satchel did not close and give focus back". It passed earlier, so investigate: timing, or a regression.
- Then run `node tools/verify.mjs` (about 10 minutes) until exit 0.
- Do a real-browser tour at 390×844 and 1440×900: morning, dusk, night, dark theme and reduced motion. Cover the village, every card, a place screen per pet, one finished run per module (check the result screen and the return toast), Progress, Settings and Records. Keep the p50 rAF gap at about 18 ms or less on the village.
- Finally, run an adversarial review (at most 2 agents): one for code and cleanup, one as a visual critic against the spec. Fix what survives.

### 5. Ship

- Bump `src/app.js` `APP_VERSION` to 3.0.0.
- Rewrite `README.md`: intro, the first minutes, the village section, principles, the gates table and the repository map.
- `STATUS.md`: add a 3.0.0 section.
- `CHANGELOG.md`: add 3.0.0 (draft below).
- Update the memory files.
- Commit on `pet-village-3.0`, merge to `main`, then `git push origin main` (owner rule: always push).

**Owner rules:**
- Judge against the vision.
- Build, don't report.
- At most 2 agents at once (this machine has 4 cores).
- Pet lines: no "!", at most 96 characters, none of the mentor's banned words.

## Draft CHANGELOG 3.0.0

See the draft in the session scratchpad if it is still there; otherwise write it fresh from the spec. It needs sections for:
- One village, six pets
- An economy where every subject matters
- Every screen hosted by its pet
- Removed
- Gates
## 3.0.0 — The pet village (2026-10-02)

The owner found the app too complex: a painted home at `#/world` with a
second, older sprite village behind it, three different visual languages
(painted home; 3D-sprite village, places and rounds; plain studio settings
and progress), a dense home crowded with signs, a dock, a header and zoom
buttons, DILR and Quant buildings this app does not have, mascots that never
moved, and an economy (goods → crafts → orders → coins → buildings) hidden on
the second map. The brief was to keep the painted look and the six mascots,
make it calmer and cleaner but alive in every small detail, give each VARC
subject a pet that walks, talks and interacts, make the village suffer when
any one subject is neglected, build an economy that keeps people coming
back ("use all the tricks"), and make every other screen belong to the game.
The owner approved the design and chose the pets' names.

### One village, six pets

- **`#/world` is the painting, full-bleed, with three small things on it:**
  Toffee's flame and the village name, the satchel and the cottage, and
  today's wishes. There are no signs, no dock and no zoom buttons. The map
  pans by drag, wheel and arrow keys, and zooms by pinch or ctrl+wheel.
  `#/world/village` redirects here.
- **Six pets, one per subject:**
  - **Toffee** (flame) — CAT pace, the Gauntlet, and the village fire
  - **Chai** (owl) — Reading
  - **Matcha** (sprout) — Vocabulary
  - **Mochi** (pebble) — Para summary and completion
  - **Ginger** (fox) — Para jumbles and placement
  - **Mallow** (cloud) — Odd one out

  Each lives in a building already in the painting.
- **The pets' life on the map:**
  - They hop-walk a traced path graph (`src/pets/paths.js`) to the plaza,
    the benches, the fire, the dock and each other's doors.
  - They blink, chat in pairs (some of it real gossip about who needs a
    visit), carry their gift to the next pet in the ring, and walk home to
    sleep at night.
  - They react with a hop and hearts when tapped.
  - How far and how often they wander is their mood.
- **Five frames per pet** (idle, blink, happy, talk, sleep) were baked from
  the original art by `tools/bake-pets.mjs`. No new artwork was drawn.
- **Small life:**
  - day and night from the real clock, with lamps and windows glowing;
  - campfire sparks, chimney smoke, fireflies, butterflies, autumn leaves;
  - pond glints and ripples, birds, rain, drifting cloud shadows;
  - clock-tower hands that keep real time.
- **Buildings have jobs.** Tap a pet's home for its card. Your cottage holds
  sound, your village name and the other rooms. The clock tower is
  progress.

### An economy where every subject matters

All of it is derived from learning records. The one new record kind is
`village-treasure`. Existing learners keep their history.

- **Mood.** Each pet has a mood from how recently and how well its subject
  was practised: glowing, happy, missing you, sleepy, wilting. A pet you have
  not met yet is never sad.
- **The gift ring:** Matcha → Chai → Mochi → Ginger → Mallow → Toffee →
  Matcha. Each pet makes gifts twice as fast while the pet before it is
  happy, so a neglected subject slows its neighbour. Through harmony, it
  slows the whole village: the lanterns, the fire, the fireflies and the
  music all follow it.
- **Friendship.** Five hearts per pet, each unlocking a line of that pet's
  story.
- **Nine treasures, made in order.** Plaza lanterns, bunting, flower boxes,
  firefly jars, the swing, wind chimes, a kite, lily-pad lights and
  sky-lantern night, each drawn on the map. The recipes mix several pets'
  gifts, and the later ones need all six.
- **Reasons to come back:**
  - three daily wishes aimed at the neediest pet (granting all three pays
    an extra gift from every pet);
  - Toffee's flame, the daily run, protected by kindling;
  - a letter from the pet who missed you most after a day away;
  - a thought bubble over whoever needs you;
  - festival nights when everyone is happy;
  - a celebrating pet and a toast every time you return from a run.

### Every screen hosted by its pet

- **One palette:** warm cream, village sage, honey and terracotta, plus a
  forest-night dark theme. `tokens.css`, `world.css` and `game.css` agree
  now.
- **Every learning route sets `html[data-host]`.** Rooms stand in a soft
  painted crop of the host's home instead of a canvas scene.
- **Place screens** show the host pet at its door in the painting, and the
  host greets you.
- **Results** show the pet celebrating the gifts it made, the ring bonus,
  any new heart and story line, and a treasure that just became affordable.
- **Progress is the clock tower,** with six pet rows. **Settings is your
  cottage. Records are kept by Toffee.** The bottom rail is Village ·
  Progress · Cottage.

### Removed

The canvas village and everything only it used:
- the renderer, scene, terrain, life, grove and art bank;
- the 2.2 Cute Nature sprites, except the plant stills `<cat-plant>` still
  uses;
- the village derivation, goods, coins, orders, neighbours and buildings;
- the craft UI, the canvas backdrops and the old menu.

### Gates

| Section | What it checks now |
|---|---|
| §16 | Derives the pets (`tools/check-pet-economy.mjs`, `tools/check-pets.mjs`) |
| §17 | Checks the painting and the six sheets |
| §22 | Reads the village's button colours from `home.css` |
| §23 | Is `tools/check-village-data.mjs`: the path graph, sampled against the painting's own pixels |
| §23b | Is `tools/check-village.mjs`: six pets walking, cards, focus, a treasure made, night, reduced motion, phone width, offline |
| check-reach | Opens the cottage card instead of the old menu |
| check-resume | Checks the return toast |
| check-interruption | Checks the satchel |
| check-hostile-records | Puts broken treasure records through the pets |
