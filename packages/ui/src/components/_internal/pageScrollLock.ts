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
let saved: { htmlOverflow: string; bodyPaddingRight: string } | null = null;

function onTouchMove(event: TouchEvent) {
  const target = event.target;
  if (target instanceof Element && target.closest('.coar-overlay-host')) return;
  if (event.cancelable) event.preventDefault();
}

function apply() {
  const html = document.documentElement;
  const body = document.body;
  const scrollbarWidth = window.innerWidth - html.clientWidth;
  saved = { htmlOverflow: html.style.overflow, bodyPaddingRight: body.style.paddingRight };
  if (scrollbarWidth > 0) {
    const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${padding + scrollbarWidth}px`;
  }
  html.style.overflow = 'hidden';
  document.addEventListener('touchmove', onTouchMove, { passive: false });
}

function restore() {
  document.removeEventListener('touchmove', onTouchMove);
  if (!saved) return;
  document.documentElement.style.overflow = saved.htmlOverflow;
  document.body.style.paddingRight = saved.bodyPaddingRight;
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
