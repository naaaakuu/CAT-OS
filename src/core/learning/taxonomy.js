/**
 * taxonomy.js — the code-side mirror of content/taxonomy/varc-taxonomy.json.
 *
 * The JSON is the authority: every id a content file may use lives there,
 * and tools/verify.mjs refuses a file that names an id it does not hold.
 * The app needs a handful of those facts at runtime without fetching the
 * whole taxonomy on every screen — which question type trains which
 * ledger skill, which family a trap belongs to, which module plays which
 * bank — so they are restated here, and verify.mjs §18 fails the build if
 * the two ever disagree. Extend the JSON first; then this.
 */

/** RC question type → the ledger skill it trains (taxonomy rc_type_skill). */
export const RC_TYPE_SKILL = Object.freeze({
  main_idea: 'main_idea', title_selection: 'main_idea',
  primary_purpose: 'author_purpose', author_purpose: 'author_purpose',
  author_attitude: 'tone', tone: 'tone',
  specific_detail: 'specific_detail', except: 'specific_detail', not_true: 'specific_detail',
  phrase_in_context: 'vocabulary_in_context', vocabulary_in_context: 'vocabulary_in_context',
  inference: 'inference', implication: 'inference', must_be_true: 'inference', cannot_be_inferred: 'inference',
  agree_disagree: 'inference', comparative: 'inference',
  application: 'application',
  strengthen: 'strengthen_weaken', weaken: 'strengthen_weaken',
  assumption: 'argument',
  paragraph_function: 'paragraph_function', role_of_detail: 'paragraph_function',
  logical_structure: 'logical_structure', relationship: 'logical_structure', best_characterization: 'logical_structure',
  scope: 'scope',
});

/** RC question types where the learner should be able to PREDICT the
 *  answer before reading the options (taxonomy rc_question_types.prediction). */
export const RC_PREDICTION_TYPES = Object.freeze(new Set([
  'main_idea', 'title_selection', 'primary_purpose', 'author_purpose', 'author_attitude', 'tone',
  'phrase_in_context', 'vocabulary_in_context', 'inference', 'implication', 'agree_disagree', 'application',
  'strengthen', 'weaken', 'assumption', 'paragraph_function', 'role_of_detail', 'logical_structure',
  'relationship', 'best_characterization', 'scope',
]));

/** Every trap type any item may name, → its family. The seven RC families
 *  come from the taxonomy; placement, word and argument traps are grouped
 *  the same way so one ledger can say "you keep falling for scope traps"
 *  across the Reading Room, the Loom and the Meadow alike. */
export const TRAP_FAMILY = Object.freeze({
  /* Reading Comprehension (taxonomy trap_types) */
  too_broad: 'scope', too_narrow: 'scope', wrong_population: 'scope', wrong_condition: 'scope',
  wrong_abstraction_level: 'scope', temporal_distortion: 'scope', comparison_distortion: 'scope',
  opposite_direction: 'direction', reversed_causation: 'direction', misattributed_view: 'direction',
  reported_view_as_author: 'direction', criticism_as_rejection: 'direction', concession_as_position: 'direction',
  out_of_scope: 'support', common_knowledge_intrusion: 'support', unsupported_inference: 'support',
  true_but_insufficient: 'support', prescriptive_leap: 'support', correlation_as_causation: 'support',
  true_but_irrelevant: 'relevance', wrong_structural_role: 'relevance', example_as_thesis: 'relevance',
  extreme_language: 'degree', overstatement: 'degree', weakened_version: 'degree',
  possibility_as_certainty: 'degree', necessary_as_sufficient: 'degree',
  over_intense_tone: 'tone', wrong_valence_tone: 'tone', emotional_appeal: 'tone',
  passage_language_shifted: 'language', near_synonym_confusion: 'language', sophisticated_sounding: 'language',
  half_right: 'language', fact_right_interpretation_wrong: 'language',
  /* Sentence placement and para completion (taxonomy verbal.placement_traps) */
  wrong_reference_target: 'direction', local_fit_global_break: 'relevance', topic_match_function_mismatch: 'relevance',
  premature_conclusion: 'relevance', redundant_restatement: 'relevance', scope_jump: 'scope',
  contradicts_neighbour: 'direction', stance_shift: 'tone', wrong_connective: 'language', tense_break: 'language',
  new_topic_introduced: 'support', right_idea_wrong_position: 'relevance', summary_where_development_needed: 'relevance',
  attractive_generality: 'support',
  /* Word bank (taxonomy verbal.word_traps) */
  dictionary_sense_not_context: 'language', near_synonym_wrong_degree: 'degree', wrong_connotation: 'tone',
  wrong_register: 'tone', false_cognate: 'language', literal_parts_only: 'language', wrong_root: 'language',
  context_mismatch: 'relevance', confusable_twin: 'language', antonym_lure: 'direction', sound_alike: 'language',
  collocation_clash: 'relevance', prefix_misread: 'direction',
  /* Critical reasoning (taxonomy verbal.cr_traps) */
  restates_premise: 'relevance', restates_conclusion: 'relevance', opposite_effect: 'direction',
  irrelevant_information: 'relevance', scope_shift: 'scope', too_strong_to_be_necessary: 'degree',
  wrong_link: 'relevance', explains_wrong_side: 'relevance', partial_parallel: 'relevance',
  attacks_premise: 'direction', correlation_causation: 'support', alternative_cause_ignored: 'support',
});

/** How the valley says each trap family, when the ledger points at one. */
export const TRAP_FAMILY_LINE = Object.freeze({
  scope: 'options that reach wider, narrower or elsewhere than the text',
  direction: 'options that point the other way, or hand a view to somebody who never held it',
  support: 'options that sound right and are not in the passage',
  relevance: 'options that are true but do not answer the question',
  degree: 'options that are stronger or weaker than the text',
  language: 'options that reuse the passage’s words to say something else',
  tone: 'options that hear the author’s attitude differently from the page',
});


/**
 * THE 152 REASONING PATTERNS, mirrored from content/taxonomy/varc-taxonomy.json.
 *
 * Every RC v5 question and every bank item names the patterns it exercises,
 * every answer records them, and `patternLedger` has been counting them
 * correctly for two releases — but the only place their NAMES existed was a
 * JSON file no runtime code loaded and the service worker did not precache.
 * So the app could tell you that you had met "inf.vs_speculation" nine times
 * and got it four, and could not tell you what that was.
 *
 * Mirrored here, beside the skills and the traps, for the same reason those
 * are: it has to work offline, and verify.mjs §19 fails if it drifts from
 * the JSON.
 *
 * `instinct` is the one line that says what the pattern asks of a reader.
 */
export const PATTERNS = Object.freeze({
  'comp.explicit_detail': { name: 'Explicit detail', instinct: 'I can point to the sentence.', family: 'comp' },
  'comp.paraphrase': { name: 'Paraphrase recognition', instinct: 'Different words, same claim, or same words, different claim.', family: 'comp' },
  'comp.central_idea': { name: 'Central idea', instinct: 'This is the sentence the others serve.', family: 'comp' },
  'comp.supporting_idea': { name: 'Supporting idea', instinct: 'True, and here to hold up something else.', family: 'comp' },
  'comp.purpose': { name: 'Purpose', instinct: 'The author wrote this TO do something; name the verb.', family: 'comp' },
  'comp.intent': { name: 'Author’s intent', instinct: 'What does the author want me to end up believing?', family: 'comp' },
  'comp.organization': { name: 'Passage organisation', instinct: 'I can see the skeleton under the prose.', family: 'comp' },
  'comp.reference_tracking': { name: 'Reference tracking', instinct: '‘This’ points at something; I know what.', family: 'comp' },
  'comp.function_over_words': { name: 'Reading for function', instinct: 'Not what it says: what it is doing.', family: 'comp' },
  'comp.attention_span': { name: 'Attention over a long passage', instinct: 'The fourth paragraph counts as much as the first.', family: 'comp' },
  'inf.directly_implied': { name: 'Directly implied', instinct: 'The author all but said it.', family: 'inf' },
  'inf.strongly_supported': { name: 'Strongly supported', instinct: 'Two sentences together force this.', family: 'inf' },
  'inf.necessary': { name: 'Necessary inference', instinct: 'If the passage is true, this cannot be false.', family: 'inf' },
  'inf.reasonable_implication': { name: 'Reasonable implication', instinct: 'One honest step from the claim, not three.', family: 'inf' },
  'inf.vs_speculation': { name: 'Inference versus speculation', instinct: 'Plausible is not the same as supported.', family: 'inf' },
  'inf.author_view_application': { name: 'Author’s view, applied', instinct: 'The author’s test, run on a case they never saw.', family: 'inf' },
  'inf.logical_gap': { name: 'Logical gap', instinct: 'Something has to be true for that step to work.', family: 'inf' },
  'inf.author_vs_reported': { name: 'Author’s view versus reported view', instinct: 'Whose view is this: the author’s, or the one set up to be knocked down?', family: 'inf' },
  'arg.premise': { name: 'Premise', instinct: 'This is offered as a reason.', family: 'arg' },
  'arg.conclusion': { name: 'Conclusion', instinct: 'This is what the reasons are for.', family: 'arg' },
  'arg.assumption': { name: 'Assumption', instinct: 'Unstated, and the argument needs it.', family: 'arg' },
  'arg.qualification': { name: 'Qualification', instinct: 'The author limited the claim on purpose; keep the limit.', family: 'arg' },
  'arg.concession': { name: 'Concession', instinct: 'The author granted this point without adopting it.', family: 'arg' },
  'arg.counterargument': { name: 'Counterargument', instinct: 'This is the other side, given its due.', family: 'arg' },
  'arg.rebuttal': { name: 'Rebuttal', instinct: 'And here the author answers it.', family: 'arg' },
  'arg.causal_claim': { name: 'Causal claim', instinct: 'Because, or merely alongside?', family: 'arg' },
  'arg.analogy': { name: 'Analogy', instinct: 'Like this, in the one respect that matters.', family: 'arg' },
  'arg.generalization': { name: 'Generalisation', instinct: 'From these cases to all cases: is that earned?', family: 'arg' },
  'arg.example': { name: 'Example', instinct: 'This illustrates; it does not claim.', family: 'arg' },
  'arg.principle': { name: 'Principle', instinct: 'This is the rule the example serves.', family: 'arg' },
  'arg.evidence': { name: 'Evidence', instinct: 'This is what is offered in support.', family: 'arg' },
  'arg.evidence_vs_conclusion': { name: 'Evidence versus conclusion', instinct: 'Which sentence is the reason, and which is the point?', family: 'arg' },
  'arg.correlation_vs_causation': { name: 'Correlation versus causation', instinct: 'They go together; nobody said one made the other.', family: 'arg' },
  'arg.description_vs_evaluation': { name: 'Description versus evaluation', instinct: 'The author is describing this, not approving of it.', family: 'arg' },
  'arg.example_vs_principle': { name: 'Example versus principle', instinct: 'The waiter is not the thesis.', family: 'arg' },
  'arg.necessary_vs_sufficient': { name: 'Necessary versus sufficient', instinct: 'Needed for it is not the same as enough for it.', family: 'arg' },
  'scope.too_broad': { name: 'Scope too broad', instinct: 'The passage never went that far.', family: 'scope' },
  'scope.too_narrow': { name: 'Scope too narrow', instinct: 'That is one paragraph, not the passage.', family: 'scope' },
  'scope.population': { name: 'Wrong population', instinct: 'The author said ‘some readers’; this says ‘people’.', family: 'scope' },
  'scope.time_period': { name: 'Wrong time period', instinct: 'That was true then; the author does not say it is true now.', family: 'scope' },
  'scope.condition': { name: 'Wrong condition', instinct: 'The claim held only under a condition; the option dropped it.', family: 'scope' },
  'scope.abstraction_level': { name: 'Wrong level of abstraction', instinct: 'Same idea, wrong altitude.', family: 'scope' },
  'scope.true_but_off_question': { name: 'True in the passage, not an answer', instinct: 'It is in the passage. It does not answer the question.', family: 'scope' },
  'lang.absolute_vs_qualified': { name: 'Absolute versus qualified', instinct: 'The author hedged; the option did not.', family: 'lang' },
  'lang.some_vs_all': { name: 'Some versus all', instinct: '‘Some’ was the whole claim.', family: 'lang' },
  'lang.may_vs_must': { name: 'May versus must', instinct: 'The passage only says MAY; this option says MUST.', family: 'lang' },
  'lang.often_vs_always': { name: 'Often versus always', instinct: 'A tendency became a law.', family: 'lang' },
  'lang.implicit_negation': { name: 'Implicit negation', instinct: '‘Hardly’, ‘far from’, ‘all but’: the sentence points the other way.', family: 'lang' },
  'lang.double_negative': { name: 'Double negative', instinct: 'Not unlikely means likely; slow down.', family: 'lang' },
  'lang.comparative': { name: 'Comparative language', instinct: 'More than what? Compared with whom?', family: 'lang' },
  'lang.temporal_qualifier': { name: 'Temporal qualifier', instinct: '‘Once’, ‘now’, ‘no longer’: the claim is dated.', family: 'lang' },
  'lang.causal_wording': { name: 'Causal wording', instinct: '‘Because’ is a claim; ‘alongside’ is not.', family: 'lang' },
  'lang.modal_verbs': { name: 'Modal verbs', instinct: 'Could, should, would, must: each is a different promise.', family: 'lang' },
  'lang.subtle_negation': { name: 'Subtle negation', instinct: 'One small ‘not’ reversed the whole option.', family: 'lang' },
  'lang.overstatement': { name: 'Overstatement', instinct: 'Right direction, wrong strength.', family: 'lang' },
  'lang.contrast_marker': { name: 'Contrast marker', instinct: '‘But’ is where the author starts speaking.', family: 'lang' },
  'lang.concession_marker': { name: 'Concession marker', instinct: '‘Granted’, ‘to be sure’: the author is giving, not claiming.', family: 'lang' },
  'lang.tone_shift': { name: 'Shift in tone', instinct: 'The voice changed here; that is a signal.', family: 'lang' },
  'lang.pronoun_reference': { name: 'Pronoun reference', instinct: 'Which ‘it’? Which ‘they’?', family: 'lang' },
  'struct.contrast': { name: 'Contrast', instinct: 'Two things set against each other; find which one the author keeps.', family: 'struct' },
  'struct.continuation': { name: 'Continuation', instinct: 'This extends the last idea; nothing turned.', family: 'struct' },
  'struct.cause_effect': { name: 'Cause and effect', instinct: 'This happened, so that happened.', family: 'struct' },
  'struct.problem_solution': { name: 'Problem and solution', instinct: 'The trouble first, then what to do.', family: 'struct' },
  'struct.claim_evidence': { name: 'Claim and evidence', instinct: 'The claim, then what holds it up.', family: 'struct' },
  'struct.claim_counterclaim': { name: 'Claim and counterclaim', instinct: 'A view, and the view against it.', family: 'struct' },
  'struct.chronology': { name: 'Chronology', instinct: 'Time is the spine.', family: 'struct' },
  'struct.analogy': { name: 'Analogy', instinct: 'The comparison is carrying the argument.', family: 'struct' },
  'struct.definition': { name: 'Definition', instinct: 'The author is fixing what a word will mean here.', family: 'struct' },
  'struct.example': { name: 'Example', instinct: 'The general claim, then a case of it.', family: 'struct' },
  'struct.qualification': { name: 'Qualification', instinct: 'The claim, then its limits.', family: 'struct' },
  'struct.pivot': { name: 'Pivot', instinct: 'The passage just turned; everything before was setup.', family: 'struct' },
  'struct.conclusion': { name: 'Conclusion', instinct: 'The passage lands here.', family: 'struct' },
  'struct.transition': { name: 'Transition', instinct: 'The bridge between two movements.', family: 'struct' },
  'struct.general_to_specific': { name: 'General to specific', instinct: 'The claim, then the cases.', family: 'struct' },
  'struct.specific_to_general': { name: 'Specific to general', instinct: 'The cases, then the claim they add up to.', family: 'struct' },
  'struct.question_answer': { name: 'Question and answer', instinct: 'The author asks it in order to answer it.', family: 'struct' },
  'struct.view_critique_replacement': { name: 'View, critique, replacement', instinct: 'A view is set up, taken apart, and replaced; the replacement is the thesis.', family: 'struct' },
  'struct.two_views_adjudication': { name: 'Two views, adjudicated', instinct: 'Two positions, and the author’s verdict between them.', family: 'struct' },
  'struct.phenomenon_explanation': { name: 'Phenomenon, then explanation', instinct: 'Something puzzling, then why it happens.', family: 'struct' },
  'struct.history_of_an_idea': { name: 'History of an idea', instinct: 'How the idea changed, and what the change shows.', family: 'struct' },
  'elim.predict_first': { name: 'Predict before the options', instinct: 'I know what the answer has to say before I read the choices.', family: 'elim' },
  'elim.systematic': { name: 'Systematic elimination', instinct: 'Unsupported, then extreme, then reversed, then wrong scope.', family: 'elim' },
  'elim.attractive_unsupported': { name: 'Attractive but unsupported', instinct: 'I like it. The passage never said it.', family: 'elim' },
  'elim.weak_distractor': { name: 'Recognising a weak distractor', instinct: 'This one was never in the running.', family: 'elim' },
  'elim.partial_solve': { name: 'Eliminate without fully solving', instinct: 'Three are gone; I can commit without proving the fourth.', family: 'elim' },
  'elim.time_pressure': { name: 'Deciding under time', instinct: 'Ninety seconds. Choose on the evidence I have.', family: 'elim' },
  'elim.near_tie': { name: 'Breaking a near-tie', instinct: 'Two finalists; one word separates them; find it in the passage.', family: 'elim' },
  'meta.ambiguity': { name: 'Handling ambiguity', instinct: 'The sentence allows two readings; the paragraph allows one.', family: 'meta' },
  'meta.contradiction': { name: 'Recognising contradiction', instinct: 'This option cannot be true alongside that sentence.', family: 'meta' },
  'meta.attention': { name: 'Sustained attention', instinct: 'I am still reading closely at line forty.', family: 'meta' },
  'disc.pronoun_antecedent': { name: 'Pronoun and antecedent', instinct: 'This sentence cannot open: ‘it’ has nothing to point at yet.', family: 'disc' },
  'disc.demonstrative': { name: 'Demonstrative reference', instinct: '‘This view’, ‘such cases’: the thing referred to must already be on the page.', family: 'disc' },
  'disc.repeated_noun': { name: 'Repeated noun', instinct: 'The same noun, definite the second time.', family: 'disc' },
  'disc.lexical_chain': { name: 'Lexical chain', instinct: 'Word, synonym, hypernym: one idea walking through the paragraph.', family: 'disc' },
  'disc.chronology': { name: 'Chronology', instinct: 'Then, later, finally: time orders the sentences.', family: 'disc' },
  'disc.cause_effect': { name: 'Cause then effect', instinct: 'The effect cannot arrive before its cause.', family: 'disc' },
  'disc.contrast': { name: 'Contrast', instinct: '‘But’ needs something to push against.', family: 'disc' },
  'disc.concession': { name: 'Concession', instinct: '‘Admittedly’ gives; the next sentence takes back.', family: 'disc' },
  'disc.example_after_claim': { name: 'Example after claim', instinct: '‘For instance’ follows the thing it instances.', family: 'disc' },
  'disc.general_to_specific': { name: 'General to specific', instinct: 'The wide sentence opens; the narrow ones follow.', family: 'disc' },
  'disc.specific_to_general': { name: 'Specific to general', instinct: 'Cases first, then the sentence they add up to.', family: 'disc' },
  'disc.definition_then_application': { name: 'Definition then application', instinct: 'The term is fixed, then used.', family: 'disc' },
  'disc.question_then_answer': { name: 'Question then answer', instinct: 'The question sentence comes first; the answer sentence cannot precede it.', family: 'disc' },
  'disc.claim_then_evidence': { name: 'Claim then evidence', instinct: 'The finding follows the claim it supports.', family: 'disc' },
  'disc.problem_then_solution': { name: 'Problem then solution', instinct: 'Nobody solves a problem the paragraph has not stated.', family: 'disc' },
  'disc.rhetorical_pivot': { name: 'Rhetorical pivot', instinct: 'The paragraph turns on one sentence; everything before is setup.', family: 'disc' },
  'disc.transition_word': { name: 'Explicit transition', instinct: '‘However’, ‘moreover’, ‘consequently’: a signpost, with a direction.', family: 'disc' },
  'disc.implicit_transition': { name: 'Implicit transition', instinct: 'No signpost, but the idea handed on is unmistakable.', family: 'disc' },
  'disc.opening_sentence': { name: 'Opening sentence', instinct: 'It needs nothing before it, and names what follows.', family: 'disc' },
  'disc.closing_sentence': { name: 'Closing sentence', instinct: 'It hands nothing on; the paragraph lands here.', family: 'disc' },
  'disc.given_new': { name: 'Given then new', instinct: 'The new information of one sentence is the given of the next.', family: 'disc' },
  'disc.parallelism': { name: 'Parallel structure', instinct: 'The same frame, twice: the second follows the first.', family: 'disc' },
  'disc.tense_continuity': { name: 'Tense continuity', instinct: 'The paragraph is in the past; this sentence is not.', family: 'disc' },
  'disc.stance_continuity': { name: 'Stance continuity', instinct: 'The paragraph is sceptical; this sentence is admiring.', family: 'disc' },
  'disc.topic_progression': { name: 'Topic progression', instinct: 'Each sentence narrows or advances the one before.', family: 'disc' },
  'disc.scope_continuity': { name: 'Scope continuity', instinct: 'The paragraph is about one city; this sentence is about civilisation.', family: 'disc' },
  'disc.function_slot': { name: 'Function of the missing sentence', instinct: 'The gap needs a reason, an example, a turn or a landing: I know which.', family: 'disc' },
  'disc.competing_ending': { name: 'Competing endings', instinct: 'Two sentences sound final; the one the other depends on comes second.', family: 'disc' },
  'disc.competing_opener': { name: 'Competing openers', instinct: 'Two sentences could open; only one is free of references.', family: 'disc' },
  'sum.central_vs_supporting': { name: 'Central versus supporting', instinct: 'This is the point; that is what holds it up.', family: 'sum' },
  'sum.example_vs_claim': { name: 'Example versus claim', instinct: 'A vivid story is never the point.', family: 'sum' },
  'sum.qualification_kept': { name: 'Qualification kept', instinct: 'The summary keeps the ‘only when’.', family: 'sum' },
  'sum.stance_kept': { name: 'Stance kept', instinct: 'The author was sceptical; the summary must be too.', family: 'sum' },
  'sum.certainty_kept': { name: 'Certainty kept', instinct: 'The author said ‘may’; the summary may not say ‘will’.', family: 'sum' },
  'sum.no_addition': { name: 'Nothing added', instinct: 'If it is not in the paragraph, it is not in the summary.', family: 'sum' },
  'sum.compression': { name: 'Compression', instinct: 'Fewer words, same claim, same reach.', family: 'sum' },
  'sum.minor_detail_dropped': { name: 'Minor detail dropped', instinct: 'The date, the name, the number: none of them is the point.', family: 'sum' },
  'word.context_clue': { name: 'Context clue', instinct: 'The sentence tells me what the word must mean here.', family: 'word' },
  'word.morphology': { name: 'Morphology', instinct: 'Prefix, root, suffix: I can build the meaning.', family: 'word' },
  'word.root_family': { name: 'Root family', instinct: 'I know this root from three other words.', family: 'word' },
  'word.prefix_logic': { name: 'Prefix logic', instinct: 'The prefix sets the direction.', family: 'word' },
  'word.suffix_logic': { name: 'Suffix logic', instinct: 'The suffix sets the part of speech and the shade.', family: 'word' },
  'word.register': { name: 'Register', instinct: 'Right meaning, wrong room.', family: 'word' },
  'word.connotation': { name: 'Connotation', instinct: 'Same dictionary line, different feeling.', family: 'word' },
  'word.near_synonym': { name: 'Near-synonym distinction', instinct: 'Close, and the difference is exactly what is being tested.', family: 'word' },
  'word.confusable_pair': { name: 'Confusable pair', instinct: 'They look alike; the sentence wants one of them.', family: 'word' },
  'word.unfamiliar_decoding': { name: 'Decoding an unfamiliar word', instinct: 'I have never seen it, and I can still work it out.', family: 'word' },
  'word.polysemy': { name: 'Polysemy', instinct: 'This word has four senses; the sentence picks one.', family: 'word' },
  'word.tone_of_word': { name: 'Tone carried by a word', instinct: 'The author’s attitude lives in this one choice of word.', family: 'word' },
  'cr.assumption_gap': { name: 'The assumption gap', instinct: 'Between the evidence and the conclusion, something unstated is holding the weight.', family: 'cr' },
  'cr.strengthen': { name: 'Strengthen', instinct: 'This makes the conclusion more likely, given the same evidence.', family: 'cr' },
  'cr.weaken': { name: 'Weaken', instinct: 'This makes the conclusion less likely without denying the evidence.', family: 'cr' },
  'cr.flaw': { name: 'Flaw', instinct: 'The reasoning would fail even if every premise were true.', family: 'cr' },
  'cr.paradox': { name: 'Resolve the paradox', instinct: 'Both facts stay true; the option shows how.', family: 'cr' },
  'cr.inference': { name: 'Inference from an argument', instinct: 'What the statements together force.', family: 'cr' },
  'cr.principle': { name: 'Principle', instinct: 'The rule that, if accepted, justifies the conclusion.', family: 'cr' },
  'cr.parallel_reasoning': { name: 'Parallel reasoning', instinct: 'Same skeleton, different flesh.', family: 'cr' },
  'cr.evaluate': { name: 'Evaluate the argument', instinct: 'The answer to this question would decide whether the argument works.', family: 'cr' },
  'cr.conclusion': { name: 'Find the conclusion', instinct: 'The sentence the others exist for.', family: 'cr' },
  'cr.role_of_statement': { name: 'Role of a statement', instinct: 'This sentence is a premise for one claim and evidence against another.', family: 'cr' },
  'cr.sampling': { name: 'Sampling and generalisation', instinct: 'From this group to that group: was the sample fit for it?', family: 'cr' },
  'cr.alternative_cause': { name: 'Alternative cause', instinct: 'Something else could have produced the same effect.', family: 'cr' },
});

/** The family a pattern belongs to (comp, inf, arg, scope, lang, …). */
export const PATTERN_FAMILY = Object.freeze(
  Object.fromEntries(Object.entries(PATTERNS).map(([k, v]) => [k, v.family])),
);

/** The item banks the verbal-bank module plays, → module key, the place
 *  that hosts them, and the craft they pay. wb bundles are hosted by the
 *  place their KIND belongs to (see WB_KIND_REGION). Placement and
 *  completion come three at a time (3.2): a set is something finished in
 *  one sitting, and the friend's thanks lands after it. */
export const BANKS = Object.freeze({
  sp: { module: 'sp', name: 'Sentence placement', region: 'placement', craft: 'thread', setSize: 3, skill: 'placement' },
  pc: { module: 'pc', name: 'Paragraph completion', region: 'completion', craft: 'thread', setSize: 3, skill: 'completion' },
  cr: { module: 'cr', name: 'Arguments', region: 'reading-room', craft: 'ink', setSize: 5, skill: 'argument' },
  wb: { module: 'wb', name: 'Words, asked the CAT way', region: 'meadow', craft: 'amber', setSize: 10, skill: 'vocabulary_in_context' },
});

/** Which place plays each word-bank kind, and the skill its items default to. */
export const WB_KIND_REGION = Object.freeze({
  context: 'meadow', register: 'meadow', connotation: 'meadow', synonym_distinction: 'meadow',
  confusable: 'pond', decode: 'terraces',
});
export const WB_KIND_SKILL = Object.freeze({
  context: ['vocabulary_in_context'],
  decode: ['root', 'word_part'],
  confusable: ['word_pair'],
  register: ['word_precision'], connotation: ['word_precision'], synonym_distinction: ['word_precision'],
});

/** Which ledger skill each critical-reasoning kind may name. */
export const CR_KIND_SKILL = Object.freeze({
  assumption: ['argument'], flaw: ['argument'], conclusion: ['argument'], role: ['argument', 'logical_structure'],
  principle: ['argument', 'application'], paradox: ['argument', 'inference'], evaluate: ['argument'],
  strengthen: ['strengthen_weaken'], weaken: ['strengthen_weaken'],
  inference: ['inference'], parallel: ['logical_structure'],
});

/** The eight-rung verbal ladder every bank tier belongs to, with the
 *  difficulty_numeric each rung may carry (inclusive). */
export const TIER_RANGE = Object.freeze({
  foundation: [1, 2], easy: [2, 3], medium: [4, 5], advanced: [5, 6],
  cat: [6, 7], 'cat-plus': [7, 8], 'ninety-nine': [8, 9], premium: [9, 10],
});

export const LENGTH_CLASSES = Object.freeze({ short: [120, 349], medium: [350, 599], long: [600, 900] });
export function lengthClassOf(words) {
  for (const [k, [lo, hi]] of Object.entries(LENGTH_CLASSES)) if (words >= lo && words <= hi) return k;
  return words < 120 ? 'short' : 'long';
}

export function difficultyLabel(n) { return n <= 3 ? 'easy' : n <= 6 ? 'medium' : 'hard'; }
