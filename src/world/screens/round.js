/**
 * round.js (screen) — a word round in the Meadow, the Mirror Pond or the
 * Thicket. The learner never picks a file: the curator assembles twelve
 * words from wherever they are — due for review, recently slipped, or
 * never met — across the whole corpus, and tells the learner in one line
 * what this handful is.
 *
 * The run itself: one word at a time on the place's own dimmed scene, a
 * pace ring per word, a combo that grows while you are right, the verdict
 * in place, and the star reveal at the end. Speed matters (the ring),
 * accuracy matters more (the stars), and every answer changes what the
 * place looks like next time.
 *
 * Routes: #/round/:region            the curator chooses
 *         #/round/:region/:field     one named field (the shelves)
 */

import { loadWorld, loadWorldRecords, deriveWorldState, petChangeLine, newlyAffordable } from '../state.js';
import { loadField, loadLedger, pickRound, LexRound, saveRound, TARGET_MS, ROUND_SIZE, listFields, loadContext } from '../lexicon.js';
import { composeRound } from '../curator.js';
import { newlyFinished } from '../collections.js';
import { regionBySlug } from '../regions.js';
import { play, silenceWorld, startAmbience } from '../audio.js';
import { renderResult, formatClock } from './result.js';
import { paintedBackdrop, hostChip } from '../../pets/sprite.js';
import { escapeHTML } from '../../core/utils/format.js';
import { toast } from '../../ui/components/cat-toast.js';

const KEYS = ['A', 'B', 'C', 'D', 'E'];

export async function renderRound(outlet, { storage }, params) {
  const region = regionBySlug(params.region);
  // replace(), not a hash assignment: a bad address pushed a history entry,
  // so Back took the learner straight to the bad address again and they were
  // trapped bouncing between the two.
  if (!region) { location.replace('#/world'); return; }
  document.documentElement.setAttribute('data-world', '');
  silenceWorld();

  let ledger, fields, before;
  try {
    [ledger, fields, before] = await Promise.all([loadLedger(storage), listFields(region.slug), loadWorld(storage)]);
  } catch (err) {
    outlet.innerHTML = `<section class="run"><div class="run__body"><h1 class="brief__title">This round will not open</h1><p class="brief__line">${escapeHTML(err.message)}</p><a class="g-btn" href="${region.route}">Back</a></div></section>`;
    return;
  }

  /* ---- What the curator chose ---- */
  let picks, title, line, counts, primary;
  try {
    if (params.field) {
      const bundle = await loadField(region.slug, params.field);
      const field = fields.find((f) => f.id === params.field);
      const entries = pickRound(bundle.entries, ledger, Date.now(), Math.min(ROUND_SIZE, bundle.entries.length), `round:${Date.now()}`);
      picks = entries.map((e) => ({ entry: e, bundle, status: ledger.has(e.id) ? 'again' : 'new' }));
      primary = bundle;
      title = field ? (region.slug === 'meadow' ? `${field.groupLabel} · ${field.name}` : field.name) : bundle.meta.title;
      line = 'A field you chose yourself.';
      counts = { due: 0, shaky: 0, new: picks.filter((p) => p.status === 'new').length };
    } else {
      const composed = await composeRound(region.slug, fields, ledger, { seed: `round:${Date.now()}`, context: await loadContext().catch(() => null) });
      ({ entries: picks, title, line, counts, primary } = composed);
    }
  } catch (err) {
    outlet.innerHTML = `<section class="run"><div class="run__body"><h1 class="brief__title">This round will not open</h1><p class="brief__line">${escapeHTML(err.message)}</p><a class="g-btn" href="${region.route}">Back</a></div></section>`;
    return;
  }
  if (!picks?.length) {
    /* This used to be a silent `location.hash = region.route`. With the word
       lists unreachable, a learner tapped "Begin in the Meadow", the screen
       flickered, and they were back where they started — forever, with no
       message. "Nothing is due" and "nothing could be downloaded" are not
       the same thing and must not look the same. */
    outlet.innerHTML = `<section class="run"><div class="run__body"><div class="brief">
      <h1 class="brief__title">Nothing to ask just yet</h1>
      <p class="brief__line">Either every word here is resting, or the word lists have not reached this device. They arrive in the background.</p>
      <p><button class="g-btn" onclick="location.reload()">Try again</button> <a class="g-btn" href="${region.route}">Back to ${escapeHTML(region.name)}</a></p>
    </div></div></section>`;
    return;
  }

  const languages = region.slug === 'thicket' ? fields.map((f) => f.name) : [];
  let context = null;
  try { context = await loadContext(); } catch { /* the dictionary question still works */ }
  const round = new LexRound({ region: region.slug, picks, languages, context });
  const target = TARGET_MS[region.slug] ?? 7000;
  const atmo = before.state.atmo;

  /* ---- The frame: Matcha's greenhouse, painted, behind everything ---- */
  outlet.innerHTML = `
    ${paintedBackdrop('matcha')}
    <section class="run run--painted run--${region.slug}">
      <div class="run__bar">
        <a class="run__leave" href="${region.route}" aria-label="Leave">×</a>
        <div class="run__where"><div class="run__place">${hostChip('matcha', 20)}<span>${escapeHTML(region.name)}</span></div><div class="run__what" id="run-what">${escapeHTML(title)}</div></div>
        <div class="run__pace" id="pace" hidden><span class="run__clock" id="clock">0:00</span><div class="run__ring" id="ring" aria-hidden="true"></div></div>
      </div>
      <div class="run__track" id="track-wrap" hidden><i id="track" style="width:0%"></i></div>
      <div class="run__body" id="body"></div>
    </section>`;

  startAmbience(region.slug, atmo);

  const body = outlet.querySelector('#body');

  /* ---- Briefing: what this handful is, in one line ---- */
  body.innerHTML = `
    <div class="brief is-veiled">
      <p class="brief__eyebrow">${escapeHTML(region.skill ?? 'Vocabulary')}</p>
      <h1 class="brief__title">${escapeHTML(title)}</h1>
      <p class="brief__line">${escapeHTML(line)}</p>
      <div class="brief__facts">
        <span class="brief__fact">${picks.length} words</span>
        ${counts.due ? `<span class="brief__fact is-due">${counts.due} due</span>` : ''}
        ${counts.shaky ? `<span class="brief__fact is-shaky">${counts.shaky} slipping</span>` : ''}
        ${counts.new ? `<span class="brief__fact is-new">${counts.new} new</span>` : ''}
        ${counts.context ? `<span class="brief__fact is-context">${counts.context} in context</span>` : ''}
        <span class="brief__fact">~${Math.round(target / 1000)}s each</span>
      </div>
      <div class="brief__stars">
        <span><b>★★★</b> nine in ten right, inside the pace</span>
        <span><b>★★</b> three in four right</span>
        <span><b>★</b> half right</span>
      </div>
      <button class="g-cta" id="begin">Begin<span class="arrow" aria-hidden="true">→</span></button>
    </div>`;
  requestAnimationFrame(() => body.querySelector('.brief')?.classList.add('is-in'));
  body.querySelector('#begin').addEventListener('click', () => { play('open'); renderPlay(); });

  /* ---- The run ---- */
  function renderPlay() {
    outlet.querySelector('#pace').hidden = false;
    outlet.querySelector('#track-wrap').hidden = false;
    outlet.querySelector('#run-what').textContent = `1 of ${round.total}`;
    body.innerHTML = '';
    const what = outlet.querySelector('#run-what');
    const ring = outlet.querySelector('#ring');
    const clock = outlet.querySelector('#clock');
    const track = outlet.querySelector('#track');
    const startedAt = Date.now();
    let shownAt = Date.now();
    let locked = false;
    let hurried = false;
    let alive = true;

    const tick = () => {
      if (!alive || !ring.isConnected) return;
      const el = Date.now() - shownAt;
      const p = Math.min(1, el / target);
      ring.style.setProperty('--p', `${Math.round(p * 100)}%`);
      ring.classList.toggle('is-over', p >= 1);
      clock.textContent = formatClock(Date.now() - startedAt);
      if (p >= 1 && !hurried && !locked) { hurried = true; play('hurry'); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const onKey = (e) => {
      const i = KEYS.indexOf(e.key.toUpperCase());
      if (i >= 0) { const btn = body.querySelectorAll('.vopt')[i]; if (btn && !btn.disabled) btn.click(); }
    };
    window.addEventListener('keydown', onKey);
    const cleanup = () => { alive = false; window.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', cleanup); };
    window.addEventListener('hashchange', cleanup);

    function showQuestion() {
      const q = round.current;
      const pick = round.picks[round.index];
      locked = false; hurried = false;
      round.markShown(); shownAt = Date.now();
      what.textContent = `${round.index + 1} of ${round.total}`;
      track.style.width = `${Math.round((round.index / round.total) * 100)}%`;
      const isTwinPick = q.kind === 'twin';
      body.innerHTML = `
        <div class="vround" id="card">
          ${pick?.status === 'due' ? '<p class="vround__tag is-due">Due for review</p>' : pick?.status === 'new' ? '<p class="vround__tag is-new">New word</p>' : pick?.status === 'shaky' ? '<p class="vround__tag is-shaky">This one slipped</p>' : ''}
          ${q.wordShown ? `<h2 class="vround__word">${escapeHTML(q.stem)}</h2>` : `<p class="vround__sentence">${markStem(q)}</p>`}
          <p class="vround__ask">${escapeHTML(q.ask)}${q.hint ? ` · <i>${escapeHTML(q.hint)}</i>` : ''}</p>
          <div class="vround__options ${isTwinPick ? 'twin__pair' : ''}" id="opts">
            ${q.options.map((o, i) => `<button class="vopt" data-i="${i}"><span class="key" aria-hidden="true">${KEYS[i]}</span><span>${escapeHTML(o.text)}</span></button>`).join('')}
          </div>
          <div class="vround__feedback" id="feedback"></div>
        </div>`;
      requestAnimationFrame(() => body.querySelector('#card')?.classList.add('is-in'));
      body.querySelector('#opts').addEventListener('click', (e) => {
        const btn = e.target.closest('.vopt');
        if (!btn || locked) return;
        locked = true;
        const i = Number(btn.dataset.i);
        const verdict = round.answer(i);
        const opts = body.querySelectorAll('.vopt');
        opts.forEach((b, j) => { b.disabled = true; if (j === verdict.correctIndex) b.classList.add('is-correct'); else if (j === i) b.classList.add('is-wrong'); else b.classList.add('is-dim'); });
        const fb = body.querySelector('#feedback');
        const combo = round.combo;
        const e2 = q.entry;
        if (verdict.correct) {
          play('correct');
          body.querySelector('#card')?.classList.add('is-right');
          if (combo >= 3) { const c = document.createElement('div'); c.className = 'vround__combo'; c.textContent = `×${combo}`; outlet.querySelector('.run').appendChild(c); setTimeout(() => c.remove(), 900); }
          // Even a right answer teaches: the meaning is confirmed, briefly.
          fb.innerHTML = combo >= 5
            ? `<b>${combo} in a row.</b>`
            : q.kind === 'meaning' || q.kind === 'loan' ? '' : `<span class="muted">${escapeHTML(e2.word ?? '')}${e2.meaning ? ` — ${escapeHTML(trim(e2.meaning, 70))}` : ''}</span>`;
        } else {
          play('wrong');
          body.querySelector('#card')?.classList.add('is-wrong');
          const right = q.options[verdict.correctIndex]?.text ?? '';
          fb.innerHTML = q.kind === 'context'
            ? `Here it means <b>${escapeHTML(trim(q.context?.meaning ?? '', 90))}</b>.`
            : q.kind === 'twin' || q.kind === 'twin-meaning'
            ? `<b>${escapeHTML(right)}</b> — ${escapeHTML(e2.explanation ?? '')}`
            : q.kind === 'reverse' ? `The word is <b>${escapeHTML(right)}</b>. ${escapeHTML(trim(e2.meaning ?? '', 80))}`
              : `<b>${escapeHTML(e2.word ?? '')}</b>: ${escapeHTML(e2.meaning ?? '')}`;
        }
        setTimeout(advance, verdict.correct ? 720 : 2200);
      });
    }

    async function advance() {
      if (round.next()) { showQuestion(); return; }
      cleanup();
      await finish();
    }

    async function finish() {
      const result = round.finish();
      try { await saveRound(storage, round, result, ledger); } catch (err) { console.error('[CAT OS] round save failed', err); toast('This round finished but could not be saved.', 'error'); }
      let after = null;
      try { const records = await loadWorldRecords(storage); after = deriveWorldState(before.content, records); } catch { /* facts still show */ }
      const change = after ? petChangeLine(before.state, after) : null;
      const treasure = after ? newlyAffordable(before.state, after) : null;
      const setsDone = after ? newlyFinished(before.state, after, before.content) : [];
      const misses = round.answers.filter((a) => !a.correct);
      const byId = new Map(round.entries.map((e) => [e.id, e]));
      const reviewHTML = misses.length ? `
        <div class="review">
          <p class="review__head">${misses.length} to keep</p>
          ${misses.map((a) => { const e = byId.get(a.entry_id); return `<div class="review__row"><b>${escapeHTML(e?.word ?? (e?.words ?? []).join(' / ') ?? '')}</b><span>${escapeHTML(trim(e?.meaning ?? e?.explanation ?? '', 110))}</span></div>`; }).join('')}
        </div>` : '';
      renderResult(outlet, {
        region: region.slug,
        eyebrow: `${region.name} · ${title}`,
        title: result.stars.stars === 3 ? 'In full bloom' : 'Round complete',
        result: result.stars,
        facts: [
          { label: 'Right', value: `${result.record.score?.correct}/${result.record.score?.total}`, good: result.stars.accuracy >= 0.75 },
          // Inside the pace is only a good number if the answers were right:
          // fast and wrong is the habit CAT punishes hardest, and a gold
          // figure under a one-star round would be teaching it.
          { label: 'Per word', value: `${(result.record.score?.avg_ms / 1000).toFixed(1)}s`, good: result.stars.inTime && result.stars.accuracy >= 0.5 },
          { label: 'Time', value: formatClock(result.record.duration_ms) },
        ],
        pet: 'matcha',
        ...(change?.pet === 'matcha' ? { gifts: change.gifts, doubled: change.doubled, heart: change.heart, hearts: change.hearts } : {}),
        treasure,
        setsDone,
        extraHTML: reviewHTML,
        actions: [
          { label: 'Another round', href: `#/round/${region.slug}`, primary: true },
          { label: `Back to ${region.name}`, href: region.route },
          { label: 'Back to the village', href: '#/world', quiet: true },
        ],
      });
    }

    showQuestion();
  }
}

function trim(s, n) { const t = String(s ?? '').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; }

/** A sentence with the word under test marked, escaped first so the
 *  content can never inject markup. */
function markStem(q) {
  const text = escapeHTML(q.stem);
  if (!q.markWord) return text;
  const w = escapeHTML(q.markWord).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${w})`, 'i'), '<mark>$1</mark>');
}
