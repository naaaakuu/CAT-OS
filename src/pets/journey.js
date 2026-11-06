/**
 * The Village Journal: permanent keepsakes, a shared story and a weekly outing.
 * All progress comes from paid learning records. No wallet, claim flags or
 * streaks are stored. A missed day never removes a keepsake or chapter.
 */
import { visitsFrom } from './economy.js';
import { dayKey } from '../core/engagement/streaks.js';

const FRIENDS = ['chai', 'matcha', 'mochi', 'ginger', 'mallow', 'sesame', 'biscuit'];
const NAMES = { chai: 'Chai', matcha: 'Matcha', mochi: 'Mochi', ginger: 'Ginger', mallow: 'Mallow', sesame: 'Sesame', biscuit: 'Biscuit', toffee: 'Toffee' };
const SUBJECTS = { chai: 'reading', matcha: 'vocabulary', mochi: 'summaries', ginger: 'jumbles', mallow: 'odd one out', sesame: 'completions', biscuit: 'placements' };
const count = (n) => typeof n === 'number' && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
const list = (v) => Array.isArray(v) ? v : [];
const CHAPTERS = [
  ['spark', 'A little light', 'One answer can start a whole village glowing.', 'First-light lantern', 'lantern', 4, 1, 1],
  ['paths', 'Paths between friends', 'A second doorway becomes part of your world.', 'Painted signpost', 'signpost', 24, 2, 2],
  ['garden', 'Something is growing', 'Small visits leave roots all over the village.', 'Pocket garden', 'leaf', 60, 3, 3],
  ['letters', 'Letters from home', 'The village has stories it can tell only with you.', 'Ribbon-tied letters', 'letter', 140, 4, 5],
  ['picnic', 'A table for everyone', 'There is a place for every friend at the table.', 'Picnic basket', 'basket', 280, 5, 7],
  ['music', 'The village finds its song', 'Different voices begin to sound like one song.', 'Little music box', 'music', 500, 6, 10],
  ['stars', 'A sky full of stories', 'Every doorway holds a story you helped bring back.', 'Constellation globe', 'star', 850, 7, 14],
  ['home', 'A place to come home to', 'You have made a bright little corner of the world.', 'Key to the village', 'key', 1400, 7, 21],
];
const GIFTS = {
  chai: [['Feather bookmark', 'A feather to keep your place in any story.', 'feather'], ['Pocket library', 'Chai saved a whole shelf of tiny books for you.', 'book'], ['Golden inkwell', 'For all the stories still waiting to be read.', 'ink']],
  matcha: [['First little sprout', 'A word that took root, tucked into a tiny pot.', 'leaf'], ['Glasshouse bouquet', 'A handful of words, all growing together.', 'flower'], ['Seed of wonder', 'Matcha says this seed will never stop surprising you.', 'seed']],
  mochi: [['Folded paper boat', 'One small thought, ready to sail.', 'boat'], ['Tiny terrarium', 'A little world with room for one perfect idea.', 'garden'], ['Crystal compass', 'It always points back to the heart of a paragraph.', 'compass']],
  ginger: [['Copper cog', 'One piece that helped everything fit.', 'gear'], ['Ribbon kite', 'Ginger put every ribbon in exactly the right order.', 'kite'], ['Clockwork fox', 'A tiny companion built one sentence at a time.', 'fox']],
  mallow: [['Pocket star', 'A small light from a very big sky.', 'star'], ['Moon telescope', 'For the things you notice when you look again.', 'telescope'], ['Cloud in a bottle', 'Mallow insists it is a particularly interesting cloud.', 'cloud']],
  sesame: [['Brass bell', 'The clock tower has found its voice again.', 'bell'], ['Little hourglass', 'There is always time for one more good thought.', 'hourglass'], ['Midnight clock', 'Every missing piece has somewhere to belong.', 'clock']],
  biscuit: [['Rose button', 'A little rose from the cottage garden.', 'flower'], ['Velvet cushion', 'Biscuit tried every seat before choosing this one.', 'cushion'], ['Rosewood chair', 'A seat in the village, saved just for you.', 'chair']],
  toffee: [['Ember in a jar', 'Three days of learning, kept warm for later.', 'lantern'], ['Campfire mug', 'For the conversations that bring you back.', 'mug'], ['Everlight lantern', 'A light made from forty-five days of learning.', 'lantern']],
};

function goal(id, label, value, target, pet = null) {
  const have = Math.min(target, count(value));
  return { id, label, have, goal: target, pct: have / target, done: have >= target, pet };
}
const progress = (goals) => goals.reduce((n, g) => n + g.pct, 0) / goals.length;

/** Local calendar weeks start on Monday, including across DST changes. */
function weekOf(time) {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  const start = date.getTime();
  const key = dayKey(start);
  date.setDate(date.getDate() + 7);
  // A UTC calendar index is stable across local daylight-saving transitions.
  const [year, month, day] = key.split('-').map(Number);
  const index = Math.floor(Date.UTC(year, month - 1, day) / 604800000);
  return { key, start, end: date.getTime(), pet: FRIENDS[((index % FRIENDS.length) + FRIENDS.length) % FRIENDS.length] };
}

function weeklyFor(visits, now) {
  const week = weekOf(now);
  const paid = visits.filter((v) => v.at >= week.start && v.at < week.end && v.at <= now && count(v.glow?.total) > 0);
  const earned = paid.reduce((n, v) => n + count(v.glow.total), 0);
  const friendGlow = paid.filter((v) => v.pet === week.pet).reduce((n, v) => n + count(v.glow.total), 0);
  const days = new Set(paid.map((v) => dayKey(v.at))).size;
  const goals = [
    goal('glow', 'Earn 60 Glow from practice', earned, 60),
    goal('friend', `Earn 12 Glow with ${NAMES[week.pet]}`, friendGlow, 12, week.pet),
    goal('days', 'Learn on 3 different days', days, 3),
  ];
  const doneCount = goals.filter((g) => g.done).length;
  return {
    id: week.key, title: `${NAMES[week.pet]}'s weekly outing`,
    line: `A little ${SUBJECTS[week.pet]}, a little exploring. Your days do not need to be in a row.`,
    startsAt: week.start, endsAt: week.end, pet: week.pet, goals,
    doneCount, done: doneCount === goals.length, pct: progress(goals),
  };
}

/**
 * @param {object} P derivePets(...) result
 * @param {object} world {records, content}; used only for the weekly outing
 * @param {number} now current instant, passed by the caller for reproducibility
 */
export function deriveJourney(P = {}, world = {}, now = Date.now()) {
  const pets = new Map(list(P?.pets).filter((p) => p && typeof p.id === 'string').map((p) => [p.id, p]));
  const practice = count(P?.sources?.practice);
  const days = count(pets.get('toffee')?.done);
  const subjects = FRIENDS.filter((id) => count(pets.get(id)?.earned) > 0).length;
  let foundCurrent = false;
  const chapters = CHAPTERS.map(([id, title, line, name, icon, glow, friends, learningDays], i) => {
    const goals = [
      goal('practice', `Earn ${glow} Glow from practice`, practice, glow),
      goal('friends', `Earn Glow with ${friends} ${friends === 1 ? 'friend' : 'friends'}`, subjects, friends),
      goal('days', `Learn on ${learningDays} ${learningDays === 1 ? 'day' : 'different days'}`, days, learningDays),
    ];
    const done = goals.every((g) => g.done);
    const active = !done && !foundCurrent;
    if (active) foundCurrent = true;
    return { id, number: i + 1, title, line, reward: { id: `chapter-${id}`, name, icon }, goals, pct: progress(goals), done, active };
  });
  const keepsakes = Object.entries(GIFTS).flatMap(([pet, gifts]) => gifts.map(([name, line, icon], i) => {
    const target = (pet === 'toffee' ? [3, 14, 45] : [12, 60, 180])[i];
    const value = pet === 'toffee' ? days : count(pets.get(pet)?.earned);
    const have = Math.min(target, value);
    return {
      id: `${pet}-${i + 1}`, pet, name, line, icon, tier: i + 1, have, goal: target, pct: have / target, earned: have >= target,
      requirement: pet === 'toffee' ? `Learn on ${target} different days` : `Earn ${target} Glow with ${NAMES[pet]}`,
    };
  }));
  keepsakes.push(...chapters.map((c) => ({
    ...c.reward, pet: null, line: c.line, tier: c.number, have: c.goals.filter((g) => g.done).length,
    goal: c.goals.length, pct: c.pct, earned: c.done, requirement: `Complete chapter ${c.number}: ${c.title}`,
  })));
  const nextKeepsake = keepsakes.filter((k) => !k.earned).sort((a, b) => b.pct - a.pct)[0] ?? null;
  const current = chapters.find((c) => c.active) ?? null;
  const focusPet = current?.goals.find((g) => g.id === 'friends' && !g.done)
    ? FRIENDS.find((id) => count(pets.get(id)?.earned) === 0)
    : nextKeepsake?.pet && nextKeepsake.pet !== 'toffee' ? nextKeepsake.pet : P?.play;
  const instant = Number.isFinite(now) ? now : 0;
  const weekly = weeklyFor(visitsFrom(world?.records, world?.content), instant);
  return {
    chapters, current, completedChapters: chapters.filter((c) => c.done).length,
    keepsakes, earnedCount: keepsakes.filter((k) => k.earned).length, totalCount: keepsakes.length,
    nextKeepsake, focusPet: FRIENDS.includes(focusPet) ? focusPet : 'chai', weekly,
  };
}

/** Only newly earned gifts; saved records remain the source of truth. */
export function newKeepsakes(before, after) {
  const owned = new Set(list(before?.keepsakes).filter((k) => k.earned).map((k) => k.id));
  return list(after?.keepsakes).filter((k) => k.earned && !owned.has(k.id));
}
