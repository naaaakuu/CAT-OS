/**
 * screen.js — one duel, from "PLAY" to somebody in the pond.
 *
 * The screen is two things stacked for a phone held in one hand: the little
 * theatre on top (arena.js), and below it, in reach of the thumb, a paper sheet
 * holding the current move. Tap and the word flies, the rope jumps, the next
 * one is already there. Nothing asks to be dismissed unless you got it wrong,
 * and then it waits, because that is the moment worth reading.
 */

import { STORES } from '../core/storage/storage-adapter.js';
import { escapeHTML as esc } from '../core/utils/format.js';
import { loadWorldRecords } from '../world/state.js';
import { play, silenceWorld, holdMusic, startDuelMusic, stopDuelMusic, setDuelHeat, hushDuelMusic } from '../world/audio.js';
import { PET_BY_ID } from '../pets/pets.js';
import { composeDuel, saveWordFeeds, saveBigMove } from './compose.js';
import { loadMuddles, liner } from './content.js';
import { Arena, arenaHTML, muddleSprite } from './arena.js';
import { petFigure } from '../pets/sprite.js';
import { BOUTS, DUEL, ROPE_END, applyRope, bigEffect, boutOf, castOf, driftOf, duelsIn, isBout, laurelsFor, nearMiss, newRope, nextBout, quickEffect, readEffect, settleRope, troublemakerOf, winTitle } from './model.js';
import { ladderFrom, hideoutFor, homeName, CHASE_LAURELS } from './chase.js';
import { evidenceFrom } from '../pets/seals.js';
import { gradeFor } from './letters.js';
import { buzz, reduced, throwWord } from './fx.js';
import { ensureDuelStyle } from './style.js';
import { PLAYERS } from '../play/players.js';
import { openModal, closeModal } from '../ui/modal.js';
import { focusContent } from '../ui/focus.js';

const LEAVE_COST = 8;
/* A streak is praised in the language the game teaches. */
const PRAISE = { 3: 'Astute!', 5: 'Trenchant!', 7: 'Perspicacious!', 9: 'Sagacious!', 12: 'Unimpeachable!' };
const FLAME = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2c2.6 3.6 6.6 6.4 6.6 11.4A6.6 6.6 0 0 1 5.4 13.4c0-2.8 1.4-4.8 2.9-6.3.2 1.7 1 3.1 2.2 3.8-.5-3.3.3-6.3 1.5-8.9z" fill="#F2A23C" stroke="#4a2a12" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 11.6c1.4 1.7 2.8 2.9 2.8 4.9a2.8 2.8 0 0 1-5.6 0c0-1.6 1-3.1 2.8-4.9z" fill="#FFD978"/></svg>';
const BIG_NAMES = { chain: 'Couple the train', stray: 'Find the stray', gap: 'Fill the gap', seat: 'Take a seat', point: 'Hit the point', read: 'The long read' };
const BIG_TEACH = { chain: 'Tap the sentences into the order the writer meant.', stray: 'One sentence does not belong here. Find it.', gap: 'The paragraph has a hole in it. Try a sentence in the gap.', seat: 'A sentence has lost its place. Tap where it fits.', point: 'Read it, then pick the one line that says it all.', read: 'Read the passage properly. The questions come after, and you can always look back.' };
const BIG_MODULE = { chain: 'pj', stray: 'ooo', gap: 'pc', seat: 'sp', point: 'ps' };

export async function renderDuel(outlet, { storage }) {
  const arrivedAt = location.hash;
  outlet.innerHTML = '<section class="dl dl--loading"><p class="dl-wait">The Muddles are grabbing the rope…</p></section>';
  await ensureDuelStyle();
  silenceWorld(); holdMusic(true);

  const now = Date.now();
  const records = await loadWorldRecords(storage);
  const duels = duelsIn(records.learning);
  const ladder = ladderFrom(records);
  const first = duels.length === 0;
  const arena = ladder.arena;
  const seed = `duel:${now}`;
  /* Who is on the other end of the rope. A stop decides how hard they pull;
     the Muddle decides what the duel is made of. `?vs=` is a challenge from the
     bill, otherwise PLAY chooses (model.js nextBout). */
  const query = new URLSearchParams(arrivedAt.split('?')[1] ?? '');
  const bout = first ? BOUTS[0] : isBout(query.get('vs')) ? boutOf(query.get('vs')) : nextBout(duels, now);
  const tally = castOf(duels);
  const meeting = !first && !tally.get(bout.id).fought;
  const trouble = troublemakerOf(duels, now);
  const bounty = !first && !!trouble?.open && trouble.bout.id === bout.id;

  let comp, cast;
  try {
    [comp, cast] = await Promise.all([composeDuel(storage, { arena, bout, seed, first, now }), loadMuddles()]);
  } catch (err) {
    console.error('[CAT OS] duel could not be set up', err);
    outlet.innerHTML = `<section class="dl dl--loading"><p class="dl-wait">The rope is tangled. Check your connection and try again.</p><a class="dl-btn" href="#/world">Back to the village</a></section>`;
    return;
  }
  if (location.hash !== arrivedAt) return;
  if (!comp.moves.length) {
    outlet.innerHTML = `<section class="dl dl--loading"><p class="dl-wait">The word lists are still on their way. Give it a moment.</p><a class="dl-btn" href="#/world">Back to the village</a></section>`;
    return;
  }

  const muddle = cast.get(bout.id);
  const say = liner(muddle, Math.random());
  const pet = PET_BY_ID.get(bout.friend);
  const friendStage = comp.world.state.pets.pets.find((p) => p.id === bout.friend)?.stage ?? 0;
  const drift = driftOf(arena, comp.scale);

  outlet.innerHTML = `
    <section class="dl" data-arena="${arena.id}" data-muddle="${bout.id}">
      <div class="dl-stagewrap">
        ${arenaHTML({ friend: bout.friend, friendStage, muddle: bout.id, backdrop: arena.backdrop ?? arena.friend })}
        <button class="dl-quit" id="quit" aria-label="Leave the duel"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg></button>
        <div class="dl-streak" id="streak" hidden></div>
        <div class="dl-ticks" id="ticks" aria-hidden="true">${comp.moves.map((m) => `<i class="${m.kind === 'big' ? 'is-big' : ''}"></i>`).join('')}</div>
      </div>
      <div class="dl-sheet" id="sheet"></div>
      <div class="dl-vs" id="vs" hidden></div>
      <div class="dl-confirm" id="confirm" hidden></div>
      <div class="fx-layer" id="fxlayer" aria-hidden="true"></div>
    </section>`;

  const root = outlet.querySelector('.dl');
  const sheet = outlet.querySelector('#sheet');
  const streakEl = outlet.querySelector('#streak');
  const fxLayer = outlet.querySelector('#fxlayer');
  const tickEls = [...outlet.querySelectorAll('#ticks i')];
  const stage = new Arena(outlet.querySelector('#arena'), { friend: bout.friend, muddle: bout.id });

  const s = newRope({ start: first ? 18 : 0 });
  const startedAt = Date.now();
  let moveIndex = -1, alive = true, driftOn = false, lowSaid = false, bigPaid = 0, lowest = 0, newWords = 0, finishing = false;
  const decodeAnswers = [];
  const misses = [];
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); if (alive) fn(); }, ms); timers.add(t); return t; };

  stage.rope = s.rope;

  /* ---- The Muddle leans on the rope between answers ---- */
  let lastTick = Date.now(), nextHeave = Date.now() + 13000, ropeSecs = 0;
  const drifter = setInterval(() => {
    const t = Date.now(), dt = (t - lastTick) / 1000; lastTick = t;
    if (!alive || !driftOn || document.hidden || s.over) return;
    ropeSecs += Math.min(dt, 1);
    applyRope(s, -drift * dt);
    if (first) s.rope = Math.max(s.rope, -60);
    if (t >= nextHeave) {
      nextHeave = t + (DUEL.HEAVE_EVERY[0] + Math.random() * (DUEL.HEAVE_EVERY[1] - DUEL.HEAVE_EVERY[0])) * 1000;
      applyRope(s, -DUEL.HEAVE); stage.yank('them', 0.8); play('heave');
    }
    stage.rope = s.rope;
    lowest = Math.min(lowest, s.rope);
    if (ropeSecs > DUEL.MAX_SECONDS) settleRope(s);
    setDuelHeat(Math.abs(s.rope) / ROPE_END);
    if (s.over) finish();
  }, 120);

  function cleanup({ toResult = false } = {}) {
    alive = false;
    clearInterval(drifter);
    for (const t of timers) clearTimeout(t);
    timers.clear();
    stage.destroy();
    stopDuelMusic();
    // The village song comes back once the fanfare has had its say, or at once on the way home.
    holdMusic(false, { resumeIn: toResult ? 2.4 : 0.3 });
    window.__catosBack = outerBack;
    window.removeEventListener('hashchange', onHash);
  }
  const onHash = () => { if (location.hash !== arrivedAt) cleanup(); };
  window.addEventListener('hashchange', onHash);

  /* ---- Leaving ----
     Android's Back asks the same question as the X, so nobody can drop the
     rope by accident, or for free. */
  const quitBtn = outlet.querySelector('#quit');
  let asking = false;
  function askLeave() {
    if (asking || s.over) return;
    if (s.right + s.wrong < 2) { cleanup(); location.hash = '#/world'; return; }
    asking = true;
    const box = outlet.querySelector('#confirm');
    box.hidden = false;
    box.innerHTML = `<div class="dl-confirm__card"><h2>Let go of the rope?</h2><p>${esc(muddle.name)} keeps it, and you lose ${LEAVE_COST} laurels.</p><button class="dl-btn dl-btn--go" data-stay>Keep pulling</button><button class="dl-btn dl-btn--plain" data-leave>Leave</button></div>`;
    const card = box.querySelector('.dl-confirm__card');
    const wasOn = driftOn; driftOn = false;
    const stay = () => { if (!asking) return; asking = false; closeModal(card); box.hidden = true; driftOn = wasOn; lastTick = Date.now(); };
    openModal(card, stay, { returnTo: quitBtn });
    card.querySelector('[data-stay]').addEventListener('click', stay);
    card.querySelector('[data-leave]').addEventListener('click', async () => {
      asking = false; closeModal(card); box.hidden = true; s.over = true; s.won = false;
      await saveDuel({ forfeited: true });
      cleanup();
      location.hash = '#/world';
    });
  }
  quitBtn.addEventListener('click', askLeave);
  const outerBack = window.__catosBack;
  window.__catosBack = () => { if (outerBack?.()) return true; if (finishing) return true; askLeave(); return true; };

  /* ---- Streak ---- */
  function showStreak() {
    if (s.combo < 2) { streakEl.hidden = true; return; }
    streakEl.hidden = false;
    streakEl.innerHTML = `${FLAME}<b>${s.combo}</b>`;
    streakEl.classList.toggle('is-hot', s.combo >= 5);
    streakEl.classList.remove('is-pop'); void streakEl.offsetWidth; streakEl.classList.add('is-pop');
  }

  /* ---- Answering ---- */
  function afterAnswer(correct, delta, fromEl, label) {
    applyRope(s, delta, { correct });
    if (first) s.rope = Math.max(s.rope, -60); // the first duel is a promise: you win it
    stage.rope = s.rope;
    lowest = Math.min(lowest, s.rope);
    stage.popNumber(Math.round(delta));
    showStreak();
    setDuelHeat(Math.abs(s.rope) / ROPE_END);
    if (correct) {
      const power = Math.min(1.5, 0.75 + s.combo * 0.12);
      stage.yank('me', power);
      // One thing speaks at a time: the winning pull is finish()'s to play, and praise follows the yank instead of landing on it.
      if (!s.over) play('yank', { pitch: Math.min(6, s.combo) });
      buzz(s.combo >= 5 ? [18, 30, 18] : 16);
      if (fromEl && label) {
        const r = fromEl.getBoundingClientRect(), to = stage.ropePointOnScreen();
        throwWord(fxLayer, label, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, to);
      }
      if (PRAISE[s.combo]) { if (!s.over) play('combo', { pitch: s.combo, delay: 0.14 }); stage.praise(PRAISE[s.combo]); }
      if (s.rope >= 70 && !lowSaid && !s.over) { lowSaid = true; stage.say(say('low')); }
      else if (!s.over && Math.random() < 0.34) stage.say(say('hit'), 1800);
    } else {
      stage.yank('them', 1.1);
      if (!s.over) play('heave');
      buzz([28, 40, 28]);
      if (!s.over) stage.say(say('gloat'));
    }
    if (s.over) { finish(); return true; }
    return false;
  }

  function nextMove() {
    if (!alive) return;
    moveIndex += 1;
    tickEls.forEach((el, i) => { el.classList.toggle('is-now', i === moveIndex); el.classList.toggle('is-done', i < moveIndex); });
    if (moveIndex >= comp.moves.length) { settleRope(s); finish(); return; }
    const m = comp.moves[moveIndex];
    if (m.kind === 'big') playBig(m.big); else playQuick(m);
  }

  /* ---- A word or a line to decode ---- */
  function playQuick(m) {
    const feed = m.feed ? comp.feeds[m.feed] : null;
    const q = m.q ?? feed.current;
    const shownAt = Date.now();
    feed?.markShown();
    root.classList.remove('is-big');
    stage.setCompact(false);
    const ask = q.kind === 'decode' ? 'In plain English?' : q.ask;
    const twin = m.kind === 'twin' && q.options.length <= 3 && q.options.every((o) => o.text.length < 18);
    const head = q.kind === 'decode'
      ? `<blockquote class="q__quote">${esc(q.stem)}</blockquote>`
      : q.wordShown ? `<h2 class="q__word">${esc(q.stem)}</h2>` : `<p class="q__meaning">${esc(q.stem)}</p>`;
    sheet.innerHTML = `
      <div class="q q--${q.kind === 'decode' ? 'decode' : 'word'}">
        ${first && moveIndex === 0 ? '<p class="q__hint">Tap what it means. Right answers pull the rope.</p>' : ''}
        <div class="q__head"><p class="q__ask">${esc(ask)}</p>${head}</div>
        <div class="q__opts ${twin ? 'q__opts--pair' : ''}">
          ${q.options.map((o, i) => `<button class="opt" data-i="${i}" style="animation-delay:${i * 45}ms">${esc(o.text)}</button>`).join('')}
        </div>
        <div class="q__fix" id="fix" hidden></div>
      </div>`;
    sheet.scrollTop = 0;
    focusContent(sheet.querySelector('.q__head'));
    driftOn = true; lastTick = Date.now();
    let locked = false;
    sheet.querySelector('.q__opts').addEventListener('click', (e) => {
      const btn = e.target.closest('.opt');
      if (!btn || locked || Date.now() - shownAt < 260) return;
      locked = true; driftOn = false;
      const i = Number(btn.dataset.i);
      const ms = Date.now() - shownAt;
      let correct, rightIndex;
      if (feed) {
        const pickInfo = feed.picks[feed.index];
        const v = feed.answer(i); correct = v.correct; rightIndex = v.correctIndex;
        if (correct && pickInfo?.status === 'new') newWords += 1;
      }
      else {
        correct = !!q.options[i].correct; rightIndex = q.options.findIndex((o) => o.correct);
        decodeAnswers.push({ item_id: q.item.id, kind: 'decode', is_correct: correct, time_ms: ms });
      }
      sheet.querySelectorAll('.opt').forEach((b, j) => { b.disabled = true; b.classList.add(j === rightIndex ? 'is-right' : j === i ? 'is-wrong' : 'is-dim'); });
      const delta = quickEffect(correct, s.combo, ms);
      const ended = afterAnswer(correct, delta, btn, correct ? (q.options[rightIndex].text) : '');
      feed?.next();
      if (ended) return;
      if (correct) { later(nextMove, reduced() ? 260 : 460); return; }
      // Wrong: this is the moment to learn it, so the game waits.
      const entry = q.entry;
      const fix = sheet.querySelector('#fix');
      let head2 = '', body = '';
      if (q.kind === 'decode') { head2 = q.options[rightIndex].text; body = q.why; misses.push({ head: q.stem, body: `${q.options[rightIndex].text} ${q.why ?? ''}`.trim() }); }
      else if (q.kind === 'twin' || q.kind === 'twin-meaning') { head2 = q.options[rightIndex].text; body = entry.explanation ?? ''; misses.push({ head: (entry.words ?? []).join(' / '), body: entry.explanation ?? '' }); }
      else { head2 = entry.word; body = entry.meaning; misses.push({ head: entry.word, body: `${entry.meaning}${entry.synonyms?.length ? ` Like: ${entry.synonyms.slice(0, 3).join(', ').toLowerCase()}.` : ''}` }); }
      fix.hidden = false;
      fix.innerHTML = `<p class="q__fixline"><b>${esc(head2)}</b>${body ? `<span>${esc(body)}</span>` : ''}</p><button class="dl-btn dl-btn--go" id="cont">Got it</button>`;
      const go = () => { if (!alive) return; nextMove(); };
      fix.querySelector('#cont').addEventListener('click', go, { once: true });
      fix.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  /* ---- A big move: the Muddle stops to read too ---- */
  function playBig({ type, item }) {
    driftOn = false;
    root.classList.add('is-big');
    stage.setCompact(true);
    bigPaid = 0;
    const isRead = type === 'read';
    const brink = ROPE_END - 3;
    const sessions = comp.world.records.sessions ?? [];
    const firstOfType = isRead ? !sessions.some((x) => x && !x.module && x.passage_id) : !sessions.some((x) => x?.module === BIG_MODULE[type]);
    sheet.innerHTML = `<div class="dl-bigsign"><p>${esc(BIG_NAMES[type])}</p><h2>${isRead ? 'Stop and read' : 'Big move'}</h2><span>${esc(firstOfType || (isRead && meeting) ? BIG_TEACH[type] : `${muddle.name} stops to read too. Take your time.`)}</span><button class="dl-btn dl-btn--go" id="biggo">Go</button></div>`;
    play('vs');
    const begin = () => {
      if (!alive) return;
      sheet.innerHTML = '';
      const host = document.createElement('div'); sheet.appendChild(host); sheet.scrollTop = 0;
      let doneShown = false;
      const started = Date.now();
      // Reading has the air to itself: the song drops away for the passage and comes back, quietly, for the questions.
      if (isRead) hushDuelMusic(0);
      PLAYERS[type](host, item, {
        guided: true,
        onRead: ({ ms, words }) => {
          hushDuelMusic(0.5);
          sheet.scrollTop = 0;
          // Faster than anybody reads: the Skimmer approves, which is the joke and the warning.
          const line = ms < words * 110 ? say('skim') : '';
          if (line) stage.say(line, 2600);
        },
        onStep: ({ correct, index }) => {
          if (isRead) {
            // A question of a passage is a real answer: it counts, it streaks, and it pulls hard.
            // The rope waits at the brink until the last one, so a passage is always finished.
            const d = readEffect(correct, s.combo);
            const to = Math.max(-brink, Math.min(brink, s.rope + d));
            applyRope(s, to - s.rope, { correct });
            stage.rope = s.rope;
            lowest = Math.min(lowest, s.rope);
            stage.popNumber(d);
            stage.yank(correct ? 'me' : 'them', correct ? 1.1 : 1);
            play(correct ? 'yank' : 'heave', { pitch: Math.min(6, s.combo) });
            buzz(correct ? 16 : [28, 40, 28]);
            showStreak();
            setDuelHeat(Math.abs(s.rope) / ROPE_END);
            if (!correct) stage.say(say('gloat'));
            return;
          }
          const d = correct ? 7 : -6;
          bigPaid += d;
          applyRope(s, d, {});
          stage.rope = s.rope;
          stage.yank(correct ? 'me' : 'them', 0.7);
          // The paragraph makes its own sound for the tap; the rope answers a beat later.
          play(correct ? 'yank' : 'heave', { pitch: index ?? 0, delay: 0.1 });
          buzz(correct ? 14 : [20, 30, 20]);
          if (s.over) finish();
        },
        onDone: (o) => {
          if (doneShown || !alive) return;
          doneShown = true;
          const correct = o.correct;
          if (isRead) {
            hushDuelMusic(1);
            // Let go of the brink: a rope held there goes over now.
            if (Math.abs(s.rope) >= brink) applyRope(s, Math.sign(s.rope) * 8, {});
            stage.rope = s.rope;
            if (correct && !s.over) play('combo', { pitch: 8, delay: 0.12 });
            misses.push(...(o.wrongs ?? []));
          } else {
            const eff = Math.max(-12, bigEffect(o.share ?? 0) - bigPaid);
            applyRope(s, eff, { correct });
            stage.rope = s.rope;
            stage.popNumber(Math.round(bigEffect(o.share ?? 0)));
            stage.yank(correct ? 'me' : 'them', 1.5);
            if (!s.over) play(correct ? 'combo' : 'heave', { pitch: 8, delay: 0.12 });
            buzz(correct ? [20, 40, 40] : [40, 40, 40]);
            showStreak();
            if (!correct) misses.push({ head: item.meta?.title ?? item.title ?? BIG_NAMES[type], body: o.teach ?? '' });
          }
          lowest = Math.min(lowest, s.rope);
          saveBigMove(storage, type, item, { ...o, started }, { inDuel: true });
          if (s.over) { finish(); return; }
          const panel = document.createElement('div');
          panel.className = `dl-donepanel ${correct ? 'is-good' : 'is-miss'}`;
          const verdict = isRead ? `${o.right} of ${o.total}${correct ? '. Every one.' : o.right ? '.' : '. It got away.'}` : correct ? 'Beautiful.' : 'Not quite.';
          panel.innerHTML = `<p class="dl-donepanel__v">${esc(verdict)}</p>${o.teach ? `<p class="dl-donepanel__t">${esc(o.teach)}</p>` : ''}<button class="dl-btn dl-btn--go" id="bigcont">Back to the rope</button>`;
          host.appendChild(panel);
          panel.querySelector('#bigcont').addEventListener('click', () => { nextMove(); }, { once: true });
          later(() => panel.scrollIntoView({ block: 'end', behavior: 'smooth' }), 60);
        },
      });
      focusContent(host.querySelector('.pl__ask'));
    };
    sheet.querySelector('#biggo').addEventListener('click', begin, { once: true });
  }

  /* ---- The end ---- */
  async function finish() {
    if (finishing) return;
    finishing = true;
    driftOn = false;
    clearInterval(drifter);
    settleRope(s);
    if (first) s.won = true;
    sheet.classList.add('is-done');
    stage.say(say(s.won ? 'lose' : 'win'), 2600);
    play(s.won ? 'bigyank' : 'heave');
    buzz(s.won ? [30, 50, 60, 50, 90] : [60, 60, 120]);
    await saveDuel();
    await stage.ko(s.won);
    if (!alive && location.hash !== arrivedAt) return;
    play('splash');
    stopDuelMusic();
    later(async () => {
      const { renderDuelResult } = await import('./result.js');
      cleanup({ toResult: true });
      if (location.hash === arrivedAt) renderDuelResult(outlet, { storage, summary });
    }, reduced() ? 200 : 650);
  }

  let summary = null, saved = false;
  async function saveDuel({ forfeited = false } = {}) {
    if (saved) return;
    saved = true;
    const finishedAt = Date.now();
    await saveWordFeeds(storage, comp.feeds, comp.ledger);
    const total = s.right + s.wrong;
    const accuracy = total ? s.right / total : 0;
    const beforeLad = ladder;
    const paidDouble = bounty && !!s.won && !forfeited;
    const delta = forfeited ? -LEAVE_COST : laurelsFor({ won: s.won, accuracy, rope: s.rope, first, bounty: paidDouble });
    const lettersSoFar = duels.filter((d) => d.letter).length;
    const letter = s.won ? { id: `letter-${startedAt}`, grade: gradeFor(seed, lettersSoFar, { first }) } : null;
    const record = {
      id: `duel-${new Date(startedAt).toISOString().replace(/[:.]/g, '-')}`, kind: 'duel', module: 'duel',
      arena: arena.n, muddle: bout.id, friend: bout.friend, ...(paidDouble ? { bounty: true } : {}),
      started_at: new Date(startedAt).toISOString(), finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - startedAt,
      won: !!s.won, rope: Math.round(s.rope), best_combo: s.bestCombo, first, forfeited,
      laurels: delta, letter,
      answers: decodeAnswers,
      score: { correct: s.right, total, accuracy },
      stars: s.won ? (accuracy >= 0.85 ? 3 : 2) : accuracy >= 0.5 ? 1 : 0,
    };
    try { await storage.put(STORES.LEARNING, record); } catch (err) { console.error('[CAT OS] duel could not be saved', err); }
    const afterDuels = [...duels, record];
    const afterLad = ladderFrom({ ...records, learning: [...records.learning, record] });
    const mine = castOf(afterDuels).get(bout.id);
    const ribbon = s.won && mine.ribbon && mine.ribbon.id !== tally.get(bout.id).ribbon?.id ? mine.ribbon : null;
    const firstDunk = !!s.won && !first && tally.get(bout.id).wins === 0;
    summary = { record, won: !!s.won, delta, before: beforeLad, after: afterLad, muddle, friend: bout.friend, friendStage, arena, bout, bounty: paidDouble, ribbon, firstDunk, tally: mine, next: nextBout(afterDuels, finishedAt), misses, right: s.right, wrong: s.wrong, bestCombo: s.bestCombo, newBest: s.bestCombo >= 3 && s.bestCombo > duels.reduce((n, d) => Math.max(n, d.best_combo ?? 0), 0), newWords, near: nearMiss({ won: !!s.won, rope: s.rope }), title: s.won ? winTitle({ wrong: s.wrong, lowest, right: s.right }) : null, lowest, loseLine: say('win'), winLine: say('lose'), first, letter, newArena: afterLad.arena.n > beforeLad.arena.n ? afterLad.arena : null, chase: s.won ? { home: hideoutFor(bout.id, evidenceFrom(records), finishedAt), name: homeName(hideoutFor(bout.id, evidenceFrom(records), finishedAt)), laurels: CHASE_LAURELS } : null };
  }

  /* ---- Curtain up ---- */
  startDuelMusic(arena.n);
  stage.say(say('enter'), first ? 3200 : 2600);
  if (first) { later(nextMove, 500); return; }

  // "Play again" goes straight back on the rope: the wait between goes is where people leave.
  // A Muddle you have never met still gets its playbill: that is where the new game is explained.
  if (query.has('again') && !meeting) { later(nextMove, reduced() ? 100 : 420); return; }

  /* The playbill: who is on tonight, and the bad habit they have come to do. */
  const bill = outlet.querySelector('#vs');
  bill.hidden = false;
  bill.innerHTML = `
    <article class="pb">
      <p class="pb__where">Tonight at ${esc(arena.name)}</p>
      <div class="pb__fig">${muddleSprite(bout.id, { size: 150 })}</div>
      <h2 class="pb__name">${esc(muddle.name)}</h2>
      ${muddle.title ? `<p class="pb__title">${esc(muddle.title)}</p>` : ''}
      <p class="pb__habit">${esc(muddle.habit ?? '')}</p>
      ${meeting ? `<p class="pb__new"><i>New game</i><b>${esc(bout.game)}</b><span>${esc(bout.line)}</span></p>` : `<p class="pb__skill">${esc(bout.skill)}</p>`}
      ${bounty ? '<p class="pb__bounty">Today\'s troublemaker. Win for double laurels.</p>' : ''}
      <div class="pb__rule" aria-hidden="true"></div>
      <p class="pb__with"><span class="pb__friend">${petFigure(bout.friend, { size: 54, stage: friendStage })}</span>Pulling for you: <b>${esc(pet?.name ?? '')}</b></p>
      <button class="dl-btn dl-btn--go" id="billgo">Grab the rope</button>
      <a class="pb__other" href="#/bill">Pick another Muddle</a>
    </article>`;
  play('vs');
  let gone = false;
  const start = () => { if (gone || !alive) return; gone = true; bill.classList.add('is-out'); later(() => { bill.hidden = true; nextMove(); }, reduced() ? 0 : 260); };
  bill.querySelector('#billgo').addEventListener('click', start, { once: true });
}

