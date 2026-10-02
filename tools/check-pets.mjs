/**
 * check-pets.mjs — the six pets, their ring and their voice.
 *
 * Asserts the roster (ids, order, frames), that the gift ring closes, that
 * every place and module has a pet, and that every line a pet can say obeys
 * the copy rules: no "!", at most 96 characters, none of the banned words,
 * templates filled with every name they can take. Each pet has exactly five
 * story lines, one per heart.
 *
 * Run: node tools/check-pets.mjs      verify.mjs §17.
 */

import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href);

const ORDER = ['toffee', 'chai', 'matcha', 'mochi', 'ginger', 'mallow'];
const NAMES = ['Toffee', 'Chai', 'Matcha', 'Mochi', 'Ginger', 'Mallow'];
const MODULES = ['rc', 'rc2', 'cr', 'lex', 'garden', 'wd', 'wb', 'ps', 'pc', 'pj', 'sp', 'ooo', 'gauntlet'];
const MOOD_WORDS = ['glowing', 'happy', 'missing', 'sleepy', 'wilting', 'new'];
const BANNED = /\b(wrong|failure|failed|mistake|poor|weak|bad|careless|study|score|xp|level up|unlocked)\b/i;
const INTRO = [
  'Oh — hello. This is your village.',
  'Six of us live here, and each of us looks after one part of CAT English.',
  'Come and meet Chai at the library. She has a short passage waiting.',
];

export async function checkPets() {
  const problems = [];
  const bad = (m) => problems.push(m);
  let P;
  try { P = await load('src/pets/pets.js'); } catch (err) { return { problems: [`src/pets/pets.js does not load: ${err.message}`], lines: 0 }; }
  const { REGIONS } = await load('src/world/regions.js');

  /* ---- Roster ---- */
  if (P.PETS?.length !== 6) bad(`there are ${P.PETS?.length} pets, not 6`);
  if (P.PETS?.map((p) => p.id).join() !== ORDER.join()) bad(`pet order is ${P.PETS?.map((p) => p.id).join()}`);
  if (P.PETS?.map((p) => p.name).join() !== NAMES.join()) bad('pet names do not match the roster');
  if (!Object.isFrozen(P.PETS)) bad('PETS must be frozen');
  for (const p of P.PETS ?? []) {
    for (const k of ['id', 'name', 'creature', 'subject', 'home', 'gift', 'giftOne', 'colour', 'blurb']) if (!p[k]) bad(`${p.id} is missing ${k}`);
    if (!Array.isArray(p.frame) || p.frame.length !== 2) bad(`${p.id} has no frame`);
    if (!p.places?.length || !p.modules?.length) bad(`${p.id} has no places or modules`);
    if (P.PET_BY_ID.get(p.id) !== p) bad(`PET_BY_ID does not hold ${p.id}`);
    if (!/^#[0-9A-F]{6}$/i.test(p.colour)) bad(`${p.id} colour ${p.colour}`);
  }
  const frames = (P.PETS ?? []).map((p) => p.frame.join(':')).join(' ');
  if (frames !== '0:350 355:330 700:338 1040:335 1380:397 1780:392') bad(`frames are ${frames}`);

  /* ---- Gifts and the ring ---- */
  const giftKeys = Object.keys(P.GIFTS ?? {});
  if (giftKeys.join() !== 'sparks,stories,leaves,notes,maps,stardust') bad(`gifts are ${giftKeys.join()}`);
  for (const [k, g] of Object.entries(P.GIFTS ?? {})) {
    if (P.PET_BY_ID.get(g.pet)?.gift !== k) bad(`gift ${k} does not belong to ${g.pet}`);
    if (!g.name || !g.one) bad(`gift ${k} needs a name and a singular`);
  }
  if ([...(P.RING ?? [])].sort().join() !== [...ORDER].sort().join()) bad('RING is not a permutation of the pets');
  if (P.RING?.join() !== 'matcha,chai,mochi,ginger,mallow,toffee') bad(`RING is ${P.RING?.join()}`);
  for (const id of ORDER) {
    if (P.supplierOf(P.successorOf(id)) !== id) bad(`ring broken at ${id}`);
  }
  if (P.supplierOf('chai') !== 'matcha' || P.successorOf('toffee') !== 'matcha') bad('chai needs matcha; toffee feeds matcha');

  /* ---- Places and modules ---- */
  for (const r of REGIONS) if (!ORDER.includes(P.petForPlace(r.slug))) bad(`place ${r.slug} has no pet`);
  const placeWant = { 'reading-room': 'chai', meadow: 'matcha', pond: 'matcha', thicket: 'matcha', rootwood: 'matcha', terraces: 'matcha', table: 'mochi', loom: 'ginger', bench: 'mallow', wilds: 'toffee', hearth: 'toffee' };
  for (const [slug, id] of Object.entries(placeWant)) if (P.petForPlace(slug) !== id) bad(`place ${slug} → ${P.petForPlace(slug)}, want ${id}`);
  for (const m of MODULES) if (!ORDER.includes(P.petForModule(m))) bad(`module ${m} has no pet`);
  const modWant = { rc: 'chai', rc2: 'chai', cr: 'chai', lex: 'matcha', garden: 'matcha', wd: 'matcha', wb: 'matcha', ps: 'mochi', pc: 'mochi', pj: 'ginger', sp: 'ginger', ooo: 'mallow', gauntlet: 'toffee' };
  for (const [m, id] of Object.entries(modWant)) if (P.petForModule(m) !== id) bad(`module ${m} → ${P.petForModule(m)}, want ${id}`);
  if (P.petForModule('nonsense') !== null || P.petForPlace('nowhere') !== null) bad('unknown modules and places map to null');

  /* ---- Every line, filled with every name it can take ---- */
  const lines = [];
  const add = (where, s) => lines.push([where, s]);
  const L = P.LINES ?? {};
  for (const w of MOOD_WORDS) {
    for (const id of ORDER) {
      const pool = L.mood?.[w]?.[id] ?? [];
      if (pool.length < 3) bad(`${id} has ${pool.length} "${w}" lines, wants 3+`);
      pool.forEach((s, i) => add(`mood.${w}.${id}[${i}]`, s));
    }
    const g = L.gossip?.[w] ?? [];
    if (g.length < 2) bad(`gossip.${w} has ${g.length} templates`);
    for (const t of g) {
      if (!t.includes('{name}')) bad(`gossip.${w}: "${t}" has no {name}`);
      for (const n of NAMES) add(`gossip.${w}`, t.replaceAll('{name}', n));
    }
  }
  for (const id of ORDER) {
    const tap = L.tap?.[id] ?? [];
    if (tap.length < 4) bad(`${id} has ${tap.length} tap lines, wants 4`);
    tap.forEach((s, i) => add(`tap.${id}[${i}]`, s));
    if (typeof L.letter?.[id] !== 'string') bad(`${id} has no letter`);
    else add(`letter.${id}`, L.letter[id]);
    const st = P.STORIES?.[id] ?? [];
    if (st.length !== 5) bad(`${id} has ${st.length} stories, wants exactly 5`);
    st.forEach((s, i) => add(`STORIES.${id}[${i}]`, s));
    add(`blurb.${id}`, P.PET_BY_ID.get(id)?.blurb ?? '');
  }
  for (const s of L.fading ?? []) add('fading', s);
  if ((L.fading ?? []).length < 3) bad('Matcha needs 3+ fading-words lines');
  for (const kind of ['ringFull', 'ringLow']) {
    if ((L[kind] ?? []).length < 2) bad(`${kind} has fewer than 2 templates`);
    for (const t of L[kind] ?? []) {
      if (!t.includes('{supplier}') || !t.includes('{gift}')) bad(`${kind}: "${t}" needs {supplier} and {gift}`);
      for (const id of ORDER) {
        const sup = P.PET_BY_ID.get(P.supplierOf(id));
        add(kind, t.replaceAll('{supplier}', sup.name).replaceAll('{gift}', P.GIFTS[sup.gift].name.toLowerCase()));
      }
    }
  }
  if (JSON.stringify(L.intro) !== JSON.stringify(INTRO)) bad('LINES.intro must be Toffee\'s three lines from spec §3.6');
  (L.intro ?? []).forEach((s, i) => add(`intro[${i}]`, s));

  for (const [where, s] of lines) {
    if (typeof s !== 'string' || !s.trim()) { bad(`${where} is empty`); continue; }
    if (s.includes('!')) bad(`${where} has "!": ${s}`);
    if (s.length > 96) bad(`${where} is ${s.length} chars: ${s}`);
    const m = s.match(BANNED);
    if (m) bad(`${where} uses "${m[0]}": ${s}`);
    if (/\{\w+\}/.test(s)) bad(`${where} has an unfilled slot: ${s}`);
  }
  const seen = new Map();
  for (const [where, s] of lines) if (!where.startsWith('gossip') && !where.startsWith('ring')) { if (seen.has(s)) bad(`duplicate line in ${where} and ${seen.get(s)}: ${s}`); seen.set(s, where); }

  /* ---- Picks are deterministic and come from the right pool ---- */
  const a = P.lineFor('chai', 'missing', 'd1'), b = P.lineFor('chai', 'missing', 'd1');
  if (a !== b || !L.mood.missing.chai.includes(a)) bad('lineFor must pick deterministically from the pet\'s own pool');
  if (!L.tap.mochi.includes(P.lineFor('mochi', 'tap', 7))) bad('lineFor(tap) picks a tap line');
  if (P.lineFor('ginger', 'letter', 'x') !== L.letter.ginger) bad('lineFor(letter) is the letter');
  if (!L.fading.includes(P.lineFor('matcha', 'fading', 'x'))) bad('lineFor(fading) is a fading-words line');
  const picks = new Set(Array.from({ length: 40 }, (_, i) => P.lineFor('toffee', 'happy', `s${i}`)));
  if (picks.size < 2) bad('lineFor never varies with the seed');
  const gl = P.gossipLine('mochi', 'missing', 3);
  if (!gl.includes('Mochi') || gl.includes('{')) bad(`gossipLine fills the name: ${gl}`);
  const rl = P.ringLine('chai', true, 1), rl2 = P.ringLine('chai', false, 1);
  if (!rl.includes('Matcha') || !rl.includes('leaves') || !rl2.includes('Matcha')) bad(`ringLine names the supplier and gift: ${rl} / ${rl2}`);

  return { problems, lines: lines.length };
}

if (process.argv[1]?.endsWith('check-pets.mjs')) {
  const { problems, lines } = await checkPets();
  if (!problems.length) { console.log(`✓ six pets, one ring, ${lines} lines in voice (no "!", ≤ 96 chars, no banned words), five stories each`); process.exit(0); }
  console.log(`✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
