/**
 * `useA11yAnnouncer` — minimal screen-reader live-region helper.
 *
 * Each calendar view instantiates one and renders the returned
 * `message` ref into a `<div role="status" aria-live="polite">`
 * sibling. DnD composables (or any other code) call `announce(...)`
 * to ask the screen reader to read out a confirmation — typically
 * "Event moved to [date]" after a drop, or "Move cancelled" after
 * Escape.
 *
 * The helper alternates appending a zero-width space (U+200B) so
 * the value is never identical across two consecutive calls —
 * without that, two identical-content announcements in a row
 * (e.g. "Move cancelled" twice) wouldn't trigger a screen-reader
 * re-read because `aria-live` only re-announces on text-node
 * changes.
 */

import { ref, type Ref } from 'vue';

const ZWSP = '​';

export interface UseA11yAnnouncerReturn {
  /** Bind in the view's `<div role="status" aria-live="polite">`. */
  message: Ref<string>;
  /** Announce `text`. Subsequent identical announcements still fire. */
  announce: (text: string) => void;
}

export function useA11yAnnouncer(): UseA11yAnnouncerReturn {
  const message = ref('');
  let toggle = false;
  function announce(text: string): void {
    toggle = !toggle;
    message.value = toggle ? `${text}${ZWSP}` : text;
  }
  return { message, announce };
}
