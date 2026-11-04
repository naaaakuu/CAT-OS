import { BANDS, GREENHOUSE_DRAFT, greenhouseBeds, leafState } from '../greenhouse.js';
import { loadField, ledgerFromRecords } from '../lexicon.js';
import { plantArt } from './greenhouse-art.js';
import { petSprite, FRAME } from '../../pets/sprite.js';
import { escapeHTML as esc } from '../../core/utils/format.js';
import { STORES } from '../../core/storage/storage-adapter.js';
import { infoButton } from '../../ui/info.js';
import { play } from '../audio.js';
export { greenhouseStyle } from '../../ui/greenhouse-style.js';

export async function renderGreenhouse(outlet, { storage, world, stage = 0 }) {
  const at = location.hash;
  const ledger = ledgerFromRecords(world.records.learning);
  const fields = world.content.fields.meadow;
  const draft = await storage.get(STORES.SETTINGS, GREENHOUSE_DRAFT).catch(() => null);
  if (location.hash !== at) return;
  let band = BANDS[0];
  const remembered = [...ledger.values()].filter((r) => r.region === 'meadow' && r.level >= 2).length;
  const due = [...ledger.values()].filter((r) => r.region === 'meadow' && leafState(r) === 'yellow').length;
  const total = fields.reduce((n,f) => n + f.total, 0);
  const controller = new AbortController();
  const { signal } = controller;
  window.addEventListener('hashchange', () => controller.abort(), { once: true });
  outlet.innerHTML = `<section class="gh-house" aria-label="Matcha's Glasshouse">
    <header class="gh-hero">
      <nav class="gh-nav"><a href="#/world" class="gh-back" aria-label="Back to village">←</a><span>Matcha’s vocabulary house</span>${infoButton('vocab', { label: 'How the glasshouse grows', moreTitle: 'Growing your glasshouse', more: ['Each letter is a plant bed. Its size follows learned words divided by all the words in that bed. Yellow leaves need another visit; green leaves are remembered.', 'Practise up to ten words. Every word needs two correct recalls in a row. Miss one and it returns in a shuffled later pass. Yellow means one recall; green means two.', 'A visit grows memory, then reviews are spaced over days. Empty beds stay open for future words.'] })}</nav>
      <div class="gh-hero-title"><p class="gh-eyebrow">A home for growing words</p><h1>The Glasshouse<span>.</span></h1></div>
      <div class="gh-welcome"><span class="gh-welcome__line">A word today.<br>A little greener tomorrow.</span><span class="gh-mascot" aria-hidden="true">${petSprite('matcha', { size: 112, frame: FRAME.happy, stage })}</span></div>
    </header>
    <main class="gh-main">
      <div class="gh-ledger"><div><span class="gh-eyebrow">Your growing vocabulary</span><p><strong>${remembered.toLocaleString()}</strong><span> / ${total.toLocaleString()} words learned</span></p></div><span class="gh-ledger__seal" aria-hidden="true">❧</span><div class="gh-meter"><i style="width:${total ? remembered / total * 100 : 0}%"></i></div></div>
      <div class="gh-tabs" role="group" aria-label="Word frequency">${BANDS.map((b) => `<button type="button" data-band="${b.id}" aria-pressed="${b === band}">${b.label.split(' ')[0]}<small>frequency</small></button>`).join('')}</div>
      <div class="gh-section-heading"><div><p class="gh-eyebrow" id="gh-band-note">The everyday collection</p><h2 id="gh-band-title">Citrus grove</h2></div><span class="gh-section-heading__letters">A–Z <span aria-hidden="true">↘</span></span></div>
      <div class="gh-legend"><span><i class="gh-dot is-green"></i>Remembered</span><span><i class="gh-dot is-yellow"></i>Needs review</span><button type="button" id="gh-words">Your words ↗</button></div>
      <div class="gh-beds" id="gh-beds"></div>
      <details class="gh-more"><summary>More ways to grow</summary><a href="#/world/place/rootwood">Word roots ↗</a><a href="#/world/place/pond">Confusable words ↗</a><a href="#/world/place/terraces">Word parts ↗</a><a href="#/bank/session/wb/wb-0001">Words in context ↗</a><a href="#/world/place/thicket">Borrowed words ↗</a></details>
      <p class="gh-footer-note">Little visits. Lasting roots.</p>
    </main>
    <footer class="gh-dock"><a class="gh-start${due && !draft?.value ? ' is-review' : ''}" href="#/round/meadow"><span>${draft?.value ? 'Continue your practice' : due ? 'Revive yellow leaves' : 'Grow ten words'}<small>${draft?.value ? 'Your little session is saved' : due ? `${due} leaves to refresh · one word at a time` : 'One word at a time · two good recalls'}</small></span><span aria-hidden="true">→</span></a></footer>
    <dialog class="gh-dialog" aria-labelledby="gh-dialog-title"><div id="gh-dialog-body"></div></dialog>
  </section>`;
  const house = outlet.querySelector('.gh-house');
  const dialog = house.querySelector('dialog');
  const body = house.querySelector('#gh-dialog-body');
  let request = 0;
  function drawBeds() {
    house.querySelector('.gh-dock .gh-start').href = draft?.value ? '#/round/meadow?resume=1' : due ? '#/round/meadow?review=1' : `#/round/meadow?band=${band.id}`;
    house.querySelector('#gh-band-title').textContent = band.plant;
    house.querySelector('#gh-band-note').textContent = { high: 'The everyday collection', medium: 'The discovery collection', low: 'The rare collection' }[band.id];
    for (const b of house.querySelectorAll('[data-band]')) b.setAttribute('aria-pressed', String(b.dataset.band === band.id));
    house.querySelector('#gh-beds').innerHTML = greenhouseBeds(fields, ledger, band.id).map((bed,i) => `<button class="gh-bed${!bed.total ? ' is-empty' : ''}" type="button" data-letter="${bed.letter}" ${!bed.total ? 'disabled' : ''} aria-label="${bed.letter}, ${bed.grown} of ${bed.total} words learned, ${Math.round(bed.ratio * 100)} percent grown${bed.yellow ? `, ${bed.yellow} need review` : ''}"><span class="gh-bed__letter">${bed.letter}</span>${bed.yellow ? `<span class="gh-bed__due">${bed.yellow} to review</span>` : ''}<span class="gh-bed__art">${bed.total ? plantArt(band.id, bed.ratio, Math.ceil(bed.yellow / (bed.total || 1) * 28), i) : '<span class="gh-empty-soil" aria-hidden="true">· · ·</span>'}</span><span class="gh-bed__count"><b>${bed.grown}</b> / ${bed.total} <span>words</span></span><span class="gh-bed__bar"><i style="width:${bed.ratio * 100}%"></i></span><span class="gh-bed__caption">${!bed.total ? 'Awaiting new seeds' : bed.grown ? `${Math.round(bed.ratio * 100)}% grown` : 'Ready to take root'}${bed.total ? '<span aria-hidden="true">↗</span>' : ''}</span></button>`).join('');
  }
  drawBeds();
  for (const b of house.querySelectorAll('[data-band]')) b.addEventListener('click', () => { band = BANDS.find((x) => x.id === b.dataset.band); play('page'); drawBeds(); }, { signal });
  house.querySelector('#gh-beds').addEventListener('click', (e) => {
    const b = e.target.closest('[data-letter]');
    if (b) openWords(fields.find((f) => f.group === band.id && f.name === b.dataset.letter));
  }, { signal });
  house.querySelector('#gh-words').addEventListener('click', () => openWords(null), { signal });
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }, { signal });
  dialog.addEventListener('close', () => { request++; }, { signal });
  signal.addEventListener('abort', () => { request++; dialog.close(); });

  async function openWords(field) {
    const token = ++request;
    body.innerHTML = `<div class="gh-dialog-head"><div><p class="gh-eyebrow">${field ? `${band.label} · bed ${field.name}` : 'Your word journal'}</p><h2 id="gh-dialog-title">${field ? 'A little patch of ' + field.name : 'Words taking root'}</h2></div><button class="gh-close" aria-label="Close word journal">×</button></div><div id="gh-word-list" aria-live="polite"><p>Opening your words…</p></div>`;
    body.querySelector('.gh-close').onclick = () => dialog.close();
    if (!dialog.open) dialog.showModal();
    let bundles;
    try {
      const ids = field ? [field.id] : fields.filter((f) => f.group === band.id).map((f) => f.id);
      bundles = await Promise.all(ids.map((id) => loadField('meadow', id)));
    } catch { if (token === request) body.querySelector('#gh-word-list').innerHTML = '<p>The words could not open. Close this page and try again.</p>'; return; }
    if (token !== request || signal.aborted) return;
    const stateOrder = { green: 0, yellow: 1, new: 2 };
    let entries = bundles.flatMap((b) => b.entries).sort((a,b) => (field ? 0 : stateOrder[leafState(ledger.get(a.id))] - stateOrder[leafState(ledger.get(b.id))]) || a.word.localeCompare(b.word));
    let filter = 'all', page = 0, meanings = false, search = '';
    body.querySelector('#gh-word-list').outerHTML = `${field ? `<div class="gh-bed-preview">${plantArt(band.id, greenhouseBeds(fields,ledger,band.id).find((b) => b.letter === field.name).ratio)}<p>${band.note}</p><a class="gh-start" href="#/round/meadow/${field.id}">Practise this bed <span>→</span></a></div>` : ''}<div class="gh-word-tools"><label class="sr-only" for="gh-search">Find a word</label><input id="gh-search" type="search" placeholder="Find a word" autocomplete="off"><label><input id="gh-meanings" type="checkbox"> Show all meanings</label><div class="gh-word-filters" role="group" aria-label="Filter words"><button data-filter="all" aria-pressed="true">All</button><button data-filter="green" aria-pressed="false">Learned</button><button data-filter="yellow" aria-pressed="false">To review</button><button data-filter="new" aria-pressed="false">Remaining</button></div></div><div id="gh-word-list" aria-live="polite"></div><div class="gh-pagination"><button id="gh-prev" aria-label="Previous ten words">←</button><span id="gh-page"></span><button id="gh-next" aria-label="Next ten words">→</button></div>`;
    function draw() {
      const list = entries.filter((e) => (filter === 'all' || leafState(ledger.get(e.id)) === filter) && e.word.toLowerCase().includes(search));
      const shown = list.slice(page * 10, page * 10 + 10);
      body.querySelector('#gh-word-list').innerHTML = shown.map((e) => {
        const state = leafState(ledger.get(e.id));
        return `<div class="gh-word-row is-${state}"><div><b>${esc(e.word)}</b><small><i class="gh-dot is-${state}"></i>${state === 'green' ? 'Learned' : state === 'yellow' ? 'To review' : 'Not learned yet'}</small></div><span>${state !== 'new' || meanings ? esc(e.meaning) : 'Meaning tucked away'}</span></div>`;
      }).join('') || `<p class="gh-word-empty">${!entries.length ? 'Your first words will live here after practice.' : 'No words here yet. Try another filter.'}</p>`;
      body.querySelector('#gh-page').textContent = `${list.length ? page * 10 + 1 : 0}–${Math.min(list.length, page * 10 + 10)} of ${list.length}`;
      body.querySelector('#gh-prev').disabled = !page;
      body.querySelector('#gh-next').disabled = (page + 1) * 10 >= list.length;
    }
    body.querySelector('#gh-search').oninput = (e) => { search = e.target.value.trim().toLowerCase(); page = 0; draw(); };
    body.querySelector('#gh-meanings').onchange = (e) => { meanings = e.target.checked; draw(); };
    for (const b of body.querySelectorAll('[data-filter]')) b.onclick = () => { filter = b.dataset.filter; page = 0; for (const btn of body.querySelectorAll('[data-filter]')) btn.setAttribute('aria-pressed', String(btn === b)); draw(); };
    body.querySelector('#gh-prev').onclick = () => { page--; draw(); };
    body.querySelector('#gh-next').onclick = () => { page++; draw(); };
    draw();
  }
}
