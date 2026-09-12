/**
 * menu.js — the one menu in the game.
 *
 * CAT OS has three places you go: the valley, the Hearth, and Growth.
 * Everything else — settings, sound, your collections, your records, the
 * backup file — is administration, and administration does not get a
 * fourth of the thumb rail. It lives behind one ☰ in the corner, opens
 * as a sheet over the world, and closes the moment you pick something.
 *
 * The sheet is painted, not glassy: it belongs to the valley, not to a
 * settings app. It is built here once and mounted by whichever screen
 * carries the world's chrome.
 */

import { play } from './audio.js';
import { escapeHTML } from '../core/utils/format.js';
import { loadValley, valleyName } from './companion.js';
import { icon } from './icons.js';

const ICON = {
  menu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
  close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
};

/* Pixel marks, drawn by the same hand as the valley (world/icons.js).
   A typographic dingbat in a hand-painted world is a web page showing
   through. */
const GLYPH = {
  growth: 'sprout', journey: 'workshop', collections: 'book', records: 'star', settings: 'gear',
};

/** What the menu offers, in the order it offers it. Every row goes
 *  somewhere that exists and shows what the row said it would — a menu
 *  that lies about its destinations is worse than a shorter menu. */
const ITEMS = [
  { href: '#/growth', label: 'Growth', line: 'How you are getting stronger', glyph: 'growth' },
  { href: '#/world/place/hearth?works=1', label: 'The Workshop', line: 'What can be built next', glyph: 'journey' },
  { href: '#/world/place/hearth?you=1', label: 'Your standing', line: 'Stars, streaks, titles and the Gauntlet', glyph: 'records' },
  { href: '#/settings', label: 'Settings', line: 'Sound, text size, theme, your data', glyph: 'settings' },
];

/**
 * Mount the ☰ button into a container and wire its sheet.
 * @param {HTMLElement} host where the button goes
 * @param {{storage: object}} ctx
 */
export function mountMenu(host, ctx) {
  if (!host) return null;
  const btn = document.createElement('button');
  btn.className = 'hud__icon';
  btn.id = 'world-menu-btn';
  btn.setAttribute('aria-label', 'Menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = ICON.menu;
  host.appendChild(btn);

  let sheet = null;
  const close = () => {
    if (!sheet) return;
    sheet.classList.remove('is-in');
    btn.setAttribute('aria-expanded', 'false');
    const el = sheet; sheet = null;
    setTimeout(() => el.remove(), 260);
    play('close');
  };

  btn.addEventListener('click', async () => {
    if (sheet) { close(); return; }
    play('open');
    btn.setAttribute('aria-expanded', 'true');
    const valley = await loadValley(ctx.storage).catch(() => ({ name: null }));
    sheet = document.createElement('div');
    sheet.className = 'gmenu';
    sheet.innerHTML = `
      <div class="gmenu__scrim" data-close></div>
      <nav class="gmenu__card" aria-label="Menu">
        <div class="gmenu__head">
          <div>
            <p class="gmenu__eyebrow">Your valley</p>
            <h2 class="gmenu__name">${escapeHTML(valleyName(valley))}</h2>
          </div>
          <button class="gmenu__close" data-close aria-label="Close">${ICON.close}</button>
        </div>
        <ul class="gmenu__list">
          ${ITEMS.map((i) => `
            <li><a class="gmenu__row" href="${i.href}">
              <span class="gmenu__glyph" aria-hidden="true">${icon(GLYPH[i.glyph] ?? 'star', { size: 24 })}</span>
              <span><b>${escapeHTML(i.label)}</b><small>${escapeHTML(i.line)}</small></span>
              <span class="gmenu__go" aria-hidden="true">→</span>
            </a></li>`).join('')}
        </ul>
      </nav>`;
    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add('is-in'));
    sheet.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { close(); return; }
      if (e.target.closest('a')) { play('tap'); close(); }
    });
    const onKey = (e) => { if (e.key === 'Escape') { close(); window.removeEventListener('keydown', onKey); } };
    window.addEventListener('keydown', onKey);
  });

  return { close };
}
