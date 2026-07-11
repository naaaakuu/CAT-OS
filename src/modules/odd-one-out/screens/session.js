/**
 * session.js (screen) — the Odd One Out core loop, end to end:
 * receive the mission → read the five → BUILD THE PARAGRAPH (or, at
 * exam tiers, name the exclusion) → read it back → lock in → be
 * taught → next → the mentor moment.
 *
 * Two pieces of deliberate product design, both from the Bible:
 *
 * · The Paragraph Builder: at the first three tiers the learner does
 *   not hunt the odd sentence at all. They arrange the four connected
 *   sentences on the board, and the sentence left out BECOMES their
 *   answer — construction before elimination (Bible §7 remediation,
 *   Recommendation 5), until the protocol is a reflex. From Advanced
 *   up the surface is the exam's: tap the sentence that does not
 *   belong. The read back before locking stays, at every tier.
 *
 * · The Think button: a floating coach available the whole time. It
 *   never hints and never narrows the sentences; it asks the coaching
 *   questions strong structural readers ask themselves, chosen for
 *   this item's mission.
 *
 * Phases per item:
 *  1. solving   — mission + challenge, the five sentences, the build
 *                 (or the exclusion pick), then the read back.
 *  2. revealed  — verdict + the full teaching layer (logic/teach.js):
 *                 the four join, the odd one separates, the violation
 *                 and the trap are named.
 * The set ends with ONE lesson (core/mentor/ooo-lesson), never a
 * scoreboard; the numbers stay one quiet tap away.
 */

import { loadOOOItem, loadOOOItems, listOOOItems } from '../../../core/content-loader/loader.js';
import { OOOSession } from '../../../core/engine/ooo-session.js';
import { saveOOOResults } from '../logic/store.js';
import { oooJourneyOrder, tierInfo, tierMode } from '../logic/tiers.js';
import { renderTeaching } from '../logic/teach.js';
import { thinkQuestions } from '../logic/think.js';
import { STORES } from '../../../core/storage/storage-adapter.js';
import { sessionXP } from '../../../core/engagement/xp.js';
import { deriveEngagement } from '../../../core/engagement/stats.js';
import { newlyUnlocked } from '../../../core/engagement/achievements.js';
import { cue } from '../../../core/engagement/feedback.js';
import { playSound } from '../../../core/engagement/audio.js';
import { dayKey } from '../../../core/engagement/streaks.js';
import { deriveOOODNA } from '../../../core/mentor/ooo-dna.js';
import { chooseOOOLesson, oooLessonRecord } from '../../../core/mentor/ooo-lesson.js';
import { OOO_LINES, OOO_MISSIONS } from '../../../core/mentor/ooo-voice.js';
import { celebrate } from '../../../ui/components/cat-celebration.js';
import { toast } from '../../../ui/components/cat-toast.js';
import { escapeHTML, formatDuration } from '../../../core/utils/format.js';
import '../../../ui/components/cat-jumble-board.js';
import '../../../ui/components/cat-progress-bar.js';
import '../../../ui/components/cat-timer.js';
import '../../../ui/components/cat-xp-bar.js';

/** Resolve what to practice: one item id, or a tier's items in order. */
async function resolveSet(setParam) {
  if (/^ooo-[0-9]{4}$/.test(setParam)) {
    return { setId: setParam, items: [await loadOOOItem(setParam)] };
  }
  const registry = await listOOOItems();
  const inTier = oooJourneyOrder(registry.filter((i) => i.tier === setParam));
  if (inTier.length === 0) {
    throw new Error(`No items found for "${setParam}".`);
  }
  const loaded = await loadOOOItems(inTier.map((i) => i.id));
  const items = inTier.map((i) => loaded.get(i.id)).filter(Boolean);
  if (items.length === 0) throw new Error('Those items could not be loaded.');
  return { setId: `ooo-set:${setParam}`, items };
}

export async function renderOOOSession(outlet, { storage }, params) {
  let resolved;
  try {
    resolved = await resolveSet(params.set);
  } catch (err) {
    outlet.innerHTML = `
      <section class="screen">
        <h1>Can't open this set</h1>
        <div class="card"><p>${escapeHTML(err.message)}</p>
        <p class="muted"><a href="#/ooo">Back to the journey</a></p></div>
      </section>`;
    return;
  }

  const session = new OOOSession(resolved.items, resolved.setId);
  const startedAt = Date.now();

  /* Per-item behavior the engine wants to know about. */
  let thinkOpened = false;  // the Think coach was consulted
  let choiceAt = 0;         // when the current choice became complete
  let revised = false;      // the choice changed after first completing

  function showItem() {
    const item = session.current;
    const m = item.meta;
    const tier = tierInfo(m.tier);
    const mode = tierMode(m.tier);
    const mission = OOO_MISSIONS[m.mission];
    const sentenceByLabel = new Map(item.sentences.map((s) => [s.label, s]));
    thinkOpened = false;
    choiceAt = 0;
    revised = false;

    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <a href="#/ooo">← Journey</a>
          <span>Item <b>${session.index + 1}</b> of ${session.total}</span>
          <cat-timer></cat-timer>
        </div>
        <cat-progress-bar max="${session.total}" value="${session.index}"></cat-progress-bar>

        <div class="card">
          <p class="screen__eyebrow">${mode === 'construct' ? 'Build the paragraph' : 'Find the one that stands apart'}</p>
          <div class="briefing-chips">
            <span class="badge">${escapeHTML(tier.label)}</span>
            <span class="badge">${escapeHTML(m.genre)}</span>
            <span class="badge"><span class="dot dot--${escapeHTML(m.difficulty)}"></span>${escapeHTML(m.difficulty)}</span>
            <span class="badge">~${Math.max(1, Math.round(m.estimated_time_sec / 60))} min</span>
          </div>

          <div class="ooo-mission">
            <p class="ooo-mission__eyebrow">${escapeHTML(OOO_LINES.missionEyebrow)}</p>
            <p class="ooo-mission__title">${escapeHTML(mission.title)}</p>
            <p class="ooo-mission__line">${escapeHTML(mission.line)}</p>
          </div>

          <p class="ooo-challenge">${escapeHTML(item.mentor.challenge)}</p>
          <p class="hint" style="margin-bottom: var(--space-4)">${escapeHTML(
            mode === 'construct' ? OOO_LINES.constructHint : OOO_LINES.excludeHint)}</p>

          <div id="solve-slot" data-sfx="off"></div>

          <div id="readback"></div>
          <div id="teaching-slot"></div>
          <div class="session-actions" id="actions"></div>
        </div>

        <button class="ooo-think" id="think-open" type="button"
                aria-label="Open the thinking coach">
          <span class="ooo-think__glyph" aria-hidden="true">?</span>
          <span class="ooo-think__label">Think</span>
        </button>
        <div id="think-slot"></div>
      </section>
    `;

    outlet.querySelector('cat-timer').startAt = startedAt;
    const solveSlot = outlet.querySelector('#solve-slot');
    const readback = outlet.querySelector('#readback');
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
        <div class="ooo-think-sheet" role="dialog" aria-modal="true" aria-label="Thinking coach">
          <div class="ooo-think-sheet__backdrop" data-think-close></div>
          <div class="ooo-think-sheet__panel">
            <p class="ooo-think-sheet__eyebrow">${escapeHTML(OOO_LINES.thinkTitle)}</p>
            <p class="ooo-think-sheet__lead">${escapeHTML(OOO_LINES.thinkLead)}</p>
            <ul class="ooo-think-sheet__list">
              ${thinkQuestions(item).map((qq) => `<li>${escapeHTML(qq)}</li>`).join('')}
            </ul>
            <button class="btn btn--block" data-think-close>Back to the sentences</button>
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

    /* ---------- Solving state (both modes) ---------- */
    let board = null;      // construct mode's <cat-jumble-board>
    let excluded = null;   // exclude mode's picked label

    /** The current exclusion implied by the interaction, or null. */
    function currentChoice() {
      if (mode === 'construct') {
        const order = board.order;
        if (order.length !== 4) return null;
        const left = item.sentences.map((s) => s.label).find((l) => !order.includes(l));
        return left ?? null;
      }
      return excluded;
    }

    function syncSolving() {
      const choice = currentChoice();
      if (choice) {
        if (!choiceAt) {
          choiceAt = Date.now();
          playSound('cardOpen'); // the paper settles: a candidate paragraph exists
        }
        if (mode === 'construct') {
          const order = board.order;
          readback.innerHTML = `
            <div class="ooo-readback">
              <p class="ooo-readback__eyebrow">Read it back</p>
              <p class="ooo-readback__text">${order.map((l) => escapeHTML(sentenceByLabel.get(l).text)).join(' ')}</p>
              <p class="ooo-readback__apart">Standing apart: <b>${escapeHTML(choice)}</b> · ${escapeHTML(sentenceByLabel.get(choice).text)}</p>
              <p class="ooo-readback__nudge">${escapeHTML(OOO_LINES.buildNudge)}</p>
            </div>`;
        } else {
          readback.innerHTML = `
            <div class="ooo-readback">
              <p class="ooo-readback__eyebrow">Read it back</p>
              <p class="ooo-readback__text">${item.sentences.filter((s) => s.label !== choice)
                .map((s) => escapeHTML(s.text)).join(' ')}</p>
              <p class="ooo-readback__apart">Standing apart: <b>${escapeHTML(choice)}</b></p>
              <p class="ooo-readback__nudge">${escapeHTML(OOO_LINES.excludeNudge)}</p>
            </div>`;
        }
        readback.querySelector('.ooo-readback').scrollIntoView({ block: 'nearest' });
      } else {
        readback.innerHTML = '';
      }
      actions.innerHTML = `
        <button class="btn" id="skip">Set aside</button>
        <button class="btn btn--primary" id="lock" ${choice ? '' : 'disabled'}>
          ${choice ? `${escapeHTML(choice)} stands apart` : 'Lock it in'}</button>
      `;
      actions.querySelector('#lock').addEventListener('click', onLock);
      actions.querySelector('#skip').addEventListener('click', onSkip);
    }

    if (mode === 'construct') {
      solveSlot.innerHTML = '<cat-jumble-board></cat-jumble-board>';
      board = solveSlot.querySelector('cat-jumble-board');
      board.sentences = item.sentences;
      board.maxPlaced = 4;
      board.addEventListener('jumble-order-change', (e) => {
        cue(e.detail.action === 'place' ? 'toggle' : 'tap');
        if (e.detail.action === 'remove' && choiceAt) revised = true;
        syncSolving();
      });
    } else {
      solveSlot.innerHTML = item.sentences.map((s) => `
        <button type="button" class="ooo-sent" data-label="${escapeHTML(s.label)}"
                aria-pressed="false" aria-label="Sentence ${escapeHTML(s.label)}. Tap to mark it as the one that stands apart.">
          <span class="ooo-sent__slot" aria-hidden="true"></span>
          <span class="ooo-sent__tag">${escapeHTML(s.label)}</span>
          <span class="ooo-sent__text">${escapeHTML(s.text)}</span>
        </button>`).join('');
      solveSlot.addEventListener('click', (e) => {
        const card = e.target.closest('.ooo-sent');
        if (!card || card.hasAttribute('disabled')) return;
        const label = card.dataset.label;
        if (excluded !== null && excluded !== label) revised = true;
        excluded = excluded === label ? null : label;
        cue(excluded ? 'toggle' : 'tap');
        for (const el of solveSlot.querySelectorAll('.ooo-sent')) {
          const isPicked = el.dataset.label === excluded;
          el.classList.toggle('is-excluded', isPicked);
          el.setAttribute('aria-pressed', String(isPicked));
        }
        syncSolving();
      });
    }

    /* ---------- Phase 2: revealed — taught, never just marked ---------- */
    function reveal(answer) {
      thinkBtn.remove();
      thinkSlot.innerHTML = '';
      readback.innerHTML = '';

      if (mode === 'construct') {
        board.reveal = { correct_order: item.core_order, excluded: item.outlier };
      } else {
        for (const el of solveSlot.querySelectorAll('.ooo-sent')) {
          el.setAttribute('disabled', '');
          const label = el.dataset.label;
          el.classList.remove('is-excluded');
          if (label === item.outlier) el.classList.add('is-apart');
          else if (answer && label === answer.chosen) el.classList.add('is-missed');
          else el.classList.add('is-core');
        }
      }

      const verdict = answer === null || answer.chosen === null
        ? { cls: '', text: `Set aside. The sentence that stands apart is ${item.outlier}.` }
        : answer.is_correct
          ? { cls: 'is-correct', text: `Sentence ${answer.chosen}. That is the one with no seat in the paragraph.` }
          : { cls: 'is-wrong', text: `You set ${answer.chosen} apart. The sentence with no seat is ${item.outlier}.` };

      const partial = answer && !answer.is_correct && answer.built && answer.build_links_correct > 0
        ? `<p class="oox-partial">Still, your built paragraph had ${answer.build_links_correct} of
           3 joins right. The construction is closer than the score says.</p>`
        : '';

      teachingSlot.innerHTML = `
        <div class="oox-verdict ${verdict.cls}">${escapeHTML(verdict.text)}</div>
        ${partial}
        ${renderTeaching(item, answer)}
      `;
      actions.innerHTML = `
        <button class="btn btn--primary btn--block" id="next">
          ${session.isLast ? 'Finish the set' : 'Next item'}
        </button>`;
      actions.querySelector('#next').addEventListener('click', onNext);
      teachingSlot.scrollIntoView({ block: 'start' });
    }

    function onLock() {
      const choice = currentChoice();
      if (!choice) return;
      const verdict = session.answer(choice, {
        built: mode === 'construct' ? board.order : null,
        think_opened: thinkOpened,
        revised,
        read_back_ms: choiceAt ? Date.now() - choiceAt : 0,
      });
      cue(verdict.is_correct ? 'correct' : 'wrong');
      reveal(session.answerFor(item.meta.id));
    }

    function onSkip() {
      session.skip({
        built: mode === 'construct' && board.order.length === 4 ? board.order : null,
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

    syncSolving();
  }

  /* ---------------- The mentor moment ---------------- */
  async function finishSession() {
    const results = session.finish();

    // Persist FIRST; nothing is shown until the data is safe.
    try {
      await saveOOOResults(storage, results);
    } catch (err) {
      console.error('[CAT OS]', err);
      toast('Set finished but could not be saved.', 'error');
    }

    const { session: s } = results;

    // Engagement: derived from stored truth, before/after (same
    // discipline as the RC, PJ and PS session screens).
    let engagement = null;
    let priorOOO = [];
    try {
      const all = await storage.getAll(STORES.SESSIONS);
      const prior = all.filter((x) => x.id !== s.id);
      priorOOO = prior.filter((x) => x.module === 'ooo');
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

    // The mentor: OOO DNA from PRIOR sessions, then this set's one lesson.
    let lesson = null;
    try {
      const priorItemIds = priorOOO.flatMap((x) => x.item_ids ?? []);
      const priorItems = await loadOOOItems(priorItemIds);
      const dna = deriveOOODNA(priorOOO, priorItems);
      const thisItems = new Map(session.items.map((i) => [i.meta.id, i]));
      lesson = chooseOOOLesson({ session: s, items: thisItems, dna, priorSessions: priorOOO.length });
      await storage.put(STORES.LEARNING, oooLessonRecord(lesson, s, dayKey(new Date())));
    } catch (err) {
      console.error('[CAT OS] ooo mentor derive failed:', err);
    }

    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <a href="#/ooo">← Journey</a>
        </div>

        <article class="moment">
          <p class="screen__eyebrow">Your mentor · Odd One Out</p>
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
                <a href="#/ooo/learn/${escapeHTML(lesson.item_id)}">Walk through that item again</a></p>` : ''}

            <p class="moment__closing">${escapeHTML(lesson.closing)}</p>
          ` : `
            <h1 class="moment__opening">Set complete.</h1>
          `}

          <p class="moment__numbers">${escapeHTML(OOO_LINES.numbersAside(s.score.correct, s.score.total))}</p>

          <details class="reread moment__details">
            <summary>Set details</summary>
            <div class="reread__body">
              ${engagement ? '<div style="margin-bottom: var(--space-4)"><cat-xp-bar></cat-xp-bar></div>' : ''}
              ${s.answers.map((a, i) => {
                const glyph = a.is_correct === true ? '✓' : a.is_correct === false ? '·' : '–';
                const cls = a.is_correct === true ? 'verdict--correct' : '';
                return `<div class="row">
                  <span class="row__label">Item ${i + 1} <span class="${cls}">${glyph}</span></span>
                  <span class="row__hint">${a.chosen ? `set ${a.chosen} apart` : 'set aside'} · ${formatDuration(a.time_ms)} ·
                    <a href="#/ooo/learn/${escapeHTML(a.item_id)}">revisit</a></span>
                </div>`;
              }).join('')}
              <p class="hint" style="margin-top: var(--space-3)">CAT-style marks for
              type-in Odd One Out: +3 when the excluded sentence matches, 0 otherwise.
              No negatives. Scheme verified against recent papers; it can change.</p>
            </div>
          </details>
        </article>

        <div class="session-actions">
          <a class="btn btn--primary btn--block" href="#/ooo">Continue the journey</a>
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
