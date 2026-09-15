/**
 * place.js (screen) — inside a place.
 *
 * The frame is the same everywhere and it is a PLACE, not a page: the
 * region's own living pixel scene fills the screen, and a sheet rests
 * over the bottom of it holding the one thing worth doing here, chosen
 * by the curator. Everything else — the shelves, the fields, the tiers —
 * lives under a pull, so nobody has to read a catalogue to practise.
 *
 *   HERO    the place, alive, at the hour and season it really is
 *   SHEET   eyebrow · name · progress · ONE action
 *   MORE    the full contents of the place, for the learner who wants it
 */

import { buildGroveScene } from '../../village/grove.js';
import { VillageRenderer } from '../../village/renderer.js';
import { buildBackdropScene } from '../../village/scene.js';
import { art } from '../../village/art.js';
import { atPlace } from '../companion.js';
import { regionBySlug } from '../regions.js';
import { loadWorld } from '../state.js';
import { starHTML } from './result.js';
import { REGION_GOOD, thing } from '../economy.js';
import { nextPassage, nextVerbal, nextFamily, readingWeakness, typeName, missedQuestions, secondLookLine } from '../curator.js';
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

const STAGE_WORD = { open_ground: 'Unmet', seed: 'A seed', sprout: 'Sprout', young: 'Young', in_leaf: 'In leaf', mature: 'Mature', ancient: 'Ancient' };
/** A tree's stage, in one typographic mark. Deliberately not emoji: the
 *  valley draws its own trees, and a system glyph beside them looks like a
 *  different product. */
const STAGE_GLYPH = { open_ground: '◌', seed: '·', sprout: '\u2027', young: '\u2038', in_leaf: '\u25B4', mature: '\u25B2', ancient: '\u2663' };

export async function renderPlace(outlet, { storage }, params) {
  const region = regionBySlug(params.slug);
  if (!region) { location.hash = '#/world'; return; }
  if (region.slug === 'hearth') return renderHearth(outlet, { storage });
  if (region.slug === 'wilds') return renderWilds(outlet, { storage });
  document.documentElement.setAttribute('data-world', '');

  let world;
  try { world = await loadWorld(storage); } catch (err) {
    outlet.innerHTML = `<section class="place"><div class="place__body" style="padding-top:60px"><h1 class="place__title">This place will not open</h1><p>${escapeHTML(err.message)}</p></div></section>`;
    return;
  }
  const { state, content } = world;
  const atmo = state.atmo;
  const madeHere = thing(REGION_GOOD[region.slug] ?? 'blooms');

  outlet.innerHTML = `
    <section class="place" aria-label="${escapeHTML(region.name)}">
      <div class="place__hero">
        <canvas id="hero" aria-label="${escapeHTML(region.name)}"></canvas>
        <div class="place__fade" aria-hidden="true"></div>
      </div>
      <a class="place__back" href="#/world" id="back">← The village</a>
      <div class="place__hero-stat" id="hero-stat"></div>
      <div class="placewick" id="placewick" hidden><canvas width="36" height="30" aria-hidden="true"></canvas><p></p></div>
      <div class="sheet" id="sheet">
        <button class="sheet__grip" id="grip" aria-expanded="false" aria-label="Show everything here"><i aria-hidden="true"></i></button>
        <div class="sheet__top" id="top"></div>
        <div class="sheet__more" id="more"></div>
      </div>
    </section>`;

  const heroStat = outlet.querySelector('#hero-stat');
  const top = outlet.querySelector('#top');
  const more = outlet.querySelector('#more');
  const sheet = outlet.querySelector('#sheet');
  const grip = outlet.querySelector('#grip');
  outlet.querySelector('#back').addEventListener('click', () => { sessionStorage.setItem('world:focus', region.slug); play('close'); });

  /* Wick meets you at the door of every place, once, and says the one thing
     that is true of it. He never repeats himself in a session. */
  {
    const line = atPlace(region.slug, state);
    const seen = sessionStorage.getItem('wick:place') === region.slug;
    const el = outlet.querySelector('#placewick');
    if (line && !seen && el) {
      sessionStorage.setItem('wick:place', region.slug);
      const cx = el.querySelector('canvas').getContext('2d');
      const sp = art('wick', { pose: 'sit' }, 3);
      cx.drawImage(sp.canvas, 0, 0, sp.canvas.width, sp.canvas.height * 0.62, 1, 1, 34, 24);
      el.querySelector('p').textContent = line;
      el.hidden = false;
      setTimeout(() => el.classList.add('is-in'), 700);
      setTimeout(() => el.classList.remove('is-in'), 7200);
      el.addEventListener('click', () => el.classList.remove('is-in'));
    }
  }

  let open = false;
  const setOpen = (v) => {
    open = v;
    sheet.classList.toggle('is-open', v);
    grip.setAttribute('aria-expanded', String(v));
    play(v ? 'page' : 'close');
  };
  grip.addEventListener('click', () => setOpen(!open));
  sheet.addEventListener('scroll', () => { if (!open && sheet.scrollTop > 6) setOpen(true); }, { passive: true });

  let renderer = null;
  const mountHero = (scene, opts = {}) => {
    renderer?.destroy();
    const canvas = outlet.querySelector('#hero');
    if (!canvas) return null;
    renderer = new VillageRenderer(canvas, scene, { fit: 'cover', pannable: false, minZoom: 0.5, maxZoom: 6, onTap: opts.onTap });
    renderer.lookAt(scene.W / 2, scene.focusY ?? scene.H * 0.6, { animate: false });
    renderer.start();
    return renderer;
  };
  const onHash = () => { renderer?.destroy(); window.removeEventListener('hashchange', onHash); };
  window.addEventListener('hashchange', onHash);
  const warmth = Math.min(1, (state.village.levels.size / 8) * 0.6 + Math.min(1, state.stars / 90) * 0.4);
  const onDown = () => { unlock(); startMusic(region.slug, { hour: atmo.hour, warmth }); startAmbience(region.slug, atmo); };
  window.addEventListener('pointerdown', onDown, { capture: true, once: true });
  startMusic(region.slug, { hour: atmo.hour, warmth }); startAmbience(region.slug, atmo);

  /** The sheet's top: who this place is, how far it has come, and the one
   *  thing the curator says to do now. */
  const head = (progress, cta, note) => {
    top.innerHTML = `
      <p class="place__eyebrow">${escapeHTML(region.skill ?? '')} · makes <span class="craft craft--${madeHere.key}"><i aria-hidden="true"></i>${madeHere.name}</span></p>
      <h1 class="place__title">${escapeHTML(region.name)}</h1>
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
    const renderGrove = () => {
      const fams = selected.families;
      const scene = buildGroveScene(selected, fams, atmo, { selected: f?.id ?? null, heroId: f?.id ?? null });
      mountHero(scene, { onTap: (w) => { const o = scene.hit(w.x, w.y); if (o?.family) { play('tap'); location.hash = o.family.stage === 'open_ground' || o.family.due !== 'none' ? `#/garden/session/${o.family.id}` : `#/garden/plant/${o.family.id}`; } } });
      head({ pct: rw.total ? rw.metCount / rw.total : 0, label: `${rw.metCount} / ${rw.total} families` }, cta, pick?.why);
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
    mountHero(buildBackdropScene(region.slug, state, atmo));
    heroStat.innerHTML = pill(`★ ${r.stars}`);

    // The curator's round is the only action that matters here.
    const cta = {
      href: `#/round/${region.slug}`,
      label: r.due >= 5 ? 'Take the words that are fading' : r.met ? 'Take a round' : `Begin in ${region.name.replace(/^The /, 'the ')}`,
      sub: r.due >= 5 ? `${r.due} ${unit} are due today` : `Twelve ${unit}, chosen for you · ~2 minutes`,
      gold: r.due >= 5,
    };
    const note = r.met === 0
      ? `${r.total.toLocaleString()} ${unit} live here. You will never be shown a list to work through — the valley brings you twelve at a time, some of them inside a real sentence, and brings back the ones that fade.`
      : `${r.known} of ${r.total.toLocaleString()} ${unit} are in memory, ${r.mastered} of them for good.`;

    const groups = [...new Set(fields.map((f) => f.group))];
    let group = groups[0];
    const renderFields = () => {
      const shown = fields.filter((f) => f.group === group);
      head({ pct: bloomPct, label: `${r.mastered} / ${r.total.toLocaleString()} ${unit}` }, cta, note);
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
    mountHero(buildBackdropScene('reading-room', state, atmo));
    heroStat.innerHTML = pill(`★ ${rd.stars} / ${rd.maxStars}`);
    const weakness = readingWeakness(world.records.sessions);
    const rec = nextPassage(content, rd.best, weakness, `rc:${state.today}`);
    let night = false;
    try { night = rd.observatory && (await storage.get(STORES.SETTINGS, 'world:night-reading'))?.value === true; } catch { /* off */ }
    const cta = rec ? {
      href: `#/rc/session/${rec.item.id}`,
      label: rec.item.title,
      sub: `${STAGE_INFO[rec.item.stage]?.label ?? rec.item.stage ?? ''} · ${rec.item.genre} · ~${rec.item.estimated_time_min} min · ${rec.item.question_count} questions`,
      gold: rec.kind === 'retry',
    } : null;
    const note = rec?.why || (weakness.weakest ? `Your answers say ${typeName(weakness.weakest)} is the thing to work on.` : '');
    const missed = missedQuestions(world.records.sessions, weakness);
    head({ pct: rd.maxStars ? rd.stars / rd.maxStars : 0, label: `${rd.stars} / ${rd.maxStars} stars` },
      missed.length >= 4 ? { href: '#/rc/second-look', label: 'The second look', sub: `${Math.min(6, missed.length)} questions that got away · the highest-yield run here`, gold: true } : cta,
      missed.length >= 4 ? secondLookLine(missed, weakness) : note);
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
      ${section('The shelves', `${rd.passages} passages, foundation to elite. Three stars means three quarters right inside the passage’s own time — the pace CAT asks for.`, groups.map((g) => `
        <h3 class="shelf">${escapeHTML(STAGE_INFO[g.stage]?.label ?? g.stage)}</h3>
        <p class="sub">${escapeHTML(STAGE_INFO[g.stage]?.description ?? '')}</p>
        <div class="g-list">
          ${g.items.map((it, i) => { const b = rd.best.get(it.id); return `<a class="g-row ${rec?.item.id === it.id ? 'g-row--next' : ''}" href="#/rc/session/${it.id}"><span class="g-row__num">${i + 1}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(it.title)}</span><span class="g-row__meta">${escapeHTML(it.genre)} · ${it.difficulty} · ~${it.estimated_time_min} min · ${it.question_count} Q${b ? ` · best ${Math.round(b.accuracy * 100)}%${b.flawless ? ' · flawless' : ''}` : ''}</span></span><span class="g-row__stars" aria-label="${b?.stars ?? 0} stars">${starHTML(b?.stars ?? 0)}</span></a>`; }).join('')}
        </div>`).join(''))}
      ${bankBundleList('cr', content.cr, state, 'Arguments', 'Short arguments in the CAT register: find the assumption, weaken the link, name the flaw. Five at a time, unsolved first.')}`;
    more.querySelector('#night-toggle')?.addEventListener('click', async (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; await storage.put(STORES.SETTINGS, { id: 'world:night-reading', value: on }); e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.textContent = on ? 'On' : 'Off'; play('tap'); });
    return;
  }

  /* ================= The Vine Terraces (Word DNA) ================= */
  if (region.slug === 'terraces') {
    const t = state.terraces;
    mountHero(buildBackdropScene('terraces', state, atmo));
    heroStat.innerHTML = pill(`✦ ${t.done} / ${t.total}`);
    const wdSessions = world.records.sessions.filter((s) => s.module === 'wd');
    const done = new Set(); for (const s of wdSessions) for (const a of s.answers ?? []) if (a.is_correct === true) done.add(a.item_id ?? a.question_id);
    const kinds = [...new Set(content.wd.map((i) => i.kind))];
    const next = content.wd.find((i) => !done.has(i.id)) ?? content.wd[0];
    head({ pct: t.total ? t.done / t.total : 0, label: `${t.done} / ${t.total} families` },
      next ? { href: `#/wd/session/${next.id}`, label: next.title, sub: `${String(next.kind).replace('_', ' ')} · notice the shared piece, predict it, then apply it to a word never taught` } : null,
      'Every unit here ends with a word you were never shown. That is the test that matters.');
    more.innerHTML = section('The vines', 'Prefixes, suffixes, foreign words and CAT vocabulary, learned by pattern: notice, predict, reveal, apply.',
      kinds.map((k) => `<h3 class="shelf">${escapeHTML(String(k).replace('_', ' '))}</h3><div class="g-list">${content.wd.filter((i) => i.kind === k).map((it) => `<a class="g-row" href="#/wd/session/${it.id}"><span class="g-row__num">${done.has(it.id) ? '✓' : '·'}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(it.title)}</span><span class="g-row__meta">${it.member_count ?? ''} words${it.estimated_time_sec ? ` · ~${Math.round(it.estimated_time_sec / 60)} min` : ''}</span></span></a>`).join('')}</div>`).join(''))
      + bankBundleList('wb', (content.wb ?? []).filter((b) => b.kind === 'decode'), state, 'Words you were never shown', 'A word you have probably never met, its sentence, and four meanings. Take it apart — prefix, root, suffix — and the sentence settles the rest.');
    return;
  }

  /* ================= The Quarter: Loom / Table / Bench ================= */
  if (region.slug === 'loom' || region.slug === 'table' || region.slug === 'bench') {
    const v = state[region.slug];
    const kind = region.slug;
    mountHero(buildBackdropScene(kind, state, atmo));
    heroStat.innerHTML = pill(`★ ${v.stars}`);
    const [tiers, items, prefix, unit] = kind === 'loom' ? [PJ_TIERS, content.pj, 'pj', 'jumbles']
      : kind === 'table' ? [PS_TIERS, content.ps, 'ps', 'summaries'] : [OOO_TIERS, content.ooo, 'ooo', 'sets'];
    const sessions = world.records.sessions;
    const rec = nextVerbal(items, sessions, v.module, `${kind}:${state.today}`);
    const solved = new Set();
    for (const s of sessions.filter((x) => x.module === v.module)) for (const a of s.answers ?? []) if (a.is_correct === true) solved.add(a.item_id ?? a.question_id);
    /* This screen's own copy two lines down says "Play a whole tier as one
       timed set" — and the route below does exactly that — so the minutes
       beside the button have to cost the SET, not the first item in it.
       Costing one item billed a nine-to-twelve-item timed run as "~1 min". */
    const inSet = rec ? (rec.item.tier ? items.filter((x) => x.tier === rec.item.tier) : [rec.item]) : [];
    const setMins = Math.max(1, Math.round(inSet.reduce((s, x) => s + (x.estimated_time_sec ?? 80), 0) / 60));
    const tierWord = rec ? String(rec.item.tier ?? '').replace('-', ' ') : '';
    head({ pct: v.total ? v.solved / v.total : 0, label: `${v.solved} / ${v.total} solved` },
      rec ? { href: `#/${prefix}/session/${rec.item.tier ?? rec.item.id}`, label: rec.item.title, sub: inSet.length > 1 ? `${tierWord} · ${inSet.length} ${unit} · ~${setMins} min` : `${tierWord} · ~${setMins} min`, gold: rec.kind === 'retry' } : null,
      rec?.why);
    more.innerHTML = section('Eight tiers', 'Each tier teaches one thing and feels different, not just harder. Play a whole tier as one timed set.', `
      <div class="tiles">
        ${tiers.map((t) => { const inTier = items.filter((it) => it.tier === t.id); const s = inTier.filter((it) => solved.has(it.id)).length; const done = inTier.length > 0 && s === inTier.length; return `<a class="tile ${rec && rec.item.tier === t.id ? 'tile--next' : ''} ${done ? 'tile--done' : ''}" href="#/${prefix}/session/${t.id}"><p class="tile__name">${escapeHTML(t.label)}</p><p class="tile__meta">${s} of ${inTier.length} ${unit}</p><div class="tile__bar ${done ? 'tile__bar--gold' : ''}"><i style="width:${inTier.length ? Math.round((s / inTier.length) * 100) : 0}%"></i></div></a>`; }).join('')}
      </div>
      <p class="sub" style="margin-top:14px"><a href="#/${prefix}/about">How this craft works</a> · <a href="#/${prefix}">The full journey</a></p>`)
      + (kind === 'loom' ? bankTierTiles('sp', content.sp, state, 'Sentence placement', 'A paragraph with one sentence taken out. Find the one seat it can take: the pronoun that needs an owner, the “but” that needs something to push against. Six at a time, unsolved first.') : '')
      + (kind === 'table' ? bankTierTiles('pc', content.pc, state, 'Paragraph completion', 'A paragraph that stops one sentence early. Decide what the gap needs — a reason, an example, a turn, a landing — before you read the options. Six at a time, unsolved first.') : '');
    return;
  }
}

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

/** Placement / completion: one tile per tier, played six at a time. */
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
    : ['Words, asked the CAT way', 'A word inside a real sentence, four senses, one forced by the sentence — and the near-synonyms that differ by register, colouring or degree.'];
  return bankBundleList('wb', rows, state, copy[0], copy[1]);
}

function pill(text) { return `<span class="hud__pill">${escapeHTML(text)}</span>`; }

export { STAGES };
