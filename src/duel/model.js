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

/** Each stop on the Laurel Road is one friend's home, one Muddle and one new way to play. */
export const ARENAS = Object.freeze([
  { n: 1, id: 'campfire', name: 'The Campfire', friend: 'toffee', muddle: 'smudge', muddleName: 'Smudge', from: 0, drift: 0.34, quick: ['word'], big: null, teach: 'Word Strikes', teachLine: 'Tap what the word means. Right answers pull the rope.' },
  { n: 2, id: 'steps', name: 'Chai\'s Steps', friend: 'chai', muddle: 'verbose', muddleName: 'Baron Verbose', from: 60, drift: 0.44, quick: ['word', 'word', 'decode'], big: null, teach: 'Plain English', teachLine: 'The Baron talks like a legal notice. Work out what he means.' },
  { n: 3, id: 'yard', name: 'The Workshop Yard', friend: 'ginger', muddle: 'scrambler', muddleName: 'The Scrambler', from: 160, drift: 0.5, quick: ['word', 'word', 'decode'], big: 'chain', teach: 'Couple the Train', teachLine: 'Four sentences, out of order. Tap them into the order the writer meant.' },
  { n: 4, id: 'hill', name: 'Observatory Hill', friend: 'mallow', muddle: 'tangent', muddleName: 'Count Tangent', from: 300, drift: 0.56, quick: ['word', 'decode'], big: 'stray', teach: 'The Stray Star', teachLine: 'One sentence wandered in from somewhere else. Find it.' },
  { n: 5, id: 'square', name: 'The Clock Square', friend: 'sesame', muddle: 'ellipsis', muddleName: 'Dame Ellipsis', from: 480, drift: 0.62, quick: ['word', 'decode'], big: 'gap', teach: 'The Missing Cog', teachLine: 'The paragraph stops. Choose the sentence that keeps it turning.' },
  { n: 6, id: 'garden', name: 'The Rose Garden', friend: 'biscuit', muddle: 'gatecrasher', muddleName: 'The Gatecrasher', from: 700, drift: 0.68, quick: ['word', 'decode', 'decode'], big: 'seat', teach: 'Take a Seat', teachLine: 'A sentence needs a place in the paragraph. Only one seat fits.' },
  { n: 7, id: 'green', name: 'The Archery Green', friend: 'mochi', muddle: 'waffle', muddleName: 'Sir Waffle', from: 960, drift: 0.74, quick: ['word', 'decode', 'decode'], big: 'point', teach: 'Hit the Point', teachLine: 'Sir Waffle never gets to the point. You will. Pick the true summary.' },
  { n: 8, id: 'glasshouse', name: 'The Glasshouse', friend: 'matcha', muddle: 'mixup', muddleName: 'Madame Mixup', from: 1260, drift: 0.8, quick: ['twin', 'decode', 'word'], big: 'any', teach: 'Twin Words', teachLine: 'Madame Mixup swaps words that look alike. You know the difference.' },
  { n: 9, id: 'lastpage', name: 'The Last Page', friend: 'chai', muddle: 'greatmuddle', muddleName: 'The Great Muddle', from: 1600, drift: 0.88, quick: ['twin', 'decode', 'word'], big: 'any', teach: 'The Great Muddle', teachLine: 'Every bad habit at once. Everything you have learned, together.' },
].map(Object.freeze));

export const arenaFor = (laurels) => {
  let a = ARENAS[0];
  for (const x of ARENAS) if (laurels >= x.from) a = x;
  return a;
};

export const nextArena = (arena) => ARENAS[arena.n] ?? null;

/** How much a duel is made of. */
export const DUEL = Object.freeze({
  QUICK_MOVES: 14,      // the longest a duel can run
  QUICK_WITH_BIG: 10,   // quick moves when a big move is in the duel
  BIG_MOVES: 1,
  FIRST_MOVES: 7,       // the very first duel is short and winnable
  MAX_SECONDS: 170,
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
  return share >= 0.99 ? 40 : share > 0 ? Math.round(14 + 22 * share) : -22;
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
export function laurelsFor({ won, accuracy = 0, rope = 0, first = false }) {
  if (first) return 36;
  if (won) return 24 + Math.round(12 * Math.max(0, Math.min(1, accuracy)));
  return -(8 + Math.round(6 * Math.max(0, Math.min(1, -rope / ROPE_END))));
}

const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
export const isDuel = (r) => !!r && typeof r === 'object' && r.kind === 'duel';
export const duelsIn = (learning) => (Array.isArray(learning) ? learning : []).filter(isDuel)
  .filter((d) => Number.isFinite(Date.parse(d.finished_at)))
  .sort((a, b) => Date.parse(a.finished_at) - Date.parse(b.finished_at) || String(a.id).localeCompare(String(b.id)));

/** Laurels are the saved duels folded in time order. You cannot fall out of an arena you reached. */
export function laurelsFrom(duels) {
  let l = 0;
  for (const d of duels) l = Math.max(arenaFor(l).from, l + num(d.laurels));
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
export function ladderOf(duels) {
  const laurels = laurelsFrom(duels);
  const arena = arenaFor(laurels);
  const next = nextArena(arena);
  const span = next ? next.from - arena.from : 1;
  const into = next ? laurels - arena.from : 1;
  const wins = duels.filter((d) => d.won).length;
  return { laurels, arena, next, pct: Math.max(0, Math.min(1, into / span)), toNext: next ? next.from - laurels : 0, duels: duels.length, wins, losses: duels.length - wins };
}
