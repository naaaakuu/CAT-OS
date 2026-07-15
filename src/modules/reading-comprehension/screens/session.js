/**
 * session.js (screen) — the core loop, end to end:
 * (twenty-second recall) → read deeply → answer → see why → next →
 * the MENTOR MOMENT — with everything persisted the moment it exists.
 *
 * Phases:
 *  1. reading   — one optional tiny recall from a previous lesson,
 *                 then the reading surface, undisturbed: a sticky
 *                 whisper of chrome, a scroll-driven progress hairline,
 *                 and one action: "Show questions".
 *  2. question  — one question at a time; select → Submit (or Skip);
 *                 verdict + full explanation appear in place; then Next.
 *  3. mentor    — the session ends with ONE lesson, not a scoreboard:
 *                 the mentor names the single most valuable thing this
 *                 session revealed (core/mentor). The numbers stay one
 *                 quiet tap away — honesty without judgment.
 *
 * This screen owns DOM and flow only; all rules live in core/.
 */

import { loadRCPassage, loadRCPassages } from '../../../core/content-loader/loader.js';
import { PracticeSession } from '../../../core/engine/session.js';
import { recordPassageSightings } from '../../../core/engine/garden-gate.js';
import { saveResults } from '../logic/store.js';
import { STORES } from '../../../core/storage/storage-adapter.js';
import { sessionXP } from '../../../core/engagement/xp.js';
import { deriveEngagement } from '../../../core/engagement/stats.js';
import { newlyUnlocked } from '../../../core/engagement/achievements.js';
import { cue } from '../../../core/engagement/feedback.js';
import { playSound } from '../../../core/engagement/audio.js';
import { dayKey } from '../../../core/engagement/streaks.js';
import { deriveDNA } from '../../../core/mentor/dna.js';
import { chooseLesson, lessonRecord, pickRecall } from '../../../core/mentor/lesson.js';
import { saveLesson, listLessons, markRecalled } from '../../../core/mentor/records.js';
import { LINES } from '../../../core/mentor/voice.js';
import { celebrate } from '../../../ui/components/cat-celebration.js';
import '../../../ui/components/cat-xp-bar.js';
import '../../../ui/components/cat-briefing.js';
import { toast } from '../../../ui/components/cat-toast.js';
import { escapeHTML, formatDuration } from '../../../core/utils/format.js';
import '../../../ui/components/cat-passage.js';
import '../../../ui/components/cat-question-card.js';
import '../../../ui/components/cat-explanation.js';
import '../../../ui/components/cat-progress-bar.js';
import '../../../ui/components/cat-timer.js';
import '../../../ui/components/cat-result-summary.js';

export async function renderSession(outlet, { storage }, params) {
  let passage;
  try {
    passage = await loadRCPassage(params.id);
  } catch (err) {
    outlet.innerHTML = `
      <section class="screen">
        <h1>Can't open this passage</h1>
        <div class="card"><p>${escapeHTML(err.message)}</p>
        <p class="muted"><a href="#/rc">Back to passages</a></p></div>
      </section>`;
    return;
  }

  const session = new PracticeSession(passage);
  const startedAt = Date.now(); // for the visible timer; the engine keeps authoritative time

  /* ---------------- Phase 1: reading ---------------- */
  outlet.innerHTML = `
    <section class="screen">
      <div class="session-bar">
        <a href="#/rc">← Journey</a>
        <span class="hint" id="min-left"></span>
        <cat-timer></cat-timer>
        <div class="read-progress" aria-hidden="true">
          <div class="read-progress__fill" id="read-fill"></div>
        </div>
      </div>
      <div id="recall-slot"></div>
      <cat-briefing></cat-briefing>
      <cat-passage></cat-passage>
      <div class="session-actions">
        <button class="btn btn--primary" id="to-questions">
          I've read it — show questions (${session.total})
        </button>
      </div>
    </section>
  `;
  outlet.querySelector('cat-briefing').item = passage;
  outlet.querySelector('cat-passage').passage = passage.passage;
  outlet.querySelector('cat-timer').startAt = startedAt;

  /* Twenty-second recall: one concept from a previous lesson, before
     today's reading. Optional, tiny, self-dismissing — revision that
     barely feels like revision. */
  (async () => {
    try {
      const lessons = await listLessons(storage);
      const recall = pickRecall(lessons, dayKey(new Date()));
      const slot = outlet.querySelector('#recall-slot');
      if (!recall || !slot?.isConnected) return;
      slot.innerHTML = `
        <div class="recall" id="recall-card">
          <p class="recall__eyebrow">${escapeHTML(LINES.recallEyebrow)}</p>
          <p class="recall__q">${escapeHTML(recall.recall.question)}</p>
          <div class="recall__body">
            <button class="btn btn--quiet" id="recall-reveal">Think, then reveal</button>
          </div>
        </div>`;
      slot.querySelector('#recall-reveal').addEventListener('click', () => {
        slot.querySelector('.recall__body').innerHTML = `
          <p class="recall__a">${escapeHTML(recall.recall.answer)}</p>
          <button class="btn btn--quiet" id="recall-done">Got it</button>`;
        slot.querySelector('#recall-done').addEventListener('click', async () => {
          try { await markRecalled(storage, recall); } catch { /* non-fatal */ }
          const card = slot.querySelector('#recall-card');
          card.classList.add('recall--done');
          setTimeout(() => slot.remove(), 450);
        });
      });
    } catch { /* the recall card is a bonus, never a blocker */ }
  })();

  /* Kindle-style companionship: how far through the text, and roughly
     how many minutes remain at the passage's own estimate. Passive,
     rAF-throttled, and self-removing once this screen is replaced. */
  {
    const fill = outlet.querySelector('#read-fill');
    const minLeft = outlet.querySelector('#min-left');
    const surface = outlet.querySelector('cat-passage');
    const totalMin = passage.passage.reading_time_min ?? passage.meta.estimated_time_min;
    let ticking = false;
    const update = () => {
      ticking = false;
      if (!fill.isConnected) { window.removeEventListener('scroll', onScroll); return; }
      const rect = surface.getBoundingClientRect();
      const viewH = window.innerHeight;
      const total = Math.max(1, rect.height - viewH * 0.6);
      const read = Math.min(Math.max(0, viewH * 0.4 - rect.top), total);
      const p = read / total;
      fill.style.transform = `scaleX(${p.toFixed(4)})`;
      const left = Math.ceil((1 - p) * totalMin);
      minLeft.textContent = p >= 0.99 ? 'The end' : `~${left} min left`;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  outlet.querySelector('#to-questions').addEventListener('click', () => {
    session.markQuestionShown();
    renderQuestionPhase();
    window.scrollTo(0, 0);
  });

  /* ---------------- Phase 2: questions ---------------- */
  function renderQuestionPhase() {
    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <span>Question <b id="q-pos"></b> of ${session.total}</span>
          <cat-timer></cat-timer>
        </div>
        <cat-progress-bar max="${session.total}"></cat-progress-bar>
        <details class="reread">
          <summary>Re-read the passage</summary>
          <div class="reread__body"><cat-passage></cat-passage></div>
        </details>
        <div class="card">
          <cat-question-card></cat-question-card>
          <div id="explanation-slot"></div>
          <div class="session-actions" id="actions"></div>
        </div>
      </section>
    `;
    outlet.querySelector('cat-passage').passage = passage.passage;
    outlet.querySelector('cat-timer').startAt = startedAt; // continues from session start

    // Evidence jump: an explanation's anchor opens the folded passage
    // and flashes the exact source paragraph (learning by re-anchoring).
    // Listener lives on the screen element, so it dies with the screen.
    const screenEl = outlet.querySelector('section.screen');
    const rereadFold = outlet.querySelector('.reread');
    screenEl.addEventListener('click', (e) => {
      const a = e.target.closest('[data-anchor]');
      if (!a) return;
      rereadFold.open = true;
      outlet.querySelector('cat-passage').highlight(a.dataset.anchor);
      cue('sparkle'); // the small reward of finding the evidence
    });

    const card = outlet.querySelector('cat-question-card');
    const bar = outlet.querySelector('cat-progress-bar');
    const pos = outlet.querySelector('#q-pos');
    const actions = outlet.querySelector('#actions');
    const explanationSlot = outlet.querySelector('#explanation-slot');

    let selected = null;

    card.addEventListener('cat-option-select', (e) => {
      selected = e.detail.letter;
      card.selected = selected;
      syncActions('answering');
    });

    function showQuestion() {
      selected = null;
      explanationSlot.innerHTML = '';
      card.question = session.current;
      pos.textContent = String(session.index + 1);
      bar.setAttribute('value', String(session.index));
      syncActions('answering');
    }

    function syncActions(mode) {
      if (mode === 'answering') {
        actions.innerHTML = `
          <button class="btn" id="skip">Set aside</button>
          <button class="btn btn--primary" id="submit" ${selected ? '' : 'disabled'}>Lock it in</button>
        `;
        actions.querySelector('#submit').addEventListener('click', onSubmit);
        actions.querySelector('#skip').addEventListener('click', onSkip);
      } else {
        actions.innerHTML = `
          <button class="btn btn--primary" id="next">
            ${session.isLast ? 'Finish session' : 'Next question'}
          </button>
        `;
        actions.querySelector('#next').addEventListener('click', onNext);
      }
    }

    function revealExplanation(chosen) {
      const ex = document.createElement('cat-explanation');
      ex.data = { question: session.current, chosen };
      explanationSlot.innerHTML = '';
      explanationSlot.appendChild(ex);
    }

    function onSubmit() {
      if (!selected) return;
      const verdict = session.answer(selected);
      cue(verdict.is_correct ? 'correct' : 'wrong');
      card.reveal = { chosen: selected, correct: verdict.correct };
      revealExplanation(selected);
      bar.setAttribute('value', String(session.index + 1)); // progress moves when you answer
      syncActions('revealed');
    }

    function onSkip() {
      session.skip();
      card.reveal = { chosen: null, correct: session.current.correct };
      revealExplanation(null);
      bar.setAttribute('value', String(session.index + 1));
      syncActions('revealed');
    }

    async function onNext() {
      if (session.next()) {
        showQuestion();
        window.scrollTo(0, 0);
      } else {
        await finishSession();
        window.scrollTo(0, 0);
      }
    }

    showQuestion();
  }

  /* ---------------- Phase 3: the mentor moment ---------------- */
  async function finishSession() {
    const results = session.finish();

    // Persist FIRST; nothing is shown until the data is safe.
    try {
      await saveResults(storage, results);
    } catch (err) {
      console.error('[CAT OS]', err);
      toast('Session finished but could not be saved.', 'error');
    }

    // The Gate, outward (LANGUAGE_GARDEN_BIBLE §19.2): if a word grown in
    // the Garden appeared in this passage and the reading was finished
    // without stalling — the session completed — the Journal quietly
    // records a sighting. Silent by design: no toast, no XP, no sound.
    // The learner discovers it later, sitting on the bench.
    recordPassageSightings(storage, passage).catch((err) => {
      console.error('[CAT OS] garden sightings failed:', err); // never blocks the mentor moment
    });

    const { session: s } = results;

    // Engagement: derive before/after from stored truth (never counters).
    let engagement = null;
    let prior = [];
    try {
      const all = await storage.getAll(STORES.SESSIONS);
      prior = all.filter((x) => x.id !== s.id);
      const before = deriveEngagement(prior);
      const after = deriveEngagement(all);
      const celebratedRec = await storage.get(STORES.SETTINGS, 'engagement:celebrated');
      const celebratedIds = Array.isArray(celebratedRec?.value) ? celebratedRec.value : [];
      const unlocks = newlyUnlocked(after, celebratedIds);
      const leveledUp = after.level.level > before.level.level;
      const streakRecord = after.streaks.best > before.streaks.best && after.streaks.best >= 3;
      // The daily goal is "one session today"; it is newly met the moment
      // today flips from not-practiced to practiced.
      const dailyGoalJustDone = !before.streaks.practicedToday && after.streaks.practicedToday;
      if (unlocks.length) {
        await storage.put(STORES.SETTINGS, {
          id: 'engagement:celebrated',
          value: [...celebratedIds, ...unlocks.map((u) => u.id)],
        });
      }
      engagement = { after, gained: sessionXP(s), unlocks, leveledUp, streakRecord, dailyGoalJustDone };
    } catch (err) {
      console.error('[CAT OS] engagement derive failed:', err); // the moment still renders
    }

    // The mentor: DNA from PRIOR sessions, then this session's one lesson.
    let lesson = null;
    try {
      const priorPassages = await loadRCPassages(prior.map((x) => x.passage_id));
      const dna = deriveDNA(prior, priorPassages);
      lesson = chooseLesson({ session: s, passage, dna, priorSessions: prior.length });
      await saveLesson(storage, lessonRecord(lesson, s, dayKey(new Date())));
    } catch (err) {
      console.error('[CAT OS] mentor derive failed:', err); // details fold still shows all
    }

    const lessonQuestion = lesson?.question_id
      ? passage.questions.find((q) => q.id === lesson.question_id) : null;
    const lessonAnswer = lessonQuestion
      ? s.answers.find((a) => a.question_id === lessonQuestion.id) : null;
    const showQuestionFold = lesson?.lesson_kind === 'watch' && lessonQuestion;

    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <a href="#/rc">← Journey</a>
          <a href="#/rc/mentor/${passage.meta.id}">Learning Page</a>
        </div>

        <article class="moment">
          <p class="screen__eyebrow">Your mentor · ${escapeHTML(passage.passage.title)}</p>
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

            ${showQuestionFold ? `
              <details class="reread moment__evidence">
                <summary>See that question again</summary>
                <div class="reread__body" id="lesson-question"></div>
              </details>` : ''}

            <p class="moment__closing">${escapeHTML(lesson.closing)}</p>
          ` : `
            <h1 class="moment__opening">Session complete.</h1>
          `}

          <p class="moment__numbers">${escapeHTML(LINES.numbersAside(s.score.correct, s.score.total))}</p>

          <details class="reread moment__details">
            <summary>Session details</summary>
            <div class="reread__body">
              <cat-result-summary></cat-result-summary>
              ${engagement ? '<div style="margin-top: var(--space-4)"><cat-xp-bar></cat-xp-bar></div>' : ''}
              <div style="margin-top: var(--space-4)">
                ${s.answers.map((a, i) => {
                  const verdictGlyph = a.is_correct === true ? '✓' : a.is_correct === false ? '✕' : '–';
                  const cls = a.is_correct === true ? 'verdict--correct'
                    : a.is_correct === false ? 'verdict--wrong' : '';
                  return `<div class="row">
                    <span class="row__label">Q${i + 1} <span class="${cls}">${verdictGlyph}</span></span>
                    <span class="row__hint">${a.chosen ? `chose ${a.chosen}` : 'set aside'} · ${formatDuration(a.time_ms)}</span>
                  </div>`;
                }).join('')}
              </div>
              <p class="hint" style="margin-top: var(--space-3)">
                <a href="#/rc/review/${passage.meta.id}">Open the full review</a>
              </p>
            </div>
          </details>
        </article>

        <div class="session-actions">
          <a class="btn" href="#/rc">Continue the journey</a>
          <a class="btn btn--primary" href="#/rc/mentor/${passage.meta.id}">Understand this passage</a>
        </div>
      </section>
    `;

    const summary = outlet.querySelector('cat-result-summary');
    summary.score = s.score;
    summary.durationMs = s.duration_ms;

    if (showQuestionFold) {
      const holder = outlet.querySelector('#lesson-question');
      const qc = document.createElement('cat-question-card');
      holder.appendChild(qc);
      const ex = document.createElement('cat-explanation');
      holder.appendChild(ex);
      qc.question = lessonQuestion;
      qc.reveal = { chosen: lessonAnswer?.chosen ?? null, correct: lessonQuestion.correct };
      ex.data = { question: lessonQuestion, chosen: lessonAnswer?.chosen ?? null };
    }

    // The reading mentor appears: its calm signature as the moment settles.
    // (Every session ends here, milestone or not.) The signature is soft and
    // low; any reward below layers over it consonantly by design.
    cue('mentor');

    if (engagement) {
      const bar = outlet.querySelector('cat-xp-bar');
      if (bar) {
        bar.gained = engagement.gained;
        bar.data = engagement.after.level;
      }
      // Celebrate sparingly: only real milestones, one sheet, combined.
      const lines = [];
      if (engagement.leveledUp) lines.push(`You reached Level ${engagement.after.level.level}.`);
      for (const u of engagement.unlocks) lines.push(`Achievement — ${u.title}: ${u.description}`);
      if (engagement.streakRecord) lines.push(`New best streak: ${engagement.after.streaks.best} days.`);
      if (lines.length) {
        // One reward sound, chosen by the biggest milestone, landing a beat
        // after the mentor signature and synced to the rising sheet. Stacked
        // milestones add a sparkle shower ("confetti") beneath it.
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
        // No sheet: the day's-goal melody is a warm, audio-only closer — the
        // sound users come to associate with finishing for the day.
        setTimeout(() => cue('dailyGoal'), 500);
      }
    }
  }
}
