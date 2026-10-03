/**
 * place.js (screen) — inside a place.
 *
 * The frame is the same everywhere: the host friend's home, from the
 * village painting, across the top with the friend at its door; under it
 * the one thing worth doing here, chosen by the curator; and under that,
 * in the open, everything the place holds (every passage, tier and field),
 * so nothing is ever hidden behind a pull.
 *
 *   HERO    the friend's home, and the friend
 *   TOP     eyebrow · name · progress · ONE action
 *   MORE    the full contents of the place
 */

import { atPlace } from '../companion.js';
import { petForPlace, PET_BY_ID } from '../../pets/pets.js';
import { petFigure, petPortrait, backdropStyle, FRAME } from '../../pets/sprite.js';
import { regionBySlug } from '../regions.js';
import { loadWorld } from '../state.js';
import { starHTML } from './result.js';
import { nextPassage, nextFamily, readingWeakness, typeName, missedQuestions, secondLookLine } from '../curator.js';
import { play, unlock, startMusic, startAmbience } from '../audio.js';
import { escapeHTML } from '../../core/utils/format.js';
import { STAGES } from '../../core/engine/garden-session.js';
import { STAGE_INFO, groupByStage } from '../../core/learning/journey.js';
import { PJ_TIERS } from '../../modules/para-jumbles/logic/tiers.js';
import { PS_TIERS } from '../../modules/para-summary/logic/tiers.js';
import { OOO_TIERS } from '../../modules/odd-one-out/logic/tiers.js';
import { renderHearth } from './hearth.js';
import { renderWilds } from './wilds.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { infoButton } from '../../ui/info.js';
import { verbalTrio } from '../../pets/next.js';

const STAGE_WORD = { open_ground: 'Unmet', seed: 'A seed', sprout: 'Sprout', young: 'Young', in_leaf: 'In leaf', mature: 'Mature', ancient: 'Ancient' };
/** A tree's stage, in one typographic mark. Deliberately not emoji: the
 *  valley draws its own trees, and a system glyph beside them looks like a
 *  different product. */
const STAGE_GLYPH = { open_ground: '◌', seed: '·', sprout: '\u2027', young: '\u2038', in_leaf: '\u25B4', mature: '\u25B2', ancient: '\u2663' };

export async function renderPlace(outlet, { storage }, params) {
  const region = regionBySlug(params.slug);
  // replace(), not a hash assignment: a bad address pushed a history entry,
  // so Back took the learner straight to the bad address again and they were
  // trapped bouncing between the two.
  if (!region) { location.replace('#/world'); return; }
  if (region.slug === 'hearth') return renderHearth(outlet, { storage });
  if (region.slug === 'wilds') return renderWilds(outlet, { storage });
  document.documentElement.setAttribute('data-world', '');

  const arrivedAt = location.hash;
  let world;
  try { world = await loadWorld(storage); } catch (err) {
    outlet.innerHTML = `<section class="place"><div class="place__body" style="padding-top:60px"><h1 class="place__title">This place will not open</h1><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }
  // Left while it loaded: no place music under the next screen.
  if (location.hash !== arrivedAt) return;
  const { state, content } = world;
  const atmo = state.atmo;
  const host = petForPlace(region.slug) ?? 'toffee';
  const hostDef = PET_BY_ID.get(host);
  const hostState = state.pets?.pets.find((p) => p.id === host);

  outlet.innerHTML = `
    <section class="place place--page" aria-label="${escapeHTML(region.name)}">
      <div class="place__hero place__hero--short place__hero--painted" style="${backdropStyle(SECOND_HOUSE[region.slug] ?? host)}">
        <a class="place__back" href="#/world" id="back">← Village</a>
        <div class="place__hero-stat" id="hero-stat"></div>
        <span class="place__pet place__pet--door place__pet--${host}" aria-hidden="true">${petFigure(host, { size: 104, frame: FRAME.happy, stage: hostState?.stage ?? 0 })}</span>
      </div>
      <div class="place__body">
        <div class="placewick is-in" id="placewick" hidden>${petPortrait(host, 38)}<p></p></div>
        <div class="sheet__top" id="top"></div>
        <div class="sheet__more" id="more"></div>
      </div>
    </section>`;

  const heroStat = outlet.querySelector('#hero-stat');
  const top = outlet.querySelector('#top');
  const more = outlet.querySelector('#more');
  outlet.querySelector('#back').addEventListener('click', () => { sessionStorage.setItem('world:focus', region.slug); play('close'); });

  /* The host meets you at the door and says how they are: the same line
     their card on the map would. */
  {
    const line = hostState?.line || atPlace(region.slug, state);
    const el = outlet.querySelector('#placewick');
    if (line && el) { el.querySelector('p').textContent = line; el.hidden = false; }
  }

  const warmth = Math.min(1, (state.pets?.harmony ?? 0.4) * 0.6 + Math.min(1, state.stars / 90) * 0.4);
  const onDown = () => { unlock(); startMusic(region.slug, { hour: atmo.hour, warmth }); startAmbience(region.slug, atmo); };
  window.addEventListener('pointerdown', onDown, { capture: true, once: true });
  startMusic(region.slug, { hour: atmo.hour, warmth }); startAmbience(region.slug, atmo);
  // Leaving takes the listener: a keyboard learner's first click elsewhere must not start this place's music.
  window.addEventListener('hashchange', () => { window.removeEventListener('pointerdown', onDown, { capture: true }); }, { once: true });

  /** The top: who this place is, how far it has come, and the one thing
   *  the curator says to do now. What the place teaches, and how, waits
   *  behind the ⓘ beside its name (`info`), never in the way of the button. */
  const head = (progress, cta, note, info = '') => {
    top.innerHTML = `
      <p class="place__eyebrow">${escapeHTML(region.skill ?? '')} · with ${escapeHTML(hostDef.name)}</p>
      <h1 class="place__title">${escapeHTML(region.name)}${info}</h1>
      ${progress ? `<div class="place__progress"><div class="bar"><i style="width:${Math.round(progress.pct * 100)}%"></i></div><b>${progress.label}</b></div>` : ''}
      ${cta ? `<a class="g-cta ${cta.gold ? 'g-cta--gold' : ''}" href="${cta.href}" id="cta">${escapeHTML(cta.label)}<small>${escapeHTML(cta.sub ?? '')}</small><span class="arrow" aria-hidden="true">→</span></a>` : ''}
      ${note ? `<p class="place__note">${escapeHTML(note)}</p>` : ''}`;
    requestAnimationFrame(() => top.classList.add('is-in'));
    top.querySelector('#cta')?.addEventListener('click', () => play('open'));
  };
  const section = (title, sub, html) => `
    <section class="place__section">
      <h2>${escapeHTML(title)}</h2>
      ${sub ? `<p class="sub">${sub}</p>` : ''}
      ${html}
    </section>`;

  /* ================= The Rootwood ================= */
  if (region.slug === 'rootwood') {
    const rw = state.rootwood;
    const pick = nextFamily(rw);
    const f = pick?.family ?? rw.families[0];
    const cta = f ? {
      href: `#/garden/session/${f.id}`,
      label: pick.kind === 'due' ? `Revisit ${f.label}` : pick.kind === 'new' ? `Grow ${f.label}` : `Walk ${f.label}`,
      sub: `${f.origin} · “${f.meaning}” · ${f.memberCount} words`,
      gold: pick.kind === 'due',
    } : null;
    let selected = rw.groves.find((g) => g.families.some((x) => x.id === f?.id)) ?? rw.groves[0];
    heroStat.innerHTML = pill(`\u2663 ${rw.grownCount} grown`);
    const info = infoButton('vocab', { moreTitle: 'This place', more: ['Take one root apart and a family of words opens. A family you have met comes back to be walked again before it fades.'] });
    const renderGrove = () => {
      const fams = selected.families;
      head({ pct: rw.total ? rw.metCount / rw.total : 0, label: `${rw.metCount} / ${rw.total} families` }, cta, pick?.why, info);
      more.innerHTML = section('Six groves', 'Roots that share a field of meaning stand together. Choose a grove to walk.', `
        <div class="g-chiprow">${rw.groves.map((g) => `<button class="g-chip" data-grove="${g.slug}" aria-pressed="${g.slug === selected.slug}">${escapeHTML(g.name.replace('The Grove of ', ''))} ${g.grown ? '✦' : `${g.met}/${g.families.length}`}</button>`).join('')}</div>
        <p class="sub"><i>${escapeHTML(selected.line)}</i></p>
        <div class="g-list">
          ${fams.map((x) => {
            const unmet = x.stage === 'open_ground';
            const href = unmet || x.due !== 'none' ? `#/garden/session/${x.id}` : `#/garden/plant/${x.id}`;
            const meta = unmet ? `${escapeHTML(x.origin)} · a root-stone waiting to be planted` : `${escapeHTML(x.origin)} · “${escapeHTML(x.meaning)}” · ${x.memberCount} words${x.landmark ? ' · Landmark' : ''}`;
            const cls = x.due !== 'none' ? 'g-row--next' : unmet ? 'g-row--stone' : '';
            return `<a class="g-row ${cls}" href="${href}"><span class="g-row__num" aria-hidden="true">${STAGE_GLYPH[x.stage] ?? '◌'}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(x.label)}${unmet ? '' : ` <small>· ${STAGE_WORD[x.stage]}</small>`}</span><span class="g-row__meta">${meta}</span></span><span class="g-row__stars" aria-hidden="true">${x.due === 'gold' ? '✦ asking' : x.due === 'bare' ? '✧ waiting' : ''}</span></a>`;
          }).join('')}
        </div>`);
      for (const b of more.querySelectorAll('[data-grove]')) b.addEventListener('click', () => { selected = rw.groves.find((g) => g.slug === b.dataset.grove); play('page'); renderGrove(); });
    };
    renderGrove();
    return;
  }

  /* ================= The Meadow / Pond / Thicket ================= */
  if (region.slug === 'meadow' || region.slug === 'pond' || region.slug === 'thicket') {
    const r = state[region.slug];
    const fields = r.fields;
    const unit = region.slug === 'pond' ? 'twins' : 'words';
    const bloomPct = r.total ? r.mastered / r.total : 0;
    heroStat.innerHTML = pill(`★ ${r.stars}`);

    // The curator's round is the only action that matters here.
    const cta = {
      href: `#/round/${region.slug}`,
      label: r.due >= 5 ? 'Take the words that are fading' : r.met ? 'Take a round' : `Begin in ${region.name.replace(/^The /, 'the ')}`,
      sub: r.due >= 5 ? `${r.due} ${unit} are due today` : `Twelve ${unit}, chosen for you · ~2 minutes`,
      gold: r.due >= 5,
    };
    // A fact under the button once there is one; how the place works is the ⓘ's.
    const note = r.met === 0 ? '' : `${r.known} of ${r.total.toLocaleString()} ${unit} are in memory, ${r.mastered} of them for good.`;
    const info = infoButton('vocab', { moreTitle: 'This place', more: [`${r.total.toLocaleString()} ${unit} live here. You will never be shown a list to work through: the village brings you twelve at a time, some of them inside a real sentence, and brings back the ones that fade.`] });

    const groups = [...new Set(fields.map((f) => f.group))];
    let group = groups[0];
    const renderFields = () => {
      const shown = fields.filter((f) => f.group === group);
      head({ pct: bloomPct, label: `${r.mastered} / ${r.total.toLocaleString()} ${unit}` }, cta, note, info);
      more.innerHTML = section(
        region.slug === 'meadow' ? 'The fields' : region.slug === 'pond' ? 'The shoals' : 'The languages',
        region.slug === 'meadow' ? 'Every word you master opens a flower that stays. You can also walk a single field.' : region.slug === 'pond' ? 'Each shoal holds the pairs beginning with one letter. Koi arrive as you tell them apart.' : 'A lantern lights along the path for every language you learn.',
        `${groups.length > 1 ? `<div class="g-chiprow">${groups.map((g) => `<button class="g-chip" data-group="${g}" aria-pressed="${g === group}">${escapeHTML(fields.find((f) => f.group === g)?.groupLabel ?? g)}</button>`).join('')}</div>` : ''}
        <div class="tiles">
          ${shown.map((f) => {
            const best = r.bestByField.get(f.id) ?? 0;
            const done = f.total > 0 && f.summary.mastered >= f.total * 0.9;
            return `<a class="tile ${done ? 'tile--done' : ''}" href="#/round/${region.slug}/${f.id}">
              <span class="tile__stars" aria-label="${best} stars">${starHTML(best)}</span>
              <p class="tile__name">${escapeHTML(f.name)}${f.summary.due ? ` <small class="due">✦ ${f.summary.due}</small>` : ''}</p>
              <p class="tile__meta">${f.summary.mastered} of ${f.total}</p>
              <div class="tile__bar ${done ? 'tile__bar--gold' : ''}"><i style="width:${Math.round(f.summary.bloom * 100)}%"></i></div>
            </a>`;
          }).join('')}
        </div>`) + wbShelf(region.slug, content, state);
      for (const b of more.querySelectorAll('[data-group]')) b.addEventListener('click', () => { group = b.dataset.group; play('page'); renderFields(); });
    };
    renderFields();
    return;
  }

  /* ================= The Reading Room ================= */
  if (region.slug === 'reading-room') {
    const rd = state.reading;
    heroStat.innerHTML = pill(`★ ${rd.stars} / ${rd.maxStars}`);
    const weakness = readingWeakness(world.records.sessions);
    const rec = nextPassage(content, rd.best, weakness, `rc:${state.today}`);
    let night = false;
    try { night = rd.observatory && (await storage.get(STORES.SETTINGS, 'world:night-reading'))?.value === true; } catch { /* off */ }
    const cta = rec ? {
      href: `#/rc/session/${rec.item.id}`,
      label: rec.item.title,
      sub: `${STAGE_INFO[rec.item.stage]?.label ?? rec.item.stage ?? ''} · ${String(rec.item.genre ?? '').replace(/[-_]+/g, ' ')} · ~${rec.item.estimated_time_min} min · ${rec.item.question_count} questions`,
      gold: rec.kind === 'retry',
    } : null;
    const note = rec?.why || (weakness.weakest ? `Your answers say ${typeName(weakness.weakest)} is the thing to work on.` : '');
    const missed = missedQuestions(world.records.sessions, weakness);
    head({ pct: rd.maxStars ? rd.stars / rd.maxStars : 0, label: `${rd.stars} / ${rd.maxStars} stars` },
      missed.length >= 4 ? { href: '#/rc/second-look', label: 'The second look', sub: `${Math.min(6, missed.length)} questions that got away · the highest-yield run here`, gold: true } : cta,
      missed.length >= 4 ? secondLookLine(missed, weakness) : note,
      infoButton('rc', { moreTitle: 'This place', more: [
        'Every passage here is the size CAT sets: never more than four questions, never longer than the exam’s longest passage.',
        'Three stars means three quarters right inside the passage’s own time: the pace CAT asks for.',
      ] }));
    if (missed.length >= 4 && rec) {
      top.insertAdjacentHTML('beforeend', `<a class="g-btn place__second" href="#/rc/session/${rec.item.id}">Or read a new passage: ${escapeHTML(rec.item.title)}</a>`);
    }
    const groups = groupByStage(content.rc);
    more.innerHTML = `
      ${rd.observatory ? `<section class="place__section"><div class="upgrade"><div class="upgrade__lead"><p class="upgrade__name">Night Reading</p><p class="upgrade__line">From the Observatory: a tighter pace (four fifths of the time) for the flawless mark.</p></div><button class="upgrade__btn" id="night-toggle" aria-pressed="${night}">${night ? 'On' : 'Off'}</button></div></section>` : ''}
      ${weakness.answered >= 8 ? section('What your answers say', 'Kept quietly, and used to choose what you read next.', `
        <div class="weak">
          ${[...weakness.byType.entries()].filter(([, e]) => e.n >= 2).sort((a, b) => a[1].acc - b[1].acc).slice(0, 5)
            .map(([t, e]) => `<div class="weak__row"><span>${escapeHTML(typeName(t))}</span><span class="weak__bar"><i style="width:${Math.round(e.acc * 100)}%" class="${e.acc < 0.6 ? 'is-low' : e.acc > 0.85 ? 'is-high' : ''}"></i></span><b>${Math.round(e.acc * 100)}%</b></div>`).join('')}
        </div>`) : ''}
      ${section('The shelves', `${rd.passages} passages, foundation to elite.`, groups.map((g) => `
        <h3 class="shelf">${escapeHTML(STAGE_INFO[g.stage]?.label ?? g.stage)}</h3>
        <p class="sub">${escapeHTML(STAGE_INFO[g.stage]?.description ?? '')}</p>
        <div class="g-list">
          ${g.items.map((it, i) => { const b = rd.best.get(it.id); return `<a class="g-row ${rec?.item.id === it.id ? 'g-row--next' : ''}" href="#/rc/session/${it.id}"><span class="g-row__num">${i + 1}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(it.title)}</span><span class="g-row__meta">${it.real_source ? `Real essay by ${escapeHTML(it.real_source.split(',')[0])} · ` : ''}${escapeHTML(it.genre)} · ${it.difficulty} · ~${it.estimated_time_min} min · ${it.question_count} Q${b ? ` · best ${Math.round(b.accuracy * 100)}%${b.flawless ? ' · flawless' : ''}` : ''}</span></span><span class="g-row__stars" aria-label="${b?.stars ?? 0} stars">${starHTML(b?.stars ?? 0)}</span></a>`; }).join('')}
        </div>`).join(''))}
      ${bankBundleList('cr', content.cr, state, 'Arguments', 'Short arguments in the CAT register: find the assumption, weaken the link, name the flaw. Five at a time, unsolved first.')}`;
    /* Hold the button in a const. `e.currentTarget` is null after the first
       await — dispatch is over — so reading it again threw and the toggle
       never changed its label or its pressed state (village.js had the same
       bug on the sound button). The control answers first, and the write
       follows. */
    const nightBtn = more.querySelector('#night-toggle');
    nightBtn?.addEventListener('click', async () => {
      const on = nightBtn.getAttribute('aria-pressed') !== 'true';
      nightBtn.setAttribute('aria-pressed', String(on));
      nightBtn.textContent = on ? 'On' : 'Off';
      play('tap');
      try {
        await storage.put(STORES.SETTINGS, { id: 'world:night-reading', value: on });
      } catch (err) {
        console.error('[CAT OS] could not remember night reading', err);
      }
    });
    return;
  }

  /* ================= The Vine Terraces (Word DNA) ================= */
  if (region.slug === 'terraces') {
    const t = state.terraces;
    heroStat.innerHTML = pill(`✦ ${t.done} / ${t.total}`);
    const wdSessions = world.records.sessions.filter((s) => s.module === 'wd');
    const done = new Set(); for (const s of wdSessions) for (const a of s.answers ?? []) if (a.is_correct === true) done.add(a.item_id ?? a.question_id);
    const kinds = [...new Set(content.wd.map((i) => i.kind))];
    const next = content.wd.find((i) => !done.has(i.id)) ?? content.wd[0];
    head({ pct: t.total ? t.done / t.total : 0, label: `${t.done} / ${t.total} families` },
      next ? { href: `#/wd/session/${next.id}`, label: next.title, sub: [String(next.kind).replace('_', ' '), next.member_count ? `${next.member_count} words` : ''].filter(Boolean).join(' · ') } : null,
      '',
      infoButton('vocab', { moreTitle: 'This place', more: [
        'Every unit here ends with a word you were never shown. That is the test that matters.',
        'Each one is learned by pattern: notice the shared piece, predict it, then apply it to a word never taught.',
        'Met a word you have never seen? Take it apart, prefix, root, suffix, and the sentence settles the rest.',
      ] }));
    more.innerHTML = section('The vines', 'Prefixes, suffixes, foreign words and CAT vocabulary.',
      kinds.map((k) => `<h3 class="shelf">${escapeHTML(String(k).replace('_', ' '))}</h3><div class="g-list">${content.wd.filter((i) => i.kind === k).map((it) => `<a class="g-row" href="#/wd/session/${it.id}"><span class="g-row__num">${done.has(it.id) ? '✓' : '·'}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(it.title)}</span><span class="g-row__meta">${it.member_count ?? ''} words${it.estimated_time_sec ? ` · ~${Math.round(it.estimated_time_sec / 60)} min` : ''}</span></span></a>`).join('')}</div>`).join(''))
      + bankBundleList('wb', (content.wb ?? []).filter((b) => b.kind === 'decode'), state, 'Words you were never shown', 'A word you have probably never met, its sentence, and four meanings.');
    return;
  }

  /* ================= The Quarter: Loom / Table / Bench ================= */
  if (region.slug === 'loom' || region.slug === 'table' || region.slug === 'bench') {
    const v = state[region.slug];
    const kind = region.slug;
    heroStat.innerHTML = pill(`★ ${v.stars}`);
    const [tiers, items, prefix, unit, noun] = kind === 'loom' ? [PJ_TIERS, content.pj, 'pj', 'jumbles', ['jumble', 'jumbles']]
      : kind === 'table' ? [PS_TIERS, content.ps, 'ps', 'summaries', ['summary', 'summaries']] : [OOO_TIERS, content.ooo, 'ooo', 'sets', ['odd one out', 'odd ones out']];
    const sessions = world.records.sessions;
    /* The button starts the same three the friend's card offers (pets/next.js
       verbalTrio, same seed): a set short enough to finish, so the thanks
       lands at its end. A whole tier is still one tap away, on the tiles. */
    const trio = verbalTrio(items, sessions, v.module, `${kind}:${state.today}`, state.now);
    const rec = trio?.recs[0] ?? null;
    const solved = new Set();
    for (const s of sessions.filter((x) => x.module === v.module)) for (const a of s.answers ?? []) if (a.is_correct === true) solved.add(a.item_id ?? a.question_id);
    const n = trio?.recs.length ?? 0;
    const tierWord = rec ? String(rec.item.tier ?? '').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '';
    head({ pct: v.total ? v.solved / v.total : 0, label: `${v.solved} / ${v.total} solved` },
      trio ? { href: trio.href, label: `${['One', 'Two', 'Three'][n - 1]} ${noun[n === 1 ? 0 : 1]}`, sub: `${tierWord ? `${tierWord} · ` : ''}about ${trio.minutes} min`, gold: rec.kind === 'retry' } : null,
      rec?.why,
      infoButton(prefix, { moreTitle: 'This place', more: ['Each tier teaches one thing and feels different, not just harder.'] }));
    more.innerHTML = section('Eight tiers', 'Play a whole tier as one timed set.', `
      <div class="tiles">
        ${tiers.map((t) => { const inTier = items.filter((it) => it.tier === t.id); const s = inTier.filter((it) => solved.has(it.id)).length; const done = inTier.length > 0 && s === inTier.length; return `<a class="tile ${rec && rec.item.tier === t.id ? 'tile--next' : ''} ${done ? 'tile--done' : ''}" href="#/${prefix}/session/${t.id}"><p class="tile__name">${escapeHTML(t.label)}</p><p class="tile__meta">${s} of ${inTier.length} ${unit}</p><div class="tile__bar ${done ? 'tile__bar--gold' : ''}"><i style="width:${inTier.length ? Math.round((s / inTier.length) * 100) : 0}%"></i></div></a>`; }).join('')}
      </div>
      <p class="sub" style="margin-top:14px"><a href="#/${prefix}/about">How this craft works</a> · <a href="#/${prefix}">The full journey</a></p>`)
      + (kind === 'bench' ? '' : section(`${hostDef.name}'s other house`, '', `<a class="g-btn" href="#/world/place/${kind === 'loom' ? 'placement' : 'completion'}">${kind === 'loom' ? 'Sentence Placement, in the rose cottage' : 'Para Completion, in the clock tower'} →</a>`));
    return;
  }

  /* ================= The rose cottage and the clock tower: a bank each ================= */
  if (region.slug === 'placement' || region.slug === 'completion') {
    const type = region.slug === 'placement' ? 'sp' : 'pc';
    const rows = content[type] ?? [], b = state.banks?.[type] ?? {};
    const solved = b.solved ?? 0, total = b.total ?? rows.length;
    heroStat.innerHTML = pill(`✓ ${solved} / ${total}`);
    /* `next` opens the lowest tier with something unsolved, three at a time
       (verbal-bank's resolveSet). Say how many that really is: completion's
       foundation tier holds one paragraph. */
    const solvedIds = b.solvedIds ?? new Set();
    const tier = BANK_TIERS.find((t) => rows.some((r) => r.tier === t && !solvedIds.has(r.id))) ?? rows[0]?.tier;
    const three = rows.filter((r) => r.tier === tier).slice(0, 3);
    const mins = Math.max(1, Math.round(three.reduce((s, r) => s + (r.estimated_time_sec ?? 80), 0) / 60));
    const word = ['one', 'two', 'three'][Math.max(1, three.length) - 1];
    head({ pct: total ? solved / total : 0, label: `${solved} / ${total} solved` },
      rows.length ? { href: `#/bank/session/${type}/next`, label: solved ? `${word[0].toUpperCase()}${word.slice(1)} more, unsolved first` : `Begin with ${word}`, sub: `${region.skill} · about ${mins} minute${mins === 1 ? '' : 's'}` } : null,
      '',
      infoButton(type, { moreTitle: 'This place', more: [type === 'sp'
        ? 'CAT gives you a paragraph with one sentence lifted out and asks where it goes. The pronoun that needs an owner and the “but” that needs something to push against will tell you.'
        : 'A paragraph that stops one sentence early. Decide what the gap needs, a reason, an example, a turn or a landing, before you read the options.'] }));
    more.innerHTML = bankTierTiles(type, rows, state, 'Every tier', 'Three at a time, unsolved first. Each tier is harder than the last.');
    return;
  }
}

/** The two subjects that live in a friend's second house paint that house, not the friend's first one. */
const SECOND_HOUSE = { placement: 'cottage', completion: 'clock' };

/* ---- The content engine's banks, as shelves inside the places ---- */

/** The same section frame renderPlace uses, for the module-level shelves. */
const section = (title, sub, html) => `
    <section class="place__section">
      <h2>${escapeHTML(title)}</h2>
      ${sub ? `<p class="sub">${sub}</p>` : ''}
      ${html}
    </section>`;

const BANK_TIERS = ['foundation', 'easy', 'medium', 'advanced', 'cat', 'cat-plus', 'ninety-nine', 'premium'];
const WB_REGION_KINDS = { meadow: ['context', 'register', 'connotation', 'synonym_distinction'], pond: ['confusable'], terraces: ['decode'] };

/** Placement / completion: one tile per tier, played three at a time. */
function bankTierTiles(type, rows, state, title, lead) {
  if (!rows?.length) return '';
  const solved = state.banks?.[type]?.solvedIds ?? new Set();
  const tiers = BANK_TIERS.filter((t) => rows.some((r) => r.tier === t));
  return section(title, lead, `<div class="tiles">${tiers.map((t) => {
    const inTier = rows.filter((r) => r.tier === t);
    const s = inTier.filter((r) => solved.has(r.id)).length;
    const done = inTier.length > 0 && s === inTier.length;
    return `<a class="tile ${done ? 'tile--done' : ''}" href="#/bank/session/${type}/${t}"><p class="tile__name">${escapeHTML(t.replace('-', ' '))}</p><p class="tile__meta">${s} of ${inTier.length}</p><div class="tile__bar ${done ? 'tile__bar--gold' : ''}"><i style="width:${Math.round((s / inTier.length) * 100)}%"></i></div></a>`;
  }).join('')}</div>`);
}

/** Word bank / arguments: one row per bundle. */
function bankBundleList(type, rows, state, title, lead) {
  if (!rows?.length) return '';
  const solved = state.banks?.[type]?.solvedIds ?? new Set();
  const BAND = { core: 0, stretch: 1, elite: 2 };
  const sorted = [...rows].sort((a, b) => (BAND[a.band] ?? 0) - (BAND[b.band] ?? 0) || a.id.localeCompare(b.id));
  return section(title, lead, `<div class="g-list">${sorted.map((r) => {
    const ids = r.item_ids ?? [];
    const s = ids.filter((id) => solved.has(id)).length;
    const done = ids.length > 0 && s === ids.length;
    return `<a class="g-row" href="#/bank/session/${type}/${r.id}"><span class="g-row__num">${done ? '✓' : '·'}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(r.title)}</span><span class="g-row__meta">${escapeHTML(String(r.kind ?? '').replace('_', ' '))}${r.kind ? ' · ' : ''}${escapeHTML(r.band ?? '')} · ${s} of ${ids.length}</span></span></a>`;
  }).join('')}</div>`);
}

/** The word-bank shelves a vocabulary place shows (Meadow / Pond / Terraces). */
function wbShelf(regionSlug, content, state) {
  const kinds = WB_REGION_KINDS[regionSlug] ?? [];
  const rows = (content.wb ?? []).filter((b) => kinds.includes(b.kind));
  const copy = regionSlug === 'pond'
    ? ['The right twin, in a sentence', 'A sentence with a gap and the look-alikes that could fill it. Only one of them does the job the sentence needs.']
    : ['Words, asked the CAT way', 'A word inside a real sentence, four senses, one forced by the sentence, and the near-synonyms that differ by register, colouring or degree.'];
  return bankBundleList('wb', rows, state, copy[0], copy[1]);
}

function pill(text) { return `<span class="hud__pill">${escapeHTML(text)}</span>`; }

export { STAGES };
