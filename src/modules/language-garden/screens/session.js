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
import { listGardenSessions, sessionsForFamily, saveGardenSession, hasSeenGardenGrowth, markGardenGrowthSeen } from '../logic/store.js';
import { deriveValleyScene, nextReachPoolIndex, memberCheckOffset } from '../logic/scene.js';
import { biomeForFamily } from '../logic/biomes.js';
import { GARDEN_LINES, GROWTH_LINES, ATTEMPT_LINES, pick } from '../../../core/mentor/garden-voice.js';
import { playGardenSound, gardenCue } from '../logic/audio.js';
import { escapeHTML } from '../../../core/utils/format.js';
import '../../../ui/components/cat-option.js';
import '../../../ui/components/cat-plant.js';

const LETTERS = ['A', 'B', 'C'];

/** True when the OS asks for less motion — the growth moment then becomes a
 *  clear still-frame change instead of a tween (Bible §11.5). */
function prefersReducedMotion() {
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; }
  catch { return false; }
}

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
      <p class="muted"><a href="#/garden">Back to the garden</a></p></div></section>`;
    return;
  }

  // Leaving a session returns to the biome it belongs to, so the learner is
  // "back in the Rootwood" with the plant that just changed (Bible §3.1) —
  // not up at the Overlook. The valley is one level further out.
  const biome = biomeForFamily(family);
  const biomeHome = biome ? `#/garden/biome/${biome.slug}` : '#/garden';

  const priorState = computePlantState(history);
  const type = ['open_ground', 'seed'].includes(priorState.stage) ? 'grow' : 'revisit';
  const session = new GardenSession(family, type, siblings);
  const taught = session.taught;

  outlet.innerHTML = `
    <section class="screen lgx" data-beat="">
      <button class="lgx__close" id="lgx-close" aria-label="Leave the garden">×</button>
      <div class="lgx__plant" aria-hidden="true">
        <cat-plant stage="${type === 'grow' ? 'seed' : priorState.stage}" due="none"></cat-plant>
      </div>
      <div class="lgx__stage" id="lgx-stage"></div>
    </section>
  `;
  outlet.querySelector('#lgx-close').addEventListener('click', () => { location.hash = biomeHome; });
  const stage = outlet.querySelector('#lgx-stage');

  /* ---------------- shared: a quiet quick-pick beat ----------------
     `readFirst` splits Encounter from Attempt (Bible §5.1, §3.1): when a
     sentence is present, the learner is given a moment to READ it before the
     question and options fade in — nothing is asked yet. A tap on the
     sentence reveals the question early, so fast readers never wait. */
  function renderChoice({ eyebrow, sentence, prompt, options, onAnswer, readFirst = false }) {
    const gated = readFirst && !!sentence;
    stage.innerHTML = `
      <div class="lgx-beat">
        ${eyebrow ? `<p class="screen__eyebrow">${escapeHTML(eyebrow)}</p>` : ''}
        ${sentence ? `<p class="lgx-sentence">${sentence}</p>` : ''}
        <div class="lgx-ask${gated ? ' is-veiled' : ''}" id="lgx-ask">
          <p class="lgx-prompt">${escapeHTML(prompt)}</p>
          <div id="lgx-options"></div>
        </div>
      </div>
    `;
    const ask = stage.querySelector('#lgx-ask');
    const optSlot = stage.querySelector('#lgx-options');
    optSlot.innerHTML = options.map((o, i) => `<cat-option letter="${LETTERS[i]}" text="${escapeHTML(o.text)}"></cat-option>`).join('');
    let locked = false;
    optSlot.addEventListener('cat-option-select', (e) => {
      if (locked) return;
      locked = true;
      // Commitment (§10.5 #1, §14.5): the sound + light tick of *you chose*,
      // fired the instant of the tap — the same for right and wrong (Law 7).
      gardenCue('commit');
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
      // A beat to let the choice settle and be read, then move on.
      setTimeout(() => onAnswer(idx, verdict.correct), 460);
    });

    if (gated) {
      const reveal = () => ask.classList.remove('is-veiled');
      const timer = setTimeout(reveal, 800);
      stage.querySelector('.lgx-sentence')?.addEventListener('click', () => { clearTimeout(timer); reveal(); });
    }
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
        const step = revealed.size; // 0, 1, 2… so the parts climb as they join
        revealed.add(i);
        btn.classList.add('is-revealed');
        btn.querySelector('.lgx-part__gloss').hidden = false;
        playGardenSound('leafTap', { step });
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
      readFirst: true,
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
      // The root as a calm anchor — never "2 of 3". A session shows no count
      // of how many beats remain (Bible §16.4, Principle 114): the learner is
      // where they are, not racing a finish line.
      eyebrow: family.root.label,
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
      // Just the root — never "fresh sentence" (the Garden does not narrate
      // its own mechanics, Principle 80). That the prose is new is felt, not
      // announced.
      eyebrow: family.root.label,
      sentence: markWord(member.context_sentences[1] ?? member.context_sentences[0], member.word),
      prompt: 'Which meaning fits here?',
      options,
      readFirst: true,
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
    const postState = computePlantState([...history, record], Date.parse(record.finished_at));
    const line = postState.stage === 'ancient' && priorState.stage !== 'ancient'
      ? GROWTH_LINES.ancient(family.root.label, session.id)
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
      gardenCue('commit'); // the Reach is a choice too — the same quiet commitment
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
    // The small "current plant" header would now duplicate — and dilute — the
    // one peak of the whole session (Bible §6: "one peak per session"), so it
    // steps aside the moment its own bigger portrait appears.
    outlet.querySelector('.lgx__plant')?.remove();
    const afterglow = afterglowLine(context, family.meta.id);
    const reduce = prefersReducedMotion();

    stage.innerHTML = `
      <div class="lgx-beat lgx-beat--growth">
        <div class="lgx-growth-art" id="lgx-grow">
          <cat-plant class="lgx-grow-plant" stage="${postState.stage}" due="none"></cat-plant>
        </div>
        <p class="lgx-growth-line is-veiled" id="lgx-line">${escapeHTML(line)}</p>
        <button class="btn btn--primary btn--block is-veiled" id="lgx-back">${GARDEN_LINES.backToGarden}</button>
      </div>
    `;
    const art = stage.querySelector('#lgx-grow');
    const plant = stage.querySelector('.lgx-grow-plant');
    const backEl = stage.querySelector('#lgx-back');

    // The line and the button appear only AFTER the motion has come to rest —
    // never during it (Bible §11.4: "never animate and ask to read at the same
    // time"). `reveal` un-veils everything held back for the Rest beat,
    // including a late-arriving afterglow line.
    let rested = false;
    const reveal = () => {
      if (rested) return;
      rested = true;
      for (const el of stage.querySelectorAll('.lgx-beat--growth .is-veiled')) {
        el.classList.remove('is-veiled');
      }
    };

    let restTimer;
    if (reduce) {
      // Reduced motion is not a downgrade (§11.5): the plant is simply there,
      // bigger, with leaves it did not have — the CHANGE is the reward — with
      // the chime, the haptic, and the line. No wipe, no long tween.
      plant.classList.add('is-grown-still');
      gardenCue('growth');
      restTimer = setTimeout(reveal, 460);
    } else {
      // The four movements (§11.4): anticipation → extension → settle → rest.
      // The tree rises out of the soil (a clip reveal from the base) and
      // settles with one organic overshoot; the chime + warm haptic land as it
      // releases into the extension; then everything is still, and the line
      // fades in.
      plant.classList.add('is-growing');
      setTimeout(() => gardenCue('growth'), 150); // the thump + chime as growth begins
      restTimer = setTimeout(reveal, 1650);        // after the ~1.6s animation rests
    }

    // Skippable by tap from the SECOND viewing onward — never the first, which
    // is sacred (§11.2). A tap lands the tree and reveals the line at once.
    hasSeenGardenGrowth(context.storage).then((seen) => {
      if (seen && !reduce) {
        art.classList.add('is-skippable');
        art.addEventListener('click', () => {
          clearTimeout(restTimer);
          plant.classList.remove('is-growing');
          plant.classList.add('is-grown-still');
          reveal();
        }, { once: true });
      }
      markGardenGrowthSeen(context.storage).catch(() => { /* non-fatal */ });
    }).catch(() => { /* first-view default: play in full */ });

    afterglow.then((extra) => {
      if (!extra) return;
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = extra;
      if (!rested) p.classList.add('is-veiled');
      stage.querySelector('.lgx-beat--growth').insertBefore(p, backEl);
    });

    backEl.addEventListener('click', () => { location.hash = biomeHome; });
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
    const scene = deriveValleyScene(families, sessions);
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
