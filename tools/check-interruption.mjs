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
 * Since 2.1.3 it also covers the four engines that were left out — Para
 * Jumbles, Para Summary, Odd One Out and Word DNA — and one rule for all
 * six: a draft carries time ON TASK, so a set left overnight is recorded as
 * the minutes spent on it, never as the night. A draft also cannot claim a
 * mark: restore() re-marks every choice against the item.
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
let draftCases = 23; // §1 (16) and §1b (7); §1c and §1d count themselves
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

/* ---- 1b. A bank set is up to a quarter of an hour ---- */
if (LOUD) console.log('\n1b. A bank set carried across an interruption');
{
  const { BankSession } = await load('src/core/engine/bank-session.js');
  const items = [1, 2, 3, 4, 5].map((n) => ({ id: 'i' + n, correct: 'A', options: [], distractors: [], skill: 'placement', patterns: [], kind: 'sp', time_sec: 60 }));
  const opts = { module: 'sp', setId: 'sp-set:foundation', region: 'loom' };

  const a = new BankSession(items, opts);
  a.answer('A'); a.next(); a.answer('B'); a.next();
  const snap = a.snapshot();
  const b = new BankSession(items, opts);
  if (!b.restore(snap)) bad('a bank set does not carry across an interruption');
  if (b.index !== a.index) bad(`the bank set resumed at item ${b.index + 1}, not ${a.index + 1}`);
  if (b.id !== a.id) bad('the resumed bank set took a new id, so it would be recorded twice');
  ok('a real set resumes at the same item, with the same answers and the same id');

  /* A set is PICKED fresh every time (pickSet puts unsolved first and rests
     what was just seen), so half of one run must never land inside another. */
  if (new BankSession(items, { ...opts, setId: 'pc-set:easy' }).restore(snap)) bad('a draft from one bank restored into another');
  if (new BankSession([items[4], ...items.slice(0, 4)], opts).restore(snap)) bad('a draft restored into a set holding the same items in a different order');
  if (new BankSession(items.slice(0, 3), opts).restore(snap)) bad('a draft restored into a shorter set');
  ok('a different bank, a reshuffled set and a shorter set are all declined');

  const junk = [null, undefined, {}, { set_id: 'sp-set:foundation' },
    { set_id: 'sp-set:foundation', items: 'x' },
    { set_id: 'sp-set:foundation', items: ['i1', 'i2', 'i3', 'i4', 'i5'], answers: 'no' },
    { set_id: 'sp-set:foundation', items: ['i1', 'i2', 'i3', 'i4', 'i5'], answers: [['i1', {}]], index: 1e9 }];
  for (const j of junk) {
    const s2 = new BankSession(items, opts);
    try { s2.restore(j); } catch (err) { bad(`bank restore threw on ${JSON.stringify(j)?.slice(0, 40)}: ${err.message}`); continue; }
    if (s2.index < 0 || s2.index >= s2.total) bad(`bank restore left index at ${s2.index} of ${s2.total}`);
    try { s2.finish(); } catch (err) { bad(`bank finish() after a junk restore threw: ${err.message}`); }
  }
  ok(`${junk.length} malformed bank drafts: none threw, every index stayed inside the set`);
}

/* ---- 1c. The four engines that recorded nothing until the last click ---- */
if (LOUD) console.log('\n1c. Para Jumbles, Para Summary, Odd One Out and Word DNA carried across an interruption');
{
  const { PJSession } = await load('src/core/engine/pj-session.js');
  const { PSSession } = await load('src/core/engine/ps-session.js');
  const { OOOSession } = await load('src/core/engine/ooo-session.js');
  const { WDSession } = await load('src/core/engine/wd-session.js');
  const labels = (n) => 'ABCDE'.slice(0, n).split('').map((l) => ({ label: l, text: 'Sentence ' + l }));
  const pj = (n) => ({ meta: { id: 'pj-000' + n }, sentences: labels(4), correct_order: ['B', 'A', 'D', 'C'] });
  const ps = (n) => ({ meta: { id: 'ps-000' + n }, question: { correct: 'C', options: [] } });
  const ooo = (n) => ({ meta: { id: 'ooo-000' + n }, sentences: labels(5), outlier: 'E', core_order: ['B', 'A', 'D', 'C'] });
  const wd = (n) => ({ meta: { id: 'wd-000' + n }, discovery: {
    predict_options: [{ text: 'x', correct: false }, { text: 'y', correct: true }, { text: 'z', correct: false }],
    applies: [{ held_out_word: 'w', options: [{ correct: true }, { correct: false }, { correct: false }] },
      { held_out_word: 'v', options: [{ correct: false }, { correct: true }] }],
  } });
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

  /* Each engine: the items, a real half-played set, and a draft that LIES —
     a wrong choice carrying is_correct: true, which restore() must re-mark. */
  const engines = [
    { name: 'Para Jumbles', make: (items, id, o) => new PJSession(items, id, o), items: [1, 2, 3].map(pj), id: 'pj-set:foundation', other: 'pj-set:easy',
      play: (s) => { s.answer(['B', 'A', 'D', 'C']); s.next(); s.answer(['A', 'B', 'C', 'D'], { revised: true, read_back_ms: 900 }); s.next(); },
      lie: { entered: ['A', 'B', 'C', 'D'], is_correct: true, positions_correct: 4, links_correct: 3 } },
    { name: 'Para Summary', make: (items, id, o) => new PSSession(items, id, o), items: [1, 2, 3].map(ps), id: 'ps-set:foundation', other: 'ps-set:easy',
      play: (s) => { s.answer('C', { summary_written: true, summary_text: 'The point.' }); s.next(); s.answer('A', { think_opened: true }); s.next(); },
      lie: { chosen: 'A', is_correct: true } },
    { name: 'Odd One Out', make: (items, id, o) => new OOOSession(items, id, o), items: [1, 2, 3].map(ooo), id: 'ooo-set:foundation', other: 'ooo-set:easy',
      play: (s) => { s.answer('E', { built: ['B', 'A', 'D', 'C'], read_back_ms: 1200 }); s.next(); s.answer('A', { built: ['B', 'E', 'D', 'C'] }); s.next(); },
      lie: { chosen: 'A', is_correct: true, built: ['B', 'E', 'D', 'C'], build_links_correct: 3 } },
    { name: 'Word DNA', make: (items, id, o) => new WDSession(items, id, o), items: [1, 2, 3].map(wd), id: 'wd-set:root', other: 'wd-set:prefix',
      /* Interrupted INSIDE a family: Predict and the first Apply answered, the second not. */
      play: (s) => { s.answerPredict(1); s.answerApply(0, 0); s.answerApply(1, 1); s.next(); s.answerPredict(0); s.answerApply(0, 2); },
      lie: { predict: { chosen_index: 0, is_correct: true }, applies: [{ chosen_index: 2, is_correct: true }, { chosen_index: 1, is_correct: true }] } },
  ];

  for (const e of engines) {
    const ids = e.items.map((i) => i.meta.id);
    const first = ids[0];

    /* A real round trip. */
    const a = e.make(e.items, e.id); e.play(a);
    const snap = a.snapshot();
    const b = e.make(e.items, e.id);
    if (!b.restore(snap)) { bad(e.name + ': a real snapshot did not restore'); continue; }
    if (b.index !== a.index) bad(e.name + ': resumed at item ' + (b.index + 1) + ', was at ' + (a.index + 1));
    if (b.id !== a.id) bad(e.name + ': the resumed set took a new id, so it would be recorded twice');
    for (const id of ids) if (!same(a.answerFor(id), b.answerFor(id))) bad(e.name + ': ' + id + ' restored as ' + JSON.stringify(b.answerFor(id)) + ', was ' + JSON.stringify(a.answerFor(id)));
    if (!same(a.finish().session.answers, b.finish().session.answers)) bad(e.name + ': the record after a restore differs from the record without one');
    draftCases += 1;

    /* Declined: another set, the same items reshuffled, a shorter set. */
    if (e.make(e.items, e.other).restore(snap)) bad(e.name + ': a draft from one set restored into another');
    if (e.make([e.items[2], e.items[0], e.items[1]], e.id).restore(snap)) bad(e.name + ': a draft restored into the same items in a different order');
    if (e.make(e.items.slice(0, 2), e.id).restore(snap)) bad(e.name + ': a draft restored into a shorter set');
    draftCases += 3;

    /* A draft cannot claim a mark. */
    const liar = e.make(e.items, e.id);
    if (!liar.restore({ ...snap, index: 1, answers: [[ids[1], e.lie]] })) bad(e.name + ': a draft with one plausible answer was declined');
    else {
      const rec = liar.finish().session.answers[1];
      if (rec.is_correct !== false) bad(e.name + ': a draft claiming is_correct:true on a wrong answer was believed: ' + JSON.stringify(rec));
      if (rec.links_correct === 3 || rec.build_links_correct === 3) bad(e.name + ': a draft claiming every join was believed');
    }
    draftCases += 1;

    /* Garbage. */
    const junk = [null, undefined, 0, '', [], 'draft', {}, { set_id: e.id }, { set_id: e.id, items: 'x' }, { set_id: e.id, items: ids },
      { set_id: e.id, items: ids, answers: 'no' },
      { set_id: e.id, items: ids, answers: [null, 7, ['nope', {}], [first, null], [first, 'x'], [first, 3]] },
      { set_id: e.id, items: ids, answers: [[first, {}]], index: -4 },
      { set_id: e.id, items: ids, answers: [[first, {}]], index: 1e9, elapsed_ms: -1e12, id: 42 },
      { set_id: e.id, items: ids, answers: [[first, {}]], elapsed_ms: 1e15 },
      { set_id: e.id, items: ids, index: 'two', elapsed_ms: 'long',
        answers: [[first, { entered: 'BADC', chosen: 7, built: 'x', predict: 'y', applies: 'z', summary_text: 9, time_ms: 'soon', read_back_ms: NaN }]] },
      { set_id: e.id, items: ids,
        answers: [[first, { entered: [1, 2], built: [null], predict: { chosen_index: 99 }, applies: [{ chosen_index: -1 }, { chosen_index: 1.5 }, { chosen_index: 0 }] }]] },
    ];
    for (const j of junk) {
      const s = e.make(e.items, e.id);
      try { s.restore(j); } catch (err) { bad(e.name + ': restore(' + JSON.stringify(j)?.slice(0, 48) + ') threw: ' + err.message); continue; }
      if (s.index < 0 || s.index >= s.total) bad(e.name + ': restore left index at ' + s.index + ' of ' + s.total);
      if (typeof s.id !== 'string' || !s.id) bad(e.name + ': restore left the session id as ' + typeof s.id);
      const ago = Date.now() - s.startedAt;
      if (!(ago >= 0 && ago <= 864e5 + 1000)) bad(e.name + ': restore put the start ' + Math.round(ago / 36e5) + ' hours ago');
      try {
        const r = s.finish();
        if (!Array.isArray(r.session.answers) || r.session.answers.length !== s.total) bad(e.name + ': finish() after a junk restore produced ' + r.session.answers?.length + ' answers');
        if (!(r.session.duration_ms >= 0)) bad(e.name + ': duration ' + r.session.duration_ms + ' after a junk restore');
      } catch (err) { bad(e.name + ': finish() after restore(' + JSON.stringify(j)?.slice(0, 40) + ') threw: ' + err.message); }
      draftCases += 1;
    }
    ok(e.name + ': a real set resumes at the same item with the same answers and id; another set, a reshuffle and a shorter set are declined; a draft cannot claim a mark; ' + junk.length + ' malformed drafts take nothing down');
  }

  /* ---- 1d. A set interrupted overnight is not an eight-hour set ---- */
  if (LOUD) console.log('\n1d. Time on task, not wall-clock');
  {
    const { PracticeSession } = await load('src/core/engine/session.js');
    const { BankSession } = await load('src/core/engine/bank-session.js');
    let t = 0;
    const now = () => t;
    const bank = [1, 2, 3].map((n) => ({ id: 'i' + n, correct: 'A', options: [], distractors: [], skill: 'placement', patterns: [], kind: 'sp', time_sec: 60 }));
    const six = [
      ['Reading', () => new PracticeSession(passage, { now }), (s) => s.answer('A')],
      ['Bank', () => new BankSession(bank, { module: 'sp', setId: 'sp-set:x', region: 'loom' }, { now }), (s) => s.answer('A')],
      ...engines.map((e) => [e.name, () => e.make(e.items, e.id, { now }), (s) => e.play(s)]),
    ];
    for (const [name, make, act] of six) {
      t = 0; const a = make();
      t = 60_000; act(a);
      const snap = a.snapshot();
      t = 8 * 3600_000; const b = make();
      if (!b.restore(snap)) { bad(name + ': the overnight set could not be restored'); continue; }
      t += 30_000;
      const d = b.finish().session.duration_ms;
      if (d !== 90_000) bad(name + ': a set left overnight after 60 s and finished 30 s after resuming was recorded as ' + Math.round(d / 1000) + ' s, not 90');
      if (b.startedAt !== t - 90_000) bad(name + ': startedAt after a restore is ' + b.startedAt + ', not ' + (t - 90_000));
      draftCases += 1;
    }
    ok('six engines: a set left overnight is recorded as the time actually spent on it, never the night');
  }
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

/* ---- 3. The satchel against a running ledger ---- */
if (LOUD) console.log('\n3. The satchel never shows more than was earned, and a treasure is paid once');
{
  const { derivePets, canMake } = await load('src/pets/economy.js');
  const iso = (d) => new Date(Date.now() - d * 864e5).toISOString();
  const sessions = Array.from({ length: 12 }, (_, i) => ({
    id: 's' + i, passage_id: 'rc-000' + ((i % 6) + 1), finished_at: iso(9 - (i % 9)), duration_ms: 300000,
    score: { correct: 4, total: 4, accuracy: 1 },
    answers: [0, 1, 2, 3].map((q) => ({ question_id: 'q' + q, is_correct: true, skill: 'inference', patterns: [] })),
  }));
  const content = { rc: Array.from({ length: 6 }, (_, i) => ({ id: 'rc-000' + (i + 1), estimated_time_min: 6 })) };
  const lex = Array.from({ length: 6 }, (_, i) => ({ id: 'lx' + i, kind: 'lex-round', region: 'meadow', stars: 3, score: { correct: 11, total: 12 }, finished_at: iso(8 - i) }));
  let pets;
  try { pets = derivePets({}, { sessions, learning: lex }, content, Date.now()); } catch (err) { bad('derivePets threw: ' + err.message); }
  if (pets) {
    const can = canMake(pets, 'lanterns');
    if (!can.ok) bad('twelve passages and six rounds should afford the lanterns: missing ' + JSON.stringify(can.missing));
    // Made twice, a day apart: paid once.
    const made = [...lex, { id: 't1', kind: 'village-treasure', treasure: 'lanterns', at: iso(0.5) }, { id: 't2', kind: 'village-treasure', treasure: 'lanterns', at: iso(0.4) }];
    const after = derivePets({}, { sessions, learning: made }, content, Date.now());
    if (after.stock.leaves !== pets.stock.leaves - 2 || after.stock.stories !== pets.stock.stories - 2) bad(`making the lanterns twice must pay once (leaves ${pets.stock.leaves}→${after.stock.leaves}, stories ${pets.stock.stories}→${after.stock.stories})`);
    if (after.nextTreasure?.id !== 'bunting') bad('after the lanterns, the bunting is next');
    for (const [k, n] of Object.entries(after.stock)) if (!(n >= 0)) bad(`stock.${k} is ${n}`);
    // A record for a treasure that could not have been afforded still cannot drive the satchel negative.
    const greedy = derivePets({}, { sessions: [], learning: [{ id: 'g', kind: 'village-treasure', treasure: 'lanterns', at: iso(1) }] }, content, Date.now());
    for (const [k, n] of Object.entries(greedy.stock)) if (n < 0) bad(`a treasure with nothing earned left stock.${k} at ${n}`);
    ok(`${Object.values(pets.stock).reduce((x, y) => x + y, 0)} gifts in the satchel; the lanterns paid once though recorded twice; nothing ever below zero`);
  }
}

if (LOUD) {
  console.log(`\n${problems.length ? '✗ ' + problems.length + ' problem(s)' : '✓ a hostile draft and a hostile record log take nothing down'}\n`);
  process.exit(problems.length ? 1 : 0);
}
