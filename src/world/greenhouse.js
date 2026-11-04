/** Matcha's ten-word recall loop. Pure state, reproducible after interruption. */
import { rng } from './engine/palette.js';
import { applyAnswer, wordStatus } from './lexicon.js';

export const GREENHOUSE_SIZE = 10;
export const GREENHOUSE_DRAFT = 'matcha:practice';
export const BANDS = [
  { id: 'high', label: 'High frequency', plant: 'Citrus grove', note: 'Everyday words. Deep, dependable roots.' },
  { id: 'medium', label: 'Medium frequency', plant: 'Jasmine walk', note: 'Useful discoveries, one climbing vine at a time.' },
  { id: 'low', label: 'Low frequency', plant: 'Fern sanctuary', note: 'Rare words. A little room for wonder.' },
];

export function leafState(rec, now = Date.now()) {
  if (!rec) return 'new';
  return (rec.level >= 2 && !wordStatus(rec, now).due) ? 'green' : 'yellow';
}

export function greenhouseBeds(fields, ledger, band, now = Date.now()) {
  return Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ', (letter) => {
    const field = fields.find((f) => f.group === band && f.name === letter);
    const records = field ? [...ledger.values()].filter((r) => r.bundle_id === field.id) : [];
    const grown = Math.min(field?.total || 0, records.filter((r) => r.level >= 2).length);
    const yellow = records.filter((r) => leafState(r, now) === 'yellow').length;
    return { letter, field, total: field?.total || 0, grown, yellow, green: records.filter((r) => leafState(r, now) === 'green').length, ratio: field?.total ? grown / field.total : 0 };
  });
}

function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}

export class GreenhouseRound {
  constructor(picks, saved = null, now = Date.now()) {
    this.picks = picks.slice(0, GREENHOUSE_SIZE);
    this.id = saved?.id || `lex-greenhouse-${now}`;
    this.startedAt = saved?.startedAt || now;
    this.history = [];
    this.pool = [];
    this.states = this.picks.map(() => ({ streak: 0, attempts: 0, missed: false }));
    this.wave = 0;
    this.queue = this.picks.map((_, i) => i);
    this.cursor = 0;
    // Replay only validated booleans. Queue order is deterministic per wave.
    for (const a of saved?.history || []) {
      if (this.done || typeof a.correct !== 'boolean' || a.entry_id !== this.pick.entry.id) break;
      this.answer(a.correct, a.ms);
      this.next();
    }
  }
  get currentIndex() { return this.queue[this.cursor]; }
  get pick() { return this.picks[this.currentIndex]; }
  get state() { return this.states[this.currentIndex]; }
  get done() { return !this.queue.length; }
  get learned() { return this.states.filter((s) => s.streak >= 2).length; }
  get total() { return this.picks.length; }
  answer(correct, ms = 0) {
    if (this.done || this.answered) return;
    const s = this.state;
    s.streak = correct ? s.streak + 1 : 0;
    s.missed ||= !correct;
    s.attempts++;
    this.history.push({ entry_id: this.pick.entry.id, correct, ms: Math.max(0, Number(ms) || 0) });
    this.answered = true;
  }
  next() {
    if (!this.answered) return !this.done;
    this.answered = false;
    this.cursor++;
    if (this.cursor >= this.queue.length) {
      const previous = this.queue[this.queue.length - 1];
      this.wave++;
      this.queue = shuffle(this.states.flatMap((s, i) => s.streak < 2 ? [i] : []), rng(`${this.id}:${this.wave}`));
      // At a wave boundary, leave another word between repeats when possible.
      if (this.queue.length > 1 && this.queue[0] === previous) this.queue.push(this.queue.shift());
      this.cursor = 0;
    }
    return !this.done;
  }
  snapshot() {
    return { id: this.id, startedAt: this.startedAt, history: this.history, picks: this.picks.map((p) => ({ entry_id: p.entry.id, bundle_id: p.bundle.meta.id })) };
  }
  result(now = Date.now()) {
    // Rewards count unique first encounters, never the rehearsal answers.
    const answers = this.picks.map((p) => ({ ...this.history.find((a) => a.entry_id === p.entry.id), kind: 'meaning' }));
    const correct = answers.filter((a) => a.correct).length;
    const total = answers.length;
    return { id: this.id, kind: 'lex-round', module: 'lex', region: 'meadow', greenhouse: true,
      bundle_id: this.picks[0]?.bundle.meta.id, bundle_ids: [...new Set(this.picks.map((p) => p.bundle.meta.id))],
      started_at: new Date(this.startedAt).toISOString(), finished_at: new Date(now).toISOString(), duration_ms: now - this.startedAt,
      answers, rehearsals: this.history.length, score: { correct, total, accuracy: total ? correct / total : 0, avg_ms: Math.round(this.history.reduce((n, a) => n + a.ms, 0) / (this.history.length || 1)) },
      stars: correct === total ? 3 : correct >= total * .75 ? 2 : 1, flawless: correct === total };
  }
}

/** Keep spacing conservative: same-session recalls count as one learning visit. */
export function greenhouseRecord(previous, pick, now) {
  const rec = applyAnswer(previous, pick.entry, 'meadow', pick.bundle.meta.id, true, now);
  return { ...rec, level: Math.max(2, rec.level), confirmed_at: new Date(now).toISOString() };
}

export function recallQuestion(round) {
  const entry = round.pick.entry;
  const random = rng(`${round.id}:${entry.id}:${round.state.attempts}`);
  const meaning = String(entry.meaning).trim();
  const unique = new Map();
  for (const e of [...round.picks.flatMap((p) => p.bundle.entries), ...round.pool]) {
    if (e.id !== entry.id && e.meaning && e.meaning.trim().toLowerCase() !== meaning.toLowerCase()) unique.set(e.meaning.trim().toLowerCase(), e.meaning.trim());
  }
  const distractors = shuffle([...unique.values()], random).slice(0, 3);
  return { entry, options: shuffle([{ text: meaning, correct: true }, ...distractors.map((text) => ({ text, correct: false }))], random) };
}
