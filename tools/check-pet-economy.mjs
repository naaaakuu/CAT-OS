/**
 * check-pet-economy.mjs — the pets' economy, derived from records.
 *
 * Synthetic records at fixed local times (never Date.now) through
 * derivePets: mood decay, the gift ring's doubling, flawless, harmony,
 * Toffee's flame and its kindling, the daily wishes and their bonus,
 * treasures (derive → write → stock), and hostile rows. Then nextFor
 * against the real content registry read from disk.
 *
 * Run: node tools/check-pet-economy.mjs      verify.mjs §16.
 */

import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href);

const ORDER = ['toffee', 'chai', 'matcha', 'mochi', 'ginger', 'mallow'];
const GIFT_OF = { toffee: 'sparks', chai: 'stories', matcha: 'leaves', mochi: 'notes', ginger: 'maps', mallow: 'stardust' };
const HOUR = 3600e3;
const D = (day, h = 10) => new Date(2026, 8, day, h, 0, 0).getTime(); // local September 2026
const iso = (t) => new Date(t).toISOString();
const near = (a, b, tol) => Number.isFinite(a) && Math.abs(a - b) <= tol;
const moodFormula = (care) => 1 - Math.exp(-1.2 * care);

const content = { rc: [{ id: 'rc-1', estimated_time_min: 6 }], pj: [], ps: [], ooo: [], wd: [], sp: [], pc: [], wb: [], cr: [], families: [], fields: { meadow: [], pond: [], thicket: [] } };

/** One finished run for a pet, as the record its module really writes. */
let seq = 0;
function run(pet, at, { stars = 3, flawless = false } = {}) {
  const id = `r${++seq}`;
  const [correct, total, fast] = flawless ? [4, 4, true] : stars === 3 ? [3, 4, true] : stars === 2 ? [3, 4, false] : stars === 1 ? [2, 4, true] : [1, 4, true];
  if (pet === 'matcha') return { L: { id, kind: 'lex-round', region: 'meadow', stars: flawless ? 3 : stars, flawless, score: { correct, total }, finished_at: iso(at) } };
  if (pet === 'toffee') return { L: { id, kind: 'gauntlet-run', stars: flawless ? 3 : stars, flawless, score: { correct, total }, finished_at: iso(at) } };
  const score = { correct, total, accuracy: correct / total, attempted: total };
  if (pet === 'chai') return { S: { id, passage_id: 'rc-1', finished_at: iso(at), duration_ms: (fast ? 5 : 9) * 60000, score, answers: [] } };
  const module = { mochi: 'ps', ginger: 'pj', mallow: 'ooo' }[pet];
  return { S: { id, module, item_ids: ['x1', 'x2'], finished_at: iso(at), duration_ms: (fast ? 100 : 400) * 1000, score, answers: [] } };
}
const treasure = (t, at) => ({ L: { id: `t${++seq}`, kind: 'village-treasure', treasure: t, at: iso(at) } });
const recs = (...rs) => ({ sessions: rs.flat().filter((r) => r.S).map((r) => r.S), learning: rs.flat().filter((r) => r.L).map((r) => r.L) });

export async function checkPetEconomy() {
  const problems = [];
  const bad = (m) => problems.push(m);
  let E;
  try { E = await load('src/pets/economy.js'); } catch (err) { return { problems: [`src/pets/economy.js does not load: ${err.message}`] }; }
  const { LINES } = await load('src/pets/pets.js');
  const derive = (records, now, state = {}) => E.derivePets(state, records, content, now);
  const pet = (out, id) => out.pets.find((p) => p.id === id);
  const sameDay = (out, gift) => out.pets.find((p) => p.gift === gift);

  /* 1. Empty records */
  {
    const out = derive({ sessions: [], learning: [] }, D(10));
    if (out.pets.map((p) => p.id).join() !== ORDER.join()) bad('1: pets come back in roster order');
    if (!out.pets.every((p) => p.isNew && p.word === 'new')) bad('1: with no records every pet is new');
    if (!near(out.harmony, 0.3, 1e-9)) bad(`1: empty harmony is ${out.harmony}, want 0.3`);
    if (out.flame.days !== 0 || out.flame.tier !== 'embers' || out.flame.alive) bad(`1: empty flame is ${JSON.stringify(out.flame)}`);
    if (out.wishes.length !== 3 || !out.wishes.every((w) => w.text && w.href?.startsWith('#/') && w.done === false)) bad('1: three undone wishes with hrefs');
    if (Object.values(out.stock).some((n) => n !== 0) || Object.keys(out.stock).join() !== 'sparks,stories,leaves,notes,maps,stardust') bad(`1: empty stock ${JSON.stringify(out.stock)}`);
    if (out.nextTreasure?.id !== 'lanterns') bad('1: the first goal is the lanterns');
    if (out.letter !== null || out.festival) bad('1: no letter and no festival for a new learner');
  }

  /* 2. Mood decay: one 3-star RC visit (weight 1.0, half-life 36 h) */
  {
    const t0 = D(5);
    const r = recs(run('chai', t0));
    const visits = E.visitsFrom(r, content);
    if (visits.length !== 1 || visits[0].pet !== 'chai' || visits[0].stars !== 3) bad(`2: one chai visit of 3 stars, got ${JSON.stringify(visits)}`);
    const m1 = E.moodAt(visits, 'chai', t0 + HOUR), m48 = E.moodAt(visits, 'chai', t0 + 48 * HOUR), m96 = E.moodAt(visits, 'chai', t0 + 96 * HOUR);
    /* The plan quoted ~0.72 / ~0.42; the spec's binding formula gives 0.692 / 0.379. */
    if (!near(m1, moodFormula(0.5 ** (1 / 36)), 1e-9) || !near(m1, 0.69, 0.02)) bad(`2: mood at +1 h is ${m1}`);
    if (!near(m48, 0.38, 0.03)) bad(`2: mood at +48 h is ${m48}`);
    if (!(m96 < 0.2)) bad(`2: mood at +96 h is ${m96}`);
    if (E.moodAt(visits, 'matcha', t0 + HOUR) !== null) bad('2: a pet with no visits has no mood (null)');
    const words = [1, 48, 96].map((h) => pet(derive(r, t0 + h * HOUR), 'chai').word);
    if (words.join() !== 'happy,missing,sleepy') bad(`2: words over time are ${words}`);
    if (pet(derive(r, t0 + 400 * HOUR), 'chai').word !== 'wilting') bad('2: long neglect wilts');
  }

  /* 3 + 4. The ring doubles; flawless adds one before the doubling */
  {
    const t0 = D(5);
    const ring = derive(recs(run('matcha', t0), run('chai', t0 + HOUR)), t0 + 2 * HOUR);
    if (pet(ring, 'chai').earned !== 6) bad(`3: an RC after a happy Matcha earns 6 stories, got ${pet(ring, 'chai').earned}`);
    if (!ring.last?.doubled || ring.last.pet !== 'chai' || ring.last.gifts !== 6) bad(`3: last visit reports the doubling ${JSON.stringify(ring.last)}`);
    const alone = derive(recs(run('chai', t0 + HOUR)), t0 + 2 * HOUR);
    if (pet(alone, 'chai').earned !== 3) bad(`3: an RC with no Matcha earns 3, got ${pet(alone, 'chai').earned}`);
    if (alone.last?.doubled) bad('3: no doubling without a supplier');
    if (!pet(ring, 'chai').full || pet(alone, 'chai').full) bad('3: full means the supplier is happy now');
    if (!pet(ring, 'chai').ring?.includes('Matcha') || !pet(alone, 'chai').ring?.includes('Matcha')) bad('3: the ring line names the supplier');
    /* Same-time supplier visit does not count (strictly before). */
    const same = derive(recs(run('matcha', t0), run('chai', t0)), t0 + HOUR);
    if (pet(same, 'chai').earned !== 3) bad('3: the supplier\'s mood is read from visits strictly before');
    const fl = derive(recs(run('chai', t0, { flawless: true })), t0 + HOUR);
    if (pet(fl, 'chai').earned !== 4) bad(`4: flawless alone earns 3 + 1, got ${pet(fl, 'chai').earned}`);
    const fl2 = derive(recs(run('matcha', t0), run('chai', t0 + HOUR, { flawless: true })), t0 + 2 * HOUR);
    if (pet(fl2, 'chai').earned !== 8) bad(`4: flawless after a happy Matcha earns (3 + 1) × 2, got ${pet(fl2, 'chai').earned}`);
    const zero = derive(recs(run('chai', t0, { stars: 0 })), t0 + HOUR);
    if (pet(zero, 'chai').earned !== 1) bad('4: a finished run always gives at least one gift');
    const before = derive(recs(run('matcha', t0)), t0 + 2 * HOUR);
    const bag = E.giftsBetween(before, ring);
    if (bag.stories !== 6 || bag.leaves !== 0) bad(`giftsBetween: ${JSON.stringify(bag)}`);
    if (E.giftsBetween(null, ring).leaves !== 3) bad('giftsBetween: no before means everything is new');
  }

  /* 5. Harmony = 0.5 × mean + 0.5 × min, new counted as 0.3 */
  {
    const t0 = D(5);
    const out = derive(recs(run('chai', t0)), t0 + HOUR);
    const m = pet(out, 'chai').mood;
    const want = 0.5 * ((0.3 * 5 + m) / 6) + 0.5 * Math.min(0.3, m);
    if (!near(out.harmony, want, 1e-9)) bad(`5: harmony ${out.harmony}, want ${want}`);
    const all = derive(recs(ORDER.map((id) => run(id, t0))), t0 + HOUR);
    const moods = all.pets.map((p) => p.mood);
    const want2 = 0.5 * (moods.reduce((a, b) => a + b, 0) / 6) + 0.5 * Math.min(...moods);
    if (!near(all.harmony, want2, 1e-9)) bad('5: harmony with every pet met');
    if (!all.festival) bad('5: every pet happy is a festival night');
    if (out.festival) bad('5: no festival while a pet is new');
    if (out.neediest !== 'matcha') bad(`5: ties go to the gentlest door first: Chai, then Matcha; Toffee last (neediest ${out.neediest})`);
    if (derive(recs([]), t0).neediest !== 'chai') bad('5: a brand-new learner is sent to Chai first');
  }

  /* 6. Toffee's flame */
  {
    const days = (list) => recs(list.map((d) => run('matcha', D(d))));
    const f9 = derive(days([1, 2, 3, 4, 5, 6, 7, 9]), D(9, 20)).flame;
    if (f9.days !== 9 || f9.kindling !== 0 || !f9.today || f9.tier !== 'tall') bad(`6: D1..D7 + D9 seen on D9 is 9 days, kindling spent: ${JSON.stringify(f9)}`);
    const f8 = derive(days([1, 2, 3, 4, 5, 6, 7]), D(8, 9)).flame;
    if (f8.days !== 7 || f8.kindling !== 1 || f8.today || !f8.alive) bad(`6: seven days earn a kindling, alive the next morning: ${JSON.stringify(f8)}`);
    const fb = derive(days([1, 2, 3, 4, 5, 6, 7]), D(9, 9)).flame;
    if (fb.days !== 8 || fb.kindling !== 0 || !fb.alive) bad(`6: counting back bridges one missing day with kindling: ${JSON.stringify(fb)}`);
    const gap = derive(days([1, 2, 3, 4, 5, 6, 7, 10]), D(10, 20)).flame;
    if (gap.days !== 1 || gap.tier !== 'small') bad(`6: a two-day gap resets the run: ${JSON.stringify(gap)}`);
    const nok = derive(days([1, 2, 4]), D(4, 20)).flame;
    if (nok.days !== 1) bad(`6: no kindling, no bridge: ${JSON.stringify(nok)}`);
    const cap = derive(days(Array.from({ length: 28 }, (_, i) => i + 1)), D(28, 20)).flame;
    if (cap.kindling !== 2 || cap.days !== 28 || cap.tier !== 'bonfire') bad(`6: kindling is capped at 2: ${JSON.stringify(cap)}`);
    const tiers = [0, 1, 2, 3, 6, 7, 13, 14].map(E.flameTier).join();
    if (tiers !== 'embers,small,small,steady,steady,tall,tall,bonfire') bad(`6: flame tiers ${tiers}`);
  }

  /* 7. Wishes */
  {
    /* Everyone met on D3; Mallow only on D1, so Mallow is the neediest on D5. */
    const base = [run('mallow', D(1)), ...ORDER.filter((id) => id !== 'mallow').map((id) => run(id, D(3)))];
    const morning = derive(recs(base), D(5, 8));
    if (morning.wishes[0].pet !== 'mallow' || !morning.wishes[0].text.includes('Mallow')) bad(`7: wish 1 names the neediest: ${JSON.stringify(morning.wishes[0])}`);
    if (morning.wishes[0].done) bad('7: not done before the visit');
    const after = derive(recs(base, run('mallow', D(5, 9))), D(5, 12));
    if (after.wishes[0].pet !== 'mallow' || !after.wishes[0].done) bad('7: a visit today completes wish 1, and the wish does not move');
    const due = derive(recs(base), D(5, 8), { meadow: { due: 4 }, pond: { due: 2 }, thicket: { due: 3 }, rootwood: { dueCount: 1 } });
    if (due.wishes[1].pet !== 'matcha' || !/fading/.test(due.wishes[1].text)) bad(`7: twelve due words make wish 2 Matcha's: ${JSON.stringify(due.wishes[1])}`);
    if (!near(pet(due, 'matcha').mood, pet(morning, 'matcha').mood * 0.85, 1e-9)) bad('7: due pressure multiplies Matcha\'s mood by 0.85');
    if (!LINES.fading.includes(pet(due, 'matcha').line)) bad('7: Matcha mentions the fading words under pressure');
    if (morning.wishes[1].pet === 'matcha' && morning.wishes[1].text.includes('fading')) bad('7: no fading wish without due words');
    /* A past day with all three wishes done pays +1 of every gift. */
    const [w1, w2, w3] = morning.wishes;
    const others = ORDER.filter((id) => id !== w1.pet && id !== w2.pet);
    const full = [run(w1.pet, D(5, 9), { flawless: true }), run(w2.pet, D(5, 10), { flawless: true }), run(others[0], D(5, 11), { flawless: true })];
    const done = derive(recs(base, full), D(5, 20));
    if (done.wishesDone !== 3 || !done.wishes.every((w) => w.done)) bad(`7: all three wishes done (${w3.id}): ${JSON.stringify(done.wishes)}`);
    /* (D3 may itself be a complete day, depending on its wish 3: measure against it.) */
    const baseline = derive(recs(base), D(6, 12)).bonus;
    const later = derive(recs(base, full), D(6, 12));
    if (later.bonus !== baseline + 1) bad(`7: one more complete past day is one more bonus: ${baseline} → ${later.bonus}`);
    for (const g of Object.keys(later.stock)) if (later.stock[g] !== sameDay(later, g).earned + later.bonus) bad(`7: each bonus day adds 1 ${g}: stock ${later.stock[g]}, earned ${sameDay(later, g).earned}, bonus ${later.bonus}`);
    if (w3.id === 'friends' && derive(recs(base, full.slice(0, 2)), D(6, 12)).bonus !== baseline) bad('7: two friends is not three');
    if (derive(recs(base, [run(w1.pet, D(5, 9))]), D(6, 12)).bonus !== baseline) bad('7: one wish is no bonus');
  }

  /* 8. Treasures: derive → write → stock */
  {
    const t0 = D(5);
    const earn = [run('matcha', t0), run('matcha', t0 + HOUR), run('chai', t0 + 2 * HOUR)];
    const pre = derive(recs(earn), t0 + 3 * HOUR);
    const leaves = pre.stock.leaves, stories = pre.stock.stories;
    if (!(leaves >= 2 && stories >= 2)) bad(`8: setup earns leaves and stories: ${JSON.stringify(pre.stock)}`);
    if (!E.canMake(pre, 'lanterns').ok || !pre.nextTreasure.affordable) bad('8: lanterns are affordable');
    if (E.canMake(pre, 'bunting').ok) bad('8: only the next treasure can be made');
    const made = derive(recs(earn, treasure('lanterns', t0 + 4 * HOUR)), t0 + 5 * HOUR);
    if (made.stock.leaves !== leaves - 2 || made.stock.stories !== stories - 2) bad(`8: lanterns cost 2 leaves and 2 stories: ${JSON.stringify(made.stock)}`);
    if (!made.treasures[0].made || made.treasures[0].at !== iso(t0 + 4 * HOUR) || made.nextTreasure.id !== 'bunting') bad('8: lanterns made, bunting next');
    const cm = E.canMake(made, 'bunting');
    if (cm.ok || cm.missing.notes !== 3 || cm.missing.maps !== 3 || 'leaves' in cm.missing) bad(`8: canMake reports what is missing: ${JSON.stringify(cm)}`);
    const order = derive(recs(earn, treasure('bunting', t0 + 3.5 * HOUR), treasure('lanterns', t0 + 4 * HOUR)), t0 + 5 * HOUR);
    if (order.treasures[1].made || order.stock.leaves !== leaves - 2 || order.nextTreasure.id !== 'bunting') bad('8: a treasure out of order is ignored');
    const twice = derive(recs(earn, treasure('lanterns', t0 + 4 * HOUR), treasure('lanterns', t0 + 4.5 * HOUR)), t0 + 5 * HOUR);
    if (twice.stock.leaves !== leaves - 2 || twice.treasures.filter((t) => t.made).length !== 1) bad('8: two records for one treasure count once');
    if (E.TREASURES.map((t) => t.id).join() !== 'lanterns,bunting,flowers,fireflies,swing,chimes,kite,lilylights,skylanterns') bad('8: the nine treasures in order');
    const kite = E.TREASURES.find((t) => t.id === 'kite');
    if (Object.keys(kite.recipe).length !== 6 || Object.values(kite.recipe).some((n) => n !== 5)) bad('8: the kite costs every gift 5');
  }

  /* 9. Hostile records are skipped without throwing */
  {
    const hostile = {
      sessions: [
        null, 7, 'x',
        { id: 'h1', passage_id: 'rc-1', score: { correct: 3, total: 4 } },                   // no finished_at
        { id: 'h2', module: 'zzz', finished_at: iso(D(5)), score: { correct: 1, total: 1 } }, // unknown module
        { id: 'h3', module: 'pj', finished_at: iso(D(5)), score: null, answers: null },       // null answers: a real visit
        { id: 'h4', module: 'ooo', finished_at: iso(D(5)), score: { correct: 'three', total: null }, answers: 'nope' },
        { id: 'h5', passage_id: 'nope', finished_at: iso(D(5)), score: { correct: 1, total: 1 } },
        { id: 'h6', module: 'wd', finished_at: 'not a date', score: { correct: 2 } },
        { id: 'h7', module: 'rc2', finished_at: iso(D(5)), score: { correct: 9, total: 2 } },
      ],
      learning: [
        { id: 'l1', kind: 'lex-round', stars: 'x', finished_at: iso(D(5)) },
        { id: 'l2', kind: 'gauntlet-run', finished_at: iso(D(5)) },
        { id: 'l3', kind: 'garden-session', clean: 'maybe' },
        { id: 'l4', kind: 'village-treasure', treasure: 123, at: 'soon' },
        { id: 'l5', kind: 'village-treasure' },
        { id: 'l6', kind: 'village-build', building: 'reading', level: 3 },
        null,
      ],
    };
    try {
      const v = E.visitsFrom(hostile, content);
      if (v.map((x) => x.id).join() !== 'h3,h4,h7') bad(`9: only real runs become visits, got ${v.map((x) => x.id)}`);
      const out = derive(hostile, D(6));
      if (!Number.isFinite(out.harmony) || Object.values(out.stock).some((n) => !Number.isFinite(n) || n < 0)) bad('9: hostile rows leave finite numbers');
      if (out.nextTreasure?.id !== 'lanterns') bad('9: junk treasure records make nothing');
      E.derivePets(undefined, undefined, undefined, D(6));
      E.derivePets(null, { sessions: 'x', learning: {} }, { rc: null }, D(6));
      E.visitsFrom(undefined, undefined);
    } catch (err) {
      bad(`9: hostile records threw: ${err.stack?.split('\n').slice(0, 3).join(' | ')}`);
    }
  }

  /* Letters */
  {
    const base = [run('mallow', D(1)), ...ORDER.filter((id) => id !== 'mallow').map((id) => run(id, D(3)))];
    const away = derive(recs(base), D(6), { awayDays: 3 });
    if (away.letter?.pet !== 'mallow' || away.letter.text !== LINES.letter.mallow) bad(`letter: from the pet who missed you most: ${JSON.stringify(away.letter)}`);
    if (derive(recs(base), D(3, 20), { awayDays: 0 }).letter !== null) bad('letter: none when you were here today');
    if (derive(recs(base), D(6)).letter?.pet !== 'mallow') bad('letter: awayDays is derived when the state lacks it');
  }

  /* Hearts */
  {
    const many = recs(Array.from({ length: 12 }, (_, i) => run('ginger', D(1 + i))));
    const g = pet(derive(many, D(13)), 'ginger');
    if (g.xp !== 48 || g.hearts !== 5 || g.toNext !== 0 || !g.story) bad(`hearts: 12 three-star visits is 48 xp, 5 hearts: ${JSON.stringify({ xp: g.xp, hearts: g.hearts })}`);
    const one = pet(derive(recs(run('ginger', D(1), { stars: 1 })), D(2)), 'ginger');
    if (one.xp !== 2 || one.hearts !== 0 || one.toNext !== 1 || one.story !== null) bad(`hearts: one 1-star visit ${JSON.stringify({ xp: one.xp, hearts: one.hearts, toNext: one.toNext })}`);
  }

  /* Performance: ~1000 runs over a year stays fast */
  {
    const big = [];
    for (let i = 0; i < 1000; i += 1) big.push(run(ORDER[i % 6], new Date(2025, 9, 1).getTime() + i * 8.7 * HOUR, { stars: i % 4 }));
    big.push(...['lanterns', 'bunting', 'flowers'].map((t, i) => treasure(t, D(1) + i * HOUR)));
    const r = recs(big);
    const t = performance.now();
    for (let i = 0; i < 5; i += 1) derive(r, D(20));
    const ms = (performance.now() - t) / 5;
    if (ms > 120) bad(`perf: derivePets over 1000 runs took ${ms.toFixed(1)} ms`);
  }

  return { problems };
}

/** Task 6: nextFor gives every pet a real next activity against the real registry. */
export async function checkNextFor() {
  const problems = [];
  const bad = (m) => problems.push(m);
  let N;
  try { N = await load('src/pets/next.js'); } catch (err) { return { problems: [`src/pets/next.js does not load: ${err.message}`] }; }
  const { loadWorldContent, deriveWorldState } = await load('src/world/state.js');
  /* The loader reads the repository from disk under Node (loader.js IS_NODE). */
  const content = await loadWorldContent();
  if (content.partial) bad('next: the content registry loaded partially');
  const now = D(20);
  const learner = recs(run('chai', D(18)), run('chai', D(19), { stars: 1 }), run('matcha', D(19)), run('mochi', D(19)));
  for (const [label, records, first] of [['a new learner', { sessions: [], learning: [] }, true], ['a learner a few days in', learner, false]]) {
    const world = { content, records, state: deriveWorldState(content, records, now) };
    for (const id of ORDER) {
      let n, c;
      try { n = N.nextFor(id, world, { first }); c = N.cornersOf(id, world); } catch (err) { bad(`next: ${id} threw for ${label}: ${err.message}`); continue; }
      if (!n?.href?.startsWith('#/') || !n.label || !n.sub || !Number.isFinite(n.minutes)) bad(`next: ${id} for ${label} → ${JSON.stringify(n)}`);
      if (!c?.length || !c.every((x) => x.href?.startsWith('#/') && x.label)) bad(`next: ${id} corners for ${label} → ${JSON.stringify(c)}`);
    }
    const chai = N.nextFor('chai', world, { first });
    if (first && !chai.href.startsWith('#/rc/session/')) bad(`next: a new learner's first activity with Chai is a passage, got ${chai.href}`);
    if (N.nextFor('toffee', world).href !== '#/world/place/wilds') bad('next: Toffee runs the Gauntlet');
    if (N.cornersOf('matcha', world).length !== 5) bad('next: Matcha has five corners');
  }
  if (N.nextFor('nobody', { content, records: { sessions: [], learning: [] }, state: {} }) !== null) bad('next: an unknown pet has no next activity');
  return { problems };
}

if (process.argv[1]?.endsWith('check-pet-economy.mjs')) {
  const a = await checkPetEconomy();
  const b = await checkNextFor();
  const problems = [...a.problems, ...b.problems];
  if (!problems.length) { console.log('✓ pets economy: mood decay, ring doubling, flawless, harmony, flame + kindling, wishes + bonus, treasures, hostile rows, letters, hearts; nextFor for every pet against the real registry'); process.exit(0); }
  console.log(`✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
