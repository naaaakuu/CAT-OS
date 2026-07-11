/**
 * intro.js (screen) — the first-time Para Summary experience.
 *
 * The first open of Para Summary shows no questions. It shows a calm,
 * beautiful introduction: what a summary question is, why CAT asks it,
 * how beginners read, how experts read, why an option that sounds good
 * can still lose, and why the author's exact intention is the whole
 * game (PARA SUMMARY BIBLE §1 to §4, told in very simple English).
 *
 * The learner should leave this page feeling curious, not tested.
 * After the first visit it stays one tap away from the journey as
 * "How this journey works", and Settings can bring it back.
 *
 * Copy rules for this surface: short sentences. Simple words. No
 * dashes. A mentor's voice, not a textbook's.
 */

import { markPSIntroSeen } from '../logic/store.js';
import { cue } from '../../../core/engagement/feedback.js';

const S = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

/* Small line illustrations, one per idea. Monochrome, currentColor,
   stroke-drawn — the same art language as the RC and PJ pages. */
const ART = {
  /* A paragraph funnelling into a single line. */
  hero: `
    <path ${S} d="M14 14 H58 M14 21 H58 M14 28 H46" opacity="0.45"/>
    <path ${S} d="M22 36 L36 46 L50 36" opacity="0.6"/>
    <path ${S} data-draw d="M18 56 H54"/>`,
  /* Four candidate lines, one carrying a quiet mark. */
  four: `
    <path ${S} d="M18 16 H54 M18 28 H54 M18 52 H54" opacity="0.45"/>
    <path ${S} d="M18 40 H54"/>
    <path ${S} data-draw d="M10 38 l3 3 l5 -6"/>`,
  /* The filter: many lines above, one thing kept below. */
  filter: `
    <path ${S} d="M12 14 H60 M18 21 H54 M24 28 H48" opacity="0.45"/>
    <path ${S} d="M12 14 L32 40 L32 52 M60 14 L40 40 L40 52" opacity="0.6"/>
    <circle ${S} data-draw cx="36" cy="58" r="4"/>`,
  /* Two readers: one path chases the bright spot, one goes to the core. */
  paths: `
    <circle cx="52" cy="20" r="5" ${S} opacity="0.5"/>
    <path ${S} d="M14 58 C24 50 40 34 48 24" opacity="0.4" stroke-dasharray="3 4"/>
    <circle cx="40" cy="44" r="2.6" fill="currentColor"/>
    <path ${S} data-draw d="M14 58 C22 52 32 48 38 45"/>`,
  /* A balance: the author's exact weight, preserved. */
  balance: `
    <path ${S} d="M36 16 V44"/>
    <path ${S} d="M20 24 H52"/>
    <path ${S} data-draw d="M20 24 l-6 12 a7 7 0 0 0 12 0 Z M52 24 l-6 12 a7 7 0 0 0 12 0 Z"/>
    <path ${S} d="M28 52 H44 M26 58 H46"/>`,
  /* The mentor beside you: two seats, one lamp. */
  mentor: `
    <path ${S} d="M14 54 V38 a6 6 0 0 1 12 0 V54 M46 54 V38 a6 6 0 0 1 12 0 V54"/>
    <path ${S} data-draw d="M36 16 v10 M28 30 a8 8 0 0 1 16 0"/>
    <circle cx="36" cy="13" r="1.6" fill="currentColor"/>`,
};

function section(art, title, bodyHTML) {
  return `
    <section class="ps-intro__section">
      <div class="ps-intro__art" aria-hidden="true"><svg viewBox="0 0 72 72">${art}</svg></div>
      <h2 class="ps-intro__title">${title}</h2>
      ${bodyHTML}
    </section>`;
}

export function renderPSIntro(outlet, { storage }, { firstTime = true, onBegin = null } = {}) {
  outlet.innerHTML = `
    <section class="screen">
      ${firstTime ? '' : `
        <div class="session-bar"><a href="#/ps">← Back to the journey</a></div>`}

      <article class="ps-intro">
        <header class="ps-intro__hero">
          <div class="ps-intro__art ps-intro__art--hero" aria-hidden="true">
            <svg viewBox="0 0 72 72">${ART.hero}</svg>
          </div>
          <p class="screen__eyebrow">Para Summary · a new journey</p>
          <h1 class="ps-intro__h1">Say it in one sentence.</h1>
          <p class="ps-intro__lede">A paragraph makes one point. Your job is to
          find the sentence that says that point fairly, and nothing else.
          That is the whole question. And it is deeper than it looks.</p>
        </header>

        ${section(ART.four, 'What is Para Summary?', `
          <p>You read a short paragraph, four to six sentences. Below it sit
          four candidate summaries. One of them says what the author said,
          compressed. The other three change it, each in one quiet way.</p>
          <p>You pick the one the author would sign.</p>
          <p class="ps-intro__aside">In recent CAT papers these appear among the
          non RC verbal questions, usually without negative marking. The exact
          format changes every cycle, so we treat it as a setting, not a rule.</p>
        `)}

        ${section(ART.filter, 'Why does CAT ask this?', `
          <p>Because this is what reading is for. A manager reads a dense memo
          and must pull out the one thing it is really saying, not the vivid
          story it opens with.</p>
          <p>A summary question watches you do exactly that. Can you tell the
          point from the example? The claim from the evidence? What the author
          said from what you already believe?</p>
          <p>The exam cannot ask "do you read for structure?" directly. So it
          hands you four summaries and watches which one you trust.</p>
        `)}

        ${section(ART.paths, 'How beginners read, and how experts read', `
          <p>A beginner reads line by line and lets loudness decide. The most
          vivid sentence feels like the point because it is easy to picture.
          The first sentence feels like the point because it came first. Options
          that reuse the paragraph's own words feel safe.</p>
          <p>An expert reads for the structure first. One sentence carries the
          paragraph. Every other sentence supports it, qualifies it, or sets it
          up. The expert finds that one sentence, checks how far it reaches and
          how strongly it is claimed, and only then looks at the options.</p>
          <p>Here is the honest part. The wrong options are built from exactly
          the beginner's habits. Every trap in this journey rewards a way of
          reading, and we will name each one as it appears.</p>
        `)}

        ${section(ART.balance, 'Why "sounds good" is not the test', `
          <p>The most tempting option often sounds better than the right one.
          More confident. More complete. More like something a summary should
          say.</p>
          <p>But a summary is not judged by how it sounds. It is judged by one
          question: would the author read it and say, that is my point, at my
          strength, and no wider than I claimed?</p>
          <p>If the author hedged, the summary hedges. If the author limited the
          claim to some cases, the summary keeps the limit. If the author was
          arguing, the summary takes a side. The author's intention is the whole
          measure. Everything in this journey trains you to protect it.</p>
        `)}

        ${section(ART.mentor, 'How this journey teaches', `
          <p>You will not get a wall of rules. You will read, write, and choose,
          and every answer will teach.</p>
          <p>Before the options, you can write the point in one sentence of your
          own. Writing first is the fastest way to learn this skill, and the app
          will walk you through comparing your sentence with the author's.</p>
          <p>Each paragraph opens with a small mission, one thing to protect as
          you read. A Think button sits beside you the whole time. It never
          gives hints. It asks the questions strong readers ask themselves.</p>
          <p>When an option catches you, we name the exact pull that caught you,
          and your Reading DNA quietly learns which pulls find you most. Your
          mentor uses it to give you one lesson after each set. One. The one
          that matters most.</p>
          <p>The ladder has eight steps, from Foundation to Premium. Each step
          teaches one skill before the next raises the pressure. Nothing is
          locked. The order is a recommendation from someone who knows the road.</p>
        `)}

        <section class="ps-intro__section ps-intro__cta">
          <p class="ps-intro__closing">Your first paragraph is waiting. It is
          gentle. Everything else you need, you will learn on the way.</p>
          <button class="btn btn--primary btn--block" id="ps-begin">
            ${firstTime ? 'Begin the journey' : 'Back to the journey'}
          </button>
        </section>
      </article>
    </section>
  `;

  /* Sections reveal as they enter the view — a page that breathes.
     Falls back to visible-by-default when IntersectionObserver is
     missing; reduced-motion users get no animation at all (base.css). */
  const sections = outlet.querySelectorAll('.ps-intro__section');
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

  outlet.querySelector('#ps-begin').addEventListener('click', async () => {
    try { await markPSIntroSeen(storage); } catch { /* non-fatal */ }
    cue('cardOpen');
    // First open happens ON #/ps, so setting the hash again would not
    // re-render; the route hands us a continuation instead.
    if (onBegin) onBegin();
    else location.hash = '#/ps';
  });
}
