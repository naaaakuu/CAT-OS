# Product (what the game is)

Read for UX, copy, game-design or product-fit tasks. Not needed for engineering tasks.

**A painted village where every CAT English question you answer helps one of seven small friends.**

CAT OS is an offline-first Progressive Web App for the VARC section of India's
Common Admission Test. It is not a study app with a game on top. It is one
painted village, and seven pets live in it. Each pet looks after one part of
CAT English, and each is only as happy as your practice of that part.
Leave a subject alone and its friend misses you; help them and the whole
village comes back to life.

Every house in the village holds one part of CAT VARC, and its sign on the
map says which (nothing else lives there: no DILR, no quant):

| House (sign) | Friend | What you practise |
|---|---|---|
| the library (**Reading Comprehension**) | **Chai**, an owl | CAT-sized passages, the second look, arguments |
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

**Learn → earn Glow → the village grows.**

The village is losing its words. Each friend has a trouble only learning can
fix: Chai's pages are going blank, Matcha's word garden is wilting, Mochi's
notebook lost its notes, Ginger's gears are stuck, Mallow's stars went dim,
Sesame's clock tower stopped ticking, the chairs of Biscuit's rose cottage
have wandered off, and Toffee keeps the fire that holds it all together.
Every round you finish
with a friend helps them:

- **Glow.** The village's one resource, paid for learning done: 1 for each
  question you answer, 1 more when it is right, 2 for finishing a set. Time
  never counts: slow or fast, a question pays the same, and an open app or a
  skipped question pays nothing. Each question pays once a day; tomorrow it is
  review and pays again. You still see 1 to 3 stars for how a run went.
- **The village level.** Glow adds up to levels, and every level puts
  something new on the map: lanterns, bunting, flowers, firefly jars, a
  swing, chimes, a kite, lily-pad lights, sky lanterns.
- **Growing up.** Each friend grows through ten stages (6 Glow each) as you work through
  their subject: stage 1 is the first question you get right, stage 10 is
  every question in it. Every stage shows on them (a twinkle, a bigger body,
  their own hat, a ring of light, a floating charm, gold trim, a sparkle
  trail, a second charm, a golden aura, a crown of stars) and has a name.
  Every second stage is a chapter of their story.
- **Houses that grow.** Every house grows with its own section, and so with
  its friend (the workshop with jumbles, the rose cottage with placements), ten steps from
  faded and dark-windowed to rich, golden and crowned: smoke and a lit lamp,
  lit windows and flowers, a keepsake by the door, a garland, two wonders of
  its own (floating pages and words rising from the library's book, a
  windmill and a balloon at the workshop, an orrery and a night constellation
  at the observatory, arrows finding the bullseye at Mochi's cabin, the clock
  tower's bell and pigeons, and more), birds on the roof, golden dust, a halo,
  a crown of light. At night you can see at a glance which subjects you have
  worked at: their windows are lit. A house that grew gets its own moment
  when you come back from a set.
- **A party after every set.** Finish a passage or three questions and every
  friend runs to the plaza to celebrate the one you helped.
- **Today's three.** Every day the three friends who miss you most wear a
  "!". Help all three and today's gift opens: 10 bonus Glow.
- **Toffee's fire.** Your days in a row. Seven in a row saves a spare log
  that covers one missed day, and adds a little Glow on a day that earned.

## The first minutes

The village opens at the campfire. Toffee says hello, then everyone
introduces themselves, and each one is their subject: Chai has read every
book in the village twice (Reading), Ginger sorts socks by colour and then
by mood (Para Jumbles), Mochi keeps it short (Para Summary), Sesame finishes
your sentences (Para Completion), Mallow spots the sheep among the clouds
(Odd One Out), Matcha collects words (Vocabulary).
Then Chai waves from the library and the big button at the bottom glows:
**Help Chai · Read a passage · 5 min**. One tap and you are reading a real
CAT passage against the clock.

When you finish, the result screen counts up your Glow ("You helped
Chai!"), Chai thanks you, and the level bar fills. Back in the village
every friend runs to the plaza for a party round Chai, and if Chai grew a
stage you see the new look and the new name. Then the next friend's "!" is
waiting.

## The village

**One painting** (`assets/art/home-world-v1.png`, 1536 × 1024) fills the
screen at full detail and never zooms: on a phone it fills the height and
you scroll left and right (drag, wheel or arrow keys) to see the rest.
Every house carries a sign with its subject, always visible; tap the sign or
the house to go in.

**On top of it, only this:**
- the top bar: Toffee's fire, the village level and its stars, **every
  subject** (one list, each a tap from its next round) and the settings gear
  (sound, your village's name, progress, records);
- the bottom: today's three friends and their gift, and the big button.

**The friends live there.** Each one walks the painted paths on its own two
feet with its own gait (Chai waddles, Mochi plods, Ginger trots, Sesame
scurries, Matcha bounces, Toffee hops, Mallow floats), does chores round its home with a prop
in hand, visits its best friend, chats on the plaza, waves when you arrive,
and goes home to sleep at night. Every line comes with a little voice. Tap a
friend for their card: what they need, what they noticed about your answers,
the big Help button, everything you can do with them, and their story.

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
- Results show the friend celebrating, "You helped Chai!" with the stars
  counted up, the level bar, any new stage and its story line, and today's three.
- Progress and Settings sit behind the gear and in the bottom bar; the rose
  cottage is Ginger's second subject house. Records are kept by Toffee.
- After a passage, **Explain this passage simply** opens the passage told
  the way you would tell a ten-year-old (the big idea, the story, one line
  per paragraph, what the writer thinks), with the full expert breakdown
  folded underneath. It is the extra a rewarded ad will one day open
  (`src/core/ads/rewarded.js`); no ads are wired, so it is free.

## What the game knows about you

Every answer anywhere feeds one ledger of the seventeen abilities CAT's
verbal section tests. Each pet's card offers the curator's next activity
for that subject.

A question you missed **rests** before it comes back: twenty minutes, then a
day, then three days, then most of a week.

About 124 finite **collections** are always there for anyone who wants to
finish something: a grove of roots, a letter of the word lists, a stage of
passages.

