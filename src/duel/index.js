/**
 * duel/index.js — the game's routes. The village imports none of this until a
 * player taps Play, so the cold open stays as light as it was.
 *
 *   /duel          a tug of war with the current arena's Muddle
 *   /letters       open waiting letters one by one
 *   /book          the Book of Curiosities
 *   /road          the Laurel Road
 *   /play/:type/:id   one question, on paper, inside its house
 */

export function registerDuel(router, context) {
  router
    .register({ path: '/duel', title: 'Duel', render: (o) => import('./screen.js').then((m) => m.renderDuel(o, context)) })
    .register({ path: '/letters', title: 'Letters', render: (o) => import('./book.js').then((m) => m.renderLetters(o, context)) })
    .register({ path: '/book', title: 'The Book', render: (o) => import('./book.js').then((m) => m.renderBook(o, context)) })
    .register({ path: '/road', title: 'The Laurel Road', render: (o) => import('./road.js').then((m) => m.renderRoad(o, context)) })
    .register({ path: '/play/:type/:id', title: 'Play', render: (o, params) => import('../rooms/room.js').then((m) => m.renderPlay(o, context, params)) });
}
