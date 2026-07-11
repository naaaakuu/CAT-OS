/**
 * teach.js — renders the Para Summary teaching layer: HTML builders
 * shared by the session screen (right after answering) and the learn
 * screen (any time later). No storage, no listeners; pure HTML from
 * a loaded item + an optional answer record.
 *
 * The answer experience is never "correct" or "not correct" alone
 * (PARA SUMMARY BIBLE §13, Learning Mentor): it teaches, in order,
 *
 *   1. What the paragraph actually says — the paragraph gently
 *      compresses into the author's point, with the thesis sentence
 *      highlighted when one exists.
 *   2. Why the best answer holds — the meaning-preservation test (§3),
 *      applied and stated.
 *   3. Why every other option fails — each with its distortion
 *      archetype named (§7) and the way of reading that produces it (§6).
 *   4. Make it a habit — one transferable move.
 *
 * Explanations grow richer with the tier (never overwhelm beginners):
 * the sentence anatomy joins from Advanced, the thinking pattern lines
 * from Medium, and the separating element at the elite tiers.
 */

import { escapeHTML } from '../../../core/utils/format.js';
import { PS_TRAP_PATTERNS } from '../../../core/mentor/ps-voice.js';
import { tierIndex } from './tiers.js';

const ARCHITECTURE_LABELS = Object.freeze({
  claim_support_restatement: 'Claim, support, restatement',
  concession_turn_thesis: 'Concession, turn, thesis',
  problem_analysis_implication: 'Problem, analysis, implication',
  two_views_adjudication: 'Two views, a verdict',
  cause_effect_conclusion: 'Cause, effect, conclusion',
  observation_explanation_generalization: 'Observation, explanation, generalization',
  phenomenon_mechanism_significance: 'Phenomenon, mechanism, significance',
});

export function architectureLabel(architecture) {
  return ARCHITECTURE_LABELS[architecture] ?? architecture.replaceAll('_', ' ');
}

const ROLE_LABELS = Object.freeze({
  thesis: 'the claim',
  support: 'supporting claim',
  evidence: 'evidence',
  example: 'example',
  concession: 'a conceded view',
  setup: 'setup',
  conclusion: 'conclusion',
  restatement: 'restatement',
  qualification: 'a qualifier',
  question: 'the question posed',
});

export function archetypeName(archetype) {
  return PS_TRAP_PATTERNS[archetype]?.name ?? archetype.replaceAll('_', ' ');
}

/** How much teaching this tier reveals (1..4). */
export function teachDepth(tierId) {
  const i = tierIndex(tierId);
  if (i <= 1) return 1;      // foundation, easy
  if (i === 2) return 2;     // medium
  if (i <= 4) return 3;      // advanced, cat
  return 4;                  // cat-plus, ninety-nine, premium
}

function block(title, bodyHTML) {
  return `
    <div class="psx__block">
      <div class="psx__label">${escapeHTML(title)}</div>
      ${bodyHTML}
    </div>`;
}

/** Layer 1 — the paragraph compresses into its point. The thesis
 *  sentence (when explicit) carries a soft highlight; the ideal
 *  summary settles in beneath it. */
export function renderCompression(item, { depth }) {
  const showRoles = depth >= 3;
  const sentences = item.paragraph.sentences.map((s) => {
    const cls = s.role === 'thesis' ? 'psx__sentence psx__sentence--thesis' : 'psx__sentence';
    const role = showRoles
      ? `<span class="psx__role">${escapeHTML(ROLE_LABELS[s.role] ?? s.role)}</span>`
      : '';
    return `<span class="${cls}">${escapeHTML(s.text)}${role}</span>`;
  }).join(' ');

  const implicitNote = item.paragraph.sentences.some((s) => s.role === 'thesis')
    ? ''
    : `<p class="psx__implicit">No single sentence states the point here. The author leaves
       it for you to assemble, which is exactly what the summary does.</p>`;

  return block('What the paragraph actually says', `
    <p class="psx__paragraph">${sentences}</p>
    ${implicitNote}
    <div class="psx__compress" aria-hidden="true">
      <span class="psx__compress-line"></span><span class="psx__compress-glyph">⌄</span><span class="psx__compress-line"></span>
    </div>
    <p class="psx__ideal">${escapeHTML(item.ideal_summary)}</p>
    <p class="psx__meaning">${escapeHTML(item.question.explanation.paragraph_meaning)}</p>
  `);
}

/** Layer 2 — why the best answer preserves the author's meaning. */
export function renderWhyBest(item) {
  const q = item.question;
  return block('Why the best answer holds', `
    <div class="psx__best">
      <span class="psx__best-letter">${escapeHTML(q.correct)}</span>
      <p class="psx__best-text">${escapeHTML(q.options[q.correct])}</p>
    </div>
    <p>${escapeHTML(q.explanation.correct_reasoning)}</p>
    <p class="psx__test">The test it passes: the author would read this and say,
    that is my point, at my strength, and no wider than I claimed.</p>
  `);
}

/** Layer 3 — every wrong option, its distortion named. */
export function renderDistractors(item, answer, { depth }) {
  const chosen = answer?.chosen ?? null;
  return block('Why the others were built to tempt you', `
    ${item.question.explanation.distractors.map((d) => {
      const yours = d.option === chosen;
      const pattern = PS_TRAP_PATTERNS[d.archetype];
      const second = depth >= 4 && d.secondary_archetype
        ? `<span class="psx__device">and ${escapeHTML(archetypeName(d.secondary_archetype).toLowerCase())}</span>`
        : '';
      return `
      <div class="psx__distractor ${yours ? 'is-yours' : ''}">
        <div class="psx__link-head">
          <span class="psx__distractor-letter">${escapeHTML(d.option)}</span>
          <span class="psx__device">${escapeHTML((pattern?.name ?? d.archetype).toLowerCase())}</span>
          ${second}
          ${yours ? '<span class="psx__yours">your pick</span>' : ''}
        </div>
        <p>${escapeHTML(d.why_wrong)}</p>
        <p class="psx__lure">Feels right because: ${escapeHTML(d.seductive_element)}</p>
        ${depth >= 2 ? `<p class="psx__thinking">The way of reading behind it: ${escapeHTML(d.thinking_mistake)}</p>` : ''}
      </div>`;
    }).join('')}
  `);
}

/** Elite layer — the separating element, named in one sentence. */
export function renderSeparating(item) {
  if (!item.meta.separating_element) return '';
  return block('The one element that decided it', `
    <p class="psx__separating">${escapeHTML(item.meta.separating_element)}</p>
  `);
}

/** The shape and the apex, for readers past the foundation tiers. */
export function renderAnatomy(item) {
  const m = item.meta;
  const loadBearing = m.load_bearing.length
    ? `<p class="psx__loadbearing">Load bearing words here:
        ${m.load_bearing.map((w) => `<span class="psx__word">${escapeHTML(w)}</span>`).join(' ')}</p>`
    : '';
  return block('The shape underneath', `
    <span class="psx__chip">${escapeHTML(architectureLabel(m.architecture))}</span>
    <p>The apex claim: ${escapeHTML(m.apex.claim)}</p>
    <p class="psx__apexline">Its reach: ${escapeHTML(m.apex.scope)}</p>
    ${loadBearing}
  `);
}

/** Layer 4 — the one transferable habit. */
export function renderHabit(item) {
  return `
    <div class="psx__habit">
      <span class="psx__habit-glyph" aria-hidden="true">◎</span>
      <div>
        <div class="psx__habit-label">Make it a habit</div>
        <p>${escapeHTML(item.question.explanation.reading_habit)}</p>
      </div>
    </div>`;
}

/** The takeaway, kept last so it is what lingers. */
export function renderTakeaway(item) {
  return `<blockquote class="mentor__keep psx__takeaway">${escapeHTML(item.mentor.takeaway)}</blockquote>`;
}

/** The full teaching layer, in Bible order, revealed by tier depth. */
export function renderTeaching(item, answer) {
  const depth = teachDepth(item.meta.tier);
  return `
    <div class="psx">
      ${renderCompression(item, { depth })}
      ${renderWhyBest(item)}
      ${renderDistractors(item, answer, { depth })}
      ${depth >= 4 ? renderSeparating(item) : ''}
      ${depth >= 3 ? renderAnatomy(item) : ''}
      ${renderHabit(item)}
      ${renderTakeaway(item)}
    </div>`;
}
