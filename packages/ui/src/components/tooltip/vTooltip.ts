import type { Directive, DirectiveBinding } from 'vue';
import { computeOverlayCoordinates } from '../overlay/overlay-position';
import type { Placement } from '../overlay/overlay-types';

export type TooltipPlacement =
  | 'auto'
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

export interface TooltipOptions {
  /** Tooltip text content */
  content: string;
  /** Placement preference. Default: 'top' */
  placement?: TooltipPlacement;
  /** Disable tooltip. Default: false */
  disabled?: boolean;
  /** Open delay in ms. Default: 0 */
  openDelay?: number;
  /** Close delay in ms. Default: 0 */
  closeDelay?: number;
}

interface TooltipState {
  tooltipEl: HTMLElement | null;
  openTimerId: number | null;
  closeTimerId: number | null;
  openReason: 'hover' | 'focus' | null;
  tooltipId: string;
  cleanup: (() => void) | null;
  opts: TooltipOptions;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocusIn: () => void;
  onFocusOut: (e: FocusEvent) => void;
}

// Global: only one tooltip visible at a time
let activeState: TooltipState | null = null;

let nextId = 0;

function getOptions(binding: DirectiveBinding<string | TooltipOptions>): TooltipOptions {
  const val = binding.value;
  if (typeof val === 'string') {
    return { content: val };
  }
  return val;
}

function getPlacementConfig(placement: TooltipPlacement = 'top'): {
  placements: readonly Placement[];
  offset: number;
  flip: boolean;
  shift: boolean;
} {
  if (placement === 'auto') {
    return { placements: ['top', 'bottom', 'left', 'right'] as const, offset: 6, flip: false, shift: true };
  }
  return { placements: [placement as Placement], offset: 6, flip: true, shift: true };
}

function createTooltipEl(content: string, tooltipId: string): HTMLElement {
  const el = document.createElement('div');
  el.id = tooltipId;
  el.className = 'coar-tooltip';
  el.setAttribute('role', 'tooltip');
  el.innerHTML = `<span class="coar-tooltip-text">${escapeHtml(content)}</span>`;
  el.style.cssText =
    'position:fixed;top:0;left:0;z-index:calc(var(--coar-z-overlay,1000) + 1);pointer-events:none;opacity:0;';
  return el;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function positionTooltip(tooltipEl: HTMLElement, trigger: HTMLElement, placement: TooltipPlacement = 'top'): void {
  const config = getPlacementConfig(placement);
  const anchorRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltipEl.getBoundingClientRect();

  const viewport = {
    width: window.innerWidth || 800,
    height: window.innerHeight || 600,
    scrollX: window.scrollX || 0,
    scrollY: window.scrollY || 0,
  };

  const positionSpec = {
    placement: config.placements.length === 1 ? config.placements[0] : config.placements,
    offset: config.offset,
    flip: config.flip,
    shift: config.shift,
  };

  const coords = computeOverlayCoordinates(
    anchorRect,
    { width: tooltipRect.width || 1, height: tooltipRect.height || 1 },
    positionSpec,
    viewport,
  );

  tooltipEl.style.transform = `translate3d(${coords.left}px, ${coords.top}px, 0)`;
  tooltipEl.style.opacity = '1';
}

function openTooltip(el: HTMLElement, state: TooltipState, opts: TooltipOptions, reason: 'hover' | 'focus'): void {
  if (opts.disabled || !opts.content) return;

  // Close any other active tooltip
  if (activeState && activeState !== state) {
    closeTooltip(activeState);
  }

  state.openReason = reason;
  activeState = state;

  if (state.tooltipEl) {
    // Already open — just reposition
    positionTooltip(state.tooltipEl, el, opts.placement);
    return;
  }

  const tooltipEl = createTooltipEl(opts.content, state.tooltipId);
  document.body.appendChild(tooltipEl);
  state.tooltipEl = tooltipEl;

  // Position after append so tooltip has layout dimensions
  requestAnimationFrame(() => {
    if (state.tooltipEl === tooltipEl) {
      positionTooltip(tooltipEl, el, opts.placement);
    }
  });

  el.setAttribute('aria-describedby', state.tooltipId);

  // Set up global tracking for hover
  if (reason === 'hover') {
    startPointerTracking(el, state);
  }
}

function closeTooltip(state: TooltipState): void {
  state.openReason = null;
  clearTimers(state);

  if (state.tooltipEl) {
    state.tooltipEl.remove();
    state.tooltipEl = null;
  }

  state.cleanup?.();
  state.cleanup = null;

  if (activeState === state) {
    activeState = null;
  }
}

function clearTimers(state: TooltipState): void {
  if (state.openTimerId != null) {
    window.clearTimeout(state.openTimerId);
    state.openTimerId = null;
  }
  if (state.closeTimerId != null) {
    window.clearTimeout(state.closeTimerId);
    state.closeTimerId = null;
  }
}

function scheduleOpen(el: HTMLElement, state: TooltipState, opts: TooltipOptions, reason: 'hover' | 'focus'): void {
  clearTimers(state);
  const delay = Math.max(0, opts.openDelay ?? 0);
  if (delay === 0) {
    openTooltip(el, state, opts, reason);
    return;
  }
  state.openTimerId = window.setTimeout(() => {
    state.openTimerId = null;
    openTooltip(el, state, opts, reason);
  }, delay);
}

function scheduleClose(state: TooltipState, opts: TooltipOptions, reason: 'hover' | 'focus'): void {
  if (state.openTimerId != null) {
    window.clearTimeout(state.openTimerId);
    state.openTimerId = null;
  }
  if (state.openReason !== reason) return;

  const delay = Math.max(0, opts.closeDelay ?? 0);
  if (delay === 0) {
    closeTooltip(state);
    return;
  }
  if (state.closeTimerId != null) return;
  state.closeTimerId = window.setTimeout(() => {
    state.closeTimerId = null;
    closeTooltip(state);
  }, delay);
}

function startPointerTracking(trigger: HTMLElement, state: TooltipState): void {
  if (state.cleanup) return;

  const onPointerMove = (event: PointerEvent | MouseEvent): void => {
    if (!state.tooltipEl) return;
    if (state.openReason !== 'hover') return;

    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (el && trigger.contains(el)) return;
    closeTooltip(state);
  };

  const onScroll = (): void => {
    if (state.openReason === 'hover') closeTooltip(state);
  };
  const onBlur = (): void => {
    if (state.openReason === 'hover') closeTooltip(state);
  };
  const onVisibility = (): void => {
    if (document.hidden && state.openReason === 'hover') closeTooltip(state);
  };

  document.addEventListener('pointermove', onPointerMove, { capture: true, passive: true });
  window.addEventListener('scroll', onScroll, { capture: true, passive: true });
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);

  state.cleanup = () => {
    document.removeEventListener('pointermove', onPointerMove, true);
    window.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVisibility);
    state.cleanup = null;
  };
}

const stateMap = new WeakMap<HTMLElement, TooltipState>();

// Exported for testing
export function _getActiveState(): TooltipState | null {
  return activeState;
}
export function _resetActiveState(): void {
  activeState = null;
  nextId = 0;
}

export const vTooltip: Directive<HTMLElement, string | TooltipOptions> = {
  mounted(el, binding) {
    const tooltipId = `coar-tooltip-${nextId++}`;

    const state: TooltipState = {
      tooltipEl: null,
      openTimerId: null,
      closeTimerId: null,
      openReason: null,
      tooltipId,
      cleanup: null,
      opts: getOptions(binding),
      onMouseEnter: () => {
        if (state.opts.disabled || !state.opts.content) return;
        if (state.closeTimerId != null) {
          window.clearTimeout(state.closeTimerId);
          state.closeTimerId = null;
        }
        scheduleOpen(el, state, state.opts, 'hover');
      },
      onMouseLeave: () => {
        scheduleClose(state, state.opts, 'hover');
      },
      onFocusIn: () => {
        if (state.opts.disabled || !state.opts.content) return;
        if (state.closeTimerId != null) {
          window.clearTimeout(state.closeTimerId);
          state.closeTimerId = null;
        }
        scheduleOpen(el, state, state.opts, 'focus');
      },
      onFocusOut: (event: FocusEvent) => {
        const next = event.relatedTarget as Node | null;
        if (next && el.contains(next)) return;
        scheduleClose(state, state.opts, 'focus');
      },
    };

    stateMap.set(el, state);

    el.addEventListener('mouseenter', state.onMouseEnter);
    el.addEventListener('mouseleave', state.onMouseLeave);
    el.addEventListener('focusin', state.onFocusIn);
    el.addEventListener('focusout', state.onFocusOut);
  },

  updated(el, binding) {
    const state = stateMap.get(el);
    if (!state) return;

    // Falsy binding (false, null, '', undefined) → disable & close
    if (!binding.value) {
      state.opts = { content: '', disabled: true };
      closeTooltip(state);
      return;
    }

    const opts = getOptions(binding);
    state.opts = opts;

    if (opts.disabled || !opts.content) {
      closeTooltip(state);
      return;
    }

    // If open, update content and reposition
    if (state.tooltipEl) {
      const textSpan = state.tooltipEl.querySelector('.coar-tooltip-text');
      if (textSpan) {
        textSpan.textContent = opts.content;
      }
      positionTooltip(state.tooltipEl, el, opts.placement);
    }
  },

  beforeUnmount(el) {
    const state = stateMap.get(el);
    if (!state) return;

    closeTooltip(state);
    el.removeEventListener('mouseenter', state.onMouseEnter);
    el.removeEventListener('mouseleave', state.onMouseLeave);
    el.removeEventListener('focusin', state.onFocusIn);
    el.removeEventListener('focusout', state.onFocusOut);
    el.removeAttribute('aria-describedby');
    stateMap.delete(el);
  },
};
