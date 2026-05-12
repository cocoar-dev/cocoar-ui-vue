import type { CoarSelectOption, CoarSelectSize } from '@cocoar/vue-ui';

/**
 * Shared config for the multi-select cell editor + renderer.
 *
 * Used by both `col.multiSelect()` (standard dropdown trigger) and
 * `col.tagSelect()` (chip-style trigger). Cell value is `TValue[]`.
 *
 * Set via `col.multiSelect(field, s => s.options(...).display('chips'))`
 * or `col.tagSelect(field, s => s.options(...).allowCreate())`.
 */
export interface MultiSelectCellEditorConfig<TData = unknown, TValue = unknown> {
  /**
   * Available options. Static array or row-aware function. Using
   * `(row) => CoarSelectOption<TValue>[]` lets options depend on row state.
   */
  options?: CoarSelectOption<TValue>[] | ((row: TData) => CoarSelectOption<TValue>[]);
  /** Show a clear button in the editor (multiSelect only). */
  clearable?: boolean;
  /** Enable search/filter in the dropdown (multiSelect only). */
  searchable?: boolean;
  /** Show a "Select all" row at the top of the dropdown (multiSelect only). */
  showSelectAll?: boolean;
  /** Placeholder shown when no values are selected. */
  placeholder?: string;
  /** Search-input placeholder. */
  searchPlaceholder?: string;
  /** Trigger size — defaults to `'s'` to fit cell height. */
  size?: CoarSelectSize;
  /**
   * Allow creating new tags by typing (tagSelect only). When true, values not
   * in `options` are accepted as free-form strings and round-trip into the
   * cell value array.
   */
  allowCreate?: boolean;
  /**
   * Renderer display mode. `'text'` (default) shows a comma-separated label
   * list; `'chips'` renders each selected value as a `<CoarTag>`.
   */
  display?: 'text' | 'chips';
}
