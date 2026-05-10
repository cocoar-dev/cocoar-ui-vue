import type { CoarSelectOption, CoarSelectSize } from '@cocoar/vue-ui';

/**
 * Configuration for the select cell editor + renderer.
 *
 * Set via `col.select(field, s => s.options(…).clearable())`.
 */
export interface SelectCellEditorConfig<TData = unknown, TValue = unknown> {
  /**
   * Available options. Static array or row-aware function.
   * Using `(row) => CoarSelectOption<TValue>[]` lets options depend on row state.
   */
  options?: CoarSelectOption<TValue>[] | ((row: TData) => CoarSelectOption<TValue>[]);
  /** Show a clear button in the editor */
  clearable?: boolean;
  /** Enable search/filter in the dropdown */
  searchable?: boolean;
  /** Placeholder shown when no value is selected */
  placeholder?: string;
  /** Search-input placeholder (only when `searchable: true`) */
  searchPlaceholder?: string;
  /** Trigger size — defaults to `'s'` to fit cell height */
  size?: CoarSelectSize;
}
