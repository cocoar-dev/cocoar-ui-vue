import { shallowReadonly, shallowRef, type Ref } from 'vue';
import type { ColDef, ColumnState, GridApi } from 'ag-grid-community';

import { COAR_HEADER_I18N_KEY } from './coar-grid-column-builder';
import { CoarGridColumnFactory } from './coar-grid-column-factory';
import {
  broadcastColumnState,
  createPersistenceInstanceId,
  deleteAllColumnStates,
  deleteColumnState,
  findNearestBucket,
  getSavedBuckets,
  loadColumnState,
  onColumnStateChanged,
  saveColumnState,
  toBucket,
} from './column-state-storage';

type ColumnBuilderLike<TData> = {
  build(): ColDef<TData>;
};

/** Column definition input - either a builder or a factory function. */
export type ColumnDefinition<TData> =
  | ColumnBuilderLike<TData>
  | ((factory: CoarGridColumnFactory<TData>) => ColumnBuilderLike<TData>);

/** Options for column state persistence. */
export interface ColumnPersistenceOptions {
  /** Bucket size in pixels. Grid width is rounded to the nearest bucket. Default: 100 */
  bucketSize?: number;
  /** Debounce delay in ms for saving column state. Default: 500 */
  debounceMs?: number;
}

/** A column exposed to column pickers and custom column menus. */
export interface CoarGridColumnItem {
  /** Stable AG Grid column ID. */
  id: string;
  /** Non-localized fallback label. */
  label: string;
  /** Optional localization key configured through `.header(label, i18nKey)`. */
  i18nKey?: string;
  /** Current runtime visibility. */
  visible: boolean;
  /** Visibility declared by the current definition. */
  defaultVisible: boolean;
  /** Whether consumers may change the visibility. */
  canHide: boolean;
}

interface ResolvedColumnDefinition<TData> {
  source: ColumnDefinition<TData>;
  colDef: ColDef<TData>;
  id?: string;
  defaultVisible: boolean;
}

/**
 * Headless, reactive column model for Coar and custom AG Grid integrations.
 *
 * It owns the column definitions, exposes visibility actions for any UI, updates
 * a bound grid without remounting it, and reconciles existing column state by
 * stable `colId` when definitions are replaced.
 */
export class CoarGridColumns<TData = unknown> {
  #api?: GridApi<TData>;
  #gridElement?: HTMLElement;
  #sources: ColumnDefinition<TData>[] = [];
  #resolved: ResolvedColumnDefinition<TData>[] = [];
  #columnDefs = shallowRef<ColDef<TData>[]>([]);
  #items = shallowRef<CoarGridColumnItem[]>([]);
  #cleanupFns: Array<() => void> = [];

  #persistKey?: string;
  #persistOptions?: ColumnPersistenceOptions;
  #persistInstanceId = 0;
  #persistBucket = 0;
  #persistResizeObserver?: ResizeObserver;
  #persistDebounceTimer?: ReturnType<typeof setTimeout>;
  #persistSuppressSave = false;
  #persistCleanupFns: Array<() => void> = [];
  #rememberedState: ColumnState[] = [];

  /** Reactive definitions for direct use with `<AgGridVue>`. */
  readonly columnDefs: Readonly<Ref<readonly ColDef<TData>[]>> = shallowReadonly(this.#columnDefs);

  /** Reactive column state for the built-in picker or a custom menu. */
  readonly items: Readonly<Ref<readonly CoarGridColumnItem[]>> = shallowReadonly(this.#items);

  private constructor(definitions: ColumnDefinition<TData>[] = []) {
    this.replaceDefinitions(definitions);
  }

  /** Create a column model from builder definitions. */
  static create<TData = unknown>(
    definitions: ColumnDefinition<TData>[] = [],
  ): CoarGridColumns<TData> {
    return new CoarGridColumns(definitions);
  }

  /** The currently bound AG Grid API, if any. */
  get api(): GridApi<TData> | undefined {
    return this.#api;
  }

  /**
   * Replace the complete definition set and reconcile runtime state by stable column ID.
   * Existing widths, order, visibility, pinning and sort survive for matching columns;
   * genuinely new columns start with their definition defaults.
   */
  replaceDefinitions(definitions: ColumnDefinition<TData>[]): this {
    const previousVisibility = new Map(this.#items.value.map((item) => [item.id, item.visible]));
    if (this.#api) this.#rememberColumnState(this.#api.getColumnState());

    this.#sources = [...definitions];
    this.#resolved = this.#resolveDefinitions(this.#sources);

    if (!this.#api) {
      for (const entry of this.#resolved) {
        if (!entry.id || !previousVisibility.has(entry.id)) continue;
        entry.colDef.hide = !previousVisibility.get(entry.id);
      }
    }

    const nextColumnDefs = this.#resolved.map((entry) => entry.colDef);
    this.#columnDefs.value = nextColumnDefs;

    if (this.#api) {
      const api = this.#api;
      const stateToRestore = this.#rememberedState.map((entry) => ({ ...entry }));
      const wasSuppressingPersistence = this.#persistSuppressSave;
      // AG Grid emits visibility events while rebuilding columns. Those events
      // represent definition defaults, not a user change, and must not overwrite
      // remembered state for a column that is returning in this same update.
      this.#persistSuppressSave = true;
      api.setGridOption('columnDefs', nextColumnDefs);
      this.#rememberedState = stateToRestore;
      this.#applyRememberedState();
      this.#persistSuppressSave = wasSuppressingPersistence;
    }

    this.#refreshItems();
    this.#persistBroadcastAndSave();
    return this;
  }

  /** Append one or more column definitions. */
  append(definitions: ColumnDefinition<TData> | ColumnDefinition<TData>[]): this {
    const additions = Array.isArray(definitions) ? definitions : [definitions];
    return this.replaceDefinitions([...this.#sources, ...additions]);
  }

  /** Remove columns by stable column ID. Unknown IDs are ignored. */
  remove(ids: string | string[]): this {
    const targets = new Set(Array.isArray(ids) ? ids : [ids]);
    const remaining = this.#resolved
      .filter((entry) => !entry.id || !targets.has(entry.id))
      .map((entry) => entry.source);
    return this.replaceDefinitions(remaining);
  }

  /** Set a column's visibility. Hiding the final visible picker column is prevented. */
  setVisible(id: string, visible: boolean): void {
    const item = this.#items.value.find((candidate) => candidate.id === id);
    if (!item || !item.canHide || item.visible === visible) return;
    if (!visible && this.#items.value.filter((candidate) => candidate.visible).length <= 1) return;

    if (this.#api) {
      this.#api.setColumnsVisible([id], visible);
      this.#rememberColumnState(this.#api.getColumnState());
      this.#refreshItems();
      this.#persistBroadcastAndSave();
      return;
    }

    const entry = this.#resolved.find((candidate) => candidate.id === id);
    if (entry) entry.colDef.hide = !visible;
    this.#refreshItems();
  }

  /** Toggle a column's visibility. */
  toggle(id: string): void {
    const item = this.#items.value.find((candidate) => candidate.id === id);
    if (item) this.setVisible(id, !item.visible);
  }

  /** Show every configurable column. */
  showAll(): void {
    const ids = this.#items.value
      .filter((item) => item.canHide && !item.visible)
      .map((item) => item.id);
    if (ids.length === 0) return;

    if (this.#api) {
      this.#api.setColumnsVisible(ids, true);
      this.#rememberColumnState(this.#api.getColumnState());
      this.#refreshItems();
      this.#persistBroadcastAndSave();
      return;
    }

    for (const entry of this.#resolved) {
      if (entry.id && ids.includes(entry.id)) entry.colDef.hide = false;
    }
    this.#refreshItems();
  }

  /** Restore visibility defaults without changing widths, order, pinning or sort. */
  resetVisibility(): void {
    const visible: string[] = [];
    const hidden: string[] = [];
    const desiredVisibility = new Map(
      this.#items.value.map((item) => [item.id, item.defaultVisible]),
    );

    if (this.#items.value.length > 0 && !this.#items.value.some((item) => item.defaultVisible)) {
      const fallback = this.#items.value.find((item) => item.visible)
        ?? this.#items.value.find((item) => item.canHide);
      if (fallback) desiredVisibility.set(fallback.id, true);
    }

    for (const item of this.#items.value) {
      const desired = desiredVisibility.get(item.id) ?? item.visible;
      if (!item.canHide || item.visible === desired) continue;
      (desired ? visible : hidden).push(item.id);
    }

    if (this.#api) {
      if (visible.length > 0) this.#api.setColumnsVisible(visible, true);
      if (hidden.length > 0) this.#api.setColumnsVisible(hidden, false);
      this.#rememberColumnState(this.#api.getColumnState());
      this.#refreshItems();
      this.#persistBroadcastAndSave();
      return;
    }

    for (const entry of this.#resolved) {
      if (!entry.id || (!visible.includes(entry.id) && !hidden.includes(entry.id))) continue;
      entry.colDef.hide = !entry.defaultVisible;
    }
    this.#refreshItems();
  }

  /** Enable IndexedDB persistence and live sync for this column model. */
  persistColumnState(gridKey: string, options?: ColumnPersistenceOptions): this {
    this.#persistKey = gridKey;
    this.#persistOptions = options;
    if (this.#api) {
      this.#persistCleanup();
      this.#persistSetup();
    }
    return this;
  }

  /** Reset one persisted width bucket and restore definition defaults. */
  async resetPersistedState(bucket?: number): Promise<void> {
    if (!this.#persistKey) return;
    const target = bucket ?? this.#persistBucket;
    if (target) await deleteColumnState(this.#persistKey, target);
    this.#rememberedState = [];
    this.#api?.resetColumnState();
    this.#refreshItems();
  }

  /** Reset all persisted width buckets and restore definition defaults. */
  async resetPersistedStates(): Promise<void> {
    if (!this.#persistKey) return;
    await deleteAllColumnStates(this.#persistKey);
    this.#rememberedState = [];
    this.#api?.resetColumnState();
    this.#refreshItems();
  }

  /** Bind the model to a grid. Useful for direct `<AgGridVue>` integrations. */
  bind(api: GridApi<TData>, gridElement?: HTMLElement): void {
    if (this.#api === api) return;
    if (this.#api) this.unbind();

    this.#api = api;
    this.#gridElement = gridElement;
    this.#rememberColumnState(api.getColumnState?.() ?? []);

    const refresh = () => this.#refreshItems();
    if (api.addEventListener) {
      api.addEventListener('columnVisible', refresh);
      api.addEventListener('columnMoved', refresh);
      api.addEventListener('newColumnsLoaded', refresh);
      this.#cleanupFns.push(() => {
        api.removeEventListener('columnVisible', refresh);
        api.removeEventListener('columnMoved', refresh);
        api.removeEventListener('newColumnsLoaded', refresh);
      });
    }

    this.#refreshItems();
    if (this.#persistKey) this.#persistSetup();
  }

  /** Unbind listeners while keeping definitions and the last known item state. */
  unbind(): void {
    this.#persistCleanup();
    for (const cleanup of this.#cleanupFns) cleanup();
    this.#cleanupFns = [];
    this.#api = undefined;
    this.#gridElement = undefined;
  }

  /** @internal Mutable definitions consumed by the Coar wrapper. */
  _getColumnDefs(): ColDef<TData>[] {
    return this.#columnDefs.value;
  }

  #resolveDefinitions(definitions: ColumnDefinition<TData>[]): ResolvedColumnDefinition<TData>[] {
    const factory = new CoarGridColumnFactory<TData>();
    return definitions.map((source) => {
      const colDef = typeof source === 'function' ? source(factory).build() : source.build();
      const id = colDef.colId ?? (colDef.field ? String(colDef.field) : undefined);
      if (id && !colDef.colId) colDef.colId = id;
      return {
        source,
        colDef,
        id,
        defaultVisible: !(colDef.hide ?? colDef.initialHide ?? false),
      };
    });
  }

  #refreshItems(): void {
    const gridOrder = new Map<string, number>();
    const runtimeVisibility = new Map<string, boolean>();
    if (this.#api) {
      this.#api.getAllGridColumns?.().forEach((column, index) => {
        gridOrder.set(column.getColId(), index);
      });
      this.#api.getColumnState?.().forEach((state) => {
        runtimeVisibility.set(state.colId, state.hide !== true);
      });
    }

    this.#items.value = this.#resolved
      .filter(
        (entry): entry is ResolvedColumnDefinition<TData> & { id: string } =>
          !!entry.id && entry.colDef.suppressColumnsToolPanel !== true,
      )
      .map((entry, definitionIndex) => {
        const column = this.#api?.getColumn?.(entry.id);
        const params = entry.colDef.headerComponentParams as Record<string, unknown> | undefined;
        return {
          id: entry.id,
          label: entry.colDef.headerName ?? String(entry.colDef.field ?? entry.id),
          i18nKey: params?.[COAR_HEADER_I18N_KEY] as string | undefined,
          visible:
            runtimeVisibility.get(entry.id) ?? column?.isVisible() ?? entry.colDef.hide !== true,
          defaultVisible: entry.defaultVisible,
          canHide: entry.colDef.lockVisible !== true,
          order: gridOrder.get(entry.id) ?? definitionIndex,
        };
      })
      .sort((left, right) => left.order - right.order)
      .map((item) => ({
        id: item.id,
        label: item.label,
        i18nKey: item.i18nKey,
        visible: item.visible,
        defaultVisible: item.defaultVisible,
        canHide: item.canHide,
      }));
  }

  #rememberColumnState(current: ColumnState[]): ColumnState[] {
    const currentIds = new Set(current.map((state) => state.colId));
    const dormant = this.#rememberedState.filter((state) => !currentIds.has(state.colId));
    this.#rememberedState = [...current, ...dormant];
    return this.#rememberedState;
  }

  #applyRememberedState(): void {
    if (!this.#api || this.#rememberedState.length === 0) return;
    // AG Grid deliberately accepts partial state and applies every ID it knows,
    // returning `false` for unknown IDs. Passing dormant entries through avoids a
    // timing race where `getColumns()` can still expose the previous definition set
    // while `setGridOption('columnDefs', ...)` is reconciling returning columns.
    this.#api.applyColumnState({ state: this.#rememberedState, applyOrder: true });
  }

  #persistedState(): ColumnState[] | undefined {
    if (!this.#api) return undefined;
    return this.#rememberColumnState(this.#api.getColumnState());
  }

  #persistSaveCurrentState(): void {
    if (this.#persistSuppressSave || !this.#persistBucket || !this.#persistKey) return;
    const state = this.#persistedState();
    if (state) void saveColumnState(this.#persistKey, this.#persistBucket, state);
  }

  #persistBroadcastAndSave(): void {
    if (this.#persistSuppressSave || !this.#persistKey) return;
    const state = this.#persistedState();
    if (!state) return;

    broadcastColumnState(this.#persistKey, this.#persistInstanceId, state);
    if (this.#persistDebounceTimer) clearTimeout(this.#persistDebounceTimer);
    const delay = this.#persistOptions?.debounceMs ?? 500;
    this.#persistDebounceTimer = setTimeout(() => {
      if (this.#persistBucket && this.#persistKey) {
        void saveColumnState(this.#persistKey, this.#persistBucket, state);
      }
    }, delay);
  }

  async #persistApplyStateForBucket(bucket: number): Promise<void> {
    if (!this.#persistKey) return;
    let state = await loadColumnState(this.#persistKey, bucket);

    if (!state) {
      const nearest = findNearestBucket(bucket, await getSavedBuckets(this.#persistKey));
      if (nearest !== null) state = await loadColumnState(this.#persistKey, nearest);
    }

    if (state) {
      this.#rememberedState = state as ColumnState[];
      this.#persistSuppressSave = true;
      this.#applyRememberedState();
      this.#refreshItems();
      setTimeout(() => {
        this.#persistSuppressSave = false;
      }, 100);
    }
  }

  async #persistOnWidthChanged(width: number): Promise<void> {
    const newBucket = toBucket(width, this.#persistOptions?.bucketSize ?? 100);
    const oldBucket = this.#persistBucket;
    if (oldBucket === newBucket) return;
    if (oldBucket) this.#persistSaveCurrentState();
    this.#persistBucket = newBucket;
    this.#rememberedState = [];
    await this.#persistApplyStateForBucket(newBucket);
  }

  #persistSetup(): void {
    if (!this.#persistKey || !this.#api) return;
    this.#persistInstanceId = createPersistenceInstanceId();

    const gridElement =
      (this.#gridElement?.querySelector('.ag-root-wrapper') as HTMLElement) ?? this.#gridElement;
    if (!gridElement) return;

    this.#persistBucket = toBucket(
      gridElement.clientWidth,
      this.#persistOptions?.bucketSize ?? 100,
    );
    void this.#persistApplyStateForBucket(this.#persistBucket);

    if (typeof ResizeObserver !== 'undefined') {
      this.#persistResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) void this.#persistOnWidthChanged(entry.contentRect.width);
      });
      this.#persistResizeObserver.observe(gridElement);
    }

    const api = this.#api;
    const unsubscribe = onColumnStateChanged(this.#persistKey, this.#persistInstanceId, (state) => {
      this.#rememberedState = state as ColumnState[];
      this.#persistSuppressSave = true;
      this.#applyRememberedState();
      this.#refreshItems();
      setTimeout(() => {
        this.#persistSuppressSave = false;
      }, 100);
    });
    this.#persistCleanupFns.push(unsubscribe);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AG Grid's resize event overload is broad
    const onResized = (event: any) => {
      if (event.finished) this.#persistBroadcastAndSave();
    };
    const onChanged = () => this.#persistBroadcastAndSave();
    api.addEventListener('columnResized', onResized);
    api.addEventListener('columnMoved', onChanged);
    api.addEventListener('columnVisible', onChanged);
    api.addEventListener('sortChanged', onChanged);
    this.#persistCleanupFns.push(() => {
      api.removeEventListener('columnResized', onResized);
      api.removeEventListener('columnMoved', onChanged);
      api.removeEventListener('columnVisible', onChanged);
      api.removeEventListener('sortChanged', onChanged);
    });
  }

  #persistCleanup(): void {
    this.#persistSaveCurrentState();
    if (this.#persistDebounceTimer) clearTimeout(this.#persistDebounceTimer);
    this.#persistDebounceTimer = undefined;
    this.#persistResizeObserver?.disconnect();
    this.#persistResizeObserver = undefined;
    for (const cleanup of this.#persistCleanupFns) cleanup();
    this.#persistCleanupFns = [];
    this.#persistBucket = 0;
    this.#persistSuppressSave = false;
  }
}
