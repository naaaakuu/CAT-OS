/**
 * session.js (screen) — the Para Jumbles core loop, end to end:
 * read the pieces → build the order → READ IT BACK → lock in →
 * be taught → next → the mentor moment.
 *
 * The read-back is deliberate product design, not decoration: the
 * Bible names premature closure as a core cause of dropped marks and
 * asks for a mandatory whole-order verification step (Recommendation
 * 6). So the assembled paragraph appears as readable prose before the
 * learner can lock, and the time they spend on it is recorded — the
 * Reading DNA uses it to notice early locking, gently.
 *
 * Phases per jumble:
 *  1. solving   — briefing chips + challenge, the board, then the
 *                 assembled read-back with Lock / rethink.
 *  2. revealed  — verdict + which joins you had + the full four-layer
 *                 teaching (logic/teach.js).
 * The set ends with ONE lesson (core/mentor/pj-lesson), never a
 * scoreboard; the numbers stay one quiet tap away.
 */

import { loadPJItem, loadPJItems, listPJItems } from '../../../core/content-loader/loader.js';
import { PJSession } from '../../../core/engine/pj-session.js';
import { savePJResults, listPJSessions } from '../logic/store.js';
import { pjJourneyOrder, tierInfo } from '../logic/tiers.js';
import { renderTeaching } from '../logic/teach.js';
import { STORES } from '../../../core/storage/storage-adapter.js';
import { sessionXP } from '../../../core/engagement/xp.js';
import { deriveEngagement } from '../../../core/engagement/stats.js';
import { newlyUnlocked } from '../../../core/engagement/achievements.js';
import { cue } from '../../../core/engagement/feedback.js';
import { playSound } from '../../../core/engagement/audio.js';
import { dayKey } from '../../../core/engagement/streaks.js';
import { derivePJDNA } from '../../../core/mentor/pj-dna.js';
import { choosePJLesson, pjLessonRecord } from '../../../core/mentor/pj-lesson.js';
import { PJ_LINES } from '../../../core/mentor/pj-voice.js';
import { celebrate } from '../../../ui/components/cat-celebration.js';
import { toast } from '../../../ui/components/cat-toast.js';
import { escapeHTML, formatDuration } from '../../../core/utils/format.js';
import '../../../ui/components/cat-jumble-board.js';
import '../../../ui/components/cat-progress-bar.js';
import '../../../ui/components/cat-timer.js';
import '../../../ui/components/cat-xp-bar.js';

/** Resolve what to practice: one item id, or a tier's items in order. */
async function resolveSet(setParam) {
  if (/^pj-[0-9]{4}$/.test(setParam)) {
    return { setId: setParam, items: [await loadPJItem(setParam)] };
  }
  const registry = await listPJItems();
  const inTier = pjJourneyOrder(registry.filter((i) => i.tier === setParam));
  if (inTier.length === 0) {
    throw new Error(`No jumbles found for "${setParam}".`);
  }
  const loaded = await loadPJItems(inTier.map((i) => i.id));
  const items = inTier.map((i) => loaded.get(i.id)).filter(Boolean);
  if (items.length === 0) throw new Error('Those jumbles could not be loaded.');
  return { setId: `pj-set:${setParam}`, items };
}

export async function renderPJSession(outlet, { storage }, params) {
  let resolved;
  try {
    resolved = await resolveSet(params.set);
  } catch (err) {
    outlet.innerHTML = `
      <section class="screen">
        <h1>Can't open this set</h1>
        <div class="card"><p>${escapeHTML(err.message)}</p>
        <p class="muted"><a href="#/pj">Back to the journey</a></p></div>
      </section>`;
    return;
  }

  const session = new PJSession(resolved.items, resolved.setId);
  const startedAt = Date.now();

  /* Per-item behavior the engine wants to know about. */
  let assembledAt = 0;   // when the order last became complete
  let revised = false;   // a removal after a complete assembly

  function showItem() {
    const item = session.current;
    const m = item.meta;
    const tier = tierInfo(m.tier);
    assembledAt = 0;
    revised = false;

    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <a href="#/pj">← Journey</a>
          <span>Jumble <b>${session.index + 1}</b> of ${session.total}</span>
          <cat-timer></cat-timer>
        </div>
        <cat-progress-bar max="${session.total}" value="${session.index}"></cat-progress-bar>

        <div class="card">
          <p class="screen__eyebrow">Rebuild the paragraph</p>
          <div class="briefing-chips">
            <span class="badge">${escapeHTML(tier.label)}</span>
            <span class="badge">${escapeHTML(m.genre)}</span>
            <span class="badge"><span class="dot dot--${escapeHTML(m.difficulty)}"></span>${escapeHTML(m.difficulty)}</span>
            <span class="badge">~${Math.max(1, Math.round(m.estimated_time_sec / 60))} min</span>
          </div>
          <p class="pj-challenge">${escapeHTML(item.mentor.challenge)}</p>
          <p class="hint" style="margin-bottom: var(--space-4)">Tap the sentences
          in the order the author wrote them. Tap one again to take it back.</p>

          <div data-sfx="off">
            <cat-jumble-board></cat-jumble-board>
          </div>

          <div id="readback"></div>
          <div id="teaching-slot"></div>
          <div class="session-actions" id="actions"></div>
        </div>
      </section>
    `;

    outlet.querySelector('cat-timer').startAt = startedAt;
    const board = outlet.querySelector('cat-jumble-board');
    board.sentences = item.sentences;
    const readback = outlet.querySelector('#readback');
    const teachingSlot = outlet.querySelector('#teaching-slot');
    const actions = outlet.querySelector('#actions');
    session.markItemShown();

    const sentenceByLabel = new Map(item.sentences.map((s) => [s.label, s]));

    function syncSolving() {
      const order = board.order;
      const complete = order.length === item.sentences.length;
      if (complete) {
        if (!assembledAt) {
          assembledAt = Date.now();
          playSound('cardOpen'); // the paper settles: a paragraph exists
        }
        readback.innerHTML = `
          <div class="pj-readback">
            <p class="pj-readback__eyebrow">Read it back</p>
            <p class="pj-readback__text">${order.map((l) => escapeHTML(sentenceByLabel.get(l).text)).join(' ')}</p>
            <p class="pj-readback__nudge">${escapeHTML(PJ_LINES.verifyNudge)}</p>
          </div>`;
        readback.querySelector('.pj-readback')
          .scrollIntoView({ block: 'nearest' });
      } else {
        readback.innerHTML = '';
      }
      actions.innerHTML = `
        <button class="btn" id="skip">Set aside</button>
        <button class="btn btn--primary" id="lock" ${complete ? '' : 'disabled'}>Lock it in</button>
      `;
      actions.querySelector('#lock').addEventListener('click', onLock);
      actions.querySelector('#skip').addEventListener('click', onSkip);
    }

    board.addEventListener('jumble-order-change', (e) => {
      cue(e.detail.action === 'place' ? 'toggle' : 'tap');
      if (e.detail.action === 'remove' && assembledAt) revised = true;
      syncSolving();
    });

    function reveal(answer) {
      board.reveal = { correct_order: item.correct_order };
      readback.innerHTML = '';
      const entered = answer?.entered ?? null;
      const links = answer
        ? item.correct_order.slice(0, -1).map((from, i) => {
          const to = item.correct_order[i + 1];
          const at = entered ? entered.indexOf(from) : -1;
          return { from, to, got: at !== -1 && entered[at + 1] === to };
        })
        : [];
      const verdict = answer === null
        ? { cls: '', text: `Set aside. The author's order is ${item.correct_order.join('')}.` }
        : answer.is_correct
          ? { cls: 'is-correct', text: `${answer.entered.join('')}. That is the author's order.` }
          : { cls: 'is-wrong', text: `You entered ${answer.entered.join('')}. The author wrote ${item.correct_order.join('')}.` };

      teachingSlot.innerHTML = `
        <div class="pjx-verdict ${verdict.cls}">${escapeHTML(verdict.text)}</div>
        ${answer && !answer.is_correct && links.some((l) => l.got) ? `
          <p class="pjx-partial">Still, you had ${links.filter((l) => l.got).length} of
          ${links.length} joins right. The structure is closer than the score says.</p>` : ''}
        ${renderTeaching(item, answer)}
      `;
      actions.innerHTML = `
        <button class="btn btn--primary btn--block" id="next">
          ${session.isLast ? 'Finish the set' : 'Next jumble'}
        </button>`;
      actions.querySelector('#next').addEventListener('click', onNext);
      teachingSlot.scrollIntoView({ block: 'start' });
    }

    function onLock() {
      const order = board.order;
      if (order.length !== item.sentences.length) return;
      const read_back_ms = assembledAt ? Date.now() - assembledAt : 0;
      const verdict = session.answer(order, { revised, read_back_ms });
      cue(verdict.is_correct ? 'correct' : 'wrong');
      reveal(session.answerFor(item.meta.id));
    }

    function onSkip() {
      session.skip();
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
      await savePJResults(storage, results);
    } catch (err) {
      console.error('[CAT OS]', err);
      toast('Set finished but could not be saved.', 'error');
    }

    const { session: s } = results;

    // Engagement: derived from stored truth, before/after (same
    // discipline as the RC session screen).
    let engagement = null;
    let priorPJ = [];
    try {
      const all = await storage.getAll(STORES.SESSIONS);
      const prior = all.filter((x) => x.id !== s.id);
      priorPJ = prior.filter((x) => x.module === 'pj');
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

    // The mentor: PJ DNA from PRIOR sessions, then this set's one lesson.
    let lesson = null;
    try {
      const priorItemIds = priorPJ.flatMap((x) => x.item_ids ?? []);
      const priorItems = await loadPJItems(priorItemIds);
      const dna = derivePJDNA(priorPJ, priorItems);
      const thisItems = new Map(session.items.map((i) => [i.meta.id, i]));
      lesson = choosePJLesson({ session: s, items: thisItems, dna, priorSessions: priorPJ.length });
      await storage.put(STORES.LEARNING, pjLessonRecord(lesson, s, dayKey(new Date())));
    } catch (err) {
      console.error('[CAT OS] pj mentor derive failed:', err);
    }

    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <a href="#/pj">← Journey</a>
        </div>

        <article class="moment">
          <p class="screen__eyebrow">Your mentor · Para Jumbles</p>
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
                <a href="#/pj/learn/${escapeHTML(lesson.item_id)}">Walk through that jumble again</a></p>` : ''}

            <p class="moment__closing">${escapeHTML(lesson.closing)}</p>
          ` : `
            <h1 class="moment__opening">Set complete.</h1>
          `}

          <p class="moment__numbers">${escapeHTML(PJ_LINES.numbersAside(s.score.correct, s.score.total))}</p>

          <details class="reread moment__details">
            <summary>Set details</summary>
            <div class="reread__body">
              ${engagement ? '<div style="margin-bottom: var(--space-4)"><cat-xp-bar></cat-xp-bar></div>' : ''}
              ${s.answers.map((a, i) => {
                const glyph = a.is_correct === true ? '✓' : a.is_correct === false ? '·' : '–';
                const cls = a.is_correct === true ? 'verdict--correct' : '';
                return `<div class="row">
                  <span class="row__label">Jumble ${i + 1} <span class="${cls}">${glyph}</span></span>
                  <span class="row__hint">${a.entered ? `entered ${a.entered.join('')}` : 'set aside'} · ${formatDuration(a.time_ms)} ·
                    <a href="#/pj/learn/${escapeHTML(a.item_id)}">revisit</a></span>
                </div>`;
              }).join('')}
              <p class="hint" style="margin-top: var(--space-3)">CAT-style marks for
              type-in jumbles: +3 when the sequence matches, 0 otherwise. No
              negatives. Scheme verified against recent papers; it can change.</p>
            </div>
          </details>
        </article>

        <div class="session-actions">
          <a class="btn btn--primary btn--block" href="#/pj">Continue the journey</a>
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
