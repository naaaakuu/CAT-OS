/**
 * growth.js (shell screen) — your reach.
 *
 * Rebuilt for the 2026-09-12 brief (§17). This screen used to be a page of
 * observations about reading. It is now the game's progression screen, and
 * it answers one question before the learner reads a word:
 *
 *     how is my character getting stronger?
 *
 * Four abilities, four trees. A tree at its sixth stage is not a number
 * dressed up — it is the same sprite the valley itself is made of, at the
 * stage the learner's own record has earned, so the picture and the world
 * are telling the same truth in the same language.
 *
 *   READING     passages finished, stars taken, the type you keep missing
 *   VOCABULARY  words, roots, twins, loanwords and word parts held
 *   VERBAL      jumbles, summaries and strangers solved
 *   PACE        right AND inside the clock — the rarest of the four
 *
 * Everything analytical that lived here before — the Reading DNA, the
 * lessons kept, the learner's own reflections — is still here, under
 * "The numbers". Nothing was deleted; the default changed.
 */

import { STORES } from '../core/storage/storage-adapter.js';
import { loadRCPassages, listRCItems, loadPJItems, loadPSItems, loadOOOItems, loadWDItems } from '../core/content-loader/loader.js';
import { deriveDNA } from '../core/mentor/dna.js';
import { listLessons, listReflections } from '../core/mentor/records.js';
import { escapeHTML, formatDate } from '../core/utils/format.js';
import { loadWorld } from '../world/state.js';
import { readingWeakness, typeName, weaknessLine } from '../world/curator.js';
import { sprite } from '../world/engine/sprites.js';
import { loadValley, valleyName } from '../world/companion.js';
import { craft } from '../world/economy.js';

/** The six stages a tree can stand at, and what each one is called when
 *  the thing growing is an ability rather than an oak. */
const TIERS = [
  { stage: 'seed', name: 'Not started', at: 0 },
  { stage: 'sprout', name: 'Seedling', at: 0.02 },
  { stage: 'young', name: 'Taking root', at: 0.12 },
  { stage: 'in_leaf', name: 'Growing', at: 0.3 },
  { stage: 'mature', name: 'Strong', at: 0.56 },
  { stage: 'ancient', name: 'Deep', at: 0.8 },
];

function tierFor(p) {
  let t = TIERS[0];
  for (const x of TIERS) if (p >= x.at) t = x;
  return t;
}

/** 0–3 stars for an ability, from the same two demands CAT makes. */
function starsFor(p) { return p >= 0.75 ? 3 : p >= 0.45 ? 2 : p >= 0.15 ? 1 : 0; }

export async function renderGrowth(outlet, { storage }) {
  outlet.innerHTML = `
    <section class="screen growth">
      <div id="growth-body" aria-busy="true">
        <div class="skeleton skeleton--line" style="width: 45%"></div>
        <div class="skeleton"></div><div class="skeleton"></div>
      </div>
    </section>`;
  const body = outlet.querySelector('#growth-body');

  let world = null, valley = { name: null }, sessions = [], lessons = [], reflections = [], items = [];
  try {
    [world, valley, sessions, lessons, reflections, items] = await Promise.all([
      loadWorld(storage).catch(() => null),
      loadValley(storage).catch(() => ({ name: null })),
      storage.getAll(STORES.SESSIONS).catch(() => []),
      listLessons(storage).catch(() => []),
      listReflections(storage).catch(() => []),
      listRCItems().catch(() => []),
    ]);
  } catch { /* the empty state below still renders */ }

  if (!body.isConnected) return;
  const s = world?.state ?? null;

  if (!s || (s.reading.read === 0 && s.meadow.met === 0 && s.rootwood.metCount === 0)) {
    body.removeAttribute('aria-busy');
    body.innerHTML = `
      <div class="reach__empty">
        <canvas class="reach__seed" width="96" height="112" aria-hidden="true"></canvas>
        <h1>Nothing has grown yet</h1>
        <p>Four things grow here: your reading, your words, your grip on an argument, and your speed under a clock. One session starts all of them.</p>
        <a class="g-cta" href="#/world">Into the valley<span class="arrow" aria-hidden="true">→</span></a>
      </div>`;
    paintTree(body.querySelector('.reach__seed'), 'sprout', 4);
    return;
  }

  /* ---- The four abilities, measured ---- */
  const rcW = readingWeakness(sessions);
  const abilities = measure(s, rcW);
  const weakest = [...abilities].sort((a, b) => a.p - b.p)[0];
  const strongest = [...abilities].sort((a, b) => b.p - a.p)[0];

  body.removeAttribute('aria-busy');
  body.innerHTML = `
    <header class="reach__head">
      <p class="reach__eyebrow">Your reach</p>
      <h1 class="reach__name">${escapeHTML(valleyName(valley))}</h1>
      <p class="reach__line">${headline(strongest, weakest, rcW)}</p>
    </header>

    <div class="reach">
      ${abilities.map((a) => `
        <article class="ability ability--${a.craft}" data-key="${a.key}">
          <canvas class="ability__tree" width="128" height="168" aria-hidden="true" data-stage="${a.tier.stage}"></canvas>
          <div class="ability__body">
            <p class="ability__what">${escapeHTML(a.name)}</p>
            <p class="ability__tier">${escapeHTML(a.tier.name)}</p>
            <p class="ability__line">${a.line}</p>
          </div>
          <div class="ability__stars" aria-label="${a.stars} of 3">${'★'.repeat(a.stars)}${'☆'.repeat(3 - a.stars)}</div>
          <div class="ability__bar" aria-hidden="true"><i style="width:${Math.round(a.p * 100)}%"></i></div>
        </article>`).join('')}
    </div>

    <section class="reach__next">
      <p class="reach__nextlabel">What would move most</p>
      <h2>${escapeHTML(weakest.name)}</h2>
      <p>${escapeHTML(weakest.advice)}</p>
      <a class="g-cta" href="${weakest.href}">${escapeHTML(weakest.cta)}<span class="arrow" aria-hidden="true">→</span></a>
    </section>

    <details class="reach__numbers">
      <summary>The numbers</summary>
      <div id="numbers"></div>
    </details>`;

  for (const cv of body.querySelectorAll('.ability__tree')) paintTree(cv, cv.dataset.stage, 3);

  /* ---- The numbers: everything this screen used to say, on request ---- */
  const numbers = body.querySelector('#numbers');
  body.querySelector('.reach__numbers')?.addEventListener('toggle', async (e) => {
    if (!e.currentTarget.open || numbers.dataset.done) return;
    numbers.dataset.done = '1';
    numbers.innerHTML = '<div class="skeleton"></div>';
    numbers.innerHTML = await renderNumbers({ s, rcW, sessions, lessons, reflections, items, storage });
  }, true);
}

/* ------------------------------------------------------------------ */
/* Measuring                                                           */
/* ------------------------------------------------------------------ */

function measure(s, rcW) {
  const clamp01 = (n) => Math.max(0, Math.min(1, n));

  /* READING — how much of the corpus has been read, weighted by how well. */
  const readP = s.reading.passages ? s.reading.read / s.reading.passages : 0;
  const starP = s.reading.maxStars ? s.reading.stars / s.reading.maxStars : 0;
  const reading = clamp01(readP * 0.45 + starP * 0.55);

  /* VOCABULARY — every word-shaped thing the valley knows about. */
  const vocabHeld = s.meadow.mastered + s.pond.mastered + s.thicket.mastered
    + s.rootwood.metCount * 6 + s.terraces.done * 8;
  const vocabAll = Math.max(1, s.meadow.total + s.pond.total + s.thicket.total
    + s.rootwood.total * 6 + s.terraces.total * 8);
  const vocab = clamp01(vocabHeld / vocabAll);

  /* VERBAL — the three benches of the Quarter. */
  const vSolved = s.loom.solved + s.table.solved + s.bench.solved;
  const vAll = Math.max(1, s.loom.total + s.table.total + s.bench.total);
  const verbal = clamp01(vSolved / vAll);

  /* PACE — Embers are only ever struck by a three-star run, so the share of
     runs that struck one IS the measure of right-and-in-time. */
  // Every finished run is a chance at an Ember and almost none of them
  // take it, so the share of runs that did IS the pace measure.
  const runs = s.reading.read + s.loom.solved + s.table.solved + s.bench.solved
    + s.rootwood.grownCount + (s.wilds.runs ?? 0);
  const pace = clamp01((s.earned?.ember ?? 0) / Math.max(24, runs * 0.9));

  const weakType = rcW?.weakest ? typeName(rcW.weakest) : null;

  return [
    {
      key: 'reading', name: 'Reading', craft: 'ink', p: reading, tier: tierFor(reading), stars: starsFor(reading),
      line: `<b>${s.reading.read}</b> of ${s.reading.passages} passages · <b>${s.reading.stars}</b> stars`,
      advice: weakType
        ? `${weakType} questions are the ones getting away. The next passage the curator picks will be heavy on them.`
        : 'More passages, against the clock. Reading is the one ability that only grows by reading.',
      href: '#/world/place/reading-room', cta: 'To the Reading Room',
    },
    {
      key: 'vocab', name: 'Vocabulary', craft: 'amber', p: vocab, tier: tierFor(vocab), stars: starsFor(vocab),
      line: `<b>${s.meadow.mastered + s.pond.mastered + s.thicket.mastered}</b> words held · <b>${s.rootwood.metCount}</b> root families`,
      advice: s.meadow.due + s.pond.due + s.thicket.due > 8
        ? `${s.meadow.due + s.pond.due + s.thicket.due} words are due for another look. Catching them is worth more than meeting new ones.`
        : 'Roots move this fastest: one family opens a dozen words at once.',
      href: s.meadow.due > 6 ? '#/round/meadow' : '#/world/place/rootwood',
      cta: s.meadow.due > 6 ? 'A round in the Meadow' : 'Into the Rootwood',
    },
    {
      key: 'verbal', name: 'Verbal', craft: 'thread', p: verbal, tier: tierFor(verbal), stars: starsFor(verbal),
      line: `<b>${vSolved}</b> of ${vAll} solved at the Quarter`,
      advice: 'Jumbles, summaries and strangers train the same muscle: seeing the shape of an argument before you agree with it.',
      href: '#/world/place/loom', cta: 'To the Quarter',
    },
    {
      key: 'pace', name: 'CAT pace', craft: 'ember', p: pace, tier: tierFor(pace), stars: starsFor(pace),
      line: `<b>${s.earned?.ember ?? 0}</b> Embers struck · three stars means right <i>and</i> in time`,
      advice: 'Accuracy first, then speed. Take a run you could already do well and try to do it inside the pace ring.',
      href: '#/world/place/wilds', cta: 'To the Wilds',
    },
  ];
}

function headline(strongest, weakest, rcW) {
  const bits = [];
  if (strongest.p > 0.05) bits.push(`Your <b>${escapeHTML(strongest.name.toLowerCase())}</b> is the furthest along.`);
  if (weakest.p < strongest.p - 0.05) bits.push(`Your <b>${escapeHTML(weakest.name.toLowerCase())}</b> has the most room.`);
  if (!bits.length) bits.push('All four are just starting.');
  if (rcW?.weakest) bits.push(`Inside reading, it is <b>${escapeHTML(typeName(rcW.weakest))}</b>.`);
  return bits.join(' ');
}

/* ------------------------------------------------------------------ */
/* The numbers                                                         */
/* ------------------------------------------------------------------ */

async function renderNumbers({ s, rcW, sessions, lessons, reflections, items, storage }) {
  const out = [];

  /* Reading, by question type — the actual learner model, shown plainly
     for anyone who wants it. The game itself never needs this screen. */
  const rows = [...(rcW?.byType ?? new Map()).entries()]
    .filter(([, e]) => e.n >= 2)
    .sort((a, b) => a[1].acc - b[1].acc);
  if (rows.length) {
    out.push(`
      <div class="nums">
        <p class="nums__label">Reading, by question type</p>
        ${rows.map(([t, e]) => `
          <div class="nums__row">
            <span>${escapeHTML(typeName(t))}</span>
            <span class="nums__bar"><i style="width:${Math.round(e.acc * 100)}%"></i></span>
            <b>${Math.round(e.acc * 100)}%</b>
            <small>${e.n} seen</small>
          </div>`).join('')}
      </div>`);
  }

  /* The places, counted. */
  out.push(`
    <div class="nums">
      <p class="nums__label">The valley, counted</p>
      ${[
        ['Passages read', `${s.reading.read} / ${s.reading.passages}`],
        ['Reading stars', `${s.reading.stars} / ${s.reading.maxStars}`],
        ['Words in bloom', `${s.meadow.mastered} / ${s.meadow.total}`],
        ['Twins told apart', `${s.pond.mastered} / ${s.pond.total}`],
        ['Loanwords', `${s.thicket.mastered} / ${s.thicket.total}`],
        ['Root families met', `${s.rootwood.metCount} / ${s.rootwood.total}`],
        ['Word parts climbed', `${s.terraces.done} / ${s.terraces.total}`],
        ['Quarter solved', `${s.loom.solved + s.table.solved + s.bench.solved} / ${s.loom.total + s.table.total + s.bench.total}`],
        ['Works built', `${s.builds.length} / ${s.works.length}`],
        ['Days practised', String(s.hearth.activeDays)],
        ['Longest run', `${s.hearth.streak.best} days`],
      ].map(([k, v]) => `<div class="nums__row nums__row--plain"><span>${escapeHTML(k)}</span><b>${escapeHTML(v)}</b></div>`).join('')}
    </div>`);

  /* The mentor's observations, if reading has given it enough to see. */
  try {
    const rcSessions = sessions.filter((x) => !x.module && x.passage_id);
    if (rcSessions.length >= 2) {
      const passages = await loadRCPassages(items.map((i) => i.id)).catch(() => []);
      const dna = deriveDNA(rcSessions, passages);
      const obs = (dna?.observations ?? []).slice(0, 4);
      if (obs.length) {
        out.push(`
          <div class="nums">
            <p class="nums__label">How you read</p>
            ${obs.map((o) => `<p class="nums__obs"><b>${escapeHTML(o.title ?? '')}</b> ${escapeHTML(o.body ?? o.text ?? '')}</p>`).join('')}
          </div>`);
      }
    }
  } catch { /* observations are a bonus, never a requirement */ }

  if (lessons.length) {
    out.push(`
      <div class="nums">
        <p class="nums__label">Lessons kept (${lessons.length})</p>
        ${lessons.slice(0, 6).map((l) => `<p class="nums__obs"><b>${escapeHTML(l.title ?? '')}</b>${l.recall ? ` — ${escapeHTML(l.recall)}` : ''}</p>`).join('')}
      </div>`);
  }
  if (reflections.length) {
    out.push(`
      <div class="nums">
        <p class="nums__label">What you said about it</p>
        ${reflections.slice(0, 4).map((r) => `<p class="nums__obs"><i>${escapeHTML(r.text ?? '')}</i><small> — ${escapeHTML(formatDate(r.updated_at ?? ''))}</small></p>`).join('')}
      </div>`);
  }

  return out.join('');
}

/* ------------------------------------------------------------------ */
/* The trees                                                           */
/* ------------------------------------------------------------------ */

function paintTree(cv, stage, scale = 3) {
  if (!cv) return;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const s = sprite('tree', { stage, seed: `reach:${stage}`, season: 'summer' });
  const z = Math.max(1, Math.min(scale, Math.floor(cv.height / s.h), Math.floor(cv.width / s.w)));
  const w = s.w * z, h = s.h * z;
  ctx.clearRect(0, 0, cv.width, cv.height);
  // Bottom-aligned and centred: four trees on one ground line, so their
  // heights are the comparison the screen is making.
  ctx.drawImage(s.canvas, Math.round((cv.width - w) / 2), cv.height - h - 4, w, h);
}
