/**
 * <cat-briefing> — the pre-reading identity of a passage.
 *
 * Learning rationale: readers comprehend more when they know the
 * terrain before entering it (what kind of text, how long, what will
 * be asked of them). This card sets expectations in five seconds and
 * then gets out of the way. Presentation only: set `.item` (a v2+
 * content item).
 */

import { escapeHTML } from '../../core/utils/format.js';

const SKILL_LABELS = {
  'main-idea-extraction': 'Main-idea extraction',
  'inference': 'Inference',
  'tone-detection': 'Tone detection',
  'argument-tracking': 'Argument tracking',
  'trap-recognition': 'Trap recognition',
  'vocabulary-in-context': 'Vocabulary in context',
  'structure-mapping': 'Structure mapping',
  'evidence-anchoring': 'Evidence anchoring',
};

class CatBriefing extends HTMLElement {
  #item = null;

  set item(item) { this.#item = item; this.#render(); }

  #render() {
    if (!this.#item) return;
    const m = this.#item.meta;
    const skills = (m.skills ?? []).map((s) => SKILL_LABELS[s] ?? s);
    this.innerHTML = `
      <style>
        cat-briefing { display: block; margin-bottom: var(--space-6); }
        cat-briefing .frame {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-1);
          padding: var(--space-4) var(--space-5);
        }
        cat-briefing .eyebrow {
          font-size: var(--text-2xs);
          font-weight: var(--weight-bold);
          letter-spacing: var(--tracking-wide);
          text-transform: uppercase;
          color: var(--color-ink-3);
          margin: 0 0 var(--space-3);
        }
        cat-briefing .skills {
          font-size: var(--text-xs);
          color: var(--color-ink-2);
          margin: 0 0 var(--space-3);
        }
        cat-briefing .challenge {
          font-family: var(--font-reading);
          font-size: var(--text-sm);
          line-height: var(--leading-body);
          color: var(--color-ink);
          border-left: 2px solid var(--color-accent);
          padding-left: var(--space-3);
          margin: 0;
        }
      </style>
      <div class="frame">
        <p class="eyebrow">Before you read</p>
        <div class="briefing-chips">
          ${m.stage ? `<span class="badge">${escapeHTML(m.stage)}</span>` : ''}
          <span class="badge">${escapeHTML(m.genre)}</span>
          <span class="badge"><span class="dot dot--${escapeHTML(m.difficulty)}"></span>${escapeHTML(m.difficulty)}</span>
          <span class="badge">~${m.estimated_time_min} min</span>
          <span class="badge">${m.word_count} words</span>
        </div>
        ${skills.length ? `<p class="skills">You'll practice: ${escapeHTML(skills.join(' · '))}</p>` : ''}
        ${this.#item.mentor?.challenge
          ? `<p class="challenge">${escapeHTML(this.#item.mentor.challenge)}</p>` : ''}
      </div>
    `;
  }
}

customElements.define('cat-briefing', CatBriefing);
