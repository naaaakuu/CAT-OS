# CHANGELOG

> Every meaningful change, newest first. Format: version — date — what and why.
> Versions here are app releases; they map onto the capability milestones in
> `PROJECT_ROADMAP.md` (0.x releases build toward Roadmap V1.0).

## 3.7.0 follow-up: Calmer reading, friends that chirp (2026-10-05)

- Tapping a friend no longer plays a synthetic speech voice: Chai hoots like an owl, Toffee crackles, Matcha trills, Ginger yips, Mallow chimes, all built from tones in `world/audio.js`. Mochi is unchanged.
- Reading type: default passage text 18px to 17px, leading 1.78 to 1.7, paragraph gap 1.35em to 1.1em, column 36rem to 34rem, passage title 34px to about 27px. A paragraph now fits on a phone screen at once. Options are one step smaller with tighter padding and the question card has less side padding, so about three options show without scrolling.
- Settings: Text size moved to the top, shown as four "A" buttons with a live sample (S/M/L/XL labels were opaque). Sizes are 15, 17, 19, 21px. It scales passages, questions and lessons.
- Reading list shows genres without hyphens ("mathematics logic").

## 3.7.0 follow-up: The campfire stays in view (2026-10-05)

- Friends now say only their own word when tapped (Chai "Hoo, hoo.", Toffee "Crackle!", Matcha "Hi hi!", Ginger "Yip!", Mallow "Soft, soft.", Mochi "Mochi."); the blip babble no longer plays under hellos and gossip.

The big bottom bar sat on top of Toffee's campfire, so the camp had to be scrolled into sight.

- The dock is now an overlay: the big "Help" button alone along the bottom (lower-right corner on a landscape screen, so the middle stays clear); "today's three" moved under the top bar (above the button, right-aligned, on a roomy landscape screen).
- The camera opens low enough that the camp (down to y 950) clears the button, on phones, laptops and short windows alike; the plaza stays in view. Painting, scale and life are unchanged.

## 3.7.0: Friends who grow up with you (2026-10-05)

I practise, I improve, my friend grows, my village develops.

- **Every friend starts as a baby.** A new village is six babies: the same
  painted friends with bigger eyes and a shorter body (baked from the same
  art, `tools/bake-pets.mjs --baby`), drawn at seven tenths of full size.
- **They grow with real progress, never with time.** Ten stages as before
  (questions answered right in their subject, words learned for Matcha), now
  in three ages: Baby (0 to 2), Growing up (3 to 6, their own face and their
  hat), Grown up (7 to 10, full size and the rest of their gear). Toffee's
  days now count only days you really answered questions.
- **The card says it in one line.** "Chai is still little. 1 more right
  answer and Chai grows." over ten segments grouped by age; the subject's
  level is the small line under it.
- **Growing up is a moment.** Crossing into a new age shows who they were
  beside who they are now ("Chai is growing up!"), the result screen says
  the same, and every stage still lights 6 Glow for the village.
- **The welcome says the loop.** Toffee: "We are all still little! Every
  question you get right helps one of us grow." Chai: "I'm still a baby owl.
  Help me grow?"
- **Achievement:** "Halfway there" became "Growing up": help a friend out of
  babyhood.
- **Start over** (Settings, Your data): back to the very first day, asked
  twice; the second sheet says exactly what goes.
- **No fixed order inside a level.** Every subject deals the items of a
  level in this learner's own random order (the first passage too), so two
  new players meet different passages first. The order is stable for one
  learner, so the card, the house and the list agree; Start over deals a new
  one.
- Hats on cards get a thin cream edge: Chai's slate cap vanished against her
  blue roof.

## 3.6.0: Glow, the village's currency (2026-10-05)

Learning to Glow to the village. One resource, paid for learning done and
never for time spent.

- **Glow replaces stars as the village currency.** It is a warm light, the
  same light as the lamps, so it belongs to the village and not to an app. The
  0 to 3 star rating stays as feedback on a run (accuracy, then pace) and as
  how glad a friend is to see you; it no longer pays anything.
- **What pays** (`src/pets/glow.js`, one home for every number): 1 for each
  question you answer, 1 more when it is right, 2 for finishing a whole set,
  6 each time a friend grows a stage, 10 when today's three friends are all
  helped, and a little for the fire (your place in the run of days, up to 5)
  on a day that earned.
- **What never pays:** time. A question is worth the same in four seconds or
  four minutes; an open app, an idle tab and a skipped question pay nothing;
  an answer faster than a person can read (under a second) is a blind tap and
  pays nothing. Each question pays once a day for being answered and once for
  being right, so replaying the same ones earns no more; tomorrow it is
  review and pays again. A fast learner who gets through more questions earns
  more, and a slow one is paid the same per question.
- **Every area counts the same way.** Reading, jumbles, summaries, odd one
  out, placement, vocabulary and the Gauntlet all pay by their questions. A
  Word DNA visit is one question per family and kind.
- **The result says why.** "+9 Glow" with "4 answered, 3 right, set
  finished", or "No new Glow this time: these questions already paid today.
  Tomorrow they count again." The village card says it in three lines
  (Learn, Grow, and that speed never counts).
- **Levels cost more Glow, so the pace of a village level is about what it
  was:** 0, 15, 36, 63, 99, 144, 198, 264, 342, 435, then 108 each. Existing
  villages re-derive their level from their records; nothing is stored.
- **For later:** `derivePets` returns `glow` and `sources` ({ practice,
  milestones, gifts, fire }), and each visit carries `glow` ({ tried, right,
  set, total }), so character growth, achievements and the village can read
  one number. `changeBetween` adds `why`, `repeat` and `milestone`.
- A friend's mood is still weighted by the run's star rating (it includes
  pace). Left alone on purpose; say so if it should follow Glow too.
- Fixed a class collision: the new Glow icon is `.cw-orb`, because `.cw-glow`
  is already the lamps' halo.

## 3.5.0: Characters that speak, cards you read in five seconds (2026-10-05)

The village art is untouched. What changed is what a tap on a friend gives you.

- **A friend's card shows five things.** Who they are (name, the subject
  they teach, their rhyme), your level, the big Help button, and an
  Achievements button. Everything else (mood, what they noticed, stages,
  other ways in, the story, the best friend) sits under "More about {name}",
  closed.
- **Level, said plainly.** "Level 2 of 5: Intermediate", a segmented bar, and
  one line: "Finish 5 more jumbles to reach Medium." Chai, Mochi, Ginger and
  Mallow use their real Basic-to-Advanced ladders (`pets/progress.js
  levelFor`); Matcha and Toffee use their ten growth stages. Nothing is
  locked; it only says where to practise next.
- **Achievements for the whole of CAT OS**, not per section: ten, one short
  line each (first round, 3 days, a 7-day streak, 50 and 500 questions, a
  spotless round, a level cleared, 3 and all 5 subjects, a friend at stage
  5). They are read from what is already recorded, so nothing new is stored
  and no economy number moved.
- **Signature voices.** Every tap on a friend makes them say the same thing
  in their own voice, Hodor-style: Chai soft and slow ("Hoo, hoo. Every book.
  Twice."), Mochi heavy and low ("Mochi."), Matcha bright, Mallow dreamy,
  Ginger quick, Toffee fast (`SIGNATURE` in `pets/pets.js`, `signature()` in
  `world/audio.js`). It uses the device's speech voices and falls back to the
  friend's own blips where there are none. The old tap quips live on in their
  "muse" lines. Sound off stays silent.
- `check-pets` now also covers the signatures, `levelFor` and the ten
  achievements on a synthetic world.

## 3.4.0: The content, read properly (2026-10-05)

An audit of VARC coverage against the five areas a CAT student expects
(Reading Comprehension, Para Jumbles, Para Summary, Para Completion,
Vocabulary): all five already had a house, a friend, a sign on the map and a
row in "Every subject" (Vocabulary is Matcha's Meadow: 2,577 words, some asked
inside a real sentence, plus the word bank), so no new place was added. What
made the experience feel unfinished was the reading surface itself and one thin
subject.

- **RC's scrolling was broken.** A run scrolls its body (`.run__body`), not
  the window, but the session scrolled and listened on `window`: every
  question after the first opened scrolled 157 px down with its first line
  cut off, the reading hairline never moved, and the paragraph numbers that
  questions cite ("the second paragraph") were clipped on any screen wider
  than 46rem. All three fixed at the cause (`toTop()` and a body-scroll
  listener in `reading-comprehension/screens/session.js`; room for the hung
  numerals in `world.css`).
- **Passage and question side by side on a wide screen**, the way the exam
  sets it: passage left, question right, each scrolling on its own; the
  evidence jump scrolls the passage column. Phones keep the passage one tap
  away above the question.
- **The briefing shows the passage's first line**, the best reason to begin;
  the difficulty chip (repeating the stage) is gone. The reading screen lost
  its "~N min left" figure, a second clock beside the real one; the passage
  title continues in the briefing's display face instead of a heavy bold;
  "I've read it…3 questions" reads "On to the 3 questions". The run's
  scrollbar sits at the screen edge, not in the middle of a desktop.
- **Para Completion**: 19 of its 27 paragraphs have the gap in the middle,
  yet the gap chip said "the paragraph stops here" and five descriptions said
  "stops one sentence early". The chip now says "a sentence is missing here"
  for a middle gap, and the copy describes the real task. Bank paragraphs
  (completion, placement, word bank, arguments) are set in the reading serif
  like a passage, and the chips that repeated the subject name or showed the
  tier's internal name are gone; PJ/PS/Odd One Out lose the difficulty dot
  that repeated their tier.
- **Nine new Para Completion paragraphs** (pc-0028 to pc-0036, batch-pc-003:
  three foundation, three easy, three medium, three of them with a middle gap),
  so a beginner's first visit to the clock tower is no longer one paragraph.
  36 items; answer key now 9/9/9/9 across A–D.

## 3.3.2: What to do, first (2026-10-05)

A new player tapping a friend landed on a wall of game state before anything
else: a mood chip, a stage bar, a stars-and-home-gift paragraph, a locked
story list and a best-friend card, all above the one button that actually
starts practice. The card now leads with who the friend is, what they teach
in CAT's own terms (`cw-role` reads "Teaches Reading Comprehension", not a
house name), what they are saying, and the single "Help" button; the level
bar moved just below it. Everything else that was really a game achievement
— the star/gift explanation, the story chapters, the best friend — now lives
behind one clearly labelled "Achievements" button, reusing the native-popover
pattern the ⓘ info buttons already use (Escape and an outside tap close it,
no script). The "Everything with {name}" list is renamed "More ways to
practice {subject}" so it reads as practice options, not a completionist
list (`petCard` in `src/home/cards.js`, `.cw-achieve`/`.cw-achieve-pop` in
`src/ui/styles/home.css`). The growth system itself (stages, stage titles,
economy) is unchanged; this is presentation only.

## 3.3.1: Two mechanics that read as what they are (2026-10-05)

Para Completion read as a re-skin of Para Summary (same plain paragraph,
same question card), and Sentence Placement asked its gap as a detached
"After sentence 2" multiple-choice list instead of a CAT-style interaction.

- **Para Completion**: the gap is now a visible dashed chip inline in the
  paragraph ("the paragraph stops here") instead of a near-invisible
  underline, and the question is framed as "Complete the paragraph" rather
  than repeating the bank's name a second time (`bank-blank--gap` in
  `src/ui/styles/components.css`, `bodyHTML`/`showItem` in
  `src/modules/verbal-bank/screens/session.js`).
- **Sentence Placement**: the sentence to place is now placed by tapping a
  "place it here" slot directly between the numbered sentences it could
  sit between, not by reading an "After sentence N" option list
  (`sp-slot__btn`, same two files). Submission and scoring are unchanged;
  a tapped slot resolves to the same option letter the engine already
  expects.

## 3.3.0: Friends you get attached to (2026-10-03)

The owner, after 3.2.0: people should get hooked on the characters. Introduce
them properly and fun at the start, each one being their subject (Chai the
bookworm keeps Reading); stop explaining Para Jumbles and the rest in the
middle of play, put the explanation behind a small info button instead; after
a set (one passage, three odd ones out) all the friends should come together
in the middle and celebrate; the more you work a subject, the more its friend
grows, at least ten upgrades, fully upgraded only when every question in the
subject is done; and make the map livelier.

### Each friend is their subject

- **Personalities**: Toffee never misses a day and wants to race you (the
  daily fire, the Gauntlet); Chai has read every book in the village twice
  (Reading); Ginger sorts socks by colour, then by mood, and knows where
  everything goes (Para Jumbles, Sentence Placement); Mochi says it short and
  finishes your sentences (Para Summary, Para Completion); Mallow always
  spots the sheep among the clouds (Odd One Out); Matcha collects words like
  stickers (Vocabulary). `pets.js` gives each a `tag`, two `meet` lines (who
  they are, then why that is their subject), five `muse` lines, `cheer` and
  `grow` lines, all through the copy gate.
- **Meet the gang** on the first visit: Toffee says hello, then the camera
  goes to each friend in turn; they hop, say who they are, and a card names
  the subject they keep with one line on why. One tap each, a Skip, then
  Chai calls you to the big button. Ten taps in all.
- **They talk while you watch**: every few seconds one friend you can see
  says something very them ("Plot twist: the butler was nice all along.").

### Ten stages of growing up

- `economy.js stageOf(done, total)`: stage r needs total × (r/10)^k with
  k = log10(total), so stage 1 is the first question you get right, stage 10
  is every question in the subject, and the early stages come quickly
  whatever the subject's size. Chai counts RC questions answered right at
  least once (`state.reading.qSolved`, second looks included) plus
  arguments; Ginger counts jumbles and placements solved; Mochi summaries and
  completions; Mallow odd-one-out sets; Matcha words in memory, root
  families, word parts and word-bank items; Toffee grows with the days you
  come (60 for the last stage).
- **Every stage shows on the friend** (`sprite.js petGear/petRing`): a
  twinkle, a bigger body (0.92 to 1.2 of full size), their own hat (Chai a
  scholar's cap, Matcha a flower crown, Mochi a beret, Ginger workshop
  goggles, Mallow a stargazer's hat, Toffee a party hat), a ring of light,
  a floating charm, gold trim, a trail of sparkles, a second charm, a golden
  aura, and at stage 10 a jewel and a crown of stars. Each stage has a name
  (Chai: Page Turner ... Keeper of Every Book). The gear rides inside the
  walking rig, so it turns and hops with them, on the map and on every card.
- **Hearts are retired**: one progression, not two. Every second stage is a
  chapter of the friend's story and a gift for their home (the old five
  hearts' lantern, flowers, bunting, warm windows, golden glow). Cards,
  Records and Progress show the stage; the result screens say "Ginger grew
  to stage 4: Mapmaker! New: a glowing ring of light."
- A friend who grew gets their own card on the way home: their new look,
  their new name, ten pips, what is new, and how much more to the next.

### A party after every set

- Coming back from any finished run, every friend runs to the plaza (three
  times their walking pace), makes a ring round the friend you helped, and
  they cheer, hop and throw hearts while confetti goes up three times; the
  helped friend says thank you in the middle. A new sound (`party`). The
  cards for growth, a new level or the day's gift wait for it to wind down.
- **Sets are three things**: the big button, a friend's card and the place
  pages start three jumbles, three summaries or three odd-ones-out (a
  comma-separated id list, recorded as `pj-trio:` / `ps-trio:` /
  `ooo-trio:`), and placement and completion sets are three. A passage is
  one passage. Whole tiers are still a tap away on the tier tiles.

### Explanations behind an info button

- **`src/ui/info.js`**: one small round ⓘ (a native popover; where a
  browser has none, the text simply shows) and `SUBJECT_INFO`, a plain
  explanation per subject (what CAT asks, how it is marked, the one trick).
  The circle is 22 px; the tap target is 44.
- **Sessions open on the question.** Para Jumbles' eyebrow is the one
  instruction ("Tap the sentences in the author's order"); Odd One Out's
  "Today's mission" box, the item's strategy paragraph and the hints, Para
  Summary's mission, a bank item's challenge and the reading briefing's
  explanation and star rules all moved into the ⓘ beside the eyebrow.
  Teaching after an answer and the end-of-set mentor are untouched.
- **First visits open on the subject.** `#/pj`, `#/ps`, `#/ooo` and `#/wd`
  no longer show a full introduction page first; the journey's title has
  the ⓘ and a link to the full guide (`/about`).
- **Place pages** keep their notes inside the ⓘ by the title ("This
  place"), not between the button and the shelves.
- The journey pages, now reached directly, stood their quiet text on the
  painted stage at 4.1 to 4.4:1: one step darker ink in rooms clears AA. The
  Word DNA tree's "Coming later / Not built yet" row is gone (the look-alike
  words live in Matcha's pond). A bank set's back link names the rose
  cottage and the clock tower.

## 3.2.0: Every house a VARC subject, every passage CAT-sized (2026-10-03)

The owner, playing 3.1.0: the zoomed-out village does not look good; only
reading (Chai) seemed selectable; DILR and quant have no place here, every
house should hold a VARC subject; a beginner's "Foundation" passage on cause
and effect ran six paragraphs; the whole-passage explanation should sit
behind a button, explained as you would to a ten-year-old, and one day cost a
rewarded ad (no AdMob yet: prepare for it); take passages from where CAT takes
them; think like a setter, a 99th-percentile aspirant and a struggling one.

### The village: no zoom, and every house says what it teaches

- **No zoom.** The painting always fills the screen at full detail. On a
  phone it fills the height and you scroll left and right; a mouse wheel
  scrolls it sideways. The whole-village button, pinch zoom, ctrl+wheel and
  the +/- keys are gone. Desktop opens at the same detail instead of a
  shrunken overview.
- **Why "only Chai" worked:** every other subject was reachable, but each
  house's name plate showed only on mouse hover, so on a phone no building
  said what it held and the one visible action was "Help Chai". Every house
  now carries a sign with its subject and its friend's face, always up and
  always tappable.
- **Every house is a VARC subject**: Reading Comprehension (library), Para
  Jumbles (workshop), Para Summary (archery cabin), Odd One Out
  (observatory), **Sentence Placement (the rose cottage, Ginger's second
  house)**, **Para Completion (the clock tower, Mochi's second house)**,
  Vocabulary (greenhouse), and the Gauntlet at Toffee's notice board.
  Settings and Progress moved behind a gear in the top bar and the bottom
  bar. No DILR, no quant.
- **Every subject in one list**: the top bar's grid button lists all eight,
  each a tap from its next round. Toffee's welcome now says that each house
  holds one part of CAT English and its sign says which.
- A drag no longer swallows a later keyboard click on a house.

### Reading: CAT-sized passages, and a passage explained simply

- **Checked against the exam:** CAT 2025 set four passages of about
  400–450 words with four questions each (the longest near 650 words). The
  corpus had 47 passages asking five or six questions and 25 running past
  600 words, including "Foundation" passages of 640 words.
- **Sizes are now enforced by the loader** (`core/learning/journey.js`
  STAGE_SIZE): Foundation 150–350 words, three paragraphs, three
  questions; nothing anywhere asks more than four questions or runs past
  650 words. Long passages were cut by a setter's rules (drop the
  paragraph the argument can lose, never the turn or the concession; keep
  the four questions that make a CAT set; repair every explanation that
  pointed at a moved paragraph), and every passage was re-staged to fit.
- **The corpus now:** 146 passages and 551 questions, averaging 451 words;
  Foundation 18, Developing 32, Intermediate 44, Advanced 34, Elite 18.
  25 passages were trimmed, 22 cut from five or six questions to four, and
  the first passage a new learner meets is chosen by hand (rc-0116, a queue
  that felt like an hour).
- **New beginner shelf:** 24 new passages (rc-0116–rc-0139), 16 Foundation
  and 8 Developing, written for a first week of reading: three short
  paragraphs, plain sentences, a real argument with a turn, three CAT-style
  questions.
- **Real essays:** a classics shelf of public-domain essays quoted word for
  word (William James, Chesterton, Sapir, Woolf, Tagore, Dewey, Veblen),
  with original CAT questions; the briefing and the Learning Page name the
  source.
- **Explain this passage simply.** After a passage, one button opens the
  passage told the way you would tell a ten-year-old: the big idea, the
  story in short sentences with an everyday picture, one line per
  paragraph, and what the writer thinks. The expert Learning Page folds
  underneath ("Go deeper"). Every passage has one (`mentor.eli10`, checked
  by the loader: a line per paragraph, short sentences, no em dashes).
- **Rewarded-ad seam, no ads:** `src/core/ads/rewarded.js` is the one door.
  Today it is open. When a native shell defines
  `window.CatOSAds.showRewarded()`, the explanation asks for one short video
  and stays unlocked on that device. `localStorage 'catos:ads' = 'test'`
  previews the locked path with a three-second stand-in.

### Sources, honestly

Aeon licenses an essay for USD 650 and only in full; The Conversation
charges for exam materials; past CAT papers belong to the IIMs and coaching
mocks to their institutes. None of them is pasted into an app that will
carry ads. Passages are original, written to CAT's measured shape, or
public domain. Fill-in-the-blanks, grammar and standalone vocabulary
questions have not appeared in CAT since about 2014, so vocabulary stays
where CAT uses it: inside sentences.

## 3.1.0: The helping village (2026-10-03)

The owner, playing 3.0.1: it is too complex, nobody knows how anyone relates
to anyone, there is no reason to play, the village looks like a still picture
up close, and the music is a drone nobody remembers. The brief: make it
simple, give it a purpose ("people play when they feel they are helping"),
make the friends enthusiastic and busy round their homes, make sound always
on and catchy, remove em dashes and junk, make content easy to find, and make
people come back every day.

### One loop anyone understands in ten seconds

- **Help a friend → earn stars → the village grows.** Every finished round
  earns 1 to 3 stars (accuracy, then pace), plus 1 for a perfect run inside the time.
  Stars add up to a **village level** (Lv 2 at 5 stars, Lv 3 at 12, … Lv 10
  at 145, then every 36), and each level puts something on the map: plaza
  lanterns, bunting, flower boxes, firefly jars, a swing, wind chimes, a
  kite, lily-pad lights, sky lanterns. A level-up gets a celebration.
- **Retired:** the six gift types, the gift ring and its doubling, the
  satchel, treasure recipes and the "make" button, harmony text, the
  letter on the notice board, the three wishes. `village-treasure` records
  are ignored; everything else is still derived from records, so existing
  learners keep their history, stars and hearts.
- **Today's three friends.** Each day the three friends who miss you most
  wear a "!" on the map and sit in a row of faces at the bottom of the
  screen. Help all three and today's gift opens: 5 bonus stars.
- **One big button.** "Help Chai · Read a passage · 5 min ▶" always names
  who you are helping and what you will do. One tap and you are learning.
- **Toffee's fire** is the daily streak, with a week strip and spare logs
  (one saved every 7 days in a row covers a missed day). Toffee's mood and
  hearts now follow your days, not the Gauntlet alone.

### A purpose, and relations you can see

- **The story in one breath:** the village is losing its words. Chai's pages
  are going blank, Matcha's word garden is wilting, Mochi's notebook lost
  its notes, Ginger's gears are stuck, Mallow's stars went dim. Each friend's
  trouble is told in five chapters, one per heart, and each heart decorates
  their home on the map (a lantern, flowers, bunting, lit windows, a golden
  glow).
- **Who is who:** a card names all six, what each teaches, how they feel,
  and the three best-friend pairs (Chai and Mochi, Ginger and Mallow, Matcha
  and Toffee). Best friends visit each other's homes.
- **Toffee's welcome** says the problem and the purpose in four lines, then
  points at the big button.

### Friends who are alive and glad to see you

- **They walk on their own feet.** The six sprite sheets were rebaked at
  384 px (sharp when zoomed) and `tools/bake-pets.mjs` now finds each
  friend's feet; `petRig` cuts the frame so the two feet step under the
  body. Each friend has a gait: Chai waddles, Mochi plods, Ginger trots,
  Matcha bounces, Toffee hops, Mallow floats.
- **They do chores round their homes** with a prop in hand: Matcha waters
  the garden, Chai reads and sweeps, Mochi sips tea and sweeps, Ginger
  hammers, Mallow rains on the flowers from a little cloud, Toffee dances by
  the fire. Water drops, dust, sparks, music notes and letters fly.
- **They greet you.** The friends on screen wave as you arrive; after a day
  away, the one who missed you most walks over to say so; the friend you
  helped thanks you and their best friend cheers.
- **They talk, with voices.** Every line plays a little babble in that
  friend's own pitch. Lines are warm and excited now (the old "no !" rule is
  lifted; no guilt, no grading).
- **They notice things** (the "smart friend"): each card types out one line
  built from your own answers: the question type that trips you up, how many
  words are fading, last set's score and whether you are ready for harder.

### Sound

- **A real theme song.** A sixteen-bar tune in C major at a bouncy shuffle,
  written note by note around the Valley Phrase hook, with bass, off-beat
  chords, soft drums and a shaker. Each pass is arranged differently.
- Each friend's place plays it on their instrument (flute, kalimba, clarinet,
  pizzicato, bells, banjo). Timed reading gets a quiet focus mix. Night is a
  slower music box.
- **Always on, full volume, everywhere,** from the first touch, until turned
  off. The song never restarts between screens. Reward sounds (stars, hearts,
  level-up, today's gift) quote the hook; effects are louder.

### Content you can find

- Place screens are pages now: a painted header with the friend at the
  door, the one big button, then every passage, tier, field and shelf in the
  open. Nothing hides behind the old pull handle.
- Each friend's card lists everything you can do with them.

### Cleaner

- **No em dashes** in anything a learner reads: 124 interface and voice
  strings and 1,763 content strings (paired dashes became commas, single
  ones colons or commas).
- The camera keeps pinch, wheel and keys; the +/− buttons went, one overview
  toggle stays. The satchel, ring lines, gift tallies and recipe chips are gone.

### Gates

- `check-pets` and `check-pet-economy` test the new roster, voice rules (96
  characters, no em dashes, no banned words) and economy (stars, levels,
  decorations, today's three and the gift, the fire, hearts, the welcome,
  `changeBetween`). `check-village` drives the new screen: the top bar, the
  big button, five cards, decorations by level, two feet per friend, no chores
  under reduced motion. Precache and cache versions bumped.

## 3.0.1 — A living river (2026-10-03)

- All five visible river reaches flow, with refracted painted water,
  downstream foam, surface waves and ripples where the learner taps.
  Cached masks protect the banks, bridges and lilies. Five small canvases
  share the village clock, cap water updates at 30 fps, and respect reduced
  motion and tab visibility.
- Stronger, uneven gusts move eleven trees and eight flower beds. Sunlight
  shifts, cloud shadows drift, butterflies visit more gardens, birds arrive
  sooner, and new pets explore the plaza more often.
- Desktop starts with the whole village visible. Accessible zoom and
  overview buttons also let phone users see the full map and zoom back in.
- Weather and season changes now reach the motion layers while the village
  stays open. Rebuilt the motion atlas and offline cache fingerprints.
- Browser checks sample successive water frames in each reach, check the
  dry dock, exercise overview and zoom, and verify reduced motion.

## 3.0.0 — The pet village (2026-10-02)

The owner found the app too complex:
- a painted home at `#/world` with a second, older sprite village behind it;
- three visual languages: the painted home; the 3D-sprite village, places
  and rounds; and plain studio settings and progress;
- a home crowded with signs, a dock, a header and zoom buttons;
- DILR and Quant buildings this app does not have;
- mascots that never moved;
- an economy (goods → crafts → orders → coins → buildings) hidden on the
  second map.

The brief:
- keep the painted look and the six mascots;
- make it calmer and cleaner, but alive in every small detail;
- give each VARC subject a pet that walks, talks and interacts;
- make the village suffer when any one subject is neglected;
- build an economy that keeps people coming back ("use all the tricks");
- make every other screen belong to the game.

The owner approved the design (`docs/superpowers/specs/2026-10-02-pet-village-design.md`)
and chose the pets' names. Then, on seeing it, said the map still felt like a
static image, so the painting itself was made to move.

### One village, six pets

- **`#/world` is the painting, full-bleed, with three small things on it:**
  Toffee's flame and the village name, the satchel and the cottage, and
  today's wishes. There are no signs, no dock and no zoom buttons. The map
  pans by drag, wheel and arrow keys, and zooms by pinch or ctrl+wheel.
  `#/world/village` redirects here.
- **Six pets, one per subject:**
  - **Toffee** (flame): CAT pace, the Gauntlet, and the village fire
  - **Chai** (owl): Reading
  - **Matcha** (sprout): Vocabulary
  - **Mochi** (pebble): Para summary and completion
  - **Ginger** (fox): Para jumbles and placement
  - **Mallow** (cloud): Odd one out

  Each lives in a building already in the painting.
- **The pets' life on the map:**
  - they hop-walk a traced path graph (`src/pets/paths.js`) to the plaza,
    the benches, the fire, the dock and each other's doors;
  - they blink, chat in pairs (some of it real gossip about who needs a
    visit), carry their gift to the next pet in the ring, and walk home to
    sleep at night;
  - they react with a hop and hearts when tapped;
  - how far and how often they wander is their mood.
- **Five frames per pet** (idle, blink, happy, talk, sleep) were baked from
  the original art by `tools/bake-pets.mjs`. No new artwork was drawn.
- **Buildings have jobs.** Tap a pet's home for its card. Your cottage holds
  sound, your village name and the other rooms. The clock tower is Progress,
  and its painted face keeps real time.

### The living painting

The things already painted in the village move now. Each is a patch cut out
of the painting with its edge feathered, so at rest it is pixel-identical to
what lies beneath it. This was checked patch by patch: the largest
difference in any channel is 1.

- **Turning:**
  - the workshop gear and its two wheels turn in their own tilted planes;
  - the armillary sphere turns;
  - the telescope pans now and then (more often after dark).
- **Water:**
  - the falls at the left edge run, as do the pond's outflow and the stream
    under the clock-tower bridge;
  - the pond drifts and six lily pads bob.
- **Cloth and trees:**
  - the clock tower's banners wave;
  - the greenhouse bunting and both awnings stir, and the patio umbrella
    rocks;
  - eleven canopies, the plaza tree among them, sway as a gust crosses the
    map from the west, harder in the rain.
- **Fire, smoke and light:**
  - the campfire flickers;
  - the cottage's painted wisp of smoke rises;
  - smoke pours continuously from all four chimneys and the teapot steams;
  - every painted lamp and lantern (25) breathes a warm halo: faint by day,
    full at dusk and night. Their coordinates were re-read from the
    painting, and four had been 10 to 15 px off.

The cut-outs are baked into one atlas, `assets/art/home-motion-v1.png`, by
`tools/bake-motion.mjs`. A CSS mask did the same job, but each masked
element is its own render pass on every frame. On an Intel HD 520,
thirty-six of them took the desktop village at dusk from 33 ms to 50 ms a
frame. With the alpha baked in and the halos on plain alpha instead of a
blend mode, it holds a 16.7 ms median, phone and desktop. Reduced motion
mounts none of it.

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
- **Nine treasures, made in order:** plaza lanterns, bunting, flower boxes,
  firefly jars, the swing, wind chimes, a kite, lily-pad lights and
  sky-lantern night. Each is drawn on the map. The recipes mix several pets'
  gifts, and the later ones need all six.
- **Reasons to come back** (the owner asked for them; THE WORLD A11 records
  that this overrides the old ban on retention hooks):
  - three daily wishes aimed at the neediest pet. Granting all three pays an
    extra gift from every pet;
  - Toffee's flame, the daily run, protected by kindling;
  - a letter from the pet who missed you most after a day away;
  - a thought bubble over whoever needs you;
  - festival nights when everyone is happy;
  - a celebrating pet and a toast every time you return from a run.

### Every screen hosted by its pet

- **One palette:** warm cream, village sage, honey and terracotta, plus a
  forest-night dark theme. `tokens.css`, `world.css` and `game.css` agree.
- **Every learning route sets `html[data-host]`.** Rooms stand in a soft
  painted crop of the host's home instead of a canvas scene. The run bars
  of a reading run, a word round and the Gauntlet carry a host chip.
- **Place screens** show the host pet standing at its own painted door
  (`placeHero()` frames the screen on the door and says where it lands).
  The host greets you.
- **Results** show:
  - the pet celebrating the gifts it made;
  - the ring bonus;
  - any new heart and its story line;
  - a treasure that just became affordable.

  Every room's last button is "Back to the village", where the pet hops
  and a toast names the gifts ("+2 Notes from Mochi · doubled by the ring").
  Toured in a real browser with one finished run in each of eight rooms.
- **Progress is the clock tower,** with six pet rows. **Settings is your
  cottage. Records are kept by Toffee.** The bottom rail is Village ·
  Progress · Cottage.

### Fixed on the way

- **Dialog focus.** A dialog opened and closed within one frame left focus
  on a card about to hide. `ui/modal.js` focused it a frame late, after
  Escape had already handed focus back. This was the flaky "did not give
  focus back" in check-village.
- **Pet placement.** A place screen pinned its pet at 44% of the screen
  height, so Chai stood on the greenhouse roof 190 px below her own door.
  The pet's breathing also animated the same `translate` that centred it,
  so it drifted by half its width on every breath.
- **Hidden text and boxes:**
  - the place sheet's grip covered its first line;
  - a new learner's Progress band was 0 px wide;
  - the Records rows ran 42 px off a phone.
- **Rooms that skipped the welcome.** The Loom, the Table, the Bench, the
  Terraces and the banks ended on "Back to the world", which skipped the
  village and its welcome.
- **Contrast.** The room intros' small asides sat on the painted stage at
  4.3:1, filled hearts were about 3:1, and honey text was 3.2:1. They now
  use the second ink, a `--heart` token and a `--honey-ink` token. An empty
  heart is an outline ♡.

Two adversarial reviews (a code reviewer and a visual critic, both reading
3.0 against the spec) found more, and it is fixed:

- **The old reward layer.** Four verbal rooms still raised the 1.x "Level 3
  / Achievement" modal over the result and on into the village. It is gone,
  with `cat-celebration.js`.
- **The pet comes first.** The pet's reward strip leads every verbal result
  instead of sitting under the mentor's essay. It also names a slow ring
  ("Mochi has run low on notes. A visit to Mochi doubles Ginger's maps next
  time").
- **One count.** A wish bonus is counted as the bonus, so the result and
  the toast agree.
- **The toast** is one line at its own width and hides behind an open card.
  The pet's line waits for it to go.
- **The letter** is an envelope on the painted notice board.
- **Who needs you, off-screen.** When the pet that needs a visit is off a
  phone's screen, a chip at that edge points to it.
- **The leaving guard.** Leaving while the village or a place loads no
  longer starts it underneath the next screen.
- **Accessibility:**
  - `<summary>` is in the dialog's focus trap; Tab had skipped "More with
    Chai" and the story;
  - Toffee's hello and the pets' tap lines reach screen readers;
  - reduced motion also stops breathing, blinking and hops.
- **The precache.** Core now follows `index.html`'s stylesheets (two were
  missing) and the six pet sheets. The companion strip, a bake input, is no
  longer downloaded.
- **Dead code.** The Wick script, `world/growth.js` and the unread
  `state.growth` are deleted.

### Removed

The canvas village and everything only it used:
- `src/village/`: the renderer, scene, terrain, life, grove, art bank, the
  village derivation, and both screens;
- `village.css`, the old menu (`world/menu.js`) and `home-world.css`;
- the goods, coins, orders, neighbours and stages in `world/economy.js` and
  `world/icons.js`;
- the 2.2 Cute Nature sprites and Wick's frames that nothing referenced (61
  PNGs). The plant stills `<cat-plant>` uses are kept.

In all, 77 files and about 5,550 lines. The cold open is 51 modules / 538 KB.

### Gates

| Section | What it checks now |
|---|---|
| §16 | Derives the pets (`tools/check-pet-economy.mjs`, `tools/check-pets.mjs`) |
| §17 | Checks the painting and the six sheets, and that every place has a line in register (Wick's script is gone) |
| §22 | Reads the village's button colours from `home.css` |
| §23 | `tools/check-village-data.mjs`: the path graph, sampled against the painting's own pixels. It also fails if the motion atlas is staler than its patches |
| §23b | `tools/check-village.mjs`: six pets walking, the painting moving (and absent with reduced motion), the lamps lit, cards, focus, a treasure made, night, phone width, offline |
| §24 | Now walks into the reading result screen; light and dark both clear AA. Its in-page steps wait for their control instead of failing a slow load |
| §29 | Ran again: the 3.0 rewrite had dropped the two exports verify reads, and the section crashed |
| §30 | Comes back to the village the way a learner does: one navigation, not a navigate-and-reload whose unseen first render used the greeting up |
| check-reach | Opens the cottage card instead of the old menu |
| check-interruption | Checks the satchel |
| check-hostile-records | Puts broken treasure records through the pets |

## 2.2.0 — One art pack, and nothing drawn by hand (2026-09-29)

The owner supplied a new art pack ("Cute Nature — study garden") and asked
for every old graphic to go, the map to be rebuilt from the pack's elements
only, the UI to follow the pack's design, and the learning content to be
left exactly as it was. Not one content file changed.

### The village is the pack's

- **`src/village/art.js` is a sprite bank now.** The five files of
  hand-drawn canvas recipes (`brush.js`, `art-nature.js`, `art-things.js`,
  `art-buildings.js`, `art-figures.js` — people, animals, buildings, trees,
  glyphs, effects) are deleted. The pack's daylight bakes live in
  `assets/art/` (65 PNGs, 2.1 MB, precached) with their manifest in
  `src/village/sprites.js`. The renderer's contract is unchanged —
  `art(name, params, scale)` is still synchronous; images decode in the
  background and a sprite asked for early repaints in place when it lands,
  and the renderer redraws.
- **The Hearth (five levels) and the Reading House (four)** are the pack's
  models. **The Word Garden, the Root Workshop, the Loom and the Market are
  open-air yards** on trodden ground, built prop by prop from the pack, and
  every level adds props you can see arrive. Their level names and lines now
  describe what is drawn; costs, standing, effects and helpers are unchanged.
- **The map:** no river, no bridge, no jetty. One pond (the pack's), paths
  of stepping stones, oak, birch and pine, benches, lamps, planters and
  fences. The land plots became the paddock, the orchard, the farm, the
  birch walk and the square. Every building, cottage spot and plot keeps its
  validated coordinates.
- **Wick** is the pack's cat, with its Idle, Walk, Read, Sleep and Celebrate
  clips. The pack has no people or animals, so the neighbours, workers,
  sheep, ducks, koi, birds, butterflies, fireflies, smoke and cloud shadows
  are gone from the map. The neighbours' orders, names and reasons are
  unchanged; in the interface a person is their initial on a disc.
- **The Rootwood** grows through the pack too: bare ground, a planter, a
  shrub, a birch, an oak, a pine for a landmark.

### The interface follows the pack's studio design

Cream paper, deep fern for what matters, a serif for names, small
letter-spaced labels, hairlines and quiet shadows; the painted glyph icons
are replaced by a line-icon set (`src/world/icons.js`).

### Gates

- §23 (map data) and §23b (the running village) no longer know about a
  river; §23b waives the pond, the stepping stones and a yard's own props
  (reported, never silent), and seeds real plot ids — it had been seeding
  `p1`…`p5`, which are not plots, so no open land was ever checked.
- The art section checks that every file in the manifest is on disk and
  that every sprite name the village asks for exists in the pack.

## 2.1.4 — The screens no gate could see, and the one irreversible thing (2026-09-16)

The audit's adversarial pass returned its verified set after 2.1.3 was
tagged: 73 findings confirmed, 134 rejected. One critical, ten major. These
are the ones that survived verification and had not already been taken.

### Two screens nothing could see

Both for the same structural reason: §24 opens ROUTES, and neither of these
is a route.

- **The Gauntlet's question rendered at 1.14:1, in BOTH themes.**
  `round.js` wraps its question in `<div class="vround">`, whose
  `background: var(--g-panel)` is the cream card every round in the product
  reads on; `wilds.js` wrote the same four classes straight into
  `.run__body` with no wrapper, so the text inherited `--g-ink` onto
  `.run`'s permanent night ground. The four answer buttons carry their own
  cream background and read perfectly — a learner saw four legible options
  above a blank space, with a three-minute clock running over thirty
  questions. **1.14:1 → 15.36:1.**
- **"Re-read the passage" was 2px tall at y=-127.** `justify-content: center`
  on an overflowing scroll container pushes the overflow out of BOTH ends,
  and the top end of a scroll container cannot be scrolled back to. From the
  first question onward, on every phone-height screen, the learner could not
  re-read the passage they were being questioned on. The centring the design
  wants was already written per-child as `margin: auto 0`.

**The gate learned to open doors.** A route may now carry an `enter` list —
in-page steps run after it loads, each a CSS selector or a fragment of the
control's own words. Three states joined the sweep: the Gauntlet question,
the RC question, and the RC question after an answer. A step that finds
nothing is REPORTED, never skipped. It found "Lock it in" — the most-pressed
button in the product — at 4.27:1 in dark while disabled.

### The one irreversible thing in the product

Importing a backup was a raw browser `confirm()` **whose Cancel performed a
merge**. Once a file was chosen there was no path that did nothing: Escape, a
tap outside, and the button labelled Cancel all wrote to the device. A
dismiss affordance wired to a destructive write is the one thing a dialog
must never be.

- It is the app's own sheet now, defaulting to nothing, saying what is in the
  file first — when it was exported, how many records of what kind.
- **A merge no longer overwrites who this device is.** Importing a friend's
  backup, or an old one of your own, silently renamed the village and
  repointed its awakening: two unrelated villages fused with nothing said.
  The sheet says plainly when the backup is a different valley, and the
  village keeps its own name.
- **The Settings screen told the truth afterwards.** Every toggle, slider and
  picker is painted from state read at render time, and an import replaces
  that state underneath them; the screen showed the pre-import values until
  you navigated away and back.

### The rest

- **The boot watchdog accused a slow network of being a broken one.** A flat
  eight-second deadline is a statement about the network rather than about
  the app: on a genuine Slow 3G first visit — 400 kbps, 400 ms of round trip,
  eight hundred kilobytes still arriving — it fired every single time and
  told the learner their app had failed while it was loading perfectly well
  behind the message. The clock restarts whenever anything arrives, so what
  it says now is what it always meant: nothing has arrived for nine seconds.
  A slow visit is also told, at six seconds, that a slow first visit is a
  slow first visit and not a hang. Measured on Slow 3G with nothing cached:
  canvas at 25.5 s, a populated HUD and callouts at 30.1 s, no false failure
  — against the audit's 35 s and 59 s before the cold-open work.

- **A resting item was re-served immediately.** Ordering resting items last
  is only half the rule: where a tier holds one item — paragraph completion's
  foundation tier holds exactly one — last is also first, and a learner who
  missed it a minute ago was handed the identical paragraph with the
  identical four options. The set declines now and says when it comes back.
- **Six bright rectangles on a dark panel.** The "What Stands" tiles are
  small dioramas — sky over grass, behind a painted building — and in dark
  they stayed at full noon. Four rules shared that gradient by copy; they
  share it by name now, and dark is the same place after sunset. The hero
  canvases above them had the same fault from the other direction: the stage
  behind the prose has honoured "dark mode is night" since it was written,
  and the place heroes asked `state.atmo` instead.
- **Settings' descriptions were starved by their controls.** The row was a
  flex with space-between, so the three-option controls left about a hundred
  and seventy pixels and "The rooms follow your device, or not" wrapped to
  four lines with "not" alone on the last. The label and the control make one
  line, because together they are the decision; the sentence explaining it
  gets the full width underneath.

## 2.1.3 — Interruption everywhere, a skill that went quiet, the edge of the frame (2026-09-16)

Three items from the 2.1.2 list, chosen because a daily learner meets them
first. Each was reproduced against the running app in a real browser, fixed,
and re-driven; the browser tour that proved them is verify §30 now.

### Four engines recorded nothing until the last tap

- **Para Jumbles, Para Summary, Odd One Out and Word DNA** held every answer
  in a Map inside a closure and wrote it down on the very last tap. A tier is
  six to thirteen items — up to a quarter of an hour — and a refresh, a
  backgrounded tab or a deploy threw all of it away with no word. Each engine
  carries the `snapshot()` / `restore()` pair the reading run and the banks
  got in 2.1.2; each answer writes a draft; the set resumes where it was and
  says so once. A Word DNA family interrupted between its Predict and its
  Applies comes back with the Predict locked and the first unanswered Apply
  waiting.
- **A draft cannot claim a mark.** It keeps what the learner DID — the order
  they entered, the option they chose, the sentence they set apart — and
  `restore()` marks it again against the item. A draft carrying
  `is_correct: true` on a wrong order restores as wrong, with its joins
  recounted. Sixty-eight malformed drafts through four engines: nothing
  thrown, every index inside the set, every `finish()` a record.
- **A set left overnight was an eight-hour set.** Every draft — reading and
  banks included — carried the wall-clock start, so a run resumed the next
  morning was recorded with the night in its `duration_ms`, failed the
  "in time" check in `world/economy.js` and cost the learner stars for
  having been interrupted, and inflated total practice time in
  `engagement/stats.js`. Drafts carry ELAPSED time now
  (`core/engine/draft-shape.js`, one rule for six engines): sixty seconds
  before, thirty after, recorded as ninety.
- **A draft is cleared only after the record is saved.** The reading screen
  and the banks cleared it first, so a failed save lost both the record and
  the way back to it. If the save fails now the learner comes back to the
  last item and can finish again.

### A settled skill that went quiet was never offered again

- The curator picks what is slipping, then what is new. A skill the learner
  had mastered and then stopped visiting was neither — its last answers were
  right, and it had been seen — so it never came back. The ledger marks a
  settled skill **due** after a level-scaled interval (3 / 7 / 14 / 30 days,
  `REVISIT_DAYS`), and `nextSkill` offers it once, behind anything weak and
  ahead of anything new. One visit resets its clock, so it never crowds out
  for long the abilities not yet met. verify §20 checks all three orderings.

### Callouts for buildings out of view were invisible

- A callout whose building had left the frame went `opacity: 0`. Keyboard
  users could still reach it (focus pans the camera); pointer users panning
  the valley had no way of knowing that anything out of view wanted them. It
  pins to the edge of the frame now — smaller, still, with a pointer on the
  side facing its building — pips off the same edge stack instead of piling
  up, and a tap brings the village to the building, as focus always did.
  Four of four pinned after a pan to the far corner, inside the frame,
  tappable, 44 px, none overlapping.
- Found on the way: an instant `lookAt` did not cancel a tween in flight,
  so the opening's settle-to-home kept writing over it until it ended.

### Gates

- **§30 `tools/check-resume.mjs`** drives the four modules and the village
  in a real Chrome: answer, refresh, resume, finish, read the record back;
  pan, pin, tap, return.
- **§29** now covers the four engines, the re-marking rule and the overnight
  rule for all six.
- **§20** covers the due skill and its place in the order.

## 2.1.2 — Polish, reliability and systems hardening (2026-09-16)

A pass over 2.1.1 with one question: what would still feel unfinished,
unreliable or unconsidered to somebody using this every day? No new features.
Every defect below was reproduced against the running app in a real browser,
fixed, and then re-driven. Ninety-odd of them.

### Dark mode was an inversion, not a design

- **Two competing `--g-*` palettes.** `game.css` and `world.css` both declared
  fifteen of the same token names, so a token's light value and its dark value
  could come from different files — which is why `.g-cta` rendered white on
  pale mint in dark at 1.84:1. `world.css` owns the colour palette now;
  `game.css` keeps geometry, type and motion.
- **The Gauntlet painted near-black text on a night-blue page in LIGHT mode**
  (1.14:1) while a three-minute timer ran.
- **665 raw hex literals shipped outside `tokens.css`**, including hardcoded
  light-paper inks used on the dark glass card.
- **78 rendered-contrast failures → 0** over ten risk routes in both themes.

### The gate that measures pixels

`tools/check-rendered-contrast.mjs` (verify §24) opens each route in real
Chrome at real size in a real theme, screenshots it, paints every glyph
transparent, screenshots again, and takes the median per-pixel WCAG ratio
between the ink and whatever is actually behind it. Because it never asks the
DOM what colour something "should" be, it cannot be fooled by a correct token
a later stylesheet overrides, by a stage mounted when it should not be, or by
a canvas background CSS cannot describe.

### The offline promise was one throw of the dice

- **One atomic `addAll` of 594 requests.** One dropped request on patchy mobile
  data and NOTHING was cached — the install was discarded and every retry
  re-downloaded all 4.4 MB. Batches of twelve now, with the cache itself as the
  checkpoint, resumable across page lives.
- **A `CONTENT_VERSION` bump deleted 435 library files** the learner's own
  mobile data had fetched. Promotion is transactional: nothing known-good is
  deleted before its replacement is safely present.
- **No revision in the cache key**, so a corrected content file could never
  reach an installed learner. Content and shell fingerprints are in the cache
  names, and `verify.mjs` §25 fails if the shipped files do not hash to the
  declared `BUILD_ID`.
- Proven by driving a 15→16 content bump with the network blocked: the
  half-finished upgrade cost nothing and the 435-file library survived.

### The cold open

- **153 module requests, 2.8 MB.** Route-level `import()` splitting took the
  critical graph to 55 modules; `tools/module-graph.mjs` holds the budget.
- **An 807 KB registry** of which the village needs about 10 KB: `content/boot-index.json`
  is 168 KB, with reasoning patterns stored as indices into one shared list.
- **One failed static module left "Loading…" forever**, because the error
  handlers lived inside the graph that failed. `index.html` now carries a
  non-module watchdog that speaks after eight seconds.

### A tree was standing in the river

- `invalidSpot` believed the river was 28px wide; `paintTerrain` paints it 54.
  A bench, a cottage spot, the market path node, a jetty that stopped short of
  the bank, and the mill's water wheel turning in a dry field.
- Two gates, because one was not enough: **§23** validates the map as DATA in
  pure Node (628 coordinates: every building, cottage, plot, node and path
  point), and **§23b** drives four village states across three hours in a real
  browser and checks 3450 placed objects and ninety seconds of walking. The
  first version of §23b validated the repaired scene rather than the data, so a
  spot in the middle of the river passed.

### The village stopped being alive between actions

- Every delivery, build, plot and house **teleported every walker back to its
  seeded start**, mid-stride and mid-cheer.
- After the first refresh **every character handle pointed at a discarded
  actor** — cheers, thanks, Wick's celebrate and call, his hit box and his
  speech-bubble anchor all addressing invisible objects.
- **A worker never played its work animation** while anything sat on the shelf.
- Neighbours walked in straight lines from their doors to the path graph,
  through buildings and across the pond; they stood inside each other at the
  order board; and at night the board said somebody was waiting while every
  one of them was indoors.
- **A refresh landing inside `construct()`'s 2.8 seconds** discarded the
  scaffold and popped the finished building in early.

### The ledgers had been counting for two releases and speaking to nobody

The trap ledger, the pattern ledger and the skill ledger were all derived
correctly, tested by §20, and read by nothing. The seven trap families had
authored copy nobody ever saw; the 152 reasoning patterns existed only in a
JSON file no runtime code loaded. `core/learning/noticing.js` answers one
question for whoever asks — is there a single true thing worth saying right
now? — and usually there is not. Four places take one sentence from it: the
result screen (only when a family has caught this learner four or more times
AND caught them again in the run just finished), the building's card, Growth's
"what would move most", and the curator, which aims at the reasoning PATTERN
inside the already-aimed pool. All 152 patterns are mirrored into
`taxonomy.js` so they can be named offline. **§27** fails if a learner with a
habit is told nothing, if a clean learner is told something, if a line has no
number behind it, or if the copy leaves the mentor's register.

### Nobody had pressed Tab

- **The focus ring was silently cancelled on eight component classes** —
  every passage row, every primary call to action, every Settings toggle. It is
  reinstated last, at zero specificity through `:where()`.
- **Sixteen of Settings' nineteen controls were under 44×44** and none of them
  moved when pressed; so was the village callout, the primary interaction in
  the whole game, which rendered 33px tall whatever its CSS box said because it
  was scaled down with the camera.
- **The app menu announced `role="dialog"` and kept none of it**: no name,
  focus left on the button, Tab walking out into the world while the scrim held
  the pointer in, no Escape. `src/ui/modal.js` is the village's solution,
  lifted, and the menu and the craft sheet use it.
- **Answering announced nothing** and threw focus to the top of the passage;
  the result screen announced 682 characters in one breath; the XP counter
  rewrote its own aria-live region about forty-two times in 700 ms.
- **Three Settings groups were announced by their element id.** Village
  callouts were "2 wanted", "×11", "250 coins", naming no building.
- **§28** (`tools/check-reach.mjs`) walks every route with a real Tab key in
  both themes, reads the computed style at every stop, and opens the app menu
  with Enter to check the dialog contract from the inside.

### Interruption and honest failure

- **A learning session persisted nothing until the very last click.** A refresh
  one tap from the end threw the whole thing away with no warning. Each answer
  writes a draft; the passage offers to carry on, or to start again.
- One malformed record bricked the home screen with a raw TypeError (**§26**
  puts 25 deliberately broken records through eight derivations).
- A failed content registry was rendered as "you have done nothing yet".
- **A screen that has painted nothing for twelve seconds** now says so and
  offers a way back — and the waiting dots are keyed to whether anything has
  been painted, not to whether `render()` has returned, which had put a
  spinner on top of the entire first-run onboarding.

### Performance

- **Half of the 47 ms village rebuild was `distToPolyline`**: `Math.hypot`
  inside the loop, and every call walking every segment of a polyline the prop
  was four hundred units away from. Squared distances with one `sqrt`, and a
  cached bounding box per polyline. **47.8 ms → 11.4 ms** median; worst frame in
  ordinary play 34.5 ms → 20 ms.
- Two tabs could spend the same coins twice; a level-4 upgrade re-minted its
  helper's entire history at the faster rate, minting 93 free goods.

### Polish

- Growth showed **four identical full-grown trees**, three of them over tracks
  labelled "Not started": `paintTree` scaled one canopy by stage and then
  fitted each tree to its own canvas, dividing the scale straight back out.
  It uses `cat-plant`, the garden's own six-stage art, where every stage adds
  a structure the previous one did not have.
- Progress rails welded to a card's rounded, clipped bottom edge; the mentor's
  floating header with prose scrolling past it on both sides; decorative
  artwork directly behind body text on four hub screens; an unearned star
  rendered as a gold star at 22% with its glow still on; three near-identical
  buttons at the end of every run; thirteen emoji and typographic glyphs in a
  product whose icon language forbids them.

### Gates added

| Section | Tool | What it would have caught |
|---|---|---|
| §23 | `check-world-data.mjs` | A cottage spot in the river, as data, in pure Node |
| §23b | `check-world.mjs` | A prop or a person in the water or a wall, in a running browser |
| §24 | `check-rendered-contrast.mjs` | 1.14:1 on a screen whose tokens are all correct |
| §26 | `check-hostile-records.mjs` | One malformed record bricking the village |
| §27 | `check-noticing.mjs` | Ledgers that compute perfectly and reach nobody |
| §28 | `check-reach.mjs` | A focus ring that exists and never paints |

## 2.1.1 — Launch readiness (2026-09-15)

A launch-standard audit of 2.1.0 — "what would still feel unfinished, amateur,
buggy, slow or unpolished?" — driven against the running app in a headless
Chrome, then a systematic pass over what it found. No new features. Twenty-eight
defects, each reproduced before the fix and measured after it.

### The reading screen was unreadable

- **The passage rendered at 1.14:1 contrast.** `world.css` gives `.run` a night
  background and repaints only the BAR's colours light; the prose kept
  `game.css`'s near-black ink. The design that fixes this already existed — the
  `data-stage="reading-room"` block lifts the run onto the Reading Room's lit
  stage — but `app.js` mounted a stage only for routes `isWorldRoute()` called
  non-world, and `#/rc/session/` had been added to `isWorldRoute` so a timed run
  would lose the tab bar. Immersive chrome and standing somewhere are different
  questions, and are asked separately now. **1.14:1 → 13.4:1.**
- The reading-room veil is much stronger: at the shared opacity a house, a face
  and a fence competed with the argument on a five-minute timed passage.

### Data safety and interruption

- **Backup import in "replace" mode wiped the village.** `backup.stores?.[name] ?? []`
  meant a v1 file — which predates the learning store — cleared `learning` and
  wrote nothing back, and the entire world derives from that store. The payload
  is validated in full before anything is cleared, and a store the file does not
  declare is left alone.
- **A service-worker update reloaded the tab mid-passage.** `controllerchange`
  called `location.reload()` unconditionally, and both the 30-minute timer and
  the every-tab-focus check can trigger it. Updates no longer start during a run,
  and a controller change that lands anyway waits for the learner to leave it.

### Three upgrades that did nothing

- **Night Reading** was gated on `{kind:'world-build', upgrade_id:'observatory'}`,
  a record shape 2.1 stopped writing. The Observatory — 1500 coins, 14 Books,
  4 Cloth, 4 Ink, 16 passages read well — bought a toggle with nothing behind it.
- **The Road Out's level 2** ("Gauntlet runs pay half again", 700 coins) was read
  into `payMul[def.good]` and dropped, because a challenge has no `good`. Applied
  now where Gauntlet coins are summed, and only to runs after the lanterns went
  up, since coins derive from the whole record log.
- **Reduce motion** did nothing in either direction: no stylesheet read the
  attribute Settings wrote, and "Full" could not override an OS request. Both
  halves answered in `base.css`. A 400ms transition now collapses to 0.01ms.

### Numbers the product got wrong

- The Road Out promised **"up to 3 coins"** for a run that pays 50 at worst and
  188 for a strong one.
- The Loom, the Table and the Bench billed **a whole tier — 8 to 13 items played
  as one timed set** — at the length of its first item: "about 1 min" before
  sixteen.

### Rendering

- **116 scaled props per view were drawn 10.5 device pixels off their anchors.**
  `art()` documents anchors as world units at any raster scale, so the exact
  blit path's `(exact ? 1 : sc)` dropped the scale on the path that runs in the
  entire steady state.
- **The pre-scaled ground reached 5400² (29.2 Mpx, ~117 MB) at max zoom**, past
  Safari/iOS's per-canvas cap, where the allocation fails silently and the ground
  blits blank. Above 16 Mpx it goes through the world transform instead. The
  baked grounds are bounded now; nothing evicted them.
- **Every scene rebuild teleported the living village back to its seeded start** —
  after every collect, delivery and craft-ready tick, i.e. while the learner is
  watching. The actor instances are carried across instead. Measured mid-stride:
  9 of 9 unchanged, against 6 of 9 teleported before.
- **Rain reseeded its generator every 90ms** and scattered 80 fresh drops, which
  reads as flicker, not weather. Drops keep their column and speed and fall.
- **The village canvas ignored reduced motion entirely** — a stylesheet cannot
  reach inside a canvas. A still mode freezes time and stops `scene.update` while
  the camera still pans. Measured over two seconds: 120 repaints before, 0 after.

### Adaptivity

- **The reading curator aimed a question TYPE at a list of SKILLS.** The names
  coincide for the original nine only, so the aiming silently gave up for most
  types while the Reading House said answers are "used to choose what you read
  next". **10 of 27 types could aim a passage before; 27 of 27 now.**
- **`pickSet`'s exhaustion fallback returned the just-missed items first**,
  breaking the one rule the rest period exists to enforce. Rested items come
  first now, still-resting ones last. `verify.mjs` §20's assertion encoded the
  old order and has been updated with the reasoning written down.
- **Garden Grow sessions counted as correct answers** in the root skill ledger.
  A Grow is an introduction and carries no `clean` verdict, so `r.clean !== false`
  scored every one of them right — hiding the learners who needed the Rootwood.
- **Growth's mentor observations loaded all 115 passages** (3.57 MB) to build a
  Map read only by the sessions' own `passage_id`.

### Accessibility

- **`#view` was `aria-live="polite"`**, so a running `<cat-timer>` made screen
  readers read the clock aloud once a second, over the passage.
- **Choosing an answer destroyed the focused button.** `<cat-option>` re-rendered
  its innerHTML on every attribute change. The shell is built once and mutated in
  place now; its stylesheet is one document-level sheet instead of one per option
  per render.
- **There was no keyboard route into the village at all** — its callouts carried
  `tabindex="-1"` and the canvas key handler only pans. They are in the tab order
  with a focus ring that reads on grass and on night, and focusing an off-screen
  one brings the village to it.
- **The popovers and sheets announced `role="dialog"` and honoured none of it.**
  One shared helper names them from their own heading, moves focus in, traps Tab,
  closes on Escape and hands focus back.
- **Para Jumbles named every card with an `aria-label`**, which for a
  name-from-content role replaces the content — so the sentence, which is the
  entire task, was never read aloud.
- **`--color-ink-3` failed AA on every surface** (3.05:1 on the desk, 2.59:1 in a
  deep well) and **`.vbtn`** — the button that takes the learner into learning —
  was white at **2.12:1**. Both fixed keeping their hue and the village's
  brightness.

### The arrival

- The opening held opaque navy over the village for the ~2s the wordmark shows.
  The renderer has the valley painted by the first frames, so the mark now sits
  on a scrim with the establishing shot playing under it.

### New

- **`tools/check-contrast.mjs`** computes real WCAG relative-luminance ratios over
  the design tokens in both themes plus the village's own buttons. `verify.mjs`
  §22 runs it, so the palette cannot regress. 28 pairings, all AA.

## 2.1.0 — The living village (2026-09-14)

On the owner's "VISUAL / GAMEPLAY RECONSTRUCTION 2.0 — THE VILLAGE MUST FEEL
LIKE A REAL GAME" brief. 2.0.0 was functional and read as "canvas UI elements
arranged on top of a map": flat buildings, circle-and-dot people, requests
without causes, a dashboard card at the bottom, a Settings page with dead
controls. 2.1.0 is the same economy, the same content engine and the same
records, rebuilt to look and behave like a polished, living mobile village —
in the spirit of Hay Day's readability and SimCity's growth, with its own art.

### Dimensional art (`src/village/brush.js`, `art-buildings.js`, `art-figures.js`, `art-things.js`, `art-nature.js`)

- **Buildings are solid things.** One oblique house builder draws a front
  wall that faces the light, a side wall receding up and to the right, a
  roof with a front slope and a gable or hip, eave shadows, a plinth, a door
  with a step, windows with sills that glow at night, and the parts that make
  each place itself: chimneys, dormers, a tower with a copper dome, a striped
  awning, a hanging sign, a lamp by the door, a banner, a bell, a water wheel.
  Stone, timber, plank and glass walls. Every named building at every level,
  seeded cottages for neighbours, a barn, a mill, a schoolhouse, and a
  three-stage scaffold.
- **People are characters.** A new rig: proper proportions, faces with whites
  and irises, brows, a mouth that smiles or shouts, seven hair silhouettes,
  hats (straw, cap, scarf, beret, hood), aprons, glasses, beards; a four-frame
  walk with counter-swinging arms; work animations per job (Ada turns pages,
  Bo waters, Ines grinds, Nell throws a shuttle, a builder hammers); carrying
  (crates, a stack of books, cloth, ink, flowers); cheer, wave, sit, blink.
- **Wick is a companion.** A red collar with a bell, a lantern on a strap at
  night; he sits and looks about, walks to wherever the village is pointing,
  jumps for joy when something good happens, and sleeps on the Hearth's step
  after dark.
- 47 recipes in all, still nothing but the canvas path API, cached and blitted
  at whole pixels.

### Causality: the chain, the queue, the neighbours (`defs.js`, `economy.js`, `state.js`)

- **Raw goods → made goods.** Learning makes Pages, Seeds, Roots and Thread —
  one per star, one more if flawless — and each goes straight to its
  building's queue. The worker crafts them one at a time on a short clock
  (the first in nine seconds, then 30–45 s at level one, faster as the
  building rises) into **Books, Blooms, Ink and Cloth**, which appear on a
  shelf outside and are collected with a tap. Only made goods are traded.
  Every building has a visible state: idle → working (a ring over the roof
  counts down) → ready (a gold callout, the shelf fills) → collected.
- **The queue is derived, not stored.** Every raw unit arrives at the moment
  its session finished; a small simulation over the timeline gives the same
  answer for a village opened a minute or a month later. Helpers (level three
  and up) add raw units on a long clock while the shelf has room, and their
  output is bound automatically — automation is mastery, and it never
  replaces learning.
- **Orders come from people with a reason.** Ten neighbours with jobs and
  looks — Mira the schoolteacher, Old Tomas the ferryman, Hal the innkeeper,
  Priya the apothecary, Wren the letter-carrier, Anselm the bridge-keeper,
  Dara the baker, Kit the fisher, Sunniva the beekeeper, Oren the carpenter —
  each with reasons per good ("for the schoolhouse shelf", "for a new sail").
  Mira lives here from the first minute; the rest move in as houses are
  built. The first order is Mira's: one Book for the schoolhouse.
- **The order board** stands by the Hearth's door. A neighbour whose order
  can be delivered walks to the board and waits there; delivering hands the
  goods to that person, who cheers and walks home carrying them.

### The world is the interface (`screens/village.js`, `village.css`)

- **No dashboard.** The permanent bottom card and the dark Wick bar are gone.
  Tapping a building opens a small paper card in which its worker speaks —
  portrait, one line that fits the state, the queue strip (waiting → making →
  ready), one big button (READ A PASSAGE → up to 3 Pages → Books, or COLLECT),
  and the chain in one line. The learning entry is explicit and goes straight
  into the curator's next passage, round, family or set (`src/village/next.js`).
- **Callouts** over the world: ready ×N, a working ring with the seconds left,
  Build / Raise, wanted, and the board's Deliver. Tapping a ready building
  collects: the goods pop off the shelf and fly to the barn.
- **Wick speaks from where he stands**, in a paper speech bubble anchored to
  him in the world.
- **Construction** is a sequence: coins and materials fly to the site, the
  ground is cleared, the frame goes up, the walls rise under a builder's
  hammer with dust and ticks, and the finished building settles in with a
  bounce and sparkles while its worker cheers and Wick jumps.
- **A closer camera** (a building takes a third of a phone's width), paper
  panels with a wooden edge, tactile buttons with a bottom edge, a HUD of
  the name and level, coins, the barn and sound.

### A daily rhythm

- Morning: workers walk from the yard to their doors. Day: they work when
  the queue has something in it, wave and look about when it does not.
  Dusk: warm light, workers on the benches, lamps lighting. Night: everyone
  indoors, windows and lamps lit, fireflies over the garden and the pond,
  the moon on the water, Wick asleep with his lantern.
- The river has stone banks and a stone bridge; the pond has a jetty, a
  rowboat that rocks, reeds and rings; the village has a cobbled yard,
  woodpiles, laundry lines, benches, book carts, barrels, rabbits in the
  wood.

### Settings and audio

- **Settings rebuilt** (`src/shell/settings.js`): Audio (music & ambience
  on/off and volume; sound effects on/off and volume), Feel (haptics; reduce
  motion — auto / full / less), Reading (reading size; theme), Your data
  (export, import, storage used), About. Every control works and persists.
  The brown-noise focus sound and the four "show the introduction again"
  rows are gone.
- **Audio defaults to on**: music and ambience on at full volume, sound
  effects on. Browsers forbid sound before a gesture, so the village begins
  its music on the first tap and remembers the preference; the settings
  screen retunes it live.

### Verification and performance

- §16 covers the eight goods, the chain, the clock (one Book bound thirty
  seconds after a passage, Ada on the next), the neighbours, the helper
  filling the shelf to its cap; §17 reads every art file. All checks pass.
- Software-raster home frame (a busy seeded village, 390×844 at 3×):
  p50 16.6 ms by day, 21 ms at night; open → painted 1.4 s; ~400 scene
  objects; 8–10 MB heap.

## 2.0.0 — The village (2026-09-13)

On the owner's "COMPLETE WORLD/UI RECONCEPTION · HAY DAY-INSPIRED EDUCATIONAL
VILLAGE" brief, with the preservation note that followed it. 1.3.0 was a
valley that grew because the learner learned; it was still, at first glance,
a pixel-art map with pins and a purse of four gems, and the loop — learn,
earn a craft, build a work — happened in the database and was announced in
a line. 2.0.0 is a village management game whose economy is powered by
getting better at CAT verbal ability, built on top of the same content
engine, curator, collections and records.

### Learning is the economy, and says so

- **Four goods, one currency.** Pages (the Reading House), Blooms (the Word
  Garden), Roots (the Root Workshop), Thread (the Loom), and Coins. A
  finished activity makes one of its building's good per star, one more if
  flawless, never nothing. Villagers post **orders** for goods; delivering
  pays coins; coins build, raise and open land. Amber, Ink, Thread-as-craft
  and Ember are gone, and so are the twenty-one works, the day's asks and
  the Workshop.
- **Orders** (`src/world/economy.js`) are deterministic in (slot, n), only
  ask for what the village can make, and pay by price, the maker's level
  and the Market's. The first is Ada's — one Page, paying what the Word
  Garden costs; the second is Bo's, two Blooms.
- **Every build asks for standing** — three passages read well before a
  second floor, twelve items solved before the spool sign — so nothing is
  bought without the learning that earns it.
- **Helpers are mastery.** A building's third level puts its worker to work
  alone: a Page, a Bloom, a Root or a Thread every three hours, up to
  three (six at level four), collected with a tap. It asks for real mastery
  first and never replaces the learner.

### The village is the home screen

- `src/village/defs.js` is the world as data: goods, five workers (Ada, Bo,
  Ines, Nell, Rafi) with looks and lines, seven buildings with levels
  (cost, standing, effect, art), five plots of land, ten houses for
  neighbours, order reasons, stages. A second world is another file.
- `src/village/state.js` derives the village from five record kinds
  (`village-build`, `village-order`, `village-collect`, `village-plot`,
  `village-house`): stock, coins, levels, open orders, helpers, worth →
  level → stage, the one tip, the onboarding step. Nothing is stored back.
- `src/village/screens/village.js` is home: the HUD (name and level, coins,
  the goods in store), bubbles over buildings (a gold check with coins, a
  good with +n, a hammer, the good an order still needs), one card at the
  bottom (what to do, what it makes, why), building sheets (the worker and
  a line, the store, the orders, the one activity, the next level), the
  Market board, the barn, land and houses, deliveries with coins flying to
  the purse, collection, construction under a scaffold and dust, goods
  flying into the building that made them on the way back from a run, and
  Wick's lines.
- **The first minutes are the village screen itself, staged**: the mark,
  the glide down, Wick's four lines, Ada's request, the shortest foundation
  passage, the Page flying home, the delivery, the Word Garden built, the
  name. Every step is a fact about the records. `#/awaken` now redirects.

### A new art direction, with the environment carried forward

- `src/village/art.js` draws every building (with levels), person, animal,
  tree, prop and icon with the canvas path API into cached sprites: rounded
  forms, one light, a soft ground shadow, a warm outline. Nothing is an
  image asset; nothing is an emoji. The pixel-art engine (`sprites.js`,
  `map.js`, `canvas.js`, `life.js`) is retired; `palette.js` stays.
- `src/village/terrain.js`, `scene.js` and `grove.js` keep what made the
  valley a place: the real clock with the hour's light on everything, lit
  windows and lamps and the moon on the pond after dark, the river's flow
  and glints, koi and ducks, birds, butterflies and pollen, fireflies,
  autumn leaves and spring petals, rain and snow and fog, cloud shadows,
  trees swaying, chimney smoke, sheep and chickens and a dog once their
  homes exist. The Rootwood's grove and the backdrop behind a root-family
  session are redrawn in the same hand, growth moment included.
- The music and ambience are untouched.

### Performance

- `src/village/renderer.js` draws straight to the screen through one
  transform. Sprites are cached at the exact device scale and blitted at
  whole pixels (the zoom snaps to quarter-pixel steps), the ground is one
  1:1 blit, the hour's tint is baked into sprites and ground rather than
  multiplied per frame, glows are cached sprites, sway is three cached
  poses, flips are cached, and the leaning and tinted variants are warmed
  two per frame after the first paint. Under headless software raster at
  390 × 844 the home frame went from 386 ms to **22 ms** by day (16.6 ms
  zoomed in); open to painted 1.3–1.6 s.
- A developer hook, `localStorage['catos:hour']`, pins the clock for
  testing every hour.

### Elsewhere

- `src/world/economy.js`, `state.js`, `craft-ui.js`, `icons.js`,
  `companion.js` and `growth.js` were rewritten or reduced to serve the
  village; `hearth.js` is now "Your standing"; the place screens keep their
  sheets on the village's stills; the Reading Room is the Reading House.
- `tools/verify.mjs` §16 covers the goods, the orders and the derived
  village (helpers included); §17 covers the art recipes and every worker's
  face. All checks pass. Service worker `CACHE_VERSION` 36.

## 1.3.0 — The valley you built (2026-09-12)

On the owner's "FINAL PRODUCT TRANSFORMATION" brief. 1.2.0 was a beautiful
world that a first-time learner *inherited*: ninety wild trees, four
terraces already cut into the hill, three workshops standing, two bridges.
Nothing they did could make it look like theirs. This release is about the
difference between a world you are shown and a world you made.

### The valley begins empty

Nothing the map paints is a constant any more. `src/world/growth.js`
derives how much of each part of the valley exists yet, from the same
records as everything else, and every count the painter uses comes from
there. A new valley is sixteen saplings and scrub, old stumps, one small
house, stepping stones across the river, three spots marked and waiting in
the wood, and heather and bare earth over the open ground.

Learning puts the wood in (16 → 158 trees), cuts the terraces one bench at
a time, raises the three workshops out of their frames, replaces the
stepping stones with planks and then with stone, and brings the
neighbours — up to ten houses and seven people walking between them. The
curve is a square root, so the first twenty words change the valley more
than the next two hundred.

The valley also has a stage now — bare ground, a clearing, a settlement, a
hamlet, a village, a town, a valley known for its readers — shown beside
the stars, and Wick notices the first time you come home to a new one.

### Beyond

The Workshop had twenty-one works and then said "every work in the valley
is standing", which is the one thing a CAT progression must never say.
Stage 4 holds repeatable works: a house for a neighbour, the road posted
one waymark further out toward a place you have never been, a planting
along the wood's edge. Each costs more and asks more of your record than
the last. Only the next of each is offered, so Beyond is three cards.

### Collections

About 124 finite sets, derived from the corpus rather than authored, so
new content becomes new sets with no code: a grove of roots, a letter of
the CAT lists, a language of the Thicket, a stage of passages, a bench of
the Quarter. Growth shows the six closest to done — penalised by
difficulty, because two Elite passages left is not "nearly finished" in
any useful sense — and finishing one is announced on the result screen.

A learner can now think *"four left"* about something every single day.

### A missed question rests

Re-asking the same question with the same four options ten minutes later
measures whether you remember which letter was right. A missed item now
rests: twenty minutes, then a day, then three days, then most of a week.
The Reading Room's second look and the Quarter's three benches both
honour it, and when everything that got away is still resting the screen
says *"Resting"* and offers a passage that asks the same type instead.

The content index carries each passage's question types now, so a weakness
in inference produces a passage that actually asks about inference.

### The Workshop is a shelf of small buildings

Two across, each card carrying a picture of the thing it will build, its
name and one state word. The cost, the standing, the shortfall and the
Build button are one tap away. A wall of twenty-one cards each carrying
four paragraphs is a settings page.

### One icon language

Twenty-three 16 × 16 pixel marks, drawn by the same hand as the world. The
map pins, the thumb rail, the craft chips, the menu, the collections and
the Hearth all carry them; every stroke glyph and typographic dingbat is
gone. A resource sheet now answers "what can I build with it?" with
pictures of the next three works it pays for.

### Performance

- Every sprite was drawn with one canvas call per pixel. `Pix` writes into
  a `Uint32Array` and reaches the canvas once: cold scene build for a full
  valley **1825 ms → 62 ms**.
- `blob()` called `Math.atan2` once per pixel of its bounding box; it now
  asks only at the rim. Same picture, pixel for pixel, five times faster.
- Scatter sprites share a pool of twelve variants.
- The valley opened all fifty-one root-family files to draw fifty-one
  trees and label them. The three fields it wanted are in the index now:
  content load **1676 ms → 145 ms**, route change to a painted valley
  **3242 ms → 1064 ms**, idle frame p95 **33.4 ms → 16.8 ms**.

### Also

- Wick walks the valley, from the Hearth out to whatever it is asking
  about, at the size a cat actually is.
- A wrong answer leads with the trap, not with a paragraph about how a
  strong reader would have got there.
- A 'cover' camera may not zoom out past the point where the valley covers
  the frame.
- The Quarter's plots have a yard: a worn track, cut timber, a bench and a
  signpost — and the place screen and the map finally agree about whether
  a workshop exists.

## 1.2.0 — Someone lives here (2026-09-12)

The valley was beautiful and empty, and it opened on a map with eleven
labelled pins, four unexplained numbers and no one in it. This release is
about the difference between a world and a diagram.

### Wick

There is now one character in CAT OS who speaks. Wick is a small charcoal
cat with amber eyes and a brass lantern; he keeps the valley's lamps, and
when you arrive he has been keeping exactly one of them alight, alone, for
a long time. He is drawn by the same sprite factory as the trees — 26 × 22
in a portrait, 11 × 9 on the map, where he is the cat who already sat by
the Hearth door.

His voice has rules, and `tools/verify.mjs` §17 enforces them: short
sentences, no "study", no "well done", no "unlocked", no exclamation marks,
nothing longer than one breath. He notices; he does not congratulate.

### The first five minutes

A profile that has never been welcomed no longer opens on the map. It opens
on `#/awaken`: the valley at night, one lamp burning, and five lines. Then
a wooden sign, where the learner names the place — the name is kept in
settings, travels in backups, and is what the HUD, the menu, Growth and Wick
call this valley from then on. Then one small thing: six words from the
high-frequency band, a real round against the real corpus writing real
mastery records, with nothing else on the screen.

Then dawn. The terrain repaints from night through dawn to morning, the sky
beyond the ridge follows it, the lamps go out, the music warms, and the
crafts they earned fly into a purse they are seeing for the first time.
"There. That was you."

The transformation is scripted, not purchased — they have not earned a
building yet and pretending otherwise would be a lie. What they *have*
earned is real, and the welcome's last act is to point at the first work
their Amber can actually pay for.

### The map reads

- **Nine pins, not eleven.** The three verbal workshops stand in one yard
  and share one pin, the Quarter, whose card offers the three benches. All
  three routes, slugs, crafts and content are untouched.
- **Drawn marks, not emoji.** A fir, a flower, water and a fish, a lantern,
  a book, terrace steps, two roofs, a hearth, a mountain — one hand, the
  world's own.
- **The valley fills the frame.** The home camera sits at the zoom that
  covers this screen. Zoomed out, the country around the valley is painted
  for it, and places off the side pin to the rim rather than vanishing.
- **The Mirror Pond is a place.** A wobbling shoreline with a bay and an
  inlet, four bands of depth, wet sand, reeds, lilies, koi, a plank dock,
  and the sheen it is named for.

### What a craft is

Every craft chip in the game is now tappable, and opens one sheet: what
this craft *is* as an ability ("Ember is your accuracy at CAT pace"), where
to earn it as places you can walk to, and the nearest unbuilt work it pays
for. Ability → craft → work → the valley changes, legible from any link.

### What you are told after you answer

A learner who has just got a question wrong reads four lines, not fourteen.
Every answering screen now shows the verdict, one reason, and the trap
*they* fell into — named in English ("points the other way", "too
absolute") rather than as a database value — with the full teardown behind
one disclosure. About 65 words where there were about 185. Nothing was
deleted; the default changed, because the default is what gets read. The
verdict now scrolls itself into view, and the sticky answer bar no longer
sits on top of the lesson.

### Growth

Four abilities, four trees, each at the stage the learner's own record has
earned — the same tree sprite the valley is made of. A tier name, stars,
one line of numbers, and then the single ability with the most room, said
as a next action. Everything the screen used to be is under "The numbers".

### Navigation

The thumb rail is Valley, Hearth, Growth. Settings is administration and
does not get a quarter of it: one ☰ in the valley's corner opens a painted
sheet with Growth, the Workshop, Your standing and Settings. Every row goes
somewhere that exists and shows what it said it would.

### Interaction

`pointermove` was calling `draw()` directly. Touch hardware delivers moves
faster than frames and coalesces them into bursts, so a fast drag painted
the same frame two or three times over, on top of the rAF loop. It now marks
the frame dirty and lets the one loop draw it once. The world also stops
simulating while a finger is down, the map pins only touch the DOM when the
camera actually moved, and the pin dots lost the backdrop blur that was
being re-rasterised on every one of those moves.

Measured in headless Chrome with software rendering at dpr 3: a drag went
from p50 33.3 ms / p95 49.9 ms / max 100 ms to p50 16.7 ms / p95 16.8–33 ms
/ max 33 ms. `draw()` itself costs 2.3–4.4 ms depending on framing.

### The landmarks

- **The Reading Room is a tower.** At one floor its sprite was 30 wide and
  25 tall, which is a garden shed; reading is the hardest thing CAT asks
  and its landmark should say so. It is now a plinth, a shaft that grows a
  floor at a time, an arched reading stage that lights when anything is
  lit, and a steep slate spire with a gold finial — 26 × 50 at one floor,
  26 × 71 with the Observatory. It stands in a yard now, too: fence,
  pines, bushes, a lamp by the door and a reader on the path.
- **The sky is continuous.** The country beyond the ridge was tinted by
  lerping toward the hour's colour while the map itself is tinted by
  multiplying by it — two operations on one colour, meeting at a line,
  which is why every dusk and dawn had a step across the sky. The edge
  painters now do exactly what the renderer does.
- **The Rootwood has a ceiling.** Its canopy was a flat orange slab in
  autumn. An autumn canopy seen from underneath is that colour with the
  whole wood's shade behind it: four passes dark to light, small clusters
  for texture, and gaps punched back out where the sky gets through.
- **The dashboard is retired.** `#/home` still rendered the pre-world
  Home screen — a greeting, a Continue card, a module list — which is
  exactly what the valley replaced. Both `#/home` and `#/practice` now
  come home to the valley; app.js loses 180 lines.
- **No colour emoji** anywhere in the world's own chrome.

### Honesty

Fast and wrong is not a good result, and the round screen was printing
the pace in gold after a 1/12 round — teaching the one habit CAT punishes
hardest. Pace reads as good only when the accuracy behind it was real
(round, passage and second-look results).

### Fixed

- The build veil is mounted on `document.body` and was only removed by
  tapping "See it" — leaving the Hearth any other way left it hanging over
  every screen that followed.
- `renderWorld` threw on a null canvas when the learner navigated away
  while the valley was loading; the valley's records and its name are now
  fetched in one `Promise.all`, and the guard is optional-chained.
- Wick's homecoming line threw when the timer fired after the learner had
  already left the valley.
- `cleanValleyName` capitalised after an apostrophe ("Wren'S Fold").

## 1.1.4 — 2026-09-12 — The second look

Reviewing your own mistakes is the highest-yield hour in CAT preparation,
and until now the app had no way to spend it: a missed question was
explained once and never seen again.

**The second look** (`#/rc/second-look`) brings back up to six questions
the reader got wrong and has not since got right, weighted towards the
kind of question they are worst at. It is deliberately not a re-read: the
question comes first, with **the evidence paragraph one tap away** (the
corpus stores `passage_anchor` as a real paragraph id), because "go back
to the text" is the habit being trained. A miss opens the evidence
automatically and names the trap that caught you, from the corpus's own
distractor analysis — *opposite direction*, *near-synonym confusion*,
*scope creep*. Getting one right settles it for good; getting it wrong
keeps it in the pool.

It makes Ink, carries its own stars and pace, and the Reading Room offers
it above a new passage once four questions have got away — because at
that point it is the better hour. The 32 passages go a great deal further
than 32 readings.

Also: a timed run is now immersive wherever it lives — the tab bar no
longer sits under the clock during a passage or a second look, inviting
the reader to leave mid-question — and a run's body scrolls when its card
is taller than the screen, so an open evidence paragraph can never push
the explanation out of reach.

## 1.1.3 — 2026-09-12 — The valley comes alive

"If only trees grow, the world will feel lonely." Four creatures now
arrive in the valley, and every one of them arrives because the learner
brought it:

- **Deer** at the Rootwood's edge once eight root families are mature, a
  stag among them, more of them as the wood ages.
- **Sheep** in the Meadow once a whole field is in bloom (or ninety words
  are held for good), the flock growing with the fields.
- **Ducks** on the Mirror Pond once four koi are there, paddling the
  water with a small wake behind them.
- **A dog** at the Hearth once the cottage has flower boxes.

They wander, stop, graze and turn to face where they are going
(`life.js`: `grazers`, `ducks`), depth-sorted with everything else, and
they cost nothing when they are not there. With the villagers from 1.1.0
a worked valley now holds people, livestock, wild animals and birds.

**Performance.** The two edge painters (the sky and land that continue
beyond the map, and the seam that softens where the map stops) were
running every frame and cost 11 ms of an 32 ms frame in software
rendering. They are pure functions of the camera geometry, so the
renderer now skips them entirely when the map covers the screen — the
common case on a phone, because a 'cover' fit guarantees it — and caches
them per camera position otherwise. A worked valley's frame fell from
32 ms to 21 ms in headless software, and to nothing extra at all on a
phone that is not zoomed out.

Also: the world's notice clears the HUD's icons and wraps on a narrow
screen instead of running off it.

## 1.1.2 — 2026-09-12 — The question CAT actually asks

CAT does not ask what a word means in the abstract; it asks what it means
HERE. The corpus already held hundreds of words shown inside a real
sentence — the `vocabulary[]` block of every passage (word · passage_use ·
meaning_here) and the `context_sentences` of every Rootwood member — and
nothing had ever used them.

- **`tools/build-context.mjs`** walks both and writes
  `content/context/pack.json`: **270 words in a real sentence with the
  sense they carry there** (60 from Reading Comprehension, 210 from the
  Rootwood). Entries whose word cannot be found in their own sentence are
  dropped, because a question cannot mark a word that is not on screen.
  It is derived content, so it has no registry entry of its own.
- **Three of every twelve** in a Meadow, Pond or Thicket round are now
  that question: the sentence with the word marked, four plausible senses,
  and "as used here, X most nearly means". They carry their own mastery
  (ledger bundle `context`), so the Meadow's flowers still count only
  Meadow words, and they come back on the same spacing ladder as everything
  else.
- **The Gauntlet is genuinely mixed**: 7 Meadow + 7 Pond + 7 Thicket + 9
  in-context, still the same thirty all week against the same three
  minutes. "Mixed pressure" now means mixed kinds of thinking, not only
  words from three different places.
- A missed in-context question teaches the contextual sense, not the
  dictionary one.

Also in this pass: the Wilds gets the road out painted behind its records;
a 'cover' fit no longer leaves a bar (whole-device-pixel snapping rounds up
for cover); map pins fade at the edge instead of stacking on the rim.

## 1.1.0 — 2026-09-12 — The final world rebuild

The owner's 2026-09-12 brief ("CAT OS — THE FINAL WORLD REBUILD") asked for
the thing 1.0.0 gestured at: a game that secretly makes CAT aspirants
dramatically better at VARC, where the economy is tied to real practice,
construction is an achievement, and the interface belongs to the world
rather than to a dashboard. 1.0.0's engine, audio and content were kept;
its economy, its place screens and its selection of content were replaced.

### The economy: four crafts, not one currency (`world/economy.js`)

Ink was a single number earned by everything and spent on anything, which
meant no activity was necessary and grinding one place bought the whole
valley. It is replaced by **four crafts, each made by one kind of thinking**:

- **Amber** — word knowledge. Made in the Meadow, the Mirror Pond, the
  Thicket, the Rootwood and the Vine Terraces.
- **Ink** — reading. Made only in the Reading Room.
- **Thread** — verbal structure. Made at the Loom, the Table and the Bench.
- **Ember** — mastery. Struck only by a three-star run (two for a flawless
  one), a clean spaced revisit, or a Gauntlet. Deliberately scarce.

A place can never make another place's craft (enforced in `verify.mjs`), so
the valley cannot be built by a learner who only does vocabulary.

### The works: what learning builds (`WORKS`, the Workshop)

Twenty-one **works** replace the eight flat upgrades. Each one has

- a **cost** in crafts — fourteen of them need three or four at once,
  eleven need Embers, so the late valley is impossible without CAT pace;
- a **standing**: a condition on the learner's actual record, written in
  words ("Read four passages at two stars or better", "Tell 40 twins apart
  for good", "Practise in four different places"). Nothing in the valley can
  be bought before the learning that earns the right to it;
- an **after** line — what the valley looks like once it stands.

They are grouped into three arcs (Settling, Building, Flourishing) so the
Workshop never shows a wall of twenty-one, and every one of them changes the
map: stone paths and arched bridges, beehives in the Meadow, lanterns on the
pond and in the Quarter, the traveller's arch at the Thicket, the root
shrine, an arbour on the terraces, the Quarter's square with stalls and a
well, a heron in the reeds, the Reading Room's floors and its Observatory —
and **villagers**, who begin to walk the valley's paths as works go up, so a
built valley is a settlement rather than scenery.

### The curator: the game decides what is worth showing (`world/curator.js`)

The learner no longer browses a library. A new selection engine composes
what comes next out of the whole corpus, on four axes at once — mastery,
spacing, reach and variety — and keeps a quiet weakness model on top:

- **Word rounds span bundles.** A Meadow round is twelve words assembled
  from wherever they are: due for review first (up to seven), then words
  that recently slipped, then new words from the frequency band the learner
  has reached (high only, until 120 high-frequency words are held; then
  medium; then low). Distractors are drawn from every bundle the round has
  open, so the wrong answers stop being "the other words beginning with A".
  Each round tells the learner what it is in one line ("Words that are
  fading", "A mixed handful", "New words · High frequency").
- **Passages follow a measured reach.** A stage opens when two of its
  passages have been read at two stars or better; the curator then offers
  the next stage, and prefers a retry when a passage was read badly.
- **The weakness model is read from answers, never claimed.** `session.js`
  now stores each answer's question `type`, so accuracy per question type
  (inference, main idea, tone, author's purpose, …) is derivable from
  records alone. The Reading Room offers the passage that practises the
  weak type and says so in the valley's voice ("Nothing here is stated
  outright. What follows from the text is the whole question."), never as a
  chart — although the full breakdown is available under the sheet for
  anyone who wants it.
- **The Quarter climbs its ladder** rung by rung, retrying what got away.

### The interface belongs to the world

- **A place is a place.** The place screens were a short art strip over a
  scrolling wall of cards. Now the region's own living scene fills the
  screen and a **sheet** rests over the bottom of it holding one line of
  who you are, how far this place has come, and the single best next thing.
  Everything else — the shelves, the fields, the tiers — is under a pull.
  New `buildBackdropScene` paints a portrait landscape per place, composed
  so its signature always sits above the sheet on a phone.
- **The valley reads at a glance.** Every place is now labelled on the map
  with a pin that pulses when it is asking and shows a mark when something
  can be built there; the camera arrives over the whole valley and settles
  on the Hearth; the sky and land continue beyond the map's edge, so a tall
  phone or a wide desktop never shows a dead bar.
- **What is worth doing now** replaces the quest strip: at most three cards,
  never three of the same kind, weighted by what the record actually says —
  a work that can be built, spacing that is genuinely due, the day's nearest
  ask, the next passage, a workshop never opened, the Wilds once there is
  enough learned to be tested on.
- **A run happens somewhere.** Rounds are played on the place's own dimmed,
  still scene rather than on white paper, with the word on warm glass, and
  every question says whether it is new, due, or one that slipped.
- **The result is the loudest moment.** Stars, then the honest CAT numbers,
  then the crafts the run MADE counted up on screen, then what changed in
  the valley, then — when a work has just become buildable — a banner that
  says so and a door straight to the Workshop. Crafts fly into the purse
  when the learner walks back out.
- **New `src/ui/styles/world.css`** carries the language: painted surfaces
  instead of glass panels, the four crafts as coloured gems everywhere they
  appear, the sheet, the pins, the Workshop, the build veil.

### The rooms beyond the valley stand somewhere too

The verbal crafts, Word DNA and the Reading Room keep their own screens —
their pedagogy is the product's best work and was not worth rewriting to
change a background. What they lacked was a PLACE. `src/world/stage.js`
paints the region's own still scene behind the whole shell and sets
`data-stage` on the root; the CSS lifts those screens onto warm glass over
it. One canvas, painted once, no frame loop. The Loom stands at the Loom,
Word DNA on the terraces, a passage in the Reading Room.

### Content: everything usable is now connected

- **Sixteen new Word DNA units** (`wd-0013` … `wd-0028`) authored from
  `KNOWLEDGE/99_REFERENCE/5- Prefix and Suffix.md`, the one reference file
  the app had never connected: meta-, -ancy/-mancy, -oid, -ent, -ard, -hood,
  -ling, -ness, -ship, -ful, -less, -like, -ly, -fold, -ish, -wise. Words and
  meanings are transcribed faithfully; the mentor note, the predict options,
  the understand note and the held-out transfer word are authored. The Vine
  Terraces go from 12 units to 28.
- The corpus the game now draws on: 2,577 lexicon words, 401 confusable
  groups, 271 loanwords, 51 root families (217 words), 32 passages (136
  questions), 59 verbal items, 28 Word DNA units — 493 registry entries.

### Also

- **Music answers progression.** `startMusic` takes a `warmth` read from the
  works standing and the stars earned: a fuller valley gains a pad voice and
  lets the line breathe a little more often. The key, the tempo and the
  calm never change — it is the same music, further along.
- **Coming back after days away** is met with one line: how long, how much
  is ready to revisit, how many works can be built.
- **A title that means something.** It reads stars and works, not session XP.
- **The loader reads from disk under Node**, so `tools/verify.mjs` now
  validates the real content pipeline (the curator's round composition, the
  reach model and the weakness model are covered by the verifier).
- **Robustness.** The router ignores a query after a route; Para Jumbles'
  learning page and the Word DNA analytics no longer throw on a partial
  record. All 44 routes sweep clean with no console errors.
- Service worker cache v28; the sixteen new content files are precached.

## 1.0.0 — 2026-09-11 — The world

The dream product, built on the owner's 2026-09-11 brief ("BUILD CAT OS"):
CAT OS stops being a study app with a garden on top and becomes a living,
hand-drawn game world in which every place is a real CAT skill and
everything the learner learns changes the land. The brief is the creative
authority; where the earlier Language Garden documents conflict with it,
they are superseded (recorded in `KNOWLEDGE/01_KNOWLEDGE/CAT OS — THE WORLD
(1.0).md`).

### The world (new `src/world/`)

- **A Canvas 2D pixel-art engine, no dependencies.** The SVG valley of
  0.14–0.17 could not reach the depth, lighting and life the brief asks
  for, and PixiJS/Phaser would have broken the no-build, no-CDN rules for
  little gain, so the world layer is ~2,000 lines of plain Canvas 2D:
  `engine/palette.js` (hue-shifted four-tone ramps, seeded randomness,
  value noise, the hour/season/weather clock), `engine/sprites.js`
  (every tree, flower, building, creature and prop drawn procedurally as
  outlined pixel art and cached by recipe — no image assets), `engine/
  canvas.js` (a world-resolution scene blitted at whole-device-pixel zoom,
  camera with drag/pinch/wheel/keys and inertia, painter-sorted depth, a
  multiply lighting pass with additive lamps, hit-testing), `engine/
  life.js` (rain, snow, leaf and petal fall, pollen, fireflies, smoke,
  birds, butterflies, koi, the cat, clouds, water glints) and `engine/
  map.js` (the 640×720 valley: sky, mountains with snow, rolling ground,
  a meandering river and the Mirror Pond rasterised from stroked masks,
  paths, terraces, the Hearth's yard and the Quarter's flagstones — plus
  the hero scenes for every place). The terrain is painted once per hour
  change through a single ImageData raster (~270 ms in software
  rendering); a frame is ~5 ms.
- **The valley remembers.** `state.js` derives the whole world from the
  records: each Rootwood family stands as a tree at its true stage in its
  grove (root-stones for unmet roots, gold for the one asking, fireflies
  near Ancients at night); the Meadow's flower density is mastered words;
  koi arrive per twelve twins told apart; a Thicket lantern lights per
  loanword language mastered; the Reading Room tower gains a floor per
  twelve stars and a lit window per two-star passage; the Loom, the Table
  and the Bench grow with solved sets; the Hearth is built with Ink; smoke
  rises on days you practised; five times of day, four seasons and seeded
  weather run on the real clock.
- **Home is opening a game.** `screens/world.js`: full-bleed canvas,
  arrival over the mountains with the wordmark, a glass HUD (title and
  level, Ink, stars, sound), three daily quests, place cards with one way
  in, the camera returning to the place you came from with sparks and a
  notice when the world changed there.
- **Places.** `screens/place.js` gives every region a living hero scene
  and its own content: six groves with family rows in the Rootwood;
  fields by frequency band and letter in the Meadow; shoals in the Pond;
  languages in the Thicket; shelves by stage with stars in the Reading
  Room; the eight tiers of each verbal craft; the vines of Word DNA.
  `screens/hearth.js` is home (quests, Ink and upgrades, collections,
  sightings, achievements, the study); `screens/wilds.js` the weekly
  Gauntlet with records.
- **Progression that can be seen.** `economy.js`: stars per item
  (accuracy first, then pace — 0/1/2/3 with a flawless mark), Ink earned
  only by finishing real practice and weighted by stars, eight upgrades
  that build the valley (the Hearth's chimney, flower boxes, lantern, ivy;
  pond lanterns; the Observatory and its Night Reading pace; the terrace
  arbour; the road's lanterns), three seeded daily quests worth 25 Ink,
  titles by level. Nothing learnable is ever locked.
- **Sound with a personality.** `audio.js`: a generative pentatonic bed
  (two breathing pads under a plucked line that keeps returning to the
  Valley Phrase), a tonic per place, sparser and lower at night; wind,
  water, birds by day, crickets at night, rain; and the interaction
  vocabulary — tap, open, close, star chimes one to three, Ink, quest,
  growth, building, the hurry tick. Music has its own toggle in the HUD
  and Settings; everything honours the master Sounds preference.

### Content connected

- **The reference corpus, wired in.** `tools/build-lexicon.mjs` transcribes
  the owner's vocabulary reference (`KNOWLEDGE/99_REFERENCE`) into 106
  validated bundles under three new content types and schemas: `lex`
  (2,577 words — 1,115 high, 965 medium, 497 low frequency — with meanings,
  synonyms and antonyms, one bundle per band and letter), `twin` (401
  confusable sets with per-word senses) and `loan` (271 loanwords across
  twelve languages). Registry rows, loader functions with consistency
  checks, precache entries and verify sections come with them.
- **Vocabulary rounds** (`lexicon.js`, `screens/round.js`): twelve words
  from one field, chosen due-first then new, every question assembled
  from the entries themselves (meaning, reverse, synonym, antonym, twin,
  origin), a pace ring per word, combos, the verdict in place, the miss
  shown with its meaning. A per-word mastery ledger climbs one level per
  clean answer once its spacing has elapsed (10 min, 1, 3, 7, 21 days)
  and drops one on a miss, never below "met".
- **All 51 root families** stand in the wood and in the grove lists; the
  Rootwood's six-beat sessions are unchanged in logic and now play on the
  world's canvas, with the growth moment animated in the scene and the
  Ink earned shown once the tree has come to rest.

### The Reading Room's run (rebuilt `reading-comprehension/screens/session.js`)

Briefing (stage, genre, words, questions, the passage's own target time
and what three stars ask for) → reading with a pace ring counting down
the target (amber past it, never red) and the scroll hairline → one
question at a time with the clock still running, lock in or set aside,
explanations in place with evidence jumps → the star reveal, accuracy and
time against target, Ink, what changed in the tower, and the mentor's one
lesson beneath with the Learning Page one tap away. Persistence, lessons,
recall and the Gate's sightings are unchanged.

### Everything else

- `game.css`: the interface language — glass HUD, place sheets, the run
  frame, star reveal, tiles and rows — and a restyle of the shared chrome
  so the older rooms read as the same product.
- The verbal crafts and Word DNA end with the world's reward strip (stars,
  Ink) and return to their place.
- The old SVG valley (`overlook.js`, `biome.js`, the prop/fauna/atmosphere
  art, discoveries, journal, props, fauna, light, ambient) is retired;
  `#/garden`, `#/garden/biome/*` and `#/garden/journal` redirect into the
  world. `#/home` and `#/practice` point at the valley.
- Service-worker registration now waits for the first screen to paint
  (a cold open of the valley was being starved by the precache).
  `CACHE_VERSION` → 27, `CONTENT_VERSION` → 13.
- `tools/verify.mjs`: sections 15 (Rootwood) and 16 (the world) replace
  the retired SVG-world checks; section 1h validates the new bundles.
- Verified in real Chrome (390×844 and 1280×800; day and night; fresh and
  lived-in profiles): a full Meadow round, a full Reading Room run, a full
  Rootwood grow session, an upgrade bought at the Hearth, and the return
  to the valley — no console errors.

## 0.17.0 — 2026-09-10 — The Rootwood Walk

The product reality check. On the owner's instruction the build was opened
and judged against the vision — "a beautiful game that happens to make the
learner dramatically better" — rather than against the phase roadmap. The one
finding that conflicted with the vision outright: the Rootwood held fifty-one
families and showed six unlabelled saplings. Built to `LANGUAGE GARDEN — THE
WORLD.md` v1.3.0 (Part 16) and the Roadmap's Phase R (Appendix L). No
content, schema, or storage-shape changes.

- **The Rootwood Walk.** The seven-slot working set is retired. **Every
  family stands in the wood**, in a fixed stand in one of six named semantic
  groves — Ways, Measures, Voices, Kin, Hearts, Embers (`logic/groves.js`,
  eleven stands per grove in three rows) — and the wood is a walk 884 units
  wide, crossed by a horizontal swipe. A fixed canopy overhead; the far wood
  and a new mid-distance old-growth band on parallax; one floor across the
  whole walk with light shafts, pools, the Ground's tier marks per grove, the
  entrance's authored props, and fireflies after dark; the great trunks as
  doorposts between groves; an unmet root drawn as a root-stone (open ground
  with its name on approach, never a lock); Ancients standing at their true
  height in their own stands; signposts with one-word names and a garland
  when a grove is grown; a title card naming each grove on arrival, and one
  soft leaf sound on entering one; a camera that opens on the lit plant, else
  on the family tended last, else at the wood's mouth. Sessions and plant
  approaches render the same walk becalmed with the camera on the tended
  stand; Growth resizes that stand in place, Ancient included. The open-ground
  offer walks the groves in order.
- **The named valley.** Every region carries one line of what grows there;
  touching a wild region from the Overlook shows its name and that line for a
  few seconds (no date, no lock). The map's wood thickens one tree per two
  families grown, not three.
- **The reconsideration.** Every progression and reward mechanic the owner
  listed was judged by one question — does it make learning English more
  compelling? — and the verdicts are recorded in THE WORLD Part 16.7: seven
  old restrictions changed, six mechanics refused again with reasons
  (currencies, leaderboards, streaks/completion, wilting, collection grids,
  unlockable areas), one narrowly relaxed.
- **The first paint, fixed.** Measured under the live service worker for the
  first time: loading the fifty-one families took 24 seconds, because the
  worker's `caches.match(..., { ignoreSearch: true })` scanned every cached
  entry for every request. It now matches by exact URL (1.1 seconds for the
  same load), and `core/content-loader` memoizes resolved families and words
  per page, so every garden screen after the first paints from memory
  instead of re-fetching 268 files. Both were 0.16.0 behaviour on every
  installed device.
- **The installed app opens on the valley.** The manifest's `start_url` still
  pointed at the retired dashboard (`#/home`); it is `#/garden` now.
- **Verification.** `tools/verify.mjs` checks the walk (every registry family
  in exactly one grove, capacity, order-independence, row spacing, doorpost
  clearance, the register of every grove and region line); the app was
  driven in real Chrome at 390×844 on a September morning, a September night
  and a January dawn, with the service worker active.
- `CACHE_VERSION` → 26. `APP_VERSION` → 0.17.0.

## 0.16.0 — 2026-09-10 — The valley is the home

The Language Garden stops being a feature inside CAT OS and becomes the
place the app opens onto. Built to `LANGUAGE GARDEN — THE WORLD.md` v1.2.0
(Part 15, the 0.16.0 pass) and `LANGUAGE GARDEN — IMPLEMENTATION ROADMAP.md`
v1.6.0 (Appendices J–K), on the owner's 2026-09-10 brief. No content, schema,
or storage-shape changes; one additive record kind (`garden-discovery`).

- **Home.** A cold open lands on the Overlook (`router.start('/garden')`);
  the very first open still hands straight to the Rootwood's first sentence.
  The bottom nav, visible only outside the Garden, reads Valley · Practice ·
  Growth · Settings; the old dashboard route stays registered, unlinked.
  **Beyond the Gate:** `#/practice` rebuilt as the road out of the valley —
  a live skyline over four places (the Reading Room, the Summary Table, the
  Loom, the Stranger's Bench). No badges.
- **The Overlook, repainted.** Full-bleed, no card; the sky raised by 100
  units (`viewBox 0 -100 360 660`) with three clouds, a 28-star
  constellation and a haloed moon; two mountain ranges with snow cut from
  the crest geometry; the arrival staged back to front in four planes; the
  Rootwood drawn as trees (trunk, shade, lit, cap) that thicken by one for
  every three families grown, with evergreen emergent crowns where Ancients
  stand; the whole pigment canon re-toned (richer skies, water, land, stone,
  the cottage) and the whole-scene season filter retired for real pigment
  (autumn gold, winter pale, spring fresh); hedgerows, stone joints, wall
  grass, a ridge and eave and chimney cap, a pond gradient with a bank,
  orchard trunks and blossom, terrace fields with stone lips and vine rows.
- **The Rootwood, repainted.** Full-bleed; light through leaves between the
  trunks (an hour-toned gradient) instead of paper; an SVG floor with pools
  of light where the shafts land and undergrowth along the edge; an
  old-growth far wood behind the working set from day one; bark and root
  flare on the great trunks; leaf clusters on the ceiling; trunks under the
  mid-wood; fuller plant crowns at every stage; plants standing on earth,
  not a pale disc; the valley mark and the quiet line floating over the
  scene.
- **Stage W6 finished** (the interrupted authored-density, fauna, and
  winter-geometry work, kept whole) and **Stage W7** (the Journal at the
  bench — the view from the bench above the book; the Gate's 700ms drift).
- **Discoveries and the Field Guide** (Bible §9, Roadmap 5.1): sixty
  world-state discoveries in `logic/discoveries.js`, recorded after a scene
  paints (one record per discovery, ever), listed in the Journal one line
  each, closing on one fact about the valley. Nothing mechanical; no
  silhouettes, no fractions.
- **Audio.** The first touch at a cold-opened Overlook pays the arrival it
  owes, once.
- **Verification.** `tools/verify.mjs` now lints the discovery catalogue;
  the app was driven in real Chrome at 390×844 at every hour and season.
- `CACHE_VERSION` → 25. `APP_VERSION` → 0.16.0.

## 0.15.1 — 2026-07-17 — The Rootwood dataset, complete

Content only; no engine, screen, or schema changes. Every root family in the
owner's roots reference (`99_REFERENCE/4 - Roots Words: Greek and Latin.md`)
is now a plant: **47 new families** join the 4 that shipped with 0.14.0, for
**51 total** (27 Greek, 24 Latin by final count after two honest splits — see
below), spanning **217 vocabulary words** (`content/vocabulary/`, up from 20).

- Every family carries 4 to 8 members (2 or 3 taught, at least 2 held out as
  the Reach reserve, per `LANGUAGE_GARDEN_BIBLE` §5.1/§6.1), each with a
  morpheme breakdown that concatenates exactly to its word, two CAT-register
  context sentences, and (for Reach words) a three-option construction quiz
  with `literal_only`/`wrong_root` traps.
- Word choices and meanings are transcribed from the source PDF wherever it
  gave enough; a minority of well-known, real words on the same root were
  added only where the source list was too short to form a complete family
  (e.g. `nihil`, `rect`, `bel` each had 2 or 3 words in the source).
- Two source entries were honestly split rather than transcribed as given,
  because a Language Garden plant needs exactly one root and one meaning:
  the source's combined **"andr / gyn"** row became two families (`andr`
  "man", `gyn` "woman", opposite meanings); its **"mort, necro"** row became
  two families (`mort`, Latin; `necro`, Greek — the source mixed a Greek
  root into its Latin Roots section). The source's **"vore"** entry, listed
  twice verbatim (Latin Roots XXIII and XXIV), was consolidated into one
  family rather than duplicated.
- `CONTENT_VERSION` → 12. No `CACHE_VERSION` change (no shell code touched).

## 0.15.0 — 2026-07-15 — The Language Garden becomes a place (Phases 1–3)

Three phases of the `LANGUAGE GARDEN — IMPLEMENTATION ROADMAP.md` (v1.4.0,
subordinate to the Bible), landed as one release: the world's skeleton, the
loop's feel, and the environment that makes the Two Ledgers true.

### Phase 1 — Foundational (2026-07-14)
- **The Overlook** (`/garden`): the whole valley from above — the Wilds ridge,
  seven regions from the Bible's compass, the stream through the Mirror Pond,
  the Rootwood as the living heart with grown plants as distant canopies (at
  most one glowing: the single valley-wide invitation). Tapping the Rootwood
  descends with a zoom. First-ever open drops straight into the opening
  session (§3.1) — no splash, no tour.
- **Three named-principle violations fixed**: no "1 of 3" Spread counter, no
  stage-as-a-word anywhere (form conveys stage), no tap-to-reveal answers on
  the Plant screen (word-only capability chips, P22).
- **Immersive chrome**: `data-immersive` hides the shell header and nav on
  every `/garden*` route; every garden screen carries its own quiet way out.
- **The six stages** (`open_ground · seed · sprout · young · in_leaf · mature
  · ancient`) with a real Mature stage; horizon and nest key off Ancient.
- **The biome/engine seam** (`logic/biomes.js`): seven biomes, seven engines,
  `living` vs `wild`; screens and routing dispatch on the seam so the next
  biome changes content, not code.

### Phase 2 — Interaction (2026-07-15)
- **The growth animation**: anticipation → extension (a base-anchored rise
  out of the soil, not a uniform scale) → one organic settle → rest, ~1.4s,
  composite-only; the line and button stay veiled until motion stops (§11.4);
  first viewing sacred, skippable from the second (§11.2); reduced motion
  gets before→after with the chime and haptic (§11.5).
- **The two haptics** (12ms commitment tick, identical right or wrong; a
  warm growth thump) and **the Commitment sound** (soft low C, identical for
  right and wrong, P87), inside a rebuilt warm mix: soft-knee compressor,
  4.6kHz ceiling, sine voices, growth re-voiced as the one unmistakable peak,
  assembly taps rising a step per part (§10.5); the shell's global click is
  suppressed inside the Garden (§10.6).
- **Encounter split from Attempt** (sentence alone first, question after a
  beat of reading or a tap — §5.1) and **long-press peek** (hold a plant to
  see its key and members; release and it is gone — §14.2).

### Phase 3 — Environmental (2026-07-15)
- **The Stream** (`logic/effort.js`): consistency as water — 3-day half-life
  decay, hard floor, never dry; three render bands (width/brightness/glint)
  and the ambience bed's gain follow it (§8.4).
- **The Ground and Paths**: lifetime, monotonic effort tiers revealing a
  fixed set of moss/wildflower/fern marks (a failed session still thickens
  the soil — Law 2); the one walked path wears and softens to mossy, never
  breaks (§4.3–4.4).
- **State-driven ambient life**: butterflies need an actual bloom, fireflies
  weight up with Ancient trees, density scales with the Ground tier — a
  mirror of true state, never a coin flip (Law 8). Dragonflies honestly wait
  for the Mirror Pond (Phase 4.5+).
- **Five real times of day + seeded weather** (`logic/atmosphere.js`, new):
  dawn/morning/afternoon/dusk/night skies with a composed light filter;
  weather (clear/rain/fog/wind/snow) generated from the calendar and a seed
  only — deterministic, season-weighted, never behavioural, never mechanical
  (§4.5–4.6). **Night is the best-looking state** (§12.6): a fixed
  constellation, a crescent moon, silver water — the exhausted 11:40pm
  learner gets the most beautiful version, in light theme too.
- **World seasons**: calendar-driven palette/light shift (spring fresh,
  summer warm, autumn amber, winter near-monochrome) over the drawn world
  only — text contrast untouched, and the one asking plant still reads
  everywhere because it catches light, which no season reproduces (§4.7,
  §12.5, §12.7).
- **The Gate + Sightings/Seeds** (`core/engine/garden-gate.js`, new — in
  core because module islands never import each other): the Gate is now a
  drawn, tappable place at the valley's edge and leaving through it is a
  small journey (§16.9). Outward: finishing an RC passage that contains a
  grown garden word records a silent **sighting** (word-boundary,
  same-word-inflection tolerant), shown in the Journal's new Sightings
  section with where it was seen (§19.2, §16.6) — no toast, no XP, ever.
  Inward: the RC Learning Page quietly offers "Carry it back to the garden"
  for words matching an unplanted family; the **seed** arrives with a note
  about where it came from, activating the Seed stage Phase 1 architected.
  Today's passages and families do not yet overlap, so the loop is live but
  dormant until content grows — nothing is faked.
- `CACHE_VERSION` → 19; verify.mjs gains atmosphere-determinism and
  Gate-honesty assertions; driven end-to-end in Chrome (15/15 checks, zero
  console errors).

## 0.14.0 — 2026-07-14 — Language Garden (Root Grove)

The sixth module island, and the first not built around a question-and-answer
loop at all. Built to a new `LANGUAGE_GARDEN_BIBLE.md`, which explicitly
replaces the old idea of a "vocabulary module": Word DNA (0.13.0) taught
roots through notice/predict/apply, scored, XP'd, and celebrated like every
other module. The Language Garden throws that model out on purpose.
Vocabulary stops being content to consume and becomes a small living place —
a grove of root-family trees the learner tends — where growth is never faked
and nothing is ever scored. This release ships only the first vertical
slice: the **Root Grove** (Latin and Greek roots, the "decompose" engine of
the Bible's four; Vine Walk, Orchard, Wildflower Meadow and Twin Patch are
reserved in the schema but ship no content yet), four hand-authored root
families, deliberately small — "quality, not quantity" was the owner's
explicit brief.

### The session, honestly scored by nothing
- **Six beats, one shape**: Encounter+Attempt (a directional guess on a real
  sentence, before anything is explained) → Key (the root, its origin, its
  meaning, one line) → Spread (tap each morpheme to reveal its gloss, watch
  the parts join into the taught word) → Reach (the SAME tap-and-join
  mechanic on a word never taught, then construct its meaning from three
  options) → Growth (one line, one animation, back to the garden). A later
  visit runs a shorter retrieval-only shape instead: a bare-root Key quiz,
  two taught members re-tested in fresh context sentences, then one Reach.
- **The Reach beat cannot be failed.** A wrong first guess gets one pointing
  line ("Look at the first part.") and a second try; either way the
  construction lands and the copy is the same: "No one taught you that
  word." Getting there is the point, not getting it right immediately.
- **No red, anywhere.** LANGUAGE_GARDEN_BIBLE §8 is explicit that removing
  red "removes the flinch that makes people avoid review" — an incorrect
  pick gets the same neutral dimming as every other non-answer, never the
  shared `cat-option` red state the rest of the app uses freely.
- **No score, anywhere.** Not a percentage, not a streak, not XP. Garden
  sessions persist to `STORES.LEARNING` (`kind: 'garden-session'`), not
  `STORES.SESSIONS` — a deliberate choice so growing a tree can never
  silently earn XP or streak credit through the shell's existing engagement
  system, which the Bible names outright as "a second reward economy."

### A spacing scheduler that never demotes
`core/engine/garden-session.js` derives a plant's life stage (Seed → Sprout
→ Sapling → In leaf → Evergreen) and whether it is due purely from its
session history — nothing is ever stored as a conclusion, only recomputed.
A conservative rung ladder (10 minutes, then 1/3/8/21 days) grows the
interval only after a CLEAN revisit; a rocky one still regrows the plant
(canopy fuller, a real animation) but simply doesn't buy a longer interval
next time. The garden itself enforces "at most one plant asking per visit"
even when several are technically due (guilt containment, Bible §6.4), and
offers exactly one open seed to plant on a day nothing is due — never a list,
never a queue, never copy that references absence.

### A grove that feels alive, cheaply
`<cat-plant>` draws every life stage and the Gold / Bare-with-buds overlays
as a small, fixed set of layered vector states (deterministic ring-layout
math, never Math.random(), never per-leaf simulation) — a garden full of
evergreens costs the same frame budget as an empty one. A grove visit has a
~45% chance of one quiet ambient visitor (a bird, a butterfly, a firefly at
night, a drifting petal), time-of-day sky tinting from the real clock, and —
purely derived from timestamps already in history — a small nest that
appears in an evergreen's canopy once it has held that stage for two weeks.
Sound is a second, deliberately smaller synthesis identity
(`logic/audio.js`, module-local, not a reuse of the shell's reward sounds):
two named session sounds (a soft note at the Key, a warm chime at Growth),
two tap-mechanic grains, and an optional off-by-default ambient bed of
breeze and distant chirps that reads the shell's own master Sounds
preference before ever making a sound.

### Content: a new shared substrate, and four plants
`vocab-NNNN` is the shared word substrate `MASTER_CONTEXT.md` already
reserved a prefix for: every future garden references words by id instead
of inlining them. `lg-NNNN` is the grouping layer — a plant's root, its
opening directional Attempt, and its members' morpheme parts, glosses, and
two context sentences each (one to teach, one "fresh" sentence every
revisit reuses, so recognition attaches to the word and not a memorised
sentence). The loader cross-validates that a member's parts actually
concatenate to its own word — a real authoring bug (three members were
missing a connecting vowel: chronometer, chronograph, philosophy) was
caught by this check before it ever reached a screen. Four families ship:
**cede** (Bible's own worked example throughout), **chron** (the Bible's
own Journal example), **phil**, and **cred**.

### Product decision: Word DNA soft-hidden, not removed
The Bible frames the Garden as replacing "the old vocabulary module," which
is Word DNA in every practical sense. Owner decision: keep Word DNA's
routes, code, and data fully intact (nothing here touches
`src/modules/word-dna/`), but stop advertising it — removed from Home's
Continue card, Home's daily word widget, and the Practice hub, replaced by
a correspondingly calm "Your garden" card and a Language Garden Practice
row. `#/wd` still works for anyone who navigates there directly; restoring
its Home presence is a one-line revert (see `CONTINUE_INFO` in `app.js`).

No DB migration (the `learning` store already existed, 0.6.0; a new `kind`
value is additive). Two new content schemas (`vocab.schema.v1.json`,
`lg.schema.v1.json`), 20 vocabulary words, 4 root families, one new UI
component (`cat-plant`), one new mentor voice
(`core/mentor/garden-voice.js`, banned-word-linted like every other
mentor but deliberately carrying none of the DNA-trait/one-lesson
apparatus the Bible abolishes for this module). `CACHE_VERSION` → 16,
`CONTENT_VERSION` → 11.

## 0.13.0 — 2026-07-13 — Word DNA

The fifth module, and the first not to imitate a CAT question format at
all. Built to a new `WORD_DNA_BIBLE.md`, using two owner-supplied PDFs
(`SECTION 1- Vocabulary.pdf`, `Section 4 Roots, Prefixes,.pdf`) as the
exclusive, non-negotiable source of truth for every word, meaning, and
example transcribed — never invented, rewritten, or simplified. The
durable idea, and the reason it isn't called "Vocabulary": **understanding
a word's shared parts beats memorising a list.** A learner who has met
"chron" once should be able to work out a chron-word they've never seen;
memorising a list doesn't transfer, noticing a pattern does.

### The learning journey (not a word list)
- **A first-time introduction** (`/wd` on first open, then `/wd/about`
  forever, resettable from Settings → Learning): what Word DNA is, why so
  many words repeat their parts, why understanding beats memorising, how
  one root unlocks fifty words, and how the journey teaches — five
  progressive-reveal sections, calm and concrete.
- **The Language Tree, not a ladder.** Every other module stages
  difficulty across eight tiers; Word DNA doesn't, because there's no
  difficulty curve to a root — there's only "met" or "not met yet." The
  Tree browses five branches (root, prefix, suffix, foreign words, CAT
  vocabulary) plus a sixth, **Frequently Confused Words**, shown as a
  disabled "Coming later" row rather than skipped silently: the source
  chapter for it wasn't available this pass, and the architecture should
  say so honestly instead of pretending the branch doesn't exist.
- **One loop, every family: Notice → Predict → Reveal → Understand →
  Apply.** Notice shows the shared fragment across several taught words
  (highlighted exactly, hyphens stripped, every spelling of a
  multi-spelling root tried in turn — `cede`/`ceed`/`cess` all light up).
  Predict asks what it means before revealing anything. Understand
  explains why the piece threads every taught word. Apply is the actual
  test: one or two words the learner was never taught, each decoded from
  the pattern alone — this is where transfer, not recall, gets proven.
  Foreign words and CAT vocabulary have no shared root to notice, so they
  honestly swap the shared-piece Notice for a word-in-context Notice
  instead (Bible §3a) — meeting a borrowed word is the whole skill, and
  the module says so rather than manufacturing a pattern that isn't there.
- **A bounded, four-trait Word DNA** (`core/mentor/wd-dna.js`): root
  recognition, meaning transfer (the signature trait — the one that
  actually measures whether a pattern generalized), context calibration,
  and family fluency. Chosen from seven candidate traits the Bible
  considered; three were merged or dropped by name (§5) rather than
  shipped as a padded list. Evidence-floored and banned-word-linted like
  every other module's DNA.
- **A derived Word Garden** (`/wd/garden`, `logic/garden.js`): every word
  earned through a correct Apply — never the taught words themselves,
  since those were given, not earned. No new storage; entirely computed
  from stored sessions.
- **Today's Discovery**: Home offers one word a day (foreign or CAT
  vocabulary only, deterministic by calendar day) without being asked — a
  reason to open the app even on a day with no time for a full set. It
  stops itself; there's no streak to protect and no guilt for skipping it.
- Plain accuracy, no CAT-style marks. Word DNA isn't a CAT question type,
  so the result screen says so instead of inventing a scoring convention
  to imitate one.

Content: 12 families (`batch-wd-001`), spanning all five active branches,
transcribed verbatim from the two source PDFs. This is deliberately a
small but *complete* first batch, not the full corpus — every screen,
interaction, and system is fully experienceable today; the schema and
registry are designed so every future batch is pure content (more JSON
files), never a code or UI change.

One real bug caught during browser verification, before shipping: for
the two-Apply families (foreign words, CAT vocabulary), the second Apply
challenge was replacing the entire Apply region instead of joining it,
silently erasing the learner's own first correct transfer — the exact
moment the module exists to reward — the instant the second challenge
appeared. Fixed to accumulate, the same pattern Notice/Predict/Understand
already use, so both transfers stay visible with their verdicts through
to the mentor moment.

No new component, no new sound, no new color (`--color-info` — blue — is
reused for the Understand block, the one surface where it's the star);
`module:"wd"` in the existing sessions/attempts/learning stores; no
existing module changed. `CACHE_VERSION` → 15, `CONTENT_VERSION` → 10.

Verified: `tools/verify.mjs` (all 14 sections, up from 13 — a new Word
DNA schema+consistency section and a new engine/voice/DNA/lesson dry run
section), 217 precached files all resolve, 94 modules reachable from
app.js all exist and are precached, and two full scripted Chromium passes
with zero console errors: the root/prefix/suffix path (intro → Tree → a
full four-family Roots set → mentor moment → Word Garden → Learning Page
revisit → Growth → Home) and the foreign-word path specifically
(context-sentence Notice → both Apply challenges → mentor moment), the
second written to confirm the two-Apply accumulation fix.

## 0.12.1 — 2026-07-13 — Product audit: four cross-module fixes

A full screen-by-screen audit of every flow in the app (Home, Practice,
Growth, Settings, and all four module journeys), looking specifically for
places a first-time CAT aspirant could hesitate or feel lost. No new
features; four concrete fixes, each confirmed in a real browser against
live IndexedDB state before shipping.

- **Home's "Continue" card is now module-aware.** It previously asked
  `core/learning/journey.js`'s RC-only recommender no matter what the
  learner actually last practiced, so a learner deep in Para Jumbles kept
  being nudged back to Reading Comprehension by the app's single most
  prominent call to action. Home now reads the most recent session's
  `module` and asks that module's own recommender (the same one its
  browser page already uses via `recommendNextPJ`/`PS`/`OOO`), so the
  card always says "Continue your Para Jumbles journey" (etc.) and links
  straight into the right session. RC-only learners see no change.
- **Para Jumbles introduction now has a Settings row.** Para Summary and
  Odd One Out both shipped a "Show again" row for their first-time
  introduction (`resetPSIntro`, `resetOOOIntro`); Para Jumbles had the
  identical `markPJIntroSeen`/`hasSeenPJIntro` mechanic but no
  `resetPJIntro` and no Settings row, an asymmetry left over from before
  the "Settings can reset it" pattern existed. Added `resetPJIntro`
  (`modules/para-jumbles/logic/store.js`) and wired it in, matching PS/OOO
  exactly.
- **RC's session screens now say "Journey," matching RC's own name for
  itself.** RC's browser page has always titled itself "Your reading
  journey," but its session, mentor-moment, and review screens said
  "← Library" (RC's own inconsistency, four places), while Para Jumbles,
  Para Summary, and Odd One Out all said "← Journey" (six places,
  matching their own browser titles). Renamed RC's four to "← Journey."
- **RC's action verbs now match the other three modules.** RC still said
  "Skip" and "Submit"; Para Jumbles, Para Summary, and Odd One Out had
  since converged on "Set aside" and "Lock it in" for the identical two
  actions. A learner moving between modules met two vocabularies for the
  same actions. Aligned RC's session screen to the newer, established pair.

Verified: `tools/verify.mjs` (all 13 checks), full ES module graph
resolves cleanly under Node, and a scripted Chromium pass through Home →
RC session → Settings → Para Jumbles first-time intro → solve → Home
again, with zero console errors and the "Continue your Para Jumbles
journey" card confirmed on screen. `CACHE_VERSION` bumped to 14 (five
precached files changed).

## 0.12.0 — 2026-07-11 — Odd One Out

The fourth VARC module, built faithfully to `ODD_MAN_OUT_BIBLE.md`. The
durable skill is **structural reading over elimination tricks**: the
outlier is on-topic but out-of-structure, defined by the discourse
relation it cannot enter, never by the topic it is about (Bible §4).
This is not an Odd One Out question bank; it is a complete learning
system that trains a reader to build the paragraph first and let the
stranger reveal itself.

### The learning journey (not a question bank)
- **A first-time introduction** (`/ooo` on first open, then `/ooo/about`
  forever, resettable from Settings → Learning): no questions until the
  learner understands what Odd One Out is, why CAT asks it, why beginners
  give away marks by hunting for a faulty sentence, why building the
  paragraph first is the whole method, and how paragraphs naturally
  develop ideas (old information carrying new). Calm, illustrated,
  progressive-reveal sections in very simple English.
- **An eight-tier ladder** — Foundation, Easy, Medium, Advanced, CAT,
  CAT+, 99 Percentile, Premium — each tier **teaches one structural
  reading skill** before the next raises the pressure (see the paragraph
  inside the five → build before you judge → same words different job →
  test the ties not the tone → hold the whole paragraph → both traps at
  once → the finest branch → everything at once). The primary difficulty
  lever is topical overlap between outlier and core (Bible §6). Tiers
  recommend; nothing locks.
- **The Paragraph Builder**: at the first three tiers the learner does
  not hunt the odd sentence at all. They arrange the four connected
  sentences on the shared `<cat-jumble-board>` (placing four of five),
  and the sentence left out becomes the answer — **construction before
  elimination** (Bible §7 remediation), until the protocol is a reflex.
  From Advanced up the surface is the exam's (tap the sentence that
  stands apart), with a read-back before locking at every tier.
- **Today's Mission before every item** ("Protect paragraph continuity.",
  "Find the logical branch.", "Build the paragraph before eliminating.",
  …) — eight missions, rotated intelligently because each item declares
  the skill its design foregrounds.
- **The Think button**: a floating coach available while solving. It
  never hints — it asks the coaching questions strong structural readers
  ask themselves (which four belong together, does one sentence begin a
  different discussion, is it broken or simply from another paragraph),
  two tuned to the item's mission plus a deterministic core.

### Teaching, not marking (the §12 answer experience)
Never a bare verdict. Every answer teaches in layers: **the paragraph
the four sentences build** (the four gently join into readable prose,
its spine named), **each sentence doing its job** (the discourse role
rail, with the cohesive tie between each pair of neighbours named),
**why one sentence stands apart** (the outlier visibly separates, its
§4 violation type named, and the reason it cannot attach), **the trap
exposed** (why the outlier looked like it belonged, and when the learner
excluded a belonging sentence, the exact §7 way-of-reading that produced
the pick), and **make it a habit**. Explanations grow richer with tier —
tie names from Medium, the cohesion and locus anatomy from Advanced,
the full difficulty anatomy at the elite tiers.

### The mentor and Reading DNA (the bounded §8 extension)
- An Odd-One-Out **Reading DNA** (`core/mentor/ooo-dna.js`) exposes
  exactly the four new traits the Bible sanctions and no more:
  coherence-monitoring (the local vs global locus split),
  relatedness-vs-belonging (the topical-overlap split),
  candidate-model-maintenance (build quality and quick exclusions that
  did not hold), and ambiguity-tolerance (the Trap A decoy). Every wrong
  pick is a core sentence carrying its own §7 tag, so misses aggregate by
  named solver pattern with no approximation. All evidence-floored and
  banned-word-linted, exactly like the RC, PJ and PS mentors. Growth
  gains a "How you detect" section.
- One lesson per set (`core/mentor/ooo-lesson.js`), same learning-store
  shape, so a coherence-monitoring insight can open tomorrow's reading
  session as a twenty-second recall (the Bible frames Odd One Out as
  comprehension monitoring, the metacognitive layer of all reading).

### Content: 20 items, all eight tiers, Bible-governed
`content/schema/ooo.schema.v1.json` encodes the Bible's §13 metadata:
the five sentences, the outlier and the core order, `spine_type` and
`nucleus`, the §4 a–g `violation_type` taxonomy, the §6
`difficulty_vector` with `topical_overlap` as the primary lever and
`violation_locus` (local/global/mixed), the two engineered `traps`
(A = belonging-looks-odd, B = outlier-looks-belonging), the Halliday &
Hasan `cohesion_signals`, and the §11 `validation` gates (uniqueness,
reconstruction, heuristic-adversarial, trap audit) which all pass to
ship. The bank: 20 original five-sentence items across 12 genres and all
seven violation types, outlier positions balanced exactly 5/5/5/5/5 (no
answer-position leak on a TITA type), and heuristic-adversarial from the
medium tier up (a pure surface-heuristic solver gets those items wrong,
Bible §10). Format (5 sentences, TITA, +3/0) is carried as configuration
with a `format_verified` note, never a constant. All enforced
mechanically — loader consistency checks + batch-level fairness checks.

### Reuse, not duplication
- OOO sessions/attempts persist to the **same** stores as RC, PJ and PS
  (`module: "ooo"`), so streaks, XP, levels, achievements, backup and
  restore cover detection with **zero** storage changes.
- Reuses `<cat-jumble-board>` (extended additively with an optional
  `maxPlaced` cap and an `excluded` reveal state — PJ passes neither and
  behaves exactly as before), the progress/timer/XP components, the
  celebration surface, and the existing audio language (**no new
  sounds**). Intro, mission, Think and teaching CSS shared with PJ/PS via
  grouped selectors — no component duplicated, no working file renamed.
- Reading Comprehension, Para Jumbles and Para Summary are untouched
  except for shared, additive surfaces (Growth section, Practice list,
  Settings row, Home recent-practice label, loader + verify extensions).
- `tools/verify.mjs` extended: OOO schema + consistency, registry
  mirror, precache coverage, batch fairness (outlier-position spread,
  violation-type variety, adversarial-flag enforcement), and a full OOO
  engine/voice/missions/think/DNA/lesson dry run.

**Roadmap note (per ROADMAP_V2 maintenance rule):** Odd One Out ships at
0.12.0, reusing the sentence-ordering interaction that Para Jumbles
introduced (as the 0.7.0 plan anticipated). Vocabulary remains the last
module in the V1.x ladder.

## 0.11.0 — 2026-07-11 — Para Summary

The third VARC module, built faithfully to `PARA SUMMARY BIBLE.md`. The
durable skill is **hierarchical reading**: find the apex claim, fix its
scope and certainty, hold the author's stance, and compress without
changing any of the three. Every item, option, explanation and
Reading-DNA signal is engineered to train exactly that — a learning
system, not a question bank.

### The learning journey (not a question bank)
- **A first-time introduction** (`/ps` on first open, then `/ps/about`
  forever, resettable from Settings → Learning): no questions until the
  learner understands what a summary question is, why CAT asks it, how
  beginners and experts read differently, and why "sounds good" is not
  the test — the meaning-preservation test is. Calm, illustrated,
  progressive-reveal sections in very simple English.
- **An eight-tier ladder** — Foundation, Easy, Medium, Advanced, CAT,
  CAT+, 99 Percentile, Premium — each tier **teaches one reading skill**
  before the next raises the pressure (claim vs topic → resisting the
  example → evidence vs claim → finding the turn → keeping qualifiers →
  holding stance → the one-word finalists → everything at once), mapped
  onto the Bible's five levels (§5 dials). Tiers recommend; nothing locks.
- **Today's Mission before every paragraph** ("Protect the author's
  scope.", "Ignore the examples.", …) — ten missions, rotated
  intelligently because each item declares the skill its design
  foregrounds.
- **The Summary Builder**: before the options, the learner writes the
  author's point in one sentence of their own, then walks an honest,
  item-specific comparison against the ideal summary (core idea, scope,
  certainty, additions, stance) — generation before recognition. Their
  sentences persist (learning store, `kind: "summary"`) and reappear on
  the Learning Page.
- **The Think button**: a floating coach available while solving. It
  never hints — it asks the questions expert readers ask themselves
  (Bible §3), two tuned to the item's mission plus a deterministic core.

### Teaching, not marking
Never a bare verdict. Every answer teaches in layers: **what the
paragraph actually says** (the paragraph gently compresses into the
ideal summary, thesis sentence highlighted), **why the best answer
holds** (the meaning-preservation test, applied), **why each option was
built to tempt you** (its §7 distortion archetype named, plus the §6
way-of-reading that produces it), and **make it a habit**. Explanations
grow richer with tier — sentence anatomy from Advanced, the separating
element at the elite tiers — never overwhelming beginners.

### The mentor and Reading DNA
- A Para-Summary **Reading DNA** (`core/mentor/ps-dna.js`): every wrong
  pick carries the taxonomy tag of the distortion that rewarded it, so
  misses aggregate by family (scope, certainty, structure, addition,
  stance, logic, language, precision) into the learner's dominant
  pattern — "scope pulls keep finding you" — plus qualifier-density and
  unmarked-turn splits, finalist strength, pace watches, and growth
  observations. All evidence-floored and banned-word-linted, exactly
  like the RC and PJ mentors. Growth gains a "How you summarise" section.
- One lesson per set (`core/mentor/ps-lesson.js`), same learning-store
  shape, so a summary insight can open tomorrow's reading session as a
  twenty-second recall.

### Content: 20 items, all eight tiers, Bible-governed
`content/schema/ps.schema.v1.json` encodes the Bible's operational core:
apex (claim/scope/certainty/stance) fixed before options, architecture
(§2), the eight difficulty dials (§5), load-bearing words, the elite
`separating_element`, and per-distractor archetypes (§7 palette,
single-distortion rule; layering elite-only). The bank: 20 original
paragraphs across 12 genres and 7 architectures (concession-turn capped
at 20%, §14), correct positions balanced 5/5/5/5, option lengths banded,
three error families per item, near-miss finalists with nameable
separating elements at the elite tiers. All enforced mechanically —
loader consistency checks + batch-level fairness checks in verify.

### Reuse, not duplication
- PS sessions/attempts persist to the **same** stores as RC and PJ
  (`module: "ps"`), so streaks, XP, levels, achievements, backup and
  restore cover summaries with **zero** storage changes.
- Reuses `<cat-question-card>`/`<cat-option>`, the progress/timer/XP
  components, the celebration surface, and the existing audio language
  (no new sounds). Intro and teaching CSS shared with PJ via grouped
  selectors — no component duplicated, no working file renamed.
- Reading Comprehension and Para Jumbles are untouched except for
  shared, additive surfaces (Growth section, Practice list, Settings
  row, loader + verify extensions).
- `tools/verify.mjs` extended: PS schema + consistency, registry
  mirror, precache coverage, batch fairness (position spread,
  architecture variety, concession-turn cap), and a full PS
  engine/voice/missions/think/DNA/lesson dry run. All 83 checks pass.

**Roadmap note (per ROADMAP_V2 maintenance rule):** Para Summary ships
at 0.11.0. Odd One Out and Vocabulary remain next in the module ladder.

## 0.10.0 — 2026-07-10 — Para Jumbles

The second VARC module, and the first that teaches a genuinely new skill:
rebuilding a scrambled paragraph into the order its author wrote. Built
faithfully to the new `PARA_JUMBLES_BIBLE.md` — the durable skill is
**global coherence tracking over local pattern-matching**, and every item,
explanation, and Reading-DNA signal is engineered to train exactly that.

### The learning journey (not a question bank)
- **A first-time introduction** (`/pj` on first open, then `/pj/about`
  forever): no questions until the learner understands what a jumble is,
  why CAT asks it, why memorised tricks fail, and how authors build
  paragraphs (old information carrying new). Calm, illustrated, sections
  that reveal as they scroll, written in very simple English — the learner
  should finish excited, not scared.
- **An eight-tier ladder** — Beginner, Easy, Medium, Advanced, CAT, CAT+,
  99 Percentile, Premium — each with a distinct design contract from the
  Bible's §6 difficulty bands, so every step *feels* different. The decisive
  local-linking → macro-structure plateau (Bible §9, level 2→3) is crossed
  between Medium and Advanced by design. Tiers recommend; nothing locks.
- **The solving surface**: tap sentences into order, then a mandatory
  **read-back** — the assembled paragraph appears as prose before you can
  lock in (Bible Recommendation 6, defeating premature closure). The time
  spent on that read-back is recorded and read by the DNA.

### Teaching, not marking (the four-layer explanation, Bible §11)
Every attempt, right or wrong, is taught in four layers: **the shape**
(name the macro pattern first), **the author's moves** (why each sentence
sits where it does, tied to meaning), **the order that tempted you** (your
exact wrong order walked to the point it breaks, with the trap named), and
**the trap as a reusable defense** plus one transferable habit. Signals are
always taught *with their reliability* — never as rules — because the Bible's
core lesson is that every surface cue can be weaponised.

### The mentor and Reading DNA
- A Para-Jumbles **Reading DNA** (`core/mentor/pj-dna.js`) profiles how you
  rebuild paragraphs: surface-matching, opener/ending judgement,
  global-coherence tracking (accuracy vs number of plausible orderings),
  working memory for long chains, implicit-inference gaps, and premature
  closure (quick locks that did not hold). Every observation is
  evidence-gated behind explicit floors — the mentor never sees a pattern in
  noise — and the language is banned-word-linted for judgment, exactly like
  the reading mentor. Growth's "How you order" section surfaces it.
- One lesson per set (`core/mentor/pj-lesson.js`), in the same learning-store
  shape the reading mentor uses, so a jumble insight can open tomorrow's
  reading session as a twenty-second recall.

### Content: 19 authentic items, all eight tiers
Each written paragraph-first then scrambled (Bible §10), single defensible
order, one documentable link per consecutive pair with its reliability, the
full §12 metadata (twelve-axis difficulty vector, macro pattern, cohesion
signals, engineered traps, `num_plausible_orderings`, and a
`heuristic_adversarial` flag that is **true from Medium up** — a pure
surface-heuristic solver gets those items wrong). Format (4 sentences, TITA,
+3/0 no negatives) is carried as *configuration* with a "last verified" flag,
never hard-coded, per the Bible's volatility warning.

### Reuse, not duplication
- TITA scoring engine (`core/engine/pj-session.js`, +3/0). PJ sessions and
  attempts persist to the **same** stores as RC (records tagged
  `module: "pj"`), so streaks, XP, levels, achievements, backup and restore
  cover jumbles with **zero** storage changes.
- One new shared component, `<cat-jumble-board>` (select-to-order, not
  drag — reliable on small screens and keyboard-friendly, per ROADMAP_V2's
  0.7.0 decision). No new sounds: every cue reuses the existing audio
  language. Reading Comprehension is untouched; the module registers itself.
- `tools/verify.mjs` extended: PJ schema + consistency (permutation checks,
  links-per-pair, adversarial-flag enforcement), registry agreement,
  precache coverage, and a full PJ engine/voice/DNA/lesson dry run. All
  checks pass.

**Roadmap note (per ROADMAP_V2 maintenance rule):** Para Jumbles ships at
0.10.0, ahead of Odd One Out. It shares the sentence-ordering interaction
that Odd One Out (originally paired with it at 0.7.0) will reuse. Module
order behind is unchanged.

## 0.9.0 — 2026-07-07 — Audio Identity

A complete, coherent sound language, synthesized live — so studying feels
satisfying, calm, and premium rather than noisy. Success criterion: the
sounds read as one family (a recurring motif, one tonal world), never feel
childish or arcade-like, and hold up over a long study session without
fatigue. Everything is Web Audio; no mp3/wav assets are added, nothing new
to download, cache, or license (the durability rule holds).

**Roadmap note (per ROADMAP_V2 maintenance rule):** Audio Identity is
inserted at 0.9.0; the Para Summary module shifts by one (→ 0.10.0). The
module order behind it (PS → PJ → OOO → Vocab) is unchanged.

### The sound engine (`src/core/engagement/audio.js`, new)
- One **tonal world**: every pitched sound is drawn from a single C-major
  **pentatonic** scale, so any two grains that overlap are always
  consonant — layering (with haptics, or with another sound) can never
  turn ugly, and nothing ever sounds "wrong". This is what makes the
  family cohere and what keeps hours of study fatigue-free.
- One **motif**: a rising C–E–G "bloom" (the major triad) is the reward
  signature, stated more completely as the reward grows (lessonComplete →
  levelUp → dailyGoal). Hearing a fragment predicts reward; the fuller
  statements resolve it (reward prediction, anticipation → resolution).
- One **mentor colour**: a soft Cmaj9 (adds the 9th) — lush and
  "thoughtful" without dissonance — is the mentor's recurring voice, also
  hinted in the opening chime so the app's welcome and its mentor rhyme.
- Three **timbre families**: CLICKS (filtered-noise ticks — buttons,
  toggles), PAPER (band-passed noise sweeps — cards/pages), and CHIMES
  (soft sine/triangle voices — every cue and reward).
- **Master chain**: gain → gentle compressor (a soft limiter so overlaps
  never bite) → low-pass (warmth, removes fatiguing fizz) → destination.
  One shared 1-second noise buffer feeds every click (tiny, reused).
- Psychoacoustics applied throughout: **variable reinforcement** (the
  "correct" tone picks its resolving top note and a few cents of detune at
  random — never mechanical, always pentatonic), pleasant intervals
  (fifths, thirds, octaves), and low levels with short envelopes.

### The twenty sounds, and where they live
- App open → a soft welcome chime (armed once, sounds on the first
  gesture, because autoplay policy blocks sound before any interaction).
- Button press → a tiny click; Toggle/segmented/answer-pick → a wooden
  tick; a `<details>` card opening → a paper sweep — all wired **once** as
  app-wide delegation (`installGlobalFeedback`), so every control feels
  alive without per-screen plumbing.
- Correct → a satisfying-but-subtle rising resolve; Incorrect → a warm,
  low settle to the tonic (helpful, never a punishment sting); Evidence
  re-anchor ("¶ Re-read the evidence") → a small sparkle (the reward of
  finding the proof — the "excellent explanation" moment, user-initiated
  so it never fatigues).
- Reflection kept → a warm confirmation; Session end → the **mentor
  signature** (every session); Lesson complete / Level up / Achievement /
  new-best Streak → the reward tier, one sound chosen by the biggest
  milestone, landing a beat after the mentor and synced to the rising
  celebration sheet. **Stacked** milestones add a layered sparkle shower
  ("confetti" — layered light, never a cheer).
- **Daily goal** (first session of the day) → the memorable success
  melody, a warm phrase with a dip-then-lift hook and a bell resolve; it
  is audio-only (no sheet) and reserved for the day's goal so it stays
  special. (Where a new-best streak coincides it escalates to the streak
  tone; documented so the two daily-ish sounds never double-fire.)
- XP counting → tiny ascending pentatonic notes synchronized with the
  count-up; the XP bar now reveals on scroll-into-view (Intersection
  Observer) so the run accompanies a *visible* climb and never collides
  with the mentor/reward audio from inside a collapsed fold.
- Toasts → a soft, unobtrusive `notify`; Backup saved → a tiny reassuring
  confirmation; Restore complete → a warm "rebuilding" arpeggio; Error →
  a short, deliberately NEUTRAL double-pulse (F, outside the reward world,
  so it reads as information — attention, not alarm).

### Preferences & Settings
- New **master volume** control (a token-styled, accessible native range;
  persisted as `sound-volume`, default 0.7) beside the existing Sounds
  toggle, which is unchanged and **still defaults OFF** (opt-in). Enabling
  Sounds replays the welcome chime as an honest demo; dragging the volume
  previews a tick at the new level.
- `feedback.js` becomes the orchestration layer: a single **cue table**
  maps each semantic moment to a haptic pattern + a named sound (haptics
  and sound layer naturally, fired together). `tools/verify.mjs` §10
  cross-checks every cue against the engine's registry so the two files
  can never drift, and confirms the disabled play-path is a safe no-op.

### Accessibility & honesty
- **Reduced-motion** is respected: the XP run collapses to one soft note,
  and the sparkle/confetti showers thin to a few grains — less rapid
  stimulation for sensitive users (sound is never muted outright; it isn't
  motion).
- Sound never plays while the tab is **hidden**, and never fires from
  reading or scrolling — reading is never interrupted.
- HONESTY NOTE retained: whether the iOS hardware-mute switch silences Web
  Audio varies by version/context and can't be reliably detected — hence
  the OFF default, the toggle, the master volume, and the no-background
  rule, rather than a false promise of respecting system mute.

### Plumbing and verification
- Service worker precaches `src/core/engagement/audio.js`; shell
  `CACHE_VERSION` 9 → 10 (content cache untouched). The module-graph +
  precache-coverage check proves the new module is reachable and cached,
  so offline can't break. `APP_VERSION` → 0.9.0.
- No design tokens changed; the volume range styles are token-only
  additions to `components.css`. No content, schema, or engine logic
  changed.

## 0.8.0 — 2026-07-06 — The Premium Reading Library

The milestone that turns a starter shelf into a library. Success criterion:
after finishing a passage's questions, a student should think "now I finally
understand what I just read." The content library — the actual product —
grows from 8 passages to 32, and the Learning Page becomes a complete,
book-like lesson rather than a set of coaching notes.

**Roadmap note (per ROADMAP_V2 maintenance rule):** this release is a
content-and-learning-surface milestone inserted at 0.8.0 ahead of the Para
Summary module (which shifts by one). Rationale: ROADMAP_V2 §1 names the thin
content library as "the binding constraint on daily-use value, ahead of any
feature", and §10's steering sentence is "grow the library" first. The module
work (PS/PJ/OOO/Vocab) is unchanged in order behind it.

### Content — 24 new premium RC passages (rc-0009 … rc-0032)
- Two reviewed batches (`batch-rc-003` = rc-0009…rc-0020, `batch-rc-004` =
  rc-0021…rc-0032) covering **all 12 genres exactly twice**, at the mission's
  **6 easy / 12 medium / 6 hard** split (25/50/25), with **no two hard
  passages adjacent in id order** so the journey ladder never spikes.
- New genres given their first passages: anthropology, political-theory,
  technology-ethics, environment — every genre in the schema is now represented
  (each with a foundation/developing/intermediate/advanced/elite spread).
- Each passage is authored to the `CAT_VARC_BIBLE` craft rules: an argument
  (not a topic), a discernible author with a contestable stance, qualified
  claims, every distractor a named trap with an articulated seductive element,
  and correct answers that are the defensible survivor rather than the most
  satisfying option. Several passages deliberately withhold a resolution
  (moral luck, the boundary problem) so the correct answers describe a tension
  rather than dissolve it. Provenance stays honest — original compositions in
  CAT register (`source.publication: "original"`), never fabricated citations.
- 102 new questions (library now **136**) carry full distractor teardowns and a
  transferable `reading_habit`; every passage extracts vocabulary-in-context,
  and hard passages run 5 questions including strengthen/weaken items.

### Schema v4 — the full Learning Page (appended; v1–v3 files stay valid)
- `content/schema/rc.schema.v4.json` extends the mentor block with five
  fields that make the Learning Page a complete lesson: `one_sentence_summary`
  (the honest one-line the reader checks their own summary against),
  `simple_explanation` (the whole passage retold in lucid, beginner-readable
  English), `why_difficult` (where readers genuinely struggle, named without
  blame), `reading_lesson` (the ONE permanent reading habit the passage
  builds), and `reflection_question` (one question worth sitting with; the
  schema enforces it ends with "?").
- Versions are appended, never edited: the loader still resolves each file to
  its own schema version, and the eight existing v3 passages are untouched.

### The Learning Page, rebuilt (`/rc/mentor/:id`)
- New sections render in a calm, book-like order: the recall reveal now opens
  with the one-sentence summary; "The passage, explained simply" renders the
  retelling as real paragraphs; "Why this passage was difficult", "The reading
  lesson" (held in a quiet card), and "A question to sit with" (above the
  reflection line) all ship. Every new section is guarded, so v3 passages
  render exactly as before.
- Each of the 12 new passages gets its own self-drawing, monochrome theme
  illustration (keyed by id in `mentor.js`, content JSON stays pure data), and
  the four previously-uncovered genres gain fallback motifs.
- New styles are token-only additions to `components.css`; no design tokens
  were changed and the existing look is preserved.

### Plumbing and verification
- Registry rebuilt from the passage files themselves (a scripted, idempotent
  mirror), so `content/index.json` and the files cannot disagree.
- Service worker: schema v4 and the 24 passages added to the content precache;
  `CONTENT_VERSION` 3 → 5 and `CACHE_VERSION` 7 → 9 across the milestone (both
  content and shell changed as the two batches and the renderer shipped).
- `tools/verify.mjs` extended for v4: the mentor-voice trap lint now targets
  the newest schema on disk, and the schema-precache check now covers every
  version present (not just v1), so a forgotten schema precache is unshippable.
  Full verify is green; edited DOM modules pass `node --check`.

## 0.7.0 — 2026-07-05 — The Personal Reading Mentor

The milestone that gives CAT OS its voice. Success criterion: a student
should finish a session thinking "this app understands how I read" — never
"here is my list of errors." The Mistake Notebook the roadmap planned is
deliberately **subsumed, not built**: every miss is still captured (attempts
since M2, one lesson per session from today), but the product surface is a
mentor and a growth story, never a ledger of failure.

**Roadmap note (per ROADMAP_V2 maintenance rule):** this release takes the
0.7.0 slot the notebook held. Its learning goals — capture, resurface,
retire — ship here in mentor form: lessons captured per session, resurfaced
as twenty-second recalls, retired ("absorbed") after three successful
recalls. Spaced repetition (1.2) inherits this loop instead of a notebook.

### The mentor core (`src/core/mentor/` — pure, deterministic, offline)
- `voice.js` — every sentence the mentor can say, in one reviewable file:
  opening lines by situation, ten named trap patterns (each with the pull,
  how to notice it, and a twenty-second recall seed), question-type advice,
  Reading-DNA copy. Deterministic variety (seeded pick, never random). The
  vocabulary of failure is machine-banned: verify lints every string
  against BANNED_WORDS (wrong/failure/mistake/poor/weak/bad…).
- `dna.js` — **Reading DNA**: evidence-gated observations derived from
  stored sessions + content, never stored, never judged. Detectors: trap
  affinities ("the pull of certainty"), traps gone quiet (growth,
  celebrated first), question-type strengths and frictions, sitting long
  without accuracy, ending rush, fast first pass, late-session dip. Every
  detector sits behind explicit minimum-evidence FLOORS — the mentor stays
  silent rather than pretend noise is a pattern.
- `lesson.js` — the **One Lesson Rule**: after every session, exactly one
  teaching — the miss that matches the reader's characteristic pull, or the
  way into a skipped question, or (clean read) the understanding worth
  keeping, including "an old pull, walked past" when a known pattern was
  present and avoided. Plus `pickRecall`: tomorrow's single twenty-second
  recall (never today's lesson, never twice a day, retired after 3).
- `records.js` — lessons and recall state in the `learning` store (shipped
  0.6.0; no migration), through the StorageAdapter only.

### The mentor moment (session end, rebuilt)
Sessions no longer end on a scoreboard. The mentor opens ("Today I noticed
something…"), teaches the one lesson — the moment, why the brain goes
there, how to notice it next time — with the question itself one fold away,
then a single quiet line: "6 of 8 landed — the numbers matter less than the
noticing." Full numbers, XP, recap, and the review link live in a
"Session details" fold: honesty one tap deep, judgment nowhere.
Milestone celebrations (levels, achievements, best streaks) unchanged.

### Twenty-second recall (before reading)
Opening a new passage first offers one tiny card from a previous lesson:
think → reveal → "Got it" → it collapses and the reading begins. Revision
that barely feels like revision; skippable by simply reading on.

### Growth (new screen, new tab)
`/growth` — the anti-notebook, first extracted shell screen
(`src/shell/growth.js`). Three sections, no marks anywhere: **How you
read** (DNA observations as calm cards — growth first, then strengths,
then watches, each with its evidence sentence), **Concepts you've
collected** (one per session, Fresh → Recalled n of 3 → Absorbed), and
**In your own words** (the latest reflection, quoted). Beautiful empty
state before the first session; "still listening" card until evidence
clears the floors. Bottom nav gains a fourth item (sprout icon) — still
under the five-tab ceiling.

### Verification & plumbing
- verify.mjs section 9 — mentor dry run: voice lint against BANNED_WORDS
  (walks every exported string and template output), a teaching pattern +
  recall must exist for **every** trap_type the schema allows, seeded-pick
  and DNA determinism, evidence floors gate below-threshold histories, one
  lesson per messy session (kind watch), mastery lesson on clean sessions,
  recall rules (not today's lesson, once per day, retire at 3).
- `loadRCPassages(ids)` added to the content loader (shared by mentor and
  Growth — no duplicated loading logic).
- Service worker: shell cache v7; five new modules precached (content
  cache untouched at v3 — no content changed).

## 0.6.0 — 2026-07-05 — The Reading Experience

The milestone that makes CAT OS feel like the best reading application a
CAT aspirant has ever used. Success criterion: a student should *enjoy
reading here*, not merely solve questions.

**Roadmap note (per ROADMAP_V2 maintenance rule):** this owner-directed
release takes the 0.6.0 slot; the Mistake Notebook moves to 0.7.0 and
subsequent ladder versions shift by one.

### The reading surface, rebuilt
- `cat-passage` redesigned against the best reading software (Kindle,
  Apple Books, Medium, Readwise Reader): a true book measure (~64
  characters), scaled serif title, paragraph rhythm via a dedicated
  `--para-space` token, `text-wrap: pretty`, hyphenation on narrow
  phones only, margin-hung numerals, and a quiet end-mark (◆) so the
  reader always knows the text is finished.
- Reading size grows to four steps (S/M/L/XL) — XL for late-night and
  accessibility reading; leading loosens as type grows.
- While reading: a sticky, veiled session bar (backdrop blur, safe-area
  aware, notch-painting `::before`), a scroll-driven progress hairline,
  and a Kindle-style "~N min left" that counts down as you scroll.
- Paragraphs carry `scroll-margin-top` so evidence jumps land clear of
  the sticky bar.

### Real difficulty progression (foundation → elite, every rung real)
- Three new fully-authored v3 passages (batch-rc-002): **rc-0006 "What
  the Hand Remembers"** (foundation/easy 2 — the journey's deliberately
  gentle first step), **rc-0007 "The Invention of the Weekend"**
  (intermediate/medium 5, first history item), **rc-0008 "The Authority
  of the Original"** (elite/hard 9, first elite passage, 5 questions).
- Registry now carries `difficulty_numeric` for every item, so
  within-stage ordering is genuine, not id-accidental. The library
  ladder is 2→3 / 5→6 / 5→6 / 8 / 9 across five populated stages.
- The library screen became "Your reading journey": overall progress
  bar, stages that introduce themselves (one reviewable voice in
  `journey.js` → `STAGE_INFO`), per-stage read counts, difficulty shown
  as a calm dot, and the recommended passage carrying an accent edge
  with its reason.

### Content schema v3 (appended; v1/v2 files remain valid)
- Every question's explanation must now teach one transferable
  **reading habit** (`explanation.reading_habit`) — shown as "Make it a
  habit" — and every mentor block must explain **why students misread
  this passage** (`mentor.misunderstanding`).
- All five existing passages upgraded to v3 with authored habits and
  misunderstanding notes (owner review pending, as recorded since M2).

### The Learning Page, redesigned (the signature)
- A theme illustration per passage — monochrome inline SVG drawn for
  *this* passage's idea (a balance for deference, a nib for muscle
  memory, a calendar with two freed days…), self-drawing on arrival,
  with genre fallbacks for future content.
- Chapter sections renamed into a mentor's voice: What was this
  actually about? (recall-first) · What was the author doing? · The
  journey, paragraph by paragraph (now with each paragraph's opening
  words as a memory anchor) · Where the argument turns · How the voice
  moves · **Why readers misread it** (new) · The traps, as advice ·
  Words worth keeping (margin-note vocabulary cards) · **Keep this
  forever** (the page's one pull-quote) · Where life will show you this
  again.

### Reading reflection (new, optional, local)
- After the Learning Page: `<cat-reflection>` — sentence starters ("I
  never realised…", "My biggest takeaway…", "What surprised me…"), an
  auto-growing serif textarea, saved per passage and editable later.
- First use of the new **`learning` object store** (IndexedDB v2,
  additive; the store the notebook will share). Backup format v2
  exports it; v1 backups still import cleanly.

### Explanations that teach thinking
- `cat-explanation` rebuilt as a reading lesson: plain verdict line →
  "How a strong reader gets there" with an evidence pill (¶ Re-read the
  evidence) → distractor teardown cards with trap-type labels and
  "feels right because" → the reading-habit callout.
- Review mode uses the same verdict language (duplicate chips removed);
  each reviewed question is numbered.

### Visual identity & mobile polish
- Bottom nav: matched inline-SVG stroke icons (home/book/sliders) on a
  veiled, blurred bar; nav labels tightened.
- New tokens: `--text-3xl`, `--para-space`, `--radius-xl`,
  `--duration-slower`, `--color-veil`; reading measure corrected to
  36rem; empty-state glyphs sit in quiet circles; skeleton variants for
  lines/titles; quiet `.btn--quiet`; difficulty dots.
- Forced light/dark theme now recolors the iOS status bar
  (`theme-color` metas kept in sync); `overscroll-behavior-x: none`;
  progress bar advances when a question is answered (not one behind);
  screen-scoped event listeners (no accumulation across navigations).

### Verification (`tools/verify.mjs`)
- **Fixed:** dynamic imports now use `pathToFileURL` — the tool
  previously could not run on Windows at all.
- New checks: registry↔file agreement extended to stage /
  difficulty_numeric / estimated_time_min / word_count; journey must
  cover every stage and start foundation-easy-minimum; **module-graph
  resolution** (every import reachable from app.js exists **and is
  precached** — offline breakage is now unshippable); backup round-trip
  of the learning store incl. v1-file compatibility.
- Service worker: shell cache v6, content cache v3; schema v3, three
  new passages, `cat-reflection.js` precached.

## 0.5.0 — 2026-07-04 — The Reading Mentor

The milestone that shifts the product's center of gravity from scoring to
understanding. Success criterion: a student who completes one passage should
be a better reader than twenty minutes earlier.

**Roadmap note (per ROADMAP_V2 maintenance rule):** this release displaces
the Mistake Notebook, which moves from 0.5.0 to 0.6.0; subsequent ladder
versions shift by one. Rationale: the mentor layer changes what a "mistake"
links back to (the Learning Page), so building it first makes the notebook
better, not later.

### Content becomes a curriculum (schema v2 — appended, v1 untouched)
- `content/schema/rc.schema.v2.json`: adds `meta.stage` (foundation →
  elite), `meta.skills` (reading skills practiced), and a required `mentor`
  block: challenge (pre-read), main idea, author's intention, per-paragraph
  journey (role + note, mirrored 1:1 against paragraphs and enforced by the
  loader), tone progression, key transitions, traps-as-advice, real-world
  relevance, one takeaway.
- All five passages upgraded to v2 with fully authored mentor layers
  (meta.version 2; owner review pending, as recorded since M2). Registry
  carries stages.

### The Learning Page (`/rc/mentor/:id`) — the signature
A book chapter, not a dashboard: the app's only artwork (one monochrome
inline-SVG motif per genre, offline by construction), recall-before-reveal
on the main idea (generation effect), the Paragraph Journey rail, tone and
transitions, traps converted into next-passage advice, vocabulary worth
keeping, real-world relevance, one line to keep — then "What you learned
today," derived from this passage and this session, never generic.

### Learning progression (`src/core/learning/journey.js`)
Stage ladder with grouping for the library; recommendations always carry a
plain-English reason; balance rules are legible: never two hard passages in
a row, consolidate a stage after a rough session, and when the library is
read, resurface the weakest passage. Nothing is ever locked — stages
recommend, they do not gate.

### Reading experience
- Reading-size preference (S/M/L) in Settings, persisted through the
  StorageAdapter, scaling only the reading surface via tokens.
- Pre-reading briefing card: stage, genre, difficulty, time, key-word
  count, skills practiced, and the passage's challenge — five seconds of
  mental preparation before the first sentence.
- Evidence jumps: every explanation's anchor is now a control that opens
  the passage and flashes the exact source paragraph, in session and review.

### Changed
- Browser → "Your reading journey," grouped by stage, with a reasoned
  "Next for you"; dashboard Continue card is journey-driven and states why.
- Result screen's primary action is now "Understand this passage."
- Service worker: shell v5, content v2 (passages changed), schema v2 and
  three new files precached.
- `tools/verify.mjs`: resolves schemas per item version; journey dry run
  (ladder order, grouping, balance rules, re-read fallback); loader enforces
  mentor↔paragraph mirroring.

## 0.4.0 — 2026-07-03 — Milestone 4: Engagement system

Premium motivation, not gamification: XP, streaks, achievements, a motivational
dashboard, and whisper-level feedback — all derived from data the app already
stores, all offline, all inside the existing architecture.

### Core (`src/core/engagement/` — pure logic, no DOM, no storage writes*)
- `xp.js` — legible XP rules (+10 correct, +2 wrong, +5 session, +25 perfect)
  and a predictable level curve (100, 150, 200… per level).
- `streaks.js` — daily/best/perfect/accuracy streaks derived from session
  dates on the device's local calendar; humane recovery framing (a streak is
  alive through yesterday; the UI invites, never scolds).
- `stats.js` — the single aggregation point every surface derives from.
- `achievements.js` — declarative registry (11 achievements across firsts /
  consistency / volume / mastery); adding one = adding one object.
- `feedback.js` — haptics (navigator.vibrate, silent no-op on iOS) and tiny
  synthesized WebAudio cues (no audio files). *Persists only two settings
  records (haptics, sounds) plus the celebrated-ids record, via StorageAdapter.
- `messages.js` — the app's whole motivational vocabulary in one reviewable
  file; information over judgment, never manipulative.

### UI
- `cat-xp-bar` (animated fill + reduced-motion-safe XP count-up),
  `cat-week-strip` (last 7 days as quiet bars), `cat-celebration` (the ONE
  celebration surface: a calm sheet with a self-drawing medal).
- Dashboard: date eyebrow, greeting + one honest motivational line, a Today
  card (goal · streak badge · XP bar · week strip), six-stat grid (sessions,
  answered, accuracy, time studied, best streak, level), Continue learning,
  Achievements (n of 11 + three most recent), Recent practice.
- Session result: XP earned with count-up, level progress, one performance
  line; celebration only for level-ups, new unlocks, or a new best streak —
  never for ordinary answers.
- Settings: Feedback card (Haptics default ON where supported; Sounds default
  OFF, opt-in) with an immediate demo cue on toggle.

### Decisions (recorded in STATUS.md)
- Derived-first engagement: XP/levels/streaks/stats are computed from stored
  sessions — no new object stores, no DB migration, backups already cover it.
- "Vocabulary Explorer" deferred honestly (no vocab interaction data exists);
  "Complete Library" takes its slot until the Vocabulary module lands.
- Sounds default OFF: iOS hardware-mute behavior for WebAudio is not reliably
  consistent — verify on device; volumes are whisper-level regardless.

### Changed
- `service-worker.js` → shell cache v4; nine new files precached.
- `tools/verify.mjs` → engagement dry run (XP curve monotonicity + exact
  thresholds, perfect-bonus formula, streak derivation incl. recovery state,
  7-day strip shape, achievement gating against celebrated ids).

## 0.3.0 — 2026-07-03 — Milestone 3: Experience pass

Experience only: no new features, no architecture changes, no functionality
touched. The same app, made to feel calm, fast, and intentional.

### Design system (tokens.css rebuilt as the full design language)
- Three-level ink hierarchy (`--color-ink/-2/-3`), surface scale, line scale.
- Semantic colors: success / warning / danger / info (+ dark equivalents);
  answer-feedback colors now alias the semantic tokens.
- Complete scales: spacing (4px), typography (12→30 with a dedicated 18px
  reading size), radius (xs→full), elevation (`--shadow-0/1/2`), motion
  (`--duration-fast/default/slow`, eases, `--press-scale`), state tokens
  (focus ring, disabled/dim opacities), and a tighter reading measure.

### Motion (all `prefers-reduced-motion`-safe)
- One orchestrated entrance: screens rise gently; top-level cards follow in a
  capped 40ms stagger. Nothing else animates on load.
- Uniform press feedback (scale 0.98) on buttons, options, nav, list items.
- Explanations fade in; the results screen draws a small check; toasts settle
  in with a spring-less rise; theme switching cross-fades background/color.
- Skeleton shimmer for the passage list (static fill under reduced motion).

### Screens
- **Home → dashboard:** date eyebrow, serif greeting, stat grid (sessions /
  answered / accuracy), a Continue-practicing card that surfaces the next
  unread passage, and Recent practice with per-session review links.
- **Settings → grouped premium page:** Appearance / Your data / About cards
  with consistent leading icons, descriptions per row, storage usage via
  `navigator.storage.estimate()` (honest fallback text), and the app version.
- **Empty states** for 404 and the passage browser — direction, not mood.
- RC reading surface: passage column tightened to a reading measure, body
  raised to 18px/1.75, paragraph numerals hang in the margin on wide screens.

### Mobile & accessibility
- Safe-area padding on all four edges; landscape-phone header compaction;
  `touch-action: manipulation`; tap-highlight replaced by our press feedback.
- Consistent two-layer focus ring token applied via `:focus-visible`;
  hover styles gated behind `(hover: hover)` so touch devices never stick.
- `aria-busy` during list loading; labeled review links; decorative glyphs
  `aria-hidden`.

### Performance
- Animations restricted to `transform`/`opacity` (compositor-friendly);
  transitions declare specific properties, never `all`; hover lift avoided on
  touch; no new network work; offline behavior unchanged (shell cache → v3).

### Unchanged by design
Engine, scoring, loader, validator, storage, router, module contracts, all
content, and every user-facing behavior.

## 0.2.0 — 2026-07-02 — Milestone 2: Reading Comprehension module

The first fully working VARC module: an end-to-end, offline learning loop —
read a passage, answer its questions, see exactly why each option is right or
wrong, and review the attempt later — with every attempt persisted through the
existing StorageAdapter. Nothing from Milestone 1 was rebuilt.

### Added
- **RC content schema v1** — `content/schema/rc.schema.v1.json`, the mechanical
  form of CONTENT_DATABASE_SCHEMA.md's RC model (paragraph array, per-question
  distractor analysis, difficulty at two granularities, estimated times).
- **Content pipeline (app side)** — `core/content-loader/validator.js` (a small
  dependency-free JSON-Schema-subset validator) and `core/content-loader/loader.js`
  (fetch + schema-validate + cross-field consistency checks at the boundary).
- **Session engine** — `core/engine/session.js` (pure, DOM-free walk through a
  passage's questions with per-question timing) and `core/engine/scoring.js`
  (accuracy + clearly-labeled CAT-style +3/−1 marks).
- **RC module** — `src/modules/reading-comprehension/`: passage browser, the
  three-phase session screen (reading → question-by-question with immediate
  explanations → result), and review mode. Registered via `registerRC(router,
  context)`; app.js stays a thin wiring layer.
- **UI components** — `cat-passage` (reading-first, numbered paragraphs),
  `cat-option`, `cat-question-card`, `cat-explanation` (trap-type + why-seductive
  per distractor), `cat-progress-bar`, `cat-timer`, `cat-result-summary`.
- **Persistence** — sessions → `sessions` store, per-question attempts →
  `attempts` store, all through the StorageAdapter (Rule 6). Home shows a quiet
  aggregate; the browser shows per-passage status.
- **Starter content** — five original CAT-register passages (rc-0001…rc-0005),
  21 questions total, across philosophy / economics / science / sociology /
  arts-culture and easy→hard, each with full explanations, distractor analysis,
  estimated times, and vocabulary. Registry populated to match.
- **Verification tool** — `tools/verify.mjs`, run with plain Node, reusing the
  app's own validator and consistency rules so tool and runtime cannot drift.
  Checks schema validity, registry↔file agreement, service-worker precache↔disk,
  and does an engine dry run.

### Changed
- `service-worker.js` → shell cache **v2** (all new module + component files
  precached) plus a **separate content cache v1** precaching the schema, registry,
  and five passages; new content is cached on first use as the library grows.
- `src/ui/styles/tokens.css` — added reading line-height and answer-feedback
  colors (light + dark). Additive; no existing token changed.
- `src/ui/styles/components.css` — added practice-flow patterns (badges, list
  items, session bar, verdicts). Additive.
- `src/app.js` — registers the RC module and renders module list on Practice;
  Home now shows aggregate progress. Shell screens and Backup/Restore unchanged.
- `src/modules/README.md` — documents the now-established module pattern.

### Fixed (during verification, before release)
- Passage `meta` blocks were missing the schema-required
  `meta.estimated_time_min`; added to all five and now enforced by the tool.
- Session screen timers now count from the true session start rather than
  resetting between phases.

### Decisions
Recorded in `STATUS.md` → "Recorded decisions (Milestone 2)": paragraph-array
passage shape (schema authority over the prompt template, which is flagged for a
v2 update), array-shaped distractor analysis, the two time fields, the
no-dependency validator, the separate content cache, and CAT-style (not official)
marks. Content provenance policy (original vs. sourced passages) logged as an
open owner decision.

## 0.1.0 — 2026-07-02 — Milestone 1: Walking Skeleton

The first shippable state: an installable, offline, no-build PWA shell with
working local persistence. No practice content yet — by design.

### Added
- App shell: `index.html`, bottom navigation (`<cat-nav>`), Home / Practice /
  Settings / Not-found screens.
- PWA: `manifest.webmanifest`, full icon set (192/512/maskable/apple-touch),
  `service-worker.js` with versioned cache-first shell caching and offline
  navigation fallback.
- Design system: `tokens.css` (light/dark, single accent, type/space scales),
  `base.css`, `components.css`. Motion respects `prefers-reduced-motion`;
  visible keyboard focus throughout.
- Core: hash `Router` with param routes and 404; `StorageAdapter` interface
  (Rule 6) + `IndexedDBAdapter` (DB `cat-os` v1; stores `settings`,
  `attempts`, `sessions`); `backup.js` export/import with versioned file
  format and explicit merge/replace.
- Settings: theme preference (system/light/dark) persisted through the
  StorageAdapter; working Backup & Restore.
- Error handling: global `error`/`unhandledrejection` handlers surfacing
  through a single `<cat-toast>` component.
- Repo hygiene: accurate `README.md`, `STATUS.md`, this changelog,
  `content/index.json` (empty registry), `.nojekyll`, `src/modules/README.md`.

### Fixed
- Replaced the incorrect README, which described an unrelated hobby kernel OS.

### Decisions
- Recorded in `STATUS.md`: relative-path constraint, system font stacks, no
  empty stubs for later-version files, DB naming and keying.
