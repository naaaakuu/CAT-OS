/**
 * compose.js — what a duel is made of, assembled before it starts so nothing
 * loads mid-pull.
 *
 * Words come from the same curator as every other word round (due first, then
 * slipped, then new) and are saved the same way, so a word strike is real
 * spaced practice and Matcha grows from it. A big move is the curator's next
 * jumble, stray, gap, seat or summary, loaded whole and saved as an ordinary
 * session of that subject, so the houses grow from it too. Nothing a duel
 * teaches is kept in a separate pile.
 */

import { STORES } from '../core/storage/storage-adapter.js';
import { LexRound, listFields, loadLedger, saveRound, loadField } from '../world/lexicon.js';
import { composeRound, nextVerbal } from '../world/curator.js';
import { loadWorld } from '../world/state.js';
import { loadBankFile, normalizeBankItem, loadOOOItem, loadPJItem, loadPSItem } from '../core/content-loader/loader.js';
import { PJSession } from '../core/engine/pj-session.js';
import { OOOSession } from '../core/engine/ooo-session.js';
import { PSSession } from '../core/engine/ps-session.js';
import { BankSession } from '../core/engine/bank-session.js';
import { loadDecode } from './content.js';
import { DUEL, driftScale, duelsIn } from './model.js';
import { seeded } from './letters.js';

/** The first duel of a player's life: everyday words, a certain win. */
const FIRST_WORDS = ['lex-high-f-0043', 'lex-high-t-0029', 'lex-high-j-0011', 'lex-high-h-0034', 'lex-high-l-0039', 'lex-high-r-0019', 'lex-high-c-0006'];
const bundleOf = (id) => id.replace(/-\d+$/, '');

const shuffled = (list, r) => { const a = [...list]; for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const upper = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const clean = (s) => String(s ?? '').trim().replace(/[.;]\s*$/, '');

async function firstDuelFeed() {
  const bundles = new Map();
  await Promise.all([...new Set(FIRST_WORDS.map(bundleOf))].map(async (id) => { bundles.set(id, await loadField('meadow', id)); }));
  const picks = FIRST_WORDS.map((id) => { const bundle = bundles.get(bundleOf(id)); const entry = bundle.entries.find((e) => e.id === id); return entry ? { entry, bundle, status: 'new' } : null; }).filter(Boolean);
  const round = new LexRound({ region: 'meadow', picks, context: null });
  const r = seeded('first-duel');
  // Three clear choices for each, always "what does it mean?", on the very first day.
  round.questions = picks.map(({ entry }) => {
    const others = shuffled(picks.filter((p) => p.entry.id !== entry.id), r).slice(0, 2).map((p) => ({ text: upper(clean(p.entry.meaning)), correct: false }));
    return { kind: 'meaning', ask: 'What does it mean?', stem: entry.word, options: shuffled([{ text: upper(clean(entry.meaning)), correct: true }, ...others], r), entry, wordShown: entry.word };
  });
  return round;
}

/* What each big move plays, and where its content comes from. */
const BIG = Object.freeze({
  chain: { mod: 'pj', load: loadPJItem, name: 'Couple the Train' },
  stray: { mod: 'ooo', load: loadOOOItem, name: 'The Stray Star' },
  point: { mod: 'ps', load: loadPSItem, name: 'Hit the Point' },
  gap: { mod: 'pc', bank: true, name: 'The Missing Cog' },
  seat: { mod: 'sp', bank: true, name: 'Take a Seat' },
});
const BIG_ROTATION = ['chain', 'stray', 'gap', 'seat', 'point'];

export async function loadBigItem(type, id) {
  const def = BIG[type];
  if (def.bank) return normalizeBankItem(def.mod, await loadBankFile(def.mod, id));
  return def.load(id);
}

async function pickBig(arena, world, seed, now) {
  const type = arena.big === 'any' ? BIG_ROTATION[Math.floor(seeded(`big:${seed}`)() * BIG_ROTATION.length)] : arena.big;
  if (!type) return null;
  const def = BIG[type];
  const rows = world.content?.[def.mod] ?? [];
  const rec = nextVerbal(rows, (world.records.sessions ?? []).filter((x) => x && typeof x === 'object'), def.mod, seed, now);
  if (!rec?.item) return null;
  try { return { type, item: await loadBigItem(type, rec.item.id) }; } catch { return null; }
}

/* Decode lines get harder as the arenas do; ones you have already got right rest. */
function pickDecodes(all, arena, n, recent, r) {
  const tiers = arena.n <= 3 ? [1] : arena.n <= 5 ? [1, 2] : arena.n <= 7 ? [2, 3] : [2, 3];
  const solved = new Set(), seenRecently = new Set();
  recent.forEach((d, i) => {
    for (const a of (Array.isArray(d.answers) ? d.answers : [])) {
      if (a?.kind !== 'decode') continue;
      if (a.is_correct) solved.add(a.item_id);
      if (i > recent.length - 8) seenRecently.add(a.item_id);
    }
  });
  const inTier = all.filter((d) => tiers.includes(d.tier) && d.line && d.right && Array.isArray(d.wrong) && d.wrong.length >= 2);
  const ranked = shuffled(inTier, r).map((d) => ({ d, p: (solved.has(d.id) ? 2 : 0) + (seenRecently.has(d.id) ? 1 : 0) + r() * 0.5 })).sort((a, b) => a.p - b.p);
  return ranked.slice(0, n).map((x) => x.d);
}

export function questionFromDecode(d, r) {
  const options = shuffled([{ text: d.right, correct: true }, ...d.wrong.map((text) => ({ text, correct: false }))], r);
  return { kind: 'decode', stem: d.line, options, why: d.why, item: d };
}

/**
 * Everything one duel needs, ready to play.
 * @returns {Promise<{moves:Array, feeds:{meadow:LexRound|null, pond:LexRound|null}, ledger:Map, scale:number, decodePlayed:Array}>}
 */
export async function composeDuel(storage, { arena, seed, first = false, now = Date.now() }) {
  const r = seeded(seed);
  const [world, ledger, decodes] = await Promise.all([loadWorld(storage, now), loadLedger(storage), first ? [] : loadDecode()]);
  const duels = duelsIn(world.records.learning);
  const feeds = { meadow: null, pond: null };

  if (first) {
    feeds.meadow = await firstDuelFeed();
    const moves = feeds.meadow.questions.map(() => ({ kind: 'word', feed: 'meadow' })).slice(0, DUEL.FIRST_MOVES);
    return { moves, feeds, ledger, scale: 0.5, world };
  }

  const big = await pickBig(arena, world, seed, now);
  const quickCount = big ? DUEL.QUICK_WITH_BIG : DUEL.QUICK_MOVES;
  // Lay out the quick moves from this arena's own recipe.
  const quick = [];
  for (let i = 0; i < quickCount; i += 1) quick.push(arena.quick[i % arena.quick.length]);
  const kinds = shuffled(quick, r);
  // Open and close with a word: a duel should start crisp and end on a strike.
  const firstWord = kinds.findIndex((k) => k === 'word' || k === 'twin');
  if (firstWord > 0) [kinds[0], kinds[firstWord]] = [kinds[firstWord], kinds[0]];

  const decodeList = pickDecodes(decodes, arena, kinds.filter((k) => k === 'decode').length, duels, r);
  // A deck that runs short is topped up with words, so the feed is sized for that too.
  const decodeShort = kinds.filter((k) => k === 'decode').length - decodeList.length;
  const wordsNeeded = kinds.filter((k) => k === 'word').length + decodeShort;
  const twinsNeeded = kinds.filter((k) => k === 'twin').length;

  if (wordsNeeded) {
    const fields = await listFields('meadow');
    const composed = await composeRound('meadow', fields, ledger, { n: wordsNeeded + 2, seed, now, context: null });
    feeds.meadow = new LexRound({ region: 'meadow', picks: composed.entries, context: null });
  }
  if (twinsNeeded) {
    const fields = await listFields('pond');
    const composed = await composeRound('pond', fields, ledger, { n: twinsNeeded + 1, seed: `${seed}:twin`, now, context: null });
    feeds.pond = new LexRound({ region: 'pond', picks: composed.entries, context: null });
  }

  let dI = 0, words = 0, twins = 0;
  const moves = [];
  const word = () => { if (feeds.meadow && words < feeds.meadow.total) { words += 1; moves.push({ kind: 'word', feed: 'meadow' }); } };
  kinds.forEach((k, i) => {
    if (k === 'word') word();
    else if (k === 'twin') { if (feeds.pond && twins < feeds.pond.total) { twins += 1; moves.push({ kind: 'twin', feed: 'pond' }); } }
    else if (decodeList[dI]) moves.push({ kind: 'decode', q: questionFromDecode(decodeList[dI++], r) });
    else word();
    // Past the opening exchanges, the big move: the moment you stop and read.
    if (big && i === 3) moves.push({ kind: 'big', big });
  });
  return { moves, feeds, ledger, scale: driftScale(duels), world };
}

/** Save whatever the word strikes reached. Unanswered words stay unasked. */
export async function saveWordFeeds(storage, feeds, ledger) {
  for (const round of [feeds.meadow, feeds.pond]) {
    if (!round || !round.answers.length) continue;
    const result = round.finish();
    try { await saveRound(storage, round, result, ledger); } catch (err) { console.error('[CAT OS] duel words could not be saved', err); }
  }
}

/**
 * Save a finished big move as an ordinary session of its own subject.
 * @param {object} outcome { correct, share, entered?, chosen?, ms, started }
 */
export async function saveBigMove(storage, type, item, outcome) {
  let t = outcome.started ?? Date.now();
  const now = () => t;
  const def = BIG[type];
  const id = item.meta?.id ?? item.id;
  let session;
  if (type === 'chain') session = new PJSession([item], id, { now });
  else if (type === 'stray') session = new OOOSession([item], id, { now });
  else if (type === 'point') session = new PSSession([item], id, { now });
  else session = new BankSession([item], { module: def.mod, setId: id, region: def.mod === 'pc' ? 'completion' : 'placement' }, { now });
  session.markItemShown();
  t += Math.max(1000, outcome.ms ?? 1000);
  if (type === 'chain') session.answer(outcome.entered, { revised: false, read_back_ms: 0 });
  else if (type === 'stray') session.answer(outcome.chosen, { built: null });
  else if (type === 'point') session.answer(outcome.chosen, {});
  else session.answer(outcome.chosen);
  const results = session.finish();
  try {
    await storage.put(STORES.SESSIONS, results.session);
    for (const a of results.attempts) await storage.put(STORES.ATTEMPTS, a);
  } catch (err) { console.error('[CAT OS] a big move could not be saved', err); }
  return results.session;
}

