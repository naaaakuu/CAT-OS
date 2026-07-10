/**
 * pj-voice.js — the Para Jumbles mentor's entire vocabulary, in one
 * reviewable file, exactly like voice.js does for reading.
 *
 * Register (PARA_JUMBLES_BIBLE §11 + the mentor rules): observation
 * over judgment, signals taught WITH their reliability, never as
 * rules, and no "trick" language ever. The Bible explicitly forbids
 * cheat-sheet style teaching; every pattern here says when a signal
 * helps AND when setters turn it against you.
 *
 * tools/verify.mjs lints every exported string against BANNED_WORDS
 * from voice.js, and checks that every trap the PJ schema can name
 * has a pattern with a recall here. Deterministic: variety comes from
 * pick() on a stable seed, never Math.random().
 */

import { pick } from './voice.js';

export { pick };

/* ------------------------------------------------------------------ */
/* Opening lines — how the jumble mentor begins, by situation.         */
/* ------------------------------------------------------------------ */

export const PJ_OPENINGS = Object.freeze({
  first: [
    'That was your first jumble. One thing already stands out, and it is worth keeping.',
    'First jumble done. Before anything else, notice this one thing.',
  ],
  mastery: [
    'Every paragraph came back together. What matters is how. One thing to keep.',
    'Clean solving. The sentences tried to mislead you and none of it landed.',
  ],
  growth: [
    'Something changed today. A pull that used to catch you stayed quiet.',
    'An old pattern went silent this session. That is earned.',
  ],
  watch: [
    'One moment in this session is worth more than the score. Here it is.',
    'Today I noticed something small. Twenty seconds on it now saves marks later.',
    'Your ordering is getting stronger. One habit is worth watching next.',
  ],
  skipped: [
    'You set one jumble aside today. Here is a way into it, for next time.',
  ],
});

/* ------------------------------------------------------------------ */
/* Trap patterns — the heart of the PJ mentor's teaching.              */
/* One per trap the schema can name (Bible §5, §12). For each:         */
/*   name    — the pattern in calm, human words                        */
/*   pull    — why the brain reaches for it (what the trap does to     */
/*             solvers, never what the solver did)                     */
/*   notice  — how to catch it next time, one actionable line          */
/*   recall  — a 20-second self-question + answer, for tomorrow        */
/* ------------------------------------------------------------------ */

export const PJ_TRAP_PATTERNS = Object.freeze({
  anchor_pair: {
    name: 'The pair that locks too early',
    pull: 'Two sentences share a strong hook, a repeated idea or a matching phrase, and the brain locks them together as a fixed pair. Everything else then gets built around that pair. Setters plant exactly this: a pairing that is possible locally but breaks the paragraph globally.',
    notice: 'When two sentences feel made for each other, hold the pair as a guess, not a decision. Ask: does the whole paragraph still flow if these two separate? A true pair is necessary, not just tempting.',
    recall: {
      question: 'Two sentences clearly link. What must you check before locking them together?',
      answer: 'Whether the full paragraph works with them apart. A real pair is necessary, not merely possible.',
    },
  },
  competing_opener: {
    name: 'Two doors that both open',
    pull: 'Two sentences each look self-contained, so both feel like the first line. Under time pressure the brain picks the more confident-sounding one and moves on. Setters write a developer sentence to look like an opener on purpose.',
    notice: 'An opener does two jobs: it introduces the topic and it needs nothing before it. When two candidates survive that test, place both and read each version forward. The true opener makes the second sentence feel inevitable.',
    recall: {
      question: 'Two sentences could both open the paragraph. What breaks the tie?',
      answer: 'Read each version forward. The true opener makes the next sentence feel inevitable, not just possible.',
    },
  },
  competing_ending: {
    name: 'Two ways to say goodbye',
    pull: 'Two sentences both sound final. One usually closes the argument; the other only closes a step of it. The brain hears a summing-up tone and files the sentence as the ending, even when its idea is still mid-journey.',
    notice: 'A true ending answers the paragraph, not a single sentence. Ask what question the whole paragraph raised, then check which candidate actually settles it.',
    recall: {
      question: 'Two sentences both sound conclusive. How do you pick the real ending?',
      answer: 'The real ending settles the whole paragraph’s question. The decoy only settles one step of it.',
    },
  },
  lexical_decoy: {
    name: 'The repeated word that lies',
    pull: 'Two sentences share an exact word, and shared words feel like glue. But authors often link neighbouring sentences with a synonym or a broader term, while the exact repeat sits two sentences away. Following the repeated word is the single most common way solvers go off course.',
    notice: 'When you spot a repeated word, slow down instead of speeding up. Check the meaning link: does the second sentence actually continue the first one’s idea, or just its vocabulary?',
    recall: {
      question: 'Two sentences repeat the same word. What is the check?',
      answer: 'Match ideas, not words. Authors often link true neighbours with a synonym, and plant the exact repeat as a decoy.',
    },
  },
  generic_the: {
    name: 'A "the" that needs no introduction',
    pull: '"The" usually points backward, so a sentence starting with "the" feels like it cannot open. But some things carry "the" from birth: the sun, the government, the internet. Setters open paragraphs with a generic "the" precisely to catch solvers applying the article rule mechanically.',
    notice: 'When "the" appears, ask whether the noun genuinely needs a prior mention. If the world already knows it, "the" tells you nothing about position.',
    recall: {
      question: 'A sentence starts with "the". Can it still open the paragraph?',
      answer: 'Yes, if the noun is one everyone already knows. "The" only blocks the opener slot when the noun needed introducing.',
    },
  },
  false_pronoun_binding: {
    name: 'The pronoun with two homes',
    pull: 'A pronoun needs an owner, and the brain hands it to the nearest matching noun. Setters write two sentences that could each own the same pronoun, so the nearest match feels resolved while the true owner sits elsewhere.',
    notice: 'When a pronoun could point to more than one thing, list every candidate before choosing. The author’s subject, the sentence’s main character, usually keeps the pronoun.',
    recall: {
      question: 'A pronoun fits two possible owners. Which one usually holds it?',
      answer: 'The sentence’s main subject, the entity the author keeps in focus, not simply the nearest noun.',
    },
  },
  misleading_connective: {
    name: 'A signpost without an address',
    pull: '"However" promises a contrast and the brain rushes to supply one. But a connective names a relation, not a neighbour: several sentences may contrast with the "however" sentence, and only the paragraph’s shape says which one the author meant.',
    notice: 'Treat a connective as half an instruction. It tells you the kind of link. The full paragraph, read as one argument, tells you which sentence completes it.',
    recall: {
      question: 'A sentence starts with "however". What does that fix, and what does it leave open?',
      answer: 'It fixes the relation: contrast. It does not fix the neighbour. Only the whole paragraph decides which sentence it contrasts with.',
    },
  },
});

/* ------------------------------------------------------------------ */
/* Signal language — devices and their reliability, in human words.    */
/* Bible §4: every signal is taught with its failure mode attached.    */
/* ------------------------------------------------------------------ */

export const DEVICE_LABELS = Object.freeze({
  pronoun_reference: 'a pronoun pointing back',
  demonstrative_reference: 'a "this" or "such" wrapping up the last idea',
  former_latter_reference: 'a "former" or "latter" pointing to an earlier pair',
  logical_connector: 'a connecting word naming the relation',
  thematic_development: 'the idea growing one step',
  causal_chain: 'cause flowing into effect',
  temporal_marker: 'time moving forward',
  contrast_signal: 'a turn against the previous sentence',
  given_new_flow: 'old information carrying new information in',
  lexical_bridge: 'the same idea in new words',
  parallel_structure: 'a matching shape completing a pattern',
});

export const RELIABILITY_LABELS = Object.freeze({
  high: 'a strong signal, though setters still test it',
  medium: 'a helpful signal that needs the meaning to confirm it',
  low: 'a gentle hint only; the argument itself must decide',
});

/* ------------------------------------------------------------------ */
/* Reading-DNA observation copy (Growth page) — calm and specific.     */
/* ------------------------------------------------------------------ */

export const PJ_DNA_COPY = Object.freeze({
  traitQuiet: (patternName, cleanSessions) => ({
    title: `${patternName} — going quiet`,
    body: `A pull that used to appear in your solving has not landed once in your last ${cleanSessions} sessions. That is growth you earned.`,
  }),
  trapAffinity: (patternName, count, items) => ({
    title: patternName,
    body: `This pull has appeared ${count} times across ${items} jumbles. Naming it is most of the fix. Watch for it on your next set.`,
  }),
  openerFriction: (misses, n) => ({
    title: 'First sentences ask for one more beat',
    body: `On ${n} jumbles built with more than one possible opening, the first slot went elsewhere ${misses} times. Try reading both openings forward before placing either.`,
  }),
  endingFriction: (misses, n) => ({
    title: 'Endings deserve the same minute',
    body: `On ${n} jumbles with two final-sounding sentences, the last slot drifted ${misses} times. Ask which sentence settles the whole paragraph, not just the previous line.`,
  }),
  globalFriction: (lowAcc, highAcc) => ({
    title: 'The whole paragraph is the answer',
    body: `When only one order is truly workable you land about ${highAcc}. When several orders feel locally fine it sits near ${lowAcc}. That gap is the skill of holding the whole argument, and it grows with deliberate read-backs.`,
  }),
  globalStrength: () => ({
    title: 'You solve with the whole paragraph',
    body: 'Your toughest jumbles, the ones where several orders feel locally fine, land as often as your easy ones. That is macro reading working. Keep doing it deliberately.',
  }),
  chainFriction: (n) => ({
    title: 'Long reference chains tax the hold',
    body: `Across ${n} jumbles where a pronoun or idea had to be carried a long way, accuracy dipped while shorter chains held up. Try naming each sentence’s main character before ordering; it lightens the load.`,
  }),
  implicitFriction: (n) => ({
    title: 'Unmarked links ask for inference',
    body: `Jumbles that link sentences without connecting words have been costlier than marked ones, across ${n} solved. When no word signals the relation, say the relation aloud yourself: because, despite, therefore.`,
  }),
  closureWatch: (count) => ({
    title: 'The lock clicks a little early',
    body: `${count} times, a sequence was locked within moments of assembling it, and the order did not hold. The read-back is where setters lose. Give the assembled paragraph one honest pass before locking.`,
  }),
  linksStrength: (pct) => ({
    title: 'Your pairings are mostly true',
    body: `Even on jumbles that did not fully land, about ${pct} of your sentence pairings matched the author’s. The links are there. The remaining work is the global arrangement, which is exactly trainable.`,
  }),
  velocity: (early, late) => ({
    title: 'Learning velocity, visible',
    body: `Your first sessions landed about ${early}. Your recent ones sit near ${late}. Same signals, better judgment. Keep the pace honest and this keeps climbing.`,
  }),
});

/* ------------------------------------------------------------------ */
/* Small connective lines.                                             */
/* ------------------------------------------------------------------ */

export const PJ_LINES = Object.freeze({
  numbersAside: (correct, total) =>
    `${correct} of ${total} sequences matched. The noticing matters more than the count.`,
  verifyNudge: 'Read it back once. Does each sentence hand off to the next?',
  keepGoing: [
    'One more set will tell us more.',
    'Carry it into the next set.',
    'Tomorrow’s jumbles will show whether it sticks.',
  ],
  masteryWalkedPast: (patternName) =>
    `This set carried "${patternName.toLowerCase()}", the pull that used to catch you, and you walked straight past it.`,
});
