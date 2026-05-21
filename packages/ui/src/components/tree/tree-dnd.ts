import type { CoarTreeDropPosition } from './tree-types';

/**
 * Compute where a drop should land relative to a row given the cursor's Y
 * position within that row's bounding box.
 *
 * Default thresholds:
 * - Top 25% of the row → `'before'`
 * - Bottom 25% of the row → `'after'`
 * - Middle 50% → `'inside'` (only if the target is expandable; otherwise
 *   clamped to whichever band is closer)
 *
 * For leaf nodes the `'inside'` band is suppressed because dropping into a
 * leaf doesn't make sense. We split the row 50/50 between before/after in
 * that case so the user never gets a "dead zone".
 */
export function computeDropPosition(
  event: { clientY: number },
  rect: { top: number; height: number },
  opts: { expandable: boolean },
): CoarTreeDropPosition {
  const offset = event.clientY - rect.top;
  const ratio = rect.height > 0 ? offset / rect.height : 0;

  if (!opts.expandable) {
    return ratio < 0.5 ? 'before' : 'after';
  }

  if (ratio < 0.25) return 'before';
  if (ratio > 0.75) return 'after';
  return 'inside';
}

/**
 * Detect whether a DataTransfer represents a drag of OS files (vs. an internal
 * tree-node drag). `types` is the only DataTransfer field reliably readable
 * during `dragover` — `getData()` returns an empty string on most browsers
 * until `drop` for security reasons.
 */
export function isFileDrag(dt: DataTransfer | null): boolean {
  return !!dt && Array.from(dt.types).includes('Files');
}
