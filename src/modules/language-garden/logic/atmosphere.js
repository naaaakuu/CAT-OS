/**
 * atmosphere.js — the sky over the valley: time of day, weather, and
 * the world season (LANGUAGE_GARDEN_BIBLE §4.5–§4.7, §12.5–§12.6,
 * Roadmap items 3.4 and 3.6). Pure logic, no DOM, no storage.
 *
 * Three hard rules from the Bible, enforced by construction:
 *
 *  - Time of day runs on the device clock, in the learner's real local
 *    time (§4.5). Five real states, and NIGHT IS NOT A DEGRADED STATE —
 *    it is the best-looking state of the Garden (§12.6).
 *
 *  - Weather is generated from a seed and the calendar, NEVER from the
 *    learner's behaviour (§4.6). Every function here takes only a Date.
 *    It has no mechanical effect on memory, growth, or scheduling —
 *    rain does not water the plants — and its events recur and are
 *    never scarce: the fog will come again.
 *
 *  - World season follows the real calendar and means nothing about
 *    memory (§4.7). It is ambient. A plant asking for review is never
 *    conveyed by hue alone (§12.7) — it catches light, which no
 *    world-season effect reproduces.
 */

/* ---------------- Time of day (§4.5) ---------------- */

/** The five real states of the valley's day. Order is the day's order. */
export const TIMES_OF_DAY = Object.freeze(['dawn', 'morning', 'afternoon', 'dusk', 'night']);

/** @returns {'dawn'|'morning'|'afternoon'|'dusk'|'night'} */
export function timeOfDay(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'night';
  if (h < 8) return 'dawn';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 20) return 'dusk';
  return 'night';
}

/* ---------------- World season (§4.7, §12.5) ---------------- */

export const SEASONS = Object.freeze(['spring', 'summer', 'autumn', 'winter']);

/** Calendar-driven, northern-hemisphere meteorological seasons. */
export function worldSeason(date = new Date()) {
  const m = date.getMonth(); // 0-based
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

/* ---------------- Weather (§4.6) ---------------- */

export const WEATHERS = Object.freeze(['clear', 'rain', 'fog', 'wind', 'snow']);

/** A small stable hash onto 0..1 — the "seed and the calendar" of §4.6.
 *  Deterministic so the weather an hour ago is the weather now: the
 *  valley does not flicker between visits, and two devices on the same
 *  day see the same sky. */
function hash01(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return (h % 10000) / 10000;
}

/** The day has three weather windows, so a morning visit and an 11:40pm
 *  visit can be different skies over the same place — "the same place,
 *  differently, tonight" — while one sitting never changes mid-visit. */
function weatherWindow(date) {
  const t = timeOfDay(date);
  if (t === 'dawn' || t === 'morning') return 'early';
  if (t === 'afternoon' || t === 'dusk') return 'late';
  return 'night';
}

/** Season-shaped odds. Mostly clear — weather is a recurring discovery,
 *  not a constant show (§4.6) — and snow belongs to winter alone. */
const WEATHER_ODDS = Object.freeze({
  spring: [['clear', 0.52], ['rain', 0.22], ['wind', 0.15], ['fog', 0.11]],
  summer: [['clear', 0.62], ['wind', 0.18], ['rain', 0.12], ['fog', 0.08]],
  autumn: [['clear', 0.48], ['fog', 0.20], ['wind', 0.18], ['rain', 0.14]],
  winter: [['clear', 0.50], ['snow', 0.22], ['fog', 0.18], ['wind', 0.10]],
});

/** @returns {'clear'|'rain'|'fog'|'wind'|'snow'} for this date's window —
 *  a function of the calendar only, never of anything the learner did. */
export function weatherFor(date = new Date()) {
  const key = `lg-weather:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}:${weatherWindow(date)}`;
  let roll = hash01(key);
  for (const [kind, odds] of WEATHER_ODDS[worldSeason(date)]) {
    if (roll < odds) return kind;
    roll -= odds;
  }
  return 'clear';
}

/** Everything a scene needs to dress itself, in one call. */
export function atmosphereFor(date = new Date()) {
  return { time: timeOfDay(date), season: worldSeason(date), weather: weatherFor(date) };
}
