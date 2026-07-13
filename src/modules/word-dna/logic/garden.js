/**
 * garden.js — the Word Garden. Pure logic, no DOM, no storage.
 *
 * Not a word list of everything seen — a slow-growing shelf of words
 * genuinely EARNED (WORD_DNA_BIBLE §8): every held-out word from the
 * Apply/transfer step that was answered correctly at least once. Fully
 * derived from stored sessions joined to content, exactly like
 * core/mentor/dna.js derives Reading DNA — no separate "garden" record
 * is ever stored, so there is nothing here to migrate or fall out of
 * sync with the sessions themselves.
 */

/**
 * @param {Array} sessions stored session records (any modules; wd picked out)
 * @param {Map}   items    item_id -> loaded Word DNA content item
 * @returns {Array<{word, meaning, unit_id, unit_title, unit_kind, earned_at}>}
 *          newest earned first
 */
export function deriveWordGarden(sessions, items) {
  const wdSessions = sessions
    .filter((s) => s.module === 'wd')
    .sort((a, b) => a.finished_at.localeCompare(b.finished_at));

  const earned = new Map(); // word -> entry (first time earned wins the record, but we resort by newest below)
  for (const s of wdSessions) {
    for (const a of s.answers ?? []) {
      const item = items.get(a.item_id ?? a.question_id);
      if (!item) continue;
      (a.applies ?? []).forEach((applyAnswer, i) => {
        if (!applyAnswer || applyAnswer.is_correct !== true) return;
        const challenge = item.discovery.applies[i];
        const word = challenge?.held_out_word;
        if (!word) return;
        const member = item.members.find((m) => m.word === word);
        earned.set(word, {
          word,
          meaning: member?.meaning ?? '',
          unit_id: item.meta.id,
          unit_title: item.unit.label,
          unit_kind: item.meta.kind,
          earned_at: s.finished_at,
        });
      });
    }
  }
  return [...earned.values()].sort((a, b) => b.earned_at.localeCompare(a.earned_at));
}
