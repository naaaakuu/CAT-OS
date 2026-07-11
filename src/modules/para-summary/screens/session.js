/**
 * session.js (screen) — the Para Summary core loop, end to end:
 * receive the mission → read the paragraph → SAY IT YOURSELF →
 * choose the summary → be taught → next → the mentor moment.
 *
 * Two pieces of deliberate product design, both from the Bible:
 *
 * · The Summary Builder: before the options, the learner can write the
 *   author's point in one sentence of their own. Generation before
 *   recognition is how the skill actually forms; afterwards the screen
 *   walks an honest comparison against the ideal summary on the item's
 *   own checks (core idea, scope, certainty, additions, stance).
 *
 * · The Think button: a floating coach available the whole time. It
 *   never hints and never narrows the options; it asks the questions
 *   an expert reader asks themselves (Bible §3), chosen for this
 *   item's mission.
 *
 * Phases per item:
 *  1. solving   — mission + challenge, the paragraph, the builder,
 *                 then the four options.
 *  2. revealed  — verdict + your sentence against the author's + the
 *                 full teaching layer (logic/teach.js).
 * The set ends with ONE lesson (core/mentor/ps-lesson), never a
 * scoreboard; the numbers stay one quiet tap away.
 */

import { loadPSItem, loadPSItems, listPSItems } from '../../../core/content-loader/loader.js';
import { PSSession } from '../../../core/engine/ps-session.js';
import { savePSResults, saveOwnSummary } from '../logic/store.js';
import { psJourneyOrder, tierInfo } from '../logic/tiers.js';
import { renderTeaching } from '../logic/teach.js';
import { thinkQuestions } from '../logic/think.js';
import { STORES } from '../../../core/storage/storage-adapter.js';
import { sessionXP } from '../../../core/engagement/xp.js';
import { deriveEngagement } from '../../../core/engagement/stats.js';
import { newlyUnlocked } from '../../../core/engagement/achievements.js';
import { cue } from '../../../core/engagement/feedback.js';
import { playSound } from '../../../core/engagement/audio.js';
import { dayKey } from '../../../core/engagement/streaks.js';
import { derivePSDNA } from '../../../core/mentor/ps-dna.js';
import { choosePSLesson, psLessonRecord } from '../../../core/mentor/ps-lesson.js';
import { PS_LINES, PS_MISSIONS } from '../../../core/mentor/ps-voice.js';
import { celebrate } from '../../../ui/components/cat-celebration.js';
import { toast } from '../../../ui/components/cat-toast.js';
import { escapeHTML, formatDuration } from '../../../core/utils/format.js';
import '../../../ui/components/cat-question-card.js';
import '../../../ui/components/cat-progress-bar.js';
import '../../../ui/components/cat-timer.js';
import '../../../ui/components/cat-xp-bar.js';

/** Resolve what to practice: one item id, or a tier's items in order. */
async function resolveSet(setParam) {
  if (/^ps-[0-9]{4}$/.test(setParam)) {
    return { setId: setParam, items: [await loadPSItem(setParam)] };
  }
  const registry = await listPSItems();
  const inTier = psJourneyOrder(registry.filter((i) => i.tier === setParam));
  if (inTier.length === 0) {
    throw new Error(`No paragraphs found for "${setParam}".`);
  }
  const loaded = await loadPSItems(inTier.map((i) => i.id));
  const items = inTier.map((i) => loaded.get(i.id)).filter(Boolean);
  if (items.length === 0) throw new Error('Those paragraphs could not be loaded.');
  return { setId: `ps-set:${setParam}`, items };
}

export async function renderPSSession(outlet, { storage }, params) {
  let resolved;
  try {
    resolved = await resolveSet(params.set);
  } catch (err) {
    outlet.innerHTML = `
      <section class="screen">
        <h1>Can't open this set</h1>
        <div class="card"><p>${escapeHTML(err.message)}</p>
        <p class="muted"><a href="#/ps">Back to the journey</a></p></div>
      </section>`;
    return;
  }

  const session = new PSSession(resolved.items, resolved.setId);
  const startedAt = Date.now();

  /* Per-item behavior the engine wants to know about. */
  let summaryText = null;   // the learner's own sentence, if written
  let thinkOpened = false;  // the Think coach was consulted

  function showItem() {
    const item = session.current;
    const m = item.meta;
    const q = item.question;
    const tier = tierInfo(m.tier);
    const mission = PS_MISSIONS[m.mission];
    summaryText = null;
    thinkOpened = false;

    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <a href="#/ps">← Journey</a>
          <span>Paragraph <b>${session.index + 1}</b> of ${session.total}</span>
          <cat-timer></cat-timer>
        </div>
        <cat-progress-bar max="${session.total}" value="${session.index}"></cat-progress-bar>

        <div class="card">
          <p class="screen__eyebrow">Find the author's point</p>
          <div class="briefing-chips">
            <span class="badge">${escapeHTML(tier.label)}</span>
            <span class="badge">${escapeHTML(m.genre)}</span>
            <span class="badge"><span class="dot dot--${escapeHTML(m.difficulty)}"></span>${escapeHTML(m.difficulty)}</span>
            <span class="badge">~${Math.max(1, Math.round(m.estimated_time_sec / 60))} min</span>
          </div>

          <div class="ps-mission">
            <p class="ps-mission__eyebrow">${escapeHTML(PS_LINES.missionEyebrow)}</p>
            <p class="ps-mission__title">${escapeHTML(mission.title)}</p>
            <p class="ps-mission__line">${escapeHTML(mission.line)}</p>
          </div>

          <p class="ps-challenge">${escapeHTML(item.mentor.challenge)}</p>

          <div class="ps-paragraph">
            ${item.paragraph.sentences.map((s) => escapeHTML(s.text)).join(' ')}
          </div>

          <div id="builder-slot"></div>
          <div id="choose-slot"></div>
          <div id="compare-slot"></div>
          <div id="teaching-slot"></div>
          <div class="session-actions" id="actions"></div>
        </div>

        <button class="ps-think" id="think-open" type="button"
                aria-label="Open the thinking coach">
          <span class="ps-think__glyph" aria-hidden="true">?</span>
          <span class="ps-think__label">Think</span>
        </button>
        <div id="think-slot"></div>
      </section>
    `;

    outlet.querySelector('cat-timer').startAt = startedAt;
    const builderSlot = outlet.querySelector('#builder-slot');
    const chooseSlot = outlet.querySelector('#choose-slot');
    const compareSlot = outlet.querySelector('#compare-slot');
    const teachingSlot = outlet.querySelector('#teaching-slot');
    const actions = outlet.querySelector('#actions');
    const thinkBtn = outlet.querySelector('#think-open');
    const thinkSlot = outlet.querySelector('#think-slot');
    session.markItemShown();

    /* ---------- The Think coach: questions, never hints ---------- */
    thinkBtn.addEventListener('click', () => {
      thinkOpened = true;
      cue('cardOpen');
      thinkSlot.innerHTML = `
        <div class="ps-think-sheet" role="dialog" aria-modal="true" aria-label="Thinking coach">
          <div class="ps-think-sheet__backdrop" data-think-close></div>
          <div class="ps-think-sheet__panel">
            <p class="ps-think-sheet__eyebrow">${escapeHTML(PS_LINES.thinkTitle)}</p>
            <p class="ps-think-sheet__lead">${escapeHTML(PS_LINES.thinkLead)}</p>
            <ul class="ps-think-sheet__list">
              ${thinkQuestions(item).map((qq) => `<li>${escapeHTML(qq)}</li>`).join('')}
            </ul>
            <button class="btn btn--block" data-think-close>Back to the paragraph</button>
          </div>
        </div>`;
      const close = () => {
        thinkSlot.innerHTML = '';
        document.removeEventListener('keydown', onKey);
      };
      const onKey = (e) => {
        if (e.key === 'Escape' || !thinkSlot.isConnected) close();
      };
      document.addEventListener('keydown', onKey);
      for (const el of thinkSlot.querySelectorAll('[data-think-close]')) {
        el.addEventListener('click', close);
      }
    });

    /* ---------- Phase 1a: say it yourself (the Summary Builder) ---------- */
    function showBuilder() {
      builderSlot.innerHTML = `
        <div class="ps-builder">
          <p class="psx__label">${escapeHTML(PS_LINES.builderPrompt)}</p>
          <p class="ps-builder__prompt">${escapeHTML(item.builder.prompt)}</p>
          <textarea class="ps-builder__input" id="own-summary" rows="3"
                    placeholder="${escapeHTML(PS_LINES.builderNudge)}"
                    aria-label="Your one sentence summary"></textarea>
          <div class="session-actions" style="margin-top: var(--space-3)">
            <button class="btn" id="builder-skip">Straight to the options</button>
            <button class="btn btn--primary" id="builder-lock" disabled>Hold my sentence</button>
          </div>
        </div>`;
      const input = builderSlot.querySelector('#own-summary');
      const lock = builderSlot.querySelector('#builder-lock');
      input.addEventListener('input', () => {
        lock.disabled = input.value.trim().length < 10;
      });
      lock.addEventListener('click', async () => {
        summaryText = input.value.trim();
        try { await saveOwnSummary(storage, m.id, summaryText); } catch { /* non-fatal */ }
        cue('reflect');
        showChoosing();
      });
      builderSlot.querySelector('#builder-skip').addEventListener('click', () => {
        summaryText = null;
        showChoosing();
      });
      actions.innerHTML = '';
    }

    /* ---------- Phase 1b: the four options ---------- */
    let selected = null;

    function showChoosing() {
      builderSlot.innerHTML = summaryText ? `
        <div class="ps-yours">
          <p class="ps-yours__eyebrow">Your sentence, held</p>
          <p class="ps-yours__text">${escapeHTML(summaryText)}</p>
        </div>` : '';
      chooseSlot.innerHTML = '<cat-question-card></cat-question-card>';
      const card = chooseSlot.querySelector('cat-question-card');
      card.question = { type: 'best_summary', stem: q.stem, options: q.options };
      card.addEventListener('cat-option-select', (e) => {
        selected = e.detail.letter;
        card.selected = selected;
        syncChoosing();
      });
      syncChoosing();
      chooseSlot.scrollIntoView({ block: 'nearest' });
    }

    function syncChoosing() {
      actions.innerHTML = `
        <button class="btn" id="skip">Set aside</button>
        <button class="btn btn--primary" id="lock" ${selected ? '' : 'disabled'}>Lock it in</button>
      `;
      actions.querySelector('#lock').addEventListener('click', onLock);
      actions.querySelector('#skip').addEventListener('click', onSkip);
    }

    /* ---------- Phase 2: revealed — taught, never just marked ---------- */
    function reveal(answer) {
      const card = chooseSlot.querySelector('cat-question-card');
      if (card) card.reveal = { chosen: answer?.chosen ?? null, correct: q.correct };
      thinkBtn.remove();
      thinkSlot.innerHTML = '';

      const verdict = answer === null || answer.chosen === null
        ? { cls: '', text: `Set aside. The author's point is option ${q.correct}.` }
        : answer.is_correct
          ? { cls: 'is-correct', text: `Option ${answer.chosen}. That is the author's point, preserved.` }
          : { cls: 'is-wrong', text: `You chose ${answer.chosen}. The author's point is option ${q.correct}.` };

      compareSlot.innerHTML = `
        <div class="psx-verdict ${verdict.cls}">${escapeHTML(verdict.text)}</div>
        ${summaryText ? renderCompare() : ''}
      `;
      if (summaryText) wireCompare();

      teachingSlot.innerHTML = renderTeaching(item, answer);
      actions.innerHTML = `
        <button class="btn btn--primary btn--block" id="next">
          ${session.isLast ? 'Finish the set' : 'Next paragraph'}
        </button>`;
      actions.querySelector('#next').addEventListener('click', onNext);
      compareSlot.scrollIntoView({ block: 'start' });
    }

    /* The learner's sentence against the author's: honest, guided
       self-comparison on the item's own checks. */
    function renderCompare() {
      return `
        <div class="ps-compare">
          <div class="psx__label">Your sentence, against the author's</div>
          <p class="ps-compare__yours">${escapeHTML(summaryText)}</p>
          <p class="ps-compare__ideal">${escapeHTML(item.ideal_summary)}</p>
          <p class="ps-compare__lead">${escapeHTML(PS_LINES.builderCompareLead)}</p>
          ${item.builder.checks.map((c, i) => `
            <div class="ps-check" data-check="${i}">
              <p class="ps-check__ask">${escapeHTML(c.ask)}</p>
              <div class="ps-check__actions">
                <button class="btn btn--quiet" data-check-kept="${i}">Mine held it</button>
                <button class="btn btn--quiet" data-check-drifted="${i}">Mine drifted</button>
              </div>
              <div class="ps-check__note" hidden></div>
            </div>`).join('')}
        </div>`;
    }

    function wireCompare() {
      const answerCheck = (i, kept) => {
        const check = item.builder.checks[i];
        const holder = compareSlot.querySelector(`[data-check="${i}"]`);
        if (!holder) return;
        holder.querySelector('.ps-check__actions').remove();
        const note = holder.querySelector('.ps-check__note');
        note.hidden = false;
        note.className = `ps-check__note ${kept ? 'is-kept' : 'is-drifted'}`;
        note.textContent = kept ? check.kept : check.drifted;
        cue('toggle');
      };
      compareSlot.addEventListener('click', (e) => {
        const kept = e.target.closest('[data-check-kept]');
        if (kept) { answerCheck(Number(kept.dataset.checkKept), true); return; }
        const drifted = e.target.closest('[data-check-drifted]');
        if (drifted) answerCheck(Number(drifted.dataset.checkDrifted), false);
      });
    }

    function onLock() {
      if (!selected) return;
      const verdict = session.answer(selected, {
        summary_written: !!summaryText,
        summary_text: summaryText,
        think_opened: thinkOpened,
      });
      cue(verdict.is_correct ? 'correct' : 'wrong');
      reveal(session.answerFor(m.id));
    }

    function onSkip() {
      session.skip({
        summary_written: !!summaryText,
        summary_text: summaryText,
        think_opened: thinkOpened,
      });
      reveal(null);
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

    showBuilder();
  }

  /* ---------------- The mentor moment ---------------- */
  async function finishSession() {
    const results = session.finish();

    // Persist FIRST; nothing is shown until the data is safe.
    try {
      await savePSResults(storage, results);
    } catch (err) {
      console.error('[CAT OS]', err);
      toast('Set finished but could not be saved.', 'error');
    }

    const { session: s } = results;

    // Engagement: derived from stored truth, before/after (same
    // discipline as the RC and PJ session screens).
    let engagement = null;
    let priorPS = [];
    try {
      const all = await storage.getAll(STORES.SESSIONS);
      const prior = all.filter((x) => x.id !== s.id);
      priorPS = prior.filter((x) => x.module === 'ps');
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

    // The mentor: PS DNA from PRIOR sessions, then this set's one lesson.
    let lesson = null;
    try {
      const priorItemIds = priorPS.flatMap((x) => x.item_ids ?? []);
      const priorItems = await loadPSItems(priorItemIds);
      const dna = derivePSDNA(priorPS, priorItems);
      const thisItems = new Map(session.items.map((i) => [i.meta.id, i]));
      lesson = choosePSLesson({ session: s, items: thisItems, dna, priorSessions: priorPS.length });
      await storage.put(STORES.LEARNING, psLessonRecord(lesson, s, dayKey(new Date())));
    } catch (err) {
      console.error('[CAT OS] ps mentor derive failed:', err);
    }

    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <a href="#/ps">← Journey</a>
        </div>

        <article class="moment">
          <p class="screen__eyebrow">Your mentor · Para Summary</p>
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
              <div class="moment__block">
                <div class="moment__label">How to notice it next time</div>
                <p>${escapeHTML(lesson.teach.notice)}</p>
              </div>
              ${lesson.teach.known ? `<p class="moment__known">${escapeHTML(lesson.teach.known)}</p>` : ''}
            </div>

            ${lesson.item_id ? `
              <p class="hint" style="margin-bottom: var(--space-4)">
                <a href="#/ps/learn/${escapeHTML(lesson.item_id)}">Walk through that paragraph again</a></p>` : ''}

            <p class="moment__closing">${escapeHTML(lesson.closing)}</p>
          ` : `
            <h1 class="moment__opening">Set complete.</h1>
          `}

          <p class="moment__numbers">${escapeHTML(PS_LINES.numbersAside(s.score.correct, s.score.total))}</p>

          <details class="reread moment__details">
            <summary>Set details</summary>
            <div class="reread__body">
              ${engagement ? '<div style="margin-bottom: var(--space-4)"><cat-xp-bar></cat-xp-bar></div>' : ''}
              ${s.answers.map((a, i) => {
                const glyph = a.is_correct === true ? '✓' : a.is_correct === false ? '·' : '–';
                const cls = a.is_correct === true ? 'verdict--correct' : '';
                return `<div class="row">
                  <span class="row__label">Paragraph ${i + 1} <span class="${cls}">${glyph}</span></span>
                  <span class="row__hint">${a.chosen ? `chose ${a.chosen}` : 'set aside'} · ${formatDuration(a.time_ms)} ·
                    <a href="#/ps/learn/${escapeHTML(a.item_id)}">revisit</a></span>
                </div>`;
              }).join('')}
              <p class="hint" style="margin-top: var(--space-3)">CAT-style marks for
              summary questions: +3 when the best summary is chosen, 0 otherwise.
              Recent papers set these without negative marking; the scheme is
              announced per cycle and can change.</p>
            </div>
          </details>
        </article>

        <div class="session-actions">
          <a class="btn btn--primary btn--block" href="#/ps">Continue the journey</a>
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
