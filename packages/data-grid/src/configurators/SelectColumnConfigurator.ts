import type { CoarSelectOption, CoarSelectSize } from '@cocoar/vue-ui';
import type { SelectCellEditorConfig } from '../cell-renderers/select-cell-editor.models';

/**
 * Fluent configurator for the `col.select()` shortcut.
 *
 * Configures both the read-only renderer (label lookup) and the cell editor.
 * Whether the column is editable is gated by the column-level `editable()`
 * chain — same pattern as text/number/checkbox.
 *
 * @example
 * ```ts
 * col.select('role', s => s
 *   .options([{ value: 'eng', label: 'Engineer' }, { value: 'des', label: 'Designer' }])
 *   .clearable()
 *   .searchable()
 * ).editable(true)
 * ```
 */
export class SelectColumnConfigurator<TData = unknown, TValue = unknown> {
  readonly #config: SelectCellEditorConfig<TData, TValue> = {};

  /** Available options. Static array or row-aware function. */
  options(
    value: CoarSelectOption<TValue>[] | ((row: TData) => CoarSelectOption<TValue>[]),
  ): this {
    this.#config.options = value;
    return this;
  }

  /** Show a clear button in the editor. */
  clearable(value = true): this {
    this.#config.clearable = value;
    return this;
  }

  /** Enable search/filter in the dropdown. */
  searchable(value = true): this {
    this.#config.searchable = value;
    return this;
  }

  /** Placeholder shown when no value is selected. */
  placeholder(value: string): this {
    this.#config.placeholder = value;
    return this;
  }

  /** Search-input placeholder (only used with `.searchable()`). */
  searchPlaceholder(value: string): this {
    this.#config.searchPlaceholder = value;
    return this;
  }

  /** Trigger size — defaults to `'s'`. */
  size(value: CoarSelectSize): this {
    this.#config.size = value;
    return this;
  }

  /** @internal */
  build(): SelectCellEditorConfig<TData, TValue> {
    return { ...this.#config };
  }
}
