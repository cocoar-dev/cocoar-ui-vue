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
  CoarTreeDropPosition,
  CoarTreeFilesDropEvent,
  CoarTreeLoadErrorEvent,
  CoarTreeMenuEntry,
  CoarTreeNodeMoveEvent,
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
  draggable: MaybeRefOrGetter<boolean | ((n: T) => boolean)>;
  canDrop?: (s: T, t: T | null, p: CoarTreeDropPosition) => boolean;
  acceptsFiles: MaybeRefOrGetter<boolean>;
  autoExpandDelay: MaybeRefOrGetter<number>;
  virtualize: MaybeRefOrGetter<CoarTreeVirtualizeProp>;

  expanded: Ref<Set<string>>;
  selected: Ref<string | null>;

  onActivate?: (node: T) => void;
  onNodeMove?: (e: CoarTreeNodeMoveEvent<T>) => void;
  onFilesDrop?: (e: CoarTreeFilesDropEvent<T>) => void;

  /** Lazily fetch a node's children when it's expanded (see `loadChildren` setter). */
  loadChildren?: (node: T) => void | Promise<void>;
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
 * Public, narrow imperative interface returned by `useTree().api`. Keeps
 * component refs out of consumer code: you call `api.focusNode('x')` instead
 * of digging into a template ref. Readonly refs (`selectedId`, `expandedIds`)
 * mirror the builder state so consumers can `watch()` them without owning
 * the writable refs themselves.
 */
export interface TreeApi {
  /** Programmatically move focus + selection to a node. No-op until `<CoarTree>` is mounted. */
  focusNode(id: string): void;
  /**
   * Force `loadChildren` to (re)run for a node — for a retry after a load error
   * or to refresh an already-loaded folder. No-op until `<CoarTree>` is mounted.
   */
  reloadChildren(id: string): void;
  /** Selected node id (read-only). */
  readonly selectedId: Ref<string | null>;
  /** Currently expanded ids (read-only). */
  readonly expandedIds: Ref<Set<string>>;
}

export class TreeBuilder<T> {
  readonly state: TreeBuilderState<T>;
  readonly api: TreeApi;

  private _focusNodeImpl: ((id: string) => void) | null = null;
  private _reloadChildrenImpl: ((id: string) => void) | null = null;

  private constructor(state: TreeBuilderState<T>) {
    this.state = state;
    this.api = {
      focusNode: (id) => {
        if (this._focusNodeImpl) this._focusNodeImpl(id);
        else if (typeof console !== 'undefined') {
          // Until `<CoarTree>` mounts and registers its focus impl, the call
          // is a no-op — surface that so consumers calling api.focusNode()
          // during setup get a useful warning instead of silent dead code.
          console.warn(
            '[TreeBuilder.api.focusNode] called before <CoarTree> mounted. The call was a no-op; move it into onMounted / a user-triggered handler.',
          );
        }
      },
      reloadChildren: (id) => {
        if (this._reloadChildrenImpl) this._reloadChildrenImpl(id);
        else if (typeof console !== 'undefined') {
          console.warn(
            '[TreeBuilder.api.reloadChildren] called before <CoarTree> mounted. The call was a no-op; move it into onMounted / a user-triggered handler.',
          );
        }
      },
      selectedId: state.selected,
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
      draggable: false,
      canDrop: undefined,
      acceptsFiles: false,
      autoExpandDelay: 700,
      virtualize: false,
      expanded: ref(new Set<string>()),
      selected: ref<string | null>(null),
      onActivate: undefined,
      onNodeMove: undefined,
      onFilesDrop: undefined,
      loadChildren: undefined,
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
   */
  loadChildren(fn: (node: T) => void | Promise<void>): this {
    this.state.loadChildren = fn;
    return this;
  }

  // ─── Behavior ────────────────────────────────────────────────────────────

  /** Enable internal drag-to-reorder. Accepts a per-node predicate. */
  draggable(d: MaybeRefOrGetter<boolean | ((n: T) => boolean)>): this {
    this.state.draggable = d;
    return this;
  }

  canDrop(fn: (source: T, target: T | null, position: CoarTreeDropPosition) => boolean): this {
    this.state.canDrop = fn;
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

  /** Bind the selected-node id. Must be a writable `Ref<string | null>`. */
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

  // ─── Handlers ────────────────────────────────────────────────────────────

  /** Fires on double-click or Enter on the focused row. */
  onActivate(h: (node: T) => void): this {
    this.state.onActivate = h;
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

  /** @internal — `<CoarTree>` registers its focus impl on mount. */
  _setFocusNodeImpl(fn: ((id: string) => void) | null): void {
    this._focusNodeImpl = fn;
  }

  /** @internal — `<CoarTree>` registers its reload-children impl on mount. */
  _setReloadChildrenImpl(fn: ((id: string) => void) | null): void {
    this._reloadChildrenImpl = fn;
  }
}
