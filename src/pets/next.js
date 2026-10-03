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

import { nextPassage, nextVerbal, nextFamily, readingWeakness, missedQuestions, typeName } from '../world/curator.js';
import { STAGE_INFO } from '../core/learning/journey.js';

const BANK = {
  sp: ['sp', 'Sentence placement', 'A paragraph with one sentence taken out. Find the one seat it can take', 5],
  pc: ['pc', 'Paragraph completion', 'A paragraph that stops one sentence early. Decide what the gap needs', 5],
  cr: ['cr', 'Arguments', 'Find the assumption, weaken the link, name the flaw', 4],
};

const FIRST_PASSAGE = 'rc-0116';
const dayN = (state) => Number(String(state?.today ?? '').replace(/\D/g, '').slice(-4)) || 0;
const sessionsOf = (records) => (Array.isArray(records?.sessions) ? records.sessions : []);

function bankActivity(type, state) {
  const [, label, sub, mins] = BANK[type];
  const b = state?.banks?.[type];
  const left = Math.max(0, (b?.total ?? 0) - (b?.solved ?? 0));
  return { href: `#/bank/session/${type}/next`, label, sub: `${sub} · about ${mins} min${left ? ` · ${left} left` : ''}`, minutes: mins, kind: b?.solved ? 'new' : 'first' };
}

/**
 * The set a verbal friend hands over: the curator's pick, then the two it
 * would pick next. Three, not a whole tier of nine to thirteen, because a set
 * is something you finish in one sitting and the friend's thanks lands at
 * the end of it (the owner, 3.3: "1 RC or 3 odd man out"). Asking nextVerbal
 * again with the picked items set aside keeps every rule it already has:
 * unsolved before solved, fresh before missed, a miss only once it has
 * rested, the same tier before the next one up the ladder.
 * The place screen calls this too, so its button and the friend's card
 * always name the same three.
 * @returns {{ recs: Array<{ item, kind, why }>, href: string, minutes: number }|null}
 */
export function verbalTrio(items, sessions, mod, seed, now) {
  const recs = [];
  let pool = items;
  while (recs.length < 3) {
    const rec = nextVerbal(pool, sessions, mod, seed, now);
    // Past the first, only work still to do: a set of new work is never
    // padded with something already solved.
    if (!rec || (recs.length && rec.kind === 'again' && recs[0].kind !== 'again')) break;
    recs.push(rec);
    pool = pool.filter((x) => x.id !== rec.item.id);
  }
  if (!recs.length) return null;
  // The boot index carries minutes; a loaded item carries seconds.
  const secs = recs.reduce((n, { item: x }) => n + (x.estimated_time_sec ?? (x.estimated_time_min ? x.estimated_time_min * 60 : 80)), 0);
  return { recs, href: `#/${mod}/session/${recs.map((r) => r.item.id).join(',')}`, minutes: Math.max(1, Math.round(secs / 60)) };
}

/**
 * A verbal pet's next set: three of its module (verbalTrio), or — once the
 * module has been tried — its bank when nothing in the bank is solved yet,
 * and every third day after that (meeting a new kind of question beats a
 * fourth set of the same kind; a brand-new learner meets the core type first).
 */
function verbalNext(world, mod, slug, unit, bankType, placeLabel) {
  const { content, records, state } = world;
  if (bankType && (content?.[bankType] ?? []).length && (state?.[slug]?.sessions ?? 0) > 0
    && (!(state?.banks?.[bankType]?.solved > 0) || dayN(state) % 3 === 0)) return bankActivity(bankType, state);
  const trio = verbalTrio(content?.[mod] ?? [], sessionsOf(records), mod, `${slug}:${state?.today}`, state?.now);
  if (!trio) return { href: `#/world/place/${slug}`, label: placeLabel, sub: `Every ${unit.replace(/s$/, '')} in one place`, minutes: 5, kind: 'new' };
  const [{ item: it, kind, why }] = trio.recs;
  const n = trio.recs.length;
  const tierWord = String(it.tier ?? '').replace('-', ' ');
  const sub = n > 1 ? `${tierWord} · ${n} ${unit} · about ${trio.minutes} min` : `${tierWord} · about ${trio.minutes} min`;
  return { href: trio.href, label: it.title, sub, minutes: trio.minutes, kind, why };
}

function readingNext(world, opts) {
  const { content, records, state } = world;
  const rd = state?.reading;
  if (opts.first || !rd?.read) {
    // The very first passage is chosen by hand: short, everyday, with a twist (a queue that felt like an hour).
    const p = content?.rc?.find((x) => x.id === FIRST_PASSAGE)
      ?? [...(content?.rc ?? [])].filter((x) => x.stage === 'foundation').sort((a, b) => (a.word_count ?? 999) - (b.word_count ?? 999))[0] ?? content?.rc?.[0];
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

/**
 * What the friend noticed: one sentence built from the learner's own
 * records, so the friend talks like a tutor who was paying attention.
 * @param {string} petId
 * @param {object} world  { content, records, state }
 * @param {object|null} next  nextFor(petId, world)
 */
export function noticeFor(petId, world, next) {
  try {
    const { records, state } = world ?? {};
    const sessions = sessionsOf(records);
    const mins = next?.minutes ? `about ${Math.max(1, Math.round(next.minutes))} minutes` : 'a few minutes';
    if (petId === 'toffee') {
      const f = state?.pets?.flame;
      if (f?.today) return 'You already kept the fire today! Fancy the Gauntlet? Thirty quick questions, three minutes.';
      if (f?.days) return `Your fire is ${f.days} ${f.days === 1 ? 'day' : 'days'} strong. Help any friend today and it grows.`;
      return 'Help any friend today and I will light your very first fire.';
    }
    if (petId === 'chai') {
      if (!state?.reading?.read) return `I picked a short one to start: ${next?.sub ?? mins}.`;
      if (next?.kind === 'retry' && next.href === '#/rc/second-look') return 'A few questions got away last time. I saved them so we can look again, together.';
      const w = readingWeakness(sessions);
      if (w.answered >= 8 && w.weakest) return `I noticed ${typeName(w.weakest)} questions trip you up most. I picked a passage with some.`;
      return next ? `I picked "${next.label}" for you. ${mins.replace(/^a/, 'A')}.` : 'Every passage is waiting on the shelves.';
    }
    if (petId === 'matcha') {
      const due = (state?.meadow?.due ?? 0) + (state?.pond?.due ?? 0) + (state?.thicket?.due ?? 0);
      if (due >= 5) return `${due} of your words are starting to fade. Two minutes and they are safe again.`;
      if ((state?.rootwood?.dueCount ?? 0) > 0) return 'A root family is ready to revisit. Spacing is how roots hold.';
      if (!(state?.meadow?.met)) return 'Twelve words, picked just for you. Some come inside real CAT sentences.';
      return `You know ${state.meadow.known + (state.pond?.known ?? 0) + (state.thicket?.known ?? 0)} words now. Let us grow a few more.`;
    }
    const mods = { mochi: ['ps', 'pc'], ginger: ['pj', 'sp'], mallow: ['ooo'] }[petId] ?? [];
    const mine = sessions.filter((s) => mods.includes(s?.module) && s.score?.total).sort((a, b) => String(b.finished_at).localeCompare(String(a.finished_at)));
    const lastRun = mine[0];
    if (!lastRun) return `We start gentle: ${next?.label ?? 'the first set'}, ${mins}.`;
    const { correct = 0, total = 0 } = lastRun.score;
    if (next?.kind === 'retry') return `Last time you got ${correct} of ${total}. I saved the ones that got away.`;
    if (total && correct / total >= 0.8) return `Last time you got ${correct} of ${total}. You are ready for something harder!`;
    return `Last time you got ${correct} of ${total}. This set practises exactly that.`;
  } catch { return ''; }
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
  if (petId === 'mochi') return [c('#/world/place/table', 'Para Summary: the archery cabin', 'Every summary, tier by tier'), ...(has('pc') ? [c('#/world/place/completion', 'Para Completion: the clock tower', BANK.pc[2])] : [])];
  if (petId === 'ginger') return [c('#/world/place/loom', 'Para Jumbles: the workshop', 'Every jumble, tier by tier'), ...(has('sp') ? [c('#/world/place/placement', 'Sentence Placement: the rose cottage', BANK.sp[2])] : [])];
  if (petId === 'mallow') return [c('#/world/place/bench', 'The observatory', 'Every odd-one-out set, tier by tier')];
  if (petId === 'toffee') return [c('#/world/place/wilds', 'The Gauntlet', 'Everything at once, against the clock'), c('#/world/place/hearth', 'Records', 'Your days, your stars, your treasures')];
  return [];
}
