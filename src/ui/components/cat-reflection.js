/**
 * <cat-reflection> — the reading reflection card (0.6.0).
 *
 * Learning rationale: a passage becomes yours when you say one true
 * thing about it in your own words (elaborative encoding). So after
 * the Learning Page, the reader is offered — never required — a
 * sentence starter and a quiet place to finish it.
 *
 * Presentation only (Rule 7): set `.reflection` (a saved record or
 * null); listen for `cat-reflection-save` with `{ prompt, text }`.
 * The screen owns persistence through the StorageAdapter.
 */

import { escapeHTML, formatDate } from '../../core/utils/format.js';

export const REFLECTION_PROMPTS = Object.freeze([
  'I never realised…',
  'My biggest takeaway…',
  'What surprised me…',
]);

class CatReflection extends HTMLElement {
  #reflection = null;
  #editing = false;
  #prompt = REFLECTION_PROMPTS[0];

  set reflection(r) {
    this.#reflection = r ?? null;
    this.#editing = false;
    if (r?.prompt && REFLECTION_PROMPTS.includes(r.prompt)) this.#prompt = r.prompt;
    this.#render();
  }

  #render() {
    const saved = this.#reflection;
    const showForm = this.#editing || !saved;
    this.innerHTML = `
      <style>
        cat-reflection { display: block; margin-bottom: var(--space-4); }
        cat-reflection .sheet {
          background: var(--color-surface);
          border: 1px solid var(--color-line);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-1);
          padding: var(--space-5);
        }
        cat-reflection h2 {
          font-family: var(--font-reading);
          font-size: var(--text-lg);
          letter-spacing: var(--tracking-tight);
          margin-bottom: var(--space-1);
        }
        cat-reflection .why {
          font-size: var(--text-xs);
          color: var(--color-ink-3);
          margin: 0 0 var(--space-4);
        }
        cat-reflection .prompts {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }
        cat-reflection .prompt {
          min-height: calc(var(--tap-target) - 8px);
          padding: var(--space-1) var(--space-3);
          border: 1px solid var(--color-line-strong);
          border-radius: var(--radius-full);
          background: var(--color-surface);
          font-size: var(--text-xs);
          font-weight: var(--weight-semibold);
          color: var(--color-ink-2);
          transition: background-color var(--duration-fast) var(--ease-out),
                      color var(--duration-fast) var(--ease-out),
                      border-color var(--duration-fast) var(--ease-out);
        }
        cat-reflection .prompt[aria-pressed="true"] {
          background: var(--color-accent);
          border-color: var(--color-accent);
          color: var(--color-accent-ink);
        }
        cat-reflection textarea {
          width: 100%;
          min-height: 4.5rem;
          resize: none;
          padding: var(--space-3) var(--space-4);
          border: 1px solid var(--color-line-strong);
          border-radius: var(--radius-md);
          background: var(--color-bg);
          font-family: var(--font-reading);
          font-size: var(--text-base);
          line-height: var(--leading-body);
        }
        cat-reflection textarea:focus-visible { box-shadow: var(--focus-ring); }
        cat-reflection .actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-3);
          margin-top: var(--space-3);
        }
        cat-reflection .optional {
          font-size: var(--text-2xs);
          color: var(--color-ink-3);
        }
        /* Saved state: the reader's own line, kept like a book margin note. */
        cat-reflection .kept {
          font-family: var(--font-reading);
          font-size: var(--text-base);
          line-height: var(--leading-body);
          border-left: 2px solid var(--color-accent);
          padding-left: var(--space-4);
          margin: 0 0 var(--space-3);
        }
        cat-reflection .kept .starter { color: var(--color-ink-3); font-style: italic; }
        cat-reflection .kept-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--text-2xs);
          color: var(--color-ink-3);
        }
        cat-reflection .edit-btn {
          min-height: 0;
          padding: var(--space-1) var(--space-2);
          font-size: var(--text-2xs);
          font-weight: var(--weight-semibold);
          color: var(--color-accent);
        }
      </style>
      <div class="sheet">
        <h2>A line for your notebook</h2>
        ${showForm ? `
          <p class="why">Optional — one honest sentence makes the passage yours.
          It stays on this device.</p>
          <div class="prompts" role="group" aria-label="Sentence starters">
            ${REFLECTION_PROMPTS.map((p) => `
              <button type="button" class="prompt" data-prompt="${escapeHTML(p)}"
                      aria-pressed="${String(p === this.#prompt)}">${escapeHTML(p)}</button>`).join('')}
          </div>
          <textarea rows="3" aria-label="Your reflection"
            placeholder="${escapeHTML(this.#prompt)} (finish the sentence)">${escapeHTML(saved?.text ?? '')}</textarea>
          <div class="actions">
            <span class="optional">No pressure. Skipping is fine.</span>
            <button type="button" class="btn btn--primary" id="keep" ${saved?.text ? '' : 'disabled'}>Keep it</button>
          </div>
        ` : `
          <p class="kept"><span class="starter">${escapeHTML(saved.prompt)}</span> ${escapeHTML(saved.text)}</p>
          <div class="kept-meta">
            <span>Written ${escapeHTML(formatDate(saved.updated_at))}</span>
            <button type="button" class="edit-btn" id="edit">Rewrite</button>
          </div>
        `}
      </div>
    `;

    if (showForm) {
      const textarea = this.querySelector('textarea');
      const keep = this.querySelector('#keep');

      // Auto-grow with the writing; no inner scrollbars on a phone.
      const grow = () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      };
      textarea.addEventListener('input', () => {
        keep.disabled = textarea.value.trim().length === 0;
        grow();
      });
      grow();

      this.querySelectorAll('.prompt').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.#prompt = btn.dataset.prompt;
          this.querySelectorAll('.prompt').forEach((b) =>
            b.setAttribute('aria-pressed', String(b === btn)));
          textarea.placeholder = `${this.#prompt} (finish the sentence)`;
          textarea.focus();
        });
      });

      keep.addEventListener('click', () => {
        const text = textarea.value.trim();
        if (!text) return;
        this.dispatchEvent(new CustomEvent('cat-reflection-save', {
          bubbles: true,
          detail: { prompt: this.#prompt, text },
        }));
      });
    } else {
      this.querySelector('#edit').addEventListener('click', () => {
        this.#editing = true;
        this.#render();
      });
    }
  }
}

customElements.define('cat-reflection', CatReflection);
