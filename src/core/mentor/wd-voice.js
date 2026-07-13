/**
 * wd-voice.js — the Word DNA mentor's entire vocabulary, in one
 * reviewable file, exactly like voice.js does for reading and
 * pj-voice.js does for jumbles.
 *
 * Register (WORD_DNA_BIBLE §6 + the mentor rules): celebrate discovery,
 * never correct a "mistake" — the brief's own examples ("You've started
 * recognising roots before reading meanings") are the register, not a
 * suggestion. tools/verify.mjs lints every exported string against
 * BANNED_WORDS from voice.js. Deterministic: variety comes from pick()
 * on a stable seed, never Math.random().
 */

import { pick } from './voice.js';

export { pick };

/* ------------------------------------------------------------------ */
/* Opening lines — how the Word DNA mentor begins, by situation.       */
/* ------------------------------------------------------------------ */

export const WD_OPENINGS = Object.freeze({
  first: [
    'That was your first family. One thing already stands out, and it is worth keeping.',
    'First set done. Before anything else, notice this one thing.',
  ],
  mastery: [
    'Every word gave up its meaning today. Notice how you got there.',
    'You trusted the pattern instead of guessing. That is the whole skill, working.',
  ],
  growth: [
    'Something changed today. A guess that used to lean on the surface reached for the pattern instead.',
    'You are beginning to decode words naturally. That did not happen by accident.',
  ],
  watch: [
    'One moment in this set is worth more than the count. Here it is.',
    'Today I noticed something small. Twenty seconds on it now pays off on the next word you meet.',
  ],
  skipped: [
    'You set one family aside today. Here is a way into it, for next time.',
  ],
});

/* ------------------------------------------------------------------ */
/* Reading-DNA observation copy (Growth page) — celebrates discovery,  */
/* bounded to exactly the four traits in WORD_DNA_BIBLE §5.            */
/* ------------------------------------------------------------------ */

export const WD_DNA_COPY = Object.freeze({
  rootRecognitionStrength: (pct, n) => ({
    title: 'You spot the shared piece early',
    body: `Across ${n} families, you named the shared root, prefix, or suffix correctly about ${pct} of the time, often before the reveal. You've started recognising roots before reading meanings.`,
  }),
  rootRecognitionWatch: (pct, n) => ({
    title: 'The shared piece is still settling in',
    body: `Across ${n} families so far, the first guess has landed about ${pct} of the time. Before predicting, try saying the shared letters out loud — the pattern is often easier to hear than to see.`,
  }),
  transferStrength: (pct, n) => ({
    title: 'You decode words you have never seen',
    body: `On ${n} words held back for exactly this test, words never taught outright, you worked out the meaning correctly about ${pct} of the time. This is the whole point of Word DNA, and it is genuinely working.`,
  }),
  transferWatch: (pct, n) => ({
    title: 'Transfer is the next step to trust',
    body: `On ${n} never-taught words, the meaning landed about ${pct} of the time. When you meet a new word next, try applying the root's meaning literally first, then adjust for how the word actually gets used.`,
  }),
  contextStrength: (pct, n) => ({
    title: 'You read words by their company, not alone',
    body: `Across ${n} words met only in a sentence, borrowed words and everyday vocabulary alike, you chose the meaning that actually fit the context about ${pct} of the time.`,
  }),
  contextWatch: (pct, n) => ({
    title: 'Context is doing more work than it seems',
    body: `Across ${n} words met in a sentence, the most common meaning of a word has pulled harder than the sentence itself, about ${pct} of the time. Before choosing, reread the sentence once more and ask what the word is doing right there.`,
  }),
  familyFluency: (early, late) => ({
    title: 'Roots are starting to feel familiar as a group',
    body: `Your first few families landed around ${early}; your most recent ones sit near ${late}. The pattern-spotting itself is getting faster, not just your memory of any one root.`,
  }),
  crossLink: (word, firstUnit, secondUnit) => ({
    title: 'One word, two families',
    body: `"${word}" belongs to both ${firstUnit} and ${secondUnit}. You met it from two directions, which is exactly how a real vocabulary gets built.`,
  }),
});

/* ------------------------------------------------------------------ */
/* Small connective lines.                                             */
/* ------------------------------------------------------------------ */

export const WD_LINES = Object.freeze({
  numbersAside: (correct, total) =>
    `${correct} of ${total} understood — the noticing matters more than the count.`,
  keepGoing: [
    'One more family will tell us more.',
    'Carry it into the next set.',
    'Tomorrow will show whether it sticks.',
  ],
  masteryWalkedPast: () =>
    'The guess that used to reach for the surface reached for the pattern instead, and it held.',
  noticePrompt: 'What do these words share?',
  lockIn: 'Lock it in',
  setAside: 'Set aside',
  todaysDiscoveryEyebrow: "Today's discovery",
});
