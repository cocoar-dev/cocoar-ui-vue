import type { CoarDataListDropTarget, CoarDataListKey, CoarDataListLayout } from '../types';

/**
 * Drop position relative to the item under the pointer: split vertically in the
 * list layout, horizontally between tiles in the grid layout. With `nestable`,
 * the middle half of a list row means "drop inside" (make the item the parent).
 */
export function computeDropTarget(
  layout: CoarDataListLayout,
  rect: { top: number; left: number; width: number; height: number },
  point: { x: number; y: number },
  key: CoarDataListKey,
  options: { nestable?: boolean } = {},
): CoarDataListDropTarget {
  const ratio =
    layout === 'grid'
      ? rect.width > 0 ? (point.x - rect.left) / rect.width : 0
      : rect.height > 0 ? (point.y - rect.top) / rect.height : 0;
  if (options.nestable) {
    // List rows: the middle half. Tiles: the middle 40% of the width, so the
    // edges stay reachable for before / after.
    const inner = layout === 'grid' ? 0.3 : 0.25;
    if (ratio < inner) return { key, position: 'before' };
    if (ratio > 1 - inner) return { key, position: 'after' };
    return { key, position: 'inside' };
  }
  return { key, position: ratio < 0.5 ? 'before' : 'after' };
}

export interface Insertion {
  toIndex: number;
  afterKey: CoarDataListKey | null;
  beforeKey: CoarDataListKey | null;
}

/**
 * Translates a drop target into an insertion point among `siblingKeys` (the
 * visible items that share the destination parent) with the dragged keys
 * removed. Pass `null` as target to append. Returns `null` when the drop would
 * change nothing (target is a dragged item, or the block would land where it
 * already is).
 */
export function resolveInsertion(
  siblingKeys: readonly CoarDataListKey[],
  draggedKeys: ReadonlySet<CoarDataListKey>,
  target: { key: CoarDataListKey; position: 'before' | 'after' } | null,
  options: { fromSelf: boolean; sameParent: boolean },
): Insertion | null {
  const remaining = siblingKeys.filter((key) => !draggedKeys.has(key));

  let toIndex: number;
  if (!target) {
    toIndex = remaining.length;
  } else {
    if (draggedKeys.has(target.key)) return null;
    const index = remaining.indexOf(target.key);
    if (index < 0) return null;
    toIndex = target.position === 'before' ? index : index + 1;
  }

  if (options.fromSelf && options.sameParent) {
    const dragged = siblingKeys.filter((key) => draggedKeys.has(key));
    const next = [...remaining.slice(0, toIndex), ...dragged, ...remaining.slice(toIndex)];
    if (next.length === siblingKeys.length && next.every((key, i) => key === siblingKeys[i])) return null;
  }

  return {
    toIndex,
    afterKey: toIndex > 0 ? remaining[toIndex - 1] : null,
    beforeKey: toIndex < remaining.length ? remaining[toIndex] : null,
  };
}

/** Distance from the viewport edges at which dragging starts auto-scrolling. */
export const AUTOSCROLL_EDGE = 28;

/** Scroll step per frame while the pointer sits inside the edge zone. */
export function autoscrollDelta(clientY: number, rect: { top: number; bottom: number }): number {
  if (clientY < rect.top + AUTOSCROLL_EDGE) return -Math.ceil((rect.top + AUTOSCROLL_EDGE - clientY) / 3);
  if (clientY > rect.bottom - AUTOSCROLL_EDGE) return Math.ceil((clientY - (rect.bottom - AUTOSCROLL_EDGE)) / 3);
  return 0;
}

/** `true` when a DataTransfer carries OS files (the only thing readable during dragover). */
export function isFileDrag(dt: DataTransfer | null): boolean {
  return !!dt && Array.from(dt.types).includes('Files');
}
