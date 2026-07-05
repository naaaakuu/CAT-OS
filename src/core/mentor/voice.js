/**
 * voice.js — the mentor's entire vocabulary, in one reviewable file.
 *
 * Like engagement/messages.js, this exists so every sentence the
 * mentor ever says can be read, judged, and improved in one place.
 * The mentor's register (Personal Reading Mentor milestone):
 * observation over judgment, curiosity over verdict, one tiny
 * adjustment over a lecture. It NEVER uses the vocabulary of failure
 * — tools/verify.mjs lints every string here against BANNED_WORDS.
 *
 * Everything is deterministic: variety comes from hashing a stable
 * seed (usually the session id), never from Math.random(), so the
 * same session always hears the same sentence.
 */

/* Words the mentor never says. Verify walks every exported string.
   (Word-boundary check; "watch for" and "keep an eye on" replace them.) */
export const BANNED_WORDS = Object.freeze([
  'wrong', 'failure', 'failed', 'mistake', 'poor', 'weak', 'bad', 'careless',
]);

/** Tiny deterministic hash → stable pick from variants. */
export function pick(seed, variants) {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return variants[h % variants.length];
}

/* ------------------------------------------------------------------ */
/* Opening lines — how the mentor begins, by situation.                */
/* ------------------------------------------------------------------ */

export const OPENINGS = Object.freeze({
  /* The user's very first finished session. */
  first: [
    'That was your first passage. Something already stands out — in a good way.',
    'First passage done. Before the numbers: one thing worth noticing.',
  ],
  /* Every question answered correctly. */
  mastery: [
    'Clean read. What matters is *how* you did it — one thing to keep.',
    'Nothing caught you this time. Here is what that says about your reading.',
    'That passage tried its tricks and none of them landed. Notice why.',
  ],
  /* A previously dominant pattern did NOT appear where it could have. */
  growth: [
    'Something changed today. A pull that used to catch you — you walked past it.',
    'I noticed something today: an old pattern stayed quiet.',
  ],
  /* A trap pattern appeared — the main teaching moment. */
  watch: [
    'Today I noticed something. One small pattern — worth twenty seconds.',
    'One moment in this session is worth more than the score. Here it is.',
    'Your reading is getting stronger. One habit is worth watching next.',
  ],
  /* The lesson is about pacing rather than a particular option. */
  pace: [
    'Nothing tricked you today — the clock did the talking instead.',
    'One observation about rhythm, not about answers.',
  ],
  /* A skipped question is the day's material. */
  skipped: [
    'You left one door closed today. Here is the way in, for next time.',
  ],
});

/* ------------------------------------------------------------------ */
/* Trap patterns — the heart of the mentor's teaching.                 */
/* For each trap_type the content can name, the mentor knows:          */
/*   name     — the pattern in calm, human words                       */
/*   pull     — why the brain reaches for it (never "you erred";       */
/*              always "this is what this trap does to readers")       */
/*   notice   — how to catch it next time, in one actionable line      */
/*   recall   — a 20-second self-question + its answer, for tomorrow   */
/* ------------------------------------------------------------------ */

export const TRAP_PATTERNS = Object.freeze({
  extreme_language: {
    name: 'The pull of certainty',
    pull: 'Under time pressure, absolute words — always, never, only — feel strong and decisive, so the brain reads confidence as correctness. Authors do the opposite: they qualify.',
    notice: 'When an option sounds certain, scan it for absolutes, then check whether the passage itself ever speaks that strongly. It usually doesn’t.',
    recall: {
      question: 'An option says "always". What’s your first move?',
      answer: 'Check the passage’s own strength of claim — authors qualify; absolute options usually overshoot the text.',
    },
  },
  half_right: {
    name: 'The half-true friend',
    pull: 'The first half of the option matches the passage, and the brain relaxes — verification feels finished before the sentence is.',
    notice: 'Read the second half of every tempting option against the text. The first half buys your trust; the second half spends it.',
    recall: {
      question: 'An option starts exactly like the passage. What do you check?',
      answer: 'Its second half — half-true options put the truth first and the swerve last.',
    },
  },
  out_of_scope: {
    name: 'The borrowed idea',
    pull: 'The option says something sensible about the topic — knowledge borrowed from outside the passage. Plausible in the world, absent from the text.',
    notice: 'For every option ask one question: where is this in the passage? If you can’t point to it, it isn’t there.',
    recall: {
      question: 'An option sounds obviously true about the topic. What’s the test?',
      answer: 'Point to it in the passage. True-in-the-world is not the same as said-by-the-author.',
    },
  },
  true_but_irrelevant: {
    name: 'True, but not the answer',
    pull: 'The option is genuinely stated in the passage, so it feels safe — but it answers a different question than the one asked.',
    notice: 'Re-read the stem just before choosing. The question, not the passage, decides what counts as relevant.',
    recall: {
      question: 'An option is definitely in the passage. Why might it still lose?',
      answer: 'Because it may answer a different question — truth is necessary, relevance decides.',
    },
  },
  passage_language_shifted: {
    name: 'Familiar words, new claim',
    pull: 'The option recycles the passage’s own vocabulary, and recognition feels like agreement — while the claim underneath has quietly changed.',
    notice: 'Match claims, not words. Say the option in your own words, then check whether the author would sign it.',
    recall: {
      question: 'An option uses the passage’s exact phrases. What do you compare?',
      answer: 'The claims, not the words — familiar vocabulary can carry a different sentence.',
    },
  },
  opposite_direction: {
    name: 'The mirror option',
    pull: 'Under load, the brain drops negations and directions — it remembers the topic of a sentence but not which way it pointed. Passages that present a view before rejecting it feed this.',
    notice: 'For every option, ask whose view this is: the author’s, or the one the author set up to take apart?',
    recall: {
      question: 'The passage discusses a view at length. What must you ask before crediting it?',
      answer: 'Whether the author holds that view — or built it up precisely to turn against it.',
    },
  },
  too_broad: {
    name: 'A question of altitude',
    pull: 'A summary that covers everything feels generous and safe — but an option wider than the passage claims things the author never took on.',
    notice: 'The right main idea covers the whole passage and nothing more. Check the edges: does the passage actually go that far?',
    recall: {
      question: 'Two main-idea options survive. How do you pick the altitude?',
      answer: 'The whole passage, no more — an option wider than the text claims what the author never did.',
    },
  },
  too_narrow: {
    name: 'A question of altitude',
    pull: 'One vivid paragraph stays in memory, and an option built from it feels precise — while the passage’s actual span quietly exceeds it.',
    notice: 'Before choosing a main idea, run the paragraphs in your head: does the option need all of them, or only one?',
    recall: {
      question: 'A main-idea option matches paragraph two perfectly. What’s the check?',
      answer: 'Whether it needs every paragraph — an option one paragraph wide is an answer to a smaller question.',
    },
  },
  wrong_structural_role: {
    name: 'Right fact, different job',
    pull: 'The brain files what a paragraph said long before it files what the paragraph was doing — so options that name real content but hand it a different job still feel accurate.',
    notice: 'As you read, label each paragraph’s job in two words — sets up, pushes back, concludes. Structure questions become matching, not memory.',
    recall: {
      question: 'You remember what paragraph 3 said. What else must you know?',
      answer: 'What it was doing — content is what a paragraph says; function is why it’s there.',
    },
  },
  near_synonym_confusion: {
    name: 'The look-alike word',
    pull: 'The most common meaning of a word arrives first and uninvited; the sentence’s actual, narrower sense needs a deliberate second look.',
    notice: 'For vocabulary questions, re-read the full sentence and trust the clause around the word — writers plant the working definition beside it.',
    recall: {
      question: 'A word’s everyday meaning fits an option perfectly. Why pause?',
      answer: 'Context may force a rarer sense — the sentence around the word defines it, not the dictionary’s first line.',
    },
  },
});

/* ------------------------------------------------------------------ */
/* Question-type language — friction and strength, stated calmly.      */
/* ------------------------------------------------------------------ */

export const TYPE_LABELS = Object.freeze({
  main_idea: 'main-idea questions',
  inference: 'inference questions',
  tone: 'tone questions',
  vocabulary_in_context: 'vocabulary-in-context questions',
  logical_structure: 'structure questions',
  specific_detail: 'detail questions',
  title_selection: 'title questions',
  paragraph_function: 'paragraph-function questions',
  author_purpose: 'author-purpose questions',
  strengthen_weaken: 'strengthen-and-weaken questions',
});

export const TYPE_ADVICE = Object.freeze({
  main_idea: 'Before the options, say the passage’s arc in one sentence of your own — then demand the option cover all of it.',
  inference: 'Pick only what the author’s sentences force. An option can be sensible and still not follow.',
  tone: 'Collect the author’s verdict-words as you read; topic words set the subject, never the attitude.',
  vocabulary_in_context: 'The clause around the word usually contains its working definition — read it before the options.',
  logical_structure: 'Label each paragraph’s job as you finish it; structure questions reward the labels, not re-reading.',
  specific_detail: 'Put a finger on the exact sentence before answering — nearby truths are the classic decoys.',
  title_selection: 'A title is the main idea in six words — same altitude rules apply.',
  paragraph_function: 'Ask what the paragraph does to the argument, not what it contains.',
  author_purpose: 'Watch for signpost phrases — "it would be a misreading" means defending, not asserting.',
  strengthen_weaken: 'First fix exactly which claim is being strengthened; evidence that discriminates beats evidence that agrees.',
});

/* ------------------------------------------------------------------ */
/* Reading-DNA observation templates (Growth page).                    */
/* Each takes the derived evidence and returns calm, specific copy.    */
/* ------------------------------------------------------------------ */

export const DNA_COPY = Object.freeze({
  trapAffinity: (patternName, count, passages) => ({
    title: patternName,
    body: `This pull has appeared in your reading ${count} times across ${passages} passages. Naming it is most of the fix — watch for it in your next read.`,
  }),
  trapQuiet: (patternName, cleanSessions) => ({
    title: `${patternName} — going quiet`,
    body: `A pull that used to appear in your reading hasn’t landed once in your last ${cleanSessions} sessions. That’s growth you earned.`,
  }),
  typeFriction: (typeLabel, accuracy, n) => ({
    title: `${typeLabel[0].toUpperCase()}${typeLabel.slice(1)} ask for one more beat`,
    body: `Across ${n} of them so far, about ${accuracy} have landed. This usually shifts with one habit — see the advice on your next such question.`,
  }),
  typeStrength: (typeLabel, accuracy, n) => ({
    title: `${typeLabel[0].toUpperCase()}${typeLabel.slice(1)} are becoming yours`,
    body: `${accuracy} across ${n} questions. Whatever you’re doing on these — keep doing it deliberately.`,
  }),
  overthink: (typeLabel) => ({
    title: `You sit long on ${typeLabel}`,
    body: 'Extra time on these hasn’t been buying extra accuracy. Trust your first disciplined read: find the evidence, answer, move.',
  }),
  endingRush: (sessions) => ({
    title: 'Endings get your fastest reads',
    body: `In ${sessions} sessions, the final question got your quickest answer of the set. The last question deserves the same minute the first one got.`,
  }),
  fastFirstPass: (sessions) => ({
    title: 'Your first pass runs quick',
    body: `In ${sessions} sessions the first read took well under the passage’s own estimate. A slower first pass often repays itself in the questions.`,
  }),
  evening: (diff) => ({
    title: 'Late sessions run a little cooler',
    body: `Your late-evening accuracy sits about ${diff} below your daytime reading. An observation, not a rule — worth one experiment with an earlier slot.`,
  }),
});

/* ------------------------------------------------------------------ */
/* Small connective lines.                                             */
/* ------------------------------------------------------------------ */

export const LINES = Object.freeze({
  numbersAside: (correct, total) =>
    `${correct} of ${total} landed — the numbers matter less than the noticing.`,
  recallEyebrow: 'Twenty-second recall',
  recallLead: 'From your last lesson, before you read:',
  keepGoing: [
    'One more passage will tell us more.',
    'Tomorrow’s passage will show whether it sticks.',
    'Carry it into the next read.',
  ],
  masteryWalkedPast: (patternName) =>
    `This passage carried "${patternName.toLowerCase()}" — the pull that used to catch you — and you walked straight past it.`,
});
