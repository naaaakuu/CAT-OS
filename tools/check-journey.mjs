/** Village Journal economics: real saved runs, retries, calendar edges and permanence. */
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { derivePets } from '../src/pets/economy.js';
import { deriveJourney, newKeepsakes } from '../src/pets/journey.js';
import { petChangeLine } from '../src/world/state.js';

const instant = (day, hour = 12, month = 10) => new Date(2026, month, day, hour).getTime();
const content = { rc: [{ id: 'rc-one', estimated_time_min: 6 }] };
const records = (runs = []) => ({ sessions: runs.filter((r) => !r.kind), learning: runs.filter((r) => r.kind) });
let serial = 0;
function visit(pet, at, amount = 4, { skipped = false, fast = false, keys = null } = {}) {
  const id = `journal-${++serial}`;
  const base = {
    id, finished_at: new Date(at).toISOString(), duration_ms: 60000,
    score: { total: amount, correct: skipped ? 0 : amount, accuracy: skipped ? 0 : 1 },
    answers: Array.from({ length: amount }, (_, i) => ({
      item_id: keys ? `${keys}-${i}` : `${id}-${i}`, time_ms: fast ? 100 : 4000,
      ...(skipped ? {} : { is_correct: true }),
    })),
  };
  if (pet === 'chai') return { ...base, passage_id: 'rc-one' };
  if (pet === 'matcha') return { ...base, kind: 'lex-round', stars: 3 };
  if (pet === 'toffee') return { ...base, kind: 'gauntlet-run', stars: 3 };
  return { ...base, module: { mochi: 'ps', ginger: 'pj', mallow: 'ooo', sesame: 'pc', biscuit: 'sp' }[pet] };
}
function derive(runs, now = instant(6), state = {}) {
  const rec = records(runs);
  const P = derivePets(state, rec, content, now);
  return deriveJourney(P, { records: rec, content }, now);
}
const owned = (J) => J.keepsakes.filter((k) => k.earned).map((k) => k.id);

export async function checkJourney() {
  const problems = [];
  const check = (name, test) => { try { test(); } catch (err) { problems.push(`${name}: ${err.message}`); } };

  check('A new village has clear reachable goals and no free rewards', () => {
    const J = derive([]);
    assert.equal(J.totalCount, 32);
    assert.equal(J.earnedCount, 0);
    assert.equal(new Set(J.keepsakes.map((k) => k.id)).size, 32);
    assert.equal(J.current.number, 1);
    assert.equal(J.focusPet, 'chai');
    assert.equal(J.weekly.doneCount, 0);
    assert.ok(J.chapters.every((c) => c.goals.every((g) => g.have === 0)));
  });

  check('A real first round advances the story, but opening the app never does', () => {
    const first = visit('chai', instant(3));
    const J = derive([first]);
    assert.deepEqual(owned(J), ['chapter-spark']);
    assert.equal(J.current.number, 2);
    assert.equal(J.focusPet, 'matcha');
    assert.deepEqual(owned(derive([first], instant(25))), owned(J));
    assert.equal(derive([first], instant(25)).current.number, 2);
  });

  check('Keepsakes count paid learning, never stages, stars or visits', () => {
    const P = derivePets({}, records(), content, instant(6));
    P.glow = 99999;
    P.sources.milestones = 99999;
    P.sources.gifts = 99999;
    P.pets.forEach((p) => { p.stage = 10; p.visits = 999; });
    assert.equal(deriveJourney(P, {}, instant(6)).earnedCount, 0);
    for (const option of [{ skipped: true }, { fast: true }]) {
      const J = derive([visit('chai', instant(3), 20, option)]);
      assert.equal(J.earnedCount, 0);
      assert.ok(J.weekly.goals.every((g) => g.have === 0));
    }
  });

  check('Same-day duplicate questions cannot farm gifts or weekly progress', () => {
    const first = visit('chai', instant(3), 5, { keys: 'same' });
    const repeated = visit('chai', instant(3, 16), 5, { keys: 'same' });
    const a = derive([first]), b = derive([first, repeated]);
    assert.equal(a.keepsakes.find((k) => k.id === 'chai-1').earned, true);
    assert.deepEqual(owned(b), owned(a));
    assert.deepEqual(b.weekly.goals, a.weekly.goals);
    assert.deepEqual(newKeepsakes(a, b), []);
    const nextDay = derive([first, repeated, visit('chai', instant(4), 5, { keys: 'same' })]);
    assert.equal(nextDay.weekly.goals[0].have, 24);
  });

  check('A new correct answer produces exactly the newly earned gifts', () => {
    const before = derive([]);
    const after = derive([visit('chai', instant(3), 5)]);
    assert.deepEqual(newKeepsakes(before, after).map((k) => k.id), ['chai-1', 'chapter-spark']);
    assert.deepEqual(newKeepsakes(after, after), []);
  });

  check('Saved-run feedback includes new keepsakes and the next chapter exactly once', () => {
    const first = visit('chai', instant(3), 5);
    const before = { pets: derivePets({}, records(), content, instant(6)) };
    const after = { pets: derivePets({}, records([first]), content, instant(6)) };
    const change = petChangeLine(before, after);
    assert.equal(change.earned, 12);
    assert.equal(change.pet, 'chai');
    assert.deepEqual(change.journal.collected.map((k) => k.id), ['chai-1', 'chapter-spark']);
    assert.equal(change.journal.chapter.number, 2);
    assert.equal(change.journal.earnedCount, 2);
    assert.equal(petChangeLine(after, after).earned, 0);
    assert.deepEqual(petChangeLine(after, after).journal.collected, []);
    const replay = visit('chai', instant(3, 16), 5);
    replay.answers = first.answers;
    const repeated = { pets: derivePets({}, records([first, replay]), content, instant(6)) };
    assert.equal(petChangeLine(after, repeated).repeat, true);
    assert.deepEqual(petChangeLine(after, repeated).journal.collected, []);
    assert.equal(petChangeLine(null, after), null);
  });

  check('A weekly outing completes on nonconsecutive learning days', () => {
    const pet = derive([]).weekly.pet;
    const runs = [visit(pet, instant(2), 10), visit('chai', instant(4), 10), visit('mochi', instant(6), 10)];
    const J = derive(runs);
    assert.equal(J.weekly.done, true);
    assert.equal(J.weekly.pct, 1);
    assert.equal(J.weekly.doneCount, 3);
    assert.equal(J.keepsakes.find((k) => k.id === 'toffee-1').earned, true);
    const afterBreak = derive(runs, instant(29));
    assert.deepEqual(owned(afterBreak), owned(J));
    assert.equal(afterBreak.weekly.done, false);
  });

  check('Local Monday boundaries exclude last week and future records', () => {
    const J = derive([]);
    const start = J.weekly.startsAt, end = J.weekly.endsAt;
    assert.equal(new Date(start).getDay(), 1);
    assert.equal(new Date(start).getHours(), 0);
    assert.equal(new Date(end).getDay(), 1);
    assert.equal(new Date(end).getHours(), 0);
    const pet = J.weekly.pet;
    const runs = [visit(pet, start - 1, 10), visit(pet, start, 5), visit(pet, end, 20), visit(pet, instant(6, 13), 10)];
    const during = derive(runs);
    assert.equal(during.weekly.goals[0].have, 12);
    assert.equal(during.weekly.goals[2].have, 1);
    assert.equal(derive([], start).weekly.id, J.weekly.id);
    assert.notEqual(derive([], end).weekly.id, J.weekly.id);
    assert.notEqual(derive([], end).weekly.pet, J.weekly.pet);
    const dstWeek = derive([], instant(27, 12, 9)).weekly;
    assert.equal(new Date(dstWeek.endsAt).getHours(), 0);
    assert.equal(new Date(dstWeek.endsAt).getDay(), 1);
  });

  check('All chapters and gifts have a complete, finite end state', () => {
    const runs = [];
    const friends = ['chai', 'matcha', 'mochi', 'ginger', 'mallow', 'sesame', 'biscuit'];
    for (let day = 1; day <= 45; day++) {
      for (const pet of friends) runs.push(visit(pet, instant(day, 12, 8), 4));
    }
    const J = derive(runs, instant(6));
    assert.equal(J.completedChapters, 8);
    assert.equal(J.current, null);
    assert.equal(J.earnedCount, J.totalCount);
    assert.equal(J.nextKeepsake, null);
    assert.ok(J.keepsakes.every((k) => k.pct === 1 && k.have === k.goal));
  });

  check('Derivation does not mutate its inputs and handles incomplete records', () => {
    const rec = records([visit('chai', instant(3))]);
    const P = derivePets({}, rec, content, instant(6));
    const original = JSON.stringify({ P, rec, content });
    const result = deriveJourney(P, { records: rec, content }, instant(6));
    assert.equal(JSON.stringify({ P, rec, content }), original);
    assert.deepEqual(deriveJourney(P, { records: rec, content }, instant(6)), result);
    for (const partial of [null, {}, { pets: [null, 2, {}], sources: { practice: NaN } }]) {
      const J = deriveJourney(partial, null, instant(6));
      assert.equal(J.earnedCount, 0);
      assert.ok(J.chapters.every((c) => Number.isFinite(c.pct)));
    }
  });
  return { problems };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { problems } = await checkJourney();
  if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
  else console.log('Village Journal: paid learning, keepsakes, chapters, replay protection and weekly calendar checks passed.');
}
