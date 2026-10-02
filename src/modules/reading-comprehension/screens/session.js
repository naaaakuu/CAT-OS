/**
 * session.js (screen) — the Reading Room's run: a CAT-style passage
 * against the clock, end to end.
 *
 *   BRIEFING  the passage's shape (stage, genre, questions, its own target
 *             time) and what three stars ask for.
 *   READING   the passage on a book-width surface, a pace ring counting
 *             down the target time (amber past it, never red, never a
 *             flash), a scroll hairline and "minutes left".
 *   ANSWERING one question at a time, the clock still running; lock it
 *             in or set it aside; the explanation appears in place with
 *             a one-tap jump to the evidence paragraph.
 *   RESULT    the star reveal — accuracy first, then pace — Chai's
 *             stories counted up, and the mentor's one lesson kept
 *             beneath, with the Learning Page one tap away.
 *
 * Everything the old session persisted is still persisted (the session
 * and its attempts, the mentor lesson, the Rootwood sightings); the
 * engine (core/engine/session.js) is unchanged.
 */

import { loadRCPassage, loadRCPassages } from '../../../core/content-loader/loader.js';
import { displayTitle } from '../logic/spoilers.js';
import { PracticeSession } from '../../../core/engine/session.js';
import { recordPassageSightings } from '../../../core/engine/garden-gate.js';
import { saveResults } from '../logic/store.js';
import { saveDraft, loadDraft, clearDraft } from '../../../core/learning/draft.js';
import { passageId } from '../../../core/engine/session.js';
import { STORES } from '../../../core/storage/storage-adapter.js';
import { cue } from '../../../core/engagement/feedback.js';
import { dayKey } from '../../../core/engagement/streaks.js';
import { deriveDNA } from '../../../core/mentor/dna.js';
import { trapHabit, hitHabit } from '../../../core/learning/noticing.js';
import { chooseLesson, lessonRecord, pickRecall } from '../../../core/mentor/lesson.js';
import { saveLesson, listLessons, markRecalled } from '../../../core/mentor/records.js';
import { LINES } from '../../../core/mentor/voice.js';
import { STAGE_INFO } from '../../../core/learning/journey.js';
import { toast } from '../../../ui/components/cat-toast.js';
import { escapeHTML, formatDuration } from '../../../core/utils/format.js';
import { rcStars } from '../../../world/economy.js';
import { renderResult, formatClock } from '../../../world/screens/result.js';
import { loadWorld, loadWorldRecords, deriveWorldState, petChangeLine } from '../../../world/state.js';
import { hostChip } from '../../../pets/sprite.js';
import { newlyFinished } from '../../../world/collections.js';
import { play, silenceWorld } from '../../../world/audio.js';
import '../../../ui/components/cat-passage.js';
import '../../../ui/components/cat-question-card.js';
import '../../../ui/components/cat-explanation.js';

export async function renderSession(outlet, { storage }, params) {
  let passage;
  try {
    passage = await loadRCPassage(params.id);
  } catch (err) {
    outlet.innerHTML = `
      <section class="screen">
        <h1>Can't open this passage</h1>
        <div class="card"><p>${escapeHTML(err.message)}</p>
        <p class="muted"><a href="#/world/place/reading-room">Back to the Reading House</a></p></div>
      </section>`;
    return;
  }
  document.documentElement.setAttribute('data-world', '');
  silenceWorld();

  let before = null;
  try { before = await loadWorld(storage); } catch { /* facts still show */ }

  /* Night Reading, the Observatory's payload. The gate used to look for a
     LEARNING record of kind 'world-build' with upgrade_id 'observatory' —
     a shape 2.1 stopped writing when builds became
     {kind:'village-build', building, level}. So the test was always false
     and the deepest purchase in the Reading House (1500 coins, 14 Books,
     4 Cloth, 4 Ink, 16 passages read well) bought a toggle that did
     nothing. The derived state already knows: world/state.js sets
     reading.observatory from the building's level, which is what the
     Reading House's own screen reads to offer the toggle at all. */
  let night = false;
  try {
    if (before?.state?.reading?.observatory) {
      const rec = await storage.get(STORES.SETTINGS, 'world:night-reading');
      night = rec?.value === true;
    }
  } catch { /* day */ }
  const paceFactor = night ? 0.8 : 1;
  const targetMs = Math.max(60_000, (passage.meta.estimated_time_min ?? 6) * 60_000 * paceFactor);
  const m = passage.meta;
  const stage = STAGE_INFO[m.stage]?.label ?? m.stage ?? '';

  /* ---------------- BRIEFING ---------------- */
  outlet.innerHTML = `
    <section class="run">
      <div class="run__bar">
        <a class="run__leave" href="#/world/place/reading-room" aria-label="Leave">×</a>
        <div class="run__where"><div class="run__place">${hostChip('chai', 20)}<span>The Reading House${night ? ' · Night Reading' : ''}</span></div><div class="run__what">${escapeHTML(displayTitle(passage))}</div></div>
      </div>
      <div class="run__body">
        <div class="brief">
          <p class="brief__eyebrow">${escapeHTML(stage)} · ${escapeHTML(m.genre ?? '')}</p>
          <h1 class="brief__title">${escapeHTML(displayTitle(passage))}</h1>
          <p class="brief__line">What it argues is for you to find. Read it the way the exam reads it: once, closely, then answer from the text.</p>
          <div class="brief__facts">
            <span class="brief__fact">${m.word_count ?? ''} words</span>
            <span class="brief__fact">${passage.questions.length} questions</span>
            <span class="brief__fact">${formatClock(targetMs)} target</span>
            <span class="brief__fact">${escapeHTML(m.difficulty ?? '')}</span>
          </div>
          <div class="brief__stars">
            <span><b>★★★</b> three quarters right, inside the target</span>
            <span><b>★★</b> three quarters right, over time</span>
            <span><b>★</b> half right</span>
          </div>
          <div id="recall-slot"></div>
          <button class="g-cta" id="begin">Begin reading<small>The clock starts on the first line</small><span class="arrow" aria-hidden="true">→</span></button>
        </div>
      </div>
    </section>`;

  // The twenty-second recall: one concept from a previous lesson, before the
  // reading — optional, tiny, self-dismissing.
  (async () => {
    try {
      const lessons = await listLessons(storage);
      const recall = pickRecall(lessons, dayKey(new Date()));
      const slot = outlet.querySelector('#recall-slot');
      if (!recall || !slot?.isConnected) return;
      slot.innerHTML = `
        <div class="recall" id="recall-card" style="margin-bottom:14px">
          <p class="recall__eyebrow">${escapeHTML(LINES.recallEyebrow)}</p>
          <p class="recall__q">${escapeHTML(recall.recall.question)}</p>
          <div class="recall__body"><button class="btn btn--quiet" id="recall-reveal">Think, then reveal</button></div>
        </div>`;
      slot.querySelector('#recall-reveal').addEventListener('click', () => {
        slot.querySelector('.recall__body').innerHTML = `<p class="recall__a">${escapeHTML(recall.recall.answer)}</p><button class="btn btn--quiet" id="recall-done">Got it</button>`;
        slot.querySelector('#recall-done').addEventListener('click', async () => {
          try { await markRecalled(storage, recall); } catch { /* non-fatal */ }
          slot.querySelector('#recall-card').classList.add('recall--done');
          setTimeout(() => slot.remove(), 450);
        });
      });
    } catch { /* the recall card is a bonus */ }
  })();

  outlet.querySelector('#begin').addEventListener('click', () => { play('page'); startRun(); });

  /* CARRYING ON. If a run was interrupted, the passage's own first screen
     says so and offers both roads — the draft is the learner's, not ours,
     so starting fresh has to be one tap and has to be their choice. */
  (async () => {
    const draft = await loadDraft(storage, 'rc', passageId(passage));
    const begin = outlet.querySelector('#begin');
    if (!draft?.answers?.length || !begin?.isConnected) return;
    const n = draft.answers.length;
    const at = Math.min((Number(draft.index) || 0) + 1, passage.questions.length);
    begin.innerHTML = `Carry on<small>You answered ${n} of ${passage.questions.length}; back at question ${at}</small><span class="arrow" aria-hidden="true">→</span>`;
    const fresh = document.createElement('button');
    fresh.className = 'btn btn--quiet';
    fresh.style.marginTop = '10px';
    fresh.textContent = 'Start this passage again';
    begin.after(fresh);
    fresh.addEventListener('click', async () => {
      await clearDraft(storage, 'rc', passageId(passage));
      play('page');
      startRun();
    });
    begin.replaceWith(begin.cloneNode(true));
    outlet.querySelector('#begin').addEventListener('click', () => { play('page'); startRun(draft); });
  })();

  /* ---------------- READING ---------------- */
  function startRun(draft = null) {
    const session = new PracticeSession(passage);
    const resumed = draft ? session.restore(draft) : false;
    const startedAt = session.startedAt; // after a restore: time on task, not wall-clock
    let alive = true;
    let overWarned = false;

    const barHTML = (what) => `
      <div class="run__bar">
        <a class="run__leave" href="#/world/place/reading-room" aria-label="Leave the passage">×</a>
        <div class="run__where"><div class="run__place">${hostChip('chai', 20)}<span>The Reading House</span></div><div class="run__count" id="what">${what}</div></div>
        <div class="run__pace"><span class="run__clock" id="clock">${formatClock(targetMs)}</span><div class="run__ring" id="ring" aria-hidden="true"></div></div>
      </div>`;
    const tickClock = () => {
      if (!alive) return;
      const clock = outlet.querySelector('#clock'), ring = outlet.querySelector('#ring');
      if (!clock || !ring) return;
      const el = Date.now() - startedAt;
      const left = targetMs - el;
      clock.textContent = left >= 0 ? formatClock(left) : `+${formatClock(-left)}`;
      clock.classList.toggle('is-over', left < 0);
      ring.classList.toggle('is-over', left < 0);
      ring.style.setProperty('--p', `${Math.round(Math.max(0, left) / targetMs * 100)}%`);
      if (left < 0 && !overWarned) { overWarned = true; play('hurry'); }
      requestAnimationFrame(tickClock);
    };
    const stop = () => { alive = false; window.removeEventListener('hashchange', stop); };
    window.addEventListener('hashchange', stop);

    outlet.innerHTML = `
      <section class="run">
        ${barHTML('Reading')}
        <div class="run__track"><i id="read-fill" style="width:0%"></i></div>
        <div class="run__body">
          <p class="hint" id="min-left" style="margin:0 0 10px;text-align:right"></p>
          <cat-passage></cat-passage>
          <div class="run__actions">
            <button class="g-btn g-btn--primary" id="to-questions">I've read it…${session.total} questions</button>
          </div>
        </div>
      </section>`;
    outlet.querySelector('cat-passage').passage = passage.passage;
    requestAnimationFrame(tickClock);

    // Scroll companionship: how far through, roughly how many minutes remain.
    {
      const fill = outlet.querySelector('#read-fill');
      const minLeft = outlet.querySelector('#min-left');
      const surface = outlet.querySelector('cat-passage');
      const totalMin = passage.passage.reading_time_min ?? m.estimated_time_min;
      let ticking = false;
      const update = () => {
        ticking = false;
        if (!fill.isConnected) { window.removeEventListener('scroll', onScroll); return; }
        const rect = surface.getBoundingClientRect();
        const viewH = window.innerHeight;
        const total = Math.max(1, rect.height - viewH * 0.6);
        const read = Math.min(Math.max(0, viewH * 0.4 - rect.top), total);
        const p = read / total;
        fill.style.width = `${Math.round(p * 100)}%`;
        const left = Math.ceil((1 - p) * totalMin);
        minLeft.textContent = p >= 0.99 ? 'The end' : `~${left} min left`;
      };
      const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(update); };
      window.addEventListener('scroll', onScroll, { passive: true });
      update();
    }

    if (resumed) { session.markQuestionShown(); renderQuestions(); window.scrollTo(0, 0); return; }

    outlet.querySelector('#to-questions').addEventListener('click', () => {
      session.markQuestionShown();
      play('page');
      renderQuestions();
      window.scrollTo(0, 0);
    });

    /* ---------------- ANSWERING ---------------- */
    function renderQuestions() {
      outlet.innerHTML = `
        <section class="run">
          ${barHTML(`Question <b id="q-pos">1</b> of ${session.total}`)}
          <div class="run__track"><i id="q-fill" style="width:0%"></i></div>
          <div class="run__body">
            <details class="reread">
              <summary>Re-read the passage</summary>
              <div class="reread__body"><cat-passage></cat-passage></div>
            </details>
            <p class="sr-only" id="run-said" role="status" aria-live="polite"></p>
            <div class="card" style="margin-top:12px">
              <cat-question-card></cat-question-card>
              <div id="explanation-slot" tabindex="-1"></div>
              <div class="run__actions" id="actions"></div>
            </div>
          </div>
        </section>`;
      outlet.querySelector('cat-passage').passage = passage.passage;
      requestAnimationFrame(tickClock);

      const screenEl = outlet.querySelector('section.run');
      const rereadFold = outlet.querySelector('.reread');
      screenEl.addEventListener('click', (e) => {
        const a = e.target.closest('[data-anchor]');
        if (!a) return;
        rereadFold.open = true;
        outlet.querySelector('cat-passage').highlight(a.dataset.anchor);
        cue('sparkle');
      });

      const card = outlet.querySelector('cat-question-card');
      const fill = outlet.querySelector('#q-fill');
      const pos = outlet.querySelector('#q-pos');
      const actions = outlet.querySelector('#actions');
      const explanationSlot = outlet.querySelector('#explanation-slot');
      const said = outlet.querySelector('#run-said');
      const say = (line) => { if (said) said.textContent = line; };
      let selected = null;

      card.addEventListener('cat-option-select', (e) => { selected = e.detail.letter; card.selected = selected; play('tap'); syncActions('answering'); });

      function showQuestion() {
        selected = null;
        explanationSlot.innerHTML = '';
        card.question = session.current;
        pos.textContent = String(session.index + 1);
        fill.style.width = `${Math.round((session.index / session.total) * 100)}%`;
        syncActions('answering');
      }
      function syncActions(mode) {
        if (mode === 'answering') {
          actions.innerHTML = `<button class="g-btn" id="skip">Set aside</button><button class="g-btn g-btn--primary" id="submit" ${selected ? '' : 'disabled'}>Lock it in</button>`;
          actions.querySelector('#submit').addEventListener('click', onSubmit);
          actions.querySelector('#skip').addEventListener('click', onSkip);
        } else {
          actions.innerHTML = `<button class="g-btn g-btn--primary" id="next">${session.isLast ? 'See the result' : 'Next question'}</button>`;
          actions.querySelector('#next').addEventListener('click', onNext);
        }
      }
      function revealExplanation(chosen, verdict) {
        const ex = document.createElement('cat-explanation');
        ex.data = { question: session.current, chosen };
        explanationSlot.innerHTML = '';
        explanationSlot.appendChild(ex);
        /* Locking an answer in changed four things on screen and said none
           of them: the option recoloured, the explanation appeared below the
           fold, the bar moved, and the button became "Next question" — all
           silently, with focus left on a button that no longer existed, so
           the next Tab started again from the top of the passage. */
        say(verdict === null ? 'Set aside. Here is the answer.' : verdict ? 'Correct.' : 'Not this time. Here is why.');
        // The verdict is under four options — off the bottom of a phone.
        // Nothing appearing where nobody is looking has ever taught anyone.
        requestAnimationFrame(() => {
          ex.querySelector('.verdict')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          try { explanationSlot.focus({ preventScroll: true }); } catch { /* fine */ }
        });
      }
      function onSubmit() {
        if (!selected) return;
        const verdict = session.answer(selected);
        play(verdict.is_correct ? 'correct' : 'wrong');
        cue(verdict.is_correct ? 'correct' : 'wrong');
        card.reveal = { chosen: selected, correct: verdict.correct };
        revealExplanation(selected, verdict.is_correct);
        saveDraft(storage, 'rc', passageId(passage), session.snapshot());
        fill.style.width = `${Math.round(((session.index + 1) / session.total) * 100)}%`;
        syncActions('revealed');
      }
      function onSkip() {
        session.skip();
        card.reveal = { chosen: null, correct: session.current.correct };
        revealExplanation(null, null);
        saveDraft(storage, 'rc', passageId(passage), session.snapshot());
        fill.style.width = `${Math.round(((session.index + 1) / session.total) * 100)}%`;
        syncActions('revealed');
      }
      async function onNext() {
        // Written again on the way forward, not only on the way in: the draft
        // is taken at answer time, so without this a learner who came back
        // was handed the question they had just finished.
        if (session.next()) { saveDraft(storage, 'rc', passageId(passage), session.snapshot()); showQuestion(); window.scrollTo(0, 0); }
        else { stop(); await finishSession(); window.scrollTo(0, 0); }
      }
      showQuestion();
    }

    /* ---------------- RESULT ---------------- */
    async function finishSession() {
      const results = session.finish();
      if (night) results.session.night_reading = true;
      // The draft goes only once the record is safe: if the save fails the
      // learner comes back to the last question and can finish again.
      try { await saveResults(storage, results); await clearDraft(storage, 'rc', passageId(passage)); }
      catch (err) { console.error('[CAT OS]', err); toast('Session finished but could not be saved.', 'error'); }
      recordPassageSightings(storage, passage).catch((err) => console.error('[CAT OS] garden sightings failed:', err));

      const { session: s } = results;
      const res = rcStars(s, m.estimated_time_min, paceFactor);

      // The mentor: DNA from PRIOR sessions, then this session's one lesson.
      let lesson = null, prior = [];
      try {
        const all = await storage.getAll(STORES.SESSIONS);
        prior = all.filter((x) => x.id !== s.id && !x.module);
        const priorPassages = await loadRCPassages(prior.map((x) => x.passage_id));
        const dna = deriveDNA(prior, priorPassages);
        lesson = chooseLesson({ session: s, passage, dna, priorSessions: prior.length });
        await saveLesson(storage, lessonRecord(lesson, s, dayKey(new Date())));
      } catch (err) { console.error('[CAT OS] mentor derive failed:', err); }

      let change = null, setsDone = [];
      try { if (before) { const records = await loadWorldRecords(storage); const after = deriveWorldState(before.content, records); change = petChangeLine(before.state, after); setsDone = newlyFinished(before.state, after, before.content); } } catch { /* fine */ }

      const mentorHTML = lesson ? `
        <div class="result__mentor">
          <p class="label">Your mentor · ${escapeHTML(lesson.title)}</p>
          <p class="opening">${escapeHTML(lesson.opening)}</p>
          <p>${escapeHTML(lesson.teach.moment)}</p>
          <details><summary>${lesson.lesson_kind === 'watch' ? 'Why the brain goes there' : 'Worth keeping'}</summary><p style="margin-top:8px">${escapeHTML(lesson.teach.pull)}</p><p>${escapeHTML(lesson.teach.notice)}</p>${lesson.teach.known ? `<p><i>${escapeHTML(lesson.teach.known)}</i></p>` : ''}</details>
          <p style="margin-top:8px"><i>${escapeHTML(lesson.closing)}</i></p>
        </div>` : '';
      /* WHAT THE LEDGER HAS NOTICED.
         The trap ledger has counted every option this learner has fallen for
         since the first passage, grouped into the seven families the taxonomy
         names — and until now it reached nobody. It speaks here, and only
         here, and only when two things are true at once: a family has caught
         them four or more times, AND it caught them again in the run they
         have just finished. A general observation after a clean run is noise;
         this is the moment it means something. One sentence, never a list. */
      let habitHTML = '';
      try {
        const habit = trapHabit([...prior, s]);
        if (habit && hitHabit(s.answers, habit)) {
          habitHTML = `<div class="result__habit"><p class="label">A pattern</p><p>${escapeHTML(habit.sentence)} That was one of them.</p></div>`;
        }
      } catch (err) { console.error('[CAT OS] noticing failed', err); }

      const reviewHTML = `<div class="result__review">${s.answers.map((a, i) => `<div class="r ${a.is_correct === true ? 'ok' : a.is_correct === false ? 'no' : ''}"><span>Q${i + 1} · ${a.chosen ? `chose ${a.chosen}` : 'set aside'}</span><span>${formatDuration(a.time_ms)}</span></div>`).join('')}</div>`;

      cue('mentor');
      renderResult(outlet, {
        region: 'reading-room',
        eyebrow: `The Reading House · ${passage.passage.title}`,
        title: res.flawless ? 'Flawless' : res.stars === 3 ? 'CAT pace' : 'Passage complete',
        result: res,
        facts: [
          { label: 'Right', value: `${s.score.correct}/${s.score.total}`, good: res.accuracy >= 0.75 },
          // Fast and wrong is not a good result (see round.js).
          { label: 'Time', value: formatClock(s.duration_ms), good: res.inTime && res.accuracy >= 0.5 },
          { label: 'Target', value: formatClock(targetMs) },
        ],
        pet: 'chai',
        ...(change?.pet === 'chai' ? { change } : {}),
        setsDone,
        extraHTML: mentorHTML + habitHTML + reviewHTML,
        actions: [
          { label: 'Back to the village', href: '#/world', primary: true },
          { label: 'Understand this passage', href: `#/rc/mentor/${passage.meta.id}` },
          { label: 'Back to the Reading House', href: '#/world/place/reading-room', quiet: true },
        ],
      });
    }
  }
}
