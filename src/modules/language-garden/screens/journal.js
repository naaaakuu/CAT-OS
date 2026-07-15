/**
 * journal.js (screen) — the Root Grove's slice of LANGUAGE_GARDEN_BIBLE
 * §11's Journal: "what you can read now" (never empty after day one)
 * and wild sightings (every word actually constructed in a Reach).
 * No word counts, no percentages, no comparisons — a naturalist's
 * field notes, not a dashboard.
 */

import { listLGItems, loadLGItems } from '../../../core/content-loader/loader.js';
import { listGardenSessions } from '../logic/store.js';
import { whatYouCanReadNow, wildSightings } from '../logic/journal.js';
import { JOURNAL_LINES, VALLEY_LINES } from '../../../core/mentor/garden-voice.js';
import { escapeHTML, formatDate } from '../../../core/utils/format.js';

export async function renderJournal(outlet, context) {
  outlet.innerHTML = `
    <section class="screen">
      <div class="session-bar"><a href="#/garden">← ${escapeHTML(VALLEY_LINES.toValley)}</a></div>
      <h1>Journal</h1>
      <div id="lg-journal-body" aria-busy="true">
        <div class="skeleton skeleton--line" style="width: 50%"></div>
        <div class="skeleton"></div><div class="skeleton"></div>
      </div>
    </section>
  `;
  const body = outlet.querySelector('#lg-journal-body');

  let families = [];
  let sessions = [];
  try {
    const registry = await listLGItems();
    const loaded = await loadLGItems(registry.map((i) => i.id));
    families = registry.map((i) => loaded.get(i.id)).filter(Boolean);
    sessions = await listGardenSessions(context.storage);
  } catch { /* the empty states below still render */ }

  const readable = whatYouCanReadNow(families, sessions);
  const sightings = wildSightings(families, sessions);
  body.removeAttribute('aria-busy');

  body.innerHTML = `
    <div class="card">
      <h2>${JOURNAL_LINES.heading}</h2>
      ${readable.length === 0 ? `
        <p class="muted">${JOURNAL_LINES.emptyHeading}</p>
      ` : readable.map((r) => `
        <p class="lg-journal__capability">
          <b>${escapeHTML(r.label)}</b>, ${escapeHTML(r.originLanguage)} ${escapeHTML(r.coreMeaning)}:
          ${escapeHTML(r.words.join(', '))}.
        </p>
      `).join('')}
    </div>

    <div class="card">
      <h2>${JOURNAL_LINES.sightingsHeading}</h2>
      ${sightings.length === 0 ? `
        <p class="muted">${JOURNAL_LINES.emptySightings}</p>
      ` : `
        <div class="lg-journal__sightings">
          ${sightings.map((s) => `
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
      `}
    </div>
  `;
}
