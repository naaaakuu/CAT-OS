/**
 * check-noticing.mjs — the ledgers must reach a learner.
 *
 * For two releases the trap ledger, the pattern ledger and the skill ledger
 * were all derived correctly, tested by verify §20, and read by NOTHING. The
 * seven trap families had authored copy nobody ever saw; the hundred and
 * fifty-two reasoning patterns existed only in a JSON file no runtime code
 * loaded. The sophistication was all underneath, and it stayed there.
 *
 * A unit test that the ledgers COMPUTE cannot catch that — §20 passed the
 * whole time. This checks the other half: that a learner with a real habit
 * gets a real sentence, that the sentence has a number behind it, that the
 * curator's aim actually moves, and that the copy obeys the mentor voice.
 *
 * Run: node tools/check-noticing.mjs      verify.mjs §27.
 */

import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href);

/* The mentor's register (voice.js §9): never tell a learner they are bad at
   something. These words are banned in every line the app says. */
const BANNED = /\b(wrong|weak|mistake|failure|bad|poor|careless|stupid|lazy)\b/i;

/** A learner who keeps choosing options that are true but do not answer. */
function learnerWithAHabit(trapKeys, patternKey, skillKey) {
  return Array.from({ length: 4 }, (_, i) => ({
    id: `h${i}`,
    passage_id: `rc-000${i + 1}`,
    finished_at: `2026-09-1${i}T10:00:00Z`,
    score: { correct: 2, total: 4, accuracy: 0.5 },
    answers: [0, 1, 2, 3].map((q) => ({
      question_id: `q${q}`,
      type: 'inference',
      is_correct: q < 2,
      patterns: [patternKey],
      skill: skillKey,
      trap: q < 2 ? null : trapKeys[(i + q) % trapKeys.length],
    })),
  }));
}

export async function checkNoticing() {
  const problems = [];
  const { noticing, trapHabit, hitHabit, patternToWatch, skillToGrow } = await load('src/core/learning/noticing.js');
  const { PATTERNS, TRAP_FAMILY_LINE } = await load('src/core/learning/taxonomy.js');
  const { readingWeakness, nextPassage } = await load('src/world/curator.js');

  /* ---- The 152 patterns are in the CODE, not only in a JSON file ---- */
  const json = JSON.parse(readFileSync(join(ROOT, 'content/taxonomy/varc-taxonomy.json'), 'utf8'));
  const authored = json.reasoning_patterns ?? [];
  if (Object.keys(PATTERNS ?? {}).length !== authored.length) {
    problems.push(`PATTERNS mirrors ${Object.keys(PATTERNS ?? {}).length} of the taxonomy's ${authored.length} reasoning patterns — run tools/build-index.mjs' mirror, or they cannot be named offline`);
  }
  for (const p of authored.slice(0, 40)) {
    const m = PATTERNS?.[p.id];
    if (!m) { problems.push(`pattern ${p.id} is in the taxonomy and not in the code`); continue; }
    if (m.name !== p.name || m.instinct !== p.instinct) problems.push(`pattern ${p.id} has drifted from the taxonomy`);
  }

  /* ---- A learner with a habit is told about it ---- */
  const sessions = learnerWithAHabit(['true_but_irrelevant', 'wrong_structural_role', 'example_as_thesis'], 'inf.vs_speculation', 'inference');
  const out = noticing(sessions, []);
  if (!out.trap) problems.push('a learner who has fallen for the same family of option eight times is told nothing');
  else {
    if (!/\d/.test(out.trap.sentence)) problems.push(`the trap line has no number behind it: "${out.trap.sentence}"`);
    if (out.trap.key !== 'relevance') problems.push(`the habit is "${out.trap.key}"; it should be relevance`);
    if (!hitHabit(sessions[3].answers, out.trap)) problems.push('hitHabit does not recognise the run that just proved the habit');
  }
  if (!out.pattern) problems.push('a pattern met sixteen times at 50% is not surfaced');
  else if (!out.pattern.instinct) problems.push(`the pattern "${out.pattern.key}" has no instinct line to say`);
  if (!out.skill) problems.push('a skill answered sixteen times at 50% is not surfaced');
  else if (!out.skill.where) problems.push('the skill does not know where it is trained, so the button cannot point anywhere');

  /* ---- And a learner who is doing fine is left alone ---- */
  const clean = [{ id: 'c1', passage_id: 'rc-0001', finished_at: '2026-09-10T10:00:00Z', score: { correct: 4, total: 4 }, answers: [0, 1, 2, 3].map((q) => ({ question_id: `q${q}`, is_correct: true, patterns: ['inf.vs_speculation'], skill: 'inference' })) }];
  const quiet = noticing(clean, []);
  if (quiet.trap || quiet.pattern || quiet.skill) problems.push('a learner with a clean record is being told something anyway');

  /* ---- Every line is in the mentor's register ---- */
  for (const [what, o] of Object.entries(out)) {
    if (o?.sentence && BANNED.test(o.sentence)) problems.push(`the ${what} line is out of register: "${o.sentence}"`);
  }
  for (const [fam, line] of Object.entries(TRAP_FAMILY_LINE ?? {})) {
    if (BANNED.test(line)) problems.push(`TRAP_FAMILY_LINE.${fam} is out of register: "${line}"`);
  }

  /* ---- The curator's finest aim actually moves the choice ---- */
  const boot = JSON.parse(readFileSync(join(ROOT, 'content/boot-index.json'), 'utf8'));
  const names = boot.patterns ?? [];
  for (const r of boot.items ?? []) if (r.p) { r.patterns = r.p.map((i) => names[i]).filter(Boolean); delete r.p; }
  const rc = (boot.items ?? []).filter((i) => i.type === 'rc' && (i.status === 'accepted' || i.status === 'review'));
  const tagged = rc.filter((r) => (r.patterns ?? []).length).length;
  if (!tagged) {
    problems.push('no passage in the boot registry carries its reasoning patterns, so the curator can never aim at one');
  } else {
    const counts = {};
    for (const r of rc) for (const p of r.patterns ?? []) counts[p] = (counts[p] ?? 0) + 1;
    const target = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    const s2 = learnerWithAHabit(['true_but_irrelevant'], target, 'inference');
    const w = readingWeakness(s2);
    if (!w.pattern) problems.push('readingWeakness does not carry the weak pattern, so nextPassage cannot use it');
    else {
      const aimed = nextPassage({ rc }, new Map(), w, 'gate');
      if (!(aimed.item?.patterns ?? []).includes(target)) {
        problems.push(`the curator did not aim at ${target}: it chose ${aimed.item?.id}, which does not exercise it`);
      }
    }
  }

  return { problems, patterns: Object.keys(PATTERNS ?? {}).length, tagged };
}

if (process.argv[1]?.endsWith('check-noticing.mjs')) {
  const { problems, patterns, tagged } = await checkNoticing();
  console.log(`\n${patterns} reasoning patterns in the code, ${tagged} passages tagged with theirs.`);
  if (!problems.length) { console.log('✓ the ledgers reach a learner, in register, with a number behind every line.\n'); process.exit(0); }
  console.log(`\n✗ ${problems.length} problem(s):\n`);
  for (const p of problems) console.log('  ' + p);
  console.log('');
  process.exit(1);
}
