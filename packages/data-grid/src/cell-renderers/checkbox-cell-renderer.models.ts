import type { CoarCheckboxSize } from '@cocoar/vue-ui';

/**
 * Configuration for the checkbox cell renderer.
 *
 * Set via `col.checkbox(field, c => c.label('Done').size('s'))`.
 *
 * Whether the checkbox is interactive is gated by the column-level
 * `editable()` setting (boolean or row-predicate), NOT by this config.
 */
export interface CheckboxCellRendererConfig<TData = unknown> {
  /** Optional label rendered next to the checkbox. Static or per-row. */
  label?: string | ((row: TData) => string);
  /** Optional indeterminate (tri-state) per row. */
  indeterminate?: (row: TData) => boolean;
  /** Checkbox size. Defaults to `'s'`. */
  size?: CoarCheckboxSize;
}
