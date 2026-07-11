/**
 * intro.js (screen) — the first-time Odd One Out experience.
 *
 * The first open of Odd One Out shows no questions. It shows a calm,
 * beautiful introduction: what the question type is, why CAT asks it,
 * why beginners usually get it away from them, why hunting for a
 * faulty sentence is the mindset that loses marks, why building the
 * paragraph first is the whole method, and how paragraphs naturally
 * develop ideas (ODD_MAN_OUT_BIBLE §2 to §4, told in very simple
 * English).
 *
 * The learner should leave this page feeling curious, not tested.
 * After the first visit it stays one tap away from the journey as
 * "How this journey works", and Settings can bring it back.
 *
 * Copy rules for this surface: short sentences. Simple words. No
 * dashes. A mentor's voice, not a textbook's.
 */

import { markOOOIntroSeen } from '../logic/store.js';
import { cue } from '../../../core/engagement/feedback.js';

const S = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

/* Small line illustrations, one per idea. Monochrome, currentColor,
   stroke-drawn — the same art language as the RC, PJ and PS pages. */
const ART = {
  /* Five strokes; four settle into a paragraph, one drifts aside. */
  hero: `
    <path ${S} d="M14 20 H50 M14 27 H50 M14 34 H50 M14 41 H38" opacity="0.45"/>
    <path ${S} data-draw d="M58 24 L64 30 M64 24 L58 30"/>
    <circle ${S} cx="61" cy="27" r="8" opacity="0.6"/>`,
  /* Five cards, one lifting away. */
  five: `
    <rect ${S} x="12" y="14" width="34" height="8" rx="3" opacity="0.5"/>
    <rect ${S} x="12" y="26" width="34" height="8" rx="3" opacity="0.5"/>
    <rect ${S} x="12" y="38" width="34" height="8" rx="3" opacity="0.5"/>
    <rect ${S} x="12" y="50" width="34" height="8" rx="3" opacity="0.5"/>
    <rect ${S} data-draw x="52" y="24" width="12" height="8" rx="3" transform="rotate(8 58 28)"/>`,
  /* A magnifying glass over a woven thread. */
  watch: `
    <path ${S} d="M10 44 C20 36 26 48 36 40 C46 32 52 44 62 36" opacity="0.5"/>
    <circle ${S} data-draw cx="36" cy="40" r="10"/>
    <path ${S} data-draw d="M43 47 L52 56"/>`,
  /* Camouflage: two matching shapes, one with a different core. */
  camouflage: `
    <circle ${S} cx="26" cy="36" r="12" opacity="0.6"/>
    <circle ${S} cx="46" cy="36" r="12" opacity="0.6"/>
    <circle cx="26" cy="36" r="3" fill="currentColor"/>
    <path ${S} data-draw d="M43 33 L49 39 M49 33 L43 39"/>`,
  /* Four bricks joining into a wall; the mason's hand. */
  build: `
    <rect ${S} x="14" y="44" width="20" height="10" rx="2"/>
    <rect ${S} x="38" y="44" width="20" height="10" rx="2"/>
    <rect ${S} data-draw x="20" y="30" width="20" height="10" rx="2"/>
    <rect ${S} data-draw x="32" y="16" width="20" height="10" rx="2" opacity="0.7"/>`,
  /* Old carries new: one circle passing into the next. */
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
    <section class="ooo-intro__section">
      <div class="ooo-intro__art" aria-hidden="true"><svg viewBox="0 0 72 72">${art}</svg></div>
      <h2 class="ooo-intro__title">${title}</h2>
      ${bodyHTML}
    </section>`;
}

export function renderOOOIntro(outlet, { storage }, { firstTime = true, onBegin = null } = {}) {
  outlet.innerHTML = `
    <section class="screen">
      ${firstTime ? '' : `
        <div class="session-bar"><a href="#/ooo">← Back to the journey</a></div>`}

      <article class="ooo-intro">
        <header class="ooo-intro__hero">
          <div class="ooo-intro__art ooo-intro__art--hero" aria-hidden="true">
            <svg viewBox="0 0 72 72">${ART.hero}</svg>
          </div>
          <p class="screen__eyebrow">Odd One Out · a new journey</p>
          <h1 class="ooo-intro__h1">Four belong. One does not.</h1>
          <p class="ooo-intro__lede">Five sentences on one topic. Four of them
          were always a single paragraph. Your job is to find the one that was
          never part of it. That is the whole question. And it is deeper than
          it looks.</p>
        </header>

        ${section(ART.five, 'What is Odd One Out?', `
          <p>Someone wrote a good four sentence paragraph. The exam added one
          more sentence on the same topic, shuffled all five, and handed them
          to you.</p>
          <p>You read the five. You find the one that does not belong. You type
          in its number. There are no options to lean on. Just you and the
          sentences.</p>
          <p class="ooo-intro__aside">In recent CAT papers this appears as a type
          in question worth 3 marks, with no penalty for a miss. So it is always
          worth attempting. The exact count changes every year, so we treat the
          format as a setting, not a rule.</p>
        `)}

        ${section(ART.watch, 'Why does CAT ask this?', `
          <p>Because strong readers notice when a text stops holding together.
          A manager reads a report and feels, mid page, that one claim does not
          follow. That noticing is a real skill with a real name: comprehension
          monitoring.</p>
          <p>The exam cannot ask "do you notice when meaning breaks?" directly.
          So it builds a paragraph, hides one stranger inside it, and watches
          whether you feel the seam.</p>
          <p>Every sentence will be on the topic. Only four will be in the
          paragraph. Telling those two things apart is the entire test.</p>
        `)}

        ${section(ART.camouflage, 'Why beginners give away marks here', `
          <p>A beginner reads the five sentences and hunts for the one that
          sounds different. Different tense. Different tone. A word nobody else
          used. Then they cross it out and move on.</p>
          <p>Here is the honest truth. The exam setters know that habit, and
          they build items to punish it. The stranger is given the paragraph's
          own vocabulary so it sounds like family. And a sentence that truly
          belongs is dressed a little oddly so it draws your eye.</p>
          <p>On a well made item, the sentence that feels different belongs,
          and the one that feels at home does not. Feel is exactly what the
          question is built to defeat.</p>
        `)}

        ${section(ART.build, 'The mindset that wins', `
          <p>Stop hunting for a faulty sentence. There is no faulty sentence.
          The odd one is usually clear, sensible and true. It is simply a
          member of a different paragraph.</p>
          <p>So the winning move is not elimination. It is construction. Build
          the paragraph first. Find two sentences that must be neighbours, grow
          the chain to four, and read it back as one thought.</p>
          <p>Do that, and the question answers itself. The odd one is whatever
          your finished paragraph has no seat for. You never chose against a
          sentence. You chose for a paragraph.</p>
        `)}

        ${section(ART.givenNew, 'How paragraphs naturally develop ideas', `
          <p>Writers follow one quiet rule. Say something the reader already
          holds, then add one new thing to it. The new thing becomes old, and
          carries the next new thing.</p>
          <p>That handover is what makes four sentences one paragraph. Each
          sentence receives the last one's idea and passes something on.
          Pronouns, connecting words and repeated ideas are just the visible
          stitching of it.</p>
          <p>The stranger can copy the stitching. It can borrow a therefore or
          a this. What it cannot do is receive and pass on. Somewhere, its
          thread connects to nothing. Once you read for handovers, that empty
          connection is exactly what you feel.</p>
        `)}

        ${section(ART.mentor, 'How this journey teaches', `
          <p>You will not get a wall of rules. You will solve, and every solve
          will teach.</p>
          <p>The early tiers are a builder's workshop. You arrange the four
          connected sentences first, and the one you leave out becomes your
          answer. Construction before elimination, until it is a reflex. Later
          tiers look exactly like the exam.</p>
          <p>Before every item, a small mission names the one thing to protect
          as you read. A Think button sits beside you the whole time. It never
          gives hints. It asks the questions strong readers ask themselves.</p>
          <p>Every answer teaches in layers. The four sentences join into the
          paragraph they always were. Each sentence's job is named. The odd one
          separates, and the exact principle it violates is named too. And when
          a sentence catches you, we name the pull that caught you, so the same
          pull never surprises you twice.</p>
          <p>Underneath, your Reading DNA quietly learns how you detect. Your
          mentor uses it to give you one lesson after each set. One. The one
          that matters most.</p>
          <p>The ladder has eight steps, from Foundation to Premium. Each step
          teaches one skill before the next raises the pressure. Nothing is
          locked. The order is a recommendation from someone who knows the road.</p>
        `)}

        <section class="ooo-intro__section ooo-intro__cta">
          <p class="ooo-intro__closing">Your first five sentences are waiting.
          They are gentle. Everything else you need, you will learn on the way.</p>
          <button class="btn btn--primary btn--block" id="ooo-begin">
            ${firstTime ? 'Begin the journey' : 'Back to the journey'}
          </button>
        </section>
      </article>
    </section>
  `;

  /* Sections reveal as they enter the view — a page that breathes.
     Falls back to visible-by-default when IntersectionObserver is
     missing; reduced-motion users get no animation at all (base.css). */
  const sections = outlet.querySelectorAll('.ooo-intro__section');
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

  outlet.querySelector('#ooo-begin').addEventListener('click', async () => {
    try { await markOOOIntroSeen(storage); } catch { /* non-fatal */ }
    cue('cardOpen');
    // First open happens ON #/ooo, so setting the hash again would not
    // re-render; the route hands us a continuation instead.
    if (onBegin) onBegin();
    else location.hash = '#/ooo';
  });
}
