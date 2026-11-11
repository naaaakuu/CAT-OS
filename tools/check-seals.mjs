/**
 * check-seals.mjs — the valley tour is earned only by real play in each home.
 *
 *   - all thirteen strands seal all eight homes; without any one of them the tour is not complete
 *   - the Gauntlet seals the hearth only after the seven other seals, and only with a star
 *   - a duel's big moves and word strikes never count, marked (in_duel) or older (inside the duel's time)
 *   - a set skipped through, a timed-out Gauntlet with no answers, a glasshouse round that is not a practice: none count
 *   - the same record saved twice counts once; records in any order give the same tour
 *   - a finished tour starts the next one; an existing player keeps what they really did
 *
 *   node tools/check-seals.mjs
 */
import { deriveSeals, evidenceFrom, TOUR, homeLine } from '../src/pets/seals.js';

let checks = 0;
const fails = [];
const ok = (c, m) => { checks += 1; if (!c) fails.push(m); };
const T0 = Date.parse('2026-11-01T09:00:00Z');
const at = (min) => new Date(T0 + min * 60e3).toISOString();
let n = 0;
const ses = (module, item, min, extra = {}) => ({ id: `s${n += 1}`, module, passage_id: item, item_ids: [item], started_at: at(min - 1), finished_at: at(min), answers: [{ is_correct: true }], score: { total: 1, correct: 1 }, ...extra });
const rc = (passage, min, extra = {}) => ({ id: `rc${n += 1}`, passage_id: passage, started_at: at(min - 5), finished_at: at(min), answers: [{ is_correct: true }, { is_correct: false }], ...extra });
const lex = (region, min, extra = {}) => ({ id: `lx${n += 1}`, kind: 'lex-round', region, started_at: at(min - 2), finished_at: at(min), answers: [{ correct: true }], ...extra });

/** One genuine play of every strand, in order, ending with a starred Gauntlet. */
function fullTour(start = 0) {
  const s = [], l = [];
  let m = start;
  s.push(rc('rc-0040', m += 10));
  s.push({ ...ses('cr', 'cr-0001', m += 10), set_id: 'cr-set:cr-0001' });
  l.push(lex('meadow', m += 10, { greenhouse: true }));
  l.push(lex('pond', m += 10));
  l.push(lex('thicket', m += 10));
  l.push({ id: `g${n += 1}`, kind: 'garden-session', module: 'lg', family_id: 'f1', finished_at: at(m += 10) });
  s.push(ses('wd', 'wd-0001', m += 10));
  for (const mod of ['pj', 'ooo', 'ps', 'sp', 'pc']) for (let i = 1; i <= 3; i += 1) s.push(ses(mod, `${mod}-000${i}`, m += 5));
  l.push({ id: `gr${n += 1}`, kind: 'gauntlet-run', module: 'world', stars: 2, score: { answered: 22, total: 30, correct: 20 }, finished_at: at(m += 10) });
  return { sessions: s, learning: l, end: m };
}

// Nothing played: the tour is at its start, the library first.
{
  const t = deriveSeals({ sessions: [], learning: [] });
  ok(t.sealed === 0 && t.tour === 1 && t.next === 'chai' && t.total === 8, 'an empty valley should start the tour at the library');
  ok(homeLine(t.homes[0]) === '0 of 2 done' && homeLine(t.homes[2]) === '0 of 3 played' && !t.homes[7].open, 'a new tour should read 0 of 2 at the library, 0 of 3 at the railway, and keep the hearth closed');
}

// Every strand: all eight homes sealed, the tour done, the next one begun.
{
  const R = fullTour();
  const t = deriveSeals(R);
  ok(t.toursDone === 1 && t.tour === 2 && t.sealed === 0 && t.next === 'chai', `a full tour should be completed once (got ${t.toursDone} done, ${t.sealed} sealed)`);
  // Without the Gauntlet, seven homes are sealed and the hearth is open but not sealed.
  const noG = deriveSeals({ sessions: R.sessions, learning: R.learning.filter((r) => r.kind !== 'gauntlet-run') });
  ok(noG.toursDone === 0 && noG.sealed === 7 && noG.next === 'toffee' && noG.homes[7].open, 'seven sealed homes should open the hearth and point to it');
  // Remove any one strand: the tour is not complete.
  const strands = TOUR.flatMap((h) => h.strands.map((s) => s.id));
  ok(strands.length === 13, `the tour should have thirteen strands, has ${strands.length}`);
  // Each record's own strand, then the tour without exactly that strand's records.
  const strandOf = (x, store) => evidenceFrom(store === 's' ? { sessions: [x], learning: [] } : { sessions: [], learning: [x] })[0]?.strand;
  for (const id of strands) {
    const one = { sessions: R.sessions.filter((x) => strandOf(x, 's') !== id), learning: R.learning.filter((x) => strandOf(x, 'l') !== id) };
    const t2 = deriveSeals(one);
    const others = t2.homes.flatMap((h) => h.strands).filter((x) => x.id !== id && x.id !== 'gauntlet');
    ok(t2.toursDone === 0 && others.every((x) => x.done) && !t2.homes.flatMap((h) => h.strands).find((x) => x.id === id).done, `without "${id}" (and only it) the tour should stop short`);
  }
}

// The Gauntlet before the seven seals does not seal the hearth (and is not saved up for later).
{
  const R = fullTour(100);
  const early = { id: 'gr-early', kind: 'gauntlet-run', stars: 3, score: { answered: 30, total: 30, correct: 30 }, finished_at: at(1) };
  const t = deriveSeals({ sessions: R.sessions, learning: [early, ...R.learning.filter((r) => r.kind !== 'gauntlet-run')] });
  ok(t.toursDone === 0 && t.sealed === 7 && t.homes[7].sealed === false, 'a Gauntlet run before the seven seals must not seal the hearth');
  // No star, or a timeout with no answers: not a seal either.
  const weak = [{ id: 'g0', kind: 'gauntlet-run', stars: 0, score: { answered: 30, total: 30, correct: 9 }, finished_at: at(R.end + 5) }, { id: 'g1', kind: 'gauntlet-run', stars: 1, score: { answered: 0, total: 30, correct: 0 }, finished_at: at(R.end + 6) }];
  const t2 = deriveSeals({ sessions: R.sessions, learning: [...R.learning.filter((r) => r.kind !== 'gauntlet-run'), ...weak] });
  ok(t2.toursDone === 0, 'a starless Gauntlet, or one with no answers, must not finish the tour');
}

// A duel's records never count: marked ones, and older ones inside the duel's own time.
{
  const duel = { id: 'duel-1', kind: 'duel', module: 'duel', started_at: at(10), finished_at: at(14), answers: [{ kind: 'decode', correct: true }] };
  const sessions = [
    ses('pj', 'pj-0001', 12), ses('pj', 'pj-0002', 13), ses('pj', 'pj-0003', 13.5), // older saves, inside the duel
    ses('ooo', 'ooo-0001', 30, { in_duel: true }), ses('ooo', 'ooo-0002', 31, { in_duel: true }), ses('ooo', 'ooo-0003', 32, { in_duel: true }),
    rc('rc-0001', 40, { in_duel: true }),
  ];
  const learning = [duel, lex('pond', 14.02, { started_at: new Date(T0 + 10 * 60e3 - 900).toISOString() }), lex('meadow', 50, { in_duel: true, greenhouse: true })];
  const ev = evidenceFrom({ sessions, learning });
  ok(ev.length === 0, `a duel's records should not count as play in a home (counted: ${ev.map((e) => e.strand).join(', ')})`);
  // The same plays outside any duel do count.
  const ev2 = evidenceFrom({ sessions: sessions.map((s) => ({ ...s, in_duel: undefined, started_at: at(60), finished_at: at(61) })), learning: [] });
  ok(ev2.filter((e) => e.strand === 'pj').length === 3 && ev2.some((e) => e.strand === 'reading'), 'the same plays made in their rooms should count');
}

// Not evidence: skipped sets, a glasshouse round that is not a practice, unknown kinds, a visit.
{
  const sessions = [ses('ps', 'ps-0001', 5, { answers: [{ is_correct: null }] }), { id: 'x', module: 'ps', passage_id: 'ps-0002', finished_at: 'not a date', answers: [{ is_correct: true }] }];
  const learning = [lex('meadow', 6), { id: 'v', kind: 'village-visit', place: 'table', finished_at: at(7) }, { id: 'o', kind: 'lex-mastery', finished_at: at(8) }];
  ok(evidenceFrom({ sessions, learning }).length === 0, 'a skipped set, a non-practice meadow round, a visit or a word record should not count');
  ok(evidenceFrom({ sessions: [null, 7, 'x'], learning: [undefined, {}] }).length === 0 && deriveSeals(null).sealed === 0, 'hostile records should not throw or count');
}

// Duplicates count once; order does not matter; three different items are needed, not the same one three times.
{
  const R = fullTour();
  const shuffled = { sessions: [...R.sessions].reverse(), learning: [...R.learning].reverse() };
  ok(JSON.stringify(deriveSeals(shuffled)) === JSON.stringify(deriveSeals(R)), 'records in another order should give the same tour');
  const doubled = { sessions: [...R.sessions, ...R.sessions.map((s) => ({ ...s }))], learning: [...R.learning, ...R.learning.map((r) => ({ ...r }))] };
  ok(deriveSeals(doubled).toursDone === 1, 'every record saved twice should still complete one tour, not two');
  const same = [ses('pj', 'pj-0007', 5), ses('pj', 'pj-0007', 6), ses('pj', 'pj-0007', 7)];
  const t = deriveSeals({ sessions: same, learning: [] });
  ok(t.homes[2].strands[0].have === 1 && !t.homes[2].sealed, 'the same train coupled three times is one train, not three');
}

// A second tour counts only what comes after the first was completed.
{
  const A = fullTour(0), B = fullTour(A.end + 60);
  const t = deriveSeals({ sessions: [...A.sessions, ...B.sessions], learning: [...A.learning, ...B.learning] });
  ok(t.toursDone === 2 && t.tour === 3, `two full tours should count as two (got ${t.toursDone})`);
  const half = deriveSeals({ sessions: [...A.sessions, ...B.sessions.slice(0, 2)], learning: A.learning });
  ok(half.toursDone === 1 && half.homes[0].sealed && half.sealed === 1, 'after one tour, a new reading and Arguments set should seal the library again for the second');
}

if (fails.length) { console.error(`seals: ${fails.length} problem(s)\n  - ${fails.join('\n  - ')}`); process.exit(1); }
console.log(`seals: ${checks} checks: thirteen strands seal eight homes, none can be skipped, duels and visits never count, duplicates and order change nothing`);
