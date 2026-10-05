/**
 * info.js — the small round "i" that holds an explanation.
 *
 * The owner's rule (3.3): the app explains when it is asked, never before.
 * Play keeps one short instruction where the learner would not otherwise
 * know what to tap; what the question type is, how CAT sets it, and the
 * item's own mission and hint all sit behind this button, in the section
 * they explain.
 *
 * The native Popover API does the work: no script, Escape and tapping
 * outside close it, and the panel renders in the top layer, so no
 * transformed or clipped parent can trap it. The panel is built from spans
 * so it is valid inside a <p> or an <h1>; a browser without popovers simply
 * shows the text where it sits (components.css hides the dead button).
 */

import { escapeHTML } from '../core/utils/format.js';

/** What each subject is, in the words the panel uses. */
export const SUBJECT_INFO = Object.freeze({
  rc: {
    title: 'Reading Comprehension',
    lines: [
      'A passage of 300 to 650 words, then three or four questions about it.',
      'The questions ask what the author says, means, assumes or would agree with.',
      'CAT sets four passages. They carry most of your VARC marks.',
    ],
    tip: 'Read once, closely. Answer from the passage, not from what you already know.',
  },
  pj: {
    title: 'Para Jumbles',
    lines: [
      'Four sentences from one paragraph, shuffled. Put them back in the author\'s order.',
      'In CAT you type the order, like 2143. No options, and no negative marks.',
    ],
    tip: 'Find the pair that must sit together first: a this, a however, a name and then its he.',
  },
  ps: {
    title: 'Para Summary',
    lines: [
      'One paragraph and four summaries. Pick the one that keeps the author\'s main point.',
      'The other options add something new, miss the point, or go too far.',
    ],
    tip: 'Say the point in your own words before you read the options.',
  },
  ooo: {
    title: 'Odd One Out',
    lines: [
      'Five sentences. Four make one paragraph. Find the one that does not belong.',
      'In CAT you type its number. No options, and no negative marks.',
    ],
    tip: 'Build the paragraph first. The sentence left over is your answer.',
  },
  sp: {
    title: 'Sentence Placement',
    lines: ['A paragraph with one sentence taken out, and a few gaps. Which gap does it fit?'],
    tip: 'Ask what the sentence needs: a this needs something before it, a but needs something to push against.',
  },
  pc: {
    title: 'Para Completion',
    lines: ['A paragraph with one sentence missing, at its end or in its middle. Choose the sentence that fits the gap best.'],
    tip: 'Decide what the gap needs first: a reason, an example, a turn or a landing.',
  },
  vocab: {
    title: 'Vocabulary',
    lines: [
      'CAT no longer asks word meanings directly, but every passage is full of hard words.',
      'Rounds of twelve words, many inside a real sentence. The ones that slip come back later.',
    ],
    tip: 'Guess from the sentence first, then check. That is how the exam makes you read.',
  },
  cr: {
    title: 'Arguments',
    lines: ['A short argument and a question about how it works: its assumption, a weakener, its flaw.'],
    tip: 'Find the conclusion first, then ask what the author takes for granted.',
  },
  gauntlet: {
    title: 'The Gauntlet',
    lines: ['Thirty quick questions from every subject, against the clock. Once a week.'],
    tip: 'Do not stop to agonise. Speed is the whole point here.',
  },
});

let seq = 0;

/**
 * The button and its panel, as one HTML string. Put it straight after the
 * eyebrow or title text it explains, inside the same element.
 * @param {keyof SUBJECT_INFO} key
 * @param {object} [opts]
 * @param {string} [opts.label]      the button's accessible name
 * @param {string[]} [opts.more]     this item's own lines (its mission, its
 *                                   challenge, its hint), so nothing that used
 *                                   to sit in the way is lost; empty ones drop
 * @param {string} [opts.moreTitle]  the small heading above them
 * @param {string} [opts.guide]      a href for "Read the full guide"
 */
export function infoButton(key, { label, more = [], moreTitle = 'This one', guide = '' } = {}) {
  const info = SUBJECT_INFO[key];
  const id = `info-${(seq += 1)}`;
  const lines = (xs, cls) => xs.filter(Boolean).map((x) => `<span class="${cls}">${escapeHTML(x)}</span>`).join('');
  const own = lines(more, 'info-pop__line');
  return `<button type="button" class="info-btn" popovertarget="${id}" aria-label="${escapeHTML(label ?? `About ${info.title}`)}">i</button>`
    + `<span class="info-pop" id="${id}" popover>`
    + `<span class="info-pop__title">${escapeHTML(info.title)}</span>`
    + lines(info.lines, 'info-pop__line')
    + lines([info.tip], 'info-pop__tip')
    + (own ? `<span class="info-pop__head">${escapeHTML(moreTitle)}</span>${own}` : '')
    + (guide ? `<a class="info-pop__guide" href="${escapeHTML(guide)}">Read the full guide</a>` : '')
    + `<button type="button" class="btn btn--block info-pop__close" popovertarget="${id}" popovertargetaction="hide">Got it</button>`
    + '</span>';
}
