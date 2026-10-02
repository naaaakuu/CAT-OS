/**
 * economy.js — the village's one loop, derived from records.
 *
 *   Help a friend (finish any round)  →  earn stars  →  the village grows.
 *
 * Every finished run is a VISIT to the friend who teaches that subject.
 * A visit earns 1 to 3 stars, plus 1 for a flawless run. Stars add up to
 * the village level, and each level puts something new on the map. Visits
 * also grow friendship (five hearts, each a chapter of the friend's story
 * and a gift for their home) and keep the friend happy (a mood that fades
 * with a 36-hour half-life, so a subject left alone is a friend missing you).
 *
 * Every day the village picks three friends who need you most. Help all
 * three and the day's gift pays 5 more stars. Toffee keeps the fire: the
 * days in a row you came, with a spare log for every seventh day that
 * covers one missed day.
 *
 * Nothing is stored back and nothing reads the clock: `now` is passed in.
 */

import { PETS, petForModule, PET_BY_ID, STORIES, lineFor, requestFor } from './pets.js';
import { rcStars, verbalStars } from '../world/economy.js';
import { dayKey, shiftDay } from '../core/engagement/streaks.js';

const HALF_LIFE = 36 * 3600e3;
const NEW_MOOD = 0.3;
const HEARTS = [0, 3, 8, 16, 28, 45];
export const DAILY_GIFT = 5;
const freeze = (o) => Object.freeze(o);

/** Stars needed for each village level; past the last, every level costs 36 more. */
export const LEVELS = freeze([0, 5, 12, 21, 33, 48, 66, 88, 114, 145]);

/** What each level puts on the map, in order (drawn by src/home/cards.js). */
export const DECOR = freeze([
  { id: 'lanterns', level: 2, name: 'Plaza lanterns', appears: 'Paper lanterns glow on the four plaza lamps.' },
  { id: 'bunting', level: 3, name: 'Bunting', appears: 'Bunting garlands sway across the plaza.' },
  { id: 'flowers', level: 4, name: 'Flower boxes', appears: 'Flowers bloom along the paths.' },
  { id: 'fireflies', level: 5, name: 'Firefly jars', appears: 'Jars by the benches, and fireflies at night.' },
  { id: 'swing', level: 6, name: 'The plaza swing', appears: 'A swing under the plaza tree. Everyone takes turns.' },
  { id: 'chimes', level: 7, name: 'Wind chimes', appears: 'Chimes ring at the observatory.' },
  { id: 'kite', level: 8, name: 'A kite', appears: 'A kite with a long tail flies over the village.' },
  { id: 'lilylights', level: 9, name: 'Lily-pad lights', appears: 'Floating lights on the pond at night.' },
  { id: 'skylanterns', level: 10, name: 'Sky lanterns', appears: 'Lanterns rise from the plaza on happy nights.' },
].map(freeze));

/** The level a star total reaches, and how far into the next. */
export function levelOf(stars) {
  const s = Math.max(0, Math.floor(Number(stars) || 0));
  let level = 1;
  while (level < LEVELS.length && s >= LEVELS[level]) level += 1;
  let from = LEVELS[level - 1], to = LEVELS[level];
  if (level >= LEVELS.length) {
    const top = LEVELS[LEVELS.length - 1];
    level = LEVELS.length + Math.floor((s - top) / 36);
    from = top + (level - LEVELS.length) * 36; to = from + 36;
  }
  return { level, from, to, into: s - from, need: to - s, pct: (s - from) / (to - from) };
}

/* ------------------------------------------------------------------ */
/* Visits                                                              */
/* ------------------------------------------------------------------ */

const arr = (x) => (Array.isArray(x) ? x : []);
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const clampStars = (s) => Math.max(0, Math.min(3, Math.round(s)));
const BANKS = new Set(['sp', 'pc', 'wb', 'cr']);
const VERBAL = new Set(['pj', 'ps', 'ooo']);

/** What one run earns: at least a star for finishing, a bonus for flawless. */
export const starsFor = (v) => Math.max(1, Math.min(3, v.stars)) + (v.flawless ? 1 : 0);

/**
 * Every finished run as a visit, sorted by time.
 * @returns {Array<{pet, at, stars, flawless, correct, id}>}
 */
export function visitsFrom(records, content) {
  const rcById = new Map(arr(content?.rc).map((i) => [i?.id, i]));
  const estSec = new Map([...arr(content?.pj), ...arr(content?.ps), ...arr(content?.ooo)].map((i) => [i?.id, i?.estimated_time_sec]));
  const out = [];
  const push = (x, mod, at, stars, flawless) => {
    const pet = petForModule(mod);
    if (pet && Number.isFinite(at) && Number.isFinite(stars)) {
      out.push({ pet, at, stars: clampStars(stars), flawless: flawless === true, correct: Math.max(0, num(x.score?.correct) ?? 0), id: x.id ?? null });
    }
  };
  for (const x of arr(records?.sessions)) {
    if (!x || typeof x !== 'object') continue;
    const at = Date.parse(x.finished_at);
    if (!Number.isFinite(at)) continue;
    const mod = x.module;
    if (!mod) {
      const item = rcById.get(x.passage_id);
      if (!item) continue;
      const r = rcStars(x, item.estimated_time_min, x.night_reading ? 0.8 : 1);
      push(x, 'rc', at, r.stars, r.flawless);
    } else if (mod === 'rc2') {
      const acc = num(x.score?.total) ? (num(x.score?.correct) ?? 0) / x.score.total : 0;
      push(x, mod, at, (acc >= 0.5 ? 1 : 0) + (acc >= 0.75 ? 1 : 0), false);
    } else if (mod === 'wd') {
      const c = num(x.score?.correct) ?? 0;
      push(x, mod, at, c > 0 ? Math.min(3, 1 + c) : 0, false);
    } else if (VERBAL.has(mod) || BANKS.has(mod)) {
      const ids = Array.isArray(x.item_ids) ? x.item_ids : arr(x.answers).filter((a) => a && typeof a === 'object').map((a) => a.item_id ?? a.question_id);
      const target = num(x.target_sec)
        ?? (ids.length ? ids.reduce((n, id) => n + (num(estSec.get(id)) ?? 90), 0) : 90 * (num(x.score?.total) || 1));
      const r = verbalStars(x, target);
      push(x, mod, at, r.stars, r.flawless);
    }
  }
  for (const r of arr(records?.learning)) {
    if (!r || typeof r !== 'object') continue;
    const at = Date.parse(r.finished_at);
    if (r.kind === 'lex-round') push(r, 'lex', at, num(r.stars), r.flawless);
    else if (r.kind === 'gauntlet-run') push(r, 'gauntlet', at, num(r.stars), r.flawless);
    else if (r.kind === 'garden-session') push(r, 'garden', at, r.clean === true ? 2 : 1, false);
  }
  return out.sort((a, b) => a.at - b.at || String(a.id).localeCompare(String(b.id)));
}

/* ------------------------------------------------------------------ */
/* Care and mood                                                       */
/* ------------------------------------------------------------------ */

const weight = (v) => 0.4 + 0.2 * v.stars;
const decay = (dt) => 0.5 ** (dt / HALF_LIFE);
const moodOfCare = (care) => (care === null ? null : 1 - Math.exp(-1.2 * care));

/** Care at a rising sequence of times over one pet's sorted visits, in O(visits)
 *  overall: a running sum decayed forward, never a rescan. Call with t
 *  non-decreasing; `strict` counts only visits before t. */
function careWalker(list, strict) {
  let i = 0, care = 0, last = 0, any = false;
  return (t) => {
    while (i < list.length && (strict ? list[i].at < t : list[i].at <= t)) {
      care = (any ? care * decay(list[i].at - last) : 0) + weight(list[i]);
      last = list[i].at; any = true; i += 1;
    }
    return any ? care * decay(t - last) : null;
  };
}

/** A pet's mood at time t (visits at or before t), or null if it has none. */
export function moodAt(visits, petId, t) {
  return moodOfCare(careWalker(arr(visits).filter((v) => v.pet === petId), false)(t));
}

export function moodWord(mood, isNew = false) {
  if (isNew) return 'new';
  return mood >= 0.75 ? 'glowing' : mood >= 0.5 ? 'happy' : mood >= 0.3 ? 'missing' : mood >= 0.12 ? 'sleepy' : 'wilting';
}

export function flameTier(days) {
  return days >= 14 ? 'bonfire' : days >= 7 ? 'tall' : days >= 3 ? 'steady' : days >= 1 ? 'small' : 'embers';
}

/* ------------------------------------------------------------------ */
/* The derivation                                                      */
/* ------------------------------------------------------------------ */

const midnightOf = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
/* Ties go to the gentlest door first: a new learner is sent to Chai, as Toffee's hello says. */
const NEED_ORDER = ['chai', 'matcha', 'mochi', 'ginger', 'mallow'];
const neediest = (moods) => NEED_ORDER.map((id, i) => ({ id, i, mood: moods[id] })).sort((a, b) => a.mood - b.mood || a.i - b.i);

/**
 * Everything the village shows, derived.
 * @param {object} state    the world state (deriveWorldState), or any partial of it
 * @param {object} records  { sessions, learning }
 * @param {object} content  the content registry (rc estimated times; pj/ps/ooo item times)
 * @param {number} now      ms; visits after it are not counted yet
 */
export function derivePets(state, records, content, now = Date.now()) {
  const runs = visitsFrom(records, content).filter((v) => v.at <= now);
  const today = dayKey(now);

  /* Toffee is the fire: the first run of every day is a visit to Toffee too. */
  const firstOfDay = new Map();
  for (const v of runs) { const k = dayKey(v.at); if (!firstOfDay.has(k)) firstOfDay.set(k, v); }
  const byPet = new Map(PETS.map((p) => [p.id, []]));
  for (const v of runs) byPet.get(v.pet).push(v);
  for (const v of firstOfDay.values()) if (v.pet !== 'toffee') byPet.get('toffee').push({ ...v, pet: 'toffee', daily: true });
  byPet.get('toffee').sort((a, b) => a.at - b.at);

  /* ---- Moods now ---- */
  const moodNow = {};
  for (const p of PETS) {
    const c = careWalker(byPet.get(p.id), false)(now);
    moodNow[p.id] = c === null ? NEW_MOOD : moodOfCare(c);
  }
  const isNew = (id) => byPet.get(id).length === 0;

  /* ---- Today's three friends, re-evaluated for every active day ---- */
  const dayRuns = new Map();
  for (const v of runs) { const k = dayKey(v.at); if (!dayRuns.has(k)) dayRuns.set(k, []); dayRuns.get(k).push(v); }
  const keys = [...new Set([...dayRuns.keys(), today])].sort();
  const walkers = Object.fromEntries(NEED_ORDER.map((id) => [id, careWalker(byPet.get(id), true)]));
  let gifts = 0, picks = [], helped = [];
  for (const key of keys) {
    const midnight = midnightOf(key);
    const moods = {};
    for (const id of NEED_ORDER) { const c = walkers[id](midnight); moods[id] = c === null ? NEW_MOOD : moodOfCare(c); }
    const p3 = neediest(moods).slice(0, 3).map((x) => x.id);
    const seen = [...new Set((dayRuns.get(key) ?? []).map((v) => v.pet))];
    if (p3.every((id) => seen.includes(id))) gifts += 1;
    if (key === today) { picks = p3; helped = seen; }
  }
  const done = picks.map((id) => helped.includes(id));
  const doneCount = done.filter(Boolean).length;

  /* ---- Toffee's flame: simulated forward over the active days ---- */
  let run = 0, kindling = 0, prev = null;
  for (const d of [...dayRuns.keys()].sort()) {
    let base = run;
    if (prev && shiftDay(prev, 1) === d) run += 1;
    else if (prev && shiftDay(prev, 2) === d && kindling > 0) { kindling -= 1; run += 2; } // the missing day is bridged
    else { base = 0; run = 1; }
    if (Math.floor(run / 7) > Math.floor(base / 7)) kindling = Math.min(2, kindling + 1); // each 7th day of a run
    prev = d;
  }
  /* Counting back from today (or yesterday): one missing day is bridged by a spare log. */
  let flameDays = 0;
  if (prev === today || prev === shiftDay(today, -1)) flameDays = run;
  else if (prev === shiftDay(today, -2) && kindling > 0) { kindling -= 1; flameDays = run + 1; }
  const week = Array.from({ length: 7 }, (_, i) => { const k = shiftDay(today, i - 6); return { key: k, done: dayRuns.has(k) }; });
  const flame = { days: flameDays, tier: flameTier(flameDays), kindling, alive: flameDays > 0, today: prev === today, week };

  /* ---- Stars and the village level ---- */
  let earnedAll = 0, last = null;
  const earnedBy = Object.fromEntries(PETS.map((p) => [p.id, 0]));
  for (const v of runs) {
    const e = starsFor(v);
    earnedAll += e; earnedBy[v.pet] += e;
    if (!last || v.at > last.at || (v.at === last.at && String(v.id) > String(last.id))) last = { pet: v.pet, at: v.at, stars: v.stars, flawless: v.flawless, earned: e };
  }
  const stars = earnedAll + gifts * DAILY_GIFT;
  const level = levelOf(stars);
  const decor = DECOR.map((d) => ({ ...d, made: level.level >= d.level }));

  /* ---- Each friend ---- */
  const pets = PETS.map((p) => {
    const list = byPet.get(p.id);
    const fresh = isNew(p.id);
    const mood = moodNow[p.id];
    const xp = list.reduce((n, v) => n + 1 + (v.daily ? 1 : v.stars), 0);
    let hearts = 0;
    while (hearts < 5 && xp >= HEARTS[hearts + 1]) hearts += 1;
    const word = moodWord(mood, fresh);
    const real = list.filter((v) => !v.daily);
    return {
      id: p.id, name: p.name, mood, word, isNew: fresh,
      hearts, xp, toNext: hearts < 5 ? Math.max(1, Math.ceil((HEARTS[hearts + 1] - xp) / 3)) : 0,
      earned: earnedBy[p.id], visits: real.length,
      lastAt: list.length ? list[list.length - 1].at : null,
      story: hearts ? STORIES[p.id][hearts - 1] : null,
      line: lineFor(p.id, word, today),
      request: requestFor(p.id, p.id === 'toffee' ? Math.max(0, Math.min(4, flameDays - 1)) : hearts),
      pick: picks.includes(p.id), helpedToday: helped.includes(p.id),
    };
  });

  const moods = pets.map((p) => p.mood);
  const harmony = 0.5 * (moods.reduce((a, b) => a + b, 0) / moods.length) + 0.5 * Math.min(...moods);
  const needy = neediest(moodNow)[0].id;
  const play = picks.find((id, i) => !done[i]) ?? needy;

  /* ---- After a day or more away: the friend who missed you most comes to say hello ---- */
  const lastAt = runs.length ? runs[runs.length - 1].at : 0;
  const awayDays = num(state?.awayDays) ?? (lastAt ? Math.floor((now - lastAt) / 86400000) : 0);
  const met = neediest(moodNow).filter((x) => !isNew(x.id));
  const welcome = awayDays >= 1 && met.length ? { pet: met[0].id, days: awayDays } : null;

  return {
    pets, harmony, neediest: needy, play,
    stars, level, decor, nextDecor: decor.find((d) => !d.made) ?? null, gifts,
    flame, today: { key: today, picks, done, doneCount, gift: picks.length === 3 && doneCount === 3, helped },
    welcome, awayDays, last,
  };
}

/** What one run changed, for the result screens and the welcome home. */
export function changeBetween(before, after) {
  const pet = after?.last?.pet ?? null;
  const b = before?.pets?.find((p) => p.id === pet), a = after?.pets?.find((p) => p.id === pet);
  const madeBefore = new Set((before?.decor ?? []).filter((d) => d.made).map((d) => d.id));
  const gift = !!after?.today?.gift && !before?.today?.gift;
  // A run that was never saved leaves `last` where it was: then nothing was earned.
  const fresh = !!after?.last && !(before?.last && before.last.at === after.last.at && before.last.pet === after.last.pet);
  return {
    pet,
    // The run's own stars; the day's gift, if this run opened it, is said on its own line.
    earned: fresh ? after.last.earned : 0,
    heart: !!(a && b && a.hearts > b.hearts), hearts: a?.hearts ?? 0,
    levelUp: (after?.level?.level ?? 1) > (before?.level?.level ?? 1), level: after?.level ?? levelOf(0),
    decor: (after?.decor ?? []).find((d) => d.made && !madeBefore.has(d.id)) ?? null,
    gift,
    doneCount: after?.today?.doneCount ?? 0,
  };
}

export { PET_BY_ID };
