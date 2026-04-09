import { type Ref, type WatchSource, ref, watch, isRef } from 'vue';
import type {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  RowClickedEvent,
  RowDoubleClickedEvent,
  CellClickedEvent,
  CellDoubleClickedEvent,
  GetRowIdFunc,
  RowClassParams,
  IRowNode,
  IsExternalFilterPresentParams,
  GridSizeChangedEvent,
  CellContextMenuEvent,
  ColumnState,
  PostSortRowsParams,
  RowDragEndEvent,
  RowDragMoveEvent,
} from 'ag-grid-community';

import { CoarGridColumnBuilder, COAR_QUICK_FILTER_KEY } from './coar-grid-column-builder';
import type { QuickFilterConfig } from './coar-grid-column-builder';
import { CoarGridColumnFactory } from './coar-grid-column-factory';
import CoarGridHeader from '../header/CoarGridHeader.vue';

type ColumnBuilderLike<TData> = {
  build(): ColDef<TData>;
};

/** Column definition input - either a builder or a factory function */
export type ColumnDefinition<TData> =
  | ColumnBuilderLike<TData>
  | ((factory: CoarGridColumnFactory<TData>) => ColumnBuilderLike<TData>);

/** Configuration for tree (hierarchical) data */
export interface TreeDataConfig<TData> {
  /** Extract children from a row. Return empty array for leaf nodes. */
  children: (row: TData) => TData[];
  /** Extract a unique ID from a row. Used for tracking expanded state. */
  rowId: (row: TData) => string;
}

/** Metadata about a tree node, available to cell renderers via AG Grid context */
export interface TreeNodeMeta {
  /** Nesting depth (0 = root) */
  depth: number;
  /** Whether this node has children */
  hasChildren: boolean;
  /** Whether this node is currently expanded */
  isExpanded: boolean;
  /** Number of direct children */
  childCount: number;
}

/** Tree context available on AG Grid's `context.coarTree` */
export interface CoarTreeContext<TData = unknown> {
  meta: Map<string, TreeNodeMeta>;
  toggleRow: (id: string) => void;
  getRowId: (row: TData) => string;
}

/** Options for row drag highlight */
export interface RowDragHighlightOptions<TData> {
  /** Validate if dragged row can be dropped on target. Return `false` to show "not allowed" feedback. */
  canDrop?: (draggedData: TData, targetData: TData) => boolean;
}

/** Options for row selection */
export interface RowSelectionOptions {
  /** Show a checkbox column for selection (default: false for 'single', true for 'multiple') */
  checkboxes?: boolean;
  /** Show a select-all checkbox in the header (only applies to 'multiple' mode, default: true when checkboxes is true) */
  headerCheckbox?: boolean;
  /** Allow clicking anywhere on a row to select it (default: true) */
  enableClickSelection?: boolean;
}

/**
 * Fluent builder for AG Grid configuration.
 *
 * @example
 * ```ts
 * const gridBuilder = CoarGridBuilder.create<User>()
 *   .columns([
 *     col => col.field('name').header('Name').flex(1),
 *     col => col.field('email').header('Email').flex(1),
 *     col => col.field('role').header('Role').width(100),
 *   ])
 *   .rowData(users)
 *   .rowId(user => user.id)
 *   .onRowClicked(event => console.log(event.data));
 * ```
 */
export class CoarGridBuilder<TData = unknown> {
  #gridApi: GridApi<TData> | undefined;
  #gridElement?: HTMLElement;
  #gridReady = ref(false);
  #cleanupFns: Array<() => void> = [];

  #gridOptions: GridOptions<TData> = {};
  #columnDefs: ColDef<TData>[] = [];
  #rowData: TData[] | null = null;
  #reactiveRowData?: Ref<TData[] | null | undefined>;

  // Deferred state (applied after grid ready)
  #columnState?: ColumnState[] | Ref<ColumnState[] | undefined>;
  #openRows?: Ref<string[]>;
  #forceExpandedRef?: Ref<boolean>;
  #openRowsSnapshot?: string[];
  #sortFilterTriggers: WatchSource[] = [];
  #externalFilterTriggers: WatchSource[] = [];
  #dataPipelineTriggers: WatchSource[] = [];

  // Quick filter
  #quickFilterTextRef?: Ref<string>;
  #quickFilterFn?: (searchValue: string, data: TData) => boolean;
  #customFilterFn?: (data: TData[], searchText: string) => TData[] | null;

  // Tracks whether flex columns have been recalculated after first data
  #flexApplied = false;

  // Search highlight
  #searchHighlightEnabled = false;

  // Tree data
  #treeConfig?: TreeDataConfig<TData>;
  #treeContext: CoarTreeContext<TData> = {
    meta: new Map(),
    toggleRow: () => {},
    getRowId: () => '',
  };

  // Viewport event handlers (wired by wrapper component)
  #viewportClickHandler?: ($event: MouseEvent, api: GridApi<TData>) => void;
  #viewportContextMenuHandler?: ($event: MouseEvent, api: GridApi<TData>) => void;

  /** Reactive flag that becomes true when grid is ready */
  readonly gridReady: Readonly<Ref<boolean>> = this.#gridReady;

  private constructor() {
    this.#gridOptions = this.#createDefaultOptions();
  }

  /** Create a new grid builder */
  static create<TData>(): CoarGridBuilder<TData> {
    return new CoarGridBuilder<TData>();
  }

  /** Get the AG Grid API (available after grid ready) */
  get api(): GridApi<TData> | undefined {
    return this.#gridApi;
  }

  // ============================================================
  // Private helpers
  // ============================================================

  #createDefaultOptions(): GridOptions<TData> {
    return {
      animateRows: true,
      suppressColumnMoveAnimation: true,
      rowSelection: undefined,
      defaultColDef: {
        headerComponent: CoarGridHeader,
      },
    };
  }

  #mergeOptions(options: GridOptions<TData>): void {
    this.#gridOptions = { ...this.#gridOptions, ...options };
  }

  #composeHandler<E>(
    existing: ((event: E) => void) | undefined,
    handler: (event: E) => void
  ): (event: E) => void {
    if (existing) {
      return (event: E) => {
        existing(event);
        handler(event);
      };
    }
    return handler;
  }

  // ============================================================
  // Column Configuration
  // ============================================================

  /** Define columns using builders or factory functions */
  columns(definitions: ColumnDefinition<TData>[]): this {
    const factory = new CoarGridColumnFactory<TData>();
    this.#columnDefs = definitions.map((def) => {
      if (typeof def === 'function') return def(factory).build();
      return def.build();
    });
    return this;
  }

  /** Set default column definition applied to all columns */
  defaultColDef(
    definition:
      | Partial<ColDef<TData>>
      | ((builder: CoarGridColumnBuilder<TData>) => CoarGridColumnBuilder<TData>)
  ): this {
    const colDef = typeof definition === 'function'
      ? definition(new CoarGridColumnBuilder<TData>()).build()
      : definition;
    this.#gridOptions.defaultColDef = { ...this.#gridOptions.defaultColDef, ...colDef };
    return this;
  }

  // ============================================================
  // Data Configuration
  // ============================================================

  /** Set row data (static array) */
  rowData(data: TData[] | null): this {
    this.#rowData = data;
    this.#reactiveRowData = undefined;
    return this;
  }

  /** Set row data (reactive ref) */
  rowDataRef(data: Ref<TData[] | null | undefined>): this {
    this.#reactiveRowData = data;
    this.#rowData = null;
    return this;
  }

  /**
   * Set row ID getter for immutable data updates.
   * When set, AG Grid uses delta updates instead of replacing all rows,
   * which preserves scroll position and improves performance.
   */
  rowId(getRowId: GetRowIdFunc<TData>): this {
    this.#gridOptions.getRowId = getRowId;
    return this;
  }

  // ============================================================
  // Row Selection
  // ============================================================

  /**
   * Enable row selection.
   *
   * @param mode - `'single'` or `'multiple'`
   * @param options - Optional configuration for checkboxes and click behavior
   *
   * @example
   * ```ts
   * // Click to select, no checkboxes
   * .rowSelection('single')
   *
   * // Checkboxes + click to select
   * .rowSelection('multiple', { checkboxes: true })
   *
   * // Checkboxes only, no click selection
   * .rowSelection('multiple', { checkboxes: true, enableClickSelection: false })
   * ```
   */
  rowSelection(mode: 'single' | 'multiple', options?: RowSelectionOptions): this {
    const agMode = mode === 'single' ? 'singleRow' : 'multiRow';

    const enableClick = options?.enableClickSelection ?? true;
    const checkboxes = options?.checkboxes ?? false;
    const headerCheckbox = options?.headerCheckbox ?? (mode === 'multiple' && checkboxes);

    this.#mergeOptions({
      rowSelection: {
        mode: agMode,
        enableClickSelection: enableClick,
        checkboxes,
        headerCheckbox,
      },
    });
    return this;
  }

  // ============================================================
  // Row Styling
  // ============================================================

  /** Set row class rules */
  rowClassRules(
    rules: Record<string, ((params: RowClassParams<TData>) => boolean) | string>
  ): this {
    this.#mergeOptions({ rowClassRules: rules });
    return this;
  }

  /** Set dynamic row class */
  rowClass(fn: (params: RowClassParams<TData>) => string | string[] | undefined): this {
    this.#mergeOptions({ getRowClass: fn });
    return this;
  }

  // ============================================================
  // Sorting
  // ============================================================

  /** Set initial sort column and direction */
  defaultSort(field: string, direction: 'asc' | 'desc'): this {
    this.#gridOptions.initialState = {
      ...this.#gridOptions.initialState,
      sort: {
        sortModel: [{ colId: field, sort: direction }],
      },
    };
    return this;
  }

  /** Set custom post-sort function to reorder rows after AG Grid sorts */
  sortFunction(fn: (params: PostSortRowsParams<TData>) => void): this {
    this.#mergeOptions({ postSortRows: fn });
    return this;
  }

  /** Re-trigger sort and filter when the given watch source changes */
  updateSortAndFilterWhen(trigger: WatchSource): this {
    this.#sortFilterTriggers.push(trigger);
    return this;
  }

  // ============================================================
  // Column State
  // ============================================================

  /** Merge column state to restore column widths, order, visibility */
  columnState(state: ColumnState[] | Ref<ColumnState[] | undefined>): this {
    this.#columnState = state;
    return this;
  }

  // ============================================================
  // Tree / Group Data
  // ============================================================

  /**
   * Enable tree data mode with nested children.
   *
   * The builder flattens the tree before passing it to AG Grid,
   * respecting `openRows()` for expand/collapse. When a quick filter
   * is active, matching branches are automatically expanded.
   *
   * @example
   * ```ts
   * builder.treeData({
   *   children: (row) => row.children ?? [],
   *   rowId: (row) => row.id,
   * })
   * ```
   */
  treeData(config: TreeDataConfig<TData>): this {
    this.#treeConfig = config;
    this.#treeContext.getRowId = config.rowId;
    this.#treeContext.toggleRow = (id: string) => {
      if (!this.#openRows || this.#forceExpandedRef?.value) return;
      const rows = this.#openRows.value;
      if (rows.includes(id)) {
        this.#openRows.value = rows.filter((r) => r !== id);
      } else {
        this.#openRows.value = [...rows, id];
      }
    };
    // Set AG Grid's getRowId to match our tree row IDs
    this.#gridOptions.getRowId = (params) => config.rowId(params.data);
    // Pass tree context through AG Grid context
    this.#gridOptions.context = { ...this.#gridOptions.context, coarTree: this.#treeContext };
    return this;
  }

  /** Set which parent rows are expanded (reactive ref of row IDs) */
  openRows(openRows: Ref<string[]>): this {
    this.#openRows = openRows;
    return this;
  }

  /**
   * Force all tree parents to be expanded while the ref is `true`.
   *
   * When switching to `true`, the current open-state is saved. All parents
   * are shown expanded and chevron toggle is disabled.
   * When switching back to `false`, the saved open-state is restored.
   *
   * @example
   * ```ts
   * const forceExpanded = computed(() => showSubTodos.value && !!search.value)
   * builder
   *   .treeData({ children: row => row.children, rowId: row => row.id })
   *   .openRows(openRows)
   *   .forceExpanded(forceExpanded)
   * ```
   */
  forceExpanded(source: Ref<boolean>): this {
    this.#forceExpandedRef = source;
    return this;
  }

  // ============================================================
  // Editing
  // ============================================================

  /** Enable full-row editing mode */
  fullRowEdit(value = true): this {
    this.#mergeOptions({ editType: value ? 'fullRow' : undefined });
    return this;
  }

  /** Stop cell editing when cells lose focus */
  stopEditingWhenCellsLoseFocus(value = true): this {
    this.#mergeOptions({ stopEditingWhenCellsLoseFocus: value });
    return this;
  }

  // ============================================================
  // Resize
  // ============================================================

  /** Enable shift-key column resize mode */
  shiftResizeMode(value = true): this {
    this.#mergeOptions({ colResizeDefault: value ? 'shift' : undefined });
    return this;
  }

  /**
   * Set the column auto-size strategy.
   *
   * @param strategy - `'fitGridWidth'` (columns fill the grid) or `'fitCellContents'` (columns fit their content)
   *
   * @example
   * ```ts
   * builder.autoSize('fitGridWidth')
   * ```
   */
  autoSize(strategy: 'fitGridWidth' | 'fitCellContents'): this {
    this.#mergeOptions({ autoSizeStrategy: { type: strategy } });
    return this;
  }

  // ============================================================
  // Row Drag & Drop
  // ============================================================

  /**
   * Enable managed row drag & drop reordering.
   * AG Grid handles the visual reorder. Dragging is automatically
   * disabled when a column sort is active.
   *
   * Use `onRowDragEnd()` to persist the new order.
   * Use `.rowDrag()` on a column to show the drag handle.
   *
   * @example
   * ```ts
   * builder
   *   .columns([col => col.field('name').rowDrag().flex(1)])
   *   .rowDragManaged()
   *   .onRowDragEnd(() => {
   *     const newOrder = builder.getDisplayedRowData();
   *     store.updateOrder(newOrder);
   *   });
   * ```
   */
  rowDragManaged(value = true): this {
    this.#mergeOptions({ rowDragManaged: value });
    return this;
  }

  /**
   * Handle row drag end event. Fires after a row has been dropped.
   * Use `getDisplayedRowData()` to read the new order.
   *
   * For tree data, use `event.node.data` (dragged) and `event.overNode?.data` (target).
   */
  onRowDragEnd(handler: (event: RowDragEndEvent<TData>) => void): this {
    this.#gridOptions.onRowDragEnd = this.#composeHandler(
      this.#gridOptions.onRowDragEnd,
      handler,
    );
    return this;
  }

  /**
   * Enable drop target highlighting during row drag.
   * Shows visual feedback on the target row:
   * - `.coar-drop-target` (blue outline) for valid targets
   * - `.coar-drop-target--invalid` (red dashed) for invalid targets
   *
   * @param options - Pass `canDrop` to validate drop targets
   *
   * @example
   * ```ts
   * builder.rowDragHighlight({
   *   canDrop: (dragged, target) => dragged.id !== target.id,
   * })
   * ```
   */
  rowDragHighlight(options?: RowDragHighlightOptions<TData> | boolean): this {
    if (options === false) return this;
    const config = typeof options === 'object' ? options : {};

    this.#gridOptions.onRowDragMove = this.#composeHandler(
      this.#gridOptions.onRowDragMove as ((event: RowDragMoveEvent<TData>) => void) | undefined,
      (event: RowDragMoveEvent<TData>) => {
        this.#clearDropTargetHighlight();
        const overNode = event.overNode;

        if (!overNode || !overNode.data || !event.node.data) {
          // Over empty area → show root drop zone
          this.#gridElement?.classList.add('coar-drop-target-root');
          return;
        }
        if (overNode === event.node) return;

        const rowEl = this.#getRowElement(overNode.id ?? String(overNode.rowIndex));
        if (!rowEl) return;

        const canDrop = !config.canDrop || config.canDrop(event.node.data, overNode.data);
        rowEl.classList.add(canDrop ? 'coar-drop-target' : 'coar-drop-target--invalid');
      },
    );
    this.#gridOptions.onRowDragLeave = this.#composeHandler(
      this.#gridOptions.onRowDragLeave as (() => void) | undefined,
      () => { this.#clearDropTargetHighlight(); },
    );
    this.#gridOptions.onRowDragEnd = this.#composeHandler(
      this.#gridOptions.onRowDragEnd,
      () => { this.#clearDropTargetHighlight(); },
    );
    return this;
  }

  /**
   * Get tree node metadata (depth, hasChildren, isExpanded, childCount) for a given row ID.
   * Requires `treeData()` to be configured. Returns `undefined` if not found.
   */
  getTreeMeta(rowId: string): TreeNodeMeta | undefined {
    return this.#treeContext.meta.get(rowId);
  }

  /**
   * Get all row data in the current display order.
   * Useful after drag & drop to persist the new order.
   */
  getDisplayedRowData(): TData[] {
    const result: TData[] = [];
    this.#gridApi?.forEachNodeAfterFilterAndSort((node) => {
      if (node.data) result.push(node.data);
    });
    return result;
  }

  // ============================================================
  // Event Handlers
  // ============================================================

  /** Handle grid ready event */
  onGridReady(handler: (event: GridReadyEvent<TData>) => void): this {
    this.#gridOptions.onGridReady = this.#composeHandler(this.#gridOptions.onGridReady, handler);
    return this;
  }

  /** Handle row click */
  onRowClicked(handler: (event: RowClickedEvent<TData>) => void): this {
    this.#gridOptions.onRowClicked = this.#composeHandler(this.#gridOptions.onRowClicked, handler);
    return this;
  }

  /** Handle row double-click */
  onRowDoubleClicked(handler: (event: RowDoubleClickedEvent<TData>) => void): this {
    this.#gridOptions.onRowDoubleClicked = this.#composeHandler(this.#gridOptions.onRowDoubleClicked, handler);
    return this;
  }

  /** Handle cell click */
  onCellClicked(handler: (event: CellClickedEvent<TData>) => void): this {
    this.#gridOptions.onCellClicked = this.#composeHandler(this.#gridOptions.onCellClicked, handler);
    return this;
  }

  /** Handle cell double-click */
  onCellDoubleClicked(handler: (event: CellDoubleClickedEvent<TData>) => void): this {
    this.#gridOptions.onCellDoubleClicked = this.#composeHandler(this.#gridOptions.onCellDoubleClicked, handler);
    return this;
  }

  /** Handle grid size changed event */
  onGridSizeChanged(handler: (event: GridSizeChangedEvent<TData>) => void): this {
    this.#gridOptions.onGridSizeChanged = this.#composeHandler(
      this.#gridOptions.onGridSizeChanged,
      handler
    );
    return this;
  }

  /** Handle cell context menu (right-click). Ctrl+click is passed through to the browser. */
  onCellContextMenu(handler: (event: CellContextMenuEvent<TData>) => void): this {
    this.#mergeOptions({
      onCellContextMenu: (event: CellContextMenuEvent<TData>) => {
        const mouseEvent = event.event as MouseEvent | undefined;
        if (mouseEvent?.ctrlKey) return;
        handler(event);
      },
    });
    return this;
  }

  /**
   * Handle click on the grid viewport (empty area outside cells).
   * Wired by the wrapper component.
   */
  onViewportClick(handler: ($event: MouseEvent, api: GridApi<TData>) => void): this {
    this.#viewportClickHandler = handler;
    return this;
  }

  /**
   * Handle context menu on the grid viewport (empty area outside cells).
   * Wired by the wrapper component.
   */
  onViewportContextMenu(handler: ($event: MouseEvent, api: GridApi<TData>) => void): this {
    this.#viewportContextMenuHandler = handler;
    return this;
  }

  // ============================================================
  // External Filtering
  // ============================================================

  /** Set external filter */
  externalFilter(
    doesFilterPass: (node: IRowNode<TData>) => boolean,
    isFilterPresent?: (params: IsExternalFilterPresentParams<TData>) => boolean
  ): this {
    this.#mergeOptions({
      isExternalFilterPresent: isFilterPresent ?? (() => true),
      doesExternalFilterPass: doesFilterPass,
    });
    return this;
  }

  /** Re-trigger external filter when the given watch source changes */
  updateExternalFilterWhen(trigger: WatchSource): this {
    this.#externalFilterTriggers.push(trigger);
    return this;
  }

  // ============================================================
  // Quick Filter (Search)
  // ============================================================

  /**
   * Set the quick filter search text (reactive ref).
   * When set, row data is filtered before being passed to AG Grid.
   *
   * @example
   * ```ts
   * const search = ref('');
   * builder.quickFilterText(search);
   * ```
   */
  quickFilterText(source: Ref<string>): this {
    this.#quickFilterTextRef = source;
    return this;
  }

  /**
   * Set a custom quick filter function. Overrides the default per-column matching.
   *
   * @param fn - Receives the normalized (lowercased, trimmed) search value and row data.
   *             Return `true` to keep the row visible.
   *
   * @example
   * ```ts
   * builder.quickFilterFn((search, data) => {
   *   return data.name.toLowerCase().includes(search)
   *     || data.email.toLowerCase().includes(search);
   * });
   * ```
   */
  quickFilterFn(fn: (searchValue: string, data: TData) => boolean): this {
    this.#quickFilterFn = fn;
    return this;
  }

  /**
   * Set a custom filter function that operates on the entire data array.
   * When set, AG Grid's per-row quick filter is bypassed — the data is filtered
   * by this function before being passed to AG Grid.
   *
   * This is useful for tree data where you need sibling-aware filtering
   * (e.g. keeping all children of a parent when any child matches).
   *
   * @param fn - Receives the full data array and the current search text.
   *             Return the filtered array, or `null` to fall back to the
   *             default quick filter for that evaluation.
   *
   * @example
   * ```ts
   * builder
   *   .treeData({ children: row => row.children, rowId: row => row.id })
   *   .customFilter((items, search) => {
   *     if (!showGroupFilter.value) return null; // fall back to quickFilter
   *     if (!search.trim()) return items;
   *     const q = search.toLowerCase();
   *     return items.filter(parent =>
   *       parent.name.toLowerCase().includes(q) ||
   *       parent.children.some(c => c.name.toLowerCase().includes(q))
   *     );
   *   })
   * ```
   */
  customFilter(fn: (data: TData[], searchText: string) => TData[] | null): this {
    this.#customFilterFn = fn;
    return this;
  }

  /**
   * Re-run the data pipeline when the given watch sources change.
   * Use this when `customFilter` or `quickFilterFn` depends on external reactive state.
   *
   * @example
   * ```ts
   * const showSubTodos = ref(false);
   * builder
   *   .customFilter((todos, search) => { ... })
   *   .updateOn(showSubTodos)
   * ```
   */
  updateOn(...sources: WatchSource[]): this {
    this.#dataPipelineTriggers.push(...sources);
    return this;
  }

  /**
   * Enable search text highlighting using the CSS Custom Highlight API.
   * Matching text in grid cells is highlighted without modifying the DOM.
   *
   * Requires `quickFilterText()` to be set.
   *
   * @example
   * ```ts
   * builder
   *   .quickFilterText(searchRef)
   *   .searchHighlight()
   * ```
   */
  searchHighlight(value = true): this {
    this.#searchHighlightEnabled = value;
    return this;
  }

  // ============================================================
  // Grid Options
  // ============================================================

  /** Enable row animation */
  animateRows(value = true): this {
    this.#mergeOptions({ animateRows: value });
    return this;
  }

  /** Set any AG Grid option directly */
  option<K extends keyof GridOptions<TData>>(key: K, value: GridOptions<TData>[K]): this {
    this.#gridOptions[key] = value;
    return this;
  }

  /** Merge additional grid options */
  options(options: GridOptions<TData>): this {
    this.#mergeOptions(options);
    return this;
  }

  // ============================================================
  // Internal - Used by wrapper component
  // ============================================================

  // ============================================================
  // Private - Search Highlight Helpers
  // ============================================================

  #applySearchHighlight(searchText?: string): void {
    // CSS Custom Highlight API
    if (typeof CSS === 'undefined' || !('highlights' in CSS)) return;
    const highlights = CSS.highlights as Map<string, Highlight>;

    highlights.delete('coar-search');

    const normalized = searchText?.trim().toLowerCase();
    if (!normalized || !this.#gridElement) return;

    const viewport = this.#gridElement.querySelector('.ag-body-viewport');
    if (!viewport) return;

    const ranges: Range[] = [];
    const walker = document.createTreeWalker(viewport, NodeFilter.SHOW_TEXT);
    let textNode: Text | null;
    while ((textNode = walker.nextNode() as Text | null)) {
      const text = textNode.textContent?.toLowerCase() ?? '';
      let startIndex = 0;
      while (startIndex < text.length) {
        const idx = text.indexOf(normalized, startIndex);
        if (idx === -1) break;
        const range = new Range();
        range.setStart(textNode, idx);
        range.setEnd(textNode, idx + normalized.length);
        ranges.push(range);
        startIndex = idx + normalized.length;
      }
    }

    if (ranges.length > 0) {
      highlights.set('coar-search', new Highlight(...ranges));
    }
  }

  #scheduleSearchHighlight(searchText?: string): void {
    if (!this.#searchHighlightEnabled) return;
    // Wait one frame for AG Grid to render the new rows
    requestAnimationFrame(() => {
      this.#applySearchHighlight(searchText);
    });
  }

  // ============================================================
  // Private - Row Drag Helpers
  // ============================================================

  #clearDropTargetHighlight(): void {
    const container = this.#gridElement ?? document;
    container.querySelectorAll('.coar-drop-target, .coar-drop-target--invalid').forEach((el) => {
      el.classList.remove('coar-drop-target', 'coar-drop-target--invalid');
    });
    this.#gridElement?.classList.remove('coar-drop-target-root');
  }

  #getRowElement(rowId: string): HTMLElement | null {
    const container = this.#gridElement ?? document;
    return container.querySelector(`.ag-row[row-id="${rowId}"]`);
  }

  // ============================================================
  // Private - Tree Data Helpers
  // ============================================================

  /**
   * Flatten a nested tree into a display list.
   * When searchText is provided, only matching branches are included (all expanded).
   * Otherwise, openRows controls which parents are expanded.
   */
  #flattenTree(
    rows: TData[],
    depth: number,
    searchText: string | null,
    result: TData[],
    metaMap: Map<string, TreeNodeMeta>,
  ): boolean {
    let anyMatch = false;
    const config = this.#treeConfig!;
    const openRowIds = this.#openRows?.value ?? [];

    for (const row of rows) {
      const id = config.rowId(row);
      const children = config.children(row);
      const hasChildren = children.length > 0;

      if (searchText) {
        // Search mode: include row if it or any descendant matches
        const selfMatches = this.#rowMatchesQuickFilter(row, searchText);
        const childResult: TData[] = [];
        const childMeta = new Map<string, TreeNodeMeta>();
        const childrenMatch = hasChildren
          ? this.#flattenTree(children, depth + 1, searchText, childResult, childMeta)
          : false;

        if (selfMatches || childrenMatch) {
          result.push(row);
          metaMap.set(id, { depth, hasChildren, isExpanded: childrenMatch, childCount: children.length });
          if (childrenMatch) {
            for (const [k, v] of childMeta) metaMap.set(k, v);
            result.push(...childResult);
          }
          anyMatch = true;
        }
      } else {
        // Normal mode: respect openRows (or force-expand all)
        const isExpanded = hasChildren && (this.#forceExpandedRef?.value || openRowIds.includes(id));
        result.push(row);
        metaMap.set(id, { depth, hasChildren, isExpanded, childCount: children.length });

        if (isExpanded) {
          this.#flattenTree(children, depth + 1, null, result, metaMap);
        }
        anyMatch = true;
      }
    }

    return anyMatch;
  }

  #setTreeRowDataOnGrid(api: GridApi<TData>, data: TData[] | null | undefined, searchText?: string): void {
    if (data === null || data === undefined) {
      api.setGridOption('rowData', []);
      api.setGridOption('loading', true);
      return;
    }

    // When customFilter returns an array, use it and flatten without search-based expansion.
    // When it returns null (or is not set), fall back to default quick filter in flattenTree.
    const customResult = this.#customFilterFn?.(data, searchText ?? '') ?? null;
    const sourceData = customResult !== null ? customResult : data;
    const normalized = customResult !== null
      ? null
      : (searchText?.trim().toLowerCase() || null);

    const result: TData[] = [];
    const metaMap = new Map<string, TreeNodeMeta>();
    this.#flattenTree(sourceData, 0, normalized, result, metaMap);

    // Update tree context meta (cell renderers read from this)
    this.#treeContext.meta = metaMap;
    api.setGridOption('rowData', result);
    api.setGridOption('loading', false);
    // Force cell renderers to re-render (meta changed but row data objects are the same)
    api.refreshCells({ force: true });
    this.#scheduleSearchHighlight(searchText);
  }

  /**
   * Check if a single row matches the quick filter (used by both flat and tree modes).
   */
  #rowMatchesQuickFilter(row: TData, searchText: string): boolean {
    if (this.#quickFilterFn) {
      return this.#quickFilterFn(searchText, row);
    }
    return this.#defaultQuickFilterMatch(row, searchText);
  }

  // ============================================================
  // Private - Quick Filter Helpers
  // ============================================================

  #applyQuickFilter(data: TData[], searchText?: string): TData[] {
    const normalized = searchText?.trim().toLowerCase();
    if (!normalized) return data;

    if (this.#quickFilterFn) {
      return data.filter((row) => this.#quickFilterFn!(normalized, row));
    }

    return data.filter((row) => this.#defaultQuickFilterMatch(row, normalized));
  }

  #defaultQuickFilterMatch(row: TData, searchText: string): boolean {
    for (const colDef of this.#columnDefs) {
      if (colDef.hide) continue;
      if (!colDef.field) continue;

      const qfConfig = (colDef as Record<string, unknown>)[COAR_QUICK_FILTER_KEY] as
        | QuickFilterConfig<TData>
        | undefined;
      if (qfConfig === false) continue;

      const value = (row as Record<string, unknown>)[colDef.field];

      let text: string;
      if (typeof qfConfig === 'function') {
        text = (qfConfig as (value: unknown, data: TData) => string)(value, row);
      } else {
        text = value != null ? String(value) : '';
      }

      if (text.toLowerCase().includes(searchText)) {
        return true;
      }
    }
    return false;
  }

  #setRowDataOnGrid(api: GridApi<TData>, data: TData[] | null | undefined, searchText?: string): void {
    if (data === null || data === undefined) {
      api.setGridOption('rowData', []);
      api.setGridOption('loading', true);
      return;
    }

    const customResult = this.#customFilterFn?.(data, searchText ?? '') ?? null;
    const filtered = customResult !== null
      ? customResult
      : this.#applyQuickFilter(data, searchText);
    api.setGridOption('rowData', filtered);
    api.setGridOption('loading', false);

    // AG Grid skips flex calculation when rowData is first set via setGridOption.
    // Re-applying columnDefs once forces a fresh flex layout pass.
    if (!this.#flexApplied && this.#columnDefs.some((c) => c.flex)) {
      this.#flexApplied = true;
      api.setGridOption('columnDefs', this.#columnDefs);
    }

    this.#scheduleSearchHighlight(searchText);
  }

  /** @internal Called by the wrapper component to bind to AG Grid */
  _bind(api: GridApi<TData>, gridElement?: HTMLElement): void {
    this.#gridApi = api;
    this.#gridElement = gridElement;
    this.#gridReady.value = true;

    // ---- Row data pipeline ----
    if (this.#treeConfig) {
      const dataSource = this.#reactiveRowData ?? ref(this.#rowData) as Ref<TData[] | null>;
      const sources: WatchSource[] = [dataSource];
      if (this.#quickFilterTextRef) sources.push(this.#quickFilterTextRef);
      if (this.#openRows) sources.push(this.#openRows);
      if (this.#forceExpandedRef) sources.push(this.#forceExpandedRef);
      sources.push(...this.#dataPipelineTriggers);

      // Save/restore open-rows when forceExpanded toggles
      if (this.#forceExpandedRef && this.#openRows) {
        const stopForceWatch = watch(this.#forceExpandedRef, (forced) => {
          if (forced) {
            this.#openRowsSnapshot = [...this.#openRows!.value];
          } else if (this.#openRowsSnapshot) {
            this.#openRows!.value = this.#openRowsSnapshot;
            this.#openRowsSnapshot = undefined;
          }
        });
        this.#cleanupFns.push(stopForceWatch);
      }

      const stopWatch = watch(
        sources,
        () => {
          this.#setTreeRowDataOnGrid(api, dataSource.value, this.#quickFilterTextRef?.value);
        },
        { immediate: true, deep: false }
      );
      this.#cleanupFns.push(stopWatch);
    } else if (this.#quickFilterTextRef || this.#customFilterFn) {
      const dataSource = this.#reactiveRowData ?? ref(this.#rowData) as Ref<TData[] | null>;
      const sources: WatchSource[] = [dataSource];
      if (this.#quickFilterTextRef) sources.push(this.#quickFilterTextRef);
      sources.push(...this.#dataPipelineTriggers);

      const stopWatch = watch(
        sources,
        () => {
          this.#setRowDataOnGrid(api, dataSource.value, this.#quickFilterTextRef?.value);
        },
        { immediate: true }
      );
      this.#cleanupFns.push(stopWatch);
    } else if (this.#reactiveRowData) {
      const sources: WatchSource[] = [this.#reactiveRowData, ...this.#dataPipelineTriggers];

      const stopWatch = watch(
        sources,
        () => {
          this.#setRowDataOnGrid(api, this.#reactiveRowData!.value);
        },
        { immediate: true }
      );
      this.#cleanupFns.push(stopWatch);
    }

    // Apply column state
    if (this.#columnState) {
      if (isRef(this.#columnState)) {
        const stopWatch = watch(
          this.#columnState,
          (state) => {
            if (state) {
              api.applyColumnState({ state, applyOrder: true });
            }
          },
          { immediate: true }
        );
        this.#cleanupFns.push(stopWatch);
      } else {
        api.applyColumnState({ state: this.#columnState, applyOrder: true });
      }
    }

    // Watch sort/filter triggers
    for (const trigger of this.#sortFilterTriggers) {
      const stopWatch = watch(trigger, () => {
        api.onSortChanged();
        api.onFilterChanged();
      });
      this.#cleanupFns.push(stopWatch);
    }

    // Watch external filter triggers
    for (const trigger of this.#externalFilterTriggers) {
      const stopWatch = watch(trigger, () => {
        api.onFilterChanged();
      });
      this.#cleanupFns.push(stopWatch);
    }

    // Re-apply search highlight on scroll (AG Grid virtualizes rows)
    if (this.#searchHighlightEnabled && this.#quickFilterTextRef) {
      const scrollHandler = () => {
        this.#applySearchHighlight(this.#quickFilterTextRef?.value);
      };
      const viewport = this.#gridElement?.querySelector('.ag-body-viewport');
      viewport?.addEventListener('scroll', scrollHandler);
      this.#cleanupFns.push(() => viewport?.removeEventListener('scroll', scrollHandler));
    }

    // Watch open rows (only for non-tree AG Grid grouping/master-detail)
    if (this.#openRows && !this.#treeConfig) {
      const stopWatch = watch(
        this.#openRows,
        (openRowIds) => {
          api.forEachNode((node) => {
            if (node.group || node.master) {
              const shouldBeOpen = openRowIds.includes(node.key ?? node.id ?? '');
              if (node.expanded !== shouldBeOpen) {
                node.setExpanded(shouldBeOpen);
              }
            }
          });
        },
        { immediate: true }
      );
      this.#cleanupFns.push(stopWatch);
    }
  }

  /** @internal Called by the wrapper component on unmount */
  _destroy(): void {
    for (const cleanup of this.#cleanupFns) {
      cleanup();
    }
    this.#cleanupFns = [];
    this.#gridApi = undefined;
    this.#gridElement = undefined;
    this.#gridReady.value = false;
    this.#flexApplied = false;
    if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
      (CSS.highlights as Map<string, Highlight>).delete('coar-search');
    }
  }

  /** @internal Get viewport click handler (for wrapper component) */
  _getViewportClickHandler(): (($event: MouseEvent, api: GridApi<TData>) => void) | undefined {
    return this.#viewportClickHandler;
  }

  /** @internal Get viewport context menu handler (for wrapper component) */
  _getViewportContextMenuHandler():
    | (($event: MouseEvent, api: GridApi<TData>) => void)
    | undefined {
    return this.#viewportContextMenuHandler;
  }

  /** @internal Check if a cell context menu handler is registered (for wrapper component) */
  _hasCellContextMenuHandler(): boolean {
    return this.#gridOptions.onCellContextMenu != null;
  }

  /** Get column definitions (for wrapper component) */
  _getColumnDefs(): ColDef<TData>[] {
    return this.#columnDefs;
  }

  /** Get grid options (for wrapper component) */
  _getGridOptions(): GridOptions<TData> {
    return this.#gridOptions;
  }

  /** Get static row data (for wrapper component) */
  _getRowData(): TData[] | null {
    // When data is managed reactively via _bind(), return null so AG Grid
    // doesn't receive initial data through the template binding.
    // This ensures flex columns are calculated when data arrives via setGridOption.
    if (this.#reactiveRowData || this.#quickFilterTextRef || this.#treeConfig || this.#customFilterFn) return null;
    return this.#rowData;
  }

  /** @internal Whether data is loaded asynchronously (rowDataRef or tree/filter pipeline) */
  _isAsyncData(): boolean {
    return !!(this.#reactiveRowData || this.#quickFilterTextRef || this.#treeConfig || this.#customFilterFn);
  }
}
