/**
 * Word DNA module — the fifth module island.
 *
 * Rule 5: this folder never imports from another module. It composes
 * core/ (loader, wd engine, mentor, storage interface) and ui/
 * (components), and exposes exactly one function:
 * registerWD(router, context). app.js calls it during boot; nothing
 * else knows this module exists.
 *
 * Routes owned by this module:
 *   /wd              — the Language Tree (first visit: the introduction)
 *   /wd/about        — the introduction, revisitable any time
 *   /wd/session/:set — meet a branch (set = root|prefix|suffix|foreign|cat_vocab)
 *                      or one family (set = wd-NNNN)
 *   /wd/learn/:id    — a family's Learning Page (the full walkthrough)
 *   /wd/garden       — the Word Garden
 */

import { renderWDIntro } from './screens/intro.js';
import { renderWDTree } from './screens/tree.js';
import { renderWDSession } from './screens/session.js';
import { renderWDLearn } from './screens/learn.js';
import { renderWDGarden } from './screens/garden.js';
import { hasSeenWDIntro } from './logic/store.js';

export function registerWD(router, context) {
  router
    .register({
      path: '/wd',
      title: 'Word DNA',
      render: async (outlet) => {
        // The first open shows the introduction, not words — the
        // journey begins with understanding, and only then with meeting words.
        let seen = true;
        try { seen = await hasSeenWDIntro(context.storage); } catch { /* storage down: browse */ }
        if (!seen) {
          renderWDIntro(outlet, context, {
            firstTime: true,
            onBegin: () => renderWDTree(outlet, context),
          });
        } else {
          await renderWDTree(outlet, context);
        }
      },
    })
    .register({
      path: '/wd/about',
      title: 'About Word DNA',
      render: (outlet) => renderWDIntro(outlet, context, { firstTime: false }),
    })
    .register({
      path: '/wd/session/:set',
      title: 'Word DNA practice',
      render: (outlet, params) => renderWDSession(outlet, context, params),
    })
    .register({
      path: '/wd/learn/:id',
      title: 'Learning Page',
      render: (outlet, params) => renderWDLearn(outlet, context, params),
    })
    .register({
      path: '/wd/garden',
      title: 'Word Garden',
      render: (outlet) => renderWDGarden(outlet, context),
    });
}
