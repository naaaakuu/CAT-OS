# STATUS

> The honest, current state of CAT OS. One line per system:
> **shipped** (works today) / **building** (in progress) / **designed** (docs only).
> Update this file with every milestone. Stale status is a bug (Rule 1).

_Last updated: 2026-10-03: 3.1.0, the helping village. One loop: help a friend (finish any round), earn 1 to 4 stars, and the village level rises and decorates the map. The gift ring, gift types, satchel, treasure recipes, wishes and letters are retired; today's three friends (a "!" each, a 5-star gift for all three) and Toffee's fire carry the daily rhythm. Each friend has a trouble told in five heart chapters that decorate their home, a best friend, a gait on its own two feet, chores with props, greetings and a voice, and lines built from the learner's own answers. A composed theme plays everywhere, always on. Place screens show all their content. No em dashes in anything a learner reads. App version 3.1.0._

_3.0.0, the pet village. One painted village replaces the canvas village. Six pets live in it, one per VARC subject (Toffee, Chai, Matcha, Mochi, Ginger, Mallow). Their moods, the gift ring, friendship, nine treasures, daily wishes, Toffee's flame and letters are all derived from learning records; the one new record kind is `village-treasure`. The painting itself moves: 36 pieces of it, cut out pre-feathered. Every other screen is hosted by its pet. The canvas village, its art and its economy are deleted. App version 3.0.0._

_2.2.0 — one art pack. Every picture in the village is a sprite from the "Cute Nature" pack (`assets/art/`); the hand-drawn canvas art — people, animals, the river, the effects, the glyph icons — is deleted. The Hearth and the Reading House are the pack's houses; the Word Garden, the Root Workshop, the Loom and the Market are open-air yards built from its props; Wick is the pack's cat; the interface follows the pack's studio design. No content changed. App version 2.2.0._

_2.1.4 — the screens no gate could see. The Gauntlet's question had been rendering at 1.14:1 in both themes and "Re-read the passage" sat two pixels tall above the top of a scroll container: neither is a route, and §24 only opened routes, so a route may now carry the taps that reach a state. Importing a backup was a confirm() whose CANCEL performed a merge — it is the app's own sheet now, a merge no longer renames the village, and Settings repaints afterwards. A resting item is declined rather than re-served. App version 2.1.4._

_2.1.3 — the interruption pass. Every engine now carries a run across a refresh: Para Jumbles, Para Summary, Odd One Out and Word DNA joined the reading run and the banks, a draft cannot claim a mark, and a draft counts time on task, so a set left overnight is no longer recorded as an eight-hour set that failed its pace. A settled skill that goes quiet comes back to the curator once. Callouts for buildings out of view pin to the edge of the frame instead of vanishing. One new gate (§30) drives all of it in a real browser. App version 2.1.3._

_2.1.2 — the polish, reliability and systems-hardening pass. Dark mode is a designed theme rather than an inverted light one (78 rendered-contrast failures → 0). The service worker installs in resumable batches and promotes transactionally, so a failed upgrade costs nothing and a content bump no longer deletes a 435-file library. The cold open is 55 modules, not 153. A tree was standing in the river; the map is validated as data now and as a running scene. The ledgers that had been counting for two releases speak to a learner in four places. Nobody had ever pressed Tab. 90+ defects found and fixed, each reproduced in a real browser. Six new gates (§23, §23b, §24, §26, §27, §28). App version 2.1.2._

## What changed in 3.1.0 (the helping village)

| Area | State | Notes |
|---|---|---|
| **The loop** | **shipped (3.1.0)** | Stars per round (1 to 3, plus 1 flawless), village levels with nine decorations, hearts with home decorations, today's three and the daily gift, Toffee's fire with spare logs. Derived in `src/pets/economy.js` |
| **The home screen** | **shipped (3.1.0)** | Top bar (fire, level and stars, friends, cottage), the big Help button, today's faces, level-up and gift celebrations, Toffee's four-line welcome, greetings, the welcome back |
| **The friends** | **shipped (3.1.0)** | 384 px sheets, feet that step (`petRig`), six gaits, chores with props and particles, best-friend visits, voices, data-driven "noticed" lines |
| **Sound** | **shipped (3.1.0)** | A composed 16-bar theme with per-place lead instruments and a focus mix, always on from the first touch |
| **Places** | **shipped (3.1.0)** | Pages, not pull-up sheets: every passage, tier and field visible |
| **Known** | open | The theme is synthesized and cannot be heard by the gates; a real listen on a phone is the test. The plaza bunting and home bunting share one look |

## What changed in 3.0.0 (the pet village)

| Area | State | Notes |
|---|---|---|
| **The village** (`#/world`) | **shipped (3.0.0)** | One painting, full-bleed. Drag, wheel and arrow-key pan; pinch and ctrl+wheel zoom. Three pieces of chrome: the flame, the satchel and cottage, and today's wishes. `#/world/village` redirects here |
| **The living painting** | **shipped (3.0.0)** | 36 patches cut from the painting, pre-feathered in `assets/art/home-motion-v1.png` (`tools/bake-motion.mjs`) and pixel-identical at rest. They turn the gear and wheels, run the water, stir the cloth and sway eleven trees. 25 painted lamps breathe a halo. Chimney smoke and teapot steam. 16.7 ms median frame on an Intel HD 520, phone and desktop |
| **Six pets** | **shipped (3.0.0)** | Five baked frames each. They walk the traced path graph, blink, chat, carry gifts round the ring, sit by the fire and sleep at night. Mood sets how far they wander. Reduced motion keeps them at home |
| **The economy** | **shipped (3.0.0)** | Everything is derived on load (`src/pets/economy.js`): mood with a 36 h half-life, the gift ring with doubling, harmony, five hearts with story lines, three daily wishes, the flame with kindling, letters after a day away, festival nights, and nine treasures made in order. Existing learners keep their history: past runs become gifts and friendship |
| **Hosted screens** | **shipped (3.0.0)** | Every lesson stands in a painted crop of its host's home; reading runs, word rounds and the Gauntlet carry a host chip. Place screens show the host at its own door. Results show the pet, the gifts counted up, the ring bonus, a new heart and a makeable treasure, and every room ends "Back to the village". Progress is the clock tower, Settings the cottage, Records kept by Toffee |
| **One palette** | **shipped (3.0.0)** | Warm cream, sage, honey and terracotta; forest-night dark theme. `tokens.css`, `world.css` and `game.css` agree. AA in both themes, rendered result screen included |
| **The canvas village** | **removed (3.0.0)** | `src/village/` (13 files), `village.css`, the old menu and `home-world.css`, the Cute Nature sprites nothing used (61 PNGs), and the goods, coins and orders economy. The plant stills `<cat-plant>` draws are kept |

### Known and not yet addressed (3.0.0)

| Item | Why it matters |
|---|---|
| The motion atlas is 600 KB | It loads after the village paints and is invisible until it does, but it is in the precache, so a first install downloads it |
| Pets idle on a slow device | The life loop clamps each frame to 50 ms, so at a few frames a second the pets move in slow motion. Fine on a phone; a very slow machine sees them dawdle |
| Arguments (6 items) and Paragraph Completion (27) still run dry quickly | Unchanged from 2.x; the pets now send learners there sooner |
| The Mirror Pond and Vine Terraces word-bank shelves have no content | Unchanged from 2.x |

## What changed in 2.2.0 (the art pack)

| Area | State | Notes |
|---|---|---|
| **Village art** | **shipped (2.2.0)** | `art.js` is a sprite bank over the pack's 65 baked PNGs, same synchronous contract; the five canvas-recipe files are deleted |
| **Buildings** | **shipped (2.2.0)** | Hearth L1–5 and Reading House L1–4 from the pack; four workplaces are yards that grow a prop set per level |
| **The map** | **shipped (2.2.0)** | No river or bridge; one pond, stepping-stone paths, the pack's trees and props; coordinates unchanged and gated (§23, §23b) |
| **Life on the map** | **retired (2.2.0)** | The pack has no people or animals: only Wick walks. Neighbours live in the board and popovers |
| **Interface** | **shipped (2.2.0)** | The pack's studio language and a line-icon set |

### Known and not yet addressed (2.2.0)

| Item | Why it matters |
|---|---|
| Daylight bakes only | Night is the renderer's tint over daytime sprites; windows do not light. The pack has no night or seasonal variants |
| No people or animals on the map | The village is quieter than 2.1; the next art batch should bring villagers and small life |
| Yards, not houses, for four workplaces | They read as places, but a house per workplace would read more strongly |

## What changed in 2.1.3 (interruption, revisiting, and the edge of the frame)

_Three items from the 2.1.2 list, chosen because a daily learner meets them
first. Each was reproduced against the running app in a real browser, fixed,
and re-driven; the tour that proved them is verify §30 now._

| Area | State | Notes |
|---|---|---|
| **Interruption, everywhere** | **fixed (2.1.3)** | Para Jumbles, Para Summary, Odd One Out and Word DNA recorded nothing until the last tap; a refresh threw up to a quarter of an hour away. Each answer writes a draft now and the set resumes where it was, saying so once — including inside a Word DNA family, between the Predict and its Applies. A draft carries what the learner did, never the verdict: restore re-marks every choice, so a hand-edited draft cannot claim a mark. Proven in a real Chrome: answer, refresh, resume, finish, and the pre-refresh answer is in the record |
| **Time on task** | **fixed (2.1.3)** | Every draft, reading and banks included, carried the wall-clock start, so a set resumed the next morning was recorded as an eight-hour set, failed the "in time" check in the economy and cost the learner stars for having been interrupted, and inflated total practice time. Drafts carry elapsed time now: six engines, one rule. A draft is cleared only after the record is saved, so a failed save leaves the way back |
| **A settled skill that went quiet** | **fixed (2.1.3)** | A mastered-then-abandoned skill was invisible to the curator: not weak, not new, never offered again. The ledger marks a settled skill *due* after a level-scaled interval (3 / 7 / 14 / 30 days) and the curator offers it once, behind anything weak and ahead of anything new. One visit resets its clock |
| **Off-screen callouts** | **fixed (2.1.3)** | A callout whose building was out of view went `opacity: 0`, so a pointer user panning the valley could not see that anything wanted them. It pins to the edge of the frame now, smaller, with a pointer toward its building; pips off the same edge stack instead of piling up; a tap brings the village to the building. Four of four pinned after a pan to the far corner, all inside the frame, tappable, 44 px, none overlapping |

### Known and not yet addressed

| Item | Why it matters |
|---|---|
| Arguments (6 items) and Paragraph Completion (27) still run dry quickly | A daily learner reaches the bottom of Arguments in one sitting. The village now offers them, which makes the shortage arrive sooner |
| The Mirror Pond and Vine Terraces word-bank shelves have no content | `confusable` and `decode` bundles are authored nowhere, so those two shelves render nothing at all. Nothing breaks; the shelf is simply not there |
| Five weakness models still disagree | `readingWeakness` is question-type-shaped; `skillLedger` is skill-shaped and spans every module; `patternLedger` is finer than both. The curator reads all three, but one of them should be a view over another rather than three independent counts of the same answers |
| ~20 button recipes, 20 corner radii, 30 shadow recipes | Four button families across four stylesheets. Each is individually correct; together they are more materials than one product needs |
| The village scene is rebuilt whole on every craft | 11.4 ms is under a frame, but the static half (terrain, trees, houses) does not change and is rebuilt anyway |
| Orders already on the board change under the learner | Amount, good and price are recomputed from today's level and today's buildings every time the village derives, so building a Loom can change what the neighbour standing at the board is asking for. Fixing it honestly needs a posted-order record, which is a new record kind |
| A slow first visit is 30 seconds | 800 KB over 400 kbps is physics, and the app now says so rather than claiming it failed — but the shell could be split so the village paints before the rooms arrive |
| The Reading House's ground shadow reaches the river | At level 1 the drawn mass is entirely on land; only the 0.1-alpha shadow ellipse touches the water. The placement predicates use the symmetric `def.hit`, not the sprite's real asymmetric mass, so §23 cannot see it |
| The Language Garden and the word rounds still record nothing until the last click | A Grow session and a word round are two to four minutes, which is why they were not on the 2.1.2 list; they are the last two engines without a draft |

## What changed in 2.1.2 (polish, reliability and systems hardening)

_Not a feature release. Everything below was reproduced against the running
app in a real browser, fixed, and then re-driven. The standard was: if a user
encounters it, it should feel intentional._

| Area | State | Notes |
|---|---|---|
| **Dark mode** | **fixed (2.1.2)** | Two competing `--g-*` palettes in two stylesheets meant a token's light value and its dark value came from different files. `world.css` owns the palette now and `game.css` keeps geometry and type. Every stage-backed route rebinds both `--g-*` and `--color-*`. **78 rendered-contrast failures → 0** across ten risk routes in both themes |
| **Contrast, as pixels** | **shipped (2.1.2)** | `tools/check-rendered-contrast.mjs` (§24) opens each route in real Chrome, paints every glyph transparent, screenshots both, and takes the median per-pixel WCAG ratio between the ink and whatever is actually behind it — a card, a gradient, a veil over a painted canvas. It cannot be fooled by a correct token that a later stylesheet overrides |
| **The offline promise** | **fixed (2.1.2)** | The install was one atomic `addAll` of 594 requests: one dropped request on patchy mobile data and nothing at all was cached. It is staged and resumable now — batches of twelve, the cache itself the checkpoint — and version promotion is transactional, so a half-finished upgrade costs nothing and a known-good library is never deleted before its replacement is safely there. Proven by driving a 15→16 content bump with the network blocked: the 435-file library survived |
| **The cold open** | **fixed (2.1.2)** | 153 module requests became 55, and an 807 KB registry became a 168 KB boot subset. One optional module failing no longer stops the app; a boot that never finishes says so after eight seconds instead of showing "Loading…" forever |
| **The map** | **fixed (2.1.2)** | A tree stood in the middle of the river, and so did a bench, a cottage spot, a path and a graph node — because `invalidSpot` thought the river was 28px wide and the renderer paints it 54. Two gates now: §23 validates the DATA in pure Node (628 coordinates), §23b drives four village states across three hours in a real browser and checks 3450 placed objects and ninety seconds of walking |
| **The living village** | **fixed (2.1.2)** | Every delivery, build and craft teleported every walker back to its seeded start; every character handle pointed at a discarded actor after the first refresh; workers never played their work animation while anything was on the shelf; neighbours walked through walls and across the pond; at night the board said somebody was waiting and nobody was there |
| **What the ledgers know** | **fixed (2.1.2)** | The trap, pattern and skill ledgers had been derived correctly and read by nothing for two releases. One sentence, in four places, only when there is something true to say: the result screen when a habit has caught this learner four times AND again just now; the building's card; Growth's "what would move most"; and the curator, which aims at the reasoning pattern inside the already-aimed pool. All 152 patterns are mirrored into the code so they can be named offline |
| **Accessibility** | **fixed (2.1.2)** | The global focus ring was silently cancelled on eight component classes — every passage row, every primary call to action, every Settings toggle. Sixteen of Settings' nineteen controls were under 44×44 and none answered a press. The app menu claimed `role="dialog"` and kept none of it. Answering announced nothing and threw focus to the top; the result screen announced 682 characters at once. §28 walks every route with a real Tab key in both themes |
| **Interruption** | **fixed (2.1.2)** | A learning session persisted nothing until the very last click; a refresh one tap from the end threw the whole thing away. Each answer writes a draft now and the passage offers to carry on |
| **Performance** | **fixed (2.1.2)** | Half of the 47 ms village rebuild was `distToPolyline` walking polylines the prop was four hundred units from, with `Math.hypot` inside the loop. Median rebuild **47.8 ms → 11.4 ms**; worst frame in ordinary play 34.5 ms → 20 ms |
| **Honest failure** | **fixed (2.1.2)** | Every async path has a loading, a success, a failure and a retry. One malformed record no longer bricks the village; a failed registry is no longer mistaken for an empty one; a screen that has painted nothing for twelve seconds says so and offers a way back |

### Known at 2.1.2 — the interruption, skill-decay and callout lines were addressed in 2.1.3; the rest are repeated above

| Item | Why it matters |
|---|---|
| Arguments (6 items) and Paragraph Completion (27) still run dry quickly | A daily learner reaches the bottom of Arguments in one sitting. The village now offers them, which makes the shortage arrive sooner |
| The Mirror Pond and Vine Terraces word-bank shelves have no content | `confusable` and `decode` bundles are authored nowhere, so those two shelves render nothing at all. Nothing breaks; the shelf is simply not there |
| Five weakness models still disagree | `readingWeakness` is question-type-shaped (it counts reading questions wherever they were answered, including the second look); `skillLedger` is skill-shaped and spans every module; `patternLedger` is finer than both. The curator reads all three now, but one of them should be a view over another rather than three independent counts of the same answers |
| The skill ledger has no time decay | A mastered-then-abandoned skill is never resurfaced |
| ~20 button recipes, 20 corner radii, 30 shadow recipes | Four button families across four stylesheets. Each is individually correct; together they are more materials than one product needs |
| The village scene is rebuilt whole on every craft | 11.4 ms is under a frame, but the static half (terrain, trees, houses) does not change and is rebuilt anyway |
| Para Jumbles, Para Summary, Odd One Out and Word DNA still record nothing until the last click | Reading runs and bank sets carry across an interruption now; those four engines each need the same `snapshot()`/`restore()` pair. A Loom tier is the longest single run in the product |
| Off-screen callouts are `opacity: 0` | Keyboard users can reach them (focus pans the camera); pointer users still cannot see what is off-screen |

## What changed in 2.1.1 (launch readiness)

_A defect pass, not a feature release. Every item below was reproduced against
the running app in a headless Chrome and measured after the fix._

| Area | State | Notes |
|---|---|---|
| **The reading screen** | **fixed (2.1.1)** | The passage was rendering at **1.14:1** — `world.css` darkens `.run` and repaints only the bar, while the prose kept `game.css`'s near-black ink. `#/rc/session/` had been added to `isWorldRoute`, which unmounted the very stage whose CSS makes the screen readable. Immersive chrome and standing somewhere are separate questions now. **13.4:1**, on a much stronger veil so the room does not compete with the argument |
| **Data safety** | **fixed (2.1.1)** | Backup import in "replace" mode cleared every store before validating the file; a v1 backup wiped `learning`, where the whole world lives. Validated in full first; undeclared stores untouched |
| **Interruption** | **fixed (2.1.1)** | A service-worker update called `location.reload()` on `controllerchange` — four minutes into a five-minute passage it ended the run and recorded nothing. Updates pause during a run; a late controller change waits |
| **Dead upgrades** | **fixed (2.1.1)** | Night Reading (1500 coins) was gated on a record kind 2.1 stopped writing. The Road Out's level 2 (700 coins, "pay half again") was read and dropped. Reduce motion was inert in both directions |
| **Wrong numbers** | **fixed (2.1.1)** | "Up to 3 coins" for a Gauntlet run paying 50–188. "About 1 min" for a tier of 8–13 items played as one timed set, on the Loom, the Table and the Bench |
| **Rendering** | **fixed (2.1.1)** | 116 scaled props per view drawn 10.5 device px off their anchors; a 5400² (117 MB) ground canvas at max zoom, past iOS's per-canvas cap; the living village teleported back to its seeds on every rebuild (9 of 9 unchanged now, 6 of 9 teleported before); rain that flickered instead of falling |
| **Adaptivity** | **fixed (2.1.1)** | The curator aimed question TYPES at SKILL keys — **10 of 27 types could aim a passage; 27 of 27 now**. `pickSet` returned just-missed items first. Garden Grow sessions counted as correct answers in the root ledger. Growth loaded all 115 passages to read three |
| **Accessibility** | **fixed (2.1.1)** | `#view` was an `aria-live` region containing a per-second clock; answering destroyed the focused button; the village had no keyboard route at all; its dialogs honoured none of `role="dialog"`; Para Jumbles' `aria-label` hid the sentences; `--color-ink-3` and `.vbtn` failed AA |
| **Reduced motion on canvas** | **fixed (2.1.1)** | The village is nothing but motion and CSS cannot reach inside a canvas. A still mode freezes time and `scene.update`; the camera still pans. **120 repaints per 2s → 0** |
| **Contrast, verified** | **shipped (2.1.1)** | `tools/check-contrast.mjs` computes real WCAG ratios over the tokens in both themes plus the village buttons; `verify.mjs` §22 runs it. 28 pairings, all AA |

### Known at 2.1.1 — every line below was addressed in 2.1.2 except where the table above repeats it

| Item | Why it matters |
|---|---|
| Service-worker install is one atomic `addAll` of 594 requests | One dropped request on patchy mobile data and the offline promise silently does not happen |
| A `CONTENT_VERSION` bump evicts the whole content cache | Deletes the library `library-sync` spent the learner's mobile data fetching |
| A corrected content file cannot reach an installed learner | The fetch handler matches without a revision, so fixes need a cache wipe |
| Arguments (6), Paragraph Completion (27) and the Word Bank run dry quickly | A daily learner reaches the bottom of Arguments in one sitting |
| 153 ES modules and ~2.8 MB on a cold open; one failed module shows "Loading…" forever | The error handlers live inside `app.js`, so a boot failure has no surface |
| The router has no staleness guard | Two overlapping renders can strand the learner on the wrong screen |
| The trap and pattern ledgers are derived and never read | The copy for seven trap families is authored and never reaches a learner |
| Off-screen callouts are `opacity: 0` | Keyboard users can now reach them (focus pans the camera); pointer users still cannot see what is off-screen |
| The skill ledger has no time decay | A mastered-then-abandoned skill is never resurfaced |
| ~76 KB of provably dead CSS, 309 raw hex literals, 29 distinct px font sizes | Four parallel design systems in six render-blocking stylesheets |

## What changed in 2.1.0

| System | State | Notes |
|---|---|---|
| **The art** (`src/village/brush.js`, `art-*.js`, `art.js`) | **shipped (2.1.0)** | 47 recipes. An oblique house builder (front wall, receding side wall, gable/hip roof, chimney, dormer, tower and dome, awning, sign, lamp, banner, bell, water wheel; stone / timber / plank / glass walls) draws every named building at every level, seeded cottages, a barn, a mill, a schoolhouse and a three-stage scaffold. A character rig with faces, hair, hats, props, a four-frame walk, work animations per job, carrying, cheer, wave, sit, blink. Wick with a bell collar and a lantern: sit, walk, look, jump, sleep |
| **The chain** (`defs.js`, `economy.js`, `state.js`) | **shipped (2.1.0)** | Raw goods (Pages, Seeds, Roots, Thread) go to their building's queue; the worker crafts them one at a time on a short clock into made goods (Books, Blooms, Ink, Cloth) that sit on a shelf until collected; only made goods trade. The queue is a derived simulation over the timeline (no new record kinds beyond `village-collect`); helpers add raw units on a long clock while the shelf has room |
| **The neighbours** (`defs.js`) | **shipped (2.1.0)** | Ten people with jobs, looks and reasons per good. Mira the schoolteacher lives here from the first minute and posts the first order (one Book for the schoolhouse); the rest move in as houses are built. A neighbour whose order is ready waits at the order board by the Hearth's door and carries the goods home |
| **The village screen** (`screens/village.js`, `village.css`) | **shipped (2.1.0)** | No bottom card, no dark bar. Callouts over the world (ready ×N, a working ring with seconds, Build / Raise, wanted, Deliver); a character-led popover per building with the queue strip and one big button; the order board and the barn; Wick's speech bubble anchored to him in the world; collect flights that pop off the shelf; a construction sequence (materials, frame, walls, builder, dust, bounce, sparkles); a closer camera; paper-and-wood panels and tactile buttons |
| **The learning entry** (`src/village/next.js`) | **shipped (2.1.0)** | Every popover's button goes straight into the curator's next passage (the shortest foundation passage on the first read; the second look when four questions got away), word round, root family or jumble set, with the time and what it makes on the button |
| **A daily rhythm** (`scene.js`) | **shipped (2.1.0)** | Morning commute, work by day, benches at dusk, everyone indoors at night with lit windows; lamps, fireflies, the moon on the pond; the river's stone banks and bridge, the pond's jetty and rowboat; yards with woodpiles, laundry, carts and barrels |
| **Settings** (`src/shell/settings.js`) | **shipped (2.1.0)** | Audio (music & ambience on/off + volume, sound effects on/off + volume), Feel (haptics, reduce motion), Reading (size, theme), Your data (export/import/storage), About. Every control works and persists; the focus-noise system and the intro-reset rows are removed |
| **Audio** (`core/engagement/feedback.js`, `world/audio.js`) | **shipped (2.1.0)** | Music and effects on by default at full volume; music begins on the first gesture (autoplay law) and the preference is remembered; the settings screen retunes the running music live |
| **Verification** | **shipped (2.1.0)** | §16: eight goods in four chains, the clock, the neighbours, the helper's cap; §17 reads every art file. All checks pass |
| **Performance** | **measured (2.1.0)** | Busy seeded village, 390×844 at 3×, software raster: p50 16.6 ms by day, 21 ms at night; drag p50 10–19 ms; open → painted 1.4 s; ~400 scene objects; 8–10 MB heap |

## What changed in 2.0.0

| System | State | Notes |
|---|---|---|
| **The village** (`src/village/screens/village.js`) | **shipped (2.0.0)** | The home screen is a village, not a map: the Hearth in the middle, five workers at their doors, animals, water, weather, a road out. HUD with the name and level, coins and the goods in store; bubbles over buildings; one card that says what to do, what it makes and why; building sheets; the Market board; the barn; deliveries, collection and construction with the goods and coins seen moving |
| **The economy** (`src/world/economy.js`) | **shipped (2.0.0)** | Pages · Blooms · Roots · Thread, one per star (one more if flawless), and Coins. Orders are deterministic, only ask for what the village makes, and pay more as the village grows. Every build asks for standing earned by learning. Amber/Ink/Thread/Ember, the works, the asks and the Workshop are retired |
| **The world as data** (`src/village/defs.js`) | **shipped (2.0.0)** | Goods, characters, seven buildings with levels (cost, standing, effect, art), five plots, ten houses, order reasons, stages. A second world is another file |
| **The derived village** (`src/village/state.js`) | **shipped (2.0.0)** | Five record kinds → stock, coins, levels, open orders, helpers on the clock, worth → level → stage, the tip, the onboarding step. Nothing stored back; a backup carries the village |
| **Helpers** | **shipped (2.0.0)** | Level three puts a worker to work alone — one good every three hours, capped — and asks for mastery first (eight passages read well, three at three stars; 120 words held; fourteen families grown; forty items solved with twelve at three stars) |
| **The first minutes** | **shipped (2.0.0)** | The mark, the glide, Wick's four lines, Ada's one-Page order, the shortest foundation passage, the Page flying home, the delivery, the Word Garden built, the name — each step derived from records, so closing the app mid-way loses nothing. Played end to end in a real browser by `tour-loop.mjs` |
| **The art** (`src/village/art.js`) | **shipped (2.0.0)** | 39 recipes drawn with the canvas path API into cached sprites: buildings at every level, five workers with poses (idle, walk, work, cheer, wave), Wick with his lamp, sheep, chickens, a dog, ducks, koi, trees in three poses, props, icons, bubbles. No image assets, no emoji |
| **The environment, carried forward** (`scene.js`, `terrain.js`, `grove.js`) | **shipped (2.0.0)** | The hour's light on everything; windows, lamps and the moon on the pond at night; the river's flow and glints; koi per twelve twins; ducks; birds; butterflies and pollen; fireflies; leaves, petals, rain, snow, fog; cloud shadows; swaying trees; smoke; the Rootwood's grove and growth moment in the same hand. Music and ambience untouched |
| **The renderer** (`src/village/renderer.js`) | **shipped (2.0.0)** | Snapped zoom, sprites at the exact device scale blitted at whole pixels, 1:1 ground, baked tint, cached glows and poses, warm-up after first paint. Software-raster home frame 386 → 22 ms by day; open → painted 1.3–1.6 s |
| **Rooms and places** | **shipped (2.0.0)** | The learning rooms are unchanged in pedagogy; the place screens sit on the village's stills; results hand back with goods flying into the building that made them; "Your standing" replaces the Hearth's tabs |
| **Verification** | **shipped (2.0.0)** | §16 covers goods, orders, worth and the derived village (helpers included); §17 the art and the workers. All checks pass |


## What changed in 1.3.0

| System | State | Notes |
|---|---|---|
| **The valley begins empty** (`world/growth.js`) | **shipped (1.3.0)** | Nothing the map paints is a constant any more. Trees, scrub, stumps, terraces, workshops, bridges, houses, people, rocks and tufts are all derived from records through one growth model with a square-root curve, so the first twenty words change the valley more than the next two hundred. A new valley is sixteen saplings, a small house, stepping stones and three spots marked for planting |
| **The wild recedes** (`engine/map.js`) | **shipped (1.3.0)** | Untended ground is heather, bracken, bare earth and scree, strongest at the very beginning and fading as the place is worked. Barren had to be beautiful, not empty |
| **The valley has a stage** | **shipped (1.3.0)** | Bare ground → a clearing → a settlement → a hamlet → a village → a town → a valley known for its readers. On the HUD beside the stars, and Wick notices the first time you come home to a new one. `verify.mjs` refuses a stage nobody has a line for |
| **The Workshop is a shelf** (`screens/hearth.js`) | **shipped (1.3.0)** | Two across, each card a picture of the thing it builds, its name and one state word. Cost, standing, shortfall and the Build button live in a sheet one tap away. Every work now carries its own art |
| **Beyond** (`world/economy.js`) | **shipped (1.3.0)** | Three repeatable works — a house for a neighbour, the road posted one waymark further out, a planting at the wood's edge — each costing and asking more than the last, and each visible on the map. The valley can never say "you have built everything" |
| **Collections** (`world/collections.js`) | **shipped (1.3.0)** | ~124 finite sets derived from the corpus, so new content becomes new sets with no code. Growth shows the six closest to done, penalised by difficulty so nobody is sent to Elite because it has two left; the rest are one tap away by craft. Finishing one is announced on the result screen |
| **The skill ledger** (`core/learning/review.js`) | **shipped (1.3.0)** | Every answer anywhere feeds one ledger of seventeen CAT abilities. The valley points at the one that is slipping, in one sentence, in Wick's register — never a dashboard |
| **A missed question rests** | **shipped (1.3.0)** | Twenty minutes, then a day, then three, then most of a week. The second look and the Quarter both honour it, and when everything that got away is resting the screen says so and offers a passage that asks the same type instead |
| **The curator aims** (`tools/index-derived.mjs`) | **shipped (1.3.0)** | The content index carries each passage's question types, so a weakness in inference actually produces a passage that asks about inference |
| **One icon language** (`world/icons.js`, `engine/sprites.js` `mark`) | **shipped (1.3.0)** | Twenty-three 16 × 16 pixel marks drawn by the same hand as the world. Map pins, the thumb rail, craft chips, the menu, collections and the Hearth all carry them; the stroke glyphs and typographic dingbats are gone |
| **A resource shows what it builds** (`world/craft-ui.js`) | **shipped (1.3.0)** | The craft sheet answers "what can I build with it?" with pictures of the next three works it pays for, and "where do I earn it?" with each place's own mark |
| **Growth** | **shipped (1.3.0)** | The four trees stand on ground, carry the six-stage ladder as pips with the next stage named, and fill their bars on arrival. The empty state shows four bare plots with a seed in each instead of a paragraph saying there are four |
| **Performance** (`engine/sprites.js`, `engine/map.js`, `world/state.js`) | **shipped (1.3.0)** | Pixels go into a `Uint32Array` and reach the canvas once (cold scene build 1825 → 62 ms); `blob()` asks for an angle only at the rim; scatter shares twelve variants; the valley no longer opens fifty-one root-family files to draw fifty-one trees (content load 1676 → 145 ms). Route change to a painted valley: **3242 → 1064 ms**. Idle frame p95 33.4 → 16.8 ms |
| **A deliberate camera** (`engine/canvas.js`) | **shipped (1.3.0)** | A 'cover' scene may not zoom out past the point where the valley covers the frame |
| **Wick lives here** (`engine/life.js` `companion`) | **shipped (1.3.0)** | He walks a circuit from the Hearth out to whatever the valley is asking about, sits, looks around and carries the lamp lit after dark — at map scale, at the size a cat actually is (`wickSmall`) |
| **Verification** | **shipped (1.3.0)** | §16 covers repeatable works (each must cost more every time, must ask for learning first, and must resolve back to a work); §17 covers every stage line. All checks pass |


## What changed in 1.2.0

| System | State | Notes |
|---|---|---|
| **Wick, the companion** (`world/companion.js`, `engine/sprites.js`) | **shipped (1.2.0)** | The one character who speaks: a charcoal cat with a brass lantern, drawn at 26 × 22 for a portrait and 11 × 9 for the map. His script, his homecoming line (chosen by what is true of the world), and a line for every place. Voice rules are enforced by `verify.mjs` §17 — no "study", no "well done", no exclamation marks, nothing over 96 characters |
| **The first five minutes** (`world/screens/awaken.js`, route `#/awaken`) | **shipped (1.2.0)** | A cold open on a profile that has never been welcomed lands here, not on the map: night, one lamp, five lines, a sign to name the valley, six real words from the high-frequency band, then dawn over the valley they just named — terrain and sky repainted night → dawn → morning, lamps out, music warmed, crafts flying into a purse they have never seen. Ends by pointing at the first buildable work |
| **The valley's name** | **shipped (1.2.0)** | Stored in settings (so it travels in backups), shown in the HUD, the menu, Growth and Wick's own lines. Three seeded suggestions on the sign; a typed name is tidied into a place name and capped |
| **Nine pins, and the Quarter** (`world/regions.js`, `screens/world.js`) | **shipped (1.2.0)** | The three verbal workshops share one pin whose card offers the three benches; all three routes are untouched. Every pin carries a drawn mark instead of a system emoji, and off-screen places pin to the rim rather than vanishing |
| **The valley fills the frame** | **shipped (1.2.0)** | The home camera sits at the zoom that covers this screen, so no phone shows a slab of sky and a dead band of grass. Zoomed out, the country around the valley is painted: a gradient sky with its own stars above the ridge, three receding wooded ridges and mist below the road |
| **The Mirror Pond** (`engine/map.js`) | **shipped (1.2.0)** | A real shoreline (a wobbling radial with a bay and an inlet), four flat bands of depth with a ragged seam, wet sand in the bay and grass elsewhere, reeds round the shallow shore, a raft of lilies, a plank dock, and the sheen the pond is named for |
| **Crafts explain themselves** (`world/craft-ui.js`) | **shipped (1.2.0)** | Every craft chip anywhere in the game opens a sheet: what this craft *is* as an ability, where to earn it (as places you can walk to), and the nearest unbuilt work it pays for |
| **One menu, three places** (`world/menu.js`, `ui/components/cat-nav.js`) | **shipped (1.2.0)** | The thumb rail is Valley / Hearth / Growth. Settings moved behind a ☰ in the valley's corner, with Growth, the Workshop, Your standing and Settings. Every row lands where it said it would (`?you=1` added to the Hearth) |
| **Feedback that fits on a phone** (`ui/components/cat-explanation.js`, the three `teach.js`) | **shipped (1.2.0)** | Verdict → one reason → the trap *they* fell into, named in English → the whole teardown behind one disclosure. ~65 words by default where it was ~185. Nothing deleted; the default changed. The verdict scrolls itself into view, and the sticky answer bar no longer sits on the lesson |
| **Growth** (`shell/growth.js`) | **shipped (1.2.0)** | Four abilities, four trees at the stage the record has earned, a tier name, stars and one line of numbers; then the one ability with the most room, said as a next action. Everything the screen used to be lives under "The numbers" |
| **The Hearth** | **shipped (1.2.0)** | Wick on the step, a lamp by the door, flowers and tufts in the band a phone actually shows |
| **Interaction cost** (`engine/canvas.js`, `screens/world.js`) | **shipped (1.2.0)** | `pointermove` no longer calls `draw()` — coalesced touch events were painting the same frame two or three times over. The world stops simulating while a finger is down, the pins only touch the DOM when the camera moved, and the pin dots lost their backdrop blur. Drag went from p50 33 ms / max 100 ms to p50 16.7 ms / max 33 ms in headless software rendering at dpr 3 |
| **The Reading Room's tower** (`engine/sprites.js`) | **shipped (1.2.0)** | A plinth, a shaft that grows a floor at a time, an arched reading stage and a slate spire (the Observatory dome replaces it when built). 26 × 50 at one floor. It stands in a walled yard with pines, a lamp and a reader |
| **A sky with no seam** (`engine/map.js`, `multiplyTint`) | **shipped (1.2.0)** | The edge painters tint the way the renderer tints — a multiply, not a lerp — so the country beyond the ridge and the map's own sky are the same sky at every hour |
| **The dashboard, retired** (`app.js`) | **shipped (1.2.0)** | `#/home` and `#/practice` come home to the valley; the pre-world screens and `GATE_PLACES` are gone (−180 lines) |
| **Pace is only good with accuracy** | **shipped (1.2.0)** | A 1/12 round no longer prints its speed in gold: fast and wrong is the habit CAT punishes hardest |
| **Verification** | **shipped (1.2.0)** | §17 added: Wick's voice and register, naming, the nine pins and the Quarter's resolution, both Wick sprites, and the promise that feedback stays short. 552 checks pass |

## What changed in 1.1.0

| System | State | Notes |
|---|---|---|
| **The economy** (`world/economy.js`) | **shipped (1.1.0)** | Four crafts — Amber (word knowledge), Ink (reading), Thread (verbal structure), Ember (accuracy at pace, scarce). A place can never make another place's craft. 21 works, each with a cost bag AND a standing predicate over the learner's record; 14 need three or four crafts, 11 need Embers. Three stages: Settling, Building, Flourishing |
| **The curator** (`world/curator.js`) | **shipped (1.1.0)** | Composes a word round across bundles (due → slipped → new, frequency band by reach), picks the next passage by measured stage reach and by weakness, climbs the verbal tiers rung by rung, chooses the next root family. Weakness is derived from stored per-answer question `type` — never claimed, never shown as a chart on the way in |
| **The Workshop** (`world/screens/hearth.js`) | **shipped (1.1.0)** | What am I building, what do I need, what should I practise to get it — in one screen, with a build moment that changes the map |
| **Place screens** (`world/screens/place.js`) | **shipped (1.1.0)** | The region's scene fills the screen; a sheet holds one line and one action; the shelves live under a pull. `buildBackdropScene` paints a portrait landscape per place |
| **The valley's home** (`world/screens/world.js`) | **shipped (1.1.0)** | Named pins that pulse when asking, at most three "worth doing now" cards (never three of a kind), crafts that fly into the purse, a line when you come back after days away, sky and land beyond the map's edge |
| **Visual language** (`ui/styles/world.css`) | **shipped (1.1.0)** | Painted surfaces, crafts as coloured gems, the sheet, the pins, the works, the build veil |
| **The second look** (`reading-comprehension/screens/second-look.js`) | **shipped (1.1.4)** | Up to six questions the reader got wrong and has not since got right, weighted by their weakest type; the evidence paragraph one tap away; the trap named from the corpus's own distractor analysis; settles on a right answer. Offered above a new passage once four have got away |
| **Words in context** (`tools/build-context.mjs`, `content/context/pack.json`) | **shipped (1.1.2)** | 270 words shown in a real sentence with the sense they carry there, built from the RC vocabulary blocks and the Rootwood context sentences. Three of every twelve in a word round, nine of the Gauntlet's thirty. Own mastery bucket (`context`), so place counts stay honest |
| **Life in the valley** (`world/engine/life.js`) | **shipped (1.1.3)** | Villagers walk the paths as works go up; deer come to an old Rootwood, sheep to a Meadow in bloom, ducks to a worked Pond, a dog to a Hearth with flower boxes. Nothing appears on a timer: every creature is a consequence of learning |
| **The stage** (`world/stage.js`) | **shipped (1.1.0)** | The region's own still scene painted behind the rooms beyond the valley (the Quarter, the Terraces, the Reading Room), with `data-stage` on the root lifting their screens onto warm glass. One canvas, no frame loop |
| **Word DNA content** | **shipped (1.1.0)** | 16 new units (wd-0013…wd-0028) from `99_REFERENCE/5- Prefix and Suffix.md`; the Terraces go from 12 units to 28; registry 493 items |
| **Audio** | **shipped (1.1.0)** | `startMusic` takes a `warmth` from works built and stars earned: one more pad voice and a slightly freer line as the valley fills. Same key, same calm |
| **Verification** | **shipped (1.1.0)** | The content loader reads from disk under Node, so `tools/verify.mjs` exercises the real pipeline: craft separation, bag arithmetic, work standings, round composition, reach and weakness. All 44 routes sweep with no console errors |

## Application

| System | State | Notes |
|---|---|---|
| PWA shell (index.html, manifest, icons) | **shipped** | Installable; relative paths → GitHub Pages subpath safe; `start_url` is the valley |
| Service worker / offline caching | **shipped** | Shell cache v31 + content cache v13, cache-first by exact URL; ~640 content files precached; registration waits for the first screen to paint (1.0.0) |
| Design tokens + base styles + `game.css` | **shipped (1.0.0)** | Tokens and base unchanged; `game.css` is the world's interface language (glass HUD, place sheets, run frame, star reveal, tiles/rows) and restyles the shared chrome under `[data-world]` |
| **The welcome** (`world/screens/awaken.js`) | **shipped (1.2.0)** | Route `#/awaken`; `app.js` sends a never-welcomed learner there on a cold open. Immersive chrome, no tab bar |
| **The companion** (`world/companion.js`) | **shipped (1.2.0)** | Wick's identity, voice and the valley's name; the only module that owns any of the three |
| **The menu** (`world/menu.js`) | **shipped (1.2.0)** | One ☰, four honest rows, mounted by the valley's HUD |
| Hash router | **shipped** | Param routes; 404; modules register their own routes; the world registers `/world`, `/world/place/:slug`, `/round/:region` and `/round/:region/:field`; a query after a route is a hint for the screen, never part of the match (1.1.0) |
| `StorageAdapter` + IndexedDB adapter | **shipped** | DB `cat-os` v2; stores: settings, attempts, sessions, learning. New record kinds in `learning` (all additive, all in backups): `lex-mastery`, `lex-round`, `gauntlet-run`, `world-build`, `world-quest` |
| Backup & Restore | **shipped** | Format v2; the whole world derives from records, so a backup carries the valley |
| **The world — engine** (`src/world/engine/`) | **shipped (1.0.0)** | Canvas 2D, no dependencies, no image assets: hue-shifted palette ramps and seeded noise; a procedural pixel-sprite factory (trees at seven stages, pines, flowers, bushes, brambles, rocks, the cottage at five levels, the tower with floors/windows/observatory, three workshops, lanterns, signposts, bridges, fences, terrace walls, koi, butterflies, birds, the cat, clouds, root-stones); a renderer drawing at world resolution and blitting at whole-device-pixel zoom with camera, input, depth sort, lighting and hit-testing; particle and creature systems; the 640×720 valley terrain painted through one raster (~270 ms software), hero scenes per place. Frame ≈ 5 ms |
| **The world — state** (`src/world/state.js`, `economy.js`) | **shipped (1.0.0)** | Pure derivation of every place from records: Rootwood stages per family, Meadow/Pond/Thicket mastery from the ledger, Reading Room stars/floors/windows, workshop levels, Hearth level from builds, Ink earned − spent, stars total, three seeded daily quests with progress, the one place asking. Stars: accuracy then pace, 0–3 + flawless; Ink rules; eight upgrades; titles |
| **The world — screens** | **shipped (1.0.0)** | The valley (home), places, vocabulary rounds, the shared result (star reveal), the Hearth, the Wilds (weekly Gauntlet with records) |
| **The world — audio** (`src/world/audio.js`) | **shipped (1.0.0)** | Generative pentatonic music (tonic per place, night variant), ambience (wind, water, birds, crickets, rain), interaction sounds; HUD + Settings toggle; honours master Sounds |
| **The Rootwood** (`language-garden/`) | **shipped (1.0.0)** | The six-beat Grow/Revisit sessions and the scheduler are unchanged; the SVG valley/walk/journal are retired; sessions and plant pages render on the world's canvas (`world/garden-backdrop.js`), growth animates in the scene, Ink shown after rest; 51 families in six groves |
| **The Reading Room** (`reading-comprehension/`) | **shipped (1.0.0)** | Rebuilt run: briefing → timed reading (pace ring, target time) → questions with the clock running → star reveal with mentor lesson and Learning Page; review and mentor pages unchanged |
| **Meadow / Mirror Pond / Thicket rounds** (`world/lexicon.js`, `screens/round.js`) | **shipped (1.0.0)** | Twelve-word rounds from a field, due-first; question kinds meaning/reverse/synonym/antonym/twin/twin-meaning/loan/origin built from the entries; per-word mastery ledger (levels 0–4, spacing 10 min/1/3/7/21 d, climbs only when due, never below met) |
| **Para Jumbles / Para Summary / Odd One Out / Word DNA** | **shipped** | Unchanged journeys, restyled; each ends with the world's reward strip (stars, Ink) and returns to its place |
| Personal Reading Mentor, Growth screen, Learning Pages, reflections | **shipped** | Unchanged; the Growth screen is "the study" at the Hearth |
| Engagement: XP + levels, streaks, achievements | **shipped** | Unchanged derivations; levels give the learner's title; achievements shown at the Hearth |
| The Wilds (Gauntlet) | **shipped (1.0.0)** | Thirty words across the three vocabulary places, the same all week (seeded), three minutes, records per week and all-time, splits when the road is lit |
| Analytics, cloud sync | designed | V2.0+ |

## Content system

| System | State | Notes |
|---|---|---|
| Registry (`content/index.json`) | **shipped** | 32 RC + 19 PJ + 20 PS + 20 OOO + 12 Word DNA + 217 vocabulary + 51 Language Garden + **71 lexicon + 12 loanword + 23 twin bundles** (477 items); type-aware agreement with files (tools/verify.mjs) |
| Schemas | **shipped** | `rc.schema.v1–v4`, `pj/ps/ooo/wd/vocab/lg.schema.v1`, **`lex/loan/twin.schema.v1` (1.0.0)** — appended, never edited |
| **Lexicon / twins / loanwords** | **shipped (1.0.0)** | Generated deterministically from the owner's reference corpus by `tools/build-lexicon.mjs` (idempotent; faithful transcription; every bundle validated): 2,577 words (1,115 high / 965 medium / 497 low frequency) with synonyms and antonyms; 401 confusable sets (370 with per-word senses); 271 loanwords in 12 languages |
| Reading, verbal, Word DNA, vocabulary and Rootwood content | **shipped** | As before: 32 passages (136 questions, all stages and genres), 19 jumbles, 20 summaries, 20 odd-one-outs, 12 Word DNA families, 217 words, 51 root families |
| Verification tool (`tools/verify.mjs`) | **shipped** | Sections 1–16: every content type, registry, precache, module graph, engines, mentors, backups, the Rootwood dry run, the world (regions, economy, lexicon rounds, state derivation, audio identity, no retired imports). 507 checks pass |

## Open owner decisions

1. **License** — still unchosen.
2. **Proper nouns in the lexicon** — the generator lower-cases every headword (the source capitalises all of them); a handful of proper nouns (e.g. "john bull") are therefore lower-case. Trivially reversible in `caseWord`.
3. **Content provenance** — passages remain original compositions in CAT register; the lexicon, twins and loanwords are transcribed from the owner's own reference. Unchanged policy.

## Recorded decisions (1.0.0)

- **Canvas 2D over SVG and over a game framework.** The SVG world could not carry lighting, particles, hundreds of sprites and water at 60 fps on a phone; PixiJS/Phaser would break the no-build/no-CDN rules and add a dependency to maintain. A ~2,000-line Canvas 2D engine gives crisp pixel art at whole-device-pixel zoom, procedural sprites (no assets to rot), and a ~5 ms frame.
- **The world derives, never stores.** Every place's growth, the Ink balance, the stars and the quests are pure functions of the records already in IndexedDB (plus two small additive record kinds for builds and quest claims). No migration, no drift, backups carry the world.
- **Stars are performance; Ink is effort; levels are mastery.** Stars follow accuracy first and pace second (CAT's own two demands); Ink is earned only by finishing real practice and weighted by stars; building levels are derived from mastery and cannot be bought; nothing learnable is locked behind an upgrade (the Observatory adds a mode, the rest is the valley itself).
- **The Rootwood keeps its inner design.** No score is shown inside a session; the world's reward (Ink) appears only after the tree has come to rest. The scheduler, the six beats and the voice are untouched.
- **The Language Garden documents are superseded where they conflict with the 2026-09-11 brief.** Recorded in `KNOWLEDGE/01_KNOWLEDGE/CAT OS — THE WORLD (1.0).md`, which is the creative authority for the world.

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

- **Language Garden / Root Grove (0.14.0):** the sixth module, and the
  first built around no question-and-answer loop, no score, and no
  reward economy at all — a deliberate reversal of Word DNA's own model,
  built to a new `LANGUAGE_GARDEN_BIBLE.md` that names Word DNA (or
  rather, "the old vocabulary module" it describes, which Word DNA
  factually is) as the thing it replaces. Central decision, made with the
  owner up front rather than assumed: Word DNA is **soft-hidden**, not
  removed — its routes, code and stored data are untouched, only its
  Home/Practice advertising is gone, so the whole change is a one-line
  revert if ever wanted. Architecturally the biggest departure from every
  prior module is storage: garden sessions persist to `STORES.LEARNING`
  (`kind: 'garden-session'`) instead of `STORES.SESSIONS`, specifically
  so they can never feed `core/engagement/stats.js` and silently earn XP
  or streak credit — the Bible calls a second reward economy stacked on
  the garden a design failure by name, and the only way to guarantee that
  is to keep the data out of the system that computes XP entirely, not
  to hide it in the UI. The spacing scheduler (`computePlantState`) is
  intentionally simple relative to real SRS systems (a fixed rung ladder,
  not an ease-factor formula) because the Bible explicitly asks the
  memory model to "start conservative" and says the visual language
  "does not depend on the scheduler's exact mathematics." Three real
  authoring bugs (a member's morpheme parts not concatenating to its own
  word: chronometer, chronograph, philosophy, each missing a connecting
  vowel) were caught by a loader consistency check before ever reaching a
  screen — the same boundary discipline every prior module's content
  gets. Browser verification (not just `tools/verify.mjs`, which only
  exercises logic/data) caught real bugs no dry run could: the Reach
  beat's tap-to-join step was revealing a held-out word's meaning before
  its own construction quiz, which would have handed learners the answer
  every single time; the correct option in both the Attempt and Reach
  choice sets was always authored first in content, which without a
  seeded shuffle would have taught learners to pattern-match on position
  A/B instead of actually reasoning; and a CSS rule was unconditionally
  overriding the `hidden` attribute the plant detail page's "tap a leaf
  to recall its meaning" interaction depends on, silently deleting the
  entire recall mechanic. One content decision worth naming: `vocab-NNNN`
  is genuinely new shared infrastructure, not Root-Grove-only — every
  future garden (Vine Walk, Orchard, Wildflower Meadow, Twin Patch) is
  expected to reference the same word substrate by id rather than
  inlining words again, per the Bible's own content note (§10).
- **Word DNA (0.13.0):** the fifth module, and deliberately not called
  "Vocabulary" — the product's whole thesis is that understanding a
  word's shared parts beats memorising a list. Built to the new
  `WORD_DNA_BIBLE.md`, using two owner-supplied PDFs as the exclusive,
  non-negotiable source of truth for every word/meaning transcribed
  (never invented, rewritten, or simplified); the surrounding teaching
  layer, screens, and mentor voice are original design reusing existing
  tokens, sounds, and components only. Central IA decision: a
  **Language Tree** (root → prefix → suffix → foreign words → CAT
  vocabulary, with a sixth "Frequently Confused Words" branch reserved
  empty for later content) replaces the eight-tier ladder every other
  module uses — Word DNA isn't difficulty-staged, so it doesn't pretend
  to be. Every family runs the same loop: Notice the shared piece →
  Predict its meaning → Reveal + Understand why it threads every taught
  word → Apply it to one or two words never taught at all, the actual
  proof of transfer. Foreign words and CAT vocabulary have no shared
  root to notice, so they honestly swap the shared-piece Notice for a
  word-in-context Notice instead (Bible §3a) rather than forcing a
  pattern that isn't there. The Reading-DNA-style trait system is a
  **bounded** four, chosen from seven candidates the Bible considered
  and rejected three of by name (§5): root_recognition,
  meaning_transfer (the signature trait), context_calibration, and
  family_fluency — evidence-floored and banned-word-linted like every
  other mentor. A derived **Word Garden** (words earned via a correct
  Apply, no new storage) and a deterministic **Today's Discovery** (one
  word a day, stops itself, foreign/cat_vocab only) give the module a
  reason to open on a day without a full session. Scoring is plain
  accuracy with no CAT-style marks, on purpose — "Word DNA imitates no
  exam format." Ships with 12 families (batch-wd-001) spanning all five
  active branches, transcribed verbatim from the source PDFs; the
  schema and registry are designed so every future batch is pure
  content, no code or UI changes. One real bug caught in browser
  verification before shipping: the two-Apply flow (foreign/cat_vocab
  families) was replacing the whole Apply region on the second
  challenge, silently erasing the learner's own first correct transfer
  the instant the second appeared — fixed to accumulate, matching the
  accumulate-don't-replace pattern Notice/Predict/Understand already
  use. No new DB store, no new sounds, no new colors (`--color-info` is
  the one surface where blue is the star, reused exactly); `module:"wd"`
  in the existing sessions/attempts/learning stores; RC/PJ/PS/OOO
  untouched. `CACHE_VERSION` → 15, `CONTENT_VERSION` → 10.
- **Product audit (0.12.1):** a full screen-by-screen pass over every
  shell and module screen, looking for places a first-time CAT aspirant
  could hesitate. No new features (the brief explicitly excluded them);
  four fixes, all confirmed in a scripted Chromium pass against live
  IndexedDB before shipping, not just `verify.mjs`. The headline finding:
  Home's "Continue" card (the app's single most prominent call to action)
  asked the RC-only recommender regardless of which module the learner
  actually last practiced, so a Para-Jumbles-focused learner was
  perpetually nudged back to Reading Comprehension. Home now asks
  whichever module's own recommender matches the most recent session,
  reusing each module's existing `recommendNext{PJ,PS,OOO}` rather than
  inventing new logic. The other three fixes are straight consistency
  bugs inherited from RC shipping before the PJ/PS/OOO vocabulary
  converged: RC alone said "← Library" (its own browser page has always
  called itself "Your reading journey") and "Skip"/"Submit" where the
  three newer modules settled on "← Journey" and "Set aside"/"Lock it
  in"; and Para Jumbles alone was missing the Settings → Learning "Show
  again" row that Para Summary and Odd One Out both have. Several other
  observations (the RC Learning Page's length, Para Summary's longer
  per-item loop, the module intros' length) were deliberately left
  untouched: each is either a documented, deliberate pedagogical design
  (Bible-mandated) or a signature surface iterated across several prior
  milestones, so changing it is a call for the owner, not an audit
  autopilot. `CACHE_VERSION` → 14 (five precached files changed); no DB
  migration, no new files, no module touches another module's files.
- **Odd One Out (0.12.0):** the fourth module, built to `ODD_MAN_OUT_BIBLE.md`.
  Central design decision, straight from the Bible: the module teaches
  **structural reading, not elimination tricks** — the outlier is on-topic but
  out-of-structure, so the product leads with a **Paragraph Builder** (build
  the four, and the fifth excludes itself) at the first three tiers before the
  exam surface appears. This reuses `<cat-jumble-board>` extended additively
  (`maxPlaced` cap, `excluded` reveal state) rather than a new component, so PJ
  is untouched. The Reading DNA is a **bounded** extension: exactly the four
  §8 traits (coherence-monitoring, candidate-model-maintenance,
  relatedness-vs-belonging, ambiguity-tolerance), no invented fifth, each
  mapped to a `difficulty_vector` split so it is derived, not stored. Content
  is TITA, so the batch check guards the **answer-position spread** (outliers
  5/5/5/5/5) the way the PS check guards the correct-option spread. The §11
  validation gates ship as data on every item and are enforced by the loader
  for any accepted/review item (uniqueness, reconstruction, trap audit pass;
  heuristic-adversarial pass from Medium up). No new sounds, no DB migration,
  `module:"ooo"` in the same stores; RC/PJ/PS untouched. Roadmap ladder note in
  CHANGELOG per ROADMAP_V2's maintenance rule (Vocabulary remains last).
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
