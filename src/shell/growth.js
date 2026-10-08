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
 * Under the trees are the COLLECTIONS: every finite set in the corpus —
 * a grove of roots, a letter of the CAT lists, a language in the Thicket,
 * a stage of passages — sorted so the one nearest finishing is first. A
 * learner has to be able to think "I only need three more" about
 * something every day, and a percentage has never once said that.
 *
 * Everything analytical that lived here before — the Reading DNA, the
 * lessons kept, the learner's own reflections — is still here, under
 * "The numbers". Nothing was deleted; the default changed.
 */

import { STORES } from '../core/storage/storage-adapter.js';
import { skillToGrow } from '../core/learning/noticing.js';
import { loadRCPassages, listRCItems, loadPJItems, loadPSItems, loadOOOItems, loadWDItems } from '../core/content-loader/loader.js';
import { deriveDNA } from '../core/mentor/dna.js';
import { listLessons, listReflections } from '../core/mentor/records.js';
import { escapeHTML, formatDate } from '../core/utils/format.js';
import { loadWorld } from '../world/state.js';
import { readingWeakness, typeName, weaknessLine } from '../world/curator.js';
/* THE SAME PLANT THE GARDEN GROWS.
   Growth painted one round canopy and scaled it, so a track at "Not started"
   and a track at "Deep" were the same mature tree — and then fitted each one
   to its own canvas independently, which divided the scale straight back out
   again and made all four exactly the same height. The comparison the screen
   exists to make was cancelled by its own fitting.

   cat-plant is the product's existing growth art, and its rule (Guide 6.1)
   is the one this screen needed all along: every stage ADDS a structure the
   previous stage did not have, so each is unmistakable in silhouette at
   thumbnail size. TIERS below already speaks its vocabulary, stage for
   stage. */
import { PET_BY_ID, stageTitle, ageOf } from '../pets/pets.js';
import { petPortrait, petSprite, backdropStyle, FRAME } from '../pets/sprite.js';
import { loadValley, valleyName } from '../world/companion.js';
import { collections, closest, tally, GROUPS } from '../world/collections.js';
import { icon, craftIcon } from '../world/icons.js';

const SUBJECT = { chai: 'Reading', matcha: 'Vocabulary', mochi: 'Para summary', ginger: 'Para jumbles', mallow: 'Odd one out', sesame: 'Para completion', biscuit: 'Sentence placement', toffee: 'CAT pace' };

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

/** What this ability becomes next, so the ladder shows somewhere to go. */
function nextTierName(tier) {
  const i = TIERS.findIndex((t) => t.stage === tier.stage);
  return i >= 0 && i < TIERS.length - 1 ? `Next: ${TIERS[i + 1].name}` : 'Deep';
}

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

  /* "Nothing here yet" and "I could not read what is here" look identical on
     this screen and mean opposite things. If any registry failed to load,
     say so and offer the retry — do not show a learner with a hundred
     sessions the screen that welcomes a new one. */
  if (world?.content?.partial || (!s && sessions.length)) {
    body.removeAttribute('aria-busy');
    body.innerHTML = `
      <div class="reach__empty">
        <h1>Your growth is still loading</h1>
        <p>The library did not finish downloading, so this would not be the whole picture. Nothing is lost: it is all on this device.</p>
        <p><button class="btn btn--primary" onclick="location.reload()">Try again</button></p>
      </div>`;
    return;
  }

  if (!s || (s.reading.read === 0 && s.meadow.met === 0 && s.rootwood.metCount === 0)) {
    body.removeAttribute('aria-busy');
    body.innerHTML = `
      <div class="reach__empty">
        <div class="tower__hero" style="${backdropStyle('clock')}" aria-hidden="true"></div>
        <h1>Eight friends, eight subjects</h1>
        <p>Each friend in the village looks after one part of CAT English. Visit any of them and the clock tower starts keeping time.</p>
        <div class="tower__seedlings">
          ${['chai', 'matcha', 'mochi', 'ginger', 'mallow', 'sesame', 'biscuit', 'toffee'].map((id) => `
            <div class="tower__seed">${petPortrait(id, 54)}<b>${escapeHTML(PET_BY_ID.get(id).name)}</b><span>${escapeHTML(SUBJECT[id])}</span></div>`).join('')}
        </div>
        <a class="g-cta" href="#/world">Into the village<span class="arrow" aria-hidden="true">→</span></a>
      </div>`;
    return;
  }

  /* ---- The four abilities, measured ---- */
  const rcW = readingWeakness(sessions);
  const abilities = measure(s, rcW);
  const sets = collections(s, world?.content ?? null);
  const near = closest(sets, 6);
  const score = tally(sets);
  const weakest = [...abilities].sort((a, b) => a.p - b.p)[0];
  const strongest = [...abilities].sort((a, b) => b.p - a.p)[0];

  body.removeAttribute('aria-busy');
  /* The four abilities on this screen are deliberately coarse — reading,
     vocabulary, verbal, pace — and "what would move most" was chosen from
     them. The skill ledger is finer and is fed by every answer in the app:
     twenty-six abilities, and it knows which one is actually costing marks.
     It only speaks when it has seen a skill at least six times, so a new
     learner still gets the coarse answer, which is the right one for them. */
  let grow = null;
  try { grow = skillToGrow(sessions, world?.records?.learning ?? []); } catch (err) { console.error('[CAT OS] noticing failed', err); }

  body.innerHTML = `
    <div class="tower__hero" style="${backdropStyle('clock')}" aria-hidden="true"><span class="tower__pet">${petSprite('toffee', { size: 64, frame: FRAME.happy })}</span></div>
    <header class="reach__head">
      <p class="reach__eyebrow">The clock tower · how far you have come</p>
      <h1 class="reach__name">${escapeHTML(valleyName(valley))}</h1>
      <p class="reach__line">${headline(strongest, weakest, rcW)}</p>
    </header>

    <div class="reach reach--pets">
      ${abilities.map((a) => `
        <article class="ability petrow petrow--${a.pet?.word ?? 'new'}" data-key="${a.key}">
          <a class="petrow__face" href="${a.href}" aria-label="${escapeHTML(a.name)}: ${escapeHTML(a.cta)}">${petPortrait(a.key, 52, { mood: a.pet ? (a.pet.isNew ? 0.3 : a.pet.mood) : null })}</a>
          <div class="ability__body">
            <p class="ability__what"><b>${escapeHTML(PET_BY_ID.get(a.key).name)}</b> · ${escapeHTML(a.name)}<span class="petrow__stage">${escapeHTML(ageOf(a.pet?.stage).name)}${a.pet?.stage ? ` · stage ${a.pet.stage} · ${escapeHTML(stageTitle(a.key, a.pet.stage))}` : ''}</span></p>
            <p class="ability__tier">${escapeHTML(a.tier.name)}</p>
            <p class="ability__line">${a.line}</p>
            <p class="ability__pips" aria-label="Stage ${TIERS.findIndex((t) => t.stage === a.tier.stage) + 1} of ${TIERS.length}">${
              TIERS.map((t, i) => `<i class="${i <= TIERS.findIndex((x) => x.stage === a.tier.stage) ? 'is-on' : ''}"></i>`).join('')
            }<small>${escapeHTML(nextTierName(a.tier))}</small></p>
          </div>
          <div class="ability__stars" aria-label="${a.stars} of 3">${'★'.repeat(a.stars)}<i>${'☆'.repeat(3 - a.stars)}</i></div>
          <div class="ability__bar" aria-hidden="true"><i style="width:${Math.round(a.p * 100)}%"></i></div>
        </article>`).join('')}
    </div>

    <section class="reach__next">
      <p class="reach__nextlabel">What would move most</p>
      <h2>${escapeHTML(grow?.name ?? weakest.name)}</h2>
      <p>${escapeHTML(grow ? grow.line : weakest.advice)}</p>
      ${grow ? `<p class="reach__nextseen">${grow.seen} questions have asked for it so far.</p>` : ''}
      <a class="g-cta" href="${grow ? `#/world/place/${grow.where}` : weakest.href}">${escapeHTML(grow ? `Go where ${grow.name.toLowerCase()} is trained` : weakest.cta)}<span class="arrow" aria-hidden="true">→</span></a>
    </section>

    <section class="sets">
      <h2 class="sets__head">
        <span>Collections</span>
        <b>${score.done ? `${score.done} of ${score.total} finished` : `${score.total} sets to finish`}</b>
      </h2>
      <p class="sets__line">Every set the valley keeps. These are the six closest to done.</p>
      <div class="sets__grid" id="sets-grid">${near.map(setCard).join('')}</div>
      <details class="sets__all">
        <summary>All collections</summary>
        <div id="sets-all"></div>
      </details>
    </section>

    <details class="reach__numbers">
      <summary>The numbers</summary>
      <div id="numbers"></div>
    </details>`;

  // The bars fill from nothing on arrival: progress that moves is read as
  // progress; progress already at its mark is read as a printed figure.
  for (const bar of body.querySelectorAll('.ability__bar i')) {
    const w = bar.style.width; bar.style.width = '0%';
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = w; }));
  }

  /* ---- All the collections, on request. There are a hundred and more of
          them; six is the screen, the rest is the shelf behind it. ---- */
  const allBox = body.querySelector('#sets-all');
  body.querySelector('.sets__all')?.addEventListener('toggle', (e) => {
    if (!e.currentTarget.open || allBox.dataset.done) return;
    allBox.dataset.done = '1';
    allBox.innerHTML = GROUPS.map((g) => {
      const mine = sets.filter((c) => c.group === g.key && c.total > 0)
        .sort((a, b) => Number(b.done) - Number(a.done) || a.left - b.left);
      if (!mine.length) return '';
      const done = mine.filter((c) => c.done).length;
      return `<section class="sets__group">
        <h3>${craftIcon(g.craft, { size: 16 })}${escapeHTML(g.name)}<b>${done}/${mine.length}</b></h3>
        <div class="sets__grid">${mine.map(setCard).join('')}</div>
      </section>`;
    }).join('');
  }, true);

  /* ---- The numbers: everything this screen used to say, on request ---- */
  const numbers = body.querySelector('#numbers');
  body.querySelector('.reach__numbers')?.addEventListener('toggle', async (e) => {
    if (!e.currentTarget.open || numbers.dataset.done) return;
    numbers.dataset.done = '1';
    numbers.innerHTML = '<div class="skeleton"></div>';
    numbers.innerHTML = await renderNumbers({ s, rcW, sessions, lessons, reflections, items, storage });
  }, true);
}

/**
 * One collection, as a card small enough that six of them fit on a phone
 * without scrolling: the mark, the name, and how many are left. The word
 * on a card is never a percentage — it is "Two to go".
 */
function setCard(c) {
  const p = Math.round(c.p * 100);
  return `<a class="setc ${c.done ? 'is-done' : ''} ${c.started ? '' : 'is-new'} ${c.close ? 'is-close' : ''}" href="${c.route}">
    <span class="setc__mk">${icon(c.mark, { size: 22 })}</span>
    <span class="setc__body">
      <b class="setc__name">${escapeHTML(c.name)}</b>
      <span class="setc__n">${c.done ? 'Finished' : `${c.have}<i>/${c.total}</i> ${escapeHTML(c.unit)}`}</span>
    </span>
    <span class="setc__near">${c.done ? '✓' : escapeHTML(c.near)}</span>
    <span class="setc__bar" aria-hidden="true"><i style="width:${p}%"></i></span>
  </a>`;
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

  /* THE VERBAL BENCHES — each its own friend: solved, plus the bank that
     lives with it (placement with the jumbles). Completion is Sesame's own. */
  const bench = (v, bank) => clamp01((v.solved + (bank?.solved ?? 0)) / Math.max(1, v.total + (bank?.total ?? 0)));
  const jumbles = bench(s.loom), summary = bench(s.table), odd = bench(s.bench);
  const pcBank = s.banks?.pc ?? { solved: 0, total: 0 }, spBank = s.banks?.sp ?? { solved: 0, total: 0 };
  const completion = clamp01(pcBank.solved / Math.max(1, pcBank.total));
  const placement = clamp01(spBank.solved / Math.max(1, spBank.total));

  /* PACE — the Gauntlet is everything at once against the clock: its best
     run, and whether it has become a habit. */
  const pace = clamp01(((s.wilds.best ?? 0) / 3) * 0.65 + Math.min(1, (s.wilds.runs ?? 0) / 8) * 0.35);
  const petOf = (id) => s.pets?.pets.find((p) => p.id === id) ?? null;

  const weakType = rcW?.weakest ? typeName(rcW.weakest) : null;

  return [
    {
      key: 'chai', pet: petOf('chai'), name: 'Reading', craft: 'ink', p: reading, tier: tierFor(reading), stars: starsFor(reading),
      line: `<b>${s.reading.read}</b> of ${s.reading.passages} passages · <b>${s.reading.stars}</b> stars`,
      advice: weakType
        ? `${weakType} questions are the ones getting away. The next passage the curator picks will be heavy on them.`
        : 'More passages, against the clock. Reading is the one ability that only grows by reading.',
      href: '#/world/place/reading-room', cta: 'Read with Chai',
    },
    {
      key: 'matcha', pet: petOf('matcha'), name: 'Vocabulary', craft: 'amber', p: vocab, tier: tierFor(vocab), stars: starsFor(vocab),
      line: `<b>${s.meadow.mastered + s.pond.mastered + s.thicket.mastered}</b> words held · <b>${s.rootwood.metCount}</b> root families`,
      advice: s.meadow.due + s.pond.due + s.thicket.due > 8
        ? `${s.meadow.due + s.pond.due + s.thicket.due} words are due for another look. Catching them is worth more than meeting new ones.`
        : 'Roots move this fastest: one family opens a dozen words at once.',
      href: s.meadow.due > 6 ? '#/round/meadow' : '#/world/place/rootwood',
      cta: s.meadow.due > 6 ? 'A word round with Matcha' : 'Root families with Matcha',
    },
    {
      key: 'mochi', pet: petOf('mochi'), name: 'Para summary', craft: 'thread', p: summary, tier: tierFor(summary), stars: starsFor(summary),
      line: `<b>${s.table.solved}</b> of ${s.table.total} summaries`,
      advice: 'Say the paragraph in one line before you read the options. The gist first, then the choice.',
      href: '#/world/place/table', cta: 'Find the gist with Mochi',
    },
    {
      key: 'ginger', pet: petOf('ginger'), name: 'Para jumbles', craft: 'thread', p: jumbles, tier: tierFor(jumbles), stars: starsFor(jumbles),
      line: `<b>${s.loom.solved}</b> of ${s.loom.total} jumbles`,
      advice: 'Find the opening sentence first, then follow the pronouns and the links. The route shows itself.',
      href: '#/world/place/loom', cta: 'Map a paragraph with Ginger',
    },
    {
      key: 'mallow', pet: petOf('mallow'), name: 'Odd one out', craft: 'thread', p: odd, tier: tierFor(odd), stars: starsFor(odd),
      line: `<b>${s.bench.solved}</b> of ${s.bench.total} sets`,
      advice: 'Build the paragraph the other four sentences make. The one left over is the stranger.',
      href: '#/world/place/bench', cta: 'Spot the odd one with Mallow',
    },
    {
      key: 'sesame', pet: petOf('sesame'), name: 'Para completion', craft: 'thread', p: completion, tier: tierFor(completion), stars: starsFor(completion),
      line: `<b>${pcBank.solved}</b> of ${pcBank.total} completions`,
      advice: 'Read the sentence before the gap and the one after it. Decide what the gap must do before you look at the options.',
      href: '#/world/place/completion', cta: 'Fill a gap with Sesame',
    },
    {
      key: 'biscuit', pet: petOf('biscuit'), name: 'Sentence placement', craft: 'thread', p: placement, tier: tierFor(placement), stars: starsFor(placement),
      line: `<b>${spBank.solved}</b> of ${spBank.total} placements`,
      advice: 'Read the loose sentence first and ask what it needs before it. Then try each gap and read both neighbours.',
      href: '#/world/place/placement', cta: 'Seat a sentence with Biscuit',
    },
    {
      key: 'toffee', pet: petOf('toffee'), name: 'CAT pace', craft: 'ember', p: pace, tier: tierFor(pace), stars: starsFor(pace),
      line: `best Gauntlet <b>${s.wilds.best ?? 0}</b> of 3 stars · <b>${s.wilds.runs ?? 0}</b> runs`,
      advice: 'Accuracy first, then speed. Take a run you could already do well and try to do it inside the pace ring.',
      href: '#/world/place/wilds', cta: 'Run the Gauntlet with Toffee',
    },
  ];
}

function headline(strongest, weakest, rcW) {
  const bits = [];
  if (strongest.p > 0.05) bits.push(`Your <b>${escapeHTML(strongest.name.toLowerCase())}</b> is the furthest along.`);
  if (weakest.p < strongest.p - 0.05) bits.push(`Your <b>${escapeHTML(weakest.name.toLowerCase())}</b> has the most room.`);
  if (!bits.length) bits.push('Every friend is just getting to know you.');
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
        ['Village level', String(s.pets.level.level)],
        ['Village Glow', String(s.pets.glow)],
        ['Days practised', String(s.hearth.activeDays)],
        ['Longest run', `${s.hearth.streak.best} days`],
      ].map(([k, v]) => `<div class="nums__row nums__row--plain"><span>${escapeHTML(k)}</span><b>${escapeHTML(v)}</b></div>`).join('')}
    </div>`);

  /* The mentor's observations, if reading has given it enough to see. */
  try {
    const rcSessions = sessions.filter((x) => !x.module && x.passage_id);
    if (rcSessions.length >= 2) {
      /* Only the passages these sessions were read from. deriveDNA looks each
         one up as `passages.get(s.passage_id)` (core/mentor/dna.js) and never
         touches the rest, but this asked for every id in the registry — all
         115 passages, 3.57 MB of JSON, parsed and schema-validated on every
         open of the screen a learner opens most, and growing with the corpus
         rather than with anything the learner has done. A reader with a dozen
         sessions now fetches a dozen files. */
      const read = [...new Set(rcSessions.map((x) => x.passage_id).filter(Boolean))];
      const passages = await loadRCPassages(read).catch(() => []);
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
        ${lessons.slice(0, 6).map((l) => `<p class="nums__obs"><b>${escapeHTML(l.title ?? '')}</b>${l.recall ? `${escapeHTML(l.recall)}` : ''}</p>`).join('')}
      </div>`);
  }
  if (reflections.length) {
    out.push(`
      <div class="nums">
        <p class="nums__label">What you said about it</p>
        ${reflections.slice(0, 4).map((r) => `<p class="nums__obs"><i>${escapeHTML(r.text ?? '')}</i><small>…${escapeHTML(formatDate(r.updated_at ?? ''))}</small></p>`).join('')}
      </div>`);
  }

  return out.join('');
}

/* ------------------------------------------------------------------ */
/* The trees                                                           */
/* ------------------------------------------------------------------ */

