/**
 * `TreeBuilder` — fluent configuration for `<CoarTree>`.
 *
 * Modeled after `CalendarBuilder` (see `@cocoar/vue-calendar`): one class, one
 * source of truth, every setter returns `this`. The component reads from the
 * builder via `toValue(state.X)` so the setters can take `MaybeRefOrGetter`
 * values and stay reactive without ceremony.
 *
 * **Two flavours of context menu.** For each of the three targets (folder /
 * leaf / viewport) there's a *declarative* setter (`folderMenu` etc.) that
 * lets the tree own the entire menu, AND an *event* setter
 * (`onFolderContextMenu` etc.) that hands you the raw event so you can render
 * something custom. If both are set for the same target, the event handler
 * wins — it's the explicit escape hatch.
 */

import {
  type MaybeRefOrGetter,
  type Ref,
  isRef,
  ref,
  shallowReactive,
} from 'vue';
import type {
  CoarTreeCreateEvent,
  CoarTreeDensity,
  CoarTreeDropPosition,
  CoarTreeFilesDropEvent,
  CoarTreeFilterMode,
  CoarTreeLabels,
  CoarTreeLoadChildrenContext,
  CoarTreeLoadErrorEvent,
  CoarTreeMenuEntry,
  CoarTreeNodeMoveEvent,
  CoarTreeRenameEvent,
  CoarTreeSelectEvent,
  CoarTreeSelectionMode,
  CoarTreeStartCreateOptions,
  CoarTreeVirtualizeProp,
} from './tree-types';

/**
 * Internal mutable state owned by the builder. Held as `shallowReactive` so
 * mid-session mutations (e.g. `builder.draggable(true)` after mount) trigger
 * the component to re-evaluate.
 */
export interface TreeBuilderState<T> {
  nodes: MaybeRefOrGetter<readonly T[]>;
  getId: (n: T) => string;
  getChildren?: (n: T) => readonly T[] | null | undefined;
  getLabel?: (n: T) => string;
  isExpandable?: (n: T) => boolean;
  isDisabled?: (n: T) => boolean;
  draggable: MaybeRefOrGetter<boolean | ((n: T) => boolean)>;
  canDrop?: (s: T, t: T | null, p: CoarTreeDropPosition) => boolean;
  getDragImage?: (n: T) => HTMLElement | string | null | undefined;
  activateOnClick: MaybeRefOrGetter<boolean>;
  acceptsFiles: MaybeRefOrGetter<boolean>;
  autoExpandDelay: MaybeRefOrGetter<number>;
  virtualize: MaybeRefOrGetter<CoarTreeVirtualizeProp>;
  hideLoadingSpinner: MaybeRefOrGetter<boolean>;
  /** Opt into the built-in inline-rename UI (see `renamable` setter). */
  renamable: MaybeRefOrGetter<boolean>;
  onRename?: (e: CoarTreeRenameEvent<T>) => void;
  onRenameCancel?: (node: T) => void;
  /** Opt into the built-in inline-create UI (see `creatable` setter). */
  creatable: MaybeRefOrGetter<boolean>;
  onCreate?: (e: CoarTreeCreateEvent) => void;
  onCreateCancel?: () => void;
  selectionMode: MaybeRefOrGetter<CoarTreeSelectionMode>;
  /** Checkbox-mode only: independent parent/child checks, no cascade / indeterminate. */
  checkStrictly: MaybeRefOrGetter<boolean>;
  density: MaybeRefOrGetter<CoarTreeDensity>;
  ariaLabel: MaybeRefOrGetter<string | undefined>;
  ariaLabelledby: MaybeRefOrGetter<string | undefined>;
  labels: MaybeRefOrGetter<Partial<CoarTreeLabels> | undefined>;
  /** Search-hit ids — drives `isMatch`/`isMatchAncestor` + auto-expand-to-match. */
  matchedIds: MaybeRefOrGetter<Set<string> | undefined>;
  /** With `matchedIds`, hide non-matches. `filterMode` controls what's kept around a match. */
  filter: MaybeRefOrGetter<boolean>;
  filterMode: MaybeRefOrGetter<CoarTreeFilterMode>;

  expanded: Ref<Set<string>>;
  /** Single-mode highlight selection. */
  selected: Ref<string | null>;
  /** Multiple/checkbox-mode highlight selection. */
  selectedIds: Ref<Set<string>>;
  /** Checkbox-mode checked set (fully-checked nodes; indeterminate is derived). */
  checkedIds: Ref<Set<string>>;

  onActivate?: (node: T) => void;
  onSelect?: (e: CoarTreeSelectEvent<T>) => void;
  onNodeMove?: (e: CoarTreeNodeMoveEvent<T>) => void;
  onFilesDrop?: (e: CoarTreeFilesDropEvent<T>) => void;

  /** Lazily fetch a node's children when it's expanded (see `loadChildren` setter). */
  loadChildren?: (node: T, ctx: CoarTreeLoadChildrenContext) => void | Promise<void>;
  /** Max simultaneous in-flight loads; extra ones queue. 0/undefined = unlimited. */
  maxConcurrentLoads: MaybeRefOrGetter<number>;
  onLoadError?: (e: CoarTreeLoadErrorEvent<T>) => void;

  /** Declarative menus — `<CoarTree>` renders the menu itself when these are set. */
  folderMenu?: (folder: T) => readonly CoarTreeMenuEntry[];
  leafMenu?: (leaf: T) => readonly CoarTreeMenuEntry[];
  viewportMenu?: () => readonly CoarTreeMenuEntry[];

  /** Event variants — escape hatch. If set, the declarative menu for the same target is bypassed. */
  onFolderContextMenu?: (folder: T, ev: MouseEvent) => void;
  onLeafContextMenu?: (leaf: T, ev: MouseEvent) => void;
  onViewportContextMenu?: (ev: MouseEvent) => void;
}

/**
 * The imperative operations `<CoarTree>` registers on mount. The {@link TreeApi}
 * delegates to these; before mount they're absent, so action methods warn +
 * no-op and `getNode` returns `null`.
 * @internal
 */
export interface TreeApiImpls<T> {
  focusNode(id: string): void;
  selectNode(id: string): void;
  reloadChildren(id: string): void;
  startRename(id: string): void;
  startCreate(parentId: string | null, opts?: CoarTreeStartCreateOptions): void;
  expandAll(): void;
  collapseAll(): void;
  expandTo(id: string): void;
  revealNode(id: string): void;
  getNode(id: string): T | null;
  moveNode(sourceId: string, targetId: string | null, position: CoarTreeDropPosition): boolean;
}

/**
 * Public, narrow imperative interface returned by `useTree().api`. Keeps
 * component refs out of consumer code: you call `api.selectNode('x')` instead
 * of digging into a template ref. Readonly refs (`selectedId`, `expandedIds`, …)
 * mirror the builder state so consumers can `watch()` them without owning
 * the writable refs themselves. Action methods are no-ops (with a DEV warning)
 * until `<CoarTree>` mounts.
 */
export interface TreeApi<T = unknown> {
  /** Highlight-select AND focus a node (the "reveal & select" action). Preferred over `focusNode`. */
  selectNode(id: string): void;
  /** Alias of {@link selectNode} (selects + focuses) — retained for back-compat since 2.4.0. */
  focusNode(id: string): void;
  /** Force `loadChildren` to (re)run for a node — retry after error / refresh. */
  reloadChildren(id: string): void;
  /** Enter inline-rename mode on a node (requires `renamable`). */
  startRename(id: string): void;
  /**
   * Open an inline-create draft under `parentId` (`null` = root); requires
   * `creatable`. Commits via the `onCreate` handler / `@create` event.
   */
  startCreate(parentId: string | null, opts?: CoarTreeStartCreateOptions): void;
  /** Expand every expandable, currently-loaded node. */
  expandAll(): void;
  /** Collapse everything. */
  collapseAll(): void;
  /** Expand all loaded ancestors of `id` so its row becomes visible. */
  expandTo(id: string): void;
  /** Scroll a node into view without changing focus or selection (expands ancestors first). */
  revealNode(id: string): void;
  /** Resolve a node by id from the loaded tree, or `null` (also `null` before mount). */
  getNode(id: string): T | null;
  /**
   * Programmatically move a node — the keyboard / a11y-accessible equivalent of a
   * drag-drop. Runs the same cycle + `canDrop` guards and fires `node-move`.
   * Returns `true` if the move was emitted, `false` if rejected (or before mount).
   */
  moveNode(sourceId: string, targetId: string | null, position: CoarTreeDropPosition): boolean;
  /** Selected node id (read-only, single mode). */
  readonly selectedId: Ref<string | null>;
  /** Highlight-selected ids (read-only, multiple/checkbox mode). */
  readonly selectedIds: Ref<Set<string>>;
  /** Checked ids (read-only, checkbox mode). */
  readonly checkedIds: Ref<Set<string>>;
  /** Currently expanded ids (read-only). */
  readonly expandedIds: Ref<Set<string>>;
}

export class TreeBuilder<T> {
  readonly state: TreeBuilderState<T>;
  readonly api: TreeApi<T>;

  private _impls: TreeApiImpls<T> | null = null;

  private _warnUnmounted(method: string): void {
    if (typeof console !== 'undefined') {
      console.warn(
        `[TreeBuilder.api.${method}] called before <CoarTree> mounted. The call was a no-op; move it into onMounted / a user-triggered handler.`,
      );
    }
  }

  private constructor(state: TreeBuilderState<T>) {
    this.state = state;
    // Curried delegators: action methods warn + no-op until the component binds.
    const act =
      (name: keyof TreeApiImpls<T>) =>
      (id: string): void => {
        const impls = this._impls;
        if (impls) (impls[name] as (id: string) => void)(id);
        else this._warnUnmounted(name);
      };
    const act0 = (name: 'expandAll' | 'collapseAll') => (): void => {
      const impls = this._impls;
      if (impls) impls[name]();
      else this._warnUnmounted(name);
    };
    this.api = {
      focusNode: act('focusNode'),
      selectNode: act('selectNode'),
      reloadChildren: act('reloadChildren'),
      startRename: act('startRename'),
      startCreate: (parentId, opts) => {
        const impls = this._impls;
        if (impls) impls.startCreate(parentId, opts);
        else this._warnUnmounted('startCreate');
      },
      expandTo: act('expandTo'),
      revealNode: act('revealNode'),
      expandAll: act0('expandAll'),
      collapseAll: act0('collapseAll'),
      getNode: (id) => this._impls?.getNode(id) ?? null,
      moveNode: (sourceId, targetId, position) => {
        if (this._impls) return this._impls.moveNode(sourceId, targetId, position);
        this._warnUnmounted('moveNode');
        return false;
      },
      selectedId: state.selected,
      selectedIds: state.selectedIds,
      checkedIds: state.checkedIds,
      expandedIds: state.expanded,
    };
  }

  /** Factory — keeps construction sites consistent across call sites. */
  static create<T>(): TreeBuilder<T> {
    const state = shallowReactive<TreeBuilderState<T>>({
      nodes: [] as readonly T[],
      getId: () => {
        throw new Error('TreeBuilder: .getId(fn) must be set before mounting <CoarTree>.');
      },
      getChildren: undefined,
      getLabel: undefined,
      isExpandable: undefined,
      isDisabled: undefined,
      draggable: false,
      canDrop: undefined,
      getDragImage: undefined,
      activateOnClick: false,
      acceptsFiles: false,
      autoExpandDelay: 700,
      virtualize: false,
      hideLoadingSpinner: false,
      renamable: false,
      onRename: undefined,
      onRenameCancel: undefined,
      creatable: false,
      onCreate: undefined,
      onCreateCancel: undefined,
      selectionMode: 'single',
      checkStrictly: false,
      density: 'm',
      ariaLabel: undefined,
      ariaLabelledby: undefined,
      labels: undefined,
      matchedIds: undefined,
      filter: false,
      filterMode: 'strict',
      expanded: ref(new Set<string>()),
      selected: ref<string | null>(null),
      selectedIds: ref(new Set<string>()),
      checkedIds: ref(new Set<string>()),
      onActivate: undefined,
      onSelect: undefined,
      onNodeMove: undefined,
      onFilesDrop: undefined,
      loadChildren: undefined,
      maxConcurrentLoads: 0,
      onLoadError: undefined,
      folderMenu: undefined,
      leafMenu: undefined,
      viewportMenu: undefined,
      onFolderContextMenu: undefined,
      onLeafContextMenu: undefined,
      onViewportContextMenu: undefined,
    });
    return new TreeBuilder<T>(state);
  }

  // ─── Data ─────────────────────────────────────────────────────────────────

  /** Root nodes. Accepts a `Ref`, getter, or plain array. */
  nodes(source: MaybeRefOrGetter<readonly T[]>): this {
    this.state.nodes = source;
    return this;
  }

  getId(fn: (n: T) => string): this {
    this.state.getId = fn;
    return this;
  }

  getChildren(fn: (n: T) => readonly T[] | null | undefined): this {
    this.state.getChildren = fn;
    return this;
  }

  /** Label extractor — used by type-ahead keyboard navigation. */
  getLabel(fn: (n: T) => string): this {
    this.state.getLabel = fn;
    return this;
  }

  /**
   * Override the default "branch if `getChildren` returns an array" rule.
   * Useful for lazy-loaded folders that should render as expandable even
   * before their children are fetched.
   */
  isExpandable(fn: (n: T) => boolean): this {
    this.state.isExpandable = fn;
    return this;
  }

  /**
   * Mark nodes as non-interactive: disabled rows can't be selected, activated,
   * directly checked, focused by keyboard, or matched by type-ahead, and render
   * `aria-disabled`. (Cascade from a checked ancestor still includes them.)
   */
  isDisabled(fn: (n: T) => boolean): this {
    this.state.isDisabled = fn;
    return this;
  }

  /**
   * Lazily fetch a node's children the first time it's expanded while it has no
   * loaded children yet. Return a `Promise` and the tree shows a spinner on the
   * row until it settles; on rejection the row flips to an error state and
   * `onLoadError` fires. Pair with `.isExpandable(() => true)` (or per-node) so
   * folders render expandable BEFORE their children exist — the consumer attaches
   * the fetched children to its own `nodes`.
   *
   * Attach so `nodes` updates reactively: produce a NEW root reference
   * (`nodes.value = [...]`) or keep `nodes` deeply reactive. A pure in-place
   * mutation on a shallow source won't re-render the row (the spinner persists).
   *
   * The 2nd arg carries an `AbortSignal` that fires if the folder collapses or
   * leaves the tree mid-flight — forward it to `fetch` so a cancelled load
   * doesn't waste work or race a later reopen.
   */
  loadChildren(fn: (node: T, ctx: CoarTreeLoadChildrenContext) => void | Promise<void>): this {
    this.state.loadChildren = fn;
    return this;
  }

  /**
   * Cap simultaneous in-flight `loadChildren` calls; extra ones queue. `0`
   * (default) = unlimited. Set a small number (e.g. 6) for rate-limited backends.
   */
  maxConcurrentLoads(n: MaybeRefOrGetter<number>): this {
    this.state.maxConcurrentLoads = n;
    return this;
  }

  // ─── Behavior ────────────────────────────────────────────────────────────

  /** Enable internal drag-to-reorder. Accepts a per-node predicate. */
  draggable(d: MaybeRefOrGetter<boolean | ((n: T) => boolean)>): this {
    this.state.draggable = d;
    return this;
  }

  /**
   * Veto drops. Return `false` to disallow dropping `source` at `position`
   * relative to `target` (`null` target = the root background). Advisory: `source`
   * is the dragstart snapshot (not re-resolved per `dragover`), so read identity,
   * not mutable fields. Integrity (no node into its own descendant) is always
   * guaranteed by the built-in cycle guard regardless of what `canDrop` returns.
   */
  canDrop(fn: (source: T, target: T | null, position: CoarTreeDropPosition) => boolean): this {
    this.state.canDrop = fn;
    return this;
  }

  /** Custom drag ghost for a node: return an `HTMLElement` or HTML string (else the default row image). */
  getDragImage(fn: (n: T) => HTMLElement | string | null | undefined): this {
    this.state.getDragImage = fn;
    return this;
  }

  /** Fire `onActivate` on a single click too (not only double-click / Enter). Default false. */
  activateOnClick(b: MaybeRefOrGetter<boolean>): this {
    this.state.activateOnClick = b;
    return this;
  }

  acceptsFiles(b: MaybeRefOrGetter<boolean>): this {
    this.state.acceptsFiles = b;
    return this;
  }

  autoExpandDelay(ms: MaybeRefOrGetter<number>): this {
    this.state.autoExpandDelay = ms;
    return this;
  }

  /**
   * Enable virtualization. Pass `true` for defaults (itemSize: 28, overscan: 5)
   * or an object for custom row height / overscan. Required for trees with
   * hundreds+ of visible rows; pure overhead for small trees.
   *
   * When virtualized, the tree owns its scroll container — give it an explicit
   * height (or put it in a sized flex/grid cell) so the viewport is measurable.
   */
  virtualize(v: MaybeRefOrGetter<CoarTreeVirtualizeProp>): this {
    this.state.virtualize = v;
    return this;
  }

  /**
   * Suppress the built-in spinner the tree shows in the chevron while a node's
   * children lazily load. Set this when you render your own loading indicator
   * from the `isLoading` slot prop (e.g. replacing the row icon).
   */
  hideLoadingSpinner(b: MaybeRefOrGetter<boolean>): this {
    this.state.hideLoadingSpinner = b;
    return this;
  }

  /**
   * Enable the built-in inline-rename UI. With it on, `api.startRename(id)` and
   * F2 on the focused row swap `<CoarTreeNodeLabel>` to an `<input>`; commit on
   * Enter / blur fires `onRename`, Escape / empty fires `onRenameCancel`.
   */
  renamable(b: MaybeRefOrGetter<boolean>): this {
    this.state.renamable = b;
    return this;
  }

  /**
   * Enable the built-in inline-create UI. With it on, `api.startCreate(parentId, opts?)`
   * inserts a focused draft `<input>` row at its target position (auto-expanding
   * the parent); commit fires `onCreate` with `{ parentId, name, kind }`, an empty
   * name or Escape fires `onCreateCancel`. The draft is transient — persist the
   * node in `onCreate` and supply the real one via `.nodes(...)`.
   */
  creatable(b: MaybeRefOrGetter<boolean>): this {
    this.state.creatable = b;
    return this;
  }

  /**
   * Selection behavior: `'single'` (default), `'multiple'` (Ctrl/Shift/Ctrl+A on
   * `selectedIds`), or `'checkbox'` (per-row tri-state checkbox on `checkedIds`,
   * independent of the highlight selection). See {@link CoarTreeSelectionMode}.
   */
  selectionMode(m: MaybeRefOrGetter<CoarTreeSelectionMode>): this {
    this.state.selectionMode = m;
    return this;
  }

  /**
   * Checkbox mode only: when `true`, checking a node does NOT cascade to its
   * parent/children and no node is ever indeterminate. Default `false`
   * (cascade + tri-state, the file-tree convention).
   */
  checkStrictly(b: MaybeRefOrGetter<boolean>): this {
    this.state.checkStrictly = b;
    return this;
  }

  /** Row density (`xs`/`s`/`m`/`l`, default `m`). Sets the spacing CSS variables. */
  density(d: MaybeRefOrGetter<CoarTreeDensity>): this {
    this.state.density = d;
    return this;
  }

  /** Accessible name for the tree (`aria-label` on the `role="tree"` element). */
  ariaLabel(label: MaybeRefOrGetter<string | undefined>): this {
    this.state.ariaLabel = label;
    return this;
  }

  /** Id of an external label element (`aria-labelledby` on the `role="tree"` element). */
  ariaLabelledby(id: MaybeRefOrGetter<string | undefined>): this {
    this.state.ariaLabelledby = id;
    return this;
  }

  /** Override built-in UI / screen-reader strings for i18n (unset fields use English defaults). */
  labels(l: MaybeRefOrGetter<Partial<CoarTreeLabels> | undefined>): this {
    this.state.labels = l;
    return this;
  }

  /**
   * Search-hit ids. Drives `isMatch` / `isMatchAncestor` slot props and
   * auto-expands the ancestors of every match. Filtering the node set is still
   * the consumer's job (e.g. a computed passed to `.nodes()`).
   */
  matchedIds(ids: MaybeRefOrGetter<Set<string> | undefined>): this {
    this.state.matchedIds = ids;
    return this;
  }

  /**
   * With `matchedIds` set, hide everything that isn't a match, an ancestor of a
   * match (kept as a "virtual parent" for context), or a descendant of a match.
   * Default false (highlight-only).
   */
  filter(b: MaybeRefOrGetter<boolean>): this {
    this.state.filter = b;
    return this;
  }

  /**
   * How `filter` prunes: `'strict'` (default) = matches + ancestor path only;
   * `'lenient'` = a matched folder reveals its whole subtree. See {@link CoarTreeFilterMode}.
   */
  filterMode(m: MaybeRefOrGetter<CoarTreeFilterMode>): this {
    this.state.filterMode = m;
    return this;
  }

  // ─── State (writable refs) ───────────────────────────────────────────────

  /**
   * Bind the set of expanded folder ids. Must be a writable `Ref` — `api`
   * and folder toggles need to write back. Getters are rejected at runtime
   * because they would silently lose writes.
   */
  expanded(r: Ref<Set<string>>): this {
    if (!isRef(r)) {
      throw new Error(
        '[TreeBuilder.expanded] requires a Ref<Set<string>>. Pass `ref(new Set<string>(...))`, not a plain Set or a getter.',
      );
    }
    this.state.expanded = r;
    (this.api as { expandedIds: Ref<Set<string>> }).expandedIds = r;
    return this;
  }

  /** Bind the selected-node id (single mode). Must be a writable `Ref<string | null>`. */
  selected(r: Ref<string | null>): this {
    if (!isRef(r)) {
      throw new Error(
        '[TreeBuilder.selected] requires a Ref<string | null>. Pass `ref<string | null>(null)`, not a plain value.',
      );
    }
    this.state.selected = r;
    (this.api as { selectedId: Ref<string | null> }).selectedId = r;
    return this;
  }

  /**
   * Bind the highlight-selection set (multiple / checkbox modes). Must be a
   * writable `Ref<Set<string>>` — Ctrl/Shift/Ctrl+A and `api` write back.
   */
  selectedIds(r: Ref<Set<string>>): this {
    if (!isRef(r)) {
      throw new Error(
        '[TreeBuilder.selectedIds] requires a Ref<Set<string>>. Pass `ref(new Set<string>())`, not a plain Set or a getter.',
      );
    }
    this.state.selectedIds = r;
    (this.api as { selectedIds: Ref<Set<string>> }).selectedIds = r;
    return this;
  }

  /**
   * Bind the checked set (checkbox mode). Must be a writable `Ref<Set<string>>`.
   * Holds every fully-checked node; the indeterminate set is derived internally.
   */
  checkedIds(r: Ref<Set<string>>): this {
    if (!isRef(r)) {
      throw new Error(
        '[TreeBuilder.checkedIds] requires a Ref<Set<string>>. Pass `ref(new Set<string>())`, not a plain Set or a getter.',
      );
    }
    this.state.checkedIds = r;
    (this.api as { checkedIds: Ref<Set<string>> }).checkedIds = r;
    return this;
  }

  // ─── Handlers ────────────────────────────────────────────────────────────

  /** Fires on double-click or Enter on the focused row. */
  onActivate(h: (node: T) => void): this {
    this.state.onActivate = h;
    return this;
  }

  /**
   * Fires whenever the highlight selection changes, with the primary node, the
   * full selected-id set, and whether it was a user gesture or an `api` call.
   */
  onSelect(h: (e: CoarTreeSelectEvent<T>) => void): this {
    this.state.onSelect = h;
    return this;
  }

  /** Fires after an internal drag-drop completes. The consumer mutates the tree. */
  onNodeMove(h: (e: CoarTreeNodeMoveEvent<T>) => void): this {
    this.state.onNodeMove = h;
    return this;
  }

  /** Fires when OS files are dropped onto a folder or the empty background. */
  onFilesDrop(h: (e: CoarTreeFilesDropEvent<T>) => void): this {
    this.state.onFilesDrop = h;
    return this;
  }

  /** Fires when an inline rename is committed (Enter / blur with a non-empty name). */
  onRename(h: (e: CoarTreeRenameEvent<T>) => void): this {
    this.state.onRename = h;
    return this;
  }

  /** Fires when an inline rename is cancelled (Escape, or committed empty). */
  onRenameCancel(h: (node: T) => void): this {
    this.state.onRenameCancel = h;
    return this;
  }

  /** Fires when an inline create is committed (Enter / blur with a non-empty name). */
  onCreate(h: (e: CoarTreeCreateEvent) => void): this {
    this.state.onCreate = h;
    return this;
  }

  /** Fires when an inline create is cancelled (Escape, or committed empty). */
  onCreateCancel(h: () => void): this {
    this.state.onCreateCancel = h;
    return this;
  }

  /** Fires when a lazy `loadChildren` promise rejects. */
  onLoadError(h: (e: CoarTreeLoadErrorEvent<T>) => void): this {
    this.state.onLoadError = h;
    return this;
  }

  // ─── Declarative context menus ───────────────────────────────────────────

  /**
   * Items shown when right-clicking a folder row. When set (and the
   * `onFolderContextMenu` escape hatch is NOT set), `<CoarTree>` renders a
   * `<CoarContextMenu>` itself — no extra markup needed in your template.
   *
   * Pass an array of `{ label, icon?, danger?, disabled?, onClick }` entries
   * or the literal string `'divider'`.
   */
  folderMenu(fn: (folder: T) => readonly CoarTreeMenuEntry[]): this {
    this.state.folderMenu = fn;
    return this;
  }

  /** Same as {@link folderMenu} but for leaf (non-folder) nodes. */
  leafMenu(fn: (leaf: T) => readonly CoarTreeMenuEntry[]): this {
    this.state.leafMenu = fn;
    return this;
  }

  /**
   * Items shown when right-clicking the empty background of the tree pane.
   * No node argument — there isn't one.
   */
  viewportMenu(fn: () => readonly CoarTreeMenuEntry[]): this {
    this.state.viewportMenu = fn;
    return this;
  }

  // ─── Event-variant context menus (escape hatches) ────────────────────────

  /**
   * Raw `contextmenu` event for folder rows. Overrides {@link folderMenu} —
   * use when you want a fully custom popover (e.g. with form inputs, async
   * sub-menus, or a third-party menu library).
   */
  onFolderContextMenu(h: (folder: T, ev: MouseEvent) => void): this {
    this.state.onFolderContextMenu = h;
    return this;
  }

  /** Same as {@link onFolderContextMenu} for leaf rows. Overrides {@link leafMenu}. */
  onLeafContextMenu(h: (leaf: T, ev: MouseEvent) => void): this {
    this.state.onLeafContextMenu = h;
    return this;
  }

  /** Same as {@link onFolderContextMenu} for the empty background. Overrides {@link viewportMenu}. */
  onViewportContextMenu(h: (ev: MouseEvent) => void): this {
    this.state.onViewportContextMenu = h;
    return this;
  }

  // ─── Internal: component wiring ──────────────────────────────────────────

  /** @internal — `<CoarTree>` registers its imperative impls on mount, clears (null) on unmount. */
  _bindImpls(impls: TreeApiImpls<T> | null): void {
    this._impls = impls;
  }
}
