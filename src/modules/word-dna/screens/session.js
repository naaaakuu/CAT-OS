/**
 * session.js (screen) — the Word DNA core loop, end to end, per family:
 * NOTICE the shared piece → PREDICT its meaning → COMMIT → REVEAL +
 * UNDERSTAND why it threads through every taught word → APPLY it to
 * one or two words never taught directly → the mentor moment
 * (WORD_DNA_BIBLE §3). Foreign-word and CAT-vocabulary units replace
 * the shared-piece Notice with a word-in-context Notice instead
 * (§3a): there is no pattern to spot, only a word to meet.
 *
 * Phases per unit:
 *  1. predicting  — the taught words (or the first context sentence),
 *                   the discovery prompt, three choices, Set aside / Lock it in.
 *  2. revealed    — verdict, the Understand block, then one or two
 *                   Apply challenges in turn, each with its own choice
 *                   and its own reveal.
 *  3. taught      — the family's one habit, then Next family / Finish the set.
 * The set ends with ONE lesson (core/mentor/wd-lesson), never a
 * scoreboard; the numbers stay one quiet tap away.
 */

import { loadWDItem, loadWDItems, listWDItems } from '../../../core/content-loader/loader.js';
import { WDSession } from '../../../core/engine/wd-session.js';
import { saveWDResults } from '../logic/store.js';
import { wdTreeOrder, branchInfo } from '../logic/tree.js';
import { STORES } from '../../../core/storage/storage-adapter.js';
import { sessionXP } from '../../../core/engagement/xp.js';
import { deriveEngagement } from '../../../core/engagement/stats.js';
import { newlyUnlocked } from '../../../core/engagement/achievements.js';
import { cue } from '../../../core/engagement/feedback.js';
import { playSound } from '../../../core/engagement/audio.js';
import { dayKey } from '../../../core/engagement/streaks.js';
import { deriveWDDNA } from '../../../core/mentor/wd-dna.js';
import { chooseWDLesson, wdLessonRecord } from '../../../core/mentor/wd-lesson.js';
import { WD_LINES } from '../../../core/mentor/wd-voice.js';
import { celebrate } from '../../../ui/components/cat-celebration.js';
import { toast } from '../../../ui/components/cat-toast.js';
import { escapeHTML, formatDuration } from '../../../core/utils/format.js';
import '../../../ui/components/cat-option.js';
import '../../../ui/components/cat-progress-bar.js';
import '../../../ui/components/cat-timer.js';
import '../../../ui/components/cat-xp-bar.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const SHARES_MEANING = ['root', 'prefix', 'suffix'];

/** Resolve what to practice: one unit id, or a branch's units in order. */
async function resolveSet(setParam) {
  if (/^wd-[0-9]{4}$/.test(setParam)) {
    return { setId: setParam, items: [await loadWDItem(setParam)] };
  }
  const registry = await listWDItems();
  const inBranch = wdTreeOrder(registry.filter((i) => i.kind === setParam));
  if (inBranch.length === 0) {
    throw new Error(`No Word DNA families found for "${setParam}".`);
  }
  const loaded = await loadWDItems(inBranch.map((i) => i.id));
  const items = inBranch.map((i) => loaded.get(i.id)).filter(Boolean);
  if (items.length === 0) throw new Error('That branch could not be loaded.');
  return { setId: `wd-set:${setParam}`, items };
}

/** Wrap the first case-insensitive match of `needle`'s stem in <mark>.
 *  For foreign/cat_vocab context sentences, where the word may appear
 *  inflected ("abating" for "abate"), so an exact match would too often miss. */
function markStem(haystack, needle, stemLen = 4) {
  const stem = needle.toLowerCase().split(' ')[0].slice(0, stemLen);
  const at = haystack.toLowerCase().indexOf(stem);
  if (at === -1) return escapeHTML(haystack);
  return `${escapeHTML(haystack.slice(0, at))}<mark>${escapeHTML(haystack.slice(at, at + stem.length))}</mark>${escapeHTML(haystack.slice(at + stem.length))}`;
}

/** Wrap the first case-insensitive match of a root/prefix/suffix label
 *  in <mark>, exactly (no stemming — the label IS the fragment to find).
 *  Hyphens are stripped ("ante-", "-ist") and a label naming several
 *  spellings ("cede / ceed / cess") tries each variant in turn, so every
 *  member of a multi-spelling family (WORD_DNA_BIBLE wd-0003) still lights up. */
function markRoot(word, label) {
  const variants = label.replace(/^-+|-+$/g, '').split(' / ').map((v) => v.trim().toLowerCase()).filter(Boolean);
  const lower = word.toLowerCase();
  for (const variant of variants) {
    const at = lower.indexOf(variant);
    if (at !== -1) {
      return `${escapeHTML(word.slice(0, at))}<mark>${escapeHTML(word.slice(at, at + variant.length))}</mark>${escapeHTML(word.slice(at + variant.length))}`;
    }
  }
  return escapeHTML(word); // no literal match (a suppletive form) — show plainly, never crash
}

export async function renderWDSession(outlet, { storage }, params) {
  let resolved;
  try {
    resolved = await resolveSet(params.set);
  } catch (err) {
    outlet.innerHTML = `
      <section class="screen">
        <h1>Can't open this set</h1>
        <div class="card"><p>${escapeHTML(err.message)}</p>
        <p class="muted"><a href="#/wd">Back to the Tree</a></p></div>
      </section>`;
    return;
  }

  const session = new WDSession(resolved.items, resolved.setId);
  const startedAt = Date.now();

  function showItem() {
    const item = session.current;
    const u = item.unit;
    const sharesMeaning = SHARES_MEANING.includes(u.kind);
    const branch = branchInfo(u.kind);

    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <a href="#/wd">← Tree</a>
          <span>Family <b>${session.index + 1}</b> of ${session.total}</span>
          <cat-timer></cat-timer>
        </div>
        <cat-progress-bar max="${session.total}" value="${session.index}"></cat-progress-bar>

        <div class="card">
          <p class="screen__eyebrow">${escapeHTML(branch.label)} · ${escapeHTML(u.label)}</p>
          <div class="briefing-chips">
            <span class="badge">${item.members.length} words</span>
            ${sharesMeaning ? `<span class="badge">${escapeHTML(u.origin_language)}</span>` : ''}
            <span class="badge">~${Math.max(1, Math.round(item.meta.estimated_time_sec / 60))} min</span>
          </div>

          <div id="notice-slot"></div>
          <div id="predict-slot"></div>
          <div id="understand-slot"></div>
          <div id="apply-slot"></div>
          <div id="teaching-slot"></div>
          <div class="session-actions" id="actions"></div>
        </div>
      </section>
    `;

    outlet.querySelector('cat-timer').startAt = startedAt;
    const noticeSlot = outlet.querySelector('#notice-slot');
    const predictSlot = outlet.querySelector('#predict-slot');
    const understandSlot = outlet.querySelector('#understand-slot');
    const applySlot = outlet.querySelector('#apply-slot');
    const teachingSlot = outlet.querySelector('#teaching-slot');
    const actions = outlet.querySelector('#actions');
    session.markItemShown();

    /* ---------------- Notice ---------------- */
    const taught = item.members.filter((m) => !m.held_out);
    if (sharesMeaning) {
      const sample = taught.slice(0, 3);
      noticeSlot.innerHTML = `
        <div class="wd-notice">
          ${sample.map((m) => `<p class="wd-notice__word">${markRoot(m.word, u.label)}</p>`).join('')}
          <p class="hint">${escapeHTML(item.discovery.notice_prompt)}</p>
        </div>`;
    } else {
      const anchor = taught[0];
      noticeSlot.innerHTML = `
        <div class="wd-notice">
          <p class="hint" style="margin-bottom: var(--space-2)">${escapeHTML(item.discovery.notice_prompt)}</p>
          <p class="wd-notice__sentence">${markStem(anchor.context_sentence, anchor.word)}</p>
        </div>`;
    }

    /* ---------------- Predict ---------------- */
    let selected = null;
    predictSlot.innerHTML = `
      <p class="psx__label">${sharesMeaning ? 'What do you think it means?' : 'What does it mean here?'}</p>
      ${item.discovery.predict_options.map((o, i) => `
        <cat-option letter="${LETTERS[i]}" text="${escapeHTML(o.text)}"></cat-option>`).join('')}
    `;
    predictSlot.addEventListener('cat-option-select', (e) => {
      if (predictSlot.hasAttribute('data-locked')) return;
      selected = LETTERS.indexOf(e.detail.letter);
      for (const opt of predictSlot.querySelectorAll('cat-option')) {
        opt.setAttribute('state', opt.getAttribute('letter') === e.detail.letter ? 'selected' : '');
      }
      syncPredictActions();
    });

    function syncPredictActions() {
      actions.innerHTML = `
        <button class="btn" id="skip">${WD_LINES.setAside}</button>
        <button class="btn btn--primary" id="lock" ${selected === null ? 'disabled' : ''}>${WD_LINES.lockIn}</button>
      `;
      actions.querySelector('#lock').addEventListener('click', onPredictLock);
      actions.querySelector('#skip').addEventListener('click', onSkip);
    }

    function onPredictLock() {
      if (selected === null) return;
      const verdict = session.answerPredict(selected);
      cue(verdict.is_correct ? 'correct' : 'wrong');
      predictSlot.setAttribute('data-locked', '');
      for (const opt of predictSlot.querySelectorAll('cat-option')) {
        const idx = LETTERS.indexOf(opt.getAttribute('letter'));
        opt.setAttribute('disabled', '');
        if (item.discovery.predict_options[idx].correct) opt.setAttribute('state', 'correct');
        else if (idx === selected) opt.setAttribute('state', 'wrong');
        else opt.setAttribute('state', 'dimmed');
      }
      revealUnderstand(verdict.is_correct);
    }

    function onSkip() {
      session.skip();
      predictSlot.innerHTML = '';
      noticeSlot.innerHTML = '';
      teachingSlot.innerHTML = `
        <div class="wdx-verdict">Set aside. Here is the family, taught anyway.</div>
        ${understandBlockHTML()}
        ${finalHabitHTML()}`;
      actions.innerHTML = nextButtonHTML();
      actions.querySelector('#next').addEventListener('click', onNext);
    }

    /* ---------------- Reveal + Understand ---------------- */
    function understandBlockHTML() {
      return `
        <div class="wd-understand">
          <p class="wd-understand__eyebrow">Understand</p>
          <p>${escapeHTML(item.discovery.understand_note)}</p>
        </div>
        <div class="vocab">
          ${taught.map((m) => `
            <div class="vocab__item">
              <div class="vocab__word">${escapeHTML(m.word)}</div>
              <p class="vocab__meaning">${escapeHTML(m.meaning)}</p>
            </div>`).join('')}
        </div>`;
    }

    function revealUnderstand(wasCorrect) {
      const verdict = wasCorrect
        ? { cls: 'is-correct', text: 'That is what it means.' }
        : { cls: 'is-wrong', text: `Not quite. ${escapeHTML(item.discovery.predict_options.find((o) => o.correct).text)} is closer.` };
      understandSlot.innerHTML = `
        <div class="wdx-verdict ${verdict.cls}">${verdict.text}</div>
        ${understandBlockHTML()}
      `;
      understandSlot.scrollIntoView({ block: 'nearest' });
      showApply(0);
    }

    /* ---------------- Apply ---------------- */
    function showApply(applyIndex) {
      const challenge = item.discovery.applies[applyIndex];
      if (!challenge) { showFinalTeaching(); return; }

      // Appended, never replacing applySlot's content: with two applies
      // (foreign/cat_vocab units), the first challenge's question and
      // verdict stay on screen while the second renders below it — the
      // same accumulate-don't-replace pattern Notice/Predict/Understand use.
      let appliedSelected = null;
      const block = document.createElement('div');
      block.className = 'wd-apply';
      block.dataset.apply = String(applyIndex);
      block.innerHTML = `
        <p class="wd-apply__eyebrow">Apply · a word you were not taught</p>
        <p class="wd-apply__prompt">${escapeHTML(challenge.prompt)}</p>
        ${challenge.options.map((o, i) => `
          <cat-option letter="${LETTERS[i]}" text="${escapeHTML(o.text)}"></cat-option>`).join('')}
      `;
      applySlot.appendChild(block);
      block.scrollIntoView({ block: 'nearest' });
      block.addEventListener('cat-option-select', (e) => {
        if (block.hasAttribute('data-locked')) return;
        appliedSelected = LETTERS.indexOf(e.detail.letter);
        for (const opt of block.querySelectorAll('cat-option')) {
          opt.setAttribute('state', opt.getAttribute('letter') === e.detail.letter ? 'selected' : '');
        }
        syncApplyActions();
      });

      function syncApplyActions() {
        actions.innerHTML = `
          <button class="btn btn--primary" id="lock" ${appliedSelected === null ? 'disabled' : ''}>${WD_LINES.lockIn}</button>
        `;
        actions.querySelector('#lock').addEventListener('click', onApplyLock);
      }

      function onApplyLock() {
        if (appliedSelected === null) return;
        const verdict = session.answerApply(applyIndex, appliedSelected);
        cue(verdict.is_correct ? 'correct' : 'wrong');
        block.setAttribute('data-locked', '');
        for (const opt of block.querySelectorAll('cat-option')) {
          const idx = LETTERS.indexOf(opt.getAttribute('letter'));
          opt.setAttribute('disabled', '');
          if (challenge.options[idx].correct) opt.setAttribute('state', 'correct');
          else if (idx === appliedSelected) opt.setAttribute('state', 'wrong');
          else opt.setAttribute('state', 'dimmed');
        }
        const line = document.createElement('div');
        line.className = `wdx-verdict ${verdict.is_correct ? 'is-correct' : 'is-wrong'}`;
        line.textContent = verdict.is_correct
          ? `That is what "${challenge.held_out_word}" means, applied from the pattern.`
          : `Close. The pattern actually gives "${challenge.held_out_word}" a slightly different sense here.`;
        block.appendChild(line);
        showApply(applyIndex + 1);
      }

      syncApplyActions();
    }

    /* ---------------- Final teaching + next ---------------- */
    function finalHabitHTML() {
      return `
        <div class="wdx__habit">
          <span class="wdx__habit-glyph" aria-hidden="true">⋔</span>
          <div>
            <div class="wdx__habit-label">Worth keeping</div>
            <p>${escapeHTML(u.mentor_note)}</p>
          </div>
        </div>`;
    }

    function nextButtonHTML() {
      return `<button class="btn btn--primary btn--block" id="next">
        ${session.isLast ? 'Finish the set' : 'Next family'}
      </button>`;
    }

    function showFinalTeaching() {
      teachingSlot.innerHTML = finalHabitHTML();
      teachingSlot.scrollIntoView({ block: 'start' });
      actions.innerHTML = nextButtonHTML();
      actions.querySelector('#next').addEventListener('click', onNext);
    }

    async function onNext() {
      if (session.next()) {
        showItem();
        window.scrollTo(0, 0);
      } else {
        await finishSession();
        window.scrollTo(0, 0);
      }
    }

    syncPredictActions();
  }

  /* ---------------- The mentor moment ---------------- */
  async function finishSession() {
    const results = session.finish();

    // Persist FIRST; nothing is shown until the data is safe.
    try {
      await saveWDResults(storage, results);
    } catch (err) {
      console.error('[CAT OS]', err);
      toast('Set finished but could not be saved.', 'error');
    }

    const { session: s } = results;

    // Engagement: derived from stored truth, before/after (same
    // discipline as the RC, PJ, PS and OOO session screens).
    let engagement = null;
    let priorWD = [];
    try {
      const all = await storage.getAll(STORES.SESSIONS);
      const prior = all.filter((x) => x.id !== s.id);
      priorWD = prior.filter((x) => x.module === 'wd');
      const before = deriveEngagement(prior);
      const after = deriveEngagement(all);
      const celebratedRec = await storage.get(STORES.SETTINGS, 'engagement:celebrated');
      const celebratedIds = Array.isArray(celebratedRec?.value) ? celebratedRec.value : [];
      const unlocks = newlyUnlocked(after, celebratedIds);
      const leveledUp = after.level.level > before.level.level;
      const streakRecord = after.streaks.best > before.streaks.best && after.streaks.best >= 3;
      const dailyGoalJustDone = !before.streaks.practicedToday && after.streaks.practicedToday;
      if (unlocks.length) {
        await storage.put(STORES.SETTINGS, {
          id: 'engagement:celebrated',
          value: [...celebratedIds, ...unlocks.map((u) => u.id)],
        });
      }
      engagement = { after, gained: sessionXP(s), unlocks, leveledUp, streakRecord, dailyGoalJustDone };
    } catch (err) {
      console.error('[CAT OS] engagement derive failed:', err);
    }

    // The mentor: Word DNA from PRIOR sessions, then this set's one lesson.
    let lesson = null;
    try {
      const priorItemIds = priorWD.flatMap((x) => x.item_ids ?? []);
      const priorItems = await loadWDItems(priorItemIds);
      const dna = deriveWDDNA(priorWD, priorItems);
      const thisItems = new Map(session.items.map((i) => [i.meta.id, i]));
      lesson = chooseWDLesson({ session: s, items: thisItems, dna, priorSessions: priorWD.length });
      await storage.put(STORES.LEARNING, wdLessonRecord(lesson, s, dayKey(new Date())));
    } catch (err) {
      console.error('[CAT OS] wd mentor derive failed:', err);
    }

    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <a href="#/wd">← Tree</a>
        </div>

        <article class="moment">
          <p class="screen__eyebrow">Your mentor · Word DNA</p>
          ${lesson ? `
            <h1 class="moment__opening">${escapeHTML(lesson.opening)}</h1>

            <div class="moment__lesson">
              <span class="moment__chip">${escapeHTML(lesson.title)}</span>
              <div class="moment__block">
                <div class="moment__label">The moment</div>
                <p>${escapeHTML(lesson.teach.moment)}</p>
              </div>
              <div class="moment__block">
                <div class="moment__label">${lesson.lesson_kind === 'watch' ? 'Why the brain goes there' : 'Worth keeping'}</div>
                <p>${escapeHTML(lesson.teach.pull)}</p>
              </div>
              ${lesson.teach.notice ? `
                <div class="moment__block">
                  <div class="moment__label">Carry this forward</div>
                  <p>${escapeHTML(lesson.teach.notice)}</p>
                </div>` : ''}
            </div>

            ${lesson.item_id ? `
              <p class="hint" style="margin-bottom: var(--space-4)">
                <a href="#/wd/learn/${escapeHTML(lesson.item_id)}">Meet that family again</a></p>` : ''}

            <p class="moment__closing">${escapeHTML(lesson.closing)}</p>
          ` : `
            <h1 class="moment__opening">Set complete.</h1>
          `}

          <p class="moment__numbers">${escapeHTML(WD_LINES.numbersAside(s.score.correct, s.score.total))}</p>

          <details class="reread moment__details">
            <summary>Set details</summary>
            <div class="reread__body">
              ${engagement ? '<div style="margin-bottom: var(--space-4)"><cat-xp-bar></cat-xp-bar></div>' : ''}
              ${s.answers.map((a, i) => {
                const glyph = a.is_correct === true ? '✓' : a.is_correct === false ? '·' : '–';
                const cls = a.is_correct === true ? 'verdict--correct' : '';
                return `<div class="row">
                  <span class="row__label">Family ${i + 1} <span class="${cls}">${glyph}</span></span>
                  <span class="row__hint">${formatDuration(a.time_ms)} ·
                    <a href="#/wd/learn/${escapeHTML(a.item_id)}">revisit</a></span>
                </div>`;
              }).join('')}
              <p class="hint" style="margin-top: var(--space-3)">Word DNA is not a CAT
              question type, so there is no official mark to show. A family counts as
              understood when the guess and every transfer test both land.</p>
            </div>
          </details>
        </article>

        <div class="session-actions">
          <a class="btn btn--primary btn--block" href="#/wd">Continue the journey</a>
        </div>
      </section>
    `;

    cue('mentor'); // the calm signature; rewards layer over it consonantly

    if (engagement) {
      const bar = outlet.querySelector('cat-xp-bar');
      if (bar) {
        bar.gained = engagement.gained;
        bar.data = engagement.after.level;
      }
      const lines = [];
      if (engagement.leveledUp) lines.push(`You reached Level ${engagement.after.level.level}.`);
      for (const u of engagement.unlocks) lines.push(`Achievement — ${u.title}: ${u.description}`);
      if (engagement.streakRecord) lines.push(`New best streak: ${engagement.after.streaks.best} days.`);
      if (lines.length) {
        const reward = engagement.leveledUp ? 'levelup'
          : engagement.unlocks.length ? 'achievement'
            : 'streak';
        const stacked = Number(engagement.leveledUp) + engagement.unlocks.length
          + Number(engagement.streakRecord) > 1;
        cue(reward, { delay: 0.2 });
        if (stacked) playSound('celebrate', { delay: 0.36 });
        await celebrate({
          title: engagement.leveledUp ? `Level ${engagement.after.level.level}` : 'Milestone',
          lines,
        });
      } else if (engagement.dailyGoalJustDone) {
        setTimeout(() => cue('dailyGoal'), 500);
      }
    }
  }

  showItem();
}
