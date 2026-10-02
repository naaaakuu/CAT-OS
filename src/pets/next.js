/**
 * next.js — the one learning activity each pet offers right now, and the
 * pet's other corners ("More with …").
 *
 * When the learner taps Chai, the card must say START and mean it: this
 * passage, chosen for you, about five minutes. The curator already decides
 * what the next passage, set or family should be; this asks it on the pet's
 * behalf and turns the answer into a route and two lines. (It answered per
 * building in the 2.x canvas village.)
 */

import { nextPassage, nextVerbal, nextFamily, readingWeakness, missedQuestions } from '../world/curator.js';
import { STAGE_INFO } from '../core/learning/journey.js';

const BANK = {
  sp: ['sp', 'Sentence placement', 'A paragraph with one sentence taken out. Find the one seat it can take', 5],
  pc: ['pc', 'Paragraph completion', 'A paragraph that stops one sentence early. Decide what the gap needs', 5],
  cr: ['cr', 'Arguments', 'Find the assumption, weaken the link, name the flaw', 4],
};

const dayN = (state) => Number(String(state?.today ?? '').replace(/\D/g, '').slice(-4)) || 0;
const sessionsOf = (records) => (Array.isArray(records?.sessions) ? records.sessions : []);

function bankActivity(type, state) {
  const [, label, sub, mins] = BANK[type];
  const b = state?.banks?.[type];
  const left = Math.max(0, (b?.total ?? 0) - (b?.solved ?? 0));
  return { href: `#/bank/session/${type}/next`, label, sub: `${sub} · about ${mins} min${left ? ` · ${left} left` : ''}`, minutes: mins, kind: b?.solved ? 'new' : 'first' };
}

/**
 * A verbal pet's next set: a whole tier of its module, or — once the module
 * has been tried — its bank when nothing in the bank is solved yet, and
 * every third day after that (meeting a new kind of question beats a fourth
 * set of the same kind; a brand-new learner meets the core type first).
 */
function verbalNext(world, mod, slug, unit, bankType, placeLabel) {
  const { content, records, state } = world;
  if (bankType && (content?.[bankType] ?? []).length && (state?.[slug]?.sessions ?? 0) > 0
    && (!(state?.banks?.[bankType]?.solved > 0) || dayN(state) % 3 === 0)) return bankActivity(bankType, state);
  const items = content?.[mod] ?? [];
  const rec = nextVerbal(items, sessionsOf(records), mod, `${slug}:${state?.today}`, state?.now);
  if (!rec) return { href: `#/world/place/${slug}`, label: placeLabel, sub: `Every ${unit.replace(/s$/, '')} in one place`, minutes: 5, kind: 'new' };
  const it = rec.item;
  /* `#/<mod>/session/<tier>` plays the WHOLE tier as one timed set, so the
     minutes cost the set, not one item in it. */
  const inSet = it.tier ? items.filter((x) => x.tier === it.tier) : [it];
  const mins = Math.max(1, Math.round(inSet.reduce((s, x) => s + (x.estimated_time_sec ?? 80), 0) / 60));
  const tierWord = String(it.tier ?? '').replace('-', ' ');
  const sub = inSet.length > 1 ? `${tierWord} · ${inSet.length} ${unit} · about ${mins} min` : `${tierWord} · about ${mins} min`;
  return { href: `#/${mod}/session/${it.tier ?? it.id}`, label: it.title, sub, minutes: mins, kind: rec.kind, why: rec.why };
}

function readingNext(world, opts) {
  const { content, records, state } = world;
  const rd = state?.reading;
  if (opts.first || !rd?.read) {
    const p = [...(content?.rc ?? [])].filter((x) => x.stage === 'foundation').sort((a, b) => (a.word_count ?? 999) - (b.word_count ?? 999))[0] ?? content?.rc?.[0];
    if (!p) return null;
    return { href: `#/rc/session/${p.id}`, label: p.title, sub: `${p.question_count ?? 3} questions · about ${Math.max(3, Math.round(p.estimated_time_min ?? 4))} min`, minutes: Math.round(p.estimated_time_min ?? 4), kind: 'first' };
  }
  const sessions = sessionsOf(records);
  const weakness = readingWeakness(sessions);
  const missed = missedQuestions(sessions, weakness, state.now);
  if (missed.length >= 4) return { href: '#/rc/second-look', label: 'The second look', sub: `${Math.min(6, missed.length)} questions that got away · about 5 min`, minutes: 5, kind: 'retry' };
  const rec = nextPassage(content, rd.best, weakness, `rc:${state.today}`);
  if (!rec) return null;
  const it = rec.item;
  return { href: `#/rc/session/${it.id}`, label: it.title, sub: `${STAGE_INFO[it.stage]?.label ?? it.stage ?? ''} · ${it.question_count} questions · about ${it.estimated_time_min} min`, minutes: it.estimated_time_min, kind: rec.kind, why: rec.why };
}

function wordsNext(world) {
  const { state } = world;
  const m = state?.meadow ?? {}, p = state?.pond ?? {}, rw = state?.rootwood;
  const due = (m.due ?? 0) + (p.due ?? 0);
  /* Roots first when families are due and outweigh the word reviews. */
  if ((rw?.dueCount ?? 0) > 0 && rw.dueCount > due / 6) {
    const pick = nextFamily(rw);
    const f = pick?.family ?? rw.families?.[0];
    if (f) return { href: `#/garden/session/${f.id}`, label: pick?.kind === 'due' ? `Revisit ${f.label}` : `Grow ${f.label}`, sub: `${f.origin} · “${f.meaning}” · ${f.memberCount} words · about 4 min`, minutes: 4, kind: pick?.kind ?? 'new', why: pick?.why };
  }
  const region = (p.due ?? 0) > (m.due ?? 0) ? 'pond' : 'meadow';
  return {
    href: `#/round/${region}`,
    label: due >= 5 ? 'The words that are fading' : region === 'pond' ? 'Twelve look-alike twins' : 'Twelve words, chosen for you',
    sub: due >= 5 ? `${due} words are due · about 2 min` : 'Some inside a real sentence · about 2 min',
    minutes: 2, kind: due >= 5 ? 'retry' : 'new',
  };
}

/**
 * @param {string} petId   toffee | chai | matcha | mochi | ginger | mallow
 * @param {object} world   { content, records, state } from loadWorld
 * @param {object} [opts]  { first: boolean }  the very first passage should be short
 * @returns {{ href, label, sub, minutes, kind, why } | null}
 */
export function nextFor(petId, world, opts = {}) {
  try {
    if (petId === 'chai') return readingNext(world, opts);
    if (petId === 'matcha') return wordsNext(world);
    if (petId === 'mochi') return verbalNext(world, 'ps', 'table', 'summaries', 'pc', 'The summary table');
    if (petId === 'ginger') return verbalNext(world, 'pj', 'loom', 'jumbles', 'sp', 'The workshop');
    if (petId === 'mallow') return verbalNext(world, 'ooo', 'bench', 'sets', null, 'The observatory');
    if (petId === 'toffee') return { href: '#/world/place/wilds', label: 'Run the Gauntlet', sub: 'Everything at once, fast · about 8 min', minutes: 8, kind: 'new' };
  } catch { /* the pet's place screen is always a fallback */ }
  return null;
}

/** The "More with {pet}" list: the pet's places and side shelves. */
export function cornersOf(petId, world) {
  const { content, records, state } = world ?? {};
  const has = (type) => (content?.[type] ?? []).length > 0;
  const c = (href, label, sub) => ({ href, label, sub });
  if (petId === 'chai') {
    const out = [c('#/world/place/reading-room', 'The Reading House', 'Every passage, stage by stage')];
    try {
      const missed = missedQuestions(sessionsOf(records), readingWeakness(sessionsOf(records)), state?.now);
      if (missed.length >= 4) out.push(c('#/rc/second-look', 'The second look', `${missed.length} questions that got away`));
    } catch { /* no second look today */ }
    if (has('cr')) out.push(c('#/bank/session/cr/next', 'Arguments', BANK.cr[2]));
    return out;
  }
  if (petId === 'matcha') {
    return [
      c('#/world/place/meadow', 'Word rounds', 'The CAT word lists, twelve at a time'),
      c('#/world/place/pond', 'Look-alike twins', 'Words that look alike and mean different things'),
      c('#/world/place/thicket', 'Borrowed words', 'English words that came from other languages'),
      c('#/world/place/rootwood', 'Root families', 'Take one root apart and a family of words opens'),
      c('#/world/place/terraces', 'Word parts', 'Prefixes, suffixes and words you were never shown'),
    ];
  }
  if (petId === 'mochi') return [c('#/world/place/table', 'The summary table', 'Every summary, tier by tier'), ...(has('pc') ? [c('#/bank/session/pc/next', 'Paragraph completion', BANK.pc[2])] : [])];
  if (petId === 'ginger') return [c('#/world/place/loom', 'The workshop', 'Every jumble, tier by tier'), ...(has('sp') ? [c('#/bank/session/sp/next', 'Sentence placement', BANK.sp[2])] : [])];
  if (petId === 'mallow') return [c('#/world/place/bench', 'The observatory', 'Every odd-one-out set, tier by tier')];
  if (petId === 'toffee') return [c('#/world/place/wilds', 'The Gauntlet', 'Everything at once, against the clock'), c('#/world/place/hearth', 'Records', 'Your days, your stars, your treasures')];
  return [];
}
