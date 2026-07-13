/**
 * garden.js (screen) — the Word Garden: a slow-growing shelf of words
 * genuinely earned, never a full history of everything seen
 * (WORD_DNA_BIBLE §8). Entirely derived from stored sessions; nothing
 * here is a separate stored record.
 */

import { STORES } from '../../../core/storage/storage-adapter.js';
import { loadWDItems } from '../../../core/content-loader/loader.js';
import { deriveWordGarden } from '../logic/garden.js';
import { branchInfo } from '../logic/tree.js';
import { escapeHTML, formatDate } from '../../../core/utils/format.js';

export async function renderWDGarden(outlet, { storage }) {
  outlet.innerHTML = `
    <section class="screen">
      <p class="screen__eyebrow">Word DNA</p>
      <h1>Your Word Garden</h1>
      <div id="wd-garden-body" aria-busy="true">
        <div class="skeleton skeleton--line" style="width: 55%"></div>
        <div class="skeleton"></div><div class="skeleton"></div>
      </div>
    </section>
  `;
  const body = outlet.querySelector('#wd-garden-body');

  let sessions = [];
  try {
    sessions = await storage.getAll(STORES.SESSIONS);
  } catch { /* storage unavailable — the empty state below still renders */ }
  const wdSessions = sessions.filter((s) => s.module === 'wd');
  const itemIds = [...new Set(wdSessions.flatMap((s) => s.item_ids ?? []))];
  const items = await loadWDItems(itemIds);
  const garden = deriveWordGarden(sessions, items);
  body.removeAttribute('aria-busy');

  if (garden.length === 0) {
    body.innerHTML = `
      <div class="empty">
        <div class="empty__glyph" aria-hidden="true">⋔</div>
        <h2>Your garden is waiting</h2>
        <p>Meet a family and apply what you learn to a word you were never taught
        directly. Every word you genuinely earn settles here, quietly.</p>
        <a class="btn btn--primary" href="#/wd">Open the Language Tree</a>
      </div>`;
    return;
  }

  body.innerHTML = `
    <p class="muted" style="margin-top: calc(-1 * var(--space-2)); margin-bottom: var(--space-4)">
      Only words you have genuinely applied, never every word you have merely seen.</p>
    <div class="card">
      ${garden.map((g) => `
        <div class="wd-garden-item">
          <div>
            <div class="wd-garden-item__word">${escapeHTML(g.word)}</div>
            <p class="wd-garden-item__meaning">${escapeHTML(g.meaning)}</p>
          </div>
          <div class="wd-garden-item__source">
            ${escapeHTML(branchInfo(g.unit_kind).label)}<br>
            <a href="#/wd/learn/${escapeHTML(g.unit_id)}">${escapeHTML(formatDate(g.earned_at))}</a>
          </div>
        </div>`).join('')}
    </div>
  `;
}
