/**
 * check-duel.mjs — the rules of the tug of war, played out in Node.
 *
 * Simulates thousands of duels at realistic accuracies and asks whether the
 * game has the shape it is meant to have: a careful player usually wins, a
 * guesser usually loses, a duel lasts a minute or two, the ladder climbs at a
 * sensible rate, and a letter holds what it should.
 */
import { ARENAS, DUEL, ROPE_END, arenaFor, newRope, applyRope, settleRope, quickEffect, bigEffect, driftOf, driftScale, laurelsFor, laurelsFrom, ladderOf, duelsIn } from '../src/duel/model.js';
import { gradeFor, drawCards, pendingLetters, ownedCards, openRecord } from '../src/duel/letters.js';

let failed = 0;
const check = (name, ok, extra = '') => { if (!ok) failed += 1; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${extra ? `  ${extra}` : ''}`); };

let seed = 12345;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

function simulate(arena, p, { secPerMove = 5, big = arena.big, scale = 1 } = {}) {
  const s = newRope();
  const quick = big ? DUEL.QUICK_WITH_BIG : DUEL.QUICK_MOVES;
  const script = [];
  for (let i = 0; i < quick; i += 1) { script.push('q'); if (big && i === 4) script.push('B'); }
  let t = 0, nextHeave = 14;
  for (const m of script) {
    if (s.over) break;
    if (m === 'B') {
      // A long read: the Muddle stops to read too.
      t += 40;
      const c = rand() < p;
      applyRope(s, bigEffect(c ? 1 : 0), { correct: c });
    } else {
      const secs = secPerMove * (0.7 + rand() * 0.8);
      t += secs;
      applyRope(s, -driftOf(arena, scale) * secs);
      if (t >= nextHeave) { applyRope(s, -DUEL.HEAVE); nextHeave += 11 + rand() * 6; }
      if (s.over) break;
      const c = rand() < p;
      applyRope(s, quickEffect(c, s.combo, secs * 1000), { correct: c });
    }
  }
  settleRope(s);
  return { won: s.won, secs: t, rope: s.rope };
}

function rate(arena, p, o) {
  let wins = 0, secs = 0;
  const N = 4000;
  for (let i = 0; i < N; i += 1) { const r = simulate(arena, p, o); if (r.won) wins += 1; secs += r.secs; }
  return { win: wins / N, secs: secs / N };
}

console.log('The tug of war');
for (const a of ARENAS) {
  const careful = rate(a, 0.8), middling = rate(a, 0.62), guessing = rate(a, 0.25);
  console.log(`  arena ${a.n} ${a.name.padEnd(20)} careful ${(careful.win * 100).toFixed(0)}%  middling ${(middling.win * 100).toFixed(0)}%  guessing ${(guessing.win * 100).toFixed(0)}%   ${careful.secs.toFixed(0)}s`);
  check(`arena ${a.n}: an 80% player wins most duels`, careful.win >= 0.75, `${(careful.win * 100).toFixed(0)}%`);
  check(`arena ${a.n}: a guesser loses`, guessing.win <= 0.08, `${(guessing.win * 100).toFixed(0)}%`);
  check(`arena ${a.n}: a duel is a minute or two`, careful.secs >= 35 && careful.secs <= DUEL.MAX_SECONDS, `${careful.secs.toFixed(0)}s`);
}

console.log('The ladder');
{
  // A 68% player, first to last. The hidden scale reacts as it does in the game.
  const duels = [];
  const at = new Date('2026-01-01T08:00:00Z').getTime();
  for (let i = 0; i < 600; i += 1) {
    const l = laurelsFrom(duels);
    const a = arenaFor(l);
    const scale = driftScale(duels);
    const r = simulate(a, 0.68, { scale });
    duels.push({ kind: 'duel', id: `d${i}`, finished_at: new Date(at + i * 600000).toISOString(), won: r.won, laurels: laurelsFor({ won: r.won, accuracy: 0.7, rope: r.rope, first: i === 0 }) });
    const reached = arenaFor(laurelsFrom(duels)).n;
    if (reached > a.n) console.log(`  arena ${reached} after ${i + 1} duels`);
  }
  const lad = ladderOf(duels);
  check('the ladder reaches the last arena inside 300 duels', duels.findIndex((_, i) => arenaFor(laurelsFrom(duels.slice(0, i + 1))).n === ARENAS.length) < 300);
  check('the win rate settles near two in three', lad.wins / lad.duels > 0.5 && lad.wins / lad.duels < 0.85, `${((lad.wins / lad.duels) * 100).toFixed(0)}%`);

  const fall = [{ kind: 'duel', id: 'a', finished_at: '2026-01-01T00:00:00Z', laurels: 70 }, { kind: 'duel', id: 'b', finished_at: '2026-01-01T01:00:00Z', laurels: -40 }];
  check('you cannot fall out of an arena you reached', laurelsFrom(fall) === 60, String(laurelsFrom(fall)));
  check('duelsIn ignores damaged records', duelsIn([null, 3, { kind: 'duel' }, { kind: 'duel', finished_at: 'garbage' }, { kind: 'lex-round', finished_at: '2026-01-01T00:00:00Z' }]).length === 0);
}

console.log('The post');
{
  const deck = [];
  const sizes = { common: 110, rare: 66, epic: 33, legendary: 11 };
  for (const [rarity, n] of Object.entries(sizes)) for (let i = 0; i < n; i += 1) deck.push({ id: `${rarity}-${i}`, rarity });

  const a = drawCards({ id: 'x', grade: 'gold' }, deck, new Map());
  const b = drawCards({ id: 'x', grade: 'gold' }, deck, new Map());
  check('the same letter always holds the same cards', JSON.stringify(a) === JSON.stringify(b));
  check('a golden letter holds three different cards', new Set(a).size === 3);

  const owned = new Map();
  let letters = 0, dupes = 0, firstDupeAt = null;
  const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  while (owned.size < deck.length && letters < 2000) {
    const grade = gradeFor(`l${letters}`, letters);
    const cards = drawCards({ id: `l${letters}`, grade }, deck, owned);
    for (const id of cards) {
      if (owned.has(id)) { dupes += 1; if (firstDupeAt === null) firstDupeAt = letters; }
      owned.set(id, (owned.get(id) ?? 0) + 1);
      counts[deck.find((c) => c.id === id).rarity] += 1;
    }
    letters += 1;
  }
  console.log(`  whole deck of ${deck.length} after ${letters} letters, ${dupes} duplicates`);
  check('no duplicate before the deck is finished', firstDupeAt === null || owned.size === deck.length);
  check('the whole deck can be collected', owned.size === deck.length);

  const grades = { wax: 0, silver: 0, gold: 0 };
  for (let i = 0; i < 5000; i += 1) grades[gradeFor(`g${i}`, i)] += 1;
  console.log(`  grades: ${JSON.stringify(grades)}`);
  check('every tenth letter is golden', gradeFor('whatever', 9) === 'gold' && gradeFor('whatever', 19) === 'gold');
  check('golden letters stay special', grades.gold / 5000 < 0.2 && grades.gold / 5000 > 0.1);

  const day1 = new Date(2026, 0, 1, 12).getTime(), day2 = new Date(2026, 0, 2, 12).getTime();
  const log = [{ kind: 'duel', id: 'd1', finished_at: new Date(day1).toISOString(), letter: { id: 'L1', grade: 'wax' } }];
  check('no morning post on your first day', pendingLetters(log, day1).map((l) => l.id).join() === 'L1');
  const next = pendingLetters(log, day2);
  check('the next day the post has come', next.some((l) => l.from === 'post') && next.some((l) => l.id === 'L1'));
  log.push(openRecord({ id: next[0].id, grade: next[0].grade }, ['c1', 'c2'], day2));
  check('an opened letter stays opened', pendingLetters(log, day2).every((l) => l.id !== next[0].id));
  check('opened cards are the collection', ownedCards(log).has('c1') && ownedCards(log).has('c2'));
  check('damaged letter records are harmless', pendingLetters([null, { kind: 'letter-open' }, { kind: 'duel' }], day2).length === 1 && ownedCards([{ kind: 'letter-open', cards: 'no' }]).size === 0);
}

if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nDuel rules: all checks passed');
