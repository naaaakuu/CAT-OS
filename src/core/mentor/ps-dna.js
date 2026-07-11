/**
 * ps-dna.js — Reading DNA for Para Summary: how this person compresses
 * a paragraph into its claim. Pure logic, no DOM, no storage.
 *
 * Implements PARA SUMMARY BIBLE §6 + §13: every wrong pick carries the
 * taxonomy tag of the distractor chosen, so misses aggregate by
 * archetype FAMILY (scope, certainty, structure, addition, stance,
 * logic, language, precision) into a dominant failure mode the student
 * can work against — "you frequently expand the author's scope" made
 * fair, specific and forward facing. Diagnosis is PRECISE by design:
 * the chosen option's own tag tells us exactly which distortion
 * rewarded the pick, no approximation needed.
 *
 * Every observation is gated behind explicit evidence floors so the
 * mentor never pretends to see a pattern in noise, exactly like dna.js
 * and pj-dna.js. Same contract: same history in, same observations
 * out. Observation kinds: growth (celebrate first) · strength · watch.
 */

import { PS_TRAP_PATTERNS, PS_FAMILY_LABELS, PS_DNA_COPY } from './ps-voice.js';

/* Evidence floors — exported so tools/verify.mjs can test the gates. */
export const PS_FLOORS = Object.freeze({
  FAMILY_MIN: 3,         // picks before a family affinity is named
  FAMILY_MIN_ITEMS: 2,   // ...across at least this many distinct items
  ARCHETYPE_MIN: 3,      // picks before one exact archetype is named
  ARCHETYPE_MIN_ITEMS: 2,
  SPLIT_MIN: 3,          // items on each side of a metadata split
  SPLIT_GAP: 0.3,        // accuracy gap that earns a watch
  STRENGTH_ACC: 0.8,
  FINALIST_MIN: 3,       // two-finalist items before precision is discussed
  FAST_MISS_MIN: 3,      // quick misses before pace is discussed
  FAST_MISS_MS: 25000,   // a pick this early on a summary item is a sprint
  QUIET_RECENT: 3,       // clean recent sessions to call a family quiet
  VELOCITY_MIN: 6,       // sessions before a velocity observation
  VELOCITY_GAIN: 0.2,
});

/** Flatten PS sessions into enriched per-item rows joined to content.
 *  Rows for items that aren't loadable are skipped, silently. */
export function enrichPSAnswers(sessions, items) {
  const rows = [];
  for (const s of sessions) {
    if (s.module !== 'ps' || !Array.isArray(s.answers)) continue;
    for (const a of s.answers) {
      const item = items.get(a.item_id ?? a.question_id);
      if (!item) continue;
      let archetype = null;
      if (a.is_correct === false && a.chosen) {
        const d = item.question.explanation.distractors
          .find((x) => x.option === a.chosen);
        archetype = d?.archetype ?? null;
      }
      rows.push({
        session_id: s.id,
        item_id: item.meta.id,
        finished_at: s.finished_at,
        chosen: a.chosen,
        is_correct: a.is_correct,
        time_ms: a.time_ms,
        summary_written: !!a.summary_written,
        think_opened: !!a.think_opened,
        archetype,
        family: archetype ? (PS_TRAP_PATTERNS[archetype]?.family ?? null) : null,
        item,
      });
    }
  }
  return rows;
}

/** family -> { count, items:Set, sessions:[] } over misses. */
export function psFamilyCounts(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r.family) continue;
    const cur = map.get(r.family) ?? { count: 0, items: new Set(), sessions: [] };
    cur.count += 1;
    cur.items.add(r.item_id);
    cur.sessions.push(r.session_id);
    map.set(r.family, cur);
  }
  return map;
}

/** archetype -> { count, items:Set } over misses. */
export function psArchetypeCounts(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r.archetype) continue;
    const cur = map.get(r.archetype) ?? { count: 0, items: new Set() };
    cur.count += 1;
    cur.items.add(r.item_id);
    map.set(r.archetype, cur);
  }
  return map;
}

/** The single most frequent family clearing the floor, or null. */
export function psDominantFamily(rows) {
  let best = null;
  for (const [family, c] of psFamilyCounts(rows)) {
    if (c.count < PS_FLOORS.FAMILY_MIN || c.items.size < PS_FLOORS.FAMILY_MIN_ITEMS) continue;
    if (!best || c.count > best.count || (c.count === best.count && family < best.family)) {
      best = { family, count: c.count, items: c.items.size };
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
 * Derive the reader's Para Summary DNA.
 * @param {Array} sessions stored session records (any modules; PS picked out)
 * @param {Map}   items    item_id -> loaded PS content item
 */
export function derivePSDNA(sessions, items) {
  const psSessions = sessions
    .filter((s) => s.module === 'ps')
    .sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  const rows = enrichPSAnswers(psSessions, items);
  const attempted = rows.filter((r) => r.is_correct !== null);
  const observations = [];
  const recentSessionIds = psSessions.slice(-PS_FLOORS.QUIET_RECENT).map((s) => s.id);

  /* ---- growth: families gone quiet ---- */
  if (psSessions.length > PS_FLOORS.QUIET_RECENT) {
    for (const [family, c] of [...psFamilyCounts(rows)].sort((a, b) => a[0].localeCompare(b[0]))) {
      const label = PS_FAMILY_LABELS[family];
      if (!label || c.count < PS_FLOORS.FAMILY_MIN) continue;
      const recentHits = c.sessions.filter((id) => recentSessionIds.includes(id)).length;
      if (recentHits === 0) {
        const copy = PS_DNA_COPY.familyQuiet(label, PS_FLOORS.QUIET_RECENT);
        observations.push({
          id: `ps-quiet:${family}`, kind: 'growth', pattern_id: family,
          title: copy.title, body: copy.body,
          evidence: `Appeared ${c.count} times before; none in your last ${PS_FLOORS.QUIET_RECENT} sessions.`,
        });
      }
    }
  }

  /* ---- growth: learning velocity ---- */
  if (psSessions.length >= PS_FLOORS.VELOCITY_MIN) {
    const accOf = (s) => (s.score.attempted > 0 ? s.score.accuracy : null);
    const early = psSessions.slice(0, 3).map(accOf).filter((x) => x !== null);
    const late = psSessions.slice(-3).map(accOf).filter((x) => x !== null);
    if (early.length === 3 && late.length === 3) {
      const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
      if (avg(late) - avg(early) >= PS_FLOORS.VELOCITY_GAIN) {
        const copy = PS_DNA_COPY.velocity(pctText(avg(early)), pctText(avg(late)));
        observations.push({
          id: 'ps-velocity', kind: 'growth', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: 'First three sessions against your latest three.',
        });
      }
    }
  }

  /* ---- family affinities (the dominant failure modes, §13) ---- */
  for (const [family, c] of [...psFamilyCounts(rows)]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))) {
    const label = PS_FAMILY_LABELS[family];
    if (!label) continue;
    if (c.count < PS_FLOORS.FAMILY_MIN || c.items.size < PS_FLOORS.FAMILY_MIN_ITEMS) continue;
    if (observations.some((o) => o.id === `ps-quiet:${family}`)) continue; // quiet wins
    const copy = PS_DNA_COPY.familyAffinity(label, c.count, c.items.size);
    observations.push({
      id: `ps-family:${family}`, kind: 'watch', pattern_id: family,
      title: copy.title, body: copy.body,
      evidence: `Seen ${c.count} times across ${c.items.size} paragraphs.`,
    });
  }

  /* ---- one exact archetype, when it alone clears the floor ---- */
  {
    let best = null;
    for (const [archetype, c] of [...psArchetypeCounts(rows)]
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))) {
      if (c.count < PS_FLOORS.ARCHETYPE_MIN || c.items.size < PS_FLOORS.ARCHETYPE_MIN_ITEMS) continue;
      best = { archetype, ...c };
      break;
    }
    if (best && PS_TRAP_PATTERNS[best.archetype]) {
      const pattern = PS_TRAP_PATTERNS[best.archetype];
      const family = pattern.family;
      if (!observations.some((o) => o.id === `ps-quiet:${family}`)) {
        const copy = PS_DNA_COPY.archetypeAffinity(pattern.name, best.count, best.items.size);
        observations.push({
          id: `ps-archetype:${best.archetype}`, kind: 'watch', pattern_id: best.archetype,
          title: copy.title, body: copy.body,
          evidence: `Seen ${best.count} times across ${best.items.size} paragraphs.`,
        });
      }
    }
  }

  /* ---- precision: qualifier-dense paragraphs vs plain ones ---- */
  {
    const dense = attempted.filter((r) => r.item.meta.difficulty_dials.qualifier_density >= 2);
    const plain = attempted.filter((r) => r.item.meta.difficulty_dials.qualifier_density < 2);
    const accDense = acc(dense);
    const accPlain = acc(plain);
    if (dense.length >= PS_FLOORS.SPLIT_MIN && plain.length >= PS_FLOORS.SPLIT_MIN
        && accDense !== null && accPlain !== null) {
      if (accPlain - accDense >= PS_FLOORS.SPLIT_GAP) {
        const copy = PS_DNA_COPY.qualifierFriction(pctText(accDense), pctText(accPlain));
        observations.push({
          id: 'ps-split:qualifiers', kind: 'watch', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `${dense.length} qualifier dense paragraphs against ${plain.length} plain ones.`,
        });
      } else if (accDense >= PS_FLOORS.STRENGTH_ACC) {
        const copy = PS_DNA_COPY.qualifierStrength();
        observations.push({
          id: 'ps-split:qualifiers-strength', kind: 'strength', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `${pctText(accDense)} across ${dense.length} paragraphs dense with limiters and hedges.`,
        });
      }
    }
  }

  /* ---- structure: unmarked turns vs marked ones ---- */
  {
    const softTurn = attempted.filter((r) => r.item.meta.turn.present
      && r.item.meta.difficulty_dials.turn_subtlety >= 3);
    const marked = attempted.filter((r) => r.item.meta.turn.present
      && r.item.meta.difficulty_dials.turn_subtlety < 3);
    const accSoft = acc(softTurn);
    const accMarked = acc(marked);
    if (softTurn.length >= PS_FLOORS.SPLIT_MIN && marked.length >= PS_FLOORS.SPLIT_MIN
        && accSoft !== null && accMarked !== null
        && accMarked - accSoft >= PS_FLOORS.SPLIT_GAP) {
      const misses = softTurn.filter((r) => r.is_correct === false).length;
      const copy = PS_DNA_COPY.turnFriction(misses, softTurn.length);
      observations.push({
        id: 'ps-split:turn', kind: 'watch', pattern_id: null,
        title: copy.title, body: copy.body,
        evidence: `Soft turn paragraphs at ${pctText(accSoft)} against ${pctText(accMarked)} when the turn is marked.`,
      });
    }
  }

  /* ---- strength: winning the two-finalist endgame ---- */
  {
    const finalists = attempted.filter((r) => r.item.meta.difficulty_dials.live_options >= 2);
    const accFin = acc(finalists);
    if (finalists.length >= PS_FLOORS.FINALIST_MIN && accFin !== null
        && accFin >= PS_FLOORS.STRENGTH_ACC) {
      const copy = PS_DNA_COPY.finalistStrength(pctText(accFin), finalists.length);
      observations.push({
        id: 'ps-finalists', kind: 'strength', pattern_id: null,
        title: copy.title, body: copy.body,
        evidence: `${pctText(accFin)} on items with two or more genuinely live options.`,
      });
    }
  }

  /* ---- pace: quick picks that did not hold ---- */
  {
    const fastMisses = rows.filter((r) => r.is_correct === false
      && r.time_ms > 0 && r.time_ms < PS_FLOORS.FAST_MISS_MS);
    if (fastMisses.length >= PS_FLOORS.FAST_MISS_MIN) {
      const copy = PS_DNA_COPY.fastMissWatch(fastMisses.length);
      observations.push({
        id: 'ps-pace', kind: 'watch', pattern_id: null,
        title: copy.title, body: copy.body,
        evidence: `${fastMisses.length} picks made within ${Math.round(PS_FLOORS.FAST_MISS_MS / 1000)} seconds that did not hold.`,
      });
    }
  }

  /* growth first, then strengths, then watches — stable within kinds. */
  const rank = { growth: 0, strength: 1, watch: 2 };
  observations.sort((a, b) => rank[a.kind] - rank[b.kind] || a.id.localeCompare(b.id));

  return {
    sessionsSeen: psSessions.length,
    ready: observations.length > 0,
    dominant: psDominantFamily(rows),
    observations,
  };
}
