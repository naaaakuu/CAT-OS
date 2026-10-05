/**
 * check-pets.mjs — the six friends, their friendships and their voice.
 *
 * Asserts the roster (ids, order, names, frames, frozen), that every friend
 * has every field, that best friends are each other's and agree with
 * FRIENDSHIPS, that every place and module has a friend, that each friend
 * has five requests, five stories and one best-friend ask, and that every
 * line a friend can say obeys the copy rules: at most 96 characters, no em
 * dash, none of the banned words, templates filled with every name they can
 * take. Exclamation marks are welcome: the friends are glad to see you.
 *
 * Run: node tools/check-pets.mjs      verify.mjs §16.
 */

import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href);

const ORDER = ['toffee', 'chai', 'matcha', 'mochi', 'ginger', 'mallow'];
const NAMES = ['Toffee', 'Chai', 'Matcha', 'Mochi', 'Ginger', 'Mallow'];
const FIELDS = ['id', 'name', 'creature', 'subject', 'tag', 'item', 'charm', 'teaches', 'home', 'icon', 'colour', 'frame', 'places', 'modules', 'bff', 'trouble', 'blurb'];
const MODULES = ['rc', 'rc2', 'cr', 'lex', 'garden', 'wd', 'wb', 'ps', 'pc', 'pj', 'sp', 'ooo', 'gauntlet'];
const MOOD_WORDS = ['glowing', 'happy', 'missing', 'sleepy', 'wilting', 'new'];
const KINDS = ['hello', 'missed', 'meet', 'thanks'];
const BANNED = /\b(wrong|failure|failed|mistake|poor|weak|bad|careless|study|score|xp|level up|unlocked)\b/i;

export async function checkPets() {
  const problems = [];
  const bad = (m) => problems.push(m);
  let P;
  try { P = await load('src/pets/pets.js'); } catch (err) { return { problems: [`src/pets/pets.js does not load: ${err.message}`], lines: 0 }; }
  const { REGIONS } = await load('src/world/regions.js');
  const sameSet = (a, b) => [...a].sort().join() === [...b].sort().join();

  /* ---- Roster ---- */
  if (P.PETS?.length !== 6) bad(`there are ${P.PETS?.length} pets, not 6`);
  if (P.PETS?.map((p) => p.id).join() !== ORDER.join()) bad(`pet order is ${P.PETS?.map((p) => p.id).join()}`);
  if (P.PETS?.map((p) => p.name).join() !== NAMES.join()) bad('pet names do not match the roster');
  if (!Object.isFrozen(P.PETS) || !P.PETS.every(Object.isFrozen)) bad('PETS and every pet in it must be frozen');
  for (const p of P.PETS ?? []) {
    for (const k of FIELDS) if (!p[k]) bad(`${p.id} is missing ${k}`);
    if (!Array.isArray(p.frame) || p.frame.length !== 2) bad(`${p.id} has no frame`);
    if (!p.places?.length || !p.modules?.length) bad(`${p.id} has no places or modules`);
    if (P.PET_BY_ID.get(p.id) !== p) bad(`PET_BY_ID does not hold ${p.id}`);
    if (!/^#[0-9A-F]{6}$/i.test(p.colour)) bad(`${p.id} colour ${p.colour}`);
  }
  const frames = (P.PETS ?? []).map((p) => p.frame.join(':')).join(' ');
  if (frames !== '0:350 355:330 700:338 1040:335 1380:397 1780:392') bad(`frames are ${frames}`);
  if (P.MOOD_WORDS?.join() !== MOOD_WORDS.join()) bad(`MOOD_WORDS are ${P.MOOD_WORDS?.join()}`);

  /* ---- Best friends: each other's, and the same three pairs FRIENDSHIPS tells ---- */
  const F = P.FRIENDSHIPS ?? [];
  const pairs = F.map((f) => [f.a, f.b].sort().join('-')).sort().join();
  if (pairs !== 'chai-mochi,ginger-mallow,matcha-toffee') bad(`FRIENDSHIPS are ${pairs}`);
  for (const f of F) {
    const [na, nb] = [P.PET_BY_ID.get(f.a)?.name, P.PET_BY_ID.get(f.b)?.name];
    if (!na || !nb || !f.line?.includes(na) || !f.line.includes(nb)) bad(`the ${f.a}-${f.b} friendship line must name both friends: ${f.line}`);
  }
  for (const p of P.PETS ?? []) {
    if (p.bff === p.id || !P.PET_BY_ID.has(p.bff)) bad(`${p.id}'s best friend "${p.bff}" is not another pet`);
    else if (P.PET_BY_ID.get(p.bff).bff !== p.id) bad(`${p.id} → ${p.bff} is not returned (${p.bff} → ${P.PET_BY_ID.get(p.bff).bff})`);
    if (F.filter((f) => f.a === p.id || f.b === p.id).length !== 1) bad(`${p.id} is not in exactly one friendship`);
    const f = P.friendshipOf(p.id);
    if (!f || !sameSet([f.a, f.b], [p.id, p.bff])) bad(`friendshipOf(${p.id}) is not ${p.id} and ${p.bff}`);
  }
  if (P.friendshipOf('nobody') !== null) bad('an unknown pet has no friendship');

  /* ---- Places and modules ---- */
  for (const r of REGIONS) if (!ORDER.includes(P.petForPlace(r.slug))) bad(`place ${r.slug} has no pet`);
  const placeWant = { 'reading-room': 'chai', meadow: 'matcha', pond: 'matcha', thicket: 'matcha', rootwood: 'matcha', terraces: 'matcha', table: 'mochi', loom: 'ginger', bench: 'mallow', wilds: 'toffee', hearth: 'toffee' };
  for (const [slug, id] of Object.entries(placeWant)) if (P.petForPlace(slug) !== id) bad(`place ${slug} → ${P.petForPlace(slug)}, want ${id}`);
  for (const m of MODULES) if (!ORDER.includes(P.petForModule(m))) bad(`module ${m} has no pet`);
  const modWant = { rc: 'chai', rc2: 'chai', cr: 'chai', lex: 'matcha', garden: 'matcha', wd: 'matcha', wb: 'matcha', ps: 'mochi', pc: 'mochi', pj: 'ginger', sp: 'ginger', ooo: 'mallow', gauntlet: 'toffee' };
  for (const [m, id] of Object.entries(modWant)) if (P.petForModule(m) !== id) bad(`module ${m} → ${P.petForModule(m)}, want ${id}`);
  if (P.petForModule('nonsense') !== null || P.petForPlace('nowhere') !== null) bad('unknown modules and places map to null');
  for (const p of P.PETS ?? []) {
    if (!REGIONS.some((r) => r.slug === p.places[0]) || P.homeHref(p.id) !== `#/world/place/${p.places[0]}`) bad(`${p.id}'s home is not a real place: ${P.homeHref(p.id)}`);
  }
  if (P.homeHref('nobody') !== '#/world') bad('an unknown pet\'s home is the village');

  /* ---- The story: five requests, five stories, one best-friend ask, five home gifts ---- */
  for (const [name, table] of [['REQUESTS', P.REQUESTS], ['STORIES', P.STORIES], ['BEST_FRIEND_ASK', P.BEST_FRIEND_ASK]]) {
    if (!sameSet(Object.keys(table ?? {}), ORDER)) bad(`${name} is keyed by ${Object.keys(table ?? {}).join()}, not the six pets`);
  }
  for (const id of ORDER) {
    if (P.REQUESTS?.[id]?.length !== 5) bad(`${id} has ${P.REQUESTS?.[id]?.length} requests, wants exactly 5`);
    if (P.STORIES?.[id]?.length !== 5) bad(`${id} has ${P.STORIES?.[id]?.length} stories, wants exactly 5`);
    if (typeof P.BEST_FRIEND_ASK?.[id] !== 'string') bad(`${id} has no best-friend ask`);
  }
  if (P.HOME_GIFTS?.length !== 5) bad(`there are ${P.HOME_GIFTS?.length} home gifts, wants exactly 5`);

  /* ---- The shape of the voice ---- */
  const L = P.LINES ?? {};
  for (const kind of KINDS) {
    for (const id of ORDER) if (!Array.isArray(L[kind]?.[id]) || !L[kind][id].length) bad(`${id} has no "${kind}" lines`);
  }
  for (const w of MOOD_WORDS) {
    const g = L.gossip?.[w] ?? [];
    if (g.length < 2) bad(`gossip.${w} has ${g.length} templates, wants 2+`);
    for (const t of g) if (!t.includes('{name}')) bad(`gossip.${w}: "${t}" has no {name}`);
  }
  if (L.intro?.length !== 4) bad(`LINES.intro has ${L.intro?.length} lines, wants Toffee's 4`);
  for (const id of ORDER) {
    // The first visit says both meet lines in order: who they are, then why that is their subject.
    if ((L.meet?.[id] ?? []).length !== 2) bad(`${id} has ${(L.meet?.[id] ?? []).length} meet lines, wants 2`);
    if ((L.muse?.[id] ?? []).length < 5) bad(`${id} has ${(L.muse?.[id] ?? []).length} muse lines, wants 5+`);
    for (const k of ['cheer', 'grow']) if ((L[k]?.[id] ?? []).length < 2) bad(`${id} has ${(L[k]?.[id] ?? []).length} ${k} lines, wants 2+`);
  }

  /* ---- Ten stages each: a name per stage, and what each one puts on the friend ---- */
  for (const id of ORDER) {
    const t = P.STAGE_TITLES?.[id] ?? [];
    if (t.length !== 10 || new Set(t).size !== 10 || !t.every((s) => typeof s === 'string' && s.trim())) bad(`${id} needs 10 distinct stage titles, has ${t.length}`);
    if (P.stageTitle(id, 0) !== '' || P.stageTitle(id, 1) !== t[0] || P.stageTitle(id, 10) !== t[9]) bad(`stageTitle(${id}) is not stage-numbered from 1`);
    for (let s = 1; s <= 10; s += 1) { const g = P.stageGift(id, s); if (!g || /\{\w+\}/.test(g)) bad(`stageGift(${id}, ${s}) is "${g}"`); }
    if (P.stageGift(id, 0) !== '' || P.stageGift(id, 11) !== '') bad(`stageGift(${id}) gives something outside stages 1 to 10`);
  }

  /* ---- Every string a friend can say, gossip filled with every name ---- */
  const lines = [];
  const add = (where, s) => lines.push([where, s]);
  const walk = (where, v) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(`${where}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(`${where}.${k}`, x);
    else add(where, v);
  };
  for (const [k, v] of Object.entries(L)) if (k !== 'gossip') walk(`LINES.${k}`, v);
  for (const [w, g] of Object.entries(L.gossip ?? {})) for (const t of g) for (const n of NAMES) add(`LINES.gossip.${w}`, String(t).replaceAll('{name}', n));
  walk('REQUESTS', P.REQUESTS);
  walk('BEST_FRIEND_ASK', P.BEST_FRIEND_ASK);
  walk('STORIES', P.STORIES);
  walk('HOME_GIFTS', P.HOME_GIFTS);
  F.forEach((f, i) => add(`FRIENDSHIPS[${i}].line`, f.line));
  for (const p of P.PETS ?? []) { add(`${p.id}.trouble`, p.trouble); add(`${p.id}.blurb`, p.blurb); add(`${p.id}.tag`, p.tag); }
  walk('STAGE_TITLES', P.STAGE_TITLES);
  for (const id of ORDER) for (let s = 1; s <= 10; s += 1) add(`stageGift(${id}, ${s})`, P.stageGift(id, s));
  for (const id of ORDER) add(`SIGNATURE.${id}`, P.SIGNATURE?.[id]?.say);

  /* ---- Signature voices: one fixed phrase and tone each, spoken on every tap ---- */
  if (!sameSet(Object.keys(P.SIGNATURE ?? {}), ORDER)) bad(`SIGNATURE is keyed by ${Object.keys(P.SIGNATURE ?? {}).join()}, not the six pets`);
  for (const id of ORDER) {
    const g = P.SIGNATURE?.[id];
    if (!g) continue;
    if (!(g.pitch >= 0 && g.pitch <= 2) || !(g.rate >= 0.1 && g.rate <= 10) || !(g.volume > 0 && g.volume <= 1)) bad(`SIGNATURE.${id} tone is out of the speech range`);
    if (!['', 'f', 'm'].includes(g.who)) bad(`SIGNATURE.${id}.who is "${g.who}"`);
  }
  if (new Set(ORDER.map((id) => P.SIGNATURE?.[id]?.say)).size !== 6) bad('every friend has their own signature phrase');
  if (!(P.SIGNATURE?.mochi?.pitch < 0.5 && P.SIGNATURE.mochi.pitch < P.SIGNATURE.chai?.pitch)) bad('Mochi has the heavy voice, lower than Chai\'s soft one');

  for (const [where, s] of lines) {
    if (typeof s !== 'string' || !s.trim()) { bad(`${where} is empty`); continue; }
    if (s.length > 96) bad(`${where} is ${s.length} chars: ${s}`);
    if (s.includes('—')) bad(`${where} has an em dash: ${s}`);
    const m = s.match(BANNED);
    if (m) bad(`${where} uses "${m[0]}": ${s}`);
    if (/\{\w+\}/.test(s)) bad(`${where} has an unfilled slot: ${s}`);
  }
  const seen = new Map();
  // Gossip templates and the stage gifts (a ring of light is a ring of light on anyone) repeat on purpose.
  for (const [where, s] of lines) if (!where.startsWith('LINES.gossip') && !where.startsWith('stageGift')) { if (seen.has(s)) bad(`duplicate line in ${where} and ${seen.get(s)}: ${s}`); seen.set(s, where); }

  /* ---- Picks are deterministic and come from the right pool ---- */
  const a = P.lineFor('chai', 'hello', 'd1');
  if (a !== P.lineFor('chai', 'hello', 'd1') || !L.hello?.chai?.includes(a)) bad('lineFor must pick deterministically from the pet\'s own pool');
  if (!L.muse?.mochi?.includes(P.lineFor('mochi', 'muse', 7))) bad('lineFor(muse) picks a muse line');
  const poolOf = { new: 'meet', missing: 'missed', sleepy: 'missed', wilting: 'missed', glowing: 'hello', happy: 'hello' };
  for (const [w, kind] of Object.entries(poolOf)) {
    for (const id of ORDER) if (!L[kind]?.[id]?.includes(P.lineFor(id, w, 'x'))) bad(`lineFor(${id}, ${w}) should say a "${kind}" line`);
  }
  if (new Set(Array.from({ length: 40 }, (_, i) => P.lineFor('toffee', 'hello', `s${i}`))).size < 2) bad('lineFor never varies with the seed');
  if (P.lineFor('nobody', 'muse', 1) !== '') bad('an unknown pet says nothing');
  const gl = P.gossipLine('mochi', 'missing', 3);
  if (!(L.gossip?.missing ?? []).some((t) => t.replaceAll('{name}', 'Mochi') === gl)) bad(`gossipLine fills the name from the mood's own pool: ${gl}`);
  const gu = P.gossipLine('ginger', 'no-such-mood', 1);
  if (!(L.gossip?.happy ?? []).some((t) => t.replaceAll('{name}', 'Ginger') === gu)) bad(`gossipLine falls back to happy gossip: ${gu}`);

  /* ---- A friend asks for the chapter their hearts have reached ---- */
  for (const id of ORDER) {
    for (let h = 0; h < 5; h += 1) if (P.requestFor(id, h) !== P.REQUESTS?.[id]?.[h]) bad(`requestFor(${id}, ${h}) is not request ${h + 1}`);
    if (P.requestFor(id, 5) !== P.BEST_FRIEND_ASK?.[id] || P.requestFor(id, 9) !== P.BEST_FRIEND_ASK?.[id]) bad(`requestFor(${id}, 5+) is the best-friend ask`);
  }
  if (P.requestFor('chai') !== P.REQUESTS?.chai?.[0] || P.requestFor('chai', -3) !== P.REQUESTS?.chai?.[0]) bad('requestFor starts at the first request');
  if (P.requestFor('nobody', 1) !== '') bad('requestFor knows no strangers');

  /* ---- The level a card shows and the achievements behind its button (progress.js) ---- */
  const G = await load('src/pets/progress.js');
  const item = (id, tier) => ({ id, tier });
  const content = { pj: [item('a', 'beginner'), item('b', 'beginner'), item('c', 'easy'), item('d', 'easy'), item('e', 'medium')], rc: [], ps: [], ooo: [] };
  const sess = (ids) => ({ module: 'pj', answers: ids.map((i) => ({ item_id: i, is_correct: true })) });
  const pet = (id, o = {}) => ({ id, stage: 0, toNext: 5, unit: 'questions', done: 0, visits: 0, hearts: 0, ...o });
  const lv = (ids) => G.levelFor('ginger', { content, records: { sessions: ids.length ? [sess(ids)] : [] }, state: {} }, pet('ginger'));
  const l0 = lv([]), l1 = lv(['a', 'b', 'c']), l2 = lv(['a', 'b', 'c', 'd', 'e']);
  if (l0.n !== 1 || l0.of !== 3 || l0.name !== 'Beginner' || l0.left !== 2 || l0.cleared !== 0 || !/Finish 2 more jumbles to reach Easy/.test(l0.line)) bad(`levelFor at the start: ${JSON.stringify(l0)}`);
  if (l1.n !== 2 || l1.name !== 'Easy' || l1.left !== 1 || l1.cleared !== 1 || l1.segs.join() !== 'true,false,false' || !/Finish 1 more jumble to reach Medium/.test(l1.line)) bad(`levelFor mid-way: ${JSON.stringify(l1)}`);
  if (l2.n !== 3 || l2.cleared !== 3 || !l2.segs.every(Boolean) || !/Every level cleared/.test(l2.line)) bad(`levelFor when every level is cleared: ${JSON.stringify(l2)}`);
  const lm = G.levelFor('matcha', { content, records: {}, state: {} }, pet('matcha', { stage: 3, toNext: 12, unit: 'words' }));
  if (lm.n !== 3 || lm.of !== 10 || lm.segs.filter(Boolean).length !== 3 || !/12 more words to become /.test(lm.line)) bad(`levelFor falls back to growth stages: ${JSON.stringify(lm)}`);
  for (const l of [l0, l1, l2, lm]) {
    if (l.line.length > 96 || l.line.includes('—') || BANNED.test(l.line)) bad(`level line breaks the copy rules: ${l.line}`);
  }

  const cold = G.achievementsFor({ content, records: {}, state: {} }, { pets: ORDER.map((id) => pet(id)), flame: { days: 0 } });
  const warm = G.achievementsFor(
    { content, records: { sessions: [sess(['a', 'b', 'c', 'd', 'e'])] }, state: { engagement: { answered: 520, streaks: { best: 7 }, hasPerfectSession: true } } },
    { pets: ORDER.map((id) => pet(id, { visits: 1, stage: id === 'chai' ? 5 : 1, done: id === 'toffee' ? 4 : 1 })), flame: { days: 2 } },
  );
  if (cold.length !== 10 || new Set(cold.map((a) => a.id)).size !== 10) bad(`there are ${cold.length} achievements, wants 10 distinct`);
  if (cold.some((a) => a.got)) bad('a brand-new student has no achievements yet');
  if (warm.some((a) => !a.got)) bad(`a well-practised student has them all: missing ${warm.filter((a) => !a.got).map((a) => a.id).join()}`);
  for (const a of cold) {
    for (const [where, s] of [[`achievement ${a.id} title`, a.title], [`achievement ${a.id} line`, a.line]]) {
      if (!s?.trim() || s.length > 40 || s.includes('—') || BANNED.test(s)) bad(`${where} must be short and clean: ${s}`);
    }
    if (!(a.goal >= 1) || a.have !== 0 || a.got) bad(`achievement ${a.id} starts at 0 of ${a.goal}`);
  }

  return { problems, lines: lines.length };
}

if (process.argv[1]?.endsWith('check-pets.mjs')) {
  const { problems, lines } = await checkPets();
  if (!problems.length) { console.log(`✓ six friends, three friendships, ${lines} lines in voice (≤ 96 chars, no em dash, no banned words), five requests and five stories each`); process.exit(0); }
  console.log(`✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
