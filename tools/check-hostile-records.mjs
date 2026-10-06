/**
 * check-hostile-records.mjs — the one input this app cannot validate.
 *
 * Content is schema-checked before it ships. Code is checked by everything
 * else in verify.mjs. STORED RECORDS are neither: they were written by
 * whichever version of the app the learner had at the time, or imported from
 * a backup file somebody edited, or left behind by a feature that has since
 * changed shape. And they feed the derivation that every screen is built on.
 *
 * One session row without a `score` used to throw a raw TypeError out of
 * `sessionXP` and onto the VILLAGE — the screen that hides the tab bar, so
 * the dead end had no links in it, and reloading produced it again. There was
 * no way out of the app except clearing the browser's storage.
 *
 * So this feeds the derivation a set of records nobody would ever write on
 * purpose — missing fields, nulls, wrong types, unknown ids, impossible
 * numbers, dates in the future — and asserts that the world still derives.
 * Not that it derives WELL; that it derives at all, without throwing.
 *
 * Run: node tools/check-hostile-records.mjs      verify.mjs §26.
 */

import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href);

const ISO = (msAgo = 0) => new Date(1789000000000 - msAgo).toISOString();

/** Records no sane version of this app would write. */
export function hostileRecords() {
  const sessions = [
    { id: 'h1', passage_id: 'rc-0001', finished_at: ISO(1e6) },                      // no score at all
    { id: 'h2', passage_id: 'rc-0002', finished_at: ISO(2e6), score: null },         // null score
    { id: 'h3', passage_id: 'rc-0003', finished_at: ISO(3e6), score: {} },           // empty score
    { id: 'h4', passage_id: 'rc-0004', finished_at: ISO(4e6), score: { correct: 'three', total: null } },
    { id: 'h5', passage_id: 'nope-9999', finished_at: ISO(5e6), score: { correct: 2, total: 4 } },
    { id: 'h6', module: 'pj', finished_at: ISO(6e6) },                               // module row, no score
    { id: 'h7', module: 'ooo', finished_at: ISO(7e6), score: { correct: 9, total: 2 } }, // impossible
    { id: 'h8', module: 'sp', finished_at: ISO(8e6), score: { correct: 1, total: 3 }, answers: null },
    { id: 'h9', module: 'rc2', finished_at: ISO(9e6), score: { correct: 1, total: 3 }, answers: [null, {}, { is_correct: 'yes' }] },
    { id: 'h10', module: 'wd', finished_at: ISO(-9e10), score: { accuracy: 2 } },     // finished in the future
    { id: 'h11', finished_at: 'not a date', score: { correct: 1, total: 1 } },
    { id: 'h12', passage_id: 'rc-0005', finished_at: ISO(1.1e6), score: { correct: 4, total: 4 }, duration_sec: -5 },
  ];
  const learning = [
    { id: 'l1', kind: 'village-build', building: 'nosuchbuilding', level: 99, at: ISO(1e6) },
    { id: 'l2', kind: 'village-build', at: ISO(2e6) },                                // no building
    { id: 'l3', kind: 'village-build', building: 'reading', level: null, at: ISO(3e6) },
    { id: 'l4', kind: 'village-order', slot: 0, n: -1, needs: null, paid: 'lots', at: ISO(4e6) },
    { id: 'l5', kind: 'village-collect', building: 'reading', good: 'unicorns', amount: 1e9, at: ISO(5e6) },
    { id: 'l6', kind: 'village-collect', at: ISO(6e6) },
    { id: 'l7', kind: 'village-plot', plot: 'nosuchplot', at: ISO(7e6) },
    { id: 'l8', kind: 'village-house', n: 999, at: ISO(8e6) },
    { id: 'l9', kind: 'lex-round', stars: 'three', score: null, at: ISO(9e6) },
    { id: 'l10', kind: 'gauntlet-run', at: ISO(1e7) },
    { id: 'l11', kind: 'garden-session', session_type: 'nonsense', clean: 'maybe', at: ISO(1.1e7) },
    { id: 'l12', kind: 'a kind from the future', at: ISO(1.2e7) },
    { id: 'l13', kind: 'village-build', building: 'reading', level: 3 },              // no date at all
    // The retired treasure economy: rows a 3.0.0 learner still has, now ignored.
    { id: 'l14', kind: 'village-treasure', treasure: 'kite', at: ISO(1.3e7) },
    { id: 'l15', kind: 'village-treasure', treasure: null, at: 'yesterday' },
    { id: 'l16', kind: 'village-treasure', treasure: 'lanterns' },                    // no date
    { id: 'l17', kind: 'village-treasure', treasure: 'lanterns', at: ISO(1.4e7) },
  ];
  return { sessions, learning };
}

export async function checkHostileRecords() {
  const problems = [];
  const { deriveWorldState } = await load('src/world/state.js');
  const { deriveEngagement } = await load('src/core/engagement/stats.js');
  const { totalXP } = await load('src/core/engagement/xp.js');
  const { skillLedger, trapLedger, patternLedger } = await load('src/core/learning/review.js');
  const { derivePets } = await load('src/pets/economy.js');

  const records = hostileRecords();
  const retired = { sessions: [], learning: records.learning.filter((r) => String(r.kind).startsWith('village-')) };
  // An empty content registry is itself a hostile case: it is what a learner
  // who went offline before the library arrived actually has.
  const empty = { families: [], rc: [], pj: [], ps: [], ooo: [], wd: [], sp: [], pc: [], wb: [], cr: [], fields: { meadow: [], pond: [], thicket: [] } };

  const cases = [
    ['derivePets (no state, no content)', () => derivePets(undefined, records, undefined, 1789000000000)],
    ['deriveWorldState (only retired village rows)', () => deriveWorldState(empty, retired, 1789000000000)],
    ['deriveWorldState', () => deriveWorldState(empty, records, 1789000000000)],
    ['deriveEngagement', () => deriveEngagement(records.sessions, new Date(1789000000000))],
    ['totalXP', () => totalXP(records.sessions)],
    ['skillLedger', () => skillLedger(records.sessions, [])],
    ['trapLedger', () => trapLedger(records.sessions)],
    ['patternLedger', () => patternLedger(records.sessions)],
    ['deriveWorldState (no records at all)', () => deriveWorldState(empty, { sessions: [], learning: [] }, 1789000000000)],
    ['deriveWorldState (records undefined)', () => deriveWorldState(empty, { sessions: [], learning: [] }, undefined)],
  ];

  for (const [name, run] of cases) {
    try {
      const out = run();
      if (out === undefined) problems.push(`${name} returned undefined`);
    } catch (err) {
      problems.push(`${name} threw on hostile records: ${String(err && err.message ? err.message : err).slice(0, 120)}`);
    }
  }

  // And the numbers it does produce must not be nonsense the screens will show.
  try {
    const s = deriveWorldState(empty, records, 1789000000000);
    const p = s.pets;
    if (!p || p.pets?.length !== 7) problems.push('the pets did not derive');
    for (const pet of p?.pets ?? []) {
      if (!Number.isFinite(pet.mood) || pet.mood < 0 || pet.mood > 1) problems.push(`${pet.id}'s mood is ${pet.mood}`);
      if (!Number.isInteger(pet.hearts) || pet.hearts < 0 || pet.hearts > 5 || !Number.isFinite(pet.earned) || pet.earned < 0) problems.push(`${pet.id} has hearts ${pet.hearts}, earned ${pet.earned}`);
    }
    if (!Number.isFinite(p?.harmony)) problems.push(`harmony is ${p?.harmony}`);
    if (!Number.isFinite(p?.glow) || p.glow < 0) problems.push(`the village has ${p?.glow} Glow, which the satchel would print`);
    if (!Number.isInteger(p?.level?.level) || p.level.level < 1 || !Number.isFinite(p.level.pct)) problems.push(`the village level is ${JSON.stringify(p?.level)}`);
    if (p?.decor?.length !== 9 || p.decor.some((d) => typeof d.made !== 'boolean')) problems.push('the decor did not derive');
    if (p?.today?.picks?.length !== 3 || !(p.today.doneCount >= 0 && p.today.doneCount <= 3)) problems.push(`today has ${p?.today?.picks?.length} friends to help, not three`);
    if (!Number.isFinite(p?.flame?.days) || p.flame.days < 0 || p.flame.week?.length !== 7) problems.push(`the flame is ${p?.flame?.days} days`);
    if (!Number.isFinite(s.stars) || s.stars < 0) problems.push(`stars is ${s.stars}`);
    // The retired treasure and build rows are ignored entirely: on their own they meet nobody and earn nothing.
    const old = deriveWorldState(empty, retired, 1789000000000).pets;
    if (old.glow !== 0 || old.decor.some((d) => d.made) || !old.pets.every((x) => x.isNew)) problems.push('a retired village-* record was counted');
  } catch { /* already reported above */ }

  return { problems, cases: cases.length, records: records.sessions.length + records.learning.length };
}

if (process.argv[1]?.endsWith('check-hostile-records.mjs')) {
  const { problems, cases, records } = await checkHostileRecords();
  console.log(`\n${records} deliberately broken records through ${cases} derivations.`);
  if (!problems.length) { console.log('✓ the world still derives; no screen can be bricked by one bad row.\n'); process.exit(0); }
  console.log(`\n✗ ${problems.length} problem(s):\n`);
  for (const p of problems) console.log('  ' + p);
  console.log('');
  process.exit(1);
}
