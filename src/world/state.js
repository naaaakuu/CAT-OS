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
import { listLGItems, loadLGItems, listRCItems, listPJItems, listPSItems, listOOOItems, listWDItems } from '../core/content-loader/loader.js';
import { computePlantState } from '../core/engine/garden-session.js';
import { GROVES } from '../modules/language-garden/logic/groves.js';
import { deriveEngagement } from '../core/engagement/stats.js';
import { dayKey, shiftDay } from '../core/engagement/streaks.js';
import { computeStreamLevel } from '../modules/language-garden/logic/effort.js';
import {
  rcStars, verbalStars, EARN, WORKS, workById, questsForDate, titleFor, levelFromCleared,
  emptyBag, addBag, subBag, surveyWorks, nextWork,
} from './economy.js';
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
  const reading = {
    passages: content.rc.length,
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

  /* ---- The purse: what every finished run made, minus what was built ---- */
  let earned = emptyBag();
  for (const s of rcSessions) {
    const r = rcStars(s, rcById.get(s.passage_id)?.estimated_time_min, s.night_reading ? 0.8 : 1);
    earned = addBag(earned, EARN.rc(r.stars, s.score?.correct ?? 0, r.flawless));
  }
  for (const slug of ['loom', 'table', 'bench']) {
    const mod = verbal[slug].module;
    const reg = { loom: content.pj, table: content.ps, bench: content.ooo }[slug];
    const byId = new Map(reg.map((i) => [i.id, i]));
    for (const s of sessions.filter((x) => x.module === mod)) {
      const ids = s.item_ids ?? (s.answers ?? []).map((a) => a.item_id ?? a.question_id);
      const target = ids.reduce((n, id) => n + (byId.get(id)?.estimated_time_sec ?? 90), 0);
      const r = verbalStars(s, target);
      earned = addBag(earned, EARN.verbal(r.stars, s.score?.correct ?? 0, r.flawless));
    }
  }
  for (const s of wdSessions) earned = addBag(earned, EARN.wd(s.score?.accuracy === 1 ? 3 : 1, s.score?.correct ?? 0));
  for (const s of gardenSessions) earned = addBag(earned, EARN.garden(s.session_type, s.clean === true));
  for (const r of rounds) earned = addBag(earned, EARN.round(r.stars ?? 0, r.score?.correct ?? 0, r.flawless === true));
  for (const g of gauntlets) earned = addBag(earned, EARN.gauntlet(g.stars ?? 0, g.score?.correct ?? 0));
  for (const q of questClaims) earned = addBag(earned, q.paid ?? EARN.ask());
  let spent = emptyBag();
  for (const b of builds) spent = addBag(spent, workById(b.work_id ?? b.upgrade_id)?.cost ?? b.cost ?? emptyBag());
  const purse = subBag(earned, spent);

  /* ---- The works standing in the valley ---- */
  const builtIds = builds.map((b) => b.work_id ?? b.upgrade_id).filter(Boolean);
  const builtSet = new Set(builtIds);
  const built = { hearthLevel: 1, floors: 1 };
  for (const id of builtIds) {
    const w = workById(id);
    if (!w?.effect) continue;
    for (const [k, v] of Object.entries(w.effect)) {
      if (typeof v === 'number') built[k] = Math.max(built[k] ?? 0, v);
      else built[k] = v;
    }
  }
  // The tower's floors also rise a little with reading alone, so the world
  // still answers to learning between works.
  built.floors = Math.max(built.floors, clamp(1 + Math.floor(reading.stars / 18), 1, 3));
  reading.floors = built.floors;
  reading.observatory = built.observatory === true;
  pond.lanterns = built.pondLanterns === true;
  pond.heron = built.pondHeron === true;
  terraces.arbour = built.terraceArbour === true;
  thicket.arch = built.thicketArch === true;
  thicket.path = built.thicketPath === true;
  meadow.hives = built.meadowHives === true;
  meadow.path = built.meadowPath === true;

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
  const hearth = {
    level: built.hearthLevel,
    practicedToday,
    streak: { current: streakCurrent, best: streakBest, alive: streakCurrent > 0, practicedToday },
    level_xp: engagement.level,
    // The title reads the valley, not an XP bar: stars are the honest
    // measure of accuracy at pace, and works are what was built with them.
    title: titleFor(Math.max(engagement.level.level, 1 + Math.floor(starTotalFor(reading, verbal, meadow, pond, thicket, wilds) / 14) + builtIds.length)),
    activeDays: activeDays.size,
  };

  /* ---- Stars in total ---- */
  const starTotal = reading.stars + verbal.loom.stars + verbal.table.stars + verbal.bench.stars
    + meadow.stars + pond.stars + thicket.stars + wilds.stars;

  /* ---- Today and the day's asks ---- */
  const todaySum = todaySummary({ sessions, gardenSessions, rounds, gauntlets, rcById, date });
  const quests = questsForDate(today).map((q, i) => {
    const p = q.progress(todaySum);
    const done = p.done >= p.goal;
    const claimed = questClaims.some((c) => c.id === `quest:${today}:${i}`);
    return { ...q, index: i, done: p.done, goal: p.goal, complete: done, claimed, key: `quest:${today}:${i}` };
  });

  const isNew = allRuns.length === 0;
  const stream = computeStreamLevel(gardenSessions);

  /* ---- How long the valley was left alone ---- */
  const lastRunAt = allRuns.reduce((n, s) => Math.max(n, Date.parse(s.finished_at) || 0), 0);
  const awayDays = lastRunAt ? Math.floor((now - lastRunAt) / 86400000) : 0;

  const state = {
    atmo, now, isNew, today,
    rootwood, reading, ...verbal, terraces, meadow, pond, thicket, wilds,
    hearth, purse, earned, spent, stars: starTotal,
    builds: builtIds, builtSet, built,
    placesVisited: placesVisited.size, placesSeen: placesVisited,
    quests, todaySum, stream, engagement, awayDays, lastRunAt,
  };

  /* ---- What the valley is building next, and who is asking ---- */
  state.works = surveyWorks(state);
  state.nextWork = nextWork(state);
  state.readyWorks = state.works.filter((w) => w.ready);
  state.asking = whoIsAsking(state);
  state.opportunities = buildOpportunities(state, content);
  return state;
}

/** The place the valley would nudge you towards, as a slug or null. */
function whoIsAsking(s) {
  if (s.rootwood.asking) return 'rootwood';
  if (s.meadow.due >= 5) return 'meadow';
  if (s.pond.due >= 5) return 'pond';
  if (s.thicket.due >= 5) return 'thicket';
  const q = s.quests.find((x) => !x.complete);
  if (q && s.hearth.practicedToday) return q.region;
  return null;
}

/* ------------------------------------------------------------------ */
/* Opportunities — the small number of things worth doing right now     */
/* ------------------------------------------------------------------ */

/**
 * The home screen shows at most four of these. Each one is a real reason
 * to go somewhere, written as the valley would say it, with a weight so
 * the most useful thing sits at the top. Never a wall of information.
 *
 * @returns {Array<{id, region, kind, title, line, href, weight, badge}>}
 */
function buildOpportunities(s, content) {
  const out = [];
  const push = (o) => out.push(o);

  /* A first-time learner is given one clear door, not five. */
  if (s.isNew) {
    push({ id: 'first-read', region: 'reading-room', kind: 'start', weight: 100, badge: 'Start here',
      title: 'Read your first passage', line: 'Six minutes, four questions. The Reading Room is where the valley begins.',
      href: '#/world/place/reading-room' });
    push({ id: 'first-words', region: 'meadow', kind: 'start', weight: 90, badge: 'Or',
      title: 'Bloom your first field', line: 'Twelve words from the CAT lists, one at a time.',
      href: '#/world/place/meadow' });
    return out;
  }

  /* Something is ready to build — always the loudest card. */
  for (const w of s.readyWorks.slice(0, 2)) {
    push({ id: `build:${w.id}`, region: w.region, kind: 'build', weight: 95, badge: 'Ready to build',
      title: w.name, line: w.line, href: '#/world/place/hearth?works=1' });
  }

  /* Spaced review that is genuinely due — the highest-value practice. */
  if (s.rootwood.asking) {
    const f = s.rootwood.asking;
    push({ id: 'rootwood-due', region: 'rootwood', kind: 'due', weight: 88, badge: `${s.rootwood.dueCount} due`,
      title: `${f.label} is ready to revisit`, line: `“${f.meaning}” — a root you have grown is asking to be walked again before it fades.`,
      href: '#/world/place/rootwood' });
  }
  for (const [slug, name, noun] of [['meadow', 'The Meadow', 'words'], ['pond', 'The Mirror Pond', 'twins'], ['thicket', 'The Thicket', 'loanwords']]) {
    const r = s[slug];
    if (r.due >= 8) {
      push({ id: `${slug}-due`, region: slug, kind: 'due', weight: 84 - (slug === 'meadow' ? 0 : 2), badge: `${r.due} due`,
        title: `${r.due} ${noun} are fading`, line: `${name} keeps what you revisit. These are due today.`,
        href: `#/world/place/${slug}` });
    }
  }

  /* The day's asks, the one closest to done first. */
  const openAsks = s.quests.filter((q) => !q.complete).sort((a, b) => (b.done / b.goal) - (a.done / a.goal));
  if (openAsks.length) {
    const q = openAsks[0];
    push({ id: `ask:${q.id}`, region: q.region, kind: 'ask', weight: 76, badge: q.goal > 1 ? `${q.done}/${q.goal}` : 'Today',
      title: q.title, line: q.line, href: `#/world/place/${q.region}` });
  }

  /* Unread passages, tuned to where the learner actually is. */
  if (s.reading.read < s.reading.passages) {
    const next = pickNextPassage(s, content);
    if (next) {
      push({ id: 'read-next', region: 'reading-room', kind: 'new', weight: 72, badge: 'New passage',
        title: next.title ?? 'A new passage', line: `${next.genre ?? 'Reading'} · about ${Math.round(next.estimated_time_min ?? 6)} minutes · ${next.question_count ?? 4} questions.`,
        href: `#/rc/session/${next.id}` });
    }
  }

  /* A workshop in the Quarter that has never been opened. */
  for (const [slug, name, line] of [
    ['loom', 'The Loom', 'Four sentences, one order. Weave the paragraph the author wrote.'],
    ['table', 'The Summary Table', 'Find the author’s point and protect it from the options that almost say it.'],
    ['bench', 'The Stranger’s Bench', 'Build the paragraph, and the sentence that never belonged shows itself.'],
  ]) {
    if (s[slug].sessions === 0) {
      push({ id: `try:${slug}`, region: slug, kind: 'new', weight: 66, badge: 'Never opened',
        title: name, line, href: `#/world/place/${slug}` });
    }
  }

  /* The Gauntlet, once there is enough learned to be tested on. */
  if (s.stars >= 12 && s.wilds.runs === 0) {
    push({ id: 'gauntlet', region: 'wilds', kind: 'challenge', weight: 64, badge: 'Unlocked',
      title: 'The road out is open', line: 'Mixed, timed, against your own best. The Wilds are where you find out.',
      href: '#/world/place/wilds' });
  }

  out.sort((a, b) => b.weight - a.weight);
  // Never show the same kind of card three times: a home screen that says
  // "these are fading" three ways teaches nothing new on the second line.
  const seen = new Map();
  const spread = [];
  for (const o of out) {
    const n = seen.get(o.kind) ?? 0;
    if (n >= (o.kind === 'build' ? 2 : 1)) { o.weight -= 30; continue; }
    seen.set(o.kind, n + 1);
    spread.push(o);
  }
  return spread.concat(out.filter((o) => !spread.includes(o)).sort((a, b) => b.weight - a.weight));
}

/** Stars, before the state object exists (the title needs them early). */
function starTotalFor(reading, verbal, meadow, pond, thicket, wilds) {
  return reading.stars + verbal.loom.stars + verbal.table.stars + verbal.bench.stars
    + meadow.stars + pond.stars + thicket.stars + wilds.stars;
}

/** The passage the Reading Room should offer next: unread, at the stage
 *  the learner is actually reading well at. */
function pickNextPassage(s, content) {
  const read = s.reading.best;
  const unread = content.rc.filter((p) => !read.has(p.id));
  if (!unread.length) return null;
  const order = ['foundation', 'developing', 'exam', 'elite'];
  // The highest stage where at least two passages have been read well.
  let reach = 0;
  for (let i = 0; i < order.length; i += 1) {
    const done = content.rc.filter((p) => p.stage === order[i] && (read.get(p.id)?.stars ?? 0) >= 2).length;
    if (done >= 2) reach = Math.min(order.length - 1, i + 1);
  }
  const stage = order[reach];
  return unread.find((p) => p.stage === stage) ?? unread[0];
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
  for (const s of sessions.filter((x) => x.module && x.module !== 'wd' && isToday(x))) { verbalCorrect += s.score?.correct ?? 0; regions.add({ pj: 'loom', ps: 'table', ooo: 'bench' }[s.module] ?? s.module); }
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
  if (region === 'wilds') return after.wilds.best > before.wilds.best ? `A new best in the Wilds: <b>${after.wilds.best} stars</b>.` : `The Wilds remember ${after.wilds.runs} run${after.wilds.runs === 1 ? '' : 's'}.`;
  if (['loom', 'table', 'bench'].includes(region)) {
    if (after[region].level > before[region].level) return `The workshop grows: <b>level ${after[region].level}</b>.`;
    return `${after[region].solved} of ${after[region].total} solved here.`;
  }
  if (region === 'terraces') return `${after.terraces.done} of ${after.terraces.total} families on the terraces.`;
  return '';
}

/** Which works became buildable between two states — the strongest signal
 *  the valley can send, so it is announced above everything else. */
export function newlyBuildable(before, after) {
  if (!before || !after) return [];
  const was = new Set((before.readyWorks ?? []).map((w) => w.id));
  return (after.readyWorks ?? []).filter((w) => !was.has(w.id));
}
