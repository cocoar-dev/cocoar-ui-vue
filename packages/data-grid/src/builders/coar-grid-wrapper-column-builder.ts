import type { ColDef } from 'ag-grid-community';
import WrapperCellRenderer from '../cell-renderers/WrapperCellRenderer.vue';
import type {
  WrapperSlotConfig,
  WrapperCellRendererConfig,
} from '../cell-renderers/wrapper-cell-renderer.models';
import type { CoarGridColumnBuilder } from './coar-grid-column-builder';

/**
 * Wraps an existing column builder and adds left/right slot decorations.
 *
 * The inner builder's ColDef is preserved in full (field, sort, filter, edit,
 * valueFormatter, comparator, quickFilter, …); only its `cellRenderer` is
 * swapped for `WrapperCellRenderer`, which renders the left slot → inner
 * renderer → right slot.
 *
 * @example
 * ```ts
 * CoarGridBuilder.create<User>().columns([
 *   (col) => col
 *     .wrap(col.field('name').header('Name').flex(1).sortable())
 *     .left({ icon: (r) => r.starred ? 'star-filled' : 'star-outline', onClick: toggle })
 *     .right({ component: UnreadBadge, params: (r) => ({ count: r.unread }) }),
 * ]);
 * ```
 */
export class CoarGridWrapperColumnBuilder<TData = unknown, TValue = unknown> {
  readonly #inner: CoarGridColumnBuilder<TData, TValue>;
  #left?: WrapperSlotConfig<TData>;
  #right?: WrapperSlotConfig<TData>;

  constructor(inner: CoarGridColumnBuilder<TData, TValue>) {
    this.#inner = inner;
  }

  /** Configure the left-hand slot. */
  left(config: WrapperSlotConfig<TData>): this {
    this.#left = config;
    return this;
  }

  /** Configure the right-hand slot. */
  right(config: WrapperSlotConfig<TData>): this {
    this.#right = config;
    return this;
  }

  /** Build the AG Grid ColDef with the wrapped cell renderer. */
  build(): ColDef<TData, TValue> {
    const innerDef = this.#inner.build();
    const innerRenderer = innerDef.cellRenderer ?? null;
    const innerRendererParams = innerDef.cellRendererParams ?? {};

    const wrapperConfig: WrapperCellRendererConfig<TData> = {
      left: this.#left,
      right: this.#right,
      innerRenderer,
      innerRendererParams,
    };

    return {
      ...innerDef,
      cellRenderer: WrapperCellRenderer,
      // Replace (not merge) so the inner's cellRendererParams don't leak into
      // the wrapper's own params namespace. The inner renderer receives them
      // via `innerRendererParams` inside `config`.
      cellRendererParams: { config: wrapperConfig },
    };
  }
}
