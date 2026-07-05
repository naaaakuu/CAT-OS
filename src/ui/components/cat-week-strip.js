/**
 * <cat-week-strip> — the last seven days as quiet bars.
 * Presentation only: set `.days` (from weekActivity()). A day with
 * sessions fills; today gets the accent ring. No numbers shouting —
 * the shape of the week is the message.
 */

class CatWeekStrip extends HTMLElement {
  #days = null;

  set days(d) { this.#days = d; this.#render(); }

  #render() {
    if (!this.#days) return;
    const max = Math.max(1, ...this.#days.map((d) => d.count));
    this.innerHTML = `
      <style>
        cat-week-strip { display: block; }
        cat-week-strip .strip {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: var(--space-2);
          align-items: end;
          height: 3.25rem;
        }
        cat-week-strip .day { display: flex; flex-direction: column; align-items: center; gap: var(--space-1); height: 100%; justify-content: flex-end; }
        cat-week-strip .bar {
          width: 100%;
          max-width: 1.4rem;
          border-radius: var(--radius-xs);
          background: var(--color-surface-3);
          min-height: 4px;
          transition: height var(--duration-slow) var(--ease-out);
        }
        cat-week-strip .day.has .bar { background: var(--color-accent); }
        cat-week-strip .day.today .bar { box-shadow: 0 0 0 2px var(--color-accent-subtle); }
        cat-week-strip .lbl { font-size: var(--text-2xs); color: var(--color-ink-3); }
        cat-week-strip .day.today .lbl { color: var(--color-ink); font-weight: var(--weight-bold); }
      </style>
      <div class="strip" role="img" aria-label="Practice this week: ${this.#days.filter((d) => d.count > 0).length} of 7 days">
        ${this.#days.map((d) => `
          <div class="day ${d.count > 0 ? 'has' : ''} ${d.isToday ? 'today' : ''}">
            <div class="bar" style="height:${d.count > 0 ? Math.max(30, (d.count / max) * 100) : 8}%"></div>
            <span class="lbl" aria-hidden="true">${d.label}</span>
          </div>`).join('')}
      </div>
    `;
  }
}

customElements.define('cat-week-strip', CatWeekStrip);
