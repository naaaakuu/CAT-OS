/**
 * ooo-voice.js — the Odd One Out mentor's entire vocabulary, in one
 * reviewable file, exactly like voice.js (reading), pj-voice.js
 * (jumbles) and ps-voice.js (summaries).
 *
 * Register (ODD_MAN_OUT_BIBLE §7, §12): the solver pattern taxonomy is
 * the shared vocabulary of feedback. Every pattern the schema can name
 * has an entry here with the pull (why the brain reaches for it), the
 * notice (how to catch it next time), and a twenty second recall. The
 * mentor teaches structural reading, never elimination tricks: the
 * Bible's core finding is that coaching shortcuts are exactly what a
 * well made item defeats, so signals are taught as hypotheses and the
 * build first protocol is taught as the method.
 *
 * tools/verify.mjs lints every exported string against BANNED_WORDS
 * from voice.js and checks that every mistake_type, violation_type and
 * mission the ooo schema can name has its entry here. Deterministic:
 * variety comes from pick() on a stable seed, never Math.random().
 *
 * Learner facing strings here avoid dash punctuation deliberately
 * (owner rule): clean sentences, commas and full stops.
 */

import { pick } from './voice.js';

export { pick };

/* ------------------------------------------------------------------ */
/* Opening lines, by situation.                                        */
/* ------------------------------------------------------------------ */

export const OOO_OPENINGS = Object.freeze({
  first: [
    'That was your first exclusion set. One thing already stands out, and it is worth keeping.',
    'First set done. Before anything else, notice this one thing.',
  ],
  mastery: [
    'Every intruder was built to pass your first glance, and none of them passed your paragraph. Notice how.',
    'Clean detection. The camouflage tried its pulls and none of them landed.',
  ],
  growth: [
    'Something changed today. A pull that used to catch you stayed quiet.',
    'An old pattern went silent this session. That is earned.',
  ],
  watch: [
    'One moment in this session is worth more than the score. Here it is.',
    'Today I noticed something small. Twenty seconds on it now protects marks later.',
    'Your structural reading is getting stronger. One habit is worth watching next.',
  ],
  skipped: [
    'You set one item aside today. Here is a way into it, for next time.',
  ],
});

/* ------------------------------------------------------------------ */
/* Solver patterns — the heart of the OOO mentor's teaching.           */
/* One per mistake_type the schema can name (Bible §7 taxonomy).       */
/* For each:                                                           */
/*   name    — the pattern in calm, human words                        */
/*   pull    — why the brain reaches for it (what the item does to     */
/*             readers, never what the reader did)                     */
/*   notice  — how to catch it next time, one actionable line          */
/*   recall  — a twenty second self question and answer, for tomorrow  */
/* ------------------------------------------------------------------ */

export const OOO_TRAP_PATTERNS = Object.freeze({
  surface_oddity: {
    name: 'The sentence that dressed differently',
    pull: 'One sentence carries a visible surface feature, a lone tense, an unusual register, an opening connective, and under time pressure feeling different reads as being different. Setters plant exactly this: a sentence that genuinely belongs, wearing something that makes a shortcut reader exclude it on sight.',
    notice: 'Never exclude on feel. Build the four sentence paragraph first, then ask whether the odd feeling sentence truly has no seat in it. A surface feature is a costume, not a verdict.',
    recall: {
      question: 'A sentence feels different in tone or tense from the rest. What is the check before excluding it?',
      answer: 'Build the paragraph and test the seat. A sentence can dress differently and still belong. Only structure decides.',
    },
  },
  lexical_pull: {
    name: 'Familiar words, borrowed membership',
    pull: 'The intruder shares the core’s vocabulary, so every shallow check says it belongs, and the exclusion lands on a quieter sentence instead. Shared words feel like shared purpose. Setters reuse the core’s own nouns in the outlier precisely so that keyword matching keeps the stranger and evicts a resident.',
    notice: 'Treat heavy word overlap as a reason to slow down, never as proof of belonging. Ask what each sentence is doing, not what it is about. Same topic is cheap. Same structure is everything.',
    recall: {
      question: 'A sentence shares the paragraph’s exact vocabulary. Does that make it belong?',
      answer: 'No. Topical overlap is the camouflage. Membership is decided by the discourse role a sentence can play, not by the words it borrows.',
    },
  },
  premature_closure: {
    name: 'The verdict before the paragraph',
    pull: 'Under a clock the brain wants to judge sentences one by one and be done. But an exclusion made before the four sentence paragraph exists is a guess about a whole made from a part. The Bible calls construction first the entire method, and the pull to skip it is strongest exactly when the item is hardest.',
    notice: 'Hold the protocol: build the four, read them back as one paragraph, then test the fifth against what you built. The paragraph is the instrument. Without it there is nothing to measure against.',
    recall: {
      question: 'What comes first, finding the odd sentence or building the paragraph?',
      answer: 'Building the paragraph. The odd one is whatever the finished paragraph has no seat for. Detection is the last step, not the first.',
    },
  },
  hardest_to_place: {
    name: 'Hard to place is not out of place',
    pull: 'One sentence resists easy ordering, and the effort of placing it gets misread as evidence against it. This is a habit imported from jumbles, where awkward sentences cost time. Here it costs the answer: a sentence can be genuinely difficult to position and still be structurally necessary.',
    notice: 'Separate two questions. Where does this sentence go, and can this sentence attach at all. Only the second one decides exclusion. Difficulty of placement is about you. Impossibility of attachment is about the paragraph.',
    recall: {
      question: 'A sentence is hard to fit anywhere. Is it the odd one?',
      answer: 'Not for that reason. Hard to place is a solving experience. Does not fit is a structural fact. Test attachment, not effort.',
    },
  },
  no_uniqueness_test: {
    name: 'Two suspects, one test short',
    pull: 'The field narrows to two candidates and the brain, tired of holding both, picks the one that feels more removable. The finishing move was never made: remove each candidate in turn and read what remains. Only one removal leaves a paragraph. The other leaves a hole.',
    notice: 'When two sentences both look excludable, run the removal test on each. Take one out, read the four that remain, then swap. A fair item survives exactly one of those readings.',
    recall: {
      question: 'Two sentences both feel excludable. What breaks the tie?',
      answer: 'The removal test. Remove each in turn and read the remaining four. Exactly one removal leaves a coherent paragraph.',
    },
  },
  connective_assumption: {
    name: 'The signpost that pointed home',
    pull: 'A sentence opens with a pronoun or a connective, and the brain files it as dependent, so it must belong to the chain. But setters give the intruder exactly those hooks. A therefore can point at nothing. A this can have no antecedent anywhere in the core. The hook is real. The anchor is missing.',
    notice: 'When a sentence leans on a pronoun or a connective, find the exact sentence it points to. If no core sentence can be the antecedent, the hook is bait, not belonging.',
    recall: {
      question: 'A sentence opens with a connective, so it seems to depend on the others. What is the check?',
      answer: 'Find the antecedent. A connective names a relation, not a member. If nothing in the core can anchor it, the sentence is hooked to air.',
    },
  },
  local_smoothness: {
    name: 'The neighbour test that was not enough',
    pull: 'The intruder reads smoothly next to one core sentence, and one good join feels like enough. But local fit is the cheapest thing a setter can manufacture. The hardest items place a sentence that links beautifully to a neighbour while serving a purpose the paragraph as a whole never takes up.',
    notice: 'After any promising join, zoom out and ask the global question. What is this paragraph doing, and does this sentence do that. A member serves the whole, not just the sentence beside it.',
    recall: {
      question: 'A sentence connects well to one other sentence. Is that belonging?',
      answer: 'Not yet. Local fit is necessary, never sufficient. Test the sentence against the paragraph’s whole purpose before keeping it.',
    },
  },
});

/* ------------------------------------------------------------------ */
/* Violation language — the seven ways an outlier fails (Bible §4).    */
/* The teaching layer names the crime with these, so learners build a  */
/* taxonomy of structure, not a memory of items.                       */
/* ------------------------------------------------------------------ */

export const OOO_VIOLATION_PATTERNS = Object.freeze({
  topically_alien: {
    name: 'Same topic, no seat at the table',
    essence: 'It shares the subject matter but there is no discourse relation by which it could attach to what the four are building.',
  },
  wrong_scope: {
    name: 'The claim at a different altitude',
    essence: 'The core works at one reach, specific or broad, and this sentence speaks at another. The subject matches. The scale does not.',
  },
  general_vs_specific: {
    name: 'A definition inside a story',
    essence: 'A general or definitional statement dropped into a specific narrative or argument. True, tidy, and serving no move the paragraph makes.',
  },
  stance_shift: {
    name: 'A different voice in the same room',
    essence: 'The core holds one stance or register and this sentence speaks in another, reporting where the author argues, or judging where the author describes.',
  },
  thread_break: {
    name: 'The thread picked up sideways',
    essence: 'The core narrates one dimension of the matter and this sentence switches to a different one, so the story continues but the thread does not.',
  },
  method_vs_finding: {
    name: 'How it was found, not what was found',
    essence: 'The paragraph reports what is known and this sentence reports how the knowing was done, or the reverse. Same research, different question.',
  },
  example_no_claim: {
    name: 'An example with no claim to serve',
    essence: 'An illustration whose generalisation is absent from the core, or an aside no other sentence supports. Vivid, relevant sounding, and unemployed.',
  },
});

/* ------------------------------------------------------------------ */
/* Tie language — the cohesive ties, in human words (Bible §3).        */
/* ------------------------------------------------------------------ */

export const OOO_TIE_LABELS = Object.freeze({
  reference: 'a pronoun or a the pointing back',
  conjunction: 'a connecting word naming the relation',
  lexical: 'the same idea carried in kindred words',
  substitution: 'a stand in word holding an earlier idea',
  ellipsis: 'something left unsaid because the last sentence said it',
  given_new: 'old information carrying new information in',
});

/* ------------------------------------------------------------------ */
/* Missions — Today's Mission, shown before every item.                */
/* One per mission the schema can name. Rotation is intelligent        */
/* because each item declares the mission its design foregrounds.      */
/* ------------------------------------------------------------------ */

export const OOO_MISSIONS = Object.freeze({
  protect_continuity: {
    title: 'Protect paragraph continuity.',
    line: 'Four sentences hand a thought to each other without dropping it. Feel for the handoffs, and notice where one sentence receives nothing and passes nothing on.',
  },
  find_the_branch: {
    title: 'Find the logical branch.',
    line: 'Somewhere the road forks. Four sentences walk one way. One walks the other while talking about the same country.',
  },
  track_the_direction: {
    title: 'Track the author’s direction.',
    line: 'Every paragraph moves somewhere, from setup to point, from cause to consequence. Notice which sentence moves with it and which one only stands nearby.',
  },
  notice_topic_stability: {
    title: 'Notice topic stability.',
    line: 'All five sentences share a topic. That is the camouflage, not the test. Watch what each sentence does with the topic, not whether it mentions it.',
  },
  build_before_eliminating: {
    title: 'Build the paragraph before eliminating.',
    line: 'Do not hunt the stranger. Build the household first. Once four sentences hold together as one paragraph, the fifth excludes itself.',
  },
  test_the_ties: {
    title: 'Test the ties, not the tone.',
    line: 'Pronouns, connectives and repeated ideas are the visible stitching of a paragraph. Check each tie for a real anchor. A tie into thin air is the tell.',
  },
  watch_the_scope: {
    title: 'Watch the reach of each claim.',
    line: 'A paragraph settles at one altitude, the specific case or the broad rule. Notice any sentence flying at a different height over the same ground.',
  },
  hold_the_purpose: {
    title: 'Hold the paragraph’s purpose.',
    line: 'Ask what the four are jointly doing, arguing, narrating, explaining. Then ask of each sentence, does it do that work, or different work in similar clothes.',
  },
});

/* ------------------------------------------------------------------ */
/* The Think button — a thinking coach, never a hint machine.          */
/* Questions only. Nothing here may point at a sentence or reveal      */
/* anything about the answer. A core set applies to every item; each   */
/* mission adds sharper questions of its own kind.                     */
/* ------------------------------------------------------------------ */

export const OOO_THINK = Object.freeze({
  core: [
    'Which four sentences naturally belong together?',
    'Does one sentence begin a different discussion?',
    'Which sentence interrupts logical continuity?',
    'Does one sentence introduce a different purpose?',
    'Which sentence would make the paragraph stronger if removed?',
    'Is the sentence you suspect broken in itself, or does it simply belong to a different paragraph?',
    'Can you build a complete four sentence paragraph, and read it back as one thought?',
    'What is this paragraph doing as a whole, and does every sentence do that work?',
  ],
  byMission: {
    protect_continuity: [
      'Where exactly does each sentence receive the previous one’s idea, and where does one receive nothing?',
      'If you read your four in order, does any handoff feel like a jump rather than a step?',
    ],
    find_the_branch: [
      'At which sentence could the discussion have gone two ways, and which way did the author actually go?',
      'Is one sentence answering a neighbouring question rather than this paragraph’s question?',
    ],
    track_the_direction: [
      'Say the paragraph’s journey in four words, start to landing. Which sentence is not on that route?',
      'Does every sentence move the paragraph forward, or does one only stand beside it?',
    ],
    notice_topic_stability: [
      'Strip away the shared topic words. What is each sentence doing underneath them?',
      'Which sentence would survive in a different paragraph on this same topic?',
    ],
    build_before_eliminating: [
      'Have you actually built the four, or are you judging sentences one by one?',
      'Read your built paragraph once more. Does the leftover sentence truly have no seat in it?',
    ],
    test_the_ties: [
      'For every pronoun, this, or therefore, can you point at the exact sentence it holds onto?',
      'Is any tie pointing at something no sentence here ever established?',
    ],
    watch_the_scope: [
      'How far does each sentence’s claim reach, one case, one field, or the whole world?',
      'Do four sentences share an altitude that one sentence does not?',
    ],
    hold_the_purpose: [
      'Is the paragraph arguing, narrating, describing, or explaining? Name it before judging anything.',
      'Which sentence does different work, even though it wears the same vocabulary?',
    ],
  },
});

/* ------------------------------------------------------------------ */
/* Reading DNA observation copy (Growth page). Calm and specific.      */
/* ------------------------------------------------------------------ */

export const OOO_DNA_COPY = Object.freeze({
  patternQuiet: (patternName, cleanSessions) => ({
    title: `${patternName}, going quiet`,
    body: `A pull that used to appear in your detection has not landed once in your last ${cleanSessions} sessions. That is growth you earned.`,
  }),
  patternAffinity: (patternName, count, items) => ({
    title: patternName,
    body: `This pull has appeared ${count} times across ${items} items. Naming it is most of the fix. Watch for it on your next set.`,
  }),
  overlapFriction: (lowAcc, highAcc) => ({
    title: 'Shared vocabulary has been buying membership',
    body: `When the intruder borrows the core’s own words your picks land about ${lowAcc}, against ${highAcc} when it stands apart. That gap is one habit: judge what a sentence does, never what it mentions.`,
  }),
  overlapStrength: () => ({
    title: 'Camouflage is not working on you',
    body: 'Your accuracy holds even when the intruder shares the core’s vocabulary and hooks. That is structural reading doing exactly what it is for. Keep doing it deliberately.',
  }),
  globalFriction: (lowAcc, highAcc) => ({
    title: 'The locally smooth intruders get through',
    body: `On items where the intruder joins one sentence cleanly but serves no global purpose, your picks land about ${lowAcc}, against ${highAcc} when it breaks a visible link. After any good join, step back and test the sentence against the whole paragraph’s purpose.`,
  }),
  globalStrength: () => ({
    title: 'You test the whole, not the neighbour',
    body: 'Items built to pass the neighbour test and fail the paragraph test are landing for you. Holding the whole paragraph while judging one sentence is the trait this question type exists to measure.',
  }),
  decoyFriction: (count, items) => ({
    title: 'The costume keeps catching the eye',
    body: `${count} picks across ${items} items went to a sentence dressed differently that truly belonged. Surface features are costumes. Build the four first, then ask whether the odd feeling sentence has a seat.`,
  }),
  buildStrength: (pct) => ({
    title: 'Your paragraphs are mostly true',
    body: `Even on items that did not land, about ${pct} of your built joins matched the author’s. The construction skill is there. The remaining work is the final test of the fifth sentence, which is exactly trainable.`,
  }),
  fastMissWatch: (count) => ({
    title: 'The quick exclusions are the costly ones',
    body: `${count} times, a sentence excluded within seconds did not hold. Speed is fine once the paragraph is built. Build the four, read them back, then let the fifth exclude itself.`,
  }),
  velocity: (early, late) => ({
    title: 'Learning velocity, visible',
    body: `Your first sessions landed about ${early}. Your recent ones sit near ${late}. Same camouflage, better judgment meeting it. Keep the pace honest and this keeps climbing.`,
  }),
});

/* ------------------------------------------------------------------ */
/* Small connective lines.                                             */
/* ------------------------------------------------------------------ */

export const OOO_LINES = Object.freeze({
  numbersAside: (correct, total) =>
    `${correct} of ${total} intruders identified. The noticing matters more than the count.`,
  missionEyebrow: 'Today’s mission',
  thinkTitle: 'Think it through',
  thinkLead: 'No hints live here. Only the questions strong readers ask themselves.',
  buildNudge: 'Read your four back once. Does each sentence hand off to the next, and does the one left out truly have no seat?',
  excludeNudge: 'Before you lock it in, build the other four in your head and read them as one paragraph. The exclusion should feel like the paragraph closing, not like a guess.',
  constructHint: 'Tap four sentences in the order that builds the strongest paragraph. The one you leave out becomes your answer.',
  excludeHint: 'Tap the one sentence that does not belong in the paragraph the other four build.',
  keepGoing: [
    'One more set will tell us more.',
    'Carry it into the next set.',
    'Tomorrow’s items will show whether it sticks.',
  ],
  masteryWalkedPast: (patternName) =>
    `This set carried "${patternName.toLowerCase()}", the pull that used to catch you, and you walked straight past it.`,
});
