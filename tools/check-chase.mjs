/**
 * check-chase.mjs — a beaten Muddle runs into a house, and only real play in there catches it.
 *
 *   - a won duel opens a chase into the Muddle's hideout; a lost or forfeited one does not
 *   - the first real round in that home after the duel catches it; play in another home does not
 *   - a duel's own big moves never catch it, and neither does play from before the duel
 *   - the next duel lets an uncaught Muddle go: no chase is left open, nothing is paid
 *   - the Great Muddle runs to the home left longest
 *   - a catch pays CHASE_LAURELS once, folded into the Laurel Road in time order; with none, the ladder is unchanged
 *
 *   node tools/check-chase.mjs
 */
import { chasesOf, openChase, lastCaught, chaseLaurels, ladderFrom, hideoutFor, HIDEOUT, HIDEOUTS, CHASE_LAURELS } from '../src/duel/chase.js';
import { BOUTS, ladderOf, duelsIn } from '../src/duel/model.js';

let checks = 0;
const fails = [];
const ok = (c, m) => { checks += 1; if (!c) fails.push(m); };
const T0 = Date.parse('2026-11-12T09:00:00Z');
const at = (min) => new Date(T0 + min * 60e3).toISOString();
let n = 0;
const duel = (muddle, min, won = true, extra = {}) => ({ id: `d${n += 1}`, kind: 'duel', module: 'duel', muddle, started_at: at(min - 2), finished_at: at(min), won, laurels: won ? 30 : -10, ...extra });
const ses = (module, min, extra = {}) => ({ id: `s${n += 1}`, module, item_ids: [`${module}-0001`], started_at: at(min - 1), finished_at: at(min), answers: [{ is_correct: true }], score: { total: 1, correct: 1 }, ...extra });
const rc = (min) => ({ id: `rc${n += 1}`, passage_id: 'rc-0040', started_at: at(min - 5), finished_at: at(min), answers: [{ is_correct: true }] });

// Every Muddle has a hideout among the seven rooms (the Great Muddle's is worked out).
for (const b of BOUTS) ok(b.id in HIDEOUT && (HIDEOUT[b.id] === null || HIDEOUTS.includes(HIDEOUT[b.id])), `${b.id} has no hideout`);

// No duels, no chase; the ladder is the duels' own.
ok(openChase({ sessions: [], learning: [] }) === null && chasesOf({}).length === 0, 'a new player has a chase open');

// A won duel opens a chase into the Muddle's home.
{
  const r = { sessions: [], learning: [duel('scrambler', 10)] };
  const c = openChase(r);
  ok(c && c.home === 'ginger' && c.bout.id === 'scrambler' && c.caughtAt === null, `the Scrambler should be hiding in the railway: ${JSON.stringify(c && c.home)}`);
  ok(chaseLaurels(r).length === 0 && ladderFrom(r).laurels === ladderOf(duelsIn(r.learning)).laurels, 'an open chase paid laurels');
}
// A lost or forfeited duel opens nothing.
ok(openChase({ sessions: [], learning: [duel('scrambler', 10, false)] }) === null, 'a lost duel opened a chase');
ok(openChase({ sessions: [], learning: [duel('scrambler', 10, true, { forfeited: true })] }) === null, 'a forfeited duel opened a chase');

// Play in the hideout after the duel catches it; elsewhere, before, or inside the duel does not.
{
  const d = duel('waffle', 20);
  const before = ses('ps', 15), elsewhere = ses('pj', 25), inDuel = ses('ps', 19.5, { in_duel: true }), skipped = ses('ps', 26, { answers: [{ is_correct: null }] });
  const r = { sessions: [before, elsewhere, inDuel, skipped], learning: [d] };
  ok(openChase(r)?.home === 'mochi', 'play before the duel, in another home, inside the duel or skipped through caught Sir Waffle');
  const caught = { ...r, sessions: [...r.sessions, ses('ps', 30)] };
  ok(openChase(caught) === null && lastCaught(caught)?.duel.id === d.id && lastCaught(caught).caughtAt === Date.parse(at(30)), 'a summary in the pantry after the duel did not catch Sir Waffle');
  const pay = chaseLaurels(caught);
  ok(pay.length === 1 && pay[0].laurels === CHASE_LAURELS && ladderFrom(caught).laurels === 30 + CHASE_LAURELS, `a catch should pay ${CHASE_LAURELS} once: ${ladderFrom(caught).laurels}`);
  // Two rounds in the pantry still pay once.
  ok(chaseLaurels({ ...caught, sessions: [...caught.sessions, ses('ps', 40)] }).length === 1, 'a second round in the hideout paid twice');
}
// The library catches the Skimmer with a passage read to the end.
ok(openChase({ sessions: [rc(50)], learning: [duel('skimmer', 40)] }) === null, 'a passage in the library did not catch the Skimmer');
// The glasshouse catches Smudge with a practice round (a lex round from the glasshouse), not a duel's word strikes.
{
  const d = duel('smudge', 60);
  const strike = { id: 'lx-duel', kind: 'lex-round', region: 'meadow', greenhouse: true, in_duel: true, started_at: at(59), finished_at: at(59.5), answers: [{ correct: true }] };
  ok(openChase({ sessions: [], learning: [d, strike] })?.home === 'matcha', "a duel's own word strikes caught Smudge");
  const grow = { id: 'lx-gh', kind: 'lex-round', region: 'meadow', greenhouse: true, started_at: at(64), finished_at: at(65), answers: [{ correct: true }] };
  ok(openChase({ sessions: [], learning: [d, grow] }) === null, 'ten words in the glasshouse did not catch Smudge');
}
// The next duel lets an uncaught Muddle go.
{
  const r = { sessions: [ses('pj', 90)], learning: [duel('tangent', 70), duel('waffle', 80, false)] };
  ok(openChase(r) === null, 'a lost duel after an uncaught chase left a chase open');
  ok(chasesOf(r).length === 1 && chasesOf(r)[0].caughtAt === null && chaseLaurels(r).length === 0, 'a Muddle that got away was caught by play after the next duel');
}
// The Great Muddle runs to the home left longest.
{
  const evidence = [{ strand: 'pj', at: T0 + 1 }, { strand: 'reading', at: T0 + 2 }, { strand: 'vocabulary', at: T0 + 3 }, { strand: 'ooo', at: T0 + 4 }, { strand: 'ps', at: T0 + 5 }, { strand: 'sp', at: T0 + 6 }];
  ok(hideoutFor('greatmuddle', evidence, T0 + 100) === 'sesame', `the Great Muddle should run to the clockworks, never visited: ${hideoutFor('greatmuddle', evidence, T0 + 100)}`);
  ok(hideoutFor('greatmuddle', [...evidence, { strand: 'pc', at: T0 + 7 }], T0 + 100) === 'ginger', 'the Great Muddle should run to the home left longest');
}
// Laurels fold in time order: a catch before a loss is not undone by the arena floor any differently from a duel.
{
  const r = { sessions: [ses('pj', 115)], learning: [duel('scrambler', 110), duel('tangent', 120, false)] };
  ok(ladderFrom(r).laurels === 30 + CHASE_LAURELS - 10, `catch then loss should fold in order: ${ladderFrom(r).laurels}`);
}
// Records in any order give the same chases.
{
  const r = { sessions: [ses('ooo', 140), ses('pj', 160)], learning: [duel('tangent', 130), duel('scrambler', 150)] };
  const flip = { sessions: [...r.sessions].reverse(), learning: [...r.learning].reverse() };
  ok(JSON.stringify(chaseLaurels(r)) === JSON.stringify(chaseLaurels(flip)) && chaseLaurels(r).length === 2, 'the order records are read in changed the chases');
}

if (fails.length) { console.error(`chase: ${fails.length} problem(s)`); for (const f of fails) console.error(`  - ${f}`); process.exit(1); }
console.log(`chase: ${checks} checks: a won duel sends its Muddle into its home, real play there catches it once, the next duel lets it go`);
