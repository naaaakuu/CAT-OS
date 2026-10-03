/**
 * state.js — the world, derived. One function turns the content registry
 * and every stored record into the state the map paints and the screens
 * read: each place's growth, the learner's stars and crafts, the works
 * standing in the valley, today's asks, and which place is quietly
 * asking for attention.
 *
 * Nothing here is stored back. Recomputing from the same records always
 * gives the same world, so the valley can never drift from the truth, and
 * every backup already contains it.
 */

import { STORES } from '../core/storage/storage-adapter.js';
import { listForBoot, listLGItems, listRCItems, listPJItems, listPSItems, listOOOItems, listWDItems, listBankItems } from '../core/content-loader/loader.js';
import { computePlantState } from '../core/engine/garden-session.js';
import { GROVES } from '../modules/language-garden/logic/groves.js';
import { deriveEngagement } from '../core/engagement/stats.js';
import { dayKey, shiftDay } from '../core/engagement/streaks.js';
import { computeStreamLevel } from '../modules/language-garden/logic/effort.js';
import { rcStars, verbalStars, titleFor, levelFromCleared } from './economy.js';
import { derivePets, changeBetween } from '../pets/economy.js';
import { listFields, ledgerFromRecords, summarizeLedger, fieldSummary } from './lexicon.js';
import { skillLedger, nextSkill, weakSkills } from '../core/learning/review.js';
import { hourWord, seasonWord, weatherWord } from './engine/palette.js';

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

let contentCache = null;

/**
 * Every registry the world needs, loaded once per app life (content is
 * static; the service worker keeps it offline).
 *
 * This is the whole of what stands between tapping the app and seeing the
 * valley, so it loads INDEX ROWS and nothing else. It used to open all
 * fifty-one root-family files — every member, every exercise, every
 * mentor note — to draw fifty-one trees and label them, which cost about
 * 1.7 seconds before a single pixel of the map could be painted. The
 * three fields it actually wanted (the root's label, language and
 * meaning) now live in the index; see tools/index-derived.mjs. The full
 * families are still loaded, by the Rootwood, when a walk begins.
 */
export async function loadWorldContent() {
  if (contentCache) return contentCache;
  /* A registry that FAILED and a registry that is EMPTY are not the same
     thing, and treating them the same is how one blocked request silently
     zeroed a learner's entire world: the village opened looking normal with
     no coins and an empty barn, the Reading House read 0/0, and Growth
     showed the brand-new-learner screen to somebody with eight sessions and
     fourteen stars. Worse, the result was memoised, so it stayed wrong for
     the rest of the session even after the network came back. */
  let failed = 0;
  const safe = (p) => p.catch(() => { failed += 1; return []; });
  const [lgRegistry, rc, pj, ps, ooo, wd, meadowFields, pondFields, thicketFields, sp, pc, wb, cr] = await Promise.all([
    safe(listForBoot('lg')), safe(listForBoot('rc')), safe(listForBoot('pj')), safe(listForBoot('ps')), safe(listForBoot('ooo')), safe(listForBoot('wd')),
    safe(listFields('meadow')), safe(listFields('pond')), safe(listFields('thicket')),
    safe(listForBoot('sp')), safe(listForBoot('pc')), safe(listForBoot('wb')), safe(listForBoot('cr')),
  ]);
  const families = [...lgRegistry]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((i) => ({
      meta: { id: i.id, garden: i.garden },
      root: { label: i.title, origin_language: i.root_origin ?? '', core_meaning: i.root_meaning ?? '' },
      members: { length: i.member_count ?? 0 },
    }));
  const content = { families, rc, pj, ps, ooo, wd, sp, pc, wb, cr, fields: { meadow: meadowFields, pond: pondFields, thicket: thicketFields }, partial: failed > 0 };
  // Only a COMPLETE read is worth remembering. A partial one is returned so
  // the screen can say so, and thrown away so the next navigation retries.
  if (!failed) contentCache = content;
  return content;
}

export async function loadWorldRecords(storage) {
  let sessions = [], learning = [];
  try { sessions = await storage.getAll(STORES.SESSIONS); } catch { /* empty world */ }
  try { learning = await storage.getAll(STORES.LEARNING); } catch { /* empty world */ }
  return { sessions, learning };
}

/** Everything a screen needs in one call. */
export async function loadWorld(storage, now = Date.now()) {
  const [content, records] = await Promise.all([loadWorldContent(), loadWorldRecords(storage)]);
  return { content, records, state: deriveWorldState(content, records, now) };
}

/* ------------------------------------------------------------------ */
/* Derivation                                                          */
/* ------------------------------------------------------------------ */

const GROVE_OF = new Map();
for (const g of GROVES) for (const id of g.families) GROVE_OF.set(id, g.slug);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function deriveWorldState(content, records, now = Date.now()) {
  const date = new Date(now);
  const atmo = { hour: hourWord(date), season: seasonWord(date), weather: weatherWord(date, seasonWord(date)) };
  const { sessions, learning } = records;
  const gardenSessions = learning.filter((r) => r.kind === 'garden-session').sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  const seeds = learning.filter((r) => r.kind === 'garden-seed');
  const rounds = learning.filter((r) => r.kind === 'lex-round');
  const gauntlets = learning.filter((r) => r.kind === 'gauntlet-run');
  const ledger = ledgerFromRecords(learning);
  const ledgerSummary = summarizeLedger(ledger, now);

  /* ---- Rootwood ---- */
  const byFamily = new Map();
  for (const s of gardenSessions) { if (!byFamily.has(s.family_id)) byFamily.set(s.family_id, []); byFamily.get(s.family_id).push(s); }
  for (const s of seeds) { if (!byFamily.has(s.family_id)) byFamily.set(s.family_id, []); byFamily.get(s.family_id).push(s); }
  const families = content.families.map((f) => {
    const st = computePlantState(byFamily.get(f.meta.id) ?? [], now);
    return { id: f.meta.id, label: f.root.label, origin: f.root.origin_language, meaning: f.root.core_meaning, grove: GROVE_OF.get(f.meta.id) ?? 'edge', memberCount: f.members.length, ...st, family: f };
  });
  const grownStages = new Set(['young', 'in_leaf', 'mature', 'ancient']);
  const rootwood = {
    families,
    total: families.length,
    metCount: families.filter((f) => f.stage !== 'open_ground' && f.stage !== 'seed').length,
    grownCount: families.filter((f) => grownStages.has(f.stage)).length,
    matureCount: families.filter((f) => f.stage === 'mature' || f.stage === 'ancient').length,
    ancientCount: families.filter((f) => f.stage === 'ancient').length,
    dueCount: families.filter((f) => f.due !== 'none').length,
    landmarks: families.filter((f) => f.landmark).length,
    groves: GROVES.map((g) => {
      const fams = families.filter((f) => f.grove === g.slug);
      return { slug: g.slug, name: g.name, line: g.line, families: fams, met: fams.filter((f) => f.stage !== 'open_ground').length, grown: fams.every((f) => f.stage === 'mature' || f.stage === 'ancient') && fams.length > 0 };
    }),
    asking: families.filter((f) => f.due !== 'none').sort((a, b) => a.nextReviewAt.localeCompare(b.nextReviewAt))[0] ?? null,
  };

  /* ---- Reading Room ---- */
  const rcById = new Map(content.rc.map((i) => [i.id, i]));
  const rcSessions = sessions.filter((s) => !s.module && rcById.has(s.passage_id));
  const rcBest = new Map(); // passage_id → best stars result
  for (const s of rcSessions) {
    const item = rcById.get(s.passage_id);
    const res = rcStars(s, item.estimated_time_min, s.night_reading ? 0.8 : 1);
    const prev = rcBest.get(s.passage_id);
    if (!prev || res.stars > prev.stars || (res.stars === prev.stars && res.flawless && !prev.flawless)) rcBest.set(s.passage_id, { ...res, session: s });
  }
  const rcStarTotal = [...rcBest.values()].reduce((n, r) => n + r.stars, 0);
  // Every question answered right at least once, in a passage or its second look: how far Chai has grown.
  const qSolved = new Set();
  for (const s of sessions) {
    if (s.module ? s.module !== 'rc2' : !rcById.has(s.passage_id)) continue;
    for (const a of (Array.isArray(s.answers) ? s.answers : [])) if (a?.is_correct === true && a.question_id) qSolved.add(a.question_id);
  }
  const reading = {
    passages: content.rc.length,
    qSolved: qSolved.size,
    qTotal: content.rc.reduce((n, i) => n + (Number(i.question_count) || 0), 0),
    read: rcBest.size,
    attempts: rcSessions.length,
    stars: rcStarTotal,
    maxStars: content.rc.length * 3,
    best: rcBest,
    wellRead: [...rcBest.values()].filter((r) => r.stars >= 2).length,
    threeStar: [...rcBest.values()].filter((r) => r.stars >= 3).length,
    litWindows: [...rcBest.values()].filter((r) => r.stars >= 2).length,
    flawless: [...rcBest.values()].filter((r) => r.flawless).length,
  };

  /* ---- The Quarter: PJ / PS / OOO ---- */
  const verbal = {};
  for (const [slug, mod, reg] of [['loom', 'pj', content.pj], ['table', 'ps', content.ps], ['bench', 'ooo', content.ooo]]) {
    const byId = new Map(reg.map((i) => [i.id, i]));
    const ms = sessions.filter((s) => s.module === mod);
    const solved = new Set(), tried = new Set();
    let starTotal = 0;
    const bestBySet = new Map();
    for (const s of ms) {
      for (const a of (s.answers ?? []).filter(Boolean)) { const id = a.item_id ?? a.question_id; if (a.is_correct !== null) tried.add(id); if (a.is_correct === true) solved.add(id); }
      const ids = s.item_ids ?? (s.answers ?? []).filter(Boolean).map((a) => a.item_id ?? a.question_id);
      const target = ids.reduce((n, id) => n + (byId.get(id)?.estimated_time_sec ?? 90), 0);
      const res = verbalStars(s, target);
      const key = s.set_id ?? ids.join(',');
      const prev = bestBySet.get(key);
      if (!prev || res.stars > prev.stars) bestBySet.set(key, res);
    }
    for (const r of bestBySet.values()) starTotal += r.stars;
    const tiers = [...new Set(reg.map((i) => i.tier))];
    const tiersCleared = tiers.filter((t) => reg.filter((i) => i.tier === t).every((i) => solved.has(i.id))).length;
    verbal[slug] = { module: mod, total: reg.length, solved: solved.size, tried: tried.size, tiers: tiers.length, tiersCleared, stars: starTotal, sets: bestBySet.size, level: levelFromCleared(solved.size, Math.max(1, Math.ceil(reg.length / 4))), sessions: ms.length };
  }

  /* ---- The content engine's banks: placement, completion, arguments, words ----
          Stars per set and solved ids per bank; the session record carries
          its own time target, so no content file is opened here. ---- */
  const banks = {};
  for (const mod of ['sp', 'pc', 'wb', 'cr']) {
    const reg = content[mod] ?? [];
    const total = reg.reduce((n, r) => n + (r.item_ids?.length ?? 1), 0);
    const ms = sessions.filter((s) => s.module === mod);
    const solvedIds = new Set(), tried = new Set();
    const bestBySet = new Map();
    for (const s of ms) {
      for (const a of (s.answers ?? []).filter(Boolean)) { const id = a.item_id ?? a.question_id; if (a.is_correct !== null) tried.add(id); if (a.is_correct === true) solvedIds.add(id); }
      const res = verbalStars(s, s.target_sec ?? (s.score?.total ?? 1) * 60);
      const key = s.set_id ?? s.passage_id;
      const prev = bestBySet.get(key);
      if (!prev || res.stars > prev.stars) bestBySet.set(key, res);
    }
    let stars = 0;
    for (const r of bestBySet.values()) stars += r.stars;
    banks[mod] = { module: mod, total, solved: solvedIds.size, solvedIds, tried: tried.size, stars, sets: bestBySet.size, sessions: ms.length };
  }

  /* ---- Terraces: Word DNA ---- */
  const wdSessions = sessions.filter((s) => s.module === 'wd');
  const wdDone = new Set();
  for (const s of wdSessions) for (const a of (s.answers ?? []).filter(Boolean)) if (a.is_correct === true) wdDone.add(a.item_id ?? a.question_id);
  const terraces = { total: content.wd.length, done: wdDone.size, level: clamp(Math.floor(wdDone.size / 3), 0, 4), stars: wdDone.size * 2, sessions: wdSessions.length };

  /* ---- Meadow, Pond, Thicket ---- */
  const lexRegion = (region) => {
    const fields = content.fields[region].map((f) => ({ ...f, summary: fieldSummary(f, ledgerSummary) }));
    const total = fields.reduce((n, f) => n + f.total, 0);
    const met = fields.reduce((n, f) => n + f.summary.met, 0);
    const known = fields.reduce((n, f) => n + f.summary.known, 0);
    const mastered = fields.reduce((n, f) => n + f.summary.mastered, 0);
    const due = fields.reduce((n, f) => n + f.summary.due, 0);
    const regionRounds = rounds.filter((r) => r.region === region);
    const bestByField = new Map();
    for (const r of regionRounds) { const prev = bestByField.get(r.bundle_id) ?? 0; if ((r.stars ?? 0) > prev) bestByField.set(r.bundle_id, r.stars ?? 0); }
    const stars = [...bestByField.values()].reduce((n, s) => n + s, 0);
    const fieldsDone = fields.filter((f) => f.total > 0 && f.summary.mastered >= f.total * 0.9).length;
    return { fields, total, met, known, mastered, due, rounds: regionRounds.length, stars, maxStars: fields.length * 3, bestByField, fieldsDone };
  };
  const meadow = lexRegion('meadow');
  const pond = { ...lexRegion('pond') };
  pond.koi = clamp(Math.floor(pond.mastered / 12) + (pond.known >= 5 ? 1 : 0), 0, 12);
  const thicket = { ...lexRegion('thicket') };
  thicket.lanterns = thicket.fields.filter((f) => f.total > 0 && f.summary.mastered >= Math.max(3, f.total * 0.6)).length;
  thicket.languages = thicket.fields.length;

  /* ---- The Wilds ---- */
  const wilds = {
    runs: gauntlets.length,
    best: gauntlets.reduce((n, g) => Math.max(n, g.stars ?? 0), 0),
    bestScore: gauntlets.reduce((n, g) => Math.max(n, g.score?.correct ?? 0), 0),
    stars: gauntlets.reduce((n, g) => Math.max(n, g.stars ?? 0), 0),
  };

  /* ---- Works that were derived from the old craft economy are gone; the
          pets (state.pets, src/pets/economy.js) are what the village shows. ---- */
  const built = { hearthLevel: 1, floors: 1 };
  reading.floors = 1;
  reading.observatory = false;
  pond.lanterns = false; pond.heron = false; terraces.arbour = false; thicket.arch = false; thicket.path = false; meadow.hives = false; meadow.path = false;

  /* ---- The days this valley was worked ---- */
  const allRuns = [...sessions, ...gardenSessions, ...rounds, ...gauntlets];
  const activeDays = new Set(allRuns.map((s) => dayKey(s.finished_at)).filter(Boolean));
  const today = dayKey(date);
  const practicedToday = activeDays.has(today);
  let streakCurrent = 0;
  let cursor = practicedToday ? today : shiftDay(today, -1);
  while (activeDays.has(cursor)) { streakCurrent += 1; cursor = shiftDay(cursor, -1); }
  let streakBest = 0;
  {
    const sorted = [...activeDays].sort();
    let run = 0, prev = null;
    for (const d of sorted) { run = prev && shiftDay(prev, 1) === d ? run + 1 : 1; streakBest = Math.max(streakBest, run); prev = d; }
  }

  /* ---- Hearth ---- */
  const engagement = deriveEngagement(sessions, date);
  const placesVisited = new Set();
  if (rcSessions.length) placesVisited.add('reading-room');
  if (gardenSessions.length) placesVisited.add('rootwood');
  for (const slug of ['loom', 'table', 'bench']) if (verbal[slug].sessions) placesVisited.add(slug);
  if (wdSessions.length) placesVisited.add('terraces');
  for (const r of rounds) placesVisited.add(r.region);
  if (gauntlets.length) placesVisited.add('wilds');
  for (const s of sessions) if (['sp', 'pc', 'wb', 'cr'].includes(s.module)) placesVisited.add(s.region ?? { sp: 'loom', pc: 'table', cr: 'reading-room', wb: 'meadow' }[s.module]);
  const hearth = {
    level: built.hearthLevel,
    practicedToday,
    streak: { current: streakCurrent, best: streakBest, alive: streakCurrent > 0, practicedToday },
    level_xp: engagement.level,
    // The title reads the valley, not an XP bar: stars are the honest
    // measure of accuracy at pace, and works are what was built with them.
    title: titleFor(Math.max(engagement.level.level, 1 + Math.floor(starTotalFor(reading, verbal, meadow, pond, thicket, wilds) / 14))),
    activeDays: activeDays.size,
  };

  /* ---- Stars in total ---- */
  const starTotal = reading.stars + verbal.loom.stars + verbal.table.stars + verbal.bench.stars
    + meadow.stars + pond.stars + thicket.stars + wilds.stars;

  /* ---- Today ---- */
  const todaySum = todaySummary({ sessions, gardenSessions, rounds, gauntlets, rcById, date });

  const isNew = allRuns.length === 0;
  const stream = computeStreamLevel(gardenSessions);

  /* ---- How long the valley was left alone ---- */
  const lastRunAt = allRuns.reduce((n, s) => Math.max(n, Date.parse(s.finished_at) || 0), 0);
  const awayDays = lastRunAt ? Math.floor((now - lastRunAt) / 86400000) : 0;

  const state = {
    atmo, now, isNew, today,
    rootwood, reading, ...verbal, banks, terraces, meadow, pond, thicket, wilds,
    hearth, stars: starTotal, built,
    placesVisited: placesVisited.size, placesSeen: placesVisited,
    todaySum, stream, engagement, awayDays, lastRunAt,
  };

  /* ---- Which CAT abilities are settled, and which are slipping ----
          Every answer anywhere in the valley feeds one ledger, so the
          valley can point at the right bench without the learner ever
          reading an analytics screen. See core/learning/review.js. ---- */
  state.skills = skillLedger(sessions, learning, now);
  state.weakSkills = weakSkills(state.skills);
  state.nextSkill = nextSkill(state.skills, state);

  /* ---- The friends: moods, hearts, stars, the village level, today's three, the fire (src/pets/economy.js) ---- */
  state.pets = derivePets(state, records, content, now);
  // Night reading is Chai's lamp: offered once Chai has three hearts.
  state.reading.observatory = (state.pets.pets.find((p) => p.id === 'chai')?.hearts ?? 0) >= 3;
  state.asking = whoIsAsking(state);
  return state;
}

/** The place the valley would nudge you towards, as a slug or null. */
function whoIsAsking(s) {
  if (s.rootwood.asking) return 'rootwood';
  if (s.meadow.due >= 5) return 'meadow';
  if (s.pond.due >= 5) return 'pond';
  if (s.thicket.due >= 5) return 'thicket';
  return null;
}

/** Stars, before the state object exists (the title needs them early). */
function starTotalFor(reading, verbal, meadow, pond, thicket, wilds) {
  return reading.stars + verbal.loom.stars + verbal.table.stars + verbal.bench.stars
    + meadow.stars + pond.stars + thicket.stars + wilds.stars;
}

/* ------------------------------------------------------------------ */
/* Today                                                               */
/* ------------------------------------------------------------------ */

/** What happened today, for the day's asks. */
function todaySummary({ sessions, gardenSessions, rounds, gauntlets, rcById, date }) {
  const today = dayKey(date);
  const isToday = (s) => dayKey(s.finished_at) === today;
  const rcToday = sessions.filter((s) => !s.module && isToday(s));
  const regions = new Set();
  const lexCorrect = { meadow: 0, pond: 0, thicket: 0 };
  const roundTwoStar = { meadow: 0, pond: 0, thicket: 0 };
  let threeStars = 0;
  for (const r of rounds.filter(isToday)) { lexCorrect[r.region] = (lexCorrect[r.region] ?? 0) + (r.score?.correct ?? 0); if ((r.stars ?? 0) >= 2) roundTwoStar[r.region] += 1; if (r.stars === 3) threeStars += 1; regions.add(r.region); }
  let rcTwoStar = 0;
  for (const s of rcToday) { const st = rcStars(s, rcById.get(s.passage_id)?.estimated_time_min).stars; if (st >= 2) rcTwoStar += 1; if (st === 3) threeStars += 1; regions.add('reading-room'); }
  let verbalCorrect = 0;
  for (const s of sessions.filter((x) => x.module && x.module !== 'wd' && x.module !== 'wb' && isToday(x))) { verbalCorrect += s.score?.correct ?? 0; regions.add(s.region ?? { pj: 'loom', ps: 'table', ooo: 'bench', sp: 'loom', pc: 'table', cr: 'reading-room' }[s.module] ?? s.module); }
  for (const s of sessions.filter((x) => x.module === 'wb' && isToday(x))) regions.add(s.region ?? 'meadow');
  const wdToday = sessions.filter((x) => x.module === 'wd' && isToday(x));
  if (wdToday.length) regions.add('terraces');
  const gardenToday = gardenSessions.filter(isToday);
  if (gardenToday.length) regions.add('rootwood');
  for (const g of (gauntlets ?? []).filter(isToday)) { if ((g.stars ?? 0) >= 3) threeStars += 1; regions.add('wilds'); }
  return { rc: rcToday.length, rcTwoStar, garden: gardenToday.length, lexCorrect, roundTwoStar, verbalCorrect, wd: wdToday.reduce((n, s) => n + (s.score?.correct ?? 0), 0), regions, threeStars };
}

/** Stars as a five-character string for the UI: "★★☆". */
export function starGlyphs(n, max = 3) {
  return `${'★'.repeat(n)}<span class="off">${'★'.repeat(Math.max(0, max - n))}</span>`;
}

/* ------------------------------------------------------------------ */
/* What changed                                                        */
/* ------------------------------------------------------------------ */

/**
 * What a run did for the village, the reward that can be SEEN: which
 * friend it helped, the stars it earned, a new heart, a new village level
 * and what it put on the map, and the day's gift.
 * @returns {ReturnType<typeof changeBetween> | null}
 */
export function petChangeLine(before, after) {
  if (!before?.pets || !after?.pets) return null;
  return changeBetween(before.pets, after.pets);
}
