/**
 * craft-ui.js — the one place that turns a bag of coins and goods into
 * markup, so Pages, Blooms, Roots, Thread and Coins look identical
 * everywhere: on the HUD, on a result, on an order, on a cost.
 *
 * Pure string building; no DOM, no storage.
 */

import { bagEntries, thing, madeFrom } from './economy.js';
import { openModal, closeModal } from '../ui/modal.js';
import { artIMG } from '../village/art.js';
import { GOODS, COINS, BUILDINGS } from '../village/defs.js';

/** The icon for a bag key (coins or a good). */
export function goodIcon(key, { size = 16, className = '' } = {}) {
  const t = thing(key);
  return artIMG('icon', { glyph: t?.glyph ?? 'star', size: 20 }, { size, className });
}
/** Kept for older call sites. */
export const craftIcon = goodIcon;

/** One chip: the icon and a number. */
export function chip(key, amount, { sign = '', className = '', name = false } = {}) {
  const t = thing(key);
  if (!t) return '';
  return `<span class="craft craft--${key} ${className}" data-craft="${key}" title="${t.name}">${goodIcon(key, { size: 16 })}<b>${sign}${amount}</b>${name ? `<span class="craft__name">${amount === 1 && key !== 'coins' ? t.one : t.name}</span>` : ''}</span>`;
}

/** Every non-zero entry in a bag, as chips. */
export function chips(bagObj, opts = {}) {
  return bagEntries(bagObj).map((c) => chip(c.key, c.amount, opts)).join('');
}

/** A cost, with what you cannot yet afford marked short. */
export function costChips(cost, purse) {
  return bagEntries(cost).map((c) => {
    const have = purse?.[c.key] ?? 0;
    const short = have < c.amount;
    return `<span class="craft craft--${c.key} ${short ? 'is-short' : 'is-met'}" data-craft="${c.key}" title="${c.name}">${goodIcon(c.key, { size: 16 })}<b>${short ? `${have}/${c.amount}` : c.amount}</b></span>`;
  }).join('');
}

/** A plain-text summary for aria labels and notices. */
export function bagText(bagObj) {
  const e = bagEntries(bagObj);
  if (!e.length) return '';
  return e.map((c) => `${c.amount} ${c.amount === 1 && c.key !== 'coins' ? c.one : c.name}`).join(', ');
}

/** The coin pill for the HUD. */
export function coinsHTML(n) {
  return `<span class="craft craft--coins" data-craft="coins">${goodIcon('coins', { size: 18 })}<b>${n}</b></span>`;
}

const BUILDINGS_CHAR = { reading: 'Ada', garden: 'Bo', roots: 'Ines', loom: 'Nell' };

/** Every made good the village can trade, in fixed order, for the barn. */
export function purseHTML(purse, { showZero = true } = {}) {
  return GOODS.filter((g) => g.kind === 'made').filter((g) => showZero || (purse?.[g.key] ?? 0) > 0)
    .map((g) => { const n = purse?.[g.key] ?? 0; return `<span class="craft craft--${g.key} ${n ? '' : 'is-zero'}" data-craft="${g.key}">${goodIcon(g.key, { size: 16 })}<b>${n}</b></span>`; }).join('');
}

/* ------------------------------------------------------------------ */
/* What a good IS                                                      */
/* ------------------------------------------------------------------ */

/**
 * Tapping any good — on the HUD, an order, a cost — opens this: what it
 * is, who makes it, and what the learner does to make more.
 */
export function openCraftSheet(key, state) {
  const t = thing(key);
  if (!t) return;
  document.querySelector('.craftsheet')?.remove();
  const v = state?.village;
  const have = v?.stock?.[key] ?? state?.purse?.[key] ?? 0;
  const maker = BUILDINGS.find((b) => b.good === key || b.raw === key);
  const raw = maker?.raw ? thing(maker.raw) : null;
  const made = maker?.good ? thing(maker.good) : null;
  const wanted = (v?.orders ?? []).filter((o) => (o.needs?.[key] ?? 0) > 0);
  const el = document.createElement('div');
  el.className = 'craftsheet';
  el.innerHTML = `
    <div class="craftsheet__scrim" data-close></div>
    <section class="craftsheet__card craft-of--${key}" role="dialog" aria-label="${t.name}">
      <button class="craftsheet__close" data-close aria-label="Close">×</button>
      <header class="craftsheet__head">
        <span class="craftsheet__gem">${goodIcon(key, { size: 44 })}</span>
        <div>
          <h2 class="craftsheet__name">${t.name}</h2>
          <p class="craftsheet__is">${key === 'coins' ? 'Coins build, raise and open land. Orders pay them.' : t.line}</p>
        </div>
        <span class="craftsheet__have"><b>${have}</b><small>you have</small></span>
      </header>
      ${maker ? `
        <p class="craftsheet__label">Made at</p>
        <ul class="craftsheet__where">
          <li><a href="${maker.activity.route}">${artIMG('building', { id: maker.art, level: 1 }, { size: 40 })}<span class="craftsheet__wh"><b>${maker.name}</b><span>${t.kind === 'raw' ? `${maker.activity.label} → one ${t.one} per star, one more if flawless. ${BUILDINGS_CHAR[maker.id] ?? 'The worker'} turns them into ${made?.name ?? ''}.` : `${BUILDINGS_CHAR[maker.id] ?? 'The worker'} makes one ${t.one} from every ${raw?.one ?? 'unit'}. ${raw?.name ?? ''} come from: ${maker.activity.label.toLowerCase()}.`}</span></span><i aria-hidden="true">→</i></a></li>
        </ul>` : `
        <p class="craftsheet__label">Earned by</p>
        <ul class="craftsheet__where">
          <li><span>${artIMG('icon', { glyph: 'board', size: 20 }, { size: 28 })}<span class="craftsheet__wh"><b>Delivering orders</b><span>Every order on the board pays coins</span></span></span></li>
          <li><span>${artIMG('icon', { glyph: 'road', size: 20 }, { size: 28 })}<span class="craftsheet__wh"><b>The Gauntlet</b><span>The road out pays in coins</span></span></span></li>
        </ul>`}
      ${wanted.length ? `
        <p class="craftsheet__label">Wanted right now</p>
        <div class="craftsheet__pays">
          ${wanted.slice(0, 3).map((o) => `<span class="paycard"><b>${o.giver.name}</b><span>${o.needs[key]} ${o.needs[key] === 1 ? t.one : t.name} · ${o.pay} coins</span></span>`).join('')}
        </div>` : ''}
    </section>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('is-in'));
  const close = () => { closeModal(el); el.classList.remove('is-in'); setTimeout(() => el.remove(), 240); };
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { close(); return; }
    if (e.target.closest('a')) close();
  });
  openModal(el, close, { label: 'How this is made' });
  const drop = () => { closeModal(el); el.remove(); window.removeEventListener('hashchange', drop); };
  window.addEventListener('hashchange', drop);
}

/** Make every chip inside a root open its sheet. Delegated. */
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

export { COINS, GOODS };
