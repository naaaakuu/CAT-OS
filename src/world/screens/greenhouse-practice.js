import { GreenhouseRound, GREENHOUSE_SIZE, GREENHOUSE_DRAFT, greenhouseRecord, recallQuestion, leafState } from '../greenhouse.js';
import { loadField, loadLedger, listFields, pickRound } from '../lexicon.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { greenhouseStyle } from '../../ui/greenhouse-style.js';
import { petSprite, FRAME } from '../../pets/sprite.js';
import { plantArt } from './greenhouse-art.js';
import { escapeHTML as esc } from '../../core/utils/format.js';
import { focusContent } from '../../ui/focus.js';
import { play, silenceWorld } from '../audio.js';

export async function renderGreenhousePractice(outlet, { storage }, params) {
  const arrived = location.hash;
  document.documentElement.setAttribute('data-world', '');
  silenceWorld();
  await greenhouseStyle();
  const controller = new AbortController();
  const { signal } = controller;
  let round, ledger, fields, saved;
  try {
    [ledger, fields, saved] = await Promise.all([loadLedger(storage), listFields('meadow'), storage.get(STORES.SETTINGS, GREENHOUSE_DRAFT)]);
    let picks = [];
    if (saved?.value?.picks?.length) {
      const bundles = new Map(await Promise.all([...new Set(saved.value.picks.map((p) => p.bundle_id))].map(async (id) => [id, await loadField('meadow', id)])));
      picks = saved.value.picks.map((p) => ({ entry: bundles.get(p.bundle_id).entries.find((e) => e.id === p.entry_id), bundle: bundles.get(p.bundle_id) }));
      if (picks.some((p) => !p.entry)) throw new Error('A saved word could not be found.');
    } else {
      const query = new URLSearchParams(location.hash.split('?')[1]);
      const reviewOnly = query.has('review');
      const band = ['high', 'medium', 'low'].includes(query.get('band')) ? query.get('band') : 'high';
      const reviewFields = new Set([...ledger.values()].filter((r) => r.region === 'meadow' && leafState(r) === 'yellow').map((r) => r.bundle_id));
      let chosen = params.field ? fields.filter((f) => f.id === params.field) : fields.filter((f) => reviewFields.has(f.id));
      if (!params.field && !reviewOnly) {
        const coverage = (f) => [...ledger.values()].filter((r) => r.bundle_id === f.id && r.level >= 2).length / (f.total || 1);
        chosen = [...chosen, ...fields.filter((f) => !reviewFields.has(f.id) && f.group === band).sort((a,b) => coverage(a) - coverage(b)).slice(0, 3)];
      }
      const bundles = await Promise.all(chosen.map((f) => loadField('meadow', f.id)));
      const bundleOf = new Map();
      for (const b of bundles) for (const e of b.entries) bundleOf.set(e.id, b);
      let entries = bundles.flatMap((b) => b.entries);
      if (reviewOnly) entries = entries.filter((e) => ledger.has(e.id) && leafState(ledger.get(e.id)) === 'yellow');
      picks = pickRound(entries, ledger, Date.now(), GREENHOUSE_SIZE, `matcha:${Date.now()}`).map((entry) => ({ entry, bundle: bundleOf.get(entry.id) }));
    }
    round = new GreenhouseRound(picks, saved?.value);
    // A one-word letter still needs real alternatives. Borrow meanings only;
    // the practice and its progress stay inside the chosen letter bed.
    const openBundles = new Set(picks.map((p) => p.bundle.meta.id));
    if (new Set(picks.flatMap((p) => p.bundle.entries.map((e) => e.meaning))).size < 4) {
      const band = fields.find((f) => f.id === picks[0]?.bundle.meta.id)?.group;
      const extra = fields.find((f) => f.group === band && !openBundles.has(f.id) && f.total >= 4);
      if (extra) round.pool = (await loadField('meadow', extra.id)).entries;
    }
  } catch (e) {
    if (location.hash === arrived) outlet.innerHTML = `<section class="gh-practice"><div class="gh-practice-main"><h1>The words need a moment</h1><p>Your saved practice is safe. Try opening it again.</p><a class="gh-start" href="#/world/place/meadow">Back to the glasshouse →</a></div></section>`;
    console.error('[CAT OS] greenhouse', e); return;
  }
  if (location.hash !== arrived) return;
  window.addEventListener('hashchange', () => controller.abort(), { once: true });
  if (!round.total) {
    outlet.innerHTML = `<section class="gh-practice"><div class="gh-practice-main"><h1>This bed is resting</h1><p>No words need this visit. Your other beds are ready when you are.</p><a class="gh-start" href="#/world/place/meadow">Back to the glasshouse →</a></div></section>`; return;
  }
  const persist = () => storage.put(STORES.SETTINGS, { id: GREENHOUSE_DRAFT, value: round.snapshot() });
  const alive = () => !signal.aborted && location.hash === arrived;
  const entryRoute = params.field ? `#/round/meadow/${params.field}` : '#/round/meadow';
  outlet.innerHTML = `<section class="gh-practice"><nav class="gh-practice-nav"><a class="gh-back" href="#/world/place/meadow" aria-label="Pause and return to glasshouse">×</a><div><p class="gh-eyebrow">A little practice with Matcha</p><p id="run-what">${round.total} words · no rush</p></div><span class="gh-practice-mascot" aria-hidden="true">${petSprite('matcha', {size:52,frame:FRAME.happy})}</span></nav><div class="gh-recall-track" id="gh-recall-track" aria-label="Word recall progress"></div><main class="gh-practice-main" id="body"></main></section>`;
  const body = outlet.querySelector('#body');
  const what = outlet.querySelector('#run-what');
  function drawTrack() {
    outlet.querySelector('#gh-recall-track').innerHTML = round.states.map((s,i) => `<span class="gh-recall-leaf ${s.streak >= 2 ? 'is-green' : s.streak === 1 ? 'is-yellow' : 'is-new'}${i === round.currentIndex ? ' is-current' : ''}" aria-label="Word ${i + 1}: ${s.streak >= 2 ? 'learned' : s.streak === 1 ? 'one correct recall' : 'still growing'}">❧</span>`).join('');
  }
  drawTrack();
  if (round.done) { await finish(); return; }
  body.innerHTML = `<div class="gh-brief"><div class="gh-brief-plant">${plantArt('high', .55)}</div><p class="gh-eyebrow">Ten small steps, deeper roots</p><h1>${saved?.value ? 'Welcome back,<br>word gardener.' : 'Let’s grow<br>something good.'}</h1><p>${round.total} words. One at a time.<br>Recall each one twice to turn its leaf green.</p><div class="gh-brief-rule"><i class="gh-dot is-yellow"></i> One good recall <span>→</span><i class="gh-dot is-green"></i> Two in a row</div><p class="gh-brief-note">Miss a word? See its meaning and meet it again in a shuffled later pass.</p><button class="gh-start" id="begin">${saved?.value ? 'Continue practice' : 'Plant the first word'} <span aria-hidden="true">→</span></button><p class="gh-save-note" id="gh-save-note" role="status">You can pause. Your place stays saved.</p></div>`;
  body.querySelector('#begin').onclick = async (e) => {
    e.currentTarget.disabled = true;
    try { await persist(); if (alive()) showQuestion(); }
    catch { if (alive()) { body.querySelector('#gh-save-note').textContent = 'Your place could not be saved. Tap to try again.'; body.querySelector('#begin').disabled = false; } }
  };

  function showQuestion() {
    if (!alive()) return;
    const q = recallQuestion(round);
    const s = round.state;
    let locked = false;
    const shown = Date.now();
    what.textContent = `${round.learned} of ${round.total} words rooted`;
    drawTrack();
    body.innerHTML = `<article class="gh-question"><div class="gh-question-meta"><span>${round.wave === 0 ? `First visit · ${round.cursor + 1} of ${round.total}` : s.streak ? 'One more good recall' : s.missed ? 'A fresh try' : 'Let’s make it stick'}</span><span>${s.streak} / 2 recalls</span></div><h1 class="gh-question-word" tabindex="-1">${esc(q.entry.word)}</h1><p class="gh-question-ask">Which meaning fits?</p><div class="gh-options" id="opts">${q.options.map((o,i) => `<button class="gh-option vopt" type="button" data-option="${i}"><span class="gh-option-key" aria-hidden="true">${String.fromCharCode(65+i)}</span><span>${esc(o.text)}</span><span class="gh-option-mark" aria-hidden="true"></span></button>`).join('')}</div><div id="feedback"></div></article><div class="gh-practice-bottom"><p id="gh-practice-hint">A little thinking time helps roots grow.</p></div>`;
    focusContent(body.querySelector('h1'));
    body.querySelector('#opts').onclick = async (e) => {
      const button = e.target.closest('[data-option]');
      if (!button || locked) return;
      locked = true;
      const choice = Number(button.dataset.option), correct = q.options[choice].correct;
      round.answer(correct, Date.now() - shown);
      body.querySelector('.gh-question-meta>span:last-child').textContent = `${s.streak} / 2 recalls`;
      drawTrack();
      what.textContent = `${round.learned} of ${round.total} words rooted`;
      const fb = body.querySelector('#feedback');
      for (const b of body.querySelectorAll('[data-option]')) {
        const i = Number(b.dataset.option); b.disabled = true;
        b.classList.toggle('is-correct', q.options[i].correct);
        b.classList.toggle('is-miss', i === choice && !correct);
        b.classList.toggle('is-other', i !== choice && !q.options[i].correct);
        b.querySelector('.gh-option-mark').textContent = q.options[i].correct ? '✓' : i === choice ? '×' : '';
      }
      play(correct ? 'correct' : 'wrong');
      fb.innerHTML = `<div class="gh-feedback${correct ? ' is-correct' : ''}"><p role="status" tabindex="-1">${correct ? (s.streak >= 2 ? 'Taking root. Two good recalls!' : 'That’s it. One more recall to grow.') : 'No problem. We’ll meet this one again.'}</p>${!correct ? `<p class="gh-correction"><b>${esc(q.entry.word)}</b> · ${esc(q.entry.meaning)}</p>` : ''}<details><summary>${correct ? 'See meaning & example' : 'See an example'}</summary><p>${esc(q.entry.meaning)}</p>${q.entry.example || q.entry.examples?.[0] ? `<p class="gh-example">${esc(q.entry.example || q.entry.examples[0])}</p>` : ''}</details></div>`;
      body.querySelector('.gh-practice-bottom').innerHTML = `<button class="gh-start" id="word-next" disabled>${round.learned === round.total ? 'See your new growth' : 'Next word'}<span aria-hidden="true">→</span></button><p id="gh-save-note" class="gh-save-note" role="status">Saving your place…</p>`;
      const next = body.querySelector('#word-next');
      let persisted = false;
      async function saveCheckpoint() {
        try { await persist(); if (!alive()) return; persisted = true; next.disabled = false; next.firstChild.textContent = round.learned === round.total ? 'See your new growth' : 'Next word'; body.querySelector('#gh-save-note').textContent = correct && s.streak >= 2 ? 'A green leaf for your glasshouse.' : 'Saved. Keep growing at your own pace.'; }
        catch { if (!alive()) return; next.disabled = false; next.firstChild.textContent = 'Retry saving'; body.querySelector('#gh-save-note').textContent = 'Your place could not be saved. Try once more.'; }
      }
      next.onclick = async () => {
        next.disabled = true;
        if (!persisted) { await saveCheckpoint(); return; }
        if (round.next()) showQuestion(); else await finish();
      };
      focusContent(fb.querySelector('[role="status"]'));
      await saveCheckpoint();
    };
  }

  async function finish() {
    if (!alive()) return;
    body.innerHTML = `<div class="gh-brief"><h1>Putting down roots…</h1><p role="status">Saving your new growth.</p></div>`;
    const now = Date.now();
    try {
      for (const p of round.picks) {
        const previous = ledger.get(p.entry.id);
        const rec = previous?.greenhouse_round === round.id ? previous : { ...greenhouseRecord(previous, p, now), greenhouse_round: round.id };
        await storage.put(STORES.LEARNING, rec); ledger.set(p.entry.id, rec);
      }
      await storage.put(STORES.LEARNING, round.result(now));
      await storage.delete(STORES.SETTINGS, GREENHOUSE_DRAFT);
    } catch (e) {
      if (!alive()) return;
      body.innerHTML = `<div class="gh-brief"><h1>Your growth is waiting.</h1><p>We could not save it yet. Your practice is still here.</p><button class="gh-start" id="gh-retry">Try saving again →</button></div>`;
      body.querySelector('#gh-retry').onclick = finish; return;
    }
    if (!alive()) return;
    what.textContent = `${round.total} of ${round.total} words rooted`;
    drawTrack();
    body.innerHTML = `<div class="gh-complete result"><div class="gh-complete-art">${plantArt(round.picks[0]?.bundle.meta.band || 'high', .8)}</div><p class="gh-eyebrow">A good day in the glasshouse</p><h1>${round.total} words.<br>Stronger roots.</h1><p>You recalled every word correctly twice in a row.<br>Matcha will keep a leaf for each one.</p><div class="gh-result-count"><span class="gh-dot is-green"></span><strong>${round.total}</strong> leaves turned green</div><div class="result__actions"><a class="gh-start" href="#/world/place/meadow">See your glasshouse <span aria-hidden="true">→</span></a><a class="gh-text-link" href="${entryRoute}?fresh=${Date.now()}">Another little session ↗</a></div><details class="gh-session-words"><summary>The words you grew</summary>${round.picks.map((p) => `<div class="gh-word-row is-green"><b>${esc(p.entry.word)}</b><span>${esc(p.entry.meaning)}</span></div>`).join('')}</details><p class="gh-save-note">Saved. Future visits will keep these leaves green.</p></div>`;
    focusContent(body.querySelector('h1'));
  }
}
