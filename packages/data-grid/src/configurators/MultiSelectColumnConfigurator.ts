import type { CoarSelectOption, CoarSelectSize } from '@cocoar/vue-ui';
import type { MultiSelectCellEditorConfig } from '../cell-renderers/multi-select-cell-editor.models';

/**
 * Fluent configurator for `col.multiSelect()`.
 *
 * Configures both the renderer (label lookup, text or chips display) and the
 * cell editor (CoarMultiSelect-based, opens on enter, commits on dropdown
 * close — focus-preservation keeps the dropdown open while the user toggles
 * options, AG Grid's focus-based commit fires when the user clicks outside
 * or presses Tab/Enter).
 *
 * @example
 * ```ts
 * col.multiSelect('tags', s => s
 *   .options([{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }])
 *   .searchable()
 *   .showSelectAll()
 *   .display('chips')
 * ).editable(true)
 * ```
 */
export class MultiSelectColumnConfigurator<TData = unknown, TValue = unknown> {
  readonly #config: MultiSelectCellEditorConfig<TData, TValue> = {};

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

  /** Show a "Select all" row at the top of the dropdown. */
  showSelectAll(value = true): this {
    this.#config.showSelectAll = value;
    return this;
  }

  /** Placeholder shown when no values are selected. */
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

  /**
   * Renderer display mode. Default `'text'` (comma-separated labels), opt-in
   * `'chips'` for one `<CoarTag>` per selected value.
   */
  display(value: 'text' | 'chips'): this {
    this.#config.display = value;
    return this;
  }

  /** @internal */
  build(): MultiSelectCellEditorConfig<TData, TValue> {
    return { ...this.#config };
  }
}
