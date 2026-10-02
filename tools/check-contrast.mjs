/**
 * check-contrast.mjs — WCAG 2.1 contrast over the design tokens.
 *
 * The palette is the one part of the interface no screenshot review catches:
 * a caption colour that fails AA fails it in 46 places at once, quietly, and
 * only on the smallest type where it matters most. This computes the real
 * relative-luminance ratios for the foreground/background pairings the app
 * actually ships, in BOTH themes, and fails on anything under its threshold.
 *
 * Run: node tools/check-contrast.mjs
 * Exit code 1 if any required pairing fails. verify.mjs §22 calls this.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/* ---------------------------------------------------------------- */
/* Colour maths                                                      */
/* ---------------------------------------------------------------- */

export function hexToRgb(hex) {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function luminance([r, g, b]) {
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(fg, bg) {
  const a = luminance(fg), b = luminance(bg);
  const hi = Math.max(a, b), lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/** Flatten a translucent foreground over an opaque backdrop. */
export function over([r, g, b, a], bg) {
  return [r, g, b].map((c, i) => Math.round(c * a + bg[i] * (1 - a)));
}

/* ---------------------------------------------------------------- */
/* Token extraction                                                  */
/* ---------------------------------------------------------------- */

/**
 * Pull `--name: #hex;` declarations out of a CSS block.
 * `scope` picks which block: 'root' = the first :root{...}, 'dark' = the
 * prefers-color-scheme block, 'forced' = :root[data-theme="dark"].
 */
function tokensFrom(css, scope) {
  let block = css;
  if (scope === 'dark') {
    const m = css.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*?)\n\s*\}\s*\n/);
    block = m ? m[1] : '';
  } else if (scope === 'forced') {
    const m = css.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\}/);
    block = m ? m[1] : '';
  } else {
    const m = css.match(/:root\s*\{([\s\S]*?)\}/);
    block = m ? m[1] : '';
  }
  const out = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) out[m[1]] = m[2];
  return out;
}

/* ---------------------------------------------------------------- */
/* The pairings the app actually ships                               */
/* ---------------------------------------------------------------- */

/* Each: [label, foreground, background, minimum].
   4.5 = body/caption text (WCAG AA normal). 3.0 = large text (>=24px, or
   >=18.66px bold) and UI component boundaries. Colours may be a token name
   or a literal hex; [hex, alpha] means "composited over the background". */
const PAIRS = (t) => [
  ['body text on the desk',            t['--color-ink'],     t['--color-bg'],        4.5],
  ['body text on a card',              t['--color-ink'],     t['--color-surface'],   4.5],
  ['secondary text on the desk',       t['--color-ink-2'],   t['--color-bg'],        4.5],
  ['secondary text on a card',         t['--color-ink-2'],   t['--color-surface'],   4.5],
  ['captions/hints on the desk',       t['--color-ink-3'],   t['--color-bg'],        4.5],
  ['captions/hints on a card',         t['--color-ink-3'],   t['--color-surface'],   4.5],
  ['captions/hints in a well',         t['--color-ink-3'],   t['--color-surface-2'], 4.5],
  ['captions/hints in a deep well',    t['--color-ink-3'],   t['--color-surface-3'], 4.5],
  ['a primary action\'s label',        t['--color-accent-ink'], t['--color-accent'], 4.5],
  ['accent text on a card',            t['--color-accent'],  t['--color-surface'],   4.5],
];

/* The village's honey button (making a treasure) is a literal fill in
   home.css, so its label is read from the rule itself. */
const VILLAGE_PAIRS = (css, t) => {
  const rule = css.match(/\.cw-make\s*\{([^}]*)\}/);
  const color = rule?.[1].match(/(?:^|;|\s)color\s*:\s*(#[0-9a-fA-F]{6})/)?.[1] ?? null;
  return [['the Make button on honey', color, t['--honey'], 4.5]];
};

/* ---------------------------------------------------------------- */

function run() {
  const tokensCss = read('src/ui/styles/tokens.css');
  const villageCss = read('src/ui/styles/home.css');

  const themes = [
    ['light', tokensFrom(tokensCss, 'root')],
    ['dark (system)', { ...tokensFrom(tokensCss, 'root'), ...tokensFrom(tokensCss, 'dark') }],
    ['dark (chosen)', { ...tokensFrom(tokensCss, 'root'), ...tokensFrom(tokensCss, 'forced') }],
  ];

  const failures = [];
  const lines = [];

  for (const [name, t] of themes) {
    for (const [label, fgRaw, bgRaw, min] of PAIRS(t)) {
      if (!fgRaw || !bgRaw) { failures.push(`${name}: ${label} — token missing`); continue; }
      const fg = hexToRgb(fgRaw), bg = hexToRgb(bgRaw);
      if (!fg || !bg) { failures.push(`${name}: ${label} — unparseable colour`); continue; }
      const r = contrast(fg, bg);
      const ok = r >= min;
      lines.push(`    ${ok ? '·' : '✗'} ${name.padEnd(14)} ${label.padEnd(30)} ${fgRaw} on ${bgRaw}  ${r.toFixed(2)}:1 (need ${min})`);
      if (!ok) failures.push(`${name}: ${label} is ${r.toFixed(2)}:1, needs ${min}:1 (${fgRaw} on ${bgRaw})`);
    }
  }

  for (const [label, fgRaw, bgRaw, min] of VILLAGE_PAIRS(villageCss, tokensFrom(tokensCss, 'root'))) {
    if (!fgRaw || !bgRaw) { failures.push(`village: ${label} — could not read the rule`); continue; }
    const fg = hexToRgb(fgRaw), bg = hexToRgb(bgRaw);
    if (!fg || !bg) { failures.push(`village: ${label} — unparseable colour`); continue; }
    const r = contrast(fg, bg);
    const ok = r >= min;
    lines.push(`    ${ok ? '·' : '✗'} ${'village'.padEnd(14)} ${label.padEnd(30)} ${fgRaw} on ${bgRaw}  ${r.toFixed(2)}:1 (need ${min})`);
    if (!ok) failures.push(`village: ${label} is ${r.toFixed(2)}:1, needs ${min}:1 (${fgRaw} on ${bgRaw})`);
  }

  return { failures, lines };
}

export function checkContrast() { return run(); }

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { failures, lines } = run();
  for (const l of lines) console.log(l);
  if (failures.length) {
    console.log(`\n${failures.length} contrast failure(s):`);
    for (const f of failures) console.log('  ✗ ' + f);
    process.exit(1);
  }
  console.log(`\n✓ ${lines.length} pairings all meet WCAG AA.`);
}
