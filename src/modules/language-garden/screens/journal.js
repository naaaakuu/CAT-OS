/**
 * journal.js (screen) — the Garden's slice of LANGUAGE_GARDEN_BIBLE
 * §16.6's Journal: "what you can read now" (never empty after day one),
 * Sightings (grown words met again in real reading — §19.2's promise,
 * kept in front of the learner's eyes), and the words constructed in a
 * Reach. No word counts, no percentages, no comparisons — a
 * naturalist's field notes, not a dashboard.
 */

import { listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { listGardenSessions, listGardenSightings } from '../logic/store.js';
import { whatYouCanReadNow, wildSightings, seasonsTended, weatherRecord } from '../logic/journal.js';
import { JOURNAL_LINES, VALLEY_LINES } from '../../../core/mentor/garden-voice.js';
import { escapeHTML, formatDate } from '../../../core/utils/format.js';

/* The Weather Record's marks (§8.6). Small drawn glyphs, not emoji, so
   they read the same on every device and stay quiet ink in the field
   journal — shape carries the weather, never colour (a record, not a
   dashboard). All stroke currentColor; the muted tint lives in CSS. */
const WEATHER_MARKS = Object.freeze({
  sun: '<circle cx="12" cy="12" r="4.2"/><g stroke-linecap="round"><path d="M12 3v2.4"/><path d="M12 18.6V21"/><path d="M3 12h2.4"/><path d="M18.6 12H21"/><path d="M5.6 5.6l1.7 1.7"/><path d="M16.7 16.7l1.7 1.7"/><path d="M18.4 5.6l-1.7 1.7"/><path d="M7.3 16.7l-1.7 1.7"/></g>',
  'clear-night': '<path d="M17.5 14.5A6.2 6.2 0 0 1 9.7 6.7a6.2 6.2 0 1 0 7.8 7.8z"/><path d="M18.4 4.6l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5L16.4 6.6l1.5-.5z" stroke-linejoin="round"/>',
  rain: '<path d="M7.5 13.5a3.5 3.5 0 0 1 .3-6.99 4.6 4.6 0 0 1 8.85 1.2A3.2 3.2 0 0 1 16.3 13.5z" stroke-linejoin="round"/><g stroke-linecap="round"><path d="M9 16l-.9 2.2"/><path d="M12.4 16l-.9 2.2"/><path d="M15.8 16l-.9 2.2"/></g>',
  fog: '<g stroke-linecap="round"><path d="M4.5 8.5h13"/><path d="M6 12h12"/><path d="M4.5 15.5h11"/><path d="M8 19h9"/></g>',
  wind: '<g stroke-linecap="round"><path d="M3.5 9h11a2.2 2.2 0 1 0-2.2-2.2"/><path d="M3.5 13.5h14a2.4 2.4 0 1 1-2.4 2.4"/></g>',
  snow: '<g stroke-linecap="round"><path d="M12 3.5v17"/><path d="M4.6 7.75l14.8 8.5"/><path d="M19.4 7.75L4.6 16.25"/></g>',
});

function weatherMarkSVG(kind) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${WEATHER_MARKS[kind] ?? WEATHER_MARKS.sun}</svg>`;
}

export async function renderJournal(outlet, context) {
  // No skeleton (Visual Guide 24.1): the data is local; the page simply
  // appears, complete, like turning to a page of field notes.
  outlet.innerHTML = '';

  let families = [];
  let sessions = [];
  let sightings = [];
  try {
    const registry = await listLGItems();
    const loaded = await loadLGItems(registry.map((i) => i.id));
    families = registry.map((i) => loaded.get(i.id)).filter(Boolean);
    sessions = await listGardenSessions(context.storage);
    sightings = await listGardenSightings(context.storage);
  } catch { /* the page-one empty state below still renders */ }

  const readable = whatYouCanReadNow(families, sessions);
  const reached = wildSightings(families, sessions);
  const seasons = seasonsTended(sessions);
  const weather = weatherRecord(sessions);

  // A journal never shows its blank pages (Phase 4.9 P4, Bible §16.6
  // "never empty after day one", Guide 22.2 "every state is designed"):
  // a section with nothing real to say does not appear at all. Page one
  // alone keeps its designed first-day line; Sightings, the Reach record,
  // and the Weather Record wait, unannounced, until they hold something.
  const sightingsCard = sightings.length === 0 ? '' : `
    <div class="card">
      <h2>${JOURNAL_LINES.sightingsHeading}</h2>
      <div class="lg-journal__sightings">
        ${sightings.map((s) => `
          <div class="row">
            <div class="row__lead">
              <span class="row__icon" aria-hidden="true">☉</span>
              <div>
                <div class="row__label">${escapeHTML(s.word)}</div>
                <div class="row__hint">${escapeHTML(JOURNAL_LINES.sightingLine(s.source?.title ?? ''))} · ${escapeHTML(formatDate(s.sighted_at))}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;

  const reachCard = reached.length === 0 ? '' : `
    <div class="card">
      <h2>${JOURNAL_LINES.reachHeading}</h2>
      <div class="lg-journal__sightings">
        ${reached.map((s) => `
          <div class="row">
            <div class="row__lead">
              <span class="row__icon" aria-hidden="true">⚘</span>
              <div>
                <div class="row__label">${escapeHTML(s.word)}</div>
                <div class="row__hint">from ${escapeHTML(s.familyLabel)} · ${escapeHTML(formatDate(s.date))}</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;

  const weatherCard = weather.length === 0 ? '' : `
    <div class="card">
      <h2>${JOURNAL_LINES.weatherHeading}</h2>
      <div class="lg-wrecord">
        ${weather.map((month) => `
          <div class="lg-wrecord__month">
            <p class="lg-wrecord__month-label">${escapeHTML(month.monthLabel)}</p>
            <div class="lg-wrecord__days">
              ${month.days.map((d) => {
                const name = JOURNAL_LINES.weatherNames[d.mark] ?? '';
                const label = JOURNAL_LINES.weatherDayLabel(d.day, month.monthLabel, name);
                return `<span class="lg-wrecord__day lg-wrecord__day--${d.mark}" role="img" aria-label="${escapeHTML(label)}" title="${escapeHTML(label)}">${weatherMarkSVG(d.mark)}</span>`;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;

  outlet.innerHTML = `
    <section class="screen lg-journal">
      <div class="session-bar"><a href="#/garden">← ${escapeHTML(VALLEY_LINES.toValley)}</a></div>
      <h1>Journal</h1>
      <div class="card">
        ${seasons > 0 ? `<p class="lg-journal__seasons">${escapeHTML(JOURNAL_LINES.seasonsTended(seasons))}</p>` : ''}
        <h2>${JOURNAL_LINES.heading}</h2>
        ${readable.length === 0 ? `
          <p class="muted">${JOURNAL_LINES.emptyHeading}</p>
        ` : readable.map((r) => `
          <p class="lg-journal__capability">
            <span class="lg-journal__root">${escapeHTML(r.label)}</span>, ${escapeHTML(r.originLanguage)} ${escapeHTML(r.coreMeaning)}:
            ${escapeHTML(r.words.join(', '))}.
          </p>
        `).join('')}
      </div>
      ${sightingsCard}
      ${reachCard}
      ${weatherCard}
    </section>
  `;
}
