/**
 * What the reader may be told before they have read.
 *
 * A passage's title and its theme both state the thing the passage argues.
 * Shown on the briefing, they hand over the answer to any question about the
 * main idea, the author's purpose, or — flatly — the best title. A blind
 * reader sitting this corpus found exactly that: the screen displayed "The
 * True Thing He Said" while asking which of four titles fitted best.
 *
 * So the briefing names the room and the genre, and nothing else: not the
 * title, and not the theme, which in this corpus is a full statement of the
 * thesis. The title comes back on the result screen, where knowing it is a
 * reward rather than a tell.
 *
 * The browser still lists most passages by title — you have to choose one
 * somehow — but a passage that asks you to title it is listed by its subject.
 */
const A = new Set('aeiou');
const spoken = (genre) => String(genre ?? 'ideas').replace(/-/g, ' ');

/** Does this passage ask the reader to choose its title? */
export function asksItsOwnTitle(x) {
  const types = x?.question_types ?? x?.meta?.question_types
    ?? (x?.questions ?? []).map((q) => q.type ?? q.question_type);
  return (types ?? []).includes('title_selection');
}

/** The name to show before the passage has been read. */
export function displayTitle(x) {
  if (!asksItsOwnTitle(x)) return x?.title ?? x?.passage?.title ?? x?.meta?.title ?? '';
  const g = spoken(x?.genre ?? x?.meta?.genre);
  return `${A.has(g[0]) ? 'An' : 'A'} untitled passage on ${g}`;
}
