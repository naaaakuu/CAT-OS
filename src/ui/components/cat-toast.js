/**
 * <cat-toast> — a quiet, transient message near the bottom of the
 * screen. The app's single surface for errors and confirmations.
 *
 * Voice rules (PRODUCT_BLUEPRINT): errors say what happened and what
 * to do next; they never apologize and are never vague. Confirmations
 * use the same verb as the action ("Backup saved", not "Success!").
 *
 * Usage: import { toast } from '.../cat-toast.js';
 *        toast('Backup saved');
 *        toast('Could not save. Check free space and try again.', 'error');
 */

class CatToast extends HTMLElement {
  #timer = null;

  connectedCallback() {
    this.innerHTML = `
      <style>
        cat-toast {
          position: fixed;
          left: 50%;
          bottom: calc(var(--nav-height) + env(safe-area-inset-bottom) + var(--space-4));
          transform: translateX(-50%) translateY(10px) scale(0.98);
          max-width: min(92vw, 26rem);
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          background: var(--color-ink);
          color: var(--color-bg);
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
          box-shadow: var(--shadow-2);
          opacity: 0;
          pointer-events: none;
          transition: opacity var(--duration) var(--ease-out),
                      transform var(--duration) var(--ease-out);
          z-index: 20;
        }
        cat-toast.is-open { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        cat-toast.is-error { background: var(--color-danger); color: var(--color-danger-ink); }
      </style>
      <span role="status"></span>
    `;
  }

  /** @param {'info'|'error'} kind */
  show(message, kind = 'info') {
    clearTimeout(this.#timer);
    this.querySelector('span').textContent = message;
    this.classList.toggle('is-error', kind === 'error');
    this.classList.add('is-open');
    this.#timer = setTimeout(() => this.classList.remove('is-open'),
      kind === 'error' ? 6000 : 3000);
  }
}

customElements.define('cat-toast', CatToast);

/** Convenience: lazily create one shared toast and show a message. */
export function toast(message, kind = 'info') {
  let el = document.querySelector('cat-toast');
  if (!el) {
    el = document.createElement('cat-toast');
    document.body.appendChild(el);
  }
  // connectedCallback runs synchronously for upgraded elements, but be safe:
  queueMicrotask(() => el.show(message, kind));
}
