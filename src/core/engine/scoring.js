/**
 * scoring.js — pure scoring functions. No UI, no storage, no state.
 *
 * Two numbers are reported (PROJECT_ROADMAP V1.0: "questions correct,
 * accuracy, time taken" — plus CAT-convention marks as context):
 *
 * - accuracy: correct / attempted, as the honest skill signal.
 * - marks:    +3 per correct, −1 per wrong, 0 per skipped — the
 *             marking convention widely used for CAT MCQs.
 *             HONESTY NOTE (per project epistemics): the exact scheme
 *             is published per exam cycle and can change; the result
 *             screen labels this "CAT-style marks", never an official
 *             score. Verify against the current year's notification.
 */

export const MARKS_CORRECT = 3;
export const MARKS_WRONG = -1;

/**
 * @param {Array<{is_correct: boolean|null}>} answers — one per question;
 *        is_correct === null means skipped.
 */
export function computeScore(answers) {
  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  for (const a of answers) {
    if (a.is_correct === true) correct += 1;
    else if (a.is_correct === false) wrong += 1;
    else skipped += 1;
  }
  const attempted = correct + wrong;
  return {
    total: answers.length,
    correct,
    wrong,
    skipped,
    attempted,
    accuracy: attempted === 0 ? 0 : correct / attempted,
    marks: correct * MARKS_CORRECT + wrong * MARKS_WRONG,
    max_marks: answers.length * MARKS_CORRECT,
  };
}
