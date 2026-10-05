/**
 * progress.js — what a student reads off a friend's card in five seconds:
 * the LEVEL (the subject's tier ladder; nothing is ever locked, it only says
 * where to practise next) and the ACHIEVEMENTS (one short list for all of CAT OS).
 * Pure: world in, plain objects out.
 */

import { STAGES, STAGE_INFO } from '../core/learning/journey.js';
import { PJ_TIERS } from '../modules/para-jumbles/logic/tiers.js';
import { PS_TIERS } from '../modules/para-summary/logic/tiers.js';
import { OOO_TIERS } from '../modules/odd-one-out/logic/tiers.js';
import { stageTitle } from './pets.js';

/** pet → [content key, tiers, what a unit is called, the item's tier field] */
const LADDER = {
  chai: ['rc', STAGES.map((id) => ({ id, label: STAGE_INFO[id].label })), 'passages', 'stage'],
  mochi: ['ps', PS_TIERS, 'summaries', 'tier'],
  ginger: ['pj', PJ_TIERS, 'jumbles', 'tier'],
  mallow: ['ooo', OOO_TIERS, 'sets', 'tier'],
};
const MODULE = { rc: null, ps: 'ps', pj: 'pj', ooo: 'ooo' };
const one = (n, unit) => (n === 1 ? unit.replace(/ies$/, 'y').replace(/s$/, '') : unit);

function solvedIds(key, world) {
  if (key === 'rc') return new Set(world?.state?.reading?.best?.keys?.() ?? []);
  const out = new Set();
  for (const s of world?.records?.sessions ?? []) {
    if (s?.module === MODULE[key]) for (const a of s.answers ?? []) if (a?.is_correct === true) out.add(a.item_id ?? a.question_id);
  }
  return out;
}

/**
 * Where a friend's student stands: "Level 2 of 8: Easy. Finish 5 more jumbles to reach Medium."
 * Subjects without a tier ladder (words, the fire) use their growth stages instead.
 * @param {string} petId
 * @param {object} world  { content, records, state }
 * @param {object} p      the friend from derivePets (stage, toNext, unit)
 * @returns {{ n:number, of:number, name:string, next:string|null, left:number, unit:string, line:string, cleared:number, segs:boolean[] }}
 */
export function levelFor(petId, world, p) {
  const [key, ladder, unit, field] = LADDER[petId] ?? [];
  const items = world?.content?.[key] ?? [];
  const tiers = (ladder ?? []).filter((t) => items.some((it) => it[field] === t.id));
  if (!tiers.length) {
    const next = p.stage < 10 ? stageTitle(petId, p.stage + 1) : null;
    return {
      ladder: false, n: p.stage, of: 10, name: p.stage ? stageTitle(petId, p.stage) : 'Just starting', next, left: p.toNext, unit: p.unit, cleared: 0,
      segs: Array.from({ length: 10 }, (_, i) => i < p.stage),
      line: next ? `${p.toNext} more ${one(p.toNext, p.unit)} to become ${next}.` : 'Every last one done. A master!',
    };
  }
  const solved = solvedIds(key, world);
  const rows = tiers.map((t) => {
    const inTier = items.filter((it) => it[field] === t.id);
    return { label: t.label, total: inTier.length, left: inTier.filter((it) => !solved.has(it.id)).length };
  });
  const at = rows.findIndex((r) => r.left > 0);
  const cleared = at === -1 ? rows.length : rows.filter((r) => r.left === 0).length;
  const cur = rows[at === -1 ? rows.length - 1 : at], next = rows[at + 1]?.label ?? null;
  return {
    ladder: true, n: (at === -1 ? rows.length : at + 1), of: rows.length, name: cur.label, next, left: cur.left, unit, cleared,
    segs: rows.map((r) => r.left === 0),
    line: at === -1 ? 'Every level cleared. A master!'
      : `Finish ${cur.left} more ${one(cur.left, unit)} to ${next ? `reach ${next}` : 'clear every level'}.`,
  };
}

/** [id, title, one short line, how far you are (from the measures), the goal] */
const ACHIEVEMENTS = [
  ['first', 'First step', 'Finish your first round.', (m) => m.runs, 1],
  ['days3', 'Back again', 'Practise on 3 different days.', (m) => m.days, 3],
  ['week', 'A full week', 'Practise 7 days in a row.', (m) => m.streak, 7],
  ['q50', 'Warm-up', 'Answer 50 questions.', (m) => m.answered, 50],
  ['q500', 'Marathon', 'Answer 500 questions.', (m) => m.answered, 500],
  ['perfect', 'Spotless', 'Get a whole round right.', (m) => (m.perfect ? 1 : 0), 1],
  ['level', 'Level cleared', 'Clear every question of one level.', (m) => m.cleared, 1],
  ['three', 'Explorer', 'Try 3 different subjects.', (m) => m.subjects, 3],
  ['all', 'All-rounder', 'Try all 5 subjects.', (m) => m.subjects, 5],
  ['growing', 'Growing up', 'Help a friend grow out of babyhood.', (m) => m.stage, 3],
];

/**
 * The achievements of the whole of CAT OS, each with how far along it is.
 * @param {object} world  { content, records, state }
 * @param {object} P      derivePets(...)
 * @returns {Array<{ id, title, line, have:number, goal:number, got:boolean }>}
 */
export function achievementsFor(world, P) {
  const e = world?.state?.engagement ?? {};
  const rounds = (world?.records?.learning ?? []).filter((r) => r?.kind === 'lex-round');
  const taught = P.pets.filter((p) => p.id !== 'toffee');
  const m = {
    runs: P.pets.reduce((n, p) => n + p.visits, 0),
    days: P.pets.find((p) => p.id === 'toffee')?.done ?? 0,
    streak: Math.max(e.streaks?.best ?? 0, P.flame?.days ?? 0),
    answered: (e.answered ?? 0) + rounds.reduce((n, r) => n + (r.score?.total ?? 0), 0),
    perfect: e.hasPerfectSession === true || rounds.some((r) => r.flawless === true),
    cleared: taught.reduce((n, p) => n + levelFor(p.id, world, p).cleared, 0),
    subjects: taught.filter((p) => p.done > 0).length,
    stage: Math.max(0, ...P.pets.map((p) => p.stage)),
  };
  return ACHIEVEMENTS.map(([id, title, line, have, goal]) => {
    const h = Math.min(goal, have(m));
    return { id, title, line, have: h, goal, got: h >= goal };
  });
}
