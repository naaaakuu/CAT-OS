/** Keep keyboard and screen-reader position with a lesson as it changes. */
export function focusContent(element, { scroll = false } = {}) {
  if (!element) return;
  element.setAttribute('tabindex', '-1');
  requestAnimationFrame(() => {
    if (!element.isConnected) return;
    if (scroll) element.scrollIntoView({ block: 'start' });
    element.focus({ preventScroll: true });
  });
}
