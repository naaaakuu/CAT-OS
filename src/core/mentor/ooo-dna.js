/**
 * ooo-dna.js — Reading DNA for Odd One Out: how this person detects
 * coherence violations. Pure logic, no DOM, no storage.
 *
 * Implements ODD_MAN_OUT_BIBLE §8, the bounded extension: exactly four
 * new traits, observed from stored answers joined to item metadata,
 * never invented beyond the Bible's list.
 *
 *   coherence_monitoring        → the global/local locus split (items
 *                                 that are locally smooth but globally
 *                                 alien vs items with a visible break)
 *   relatedness_vs_belonging    → the topical overlap split (camouflaged
 *                                 intruders vs low overlap ones)
 *   candidate_model_maintenance → build quality on construct items and
 *                                 quick exclusions that did not hold
 *   ambiguity_tolerance         → Trap A decoys: excluding a belonging
 *                                 sentence for a surface feature
 *
 * Diagnosis is PRECISE by design (Bible Recommendation 5): every wrong
 * pick is a core sentence, and each core sentence carries the §7
 * mistake_type that makes it tempting to exclude, so misses aggregate
 * by named solver pattern with no approximation.
 *
 * Every observation is gated behind explicit evidence floors so the
 * mentor never pretends to see a pattern in noise, exactly like dna.js,
 * pj-dna.js and ps-dna.js. Same contract: same history in, same
 * observations out. Observation kinds: growth (celebrate first) ·
 * strength · watch.
 */

import { OOO_TRAP_PATTERNS, OOO_DNA_COPY } from './ooo-voice.js';

/* Evidence floors — exported so tools/verify.mjs can test the gates. */
export const OOO_FLOORS = Object.freeze({
  PATTERN_MIN: 3,        // picks before a solver pattern is named
  PATTERN_MIN_ITEMS: 2,  // ...across at least this many distinct items
  SPLIT_MIN: 3,          // items on each side of a metadata split
  SPLIT_GAP: 0.3,        // accuracy gap that earns a watch
  STRENGTH_ACC: 0.8,
  HIGH_OVERLAP: 4,       // topical_overlap at or above = camouflaged
  LOW_OVERLAP: 2,        // topical_overlap at or below = stands apart
  DECOY_LOAD: 2,         // decoy_load at or above = Trap A is planted
  BUILD_MISS_MIN: 3,     // construct-mode misses before builds are discussed
  BUILD_RATE: 0.6,       // join rate that earns the encouragement
  FAST_MISS_MIN: 3,      // quick misses before pace is discussed
  FAST_MISS_MS: 20000,   // an exclusion this early is a sprint
  QUIET_RECENT: 3,       // clean recent sessions to call a pattern quiet
  VELOCITY_MIN: 6,       // sessions before a velocity observation
  VELOCITY_GAIN: 0.2,
});

/** Flatten OOO sessions into enriched per-item rows joined to content.
 *  Rows for items that aren't loadable are skipped, silently. */
export function enrichOOOAnswers(sessions, items) {
  const rows = [];
  for (const s of sessions) {
    if (s.module !== 'ooo' || !Array.isArray(s.answers)) continue;
    for (const a of s.answers) {
      const item = items.get(a.item_id ?? a.question_id);
      if (!item) continue;
      let mistake = null;
      if (a.is_correct === false && a.chosen) {
        const ex = item.explanation.exclusion_analysis
          .find((x) => x.label === a.chosen);
        mistake = ex?.mistake_type ?? null;
      }
      rows.push({
        session_id: s.id,
        item_id: item.meta.id,
        finished_at: s.finished_at,
        chosen: a.chosen,
        is_correct: a.is_correct,
        time_ms: a.time_ms,
        built: Array.isArray(a.built) ? a.built : null,
        build_links_correct: a.build_links_correct ?? 0,
        think_opened: !!a.think_opened,
        mistake,
        item,
      });
    }
  }
  return rows;
}

/** mistake_type -> { count, items:Set, sessions:[] } over misses. */
export function oooMistakeCounts(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r.mistake) continue;
    const cur = map.get(r.mistake) ?? { count: 0, items: new Set(), sessions: [] };
    cur.count += 1;
    cur.items.add(r.item_id);
    cur.sessions.push(r.session_id);
    map.set(r.mistake, cur);
  }
  return map;
}

/** The single most frequent solver pattern clearing the floor, or null. */
export function oooDominantMistake(rows) {
  let best = null;
  for (const [mistake, c] of oooMistakeCounts(rows)) {
    if (c.count < OOO_FLOORS.PATTERN_MIN || c.items.size < OOO_FLOORS.PATTERN_MIN_ITEMS) continue;
    if (!best || c.count > best.count || (c.count === best.count && mistake < best.mistake)) {
      best = { mistake, count: c.count, items: c.items.size };
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
 * Derive the reader's Odd One Out DNA.
 * @param {Array} sessions stored session records (any modules; OOO picked out)
 * @param {Map}   items    item_id -> loaded OOO content item
 */
export function deriveOOODNA(sessions, items) {
  const oooSessions = sessions
    .filter((s) => s.module === 'ooo')
    .sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  const rows = enrichOOOAnswers(oooSessions, items);
  const attempted = rows.filter((r) => r.is_correct !== null);
  const observations = [];
  const recentSessionIds = oooSessions.slice(-OOO_FLOORS.QUIET_RECENT).map((s) => s.id);
  const counts = oooMistakeCounts(rows);

  /* ---- growth: solver patterns gone quiet ---- */
  if (oooSessions.length > OOO_FLOORS.QUIET_RECENT) {
    for (const [mistake, c] of [...counts].sort((a, b) => a[0].localeCompare(b[0]))) {
      const pattern = OOO_TRAP_PATTERNS[mistake];
      if (!pattern || c.count < OOO_FLOORS.PATTERN_MIN) continue;
      const recentHits = c.sessions.filter((id) => recentSessionIds.includes(id)).length;
      if (recentHits === 0) {
        const copy = OOO_DNA_COPY.patternQuiet(pattern.name, OOO_FLOORS.QUIET_RECENT);
        observations.push({
          id: `ooo-quiet:${mistake}`, kind: 'growth', pattern_id: mistake,
          title: copy.title, body: copy.body,
          evidence: `Appeared ${c.count} times before; none in your last ${OOO_FLOORS.QUIET_RECENT} sessions.`,
        });
      }
    }
  }

  /* ---- growth: learning velocity ---- */
  if (oooSessions.length >= OOO_FLOORS.VELOCITY_MIN) {
    const accOf = (s) => (s.score.attempted > 0 ? s.score.accuracy : null);
    const early = oooSessions.slice(0, 3).map(accOf).filter((x) => x !== null);
    const late = oooSessions.slice(-3).map(accOf).filter((x) => x !== null);
    if (early.length === 3 && late.length === 3) {
      const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
      if (avg(late) - avg(early) >= OOO_FLOORS.VELOCITY_GAIN) {
        const copy = OOO_DNA_COPY.velocity(pctText(avg(early)), pctText(avg(late)));
        observations.push({
          id: 'ooo-velocity', kind: 'growth', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: 'First three sessions against your latest three.',
        });
      }
    }
  }

  /* ---- solver pattern affinities (the named pulls, §7) ----
     surface_oddity gets the dedicated Trap A observation below, with
     richer teaching copy, so it is excluded from the generic list. */
  for (const [mistake, c] of [...counts]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))) {
    const pattern = OOO_TRAP_PATTERNS[mistake];
    if (!pattern || mistake === 'surface_oddity') continue;
    if (c.count < OOO_FLOORS.PATTERN_MIN || c.items.size < OOO_FLOORS.PATTERN_MIN_ITEMS) continue;
    if (observations.some((o) => o.id === `ooo-quiet:${mistake}`)) continue; // quiet wins
    const copy = OOO_DNA_COPY.patternAffinity(pattern.name, c.count, c.items.size);
    observations.push({
      id: `ooo-pattern:${mistake}`, kind: 'watch', pattern_id: mistake,
      title: copy.title, body: copy.body,
      evidence: `Seen ${c.count} times across ${c.items.size} items.`,
    });
  }

  /* ---- ambiguity tolerance: the Trap A decoy, dressed differently ---- */
  {
    const c = counts.get('surface_oddity');
    if (c && c.count >= OOO_FLOORS.PATTERN_MIN && c.items.size >= OOO_FLOORS.PATTERN_MIN_ITEMS
        && !observations.some((o) => o.id === 'ooo-quiet:surface_oddity')) {
      const copy = OOO_DNA_COPY.decoyFriction(c.count, c.items.size);
      observations.push({
        id: 'ooo-decoy', kind: 'watch', pattern_id: 'surface_oddity',
        title: copy.title, body: copy.body,
        evidence: `${c.count} picks across ${c.items.size} items went to the planted decoy.`,
      });
    }
  }

  /* ---- relatedness vs belonging: the topical overlap split ---- */
  {
    const high = attempted.filter((r) => r.item.meta.difficulty_vector.topical_overlap >= OOO_FLOORS.HIGH_OVERLAP);
    const low = attempted.filter((r) => r.item.meta.difficulty_vector.topical_overlap <= OOO_FLOORS.LOW_OVERLAP);
    const accHigh = acc(high);
    const accLow = acc(low);
    if (high.length >= OOO_FLOORS.SPLIT_MIN && low.length >= OOO_FLOORS.SPLIT_MIN
        && accHigh !== null && accLow !== null) {
      if (accLow - accHigh >= OOO_FLOORS.SPLIT_GAP) {
        const copy = OOO_DNA_COPY.overlapFriction(pctText(accHigh), pctText(accLow));
        observations.push({
          id: 'ooo-split:overlap', kind: 'watch', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `${high.length} camouflaged items against ${low.length} low overlap ones.`,
        });
      } else if (accHigh >= OOO_FLOORS.STRENGTH_ACC) {
        const copy = OOO_DNA_COPY.overlapStrength();
        observations.push({
          id: 'ooo-split:overlap-strength', kind: 'strength', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `${pctText(accHigh)} across ${high.length} items where the intruder borrows the core's vocabulary.`,
        });
      }
    }
  }

  /* ---- coherence monitoring: the local/global locus split ---- */
  {
    const global = attempted.filter((r) => r.item.meta.difficulty_vector.violation_locus === 'global');
    const local = attempted.filter((r) => r.item.meta.difficulty_vector.violation_locus === 'local');
    const accGlobal = acc(global);
    const accLocal = acc(local);
    if (global.length >= OOO_FLOORS.SPLIT_MIN && local.length >= OOO_FLOORS.SPLIT_MIN
        && accGlobal !== null && accLocal !== null) {
      if (accLocal - accGlobal >= OOO_FLOORS.SPLIT_GAP) {
        const copy = OOO_DNA_COPY.globalFriction(pctText(accGlobal), pctText(accLocal));
        observations.push({
          id: 'ooo-split:locus', kind: 'watch', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `Globally alien intruders at ${pctText(accGlobal)} against ${pctText(accLocal)} when the break is local.`,
        });
      } else if (accGlobal >= OOO_FLOORS.STRENGTH_ACC) {
        const copy = OOO_DNA_COPY.globalStrength();
        observations.push({
          id: 'ooo-split:locus-strength', kind: 'strength', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `${pctText(accGlobal)} across ${global.length} items whose intruder is locally smooth.`,
        });
      }
    }
  }

  /* ---- candidate model: the builds are mostly true ---- */
  {
    const buildMisses = rows.filter((r) => r.is_correct === false && r.built);
    if (buildMisses.length >= OOO_FLOORS.BUILD_MISS_MIN) {
      const rate = buildMisses.reduce((n, r) => n + r.build_links_correct / 3, 0) / buildMisses.length;
      if (rate >= OOO_FLOORS.BUILD_RATE) {
        const copy = OOO_DNA_COPY.buildStrength(pctText(rate));
        observations.push({
          id: 'ooo-build', kind: 'strength', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `Across ${buildMisses.length} near misses, most of your built joins matched the author's.`,
        });
      }
    }
  }

  /* ---- candidate model: quick exclusions that did not hold ---- */
  {
    const fastMisses = rows.filter((r) => r.is_correct === false
      && r.time_ms > 0 && r.time_ms < OOO_FLOORS.FAST_MISS_MS);
    if (fastMisses.length >= OOO_FLOORS.FAST_MISS_MIN) {
      const copy = OOO_DNA_COPY.fastMissWatch(fastMisses.length);
      observations.push({
        id: 'ooo-pace', kind: 'watch', pattern_id: null,
        title: copy.title, body: copy.body,
        evidence: `${fastMisses.length} exclusions made within ${Math.round(OOO_FLOORS.FAST_MISS_MS / 1000)} seconds that did not hold.`,
      });
    }
  }

  /* growth first, then strengths, then watches — stable within kinds. */
  const rank = { growth: 0, strength: 1, watch: 2 };
  observations.sort((a, b) => rank[a.kind] - rank[b.kind] || a.id.localeCompare(b.id));

  return {
    sessionsSeen: oooSessions.length,
    ready: observations.length > 0,
    dominant: oooDominantMistake(rows),
    observations,
  };
}
