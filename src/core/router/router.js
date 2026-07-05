/**
 * router.js — a small hash-based client router.
 *
 * Why hashes (from TECH_STACK.md): `#/home` needs zero server rewrite
 * rules, works identically on GitHub Pages / Netlify / a local file,
 * and keeps working offline. History-API routing would need per-host
 * configuration — complexity with no payoff for this app.
 *
 * Contract:
 * - A route is `{ path, title, render }` where `render(outlet, params)`
 *   fills the outlet element. `render` may be async.
 * - Paths support one-level params: '#/practice/:id'.
 * - Unknown hashes render the registered 'notFound' route.
 */

export class Router {
  #routes = [];
  #notFound = null;
  #outlet;
  #onNavigate;

  /**
   * @param {HTMLElement} outlet element routes render into
   * @param {(route: object) => void} [onNavigate] called after each render
   *        (the shell uses this to update the nav and move focus)
   */
  constructor(outlet, onNavigate) {
    this.#outlet = outlet;
    this.#onNavigate = onNavigate;
  }

  register(route) {
    this.#routes.push({ ...route, segments: split(route.path) });
    return this;
  }

  registerNotFound(route) {
    this.#notFound = route;
    return this;
  }

  /** Start listening and render the current hash (default: first route). */
  start() {
    window.addEventListener('hashchange', () => this.#render());
    if (!location.hash) {
      location.replace(`#${this.#routes[0].path}`);
    } else {
      this.#render();
    }
  }

  /** Programmatic navigation, e.g. router.go('/settings'). */
  go(path) { location.hash = `#${path}`; }

  async #render() {
    const current = split(location.hash.slice(1));
    let matched = this.#notFound;
    let params = {};

    for (const route of this.#routes) {
      const p = match(route.segments, current);
      if (p) { matched = route; params = p; break; }
    }
    if (!matched) return;

    document.title = matched.title ? `${matched.title} — CAT OS` : 'CAT OS';
    this.#outlet.innerHTML = '';
    await matched.render(this.#outlet, params);
    this.#outlet.focus({ preventScroll: true }); // a11y: move focus to new screen
    window.scrollTo(0, 0);
    this.#onNavigate?.(matched);
  }
}

/** '#/practice/rc-0001' → ['practice', 'rc-0001'] */
function split(path) {
  return path.replace(/^#?\//, '').split('/').filter(Boolean);
}

/** Match URL segments against route segments; ':name' captures a param.
 *  @returns {object|null} params, or null if no match. */
function match(routeSegs, urlSegs) {
  if (routeSegs.length !== urlSegs.length) return null;
  const params = {};
  for (let i = 0; i < routeSegs.length; i += 1) {
    if (routeSegs[i].startsWith(':')) {
      params[routeSegs[i].slice(1)] = decodeURIComponent(urlSegs[i]);
    } else if (routeSegs[i] !== urlSegs[i]) {
      return null;
    }
  }
  return params;
}
