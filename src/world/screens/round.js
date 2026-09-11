/**
 * round.js (screen) — a vocabulary round in the Meadow, the Mirror Pond
 * or the Thicket: twelve real words from one field, one question at a
 * time, a pace ring per word, a combo that grows while you are right, a
 * verdict in place, and the star reveal at the end. Speed matters (the
 * ring), accuracy matters (the stars), and every answer changes what the
 * field looks like next time.
 */

import { loadWorld } from '../state.js';
import { loadField, loadLedger, pickRound, LexRound, saveRound, TARGET_MS, ROUND_SIZE, listFields } from '../lexicon.js';
import { regionBySlug } from '../regions.js';
import { play, silenceWorld } from '../audio.js';
import { renderResult, formatClock } from './result.js';
import { worldChangeLine, deriveWorldState, loadWorldRecords } from '../state.js';
import { escapeHTML } from '../../core/utils/format.js';

const KEYS = ['A', 'B', 'C', 'D', 'E'];

export async function renderRound(outlet, { storage }, params) {
  const region = regionBySlug(params.region);
  if (!region) { location.hash = '#/world'; return; }
  document.documentElement.setAttribute('data-world', '');
  silenceWorld();

  let bundle, ledger, fields, before;
  try {
    [bundle, ledger, fields, before] = await Promise.all([loadField(region.slug, params.field), loadLedger(storage), listFields(region.slug), loadWorld(storage)]);
  } catch (err) {
    outlet.innerHTML = `<section class="place"><div class="place__body" style="padding-top:60px"><h1 class="place__title">This field will not open</h1><p class="place__line">${escapeHTML(err.message)}</p><a class="g-btn" href="${region.route}">Back</a></div></section>`;
    return;
  }
  const field = fields.find((f) => f.id === params.field);
  const languages = region.slug === 'thicket' ? fields.map((f) => f.name) : [];
  const entries = pickRound(bundle.entries, ledger, Date.now(), Math.min(ROUND_SIZE, bundle.entries.length), `round:${Date.now()}`);
  const round = new LexRound({ region: region.slug, bundle, entries, languages });
  const target = TARGET_MS[region.slug] ?? 7000;
  const fieldName = field ? (region.slug === 'meadow' ? `${field.groupLabel} · ${field.name}` : field.name) : bundle.meta.title;

  /* ---- Briefing ---- */
  const dueCount = entries.filter((e) => ledger.get(e.id) && Date.parse(ledger.get(e.id).next_at) <= Date.now()).length;
  const newCount = entries.filter((e) => !ledger.get(e.id)).length;
  outlet.innerHTML = `
    <section class="run">
      <div class="run__bar">
        <a class="run__leave" href="${region.route}" aria-label="Leave">×</a>
        <div class="run__where"><div class="run__place">${escapeHTML(region.name)}</div><div class="run__what">${escapeHTML(fieldName)}</div></div>
      </div>
      <div class="run__body">
        <div class="brief">
          <p class="brief__eyebrow">${escapeHTML(region.skill ?? 'Vocabulary')}</p>
          <h1 class="brief__title">${entries.length} words from ${escapeHTML(field?.name ?? 'the field')}</h1>
          <p class="brief__line">${region.slug === 'pond' ? 'Two words that look alike; one meaning. Choose the word that carries it.' : region.slug === 'thicket' ? `Words English borrowed from ${escapeHTML(bundle.meta.language ?? 'other languages')}. Say what each means, and sometimes where it came from.` : 'Meanings, synonyms and opposites, one word at a time. Answer from what you know; the misses teach you the rest.'}</p>
          <div class="brief__facts">
            <span class="brief__fact">${entries.length} words</span>
            <span class="brief__fact">~${Math.round(target / 1000)}s each for pace</span>
            ${dueCount ? `<span class="brief__fact">${dueCount} due for review</span>` : ''}
            ${newCount ? `<span class="brief__fact">${newCount} new</span>` : ''}
          </div>
          <div class="brief__stars">
            <span><b>★★★</b> 90% right, inside the pace</span>
            <span><b>★★</b> 75% right</span>
            <span><b>★</b> half right</span>
          </div>
          <button class="g-cta" id="begin">Begin<span class="arrow" aria-hidden="true">→</span></button>
        </div>
      </div>
    </section>`;
  outlet.querySelector('#begin').addEventListener('click', () => { play('open'); renderPlay(); });

  /* ---- Play ---- */
  function renderPlay() {
    outlet.innerHTML = `
      <section class="run">
        <div class="run__bar">
          <a class="run__leave" href="${region.route}" aria-label="Leave the round">×</a>
          <div class="run__where"><div class="run__place">${escapeHTML(region.name)}</div><div class="run__count"><b id="pos">1</b> of ${round.total}</div></div>
          <div class="run__pace"><span class="run__clock" id="clock">0:00</span><div class="run__ring" id="ring" aria-hidden="true"></div></div>
        </div>
        <div class="run__track"><i id="track" style="width:0%"></i></div>
        <div class="run__body" id="body"></div>
      </section>`;
    const body = outlet.querySelector('#body');
    const pos = outlet.querySelector('#pos');
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
      locked = false; hurried = false;
      round.markShown(); shownAt = Date.now();
      pos.textContent = String(round.index + 1);
      track.style.width = `${Math.round((round.index / round.total) * 100)}%`;
      const isTwinPick = q.kind === 'twin';
      body.innerHTML = `
        ${q.wordShown ? `<h2 class="vround__word">${escapeHTML(q.stem)}</h2>` : `<p class="vround__sentence">${escapeHTML(q.stem)}</p>`}
        <p class="vround__ask">${escapeHTML(q.ask)}${q.hint ? ` · <i>${escapeHTML(q.hint)}</i>` : ''}</p>
        <div class="vround__options ${isTwinPick ? 'twin__pair' : ''}" id="opts">
          ${q.options.map((o, i) => `<button class="vopt" data-i="${i}"><span class="key" aria-hidden="true">${KEYS[i]}</span><span>${escapeHTML(o.text)}</span></button>`).join('')}
        </div>
        <div class="vround__feedback" id="feedback"></div>`;
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
        if (verdict.correct) {
          play('correct');
          if (combo >= 3) { const c = document.createElement('div'); c.className = 'vround__combo'; c.textContent = `×${combo}`; outlet.querySelector('.run').appendChild(c); setTimeout(() => c.remove(), 900); }
          fb.innerHTML = combo >= 5 ? `<b>${combo} in a row.</b>` : '';
        } else {
          play('wrong');
          const e2 = q.entry;
          const right = q.options[verdict.correctIndex]?.text ?? '';
          fb.innerHTML = q.kind === 'twin' ? `<b>${escapeHTML(right)}</b> — ${escapeHTML(e2.explanation ?? '')}`
            : q.kind === 'reverse' ? `The word is <b>${escapeHTML(right)}</b>.`
              : `<b>${escapeHTML(e2.word)}</b>: ${escapeHTML(e2.meaning ?? '')}`;
        }
        setTimeout(advance, verdict.correct ? 750 : 2100);
      });
    }

    async function advance() {
      if (round.next()) { showQuestion(); return; }
      cleanup();
      await finish();
    }

    async function finish() {
      const result = round.finish();
      try { await saveRound(storage, round, result, ledger); } catch (err) { console.error('[CAT OS] round save failed', err); }
      let after = null;
      try { const records = await loadWorldRecords(storage); after = deriveWorldState(before.content, records); } catch { /* facts still show */ }
      const line = after ? worldChangeLine(region.slug, before.state, after) : '';
      const misses = round.answers.filter((a) => !a.correct);
      const byId = new Map(round.entries.map((e) => [e.id, e]));
      const reviewHTML = misses.length ? `<div class="result__review">${misses.map((a) => { const e = byId.get(a.entry_id); return `<div class="r no"><span><b>${escapeHTML(e.word ?? (e.words ?? []).join(' / '))}</b></span><span>${escapeHTML((e.meaning ?? e.explanation ?? '').slice(0, 90))}</span></div>`; }).join('')}</div>` : '';
      renderResult(outlet, {
        region: region.slug,
        eyebrow: `${region.name} · ${fieldName}`,
        title: result.stars.stars === 3 ? 'In full bloom' : 'Round complete',
        result: result.stars,
        facts: [
          { label: 'Right', value: `${result.record.score.correct}/${result.record.score.total}`, good: result.stars.accuracy >= 0.75 },
          { label: 'Per word', value: `${(result.record.score.avg_ms / 1000).toFixed(1)}s`, good: result.stars.inTime },
          { label: 'Time', value: formatClock(result.record.duration_ms) },
        ],
        ink: result.ink,
        worldLine: line,
        extraHTML: reviewHTML,
        actions: [
          { label: 'Another round here', href: `#/round/${region.slug}/${bundle.meta.id}`, primary: true },
          { label: `Back to ${region.name}`, href: region.route },
          { label: 'Back to the valley', href: '#/world' },
        ],
      });
    }

    showQuestion();
  }
}
