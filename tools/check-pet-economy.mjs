/**
 * check-pet-economy.mjs — the village's one loop, derived from records.
 *
 * Synthetic records at fixed local times (never Date.now) through
 * derivePets: a new learner, what a run earns and the level Glow reaches,
 * visits from every module, Toffee's daily visit, mood decay, harmony,
 * growth stages, today's three friends and the day's gift, Toffee's flame and its
 * kindling, decor by level, the welcome after a day away, changeBetween,
 * and hostile rows. Then nextFor and noticeFor against the real content
 * registry read from disk.
 *
 * Run: node tools/check-pet-economy.mjs      verify.mjs §16.
 */

import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href);

const ORDER = ['toffee', 'chai', 'matcha', 'mochi', 'ginger', 'mallow'];
const DECOR_IDS = 'lanterns,bunting,flowers,fireflies,swing,chimes,kite,lilylights,skylanterns';
const HOUR = 3600e3;
const D = (day, h = 10) => new Date(2026, 8, day, h, 0, 0).getTime(); // local September 2026
const iso = (t) => new Date(t).toISOString();
const near = (a, b, tol) => Number.isFinite(a) && Math.abs(a - b) <= tol;
const moodFormula = (care) => 1 - Math.exp(-1.2 * care);
const json = (x) => JSON.stringify(x);

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
const recs = (...rs) => ({ sessions: rs.flat().filter((r) => r.S).map((r) => r.S), learning: rs.flat().filter((r) => r.L).map((r) => r.L) });

export async function checkPetEconomy() {
  const problems = [];
  const bad = (m) => problems.push(m);
  let E;
  try { E = await load('src/pets/economy.js'); } catch (err) { return { problems: [`src/pets/economy.js does not load: ${err.message}`] }; }
  const { LINES, REQUESTS, STORIES, BEST_FRIEND_ASK } = await load('src/pets/pets.js');
  const { dayKey } = await load('src/core/engagement/streaks.js');
  const G = await load('src/pets/glow.js');
  const derive = (records, now, state = {}) => E.derivePets(state, records, content, now);
  const pet = (out, id) => out.pets.find((p) => p.id === id);
  const made = (out) => out.decor.filter((d) => d.made).map((d) => d.id).join();

  /* 1. A new learner */
  {
    const out = derive(recs(), D(10));
    if (out.pets.map((p) => p.id).join() !== ORDER.join()) bad('1: pets come back in roster order');
    if (!out.pets.every((p) => p.isNew && p.word === 'new' && p.hearts === 0 && p.earned === 0 && p.visits === 0 && p.story === null && p.lastAt === null)) bad('1: with no records every pet is new, with nothing earned');
    if (!out.pets.every((p) => LINES.meet[p.id].includes(p.line) && p.request === REQUESTS[p.id][0])) bad('1: a new friend says hello and asks for the first chapter');
    const t = out.today;
    if (t.picks.join() !== 'chai,matcha,mochi' || t.done.join() !== 'false,false,false' || t.doneCount !== 0 || t.gift || t.helped.length || t.key !== dayKey(D(10))) bad(`1: a new learner's three are Chai, Matcha and Mochi: ${json(t)}`);
    if (out.pets.filter((p) => p.pick).map((p) => p.id).join() !== 'chai,matcha,mochi') bad('1: each pick is flagged on its pet');
    if (out.play !== 'chai' || out.neediest !== 'chai') bad(`1: a new learner is sent to Chai first (play ${out.play}, neediest ${out.neediest})`);
    if (out.glow !== 0 || out.gifts !== 0 || out.level.level !== 1 || out.level.need !== 15) bad(`1: no Glow, level 1: ${json({ glow: out.glow, level: out.level })}`);
    if (made(out) !== '' || out.nextDecor?.id !== 'lanterns') bad('1: nothing made yet; the lanterns come first');
    const f = out.flame;
    if (f.days !== 0 || f.tier !== 'embers' || f.alive || f.today || f.kindling !== 0 || f.week.length !== 7 || f.week.some((d) => d.done) || f.week[6].key !== dayKey(D(10))) bad(`1: empty flame is ${json(f)}`);
    if (!near(out.harmony, 0.3, 1e-9)) bad(`1: empty harmony is ${out.harmony}, want 0.3`);
    if (out.welcome !== null || out.last !== null || out.awayDays !== 0) bad('1: no welcome and no last run for a new learner');
  }

  /* 2. What a run earns, and the level the stars reach */
  {
    const { GLOW, questionsOf, payVisits, glowWhy } = G;
    const pay = (...vs) => payVisits(vs.map(([at, qs]) => ({ at, qs }))).map((v) => v.glow);
    const q = (key, tried = true, right = false) => ({ key, tried, right });
    /* a question pays for being answered, +1 right, +2 for the whole set; time and skips pay nothing */
    const [g1] = pay([D(5), [q('a', true, true), q('b', true, false), q('c', true, true), q('d', true, true)]]);
    if (json(g1) !== json({ tried: 4, right: 3, set: GLOW.SET, total: 9 })) bad(`2: 4 answered, 3 right, set finished is 9: ${json(g1)}`);
    const [g2] = pay([D(5), [q('a', true, true), q('b', false), q('c', true, false)]]);
    if (g2.total !== 3 || g2.set !== 0) bad(`2: a skipped question pays nothing and the set is not whole: ${json(g2)}`);
    const [g3, g4] = pay([D(5, 9), [q('a', true, true), q('b', true, false)]], [D(5, 11), [q('a', true, true), q('b', true, false)]]);
    if (g3.total !== 2 + 1 + 2 || g4.total !== 0 || g4.set !== 0) bad(`2: the same questions the same day pay once: ${json([g3, g4])}`);
    const [, g5] = pay([D(5, 9), [q('a', true, false)]], [D(5, 11), [q('a', true, true)]]);
    if (g5.tried !== 0 || g5.right !== 1) bad(`2: getting it right later the same day pays the right once: ${json(g5)}`);
    const [, g6] = pay([D(5), [q('a', true, true)]], [D(6), [q('a', true, true)]]);
    if (g6.total !== 1 + 1 + 2) bad(`2: the next day the same question is review and pays again: ${json(g6)}`);
    if (pay([D(5), []])[0].total !== 0) bad('2: an empty set pays nothing');
    /* the records: an answer list by key, a blind tap is not an answer, a score counts, a garden visit is one question per family */
    const aq = questionsOf({ id: 's', answers: [{ item_id: 'x1', is_correct: true, time_ms: 4000 }, { item_id: 'x2', is_correct: false, time_ms: 90000 }, { item_id: 'x3', is_correct: true, time_ms: 120 }, { item_id: 'x4' }] });
    if (json(aq.map((x) => [x.key, x.tried, x.right])) !== json([['x1', true, true], ['x2', true, false], ['x3', false, false], ['x4', false, false]])) bad(`2: answers pay by key, not by time (a very slow answer pays the same, a blind tap pays nothing): ${json(aq)}`);
    if (questionsOf({ id: 'p', score: { correct: 3, total: 4 } }).filter((x) => x.right).length !== 3 || questionsOf({ id: 'p', score: { correct: 3, total: 400 } }).length !== 60) bad('2: a score counts its questions, capped at 60');
    if (questionsOf({ id: 'g1', family_id: 'f', session_type: 'grow' })[0].key !== 'f:grow') bad('2: a garden visit is one question per family and kind');
    for (const junk of [undefined, null, 7, { answers: 'x' }]) if (!Array.isArray(questionsOf(junk))) bad(`2: questionsOf(${json(junk)}) must be a list`);
    if (glowWhy(g1) !== '4 answered, 3 right, set finished' || glowWhy({ total: 0 }) !== '') bad(`2: glowWhy: ${glowWhy(g1)}`);
    if (E.LEVELS.join() !== '0,15,36,63,99,144,198,264,342,435') bad(`2: LEVELS are ${E.LEVELS.join()}`);
    for (const [s, want] of [[0, 1], [14, 1], [15, 2], [35, 2], [36, 3], [434, 9], [435, 10], [542, 10], [543, 11], [651, 12]]) {
      if (E.levelOf(s).level !== want) bad(`2: ${s} Glow is level ${E.levelOf(s).level}, want ${want}`);
    }
    const l14 = E.levelOf(14);
    if (l14.from !== 0 || l14.to !== 15 || l14.into !== 14 || l14.need !== 1 || !near(l14.pct, 14 / 15, 1e-9)) bad(`2: levelOf(14) is ${json(l14)}`);
    const l542 = E.levelOf(542), l543 = E.levelOf(543);
    if (l542.from !== 435 || l542.to !== 543 || l542.need !== 1 || l543.from !== 543 || l543.to !== 651 || l543.into !== 0) bad(`2: past the last level every level costs 108: ${json([l542, l543])}`);
    for (const junk of [-5, 'x', null, undefined, NaN]) if (E.levelOf(junk).level !== 1 || E.levelOf(junk).into !== 0) bad(`2: levelOf(${String(junk)}) must read as no Glow`);
  }

  /* 3. A passage and a word round are visits to Chai and Matcha; every module reaches its friend */
  {
    const t0 = D(5);
    const r = recs(run('matcha', t0, { stars: 2 }), run('chai', t0 + HOUR));
    const v = E.visitsFrom(r, content);
    if (v.map((x) => `${x.pet}:${x.stars}:${x.flawless}`).join() !== 'matcha:2:false,chai:3:false') bad(`3: a 2-star round, then a 3/4 passage in time: ${json(v)}`);
    const out = derive(r, t0 + 2 * HOUR);
    const chai = pet(out, 'chai'), matcha = pet(out, 'matcha');
    if (chai.isNew || matcha.isNew || chai.visits !== 1 || matcha.visits !== 1) bad('3: Chai and Matcha are met, one visit each');
    if (chai.earned !== 9 || matcha.earned !== 9) bad(`3: a 3-of-4 set is 4 answered + 3 right + 2 for the set = 9 Glow, in time or not: Chai ${chai.earned}, Matcha ${matcha.earned}`);
    if (json(out.sources) !== json({ practice: 18, milestones: 6, gifts: 0, fire: 1 }) || out.glow !== 25 || out.level.level !== 2 || made(out) !== 'lanterns' || out.nextDecor?.id !== 'bunting') bad(`3: 18 for the sets, 6 for Toffee's first stage, 1 for the fire is level 2 and the lanterns: ${json({ sources: out.sources, glow: out.glow, level: out.level.level, made: made(out) })}`);
    if (json(out.last) !== json({ pet: 'chai', at: t0 + HOUR, stars: 3, flawless: false, earned: 9, glow: { tried: 4, right: 3, set: 2, total: 9 } })) bad(`3: the last run is the passage: ${json(out.last)}`);
    const fl = derive(recs(run('chai', t0, { flawless: true })), t0 + HOUR);
    if (pet(fl, 'chai').earned !== 10 || !fl.last.flawless) bad(`3: 4 of 4 is 4 + 4 + 2 = 10, got ${pet(fl, 'chai').earned}`);
    if (pet(derive(recs(run('chai', t0, { stars: 2 })), t0 + HOUR), 'chai').earned !== 9) bad('3: a slow 3/4 passage earns the same as a quick one: time never counts');
    if (pet(derive(recs(run('chai', t0, { stars: 0 })), t0 + HOUR), 'chai').earned !== 7) bad('3: 1 of 4 right still earns 4 + 1 + 2: the effort counts');
    const at = iso(t0);
    const mods = {
      sessions: [
        { id: 'm1', module: 'rc2', finished_at: at, score: { correct: 3, total: 4 } },                                       // 75% → 2
        { id: 'm2', module: 'wd', finished_at: at, score: { correct: 1, total: 1 } },                                        // 1 + correct → 2
        { id: 'm3', module: 'sp', finished_at: at, target_sec: 120, duration_ms: 100e3, score: { correct: 2, total: 2 } },  // clean, in time → 3, flawless
        { id: 'm4', module: 'pc', finished_at: at, target_sec: 120, duration_ms: 300e3, score: { correct: 2, total: 2 } },  // clean, slow → 2
        { id: 'm5', module: 'cr', finished_at: at, target_sec: 120, duration_ms: 100e3, score: { correct: 1, total: 2 } },  // half → 1
        { id: 'm6', module: 'wb', finished_at: at, target_sec: 120, duration_ms: 100e3, score: { correct: 0, total: 2 } },  // none → 0
      ],
      learning: [
        { id: 'm7', kind: 'garden-session', finished_at: at, clean: true },
        { id: 'm8', kind: 'garden-session', finished_at: at },
        { id: 'm9', kind: 'gauntlet-run', finished_at: at, stars: 2, flawless: false },
      ],
    };
    const got = E.visitsFrom(mods, content).map((x) => `${x.id}:${x.pet}:${x.stars}${x.flawless ? '+' : ''}`).join();
    if (got !== 'm1:chai:2,m2:matcha:2,m3:ginger:3+,m4:mochi:2,m5:chai:1,m6:matcha:0,m7:matcha:2,m8:matcha:1,m9:toffee:2') bad(`3: every module's run is a visit to its friend: ${got}`);
  }

  /* 4. The day's first run is a visit to Toffee too */
  {
    const t0 = D(5);
    const one = derive(recs(run('chai', t0)), t0 + HOUR);
    const tf = pet(one, 'toffee');
    if (tf.isNew || tf.visits !== 0 || tf.earned !== 0 || tf.lastAt !== t0) bad(`4: the day's first run visits Toffee and earns no Glow of its own: ${json(tf)}`);
    if (tf.stage !== 1 || tf.unit !== 'days' || tf.done !== 1 || tf.total !== E.TOFFEE_DAYS) bad(`4: Toffee grows by the days you come: ${json({ stage: tf.stage, done: tf.done, unit: tf.unit })}`);
    if (!near(tf.mood, pet(one, 'chai').mood, 1e-12)) bad('4: the daily visit warms Toffee like the run it came with');
    if (one.sources.practice !== 9) bad(`4: the daily visit adds no practice Glow (${one.sources.practice})`);
    if (pet(derive(recs(run('chai', t0), run('mochi', t0 + HOUR)), t0 + 2 * HOUR), 'toffee').lastAt !== t0) bad('4: only the first run of a day visits Toffee');
    const two = pet(derive(recs(run('chai', D(5)), run('chai', D(6))), D(6, 12)), 'toffee');
    const want = E.stageOf(2, E.TOFFEE_DAYS);
    if (two.done !== 2 || two.stage !== want.stage || two.toNext !== want.toNext) bad(`4: two days are two days of Toffee's growth: ${json({ done: two.done, stage: two.stage, toNext: two.toNext })}`);
    const own = pet(derive(recs(run('toffee', t0), run('chai', t0 + HOUR)), t0 + 2 * HOUR), 'toffee');
    if (own.visits !== 1 || own.earned !== 9 || own.done !== 1) bad(`4: a Gauntlet first thing is Toffee's own visit, not two: ${json({ visits: own.visits, earned: own.earned, done: own.done })}`);
  }

  /* 5. Mood fades with a 36-hour half-life */
  {
    const t0 = D(5);
    const r = recs(run('chai', t0));
    const visits = E.visitsFrom(r, content);
    const m = (h) => E.moodAt(visits, 'chai', t0 + h * HOUR);
    if (!near(m(0), moodFormula(1), 1e-9)) bad(`5: a 3-star visit is care 1.0: mood ${m(0)}`);
    if (!near(m(36), moodFormula(0.5), 1e-9)) bad(`5: care halves in 36 hours: mood ${m(36)}`);
    if (!near(m(1), 0.69, 0.02) || !near(m(48), 0.38, 0.03) || !(m(96) < 0.2)) bad(`5: moods at +1 h, +48 h, +96 h are ${[m(1), m(48), m(96)].map((x) => x?.toFixed(3))}`);
    if (E.moodAt(visits, 'matcha', t0 + HOUR) !== null) bad('5: a pet with no visits has no mood (null)');
    const words = [1, 48, 96, 400].map((h) => pet(derive(r, t0 + h * HOUR), 'chai').word).join();
    if (words !== 'happy,missing,sleepy,wilting') bad(`5: words over time are ${words}`);
    if (pet(derive(recs(run('chai', t0), run('chai', t0 + HOUR)), t0 + 2 * HOUR), 'chai').word !== 'glowing') bad('5: two good visits in a row glow');
    for (const [x, w] of [[0.75, 'glowing'], [0.7499, 'happy'], [0.5, 'happy'], [0.4999, 'missing'], [0.3, 'missing'], [0.2999, 'sleepy'], [0.12, 'sleepy'], [0.1199, 'wilting'], [0, 'wilting']]) {
      if (E.moodWord(x) !== w) bad(`5: moodWord(${x}) is ${E.moodWord(x)}, want ${w}`);
    }
    if (E.moodWord(0.9, true) !== 'new') bad('5: a pet not met yet is new, whatever its mood');
    if (!near(pet(derive(recs(), D(5)), 'chai').mood, 0.3, 1e-12)) bad('5: a new pet waits at 0.3');
  }

  /* 6. Harmony = 0.5 × mean + 0.5 × min, a new friend counted at 0.3 */
  {
    const t0 = D(5);
    const out = derive(recs(run('chai', t0)), t0 + HOUR);
    const m = pet(out, 'chai').mood;
    const want = 0.5 * ((0.3 * 4 + 2 * m) / 6) + 0.5 * Math.min(0.3, m); // Toffee shares the day's first run
    if (!near(out.harmony, want, 1e-9)) bad(`6: harmony ${out.harmony}, want ${want}`);
    const all = derive(recs(ORDER.map((id) => run(id, t0))), t0 + HOUR);
    const moods = all.pets.map((p) => p.mood);
    if (!near(all.harmony, 0.5 * (moods.reduce((a, b) => a + b, 0) / 6) + 0.5 * Math.min(...moods), 1e-9)) bad('6: harmony with every pet met');
    if (out.neediest !== 'matcha') bad(`6: ties go to the gentlest door first, Chai then Matcha (neediest ${out.neediest})`);
  }

  /* 7. Ten stages: stage 1 is the first one done, stage 10 is every one, each second stage a chapter */
  {
    const S = E.stageOf;
    for (const T of [1, 2, 3, 7, 52, 128, 580, 5000]) {
      let prev = 0;
      for (let d = 0; d <= T; d += Math.max(1, Math.floor(T / 400))) {
        const g = S(d, T);
        if (g.stage < prev || (g.stage < 10 && (g.toNext < 1 || g.toNext !== g.nextAt - d))) { bad(`7: stageOf(${d}, ${T}) is ${json(g)} after stage ${prev}`); break; }
        prev = g.stage;
      }
      if (S(1, T).stage < 1 || S(T, T).stage !== 10 || S(T, T).toNext !== 0 || (T > 1 && S(T - 1, T).stage === 10)) bad(`7: of ${T}, the first one done is stage 1 and only all ${T} is stage 10`);
    }
    if (new Set(Array.from({ length: 129 }, (_, d) => S(d, 128).stage)).size !== 11) bad('7: a real subject passes through all eleven stages, 0 to 10');
    if (S(-5, 10).stage !== 0 || S(NaN, 10).stage !== 0 || S(5, 0).stage !== 0 || S(50, 10).stage !== 10) bad('7: stageOf clamps what it is given');
    const ginger = (solved, spSolved = 0) => pet(derive(recs(), D(2), { loom: { solved, total: 76 }, banks: { sp: { solved: spSolved, total: 52 } } }), 'ginger');
    const mid = ginger(30, 2), want = S(32, 128);
    if (mid.stage !== want.stage || mid.done !== 32 || mid.total !== 128 || mid.unit !== 'questions' || mid.toNext !== want.toNext || mid.hearts !== Math.floor(want.stage / 2)) bad(`7: Ginger grows with jumbles and placements solved: ${json(mid)}`);
    const one = ginger(1);
    if (one.stage !== 1 || one.hearts !== 0 || one.story !== null || one.request !== REQUESTS.ginger[0]) bad(`7: the first jumble solved is stage 1, before any chapter: ${json({ stage: one.stage, story: one.story })}`);
    let d2 = 0; while (S(d2, 128).stage < 2) d2 += 1;
    const two = ginger(d2);
    if (two.stage !== 2 || two.hearts !== 1 || two.story !== STORIES.ginger[0] || two.request !== REQUESTS.ginger[1]) bad('7: stage 2 tells the first story and asks the second request');
    const full = ginger(76, 52);
    if (full.stage !== 10 || full.hearts !== 5 || full.toNext !== 0 || full.story !== STORIES.ginger[4] || full.request !== BEST_FRIEND_ASK.ginger) bad('7: every question done is stage 10: the last story, and best friends');
    const st = { reading: { qSolved: 4, qTotal: 500 }, banks: { cr: { solved: 0, total: 30 }, pc: { solved: 1, total: 40 }, sp: { solved: 0, total: 52 }, wb: { solved: 0, total: 100 } }, meadow: { known: 12, total: 3000 }, table: { solved: 0, total: 70 }, bench: { solved: 3, total: 60 } };
    const all = derive(recs(), D(2), st);
    const wants = { chai: S(4, 530).stage, matcha: S(12, 3100).stage, mochi: S(1, 110).stage, ginger: 0, mallow: S(3, 60).stage, toffee: 0 };
    for (const [id, s] of Object.entries(wants)) if (pet(all, id).stage !== s) bad(`7: ${id} reads its own subject: stage ${pet(all, id).stage}, want ${s}`);
    if (all.sources.milestones !== all.pets.reduce((n, p) => n + p.stage, 0) * G.GLOW.STAGE || all.sources.milestones <= 0) bad(`7: each stage grown is ${G.GLOW.STAGE} Glow: ${json(all.sources)}`);
  }

  /* 8. Today's three friends, and the day's gift */
  {
    const d5 = [run('chai', D(5, 9)), run('matcha', D(5, 10)), run('mochi', D(5, 11))];
    const two = derive(recs(d5.slice(0, 2)), D(5, 20));
    if (two.today.picks.join() !== 'chai,matcha,mochi' || two.today.done.join() !== 'true,true,false' || two.today.doneCount !== 2 || two.today.gift || two.gifts !== 0) bad(`8: two of three is no gift: ${json(two.today)}`);
    if (two.play !== 'mochi') bad(`8: play is the first pick not yet helped (${two.play})`);
    const all = derive(recs(d5), D(5, 20));
    if (!all.today.gift || all.today.doneCount !== 3 || all.gifts !== 1) bad(`8: all three is the day's gift: ${json(all.today)}`);
    if (E.DAILY_GIFT !== 10 || all.sources.gifts !== 10 || all.glow !== 27 + 6 + 1 + E.DAILY_GIFT) bad(`8: three sets (27), Toffee's stage (6), the fire (1) and the gift (10) are 44 Glow: ${json(all.sources)}`);
    if (pet(all, 'chai').earned !== 9) bad('8: the gift is the village\'s, not one friend\'s');
    if (all.play !== all.neediest) bad('8: with the three helped, play is whoever needs you most');
    /* The next morning, picked at midnight: new friends first, then whoever was helped longest ago. */
    const next = derive(recs(d5), D(6, 8));
    if (next.today.picks.join() !== 'ginger,mallow,chai' || next.play !== 'ginger') bad(`8: the next day's three are ${next.today.picks}, play ${next.play}`);
    if (next.gifts !== 1 || next.glow !== 44 || next.today.gift || next.today.doneCount !== 0) bad('8: yesterday\'s gift still counts; today starts fresh');
    const helped = derive(recs(d5, run('ginger', D(6, 9))), D(6, 12));
    if (helped.today.picks.join() !== 'ginger,mallow,chai' || helped.today.done.join() !== 'true,false,false' || helped.play !== 'mallow') bad(`8: a visit today does not move today's picks: ${json(helped.today)}`);
    if (!pet(helped, 'ginger').pick || !pet(helped, 'ginger').helpedToday || pet(helped, 'mallow').helpedToday || pet(helped, 'mochi').pick) bad('8: pick and helpedToday are flagged on each pet');
    const d6 = [run('ginger', D(6, 9)), run('mallow', D(6, 10)), run('chai', D(6, 11))];
    const both = derive(recs(d5, d6), D(7, 12));
    if (both.gifts !== 2 || both.glow !== 54 + 6 * E.stageOf(2, E.TOFFEE_DAYS).stage + 3 + 2 * E.DAILY_GIFT) bad(`8: two complete days are two gifts: ${both.gifts} gifts, ${json(both.sources)}`);
    /* answers faster than a person can read pay nothing, so they help nobody for the gift */
    const blind = { S: { id: 'blind', module: 'ps', item_ids: ['b1', 'b2'], finished_at: iso(D(5, 11)), duration_ms: 3000, score: { correct: 2, total: 2 }, answers: [{ item_id: 'b1', is_correct: true, time_ms: 150 }, { item_id: 'b2', is_correct: true, time_ms: 200 }] } };
    const tapped = derive(recs(d5.slice(0, 2), blind), D(5, 20));
    if (tapped.today.doneCount !== 2 || tapped.today.gift || pet(tapped, 'mochi').earned !== 0 || tapped.sources.practice !== 18) bad(`8: blind taps earn nothing and do not help a friend: ${json({ today: tapped.today, sources: tapped.sources })}`);
    if (!E.changeBetween(derive(recs(d5.slice(0, 2)), D(5, 20)), tapped).repeat) bad('8: a run that earned nothing says so (repeat)');
    const gauntlet = derive(recs(run('toffee', D(5))), D(5, 12));
    if (gauntlet.today.picks.includes('toffee') || gauntlet.today.doneCount !== 0) bad('8: Toffee is never one of the three, and a Gauntlet helps none of them');
  }

  /* 9. Toffee's flame, and the spare log every seventh day */
  {
    const days = (list) => recs(list.map((d) => run('matcha', D(d))));
    const f9out = derive(days([1, 2, 3, 4, 5, 6, 7, 9]), D(9, 20));
    const f9 = f9out.flame;
    if (f9.days !== 9 || f9.kindling !== 0 || !f9.today || f9.tier !== 'tall') bad(`9: D1..D7 + D9 seen on D9 is 9 days, the spare log spent: ${json(f9)}`);
    if (pet(f9out, 'toffee').request !== REQUESTS.toffee[4]) bad('9: Toffee\'s request follows the fire, not her hearts');
    const f8 = derive(days([1, 2, 3, 4, 5, 6, 7]), D(8, 9)).flame;
    if (f8.days !== 7 || f8.kindling !== 1 || f8.today || !f8.alive) bad(`9: seven days earn a spare log, alive the next morning: ${json(f8)}`);
    if (f8.week.map((d) => (d.done ? 1 : 0)).join('') !== '1111110' || f8.week[6].key !== dayKey(D(8))) bad(`9: the week ends today: ${json(f8.week)}`);
    const fb = derive(days([1, 2, 3, 4, 5, 6, 7]), D(9, 9)).flame;
    if (fb.days !== 8 || fb.kindling !== 0 || !fb.alive) bad(`9: counting back bridges one missing day with the spare log: ${json(fb)}`);
    const gap = derive(days([1, 2, 3, 4, 5, 6, 7, 10]), D(10, 20)).flame;
    if (gap.days !== 1 || gap.tier !== 'small') bad(`9: a two-day gap starts the fire again: ${json(gap)}`);
    const nok = derive(days([1, 2, 4]), D(4, 20)).flame;
    if (nok.days !== 1) bad(`9: no spare log, no bridge: ${json(nok)}`);
    const three = derive(days([2, 3, 4]), D(4, 20));
    if (three.flame.days !== 3 || three.flame.tier !== 'steady' || pet(three, 'toffee').request !== REQUESTS.toffee[2]) bad(`9: three days is a steady fire: ${json(three.flame)}`);
    const cold = derive(days([1, 2, 3]), D(6, 12)).flame;
    if (cold.days !== 0 || cold.alive || cold.tier !== 'embers') bad(`9: two days missed with no spare log puts the fire out: ${json(cold)}`);
    const cap = derive(days(Array.from({ length: 28 }, (_, i) => i + 1)), D(28, 20)).flame;
    if (cap.kindling !== 2 || cap.days !== 28 || cap.tier !== 'bonfire') bad(`9: spare logs are capped at 2: ${json(cap)}`);
    if (derive(days([1, 2, 3, 4, 5, 6, 7]), D(8, 9)).sources.fire !== 1 + 2 + 3 + 4 + 5 + 5 + 5) bad('9: each day that earned adds its place in the run to the Glow, up to 5');
    const tiers = [0, 1, 2, 3, 6, 7, 13, 14].map((n) => E.flameTier(n)).join();
    if (tiers !== 'embers,small,small,steady,steady,tall,tall,bonfire') bad(`9: flame tiers ${tiers}`);
  }

  /* 10. Each village level puts something on the map */
  {
    if (E.DECOR.map((d) => d.id).join() !== DECOR_IDS || E.DECOR.map((d) => d.level).join() !== '2,3,4,5,6,7,8,9,10') bad('10: nine decorations, levels 2 to 10, in order');
    if (!E.DECOR.every((d) => d.name && d.appears)) bad('10: every decoration has a name and says how it appears');
    const at10 = derive(recs({ L: { id: 'g1', kind: 'garden-session', finished_at: iso(D(5)) } }), D(5, 12));
    if (at10.glow !== 3 + 6 + 1 || made(at10) !== '' || at10.nextDecor?.id !== 'lanterns') bad(`10: ten Glow make nothing yet: ${at10.glow} ${made(at10)}`);
    const at14 = derive(recs(run('chai', D(5, 9)), run('matcha', D(5, 10)), run('mochi', D(5, 11))), D(5, 20));
    if (at14.level.level !== 3 || made(at14) !== 'lanterns,bunting' || at14.nextDecor?.id !== 'flowers') bad(`10: forty-four Glow (level 3) make the lanterns and the bunting: ${made(at14)}`);
    const lots = derive(recs(Array.from({ length: 45 }, (_, i) => run('chai', D(5) + i * 60e3, { flawless: true }))), D(6));
    if (lots.glow !== 450 + 6 + 1 || lots.level.level !== 10 || made(lots) !== DECOR_IDS || lots.nextDecor !== null) bad(`10: level 10 makes everything: ${json({ glow: lots.glow, level: lots.level.level, next: lots.nextDecor })}`);
  }

  /* 11. After a day or more away, the friend who missed you most says hello */
  {
    const base = [run('mallow', D(1)), ...['chai', 'matcha', 'mochi', 'ginger', 'toffee'].map((id) => run(id, D(3)))];
    const away = derive(recs(base), D(6));
    if (away.welcome?.pet !== 'mallow' || away.welcome.days !== 3 || away.awayDays !== 3) bad(`11: three days away, Mallow (left longest) says hello: ${json(away.welcome)}`);
    if (derive(recs(base), D(3, 20)).welcome !== null) bad('11: no welcome when you were here today');
    if (derive(recs(base), D(4, 9)).welcome !== null) bad('11: under a day away is no welcome');
    const given = derive(recs(base), D(3, 20), { awayDays: 2 });
    if (given.welcome?.pet !== 'mallow' || given.welcome.days !== 2) bad(`11: the world state's awayDays wins when it has one: ${json(given.welcome)}`);
    if (derive(recs(), D(6), { awayDays: 4 }).welcome !== null) bad('11: nobody met yet, so nobody to say hello');
  }

  /* 12. What one run changed */
  {
    const t = D(5, 20);
    const c1 = [run('chai', D(5, 9))], c2 = [...c1, run('matcha', D(5, 10), { stars: 2 })], c3 = [...c2, run('mochi', D(5, 11))], c4 = [...c3, run('mochi', D(5, 12), { stars: 1 })];
    const [s0, s1, s2, s3, s4] = [[], c1, c2, c3, c4].map((c) => derive(recs(c), t));
    const first = E.changeBetween(s0, s1);
    if (first.pet !== 'chai' || first.earned !== 9 || json(first.why) !== json({ tried: 4, right: 3, set: 2, total: 9 }) || first.repeat || first.grew || !first.levelUp || first.decor?.id !== 'lanterns' || first.gift || first.doneCount !== 1) bad(`12: a first passage is 9 Glow, and with Toffee's first day it is level 2: ${json(first)}`);
    const grew = E.changeBetween(derive(recs(), t, { reading: { qSolved: 0, qTotal: 100 } }), derive(recs(c1), t, { reading: { qSolved: 3, qTotal: 100 } }));
    if (!grew.grew || grew.milestone !== grew.stage * G.GLOW.STAGE || grew.stage !== E.stageOf(3, 100).stage || grew.chapter !== Math.floor(grew.stage / 2) > 0) bad(`12: questions answered right grow the friend: ${json(grew)}`);
    const second = E.changeBetween(s1, s2);
    if (second.pet !== 'matcha' || second.earned !== 9 || second.levelUp || second.level.level !== 2 || second.decor !== null || second.gift || second.doneCount !== 2) bad(`12: a second round earns its own 9 and stays at level 2: ${json(second)}`);
    const third = E.changeBetween(s2, s3);
    if (third.pet !== 'mochi' || third.earned !== 9 || !third.gift || third.doneCount !== 3 || !third.levelUp || third.decor?.id !== 'bunting') bad(`12: the run that helps all three earns its own 9; the gift is said apart: ${json(third)}`);
    if (s3.glow - s2.glow !== 9 + E.DAILY_GIFT) bad('12: the gift is still in the total');
    const again = E.changeBetween(s3, s4);
    if (again.pet !== 'mochi' || again.earned !== 8 || again.grew || again.levelUp || again.decor !== null || again.gift) bad(`12: a quiet run changes only its Glow: ${json(again)}`);
    const none = E.changeBetween(undefined, undefined);
    if (none.pet !== null || none.earned !== 0 || none.grew || none.levelUp || none.gift || none.level.level !== 1) bad(`12: nothing before and after is no change: ${json(none)}`);
  }

  /* 13. Hostile rows are skipped without throwing */
  {
    const at = iso(D(5));
    const hostile = {
      sessions: [
        null, 7, 'x',
        { id: 'h1', passage_id: 'rc-1', score: { correct: 3, total: 4 } },                   // no finished_at
        { id: 'h2', module: 'zzz', finished_at: at, score: { correct: 1, total: 1 } },       // unknown module
        { id: 'h3', module: 'pj', finished_at: at, score: null, answers: null },             // null answers: a real visit
        { id: 'h4', module: 'ooo', finished_at: at, score: { correct: 'three', total: null }, answers: 'nope' },
        { id: 'h5', passage_id: 'nope', finished_at: at, score: { correct: 1, total: 1 } },  // unknown passage
        { id: 'h6', module: 'wd', finished_at: 'not a date', score: { correct: 2 } },
        { id: 'h7', module: 'rc2', finished_at: at, score: { correct: 9, total: 2 } },       // impossible: still at most 2
      ],
      learning: [
        { id: 'l1', kind: 'lex-round', stars: 'x', finished_at: at },
        { id: 'l2', kind: 'gauntlet-run', finished_at: at },                                 // no stars
        { id: 'l3', kind: 'garden-session', clean: 'maybe' },                                 // no date
        { id: 'l4', kind: 'lex-round', stars: Infinity, finished_at: at },
        { id: 'l5', kind: 'lex-round', stars: 99, finished_at: at },                          // clamped to 3
        { id: 'l6', kind: 'lex-round', stars: -2, finished_at: at },                          // clamped to 0
        { id: 'l7', kind: 'village-treasure', treasure: 123, at: 'soon' },                    // the retired treasures
        { id: 'l8', kind: 'village-treasure' },
        { id: 'l9', kind: 'village-build', building: 'reading', level: 3 },
        null,
      ],
    };
    try {
      const v = E.visitsFrom(hostile, content).map((x) => `${x.id}:${x.stars}`).join();
      if (v !== 'h3:0,h4:0,h7:2,l5:3,l6:0') bad(`13: only real runs become visits, their stars clamped: ${v}`);
      const out = derive(hostile, D(6));
      const paid = E.visitsFrom(hostile, content).reduce((n, x) => n + x.glow.total, 0);
      if (!Number.isInteger(out.glow) || out.sources.practice !== paid || out.glow !== out.sources.practice + out.sources.milestones + out.sources.gifts + out.sources.fire) bad(`13: the real runs still add up to whole Glow: ${json(out.sources)} paid ${paid}`);
      if (!Number.isFinite(out.harmony) || !out.pets.every((p) => p.mood >= 0 && p.mood <= 1 && Number.isInteger(p.hearts) && Number.isFinite(p.earned))) bad('13: hostile rows leave finite moods, hearts and Glow');
      const real = recs(run('chai', D(5)), run('matcha', D(5, 11)));
      const old = { sessions: real.sessions, learning: [...real.learning, ...hostile.learning.slice(6, 9), { id: 't1', kind: 'village-treasure', treasure: 'lanterns', at }] };
      if (json(derive(old, D(6))) !== json(derive(real, D(6)))) bad('13: village-treasure and village-build records change nothing');
      if (derive(recs(run('chai', D(7))), D(6)).pets.some((p) => !p.isNew)) bad('13: a run after now is not counted yet');
      E.derivePets(undefined, undefined, undefined, D(6));
      E.derivePets(null, { sessions: 'x', learning: {} }, { rc: null }, D(6));
      E.visitsFrom(undefined, undefined);
      E.changeBetween(null, out);
    } catch (err) {
      bad(`13: hostile records threw: ${err.stack?.split('\n').slice(0, 3).join(' | ')}`);
    }
  }

  /* 14. Performance: ~1000 runs over a year stays fast */
  {
    const big = [];
    for (let i = 0; i < 1000; i += 1) big.push(run(ORDER[i % 6], new Date(2025, 9, 1).getTime() + i * 8.7 * HOUR, { stars: i % 4 }));
    const r = recs(big);
    const t = performance.now();
    for (let i = 0; i < 5; i += 1) derive(r, D(20));
    const ms = (performance.now() - t) / 5;
    if (ms > 120) bad(`14: derivePets over 1000 runs took ${ms.toFixed(1)} ms`);
  }

  return { problems };
}

/** nextFor gives every pet a real next activity against the real registry, and noticeFor a sentence. */
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
      let n, c, say;
      try { n = N.nextFor(id, world, { first }); c = N.cornersOf(id, world); say = N.noticeFor(id, world, n); } catch (err) { bad(`next: ${id} threw for ${label}: ${err.message}`); continue; }
      if (!n?.href?.startsWith('#/') || !n.label || !n.sub || !Number.isFinite(n.minutes)) bad(`next: ${id} for ${label} → ${json(n)}`);
      if (!c?.length || !c.every((x) => x.href?.startsWith('#/') && x.label)) bad(`next: ${id} corners for ${label} → ${json(c)}`);
      if (typeof say !== 'string') bad(`notice: ${id} for ${label} → ${json(say)}`);
    }
    const chai = N.nextFor('chai', world, { first });
    if (first && !chai.href.startsWith('#/rc/session/')) bad(`next: a new learner's first activity with Chai is a passage, got ${chai.href}`);
    // A set from the village is three things (owner: "1 RC or 3 odd man out"): three distinct items of the friend's own kind.
    if (first) {
      for (const [id, mod] of [['ginger', 'pj'], ['mochi', 'ps'], ['mallow', 'ooo']]) {
        const href = N.nextFor(id, world, { first })?.href ?? '';
        const m = href.match(new RegExp(`^#/${mod}/session/(${mod}-\\d{4}(?:,${mod}-\\d{4}){2})$`));
        if (!m || new Set(m[1].split(',')).size !== 3) bad(`next: a new learner's set with ${id} should be three ${mod} items, got ${href}`);
      }
    }
    if (N.nextFor('toffee', world).href !== '#/world/place/wilds') bad('next: Toffee runs the Gauntlet');
    if (N.cornersOf('matcha', world).length !== 5) bad('next: Matcha has five corners');
  }
  if (N.nextFor('nobody', { content, records: { sessions: [], learning: [] }, state: {} }) !== null) bad('next: an unknown pet has no next activity');
  for (const id of ORDER) {
    for (const w of [undefined, {}, { records: { sessions: 'x' }, state: { pets: null } }]) {
      try { if (typeof N.noticeFor(id, w, null) !== 'string') bad(`notice: ${id} on a broken world is not a string`); } catch (err) { bad(`notice: ${id} threw on a broken world: ${err.message}`); }
    }
  }
  return { problems };
}

if (process.argv[1]?.endsWith('check-pet-economy.mjs')) {
  const a = await checkPetEconomy();
  const b = await checkNextFor();
  const problems = [...a.problems, ...b.problems];
  if (!problems.length) { console.log('✓ pets economy: a new learner, Glow per question + levels, visits from every module, Toffee\'s daily visit, mood decay, harmony, ten growth stages, today\'s three + the gift, flame + kindling, decor, welcome, changeBetween, hostile rows; nextFor + noticeFor for every pet against the real registry'); process.exit(0); }
  console.log(`✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
