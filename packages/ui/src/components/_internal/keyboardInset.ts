import { readonly, ref } from 'vue';

const inset = ref(0);
export const keyboardInset = readonly(inset);

/**
 * **Preview** — reports the bottom of the current layout viewport covered by a native
 * overlay keyboard, in CSS px. This is occlusion, not the keyboard's physical height:
 * report 0 when the WebView resizes above it, on dismissal, and when detaching the host.
 * Browser visual-viewport occlusion is combined with this inset, never added to it.
 */
export function setCoarKeyboardInset(bottomInset: number): void {
  if (!Number.isFinite(bottomInset) || bottomInset < 0) {
    throw new RangeError('Keyboard inset must be a finite, non-negative number of CSS pixels.');
  }
  inset.value = bottomInset;
}
