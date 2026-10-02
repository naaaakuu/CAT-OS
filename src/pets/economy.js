/**
 * economy.js — the pets' economy, derived from records (spec §2).
 *
 * Every finished learning run is a VISIT to the pet who owns that subject.
 * Visits give the pet care (mood, decaying with a 36-hour half-life),
 * friendship (hearts) and gifts. Each pet needs the gift of the pet before
 * it in the ring, and works at double speed while that pet is happy — so a
 * neglected subject is felt by its neighbour, and through harmony by the
 * whole village. Three wishes a day; a day with all three done pays a bonus.
 * Treasures are the one thing stored: a `village-treasure` record per make.
 *
 * Nothing is stored back and nothing reads the clock: `now` is passed in.
 */

import { PETS, supplierOf, successorOf, petForModule, homeHref, GIFT_KEYS, PET_BY_ID, STORIES, LINES, lineFor, ringLine } from './pets.js';
import { rcStars, verbalStars } from '../world/economy.js';
import { dayKey, shiftDay } from '../core/engagement/streaks.js';

const HALF_LIFE = 36 * 3600e3;
const NEW_MOOD = 0.3;
const HEARTS = [0, 3, 8, 16, 28, 45];
const DUE_PRESSURE = 12;
const freeze = (o) => Object.freeze(o);
const every = (n) => Object.fromEntries(GIFT_KEYS.map((g) => [g, n]));

/** Spec §2.7, in the order they are made. */
export const TREASURES = freeze([
  { id: 'lanterns', name: 'Plaza lanterns', recipe: { leaves: 2, stories: 2 }, appears: 'Paper lanterns glow on the four plaza lamps at dusk and night.' },
  { id: 'bunting', name: 'Bunting', recipe: { notes: 3, maps: 3, leaves: 2 }, appears: 'Bunting garlands sway across the plaza.' },
  { id: 'flowers', name: 'Flower boxes', recipe: { leaves: 4, stories: 3, notes: 2 }, appears: 'Flowers bloom along the paths, with butterflies near them.' },
  { id: 'fireflies', name: 'Firefly jars', recipe: { stardust: 4, sparks: 3, maps: 2 }, appears: 'Jars by the benches, and many more fireflies at night.' },
  { id: 'swing', name: 'The plaza swing', recipe: { maps: 4, notes: 4, stories: 4, leaves: 3 }, appears: 'A swing under the plaza tree. The pets take turns.' },
  { id: 'chimes', name: 'Wind chimes', recipe: { stardust: 5, stories: 4, leaves: 4, notes: 3 }, appears: 'Chimes at the observatory that ring when tapped.' },
  { id: 'kite', name: 'A kite', recipe: every(5), appears: 'A kite with a long tail flies above the village by day.' },
  { id: 'lilylights', name: 'Lily-pad lights', recipe: every(7), appears: 'Floating lights on the pond at night.' },
  { id: 'skylanterns', name: 'Sky-lantern night', recipe: every(10), appears: 'On festival nights, lanterns rise from the plaza.' },
].map((t) => freeze({ ...t, recipe: freeze(t.recipe) })));

/* ------------------------------------------------------------------ */
/* Visits                                                              */
/* ------------------------------------------------------------------ */

const arr = (x) => (Array.isArray(x) ? x : []);
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const clampStars = (s) => Math.max(0, Math.min(3, Math.round(s)));
const BANKS = new Set(['sp', 'pc', 'wb', 'cr']);
const VERBAL = new Set(['pj', 'ps', 'ooo']);

/**
 * Every finished run as a visit, sorted by time (spec §2.1).
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
/* Care and mood (spec §2.2)                                          */
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
const dayNumber = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
/* Ties go to the gentlest door first: a new learner is sent to Chai, as Toffee's hello says, and the Gauntlet comes last. */
const NEED_ORDER = ['chai', 'matcha', 'mochi', 'ginger', 'mallow', 'toffee'];
const neediestOf = (moods) => PETS.map((p) => ({ id: p.id, i: NEED_ORDER.indexOf(p.id), mood: moods[p.id] })).sort((a, b) => a.mood - b.mood || a.i - b.i);

/** The three wishes of one day, from the moods at its local midnight (spec §2.6). */
function wishesFor(key, moods, fading, dayVisits) {
  const [a, b] = neediestOf(moods);
  const visited = new Set(dayVisits.map((v) => v.pet));
  const w = (id, pet, text, done) => ({ id, pet, text, done, href: homeHref(pet) });
  const nameOf = (id) => PET_BY_ID.get(id).name;
  const third = [
    w('stars', a.id, 'Earn three stars in one run', dayVisits.some((v) => v.stars >= 3)),
    w('friends', a.id, 'Visit three different friends', visited.size >= 3),
    w('flawless', a.id, 'Have one flawless run', dayVisits.some((v) => v.flawless)),
  ][((dayNumber(key) % 3) + 3) % 3];
  return [
    w('tend', a.id, `Spend time with ${nameOf(a.id)}`, visited.has(a.id)),
    fading ? w('fading', 'matcha', 'Help Matcha with the fading words', visited.has('matcha'))
      : w('visit', b.id, `Visit ${nameOf(b.id)}`, visited.has(b.id)),
    third,
  ];
}

/**
 * Everything the village shows, derived (spec §2).
 * @param {object} state    the world state (deriveWorldState), or any partial of it
 * @param {object} records  { sessions, learning }
 * @param {object} content  the content registry (rc estimated times; pj/ps/ooo item times)
 * @param {number} now      ms; visits after it are not counted yet
 */
export function derivePets(state, records, content, now = Date.now()) {
  const all = visitsFrom(records, content).filter((v) => v.at <= now);
  const today = dayKey(now);
  const byPet = new Map(PETS.map((p) => [p.id, []]));
  for (const v of all) byPet.get(v.pet).push(v);
  const days = all.map((v) => dayKey(v.at));

  /* ---- Gifts per visit: doubled while the supplier was happy just before ---- */
  const earned = every(0);
  let last = null;
  for (const p of PETS) {
    const supplierCare = careWalker(byPet.get(supplierOf(p.id)), true);
    for (const v of byPet.get(p.id)) {
      const sm = moodOfCare(supplierCare(v.at));
      const doubled = sm !== null && sm >= 0.5;
      const gifts = (Math.max(1, Math.min(3, v.stars)) + (v.flawless ? 1 : 0)) * (doubled ? 2 : 1);
      earned[p.gift] += gifts;
      if (!last || v.at > last.at || (v.at === last.at && String(v.id) > String(last.id))) last = { pet: p.id, at: v.at, stars: v.stars, flawless: v.flawless, gifts, doubled };
    }
  }

  /* ---- Matcha's pressure: the fading words (spec §2.2) ---- */
  const matchaDue = (num(state?.meadow?.due) ?? 0) + (num(state?.pond?.due) ?? 0) + (num(state?.thicket?.due) ?? 0) + (num(state?.rootwood?.dueCount) ?? 0) * 3;
  const fading = matchaDue >= DUE_PRESSURE;

  /* ---- Moods now ---- */
  const moodNow = {};
  const careNow = {};
  for (const p of PETS) {
    const c = careWalker(byPet.get(p.id), false)(now);
    careNow[p.id] = c ?? 0;
    moodNow[p.id] = c === null ? NEW_MOOD : moodOfCare(c) * (p.id === 'matcha' && fading ? 0.85 : 1);
  }
  const isNew = (id) => byPet.get(id).length === 0;

  /* ---- Wishes: every active day re-evaluated, today shown ---- */
  const dayVisits = new Map();
  all.forEach((v, i) => { if (!dayVisits.has(days[i])) dayVisits.set(days[i], []); dayVisits.get(days[i]).push(v); });
  const keys = [...new Set([...dayVisits.keys(), today])].sort();
  const walkers = Object.fromEntries(PETS.map((p) => [p.id, careWalker(byPet.get(p.id), true)]));
  let bonus = 0, wishes = [];
  for (const key of keys) {
    const midnight = midnightOf(key);
    const moods = {};
    for (const p of PETS) {
      const c = walkers[p.id](midnight);
      moods[p.id] = c === null ? NEW_MOOD : moodOfCare(c) * (key === today && p.id === 'matcha' && fading ? 0.85 : 1);
    }
    const ws = wishesFor(key, moods, key === today && fading, dayVisits.get(key) ?? []);
    if (ws.every((x) => x.done)) bonus += 1;
    if (key === today) wishes = ws;
  }

  /* ---- Toffee's flame: simulated forward over the active days (spec §2.5) ---- */
  let run = 0, kindling = 0, prev = null;
  for (const d of [...dayVisits.keys()].sort()) {
    let base = run;
    if (prev && shiftDay(prev, 1) === d) run += 1;
    else if (prev && shiftDay(prev, 2) === d && kindling > 0) { kindling -= 1; run += 2; } // the missing day is bridged
    else { base = 0; run = 1; }
    if (Math.floor(run / 7) > Math.floor(base / 7)) kindling = Math.min(2, kindling + 1); // each 7th day of a run
    prev = d;
  }
  /* Counting back from today (or yesterday): one missing day is bridged with kindling. */
  let flameDays = 0;
  if (prev === today || prev === shiftDay(today, -1)) flameDays = run;
  else if (prev === shiftDay(today, -2) && kindling > 0) { kindling -= 1; flameDays = run + 1; }
  const flame = { days: flameDays, tier: flameTier(flameDays), kindling, alive: flameDays > 0, today: prev === today };

  /* ---- Treasures: made in order; a duplicate or an out-of-order record is ignored ---- */
  const tRecs = arr(records?.learning).filter((r) => r && r.kind === 'village-treasure' && typeof r.treasure === 'string')
    .map((r) => ({ r, t: Date.parse(r.at) }))
    .sort((a, b) => (Number.isFinite(a.t) ? a.t : Infinity) - (Number.isFinite(b.t) ? b.t : Infinity) || String(a.r.id).localeCompare(String(b.r.id)));
  const madeAt = new Map();
  for (const { r } of tRecs) {
    const next = TREASURES[madeAt.size];
    if (next && r.treasure === next.id) madeAt.set(next.id, r.at ?? null);
  }
  const spent = every(0);
  for (const t of TREASURES) if (madeAt.has(t.id)) for (const [g, n] of Object.entries(t.recipe)) spent[g] += n;
  const stock = {};
  for (const g of GIFT_KEYS) stock[g] = Math.max(0, earned[g] + bonus - spent[g]);
  const covers = (recipe) => Object.entries(recipe).every(([g, n]) => stock[g] >= n);
  const nextIdx = madeAt.size;
  const treasures = TREASURES.map((t, i) => ({
    id: t.id, name: t.name, recipe: t.recipe, appears: t.appears,
    made: madeAt.has(t.id), at: madeAt.get(t.id) ?? null,
    next: i === nextIdx, affordable: i === nextIdx && covers(t.recipe),
  }));

  /* ---- Each pet ---- */
  const pets = PETS.map((p) => {
    const list = byPet.get(p.id);
    const fresh = isNew(p.id);
    const mood = moodNow[p.id];
    const xp = list.reduce((n, v) => n + 1 + v.stars, 0);
    let hearts = 0;
    while (hearts < 5 && xp >= HEARTS[hearts + 1]) hearts += 1;
    const sup = supplierOf(p.id);
    const full = !isNew(sup) && moodNow[sup] >= 0.5;
    const word = moodWord(mood, fresh);
    return {
      id: p.id, name: p.name, mood, word, isNew: fresh, care: careNow[p.id],
      hearts, xp, toNext: hearts < 5 ? Math.ceil((HEARTS[hearts + 1] - xp) / 3) : 0,
      gift: p.gift, earned: earned[p.gift], gifts: earned[p.gift] + bonus,
      full, supplier: sup, successor: successorOf(p.id),
      lastAt: list.length ? list[list.length - 1].at : null, visits: list.length,
      story: hearts ? STORIES[p.id][hearts - 1] : null,
      line: p.id === 'matcha' && fading && !fresh ? lineFor(p.id, 'fading', today) : lineFor(p.id, word, today),
      ring: ringLine(p.id, full, today),
    };
  });

  const moods = pets.map((p) => p.mood);
  const harmony = 0.5 * (moods.reduce((a, b) => a + b, 0) / moods.length) + 0.5 * Math.min(...moods);
  const neediest = neediestOf(moodNow)[0].id;

  /* ---- The letter: the pet who missed you most (spec §2.8) ---- */
  const lastAt = all.length ? all[all.length - 1].at : 0;
  const awayDays = num(state?.awayDays) ?? (lastAt ? Math.floor((now - lastAt) / 86400000) : 0);
  const met = neediestOf(moodNow).filter((x) => !isNew(x.id));
  const letter = awayDays >= 1 && met.length ? { pet: met[0].id, text: LINES.letter[met[0].id] } : null;

  return {
    pets, harmony, festival: pets.every((p) => !p.isNew && p.mood >= 0.5), neediest,
    flame, wishes, wishesDone: wishes.filter((w) => w.done).length,
    stock, earnedTotal: GIFT_KEYS.reduce((n, g) => n + earned[g] + bonus, 0), bonus,
    treasures, nextTreasure: treasures[nextIdx] ?? null,
    letter, last, matchaDue, today,
  };
}

/** Can the learner make this treasure now? Only the next one, and only with the gifts in stock. */
export function canMake(pets, id) {
  const t = TREASURES.find((x) => x.id === id);
  if (!t || pets?.nextTreasure?.id !== id) return { ok: false, missing: {} };
  const missing = {};
  for (const [g, n] of Object.entries(t.recipe)) { const short = n - (pets.stock?.[g] ?? 0); if (short > 0) missing[g] = short; }
  return { ok: Object.keys(missing).length === 0, missing };
}

/** The gifts gathered between two derivations, for the result screens. */
export function giftsBetween(beforePets, afterPets) {
  const bag = every(0);
  for (const p of afterPets?.pets ?? []) {
    const b = beforePets?.pets?.find((x) => x.id === p.id);
    bag[p.gift] = Math.max(0, p.gifts - (b?.gifts ?? 0));
  }
  return bag;
}
