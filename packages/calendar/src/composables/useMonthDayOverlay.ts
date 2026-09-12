/**
 * `useMonthDayOverlay` — open / close / position state for the day
 * sheet a month cell's "+N" opens (`<CoarMonthDayOverlay>`).
 *
 * The sheet is rendered INSIDE the month view (absolute inside its
 * `position: relative` root), so it scrolls with the continuous
 * month surface and needs no portal. This composable measures the
 * covered cell, aligns the sheet to the cell's top-left edge and
 * width (widened to `minWidth` on narrow columns, kept inside the
 * view), and flips it upward when the space below inside the
 * nearest scroll container is shorter than the sheet.
 *
 * Closes on: outside pointerdown, the month changing, a window
 * resize, or the caller's explicit `close()`. Focus returns to the
 * cell's "+N" button when the sheet had it.
 */

import { type ComputedRef, type Ref, nextTick, onScopeDispose, ref, shallowRef, watch } from 'vue';
import { Temporal, dateKey } from '../core';

export interface MonthDayOverlayPosition {
  top: number;
  left: number;
  width: number;
  /** Upper bound for the pill list before it scrolls. */
  maxListHeight: number;
}

export interface UseMonthDayOverlayOptions {
  /** Month view root — the sheet's containing block. */
  rootRef: Ref<HTMLElement | null>;
  /** Rows container — where the day cells live. */
  gridRef: Ref<HTMLElement | null>;
  /** The rendered sheet element (null while closed). */
  overlayEl: () => HTMLElement | null;
  /** Closes the sheet when it changes (the visible month). */
  resetToken: ComputedRef<unknown> | Ref<unknown>;
  /** Minimum sheet width; narrow columns widen to this. Default 200. */
  minWidth?: number;
  /** Hard cap for the whole sheet. Default 360. */
  maxHeight?: number;
}

export interface UseMonthDayOverlayReturn {
  /** Day whose sheet is open, or `null`. */
  day: Ref<Temporal.PlainDate | null>;
  position: Ref<MonthDayOverlayPosition>;
  isOpen(day: Temporal.PlainDate): boolean;
  open(day: Temporal.PlainDate): Promise<void>;
  toggle(day: Temporal.PlainDate): Promise<void>;
  close(): void;
}

const HEADER_HEIGHT = 30;
const OVERFLOW_BUTTON = '.coar-month-cell__overflow';

/** Nearest ancestor that scrolls vertically, else `null` (viewport). */
function scrollParentOf(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement;
  while (node && node !== document.body) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
    node = node.parentElement;
  }
  return null;
}

export function useMonthDayOverlay(opts: UseMonthDayOverlayOptions): UseMonthDayOverlayReturn {
  const minWidth = opts.minWidth ?? 200;
  const maxHeight = opts.maxHeight ?? 360;

  const day = shallowRef<Temporal.PlainDate | null>(null);
  const position = ref<MonthDayOverlayPosition>({
    top: 0,
    left: 0,
    width: minWidth,
    maxListHeight: maxHeight - HEADER_HEIGHT,
  });

  function cellEl(d: Temporal.PlainDate): HTMLElement | null {
    return opts.gridRef.value?.querySelector<HTMLElement>(`[data-day-key="${dateKey(d)}"]`) ?? null;
  }

  function isOpen(d: Temporal.PlainDate): boolean {
    return day.value !== null && Temporal.PlainDate.compare(day.value, d) === 0;
  }

  /** Align to the cell; then, once rendered, flip upward if needed. */
  async function place(d: Temporal.PlainDate): Promise<void> {
    const root = opts.rootRef.value;
    const cell = cellEl(d);
    if (!root || !cell) return;
    const rootRect = root.getBoundingClientRect();
    const cellRect = cell.getBoundingClientRect();
    const width = Math.min(Math.max(cellRect.width, minWidth), Math.max(rootRect.width, 1));
    let left = cellRect.left - rootRect.left;
    if (left + width > rootRect.width) left = rootRect.width - width;
    if (left < 0) left = 0;
    const top = cellRect.top - rootRect.top;
    position.value = { top, left, width, maxListHeight: maxHeight - HEADER_HEIGHT };

    await nextTick();
    if (day.value === null || !isOpen(d)) return;
    const sheet = opts.overlayEl();
    if (!sheet) return;
    const scroller = scrollParentOf(root);
    const viewportTop = scroller ? scroller.getBoundingClientRect().top : 0;
    const viewportBottom = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
    const sheetHeight = sheet.offsetHeight;
    const below = viewportBottom - cellRect.top;
    const above = cellRect.bottom - viewportTop;
    if (sheetHeight > below && above > below) {
      // Open upward: bottom edge on the cell's bottom edge.
      position.value = {
        ...position.value,
        top: Math.max(0, cellRect.bottom - rootRect.top - sheetHeight),
      };
    }
  }

  async function open(d: Temporal.PlainDate): Promise<void> {
    day.value = d;
    await nextTick();
    await place(d);
  }

  function close(): void {
    const d = day.value;
    if (d === null) return;
    const sheet = opts.overlayEl();
    const hadFocus =
      typeof document !== 'undefined' &&
      sheet !== null &&
      document.activeElement !== null &&
      sheet.contains(document.activeElement);
    day.value = null;
    if (hadFocus) cellEl(d)?.querySelector<HTMLElement>(OVERFLOW_BUTTON)?.focus();
  }

  async function toggle(d: Temporal.PlainDate): Promise<void> {
    if (isOpen(d)) close();
    else await open(d);
  }

  function onDocumentPointerdown(e: PointerEvent): void {
    if (day.value === null) return;
    const target = e.target as Node | null;
    if (!target) return;
    const sheet = opts.overlayEl();
    if (sheet && sheet.contains(target)) return;
    // The cell's own "+N" toggles the sheet itself (see `toggle`).
    if (target instanceof Element && target.closest(OVERFLOW_BUTTON)) return;
    close();
  }
  function onResize(): void {
    close();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('pointerdown', onDocumentPointerdown, true);
    window.addEventListener('resize', onResize);
    onScopeDispose(() => {
      document.removeEventListener('pointerdown', onDocumentPointerdown, true);
      window.removeEventListener('resize', onResize);
    });
  }

  watch(opts.resetToken, () => close());

  return { day, position, isOpen, open, toggle, close };
}
