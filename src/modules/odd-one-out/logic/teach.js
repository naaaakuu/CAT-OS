/**
 * teach.js — renders the Odd One Out teaching layer: HTML builders
 * shared by the session screen (right after answering) and the learn
 * screen (any time later). No storage, no listeners; pure HTML from
 * a loaded item + an optional answer record.
 *
 * The answer experience is never a bare verdict (ODD_MAN_OUT_BIBLE
 * §12, and the owner's brief). It teaches, in order:
 *
 *   1. The paragraph the four sentences build — the core assembled as
 *      readable prose (the four gently join), with its spine named.
 *   2. Each sentence, doing its job — the discourse role rail, with
 *      the cohesive tie between each pair of neighbours named.
 *   3. Why one sentence stands apart — the outlier visibly separates,
 *      its violation type named, and the reason it cannot attach.
 *   4. The trap, exposed — why the outlier looked like it belonged,
 *      and, when the learner excluded a belonging sentence, the exact
 *      way of reading that produced the pick, named from §7.
 *   5. Make it a habit — one transferable move, then the takeaway.
 *
 * Explanations grow richer with the tier (never overwhelm beginners):
 * tie names join from Medium, the cohesion and locus anatomy from
 * Advanced, the full difficulty anatomy at the elite tiers.
 */

import { escapeHTML } from '../../../core/utils/format.js';
import { OOO_TRAP_PATTERNS, OOO_VIOLATION_PATTERNS, OOO_TIE_LABELS } from '../../../core/mentor/ooo-voice.js';
import { tierIndex } from './tiers.js';

const SPINE_LABELS = Object.freeze({
  narrative: 'A story, told in order',
  argument: 'An argument, built step by step',
  expository: 'An explanation, unfolding',
  descriptive: 'A picture, painted in layers',
});

export function spineLabel(spine) {
  return SPINE_LABELS[spine] ?? spine;
}

const ROLE_LABELS = Object.freeze({
  topic: 'opens the topic',
  background: 'lays the background',
  development: 'develops the idea',
  example: 'gives the example',
  contrast: 'turns against it',
  concession: 'concedes a point',
  evidence: 'brings the evidence',
  cause_effect: 'traces cause to effect',
  definition: 'fixes a definition',
  conclusion: 'closes the thought',
  restatement: 'restates the point',
  question: 'poses the question',
  answer: 'answers it',
});

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role.replaceAll('_', ' ');
}

export function violationName(type) {
  return OOO_VIOLATION_PATTERNS[type]?.name ?? type.replaceAll('_', ' ');
}

export function mistakeName(type) {
  return OOO_TRAP_PATTERNS[type]?.name ?? type.replaceAll('_', ' ');
}

/** How much teaching this tier reveals (1..4). */
export function teachDepth(tierId) {
  const i = tierIndex(tierId);
  if (i <= 1) return 1;      // foundation, easy
  if (i === 2) return 2;     // medium
  if (i <= 4) return 3;      // advanced, cat
  return 4;                  // cat-plus, ninety-nine, premium
}

const bySentence = (item) => new Map(item.sentences.map((s) => [s.label, s]));

function block(title, bodyHTML) {
  return `
    <div class="oox__block">
      <div class="oox__label">${escapeHTML(title)}</div>
      ${bodyHTML}
    </div>`;
}

/** Layer 1 — the four join into the paragraph they always were. */
export function renderCore(item) {
  const map = bySentence(item);
  const sentences = item.core_order.map((l, i) =>
    `<span class="oox__joined" style="animation-delay: ${120 + i * 160}ms">${escapeHTML(map.get(l).text)}</span>`
  ).join(' ');
  return block('The paragraph the four sentences build', `
    <span class="oox__chip">${escapeHTML(spineLabel(item.meta.spine_type))}</span>
    <p class="oox__paragraph">${sentences}</p>
    <p class="oox__sequence">The paragraph: ${escapeHTML(item.core_order.join(' '))} · standing apart: ${escapeHTML(item.outlier)}</p>
    <p>${escapeHTML(item.explanation.spine_note)}</p>
  `);
}

/** Layer 2 — the discourse role rail, ties named between neighbours. */
export function renderRoles(item, { depth }) {
  const map = bySentence(item);
  const links = item.explanation.links;
  return block('Each sentence, doing its job', `
    <ol class="journey">
      ${item.explanation.core_roles.map((r, i) => {
        const s = map.get(r.label);
        const opening = String(s.text).split(/\s+/).slice(0, 8).join(' ');
        const tie = i > 0 && depth >= 2 ? links[i - 1] : null;
        return `
        <li data-n="${i + 1}">
          ${tie ? `<p class="oox__tie">joined by ${escapeHTML(OOO_TIE_LABELS[tie.tie] ?? tie.tie)}: ${escapeHTML(tie.explanation)}</p>` : ''}
          <div class="role">Sentence ${escapeHTML(r.label)} · ${escapeHTML(roleLabel(r.role))}</div>
          <span class="opening">“${escapeHTML(opening)}…”</span>
          <p class="note">${escapeHTML(r.why_here)}</p>
        </li>`;
      }).join('')}
    </ol>
  `);
}

/** Layer 3 — the outlier separates, and its crime is named. */
export function renderViolation(item, answer) {
  const map = bySentence(item);
  const chosen = answer?.chosen ?? null;
  const yourPick = chosen === item.outlier;
  return block('Why one sentence stands apart', `
    <div class="oox__outlier ${yourPick ? 'is-yours-right' : ''}">
      <div class="oox__link-head">
        <span class="oox__outlier-letter">${escapeHTML(item.outlier)}</span>
        <span class="oox__device">${escapeHTML(violationName(item.meta.violation_type).toLowerCase())}</span>
        ${yourPick ? '<span class="oox__had">your pick</span>' : ''}
      </div>
      <p class="oox__outlier-text">${escapeHTML(map.get(item.outlier).text)}</p>
    </div>
    <p>${escapeHTML(item.explanation.violation_named)}</p>
    <p><b>Why it cannot attach:</b> ${escapeHTML(item.explanation.why_it_breaks)}</p>
  `);
}

/** Layer 4 — the trap exposed; the learner's pick, named when astray. */
export function renderTrap(item, answer, { depth }) {
  const map = bySentence(item);
  const chosen = answer?.chosen ?? null;
  const astray = chosen !== null && chosen !== item.outlier;
  const analysis = astray
    ? item.explanation.exclusion_analysis.find((e) => e.label === chosen)
    : null;
  const pattern = analysis ? OOO_TRAP_PATTERNS[analysis.mistake_type] : null;
  return block('The trap, exposed', `
    <p>${escapeHTML(item.explanation.trap_exposed)}</p>
    ${analysis ? `
      <div class="oox__pick is-yours">
        <div class="oox__link-head">
          <span class="oox__outlier-letter">${escapeHTML(chosen)}</span>
          <span class="oox__device">${escapeHTML((pattern?.name ?? analysis.mistake_type).toLowerCase())}</span>
          <span class="oox__yours">your pick</span>
        </div>
        <p class="oox__pick-text">${escapeHTML(map.get(chosen).text)}</p>
        <p><b>Why it invited the exclusion:</b> ${escapeHTML(analysis.why_tempting)}</p>
        <p><b>What the paragraph loses without it:</b> ${escapeHTML(analysis.what_breaks)}</p>
        ${depth >= 2 && pattern ? `<p class="oox__thinking">The way of reading behind it: ${escapeHTML(pattern.notice)}</p>` : ''}
      </div>` : ''}
  `);
}

/** Elite layer — the item's difficulty anatomy, made visible. */
export function renderAnatomy(item, { depth }) {
  const v = item.meta.difficulty_vector;
  const ties = Object.entries(item.meta.cohesion_signals)
    .filter(([, present]) => present)
    .map(([tie]) => OOO_TIE_LABELS[tie === 'lexical_overlap' ? 'lexical' : tie] ?? tie.replaceAll('_', ' '));
  const locus = v.violation_locus === 'global'
    ? 'The intruder is locally smooth and globally alien, the hardest regime this type has.'
    : v.violation_locus === 'local'
      ? 'The intruder breaks a visible local link, which a tie check catches.'
      : 'The intruder frays both a local link and the global purpose.';
  const overlapDots = '●'.repeat(v.topical_overlap) + '○'.repeat(5 - v.topical_overlap);
  return block('The anatomy underneath', `
    <p class="oox__anatomy-line">Camouflage <span class="oox__dots" aria-label="topical overlap ${v.topical_overlap} of 5">${overlapDots}</span>
      · the outlier shares ${v.topical_overlap >= 4 ? 'nearly everything' : v.topical_overlap >= 3 ? 'much' : 'little'} of the core's surface.</p>
    <p class="oox__anatomy-line">${escapeHTML(locus)}</p>
    ${depth >= 4 && ties.length ? `<p class="oox__anatomy-line">Ties binding the core: ${escapeHTML(ties.join(' · '))}.</p>` : ''}
  `);
}

/** The one transferable habit. */
export function renderHabit(item) {
  return `
    <div class="oox__habit">
      <span class="oox__habit-glyph" aria-hidden="true">◎</span>
      <div>
        <div class="oox__habit-label">Make it a habit</div>
        <p>${escapeHTML(item.explanation.detection_habit)}</p>
      </div>
    </div>`;
}

/** The takeaway, kept last so it is what lingers. */
export function renderTakeaway(item) {
  return `<blockquote class="mentor__keep oox__takeaway">${escapeHTML(item.mentor.takeaway)}</blockquote>`;
}

/** The full teaching layer, in Bible §12 order, revealed by tier depth. */
export function renderTeaching(item, answer) {
  const depth = teachDepth(item.meta.tier);
  return `
    <div class="oox">
      ${renderCore(item)}
      ${renderRoles(item, { depth })}
      ${renderViolation(item, answer)}
      ${renderTrap(item, answer, { depth })}
      ${depth >= 3 ? renderAnatomy(item, { depth }) : ''}
      ${renderHabit(item)}
      ${renderTakeaway(item)}
    </div>`;
}
