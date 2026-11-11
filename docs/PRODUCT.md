# Product (what the game is)

Read for UX, copy, game-design or product-fit tasks. Not needed for engineering tasks.

**A painted village under attack by the Muddles, who eat meaning. One tap and you are pulling a rope against one of them. Every right answer pulls harder, every win drops a sealed letter, and everything you answer is real CAT English.**

CAT OS is an offline-first Progressive Web App for the VARC section of India's
Common Admission Test. It is not a study app with a game on top. It is one
painted village, and seven pets live in it. Each pet looks after one part of
CAT English, and each is only as happy as your practice of that part.
Leave a subject alone and its friend misses you; help them and the whole
village comes back to life.

**How it is presented (owner, 2026-10-09).** To the world CAT OS is an
advanced English game: reading, reasoning and vocabulary for anyone, in any
country. The CAT is named once, as the exam the questions are built on, and
never as the headline: the Play listing, the launch videos, the share text
and the web page description all follow this (`android/store/listing.md`).

Every house in the village holds one part of CAT VARC, and its sign on the
map says which (nothing else lives there: no DILR, no quant):

| House (sign) | Friend | What you practise |
|---|---|---|
| the library (**Reading Comprehension**) | **Chai**, an owl | CAT-sized passages, each a book on Chai's shelves; arguments |
| the workshop (**Para Jumbles**) | **Ginger**, a fox | four sentences into the author's order |
| the archery cabin (**Para Summary**) | **Mochi**, a pebble | the summary that keeps the point |
| the observatory (**Odd One Out**) | **Mallow**, a cloud | the sentence that does not belong |
| the rose cottage (**Sentence Placement**) | **Biscuit**, a calico cat | the one place a sentence fits |
| the clock tower (**Para Completion**) | **Sesame**, a mouse | the sentence the gap in a paragraph needs |
| the greenhouse (**Vocabulary**) | **Matcha**, a sprout | word rounds, roots, word parts, words in context |
| the notice board (**The Gauntlet**) | **Toffee**, a flame | the weekly timed mix; Toffee also keeps the daily fire |

The learning underneath is serious CAT preparation:

- **Content:** an engine of authored, taxonomy-tagged, blind-solved items:
  - 146 passages, every one the size CAT sets (average 451 words, never
    more than four questions; seven are real public-domain essays), each
    with an "explain it simply" version
  - 76 jumbles
  - 77 summaries
  - 81 odd-ones-out
  - 52 placements
  - 27 completions
  - 110 word-bank items
  - 51 root families
  - 2,577 CAT words
- **A curator** that chooses what is worth meeting next.
- **A ledger** of the seventeen abilities the exam tests.
- **Mentors** who name the exact trap you fell for.

The game is simple; the learning is not.

## The game in ten seconds

**Tap PLAY → a 90-second tug of war → the Muddle goes in the pond → a letter drops → the card inside is the most interesting thing you will read today → tap PLAY.**

- **The villains are the syllabus, and all of it.** A Muddle is a bad habit of English, and each one is a part of the exam. Ten of them: Smudge eats words (vocabulary), Baron Verbose never says in five words what fifty will do (dense sentences), the Scrambler talks out of order (para jumbles), the Skimmer reads the first line and guesses the rest (reading comprehension, two thirds of the paper), Count Tangent wanders off the point (odd one out), Dame Ellipsis never finishes her... (para completion), the Gatecrasher barges in at the wrong moment (sentence placement), Sir Waffle cannot reach the point (para summary), Madame Mixup confidently uses the wrong word (confusing words), and the Great Muddle does all of it. A duel against one is mostly that part of the exam: two jumbles with quick strikes round them, or one whole passage and its questions.
- **PLAY never gives you the same game twice running.** It chooses who you face: a Muddle you have never met first (so the first ten duels are ten different games, each explained on its playbill), then one rematch if you lost, then today's troublemaker, then whoever is furthest behind their share of the exam. The face on the corner of PLAY shows who is next and opens **Tonight's Bill**, where any Muddle can be challenged at any time.
- **PLAY deals the exam's own proportions.** Once all ten are met, each Muddle comes up as often as its part of the paper deserves (`weight` in `duel/model.js`): the Skimmer about one duel in three, and since a passage is the longest duel, most of the answering is reading, as in the exam. The four paragraph types the exam sets every year (jumbles, odd one out, sentence placement, summary) come one duel in ten each, para completion and the Mixed Bag one in twenty, and so do the three foundations that are never asked directly (words, dense sentences, confusing words). Only the last 38 duels count, so a habit of picking one Muddle from the bill is corrected without being punished for weeks.
- **Two houses have no rope, and the game does not let them be forgotten.** Matcha's Glasshouse (ten words, two good recalls each) and Toffee's Gauntlet (thirty words in three minutes, the same thirty all week) are not duels and are not turned into duels: vocabulary is under every question but is never asked directly, so they are side shows, not posters. A day's first ten words in the Glasshouse leave a letter under a flowerpot; a week's first Gauntlet run pays a silver-sealed one. Tonight's Bill lists both under "Also in the village" with what each still owes you, and after a win (from the third duel on) the result screen holds one door open to whichever letter is still unearned, taking turns when both are.
- **The bill is your report card.** Each poster keeps your record against that Muddle and three ribbons to take off it (3, 8 and 15 dunkings). The posters with no ribbon are what to play next, so "what am I weak at" is answered by looking.
- **Today's troublemaker** is one of the three Muddles you find hardest, fixed for the day. The first win against it pays double laurels: the biggest reward in the game points at the weakest part of your VARC.
- **The rope is the only clock.** A right answer yanks it toward you, a streak yanks harder, a wrong answer gives the Muddle a free heave. Between answers the Muddle leans on the rope. While something long is on screen it stops to read too, so careful reading is never punished, and reading time is not on the duel's clock at all.
- **Word Strikes** are the shared word engine (due, slipped, then new), so a duel is real spaced repetition and Matcha grows from it. **Plain English** is 200 pompous lines to decode, from "I find myself regrettably unable to accede" (no) up to the dense sentences of a hard essay. **Big moves** are the curator's next jumble, stray, gap, seat or summary, saved as an ordinary session of that subject, so the houses grow from it too.
- **The Long Read** is the book Chai is waiting beside in the library, read in a duel. The passage has the screen and the silence to itself, and the button to go on is at its end. Then the questions come one at a time with the passage one tap away, each right answer a hard pull. A wrong answer stops, names the trap in plain words ("True in the world, but not in this passage") and shows the reasoning. The passage is always finished: the rope waits at the brink until the last question. It is saved as an ordinary reading, so the book comes clean on the shelf. Tap "I have read it" faster than anyone can read and the Skimmer says he likes you.
- **Laurels and the Laurel Road.** A win pays laurels, a loss costs a few, and you cannot fall below a stop you reached. Nine stops, each a friend's home where one Muddle lives, and the higher the stop the harder every Muddle pulls. Derived from saved duels, never stored.
- **Letters and the Book.** A win drops a sealed letter, the Morning Post brings one each day, and Chai tucks one inside every book you finish for the first time. Three taps break the seal. Inside are cards from the Book of Curiosities: words that changed their minds, English that came from India, the writer's tricks, reading secrets. Paper grades, from humblest to rarest: Scrap, Folio, Manuscript, First Edition. Cards you have not found stay face down, showing only their hook. Your next letter's first card is always teased in advance, on the home screen.
- **Toffee's fire** is still your days in a row, and every answer still pays Glow, so the village keeps growing underneath everything (the rules are unchanged; see `glow.js`).

## Why it holds attention

The owner's brief was the science of attention, not any particular game. Each mechanic is here because of a known effect, and each is pointed at learning: nothing pays for time, no reward is held back behind a timer, and a missed day costs you nothing you built.

| Effect | Where it lives |
|---|---|
| Curiosity gap (people need to close a question they have noticed) | Face-down cards show only a hook; home shows the first line of your next letter |
| Variable reward (unpredictable payoffs beat predictable ones) | You never know the paper grade or the card; every tenth letter is gold so a dry spell always ends |
| Anticipation (the wait is half the pleasure) | Three taps to break a seal, each harder in the hand |
| Open loops (unfinished things stay in the mind) | Every letter ends by naming what the next one opens with |
| Goal gradient and endowed progress (effort rises near a goal; a head start helps) | The first win puts the bar over halfway; "2 wins to Chai's Steps" |
| Near miss (almost winning motivates more than losing) | A narrow loss says exactly how many right answers short you were, only when true, with a one-tap rematch |
| Peak-end (we remember the peak and the ending) | Every session ends on a splash and a card, not on a score |
| Flow (difficulty that tracks skill) | The Muddle's pull quietly follows your recent results; the curator picks the words |
| Loss aversion (a loss hurts about twice as much as a gain pleases) | Laurels can fall, the fire can go out, walking away costs laurels |
| IKEA effect (you value what you built) | A train you coupled, a sky you lit, a table you seated, a shelf of jars you sealed |
| External triggers, used sparingly (a nudge works when it arrives near a habit) | A notification names the card inside your next letter and comes just before your usual time. At most two a day, never at night, asked for only after you have seen a teaser, and planned three days ahead so they stop if you stop |
| Novelty (a new thing holds the eye; a repeated thing loses it) | PLAY never sends the same Muddle twice running after a win, and each of the first ten duels is a new game |
| Completion and visible mastery (an unfinished set nags) | Ten posters on the bill, three ribbons on each, the count at the top |
| A grudge (a loss to a named rival wants answering) | A loss offers a rematch with the same Muddle, once |
| Reward pointed at weakness (people practise what pays) | Today's troublemaker is one of your three weakest and pays double |
| Personal bests and social proof | "New best!" moments; every card can be sent to someone |
| Variety of effort (the same exertion every time wears thin) | The Glasshouse is slow and has no clock, the Gauntlet is all clock; both pay in the game's own letters, once a day and once a week |
| Spacing and retrieval (how memory actually works) | The same ledger as every word round; missed words come back |

## The houses

Chai's library set the standard: every question is a thing in the room, and getting it right changes that thing, for good, where you can see it. So every house is now a full-screen room you walk straight into, with one big button and no tier grid. Solving something plays on paper, phone-first, and when you finish you go back and watch your thing arrive.

| House | What you practise | What you build |
|---|---|---|
| Chai's library | Reading | Dusty books wiped clean |
| Ginger's Railway | Para Jumbles | Carriages coupled onto a train, one per jumble. Tap the next sentence and it couples on, and each coupling says why it follows |
| Mallow's Sky | Odd One Out | A constellation named for each set. Tap the stray and the other four join up |
| Sesame's Clockworks | Para Completion | Cogs that start turning, under a clock that creeps forward. Tap an option and it drops into the gap, so you read it in place |
| Biscuit's Long Table | Sentence Placement | A guest at a place setting. Tap a gap and the sentence sits there, so you read it in place |
| Mochi's Pantry | Para Summary | A jar sealed with the paragraph's one true line inside, which you can read any time. A miss names exactly how it missed |
| Matcha's Glasshouse | Vocabulary | Plants, letter by letter |

## Your Village Journal

The Journal button beside today's friends opens a longer story: eight chapters
from **A little light** to **A place to come home to**. Each chapter asks for
practice Glow, visits to different subjects, and learning on different days.
The days never need to be consecutive, and chapters never expire.

Collect **32 illustrated keepsakes**: three thank-you gifts from each friend
and one for every chapter. Each has its own picture, story and visible goal.
Open a keepsake to visit its friend and continue practising. Earned keepsakes
come straight from saved learning, so existing players receive credit too and
a backup carries the collection. A result shows newly earned keepsakes and
the next chapter's progress, with a link straight into the Journal.

**This week's expedition** rotates its featured friend every Monday. Earn
60 practice Glow, earn 12 with that friend, and learn on three different days.
The Journal shows the next expedition's date. Every question also contributes
to permanent chapters and keepsakes; taking a break does not remove them.

## The first minutes

The village opens at the campfire. Toffee says one line ("The Muddles are eating our words. Quick, grab the rope!") and the big button glows. One tap and you are in a duel with Smudge: seven everyday words, three clear choices each, and a win you cannot really lose. The Muddle goes in the pond, the laurel bar jumps past halfway, a gold-sealed letter drops, and the first card inside is one of the best in the Book. Then PLAY again. The other friends are met where they live, one stop at a time, instead of in a slideshow.

## The village

**A tall painted valley** (`assets/art/village/`) built from separate pieces:
a winding lane climbs from the library at its foot past the glasshouse, the
railway workshop, the observatory over its stream, the pantry, the long-table
cottage and the clockworks to Toffee's hearth at the top. Each house looks like
the room inside it, and its own machine moves once it wakes: the clocks keep
real time, the telescope sweeps, the carriages shunt, the gear turns, the fire
burns. The river flows, the falls tumble, the oaks sway, smoke rises, and at
night the windows of a grown house glow. Friends walk behind a house and in
front of it as they pass. The valley always fills the screen; a phone opens a
little closer so a house reads well, you drag in any direction, and a pinch
goes closer or back out to the whole valley. Every house carries a plate with
its subject; tap the plate or the house and the camera walks you to its door.

**The valley tour.** The lane is also a tour: every home gives a wax seal when
something real is played in it (a passage and an Arguments set in the library;
ten glasshouse words, a twins round, a borrowed-words round, a root family and
a word-parts set with Matcha; three items in each paragraph room), and Toffee's
Gauntlet with a star seals the hearth once the other seven are sealed. The next
home's plate carries a bobbing seal, the top bar counts the seals, and the tour
card lists what each home still asks for. No deadline and no reward of its own:
it makes sure every part of the paper gets played. A finished tour starts the
next one at the library. Duels never count toward it.

**On top of it, only this:**
- the top bar: Toffee's fire, your stop and laurels (a tap opens the Laurel
  Road), and the settings gear (sound, your village's name, progress, records);
- the bottom: Rooms (every house, plus today's three, the Journal and the
  village level), the big PLAY button, and the Book. A waiting letter, or the
  teaser for your next one, floats above the button.

**The friends live there.** Each one walks the painted paths on its own two
feet with its own gait (Chai waddles, Mochi plods, Ginger trots, Sesame
scurries, Matcha bounces, Toffee hops, Mallow floats), does chores round its home with a prop
in hand, visits its best friend, chats on the plaza, waves when you arrive,
and goes home to sleep at night. Every line comes with a little voice. Tap a
friend or their house and the doorway closes behind you: you are in their room,
with no card and no Help button between you and it. Toffee has no room; tap the
fire for the fire's own card.

**The painting moves.** Forty-four pieces of the painting are cut out with
feathered edges and animated in place (the workshop gear, waterfalls and
streams, lily pads, banners, eleven trees and eight flower beds in the wind,
the campfire, the telescope); a house's own machines wait for it to wake (the
gear is stuck until the first jumble, the clock stopped until the first gap is
filled). Five river reaches flow with refracted water, fish jump and
dragonflies hover. Lamps breathe, chimneys smoke, fireflies come out at night.

**Sound is always on**, at full volume, until you turn it off: a composed
village theme that each friend plays on their own instrument, a quiet focus
mix while you read against the clock, and reward sounds that quote the
song's hook.

**Everything is derived from your records** (`src/pets/economy.js`), so a
backup carries the whole village and nothing can drift from the truth.

**Every other screen belongs to the same place:**
- A lesson stands in a soft painted crop of its host pet's home. A reading
  run, a word round and the Gauntlet show the host's portrait in their bar.
- A place screen shows the host at its own door.
- **Chai's library** (the Reading House, 3.14.0; a whole-screen room from
  2026-11-01, so tapping his house feels like walking in): one long
  bookcase, Elite at the top and Foundation at the bottom, every passage a
  numbered book. Every book starts dusty. Read it and answer its questions:
  all right and it gleams, half right and it is half clean, none right and it
  stays dusty, so the goal you can see is a clean library. Chai stands on a
  rolling ladder beside the next book (he flies down to it when you come in);
  tap any book on an open shelf and it comes off the shelf and opens. A shelf
  opens once half the books on the shelf below it have been read. There is no
  Help Chai: every way to him (his house, him, the big button) lands in the
  library, where he waits beside the next book.
- Results show the friend celebrating, "You helped Chai!" with the stars
  counted up, the level bar, any new stage and its story line, and today's three.
- Progress and Settings sit behind the gear and in the bottom bar; the rose
  cottage is Ginger's second subject house. Records are kept by Toffee.
- After a passage, **Explain this passage simply** opens the passage told
  the way you would tell a ten-year-old (the big idea, the story, one line
  per paragraph, what the writer thinks), with the full expert breakdown
  folded underneath. In the Android app it opens with one short video and
  stays open on that device; on the web it is free.

## Free, with one kind of ad (the Android app, 3.11.0)

The Play Store app is free. Its one ad is a rewarded video the learner asks
for: the verdict after an answer (right or not, and what the answer was) is
always free, and the full explanation (the trap, the why, every other
option, the mentor's lesson at the end of a run) waits behind "Watch a short
video". One video opens every explanation for 20 minutes, so a study
session costs one video, not one per question. If no video can be had, the
explanation opens anyway. No banners, no interstitials, nothing that plays
on its own. Because the videos need a network, the free app plays only
online; a calm wall says so and lifts when the connection returns.

**CAT OS Pro** removes every ad, opens everything and plays offline:
₹199 a month, ₹999 a year (the yearly badge shows the saving against twelve
months) or ₹2,999 lifetime (for repeat takers). It is sold through Google Play; the lock card and Settings
carry the playful nudge ("Are videos interrupting your study session?").
Settings also has Share CAT OS. The web version stays free and unlocked.

## What the game knows about you

Every answer anywhere feeds one ledger of the seventeen abilities CAT's
verbal section tests. Each pet's card offers the curator's next activity
for that subject.

A question you missed **rests** before it comes back: twenty minutes, then a
day, then three days, then most of a week.

About 124 finite **collections** are always there for anyone who wants to
finish something: a grove of roots, a letter of the word lists, a stage of
passages.

