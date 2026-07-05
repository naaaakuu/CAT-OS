/**
 * format.js — tiny display formatting helpers. Pure functions only.
 */

/** 83_000 ms → "1m 23s"; 45_000 → "45s". */
export function formatDuration(ms) {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** 0.756 → "76%". */
export function formatPercent(fraction) {
  return `${Math.round(fraction * 100)}%`;
}

/** "2026-07-02T09:15:00.000Z" → "2 Jul 2026" (device locale-ish, stable). */
export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Escape a string for safe interpolation into innerHTML templates.
 *  Content is trusted-ish (our own JSON), but escaping at the render
 *  boundary is non-negotiable hygiene. */
export function escapeHTML(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
