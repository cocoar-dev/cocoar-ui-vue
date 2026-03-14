import { onBeforeUnmount, ref, watch, type Ref } from 'vue';
import {
  computeOverlayCoordinates,
  getScrollParents,
  getViewportRect,
} from '../overlay/overlay-position';
import type { Placement, PositionSpec } from '../overlay/overlay-types';

export interface UseSelectDropdownOptions {
  isOpen: Ref<boolean>;
  triggerEl: Ref<HTMLElement | null | undefined>;
  dropdownEl: Ref<HTMLElement | null | undefined>;
}

/**
 * Composable that manages positioning for a select dropdown
 * teleported to `<body>`. Uses the overlay positioning engine
 * for viewport-aware placement with flip support.
 */
export function useSelectDropdown(opts: UseSelectDropdownOptions) {
  const left = ref(0);
  const top = ref(0);
  const minWidth = ref(0);
  const placement = ref<string>('bottom-start');

  const positionSpec: PositionSpec = {
    placement: ['bottom-start', 'top-start'] as Placement[],
    offset: 4,
    flip: true,
    shift: false,
  };

  let scrollParents: Array<Element | Window> = [];
  let resizeObserver: ResizeObserver | null = null;
  let rafId: number | null = null;

  function reposition() {
    const trigger = opts.triggerEl.value;
    const dropdown = opts.dropdownEl.value;
    if (!trigger || !dropdown) return;

    const viewport = getViewportRect();
    const anchorRect = trigger.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();

    const coords = computeOverlayCoordinates(
      anchorRect,
      { width: dropdownRect.width, height: dropdownRect.height },
      positionSpec,
      viewport,
    );

    left.value = Math.round(coords.left);
    top.value = Math.round(coords.top);
    placement.value = coords.placement;
    minWidth.value = anchorRect.width;
  }

  function scheduleReposition() {
    if (rafId != null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (opts.isOpen.value) reposition();
    });
  }

  function installListeners() {
    const trigger = opts.triggerEl.value;
    if (!trigger) return;

    scrollParents = getScrollParents(trigger);
    for (const sp of scrollParents) {
      sp.addEventListener('scroll', scheduleReposition, { passive: true });
    }
    window.addEventListener('resize', scheduleReposition, { passive: true });

    resizeObserver = new ResizeObserver(scheduleReposition);
    resizeObserver.observe(trigger);
  }

  function removeListeners() {
    for (const sp of scrollParents) {
      sp.removeEventListener('scroll', scheduleReposition);
    }
    scrollParents = [];
    window.removeEventListener('resize', scheduleReposition);
    resizeObserver?.disconnect();
    resizeObserver = null;
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  watch(opts.isOpen, (open) => {
    if (open) {
      // Position on next frame so the dropdown is rendered first
      requestAnimationFrame(() => {
        reposition();
        installListeners();
      });
    } else {
      removeListeners();
    }
  });

  onBeforeUnmount(() => {
    removeListeners();
  });

  return {
    left,
    top,
    minWidth,
    placement,
    reposition,
  };
}
