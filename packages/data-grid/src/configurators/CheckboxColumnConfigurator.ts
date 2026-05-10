import type { CoarCheckboxSize } from '@cocoar/vue-ui';
import type { CheckboxCellRendererConfig } from '../cell-renderers/checkbox-cell-renderer.models';

/**
 * Fluent configurator for the `col.checkbox()` shortcut.
 *
 * Configures **what** the checkbox cell renders (label, size, indeterminate).
 * Whether it's interactive is gated by the column-level `editable()` chain.
 *
 * @example
 * ```ts
 * col.checkbox('done', c => c
 *   .label('Done')
 *   .size('s')
 *   .indeterminate(row => row.partial)
 * ).editable(row => !row.locked)
 * ```
 */
export class CheckboxColumnConfigurator<TData = unknown> {
  readonly #config: CheckboxCellRendererConfig<TData> = {};

  /** Optional label next to the checkbox. Static or per-row. */
  label(value: string | ((row: TData) => string)): this {
    this.#config.label = value;
    return this;
  }

  /** Indeterminate (tri-state) predicate per row. */
  indeterminate(predicate: (row: TData) => boolean): this {
    this.#config.indeterminate = predicate;
    return this;
  }

  /** Checkbox size. */
  size(value: CoarCheckboxSize): this {
    this.#config.size = value;
    return this;
  }

  /** @internal */
  build(): CheckboxCellRendererConfig<TData> {
    return { ...this.#config };
  }
}
