/**
 * Overlay placement relative to the anchor element.
 */
export type Placement =
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
  | 'right-end'
  | 'center';

/**
 * Full overlay specification. Declarative config for opening overlays.
 */
export interface OverlaySpec {
  anchor?: AnchorSpec;
  position?: PositionSpec;
  size?: SizeSpec;
  backdrop?: BackdropSpec;
  scroll?: ScrollSpec;
  dismiss?: DismissSpec;
  focus?: FocusSpec;
  a11y?: A11ySpec;
  attachment?: AttachmentSpec;
  /** Additional CSS class(es) for the overlay panel */
  panelClass?: string | string[];
}

/**
 * Defines the anchor element or point that the overlay is positioned relative to.
 */
export type AnchorSpec =
  | { kind: 'element'; element: Element }
  | { kind: 'point'; x: number; y: number }
  | { kind: 'virtual'; placement: 'center' | 'top' | 'bottom' };

/**
 * Positioning configuration.
 */
export interface PositionSpec {
  /** Preferred placement(s). First valid one is used. */
  placement: Placement | readonly Placement[];
  /** Offset in px from the anchor */
  offset?: number;
  /** Whether to try alternate placements when the preferred one overflows */
  flip?: boolean;
  /** Whether to shift the overlay into the viewport boundary */
  shift?: boolean;
}

/**
 * Size constraints for the overlay.
 */
export interface SizeSpec {
  overflow?: 'visible' | 'hidden' | 'auto' | 'scroll' | 'clip' | (string & Record<never, never>);
  width?: number | 'anchor' | 'viewport' | (string & Record<never, never>);
  height?: number | 'anchor' | 'viewport' | (string & Record<never, never>);
  minWidth?: number | 'anchor' | (string & Record<never, never>);
  minHeight?: number | 'anchor' | (string & Record<never, never>);
  maxWidth?: number | 'viewport' | (string & Record<never, never>);
  maxHeight?: number | 'viewport' | (string & Record<never, never>);
}

/**
 * Backdrop configuration.
 */
export type BackdropSpec =
  | { kind: 'none' }
  | { kind: 'modal'; closeOnBackdropClick?: boolean };

/**
 * Scroll strategy for repositioning or closing the overlay.
 */
export interface ScrollSpec {
  strategy: 'noop' | 'reposition' | 'close';
}

/**
 * Dismiss triggers for the overlay.
 */
export interface DismissSpec {
  outsideClick?: boolean;
  escapeKey?: boolean;
  hoverTree?: {
    enabled?: boolean;
    delayMs?: number;
  };
}

/**
 * Focus behavior for the overlay.
 */
export interface FocusSpec {
  /** Trap focus within the overlay panel */
  trap?: boolean;
  /** Restore focus to the previously focused element on close */
  restore?: boolean;
}

/**
 * Accessibility attributes for the overlay.
 */
export interface A11ySpec {
  role?: 'dialog' | 'menu' | 'tooltip' | 'listbox';
  label?: string;
  labelledBy?: string;
  describedBy?: string;
}

/**
 * Where the overlay is attached in the DOM.
 */
export type AttachmentSpec =
  | { strategy: 'body' }
  | { strategy: 'parent'; container: HTMLElement };

/**
 * Defaults applied when spec fields are omitted.
 */
export const OVERLAY_DEFAULTS = {
  anchor: { kind: 'virtual', placement: 'center' } as const satisfies AnchorSpec,
  position: {
    placement: ['top', 'bottom', 'left', 'right'] as const,
    offset: 8,
    flip: true,
    shift: true,
  } as const satisfies PositionSpec,
  backdrop: { kind: 'none' } as const satisfies BackdropSpec,
  scroll: { strategy: 'reposition' } as const satisfies ScrollSpec,
  dismiss: { outsideClick: true, escapeKey: true } as const satisfies DismissSpec,
  focus: { trap: false, restore: true } as const satisfies FocusSpec,
  a11y: {} as const satisfies A11ySpec,
  attachment: { strategy: 'body' } as const satisfies AttachmentSpec,
} as const;

/**
 * Fully resolved spec with all defaults applied.
 */
export type ResolvedOverlaySpec = Omit<Required<OverlaySpec>, 'panelClass' | 'size'> & {
  size?: SizeSpec;
  panelClass?: string | string[];
};

/**
 * Resolves an OverlaySpec by filling in defaults for omitted fields.
 */
export function resolveOverlaySpec(spec: OverlaySpec): ResolvedOverlaySpec {
  return {
    anchor: spec.anchor ?? OVERLAY_DEFAULTS.anchor,
    position: spec.position ?? OVERLAY_DEFAULTS.position,
    size: spec.size,
    backdrop: spec.backdrop ?? OVERLAY_DEFAULTS.backdrop,
    scroll: spec.scroll ?? OVERLAY_DEFAULTS.scroll,
    dismiss: spec.dismiss ?? OVERLAY_DEFAULTS.dismiss,
    focus: spec.focus ?? OVERLAY_DEFAULTS.focus,
    a11y: spec.a11y ?? OVERLAY_DEFAULTS.a11y,
    attachment: spec.attachment ?? OVERLAY_DEFAULTS.attachment,
    panelClass: spec.panelClass,
  };
}

/**
 * Public handle returned from overlay.open(). Used to control the overlay.
 */
export interface OverlayRef {
  /** Close the overlay with an optional result */
  close(result?: unknown): void;
  /** Recalculate position */
  updatePosition(): void;
  /** Whether the overlay has been closed */
  readonly isClosed: boolean;
  /** Promise that resolves when the overlay is closed */
  readonly afterClosed: Promise<unknown>;
  /** The panel DOM element */
  readonly panelElement: HTMLElement | null;
}
