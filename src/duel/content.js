/**
 * content.js — the duel's three packs: what the Muddles say (`muddles`), the
 * pompous lines to decode (`decode`) and the cards a letter can hold
 * (`curios`). Each is one static JSON file, loaded once and kept. A pack that
 * cannot load never stops a duel: the game plays on with what it has.
 */

const cache = new Map();

function pack(name) {
  if (!cache.has(name)) {
    cache.set(name, fetch(`./content/duel/${name}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((data) => {
      if (!data) cache.delete(name); // a failed read is retried next time
      return data;
    }));
  }
  return cache.get(name);
}

export const loadDecode = async () => (await pack('decode'))?.items ?? [];

export const loadCurios = async () => {
  const p = await pack('curios');
  return { chapters: p?.chapters ?? [], cards: p?.cards ?? [] };
};

/* A Muddle always has something to say, even if the pack did not arrive. */
const FALLBACK = { enter: ['Give me that rope.'], hit: ['Oof.'], gloat: ['Ha!'], low: ['Not the pond!'], win: ['Mine.'], lose: ['Glub.'] };

export async function loadMuddles() {
  const p = await pack('muddles');
  const map = new Map((p?.muddles ?? []).map((m) => [m.id, m]));
  return { get: (id) => map.get(id) ?? { id, name: 'A Muddle', title: '', habit: '', lesson: '', lines: FALLBACK } };
}

/** Deal lines so the same one does not come back until the others have been said. */
export function liner(muddle, seed = Math.random()) {
  const decks = new Map();
  let s = Math.floor(seed * 1e9) || 1;
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  return (kind) => {
    const all = muddle.lines?.[kind] ?? FALLBACK[kind] ?? [];
    if (!all.length) return '';
    let deck = decks.get(kind);
    if (!deck || !deck.length) {
      deck = [...all];
      for (let i = deck.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      decks.set(kind, deck);
    }
    return deck.pop();
  };
}
