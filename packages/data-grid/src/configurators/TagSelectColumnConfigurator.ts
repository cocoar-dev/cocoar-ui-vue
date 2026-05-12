import type { CoarSelectOption, CoarSelectSize } from '@cocoar/vue-ui';
import type { MultiSelectCellEditorConfig } from '../cell-renderers/multi-select-cell-editor.models';

/**
 * Fluent configurator for `col.tagSelect()`.
 *
 * Same cell-value contract as `col.multiSelect()` (`TValue[]`), but the editor
 * uses `<CoarTagSelect>` — selected values are rendered as removable chips
 * inside the trigger itself, and the dropdown only shows not-yet-selected
 * options. `.allowCreate()` lets the user add free-form values that aren't in
 * `options`.
 *
 * The cell renderer is shared with `col.multiSelect()` — comma-separated
 * labels by default, `display('chips')` for a `<CoarTag>` row.
 *
 * @example
 * ```ts
 * col.tagSelect('skills', s => s
 *   .options([{ value: 'ts', label: 'TypeScript' }, { value: 'go', label: 'Go' }])
 *   .allowCreate()
 *   .display('chips')
 * ).editable(true)
 * ```
 */
export class TagSelectColumnConfigurator<TData = unknown, TValue = unknown> {
  readonly #config: MultiSelectCellEditorConfig<TData, TValue> = {};

  /** Available options. Static array or row-aware function. */
  options(
    value: CoarSelectOption<TValue>[] | ((row: TData) => CoarSelectOption<TValue>[]),
  ): this {
    this.#config.options = value;
    return this;
  }

  /** Placeholder shown when no values are selected. */
  placeholder(value: string): this {
    this.#config.placeholder = value;
    return this;
  }

  /** Search-input placeholder. */
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
   * Allow creating new tags by typing. Free-form values not in `options`
   * round-trip into the cell value array; the renderer shows the raw value
   * as its label fallback.
   */
  allowCreate(value = true): this {
    this.#config.allowCreate = value;
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
