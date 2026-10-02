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
    'That was your first passage. Something already stands out, in a good way.',
    'First passage done. Before the numbers: one thing worth noticing.',
  ],
  /* Every question answered correctly. */
  mastery: [
    'Clean read. What matters is *how* you did it: one thing to keep.',
    'Nothing caught you this time. Here is what that says about your reading.',
    'That passage tried its tricks and none of them landed. Notice why.',
  ],
  /* A previously dominant pattern did NOT appear where it could have. */
  growth: [
    'Something changed today. A pull that used to catch you: you walked past it.',
    'I noticed something today: an old pattern stayed quiet.',
  ],
  /* A trap pattern appeared — the main teaching moment. */
  watch: [
    'Today I noticed something. One small pattern: worth twenty seconds.',
    'One moment in this session is worth more than the score. Here it is.',
    'Your reading is getting stronger. One habit is worth watching next.',
  ],
  /* The lesson is about pacing rather than a particular option. */
  pace: [
    'Nothing tricked you today: the clock did the talking instead.',
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
  /* ---- The content engine's traps (content/taxonomy/varc-taxonomy.json) ---- */
  wrong_population: {
    name: 'Not the people the author meant',
    pull: 'The claim is right; who it is about has quietly changed: "some readers" became "people", "these experts" became "experts". Populations are the easiest scope to widen and the hardest to notice.',
    notice: 'When an option generalises to a group, find the group the author actually named and check the option kept it.',
    recall: { question: 'An option says "people" where the passage said "some scholars". What happened?', answer: 'The population widened: the claim now covers people the author never spoke about.' },
  },
  wrong_condition: {
    name: 'The condition dropped',
    pull: 'The author attached an "only when" or "provided that"; the option repeats the claim without it, and the claim sounds cleaner for the loss.',
    notice: 'Before accepting an option, ask what the passage made the claim conditional on, and check the condition survived the trip.',
    recall: { question: 'The passage says X holds "only where Y". An option says X holds. What is missing?', answer: 'The condition: an unconditional version of a conditional claim is a different claim.' },
  },
  wrong_abstraction_level: {
    name: 'The right idea at another altitude',
    pull: 'The option restates the idea one level too concrete or too abstract to answer the question, and because the idea is right the altitude goes unchecked.',
    notice: 'Match the altitude the stem asks for: a paragraph question wants the paragraph’s job, not the thesis; a main-idea question wants the thesis, not one paragraph’s job.',
    recall: { question: 'An option is true and on the right topic but feels slightly off. What do you check?', answer: 'Altitude: whether it answers at the level the question asked.' },
  },
  temporal_distortion: {
    name: 'A different time',
    pull: 'What was true then is read as true now; a prediction is read as a fact. The brain keeps the claim and loses its tense.',
    notice: 'Track "once", "now", "no longer", "will": a claim comes with a time attached, and the option must keep it.',
    recall: { question: 'The passage says a practice "was once common". An option says it is common. What changed?', answer: 'The tense: the claim was moved across time.' },
  },
  comparison_distortion: {
    name: 'A comparison the passage never made',
    pull: 'Two things the passage discusses separately are set against each other, and because both are in the text the comparison feels earned.',
    notice: 'For any "more than", "rather than", "unlike", find the sentence where the author actually compares the two. Side by side is not compared.',
    recall: { question: 'An option says X matters more than Y; both appear in the passage. What is the test?', answer: 'Whether the author compared them at all, not whether both were mentioned.' },
  },
  reversed_causation: {
    name: 'Cause and effect, swapped',
    pull: 'Both terms of a causal claim are in the option, so recognition says yes; only the arrow has been turned around.',
    notice: 'When an option has "because", "leads to" or "results in", say the passage’s own sentence back with the arrow drawn, and compare arrows.',
    recall: { question: 'An option links two things the passage links. What else must match?', answer: 'The direction, which one the author said causes which.' },
  },
  misattributed_view: {
    name: 'The right view, another owner',
    pull: 'A passage with two voices is remembered as one voice; the view is real, and the option hands it to the other party.',
    notice: 'Tag every claim with its owner as you read, the author, the tradition, the critic, and make the option keep the tag.',
    recall: { question: 'An option states a view that is definitely in the passage. What else must match?', answer: 'Whose view it is.' },
  },
  reported_view_as_author: {
    name: 'The view the author set up to attack',
    pull: 'The opening view is presented sympathetically and at length, so it is what memory keeps; the author’s own claim arrives later and quieter.',
    notice: 'Find the turn, "but", "yet", "the better view", and treat everything before it as the target, not the thesis.',
    recall: { question: 'The passage opens with a strong, clear view. Why is it dangerous?', answer: 'Because it may be the view the author is about to take apart.' },
  },
  criticism_as_rejection: {
    name: 'A criticism read as a rejection',
    pull: 'The author finds a flaw and the reader hears dismissal; the option says "rejects" where the passage says "doubts one part of".',
    notice: 'Measure how much of the thing the author actually gives up. Most criticism in a CAT passage is partial.',
    recall: { question: 'The author criticises a theory. What does an option claiming the author rejects it need?', answer: 'Evidence that the author gave the whole theory up, not one part.' },
  },
  concession_as_position: {
    name: 'A concession read as the author’s position',
    pull: '"Admittedly", "to be sure", "it is true that" introduce a point the author grants to the other side; the option reports it as something the author holds.',
    notice: 'A concession is followed by a "but". Read past it before crediting the author with the conceded point.',
    recall: { question: 'The author writes "it is true that X, but…". Does the author believe X?', answer: 'They grant X; the claim they make is what comes after "but".' },
  },
  common_knowledge_intrusion: {
    name: 'True in the world, absent from the text',
    pull: 'The option says what most readers already believe about the topic, and belief feels like evidence.',
    notice: 'Ask where in the passage this is. Your own knowledge is not a source the question setter accepts.',
    recall: { question: 'An option matches what you already know about the topic. What must you do?', answer: 'Find it in the passage, or let it go.' },
  },
  unsupported_inference: {
    name: 'A reasonable guess the text does not make',
    pull: 'The option follows from the passage the way a good guess follows: one step is supported, the next two are supplied by the reader.',
    notice: 'Count the steps from the sentence to the option. One is an inference; three is a story.',
    recall: { question: 'An option is plausible and in the spirit of the passage. Is it supported?', answer: 'Only if the sentences force it: plausible is not supported.' },
  },
  true_but_insufficient: {
    name: 'True, but not enough',
    pull: 'The option gives a real part of the evidence as though the part settled the question; recognising the part hides the missing rest.',
    notice: 'Ask whether the option does the whole job the stem asks, strengthens the link, states the assumption, or only touches it.',
    recall: { question: 'An option is a true piece of the argument. Why might it still lose?', answer: 'It may not do the job the stem asks for on its own.' },
  },
  prescriptive_leap: {
    name: 'A recommendation the author never made',
    pull: 'The author diagnoses; the option prescribes. Because the diagnosis is right, the prescription rides in with it.',
    notice: 'Separate "the author says this is happening" from "the author says do this". Description is not advice.',
    recall: { question: 'The passage explains why a problem arises. An option says the author recommends a fix. What is missing?', answer: 'Any sentence in which the author recommends anything.' },
  },
  correlation_as_causation: {
    name: 'Cause invented from correlation',
    pull: '"Associated with", "alongside", "tends to accompany" are read as "because of"; the brain likes a mechanism.',
    notice: 'Find the author’s causal words. If there are none, the option’s "because" was added by the option.',
    recall: { question: 'The passage says two things go together. An option says one causes the other. Supported?', answer: 'Not unless the author said so: together is not because.' },
  },
  example_as_thesis: {
    name: 'An example mistaken for the point',
    pull: 'The most vivid, concrete sentence is the one memory keeps, so an option built from it feels like the heart of the passage.',
    notice: 'Before choosing a main idea, ask what the example is FOR; the sentence it serves is the candidate, not the example.',
    recall: { question: 'An option restates the passage’s most memorable example. What is it likely to be?', answer: 'The illustration, not the thesis it illustrates.' },
  },
  overstatement: {
    name: 'Right direction, too strong',
    pull: 'No "always" or "never" to catch the eye, just "useful" turned into "essential", "some evidence" into "proof".',
    notice: 'Compare verbs and adjectives of degree, not only absolutes: the author’s "suggests" is not the option’s "demonstrates".',
    recall: { question: 'An option has no absolute words but feels bolder than the passage. What do you compare?', answer: 'The strength of the verbs and adjectives: suggests versus proves.' },
  },
  weakened_version: {
    name: 'Right direction, softer than the author',
    pull: 'The author is firm; the option hedges, and hedged options feel safe to a reader who has learned to fear absolutes.',
    notice: 'Match the author’s confidence in both directions. An author who says "must" is not answered by an option that says "may".',
    recall: { question: 'The passage states something firmly; an option says it "might" be so. Is that the author’s claim?', answer: 'No: it is weaker than what the author committed to.' },
  },
  possibility_as_certainty: {
    name: 'May became must',
    pull: 'A possibility or tendency in the passage is remembered as a rule; certainty is easier to store than probability.',
    notice: 'Track the modal words, may, can, tends to, often, and refuse any option that upgrades them.',
    recall: { question: 'The passage says something "may" happen. An option says it "will". What happened?', answer: 'A possibility became a certainty.' },
  },
  necessary_as_sufficient: {
    name: 'Needed for it, read as enough for it',
    pull: 'The passage says X is required for Y; the option says X produces Y. Both mention the same link.',
    notice: 'Ask which way the guarantee runs: without X no Y (necessary) is not the same as with X, Y (sufficient).',
    recall: { question: 'The passage says X is necessary for Y. An option says X ensures Y. Right?', answer: 'No: necessary is not sufficient.' },
  },
  over_intense_tone: {
    name: 'The right attitude, too much of it',
    pull: 'The reader decides the author is critical and reaches for the strongest critical word available.',
    notice: 'Decide the direction of the attitude first, then its volume: a separate decision, with its own evidence.',
    recall: { question: 'The author is clearly sceptical. Which tone option wins?', answer: 'The one at the author’s volume: sceptical is not contemptuous.' },
  },
  wrong_valence_tone: {
    name: 'The other side entirely',
    pull: 'A reported view or a concession is read as the author’s own feeling, and the tone flips with it.',
    notice: 'Anchor tone on the author’s verdict words, never on the words of the view being reported.',
    recall: { question: 'The passage spends a paragraph admiring a theory before turning on it. What is the tone?', answer: 'Set by the turn: the admiration belonged to the reported view.' },
  },
  emotional_appeal: {
    name: 'Attractive, but the passage never said it',
    pull: 'The option is morally or emotionally satisfying; wanting it to be true feels like recognising that it is.',
    notice: 'When an option makes you feel something, treat the feeling as a warning and go looking for the sentence.',
    recall: { question: 'An option is the one you would like to be true. What is your move?', answer: 'Find the sentence that says it, or let it go.' },
  },
  sophisticated_sounding: {
    name: 'Sounds cleverer than the answer',
    pull: 'Abstract, technical vocabulary reads as depth, and the plainer correct option looks too simple to be right.',
    notice: 'Translate every option into plain words before judging it. Sophistication is a costume; check what is underneath.',
    recall: { question: 'One option sounds far more intellectual than the others. What does that tell you?', answer: 'Nothing about its correctness: translate it and check.' },
  },
  fact_right_interpretation_wrong: {
    name: 'The right fact, another reading of it',
    pull: 'The option cites something the passage really says, then draws from it a conclusion the passage does not.',
    notice: 'Split the option in two: the fact, and what the option claims the fact shows. Verify the second half separately.',
    recall: { question: 'An option opens with a true fact from the passage. What still needs checking?', answer: 'The conclusion the option attaches to it.' },
  },
  extreme_language: {
    name: 'The pull of certainty',
    pull: 'Under time pressure, absolute words, always, never, only, feel strong and decisive, so the brain reads confidence as correctness. Authors do the opposite: they qualify.',
    notice: 'When an option sounds certain, scan it for absolutes, then check whether the passage itself ever speaks that strongly. It usually doesn’t.',
    recall: {
      question: 'An option says "always". What’s your first move?',
      answer: 'Check the passage’s own strength of claim: authors qualify; absolute options usually overshoot the text.',
    },
  },
  half_right: {
    name: 'The half-true friend',
    pull: 'The first half of the option matches the passage, and the brain relaxes: verification feels finished before the sentence is.',
    notice: 'Read the second half of every tempting option against the text. The first half buys your trust; the second half spends it.',
    recall: {
      question: 'An option starts exactly like the passage. What do you check?',
      answer: 'Its second half: half-true options put the truth first and the swerve last.',
    },
  },
  out_of_scope: {
    name: 'The borrowed idea',
    pull: 'The option says something sensible about the topic: knowledge borrowed from outside the passage. Plausible in the world, absent from the text.',
    notice: 'For every option ask one question: where is this in the passage? If you can’t point to it, it isn’t there.',
    recall: {
      question: 'An option sounds obviously true about the topic. What’s the test?',
      answer: 'Point to it in the passage. True-in-the-world is not the same as said-by-the-author.',
    },
  },
  true_but_irrelevant: {
    name: 'True, but not the answer',
    pull: 'The option is genuinely stated in the passage, so it feels safe, but it answers a different question than the one asked.',
    notice: 'Re-read the stem just before choosing. The question, not the passage, decides what counts as relevant.',
    recall: {
      question: 'An option is definitely in the passage. Why might it still lose?',
      answer: 'Because it may answer a different question: truth is necessary, relevance decides.',
    },
  },
  passage_language_shifted: {
    name: 'Familiar words, new claim',
    pull: 'The option recycles the passage’s own vocabulary, and recognition feels like agreement, while the claim underneath has quietly changed.',
    notice: 'Match claims, not words. Say the option in your own words, then check whether the author would sign it.',
    recall: {
      question: 'An option uses the passage’s exact phrases. What do you compare?',
      answer: 'The claims, not the words: familiar vocabulary can carry a different sentence.',
    },
  },
  opposite_direction: {
    name: 'The mirror option',
    pull: 'Under load, the brain drops negations and directions: it remembers the topic of a sentence but not which way it pointed. Passages that present a view before rejecting it feed this.',
    notice: 'For every option, ask whose view this is: the author’s, or the one the author set up to take apart?',
    recall: {
      question: 'The passage discusses a view at length. What must you ask before crediting it?',
      answer: 'Whether the author holds that view, or built it up precisely to turn against it.',
    },
  },
  too_broad: {
    name: 'A question of altitude',
    pull: 'A summary that covers everything feels generous and safe, but an option wider than the passage claims things the author never took on.',
    notice: 'The right main idea covers the whole passage and nothing more. Check the edges: does the passage actually go that far?',
    recall: {
      question: 'Two main-idea options survive. How do you pick the altitude?',
      answer: 'The whole passage, no more: an option wider than the text claims what the author never did.',
    },
  },
  too_narrow: {
    name: 'A question of altitude',
    pull: 'One vivid paragraph stays in memory, and an option built from it feels precise, while the passage’s actual span quietly exceeds it.',
    notice: 'Before choosing a main idea, run the paragraphs in your head: does the option need all of them, or only one?',
    recall: {
      question: 'A main-idea option matches paragraph two perfectly. What’s the check?',
      answer: 'Whether it needs every paragraph: an option one paragraph wide is an answer to a smaller question.',
    },
  },
  wrong_structural_role: {
    name: 'Right fact, different job',
    pull: 'The brain files what a paragraph said long before it files what the paragraph was doing, so options that name real content but hand it a different job still feel accurate.',
    notice: 'As you read, label each paragraph’s job in two words: sets up, pushes back, concludes. Structure questions become matching, not memory.',
    recall: {
      question: 'You remember what paragraph 3 said. What else must you know?',
      answer: 'What it was doing: content is what a paragraph says; function is why it’s there.',
    },
  },
  near_synonym_confusion: {
    name: 'The look-alike word',
    pull: 'The most common meaning of a word arrives first and uninvited; the sentence’s actual, narrower sense needs a deliberate second look.',
    notice: 'For vocabulary questions, re-read the full sentence and trust the clause around the word: writers plant the working definition beside it.',
    recall: {
      question: 'A word’s everyday meaning fits an option perfectly. Why pause?',
      answer: 'Context may force a rarer sense: the sentence around the word defines it, not the dictionary’s first line.',
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
  primary_purpose: 'primary-purpose questions',
  author_attitude: 'author’s-attitude questions',
  except: 'EXCEPT questions',
  not_true: 'NOT-true questions',
  phrase_in_context: 'phrase-in-context questions',
  implication: 'implication questions',
  must_be_true: 'must-be-true questions',
  cannot_be_inferred: 'cannot-be-inferred questions',
  agree_disagree: 'would-the-author-agree questions',
  application: 'application questions',
  comparative: 'comparison questions',
  strengthen: 'strengthen questions',
  weaken: 'weaken questions',
  assumption: 'assumption questions',
  role_of_detail: 'why-the-author-mentions questions',
  relationship: 'relationship questions',
  best_characterization: 'best-characterisation questions',
  scope: 'scope questions',
});

export const TYPE_ADVICE = Object.freeze({
  main_idea: 'Before the options, say the passage’s arc in one sentence of your own, then demand the option cover all of it.',
  inference: 'Pick only what the author’s sentences force. An option can be sensible and still not follow.',
  tone: 'Collect the author’s verdict-words as you read; topic words set the subject, never the attitude.',
  vocabulary_in_context: 'The clause around the word usually contains its working definition: read it before the options.',
  logical_structure: 'Label each paragraph’s job as you finish it; structure questions reward the labels, not re-reading.',
  specific_detail: 'Put a finger on the exact sentence before answering: nearby truths are the classic decoys.',
  title_selection: 'A title is the main idea in six words: same altitude rules apply.',
  paragraph_function: 'Ask what the paragraph does to the argument, not what it contains.',
  author_purpose: 'Watch for signpost phrases: "it would be a misreading" means defending, not asserting.',
  strengthen_weaken: 'First fix exactly which claim is being strengthened; evidence that discriminates beats evidence that agrees.',
  primary_purpose: 'Name the verb, arguing, questioning, reconciling, describing, then find the option with that verb and that object.',
  author_attitude: 'Intensity and valence are two separate decisions; decide the side first, then the volume.',
  except: 'Find the three that ARE in the passage; the answer is what is left, and it is often plausible in the world.',
  not_true: 'Verify each option against the text; the false one usually shifts a scope or a direction, not a topic.',
  phrase_in_context: 'Paraphrase the phrase from its own sentence before looking; the working definition is planted nearby.',
  implication: 'Take the author’s claim one honest step; the trap takes it three.',
  must_be_true: 'Test each option: could the passage be entirely true and this option false? Then it is not forced.',
  cannot_be_inferred: 'Three options are supported somewhere; the answer is the one whose support you cannot point to.',
  agree_disagree: 'Separate what the author reports from what the author holds; agreement questions live on that line.',
  application: 'Extract the author’s rule as a rule, then apply it mechanically to the new case.',
  comparative: 'Find the sentence where the two things are actually compared; options invent comparisons the passage never made.',
  strengthen: 'Name the assumption the argument leans on; the strengthener props it.',
  weaken: 'Find the link between evidence and conclusion; the weakener breaks the link, not the topic.',
  assumption: 'Negate the option: if the argument collapses, it was a necessary assumption.',
  role_of_detail: 'A detail is there to do a job for the claim around it; name the claim first.',
  relationship: 'Two things in the passage: is one an example, a cause, a contrast or a qualification of the other?',
  best_characterization: 'Characterise the passage’s move in a verb and an object, and check the option keeps both.',
  scope: 'Mark the population, the period and the condition the author actually limits the claim to.',
});

/* ------------------------------------------------------------------ */
/* Reading-DNA observation templates (Growth page).                    */
/* Each takes the derived evidence and returns calm, specific copy.    */
/* ------------------------------------------------------------------ */

export const DNA_COPY = Object.freeze({
  trapAffinity: (patternName, count, passages) => ({
    title: patternName,
    body: `This pull has appeared in your reading ${count} times across ${passages} passages. Naming it is most of the fix: watch for it in your next read.`,
  }),
  trapQuiet: (patternName, cleanSessions) => ({
    title: `${patternName}going quiet`,
    body: `A pull that used to appear in your reading hasn’t landed once in your last ${cleanSessions} sessions. That’s growth you earned.`,
  }),
  typeFriction: (typeLabel, accuracy, n) => ({
    title: `${typeLabel[0].toUpperCase()}${typeLabel.slice(1)} ask for one more beat`,
    body: `Across ${n} of them so far, about ${accuracy} have landed. This usually shifts with one habit: see the advice on your next such question.`,
  }),
  typeStrength: (typeLabel, accuracy, n) => ({
    title: `${typeLabel[0].toUpperCase()}${typeLabel.slice(1)} are becoming yours`,
    body: `${accuracy} across ${n} questions. Whatever you’re doing on these: keep doing it deliberately.`,
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
    body: `Your late-evening accuracy sits about ${diff} below your daytime reading. An observation, not a rule: worth one experiment with an earlier slot.`,
  }),
});

/* ------------------------------------------------------------------ */
/* Small connective lines.                                             */
/* ------------------------------------------------------------------ */

export const LINES = Object.freeze({
  numbersAside: (correct, total) =>
    `${correct} of ${total} landed: the numbers matter less than the noticing.`,
  recallEyebrow: 'Twenty-second recall',
  recallLead: 'From your last lesson, before you read:',
  keepGoing: [
    'One more passage will tell us more.',
    'Tomorrow’s passage will show whether it sticks.',
    'Carry it into the next read.',
  ],
  masteryWalkedPast: (patternName) =>
    `This passage carried "${patternName.toLowerCase()}", the pull that used to catch you, and you walked straight past it.`,
});
