/**
 * Public types for `<CoarTree>`.
 *
 * The tree is generic over the consumer's node type `T` — identity, children and
 * label are extracted via prop functions rather than imposed by a fixed shape.
 * This lets the same tree render file systems, navigation hierarchies, settings
 * trees, org charts, etc. without forcing a common base type.
 */

/** Where a drop lands relative to a target node. */
export type CoarTreeDropPosition = 'before' | 'inside' | 'after';

/**
 * How rows respond to clicks / keyboard.
 * - `'single'` (default): one highlighted row at a time, bound to `v-model:selected`.
 * - `'multiple'`: many highlighted rows (Ctrl/Cmd-toggle, Shift-range, Ctrl+A),
 *   bound to `v-model:selectedIds`.
 * - `'checkbox'`: a per-row checkbox with tri-state parent/child cascade, bound to
 *   `v-model:checkedIds` — independent of the highlight selection (`selectedIds`),
 *   which still works exactly like `'multiple'`.
 */
export type CoarTreeSelectionMode = 'single' | 'multiple' | 'checkbox';

/** Payload for {@link CoarTreeEmits.node-move}. */
export interface CoarTreeNodeMoveEvent<T> {
  /**
   * Node being moved. Re-resolved from the live tree at drop time, so it
   * reflects the latest data even if `nodes` changed during the drag. Treat
   * `source`'s id as the source of truth: if your handler does async work,
   * re-resolve the node by id rather than holding onto this object.
   */
  source: T;
  /**
   * Sibling / parent the drop is relative to. `null` means the drop landed on
   * the empty tree-pane background — typically interpreted as "move to root".
   */
  target: T | null;
  /** Where the drop landed relative to `target`. With `target: null` only `'inside'` is meaningful. */
  position: CoarTreeDropPosition;
}

/** Payload for {@link CoarTreeEmits.files-drop}. */
export interface CoarTreeFilesDropEvent<T> {
  /** Files from the OS drag-drop. */
  files: FileList;
  /** Folder the drop landed on, or `null` for the tree background (root). */
  target: T | null;
}

/** Context exposed to the default slot for rendering a row body. */
export interface CoarTreeNodeSlotProps<T> {
  node: T;
  /** Nesting depth — 0 for root nodes. */
  depth: number;
  isExpanded: boolean;
  /** True if this row is part of the highlight selection (`selected` / `selectedIds`). */
  isSelected: boolean;
  /**
   * True if this row's checkbox is fully checked (`selectionMode="checkbox"` only).
   * Always `false` in single / multiple modes.
   */
  isChecked: boolean;
  /**
   * True if this row's checkbox is in the indeterminate / "mixed" state — some but
   * not all loaded descendants are checked (`selectionMode="checkbox"` only).
   */
  isIndeterminate: boolean;
  isFocused: boolean;
  isExpandable: boolean;
  /**
   * True if `isDisabled(node)` returned true — the row is non-interactive
   * (no select / activate / direct check-toggle, skipped by keyboard focus and
   * type-ahead) and rendered `aria-disabled`. Cascade from a checked ancestor
   * still flows through it.
   */
  isDisabled: boolean;
  /**
   * True while THIS row is in inline-rename mode (only meaningful when
   * `<CoarTree :renamable>` is on). Useful for hiding hover-actions etc.
   * while the user is typing the new name.
   */
  isRenaming: boolean;
  /**
   * True while this node's children are being lazily fetched via `loadChildren`
   * (the tree shows a spinner in the chevron slot by default). Use it to gate
   * hover actions or render your own loading affordance.
   */
  isLoading: boolean;
  /**
   * True if the most recent lazy `loadChildren` for this node rejected. The tree
   * has no default error visual — render a retry affordance and call
   * `api.reloadChildren(id)` (or collapse + re-expand) to try again.
   */
  hasError: boolean;
}

/** Payload for {@link CoarTreeEmits.rename}. */
export interface CoarTreeRenameEvent<T> {
  node: T;
  newName: string;
}

/** Payload for the `select` event / builder `onSelect`. */
export interface CoarTreeSelectEvent<T> {
  /** The node the change centered on (the clicked / activated row), or `null` when the selection was cleared. */
  node: T | null;
  /** The full highlight selection AFTER the change (ids). */
  ids: readonly string[];
  /** `'user'` for a click / keyboard gesture, `'api'` for a programmatic `api.selectNode` call. */
  via: 'user' | 'api';
}

/**
 * Second argument to `loadChildren`. The `signal` aborts when the folder is
 * collapsed or leaves the tree mid-flight — forward it to `fetch` (or check
 * `signal.aborted`) so a cancelled load doesn't waste work or race a later one.
 */
export interface CoarTreeLoadChildrenContext {
  signal: AbortSignal;
}

/** Payload for {@link CoarTreeEmits.load-error}. */
export interface CoarTreeLoadErrorEvent<T> {
  /**
   * The node whose lazy children failed to load — snapshotted when the load
   * started. If your handler runs async work, re-resolve by `id` rather than
   * holding this object (the consumer may have replaced it during the load).
   */
  node: T;
  /** Whatever the `loadChildren` promise rejected with. */
  error: unknown;
}

/**
 * Custom MIME type used to encode an internal node drag in `DataTransfer`.
 * Lets `dragover` distinguish internal moves from OS-file drags without
 * relying on `getData()` (which is unavailable during dragover).
 */
export const COAR_TREE_DRAG_MIME = 'application/x-coar-tree-node';

import type { InjectionKey, Ref, Slot } from 'vue';

/**
 * Internal injection key — `<CoarTree>` provides its row-rendering slot here so
 * the recursive `<CoarTreeNode>` can render it without passing the slot down
 * through prop drilling (Vue's `Slot<T>` type doesn't compose cleanly with
 * `defineSlots`-typed slots in generic components).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the InjectionKey carries a generic that the consumer narrows at use-site.
export const COAR_TREE_NODE_SLOT_KEY: InjectionKey<Slot<CoarTreeNodeSlotProps<any>>> =
  Symbol('coar-tree-node-slot');

/**
 * Internal injection key — `<CoarTreeNode>` provides its row id so
 * `<CoarTreeNodeLabel>` (and any future row-scoped helper) can read it
 * without explicit prop wiring from the consumer.
 */
export const COAR_TREE_ROW_ID_KEY: InjectionKey<string> = Symbol('coar-tree-row-id');

/**
 * Reactive row-state `<CoarTree>` provides so each `<CoarTreeNode>` can derive
 * its own selected / focused / expanded / renaming / drop flags from its id,
 * instead of the parent passing them down as props. This keeps a
 * selection / focus / drag-over change from re-rendering the whole list: only
 * the rows whose derived flag actually flips re-render (Vue caches the computed
 * and skips dependents when the value is unchanged).
 */
export interface CoarTreeRowState {
  /** Highlight-selected ids (single mode = 0-or-1 entry, multiple/checkbox = N). */
  selectedIds: Readonly<Ref<ReadonlySet<string>>>;
  /** Fully-checked ids (checkbox mode only; empty otherwise). */
  checkedIds: Readonly<Ref<ReadonlySet<string>>>;
  /** Indeterminate ids — some but not all descendants checked (checkbox mode only). */
  indeterminateIds: Readonly<Ref<ReadonlySet<string>>>;
  /** True when `selectionMode === 'checkbox'`, so rows render their checkbox affordance. */
  checkboxMode: Readonly<Ref<boolean>>;
  /** Ids whose interaction is disabled (`isDisabled` extractor). */
  disabledIds: Readonly<Ref<ReadonlySet<string>>>;
  focusedId: Readonly<Ref<string | null>>;
  expandedIds: Readonly<Ref<Set<string>>>;
  renamingId: Readonly<Ref<string | null>>;
  dropTargetId: Readonly<Ref<string | null>>;
  dropPosition: Readonly<Ref<CoarTreeDropPosition | null>>;
  fileDropTargetId: Readonly<Ref<string | null>>;
  loadingIds: Readonly<Ref<ReadonlySet<string>>>;
  erroredIds: Readonly<Ref<ReadonlySet<string>>>;
  /** When true, the built-in chevron loading spinner is suppressed (consumer renders its own from `isLoading`). */
  hideLoadingSpinner: Readonly<Ref<boolean>>;
}

export const COAR_TREE_ROW_STATE_KEY: InjectionKey<CoarTreeRowState> =
  Symbol('coar-tree-row-state');

/**
 * The rename machinery `<CoarTree :renamable>` provides to descendants.
 * `<CoarTreeNodeLabel>` consumes this; consumers normally never see it
 * directly — they just drop `<CoarTreeNodeLabel :node :label>` into the
 * default slot.
 */
export interface CoarTreeRenameContext {
  /** Id of the row currently in rename mode, or `null` if none. */
  readonly renamingId: Readonly<Ref<string | null>>;
  /** Two-way buffer for the input — `v-model` it on the rename input. */
  readonly buffer: Ref<string>;
  /** Commit the current buffer. Tree emits `@rename` then clears state. */
  commit: () => void;
  /** Drop the buffer, leave the original name as-is. */
  cancel: () => void;
  /** Wired to the rename input's `@focus`. Starts the blur grace timer. */
  onFocus: () => void;
  /** Wired to the rename input's `@blur`. Commits after the grace period. */
  onBlur: () => void;
}

export const COAR_TREE_RENAME_KEY: InjectionKey<CoarTreeRenameContext> =
  Symbol('coar-tree-rename');

// ────────────────────────────────────────────────────────────────────────────
//  Builder-API: declarative context-menu items
// ────────────────────────────────────────────────────────────────────────────

/**
 * One entry in a builder-driven context menu. `'divider'` is the only string
 * literal allowed — everything else is an object with `label` + `onClick`.
 */
export type CoarTreeMenuEntry = CoarTreeMenuItem | 'divider';

// ────────────────────────────────────────────────────────────────────────────
//  Virtualization
// ────────────────────────────────────────────────────────────────────────────

/**
 * Options for `<CoarTree :virtualize>` / `builder.virtualize(...)`.
 *
 * `useVirtualList` is a *fixed-known-size* virtualizer (no DOM auto-measure),
 * so the consumer must declare row heights up front. The default of 28px
 * matches the standard row layout (13px text + 6px vertical padding); change
 * `itemSize` to match if the slot adds extra padding or multi-line content.
 */
export interface CoarTreeVirtualOptions {
  /**
   * Row height in pixels. Either a constant, or a function returning the
   * height for the visible-row at the given index. Default: 28.
   */
  itemSize?: number | ((index: number) => number);
  /** Rows rendered above/below the viewport as a scroll buffer. Default: 5. */
  overscan?: number;
}

/**
 * Prop shorthand: pass `true` to enable virtualization with defaults, an
 * object to customize, or omit / `false` to disable.
 */
export type CoarTreeVirtualizeProp = boolean | CoarTreeVirtualOptions;

export interface CoarTreeMenuItem {
  /** Visible label. Required (use `disabled: true` if the item is a placeholder). */
  label: string;
  /** Optional icon name — passed through to `<CoarMenuItem :icon>`. */
  icon?: string;
  /** Marks the item as destructive (red text on hover). */
  danger?: boolean;
  /** Grays the item out and disables clicks. */
  disabled?: boolean;
  /** Invoked on click. The tree closes the menu automatically afterwards. */
  onClick: () => void;
}
