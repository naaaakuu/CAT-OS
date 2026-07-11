/**
 * teach.js — renders the Para Jumbles teaching layer: HTML builders
 * shared by the session screen (right after submitting) and the learn
 * screen (any time later). No storage, no listeners; pure HTML from
 * a loaded item + an optional answer record.
 *
 * Implements the four explanation layers of PARA_JUMBLES_BIBLE §11 in
 * order, and never lets a signal be presented as a universal rule —
 * every link is shown WITH its reliability, in words.
 *
 *   1. The shape        — name the macro pattern first
 *   2. The author's moves — sentence by sentence, tied to meaning
 *   3. The tempting order — walked to where it breaks
 *   4. The trap, named   — as a reusable defense, plus one habit
 */

import { escapeHTML } from '../../../core/utils/format.js';
import { PJ_TRAP_PATTERNS, DEVICE_LABELS, RELIABILITY_LABELS } from '../../../core/mentor/pj-voice.js';

const MACRO_LABELS = Object.freeze({
  general_to_specific: 'General to specific',
  specific_to_general: 'Specific to general',
  abstract_to_concrete: 'Abstract to concrete',
  problem_solution: 'Problem, then solution',
  claim_evidence: 'Claim, then evidence',
  hypothesis_support: 'Hypothesis, then support',
  argumentative: 'Position, counter, resolution',
  narrative_chronological: 'A story in time order',
  question_answer: 'Question, then answer',
});

export function macroLabel(pattern) {
  return MACRO_LABELS[pattern] ?? pattern.replaceAll('_', ' ');
}

const bySentence = (item) => new Map(item.sentences.map((s) => [s.label, s]));

/** First words of a sentence, as a memory anchor. */
function opening(text, words = 8) {
  const parts = String(text).split(/\s+/);
  const head = parts.slice(0, words).join(' ');
  return parts.length > words ? `${head}…` : head;
}

function block(title, bodyHTML) {
  return `
    <div class="pjx__block">
      <div class="pjx__label">${escapeHTML(title)}</div>
      ${bodyHTML}
    </div>`;
}

/** The correct paragraph, assembled and readable — the learner should
 *  leave having READ the real paragraph, not just its letters. */
export function renderAssembled(item) {
  const map = bySentence(item);
  const text = item.correct_order.map((l) => map.get(l).text).join(' ');
  return block('The paragraph, as the author wrote it', `
    <p class="pjx__paragraph">${escapeHTML(text)}</p>
    <p class="pjx__sequence">The order: ${escapeHTML(item.correct_order.join(' '))}</p>
  `);
}

/** Layer 1 — the shape. */
export function renderShape(item) {
  return block('First, the shape', `
    <span class="pjx__chip">${escapeHTML(macroLabel(item.meta.macro_pattern))}</span>
    <p>${escapeHTML(item.explanation.macro_pattern_note)}</p>
  `);
}

/** Layer 2 — the author's moves, one per sentence in correct order. */
export function renderMoves(item) {
  const map = bySentence(item);
  return block('How the author moves', `
    <ol class="journey">
      ${item.explanation.movement.map((m, i) => {
        const s = map.get(m.label);
        return `
        <li data-n="${i + 1}">
          <div class="role">Sentence ${escapeHTML(m.label)} · ${escapeHTML(s.role.replaceAll('_', ' '))}</div>
          <span class="opening">“${escapeHTML(opening(s.text))}”</span>
          <p class="note">${escapeHTML(m.why_here)}</p>
        </li>`;
      }).join('')}
    </ol>
  `);
}

/** The links between neighbours, each with device + reliability. */
export function renderLinks(item, answer) {
  const got = new Map();
  if (answer && Array.isArray(answer.entered)) {
    for (let i = 0; i < item.correct_order.length - 1; i += 1) {
      const from = item.correct_order[i];
      const at = answer.entered.indexOf(from);
      got.set(`${from}→${item.correct_order[i + 1]}`,
        at !== -1 && answer.entered[at + 1] === item.correct_order[i + 1]);
    }
  }
  return block('The joins, one by one', `
    ${item.links.map((l) => {
      const key = `${l.from}→${l.to}`;
      const had = got.get(key);
      return `
      <div class="pjx__link ${had === true ? 'is-had' : ''}">
        <div class="pjx__link-head">
          <span class="pjx__pair">${escapeHTML(l.from)} → ${escapeHTML(l.to)}</span>
          <span class="pjx__device">${escapeHTML(DEVICE_LABELS[l.device] ?? l.device.replaceAll('_', ' '))}</span>
          ${had === true ? '<span class="pjx__had">you had this join</span>' : ''}
        </div>
        <p>${escapeHTML(l.explanation)}</p>
        <p class="pjx__reliability">${escapeHTML(RELIABILITY_LABELS[l.reliability])}</p>
      </div>`;
    }).join('')}
  `);
}

/** Layer 3 — the tempting wrong orders, walked to the break. */
export function renderTemptations(item, answer) {
  const enteredStr = answer && Array.isArray(answer.entered) ? answer.entered.join('') : null;
  return block('The order that wanted to be chosen', `
    ${item.explanation.tempting_orders.map((t) => {
      const yours = enteredStr === t.order;
      const trap = PJ_TRAP_PATTERNS[t.trap_type];
      return `
      <div class="pjx__tempt ${yours ? 'is-yours' : ''}">
        <div class="pjx__link-head">
          <span class="pjx__pair">${escapeHTML(t.order.split('').join(' '))}</span>
          <span class="pjx__device">${escapeHTML(trap ? trap.name.toLowerCase() : t.trap_type.replaceAll('_', ' '))}</span>
          ${yours ? '<span class="pjx__yours">your order</span>' : ''}
        </div>
        <p><b>Why it tempts:</b> ${escapeHTML(t.why_tempting)}</p>
        <p><b>Where it breaks:</b> ${escapeHTML(t.where_it_breaks)}</p>
      </div>`;
    }).join('')}
  `);
}

/** Layer 4 — the trap named as a defense, plus the one habit. */
export function renderTrap(item) {
  const trap = item.meta.primary_trap !== 'none'
    ? PJ_TRAP_PATTERNS[item.meta.primary_trap] : null;
  return `
    ${block('The trap, named', `
      ${trap ? `<span class="pjx__chip pjx__chip--trap">${escapeHTML(trap.name)}</span>` : ''}
      <p>${escapeHTML(item.explanation.trap_named)}</p>
    `)}
    <div class="pjx__habit">
      <span class="pjx__habit-glyph" aria-hidden="true">◎</span>
      <div>
        <div class="pjx__habit-label">Make it a habit</div>
        <p>${escapeHTML(item.explanation.solving_habit)}</p>
      </div>
    </div>`;
}

/** What the paragraph actually says — understanding over sequence. */
export function renderPlain(item) {
  return block('What the paragraph is saying', `
    <p>${escapeHTML(item.mentor.paragraph_plain)}</p>
    <blockquote class="mentor__keep" style="margin-top: var(--space-4)">${escapeHTML(item.mentor.takeaway)}</blockquote>
  `);
}

/** The full teaching layer, all layers in Bible order. */
export function renderTeaching(item, answer) {
  return `
    <div class="pjx">
      ${renderAssembled(item)}
      ${renderShape(item)}
      ${renderMoves(item)}
      ${renderLinks(item, answer)}
      ${renderTemptations(item, answer)}
      ${renderTrap(item)}
      ${renderPlain(item)}
    </div>`;
}
