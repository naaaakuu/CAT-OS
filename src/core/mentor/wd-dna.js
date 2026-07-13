/**
 * wd-dna.js — Reading DNA for Word DNA: how this person decodes words.
 * Pure logic, no DOM, no storage.
 *
 * Implements WORD_DNA_BIBLE §5: exactly four bounded traits, each
 * derived from a distinct behavioral signal and gated behind an
 * evidence floor so the mentor never speaks from noise. Do not add a
 * fifth trait here — the Bible explains why the brief's other three
 * candidates collapse into these four.
 *
 * Same contract as dna.js and pj-dna.js: same history in, same
 * observations out. Observation kinds: growth (celebrate first) ·
 * strength · watch.
 */

import { WD_DNA_COPY } from './wd-voice.js';

/* Evidence floors — exported so tools/verify.mjs can test the gates. */
export const WD_FLOORS = Object.freeze({
  ROOT_MIN: 3,      // root/prefix/suffix Predict answers before Root Recognition speaks
  TRANSFER_MIN: 3,  // root/prefix/suffix Apply answers before Meaning Transfer speaks
  CONTEXT_MIN: 3,   // foreign/cat_vocab choices (Predict + Apply) before Context Calibration speaks
  STRENGTH_ACC: 0.8,
  WATCH_ACC: 0.6,
  FLUENCY_MIN: 4,   // distinct root/prefix/suffix UNITS attempted before Family Fluency speaks
  FLUENCY_GAIN: 0.2,
});

const SHARED_MEANING_KINDS = ['root', 'prefix', 'suffix'];
const NO_SHARED_MEANING_KINDS = ['foreign', 'cat_vocab'];

/** Flatten WD sessions into enriched per-item rows joined to content.
 *  Rows for units that aren't loadable are skipped, silently. */
export function enrichWDAnswers(sessions, items) {
  const rows = [];
  for (const s of sessions) {
    if (s.module !== 'wd' || !Array.isArray(s.answers)) continue;
    for (const a of s.answers) {
      const item = items.get(a.item_id ?? a.question_id);
      if (!item) continue;
      rows.push({
        session_id: s.id,
        item_id: item.meta.id,
        kind: item.meta.kind,
        finished_at: s.finished_at,
        predict: a.predict,
        applies: a.applies ?? [],
        is_correct: a.is_correct,
        time_ms: a.time_ms,
        item,
      });
    }
  }
  return rows;
}

const pctText = (fraction) => `${Math.round(fraction * 100)}%`;

/** Fraction true over a list that may contain nulls (unattempted); null if nothing attempted. */
function rateOf(bools) {
  const attempted = bools.filter((b) => b !== null && b !== undefined);
  if (attempted.length === 0) return null;
  return attempted.filter(Boolean).length / attempted.length;
}

/**
 * Derive the learner's Word DNA.
 * @param {Array} sessions stored session records (any modules; wd picked out)
 * @param {Map}   items    item_id -> loaded Word DNA content item
 */
export function deriveWDDNA(sessions, items) {
  const wdSessions = sessions
    .filter((s) => s.module === 'wd')
    .sort((a, b) => a.finished_at.localeCompare(b.finished_at));
  const rows = enrichWDAnswers(wdSessions, items);
  const observations = [];

  const sharedRows = rows.filter((r) => SHARED_MEANING_KINDS.includes(r.kind));
  const noSharedRows = rows.filter((r) => NO_SHARED_MEANING_KINDS.includes(r.kind));

  /* ---- Root Recognition: Predict accuracy on root/prefix/suffix units ---- */
  {
    const bools = sharedRows.filter((r) => r.predict !== null).map((r) => r.predict.is_correct);
    const rate = bools.length >= WD_FLOORS.ROOT_MIN ? rateOf(bools) : null;
    if (rate !== null) {
      if (rate >= WD_FLOORS.STRENGTH_ACC) {
        const copy = WD_DNA_COPY.rootRecognitionStrength(pctText(rate), bools.length);
        observations.push({
          id: 'wd-root-recognition:strength', kind: 'strength', pattern_id: 'root_recognition',
          title: copy.title, body: copy.body, evidence: `${bools.length} root, prefix, and suffix predictions.`,
        });
      } else if (rate < WD_FLOORS.WATCH_ACC) {
        const copy = WD_DNA_COPY.rootRecognitionWatch(pctText(rate), bools.length);
        observations.push({
          id: 'wd-root-recognition:watch', kind: 'watch', pattern_id: 'root_recognition',
          title: copy.title, body: copy.body, evidence: `${bools.length} root, prefix, and suffix predictions.`,
        });
      }
    }
  }

  /* ---- Meaning Transfer: Apply accuracy on root/prefix/suffix units —
     the signature trait (WORD_DNA_BIBLE §5): applying a just-taught
     root to a word never shown before. ---- */
  {
    const bools = sharedRows.flatMap((r) => r.applies.filter((a) => a !== null).map((a) => a.is_correct));
    const rate = bools.length >= WD_FLOORS.TRANSFER_MIN ? rateOf(bools) : null;
    if (rate !== null) {
      if (rate >= WD_FLOORS.STRENGTH_ACC) {
        const copy = WD_DNA_COPY.transferStrength(pctText(rate), bools.length);
        observations.push({
          id: 'wd-transfer:strength', kind: 'strength', pattern_id: 'meaning_transfer',
          title: copy.title, body: copy.body, evidence: `${bools.length} never-taught words applied.`,
        });
      } else if (rate < WD_FLOORS.WATCH_ACC) {
        const copy = WD_DNA_COPY.transferWatch(pctText(rate), bools.length);
        observations.push({
          id: 'wd-transfer:watch', kind: 'watch', pattern_id: 'meaning_transfer',
          title: copy.title, body: copy.body, evidence: `${bools.length} never-taught words applied.`,
        });
      }
    }
  }

  /* ---- Context Calibration: Predict + Apply accuracy on foreign/cat_vocab
     units, where every choice is a meaning-in-context judgment
     (WORD_DNA_BIBLE §3a, mirroring CAT_VARC_BIBLE §21). ---- */
  {
    const bools = [
      ...noSharedRows.filter((r) => r.predict !== null).map((r) => r.predict.is_correct),
      ...noSharedRows.flatMap((r) => r.applies.filter((a) => a !== null).map((a) => a.is_correct)),
    ];
    const rate = bools.length >= WD_FLOORS.CONTEXT_MIN ? rateOf(bools) : null;
    if (rate !== null) {
      if (rate >= WD_FLOORS.STRENGTH_ACC) {
        const copy = WD_DNA_COPY.contextStrength(pctText(rate), bools.length);
        observations.push({
          id: 'wd-context:strength', kind: 'strength', pattern_id: 'context_calibration',
          title: copy.title, body: copy.body, evidence: `${bools.length} in-context choices.`,
        });
      } else if (rate < WD_FLOORS.WATCH_ACC) {
        const copy = WD_DNA_COPY.contextWatch(pctText(rate), bools.length);
        observations.push({
          id: 'wd-context:watch', kind: 'watch', pattern_id: 'context_calibration',
          title: copy.title, body: copy.body, evidence: `${bools.length} in-context choices.`,
        });
      }
    }
  }

  /* ---- Family Fluency: does Predict accuracy on root/prefix/suffix
     units improve from the learner's earliest families to their most
     recent, across sessions (not just within one)? ---- */
  {
    const byUnitFirstSeen = new Map();
    for (const r of sharedRows) {
      if (r.predict === null || byUnitFirstSeen.has(r.item_id)) continue;
      byUnitFirstSeen.set(r.item_id, r.predict.is_correct);
    }
    const ordered = [...byUnitFirstSeen.values()];
    if (ordered.length >= WD_FLOORS.FLUENCY_MIN) {
      const half = Math.floor(ordered.length / 2);
      const early = ordered.slice(0, half);
      const late = ordered.slice(-half);
      const earlyRate = rateOf(early);
      const lateRate = rateOf(late);
      if (earlyRate !== null && lateRate !== null && lateRate - earlyRate >= WD_FLOORS.FLUENCY_GAIN) {
        const copy = WD_DNA_COPY.familyFluency(pctText(earlyRate), pctText(lateRate));
        observations.push({
          id: 'wd-family-fluency', kind: 'growth', pattern_id: 'family_fluency',
          title: copy.title, body: copy.body,
          evidence: `Your first ${early.length} families against your latest ${late.length}.`,
        });
      }
    }
  }

  /* growth first, then strengths, then watches — stable within kinds. */
  const rank = { growth: 0, strength: 1, watch: 2 };
  observations.sort((a, b) => rank[a.kind] - rank[b.kind] || a.id.localeCompare(b.id));

  return {
    sessionsSeen: wdSessions.length,
    ready: observations.length > 0,
    observations,
  };
}
