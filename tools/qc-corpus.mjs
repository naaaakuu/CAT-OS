#!/usr/bin/env node
/**
 * tools/qc-corpus.mjs — the content quality system, at corpus level.
 *
 * The loader checks one file at a time: schema, cross-field truths, one
 * defensible key, no repeated options, no prose that names a letter. This
 * tool checks what only the whole corpus can show:
 *
 *   • every taxonomy id a file names exists (skills, patterns, traps)
 *   • no two files share a sentence, a stem, a title or an opening
 *   • answer keys are balanced, per type, across the corpus
 *   • no trap type dominates a type's distractors
 *   • the inference family is where CAT puts it (35–55% of RC questions)
 *   • absolute words are not a tell (the correct option is not
 *     systematically the only one without "always" / "never")
 *   • explanations teach (no "is correct because it is supported")
 *   • text hygiene: double spaces, stray spaces before punctuation
 *   • the audit: counts, distinct patterns and traps, genres, structures,
 *     length classes, difficulty vectors, tiers, kinds
 *
 * Hard problems fail the run (and verify.mjs §20); soft ones are listed.
 *
 *   node tools/qc-corpus.mjs            the report
 *   node tools/qc-corpus.mjs --json     the same, as JSON
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const list = (dir) => {
  const abs = path.join(ROOT, 'content', dir);
  return fs.existsSync(abs) ? fs.readdirSync(abs).filter((f) => f.endsWith('.json')).sort().map((f) => ({ id: f.replace('.json', ''), rel: `content/${dir}/${f}` })) : [];
};

const ABSOLUTE = /\b(always|never|only|all|none|every|entirely|completely|impossible|cannot|solely|invariably|wholly|totally|purely|nothing|no one|nobody|everyone|everything|must)\b/i;
const LETTER_MENTION = /\b[Oo]ption\s+([A-D])\b/g;
const WEAK_EXPLANATION = /\b(is|are) (correct|right|wrong|incorrect) because (it|this|the option) (is|isn't|is not) (supported|stated|mentioned|in the passage)\b/i;

const norm = (s) => String(s ?? '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const head = (s, n = 12) => norm(s).split(' ').slice(0, n).join(' ');
const words = (s) => norm(s).split(' ').filter(Boolean).length;

export function runCorpusQC() {
  const errors = [];
  const warnings = [];
  const stats = { counts: {}, questions: {}, keys: {}, traps: {}, patterns: new Set(), skills: new Set(), genres: {}, structures: {}, length_classes: {}, tiers: {}, kinds: {}, difficulty_vectors: new Set(), quality: {} };
  const tax = read('content/taxonomy/varc-taxonomy.json');
  const PATTERN = new Set(tax.reasoning_patterns.map((p) => p.id));
  const SKILL = new Set(tax.skills.map((s) => s.key));
  const RC_TRAP = new Set(tax.trap_types.map((t) => t.key));
  const PLACE_TRAP = new Set(tax.verbal.placement_traps.map((t) => t.key));
  const WORD_TRAP = new Set(tax.verbal.word_traps.map((t) => t.key));
  const CR_TRAP = new Set(tax.verbal.cr_traps.map((t) => t.key));
  const INFERENCE_FAMILY = new Set(tax.rc_question_types.filter((t) => t.family === 'inference').map((t) => t.key));

  /* ---- shared accumulators ---- */
  const sentenceOwners = new Map(); // normalised sentence → [file ids]
  const openingOwners = new Map();  // first-12-words → [file ids]
  const titleOwners = new Map();
  const noteSentence = (text, id, minWords = 8) => {
    if (words(text) < minWords) return;
    const k = norm(text);
    const arr = sentenceOwners.get(k) ?? []; if (!arr.includes(id)) arr.push(id); sentenceOwners.set(k, arr);
    const h = head(text);
    const arr2 = openingOwners.get(h) ?? []; if (!arr2.includes(id)) arr2.push(id); openingOwners.set(h, arr2);
  };
  const noteTitle = (title, id) => { const k = norm(title); const arr = titleOwners.get(k) ?? []; arr.push(id); titleOwners.set(k, arr); };
  const bump = (obj, k) => { obj[k] = (obj[k] ?? 0) + 1; };
  const keyTally = (type, letter) => { stats.keys[type] ??= { A: 0, B: 0, C: 0, D: 0 }; stats.keys[type][letter] += 1; };
  const trapTally = (type, trap) => { stats.traps[type] ??= {}; bump(stats.traps[type], trap); };
  const longest = {}; // type → { n, correct_longest } — is the answer the fattest option?
  const lenTally = (type, q) => {
    const lens = ['A', 'B', 'C', 'D'].map((l) => String(q.options[l] ?? '').trim().length);
    const max = Math.max(...lens);
    const ties = lens.filter((x) => x === max).length;
    longest[type] ??= { n: 0, correct_longest: 0 };
    longest[type].n += 1;
    if (ties === 1 && String(q.options[q.correct] ?? '').trim().length === max) longest[type].correct_longest += 1;
  };
  const absolute = {}; // type → { correct:{n,abs}, wrong:{n,abs} }
  const absTally = (type, text, isCorrect) => {
    absolute[type] ??= { correct: { n: 0, abs: 0 }, wrong: { n: 0, abs: 0 } };
    const b = absolute[type][isCorrect ? 'correct' : 'wrong']; b.n += 1; if (ABSOLUTE.test(text)) b.abs += 1;
  };
  const hygiene = (text, where) => {
    const t = String(text ?? '');
    if (/  /.test(t)) warnings.push(`${where}: double space`);
    if (/ [,;:?!]| \.(?!\.\.)/.test(t)) warnings.push(`${where}: space before punctuation`);
    if (t !== t.trim()) warnings.push(`${where}: leading or trailing space`);
  };
  const letterMentions = (text, where, expected) => {
    for (const m of String(text ?? '').matchAll(LETTER_MENTION)) {
      if (expected && m[1] !== expected) errors.push(`${where}: prose names option ${m[1]} (expected ${expected}) — keys are shuffled, prose must not name letters`);
      else if (!expected) warnings.push(`${where}: prose names option ${m[1]}`);
    }
  };
  const checkMCQ = (type, where, q, distractors, trapSet) => {
    keyTally(type, q.correct);
    lenTally(type, q);
    for (const l of ['A', 'B', 'C', 'D']) { absTally(type, q.options[l], l === q.correct); hygiene(q.options[l], `${where} option ${l}`); }
    if (q.explanation?.correct_reasoning) {
      letterMentions(q.explanation.correct_reasoning, `${where} correct_reasoning`, q.correct);
      if (WEAK_EXPLANATION.test(q.explanation.correct_reasoning)) errors.push(`${where}: correct_reasoning says only that the option is supported — explain the reasoning`);
      if (words(q.explanation.correct_reasoning) < 12) warnings.push(`${where}: correct_reasoning is very short`);
      hygiene(q.explanation.correct_reasoning, `${where} correct_reasoning`);
    }
    for (const d of distractors ?? []) {
      trapTally(type, d.trap_type);
      if (trapSet && !trapSet.has(d.trap_type)) errors.push(`${where}: trap "${d.trap_type}" is not in the taxonomy for ${type}`);
      letterMentions(d.why_wrong, `${where} distractor ${d.option}`, d.option);
      if (WEAK_EXPLANATION.test(d.why_wrong ?? '')) errors.push(`${where} distractor ${d.option}: why_wrong says only that it is unsupported — name the trap`);
      hygiene(d.why_wrong, `${where} distractor ${d.option}`);
    }
    const stemKey = norm(q.stem);
    return stemKey;
  };
  const checkPatterns = (arr, where) => { for (const p of arr ?? []) if (!PATTERN.has(p)) errors.push(`${where}: pattern "${p}" is not in the taxonomy`); for (const p of arr ?? []) stats.patterns.add(p); };
  const checkSkill = (s, where) => { if (s && !SKILL.has(s)) errors.push(`${where}: skill "${s}" is not in the taxonomy`); if (s) stats.skills.add(s); };

  /* ---- RC ---- */
  {
    const files = list('reading-comprehension');
    stats.counts.rc = files.length; stats.questions.rc = 0;
    let inferenceQ = 0;
    for (const { id, rel } of files) {
      const p = read(rel);
      const v = p.schema_version ?? 1;
      const m = p.meta;
      bump(stats.genres, m.genre);
      if (v >= 5) { bump(stats.structures, m.structure); bump(stats.length_classes, m.length_class); stats.difficulty_vectors.add(Object.values(m.difficulty_vector).join('')); bump(stats.quality, m.quality.status); checkPatterns(m.reasoning_patterns, id); }
      noteTitle(p.passage.title, id);
      for (const para of p.passage.paragraphs) { noteSentence(para.text.split(/(?<=[.!?])\s+/)[0], id); hygiene(para.text, `${id} ${para.id}`); }
      const stems = new Set();
      for (const q of p.questions) {
        stats.questions.rc += 1;
        if (INFERENCE_FAMILY.has(q.type)) inferenceQ += 1;
        const where = q.id;
        const stemKey = checkMCQ('rc', where, q, q.explanation?.distractors, RC_TRAP);
        if (stems.has(stemKey)) errors.push(`${where}: repeats another stem in the same passage`); stems.add(stemKey);
        if (v >= 5) { checkPatterns(q.patterns, where); checkSkill(q.skill, where); for (const s of q.secondary_skills ?? []) checkSkill(s, where); }
        hygiene(q.stem, `${where} stem`);
      }
    }
    if (stats.questions.rc >= 60) {
      const share = inferenceQ / stats.questions.rc;
      stats.inference_share_rc = Math.round(share * 100) / 100;
      if (share < 0.35 || share > 0.55) warnings.push(`RC: the inference family is ${Math.round(share * 100)}% of questions (target 35–55%)`);
    }
  }

  /* ---- PJ / OOO: sentences; PS: paragraph + options ---- */
  for (const [type, dir] of [['pj', 'para-jumbles'], ['ooo', 'odd-one-out']]) {
    const files = list(dir);
    stats.counts[type] = files.length;
    for (const { id, rel } of files) {
      const p = read(rel); const m = p.meta;
      bump(stats.genres, m.genre); stats.tiers[type] ??= {}; bump(stats.tiers[type], m.tier);
      if ((p.schema_version ?? 1) >= 2) { checkPatterns(m.reasoning_patterns, id); bump(stats.quality, m.quality.status); }
      noteTitle(m.title, id);
      for (const s of p.sentences) { noteSentence(s.text, id); hygiene(s.text, `${id} ${s.label}`); }
      if (type === 'pj') for (const t of p.explanation?.tempting_orders ?? []) trapTally('pj', t.trap_type);
      if (type === 'ooo') trapTally('ooo', m.violation_type);
    }
  }
  {
    const files = list('para-summary');
    stats.counts.ps = files.length;
    for (const { id, rel } of files) {
      const p = read(rel); const m = p.meta;
      bump(stats.genres, m.genre); stats.tiers.ps ??= {}; bump(stats.tiers.ps, m.tier);
      if ((p.schema_version ?? 1) >= 2) { checkPatterns(m.reasoning_patterns, id); bump(stats.quality, m.quality.status); }
      noteTitle(m.title, id);
      for (const s of p.paragraph.sentences) { noteSentence(s.text, id); hygiene(s.text, `${id} paragraph`); }
      const q = p.question;
      keyTally('ps', q.correct);
      for (const l of ['A', 'B', 'C', 'D']) { absTally('ps', q.options[l], l === q.correct); hygiene(q.options[l], `${id} option ${l}`); }
      letterMentions(q.explanation.correct_reasoning, `${id} correct_reasoning`, q.correct);
      for (const d of q.explanation.distractors) { trapTally('ps', d.archetype); letterMentions(d.why_wrong, `${id} distractor ${d.option}`, d.option); }
    }
  }

  /* ---- SP / PC ---- */
  for (const [type, dir] of [['sp', 'sentence-placement'], ['pc', 'para-completion']]) {
    const files = list(dir);
    stats.counts[type] = files.length;
    for (const { id, rel } of files) {
      const p = read(rel); const m = p.meta;
      bump(stats.genres, m.genre); stats.tiers[type] ??= {}; bump(stats.tiers[type], m.tier);
      checkPatterns(m.reasoning_patterns, id); bump(stats.quality, m.quality.status);
      if (!PLACE_TRAP.has(m.primary_trap)) errors.push(`${id}: primary_trap "${m.primary_trap}" is not in the taxonomy`);
      noteTitle(m.title, id);
      const sentences = type === 'sp' ? p.paragraph.sentences.map((s) => s.text).concat([p.missing.text]) : p.paragraph.sentences.concat([p.question.options[p.question.correct]]);
      for (const s of sentences) { noteSentence(s, id); hygiene(s, `${id} sentence`); }
      checkMCQ(type, id, p.question, p.explanation.distractors, PLACE_TRAP);
      letterMentions(p.explanation.correct_reasoning, `${id} correct_reasoning`, p.question.correct);
      if (type === 'pc') { stats.kinds.pc ??= {}; bump(stats.kinds.pc, m.gap_function); for (const l of ['A', 'B', 'C', 'D']) if (l !== p.question.correct) noteSentence(p.question.options[l], `${id}:${l}`); }
    }
  }

  /* ---- WB / CR bundles ---- */
  for (const [type, dir] of [['wb', 'word-bank'], ['cr', 'critical-reasoning']]) {
    const files = list(dir);
    stats.counts[type] = files.length; stats.questions[type] = 0;
    const wordOwners = new Map();
    for (const { id, rel } of files) {
      const p = read(rel); const m = p.meta;
      bump(stats.quality, m.quality.status);
      stats.kinds[type] ??= {};
      if (type === 'wb') bump(stats.kinds.wb, m.kind);
      noteTitle(m.title, id);
      for (const it of p.items) {
        stats.questions[type] += 1;
        const where = it.id;
        checkPatterns(it.patterns, where); checkSkill(it.skill, where);
        checkMCQ(type, where, it, it.explanation.distractors, type === 'wb' ? WORD_TRAP : CR_TRAP);
        if (type === 'wb') {
          noteSentence(it.stem, where, 6);
          const k = `${m.kind}:${norm(it.word)}`;
          const arr = wordOwners.get(k) ?? []; arr.push(where); wordOwners.set(k, arr);
        } else {
          bump(stats.kinds.cr, it.kind); bump(stats.genres, it.genre);
          noteSentence(it.argument.split(/(?<=[.!?])\s+/)[0], where);
          hygiene(it.argument, `${where} argument`);
        }
      }
    }
    for (const [k, owners] of wordOwners) if (owners.length > 1) warnings.push(`word bank: "${k.split(':')[1]}" is tested ${owners.length} times as ${k.split(':')[0]} (${owners.join(', ')})`);
  }

  /* ---- Word DNA / lg (counts only) ---- */
  stats.counts.wd = list('word-dna').length;
  stats.counts.lg = list('language-garden').length;
  stats.members = { wd: 0, lg: 0 };
  for (const { rel } of list('word-dna')) stats.members.wd += read(rel).members.length;
  for (const { rel } of list('language-garden')) stats.members.lg += read(rel).members.length;
  stats.counts.lex = list('lexicon').length; stats.counts.twin = list('twins').length; stats.counts.loan = list('loanwords').length;
  stats.entries = { lex: 0, twin: 0, loan: 0 };
  for (const t of ['lex', 'twin', 'loan']) for (const { rel } of list({ lex: 'lexicon', twin: 'twins', loan: 'loanwords' }[t])) stats.entries[t] += read(rel).entries.length;

  /* ---- Duplicates across files ---- */
  for (const [k, owners] of sentenceOwners) {
    const distinct = [...new Set(owners.map((o) => o.split(':')[0]))];
    if (distinct.length > 1) errors.push(`duplicate sentence across ${distinct.join(', ')}: "${k.slice(0, 70)}…"`);
  }
  for (const [k, owners] of openingOwners) {
    const distinct = [...new Set(owners.map((o) => o.split(':')[0]))];
    if (distinct.length > 1 && !sentenceOwners.has(k)) warnings.push(`same opening words across ${distinct.join(', ')}: "${k}"`);
  }
  for (const [k, owners] of titleOwners) if (owners.length > 1) errors.push(`duplicate title "${k}" in ${owners.join(', ')}`);

  /* ---- Balance ---- */
  for (const [type, k] of Object.entries(stats.keys)) {
    const n = k.A + k.B + k.C + k.D;
    if (n < 40) continue;
    for (const l of ['A', 'B', 'C', 'D']) {
      const share = k[l] / n;
      if (share > 0.32 || share < 0.18) warnings.push(`${type}: answer key ${l} is ${Math.round(share * 100)}% of ${n} (target 18–32%)`);
    }
  }
  for (const [type, t] of Object.entries(stats.traps)) {
    const n = Object.values(t).reduce((a, b) => a + b, 0);
    if (n < 60 || type === 'ooo') continue;
    for (const [trap, c] of Object.entries(t)) if (c / n > 0.2) warnings.push(`${type}: trap "${trap}" is ${Math.round((c / n) * 100)}% of ${n} distractors (target ≤ 20%)`);
  }
  stats.absolute_bias = {};
  for (const [type, b] of Object.entries(absolute)) {
    if (b.correct.n < 40) continue;
    const fc = b.correct.abs / b.correct.n, fw = b.wrong.abs / Math.max(1, b.wrong.n);
    stats.absolute_bias[type] = { correct: Math.round(fc * 100) / 100, wrong: Math.round(fw * 100) / 100 };
    if (fw > 0 && (fc / fw > 2 || fc / fw < 0.5)) warnings.push(`${type}: absolute words appear in ${Math.round(fc * 100)}% of correct options vs ${Math.round(fw * 100)}% of distractors — a tell`);
  }
  stats.longest_option_bias = {};
  for (const [type, b] of Object.entries(longest)) {
    if (b.n < 40) continue;
    const f = b.correct_longest / b.n;
    stats.longest_option_bias[type] = Math.round(f * 100) / 100;
    if (f > 0.35) warnings.push(`${type}: the correct option is the longest one in ${Math.round(f * 100)}% of ${b.n} questions (chance is 25%) — length is a tell`);
  }
  stats.distinct_patterns = stats.patterns.size;
  stats.distinct_traps = Object.values(stats.traps).reduce((s, t) => s + Object.keys(t).length, 0);
  stats.distinct_difficulty_vectors = stats.difficulty_vectors.size;
  stats.patterns = [...stats.patterns].sort();
  stats.skills = [...stats.skills].sort();
  stats.difficulty_vectors = undefined;
  return { errors, warnings, stats };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { errors, warnings, stats } = runCorpusQC();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ errors, warnings, stats }, null, 2));
  } else {
    console.log('\nCorpus QC');
    console.log(`  files: ${Object.entries(stats.counts).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
    console.log(`  questions: ${Object.entries(stats.questions).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
    console.log(`  distinct patterns used: ${stats.distinct_patterns} · distinct traps used: ${stats.distinct_traps} · difficulty vectors (rc v5): ${stats.distinct_difficulty_vectors}`);
    for (const [type, k] of Object.entries(stats.keys)) console.log(`  keys ${type}: A ${k.A} · B ${k.B} · C ${k.C} · D ${k.D}`);
    if (stats.inference_share_rc !== undefined) console.log(`  RC inference family share: ${Math.round(stats.inference_share_rc * 100)}%`);
    console.log(`  genres: ${Object.entries(stats.genres).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(', ')}`);
    if (Object.keys(stats.structures).length) console.log(`  structures (rc v5): ${Object.entries(stats.structures).map(([g, n]) => `${g} ${n}`).join(', ')}`);
    if (Object.keys(stats.length_classes).length) console.log(`  length classes (rc v5): ${Object.entries(stats.length_classes).map(([g, n]) => `${g} ${n}`).join(', ')}`);
    for (const [t, tiers] of Object.entries(stats.tiers)) console.log(`  tiers ${t}: ${Object.entries(tiers).map(([g, n]) => `${g} ${n}`).join(', ')}`);
    for (const [t, kinds] of Object.entries(stats.kinds)) console.log(`  kinds ${t}: ${Object.entries(kinds).map(([g, n]) => `${g} ${n}`).join(', ')}`);
    console.log(`  quality: ${Object.entries(stats.quality).map(([g, n]) => `${g} ${n}`).join(', ') || '—'}`);
    console.log(`\n  ${errors.length} error(s), ${warnings.length} warning(s)`);
    for (const e of errors) console.log(`  !!  ${e}`);
    for (const w of warnings.slice(0, 80)) console.log(`  ~   ${w}`);
    if (warnings.length > 80) console.log(`  ~   … ${warnings.length - 80} more`);
  }
  process.exit(errors.length ? 1 : 0);
}
