/**
 * session.js (screen) — the Para Summary core loop, end to end:
 * receive the mission → read the paragraph →
 * choose the summary → be taught → next → the mentor moment.
 *
 * The paragraph and four options appear together, with no writing step.
 * The Think button is a coach available while solving. It
 *   never hints and never narrows the options; it asks the questions
 *   an expert reader asks themselves (Bible §3), chosen for this
 *   item's mission.
 *
 * Phases per item:
 *  1. solving   — the paragraph (its mission and challenge wait behind
 *                 the ⓘ) and the four options.
 *  2. revealed  — verdict + Mochi's response + the
 *                 full teaching layer (logic/teach.js).
 * The set ends with ONE lesson (core/mentor/ps-lesson), never a
 * scoreboard; the numbers stay one quiet tap away.
 */

import { worldReward } from '../../../world/rewards.js';
import { loadPSItem, loadPSItems, listPSItems } from '../../../core/content-loader/loader.js';
import { PSSession } from '../../../core/engine/ps-session.js';
import { saveDraft, loadDraft, clearDraft } from '../../../core/learning/draft.js';
import { savePSResults } from '../logic/store.js';
import { psJourneyOrder, tierInfo } from '../logic/tiers.js';
import { renderTeaching } from '../logic/teach.js';
import { gated, LESSON } from '../../../core/ads/rewarded.js';
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
import { toast } from '../../../ui/components/cat-toast.js';
import { escapeHTML, formatDuration } from '../../../core/utils/format.js';
import { hostChip, petSprite, FRAME } from '../../../pets/sprite.js';
import { thoughtRoom } from '../logic/room.js';
import { thoughtRoomStyle } from '../../../ui/thought-room-style.js';
import { infoButton } from '../../../ui/info.js';
import { focusContent } from '../../../ui/focus.js';
import { openModal, closeModal } from '../../../ui/modal.js';
import '../../../ui/components/cat-question-card.js';
import '../../../ui/components/cat-progress-bar.js';
import '../../../ui/components/cat-timer.js';
import '../../../ui/components/cat-xp-bar.js';

/** Resolve what to practice: one item id, a few ids in order (the
 *  village's set of three), or a tier's items in order. */
async function resolveSet(setParam) {
  if (/^ps-[0-9]{4}$/.test(setParam)) {
    return { setId: setParam, items: [await loadPSItem(setParam)] };
  }
  if (/^ps-[0-9]{4}(,ps-[0-9]{4})+$/.test(setParam)) {
    const ids = [...new Set(setParam.split(','))];
    const loaded = await loadPSItems(ids);
    const items = ids.map((id) => loaded.get(id)).filter(Boolean);
    if (items.length === 0) throw new Error('Those paragraphs could not be loaded.');
    // The id is the trio itself, so a draft resumes this three and no other.
    return { setId: `ps-trio:${ids.join(',')}`, items };
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
  const arrivedAt = location.hash;
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

  let home = thoughtRoom();
  try {
    const [items, records] = await Promise.all([listPSItems(), storage.getAll(STORES.SESSIONS)]);
    home = thoughtRoom(items, records);
    // Only a last look for the return animation; progress comes from records.
    sessionStorage.setItem('catos:thought-room:last-look', JSON.stringify([...home.solved]));
  } catch { /* A room preview must never block practice. */ }
  await thoughtRoomStyle();
  if (location.hash !== arrivedAt) return;

  const session = new PSSession(resolved.items, resolved.setId);
  /* A set abandoned halfway used to record nothing at all. It carries on now.
     There is no first screen to offer a choice on, so it simply resumes where
     the learner was, and says so once. */
  let resumed = false;
  try {
    const draft = await loadDraft(storage, 'ps', resolved.setId);
    resumed = !!draft && session.restore(draft);
  } catch { /* a draft is a convenience, never a blocker */ }
  const keep = () => saveDraft(storage, 'ps', resolved.setId, session.snapshot());
  const startedAt = session.startedAt;
  if (resumed) toast(`Carried on from paragraph ${session.index + 1}, where you left off.`);

  /* Per-item behavior the engine wants to know about. */
  let thinkOpened = false;  // the Think coach was consulted
  const newThoughts = () => home.total ? session.items.filter((it) => session.answerFor(it.meta.id)?.is_correct === true && !home.solved.has(it.meta.id)).length : 0;
  const pendingLine = () => {
    const n = newThoughts();
    return n ? `${n} new ${n === 1 ? 'bloom' : 'blooms'} for your little world. Finish the set to save ${n === 1 ? 'it' : 'them'}.`
      : 'Find the main idea. Keep its meaning. Leave the extra details.';
  };

  function showItem() {
    const item = session.current;
    const m = item.meta;
    const q = item.question;
    const tier = tierInfo(m.tier);
    const mission = PS_MISSIONS[m.mission];
    thinkOpened = false;

    outlet.innerHTML = `
      <section class="screen ps-direct-session">
        <h1 class="sr-only">Para Summary: paragraph ${session.index + 1} of ${session.total}</h1>
        <div class="session-bar">
          <a href="#/world/place/table" aria-label="Back to Mochi’s room">← Room</a>
          <span class="session-bar__count">${hostChip('mochi', 20)} Paragraph <b>${session.index + 1}</b> of ${session.total}</span>
          <cat-timer></cat-timer>
        </div>
        <cat-progress-bar max="${session.total}" value="${session.index}"></cat-progress-bar>

        <aside class="thought-companion" aria-label="Mochi’s company">
          <button class="thought-companion__pet" type="button" aria-label="Ask Mochi for a little encouragement">${petSprite('mochi', { size: 64, frame: FRAME.idle, stage: 0 })}</button>
          <div><p class="thought-companion__say" role="status">${session.index ? 'A little clearer already. Let’s find the next thought.' : 'One little thought. What is the author really saying?'}</p><small class="thought-companion__note">${pendingLine()}</small></div>
        </aside>

        <div class="card">
          <div class="lesson-heading"><p class="screen__eyebrow">Find the author's point${infoButton('ps', {
            more: [mission && `${mission.title} ${mission.line}`, item.mentor.challenge],
            moreTitle: PS_LINES.missionEyebrow })}</p>
            <button class="ps-think" id="think-open" type="button" aria-label="Open the thinking coach"><span class="ps-think__glyph" aria-hidden="true">?</span><span>Think</span></button>
          </div>
          <div class="briefing-chips">
            <span class="badge">${escapeHTML(tier.label)}</span>
            <span class="badge">${escapeHTML(m.genre)}</span>
            <span class="badge">~${Math.max(1, Math.round(m.estimated_time_sec / 60))} min</span>
          </div>

          <div class="ps-paragraph">
            ${item.paragraph.sentences.map((s) => escapeHTML(s.text)).join(' ')}
          </div>

          <div id="choose-slot"></div>
          <div id="compare-slot"></div>
          <div id="teaching-slot"></div>
          <div class="session-actions" id="actions"></div>
        </div>

        <div id="think-slot"></div>
      </section>
    `;

    outlet.querySelector('cat-timer').startAt = startedAt;
    const chooseSlot = outlet.querySelector('#choose-slot');
    const compareSlot = outlet.querySelector('#compare-slot');
    const teachingSlot = outlet.querySelector('#teaching-slot');
    const actions = outlet.querySelector('#actions');
    const thinkBtn = outlet.querySelector('#think-open');
    const thinkSlot = outlet.querySelector('#think-slot');
    const companion = outlet.querySelector('.thought-companion');
    const mochiSays = (text, frame = FRAME.idle, correct = false) => {
      companion.querySelector('.thought-companion__say').textContent = text;
      companion.querySelector('.pet-sprite').style.setProperty('--f', frame);
      companion.classList.toggle('is-correct', correct);
      companion.querySelector('.thought-companion__note').textContent = pendingLine();
    };
    let nudges = 0;
    companion.querySelector('button').addEventListener('click', () => mochiSays([
      'I’m right here. We can take our time.',
      'A tiny sentence can hold a very big thought.',
      'Read it once more. What does the author want you to keep?',
    ][nudges++ % 3], FRAME.happy));
    session.markItemShown();
    focusContent(outlet.querySelector('h1'));

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
        closeModal(sheet);
        thinkSlot.innerHTML = '';
      };
      const sheet = thinkSlot.querySelector('[role="dialog"]');
      openModal(sheet, close, { returnTo: thinkBtn, label: 'Thinking coach' });
      for (const el of thinkSlot.querySelectorAll('[data-think-close]')) {
        el.addEventListener('click', close);
      }
    });

    /* ---------- Read and choose: four options immediately ---------- */
    let selected = null;

    function showChoosing() {
      chooseSlot.innerHTML = '<cat-question-card></cat-question-card>';
      const card = chooseSlot.querySelector('cat-question-card');
      card.question = { type: 'best_summary', stem: q.stem, options: q.options };
      card.addEventListener('cat-option-select', (e) => {
        selected = e.detail.letter;
        card.selected = selected;
        syncChoosing();
      });
      syncChoosing();
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
      mochiSays(answer?.is_correct
        ? home.solved.has(m.id) ? 'Still fits perfectly. That bloom is already growing in our world.' : 'A big thought, kept in a little sentence. You grew a new bloom!'
        : answer?.chosen ? 'A little tangle. Let’s see where the meaning changed.' : 'We can leave this thought here and come back to it.',
      answer?.is_correct ? FRAME.happy : FRAME.blink, answer?.is_correct === true);

      const verdict = answer === null || answer.chosen === null
        ? { cls: '', text: `Set aside. The author's point is option ${q.correct}.` }
        : answer.is_correct
          ? { cls: 'is-correct', text: `Option ${answer.chosen}. That is the author's point, preserved.` }
          : { cls: 'is-wrong', text: `You chose ${answer.chosen}. The author's point is option ${q.correct}.` };

      compareSlot.innerHTML = `
        <div class="psx-verdict ${verdict.cls}">${escapeHTML(verdict.text)}</div>
      `;
      // Mochi follows the learner's attention down to the verdict instead
      // of celebrating above a long paragraph, outside the phone viewport.
      compareSlot.prepend(companion);

      teachingSlot.innerHTML = renderTeaching(item, answer);
      actions.innerHTML = `
        <button class="btn btn--primary btn--block" id="next">
          ${session.isLast ? 'Finish the set' : 'Next paragraph'}
        </button>`;
      actions.querySelector('#next').addEventListener('click', onNext);
      focusContent(compareSlot.querySelector('.psx-verdict'));
      companion.scrollIntoView({ block: 'start' });
    }

    function onLock() {
      if (!selected) return;
      const verdict = session.answer(selected, {
        think_opened: thinkOpened,
      });
      keep();
      cue(verdict.is_correct ? 'correct' : 'wrong');
      reveal(session.answerFor(m.id));
    }

    function onSkip() {
      session.skip({
        think_opened: thinkOpened,
      });
      keep();
      reveal(null);
    }

    async function onNext() {
      actions.querySelector('#next')?.setAttribute('disabled', '');
      if (session.next()) {
        keep();
        showItem();
        window.scrollTo(0, 0);
      } else {
        await finishSession();
        window.scrollTo(0, 0);
      }
    }

    /* A locked answer resumes with its verdict and teaching. Historic
       summary text remains in storage, but there is no writing UI. */
    const prior = session.answerFor(m.id);
    if (prior) {
      thinkOpened = prior.think_opened;
      showChoosing();
      reveal(prior.chosen === null ? null : prior);
    } else {
      showChoosing();
    }
  }

  /* ---------------- The mentor moment ---------------- */
  async function finishSession() {
    const finishingScreen = outlet.querySelector('section');
    const results = session.finish();

    // Persist FIRST; nothing is shown until the data is safe.
    let saved = false;
    try {
      await savePSResults(storage, results);
      saved = true;
      await clearDraft(storage, 'ps', resolved.setId);
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

    if (!finishingScreen?.isConnected) return;
    const worldRewardHTML = worldReward(s, resolved.items ?? [], { storage }).html;
    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <a href="#/world/place/table">← Mochi’s room</a>
        </div>

        ${worldRewardHTML}
        <section class="thought-homecoming" aria-labelledby="thought-homecoming-title">
          <h2 id="thought-homecoming-title">${saved && newThoughts() ? `${newThoughts() === 1 ? 'A new bloom' : `${newThoughts()} new blooms`} in your little world.` : saved ? 'Mochi saved your spot.' : 'Your thoughts could not be saved yet.'}</h2>
          <p>${saved && newThoughts() ? 'You kept the important thought. Something tiny grew. Come home and see what you made.' : saved ? 'Every bloom you have already grown is safe. Mochi has a warm cup waiting for you.' : 'Your little worlds show only the work safely saved on this device.'}</p>
          <a class="btn btn--primary btn--block" href="#/world/place/table">${saved && newThoughts() ? 'See what grew' : 'Come home with Mochi'} <span aria-hidden="true">→</span></a>
        </section>
        <article class="moment">
          <p class="screen__eyebrow">Your mentor · Para Summary</p>
          ${lesson ? `
            <h1 class="moment__opening">${escapeHTML(lesson.opening)}</h1>

            ${gated(`<div class="moment__lesson">
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
            </div>`, LESSON)}

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
          <a class="btn btn--primary btn--block" href="#/world">Back to the village</a>
        </div>
      </section>
    `;

    focusContent(outlet.querySelector('.moment__opening'));
    cue('mentor'); // the calm signature; rewards layer over it consonantly

    if (engagement) {
      const bar = outlet.querySelector('cat-xp-bar');
      if (bar) {
        bar.gained = engagement.gained;
        bar.data = engagement.after.level;
      }
      // 3.0: levels, achievements and streak records were the 1.x reward layer.
      // The pet, its gifts and Toffee's flame are the reward now (THE WORLD
      // A11); a modal claiming a Level here interrupted the pet's moment.
      if (engagement.dailyGoalJustDone) setTimeout(() => cue('dailyGoal'), 500);
    }
  }

  showItem();
}
