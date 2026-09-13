#!/usr/bin/env node
// rc-quality-report.mjs — render the RC intellectual-quality audit.
//
// Reads content/taxonomy/rc-quality-audit-<n>.json (a reader's hand scores, not
// a computed metric) and cross-checks it against the live corpus, so the audit
// cannot drift out of date silently: passages added since the audit, passages
// removed, and word/question counts that have changed are all reported.
//
//   node tools/rc-quality-report.mjs                 full report
//   node tools/rc-quality-report.mjs --top 20        best n
//   node tools/rc-quality-report.mjs --bottom 20     weakest n
//   node tools/rc-quality-report.mjs --check         drift only (exit 1 if drift)
//   node tools/rc-quality-report.mjs --json
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'content/reading-comprehension';
const TAX = 'content/taxonomy';
const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf('--' + name); return i === -1 ? dflt : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };

const auditFile = readdirSync(TAX).filter(f => /^rc-quality-audit-.*\.json$/.test(f)).sort().pop();
if (!auditFile) { console.error('No rc-quality-audit-*.json in ' + TAX); process.exit(1); }
const audit = JSON.parse(readFileSync(join(TAX, auditFile), 'utf8'));

const live = new Map(readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => {
  const j = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  return [j.meta.id, { id: j.meta.id, genre: j.meta.genre, wc: j.meta.word_count, q: j.questions.length, diff: j.meta.difficulty_numeric, tier: j.meta.difficulty, title: j.passage.title }];
}));

const DIMS = { A: 'intellectual value', B: 'curiosity', C: 'depth', D: 'originality', E: 'naturalness', F: 'memorability', G: 'coherence', H: 'CAT suitability', I: 'engagement', J: 'intellectual honesty' };
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

// Tier is derived, never stored, so it cannot drift away from the scores it
// claims to summarise. `tex` is the one extra hand judgement the rule consults:
// an argument can be first-rate and score 9.3 in prose with no texture at all,
// and the S band is reserved for the ones a reader would seek out.
const deriveTier = (overall, tex) =>
  overall >= 9.0 && tex ? 'S'
    : overall >= 8.7 ? 'A'
      : overall >= 7.8 ? 'B'
        : overall >= 6.8 ? 'C'
          : overall >= 6.0 ? 'D' : 'F';

const rows = audit.rows.map(r => {
  const L = live.get(r.id);
  const overall = +mean(Object.values(r.s)).toFixed(2);
  return { ...r, wc: L?.wc, q: L?.q, diff: L?.diff, difftier: L?.tier, overall, tier: deriveTier(overall, r.tex) };
});

// ---------- drift check
const drift = [];
for (const id of live.keys()) if (!audit.rows.find(r => r.id === id)) drift.push(`NOT AUDITED: ${id} — ${live.get(id).title}`);
for (const r of audit.rows) {
  const L = live.get(r.id);
  if (!L) { drift.push(`AUDITED BUT GONE: ${r.id}`); continue; }
  if (L.title !== r.t) drift.push(`TITLE CHANGED: ${r.id} — audit "${r.t}" vs live "${L.title}"`);
}
if (flag('check')) {
  if (drift.length) { console.log(drift.join('\n')); console.log('\n' + drift.length + ' drift item(s).'); process.exit(1); }
  console.log('No drift: ' + audit.rows.length + ' audited rows match the live corpus.'); process.exit(0);
}

const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'];
const byTier = Object.fromEntries(TIERS.map(t => [t, rows.filter(r => r.tier === t)]));
const DISPO = ['keep', 'minor', 'major', 'replace'];
const byDispo = Object.fromEntries(DISPO.map(d => [d, rows.filter(r => r.dispo === d)]));
const ranked = [...rows].sort((a, b) => b.overall - a.overall);

if (flag('json')) { console.log(JSON.stringify({ ...audit, rows, drift }, null, 1)); process.exit(0); }

const top = Number(flag('top', 0)), bottom = Number(flag('bottom', 0));
const card = r => `${r.id}  ${String(r.overall).padStart(5)}  [${r.tier}] ${r.t} (${r.g}, ${r.wc}w, ${r.q}Q)\n      reward: ${r.reward}\n      keeps:  ${r.memorable}\n      note:   ${r.note}`;
if (top) { console.log(`\n=== TOP ${top} ===\n`); ranked.slice(0, top).forEach((r, i) => console.log(String(i + 1).padStart(3) + '. ' + card(r) + '\n')); process.exit(0); }
if (bottom) { console.log(`\n=== BOTTOM ${bottom} ===\n`); ranked.slice(-bottom).reverse().forEach((r, i) => console.log(String(i + 1).padStart(3) + '. ' + card(r) + '\n')); process.exit(0); }

const H = s => '\n' + '='.repeat(74) + '\n' + s + '\n' + '='.repeat(74);
console.log(H('RC INTELLECTUAL-QUALITY AUDIT — ' + audit.date));
console.log(audit.corpus + '\n');
console.log('Corpus mean ' + mean(rows.map(r => r.overall)).toFixed(2) + '/10   median ' + ranked[Math.floor(rows.length / 2)].overall);

console.log(H('DIMENSION MEANS'));
for (const [k, label] of Object.entries(DIMS)) {
  const m = mean(rows.map(r => r.s[k]));
  console.log(m.toFixed(2).padStart(6), k, label.padEnd(22), '█'.repeat(Math.round(m * 4)));
}
const g1 = rows.filter(r => r.gen === 1), g2 = rows.filter(r => r.gen === 2);
console.log('\nBy generation (see audit.generations):');
for (const [k, label] of Object.entries(DIMS)) {
  console.log('  ' + k, label.padEnd(22), 'gen1 ' + mean(g1.map(r => r.s[k])).toFixed(2), '  gen2 ' + mean(g2.map(r => r.s[k])).toFixed(2), '   Δ ' + (mean(g2.map(r => r.s[k])) - mean(g1.map(r => r.s[k]))).toFixed(2));
}
console.log('  OVERALL'.padEnd(27), 'gen1 ' + mean(g1.map(r => r.overall)).toFixed(2), '  gen2 ' + mean(g2.map(r => r.overall)).toFixed(2), '   Δ ' + (mean(g2.map(r => r.overall)) - mean(g1.map(r => r.overall))).toFixed(2));

console.log(H('TIER DISTRIBUTION'));
for (const [t, rule] of Object.entries(audit.tier_rule)) {
  if (!TIERS.includes(t)) continue;
  const n = byTier[t].length;
  console.log(t, String(n).padStart(4), (100 * n / rows.length).toFixed(0).padStart(4) + '%', String(rule).padEnd(24), '█'.repeat(n));
}
console.log('\nScore histogram (overall, 0.5 bands):');
const bands = {};
for (const r of rows) { const b = (Math.floor(r.overall * 2) / 2).toFixed(1); bands[b] = (bands[b] || 0) + 1; }
for (const b of Object.keys(bands).sort()) console.log('  ' + b.padStart(4), String(bands[b]).padStart(3), '█'.repeat(bands[b]));

console.log(H('DISPOSITION'));
for (const d of DISPO) console.log(d.padEnd(9), String(byDispo[d].length).padStart(4), byDispo[d].length ? '— ' + byDispo[d].map(r => r.id).join(' ') : '');

console.log(H('WOULD I READ THIS WITHOUT CAT?'));
for (const v of ['YES', 'MAYBE', 'NO']) {
  const rs = rows.filter(r => r.read === v);
  console.log(v.padEnd(6), String(rs.length).padStart(4), (100 * rs.length / rows.length).toFixed(0) + '%', v === 'YES' ? '' : '— ' + rs.map(r => r.id).join(' '));
}

console.log(H('INTELLECTUAL CLUSTERS (corpus-level repetition)'));
const clusters = {};
for (const r of rows) (clusters[r.cluster] ||= []).push(r);
for (const [k, v] of Object.entries(clusters).sort((a, b) => b[1].length - a[1].length)) {
  const s = [...v].sort((a, b) => b.overall - a.overall);
  console.log('\n## ' + k + ' (' + v.length + ')   strongest: ' + s[0].id + ' ' + s[0].overall + '   weakest: ' + s[s.length - 1].id + ' ' + s[s.length - 1].overall);
  for (const r of s) console.log('   ' + r.id, String(r.overall).padStart(5), '[' + r.tier + ']', r.t);
}

console.log(H('STRUCTURAL REPETITION'));
console.log('\n' + audit.structural_finding + '\n');
console.log('Passages whose argument does NOT begin from an account to be corrected:');
for (const r of rows.filter(r => !r.corrects)) console.log('   ' + r.id, '[' + r.fam + ']', r.t);
console.log('\nHow the correction is staged (family):');
const fams = {};
for (const r of rows) (fams[r.fam] ||= []).push(r.id);
for (const [k, v] of Object.entries(fams).sort((a, b) => b[1].length - a[1].length)) console.log(String(v.length).padStart(4), (100 * v.length / rows.length).toFixed(0).padStart(4) + '%', k);
console.log('\nSpecific moves, most repeated first (a singleton is a good sign):');
const moves = {};
for (const r of rows) (moves[r.move] ||= []).push(r.id);
const repeated = Object.entries(moves).filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);
for (const [k, v] of repeated) console.log(String(v.length).padStart(4), k.padEnd(42), v.join(' '));
console.log(String(Object.entries(moves).filter(([, v]) => v.length === 1).length).padStart(4) + ' moves used exactly once');

console.log(H('FLAGGED DEFECTS AND MISCALIBRATIONS'));
for (const r of rows.filter(r => /DEFECT|MISCALIBRATED/.test(r.note))) console.log('  ' + r.id + ' — ' + r.note.split(/(?=DEFECT|MISCALIBRATED)/).filter(s => /^(DEFECT|MISCALIBRATED)/.test(s)).join(' '));

console.log(H('UNDER-EXPLOITED: strong passage, three questions only'));
for (const r of rows.filter(r => r.q === 3).sort((a, b) => b.overall - a.overall)) console.log('  ' + r.id, String(r.overall).padStart(5), '[' + r.tier + ']', String(r.wc).padStart(4) + 'w', r.t);

if (drift.length) { console.log(H('DRIFT')); drift.forEach(d => console.log('  ' + d)); }
console.log('\n' + '-'.repeat(74) + '\nTop 20: node tools/rc-quality-report.mjs --top 20   |   Bottom 20: --bottom 20');
