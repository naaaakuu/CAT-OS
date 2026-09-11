/**
 * lexicon.js — the vocabulary rounds of the Meadow (CAT word lists), the
 * Mirror Pond (confusable twins) and the Thicket (loanwords): how a round
 * is composed, how a question is built from real content, how mastery is
 * remembered, and how a round is scored and persisted.
 *
 * Content comes from the lexicon/twin/loan bundles (content/lexicon,
 * content/twins, content/loanwords) through the content loader. Nothing
 * is authored here: every question is assembled from the entries
 * themselves — the distractors are other entries of the same bundle, so
 * a round feels like one field of words, not random noise.
 *
 * Mastery is a per-entry ledger record in STORES.LEARNING:
 *   { id: 'lexm:<entry_id>', kind: 'lex-mastery', entry_id, region,
 *     bundle_id, seen, correct, streak, level, last_at, next_at }
 * Levels: 0 unmet · 1 met · 2 known · 3 mastered · 4 deep. A word climbs
 * one level per clean answer once its spacing interval has elapsed, and
 * drops one level on a miss — never below "met". The ledger is what the
 * Meadow's flowers, the Pond's koi and the Thicket's lanterns are drawn
 * from.
 */

import { listLexItems, loadLexItem, listTwinItems, loadTwinItem, listLoanItems, loadLoanItem } from '../core/content-loader/loader.js';
import { STORES } from '../core/storage/storage-adapter.js';
import { rng } from './engine/palette.js';
import { roundStars, EARN } from './economy.js';

export const REGION_KIND = Object.freeze({ meadow: 'lex', pond: 'twin', thicket: 'loan' });
export const ROUND_SIZE = 12;
export const TARGET_MS = Object.freeze({ meadow: 7000, pond: 8000, thicket: 7000 });

/** Spacing ladder for mastery (ms): the same conservative rungs the
 *  Rootwood uses, so the whole valley forgets on one clock. */
export const RUNGS_MS = Object.freeze([10 * 60_000, 24 * 3600_000, 3 * 24 * 3600_000, 7 * 24 * 3600_000, 21 * 24 * 3600_000]);

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const BAND_ORDER = { high: 0, medium: 1, low: 2 };
const BAND_LABEL = { high: 'High frequency', medium: 'Medium frequency', low: 'Low frequency' };

/** The fields of a region: registry rows with a display name and order. */
export async function listFields(region) {
  const kind = REGION_KIND[region];
  let rows = [];
  if (kind === 'lex') rows = await listLexItems();
  else if (kind === 'twin') rows = await listTwinItems();
  else rows = await listLoanItems();
  return rows.map((r) => ({
    id: r.id, kind, region,
    name: kind === 'lex' ? `${(r.letter ?? '').toUpperCase()}` : kind === 'twin' ? `${(r.letter ?? '').toUpperCase()}` : (r.language ?? r.title ?? r.id),
    group: kind === 'lex' ? (r.band ?? 'high') : kind === 'twin' ? 'twins' : 'languages',
    groupLabel: kind === 'lex' ? BAND_LABEL[r.band] ?? r.band : kind === 'twin' ? 'Confusable pairs' : 'By language',
    total: r.entry_count ?? 0,
    order: kind === 'lex' ? (BAND_ORDER[r.band] ?? 9) * 100 + (r.letter ?? 'z').charCodeAt(0) : kind === 'twin' ? (r.letter ?? 'z').charCodeAt(0) : 0,
    title: r.title,
  })).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export async function loadField(region, id) {
  const kind = REGION_KIND[region];
  if (kind === 'lex') return loadLexItem(id);
  if (kind === 'twin') return loadTwinItem(id);
  return loadLoanItem(id);
}

/* ------------------------------------------------------------------ */
/* Ledger                                                              */
/* ------------------------------------------------------------------ */

export function ledgerFromRecords(records) {
  const m = new Map();
  for (const r of records) if (r.kind === 'lex-mastery') m.set(r.entry_id, r);
  return m;
}

export async function loadLedger(storage) {
  const all = await storage.getAll(STORES.LEARNING);
  return ledgerFromRecords(all);
}

/** The level a word is displayed at (0–4), and whether it is due. */
export function wordStatus(rec, now = Date.now()) {
  if (!rec) return { level: 0, due: false };
  const due = rec.next_at ? Date.parse(rec.next_at) <= now : false;
  return { level: rec.level ?? 1, due };
}

/** Apply one answer to a ledger record (pure). */
export function applyAnswer(rec, entry, region, bundleId, correct, now = Date.now()) {
  const base = rec ?? { id: `lexm:${entry.id}`, kind: 'lex-mastery', module: 'lex', entry_id: entry.id, region, bundle_id: bundleId, seen: 0, correct: 0, streak: 0, level: 0, last_at: null, next_at: null };
  const seen = base.seen + 1;
  const wasDue = !base.next_at || Date.parse(base.next_at) <= now;
  let streak, level;
  if (correct) {
    streak = base.streak + 1;
    // Level climbs only when the spacing had actually elapsed — a word
    // answered twice in one minute is not twice as known.
    level = wasDue ? Math.min(4, Math.max(1, base.level) + 1) : Math.max(1, base.level);
    if (base.level === 0) level = wasDue ? 2 : 1;
  } else {
    streak = 0;
    level = Math.max(1, (base.level || 1) - 1);
  }
  const rung = Math.min(RUNGS_MS.length - 1, Math.max(0, level - 1));
  const next = new Date(now + (correct ? RUNGS_MS[rung] : RUNGS_MS[0])).toISOString();
  return { ...base, seen, correct: base.correct + (correct ? 1 : 0), streak, level, last_at: new Date(now).toISOString(), next_at: next };
}

/* ------------------------------------------------------------------ */
/* Round composition                                                   */
/* ------------------------------------------------------------------ */

/** Choose which entries of a field this round serves: due words first,
 *  then unmet, then the least recently seen — deterministic per session seed. */
export function pickRound(entries, ledger, now = Date.now(), n = ROUND_SIZE, seed = 'round') {
  const r = rng(seed);
  const scored = entries.map((e) => {
    const rec = ledger.get(e.id);
    const { level, due } = wordStatus(rec, now);
    const last = rec?.last_at ? Date.parse(rec.last_at) : 0;
    let pri = 0;
    if (rec && due) pri = 3 + (4 - level) * 0.1;
    else if (!rec) pri = 2;
    else pri = 1 + Math.min(0.9, (now - last) / (30 * 24 * 3600_000)); // older first
    return { e, pri: pri + r() * 0.05 };
  });
  scored.sort((a, b) => b.pri - a.pri);
  const chosen = scored.slice(0, Math.min(n, scored.length)).map((s) => s.e);
  // Shuffle the order of play so a round never begins with the same word.
  for (let i = chosen.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [chosen[i], chosen[j]] = [chosen[j], chosen[i]]; }
  return chosen;
}

function sample(arr, n, r, exclude = new Set()) {
  const pool = arr.filter((x) => !exclude.has(x));
  for (let i = pool.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n);
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const trimDot = (s) => String(s ?? '').trim().replace(/[.;]\s*$/, '');

/**
 * Build one question for an entry from its bundle.
 * Kinds: 'meaning' (word → meaning), 'reverse' (meaning → word),
 * 'synonym' (word → its synonym), 'antonym', 'twin' (sense → which word),
 * 'twin-meaning' (word → its sense), 'loan' (word → meaning),
 * 'origin' (word → language).
 * @returns {{kind, prompt, stem, options: [{text, correct}], entry, ask}}
 */
export function buildQuestion(entry, bundle, region, seed, languages = [], pool = null) {
  const r = rng(`${seed}:${entry.id}`);
  // Distractors come from the widest pool the round has open: a curated
  // round spans several bundles, so the wrong answers stop being "the
  // other words that begin with A" and start being real competition.
  const others = (pool ?? bundle.entries).filter((e) => e.id !== entry.id);
  if (region === 'pond') {
    // A twin set: senses per word. Ask which word fits the sense (the
    // real CAT skill: not "what does X mean" but "which of these is X").
    const senses = entry.senses?.length ? entry.senses : entry.words.map((w) => ({ word: w, meaning: entry.explanation }));
    const target = senses[Math.floor(r() * senses.length)];
    if (r() < 0.65 && entry.split !== false) {
      const options = senses.map((s) => ({ text: s.word, correct: s.word === target.word }));
      return { kind: 'twin', ask: 'Which word means…', stem: cap(trimDot(target.meaning)), options: shuffle(options, r), entry, wordShown: null };
    }
    // Word → its sense, with the twins' other senses as the distractors,
    // plus one sense from another set when the pair is only two.
    const opts = senses.map((s) => ({ text: cap(trimDot(s.meaning)), correct: s.word === target.word }));
    if (opts.length < 3) {
      const extra = sample(others.filter((o) => o.senses?.length), 1, r).flatMap((o) => o.senses.slice(0, 1));
      for (const s of extra) opts.push({ text: cap(trimDot(s.meaning)), correct: false });
    }
    return { kind: 'twin-meaning', ask: 'What does it mean?', stem: target.word, options: shuffle(opts, r), entry, wordShown: target.word };
  }
  if (region === 'thicket') {
    if (languages.length >= 4 && r() < 0.3) {
      const opts = [{ text: bundle.meta.language, correct: true }, ...sample(languages.filter((l) => l !== bundle.meta.language), 3, r).map((l) => ({ text: l, correct: false }))];
      return { kind: 'origin', ask: 'Which language did it come from?', stem: entry.word, options: shuffle(opts, r), entry, wordShown: entry.word, hint: cap(trimDot(entry.meaning)) };
    }
    const opts = [{ text: cap(trimDot(entry.meaning)), correct: true }, ...sample(others, 3, r).map((o) => ({ text: cap(trimDot(o.meaning)), correct: false }))];
    return { kind: 'loan', ask: `From ${bundle.meta.language}. What does it mean?`, stem: entry.word, options: shuffle(opts, r), entry, wordShown: entry.word };
  }
  // The Meadow: meaning, reverse, synonym, antonym — weighted by what the entry has.
  const kinds = ['meaning', 'meaning', 'reverse'];
  if (entry.synonyms?.length) kinds.push('synonym', 'synonym');
  if (entry.antonyms?.length) kinds.push('antonym');
  const kind = kinds[Math.floor(r() * kinds.length)];
  if (kind === 'synonym' || kind === 'antonym') {
    const list = kind === 'synonym' ? entry.synonyms : entry.antonyms;
    const correctText = list[Math.floor(r() * list.length)];
    const pool = others.flatMap((o) => (kind === 'synonym' ? o.synonyms ?? [] : o.antonyms ?? []).concat(r() < 0.3 ? [o.word] : [])).filter((w) => w && w.toLowerCase() !== correctText.toLowerCase() && w.toLowerCase() !== entry.word.toLowerCase());
    const distractors = sample([...new Set(pool)], 3, r);
    while (distractors.length < 3 && others.length) distractors.push(sample(others, 1, r)[0].word);
    const opts = [{ text: cap(correctText), correct: true }, ...distractors.map((d) => ({ text: cap(d), correct: false }))];
    return { kind, ask: kind === 'synonym' ? 'Closest in meaning' : 'Most nearly opposite', stem: entry.word, options: shuffle(opts, r), entry, wordShown: entry.word };
  }
  if (kind === 'reverse') {
    const opts = [{ text: entry.word, correct: true }, ...sample(others, 3, r).map((o) => ({ text: o.word, correct: false }))];
    return { kind, ask: 'Which word fits this meaning?', stem: cap(trimDot(entry.meaning)), options: shuffle(opts, r), entry, wordShown: null };
  }
  const opts = [{ text: cap(trimDot(entry.meaning)), correct: true }, ...sample(others, 3, r).map((o) => ({ text: cap(trimDot(o.meaning)), correct: false }))];
  return { kind: 'meaning', ask: 'What does it mean?', stem: entry.word, options: shuffle(opts, r), entry, wordShown: entry.word };
}

function shuffle(arr, r) { const a = [...arr]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ------------------------------------------------------------------ */
/* A round                                                             */
/* ------------------------------------------------------------------ */

export class LexRound {
  #answers = [];
  #shownAt = 0;
  /**
   * Two shapes are accepted:
   *   { region, bundle, entries }   one bundle (the Gauntlet, tests)
   *   { region, picks: [{entry, bundle, status}] }   a curated round that
   *   spans bundles — the curator's shape, and what the valley uses.
   */
  constructor({ region, bundle, entries, picks, languages = [], now = () => Date.now() }) {
    this.region = region;
    this.picks = picks ?? entries.map((e) => ({ entry: e, bundle, status: 'again' }));
    this.entries = this.picks.map((p) => p.entry);
    this.bundle = bundle ?? this.picks[0]?.bundle ?? null;
    this.bundleOf = new Map(this.picks.map((p) => [p.entry.id, p.bundle]));
    this.languages = languages;
    this.now = now;
    this.startedAt = now();
    this.id = `lex-round-${new Date(this.startedAt).toISOString().replace(/[:.]/g, '-')}`;
    this.index = 0;
    const seenBundles = new Set();
    const pool = [];
    for (const p of this.picks) {
      if (!p.bundle || seenBundles.has(p.bundle.meta.id)) continue;
      seenBundles.add(p.bundle.meta.id);
      pool.push(...p.bundle.entries);
    }
    this.questions = this.picks.map((p) => buildQuestion(p.entry, p.bundle, region, this.id, languages, pool));
  }
  get total() { return this.questions.length; }
  get current() { return this.questions[this.index]; }
  get isLast() { return this.index >= this.total - 1; }
  get combo() { let c = 0; for (let i = this.#answers.length - 1; i >= 0 && this.#answers[i].correct; i -= 1) c += 1; return c; }
  get correctCount() { return this.#answers.filter((a) => a.correct).length; }
  markShown() { this.#shownAt = this.now(); }
  answer(optionIndex) {
    const q = this.current;
    const correct = !!q.options[optionIndex]?.correct;
    const ms = this.now() - this.#shownAt;
    this.#answers.push({ entry_id: q.entry.id, kind: q.kind, chosen: optionIndex, correct, ms });
    return { correct, correctIndex: q.options.findIndex((o) => o.correct) };
  }
  next() { if (this.isLast) return false; this.index += 1; return true; }
  finish() {
    const finishedAt = this.now();
    const total = this.#answers.length;
    const correct = this.correctCount;
    const avgMs = total ? this.#answers.reduce((n, a) => n + a.ms, 0) / total : 0;
    const stars = roundStars({ correct, total, avgMs, targetMs: TARGET_MS[this.region] ?? 7000 });
    const record = {
      id: this.id, kind: 'lex-round', module: 'lex', region: this.region,
      bundle_id: this.bundle?.meta.id ?? null,
      bundle_ids: [...new Set(this.picks.map((p) => p.bundle?.meta.id).filter(Boolean))],
      started_at: new Date(this.startedAt).toISOString(), finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - this.startedAt,
      answers: this.#answers, score: { correct, total, accuracy: total ? correct / total : 0, avg_ms: Math.round(avgMs) },
      stars: stars.stars, flawless: stars.flawless,
    };
    return { record, stars, earned: EARN.round(stars.stars, correct, stars.flawless) };
  }
  get answers() { return this.#answers; }
}

/** Persist a finished round and update the ledger for every answer. */
export async function saveRound(storage, round, result, ledger, now = Date.now()) {
  await storage.put(STORES.LEARNING, result.record);
  const byEntry = new Map(round.entries.map((e) => [e.id, e]));
  for (const a of round.answers) {
    const entry = byEntry.get(a.entry_id);
    if (!entry) continue;
    const bundleId = round.bundleOf?.get(a.entry_id)?.meta.id ?? round.bundle?.meta.id ?? null;
    const rec = applyAnswer(ledger.get(a.entry_id), entry, round.region, bundleId, a.correct, now);
    ledger.set(a.entry_id, rec);
    await storage.put(STORES.LEARNING, rec);
  }
}

/** Per-bundle mastery counts from the ledger alone (no bundle loads):
 *  Map bundle_id → { met, known, mastered, due }. */
export function summarizeLedger(ledger, now = Date.now()) {
  const out = new Map();
  for (const rec of ledger.values()) {
    let s = out.get(rec.bundle_id);
    if (!s) { s = { met: 0, known: 0, mastered: 0, due: 0 }; out.set(rec.bundle_id, s); }
    const { level, due } = wordStatus(rec, now);
    if (level >= 1) s.met += 1;
    if (level >= 2) s.known += 1;
    if (level >= 3) s.mastered += 1;
    if (due) s.due += 1;
  }
  return out;
}

/** One field's summary: the ledger counts against its total. */
export function fieldSummary(field, summary) {
  const s = summary.get(field.id) ?? { met: 0, known: 0, mastered: 0, due: 0 };
  return { ...s, total: field.total, bloom: field.total ? s.mastered / field.total : 0 };
}
