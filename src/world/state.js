/**
 * state.js — the world, derived. One function turns the content registry
 * and every stored record into the state the map paints and the screens
 * read: each place's growth, the learner's stars and Ink, today's quests,
 * and which place is quietly asking for attention.
 *
 * Nothing here is stored back. Recomputing from the same records always
 * gives the same world, so the valley can never drift from the truth, and
 * every backup already contains it.
 */

import { STORES } from '../core/storage/storage-adapter.js';
import { listLGItems, loadLGItems, listRCItems, listPJItems, listPSItems, listOOOItems, listWDItems } from '../core/content-loader/loader.js';
import { computePlantState } from '../core/engine/garden-session.js';
import { GROVES } from '../modules/language-garden/logic/groves.js';
import { deriveEngagement } from '../core/engagement/stats.js';
import { dayKey } from '../core/engagement/streaks.js';
import { computeStreamLevel } from '../modules/language-garden/logic/effort.js';
import { rcStars, verbalStars, INK, UPGRADES, questsForDate, titleFor, levelFromCleared } from './economy.js';
import { listFields, ledgerFromRecords, summarizeLedger, fieldSummary } from './lexicon.js';
import { hourWord, seasonWord, weatherWord } from './engine/palette.js';

/* ------------------------------------------------------------------ */
/* Loading                                                             */
/* ------------------------------------------------------------------ */

let contentCache = null;

/** Every registry the world needs, loaded once per app life (content is
 *  static; the service worker keeps it offline). */
export async function loadWorldContent() {
  if (contentCache) return contentCache;
  const safe = (p) => p.catch(() => []);
  const [lgRegistry, rc, pj, ps, ooo, wd, meadowFields, pondFields, thicketFields] = await Promise.all([
    safe(listLGItems()), safe(listRCItems()), safe(listPJItems()), safe(listPSItems()), safe(listOOOItems()), safe(listWDItems()),
    safe(listFields('meadow')), safe(listFields('pond')), safe(listFields('thicket')),
  ]);
  let families = [];
  try {
    const loaded = await loadLGItems(lgRegistry.map((i) => i.id));
    families = lgRegistry.map((i) => loaded.get(i.id)).filter(Boolean).sort((a, b) => a.meta.id.localeCompare(b.meta.id));
  } catch { families = []; }
  contentCache = { families, rc, pj, ps, ooo, wd, fields: { meadow: meadowFields, pond: pondFields, thicket: thicketFields } };
  return contentCache;
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
  const builds = learning.filter((r) => r.kind === 'world-build');
  const questClaims = learning.filter((r) => r.kind === 'world-quest');
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
  const reading = {
    passages: content.rc.length,
    read: rcBest.size,
    stars: rcStarTotal,
    maxStars: content.rc.length * 3,
    best: rcBest,
    floors: clamp(1 + Math.floor(rcStarTotal / 12), 1, 5),
    litWindows: [...rcBest.values()].filter((r) => r.stars >= 2).length,
    flawless: [...rcBest.values()].filter((r) => r.flawless).length,
    observatory: builds.some((b) => b.upgrade_id === 'observatory'),
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
      for (const a of s.answers ?? []) { const id = a.item_id ?? a.question_id; if (a.is_correct !== null) tried.add(id); if (a.is_correct === true) solved.add(id); }
      const ids = s.item_ids ?? (s.answers ?? []).map((a) => a.item_id ?? a.question_id);
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

  /* ---- Terraces: Word DNA ---- */
  const wdSessions = sessions.filter((s) => s.module === 'wd');
  const wdDone = new Set();
  for (const s of wdSessions) for (const a of s.answers ?? []) if (a.is_correct === true) wdDone.add(a.item_id ?? a.question_id);
  const terraces = { total: content.wd.length, done: wdDone.size, level: clamp(Math.floor(wdDone.size / 3), 0, 4), arbour: builds.some((b) => b.upgrade_id === 'terrace-arbour'), stars: wdDone.size * 2 };

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
  pond.lanterns = builds.some((b) => b.upgrade_id === 'pond-lanterns');
  const thicket = { ...lexRegion('thicket') };
  thicket.lanterns = thicket.fields.filter((f) => f.total > 0 && f.summary.mastered >= Math.max(3, f.total * 0.6)).length;
  thicket.languages = thicket.fields.length;

  /* ---- Ink ---- */
  let earned = 0;
  for (const r of rcBest.values()) { /* per session, not best */ }
  for (const s of rcSessions) earned += INK.rc(rcStars(s, rcById.get(s.passage_id)?.estimated_time_min, s.night_reading ? 0.8 : 1).stars);
  for (const slug of ['loom', 'table', 'bench']) {
    const mod = verbal[slug].module;
    for (const s of sessions.filter((x) => x.module === mod)) earned += INK.verbal(0, s.score?.correct ?? 0);
  }
  for (const s of wdSessions) earned += INK.wd(1);
  for (const s of gardenSessions) earned += INK.garden(s.session_type, s.clean === true);
  for (const r of rounds) earned += INK.round(r.stars ?? 0, r.score?.correct ?? 0);
  for (const q of questClaims) earned += q.ink ?? INK.quest;
  const spent = builds.reduce((n, b) => n + (b.cost ?? 0), 0);
  const ink = { earned, spent, balance: Math.max(0, earned - spent) };

  /* ---- Hearth: level from upgrades; engagement from sessions ---- */
  const builtIds = builds.map((b) => b.upgrade_id);
  let hearthLevel = 1;
  for (const b of builds) { const u = UPGRADES.find((x) => x.id === b.upgrade_id); if (u?.effect?.hearthLevel) hearthLevel = Math.max(hearthLevel, u.effect.hearthLevel); }
  const engagement = deriveEngagement(sessions, date);
  const today = dayKey(date);
  const practicedToday = sessions.some((s) => dayKey(s.finished_at) === today) || gardenSessions.some((s) => dayKey(s.finished_at) === today) || rounds.some((r) => dayKey(r.finished_at) === today);
  const activeDays = new Set([...sessions, ...gardenSessions, ...rounds].map((s) => dayKey(s.finished_at)));
  const hearth = { level: hearthLevel, practicedToday, streak: engagement.streaks, level_xp: engagement.level, title: titleFor(engagement.level.level), activeDays: activeDays.size };

  /* ---- Stars in total ---- */
  const starTotal = reading.stars + verbal.loom.stars + verbal.table.stars + verbal.bench.stars + meadow.stars + pond.stars + thicket.stars;

  /* ---- Today and quests ---- */
  const todaySum = todaySummary({ sessions, gardenSessions, rounds, rcById, content, date });
  const quests = questsForDate(today).map((q, i) => {
    const p = q.progress(todaySum);
    const done = p.done >= p.goal;
    const claimed = questClaims.some((c) => c.id === `quest:${today}:${i}`);
    return { ...q, index: i, done: p.done, goal: p.goal, complete: done, claimed, key: `quest:${today}:${i}` };
  });

  /* ---- Who is asking ---- */
  let asking = null;
  if (rootwood.asking) asking = 'rootwood';
  else if (meadow.due >= 5) asking = 'meadow';
  else if (pond.due >= 5) asking = 'pond';
  else if (thicket.due >= 5) asking = 'thicket';
  else { const q = quests.find((x) => !x.complete); if (q && practicedToday) asking = q.region; }

  const stream = computeStreamLevel(gardenSessions);
  const isNew = sessions.length === 0 && gardenSessions.length === 0 && rounds.length === 0;

  return {
    atmo, now, isNew, today,
    rootwood, reading, ...verbal, terraces, meadow, pond, thicket,
    hearth, ink, stars: starTotal, builds: builtIds, quests, todaySum, asking, stream,
    engagement,
  };
}

/** What happened today, for quest progress. */
function todaySummary({ sessions, gardenSessions, rounds, rcById, date }) {
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
  for (const s of sessions.filter((x) => x.module && x.module !== 'wd' && isToday(x))) { verbalCorrect += s.score?.correct ?? 0; regions.add({ pj: 'loom', ps: 'table', ooo: 'bench' }[s.module] ?? s.module); }
  const wdToday = sessions.filter((x) => x.module === 'wd' && isToday(x));
  if (wdToday.length) regions.add('terraces');
  const gardenToday = gardenSessions.filter(isToday);
  if (gardenToday.length) regions.add('rootwood');
  return { rc: rcToday.length, rcTwoStar, garden: gardenToday.length, lexCorrect, roundTwoStar, verbalCorrect, wd: wdToday.reduce((n, s) => n + (s.score?.correct ?? 0), 0), regions, threeStars };
}

/** Stars as a five-character string for the UI: "★★☆". */
export function starGlyphs(n, max = 3) {
  return `${'★'.repeat(n)}<span class="off">${'★'.repeat(Math.max(0, max - n))}</span>`;
}

/** A one-line description of what changed in the world after a result —
 *  the reward that can be SEEN. */
export function worldChangeLine(region, before, after) {
  if (!before || !after) return '';
  if (region === 'reading-room') {
    if (after.reading.floors > before.reading.floors) return `The Reading Room rises to <b>${after.reading.floors} floors</b>.`;
    if (after.reading.litWindows > before.reading.litWindows) return `A new window lights up in the Reading Room tower.`;
    return after.reading.stars ? `The tower keeps your ${after.reading.stars} star${after.reading.stars === 1 ? '' : 's'}.` : 'The tower waits for your first star.';
  }
  if (region === 'meadow') {
    const d = after.meadow.mastered - before.meadow.mastered;
    if (after.meadow.fieldsDone > before.meadow.fieldsDone) return `A whole field of the Meadow is in <b>full bloom</b>.`;
    if (d > 0) return `<b>${d} new flower${d === 1 ? '' : 's'}</b> open in the Meadow.`;
    return `Buds appear where words were met.`;
  }
  if (region === 'pond') {
    if (after.pond.koi > before.pond.koi) return `<b>A new koi</b> arrives in the Mirror Pond.`;
    return `The pond remembers ${after.pond.mastered} twins told apart.`;
  }
  if (region === 'thicket') {
    if (after.thicket.lanterns > before.thicket.lanterns) return `<b>A lantern lights</b> along the Thicket path.`;
    return `The brambles part a little further.`;
  }
  if (region === 'rootwood') return `The Rootwood grows: <b>${after.rootwood.grownCount}</b> families standing.`;
  if (['loom', 'table', 'bench'].includes(region)) {
    if (after[region].level > before[region].level) return `The workshop grows: <b>level ${after[region].level}</b>.`;
    return `${after[region].solved} of ${after[region].total} solved here.`;
  }
  return '';
}
