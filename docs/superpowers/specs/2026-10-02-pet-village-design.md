# CAT OS 3.0 — The Pet Village (design)

Approved by the owner on 2026-10-02. It replaces the two-map world of 2.2 (a
painted home at `#/world` and the canvas sprite village at `#/world/village`)
with **one painted village** where six pets live. Each pet is one VARC
subject.

The owner's brief:
- cleaner, calmer and more interactive;
- every small detail alive;
- every screen in one visual language;
- an economy where neglecting one subject is felt across the whole village;
- "make it addictive, use all the tricks".

**The last point overrides the old canon.** THE WORLD Part B banned streak
pressure and retention hooks. Every hook in this release is still earned only
by real learning.

## 1. The six pets

The art is the existing strip `assets/art/home-companions-v1.png`
(2172×724). Frames are `[x, width]`:
`[0,350] [355,330] [700,338] [1040,335] [1380,397] [1780,392]`.

| id | Name | Creature (frame) | Subject | Home in the painting | Gift | Colour |
|---|---|---|---|---|---|---|
| `toffee` | Toffee | amber flame spirit (0) | CAT pace — the Gauntlet; also keeps the village fire | campfire + notice kiosk (bottom centre) | Sparks | `#E9963A` |
| `chai` | Chai | cream owl with book (1) | Reading — RC, second look, arguments (cr) | blue owl library (top left) | Stories | `#A9825A` |
| `matcha` | Matcha | moss sprout with seed (2) | Vocabulary — word rounds (meadow, pond, thicket), roots (Rootwood garden), word parts (wd), word bank (wb) | greenhouse (middle left) | Leaves | `#7FA65A` |
| `mochi` | Mochi | slate pebble with glasses and notebook (3) | Para Summary (ps) + paragraph completion (pc) | archery cabin (middle right): "hits the gist" | Notes | `#7D8FA8` |
| `ginger` | Ginger | terracotta fox with map (4) | Para Jumbles (pj) + sentence placement (sp) | gear workshop (top centre) | Maps | `#D2693A` |
| `mallow` | Mallow | dusty-blue cloud with satchel (5) | Odd One Out (ooo) | observatory (top right): "the star that does not belong" | Stardust | `#93AED1` |

Two more buildings have a job:
- **The tea cottage (lower left) is the learner's cottage.** It holds the
  menu: sound, settings, backup and the village name.
- **The clock tower (lower right) is Progress** (`#/growth`). Its painted
  face shows the real time.

**Module → pet:**
- chai: `rc` (no module field, has `passage_id`), `rc2`, `cr`
- matcha: lex-round (meadow, pond, thicket), garden-session, `wd`, `wb`
- mochi: `ps`, `pc`
- ginger: `pj`, `sp`
- mallow: `ooo`
- toffee: gauntlet-run

**Place slug → pet:**
- reading-room → chai
- meadow, pond, thicket, rootwood, terraces → matcha
- table → mochi
- loom → ginger
- bench → mallow
- wilds, hearth → toffee

The voice is warm, short and never shaming. No exclamation marks in pet
lines. The mentor's banned words still apply: wrong, failure, failed,
mistake, poor, weak, bad, careless.

## 2. The economy (derived from records; one new record kind)

Everything is recomputed from SESSIONS and LEARNING on every load, as in
2.x. That means existing learners keep all their history: their past runs
become gifts and friendship. Old `village-*` records are ignored.

### 2.1 Visits

A **visit** is one finished learning run belonging to a pet:
`{pet, at (ms), stars 0-3, flawless, correct}`.

How stars are worked out (reuse `world/economy.js`):

| Run | Stars |
|---|---|
| RC | `rcStars` |
| pj, ps, ooo, banks | `verbalStars` (target = `target_sec`, or Σ item `estimated_time_sec`, or 90 s per item) |
| lex-round | its stored `stars` |
| gauntlet | its stored `stars` |
| garden-session | 2 if clean, else 1 |
| rc2 | 1 if accuracy ≥ 0.5, else 0, +1 if accuracy ≥ 0.75 |
| wd | `min(3, 1 + correct)` if correct > 0, else 0 |

### 2.2 Mood (0..1) per pet

```
weight(v) = (0.4 + 0.2 × stars) × 0.5 ^ (ageHours / 36)
care      = Σ weight(v) over the pet's visits
mood      = 1 − e^(−1.2 × care)
```

- **A pet with no visits ever is `new`.** Its mood is shown as "Waiting to
  meet you", it counts as 0.3 for harmony, and it is never drawn sad.
- **Pressure for Matcha.** If Matcha has due reviews (meadow + pond +
  thicket due words, plus `rootwood.dueCount` × 3) of 12 or more, multiply
  Matcha's mood by 0.85. Its line then mentions the fading words.

Mood words and their map behaviour:

| Mood | Word | Behaviour |
|---|---|---|
| ≥ 0.75 | Glowing | roams widely, sparkles |
| ≥ 0.5 | Happy | normal |
| ≥ 0.3 | Missing you | slower, "…" bubble, looks toward the cottage |
| ≥ 0.12 | Sleepy | sits at the door, zZ, slightly desaturated |
| below 0.12 | Wilting | lies down, grey, house windows dark |

### 2.3 The gift ring (integration)

`matcha → chai → mochi → ginger → mallow → toffee → matcha`.
Each pet **needs** the gift of the pet before it:
- Chai needs Matcha's Leaves: you cannot read without words.
- Mochi needs Chai's Stories: a summary needs something read.
- Ginger needs Mochi's Notes: order needs each paragraph's gist.
- Mallow needs Ginger's Maps: the misfit stands out against the route.
- Toffee needs Mallow's Stardust: the fire's colour.
- Matcha needs Toffee's Sparks: warmth to grow.

**Gifts earned by one visit:**
```
base     = clamp(stars, 1, 3) + (flawless ? 1 : 0)
gifts    = base × (supplierMoodAt(v.at) ≥ 0.5 ? 2 : 1)
```
`supplierMoodAt` is the supplier's mood computed only from visits strictly
before `v.at`.

The pet card states the ring in words: "Working at full speed — Matcha's
leaves are fresh" or "Working slowly — Matcha has run low on leaves."

**Harmony** = 0.5 × mean(mood) + 0.5 × min(mood), where `new` counts as 0.3.
Harmony drives:
- how many path lanterns are lit;
- the size of the campfire;
- the warmth of the music;
- how many fireflies there are.

A **festival night** happens when every pet's mood is at least 0.5 (no pet
is `new`).

### 2.4 Friendship

```
xp = Σ (1 + stars) over the pet's visits
```

Hearts 0–5 at the thresholds `[0, 3, 8, 16, 28, 45]` (heart n needs xp ≥
T[n]). Each heart unlocks one story line about the pet: 5 lines per pet,
written in the pet's voice. The card shows "N more visits to the next heart"
(xp left divided by 3, rounded up).

### 2.5 Toffee's flame (the daily run)

**Active days** are days with any visit. The run counts back from today
(or yesterday, if nothing has happened yet today).

Kindling:
- A run earns 1 kindling on each 7th consecutive day, held at most 2.
- When counting back finds a single missing day and kindling is held, that
  kindling is spent, the day is bridged and the run continues.

The kindling arithmetic is simulated forward over all active days so it is
deterministic.

Flame tiers drive the size of the campfire's fire:

| Days | Tier |
|---|---|
| 0 | embers |
| 1–2 | small |
| 3–6 | steady |
| 7–13 | tall |
| 14+ | bonfire |

Copy says "a 6-day glow", never a loss.

### 2.6 Daily wishes (3 per day)

Wishes are deterministic for a date and the moods at the start of that day
(local midnight).

| # | Wish | Completed by |
|---|---|---|
| 1 | "Spend time with {neediest pet}" (lowest mood; ties broken by order) | any visit to that pet today |
| 2 | Matcha due ≥ 12: "Help Matcha with the fading words". Otherwise: "Visit {second neediest}". | a matcha visit, or a visit to the second neediest, today |
| 3 | rotates by day number mod 3: earn 3 stars in one run · visit three different friends · have one flawless run | as named |

**When all three are done**, the day pays a **wish bonus** of +1 of every
gift. This is derived, so it re-evaluates every past day. Today's three
wishes show on the notice board, in the "Today" pill, and in the hearth card.

### 2.7 Treasures (the sink, and the only new record)

Record: `LEARNING {id, kind:'village-treasure', treasure, at}`, written when
the learner taps **Make**. Re-check affordability first: derive, then write.

**Stock** per gift = gifts earned + wish bonuses − Σ recipe costs of the
treasures made.

Treasures are made in order. The next one is always visible as the goal.
Each one draws something on the map.

| # | id | Name | Recipe | What appears |
|---|---|---|---|---|
| 1 | `lanterns` | Plaza lanterns | leaves 2 · stories 2 | paper lanterns glow on the 4 plaza lamps at dusk and night; a soft warm pool by day |
| 2 | `bunting` | Bunting | notes 3 · maps 3 · leaves 2 | bunting garlands across the plaza that sway in the wind |
| 3 | `flowers` | Flower boxes | leaves 4 · stories 3 · notes 2 | blooming clusters along the paths, with butterflies near them |
| 4 | `fireflies` | Firefly jars | stardust 4 · sparks 3 · maps 2 | jars by the benches; many more fireflies at night |
| 5 | `swing` | The plaza swing | maps 4 · notes 4 · stories 4 · leaves 3 | a swing under the plaza tree; pets take turns on it |
| 6 | `chimes` | Wind chimes | stardust 5 · stories 4 · leaves 4 · notes 3 | chimes at the observatory that ring when tapped |
| 7 | `kite` | A kite | every gift 5 | a kite with a tail flies above the village by day |
| 8 | `lilylights` | Lily-pad lights | every gift 7 | floating lights on the pond at night |
| 9 | `skylanterns` | Sky-lantern night | every gift 10 | on festival nights, lanterns rise from the plaza |

### 2.8 Letters

If the learner was away a day or more (`awayDays ≥ 1`), a letter from the
pet who missed them most waits on the notice board when the village opens.
It carries one line in that pet's voice. Dismissing it is per-day, kept in
localStorage `catos:letter`.

## 3. The village screen (`#/world`)

### 3.1 The map

- **Full bleed.** The painted map `home-world-v1.png` (1536×1024 image
  space) fills the screen and is panned by drag, wheel and arrow keys.
- **Zoom** with pinch or ctrl+wheel, between 0.85 and 1.8. There are no
  visible zoom buttons.
- **The camera** starts centred on the plaza. On phones the map's height
  fills the screen and the plaza is centred.
- **Hit areas.** Buildings have invisible areas in image coordinates:

| Building | Opens |
|---|---|
| library | Chai's card |
| greenhouse | Matcha's card |
| cabin | Mochi's card |
| workshop | Ginger's card |
| observatory | Mallow's card |
| kiosk and campfire | the Hearth card |
| cottage | the Cottage sheet |
| clock tower | `#/growth` |

  On hover or focus, a small cream nameplate appears beside the building.
  There are no permanent signs.

### 3.2 HUD (the only permanent chrome)

- **Top left:** one pill with Toffee's flame glyph, the day count and the
  village name. It opens the Hearth card.
- **Top right:** two round buttons — the **Satchel** (gifts and treasures)
  and the **Cottage** (menu).
- **Bottom centre:** the **Today** pill: three wish dots and "2 of 3
  wishes". It opens the Hearth card scrolled to the wishes.
- **Returning from a run:** a soft toast names the gifts earned, and the pet
  hops.

### 3.3 Pets on the map

Each pet is a DOM sprite positioned in image coordinates (percentages, so
it scales with zoom), with a ground shadow. The sprite sheets are baked
from the strip, one PNG per pet (`assets/art/pet-<id>.png`, 5 frames):

| Frame | Name |
|---|---|
| 0 | idle |
| 1 | blink |
| 2 | happy (^ ^ eyes) |
| 3 | talk (open mouth) |
| 4 | sleep (closed eyes) |

**Behaviours** (a small state machine per pet, seeded so it is calm and
never jittery):
- **home:** idles at its door; blinks every 3–6 s; looks around (flips);
  does a small work bob.
- **stroll:** hop-walks along the path graph (`pets/paths.js`, image-space
  polylines) to the plaza, a bench, the campfire, the pond dock or a
  friend's door. The hop is a translateY arc with squash and stretch, about
  2.2 hops per second, at 38 image px/s × a mood factor.
- **chat:** two pets meet in the plaza and face each other. Bubbles
  alternate with tiny icons (heart, note, leaf, star, "…"); about one in
  four is a real gossip line from state ("Have you seen Mochi? Quiet
  lately.").
- **deliver:** a pet whose supplier is happy carries its gift icon to its
  ring successor's door; the successor does a happy hop and the gift pops.
  The ring is visible.
- **sit:** on a bench, or by the fire.
- **swing:** if the swing treasure exists.
- **sleep:** at night (hour = night) pets walk home and sleep at their
  doors (sleep frame, zZ). Toffee stays at the fire, dimmed.
- **tap:** the pet jumps, two hearts float up, it says one line (talk
  frame), and its card opens.

Mood changes speed, roaming radius and posture (see 2.2). The neediest pet
shows a small thought bubble with its gift icon. That is the call to
action.

### 3.4 Small life (canvas + CSS layers over the map)

- **Day/night tint** from the real clock, using `hourWord`
  (dawn/morning/afternoon/dusk/night):
  - multiply tint: dawn rose, dusk amber, night blue;
  - screen-blended warm glows at lamp posts and windows at dusk and night.
- **Campfire:** a flickering glow plus rising sparks; size follows the flame
  tier and harmony.
- **Chimneys:** smoke puffs at the cottage, workshop and cabin.
- **Fireflies** at dusk and night (count follows harmony and the firefly
  treasure). **Butterflies** by day, near the flowers.
- **Falling leaves** (October palette; season-aware).
- **Drifting cloud shadows:** large, very soft, slow.
- **The pond:** sparkle glints, an occasional ripple ring, lily pads bobbing.
- **Birds:** a small V of birds crosses the sky every minute or two, by day.
- **The clock tower's hands** show the real local time.
- **Rain:** soft streaks and ripples on the pond when `weatherWord` says
  rain.
- **Motion.** Everything honours reduced motion: no particles, no walking,
  pets idle at home.

### 3.5 Cards and sheets

There is one card component: a bottom sheet on phones, and a floating card
on desktop (≥ 900 px) anchored to the right. All of them are dialogs with a
focus trap, Escape to close and return focus (`ui/modal.js`).

**Pet card, top to bottom:**
1. portrait (blinking), name and creature;
2. subject;
3. mood bar and its word;
4. friendship hearts and how far to the next one;
5. a dialogue line from state;
6. **primary action:** the curator's next activity for the pet (title,
   minutes);
7. the ring line;
8. "More with {pet}": the pet's places (links to `#/world/place/<slug>`);
9. the latest story line.

**Hearth card:**
- Toffee and the harmony ring: six portraits with mood rings around the fire;
- the day run and kindling;
- today's wishes, with done ticks and a go button each;
- the festival line;
- the Gauntlet action.

**Satchel:**
- six gift counts with icons, plus a "What is this?" line explaining the
  ring;
- the treasure list: made ones ticked, the next one with its have/need per
  gift and a **Make** button.

**Cottage:**
- the village name;
- music and sound toggles;
- links to Progress, Settings and Backup;
- a line about offline use.

### 3.6 First visit

There is no 60-second blocking onboarding:
1. The camera rests on the plaza.
2. Toffee (at the fire) says three short lines in bubbles, advancing with a
   tap or after 4 s: "Oh — hello. This is your village." / "Six of us live
   here, and each of us looks after one part of CAT English." / "Come and
   meet Chai at the library. She has a short passage waiting."
3. Chai's thought bubble is lit.
4. Naming the village is offered in the Cottage. It is never a gate.
5. The `valley.awakened_at` and `met_at` settings are written when the
   intro ends.

## 4. Every other screen: one language

- **One palette.** `tokens.css` holds one palette; `--g-*` and `--cw-*`
  alias it.

| Token | Light | Dark |
|---|---|---|
| paper | `#FFF9EC` | `#1E2722` |
| paper-2 | `#F6EEDB` | — |
| line | `#E4D7B7` | — |
| ink | `#34443B` | `#F3ECDD` |
| sage | `#536D4E` | — |
| honey | `#EDBE66` | — |
| terracotta | `#C2643F` | — |

  Georgia stays the display face and system-ui the text face. Radii are
  12/16/24, and shadows are warm and soft.
- **Hosted screens.** `app.js` sets `html[data-host=<pet>]` from the route,
  using the module → pet and place → pet maps.
- **A painted backdrop replaces every canvas backdrop.** This covers the
  stage behind modules, the place hero, the round backdrop, the Gauntlet,
  the garden session and the hearth. The backdrop is a blurred, warm crop of
  the host pet's home from `home-world-v1.png` (CSS background-position per
  pet), under a cream veil.
- **Place screens** keep all their curator logic. The hero becomes the
  painted crop plus the host pet sprite and its speech bubble, replacing
  Wick. The back link reads "← Village".
- **Session bars** show a small host chip: portrait and pet name.
- **Results.** `renderResult` and `worldReward` show:
  - the host pet celebrating (happy frame, hop);
  - gifts earned with their icons, counted up;
  - the ring bonus line ("Matcha's leaves were fresh: double Stories");
  - any heart gained;
  - "Back to the village" → `#/world`.

  On return, the pet hops and a toast names the gifts.
- **Growth** becomes "The clock tower: how far you've come". It has six pet
  rows (portrait, subject, the existing measures, hearts) plus the existing
  deeper sections.
- **Settings** gets a cottage header (painted crop of the cottage) and cozy
  rows. Every control and behaviour is unchanged.
- **`cat-nav`** (shown on `data-room` routes) becomes three items: Village,
  Progress, Cottage. These are line icons drawn in-file; it does not use
  `village/art.js`.

## 5. What is removed

**The canvas village and everything only it used:**
- `src/village/screens/village.js`, `scene.js`, `renderer.js`,
  `terrain.js`, `life.js`, `living-art.js`, `grove.js`, `next.js` (moved to
  `src/pets/next.js`), `sprites.js`, `state.js` (village derivation);
- `src/world/garden-backdrop.js`, `src/world/screens/backdrop.js`,
  `src/world/menu.js`;
- the canvas half of `src/world/stage.js`;
- the old goods, coins, orders and neighbours UI (`craft-ui.js`, parts of
  `economy.js`);
- the Cute Nature PNGs that nothing references any more.

**Kept until proven unused:**
- the plant stage sprites used by `<cat-plant>` (keep `art.js` slimmed to
  `artURL`/`PLANT_STAGE` plus the plant stills);
- `defs.js` constants still imported. Strip what is dead.

**Routes:**
- `#/world/village` redirects to `#/world`.
- `#/world/place/hearth` stays as the "records" page, re-themed.

## 6. Architecture

```
src/pets/pets.js       roster (§1), ring, voice lines, story lines, place/module maps
src/pets/economy.js    derivePets(state, records, now) → {pets, harmony, flame, wishes, stock, treasures, letter, festival}
src/pets/next.js       nextFor(petId, world) — the curator's next activity per pet (from village/next.js)
src/pets/paths.js      image-space geometry: doors, stand points, benches, path graph, lamp/window/chimney points
src/pets/sprite.js     petSprite(id, {frame, size}) HTML; giftIcon(kind) SVG; backdrop(petId) style
src/home/village.js    the #/world screen (map, HUD, cards, intro, returns)
src/home/life.js       pet behaviour engine + ambient canvas
src/ui/styles/home.css the home's styles (replaces home-world.css)
assets/art/pet-*.png   baked 5-frame sheets (tools/bake-pets.mjs, headless Chrome canvas)
```

- `world/state.js` sets `state.pets = derivePets(...)` and drops
  `deriveVillage`. Consumers of `state.village` move to `state.pets`.
- `worldChangeLine` and `newlyBuildable` are re-expressed as gifts and a
  newly affordable treasure.

## 7. Gates

`tools/verify.mjs` stays green. Sections tied to the canvas village are
rewritten, not deleted silently:

| Section | Change |
|---|---|
| §16 | tests `derivePets`: mood decay, ring doubling, harmony, flame with kindling, wishes, treasure stock (derive → write → stock) |
| §17 | lints pet lines: no "!", ≤ 96 chars, banned words, every pet has 5 story lines |
| §22 | contrast reads tokens and `home.css` button pairs |
| §23 / §23b | become `check-village-data` (every path point and door inside the map; paths connected) and `check-village` (real browser: 6 pets render, walk, tap opens a card, intro advances, return toast) |
| check-reach / check-resume | drop the `#/world/village` legs; reach covers the new cards |
| `check-home-world` | replaced by `check-village` (in verify) |

`build-precache.mjs` is re-run, and the cold-open budget is still met.

## 8. Acceptance

- `#/world` on a 390×844 phone and on 1440×900 shows only the painted
  village, six moving pets, three small HUD elements and nothing else.
- Each pet's card starts that pet's real next activity. Finishing it
  returns to the village, where the pet celebrates and the gifts are
  counted.
- Neglecting a subject for three days visibly changes that pet, its
  successor's ring line and the harmony.
- Settings, Growth, places, sessions and results share the palette and show
  their host pet.
- Light, dark and reduced motion all work.
- verify passes. Everything is committed and pushed.
