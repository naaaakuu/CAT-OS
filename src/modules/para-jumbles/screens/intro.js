/**
 * intro.js (screen) — the first-time Para Jumbles experience.
 *
 * The first open of Para Jumbles shows no questions. It shows a calm,
 * beautiful introduction: what the question type is, why CAT asks it,
 * what skill it really tests, why tricks fall short, how authors
 * build paragraphs, and how this journey teaches differently
 * (PARA_JUMBLES_BIBLE §2–§5, told in very simple English).
 *
 * The learner should leave this page feeling curious, not tested.
 * After the first visit it stays one tap away from the library as
 * "How this journey works".
 *
 * Copy rules for this surface: short sentences. Simple words. No
 * dashes. A mentor's voice, not a textbook's.
 */

import { markPJIntroSeen } from '../logic/store.js';
import { cue } from '../../../core/engagement/feedback.js';

const S = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

/* Small line illustrations, one per idea. Monochrome, currentColor,
   stroke-drawn — the same art language as the RC Learning Pages. */
const ART = {
  /* Four scattered strokes settling into a paragraph. */
  hero: `
    <path ${S} d="M12 18 H34" opacity="0.45"/>
    <path ${S} d="M44 26 H60" opacity="0.45"/>
    <path ${S} d="M18 34 H42" opacity="0.45"/>
    <path ${S} data-draw d="M12 48 H60 M12 55 H60 M12 62 H44"/>`,
  /* A paragraph taken apart: the pieces and the whole. */
  pieces: `
    <rect ${S} x="10" y="12" width="24" height="10" rx="3"/>
    <rect ${S} x="40" y="18" width="22" height="10" rx="3"/>
    <rect ${S} x="16" y="30" width="22" height="10" rx="3"/>
    <path ${S} data-draw d="M14 52 H58 M14 59 H58"/>
    <path ${S} d="M36 42 v4 M33 43 l3 4 l3 -4"/>`,
  /* The thread of thought: one line through four points. */
  thread: `
    <g fill="currentColor">
      <circle cx="14" cy="50" r="2.4"/><circle cx="30" cy="34" r="2.4"/>
      <circle cx="46" cy="42" r="2.4"/><circle cx="60" cy="22" r="2.4"/>
    </g>
    <path ${S} data-draw d="M14 50 C22 42 24 36 30 34 C38 32 40 44 46 42 C54 40 54 28 60 22"/>`,
  /* A signal that can point two ways. */
  signal: `
    <path ${S} d="M36 58 V30"/>
    <path ${S} data-draw d="M36 34 L16 26 L20 20 L36 26 M36 34 L56 26 L52 20 L36 26"/>
    <circle cx="36" cy="58" r="2.4" fill="currentColor"/>`,
  /* Old hands new: one circle passing into the next. */
  givenNew: `
    <circle ${S} cx="26" cy="36" r="14"/>
    <circle ${S} data-draw cx="46" cy="36" r="14"/>
    <circle cx="36" cy="36" r="2" fill="currentColor"/>`,
  /* The mentor beside you: two seats, one lamp. */
  mentor: `
    <path ${S} d="M14 54 V38 a6 6 0 0 1 12 0 V54 M46 54 V38 a6 6 0 0 1 12 0 V54"/>
    <path ${S} data-draw d="M36 16 v10 M28 30 a8 8 0 0 1 16 0"/>
    <circle cx="36" cy="13" r="1.6" fill="currentColor"/>`,
};

function section(art, title, bodyHTML) {
  return `
    <section class="pj-intro__section">
      <div class="pj-intro__art" aria-hidden="true"><svg viewBox="0 0 72 72">${art}</svg></div>
      <h2 class="pj-intro__title">${title}</h2>
      ${bodyHTML}
    </section>`;
}

export function renderPJIntro(outlet, { storage }, { firstTime = true, onBegin = null } = {}) {
  outlet.innerHTML = `
    <section class="screen">
      ${firstTime ? '' : `
        <div class="session-bar"><a href="#/pj">← Back to the journey</a></div>`}

      <article class="pj-intro">
        <header class="pj-intro__hero">
          <div class="pj-intro__art pj-intro__art--hero" aria-hidden="true">
            <svg viewBox="0 0 72 72">${ART.hero}</svg>
          </div>
          <p class="screen__eyebrow">Para Jumbles · a new journey</p>
          <h1 class="pj-intro__h1">Put the author back together.</h1>
          <p class="pj-intro__lede">Four sentences. One paragraph, taken apart.
          Your job is to find the order the author wrote them in. That is the
          whole question. And it is deeper than it looks.</p>
        </header>

        ${section(ART.pieces, 'What is a para jumble?', `
          <p>Someone wrote a good paragraph. Then the exam shuffled its
          sentences and handed you the pieces.</p>
          <p>You read the four sentences. You decide their true order. You type
          it in. There are no options to choose from. Just you and the
          sentences.</p>
          <p class="pj-intro__aside">In recent CAT papers this appears as a type-in
          question worth 3 marks, with no penalty for a miss. The exact mix
          changes every year, so we treat the format as a setting, not a rule.</p>
        `)}

        ${section(ART.thread, 'Why does CAT ask this?', `
          <p>Normal reading is easy to fake. The author did the hard work and
          you just followed along.</p>
          <p>A jumble removes that help. Now you must see how a thought grows.
          Where it starts. What it needs next. Where it lands.</p>
          <p>That is the skill of every strong reader: seeing the structure
          underneath the words. CAT cannot ask "do you see structure?"
          directly. So it hands you a broken paragraph and watches.</p>
        `)}

        ${section(ART.signal, 'Why do students find them hard?', `
          <p>Most students learn shortcuts. A pronoun cannot come first. Follow
          the repeated word. A sentence with "however" goes in the middle.</p>
          <p>Here is the honest truth. The exam setters know every one of those
          shortcuts. And they build questions where the shortcuts point the
          right way on easy items, and the way that costs you marks on hard ones.</p>
          <p>A repeated word can be planted between two sentences that never
          touch. Two different sentences can both look like the opener. The
          clues are real. But each clue is a hint, not a law.</p>
        `)}

        ${section(ART.givenNew, 'How authors actually build paragraphs', `
          <p>Writers follow one quiet rule. Say something the reader already
          holds, then add one new thing to it. The new thing becomes old, and
          carries the next new thing.</p>
          <p>Old carries new, sentence after sentence. That handover is the
          real glue of a paragraph. Pronouns, connecting words and repeated
          ideas are just the visible traces of it.</p>
          <p>Once you learn to feel that handover, jumbles stop being puzzles.
          They become paragraphs you happen to be rebuilding.</p>
        `)}

        ${section(ART.mentor, 'How this journey teaches', `
          <p>You will not get a wall of rules. You will solve, and every solve
          will teach.</p>
          <p>When your order matches, we show you why it works, so the win is
          repeatable. When it does not, we walk your exact order to the point
          where it breaks, and we name the trap that invited it. The same trap
          will never surprise you twice.</p>
          <p>Underneath, your Reading DNA quietly learns how you solve. Which
          signals you lean on. Where you rush. What is getting stronger. Your
          mentor uses it to give you one lesson after each set. One. The one
          that matters most.</p>
          <p>The ladder has eight steps, from Beginner to Premium. Each step
          feels different because each one is built differently. Nothing is
          locked. The order is a recommendation from someone who knows the road.</p>
        `)}

        <section class="pj-intro__section pj-intro__cta">
          <p class="pj-intro__closing">Your first jumble is waiting. It is
          gentle. Everything else you need, you will learn on the way.</p>
          <button class="btn btn--primary btn--block" id="pj-begin">
            ${firstTime ? 'Begin the journey' : 'Back to the journey'}
          </button>
        </section>
      </article>
    </section>
  `;

  /* Sections reveal as they enter the view — a page that breathes.
     Falls back to visible-by-default when IntersectionObserver is
     missing; reduced-motion users get no animation at all (base.css). */
  const sections = outlet.querySelectorAll('.pj-intro__section');
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

  outlet.querySelector('#pj-begin').addEventListener('click', async () => {
    try { await markPJIntroSeen(storage); } catch { /* non-fatal */ }
    cue('cardOpen');
    // First open happens ON #/pj, so setting the hash again would not
    // re-render; the route hands us a continuation instead.
    if (onBegin) onBegin();
    else location.hash = '#/pj';
  });
}
