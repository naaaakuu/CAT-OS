/**
 * <cat-timer> — a quiet elapsed-time display. Set `.startAt` (ms
 * epoch) and it ticks once a second. Presentation only: it measures
 * nothing that matters — the session engine keeps its own authoritative
 * timestamps. This exists so the user can glance at pace, calmly
 * (no red flashing, ever — blueprint: never make the user feel rushed).
 */

import { formatDuration } from '../../core/utils/format.js';

class CatTimer extends HTMLElement {
  #startAt = null;
  #interval = null;

  set startAt(ms) {
    this.#startAt = ms;
    this.#tick();
    clearInterval(this.#interval);
    this.#interval = setInterval(() => this.#tick(), 1000);
  }

  connectedCallback() {
    this.style.fontVariantNumeric = 'tabular-nums';
    if (this.#startAt) this.startAt = this.#startAt;
  }

  disconnectedCallback() { clearInterval(this.#interval); }

  #tick() {
    if (this.#startAt == null) return;
    this.textContent = formatDuration(Date.now() - this.#startAt);
  }
}

customElements.define('cat-timer', CatTimer);
