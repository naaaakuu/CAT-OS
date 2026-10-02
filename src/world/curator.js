/**
 * curator.js — the mind behind the valley. Nothing in CAT OS asks the
 * learner to browse a library: the curator decides what is worth meeting
 * next, out of ~3,900 words, 51 root families, 32 passages and 59 verbal
 * items, and it decides on four things at once:
 *
 *   MASTERY   what is already known is not shown again until it fades
 *   SPACING   what is due today outranks everything new
 *   REACH     difficulty tracks what the learner actually performs at,
 *             never what they claim
 *   VARIETY   a round is never all one shape, and never the same twice
 *
 * On top of those it keeps a quiet WEAKNESS model: which kinds of
 * question go wrong, which words keep slipping, which verbal traps keep
 * working. The learner never sees a chart of it. They see the valley
 * offering exactly the thing they are worst at, in the valley's voice.
 *
 * Everything here is pure over (records, content, ledger); the screens
 * pass what they already loaded.
 */

import { loadLexItem, loadTwinItem, loadLoanItem } from '../core/content-loader/loader.js';
import { rng } from './engine/palette.js';
import { isRested, passagesForSkill, passagesForPattern, patternLedger, weakPatterns } from '../core/learning/review.js';
import { RC_TYPE_SKILL } from '../core/learning/taxonomy.js';
import { wordStatus, REGION_KIND, ROUND_SIZE } from './lexicon.js';

/* ------------------------------------------------------------------ */
/* Reach — how hard the learner can currently work                     */
/* ------------------------------------------------------------------ */

export const RC_STAGES = Object.freeze(['foundation', 'developing', 'intermediate', 'advanced', 'elite']);
export const VERBAL_TIERS = Object.freeze(['beginner', 'foundation', 'easy', 'medium', 'advanced', 'cat', 'cat-plus', 'ninety-nine', 'premium']);

/**
 * The stage of Reading Comprehension the learner has earned. A stage
 * opens when two of its passages have been read at two stars or better;
 * the curator then offers the NEXT stage, so the reader is always a
 * little above where they are comfortable — and never more than that.
 */
export function rcReach(content, best) {
  let reach = 0;
  for (let i = 0; i < RC_STAGES.length; i += 1) {
    const well = content.rc.filter((p) => p.stage === RC_STAGES[i] && (best.get(p.id)?.stars ?? 0) >= 2).length;
    if (well >= 2) reach = Math.min(RC_STAGES.length - 1, i + 1);
  }
  return reach;
}

/**
 * The lexicon bands in play, with weights. High-frequency words are the
 * backbone forever (they are what CAT actually asks); medium joins once
 * the learner holds 120 high words, low once they hold 120 medium.
 */
export function bandMix(summaryByBand) {
  const high = summaryByBand.high ?? 0;
  const medium = summaryByBand.medium ?? 0;
  if (medium >= 120) return { high: 0.4, medium: 0.35, low: 0.25 };
  if (high >= 120) return { high: 0.6, medium: 0.4, low: 0 };
  return { high: 1, medium: 0, low: 0 };
}

/* ------------------------------------------------------------------ */
/* Weakness — learned quietly from what actually went wrong            */
/* ------------------------------------------------------------------ */

const TYPE_NAMES = Object.freeze({
  main_idea: 'the main idea',
  inference: 'inference',
  author_purpose: 'the author’s purpose',
  vocabulary_in_context: 'words in context',
  specific_detail: 'detail',
  paragraph_function: 'what a paragraph is doing',
  tone: 'tone',
  logical_structure: 'the shape of the argument',
  strengthen_weaken: 'strengthening and weakening',
  title_selection: 'the title',
  primary_purpose: 'the primary purpose',
  author_attitude: 'the author’s attitude',
  except: 'EXCEPT questions',
  not_true: 'what is NOT true',
  phrase_in_context: 'a phrase in context',
  implication: 'implication',
  must_be_true: 'what must be true',
  cannot_be_inferred: 'what cannot be inferred',
  agree_disagree: 'what the author would agree with',
  application: 'applying the author’s rule',
  comparative: 'comparisons',
  strengthen: 'strengthening',
  weaken: 'weakening',
  assumption: 'the assumption',
  role_of_detail: 'why the author mentions something',
  relationship: 'the relationship between two ideas',
  best_characterization: 'how the passage is best characterised',
  scope: 'scope',
});

export function typeName(t) { return TYPE_NAMES[t] ?? String(t ?? '').replace(/_/g, ' '); }

/**
 * What the reader is weak at, from their own answers alone.
 * @param {Array} sessions  the sessions store
 * @returns {{ byType: Map<string,{n,correct,acc}>, weakest: string|null, strongest: string|null, answered: number }}
 */
export function readingWeakness(sessions) {
  const byType = new Map();
  let answered = 0;
  /* THE SECOND LOOK IS READING. The guard used to be `if (s.module) continue`,
     which threw away every second-look session — the same passages, the same
     questions, the same `type` on every answer, chosen precisely because the
     learner got them wrong the first time. The most diagnostic evidence in
     the product was the evidence being discarded. What actually has to be
     excluded is an answer whose `type` is not a reading question type at all,
     and the taxonomy names all twenty-seven of those. */
  for (const s of sessions) {
    for (const a of (Array.isArray(s?.answers) ? s.answers : []).filter((a) => a && typeof a === 'object')) {
      if (!a.type || a.is_correct === null || !(a.type in RC_TYPE_SKILL)) continue;
      answered += 1;
      const e = byType.get(a.type) ?? { n: 0, correct: 0, acc: 0 };
      e.n += 1;
      if (a.is_correct) e.correct += 1;
      e.acc = e.correct / e.n;
      byType.set(a.type, e);
    }
  }
  // A type only counts as weak once it has been met at least three times,
  // so one bad morning never redirects the whole curriculum.
  const ranked = [...byType.entries()].filter(([, e]) => e.n >= 3).sort((a, b) => a[1].acc - b[1].acc);
  /* And one level finer than the type. A skill is "inference"; a reasoning
     PATTERN is "inference versus speculation" or "inference from a
     concession", and every v5 question names the patterns it exercises.
     patternLedger has been counting them since the content engine shipped
     and passagesForPattern has been sitting unused beside it. */
  const pattern = weakPatterns(patternLedger(sessions ?? []), { min: 5, below: 0.65, n: 1 })[0] ?? null;
  return {
    byType,
    answered,
    pattern,
    weakest: ranked.length && ranked[0][1].acc < 0.7 ? ranked[0][0] : null,
    strongest: ranked.length ? ranked[ranked.length - 1][0] : null,
  };
}

/** How the valley says "you keep missing inference" without saying it. */
export function weaknessLine(weakest) {
  if (!weakest) return '';
  const lines = {
    main_idea: 'This one keeps its point in the last line. Read for what the writer is actually claiming.',
    inference: 'Nothing here is stated outright. What follows from the text is the whole question.',
    author_purpose: 'Ask what the writer is doing, not only what they are saying.',
    vocabulary_in_context: 'Two words in this one mean something narrower than usual.',
    specific_detail: 'The detail questions here reward reading once, closely.',
    paragraph_function: 'Watch what each paragraph is FOR, not just what it contains.',
    tone: 'The writer is not neutral. Hear where they stand.',
    logical_structure: 'Follow the shape of the argument: claim, support, turn.',
    strengthen_weaken: 'Find the load-bearing assumption, then lean on it.',
  };
  return lines[weakest] ?? '';
}

/* ------------------------------------------------------------------ */
/* Reading Comprehension                                               */
/* ------------------------------------------------------------------ */

/**
 * The next passage the Reading Room should offer. Three rules, in order:
 *   1. an unread passage at the learner's reach
 *   2. failing that, a passage read at 0 or 1 star, worth a second run
 *   3. failing that, the best passage to re-read for pace
 * When the reader has a measured weakness the curator prefers a passage
 * whose stage is right AND whose difficulty is not the very hardest, so
 * the weakness gets practised rather than punished.
 *
 * @returns {{ item, why, kind: 'new'|'retry'|'pace' }|null}
 */
export function nextPassage(content, best, weakness, seed = 'rc') {
  const r = rng(seed);
  const reach = rcReach(content, best);
  const stage = RC_STAGES[reach];
  const unread = content.rc.filter((p) => !best.has(p.id));

  const atReach = unread.filter((p) => p.stage === stage);
  const below = unread.filter((p) => RC_STAGES.indexOf(p.stage) < reach);
  let pool = atReach.length ? atReach : below.length ? below : unread;
  // If one question type keeps getting away, the next passage should
  // actually ASK that type — saying so in a line and then handing over a
  // passage that never tests it is advice, not teaching.
  if (weakness?.weakest) {
    /* `weakest` is a question TYPE (readingWeakness buckets answers by
       `a.type`), but a v5 registry row lists `skills_trained` — SKILL keys.
       They coincide for the original nine names and differ for the rest, so
       aiming a type straight at passagesForSkill matched nothing for most of
       the 27 types: the aiming silently returned an empty list and the pool
       was left alone, while the Reading House went on telling the learner
       their answers were "used to choose what you read next". The taxonomy
       already carries the mapping both the schema and the ledger use. */
    const key = RC_TYPE_SKILL[weakness.weakest] ?? weakness.weakest;
    const aimed = passagesForSkill(pool, key, best);
    if (aimed.length) pool = aimed;

    /* ONE LEVEL FINER. A skill is "inference"; a reasoning PATTERN is
       "inference versus speculation" or "inference from a concession", and
       the content engine tags every v5 question with the patterns it
       exercises. `patternLedger` has been counting how the learner does on
       each of the hundred and fifty-two since the engine shipped, and
       `passagesForPattern` has been sitting here unused.
       Narrowing inside the already-aimed pool means this can only ever make
       the choice sharper, never emptier: if no passage in the pool exercises
       the pattern, the skill-level aim stands. */
    if (weakness.pattern) {
      const finer = passagesForPattern(pool, weakness.pattern.key, best);
      if (finer.length) pool = finer;
    }
  }
  if (pool.length) {
    // Easiest-first within the stage keeps the ladder honest.
    const sorted = [...pool].sort((a, b) => (a.difficulty_numeric ?? 5) - (b.difficulty_numeric ?? 5) || a.id.localeCompare(b.id));
    const item = sorted[Math.min(sorted.length - 1, Math.floor(r() * Math.min(2, sorted.length)))];
    return { item, kind: 'new', why: whyNew(item, stage, weakness) };
  }

  const weak = [...best.entries()].filter(([, b]) => b.stars <= 1)
    .map(([id, b]) => ({ item: content.rc.find((p) => p.id === id), b })).filter((x) => x.item);
  if (weak.length) {
    weak.sort((a, b) => a.b.stars - b.b.stars || a.b.accuracy - b.b.accuracy);
    return { item: weak[0].item, kind: 'retry', why: 'You read this one before the marks were there. It is worth a second run.' };
  }

  const slow = [...best.entries()].filter(([, b]) => b.stars === 2 && !b.inTime)
    .map(([id]) => content.rc.find((p) => p.id === id)).filter(Boolean);
  if (slow.length) return { item: slow[Math.floor(r() * slow.length)], kind: 'pace', why: 'Accurate last time, but over the clock. Read it again for the third star.' };

  const all = content.rc;
  return all.length ? { item: all[Math.floor(r() * all.length)], kind: 'pace', why: 'Every passage is read. Take one again, faster.' } : null;
}

function whyNew(item, stage, weakness) {
  if (weakness?.weakest) {
    const line = weaknessLine(weakness.weakest);
    if (line) return line;
  }
  const s = { foundation: 'Gentle and concrete: the reading habit first.', developing: 'One clean argument, followed end to end.', intermediate: 'Two ideas in tension. Hold both.', advanced: 'Dense, and it does not repeat itself.', elite: 'CAT at its hardest. Take the time it asks for.' };
  return s[item.stage ?? stage] ?? '';
}

/* ------------------------------------------------------------------ */
/* The word regions: Meadow, Mirror Pond, Thicket                      */
/* ------------------------------------------------------------------ */

const BANDS = ['high', 'medium', 'low'];

/**
 * Build a round for a word region WITHOUT the learner choosing a file.
 * The curator assembles twelve words from wherever they are:
 *
 *   due       words whose spacing has elapsed, most overdue first   (up to 7)
 *   shaky     words missed recently and not yet recovered           (up to 3)
 *   new       words never met, from the bands the learner has reached
 *
 * It loads only the bundles it needs (each ~10 KB) and never more than
 * four, so a round opens fast on a phone.
 *
 * @param {'meadow'|'pond'|'thicket'} region
 * @param {Array}  fields   listFields(region) rows
 * @param {Map}    ledger   entry_id → mastery record
 * @param {object} [opts]   { n, now, seed }
 * @returns {Promise<{ entries, bundles: Map, primary, counts, title, line }>}
 */
export async function composeRound(region, fields, ledger, opts = {}) {
  const n = opts.n ?? ROUND_SIZE;
  const now = opts.now ?? Date.now();
  const r = rng(opts.seed ?? `round:${now}`);
  const kind = REGION_KIND[region];
  const load = kind === 'lex' ? loadLexItem : kind === 'twin' ? loadTwinItem : loadLoanItem;

  /* Which of this learner's records belong to this region, and are due. */
  const mine = [...ledger.values()].filter((rec) => rec.region === region);
  const due = mine.filter((rec) => rec.next_at && Date.parse(rec.next_at) <= now)
    .sort((a, b) => Date.parse(a.next_at) - Date.parse(b.next_at));
  const shaky = mine.filter((rec) => (rec.level ?? 0) <= 1 && rec.streak === 0 && !due.includes(rec))
    .sort((a, b) => Date.parse(a.last_at ?? 0) - Date.parse(b.last_at ?? 0));

  const wantDue = Math.min(due.length, Math.ceil(n * 0.58));
  const wantShaky = Math.min(shaky.length, Math.max(0, Math.ceil(n * 0.25) - Math.max(0, wantDue - Math.ceil(n * 0.58))));
  const picked = [...due.slice(0, wantDue), ...shaky.slice(0, wantShaky)];

  /* Which bundles do we need for those, plus where new words should come from. */
  const needed = new Set(picked.map((rec) => rec.bundle_id).filter(Boolean));
  const seenByBundle = new Map();
  for (const rec of mine) seenByBundle.set(rec.bundle_id, (seenByBundle.get(rec.bundle_id) ?? 0) + 1);

  const newWanted = Math.max(0, n - picked.length);
  let newSource = null;
  if (newWanted > 0) {
    newSource = pickGrowthField(region, fields, seenByBundle, mine, r);
    if (newSource) needed.add(newSource.id);
  }
  // Never open more than four files for one round.
  const order = [...needed].slice(0, 4);
  const bundles = new Map();
  await Promise.all(order.map(async (id) => { try { bundles.set(id, await load(id)); } catch { /* skip */ } }));

  /* Resolve the picked records to real entries. */
  const entryById = new Map();
  for (const b of bundles.values()) for (const e of b.entries) entryById.set(e.id, { entry: e, bundle: b });
  const chosen = [];
  const seen = new Set();
  for (const rec of picked) {
    const hit = entryById.get(rec.entry_id);
    if (!hit || seen.has(rec.entry_id)) continue;
    seen.add(rec.entry_id);
    chosen.push({ ...hit, status: due.includes(rec) ? 'due' : 'shaky' });
    if (chosen.length >= n) break;
  }

  /* Fill with new words from the growth field, then anything unmet. */
  if (chosen.length < n) {
    const pools = [];
    if (newSource && bundles.has(newSource.id)) pools.push(bundles.get(newSource.id));
    for (const b of bundles.values()) if (!pools.includes(b)) pools.push(b);
    for (const b of pools) {
      const fresh = b.entries.filter((e) => !ledger.has(e.id) && !seen.has(e.id));
      shuffle(fresh, r);
      for (const e of fresh) {
        if (chosen.length >= n) break;
        seen.add(e.id);
        chosen.push({ entry: e, bundle: b, status: 'new' });
      }
      if (chosen.length >= n) break;
    }
  }

  /* Still short (a tiny region): take the least-recently-seen. */
  if (chosen.length < n) {
    const rest = [...entryById.values()].filter((h) => !seen.has(h.entry.id));
    shuffle(rest, r);
    for (const h of rest) { if (chosen.length >= n) break; seen.add(h.entry.id); chosen.push({ ...h, status: 'again' }); }
  }

  /* Three of the twelve are the question CAT actually asks: a word inside
     a real sentence, from the context pack. They are drawn from their own
     pool (the pack overlaps the word lists barely at all) and carry their
     own mastery, so the Meadow's flowers still count only Meadow words. */
  if (opts.context?.entries?.length) {
    const pack = opts.context.entries;
    const want = Math.min(3, Math.max(0, chosen.length - 6));
    const ctxDue = [...ledger.values()].filter((rec) => rec.bundle_id === 'context' && rec.next_at && Date.parse(rec.next_at) <= now);
    const dueIds = new Set(ctxDue.map((rec) => rec.entry_id));
    const scored = pack.map((e) => ({ e, pri: dueIds.has(e.id) ? 2 : ledger.has(e.id) ? 0 : 1 }));
    shuffle(scored, r);
    scored.sort((a, b) => b.pri - a.pri);
    const take = scored.slice(0, want).map((s) => s.e);
    for (let i = 0; i < take.length; i += 1) {
      chosen[chosen.length - 1 - i] = { context: take[i], bundle: null, status: dueIds.has(take[i].id) ? 'due' : 'context' };
    }
  }

  shuffle(chosen, r);
  const counts = {
    due: chosen.filter((c) => c.status === 'due').length,
    shaky: chosen.filter((c) => c.status === 'shaky').length,
    new: chosen.filter((c) => c.status === 'new').length,
    context: chosen.filter((c) => c.context).length,
  };
  const primary = bundles.get(newSource?.id) ?? bundles.values().next().value ?? null;
  return { entries: chosen, bundles, primary, counts, ...roundVoice(region, counts, newSource) };
}

/** Where new words should come from next: the band the learner has
 *  reached, and inside it the field with the most untouched entries. */
function pickGrowthField(region, fields, seenByBundle, mine, r) {
  if (!fields.length) return null;
  if (region !== 'meadow') {
    // Pond and Thicket are small; take the least-touched field.
    const scored = fields.map((f) => ({ f, left: (f.total ?? 0) - (seenByBundle.get(f.id) ?? 0) }));
    scored.sort((a, b) => b.left - a.left);
    const top = scored.slice(0, 3).filter((s) => s.left > 0);
    return (top[Math.floor(r() * top.length)] ?? scored[0])?.f ?? null;
  }
  const byBand = { high: 0, medium: 0, low: 0 };
  for (const rec of mine) {
    const b = BANDS.find((x) => (rec.bundle_id ?? '').includes(`-${x}-`)) ?? 'high';
    if ((rec.level ?? 0) >= 2) byBand[b] += 1;
  }
  const mix = bandMix(byBand);
  // Choose a band by weight, then the field inside it with the most left.
  let roll = r();
  let band = 'high';
  for (const b of BANDS) { const w = mix[b] ?? 0; if (roll < w) { band = b; break; } roll -= w; }
  let pool = fields.filter((f) => f.group === band);
  if (!pool.length) pool = fields.filter((f) => f.group === 'high');
  if (!pool.length) pool = fields;
  const scored = pool.map((f) => ({ f, left: (f.total ?? 0) - (seenByBundle.get(f.id) ?? 0) })).filter((s) => s.left > 0);
  if (!scored.length) return pool[Math.floor(r() * pool.length)];
  scored.sort((a, b) => b.left - a.left);
  const top = scored.slice(0, 4);
  return top[Math.floor(r() * top.length)].f;
}

/** The round's own title and one line, written from what it contains. */
function roundVoice(region, counts, source) {
  const place = { meadow: 'the Meadow', pond: 'the Mirror Pond', thicket: 'the Thicket' }[region] ?? 'the village';
  const Place = place[0].toUpperCase() + place.slice(1);
  const inContext = counts.context
    ? ` ${counts.context === 1 ? 'One of them is' : `${counts.context} of them are`} asked the way CAT asks: inside a real sentence.`
    : '';
  if (counts.due >= 7) return { title: 'Words that are fading', line: `These were yours once. ${Place} is asking for them back before they go.${inContext}` };
  if (counts.due >= 3) return { title: 'A mixed handful', line: `Some due for review, some you have never met. This is how ${place} keeps what it grows.${inContext}` };
  if (counts.new >= 6) return { title: source?.name ? `New words${source.groupLabel ? ` · ${source.groupLabel}` : ''}` : 'New words', line: `Words you have not met. Answer from what you know: the misses teach you the rest.${inContext}` };
  return { title: 'A handful from ' + place, line: `Twelve to work through.${inContext}` };
}

function shuffle(arr, r) {
  for (let i = arr.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

/* ------------------------------------------------------------------ */
/* The Quarter: para jumbles, summary, odd one out                     */
/* ------------------------------------------------------------------ */

/**
 * The next verbal item: the lowest tier that still holds something
 * unsolved, so the ladder is climbed rung by rung; inside a tier, the
 * item never tried comes before the one tried and missed.
 * @returns {{ item, why, kind }|null}
 */
export function nextVerbal(registry, sessions, moduleKey, seed = 'v', now = Date.now()) {
  const solved = new Set(), tried = new Set();
  // When each item was last missed, and how often — a set handed straight
  // back measures which order the learner remembers, not whether they can
  // find it. See core/learning/review.js.
  const miss = new Map();
  const ordered = [...sessions].sort((a, b) => String(a.finished_at ?? '').localeCompare(String(b.finished_at ?? '')));
  for (const s of ordered) {
    if (s.module !== moduleKey) continue;
    for (const a of (Array.isArray(s?.answers) ? s.answers : []).filter((a) => a && typeof a === 'object')) {
      const id = a.item_id ?? a.question_id;
      if (a.is_correct !== null) tried.add(id);
      if (a.is_correct === true) solved.add(id);
      else if (a.is_correct === false) {
        const m = miss.get(id) ?? { n: 0, at: null };
        m.n += 1; m.at = s.finished_at ?? m.at;
        miss.set(id, m);
      }
    }
  }
  const rested = (id) => { const m = miss.get(id); return !m || isRested(m.at, m.n, now); };
  const byTier = new Map();
  for (const it of registry) {
    const t = it.tier ?? 'medium';
    if (!byTier.has(t)) byTier.set(t, []);
    byTier.get(t).push(it);
  }
  const order = VERBAL_TIERS.filter((t) => byTier.has(t)).concat([...byTier.keys()].filter((t) => !VERBAL_TIERS.includes(t)));
  const r = rng(seed);
  for (const t of order) {
    const items = byTier.get(t);
    const fresh = items.filter((i) => !tried.has(i.id));
    if (fresh.length) {
      const it = fresh.sort((a, b) => (a.difficulty_numeric ?? 5) - (b.difficulty_numeric ?? 5) || a.id.localeCompare(b.id))[0];
      return { item: it, kind: 'new', why: tierLine(t) };
    }
    const missed = items.filter((i) => tried.has(i.id) && !solved.has(i.id) && rested(i.id));
    if (missed.length) return { item: missed[Math.floor(r() * missed.length)], kind: 'retry', why: 'You have seen this one and it got away. Enough time has passed to mean something.' };
  }
  // Everything is either solved or still resting: take a solved one again,
  // against the clock, which is the other half of what CAT asks.
  const all = registry.filter((i) => rested(i.id));
  const pool = all.length ? all : registry;
  return pool.length ? { item: pool[Math.floor(r() * pool.length)], kind: 'again', why: 'Every rung is clear. Take one again, against the clock.' } : null;
}

const TIER_LINES = {
  beginner: 'The opening rung. Learn the moves.',
  foundation: 'The opening rung. Learn the moves.',
  easy: 'Clear links, plainly signalled.',
  medium: 'The signals get quieter here.',
  advanced: 'Two orders will look right. Only one is.',
  cat: 'Exam weight. Take the whole minute.',
  'cat-plus': 'Above exam weight.',
  'ninety-nine': 'The percentile rung.',
  premium: 'The hardest the village holds.',
};
function tierLine(t) { return TIER_LINES[t] ?? ''; }

/* ------------------------------------------------------------------ */
/* The Rootwood                                                        */
/* ------------------------------------------------------------------ */

/**
 * The family to walk next: anything due outranks anything new, and new
 * families come in the order the wood was planted (the content's own
 * teaching order).
 */
export function nextFamily(rootwood) {
  const due = rootwood.families.filter((f) => f.due !== 'none')
    .sort((a, b) => String(a.nextReviewAt).localeCompare(String(b.nextReviewAt)));
  if (due.length) return { family: due[0], kind: 'due', why: `${due.length} famil${due.length === 1 ? 'y is' : 'ies are'} ready to revisit. Spacing is where roots hold.` };
  const fresh = rootwood.families.filter((f) => f.stage === 'open_ground');
  if (fresh.length) return { family: fresh[0], kind: 'new', why: 'A root you have not taken apart yet. One root, a whole family of words.' };
  const young = rootwood.families.filter((f) => f.stage !== 'ancient').sort((a, b) => String(a.nextReviewAt ?? '').localeCompare(String(b.nextReviewAt ?? '')));
  return young.length ? { family: young[0], kind: 'grow', why: 'Walk it again and it grows older.' } : null;
}

/* ------------------------------------------------------------------ */
/* One sentence about the whole learner, for the Hearth                */
/* ------------------------------------------------------------------ */

/** The honest read on where this learner stands, in the valley's voice. */
export function standing(state, weakness) {
  const out = [];
  if (state.reading.read === 0) out.push('You have not read a passage yet. That is where the marks are.');
  else out.push(`${state.reading.read} of ${state.reading.passages} passages read, ${state.reading.threeStar} of them at CAT pace.`);
  const words = state.meadow.known + state.pond.known + state.thicket.known;
  if (words) out.push(`${words} words held in memory, ${state.meadow.mastered + state.pond.mastered + state.thicket.mastered} of them for good.`);
  if (weakness?.weakest) out.push(`Your answers say ${typeName(weakness.weakest)} is the thing to work on.`);
  return out;
}

/* ------------------------------------------------------------------ */
/* The second look — the questions that got away                       */
/* ------------------------------------------------------------------ */

/**
 * Every Reading Comprehension question the learner has answered wrongly
 * and not since answered right, newest miss first. Derived from records
 * alone (no passage loading), so the Reading Room can offer the run
 * without paying for content it might not use.
 *
 * A question that has been missed more than once, or that belongs to the
 * learner's weakest type, is worth more: reviewing your own mistakes is
 * the highest-yield hour in CAT preparation, and this is that hour.
 *
 * @param {Array} sessions  the sessions store
 * @param {object} [weakness] readingWeakness(sessions), to weight by type
 * @returns {Array<{question_id, passage_id, type, misses, lastMissAt, weight}>}
 */
export function missedQuestions(sessions, weakness = null, now = Date.now()) {
  const byQ = new Map();
  const ordered = [...sessions].filter((s) => !s.module && s.finished_at)
    .sort((a, b) => String(a.finished_at).localeCompare(String(b.finished_at)));
  for (const s of ordered) {
    for (const a of (Array.isArray(s?.answers) ? s.answers : []).filter((a) => a && typeof a === 'object')) {
      if (a.is_correct === null || a.is_correct === undefined) continue;
      const id = a.question_id;
      if (!id) continue;
      const rec = byQ.get(id) ?? { question_id: id, passage_id: s.passage_id, type: a.type ?? null, misses: 0, lastMissAt: null, settled: false };
      if (a.type && !rec.type) rec.type = a.type;
      if (a.is_correct === true) rec.settled = true;
      else { rec.misses += 1; rec.settled = false; rec.lastMissAt = s.finished_at; }
      byQ.set(id, rec);
    }
  }
  const weak = weakness?.weakest ?? null;
  // A question missed ten minutes ago is RESTING: giving it back now
  // measures which letter they remember, not whether they can do it.
  // See core/learning/review.js — the rung grows with every miss.
  return [...byQ.values()]
    .filter((r) => !r.settled && r.misses > 0)
    .map((r) => ({ ...r, rested: isRested(r.lastMissAt, r.misses, now) }))
    .filter((r) => r.rested)
    .map((r) => ({ ...r, weight: r.misses * 2 + (r.type && r.type === weak ? 3 : 0) + (r.lastMissAt ? 1 : 0) }))
    .sort((a, b) => b.weight - a.weight || String(b.lastMissAt).localeCompare(String(a.lastMissAt)));
}

/** How the Reading Room offers the second look, in one line. */
export function secondLookLine(missed, weakness) {
  if (!missed.length) return '';
  const n = missed.length;
  const passages = new Set(missed.map((m) => m.passage_id)).size;
  if (weakness?.weakest) {
    return `${n} question${n === 1 ? '' : 's'} got away, from ${passages} passage${passages === 1 ? '' : 's'}several of them about ${typeName(weakness.weakest)}.`;
  }
  return `${n} question${n === 1 ? '' : 's'} got away, from ${passages} passage${passages === 1 ? '' : 's'}. The traps are the lesson.`;
}
