/**
 * Verbal Bank module — the content engine's four item banks, played
 * through one screen: sentence placement (sp), paragraph completion (pc),
 * the word bank (wb) and arguments (cr).
 *
 * Rule 5: this folder never imports from another module. It composes
 * core/ (loader, the bank engine, the ledger's rest rule, storage) and
 * ui/ (the question card and the explanation), and exposes exactly one
 * function: registerBank(router, context). app.js calls it during boot.
 *
 * Routes owned by this module:
 *   /bank/session/:type/:set — practise a set. `type` is sp | pc | wb | cr;
 *                              `set` is a tier (sp/pc), a bundle id (wb/cr),
 *                              one item id, `kind:<wb kind>`, `band:<cr band>`
 *                              or `next`.
 */

export function registerBank(router, context) {
  router.register({
    path: '/bank/session/:type/:set',
    title: 'Practice',
    // Loaded when a set is opened, never at boot (see the RC module).
    render: (outlet, params) => import('./screens/session.js').then((m) => m.renderBankSession(outlet, context, params)),
  });
}
