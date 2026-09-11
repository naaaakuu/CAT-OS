/**
 * craft-ui.js — the one place that turns a bag of crafts into markup, so
 * Amber, Ink, Thread and Ember look identical everywhere in the valley:
 * on the HUD, on a result, in the Workshop, on a work's cost.
 *
 * Pure string building; no DOM, no storage.
 */

import { CRAFTS, bagEntries, craft } from './economy.js';

/** One craft chip: the pigment dot and a number. */
export function chip(key, amount, { sign = '', className = '' } = {}) {
  const c = craft(key);
  if (!c) return '';
  return `<span class="craft craft--${key} ${className}" title="${c.name}"><i aria-hidden="true"></i><b>${sign}${amount}</b><span class="craft__name">${c.name}</span></span>`;
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
    return `<span class="craft craft--${c.key} ${short ? 'is-short' : 'is-met'}" title="${c.name}"><i aria-hidden="true"></i><b>${short ? `${have}/${c.amount}` : c.amount}</b><span class="craft__name">${c.name}</span></span>`;
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
      return `<span class="craft craft--${c.key} ${n ? '' : 'is-zero'}" data-craft="${c.key}"><i aria-hidden="true"></i><b>${n}</b></span>`;
    }).join('');
}
