# CAT OS 3.0 — The Pet Village: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to carry out this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-map world with one painted village. Six pets live in
it, one per VARC subject. Their economy is derived from learning records, and
every screen shares one visual language.

**Architecture:**
- New `src/pets/*` holds the roster, the derived economy, the next-activity
  picker, the map geometry and the sprite helpers.
- New `src/home/*` holds the `#/world` screen and its life engine (DOM pets
  plus an ambient canvas over the painted PNG).
- `world/state.js` derives `state.pets` instead of `state.village`.
- The canvas village is deleted. Every canvas backdrop becomes a painted CSS
  crop of the host pet's home.

**Tech stack:** a no-build vanilla JS PWA (ES modules, IndexedDB, a service
worker). Node 24 runs the tools; there is no npm. Real-browser gates go
through `tools/cdp-lite.mjs` and headless Chrome.

**Spec:** `docs/superpowers/specs/2026-10-02-pet-village-design.md`. Read it
first. Every number in it is binding.

## Global constraints

- Pet ids, names and order:
  `toffee` Toffee, `chai` Chai, `matcha` Matcha, `mochi` Mochi, `ginger`
  Ginger, `mallow` Mallow.
- Gifts: sparks, stories, leaves, notes, maps, stardust.
- Ring: `matcha → chai → mochi → ginger → mallow → toffee → matcha`.
- Pet lines: no `!`, at most 96 characters. They must not contain wrong,
  failure, failed, mistake, poor, weak, bad, careless, study, score, XP,
  "level up" or "unlocked".
- No new dependencies and no webfonts. Georgia is the display face and
  system-ui the text face.
- Classes on the home screen are prefixed `cw-`. Pet classes are prefixed
  `pet-`. Never reuse `.vround`, `.sign` or `.hud__icons`.
- Every `src/` or `assets/art/*.png` change ends with
  `node tools/build-precache.mjs`, or verify §25 fails.
- Repo line endings are mixed. `service-worker.js`, `tools/verify.mjs` and
  `content/index.json` are CRLF. Patch scripts normalise `\r\n` and write the
  original line endings back.
- Under Git Bash, prefix any argv starting with `#/` with
  `MSYS_NO_PATHCONV=1`.
- Reduced motion (`html[data-reduced-motion]` or the
  `prefers-reduced-motion` media query) disables walking, particles and hops.
- Commit locally after each task. Push once at the end (owner rule:
  `git push origin main`).

---

### Task 1: The pet roster and voice — `src/pets/pets.js`

**Files:** Create `src/pets/pets.js`. Create `tools/check-pets.mjs`, a Node
lint and unit check that is later wired into verify §17.

**Produces:**
- `PETS`: a frozen array of
  `{id, name, creature, subject, home, gift, giftOne, colour, frame:[x,w], places:[slug], modules:[mod], blurb}`.
- `PET_BY_ID`: a `Map`.
- `RING`: the ids in ring order.
- `supplierOf(id)` → id.
- `successorOf(id)` → id.
- `petForModule(mod)` → id | null:
  - rc → chai (an RC session has no module; callers pass `'rc'`)
  - rc2, cr → chai
  - lex, garden, wd, wb → matcha
  - ps, pc → mochi
  - pj, sp → ginger
  - ooo → mallow
  - gauntlet → toffee
- `petForPlace(slug)` → id | null.
- `GIFTS`: `{sparks:{name:'Sparks', one:'spark', pet:'toffee'}, …}` for all
  six gifts.
- `LINES`:
  - `mood[word]` lists per pet. Mood words: glowing, happy, missing, sleepy,
    wilting, new.
  - `gossip(aboutPet)` templates.
  - `ringFull` / `ringLow` templates.
  - `letter` per pet.
  - `intro` (Toffee's three lines, from spec §3.6).
  - `tap` lines per pet.
- `STORIES`: 5 lines per pet.
- `lineFor(petId, kind, seed)`: a deterministic pick.

- [ ] Write `tools/check-pets.mjs`. It imports `pets.js` and asserts:
  - 6 pets, in the order above;
  - `RING` is a permutation of them;
  - the ring is consistent: `supplierOf(successorOf(x)) === x`;
  - every place slug in `src/world/regions.js` maps to a pet;
  - every module in `[rc, rc2, cr, lex, garden, wd, wb, ps, pc, pj, sp, ooo, gauntlet]` maps;
  - every line obeys the global copy rules;
  - each pet has exactly 5 `STORIES`.
- [ ] Run `node tools/check-pets.mjs`. Expect it to fail because the module
  is missing.
- [ ] Write `pets.js` with all the copy. The voice:
  - Chai: precise, gentle, bookish.
  - Matcha: sunny, growing metaphors.
  - Mochi: calm, says it in fewer words.
  - Ginger: quick, trail and map talk.
  - Mallow: dreamy, sky and stars.
  - Toffee: warm host, the keeper of the fire.
- [ ] Run the check again. Expect PASS.
- [ ] Commit: `pets: the six-pet roster, ring and voice`.

### Task 2: The derived economy — `src/pets/economy.js`

**Files:** Create `src/pets/economy.js`. Create `tools/check-pet-economy.mjs`.

**Consumes:**
- `PETS`, `RING`, `supplierOf`, `petForModule`, `GIFTS` from Task 1.
- `rcStars` and `verbalStars` from `src/world/economy.js`.
- `dayKey` and `shiftDay` from `src/core/engagement/streaks.js`.

**Produces:**
- `visitsFrom(records, content)` → `Visit[]` sorted by `at`, where
  `Visit = {pet, at, stars, flawless, correct, id}`. Stars follow spec §2.1.
- `moodAt(visits, petId, t)` → number, or `null` for a pet with no visits.
- `derivePets(state, records, content, now)` returns:

```
{
  pets: [{
    id, mood, word, isNew, care, hearts, xp, toNext,
    gifts, earned, full (supplier happy now), supplier, successor,
    lastAt, visits, story, line
  }],
  harmony, festival, neediest,
  flame: { days, tier, kindling, alive, today },
  wishes: [{ id, pet, text, done, href }],   // exactly 3
  wishesDone,
  stock:   { sparks, stories, leaves, notes, maps, stardust },
  earnedTotal,
  bonus,
  treasures: [{ id, name, recipe, made, at, affordable, next }],
  nextTreasure,
  letter: { pet, text } | null,
}
```

- `TREASURES`: the spec §2.7 table, in order.
- `canMake(pets, id)` → `{ ok, missing:{gift:n} }`.
- `giftsBetween(beforePets, afterPets)` → a bag of gifts gained, for the
  result screens.

Steps:

- [ ] Write `tools/check-pet-economy.mjs`. It builds synthetic records with
  fixed timestamps (no `Date.now`) and asserts:
  1. **Empty records:** all six pets `isNew`; harmony 0.3; `flame.days` 0;
     `wishes.length` 3; every stock 0; `nextTreasure.id` is `'lanterns'`.
  2. **Mood decay:** one RC session of 3 stars at t0. At t0+1 h, Chai's
     mood is about 0.72 (±0.02). At t0+48 h, about 0.42 (±0.03). At
     t0+96 h, it is below 0.2. Its word moves glowing/happy → missing →
     sleepy.
  3. **The ring doubles:**
     - a lex-round (3 stars) at t0, then an RC session (3 stars) at t0+1 h;
     - the RC visit earns 2 × 3 = 6 stories, because Matcha's mood at
       t0+1 h is at least 0.5;
     - an RC session with no prior Matcha visit earns 3.
  4. **Flawless** adds 1 before the doubling.
  5. **Harmony** = 0.5 × mean + 0.5 × min, with `new` counted as 0.3.
  6. **Flame:**
     - activity on days D1..D7 then D9 (no D8), viewed on D9: days 9, the
       kindling spent;
     - with a gap of 2 days the run resets;
     - kindling is capped at 2.
  7. **Wishes:** wish 1 names the lowest-mood pet. A visit to that pet
     today marks it done. When all three are done for a past day, that day
     adds +1 to every gift in `stock`.
  8. **Treasures:**
     - a `village-treasure` record for `lanterns` subtracts leaves 2 and
       stories 2 from stock;
     - `canMake` reports the missing amounts;
     - a record for a treasure out of order is ignored (only the next in
       order counts; a later id before an earlier one is skipped);
     - two records for the same treasure count once.
  9. **Hostile records** are skipped without throwing: missing
     `finished_at`, an unknown module, `stars: 'x'`, `null` answers.
- [ ] Run it. Expect it to fail because the module is missing.
- [ ] Implement `economy.js`:
  - Visits are pure functions over the records.
  - `moodAt` is O(visits of that pet).
  - The ring check per visit uses the supplier's visits before that time.
  - The flame is simulated forward over sorted day keys.
  - Wishes are generated per day from the moods at local midnight.
  - The past-day bonus loop runs only over days that had activity.
- [ ] Run it. Expect PASS.
- [ ] Commit: `pets: derived economy — mood, ring, harmony, flame, wishes, treasures`.

### Task 3: Baked pet sheets — `tools/bake-pets.mjs` → `assets/art/pet-<id>.png`

**Files:** Create `tools/bake-pets.mjs` and `assets/art/pet-{toffee,chai,matcha,mochi,ginger,mallow}.png`.

**Produces:** six PNG sheets.
- Each frame is 256 px tall; widths are scaled from the strip frames.
- 5 frames left to right: idle, blink, happy, talk, sleep.
- One 4 px transparent gutter between frames.
- A JSON-ish constant printed for `src/pets/sprite.js`:
  `{id: {w, h:256, frames:5}}`.

- [ ] The script serves the repo (`serveRepo`) and launches Chrome
  (`launchChrome`). In the page it loads `/assets/art/home-companions-v1.png`
  into a canvas, then for each strip frame `[x, w]`:
  1. **Crop** to the frame. Trim transparent margins (alpha < 8) and keep a
     6 px pad.
  2. **Find the eyes.** In the upper 65% of the face box, find connected
     near-black pixel blobs (r, g, b < 70; alpha > 200) between 12 and 900
     px². Take the two largest at similar y; they are the eyes. Then find
     the mouth: the dark curve below the eyes, between them.
  3. **Sample skin** colour as the median of a ring of pixels 4–8 px outside
     each eye blob.
  4. **Paint the frames:**
     - blink: fill each eye ellipse with skin, then a 3 px dark arc "‿"
       across it;
     - happy: fill the eyes, then arcs "︶" bowed upward (^ ^);
     - talk: idle, plus a small dark-red rounded mouth ellipse (w × 0.5 of
       the eye spacing) over the smile;
     - sleep: blink-style arcs, but flatter and lower.
  5. Scale the frame to 256 px tall with high-quality smoothing.
  6. Assemble the sheet and export it with `toDataURL('image/png')`.
- [ ] Write the files. Read each PNG with the Read tool and check visually
  that the eyes and mouths read correctly. Retune the thresholds per pet if
  a blob misfires (Mochi's glasses are dark: keep the inner filled ovals,
  not the ring; filter by fill ratio above 0.6).
- [ ] Commit: `art: baked five-frame pet sheets`.

### Task 4: Map geometry — `src/pets/paths.js`, plus `tools/check-village-data.mjs`

**Files:** Create both.

**Produces** (all in 1536×1024 image px):
- `MAP = {w:1536, h:1024, src:'./assets/art/home-world-v1.png'}`
- `HOMES[petId] = {door:{x,y}, stand:{x,y}, hit:{x,y,w,h}, label}`
- `PLACES` = cottage, clock, kiosk and campfire, each `{hit, label, stand}`
- `SPOTS`: plaza points (`plaza:0..5`), `bench:w/e/n`, `fire:0..3`, `dock`,
  `swing`
- `NODES: {id:{x,y}}`
- `EDGES: [[a,b]]`
- `route(fromId, toId)` → `[{x,y}]` (Dijkstra over `NODES`)
- `nearestNode({x,y})`
- `LAMPS: [{x,y,r}]`
- `WINDOWS: [{x,y,r}]`
- `CHIMNEYS: [{x,y}]`
- `POND: {x,y,rx,ry}`
- `CLOCK: {x,y,r}`
- `FIRE: {x,y}`
- `BUNTING`, `FLOWERBOXES`, `JARS`, `KITE`, `LILY`: the anchor lists for the
  treasures

- [ ] Start from the traced polylines and doors in the spec research notes.
  Library door (322,215) stand (335,295); workshop (822,195) / (850,262);
  observatory (1231,185) / (1150,285); greenhouse (325,418) / (330,465);
  cabin (1225,415) / (1225,470); cottage (282,705) / (285,750); clock tower
  (1257,760) / (1257,810); kiosk front (810,815); campfire (822,880); plaza
  ellipse centre (770,490), rx 170, ry 85.
- [ ] Render a debug overlay through `tools/cdp-lite.mjs`: the PNG with nodes
  and edges drawn on a canvas. Read the screenshot and nudge every point
  until it sits on sand or stone, never on a roof, tree, water or wall.
  Repeat until clean. Do the same for lamps, windows, chimneys and the clock
  face.
- [ ] `check-village-data.mjs` asserts:
  - every node lies inside the map;
  - the graph is connected;
  - every `HOMES[x].stand` and `SPOTS` point is within 6 px of a node, or is
    a node;
  - `route()` returns a path between every pair of homes.
  - It also samples the PNG in headless Chrome: every node pixel must have a
    "ground" colour (sand or stone luminance and hue; not deep green and not
    blue water). This is the old "nothing stands in the pond" gate,
    rewritten.
- [ ] Commit: `pets: village geometry and its gate`.

### Task 5: Sprite helpers and one palette

**Files:**
- Create `src/pets/sprite.js`.
- Modify `src/ui/styles/tokens.css` (the palette at the top of `:root`, and
  the dark block).
- Modify `src/ui/styles/world.css` and `game.css`: alias `--g-*` to the
  tokens and delete their duplicated literals.

**Produces:**
- `petSprite(id, {frame=0, size=96, cls=''})` → a
  `<span class="pet-sprite" style="--w;--h;--f">` HTML string. CSS draws
  the background from `assets/art/pet-<id>.png` at
  `background-position: calc(var(--f) * -frameW)`.
- `petPortrait(id, size)`: the same with a circle mask and a mood ring slot.
- `giftIcon(kind, size=20)`: inline SVG with filled shapes and a 1.4 px
  `#4a3a2a` outline:
  - sparks: a teardrop flame
  - stories: a rolled scroll
  - leaves: a leaf
  - notes: a note card with lines
  - maps: a folded map
  - stardust: a four-point sparkle
- `backdropStyle(petId|place)` → the inline style for the painted crop
  (background-image, size and position for that home). Crop rectangles live
  in `paths.js` as `CROPS`.
- `FRAME = {idle:0, blink:1, happy:2, talk:3, sleep:4}`.
- CSS in the new `src/ui/styles/home.css`: `.pet-sprite`, `.pet-portrait`,
  `.gift`.

- [ ] Palette from spec §4:
  - Light: `--color-bg:#FFF9EC; --color-surface:#FFFCF4; --color-surface-2:#F6EEDB; --color-surface-3:#EFE4CB; --color-ink:#34443B; --color-ink-2:#4F5B4E; --color-ink-3:#6A705F; --color-line:#E8DCBF; --color-line-strong:#D9C9A3; --color-accent:#536D4E; --color-accent-hover:#425D3E; --color-accent-subtle:#E9EDDA`.
    Add `--honey:#EDBE66; --terracotta:#C2643F; --rose:#D98B7A; --sky:#8FB3C9` and `--pet-<id>` for each pet colour.
  - Dark: `--color-bg:#1E2722; --color-surface:#26312B; --color-ink:#F3ECDD`
    and so on.
  - Then run `node tools/check-contrast.mjs`, and fix any pair below AA.
- [ ] Commit: `ui: one palette and the pet sprite helpers`.

### Task 6: The next activity per pet — `src/pets/next.js`

**Files:** Create `src/pets/next.js`, moving the logic out of
`src/village/next.js`. Delete `src/village/next.js` in Task 12.

**Produces:**
- `nextFor(petId, world, {first})` → `{href, label, sub, minutes, kind, why}` or `null`.
- `cornersOf(petId, world)` → `[{href, label, sub}]`, the "More with" list.

Per pet:

| Pet | `nextFor` | `cornersOf` |
|---|---|---|
| chai | `nextActivity('reading')` logic | Reading house `#/world/place/reading-room`; the second look when 4+ misses; Arguments `#/bank/session/cr/next` |
| matcha | `rootwood.dueCount` > 0 and greater than meadow+pond due/6 → the garden family session; otherwise the round logic | Word rounds (meadow), Look-alike twins (pond), Borrowed words (thicket), Root families (rootwood), Word parts (terraces) |
| mochi | `nextVerbal(content.ps, …)` tier session `#/ps/session/<tier>`; every third day or unsolved pc → `#/bank/session/pc/next` | Summary table `#/world/place/table`, Paragraph completion |
| ginger | pj, the same way; sp bank rotation | Workshop `#/world/place/loom`, Sentence placement |
| mallow | `nextVerbal(content.ooo, …)` | Observatory `#/world/place/bench` |
| toffee | `#/world/place/wilds` "Run the Gauntlet · about 8 min" | the Gauntlet; Records `#/world/place/hearth` |

- [ ] Add to `check-pet-economy.mjs`: `nextFor` returns a non-null href for
  every pet against the real content registry loaded from disk. Use the
  verify §16 style: import `loadWorldContent` with a file-fetch shim the way
  §16 does now.
- [ ] Commit: `pets: the curator's next activity per pet`.

### Task 7: The village screen — `src/home/village.js`, `src/home/life.js`, `src/ui/styles/home.css`

**Files:**
- Create `src/home/village.js`, `src/home/life.js`, `src/home/cards.js`
  (pet, hearth, satchel and cottage card HTML plus wiring) and
  `src/ui/styles/home.css`.
- Modify `src/world/index.js` (`/world` → `renderVillageHome`;
  `/world/village` → `location.replace('#/world')`) and `index.html` (swap
  `home-world.css` for `home.css`).
- Delete `src/village/screens/home-world.js` and
  `src/ui/styles/home-world.css`.

**Consumes:**
- `loadWorld` (`state.pets` from Task 8; until then call `derivePets`
  directly);
- `PETS` and `LINES`;
- `paths.js`, `sprite.js` and `nextFor`;
- `openModal` and `closeModal` (`ui/modal.js`);
- audio: `play`, `startMusic`, `startAmbience`, `musicEnabled`,
  `setMusicEnabled(on)`. **The signature is one argument; fix the 2.2
  misuse.**

**DOM** (the only permanent chrome is the three HUD pieces):

```
section.cw[data-hour][data-weather]
  h1.sr-only
  .cw-viewport (tabindex 0)
    .cw-map (sized by fit())
      img.cw-art
      .cw-tint, .cw-glows   (CSS layers)
      canvas.cw-life        (ambient particles; 1 canvas)
      svg.cw-clock          (hands)
      .cw-treasures         (treasure overlays)
      button.cw-spot[data-open=chai|…|cottage|clock|hearth]  (invisible hit areas, nameplate on hover/focus)
      .pet[data-pet]        × 6 (button > .pet-shadow + .pet-body > .pet-sprite, .pet-bubble)
  header.cw-hud
    button.cw-flame  (flame glyph · days · village name)
    .cw-hud__right > button.cw-round[data-open=satchel], button.cw-round[data-open=cottage]
  button.cw-today (3 dots · "2 of 3 wishes")
  .cw-toast[role=status]
  .cw-sheet (dialog host)
```

**Steps:**
- [ ] `village.js`: render, camera and input.
  - fit and centre on the plaza;
  - drag-pan;
  - wheel pans, ctrl+wheel zooms, pinch zooms, between 0.85 and 1.8;
  - arrow keys pan;
  - the hit areas;
  - the HUD.
  - The cards come from `cards.js`. Each card opens with
    `openModal(panel, close, {returnTo})`.
  - The return hand-off: read sessionStorage `world:pet`,
    `world:gifts` (JSON bag) and `world:heart`, then clear them. Toast "+6
    Stories, +1 heart with Chai", and that pet hops. `world:focus` pans the
    camera to that pet's home.
  - The intro (spec §3.6), when `valley.awakened_at` is unset.
  - The letter (spec §2.8).
  - Cleanup on `hashchange`: cancel rAF, observers and timers.
- [ ] `cards.js`: the pet card, hearth card, satchel and cottage, exactly as
  spec §3.5.
  - Treasure Make: re-derive, check `canMake`, write the
    `village-treasure` record, re-render, then play the "unlock" sound and
    the treasure-appear animation.
  - The cottage's sound toggles use `setMusicEnabled(on)` and `setSfx` from
    `core/engagement/feedback.js` (match what settings.js uses).
- [ ] `life.js`: `createLife(root, {pets, hour, weather, harmony, flame, treasures, reduced})`
  → `{update(newState), poke(petId), focus(petId), destroy()}`.
  - One rAF loop.
  - Pets are a state machine (spec §3.3) using `paths.route`. The hop is a
    sine arc with squash and stretch; the flip is `scaleX(-1)` on
    `.pet-body`.
  - Blink, talk and sleep frames switch `--f`.
  - Chats pair two free pets at plaza spots.
  - Deliveries show a `giftIcon` held above the pet.
  - Night sends pets home to sleep.
  - The canvas draws fireflies, butterflies, leaves, campfire sparks, smoke,
    pond glints and ripples, birds, motes and rain. Particle counts scale
    with harmony and treasures.
  - The tint and glow layers are set from the hour (CSS custom properties).
  - The clock hands are updated every 20 s.
  - Treasure overlays are absolutely positioned SVGs at the `paths.js`
    anchors. The swing and kite animate.
  - Pause when `document.hidden`.
  - Reduced motion: static pets at their stands, no canvas loop, a static
    tint.
- [ ] `home.css`: every style for the above, light and dark.
  - The cards follow the palette.
  - The phone bottom sheet uses `max-height: 82svh`.
  - The desktop card is 400 px wide, anchored right.
  - Focus rings use honey.
  - Every target is at least 44 px.
  - No horizontal overflow at 360 px.
- [ ] Browser check through a scratch script (rebuilt in Task 12 as
  `check-village.mjs`):
  - at 390×844 and 1440×900;
  - 6 `.pet` elements;
  - the pets move: their position changes within 4 s at hour=afternoon;
  - tapping `.pet[data-pet=chai]` opens a dialog whose `h2` contains "Chai",
    and its primary link's href starts with `#/rc/` or `#/world/place/`;
  - the satchel, cottage and today buttons all open dialogs;
  - Escape closes and returns focus;
  - no console errors.
  - Take screenshots at morning, dusk and night, and in dark theme. Read
    them, then judge clutter and charm against spec §8.
- [ ] Commit: `home: the pet village`.

### Task 8: Wire the state — `world/state.js` and its consumers

**Files:**
- Modify `src/world/state.js`: replace `deriveVillage`, `purse`, `stage`,
  `builds` and `observatory` with `state.pets = derivePets(state, records, content, now)`.
- Rewrite `worldChangeLine` → `petChangeLine(before, after)`, which returns
  `{pet, gifts, line, heart}`.
- `newlyBuildable` → `newlyAffordable(before, after)` returns the next
  treasure if it has just become affordable.
- Fix every consumer listed by
  `grep -rn "\.village\b\|worldChangeLine\|newlyBuildable" src`:
  - `rc/session.js`, `second-look.js`, `round.js`, `wilds.js`: pass the new
    shapes to `renderResult`;
  - `growth.js` (`s.village.*` rows → treasures made, harmony);
  - `collections.js` (buildings → treasures);
  - `companion.js` (drop `village` lines; keep `valley` name storage);
  - `place.js` warmth → `state.pets.harmony`;
  - `wilds.js` waymarks (drop the road level);
  - `hearth.js` (Task 9 rewrites the page).
- `reading.observatory` (night reading) has its threshold changed to "Chai
  has ≥ 3 hearts". Rename the copy "From Chai's lamp".

- [ ] Run `node tools/check-pet-economy.mjs` and
  `node tools/check-hostile-records.mjs`. Expect both to PASS.
- [ ] Commit: `world: state derives the pets; the village economy is gone`.

### Task 9: Hosted screens and painted backdrops

**Files:**
- `src/app.js`: route → `data-host`.
- `src/world/stage.js`: the painted backdrop div replaces the canvas.
- `src/world/screens/place.js`: the hero is the painted crop plus the host
  pet; the placewick becomes the host bubble using `LINES`.
- `round.js`, `wilds.js`, `hearth.js`: painted backdrops.
- `src/world/garden-backdrop.js` and `src/world/screens/backdrop.js`: delete
  them, and point their callers (`language-garden/screens/session.js` and
  `plant.js`, `rc/second-look.js`, `rc/session.js`) at a
  `paintedBackdrop(el, petId)` from `sprite.js`.
- `src/world/rewards.js` and `src/world/screens/result.js`: the pet
  celebration, gift icons, ring bonus and heart.
- `language-garden/screens/session.js`: the growth beat shows Matcha's gifts.
- CSS: `world.css`, `game.css` and `components.css` session-bar host chip
  (`[data-host] .session-bar::before`, portrait).

- [ ] The host map in `app.js`. Use `petForPlace` for
  `#/world/place/<slug>` and `#/round/<region>`, and `petForModule` for
  `#/(rc|pj|ps|ooo|wd)…`, `#/bank/session/<type>` and `#/garden…`. Set
  `html[data-host]`, and remove it on `#/world`, `#/settings` and
  `#/growth`.
- [ ] Results:
  - `renderResult(o)` gains `o.pet`, `o.gifts` (bag), `o.ring` (bool) and
    `o.heart` (bool). It renders `.result__pet` (sprite, happy frame, hop)
    and `.won` with `giftIcon` chips. It sets sessionStorage `world:pet`,
    `world:gifts` and `world:heart` for the village toast.
  - `worldReward(session, items)` does the same in its strip.
  - Gifts and ring for a just-finished run:
    `giftsBetween(before.pets, after.pets)`.
  - A module with no `before` state derives once from records before
    saving.
- [ ] Commit: `screens: every screen hosted by its pet, painted backdrops`.

### Task 10: Clock tower, cottage, records and nav

**Files:** `src/shell/growth.js`, `src/shell/settings.js`,
`src/world/screens/hearth.js` (records page), `src/ui/components/cat-nav.js`,
`world.css` (reach/collections), `components.css` (`.srow`).

- [ ] **Growth.** The header reads "The clock tower", with a painted crop of
  the tower. The four `.ability` cards with `<cat-plant>` become six
  `.petrow` rows: portrait, name, subject, the existing measure for that
  subject, hearts and mood word. Every deeper section is kept.
- [ ] **Settings.** A painted cottage header reading "Your cottage" plus the
  village name. Rows are restyled; behaviour does not change.
- [ ] **Records** (`#/world/place/hearth`). Re-themed with Toffee: day run,
  kindling, harmony, treasures made, stars. Drop the buildings shelf and the
  coins.
- [ ] **`cat-nav`.** Village `#/world`, Progress `#/growth`, Cottage
  `#/settings`. Inline line-SVG icons; no `icons.js` art import.
- [ ] Commit: `screens: clock tower, cottage, records and nav in the village language`.

### Task 11: Remove the canvas village and rewrite the gates

**Files:**
- Delete:
  - `src/village/{screens/village.js, scene.js, renderer.js, terrain.js, life.js, living-art.js, grove.js, next.js, sprites.js, state.js}`
  - `src/world/{menu.js, craft-ui.js}` and the parts of `icons.js` that use
    art;
  - the Cute Nature PNGs no longer referenced.
- Slim `art.js` to the plant stills for `<cat-plant>`, or move them into
  `cat-plant.js`.
- Slim `defs.js`, or delete it after moving `STAGES`/`WAYMARKS` users.
- `tools/verify.mjs`:
  - §16: drop the goods/orders assertions; run `check-pet-economy.mjs`.
  - §17: drop the village art reads; run `check-pets.mjs`.
  - §22: read `home.css` pairs.
  - §23: run `check-village-data.mjs`.
  - §23b: run `check-village.mjs`.
- `tools/check-reach.mjs`: drop `#/world/village` and `checkSheet`; add the
  `#/world` card checks.
- `tools/check-resume.mjs`: drop the village leg.
- `tools/check-rendered-contrast.mjs`: drop the `SEED` village records; add
  `village-treasure`.
- `tools/check-interruption.mjs`: drop the `deriveVillage` part.
- Delete `tools/check-world.mjs` and `check-world-data.mjs`.
- Replace `tools/check-home-world.mjs` with `tools/check-village.mjs`.
- Delete `tools/implement-village-life.mjs` and `preview-village.mjs`
  (untracked).
- Run `node tools/build-precache.mjs`.

- [ ] Run
  `grep -rn "village/\(scene\|renderer\|terrain\|grove\|state\|screens\)" src tools`.
  Expect no hits.
- [ ] Run `node tools/verify.mjs`. Expect exit 0 (about 10 minutes).
- [ ] Commit: `3.0: the canvas village retired; gates rewritten for the pet village`.

### Task 12: Verify like a learner, polish, document, push

- [ ] Real-browser tours (scratch scripts):
  1. **Fresh learner, 390×844:** the intro, Chai's card, start the RC
     passage, answer, finish, return, the toast and hop, the satchel.
  2. **Seeded learner a week in:**
     - Matcha neglected for 4 days: Matcha wilting; Chai's ring line reads
       low; harmony low; a letter is waiting.
     - Make a treasure: it appears on the map.
  3. **Desktop 1440×900** at morning, dusk and night; dark theme; reduced
     motion.
  4. Settings, Growth and place screens, plus one session per module: the
     host chip and backdrop.
  5. **Perf:** p50 rAF gap at most 18 ms over 10 s on the village (headless
     software raster).
- [ ] An adversarial review workflow:
  - a code reviewer (correctness, leaks, cleanup);
  - a visual critic (screenshots against spec §3–§4, clutter, charm,
    consistency);
  - an a11y check.
  - Fix what survives.
- [ ] Docs:
  - `README.md` ("The first minutes" rewritten), `STATUS.md`,
    `CHANGELOG.md` 3.0.0;
  - bump `src/app.js` VERSION to 3.0.0;
  - `KNOWLEDGE/01_KNOWLEDGE/CAT OS — THE WORLD (1.0).md`: add Part A11 "3.0
    — the pet village", with a note that it overrides Part B's
    retention-hook ban.
- [ ] Memory: update `cat-os-world-architecture.md` and
  `cat-os-pet-village.md`.
- [ ] Run `node tools/verify.mjs` once more. Then commit and
  `git push origin main`.
