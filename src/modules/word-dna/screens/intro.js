/**
 * intro.js (screen) — the first-time Word DNA experience.
 *
 * The first open of Word DNA shows no words to memorise. It shows a
 * calm, beautiful introduction: what Word DNA is, why English words
 * repeat their pieces, why understanding a pattern beats memorising a
 * meaning, how one root can unlock dozens of words, and how this
 * journey teaches differently, told in very simple English.
 *
 * The learner should leave this page curious, not tested. After the
 * first visit it stays one tap away from the Tree as "How this journey
 * works", and Settings can bring it back.
 *
 * Copy rules for this surface: short sentences. Simple words. No
 * dashes. A mentor's voice, not a textbook's.
 */

import { markWDIntroSeen } from '../logic/store.js';
import { cue } from '../../../core/engagement/feedback.js';

const S = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

/* Small line illustrations, one per idea. Monochrome, currentColor,
   stroke-drawn — the same art language as every other module's intro. */
const ART = {
  /* Roots below, one trunk, words branching out above. */
  hero: `
    <path ${S} opacity="0.45" d="M36 30 L20 46 M36 30 L52 46 M36 30 L36 50"/>
    <path ${S} data-draw d="M36 30 V12 M36 18 L26 10 M36 18 L46 10"/>
    <circle cx="36" cy="30" r="3" fill="currentColor"/>`,
  /* A word splitting into its pieces. */
  pieces: `
    <rect ${S} x="10" y="26" width="18" height="16" rx="3"/>
    <rect ${S} x="30" y="26" width="14" height="16" rx="3"/>
    <rect ${S} x="46" y="26" width="16" height="16" rx="3"/>
    <path ${S} data-draw d="M16 50 H56"/>`,
  /* Several paths converging on one point, then continuing: languages meeting. */
  converge: `
    <circle cx="14" cy="14" r="2.2" fill="currentColor"/>
    <circle cx="58" cy="14" r="2.2" fill="currentColor"/>
    <circle cx="14" cy="52" r="2.2" fill="currentColor"/>
    <path ${S} d="M14 14 L36 36 M58 14 L36 36 M14 52 L36 36"/>
    <path ${S} data-draw d="M36 36 L36 58"/>`,
  /* A single key opening many doors: one idea, several outcomes. */
  key: `
    <circle ${S} cx="20" cy="36" r="8"/>
    <path ${S} data-draw d="M28 36 H56 M46 36 V44 M54 36 V42"/>`,
  /* One root, many branches, each ending in a small leaf-word. */
  unlock: `
    <path ${S} d="M36 54 V32"/>
    <path ${S} d="M36 38 C28 34 22 26 22 16 M36 34 C42 30 48 22 48 12 M36 44 C46 42 56 36 60 28"/>
    <circle cx="22" cy="16" r="2.4" fill="currentColor"/>
    <circle cx="48" cy="12" r="2.4" fill="currentColor"/>
    <circle ${S} data-draw cx="60" cy="28" r="2.4"/>`,
  /* The mentor beside you: two seats, one lamp — the same figure every
     module's teaching section uses. */
  mentor: `
    <path ${S} d="M14 54 V38 a6 6 0 0 1 12 0 V54 M46 54 V38 a6 6 0 0 1 12 0 V54"/>
    <path ${S} data-draw d="M36 16 v10 M28 30 a8 8 0 0 1 16 0"/>
    <circle cx="36" cy="13" r="1.6" fill="currentColor"/>`,
};

function section(art, title, bodyHTML) {
  return `
    <section class="wd-intro__section">
      <div class="wd-intro__art" aria-hidden="true"><svg viewBox="0 0 72 72">${art}</svg></div>
      <h2 class="wd-intro__title">${title}</h2>
      ${bodyHTML}
    </section>`;
}

export function renderWDIntro(outlet, { storage }, { firstTime = true, onBegin = null } = {}) {
  outlet.innerHTML = `
    <section class="screen">
      ${firstTime ? '' : `
        <div class="session-bar"><a href="#/wd">← Back to the Tree</a></div>`}

      <article class="wd-intro">
        <header class="wd-intro__hero">
          <div class="wd-intro__art wd-intro__art--hero" aria-hidden="true">
            <svg viewBox="0 0 72 72">${ART.hero}</svg>
          </div>
          <p class="screen__eyebrow">Word DNA · a new journey</p>
          <h1 class="wd-intro__h1">Learn how English is built.</h1>
          <p class="wd-intro__lede">English is not a list of words to memorise. It is a
          system, built from a small number of pieces, used again and again. Learn the
          pieces, and you start reading words you have never met.</p>
        </header>

        ${section(ART.pieces, 'What is Word DNA?', `
          <p>Every word carries a history. Long ago, someone built it from smaller pieces:
          a root that carries the core idea, sometimes a prefix in front, sometimes a
          suffix at the end.</p>
          <p>Word DNA is not a vocabulary list. It teaches you the pieces themselves, so
          one root can hand you the meaning of ten words you have never seen.</p>
          <p class="wd-intro__aside">Every root, prefix, suffix, and word in this journey
          is transcribed from a classical word-building reference, exactly as written.</p>
        `)}

        ${section(ART.converge, 'Why do so many words repeat their parts?', `
          <p>English borrowed from everywhere. Greek gave it roots for time, love, and
          knowledge. Latin gave it roots for movement, sight, and speech. German,
          Japanese, French, and a dozen other languages each left words behind, whole.</p>
          <p>That history is why so many English words rhyme in meaning, not only in
          sound. Chronology and chronic do not just sound alike. They share an ancestor.</p>
        `)}

        ${section(ART.key, 'Why understanding beats memorising', `
          <p>Memorising a word gives you exactly one word. Understanding its root gives
          you a method.</p>
          <p>A student who memorises a thousand words knows a thousand words. A student
          who learns fifty roots can often guess the meaning of thousands, including
          words they have never studied.</p>
          <p>This is not a shortcut. It is how strong readers already work, whether they
          ever noticed it or not.</p>
        `)}

        ${section(ART.unlock, 'One root can unlock fifty words', `
          <p>Take the Greek root chron, meaning time. Once you know it, chronology,
          chronic, chronometer, and asynchronous all open at once. None of them needs to
          be memorised on its own.</p>
          <p>That is the feeling this journey is built around. Not "I remember more
          words," but "I can work out a word I have never seen."</p>
        `)}

        ${section(ART.mentor, 'How this journey teaches', `
          <p>You will not get a list to memorise. You will meet a small family of words,
          notice what they share, guess before you are told, and then test yourself on a
          word from the same family that was never taught to you directly.</p>
          <p>Every family lives on the Language Tree: roots, prefixes, suffixes, foreign
          words, and CAT vocabulary, all in one place. Nothing is ever locked.</p>
          <p>Words you truly earn settle into your Word Garden, a quiet shelf that grows
          slowly and never asks you to review anything you have not actually understood.</p>
        `)}

        <section class="wd-intro__section wd-intro__cta">
          <p class="wd-intro__closing">Your first root is waiting. It is small, and it
          will not stay unfamiliar for long.</p>
          <button class="btn btn--primary btn--block" id="wd-begin">
            ${firstTime ? 'Begin the journey' : 'Back to the Tree'}
          </button>
        </section>
      </article>
    </section>
  `;

  /* Sections reveal as they enter the view — a page that breathes.
     Falls back to visible-by-default when IntersectionObserver is
     missing; reduced-motion users get no animation at all (base.css). */
  const sections = outlet.querySelectorAll('.wd-intro__section');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('is-seen'); io.unobserve(e.target); }
      }
    }, { threshold: 0.15 });
    for (const s of sections) io.observe(s);
  } else {
    for (const s of sections) s.classList.add('is-seen');
  }

  outlet.querySelector('#wd-begin').addEventListener('click', async () => {
    try { await markWDIntroSeen(storage); } catch { /* non-fatal */ }
    cue('cardOpen');
    // First open happens ON #/wd, so setting the hash again would not
    // re-render; the route hands us a continuation instead.
    if (onBegin) onBegin();
    else location.hash = '#/wd';
  });
}
