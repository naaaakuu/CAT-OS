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
        <a href="#/rc">← Library</a>
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
            <p style="margin-top: var(--space-3)">${escapeHTML(mentor.main_idea)}</p>
          </details>`)}

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

        ${mentor.misunderstanding ? section('Why readers misread it', `
          <p>${escapeHTML(mentor.misunderstanding)}</p>`) : ''}

        ${section('The traps, as advice', `<p>${escapeHTML(mentor.traps_summary)}</p>`)}

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
      cue('tap');
      toast('Kept — it stays on this device.');
    } catch (err) {
      console.error('[CAT OS]', err);
      toast('Could not save the reflection.', 'error');
    }
  });
}
