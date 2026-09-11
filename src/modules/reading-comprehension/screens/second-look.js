/**
 * second-look.js (screen) — the Reading Room's second look.
 *
 * Reviewing your own mistakes is the highest-yield hour in CAT
 * preparation, and until now the app had no way to spend it: a missed
 * question was explained once and never seen again. This run brings back
 * up to six questions the reader got wrong and has not since got right,
 * weighted towards the kind of question they are worst at.
 *
 * It is deliberately not a re-read of the passage. The learner gets the
 * question first, with the evidence paragraph one tap away — because
 * "go back to the text" is the habit being trained. Answering right
 * settles the question; answering wrong keeps it in the pool and names
 * the trap that caught them, from the corpus's own distractor analysis.
 *
 * Route: #/rc/second-look
 */

import { loadRCPassages } from '../../../core/content-loader/loader.js';
import { STORES } from '../../../core/storage/storage-adapter.js';
import { missedQuestions, readingWeakness, typeName } from '../../../world/curator.js';
import { EARN, verbalStars } from '../../../world/economy.js';
import { renderResult, formatClock } from '../../../world/screens/result.js';
import { mountBackdrop } from '../../../world/screens/backdrop.js';
import { loadWorld, loadWorldRecords, deriveWorldState, worldChangeLine, newlyBuildable } from '../../../world/state.js';
import { play, silenceWorld, startAmbience } from '../../../world/audio.js';
import { escapeHTML } from '../../../core/utils/format.js';

const KEYS = ['A', 'B', 'C', 'D', 'E'];
const SIZE = 6;

export async function renderSecondLook(outlet, { storage }) {
  document.documentElement.setAttribute('data-world', '');
  silenceWorld();

  let sessions = [], before = null;
  try {
    sessions = await storage.getAll(STORES.SESSIONS);
    before = await loadWorld(storage);
  } catch (err) {
    outlet.innerHTML = frameError(err.message);
    return;
  }

  const weakness = readingWeakness(sessions);
  const missed = missedQuestions(sessions, weakness).slice(0, SIZE);
  if (!missed.length) {
    outlet.innerHTML = frameEmpty();
    return;
  }

  /* Only the passages these questions came from are loaded. */
  let passages;
  try {
    passages = await loadRCPassages([...new Set(missed.map((m) => m.passage_id))]);
  } catch (err) {
    outlet.innerHTML = frameError(err.message);
    return;
  }

  const items = [];
  for (const m of missed) {
    const p = passages.get(m.passage_id);
    if (!p) continue;
    const q = (p.questions ?? []).find((x) => x.id === m.question_id);
    if (!q) continue;
    items.push({ q, passage: p, missedTimes: m.misses });
  }
  if (!items.length) { outlet.innerHTML = frameEmpty(); return; }

  const atmo = before.state.atmo;
  const targetSec = items.reduce((n, it) => n + (it.q.estimated_time_sec ?? 80), 0);

  outlet.innerHTML = `
    <section class="run run--reading-room">
      <canvas class="run__scene" id="run-scene" aria-hidden="true"></canvas>
      <div class="run__veil" aria-hidden="true"></div>
      <div class="run__bar">
        <a class="run__leave" href="#/world/place/reading-room" aria-label="Leave">×</a>
        <div class="run__where"><div class="run__place">The Reading Room</div><div class="run__what" id="run-what">The second look</div></div>
        <div class="run__pace" id="pace" hidden><span class="run__clock" id="clock">0:00</span></div>
      </div>
      <div class="run__track" id="track-wrap" hidden><i id="track" style="width:0%"></i></div>
      <div class="run__body" id="body"></div>
    </section>`;

  const backdrop = mountBackdrop(outlet.querySelector('#run-scene'), 'reading-room', before.state, atmo, { still: true });
  const onHash = () => { backdrop?.destroy(); window.removeEventListener('hashchange', onHash); };
  window.addEventListener('hashchange', onHash);
  startAmbience('reading-room', atmo);

  const body = outlet.querySelector('#body');
  const fromPassages = new Set(items.map((it) => it.passage.meta.id)).size;

  body.innerHTML = `
    <div class="brief is-veiled">
      <p class="brief__eyebrow">Reading comprehension</p>
      <h1 class="brief__title">The second look</h1>
      <p class="brief__line">${items.length} question${items.length === 1 ? '' : 's'} that got away, from ${fromPassages} passage${fromPassages === 1 ? '' : 's'}. The evidence is one tap away — use it. Getting one right settles it for good.</p>
      <div class="brief__facts">
        <span class="brief__fact">${items.length} questions</span>
        <span class="brief__fact">${Math.round(targetSec / 60)} min target</span>
        ${weakness.weakest ? `<span class="brief__fact is-shaky">${escapeHTML(typeName(weakness.weakest))}</span>` : ''}
      </div>
      <div class="brief__stars">
        <span><b>★★★</b> three quarters right, inside the time</span>
        <span><b>★★</b> three quarters right</span>
        <span><b>★</b> half right</span>
      </div>
      <button class="g-cta" id="begin">Look again<span class="arrow" aria-hidden="true">→</span></button>
    </div>`;
  requestAnimationFrame(() => body.querySelector('.brief')?.classList.add('is-in'));
  body.querySelector('#begin').addEventListener('click', () => { play('open'); run(); });

  /* ------------------------------------------------------------------ */

  function run() {
    outlet.querySelector('#pace').hidden = false;
    outlet.querySelector('#track-wrap').hidden = false;
    const what = outlet.querySelector('#run-what');
    const clock = outlet.querySelector('#clock');
    const track = outlet.querySelector('#track');
    const startedAt = Date.now();
    let index = 0, locked = false, alive = true;
    const answers = [];

    const tick = () => {
      if (!alive || !clock.isConnected) return;
      clock.textContent = formatClock(Date.now() - startedAt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const cleanup = () => { alive = false; window.removeEventListener('hashchange', cleanup); };
    window.addEventListener('hashchange', cleanup);

    function show() {
      const it = items[index];
      const q = it.q;
      locked = false;
      what.textContent = `${index + 1} of ${items.length}`;
      track.style.width = `${Math.round((index / items.length) * 100)}%`;
      const anchorId = q.explanation?.passage_anchor;
      const para = (it.passage.passage.paragraphs ?? []).find((p) => p.id === anchorId);
      body.innerHTML = `
        <div class="vround look" id="card">
          <p class="vround__tag is-shaky">${escapeHTML(typeName(q.type))}${it.missedTimes > 1 ? ` · missed ${it.missedTimes} times` : ''}</p>
          <p class="look__from">${escapeHTML(it.passage.passage.title)}</p>
          <p class="look__stem">${escapeHTML(q.stem)}</p>
          <div class="vround__options" id="opts">
            ${KEYS.slice(0, 4).map((k, i) => `<button class="vopt" data-k="${k}"><span class="key" aria-hidden="true">${KEYS[i]}</span><span>${escapeHTML(q.options[k] ?? '')}</span></button>`).join('')}
          </div>
          ${para ? `<details class="look__evidence"><summary>Look at the text</summary><p>${escapeHTML(para.text)}</p></details>` : ''}
          <div class="vround__feedback" id="feedback"></div>
          <button class="g-btn g-btn--primary look__next" id="next" hidden>${index === items.length - 1 ? 'See the result' : 'Next question'}</button>
        </div>`;
      requestAnimationFrame(() => body.querySelector('#card')?.classList.add('is-in'));
      body.querySelector('.look__evidence')?.addEventListener('toggle', (e) => { if (e.currentTarget.open) play('page'); });
      body.querySelector('#opts').addEventListener('click', (e) => {
        const btn = e.target.closest('.vopt');
        if (!btn || locked) return;
        locked = true;
        const chosen = btn.dataset.k;
        const correct = chosen === q.correct;
        answers.push({ question_id: q.id, passage_id: it.passage.meta.id, type: q.type ?? null, chosen, is_correct: correct, time_ms: 0 });
        for (const b of body.querySelectorAll('.vopt')) {
          b.disabled = true;
          if (b.dataset.k === q.correct) b.classList.add('is-correct');
          else if (b.dataset.k === chosen) b.classList.add('is-wrong');
          else b.classList.add('is-dim');
        }
        play(correct ? 'correct' : 'wrong');
        body.querySelector('#card').classList.add(correct ? 'is-right' : 'is-wrong');
        const trap = (q.explanation?.distractors ?? []).find((d) => d.option === chosen);
        const fb = body.querySelector('#feedback');
        fb.innerHTML = correct
          ? `<p class="look__why">${escapeHTML(q.explanation?.correct_reasoning ?? '')}</p>
             ${q.explanation?.reading_habit ? `<p class="look__habit">${escapeHTML(q.explanation.reading_habit)}</p>` : ''}`
          : `${trap ? `<p class="look__trap"><b>${escapeHTML(String(trap.trap_type ?? '').replace(/_/g, ' '))}</b> — ${escapeHTML(trap.why_wrong ?? '')}</p>` : ''}
             <p class="look__why">${escapeHTML(q.explanation?.correct_reasoning ?? '')}</p>`;
        const next = body.querySelector('#next');
        next.hidden = false;
        next.addEventListener('click', () => {
          play('tap');
          index += 1;
          if (index >= items.length) { cleanup(); finish(); } else show();
        }, { once: true });
        // Open the evidence automatically on a miss: the answer is in the text.
        if (!correct) body.querySelector('.look__evidence')?.setAttribute('open', '');
        // …and put the explanation in front of the learner, not below the fold.
        requestAnimationFrame(() => fb.scrollIntoView({ block: 'center', behavior: 'smooth' }));
      });
    }

    async function finish() {
      const finishedAt = Date.now();
      const correct = answers.filter((a) => a.is_correct).length;
      const total = answers.length;
      const record = {
        id: `rc2-${new Date(startedAt).toISOString().replace(/[:.]/g, '-')}`,
        module: 'rc2',
        started_at: new Date(startedAt).toISOString(),
        finished_at: new Date(finishedAt).toISOString(),
        duration_ms: finishedAt - startedAt,
        score: { correct, total, attempted: total, accuracy: total ? correct / total : 0 },
        answers,
      };
      const res = verbalStars(record, targetSec);
      const earned = EARN.secondLook(res.stars, correct, res.flawless);
      try { await storage.put(STORES.SESSIONS, record); } catch (err) { console.error('[CAT OS] second look save failed', err); }

      let worldLine = '', unlocked = [];
      try {
        const records = await loadWorldRecords(storage);
        const after = deriveWorldState(before.content, records);
        worldLine = worldChangeLine('reading-room', before.state, after);
        unlocked = newlyBuildable(before.state, after);
      } catch { /* the facts still show */ }

      const settled = answers.filter((a) => a.is_correct).length;
      renderResult(outlet, {
        region: 'reading-room',
        eyebrow: 'The Reading Room · The second look',
        title: res.stars === 3 ? 'Settled' : 'The second look',
        result: res,
        verdict: settled === total
          ? 'Every one of them settled. That is the hour that moves a percentile.'
          : `${settled} of ${total} settled. The rest come back — that is the point of them.`,
        facts: [
          { label: 'Right', value: `${correct}/${total}`, good: res.accuracy >= 0.75 },
          { label: 'Settled', value: String(settled), good: settled > 0 },
          { label: 'Time', value: formatClock(record.duration_ms), good: res.inTime },
        ],
        earned,
        worldLine,
        unlocked,
        actions: [
          { label: 'Back to the Reading Room', href: '#/world/place/reading-room', primary: true },
          { label: 'The valley', href: '#/world' },
        ],
      });
    }

    show();
  }
}

function frameError(message) {
  return `<section class="run"><div class="run__body"><div class="brief"><h1 class="brief__title">The second look will not open</h1><p class="brief__line">${escapeHTML(message)}</p><a class="g-btn" href="#/world/place/reading-room">Back to the Reading Room</a></div></div></section>`;
}

function frameEmpty() {
  return `<section class="run"><div class="run__body"><div class="brief">
    <p class="brief__eyebrow">Reading comprehension</p>
    <h1 class="brief__title">Nothing got away</h1>
    <p class="brief__line">Every question you have missed, you have since answered right. Read a new passage and the second look will fill again.</p>
    <a class="g-cta" href="#/world/place/reading-room">Back to the Reading Room<span class="arrow" aria-hidden="true">→</span></a>
  </div></div></section>`;
}
