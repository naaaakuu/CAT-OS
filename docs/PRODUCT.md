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

- **The villains are the syllabus.** A Muddle is a bad habit of English: Smudge eats words, Baron Verbose never says in five words what fifty will do, the Scrambler talks out of order, Count Tangent wanders off the point, Dame Ellipsis never finishes her..., the Gatecrasher barges in at the wrong moment, Sir Waffle cannot reach the point, Madame Mixup confidently uses the wrong word, and the Great Muddle does all of it. Beating one is the skill the exam tests.
- **The rope is the only clock.** A right answer yanks it toward you, a streak yanks harder, a wrong answer gives the Muddle a free heave. Between answers the Muddle leans on the rope. While something long is on screen it stops to read too, so careful reading is never punished.
- **Word Strikes** are the shared word engine (due, slipped, then new), so a duel is real spaced repetition and Matcha grows from it. **Plain English** is 200 pompous lines to decode, from "I find myself regrettably unable to accede" (no) up to the dense sentences of a hard essay. **Big moves** are the curator's next jumble, stray, gap, seat or summary, saved as an ordinary session of that subject, so the houses grow from it too.
- **Laurels and the Laurel Road.** A win pays laurels, a loss costs a few, and you cannot fall below a stop you reached. Nine stops, one friend's home and one Muddle each, and each opens a new way to play. Only the next Muddle shows its face. Derived from saved duels, never stored.
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
| Personal bests and social proof | "New best!" moments; every card can be sent to someone |
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

**One painting** (`assets/art/home-world-v1.png`, 1536 × 1024) fills the
screen at full detail and never zooms: on a phone it fills the height and
you scroll left and right (drag, wheel or arrow keys) to see the rest.
Every house carries a sign with its subject, always visible; tap the sign or
the house to go in.

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

