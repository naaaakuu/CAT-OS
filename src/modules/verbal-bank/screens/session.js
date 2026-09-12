/**
 * session.js (screen) — a set from one of the content engine's banks,
 * end to end: the item, the choice, the teaching, the next; then the
 * world's reward and one lesson about the trap that worked most.
 *
 * Deliberately the same shape as the Quarter's screens, and deliberately
 * smaller: the paragraph or sentence or argument above, the question card
 * below, the explanation in place (the trap the learner fell for, named in
 * English, then the working one tap away), no scoreboard. The
 * sophistication lives in the items and in what the answer records.
 */

import { listBankItems, loadBankFile, loadBankFiles, normalizeBankItem } from '../../../core/content-loader/loader.js';
import { BankSession, pickSet } from '../../../core/engine/bank-session.js';
import { BANKS, WB_KIND_REGION, TRAP_FAMILY, TRAP_FAMILY_LINE } from '../../../core/learning/taxonomy.js';
import { isRested } from '../../../core/learning/review.js';
import { STORES } from '../../../core/storage/storage-adapter.js';
import { cue } from '../../../core/engagement/feedback.js';
import { worldReward } from '../../../world/rewards.js';
import { toast } from '../../../ui/components/cat-toast.js';
import { trapName } from '../../../ui/components/cat-explanation.js';
import { escapeHTML, formatDuration } from '../../../core/utils/format.js';
import '../../../ui/components/cat-question-card.js';
import '../../../ui/components/cat-explanation.js';
import '../../../ui/components/cat-progress-bar.js';
import '../../../ui/components/cat-timer.js';

const TIERS = ['foundation', 'easy', 'medium', 'advanced', 'cat', 'cat-plus', 'ninety-nine', 'premium'];
const BAND = { core: 0, stretch: 1, elite: 2 };
const REGION_NAME = {
  loom: 'The Loom', table: 'The Summary Table', bench: 'The Stranger’s Bench', 'reading-room': 'The Reading Room',
  meadow: 'The Meadow', pond: 'The Mirror Pond', terraces: 'The Vine Terraces',
};

/** Which items the learner has already solved in a bank. */
function solvedSet(sessions, type) {
  const s = new Set();
  for (const x of sessions) if (x.module === type) for (const a of x.answers ?? []) if (a.is_correct === true) s.add(a.item_id ?? a.question_id);
  return s;
}

/** Resolve what to practise: a tier, a bundle, one item, a kind, a band, or `next`. */
async function resolveSet(type, setParam, storage) {
  const bank = BANKS[type];
  if (!bank) throw new Error(`"${type}" is not something the valley practises.`);
  const rows = await listBankItems(type);
  let sessions = [];
  try { sessions = await storage.getAll(STORES.SESSIONS); } catch { /* an empty record */ }
  const rested = (at, n) => isRested(at, n);
  const solved = solvedSet(sessions, type);

  if (type === 'sp' || type === 'pc') {
    if (/^(sp|pc)-[0-9]{4}$/.test(setParam)) {
      const f = await loadBankFile(type, setParam);
      return { setId: setParam, items: [normalizeBankItem(type, f)], region: bank.region, label: f.meta.tier };
    }
    const order = (a, b) => (TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier)) || ((a.difficulty_numeric ?? 5) - (b.difficulty_numeric ?? 5)) || a.id.localeCompare(b.id);
    let tier = setParam;
    if (setParam === 'next') tier = TIERS.find((t) => rows.some((r) => r.tier === t && !solved.has(r.id))) ?? rows[0]?.tier ?? 'foundation';
    const pool = rows.filter((r) => r.tier === tier).sort(order);
    if (!pool.length) throw new Error(`There is nothing in "${tier}" yet.`);
    const chosen = pickSet(pool, sessions, type, bank.setSize, rested);
    const files = await loadBankFiles(type, chosen.map((r) => r.id));
    const items = chosen.map((r) => files.get(r.id)).filter(Boolean).map((f) => normalizeBankItem(type, f));
    if (!items.length) throw new Error('Those items could not be loaded.');
    return { setId: `${type}-set:${tier}`, items, region: bank.region, label: tier.replace('-', ' ') };
  }

  let bundles;
  if (/^(wb|cr)-[0-9]{4}$/.test(setParam)) bundles = rows.filter((r) => r.id === setParam);
  else if (setParam.startsWith('kind:')) bundles = rows.filter((r) => r.kind === setParam.slice(5));
  else if (setParam.startsWith('band:')) bundles = rows.filter((r) => r.band === setParam.slice(5));
  else bundles = rows;
  if (!bundles.length) throw new Error(`Nothing matches "${setParam}" yet.`);
  // The bundle with something left in it, easiest band first — never a
  // finished bundle while an unfinished one is waiting.
  const left = (r) => (r.item_ids ?? []).filter((id) => !solved.has(id)).length;
  const pick = [...bundles].sort((a, b) => (left(b) > 0) - (left(a) > 0) || (BAND[a.band] ?? 0) - (BAND[b.band] ?? 0) || a.id.localeCompare(b.id))[0];
  const file = await loadBankFile(type, pick.id);
  const all = file.items.map((it) => normalizeBankItem(type, file, it.id));
  const items = pickSet(all, sessions, type, bank.setSize, rested);
  const region = type === 'wb' ? (WB_KIND_REGION[file.meta.kind] ?? 'meadow') : bank.region;
  return { setId: `${type}-set:${pick.id}`, items, region, label: file.meta.title, bundle: file.meta };
}

/* ---------------- What is shown above the question ---------------- */

function promptFor(it) {
  if (it.type === 'sp' || it.type === 'pc' || it.type === 'cr') return it.stem;
  const w = escapeHTML(it.word);
  const blank = it.stem.includes('____');
  switch (it.kind) {
    case 'context': return `As used in the sentence, “${w}” most nearly means`;
    case 'decode': return `You may never have met “${w}”. From its parts and its sentence, it most nearly means`;
    case 'confusable': return 'Which word does the sentence want?';
    case 'register': return blank ? 'Which word fits the register of the sentence?' : `Which word could replace “${w}” without changing the register?`;
    case 'connotation': return blank ? 'Which word carries the colouring the sentence needs?' : `Which word carries the same colouring as “${w}” here?`;
    default: return blank ? 'Which word completes the sentence most precisely?' : `Which is nearest in meaning to “${w}” as used here?`;
  }
}

function markWord(sentence, word) {
  const probe = word.toLowerCase().split(' ')[0];
  const stem = probe.slice(0, Math.max(4, probe.length - 3));
  const i = sentence.toLowerCase().indexOf(stem);
  if (i < 0) return escapeHTML(sentence);
  let j = i;
  while (j < sentence.length && /[A-Za-z’'-]/.test(sentence[j])) j += 1;
  return `${escapeHTML(sentence.slice(0, i))}<em class="bank-word">${escapeHTML(sentence.slice(i, j))}</em>${escapeHTML(sentence.slice(j))}`;
}

function bodyHTML(it, revealed = false) {
  const b = it.body;
  if (b.kind === 'sp') {
    const pos = revealed ? b.positions[it.correct] : -1;
    const rows = [];
    if (pos === 0) rows.push(`<li class="bank-para__placed"><span class="bank-n">•</span>${escapeHTML(b.missing)}</li>`);
    for (const s of b.sentences) {
      rows.push(`<li><span class="bank-n">${s.n}</span>${escapeHTML(s.text)}</li>`);
      if (pos === s.n) rows.push(`<li class="bank-para__placed"><span class="bank-n">•</span>${escapeHTML(b.missing)}</li>`);
    }
    return `<ol class="bank-para bank-para--numbered">${rows.join('')}</ol>
      ${revealed ? '' : `<div class="bank-missing"><p class="psx__label">The sentence to place</p><p>${escapeHTML(b.missing)}</p></div>`}`;
  }
  if (b.kind === 'pc') {
    const parts = [];
    b.sentences.forEach((s, i) => {
      if (i === b.gap_index) parts.push(revealed ? `<mark class="bank-filled">${escapeHTML(it.options[it.correct])}</mark>` : '<span class="bank-blank" aria-label="the missing sentence">________</span>');
      parts.push(escapeHTML(s));
    });
    if (b.gap_index >= b.sentences.length) parts.push(revealed ? `<mark class="bank-filled">${escapeHTML(it.options[it.correct])}</mark>` : '<span class="bank-blank" aria-label="the missing sentence">________</span>');
    return `<p class="bank-para">${parts.join(' ')}</p>`;
  }
  if (b.kind === 'wb') {
    const sentence = it.stem.includes('____')
      ? escapeHTML(it.stem).replace('____', revealed ? `<mark class="bank-filled">${escapeHTML(it.options[it.correct])}</mark>` : '<span class="bank-blank">____</span>')
      : markWord(it.stem, b.word);
    const parts = revealed && b.parts ? `<div class="bank-parts">${b.parts.map((p) => `<span class="bank-part"><b>${escapeHTML(p.text)}</b><small>${escapeHTML(p.gloss)}</small></span>`).join('')}</div>` : '';
    return `<p class="bank-sentence">${sentence}</p>${parts}`;
  }
  return `<blockquote class="bank-argument">${escapeHTML(b.argument)}</blockquote>`;
}

/* ---------------- The screen ---------------- */

export async function renderBankSession(outlet, { storage }, params) {
  let resolved;
  try {
    resolved = await resolveSet(params.type, params.set, storage);
  } catch (err) {
    outlet.innerHTML = `
      <section class="screen">
        <h1>Can't open this set</h1>
        <div class="card"><p>${escapeHTML(err.message)}</p>
        <p class="muted"><a href="#/world">Back to the valley</a></p></div>
      </section>`;
    return;
  }
  const type = params.type;
  const bank = BANKS[type];
  const back = `#/world/place/${resolved.region}`;
  const session = new BankSession(resolved.items, { module: type, setId: resolved.setId, region: resolved.region });
  const startedAt = Date.now();

  function showItem() {
    const it = session.current;
    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar">
          <a href="${back}">← ${escapeHTML(REGION_NAME[resolved.region] ?? 'The valley')}</a>
          <span>Item <b>${session.index + 1}</b> of ${session.total}</span>
          <cat-timer></cat-timer>
        </div>
        <cat-progress-bar max="${session.total}" value="${session.index}"></cat-progress-bar>
        <div class="card">
          <p class="screen__eyebrow">${escapeHTML(bank.name)}</p>
          <div class="briefing-chips">
            <span class="badge">${escapeHTML(it.label)}</span>
            ${it.tier ? `<span class="badge">${escapeHTML(String(it.tier).replace('-', ' '))}</span>` : it.band ? `<span class="badge">${escapeHTML(it.band)}</span>` : ''}
            ${it.genre ? `<span class="badge">${escapeHTML(it.genre)}</span>` : ''}
            <span class="badge">~${Math.max(20, it.time_sec)} s</span>
          </div>
          ${it.mentor?.challenge ? `<p class="ps-challenge">${escapeHTML(it.mentor.challenge)}</p>` : ''}
          <div class="bank-body" id="body">${bodyHTML(it)}</div>
          <div id="choose-slot"><cat-question-card></cat-question-card></div>
          <div id="teaching-slot"></div>
          <div class="session-actions" id="actions"></div>
        </div>
      </section>`;
    outlet.querySelector('cat-timer').startAt = startedAt;
    const card = outlet.querySelector('cat-question-card');
    const body = outlet.querySelector('#body');
    const teaching = outlet.querySelector('#teaching-slot');
    const actions = outlet.querySelector('#actions');
    card.question = { type: it.label, stem: promptFor(it), options: it.options };
    session.markItemShown();

    let selected = null;
    card.addEventListener('cat-option-select', (e) => { selected = e.detail.letter; card.selected = selected; syncChoosing(); });
    function syncChoosing() {
      actions.innerHTML = `
        <button class="btn" id="skip">Set aside</button>
        <button class="btn btn--primary" id="lock" ${selected ? '' : 'disabled'}>Lock it in</button>`;
      actions.querySelector('#lock').addEventListener('click', onLock);
      actions.querySelector('#skip').addEventListener('click', onSkip);
    }
    function reveal(chosen) {
      card.reveal = { chosen, correct: it.correct };
      body.innerHTML = bodyHTML(it, true);
      const ex = document.createElement('cat-explanation');
      ex.data = { question: it, chosen };
      teaching.replaceChildren(ex);
      if (it.mentor?.takeaway) teaching.insertAdjacentHTML('beforeend', `<p class="bank-takeaway">${escapeHTML(it.mentor.takeaway)}</p>`);
      actions.innerHTML = `<button class="btn btn--primary btn--block" id="next">${session.isLast ? 'Finish the set' : 'Next'}</button>`;
      actions.querySelector('#next').addEventListener('click', onNext);
      requestAnimationFrame(() => ex.querySelector('.verdict')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    function onLock() {
      if (!selected) return;
      const verdict = session.answer(selected);
      cue(verdict.is_correct ? 'correct' : 'wrong');
      reveal(selected);
    }
    function onSkip() { session.skip(); reveal(null); }
    async function onNext() {
      if (session.next()) { showItem(); window.scrollTo(0, 0); } else { await finish(); window.scrollTo(0, 0); }
    }
    syncChoosing();
  }

  /* ---------------- The moment ---------------- */
  async function finish() {
    const results = session.finish();
    try {
      await storage.put(STORES.SESSIONS, results.session);
      for (const a of results.attempts) await storage.put(STORES.ATTEMPTS, a);
    } catch (err) {
      console.error('[CAT OS]', err);
      toast('Set finished but could not be saved.', 'error');
    }
    const s = results.session;

    // One lesson: the trap that worked most in this set, named, with the
    // family it belongs to — the thing to notice next time.
    const traps = new Map();
    for (const a of s.answers) if (a.trap) traps.set(a.trap, (traps.get(a.trap) ?? 0) + 1);
    const top = [...traps.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const missedItem = top ? session.items.find((it) => s.answers.find((a) => a.item_id === it.id && a.trap === top[0])) : null;
    const missedD = missedItem ? missedItem.distractors.find((d) => d.trap_type === top[0]) : null;
    const family = top ? (TRAP_FAMILY[top[0]] ?? null) : null;
    const lesson = top ? {
      opening: top[1] > 1 ? `The same pull worked ${top[1]} times.` : 'One option was built for you, and it worked.',
      title: trapName(top[0]),
      moment: missedD?.seductive_element ? `It felt right because: ${missedD.seductive_element}` : (missedD?.why_wrong ?? ''),
      pull: family ? `This is a ${family} trap — ${TRAP_FAMILY_LINE[family] ?? ''}.` : '',
      notice: missedItem?.explanation?.reading_habit ?? '',
    } : { opening: s.score.correct === s.score.total ? 'Nothing here got past you.' : 'Set complete.', title: '', moment: '', pull: '', notice: session.items[0]?.explanation?.reading_habit ?? '' };

    const reward = worldReward(s, session.items);
    outlet.innerHTML = `
      <section class="screen">
        <div class="session-bar"><a href="${back}">← ${escapeHTML(REGION_NAME[resolved.region] ?? 'The valley')}</a></div>
        <article class="moment">
          <p class="screen__eyebrow">${escapeHTML(String(resolved.label ?? '').toLowerCase().startsWith(bank.name.toLowerCase()) ? resolved.label : `${bank.name} · ${resolved.label ?? ''}`)}</p>
          <h1 class="moment__opening">${escapeHTML(lesson.opening)}</h1>
          ${lesson.title ? `
          <div class="moment__lesson">
            <span class="moment__chip">${escapeHTML(lesson.title)}</span>
            ${lesson.moment ? `<div class="moment__block"><div class="moment__label">The moment</div><p>${escapeHTML(lesson.moment)}</p></div>` : ''}
            ${lesson.pull ? `<div class="moment__block"><div class="moment__label">The pull</div><p>${escapeHTML(lesson.pull)}</p></div>` : ''}
            ${lesson.notice ? `<div class="moment__block"><div class="moment__label">How to notice it next time</div><p>${escapeHTML(lesson.notice)}</p></div>` : ''}
          </div>` : (lesson.notice ? `<p class="moment__closing">${escapeHTML(lesson.notice)}</p>` : '')}
          <p class="moment__numbers">${s.score.correct} of ${s.score.total}, in ${formatDuration(s.duration_ms)}.</p>
          ${reward.html}
          <details class="reread moment__details">
            <summary>Set details</summary>
            <div class="reread__body">
              ${s.answers.map((a, i) => {
                const glyph = a.is_correct === true ? '✓' : a.is_correct === false ? '·' : '–';
                const it = session.items[i];
                return `<div class="row"><span class="row__label">${i + 1}. ${escapeHTML(it?.title ?? it?.word ?? it?.label ?? '')} <span class="${a.is_correct === true ? 'verdict--correct' : ''}">${glyph}</span></span><span class="row__hint">${a.chosen ? `chose ${a.chosen}` : 'set aside'}${a.trap ? ` · ${escapeHTML(trapName(a.trap))}` : ''} · ${formatDuration(a.time_ms)}</span></div>`;
              }).join('')}
              <p class="hint" style="margin-top: var(--space-3)">CAT-style marks: +3 for each right answer, 0 otherwise. Recent papers set these choice questions without negative marking; the scheme is announced per cycle.</p>
            </div>
          </details>
        </article>
        <div class="session-actions">
          <a class="btn btn--primary btn--block" href="${back}">Back to the world</a>
        </div>
      </section>`;
    cue('mentor');
  }

  showItem();
}
