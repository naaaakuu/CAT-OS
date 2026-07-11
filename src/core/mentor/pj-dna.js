/**
 * pj-dna.js — Reading DNA for Para Jumbles: how this person rebuilds
 * paragraphs. Pure logic, no DOM, no storage.
 *
 * Implements PARA_JUMBLES_BIBLE §8: recurrent error patterns map to
 * stable solver traits — surface matching, opener-heuristic dependence,
 * ending judgement, global-coherence tracking, working memory for long
 * chains, implicit-inference gaps, premature closure — each detected
 * from item metadata (the §6 difficulty vector) joined to stored
 * answers, and each gated behind explicit evidence floors so the
 * mentor never pretends to see a pattern in noise.
 *
 * Trap diagnosis is PRECISE where possible: when an entered sequence
 * equals one of the item's documented tempting orders, we know exactly
 * which trap caught the solver (the content tags each tempting order).
 * Otherwise we fall back to the item's primary trap — an approximation,
 * and counted as one.
 *
 * Same contract as dna.js: same history in, same observations out.
 * Observation kinds: growth (celebrate first) · strength · watch.
 */

import { PJ_TRAP_PATTERNS, PJ_DNA_COPY } from './pj-voice.js';

/* Evidence floors — exported so tools/verify.mjs can test the gates. */
export const PJ_FLOORS = Object.freeze({
  TRAP_MIN: 3,           // occurrences before a trap affinity is named
  TRAP_MIN_ITEMS: 2,     // ...across at least this many distinct jumbles
  SLOT_MIN: 3,           // multi-opener/-ending items before slots are discussed
  SLOT_MISS_RATE: 0.5,
  SPLIT_MIN: 3,          // items on each side of a metadata split
  SPLIT_GAP: 0.3,        // accuracy gap that earns a watch
  STRENGTH_ACC: 0.8,
  CLOSURE_MIN: 3,        // quick-locked misses before closure is named
  CLOSURE_READBACK_MS: 6000,
  LINKS_MISS_MIN: 3,     // misses before partial-links encouragement
  LINKS_RATE: 0.6,
  QUIET_RECENT: 3,       // clean recent sessions to call a trap quiet
  VELOCITY_MIN: 6,       // sessions before a velocity observation
  VELOCITY_GAIN: 0.2,
});

/** Flatten PJ sessions into enriched per-item rows joined to content.
 *  Rows for items that aren't loadable are skipped, silently. */
export function enrichPJAnswers(sessions, items) {
  const rows = [];
  for (const s of sessions) {
    if (s.module !== 'pj' || !Array.isArray(s.answers)) continue;
    for (const a of s.answers) {
      const item = items.get(a.item_id ?? a.question_id);
      if (!item) continue;
      let trap = null;
      if (a.is_correct === false && Array.isArray(a.entered)) {
        const enteredStr = a.entered.join('');
        const hit = item.explanation.tempting_orders.find((t) => t.order === enteredStr);
        trap = hit?.trap_type
          ?? (item.meta.primary_trap !== 'none' ? item.meta.primary_trap : null);
      }
      rows.push({
        session_id: s.id,
        item_id: item.meta.id,
        finished_at: s.finished_at,
        entered: a.entered,
        is_correct: a.is_correct,
        time_ms: a.time_ms,
        read_back_ms: a.read_back_ms ?? 0,
        revised: !!a.revised,
        links_correct: a.links_correct ?? 0,
        positions_correct: a.positions_correct ?? 0,
        trap,
        item,
      });
    }
  }
  return rows;
}

/** trap -> { count, items:Set, sessions:[] } over misses. */
export function pjTrapCounts(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r.trap) continue;
    const cur = map.get(r.trap) ?? { count: 0, items: new Set(), sessions: [] };
    cur.count += 1;
    cur.items.add(r.item_id);
    cur.sessions.push(r.session_id);
    map.set(r.trap, cur);
  }
  return map;
}

/** The single most frequent trap clearing the floor, or null. */
export function pjDominantTrap(rows) {
  let best = null;
  for (const [trap, c] of pjTrapCounts(rows)) {
    if (c.count < PJ_FLOORS.TRAP_MIN || c.items.size < PJ_FLOORS.TRAP_MIN_ITEMS) continue;
    if (!best || c.count > best.count || (c.count === best.count && trap < best.trap)) {
      best = { trap, count: c.count, items: c.items.size };
    }
  }
  return best;
}

const pctText = (fraction) => `${Math.round(fraction * 100)}%`;
const acc = (rows) => {
  const attempted = rows.filter((r) => r.is_correct !== null);
  if (attempted.length === 0) return null;
  return attempted.filter((r) => r.is_correct === true).length / attempted.length;
};

/**
 * Derive the solver's Para Jumbles DNA.
 * @param {Array} sessions stored session records (any modules; PJ picked out)
 * @param {Map}   items    item_id -> loaded PJ content item
 */
export function derivePJDNA(sessions, items) {
  const pjSessions = sessions
    .filter((s) => s.module === 'pj')
    .sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  const rows = enrichPJAnswers(pjSessions, items);
  const attempted = rows.filter((r) => r.is_correct !== null);
  const observations = [];
  const recentSessionIds = pjSessions.slice(-PJ_FLOORS.QUIET_RECENT).map((s) => s.id);

  /* ---- growth: traps gone quiet ---- */
  if (pjSessions.length > PJ_FLOORS.QUIET_RECENT) {
    for (const [trap, c] of [...pjTrapCounts(rows)].sort((a, b) => a[0].localeCompare(b[0]))) {
      const pattern = PJ_TRAP_PATTERNS[trap];
      if (!pattern || c.count < PJ_FLOORS.TRAP_MIN) continue;
      const recentHits = c.sessions.filter((id) => recentSessionIds.includes(id)).length;
      if (recentHits === 0) {
        const copy = PJ_DNA_COPY.traitQuiet(pattern.name, PJ_FLOORS.QUIET_RECENT);
        observations.push({
          id: `pj-quiet:${trap}`, kind: 'growth', pattern_id: trap,
          title: copy.title, body: copy.body,
          evidence: `Appeared ${c.count} times before; none in your last ${PJ_FLOORS.QUIET_RECENT} sessions.`,
        });
      }
    }
  }

  /* ---- growth: learning velocity ---- */
  if (pjSessions.length >= PJ_FLOORS.VELOCITY_MIN) {
    const accOf = (s) => (s.score.attempted > 0 ? s.score.accuracy : null);
    const early = pjSessions.slice(0, 3).map(accOf).filter((x) => x !== null);
    const late = pjSessions.slice(-3).map(accOf).filter((x) => x !== null);
    if (early.length === 3 && late.length === 3) {
      const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
      if (avg(late) - avg(early) >= PJ_FLOORS.VELOCITY_GAIN) {
        const copy = PJ_DNA_COPY.velocity(pctText(avg(early)), pctText(avg(late)));
        observations.push({
          id: 'pj-velocity', kind: 'growth', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `First three sessions against your latest three.`,
        });
      }
    }
  }

  /* ---- trap affinities (the named pulls) ---- */
  for (const [trap, c] of [...pjTrapCounts(rows)]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))) {
    const pattern = PJ_TRAP_PATTERNS[trap];
    if (!pattern) continue;
    if (c.count < PJ_FLOORS.TRAP_MIN || c.items.size < PJ_FLOORS.TRAP_MIN_ITEMS) continue;
    if (observations.some((o) => o.id === `pj-quiet:${trap}`)) continue; // quiet wins
    const copy = PJ_DNA_COPY.trapAffinity(pattern.name, c.count, c.items.size);
    observations.push({
      id: `pj-trap:${trap}`, kind: 'watch', pattern_id: trap,
      title: copy.title, body: copy.body,
      evidence: `Seen ${c.count} times across ${c.items.size} jumbles.`,
    });
  }

  /* ---- opener and ending judgement on engineered items ---- */
  {
    const openerItems = attempted.filter(
      (r) => Array.isArray(r.entered) && r.item.meta.difficulty_vector.competing_openings >= 2);
    const openerMisses = openerItems.filter(
      (r) => r.entered[0] !== r.item.correct_order[0]).length;
    if (openerItems.length >= PJ_FLOORS.SLOT_MIN
        && openerMisses / openerItems.length >= PJ_FLOORS.SLOT_MISS_RATE) {
      const copy = PJ_DNA_COPY.openerFriction(openerMisses, openerItems.length);
      observations.push({
        id: 'pj-slot:opener', kind: 'watch', pattern_id: 'competing_opener',
        title: copy.title, body: copy.body,
        evidence: `${openerMisses} of ${openerItems.length} multi-opener jumbles started elsewhere.`,
      });
    }
    const endingItems = attempted.filter(
      (r) => Array.isArray(r.entered) && r.item.meta.difficulty_vector.competing_endings >= 2);
    const endingMisses = endingItems.filter((r) => {
      const co = r.item.correct_order;
      return r.entered[co.length - 1] !== co[co.length - 1];
    }).length;
    if (endingItems.length >= PJ_FLOORS.SLOT_MIN
        && endingMisses / endingItems.length >= PJ_FLOORS.SLOT_MISS_RATE) {
      const copy = PJ_DNA_COPY.endingFriction(endingMisses, endingItems.length);
      observations.push({
        id: 'pj-slot:ending', kind: 'watch', pattern_id: 'competing_ending',
        title: copy.title, body: copy.body,
        evidence: `${endingMisses} of ${endingItems.length} multi-ending jumbles closed elsewhere.`,
      });
    }
  }

  /* ---- global coherence: accuracy vs number of plausible orderings ---- */
  {
    const high = attempted.filter((r) => r.item.meta.num_plausible_orderings >= 3);
    const low = attempted.filter((r) => r.item.meta.num_plausible_orderings < 3);
    const accHigh = acc(high);
    const accLow = acc(low);
    if (high.length >= PJ_FLOORS.SPLIT_MIN && low.length >= PJ_FLOORS.SPLIT_MIN
        && accHigh !== null && accLow !== null) {
      if (accLow - accHigh >= PJ_FLOORS.SPLIT_GAP) {
        const copy = PJ_DNA_COPY.globalFriction(pctText(accHigh), pctText(accLow));
        observations.push({
          id: 'pj-split:global', kind: 'watch', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `${high.length} many-ordering jumbles against ${low.length} single-path ones.`,
        });
      } else if (accHigh >= PJ_FLOORS.STRENGTH_ACC) {
        const copy = PJ_DNA_COPY.globalStrength();
        observations.push({
          id: 'pj-split:global-strength', kind: 'strength', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `${pctText(accHigh)} across ${high.length} jumbles with several locally workable orders.`,
        });
      }
    }
  }

  /* ---- working memory: long dependency chains ---- */
  {
    const long = attempted.filter((r) => r.item.meta.difficulty_vector.dependency_chain_length >= 4);
    const short = attempted.filter((r) => r.item.meta.difficulty_vector.dependency_chain_length <= 3);
    const accLong = acc(long);
    const accShort = acc(short);
    if (long.length >= PJ_FLOORS.SPLIT_MIN && short.length >= PJ_FLOORS.SPLIT_MIN
        && accLong !== null && accShort !== null
        && accShort - accLong >= PJ_FLOORS.SPLIT_GAP) {
      const copy = PJ_DNA_COPY.chainFriction(long.length);
      observations.push({
        id: 'pj-split:chain', kind: 'watch', pattern_id: null,
        title: copy.title, body: copy.body,
        evidence: `Long-chain jumbles at ${pctText(accLong)} against ${pctText(accShort)} on short chains.`,
      });
    }
  }

  /* ---- inference: implicit vs explicit relations ---- */
  {
    const isImplicit = (r) => r.item.meta.cohesion_signals.includes('connective_implicit')
      && !r.item.meta.cohesion_signals.includes('connective_explicit');
    const implicit = attempted.filter(isImplicit);
    const explicit = attempted.filter((r) => r.item.meta.cohesion_signals.includes('connective_explicit'));
    const accImp = acc(implicit);
    const accExp = acc(explicit);
    if (implicit.length >= PJ_FLOORS.SPLIT_MIN && explicit.length >= PJ_FLOORS.SPLIT_MIN
        && accImp !== null && accExp !== null
        && accExp - accImp >= PJ_FLOORS.SPLIT_GAP) {
      const copy = PJ_DNA_COPY.implicitFriction(implicit.length);
      observations.push({
        id: 'pj-split:implicit', kind: 'watch', pattern_id: null,
        title: copy.title, body: copy.body,
        evidence: `Unmarked-link jumbles at ${pctText(accImp)} against ${pctText(accExp)} when connectives are written out.`,
      });
    }
  }

  /* ---- premature closure: quick locks that did not hold ---- */
  {
    const quickLocked = rows.filter((r) => r.is_correct === false
      && r.read_back_ms > 0 && r.read_back_ms < PJ_FLOORS.CLOSURE_READBACK_MS);
    if (quickLocked.length >= PJ_FLOORS.CLOSURE_MIN) {
      const copy = PJ_DNA_COPY.closureWatch(quickLocked.length);
      observations.push({
        id: 'pj-closure', kind: 'watch', pattern_id: null,
        title: copy.title, body: copy.body,
        evidence: `${quickLocked.length} sequences locked within seconds of assembly.`,
      });
    }
  }

  /* ---- encouragement: the links are mostly there ---- */
  {
    const misses = rows.filter((r) => r.is_correct === false && Array.isArray(r.entered));
    if (misses.length >= PJ_FLOORS.LINKS_MISS_MIN) {
      const rate = misses.reduce((n, r) =>
        n + r.links_correct / Math.max(1, r.item.correct_order.length - 1), 0) / misses.length;
      if (rate >= PJ_FLOORS.LINKS_RATE) {
        const copy = PJ_DNA_COPY.linksStrength(pctText(rate));
        observations.push({
          id: 'pj-links', kind: 'strength', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `Across ${misses.length} near-misses, most author-written pairings were in your sequence.`,
        });
      }
    }
  }

  /* growth first, then strengths, then watches — stable within kinds. */
  const rank = { growth: 0, strength: 1, watch: 2 };
  observations.sort((a, b) => rank[a.kind] - rank[b.kind] || a.id.localeCompare(b.id));

  return {
    sessionsSeen: pjSessions.length,
    ready: observations.length > 0,
    dominant: pjDominantTrap(rows),
    observations,
  };
}
