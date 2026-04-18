import type { OverlaySpec } from './overlay-types';

/**
 * Preset for tooltip overlays.
 * No backdrop, no outside dismiss, smart placement, attached to body.
 */
export const tooltipPreset: OverlaySpec = {
  position: {
    placement: ['top', 'bottom', 'left', 'right'],
    offset: 8,
    flip: true,
    shift: true,
  },
  backdrop: { kind: 'none' },
  scroll: { strategy: 'reposition' },
  dismiss: { outsideClick: false, escapeKey: false },
  focus: { trap: false, restore: false },
  a11y: { role: 'tooltip' },
  attachment: { strategy: 'body' },
};

/**
 * Preset for modal/dialog overlays.
 * Modal backdrop, focus trap, centered, escape to close.
 */
export const modalPreset: OverlaySpec = {
  anchor: { kind: 'virtual', placement: 'center' },
  position: { placement: 'center', offset: 0, flip: false, shift: false },
  size: { maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' },
  backdrop: { kind: 'modal', closeOnBackdropClick: true },
  scroll: { strategy: 'noop' },
  dismiss: { outsideClick: true, escapeKey: true },
  focus: { trap: true, restore: true },
  a11y: { role: 'dialog' },
  attachment: { strategy: 'body' },
};

/**
 * Preset for dropdown/menu overlays.
 * No backdrop, close on outside click, bottom-start placement.
 */
export const menuPreset: OverlaySpec = {
  position: {
    placement: ['bottom-start', 'bottom-end', 'top-start', 'top-end'],
    offset: 4,
    flip: true,
    shift: true,
  },
  backdrop: { kind: 'none' },
  scroll: { strategy: 'close' },
  dismiss: { outsideClick: true, escapeKey: true },
  focus: { trap: false, restore: true },
  a11y: { role: 'menu' },
  attachment: { strategy: 'body' },
};

/**
 * Preset for select dropdowns.
 * Similar to menu but with listbox role and anchor-width sizing.
 */
export const selectPreset: OverlaySpec = {
  position: {
    placement: ['bottom-start', 'top-start'],
    offset: 4,
    flip: true,
    shift: false,
  },
  size: { minWidth: 'anchor' },
  backdrop: { kind: 'none' },
  scroll: { strategy: 'close' },
  dismiss: { outsideClick: true, escapeKey: true },
  focus: { trap: false, restore: true },
  a11y: { role: 'listbox' },
  attachment: { strategy: 'body' },
};

/**
 * Preset for hover menus (cascading submenus).
 * Extends menu with hover-tree dismissal.
 */
export const hoverMenuPreset: OverlaySpec = {
  ...menuPreset,
  dismiss: { outsideClick: true, escapeKey: true, hoverTree: { enabled: true, delayMs: 300 } },
};

/**
 * Preset for programmatic dialogs (useDialog).
 * Modal backdrop, centered, but dismiss and focus trap are off because
 * CoarDialogShell handles its own focus trap, escape, and backdrop click.
 */
export const dialogPreset: OverlaySpec = {
  anchor: { kind: 'virtual', placement: 'center' },
  position: { placement: 'center', offset: 0, flip: false, shift: false },
  size: { maxWidth: '90vw', maxHeight: '90vh', overflow: 'auto' },
  backdrop: { kind: 'modal', closeOnBackdropClick: false },
  scroll: { strategy: 'noop' },
  dismiss: { outsideClick: false, escapeKey: false },
  focus: { trap: false, restore: false },
  a11y: { role: 'dialog' },
  attachment: { strategy: 'body' },
};

/**
 * Preset for popconfirm overlays.
 * Anchor-relative, no backdrop, outside-click + escape dismiss.
 */
/**
 * Preset for date picker overlays.
 * Anchor-relative, no backdrop, outside-click + escape dismiss, focus restore.
 * size.maxWidth ensures the overlay host is constrained to the viewport on small screens,
 * which feeds into the position measurement so shift/flip calculations stay accurate.
 */
export const datepickerPreset: OverlaySpec = {
  position: {
    placement: ['bottom-start', 'top-start'],
    offset: 4,
    flip: true,
    shift: true,
  },
  size: { maxWidth: 'viewport' },
  backdrop: { kind: 'none' },
  scroll: { strategy: 'reposition' },
  dismiss: { outsideClick: true, escapeKey: true },
  focus: { trap: false, restore: true },
  a11y: { role: 'dialog' },
  attachment: { strategy: 'body' },
};

/**
 * Preset for `CoarPopover` — anchor-relative, reposition on scroll, escape dismiss.
 * `outsideClick` defaults to true so clicking outside the pinned popover closes it, but
 * callers in hover-only mode typically override it to false because the component drives
 * close via hover-out timers instead.
 */
export const popoverPreset: OverlaySpec = {
  position: {
    placement: ['bottom', 'top', 'right', 'left'],
    offset: 6,
    flip: false,
    shift: true,
  },
  backdrop: { kind: 'none' },
  scroll: { strategy: 'reposition' },
  dismiss: { outsideClick: true, escapeKey: true },
  focus: { trap: false, restore: false },
  a11y: { role: 'dialog' },
  attachment: { strategy: 'body' },
};

export const popconfirmPreset: OverlaySpec = {
  position: {
    placement: ['top', 'bottom', 'left', 'right'],
    offset: 8,
    flip: true,
    shift: true,
  },
  backdrop: { kind: 'none' },
  scroll: { strategy: 'reposition' },
  dismiss: { outsideClick: true, escapeKey: true },
  focus: { trap: false, restore: true },
  a11y: { role: 'alertdialog' },
  attachment: { strategy: 'body' },
};
