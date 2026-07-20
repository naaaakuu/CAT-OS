/**
 * session.js (screen) — the Root Grove's one session shape, six beats
 * (LANGUAGE_GARDEN_BIBLE §5): ENCOUNTER+ATTEMPT → KEY → SPREAD → REACH
 * → GROWTH, for a first "grow", or KEY RETRIEVAL → two MEMBER CHECKS →
 * REACH → GROWTH for a later "revisit" (§6.6). Full screen, no
 * navigation chrome, no clock, no progress bar (§10) — only a small,
 * quiet close affordance, because leaving mid-session is always
 * allowed and never penalised.
 *
 * Phase V, Stage W4 (LANGUAGE GARDEN — THE WORLD.md Part 10.3): the
 * session's stage is the biome itself, not a separate white sheet. The
 * cathedral scene renders as a becalmed ground layer — ambient life
 * paused, the world dimmed and cooled slightly, the tended family
 * standing in its own working-set slot (or the horizon, if it is
 * already Ancient) exactly as the biome screen would show it. Every
 * question beat floats on the veil, the only surface text sits on
 * inside the world (never a card, never paper); Growth clears the veil
 * completely and grows the SAME plant, in place, at its real scale —
 * "the world alone, holding still" — before the one quiet line appears
 * on the clear air.
 */

import { loadLGItem, listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { GardenSession, computePlantState, strugglingMembers } from '../../../core/engine/garden-session.js';
import { listGardenSessions, sessionsForFamily, saveGardenSession, hasSeenGardenGrowth, markGardenGrowthSeen, listGardenSeeds } from '../logic/store.js';
import { deriveValleyScene, nextReachPoolIndex, memberCheckOffset, isBiomeGrown } from '../logic/scene.js';
import { biomeForFamily } from '../logic/biomes.js';
import { computeGroundTier } from '../logic/effort.js';
import { atmosphereFor } from '../logic/atmosphere.js';
import { focusedGroveSceneHTML, STAGE_HEIGHT_PCT } from './biome.js';
import { GARDEN_LINES, GROWTH_LINES, ATTEMPT_LINES, pick } from '../../../core/mentor/garden-voice.js';
import { playGardenSound, gardenCue, tonicHzForBiome } from '../logic/audio.js';
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

/** A true one-shot click: fires at most once and disables the control the
 *  instant it fires, so a rapid double-tap on a Continue-style button can
 *  never re-enter the beat that just completed. Session navigation must be
 *  idempotent — every beat advances exactly once per tap, however fast. */
function onceClick(el, handler) {
  el.addEventListener('click', (e) => {
    el.disabled = true;
    handler(e);
  }, { once: true });
}

function markWord(sentence, word) {
  const stem = word.toLowerCase().slice(0, Math.max(4, word.length - 2));
  const at = sentence.toLowerCase().indexOf(stem);
  if (at === -1) return escapeHTML(sentence);
  // Highlight the WHOLE word as it appears in the prose (the stem only
  // finds it): a half-marked word reads as a typo, not an invitation.
  let end = at + stem.length;
  while (end < sentence.length && /[a-z]/i.test(sentence[end])) end += 1;
  return `${escapeHTML(sentence.slice(0, at))}<mark>${escapeHTML(sentence.slice(at, end))}</mark>${escapeHTML(sentence.slice(end))}`;
}

export async function renderGardenSession(outlet, context, params) {
  let family, siblings, history, isFirstEver, allFamilies, allSessions, seeds;
  try {
    family = await loadLGItem(params.id);
    const registry = await listLGItems();
    const loaded = await loadLGItems(registry.map((i) => i.id));
    allFamilies = [...loaded.values()];
    siblings = allFamilies.filter((f) => f.meta.id !== params.id).map((f) => ({ id: f.meta.id, label: f.root.label, core_meaning: f.root.core_meaning }));
    allSessions = await listGardenSessions(context.storage);
    seeds = await listGardenSeeds(context.storage);
    history = sessionsForFamily(allSessions, params.id);
    // The very first session of the learner's life in the Garden — the one
    // the Overlook launches directly (§3.1). It alone opens with an arrival.
    isFirstEver = allSessions.length === 0;
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
  // THE WORLD §11.4: Growth/Regrowth root the Valley Phrase on the biome's
  // own tonic — today always the Rootwood's, since it is the only living
  // biome, but computed generically so a future biome needs no change here.
  const tonicHz = tonicHzForBiome(biome);

  const priorState = computePlantState(history);
  const type = ['open_ground', 'seed'].includes(priorState.stage) ? 'grow' : 'revisit';
  const session = new GardenSession(family, type, siblings);
  const taught = session.taught;

  const ground = computeGroundTier(allSessions);
  const atmo = atmosphereFor();
  // The tended plant's DISPLAY state, before growth: a grow-type session
  // always shows a seed about to become a sprout (§3.1), regardless of
  // whether it was open ground or an already-planted seed a moment ago —
  // the world is showing "this is being tended right now," not the raw
  // computed stage.
  const displayState = type === 'grow'
    ? { stage: 'seed', due: 'none', vigor: 0, landmark: false, nextReviewAt: null }
    : priorState;
  const tendedView = { family, state: displayState, history, biome };
  const worldHTML = focusedGroveSceneHTML(biome, ground, atmo, allFamilies, allSessions, seeds, tendedView);

  outlet.innerHTML = `
    <section class="screen lgx" data-beat="" data-time="${atmo.time}">
      <div class="lgx__world" aria-hidden="true">${worldHTML}</div>
      <button class="lgx__close" id="lgx-close" aria-label="Leave the garden">×</button>
      <div class="lgx__veil-wrap" id="lgx-veil-wrap">
        <div class="lgx-veil" id="lgx-veil"></div>
      </div>
    </section>
  `;
  outlet.querySelector('#lgx-close').addEventListener('click', () => { location.hash = biomeHome; });
  const lgxEl = outlet.querySelector('.lgx');
  const stage = outlet.querySelector('#lgx-veil');
  const veilWrap = outlet.querySelector('#lgx-veil-wrap');

  // Defense in depth alongside the onceClick guards below: this session may
  // finish exactly once. Even if some future entry point ever reached
  // grow_growth/revisit_growth twice, the Memory Ledger record it writes
  // must never be written twice for one real session.
  let sessionEnded = false;

  /** Keyboard/screen-reader continuity (Phase 4.9 P5): each beat replaces
   *  the stage wholesale, which would drop focus to <body>. Focus lands on
   *  the fresh beat instead — programmatic, so no ring appears for a
   *  pointer tap, while a keyboard learner is carried from beat to beat. */
  function focusBeat() {
    const beat = stage.querySelector('.lgx-beat');
    if (!beat) return;
    beat.setAttribute('tabindex', '-1');
    beat.focus({ preventScroll: true });
  }

  /** The arrival (Visual Guide Part 2, THE WORLD Part 10.3/3.1): before the
   *  first question of the learner's life here, the Rootwood the world just
   *  rendered is already there, whole and still — a warm dark simply lifts
   *  off it, ~2 seconds, once, ever, revealing the real stage rather than a
   *  painted stand-in. No text, no tip, no logo (§3.1: no splash screen —
   *  this is the world, not a brand). A tap moves on early; reduced motion
   *  goes straight to the sentence. */
  function arrivalPrelude(onDone) {
    if (prefersReducedMotion()) { onDone(); return; }
    const veil = document.createElement('div');
    veil.className = 'lgx-arrival';
    veil.setAttribute('aria-hidden', 'true');
    lgxEl.appendChild(veil);
    let left = false;
    const leaveWood = () => {
      if (left) return;
      left = true;
      veil.classList.add('is-leaving');
      setTimeout(() => { veil.remove(); onDone(); }, 620);
    };
    veil.addEventListener('click', leaveWood, { once: true });
    setTimeout(leaveWood, 2400);
  }

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
    focusBeat();
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
        // No red anywhere in the garden (Bible §8, §13): a wrong pick never
        // gets the shell's red "wrong" callout. But the learner's own
        // choice must never silently vanish into the same dimming as an
        // option they never touched — "picked" marks it, neutrally, so
        // what they chose stays visible right up to the reveal.
        opt.setAttribute('state', options[oi].correct ? 'correct' : oi === idx ? 'picked' : 'dimmed');
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
    focusBeat();
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
      onceClick(joined.querySelector('#lgx-next'), onJoined);
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
    focusBeat();
    playGardenSound('key');
    onceClick(stage.querySelector('#lgx-next'), () => grow_spread(0));
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
    if (sessionEnded) return;
    sessionEnded = true;
    const record = session.finish();
    try { await saveGardenSession(context.storage, record); } catch { /* non-fatal */ }
    const postState = computePlantState([...history, record], Date.parse(record.finished_at));
    const line = GROWTH_LINES.firstGrow(family.root.label, session.id);
    // A first-ever grow can reach Sprout at most (§6.2) — never Mature — so
    // a biome can never become grown here; only a revisit can cross that
    // line (revisit_growth, below).
    growthBeat(line, postState, 'growth', tonicHz);
  }

  /* ---------------- REVISIT ---------------- */

  // Silent downward adaptation (Bible §17.5, Principle 27, Roadmap 4.1): when
  // a taught member has been missed three times over, the next revisit quietly
  // re-teaches THAT member smaller — the spread narrows to it alone, its parts
  // are broken down again, and it is met in its most familiar (first) sentence
  // rather than a rotated fresh one. Nothing is announced; there is no "let's
  // try an easier one" line, because that line is a small humiliation and it is
  // why people quit. The Garden adapts down, always, and never says so.
  const struggling = strugglingMembers(history);
  const narrowTo = struggling.length ? struggling[0] : null;

  function revisit_key() {
    session.markBeatShown();
    const options = session.keyRetrievalOptions();
    renderChoice({
      eyebrow: GARDEN_LINES.keyEyebrow,
      prompt: `${family.root.label}. What does it mean?`,
      options,
      onAnswer: (idx) => {
        session.answerKeyRetrieval(idx);
        if (narrowTo !== null) { revisit_reteach(narrowTo); return; }
        const offset = memberCheckOffset(history);
        const [a, b] = session.memberCheckIndices(offset);
        revisit_member(a, b);
      },
    });
  }

  /** The downward-adapted path: re-teach one struggling member by rebuilding
   *  it from its parts (the Spread move, meaning shown — this is the sanctioned
   *  §17.5 exception to "a revisit never re-shows the lesson"), then check just
   *  that one member in its first, most familiar sentence. Same chrome, same
   *  voice — indistinguishable from an ordinary revisit except that it is
   *  gentler. */
  function revisit_reteach(idx) {
    const member = taught[idx];
    renderPartsBuild({
      eyebrow: family.root.label,
      member,
      revealMeaning: true,
      onJoined: () => {
        session.markBeatShown();
        const options = session.memberCheckOptions(idx);
        renderChoice({
          eyebrow: family.root.label,
          sentence: markWord(member.context_sentences[0], member.word),
          prompt: 'Which meaning fits here?',
          options,
          readFirst: true,
          onAnswer: (choiceIdx) => { session.answerMemberCheck(idx, choiceIdx); revisit_reach(); },
        });
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
    if (sessionEnded) return;
    sessionEnded = true;
    const record = session.finish();
    try { await saveGardenSession(context.storage, record); } catch { /* non-fatal */ }
    const finishedAt = Date.parse(record.finished_at);
    const postState = computePlantState([...history, record], finishedAt);
    // The line follows what actually happened, in order of rarity: a tree the
    // world just made a Landmark, a tree that just joined the old growth, then
    // the ordinary "it holds" / "still growing" (never "how well" — §6.7).
    const line = postState.landmark && !priorState.landmark
      ? GROWTH_LINES.landmark(family.root.label, session.id)
      : postState.stage === 'ancient' && priorState.stage !== 'ancient'
        ? GROWTH_LINES.ancient(family.root.label, session.id)
        : record.clean
          ? GROWTH_LINES.revisitClean(family.root.label, session.id)
          : GROWTH_LINES.revisitRocky(family.root.label, session.id);
    // A biome grown (Bible §3.5, §8.8; THE WORLD §11.2): "the only time the
    // valley ever sings its whole song." Detected live, exactly like the
    // Landmark check above — was the WHOLE biome short of this before this
    // record, does it clear the line with it included — never a stored
    // flag, so the one session that crosses it is found by construction.
    // Dormant in practice (it needs every family in the biome at Mature+),
    // but real: only a revisit can ever complete it (a first grow tops out
    // at Sprout, §6.2), so this is the only place it can fire.
    const grownNow = !!biome
      && !isBiomeGrown(allFamilies, allSessions, biome.slug, finishedAt)
      && isBiomeGrown(allFamilies, [...allSessions, record], biome.slug, finishedAt);
    // A revisit is a Regrowth — a memory that faded and came back — so it gets
    // the distinct descending-then-rising chime (§10.5 #5), not the first-grow
    // one — UNLESS this is the one session a biome becomes grown, which
    // supersedes it (Law 6: one peak per session, never both).
    growthBeat(line, postState, grownNow ? 'grownPhrase' : 'regrowth', tonicHz);
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
        // Same rule as the choice beats above: no red, but the learner's
        // own pick still has to stay visible, not dissolve into the dimmed
        // options they never touched.
        opt.setAttribute('state', options[oi].correct ? 'correct' : oi === idx ? 'picked' : 'dimmed');
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
          onceClick(next, onDone);
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
          onceClick(again, () => reachChoice(slot, { poolIndex, attempt: attempt + 1, member, onDone }));
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
   *  returns (Bible: growth is earned, honest, never spent twice).
   *
   *  Part 10.3: "the veil clears completely… the plant grows in the
   *  scene by extension… the world alone, holding still." The veil (and
   *  everything it held) fades away; the SAME plant already standing in
   *  the world — found via [data-tended-plant] — is grown in place, at
   *  its own real scale, never swapped for a separate floating hero. */
  function growthBeat(line, postState, cue = 'growth', tonic = tonicHz) {
    const reduce = prefersReducedMotion();
    const afterglow = afterglowLine(context, family.meta.id);

    veilWrap.classList.add('lgx-veil-wrap--cleared');
    stage.innerHTML = '';

    const plantEl = outlet.querySelector('[data-tended-plant]');
    // A plant in a working-set slot resizes its container to the
    // post-growth stage's true share of frame height (Part 8.2) — an
    // instant, un-animated layout change made while the plant itself is
    // still visually compressed near its base (clip-path), so the resize
    // is never seen. Ancient stays visually capped at Mature's size while
    // it remains in its slot (Ancient belongs on the horizon, Part 8.5 —
    // the true promotion is revealed honestly on the next visit to the
    // biome, not teleported mid-session). A horizon plant (already
    // Ancient before this session) needs no resize at all: the horizon's
    // own CSS sizing is stage-invariant.
    const wrap = plantEl?.closest('.grove-plant--slot') ?? null;
    if (wrap) {
      const slotScale = Number(wrap.dataset.slotScale) || 1;
      const cappedStage = postState.stage === 'ancient' ? 'mature' : postState.stage;
      const oldPct = parseFloat(wrap.style.height) || (STAGE_HEIGHT_PCT[cappedStage] ?? STAGE_HEIGHT_PCT.mature) * slotScale;
      const newPct = (STAGE_HEIGHT_PCT[cappedStage] ?? STAGE_HEIGHT_PCT.mature) * slotScale;
      plantEl.style.setProperty('--grow-scale-from', String(newPct > 0 ? oldPct / newPct : 1));
      wrap.style.height = `${newPct}%`;
      plantEl.setAttribute('stage', cappedStage);
    } else if (plantEl) {
      plantEl.setAttribute('stage', 'ancient');
    }
    if (plantEl) {
      plantEl.setAttribute('due', 'none');
      plantEl.setAttribute('vigor', String(postState.vigor));
      if (postState.landmark) plantEl.setAttribute('landmark', '');
      else plantEl.removeAttribute('landmark');
    }

    const clear = document.createElement('div');
    clear.className = 'lgx-clear';
    clear.innerHTML = `
      <p class="lgx-clear__line is-veiled" id="lgx-line">${escapeHTML(line)}</p>
      <button class="lgx-clear__back is-veiled" id="lgx-back">${GARDEN_LINES.backToGarden}</button>
    `;
    lgxEl.appendChild(clear);

    // The line and the button appear only AFTER the motion has come to rest —
    // never during it (Bible §11.4: "never animate and ask to read at the same
    // time"). `reveal` un-veils everything held back for the Rest beat,
    // including a late-arriving afterglow line.
    let rested = false;
    let skipEl = null;
    const reveal = () => {
      if (rested) return;
      rested = true;
      for (const el of clear.querySelectorAll('.is-veiled')) el.classList.remove('is-veiled');
      // The skip overlay must never outlive its own purpose: once rested —
      // whether reached by a tap or by the animation simply finishing on
      // its own — it would otherwise sit over "Back to the garden" forever
      // (same z-index, later in DOM order) and silently swallow every tap.
      skipEl?.remove();
      skipEl = null;
    };

    let restTimer;
    if (!plantEl) {
      // Defensive only (no living biome behind this session): still the
      // chime, the haptic, the line — there is simply nothing to watch grow.
      gardenCue(cue, { tonic });
      restTimer = setTimeout(reveal, 460);
    } else if (reduce) {
      // Reduced motion is not a downgrade (§11.5): the plant is simply there,
      // bigger, with leaves it did not have — the CHANGE is the reward — with
      // the chime, the haptic, and the line. No wipe, no long tween.
      plantEl.classList.add('lgx-grow-plant', 'is-grown-still');
      gardenCue(cue, { tonic });
      restTimer = setTimeout(reveal, 460);
    } else {
      // The four movements (§11.4): anticipation → extension → settle → rest.
      // The tree rises out of the soil (a clip reveal from the base) and
      // settles with one organic overshoot; the chime + warm haptic land as it
      // releases into the extension; then everything is still, and the line
      // fades in.
      plantEl.classList.add('lgx-grow-plant', 'is-growing');
      setTimeout(() => gardenCue(cue, { tonic }), 150); // the thump + chime as growth begins
      restTimer = setTimeout(reveal, 1650);  // after the ~1.6s animation rests
    }

    // Skippable by tap from the SECOND viewing onward — never the first, which
    // is sacred (§11.2). A tap lands the tree and reveals the line at once.
    if (plantEl && !reduce) {
      hasSeenGardenGrowth(context.storage).then((seen) => {
        if (seen && !rested) {
          const skip = document.createElement('button');
          skip.className = 'lgx-skip';
          skip.setAttribute('aria-label', GARDEN_LINES.continueLabel);
          lgxEl.appendChild(skip);
          skipEl = skip;
          skip.addEventListener('click', () => {
            clearTimeout(restTimer);
            plantEl.classList.remove('is-growing');
            plantEl.classList.add('is-grown-still');
            reveal();
          }, { once: true });
        }
        markGardenGrowthSeen(context.storage).catch(() => { /* non-fatal */ });
      }).catch(() => { /* first-view default: play in full */ });
    } else {
      markGardenGrowthSeen(context.storage).catch(() => { /* non-fatal */ });
    }

    afterglow.then((extra) => {
      if (!extra) return;
      const p = document.createElement('p');
      p.className = 'hint lgx-clear__hint';
      p.textContent = extra;
      if (!rested) p.classList.add('is-veiled');
      clear.insertBefore(p, clear.querySelector('#lgx-back'));
    });

    clear.querySelector('#lgx-back').addEventListener('click', () => { location.hash = biomeHome; });
  }

  if (type === 'grow' && isFirstEver) arrivalPrelude(grow_attempt);
  else if (type === 'grow') grow_attempt();
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
