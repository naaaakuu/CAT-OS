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
  direction: 'options that point the other way, or give a view to the wrong owner',
  support: 'options that sound right and are not in the passage',
  relevance: 'options that are true but do not answer the question',
  degree: 'options that are stronger or weaker than the text',
  language: 'options that reuse the passage’s words to say something else',
  tone: 'options that get the author’s attitude wrong',
});

/** The item banks the verbal-bank module plays, → module key, the place
 *  that hosts them, and the craft they pay. wb bundles are hosted by the
 *  place their KIND belongs to (see WB_KIND_REGION). */
export const BANKS = Object.freeze({
  sp: { module: 'sp', name: 'Sentence placement', region: 'loom', craft: 'thread', setSize: 6, skill: 'placement' },
  pc: { module: 'pc', name: 'Paragraph completion', region: 'table', craft: 'thread', setSize: 6, skill: 'completion' },
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
