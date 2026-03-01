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
} from 'ag-grid-community';

import { CoarGridColumnBuilder } from './coar-grid-column-builder';
import { CoarGridColumnFactory } from './coar-grid-column-factory';

type ColumnBuilderLike<TData> = {
  build(): ColDef<TData>;
};

/** Column definition input - either a builder or a factory function */
export type ColumnDefinition<TData> =
  | ColumnBuilderLike<TData>
  | ((factory: CoarGridColumnFactory<TData>) => ColumnBuilderLike<TData>);

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
  #gridReady = ref(false);
  #cleanupFns: Array<() => void> = [];

  #gridOptions: GridOptions<TData> = {};
  #columnDefs: ColDef<TData>[] = [];
  #rowData: TData[] | null = null;
  #reactiveRowData?: Ref<TData[] | null | undefined>;

  // Deferred state (applied after grid ready)
  #columnState?: ColumnState[] | Ref<ColumnState[] | undefined>;
  #openRows?: Ref<string[]>;
  #sortFilterTriggers: WatchSource[] = [];
  #externalFilterTriggers: WatchSource[] = [];

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
      rowSelection: undefined,
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
    if (typeof definition === 'function') {
      const builder = new CoarGridColumnBuilder<TData>();
      this.#gridOptions.defaultColDef = definition(builder).build();
    } else {
      this.#gridOptions.defaultColDef = definition;
    }
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

  /** Set row ID getter for immutable data updates */
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

  /** Set which parent rows are expanded (reactive ref of row IDs) */
  openRows(openRows: Ref<string[]>): this {
    this.#openRows = openRows;
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
    this.#mergeOptions({ onRowClicked: handler });
    return this;
  }

  /** Handle row double-click */
  onRowDoubleClicked(handler: (event: RowDoubleClickedEvent<TData>) => void): this {
    this.#mergeOptions({ onRowDoubleClicked: handler });
    return this;
  }

  /** Handle cell click */
  onCellClicked(handler: (event: CellClickedEvent<TData>) => void): this {
    this.#mergeOptions({ onCellClicked: handler });
    return this;
  }

  /** Handle cell double-click */
  onCellDoubleClicked(handler: (event: CellDoubleClickedEvent<TData>) => void): this {
    this.#mergeOptions({ onCellDoubleClicked: handler });
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

  /** @internal Called by the wrapper component to bind to AG Grid */
  _bind(api: GridApi<TData>): void {
    this.#gridApi = api;
    this.#gridReady.value = true;

    // Watch reactive row data if provided
    if (this.#reactiveRowData) {
      const stopWatch = watch(
        this.#reactiveRowData,
        (data) => {
          if (data === null || data === undefined) {
            api.setGridOption('rowData', []);
            api.setGridOption('loading', true);
          } else {
            api.setGridOption('rowData', data);
            api.setGridOption('loading', false);
          }
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

    // Watch open rows
    if (this.#openRows) {
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
    this.#gridReady.value = false;
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
    return this.#rowData;
  }
}
