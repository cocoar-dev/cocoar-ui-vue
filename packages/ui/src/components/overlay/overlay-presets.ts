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
 * Preset for select dropdowns. Anchor-width sizing via `size.minWidth: 'anchor'` so the
 * dropdown matches the trigger width while allowing long option labels to extend it.
 * `scroll.strategy: 'reposition'` follows the trigger on scroll rather than closing —
 * the expected behavior for a dropdown, since closing on every scroll event would feel
 * abrupt when the user is just scrolling the surrounding form.
 *
 * `a11y.role` is intentionally omitted: the select panels already render an inner
 * `role="listbox"` element whose id the trigger references via `aria-controls`. Adding
 * `role="listbox"` on the outer overlay host would duplicate the role and confuse
 * screen readers (and anchor `aria-multiselectable` onto the wrong element).
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
  scroll: { strategy: 'reposition' },
  dismiss: { outsideClick: true, escapeKey: true },
  focus: { trap: false, restore: true },
  a11y: {},
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

/**
 * Preset for `CoarSidebarGroup` flyout panels. Anchored to the group trigger with the
 * submenu appearing to its right (or flipping left near the viewport edge). Offset is
 * negative so the flyout overlaps the trigger by a few pixels, matching the legacy
 * visual. `scroll.strategy: 'reposition'` keeps the flyout attached if the sidebar
 * scrolls, while `outsideClick` + `escapeKey` let the service handle dismissal.
 */
export const sidebarFlyoutPreset: OverlaySpec = {
  position: {
    placement: ['right-start', 'left-start'],
    offset: -4,
    flip: true,
    shift: true,
  },
  backdrop: { kind: 'none' },
  scroll: { strategy: 'reposition' },
  dismiss: { outsideClick: true, escapeKey: true },
  focus: { trap: false, restore: true },
  a11y: { role: 'menu' },
  attachment: { strategy: 'body' },
};

/**
 * Preset for `CoarContextMenu` — right-click menu anchored to a cursor point. The anchor
 * is set at `open()` time with `{ kind: 'point', x, y }` (a 0×0 rect at the cursor), and
 * the placement list covers all four "grow outward from cursor" directions so `flip: true`
 * picks the corner with the most available space. `shift: true` clamps the menu into the
 * viewport when even the chosen corner overflows. `scroll.strategy: 'close'` dismisses the
 * menu on page scroll, matching the legacy behavior.
 */
export const contextMenuPreset: OverlaySpec = {
  position: {
    placement: ['bottom-start', 'bottom-end', 'top-start', 'top-end'],
    offset: 0,
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
 * Preset for `CoarSubFlyout` — cascading submenu anchored to the right of its parent item.
 * Falls back to `left-start` when the right side overflows. Offset is negative so the
 * submenu overlaps the anchor slightly, matching the legacy visual. `flip: false` because
 * the placement array already covers the flip direction. Hover-out dismissal is driven by
 * the component's own timer logic (not `dismiss.hoverTree`).
 */
export const subFlyoutPreset: OverlaySpec = {
  position: {
    placement: ['right-start', 'left-start'],
    offset: -4,
    flip: false,
    shift: true,
  },
  backdrop: { kind: 'none' },
  scroll: { strategy: 'reposition' },
  dismiss: { outsideClick: true, escapeKey: true },
  focus: { trap: false, restore: false },
  a11y: { role: 'menu' },
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
