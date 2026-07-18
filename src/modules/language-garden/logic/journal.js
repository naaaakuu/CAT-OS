/**
 * journal.js — the Root Grove's small slice of LANGUAGE_GARDEN_BIBLE
 * §11's Journal. Pure logic, no DOM. Deliberately narrow for this first
 * vertical slice: "what you can read now" (every mature family framed
 * as a capability) and "wild sightings" (every Reach word actually
 * constructed). The Field Guide, decoding-speed trend, and monthly line
 * all need either wildlife content or months of history this slice
 * doesn't have yet — cut honestly rather than shipped empty.
 */

import { computePlantState } from '../../../core/engine/garden-session.js';
import { sessionsForFamily } from './store.js';
import { worldSeason, weatherFor, timeOfDay } from './atmosphere.js';

/** Families settled enough to read as a capability: Bible §16.6 — "In
 *  leaf" or better, a plant that has survived at least one real spaced
 *  retrieval, not merely been introduced. */
const MATURE_STAGES = new Set(['in_leaf', 'mature', 'ancient']);

/**
 * @returns {Array<{familyId, label, originLanguage, coreMeaning, words: string[]}>}
 *          newest-matured first
 */
export function whatYouCanReadNow(families, allSessions, now = Date.now()) {
  return families
    .map((family) => {
      const history = sessionsForFamily(allSessions, family.meta.id);
      const state = computePlantState(history, now);
      return { family, state };
    })
    .filter(({ state }) => MATURE_STAGES.has(state.stage))
    .sort((a, b) => (b.state.plantedAt ?? '').localeCompare(a.state.plantedAt ?? ''))
    .map(({ family }) => ({
      familyId: family.meta.id,
      label: family.root.label,
      originLanguage: family.root.origin_language,
      coreMeaning: family.root.core_meaning,
      words: family.members.filter((m) => !m.held_out).map((m) => m.word),
    }));
}

/**
 * Every Reach word actually constructed, correct or eventually correct
 * (the peak cannot be failed — Bible §5.5), newest first. One line
 * each: word, family, date.
 */
export function wildSightings(families, allSessions) {
  const byId = new Map(families.map((f) => [f.meta.id, f]));
  const sightings = [];
  for (const session of allSessions) {
    if (!session.reach) continue;
    const family = byId.get(session.family_id);
    if (!family) continue;
    const member = family.members.find((m) => m.vocab_id === session.reach.vocab_id);
    if (!member) continue;
    sightings.push({
      word: member.word,
      familyLabel: family.root.label,
      familyId: family.meta.id,
      date: session.finished_at,
    });
  }
  return sightings.sort((a, b) => b.date.localeCompare(a.date));
}

/* ------------------------------------------------------------------ */
/* Seasons Tended (Bible §8.5) — the only number the Garden shows       */
/* without being asked, and a calendar fact, not a score. It counts     */
/* the world-seasons in which the learner tended at least once, so it   */
/* is unfarmable by construction: it advances at the speed of the       */
/* planet, never by grinding. Winter spans the year boundary (a         */
/* December and the January/February that follow it are one winter),    */
/* so four tended seasons is exactly one full year in the garden.       */
/* ------------------------------------------------------------------ */

/** A stable key for one instance of a world-season, e.g. 'summer-2026'
 *  or 'winter-2027' (the winter that runs Dec 2026 → Feb 2027). */
function seasonInstanceKey(date) {
  const season = worldSeason(date);
  const year = date.getFullYear();
  if (season === 'winter') {
    // December belongs to the winter that closes the following year.
    return date.getMonth() === 11 ? `winter-${year + 1}` : `winter-${year}`;
  }
  return `${season}-${year}`;
}

/** @returns {number} distinct world-seasons in which any session landed. */
export function seasonsTended(allSessions) {
  const keys = new Set();
  for (const session of allSessions) {
    const date = new Date(session.finished_at);
    if (Number.isNaN(date.getTime())) continue;
    keys.add(seasonInstanceKey(date));
  }
  return keys.size;
}

/* ------------------------------------------------------------------ */
/* The Weather Record (Bible §8.6) — history without a grid. One mark   */
/* per day the learner tended, showing the weather over the valley the  */
/* day they came. Days not tended are simply not here: no slot, no gap, */
/* no empty box, nothing to feel bad about. Grouped by month so a long  */
/* record reads as a diary rather than an audit, newest month first.    */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = Object.freeze([
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]);

/** The single weather mark for a day, distinguishing a clear night from
 *  sun the way the Bible's own list does ("rain, sun, fog, snow, wind,
 *  clear night"). Behaviour never reaches this — the weather is a pure
 *  function of the calendar (§4.6), reconstructed from when they came. */
function markFor(date) {
  const weather = weatherFor(date);
  if (weather === 'clear') return timeOfDay(date) === 'night' ? 'clear-night' : 'sun';
  return weather; // rain | fog | wind | snow
}

/**
 * @returns {Array<{monthKey, monthLabel, days: Array<{dateISO, day, mark}>}>}
 *          months newest-first; days within a month in the order they
 *          happened. The first tending of a day wins — the sky as the
 *          learner arrived.
 */
export function weatherRecord(allSessions) {
  const dayFirst = new Map(); // dayKey -> earliest Date that day
  for (const session of allSessions) {
    const date = new Date(session.finished_at);
    if (Number.isNaN(date.getTime())) continue;
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const seen = dayFirst.get(dayKey);
    if (!seen || date.getTime() < seen.getTime()) dayFirst.set(dayKey, date);
  }

  const months = new Map(); // monthKey -> { monthKey, monthLabel, sortAt, days }
  for (const date of dayFirst.values()) {
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    let group = months.get(monthKey);
    if (!group) {
      group = {
        monthKey,
        monthLabel: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
        sortAt: new Date(date.getFullYear(), date.getMonth(), 1).getTime(),
        days: [],
      };
      months.set(monthKey, group);
    }
    group.days.push({ dateISO: date.toISOString(), day: date.getDate(), mark: markFor(date) });
  }

  const groups = [...months.values()];
  groups.sort((a, b) => b.sortAt - a.sortAt); // newest month first
  for (const group of groups) group.days.sort((a, b) => a.day - b.day);
  return groups.map(({ sortAt, ...rest }) => rest);
}
