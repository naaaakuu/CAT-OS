/**
 * economy.js — the rules of progression. Pure functions, no DOM, no
 * storage: stars, Ink, building levels, upgrades, quests, titles.
 *
 * Every mechanic here answers one question — does it make the learner
 * better at CAT while making the world more compelling? — so:
 *   STARS  are performance, per item: accuracy first, then pace. They are
 *          the honest signal of CAT readiness (right, and in time).
 *   INK    is the one resource. It is earned only by finishing real
 *          practice, weighted by stars, and spent only on the world.
 *   LEVELS of buildings are derived from mastery, never bought.
 *   QUESTS are three small daily aims that pull the learner across
 *          places, seeded by the date, never a guilt trip.
 *
 * Nothing here is stored; the world derives all of it from records.
 */

/* ------------------------------------------------------------------ */
/* Stars                                                               */
/* ------------------------------------------------------------------ */

/**
 * Stars for a Reading Comprehension session.
 *   0  fewer than half right — the passage was not understood
 *   1  at least half right — completed with meaningful mistakes
 *   2  three quarters right, but over the passage's target time
 *   3  three quarters right, within time — CAT pace and CAT accuracy
 * A 100% within time also sets `flawless`.
 * @param {object} session   stored session record (score, duration_ms)
 * @param {number} targetMin the passage's estimated_time_min
 * @param {number} [paceFactor] 1 by default; the Observatory's Night Reading uses 0.8
 */
export function rcStars(session, targetMin, paceFactor = 1) {
  const acc = session.score?.total ? session.score.correct / session.score.total : 0;
  const targetMs = Math.max(60_000, (targetMin ?? 6) * 60_000 * paceFactor);
  const inTime = (session.duration_ms ?? Infinity) <= targetMs * 1.1;
  let stars = 0;
  if (acc >= 0.75 && inTime) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && inTime, accuracy: acc, inTime, targetMs };
}

/** Stars for a verbal set (PJ / PS / OOO): accuracy across the set, pace
 *  against the sum of the items' estimated seconds. */
export function verbalStars(session, targetSec) {
  const acc = session.score?.attempted ? session.score.correct / session.score.total : 0;
  const targetMs = Math.max(45_000, (targetSec ?? 90) * 1000);
  const inTime = (session.duration_ms ?? Infinity) <= targetMs * 1.15;
  let stars = 0;
  if (acc >= 0.75 && inTime) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && inTime, accuracy: acc, inTime, targetMs };
}

/** Stars for a vocabulary round (Meadow / Pond / Thicket): accuracy, then
 *  average answer time against the round's target per item. */
export function roundStars({ correct, total, avgMs, targetMs = 7000 }) {
  const acc = total ? correct / total : 0;
  const fast = avgMs <= targetMs;
  let stars = 0;
  if (acc >= 0.9 && fast) stars = 3;
  else if (acc >= 0.75) stars = 2;
  else if (acc >= 0.5) stars = 1;
  return { stars, flawless: acc === 1 && fast, accuracy: acc, inTime: fast, targetMs };
}

export const STAR_WORDS = Object.freeze(['Not yet', 'Completed', 'Accurate', 'Excellent']);

/* ------------------------------------------------------------------ */
/* Ink                                                                 */
/* ------------------------------------------------------------------ */

export const INK = Object.freeze({
  rc: (stars) => 20 + 12 * stars,
  verbal: (stars, correct) => 10 + 4 * correct + 6 * stars,
  garden: (type, clean) => (type === 'grow' ? 14 : 10 + (clean ? 6 : 0)),
  round: (stars, correct) => 6 + 3 * stars + correct,
  wd: (stars) => 12 + 4 * stars,
  quest: 25,
  gauntlet: (stars) => 30 + 15 * stars,
});

/* ------------------------------------------------------------------ */
/* Upgrades: the world built with Ink                                   */
/* ------------------------------------------------------------------ */

export const UPGRADES = Object.freeze([
  { id: 'hearth-2', region: 'hearth', name: 'A chimney and a second window', cost: 80, line: 'The Hearth grows a chimney; smoke rises on every day you practise.', effect: { hearthLevel: 2 } },
  { id: 'hearth-3', region: 'hearth', name: 'Flower boxes', cost: 160, line: 'Boxes of flowers under both windows.', effect: { hearthLevel: 3 }, requires: 'hearth-2' },
  { id: 'hearth-4', region: 'hearth', name: 'A lantern by the door', cost: 260, line: 'The door is lit every dusk and night.', effect: { hearthLevel: 4 }, requires: 'hearth-3' },
  { id: 'hearth-5', region: 'hearth', name: 'Ivy and a weathervane', cost: 420, line: 'The cottage becomes the oldest house in the valley.', effect: { hearthLevel: 5 }, requires: 'hearth-4' },
  { id: 'pond-lanterns', region: 'pond', name: 'Lanterns on the pond bridge', cost: 150, line: 'The Mirror Pond glows after dark.', effect: { pondLanterns: true } },
  { id: 'observatory', region: 'reading-room', name: 'The Observatory', cost: 500, line: 'A dome on the Reading Room, and Night Reading: passages at a tighter pace for the flawless mark.', effect: { observatory: true } },
  { id: 'terrace-arbour', region: 'terraces', name: 'An arbour on the terraces', cost: 200, line: 'Vines climb a wooden arbour at the top of the hill.', effect: { terraceArbour: true } },
  { id: 'wilds-lanterns', region: 'wilds', name: 'Lanterns on the road out', cost: 220, line: 'The road beyond the valley is lit, and your Gauntlet records show their splits.', effect: { wildsLanterns: true } },
]);

export function upgradeById(id) { return UPGRADES.find((u) => u.id === id) ?? null; }

/** Which upgrades can be bought now: not built, prerequisites built. */
export function availableUpgrades(builtIds) {
  const built = new Set(builtIds);
  return UPGRADES.filter((u) => !built.has(u.id) && (!u.requires || built.has(u.requires)));
}

/* ------------------------------------------------------------------ */
/* Titles                                                              */
/* ------------------------------------------------------------------ */

const TITLES = [[1, 'Newcomer'], [2, 'Reader'], [4, 'Word-gatherer'], [6, 'Root-keeper'], [9, 'Editor'], [12, 'Scholar'], [16, 'Lexicographer'], [20, 'Sage of the Valley']];
export function titleFor(level) {
  let t = TITLES[0][1];
  for (const [lv, name] of TITLES) if (level >= lv) t = name;
  return t;
}

/* ------------------------------------------------------------------ */
/* Daily quests                                                        */
/* ------------------------------------------------------------------ */

/**
 * The quest pool. `progress(today)` reads a summary of today's activity
 * (see state.js `todaySummary`) and returns {done, goal}.
 */
export const QUEST_POOL = Object.freeze([
  { id: 'read-2', region: 'reading-room', title: 'Read one passage well', line: 'Finish a passage in the Reading Room with two stars or better.', progress: (d) => ({ done: Math.min(1, d.rcTwoStar), goal: 1 }) },
  { id: 'read-any', region: 'reading-room', title: 'Read a passage', line: 'Finish any passage in the Reading Room.', progress: (d) => ({ done: Math.min(1, d.rc), goal: 1 }) },
  { id: 'bloom-20', region: 'meadow', title: 'Bloom twenty words', line: 'Answer twenty Meadow words correctly.', progress: (d) => ({ done: Math.min(20, d.lexCorrect.meadow), goal: 20 }) },
  { id: 'bloom-round', region: 'meadow', title: 'Tend a field', line: 'Finish a Meadow round with two stars or better.', progress: (d) => ({ done: Math.min(1, d.roundTwoStar.meadow), goal: 1 }) },
  { id: 'roots-2', region: 'rootwood', title: 'Tend two root families', line: 'Grow or revisit two families in the Rootwood.', progress: (d) => ({ done: Math.min(2, d.garden), goal: 2 }) },
  { id: 'roots-1', region: 'rootwood', title: 'Walk into the wood', line: 'Grow or revisit one root family.', progress: (d) => ({ done: Math.min(1, d.garden), goal: 1 }) },
  { id: 'twins-10', region: 'pond', title: 'Tell ten twins apart', line: 'Answer ten confusable-word items correctly at the Mirror Pond.', progress: (d) => ({ done: Math.min(10, d.lexCorrect.pond), goal: 10 }) },
  { id: 'loan-8', region: 'thicket', title: 'Light the thicket', line: 'Answer eight loanwords correctly in the Thicket.', progress: (d) => ({ done: Math.min(8, d.lexCorrect.thicket), goal: 8 }) },
  { id: 'verbal-2', region: 'loom', title: 'Two verbal crafts', line: 'Solve two items at the Loom, the Table or the Bench.', progress: (d) => ({ done: Math.min(2, d.verbalCorrect), goal: 2 }) },
  { id: 'places-2', region: 'hearth', title: 'Two places in one day', line: 'Practise in two different places today.', progress: (d) => ({ done: Math.min(2, d.regions.size), goal: 2 }) },
  { id: 'three-stars', region: 'hearth', title: 'Three stars, anywhere', line: 'Earn a three-star result anywhere in the valley.', progress: (d) => ({ done: Math.min(1, d.threeStars), goal: 1 }) },
  { id: 'terrace-1', region: 'terraces', title: 'Climb a terrace', line: 'Complete one family on the Vine Terraces.', progress: (d) => ({ done: Math.min(1, d.wd), goal: 1 }) },
]);

/** Three quests for a date: one vocabulary, one reading/verbal, one roots
 *  or places — chosen deterministically from the date so they hold all day. */
export function questsForDate(dateKey) {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i += 1) { h ^= dateKey.charCodeAt(i); h = Math.imul(h, 16777619); }
  const next = () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const groups = [
    QUEST_POOL.filter((q) => ['meadow', 'pond', 'thicket'].includes(q.region)),
    QUEST_POOL.filter((q) => ['reading-room', 'loom'].includes(q.region)),
    QUEST_POOL.filter((q) => ['rootwood', 'hearth', 'terraces'].includes(q.region)),
  ];
  return groups.map((g) => g[Math.floor(next() * g.length)]);
}

/** Region building level from a count of cleared items, 0–4. */
export function levelFromCleared(cleared, perLevel = 4) { return Math.max(0, Math.min(4, Math.floor(cleared / perLevel))); }
