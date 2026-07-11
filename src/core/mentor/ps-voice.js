/**
 * ps-voice.js — the Para Summary mentor's entire vocabulary, in one
 * reviewable file, exactly like voice.js (reading) and pj-voice.js
 * (jumbles).
 *
 * Register (PARA SUMMARY BIBLE §6, §7, §13): the error taxonomy is the
 * shared vocabulary of feedback. Every distortion archetype the schema
 * can name has a pattern here with the pull (why the brain reaches for
 * it), the notice (how to catch it next time), and a twenty second
 * recall. The mentor never explains an answer; it teaches the way of
 * reading that produces the answer.
 *
 * tools/verify.mjs lints every exported string against BANNED_WORDS
 * from voice.js and checks that every archetype in ps.schema has a
 * pattern with a recall here. Deterministic: variety comes from pick()
 * on a stable seed, never Math.random().
 *
 * Learner-facing strings here avoid dash punctuation deliberately
 * (owner rule): clean sentences, commas and full stops.
 */

import { pick } from './voice.js';

export { pick };

/* ------------------------------------------------------------------ */
/* Opening lines, by situation.                                        */
/* ------------------------------------------------------------------ */

export const PS_OPENINGS = Object.freeze({
  first: [
    'That was your first summary set. One thing already stands out, and it is worth keeping.',
    'First set done. Before anything else, notice this one thing.',
  ],
  mastery: [
    'Every option built to tempt you got tested against the author and set down. Notice how.',
    'Clean summarising. The options tried their pulls and none of them landed.',
  ],
  growth: [
    'Something changed today. A pull that used to catch you stayed quiet.',
    'An old pattern went silent this session. That is earned.',
  ],
  watch: [
    'One moment in this session is worth more than the score. Here it is.',
    'Today I noticed something small. Twenty seconds on it now protects marks later.',
    'Your summarising is getting stronger. One habit is worth watching next.',
  ],
  skipped: [
    'You set one paragraph aside today. Here is a way into it, for next time.',
  ],
});

/* ------------------------------------------------------------------ */
/* Distortion archetypes — the heart of the PS mentor's teaching.      */
/* One per archetype the schema can name (Bible §6 taxonomy, §7        */
/* palette). For each:                                                 */
/*   name    — the pattern in calm, human words                        */
/*   family  — the taxonomy family it belongs to (for aggregation)     */
/*   pull    — why the brain reaches for it (what the option does to   */
/*             readers, never what the reader did)                     */
/*   notice  — how to catch it next time, one actionable line          */
/*   recall  — a twenty second self question and answer, for tomorrow  */
/* ------------------------------------------------------------------ */

export const PS_TRAP_PATTERNS = Object.freeze({
  /* ---- scope ---- */
  scope_broadening: {
    name: 'The claim that grew',
    family: 'scope',
    pull: 'A broader statement feels more like a summary, because summaries are supposed to rise above detail. So an option quietly deletes a limiter, some becomes all, one domain becomes every domain, and the wider claim reads as the more complete answer. The author never went that far.',
    notice: 'Before accepting any option, find the words in the paragraph that limit the claim, an only, a some, a where clause. Then check the option still carries every one of them.',
    recall: {
      question: 'An option sounds bigger and more complete than the paragraph. What is the check?',
      answer: 'Match the reach. Every limiter the author wrote must survive into the summary. Wider is not more complete, it is a different claim.',
    },
  },
  scope_narrowing: {
    name: 'The claim that shrank',
    family: 'scope',
    pull: 'A narrower option can look precise and careful, especially when it restates one vivid part of the paragraph exactly. But the author claimed more than that one case, and a summary that keeps only the sub case reports a smaller claim than the one made.',
    notice: 'Ask how much of the world the author actually claimed. The right summary matches that breadth exactly, no wider and no narrower.',
    recall: {
      question: 'An option restates one part of the paragraph with perfect accuracy. Why might it still lose?',
      answer: 'Because the author claimed more. A summary must match the full breadth of the claim, not the clearest slice of it.',
    },
  },
  category_shift: {
    name: 'The neighbouring category',
    family: 'scope',
    pull: 'The option swaps the author’s exact category for its familiar neighbour, buses become public transport, testing becomes education. The neighbour is what your memory already associates with the topic, so the swap slips past unnoticed.',
    notice: 'Hold the author’s own noun in mind and check the option keeps it. If the category widened or shifted sideways, the claim changed with it.',
    recall: {
      question: 'The paragraph is about one specific category. The option names a wider one. Is that fine?',
      answer: 'No, unless the author generalised it. Keep the exact category the author used. A wider category is a wider claim.',
    },
  },

  /* ---- certainty ---- */
  certainty_inflation: {
    name: 'May becomes is',
    family: 'certainty',
    pull: 'Decisive statements read as better summaries. When the author says suggests, may, or tends to, an option that says proves, does, or always sounds stronger and cleaner, and the brain rewards confidence as if it were correctness. This is the single most rewarded pull in summary questions.',
    notice: 'Fix the author’s strength of claim before reading any option. If the author hedged, the right summary hedges in the same place.',
    recall: {
      question: 'The paragraph says the evidence suggests something. An option says the evidence shows it. What happened?',
      answer: 'The certainty was raised. A summary must keep the author’s exact strength of claim. Suggests stays suggests.',
    },
  },
  certainty_deflation: {
    name: 'Is becomes might',
    family: 'certainty',
    pull: 'A cautious option can feel safely hedged, as if modesty were always accurate. But when the author asserted something firmly, an option that softens it into a maybe under reports the author, and that is just as unfaithful as overstating.',
    notice: 'Hedging is not automatically safer. If the author committed, the summary commits. Check the direction of the drift, not just its presence.',
    recall: {
      question: 'The author states something plainly. An option says it might be so. Is the cautious option safer?',
      answer: 'No. Under claiming is as unfaithful as over claiming. The summary matches the author’s commitment exactly.',
    },
  },
  tendency_to_universal: {
    name: 'Usually becomes always',
    family: 'certainty',
    pull: 'Universal statements sound like stronger conclusions, so an option drops a most, a generally, or an in many cases, and a pattern quietly becomes a law. The claim now covers cases the author deliberately left out.',
    notice: 'Typicality words are load bearing. When the paragraph describes what tends to happen, the summary must keep the tendency, never convert it into a rule.',
    recall: {
      question: 'The paragraph says something tends to happen. The option says it happens. What was lost?',
      answer: 'The typicality. Tends to, most, and generally are part of the claim. Dropping them turns a pattern into a law the author never stated.',
    },
  },

  /* ---- structure ---- */
  concession_as_thesis: {
    name: 'The view the author walked away from',
    family: 'structure',
    pull: 'Argument paragraphs often open with the view they will reject. That opening is stated plainly, it comes first, and it usually matches something you already believe, so it feels both familiar and easy to verify against the text. All three feelings are the trap. The author brought that view up to turn against it.',
    notice: 'Never fix the point until you have looked for the turn. Whatever sits before a but or a however is usually scaffolding, not the claim.',
    recall: {
      question: 'The first sentence states a clear, familiar view. What must you check before summarising it?',
      answer: 'Whether the author turns against it. In many paragraphs the opening is the view being rejected, and the real claim arrives after the turn.',
    },
  },
  example_as_thesis: {
    name: 'The example that stole the stage',
    family: 'structure',
    pull: 'Examples are the most concrete, most picturable sentences in any paragraph, which makes them the easiest to remember and the most tempting to summarise. But an example exists to illustrate a claim. It is never the claim itself, even when it takes up most of the paragraph.',
    notice: 'When a sentence paints a picture, ask what idea the picture was painted for. Summarise the idea, not the picture.',
    recall: {
      question: 'The most memorable sentence in the paragraph is a vivid example. Does it belong in the summary?',
      answer: 'No. An example illustrates the claim. The summary states the claim and lets every illustration go.',
    },
  },
  evidence_as_thesis: {
    name: 'The evidence promoted',
    family: 'structure',
    pull: 'Data and findings feel substantive, so an option that reports the study or the numbers reads as serious and grounded. But evidence exists to support a claim. A summary that leads with the evidence has quietly dropped the point the evidence was for.',
    notice: 'For every fact in the paragraph, ask what claim it is carrying. The summary states the claim. The facts stay behind.',
    recall: {
      question: 'An option accurately reports the paragraph’s data. Why is that not the summary?',
      answer: 'Because evidence supports the point and is not the point. Find the claim the data was carrying and summarise that.',
    },
  },
  setup_as_payoff: {
    name: 'The setup taken for the point',
    family: 'structure',
    pull: 'A paragraph can spend its first half building context, and that context is often clearer and easier to restate than the claim it was building toward. An option that summarises the setup feels faithful because everything in it is genuinely in the text. It just stops before the paragraph arrives.',
    notice: 'Ask what the opening material was for. If it was preparing the ground for a later claim, the summary belongs to the claim, not the ground.',
    recall: {
      question: 'The first half of the paragraph is clear background. The second half makes a claim. Which does the summary follow?',
      answer: 'The claim. Setup exists to serve a payoff, and the summary is always the payoff.',
    },
  },
  assumption_as_thesis: {
    name: 'The unspoken premise, promoted',
    family: 'structure',
    pull: 'Some options state a premise the argument silently rests on. Because the paragraph really does need that premise, spotting it feels like insight, and the option feels deep. But the author never asserted it. A summary reports what the author claimed, not what the claim depends on.',
    notice: 'Check whether the option’s statement is actually asserted anywhere, or only assumed underneath. If the author never said it, it cannot be the point.',
    recall: {
      question: 'An option states something the argument clearly relies on but never says. Can it be the summary?',
      answer: 'No. A summary reports what the author asserted. An assumption, however real, was never claimed.',
    },
  },

  /* ---- addition ---- */
  information_addition: {
    name: 'The added fact',
    family: 'addition',
    pull: 'The option appends something true and relevant that the paragraph never mentions, often exactly the fact you were expecting the author to add. Because it fills a gap you also felt, it reads as comprehension rather than invention.',
    notice: 'Every element of a summary must be traceable to the text. For each clause in the option, point to where the paragraph says it. If you cannot point, it was added.',
    recall: {
      question: 'An option includes a sensible fact about the topic. What is the test?',
      answer: 'Point to it in the paragraph. True in the world is not the same as said by the author.',
    },
  },
  implication_addition: {
    name: 'The extra step',
    family: 'addition',
    pull: 'The option takes the author’s claim one reasonable step further, drawing a consequence the paragraph never draws. Readers reward options that seem to go deeper, but a summary is a restatement, and any step beyond the text, however natural, changes the claim.',
    notice: 'A summary adds nothing, not even a conclusion that feels inevitable. If the paragraph did not take the step, the summary does not take it either.',
    recall: {
      question: 'An option draws a conclusion that follows naturally from the paragraph. Is it the best summary?',
      answer: 'No. A summary restates what the author claimed. A consequence the author never drew is an addition, however reasonable.',
    },
  },
  prescriptive_swap: {
    name: 'Is becomes ought',
    family: 'addition',
    pull: 'The paragraph describes what happens. The option says what should be done about it. An ought feels like a stronger and more useful conclusion than an is, so the recommendation reads as the point. But describing a situation is not the same as prescribing a response, and the author only did the first.',
    notice: 'Check the paragraph’s mode. If the author described, a summary that recommends has changed the kind of claim being made.',
    recall: {
      question: 'The paragraph explains what happens. The option says what cities should do. What changed?',
      answer: 'A description became a prescription. An argument about facts is not an argument about policy unless the author made it one.',
    },
  },

  /* ---- stance ---- */
  stance_flip: {
    name: 'The stance reversed',
    family: 'stance',
    pull: 'When the author’s attitude is carried quietly, by word choice more than by declaration, it is easy to lose the direction of it under time pressure. The option reports criticism as endorsement or the reverse, and because it discusses the right topic in the right words, the reversal hides.',
    notice: 'Before reading options, decide in one word whether the author is for, against, or neutral. Then hold that word against every option.',
    recall: {
      question: 'You know the paragraph’s topic but options disagree on the author’s attitude. What do you do?',
      answer: 'Go back for the verdict words. Fix whether the author approves or objects before judging any option.',
    },
  },
  stance_flattening: {
    name: 'The argument made neutral',
    family: 'stance',
    pull: 'This option is not false, which is exactly why it is dangerous. It reports the topic under discussion while stripping away the author’s position on it. The paragraph argued something. The option merely describes what the paragraph is about, and a nervous reader reaches for it because nothing in it can be contradicted.',
    notice: 'If the author is arguing, the summary must argue the same thing. An option with no lean cannot summarise a paragraph with one.',
    recall: {
      question: 'An option says the paragraph examines a question. The paragraph actually answers it. What is lost?',
      answer: 'The author’s position. A summary of an argument must carry the argument, not just the topic.',
    },
  },
  owner_swap: {
    name: 'Whose claim is it',
    family: 'stance',
    pull: 'Paragraphs often carry two voices, a view the author reports and the view the author holds. Across a turn it is easy to lose track of who owns which. The option hands a reported view to the author, or the author’s view to the cited source, and the claim’s whole authority changes.',
    notice: 'Tag every claim with its owner as you read. Phrases like it is often said, some argue, and the standard account holds mark a view the author is holding at a distance.',
    recall: {
      question: 'The paragraph opens with it is often said. Whose view is that?',
      answer: 'Someone else’s. The author is reporting it, usually to push against it. A summary must not present it as the author’s claim.',
    },
  },

  /* ---- logical relation ---- */
  cause_effect_reversal: {
    name: 'The arrow reversed',
    family: 'logic',
    pull: 'Both directions of a causal claim use the same words, so an option that swaps cause and effect looks almost identical to the truth. The eye checks the vocabulary, finds it all present, and misses that the arrow now points the other way.',
    notice: 'For any causal claim, say the direction out loud before the options. This leads to that. Then check each option keeps the arrow.',
    recall: {
      question: 'The paragraph says A leads to B. An option says B leads to A, in the same vocabulary. How do you catch it?',
      answer: 'Fix the arrow before reading options. Same words in a different direction is a different claim.',
    },
  },
  correlation_causation_swap: {
    name: 'Together becomes because',
    family: 'logic',
    pull: 'The paragraph reports that two things appear together. The option says one causes the other. The upgrade feels harmless because the causal story is usually the one you already believe, but the author claimed an association and the option claims a mechanism.',
    notice: 'Keep the exact relation the author asserted. Linked with, appears where, and coincides with are not causes, and must not become them.',
    recall: {
      question: 'The paragraph says a decline appeared where fares stayed low. An option says low fares caused the decline. What changed?',
      answer: 'An association became a cause. The summary keeps the relation the author actually claimed.',
    },
  },
  necessary_sufficient_swap: {
    name: 'Needed becomes enough',
    family: 'logic',
    pull: 'Required for and guarantees both sound conditional, so the brain files them as the same claim. But a condition something needs is not a condition that is enough, and swapping them silently rewrites the argument.',
    notice: 'When the paragraph makes a condition, ask which kind it is. Does the author say this is needed, or that this is enough? The summary must keep the same kind.',
    recall: {
      question: 'The paragraph says a condition was needed. An option says the condition is enough. Same claim?',
      answer: 'No. Necessary and sufficient are different claims. Keep the one the author made.',
    },
  },
  contrast_collapse: {
    name: 'The but that vanished',
    family: 'logic',
    pull: 'The option joins two sides of a contrast with an and, deleting the turn between them. Without the turn word the sentences read as one continuous line, and a paragraph built on disagreement is summarised as agreement.',
    notice: 'A but is never decorative. If the paragraph turns, the summary must keep the two sides in the same opposition the author built.',
    recall: {
      question: 'The paragraph sets two ideas against each other. The option joins them with and. What happened?',
      answer: 'The contrast collapsed. A summary must preserve the opposition, not fuse the rejected view with the real claim.',
    },
  },

  /* ---- language ---- */
  verbatim_lure: {
    name: 'Familiar words, rearranged logic',
    family: 'language',
    pull: 'The option is built from the paragraph’s own phrases, and the overlap reads as safety. Recognition feels like agreement. But underneath the borrowed vocabulary, what leads to what has been rearranged, and the claim is no longer the author’s.',
    notice: 'Treat heavy word overlap as a reason to slow down, never as comfort. Say the option in your own words, then ask whether the author would sign it.',
    recall: {
      question: 'An option uses the paragraph’s exact phrases. What do you compare?',
      answer: 'The claims, not the words. Familiar vocabulary can carry a rearranged sentence the author never wrote.',
    },
  },
  extreme_language: {
    name: 'The absolute word',
    family: 'language',
    pull: 'All, never, only, must. Absolutes sound conclusive, and under a clock conclusiveness feels like quality. Authors mostly qualify. An option that speaks in absolutes has usually overshot the text, though setters know trained readers distrust absolutes and occasionally hide a true strong claim behind one.',
    notice: 'When an option uses an absolute, check whether the paragraph itself ever speaks that strongly. Judge by the text, not by a rule about extreme words.',
    recall: {
      question: 'An option says always. The paragraph says often. What is your move?',
      answer: 'Check the author’s own strength. The summary carries the paragraph’s force exactly, and often is not always.',
    },
  },
  half_truth: {
    name: 'A faithful start with a swerve at the end',
    family: 'language',
    pull: 'The first clause matches the paragraph, you verify it, and the feeling of confirmation relaxes the rest of the read. The distortion sits in the tail, a shifted scope, an added cause, a raised certainty, placed exactly where checking has stopped.',
    notice: 'Read every tempting option to its final word with the same care the opening got. The first half buys your trust. The second half spends it.',
    recall: {
      question: 'An option starts exactly like the paragraph. Where does your attention go?',
      answer: 'To the end of it. Half true options put the truth first and the swerve last, after checking has relaxed.',
    },
  },

  /* ---- the elite finalist ---- */
  near_miss: {
    name: 'The summary that loses one thing',
    family: 'precision',
    pull: 'This option found the apex. It preserves almost everything, and against the other options it reads as a finalist, because it is one. It drops exactly one load bearing element, a qualifier, a step of certainty, or one of two required parts, and only a reader who can name that element sees the difference.',
    notice: 'When two options both feel right, stop comparing them to the paragraph and compare them to each other. Name the one element that differs, then ask which version the author actually wrote.',
    recall: {
      question: 'Two options survive to the end and feel nearly identical. What breaks the tie?',
      answer: 'Find the single element they differ on, then check which one the author committed to. One word of scope or certainty decides.',
    },
  },
});

/* Family ids and display labels, for the Reading DNA and the teach
 * layer. Every pattern above names one of these. */
export const PS_FAMILY_LABELS = Object.freeze({
  scope: 'Scope',
  certainty: 'Certainty',
  structure: 'Finding the claim',
  addition: 'Adding to the author',
  stance: 'The author’s stance',
  logic: 'Logical relations',
  language: 'Surface language',
  precision: 'Final word precision',
});

/* What each family says about a reader when it recurs. Calm, specific,
 * forward facing (the Mistake Notebook insights, in mentor register). */
export const PS_FAMILY_INSIGHTS = Object.freeze({
  scope: 'Options that stretch or shrink the author’s reach have been landing. The habit that fixes this is carrying every limiter, the only, the some, the where clause, from paragraph to summary.',
  certainty: 'Options that shift the author’s strength of claim have been landing. Words like may, suggests and tends to are part of the claim itself. Fix the author’s force before reading any option.',
  structure: 'Options built from the paragraph’s supporting material, its examples, evidence and setups, have been landing. Rank the sentences before the options: one carries the claim, the rest serve it.',
  addition: 'Options that add a step the author never took have been landing. A summary adds nothing, not even a conclusion that feels inevitable. Every clause must be traceable to the text.',
  stance: 'Options that lose or reverse the author’s position have been landing. Decide in one word whether the author is for, against, or neutral before judging any option.',
  logic: 'Options that quietly rewrite the paragraph’s logic, its causes, conditions and contrasts, have been landing. Say the relation in your own words first: what leads to what, and which way.',
  language: 'Options dressed in the paragraph’s own vocabulary have been landing. Word overlap is not fidelity. Compare claims, not phrases, and read every option to its last word.',
  precision: 'The final choice between two close options has been going to the other one. That is the highest level of this skill: name the single element the finalists differ on, then check which the author wrote.',
});

/* ------------------------------------------------------------------ */
/* Missions — Today's Mission, shown before every item.                */
/* One per mission the schema can name. Rotation is intelligent        */
/* because each item declares the mission its design foregrounds.      */
/* ------------------------------------------------------------------ */

export const PS_MISSIONS = Object.freeze({
  find_the_thesis: {
    title: 'Find the thesis.',
    line: 'One sentence carries the paragraph. The others support it, qualify it, or set it up. Find the one the rest are serving.',
  },
  protect_scope: {
    title: 'Protect the author’s scope.',
    line: 'Notice how far the claim reaches, and no further. Every limiter you keep is a mark defended.',
  },
  ignore_examples: {
    title: 'Ignore the examples.',
    line: 'The most vivid sentence is almost never the point. Ask what the picture was painted for.',
  },
  notice_certainty: {
    title: 'Notice the certainty.',
    line: 'Is the author asserting, suggesting, or reporting someone else’s view? The strength of the claim is part of the claim.',
  },
  evidence_vs_conclusion: {
    title: 'Separate evidence from conclusion.',
    line: 'Facts carry the claim. They are not the claim. Find what the numbers were brought in to prove.',
  },
  hold_the_stance: {
    title: 'Hold the author’s stance.',
    line: 'Decide in one word whether the author is for, against, or neutral. Then keep that word through every option.',
  },
  watch_the_turn: {
    title: 'Watch for the turn.',
    line: 'Many paragraphs open with the view they are about to reject. Do not fix the point until you have looked for the turn.',
  },
  add_nothing: {
    title: 'Add nothing.',
    line: 'A summary restates. It does not conclude further, recommend, or explain. If the author did not take the step, neither do you.',
  },
  keep_qualifiers: {
    title: 'Keep every qualifier.',
    line: 'Small words decide these questions. An only, a may, a most. Carry each one across, or the claim changes.',
  },
  match_ideas_not_words: {
    title: 'Match ideas, not words.',
    line: 'An option built from the paragraph’s own phrases can still rearrange its logic. Familiar wording is a reason to slow down.',
  },
});

/* ------------------------------------------------------------------ */
/* The Think button — a thinking coach, never a hint machine.          */
/* Questions only. Nothing here may point at an option or reveal       */
/* anything about the answer. A core set applies to every item; each   */
/* mission adds sharper questions of its own kind.                     */
/* ------------------------------------------------------------------ */

export const PS_THINK = Object.freeze({
  core: [
    'What is the author really trying to communicate, in your own words?',
    'Which sentence do the other sentences exist to serve?',
    'Would the author read your current pick and say, that is fair, at that strength and that reach?',
    'Is anything in the option you like actually absent from the paragraph?',
    'Has the scope changed anywhere, wider or narrower than the author went?',
    'Has certainty gone up or down anywhere, a may becoming an is, a shows becoming a hints?',
    'Is this sentence the main idea, or an example wearing its clothes?',
    'Which option would the author sign as a fair, complete statement of the point?',
  ],
  byMission: {
    find_the_thesis: [
      'If you deleted each sentence one at a time, which deletion would collapse the paragraph?',
      'Is the sentence you are drawn to doing the claiming, or supporting the claimer?',
    ],
    protect_scope: [
      'List the limiting words in the paragraph. Does your option carry all of them?',
      'Does the option cover more of the world than the paragraph does, or less?',
    ],
    ignore_examples: [
      'What idea is the vivid sentence illustrating? Could you state it without the picture?',
      'If the example were swapped for a different one, would the point survive unchanged?',
    ],
    notice_certainty: [
      'Find the author’s force words. Is the claim asserted, suggested, or attributed to someone else?',
      'Does the option speak with exactly the author’s confidence, no more and no less?',
    ],
    evidence_vs_conclusion: [
      'What claim were the facts brought in to carry?',
      'Does the option report the finding, or the point the finding supports?',
    ],
    hold_the_stance: [
      'In one word, is the author for this, against it, or neutral?',
      'Does the option carry the author’s lean, or has the argument been flattened into a description?',
    ],
    watch_the_turn: [
      'Where does the paragraph turn, if it does? What was everything before the turn for?',
      'Is the view you are about to summarise the author’s, or the one the author brought up to push against?',
    ],
    add_nothing: [
      'Point to each part of the option in the paragraph. Can you find every clause?',
      'Is the option drawing a consequence, giving a cause, or making a recommendation the author never made?',
    ],
    keep_qualifiers: [
      'Which small words in the paragraph limit the claim? Say them out loud.',
      'Read your option once more. Did any only, may, or most quietly disappear?',
    ],
    match_ideas_not_words: [
      'Say the option in your own words. Is it still the author’s claim?',
      'Does the option share the paragraph’s vocabulary or its logic? They are not the same thing.',
    ],
  },
});

/* ------------------------------------------------------------------ */
/* Reading DNA observation copy (Growth page). Calm and specific.      */
/* ------------------------------------------------------------------ */

export const PS_DNA_COPY = Object.freeze({
  familyQuiet: (familyLabel, cleanSessions) => ({
    title: `${familyLabel} pulls, going quiet`,
    body: `A family of pulls that used to appear in your summarising has not landed once in your last ${cleanSessions} sessions. That is growth you earned.`,
  }),
  familyAffinity: (familyLabel, count, items) => ({
    title: `${familyLabel} pulls keep finding you`,
    body: PS_FAMILY_INSIGHTS_BODY(familyLabel, count, items),
  }),
  archetypeAffinity: (patternName, count, items) => ({
    title: patternName,
    body: `This exact pull has appeared ${count} times across ${items} paragraphs. Naming it is most of the fix. Watch for it on your next set.`,
  }),
  qualifierFriction: (lowAcc, highAcc) => ({
    title: 'Small words are deciding these',
    body: `On paragraphs dense with limiters and hedges your picks land about ${lowAcc}, against ${highAcc} when the language is plain. The gap is one habit: find the load bearing words before the options do.`,
  }),
  qualifierStrength: () => ({
    title: 'You keep the small words',
    body: 'Your accuracy holds even on paragraphs dense with limiters and hedges. That is precision reading working. Keep doing it deliberately.',
  }),
  turnFriction: (misses, n) => ({
    title: 'Unmarked turns ask for one more beat',
    body: `On ${n} paragraphs where the turn is soft or unmarked, the pick went elsewhere ${misses} times. When no however appears, ask where the author changes direction anyway. Most argument paragraphs have one.`,
  }),
  finalistStrength: (pct, n) => ({
    title: 'You win the final comparison',
    body: `Across ${n} items built to end in two close finalists, about ${pct} landed. Separating near identical summaries by a single element is the highest level of this skill.`,
  }),
  fastMissWatch: (count) => ({
    title: 'The quick picks are the costly ones',
    body: `${count} times, an option chosen within seconds did not hold. Speed is fine when the apex is already fixed. Fix the claim, its reach and its strength first, then let the options compete.`,
  }),
  velocity: (early, late) => ({
    title: 'Learning velocity, visible',
    body: `Your first sessions landed about ${early}. Your recent ones sit near ${late}. Same paragraphs getting harder, better judgment meeting them. Keep the pace honest and this keeps climbing.`,
  }),
});

/* familyAffinity body: the named insight plus the evidence, composed
 * here so the register stays reviewable in one place. */
function PS_FAMILY_INSIGHTS_BODY(familyLabel, count, items) {
  const id = Object.entries(PS_FAMILY_LABELS).find(([, l]) => l === familyLabel)?.[0];
  const insight = (id && PS_FAMILY_INSIGHTS[id])
    ?? 'Naming the pull is most of the fix. Watch for it on your next set.';
  return `${count} picks across ${items} paragraphs followed this family of pulls. ${insight}`;
}

/* ------------------------------------------------------------------ */
/* Small connective lines.                                             */
/* ------------------------------------------------------------------ */

export const PS_LINES = Object.freeze({
  numbersAside: (correct, total) =>
    `${correct} of ${total} summaries matched the author. The noticing matters more than the count.`,
  missionEyebrow: 'Today’s mission',
  thinkTitle: 'Think it through',
  thinkLead: 'No hints live here. Only the questions strong readers ask themselves.',
  builderPrompt: 'Before the options: say the author’s point in one sentence of your own.',
  builderNudge: 'One sentence. The claim, its reach, its strength. Nothing else.',
  builderCompareLead: 'Now hold your sentence against the author’s point, honestly.',
  chooseNudge: 'Read the full paragraph once more before you decide. The last clause of an option is where summaries drift.',
  keepGoing: [
    'One more set will tell us more.',
    'Carry it into the next set.',
    'Tomorrow’s paragraphs will show whether it sticks.',
  ],
  masteryWalkedPast: (patternName) =>
    `This set carried "${patternName.toLowerCase()}", the pull that used to catch you, and you walked straight past it.`,
});
