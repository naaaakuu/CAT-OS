/**
 * check-duel.mjs — the rules of the tug of war, played out in Node.
 *
 * Simulates thousands of duels at realistic accuracies and asks whether the
 * game has the shape it is meant to have: a careful player usually wins, a
 * guesser usually loses, a duel lasts a minute or two, the ladder climbs at a
 * sensible rate, and a letter holds what it should.
 */
import { ARENAS, BOUTS, DUEL, RIBBONS, ROPE_END, arenaFor, newRope, applyRope, settleRope, quickEffect, bigEffect, readEffect, quickCount, boutOf, castOf, nextBout, troublemakerOf, dayKey, driftOf, driftScale, laurelsFor, laurelsFrom, ladderOf, duelsIn } from '../src/duel/model.js';
import { gradeFor, drawCards, pendingLetters, ownedCards, openRecord } from '../src/duel/letters.js';
import { PLAN_DAYS, postTime, reminderPlan, usualHour } from '../src/duel/reminders.js';

let failed = 0;
const check = (name, ok, extra = '') => { if (!ok) failed += 1; console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${extra ? `  ${extra}` : ''}`); };

let seed = 12345;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

/* One duel as the screen plays it: the bout's quick moves with its paragraphs
   (or its passage) laid evenly among them, the Muddle reading while you read. */
function simulate(arena, p, { secPerMove = 5, bout = boutOf(arena.muddle), scale = 1 } = {}) {
  const s = newRope();
  const quick = quickCount(bout), bigs = bout.bigs.length;
  const script = [];
  const gap = quick / (bigs + 1);
  let b = 0;
  for (let i = 0; i < quick; i += 1) { script.push('q'); if (b < bigs && i + 1 >= Math.max(1, Math.round(gap * (b + 1))) && i < quick - 1) script.push(bout.bigs[b++] === 'read' ? 'R' : 'B'); }
  let t = 0, nextHeave = 14, rope = 0;
  for (const m of script) {
    if (s.over) break;
    if (m === 'B') {
      // A long read: the Muddle stops to read too.
      t += 40;
      const c = rand() < p;
      applyRope(s, bigEffect(c ? 1 : 0), { correct: c });
    } else if (m === 'R') {
      // A passage: four questions, the rope held at the brink until the last.
      t += 200;
      const brink = ROPE_END - 3;
      for (let q = 0; q < 4; q += 1) { const c = rand() < p; const to = Math.max(-brink, Math.min(brink, s.rope + readEffect(c, s.combo))); applyRope(s, to - s.rope, { correct: c }); }
      if (Math.abs(s.rope) >= brink) applyRope(s, Math.sign(s.rope) * 8);
    } else {
      const secs = secPerMove * (0.7 + rand() * 0.8);
      t += secs; rope += secs;
      applyRope(s, -driftOf(arena, scale) * secs);
      if (rope >= nextHeave) { applyRope(s, -DUEL.HEAVE); nextHeave += 11 + rand() * 6; }
      if (s.over) break;
      const c = rand() < p;
      applyRope(s, quickEffect(c, s.combo, secs * 1000), { correct: c });
    }
  }
  settleRope(s);
  return { won: s.won, secs: t, rope: s.rope, ropeSecs: rope };
}

function rate(arena, p, o) {
  let wins = 0, secs = 0;
  const N = 4000;
  for (let i = 0; i < N; i += 1) { const r = simulate(arena, p, o); if (r.won) wins += 1; secs += r.secs; }
  return { win: wins / N, secs: secs / N };
}

console.log('The tug of war');
/* Any Muddle can be challenged at any stop, so every bout has to be fair at the
   easiest stop and at the hardest. */
for (const bout of BOUTS) {
  for (const a of [ARENAS[0], ARENAS[ARENAS.length - 1]]) {
    const careful = rate(a, 0.8, { bout }), middling = rate(a, 0.62, { bout }), guessing = rate(a, 0.25, { bout });
    console.log(`  ${bout.id.padEnd(12)} stop ${a.n}  careful ${(careful.win * 100).toFixed(0)}%  middling ${(middling.win * 100).toFixed(0)}%  guessing ${(guessing.win * 100).toFixed(0)}%   ${careful.secs.toFixed(0)}s`);
    check(`${bout.id} at stop ${a.n}: an 80% player wins most duels`, careful.win >= 0.75, `${(careful.win * 100).toFixed(0)}%`);
    check(`${bout.id} at stop ${a.n}: a guesser loses`, guessing.win <= 0.1, `${(guessing.win * 100).toFixed(0)}%`);
    check(`${bout.id} at stop ${a.n}: a duel is short`, careful.secs >= 30 && careful.secs <= (bout.bigs.includes('read') ? 330 : 190), `${careful.secs.toFixed(0)}s`);
  }
}

console.log('The cast');
{
  const at = new Date(2026, 0, 1, 9).getTime(), DAY = 864e5;
  const duel = (i, muddle, won, when = at + i * 600000) => ({ kind: 'duel', id: `c${i}`, finished_at: new Date(when).toISOString(), muddle, won, laurels: won ? 30 : -10 });
  check('every Muddle is a different part of the exam', new Set(BOUTS.map((b) => b.skill)).size === BOUTS.length && BOUTS.length === 10);
  check('every stop is the home of a Muddle on the bill', ARENAS.every((a) => boutOf(a.muddle).id === a.muddle));
  check('reading is on the bill', BOUTS.some((b) => b.bigs.includes('read')));
  check('the first duel is Smudge', nextBout([]).id === 'smudge');
  // Win every duel: the first ten are ten different Muddles, in the bill's order.
  const run = [];
  for (let i = 0; i < BOUTS.length; i += 1) run.push(duel(i, nextBout(run, at + i * 600000).id, true));
  check('ten wins meet all ten Muddles, one new game each time', run.map((d) => d.muddle).join() === BOUTS.map((b) => b.id).join());
  const lost = [duel(0, 'smudge', true), duel(1, 'verbose', false)];
  check('a loss gets one rematch', nextBout(lost, at).id === 'verbose');
  lost.push(duel(2, 'verbose', false));
  check('two losses running and PLAY moves on', nextBout(lost, at).id !== 'verbose');
  // After everyone is met, nobody comes up twice running and nobody is left out.
  const long = [...run];
  for (let i = 10; i < 60; i += 1) long.push(duel(i, nextBout(long, at + i * 600000).id, true));
  check('never the same Muddle twice running after a win', long.every((d, i) => i === 0 || d.muddle !== long[i - 1].muddle));
  check('PLAY keeps coming back to everyone', [...castOf(long).values()].every((c) => c.fought >= 4));
  const c = castOf([...run, duel(20, 'waffle', true), duel(21, 'waffle', true), duel(22, 'waffle', false)]).get('waffle');
  check('a Muddle keeps your record against it', c.fought === 4 && c.wins === 3 && c.losses === 1 && c.ribbon?.id === 'bronze' && c.toRibbon === RIBBONS[1].at - 3);
  check('damaged records do not break the cast', castOf([{ kind: 'duel', muddle: 'nobody', won: true, finished_at: 'x' }]).get('smudge').fought === 0);

  check('no troublemaker until four Muddles are met', troublemakerOf(run.slice(0, 3), at + DAY) === null);
  const weak = [...run, duel(30, 'waffle', false), duel(31, 'waffle', false), duel(32, 'skimmer', false), duel(33, 'tangent', false)];
  const t1 = troublemakerOf(weak, at + DAY);
  check('the troublemaker is one of your weakest', !!t1 && ['waffle', 'skimmer', 'tangent'].includes(t1.bout.id) && t1.open, t1?.bout.id);
  check('it does not change while you play today', troublemakerOf([...weak, duel(40, 'smudge', true, at + DAY + 1000)], at + DAY + 2000).bout.id === t1.bout.id);
  check('its double is paid once a day', troublemakerOf([...weak, duel(41, t1.bout.id, true, at + DAY + 1000)], at + DAY + 2000).open === false);
  check('a double is a double, and only for a win', laurelsFor({ won: true, accuracy: 1, bounty: true }) === 2 * laurelsFor({ won: true, accuracy: 1 }) && laurelsFor({ won: false, rope: -50, bounty: true }) === laurelsFor({ won: false, rope: -50 }));
  check('days are the learner\'s own calendar days', dayKey(new Date(2026, 2, 5, 23, 59).getTime()) === '2026-03-05' && dayKey(new Date(2026, 2, 6, 0, 1).getTime()) === '2026-03-06');
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
    const r = simulate(a, 0.68, { scale, bout: nextBout(duels, at + i * 600000) });
    duels.push({ kind: 'duel', id: `d${i}`, finished_at: new Date(at + i * 600000).toISOString(), muddle: nextBout(duels, at + i * 600000).id, won: r.won, laurels: laurelsFor({ won: r.won, accuracy: 0.7, rope: r.rope, first: i === 0 }) });
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

console.log('The reminders');
{
  const morning = new Date(2026, 0, 10, 7, 0).getTime(), afternoon = new Date(2026, 0, 10, 15, 0).getTime(), late = new Date(2026, 0, 10, 23, 0).getTime();
  const base = { now: morning, hasDueled: true, playedToday: false, fireDays: 0, postOpenedToday: false, hook: 'It began life as an insult.', hour: null };
  const within = (p) => p.every((n) => { const h = new Date(n.at).getHours(); return h >= 8 && h <= 21; });
  check('nothing before a first duel', reminderPlan({ ...base, hasDueled: false }).length === 0);
  const plain = reminderPlan(base);
  check('three letters and no more: someone who stops playing stops hearing from us', plain.length === 3 && plain.every((n) => n.at < morning + (PLAN_DAYS + 1) * 864e5));
  check('the first letter names what is inside', plain[0].text === base.hook && plain[0].route === '#/letters');
  check('never at night', within(plain) && within(reminderPlan({ ...base, hour: 2 })) && within(reminderPlan({ ...base, hour: 23, fireDays: 9 })));
  check('at most one letter on any day', new Set(plain.map((n) => new Date(n.at).toDateString())).size === plain.length);
  check('the letter comes a little before the usual hour', postTime(13)[0] === 12 && postTime(null)[0] === 8);
  check('an opened post is not announced again today', reminderPlan({ ...base, postOpenedToday: true }).every((n) => new Date(n.at).getDate() !== 10));
  check('no letter is announced on the first day, because there is none yet', reminderPlan({ ...base, firstDayToday: true }).every((n) => new Date(n.at).getDate() !== 10));
  check('a time already gone is skipped', reminderPlan({ ...base, now: afternoon }).every((n) => n.at > afternoon) && reminderPlan({ ...base, now: late }).every((n) => n.at > late));
  const fire = (o) => reminderPlan({ ...base, fireDays: 5, ...o }).filter((n) => n.id >= 2000);
  check('the fire warns once, today if not yet played', fire({ playedToday: false }).length === 1 && new Date(fire({ playedToday: false })[0].at).getDate() === 10);
  check('the fire warns tomorrow if today is done', new Date(fire({ playedToday: true })[0].at).getDate() === 11);
  check('a one-day fire is not worth a nudge', fire({ fireDays: 1 }).length === 0);
  check('no em dashes in anything sent', plain.concat(fire({})).every((n) => !/[\u2013\u2014]/.test(n.title + n.text)));
  check('usual hour needs a few plays and ignores nonsense', usualHour(['x', '2026-01-01T09:00:00']) === null && usualHour(['2026-01-01T09:00:00', '2026-01-02T09:30:00', '2026-01-03T21:00:00']) === 9);
}

if (failed) { console.error(`\n${failed} check(s) failed`); process.exit(1); }
console.log('\nDuel rules: all checks passed');
