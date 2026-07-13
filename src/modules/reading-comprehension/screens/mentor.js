/**
 * mentor.js (screen) — the Learning Page: what turns "I scored 4/5"
 * into "I understand this now." One of CAT OS's signature surfaces.
 *
 * Design intent (0.6.0): a chapter from a beautiful book. A calm
 * monochrome illustration drawn for THIS passage's theme, then the
 * sections a mentor would actually walk you through:
 *
 *   What was this actually about?   (recall first — generation effect)
 *   What was the author doing?
 *   The journey, paragraph by paragraph (in very plain language)
 *   Where the argument turns · How the voice moves
 *   Why readers misread it          (v3 mentor content)
 *   The traps, as advice
 *   Words worth keeping
 *   Keep this forever               (the one pull-quote the page earns)
 *   Where life will show you this again
 *
 * …then "What you learned today" (derived from this session, never
 * generic) and an optional reflection kept on-device (learning store).
 *
 * Route: /rc/mentor/:id (from results, review, and the library).
 */

import { loadRCPassage } from '../../../core/content-loader/loader.js';
import { latestSessionFor, getReflection, saveReflection } from '../logic/store.js';
import { escapeHTML } from '../../../core/utils/format.js';
import { toast } from '../../../ui/components/cat-toast.js';
import { cue } from '../../../core/engagement/feedback.js';
import '../../../ui/components/cat-reflection.js';

/* ------------------------------------------------------------------ */
/* The app's only artwork: one quiet line-motif per PASSAGE, drawn to
   its theme (0.6.0). Monochrome, currentColor, stroke-drawn on
   arrival. Falls back to a genre motif, then to a plain circle, so
   future passages always have something honest to show.              */
/* ------------------------------------------------------------------ */

const S = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';

const THEME_ART = {
  /* Epistemic deference: a balance — your judgment on one side,
     the experts' on the other. */
  'rc-0001': `
    <path ${S} data-draw d="M14 30 H58"/>
    <circle cx="36" cy="28" r="2.4" fill="currentColor"/>
    <path ${S} d="M36 30 V54 M26 54 H46"/>
    <path ${S} d="M14 30 L8 42 M14 30 L20 42 M8 42 A6.2 6.2 0 0 0 20 42"/>
    <path ${S} d="M58 30 L52 42 M58 30 L64 42 M52 42 A6.2 6.2 0 0 0 64 42"/>`,
  /* Prices as signals: a moving line that carries information. */
  'rc-0002': `
    <path ${S} data-draw d="M10 54 L28 38 L40 46 L62 20"/>
    <path ${S} d="M52 20 h10 v10"/>
    <circle cx="28" cy="38" r="2.2" fill="currentColor"/>
    <circle cx="40" cy="46" r="2.2" fill="currentColor"/>`,
  /* One result vs. the weight of many: a single point against a grid. */
  'rc-0003': `
    <circle ${S} cx="21" cy="34" r="9"/>
    <g fill="currentColor">
      ${[0, 1, 2].map((r) => [0, 1, 2].map((c) =>
        `<circle cx="${46 + c * 8}" cy="${26 + r * 8}" r="2.3"/>`).join('')).join('')}
    </g>
    <path ${S} data-draw d="M12 56 H62"/>`,
  /* Measurement distorts: a gauge whose needle is part of the story. */
  'rc-0004': `
    <path ${S} data-draw d="M14 50 A22 22 0 0 1 58 50"/>
    <path ${S} d="M36 28 v-5 M17 39 l-4.5 -2.5 M55 39 l4.5 -2.5"/>
    <path ${S} d="M36 50 L49 33"/>
    <circle cx="36" cy="50" r="2.6" fill="currentColor"/>`,
  /* Rereading: the book, and the way back to it. */
  'rc-0005': `
    <path ${S} d="M36 24 C29 19 19 19 13 22 L13 52 C19 49 29 49 36 54 C43 49 53 49 59 52 L59 22 C53 19 43 19 36 24 Z M36 24 V54"/>
    <path ${S} data-draw d="M26 13 A11 9 0 0 1 46 10"/>
    <path ${S} d="M46 10 l4.5 -3 M46 10 l-0.5 5.5"/>`,
  /* The hand remembers: a nib and the loop it has learned. */
  'rc-0006': `
    <path ${S} data-draw d="M10 52 C16 42 26 40 30 47 C34 54 26 60 22 54 C18 48 28 38 44 33"/>
    <path ${S} d="M44 33 L56 21 l4 4 L48 37 Z"/>
    <circle cx="53" cy="27" r="1" fill="currentColor"/>`,
  /* The invention of the weekend: a month with two days set free. */
  'rc-0007': `
    <rect ${S} x="14" y="16" width="44" height="42" rx="4"/>
    <path ${S} data-draw d="M14 26 H58"/>
    <path ${S} d="M25 16 v-4 M47 16 v-4"/>
    <g fill="currentColor">
      <circle cx="22" cy="35" r="1.7"/><circle cx="30" cy="35" r="1.7"/>
      <circle cx="38" cy="35" r="1.7"/><circle cx="22" cy="43" r="1.7"/>
      <circle cx="30" cy="43" r="1.7"/><circle cx="38" cy="43" r="1.7"/>
      <circle cx="22" cy="51" r="1.7"/><circle cx="30" cy="51" r="1.7"/>
    </g>
    <rect x="45" y="31.5" width="7" height="7" rx="2" fill="currentColor"/>
    <rect x="45" y="39.5" width="7" height="7" rx="2" fill="currentColor" opacity="0.55"/>`,
  /* Translation: two texts, and the crossing between them. */
  'rc-0008': `
    <rect ${S} x="10" y="16" width="20" height="28" rx="3"/>
    <rect ${S} x="42" y="28" width="20" height="28" rx="3"/>
    <path ${S} d="M14 24 h12 M14 30 h12 M14 36 h8"/>
    <path ${S} d="M46 36 h12 M46 42 h12 M46 48 h8"/>
    <path ${S} data-draw d="M30 30 C38 30 34 42 42 42"/>`,
  /* The ethics of looking: the gaze, and what it rests upon. */
  'rc-0009': `
    <path ${S} data-draw d="M12 36 C22 24 50 24 60 36 C50 48 22 48 12 36 Z"/>
    <circle ${S} cx="36" cy="36" r="7"/>
    <circle cx="36" cy="36" r="2.4" fill="currentColor"/>`,
  /* Small talk: two speakers, and the sound that bridges them. */
  'rc-0010': `
    <circle ${S} cx="18" cy="42" r="8"/>
    <circle ${S} cx="54" cy="42" r="8"/>
    <path ${S} data-draw d="M26 38 C34 27 38 27 46 38"/>
    <circle cx="36" cy="31" r="1.7" fill="currentColor"/>`,
  /* The quartet's cost: a single note that cannot be hurried. */
  'rc-0011': `
    <path ${S} data-draw d="M30 49 L30 17 C38 18 48 20 48 14"/>
    <ellipse cx="24" cy="50" rx="6.5" ry="4.5" fill="currentColor" transform="rotate(-20 24 50)"/>`,
  /* Emergence: parts below, a pattern that appears only above them. */
  'rc-0012': `
    <g fill="currentColor">
      <circle cx="16" cy="52" r="2"/><circle cx="26" cy="52" r="2"/><circle cx="36" cy="52" r="2"/>
      <circle cx="46" cy="52" r="2"/><circle cx="56" cy="52" r="2"/>
    </g>
    <path ${S} data-draw d="M14 34 C24 20 30 42 36 32 C42 22 48 42 58 28"/>`,
  /* Mere exposure: repetition, arc on arc, warming toward a point. */
  'rc-0013': `
    <path ${S} d="M24 47 A18 18 0 0 1 24 25"/>
    <path ${S} d="M32 49 A22 22 0 0 1 32 23"/>
    <path ${S} data-draw d="M40 51 A26 26 0 0 1 40 21"/>
    <circle cx="50" cy="36" r="2.4" fill="currentColor"/>`,
  /* Consent of the defeated: the ballot lowered into the box. */
  'rc-0014': `
    <path ${S} d="M16 36 H56 V56 H16 Z"/>
    <path ${S} d="M30 36 V32 H42 V36"/>
    <path ${S} data-draw d="M36 12 L36 30 M30 24 L36 30 L42 24"/>`,
  /* The outsourced conscience: the judgement handed away. */
  'rc-0015': `
    <circle ${S} cx="44" cy="26" r="9"/>
    <path ${S} d="M44 13 v-2 M44 39 v2 M57 26 h2 M31 26 h-2 M53 17 l1.5 -1.5 M35 35 l-1.5 1.5 M53 35 l1.5 1.5 M35 17 l-1.5 -1.5"/>
    <circle cx="44" cy="26" r="3" fill="currentColor"/>
    <path ${S} data-draw d="M12 56 C17 47 26 45 31 50 L37 44"/>`,
  /* Weak ties: two tight clusters, joined by a single bridge. */
  'rc-0016': `
    <g fill="currentColor">
      <circle cx="16" cy="30" r="2"/><circle cx="23" cy="40" r="2"/><circle cx="14" cy="45" r="2"/>
      <circle cx="56" cy="30" r="2"/><circle cx="49" cy="40" r="2"/><circle cx="58" cy="45" r="2"/>
    </g>
    <path ${S} d="M16 30 L23 40 L14 45 Z M56 30 L49 40 L58 45 Z"/>
    <path ${S} data-draw d="M23 38 C34 30 38 30 49 38"/>`,
  /* Railway time: the clock, detached from the sun. */
  'rc-0017': `
    <circle ${S} cx="40" cy="40" r="16"/>
    <path ${S} d="M40 40 V30 M40 40 L48 44"/>
    <circle ${S} data-draw cx="17" cy="19" r="5"/>
    <path ${S} d="M17 9 v-3 M17 29 v3 M7 19 h-3 M27 19 h3"/>`,
  /* Wilderness as a drawn line: the range inside its frame. */
  'rc-0018': `
    <path ${S} d="M8 54 H64 V16 H8 Z" stroke-dasharray="4 4"/>
    <path ${S} data-draw d="M14 50 L28 32 L38 42 L48 26 L60 50"/>`,
  /* The original and its ghost: two frames, one with an aura. */
  'rc-0019': `
    <rect ${S} x="12" y="22" width="22" height="30" rx="2"/>
    <rect ${S} x="40" y="22" width="22" height="30" rx="2"/>
    <path ${S} data-draw d="M23 32 l3 6 l-6 0 Z"/>
    <path ${S} d="M51 14 l1.3 3 l3 0.4 l-2.1 2.1 l0.5 3 l-2.7 -1.5 l-2.7 1.5 l0.5 -3 l-2.1 -2.1 l3 -0.4 Z"/>`,
  /* A poem's meaning: the open book, and the reading that lifts from it. */
  'rc-0020': `
    <path ${S} d="M36 27 C30 23 20 23 14 26 L14 50 C20 47 30 47 36 51 C42 47 52 47 58 50 L58 26 C52 23 42 23 36 27 Z M36 27 V51"/>
    <path ${S} data-draw d="M36 21 L36 12 M28 17 L24 10 M44 17 L48 10"/>`,
  /* The market for lemons: a price tag with a hidden flaw. */
  'rc-0021': `
    <path ${S} data-draw d="M20 18 H44 L58 32 L38 52 L18 32 Z"/>
    <circle cx="28" cy="28" r="2.4" fill="currentColor"/>
    <path ${S} d="M40 30 l-4 6 l5 3 l-3 5"/>`,
  /* Rewritten history: layered pages, the same past re-read. */
  'rc-0022': `
    <path ${S} d="M18 24 H44 V54 H18 Z"/>
    <path ${S} d="M26 16 H52 V46"/>
    <path ${S} data-draw d="M23 32 H39 M23 39 H39 M23 46 H33"/>`,
  /* Moral luck: the die whose fall no one controls. */
  'rc-0023': `
    <rect ${S} data-draw x="20" y="20" width="32" height="32" rx="5"/>
    <g fill="currentColor">
      <circle cx="29" cy="29" r="2"/><circle cx="43" cy="29" r="2"/>
      <circle cx="36" cy="36" r="2"/>
      <circle cx="29" cy="43" r="2"/><circle cx="43" cy="43" r="2"/>
    </g>`,
  /* Cognitive dissonance: two arrows pulling against each other. */
  'rc-0024': `
    <path ${S} data-draw d="M16 28 H50 M42 20 L52 28 L42 36"/>
    <path ${S} d="M56 44 H22 M30 36 L20 44 L30 52"/>`,
  /* Who are the people: a boundary drawn around the enclosed. */
  'rc-0025': `
    <circle ${S} data-draw cx="34" cy="36" r="22"/>
    <g fill="currentColor">
      <circle cx="28" cy="32" r="2"/><circle cx="40" cy="32" r="2"/>
      <circle cx="28" cy="42" r="2"/><circle cx="40" cy="42" r="2"/>
      <circle cx="34" cy="37" r="2"/>
    </g>
    <path ${S} d="M52 22 l8 -6"/>`,
  /* The gift: a wrapped box whose ribbon loops back. */
  'rc-0026': `
    <rect ${S} x="16" y="30" width="40" height="24" rx="2"/>
    <path ${S} d="M16 38 H56 M36 30 V54"/>
    <path ${S} data-draw d="M36 30 C30 22 22 24 26 30 M36 30 C42 22 50 24 46 30"/>`,
  /* Moral panic: a small mouth, an amplified alarm. */
  'rc-0027': `
    <path ${S} data-draw d="M16 32 L34 26 V46 L16 40 Z"/>
    <path ${S} d="M34 30 C40 32 40 40 34 42"/>
    <path ${S} d="M44 26 C52 30 52 42 44 46"/>
    <path ${S} d="M50 22 C62 28 62 44 50 50"/>`,
  /* Falsification: the single black swan that settles it. */
  'rc-0028': `
    <path ${S} data-draw d="M22 50 C18 40 26 34 34 36 C30 28 34 20 40 20 C40 26 44 28 44 32 C52 34 54 44 46 50 Z"/>
    <circle cx="40" cy="24" r="1" fill="currentColor"/>
    <path ${S} d="M14 54 H58"/>`,
  /* The freedom of the form: fourteen lines inside their frame. */
  'rc-0029': `
    <rect ${S} x="18" y="14" width="36" height="46" rx="2"/>
    <path ${S} data-draw d="M24 22 H48 M24 28 H48 M24 34 H44 M24 40 H48 M24 46 H40 M24 52 H46"/>`,
  /* The attention economy: a screen and its endless scroll. */
  'rc-0030': `
    <rect ${S} x="24" y="12" width="24" height="44" rx="4"/>
    <path ${S} data-draw d="M36 40 C30 40 30 32 36 32 C44 32 44 44 34 44 C22 44 24 26 40 26"/>`,
  /* The paradox of fiction: the mask, and its single tear. */
  'rc-0031': `
    <path ${S} data-draw d="M20 22 C20 44 28 54 36 54 C44 54 52 44 52 22 C44 26 28 26 20 22 Z"/>
    <path ${S} d="M28 32 q3 -3 6 0 M38 32 q3 -3 6 0"/>
    <path ${S} d="M31 40 C33 44 39 44 41 40"/>
    <path ${S} d="M30 36 C30 42 27 44 27 47"/>`,
  /* The price of a forest: the tree with a tag hung on it. */
  'rc-0032': `
    <path ${S} data-draw d="M36 16 C46 24 46 34 40 36 C48 38 48 48 38 48 H34 C24 48 24 38 32 36 C26 34 26 24 36 16 Z"/>
    <path ${S} d="M36 48 V56"/>
    <path ${S} d="M44 40 l8 6 l-3 4 l-8 -6 Z"/>
    <circle cx="49" cy="45" r="1" fill="currentColor"/>`,
};

const GENRE_ART = {
  philosophy: `<circle ${S} cx="26" cy="36" r="16"/><circle ${S} data-draw cx="46" cy="36" r="16"/>`,
  economics: `<path ${S} data-draw d="M10 54 L28 38 L40 46 L62 20"/><path ${S} d="M52 20 h10 v10"/>`,
  science: `<circle cx="36" cy="36" r="4" fill="currentColor"/><ellipse ${S} cx="36" cy="36" rx="26" ry="11"/><ellipse ${S} data-draw cx="36" cy="36" rx="26" ry="11" transform="rotate(60 36 36)"/>`,
  sociology: `<g fill="currentColor">${[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => `<circle cx="${18 + c * 12}" cy="${18 + r * 12}" r="2.4"/>`).join('')).join('')}</g><path ${S} data-draw d="M18 18 L54 54 M54 18 L30 42"/>`,
  'arts-culture': `<path ${S} data-draw d="M36 16 C22 24 14 24 10 22 L10 50 C16 52 24 50 36 58 C48 50 56 52 62 50 L62 22 C58 24 50 24 36 16 Z M36 16 V58"/>`,
  history: `<circle ${S} cx="36" cy="36" r="20"/><path ${S} data-draw d="M36 24 V36 L45 42"/>`,
  psychology: `<path ${S} data-draw d="M24 52 C14 46 12 32 20 24 C28 16 44 16 50 24 C58 22 62 30 58 36 C62 42 56 50 48 48 C44 54 32 56 24 52 Z"/>`,
  'literature-theory': `<path ${S} data-draw d="M20 14 H52 A4 4 0 0 1 56 18 V58 L36 48 L16 58 V18 A4 4 0 0 1 20 14 Z"/>`,
  anthropology: `<path ${S} d="M24 20 H48 M26 30 H46"/><path ${S} data-draw d="M28 20 C22 30 22 45 32 51 L40 51 C50 45 50 30 44 20"/>`,
  'political-theory': `<path ${S} d="M18 22 H54 M20 50 H52 M14 55 H58"/><path ${S} data-draw d="M27 22 V50 M36 22 V50 M45 22 V50"/>`,
  'technology-ethics': `<circle ${S} cx="36" cy="22" r="5"/><circle ${S} cx="20" cy="48" r="5"/><circle ${S} cx="52" cy="48" r="5"/><path ${S} data-draw d="M33 26 L23 44 M39 26 L49 44 M25 48 H47"/>`,
  environment: `<path ${S} data-draw d="M36 14 C50 22 50 44 36 56 C22 44 22 22 36 14 Z"/><path ${S} d="M36 20 V50"/>`,
};
const ART_FALLBACK = `<circle ${S} data-draw cx="36" cy="36" r="20"/>`;

function artFor(item) {
  return THEME_ART[item.meta.id] ?? GENRE_ART[item.meta.genre] ?? ART_FALLBACK;
}

/* ------------------------------------------------------------------ */

function section(title, bodyHTML) {
  return `
    <section class="mentor__section">
      <div class="mentor__mark"><h2>${escapeHTML(title)}</h2><div class="rule"></div></div>
      ${bodyHTML}
    </section>`;
}

/** First words of a paragraph, as a memory anchor for the journey rail. */
function opening(text, words = 7) {
  const parts = String(text).split(/\s+/);
  const head = parts.slice(0, words).join(' ');
  return parts.length > words ? `${head}…` : head;
}

/** Render a multi-paragraph block (split on blank lines) as escaped <p>s,
 *  so the v4 "explained simply" retelling reads like book prose. */
function prose(text) {
  return String(text)
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHTML(p)}</p>`)
    .join('');
}

export async function renderMentor(outlet, { storage }, params) {
  let item;
  let last = null;
  let reflection = null;
  try {
    item = await loadRCPassage(params.id);
    [last, reflection] = await Promise.all([
      latestSessionFor(storage, params.id),
      getReflection(storage, params.id),
    ]);
  } catch (err) {
    outlet.innerHTML = `<section class="screen"><h1>Can't open the Learning Page</h1>
      <div class="card"><p>${escapeHTML(err.message)}</p>
      <p class="muted"><a href="#/rc">Back to the library</a></p></div></section>`;
    return;
  }

  const mentor = item.mentor;
  if (!mentor) {
    // v1 content has no mentor layer — say so honestly, keep the exits.
    outlet.innerHTML = `
      <section class="screen">
        <div class="empty">
          <div class="empty__glyph" aria-hidden="true">¶</div>
          <h2>No Learning Page yet</h2>
          <p>This passage predates the mentor layer. Its review still has
          full explanations for every question.</p>
          <a class="btn btn--primary" href="#/rc/review/${item.meta.id}">Open the review</a>
        </div>
      </section>`;
    return;
  }

  const vocab = item.vocabulary ?? [];
  const skills = item.meta.skills ?? [];
  const skillLabel = (s) => s.replaceAll('-', ' ');
  const paragraphsById = new Map(item.passage.paragraphs.map((p) => [p.id, p]));

  /* "What you learned today" is derived, never generic: this passage,
     this session. */
  const learnedRows = [
    { icon: '¶', label: 'Concept understood', hint: item.meta.theme },
    ...(skills.length ? [{ icon: '◎', label: 'Reading skills practiced',
      hint: skills.map(skillLabel).join(' · ') }] : []),
    ...(vocab.length ? [{ icon: '∎', label: `Vocabulary gained · ${vocab.length} words`,
      hint: vocab.map((v) => v.word).join(', ') }] : []),
    ...(last ? [{ icon: '✓', label: 'Thinking patterns exercised',
      hint: [...new Set(item.questions.map((q) => q.type.replaceAll('_', ' ')))].join(' · ') }] : []),
  ];

  outlet.innerHTML = `
    <section class="screen">
      <div class="session-bar">
        <a href="#/rc">← Journey</a>
        ${last ? `<a href="#/rc/review/${item.meta.id}">Your answers</a>` : ''}
      </div>

      <article class="mentor">
        <header class="mentor__hero">
          <div class="mentor__art" aria-hidden="true">
            <svg viewBox="0 0 72 72">${artFor(item)}</svg>
          </div>
          <p class="screen__eyebrow">Learning page · ${escapeHTML(item.meta.genre)} · ${escapeHTML(item.meta.stage ?? '')}</p>
          <h1 class="mentor__title">${escapeHTML(item.passage.title)}</h1>
          <p class="mentor__lede">${escapeHTML(item.meta.theme)}</p>
        </header>

        ${section('What was this actually about?', `
          <details class="mentor__recall">
            <summary>First, try to say it in your own words — then open</summary>
            <div class="mentor__reveal">
              ${mentor.one_sentence_summary
                ? `<p class="mentor__one-line">${escapeHTML(mentor.one_sentence_summary)}</p>` : ''}
              <p>${escapeHTML(mentor.main_idea)}</p>
            </div>
          </details>`)}

        ${mentor.simple_explanation ? section('The passage, explained simply', `
          <div class="mentor__plain">${prose(mentor.simple_explanation)}</div>`) : ''}

        ${section('What was the author doing?', `<p>${escapeHTML(mentor.author_intention)}</p>`)}

        ${section('The journey, paragraph by paragraph', `
          <ol class="journey">
            ${mentor.paragraph_journey.map((j, i) => `
              <li data-n="${i + 1}">
                <div class="role">${escapeHTML(j.role)}</div>
                <span class="opening">“${escapeHTML(opening(paragraphsById.get(j.paragraph_id)?.text ?? ''))}”</span>
                <p class="note">${escapeHTML(j.note)}</p>
              </li>`).join('')}
          </ol>`)}

        ${section('Where the argument turns', `
          ${mentor.key_transitions.map((t) => `<p>${escapeHTML(t)}</p>`).join('')}`)}

        ${section('How the voice moves', `<p>${escapeHTML(mentor.tone_progression)}</p>`)}

        ${mentor.why_difficult ? section('Why this passage was difficult', `
          <p>${escapeHTML(mentor.why_difficult)}</p>`) : ''}

        ${mentor.misunderstanding ? section('Why readers misread it', `
          <p>${escapeHTML(mentor.misunderstanding)}</p>`) : ''}

        ${section('The traps, as advice', `<p>${escapeHTML(mentor.traps_summary)}</p>`)}

        ${mentor.reading_lesson ? section('The reading lesson', `
          <div class="mentor__lesson"><p>${escapeHTML(mentor.reading_lesson)}</p></div>`) : ''}

        ${vocab.length ? section('Words worth keeping', `
          <div class="vocab">
            ${vocab.map((v) => `
              <div class="vocab__item">
                <div class="vocab__word">${escapeHTML(v.word)}</div>
                <p class="vocab__use">“${escapeHTML(v.passage_use)}”</p>
                <p class="vocab__meaning">${escapeHTML(v.meaning_here)}</p>
              </div>`).join('')}
          </div>`) : ''}

        ${section('Keep this forever', `
          <blockquote class="mentor__keep">${escapeHTML(mentor.takeaway)}</blockquote>`)}

        ${section('Where life will show you this again', `<p>${escapeHTML(mentor.real_world)}</p>`)}
      </article>

      <div class="mentor-actions">
        <div class="card">
          <h2>What you learned today</h2>
          ${learnedRows.map((r) => `
            <div class="row">
              <div class="row__lead">
                <span class="row__icon" aria-hidden="true">${r.icon}</span>
                <div>
                  <div class="row__label">${escapeHTML(r.label)}</div>
                  <div class="row__hint">${escapeHTML(r.hint)}</div>
                </div>
              </div>
            </div>`).join('')}
        </div>

        ${mentor.reflection_question ? `
          <div class="mentor__reflect-q">
            <span class="mentor__reflect-eyebrow">A question to sit with</span>
            <p>${escapeHTML(mentor.reflection_question)}</p>
          </div>` : ''}

        <cat-reflection></cat-reflection>

        <div class="session-actions">
          ${last
            ? `<a class="btn" href="#/rc/review/${item.meta.id}">Review answers</a>`
            : `<a class="btn" href="#/rc/session/${item.meta.id}">Practice this passage</a>`}
          <a class="btn btn--primary" href="#/rc">Continue the journey</a>
        </div>
      </div>
    </section>
  `;

  /* Reflection: presentation in the component, persistence here (Rule 6). */
  const reflectionEl = outlet.querySelector('cat-reflection');
  reflectionEl.reflection = reflection;
  reflectionEl.addEventListener('cat-reflection-save', async (e) => {
    try {
      const record = await saveReflection(storage, item.meta.id, e.detail);
      reflectionEl.reflection = record;
      cue('reflect'); // a warm confirmation — the reflection is kept
      toast('Kept — it stays on this device.', 'info', { mute: true });
    } catch (err) {
      console.error('[CAT OS]', err);
      toast('Could not save the reflection.', 'error');
    }
  });
}
