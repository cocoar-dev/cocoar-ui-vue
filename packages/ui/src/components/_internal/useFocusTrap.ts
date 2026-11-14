import { nextTick, onBeforeUnmount, onMounted, type Ref } from 'vue';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled)',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Focus trap of a modal surface (dialog shell, sheet shell). On mount it remembers the
 * focused element and moves focus into the container (`[autofocus]`, else the first
 * focusable element, else the container itself); while mounted Tab and Shift+Tab wrap
 * inside the container; on unmount focus returns to the remembered element.
 */
export function useFocusTrap(containerRef: Ref<HTMLElement | null>) {
  let previouslyFocusedElement: Element | null = null;

  function getFocusableElements(): HTMLElement[] {
    if (!containerRef.value) return [];
    return Array.from(containerRef.value.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((el) => el.offsetParent !== null); // exclude hidden elements
  }

  function setInitialFocus() {
    if (!containerRef.value) return;

    // Prefer element with autofocus attribute
    const autofocusEl = containerRef.value.querySelector<HTMLElement>('[autofocus]');
    if (autofocusEl) {
      autofocusEl.focus();
      return;
    }

    // Otherwise focus first focusable element
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      // Fallback: focus the container itself
      containerRef.value.focus();
    }
  }

  function onKeydown(event: KeyboardEvent) {
    // Focus trap: intercept Tab / Shift+Tab
    if (event.key === 'Tab') {
      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }

  onMounted(() => {
    // Save the currently focused element for restoration on close
    if (typeof document !== 'undefined') {
      previouslyFocusedElement = document.activeElement;
    }

    document.addEventListener('keydown', onKeydown);

    // Move focus into the container
    nextTick(() => {
      setInitialFocus();
    });
  });

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown);

    // Restore focus to the element that was focused before the container mounted
    if (previouslyFocusedElement && previouslyFocusedElement instanceof HTMLElement) {
      nextTick(() => {
        (previouslyFocusedElement as HTMLElement).focus();
      });
    }
  });
}
