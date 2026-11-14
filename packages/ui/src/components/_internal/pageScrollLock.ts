/**
 * Page scroll lock for modal surfaces that cover the page from below (bottom sheets).
 * Counted: the page is locked from the first `lockPageScroll()` until the last release.
 *
 * - `overflow: hidden` on `<html>` stops wheel, keyboard and scrollbar scrolling of the
 *   document; the scrollbar's width is added to the body's right padding so the page does
 *   not shift sideways.
 * - iOS Safari (before 16) and app shells that scroll an inner container still scroll on
 *   touch, so a non-passive `touchmove` listener cancels every touch move that does not
 *   start inside an overlay (`.coar-overlay-host`): the sheet itself, and selects or
 *   pickers opened from it, keep scrolling.
 *
 * Without `position: fixed` on the body: it would jump the page to the top and back.
 */

let lockCount = 0;
// The inline declarations the lock overwrites, each with its priority. The shorthand alone is
// not enough: it is empty when an app has set only `overflow-y` or gave the axes different
// priorities. Restored in this order, the shorthand first, then the axes.
const HTML_PROPERTIES = ['overflow', 'overflow-x', 'overflow-y'] as const;
type Declaration = { property: string; value: string; priority: string };
let saved: { html: Declaration[]; bodyPaddingRight: Declaration } | null = null;

function read(style: CSSStyleDeclaration, property: string): Declaration {
  return {
    property,
    value: style.getPropertyValue(property),
    priority: style.getPropertyPriority(property),
  };
}

function write(style: CSSStyleDeclaration, { property, value, priority }: Declaration) {
  if (value) style.setProperty(property, value, priority);
  else style.removeProperty(property);
}

function onTouchMove(event: TouchEvent) {
  const target = event.target;
  if (target instanceof Element && target.closest('.coar-overlay-host')) return;
  if (event.cancelable) event.preventDefault();
}

function apply() {
  const html = document.documentElement;
  const body = document.body;
  const scrollbarWidth = window.innerWidth - html.clientWidth;
  saved = {
    html: HTML_PROPERTIES.map((property) => read(html.style, property)),
    bodyPaddingRight: read(body.style, 'padding-right'),
  };
  if (scrollbarWidth > 0) {
    const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${padding + scrollbarWidth}px`;
  }
  for (const property of HTML_PROPERTIES) html.style.setProperty(property, 'hidden');
  document.addEventListener('touchmove', onTouchMove, { passive: false });
}

function restore() {
  document.removeEventListener('touchmove', onTouchMove);
  if (!saved) return;
  for (const declaration of saved.html) write(document.documentElement.style, declaration);
  write(document.body.style, saved.bodyPaddingRight);
  saved = null;
}

/** Locks page scroll and returns the release; calling the release twice is harmless. */
export function lockPageScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (lockCount++ === 0) apply();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--lockCount === 0) restore();
  };
}
