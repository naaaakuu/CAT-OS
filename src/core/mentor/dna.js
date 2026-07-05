/**
 * dna.js — the Reading DNA engine: how this person reads.
 *
 * Pure logic, no DOM, no storage. Input is stored sessions plus the
 * passages they were read from (a Map by id, loaded by the caller);
 * output is a small set of OBSERVATIONS — never judgments — each one
 * evidence-gated behind explicit minimum sample sizes, so the mentor
 * never pretends to see a pattern in noise. Everything here is
 * deterministic: same history in, same observations out.
 *
 * Observation kinds:
 *   growth   — a pattern that has gone quiet (celebrate first)
 *   strength — something reliably working (always shown when earned)
 *   watch    — a pull worth naming (capped; one is enough to act on)
 */

import { TRAP_PATTERNS, TYPE_LABELS, DNA_COPY } from './voice.js';

/* Evidence floors — exported so tools/verify.mjs can test the gates. */
export const FLOORS = Object.freeze({
  TRAP_MIN: 3,          // occurrences before a trap affinity is named
  TRAP_MIN_PASSAGES: 2, // ...across at least this many passages
  TYPE_MIN: 4,          // attempts before a question type is discussed
  TYPE_FRICTION_ACC: 0.5,
  TYPE_STRENGTH_ACC: 0.8,
  OVERTHINK_RATIO: 1.5, // vs the reader's own median question time
  ENDING_MIN: 3,        // sessions before the ending-rush observation
  ENDING_RATIO: 0.6,
  FASTPASS_MIN: 3,      // sessions before the first-pass observation
  FASTPASS_RATIO: 0.65,
  FASTPASS_ACC: 0.75,
  QUIET_RECENT: 3,      // clean recent sessions to call a trap quiet
  EVENING_MIN: 3,       // sessions on each side of the comparison
  EVENING_GAP: 0.15,
});

/** Flatten sessions into enriched per-question rows joined to content.
 *  Rows for passages that aren't loadable are skipped, silently —
 *  observations only ever rest on evidence we can still show. */
export function enrichAnswers(sessions, passages) {
  const rows = [];
  for (const s of sessions) {
    const item = passages.get(s.passage_id);
    if (!item) continue;
    const byId = new Map(item.questions.map((q) => [q.id, q]));
    s.answers.forEach((a, index) => {
      const q = byId.get(a.question_id);
      if (!q) return;
      let trap = null;
      if (a.chosen && a.is_correct === false) {
        trap = q.explanation.distractors.find((d) => d.option === a.chosen)?.trap_type ?? null;
      }
      rows.push({
        session_id: s.id,
        passage_id: s.passage_id,
        finished_at: s.finished_at,
        index,
        last: index === s.answers.length - 1,
        question_id: a.question_id,
        type: q.type,
        chosen: a.chosen,
        is_correct: a.is_correct,
        time_ms: a.time_ms,
        trap,
      });
    });
  }
  return rows;
}

/** trap_type -> { count, passages:Set, lastSession } for not-correct picks. */
export function trapCounts(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r.trap) continue;
    const cur = map.get(r.trap) ?? { count: 0, passages: new Set(), sessions: [] };
    cur.count += 1;
    cur.passages.add(r.passage_id);
    cur.sessions.push(r.session_id);
    map.set(r.trap, cur);
  }
  return map;
}

/** The single most frequent trap that clears the evidence floor, or null. */
export function dominantTrap(rows) {
  let best = null;
  for (const [trap, c] of trapCounts(rows)) {
    if (c.count < FLOORS.TRAP_MIN || c.passages.size < FLOORS.TRAP_MIN_PASSAGES) continue;
    if (!best || c.count > best.count || (c.count === best.count && trap < best.trap)) {
      best = { trap, count: c.count, passages: c.passages.size };
    }
  }
  return best;
}

const median = (nums) => {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const pctText = (fraction) => `${Math.round(fraction * 100)}%`;

/**
 * Derive the reader's DNA.
 * @param {Array} sessions   stored session records (any order)
 * @param {Map}   passages   passage_id -> loaded content item
 * @returns {{sessionsSeen:number, ready:boolean, needed:number,
 *            dominant:object|null, frictionTypes:string[],
 *            observations:Array}}
 */
export function deriveDNA(sessions, passages) {
  const ordered = [...sessions].sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  const rows = enrichAnswers(ordered, passages);
  const observations = [];
  const frictionTypes = [];

  const answered = rows.filter((r) => r.is_correct !== null);
  const overallMedian = median(answered.map((r) => r.time_ms).filter((t) => t > 0));
  const recentSessionIds = ordered.slice(-FLOORS.QUIET_RECENT).map((s) => s.id);

  /* ---- growth: traps gone quiet ---- */
  if (ordered.length > FLOORS.QUIET_RECENT) {
    for (const [trap, c] of [...trapCounts(rows)].sort((a, b) => a[0].localeCompare(b[0]))) {
      const pattern = TRAP_PATTERNS[trap];
      if (!pattern || c.count < FLOORS.TRAP_MIN) continue;
      const recentHits = c.sessions.filter((id) => recentSessionIds.includes(id)).length;
      if (recentHits === 0) {
        const copy = DNA_COPY.trapQuiet(pattern.name, FLOORS.QUIET_RECENT);
        observations.push({
          id: `quiet:${trap}`, kind: 'growth', pattern_id: trap,
          title: copy.title, body: copy.body,
          evidence: `Appeared ${c.count} times before; none in your last ${FLOORS.QUIET_RECENT} sessions.`,
        });
      }
    }
  }

  /* ---- per-question-type strengths and frictions ---- */
  const byType = new Map();
  for (const r of answered) {
    const cur = byType.get(r.type) ?? { n: 0, correct: 0, time: 0 };
    cur.n += 1;
    cur.correct += r.is_correct ? 1 : 0;
    cur.time += r.time_ms;
    byType.set(r.type, cur);
  }
  for (const [type, t] of [...byType].sort((a, b) => a[0].localeCompare(b[0]))) {
    if (t.n < FLOORS.TYPE_MIN) continue;
    const acc = t.correct / t.n;
    const label = TYPE_LABELS[type] ?? type.replaceAll('_', ' ');
    if (acc >= FLOORS.TYPE_STRENGTH_ACC) {
      const copy = DNA_COPY.typeStrength(label, pctText(acc), t.n);
      observations.push({
        id: `strength:${type}`, kind: 'strength', pattern_id: null,
        title: copy.title, body: copy.body,
        evidence: `${t.correct} of ${t.n} across your reading so far.`,
      });
    } else if (acc <= FLOORS.TYPE_FRICTION_ACC) {
      frictionTypes.push(type);
      const slow = overallMedian > 0 && t.time / t.n >= FLOORS.OVERTHINK_RATIO * overallMedian;
      const copy = slow
        ? DNA_COPY.overthink(label)
        : DNA_COPY.typeFriction(label, pctText(acc), t.n);
      observations.push({
        id: `friction:${type}`, kind: 'watch', pattern_id: null,
        title: copy.title, body: copy.body,
        evidence: `${t.correct} of ${t.n} so far${slow ? ', with well over your usual time on each' : ''}.`,
      });
    }
  }

  /* ---- trap affinities (the named pulls) ---- */
  const dom = dominantTrap(rows);
  for (const [trap, c] of [...trapCounts(rows)].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))) {
    const pattern = TRAP_PATTERNS[trap];
    if (!pattern) continue;
    if (c.count < FLOORS.TRAP_MIN || c.passages.size < FLOORS.TRAP_MIN_PASSAGES) continue;
    if (observations.some((o) => o.id === `quiet:${trap}`)) continue; // quiet wins
    const copy = DNA_COPY.trapAffinity(pattern.name, c.count, c.passages.size);
    observations.push({
      id: `trap:${trap}`, kind: 'watch', pattern_id: trap,
      title: copy.title, body: copy.body,
      evidence: `Seen ${c.count} times across ${c.passages.size} passages.`,
    });
  }

  /* ---- ending rush ---- */
  {
    let rushed = 0;
    let rushedMissed = 0;
    for (const s of ordered) {
      const times = s.answers.map((a) => a.time_ms).filter((t) => t > 0);
      if (times.length < 3) continue;
      const m = median(times);
      const lastA = s.answers[s.answers.length - 1];
      if (lastA.time_ms > 0 && lastA.time_ms < FLOORS.ENDING_RATIO * m) {
        rushed += 1;
        if (lastA.is_correct !== true) rushedMissed += 1;
      }
    }
    if (rushed >= FLOORS.ENDING_MIN && rushedMissed * 2 >= rushed) {
      const copy = DNA_COPY.endingRush(rushed);
      observations.push({
        id: 'pace:ending', kind: 'watch', pattern_id: null,
        title: copy.title, body: copy.body,
        evidence: `${rushed} sessions ended on your quickest answer of the set.`,
      });
    }
  }

  /* ---- fast first pass ---- */
  {
    let quick = 0;
    for (const s of ordered) {
      const item = passages.get(s.passage_id);
      const estimate = (item?.passage.reading_time_min ?? 0) * 60000;
      if (!estimate) continue;
      const questionTime = s.answers.reduce((n, a) => n + a.time_ms, 0);
      const readingTime = Math.max(0, s.duration_ms - questionTime);
      if (readingTime < FLOORS.FASTPASS_RATIO * estimate
          && s.score.attempted > 0 && s.score.accuracy < FLOORS.FASTPASS_ACC) {
        quick += 1;
      }
    }
    if (quick >= FLOORS.FASTPASS_MIN) {
      const copy = DNA_COPY.fastFirstPass(quick);
      observations.push({
        id: 'pace:firstpass', kind: 'watch', pattern_id: null,
        title: copy.title, body: copy.body,
        evidence: `${quick} sessions read well under the passage's own estimate, with room left in the answers.`,
      });
    }
  }

  /* ---- time of day (very gently, high floor) ---- */
  {
    const late = [];
    const day = [];
    for (const s of ordered) {
      if (s.score.attempted === 0) continue;
      const hour = new Date(s.started_at).getHours();
      (hour >= 21 || hour < 4 ? late : day).push(s.score.accuracy);
    }
    if (late.length >= FLOORS.EVENING_MIN && day.length >= FLOORS.EVENING_MIN) {
      const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
      const gap = avg(day) - avg(late);
      if (gap >= FLOORS.EVENING_GAP) {
        const copy = DNA_COPY.evening(pctText(gap));
        observations.push({
          id: 'pace:evening', kind: 'watch', pattern_id: null,
          title: copy.title, body: copy.body,
          evidence: `${late.length} late sessions against ${day.length} earlier ones.`,
        });
      }
    }
  }

  /* Order: growth first (always celebrate change), then strengths,
     then watches — stable within kinds. */
  const rank = { growth: 0, strength: 1, watch: 2 };
  observations.sort((a, b) => rank[a.kind] - rank[b.kind] || a.id.localeCompare(b.id));

  return {
    sessionsSeen: ordered.length,
    ready: observations.length > 0,
    needed: Math.max(0, 2 - ordered.length),
    dominant: dom,
    frictionTypes,
    observations,
  };
}
