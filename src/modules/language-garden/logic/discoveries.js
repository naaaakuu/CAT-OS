/**
 * discoveries.js — the Discovery system as data (LANGUAGE_GARDEN_BIBLE §9;
 * Roadmap 5.1; 0.16.0). Pure logic, no DOM, no storage: the catalogue of
 * things that exist in the world whether or not anyone looks, and one
 * function that answers "which of them are in front of the learner right
 * now." The recording (one quiet record per discovery, ever) lives in
 * logic/store.js; the Field Guide that lists them lives in the Journal.
 *
 * Every entry obeys §9.2's six rules, and two are worth restating here
 * because they are the ones a future hand is most likely to bend:
 *
 *  - **It exists in the world, not in a database of behaviour.** Every
 *    condition below is a TRUE STATE the scene is already showing — a
 *    creature that was drawn, weather that is falling, an hour that has
 *    come. Nothing here reads a count of sessions or a streak. "You saw
 *    a heron" is a discovery; "you completed 50 sessions" never is.
 *  - **It is never announced in advance.** The Field Guide shows only
 *    what has been seen. No silhouettes, no fractions, no "37 of 200."
 *    The closing line of the Guide states one fact about the world —
 *    how many kinds of creature live in the valley — and nothing about
 *    the learner's progress toward them (§9.4, P64).
 *
 * Finding one changes nothing mechanical (§9.2 rule 5). The reward for
 * finding it is having found it.
 */

/** The kinds §9.3 names. `creature` entries are counted for the Field
 *  Guide's one closing fact (§9.4). */
export const DISCOVERY_KINDS = Object.freeze(['creature', 'weather', 'plant', 'place', 'night', 'season', 'language']);

/**
 * The launch catalogue: every discovery the shipped world can actually
 * show (§9.5, restricted to what THE WORLD's built scenes draw today —
 * a creature the world cannot yet show is not listed, so the Guide never
 * promises what the valley cannot keep). `line` is the Journal's own
 * one-line entry: no exclamation marks, no praise, no numbers (P77,
 * P75, §9.5). `when(s)` reads the scene state assembled by the screen
 * that is showing it.
 */
export const DISCOVERIES = Object.freeze([
  // ---- Creatures (Part 9.3's roster, where the world draws them) ----
  { id: 'butterfly-white', kind: 'creature', line: 'A white butterfly, over the Meadow.', when: (s) => s.visitor === 'butterfly-white' || s.ambient === 'butterfly' },
  { id: 'butterfly-dark', kind: 'creature', line: 'A dark butterfly at the rim of the Thicket, a different creature entirely.', when: (s) => s.visitor === 'butterfly-dark' },
  { id: 'bird-crossing', kind: 'creature', line: 'A bird crossing the valley, high, and gone.', when: (s) => s.visitor === 'bird' || s.ambient === 'bird' },
  { id: 'firefly', kind: 'creature', line: 'Fireflies in the Rootwood after dark.', when: (s) => s.visitor === 'firefly' || s.ambient === 'firefly' || (s.scene === 'rootwood' && s.time === 'night') },
  { id: 'firefly-landmark', kind: 'creature', line: 'Fireflies gathering at a Landmark tree.', when: (s) => s.scene === 'overlook' && s.time === 'night' && s.hasLandmark },
  { id: 'moth', kind: 'creature', line: 'A moth at night, near the pale flowers.', when: (s) => s.visitor === 'moth' },
  { id: 'snail', kind: 'creature', line: 'A snail on the stones, after rain.', when: (s) => s.visitor === 'snail' },
  { id: 'frog', kind: 'creature', line: 'A frog at the edge of the pond.', when: (s) => s.visitor === 'frog' },
  { id: 'deer', kind: 'creature', line: 'Deer at the treeline, at dawn.', when: (s) => s.visitor === 'deer' },
  { id: 'fox', kind: 'creature', line: 'A fox crossing the near floor, unhurried.', when: (s) => s.visitor === 'fox' },
  { id: 'heron', kind: 'creature', line: 'The heron at the Mirror Pond.', when: (s) => s.visitor === 'heron' },
  { id: 'owl', kind: 'creature', line: 'The owl in the Rootwood, at night.', when: (s) => s.visitor === 'owl' },
  { id: 'hearth-cat', kind: 'creature', line: 'A cat asleep at the Hearth. It did not look up.', when: (s) => s.cat === true },
  { id: 'nesting-bird', kind: 'creature', line: 'A bird nesting in an Ancient tree.', when: (s) => s.hasLandmark },

  // ---- Weather moments (§9.5) ----
  { id: 'rain', kind: 'weather', line: 'Rain across the whole valley.', when: (s) => s.scene === 'overlook' && s.weather === 'rain' },
  { id: 'rain-in-wood', kind: 'weather', line: 'Rain, seen from inside the Rootwood, which sounds different.', when: (s) => s.scene === 'rootwood' && s.weather === 'rain' },
  { id: 'fog-dawn', kind: 'weather', line: 'Fog in the hollows at dawn.', when: (s) => s.weather === 'fog' && s.time === 'dawn' },
  { id: 'fog', kind: 'weather', line: 'Fog so thick the ridge disappears.', when: (s) => s.scene === 'overlook' && s.weather === 'fog' },
  { id: 'snow', kind: 'weather', line: 'Snow falling on the valley.', when: (s) => s.weather === 'snow' },
  { id: 'wind-meadow', kind: 'weather', line: 'Wind moving across the whole Meadow at once.', when: (s) => s.scene === 'overlook' && s.weather === 'wind' },
  { id: 'green-seam', kind: 'weather', line: 'The sky going green before dusk.', when: (s) => s.scene === 'overlook' && s.time === 'dusk' },
  { id: 'dawn-light', kind: 'weather', line: 'Dawn light on the far ridge.', when: (s) => s.scene === 'overlook' && s.time === 'dawn' },

  // ---- Plant moments (§9.5) ----
  { id: 'first-sprout', kind: 'plant', line: 'Your first sprout.', when: (s) => s.stages?.has('sprout') || s.stages?.has('young') || s.stages?.has('in_leaf') || s.stages?.has('mature') || s.stages?.has('ancient') },
  { id: 'first-leaf', kind: 'plant', line: 'Your first leaf.', when: (s) => s.stages?.has('in_leaf') || s.stages?.has('mature') || s.stages?.has('ancient') },
  { id: 'first-flower', kind: 'plant', line: 'Your first flower.', when: (s) => s.stages?.has('mature') || s.stages?.has('ancient') },
  { id: 'first-ancient', kind: 'plant', line: 'Your first Ancient tree, on the horizon.', when: (s) => s.stages?.has('ancient') },
  { id: 'first-landmark', kind: 'plant', line: 'Your first Landmark.', when: (s) => s.hasLandmark },
  { id: 'buds-on-bare', kind: 'plant', line: 'Buds on a bare plant, waiting.', when: (s) => s.dues?.has('bare') },
  { id: 'leaves-turning', kind: 'plant', line: 'Leaves turning, and a plant asking to be revisited.', when: (s) => s.dues?.has('gold') },
  { id: 'moss-stone', kind: 'plant', line: 'Moss on a stone.', when: (s) => s.tierRank >= 1 },
  { id: 'moss-thick', kind: 'plant', line: 'Moss on a stone, thick, which takes a long time.', when: (s) => s.tierRank >= 4 },
  { id: 'blossom', kind: 'plant', line: 'Blossom on the Orchard trees in spring.', when: (s) => s.scene === 'overlook' && s.season === 'spring' },

  // ---- Hidden places (§9.5, Part 7's authored props) ----
  { id: 'stepping-stones', kind: 'place', line: 'Stepping stones where the path meets the stream.', when: (s) => s.props?.has('stepping-stones') },
  { id: 'fallen-log', kind: 'place', line: 'A fallen log at the edge of the Rootwood, moss on its north side.', when: (s) => s.props?.has('fallen-log') },
  { id: 'sitting-stone', kind: 'place', line: 'A stone on the first bend of the path that has clearly become a sitting-stone.', when: (s) => s.props?.has('sitting-stone') },
  { id: 'hollow-log', kind: 'place', line: 'A hollow log a mouse uses.', when: (s) => s.props?.has('hollow-log') },
  { id: 'spring-seam', kind: 'place', line: 'The spring where the stream begins.', when: (s) => s.props?.has('spring-seam') },
  { id: 'old-stump', kind: 'place', line: 'The old stump, and the carved stone beside it.', when: (s) => s.props?.has('old-stump') || s.props?.has('carved-stone') },
  { id: 'boundary-fence', kind: 'place', line: 'The boundary fence at the edge of the Wilds, leaning.', when: (s) => s.scene === 'overlook' },
  { id: 'the-bridge', kind: 'place', line: 'What is under the bridge.', when: (s) => s.scene === 'overlook' && s.streamBand === 'high' },
  { id: 'rootwood-highest', kind: 'place', line: 'The highest point of the Rootwood, where the great trunks leave the frame.', when: (s) => s.scene === 'rootwood' },

  // ---- Night things (§9.5) ----
  { id: 'night-first', kind: 'night', line: 'The valley at night, for the first time.', when: (s) => s.scene === 'overlook' && s.time === 'night' },
  { id: 'moon-water', kind: 'night', line: 'Moonlight on the water.', when: (s) => s.scene === 'overlook' && s.time === 'night' && s.weather !== 'fog' },
  { id: 'stars', kind: 'night', line: 'Stars, on a clear night.', when: (s) => s.time === 'night' && s.weather === 'clear' },
  { id: 'fog-night', kind: 'night', line: 'Fog at night, which is the strangest the valley ever looks.', when: (s) => s.time === 'night' && s.weather === 'fog' },
  { id: 'snow-night', kind: 'night', line: 'Snow at night.', when: (s) => s.time === 'night' && s.weather === 'snow' },
  { id: 'window-warm', kind: 'night', line: 'The window at the Hearth, warm, late.', when: (s) => s.scene === 'overlook' && s.time === 'night' },
  { id: 'wood-night', kind: 'night', line: 'The Rootwood after dark, moon-silver on the canopy.', when: (s) => s.scene === 'rootwood' && s.time === 'night' },

  // ---- Seasonal things (§9.5; four per season) ----
  { id: 'spring-valley', kind: 'season', line: 'Spring: the valley fresh, the stream running high.', when: (s) => s.scene === 'overlook' && s.season === 'spring' },
  { id: 'summer-haze', kind: 'season', line: 'Summer: the longest light, snow gone from the peaks.', when: (s) => s.scene === 'overlook' && s.season === 'summer' },
  { id: 'autumn-turning', kind: 'season', line: 'Autumn: the whole Rootwood turning gold.', when: (s) => s.scene === 'overlook' && s.season === 'autumn' },
  { id: 'winter-bare', kind: 'season', line: 'Winter: the bare Rootwood, and snow on the wall.', when: (s) => s.scene === 'overlook' && s.season === 'winter' },
  { id: 'wood-winter', kind: 'season', line: 'The Rootwood in winter, bare branches under an evergreen canopy.', when: (s) => s.scene === 'rootwood' && s.season === 'winter' },
  { id: 'wood-autumn', kind: 'season', line: 'The Rootwood in autumn, light the colour of the leaves.', when: (s) => s.scene === 'rootwood' && s.season === 'autumn' },
  { id: 'mushrooms', kind: 'season', line: 'Mushrooms under the Rootwood eaves, after rain.', when: (s) => s.props?.has('mushroom-cluster') },
  { id: 'dew-web', kind: 'season', line: 'A dew-web in the Thicket at dawn.', when: (s) => s.props?.has('dew-web') },

  // ---- Language moments (§9.5): the only discoveries that touch learning ----
  { id: 'first-wild-sighting', kind: 'language', line: 'Your first wild sighting: a garden word, met in a real passage.', when: (s) => s.sightings > 0 },
  { id: 'first-reach', kind: 'language', line: 'A word nobody taught you, built from its parts.', when: (s) => s.reachWords > 0 },
]);

const BY_ID = new Map(DISCOVERIES.map((d) => [d.id, d]));

/** The catalogue entry for one id, or undefined. */
export function discoveryById(id) { return BY_ID.get(id); }

/** How many kinds of creature the valley can show today — the Field
 *  Guide's one closing fact (§9.4), counted from the catalogue itself so
 *  it can never drift from what the world actually draws. */
export function creatureKindCount() {
  return DISCOVERIES.filter((d) => d.kind === 'creature').length;
}

/**
 * Which discoveries are in front of the learner right now, given a scene
 * state assembled by the screen drawing it. Pure; order is the catalogue's.
 * @param {{scene: 'overlook'|'rootwood', time, season, weather, visitor,
 *   ambient, cat, hasLandmark, stages: Set, dues: Set, tierRank, props: Set,
 *   streamBand, sightings, reachWords}} state
 */
export function visibleDiscoveries(state = {}) {
  const s = { stages: new Set(), dues: new Set(), props: new Set(), sightings: 0, reachWords: 0, tierRank: 0, ...state };
  return DISCOVERIES.filter((d) => { try { return d.when(s) === true; } catch { return false; } }).map((d) => d.id);
}
