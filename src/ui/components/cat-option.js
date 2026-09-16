/**
 * <cat-option> — one selectable answer option.
 *
 * Presentation only: attributes in (`letter`, `text`, and a `state`),
 * a `cat-option-select` event out. It never knows which answer is
 * correct — the screen tells it what state to show.
 *
 * States: "" (idle) · "selected" · "correct" · "wrong" · "picked" · "dimmed"
 *
 * "picked" is a neutral (non-red) marker for "this is what you chose" when
 * the choice turned out wrong — used by rooms like the Language Garden
 * that never use "wrong" (its red is banned by design), but still must
 * never let a learner's own answer disappear into the same dimming as
 * every option they never touched.
 *
 * The shell is built ONCE and then mutated in place. It used to rewrite
 * innerHTML on every attribute change, which meant choosing an answer
 * destroyed the very button the learner was standing on: selecting option B
 * sets state="selected" on it and state="" on the others, each of those
 * re-rendered, and the focused element was removed from the document. Focus
 * fell to <body>, so a keyboard or switch user had to tab back in from the
 * top of the page for every single question. It also re-injected this
 * stylesheet once per option per render; it is one document-level sheet now.
 */

const STYLE_ID = 'cat-option-style';

const CSS = `
cat-option { display: block; margin-bottom: var(--space-2); }
cat-option button {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  width: 100%;
  text-align: left;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  /* --g-raise, not --color-surface. In dark mode the surface ramp put the
     option BELOW the card it sits in (1.04:1 against it), so the chips read
     as holes and the card lost its edge. */
  background: var(--g-raise, var(--color-surface));
  font-size: var(--text-sm);
  line-height: var(--leading-body);
  transition: border-color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out),
              transform var(--duration-fast) var(--ease-out),
              opacity var(--duration) var(--ease-out);
}
@media (hover: hover) {
  cat-option:not([disabled]) button:hover { border-color: var(--color-line-strong); }
}
cat-option:not([disabled]) button:active { transform: scale(var(--press-scale)); }
cat-option .letter {
  flex: none;
  width: 1.6rem; height: 1.6rem;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-full);
  background: var(--color-surface-2);
  font-size: var(--text-2xs);
  font-weight: var(--weight-bold);
  transition: background-color var(--duration-fast) var(--ease-out),
              color var(--duration-fast) var(--ease-out);
}
cat-option[state="selected"] button { border-color: var(--color-accent); background: var(--color-accent-subtle); }
cat-option[state="selected"] .letter { background: var(--color-accent); color: var(--color-accent-ink); }
cat-option[state="correct"] button { background: var(--color-correct-bg); border-color: var(--color-correct-ink); color: var(--color-correct-ink); }
cat-option[state="correct"] .letter { background: var(--color-correct-ink); color: var(--color-correct-bg); }
cat-option[state="wrong"] button { background: var(--color-wrong-bg); border-color: var(--color-wrong-ink); color: var(--color-wrong-ink); }
cat-option[state="wrong"] .letter { background: var(--color-wrong-ink); color: var(--color-wrong-bg); }
cat-option[state="picked"] button { border-color: var(--color-ink-2); background: var(--color-surface); }
cat-option[state="picked"] .letter { background: var(--color-ink-2); color: var(--color-surface); }
cat-option[state="dimmed"] button { opacity: var(--opacity-dim); }
cat-option[disabled] button { cursor: default; }
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

class CatOption extends HTMLElement {
  static get observedAttributes() { return ['letter', 'text', 'state', 'disabled']; }

  #btn = null;
  #letterEl = null;
  #textEl = null;

  connectedCallback() {
    ensureStyle();
    if (!this.#btn) this.#build();
    this.#sync();
  }

  attributeChangedCallback() {
    // Before #build() the attributes are simply read by the first #sync().
    if (this.#btn) this.#sync();
  }

  #build() {
    this.innerHTML = '<button type="button"><span class="letter" aria-hidden="true"></span><span class="body"></span></button>';
    this.#btn = this.querySelector('button');
    this.#letterEl = this.querySelector('.letter');
    this.#textEl = this.querySelector('.body');
    this.#btn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('cat-option-select', {
        bubbles: true,
        detail: { letter: this.getAttribute('letter') ?? '' },
      }));
    });
  }

  #sync() {
    const state = this.getAttribute('state') ?? '';
    // textContent, so nothing here can be HTML — no escaping needed, and the
    // node itself survives, which is the whole point.
    this.#letterEl.textContent = this.getAttribute('letter') ?? '';
    this.#textEl.textContent = this.getAttribute('text') ?? '';
    this.#btn.disabled = this.hasAttribute('disabled');
    this.#btn.setAttribute('aria-pressed', String(state === 'selected'));
    /* The letter was hidden from assistive tech as decoration, and it is not
       decoration: an explanation says "B says the opposite", and a learner
       who cannot hear which option is B cannot follow it. The visible glyph
       stays hidden — it would be read as a bare letter mid-sentence — and
       the button carries it in a name that reads as a sentence, together
       with what happened to it once the answer is in. */
    const said = { correct: ', the answer', wrong: ', not the answer', picked: ', what you chose' }[state] ?? '';
    this.#btn.setAttribute('aria-label', `${this.getAttribute('letter') ?? ''}: ${this.getAttribute('text') ?? ''}${said}`);
  }
}

customElements.define('cat-option', CatOption);
