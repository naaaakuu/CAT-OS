/**
 * world/index.js — the world module: the valley home, the places, the
 * vocabulary rounds, the Hearth and the Wilds. app.js calls
 * registerWorld(router, context) during boot; nothing else needs to know
 * these screens exist. The world composes core/ and the other modules'
 * pure logic (recommenders, tiers, the garden scheduler) but never their
 * screens.
 *
 * Routes:
 *   /world                       the valley (home)
 *   /world/place/:slug           inside a place (hearth, rootwood, meadow,
 *                                pond, reading-room, terraces, thicket,
 *                                loom, table, bench, wilds)
 *   /round/:region/:field        a vocabulary round (meadow | pond | thicket)
 */

import { renderWorld } from './screens/world.js';
import { renderPlace } from './screens/place.js';
import { renderRound } from './screens/round.js';
import { initWorldAudio } from './audio.js';

export function registerWorld(router, context) {
  initWorldAudio(context.storage).catch(() => { /* defaults */ });
  router
    .register({ path: '/world', title: 'The valley', render: (outlet) => renderWorld(outlet, context) })
    .register({ path: '/world/place/:slug', title: 'A place', render: (outlet, params) => renderPlace(outlet, context, params) })
    .register({ path: '/round/:region', title: 'A round', render: (outlet, params) => renderRound(outlet, context, params) })
    .register({ path: '/round/:region/:field', title: 'A round', render: (outlet, params) => renderRound(outlet, context, params) });
}

/** The routes that belong to the world's immersive chrome (no header, no
 *  tab bar): the valley, its places, its rounds, and the Rootwood's
 *  sessions and plants, which render on the world's own backdrop. */
export function isWorldRoute(hash) {
  return hash === '#/world' || hash.startsWith('#/world/') || hash.startsWith('#/round/') || hash === '#/garden' || hash.startsWith('#/garden/');
}
