#!/usr/bin/env node
// rc-move-audit.mjs — argumentative-move census for the RC corpus.
//
// The style audit (tools/rc-style-audit.mjs) finds repeated *words*. This finds
// repeated *moves*: the rhetorical skeleton an author reaches for. A corpus can
// pass every style check and still be one essay written 115 times, because the
// sameness lives in the sequence of gestures rather than in the vocabulary.
//
// Two halves, and they differ in how much they can be trusted.
//
// The VOICE CENSUS is reliable: clipped endings, first/second person, quoted
// speech, dates, exclamations. These are surface facts and the counts are exact.
//
// The FRAME HITS are a floor and nothing more. A gesture is detected only when
// it happens to be carried by one of the listed sentence frames, and a passage
// that makes the same move in its own words is missed — which, in this corpus,
// is most of them. Treat a low frame-hit number as "the frames did not fire",
// never as "the move is absent". Counting moves is a reader's job; this half of
// the tool only points at where to start reading.
//
//   node tools/rc-move-audit.mjs           report
//   node tools/rc-move-audit.mjs --json    machine-readable
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'content/reading-comprehension';
const asJson = process.argv.includes('--json');

const docs = readdirSync(DIR).filter(f => f.endsWith('.json')).sort().map(f => {
  const j = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const paras = j.passage.paragraphs.map(p => p.text);
  return { id: j.meta.id, genre: j.meta.genre, title: j.passage.title, paras, text: paras.join('\n'), wc: j.meta.word_count };
});
const sentences = t => t.split(/(?<=[.?!])\s+(?=[A-Z“"])/).map(s => s.trim()).filter(Boolean);

// ---- GESTURE 1: open by naming a received view in order to correct it.
const RECEIVED = [
  /\b(?:the |a )?(?:familiar|standard|usual|conventional|received|orthodox|common|traditional|ordinary|textbook|official|popular|obvious|commonsense|common-sense|confident|comfortable|the first|the one everybody)\s+(?:picture|view|account|story|explanation|answer|description|defence|defense|complaint|charge|objection|case|idea|line|claim|reading|understanding|version|advice|moral|verdict)\b/i,
  /\b(?:is|are) (?:usually|ordinarily|generally|commonly|routinely|often|normally|almost always|nearly always|habitually|traditionally) (?:said|thought|described|drawn|told|taught|offered|stated|put|treated|filed|explained|assumed|supposed|read|understood|made|given|conducted)\b/i,
  /\b(?:everybody|everyone|most people|almost everybody|anybody who|people usually|we like to imagine|the instinct is|the answer that arrives first|the temptation is|it seems obvious|it is tempting to (?:say|think|treat)|the explanation (?:most people reach for|usually (?:given|offered)))\b/i,
  /\b(?:the (?:complaint|objection|charge|doctrine|difficulty|problem|question|idea|principle|parable|story|maxim|distinction|right|rule|doctrine)) (?:is|has been|was) (?:stated|told|usually|easily|easy|drawn|put|made|offered|described)\b/i,
];
// ---- GESTURE 2: the correction itself — a reconstruction sentence.
const RECONSTRUCT = [
  /\b(?:is|are|was|were) not (?:a |an |the )?[^.;,]{1,60}\.?\s*(?:It is|They are)\b/,
  /\b(?:is|are) not\s+[^.,;]{2,70}\b(?:but|it is)\b/i,
  /\bwhat (?:actually|really)?\s?(?:separates|distinguishes|matters|changes|differs|follows|is (?:going on|wanted)|the \w+ (?:actually|really) does)\b/i,
  /\b(?:the )?(?:better|deeper|likelier|sharper|narrower|second|real|third|other|different|correct) (?:view|account|description|explanation|answer|claim|question|definition|thought|picture|line|way)\b/i,
  /\b(?:redescrib|recast|reframe|relocat|redraw|reverse the direction|the line worth drawing|what switches|the difference (?:is|lies) in)\b/i,
  /\bnot (?:a|an|the)? ?\w+ (?:at all|in the \w+ sense)[,.]? (?:it|but)\b/i,
];
// ---- GESTURE 3: the guard-rail — author narrows his own claim before ending.
const GUARDRAIL = [
  /\bNone of (?:this|which|these|that)\b/,
  /\bNothing (?:in (?:this|the|what)|here|said here|whatever in this)\b/,
  /\bIt would be a (?:serious |crude |poor )?(?:misreading|mistake|consolation)\b/i,
  /\bIt would be too (?:much|simple|far)\b/i,
  /\bThe (?:claim|point|argument|complaint|account|distinction|lesson|puzzle|conclusion|objection|result|explanation|prescription|contrast|comparison|analogy|consequence|difficulty|criticism|answer|effect|thing) (?:is|are|has|should|must|also|cannot|does|survives|remains|earns|stops|breaks|fails|holds|covers|extends|depends|is not) (?:therefore )?(?:narrower|smaller|modest|weaker|limited|not be pressed|a limit|less|its own)/i,
  /\b(?:Two|Three|One) limits?\b/i,
  /\bhas a (?:limit|weakness|difficulty) (?:of its own|worth stating|and it is)\b/i,
  /\b(?:should not be pressed|will not (?:go|carry)|cannot carry|had better be kept modest|worth exactly what|is not a licence|is not a cure|only afterwards|and it is not nothing|is a first question)\b/i,
  /\bNor (?:is|does|did|has|should|can)\b/,
  /\bSomething should be granted\b/i,
  /\bThe argument has a limit\b/i,
];
// ---- GESTURE 4: the clipped final sentence (short, relocating predicate).
const clipped = d => {
  const ss = sentences(d.paras[d.paras.length - 1]);
  const last = ss[ss.length - 1] || '';
  const n = last.split(/\s+/).length;
  return { last, n, clipped: n <= 14 };
};
// ---- GESTURE 5: does the passage open in a scene / with a person / in the first person?
const SCENIC = /^(?:[A-Z]\w+ had been|She |He |A man |A woman |At dinner|The investigator|For a few weeks|A visiting|In the middle of|Open an atlas|Two people leave|Two drivers|A trial reports|A test is described)/;
const FIRST_PERSON = /\b(?:I |my |me\b|we\b|our\b|us\b|you\b|your\b)/;

const rows = docs.map(d => {
  const p1 = d.paras[0];
  const tail = d.paras.slice(-2).join(' ');
  const hit = (res, s) => res.some(r => r.test(s));
  const c = clipped(d);
  return {
    id: d.id, genre: d.genre, title: d.title, wc: d.wc, paras: d.paras.length,
    received: hit(RECEIVED, p1),
    receivedAnywhere: hit(RECEIVED, d.text),
    reconstruct: hit(RECONSTRUCT, d.text),
    guardrail: hit(GUARDRAIL, tail),
    guardrailAnywhere: hit(GUARDRAIL, d.text),
    clipped: c.clipped, lastLen: c.n, last: c.last,
    scenic: SCENIC.test(p1.trim()),
    firstPersonSingular: /\bI\b|\bmy\b/.test(d.text),
    secondPerson: /\byou\b|\byour\b/i.test(d.text),
    weWords: (d.text.match(/\b(?:we|our|us)\b/gi) || []).length,
    questionMarks: (d.text.match(/\?/g) || []).length,
    exclam: (d.text.match(/!/g) || []).length,
    quotedSpeech: /[“"']\s*[A-Z]/.test(d.text) || /\bsaid\b/.test(d.text),
    dates: (d.text.match(/\b1[0-9]{3}\b|\b(?:nineteenth|eighteenth|twentieth|seventeenth)\b/g) || []).length,
    properNouns: (d.text.match(/\b(?:Europe|Atlantic|Beethoven|Gulf|America|Asia|Africa|China|France|Roman|Saint Monday)\b/g) || []).length,
  };
});

const pct = n => (100 * n / rows.length).toFixed(0) + '%';
const count = k => rows.filter(r => r[k]).length;

// the full house: received view + reconstruction + guard-rail
const fullHouse = rows.filter(r => r.receivedAnywhere && r.reconstruct && r.guardrailAnywhere);

const report = {
  n: rows.length,
  voice: {
    'clipped final sentence (<=14 words)': { n: count('clipped'), pct: pct(count('clipped')) },
    'opens in a scene or with a person': { n: count('scenic'), pct: pct(count('scenic')) },
    'uses first-person singular (I / my)': { n: count('firstPersonSingular'), pct: pct(count('firstPersonSingular')) },
    'addresses the reader as you': { n: count('secondPerson'), pct: pct(count('secondPerson')) },
    'contains any quoted speech': { n: count('quotedSpeech'), pct: pct(count('quotedSpeech')) },
    'contains a date or a named century': { n: rows.filter(r => r.dates > 0).length, pct: pct(rows.filter(r => r.dates > 0).length) },
    'contains an exclamation mark': { n: rows.filter(r => r.exclam > 0).length, pct: pct(rows.filter(r => r.exclam > 0).length) },
    'asks a direct question': { n: rows.filter(r => r.questionMarks > 0).length, pct: pct(rows.filter(r => r.questionMarks > 0).length) },
  },
  frameHits: {
    'received-view frame, first paragraph': { n: count('received'), pct: pct(count('received')) },
    'received-view frame, anywhere': { n: count('receivedAnywhere'), pct: pct(count('receivedAnywhere')) },
    'reconstruction frame': { n: count('reconstruct'), pct: pct(count('reconstruct')) },
    'guard-rail frame, last two paragraphs': { n: count('guardrail'), pct: pct(count('guardrail')) },
    'guard-rail frame, anywhere': { n: count('guardrailAnywhere'), pct: pct(count('guardrailAnywhere')) },
    'all three frames fired': { n: fullHouse.length, pct: pct(fullHouse.length) },
  },
  framesSilent: rows.filter(r => !(r.receivedAnywhere && r.reconstruct && r.guardrailAnywhere)).map(r => `${r.id} ${r.title} [${r.genre}] — silent: ${[!r.receivedAnywhere && 'received', !r.reconstruct && 'reconstruct', !r.guardrailAnywhere && 'guardrail'].filter(Boolean).join('+')}`),
  weWordDistribution: rows.map(r => ({ id: r.id, we: r.weWords })).sort((a, b) => b.we - a.we).slice(0, 20),
  clippedEndings: rows.filter(r => r.clipped).map(r => `${r.id} (${r.lastLen}w) "${r.last}"`),
  rows,
};

if (asJson) { console.log(JSON.stringify(report, null, 1)); process.exit(0); }

console.log('\n=== VOICE CENSUS (exact; n=' + report.n + ') ===\n');
for (const [k, v] of Object.entries(report.voice)) console.log(String(v.pct).padStart(5), String(v.n).padStart(4) + '/115 ', k);
console.log('\n=== FRAME HITS (A FLOOR, NOT A COUNT — see header) ===\n');
for (const [k, v] of Object.entries(report.frameHits)) console.log(String(v.pct).padStart(5), String(v.n).padStart(4) + '/115 ', k);
console.log('\n--- passages where at least one frame stayed silent (' + report.framesSilent.length + ') ---');
console.log('    Silence means the frame did not fire, NOT that the move is absent. Read them.');
for (const s of report.framesSilent) console.log('  ' + s);
console.log('\n=== CLIPPED FINAL SENTENCES (' + report.clippedEndings.length + ') ===');
for (const s of report.clippedEndings) console.log('  ' + s);
console.log('\n=== HEAVIEST FIRST-PERSON-PLURAL ("we/our/us") — the essayistic voice ===');
for (const r of report.weWordDistribution) console.log('  ' + r.id, r.we);
