/**
 * model.js — the rules of the tug of war, with no DOM and no storage.
 *
 * Every number the duel runs on lives here, so the feel of the game can be
 * tuned in one place and checked in Node (tools/check-duel.mjs).
 *
 * The rope runs from -100 (your friend is in the pond) to +100 (the Muddle
 * is). A right answer yanks it toward you and a streak yanks harder. A wrong
 * one gives the Muddle a free heave. Between answers the Muddle leans on the
 * rope, slowly, which is the only clock in the game; while you read something
 * long it stops to read too, so careful reading is never punished.
 *
 * Laurels are derived by folding the saved duels (laurelsFrom), never stored.
 */

export const ROPE_END = 100;

/** Each stop on the Laurel Road is one friend's home and the Muddle who lives there. The higher the stop, the harder everyone pulls. */
export const ARENAS = Object.freeze([
  { n: 1, id: 'campfire', name: 'The Campfire', friend: 'toffee', muddle: 'smudge', muddleName: 'Smudge', from: 0, drift: 0.34 },
  { n: 2, id: 'steps', name: 'Chai\'s Steps', friend: 'chai', muddle: 'verbose', muddleName: 'Baron Verbose', from: 60, drift: 0.44 },
  { n: 3, id: 'yard', name: 'The Workshop Yard', friend: 'ginger', muddle: 'scrambler', muddleName: 'The Scrambler', from: 160, drift: 0.5 },
  { n: 4, id: 'hill', name: 'Observatory Hill', friend: 'mallow', muddle: 'tangent', muddleName: 'Count Tangent', from: 300, drift: 0.56 },
  { n: 5, id: 'square', name: 'The Clock Square', friend: 'sesame', muddle: 'ellipsis', muddleName: 'Dame Ellipsis', from: 480, drift: 0.62 },
  { n: 6, id: 'garden', name: 'The Rose Garden', friend: 'biscuit', muddle: 'gatecrasher', muddleName: 'The Gatecrasher', from: 700, drift: 0.68 },
  { n: 7, id: 'green', name: 'The Archery Green', friend: 'mochi', muddle: 'waffle', muddleName: 'Sir Waffle', from: 960, drift: 0.74 },
  { n: 8, id: 'glasshouse', name: 'The Glasshouse', friend: 'matcha', muddle: 'mixup', muddleName: 'Madame Mixup', from: 1260, drift: 0.8 },
  { n: 9, id: 'lastpage', name: 'The Last Page', friend: 'chai', muddle: 'greatmuddle', muddleName: 'The Great Muddle', from: 1600, drift: 0.88 },
].map(Object.freeze));

/**
 * The cast. Every Muddle is one part of the exam, and a duel against one is
 * mostly that part: `quick` is the recipe for its fast moves, `bigs` the
 * paragraphs or the passage it makes you stop and read. Any Muddle can be
 * challenged at any stop, so the whole of VARC is in reach from the second
 * duel. The order is the order a new player meets them in, one per PLAY.
 *
 * `weight` is how often PLAY deals a Muddle once all ten are met, and it
 * follows the paper: reading comprehension is two thirds of the questions, so
 * the Skimmer comes round about one duel in three (and a passage is the
 * longest duel there is, so most of the answering is reading). The four
 * paragraph types the exam sets every year get two shares each, para
 * completion one, and the three that are never asked directly but sit under
 * everything (words, dense sentences, confusing words) one each.
 */
export const BOUTS = Object.freeze([
  { id: 'smudge', weight: 1, name: 'Smudge', friend: 'toffee', skill: 'Vocabulary', game: 'Word Strikes', line: 'Tap what the word means. Right answers pull the rope.', quick: ['word'], bigs: [] },
  { id: 'verbose', weight: 1, name: 'Baron Verbose', friend: 'chai', skill: 'Dense sentences', game: 'Plain English', line: 'The Baron talks like a legal notice. Work out what he means.', quick: ['decode', 'decode', 'word'], bigs: [] },
  { id: 'scrambler', weight: 2, name: 'The Scrambler', friend: 'ginger', skill: 'Para Jumbles', game: 'Couple the Train', line: 'Four sentences, out of order. Tap them into the order the writer meant.', quick: ['word', 'decode'], bigs: ['chain', 'chain'] },
  { id: 'skimmer', weight: 6, name: 'The Skimmer', friend: 'chai', skill: 'Reading Comprehension', game: 'The Long Read', line: 'One passage, then its questions. The Skimmer never reads to the end. You will.', quick: ['word', 'decode'], bigs: ['read'] },
  { id: 'tangent', weight: 2, name: 'Count Tangent', friend: 'mallow', skill: 'Odd One Out', game: 'The Stray Star', line: 'One sentence wandered in from somewhere else. Find it.', quick: ['word', 'decode'], bigs: ['stray', 'stray'] },
  { id: 'ellipsis', weight: 1, name: 'Dame Ellipsis', friend: 'sesame', skill: 'Para Completion', game: 'The Missing Cog', line: 'The paragraph stops. Choose the sentence that keeps it turning.', quick: ['word', 'decode'], bigs: ['gap', 'gap'] },
  { id: 'gatecrasher', weight: 2, name: 'The Gatecrasher', friend: 'biscuit', skill: 'Sentence Placement', game: 'Take a Seat', line: 'A sentence needs a place in the paragraph. Only one seat fits.', quick: ['word', 'decode'], bigs: ['seat', 'seat'] },
  { id: 'waffle', weight: 2, name: 'Sir Waffle', friend: 'mochi', skill: 'Para Summary', game: 'Hit the Point', line: 'Sir Waffle never gets to the point. You will. Pick the true summary.', quick: ['word', 'decode'], bigs: ['point', 'point'] },
  { id: 'mixup', weight: 1, name: 'Madame Mixup', friend: 'matcha', skill: 'Confusing words', game: 'Twin Words', line: 'Madame Mixup swaps words that look alike. You know the difference.', quick: ['twin', 'twin', 'word'], bigs: [] },
  { id: 'greatmuddle', weight: 1, name: 'The Great Muddle', friend: 'chai', skill: 'Everything at once', game: 'The Mixed Bag', line: 'Every bad habit at once. Two paragraphs of any kind, and everything between.', quick: ['twin', 'decode', 'word'], bigs: ['any', 'any'] },
].map(Object.freeze));

const BOUT_BY_ID = new Map(BOUTS.map((b) => [b.id, b]));
export const boutOf = (id) => BOUT_BY_ID.get(id) ?? BOUTS[0];
export const isBout = (id) => BOUT_BY_ID.has(id);

export const arenaFor = (laurels) => {
  let a = ARENAS[0];
  for (const x of ARENAS) if (laurels >= x.from) a = x;
  return a;
};

export const nextArena = (arena) => ARENAS[arena.n] ?? null;

/** How much a duel is made of. */
export const DUEL = Object.freeze({
  QUICK_MOVES: 14,      // a duel that is all quick moves
  QUICK_WITH_BIGS: 6,   // quick moves round two paragraphs
  QUICK_WITH_READ: 4,   // quick moves round a passage
  FIRST_MOVES: 7,       // the very first duel is short and winnable
  MAX_SECONDS: 170,     // of rope time: reading with the Muddle is not on the clock
  HEAVE_EVERY: [11, 17], // seconds between the Muddle's big heaves
  HEAVE: 5,
  MIN_READ_MS: 500,     // options wake after this, so nobody wins by tapping blind
});

/** Rope effect of a quick answer. `combo` is the run of rights before this one. */
export function quickEffect(correct, combo, ms) {
  if (!correct) return -13;
  const streak = Math.min(combo, 5) * 2;
  const quick = ms <= 2600 ? 3 : ms <= 4500 ? 1 : 0;
  return 14 + streak + quick;
}

/** A big move pays once, and pays well. `share` is how cleanly it was solved, 0 to 1. */
export function bigEffect(share) {
  return share >= 0.99 ? 40 : share > 0 ? Math.round(14 + 22 * share) : -30;
}

/** How many quick moves a bout holds. */
export function quickCount(bout) {
  if (!bout.bigs.length) return DUEL.QUICK_MOVES;
  return bout.bigs.includes('read') ? DUEL.QUICK_WITH_READ : DUEL.QUICK_WITH_BIGS;
}

/** One question of a passage. It was read for, so it pulls harder than a word. */
export function readEffect(correct, combo = 0) {
  return correct ? 22 + Math.min(combo, 3) * 2 : -17;
}

/** The Muddle's pull in rope per second, shaped by how the learner is doing. */
export function driftOf(arena, scale = 1) { return arena.drift * scale; }

/**
 * Keep a learner in the zone: lose twice and the next Muddle is a little
 * softer, win a lot and it digs in. Never visible, never large.
 * @param {Array<{won:boolean}>} recent newest last
 */
export function driftScale(recent) {
  const last = recent.slice(-6);
  if (!last.length) return 1;
  const rate = last.filter((d) => d.won).length / last.length;
  let s = 1 + (rate - 0.6) * 0.75;
  const tail = last.slice(-2);
  if (tail.length === 2 && tail.every((d) => !d.won)) s -= 0.12;
  return Math.max(0.65, Math.min(1.3, s));
}

/** A fresh rope. */
export function newRope({ start = 0 } = {}) { return { rope: start, combo: 0, bestCombo: 0, right: 0, wrong: 0, over: false, won: null }; }

/** Move the rope, keep score. Returns the same object changed. */
export function applyRope(s, delta, { correct = null } = {}) {
  if (s.over) return s;
  s.rope = Math.max(-ROPE_END, Math.min(ROPE_END, s.rope + delta));
  if (correct === true) { s.right += 1; s.combo += 1; s.bestCombo = Math.max(s.bestCombo, s.combo); }
  else if (correct === false) { s.wrong += 1; s.combo = 0; }
  if (s.rope >= ROPE_END) { s.over = true; s.won = true; } else if (s.rope <= -ROPE_END) { s.over = true; s.won = false; }
  return s;
}

/** The duel ran out of questions or time: whoever has the rope takes the other in. */
export function settleRope(s) {
  if (s.over) return s;
  s.won = s.rope > 0 || (s.rope === 0 && s.right >= s.wrong);
  s.over = true;
  return s;
}

/* ------------------------------------------------------------------ */
/* Laurels                                                             */
/* ------------------------------------------------------------------ */

/** What a duel pays. A narrow loss costs less than a flattening. */
export function laurelsFor({ won, accuracy = 0, rope = 0, first = false, bounty = false }) {
  if (first) return 36;
  if (won) return (24 + Math.round(12 * Math.max(0, Math.min(1, accuracy)))) * (bounty ? 2 : 1);
  return -(8 + Math.round(6 * Math.max(0, Math.min(1, -rope / ROPE_END))));
}

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
export const isDuel = (r) => !!r && typeof r === 'object' && r.kind === 'duel';
export const duelsIn = (learning) => (Array.isArray(learning) ? learning : []).filter(isDuel)
  .filter((d) => Number.isFinite(Date.parse(d.finished_at)))
  .sort((a, b) => Date.parse(a.finished_at) - Date.parse(b.finished_at) || String(a.id).localeCompare(String(b.id)));

/**
 * Laurels are the saved duels folded in time order. You cannot fall out of an
 * arena you reached. `bonus` is other laurels earned along the way, as
 * { at (ms), laurels }: the Muddles caught in their hideouts (chase.js).
 */
export function laurelsFrom(duels, bonus = []) {
  const events = duels.map((d) => ({ at: Date.parse(d.finished_at), l: num(d.laurels) }));
  if (bonus.length) { for (const b of bonus) events.push({ at: num(b.at), l: num(b.laurels) }); events.sort((a, b) => a.at - b.at); }
  let l = 0;
  for (const e of events) l = Math.max(arenaFor(l).from, l + e.l);
  return l;
}

/**
 * How close a loss was, in right answers. A near miss is the strongest reason
 * to try again that there is, so a loss says exactly how near it came, and
 * only when it is true. One wrong turned right is worth about 30 of rope.
 * @returns {number} right answers short, or 0 when it was not close
 */
export function nearMiss({ won, rope }) {
  if (won) return 0;
  const short = Math.max(1, Math.ceil((Math.abs(rope) + 1) / 30));
  return short <= 2 ? short : 0;
}

/** The name a win earns. Each one is a small, different story. */
export function winTitle({ wrong, lowest, right }) {
  if (wrong === 0 && right >= 4) return 'Flawless!';
  if (lowest <= -35) return 'What a comeback!';
  if (wrong >= 3) return 'Hung on!';
  return 'In the pond!';
}

/** Everything a screen wants to say about the ladder. */
export function ladderOf(duels, bonus = []) {
  const laurels = laurelsFrom(duels, bonus);
  const arena = arenaFor(laurels);
  const next = nextArena(arena);
  const span = next ? next.from - arena.from : 1;
  const into = next ? laurels - arena.from : 1;
  const wins = duels.filter((d) => d.won).length;
  return { laurels, arena, next, pct: Math.max(0, Math.min(1, into / span)), toNext: next ? next.from - laurels : 0, duels: duels.length, wins, losses: duels.length - wins };
}

/* ------------------------------------------------------------------ */
/* The cast: who you have met, who you have dunked, who is next        */
/* ------------------------------------------------------------------ */

/** Ribbons say how thoroughly a Muddle has been dunked. */
export const RIBBONS = Object.freeze([
  { id: 'bronze', name: 'Bronze ribbon', at: 3 },
  { id: 'silver', name: 'Silver ribbon', at: 8 },
  { id: 'gold', name: 'Gold ribbon', at: 15 },
].map(Object.freeze));

export function ribbonFor(wins) {
  let r = null;
  for (const x of RIBBONS) if (wins >= x.at) r = x;
  return r;
}

const pad = (n) => String(n).padStart(2, '0');
/** The learner's own calendar day, as a sortable string. */
export function dayKey(ms) { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
const dayOf = (d) => dayKey(Date.parse(d.finished_at));

/**
 * Every Muddle's record against this learner, derived from the saved duels.
 * @returns {Map<string,{bout:object,fought:number,wins:number,losses:number,lastAt:number,lastWon:boolean|null,ribbon:object|null,toRibbon:number}>}
 */
export function castOf(duels) {
  const cast = new Map(BOUTS.map((bout) => [bout.id, { bout, fought: 0, wins: 0, losses: 0, lastAt: 0, lastWon: null, ribbon: null, toRibbon: RIBBONS[0].at }]));
  for (const d of duels) {
    const c = cast.get(d.muddle);
    if (!c) continue;
    c.fought += 1;
    if (d.won) c.wins += 1; else c.losses += 1;
    c.lastAt = Date.parse(d.finished_at); c.lastWon = !!d.won;
  }
  for (const c of cast.values()) {
    c.ribbon = ribbonFor(c.wins);
    const next = RIBBONS.find((r) => r.at > c.wins);
    c.toRibbon = next ? next.at - c.wins : 0;
  }
  return cast;
}

/**
 * Today's troublemaker: one of the Muddles this learner finds hardest, chosen
 * from the days before today so it cannot change while they play. The first
 * win against it each day pays double laurels, which points the biggest
 * reward in the game at the weakest part of the syllabus.
 * @returns {{bout:object, open:boolean}|null} `open` while the double is still unclaimed today
 */
export function troublemakerOf(duels, now = Date.now()) {
  const today = dayKey(now);
  const cast = castOf(duels.filter((d) => dayOf(d) < today));
  const met = BOUTS.filter((b) => cast.get(b.id).fought > 0);
  if (met.length < 4) return null;
  const share = (b) => { const c = cast.get(b.id); return (c.wins + 1) / (c.fought + 2); };
  const weakest = [...met].sort((a, b) => share(a) - share(b) || a.id.localeCompare(b.id)).slice(0, 3);
  let h = 7; for (const ch of today) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const bout = weakest[h % weakest.length];
  const open = !duels.some((d) => d.won && d.muddle === bout.id && dayOf(d) === today);
  return { bout, open };
}

export const WEIGHT_TOTAL = BOUTS.reduce((n, b) => n + b.weight, 0);
/** A bout's share of PLAY, 0 to 1. */
export const shareOf = (bout) => bout.weight / WEIGHT_TOTAL;
const RECENT_DUELS = WEIGHT_TOTAL * 2;

/**
 * Who PLAY sends you against. A loss gets one rematch, because a grudge is the
 * best reason to play again; after that a Muddle you have never met, so the
 * first ten duels are ten different games; then today's troublemaker; then
 * whoever is furthest behind their share of the exam (`weight`), so over any
 * stretch of play the duels are dealt in the paper's own proportions. Never
 * the same face twice running unless you lost to it.
 */
export function nextBout(duels, now = Date.now()) {
  if (!duels.length) return BOUTS[0];
  const cast = castOf(duels);
  const last = duels[duels.length - 1], prev = duels[duels.length - 2];
  if (!last.won && isBout(last.muddle) && !(prev && !prev.won && prev.muddle === last.muddle)) return boutOf(last.muddle);
  const unmet = BOUTS.find((b) => !cast.get(b.id).fought);
  if (unmet) return unmet;
  const t = troublemakerOf(duels, now);
  if (t?.open && t.bout.id !== last.muddle) return t.bout;
  // Only the recent past counts, so an old habit of one Muddle is not paid back for weeks.
  const recent = castOf(duels.slice(-RECENT_DUELS));
  const played = Math.min(duels.length, RECENT_DUELS) + 1;
  const behind = (b) => shareOf(b) * played - recent.get(b.id).fought;
  return BOUTS.filter((b) => b.id !== last.muddle).sort((a, b) => behind(b) - behind(a) || cast.get(a.id).lastAt - cast.get(b.id).lastAt)[0];
}
