/**
 * place.js (screen) — inside a place. Every region shares one frame: a
 * living hero (its own pixel scene, drawn from the same state as the map),
 * a title, one line, a progress bar, the one best next step as a big
 * action, and the region's own content laid out as tiles or rows — groves
 * and families, fields of words, shelves of passages, tiers of sets.
 */

import { WorldRenderer } from '../engine/canvas.js';
import { buildGroveScene, buildFieldScene, buildPondScene, buildThicketScene, buildTowerScene, buildBuildingScene } from '../engine/map.js';
import { regionBySlug } from '../regions.js';
import { loadWorld } from '../state.js';
import { starHTML } from './result.js';
import { play, unlock, startMusic, startAmbience } from '../audio.js';
import { escapeHTML } from '../../core/utils/format.js';
import { STAGES } from '../../core/engine/garden-session.js';
import { recommendNext, STAGE_INFO, groupByStage } from '../../core/learning/journey.js';
import { PJ_TIERS, recommendNextPJ } from '../../modules/para-jumbles/logic/tiers.js';
import { PS_TIERS, recommendNextPS } from '../../modules/para-summary/logic/tiers.js';
import { OOO_TIERS, recommendNextOOO } from '../../modules/odd-one-out/logic/tiers.js';
import { renderHearth } from './hearth.js';
import { renderWilds } from './wilds.js';
import { STORES } from '../../core/storage/storage-adapter.js';

const STAGE_WORD = { open_ground: 'Unmet', seed: 'A seed', sprout: 'Sprout', young: 'Young', in_leaf: 'In leaf', mature: 'Mature', ancient: 'Ancient' };
const STAGE_GLYPH = { open_ground: '◌', seed: '·', sprout: '🌱', young: '🌿', in_leaf: '🌳', mature: '🌳', ancient: '🌲' };

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

  const frame = (heroLabel) => `
    <section class="place" aria-label="${escapeHTML(region.name)}">
      <div class="place__hero">
        <canvas id="hero" aria-label="${escapeHTML(heroLabel)}"></canvas>
        <a class="place__back" href="#/world" id="back">← The valley</a>
        <div class="place__hero-stat" id="hero-stat"></div>
      </div>
      <div class="place__body" id="body"></div>
    </section>`;

  outlet.innerHTML = frame(region.name);
  const body = outlet.querySelector('#body');
  const heroStat = outlet.querySelector('#hero-stat');
  outlet.querySelector('#back').addEventListener('click', () => { sessionStorage.setItem('world:focus', region.slug); play('close'); });

  let renderer = null;
  const mountHero = (scene, opts = {}) => {
    renderer?.destroy();
    const canvas = outlet.querySelector('#hero');
    renderer = new WorldRenderer(canvas, scene, { worldW: scene.W, worldH: scene.H, fit: 'cover', pannable: false, minZoom: 0.5, maxZoom: 6, onTap: opts.onTap });
    renderer.lookAt(scene.W / 2, scene.focusY ?? scene.H * 0.6, { animate: false });
    renderer.start();
    return renderer;
  };
  const onHash = () => { renderer?.destroy(); window.removeEventListener('hashchange', onHash); };
  window.addEventListener('hashchange', onHash);
  const onDown = () => { unlock(); startMusic(region.slug, { hour: atmo.hour }); startAmbience(region.slug, atmo); };
  window.addEventListener('pointerdown', onDown, { capture: true, once: true });
  startMusic(region.slug, { hour: atmo.hour }); startAmbience(region.slug, atmo);

  const head = (progress, cta) => `
    <p class="place__eyebrow">${escapeHTML(region.skill ?? '')}</p>
    <h1 class="place__title">${escapeHTML(region.name)}</h1>
    <p class="place__line">${escapeHTML(region.line)}</p>
    ${progress ? `<div class="place__progress"><div class="bar"><i style="width:${Math.round(progress.pct * 100)}%"></i></div><b>${progress.label}</b></div>` : ''}
    ${cta ? `<a class="g-cta ${cta.gold ? 'g-cta--gold' : ''}" href="${cta.href}" id="cta">${escapeHTML(cta.label)}<small>${escapeHTML(cta.sub ?? '')}</small><span class="arrow" aria-hidden="true">→</span></a>` : ''}`;

  /* ================= The Rootwood ================= */
  if (region.slug === 'rootwood') {
    const rw = state.rootwood;
    const asking = rw.asking;
    const nextOpen = rw.groves.flatMap((g) => g.families).find((f) => f.stage === 'open_ground');
    const cta = asking ? { href: `#/garden/session/${asking.id}`, label: `Revisit ${asking.label}`, sub: 'A family is asking to be remembered', gold: true }
      : nextOpen ? { href: `#/garden/session/${nextOpen.id}`, label: `Grow ${nextOpen.label}`, sub: `${nextOpen.origin} · a new root in ${rw.groves.find((g) => g.slug === nextOpen.grove)?.name ?? 'the wood'}` }
        : { href: `#/garden/session/${rw.families[0].id}`, label: 'Walk the wood', sub: 'Every family stands' };
    let selected = rw.groves.find((g) => g.families.some((f) => f.id === (asking?.id ?? nextOpen?.id))) ?? rw.groves[0];
    heroStat.innerHTML = `<span class="hud__pill"><span class="star" aria-hidden="true">🌳</span>${rw.grownCount} grown</span>`;
    const renderGrove = () => {
      const fams = selected.families;
      const scene = buildGroveScene(selected, fams, atmo, { selected: asking?.id ?? nextOpen?.id ?? null });
      mountHero(scene, { onTap: (w) => { const o = scene.hit(w.x, w.y); if (o?.family) { play('tap'); location.hash = o.family.stage === 'open_ground' || o.family.due !== 'none' ? `#/garden/session/${o.family.id}` : `#/garden/plant/${o.family.id}`; } } });
      body.innerHTML = `
        ${head({ pct: rw.total ? rw.metCount / rw.total : 0, label: `${rw.metCount} / ${rw.total} families` }, cta)}
        <div class="place__section">
          <h2>Six groves</h2>
          <p class="sub">Roots that share a field of meaning stand together. Choose a grove to walk.</p>
          <div class="g-chiprow">${rw.groves.map((g) => `<button class="g-chip" data-grove="${g.slug}" aria-pressed="${g.slug === selected.slug}">${escapeHTML(g.name.replace('The Grove of ', ''))} ${g.grown ? '✦' : `${g.met}/${g.families.length}`}</button>`).join('')}</div>
          <p class="sub"><i>${escapeHTML(selected.line)}</i></p>
          <div class="g-list">
            ${fams.map((f) => {
              const unmet = f.stage === 'open_ground';
              const href = unmet || f.due !== 'none' ? `#/garden/session/${f.id}` : `#/garden/plant/${f.id}`;
              const meta = unmet ? `${escapeHTML(f.origin)} · a root-stone waiting to be planted` : `${escapeHTML(f.origin)} · "${escapeHTML(f.meaning)}" · ${f.memberCount} words${f.landmark ? ' · Landmark' : ''}`;
              const cls = f.due !== 'none' ? 'g-row--next' : unmet ? 'g-row--stone' : '';
              return `<a class="g-row ${cls}" href="${href}"><span class="g-row__num" aria-hidden="true">${STAGE_GLYPH[f.stage] ?? '◌'}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(f.label)}${unmet ? '' : ` <small style="font-weight:500;color:var(--g-ink-3)">· ${STAGE_WORD[f.stage]}</small>`}</span><span class="g-row__meta">${meta}</span></span><span class="g-row__stars" aria-hidden="true">${f.due === 'gold' ? '✦ asking' : f.due === 'bare' ? '✧ waiting' : ''}</span></a>`;
            }).join('')}
          </div>
        </div>`;
      for (const b of body.querySelectorAll('[data-grove]')) b.addEventListener('click', () => { selected = rw.groves.find((g) => g.slug === b.dataset.grove); play('page'); renderGrove(); });
    };
    renderGrove();
    return;
  }

  /* ================= The Meadow / Pond / Thicket ================= */
  if (region.slug === 'meadow' || region.slug === 'pond' || region.slug === 'thicket') {
    const r = state[region.slug];
    const fields = r.fields;
    // The best next field: one with words due, else the least-bloomed field the learner has begun, else the first untouched.
    const next = fields.find((f) => f.summary.due >= 3) ?? [...fields].filter((f) => f.summary.met > 0 && f.summary.mastered < f.total).sort((a, b) => a.summary.bloom - b.summary.bloom)[0] ?? fields.find((f) => f.summary.met === 0) ?? fields[0];
    const bloomPct = r.total ? r.mastered / r.total : 0;
    let scene;
    if (region.slug === 'meadow') {
      // The hero field shows one flower per word: levels come from the ledger, by bundle.
      let words = [];
      if (next) {
        try {
          const all = await storage.getAll(STORES.LEARNING);
          const levels = new Map(all.filter((x) => x.kind === 'lex-mastery' && x.bundle_id === next.id).map((x) => [x.entry_id, x.level]));
          words = Array.from({ length: next.total }, (_, i) => { const id = `${next.id}-${String(i + 1).padStart(4, '0')}`; return { id, level: levels.get(id) ?? 0 }; });
        } catch { words = Array.from({ length: next.total }, (_, i) => ({ id: String(i), level: 0 })); }
      }
      scene = buildFieldScene({ id: next?.id ?? 'none', total: next?.total ?? 0, mastered: next?.summary.mastered ?? 0, words }, atmo);
    } else if (region.slug === 'pond') scene = buildPondScene(r, atmo);
    else scene = buildThicketScene(r, atmo);
    mountHero(scene);
    heroStat.innerHTML = `<span class="hud__pill"><span class="star" aria-hidden="true">★</span>${r.stars}</span>`;
    const groups = [...new Set(fields.map((f) => f.group))];
    let group = next?.group ?? groups[0];
    const unit = region.slug === 'meadow' ? 'words' : region.slug === 'pond' ? 'twins' : 'words';
    const cta = next ? { href: `#/round/${region.slug}/${next.id}`, label: next.summary.due >= 3 ? `Review ${next.name}` : next.summary.met ? `Continue ${region.slug === 'meadow' ? next.groupLabel.toLowerCase() + ' ' : ''}${next.name}` : `Begin with ${next.name}`, sub: next.summary.due >= 3 ? `${next.summary.due} ${unit} are due` : `${next.summary.mastered} of ${next.total} ${unit} mastered`, gold: next.summary.due >= 3 } : null;
    const renderFields = () => {
      const shown = fields.filter((f) => f.group === group);
      body.innerHTML = `
        ${head({ pct: bloomPct, label: `${r.mastered} / ${r.total} ${unit}` }, cta)}
        <div class="place__section">
          <h2>${region.slug === 'meadow' ? 'The fields' : region.slug === 'pond' ? 'The shoals' : 'The languages'}</h2>
          <p class="sub">${region.slug === 'meadow' ? 'Every word you master opens a flower that stays. Fields bloom letter by letter.' : region.slug === 'pond' ? 'Each shoal holds the pairs beginning with one letter. Koi arrive as you tell them apart.' : 'A lantern lights along the path for every language you learn.'}</p>
          ${groups.length > 1 ? `<div class="g-chiprow">${groups.map((g) => `<button class="g-chip" data-group="${g}" aria-pressed="${g === group}">${escapeHTML(fields.find((f) => f.group === g)?.groupLabel ?? g)}</button>`).join('')}</div>` : ''}
          <div class="tiles">
            ${shown.map((f) => {
              const best = r.bestByField.get(f.id) ?? 0;
              const done = f.total > 0 && f.summary.mastered >= f.total * 0.9;
              return `<a class="tile ${f.id === next?.id ? 'tile--next' : ''} ${done ? 'tile--done' : ''}" href="#/round/${region.slug}/${f.id}">
                <span class="tile__stars" aria-label="${best} stars">${starHTML(best)}</span>
                <p class="tile__name">${escapeHTML(f.name)}${f.summary.due ? ` <small style="color:var(--g-gold);font-size:12px">✦ ${f.summary.due} due</small>` : ''}</p>
                <p class="tile__meta">${f.summary.mastered} of ${f.total} ${unit}${f.summary.met && !f.summary.mastered ? ` · ${f.summary.met} met` : ''}</p>
                <div class="tile__bar ${done ? 'tile__bar--gold' : ''}"><i style="width:${Math.round(f.summary.bloom * 100)}%"></i></div>
              </a>`;
            }).join('')}
          </div>
        </div>`;
      for (const b of body.querySelectorAll('[data-group]')) b.addEventListener('click', () => { group = b.dataset.group; play('page'); renderFields(); });
    };
    renderFields();
    return;
  }

  /* ================= The Reading Room ================= */
  if (region.slug === 'reading-room') {
    const rd = state.reading;
    mountHero(buildTowerScene(rd, atmo));
    heroStat.innerHTML = `<span class="hud__pill"><span class="star" aria-hidden="true">★</span>${rd.stars} / ${rd.maxStars}</span>`;
    const rcSessions = world.records.sessions.filter((s) => !s.module);
    const rec = recommendNext(content.rc, rcSessions);
    let night = false;
    try { night = rd.observatory && (await storage.get(STORES.SETTINGS, 'world:night-reading'))?.value === true; } catch { /* off */ }
    const cta = rec ? { href: `#/rc/session/${rec.item.id}`, label: rec.item.title, sub: `${rec.reason} ${rec.item.stage ? STAGE_INFO[rec.item.stage]?.label ?? '' : ''} · ~${rec.item.estimated_time_min} min · ${rec.item.question_count} questions`, gold: false } : null;
    const groups = groupByStage(content.rc);
    body.innerHTML = `
      ${head({ pct: rd.maxStars ? rd.stars / rd.maxStars : 0, label: `${rd.stars} / ${rd.maxStars} stars` }, cta)}
      ${rd.observatory ? `<div class="place__section"><div class="upgrade"><div class="upgrade__lead"><p class="upgrade__name">Night Reading</p><p class="upgrade__line">From the Observatory: a tighter pace (four fifths of the time) for the flawless mark.</p></div><button class="upgrade__btn" id="night-toggle" aria-pressed="${night}">${night ? 'On' : 'Off'}</button></div></div>` : ''}
      <div class="place__section">
        <h2>The shelves</h2>
        <p class="sub">${rd.passages} passages, foundation to elite. Three stars means three quarters right inside the passage's own time — the pace CAT asks for.</p>
        ${groups.map((g) => `
          <h3 style="font-family:var(--g-display);font-size:17px;margin:18px 0 4px">${escapeHTML(STAGE_INFO[g.stage]?.label ?? g.stage)}</h3>
          <p class="sub">${escapeHTML(STAGE_INFO[g.stage]?.description ?? '')}</p>
          <div class="g-list">
            ${g.items.map((it, i) => { const b = rd.best.get(it.id); return `<a class="g-row ${rec?.item.id === it.id ? 'g-row--next' : ''}" href="#/rc/session/${it.id}"><span class="g-row__num">${i + 1}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(it.title)}</span><span class="g-row__meta">${escapeHTML(it.genre)} · ${it.difficulty} · ~${it.estimated_time_min} min · ${it.question_count} Q${b ? ` · best ${Math.round(b.accuracy * 100)}%${b.flawless ? ' · flawless' : ''}` : ''}</span></span><span class="g-row__stars" aria-label="${b?.stars ?? 0} stars">${starHTML(b?.stars ?? 0)}</span></a>`; }).join('')}
          </div>`).join('')}
      </div>`;
    body.querySelector('#night-toggle')?.addEventListener('click', async (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; await storage.put(STORES.SETTINGS, { id: 'world:night-reading', value: on }); e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.textContent = on ? 'On' : 'Off'; play('tap'); });
    return;
  }

  /* ================= The Vine Terraces (Word DNA) ================= */
  if (region.slug === 'terraces') {
    const t = state.terraces;
    mountHero(buildBuildingScene('loom', t.level, atmo));
    heroStat.innerHTML = `<span class="hud__pill"><span class="star" aria-hidden="true">✦</span>${t.done} / ${t.total}</span>`;
    const wdSessions = world.records.sessions.filter((s) => s.module === 'wd');
    const done = new Set(); for (const s of wdSessions) for (const a of s.answers ?? []) if (a.is_correct === true) done.add(a.item_id ?? a.question_id);
    const kinds = [...new Set(content.wd.map((i) => i.kind))];
    const next = content.wd.find((i) => !done.has(i.id)) ?? content.wd[0];
    body.innerHTML = `
      ${head({ pct: t.total ? t.done / t.total : 0, label: `${t.done} / ${t.total} families` }, next ? { href: `#/wd/session/${next.id}`, label: `${next.title}`, sub: `${next.kind.replace('_', ' ')} · notice the shared piece, predict it, then apply it to a word never taught` } : null)}
      <div class="place__section">
        <h2>The vines</h2>
        <p class="sub">Prefixes, suffixes, foreign words and CAT vocabulary, learned by pattern: notice, predict, reveal, apply.</p>
        ${kinds.map((k) => `<h3 style="font-family:var(--g-display);font-size:17px;margin:16px 0 8px;text-transform:capitalize">${escapeHTML(k.replace('_', ' '))}</h3><div class="g-list">${content.wd.filter((i) => i.kind === k).map((it) => `<a class="g-row ${done.has(it.id) ? '' : ''}" href="#/wd/session/${it.id}"><span class="g-row__num">${done.has(it.id) ? '✓' : '·'}</span><span class="g-row__lead"><span class="g-row__title">${escapeHTML(it.title)}</span><span class="g-row__meta">${it.member_count ?? ''} words${it.estimated_time_sec ? ` · ~${Math.round(it.estimated_time_sec / 60)} min` : ''}</span></span></a>`).join('')}</div>`).join('')}
      </div>`;
    return;
  }

  /* ================= The Quarter: Loom / Table / Bench ================= */
  if (region.slug === 'loom' || region.slug === 'table' || region.slug === 'bench') {
    const v = state[region.slug];
    const kind = region.slug;
    mountHero(buildBuildingScene(kind, v.level, atmo));
    heroStat.innerHTML = `<span class="hud__pill"><span class="star" aria-hidden="true">★</span>${v.stars}</span>`;
    const [tiers, items, recommend, prefix, unit] = kind === 'loom' ? [PJ_TIERS, content.pj, recommendNextPJ, 'pj', 'jumbles'] : kind === 'table' ? [PS_TIERS, content.ps, recommendNextPS, 'ps', 'summaries'] : [OOO_TIERS, content.ooo, recommendNextOOO, 'ooo', 'sets'];
    const solved = new Set(), tried = new Set();
    for (const s of world.records.sessions.filter((x) => x.module === v.module)) for (const a of s.answers ?? []) { const id = a.item_id ?? a.question_id; if (a.is_correct !== null) tried.add(id); if (a.is_correct === true) solved.add(id); }
    const rec = recommend(items, solved, tried);
    body.innerHTML = `
      ${head({ pct: v.total ? v.solved / v.total : 0, label: `${v.solved} / ${v.total} solved` }, rec ? { href: `#/${prefix}/session/${rec.item.id}`, label: rec.item.title, sub: `${rec.reason} ${rec.tier.label} · ~${Math.max(1, Math.round((rec.item.estimated_time_sec ?? 60) / 60))} min` } : null)}
      <div class="place__section">
        <h2>Eight tiers</h2>
        <p class="sub">Each tier teaches one thing and feels different, not just harder. Play a whole tier as one timed set.</p>
        <div class="tiles">
          ${tiers.map((t, i) => { const inTier = items.filter((it) => it.tier === t.id); const s = inTier.filter((it) => solved.has(it.id)).length; const done = inTier.length > 0 && s === inTier.length; return `<a class="tile ${rec?.tier.id === t.id ? 'tile--next' : ''} ${done ? 'tile--done' : ''}" href="#/${prefix}/session/${t.id}"><p class="tile__name">${escapeHTML(t.label)}</p><p class="tile__meta">${s} of ${inTier.length} ${unit}</p><div class="tile__bar ${done ? 'tile__bar--gold' : ''}"><i style="width:${inTier.length ? Math.round((s / inTier.length) * 100) : 0}%"></i></div></a>`; }).join('')}
        </div>
        <p class="sub" style="margin-top:14px"><a href="#/${prefix}/about">How this craft works</a> · <a href="#/${prefix}">The full journey</a></p>
      </div>`;
    return;
  }
}

export { STAGES };
