import { markRaw, type ComponentInternalInstance, type Directive, type DirectiveBinding } from 'vue';
import { getOverlayService, OVERLAY_PARENT_KEY } from '../overlay/useOverlay';
import { tooltipPreset } from '../overlay/overlay-presets';
import type { OverlayInstance } from '../overlay/overlay-service';
import type { OverlayRef, Placement } from '../overlay/overlay-types';
import CoarTooltipPanel from './CoarTooltipPanel.vue';

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

type OpenReason = 'hover' | 'focus';

interface TooltipState {
  overlayRef: OverlayRef | null;
  openTimerId: number | null;
  closeTimerId: number | null;
  openReasons: Set<OpenReason>;
  lastPointerDown: number;
  tooltipId: string;
  cleanup: (() => void) | null;
  opts: TooltipOptions;
  /** Resolved at `mounted` from the host component's provides chain; `undefined` = root overlay. */
  parentOverlay: OverlayInstance | undefined;
  onPointerDown: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocusIn: () => void;
  onFocusOut: (e: FocusEvent) => void;
}

// Global: only one tooltip visible at a time.
let activeState: TooltipState | null = null;
let nextId = 0;

/**
 * Falsy binding values (`false`, `null`, `undefined`, `''`) are a documented
 * convention for "do not show a tooltip" — call sites use them to suppress the
 * tooltip dynamically without removing the directive. We coerce them to a
 * disabled `TooltipOptions` so downstream code can rely on the return shape.
 */
type TooltipBindingValue = string | TooltipOptions | false | null | undefined;

function getOptions(binding: DirectiveBinding<TooltipBindingValue>): TooltipOptions {
  const val = binding.value;
  if (!val) return { content: '', disabled: true };
  if (typeof val === 'string') return { content: val };
  return val;
}

function resolvePlacements(placement: TooltipPlacement = 'top'): readonly Placement[] {
  if (placement === 'auto') return ['top', 'bottom', 'left', 'right'] as const;
  return [placement as Placement];
}

/**
 * Walk the component instance's provides chain for a value injected under `key`.
 * Directives have no setup context, so the normal `inject()` helper is unavailable —
 * but Vue stores provides on each instance with prototype-chain inheritance, so a
 * plain property lookup on `instance.provides` resolves through all ancestors. This
 * is the same mechanism `inject()` uses internally.
 */
function readInjection<T>(
  instance: ComponentInternalInstance | null | undefined,
  key: symbol,
): T | undefined {
  if (!instance) return undefined;
  const provides = (instance as { provides?: Record<symbol, unknown> }).provides;
  return provides ? (provides[key] as T | undefined) : undefined;
}

function openTooltip(
  trigger: HTMLElement,
  state: TooltipState,
  opts: TooltipOptions,
  reason: OpenReason,
): void {
  if (opts.disabled || !opts.content) return;

  // Close any other active tooltip — tooltips are singleton.
  if (activeState && activeState !== state) {
    closeTooltip(activeState);
  }

  state.openReasons.add(reason);
  activeState = state;

  if (state.overlayRef && !state.overlayRef.isClosed) {
    // Already open — service handles repositioning on scroll/resize.
    state.overlayRef.updatePosition();
    return;
  }

  state.overlayRef = getOverlayService().open({
    spec: {
      ...tooltipPreset,
      anchor: { kind: 'element', element: trigger },
      position: {
        placement: resolvePlacements(opts.placement),
        offset: 6,
        flip: opts.placement !== 'auto',
        shift: true,
      },
      a11y: { role: 'tooltip' },
    },
    content: { kind: 'component', component: markRaw(CoarTooltipPanel) },
    inputs: { content: opts.content, id: state.tooltipId },
    parent: state.parentOverlay,
  });

  trigger.setAttribute('aria-describedby', state.tooltipId);

  // Set up pointer tracking for hover-only closes (covers the case where the pointer
  // leaves the trigger without crossing the mouseleave boundary — e.g. scrolling the
  // wheel or keyboard-focusing another element).
  if (reason === 'hover') {
    startPointerTracking(trigger, state);
  }

  // Sync local state when the service closes the overlay externally (another tooltip
  // stealing singleton-active, overlay tree teardown, etc.).
  state.overlayRef.afterClosed.then(() => {
    if (state.overlayRef?.isClosed) {
      state.overlayRef = null;
      trigger.removeAttribute('aria-describedby');
      state.openReasons.clear();
      state.cleanup?.();
      state.cleanup = null;
      if (activeState === state) activeState = null;
    }
  });
}

function closeTooltip(state: TooltipState): void {
  state.openReasons.clear();
  clearTimers(state);

  if (state.overlayRef && !state.overlayRef.isClosed) {
    state.overlayRef.close();
  }
  state.overlayRef = null;

  state.cleanup?.();
  state.cleanup = null;

  if (activeState === state) activeState = null;
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

function scheduleOpen(
  trigger: HTMLElement,
  state: TooltipState,
  opts: TooltipOptions,
  reason: OpenReason,
): void {
  clearTimers(state);
  const delay = Math.max(0, opts.openDelay ?? 0);
  if (delay === 0) {
    openTooltip(trigger, state, opts, reason);
    return;
  }
  state.openTimerId = window.setTimeout(() => {
    state.openTimerId = null;
    openTooltip(trigger, state, opts, reason);
  }, delay);
}

function scheduleClose(state: TooltipState, opts: TooltipOptions, reason: OpenReason): void {
  if (state.openTimerId != null) {
    window.clearTimeout(state.openTimerId);
    state.openTimerId = null;
  }

  state.openReasons.delete(reason);
  if (state.openReasons.size > 0) return;

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
    if (!state.overlayRef || state.overlayRef.isClosed) return;
    if (!state.openReasons.has('hover')) return;

    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (el && trigger.contains(el)) return;
    closeTooltip(state);
  };

  const onScroll = (): void => {
    if (state.openReasons.has('hover')) closeTooltip(state);
  };
  const onBlur = (): void => {
    if (state.openReasons.has('hover')) closeTooltip(state);
  };
  const onVisibility = (): void => {
    if (document.hidden && state.openReasons.has('hover')) closeTooltip(state);
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

export const vTooltip: Directive<HTMLElement, TooltipBindingValue> = {
  mounted(el, binding) {
    const tooltipId = `coar-tooltip-${nextId++}`;

    // Resolve the nearest ancestor overlay from the host component's provides chain.
    // When the tooltip trigger is rendered inside a dialog / popover / menu, we inherit
    // the parent `OverlayInstance` here and pass it to `overlay.open({ parent })` so
    // the service stacks and click-outside-aware-binds the tooltip correctly.
    const hostInstance = (binding.instance as { $?: ComponentInternalInstance } | null)?.$;
    const parentOverlay = readInjection<OverlayInstance>(hostInstance, OVERLAY_PARENT_KEY);

    const state: TooltipState = {
      overlayRef: null,
      openTimerId: null,
      closeTimerId: null,
      openReasons: new Set(),
      lastPointerDown: 0,
      tooltipId,
      cleanup: null,
      opts: getOptions(binding),
      parentOverlay,
      onPointerDown: () => {
        state.lastPointerDown = Date.now();
      },
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
        // Pointer-initiated focus (click/tap) should not pin the tooltip open;
        // let hover tracking handle the lifecycle instead.
        if (Date.now() - state.lastPointerDown < 200) return;
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

    el.addEventListener('pointerdown', state.onPointerDown);
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

    // If open, close and reopen with the new content. The service does not expose an
    // imperative "update inputs" API on the ref, so a clean re-open is the simplest way
    // to swap the rendered text — and tooltip content rarely changes while visible.
    if (state.overlayRef && !state.overlayRef.isClosed) {
      const triggerEl = el;
      const reasons = new Set(state.openReasons);
      closeTooltip(state);
      // Reopen immediately with the new opts. Use the first reason that was active.
      const firstReason = reasons.values().next().value as OpenReason | undefined;
      if (firstReason) openTooltip(triggerEl, state, opts, firstReason);
    }
  },

  beforeUnmount(el) {
    const state = stateMap.get(el);
    if (!state) return;

    closeTooltip(state);
    el.removeEventListener('pointerdown', state.onPointerDown);
    el.removeEventListener('mouseenter', state.onMouseEnter);
    el.removeEventListener('mouseleave', state.onMouseLeave);
    el.removeEventListener('focusin', state.onFocusIn);
    el.removeEventListener('focusout', state.onFocusOut);
    el.removeAttribute('aria-describedby');
    stateMap.delete(el);
  },
};
