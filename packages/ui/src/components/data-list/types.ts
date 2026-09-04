import type { DragEngine } from '../../composables/useDragDrop';

/** Identity of a list item — what `itemKey` returns. */
export type CoarDataListKey = string | number;

export type CoarDataListSortDirection = 'asc' | 'desc';

/** Active sort state (`v-model:sort`). `null` keeps the input order. */
export interface CoarDataListSort {
  /** `key` of the chosen {@link CoarDataListSortOption}. */
  key: string;
  direction: CoarDataListSortDirection;
}

/** One entry of the sort menu. */
export interface CoarDataListSortOption<T> {
  /** Stable identifier, also used as the default property name when `by` is omitted. */
  key: string;
  /** Menu label. */
  label: string;
  /**
   * Extracts the value to compare. Values are compared locale-aware (numeric strings,
   * diacritics), numbers numerically, dates chronologically; `null`/`undefined` sort last.
   * Default: `item[key]`.
   */
  by?: (item: T) => unknown;
  /** Full custom comparator for ascending order. Wins over `by`. */
  compare?: (a: T, b: T) => number;
  /** Direction applied when this option is chosen. Default `'asc'`. */
  defaultDirection?: CoarDataListSortDirection;
}

/**
 * Which text the search matches against: a list of property names (joined), or a
 * function returning the searchable string. Default: every own string, number and
 * boolean property of the item.
 */
export type CoarDataListSearchBy<T> = ReadonlyArray<keyof T & string> | ((item: T) => string);

export type CoarDataListSelectionMode = 'none' | 'single' | 'multiple';

/** Order of groups when `groupBy` is used. Default `'asc'`. */
export type CoarDataListSortGroups = 'asc' | 'desc' | 'none' | ((a: string, b: string) => number);

export type CoarDataListDensity = 's' | 'm' | 'l';

/**
 * `'list'`: one record per row. `'grid'`: records flow into tiles, as many per
 * row as fit `tileMinWidth`. Both keep the exact data order — a tile grid is a
 * list that wraps.
 */
export type CoarDataListLayout = 'list' | 'grid';

/** A visible row — either an item or the heading of a group. */
export type CoarDataListEntry<T> =
  | {
      kind: 'item';
      /** Unique row key (`i:` + item key). */
      key: string;
      itemKey: CoarDataListKey;
      item: T;
      /** Position among the visible items (group headings excluded). */
      index: number;
    }
  | {
      kind: 'group';
      key: string;
      group: string;
      count: number;
      items: T[];
    };

export interface CoarDataListItemSlotProps<T> {
  item: T;
  /** Position among the visible items. */
  index: number;
  itemKey: CoarDataListKey;
  selected: boolean;
  focused: boolean;
  /** Part of an in-flight drag (pointer or keyboard). */
  dragging: boolean;
  /** Select only this item. */
  select(): void;
  /** Toggle this item's selection (multiple) or select/clear it (single). */
  toggle(): void;
}

export interface CoarDataListGroupSlotProps<T> {
  group: string;
  count: number;
  items: T[];
}

export interface CoarDataListItemEvent<T> {
  item: T;
  itemKey: CoarDataListKey;
  index: number;
  event: MouseEvent | KeyboardEvent;
}

/** Drag engine — see `DragEngine` in `useDragDrop`. Accepting OS files works with either. */
export type CoarDataListDragEngine = DragEngine;

export type CoarDataListDropPosition = 'before' | 'after';

/** Where a drag would land, relative to a visible item. */
export interface CoarDataListDropTarget {
  key: CoarDataListKey;
  position: CoarDataListDropPosition;
}

/**
 * Payload of `reorder` (drop inside the same list) and `items-add` (drop from
 * another list). The list never mutates its data — apply the change to your
 * source. `afterKey` / `beforeKey` name the visible neighbours of the insertion
 * point (dragged items excluded), which stays correct while a search hides rows.
 */
export interface CoarDataListDropEvent<T> {
  items: T[];
  keys: CoarDataListKey[];
  /** Index among the visible items, dragged items excluded. */
  toIndex: number;
  afterKey: CoarDataListKey | null;
  beforeKey: CoarDataListKey | null;
  /** `groupBy` value at the insertion point, or `null` without grouping / at the end. */
  group: string | null;
  fromSelf: boolean;
  /** `dragId` of the source list, if it set one. */
  sourceId: string | null;
  sourceDragGroup: string | null;
}

export interface CoarDataListItemsRemoveEvent<T> {
  items: T[];
  keys: CoarDataListKey[];
  /** `dragGroup` of the list that accepted the items. */
  toDragGroup: string | null;
}

export interface CoarDataListFilesDropEvent<T> {
  files: File[];
  /** The item under the pointer, or `null` on empty space. */
  item: T | null;
  event: DragEvent;
}

/** One entry of a declarative context menu (`builder.itemMenu` / `builder.viewportMenu`). */
export interface CoarDataListMenuItem {
  label: string;
  /** Icon name passed to `<CoarMenuItem :icon>`. */
  icon?: string;
  /** Destructive action styling. */
  danger?: boolean;
  disabled?: boolean;
  /** Invoked on click; the list closes the menu afterwards. */
  onClick: () => void;
}

export type CoarDataListMenuEntry = CoarDataListMenuItem | 'divider';

/** Selection API shared by the composable and the component. */
export interface CoarDataListSelection<T> {
  isSelected(key: CoarDataListKey): boolean;
  /**
   * Change the selection relative to `key`.
   * - `replace` (default): only this item
   * - `toggle`: add/remove it (in single mode: select or clear)
   * - `range`: from the anchor to this item (multiple mode only)
   */
  select(key: CoarDataListKey, mode?: 'replace' | 'toggle' | 'range'): void;
  /** Select every visible item (multiple mode). */
  selectAll(): void;
  clear(): void;
  /** The currently selected items, in visible order (filtered-out items are kept). */
  selectedItems: import('vue').ComputedRef<T[]>;
}
