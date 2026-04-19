import type { Component } from 'vue';

/**
 * Represents an item in a listbox.
 */
export interface CoarListboxOption<T = unknown> {
  /** The underlying value of the item. */
  value: T;
  /** The display label. Required — used for default rendering, default search, and a11y. */
  label: string;
  /** Optional discriminator used to pick a custom renderer (itemComponents[kind] or #item-<kind> slot). */
  kind?: string;
  /** Optional group key — items with the same group render under a shared heading. */
  group?: string;
  /** Optional icon name (default renderer only). */
  icon?: string;
  /** Optional second line rendered muted (default renderer only). */
  subtitle?: string;
  /** Optional native tooltip (`title` attribute) on the item element. */
  tooltip?: string;
  /** Disables highlighting/activation for this item. */
  disabled?: boolean;
  /** Overrides the text used when the default search (`searchFields`) examines this item. */
  searchText?: string;
}

/** Side identifier passed to slot/component renderers so the same component can render differently per column. */
export type CoarListboxSide = 'available' | 'selected';

/** Props received by a custom item component registered via `itemComponents`. */
export interface CoarListboxItemComponentProps<T = unknown> {
  item: CoarListboxOption<T>;
  highlighted: boolean;
  selectable: boolean;
  side?: CoarListboxSide;
  /** Imperative API bound to this item — call `remove()`, `activate()`, etc. from inside a custom renderer. */
  api: CoarListboxItemApi<T>;
}

/**
 * Imperative handle passed to each rendered item (via slot scope and to components
 * registered in `itemComponents`). Lets a custom renderer trigger listbox behavior —
 * remove a row from its inline trash button, activate on a key press, etc.
 *
 * Actions that can't be satisfied without the parent's help (`remove`, `action`)
 * are emitted as events on the listbox; the parent should listen and update
 * `options` accordingly. Highlight-related actions mutate `modelValue` directly.
 */
export interface CoarListboxItemApi<T = unknown> {
  /** The item this api is bound to. */
  item: CoarListboxOption<T>;
  /** Whether the item is currently in the highlight set. */
  highlighted: boolean;
  /** Replace the highlight with only this item. */
  highlight(): void;
  /** Remove this item from the highlight set. */
  unhighlight(): void;
  /** Flip this item's highlight state. */
  toggleHighlight(): void;
  /** Emit `item-activate` — same as double-click / Enter on the item. */
  activate(): void;
  /** Emit `item-remove` — the parent is expected to drop this item from `options`. */
  remove(): void;
  /** Emit a named `item-action` — an escape hatch for custom inline operations. */
  action(name: string, payload?: unknown): void;
}

/** Map from `kind` to the component rendering items of that kind. */
export type CoarListboxItemComponents = Record<string, Component>;

/** Controls sorting of groups within a list. */
export type CoarListboxSortGroups = 'asc' | 'desc' | 'none' | ((a: string, b: string) => number);

/** Controls sorting of items (within each group, or all if ungrouped). */
export type CoarListboxSortOptions<T = unknown> =
  | 'asc'
  | 'desc'
  | 'none'
  | ((a: CoarListboxOption<T>, b: CoarListboxOption<T>) => number);

/** Fields examined by the default label/subtitle/group search. */
export type CoarListboxSearchField = 'label' | 'subtitle' | 'group';

/** Shape exposed by CoarListbox via `defineExpose` (usable as a template-ref type). */
export interface CoarListboxExposed<T = unknown> {
  clearHighlight: () => void;
  highlightAll: () => void;
  focus: () => void;
  clearSearch: () => void;
  visibleItems: readonly CoarListboxOption<T>[];
}
