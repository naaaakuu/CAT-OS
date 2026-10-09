/**
 * pro.js — CAT OS Pro (#/pro): no videos, every explanation open, plays
 * offline. Sold through Google Play Billing by the Android shell
 * (android/, core/native.js); prices come from Play, never from here, so
 * the screen always shows what Play will charge, in the learner's currency.
 *
 *   catos_pro_yearly    subscription, base plan "yearly", renews each year
 *   catos_pro_lifetime  one-time, Pro for good
 */

import { NATIVE, ask, isPro, openExternal, PLAY_URL, PRIVACY_URL } from '../core/native.js';
import { petSprite, backdropStyle } from '../pets/sprite.js';
import { escapeHTML } from '../core/utils/format.js';
import { toast } from '../ui/components/cat-toast.js';
import { cue } from '../core/engagement/feedback.js';

export const YEARLY = 'catos_pro_yearly';
export const LIFETIME = 'catos_pro_lifetime';
const PACKAGE = 'com.nakulcreations.catos';

const PERKS = [
  ['Every explanation, open', 'Why your pick tempted you, why the answer holds, every option taken apart. No videos, ever.'],
  ['Study offline', 'On a train, in a hostel with no Wi-Fi, in the library basement. The village comes with you.'],
  ['Keep the village growing', 'CAT OS is made by one person. Pro pays for new passages, new rooms and new friends.'],
];

/** "about ₹42 a month" from Play's yearly price, so the plan reads in the size people think in. */
function perMonth(p) {
  if (!p?.micros || !p.currency) return '';
  try {
    const m = new Intl.NumberFormat('en-IN', { style: 'currency', currency: p.currency, maximumFractionDigits: 0 }).format(p.micros / 1e6 / 12);
    return `about ${m} a month`;
  } catch { return ''; }
}

export async function renderPro(outlet) {
  const pro = isPro();
  const plan = pro ? String(NATIVE?.proPlan?.() ?? '') : '';
  outlet.innerHTML = `
    <section class="screen screen--cottage pro">
      <div class="cottage__hero" style="${backdropStyle('cottage')}" aria-hidden="true"></div>
      <div class="session-bar"><a href="#/settings">← Settings</a></div>
      <p class="screen__eyebrow">CAT OS Pro</p>
      <h1>${pro ? 'You are Pro. Thank you.' : 'Are videos interrupting your study session?'}</h1>
      <p class="cottage__line">${pro
        ? 'Every explanation is open, there are no videos, and the village plays offline.'
        : 'Chai hates being interrupted halfway through a passage. So does Toffee. So do you.'}</p>
      <div class="pro__friends" aria-hidden="true">
        ${['chai', 'toffee', 'matcha', 'mochi'].map((id, i) => petSprite(id, { frame: pro ? 2 : (i % 2 ? 2 : 1), size: 72 })).join('')}
      </div>

      <div class="card">
        <h2>${pro ? 'What you have' : 'What Pro gives you'}</h2>
        <ul class="pro__perks">
          ${PERKS.map(([b, t]) => `<li><b>${escapeHTML(b)}.</b> ${escapeHTML(t)}</li>`).join('')}
        </ul>
      </div>

      ${!NATIVE ? `
        <div class="card">
          <p>Pro lives in the Android app.</p>
          <a class="btn btn--primary" href="${PLAY_URL}" target="_blank" rel="noopener">Get CAT OS on Google Play</a>
        </div>` : pro ? `
        <div class="card">
          <p>${plan === 'lifetime' ? 'Lifetime: Pro for good, no renewals.' : 'One year, renewing each year until you cancel.'}</p>
          ${plan === 'lifetime' ? '' : '<button class="btn" id="pro-manage" type="button">Manage in Google Play</button>'}
        </div>` : `
        <div class="pro__plans" role="group" aria-label="Choose a plan">
          <button class="pro__plan is-best" type="button" data-buy="${YEARLY}">
            <span class="pro__tag">Best for this CAT season</span>
            <span class="pro__name">One year</span>
            <span class="pro__price" data-price="${YEARLY}">Loading price…</span>
            <span class="pro__per" data-per="${YEARLY}">Renews every year until you cancel</span>
          </button>
          <button class="pro__plan" type="button" data-buy="${LIFETIME}">
            <span class="pro__tag">For repeat takers</span>
            <span class="pro__name">Lifetime</span>
            <span class="pro__price" data-price="${LIFETIME}">Loading price…</span>
            <span class="pro__per">Pay once. Pro for good.</span>
          </button>
        </div>
        <p class="pro__said" role="status" aria-live="polite"></p>`}

      ${NATIVE ? `<p><button class="btn btn--quiet" id="pro-restore" type="button">Restore a purchase</button></p>` : ''}
      <p class="pro__fine">The yearly plan renews automatically at the same price each year until you cancel it in Google Play under Payments and subscriptions. Lifetime is a single payment. Payment is handled by Google Play. <a href="${PRIVACY_URL}" data-external>Privacy policy</a></p>
    </section>`;

  outlet.querySelector('[data-external]')?.addEventListener('click', (e) => { e.preventDefault(); openExternal(PRIVACY_URL); });
  outlet.querySelector('#pro-manage')?.addEventListener('click', () => openExternal(`https://play.google.com/store/account/subscriptions?sku=${YEARLY}&package=${PACKAGE}`));
  outlet.querySelector('#pro-restore')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const r = await ask('restore');
    btn.disabled = false;
    if (r?.pro) { cue('restore'); toast('Pro restored. Welcome back.', 'info', { mute: true }); renderPro(outlet); }
    else toast('No Pro purchase found on this Google account.', 'info', { mute: true });
  });
  if (!NATIVE || pro) return;

  const said = outlet.querySelector('.pro__said');
  const r = await ask('products');
  if (!outlet.isConnected) return;
  const byId = new Map((r?.products ?? []).map((p) => [p.id, p]));
  for (const el of outlet.querySelectorAll('[data-price]')) {
    const p = byId.get(el.dataset.price);
    el.textContent = p ? `${p.price}${p.id === YEARLY ? ' a year' : ''}` : 'Not available yet';
    if (!p) el.closest('[data-buy]').disabled = true;
  }
  const per = outlet.querySelector(`[data-per="${YEARLY}"]`);
  const yearly = byId.get(YEARLY);
  if (per && yearly && perMonth(yearly)) per.textContent = `That is ${perMonth(yearly)}. Renews every year until you cancel.`;
  if (!byId.size) said.textContent = 'Google Play did not answer just now. Check the connection and open this page again.';

  outlet.querySelector('.pro__plans')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-buy]');
    if (!btn || btn.disabled) return;
    for (const b of outlet.querySelectorAll('[data-buy]')) b.disabled = true;
    said.textContent = 'Opening Google Play…';
    const res = await ask('buy', btn.dataset.buy);
    if (!outlet.isConnected) return;
    if (res?.pro) { cue('restore'); toast('Welcome to Pro. No more videos.', 'info', { mute: true }); renderPro(outlet); return; }
    for (const b of outlet.querySelectorAll('[data-buy]')) b.disabled = !byId.has(b.dataset.buy);
    said.textContent = res?.reason === 'pending'
      ? 'Your payment is pending. Pro switches on by itself once Google Play confirms it.'
      : res?.reason === 'cancelled' ? '' : 'That did not go through. Nothing was charged. Try again any time.';
  });
}
