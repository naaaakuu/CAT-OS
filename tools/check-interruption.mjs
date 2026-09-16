/**
 * check-interruption.mjs — what a learner leaves behind, and what is read back.
 *
 * A learning session used to persist nothing until the very last click, so a
 * refresh one tap from the end threw the whole thing away. Each answer writes
 * a draft now — and a draft is a file on the learner's own device, written by
 * an older release, carried through a backup somebody may have edited by
 * hand. It is not a schema. Neither is the record log the ledgers read: §26
 * proves the village survives a hostile one; this proves the three screens
 * that speak to a learner do too.
 *
 * It found the defect it was written to look for on its first run: a loaded
 * passage keeps its id at `meta.id`, which finish() had always known and the
 * draft did not — so every passage in the library shared one draft slot, and
 * interrupting one then opening another offered to carry on with somebody
 * else's answers.
 *
 * Run: node tools/check-interruption.mjs      verify.mjs §29.
 */

import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';


const R = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(join(R, rel)).href);
const problems = [];
/* Quiet inside verify.mjs, which prints its own one line per section; loud
   when somebody runs it directly to see what it is actually checking. */
const LOUD = process.argv[1]?.endsWith('check-interruption.mjs');
const bad = (s) => { problems.push(s); if (LOUD) console.log('  ✗ ' + s); };
const ok = (s) => { if (LOUD) console.log('  · ' + s); };

const passage = {
  meta: { id: 'rc-0001', title: 'A test', estimated_time_min: 4 },
  id: 'rc-0001',
  questions: [
    { id: 'q1', correct: 'A', type: 'inference', skill: 'inference', patterns: ['inf.vs_speculation'] },
    { id: 'q2', correct: 'B', type: 'main_idea', skill: 'main_idea', patterns: [] },
    { id: 'q3', correct: 'C', type: 'tone', skill: 'tone', patterns: [] },
  ],
};

/* ---- 1. A draft made of garbage ---- */
if (LOUD) console.log('\n1. restore() against garbage');
{
  const { PracticeSession } = await load('src/core/engine/session.js');
  const junk = [
    null, undefined, 0, '', [], 'draft',
    {}, { passage_id: 'rc-9999', answers: [['q1', {}]] },
    { passage_id: 'rc-0001' },
    { passage_id: 'rc-0001', answers: null },
    { passage_id: 'rc-0001', answers: 'nope' },
    { passage_id: 'rc-0001', answers: [['q1', { chosen: 'A', is_correct: true }]], index: -5 },
    { passage_id: 'rc-0001', answers: [['q1', { chosen: 'A', is_correct: true }]], index: 9e9 },
    { passage_id: 'rc-0001', answers: [['gone', {}], ['q2', { chosen: 'B', is_correct: true }]], index: 1 },
    { passage_id: 'rc-0001', answers: [['q1', { chosen: 'A' }]], index: 0, started_at: 'yesterday', id: 42 },
    { passage_id: 'rc-0001', answers: [[null, null]], index: 1 },
  ];
  for (const j of junk) {
    const s = new PracticeSession(passage);
    let restored;
    try { restored = s.restore(j); } catch (err) { bad(`restore(${JSON.stringify(j)?.slice(0, 48)}) threw: ${err.message}`); continue; }
    if (s.index < 0 || s.index >= s.total) bad(`restore left index at ${s.index} of ${s.total}`);
    if (typeof s.id !== 'string' || !s.id) bad(`restore left the session id as ${typeof s.id}`);
    try { s.finish(); } catch (err) { bad(`finish() after restore(${JSON.stringify(j)?.slice(0, 40)}) threw: ${err.message}`); }
    void restored;
  }
  ok(`${junk.length} malformed drafts: none threw, every index stayed inside the passage, every finish() produced a record`);

  /* A real round trip. */
  const a = new PracticeSession(passage);
  a.answer('A'); a.next(); a.answer('X');
  const snap = a.snapshot();
  const b = new PracticeSession(passage);
  if (!b.restore(snap)) bad('a real snapshot did not restore');
  if (b.index !== a.index) bad(`restored to question ${b.index + 1}, was at ${a.index + 1}`);
  if (JSON.stringify(b.answerFor('q1')) !== JSON.stringify(a.answerFor('q1'))) bad('the restored answer is not the answer that was given');
  if (b.id !== a.id) bad('the restored session took a new id, so it would be recorded twice');
  ok('a real snapshot restores the same answers, the same place and the same id');

  /* A passage that has been edited under a draft. */
  const shorter = { meta: { id: 'rc-0001' }, id: 'rc-0001', questions: [passage.questions[0]] };
  const c = new PracticeSession(shorter);
  if (!c.restore(snap)) ok('a draft for a passage that has since lost its questions is declined cleanly');
  else if (c.index >= c.total) bad(`restore put the learner at question ${c.index + 1} of ${c.total}`);
  else ok('a draft survives its passage being shortened, clamped to what is left');
}

/* ---- 2. The noticing layer against nonsense ---- */
if (LOUD) console.log('\n2. noticing() against nonsense');
{
  const { noticing, trapHabit, hitHabit, skillToGrow } = await load('src/core/learning/noticing.js');
  const junk = [
    null, undefined, [], [null], [{}], [{ answers: null }], [{ answers: 'x' }],
    [{ answers: [null, undefined, 0, 'x'] }],
    [{ answers: [{ trap: 'not_a_family' }] }],
    [{ answers: [{ skill: null, patterns: null, is_correct: 'maybe' }] }],
    [{ score: null, answers: [{ trap: 'true_but_irrelevant', is_correct: false }] }],
  ];
  for (const j of junk) {
    try {
      const out = noticing(j, j);
      if (out && typeof out !== 'object') bad(`noticing returned ${typeof out}`);
      for (const k of ['trap', 'pattern', 'skill']) {
        const o = out?.[k];
        if (o && typeof o.sentence !== 'string') bad(`noticing().${k} has a ${typeof o.sentence} sentence`);
      }
    } catch (err) { bad(`noticing(${JSON.stringify(j)?.slice(0, 40)}) threw: ${err.message}`); }
    try { trapHabit(j); hitHabit(j?.[0]?.answers, null); skillToGrow(j, j); } catch (err) { bad(`a noticing helper threw on junk: ${err.message}`); }
  }
  ok(`${junk.length} nonsense record sets: nothing threw, every sentence is a string`);
}

/* ---- 3. The derived village against a running purse ---- */
if (LOUD) console.log('\n3. The order board never promises what the barn cannot pay');
{
  const { deriveVillage } = await load('src/village/state.js');
  const iso = (d) => new Date(Date.now() - d * 864e5).toISOString();
  const learning = [
    { id: 'b1', kind: 'village-build', building: 'garden', level: 1, cost: { coins: 0 }, at: iso(9) },
    { id: 'b2', kind: 'village-build', building: 'market', level: 1, cost: { coins: 0 }, at: iso(8) },
    { id: 'c1', kind: 'village-collect', building: 'reading', good: 'books', amount: 1, at: iso(1) },
  ];
  const sessions = Array.from({ length: 12 }, (_, i) => ({
    id: 's' + i, passage_id: 'rc-000' + ((i % 6) + 1), finished_at: iso(9 - (i % 9)),
    stars: 3, score: { correct: 4, total: 4, accuracy: 1 },
    answers: [0, 1, 2, 3].map((q) => ({ question_id: 'q' + q, is_correct: true, skill: 'inference', patterns: [] })),
  }));
  let v;
  try { v = deriveVillage({}, { learning, sessions }, null, Date.now()); } catch (err) { bad('deriveVillage threw: ' + err.message); }
  if (v) {
    const deliverable = (v.orders ?? []).filter((o) => o.deliverable);
    // Every deliverable order must be payable in sequence from one barn.
    let purse = { ...v.stock };
    for (const o of deliverable) {
      for (const [k, n] of Object.entries(o.needs ?? {})) {
        if (!n) continue;
        purse[k] = (purse[k] ?? 0) - n;
        if (purse[k] < 0) { bad(`${deliverable.length} orders say "Deliver" and the barn runs ${-purse[k]} ${k} short on order ${o.id ?? '?'}`); break; }
      }
    }
    ok(`${(v.orders ?? []).length} orders on the board, ${deliverable.length} deliverable, all payable in sequence from one barn`);
    // And the queue never counts the thing on the bench as waiting.
    for (const b of v.buildings ?? []) {
      const q = b.queue;
      if (!q) continue;
      if (q.waiting > q.pending) bad(`${b.id}: waiting ${q.waiting} exceeds pending ${q.pending}`);
      if (q.working && q.waiting === q.pending && q.pending > 0) bad(`${b.id}: the item on the bench is still counted as waiting`);
      if (q.waiting < 0) bad(`${b.id}: waiting is ${q.waiting}`);
    }
    ok('every queue counts the bench separately from the wait');
  }
}

export const cases = { drafts: 16, records: 11 };
export const interruptionProblems = problems;

if (LOUD) {
  console.log(`\n${problems.length ? '✗ ' + problems.length + ' problem(s)' : '✓ a hostile draft and a hostile record log take nothing down'}\n`);
  process.exit(problems.length ? 1 : 0);
}
