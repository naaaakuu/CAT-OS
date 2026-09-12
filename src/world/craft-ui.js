/**
 * craft-ui.js — the one place that turns a bag of crafts into markup, so
 * Amber, Ink, Thread and Ember look identical everywhere in the valley:
 * on the HUD, on a result, in the Workshop, on a work's cost.
 *
 * Pure string building; no DOM, no storage.
 */

import { CRAFTS, bagEntries, craft } from './economy.js';
import { craftIcon } from './icons.js';

/** One craft chip: the pigment dot and a number. */
export function chip(key, amount, { sign = '', className = '' } = {}) {
  const c = craft(key);
  if (!c) return '';
  return `<span class="craft craft--${key} ${className}" data-craft="${key}" title="${c.name}">${craftIcon(key, { size: 15 })}<b>${sign}${amount}</b><span class="craft__name">${c.name}</span></span>`;
}

/** Every non-zero craft in a bag, as chips. */
export function chips(bag, opts = {}) {
  return bagEntries(bag).map((c) => chip(c.key, c.amount, opts)).join('');
}

/** A cost, with the crafts you cannot yet afford marked short. */
export function costChips(cost, purse) {
  return bagEntries(cost).map((c) => {
    const have = purse?.[c.key] ?? 0;
    const short = have < c.amount;
    return `<span class="craft craft--${c.key} ${short ? 'is-short' : 'is-met'}" data-craft="${c.key}" title="${c.name}">${craftIcon(c.key, { size: 15 })}<b>${short ? `${have}/${c.amount}` : c.amount}</b><span class="craft__name">${c.name}</span></span>`;
  }).join('');
}

/** A plain-text summary for aria labels and notices. */
export function bagText(bag) {
  const e = bagEntries(bag);
  if (!e.length) return '';
  return e.map((c) => `${c.amount} ${c.name}`).join(', ');
}

/** The four crafts in fixed order, for the HUD. Zeroes are dimmed, never hidden,
 *  so the learner sees the shape of the economy from the first day. */
export function purseHTML(purse, { showZero = true } = {}) {
  return CRAFTS.filter((c) => showZero || (purse?.[c.key] ?? 0) > 0)
    .map((c) => {
      const n = purse?.[c.key] ?? 0;
      return `<span class="craft craft--${c.key} ${n ? '' : 'is-zero'}" data-craft="${c.key}">${craftIcon(c.key, { size: 16 })}<b>${n}</b></span>`;
    }).join('');
}

/* ------------------------------------------------------------------ */
/* What a craft IS                                                     */
/* ------------------------------------------------------------------ */

/**
 * A craft is not money. It is a capability you have proved, and the
 * learner should never have to guess which one. Tapping any craft — in
 * the purse, on a cost, on a result — opens this: what it stands for,
 * what earns it, and the next thing in the valley it will pay for.
 *
 * Mounted once per screen; `openCraftSheet(key, state)` does the rest.
 */

/** Where each craft is made, as places the learner can actually go. */
const EARNED_AT = {
  amber: [
    { name: 'The Meadow', href: '#/world/place/meadow', what: 'CAT word lists — meanings, synonyms, opposites' },
    { name: 'The Rootwood', href: '#/world/place/rootwood', what: 'Latin and Greek roots, one family at a time' },
    { name: 'The Mirror Pond', href: '#/world/place/pond', what: 'Words that look alike and are not' },
    { name: 'The Vine Terraces', href: '#/world/place/terraces', what: 'Prefixes and suffixes' },
    { name: 'The Thicket', href: '#/world/place/thicket', what: 'Words English borrowed' },
  ],
  ink: [
    { name: 'The Reading Room', href: '#/world/place/reading-room', what: 'CAT passages against the clock' },
  ],
  thread: [
    { name: 'The Loom', href: '#/world/place/loom', what: 'Para jumbles — the order the author wrote' },
    { name: 'The Summary Table', href: '#/world/place/table', what: 'Para summary — the point, protected' },
    { name: 'The Stranger’s Bench', href: '#/world/place/bench', what: 'Odd one out — the sentence that never belonged' },
  ],
  ember: [
    { name: 'Anywhere', href: '#/world', what: 'Any three-star run: right, and inside the pace' },
    { name: 'The Wilds', href: '#/world/place/wilds', what: 'The weekly Gauntlet — mixed and timed' },
  ],
};

/** What this craft trains, said as a CAT ability rather than a resource. */
const IS = {
  amber: 'your word knowledge',
  ink: 'your reading',
  thread: 'your grip on how an argument is built',
  ember: 'your accuracy at CAT pace',
};

/**
 * Open the sheet for one craft.
 * @param {string} key amber | ink | thread | ember
 * @param {object} state the derived world state (for the purse and the
 *        next work this craft is needed for); optional
 */
export function openCraftSheet(key, state) {
  const c = craft(key);
  if (!c) return;
  document.querySelector('.craftsheet')?.remove();
  const have = state?.purse?.[key] ?? 0;
  // The nearest work this craft is actually needed for — the honest answer
  // to "what is this for?", not a catalogue.
  const next = (state?.works ?? [])
    .filter((w) => !w.built && (w.cost?.[key] ?? 0) > 0)
    .sort((a, b) => (a.stage - b.stage) || ((a.cost[key] ?? 0) - (b.cost[key] ?? 0)))[0] ?? null;

  const el = document.createElement('div');
  el.className = 'craftsheet';
  el.innerHTML = `
    <div class="craftsheet__scrim" data-close></div>
    <section class="craftsheet__card craft-of--${key}" role="dialog" aria-label="${c.name}">
      <button class="craftsheet__close" data-close aria-label="Close">×</button>
      <header class="craftsheet__head">
        <span class="craftsheet__gem craft--${key}" aria-hidden="true"><i></i></span>
        <div>
          <h2 class="craftsheet__name">${c.name}</h2>
          <p class="craftsheet__is">${c.name} is ${IS[key]}.</p>
        </div>
        <span class="craftsheet__have"><b>${have}</b><small>you have</small></span>
      </header>
      <p class="craftsheet__line">${c.line}</p>
      <p class="craftsheet__label">Earn it by</p>
      <ul class="craftsheet__where">
        ${(EARNED_AT[key] ?? []).map((p) => `<li><a href="${p.href}"><b>${p.name}</b><span>${p.what}</span><i aria-hidden="true">→</i></a></li>`).join('')}
      </ul>
      ${next ? `
        <p class="craftsheet__label">It pays for</p>
        <a class="craftsheet__work" href="#/world/place/hearth?works=1">
          <b>${next.name}</b>
          <span>${next.cost[key]} ${c.name}${Object.keys(next.cost).filter((k) => k !== key && next.cost[k] > 0).length ? ', and more' : ''}</span>
          <i aria-hidden="true">→</i>
        </a>` : ''}
    </section>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  const close = () => { el.classList.remove('is-in'); setTimeout(() => el.remove(), 240); };
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { close(); return; }
    if (e.target.closest('a')) close();
  });
  const onKey = (e) => { if (e.key === 'Escape') { close(); window.removeEventListener('keydown', onKey); } };
  window.addEventListener('keydown', onKey);
}

/**
 * Make every craft chip inside a root open its sheet. Delegated, so it
 * keeps working when the purse re-renders.
 */
export function wireCraftTaps(root, getState) {
  if (!root || root.dataset.craftWired) return;
  root.dataset.craftWired = '1';
  root.addEventListener('click', (e) => {
    const chipEl = e.target.closest('.craft[data-craft]');
    if (!chipEl) return;
    e.preventDefault();
    e.stopPropagation();
    openCraftSheet(chipEl.dataset.craft, typeof getState === 'function' ? getState() : getState);
  }, true);
}
