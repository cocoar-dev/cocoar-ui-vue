import type { Directive, DirectiveBinding } from 'vue';
import { OverlayScrollbars, ClickScrollPlugin, type PartialOptions } from 'overlayscrollbars';

/**
 * Theme options for the scrollbar appearance.
 */
export type ScrollbarTheme = 'dark' | 'light';

/**
 * Auto-hide behavior for the scrollbar.
 * - 'never': Scrollbars are always visible
 * - 'scroll': Scrollbars hide when not scrolling
 * - 'leave': Scrollbars hide when pointer leaves the element
 * - 'move': Scrollbars hide when pointer stops moving
 */
export type ScrollbarAutoHide = 'never' | 'scroll' | 'leave' | 'move';

/**
 * Overflow behavior for each axis.
 */
export type ScrollbarOverflow = 'hidden' | 'scroll' | 'visible-hidden' | 'visible-scroll';

export interface ScrollbarOptions {
  /** Scrollbar theme. Default: 'dark' */
  theme?: ScrollbarTheme;
  /** Auto-hide behavior. Default: 'leave' */
  autoHide?: ScrollbarAutoHide;
  /** Auto-hide delay in ms. Default: 400 */
  autoHideDelay?: number;
  /** Whether clicking the track scrolls to that position. Default: true */
  clickScroll?: boolean;
  /** Overflow behavior for x-axis. Default: 'scroll' */
  overflowX?: ScrollbarOverflow;
  /** Overflow behavior for y-axis. Default: 'scroll' */
  overflowY?: ScrollbarOverflow;
  /** Whether to defer initialization until browser is idle. Default: true */
  defer?: boolean;
  /** Overscroll behavior. Default: 'auto' */
  overscrollBehavior?: 'auto' | 'contain' | 'none';
}

interface ScrollbarState {
  instance: OverlayScrollbars | null;
  observer: MutationObserver | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
}

// Register the ClickScrollPlugin once
let pluginRegistered = false;

function registerPlugin() {
  if (!pluginRegistered) {
    OverlayScrollbars.plugin(ClickScrollPlugin);
    pluginRegistered = true;
  }
}

function resolveOptions(binding: DirectiveBinding<ScrollbarOptions | boolean>): ScrollbarOptions {
  if (typeof binding.value === 'boolean' || binding.value == null) {
    return {};
  }
  return binding.value;
}

function buildOsOptions(opts: ScrollbarOptions): PartialOptions {
  return {
    scrollbars: {
      theme: `os-theme-${opts.theme ?? 'dark'}`,
      autoHide: opts.autoHide ?? 'leave',
      autoHideDelay: opts.autoHideDelay ?? 400,
      clickScroll: opts.clickScroll ?? true,
    },
    overflow: {
      x: opts.overflowX ?? 'scroll',
      y: opts.overflowY ?? 'scroll',
    },
  };
}

function initScrollbar(el: HTMLElement, opts: ScrollbarOptions): ScrollbarState {
  registerPlugin();

  // Prevent flickering during initialization
  el.setAttribute('data-overlayscrollbars-initialize', '');

  const instance = OverlayScrollbars(el, buildOsOptions(opts));

  // Apply overscroll-behavior if specified
  const overscroll = opts.overscrollBehavior;
  if (overscroll && overscroll !== 'auto') {
    const viewport = instance.elements().viewport;
    if (viewport) {
      viewport.style.overscrollBehavior = overscroll;
    }
  }

  // Observe content changes for dynamic updates
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      instance.update(false);
    }, 50);
  });

  const viewport = instance.elements().viewport;
  if (viewport) {
    observer.observe(viewport, {
      attributes: true,
      attributeFilter: ['class'],
      subtree: true,
    });
  }

  return { instance, observer, debounceTimer };
}

function destroyScrollbar(state: ScrollbarState) {
  state.observer?.disconnect();
  if (state.debounceTimer) clearTimeout(state.debounceTimer);
  state.instance?.destroy();
  state.instance = null;
  state.observer = null;
  state.debounceTimer = null;
}

const stateMap = new WeakMap<HTMLElement, ScrollbarState>();

/**
 * Vue directive that applies custom overlay scrollbars to an element.
 *
 * @example
 * ```html
 * <!-- Basic usage -->
 * <div v-scrollbar>Scrollable content</div>
 *
 * <!-- With options -->
 * <div v-scrollbar="{ theme: 'light', autoHide: 'scroll' }">
 *   Scrollable content
 * </div>
 *
 * <!-- Disabled -->
 * <div v-scrollbar="false">No custom scrollbar</div>
 * ```
 */
export const vScrollbar: Directive<HTMLElement, ScrollbarOptions | boolean> = {
  mounted(el, binding) {
    if (binding.value === false) return;

    const opts = resolveOptions(binding);
    const shouldDefer = opts.defer !== false;

    if (shouldDefer && typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => {
        // Element might have been unmounted during idle wait
        if (!el.isConnected) return;
        stateMap.set(el, initScrollbar(el, opts));
      }, { timeout: 2000 });
    } else {
      stateMap.set(el, initScrollbar(el, opts));
    }
  },

  updated(el, binding) {
    if (binding.value === false) {
      const state = stateMap.get(el);
      if (state) {
        destroyScrollbar(state);
        stateMap.delete(el);
      }
      return;
    }

    const state = stateMap.get(el);
    if (state?.instance) {
      const opts = resolveOptions(binding);
      state.instance.options(buildOsOptions(opts));
    }
  },

  unmounted(el) {
    const state = stateMap.get(el);
    if (state) {
      destroyScrollbar(state);
      stateMap.delete(el);
    }
  },
};

/**
 * Get the OverlayScrollbars instance for an element that has v-scrollbar applied.
 * Useful for programmatic scrolling (scrollTo, scrollToTop, etc.)
 */
export function getScrollbarInstance(el: HTMLElement): OverlayScrollbars | null {
  return stateMap.get(el)?.instance ?? null;
}
