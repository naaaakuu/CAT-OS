/**
 * modal.js — the dialog contract, in one place.
 *
 * The village learned this the hard way: three surfaces announced themselves
 * as role="dialog" and honoured none of what that promises — no accessible
 * name, so a screen reader said "dialog" and stopped; focus left behind on
 * whatever opened them; Tab walking straight out into the world underneath
 * while the scrim kept the pointer in; and no Escape. It was answered there,
 * and then the global app menu — reachable from the header of every world
 * route — went on doing all four.
 *
 * So it lives here now, and every sheet in the app uses the same one.
 */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, summary, [tabindex]:not([tabindex="-1"])';
let seq = 0;
/* A stack, not a single slot: a sheet can open a sheet, and the second one
   closing must hand focus back to the first, not to whatever came before
   both of them. */
const returnTo = [];

/**
 * Make `card` behave like a dialog: named, focused, Tab-trapped, Escape-able.
 * @param {HTMLElement} card the dialog surface itself (not the scrim)
 * @param {() => void} close called on Escape; also call it yourself on a tap
 * @param {{label?: string, returnTo?: HTMLElement}} [opts] a name, when the
 *        card has no heading to use, and where to put focus back — a tap
 *        does not focus a button on iOS, so "whatever had focus" is often
 *        <body>, and closing would drop the learner at the top of the page.
 */
export function openModal(card, close, opts = {}) {
  if (!card) return;
  const prior = document.activeElement;
  returnTo.push(opts.returnTo ?? (prior && prior !== document.body ? prior : null));
  card.setAttribute('role', card.getAttribute('role') ?? 'dialog');
  card.setAttribute('aria-modal', 'true');
  const name = card.querySelector('.vpop__name, .vsheet__name, .vsign__label, .gmenu__name, h1, h2, h3');
  if (name) {
    if (!name.id) name.id = `modal-name-${++seq}`;
    card.setAttribute('aria-labelledby', name.id);
  } else {
    card.setAttribute('aria-label', opts.label ?? 'Dialog');
  }
  card.setAttribute('tabindex', '-1');
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...card.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!f.length) { e.preventDefault(); card.focus({ preventScroll: true }); return; }
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey, true);
  card.__keys = onKey;
  // Only if it is still open: an Escape inside that frame has already handed
  // focus back, and taking it again would strand it on a card about to hide.
  requestAnimationFrame(() => { if (card.__keys !== onKey) return; try { card.focus({ preventScroll: true }); } catch { /* fine */ } });
}

/** Take the listener back off and put focus where it was. Always pair it. */
export function closeModal(card) {
  if (card?.__keys) { document.removeEventListener('keydown', card.__keys, true); card.__keys = null; }
  const back = returnTo.pop();
  if (back && back.isConnected) { try { back.focus({ preventScroll: true }); } catch { /* fine */ } }
}
