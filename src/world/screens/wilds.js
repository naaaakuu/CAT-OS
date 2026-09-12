/**
 * wilds.js (screen) — beyond the valley: the weekly Gauntlet. Thirty
 * words drawn across the Meadow, the Pond and the Thicket — the SAME
 * thirty for everyone all week (seeded by the week), against a three-
 * minute clock — so a run this week is comparable with the last, and the
 * only opponent is your own best. Records are kept per week and all-time,
 * with the split per place once the road is lit.
 */

import { regionBySlug } from '../regions.js';
import { WorldRenderer } from '../engine/canvas.js';
import { buildBackdropScene } from '../engine/map.js';
import { listFields, loadField, loadLedger, buildQuestion, buildContextQuestion, LexRound, applyAnswer, loadContext } from '../lexicon.js';
import { roundStars, EARN, WAYMARKS } from '../economy.js';
import { loadWorld, loadWorldRecords, deriveWorldState, newlyBuildable, loadWorldContent } from '../state.js';
import { icon } from '../icons.js';
import { newlyFinished } from '../collections.js';
import { rng } from '../engine/palette.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { play, unlock, startMusic, startAmbience, silenceWorld } from '../audio.js';
import { renderResult, formatClock, starHTML } from './result.js';
import { escapeHTML, formatDate } from '../../core/utils/format.js';

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
  document.documentElement.setAttribute('data-world', '');
  const region = regionBySlug('wilds');
  const week = weekKey();
  let runs = [];
  try { runs = (await storage.getAll(STORES.LEARNING)).filter((r) => r.kind === 'gauntlet-run').sort((a, b) => b.finished_at.localeCompare(a.finished_at)); } catch { /* none */ }
  const thisWeek = runs.filter((r) => r.week === week);
  const best = (list) => [...list].sort((a, b) => (b.score.correct - a.score.correct) || (a.duration_ms - b.duration_ms))[0] ?? null;
  const weekBest = best(thisWeek), allBest = best(runs);
  let beforeRecords = { sessions: [], learning: [] };
  try { beforeRecords = await loadWorldRecords(storage); } catch { /* the run still counts */ }
  let lit = false;
  try { lit = (await storage.getAll(STORES.LEARNING)).some((r) => r.kind === 'world-build' && (r.work_id ?? r.upgrade_id) === 'wilds-lanterns'); } catch { /* unlit */ }

  outlet.innerHTML = `
    <section class="place place--page place--wilds" aria-label="The Wilds">
      <div class="place__hero place__hero--short"><canvas id="wilds-hero"></canvas><a class="place__back" href="#/world" id="back">← The valley</a>
        <div style="position:absolute;inset:0;display:grid;place-items:center;color:#fff;text-align:center;padding:40px 20px 0"><div><div style="font-family:var(--g-display);font-size:40px;letter-spacing:0.12em;opacity:0.95">THE WILDS</div><div style="font-size:12px;letter-spacing:0.3em;text-transform:uppercase;opacity:0.7;margin-top:6px">Week ${escapeHTML(week.slice(-2))} · the Gauntlet</div></div></div>
      </div>
      <div class="place__body">
        <p class="place__eyebrow">${escapeHTML(region.skill)}</p>
        <h1 class="place__title">The Gauntlet</h1>
        <p class="place__line">${GAUNTLET_SIZE} questions — words from the Meadow, the Pond and the Thicket, and nine asked the way CAT asks them, inside a real sentence. The same ${GAUNTLET_SIZE} all week, in ${GAUNTLET_MS / 60000} minutes. No hints, no second tries. Beat your own best.</p>
        <button class="g-cta g-cta--gold" id="run">Run the Gauntlet<small>${thisWeek.length ? `${thisWeek.length} run${thisWeek.length === 1 ? '' : 's'} this week · best ${weekBest.score.correct}/${GAUNTLET_SIZE} in ${formatClock(weekBest.duration_ms)}` : 'Your first run this week'}</small><span class="arrow" aria-hidden="true">→</span></button>
        <div class="place__section">
          <h2>Records</h2>
          <p class="sub">${allBest ? `All-time best: <b>${allBest.score.correct}/${GAUNTLET_SIZE}</b> in ${formatClock(allBest.duration_ms)} (${escapeHTML(allBest.week)}).` : 'No runs yet. The first one sets the mark.'}</p>
          <div class="g-list">
            ${runs.slice(0, 12).map((r) => `<div class="g-row"><span class="g-row__num">${r.score.correct}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(r.week)} · ${formatClock(r.duration_ms)}${r === allBest ? ' · best' : ''}</span><span class="g-row__meta">${formatDate(r.finished_at)}${lit && r.splits ? ` · Meadow ${r.splits.meadow ?? 0} · Pond ${r.splits.pond ?? 0} · Thicket ${r.splits.thicket ?? 0}` : ''}</span></span><span class="g-row__stars">${starHTML(r.stars ?? 0)}</span></div>`).join('') || '<div class="g-empty">The road is empty. Take the first run.</div>'}
          </div>
        </div>
        <div class="place__section" id="road-out"></div>
      </div>
    </section>`;
  outlet.querySelector('#back').addEventListener('click', () => { sessionStorage.setItem('world:focus', 'wilds'); play('close'); });

  /* ---- How far the road goes. Every waymark built in the Workshop posts
          it one place further, and the valley stops being the whole of the
          world. Nothing here is a reward for showing up: each one asked
          for more three-star passages than the last. ---- */
  (async () => {
    const slot = outlet.querySelector('#road-out');
    if (!slot) return;
    let st = null;
    try { st = (await loadWorld(storage)).state; } catch { return; }
    if (!slot.isConnected) return;
    const built = st.built?.waymarks ?? 0;
    slot.innerHTML = `
      <h2>The road out</h2>
      <p class="sub">${built
        ? `Posted as far as <b>${escapeHTML(WAYMARKS[(built - 1) % WAYMARKS.length].name)}</b>. Nobody from the valley has been further.`
        : 'It runs to the ridge and stops. Nobody has posted it further.'}</p>
      <div class="road">
        ${WAYMARKS.slice(0, Math.max(3, built + 2)).map((w, i) => `
          <div class="road__stop ${i < built ? 'is-reached' : i === built ? 'is-next' : ''}">
            <span class="road__mark">${icon(i < built ? 'road' : 'lock', { size: 18 })}</span>
            <span class="road__body">
              <b>${escapeHTML(w.name)}</b>
              <span>${escapeHTML(i <= built ? w.line : 'Further than the road goes.')}</span>
            </span>
          </div>`).join('')}
      </div>
      <p class="sub">${built < WAYMARKS.length
        ? `The next waymark asks for <b>${6 + built * 5} passages at three stars</b>, and is built at the Hearth.`
        : 'Every waymark is posted. The road keeps going.'}</p>`;
  })();

  /* The road out, painted behind the records. */
  let heroR = null;
  try {
    const w = await loadWorld(storage);
    const canvas = outlet.querySelector('#wilds-hero');
    if (canvas?.isConnected) {
      const scene = buildBackdropScene('wilds', w.state, w.state.atmo);
      heroR = new WorldRenderer(canvas, scene, { worldW: scene.W, worldH: scene.H, fit: 'cover', pannable: false, minZoom: 0.3, maxZoom: 8 });
      heroR.lookAt(scene.W / 2, 116, { animate: false });
      heroR.start();
      const off = () => { heroR?.destroy(); window.removeEventListener('hashchange', off); };
      window.addEventListener('hashchange', off);
    }
  } catch { /* the records still read */ }
  window.addEventListener('pointerdown', () => { unlock(); startMusic('wilds', { hour: 'night' }); startAmbience('wilds', { hour: 'night', weather: 'clear', season: 'autumn' }); }, { capture: true, once: true });
  startMusic('wilds', { hour: 'night' }); startAmbience('wilds', { hour: 'night', weather: 'clear', season: 'autumn' });

  outlet.querySelector('#run').addEventListener('click', async () => {
    play('open');
    silenceWorld();
    outlet.querySelector('#run').disabled = true;
    let picks, ledger, before;
    try { [picks, ledger, before] = await Promise.all([composeGauntlet(week), loadLedger(storage), loadWorld(storage)]); }
    catch (err) { outlet.querySelector('#run').disabled = false; console.error(err); return; }
    if (picks.length < 10) { outlet.querySelector('#run').disabled = false; return; }
    runGauntlet(outlet, storage, { picks, ledger, before, week });
  });
}

function runGauntlet(outlet, storage, { picks, ledger, before, week }) {
  const startedAt = Date.now();
  const questions = picks.map((p, i) => (p.context
    ? { ...buildContextQuestion(p.context, p.contextPool, `gauntlet:${week}:${i}`), region: p.region, bundle: null, inContext: true }
    : { ...buildQuestion(p.entry, p.bundle, p.region, `gauntlet:${week}:${i}`, p.languages), region: p.region, bundle: p.bundle }));
  const answers = [];
  let index = 0, shownAt = Date.now(), locked = false, alive = true, ended = false;

  outlet.innerHTML = `
    <section class="run">
      <div class="run__bar">
        <a class="run__leave" href="#/world/place/wilds" aria-label="Leave">×</a>
        <div class="run__where"><div class="run__place">The Wilds · Gauntlet</div><div class="run__count"><b id="pos">1</b> of ${questions.length}</div></div>
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
    body.innerHTML = `
      <p class="vround__pos">${q.inContext ? 'In context' : escapeHTML(regionBySlug(q.region)?.name ?? '')}</p>
      ${q.wordShown ? `<h2 class="vround__word">${escapeHTML(q.stem)}</h2>` : `<p class="vround__sentence">${markStem(q)}</p>`}
      <p class="vround__ask">${escapeHTML(q.ask)}</p>
      <div class="vround__options ${q.kind === 'twin' ? 'twin__pair' : ''}" id="opts">${q.options.map((o, i) => `<button class="vopt" data-i="${i}"><span class="key" aria-hidden="true">${KEYS[i] ?? ''}</span><span>${escapeHTML(o.text)}</span></button>`).join('')}</div>`;
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
    const record = { id: `gauntlet-${new Date(startedAt).toISOString().replace(/[:.]/g, '-')}`, kind: 'gauntlet-run', module: 'world', week, started_at: new Date(startedAt).toISOString(), finished_at: new Date(finishedAt).toISOString(), duration_ms: Math.min(GAUNTLET_MS, finishedAt - startedAt), score: { correct, total, answered: answers.length, accuracy: total ? correct / total : 0, avg_ms: Math.round(avgMs) }, splits, stars: stars.stars, flawless: stars.flawless, answers };
    try {
      await storage.put(STORES.LEARNING, record);
      // The ledger learns from the Gauntlet too — every answer counts toward mastery.
      const byRegion = new Map();
      for (const a of answers) { if (!a.bundle_id) continue; const q = questions.find((x) => x.entry.id === a.entry_id); if (!q?.bundle) continue; const key = `${a.region}|${a.bundle_id}`; if (!byRegion.has(key)) byRegion.set(key, { region: a.region, bundle: q.bundle, entries: [], answers: [] }); const g = byRegion.get(key); g.entries.push(q.entry); g.answers.push(a); }
      for (const g of byRegion.values()) { const fake = { region: g.region, bundle: g.bundle, entries: g.entries, answers: g.answers }; await saveLedgerOnly(storage, fake, ledger); }
    } catch (err) { console.error('[CAT OS] gauntlet save failed', err); }
    const earned = EARN.gauntlet(stars.stars, correct);
    let unlocked = [], setsDone = [];
    try {
      const content = await loadWorldContent();
      const beforeState = deriveWorldState(content, beforeRecords);
      const afterState = deriveWorldState(content, await loadWorldRecords(storage));
      unlocked = newlyBuildable(beforeState, afterState);
      setsDone = newlyFinished(beforeState, afterState, before?.content ?? null);
    } catch { /* the run still counts */ }

    let prevBest = null;
    try { const all = (await storage.getAll(STORES.LEARNING)).filter((r) => r.kind === 'gauntlet-run' && r.id !== record.id); prevBest = [...all].sort((a, b) => (b.score.correct - a.score.correct) || (a.duration_ms - b.duration_ms))[0] ?? null; } catch { /* none */ }
    const isRecord = !prevBest || correct > prevBest.score.correct || (correct === prevBest.score.correct && record.duration_ms < prevBest.duration_ms);
    if (isRecord && answers.length) play('unlock', { delay: 1.6 });
    renderResult(outlet, {
      region: 'wilds',
      eyebrow: `The Wilds · ${week}`,
      title: isRecord ? 'A new record' : 'Gauntlet complete',
      result: stars,
      verdict: isRecord ? `${correct} of ${total} in ${formatClock(record.duration_ms)}. Your best run, kept on the road.` : `${correct} of ${total} in ${formatClock(record.duration_ms)}. Best so far: ${prevBest.score.correct} in ${formatClock(prevBest.duration_ms)}.`,
      facts: [
        { label: 'Right', value: `${correct}/${total}`, good: correct >= total * 0.75 },
        { label: 'Time', value: formatClock(record.duration_ms), good: record.duration_ms < GAUNTLET_MS },
        { label: 'Per word', value: `${(avgMs / 1000).toFixed(1)}s`, good: avgMs < GAUNTLET_MS / total },
      ],
      earned,
      unlocked,
      worldLine: isRecord ? 'The road out remembers a <b>new best</b>.' : '',
        setsDone,
      extraHTML: `<div class="result__facts" style="grid-template-columns:repeat(3,1fr)"><div class="result__fact"><b>${splits.meadow}</b><span>Meadow</span></div><div class="result__fact"><b>${splits.pond}</b><span>Pond</span></div><div class="result__fact"><b>${splits.thicket}</b><span>Thicket</span></div></div>`,
      actions: [
        { label: 'Run again', href: '#/world/place/wilds', primary: true, onClick: () => { location.hash = '#/world/place/wilds'; setTimeout(() => document.querySelector('#run')?.click(), 400); } },
        { label: 'Back to the valley', href: '#/world' },
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
