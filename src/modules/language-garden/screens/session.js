/**
 * session.js (screen) — the Root Grove's one session shape, six beats
 * (LANGUAGE_GARDEN_BIBLE §5): ENCOUNTER+ATTEMPT → KEY → SPREAD → REACH
 * → GROWTH, for a first "grow", or KEY RETRIEVAL → two MEMBER CHECKS →
 * REACH → GROWTH for a later "revisit" (§6.6). Full screen, no
 * navigation chrome, no clock, no progress bar (§10) — only a small,
 * quiet close affordance, because leaving mid-session is always
 * allowed and never penalised.
 */

import { loadLGItem, listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { GardenSession, computePlantState } from '../../../core/engine/garden-session.js';
import { listGardenSessions, sessionsForFamily, saveGardenSession } from '../logic/store.js';
import { deriveGroveScene, nextReachPoolIndex, memberCheckOffset } from '../logic/scene.js';
import { GARDEN_LINES, GROWTH_LINES, ATTEMPT_LINES, pick } from '../../../core/mentor/garden-voice.js';
import { playGardenSound } from '../logic/audio.js';
import { escapeHTML } from '../../../core/utils/format.js';
import '../../../ui/components/cat-option.js';
import '../../../ui/components/cat-plant.js';

const LETTERS = ['A', 'B', 'C'];

function markWord(sentence, word) {
  const stem = word.toLowerCase().slice(0, Math.max(4, word.length - 2));
  const at = sentence.toLowerCase().indexOf(stem);
  if (at === -1) return escapeHTML(sentence);
  return `${escapeHTML(sentence.slice(0, at))}<mark>${escapeHTML(sentence.slice(at, at + stem.length))}</mark>${escapeHTML(sentence.slice(at + stem.length))}`;
}

export async function renderGardenSession(outlet, context, params) {
  let family, siblings, history;
  try {
    family = await loadLGItem(params.id);
    const registry = await listLGItems();
    const others = await loadLGItems(registry.map((i) => i.id).filter((id) => id !== params.id));
    siblings = [...others.values()].map((f) => ({ id: f.meta.id, label: f.root.label, core_meaning: f.root.core_meaning }));
    const all = await listGardenSessions(context.storage);
    history = sessionsForFamily(all, params.id);
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>This plant will not open</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted"><a href="#/garden">Back to the grove</a></p></div></section>`;
    return;
  }

  const priorState = computePlantState(history);
  const type = priorState.stage === 'seed' ? 'grow' : 'revisit';
  const session = new GardenSession(family, type, siblings);
  const taught = session.taught;

  outlet.innerHTML = `
    <section class="screen lgx" data-beat="">
      <button class="lgx__close" id="lgx-close" aria-label="Leave the garden">×</button>
      <div class="lgx__plant" aria-hidden="true">
        <cat-plant stage="${priorState.stage === 'seed' ? 'seed' : priorState.stage}" due="none"></cat-plant>
      </div>
      <div class="lgx__stage" id="lgx-stage"></div>
    </section>
  `;
  outlet.querySelector('#lgx-close').addEventListener('click', () => { location.hash = '#/garden'; });
  const stage = outlet.querySelector('#lgx-stage');

  /* ---------------- shared: a quiet quick-pick beat ---------------- */
  function renderChoice({ eyebrow, sentence, prompt, options, onAnswer }) {
    stage.innerHTML = `
      <div class="lgx-beat">
        ${eyebrow ? `<p class="screen__eyebrow">${escapeHTML(eyebrow)}</p>` : ''}
        ${sentence ? `<p class="lgx-sentence">${sentence}</p>` : ''}
        <p class="lgx-prompt">${escapeHTML(prompt)}</p>
        <div id="lgx-options"></div>
      </div>
    `;
    const optSlot = stage.querySelector('#lgx-options');
    optSlot.innerHTML = options.map((o, i) => `<cat-option letter="${LETTERS[i]}" text="${escapeHTML(o.text)}"></cat-option>`).join('');
    let locked = false;
    optSlot.addEventListener('cat-option-select', (e) => {
      if (locked) return;
      locked = true;
      const idx = LETTERS.indexOf(e.detail.letter);
      const verdict = options[idx];
      for (const opt of optSlot.querySelectorAll('cat-option')) {
        const oi = LETTERS.indexOf(opt.getAttribute('letter'));
        opt.setAttribute('disabled', '');
        // No red anywhere in the garden (Bible §8, §13): the option that
        // was picked gets no special "wrong" callout, just the same
        // neutral dimming as every other non-correct option.
        opt.setAttribute('state', options[oi].correct ? 'correct' : 'dimmed');
      }
      setTimeout(() => onAnswer(idx, verdict.correct), 420);
    });
  }

  /* ---------------- shared: tap-the-parts-and-join ---------------- */
  /** @param {boolean} [revealMeaning] Spread confirms the meaning once
   *  joined (true); Reach must NOT (false) — showing the meaning here
   *  would hand the learner the answer to the construction quiz that
   *  follows, defeating the entire beat (Bible §5.5: construct, don't
   *  recall). Reach shows the assembled WORD only; the meaning is what
   *  the very next screen asks the learner to construct. */
  function renderPartsBuild({ eyebrow, member, revealMeaning = true, onJoined }) {
    stage.innerHTML = `
      <div class="lgx-beat">
        ${eyebrow ? `<p class="screen__eyebrow">${escapeHTML(eyebrow)}</p>` : ''}
        <p class="lgx-prompt">${GARDEN_LINES.spreadInstruction}</p>
        <div class="lgx-parts" id="lgx-parts">
          ${member.parts.map((p, i) => `
            <button class="lgx-part" data-i="${i}">
              <span class="lgx-part__text">${escapeHTML(p.text)}</span>
              <span class="lgx-part__gloss" hidden>${escapeHTML(p.gloss)}</span>
            </button>`).join('')}
        </div>
        <div id="lgx-joined"></div>
      </div>
    `;
    const revealed = new Set();
    const partsEl = stage.querySelectorAll('.lgx-part');
    for (const btn of partsEl) {
      btn.addEventListener('click', () => {
        const i = Number(btn.dataset.i);
        if (revealed.has(i)) return;
        revealed.add(i);
        btn.classList.add('is-revealed');
        btn.querySelector('.lgx-part__gloss').hidden = false;
        playGardenSound('leafTap');
        if (revealed.size === member.parts.length) join();
      });
    }
    function join() {
      playGardenSound('bloom');
      for (const btn of partsEl) btn.classList.add('is-joined');
      const joined = document.createElement('div');
      joined.className = 'lgx-joined';
      joined.innerHTML = `
        <p class="lgx-joined__word">${escapeHTML(member.word)}</p>
        ${revealMeaning ? `<p class="lgx-joined__meaning">${escapeHTML(member.meaning)}</p>` : ''}
        <button class="btn btn--primary btn--block" id="lgx-next">${GARDEN_LINES.continueLabel}</button>
      `;
      stage.querySelector('#lgx-joined').appendChild(joined);
      joined.scrollIntoView({ block: 'nearest' });
      joined.querySelector('#lgx-next').addEventListener('click', onJoined);
    }
  }

  /* ---------------- GROW ---------------- */
  function grow_attempt() {
    session.markBeatShown();
    const anchor = taught[0];
    renderChoice({
      eyebrow: ATTEMPT_LINES.eyebrow,
      sentence: markWord(anchor.context_sentences[0], anchor.word),
      prompt: family.attempt.direction_prompt,
      options: session.attemptOptions(),
      onAnswer: (idx) => { session.answerAttempt(idx); grow_key(); },
    });
  }

  function grow_key() {
    const label = family.root.label;
    const origin = family.root.origin_language;
    const meaning = family.root.core_meaning;
    stage.innerHTML = `
      <div class="lgx-beat lgx-beat--key">
        <p class="screen__eyebrow">${GARDEN_LINES.keyEyebrow}</p>
        <p class="lgx-key">${escapeHTML(label)}. ${escapeHTML(origin)}. ${escapeHTML(meaning[0].toUpperCase() + meaning.slice(1))}.</p>
        <button class="btn btn--primary btn--block" id="lgx-next">${GARDEN_LINES.continueLabel}</button>
      </div>
    `;
    playGardenSound('key');
    stage.querySelector('#lgx-next').addEventListener('click', () => grow_spread(0));
  }

  function grow_spread(memberIndex) {
    if (memberIndex >= taught.length) { grow_reach(); return; }
    const member = taught[memberIndex];
    renderPartsBuild({
      eyebrow: `${memberIndex + 1} of ${taught.length}`,
      member,
      onJoined: () => { session.confirmSpreadMember(memberIndex); grow_spread(memberIndex + 1); },
    });
  }

  function grow_reach() {
    reachBeat({ poolIndex: 0, attempt: 1, onDone: grow_growth });
  }

  async function grow_growth() {
    const record = session.finish();
    try { await saveGardenSession(context.storage, record); } catch { /* non-fatal */ }
    playGardenSound('growth');
    const postState = computePlantState([...history, record], Date.parse(record.finished_at));
    const line = GROWTH_LINES.firstGrow(family.root.label, session.id);
    growthBeat(line, postState);
  }

  /* ---------------- REVISIT ---------------- */
  function revisit_key() {
    session.markBeatShown();
    const options = session.keyRetrievalOptions();
    renderChoice({
      eyebrow: GARDEN_LINES.keyEyebrow,
      prompt: `${family.root.label}. What does it mean?`,
      options,
      onAnswer: (idx) => {
        session.answerKeyRetrieval(idx);
        const offset = memberCheckOffset(history);
        const [a, b] = session.memberCheckIndices(offset);
        revisit_member(a, b);
      },
    });
  }

  function revisit_member(a, b, doneA = false) {
    const idx = doneA ? b : a;
    const member = taught[idx];
    session.markBeatShown();
    const options = session.memberCheckOptions(idx);
    renderChoice({
      eyebrow: `${family.root.label} · fresh sentence`,
      sentence: markWord(member.context_sentences[1] ?? member.context_sentences[0], member.word),
      prompt: 'Which meaning fits here?',
      options,
      onAnswer: (choiceIdx) => {
        session.answerMemberCheck(idx, choiceIdx);
        if (!doneA) revisit_member(a, b, true);
        else revisit_reach();
      },
    });
  }

  function revisit_reach() {
    const poolIndex = nextReachPoolIndex(history, session.reachPool.length);
    reachBeat({ poolIndex, attempt: 1, onDone: revisit_growth });
  }

  async function revisit_growth() {
    const record = session.finish();
    try { await saveGardenSession(context.storage, record); } catch { /* non-fatal */ }
    playGardenSound('growth');
    const postState = computePlantState([...history, record], Date.parse(record.finished_at));
    const line = postState.stage === 'evergreen' && priorState.stage !== 'evergreen'
      ? GROWTH_LINES.evergreen(family.root.label, session.id)
      : record.clean
        ? GROWTH_LINES.revisitClean(family.root.label, session.id)
        : GROWTH_LINES.revisitRocky(family.root.label, session.id);
    growthBeat(line, postState);
  }

  /* ---------------- shared: Reach (cannot be failed) ---------------- */
  function reachBeat({ poolIndex, attempt, onDone }) {
    const member = session.reachMember(poolIndex);
    renderPartsBuild({
      eyebrow: GARDEN_LINES.reachEyebrow,
      member,
      revealMeaning: false,
      onJoined: () => {
        const slot = document.createElement('div');
        slot.id = 'lgx-reach-choice';
        stage.querySelector('.lgx-beat').appendChild(slot);
        reachChoice(slot, { poolIndex, attempt, member, onDone });
      },
    });
  }

  /** Renders into an already-attached `slot`, replacing only its own
   *  content on a retry (the parts-build UI above it stays put). Uses
   *  {once: true} so a retry's fresh listener can never double-fire
   *  alongside a stale one from the first attempt. */
  function reachChoice(slot, { poolIndex, attempt, member, onDone }) {
    const options = session.reachOptions(poolIndex, attempt);
    slot.innerHTML = `
      <p class="lgx-prompt">What does this build?</p>
      ${options.map((o, i) => `<cat-option letter="${LETTERS[i]}" text="${escapeHTML(o.text)}"></cat-option>`).join('')}
    `;
    slot.scrollIntoView({ block: 'nearest' });
    slot.addEventListener('cat-option-select', (e) => {
      const idx = LETTERS.indexOf(e.detail.letter);
      const verdict = session.answerReach(poolIndex, idx, attempt);
      for (const opt of slot.querySelectorAll('cat-option')) {
        const oi = LETTERS.indexOf(opt.getAttribute('letter'));
        opt.setAttribute('disabled', '');
        // No red anywhere in the garden (Bible §8, §13): the option that
        // was picked gets no special "wrong" callout, just the same
        // neutral dimming as every other non-correct option.
        opt.setAttribute('state', options[oi].correct ? 'correct' : 'dimmed');
      }
      if (verdict.is_correct || attempt >= 2) {
        setTimeout(() => {
          const landed = document.createElement('p');
          landed.className = 'lgx-landed';
          landed.textContent = GARDEN_LINES.reachLanded;
          slot.appendChild(landed);
          const next = document.createElement('button');
          next.className = 'btn btn--primary btn--block';
          next.textContent = GARDEN_LINES.continueLabel;
          next.addEventListener('click', onDone);
          slot.appendChild(next);
        }, 500);
      } else {
        setTimeout(() => {
          const hint = document.createElement('p');
          hint.className = 'lgx-hint';
          hint.textContent = GARDEN_LINES.reachHint;
          slot.appendChild(hint);
          const again = document.createElement('button');
          again.className = 'btn btn--primary btn--block';
          again.textContent = GARDEN_LINES.continueLabel;
          again.addEventListener('click', () => reachChoice(slot, { poolIndex, attempt: attempt + 1, member, onDone }));
          slot.appendChild(again);
        }, 500);
      }
    }, { once: true });
  }

  /* ---------------- shared: Growth ---------------- */
  /** @param {object} postState  computePlantState() run on history WITH
   *  this session's own record folded in — the exact same function the
   *  grove screen uses, so the art shown here can never promise a
   *  stage the grove itself won't also show the moment the learner
   *  returns (Bible: growth is earned, honest, never spent twice). */
  function growthBeat(line, postState) {
    // The small "current plant" header would now duplicate — and dilute
    // — the one peak of the whole session (Bible §7: "one peak per
    // session"), so it steps aside the moment its own bigger portrait appears.
    outlet.querySelector('.lgx__plant')?.remove();
    const afterglow = afterglowLine(context, family.meta.id);
    stage.innerHTML = `
      <div class="lgx-beat lgx-beat--growth">
        <div class="lgx-growth-art">
          <cat-plant stage="${postState.stage}" due="none"></cat-plant>
        </div>
        <p class="lgx-growth-line">${escapeHTML(line)}</p>
        <button class="btn btn--primary btn--block" id="lgx-back">${GARDEN_LINES.backToGarden}</button>
      </div>
    `;
    afterglow.then((extra) => {
      if (!extra) return;
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = extra;
      stage.querySelector('.lgx-beat--growth').insertBefore(p, stage.querySelector('#lgx-back'));
    });
    stage.querySelector('#lgx-back').addEventListener('click', () => { location.hash = '#/garden'; });
  }

  if (type === 'grow') grow_attempt();
  else revisit_key();
}

/** Bible §10 Afterglow: one optional line if exactly one OTHER plant is
 *  asking. Computed fresh (this session's own record isn't saved into
 *  `history` until just before this runs, so we re-read storage once). */
async function afterglowLine(context, justFinishedFamilyId) {
  try {
    const registry = await listLGItems();
    const loaded = await loadLGItems(registry.map((i) => i.id));
    const families = registry.map((i) => loaded.get(i.id)).filter(Boolean);
    const sessions = await listGardenSessions(context.storage);
    const scene = deriveGroveScene(families, sessions);
    if (!scene.askingId || scene.askingId === justFinishedFamilyId) return null;
    const other = families.find((f) => f.meta.id === scene.askingId);
    if (!other) return null;
    return pick(`${justFinishedFamilyId}:afterglow`, [
      `${other.root.label} is ready too.`,
      `${other.root.label} is also asking.`,
    ]);
  } catch {
    return null;
  }
}
