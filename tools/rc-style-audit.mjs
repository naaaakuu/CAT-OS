#!/usr/bin/env node
// rc-style-audit.mjs — corpus-level style and repetition diagnostics for RC.
//
// The mechanical half of an intellectual-quality audit. It finds the
// fingerprints a single authorial personality leaves across many passages:
// shared phrases, identical opening and closing moves, rhetorical tics,
// sentence-rhythm uniformity, and passages that are thematic twins.
// Whether an idea is *interesting* is not automatable; this is not that tool.
// It tells a reader where to look.
//
//   node tools/rc-style-audit.mjs            human-readable report
//   node tools/rc-style-audit.mjs --json     machine-readable
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'content/reading-comprehension';
const asJson = process.argv.includes('--json');

const docs = readdirSync(DIR).filter(f => f.endsWith('.json')).sort().map(f => {
  const j = JSON.parse(readFileSync(join(DIR, f), 'utf8'));
  const paras = j.passage.paragraphs.map(p => p.text);
  return {
    id: j.meta.id, genre: j.meta.genre, theme: j.meta.theme,
    title: j.passage.title, structure: j.meta.structure || '-',
    wc: j.meta.word_count, diff: j.meta.difficulty_numeric,
    paras, text: paras.join('\n'),
    qtypes: j.questions.map(q => q.type),
  };
});

const norm = s => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ').trim();
const sentences = t => t.split(/(?<=[.?!])\s+(?=[A-Z“"])/).map(s => s.trim()).filter(Boolean);
const words = t => norm(t).split(' ').filter(Boolean);

// ---------- 1. shared n-grams across passages (phrase-level fingerprints)
function ngramIndex(n) {
  const idx = new Map();
  for (const d of docs) {
    const w = words(d.text);
    const seen = new Set();
    for (let i = 0; i + n <= w.length; i++) {
      const g = w.slice(i, i + n).join(' ');
      if (seen.has(g)) continue;
      seen.add(g);
      if (!idx.has(g)) idx.set(g, []);
      idx.get(g).push(d.id);
    }
  }
  return idx;
}
const sharedNgrams = n => [...ngramIndex(n)]
  .filter(([, ids]) => ids.length >= 3)
  .sort((a, b) => b[1].length - a[1].length)
  .map(([g, ids]) => ({ gram: g, n: ids.length, ids }));

// ---------- 2. pairwise passage similarity on content words (theme twins)
const STOP = new Set('the a an and or but of to in on for with as that this it is are was were be been being by not no from at its their our we us you he she they them which who whom what when where how than then so if only more most less least can could would should may might must do does did have has had such own same other others one two these those there here also very much many few into out up down over under again further once all any both each itself themselves'.split(' '));
const bag = d => {
  const m = new Map();
  for (const w of words(d.text)) if (!STOP.has(w) && w.length > 3) m.set(w, (m.get(w) || 0) + 1);
  return m;
};
const bags = new Map(docs.map(d => [d.id, bag(d)]));
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (const [k, v] of a) { na += v * v; if (b.has(k)) dot += v * b.get(k); }
  for (const v of b.values()) nb += v * v;
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
const pairs = [];
for (let i = 0; i < docs.length; i++) for (let j = i + 1; j < docs.length; j++) {
  const s = cosine(bags.get(docs[i].id), bags.get(docs[j].id));
  if (s >= 0.12) pairs.push({ a: docs[i].id, b: docs[j].id, sim: +s.toFixed(3), ga: docs[i].genre, gb: docs[j].genre, ta: docs[i].theme, tb: docs[j].theme });
}
pairs.sort((x, y) => y.sim - x.sim);

// ---------- 3. opening move: shape of the first sentence
const OPENERS = [
  ['generic-quantifier-claim', /^(?:Most|Many|Few|Some|Every|All|No)\b/],
  ['the-familiar/standard-view', /^(?:The|A|An)\s+(?:familiar|standard|conventional|received|orthodox|usual|common|traditional|textbook|official|popular|dominant|prevailing|settled)\b/i],
  ['dated-scene-set', /^(?:In|By|During|When|Between|Around|After|Before)\s+(?:the\s+)?\d/],
  ['imperative-consider/imagine', /^(?:Consider|Imagine|Suppose|Ask|Picture|Take|Begin|Notice)\b/],
  ['there-is/are', /^There\s+(?:is|are|was|were|exists)\b/],
  ['abstract-noun-subject', /^[A-Z][a-z]+(?:ism|ity|tion|ment|ness|ance|ence|acy|logy|hood|ship)\b/],
  ['question-opening', /\?\s*$/],
  ['when/if-X', /^(?:When|Whenever|If)\b/],
  ['it-is/seems/has', /^It\s+(?:is|seems|has|was|would|can|takes)\b/],
  ['for-most-of-history', /^For\s+(?:most|much|centuries|decades|years|nearly)\b/],
  ['proper-noun-anecdote', /^(?:In|At|On)\s+[A-Z]/],
];
const openers = {};
for (const d of docs) {
  const s0 = sentences(d.paras[0])[0] || '';
  let tag = 'other';
  for (const [name, re] of OPENERS) if (re.test(s0)) { tag = name; break; }
  (openers[tag] ||= []).push({ id: d.id, s: s0.slice(0, 120) });
}

// ---------- 4. closing move: shape of the last sentence
const CLOSERS = [
  ['X-is-not-Y-but-Z (antithesis)', /\b(?:is|are|was|were)\s+not\b[^.]{0,80}(?:;\s*it is|\bbut\b)/i],
  ['not-X-so-much-as/rather-than', /\b(?:rather than|so much as|less\s+\w+\s+than)\b[^.]*\.$/i],
  ['the-real-X/what-matters', /\b(?:the real|what (?:is|matters|counts|remains)|the point is|the question is|the lesson)\b/i],
  ['semicolon-aphorism', /;[^;]{10,120}$/],
  ['dash-reveal', /[—–]\s*[a-z][^.]{10,}\.$/],
];
const closers = {};
for (const d of docs) {
  const ss = sentences(d.paras[d.paras.length - 1]);
  const sL = ss[ss.length - 1] || '';
  let tag = 'plain';
  for (const [name, re] of CLOSERS) if (re.test(sL)) { tag = name; break; }
  (closers[tag] ||= []).push({ id: d.id, s: sL.slice(0, 140) });
}

// ---------- 5. recurring connective / rhetorical tics
const TICS = {
  'But': /\bBut\b/g, 'Yet': /\bYet\b/g, 'However': /\bHowever\b/g,
  'Ultimately': /\bUltimately\b/g, 'Indeed': /\bIndeed\b/g, 'Moreover': /\bMoreover\b/g,
  'Nevertheless/Nonetheless': /\bN(?:evertheless|onetheless)\b/g,
  'Consider': /\bConsider\b/g, 'Crucially': /\bCrucially\b/g,
  'is not X but Y': /\b(?:is|are|was|were)\s+not\s+(?:merely\s+|simply\s+|just\s+)?[^.,;]{2,40}\bbut\b/g,
  'not merely/simply/just': /\bnot\s+(?:merely|simply|just)\b/g,
  'precisely': /\bprecisely\b/g,
  'paradox*': /\bparadox/gi,
  'tension': /\btension/gi,
  'the very X': /\bthe very\b/g,
  'what matters/counts': /\bwhat (?:matters|counts|follows|remains)\b/gi,
  'Far from': /\bFar from\b/g,
  'rather than': /\brather than\b/g,
  'less X than Y': /\bless\s+\w+\s+than\b/g,
  'turns out': /\bturn(?:s|ed)? out\b/g,
  'em/en dash': /[—–]/g,
  'semicolon': /;/g,
  'colon': /:/g,
  'abstract -tion/-ity/-ism': /\b\w{4,}(?:tion|ity|ism|ness|ment)\b/g,
  'the logic/grammar/architecture of': /\bthe (?:logic|grammar|architecture|economy|geometry|anatomy|arithmetic|vocabulary) of\b/gi,
};
const ticTotals = {}, ticByDoc = new Map();
let corpusWords = 0;
for (const d of docs) {
  const n = words(d.text).length; corpusWords += n;
  const row = {};
  for (const [k, re] of Object.entries(TICS)) {
    const c = (d.text.match(re) || []).length;
    row[k] = c; ticTotals[k] = (ticTotals[k] || 0) + c;
  }
  ticByDoc.set(d.id, { n, row });
}

// ---------- 6. sentence-rhythm signature
const rhythm = docs.map(d => {
  const ss = sentences(d.text);
  const lens = ss.map(s => words(s).length);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
  return {
    id: d.id, sents: ss.length, mean: +mean.toFixed(1), sd: +sd.toFixed(1),
    max: Math.max(...lens), min: Math.min(...lens),
    shortPct: +(100 * lens.filter(l => l <= 10).length / lens.length).toFixed(0),
    longPct: +(100 * lens.filter(l => l >= 40).length / lens.length).toFixed(0),
    paras: d.paras.length,
    paraWords: d.paras.map(p => words(p).length),
  };
});

// ---------- 7. big-frame concentration (is the corpus one idea in costumes?)
const BIG_FRAMES = {
  'technology/digital/algorithm': /\b(?:technolog|digital|algorithm|machine|automat|comput|internet|online|platform)/gi,
  'modernity/contemporary': /\b(?:modern|contemporary)/gi,
  'society/social': /\b(?:societ|social|communit)/gi,
  'institution/bureaucracy/state': /\b(?:institution|bureaucra|governanc|the state\b)/gi,
  'market/economic/capital': /\b(?:market|economic|capital|commerc|trade)/gi,
  'knowledge/expertise/epistemic': /\b(?:epistem|knowledge|knowing|expertis)/gi,
  'measurement/metric/quantification': /\b(?:measur|metric|quantif|statistic)/gi,
  'identity/self/authenticity': /\b(?:identit|the self\b|authentic)/gi,
  'memory/forgetting/archive': /\b(?:memor|forget|archiv)/gi,
  'language/word/meaning': /\b(?:languag|linguist|semantic|etymolog)/gi,
  'ecology/environment/climate': /\b(?:ecolog|environment|climate|species|habitat)/gi,
  'history/the past': /\b(?:histor|the past\b|centur)/gi,
  'art/aesthetic/beauty': /\b(?:aesthetic|artist|beaut|paint|sculpt|music)/gi,
  'moral/ethics/virtue': /\b(?:moral|ethic|virtue)/gi,
  'mind/brain/cognition': /\b(?:neuro|brain|cognit|percept|the mind\b)/gi,
  'attention/distraction': /\b(?:attention|distract|focus)/gi,
  'trust/authority/legitimacy': /\b(?:trust|authorit|legitimac)/gi,
};
const frames = {};
for (const [k, re] of Object.entries(BIG_FRAMES)) {
  frames[k] = docs.filter(d => (d.text.match(re) || []).length >= 3).map(d => d.id);
}

// ---------- 8. title shape
const titleShapes = {};
for (const d of docs) {
  let t = 'other';
  if (/:/.test(d.title)) t = 'colon subtitle';
  else if (/^The\s+\w+\s+(?:of|for|against|in|without)\s+/i.test(d.title)) t = 'The X of Y';
  else if (/^(?:The|A|An)\s+\w+ing\b/i.test(d.title)) t = 'The Verbing ...';
  else if (/^(?:When|Why|How|What|Who)\b/i.test(d.title)) t = 'question word';
  else if (/^(?:The|A|An)\s+\w+\s+\w+$/i.test(d.title)) t = 'The Adj Noun';
  else if (/^\w+\s+\w+$/.test(d.title)) t = 'bare two words';
  (titleShapes[t] ||= []).push(d.id + ' — ' + d.title);
}

const report = {
  corpus: { passages: docs.length, words: corpusWords, meanWords: Math.round(corpusWords / docs.length) },
  sharedNgrams: { '6gram': sharedNgrams(6).slice(0, 40), '5gram': sharedNgrams(5).slice(0, 60), '4gram': sharedNgrams(4).slice(0, 50) },
  nearestPairs: pairs.slice(0, 70),
  openers: Object.fromEntries(Object.entries(openers).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => [k + ' (' + v.length + ')', v])),
  closers: Object.fromEntries(Object.entries(closers).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => [k + ' (' + v.length + ')', v])),
  tics: Object.fromEntries(Object.entries(ticTotals).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, { total: v, per1k: +(1000 * v / corpusWords).toFixed(2), docs: docs.filter(d => ticByDoc.get(d.id).row[k] > 0).length }])),
  ticOutliers: Object.keys(TICS).map(k => ({
    tic: k,
    worst: [...ticByDoc].map(([id, { n, row }]) => ({ id, per1k: +(1000 * row[k] / n).toFixed(1) })).sort((a, b) => b.per1k - a.per1k).slice(0, 6),
  })),
  rhythm,
  frames: Object.fromEntries(Object.entries(frames).sort((a, b) => b[1].length - a[1].length).map(([k, v]) => [k + ' (' + v.length + ')', v])),
  titleShapes: Object.fromEntries(Object.entries(titleShapes).sort((a, b) => b[1].length - a[1].length)),
};

if (asJson) { console.log(JSON.stringify(report, null, 1)); process.exit(0); }

const H = s => '\n' + '='.repeat(72) + '\n' + s + '\n' + '='.repeat(72);
console.log(H('CORPUS'), report.corpus);
for (const n of ['6gram', '5gram', '4gram']) {
  console.log(H('SHARED ' + n.toUpperCase() + 'S (>=3 passages) — phrase fingerprints'));
  for (const g of report.sharedNgrams[n]) console.log(String(g.n).padStart(3), g.gram, '|', g.ids.join(','));
}
console.log(H('NEAREST PASSAGE PAIRS (content-word cosine >= 0.12)'));
for (const p of report.nearestPairs) console.log(p.sim, p.a, '[' + p.ga + ']', '~', p.b, '[' + p.gb + ']', '\n        ', p.ta, '||', p.tb);
console.log(H('OPENING MOVES'));
for (const [k, v] of Object.entries(report.openers)) { console.log('\n## ' + k); for (const x of v) console.log('   ', x.id, x.s); }
console.log(H('CLOSING MOVES'));
for (const [k, v] of Object.entries(report.closers)) { console.log('\n## ' + k); for (const x of v) console.log('   ', x.id, x.s); }
console.log(H('RHETORICAL TICS (per 1000 words; docs = how many passages use it)'));
for (const [k, v] of Object.entries(report.tics)) console.log(String(v.per1k).padStart(7), k.padEnd(30), 'total ' + String(v.total).padStart(4), ' in ' + v.docs + '/115 passages');
console.log(H('TIC OUTLIERS (worst passages per tic, per 1k words)'));
for (const o of report.ticOutliers) console.log(o.tic.padEnd(32), o.worst.map(w => w.id + ':' + w.per1k).join('  '));
console.log(H('SENTENCE RHYTHM'));
console.log('id         sents  mean   sd  min  max short% long%  paras  paraWords');
for (const r of report.rhythm) console.log(r.id, String(r.sents).padStart(5), String(r.mean).padStart(6), String(r.sd).padStart(5), String(r.min).padStart(4), String(r.max).padStart(4), String(r.shortPct).padStart(5), String(r.longPct).padStart(6), String(r.paras).padStart(6), '  ' + r.paraWords.join('/'));
console.log(H('BIG FRAMES (passages whose vocabulary hits the frame >=3x)'));
for (const [k, v] of Object.entries(report.frames)) console.log('\n## ' + k + '\n   ' + v.join(' '));
console.log(H('TITLE SHAPES'));
for (const [k, v] of Object.entries(report.titleShapes)) { console.log('\n## ' + k + ' (' + v.length + ')'); for (const x of v) console.log('   ', x); }
