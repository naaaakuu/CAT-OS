/**
 * visits.js — what happens when one friend calls on another.
 *
 * Pure data, no DOM. src/home/life.js plays it: the guest `g` walks to the
 * node beside the host's home (paths.js HOMES[].side), they talk in turn, and
 * the guest goes home. Each scene is a small daily-life story in the two
 * friends' own voices (the one trait each is known for, pets.js `tag`).
 *
 * A beat is [who, text, chore?]:
 *   who    'g' (the guest) or 'h' (the host) says `text`
 *   chore  a chore of the speaker's own (life.js CHORES kind) done while it
 *          speaks: pours tea, reads, hammers, kneads, rains, dances
 * or the word 'go': the pair walk together to the guest's home (the host
 * follows, and walks back alone at the end), for a favour that has to be done
 * there.
 *
 * Copy rules are pets.js's (tools/check-pets.mjs enforces them): at most 96
 * characters, no em dashes, none of the banned words, no line said twice.
 * A bubble holds about 230 px, so keep each line to a breath.
 */

const freeze = Object.freeze;

export const VISITS = freeze([
  // Tries every seat: Biscuit tests the library's chairs; Chai has tested them all.
  freeze({ id: 'biscuit-chai', g: 'biscuit', h: 'chai', beats: [
    ['g', 'Mrrp! Chai, which of your chairs fits a cat best?'],
    ['h', 'The one by the lamp. I have tested them all. Twice.', 'read'],
    ['g', 'Twice? Then I shall test them a third time. For science.'],
    ['h', 'Gently. The green one is keeping my place in a book.'],
    ['g', 'Mrrp. Found it. Warm, round, smells of paper. If it fits, I sits.', 'knead'],
    ['h', 'Shh, now. I will read you the good part.'],
  ] }),
  // A favour: Ginger needs something heavy and calm to hold a map down. A pebble is exactly that.
  freeze({ id: 'ginger-mochi', g: 'ginger', h: 'mochi', beats: [
    ['g', 'Mochi! My map keeps blowing off the bench. I need something heavy and calm.'],
    ['h', 'Me.', 'tea'],
    ['g', 'You? Oh, you are perfect. Come on, before the wind turns!'],
    'go',
    ['h', 'Held.'],
    ['g', 'Not one corner lifts! Now I can pin it flat. Thank you, Mochi!', 'hammer'],
    ['h', 'Pebbles stay put. It is the whole job.'],
  ] }),
  // A favour: the greenhouse is cold, and the fire spirit keeps it warm all winter.
  freeze({ id: 'matcha-toffee', g: 'matcha', h: 'toffee', beats: [
    ['g', 'Toffee! My sprouts are shivering. Could you come and warm the greenhouse?'],
    ['h', 'Crackle! On my way! I have not missed a day yet. Not ONE!', 'dance'],
    'go',
    ['h', 'Warm enough? I can do toasty. I can do very, very toasty.', 'dance'],
    ['g', 'Toasty is perfect! Gerald has stopped complaining.', 'water'],
    ['h', 'Gerald always complains. Back to my fire, I have a streak to keep!'],
  ] }),
  freeze({ id: 'toffee-matcha', g: 'toffee', h: 'matcha', beats: [
    ['g', 'Matcha! Race you to the pond! Ready, set...'],
    ['h', 'Sprouts first, race after. And stand back a little, Toffee.', 'water'],
    ['g', 'Standing back! Very far back! ...Crackle.'],
    ['h', "Today's tip: incandescent. It means glowing. It means you!"],
    ['g', 'Incandescent! Best word ever. I counted my sparks: twelve!', 'dance'],
  ] }),
  // Reading buddies: the long book, and its point.
  freeze({ id: 'chai-mochi', g: 'chai', h: 'mochi', beats: [
    ['g', 'Mochi, I finished the long one. Four hundred pages. The gist?'],
    ['h', 'Hm.', 'tea'],
    ['g', 'Hm? There was a dragon, a storm and a very sad pie.'],
    ['h', 'Dragon, storm, pie. Friends. Happy ending.'],
    ['g', 'That is the whole book. I will read it twice anyway.', 'read'],
  ] }),
  freeze({ id: 'mochi-chai', g: 'mochi', h: 'chai', beats: [
    ['g', 'Chai. Tea.'],
    ['h', 'Hoo! Mochi! Come in. I am at the good part. Shh.', 'read'],
    ['g', 'Good part. The point?', 'tea'],
    ['h', 'The butler did it. Then he apologised. Then, tea.'],
    ['g', 'Acceptable.'],
  ] }),
  // Neighbours down the hill: Mochi says it short, Sesame keeps the clock.
  freeze({ id: 'mochi-sesame', g: 'mochi', h: 'sesame', beats: [
    ['g', 'Time?'],
    ['h', 'Nearly snack time! I wound the clock forty times. Squeak!', 'wind'],
    ['g', 'Forty turns. For one tick.'],
    ['h', 'It is a very big tick. It deserves forty turns!'],
    ['g', 'Fair.'],
  ] }),
  freeze({ id: 'sesame-mochi', g: 'sesame', h: 'mochi', beats: [
    ['g', 'Mochi! I brought crumbs. You were about to say thank...'],
    ['h', 'Thank...'],
    ['g', '...you! Finished it. That is my favourite bit.'],
    ['h', 'Rude. Also correct. Tea?', 'tea'],
    ['g', 'Yes please! Then I will finish your tea too.'],
  ] }),
  // Best friends: the map-maker and the one who spots what wanders off it.
  freeze({ id: 'ginger-mallow', g: 'ginger', h: 'mallow', beats: [
    ['g', 'Mallow! Fresh map, fresh ink. Does anything wander off it?'],
    ['h', 'Shh. The sky is thinking... There. A tiny star in the north corner.'],
    ['g', 'That is an ink blot! ...A blot that twinkles. Oh. Fixed it!'],
    ['h', 'Odd ones are my favourite. Like the sock on your third shelf.'],
    ['g', 'A sock?! Whose sock is that! Everything has a place, Mallow!'],
  ] }),
  freeze({ id: 'mallow-ginger', g: 'mallow', h: 'ginger', beats: [
    ['g', 'Ginger! One of your gears is not like the others.'],
    ['h', 'Impossible! They are sorted by size, then by mood.', 'hammer'],
    ['g', 'The one on the end. Round, a hole in the middle, sprinkles on top.'],
    ['h', '...That is a doughnut. My lunch. Everything is in order, even lunch.'],
    ['g', 'Then it belongs. I will add a few more sprinkles.', 'sprinkle'],
  ] }),
  // A favour the other way: a cloud is the best watering can there is.
  freeze({ id: 'mallow-matcha', g: 'mallow', h: 'matcha', beats: [
    ['g', 'Matcha! Your leaves look thirsty. May I drizzle?'],
    ['h', 'Yes please! Gently. Gerald is dramatic about drizzle.'],
    ['g', 'Just a little cloud. Count the drops with me.', 'rain'],
    ['h', 'One, two, shimmer, four! Drizzle is such a lovely word!', 'sing'],
    ['g', 'One of those drops is a sheep. I checked.'],
  ] }),
  // The cottage's own trouble: a chair has wandered off. Sesame finds what is missing.
  freeze({ id: 'sesame-biscuit', g: 'sesame', h: 'biscuit', beats: [
    ['g', 'Biscuit! There is a gap on your patio. One chair is missing.'],
    ['h', 'Mrrp. I tried every seat. Twice. One has wandered off.'],
    ['g', 'Look under the tea table. It is shy.'],
    ['h', 'Found it! It fits there and nowhere else. Purrrr.', 'knead'],
    ['g', 'A gap always has one thing that fits. Squeak!'],
  ] }),
  freeze({ id: 'biscuit-sesame', g: 'biscuit', h: 'sesame', beats: [
    ['g', 'Mrrp! Sesame, which step of your tower fits a cat?'],
    ['h', 'The third one! I saved that gap for you. Squeak!', 'wind'],
    ['g', 'You saved me a gap? Then I will sit in it until the clock strikes.'],
    ['h', 'It strikes in... three, two, one... cover your ears!'],
    ['g', 'Mrrp! Still fits.'],
  ] }),
  freeze({ id: 'matcha-chai', g: 'matcha', h: 'chai', beats: [
    ['g', 'Chai! Word of the day: susurrus. A soft whispering, like leaves!'],
    ['h', 'Page 212, beside a pressed fern. It was lovely, and quiet.', 'read'],
    ['g', 'Then say it with me! Susurrus!', 'sing'],
    ['h', 'Susurrus. ...Oh. That does sound like leaves.'],
  ] }),
  freeze({ id: 'toffee-chai', g: 'toffee', h: 'chai', beats: [
    ['g', 'Chai! Read me the parts with fire in them! Please please please!'],
    ['h', 'Hoo! Page nine, page thirty-one, page seventy-seven. And the cookbook.', 'read'],
    ['g', 'The COOKBOOK? Crackle! Fire is the main character!'],
    ['h', 'Of the soup, yes. Listen: "Bring to a gentle boil."'],
    ['g', 'Gentle? Never heard of it. ...Crackle. Gentle crackle.', 'dance'],
  ] }),
  freeze({ id: 'chai-biscuit', g: 'chai', h: 'biscuit', beats: [
    ['g', 'Biscuit! I brought a book for your patio. Is there room?'],
    ['h', 'Mrrp! Always. Take the cushion by the roses.', 'tea'],
    ['g', 'Lovely. Hoo, your teacup is right at the edge of the table.', 'read'],
    ['h', 'Was it? ...Not any more. Gravity helped.'],
    ['g', 'Hoo. I will read you the part about gravity.'],
  ] }),
  freeze({ id: 'biscuit-toffee', g: 'biscuit', h: 'toffee', beats: [
    ['g', 'Mrrp! Toffee, may I sit by your fire?'],
    ['h', 'Always! Warmest seat in the village! Crackle!', 'dance'],
    ['g', 'Warm, round, with a view. It fits.', 'knead'],
    ['h', 'Day two hundred and thirteen of the fire! Not one missed!'],
    ['g', 'Purrrr. Wake me on day two hundred and fourteen.'],
  ] }),
  freeze({ id: 'chai-mallow', g: 'chai', h: 'mallow', beats: [
    ['g', 'Mallow! I read about the stars. There are eighty-eight constellations.'],
    ['h', 'Eighty-seven. One of them is a lamb in disguise.'],
    ['g', 'A lamb! Then it is the odd one out. Hoo, I will write that down.', 'read'],
    ['h', 'Odd ones are the best ones. Sit. The sky is about to start.'],
  ] }),
]);

export const VISIT_BY_ID = new Map(VISITS.map((v) => [v.id, v]));
