/**
 * wilds.js (screen) — beyond the valley: the weekly Gauntlet. Thirty
 * words drawn across the Meadow, the Pond and the Thicket — the SAME
 * thirty for everyone all week (seeded by the week), against a three-
 * minute clock — so a run this week is comparable with the last, and the
 * only opponent is your own best. Records are kept per week and all-time,
 * with the split per place. Toffee keeps the fire and hosts it.
 */

import { regionBySlug } from '../regions.js';
import { listFields, loadField, loadLedger, buildQuestion, buildContextQuestion, LexRound, applyAnswer, loadContext } from '../lexicon.js';
import { roundStars } from '../economy.js';
import { loadWorld, loadWorldRecords, deriveWorldState, petChangeLine, newlyAffordable, loadWorldContent } from '../state.js';
import { petSprite, paintedBackdrop, hostChip, backdropStyle, FRAME } from '../../pets/sprite.js';
import { newlyFinished } from '../collections.js';
import { rng } from '../engine/palette.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { play, unlock, startMusic, startAmbience, silenceWorld } from '../audio.js';
import { renderResult, formatClock, starHTML } from './result.js';
import { escapeHTML, formatDate } from '../../core/utils/format.js';
import { toast } from '../../ui/components/cat-toast.js';

export const GAUNTLET_SIZE = 30;
export const GAUNTLET_MS = 3 * 60_000;
const KEYS = ['A', 'B', 'C', 'D'];

/** ISO-week key, e.g. 2026-W37. */
export function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** The week's thirty: ten from each place, fields and entries chosen by the week's seed. */
export async function composeGauntlet(week) {
  const r = rng(`gauntlet:${week}`);
  const picks = [];
  for (const region of ['meadow', 'pond', 'thicket']) {
    const fields = await listFields(region);
    if (!fields.length) continue;
    const chosenFields = [];
    for (let i = 0; i < 3 && fields.length; i += 1) chosenFields.push(fields[Math.floor(r() * fields.length)]);
    const bundles = await Promise.all([...new Set(chosenFields.map((f) => f.id))].map((id) => loadField(region, id)));
    const pool = bundles.flatMap((b) => b.entries.map((e) => ({ entry: e, bundle: b })));
    for (let i = pool.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const languages = region === 'thicket' ? fields.map((f) => f.name) : [];
    for (const p of pool.slice(0, 7)) picks.push({ region, ...p, languages });
  }
  /* Nine of the thirty are the question CAT actually asks: a word inside a
     real sentence. Mixed pressure means mixed KINDS of thinking, not just
     words from three different places. */
  try {
    const ctx = await loadContext();
    const pool = [...ctx.entries];
    for (let i = pool.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    for (const c of pool.slice(0, 9)) picks.push({ region: 'meadow', context: c, contextPool: ctx.entries });
  } catch { /* thirty words is still a Gauntlet */ }
  for (let i = picks.length - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [picks[i], picks[j]] = [picks[j], picks[i]]; }
  return picks;
}

export async function renderWilds(outlet, { storage }) {
  /* "Run again" on the result screen arrives as #/world/place/wilds?run=1.
     It used to navigate here and then auto-click #run on a 400 ms timer,
     which lost the race two times in three. */
  const autoRun = /[?&]run=1/.test(location.hash);
  document.documentElement.setAttribute('data-world', '');
  const region = regionBySlug('wilds');
  const week = weekKey();
  let runs = [];
  try { runs = (await storage.getAll(STORES.LEARNING)).filter((r) => r.kind === 'gauntlet-run').sort((a, b) => b.finished_at.localeCompare(a.finished_at)); } catch { /* none */ }
  const thisWeek = runs.filter((r) => r.week === week);
  const best = (list) => [...list].sort((a, b) => (b.score?.correct - a.score?.correct) || (a.duration_ms - b.duration_ms))[0] ?? null;
  const weekBest = best(thisWeek), allBest = best(runs);
  let beforeRecords = { sessions: [], learning: [] };
  try { beforeRecords = await loadWorldRecords(storage); } catch { /* the run still counts */ }

  outlet.innerHTML = `
    <section class="place place--page place--gauntlet" aria-label="The Gauntlet">
      <div class="place__hero place__hero--short place__hero--painted" style="${backdropStyle('toffee')}">
        <a class="place__back" href="#/world" id="back">← Village</a>
        <span class="place__pet place__pet--toffee" aria-hidden="true">${petSprite('toffee', { size: 92, frame: FRAME.happy })}</span>
      </div>
      <div class="place__body">
        <p class="place__eyebrow">${escapeHTML(region.skill)} · week ${escapeHTML(week.slice(-2))} · with Toffee</p>
        <h1 class="place__title">The Gauntlet</h1>
        <p class="place__line">${GAUNTLET_SIZE} questions — words from the Meadow, the Pond and the Thicket, and nine asked the way CAT asks them, inside a real sentence. The same ${GAUNTLET_SIZE} all week, in ${GAUNTLET_MS / 60000} minutes. No hints, no second tries. Beat your own best.</p>
        <button class="g-cta g-cta--gold" id="run">Run the Gauntlet<small>${thisWeek.length ? `${thisWeek.length} run${thisWeek.length === 1 ? '' : 's'} this week · best ${weekBest.score?.correct}/${GAUNTLET_SIZE} in ${formatClock(weekBest.duration_ms)}` : 'Your first run this week'}</small><span class="arrow" aria-hidden="true">→</span></button>
        <div class="place__section">
          <h2>Records</h2>
          <p class="sub">${allBest ? `All-time best: <b>${allBest.score?.correct}/${GAUNTLET_SIZE}</b> in ${formatClock(allBest.duration_ms)} (${escapeHTML(allBest.week)}).` : 'No runs yet. The first one sets the mark.'}</p>
          <div class="g-list">
            ${runs.slice(0, 12).map((r) => `<div class="g-row"><span class="g-row__num">${r.score?.correct}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(r.week)} · ${formatClock(r.duration_ms)}${r === allBest ? ' · best' : ''}</span><span class="g-row__meta">${formatDate(r.finished_at)}${r.splits ? ` · Meadow ${r.splits.meadow ?? 0} · Pond ${r.splits.pond ?? 0} · Thicket ${r.splits.thicket ?? 0}` : ''}</span></span><span class="g-row__stars">${starHTML(r.stars ?? 0)}</span></div>`).join('') || '<div class="g-empty">Toffee is keeping the fire warm for the first one.</div>'}
          </div>
        </div>
      </div>
    </section>`;
  outlet.querySelector('#back').addEventListener('click', () => { sessionStorage.setItem('world:focus', 'wilds'); play('close'); });

  window.addEventListener('pointerdown', () => { unlock(); startMusic('wilds', { hour: 'night' }); startAmbience('wilds', { hour: 'night', weather: 'clear', season: 'autumn' }); }, { capture: true, once: true });
  startMusic('wilds', { hour: 'night' }); startAmbience('wilds', { hour: 'night', weather: 'clear', season: 'autumn' });

  const startRun = async () => {
    play('open');
    silenceWorld();
    outlet.querySelector('#run').disabled = true;
    let picks, ledger, before;
    /* Both of these used to be a silent `return`: the learner tapped the
       biggest button on the screen, nothing happened, and the only evidence
       was a line in a console they will never open. The button is the retry,
       so it stays enabled — and it says what went wrong under its own label. */
    const refuse = (line) => {
      const btn = outlet.querySelector('#run');
      if (btn) { btn.disabled = false; const small = btn.querySelector('small'); if (small) small.textContent = line; }
      toast(line, 'error');
    };
    try { [picks, ledger, before] = await Promise.all([composeGauntlet(week), loadLedger(storage), loadWorld(storage)]); }
    catch (err) { console.error('[CAT OS] the Gauntlet could not be composed', err); refuse(err?.message ?? 'This could not be set up just now. Try again in a moment.'); return; }
    if (picks.length < 10) { refuse('There are not enough words on this device yet. They arrive in the background — try again in a minute.'); return; }
    runGauntlet(outlet, storage, { picks, ledger, before, week });
  };
  outlet.querySelector('#run').addEventListener('click', startRun);
  if (autoRun) startRun();
}

function runGauntlet(outlet, storage, { picks, ledger, before, week }) {
  const startedAt = Date.now();
  const questions = picks.map((p, i) => (p.context
    ? { ...buildContextQuestion(p.context, p.contextPool, `gauntlet:${week}:${i}`), region: p.region, bundle: null, inContext: true }
    : { ...buildQuestion(p.entry, p.bundle, p.region, `gauntlet:${week}:${i}`, p.languages), region: p.region, bundle: p.bundle }));
  const answers = [];
  let index = 0, shownAt = Date.now(), locked = false, alive = true, ended = false;

  outlet.innerHTML = `
    ${paintedBackdrop('toffee')}
    <section class="run run--painted">
      <div class="run__bar">
        <a class="run__leave" href="#/world/place/wilds" aria-label="Leave">×</a>
        <div class="run__where"><div class="run__place">${hostChip('toffee', 20)}<span>The Gauntlet</span></div><div class="run__count"><b id="pos">1</b> of ${questions.length}</div></div>
        <div class="run__pace"><span class="run__clock" id="clock">3:00</span><div class="run__ring" id="ring" aria-hidden="true"></div></div>
      </div>
      <div class="run__track"><i id="track" style="width:0%"></i></div>
      <div class="run__body" id="body"></div>
    </section>`;
  const body = outlet.querySelector('#body'), pos = outlet.querySelector('#pos'), ring = outlet.querySelector('#ring'), clock = outlet.querySelector('#clock'), track = outlet.querySelector('#track');
  let warned = false;
  const tick = () => {
    if (!alive || !ring.isConnected) return;
    const left = GAUNTLET_MS - (Date.now() - startedAt);
    clock.textContent = formatClock(Math.max(0, left));
    clock.classList.toggle('is-over', left < 20_000);
    ring.style.setProperty('--p', `${Math.round(Math.max(0, left) / GAUNTLET_MS * 100)}%`);
    if (left < 20_000 && !warned) { warned = true; play('hurry'); }
    if (left <= 0) { finish(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  const onKey = (e) => { const i = KEYS.indexOf(e.key.toUpperCase()); if (i >= 0) body.querySelectorAll('.vopt')[i]?.click(); };
  window.addEventListener('keydown', onKey);
  const cleanup = () => { alive = false; window.removeEventListener('keydown', onKey); window.removeEventListener('hashchange', cleanup); };
  window.addEventListener('hashchange', cleanup);

  function show() {
    const q = questions[index];
    locked = false; shownAt = Date.now();
    pos.textContent = String(index + 1);
    track.style.width = `${Math.round((index / questions.length) * 100)}%`;
    /* THE QUESTION NEEDS SOMETHING TO SIT ON.
       These four classes were written straight into .run__body with no
       .vround around them, where round.js — the same question, the same
       classes — wraps them in one. .vround is what carries `background:
       var(--g-panel)`, and without it the question text inherits --g-ink
       onto .run's permanent night ground: near-black on navy, 1.14:1, in
       BOTH themes, because .run declares its own light palette. The four
       answer buttons carry their own cream background and read perfectly,
       so a learner saw four legible options above a blank space, with a
       three-minute clock running over thirty questions. */
    body.innerHTML = `
      <div class="vround" id="card">
        <p class="vround__pos">${q.inContext ? 'In context' : escapeHTML(regionBySlug(q.region)?.name ?? '')}</p>
        ${q.wordShown ? `<h2 class="vround__word">${escapeHTML(q.stem)}</h2>` : `<p class="vround__sentence">${markStem(q)}</p>`}
        <p class="vround__ask">${escapeHTML(q.ask)}</p>
        <div class="vround__options ${q.kind === 'twin' ? 'twin__pair' : ''}" id="opts">${q.options.map((o, i) => `<button class="vopt" data-i="${i}"><span class="key" aria-hidden="true">${KEYS[i] ?? ''}</span><span>${escapeHTML(o.text)}</span></button>`).join('')}</div>
      </div>`;
    requestAnimationFrame(() => body.querySelector('#card')?.classList.add('is-in'));
    body.querySelector('#opts').addEventListener('click', (e) => {
      const btn = e.target.closest('.vopt'); if (!btn || locked) return;
      locked = true;
      const i = Number(btn.dataset.i);
      const correct = !!q.options[i]?.correct;
      const ci = q.options.findIndex((o) => o.correct);
      answers.push({ entry_id: q.entry.id, region: q.region, bundle_id: q.bundle?.meta.id ?? null, kind: q.kind, chosen: i, correct, ms: Date.now() - shownAt });
      body.querySelectorAll('.vopt').forEach((b, j) => { b.disabled = true; if (j === ci) b.classList.add('is-correct'); else if (j === i) b.classList.add('is-wrong'); else b.classList.add('is-dim'); });
      play(correct ? 'correct' : 'wrong');
      setTimeout(() => { index += 1; if (index >= questions.length) finish(); else show(); }, correct ? 420 : 900);
    });
  }

  async function finish() {
    if (ended) return; ended = true;
    cleanup();
    const finishedAt = Date.now();
    const correct = answers.filter((a) => a.correct).length;
    const total = questions.length;
    const avgMs = answers.length ? answers.reduce((n, a) => n + a.ms, 0) / answers.length : GAUNTLET_MS;
    const stars = roundStars({ correct, total, avgMs, targetMs: GAUNTLET_MS / total });
    const splits = { meadow: 0, pond: 0, thicket: 0 };
    for (const a of answers) if (a.correct) splits[a.region] += 1;
    let saved = true;
    const record = { id: `gauntlet-${new Date(startedAt).toISOString().replace(/[:.]/g, '-')}`, kind: 'gauntlet-run', module: 'world', week, started_at: new Date(startedAt).toISOString(), finished_at: new Date(finishedAt).toISOString(), duration_ms: Math.min(GAUNTLET_MS, finishedAt - startedAt), score: { correct, total, answered: answers.length, accuracy: total ? correct / total : 0, avg_ms: Math.round(avgMs) }, splits, stars: stars.stars, flawless: stars.flawless, answers };
    try {
      await storage.put(STORES.LEARNING, record);
      // The ledger learns from the Gauntlet too — every answer counts toward mastery.
      const byRegion = new Map();
      for (const a of answers) { if (!a.bundle_id) continue; const q = questions.find((x) => x.entry.id === a.entry_id); if (!q?.bundle) continue; const key = `${a.region}|${a.bundle_id}`; if (!byRegion.has(key)) byRegion.set(key, { region: a.region, bundle: q.bundle, entries: [], answers: [] }); const g = byRegion.get(key); g.entries.push(q.entry); g.answers.push(a); }
      for (const g of byRegion.values()) { const fake = { region: g.region, bundle: g.bundle, entries: g.entries, answers: g.answers }; await saveLedgerOnly(storage, fake, ledger); }
    } catch (err) {
      // Every other module says so when a finished session cannot be written.
      // These three did not, and the result screen went on to hand over stars
      // and goods that were never kept.
      console.error('[CAT OS] gauntlet save failed', err);
      saved = false;
      toast('This run finished but could not be saved.', 'error');
    }
    let change = null, treasure = null, setsDone = [];
    try {
      const content = await loadWorldContent();
      const beforeState = deriveWorldState(content, beforeRecords);
      const afterState = deriveWorldState(content, await loadWorldRecords(storage));
      change = petChangeLine(beforeState, afterState);
      treasure = newlyAffordable(beforeState, afterState);
      setsDone = newlyFinished(beforeState, afterState, before?.content ?? null);
    } catch { /* the run still counts */ }

    let prevBest = null;
    try { const all = (await storage.getAll(STORES.LEARNING)).filter((r) => r.kind === 'gauntlet-run' && r.id !== record.id); prevBest = [...all].sort((a, b) => (b.score?.correct - a.score?.correct) || (a.duration_ms - b.duration_ms))[0] ?? null; } catch { /* none */ }
    const isRecord = !prevBest || correct > prevBest.score?.correct || (correct === prevBest.score?.correct && record.duration_ms < prevBest.duration_ms);
    if (isRecord && answers.length) play('unlock', { delay: 1.6 });
    renderResult(outlet, {
      region: 'wilds',
      eyebrow: `The Gauntlet · ${week}`,
      title: isRecord ? 'A new record' : 'Gauntlet complete',
      result: stars,
      verdict: isRecord ? `${correct} of ${total} in ${formatClock(record.duration_ms)}. Your best run. Toffee keeps it by the fire.` : `${correct} of ${total} in ${formatClock(record.duration_ms)}. Best so far: ${prevBest.score?.correct} in ${formatClock(prevBest.duration_ms)}.`,
      facts: [
        { label: 'Right', value: `${correct}/${total}`, good: correct >= total * 0.75 },
        { label: 'Time', value: formatClock(record.duration_ms), good: record.duration_ms < GAUNTLET_MS },
        { label: 'Per word', value: `${(avgMs / 1000).toFixed(1)}s`, good: avgMs < GAUNTLET_MS / total },
      ],
      pet: 'toffee',
      ...(change?.pet === 'toffee' ? { gifts: change.gifts, doubled: change.doubled, heart: change.heart, hearts: change.hearts } : {}),
      // Nothing was kept, so nothing is handed over.
      ...(saved ? {} : { gifts: {} }),
      treasure,
      setsDone,
      extraHTML: `<div class="result__facts" style="grid-template-columns:repeat(3,1fr)"><div class="result__fact"><b>${splits.meadow}</b><span>Meadow</span></div><div class="result__fact"><b>${splits.pond}</b><span>Pond</span></div><div class="result__fact"><b>${splits.thicket}</b><span>Thicket</span></div></div>`,
      actions: [
        /* It used to navigate and then auto-click #run after 400 ms. Measured,
           the button takes 43 ms, 1722 ms and 2579 ms to exist — so two times
           in three the learner tapped "Run again", landed on the Wilds, and
           the run never started. The screen starts it itself now. */
        { label: 'Run again', href: '#/world/place/wilds?run=1', primary: true },
        { label: 'Back to the village', href: '#/world' },
      ],
    });
  }
  show();
}

/** Apply a set of answers to the ledger without writing a round record (the Gauntlet keeps its own). */
async function saveLedgerOnly(storage, fake, ledger) {
  const byEntry = new Map(fake.entries.map((e) => [e.id, e]));
  for (const a of fake.answers) {
    const entry = byEntry.get(a.entry_id); if (!entry) continue;
    const rec = applyAnswer(ledger.get(a.entry_id), entry, fake.region, fake.bundle.meta.id, a.correct);
    ledger.set(a.entry_id, rec);
    await storage.put(STORES.LEARNING, rec);
  }
}

export { deriveWorldState, loadWorldRecords, LexRound };

/** A sentence with the word under test marked, escaped first so content
 *  can never inject markup. */
function markStem(q) {
  const text = escapeHTML(q.stem);
  if (!q.markWord) return text;
  const w = escapeHTML(q.markWord).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`(${w})`, 'i'), '<mark>$1</mark>');
}
