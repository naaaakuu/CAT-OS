/**
 * Reading Comprehension module — the first module island.
 *
 * Rule 5: this folder never imports from another module. It composes
 * core/ (loader, engine, storage interface) and ui/ (components), and
 * exposes exactly one function: registerRC(router, context).
 * app.js calls it during boot; nothing else knows this module exists.
 *
 * Routes owned by this module:
 *   /rc              — passage browser
 *   /rc/session/:id  — practice a passage
 *   /rc/review/:id   — review the latest attempt on a passage
 *   /rc/mentor/:id   — the Learning Page (Reading Mentor)
 */

import { renderBrowser } from './screens/browser.js';
import { renderSession } from './screens/session.js';
import { renderReview } from './screens/review.js';
import { renderMentor } from './screens/mentor.js';

export function registerRC(router, context) {
  router
    .register({
      path: '/rc',
      title: 'Reading Comprehension',
      render: (outlet) => renderBrowser(outlet, context),
    })
    .register({
      path: '/rc/session/:id',
      title: 'Practice',
      render: (outlet, params) => renderSession(outlet, context, params),
    })
    .register({
      path: '/rc/review/:id',
      title: 'Review',
      render: (outlet, params) => renderReview(outlet, context, params),
    })
    .register({
      path: '/rc/mentor/:id',
      title: 'Learning Page',
      render: (outlet, params) => renderMentor(outlet, context, params),
    });
}
